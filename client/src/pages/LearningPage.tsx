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
import { PlayCircle, CheckCircle, FileText, ClipboardCheck, Lock, Home } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, Lesson, Assignment, Test } from "@shared/schema";

export default function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [submissionDialog, setSubmissionDialog] = useState<{ open: boolean; assignmentId: string | null }>({ open: false, assignmentId: null });
  const [submissionForm, setSubmissionForm] = useState({ content: "", fileUrl: "" });
  const [testDialog, setTestDialog] = useState<{ open: boolean; testId: string | null }>({ open: false, testId: null });
  const [testAnswers, setTestAnswers] = useState<Record<string, any>>({});

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

  const { data: testQuestions } = useQuery<any[]>({
    queryKey: ["/api/tests", testDialog.testId, "questions"],
    enabled: !!testDialog.testId && testDialog.open,
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
      await apiRequest("POST", `/api/assignments/${submissionDialog.assignmentId}/submit`, {
        content: submissionForm.content || null,
        fileUrl: submissionForm.fileUrl || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Vazifa topshirildi",
        description: "Natijani tez orada bilasiz",
      });
      setSubmissionDialog({ open: false, assignmentId: null });
      setSubmissionForm({ content: "", fileUrl: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Set first lesson as current when lessons load
  useEffect(() => {
    if (lessons && lessons.length > 0 && !currentLessonId) {
      setCurrentLessonId(lessons[0].id);
    }
  }, [lessons, currentLessonId]);

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
          <div className="ml-auto">
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

      <div className="flex flex-col lg:flex-row">
        {/* Lessons Sidebar */}
        <div className="lg:w-80 border-r bg-muted/30">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Darslar</h3>
            <div className="space-y-2">
              {lessons && lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">Darslar hali qo'shilmagan</p>
              ) : (
                lessons?.map((lesson) => {
                  const isEnrolled = enrollment?.paymentStatus === 'confirmed';
                  const isLocked = !lesson.isDemo && !isEnrolled;
                  
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => !isLocked && setCurrentLessonId(lesson.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isLocked 
                          ? 'opacity-60 cursor-not-allowed' 
                          : 'hover-elevate cursor-pointer'
                      } ${
                        currentLessonId === lesson.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                      }`}
                      data-testid={`lesson-item-${lesson.id}`}
                    >
                      {isLocked ? (
                        <Lock className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                      ) : (
                        <PlayCircle className={`w-5 h-5 flex-shrink-0 ${
                          currentLessonId === lesson.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium line-clamp-1 ${
                            currentLessonId === lesson.id ? 'text-primary' : ''
                          }`}>{lesson.title}</p>
                          {lesson.isDemo && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Demo</span>
                          )}
                        </div>
                        {lesson.duration && (
                          <p className="text-xs text-muted-foreground">{lesson.duration} daqiqa</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {currentLesson ? (
            (() => {
              const isEnrolled = enrollment?.paymentStatus === 'confirmed';
              const isLocked = !currentLesson.isDemo && !isEnrolled;
              
              if (isLocked) {
                return (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">Bu dars qulflangan</h3>
                      <p className="text-muted-foreground mb-4">
                        Bu darsni ko'rish uchun kursni sotib oling
                      </p>
                      <Button onClick={() => window.history.back()}>
                        Orqaga
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" data-testid="text-lesson-title">{currentLesson.title}</h2>
                    <p className="text-muted-foreground">
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
                      
                      // Check if it's an iframe embed code
                      if (videoContent.startsWith('<iframe') || videoContent.startsWith('<embed')) {
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
                          return (
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              data-testid="video-player"
                            />
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
      </div>

      {/* Submission Dialog */}
      <Dialog open={submissionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setSubmissionDialog({ open: false, assignmentId: null });
          setSubmissionForm({ content: "", fileUrl: "" });
        }
      }}>
        <DialogContent data-testid="dialog-submit-assignment">
          <DialogHeader>
            <DialogTitle>Vazifani Topshirish</DialogTitle>
            <DialogDescription>
              Vazifa javobingizni kiriting
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
              <Label htmlFor="submission-file">Fayl URL (ixtiyoriy)</Label>
              <Input
                id="submission-file"
                value={submissionForm.fileUrl}
                onChange={(e) => setSubmissionForm({ ...submissionForm, fileUrl: e.target.value })}
                placeholder="https://..."
                data-testid="input-submission-file"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmissionDialog({ open: false, assignmentId: null })}
              data-testid="button-cancel-submission"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => submitAssignmentMutation.mutate()}
              disabled={!submissionForm.content && !submissionForm.fileUrl || submitAssignmentMutation.isPending}
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
