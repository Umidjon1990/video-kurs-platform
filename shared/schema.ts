import { sql } from 'drizzle-orm';
import {
  index,
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

// Users table - Replit Auth integration with role extension
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).notNull().default('student'), // admin, instructor, student
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  coursesAsInstructor: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  testResults: many(testResults),
}));

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  thumbnailUrl: varchar("thumbnail_url"),
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
}));

// Lessons table
export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(),
  order: integer("order").notNull(),
  duration: integer("duration"), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
}));

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
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
  submissions: many(submissions),
}));

// Tests table
export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  questions: jsonb("questions").default(sql`'[]'`), // Array of {question, options, correctAnswer}
  passingScore: integer("passing_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testsRelations = relations(tests, ({ one, many }) => ({
  course: one(courses, {
    fields: [tests.courseId],
    references: [courses.id],
  }),
  results: many(testResults),
}));

// Enrollments table
export const enrollments = pgTable("enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  paymentMethod: varchar("payment_method", { length: 20 }), // naqd, karta, stripe
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

// Submissions table
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  fileUrl: text("file_url"),
  content: text("content"),
  grade: integer("grade"), // 0-100
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").defaultNow(),
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

// Test Results table
export const testResults = pgTable("test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => tests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  answers: jsonb("answers").notNull(), // User's answers
  score: integer("score").notNull(), // Percentage score
  completedAt: timestamp("completed_at").defaultNow(),
});

export const testResultsRelations = relations(testResults, ({ one }) => ({
  test: one(tests, {
    fields: [testResults.testId],
    references: [tests.id],
  }),
  user: one(users, {
    fields: [testResults.userId],
    references: [users.id],
  }),
}));

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

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
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

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  completedAt: true,
});

// TypeScript types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;
