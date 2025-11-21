import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { NotificationBell } from "@/components/NotificationBell";
import { useLocation } from "wouter";
import { BookOpen, Trophy, GraduationCap, PlayCircle, CheckCircle, Star } from "lucide-react";
import type { Course, StudentCourseProgress, SubscriptionPlan, User } from "@shared/schema";

type PublicCourse = Course & {
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  enrollmentsCount: number;
  planPricing?: Array<{
    id: string;
    price: string;
    plan: {
      id: string;
      name: string;
      displayName: string;
    };
  }>;
};

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

  const { data: allCourses, isLoading: allCoursesLoading } = useQuery<PublicCourse[]>({
    queryKey: ["/api/courses/public"],
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

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/chat/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds
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

  // Calculate stats
  const totalEnrolled = enrolledCourses?.length || 0;
  const completedCourses = progressData?.filter(p => p.progressPercentage === 100).length || 0;
  const inProgressCourses = progressData?.filter(p => p.progressPercentage > 0 && p.progressPercentage < 100).length || 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-student-title">
          Mening Kurslarim
        </h1>
        <p className="text-muted-foreground">
          O'quv jarayoningizni kuzatib boring va yangi bilimlarni egallang
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Jami Kurslar"
          value={totalEnrolled}
          icon={BookOpen}
          testId="stats-total-courses"
          description="Yozilgan kurslar"
        />
        <StatsCard
          title="Tugallangan"
          value={completedCourses}
          icon={GraduationCap}
          testId="stats-completed"
          description="100% bajarilgan"
        />
        <StatsCard
          title="Davom Etmoqda"
          value={inProgressCourses}
          icon={PlayCircle}
          testId="stats-in-progress"
          description="Jarayonda"
        />
        <StatsCard
          title="Sertifikatlar"
          value={completedCourses}
          icon={Trophy}
          testId="stats-certificates"
          description="Olingan"
        />
      </div>

      <div className="space-y-6">
        <Tabs defaultValue="enrolled" className="space-y-8">
          <TabsList>
            <TabsTrigger value="enrolled" data-testid="tab-my-courses">Mening Kurslarim</TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all-courses">Barcha Kurslar</TabsTrigger>
            <TabsTrigger value="plans" data-testid="tab-subscription-plans">Tariflar</TabsTrigger>
          </TabsList>

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
