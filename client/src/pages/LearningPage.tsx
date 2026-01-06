import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, CheckCircle, FileText, ClipboardCheck, Lock, Home, MessageCircle, Download, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { NotificationBell } from "@/components/NotificationBell";
import { StarRating } from "@/components/StarRating";
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
  const [youtubePlayClicked, setYoutubePlayClicked] = useState(false);

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

  const { data: lessons } = useQuery<Lesson[]>({
    queryKey: ["/api/courses", courseId, "lessons"],
    enabled: !!courseId && isAuthenticated,
  });

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

  // Set first lesson as current when lessons load
  useEffect(() => {
    if (lessons && lessons.length > 0 && !currentLessonId) {
      setCurrentLessonId(lessons[0].id);
    }
  }, [lessons, currentLessonId]);

  // Reset YouTube play state when lesson changes
  useEffect(() => {
    setYoutubePlayClicked(false);
  }, [currentLessonId]);

  if (authLoading || courseLoading) {
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

  const currentLesson = lessons?.find(l => l.id === currentLessonId);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-back-home"
          >
            <Home className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold line-clamp-1" data-testid="text-course-title">{course.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            {!isPreviewMode && enrollment && (enrollment.paymentStatus === 'confirmed' || enrollment.paymentStatus === 'approved') && (
              <Button
                variant="outline"
                onClick={() => setRatingDialog(true)}
                data-testid="button-rate-course"
              >
                <Star className="w-4 h-4 mr-2" />
                {userCourseRating ? "Baholash o'zgartirish" : "Kursni Baholash"}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleStartChat}
              data-testid="button-chat-instructor"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              O'qituvchiga Xabar
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

      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Main Content - Video Player Area */}
        <div className="flex-1 overflow-auto p-6 lg:p-8">
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
              const isLocked = !isPreviewMode && !currentLesson.isDemo && (!isEnrolled || !hasActiveSubscription);
              
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
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold mb-1" data-testid="text-lesson-title">{currentLesson.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {currentLesson.duration ? `Davomiyligi: ${currentLesson.duration} daqiqa` : ''}
                    </p>
                  </div>

                  {/* Video Player */}
                  <Card>
                    <CardContent className="p-0">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    {(() => {
                      const videoContent = currentLesson.videoUrl?.trim() || '';
                      
                      if (!videoContent) {
                        return (
                          <div className="text-white p-8 text-center flex items-center justify-center h-full">
                            <p>Video URL kiritilmagan</p>
                          </div>
                        );
                      }
                      
                      // Check if it's an iframe embed code - extract YouTube ID if present
                      if (videoContent.startsWith('<iframe') || videoContent.startsWith('<embed')) {
                        // Try to extract YouTube video ID from iframe src
                        const srcMatch = videoContent.match(/src=["']([^"']+)["']/i);
                        if (srcMatch && srcMatch[1]) {
                          const iframeSrc = srcMatch[1];
                          if (iframeSrc.includes('youtube.com/embed/')) {
                            const ytId = iframeSrc.split('youtube.com/embed/')[1]?.split(/[?&]/)[0];
                            if (ytId) {
                              const youtubeWatchUrl = `https://www.youtube.com/watch?v=${ytId}`;
                              const thumbnailUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
                              
                              if (!youtubePlayClicked) {
                                return (
                                  <div 
                                    className="relative w-full h-full cursor-pointer group"
                                    onClick={() => setYoutubePlayClicked(true)}
                                    data-testid="youtube-thumbnail"
                                  >
                                    <img 
                                      src={thumbnailUrl}
                                      alt={currentLesson.title}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
                                      </div>
                                    </div>
                                    <p className="absolute bottom-3 left-3 text-white text-xs bg-black/60 px-2 py-1 rounded">
                                      Bosing va videoni ko'ring
                                    </p>
                                  </div>
                                );
                              }
                              
                              return (
                                <div className="relative w-full h-full">
                                  <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    data-testid="video-player"
                                  />
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                                    <div className="flex items-center justify-between">
                                      <p className="text-white/80 text-xs">Video yuklanmayaptimi?</p>
                                      <a
                                        href={youtubeWatchUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"
                                      >
                                        <PlayCircle className="w-3 h-3" />
                                        YouTube'da ochish
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          }
                        }
                        
                        // Non-YouTube iframe - render as-is
                        return (
                          <div 
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: videoContent }}
                            data-testid="video-player"
                          />
                        );
                      }
                      
                      // Parse YouTube URLs
                      if (videoContent.includes('youtube.com') || videoContent.includes('youtu.be')) {
                        let videoId = '';
                        
                        // Extract video ID from different YouTube URL formats
                        if (videoContent.includes('youtube.com/watch?v=')) {
                          videoId = videoContent.split('watch?v=')[1]?.split('&')[0];
                        } else if (videoContent.includes('youtube.com/embed/')) {
                          videoId = videoContent.split('embed/')[1]?.split('?')[0];
                        } else if (videoContent.includes('youtu.be/')) {
                          videoId = videoContent.split('youtu.be/')[1]?.split('?')[0];
                        }
                        
                        if (videoId) {
                          const youtubeWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                          const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                          
                          // Click-to-play approach to bypass YouTube bot detection
                          if (!youtubePlayClicked) {
                            return (
                              <div 
                                className="relative w-full h-full cursor-pointer group"
                                onClick={() => setYoutubePlayClicked(true)}
                                data-testid="youtube-thumbnail"
                              >
                                <img 
                                  src={thumbnailUrl}
                                  alt={currentLesson.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to hqdefault if maxresdefault not available
                                    e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                  }}
                                />
                                {/* Play button overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <PlayCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
                                  </div>
                                </div>
                                <p className="absolute bottom-3 left-3 text-white text-xs bg-black/60 px-2 py-1 rounded">
                                  Bosing va videoni ko'ring
                                </p>
                              </div>
                            );
                          }
                          
                          // After click, load the iframe with autoplay
                          return (
                            <div className="relative w-full h-full">
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                                data-testid="video-player"
                              />
                              {/* Fallback overlay - shows if user has trouble */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-white/80 text-xs">Video yuklanmayaptimi?</p>
                                  <a
                                    href={youtubeWatchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1"
                                  >
                                    <PlayCircle className="w-3 h-3" />
                                    YouTube'da ochish
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // Check for Kinescope, Vimeo and other video platforms
                      if (videoContent.includes('kinescope.io') || 
                          videoContent.includes('vimeo.com') ||
                          videoContent.includes('player.vimeo.com') ||
                          videoContent.includes('dailymotion.com') ||
                          videoContent.includes('wistia.com')) {
                        return (
                          <iframe
                            src={videoContent}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            data-testid="video-player"
                          />
                        );
                      }
                      
                      // Try to treat as direct video URL or iframe src
                      // Check if it looks like a valid URL
                      if (videoContent.startsWith('http://') || videoContent.startsWith('https://')) {
                        return (
                          <iframe
                            src={videoContent}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            data-testid="video-player"
                          />
                        );
                      }
                      
                      // Default: show as link
                      return (
                        <div className="text-white p-8 text-center flex items-center justify-center h-full">
                          <div>
                            <p className="mb-4">Video format tanilmadi. Havola:</p>
                            <a 
                              href={currentLesson.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary underline break-all"
                              data-testid="video-link"
                            >
                              {currentLesson.videoUrl}
                            </a>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

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
                <TabsList>
                  <TabsTrigger value="overview" data-testid="tab-overview">Umumiy Ma'lumot</TabsTrigger>
                  <TabsTrigger value="assignments" data-testid="tab-assignments">Vazifalar</TabsTrigger>
                  <TabsTrigger value="tests" data-testid="tab-tests">Testlar</TabsTrigger>
                  <TabsTrigger value="results" data-testid="tab-results">Natijalar</TabsTrigger>
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
                  {assignments && assignments.filter(a => a.lessonId === currentLessonId).length > 0 ? (
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
                  ) : (
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
              </Tabs>
            </div>
          );
        })()
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

        {/* Lessons Sidebar - Right Side */}
        <div className="lg:w-96 border-l bg-muted/30 overflow-y-auto">
          <div className="p-4 sticky top-0 bg-muted/30 border-b z-10">
            <h3 className="font-semibold">Kurs Dasturi</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {lessons?.length || 0} ta dars
            </p>
          </div>
          <div className="p-4 space-y-2">
            {lessons && lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Darslar hali qo'shilmagan</p>
            ) : (
              lessons?.map((lesson, index) => {
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
                const isLocked = !isPreviewMode && !lesson.isDemo && (!isEnrolled || !hasActiveSubscription);
                
                // Check if lesson is completed
                const lessonProgressData = courseProgress?.find((p: any) => p.lessonId === lesson.id);
                const isCompleted = lessonProgressData?.completed || false;
                
                return (
                  <div
                    key={lesson.id}
                    onClick={() => !isLocked && setCurrentLessonId(lesson.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover-elevate cursor-pointer'
                    } ${
                      currentLessonId === lesson.id ? 'bg-primary/10 border-2 border-primary' : 'border-2 border-transparent'
                    }`}
                    data-testid={`lesson-item-${lesson.id}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-success" data-testid={`icon-lesson-${lesson.id}-completed`} />
                      ) : currentLessonId === lesson.id ? (
                        <PlayCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <p className={`text-sm font-medium line-clamp-2 flex-1 ${
                          currentLessonId === lesson.id ? 'text-primary' : ''
                        }`}>{lesson.title}</p>
                        {lesson.isDemo && (
                          <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded flex-shrink-0">
                            Demo
                          </span>
                        )}
                      </div>
                      {lesson.duration && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          {lesson.duration} daqiqa
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
