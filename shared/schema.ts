import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - Replit Auth integration
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Dual Auth: Replit Auth + Phone/Email
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default('student'), // admin, instructor, student
  status: varchar("status", { length: 20 }).notNull().default('active'), // pending, active, rejected
  // Dual-auth fields
  phone: varchar("phone").unique(), // Telefon raqam (login uchun)
  passwordHash: varchar("password_hash"), // Hashed password
  // Instructor fields
  telegramUsername: varchar("telegram_username"), // Jonli dars uchun
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  testAttempts: many(testAttempts),
  notifications: many(notifications),
  announcements: many(announcements),
  studentConversations: many(conversations, { relationName: 'studentConversations' }),
  instructorConversations: many(conversations, { relationName: 'instructorConversations' }),
  messages: many(messages),
  userSubscriptions: many(userSubscriptions),
  lessonProgress: many(lessonProgress),
  courseRatings: many(courseRatings),
}));

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // IT, Design, Business, Language, Marketing, etc.
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }), // Asl narx
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }), // Chegirmadagi narx
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  thumbnailUrl: varchar("thumbnail_url"),
  imageUrl: text("image_url"), // Kurs sahifasi uchun rasm
  status: varchar("status", { length: 20 }).notNull().default('draft'), // draft, published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  lessons: many(lessons),
  assignments: many(assignments),
  tests: many(tests),
  enrollments: many(enrollments),
  planPricing: many(coursePlanPricing),
  userSubscriptions: many(userSubscriptions),
  ratings: many(courseRatings),
}));

// Course Ratings table
export const courseRatings = pgTable("course_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer("rating").notNull(), // 1-5 yulduz
  review: text("review"), // Izoh (ixtiyoriy)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("course_ratings_course_user_idx").on(table.courseId, table.userId),
]);

export const courseRatingsRelations = relations(courseRatings, ({ one }) => ({
  course: one(courses, {
    fields: [courseRatings.courseId],
    references: [courses.id],
  }),
  user: one(users, {
    fields: [courseRatings.userId],
    references: [users.id],
  }),
}));

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  pdfUrl: text("pdf_url"), // PDF manba (Dropbox, Google Drive)
  order: integer("order").notNull(),
  duration: integer("duration"), // in minutes
  isDemo: boolean("is_demo").default(false), // Bepul demo dars
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  assignments: many(assignments),
  tests: many(tests),
  progress: many(lessonProgress),
}));

// Lesson Progress table - Video tracking
export const lessonProgress = pgTable("lesson_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  watchedSeconds: integer("watched_seconds").notNull().default(0), // Qancha sekund ko'rilgan
  totalSeconds: integer("total_seconds").notNull().default(0), // Umumiy davomiylik
  lastPosition: integer("last_position").notNull().default(0), // Oxirgi to'xtatilgan joy (sekundlarda)
  completed: boolean("completed").default(false), // 90%+ ko'rilgan bo'lsa true
  completedAt: timestamp("completed_at"), // Tugallanganlik vaqti
  lastWatchedAt: timestamp("last_watched_at").defaultNow(), // Oxirgi marta ko'rilgan vaqt
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(users, {
    fields: [lessonProgress.userId],
    references: [users.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  maxScore: integer("max_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [assignments.lessonId],
    references: [lessons.id],
  }),
  submissions: many(submissions),
}));

// Tests table
export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: integer("passing_score"),
  isDraft: boolean("is_draft").default(true),
  randomOrder: boolean("random_order").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => tests.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 50 }).notNull(), // multiple_choice, true_false, fill_blanks, matching, short_answer, essay
  questionText: text("question_text").notNull(),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull(),
  mediaUrl: text("media_url"), // For images, audio, video
  correctAnswer: text("correct_answer"), // For simple answer types
  config: jsonb("config").default(sql`'{}'`), // Type-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
});

// Question Options table (for multiple choice and matching)
export const questionOptions = pgTable("question_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: 'cascade' }),
  optionText: text("option_text").notNull(),
  isCorrect: boolean("is_correct").default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Test Attempts table (renamed from testResults)
export const testAttempts = pgTable("test_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => tests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  answers: jsonb("answers").notNull(), // User's answers {questionId: answer}
  score: integer("score"), // Total score
  totalPoints: integer("total_points"), // Maximum possible score
  isPassed: boolean("is_passed"),
  completedAt: timestamp("completed_at").defaultNow(),
  gradedAt: timestamp("graded_at"), // For manual grading (essay questions)
});

// Relations - defined after all tables
export const testsRelations = relations(tests, ({ one, many }) => ({
  course: one(courses, {
    fields: [tests.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [tests.lessonId],
    references: [lessons.id],
  }),
  questions: many(questions),
  attempts: many(testAttempts),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  test: one(tests, {
    fields: [questions.testId],
    references: [tests.id],
  }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const testAttemptsRelations = relations(testAttempts, ({ one }) => ({
  test: one(tests, {
    fields: [testAttempts.testId],
    references: [tests.id],
  }),
  user: one(users, {
    fields: [testAttempts.userId],
    references: [users.id],
  }),
}));

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  planId: varchar("plan_id").references(() => subscriptionPlans.id), // Tanlangan tarif
  paymentMethod: varchar("payment_method", { length: 20 }), // karta, payme
  paymentProofUrl: text("payment_proof_url"), // Chek rasmi URL
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

// Subscription Plans table - 3 tarif (Oddiy, Standard, Premium)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // oddiy, standard, premium
  displayName: varchar("display_name", { length: 100 }).notNull(), // Oddiy, Standard, Premium
  description: text("description"),
  features: jsonb("features").notNull(), // {hasTests: true, hasAssignments: false, hasCertificate: false, liveClassesPerWeek: 0}
  order: integer("order").notNull(), // Display order
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  coursePricing: many(coursePlanPricing),
  userSubscriptions: many(userSubscriptions),
}));

// Course Plan Pricing - Har bir kurs uchun 3 xil narx (oddiy, standard, premium)
export const coursePlanPricing = pgTable("course_plan_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coursePlanPricingRelations = relations(coursePlanPricing, ({ one }) => ({
  course: one(courses, {
    fields: [coursePlanPricing.courseId],
    references: [courses.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [coursePlanPricing.planId],
    references: [subscriptionPlans.id],
  }),
}));

// User Subscriptions - Foydalanuvchi obunalari (30 kunlik)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  enrollmentId: varchar("enrollment_id").notNull().references(() => enrollments.id),
  startDate: timestamp("start_date").notNull(), // To'lov tasdiqlangan sana
  endDate: timestamp("end_date").notNull(), // 30 kundan keyin
  status: varchar("status", { length: 20 }).notNull().default('active'), // active, expired, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [userSubscriptions.courseId],
    references: [courses.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [userSubscriptions.planId],
    references: [subscriptionPlans.id],
  }),
  enrollment: one(enrollments, {
    fields: [userSubscriptions.enrollmentId],
    references: [enrollments.id],
  }),
}));

// Submissions table
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content"),
  imageUrls: text("image_urls").array(),
  audioUrls: text("audio_urls").array(),
  fileUrls: text("file_urls").array(),
  status: varchar("status", { length: 20 }).notNull().default('new_submitted'), // new_submitted, graded, needs_revision
  grade: integer("grade"), // 0-100
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  gradedAt: timestamp("graded_at"),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
}));

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // assignment_submitted, assignment_graded, test_completed, revision_requested
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedId: varchar("related_id"), // ID of related entity (submission, test attempt, etc.)
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Announcements table - E'lonlar (O'qituvchi yuboradi)
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  priority: varchar("priority", { length: 20 }).notNull().default('normal'), // normal, urgent
  targetType: varchar("target_type", { length: 20 }).notNull(), // individual, course, all
  targetId: varchar("target_id"), // userId or courseId (null if targetType is 'all')
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcementsRelations = relations(announcements, ({ one }) => ({
  instructor: one(users, {
    fields: [announcements.instructorId],
    references: [users.id],
  }),
}));

// Password Reset Requests table - Parolni tiklash so'rovlari
export const passwordResetRequests = pgTable("password_reset_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactInfo: varchar("contact_info", { length: 255 }).notNull(), // email yoki telefon
  userId: varchar("user_id").references(() => users.id), // Topilgan foydalanuvchi
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  processedBy: varchar("processed_by").references(() => users.id), // Qaysi admin ko'rib chiqdi
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetRequestsRelations = relations(passwordResetRequests, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetRequests.userId],
    references: [users.id],
    relationName: 'passwordResetUser',
  }),
  processor: one(users, {
    fields: [passwordResetRequests.processedBy],
    references: [users.id],
    relationName: 'passwordResetProcessor',
  }),
}));

// Site Settings table - Sayt sozlamalari (Admin boshqaradi)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(), // about_us, contact_email, contact_phone, contact_address, etc.
  value: text("value"), // JSON string or plain text
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Testimonials table - Talabalar fikrlari (Admin boshqaradi)
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  studentRole: varchar("student_role", { length: 255 }), // Talaba, Dasturchi, etc.
  content: text("content").notNull(),
  avatarUrl: varchar("avatar_url"),
  rating: integer("rating").default(5), // 1-5 stars
  isPublished: boolean("is_published").default(true),
  order: integer("order").default(0), // For sorting
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseRatingSchema = createInsertSchema(courseRatings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submittedAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionOptionSchema = createInsertSchema(questionOptions).omit({
  id: true,
  createdAt: true,
});

export const insertTestAttemptSchema = createInsertSchema(testAttempts).omit({
  id: true,
  completedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

// ============ SPEAKING TESTS SYSTEM ============
// Speaking Tests table - Og'zaki testlar
export const speakingTests = pgTable("speaking_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  lessonId: varchar("lesson_id").references(() => lessons.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull().default(60), // Davomiyligi (daqiqalarda)
  passScore: integer("pass_score").notNull().default(60), // O'tish bali
  totalScore: integer("total_score").notNull().default(100), // Maksimal ball
  instructions: text("instructions"), // Ko'rsatmalar
  language: varchar("language", { length: 10 }).notNull().default('ar'), // ar, uz, en, etc.
  isDemo: boolean("is_demo").default(false), // Bepul demo test
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Speaking Test Sections - Test bo'limlari
export const speakingTestSections = pgTable("speaking_test_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  speakingTestId: varchar("speaking_test_id").notNull().references(() => speakingTests.id, { onDelete: 'cascade' }),
  sectionNumber: integer("section_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  instructions: text("instructions"),
  preparationTime: integer("preparation_time").notNull().default(30), // Tayyorlanish vaqti (soniyalarda)
  speakingTime: integer("speaking_time").notNull().default(60), // Gapirish vaqti (soniyalarda)
  imageUrl: text("image_url"), // Bo'lim uchun rasm
  parentSectionId: varchar("parent_section_id"), // Nested sections - self reference
  createdAt: timestamp("created_at").defaultNow(),
});

// Speaking Questions - Og'zaki savollar
export const speakingQuestions = pgTable("speaking_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => speakingTestSections.id, { onDelete: 'cascade' }),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text").notNull(),
  imageUrl: text("image_url"), // Savol uchun rasm
  preparationTime: integer("preparation_time"), // Savol uchun maxsus tayyorlanish vaqti
  speakingTime: integer("speaking_time"), // Savol uchun maxsus gapirish vaqti
  questionAudioUrl: text("question_audio_url"), // Audio savol (ixtiyoriy)
  // Baholash parametrlari
  keyFactsPlus: text("key_facts_plus"), // Muhim faktlar (ijobiy)
  keyFactsMinus: text("key_facts_minus"), // Muhim faktlar (salbiy)
  keyFactsPlusLabel: text("key_facts_plus_label"), // "Aytilishi kerak" label
  keyFactsMinusLabel: text("key_facts_minus_label"), // "Aytilmasligi kerak" label
  createdAt: timestamp("created_at").defaultNow(),
});

// Speaking Submissions - O'quvchi javoblari
export const speakingSubmissions = pgTable("speaking_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  speakingTestId: varchar("speaking_test_id").notNull().references(() => speakingTests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // pending, evaluating, completed
  totalScore: integer("total_score"), // Umumiy ball
  maxScore: integer("max_score"), // Maksimal ball
  feedback: text("feedback"), // Umumiy fikr
  submittedAt: timestamp("submitted_at").defaultNow(),
  evaluatedAt: timestamp("evaluated_at"),
});

// Speaking Answers - Har bir savol uchun javob
export const speakingAnswers = pgTable("speaking_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: varchar("submission_id").notNull().references(() => speakingSubmissions.id, { onDelete: 'cascade' }),
  questionId: varchar("question_id").notNull().references(() => speakingQuestions.id, { onDelete: 'cascade' }),
  audioUrl: text("audio_url").notNull(), // Object Storage'dagi audio fayl
  transcription: text("transcription"), // Whisper transcription
  score: integer("score"), // Savol uchun ball
  feedback: text("feedback"), // AI/O'qituvchi fikri
  duration: integer("duration"), // Audio davomiyligi (soniyalarda)
  evaluatedAt: timestamp("evaluated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Speaking Evaluations - AI baholash tarixi
export const speakingEvaluations = pgTable("speaking_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  answerId: varchar("answer_id").notNull().references(() => speakingAnswers.id, { onDelete: 'cascade' }),
  evaluationType: varchar("evaluation_type", { length: 20 }).notNull(), // ai, manual
  evaluatorId: varchar("evaluator_id").references(() => users.id), // O'qituvchi (agar manual bo'lsa)
  score: integer("score").notNull(),
  feedback: text("feedback"),
  detailedAnalysis: jsonb("detailed_analysis"), // AI tahlili (JSON)
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const speakingTestsRelations = relations(speakingTests, ({ one, many }) => ({
  course: one(courses, {
    fields: [speakingTests.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [speakingTests.lessonId],
    references: [lessons.id],
  }),
  sections: many(speakingTestSections),
  submissions: many(speakingSubmissions),
}));

export const speakingTestSectionsRelations = relations(speakingTestSections, ({ one, many }) => ({
  speakingTest: one(speakingTests, {
    fields: [speakingTestSections.speakingTestId],
    references: [speakingTests.id],
  }),
  parentSection: one(speakingTestSections, {
    fields: [speakingTestSections.parentSectionId],
    references: [speakingTestSections.id],
    relationName: 'nestedSections',
  }),
  childSections: many(speakingTestSections, { relationName: 'nestedSections' }),
  questions: many(speakingQuestions),
}));

export const speakingQuestionsRelations = relations(speakingQuestions, ({ one, many }) => ({
  section: one(speakingTestSections, {
    fields: [speakingQuestions.sectionId],
    references: [speakingTestSections.id],
  }),
  answers: many(speakingAnswers),
}));

export const speakingSubmissionsRelations = relations(speakingSubmissions, ({ one, many }) => ({
  speakingTest: one(speakingTests, {
    fields: [speakingSubmissions.speakingTestId],
    references: [speakingTests.id],
  }),
  user: one(users, {
    fields: [speakingSubmissions.userId],
    references: [users.id],
  }),
  answers: many(speakingAnswers),
}));

export const speakingAnswersRelations = relations(speakingAnswers, ({ one, many }) => ({
  submission: one(speakingSubmissions, {
    fields: [speakingAnswers.submissionId],
    references: [speakingSubmissions.id],
  }),
  question: one(speakingQuestions, {
    fields: [speakingAnswers.questionId],
    references: [speakingQuestions.id],
  }),
  evaluations: many(speakingEvaluations),
}));

export const speakingEvaluationsRelations = relations(speakingEvaluations, ({ one }) => ({
  answer: one(speakingAnswers, {
    fields: [speakingEvaluations.answerId],
    references: [speakingAnswers.id],
  }),
  evaluator: one(users, {
    fields: [speakingEvaluations.evaluatorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertSpeakingTestSchema = createInsertSchema(speakingTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpeakingTestSectionSchema = createInsertSchema(speakingTestSections).omit({
  id: true,
  createdAt: true,
});

export const insertSpeakingQuestionSchema = createInsertSchema(speakingQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertSpeakingSubmissionSchema = createInsertSchema(speakingSubmissions).omit({
  id: true,
  submittedAt: true,
  evaluatedAt: true,
});

export const insertSpeakingAnswerSchema = createInsertSchema(speakingAnswers).omit({
  id: true,
  createdAt: true,
  evaluatedAt: true,
});

export const insertSpeakingEvaluationSchema = createInsertSchema(speakingEvaluations).omit({
  id: true,
  createdAt: true,
});

// Conversations table (Private Messaging)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  student: one(users, {
    fields: [conversations.studentId],
    references: [users.id],
    relationName: 'studentConversations',
  }),
  instructor: one(users, {
    fields: [conversations.instructorId],
    references: [users.id],
    relationName: 'instructorConversations',
  }),
  messages: many(messages),
}));

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// Insert schemas for chat system
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for site settings and testimonials
export const insertSiteSettingSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for subscription system
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
});

export const insertCoursePlanPricingSchema = createInsertSchema(coursePlanPricing).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertCourseRating = z.infer<typeof insertCourseRatingSchema>;
export type CourseRating = typeof courseRatings.$inferSelect;

// Extended course type with aggregated counts (for instructor dashboard)
export type InstructorCourseWithCounts = Course & {
  enrollmentsCount: number;
  lessonsCount: number;
  planPricing?: Array<CoursePlanPricing & { plan: SubscriptionPlan }>;
};

// Student course progress type
export type StudentCourseProgress = {
  course: Course;
  totalLessons: number;
  totalAssignments: number;
  submittedAssignments: number;
  totalTests: number;
  completedTests: number;
  averageTestScore: number;
  averageAssignmentScore: number;
  progressPercentage: number;
  nextLesson?: Lesson;
};

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type LessonProgress = typeof lessonProgress.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertQuestionOption = z.infer<typeof insertQuestionOptionSchema>;
export type QuestionOption = typeof questionOptions.$inferSelect;

export type InsertTestAttempt = z.infer<typeof insertTestAttemptSchema>;
export type TestAttempt = typeof testAttempts.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export type InsertPasswordResetRequest = z.infer<typeof insertPasswordResetRequestSchema>;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertCoursePlanPricing = z.infer<typeof insertCoursePlanPricingSchema>;
export type CoursePlanPricing = typeof coursePlanPricing.$inferSelect;

export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

// Speaking Test types
export type InsertSpeakingTest = z.infer<typeof insertSpeakingTestSchema>;
export type SpeakingTest = typeof speakingTests.$inferSelect;

export type InsertSpeakingTestSection = z.infer<typeof insertSpeakingTestSectionSchema>;
export type SpeakingTestSection = typeof speakingTestSections.$inferSelect;

export type InsertSpeakingQuestion = z.infer<typeof insertSpeakingQuestionSchema>;
export type SpeakingQuestion = typeof speakingQuestions.$inferSelect;

export type InsertSpeakingSubmission = z.infer<typeof insertSpeakingSubmissionSchema>;
export type SpeakingSubmission = typeof speakingSubmissions.$inferSelect;

export type InsertSpeakingAnswer = z.infer<typeof insertSpeakingAnswerSchema>;
export type SpeakingAnswer = typeof speakingAnswers.$inferSelect;

export type InsertSpeakingEvaluation = z.infer<typeof insertSpeakingEvaluationSchema>;
export type SpeakingEvaluation = typeof speakingEvaluations.$inferSelect;

// Course Analytics type (for instructor dashboard)
export type CourseAnalytics = {
  enrollmentTrend: { date: string; count: number }[];
  completionRate: number; // percentage 0-100
  averageTestScore: number; // 0-100
  averageAssignmentScore: number; // 0-100
  totalStudents: number;
  activeStudents: number; // students with recent activity (last 7 days)
};
