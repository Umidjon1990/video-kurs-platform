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
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId && isAuthenticated,
  });

  const { data: lessons, isLoading: lessonsLoading, isFetching: lessonsFetching } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
    enabled: !!courseId && isAuthenticated,
  });
  
  // Fetch course modules
  const { data: courseModules, isLoading: modulesLoading } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "modules"],
    enabled: !!courseId && isAuthenticated,
  });
  
  // Combined loading state - true if auth loading, query loading, or query hasn't started yet
  // Include modules loading to ensure proper grouping display
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

  // Fetch all lesson progress for the course (for sidebar indicators)
  const { data: courseProgress } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "progress"],
    enabled: !!courseId && isAuthenticated,
  });

  // Essay question and submission for current lesson
  const { data: essayQuestion } = useQuery<any>({
    queryKey: ["/api/lessons", currentLessonId, "essay-question"],
    enabled: !!currentLessonId,
  });

  const { data: essaySubmission, refetch: refetchEssaySubmission } = useQuery<any>({
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
  
  // Fetch all essay questions for the course (to show indicators in lesson list)
  const { data: courseEssayQuestions } = useQuery<any[]>({
    queryKey: ["/api/courses", courseId, "essay-questions"],
    enabled: !!courseId && isAuthenticated,
  });
  
  // Create a set of lesson IDs that have essay questions
  const lessonsWithEssay = new Set(courseEssayQuestions?.map((eq: any) => eq.lessonId) || []);

  // Centralized sorted lesson list - considers module order and lesson order within modules
  // This ensures consistent ordering for progress-based locking across sidebar and main content
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

  // Set initial rating when userCourseRating is loaded
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
    // Split by whitespace and filter out empty strings
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
      if (selectedRating < 1 || selectedRating > 5) {
        throw new Error("Rating 1 dan 5 gacha bo'lishi kerak");
      }
      const response = await apiRequest("POST", `/api/courses/${courseId}/rating`, {
        rating: selectedRating,
        review: reviewText || undefined,
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all rating-related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/public"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] }); // Course detail
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "rating/average"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "ratings"] });
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
        watchedSeconds: 0, // Basic implementation - just track completion
        totalSeconds: 0,
        lastPosition: 0,
        completed,
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", currentLessonId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] }); // FIXED: Sidebar progress
      queryClient.invalidateQueries({ queryKey: ["/api/student/progress"] });
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
      
      // Check if test has essay questions (score might be 0 for manual grading)
      const hasEssay = testQuestions?.some((q: any) => q.type === "essay");
      
      if (hasEssay && data.score === 0) {
        toast({
          title: "Test topshirildi",
          description: "Natijani tez orada bilib olasiz (insho qo'lda baholanadi)",
        });
      } else {
        const score = data.score ?? 0;
        const percentage = data.percentage ?? 0;
        toast({
          title: data.isPassed ? "Test muvaffaqiyatli o'tildi! ✅" : "Test topshirildi",
          description: `Sizning ballingiz: ${score} (${percentage.toFixed(0)}%)`,
          variant: data.isPassed ? "default" : "destructive",
        });
      }
      
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
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('assignmentId', submissionDialog.assignmentId);
      formData.append('content', submissionForm.content || '');
      
      // Add files
      submissionFiles.images.forEach(file => formData.append('images', file));
      submissionFiles.audio.forEach(file => formData.append('audios', file));
      submissionFiles.files.forEach(file => formData.append('files', file));
      
      // Upload using fetch directly (not apiRequest since it's FormData)
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
    // Navigate to chat page - it will handle conversation creation
    setLocation('/chat');
  };

  // Set first lesson as current when lessons load - use centralized ordering
  useEffect(() => {
    if (allSortedLessons.length > 0 && !currentLessonId) {
      setCurrentLessonId(allSortedLessons[0].id);
    }
  }, [allSortedLessons, currentLessonId]);

  // Auto-scroll to top when lesson changes on mobile & close mobile lessons drawer
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

  // Get current lesson - use centralized ordered list for consistency
  const effectiveCurrentLesson = currentLessonId 
    ? allSortedLessons.find(l => l.id === currentLessonId)
    : allSortedLessons[0];

  // Show loading until we have lessons AND a current lesson selected
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

  // Use effectiveCurrentLesson which is already calculated above
  const currentLesson = effectiveCurrentLesson;

  // Navigation helpers - use centralized allSortedLessons for consistent ordering
  const currentIndex = allSortedLessons.findIndex(l => l.id === currentLessonId);
  const navPrevLesson = currentIndex > 0 ? allSortedLessons[currentIndex - 1] : null;
  const navNextLesson = currentIndex >= 0 && currentIndex < allSortedLessons.length - 1 ? allSortedLessons[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header - hidden on mobile, shown on desktop */}
      <div className="border-b hidden sm:block">
        <div className="flex h-12 items-center px-4 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-back-home"
          >
            <Home className="w-4 h-4" />
          </Button>
          <h1 className="text-base font-semibold line-clamp-1 flex-1" data-testid="text-course-title">{course.title}</h1>
          <div className="flex items-center gap-1">
            {!isPreviewMode && enrollment && (enrollment.paymentStatus === 'confirmed' || enrollment.paymentStatus === 'approved') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRatingDialog(true)}
                data-testid="button-rate-course"
              >
                <Star className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartChat}
              data-testid="button-chat-instructor"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              Chiqish
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[100dvh] sm:h-[calc(100vh-3rem)]">
        {/* Main Content - Video Player Area */}
        <div className="flex-1 overflow-auto p-1 pb-20 sm:pb-4 sm:p-4 lg:p-6" ref={(el) => { mainContentRef.current = el; }}>
          {currentLesson ? (
            (() => {
              const isEnrolled = enrollment?.paymentStatus === 'confirmed' || enrollment?.paymentStatus === 'approved';
              
              // Check if subscription is active for this course
              const courseSubscription = userSubscriptions?.find(
                (sub: any) => sub.course.id === courseId
              );
              // Check both status AND endDate to ensure real-time expiration
              const now = new Date();
              const endDate = courseSubscription ? new Date(courseSubscription.subscription.endDate) : null;
              const hasActiveSubscription = courseSubscription?.subscription.status === 'active' && 
                                            endDate && endDate > now;
              
              // Lock lesson if not demo AND (not enrolled OR subscription expired) AND not in preview mode
              const isEnrollmentLocked = !isPreviewMode && !currentLesson.isDemo && (!isEnrolled || !hasActiveSubscription);
              
              const isLocked = isEnrollmentLocked;
              
              if (isLocked) {
                // Check if subscription expired
                const subscriptionExpired = isEnrolled && !hasActiveSubscription;
                
                return (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      {subscriptionExpired ? (
                        <>
                          <h3 className="text-xl font-semibold mb-2">Obuna muddati tugagan</h3>
                          <p className="text-muted-foreground mb-4">
                            Sizning obuna muddatingiz tugagan. Kursni davom ettirish uchun o'qituvchi bilan bog'laning.
                          </p>
                          {courseSubscription && (
                            <p className="text-sm text-destructive mb-4">
                              Tugash sanasi: {new Date(courseSubscription.subscription.endDate).toLocaleDateString('uz-UZ')}
                            </p>
                          )}
                          <div className="flex gap-2 justify-center">
                            <Button onClick={() => setLocation("/chat")} variant="default">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              O'qituvchiga xabar
                            </Button>
                            <Button onClick={() => window.history.back()} variant="outline">
                              Orqaga
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-semibold mb-2">Bu dars qulflangan</h3>
                          <p className="text-muted-foreground mb-4">
                            Bu darsni ko'rish uchun kursni sotib oling
                          </p>
                          <Button onClick={() => window.history.back()}>
                            Orqaga
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <div className="space-y-1 sm:space-y-2">
                  {/* Mobile-only modern compact header */}
                  <div className="flex sm:hidden items-center gap-2 py-2 px-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setLocation('/')}
                      className="shrink-0 h-9 w-9 rounded-full bg-muted/50"
                      data-testid="button-back-mobile"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" data-testid="text-lesson-title-mobile">
                        {currentLesson.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Dars {currentIndex + 1} / {allSortedLessons.length || 0}
                      </p>
                    </div>
                  </div>
                  
                  {/* Desktop lesson title */}
                  <div className="hidden sm:flex items-center gap-2 py-1">
                    <Badge variant="secondary" className="shrink-0 text-xs px-2">
                      {currentIndex + 1}/{allSortedLessons.length || 0}
                    </Badge>
                    <span className="text-sm font-medium truncate flex-1" data-testid="text-lesson-title">
                      {currentLesson.title}
                    </span>
                    {currentLesson.duration && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({currentLesson.duration} daq)
                      </span>
                    )}
                  </div>

                  {/* Video Player */}
                  <ModernVideoPlayer 
                    videoUrl={currentLesson.videoUrl || ''} 
                    title={currentLesson.title}
                  />

                  {/* Desktop Navigation - Below Video */}
                  <div className="hidden sm:flex items-center justify-between gap-2 py-2 px-1">
                    <Button
                      variant="outline"
                      onClick={() => navPrevLesson && setCurrentLessonId(navPrevLesson.id)}
                      disabled={!navPrevLesson}
                      className="flex-1 max-w-[150px]"
                      data-testid="button-prev-lesson-bottom"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1 shrink-0" />
                      Avvalgisi
                    </Button>
                    
                    <Badge variant="secondary" className="text-xs shrink-0 px-2">
                      {currentIndex + 1} / {allSortedLessons.length || 0}
                    </Badge>
                    
                    <Button
                      variant="default"
                      onClick={() => navNextLesson && setCurrentLessonId(navNextLesson.id)}
                      disabled={!navNextLesson}
                      className="flex-1 max-w-[150px]"
                      data-testid="button-next-lesson-bottom"
                    >
                      Keyingisi
                      <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
                    </Button>
                  </div>

              {/* Lesson Description */}
              {(currentLesson as any).description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Izoh</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="text-muted-foreground whitespace-pre-wrap select-none" 
                      data-testid="text-lesson-description"
                      onContextMenu={(e) => e.preventDefault()}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        WebkitTouchCallout: 'none'
                      }}
                    >
                      {(currentLesson as any).description}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PDF Resource */}
              {(currentLesson as any).pdfUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle>PDF Manba</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <a
                        href={(currentLesson as any).pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex-1"
                        data-testid="link-lesson-pdf"
                      >
                        PDF faylni ochish
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid="button-download-pdf"
                      >
                        <a
                          href={(currentLesson as any).pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Yuklab olish
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lesson Progress Tracking */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {lessonProgress?.completed ? (
                        <CheckCircle className="w-5 h-5 text-success" data-testid="icon-lesson-completed" />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-primary" data-testid="icon-lesson-in-progress" />
                      )}
                      <div>
                        <p className="font-medium">
                          {lessonProgress?.completed ? "Dars tugallangan ✓" : "Darsni ko'ring"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lessonProgress?.completed 
                            ? `Tugallangan: ${new Date(lessonProgress.completedAt).toLocaleDateString('uz-UZ')}`
                            : "Videoni ko'rib, darsni tugalladim deb belgilang"
                          }
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        if (currentLesson?.id) {
                          saveProgressMutation.mutate({
                            lessonId: currentLesson.id,
                            completed: !lessonProgress?.completed
                          });
                        }
                      }}
                      variant={lessonProgress?.completed ? "outline" : "default"}
                      disabled={saveProgressMutation.isPending}
                      data-testid="button-mark-lesson-complete"
                    >
                      {saveProgressMutation.isPending ? "Saqlanmoqda..." : 
                       lessonProgress?.completed ? "Bekor qilish" : "Darsni tugalladim"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview" data-testid="tab-overview">Umumiy Ma'lumot</TabsTrigger>
                  <TabsTrigger value="assignments" data-testid="tab-assignments">Vazifalar</TabsTrigger>
                  <TabsTrigger value="tests" data-testid="tab-tests">Testlar</TabsTrigger>
                  <TabsTrigger value="results" data-testid="tab-results">Natijalar</TabsTrigger>
                  <TabsTrigger value="group-chat" data-testid="tab-group-chat" className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    Guruh Suhbati
                  </TabsTrigger>
                  <TabsTrigger value="voice-chat" data-testid="tab-voice-chat" className="flex items-center gap-1">
                    <Volume2 className="h-4 w-4" />
                    Ovozli Suhbat
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Kurs Haqida</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{course.description || "Ma'lumot yo'q"}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-4">
                  {/* Regular Assignments */}
                  {assignments && assignments.filter(a => a.lessonId === currentLessonId).length > 0 && (
                    assignments.filter(a => a.lessonId === currentLessonId).map((assignment) => (
                      <Card key={assignment.id} data-testid={`assignment-card-${assignment.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                {assignment.title}
                              </CardTitle>
                              {assignment.description && (
                                <p className="text-sm text-muted-foreground mt-2">{assignment.description}</p>
                              )}
                            </div>
                            {assignment.maxScore && (
                              <span className="text-sm text-muted-foreground">Max: {assignment.maxScore} ball</span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => setSubmissionDialog({ open: true, assignmentId: assignment.id })}
                            data-testid={`button-submit-assignment-${assignment.id}`}
                          >
                            Vazifani Topshirish
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  
                  {/* Essay Question - shown in Assignments section */}
                  {essayQuestion && (
                    <Card data-testid="essay-question-card" className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                            Insho
                          </Badge>
                        </div>
                        <CardTitle className="flex items-center gap-2 mt-2">
                          <FileText className="w-5 h-5 text-amber-600" />
                          Arab Tili Inshosi
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          So'zlar soni: {essayQuestion.minWords} - {essayQuestion.maxWords}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Essay Question */}
                        <div className="p-4 bg-primary/5 border rounded-lg" dir="rtl">
                          <p className="text-lg font-arabic leading-relaxed" style={{ fontFamily: "'Scheherazade New', serif" }}>
                            {essayQuestion.questionText}
                          </p>
                        </div>

                        {/* Instructions */}
                        {essayQuestion.instructions && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Ko'rsatmalar:</strong> {essayQuestion.instructions}
                          </div>
                        )}

                        {/* Already submitted - show feedback if checked */}
                        {essaySubmission ? (
                          <div className="space-y-4">
                            {/* Show submitted text */}
                            <div className="p-4 border rounded-lg bg-muted/30" dir="rtl">
                              <Label className="block mb-2 text-left" dir="ltr">Sizning javobingiz:</Label>
                              <p className="font-arabic leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Scheherazade New', serif" }}>
                                {essaySubmission.essayText}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 text-left" dir="ltr">
                                So'zlar soni: {essaySubmission.wordCount}
                              </p>
                            </div>

                            {/* AI Feedback */}
                            {essaySubmission.aiChecked ? (
                              <Card className="border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                                      <CheckCircle className="w-5 h-5" />
                                      AI Tekshiruvi Natijalari
                                    </CardTitle>
                                    {essaySubmission.overallScore !== null && (
                                      <div className="flex items-center gap-2">
                                        <Badge variant={essaySubmission.overallScore >= 70 ? "default" : "secondary"} className="text-base px-3 py-1">
                                          Ball: {essaySubmission.overallScore}/100
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                                    <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap" style={{ fontFamily: 'inherit' }}>
                                      {essaySubmission.aiFeedback}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              <div className="flex flex-col gap-3">
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                  Inshongiz hali tekshirilmagan. AI tekshiruvini boshlang.
                                </p>
                                <Button
                                  onClick={() => checkEssayMutation.mutate(essaySubmission.id)}
                                  disabled={isCheckingEssay || checkEssayMutation.isPending}
                                  data-testid="button-check-essay"
                                >
                                  {isCheckingEssay || checkEssayMutation.isPending ? (
                                    <>
                                      <span className="animate-spin mr-2">⏳</span>
                                      Tekshirilmoqda...
                                    </>
                                  ) : (
                                    "AI bilan Tekshirish (1 marta)"
                                  )}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                  Diqqat: Har bir insho faqat 1 marta tekshirilishi mumkin!
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Essay input form */
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="essay-input">Javobingizni yozing (Arab tilida):</Label>
                              <Textarea
                                id="essay-input"
                                value={essayText}
                                onChange={handleEssayChange}
                                placeholder="...اكتب إجابتك هنا"
                                className="min-h-[200px] text-lg"
                                dir="rtl"
                                style={{ fontFamily: "'Scheherazade New', serif" }}
                                data-testid="input-essay-text"
                              />
                              <div className="flex justify-between mt-2 text-sm">
                                <span className={essayWordCount < essayQuestion.minWords ? "text-red-500" : "text-muted-foreground"}>
                                  So'zlar: {essayWordCount}
                                </span>
                                <span className="text-muted-foreground">
                                  Min: {essayQuestion.minWords} | Max: {essayQuestion.maxWords}
                                </span>
                              </div>
                            </div>

                            <Button
                              onClick={() => submitEssayMutation.mutate()}
                              disabled={
                                submitEssayMutation.isPending ||
                                essayWordCount < essayQuestion.minWords ||
                                essayWordCount > essayQuestion.maxWords
                              }
                              data-testid="button-submit-essay"
                            >
                              {submitEssayMutation.isPending ? "Yuklanmoqda..." : "Inshoni Yuborish"}
                            </Button>

                            {essayWordCount < essayQuestion.minWords && (
                              <p className="text-sm text-amber-600">
                                Kamida {essayQuestion.minWords} so'z yozing ({essayQuestion.minWords - essayWordCount} so'z qoldi)
                              </p>
                            )}
                            {essayWordCount > essayQuestion.maxWords && (
                              <p className="text-sm text-red-500">
                                Maksimal {essayQuestion.maxWords} so'z yozishingiz mumkin ({essayWordCount - essayQuestion.maxWords} so'z ortiqcha)
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Show message if no assignments and no essay */}
                  {(!assignments || assignments.filter(a => a.lessonId === currentLessonId).length === 0) && !essayQuestion && (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">Bu darsda vazifalar yo'q</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="tests" className="space-y-4">
                  {tests && tests.filter(t => t.lessonId === currentLessonId).length > 0 ? (
                    tests.filter(t => t.lessonId === currentLessonId).map((test) => (
                      <Card key={test.id} data-testid={`test-card-${test.id}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5" />
                            {test.title}
                          </CardTitle>
                          {test.passingScore && (
                            <p className="text-sm text-muted-foreground">O'tish bali: {test.passingScore}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={() => {
                              setTestDialog({ open: true, testId: test.id });
                              setTestAnswers({});
                            }}
                            data-testid={`button-start-test-${test.id}`}
                          >
                            Testni Boshlash
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="py-8">
                        <p className="text-center text-muted-foreground">Bu darsda testlar yo'q</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                  {(() => {
                    const currentLessonTests = tests?.filter(t => t.lessonId === currentLessonId).sort((a, b) => {
                      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                      return dateA - dateB;
                    }) || [];
                    const lessonTestsWithAttempts = currentLessonTests.map(test => {
                      const attempts = testAttempts?.filter((a: any) => a.testId === test.id) || [];
                      const bestAttempt = attempts.length > 0 
                        ? attempts.reduce((best: any, current: any) => 
                            current.score > best.score ? current : best
                          )
                        : null;
                      const worstAttempt = attempts.length > 0
                        ? attempts.reduce((worst: any, current: any) => 
                            current.score < worst.score ? current : worst
                          )
                        : null;
                      
                      const calculatePercentage = (attempt: any) => {
                        if (!attempt || !attempt.totalPoints || attempt.totalPoints === 0) return 0;
                        return Math.round((attempt.score / attempt.totalPoints) * 100);
                      };
                      
                      return { 
                        test, 
                        attempts, 
                        bestAttempt, 
                        worstAttempt,
                        bestPercentage: calculatePercentage(bestAttempt),
                        worstPercentage: calculatePercentage(worstAttempt),
                        attemptCount: attempts.length 
                      };
                    }).filter(item => item.attemptCount > 0);

                    return lessonTestsWithAttempts.length > 0 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>Bu Darsning Test Natijalari</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {lessonTestsWithAttempts.map(({ test, bestAttempt, worstAttempt, bestPercentage, worstPercentage, attemptCount }) => (
                              <div 
                                key={test.id} 
                                className="p-4 rounded-lg border"
                                data-testid={`result-item-${test.id}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex-1">
                                    <p className="font-medium">{test.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Urinishlar: {attemptCount} marta
                                    </p>
                                  </div>
                                  {bestAttempt?.isPassed ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <span className="text-sm text-destructive font-medium">O'tmadi</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{bestPercentage}%</p>
                                    <p className="text-xs text-muted-foreground mt-1">Eng yaxshi natija</p>
                                    <p className="text-sm mt-1">{bestAttempt?.score || 0} ball</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-600">{worstPercentage}%</p>
                                    <p className="text-xs text-muted-foreground mt-1">Eng yomon natija</p>
                                    <p className="text-sm mt-1">{worstAttempt?.score || 0} ball</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="py-8">
                          <p className="text-center text-muted-foreground">Bu darsda hali test topshirmadingiz</p>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="group-chat" className="space-y-4">
                  {/* Channel selector tabs */}
                  {myGroupData?.groupId && (
                    <div className="flex gap-2 border-b pb-2">
                      <Button
                        variant={chatChannel === 'general' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChatChannel('general')}
                        data-testid="button-channel-general"
                      >
                        Umumiy
                      </Button>
                      <Button
                        variant={chatChannel === 'group' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setChatChannel('group')}
                        data-testid="button-channel-group"
                      >
                        {myGroupData.groupName || "Mening guruhim"}
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3">
                      <CourseGroupChat 
                        courseId={courseId!} 
                        currentUserId={user?.id || ''}
                        currentUserRole={user?.role}
                        groupId={chatChannel === 'group' ? myGroupData?.groupId : null}
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <OnlineUsersList courseId={courseId!} />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="voice-chat" className="space-y-4">
                  <CourseVoiceChat 
                    courseId={courseId!} 
                    courseTitle={course.title}
                    currentUserId={user?.id || ''} 
                    userName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Foydalanuvchi')}
                  />
                </TabsContent>
              </Tabs>
                </div>
            )
          })()
      ) : isLessonsDataLoading ? (
            <Card>
              <CardContent className="py-16 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16">
                <p className="text-center text-muted-foreground">
                  Bu kursda hali darslar yo'q
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile Lessons Overlay */}
        {showMobileLessons && (
          <div className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-background" data-testid="mobile-lessons-overlay">
            <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <div>
                <h3 className="font-semibold">Kurs Dasturi</h3>
                <p className="text-sm text-muted-foreground">{lessons?.length || 0} ta dars</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileLessons(false)}
                data-testid="button-close-mobile-lessons"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
              {allSortedLessons.map((lesson, index) => {
                const isEnrolled = enrollment?.paymentStatus === 'confirmed' || enrollment?.paymentStatus === 'approved';
                const courseSubscription = userSubscriptions?.find((sub: any) => sub.course.id === courseId);
                const now = new Date();
                const endDate = courseSubscription ? new Date(courseSubscription.subscription.endDate) : null;
                const hasActiveSubscription = courseSubscription?.subscription.status === 'active' && endDate && endDate > now;
                const lessonProgressData = courseProgress?.find((p: any) => p.lessonId === lesson.id);
                const isCompleted = lessonProgressData?.completed || false;
                const isEnrollmentLocked = !isPreviewMode && !lesson.isDemo && (!isEnrolled || !hasActiveSubscription);
                const isLocked = isEnrollmentLocked;
                const isActive = currentLessonId === lesson.id;

                return (
                  <div
                    key={lesson.id}
                    onClick={() => !isLocked && setCurrentLessonId(lesson.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isLocked ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'active-elevate-2 cursor-pointer'
                    } ${isActive ? 'bg-primary/10 ring-2 ring-primary shadow-sm' : ''}`}
                    data-testid={`mobile-lesson-item-${lesson.id}`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      isLocked ? 'bg-muted' : isCompleted ? 'bg-green-500 dark:bg-green-600' : isActive ? 'bg-primary' : 'bg-muted/50'
                    }`}>
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : isActive ? (
                        <PlayCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold line-clamp-1 ${isActive ? 'text-primary' : ''}`}>{lesson.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {lesson.duration} daq
                          </span>
                        )}
                        {lesson.isDemo && (
                          <span className="text-[10px] font-semibold uppercase bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md">Bepul</span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-semibold uppercase bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> Tugatildi
                          </span>
                        )}
                      </div>
                    </div>
                    {!isLocked && isActive && (
                      <PlayCircle className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lessons Sidebar - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:block lg:w-96 border-l bg-muted/30 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-muted/30 border-b z-10">
            <h3 className="font-semibold">Kurs Dasturi</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {lessons?.length || 0} ta dars
            </p>
          </div>
          <div className="p-4 space-y-2">
            {isLessonsDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : lessons && lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Darslar hali qo'shilmagan</p>
            ) : (
              (() => {
                // Create a sorted lesson order list for progress-based locking
                // Use centralized lesson ordering (allSortedLessons is defined above)
                const sortedModules = courseModules?.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
                const lessonsWithoutModule = lessons?.filter((l: any) => !l.moduleId).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
                const lessonsWithOrphanedModule = lessons?.filter((l: any) => 
                  l.moduleId && !sortedModules.some((m: any) => m.id === l.moduleId)
                ).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
                const lessonsByModule: Record<string, Lesson[]> = {};
                
                sortedModules.forEach((module: any) => {
                  const moduleLessons = lessons?.filter((l: any) => l.moduleId === module.id).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
                  lessonsByModule[module.id] = moduleLessons;
                });
                
                let globalIndex = 0;
                
                // Fallback: if no modules available, render all lessons flat
                if (sortedModules.length === 0) {
                  return (
                    <>
                      {lessons?.map((lesson, index) => renderLessonItem(lesson, index + 1))}
                    </>
                  );
                }
                
                return (
                  <>
                    {/* Lessons without module first */}
                    {lessonsWithoutModule.map((lesson) => {
                      globalIndex++;
                      return renderLessonItem(lesson, globalIndex);
                    })}
                    
                    {/* Orphaned lessons (module deleted but lesson still has moduleId) */}
                    {lessonsWithOrphanedModule.map((lesson) => {
                      globalIndex++;
                      return renderLessonItem(lesson, globalIndex);
                    })}
                    
                    {/* Grouped by modules - Modern Design */}
                    {sortedModules.map((module: any, moduleIndex: number) => {
                      const moduleLessons = lessonsByModule[module.id] || [];
                      if (moduleLessons.length === 0) return null;
                      
                      const moduleLessonProgress = moduleLessons.map(l => 
                        courseProgress?.find((p: any) => p.lessonId === l.id)?.completed || false
                      );
                      const completedCount = moduleLessonProgress.filter(Boolean).length;
                      const progressPercent = Math.round((completedCount / moduleLessons.length) * 100);
                      const colors = moduleColors[moduleIndex % moduleColors.length];
                      const isExpanded = isModuleExpanded(module.id);
                      
                      return (
                        <div key={module.id} className="mb-4" data-testid={`module-group-${module.id}`}>
                          {/* Modern Module Header */}
                          <div 
                            onClick={() => toggleModule(module.id)}
                            className={`relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg border ${colors.border} bg-gradient-to-r ${colors.bg} backdrop-blur-sm`}
                            data-testid={`button-toggle-module-${module.id}`}
                          >
                            {/* Glassmorphism overlay */}
                            <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                            
                            <div className="relative p-4">
                              <div className="flex items-center justify-between gap-3">
                                {/* Left side: Badge + Title */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Module number badge */}
                                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors.badge} flex items-center justify-center shadow-lg`}>
                                    <span className="text-white font-bold text-lg">{moduleIndex + 1}</span>
                                  </div>
                                  
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                                        MODUL {moduleIndex + 1}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-bold truncate">{module.title}</h4>
                                    {module.description && (
                                      <p className="text-xs text-muted-foreground truncate mt-0.5">{module.description}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Right side: Progress + Chevron */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  {/* Circular Progress */}
                                  <div className="relative w-12 h-12">
                                    <svg className="w-12 h-12 transform -rotate-90">
                                      <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        className="text-muted/30"
                                      />
                                      <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                        strokeDasharray={`${progressPercent * 1.256} 126`}
                                        strokeLinecap="round"
                                        className={colors.text}
                                      />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-bold">{progressPercent}%</span>
                                    </div>
                                  </div>
                                  
                                  {/* Lesson count badge */}
                                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>{completedCount}/{moduleLessons.length}</span>
                                  </div>
                                  
                                  {/* Chevron */}
                                  <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Module Lessons - Accordion */}
                          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[2000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-1.5 pl-4 ml-6 border-l-2 border-dashed border-muted/50">
                              {moduleLessons.map((lesson) => {
                                globalIndex++;
                                return renderLessonItem(lesson, globalIndex, colors);
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
                
                function renderLessonItem(lesson: Lesson, index: number, colors?: typeof moduleColors[0]) {
                const isEnrolled = enrollment?.paymentStatus === 'confirmed' || enrollment?.paymentStatus === 'approved';
                
                // Check if subscription is active for this course
                const courseSubscription = userSubscriptions?.find(
                  (sub: any) => sub.course.id === courseId
                );
                // Check both status AND endDate to ensure real-time expiration
                const now = new Date();
                const endDate = courseSubscription ? new Date(courseSubscription.subscription.endDate) : null;
                const hasActiveSubscription = courseSubscription?.subscription.status === 'active' && 
                                              endDate && endDate > now;
                
                // Check if lesson is completed
                const lessonProgressData = courseProgress?.find((p: any) => p.lessonId === lesson.id);
                const isCompleted = lessonProgressData?.completed || false;
                
                const isEnrollmentLocked = !isPreviewMode && !lesson.isDemo && (!isEnrolled || !hasActiveSubscription);
                const isLocked = isEnrollmentLocked;
                
                const isActive = currentLessonId === lesson.id;
                
                return (
                  <div
                    key={lesson.id}
                    onClick={() => !isLocked && setCurrentLessonId(lesson.id)}
                    className={`group relative flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                      isLocked 
                        ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                        : 'hover-elevate cursor-pointer'
                    } ${
                      isActive 
                        ? `bg-gradient-to-r ${colors?.bg || 'from-primary/10 to-primary/5'} ring-2 ${colors?.ring || 'ring-primary'} shadow-sm` 
                        : ''
                    }`}
                    data-testid={`lesson-item-${lesson.id}`}
                  >
                    {/* Lesson number/status indicator */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isLocked 
                        ? 'bg-muted' 
                        : isCompleted 
                          ? 'bg-green-500 dark:bg-green-600 shadow-md shadow-green-500/30' 
                          : isActive 
                            ? `${colors?.badge || 'bg-primary'} shadow-md` 
                            : 'bg-muted/50'
                    }`}>
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" data-testid={`icon-lesson-${lesson.id}-completed`} />
                      ) : isActive ? (
                        <PlayCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{index}</span>
                      )}
                    </div>
                    
                    {/* Lesson info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-semibold line-clamp-1 ${
                          isActive ? (colors?.text || 'text-primary') : ''
                        }`}>{lesson.title}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.duration} daq
                          </span>
                        )}
                        {lesson.isDemo && (
                          <span className="text-[10px] font-semibold uppercase bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md">
                            Bepul
                          </span>
                        )}
                        {lessonsWithEssay.has(lesson.id) && (
                          <span className="text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <FileText className="w-2.5 h-2.5" /> Insho
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-semibold uppercase bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> Tugatildi
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Play indicator on hover */}
                    {!isLocked && !isActive && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className={`w-6 h-6 ${colors?.text || 'text-primary'}`} />
                      </div>
                    )}
                  </div>
                );
                }
              })()
            )}
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation - Modern Glass Design */}
      {currentLesson && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50">
          {/* Gradient backdrop blur effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl" />
          
          <div className="relative px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Dars</span>
                <span className="text-[10px] font-medium text-primary">
                  {currentIndex + 1} / {allSortedLessons.length || 0}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / (allSortedLessons.length || 1)) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navPrevLesson && setCurrentLessonId(navPrevLesson.id)}
                disabled={!navPrevLesson}
                className="flex-1 h-11 rounded-xl border-2 shadow-sm"
                data-testid="button-prev-lesson-mobile"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Oldingi</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowMobileLessons(true)}
                className="h-11 rounded-xl border-2 px-3"
                data-testid="button-show-lessons-mobile"
              >
                <List className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => navNextLesson && setCurrentLessonId(navNextLesson.id)}
                disabled={!navNextLesson}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/25"
                data-testid="button-next-lesson-mobile"
              >
                <span className="text-sm font-medium">Keyingi</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Dialog */}
      <Dialog open={submissionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setSubmissionDialog({ open: false, assignmentId: null });
          setSubmissionForm({ content: "" });
          setSubmissionFiles({ images: [], audio: [], files: [] });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-submit-assignment">
          <DialogHeader>
            <DialogTitle>Vazifani Topshirish</DialogTitle>
            <DialogDescription>
              Javobingizni kiriting va kerak bo'lsa fayllar yuklang (jami 5MB gacha)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="submission-content">Javob Matni</Label>
              <Textarea
                id="submission-content"
                value={submissionForm.content}
                onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
                placeholder="Javobingizni shu yerga yozing..."
                data-testid="input-submission-content"
                rows={5}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="submission-images">Rasmlar (ixtiyoriy)</Label>
              <Input
                id="submission-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSubmissionFiles({ ...submissionFiles, images: files });
                }}
                data-testid="input-submission-images"
              />
              {submissionFiles.images.length > 0 && (
                <p className="text-sm text-muted-foreground">{submissionFiles.images.length} ta rasm tanlandi</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission-audio">Audio fayllar (ixtiyoriy)</Label>
              <Input
                id="submission-audio"
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSubmissionFiles({ ...submissionFiles, audio: files });
                }}
                data-testid="input-submission-audio"
              />
              {submissionFiles.audio.length > 0 && (
                <p className="text-sm text-muted-foreground">{submissionFiles.audio.length} ta audio fayl tanlandi</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission-files">Boshqa fayllar (ixtiyoriy)</Label>
              <Input
                id="submission-files"
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSubmissionFiles({ ...submissionFiles, files });
                }}
                data-testid="input-submission-files"
              />
              {submissionFiles.files.length > 0 && (
                <p className="text-sm text-muted-foreground">{submissionFiles.files.length} ta fayl tanlandi</p>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              ⚠️ Barcha fayllar jami hajmi 5MB dan oshmasligi kerak
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSubmissionDialog({ open: false, assignmentId: null });
                setSubmissionForm({ content: "" });
                setSubmissionFiles({ images: [], audio: [], files: [] });
              }}
              data-testid="button-cancel-submission"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => submitAssignmentMutation.mutate()}
              disabled={!submissionForm.content && submissionFiles.images.length === 0 && submissionFiles.audio.length === 0 && submissionFiles.files.length === 0 || submitAssignmentMutation.isPending}
              data-testid="button-confirm-submission"
            >
              {submitAssignmentMutation.isPending ? "Topshirilmoqda..." : "Topshirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => {
        if (!open) {
          setTestDialog({ open: false, testId: null });
          setTestAnswers({});
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-take-test">
          <DialogHeader>
            <DialogTitle>Test Ishlash</DialogTitle>
            <DialogDescription>
              Barcha savollarga javob bering
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {testQuestions?.map((q, idx) => (
              <Card key={q.id} data-testid={`test-question-${q.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {q.questionText} <span className="text-sm text-muted-foreground">({q.points} ball)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TestQuestionInput
                    question={q}
                    value={testAnswers[q.id]}
                    onChange={(value) => setTestAnswers({ ...testAnswers, [q.id]: value })}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialog({ open: false, testId: null })}
              data-testid="button-cancel-test"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => submitTestMutation.mutate()}
              disabled={submitTestMutation.isPending}
              data-testid="button-submit-test"
            >
              {submitTestMutation.isPending ? "Topshirilmoqda..." : "Testni Topshirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <RatingDialog
        open={ratingDialog}
        onOpenChange={setRatingDialog}
        rating={selectedRating}
        onRatingChange={setSelectedRating}
        review={reviewText}
        onReviewChange={setReviewText}
        onSubmit={() => submitRatingMutation.mutate()}
        isPending={submitRatingMutation.isPending}
      />
    </div>
  );
}

function TestQuestionInput({ question, value, onChange }: { question: any; value: any; onChange: (value: any) => void }) {
  const { data: mcOptions, isLoading: optionsLoading } = useQuery<any[]>({
    queryKey: ["/api/questions", question.id, "options"],
    enabled: question.type === "multiple_choice",
  });

  if (question.type === "multiple_choice") {
    if (optionsLoading) {
      return <p className="text-sm text-muted-foreground">Variantlar yuklanmoqda...</p>;
    }
    
    if (!mcOptions || mcOptions.length === 0) {
      return <p className="text-sm text-muted-foreground">Variantlar mavjud emas</p>;
    }
    
    return (
      <div className="space-y-3">
        {mcOptions.map((opt) => (
          <div key={opt.id} className="flex items-start gap-3 p-3 rounded-lg border hover-elevate" data-testid={`option-${opt.id}`}>
            <Checkbox
              checked={Array.isArray(value) && value.includes(opt.id)}
              onCheckedChange={(checked) => {
                const current = Array.isArray(value) ? value : [];
                if (checked) {
                  onChange([...current, opt.id]);
                } else {
                  onChange(current.filter((id: string) => id !== opt.id));
                }
              }}
              data-testid={`checkbox-option-${opt.id}`}
            />
            <label className="flex-1 cursor-pointer text-sm leading-relaxed">
              {opt.optionText}
            </label>
          </div>
        ))}
      </div>
    );
  } else if (question.type === "true_false") {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value === "true"}
            onChange={() => onChange("true")}
            data-testid="radio-true"
          />
          <span>To'g'ri</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value === "false"}
            onChange={() => onChange("false")}
            data-testid="radio-false"
          />
          <span>Noto'g'ri</span>
        </label>
      </div>
    );
  } else if (question.type === "fill_blanks" || question.type === "short_answer") {
    return (
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Javobingizni kiriting..."
        data-testid="input-text-answer"
      />
    );
  } else if (question.type === "essay") {
    return (
      <Textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Javobingizni kiriting..."
        rows={5}
        data-testid="textarea-essay-answer"
      />
    );
  } else if (question.type === "matching") {
    const config = question.config as any;
    const leftColumn = config?.leftColumn || [];
    const rightColumn = config?.rightColumn || [];
    
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Chap va o'ng ustunlarni moslang</p>
        {leftColumn.map((leftItem: string, leftIdx: number) => (
          <div key={leftIdx} className="flex items-center gap-4">
            <div className="flex-1 p-2 border rounded">{leftItem}</div>
            <span>=</span>
            <select
              className="flex-1 p-2 border rounded"
              value={value?.[leftIdx]?.[1] ?? ""}
              onChange={(e) => {
                const current = Array.isArray(value) ? [...value] : [];
                if (e.target.value) {
                  current[leftIdx] = [leftIdx, parseInt(e.target.value)];
                  onChange(current);
                }
              }}
              data-testid={`select-match-${leftIdx}`}
            >
              <option value="">Tanlang...</option>
              {rightColumn.map((rightItem: string, rightIdx: number) => (
                <option key={rightIdx} value={rightIdx}>{rightItem}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }
  
  return null;
}

// Rating Dialog Component
function RatingDialog({
  open,
  onOpenChange,
  rating,
  onRatingChange,
  review,
  onReviewChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rating: number;
  onRatingChange: (rating: number) => void;
  review: string;
  onReviewChange: (review: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-rate-course">
        <DialogHeader>
          <DialogTitle>Kursni Baholash</DialogTitle>
          <DialogDescription>
            Fikringizni bizga bildiring. Bu boshqa talabalarga yordam beradi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bahoingiz *</Label>
            <div className="flex justify-center">
              <StarRating
                rating={rating}
                size={32}
                interactive={true}
                onRatingChange={onRatingChange}
              />
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 && "Yomon"}
                {rating === 2 && "Qoniqarsiz"}
                {rating === 3 && "O'rtacha"}
                {rating === 4 && "Yaxshi"}
                {rating === 5 && "Zo'r!"}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="review">Sharh (ixtiyoriy)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => onReviewChange(e.target.value)}
              placeholder="Kurs haqida fikringizni yozing..."
              rows={4}
              data-testid="textarea-review"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-testid="button-cancel-rating"
          >
            Bekor qilish
          </Button>
          <Button
            onClick={onSubmit}
            disabled={rating === 0 || isPending}
            data-testid="button-submit-rating"
          >
            {isPending ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
