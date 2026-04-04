import { useEffect, useState, useMemo, useRef, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, CheckCircle, CheckCircle2, XCircle, FileText, ClipboardCheck, Lock, Home, MessageCircle, Download, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Clock, Volume2, List, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationBell } from "@/components/NotificationBell";
import { StarRating } from "@/components/StarRating";
import { ModernVideoPlayer } from "@/components/ModernVideoPlayer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import type { Course, Lesson, Assignment, Test } from "@shared/schema";

export default function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, isInstructor, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { isVideoPlaying, setVideoPlaying } = useVideoPlayback();
  
  // Preview mode for instructors and admins (bypass enrollment checks)
  const isPreviewMode = isInstructor || isAdmin;
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [submissionDialog, setSubmissionDialog] = useState<{ open: boolean; assignmentId: string | null }>({ open: false, assignmentId: null });
  const [submissionForm, setSubmissionForm] = useState({ content: "" });
  const [submissionFiles, setSubmissionFiles] = useState<{ images: File[], audio: File[], files: File[] }>({ images: [], audio: [], files: [] });
  const [testDialog, setTestDialog] = useState<{ open: boolean; testId: string | null; test?: any }>({ open: false, testId: null });
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [globalTimer, setGlobalTimer] = useState<number>(0);
  const [questionTimer, setQuestionTimer] = useState<number>(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(0);
  const [sectionTimer, setSectionTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const timerRef = useRef<any>(null);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  
  // Essay state
  const [essayText, setEssayText] = useState("");
  const [essayWordCount, setEssayWordCount] = useState(0);
  const [isCheckingEssay, setIsCheckingEssay] = useState(false);
  
  // Mobile lesson list toggle
  const [showMobileLessons, setShowMobileLessons] = useState(false);
  
  // Module accordion state - all expanded by default
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  // Module gradient colors palette - works in both light and dark mode
  const moduleColors = [
    { bg: "from-blue-500/15 to-indigo-500/15 dark:from-blue-500/25 dark:to-indigo-500/25", border: "border-blue-500/40 dark:border-blue-400/50", ring: "ring-blue-500", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500 dark:bg-blue-600" },
    { bg: "from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/25 dark:to-teal-500/25", border: "border-emerald-500/40 dark:border-emerald-400/50", ring: "ring-emerald-500", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500 dark:bg-emerald-600" },
    { bg: "from-purple-500/15 to-pink-500/15 dark:from-purple-500/25 dark:to-pink-500/25", border: "border-purple-500/40 dark:border-purple-400/50", ring: "ring-purple-500", text: "text-purple-600 dark:text-purple-400", badge: "bg-purple-500 dark:bg-purple-600" },
    { bg: "from-orange-500/15 to-amber-500/15 dark:from-orange-500/25 dark:to-amber-500/25", border: "border-orange-500/40 dark:border-orange-400/50", ring: "ring-orange-500", text: "text-orange-600 dark:text-orange-400", badge: "bg-orange-500 dark:bg-orange-600" },
    { bg: "from-rose-500/15 to-red-500/15 dark:from-rose-500/25 dark:to-red-500/25", border: "border-rose-500/40 dark:border-rose-400/50", ring: "ring-rose-500", text: "text-rose-600 dark:text-rose-400", badge: "bg-rose-500 dark:bg-rose-600" },
    { bg: "from-cyan-500/15 to-sky-500/15 dark:from-cyan-500/25 dark:to-sky-500/25", border: "border-cyan-500/40 dark:border-cyan-400/50", ring: "ring-cyan-500", text: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-500 dark:bg-cyan-600" },
  ];
  
  useEffect(() => {
    setVideoPlaying(false);
  }, [currentLessonId, setVideoPlaying]);

  useEffect(() => {
    return () => { setVideoPlaying(false); };
  }, [setVideoPlaying]);

  const toggleModule = (moduleId: string) => {
    // Default to expanded (true) if not set, then toggle
    setExpandedModules(prev => ({ ...prev, [moduleId]: !(prev[moduleId] ?? true) }));
  };
  
  const isModuleExpanded = (moduleId: string) => {
    // Default to expanded if not set
    return expandedModules[moduleId] !== false;
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
    enabled: !!courseId && isAuthenticated,
  });
  
  // Fetch course modules
  const { data: courseModules, isLoading: modulesLoading } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "modules"],
    enabled: !!courseId && isAuthenticated,
  });
  
  // Combined loading state
  const isLessonsDataLoading = authLoading || lessonsLoading || modulesLoading || (!lessons && isAuthenticated);

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/courses", courseId, "assignments"],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: tests } = useQuery<Test[]>({
    queryKey: ["/api/courses", courseId, "tests"],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: testAttempts } = useQuery<any[]>({
    queryKey: ["/api/student/test-attempts"],
    enabled: isAuthenticated,
  });

  const { data: enrollment } = useQuery<{ paymentStatus: string } | null>({
    queryKey: ["/api/student/enrollment", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  // Check user's subscription status for this course
  const { data: userSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/student/subscriptions"],
    enabled: isAuthenticated,
  });

  const { data: testQuestionsData, isError: testQuestionsError, isLoading: testQuestionsLoading } = useQuery<any>({
    queryKey: ["/api/tests", testDialog.testId, "questions"],
    enabled: !!testDialog.testId && testDialog.open,
    retry: 1,
  });

  const testQuestions = useMemo(() => {
    if (!testQuestionsData) return undefined;
    if (Array.isArray(testQuestionsData)) return testQuestionsData;
    return testQuestionsData.questions || [];
  }, [testQuestionsData]);

  const testSections = useMemo(() => {
    if (!testQuestionsData || Array.isArray(testQuestionsData)) return [];
    return testQuestionsData.sections || [];
  }, [testQuestionsData]);

  const testTimerMode = useMemo(() => {
    if (!testQuestionsData || Array.isArray(testQuestionsData)) return 'none';
    return testQuestionsData.timerMode || 'none';
  }, [testQuestionsData]);

  const testTimerValue = useMemo(() => {
    if (!testQuestionsData || Array.isArray(testQuestionsData)) return null;
    return testQuestionsData.timerValue;
  }, [testQuestionsData]);

  // Seeded random for consistent shuffle within a session
  const seededRandom = (seed: number, idx: number) => {
    let h = seed ^ (idx * 2654435761);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };

  const shuffledTestQuestions = useMemo(() => {
    if (!testQuestions || testQuestions.length === 0) return testQuestions || [];
    const t = testDialog.test;
    if (!t?.randomOrder) return testQuestions;
    const arr = [...testQuestions];
    const qSeed = shuffleSeed * 2654435761 + 12345;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(qSeed, i * 13 + 7) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [testQuestions, testDialog.test, shuffleSeed]);

  // Lesson progress tracking
  const { data: lessonProgress } = useQuery<any>({
    queryKey: ["/api/lessons", currentLessonId, "progress"],
    enabled: !!currentLessonId && isAuthenticated,
  });

  // Fetch all lesson progress for the course
  const { data: courseProgress } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "progress"],
    enabled: !!courseId && isAuthenticated,
  });

  // Essay question and submission for current lesson
  const { data: essayQuestion } = useQuery<any>({
    queryKey: ["/api/lessons", currentLessonId, "essay-question"],
    enabled: !!currentLessonId,
  });

  const { data: essaySubmission } = useQuery<any>({
    queryKey: ["/api/lessons", currentLessonId, "essay-submission"],
    enabled: !!currentLessonId && isAuthenticated,
  });

  // Fetch student's group in this course
  const { data: myGroupData } = useQuery<{ groupId: string | null; groupName: string | null }>({
    queryKey: ["/api/courses", courseId, "my-group"],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/my-group`, { credentials: 'include' });
      if (!res.ok) return { groupId: null, groupName: null };
      return res.json();
    },
    enabled: !!courseId && isAuthenticated && !isInstructor && !isAdmin,
  });

  // Channel state for group chat
  const [chatChannel, setChatChannel] = useState<'general' | 'group'>('general');

  // Lesson lock status from group course settings
  const { data: lessonLockData } = useQuery<{
    settings: any;
    lockedLessons: Record<string, { locked: boolean; unlockDate?: string; reason: string }>;
  }>({
    queryKey: ["/api/courses", courseId, "lesson-lock-status"],
    enabled: !!courseId && isAuthenticated && !isPreviewMode,
    refetchInterval: isVideoPlaying ? false : 60 * 1000,
  });
  
  // Fetch all essay questions for the course
  const { data: courseEssayQuestions } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "essay-questions"],
    enabled: !!courseId && isAuthenticated,
  });
  
  const lessonsWithEssay = new Set(courseEssayQuestions?.map((eq: any) => eq.lessonId) || []);

  // Centralized sorted lesson list
  const allSortedLessons = useMemo(() => {
    if (!lessons) return [];
    
    const sortedModules = courseModules?.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
    const lessonsWithoutModule = lessons.filter((l: any) => !l.moduleId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const lessonsWithOrphanedModule = lessons.filter((l: any) => 
      l.moduleId && !sortedModules.some((m: any) => m.id === l.moduleId)
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const result: Lesson[] = [
      ...lessonsWithoutModule,
      ...lessonsWithOrphanedModule,
    ];
    
    sortedModules.forEach((module: any) => {
      const moduleLessons = lessons.filter((l: any) => l.moduleId === module.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      result.push(...moduleLessons);
    });
    
    return result;
  }, [lessons, courseModules]);

  // Fetch user's course rating
  const { data: userCourseRating } = useQuery<{ rating: number; review?: string } | null>({
    queryKey: ["/api/courses", courseId, "rating/user"],
    enabled: !!courseId && isAuthenticated && !isPreviewMode,
  });

  // Set initial rating
  useEffect(() => {
    if (userCourseRating) {
      setSelectedRating(userCourseRating.rating || 0);
      setReviewText(userCourseRating.review || "");
    }
  }, [userCourseRating]);

  // Essay submission mutation — auto-triggers AI check after submit
  const submitEssayMutation = useMutation({
    mutationFn: async () => {
      if (!currentLessonId) return;
      const response = await apiRequest("POST", `/api/lessons/${currentLessonId}/essay-submission`, {
        essayText,
        wordCount: essayWordCount,
      });
      return await response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", currentLessonId, "essay-submission"] });
      toast({ title: "Insho yuborildi", description: "AI tekshiruvi boshlanmoqda..." });
      if (data?.id) {
        checkEssayMutation.mutate(data.id);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Essay AI check mutation
  const checkEssayMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      setIsCheckingEssay(true);
      const response = await apiRequest("POST", `/api/essay-submissions/${submissionId}/check`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", currentLessonId, "essay-submission"] });
      setIsCheckingEssay(false);
      toast({
        title: "Tekshirish tugadi",
        description: "AI tekshiruvi tugadi. Natijalarni ko'rishingiz mumkin.",
      });
    },
    onError: (error: Error) => {
      setIsCheckingEssay(false);
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Count Arabic words
  const countArabicWords = (text: string) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Handle essay text change
  const handleEssayChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssayText(text);
    setEssayWordCount(countArabicWords(text));
  };

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      if (!courseId) return;
      const response = await apiRequest("POST", `/api/courses/${courseId}/rating`, {
        rating: selectedRating,
        review: reviewText || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating/user"] });
      toast({
        title: "Baholandi",
        description: "Kursni baholaganingiz uchun rahmat!",
      });
      setRatingDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      const response = await apiRequest("POST", `/api/lessons/${lessonId}/progress`, {
        watchedSeconds: 0,
        totalSeconds: 0,
        lastPosition: 0,
        completed,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", currentLessonId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
      toast({
        title: "Saqlandi",
        description: "Dars progresi saqlandi",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const submitTestMutation = useMutation({
    mutationFn: async () => {
      if (!testDialog.testId) return;
      const response = await apiRequest("POST", `/api/student/tests/${testDialog.testId}/submit`, {
        answers: testAnswers,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/test-attempts'] });
      setTestResult(data);
      stopTimer();
      setTestStarted(false);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  const startGlobalTimer = useCallback((seconds: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setGlobalTimer(seconds);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setGlobalTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startQuestionTimer = useCallback((seconds: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setQuestionTimer(seconds);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setQuestionTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startSectionTimer = useCallback((seconds: number) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSectionTimer(seconds);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setSectionTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTest = useCallback(() => {
    setTestStarted(true);
    setCurrentQuestionIdx(0);
    setCurrentSectionIdx(0);
    if (testTimerMode === 'global' && testTimerValue) {
      startGlobalTimer(testTimerValue * 60);
    } else if (testTimerMode === 'per_question' && shuffledTestQuestions.length > 0) {
      const q = shuffledTestQuestions[0];
      const tl = q.timeLimit || testTimerValue || 60;
      startQuestionTimer(tl);
    } else if (testTimerMode === 'sections' && testSections.length > 0) {
      const sec = testSections[0];
      if (sec.timerType === 'total') {
        startSectionTimer(sec.timerValue);
      } else if (sec.timerType === 'per_question') {
        const sectionQuestions = shuffledTestQuestions.filter((q: any) => q.sectionId === sec.id);
        if (sectionQuestions.length > 0) {
          startQuestionTimer(sectionQuestions[0].timeLimit || sec.timerValue || 60);
        }
      }
    }
  }, [testTimerMode, testTimerValue, shuffledTestQuestions, testSections, startGlobalTimer, startQuestionTimer, startSectionTimer]);

  const timerExpiredRef = useRef(false);

  useEffect(() => {
    if (globalTimer === 0 && testTimerMode === 'global' && testStarted && !testResult && timerActive) {
      setTimerActive(false);
      submitTestMutation.mutate();
    }
  }, [globalTimer, testTimerMode, testStarted, testResult, timerActive]);

  useEffect(() => {
    if (questionTimer === 0 && testStarted && !testResult && timerActive) {
      if (testTimerMode === 'per_question') {
        const nextIdx = currentQuestionIdx + 1;
        if (nextIdx < shuffledTestQuestions.length) {
          setCurrentQuestionIdx(nextIdx);
          const q = shuffledTestQuestions[nextIdx];
          const tl = q.timeLimit || testTimerValue || 60;
          startQuestionTimer(tl);
        } else {
          submitTestMutation.mutate();
        }
      } else if (testTimerMode === 'sections') {
        const sec = testSections[currentSectionIdx];
        const sectionQuestions = shuffledTestQuestions.filter((q: any) => q.sectionId === sec?.id);
        const localIdx = sectionQuestions.findIndex((q: any) => q.id === shuffledTestQuestions[currentQuestionIdx]?.id);
        const nextLocalIdx = localIdx + 1;
        if (nextLocalIdx < sectionQuestions.length) {
          const globalNextIdx = shuffledTestQuestions.findIndex((q: any) => q.id === sectionQuestions[nextLocalIdx].id);
          setCurrentQuestionIdx(globalNextIdx);
          startQuestionTimer(sectionQuestions[nextLocalIdx].timeLimit || sec.timerValue || 60);
        } else {
          const nextSecIdx = currentSectionIdx + 1;
          if (nextSecIdx < testSections.length) {
            setCurrentSectionIdx(nextSecIdx);
            const nextSec = testSections[nextSecIdx];
            const nextSecQuestions = shuffledTestQuestions.filter((q: any) => q.sectionId === nextSec.id);
            if (nextSecQuestions.length > 0) {
              const gi = shuffledTestQuestions.findIndex((q: any) => q.id === nextSecQuestions[0].id);
              setCurrentQuestionIdx(gi);
              if (nextSec.timerType === 'total') {
                startSectionTimer(nextSec.timerValue);
              } else {
                startQuestionTimer(nextSecQuestions[0].timeLimit || nextSec.timerValue || 60);
              }
            }
          } else {
            submitTestMutation.mutate();
          }
        }
      }
    }
  }, [questionTimer, testStarted, testResult, testTimerMode, timerActive]);

  useEffect(() => {
    if (sectionTimer === 0 && testTimerMode === 'sections' && testStarted && !testResult && timerActive) {
      const nextSecIdx = currentSectionIdx + 1;
      if (nextSecIdx < testSections.length) {
        setCurrentSectionIdx(nextSecIdx);
        const nextSec = testSections[nextSecIdx];
        const nextSecQuestions = shuffledTestQuestions.filter((q: any) => q.sectionId === nextSec.id);
        if (nextSecQuestions.length > 0) {
          const gi = shuffledTestQuestions.findIndex((q: any) => q.id === nextSecQuestions[0].id);
          setCurrentQuestionIdx(gi);
          if (nextSec.timerType === 'total') {
            startSectionTimer(nextSec.timerValue);
          } else {
            startQuestionTimer(nextSecQuestions[0].timeLimit || nextSec.timerValue || 60);
          }
        }
      } else {
        submitTestMutation.mutate();
      }
    }
  }, [sectionTimer, testTimerMode, testStarted, testResult, timerActive]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const submitAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!submissionDialog.assignmentId) return;
      const formData = new FormData();
      formData.append('assignmentId', submissionDialog.assignmentId);
      formData.append('content', submissionForm.content || '');
      submissionFiles.images.forEach(file => formData.append('images', file));
      submissionFiles.audio.forEach(file => formData.append('audios', file));
      submissionFiles.files.forEach(file => formData.append('files', file));
      
      const response = await fetch(`/api/student/submissions`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Yuborishda xatolik');
      }
    },
    onSuccess: () => {
      toast({
        title: "Vazifa topshirildi",
        description: "Natijani tez orada bilasiz",
      });
      setSubmissionDialog({ open: false, assignmentId: null });
      setSubmissionForm({ content: "" });
      setSubmissionFiles({ images: [], audio: [], files: [] });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const handleStartChat = () => {
    setLocation('/chat');
  };

  // Set first lesson as current
  useEffect(() => {
    if (allSortedLessons.length > 0 && !currentLessonId) {
      setCurrentLessonId(allSortedLessons[0].id);
    }
  }, [allSortedLessons, currentLessonId]);

  // Auto-scroll & close mobile drawer
  const mainContentRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);
  useEffect(() => {
    if (currentLessonId) {
      setShowMobileLessons(false);
      if (mainContentRef.current) {
        mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentLessonId]);

  const effectiveCurrentLesson = currentLessonId 
    ? allSortedLessons.find(l => l.id === currentLessonId)
    : allSortedLessons[0];

  if (authLoading || courseLoading || isLessonsDataLoading || (lessons && lessons.length > 0 && !effectiveCurrentLesson)) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Kurs topilmadi</p>
      </div>
    );
  }

  const currentLesson = effectiveCurrentLesson;
  const currentIndex = allSortedLessons.findIndex(l => l.id === currentLessonId);
  const navPrevLesson = currentIndex > 0 ? allSortedLessons[currentIndex - 1] : null;
  const navNextLesson = currentIndex >= 0 && currentIndex < allSortedLessons.length - 1 ? allSortedLessons[currentIndex + 1] : null;

  function renderLessonItem(lesson: Lesson, index: number, colors?: typeof moduleColors[0]) {
    const isEnrolled = enrollment?.paymentStatus === 'confirmed' || enrollment?.paymentStatus === 'approved';
    const courseSubscription = userSubscriptions?.find((sub: any) => sub.course.id === courseId);
    const now = new Date();
    const endDate = courseSubscription ? new Date(courseSubscription.subscription.endDate) : null;
    const hasActiveSubscription = courseSubscription?.subscription.status === 'active' && endDate && endDate > now;
    const lessonProgressData = courseProgress?.find((p: any) => p.lessonId === lesson.id);
    const isCompleted = lessonProgressData?.completed || false;
    const isEnrollmentLocked = !isPreviewMode && !lesson.isDemo && (!isEnrolled || !hasActiveSubscription);
    const sidebarScheduleInfo = !isPreviewMode ? lessonLockData?.lockedLessons?.[lesson.id] : undefined;
    const isScheduleLocked = sidebarScheduleInfo?.locked ?? false;
    const isLocked = isEnrollmentLocked || isScheduleLocked;
    const isActive = currentLessonId === lesson.id;
    
    return (
      <div
        key={lesson.id}
        onClick={() => !isLocked && setCurrentLessonId(lesson.id)}
        className={`group relative flex items-center gap-3 p-3 rounded-lg ${
          isLocked ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'hover-elevate cursor-pointer'
        } ${isActive ? `bg-gradient-to-r ${colors?.bg || 'from-primary/10 to-primary/5'} ring-2 ${colors?.ring || 'ring-primary'}` : ''}`}
        data-testid={`lesson-item-${lesson.id}`}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          isLocked ? 'bg-muted' : isCompleted ? 'bg-green-500 dark:bg-green-600' : isActive ? `${colors?.badge || 'bg-primary'}` : 'bg-muted/50'
        }`}>
          {isLocked ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : isCompleted ? (
            <CheckCircle className="w-5 h-5 text-white" />
          ) : isActive ? (
            <PlayCircle className="w-5 h-5 text-white" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">{index}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold line-clamp-1 ${isActive ? (colors?.text || 'text-primary') : ''}`}>{lesson.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {lesson.duration && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lesson.duration} daq
              </span>
            )}
            {lesson.isDemo && (
              <span className="text-[10px] font-semibold uppercase bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md">Bepul</span>
            )}
            {lessonsWithEssay.has(lesson.id) && (
              <span className="text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <FileText className="w-2.5 h-2.5" /> Insho
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col w-full">
      {/* Mobile Header Bar - Modern App-like */}
      <div className="sm:hidden sticky top-0 z-50 bg-background border-b px-4 h-14 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          className="shrink-0 -ml-2"
          data-testid="button-back-mobile"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-sm font-bold line-clamp-1 flex-1 text-center" data-testid="text-course-title-mobile">
          {course.title}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowMobileLessons(true)}
          className="shrink-0 -mr-2 text-primary"
          data-testid="button-hamburger-mobile"
        >
          <List className="w-6 h-6" />
        </Button>
      </div>

      {/* Desktop header */}
      <div className="border-b hidden sm:block">
        <div className="flex h-12 items-center px-4 gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/')} data-testid="button-back-home">
            <Home className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold line-clamp-1 flex-1" data-testid="text-course-title">{course.title}</h1>
          <div className="flex items-center gap-1">
            {!isPreviewMode && enrollment && (enrollment.paymentStatus === 'confirmed' || enrollment.paymentStatus === 'approved') && (
              <Button variant="ghost" size="sm" onClick={() => setRatingDialog(true)} data-testid="button-rate-course">
                <Star className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleStartChat} data-testid="button-chat-instructor">
              <MessageCircle className="w-4 h-4" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/api/logout"} data-testid="button-logout">
              Chiqish
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none p-0 sm:p-4 lg:p-6 pb-36 sm:pb-4 bg-muted/10" ref={(el) => { mainContentRef.current = el; }}>
          {currentLesson ? (
            (() => {
              const isEnrolled = enrollment?.paymentStatus === 'confirmed' || enrollment?.paymentStatus === 'approved';
              const courseSubscription = userSubscriptions?.find((sub: any) => sub.course.id === courseId);
              const now = new Date();
              const endDate = courseSubscription ? new Date(courseSubscription.subscription.endDate) : null;
              const hasActiveSubscription = courseSubscription?.subscription.status === 'active' && endDate && endDate > now;
              const isEnrollmentLocked = !isPreviewMode && !currentLesson.isDemo && (!isEnrolled || !hasActiveSubscription);
              const scheduleInfo = !isPreviewMode ? lessonLockData?.lockedLessons?.[currentLesson.id] : undefined;
              const isScheduleLocked = scheduleInfo?.locked ?? false;
              const isLocked = isEnrollmentLocked || isScheduleLocked;

              return (
                <div className="max-w-5xl mx-auto w-full">
                  {/* Player Area */}
                  <div className="aspect-video bg-black sm:rounded-2xl overflow-hidden relative">
                    {isLocked ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-6 text-center">
                        <Lock className="w-12 h-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Dars yopiq</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                          {isEnrollmentLocked ? "Kursni faollashtiring" : "Vaqti hali kelmadi"}
                        </p>
                      </div>
                    ) : (
                      <ModernVideoPlayer 
                        videoUrl={currentLesson.videoUrl || ""} 
                        paused={testDialog.open}
                        onPlayingChange={setVideoPlaying}
                      />
                    )}
                  </div>

                  {/* Lesson title + Tugatish — compact on mobile */}
                  <div className="px-3 sm:px-0 pt-3 pb-2 flex items-center justify-between gap-3 sm:pt-5 sm:pb-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="shrink-0 text-xs">{currentIndex + 1}-dars</Badge>
                      <h2 className="text-base sm:text-xl font-bold truncate">{currentLesson.title}</h2>
                    </div>
                    {!isPreviewMode && !isLocked && (
                      <Button
                        variant={lessonProgress?.completed ? "outline" : "default"}
                        size="sm"
                        onClick={() => saveProgressMutation.mutate({ lessonId: currentLesson.id, completed: !lessonProgress?.completed })}
                        className="shrink-0 rounded-xl"
                      >
                        {lessonProgress?.completed ? <CheckCircle className="w-4 h-4" /> : "Tugatish"}
                      </Button>
                    )}
                  </div>

                  {/* Tabs — no gap between list and content on mobile */}
                  <div className="px-3 sm:px-0">
                    <Tabs defaultValue="info" className="w-full">
                      <TabsList className="w-full justify-start h-10 bg-muted/50 p-1 rounded-lg overflow-x-auto no-scrollbar">
                        <TabsTrigger value="info" className="text-xs sm:text-sm px-3">Umumiy</TabsTrigger>
                        <TabsTrigger value="assignments" className="text-xs sm:text-sm px-3">Vazifalar</TabsTrigger>
                        <TabsTrigger value="tests" className="text-xs sm:text-sm px-3">Testlar</TabsTrigger>
                        <TabsTrigger value="results" className="text-xs sm:text-sm px-3">Natijalar</TabsTrigger>
                      </TabsList>

                      <TabsContent value="info" className="mt-2 space-y-3">
                        {currentLesson.description ? (
                          <div className="bg-muted/30 p-3 sm:p-6 rounded-xl border">
                            <div className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">{currentLesson.description}</div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1">
                            {/* Course progress mini-card */}
                            <div className="flex items-center justify-between px-1 py-2 rounded-xl bg-muted/40 border text-sm">
                              <span className="text-muted-foreground text-xs">Kurs bo'yicha progress</span>
                              <span className="font-bold text-primary text-xs">
                                {courseProgress?.filter((p: any) => p.completed).length || 0} / {allSortedLessons.length} dars
                              </span>
                            </div>
                            {/* Next lesson card */}
                            {navNextLesson && (
                              <button
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 text-left"
                                onClick={() => setCurrentLessonId(navNextLesson.id)}
                              >
                                <PlayCircle className="w-7 h-7 text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Keyingi dars</p>
                                  <p className="text-sm font-semibold truncate">{navNextLesson.title}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                              </button>
                            )}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="assignments" className="space-y-4">
                        {essayQuestion && (
                          <Card className="border-2 border-primary/10">
                            <CardHeader className="bg-primary/5">
                              <CardTitle className="text-lg">{essayQuestion.questionText}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                              {!essaySubmission ? (
                                <div className="space-y-4">
                                  <Textarea 
                                    placeholder="Inshoni yozing..." 
                                    className="min-h-[200px] rounded-xl"
                                    value={essayText}
                                    onChange={handleEssayChange}
                                  />
                                  <Button className="w-full gap-2" onClick={() => submitEssayMutation.mutate()} disabled={!essayText.trim() || submitEssayMutation.isPending || isCheckingEssay}>
                                    {(submitEssayMutation.isPending || isCheckingEssay) && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isCheckingEssay ? "AI tekshirmoqda..." : submitEssayMutation.isPending ? "Yuborilmoqda..." : `Yuborish va AI tekshirish (${essayWordCount} so'z)`}
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
                                    <p className="text-sm italic">{essaySubmission.essayText}</p>
                                  </div>
                                  {essaySubmission.aiFeedback && (
                                    <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/10 prose prose-sm max-w-none">
                                      {essaySubmission.aiFeedback}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        {assignments?.filter(a => a.lessonId === currentLessonId).map(a => (
                          <Card key={a.id}>
                            <CardHeader><CardTitle className="text-lg">{a.title}</CardTitle></CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground mb-4">{a.description}</p>
                              <Button className="w-full" onClick={() => setSubmissionDialog({ open: true, assignmentId: a.id })}>Topshirish</Button>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="tests" className="space-y-4">
                        {tests?.filter(t => t.lessonId === currentLessonId).map(t => {
                          const lastAttempt = testAttempts?.filter((a: any) => a.testId === t.id).sort((a: any, b: any) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())[0];
                          return (
                          <Card key={t.id}>
                            <CardHeader>
                              <CardTitle className="text-lg">{t.title}</CardTitle>
                              {t.passingScore && <p className="text-xs text-muted-foreground">O'tish bali: {t.passingScore}%</p>}
                              {lastAttempt && (
                                <p className={`text-xs font-medium ${lastAttempt.isPassed ? 'text-green-600' : 'text-destructive'}`}>
                                  Oxirgi natija: {lastAttempt.totalPoints ? ((lastAttempt.score / lastAttempt.totalPoints) * 100).toFixed(0) : 0}% — {lastAttempt.isPassed ? "O'tildi" : "O'tilmadi"}
                                </p>
                              )}
                            </CardHeader>
                            <CardContent>
                              <Button className="w-full" onClick={() => {
                                setTestDialog({ open: true, testId: t.id, test: t });
                                setTestAnswers({});
                                setTestResult(null);
                                setShuffleSeed(Date.now());
                                setTestStarted(false);
                                stopTimer();
                              }}>
                                {lastAttempt ? "Qayta Topshirish" : "Boshlash"}
                              </Button>
                            </CardContent>
                          </Card>
                          );
                        })}
                      </TabsContent>

                      <TabsContent value="results" className="space-y-4">
                        {/* Results list... */}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">Darslar yo'q</p>
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-96 border-l bg-muted/30 overflow-y-auto p-4 space-y-4">
          <h3 className="font-bold">Kurs Dasturi</h3>
          {allSortedLessons.map((lesson, index) => renderLessonItem(lesson, index + 1))}
        </div>
      </div>

      {/* Mobile Lessons Overlay */}
      {showMobileLessons && (
        <div className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-background animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
            <h3 className="font-bold">Mundarija</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowMobileLessons(false)}><X className="w-6 h-6" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {allSortedLessons.map((lesson, index) => renderLessonItem(lesson, index + 1))}
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      {currentLesson && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          {/* Lesson list hint bar */}
          <button
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-primary border-b border-primary/20 bg-primary/5 active:bg-primary/10"
            onClick={() => setShowMobileLessons(true)}
            data-testid="button-lessons-list-bar"
          >
            <List className="w-3.5 h-3.5" />
            Barcha darslar ({currentIndex + 1}/{allSortedLessons.length}) — ko'rish
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {/* Prev / Next */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl"
              onClick={() => navPrevLesson && setCurrentLessonId(navPrevLesson.id)}
              disabled={!navPrevLesson}
            >
              <ChevronLeft className="w-5 h-5 mr-1" /> Oldingi
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/30"
              onClick={() => navNextLesson && setCurrentLessonId(navNextLesson.id)}
              disabled={!navNextLesson}
            >
              Keyingi <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Rating Dialog */}
      <RatingDialog open={ratingDialog} onOpenChange={setRatingDialog} rating={selectedRating} onRatingChange={setSelectedRating} review={reviewText} onReviewChange={setReviewText} onSubmit={() => submitRatingMutation.mutate()} isPending={submitRatingMutation.isPending} />

      {/* Assignment Submission Dialog */}
      <Dialog open={submissionDialog.open} onOpenChange={(open) => {
        setSubmissionDialog({ open, assignmentId: submissionDialog.assignmentId });
        if (!open) { setSubmissionForm({ content: "" }); setSubmissionFiles({ images: [], audio: [], files: [] }); }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vazifani Topshirish</DialogTitle>
            <DialogDescription>Fayllarni yuklang yoki matn kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Matn (ixtiyoriy)</Label>
              <Textarea
                value={submissionForm.content}
                onChange={(e) => setSubmissionForm({ content: e.target.value })}
                placeholder="Javobingizni yozing..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Fayllar (ixtiyoriy)</Label>
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSubmissionFiles(prev => ({ ...prev, files: [...prev.files, ...files] }));
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionDialog({ open: false, assignmentId: null })}>Bekor qilish</Button>
            <Button onClick={() => submitAssignmentMutation.mutate()} disabled={submitAssignmentMutation.isPending}>
              {submitAssignmentMutation.isPending ? "Yuklanmoqda..." : "Topshirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Taking Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => {
        if (!open) { setTestDialog({ open: false, testId: null }); setTestAnswers({}); setTestResult(null); stopTimer(); setTestStarted(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-background" data-testid="dialog-test-taking">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <DialogTitle data-testid="text-test-title">
                {testDialog.test?.title || "Test"}
              </DialogTitle>
              {testStarted && !testResult && (
                <div className="flex items-center gap-2">
                  {testTimerMode === 'global' && (
                    <Badge variant={globalTimer <= 60 ? "destructive" : "secondary"} className="font-mono text-sm" data-testid="badge-global-timer">
                      <Clock className="w-3.5 h-3.5 mr-1" />{formatTime(globalTimer)}
                    </Badge>
                  )}
                  {testTimerMode === 'per_question' && (
                    <Badge variant={questionTimer <= 10 ? "destructive" : "secondary"} className="font-mono text-sm" data-testid="badge-question-timer">
                      <Clock className="w-3.5 h-3.5 mr-1" />{formatTime(questionTimer)}
                    </Badge>
                  )}
                  {testTimerMode === 'sections' && testSections[currentSectionIdx] && (
                    <>
                      <Badge variant="outline" className="text-xs">{testSections[currentSectionIdx].title}</Badge>
                      {testSections[currentSectionIdx].timerType === 'total' ? (
                        <Badge variant={sectionTimer <= 30 ? "destructive" : "secondary"} className="font-mono text-sm">
                          <Clock className="w-3.5 h-3.5 mr-1" />{formatTime(sectionTimer)}
                        </Badge>
                      ) : (
                        <Badge variant={questionTimer <= 10 ? "destructive" : "secondary"} className="font-mono text-sm">
                          <Clock className="w-3.5 h-3.5 mr-1" />{formatTime(questionTimer)}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {testDialog.test?.passingScore && (
              <DialogDescription>
                O'tish bali: {testDialog.test.passingScore}% | Savollar: {shuffledTestQuestions.length} ta
                {testTimerMode !== 'none' && !testStarted && (
                  <span className="ml-2 text-primary">
                    {testTimerMode === 'global' && testTimerValue ? `| Vaqt: ${testTimerValue} daqiqa` : ''}
                    {testTimerMode === 'per_question' ? '| Har bir savolga alohida vaqt' : ''}
                    {testTimerMode === 'sections' ? `| ${testSections.length} ta bo'lim` : ''}
                  </span>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          {testQuestionsError ? (
            <div className="space-y-4 py-6 text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <p className="text-muted-foreground">Test savollarini yuklashda xatolik yuz berdi</p>
              <Button variant="outline" onClick={() => { setTestDialog({ open: false, testId: null }); }} data-testid="button-close-test-error">Yopish</Button>
            </div>
          ) : testQuestionsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : testResult ? (
            <div className="space-y-6 py-4 overflow-y-auto">
              <div className={`p-6 rounded-xl text-center ${testResult.isPassed ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-destructive/10 border-2 border-destructive/30'}`}>
                <div className="text-4xl mb-2">{testResult.isPassed ? <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" /> : <XCircle className="w-12 h-12 text-destructive mx-auto" />}</div>
                <h3 className="text-2xl font-bold mb-1">{testResult.percentage?.toFixed(1)}%</h3>
                <p className="text-lg font-semibold">{testResult.isPassed ? "Test muvaffaqiyatli o'tildi!" : "Test o'tilmadi"}</p>
                <p className="text-sm text-muted-foreground mt-1">Ballar: {testResult.score} / {testResult.totalPoints}</p>
                {testDialog.test?.passingScore && !testResult.isPassed && (
                  <p className="text-sm text-destructive mt-2">O'tish uchun {testDialog.test.passingScore}% kerak</p>
                )}
              </div>
              <div className="flex gap-3">
                {!testResult.isPassed && (
                  <button className="btn-3d-danger flex-1" onClick={() => { setTestResult(null); setTestAnswers({}); setShuffleSeed(Date.now()); setTestStarted(false); }} data-testid="button-retake-test">Qayta Topshirish</button>
                )}
                <button className="btn-3d-outline flex-1" onClick={() => { setTestDialog({ open: false, testId: null }); setTestAnswers({}); setTestResult(null); }}>
                  {testResult.isPassed ? "Yopish" : "Keyinroq"}
                </button>
              </div>
            </div>
          ) : !testQuestions ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : shuffledTestQuestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Bu testda savollar yo'q</p>
          ) : testTimerMode !== 'none' && !testStarted ? (
            <div className="space-y-4 py-6 text-center">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <Clock className="w-10 h-10 mx-auto text-primary" />
                <h3 className="text-lg font-semibold">Testni boshlashga tayyormisiz?</h3>
                {testTimerMode === 'global' && <p className="text-sm text-muted-foreground">Umumiy vaqt: <span className="font-bold text-primary">{testTimerValue} daqiqa</span></p>}
                {testTimerMode === 'per_question' && <p className="text-sm text-muted-foreground">Har bir savolga alohida vaqt berilgan</p>}
                {testTimerMode === 'sections' && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{testSections.length} ta bo'lim:</p>
                    {testSections.map((sec: any, i: number) => (
                      <p key={sec.id} className="text-xs">{i + 1}. {sec.title} — {sec.timerType === 'total' ? `${Math.floor(sec.timerValue / 60)} daqiqa` : `har biriga ${sec.timerValue} soniya`}</p>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn-3d-primary w-full" onClick={handleStartTest} data-testid="button-start-timed-test">Boshlash</button>
            </div>
          ) : (
            <>
              {testTimerMode === 'per_question' && testStarted ? (
                <div className="flex-1 overflow-y-auto space-y-4 py-2">
                  {(() => {
                    const question = shuffledTestQuestions[currentQuestionIdx];
                    if (!question) return null;
                    const hasArabic = isArabic(question.questionText);
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">{currentQuestionIdx + 1} / {shuffledTestQuestions.length}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentQuestionIdx + 1) / shuffledTestQuestions.length) * 100}%` }} />
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="question-number-badge shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{currentQuestionIdx + 1}</span>
                          <div className="flex-1">
                            <p className={`font-semibold test-question-font ${hasArabic ? 'arabic-text' : ''}`} dir="ltr" data-testid={`question-text-${question.id}`}>{question.questionText}</p>
                            <div className="mt-3">
                              <TestQuestionInput question={question} value={testAnswers[question.id]} onChange={(val) => setTestAnswers(prev => ({ ...prev, [question.id]: val }))} shuffleAnswers={testDialog.test?.shuffleAnswers || false} shuffleSeed={shuffleSeed + currentQuestionIdx} seededRandom={seededRandom} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                          {currentQuestionIdx > 0 && (
                            <button className="btn-3d-outline flex-1" onClick={() => { setCurrentQuestionIdx(prev => prev - 1); }} data-testid="button-prev-question">Oldingi</button>
                          )}
                          {currentQuestionIdx < shuffledTestQuestions.length - 1 ? (
                            <button className="btn-3d-primary flex-1" onClick={() => {
                              const nextIdx = currentQuestionIdx + 1;
                              setCurrentQuestionIdx(nextIdx);
                              const nextQ = shuffledTestQuestions[nextIdx];
                              const tl = nextQ.timeLimit || testTimerValue || 60;
                              startQuestionTimer(tl);
                            }} data-testid="button-next-question">Keyingi</button>
                          ) : (
                            <button className="btn-3d-primary flex-1" onClick={() => submitTestMutation.mutate()} disabled={submitTestMutation.isPending} data-testid="button-submit-test">
                              {submitTestMutation.isPending ? "Topshirilmoqda..." : "Topshirish"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : testTimerMode === 'sections' && testStarted ? (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {(() => {
                    const currentSection = testSections[currentSectionIdx];
                    if (!currentSection) return null;
                    const sectionQuestions = shuffledTestQuestions.filter((q: any) => q.sectionId === currentSection.id);
                    const unassigned = currentSectionIdx === 0 ? shuffledTestQuestions.filter((q: any) => !q.sectionId) : [];
                    const displayQuestions = [...sectionQuestions, ...unassigned];
                    return (
                      <>
                        {currentSection.readingPassage && (
                          <div className="shrink-0 max-h-[35vh] overflow-y-auto p-4 bg-muted/40 border-b rounded-t-lg text-sm leading-relaxed" data-testid="reading-passage">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-primary text-xs">Reading Passage</span>
                            </div>
                            <div className="whitespace-pre-wrap">{currentSection.readingPassage}</div>
                          </div>
                        )}
                        <div className="flex-1 overflow-y-auto space-y-4 p-2">
                          {displayQuestions.map((question: any, qIdx: number) => {
                            const hasArabic = isArabic(question.questionText);
                            const globalIdx = shuffledTestQuestions.findIndex((q: any) => q.id === question.id);
                            return (
                              <div key={question.id} className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <span className="question-number-badge shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{globalIdx + 1}</span>
                                  <div className="flex-1">
                                    <p className={`font-semibold test-question-font ${hasArabic ? 'arabic-text' : ''}`} dir="ltr" data-testid={`question-text-${question.id}`}>{question.questionText}</p>
                                    <div className="mt-3">
                                      <TestQuestionInput question={question} value={testAnswers[question.id]} onChange={(val) => setTestAnswers(prev => ({ ...prev, [question.id]: val }))} shuffleAnswers={testDialog.test?.shuffleAnswers || false} shuffleSeed={shuffleSeed + globalIdx} seededRandom={seededRandom} />
                                    </div>
                                  </div>
                                </div>
                                {qIdx < displayQuestions.length - 1 && <hr className="border-border/50" />}
                              </div>
                            );
                          })}
                        </div>
                        <div className="shrink-0 flex gap-2 pt-3 border-t">
                          {currentSectionIdx > 0 && (
                            <button className="btn-3d-outline flex-1" onClick={() => {
                              const prevIdx = currentSectionIdx - 1;
                              setCurrentSectionIdx(prevIdx);
                              const prevSec = testSections[prevIdx];
                              if (prevSec.timerType === 'total') startSectionTimer(prevSec.timerValue);
                            }}>Oldingi bo'lim</button>
                          )}
                          {currentSectionIdx < testSections.length - 1 ? (
                            <button className="btn-3d-primary flex-1" onClick={() => {
                              const nextIdx = currentSectionIdx + 1;
                              setCurrentSectionIdx(nextIdx);
                              const nextSec = testSections[nextIdx];
                              if (nextSec.timerType === 'total') {
                                startSectionTimer(nextSec.timerValue);
                              } else {
                                const nextSecQ = shuffledTestQuestions.filter((q: any) => q.sectionId === nextSec.id);
                                if (nextSecQ.length > 0) startQuestionTimer(nextSecQ[0].timeLimit || nextSec.timerValue || 60);
                              }
                            }}>Keyingi bo'lim</button>
                          ) : (
                            <button className="btn-3d-primary flex-1" onClick={() => submitTestMutation.mutate()} disabled={submitTestMutation.isPending} data-testid="button-submit-test">
                              {submitTestMutation.isPending ? "Topshirilmoqda..." : "Topshirish"}
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6 py-2">
                  {shuffledTestQuestions.map((question: any, qIdx: number) => {
                    const hasArabic = isArabic(question.questionText);
                    return (
                      <div key={question.id} className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="question-number-badge shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary text-sm font-bold flex items-center justify-center">{qIdx + 1}</span>
                          <div className="flex-1">
                            <p className={`font-semibold test-question-font ${hasArabic ? 'arabic-text' : ''}`} dir="ltr" data-testid={`question-text-${question.id}`}>{question.questionText}</p>
                            <div className="mt-3">
                              <TestQuestionInput question={question} value={testAnswers[question.id]} onChange={(val) => setTestAnswers(prev => ({ ...prev, [question.id]: val }))} shuffleAnswers={testDialog.test?.shuffleAnswers || false} shuffleSeed={shuffleSeed + qIdx} seededRandom={seededRandom} />
                            </div>
                          </div>
                        </div>
                        {qIdx < shuffledTestQuestions.length - 1 && <hr className="border-border/50" />}
                      </div>
                    );
                  })}
                  {shuffledTestQuestions.length > 0 && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button className="btn-3d-outline flex-1" onClick={() => setTestDialog({ open: false, testId: null })}>Bekor qilish</button>
                      <button className="btn-3d-primary flex-1" onClick={() => submitTestMutation.mutate()} disabled={submitTestMutation.isPending} data-testid="button-submit-test">
                        {submitTestMutation.isPending ? "Topshirilmoqda..." : "Topshirish"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function TestQuestionInput({
  question, value, onChange, shuffleAnswers = false, shuffleSeed = 0, seededRandom
}: {
  question: any;
  value: any;
  onChange: (value: any) => void;
  shuffleAnswers?: boolean;
  shuffleSeed?: number;
  seededRandom?: (seed: number, idx: number) => number;
}) {
  const { data: mcOptions } = useQuery<any[]>({
    queryKey: ["/api/questions", question.id, "options"],
    enabled: question.type === "multiple_choice",
  });

  const displayOptions = useMemo(() => {
    if (!mcOptions || !shuffleAnswers || !seededRandom) return mcOptions || [];
    const arr = [...mcOptions];
    const combinedSeed = shuffleSeed * 2654435761 + question.id.charCodeAt(0) * 31;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(combinedSeed, i * 7 + 3) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [mcOptions, shuffleAnswers, shuffleSeed, seededRandom, question.id]);

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const isMultiAnswer = (question.correctCount || 1) > 1;

  if (question.type === "multiple_choice") {
    return (
      <div className="space-y-2">
        {isMultiAnswer && (
          <p className="text-xs text-muted-foreground italic mb-1">Bir nechta to'g'ri javob bor</p>
        )}
        {displayOptions.map((opt: any, optIdx: number) => {
          const hasAr = isArabic(opt.optionText);
          const isSelected = isMultiAnswer
            ? (Array.isArray(value) && value.includes(opt.id))
            : value === opt.id;
          return (
            <label
              key={opt.id}
              className={`test-option-card flex items-center gap-3 p-3 cursor-pointer ${isSelected ? 'selected' : ''}`}
              dir="ltr"
            >
              {isMultiAnswer ? (
                <Checkbox
                  checked={Array.isArray(value) && value.includes(opt.id)}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(checked ? [...current, opt.id] : current.filter((id: string) => id !== opt.id));
                  }}
                />
              ) : (
                <input type="radio" className="accent-primary w-4 h-4 shrink-0" checked={value === opt.id} onChange={() => onChange(opt.id)} />
              )}
              <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">{optionLetters[optIdx]}</span>
              <span className={`flex-1 test-option-font ${hasAr ? 'arabic-text' : ''}`}>
                {opt.optionText}
              </span>
            </label>
          );
        })}
      </div>
    );
  } else if (question.type === "true_false") {
    return (
      <div className="space-y-2">
        {[
          { val: "true", label: "To'g'ri (Ha)", letter: "A" },
          { val: "false", label: "Noto'g'ri (Yo'q)", letter: "B" },
        ].map(({ val, label, letter }) => (
          <label key={val} className={`test-option-card flex items-center gap-3 p-3 cursor-pointer ${value === val ? 'selected' : ''}`}>
            <input type="radio" className="accent-primary" checked={value === val} onChange={() => onChange(val)} />
            <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center">{letter}</span>
            <span className="test-option-font">{label}</span>
          </label>
        ))}
      </div>
    );
  } else if (question.type === "fill_blanks" || question.type === "short_answer") {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Javob yozing..."
        dir="ltr"
        className={`test-option-font ${isArabic(question.questionText) ? 'arabic-text' : ''}`}
      />
    );
  } else if (question.type === "essay") {
    return (
      <Textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Insho yozing..."
        rows={5}
        dir="ltr"
        className={`test-option-font ${isArabic(question.questionText) ? 'arabic-text' : ''}`}
      />
    );
  }
  return null;
}

function RatingDialog({ open, onOpenChange, rating, onRatingChange, review, onReviewChange, onSubmit, isPending }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Kursni Baholash</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex justify-center"><StarRating rating={rating} size={32} interactive={true} onRatingChange={onRatingChange} /></div>
          <Textarea value={review} onChange={(e) => onReviewChange(e.target.value)} placeholder="Sharh..." rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button onClick={onSubmit} disabled={rating === 0 || isPending}>{isPending ? "Saqlanmoqda..." : "Saqlash"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
