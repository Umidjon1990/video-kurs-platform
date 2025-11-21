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
import { users, courses, lessons, assignments, tests, questions, questionOptions, enrollments, submissions, testAttempts, notifications, conversations, messages, siteSettings, testimonials, subscriptionPlans, coursePlanPricing, userSubscriptions, passwordResetRequests, speakingTests, speakingTestSections, speakingQuestions, speakingSubmissions, speakingAnswers, speakingEvaluations } from "@shared/schema";
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
          // SECURITY: Delete all other sessions for this user (enforce single device login)
          const userId = user.claims.sub;
          const currentSessionId = req.sessionID;
          
          // Find and destroy all sessions for this user except the current one
          await db.execute(sql`
            DELETE FROM sessions 
            WHERE sess::jsonb->'passport'->'user'->'claims'->>'sub' = ${userId}
            AND sid != ${currentSessionId}
          `);
          
          console.log(`[Session Management] Destroyed old sessions for user ${userId}, keeping session ${currentSessionId}`);
        } catch (sessionError: any) {
          // Log error but don't fail the login
          console.error('[Session Management] Error destroying old sessions:', sessionError);
        }
        
        // Fetch full user data from database
        const fullUser = await storage.getUser(user.claims.sub);
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
      
      // Prevent admin from deleting themselves
      if (userId === adminId) {
        return res.status(400).json({ message: 'O\'zingizni o\'chira olmaysiz' });
      }
      
      // Get user info before deletion for logging
      const [userToDelete] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!userToDelete) {
        return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
      }
      
      // Delete all related records in transaction
      await db.transaction(async (tx: any) => {
        // 1. Delete test attempts
        await tx.delete(testAttempts).where(eq(testAttempts.userId, userId));
        
        // 2. Delete assignment submissions
        await tx.delete(submissions).where(eq(submissions.userId, userId));
        
        // 3. Delete enrollments
        await tx.delete(enrollments).where(eq(enrollments.userId, userId));
        
        // 4. Delete user subscriptions
        await tx.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
        
        // 5. Delete notifications (both received and sent)
        await tx.delete(notifications).where(eq(notifications.userId, userId));
        
        // 6. Delete password reset requests
        await tx.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, userId));
        await tx.delete(passwordResetRequests).where(eq(passwordResetRequests.processedBy, userId));
        
        // 7. Delete messages sent by user
        await tx.delete(messages).where(eq(messages.senderId, userId));
        
        // 8. Delete conversations where user is a participant
        await tx.delete(conversations).where(eq(conversations.studentId, userId));
        await tx.delete(conversations).where(eq(conversations.instructorId, userId));
        
        // 9. Delete courses created by instructor (if instructor)
        if (userToDelete.role === 'instructor') {
          await tx.delete(courses).where(eq(courses.instructorId, userId));
        }
        
        // 10. Finally, delete the user
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
      const { phone, email, firstName, lastName, courseId, subscriptionDays } = req.body;
      
      // Server-side validation
      const createStudentSchema = z.object({
        phone: z.string().min(1, 'Telefon raqam kiritish shart'),
        email: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? undefined : val,
          z.string().email().optional()
        ),
        firstName: z.string().min(1, 'Ism kiritish shart'),
        lastName: z.string().min(1, 'Familiya kiritish shart'),
        courseId: z.preprocess(
          (val) => (val === '' || val === undefined || val === null) ? undefined : val,
          z.string().optional()
        ),
        subscriptionDays: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1, 'Obuna muddati kamida 1 kun bo\'lishi kerak')),
      });
      
      const validatedData = createStudentSchema.parse({ phone, email, firstName, lastName, courseId, subscriptionDays });
      
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
      
      // Generate secure random password using crypto (12 characters)
      const crypto = await import('crypto');
      // Generate 16 bytes to ensure we have enough characters after base64url encoding
      const randomBytes = crypto.randomBytes(16);
      // Use base64url encoding: replace + with -, / with _, and remove = padding
      const generatedPassword = randomBytes
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .slice(0, 12);
      
      // Hash password
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      
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
        
        // If courseId is provided, create enrollment and subscription
        let enrollmentCreated = false;
        if (validatedData.courseId) {
          // Get the first subscription plan as default
          const [defaultPlan] = await tx
            .select()
            .from(subscriptionPlans)
            .limit(1);
          
          if (defaultPlan) {
            // Create enrollment with approved payment status (admin-created enrollments are immediately approved)
            const [enrollment] = await tx
              .insert(enrollments)
              .values({
                userId: createdUser.id,
                courseId: validatedData.courseId,
                planId: defaultPlan.id,
                paymentStatus: 'approved', // Admin-created enrollments are immediately approved
              })
              .returning();
            
            // Create subscription with custom duration
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + validatedData.subscriptionDays);
            
            await tx
              .insert(userSubscriptions)
              .values({
                userId: createdUser.id,
                courseId: validatedData.courseId,
                planId: defaultPlan.id,
                enrollmentId: enrollment.id,
                status: 'active',
                startDate,
                endDate,
              });
            
            enrollmentCreated = true;
          }
        }
        
        return { user: createdUser, enrollmentCreated };
      });
      
      // Remove password from response
      const { passwordHash: _pwd, ...userWithoutPassword } = newUser.user;
      
      // Return user with login credentials (phone as login) and enrollment status
      res.json({ 
        message: newUser.enrollmentCreated 
          ? 'O\'quvchi muvaffaqiyatli yaratildi va kursga yozildi' 
          : validatedData.courseId 
            ? 'O\'quvchi yaratildi (Kursga yozilmadi - tarif topilmadi)'
            : 'O\'quvchi muvaffaqiyatli yaratildi',
        user: userWithoutPassword,
        enrollmentCreated: newUser.enrollmentCreated,
        credentials: {
          login: validatedData.phone,
          password: generatedPassword
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
      const { title, description, category, thumbnailUrl, imageUrl, pricing } = req.body;
      
      // Create course with minimal data
      const courseData = insertCourseSchema.parse({
        title,
        description,
        category,
        thumbnailUrl,
        imageUrl,
        instructorId,
        price: pricing.oddiy, // Default price (oddiy plan)
      });
      const course = await storage.createCourse(courseData);
      
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
        category: true,
        price: true,
        originalPrice: true,
        discountedPrice: true,
        thumbnailUrl: true,
        imageUrl: true,
      }).partial();
      
      const updateData = editableFields.parse(req.body);
      
      // Handle pricing object from frontend
      if (req.body.pricing && req.body.pricing.oddiy) {
        updateData.price = req.body.pricing.oddiy;
        updateData.originalPrice = req.body.pricing.oddiy;
      }
      
      const updatedCourse = await storage.updateCourse(courseId, updateData);
      
      // Update plan pricing if pricing object is provided
      if (req.body.pricing) {
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
// ============ CLEAN INSTRUCTOR TEST ROUTES ============
// This will be appended to server/routes_new.ts

  app.patch('/api/instructor/tests/:testId', isAuthenticated, isInstructor, async (req: any, res) => {
    try {
      const { testId } = req.params;
      const instructorId = req.user.claims.sub;
      
      const test = await storage.getTest(testId);
      if (!test) {
        return res.status(404).json({ message: "Test not found" });
      }
      
      // Check ownership (standalone tests OR course tests)
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership (standalone tests OR course tests)
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
      
      // Check ownership
      if (test.courseId) {
        const course = await storage.getCourse(test.courseId);
        if (course?.instructorId !== instructorId) {
          const user = await storage.getUser(instructorId);
          if (user?.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden" });
          }
        }
      } else if (test.instructorId !== instructorId) {
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
// ============ TEST MARKETPLACE API ROUTES (MINIMAL) ============
// These routes will be added to main server/routes.ts after fixing it

import { Router } from 'express';

export function setupTestMarketplaceRoutes(app: any, storage: any, isAuthenticated: any, isAdmin: any) {
  
  // ============ PUBLIC ROUTES ============
  // Get all published standalone tests (not part of any course)
  app.get('/api/public/tests', async (req: any, res: any) => {
    try {
      const tests = await storage.getPublicTests();
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all published standalone speaking tests
  app.get('/api/public/speaking-tests', async (req: any, res: any) => {
    try {
      const speakingTests = await storage.getPublicSpeakingTests();
      res.json(speakingTests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ STUDENT ROUTES ============
  // Purchase a standalone test
  app.post('/api/student/test-purchase', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, speakingTestId, testType, paymentMethod, paymentProofUrl } = req.body;
      
      if ((!testId && !speakingTestId) || (testId && speakingTestId)) {
        return res.status(400).json({ message: 'testId yoki speakingTestId dan faqat bittasini kiriting' });
      }
      
      const existingEnrollment = await storage.checkTestEnrollment(
        userId,
        testId || speakingTestId,
        testType
      );
      if (existingEnrollment) {
        return res.status(400).json({ message: 'Siz bu testni allaqachon sotib olgan' });
      }
      
      const enrollment = await storage.createTestEnrollment({
        userId,
        testId: testId || null,
        speakingTestId: speakingTestId || null,
        testType,
        paymentMethod,
        paymentProofUrl,
        paymentStatus: 'pending',
      });
      
      res.json(enrollment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get student's test enrollments
  app.get('/api/student/test-enrollments', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const enrollments = await storage.getTestEnrollmentsByUser(userId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check test access
  app.get('/api/student/test-enrollment/:testId/:testType', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const { testId, testType } = req.params;
      
      const enrollment = await storage.checkTestEnrollment(userId, testId, testType as 'standard' | 'speaking');
      res.json({ hasAccess: !!enrollment, enrollment });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ ADMIN ROUTES ============
  // Get all pending test payments
  app.get('/api/admin/test-payments/pending', isAuthenticated, isAdmin, async (req: any, res: any) => {
    try {
      const pendingPayments = await storage.getPendingTestPayments();
      res.json(pendingPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Approve/reject test enrollment
  app.patch('/api/admin/test-enrollments/:enrollmentId/status', isAuthenticated, isAdmin, async (req: any, res: any) => {
    try {
      const { enrollmentId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      
      const updated = await storage.updateTestEnrollmentStatus(enrollmentId, status);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
              }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        } catch (error: any) {
      res.status(500).json({ message: error.message           }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        });
              }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
            }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        });

  app.post('/api/lessons/:lessonId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { lessonId           }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        } = req.params;
      const { watchedSeconds, totalSeconds, lastPosition, completed           }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        } = req.body;
      
      const progress = await storage.upsertLessonProgress({
        userId,
        lessonId,
        watchedSeconds,
        totalSeconds,
        lastPosition,
        completed,
        completedAt: completed ? new Date() : undefined,
                }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        });
      
      res.json(progress);
              }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        } catch (error: any) {
      res.status(500).json({ message: error.message           }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        });
              }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        }
            }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
        if (user?.role !== 'admin') {
          return res.status(403).json({ message: "Forbidden" });
        });

  app.get('/api/courses/:courseId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { courseId           }
        }
      } else if (test.instructorId !== instructorId) {
        const user = await storage.getUser(instructorId);
