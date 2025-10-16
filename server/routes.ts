// API routes with Replit Auth and Stripe integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isInstructor } from "./replitAuth";
import Stripe from "stripe";
import multer from "multer";
import { writeFile } from "fs/promises";
import { join } from "path";
import { ObjectStorageService } from "./objectStorage";
import {
  insertCourseSchema,
  insertLessonSchema,
  insertAssignmentSchema,
  insertTestSchema,
  insertEnrollmentSchema,
  insertSubmissionSchema,
  insertTestAttemptSchema,
  insertQuestionSchema,
  insertQuestionOptionSchema,
  insertNotificationSchema,
} from "@shared/schema";
import { z } from "zod";

// Grading schema
const gradingSchema = z.object({
  grade: z.number().min(0).max(100),
  feedback: z.string(),
  status: z.enum(['graded', 'needs_revision']),
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Object Storage setup
const objectStorage = new ObjectStorageService();

// File upload utility
async function uploadSubmissionFile(
  file: Express.Multer.File,
  folder: string
): Promise<string> {
  const timestamp = Date.now();
  const uniqueFilename = `${folder}/${timestamp}_${file.originalname}`;
  
  return await objectStorage.uploadToFolder(
    file.buffer,
    uniqueFilename,
    file.mimetype
  );
}

// Stripe setup
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware setup
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // File upload endpoint for payment receipts
  app.post('/api/upload-receipt', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi" });
      }

      // Validate file size (max 5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Fayl hajmi 5MB dan oshmasligi kerak" });
      }

      // SECURITY: Generate safe filename using UUID (no user input)
      const crypto = await import('crypto');
      const fileExt = req.file.mimetype.split('/')[1];
      const safeFileName = `receipt-${crypto.randomUUID()}.${fileExt}`;
      
      // Use ObjectStorageService to upload
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      const publicUrl = await objectStorage.uploadFile(
        req.file.buffer,
        safeFileName,
        req.file.mimetype
      );

      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Serve public receipt images
  app.get('/receipts/:fileName', async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      const file = await objectStorage.searchPublicObject(`receipts/${req.params.fileName}`);
      
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await objectStorage.downloadObject(file, res);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Error downloading file" });
    }
  });

  // ============ ADMIN ROUTES ============
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const instructors = await storage.getUsersByRole('instructor');
      const students = await storage.getUsersByRole('student');
      const admins = await storage.getUsersByRole('admin');
      res.json([...admins, ...instructors, ...students]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, role } = req.body;
      // This endpoint is for inviting users - actual user creation happens via Replit Auth
      res.json({ message: "User invitation sent", email, role });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/users/:userId/role', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const user = await storage.updateUserRole(userId, role);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/pending-payments', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingPayments = await storage.getPendingPayments();
      res.json(pendingPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/payments/:enrollmentId/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await storage.updateEnrollmentStatus(enrollmentId, 'approved');
      res.json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/payments/:enrollmentId/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { enrollmentId } = req.params;
      const enrollment = await storage.updateEnrollmentStatus(enrollmentId, 'rejected');
      res.json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ INSTRUCTOR ROUTES ============
  app.get('/api/instructor/courses', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const courses = await storage.getCoursesByInstructor(instructorId);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/courses', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const courseData = insertCourseSchema.parse({
        ...req.body,
        instructorId,
      });
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put('/api/instructor/courses/:courseId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Kurs topilmadi" });
      }
      if (course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }
      
      // SECURITY: Only allow editable fields - block instructorId, status, and other sensitive fields
      const editableFields = insertCourseSchema.pick({
        title: true,
        description: true,
        originalPrice: true,
        discountedPrice: true,
        thumbnailUrl: true,
      }).partial();
      
      const updateData = editableFields.parse(req.body);
      const updatedCourse = await storage.updateCourse(courseId, updateData);
      res.json(updatedCourse);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/courses/:courseId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Kurs topilmadi" });
      }
      if (course.instructorId !== instructorId) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }
      
      await storage.deleteCourse(courseId);
      res.json({ message: "Kurs o'chirildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/instructor/courses/:courseId/publish', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedCourse = await storage.updateCourseStatus(courseId, 'published');
      res.json(updatedCourse);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/instructor/courses/:courseId/lessons', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const lessons = await storage.getLessonsByCourse(courseId);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/courses/:courseId/lessons', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const lessonData = insertLessonSchema.parse({
        ...req.body,
        courseId,
      });
      const lesson = await storage.createLesson(lessonData);
      res.json(lesson);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/instructor/lessons/:lessonId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Get lesson and verify ownership
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      const course = await storage.getCourse(lesson.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedLesson = await storage.updateLesson(lessonId, req.body);
      res.json(updatedLesson);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/lessons/:lessonId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Get lesson and verify ownership
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      const course = await storage.getCourse(lesson.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      await storage.deleteLesson(lessonId);
      res.json({ message: "Lesson deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/instructor/courses/:courseId/assignments', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const assignments = await storage.getAssignmentsByCourse(courseId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/courses/:courseId/assignments', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        courseId,
        lessonId: req.body.lessonId === "none" ? null : req.body.lessonId,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      });
      const assignment = await storage.createAssignment(assignmentData);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/instructor/assignments/:assignmentId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const course = await storage.getCourse(assignment.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updateData = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      const updatedAssignment = await storage.updateAssignment(assignmentId, updateData);
      res.json(updatedAssignment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/assignments/:assignmentId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { assignmentId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const course = await storage.getCourse(assignment.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      await storage.deleteAssignment(assignmentId);
      res.json({ message: "Assignment deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/instructor/courses/:courseId/tests', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const tests = await storage.getTestsByCourse(courseId);
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/courses/:courseId/tests', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const testData = insertTestSchema.parse({
        ...req.body,
        courseId,
        lessonId: req.body.lessonId === "none" ? null : req.body.lessonId,
      });
      const test = await storage.createTest(testData);
      res.json(test);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/instructor/tests/:testId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedTest = await storage.updateTest(testId, req.body);
      res.json(updatedTest);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/tests/:testId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      await storage.deleteTest(testId);
      res.json({ message: "Test deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Questions API
  app.get('/api/instructor/tests/:testId/questions', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const questions = await storage.getQuestionsByTest(testId);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/tests/:testId/questions', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        testId,
      });
      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch('/api/instructor/questions/:questionId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const test = await storage.getTest(question.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const updatedQuestion = await storage.updateQuestion(questionId, req.body);
      res.json(updatedQuestion);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/questions/:questionId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const test = await storage.getTest(question.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      await storage.deleteQuestion(questionId);
      res.json({ message: "Question deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Question Options API
  app.get('/api/instructor/questions/:questionId/options', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const test = await storage.getTest(question.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const options = await storage.getQuestionOptionsByQuestion(questionId);
      res.json(options);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/questions/:questionId/options', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { questionId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const test = await storage.getTest(question.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const optionData = insertQuestionOptionSchema.parse({
        ...req.body,
        questionId,
      });
      const option = await storage.createQuestionOption(optionData);
      res.json(option);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/instructor/options/:optionId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { optionId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const option = await storage.getQuestionOption(optionId);
      if (!option) {
        return res.status(404).json({ message: "Option not found" });
      }
      
      const question = await storage.getQuestion(option.questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const test = await storage.getTest(question.testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      const course = await storage.getCourse(test.courseId);
      if (course?.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      await storage.deleteQuestionOption(optionId);
      res.json({ message: "Option deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ STUDENT ROUTES ============
  app.get('/api/courses', isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.getPublishedCourses();
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId', isAuthenticated, async (req, res) => {
    try {
      const { courseId } = req.params;
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/lessons', isAuthenticated, async (req, res) => {
    try {
      const { courseId } = req.params;
      const lessons = await storage.getLessonsByCourse(courseId);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/demo-lessons', isAuthenticated, async (req, res) => {
    try {
      const { courseId } = req.params;
      const demoLessons = await storage.getDemoLessonsByCourse(courseId);
      res.json(demoLessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/student/enrolled-courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courses = await storage.getEnrolledCourses(userId);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/student/enrollment/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
      res.json(enrollment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/student/enroll', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId, paymentMethod, paymentProofUrl, paymentIntentId } = req.body;
      
      // Manual payment (naqd/karta)
      if (paymentMethod && (paymentMethod === 'naqd' || paymentMethod === 'karta')) {
        if (!paymentProofUrl) {
          return res.status(400).json({ message: "To'lov cheki rasmi talab qilinadi" });
        }
        
        const enrollmentData = insertEnrollmentSchema.parse({
          userId,
          courseId,
          paymentMethod,
          paymentProofUrl,
          paymentStatus: 'pending', // Admin tasdiqini kutadi
        });
        
        const enrollment = await storage.createEnrollment(enrollmentData);
        return res.json(enrollment);
      }
      
      // Stripe payment
      if (!stripe) {
        return res.status(500).json({ message: "Stripe kalitlari sozlanmagan. Iltimos adminstratorga murojaat qiling." });
      }
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID required" });
      }
      
      // SECURITY: Verify payment was successful
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not completed" });
      }
      
      // Verify payment is for this course and user
      if (paymentIntent.metadata.courseId !== courseId || paymentIntent.metadata.userId !== userId) {
        return res.status(400).json({ message: "Invalid payment" });
      }
      
      const enrollmentData = insertEnrollmentSchema.parse({
        userId,
        courseId,
        paymentMethod: 'stripe',
        paymentStatus: 'approved', // Stripe auto-approved
      });
      
      const enrollment = await storage.createEnrollment(enrollmentData);
      res.json(enrollment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get test questions (student - for taking test) - SANITIZED (no correct answers)
  app.get('/api/tests/:testId/questions', isAuthenticated, async (req, res) => {
    try {
      const { testId } = req.params;
      const questions = await storage.getQuestionsByTest(testId);
      
      // Remove correct answers and sensitive config
      const sanitizedQuestions = questions.map((q: any) => ({
        id: q.id,
        testId: q.testId,
        type: q.type,
        questionText: q.questionText,
        points: q.points,
        order: q.order,
        mediaUrl: q.mediaUrl,
        // Remove correctAnswer
        // Sanitize config for matching (remove correctPairs)
        config: q.type === 'matching' ? {
          leftColumn: (q.config as any)?.leftColumn || [],
          rightColumn: (q.config as any)?.rightColumn || [],
          // correctPairs removed
        } : (q.config || {}),
      }));
      
      res.json(sanitizedQuestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get question options (student - for taking test) - SANITIZED (no isCorrect)
  app.get('/api/questions/:questionId/options', isAuthenticated, async (req, res) => {
    try {
      const { questionId } = req.params;
      const options = await storage.getQuestionOptionsByQuestion(questionId);
      
      // Remove isCorrect flag
      const sanitizedOptions = options.map((o: any) => ({
        id: o.id,
        questionId: o.questionId,
        optionText: o.optionText,
        order: o.order,
        // isCorrect removed
      }));
      
      res.json(sanitizedOptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get student test attempts (results)
  app.get('/api/student/test-attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attempts = await storage.getTestAttemptsByUser(userId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  //Test attempt submission (student)
  app.post('/api/student/tests/:testId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { testId } = req.params;
      const { answers } = req.body;
      
      // Get test and questions
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test topilmadi" });
      }
      
      const questions = await storage.getQuestionsByTest(testId);
      
      // Calculate score (auto-grading)
      let totalScore = 0;
      let totalPoints = 0;
      
      for (const question of questions) {
        totalPoints += question.points;
        const studentAnswer = answers[question.id];
        
        // Skip if no answer or empty array
        if (!studentAnswer || (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
          continue;
        }
        
        // Auto-grading logic based on question type
        if (question.type === 'multiple_choice') {
          const options = await storage.getQuestionOptionsByQuestion(question.id);
          const correctOptions = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
          const studentOptions = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
          
          if (JSON.stringify(correctOptions.sort()) === JSON.stringify(studentOptions.sort())) {
            totalScore += question.points;
          }
        } else if (question.type === 'true_false') {
          if (studentAnswer === question.correctAnswer) {
            totalScore += question.points;
          }
        } else if (question.type === 'fill_blanks') {
          if (studentAnswer.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()) {
            totalScore += question.points;
          }
        } else if (question.type === 'matching') {
          const config = question.config as any;
          const correctPairs = config.correctPairs || [];
          const studentPairs = studentAnswer;
          
          if (JSON.stringify(correctPairs.sort()) === JSON.stringify(studentPairs.sort())) {
            totalScore += question.points;
          }
        } else if (question.type === 'short_answer') {
          const keywords = question.correctAnswer?.toLowerCase().split(',').map(k => k.trim()) || [];
          const studentText = studentAnswer.toLowerCase();
          const matchedKeywords = keywords.filter(k => studentText.includes(k));
          
          if (matchedKeywords.length >= keywords.length * 0.5) {
            totalScore += question.points;
          }
        }
        // Essay: manual grading required (score = 0 for now)
      }
      
      const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
      const isPassed = test.passingScore ? percentage >= test.passingScore : false;
      
      const attemptData = insertTestAttemptSchema.parse({
        testId,
        userId,
        answers: JSON.stringify(answers),
        score: totalScore,
        totalPoints,
        isPassed,
      });
      
      const attempt = await storage.createTestAttempt(attemptData);
      res.json({ 
        ...attempt, 
        score: totalScore,
        percentage,
        isPassed 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/assignments', isAuthenticated, async (req, res) => {
    try {
      const { courseId } = req.params;
      const assignments = await storage.getAssignmentsByCourse(courseId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/assignments/:assignmentId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assignmentId } = req.params;
      
      const submissionData = insertSubmissionSchema.parse({
        ...req.body,
        assignmentId,
        userId,
      });
      
      const submission = await storage.createSubmission(submissionData);
      
      // Create notification for instructor
      const assignment = await storage.getAssignment(assignmentId);
      if (assignment) {
        const course = await storage.getCourse(assignment.courseId);
        if (course) {
          const student = await storage.getUser(userId);
          await storage.createNotification({
            userId: course.instructorId,
            type: 'assignment_submission',
            title: 'Yangi vazifa topshirildi',
            message: `${student?.firstName || 'O\'quvchi'} "${assignment.title}" vazifasini topshirdi`,
          });
        }
      }
      
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/tests', isAuthenticated, async (req, res) => {
    try {
      const { courseId } = req.params;
      const tests = await storage.getTestsByCourse(courseId);
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/tests/:testId/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { testId } = req.params;
      
      const attemptData = insertTestAttemptSchema.parse({
        ...req.body,
        testId,
        userId,
      });
      
      const attempt = await storage.createTestAttempt(attemptData);
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ FILE DOWNLOAD ROUTES ============
  
  // Download submission files (authenticated)
  app.get('/submissions/*', isAuthenticated, async (req, res) => {
    try {
      const filePath = req.params[0]; // Get everything after /submissions/
      const file = await objectStorage.searchPublicObject(`submissions/${filePath}`);
      
      if (!file) {
        return res.status(404).json({ message: "Fayl topilmadi" });
      }
      
      await objectStorage.downloadObject(file, res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SUBMISSION ROUTES ============
  
  // O'qituvchi - Kurs bo'yicha vazifalar
  app.get('/api/instructor/submissions', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const submissions = await storage.getSubmissionsByInstructor(instructorId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qituvchi - Kurs bo'yicha vazifalar (course-specific)
  app.get('/api/instructor/courses/:courseId/submissions', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { courseId } = req.params;
      
      // Verify course belongs to instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Kurs topilmadi" });
      }
      if (course.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Ruxsat yo'q" });
        }
      }
      
      const allSubmissions = await storage.getSubmissionsByInstructor(instructorId);
      // Filter by course
      const courseSubmissions = allSubmissions.filter((s: any) => s.course.id === courseId);
      
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(courseSubmissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qituvchi - Vazifani baholash
  app.post('/api/instructor/submissions/:id/grade', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { id } = req.params;
      
      // Validate request body with Zod
      const validatedData = gradingSchema.parse(req.body);
      const { grade, feedback, status } = validatedData;
      
      // Authorization check: ensure submission belongs to instructor's course
      const submissions = await storage.getSubmissionsByInstructor(instructorId);
      const submissionData = submissions.find((s: any) => s.submission.id === id);
      
      if (!submissionData) {
        return res.status(403).json({ message: "Sizga bu vazifani baholash huquqi yo'q" });
      }
      
      const submission = await storage.updateSubmissionGrade(id, grade, feedback, status);
      
      // O'quvchiga ogohlantirish yuborish
      const statusMessage = status === 'graded' ? 'Vazifangiz tekshirildi' : 'Vazifani qayta topshiring';
      const notificationData = insertNotificationSchema.parse({
        userId: submission.userId,
        type: status === 'graded' ? 'assignment_graded' : 'revision_requested',
        title: statusMessage,
        message: feedback,
        relatedId: submission.id,
        isRead: false,
      });
      await storage.createNotification(notificationData);
      
      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'quvchi - Vazifa yuborish
  app.post('/api/student/submissions', isAuthenticated, upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'audios', maxCount: 3 },
    { name: 'files', maxCount: 3 }
  ]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { assignmentId, content } = req.body;
      
      // Validate assignment exists
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Vazifa topilmadi" });
      }
      
      // Upload files to Google Cloud Storage
      const imageUrls: string[] = [];
      const audioUrls: string[] = [];
      const fileUrls: string[] = [];
      
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files.images) {
        for (const file of files.images) {
          const url = await uploadSubmissionFile(file, 'submissions/images');
          imageUrls.push(url);
        }
      }
      
      if (files.audios) {
        for (const file of files.audios) {
          const url = await uploadSubmissionFile(file, 'submissions/audios');
          audioUrls.push(url);
        }
      }
      
      if (files.files) {
        for (const file of files.files) {
          const url = await uploadSubmissionFile(file, 'submissions/files');
          fileUrls.push(url);
        }
      }
      
      const submission = await storage.createSubmission({
        assignmentId,
        userId,
        content,
        imageUrls,
        audioUrls,
        fileUrls,
        status: 'new_submitted',
      });
      
      // O'qituvchiga ogohlantirish yuborish
      const course = await storage.getCourse(assignment.courseId);
      if (course) {
        const student = await storage.getUser(userId);
        const studentName = student?.firstName || student?.email || 'O\'quvchi';
        const notificationData = insertNotificationSchema.parse({
          userId: course.instructorId,
          type: 'assignment_submitted',
          title: 'Yangi vazifa topshirildi',
          message: `${studentName} "${assignment.title}" vazifasini topshirdi`,
          relatedId: submission.id,
          isRead: false,
        });
        await storage.createNotification(notificationData);
      }
      
      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'quvchi - O'z vazifalari
  app.get('/api/student/submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const submissions = await storage.getSubmissionsByUser(userId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ NOTIFICATION ROUTES ============
  
  // Ogohlantirishlarni olish
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qilgan deb belgilash
  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qilmagan soni
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ STRIPE PAYMENT ROUTES ============
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const { courseId } = req.body;
      
      // SECURITY: Get price from server, not client
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(course.price) * 100), // Convert to cents
        currency: "usd",
        metadata: { 
          courseId,
          userId: req.user.claims.sub,
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
