import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { NotificationBell } from "@/components/NotificationBell";
import { useLocation } from "wouter";
import { MessageCircle, CheckCircle, Star } from "lucide-react";
import type { Course, StudentCourseProgress, SubscriptionPlan } from "@shared/schema";

export default function StudentCourses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: allCourses, isLoading: allCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    enabled: isAuthenticated,
  });

  const { data: enrolledCourses, isLoading: enrolledCoursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/student/enrolled-courses"],
    enabled: isAuthenticated,
  });

  const { data: progressData, isLoading: progressLoading } = useQuery<StudentCourseProgress[]>({
    queryKey: ["/api/student/progress"],
    enabled: isAuthenticated,
  });

  const { data: subscriptionPlans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: isAuthenticated,
  });

  const enrolledCourseIds = new Set(enrolledCourses?.map(c => c.id) || []);

  const handleEnroll = (courseId: string) => {
    setLocation(`/checkout/${courseId}`);
  };

  const handleViewCourse = (courseId: string) => {
    setLocation(`/learn/${courseId}`);
  };

  const handleViewDemo = (courseId: string) => {
    setLocation(`/learn/${courseId}`);
  };

  const handleContinue = (courseId: string, lessonId?: string) => {
    if (lessonId) {
      setLocation(`/learn/${courseId}?lesson=${lessonId}`);
    } else {
      setLocation(`/learn/${courseId}`);
    }
  };

  if (authLoading || allCoursesLoading || enrolledCoursesLoading || progressLoading || plansLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-student-title">O'quv Platformasi</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => setLocation("/results")}
              data-testid="button-results"
            >
              Natijalarim
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/chat")}
              data-testid="button-chat"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <NotificationBell />
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Chiqish
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-courses">Barcha Kurslar</TabsTrigger>
            <TabsTrigger value="enrolled" data-testid="tab-my-courses">Mening Kurslarim</TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-subscription-plans">Tariflar</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <h2 className="text-3xl font-bold">Barcha Kurslar</h2>
            {allCourses && allCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hozircha kurslar yo'q</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allCourses?.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onEnroll={handleEnroll}
                    onViewDemo={handleViewDemo}
                    isEnrolled={enrolledCourseIds.has(course.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="enrolled" className="space-y-4">
            <h2 className="text-3xl font-bold">Mening Kurslarim</h2>
            {enrolledCourses && enrolledCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hali hech qanday kursga yozilmagansiz</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses?.map((course) => {
                  const progress = progressData?.find(p => p.course.id === course.id);
                  
                  if (progress) {
                    return (
                      <ProgressCard 
                        key={course.id}
                        progress={progress}
                        onContinue={handleContinue}
                      />
                    );
                  }
                  
                  return (
                    <div key={course.id} onClick={() => handleViewCourse(course.id)} className="cursor-pointer">
                      <CourseCard 
                        course={course} 
                        onViewDemo={handleViewDemo}
                        isEnrolled={true} 
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Obuna Tariflari</h2>
              <p className="text-muted-foreground">
                O'zingizga mos tarifni tanlang va kurs xarid qilishda chegirmalardan foydalaning
              </p>
            </div>
            
            {!subscriptionPlans || subscriptionPlans.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hozircha tariflar yo'q</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subscriptionPlans?.map((plan) => (
                  <Card key={plan.id} className="relative" data-testid={`card-plan-${plan.id}`}>
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                          Mashhur
                        </span>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-2xl" data-testid={`text-plan-name-${plan.id}`}>
                        {plan.name}
                      </CardTitle>
                      {plan.description && (
                        <CardDescription data-testid={`text-plan-description-${plan.id}`}>
                          {plan.description}
                        </CardDescription>
                      )}
                      {plan.price && (
                        <div className="pt-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold" data-testid={`text-plan-price-${plan.id}`}>
                              {plan.price.toLocaleString('uz-UZ')}
                            </span>
                            <span className="text-muted-foreground">so'm</span>
                          </div>
                          {plan.duration && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {plan.duration} {plan.durationType === 'month' ? 'oylik' : 'yillik'}
                            </p>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {/* Base Features */}
                        {plan.features?.tests && (
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                              {plan.features.testsLabel || 'Testlar'}: {plan.features.tests === -1 ? 'Cheksiz' : plan.features.tests}
                            </span>
                          </div>
                        )}
                        {plan.features?.assignments && (
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                              {plan.features.assignmentsLabel || 'Topshiriqlar'}: {plan.features.assignments === -1 ? 'Cheksiz' : plan.features.assignments}
                            </span>
                          </div>
                        )}
                        {plan.features?.certificate && (
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{plan.features.certificateLabel || 'Sertifikat'}</span>
                          </div>
                        )}
                        {plan.features?.liveClassesPerWeek !== undefined && plan.features.liveClassesPerWeek > 0 && (
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                              {plan.features.liveClassesLabel || 'Jonli darslar'}: {plan.features.liveClassesPerWeek}/hafta
                            </span>
                          </div>
                        )}

                        {/* Dynamic Features */}
                        {plan.features?.dynamicFeatures?.map((feature: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature.label}</span>
                          </div>
                        ))}

                        {/* Custom Features */}
                        {plan.features?.customFeatures?.map((feature: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}

                        {/* Bonuses */}
                        {plan.features?.bonuses && plan.features.bonuses.length > 0 && (
                          <div className="pt-2 border-t">
                            {plan.features.bonuses.map((bonus: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <Star className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm font-medium">{bonus}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full"
                        variant={plan.isPopular ? "default" : "outline"}
                        data-testid={`button-select-plan-${plan.id}`}
                      >
                        Tanlash
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
