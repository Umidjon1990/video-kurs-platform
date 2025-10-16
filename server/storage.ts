// Database storage implementation
import {
  users,
  courses,
  lessons,
  assignments,
  tests,
  enrollments,
  submissions,
  testResults,
  type User,
  type UpsertUser,
  type Course,
  type InsertCourse,
  type Lesson,
  type InsertLesson,
  type Assignment,
  type InsertAssignment,
  type Test,
  type InsertTest,
  type Enrollment,
  type InsertEnrollment,
  type Submission,
  type InsertSubmission,
  type TestResult,
  type InsertTestResult,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (Replit Auth required)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Course operations
  createCourse(course: InsertCourse): Promise<Course>;
  getCourse(id: string): Promise<Course | undefined>;
  getCoursesByInstructor(instructorId: string): Promise<Course[]>;
  getPublishedCourses(): Promise<Course[]>;
  updateCourseStatus(id: string, status: string): Promise<Course>;
  
  // Lesson operations
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  
  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
  
  // Test operations
  createTest(test: InsertTest): Promise<Test>;
  getTestsByCourse(courseId: string): Promise<Test[]>;
  
  // Enrollment operations
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  getEnrollmentsByUser(userId: string): Promise<Enrollment[]>;
  getEnrolledCourses(userId: string): Promise<Course[]>;
  getPendingPayments(): Promise<any[]>;
  updateEnrollmentStatus(enrollmentId: string, status: string): Promise<Enrollment>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
  
  // Test result operations
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  getTestResultsByTest(testId: string): Promise<TestResult[]>;
  
  // Statistics
  getStats(): Promise<{
    instructorCount: number;
    studentCount: number;
    courseCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          role: userData.role, // Use the provided role (which preserves existing for existing users)
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  // Course operations
  async createCourse(courseData: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(courseData).returning();
    return course;
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCoursesByInstructor(instructorId: string): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt));
  }

  async getPublishedCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'))
      .orderBy(desc(courses.createdAt));
  }

  async updateCourseStatus(id: string, status: string): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ status, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  // Lesson operations
  async createLesson(lessonData: InsertLesson): Promise<Lesson> {
    const [lesson] = await db.insert(lessons).values(lessonData).returning();
    return lesson;
  }

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(lessons.order);
  }

  // Assignment operations
  async createAssignment(assignmentData: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(assignmentData).returning();
    return assignment;
  }

  async getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
    return await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(desc(assignments.createdAt));
  }

  // Test operations
  async createTest(testData: InsertTest): Promise<Test> {
    const [test] = await db.insert(tests).values(testData).returning();
    return test;
  }

  async getTestsByCourse(courseId: string): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .where(eq(tests.courseId, courseId))
      .orderBy(desc(tests.createdAt));
  }

  // Enrollment operations
  async createEnrollment(enrollmentData: InsertEnrollment): Promise<Enrollment> {
    const [enrollment] = await db.insert(enrollments).values(enrollmentData).returning();
    return enrollment;
  }

  async getEnrollmentsByUser(userId: string): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, userId))
      .orderBy(desc(enrollments.enrolledAt));
  }

  async getEnrolledCourses(userId: string): Promise<Course[]> {
    const result = await db
      .select({ course: courses })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(and(
        eq(enrollments.userId, userId),
        eq(enrollments.paymentStatus, 'approved')
      ))
      .orderBy(desc(enrollments.enrolledAt));
    
    return result.map(r => r.course);
  }

  async getPendingPayments(): Promise<any[]> {
    const result = await db
      .select({
        enrollment: enrollments,
        course: courses,
        user: users,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(eq(enrollments.paymentStatus, 'pending'))
      .orderBy(desc(enrollments.enrolledAt));
    
    return result;
  }

  async updateEnrollmentStatus(enrollmentId: string, status: string): Promise<Enrollment> {
    const [enrollment] = await db
      .update(enrollments)
      .set({ paymentStatus: status })
      .where(eq(enrollments.id, enrollmentId))
      .returning();
    
    return enrollment;
  }

  // Submission operations
  async createSubmission(submissionData: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(submissionData).returning();
    return submission;
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.assignmentId, assignmentId))
      .orderBy(desc(submissions.submittedAt));
  }

  // Test result operations
  async createTestResult(resultData: InsertTestResult): Promise<TestResult> {
    const [result] = await db.insert(testResults).values(resultData).returning();
    return result;
  }

  async getTestResultsByTest(testId: string): Promise<TestResult[]> {
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.testId, testId))
      .orderBy(desc(testResults.completedAt));
  }

  // Statistics
  async getStats() {
    const instructors = await this.getUsersByRole('instructor');
    const students = await this.getUsersByRole('student');
    const allCourses = await db.select().from(courses);

    return {
      instructorCount: instructors.length,
      studentCount: students.length,
      courseCount: allCourses.length,
    };
  }
}

export const storage = new DatabaseStorage();
