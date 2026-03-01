// API routes with Replit Auth
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isInstructor } from "./replitAuth";
import multer from "multer";
import { writeFile } from "fs/promises";
import { join } from "path";
import { ObjectStorageService } from "./objectStorage";
import { db } from "./db";
import bcrypt from "bcryptjs";
import passport from "passport";
import { users, courses, lessons, assignments, tests, questions, questionOptions, enrollments, submissions, testAttempts, notifications, conversations, messages, siteSettings, testimonials, subscriptionPlans, coursePlanPricing, userSubscriptions, passwordResetRequests, speakingTests, speakingTestSections, speakingQuestions, speakingSubmissions, speakingAnswers, speakingEvaluations, essaySubmissions, courseRatings, courseLikes, lessonProgress, announcements, liveRooms, courseGroupChats, userPresence, courseModules, lessonSections, courseResourceTypes, lessonEssayQuestions, studentGroups, studentGroupMembers } from "@shared/schema";
import { eq, and, or, desc, sql, count, avg, inArray } from "drizzle-orm";
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
  insertAnnouncementSchema,
  insertSiteSettingSchema,
  insertTestimonialSchema,
  insertSpeakingTestSchema,
  insertSpeakingTestSectionSchema,
  insertSpeakingQuestionSchema,
  insertSpeakingSubmissionSchema,
  insertSpeakingAnswerSchema,
  insertSpeakingEvaluationSchema,
  type InstructorCourseWithCounts,
} from "@shared/schema";
import { z } from "zod";
import * as XLSX from "xlsx";
import { createZoomMeeting, endZoomMeeting, isZoomConfigured } from "./zoom";

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

  // Public user endpoint (returns null if not authenticated, used by HomePage)
  app.get('/api/user', async (req: any, res) => {
    try {
      // Check session user (OIDC/Replit Auth)
      if (req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      // Check local auth user (passport session)
      if (req.session?.passport?.user) {
        const userId = req.session.passport.user;
        const user = await storage.getUser(userId);
        return res.json(user);
      }
      
      // No user logged in
      res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.json(null); // Return null on error instead of 500
    }
  });
  
  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { telegramUsername } = req.body;
      
      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({ 
          telegramUsername,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Local Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { phone, email, password, firstName, lastName } = req.body;
      
      // Server-side validation
      const registerSchema = z.object({
        phone: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }).refine(
        (data) => data.phone || data.email,
        { message: 'Telefon yoki email kiritish shart' }
      );
      
      const validatedData = registerSchema.parse({ phone, email, password, firstName, lastName });
      
      // Check if user exists
      if (validatedData.phone) {
        const existingUser = await storage.getUserByPhoneOrEmail(validatedData.phone);
        if (existingUser) {
          return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
        }
      }
      
      if (validatedData.email) {
        const existingUser = await storage.getUserByPhoneOrEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
        }
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 10);
      
      // Create user with pending status (requires admin approval)
      const [newUser] = await db
        .insert(users)
        .values({
          phone: validatedData.phone || null,
          email: validatedData.email || null,
          passwordHash,
          firstName: validatedData.firstName || null,
          lastName: validatedData.lastName || null,
          role: 'student', // Default to student
          status: 'pending', // Requires admin approval
        })
        .returning();
      
      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      
      res.json({ message: 'Ro\'yxatdan o\'tish muvaffaqiyatli! Administrator tasdig\'ini kutib turing.', user: userWithoutPassword });
    } catch (error: any) {
      console.error('Register error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Local Auth: Login
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Login xato' });
      }
      req.logIn(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }
        
        try {
          const userId = user.claims.sub;
          const currentSessionId = req.sessionID;
          console.log(`[Session Management] User ${userId} logged in with session ${currentSessionId}`);

          // Enforce max 2 active sessions per user — remove oldest if exceeded
          const MAX_SESSIONS = 2;
          const activeSessions = await db.execute(
            sql`SELECT sid, expire FROM sessions WHERE sess->'passport'->>'user' = ${userId} AND expire > NOW() AND sid != ${currentSessionId} ORDER BY expire ASC`
          );
          const rows = activeSessions.rows as { sid: string }[];
          if (rows.length >= MAX_SESSIONS) {
            const toDelete = rows.slice(0, rows.length - MAX_SESSIONS + 1);
            for (const row of toDelete) {
              await db.execute(sql`DELETE FROM sessions WHERE sid = ${row.sid}`);
              console.log(`[Session Management] Removed old session ${row.sid} for user ${userId}`);
            }
          }
        } catch (sessionError: any) {
          console.error('[Session Management] Error:', sessionError);
        }
        
        // Fetch full user data from database
        const fullUser = await storage.getUser(user.claims.sub);
        
        if (!fullUser) {
          // If user not found in database, return session user data
          console.error('[Login] User not found in database after authentication:', user.claims.sub);
          return res.json({ 
            message: 'Login muvaffaqiyatli', 
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
              profileImageUrl: user.claims.profile_image_url,
              role: user.claims.role,
            }
          });
        }
        
        return res.json({ 
          message: 'Login muvaffaqiyatli', 
          user: fullUser 
        });
      });
    })(req, res, next);
  });

  // Forgot Password: Create reset request
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { contactInfo } = req.body;
      
      // Validate input
      if (!contactInfo || contactInfo.trim().length === 0) {
        return res.status(400).json({ message: 'Email yoki telefon kiriting' });
      }
      
      // Find user by phone or email
      const user = await storage.getUserByPhoneOrEmail(contactInfo.trim());
      
      // Security: Don't reveal if user exists or not
      const responseMessage = 'Agar bu ma\'lumot tizimda mavjud bo\'lsa, administrator sizga tez orada aloqaga chiqadi.';
      
      // If user found, create reset request
      if (user) {
        const [resetRequest] = await db
          .insert(passwordResetRequests)
          .values({
            contactInfo: contactInfo.trim(),
            userId: user.id,
            status: 'pending',
          })
          .returning();
        
        // Create notification for all admins
        const admins = await db
          .select()
          .from(users)
          .where(eq(users.role, 'admin'));
        
        for (const admin of admins) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: 'password_reset_request',
            title: 'Parolni tiklash so\'rovi',
            message: `${user.firstName || ''} ${user.lastName || ''} (${contactInfo}) parolni tiklashni so\'radi`,
            relatedId: resetRequest.id,
            isRead: false,
          });
        }
      }
      
      res.json({ message: responseMessage });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.' });
    }
  });

  // File upload endpoint for payment receipts
  app.post('/api/upload-receipt', isAuthenticated, (req: any, res: any, next: any) => {
    upload.single('file')(req, res, async (err: any) => {
      // Handle multer errors
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "Fayl hajmi 5MB dan oshmasligi kerak" });
        }
        return res.status(400).json({ message: err.message || "Fayl yuklashda xatolik" });
      }

      try {
        if (!req.file) {
          return res.status(400).json({ message: "Fayl tanlanmagan" });
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
        res.status(500).json({ message: error.message || "Fayl yuklashda xatolik yuz berdi" });
      }
    });
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

  // Serve public certificate images
  app.get('/certificates/:fileName', async (req, res) => {
    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorage = new ObjectStorageService();
      const file = await objectStorage.searchPublicObject(`certificates/${req.params.fileName}`);
      
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

  // Active session count per user (device count)
  app.get('/api/admin/user-sessions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await db.execute(
        sql`SELECT sess->'passport'->>'user' as user_id, count(*)::int as session_count FROM sessions WHERE expire > NOW() AND sess->'passport'->>'user' IS NOT NULL GROUP BY user_id`
      );
      const counts: Record<string, number> = {};
      for (const row of result.rows as { user_id: string; session_count: number }[]) {
        if (row.user_id) counts[row.user_id] = row.session_count;
      }
      res.json(counts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/trends', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const trends = await storage.getTrends();
      res.json(trends);
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

  // Reset user password (Admin only)
  app.patch('/api/admin/users/:userId/reset-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
      }
      
      // Hash the new password
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      // Update user password
      await db
        .update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      res.json({ message: "Parol muvaffaqiyatli yangilandi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete user and all related data
  app.delete('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.claims.sub;
      
      if (userId === adminId) {
        return res.status(400).json({ message: 'O\'zingizni o\'chira olmaysiz' });
      }
      
      const [userToDelete] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!userToDelete) {
        return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
      }
      
      await db.transaction(async (tx: any) => {
        // If instructor, delete all course-related data first
        if (userToDelete.role === 'instructor') {
          const instructorCourses = await tx
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.instructorId, userId));
          
          const courseIds = instructorCourses.map((c: any) => c.id);
          
          if (courseIds.length > 0) {
            // Delete deep course children first
            for (const cId of courseIds) {
              // Get lesson IDs for this course
              const courseLessons = await tx
                .select({ id: lessons.id })
                .from(lessons)
                .where(eq(lessons.courseId, cId));
              const lessonIds = courseLessons.map((l: any) => l.id);
              
              if (lessonIds.length > 0) {
                // Delete essay submissions via essay questions
                const essayQs = await tx
                  .select({ id: lessonEssayQuestions.id })
                  .from(lessonEssayQuestions)
                  .where(inArray(lessonEssayQuestions.lessonId, lessonIds));
                const essayQIds = essayQs.map((q: any) => q.id);
                if (essayQIds.length > 0) {
                  await tx.delete(essaySubmissions).where(inArray(essaySubmissions.essayQuestionId, essayQIds));
                  await tx.delete(lessonEssayQuestions).where(inArray(lessonEssayQuestions.id, essayQIds));
                }
                
                // Delete lesson sections
                await tx.delete(lessonSections).where(inArray(lessonSections.lessonId, lessonIds));
                
                // Delete lesson progress for these lessons
                await tx.delete(lessonProgress).where(inArray(lessonProgress.lessonId, lessonIds));
                
                // Delete submissions for assignments in these lessons
                const lessonAssignments = await tx
                  .select({ id: assignments.id })
                  .from(assignments)
                  .where(inArray(assignments.lessonId, lessonIds));
                const assignmentIds = lessonAssignments.map((a: any) => a.id);
                if (assignmentIds.length > 0) {
                  await tx.delete(submissions).where(inArray(submissions.assignmentId, assignmentIds));
                }
                
                // Delete assignments for these lessons
                await tx.delete(assignments).where(inArray(assignments.lessonId, lessonIds));
              }
              
              // Delete speaking test data for this course
              const sCourseTests = await tx
                .select({ id: speakingTests.id })
                .from(speakingTests)
                .where(eq(speakingTests.courseId, cId));
              const sTestIds = sCourseTests.map((t: any) => t.id);
              if (sTestIds.length > 0) {
                // Delete speaking submissions + answers + evaluations first (deepest children)
                const sSubmissions = await tx
                  .select({ id: speakingSubmissions.id })
                  .from(speakingSubmissions)
                  .where(inArray(speakingSubmissions.speakingTestId, sTestIds));
                const sSubIds = sSubmissions.map((s: any) => s.id);
                if (sSubIds.length > 0) {
                  const sAnswersList = await tx
                    .select({ id: speakingAnswers.id })
                    .from(speakingAnswers)
                    .where(inArray(speakingAnswers.submissionId, sSubIds));
                  const sAnswerIds = sAnswersList.map((a: any) => a.id);
                  if (sAnswerIds.length > 0) {
                    await tx.delete(speakingEvaluations).where(inArray(speakingEvaluations.answerId, sAnswerIds));
                    await tx.delete(speakingAnswers).where(inArray(speakingAnswers.id, sAnswerIds));
                  }
                  await tx.delete(speakingSubmissions).where(inArray(speakingSubmissions.id, sSubIds));
                }
                
                // Now delete questions, sections, then tests
                const sSections = await tx
                  .select({ id: speakingTestSections.id })
                  .from(speakingTestSections)
                  .where(inArray(speakingTestSections.speakingTestId, sTestIds));
                const sSectionIds = sSections.map((s: any) => s.id);
                if (sSectionIds.length > 0) {
                  await tx.delete(speakingQuestions).where(inArray(speakingQuestions.sectionId, sSectionIds));
                  await tx.delete(speakingTestSections).where(inArray(speakingTestSections.id, sSectionIds));
                }
                await tx.delete(speakingTests).where(inArray(speakingTests.id, sTestIds));
              }
              
              // Delete tests and their children for this course
              const courseTests = await tx
                .select({ id: tests.id })
                .from(tests)
                .where(eq(tests.courseId, cId));
              const testIds = courseTests.map((t: any) => t.id);
              if (testIds.length > 0) {
                const testQuestions = await tx
                  .select({ id: questions.id })
                  .from(questions)
                  .where(inArray(questions.testId, testIds));
                const qIds = testQuestions.map((q: any) => q.id);
                if (qIds.length > 0) {
                  await tx.delete(questionOptions).where(inArray(questionOptions.questionId, qIds));
                  await tx.delete(questions).where(inArray(questions.id, qIds));
                }
                await tx.delete(testAttempts).where(inArray(testAttempts.testId, testIds));
                await tx.delete(tests).where(inArray(tests.id, testIds));
              }
              
              // Delete course group chats
              await tx.delete(courseGroupChats).where(eq(courseGroupChats.courseId, cId));
              
              // Delete lessons
              if (lessonIds.length > 0) {
                await tx.delete(lessons).where(inArray(lessons.id, lessonIds));
              }
              
              // Delete course modules
              await tx.delete(courseModules).where(eq(courseModules.courseId, cId));
              
              // Delete course resource types
              await tx.delete(courseResourceTypes).where(eq(courseResourceTypes.courseId, cId));
              
              // Delete course plan pricing
              await tx.delete(coursePlanPricing).where(eq(coursePlanPricing.courseId, cId));
              
              // Delete course ratings and likes
              await tx.delete(courseRatings).where(eq(courseRatings.courseId, cId));
              await tx.delete(courseLikes).where(eq(courseLikes.courseId, cId));
              
              // Delete enrollments for this course
              await tx.delete(enrollments).where(eq(enrollments.courseId, cId));
              
              // Delete user subscriptions for this course
              await tx.delete(userSubscriptions).where(eq(userSubscriptions.courseId, cId));
              
              // Submissions are deleted via cascade when assignments are deleted
            }
            
            // Delete live rooms created by this instructor
            await tx.delete(liveRooms).where(eq(liveRooms.instructorId, userId));
            
            // Delete announcements by instructor
            await tx.delete(announcements).where(eq(announcements.instructorId, userId));
            
            // Delete all courses
            await tx.delete(courses).where(eq(courses.instructorId, userId));
          }
        }
        
        // --- Common cleanup for all user roles ---
        
        // Delete speaking evaluations where user is evaluator (set evaluatorId to null via raw SQL)
        await tx.execute(sql`UPDATE speaking_evaluations SET evaluator_id = NULL WHERE evaluator_id = ${userId}`);
        
        // Delete speaking submissions by user
        const userSpeakingSubs = await tx
          .select({ id: speakingSubmissions.id })
          .from(speakingSubmissions)
          .where(eq(speakingSubmissions.userId, userId));
        const usSIds = userSpeakingSubs.map((s: any) => s.id);
        if (usSIds.length > 0) {
          const usAnswers = await tx
            .select({ id: speakingAnswers.id })
            .from(speakingAnswers)
            .where(inArray(speakingAnswers.submissionId, usSIds));
          const usAIds = usAnswers.map((a: any) => a.id);
          if (usAIds.length > 0) {
            await tx.delete(speakingEvaluations).where(inArray(speakingEvaluations.answerId, usAIds));
            await tx.delete(speakingAnswers).where(inArray(speakingAnswers.id, usAIds));
          }
          await tx.delete(speakingSubmissions).where(inArray(speakingSubmissions.id, usSIds));
        }
        
        // Delete essay submissions by user
        await tx.delete(essaySubmissions).where(eq(essaySubmissions.studentId, userId));
        
        // Delete test attempts
        await tx.delete(testAttempts).where(eq(testAttempts.userId, userId));
        
        // Delete assignment submissions
        await tx.delete(submissions).where(eq(submissions.userId, userId));
        
        // Delete lesson progress
        await tx.delete(lessonProgress).where(eq(lessonProgress.userId, userId));
        
        // Delete enrollments
        await tx.delete(enrollments).where(eq(enrollments.userId, userId));
        
        // Delete user subscriptions
        await tx.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
        
        // Delete course ratings and likes
        await tx.delete(courseRatings).where(eq(courseRatings.userId, userId));
        await tx.delete(courseLikes).where(eq(courseLikes.userId, userId));
        
        // Delete notifications
        await tx.delete(notifications).where(eq(notifications.userId, userId));
        
        // Delete announcements (if instructor role wasn't handled above)
        await tx.delete(announcements).where(eq(announcements.instructorId, userId));
        
        // Delete password reset requests
        await tx.execute(sql`UPDATE password_reset_requests SET processed_by = NULL WHERE processed_by = ${userId}`);
        await tx.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, userId));
        
        // Delete messages sent by user
        await tx.delete(messages).where(eq(messages.senderId, userId));
        
        // Delete conversations where user is a participant
        await tx.delete(conversations).where(eq(conversations.studentId, userId));
        await tx.delete(conversations).where(eq(conversations.instructorId, userId));
        
        // Delete course group chats sent by user
        await tx.delete(courseGroupChats).where(eq(courseGroupChats.senderId, userId));
        
        // Delete user presence
        await tx.delete(userPresence).where(eq(userPresence.userId, userId));
        
        // Delete live rooms (if any remaining)
        await tx.delete(liveRooms).where(eq(liveRooms.instructorId, userId));
        
        // Delete user sessions
        await tx.execute(sql`DELETE FROM sessions WHERE sess::text LIKE ${'%' + userId + '%'}`);
        
        // Finally, delete the user
        await tx.delete(users).where(eq(users.id, userId));
      });
      
      res.json({ 
        success: true, 
        message: `${userToDelete.firstName} ${userToDelete.lastName} muvaffaqiyatli o'chirildi`
      });
    } catch (error: any) {
      console.error('User deletion error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Student Management APIs
  app.post('/api/admin/create-student', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { phone, email, firstName, lastName, password, courseIds, subscriptionDays, groupId } = req.body;
      
      console.log('[Create Student] Request body:', { phone, email, firstName, lastName, courseIds, subscriptionDays, groupId });
      
      // Server-side validation
      const createStudentSchema = z.object({
        phone: z.string().min(1, 'Telefon raqam kiritish shart'),
        email: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? undefined : val,
          z.string().email().optional()
        ),
        firstName: z.string().min(1, 'Ism kiritish shart'),
        lastName: z.string().min(1, 'Familiya kiritish shart'),
        password: z.string().min(1, 'Parol kiritish shart'),
        courseIds: z.preprocess(
          (val) => (val === '' || val === undefined || val === null || (Array.isArray(val) && val.length === 0)) ? undefined : val,
          z.array(z.string()).optional()
        ),
        subscriptionDays: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? '30' : val,
          z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1, 'Obuna muddati kamida 1 kun bo\'lishi kerak'))
        ),
        groupId: z.preprocess(
          (val) => (val === '' || val === undefined || val === null || val === 'none') ? undefined : val,
          z.string().optional()
        ),
      });
      
      const validatedData = createStudentSchema.parse({ phone, email, firstName, lastName, password, courseIds, subscriptionDays, groupId });
      
      // Check if phone already exists
      const existingUser = await storage.getUserByPhoneOrEmail(validatedData.phone);
      if (existingUser) {
        return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
      }
      
      // Check if email exists (if provided)
      if (validatedData.email) {
        const existingEmailUser = await storage.getUserByPhoneOrEmail(validatedData.email);
        if (existingEmailUser) {
          return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
        }
      }
      
      const finalPassword = validatedData.password;
      
      // Hash password
      const passwordHash = await bcrypt.hash(finalPassword, 10);
      
      // Execute all operations in a transaction to ensure data consistency
      const newUser = await db.transaction(async (tx: any) => {
        // Create user with active status (admin-created users are pre-approved)
        const [createdUser] = await tx
          .insert(users)
          .values({
            phone: validatedData.phone || null,
            email: validatedData.email || null,
            passwordHash,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            role: 'student',
            status: 'active', // Admin-created users are automatically active
          })
          .returning();
        
        // If courseIds are provided, create enrollment and subscription for each
        let enrollmentsCreated = 0;
        if (validatedData.courseIds && validatedData.courseIds.length > 0) {
          console.log(`[Create Student] Creating enrollments for ${validatedData.courseIds.length} courses`);
          
          // Get the first subscription plan as default
          const [defaultPlan] = await tx
            .select()
            .from(subscriptionPlans)
            .limit(1);
          
          if (!defaultPlan) {
            console.error('[Create Student] ❌ No subscription plan found! Cannot create enrollments.');
          } else {
            console.log(`[Create Student] ✓ Using plan: ${defaultPlan.name} (ID: ${defaultPlan.id})`);
            
            // Create enrollment and subscription for each course
            for (const courseId of validatedData.courseIds) {
              console.log(`[Create Student] Creating enrollment for course ${courseId}...`);
              
              // Create enrollment with approved payment status (admin-created enrollments are immediately approved)
              const [enrollment] = await tx
                .insert(enrollments)
                .values({
                  userId: createdUser.id,
                  courseId: courseId,
                  planId: defaultPlan.id,
                  paymentStatus: 'approved', // Admin-created enrollments are immediately approved
                })
                .returning();
              
              console.log(`[Create Student] ✓ Enrollment created (ID: ${enrollment.id})`);
              
              // Create subscription with custom duration
              const startDate = new Date();
              const endDate = new Date();
              endDate.setDate(endDate.getDate() + validatedData.subscriptionDays);
              
              await tx
                .insert(userSubscriptions)
                .values({
                  userId: createdUser.id,
                  courseId: courseId,
                  planId: defaultPlan.id,
                  enrollmentId: enrollment.id,
                  status: 'active',
                  startDate,
                  endDate,
                });
              
              console.log(`[Create Student] ✓ Subscription created (${validatedData.subscriptionDays} days: ${startDate.toISOString()} to ${endDate.toISOString()})`);
              
              enrollmentsCreated++;
            }
          }
        }
        
        console.log(`[Create Student] Final result: ${enrollmentsCreated} enrollments created for user ${createdUser.id}`);
        
        // Add to group if groupId specified
        if (validatedData.groupId) {
          await tx.insert(studentGroupMembers).values({
            groupId: validatedData.groupId,
            userId: createdUser.id,
          });
          console.log(`[Create Student] ✓ Added to group ${validatedData.groupId}`);
        }
        
        return { user: createdUser, enrollmentsCreated };
      });
      
      // Remove password from response
      const { passwordHash: _pwd, ...userWithoutPassword } = newUser.user;
      
      // Return user with login credentials (phone as login) and enrollment status
      res.json({ 
        message: newUser.enrollmentsCreated > 0
          ? `O'quvchi muvaffaqiyatli yaratildi va ${newUser.enrollmentsCreated} ta kursga yozildi` 
          : validatedData.courseIds && validatedData.courseIds.length > 0
            ? 'O\'quvchi yaratildi (Kurslarga yozilmadi - tarif topilmadi)'
            : 'O\'quvchi muvaffaqiyatli yaratildi',
        user: userWithoutPassword,
        enrollmentsCreated: newUser.enrollmentsCreated,
        credentials: {
          login: validatedData.phone,
          password: finalPassword
        }
      });
    } catch (error: any) {
      console.error('Create student error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import students
  app.post('/api/admin/bulk-import-students', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { students, courseIds, groupId, subscriptionDays } = req.body;

      const bulkImportSchema = z.object({
        students: z.array(z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          phone: z.string().min(1),
        })).min(1, 'Kamida bitta o\'quvchi kiritish shart'),
        courseIds: z.preprocess(
          (val) => (val === '' || val === undefined || val === null || (Array.isArray(val) && val.length === 0)) ? undefined : val,
          z.array(z.string()).optional()
        ),
        groupId: z.preprocess(
          (val) => (val === '' || val === undefined || val === null || val === 'none') ? undefined : val,
          z.string().optional()
        ),
        subscriptionDays: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? 30 : Number(val),
          z.number().min(1).default(30)
        ),
      });

      const validated = bulkImportSchema.parse({ students, courseIds, groupId, subscriptionDays });

      let created = 0;
      let skipped = 0;
      const errors: { line: number; name: string; phone: string; reason: string }[] = [];

      // Get default subscription plan once
      const [defaultPlan] = await db.select().from(subscriptionPlans).limit(1);

      for (let i = 0; i < validated.students.length; i++) {
        const student = validated.students[i];
        const lineNum = i + 1;

        try {
          // Check duplicate phone
          const existing = await storage.getUserByPhoneOrEmail(student.phone);
          if (existing) {
            skipped++;
            errors.push({ line: lineNum, name: `${student.firstName} ${student.lastName}`, phone: student.phone, reason: 'Bu telefon raqam allaqachon mavjud' });
            continue;
          }

          const passwordHash = await bcrypt.hash(student.phone, 10);

          await db.transaction(async (tx: any) => {
            const [createdUser] = await tx
              .insert(users)
              .values({
                phone: student.phone,
                passwordHash,
                firstName: student.firstName,
                lastName: student.lastName,
                role: 'student',
                status: 'active',
              })
              .returning();

            if (validated.courseIds && validated.courseIds.length > 0 && defaultPlan) {
              for (const courseId of validated.courseIds) {
                const [enrollment] = await tx
                  .insert(enrollments)
                  .values({
                    userId: createdUser.id,
                    courseId,
                    planId: defaultPlan.id,
                    paymentStatus: 'approved',
                  })
                  .returning();

                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + validated.subscriptionDays);

                await tx.insert(userSubscriptions).values({
                  userId: createdUser.id,
                  courseId,
                  planId: defaultPlan.id,
                  enrollmentId: enrollment.id,
                  status: 'active',
                  startDate,
                  endDate,
                });
              }
            }

            if (validated.groupId) {
              await tx.insert(studentGroupMembers).values({
                groupId: validated.groupId,
                userId: createdUser.id,
              });
            }
          });

          created++;
        } catch (err: any) {
          skipped++;
          errors.push({ line: lineNum, name: `${student.firstName} ${student.lastName}`, phone: student.phone, reason: err.message || 'Noma\'lum xato' });
        }
      }

      res.json({ created, skipped, errors });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Assign courses to existing student
  app.post('/api/admin/assign-courses', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { studentId, courseIds, subscriptionDays } = req.body;
      
      console.log('[Assign Courses] Request body:', { studentId, courseIds, subscriptionDays });
      
      // Server-side validation
      const assignCoursesSchema = z.object({
        studentId: z.string().min(1, 'O\'quvchi tanlash shart'),
        courseIds: z.array(z.string()).min(1, 'Kamida bitta kurs tanlash shart'),
        subscriptionDays: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? '30' : val,
          z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1, 'Obuna muddati kamida 1 kun bo\'lishi kerak'))
        ),
      });
      
      const validatedData = assignCoursesSchema.parse({ studentId, courseIds, subscriptionDays });
      
      // Check if student exists and is actually a student
      const student = await storage.getUser(validatedData.studentId);
      if (!student) {
        return res.status(404).json({ message: 'O\'quvchi topilmadi' });
      }
      if (student.role !== 'student') {
        return res.status(400).json({ message: 'Faqat o\'quvchilarga kurs biriktirish mumkin' });
      }
      
      // Execute all operations in a transaction
      const result = await db.transaction(async (tx: any) => {
        console.log(`[Assign Courses] Processing ${validatedData.courseIds.length} courses for student ${validatedData.studentId}`);
        
        // Get the first subscription plan as default
        const [defaultPlan] = await tx
          .select()
          .from(subscriptionPlans)
          .limit(1);
        
        if (!defaultPlan) {
          console.error('[Assign Courses] ❌ No subscription plan found!');
          throw new Error('Obuna tarifi topilmadi. Avval tarif yarating.');
        }
        
        console.log(`[Assign Courses] ✓ Using plan: ${defaultPlan.name} (ID: ${defaultPlan.id})`);
        
        let enrollmentsCreated = 0;
        let enrollmentsSkipped = 0;
        const skippedCourses: string[] = [];
        
        // Create enrollment and subscription for each course
        for (const courseId of validatedData.courseIds) {
          console.log(`[Assign Courses] Processing course ${courseId}...`);
          
          // Check if student is already enrolled in this course
          const [existingEnrollment] = await tx
            .select()
            .from(enrollments)
            .where(and(
              eq(enrollments.userId, validatedData.studentId),
              eq(enrollments.courseId, courseId)
            ))
            .limit(1);
          
          if (existingEnrollment) {
            // Skip if already enrolled
            console.log(`[Assign Courses] ⚠️  Student already enrolled in course ${courseId}, skipping`);
            enrollmentsSkipped++;
            
            // Get course name for better feedback
            const [course] = await tx
              .select({ title: courses.title })
              .from(courses)
              .where(eq(courses.id, courseId))
              .limit(1);
            
            if (course) {
              skippedCourses.push(course.title);
            }
            continue;
          }
          
          // Create enrollment with approved payment status
          const [enrollment] = await tx
            .insert(enrollments)
            .values({
              userId: validatedData.studentId,
              courseId: courseId,
              planId: defaultPlan.id,
              paymentStatus: 'approved',
            })
            .returning();
          
          console.log(`[Assign Courses] ✓ Enrollment created (ID: ${enrollment.id})`);
          
          // Create subscription with custom duration
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + validatedData.subscriptionDays);
          
          await tx
            .insert(userSubscriptions)
            .values({
              userId: validatedData.studentId,
              courseId: courseId,
              planId: defaultPlan.id,
              enrollmentId: enrollment.id,
              status: 'active',
              startDate,
              endDate,
            });
          
          console.log(`[Assign Courses] ✓ Subscription created (${validatedData.subscriptionDays} days: ${startDate.toISOString()} to ${endDate.toISOString()})`);
          
          enrollmentsCreated++;
        }
        
        console.log(`[Assign Courses] Final result: ${enrollmentsCreated} created, ${enrollmentsSkipped} skipped`);
        
        return { enrollmentsCreated, enrollmentsSkipped, skippedCourses };
      });
      
      // Build response message
      let message = '';
      if (result.enrollmentsCreated > 0) {
        message = `${result.enrollmentsCreated} ta kurs muvaffaqiyatli biriktirildi`;
      }
      if (result.enrollmentsSkipped > 0) {
        const skippedMessage = result.skippedCourses.length > 0
          ? `O'quvchi allaqachon quyidagi kurslarga yozilgan: ${result.skippedCourses.join(', ')}`
          : `${result.enrollmentsSkipped} ta kurs o'tkazib yuborildi (allaqachon yozilgan)`;
        message = message ? `${message}. ${skippedMessage}` : skippedMessage;
      }
      if (!message) {
        message = 'Hech qanday o\'zgarish kiritilmadi';
      }
      
      res.json({ 
        success: true,
        message,
        enrollmentsCreated: result.enrollmentsCreated,
        enrollmentsSkipped: result.enrollmentsSkipped,
      });
    } catch (error: any) {
      console.error('Assign courses error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/admin/pending-students', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingStudents = await db
        .select()
        .from(users)
        .where(and(
          eq(users.role, 'student'),
          eq(users.status, 'pending')
        ))
        .orderBy(desc(users.createdAt));
      
      // Remove passwords from response
      const studentsWithoutPasswords = pendingStudents.map(({ passwordHash: _p, ...user }: any) => user);
      
      res.json(studentsWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/students/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [updatedUser] = await db
        .update(users)
        .set({ status: 'active', updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'O\'quvchi topilmadi' });
      }
      
      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      
      res.json({ message: 'O\'quvchi tasdiqlandi', user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch('/api/admin/students/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [updatedUser] = await db
        .update(users)
        .set({ status: 'rejected', updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'O\'quvchi topilmadi' });
      }
      
      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = updatedUser;
      
      res.json({ message: 'O\'quvchi rad etildi', user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password Reset Requests - Admin routes
  app.get('/api/admin/password-reset-requests', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const requests = await db
        .select({
          id: passwordResetRequests.id,
          contactInfo: passwordResetRequests.contactInfo,
          status: passwordResetRequests.status,
          createdAt: passwordResetRequests.createdAt,
          processedAt: passwordResetRequests.processedAt,
          userId: passwordResetRequests.userId,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            role: users.role,
          }
        })
        .from(passwordResetRequests)
        .leftJoin(users, eq(passwordResetRequests.userId, users.id))
        .orderBy(desc(passwordResetRequests.createdAt));
      
      res.json(requests);
    } catch (error: any) {
      console.error('Get password reset requests error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.put('/api/admin/password-reset-requests/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const adminId = req.user.claims.sub;
      
      // Strong password validation
      const passwordSchema = z.string()
        .min(6, 'Parol kamida 6 belgidan iborat bo\'lishi kerak')
        .max(100, 'Parol juda uzun')
        .regex(/^(?=.*[0-9])/, 'Parol kamida bitta raqam o\'z ichiga olishi kerak')
        .trim();
      
      const validationResult = passwordSchema.safeParse(newPassword);
      if (!validationResult.success) {
        return res.status(400).json({ message: validationResult.error.errors[0].message });
      }
      
      const validatedPassword = validationResult.data;
      
      // Get reset request
      const [resetRequest] = await db
        .select()
        .from(passwordResetRequests)
        .where(eq(passwordResetRequests.id, id));
      
      if (!resetRequest) {
        return res.status(404).json({ message: 'So\'rov topilmadi' });
      }
      
      if (!resetRequest.userId) {
        return res.status(400).json({ message: 'Foydalanuvchi topilmadi' });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(validatedPassword, 10);
      
      // Update user password
      await db
        .update(users)
        .set({ 
          passwordHash,
          updatedAt: new Date()
        })
        .where(eq(users.id, resetRequest.userId));
      
      // Update reset request status
      await db
        .update(passwordResetRequests)
        .set({
          status: 'approved',
          processedBy: adminId,
          processedAt: new Date(),
        })
        .where(eq(passwordResetRequests.id, id));
      
      // Notify user
      await db.insert(notifications).values({
        userId: resetRequest.userId,
        type: 'password_reset_completed',
        title: 'Parol tiklandi',
        message: 'Parolingiz muvaffaqiyatli tiklandi. Yangi parol bilan tizimga kirishingiz mumkin.',
        isRead: false,
      });
      
      res.json({ message: 'Parol muvaffaqiyatli o\'rnatildi' });
    } catch (error: any) {
      console.error('Process password reset error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.delete('/api/admin/password-reset-requests/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user.claims.sub;
      
      // Update request status to rejected
      const [updated] = await db
        .update(passwordResetRequests)
        .set({
          status: 'rejected',
          processedBy: adminId,
          processedAt: new Date(),
        })
        .where(eq(passwordResetRequests.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: 'So\'rov topilmadi' });
      }
      
      res.json({ message: 'So\'rov rad etildi' });
    } catch (error: any) {
      console.error('Reject password reset error:', error);
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

  // Get student enrollments with course info
  app.get('/api/admin/students/:userId/enrollments', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const userEnrollments = await storage.getEnrollmentsByUser(userId);
      const allCourses = await storage.getCourses();
      const courseMap = new Map(allCourses.map(c => [c.id, c.title]));
      const result = userEnrollments.map(e => ({
        id: e.id,
        courseId: e.courseId,
        courseTitle: courseMap.get(e.courseId) || 'Noma\'lum kurs',
        paymentStatus: e.paymentStatus,
        enrolledAt: e.enrolledAt,
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete enrollment (admin)
  app.delete('/api/admin/enrollments/:enrollmentId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { enrollmentId } = req.params;
      await storage.deleteEnrollment(enrollmentId);
      res.json({ message: "Kurs yozilishi o'chirildi" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all courses (for admin - student creation form)
  app.get('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only admin and instructors can access all courses
      if (user?.role !== 'admin' && user?.role !== 'instructor') {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }
      
      // Get all courses with instructor info, enrollments, and lessons count
      const allCourses = await db
        .select({
          id: courses.id,
          title: courses.title,
          instructorId: courses.instructorId,
          status: courses.status,
          instructor: {
            firstName: users.firstName,
            lastName: users.lastName,
          },
          enrollmentsCount: sql<number>`cast(count(distinct ${enrollments.id}) as int)`,
          lessonsCount: sql<number>`cast(count(distinct ${lessons.id}) as int)`,
        })
        .from(courses)
        .leftJoin(users, eq(courses.instructorId, users.id))
        .leftJoin(enrollments, eq(courses.id, enrollments.courseId))
        .leftJoin(lessons, eq(courses.id, lessons.courseId))
        .groupBy(courses.id, users.id)
        .orderBy(desc(courses.createdAt));
      
      res.json(allCourses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ INSTRUCTOR ROUTES ============
  app.get('/api/instructor/courses', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const courses: InstructorCourseWithCounts[] = await storage.getCoursesByInstructor(instructorId);
      res.json(courses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/instructor/courses', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { title, description, author, category, thumbnailUrl, imageUrl, pricing, isFree, levelId, promoVideoUrl } = req.body;
      
      // If course is free, force price to 0; otherwise require pricing
      if (!isFree && (!pricing || !pricing.oddiy)) {
        return res.status(400).json({ message: "Pullik kurslar uchun narx kiritish shart" });
      }
      const finalPrice = isFree ? "0" : (pricing?.oddiy || "0");
      
      // Create course with minimal data
      const courseData = insertCourseSchema.parse({
        title,
        description,
        author,
        category,
        thumbnailUrl,
        imageUrl,
        instructorId,
        price: finalPrice, // 0 if free, otherwise oddiy plan price
        originalPrice: isFree ? "0" : (req.body.originalPrice || null),
        discountPercentage: isFree ? 0 : (req.body.discountPercentage != null ? req.body.discountPercentage : 0),
        isFree: isFree || false,
        levelId: levelId || null,
        promoVideoUrl: promoVideoUrl || null,
      });
      const course = await storage.createCourse(courseData);
      
      // Skip plan pricing for free courses
      if (!isFree) {
        // Get subscription plans
        const planOddiy = await storage.getSubscriptionPlanByName('oddiy');
        const planStandard = await storage.getSubscriptionPlanByName('standard');
        const planPremium = await storage.getSubscriptionPlanByName('premium');
        
        // Create pricing for each plan
        if (planOddiy && pricing.oddiy) {
          await storage.createCoursePlanPricing({
            courseId: course.id,
            planId: planOddiy.id,
            price: pricing.oddiy,
          });
        }
        if (planStandard && pricing.standard) {
          await storage.createCoursePlanPricing({
            courseId: course.id,
            planId: planStandard.id,
            price: pricing.standard,
          });
        }
        if (planPremium && pricing.premium) {
          await storage.createCoursePlanPricing({
            courseId: course.id,
            planId: planPremium.id,
            price: pricing.premium,
          });
        }
      }
      
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
        author: true,
        category: true,
        price: true,
        originalPrice: true,
        discountPercentage: true,
        thumbnailUrl: true,
        imageUrl: true,
        isFree: true,
        levelId: true,
        promoVideoUrl: true,
      }).partial();
      
      const updateData = editableFields.parse(req.body);
      
      // If course is being marked as free, force price to 0 and delete plan pricing
      if (updateData.isFree === true) {
        updateData.price = "0";
        updateData.originalPrice = "0";
        updateData.discountPercentage = 0;
        
        // Delete existing coursePlanPricing entries
        await db.delete(coursePlanPricing).where(eq(coursePlanPricing.courseId, courseId));
      } else if (req.body.pricing && req.body.pricing.oddiy) {
        // Handle pricing object from frontend (only if not free)
        updateData.price = req.body.pricing.oddiy;
        // Only update originalPrice if explicitly provided
        if (req.body.originalPrice != null) {
          updateData.originalPrice = req.body.originalPrice;
        }
        // Only update discountPercentage if explicitly provided
        if (req.body.discountPercentage != null) {
          updateData.discountPercentage = req.body.discountPercentage;
        }
      }
      
      const updatedCourse = await storage.updateCourse(courseId, updateData);
      
      // Update plan pricing if pricing object is provided (skip for free courses)
      if (req.body.pricing && updateData.isFree !== true) {
        const plans = await storage.getSubscriptionPlans();
        for (const plan of plans) {
          const planKey = plan.name as 'oddiy' | 'standard' | 'premium';
          const newPrice = req.body.pricing[planKey];
          if (newPrice) {
            await storage.updateCoursePlanPricing(courseId, plan.id, newPrice);
          }
        }
      }
      
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

  // Unpublish course - set status to draft (hide from public)
  app.patch('/api/instructor/courses/:courseId/unpublish', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
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
      
      const updatedCourse = await storage.updateCourseStatus(courseId, 'draft');
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
      
      // Extract essay fields before parsing lesson schema
      const { essayQuestion, essayMinWords, essayMaxWords, essayInstructions, moduleId, ...lessonFields } = req.body;
      
      const lessonData = insertLessonSchema.parse({
        ...lessonFields,
        courseId,
        moduleId: moduleId && moduleId.trim() !== '' ? moduleId : null,
      });
      const lesson = await storage.createLesson(lessonData);
      
      // If essay question is provided, create the essay question for this lesson
      if (essayQuestion && essayQuestion.trim()) {
        await storage.createLessonEssayQuestion({
          lessonId: lesson.id,
          questionText: essayQuestion.trim(),
          minWords: essayMinWords ? parseInt(essayMinWords) : 50,
          maxWords: essayMaxWords ? parseInt(essayMaxWords) : 200,
          instructions: essayInstructions || null,
        });
      }
      
      res.json(lesson);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Bulk create lessons - schema for validation
  const bulkLessonItemSchema = z.object({
    title: z.string().min(1, "Dars nomi kiritilishi shart"),
    videoUrl: z.string().min(1, "Video linki kiritilishi shart"),
    description: z.string().optional().default(''),
    pdfUrl: z.string().optional().default(''),
    duration: z.union([z.string(), z.number(), z.null()]).optional(),
    isDemo: z.boolean().optional().default(false),
  });
  
  const bulkLessonsSchema = z.object({
    lessons: z.array(bulkLessonItemSchema).min(1, "Kamida bitta dars kiritilishi kerak"),
  });

  app.post('/api/instructor/courses/:courseId/lessons/bulk', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.claims.sub;
      
      // Validate request body
      const validationResult = bulkLessonsSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ');
        return res.status(400).json({ message: errors });
      }
      
      const { lessons: lessonsData } = validationResult.data;
      
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
      
      // Get current lesson count for ordering
      const existingLessons = await storage.getLessonsByCourse(courseId);
      let currentOrder = existingLessons.length;
      
      const createdLessons = [];
      for (const lessonData of lessonsData) {
        currentOrder++;
        const parsedDuration = lessonData.duration 
          ? (typeof lessonData.duration === 'string' ? parseInt(lessonData.duration) : lessonData.duration)
          : null;
          
        const lesson = await storage.createLesson({
          courseId,
          title: lessonData.title,
          videoUrl: lessonData.videoUrl,
          description: lessonData.description || '',
          pdfUrl: lessonData.pdfUrl || '',
          duration: parsedDuration,
          isDemo: lessonData.isDemo || false,
          order: currentOrder,
        });
        createdLessons.push(lesson);
      }
      
      res.json({ 
        message: `${createdLessons.length} ta dars muvaffaqiyatli yaratildi`,
        lessons: createdLessons 
      });
    } catch (error: any) {
      console.error('Bulk lesson creation error:', error);
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
      
      // Extract essay fields before updating lesson
      const { essayQuestion, essayMinWords, essayMaxWords, essayInstructions, moduleId, ...lessonFields } = req.body;
      
      // Handle moduleId - convert empty string to null
      const updateData = {
        ...lessonFields,
        moduleId: moduleId !== undefined ? (moduleId && moduleId.trim() !== '' ? moduleId : null) : undefined,
      };
      
      const updatedLesson = await storage.updateLesson(lessonId, updateData);
      
      // Handle essay question update/create
      if (essayQuestion !== undefined) {
        const existingEssay = await storage.getLessonEssayQuestion(lessonId);
        if (essayQuestion && essayQuestion.trim()) {
          if (existingEssay) {
            // Update existing essay question
            await storage.updateLessonEssayQuestion(existingEssay.id, {
              questionText: essayQuestion.trim(),
              minWords: essayMinWords ? parseInt(essayMinWords) : 50,
              maxWords: essayMaxWords ? parseInt(essayMaxWords) : 200,
              instructions: essayInstructions || null,
            });
          } else {
            // Create new essay question
            await storage.createLessonEssayQuestion({
              lessonId,
              questionText: essayQuestion.trim(),
              minWords: essayMinWords ? parseInt(essayMinWords) : 50,
              maxWords: essayMaxWords ? parseInt(essayMaxWords) : 200,
              instructions: essayInstructions || null,
            });
          }
        } else if (existingEssay) {
          // Remove essay question if cleared
          await storage.deleteLessonEssayQuestion(existingEssay.id);
        }
      }
      
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

  // Test Import/Export - Download Template
  app.get('/api/instructor/tests/:testId/template', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const { type } = req.query; // 'blank' or 'sample'
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
      
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Define headers - 6 ustunli sodda format
      const headers = [
        'Tartib',
        'Turi',
        'Savol',
        'Options',
        'Javob',
        'Ball'
      ];
      
      let data: any[][] = [headers];
      
      if (type === 'sample') {
        // Add sample data for each question type - har bir savol bitta qatorda!
        data.push(
          // Multiple Choice - Variantlar Options ustunida | bilan ajratilgan
          ['1', 'multiple_choice', "O'zbekiston poytaxti qayer", 'Toshkent|Samarqand|Buxoro|Namangan', 'Toshkent', '1'],
          
          // True/False
          ['2', 'true_false', 'Yer dumaloq shakldami?', '', 'true', '1'],
          
          // Fill in Blanks
          ['3', 'fill_blanks', "O'zbekistonning poytaxti ___", '', 'Toshkent', '1'],
          
          // Matching - Juftliklar Options ustunida vergul bilan ajratilgan
          ['4', 'matching', "So'zlarni tarjima qiling", 'Book|Kitob,Pen|Qalam,House|Uy', '', '1'],
          
          // Short Answer
          ['5', 'short_answer', 'Python nima?', '', 'Dasturlash tili', '1'],
          
          // Essay (javob va options bo'sh)
          ['6', 'essay', 'Sun\'iy intellekt haqida fikringiz yozing', '', '', '2']
        );
      }
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 8 },   // Tartib
        { wch: 18 },  // Turi
        { wch: 40 },  // Savol
        { wch: 50 },  // Options
        { wch: 20 },  // Javob
        { wch: 6 },   // Ball
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Savollar');
      
      // Generate buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const filename = type === 'sample' 
        ? `test-template-namuna-${testId}.xlsx`
        : `test-template-${testId}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Template generation error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Helper functions for Excel import
  
  // Extract optional enumerator and body from option text
  // Examples: "(A) Foo" -> { enumerator: "A", body: "Foo" }
  //           "A) Bar" -> { enumerator: "A", body: "Bar" }
  //           "Foo" -> { enumerator: null, body: "Foo" }
  function extractOptionParts(value: string): { enumerator: string | null; body: string } {
    const trimmed = value.trim();
    
    // Match enumerator patterns - requires closing bracket OR punctuation delimiter:
    // ^\s*[\(\[\{]? - optional opening bracket
    // ([A-Za-z]+|\d+|[IVXLCDM]+) - letter(s), digit(s), or roman numeral (group 1)
    // ([\)\]\}]\s*|\s*[\.\-:–—]+\s*) - EITHER closing bracket OR punctuation (with optional space before/after) (group 2)
    // 
    // Matches:
    //   A)Foo ✓ (closing paren)
    //   A) Foo ✓ (closing paren + space)
    //   A - Foo ✓ (space + hyphen + space)
    //   A. Foo ✓ (dot + space)
    //   (A) Foo ✓ (both brackets)
    //   1.Bar ✓ (dot)
    // Rejects:
    //   Toshkent ✗ (no bracket/delimiter)
    //   Toshkent shahar ✗ (space only, no punctuation)
    //   A Foo ✗ (space only, no punctuation)
    const enumeratorPattern = /^\s*[\(\[\{]?([A-Za-z]+|\d+|[IVXLCDM]+)([\)\]\}]\s*|\s*[\.\-:–—]+\s*)/;
    const match = trimmed.match(enumeratorPattern);
    
    if (match && match[1]) {
      const delimiterPart = match[2];
      
      // CRITICAL: Reject if delimiter contains ONLY whitespace (no bracket/punctuation)
      // Accept if delimiter has ANY of: ), ], }, ., -, :, –, —
      // This prevents "A Foo" or "Toshkent shahar" from being treated as enumerated
      const hasPunctuation = /[\)\]\}\.\-:–—]/.test(delimiterPart);
      if (!hasPunctuation) {
        return { enumerator: null, body: trimmed };
      }
      
      const enumerator = match[1];
      const body = trimmed.slice(match[0].length).trim();
      return { enumerator, body };
    }
    
    // No enumerator found, return full text as body
    return { enumerator: null, body: trimmed };
  }
  
  // Normalize answer token for matching - removes punctuation, spaces, lowercase
  function normalizeAnswerToken(value: string): string {
    return value.toLowerCase().replace(/[().\s,;:!?\-–—]/g, '');
  }
  
  // Parse points with locale support (1,0 -> 1.0)
  function parsePoints(raw: string): number | null {
    if (!raw) return null; // Bo'sh -> null (default 1 bo'ladi)
    
    // Trim and convert locale comma to dot
    const cleaned = raw.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    
    // Validate
    if (!Number.isFinite(num) || num <= 0) {
      return null; // Invalid -> null (xato berish uchun)
    }
    
    return num;
  }
  
  // Get letter label for variant index (0 -> A, 1 -> B, ...)
  function getLetterLabel(index: number): string {
    return String.fromCharCode(65 + index); // 65 = 'A'
  }

  // Test Import - Upload and Parse Excel
  app.post('/api/instructor/tests/:testId/import-questions', 
    isAuthenticated, 
    isInstructor, 
    upload.single('file'),
    async (req: any, res) => {
      try {
        const { testId } = req.params;
        const instructorId = req.user.claims.sub;
        
        if (!req.file) {
          return res.status(400).json({ message: 'File yuklash kerak' });
        }
        
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
        
        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Remove header row
        const dataRows = rawData.slice(1);
        
        // Validate and prepare questions for import
        const questionsToCreate: any[] = [];
        const errors: string[] = [];
        const validQuestionTypes = ['multiple_choice', 'true_false', 'fill_blanks', 'matching', 'short_answer', 'essay'];
        
        // Yangi 6 ustunli format - har bir savol bitta qatorda!
        // Format: Tartib | Turi | Savol | Options | Javob | Ball
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNum = i + 2; // Excel row number (1-indexed + header)
          
          // Skip completely empty rows
          if (!row || row.length === 0) continue;
          
          // Parse row columns
          // row[0] = Tartib (1, 2, 3...)
          // row[1] = Turi (multiple_choice, true_false, ...)
          // row[2] = Savol
          // row[3] = Options (Multiple choice: A|B|C, Matching: L1|R1,L2|R2)
          // row[4] = Javob (To'g'ri javob)
          // row[5] = Ball
          
          const order = parseInt(row[0]?.toString().trim() || '');
          const type = row[1]?.toString().trim();
          const questionText = row[2]?.toString().trim();
          const optionsText = row[3]?.toString().trim() || '';
          const answerText = row[4]?.toString().trim() || '';
          const pointsText = row[5]?.toString().trim();
          
          // Parse points with locale support
          const parsedPoints = parsePoints(pointsText);
          const points = parsedPoints !== null ? parsedPoints : 1; // Default 1 if empty or invalid
          
          // Basic validation
          if (isNaN(order) || order < 1) {
            errors.push(`Qator ${rowNum}: Tartib raqami noto'g'ri`);
            continue;
          }
          
          if (!type || !validQuestionTypes.includes(type)) {
            errors.push(`Qator ${rowNum}: Turi noto'g'ri. Faqat: ${validQuestionTypes.join(', ')}`);
            continue;
          }
          
          if (!questionText) {
            errors.push(`Qator ${rowNum}: Savol matni bo'sh`);
            continue;
          }
          
          // Points validation - parsedPoints null bo'lsa va pointsText mavjud bo'lsa, xato
          if (pointsText && parsedPoints === null) {
            errors.push(`Qator ${rowNum}: Ball noto'g'ri format. Raqam kiriting (masalan: 1, 1.5, 2,0)`);
            continue;
          }
          
          // Prepare question object
          const question: any = {
            order,
            type,
            questionText,
            points,
            correctAnswer: null,
            options: []
          };
          
          // Type-specific parsing
          if (type === 'multiple_choice') {
            // Options ustunida | bilan ajratilgan variantlar
            // Javob ustunida to'g'ri javob
            if (!optionsText) {
              errors.push(`Qator ${rowNum}: Multiple choice uchun Options ustunida variantlar bo'lishi kerak (masalan: A|B|C|D)`);
              continue;
            }
            
            const variants = optionsText.split('|').map((v: string) => v.trim()).filter((v: string) => v);
            if (variants.length < 2) {
              errors.push(`Qator ${rowNum}: Kamida 2 ta variant bo'lishi kerak`);
              continue;
            }
            
            if (!answerText) {
              errors.push(`Qator ${rowNum}: Javob ustunida to'g'ri javob bo'lishi kerak`);
              continue;
            }
            
            // Build multi-key lookup map with safe insertion (no overwrites)
            const answerMap = new Map<string, number>();
            
            // Helper to add key only if not already present
            const addKey = (key: string, idx: number) => {
              if (key && !answerMap.has(key)) {
                answerMap.set(key, idx);
              }
            };
            
            variants.forEach((variant: string, idx: number) => {
              // Extract enumerator and body
              const { enumerator, body } = extractOptionParts(variant);
              
              // Priority 1: Letter label (A, B, C, ...)
              const letterKey = getLetterLabel(idx).toLowerCase();
              addKey(letterKey, idx);
              
              // Priority 2: Enumerator from option text (if present)
              if (enumerator) {
                addKey(enumerator.toLowerCase(), idx);
              }
              
              // Priority 3: Normalized body text (most common for plain text answers)
              const normalizedBody = normalizeAnswerToken(body);
              addKey(normalizedBody, idx);
              
              // Priority 4: Normalized full text
              const normalizedFull = normalizeAnswerToken(variant);
              addKey(normalizedFull, idx);
              
              // Priority 5: Lowercase full text
              const lowerFull = variant.toLowerCase().trim();
              addKey(lowerFull, idx);
            });
            
            // Find correct answer by trying all normalized forms
            const normalizedAnswer = normalizeAnswerToken(answerText);
            const lowerAnswer = answerText.toLowerCase().trim();
            const answerLetter = answerText.trim().charAt(0).toLowerCase();
            
            let correctIndex: number | undefined;
            
            // Try in priority order
            if (answerMap.has(normalizedAnswer)) {
              correctIndex = answerMap.get(normalizedAnswer);
            } else if (answerMap.has(lowerAnswer)) {
              correctIndex = answerMap.get(lowerAnswer);
            } else if (answerMap.has(answerLetter) && /^[a-z]$/i.test(answerText.trim())) {
              // Single letter answer (A, B, C...)
              correctIndex = answerMap.get(answerLetter);
            }
            
            if (correctIndex === undefined) {
              errors.push(`Qator ${rowNum}: To'g'ri javob topilmadi. Javob "${answerText}" Options ichida yo'q. Harfli (A, B, C) yoki to'liq matnli javob kiriting.`);
              continue;
            }
            
            // Build options with correct answer marked
            variants.forEach((variant: string, idx: number) => {
              question.options.push({
                optionText: variant,
                isCorrect: idx === correctIndex,
                order: idx + 1
              });
            });
          } else if (type === 'matching') {
            // Options ustunida vergul bilan ajratilgan juftliklar
            // Format: Chap1|O'ng1,Chap2|O'ng2,Chap3|O'ng3
            // Javob ustuni matching uchun ishlatilmaydi (bo'sh bo'lishi mumkin)
            if (!optionsText) {
              errors.push(`Qator ${rowNum}: Matching uchun Options ustunida juftliklar bo'lishi kerak (masalan: Book|Kitob,Pen|Qalam)`);
              continue;
            }
            
            const pairs = optionsText.split(',').map((p: string) => p.trim()).filter((p: string) => p);
            if (pairs.length < 2) {
              errors.push(`Qator ${rowNum}: Kamida 2 ta juftlik bo'lishi kerak`);
              continue;
            }
            
            // Har bir juftlikni tekshirish
            let hasInvalidPair = false;
            for (const pair of pairs) {
              if (!pair.includes('|')) {
                errors.push(`Qator ${rowNum}: Matching juftlik noto'g'ri format: "${pair}". Format: Chap|O'ng`);
                hasInvalidPair = true;
                break;
              }
              
              question.options.push({
                optionText: pair,
                isCorrect: false,
                order: question.options.length + 1
              });
            }
            
            if (hasInvalidPair) continue;
          } else if (type === 'true_false') {
            // Javob ustunida faqat "true" yoki "false"
            if (!answerText) {
              errors.push(`Qator ${rowNum}: True/False javob kiritish shart (Javob ustunida)`);
              continue;
            }
            
            const normalizedAnswer = answerText.toLowerCase();
            if (normalizedAnswer !== 'true' && normalizedAnswer !== 'false') {
              errors.push(`Qator ${rowNum}: True/False javob faqat "true" yoki "false" bo'lishi kerak`);
              continue;
            }
            
            question.correctAnswer = normalizedAnswer;
          } else if (['fill_blanks', 'short_answer'].includes(type)) {
            // Javob ustunida to'g'ri javob
            if (!answerText) {
              errors.push(`Qator ${rowNum}: Javob ustunida to'g'ri javob bo'lishi kerak`);
              continue;
            }
            
            question.correctAnswer = answerText;
          } else if (type === 'essay') {
            // Essay uchun javob ixtiyoriy (bo'sh bo'lishi mumkin)
            // Downstream kod string kutmoqda, shuning uchun null o'rniga '' ishlatamiz
            question.correctAnswer = answerText || '';
          }
          
          questionsToCreate.push(question);
        }
        
        // If there are validation errors, return them
        if (errors.length > 0) {
          return res.status(400).json({ 
            message: 'Faylda xatolar mavjud',
            errors,
            importedCount: 0
          });
        }
        
        // Import questions in a transaction
        let importedCount = 0;
        await db.transaction(async (tx: any) => {
          for (const q of questionsToCreate) {
            // Create question
            const [createdQuestion] = await tx
              .insert(questions)
              .values({
                testId,
                type: q.type,
                questionText: q.questionText,
                points: q.points,
                order: q.order,
                mediaUrl: q.mediaUrl,
                correctAnswer: q.correctAnswer,
              })
              .returning();
            
            // Create options if any
            if (q.options.length > 0) {
              await tx.insert(questionOptions).values(
                q.options.map((opt: any) => ({
                  questionId: createdQuestion.id,
                  optionText: opt.optionText,
                  isCorrect: opt.isCorrect,
                  order: opt.order,
                }))
              );
            }
            
            importedCount++;
          }
        });
        
        res.json({ 
          message: `${importedCount} ta savol muvaffaqiyatli yuklandi`,
          importedCount,
          errors: []
        });
      } catch (error: any) {
        console.error('Import error:', error);
        res.status(500).json({ message: error.message });
      }
    }
  );

  // ============ PUBLIC ROUTES (No Auth Required) ============
  // Public courses endpoint with filters
  app.get('/api/courses/public', async (req: any, res) => {
    try {
      const { search, category, minPrice, maxPrice, instructorId, hasDiscount, levelId, resourceTypeIds } = req.query;
      
      const filters = {
        search: search as string | undefined,
        category: category as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        instructorId: instructorId as string | undefined,
        hasDiscount: hasDiscount === 'true' ? true : undefined,
        levelId: levelId as string | undefined,
        resourceTypeIds: resourceTypeIds ? (resourceTypeIds as string).split(',') : undefined,
      };

      const courses = await storage.getPublicCourses(filters);
      
      // Add average rating and total ratings for each course
      // Wrap in error handling to prevent rating feature from breaking course display
      const coursesWithRatings = await Promise.all(
        courses.map(async (course) => {
          try {
            const avgRating = await storage.getCourseAverageRating(course.id);
            return {
              ...course,
              averageRating: avgRating.average,
              totalRatings: avgRating.count,
            };
          } catch (aggregationError: any) {
            // If aggregation fails, return course with default values
            console.error(`Error aggregating data for course ${course.id}:`, aggregationError.message);
            return {
              ...course,
              averageRating: 0,
              totalRatings: 0,
            };
          }
        })
      );
      
      res.json(coursesWithRatings);
    } catch (error: any) {
      console.error('Error in /api/courses/public:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public lessons endpoint - shows demo lessons with video, premium lessons with minimal info
  app.get('/api/courses/:courseId/lessons/public', async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Check if course exists and is published
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.status !== 'published') {
        return res.status(404).json({ message: "Course not available" });
      }
      
      const lessons = await storage.getLessonsByCourse(courseId);
      
      // Return 404 if no lessons exist
      if (!lessons || lessons.length === 0) {
        return res.status(404).json({ message: "No lessons available" });
      }
      
      // Sort lessons by order
      const sortedLessons = lessons.sort((a, b) => a.order - b.order);
      
      // For security: Return only safe fields for all lessons
      const publicLessons = sortedLessons.map(lesson => {
        if (lesson.isDemo) {
          // Demo lessons - include video URL and PDF for viewing
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || '',
            videoUrl: lesson.videoUrl, // Include for demo lessons
            pdfUrl: lesson.pdfUrl, // Include PDF resources for demo lessons
            duration: lesson.duration,
            order: lesson.order,
            isDemo: lesson.isDemo,
            courseId: lesson.courseId,
            moduleId: lesson.moduleId, // Include for module grouping
          };
        } else {
          // Premium lessons - return only safe fields (no video URL or PDF)
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || '',
            duration: lesson.duration,
            order: lesson.order,
            isDemo: lesson.isDemo,
            courseId: lesson.courseId,
            moduleId: lesson.moduleId, // Include for module grouping
            videoUrl: '', // Explicitly empty for security
            pdfUrl: '', // Explicitly empty for security
          };
        }
      });
      
      res.json(publicLessons);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public modules endpoint - returns course modules for public display
  app.get('/api/courses/:courseId/modules/public', async (req, res) => {
    try {
      const { courseId } = req.params;
      
      // Check if course exists and is published
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      if (course.status !== 'published') {
        return res.status(404).json({ message: "Course not available" });
      }
      
      const modules = await storage.getCourseModules(courseId);
      
      // Return only public-safe fields
      const publicModules = modules.map(m => ({
        id: m.id,
        courseId: m.courseId,
        title: m.title,
        description: m.description,
        order: m.order,
      }));
      
      res.json(publicModules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public course ratings endpoints
  app.get('/api/courses/:courseId/ratings', async (req, res) => {
    try {
      const { courseId } = req.params;
      const ratings = await storage.getCourseRatings(courseId);
      res.json(ratings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/rating/average', async (req, res) => {
    try {
      const { courseId } = req.params;
      const averageRating = await storage.getCourseAverageRating(courseId);
      res.json(averageRating);
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

  // Lesson Progress endpoints
  app.get('/api/lessons/:lessonId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      const progress = await storage.getLessonProgress(lessonId, userId);
      res.json(progress || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/lessons/:lessonId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      const { watchedSeconds, totalSeconds, lastPosition, completed } = req.body;
      
      const progress = await storage.upsertLessonProgress({
        userId,
        lessonId,
        watchedSeconds,
        totalSeconds,
        lastPosition,
        completed,
        completedAt: completed ? new Date() : undefined,
      });
      
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const progress = await storage.getLessonProgressByCourse(courseId, userId);
      res.json(progress);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ ESSAY QUESTION ROUTES ============
  // Get all essay questions for a course (to show indicators in lesson list)
  app.get('/api/courses/:courseId/essay-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      
      // Check if user has access to this course (enrolled student, instructor, or admin)
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Admins and instructors can see essay questions for any course
      if (user.role !== 'admin' && user.role !== 'instructor') {
        // For students, check enrollment
        const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
        if (!enrollment || (enrollment.paymentStatus !== 'confirmed' && enrollment.paymentStatus !== 'approved')) {
          return res.status(403).json({ message: "Not enrolled in this course" });
        }
      }
      
      const essayQuestions = await storage.getEssayQuestionsByCourse(courseId);
      res.json(essayQuestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get essay question for a lesson (instructor/student)
  app.get('/api/lessons/:lessonId/essay-question', async (req: any, res) => {
    try {
      const { lessonId } = req.params;
      const essayQuestion = await storage.getLessonEssayQuestion(lessonId);
      res.json(essayQuestion || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get student's essay submission for a lesson
  app.get('/api/lessons/:lessonId/essay-submission', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      
      // First get the essay question for this lesson
      const essayQuestion = await storage.getLessonEssayQuestion(lessonId);
      if (!essayQuestion) {
        return res.json(null);
      }
      
      const submission = await storage.getEssaySubmission(essayQuestion.id, userId);
      res.json(submission || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Submit essay for a lesson
  app.post('/api/lessons/:lessonId/essay-submission', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId } = req.params;
      const { essayText, wordCount } = req.body;
      
      // Get the essay question
      const essayQuestion = await storage.getLessonEssayQuestion(lessonId);
      if (!essayQuestion) {
        return res.status(404).json({ message: "Bu dars uchun insho topshirig'i mavjud emas" });
      }
      
      // Check if student already submitted
      const existingSubmission = await storage.getEssaySubmission(essayQuestion.id, userId);
      if (existingSubmission) {
        return res.status(400).json({ message: "Siz allaqachon insho yuborgansiz" });
      }
      
      // Validate word count
      if (wordCount < essayQuestion.minWords) {
        return res.status(400).json({ message: `Kamida ${essayQuestion.minWords} so'z yozing` });
      }
      if (wordCount > essayQuestion.maxWords) {
        return res.status(400).json({ message: `Maksimal ${essayQuestion.maxWords} so'z yozishingiz mumkin` });
      }
      
      const submission = await storage.createEssaySubmission({
        essayQuestionId: essayQuestion.id,
        studentId: userId,
        essayText,
        wordCount,
      });
      
      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check essay with AI (one-time only)
  app.post('/api/essay-submissions/:submissionId/check', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { submissionId } = req.params;
      
      // Get submission and verify ownership
      const [submission] = await db
        .select()
        .from(essaySubmissions)
        .where(eq(essaySubmissions.id, submissionId));
      
      if (!submission) {
        return res.status(404).json({ message: "Insho topilmadi" });
      }
      
      if (submission.studentId !== userId) {
        return res.status(403).json({ message: "Ruxsat berilmagan" });
      }
      
      if (submission.aiChecked) {
        return res.status(400).json({ message: "Bu insho allaqachon tekshirilgan. Faqat bir marta tekshirish mumkin." });
      }
      
      // Get the essay question for context
      const essayQuestion = await storage.getLessonEssayQuestion(submission.essayQuestionId);
      
      // Call OpenAI API to check the essay
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `Siz arab tili o'qituvchisisiz. O'quvchining arab tilidagi inshosini tekshiring va o'zbek tilida batafsil javob bering.

Quyidagilarni tekshiring:
1. Grammatika xatolari - Arab tili grammatikasi bo'yicha xatolarni toping
2. Imlo xatolari - Yozuv xatolarini aniqlang
3. Uslub - Matn uslubi va ifoda to'g'riligini baholang
4. Mazmun - Matnning mazmuni va mantiqiy bog'liqligini tekshiring

Javobingizni quyidagi formatda bering:
- Umumiy ball (0-100)
- Grammatika xatolari ro'yxati (arabcha va to'g'ri varianti bilan)
- Imlo xatolari ro'yxati
- Uslub bo'yicha tavsiyalar
- Umumiy sharh va tavsiyalar

Javob faqat O'ZBEK tilida bo'lsin!`;

      const userPrompt = `Insho savoli: ${essayQuestion?.questionText || "Mavzu berilmagan"}

O'quvchi javodi:
${submission.essayText}

So'zlar soni: ${submission.wordCount}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || "Xatolik yuz berdi";
      
      // Parse AI response to extract score (simplified)
      let overallScore = 70; // Default score
      const scoreMatch = aiResponse.match(/(\d{1,3})\s*(?:ball|%|\/100)/i);
      if (scoreMatch) {
        overallScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
      }
      
      // Update submission with AI feedback
      const updatedSubmission = await storage.updateEssaySubmissionAI(submissionId, {
        aiFeedback: aiResponse,
        overallScore,
      });
      
      res.json(updatedSubmission);
    } catch (error: any) {
      console.error('[Essay Check] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/student/enrolled-courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[Enrolled Courses] Request from userId:', userId);
      const courses = await storage.getEnrolledCourses(userId);
      console.log('[Enrolled Courses] Found', courses.length, 'courses for user:', userId);
      res.json(courses);
    } catch (error: any) {
      console.error('[Enrolled Courses] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Student Progress Tracking
  app.get('/api/student/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getStudentProgress(userId);
      res.json(progress);
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
      const { courseId, paymentMethod, paymentProofUrl } = req.body;
      
      // Manual payment only (naqd/karta/payme)
      if (!paymentMethod || (paymentMethod !== 'naqd' && paymentMethod !== 'karta' && paymentMethod !== 'payme')) {
        return res.status(400).json({ message: "Faqat naqd, karta yoki payme to'lov usuli qabul qilinadi" });
      }
      
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
      res.json(enrollment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Student course rating endpoints (only enrolled students can rate)
  app.post('/api/courses/:courseId/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const { rating, review } = req.body;
      
      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating 1 dan 5 gacha bo'lishi kerak" });
      }
      
      // Check if user is enrolled and approved
      const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
      if (!enrollment || (enrollment.paymentStatus !== 'confirmed' && enrollment.paymentStatus !== 'approved')) {
        return res.status(403).json({ message: "Faqat kursga yozilgan talabalar baholashi mumkin" });
      }
      
      const courseRating = await storage.createOrUpdateCourseRating(courseId, userId, rating, review);
      res.json(courseRating);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/rating/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const rating = await storage.getUserCourseRating(courseId, userId);
      res.json(rating || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Course Like endpoints ("Qiziqtirdi" feature - public for authenticated users)
  app.post('/api/courses/:courseId/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      
      // Check if already liked
      const alreadyLiked = await storage.checkIfUserLikedCourse(courseId, userId);
      if (alreadyLiked) {
        return res.status(400).json({ message: "Siz allaqachon ushbu kursni yoqtirdingiz" });
      }
      
      const like = await storage.createCourseLike(courseId, userId);
      const likeCount = await storage.getCourseLikeCount(courseId);
      res.json({ like, likeCount });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete('/api/courses/:courseId/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      
      await storage.deleteCourseLike(courseId, userId);
      const likeCount = await storage.getCourseLikeCount(courseId);
      res.json({ likeCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/likes', async (req, res) => {
    try {
      const { courseId } = req.params;
      const likeCount = await storage.getCourseLikeCount(courseId);
      res.json({ count: likeCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/courses/:courseId/likes/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId } = req.params;
      const isLiked = await storage.checkIfUserLikedCourse(courseId, userId);
      res.json({ isLiked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
      const scoreMessage = `${grade}/100 ball`;
      const fullMessage = status === 'graded' 
        ? `${scoreMessage}. ${feedback}`
        : `${feedback}`;
      const notificationData = insertNotificationSchema.parse({
        userId: submission.userId,
        type: status === 'graded' ? 'assignment_graded' : 'revision_requested',
        title: statusMessage,
        message: fullMessage,
        relatedId: submission.id,
        isRead: false,
      });
      await storage.createNotification(notificationData);
      
      res.json(submission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qituvchi - Vazifani o'chirish
  app.delete('/api/instructor/submissions/:id', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { id } = req.params;
      
      // Authorization check: ensure submission belongs to instructor's course
      const submissions = await storage.getSubmissionsByInstructor(instructorId);
      const submissionData = submissions.find((s: any) => s.submission.id === id);
      
      if (!submissionData) {
        return res.status(403).json({ message: "Sizga bu vazifani o'chirish huquqi yo'q" });
      }
      
      await storage.deleteSubmission(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qituvchi - E'lon yuborish (Announcement)
  app.post('/api/instructor/announcements', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      
      // Extract targetId before parsing to handle array case
      const { targetId: rawTargetId, ...otherFields } = req.body;
      
      // For database storage, convert array to JSON string if needed
      const targetIdForStorage = Array.isArray(rawTargetId) 
        ? JSON.stringify(rawTargetId) 
        : rawTargetId;
      
      const announcementData = insertAnnouncementSchema.parse({
        ...otherFields,
        targetId: targetIdForStorage,
        instructorId,
      });
      
      // Create announcement
      const announcement = await storage.createAnnouncement(announcementData);
      
      // Send notifications based on targetType
      const { targetType, title, message, priority } = announcementData;
      let recipients: string[] = [];
      
      if (targetType === 'individual' && rawTargetId) {
        // Yakka tartibda - bitta o'quvchiga
        recipients = [rawTargetId];
      } else if (targetType === 'course' && rawTargetId) {
        // Guruhga - kurs o'quvchilariga (supports single or multiple courses)
        const courseIds = Array.isArray(rawTargetId) ? rawTargetId : [rawTargetId];
        const allEnrollments = await Promise.all(
          courseIds.map(id => storage.getEnrollmentsByCourse(id))
        );
        // Flatten and deduplicate recipients from all courses
        recipients = Array.from(new Set(allEnrollments.flat().map(e => e.userId)));
      } else if (targetType === 'all') {
        // Barchaga - barcha o'quvchilarga
        const students = await storage.getUsersByRole('student');
        recipients = students.map(s => s.id);
      }
      
      // Create notifications for all recipients
      const notificationPromises = recipients.map(userId => {
        const notificationData = insertNotificationSchema.parse({
          userId,
          type: 'announcement',
          title: `${priority === 'urgent' ? '🔴 MUHIM: ' : '📢 '}${title}`,
          message,
          relatedId: announcement.id,
          isRead: false,
        });
        return storage.createNotification(notificationData);
      });
      
      await Promise.all(notificationPromises);
      
      res.json({ 
        ...announcement, 
        recipientCount: recipients.length 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // O'qituvchi - E'lonlarni olish
  app.get('/api/instructor/announcements', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const announcements = await storage.getAnnouncementsByInstructor(instructorId);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qituvchi - E'lonni o'chirish
  app.delete('/api/instructor/announcements/:id', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { id } = req.params;
      
      // Authorization check
      const announcement = await storage.getAnnouncement(id);
      if (!announcement) {
        return res.status(404).json({ message: "E'lon topilmadi" });
      }
      if (announcement.instructorId !== instructorId) {
        return res.status(403).json({ message: "Sizga bu e'lonni o'chirish huquqi yo'q" });
      }
      
      await storage.deleteAnnouncement(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== COURSE ANALYTICS ====================
  
  // Get course analytics (enrollment trends, completion rate, scores)
  app.get('/api/instructor/courses/:courseId/analytics', isAuthenticated, isInstructor, async (req: any, res) => {
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
      
      const analytics = await storage.getCourseAnalytics(courseId);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== CHAT (Private Messaging) ====================
  
  // Get or create conversation
  app.post('/api/chat/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { instructorId, studentId } = req.body;
      
      // Get user role from database to ensure accuracy
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Determine who is the student and who is the instructor
      let finalStudentId: string;
      let finalInstructorId: string;
      
      if (currentUser.role === 'student') {
        finalStudentId = userId;
        finalInstructorId = instructorId;
      } else if (currentUser.role === 'instructor') {
        finalStudentId = studentId;
        finalInstructorId = userId;
      } else {
        return res.status(400).json({ message: "Invalid role for chat" });
      }
      
      // Validate both IDs are present
      if (!finalStudentId || !finalInstructorId) {
        return res.status(400).json({ message: "Missing required participant IDs" });
      }
      
      const conversation = await storage.getOrCreateConversation(finalStudentId, finalInstructorId);
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user's conversations
  app.get('/api/chat/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user role from database to ensure accuracy
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      console.log('[CHAT DEBUG] Getting conversations for user:', userId, 'role:', currentUser.role);
      const conversations = await storage.getConversations(userId, currentUser.role);
      console.log('[CHAT DEBUG] Found conversations:', conversations.length);
      res.json(conversations);
    } catch (error: any) {
      console.error('[CHAT DEBUG] Error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get messages in a conversation
  app.get('/api/chat/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Send message
  app.post('/api/chat/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const { content } = req.body;
      
      const message = await storage.sendMessage(id, userId, content);
      
      // Create notification for the recipient
      const conversation = await storage.getConversationById(id);
      
      if (conversation) {
        // Determine recipient (the other person in the conversation)
        const recipientId = conversation.studentId === userId 
          ? conversation.instructorId 
          : conversation.studentId;
        
        // Get sender info for notification message
        const sender = await storage.getUser(userId);
        const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Kimdir';
        
        // Create notification
        await storage.createNotification({
          userId: recipientId,
          type: 'chat_message',
          title: 'Yangi xabar',
          message: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          relatedId: id,
        });
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Mark messages as read
  app.patch('/api/chat/conversations/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      await storage.markMessagesAsRead(id, userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get unread message count
  app.get('/api/chat/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
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
      
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qilgan deb belgilash
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(id);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Barchasini o'qilgan deb belgilash
  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // O'qilgan ogohlantirishlarni tozalash
  app.delete('/api/notifications/clear-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearReadNotifications(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Barcha ogohlantirishlarni tozalash
  app.delete('/api/notifications/clear-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearAllNotifications(userId);
      res.json({ success: true });
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

  // ============ SITE SETTINGS & TESTIMONIALS (CMS) ============
  
  // Admin: Upload certificate image
  app.post('/api/admin/upload-certificate', isAdmin, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Fayl yuklanmadi" });
      }

      // Validate file type (only images)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi" });
      }

      // Validate file size (max 5MB)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Fayl hajmi 5MB dan oshmasligi kerak" });
      }

      // Generate safe filename using UUID
      const crypto = await import('crypto');
      const fileExt = req.file.mimetype.split('/')[1];
      const safeFileName = `certificate-${crypto.randomUUID()}.${fileExt}`;
      
      // Upload directly to Object Storage without timestamp
      const filePath = await objectStorage.uploadToFolder(
        req.file.buffer,
        `certificates/${safeFileName}`,
        req.file.mimetype
      );

      // Return the full URL
      const fullUrl = `${req.protocol}://${req.get('host')}${filePath}`;
      res.json({ url: fullUrl, path: filePath });
    } catch (error: any) {
      console.error("Certificate upload error:", error);
      res.status(500).json({ message: error.message || "Fayl yuklashda xatolik" });
    }
  });
  
  // Public: Get all site settings (for HomePage)
  app.get('/api/site-settings', async (_req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin: Upsert site setting (about, contact, etc.)
  app.put('/api/admin/site-settings', isAdmin, async (req, res) => {
    try {
      const validated = insertSiteSettingSchema.parse(req.body);
      const setting = await storage.upsertSiteSetting(validated);
      res.json(setting);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });
  
  // Public: Get published testimonials (for HomePage)
  app.get('/api/testimonials', async (_req, res) => {
    try {
      const testimonials = await storage.getPublishedTestimonials();
      res.json(testimonials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin: Get all testimonials (including unpublished)
  app.get('/api/admin/testimonials', isAdmin, async (_req, res) => {
    try {
      const testimonials = await storage.getAllTestimonials();
      res.json(testimonials);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin: Create testimonial
  app.post('/api/admin/testimonials', isAdmin, async (req, res) => {
    try {
      const validated = insertTestimonialSchema.parse(req.body);
      const testimonial = await storage.createTestimonial(validated);
      res.json(testimonial);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin: Update testimonial
  app.put('/api/admin/testimonials/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validated = insertTestimonialSchema.partial().parse(req.body);
      const testimonial = await storage.updateTestimonial(id, validated);
      res.json(testimonial);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin: Delete testimonial
  app.delete('/api/admin/testimonials/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTestimonial(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LANGUAGE LEVEL ROUTES ============
  // Public: Get active language levels
  app.get('/api/language-levels', async (_req, res) => {
    try {
      const levels = await storage.getActiveLanguageLevels();
      res.json(levels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get all language levels
  app.get('/api/admin/language-levels', isAdmin, async (_req, res) => {
    try {
      const levels = await storage.getLanguageLevels();
      res.json(levels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Create language level
  app.post('/api/admin/language-levels', isAdmin, async (req, res) => {
    try {
      const { name, displayName, description, order, isActive } = req.body;
      const level = await storage.createLanguageLevel({
        code: name,
        name: displayName,
        description,
        order: order ?? 0,
        isActive: isActive ?? true,
      });
      res.json(level);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update language level
  app.put('/api/admin/language-levels/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, displayName, description, order, isActive } = req.body;
      const level = await storage.updateLanguageLevel(id, {
        code: name,
        name: displayName,
        description,
        order,
        isActive,
      });
      res.json(level);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Delete language level
  app.delete('/api/admin/language-levels/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLanguageLevel(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ RESOURCE TYPE ROUTES ============
  // Public: Get active resource types
  app.get('/api/resource-types', async (_req, res) => {
    try {
      const types = await storage.getActiveResourceTypes();
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get all resource types
  app.get('/api/admin/resource-types', isAdmin, async (_req, res) => {
    try {
      const types = await storage.getResourceTypes();
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Create resource type
  app.post('/api/admin/resource-types', isAdmin, async (req, res) => {
    try {
      const { name, displayName, description, icon, order, isActive } = req.body;
      const type = await storage.createResourceType({
        name,
        nameUz: displayName,
        description,
        icon,
        order: order ?? 0,
        isActive: isActive ?? true,
      });
      res.json(type);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update resource type
  app.put('/api/admin/resource-types/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, displayName, description, icon, order, isActive } = req.body;
      const type = await storage.updateResourceType(id, {
        name,
        nameUz: displayName,
        description,
        icon,
        order,
        isActive,
      });
      res.json(type);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Delete resource type
  app.delete('/api/admin/resource-types/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteResourceType(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ COURSE RESOURCE TYPES ROUTES ============
  // Get resource types for a course
  app.get('/api/courses/:courseId/resource-types', async (req, res) => {
    try {
      const { courseId } = req.params;
      const resourceTypes = await storage.getCourseResourceTypes(courseId);
      res.json(resourceTypes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Set resource types for a course (instructor/admin only)
  app.put('/api/courses/:courseId/resource-types', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { resourceTypeIds } = req.body;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Foydalanuvchi topilmadi" });
      }
      
      // Check if user is admin or course instructor
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Kurs topilmadi" });
      }
      
      if (user.role !== 'admin' && course.instructorId !== userId) {
        return res.status(403).json({ message: "Ruxsat yo'q" });
      }
      
      await storage.setCourseResourceTypes(courseId, resourceTypeIds || []);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public: Get all subscription plans
  app.get('/api/subscription-plans', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Create new subscription plan
  app.post('/api/admin/subscription-plans', isAdmin, async (req, res) => {
    try {
      const { name, displayName, description, features } = req.body;
      
      // Get the highest order value
      const existingPlans = await db.select().from(subscriptionPlans);
      const maxOrder = existingPlans.length > 0 
        ? Math.max(...existingPlans.map((p: any) => p.order))
        : 0;
      
      const [newPlan] = await db
        .insert(subscriptionPlans)
        .values({
          name,
          displayName,
          description,
          features,
          order: maxOrder + 1,
        })
        .returning();
      
      res.json(newPlan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update subscription plan
  app.put('/api/admin/subscription-plans/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, displayName, description, features } = req.body;
      
      // Build update object dynamically
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (description !== undefined) updateData.description = description;
      if (features !== undefined) updateData.features = features;
      
      // Update plan in database
      const [updatedPlan] = await db
        .update(subscriptionPlans)
        .set(updateData)
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      if (!updatedPlan) {
        return res.status(404).json({ message: "Tarif topilmadi" });
      }
      
      res.json(updatedPlan);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Delete subscription plan
  app.delete('/api/admin/subscription-plans/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      await db
        .delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id));
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SUBSCRIPTION MANAGEMENT ROUTES ============
  // Get user subscriptions
  app.get('/api/student/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscriptions = await storage.getUserSubscriptions(userId);
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Instructor: Get subscriptions for their courses
  app.get('/api/instructor/subscriptions', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const subscriptions = await storage.getSubscriptionsByInstructor(instructorId);
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Instructor: Get expiring subscriptions (7 days)
  app.get('/api/instructor/subscriptions/expiring', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const daysBeforeExpiry = parseInt(req.query.days as string) || 7;
      
      // Get all subscriptions for instructor's courses
      const allSubs = await storage.getSubscriptionsByInstructor(instructorId);
      
      // Filter expiring subscriptions
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);
      
      const expiringSubs = allSubs.filter((item: any) => {
        const endDate = new Date(item.subscription.endDate);
        return item.subscription.status === 'active' && 
               endDate <= futureDate && 
               endDate > now;
      });
      
      res.json(expiringSubs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Instructor: Cancel subscription
  app.delete('/api/instructor/subscriptions/:id', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const updated = await storage.cancelSubscription(id);
      
      // Send notification to student
      await storage.createNotification({
        userId: updated.userId,
        type: 'warning',
        title: 'Obuna bekor qilindi',
        message: 'Sizning obunangiz bekor qilindi. Qo\'shimcha ma\'lumot uchun o\'qituvchi bilan bog\'laning',
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Instructor: Extend subscription
  app.put('/api/instructor/subscriptions/:id/extend', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { additionalDays } = req.body;
      
      if (!additionalDays || additionalDays < 1) {
        return res.status(400).json({ message: 'additionalDays parametri talab qilinadi va 1dan katta bo\'lishi kerak' });
      }
      
      const updated = await storage.extendSubscription(id, parseInt(additionalDays));
      
      // Send notification to student
      await storage.createNotification({
        userId: updated.userId,
        type: 'info',
        title: 'Obuna muddati uzaytirildi',
        message: `Sizning obuna muddatingiz ${additionalDays} kunga uzaytirildi`,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get all active subscriptions
  app.get('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getAllActiveSubscriptions();
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get expiring subscriptions
  app.get('/api/admin/subscriptions/expiring', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const daysBeforeExpiry = parseInt(req.query.days as string) || 7;
      const subscriptions = await storage.getExpiringSubscriptions(daysBeforeExpiry);
      res.json(subscriptions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Cancel subscription
  app.delete('/api/admin/subscriptions/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      const updated = await storage.cancelSubscription(id);
      
      // Send notification to student
      await storage.createNotification({
        userId: updated.userId,
        type: 'warning',
        title: 'Obuna bekor qilindi',
        message: 'Sizning obunangiz bekor qilindi. Qo\'shimcha ma\'lumot uchun admin bilan bog\'laning',
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Extend subscription
  app.put('/api/admin/subscriptions/:id/extend', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { additionalDays } = req.body;
      
      if (!additionalDays || additionalDays < 1) {
        return res.status(400).json({ message: 'additionalDays parametri talab qilinadi va 1dan katta bo\'lishi kerak' });
      }
      
      const updated = await storage.extendSubscription(id, parseInt(additionalDays));
      
      // Send notification to student
      await storage.createNotification({
        userId: updated.userId,
        type: 'info',
        title: 'Obuna muddati uzaytirildi',
        message: `Sizning obuna muddatingiz ${additionalDays} kunga uzaytirildi`,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update subscription status
  app.put('/api/admin/subscriptions/:id/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const updated = await storage.updateSubscriptionStatus(id, status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Check and update expired subscriptions (cron-like endpoint)
  app.post('/api/admin/subscriptions/check-expired', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.checkAndUpdateExpiredSubscriptions();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ SPEAKING TESTS API ROUTES ============
  
  // INSTRUCTOR: Create speaking test
  app.post('/api/instructor/speaking-tests', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertSpeakingTestSchema.parse({
        ...req.body,
        instructorId: userId,
      });
      
      // Verify instructor owns the course
      const course = await storage.getCourse(data.courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu kursga ruxsat yo\'q' });
      }
      
      const speakingTest = await storage.createSpeakingTest(data);
      res.json(speakingTest);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Get speaking tests by course
  app.get('/api/instructor/courses/:courseId/speaking-tests', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { courseId } = req.params;
      
      // Verify instructor owns the course
      const course = await storage.getCourse(courseId);
      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu kursga ruxsat yo\'q' });
      }
      
      const speakingTests = await storage.getSpeakingTestsByCourse(courseId);
      res.json(speakingTests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Get single speaking test with full structure
  app.get('/api/instructor/speaking-tests/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(id);
      if (!speakingTest) {
        return res.status(404).json({ message: 'Speaking test topilmadi' });
      }
      
      // Verify instructor owns the test
      if (speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu testga ruxsat yo\'q' });
      }
      
      // Get sections
      const sections = await storage.getSpeakingTestSections(id);
      
      // Get questions for each section
      const sectionsWithQuestions = await Promise.all(
        sections.map(async (section) => {
          const questions = await storage.getSpeakingQuestions(section.id);
          return { ...section, questions };
        })
      );
      
      res.json({
        ...speakingTest,
        sections: sectionsWithQuestions,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Update speaking test
  app.put('/api/instructor/speaking-tests/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(id);
      if (!speakingTest) {
        return res.status(404).json({ message: 'Speaking test topilmadi' });
      }
      
      if (speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu testga ruxsat yo\'q' });
      }
      
      const data = insertSpeakingTestSchema.partial().parse(req.body);
      const updated = await storage.updateSpeakingTest(id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Delete speaking test
  app.delete('/api/instructor/speaking-tests/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(id);
      if (!speakingTest) {
        return res.status(404).json({ message: 'Speaking test topilmadi' });
      }
      
      if (speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu testga ruxsat yo\'q' });
      }
      
      await storage.deleteSpeakingTest(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Create section
  app.post('/api/instructor/speaking-tests/:testId/sections', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { testId } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(testId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu testga ruxsat yo\'q' });
      }
      
      const data = insertSpeakingTestSectionSchema.parse({
        ...req.body,
        speakingTestId: testId,
      });
      
      const section = await storage.createSpeakingTestSection(data);
      res.json(section);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Update section
  app.put('/api/instructor/sections/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const section = await storage.getSpeakingTestSection(id);
      if (!section) {
        return res.status(404).json({ message: 'Section topilmadi' });
      }
      
      const speakingTest = await storage.getSpeakingTest(section.speakingTestId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu sectionga ruxsat yo\'q' });
      }
      
      const data = insertSpeakingTestSectionSchema.partial().parse(req.body);
      const updated = await storage.updateSpeakingTestSection(id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Delete section
  app.delete('/api/instructor/sections/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const section = await storage.getSpeakingTestSection(id);
      if (!section) {
        return res.status(404).json({ message: 'Section topilmadi' });
      }
      
      const speakingTest = await storage.getSpeakingTest(section.speakingTestId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu sectionga ruxsat yo\'q' });
      }
      
      await storage.deleteSpeakingTestSection(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Create question
  app.post('/api/instructor/sections/:sectionId/questions', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { sectionId } = req.params;
      
      const section = await storage.getSpeakingTestSection(sectionId);
      if (!section) {
        return res.status(404).json({ message: 'Section topilmadi' });
      }
      
      const speakingTest = await storage.getSpeakingTest(section.speakingTestId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu sectionga ruxsat yo\'q' });
      }
      
      const data = insertSpeakingQuestionSchema.parse({
        ...req.body,
        sectionId,
      });
      
      const question = await storage.createSpeakingQuestion(data);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Update question
  app.put('/api/instructor/questions/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const question = await storage.getSpeakingQuestion(id);
      if (!question) {
        return res.status(404).json({ message: 'Savol topilmadi' });
      }
      
      const section = await storage.getSpeakingTestSection(question.sectionId);
      const speakingTest = await storage.getSpeakingTest(section!.speakingTestId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu savolga ruxsat yo\'q' });
      }
      
      const data = insertSpeakingQuestionSchema.partial().parse(req.body);
      const updated = await storage.updateSpeakingQuestion(id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Delete question
  app.delete('/api/instructor/questions/:id', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const question = await storage.getSpeakingQuestion(id);
      if (!question) {
        return res.status(404).json({ message: 'Savol topilmadi' });
      }
      
      const section = await storage.getSpeakingTestSection(question.sectionId);
      const speakingTest = await storage.getSpeakingTest(section!.speakingTestId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu savolga ruxsat yo\'q' });
      }
      
      await storage.deleteSpeakingQuestion(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Get submissions for a speaking test
  app.get('/api/instructor/speaking-tests/:testId/submissions', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { testId } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(testId);
      if (!speakingTest || speakingTest.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu testga ruxsat yo\'q' });
      }
      
      const submissions = await storage.getSpeakingSubmissionsByTest(testId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // INSTRUCTOR: Get single submission with answers and evaluations
  app.get('/api/instructor/submissions/:submissionId', isAuthenticated, isInstructor, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { submissionId } = req.params;
      
      const submission = await storage.getSpeakingSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission topilmadi' });
      }
      
      // Verify instructor owns the test
      if (submission.test.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu submissionga ruxsat yo\'q' });
      }
      
      // Get answers with questions and evaluations
      const answers = await storage.getSpeakingAnswers(submissionId);
      
      const answersWithEvaluations = await Promise.all(
        answers.map(async (answer) => {
          const evaluations = await storage.getSpeakingEvaluations(answer.answer.id);
          return { ...answer, evaluations };
        })
      );
      
      res.json({
        ...submission,
        answers: answersWithEvaluations,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // STUDENT: Get published speaking tests for course
  app.get('/api/student/courses/:courseId/speaking-tests', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { courseId } = req.params;
      
      // Check enrollment
      const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
      if (!enrollment || enrollment.paymentStatus !== 'approved') {
        return res.status(403).json({ message: 'Kursga ro\'yxatdan o\'tmagan' });
      }
      
      const speakingTests = await storage.getSpeakingTestsByCourse(courseId);
      const published = speakingTests.filter(t => t.isPublished);
      
      res.json(published);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // STUDENT: Get single speaking test to take
  app.get('/api/student/speaking-tests/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const speakingTest = await storage.getSpeakingTest(id);
      if (!speakingTest || !speakingTest.isPublished) {
        return res.status(404).json({ message: 'Speaking test topilmadi' });
      }
      
      // Check enrollment
      const enrollment = await storage.getEnrollmentByCourseAndUser(speakingTest.courseId, userId);
      if (!enrollment || enrollment.paymentStatus !== 'approved') {
        return res.status(403).json({ message: 'Kursga ro\'yxatdan o\'tmagan' });
      }
      
      // Get sections and questions
      const sections = await storage.getSpeakingTestSections(id);
      const sectionsWithQuestions = await Promise.all(
        sections.map(async (section) => {
          const questions = await storage.getSpeakingQuestions(section.id);
          return { ...section, questions };
        })
      );
      
      res.json({
        ...speakingTest,
        sections: sectionsWithQuestions,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // STUDENT: Submit speaking test
  app.post('/api/student/speaking-tests/:testId/submit', isAuthenticated, upload.array('audioFiles'), async (req, res) => {
    try {
      const userId = req.user!.id;
      const { testId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      const speakingTest = await storage.getSpeakingTest(testId);
      if (!speakingTest || !speakingTest.isPublished) {
        return res.status(404).json({ message: 'Speaking test topilmadi' });
      }
      
      // Check enrollment
      const enrollment = await storage.getEnrollmentByCourseAndUser(speakingTest.courseId, userId);
      if (!enrollment || enrollment.paymentStatus !== 'approved') {
        return res.status(403).json({ message: 'Kursga ro\'yxatdan o\'tmagan' });
      }
      
      // Parse answers from request body
      const answersData = JSON.parse(req.body.answers);
      
      // Create submission
      const submission = await storage.createSpeakingSubmission({
        speakingTestId: testId,
        userId,
        status: 'submitted',
      });
      
      // Upload audio files and create answers
      for (let i = 0; i < answersData.length; i++) {
        const answerData = answersData[i];
        const audioFile = files[i];
        
        // Upload audio to object storage
        const audioUrl = await uploadSubmissionFile(audioFile, 'speaking-tests');
        
        await storage.createSpeakingAnswer({
          submissionId: submission.id,
          questionId: answerData.questionId,
          audioUrl,
        });
      }
      
      res.json(submission);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // STUDENT: Get my submissions
  app.get('/api/student/speaking-submissions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const submissions = await storage.getSpeakingSubmissionsByUser(userId);
      res.json(submissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // STUDENT: Get single submission with results
  app.get('/api/student/submissions/:submissionId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { submissionId } = req.params;
      
      const submission = await storage.getSpeakingSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission topilmadi' });
      }
      
      // Verify student owns the submission
      if (submission.submission.userId !== userId) {
        return res.status(403).json({ message: 'Bu submissionga ruxsat yo\'q' });
      }
      
      // Get answers with evaluations
      const answers = await storage.getSpeakingAnswers(submissionId);
      
      const answersWithEvaluations = await Promise.all(
        answers.map(async (answer) => {
          const evaluations = await storage.getSpeakingEvaluations(answer.answer.id);
          return { ...answer, evaluations };
        })
      );
      
      res.json({
        ...submission,
        answers: answersWithEvaluations,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ COURSE MODULE ROUTES ============
  
  // Get all modules for a course
  app.get('/api/courses/:courseId/modules', async (req, res) => {
    try {
      const { courseId } = req.params;
      const modules = await storage.getCourseModules(courseId);
      res.json(modules);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create a new module for a course (instructor only)
  app.post('/api/courses/:courseId/modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar modul qo\'sha oladi' });
      }
      
      const { courseId } = req.params;
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Kurs topilmadi' });
      }
      
      // Verify instructor owns the course
      if (user.role === 'instructor' && course.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu kursga modul qo\'shish huquqi yo\'q' });
      }
      
      const { title, description, order } = req.body;
      const module = await storage.createCourseModule({
        courseId,
        title,
        description: description || null,
        order: order || 0,
        isActive: true,
      });
      
      res.json(module);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update a module
  app.patch('/api/modules/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar modul yangilay oladi' });
      }
      
      const { moduleId } = req.params;
      const existingModule = await storage.getCourseModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: 'Modul topilmadi' });
      }
      
      // Verify instructor owns the course
      const course = await storage.getCourse(existingModule.courseId);
      if (user.role === 'instructor' && course?.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu modulni yangilash huquqi yo\'q' });
      }
      
      const { title, description, order, isActive } = req.body;
      const updated = await storage.updateCourseModule(moduleId, {
        title,
        description,
        order,
        isActive,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete a module
  app.delete('/api/modules/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar modul o\'chira oladi' });
      }
      
      const { moduleId } = req.params;
      const existingModule = await storage.getCourseModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: 'Modul topilmadi' });
      }
      
      // Verify instructor owns the course
      const course = await storage.getCourse(existingModule.courseId);
      if (user.role === 'instructor' && course?.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu modulni o\'chirish huquqi yo\'q' });
      }
      
      await storage.deleteCourseModule(moduleId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // ============ LESSON SECTION ROUTES ============
  
  // Get all sections for a lesson
  app.get('/api/lessons/:lessonId/sections', async (req, res) => {
    try {
      const { lessonId } = req.params;
      const sections = await storage.getLessonSections(lessonId);
      res.json(sections);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create a new section for a lesson (instructor only)
  app.post('/api/lessons/:lessonId/sections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar section qo\'sha oladi' });
      }
      
      const { lessonId } = req.params;
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: 'Dars topilmadi' });
      }
      
      // Verify instructor owns the course
      const course = await storage.getCourse(lesson.courseId);
      if (user.role === 'instructor' && course?.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu darsga section qo\'shish huquqi yo\'q' });
      }
      
      const { title, description, videoUrl, videoPlatform, duration, order } = req.body;
      const section = await storage.createLessonSection({
        lessonId,
        title,
        description: description || null,
        videoUrl,
        videoPlatform: videoPlatform || 'youtube',
        duration: duration || 0,
        order: order || 0,
      });
      
      res.json(section);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update a section
  app.patch('/api/sections/:sectionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar section yangilay oladi' });
      }
      
      const { sectionId } = req.params;
      const existingSection = await storage.getLessonSection(sectionId);
      if (!existingSection) {
        return res.status(404).json({ message: 'Section topilmadi' });
      }
      
      // Verify instructor owns the course
      const lesson = await storage.getLesson(existingSection.lessonId);
      const course = lesson ? await storage.getCourse(lesson.courseId) : null;
      if (user.role === 'instructor' && course?.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu sectionni yangilash huquqi yo\'q' });
      }
      
      const { title, description, videoUrl, videoPlatform, duration, order } = req.body;
      const updated = await storage.updateLessonSection(sectionId, {
        title,
        description,
        videoUrl,
        videoPlatform,
        duration,
        order,
      });
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete a section
  app.delete('/api/sections/:sectionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'instructor' && user.role !== 'admin')) {
        return res.status(403).json({ message: 'Faqat o\'qituvchilar section o\'chira oladi' });
      }
      
      const { sectionId } = req.params;
      const existingSection = await storage.getLessonSection(sectionId);
      if (!existingSection) {
        return res.status(404).json({ message: 'Section topilmadi' });
      }
      
      // Verify instructor owns the course
      const lesson = await storage.getLesson(existingSection.lessonId);
      const course = lesson ? await storage.getCourse(lesson.courseId) : null;
      if (user.role === 'instructor' && course?.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu sectionni o\'chirish huquqi yo\'q' });
      }
      
      await storage.deleteLessonSection(sectionId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ LIVE ROOM (VIDEO CONFERENCING) ROUTES ============
  
  // Jitsi Meet - 100% bepul, API kalit talab qilmaydi
  // Xona nomi generatsiya qilish kifoya, Jitsi avtomatik xona yaratadi
  
  function generateJitsiRoomName(): string {
    return `zamonaviy-edu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  
  // Check if Zoom is available
  app.get('/api/zoom/status', isAuthenticated, async (req: any, res) => {
    res.json({ available: isZoomConfigured() });
  });
  
  // Create a live room (Instructor only) - supports Jitsi and Zoom, with optional scheduling
  app.post('/api/instructor/live-rooms', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { title, description, courseId, maxParticipants, platform = 'jitsi', scheduledAt } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: 'Jonli dars nomi kiritilishi shart' });
      }
      
      const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
      
      let roomData: any = {
        courseId: courseId || null,
        instructorId,
        title,
        description: description || null,
        status: isScheduled ? 'scheduled' : 'active',
        maxParticipants: maxParticipants || 50,
        platform,
        scheduledAt: isScheduled ? new Date(scheduledAt) : null,
        startedAt: isScheduled ? null : new Date(),
      };
      
      if (platform === 'zoom') {
        if (!isZoomConfigured()) {
          return res.status(400).json({ message: 'Zoom sozlanmagan. Administrator bilan bog\'laning.' });
        }
        
        try {
          const zoomMeeting = await createZoomMeeting(title, 120);
          roomData.zoomMeetingId = zoomMeeting.meetingId;
          roomData.zoomJoinUrl = zoomMeeting.joinUrl;
          roomData.zoomStartUrl = zoomMeeting.startUrl;
          roomData.zoomPassword = zoomMeeting.password;
          roomData.jitsiRoomName = null;
        } catch (zoomError: any) {
          console.error('Zoom meeting creation error:', zoomError);
          return res.status(500).json({ message: 'Zoom uchrashuv yaratishda xato: ' + zoomError.message });
        }
      } else {
        roomData.jitsiRoomName = generateJitsiRoomName();
      }
      
      // Save to database
      const liveRoom = await storage.createLiveRoom(roomData);
      
      // Send notification to students if courseId is provided
      if (courseId) {
        const enrolledStudents = await storage.getEnrollmentsByCourse(courseId);
        const notificationTitle = isScheduled ? 'Jonli dars rejalashtirildi!' : 'Jonli dars boshlandi!';
        const scheduledTime = isScheduled ? new Date(scheduledAt).toLocaleString('uz-UZ', { 
          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
        }) : '';
        const notificationMessage = isScheduled 
          ? `"${title}" jonli darsi ${scheduledTime} da bo'lib o'tadi.`
          : `"${title}" jonli darsi hozir boshlanmoqda. Darsga qo'shilish uchun bosing.`;
        
        for (const enrollment of enrolledStudents) {
          if (enrollment.paymentStatus === 'approved' || enrollment.paymentStatus === 'confirmed') {
            await storage.createNotification({
              userId: enrollment.userId,
              title: notificationTitle,
              message: notificationMessage,
              type: 'live_class',
              relatedId: liveRoom.id,
            });
          }
        }
      }
      
      res.json(liveRoom);
    } catch (error: any) {
      console.error('Error creating live room:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Start a scheduled live room
  app.post('/api/instructor/live-rooms/:roomId/start', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const room = await storage.getLiveRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Jonli dars topilmadi' });
      }
      
      if (room.instructorId !== instructorId) {
        return res.status(403).json({ message: 'Faqat o\'z darslaringizni boshlashingiz mumkin' });
      }
      
      if (room.status !== 'scheduled') {
        return res.status(400).json({ message: 'Bu dars allaqachon boshlangan yoki tugagan' });
      }
      
      const updatedRoom = await storage.updateLiveRoom(roomId, {
        status: 'active',
        startedAt: new Date(),
      });
      
      // Notify students that the class has started
      if (room.courseId) {
        const enrolledStudents = await storage.getEnrollmentsByCourse(room.courseId);
        for (const enrollment of enrolledStudents) {
          if (enrollment.paymentStatus === 'approved' || enrollment.paymentStatus === 'confirmed') {
            await storage.createNotification({
              userId: enrollment.userId,
              title: 'Jonli dars boshlandi!',
              message: `"${room.title}" jonli darsi hozir boshlanmoqda. Darsga qo'shilish uchun bosing.`,
              type: 'live_class',
              relatedId: roomId,
            });
          }
        }
      }
      
      res.json(updatedRoom);
    } catch (error: any) {
      console.error('Error starting live room:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get instructor's live rooms
  app.get('/api/instructor/live-rooms', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const rooms = await storage.getLiveRoomsByInstructor(instructorId);
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get specific live room
  app.get('/api/live-rooms/:roomId', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      const room = await storage.getLiveRoom(roomId);
      
      if (!room) {
        return res.status(404).json({ message: 'Jonli dars topilmadi' });
      }
      
      // Access control: Students can only access rooms for courses they're enrolled in
      if (user.role === 'student') {
        // If room is linked to a course, verify enrollment
        if (room.courseId) {
          const enrollments = await storage.getEnrollmentsByUser(userId);
          const enrolledCourseIds = enrollments
            .filter(e => e.paymentStatus === 'approved' || e.paymentStatus === 'confirmed')
            .map(e => e.courseId);
          
          if (!enrolledCourseIds.includes(room.courseId)) {
            return res.status(403).json({ message: 'Bu jonli darsga kirishga ruxsatingiz yo\'q' });
          }
        }
        // If room has no course, it's open to all authenticated users
      }
      
      // Instructors can only access their own rooms (or any room if admin)
      if (user.role === 'instructor' && room.instructorId !== userId) {
        return res.status(403).json({ message: 'Bu jonli darsga kirishga ruxsatingiz yo\'q' });
      }
      
      // Get instructor info
      const instructor = await storage.getUser(room.instructorId);
      
      // For students, remove the host-only zoomStartUrl
      const responseRoom = user.role === 'student' 
        ? { ...room, zoomStartUrl: undefined }
        : room;
      
      res.json({
        ...responseRoom,
        instructor: instructor ? {
          id: instructor.id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          profileImageUrl: instructor.profileImageUrl,
        } : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // End live room (Instructor only)
  app.post('/api/instructor/live-rooms/:roomId/end', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const instructorId = req.user.claims.sub;
      const { roomId } = req.params;
      
      const room = await storage.getLiveRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Jonli dars topilmadi' });
      }
      
      if (room.instructorId !== instructorId) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }
      
      // Zoom uchrashuvini tugatish
      if (room.platform === 'zoom' && room.zoomMeetingId) {
        try {
          await endZoomMeeting(room.zoomMeetingId);
        } catch (zoomError) {
          console.error('Zoom meeting end error:', zoomError);
        }
      }
      
      // Update database
      const updatedRoom = await storage.endLiveRoom(roomId);
      
      res.json(updatedRoom);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all active and scheduled live rooms (for students)
  app.get('/api/live-rooms/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Get active and scheduled rooms
      const activeRooms = await storage.getActiveAndScheduledLiveRooms();
      
      // Filter based on user's enrollments if student
      if (user.role === 'student') {
        const enrollments = await storage.getEnrollmentsByUser(userId);
        const enrolledCourseIds = enrollments
          .filter(e => e.paymentStatus === 'approved' || e.paymentStatus === 'confirmed')
          .map(e => e.courseId);
        
        const accessibleRooms = activeRooms.filter(room => 
          !room.courseId || enrolledCourseIds.includes(room.courseId)
        );
        
        // Add instructor info and remove sensitive fields for students
        const roomsWithInstructor = await Promise.all(accessibleRooms.map(async (room) => {
          const instructor = await storage.getUser(room.instructorId);
          // Remove zoomStartUrl from student response (it's a host-only URL)
          const { zoomStartUrl, ...safeRoom } = room;
          return {
            ...safeRoom,
            instructor: instructor ? {
              id: instructor.id,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              profileImageUrl: instructor.profileImageUrl,
            } : null,
          };
        }));
        
        return res.json(roomsWithInstructor);
      }
      
      // For instructors and admins, return all active rooms
      const roomsWithInstructor = await Promise.all(activeRooms.map(async (room) => {
        const instructor = await storage.getUser(room.instructorId);
        return {
          ...room,
          instructor: instructor ? {
            id: instructor.id,
            firstName: instructor.firstName,
            lastName: instructor.lastName,
            profileImageUrl: instructor.profileImageUrl,
          } : null,
        };
      }));
      
      res.json(roomsWithInstructor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ COURSE GROUP CHAT ROUTES ============
  
  // Get chat messages for a course
  // Helper: enrich messages with sender + replyTo info
  const enrichGroupChatMessages = async (messages: any[]) => {
    return await Promise.all(messages.map(async (msg) => {
      const sender = await storage.getUser(msg.senderId);
      let replyTo = null;
      if (msg.replyToId) {
        const replyMsg = await storage.getCourseGroupChatById(msg.replyToId);
        if (replyMsg) {
          const replySender = await storage.getUser(replyMsg.senderId);
          replyTo = {
            id: replyMsg.id,
            message: replyMsg.isDeleted ? null : replyMsg.message,
            isDeleted: replyMsg.isDeleted,
            sender: replySender ? { id: replySender.id, firstName: replySender.firstName, lastName: replySender.lastName } : null,
          };
        }
      }
      return {
        ...msg,
        message: msg.isDeleted ? null : msg.message,
        sender: sender ? {
          id: sender.id,
          firstName: sender.firstName,
          lastName: sender.lastName,
          profileImageUrl: sender.profileImageUrl,
          role: sender.role,
        } : null,
        replyTo,
      };
    }));
  };

  app.get('/api/courses/:courseId/group-chat', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { limit = 50, offset = 0, groupId } = req.query;
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
      
      if (user.role === 'student') {
        const userEnrollments = await storage.getEnrollmentsByUser(userId);
        const hasAccess = userEnrollments.some(e => e.courseId === courseId && (e.paymentStatus === 'approved' || e.paymentStatus === 'confirmed'));
        if (!hasAccess) return res.status(403).json({ message: 'Bu kursga kirishga ruxsatingiz yo\'q' });
      } else if (user.role === 'instructor') {
        const course = await storage.getCourse(courseId);
        if (!course || course.instructorId !== userId) return res.status(403).json({ message: 'Bu kursga kirishga ruxsatingiz yo\'q' });
      }
      
      await storage.updateUserPresence(userId, courseId);
      
      const gId = groupId && groupId !== 'general' ? String(groupId) : null;
      const messages = await storage.getCourseGroupChats(courseId, Number(limit), Number(offset), gId);
      const enriched = await enrichGroupChatMessages(messages);
      
      res.json(enriched.reverse());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Send a message
  app.post('/api/courses/:courseId/group-chat', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { message, messageType = 'text', fileUrl, groupId, replyToId } = req.body;
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
      if (!message || message.trim().length === 0) return res.status(400).json({ message: 'Xabar bo\'sh bo\'lmasligi kerak' });
      
      if (user.role === 'student') {
        const userEnrollments = await storage.getEnrollmentsByUser(userId);
        const hasAccess = userEnrollments.some(e => e.courseId === courseId && (e.paymentStatus === 'approved' || e.paymentStatus === 'confirmed'));
        if (!hasAccess) return res.status(403).json({ message: 'Bu kursga kirishga ruxsatingiz yo\'q' });
      } else if (user.role === 'instructor') {
        const course = await storage.getCourse(courseId);
        if (!course || course.instructorId !== userId) return res.status(403).json({ message: 'Bu kursga kirishga ruxsatingiz yo\'q' });
      }
      
      const gId = groupId && groupId !== 'general' ? String(groupId) : null;
      const newMessage = await storage.createCourseGroupChat({
        courseId,
        senderId: userId,
        groupId: gId,
        replyToId: replyToId || null,
        message: message.trim(),
        messageType,
        fileUrl,
      });
      
      await storage.updateUserPresence(userId, courseId);
      
      let replyTo = null;
      if (replyToId) {
        const replyMsg = await storage.getCourseGroupChatById(replyToId);
        if (replyMsg) {
          const replySender = await storage.getUser(replyMsg.senderId);
          replyTo = {
            id: replyMsg.id,
            message: replyMsg.isDeleted ? null : replyMsg.message,
            isDeleted: replyMsg.isDeleted,
            sender: replySender ? { id: replySender.id, firstName: replySender.firstName, lastName: replySender.lastName } : null,
          };
        }
      }

      res.status(201).json({
        ...newMessage,
        sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role },
        replyTo,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Poll for new messages
  app.get('/api/courses/:courseId/group-chat/poll', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const { since, groupId } = req.query;
      const userId = req.user?.id || req.user?.claims?.sub;
      
      await storage.updateUserPresence(userId, courseId);
      if (!since) return res.json([]);
      
      const sinceTime = new Date(String(since));
      const gId = groupId && groupId !== 'general' ? String(groupId) : null;
      const messages = await storage.getCourseGroupChatsSince(courseId, sinceTime, gId);
      const enriched = await enrichGroupChatMessages(messages);
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Delete a message
  app.delete('/api/courses/:courseId/group-chat/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId, messageId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
      
      await storage.deleteCourseGroupChat(messageId, userId, user.role);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get student's group in a course
  app.get('/api/courses/:courseId/my-group', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      const enrollment = await storage.getEnrollmentByCourseAndUser(courseId, userId);
      if (!enrollment || !enrollment.groupId) {
        return res.json({ groupId: null, groupName: null });
      }
      const { db } = await import('./db');
      const { studentGroups } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      const [group] = await db.select().from(studentGroups).where(eq(studentGroups.id, enrollment.groupId));
      res.json({ groupId: enrollment.groupId, groupName: group?.name || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all groups in a course (for instructor)
  app.get('/api/courses/:courseId/groups', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const groups = await storage.getCourseEnrollmentGroupsForInstructor(courseId);
      res.json(groups);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get online users in course
  app.get('/api/courses/:courseId/online-users', isAuthenticated, async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id || req.user?.claims?.sub;
      
      // Update own presence
      await storage.updateUserPresence(userId, courseId);
      
      // Get online users
      const onlinePresences = await storage.getOnlineUsersInCourse(courseId);
      
      // Get user details
      const onlineUsers = await Promise.all(onlinePresences.map(async (p) => {
        const user = await storage.getUser(p.userId);
        return user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          lastActiveAt: p.lastActiveAt,
        } : null;
      }));
      
      res.json(onlineUsers.filter(Boolean));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update presence (heartbeat)
  app.post('/api/presence/heartbeat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { courseId } = req.body;
      
      await storage.updateUserPresence(userId, courseId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ STUDENT GROUP ROUTES ============

  // Get all student groups
  app.get('/api/admin/student-groups', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const groups = await storage.getStudentGroups();
      const groupsWithCounts = await Promise.all(groups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return { ...group, memberCount: members.length };
      }));
      res.json(groupsWithCounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create student group
  app.post('/api/admin/student-groups', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ message: "Guruh nomi kiritilishi shart" });
      const group = await storage.createStudentGroup({ name, description });
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update student group
  app.patch('/api/admin/student-groups/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      const group = await storage.updateStudentGroup(req.params.id, { name, description });
      res.json(group);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete student group
  app.delete('/api/admin/student-groups/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteStudentGroup(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get group members
  app.get('/api/admin/student-groups/:id/members', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const members = await storage.getGroupMembers(req.params.id);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add student to group
  app.post('/api/admin/student-groups/:id/members', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "O'quvchi tanlanishi shart" });
      const member = await storage.addStudentToGroup(req.params.id, userId);
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Add multiple students to group
  app.post('/api/admin/student-groups/:id/members/bulk', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userIds } = req.body;
      if (!userIds || !Array.isArray(userIds)) return res.status(400).json({ message: "O'quvchilar ro'yxati kerak" });
      const results = await Promise.all(userIds.map((uid: string) => storage.addStudentToGroup(req.params.id, uid)));
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Remove student from group
  app.delete('/api/admin/student-groups/:groupId/members/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.removeStudentFromGroup(req.params.groupId, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Assign course to all group members
  app.post('/api/admin/student-groups/:groupId/assign-course', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { groupId } = req.params;
      const { courseId, subscriptionDays } = req.body;
      if (!courseId) return res.status(400).json({ message: "courseId majburiy" });
      const days = parseInt(subscriptionDays) || 30;

      const members = await storage.getGroupMembers(groupId);
      const plans = await storage.getSubscriptionPlans();
      const plan = plans[0];

      let enrolled = 0;
      let skipped = 0;

      for (const member of members) {
        const existing = await storage.getEnrollmentByCourseAndUser(courseId, member.userId);
        if (existing) { skipped++; continue; }

        const enrollment = await storage.createEnrollment({
          userId: member.userId,
          courseId,
          planId: plan?.id || null,
          paymentMethod: 'manual',
          paymentStatus: 'approved',
          groupId,
        });

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
        await db.insert(userSubscriptions).values({
          userId: member.userId,
          courseId,
          planId: plan?.id || null,
          enrollmentId: enrollment.id,
          startDate,
          endDate,
          status: 'active',
        });

        enrolled++;
      }

      res.json({ message: `${enrolled} o'quvchi yozildi, ${skipped} ta allaqachon yozilgan` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
