import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { useLocation } from "wouter";
import { BookOpen, Trophy, GraduationCap, PlayCircle, CheckCircle, Star, Sparkles, ArrowRight, Target, Zap, Radio, Video, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { Course, StudentCourseProgress, SubscriptionPlan } from "@shared/schema";

export default function StudentCourses() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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
    refetchInterval: 10000,
  });

  const { data: activeLiveRooms } = useQuery<any[]>({
    queryKey: ["/api/live-rooms/active"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
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
        <div className="relative">
          <div className="animate-spin w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalEnrolled = enrolledCourses?.length || 0;
  const completedCourses = progressData?.filter(p => p.progressPercentage === 100).length || 0;
  const inProgressCourses = progressData?.filter(p => p.progressPercentage > 0 && p.progressPercentage < 100).length || 0;
  const totalProgress = progressData?.length 
    ? Math.round(progressData.reduce((acc, p) => acc + p.progressPercentage, 0) / progressData.length)
    : 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Xayrli tong";
    if (hour < 18) return "Xayrli kun";
    return "Xayrli kech";
  };

  const firstName = user?.firstName || "Talaba";

  return (
    <div className="min-h-screen">
      {/* Hero Section with Gradient */}
      <div className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative px-6 py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">{getGreeting()}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3" data-testid="text-student-title">
              Salom, <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{firstName}</span>!
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              O'quv jarayoningizni davom ettiring va yangi bilimlar oling
            </p>
          </motion.div>

          {/* Quick Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
          >
            <StatsCard
              title="Jami Kurslar"
              value={totalEnrolled}
              icon={BookOpen}
              testId="stats-total-courses"
              description="Yozilgan"
              gradient="from-blue-500/20 via-blue-500/10 to-transparent"
              iconBg="bg-blue-500/15"
              iconColor="text-blue-600 dark:text-blue-400"
              delay={0}
            />
            <StatsCard
              title="Tugallangan"
              value={completedCourses}
              icon={GraduationCap}
              testId="stats-completed"
              description="Muvaffaqiyatli"
              gradient="from-green-500/20 via-green-500/10 to-transparent"
              iconBg="bg-green-500/15"
              iconColor="text-green-600 dark:text-green-400"
              delay={0.05}
            />
            <StatsCard
              title="Jarayonda"
              value={inProgressCourses}
              icon={PlayCircle}
              testId="stats-in-progress"
              description="Davom etmoqda"
              gradient="from-amber-500/20 via-amber-500/10 to-transparent"
              iconBg="bg-amber-500/15"
              iconColor="text-amber-600 dark:text-amber-400"
              delay={0.1}
            />
            <StatsCard
              title="Sertifikatlar"
              value={completedCourses}
              icon={Trophy}
              testId="stats-certificates"
              description="Olingan"
              gradient="from-purple-500/20 via-purple-500/10 to-transparent"
              iconBg="bg-purple-500/15"
              iconColor="text-purple-600 dark:text-purple-400"
              delay={0.15}
            />
          </motion.div>

          {/* Progress Overview Card */}
          {totalEnrolled > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6"
            >
              <Card className="border-0 shadow-xl bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="w-8 h-8 text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Zap className="w-3 h-3 text-primary-foreground" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Umumiy Progress</h3>
                        <p className="text-sm text-muted-foreground">
                          Barcha kurslardagi o'rtacha yutuq
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 md:w-48">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${totalProgress}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                          />
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-primary">{totalProgress}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Active Live Rooms Section */}
          {activeLiveRooms && activeLiveRooms.filter((r: any) => r.status === 'active').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6"
            >
              <Card className="border-red-500/30 shadow-xl bg-gradient-to-r from-red-500/10 via-background to-red-500/5 backdrop-blur overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Radio className="w-5 h-5 text-red-500" />
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <CardTitle className="text-lg">Jonli Darslar</CardTitle>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                      LIVE
                    </span>
                  </div>
                  <CardDescription>
                    Hozirda davom etayotgan darslar - qo'shilish uchun bosing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeLiveRooms.filter((r: any) => r.status === 'active').map((room: any) => (
                    <motion.div
                      key={room.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-red-500/20 hover-elevate cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        if (room.platform === 'zoom' && room.zoomJoinUrl) {
                          window.open(room.zoomJoinUrl, '_blank');
                        } else {
                          setLocation(`/live/${room.id}`);
                        }
                      }}
                      data-testid={`live-room-${room.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${room.platform === 'zoom' ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
                          <Video className={`w-6 h-6 ${room.platform === 'zoom' ? 'text-blue-500' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{room.title}</h4>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${room.platform === 'zoom' ? 'bg-blue-500/20 text-blue-600' : 'bg-primary/20 text-primary'}`}>
                              {room.platform === 'zoom' ? 'Zoom' : 'Jitsi'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{room.instructor?.firstName} {room.instructor?.lastName}</span>
                            {room.course && (
                              <>
                                <span>•</span>
                                <span>{room.course.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button 
                        className={room.platform === 'zoom' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}
                        data-testid={`button-join-live-${room.id}`}
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Qo'shilish
                      </Button>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* Scheduled Live Rooms Section */}
          {activeLiveRooms && activeLiveRooms.filter((r: any) => r.status === 'scheduled').length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6"
            >
              <Card className="border-blue-500/30 shadow-xl bg-gradient-to-r from-blue-500/10 via-background to-blue-500/5 backdrop-blur overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-lg">Kelgusi Darslar</CardTitle>
                  </div>
                  <CardDescription>
                    Rejalashtirilgan jonli darslar - vaqti kelganda qo'shilishingiz mumkin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeLiveRooms.filter((r: any) => r.status === 'scheduled').map((room: any) => (
                    <motion.div
                      key={room.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-blue-500/20"
                      data-testid={`scheduled-room-${room.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${room.platform === 'zoom' ? 'bg-blue-500/20' : 'bg-blue-400/20'}`}>
                          <Video className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{room.title}</h4>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${room.platform === 'zoom' ? 'bg-blue-500/20 text-blue-600' : 'bg-primary/20 text-primary'}`}>
                              {room.platform === 'zoom' ? 'Zoom' : 'Jitsi'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{room.instructor?.firstName} {room.instructor?.lastName}</span>
                            {room.course && (
                              <>
                                <span>•</span>
                                <span>{room.course.title}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-sm text-blue-600 dark:text-blue-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              {new Date(room.scheduledAt).toLocaleString('uz-UZ', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-blue-600 border-blue-300">
                        Rejalashtirilgan
                      </Badge>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-8">
        <Tabs defaultValue="enrolled" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="enrolled" 
              data-testid="tab-my-courses"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Mening Kurslarim
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              data-testid="tab-all-courses"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Barcha Kurslar
            </TabsTrigger>
            <TabsTrigger 
              value="plans" 
              data-testid="tab-subscription-plans"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-6"
            >
              <Star className="w-4 h-4 mr-2" />
              Tariflar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Mening Kurslarim</h2>
                <p className="text-muted-foreground">Davom eting va maqsadlaringizga erishing</p>
              </div>
            </div>
            
            {enrolledCourses && enrolledCourses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Hali kurslaringiz yo'q</h3>
                <p className="text-muted-foreground mb-4">Yangi kurslarni ko'rib chiqing va o'rganishni boshlang</p>
                <Button onClick={() => setLocation('/explore')}>
                  Kurslarni Ko'rish
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses?.map((course, index) => {
                  const progress = progressData?.find(p => p.course.id === course.id);
                  
                  if (progress) {
                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ProgressCard 
                          progress={progress}
                          onContinue={handleContinue}
                        />
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div 
                      key={course.id} 
                      onClick={() => handleViewCourse(course.id)} 
                      className="cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <CourseCard 
                        course={course} 
                        onViewDemo={handleViewDemo}
                        isEnrolled={true}
                        index={index}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Barcha Kurslar</h2>
              <p className="text-muted-foreground">Sizga mos kursni tanlang</p>
            </div>
            
            {allCourses && allCourses.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hozircha kurslar yo'q</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allCourses?.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CourseCard
                      course={course}
                      onEnroll={handleEnroll}
                      onViewDemo={handleViewDemo}
                      isEnrolled={enrolledCourseIds.has(course.id)}
                      index={index}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Obuna Tariflari</h2>
              <p className="text-muted-foreground">
                O'zingizga mos tarifni tanlang va kurs xarid qilishda chegirmalardan foydalaning
              </p>
            </div>
            
            {!subscriptionPlans || subscriptionPlans.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">Hozircha tariflar yo'q</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subscriptionPlans?.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`relative h-full transition-all ${plan.isPopular ? 'border-primary shadow-xl shadow-primary/10 scale-105' : 'hover-elevate'}`}
                      data-testid={`card-plan-${plan.id}`}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <span className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                            Mashhur
                          </span>
                        </div>
                      )}
                      <CardHeader className="pb-4">
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
                              <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent" data-testid={`text-plan-price-${plan.id}`}>
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

                          {plan.features?.dynamicFeatures?.map((feature: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature.label}</span>
                            </div>
                          ))}

                          {plan.features?.customFeatures?.map((feature: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}

                          {plan.features?.bonuses && plan.features.bonuses.length > 0 && (
                            <div className="pt-2 border-t">
                              {plan.features.bonuses.map((bonus: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm font-medium">{bonus}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button 
                          className={`w-full ${plan.isPopular ? 'bg-gradient-to-r from-primary to-primary/80 shadow-lg' : ''}`}
                          variant={plan.isPopular ? "default" : "outline"}
                          size="lg"
                          data-testid={`button-select-plan-${plan.id}`}
                        >
                          Tanlash
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
