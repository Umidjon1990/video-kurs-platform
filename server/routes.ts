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
import { users, courses, lessons, assignments, tests, questions, enrollments, submissions, testAttempts, notifications, conversations, messages, siteSettings, testimonials, subscriptionPlans, coursePlanPricing, userSubscriptions, passwordResetRequests } from "@shared/schema";
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
  type InstructorCourseWithCounts,
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
      const newUser = await db.transaction(async (tx) => {
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
        if (validatedData.courseId) {
          // Get the first subscription plan as default
          const [defaultPlan] = await tx
            .select()
            .from(subscriptionPlans)
            .limit(1);
          
          if (!defaultPlan) {
            throw new Error('Hech qanday tarif topilmadi. Avval tariflar yarating.');
          }
          
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
        }
        
        return createdUser;
      });
      
      // Remove password from response
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      
      // Return user with login credentials (phone as login)
      res.json({ 
        message: 'O\'quvchi muvaffaqiyatli yaratildi',
        user: userWithoutPassword,
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
      const studentsWithoutPasswords = pendingStudents.map(({ passwordHash, ...user }) => user);
      
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
      const { title, description, category, thumbnailUrl, pricing } = req.body;
      
      // Create course with minimal data
      const courseData = insertCourseSchema.parse({
        title,
        description,
        category,
        thumbnailUrl,
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

  // ============ PUBLIC ROUTES (No Auth Required) ============
  // Public courses endpoint with filters
  app.get('/api/courses/public', async (req, res) => {
    try {
      const { search, category, minPrice, maxPrice, instructorId, hasDiscount } = req.query;
      
      const filters = {
        search: search as string | undefined,
        category: category as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        instructorId: instructorId as string | undefined,
        hasDiscount: hasDiscount === 'true' ? true : undefined,
      };

      const courses = await storage.getPublicCourses(filters);
      res.json(courses);
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
      
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        instructorId,
      });
      
      // Create announcement
      const announcement = await storage.createAnnouncement(announcementData);
      
      // Send notifications based on targetType
      const { targetType, targetId, title, message, priority } = announcementData;
      let recipients: string[] = [];
      
      if (targetType === 'individual' && targetId) {
        // Yakka tartibda - bitta o'quvchiga
        recipients = [targetId];
      } else if (targetType === 'course' && targetId) {
        // Guruhga - kurs o'quvchilariga
        const courseEnrollments = await storage.getEnrollmentsByCourse(targetId);
        recipients = courseEnrollments.map(e => e.userId);
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
        ? Math.max(...existingPlans.map(p => p.order))
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

  const httpServer = createServer(app);
  return httpServer;
}
