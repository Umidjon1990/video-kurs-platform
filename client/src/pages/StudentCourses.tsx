import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { StatsCard } from "@/components/StatsCard";
import { ModernVideoPlayer } from "@/components/ModernVideoPlayer";
import { useLocation } from "wouter";
import {
  BookOpen, Trophy, GraduationCap, PlayCircle, CheckCircle, Star, Sparkles,
  ArrowRight, Target, Zap, Radio, Video, Clock, LayoutGrid, Rocket, Flame, Crown,
  X, ChevronLeft, ChevronRight, Lock, Play, Layers, FileText, ClipboardCheck,
  ExternalLink, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Course, StudentCourseProgress } from "@shared/schema";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

const GalaxyBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
  </div>
);

interface VideoModalState {
  courseId: string;
  lessonId: string;
  courseTitle: string;
}

interface VideoLessonModalProps {
  state: VideoModalState;
  onClose: () => void;
}

function VideoLessonModal({ state, onClose }: VideoLessonModalProps) {
  const [activeLessonId, setActiveLessonId] = useState(state.lessonId);
  const [, setLocation] = useLocation();

  const { data: lessons } = useQuery<any[]>({
    queryKey: ["/api/courses", state.courseId, "lessons"],
    queryFn: () => fetch(`/api/courses/${state.courseId}/lessons`).then(r => r.json()),
  });

  const { data: modules } = useQuery<any[]>({
    queryKey: ["/api/courses", state.courseId, "modules"],
    queryFn: () => fetch(`/api/courses/${state.courseId}/modules`).then(r => r.json()),
  });

  const { data: assignments } = useQuery<any[]>({
    queryKey: ["/api/courses", state.courseId, "assignments"],
    queryFn: () => fetch(`/api/courses/${state.courseId}/assignments`, { credentials: 'include' }).then(r => r.json()),
  });

  const { data: tests } = useQuery<any[]>({
    queryKey: ["/api/courses", state.courseId, "tests"],
    queryFn: () => fetch(`/api/courses/${state.courseId}/tests`, { credentials: 'include' }).then(r => r.json()),
  });

  const lessonAssignments = useMemo(() =>
    (assignments || []).filter((a: any) => a.lessonId === activeLessonId || !a.lessonId),
    [assignments, activeLessonId]
  );

  const lessonTests = useMemo(() =>
    (tests || []).filter((t: any) => t.lessonId === activeLessonId),
    [tests, activeLessonId]
  );

  const goToLearningPage = () => {
    onClose();
    setLocation(`/learn/${state.courseId}`);
  };

  const sortedLessons = useMemo(() => {
    if (!lessons) return [];
    return [...lessons].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [lessons]);

  const currentIdx = sortedLessons.findIndex(l => l.id === activeLessonId);
  const currentLesson = sortedLessons[currentIdx] || sortedLessons[0];
  const prevLesson = currentIdx > 0 ? sortedLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < sortedLessons.length - 1 ? sortedLessons[currentIdx + 1] : null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && prevLesson) setActiveLessonId(prevLesson.id);
      if (e.key === 'ArrowRight' && nextLesson) setActiveLessonId(nextLesson.id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prevLesson, nextLesson, onClose]);

  const getModuleTitle = (moduleId: string | null) => {
    if (!moduleId || !modules?.length) return null;
    return modules.find(m => m.id === moduleId)?.title || null;
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Ambient glow accents */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* 7D Animated Border Wrapper */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="relative z-10 w-full max-w-6xl rounded-3xl p-[2px] video-modal-7d"
          style={{ maxHeight: '92vh' }}
        >
          {/* Corner spark glows */}
          <div className="modal-corner-spark absolute -top-1 -left-1 w-6 h-6 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.9) 0%, transparent 70%)', filter: 'blur(4px)' }} />
          <div className="modal-corner-spark absolute -top-1 -right-1 w-6 h-6 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.9) 0%, transparent 70%)', filter: 'blur(4px)' }} />
          <div className="modal-corner-spark absolute -bottom-1 -left-1 w-6 h-6 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.9) 0%, transparent 70%)', filter: 'blur(4px)' }} />
          <div className="modal-corner-spark absolute -bottom-1 -right-1 w-6 h-6 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.9) 0%, transparent 70%)', filter: 'blur(4px)' }} />

        {/* Modal inner */}
        <div
          className="relative w-full flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(6,2,18,0.99) 0%, rgba(12,4,32,0.99) 50%, rgba(6,2,18,0.99) 100%)",
            maxHeight: 'calc(92vh - 4px)',
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[5] rounded-3xl"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
            }}
          />
          {/* Chromatic aberration edge */}
          <div className="absolute inset-0 pointer-events-none z-[5] rounded-3xl"
            style={{
              boxShadow: "inset 2px 0 8px rgba(0,255,255,0.04), inset -2px 0 8px rgba(255,0,255,0.04), inset 0 2px 8px rgba(255,200,0,0.02)"
            }}
          />
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider truncate">{state.courseTitle}</p>
                <h2 className="text-sm font-bold text-slate-100 truncate">
                  {currentLesson?.title || "Dars yuklanmoqda..."}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {currentLesson?.isDemo && (
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px] px-2 py-0.5">
                  Demo
                </Badge>
              )}
              <span className="text-xs text-slate-500 hidden sm:block">
                {currentIdx + 1} / {sortedLessons.length}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-colors"
                title="Yopish (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body: video + sidebar */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
            {/* Video Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-black/40">
              <div className="aspect-video w-full bg-black relative">
                {currentLesson ? (
                  currentLesson.videoUrl ? (
                    <ModernVideoPlayer videoUrl={currentLesson.videoUrl} title={currentLesson.title} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Video className="w-8 h-8 text-slate-500" />
                      </div>
                      <p className="text-slate-500 text-sm">Bu darsda video yo'q</p>
                    </div>
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && setActiveLessonId(prevLesson.id)}
                  className="rounded-xl text-slate-400 disabled:opacity-30 gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Oldingi</span>
                </Button>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1 items-center">
                    {sortedLessons.slice(Math.max(0, currentIdx - 2), currentIdx + 3).map((l) => {
                      const isActive = l.id === activeLessonId;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`rounded-full transition-all duration-300 ${isActive ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && setActiveLessonId(nextLesson.id)}
                  className="rounded-xl text-slate-400 disabled:opacity-30 gap-1.5"
                >
                  <span className="hidden sm:inline">Keyingi</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* ── Lesson Tabs: Umumiy / Vazifalar / Testlar ── */}
              <div className="border-t border-white/8 shrink-0">
                <Tabs defaultValue="umumiy" className="w-full">
                  <TabsList className="w-full rounded-none bg-black/30 border-b border-white/8 h-10 px-2 gap-1 justify-start">
                    <TabsTrigger
                      value="umumiy"
                      className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-500"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Umumiy
                    </TabsTrigger>
                    <TabsTrigger
                      value="vazifalar"
                      className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-500"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Vazifalar
                      {lessonAssignments.length > 0 && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1 py-0 ml-0.5 min-w-4 h-4">
                          {lessonAssignments.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger
                      value="testlar"
                      className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-500"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Testlar
                      {lessonTests.length > 0 && (
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[9px] px-1 py-0 ml-0.5 min-w-4 h-4">
                          {lessonTests.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* Umumiy */}
                  <TabsContent value="umumiy" className="m-0 px-4 py-3 max-h-36 overflow-y-auto overscroll-none">
                    {currentLesson?.description ? (
                      <p className="text-sm text-slate-400 leading-relaxed">{currentLesson.description}</p>
                    ) : (
                      <p className="text-xs text-slate-600 italic">Bu dars uchun tavsif yo'q</p>
                    )}
                  </TabsContent>

                  {/* Vazifalar */}
                  <TabsContent value="vazifalar" className="m-0 max-h-48 overflow-y-auto overscroll-none">
                    {lessonAssignments.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-600 italic">Bu darsda vazifa yo'q</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {lessonAssignments.map((a: any) => (
                          <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">{a.title}</p>
                              {a.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.description}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={goToLearningPage}
                              className="shrink-0 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Topshirish
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Testlar */}
                  <TabsContent value="testlar" className="m-0 max-h-48 overflow-y-auto overscroll-none">
                    {lessonTests.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-600 italic">Bu darsda test yo'q</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {lessonTests.map((t: any) => (
                          <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-200 truncate">{t.title}</p>
                              {t.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={goToLearningPage}
                              className="shrink-0 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Boshlash
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Lesson Sidebar */}
            <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-white/8 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-white/8 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Darslar ({sortedLessons.length})
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-none py-2">
                {sortedLessons.map((lesson, idx) => {
                  const isActive = lesson.id === activeLessonId;
                  const moduleTitle = getModuleTitle(lesson.moduleId);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-200 group
                        ${isActive
                          ? 'bg-primary/15 border-l-2 border-primary'
                          : 'hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5
                        ${isActive ? 'bg-primary text-white' : 'bg-white/8 text-slate-500 group-hover:bg-white/12'}`}>
                        {lesson.isDemo ? (
                          <Play className="w-3 h-3" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {moduleTitle && (
                          <p className="text-[9px] text-primary/60 font-medium uppercase tracking-wider mb-0.5 truncate">
                            {moduleTitle}
                          </p>
                        )}
                        <p className={`text-xs font-medium leading-snug line-clamp-2 ${isActive ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {lesson.title}
                        </p>
                        {lesson.isDemo && (
                          <span className="text-[9px] text-orange-400/70 font-medium">Demo</span>
                        )}
                      </div>
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default function StudentCourses() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [videoModal, setVideoModal] = useState<VideoModalState | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Sessiya tugadi", description: "Iltimos qayta kiring", variant: "destructive" });
      setTimeout(() => setLocation('/login'), 500);
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

  const { data: activeLiveRooms } = useQuery<any[]>({
    queryKey: ["/api/live-rooms/active"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const enrolledCourseIds = useMemo(() => new Set(enrolledCourses?.map(c => c.id) || []), [enrolledCourses]);

  const handleEnroll = (courseId: string) => setLocation(`/checkout/${courseId}`);
  const handleViewDemo = (courseId: string) => setLocation(`/learn/${courseId}`);

  const handleContinue = (courseId: string, lessonId?: string) => {
    const course = enrolledCourses?.find(c => c.id === courseId) || allCourses?.find(c => c.id === courseId);
    if (lessonId && course) {
      setVideoModal({ courseId, lessonId, courseTitle: course.title });
    } else if (course) {
      setVideoModal({ courseId, lessonId: '', courseTitle: course.title });
    } else {
      setLocation(lessonId ? `/learn/${courseId}?lesson=${lessonId}` : `/learn/${courseId}`);
    }
  };

  if (authLoading || allCoursesLoading || enrolledCoursesLoading || progressLoading) {
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

  const totalEnrolled = enrolledCourses?.length || 0;
  const completedCourses = progressData?.filter(p => p.progressPercentage === 100).length || 0;
  const inProgressCourses = progressData?.filter(p => p.progressPercentage > 0 && p.progressPercentage < 100).length || 0;
  const totalProgress = progressData?.length
    ? Math.round(progressData.reduce((acc, p) => acc + p.progressPercentage, 0) / progressData.length)
    : 0;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Xayrli tong";
    if (h < 18) return "Xayrli kun";
    return "Xayrli kech";
  };

  const firstName = user?.firstName || "Talaba";

  return (
    <>
      {/* Video Popup Modal */}
      {videoModal && (
        <VideoLessonModal
          state={videoModal}
          onClose={() => setVideoModal(null)}
        />
      )}

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
                  gradient="from-blue-600/25 via-blue-900/15 to-transparent"
                  iconBg="bg-blue-500/25"
                  iconColor="text-blue-300"
                  borderColor="border-blue-500/35"
                  glowColor="rgba(59,130,246,0.45)"
                  delay={0.1}
                />
                <StatsCard
                  title="Tugallangan"
                  value={completedCourses}
                  icon={Trophy}
                  testId="stats-completed"
                  gradient="from-emerald-600/25 via-emerald-900/15 to-transparent"
                  iconBg="bg-emerald-500/25"
                  iconColor="text-emerald-300"
                  borderColor="border-emerald-500/35"
                  glowColor="rgba(52,211,153,0.45)"
                  delay={0.2}
                />
                <StatsCard
                  title="Jarayonda"
                  value={inProgressCourses}
                  icon={Rocket}
                  testId="stats-in-progress"
                  gradient="from-orange-600/25 via-orange-900/15 to-transparent"
                  iconBg="bg-orange-500/25"
                  iconColor="text-orange-300"
                  borderColor="border-orange-500/35"
                  glowColor="rgba(251,146,60,0.45)"
                  delay={0.3}
                />
                <StatsCard
                  title="Progress"
                  value={`${totalProgress}%`}
                  icon={Target}
                  testId="stats-avg-progress"
                  gradient="from-purple-600/25 via-purple-900/15 to-transparent"
                  iconBg="bg-purple-500/25"
                  iconColor="text-purple-300"
                  borderColor="border-purple-500/35"
                  glowColor="rgba(168,85,247,0.45)"
                  delay={0.4}
                />
              </motion.div>
            </motion.header>

            {/* Active Content Section */}
            <div className="space-y-12">

              {/* Live Rooms */}
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
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <ArrowRight className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Tabs System — 2 tabs only */}
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
                </AnimatePresence>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
