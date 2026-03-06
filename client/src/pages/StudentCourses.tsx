import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { useLocation } from "wouter";
import { BookOpen, Trophy, GraduationCap, PlayCircle, CheckCircle, Star, Sparkles, ArrowRight, Target, Zap, Radio, Video, Clock, LayoutGrid, Rocket, Flame, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course, StudentCourseProgress } from "@shared/schema";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
};

const GalaxyBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Floating Particles/Stars */}
    {[...Array(15)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full opacity-20"
        initial={{ 
          x: Math.random() * 100 + "%", 
          y: Math.random() * 100 + "%",
          scale: Math.random() * 0.5 + 0.5
        }}
        animate={{
          y: [null, Math.random() * -100 - 50],
          opacity: [0.2, 0.5, 0],
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          ease: "linear",
          delay: Math.random() * 10,
        }}
      />
    ))}

    {/* Neon Glows */}
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
  </div>
);

export default function StudentCourses() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Sessiya tugadi",
        description: "Iltimos qayta kiring",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation('/login');
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

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

  const { data: activeLiveRooms } = useQuery<any[]>({
    queryKey: ["/api/live-rooms/active"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const enrolledCourseIds = useMemo(() => new Set(enrolledCourses?.map(c => c.id) || []), [enrolledCourses]);

  const handleEnroll = (courseId: string) => {
    setLocation(`/checkout/${courseId}`);
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
      <div className="h-screen flex items-center justify-center bg-[#050218]">
        <div className="relative">
          <motion.div 
            className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
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
    <div className="relative bg-gradient-to-b from-[#050218] via-[#0a0328] to-[#050218] text-slate-100 selection:bg-primary/30 min-h-full">
      <GalaxyBackground />

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24">
          
          {/* Header Section */}
          <motion.header 
            className="mb-12 relative"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <motion.div 
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium backdrop-blur-md"
                  whileHover={{ scale: 1.05 }}
                >
                  <Flame className="w-4 h-4" />
                  <span>{getGreeting()}, {firstName}</span>
                </motion.div>
                
                <h1 className="text-4xl md:text-6xl font-black tracking-tight" data-testid="text-student-title">
                  O'rganishda <span className="bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">Davom Eting</span>
                </h1>
                
                <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                  Bugun yangi marralarni zabt etish uchun ajoyib kun. Sizning bilimingiz — sizning kuchingiz!
                </p>
              </div>

              <motion.div 
                variants={itemVariants}
                className="hidden lg:flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <p className="text-sm font-bold text-slate-200">Premium Talaba</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Quick Stats Grid */}
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10"
            >
              <StatsCard
                title="Jami Kurslar"
                value={totalEnrolled}
                icon={BookOpen}
                testId="stats-total-courses"
                gradient="from-blue-600/20 via-blue-900/10 to-transparent"
                iconBg="bg-blue-500/20"
                iconColor="text-blue-400"
                delay={0.1}
              />
              <StatsCard
                title="Tugallangan"
                value={completedCourses}
                icon={Trophy}
                testId="stats-completed"
                gradient="from-emerald-600/20 via-emerald-900/10 to-transparent"
                iconBg="bg-emerald-500/20"
                iconColor="text-emerald-400"
                delay={0.2}
              />
              <StatsCard
                title="Jarayonda"
                value={inProgressCourses}
                icon={Rocket}
                testId="stats-in-progress"
                gradient="from-orange-600/20 via-orange-900/10 to-transparent"
                iconBg="bg-orange-500/20"
                iconColor="text-orange-400"
                delay={0.3}
              />
              <StatsCard
                title="Progress"
                value={`${totalProgress}%`}
                icon={Target}
                testId="stats-avg-progress"
                gradient="from-purple-600/20 via-purple-900/10 to-transparent"
                iconBg="bg-purple-500/20"
                iconColor="text-purple-400"
                delay={0.4}
              />
            </motion.div>
          </motion.header>

          {/* Active Content Section */}
          <div className="space-y-12">
            
            {/* Live Rooms - If any */}
            {activeLiveRooms && activeLiveRooms.some(r => r.status === 'active') && (
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-red-500/5 backdrop-blur-md p-6"
              >
                <div className="absolute top-0 right-0 p-4">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  <Radio className="w-6 h-6 text-red-500" />
                  <h2 className="text-xl font-bold text-slate-100">Jonli Darslar Davom Etmoqda</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {activeLiveRooms.filter(r => r.status === 'active').map((room: any) => (
                    <motion.div
                      key={room.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group cursor-pointer"
                      onClick={() => {
                        if (room.platform === 'zoom' && room.zoomJoinUrl) {
                          window.open(room.zoomJoinUrl, '_blank');
                        } else {
                          setLocation(`/live/${room.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <Video className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-bold group-hover:text-red-400 transition-colors">{room.title}</h4>
                          <p className="text-sm text-slate-400">{room.instructor?.firstName} {room.instructor?.lastName}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-500/20 hover:text-red-500">
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Tabs System */}
            <Tabs defaultValue="enrolled" className="w-full">
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl h-auto">
                  <TabsTrigger 
                    value="enrolled" 
                    className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Mening Kurslarim
                  </TabsTrigger>
                  <TabsTrigger 
                    value="all" 
                    className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
                  >
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Barcha Kurslar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="plans" 
                    className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Tariflar
                  </TabsTrigger>
                </TabsList>
              </div>

              <AnimatePresence mode="wait">
                <TabsContent value="enrolled" className="focus-visible:outline-none" key="enrolled">
                  {enrolledCourses && enrolledCourses.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-24 bg-white/5 rounded-[2rem] border border-white/10 border-dashed"
                    >
                      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <BookOpen className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">Hali kurslaringiz yo'q</h3>
                      <p className="text-slate-400 mb-8 max-w-sm mx-auto">Sayohatni bugun boshlang va o'zingizga ma'qul kursni tanlang</p>
                      <Button 
                        onClick={() => setLocation('/explore')}
                        className="rounded-xl px-8 h-12 bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                      >
                        Kurslarni Ko'rish
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                    >
                      {enrolledCourses?.map((course, index) => {
                        const progress = progressData?.find(p => p.course.id === course.id);
                        
                        return (
                          <motion.div
                            key={course.id}
                            variants={itemVariants}
                            whileHover={{ y: -8 }}
                            className="h-full"
                          >
                            {progress ? (
                              <ProgressCard 
                                progress={progress}
                                onContinue={handleContinue}
                              />
                            ) : (
                              <CourseCard 
                                course={course} 
                                onViewDemo={handleViewDemo}
                                isEnrolled={true}
                                index={index}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="all" className="focus-visible:outline-none" key="all">
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                  >
                    {allCourses?.map((course, index) => (
                      <motion.div
                        key={course.id}
                        variants={itemVariants}
                        whileHover={{ y: -8 }}
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
                  </motion.div>
                </TabsContent>

                <TabsContent value="plans" className="focus-visible:outline-none" key="plans">
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-8 md:grid-cols-1 lg:grid-cols-3"
                  >
                    {subscriptionPlans?.map((plan, index) => (
                      <motion.div
                        key={plan.id}
                        variants={itemVariants}
                        whileHover={{ y: -8 }}
                        className="bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-xl relative overflow-hidden group"
                      >
                        {plan.isPopular && (
                          <div className="absolute top-0 right-0 p-4">
                            <Badge className="bg-primary text-white border-none px-3 py-1">Eng Mashhur</Badge>
                          </div>
                        )}
                        
                        <div className="mb-8">
                          <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                          <p className="text-slate-400 text-sm">{plan.description}</p>
                        </div>

                        <div className="mb-8">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">{plan.price.toLocaleString()}</span>
                            <span className="text-slate-500 font-medium text-sm">so'm / oy</span>
                          </div>
                        </div>

                        <ul className="space-y-4 mb-10">
                          {plan.features?.dynamicFeatures?.map((feature: any, i: number) => (
                            <li key={i} className="flex items-center gap-3 text-slate-300">
                              <CheckCircle className="w-5 h-5 text-primary" />
                              <span className="text-sm">{feature.label}</span>
                            </li>
                          ))}
                        </ul>

                        <Button 
                          className="w-full rounded-2xl h-14 bg-white/10 hover:bg-primary transition-all duration-300 text-white font-bold text-lg"
                        >
                          Tanlash
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
