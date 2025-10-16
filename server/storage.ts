// Database storage implementation
import {
  users,
  courses,
  lessons,
  assignments,
  tests,
  enrollments,
  submissions,
  testAttempts,
  questions,
  questionOptions,
  notifications,
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
  type TestAttempt,
  type InsertTestAttempt,
  type Question,
  type InsertQuestion,
  type QuestionOption,
  type InsertQuestionOption,
  type Notification,
  type InsertNotification,
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
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  
  // Lesson operations
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  getDemoLessonsByCourse(courseId: string): Promise<Lesson[]>;
  getLesson(id: string): Promise<Lesson | undefined>;
  updateLesson(id: string, data: Partial<InsertLesson>): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  
  // Assignment operations
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  getAssignmentsByCourse(courseId: string): Promise<Assignment[]>;
  getAssignment(id: string): Promise<Assignment | undefined>;
  updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: string): Promise<void>;
  
  // Test operations
  createTest(test: InsertTest): Promise<Test>;
  getTestsByCourse(courseId: string): Promise<Test[]>;
  getTest(id: string): Promise<Test | undefined>;
  updateTest(id: string, data: Partial<InsertTest>): Promise<Test>;
  deleteTest(id: string): Promise<void>;
  
  // Question operations
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByTest(testId: string): Promise<Question[]>;
  getQuestion(id: string): Promise<Question | undefined>;
  updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  
  // Question Option operations
  createQuestionOption(option: InsertQuestionOption): Promise<QuestionOption>;
  getQuestionOptionsByQuestion(questionId: string): Promise<QuestionOption[]>;
  getQuestionOption(id: string): Promise<QuestionOption | undefined>;
  deleteQuestionOption(id: string): Promise<void>;
  
  // Enrollment operations
  createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment>;
  getEnrollmentsByUser(userId: string): Promise<Enrollment[]>;
  getEnrollmentByCourseAndUser(courseId: string, userId: string): Promise<Enrollment | null>;
  getEnrolledCourses(userId: string): Promise<Course[]>;
  getPendingPayments(): Promise<any[]>;
  updateEnrollmentStatus(enrollmentId: string, status: string): Promise<Enrollment>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
  getSubmissionsByInstructor(instructorId: string): Promise<any[]>;
  getSubmissionsByUser(userId: string): Promise<Submission[]>;
  updateSubmissionGrade(submissionId: string, grade: number, feedback: string, status: string): Promise<Submission>;
  deleteSubmission(submissionId: string): Promise<void>;
  
  // Test Attempts
  createTestAttempt(attempt: InsertTestAttempt): Promise<TestAttempt>;
  getTestAttemptsByTest(testId: string): Promise<TestAttempt[]>;
  getTestAttemptsByUser(userId: string): Promise<TestAttempt[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  clearReadNotifications(userId: string): Promise<void>;
  clearAllNotifications(userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  
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

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courses).where(eq(courses.id, id));
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

  async getDemoLessonsByCourse(courseId: string): Promise<Lesson[]> {
    return await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.isDemo, true)))
      .orderBy(lessons.order);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const [lesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, id));
    return lesson;
  }

  async updateLesson(id: string, data: Partial<InsertLesson>): Promise<Lesson> {
    const [lesson] = await db
      .update(lessons)
      .set(data)
      .where(eq(lessons.id, id))
      .returning();
    return lesson;
  }

  async deleteLesson(id: string): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
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

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id));
    return assignment;
  }

  async updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment> {
    const [assignment] = await db
      .update(assignments)
      .set(data)
      .where(eq(assignments.id, id))
      .returning();
    return assignment;
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
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

  async getTest(id: string): Promise<Test | undefined> {
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, id));
    return test;
  }

  async updateTest(id: string, data: Partial<InsertTest>): Promise<Test> {
    const [test] = await db
      .update(tests)
      .set(data)
      .where(eq(tests.id, id))
      .returning();
    return test;
  }

  async deleteTest(id: string): Promise<void> {
    await db.delete(tests).where(eq(tests.id, id));
  }

  // Question operations
  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  async getQuestionsByTest(testId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.testId, testId))
      .orderBy(questions.order);
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id));
    return question;
  }

  async updateQuestion(id: string, data: Partial<InsertQuestion>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set(data)
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  // Question Option operations
  async createQuestionOption(optionData: InsertQuestionOption): Promise<QuestionOption> {
    const [option] = await db.insert(questionOptions).values(optionData).returning();
    return option;
  }

  async getQuestionOptionsByQuestion(questionId: string): Promise<QuestionOption[]> {
    return await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, questionId))
      .orderBy(questionOptions.order);
  }

  async getQuestionOption(id: string): Promise<QuestionOption | undefined> {
    const [option] = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.id, id));
    return option;
  }

  async deleteQuestionOption(id: string): Promise<void> {
    await db.delete(questionOptions).where(eq(questionOptions.id, id));
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

  async getEnrollmentByCourseAndUser(courseId: string, userId: string): Promise<Enrollment | null> {
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.userId, userId)
      ))
      .limit(1);
    return enrollment || null;
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

  async getSubmissionsByInstructor(instructorId: string): Promise<any[]> {
    const result = await db
      .select({
        submission: submissions,
        assignment: assignments,
        course: courses,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(submissions.submittedAt));
    
    return result;
  }

  async getSubmissionsByUser(userId: string): Promise<Submission[]> {
    return await db
      .select()
      .from(submissions)
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.submittedAt));
  }

  async updateSubmissionGrade(
    submissionId: string,
    grade: number,
    feedback: string,
    status: string
  ): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set({
        grade,
        feedback,
        status,
        gradedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning();
    
    return submission;
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    await db.delete(submissions).where(eq(submissions.id, submissionId));
  }

  // Test attempt operations
  async createTestAttempt(attemptData: InsertTestAttempt): Promise<TestAttempt> {
    const [attempt] = await db.insert(testAttempts).values(attemptData).returning();
    return attempt;
  }

  async getTestAttemptsByTest(testId: string): Promise<TestAttempt[]> {
    return await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.testId, testId))
      .orderBy(desc(testAttempts.completedAt));
  }

  async getTestAttemptsByUser(userId: string): Promise<TestAttempt[]> {
    return await db
      .select()
      .from(testAttempts)
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.completedAt));
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  async clearReadNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, true)
      ));
  }

  async clearAllNotifications(userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, userId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    
    return result.length;
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
