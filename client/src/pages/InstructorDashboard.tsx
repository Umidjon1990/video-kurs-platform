import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus, Edit, Trash2, FileText, ClipboardCheck, Video, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Course, Lesson, Assignment, Test } from "@shared/schema";

export default function InstructorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    price: "",
    originalPrice: "",
    discountedPrice: "",
    thumbnailUrl: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    videoUrl: "",
    duration: "",
    isDemo: false,
  });

  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    maxScore: "",
    lessonId: "",
  });

  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [testForm, setTestForm] = useState({
    title: "",
    passingScore: "",
    lessonId: "",
  });

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionForm, setQuestionForm] = useState({
    type: "multiple_choice",
    questionText: "",
    points: "1",
    correctAnswer: "",
  });
  const [mcOptions, setMcOptions] = useState<{text: string, isCorrect: boolean}[]>([
    { text: "", isCorrect: false }
  ]);
  const [matchingPairs, setMatchingPairs] = useState<{left: string, right: string}[]>([
    { left: "", right: "" }
  ]);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradingForm, setGradingForm] = useState({
    score: "",
    feedback: "",
    status: "graded",
  });

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

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated,
  });

  const { data: lessons } = useQuery<Lesson[]>({
    queryKey: ["/api/instructor/courses", selectedCourse?.id, "lessons"],
    enabled: !!selectedCourse,
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["/api/instructor/courses", selectedCourse?.id, "assignments"],
    enabled: !!selectedCourse,
  });

  const { data: tests } = useQuery<Test[]>({
    queryKey: ["/api/instructor/courses", selectedCourse?.id, "tests"],
    enabled: !!selectedCourse,
  });

  const { data: submissions } = useQuery<any[]>({
    queryKey: ["/api/instructor/courses", selectedCourse?.id, "submissions"],
    enabled: !!selectedCourse,
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/instructor/courses", {
        ...courseForm,
        price: courseForm.discountedPrice || courseForm.price,
        originalPrice: courseForm.originalPrice,
        discountedPrice: courseForm.discountedPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      toast({ title: "Muvaffaqiyatli", description: "Kurs yaratildi" });
      setIsCreateCourseOpen(false);
      setCourseForm({ title: "", description: "", price: "", originalPrice: "", discountedPrice: "", thumbnailUrl: "" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) return;
      
      if (editingLesson) {
        // Update existing lesson
        await apiRequest("PATCH", `/api/instructor/lessons/${editingLesson.id}`, {
          ...lessonForm,
          duration: lessonForm.duration ? parseInt(lessonForm.duration) : null,
        });
      } else {
        // Create new lesson
        const nextOrder = (lessons?.length || 0) + 1;
        await apiRequest("POST", `/api/instructor/courses/${selectedCourse.id}/lessons`, {
          ...lessonForm,
          order: nextOrder,
          duration: lessonForm.duration ? parseInt(lessonForm.duration) : null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "lessons"] });
      toast({ 
        title: "Muvaffaqiyatli", 
        description: editingLesson ? "Dars yangilandi" : "Dars qo'shildi" 
      });
      setIsAddLessonOpen(false);
      setLessonForm({ title: "", videoUrl: "", duration: "", isDemo: false });
      setEditingLesson(null);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await apiRequest("DELETE", `/api/instructor/lessons/${lessonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "lessons"] });
      toast({ title: "Muvaffaqiyatli", description: "Dars o'chirildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Assignment mutations
  const addAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) return;
      
      if (editingAssignment) {
        await apiRequest("PATCH", `/api/instructor/assignments/${editingAssignment.id}`, {
          title: assignmentForm.title,
          description: assignmentForm.description || null,
          dueDate: assignmentForm.dueDate ? new Date(assignmentForm.dueDate) : null,
          maxScore: assignmentForm.maxScore ? parseInt(assignmentForm.maxScore) : null,
          lessonId: assignmentForm.lessonId || null,
        });
      } else {
        await apiRequest("POST", `/api/instructor/courses/${selectedCourse.id}/assignments`, {
          title: assignmentForm.title,
          description: assignmentForm.description || null,
          dueDate: assignmentForm.dueDate ? new Date(assignmentForm.dueDate) : null,
          maxScore: assignmentForm.maxScore ? parseInt(assignmentForm.maxScore) : null,
          lessonId: assignmentForm.lessonId || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "assignments"] });
      toast({ 
        title: "Muvaffaqiyatli", 
        description: editingAssignment ? "Vazifa yangilandi" : "Vazifa qo'shildi" 
      });
      setIsAddAssignmentOpen(false);
      setAssignmentForm({ title: "", description: "", dueDate: "", maxScore: "", lessonId: "" });
      setEditingAssignment(null);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest("DELETE", `/api/instructor/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "assignments"] });
      toast({ title: "Muvaffaqiyatli", description: "Vazifa o'chirildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Test mutations
  const addTestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) return;
      
      if (editingTest) {
        await apiRequest("PATCH", `/api/instructor/tests/${editingTest.id}`, {
          title: testForm.title,
          passingScore: testForm.passingScore ? parseInt(testForm.passingScore) : null,
          lessonId: testForm.lessonId || null,
        });
      } else {
        await apiRequest("POST", `/api/instructor/courses/${selectedCourse.id}/tests`, {
          title: testForm.title,
          passingScore: testForm.passingScore ? parseInt(testForm.passingScore) : null,
          lessonId: testForm.lessonId || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "tests"] });
      toast({ 
        title: "Muvaffaqiyatli", 
        description: editingTest ? "Test yangilandi" : "Test qo'shildi" 
      });
      setIsAddTestOpen(false);
      setTestForm({ title: "", passingScore: "", lessonId: "" });
      setEditingTest(null);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      await apiRequest("DELETE", `/api/instructor/tests/${testId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "tests"] });
      toast({ title: "Muvaffaqiyatli", description: "Test o'chirildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Question mutations
  const addQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTest) return;
      
      if (editingQuestion) {
        // UPDATE mode
        let config = {};
        if (questionForm.type === "matching") {
          const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
          const leftColumn = validPairs.map(p => p.left);
          const rightColumn = validPairs.map(p => p.right);
          const correctPairs = validPairs.map((_, i) => [i, i] as [number, number]);
          config = { leftColumn, rightColumn, correctPairs };
        }
        
        await apiRequest("PUT", `/api/instructor/questions/${editingQuestion.id}`, {
          type: questionForm.type,
          questionText: questionForm.questionText,
          points: parseInt(questionForm.points),
          correctAnswer: questionForm.correctAnswer || null,
          config,
        });
        
        // Update multiple choice options if needed
        if (questionForm.type === "multiple_choice") {
          // Delete old options
          const oldOptions = await fetch(`/api/instructor/questions/${editingQuestion.id}/options`).then(r => r.json());
          for (const opt of oldOptions) {
            await apiRequest("DELETE", `/api/instructor/questions/${editingQuestion.id}/options/${opt.id}`, {});
          }
          
          // Add new options
          for (let i = 0; i < mcOptions.length; i++) {
            const option = mcOptions[i];
            if (option.text.trim()) {
              await apiRequest("POST", `/api/instructor/questions/${editingQuestion.id}/options`, {
                optionText: option.text,
                isCorrect: option.isCorrect,
                order: i,
              });
            }
          }
        }
      } else {
        // CREATE mode
        const existingQuestions = await fetch(`/api/instructor/tests/${selectedTest.id}/questions`).then(r => r.json());
        const nextOrder = existingQuestions.length;
        
        let config = {};
        if (questionForm.type === "matching") {
          const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
          const leftColumn = validPairs.map(p => p.left);
          const rightColumn = validPairs.map(p => p.right);
          const correctPairs = validPairs.map((_, i) => [i, i] as [number, number]);
          config = { leftColumn, rightColumn, correctPairs };
        }
        
        const questionResponse = await apiRequest("POST", `/api/instructor/tests/${selectedTest.id}/questions`, {
          type: questionForm.type,
          questionText: questionForm.questionText,
          points: parseInt(questionForm.points),
          order: nextOrder,
          correctAnswer: questionForm.correctAnswer || null,
          config,
        });
        
        const createdQuestion: any = await questionResponse.json();
        
        if (questionForm.type === "multiple_choice" && createdQuestion?.id) {
          for (let i = 0; i < mcOptions.length; i++) {
            const option = mcOptions[i];
            if (option.text.trim()) {
              await apiRequest("POST", `/api/instructor/questions/${createdQuestion.id}/options`, {
                optionText: option.text,
                isCorrect: option.isCorrect,
                order: i,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/tests", selectedTest?.id, "questions"] });
      toast({ 
        title: "Muvaffaqiyatli", 
        description: editingQuestion ? "Savol yangilandi" : "Savol qo'shildi. Yana qo'shishingiz mumkin!" 
      });
      if (!editingQuestion) {
        // Faqat yangi savol qo'shganda dialog ochiq qoladi
        setQuestionForm({ type: "multiple_choice", questionText: "", points: "1", correctAnswer: "" });
        setMcOptions([{ text: "", isCorrect: false }]);
        setMatchingPairs([{ left: "", right: "" }]);
      } else {
        // Tahrirlashda dialog yopiladi
        setIsAddQuestionOpen(false);
        setEditingQuestion(null);
        setQuestionForm({ type: "multiple_choice", questionText: "", points: "1", correctAnswer: "" });
        setMcOptions([{ text: "", isCorrect: false }]);
        setMatchingPairs([{ left: "", right: "" }]);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const publishCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("PATCH", `/api/instructor/courses/${courseId}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      toast({ title: "Muvaffaqiyatli", description: "Kurs e'lon qilindi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const gradingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmission) return;
      await apiRequest("POST", `/api/instructor/submissions/${selectedSubmission.submission.id}/grade`, {
        grade: parseInt(gradingForm.score),
        feedback: gradingForm.feedback,
        status: gradingForm.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "submissions"] });
      toast({ title: "Muvaffaqiyatli", description: "Vazifa baholandi" });
      setIsGradingOpen(false);
      setGradingForm({ score: "", feedback: "", status: "graded" });
      setSelectedSubmission(null);
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  if (authLoading || coursesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-instructor-title">O'qituvchi Paneli</h1>
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

      <div className="p-8 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Mening Kurslarim</h2>
          <Button onClick={() => setIsCreateCourseOpen(true)} data-testid="button-create-course">
            <Plus className="w-4 h-4 mr-2" />
            Yangi Kurs
          </Button>
        </div>

        {courses && courses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-4">Hali kurslar yo'q</p>
              <Button onClick={() => setIsCreateCourseOpen(true)} data-testid="button-create-first-course">
                Birinchi Kursni Yaratish
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses?.map((course) => (
              <Card key={course.id} className="hover-elevate" data-testid={`card-course-${course.id}`}>
                <CardHeader>
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center mb-4">
                      <BookOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardTitle data-testid={`text-course-title-${course.id}`}>{course.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">${course.price}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.status === 'published' ? "E'lon qilingan" : "Qoralama"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCourse(course)}
                      data-testid={`button-manage-${course.id}`}
                    >
                      Boshqarish
                    </Button>
                    {course.status === 'draft' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => publishCourseMutation.mutate(course.id)}
                        data-testid={`button-publish-${course.id}`}
                      >
                        E'lon Qilish
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Course Management Dialog with Tabs */}
      {selectedCourse && (
        <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
          <DialogContent className="max-w-5xl max-h-[80vh]" data-testid="dialog-course-management">
            <DialogHeader>
              <DialogTitle>{selectedCourse.title} - Kursni Boshqarish</DialogTitle>
              <DialogDescription>Darslar, vazifalar va testlarni boshqarish</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="lessons" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="lessons" data-testid="tab-lessons">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Darslar
                </TabsTrigger>
                <TabsTrigger value="assignments" data-testid="tab-assignments">
                  <FileText className="w-4 h-4 mr-2" />
                  Vazifalar
                </TabsTrigger>
                <TabsTrigger value="tests" data-testid="tab-tests">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Testlar
                </TabsTrigger>
                <TabsTrigger value="submissions" data-testid="tab-submissions">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Yuborilganlar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {lessons && lessons.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Hali darslar yo'q</p>
                  ) : (
                    lessons?.map((lesson) => (
                      <Card key={lesson.id} data-testid={`lesson-${lesson.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{lesson.title}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {lesson.duration ? `${lesson.duration} daqiqa` : 'Davomiylik ko\'rsatilmagan'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingLesson(lesson);
                                  setLessonForm({
                                    title: lesson.title,
                                    videoUrl: lesson.videoUrl,
                                    duration: lesson.duration?.toString() || "",
                                    isDemo: lesson.isDemo || false,
                                  });
                                  setIsAddLessonOpen(true);
                                }}
                                data-testid={`button-edit-lesson-${lesson.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Darsni o'chirishga ishonchingiz komilmi?")) {
                                    deleteLessonMutation.mutate(lesson.id);
                                  }
                                }}
                                data-testid={`button-delete-lesson-${lesson.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))
                  )}
                </div>
                <Button onClick={() => setIsAddLessonOpen(true)} data-testid="button-add-lesson" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Dars Qo'shish
                </Button>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {assignments && assignments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Hali vazifalar yo'q</p>
                  ) : (
                    assignments?.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg gap-4"
                        data-testid={`assignment-${assignment.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{assignment.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{assignment.description}</p>
                          <span className="text-xs text-muted-foreground">
                            Max ball: {assignment.maxScore || 'Ko\'rsatilmagan'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingAssignment(assignment);
                              setAssignmentForm({
                                title: assignment.title,
                                description: assignment.description || "",
                                dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : "",
                                maxScore: assignment.maxScore?.toString() || "",
                                lessonId: assignment.lessonId || "",
                              });
                              setIsAddAssignmentOpen(true);
                            }}
                            data-testid={`button-edit-assignment-${assignment.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Vazifani o'chirishga ishonchingiz komilmi?")) {
                                deleteAssignmentMutation.mutate(assignment.id);
                              }
                            }}
                            data-testid={`button-delete-assignment-${assignment.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Button onClick={() => setIsAddAssignmentOpen(true)} data-testid="button-add-assignment" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Vazifa Qo'shish
                </Button>
              </TabsContent>

              <TabsContent value="tests" className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {lessons && lessons.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Avval dars yarating</p>
                  ) : (
                    lessons?.map((lesson) => (
                      <Card key={lesson.id} data-testid={`lesson-tests-${lesson.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{lesson.title}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {lesson.duration ? `${lesson.duration} daqiqa` : 'Davomiylik ko\'rsatilmagan'}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestForm({ title: "", passingScore: "", lessonId: lesson.id });
                                setEditingTest(null);
                                setIsAddTestOpen(true);
                              }}
                              data-testid={`button-add-test-for-lesson-${lesson.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Test Qo'shish
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          {tests?.filter(t => t.lessonId === lesson.id).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-2">Bu darsda hali test yo'q</p>
                          ) : (
                            tests?.filter(t => t.lessonId === lesson.id).map((test) => (
                              <Collapsible
                                key={test.id}
                                open={expandedTests.has(test.id)}
                                onOpenChange={(open) => {
                                  const newExpanded = new Set(expandedTests);
                                  if (open) {
                                    newExpanded.add(test.id);
                                  } else {
                                    newExpanded.delete(test.id);
                                  }
                                  setExpandedTests(newExpanded);
                                }}
                              >
                                <div className="border rounded-lg" data-testid={`test-${test.id}`}>
                                  <div className="flex items-center justify-between p-3 gap-4">
                                    <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedTests.has(test.id) ? 'rotate-180' : ''}`} />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-sm">{test.title}</h4>
                                        <span className="text-xs text-muted-foreground">
                                          O'tish bali: {test.passingScore || 'Ko\'rsatilmagan'}
                                        </span>
                                      </div>
                                    </CollapsibleTrigger>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTest(test);
                                          setQuestionForm({
                                            type: "multiple_choice",
                                            questionText: "",
                                            points: "1",
                                            correctAnswer: "",
                                          });
                                          setMcOptions([{ text: "", isCorrect: false }]);
                                          setMatchingPairs([{ left: "", right: "" }]);
                                          setIsAddQuestionOpen(true);
                                        }}
                                        data-testid={`button-add-question-${test.id}`}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Savol
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingTest(test);
                                          setTestForm({
                                            title: test.title,
                                            passingScore: test.passingScore?.toString() || "",
                                            lessonId: test.lessonId || "",
                                          });
                                          setIsAddTestOpen(true);
                                        }}
                                        data-testid={`button-edit-test-${test.id}`}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          if (confirm("Testni o'chirishga ishonchingiz komilmi?")) {
                                            deleteTestMutation.mutate(test.id);
                                          }
                                        }}
                                        data-testid={`button-delete-test-${test.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3 border-t pt-3">
                                      <QuestionsList 
                                        testId={test.id}
                                        setEditingQuestion={setEditingQuestion}
                                        setQuestionForm={setQuestionForm}
                                        setMcOptions={setMcOptions}
                                        setMatchingPairs={setMatchingPairs}
                                        setIsAddQuestionOpen={setIsAddQuestionOpen}
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="submissions" className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                  {!submissions || submissions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Hali vazifalar yuborilmagan</p>
                  ) : (
                    <div className="space-y-2">
                      {submissions.map((item: any) => (
                        <div
                          key={item.submission.id}
                          className="flex items-center justify-between p-4 border rounded-lg gap-4"
                          data-testid={`submission-${item.submission.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold">{item.assignment.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              O'quvchi: {item.user.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                item.submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                                item.submission.status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {item.submission.status === 'graded' ? 'Tekshirilgan' :
                                 item.submission.status === 'needs_revision' ? 'Qayta topshirish' :
                                 'Yangi'}
                              </span>
                              {item.submission.score !== null && (
                                <span className="text-sm font-medium">
                                  Ball: {item.submission.score}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSubmission(item);
                              setGradingForm({
                                score: item.submission.score?.toString() || "",
                                feedback: item.submission.feedback || "",
                                status: item.submission.status === 'graded' ? 'graded' : 'needs_revision',
                              });
                              setIsGradingOpen(true);
                            }}
                            data-testid={`button-grade-${item.submission.id}`}
                          >
                            Tekshirish
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Course Dialog */}
      <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
        <DialogContent data-testid="dialog-create-course">
          <DialogHeader>
            <DialogTitle>Yangi Kurs Yaratish</DialogTitle>
            <DialogDescription>Kurs ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Kurs Nomi</Label>
              <Input
                id="title"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="Masalan: Web Dasturlash Kursi"
                data-testid="input-course-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Kurs haqida ma'lumot..."
                data-testid="input-course-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Asl Narx ($)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={courseForm.originalPrice}
                  onChange={(e) => setCourseForm({ ...courseForm, originalPrice: e.target.value })}
                  placeholder="199.99"
                  data-testid="input-course-original-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountedPrice">Chegirmadagi Narx ($)</Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  value={courseForm.discountedPrice}
                  onChange={(e) => {
                    setCourseForm({ ...courseForm, discountedPrice: e.target.value, price: e.target.value });
                  }}
                  placeholder="99.99"
                  data-testid="input-course-discounted-price"
                />
                {courseForm.originalPrice && courseForm.discountedPrice && (
                  <p className="text-sm text-green-600 font-medium">
                    {Math.round(((parseFloat(courseForm.originalPrice) - parseFloat(courseForm.discountedPrice)) / parseFloat(courseForm.originalPrice)) * 100)}% chegirma
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Rasm URL (ixtiyoriy)</Label>
              <Input
                id="thumbnail"
                value={courseForm.thumbnailUrl}
                onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid="input-course-thumbnail"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateCourseOpen(false)}
              data-testid="button-cancel-create-course"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => createCourseMutation.mutate()}
              disabled={!courseForm.title || (!courseForm.price && !courseForm.discountedPrice) || createCourseMutation.isPending}
              data-testid="button-confirm-create-course"
            >
              {createCourseMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddLessonOpen} onOpenChange={(open) => {
        setIsAddLessonOpen(open);
        if (!open) {
          setEditingLesson(null);
          setLessonForm({ title: "", videoUrl: "", duration: "", isDemo: false });
        }
      }}>
        <DialogContent data-testid="dialog-add-lesson">
          <DialogHeader>
            <DialogTitle>
              {editingLesson ? "Darsni Tahrirlash" : "Yangi Dars Qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingLesson ? "Dars ma'lumotlarini yangilang" : "Dars ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Dars Nomi</Label>
              <Input
                id="lesson-title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Masalan: Kirish"
                data-testid="input-lesson-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL yoki Embed Kod</Label>
              <textarea
                id="video-url"
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                placeholder='URL: https://kinescope.io/watch/123
yoki Embed kod: <iframe src="..." ... ></iframe>'
                data-testid="input-lesson-video"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Kinescope yoki YouTube'dan embed kodni yoki to'g'ridan-to'g'ri linkni kiriting
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Davomiyligi (daqiqa)</Label>
              <Input
                id="duration"
                type="number"
                value={lessonForm.duration}
                onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                placeholder="15"
                data-testid="input-lesson-duration"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-demo"
                checked={lessonForm.isDemo}
                onCheckedChange={(checked) => setLessonForm({ ...lessonForm, isDemo: checked === true })}
                data-testid="checkbox-lesson-demo"
              />
              <Label htmlFor="is-demo" className="cursor-pointer">
                Bu sinov darsi (bepul ko'rish mumkin)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddLessonOpen(false)}
              data-testid="button-cancel-add-lesson"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => addLessonMutation.mutate()}
              disabled={!lessonForm.title || !lessonForm.videoUrl || addLessonMutation.isPending}
              data-testid="button-confirm-add-lesson"
            >
              {addLessonMutation.isPending 
                ? (editingLesson ? "Yangilanmoqda..." : "Qo'shilmoqda...") 
                : (editingLesson ? "Yangilash" : "Qo'shish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Assignment Dialog */}
      <Dialog open={isAddAssignmentOpen} onOpenChange={(open) => {
        setIsAddAssignmentOpen(open);
        if (!open) {
          setEditingAssignment(null);
          setAssignmentForm({ title: "", description: "", dueDate: "", maxScore: "", lessonId: "" });
        }
      }}>
        <DialogContent data-testid="dialog-add-assignment">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Vazifani Tahrirlash" : "Yangi Vazifa Qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment ? "Vazifa ma'lumotlarini yangilang" : "Vazifa ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignment-title">Vazifa Nomi</Label>
              <Input
                id="assignment-title"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                placeholder="Masalan: Birinchi topshiriq"
                data-testid="input-assignment-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-description">Tavsif</Label>
              <Textarea
                id="assignment-description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                placeholder="Vazifa tavsifi"
                data-testid="input-assignment-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-duedate">Topshirish sanasi</Label>
              <Input
                id="assignment-duedate"
                type="date"
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                data-testid="input-assignment-duedate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-maxscore">Maksimal Ball</Label>
              <Input
                id="assignment-maxscore"
                type="number"
                value={assignmentForm.maxScore}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, maxScore: e.target.value })}
                placeholder="100"
                data-testid="input-assignment-maxscore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-lesson">Darsni tanlang (ixtiyoriy)</Label>
              <Select 
                value={assignmentForm.lessonId} 
                onValueChange={(value) => setAssignmentForm({ ...assignmentForm, lessonId: value })}
              >
                <SelectTrigger data-testid="select-assignment-lesson">
                  <SelectValue placeholder="Darsni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanlanmagan</SelectItem>
                  {lessons?.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddAssignmentOpen(false)}
              data-testid="button-cancel-add-assignment"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => addAssignmentMutation.mutate()}
              disabled={!assignmentForm.title || addAssignmentMutation.isPending}
              data-testid="button-confirm-add-assignment"
            >
              {addAssignmentMutation.isPending 
                ? (editingAssignment ? "Yangilanmoqda..." : "Qo'shilmoqda...") 
                : (editingAssignment ? "Yangilash" : "Qo'shish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Test Dialog */}
      <Dialog open={isAddTestOpen} onOpenChange={(open) => {
        setIsAddTestOpen(open);
        if (!open) {
          setEditingTest(null);
          setTestForm({ title: "", passingScore: "", lessonId: "" });
        }
      }}>
        <DialogContent data-testid="dialog-add-test">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? "Testni Tahrirlash" : "Yangi Test Qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {editingTest ? "Test ma'lumotlarini yangilang" : "Test ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-title">Test Nomi</Label>
              <Input
                id="test-title"
                value={testForm.title}
                onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                placeholder="Masalan: 1-Modul testi"
                data-testid="input-test-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-passing-score">O'tish Bali</Label>
              <Input
                id="test-passing-score"
                type="number"
                value={testForm.passingScore}
                onChange={(e) => setTestForm({ ...testForm, passingScore: e.target.value })}
                placeholder="70"
                data-testid="input-test-passing-score"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-lesson">Darsni tanlang (ixtiyoriy)</Label>
              <Select 
                value={testForm.lessonId} 
                onValueChange={(value) => setTestForm({ ...testForm, lessonId: value })}
              >
                <SelectTrigger data-testid="select-test-lesson">
                  <SelectValue placeholder="Darsni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanlanmagan</SelectItem>
                  {lessons?.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTestOpen(false)}
              data-testid="button-cancel-add-test"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => addTestMutation.mutate()}
              disabled={!testForm.title || addTestMutation.isPending}
              data-testid="button-confirm-add-test"
            >
              {addTestMutation.isPending 
                ? (editingTest ? "Yangilanmoqda..." : "Qo'shilmoqda...") 
                : (editingTest ? "Yangilash" : "Qo'shish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent data-testid="dialog-add-question">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Savolni Tahrirlash" : "Savol Qo'shish"}</DialogTitle>
            <DialogDescription>
              Test: {selectedTest?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-type">Savol Turi</Label>
              <Select 
                value={questionForm.type} 
                onValueChange={(value) => setQuestionForm({ ...questionForm, type: value })}
              >
                <SelectTrigger data-testid="select-question-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Ko'p Tanlovli (Multiple Choice)</SelectItem>
                  <SelectItem value="true_false">To'g'ri/Noto'g'ri (True/False)</SelectItem>
                  <SelectItem value="fill_blanks">Bo'sh Joylarni To'ldirish (Fill in Blanks)</SelectItem>
                  <SelectItem value="matching">Moslashtirish (Matching)</SelectItem>
                  <SelectItem value="short_answer">Qisqa Javob (Short Answer)</SelectItem>
                  <SelectItem value="essay">Insho/Esse (Essay)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="question-text">Savol Matni</Label>
              <Textarea
                id="question-text"
                value={questionForm.questionText}
                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                placeholder="Savolingizni kiriting..."
                data-testid="input-question-text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-points">Ballar</Label>
              <Input
                id="question-points"
                type="number"
                value={questionForm.points}
                onChange={(e) => setQuestionForm({ ...questionForm, points: e.target.value })}
                placeholder="1"
                data-testid="input-question-points"
              />
            </div>

            {/* Multiple Choice Options */}
            {questionForm.type === "multiple_choice" && (
              <div className="space-y-2">
                <Label>Variantlar</Label>
                <div className="space-y-2">
                  {mcOptions.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...mcOptions];
                          newOptions[index].text = e.target.value;
                          setMcOptions(newOptions);
                        }}
                        placeholder={`Variant ${index + 1}`}
                        data-testid={`input-option-${index}`}
                      />
                      <label className="flex items-center gap-1 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={option.isCorrect}
                          onChange={(e) => {
                            const newOptions = [...mcOptions];
                            newOptions[index].isCorrect = e.target.checked;
                            setMcOptions(newOptions);
                          }}
                          data-testid={`checkbox-correct-${index}`}
                        />
                        <span className="text-sm">To'g'ri</span>
                      </label>
                      {mcOptions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMcOptions(mcOptions.filter((_, i) => i !== index))}
                          data-testid={`button-remove-option-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMcOptions([...mcOptions, { text: "", isCorrect: false }])}
                    data-testid="button-add-option"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Variant Qo'shish
                  </Button>
                </div>
              </div>
            )}

            {/* True/False Toggle */}
            {questionForm.type === "true_false" && (
              <div className="space-y-2">
                <Label>To'g'ri Javob</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trueFalseAnswer"
                      checked={questionForm.correctAnswer === "true"}
                      onChange={() => setQuestionForm({ ...questionForm, correctAnswer: "true" })}
                      data-testid="radio-true"
                    />
                    <span>To'g'ri (True)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trueFalseAnswer"
                      checked={questionForm.correctAnswer === "false"}
                      onChange={() => setQuestionForm({ ...questionForm, correctAnswer: "false" })}
                      data-testid="radio-false"
                    />
                    <span>Noto'g'ri (False)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Fill in Blanks & Short Answer */}
            {(questionForm.type === "short_answer" || questionForm.type === "fill_blanks") && (
              <div className="space-y-2">
                <Label htmlFor="correct-answer">To'g'ri Javob</Label>
                <Input
                  id="correct-answer"
                  value={questionForm.correctAnswer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  placeholder={questionForm.type === "fill_blanks" ? "Bo'sh joy to'ldirilishi kerak bo'lgan so'z" : "To'g'ri javob yoki kalit so'zlar"}
                  data-testid="input-correct-answer"
                />
              </div>
            )}

            {/* Matching Pairs */}
            {questionForm.type === "matching" && (
              <div className="space-y-2">
                <Label>Moslashtirish Juftliklari</Label>
                <div className="space-y-2">
                  {matchingPairs.map((pair, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <Input
                        value={pair.left}
                        onChange={(e) => {
                          const newPairs = [...matchingPairs];
                          newPairs[index].left = e.target.value;
                          setMatchingPairs(newPairs);
                        }}
                        placeholder="Chap tomon"
                        data-testid={`input-match-left-${index}`}
                      />
                      <div className="flex gap-2 items-center">
                        <Input
                          value={pair.right}
                          onChange={(e) => {
                            const newPairs = [...matchingPairs];
                            newPairs[index].right = e.target.value;
                            setMatchingPairs(newPairs);
                          }}
                          placeholder="O'ng tomon"
                          data-testid={`input-match-right-${index}`}
                        />
                        {matchingPairs.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMatchingPairs(matchingPairs.filter((_, i) => i !== index))}
                            data-testid={`button-remove-pair-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])}
                    data-testid="button-add-pair"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Juftlik Qo'shish
                  </Button>
                </div>
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-semibold mb-1">Eslatma:</p>
              <p className="text-muted-foreground">
                {questionForm.type === "multiple_choice" && "Kamida bitta to'g'ri variant belgilang"}
                {questionForm.type === "true_false" && "To'g'ri javobda 'true' yoki 'false' kiriting"}
                {questionForm.type === "fill_blanks" && "Bo'sh joylar uchun [___] belgisini ishlating"}
                {questionForm.type === "matching" && "Moslashtirish uchun elementlar keyinroq qo'shiladi"}
                {questionForm.type === "short_answer" && "Qisqa javobda kalit so'zlarni kiriting"}
                {questionForm.type === "essay" && "Insho uchun qo'lda baholash kerak bo'ladi"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddQuestionOpen(false);
                setEditingQuestion(null);
                setQuestionForm({ type: "multiple_choice", questionText: "", points: "1", correctAnswer: "" });
                setMcOptions([{ text: "", isCorrect: false }]);
                setMatchingPairs([{ left: "", right: "" }]);
              }}
              data-testid="button-cancel-add-question"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => addQuestionMutation.mutate()}
              disabled={!questionForm.questionText || addQuestionMutation.isPending}
              data-testid="button-confirm-add-question"
            >
              {addQuestionMutation.isPending 
                ? (editingQuestion ? "Yangilanmoqda..." : "Qo'shilmoqda...") 
                : (editingQuestion ? "Saqlash" : "Qo'shish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <GradingDialog
        open={isGradingOpen}
        onOpenChange={setIsGradingOpen}
        submission={selectedSubmission}
        gradingForm={gradingForm}
        setGradingForm={setGradingForm}
        onSubmit={() => gradingMutation.mutate()}
        isPending={gradingMutation.isPending}
      />
    </div>
  );
}

function QuestionsList({ 
  testId, 
  setEditingQuestion,
  setQuestionForm,
  setMcOptions,
  setMatchingPairs,
  setIsAddQuestionOpen 
}: { 
  testId: string;
  setEditingQuestion: (q: any) => void;
  setQuestionForm: (form: any) => void;
  setMcOptions: (options: any[]) => void;
  setMatchingPairs: (pairs: any[]) => void;
  setIsAddQuestionOpen: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const { data: questions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/instructor/tests", testId, "questions"],
    enabled: !!testId,
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      await apiRequest("DELETE", `/api/instructor/questions/${questionId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/tests", testId, "questions"] });
      toast({ title: "Muvaffaqiyatli", description: "Savol o'chirildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const questionTypeLabels: Record<string, string> = {
    multiple_choice: "Ko'p Tanlovli",
    true_false: "To'g'ri/Noto'g'ri",
    fill_blanks: "Bo'sh Joylarni To'ldirish",
    matching: "Moslashtirish",
    short_answer: "Qisqa Javob",
    essay: "Insho",
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>;
  }

  if (!questions || questions.length === 0) {
    return <p className="text-sm text-muted-foreground">Hali savollar yo'q</p>;
  }

  return (
    <div className="space-y-2">
      {questions.map((q: any, idx: number) => (
        <div key={q.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg" data-testid={`question-${q.id}`}>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold flex-shrink-0">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                {questionTypeLabels[q.type] || q.type}
              </span>
              <span className="text-xs text-muted-foreground">{q.points} ball</span>
            </div>
            <p className="text-sm">{q.questionText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                // Avval hamma ma'lumotlarni tozalaymiz
                setMcOptions([{ text: "", isCorrect: false }]);
                setMatchingPairs([{ left: "", right: "" }]);
                
                setEditingQuestion(q);
                setQuestionForm({
                  type: q.type,
                  questionText: q.questionText,
                  points: q.points.toString(),
                  correctAnswer: q.correctAnswer || "",
                });
                
                // Load options for multiple choice
                if (q.type === "multiple_choice") {
                  const options = await fetch(`/api/instructor/questions/${q.id}/options`).then(r => r.json());
                  setMcOptions(options.map((opt: any) => ({ text: opt.optionText, isCorrect: opt.isCorrect })));
                } else {
                  setMcOptions([{ text: "", isCorrect: false }]);
                }
                
                // Load matching pairs
                if (q.type === "matching" && q.config) {
                  const config = q.config as any;
                  const pairs = config.leftColumn.map((left: string, i: number) => ({
                    left,
                    right: config.rightColumn[i] || ""
                  }));
                  setMatchingPairs(pairs);
                } else {
                  setMatchingPairs([{ left: "", right: "" }]);
                }
                
                setIsAddQuestionOpen(true);
              }}
              data-testid={`button-edit-question-${q.id}`}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Savolni o'chirishga ishonchingiz komilmi?")) {
                  deleteQuestionMutation.mutate(q.id);
                }
              }}
              data-testid={`button-delete-question-${q.id}`}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function GradingDialog({ 
  open, 
  onOpenChange, 
  submission, 
  gradingForm, 
  setGradingForm, 
  onSubmit, 
  isPending 
}: any) {
  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-grading">
        <DialogHeader>
          <DialogTitle>Vazifani Tekshirish</DialogTitle>
          <DialogDescription>
            O'quvchi: {submission.user.name} | Vazifa: {submission.assignment.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Yuborilgan matn:</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {submission.submission.content || "Matn kiritilmagan"}
            </p>
          </div>

          {submission.submission.imageUrls && submission.submission.imageUrls.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Rasmlar:</h4>
              <div className="grid grid-cols-2 gap-2">
                {submission.submission.imageUrls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Image ${i + 1}`} className="rounded border w-full h-32 object-cover" />
                ))}
              </div>
            </div>
          )}

          {submission.submission.audioUrls && submission.submission.audioUrls.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Audio fayllar:</h4>
              {submission.submission.audioUrls.map((url: string, i: number) => (
                <audio key={i} controls className="w-full mb-2">
                  <source src={url} />
                </audio>
              ))}
            </div>
          )}

          {submission.submission.fileUrls && submission.submission.fileUrls.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Fayllar:</h4>
              {submission.submission.fileUrls.map((url: string, i: number) => (
                <a 
                  key={i} 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-sm text-primary hover:underline mb-1"
                >
                  📎 Fayl {i + 1}
                </a>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="score">Ball (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={gradingForm.score}
                onChange={(e) => setGradingForm({ ...gradingForm, score: e.target.value })}
                placeholder="85"
                data-testid="input-grade-score"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">Izoh</Label>
              <Textarea
                id="feedback"
                value={gradingForm.feedback}
                onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                placeholder="Yaxshi ish! Lekin..."
                rows={4}
                data-testid="input-grade-feedback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={gradingForm.status}
                onValueChange={(value) => setGradingForm({ ...gradingForm, status: value })}
              >
                <SelectTrigger data-testid="select-grade-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="graded">Tekshirilgan</SelectItem>
                  <SelectItem value="needs_revision">Qayta topshirish kerak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-grading"
          >
            Bekor qilish
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!gradingForm.score || !gradingForm.feedback || isPending}
            data-testid="button-submit-grading"
          >
            {isPending ? "Saqlanmoqda..." : "Baholash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
