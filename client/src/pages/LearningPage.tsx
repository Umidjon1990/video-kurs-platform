import { useEffect, useState, useMemo } from "react";
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
import { PlayCircle, CheckCircle, FileText, ClipboardCheck, Lock, Home, MessageCircle, Download, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Clock, Volume2, List, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationBell } from "@/components/NotificationBell";
import { StarRating } from "@/components/StarRating";
import { ModernVideoPlayer } from "@/components/ModernVideoPlayer";
import { CourseGroupChat, OnlineUsersList } from "@/components/CourseGroupChat";
import { CourseVoiceChat } from "@/components/CourseVoiceChat";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, Lesson, Assignment, Test } from "@shared/schema";

export default function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user, isInstructor, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  
  // Preview mode for instructors and admins (bypass enrollment checks)
  const isPreviewMode = isInstructor || isAdmin;
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [submissionDialog, setSubmissionDialog] = useState<{ open: boolean; assignmentId: string | null }>({ open: false, assignmentId: null });
  const [submissionForm, setSubmissionForm] = useState({ content: "" });
  const [submissionFiles, setSubmissionFiles] = useState<{ images: File[], audio: File[], files: File[] }>({ images: [], audio: [], files: [] });
  const [testDialog, setTestDialog] = useState<{ open: boolean; testId: string | null }>({ open: false, testId: null });
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});
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

  const { data: testQuestions } = useQuery<any[]>({
    queryKey: ["/api/tests", testDialog.testId, "questions"],
    enabled: !!testDialog.testId && testDialog.open,
  });

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
    refetchInterval: 60 * 1000,
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

  // Essay submission mutation
  const submitEssayMutation = useMutation({
    mutationFn: async () => {
      if (!currentLessonId) return;
      const response = await apiRequest("POST", `/api/lessons/${currentLessonId}/essay-submission`, {
        essayText,
        wordCount: essayWordCount,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", currentLessonId, "essay-submission"] });
      toast({
        title: "Insho yuborildi",
        description: "Inshongiz muvaffaqiyatli saqlandi. Endi AI tekshiruvini boshlashingiz mumkin.",
      });
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
      toast({
        title: data.isPassed ? "Test muvaffaqiyatli o'tildi! ✅" : "Test topshirildi",
        description: `Sizning ballingiz: ${data.score} (${data.percentage.toFixed(0)}%)`,
        variant: data.isPassed ? "default" : "destructive",
      });
      setTestDialog({ open: false, testId: null });
      setTestAnswers({});
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

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
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex items-center justify-center">
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
        className={`group relative flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
          isLocked ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'hover-elevate cursor-pointer'
        } ${isActive ? `bg-gradient-to-r ${colors?.bg || 'from-primary/10 to-primary/5'} ring-2 ${colors?.ring || 'ring-primary'} shadow-sm` : ''}`}
        data-testid={`lesson-item-${lesson.id}`}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isLocked ? 'bg-muted' : isCompleted ? 'bg-green-500 dark:bg-green-600 shadow-md shadow-green-500/30' : isActive ? `${colors?.badge || 'bg-primary'} shadow-md` : 'bg-muted/50'
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
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Mobile Header Bar - Modern App-like */}
      <div className="sm:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b px-4 h-14 flex items-center justify-between gap-3">
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

      <div className="flex flex-col lg:flex-row flex-1 h-[calc(100dvh-3.5rem)] sm:h-[calc(100vh-3rem)] overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 sm:p-4 lg:p-6 pb-40 sm:pb-4" ref={(el) => { mainContentRef.current = el; }}>
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
                <div className="max-w-5xl mx-auto w-full space-y-4">
                  {/* Player Area */}
                  <div className="aspect-video bg-black sm:rounded-2xl overflow-hidden shadow-2xl relative group">
                    {isLocked ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6 text-center">
                        <Lock className="w-12 h-12 text-primary mb-4" />
                        <h3 className="text-xl font-bold mb-2">Dars yopiq</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                          {isEnrollmentLocked ? "Kursni faollashtiring" : "Vaqti hali kelmadi"}
                        </p>
                      </div>
                    ) : (
                      <ModernVideoPlayer 
                        videoUrl={currentLesson.videoUrl || ""} 
                        lessonId={currentLesson.id}
                        onComplete={() => saveProgressMutation.mutate({ lessonId: currentLesson.id, completed: true })}
                      />
                    )}
                  </div>

                  {/* Header */}
                  <div className="px-4 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full">{currentIndex + 1}-dars</Badge>
                        {currentLesson.duration && <span className="text-xs text-muted-foreground">{currentLesson.duration} daq</span>}
                      </div>
                      <h2 className="text-xl font-bold">{currentLesson.title}</h2>
                    </div>
                    {!isPreviewMode && !isLocked && (
                      <Button
                        variant={lessonProgress?.completed ? "outline" : "default"}
                        size="sm"
                        onClick={() => saveProgressMutation.mutate({ lessonId: currentLesson.id, completed: !lessonProgress?.completed })}
                        className="rounded-xl"
                      >
                        {lessonProgress?.completed ? <CheckCircle className="w-4 h-4 mr-2" /> : "Tugatish"}
                      </Button>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="px-4 sm:px-0">
                    <Tabs defaultValue="info" className="w-full">
                      <TabsList className="w-full justify-start h-12 bg-muted/50 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                        <TabsTrigger value="info">Umumiy</TabsTrigger>
                        <TabsTrigger value="assignments">Vazifalar</TabsTrigger>
                        <TabsTrigger value="tests">Testlar</TabsTrigger>
                        <TabsTrigger value="results">Natijalar</TabsTrigger>
                      </TabsList>

                      <TabsContent value="info" className="space-y-4">
                        {currentLesson.description ? (
                          <div className="bg-muted/30 p-4 sm:p-6 rounded-2xl border">
                            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" /> Dars ma'lumotlari
                            </h3>
                            <div className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">{currentLesson.description}</div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                            <BookOpen className="w-8 h-8 opacity-30" />
                            <p className="text-sm">Bu dars uchun qo'shimcha ma'lumot yo'q</p>
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
                                  <Button className="w-full" onClick={() => submitEssayMutation.mutate()} disabled={!essayText.trim() || submitEssayMutation.isPending}>
                                    Yuborish ({essayWordCount} so'z)
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
                        {tests?.filter(t => t.lessonId === currentLessonId).map(t => (
                          <Card key={t.id}>
                            <CardHeader><CardTitle className="text-lg">{t.title}</CardTitle></CardHeader>
                            <CardContent>
                              <Button className="w-full" onClick={() => { setTestDialog({ open: true, testId: t.id }); setTestAnswers({}); }}>Boshlash</Button>
                            </CardContent>
                          </Card>
                        ))}
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
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t">
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

      {/* Dialogs... (Rating, Submission, Test) */}
      <RatingDialog open={ratingDialog} onOpenChange={setRatingDialog} rating={selectedRating} onRatingChange={setSelectedRating} review={reviewText} onReviewChange={setReviewText} onSubmit={() => submitRatingMutation.mutate()} isPending={submitRatingMutation.isPending} />
    </div>
  );
}

// Subcomponents... (TestQuestionInput, RatingDialog, etc. - keep from original)
function TestQuestionInput({ question, value, onChange }: { question: any; value: any; onChange: (value: any) => void }) {
  const { data: mcOptions } = useQuery<any[]>({
    queryKey: ["/api/questions", question.id, "options"],
    enabled: question.type === "multiple_choice",
  });

  if (question.type === "multiple_choice") {
    return (
      <div className="space-y-3">
        {mcOptions?.map((opt) => (
          <div key={opt.id} className="flex items-start gap-3 p-3 rounded-lg border">
            <Checkbox checked={Array.isArray(value) && value.includes(opt.id)} onCheckedChange={(checked) => {
              const current = Array.isArray(value) ? value : [];
              onChange(checked ? [...current, opt.id] : current.filter((id: string) => id !== opt.id));
            }} />
            <label className="flex-1 text-sm">{opt.optionText}</label>
          </div>
        ))}
      </div>
    );
  } else if (question.type === "true_false") {
    return (
      <div className="space-y-2">
        {["true", "false"].map(v => (
          <label key={v} className="flex items-center gap-2"><input type="radio" checked={value === v} onChange={() => onChange(v)} /> {v === "true" ? "To'g'ri" : "Noto'g'ri"}</label>
        ))}
      </div>
    );
  } else if (question.type === "fill_blanks" || question.type === "short_answer") {
    return <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Javob..." />;
  } else if (question.type === "essay") {
    return <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Insho..." rows={5} />;
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
