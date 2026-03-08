import { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CourseCard } from "@/components/CourseCard";
import { ProgressCard } from "@/components/ProgressCard";
import { StatsCard } from "@/components/StatsCard";
import { ModernVideoPlayer } from "@/components/ModernVideoPlayer";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  BookOpen, Trophy, GraduationCap, PlayCircle, CheckCircle, Star, Sparkles,
  ArrowRight, Target, Zap, Radio, Video, Clock, LayoutGrid, Rocket, Flame, Crown,
  X, ChevronLeft, ChevronRight, Lock, Play, Layers, FileText, ClipboardCheck,
  ExternalLink, Info, CheckCircle2, XCircle, ArrowLeft, Loader2
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
  const { toast } = useToast();

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);

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

  const { data: lockStatusData } = useQuery<{ settings: any; lockedLessons: Record<string, { locked: boolean; unlockDate?: string; reason: string }> }>({
    queryKey: ["/api/courses", state.courseId, "lesson-lock-status"],
    queryFn: () => fetch(`/api/courses/${state.courseId}/lesson-lock-status`, { credentials: 'include' }).then(r => r.json()),
  });

  const lockedLessons = lockStatusData?.lockedLessons || {};

  const isLessonLocked = (lessonId: string, _lesson: any): boolean => {
    const status = lockedLessons[lessonId];
    if (!status) return false;
    return status.locked === true;
  };

  const getLockReason = (lessonId: string): string | null => {
    const status = lockedLessons[lessonId];
    if (!status || !status.locked) return null;
    if (status.reason === 'test_gate') return 'Oldingi dars testidan o\'ting';
    if (status.reason === 'schedule') {
      if (status.unlockDate) {
        const d = new Date(status.unlockDate);
        return `${d.toLocaleDateString('uz-UZ')} da ochiladi`;
      }
      return 'Hali ochilmagan';
    }
    return 'Dars qulflangan';
  };

  const lessonAssignments = useMemo(() =>
    (assignments || []).filter((a: any) => a.lessonId === activeLessonId || !a.lessonId),
    [assignments, activeLessonId]
  );

  const lessonTests = useMemo(() =>
    (tests || []).filter((t: any) => t.lessonId === activeLessonId),
    [tests, activeLessonId]
  );

  const { data: testQuestions } = useQuery<any[]>({
    queryKey: ["/api/tests", activeTestId, "questions"],
    queryFn: () => fetch(`/api/tests/${activeTestId}/questions`, { credentials: 'include' }).then(r => r.json()),
    enabled: !!activeTestId,
  });

  const shuffledQuestions = useMemo(() => {
    if (!testQuestions) return [];
    if (!activeTest?.shuffleQuestions) return testQuestions;
    const seed = shuffleSeed || 1;
    const arr = [...testQuestions];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.abs(((seed * (i + 1) * 2654435761) >> 0) % (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [testQuestions, activeTest?.shuffleQuestions, shuffleSeed]);

  const openTest = (t: any) => {
    setActiveTestId(t.id);
    setActiveTest(t);
    setTestAnswers({});
    setTestResult(null);
    setShuffleSeed(Date.now());
  };

  const closeTest = () => {
    setActiveTestId(null);
    setActiveTest(null);
    setTestAnswers({});
    setTestResult(null);
  };

  const submitTest = async () => {
    if (!activeTestId) return;
    setIsSubmittingTest(true);
    try {
      const res = await apiRequest("POST", `/api/tests/${activeTestId}/submit`, { answers: testAnswers });
      const result = await res.json();
      setTestResult(result);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message || "Test topshirishda xatolik", variant: "destructive" });
    } finally {
      setIsSubmittingTest(false);
    }
  };

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
  const prevLesson = useMemo(() => {
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (!isLessonLocked(sortedLessons[i].id, sortedLessons[i])) return sortedLessons[i];
    }
    return null;
  }, [currentIdx, sortedLessons, lockedLessons]);
  const nextLesson = useMemo(() => {
    for (let i = currentIdx + 1; i < sortedLessons.length; i++) {
      if (!isLessonLocked(sortedLessons[i].id, sortedLessons[i])) return sortedLessons[i];
    }
    return null;
  }, [currentIdx, sortedLessons, lockedLessons]);

  useEffect(() => {
    if (sortedLessons.length > 0 && Object.keys(lockedLessons).length > 0) {
      const currentIsLocked = isLessonLocked(activeLessonId, sortedLessons.find(l => l.id === activeLessonId));
      if (currentIsLocked) {
        const firstUnlocked = sortedLessons.find(l => !isLessonLocked(l.id, l));
        if (firstUnlocked) setActiveLessonId(firstUnlocked.id);
      }
    }
  }, [lockedLessons, sortedLessons]);

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
                {currentLesson && isLessonLocked(currentLesson.id, currentLesson) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Dars qulflangan</p>
                    <p className="text-slate-500 text-xs">{getLockReason(currentLesson.id)}</p>
                  </div>
                ) : currentLesson ? (
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
                              onClick={() => openTest(t)}
                              className="shrink-0 text-xs border-cyan-500/30 text-cyan-400 gap-1"
                              data-testid={`button-start-test-${t.id}`}
                            >
                              <ClipboardCheck className="w-3 h-3" />
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
                  const locked = isLessonLocked(lesson.id, lesson);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => !locked && setActiveLessonId(lesson.id)}
                      disabled={locked}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all duration-200 group
                        ${locked
                          ? 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
                          : isActive
                            ? 'bg-primary/15 border-l-2 border-primary'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                    >
                      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5
                        ${locked ? 'bg-red-500/10 text-red-400' : isActive ? 'bg-primary text-white' : 'bg-white/8 text-slate-500 group-hover:bg-white/12'}`}>
                        {locked ? (
                          <Lock className="w-3 h-3" />
                        ) : lesson.isDemo ? (
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
                        <p className={`text-xs font-medium leading-snug line-clamp-2 ${locked ? 'text-slate-600' : isActive ? 'text-slate-100' : 'text-slate-400 group-hover:text-slate-300'}`}>
                          {lesson.title}
                        </p>
                        {lesson.isDemo && !locked && (
                          <span className="text-[9px] text-orange-400/70 font-medium">Demo</span>
                        )}
                        {locked && getLockReason(lesson.id) && (
                          <span className="text-[9px] text-red-400/70 font-medium">{getLockReason(lesson.id)}</span>
                        )}
                      </div>
                      {isActive && !locked && (
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

          {activeTestId && (
            <div className="absolute inset-0 z-[20] flex flex-col rounded-3xl overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(6,2,18,0.99) 0%, rgba(12,4,32,0.99) 50%, rgba(6,2,18,0.99) 100%)" }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Button size="icon" variant="ghost" onClick={closeTest} className="rounded-xl text-slate-400 shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Test</p>
                    <h3 className="text-sm font-bold text-slate-100 truncate">{activeTest?.title}</h3>
                  </div>
                </div>
                {activeTest?.passingScore && !testResult && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    O'tish bali: {activeTest.passingScore}%
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {testResult ? (
                  <div className="flex flex-col items-center gap-5 py-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${testResult.isPassed ? 'bg-green-500/20 border-2 border-green-500/40' : 'bg-red-500/20 border-2 border-red-500/40'}`}>
                      {testResult.isPassed ? <CheckCircle2 className="w-10 h-10 text-green-400" /> : <XCircle className="w-10 h-10 text-red-400" />}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{testResult.totalPoints ? ((testResult.score / testResult.totalPoints) * 100).toFixed(0) : 0}%</p>
                      <p className={`text-sm font-medium mt-1 ${testResult.isPassed ? 'text-green-400' : 'text-red-400'}`}>
                        {testResult.isPassed ? "Tabriklaymiz! Test o'tildi" : "Test o'tilmadi"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{testResult.score} / {testResult.totalPoints} ball</p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => { setTestResult(null); setTestAnswers({}); setShuffleSeed(Date.now()); }} data-testid="button-retake-test">
                        Qayta topshirish
                      </Button>
                      <Button onClick={closeTest} data-testid="button-close-test-result">Yopish</Button>
                    </div>

                    {testResult.results && (
                      <div className="w-full space-y-3 mt-4">
                        {testResult.results.map((r: any, i: number) => (
                          <div key={i} className={`p-3 rounded-xl border ${r.isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <div className="flex items-start gap-2">
                              {r.isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                              <div>
                                <p className="text-sm text-slate-200">{r.questionText || `Savol ${i + 1}`}</p>
                                <p className="text-xs text-slate-500 mt-1">{r.points} / {r.maxPoints} ball</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : !testQuestions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {shuffledQuestions.map((q: any, qIdx: number) => (
                      <div key={q.id} className="p-4 rounded-xl border border-white/8 bg-white/[0.02] space-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 rounded-lg px-2 py-1 shrink-0">{qIdx + 1}</span>
                          <p className="text-sm text-slate-200 leading-relaxed">{q.questionText}</p>
                        </div>
                        {q.questionType === "multiple_choice" && q.options && (
                          <RadioGroup value={testAnswers[q.id] || ""} onValueChange={(v) => setTestAnswers(prev => ({ ...prev, [q.id]: v }))}>
                            {(q.options as string[]).map((opt: string, oi: number) => (
                              <div key={oi} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <RadioGroupItem value={opt} id={`q-${q.id}-o-${oi}`} />
                                <Label htmlFor={`q-${q.id}-o-${oi}`} className="text-sm text-slate-300 cursor-pointer flex-1">{opt}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        {q.questionType === "multiple_select" && q.options && (
                          <div className="space-y-1">
                            {(q.options as string[]).map((opt: string, oi: number) => {
                              const selected = Array.isArray(testAnswers[q.id]) ? testAnswers[q.id] : [];
                              return (
                                <div key={oi} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                  <Checkbox
                                    id={`q-${q.id}-ms-${oi}`}
                                    checked={selected.includes(opt)}
                                    onCheckedChange={(checked) => {
                                      setTestAnswers(prev => {
                                        const cur = Array.isArray(prev[q.id]) ? [...prev[q.id]] : [];
                                        if (checked) cur.push(opt); else { const idx = cur.indexOf(opt); if (idx >= 0) cur.splice(idx, 1); }
                                        return { ...prev, [q.id]: cur };
                                      });
                                    }}
                                  />
                                  <Label htmlFor={`q-${q.id}-ms-${oi}`} className="text-sm text-slate-300 cursor-pointer flex-1">{opt}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.questionType === "true_false" && (
                          <RadioGroup value={testAnswers[q.id] || ""} onValueChange={(v) => setTestAnswers(prev => ({ ...prev, [q.id]: v }))}>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                              <RadioGroupItem value="true" id={`q-${q.id}-true`} />
                              <Label htmlFor={`q-${q.id}-true`} className="text-sm text-slate-300 cursor-pointer">To'g'ri</Label>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                              <RadioGroupItem value="false" id={`q-${q.id}-false`} />
                              <Label htmlFor={`q-${q.id}-false`} className="text-sm text-slate-300 cursor-pointer">Noto'g'ri</Label>
                            </div>
                          </RadioGroup>
                        )}
                        {q.questionType === "fill_in_blank" && (
                          <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                            placeholder="Javobingizni kiriting..."
                            value={testAnswers[q.id] || ""}
                            onChange={(e) => setTestAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          />
                        )}
                        {q.questionType === "matching" && q.options && q.matchingPairs && (
                          <div className="space-y-2">
                            {(q.matchingPairs as { left: string }[]).map((pair, pi: number) => (
                              <div key={pi} className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-slate-300 min-w-[100px]">{pair.left}</span>
                                <select
                                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-200"
                                  value={(testAnswers[q.id] as Record<string, string>)?.[pair.left] || ""}
                                  onChange={(e) => setTestAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id] as Record<string, string> || {}), [pair.left]: e.target.value } }))}
                                >
                                  <option value="">Tanlang...</option>
                                  {(q.options as string[]).map((opt, oi) => (
                                    <option key={oi} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="sticky bottom-0 pt-3 pb-1 bg-[rgba(6,2,18,0.95)] backdrop-blur-sm">
                      <Button
                        onClick={submitTest}
                        disabled={isSubmittingTest || Object.keys(testAnswers).length === 0}
                        className="w-full"
                        data-testid="button-submit-modal-test"
                      >
                        {isSubmittingTest ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Tekshirilmoqda...</> : "Testni Topshirish"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
