import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { BookOpen, Plus, Edit, Trash2, FileText, ClipboardCheck, Video, ChevronDown, Eye, EyeOff, Download, Megaphone, Users, User, MessageCircle, TrendingUp, Award, Activity, Settings, UserCheck, Upload, FileSpreadsheet, Mic } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationBell } from "@/components/NotificationBell";
import { StarRating } from "@/components/StarRating";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Course, Lesson, Assignment, Test, InstructorCourseWithCounts, CourseAnalytics } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

function convertToDirectImageUrl(url: string): string {
  if (!url) return url;
  
  // Convert Google Drive share links to thumbnail API (better CORS support)
  // Format: https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
  // To: https://lh3.googleusercontent.com/d/{FILE_ID}
  const googleDriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (googleDriveMatch) {
    return `https://lh3.googleusercontent.com/d/${googleDriveMatch[1]}`;
  }
  
  // Also handle Google Drive uc links
  const googleDriveUcMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (googleDriveUcMatch) {
    return `https://lh3.googleusercontent.com/d/${googleDriveUcMatch[1]}`;
  }
  
  // Convert Dropbox links
  // Format: https://www.dropbox.com/s/{ID}/filename.jpg?dl=0
  // To: https://dl.dropboxusercontent.com/s/{ID}/filename.jpg
  const dropboxMatch = url.match(/dropbox\.com\/s\/([^?]+)/);
  if (dropboxMatch) {
    return `https://dl.dropboxusercontent.com/s/${dropboxMatch[1]}`;
  }
  
  return url;
}

export default function InstructorDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    author: "",
    category: "",
    price: "",
    discountPercentage: "0",
    thumbnailUrl: "",
    imageUrl: "",
    isFree: false,
    levelId: "",
    selectedResourceTypes: [] as string[],
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    videoUrl: "",
    description: "",
    pdfUrl: "",
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

  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    priority: "normal",
    targetType: "all",
    targetId: [] as string[],
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    telegramUsername: "",
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
  const [expandedAnalytics, setExpandedAnalytics] = useState<Set<string>>(new Set());

  // Test Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTestId, setImportTestId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{message: string, importedCount: number, errors: string[]} | null>(null);

  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [detailSubmission, setDetailSubmission] = useState<any | null>(null);
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

  const { data: courses, isLoading: coursesLoading } = useQuery<InstructorCourseWithCounts[]>({
    queryKey: ["/api/instructor/courses"],
    enabled: isAuthenticated,
  });
  
  const { data: subscriptionPlans } = useQuery<any[]>({
    queryKey: ["/api/subscription-plans"],
    enabled: isAuthenticated,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/chat/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 10000, // Poll every 10 seconds
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

  const { data: enrollments } = useQuery<any[]>({
    queryKey: ["/api/courses", selectedCourse?.id, "enrollments"],
    enabled: !!selectedCourse,
  });

  const { data: testAttempts } = useQuery<any[]>({
    queryKey: ["/api/instructor/courses", selectedCourse?.id, "test-attempts"],
    enabled: !!selectedCourse,
  });

  // Language levels and resource types for course filtering
  const { data: languageLevels } = useQuery<any[]>({
    queryKey: ["/api/language-levels"],
    enabled: isAuthenticated,
  });

  const { data: resourceTypes } = useQuery<any[]>({
    queryKey: ["/api/resource-types"],
    enabled: isAuthenticated,
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const method = editingCourse ? "PUT" : "POST";
      const url = editingCourse 
        ? `/api/instructor/courses/${editingCourse.id}` 
        : "/api/instructor/courses";
      
      // If course is free, skip price validation
      const priceValue = courseForm.isFree ? "0" : courseForm.price.trim();
      if (!courseForm.isFree && (!priceValue || isNaN(Number(priceValue)) || Number(priceValue) <= 0)) {
        throw new Error("Iltimos, to'g'ri narx kiriting");
      }
      
      const discountValue = courseForm.isFree ? "0" : courseForm.discountPercentage.trim();
      const discountNumber = Number(discountValue);
      if (!courseForm.isFree && discountValue && (isNaN(discountNumber) || discountNumber < 0 || discountNumber > 90)) {
        throw new Error("Chegirma 0-90 oralig'ida bo'lishi kerak");
      }
      
      // Build request payload
      const payload: any = {
        title: courseForm.title,
        description: courseForm.description,
        author: courseForm.author,
        category: courseForm.category,
        thumbnailUrl: courseForm.thumbnailUrl,
        imageUrl: courseForm.imageUrl,
        isFree: courseForm.isFree,
        levelId: courseForm.levelId || null,
      };
      
      // Only include pricing data for paid courses
      if (!courseForm.isFree) {
        payload.discountPercentage = discountNumber || 0;
        payload.pricing = {
          oddiy: priceValue,
          standard: priceValue,
          premium: priceValue,
        };
      }
      
      const response = await apiRequest(method, url, payload);
      const courseData = await response.json();
      
      // Get the course ID (from response for new courses, from editingCourse for updates)
      const courseId = courseData?.id || editingCourse?.id;
      
      // Set resource types for the course
      if (courseId) {
        await apiRequest("PUT", `/api/courses/${courseId}/resource-types`, {
          resourceTypeIds: courseForm.selectedResourceTypes,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses/public"] });
      toast({ 
        title: "Muvaffaqiyatli", 
        description: editingCourse ? "Kurs yangilandi" : "Kurs yaratildi" 
      });
      setIsCreateCourseOpen(false);
      setCourseForm({ title: "", description: "", author: "", category: "", price: "", discountPercentage: "0", thumbnailUrl: "", imageUrl: "", isFree: false, levelId: "", selectedResourceTypes: [] });
      setEditingCourse(null);
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

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/instructor/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      toast({ title: "Muvaffaqiyatli", description: "Kurs o'chirildi" });
      setDeletingCourse(null);
    },
    onError: (error: Error) => {
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
      setLessonForm({ title: "", videoUrl: "", description: "", pdfUrl: "", duration: "", isDemo: false });
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

  const unpublishCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("PATCH", `/api/instructor/courses/${courseId}/unpublish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      toast({ title: "Muvaffaqiyatli", description: "Kurs yashirildi" });
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

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      await apiRequest("DELETE", `/api/instructor/submissions/${submissionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses", selectedCourse?.id, "submissions"] });
      toast({ title: "Muvaffaqiyatli", description: "Vazifa o'chirildi" });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/instructor/announcements", data);
    },
    onSuccess: (data: any) => {
      setIsAnnouncementOpen(false);
      setAnnouncementForm({
        title: "",
        message: "",
        priority: "normal",
        targetType: "all",
        targetId: [],
      });
      toast({ 
        title: "E'lon yuborildi!", 
        description: `${data.recipientCount} kishiga yuborildi` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });
  
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/profile", settingsForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsSettingsOpen(false);
      toast({ 
        title: "Saqlandi", 
        description: "Sozlamalar muvaffaqiyatli yangilandi" 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  // Test Import mutation
  const importQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!importFile || !importTestId) return;
      
      const formData = new FormData();
      formData.append('file', importFile);
      
      const response = await fetch(`/api/instructor/tests/${importTestId}/import-questions`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      setImportResult(data);
      setImportFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/tests', importTestId, 'questions'] });
      
      if (data.errors && data.errors.length > 0) {
        toast({ 
          title: "Import yakunlandi (xatolar bilan)", 
          description: `${data.importedCount} ta savol yuklandi, ${data.errors.length} ta xato`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Muvaffaqiyatli!", 
          description: data.message 
        });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Import xatosi", description: error.message, variant: "destructive" });
    },
  });

  // Template download handlers
  const downloadTemplate = async (testId: string, type: 'blank' | 'sample') => {
    try {
      const response = await fetch(`/api/instructor/tests/${testId}/template?type=${type}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Template yuklab bo\'lmadi');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'sample' 
        ? `test-template-namuna-${testId}.xlsx`
        : `test-template-${testId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ 
        title: "Yuklab olindi", 
        description: type === 'sample' ? "Namuna template yuklab olindi" : "Bo'sh template yuklab olindi"
      });
    } catch (error: any) {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    }
  };
  
  // Load user settings when dialog opens
  useEffect(() => {
    if (isSettingsOpen && user) {
      setSettingsForm({
        telegramUsername: (user as any).telegramUsername || "",
      });
    }
  }, [isSettingsOpen, user]);

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
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              Sozlamalar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/instructor/subscriptions"}
              data-testid="button-subscriptions"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Obunalar
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/chat"}
              data-testid="button-chat"
              className="relative"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
              {unreadCount && unreadCount.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {unreadCount.count > 9 ? '9+' : unreadCount.count}
                </span>
              )}
            </Button>
            <NotificationBell 
              onNotificationAction={(notification) => {
                if (notification.type === 'assignment_submission' && notification.relatedId) {
                  // Find submission in current submissions
                  const submission = submissions?.find((s: any) => s.submission.id === notification.relatedId);
                  if (submission) {
                    // Check if already graded
                    if (submission.submission.status === 'pending') {
                      setSelectedSubmission(submission);
                      setGradingForm({ score: "", feedback: "", status: "graded" });
                      setIsGradingOpen(true);
                    } else {
                      // Already graded, show detail view
                      setDetailSubmission(submission);
                      setIsDetailViewOpen(true);
                    }
                  } else {
                    toast({ 
                      title: "Ogohlantirish", 
                      description: "Vazifani ko'rish uchun 'Vazifalar' tabga o'ting va kursni tanlang",
                      variant: "default"
                    });
                  }
                } else if (notification.type === 'chat_message' && notification.relatedId) {
                  // Navigate to chat with conversation ID
                  window.location.href = `/chat/${notification.relatedId}`;
                }
              }}
            />
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
          <div className="flex gap-2">
            <Button onClick={() => setIsAnnouncementOpen(true)} variant="outline" data-testid="button-announcement">
              <Megaphone className="w-4 h-4 mr-2" />
              E'lon Yuborish
            </Button>
            <Button onClick={() => setIsCreateCourseOpen(true)} data-testid="button-create-course">
              <Plus className="w-4 h-4 mr-2" />
              Yangi Kurs
            </Button>
          </div>
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
            {courses?.map((course, index) => {
              const discountPercent = (course as any).discountPercentage || 0;
              const basePrice = course.price ? Number(course.price) : 0;
              const displayPrice = discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;
              
              const isNew = course.createdAt 
                ? (Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24) <= 7 
                : false;
              const daysAgo = course.createdAt 
                ? Math.floor((Date.now() - new Date(course.createdAt).getTime()) / (1000 * 60 * 60 * 24)) 
                : 0;
              
              const gradients = [
                "from-blue-500 via-purple-500 to-pink-500",
                "from-green-500 via-teal-500 to-cyan-500",
                "from-orange-500 via-red-500 to-pink-500",
                "from-indigo-500 via-purple-500 to-fuchsia-500",
                "from-emerald-500 via-green-500 to-teal-500",
                "from-amber-500 via-orange-500 to-red-500",
              ];
              const gradient = gradients[index % gradients.length];
              
              const averageRating = (course as any).averageRating ?? 5.0;
              const totalRatings = (course as any).totalRatings ?? 0;

              const cardContent = (
                <Card 
                  key={course.id} 
                  className={`hover-elevate h-full flex flex-col ${discountPercent > 0 ? 'border-0' : ''}`}
                  data-testid={`card-course-${course.id}`}
                >
                  <CardHeader className="relative">
                    {isNew && (
                      <div className="absolute top-0 left-0 z-20 overflow-hidden w-32 h-32">
                        <div className="absolute transform -rotate-45 bg-green-500 text-white text-center font-bold py-1 left-[-35px] top-[25px] w-[170px] shadow-md">
                          <div className="text-xs">
                            YANGI
                            {daysAgo === 0 ? " (Bugun)" : ` (${daysAgo} kun)`}
                          </div>
                        </div>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-sm font-bold px-3 py-1">
                        -{discountPercent}% CHEGIRMA
                      </Badge>
                    )}
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-56 object-contain rounded-lg mb-4 bg-muted"
                      />
                    ) : (
                      <div className="w-full h-56 bg-muted rounded-lg flex items-center justify-center mb-4">
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle data-testid={`text-course-title-${course.id}`}>{course.title}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const existingPrice = course.price || (course as any).planPricing?.[0]?.price || "";
                            const existingDiscount = (course as any).discountPercentage || 0;
                            // Fetch resource types for this course
                            let courseResourceTypes: string[] = [];
                            try {
                              const response = await fetch(`/api/courses/${course.id}/resource-types`);
                              if (response.ok) {
                                const data = await response.json();
                                courseResourceTypes = data.map((rt: any) => rt.resourceTypeId);
                              }
                            } catch (e) {
                              console.error("Failed to fetch course resource types", e);
                            }
                            setCourseForm({
                              title: course.title,
                              description: course.description || "",
                              author: (course as any).author || "",
                              category: course.category || "",
                              price: existingPrice.toString(),
                              discountPercentage: existingDiscount.toString(),
                              thumbnailUrl: course.thumbnailUrl || "",
                              imageUrl: (course as any).imageUrl || "",
                              isFree: (course as any).isFree || false,
                              levelId: (course as any).levelId || "",
                              selectedResourceTypes: courseResourceTypes,
                            });
                            setEditingCourse(course);
                            setIsCreateCourseOpen(true);
                          }}
                          data-testid={`button-edit-${course.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingCourse(course);
                          }}
                          data-testid={`button-delete-${course.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    
                    {/* Star Rating and Student Count */}
                    <div className="flex items-center gap-3 pt-1">
                      <StarRating rating={averageRating} size={16} showValue={false} className="text-amber-400" />
                      <span className="text-xs text-muted-foreground">({totalRatings})</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="text-xs" data-testid={`text-enrollments-${course.id}`}>
                          {course.enrollmentsCount || 0}
                        </span>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4 text-muted-foreground" />
                        <span data-testid={`text-lessons-${course.id}`}>
                          {course.lessonsCount || 0} dars
                        </span>
                      </div>
                    </div>
                    
                    {/* Pricing by Plan */}
                    {course.planPricing && course.planPricing.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Tariflar:</p>
                        <div className="grid gap-2">
                          {course.planPricing.map((pricing) => (
                            <div 
                              key={pricing.id} 
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                              data-testid={`pricing-${course.id}-${pricing.plan.name}`}
                            >
                              <span className="text-sm font-medium">{pricing.plan.displayName}</span>
                              <span className="text-sm font-bold text-primary">
                                {Number(pricing.price).toLocaleString('uz-UZ')} so'm
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          {discountPercent > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold">
                                  {displayPrice.toLocaleString('uz-UZ')} so'm
                                </span>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                                  {discountPercent}% chegirma
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground line-through">
                                {basePrice.toLocaleString('uz-UZ')} so'm
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold">
                              {basePrice.toLocaleString('uz-UZ')} so'm
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between gap-2">
                      <Badge 
                        variant={course.status === 'published' ? 'default' : 'secondary'}
                        data-testid={`badge-status-${course.id}`}
                      >
                        {course.status === 'published' ? "E'lon qilingan" : "Qoralama"}
                      </Badge>
                      {course.status === 'draft' ? (
                        <Button
                          size="sm"
                          onClick={() => publishCourseMutation.mutate(course.id)}
                          data-testid={`button-publish-${course.id}`}
                        >
                          E'lon Qilish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unpublishCourseMutation.mutate(course.id)}
                          data-testid={`button-unpublish-${course.id}`}
                        >
                          <EyeOff className="w-4 h-4 mr-2" />
                          Yashirish
                        </Button>
                      )}
                    </div>
                    
                    {/* Analytics Panel - Collapsible */}
                    <Collapsible 
                      open={expandedAnalytics.has(course.id)}
                      onOpenChange={() => {
                        const newSet = new Set(expandedAnalytics);
                        if (newSet.has(course.id)) {
                          newSet.delete(course.id);
                        } else {
                          newSet.add(course.id);
                        }
                        setExpandedAnalytics(newSet);
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between"
                          data-testid={`button-analytics-${course.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Statistika
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedAnalytics.has(course.id) ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pt-4">
                        <CourseAnalyticsPanel courseId={course.id} />
                      </CollapsibleContent>
                    </Collapsible>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCourse(course)}
                        data-testid={`button-manage-${course.id}`}
                      >
                        Boshqarish
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/instructor/courses/${course.id}/speaking-tests`)}
                        data-testid={`button-speaking-tests-${course.id}`}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Speaking
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/learn/${course.id}`)}
                        data-testid={`button-preview-${course.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ko'rish
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {discountPercent > 0 ? (
                    <div className={`p-1 bg-gradient-to-br ${gradient} rounded-lg h-full`}>
                      {cardContent}
                    </div>
                  ) : (
                    cardContent
                  )}
                </motion.div>
              );
            })}
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
              <TabsList className="grid w-full grid-cols-5">
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
                <TabsTrigger value="students" data-testid="tab-students">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  O'quvchilar
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
                                    description: (lesson as any).description || "",
                                    pdfUrl: (lesson as any).pdfUrl || "",
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
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setImportTestId(test.id);
                                          setImportFile(null);
                                          setImportResult(null);
                                          setIsImportDialogOpen(true);
                                        }}
                                        data-testid={`button-import-questions-${test.id}`}
                                      >
                                        <Upload className="w-3 h-3 mr-1" />
                                        Import
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
                              O'quvchi: {item.user.name || item.user.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Email: {item.user.email}
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
                          <div className="flex items-center gap-2">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Bu vazifani o'chirmoqchimisiz?")) {
                                  deleteSubmissionMutation.mutate(item.submission.id);
                                }
                              }}
                              data-testid={`button-delete-submission-${item.submission.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="students" className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-4">
                  {!enrollments || enrollments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Hali o'quvchilar yo'q</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Yozilgan O'quvchilar</h3>
                        <div className="space-y-2">
                          {enrollments.map((enrollment: any) => (
                            <div
                              key={enrollment.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                              data-testid={`enrollment-${enrollment.id}`}
                            >
                              <div>
                                <p className="font-medium">{enrollment.user?.name || 'Noma\'lum'}</p>
                                <p className="text-sm text-muted-foreground">{enrollment.user?.email}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                enrollment.paymentStatus === 'confirmed' || enrollment.paymentStatus === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : enrollment.paymentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {enrollment.paymentStatus === 'confirmed' || enrollment.paymentStatus === 'approved' ? 'To\'langan' :
                                 enrollment.paymentStatus === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {testAttempts && testAttempts.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Test Natijalari</h3>
                          <div className="space-y-2">
                            {testAttempts.map((attempt: any) => (
                              <div
                                key={attempt.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                                data-testid={`attempt-${attempt.id}`}
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{attempt.user?.name || 'Noma\'lum'}</p>
                                  <p className="text-sm text-muted-foreground">{attempt.test?.title}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-medium">
                                      {attempt.score} / {attempt.totalPoints}
                                    </p>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      attempt.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {attempt.isPassed ? 'O\'tdi' : 'O\'tmadi'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Course Dialog */}
      <Dialog open={isCreateCourseOpen} onOpenChange={setIsCreateCourseOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col" data-testid="dialog-create-course">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Kursni Tahrirlash" : "Yangi Kurs Yaratish"}</DialogTitle>
            <DialogDescription>Kurs ma'lumotlarini {editingCourse ? "yangilang" : "kiriting"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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
            <div className="space-y-2">
              <Label htmlFor="author">Muallif Nomi (ixtiyoriy)</Label>
              <Input
                id="author"
                value={courseForm.author}
                onChange={(e) => setCourseForm({ ...courseForm, author: e.target.value })}
                placeholder="Masalan: Prof. Ali Aliyev"
                data-testid="input-course-author"
              />
              <p className="text-xs text-muted-foreground">
                Kurs sahifasida ko'rsatiladi. Bo'sh qolsa, sizning ismingiz ko'rinadi.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategoriya</Label>
              <Select
                value={courseForm.category}
                onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}
              >
                <SelectTrigger data-testid="select-course-category">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Design">Dizayn</SelectItem>
                  <SelectItem value="Business">Biznes</SelectItem>
                  <SelectItem value="Language">Til</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Language Level Selection */}
            <div className="space-y-2">
              <Label htmlFor="levelId">Til Darajasi (CEFR)</Label>
              <Select
                value={courseForm.levelId}
                onValueChange={(value) => setCourseForm({ ...courseForm, levelId: value })}
              >
                <SelectTrigger id="levelId" data-testid="select-course-level">
                  <SelectValue placeholder="Daraja tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {languageLevels?.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.code} - {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kurs qaysi til darajasi uchun mo'ljallanganligini tanlang
              </p>
            </div>
            
            {/* Resource Types Selection */}
            <div className="space-y-2">
              <Label>Resurs Turlari</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                {resourceTypes?.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                      courseForm.selectedResourceTypes.includes(type.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    }`}
                    onClick={() => {
                      const selected = courseForm.selectedResourceTypes;
                      if (selected.includes(type.id)) {
                        setCourseForm({
                          ...courseForm,
                          selectedResourceTypes: selected.filter((id) => id !== type.id),
                        });
                      } else {
                        setCourseForm({
                          ...courseForm,
                          selectedResourceTypes: [...selected, type.id],
                        });
                      }
                    }}
                    data-testid={`toggle-resource-type-${type.id}`}
                  >
                    <span className="text-sm">{type.nameUz || type.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Kurs qaysi turdagi kontentni o'z ichiga olishini tanlang (bir nechta tanlash mumkin)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Narxi (so'm) {courseForm.isFree && <span className="text-xs text-muted-foreground">(Bepul kurs uchun narx kiritish shart emas)</span>}</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                value={courseForm.isFree ? "0" : courseForm.price}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setCourseForm({ ...courseForm, price: value });
                }}
                placeholder={courseForm.isFree ? "Bepul kurs - 0 so'm" : "150000"}
                disabled={courseForm.isFree}
                data-testid="input-course-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Chegirma (%, 0-90 oralig'ida) {courseForm.isFree && <span className="text-xs text-muted-foreground">(Bepul kurs uchun chegirma kiritish shart emas)</span>}</Label>
              <Input
                id="discount"
                type="text"
                inputMode="numeric"
                value={courseForm.isFree ? "0" : courseForm.discountPercentage}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const numValue = Number(value);
                  if (value === '' || (numValue >= 0 && numValue <= 90)) {
                    setCourseForm({ ...courseForm, discountPercentage: value });
                  }
                }}
                placeholder={courseForm.isFree ? "Bepul kurs - 0%" : "0"}
                disabled={courseForm.isFree}
                data-testid="input-course-discount"
              />
              <p className="text-xs text-muted-foreground">
                {courseForm.isFree ? "Bepul kurs uchun chegirma berilmaydi" : "0 = chegirma yo'q, 20 = 20% chegirma"}
              </p>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/50">
              <Checkbox 
                id="isFree"
                checked={courseForm.isFree}
                onCheckedChange={(checked) => setCourseForm({ ...courseForm, isFree: checked === true })}
                data-testid="checkbox-course-free"
              />
              <div className="space-y-1">
                <Label htmlFor="isFree" className="text-base font-semibold cursor-pointer">
                  Bu kurs bepul
                </Label>
                <p className="text-xs text-muted-foreground">
                  Bepul kurslar bosh sahifada maxsus belgisi bilan ko'rsatiladi ⭐
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Thumbnail URL (ixtiyoriy)</Label>
              <Input
                id="thumbnail"
                value={courseForm.thumbnailUrl}
                onChange={(e) => setCourseForm({ ...courseForm, thumbnailUrl: e.target.value })}
                placeholder="https://example.com/thumbnail.jpg"
                data-testid="input-course-thumbnail"
              />
              <p className="text-xs text-muted-foreground">
                Kurs kartochkasi uchun kichik rasm
              </p>
              {courseForm.thumbnailUrl && (
                <div className="mt-2 border rounded-lg p-2 bg-muted">
                  <p className="text-xs font-medium mb-2">Preview:</p>
                  <img
                    src={convertToDirectImageUrl(courseForm.thumbnailUrl)}
                    alt="Thumbnail preview"
                    className="w-full h-56 object-contain rounded-lg bg-background"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.alt = 'Rasm yuklanmadi - URL noto\'g\'ri';
                      e.currentTarget.className = 'w-full h-56 flex items-center justify-center text-sm text-destructive';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Kurs Rasmi URL (ixtiyoriy)</Label>
              <Input
                id="imageUrl"
                value={courseForm.imageUrl}
                onChange={(e) => setCourseForm({ ...courseForm, imageUrl: e.target.value })}
                placeholder="https://example.com/course-image.jpg"
                data-testid="input-course-image"
              />
              <p className="text-xs text-muted-foreground">
                Kurs sahifasi uchun katta rasm (Dropbox, Google Drive qo'llab-quvvatlaydi)
              </p>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateCourseOpen(false);
                setEditingCourse(null);
                setCourseForm({ title: "", description: "", author: "", category: "", price: "", discountPercentage: "0", thumbnailUrl: "", imageUrl: "", isFree: false, levelId: "", selectedResourceTypes: [] });
              }}
              data-testid="button-cancel-create-course"
            >
              Bekor Qilish
            </Button>
            <Button
              onClick={() => createCourseMutation.mutate()}
              disabled={!courseForm.title || (!courseForm.isFree && (!courseForm.price || !courseForm.price.trim())) || createCourseMutation.isPending}
              data-testid="button-confirm-create-course"
            >
              {createCourseMutation.isPending 
                ? (editingCourse ? "Yangilanmoqda..." : "Yaratilmoqda...") 
                : (editingCourse ? "Yangilash" : "Yaratish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddLessonOpen} onOpenChange={(open) => {
        setIsAddLessonOpen(open);
        if (!open) {
          setEditingLesson(null);
          setLessonForm({ title: "", videoUrl: "", description: "", pdfUrl: "", duration: "", isDemo: false });
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
              <Label htmlFor="lesson-description">Izoh (ixtiyoriy)</Label>
              <Textarea
                id="lesson-description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Dars haqida qo'shimcha izoh..."
                data-testid="input-lesson-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdf-url">PDF Manba URL (ixtiyoriy)</Label>
              <Input
                id="pdf-url"
                value={lessonForm.pdfUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })}
                placeholder="https://drive.google.com/... yoki https://dropbox.com/..."
                data-testid="input-lesson-pdf"
              />
              <p className="text-xs text-muted-foreground">
                Google Drive, Dropbox yoki boshqa PDF faylga havola
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

      {/* Announcement Dialog */}
      <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
        <DialogContent data-testid="dialog-announcement">
          <DialogHeader>
            <DialogTitle>E'lon Yuborish</DialogTitle>
            <DialogDescription>
              O'quvchilarga muhim xabar yuboring
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Sarlavha</Label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                placeholder="E'lon sarlavhasi"
                data-testid="input-announcement-title"
              />
            </div>

            <div>
              <Label>Xabar</Label>
              <Textarea
                value={announcementForm.message}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                placeholder="Xabar matni..."
                rows={4}
                data-testid="input-announcement-message"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Muhimlik darajasi</Label>
                <Select
                  value={announcementForm.priority}
                  onValueChange={(value) => setAnnouncementForm({ ...announcementForm, priority: value })}
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Oddiy</SelectItem>
                    <SelectItem value="urgent">Muhim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Kimga yuborish</Label>
                <Select
                  value={announcementForm.targetType}
                  onValueChange={(value) => {
                    setAnnouncementForm({ 
                      ...announcementForm, 
                      targetType: value,
                      targetId: []
                    });
                  }}
                >
                  <SelectTrigger data-testid="select-target-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Barchaga
                      </div>
                    </SelectItem>
                    <SelectItem value="course">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Kurs o'quvchilariga
                      </div>
                    </SelectItem>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Yakka tartibda
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {announcementForm.targetType === 'course' && (
              <div>
                <Label>
                  Kurslarni tanlang 
                  {announcementForm.targetId.length > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({announcementForm.targetId.length} ta tanlandi)
                    </span>
                  )}
                </Label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2" data-testid="course-checkbox-list">
                  {courses?.map((course) => (
                    <div key={course.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`course-${course.id}`}
                        checked={announcementForm.targetId.includes(course.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAnnouncementForm({
                              ...announcementForm,
                              targetId: [...announcementForm.targetId, course.id]
                            });
                          } else {
                            setAnnouncementForm({
                              ...announcementForm,
                              targetId: announcementForm.targetId.filter(id => id !== course.id)
                            });
                          }
                        }}
                        data-testid={`checkbox-course-${course.id}`}
                      />
                      <label
                        htmlFor={`course-${course.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {course.title}
                      </label>
                    </div>
                  ))}
                  {(!courses || courses.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Hozircha kurslar yo'q
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAnnouncementOpen(false)}
              data-testid="button-cancel-announcement"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={() => sendAnnouncementMutation.mutate(announcementForm)}
              disabled={
                sendAnnouncementMutation.isPending || 
                !announcementForm.title || 
                !announcementForm.message ||
                (announcementForm.targetType === 'course' && announcementForm.targetId.length === 0)
              }
              data-testid="button-send-announcement"
            >
              {sendAnnouncementMutation.isPending ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent data-testid="dialog-settings">
          <DialogHeader>
            <DialogTitle>Sozlamalar</DialogTitle>
            <DialogDescription>
              Profil sozlamalarini yangilang
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="telegramUsername">Telegram Username</Label>
              <Input
                id="telegramUsername"
                value={settingsForm.telegramUsername}
                onChange={(e) => setSettingsForm({ ...settingsForm, telegramUsername: e.target.value })}
                placeholder="@username"
                data-testid="input-telegram-username"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O'quvchilar jonli darsga ulashish uchun @ bilan kiriting
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSettingsOpen(false)}
              data-testid="button-cancel-settings"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportResult(null);
        }
      }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-import-questions">
          <DialogHeader>
            <DialogTitle>Savollarni Excel'dan Yuklash</DialogTitle>
            <DialogDescription>
              Template yuklab oling, to'ldiring va import qiling
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Download Buttons */}
            <div className="space-y-2">
              <Label>1. Template yuklab olish</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => importTestId && downloadTemplate(importTestId, 'blank')}
                  disabled={!importTestId}
                  data-testid="button-download-blank-template"
                  className="flex-1"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Bo'sh Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => importTestId && downloadTemplate(importTestId, 'sample')}
                  disabled={!importTestId}
                  data-testid="button-download-sample-template"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Namuna bilan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bo'sh yoki namuna bilan to'ldirilgan template yuklab oling
              </p>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="import-file">2. To'ldirilgan faylni yuklang</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    setImportResult(null);
                  }
                }}
                data-testid="input-import-file"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  Tanlangan: {importFile.name}
                </p>
              )}
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-2">
                <Label>Natija:</Label>
                <div className={`p-4 rounded-lg border ${
                  importResult.errors.length > 0 ? 'bg-destructive/10 border-destructive' : 'bg-green-50 border-green-200'
                }`}>
                  <p className="font-medium mb-2">{importResult.message}</p>
                  {importResult.importedCount > 0 && (
                    <p className="text-sm text-green-600">
                      ✅ {importResult.importedCount} ta savol yuklandi
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      <p className="text-sm font-medium text-destructive">Xatolar:</p>
                      {importResult.errors.map((error, index) => (
                        <p key={index} className="text-xs text-destructive">• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Ko'rsatmalar:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>SavolID har bir savol uchun yagona bo'lishi kerak (Q1, Q2, ...)</li>
                <li>Variantli savollar (multiple_choice, matching) uchun bir necha qator kerak</li>
                <li>Turi: multiple_choice, true_false, fill_blanks, matching, short_answer, essay</li>
                <li>VariantTo'g'riMi: TRUE yoki FALSE (katta-kichik harflar muhim emas)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              data-testid="button-cancel-import"
            >
              {importResult ? 'Yopish' : 'Bekor qilish'}
            </Button>
            {!importResult && (
              <Button
                onClick={() => importQuestionsMutation.mutate()}
                disabled={!importFile || importQuestionsMutation.isPending}
                data-testid="button-submit-import"
              >
                {importQuestionsMutation.isPending ? "Yuklanmoqda..." : "Import Qilish"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submission Detail View Dialog */}
      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-submission-detail-instructor">
          <DialogHeader>
            <DialogTitle>Vazifa Detallari</DialogTitle>
          </DialogHeader>

          {detailSubmission && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">{detailSubmission.assignment?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  O'quvchi: {detailSubmission.user?.name || detailSubmission.user?.email}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="font-medium">Holat:</span>
                  <Badge 
                    className="ml-2"
                    variant={
                      detailSubmission.submission.status === 'graded' ? 'default' :
                      detailSubmission.submission.status === 'needs_revision' ? 'secondary' :
                      'outline'
                    }
                  >
                    {detailSubmission.submission.status === 'graded' ? '✅ Tekshirilgan' :
                     detailSubmission.submission.status === 'needs_revision' ? '⚠️ Qayta topshirish' :
                     '⏳ Kutilmoqda'}
                  </Badge>
                </div>
              </div>

              {detailSubmission.submission.score !== null && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Baho</p>
                  <p className="text-4xl font-bold text-primary">{detailSubmission.submission.score}</p>
                  <p className="text-sm text-muted-foreground mt-1">100 balldan</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">O'quvchi javobi:</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">{detailSubmission.submission.content || "Matn kiritilmagan"}</p>
                </div>
              </div>

              {detailSubmission.submission.imageUrls && detailSubmission.submission.imageUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Yuklangan rasmlar:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {detailSubmission.submission.imageUrls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Image ${i + 1}`} className="rounded border w-full h-32 object-cover" />
                    ))}
                  </div>
                </div>
              )}

              {detailSubmission.submission.audioUrls && detailSubmission.submission.audioUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Audio fayllar:</h4>
                  {detailSubmission.submission.audioUrls.map((url: string, i: number) => (
                    <audio key={i} controls className="w-full mb-2">
                      <source src={url} />
                    </audio>
                  ))}
                </div>
              )}

              {detailSubmission.submission.fileUrls && detailSubmission.submission.fileUrls.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Fayllar:</h4>
                  {detailSubmission.submission.fileUrls.map((url: string, i: number) => (
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

              {detailSubmission.submission.feedback && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Sizning izohingiz:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">{detailSubmission.submission.feedback}</p>
                  </div>
                </div>
              )}

              {detailSubmission.submission.submittedAt && (
                <div className="text-sm text-muted-foreground">
                  Topshirilgan vaqt: {new Date(detailSubmission.submission.submittedAt).toLocaleString('uz-UZ')}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailViewOpen(false);
                setDetailSubmission(null);
              }}
              data-testid="button-close-detail"
            >
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <DeleteCourseDialog
        course={deletingCourse}
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={() => deletingCourse && deleteCourseMutation.mutate(deletingCourse.id)}
        isPending={deleteCourseMutation.isPending}
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (!submission) return null;

  return (
    <>
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
                <div className="grid grid-cols-2 gap-3">
                  {submission.submission.imageUrls.map((url: string, i: number) => (
                    <div key={i} className="relative group">
                      <img 
                        src={url} 
                        alt={`Image ${i + 1}`} 
                        className="rounded border w-full h-48 object-cover cursor-pointer hover-elevate transition-all" 
                        onClick={() => setSelectedImage(url)}
                        data-testid={`image-submission-${i}`}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedImage(url)}
                          data-testid={`button-view-image-${i}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a 
                          href={url} 
                          download={`rasm-${i + 1}.jpg`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded bg-secondary hover-elevate text-secondary-foreground"
                          data-testid={`button-download-image-${i}`}
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
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
    
    <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="max-w-4xl p-2">
        <div className="relative w-full">
          <img 
            src={selectedImage || ''} 
            alt="To'liq rasm" 
            className="w-full h-auto max-h-[80vh] object-contain rounded"
            data-testid="image-fullview"
          />
          <div className="absolute top-4 right-4">
            <a 
              href={selectedImage || ''} 
              download="rasm.jpg"
              className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-background/90 hover-elevate text-foreground"
              data-testid="button-download-fullimage"
            >
              <Download className="h-5 w-5" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function DeleteCourseDialog({
  course,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-delete-course">
        <DialogHeader>
          <DialogTitle>Kursni o'chirish</DialogTitle>
          <DialogDescription>
            "{course?.title}" kursini o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-delete"
          >
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            data-testid="button-confirm-delete"
          >
            {isPending ? "O'chirilmoqda..." : "O'chirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseAnalyticsPanel({ courseId }: { courseId: string }) {
  const { data: analytics, isLoading } = useQuery<CourseAnalytics>({
    queryKey: ["/api/instructor/courses", courseId, "analytics"],
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Ma'lumot topilmadi
      </div>
    );
  }

  const totalEnrollments = analytics.enrollmentTrend.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4 border-t pt-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jami O'quvchilar</p>
                <p className="text-2xl font-bold">{analytics.totalStudents}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faol O'quvchilar</p>
                <p className="text-2xl font-bold">{analytics.activeStudents}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Tugatish darajasi</p>
            <span className="text-lg font-bold">{analytics.completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all" 
              style={{ width: `${Math.min(analytics.completionRate, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Test bali</p>
            </div>
            <p className="text-2xl font-bold">{analytics.averageTestScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Vazifa bali</p>
            </div>
            <p className="text-2xl font-bold">{analytics.averageAssignmentScore.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Trend Chart */}
      {totalEnrollments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ro'yxatdan o'tish tendensiyasi (14 kun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.enrollmentTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('uz-UZ')}
                  formatter={(value) => [`${value} o'quvchi`, 'Ro\'yxatdan o\'tganlar']}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
