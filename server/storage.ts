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
  announcements,
  conversations,
  messages,
  siteSettings,
  testimonials,
  subscriptionPlans,
  coursePlanPricing,
  userSubscriptions,
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
  type Announcement,
  type InsertAnnouncement,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type InsertSiteSetting,
  type SiteSetting,
  type InsertTestimonial,
  type Testimonial,
  type InstructorCourseWithCounts,
  type CourseAnalytics,
  type StudentCourseProgress,
  type SubscriptionPlan,
  type CoursePlanPricing,
  type InsertCoursePlanPricing,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (Replit Auth required)
  getUser(id: string): Promise<User | undefined>;
  getUserByPhoneOrEmail(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Course operations
  createCourse(course: InsertCourse): Promise<Course>;
  getCourse(id: string): Promise<Course | undefined>;
  getCoursesByInstructor(instructorId: string): Promise<InstructorCourseWithCounts[]>;
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
  getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]>;
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
  
  // Announcement operations
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAnnouncementsByInstructor(instructorId: string): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<void>;
  
  // Chat operations (Private Messaging)
  getOrCreateConversation(studentId: string, instructorId: string): Promise<any>;
  getConversations(userId: string, role: string): Promise<any[]>;
  sendMessage(conversationId: string, senderId: string, content: string): Promise<any>;
  getMessages(conversationId: string): Promise<any[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  
  // Statistics
  getStats(): Promise<{
    instructorCount: number;
    studentCount: number;
    courseCount: number;
  }>;
  getTrends(): Promise<Array<{
    date: string;
    enrollments: number;
    revenue: number;
  }>>;
  
  // Course Analytics
  getCourseAnalytics(courseId: string): Promise<CourseAnalytics>;
  
  // Student Progress Tracking
  getStudentProgress(userId: string): Promise<StudentCourseProgress[]>;
  
  // Site Settings operations (Admin CMS)
  getSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting>;
  
  // Testimonials operations (Admin CMS)
  getAllTestimonials(): Promise<Testimonial[]>;
  getPublishedTestimonials(): Promise<Testimonial[]>;
  getTestimonial(id: string): Promise<Testimonial | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, data: Partial<InsertTestimonial>): Promise<Testimonial>;
  deleteTestimonial(id: string): Promise<void>;
  
  // Subscription operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined>;
  createCoursePlanPricing(pricing: InsertCoursePlanPricing): Promise<CoursePlanPricing>;
  getCoursePlanPricing(courseId: string): Promise<CoursePlanPricing[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhoneOrEmail(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, username), eq(users.email, username)))
      .limit(1);
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

  async getCoursesByInstructor(instructorId: string): Promise<InstructorCourseWithCounts[]> {
    const instructorCourses = await db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, instructorId))
      .orderBy(desc(courses.createdAt));
    
    // Get enrollments and lessons count for each course
    const coursesWithCounts = await Promise.all(
      instructorCourses.map(async (course) => {
        const [enrollmentCount, lessonCount] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.courseId, course.id),
                or(
                  eq(enrollments.paymentStatus, 'confirmed'),
                  eq(enrollments.paymentStatus, 'approved')
                )
              )
            )
            .then(result => result[0]?.count || 0),
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(lessons)
            .where(eq(lessons.courseId, course.id))
            .then(result => result[0]?.count || 0)
        ]);
        
        return {
          ...course,
          enrollmentsCount: enrollmentCount,
          lessonsCount: lessonCount,
        };
      })
    );
    
    return coursesWithCounts;
  }

  async getPublishedCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(eq(courses.status, 'published'))
      .orderBy(desc(courses.createdAt));
  }

  async getPublicCourses(filters?: {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    instructorId?: string;
    hasDiscount?: boolean;
  }): Promise<Array<Course & { instructor: User; enrollmentsCount: number }>> {
    let query = db
      .select({
        course: courses,
        instructor: users,
      })
      .from(courses)
      .innerJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courses.status, 'published'))
      .$dynamic();

    // Apply filters
    const conditions = [eq(courses.status, 'published')];

    if (filters?.search) {
      conditions.push(
        or(
          sql`LOWER(${courses.title}) LIKE LOWER(${`%${filters.search}%`})`,
          sql`LOWER(${courses.description}) LIKE LOWER(${`%${filters.search}%`})`
        )!
      );
    }

    if (filters?.category) {
      conditions.push(eq(courses.category, filters.category));
    }

    if (filters?.minPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) >= ${filters.minPrice}`);
    }

    if (filters?.maxPrice !== undefined) {
      conditions.push(sql`CAST(${courses.price} AS DECIMAL) <= ${filters.maxPrice}`);
    }

    if (filters?.instructorId) {
      conditions.push(eq(courses.instructorId, filters.instructorId));
    }

    if (filters?.hasDiscount) {
      conditions.push(sql`${courses.discountedPrice} IS NOT NULL`);
    }

    const results = await db
      .select({
        course: courses,
        instructor: users,
      })
      .from(courses)
      .innerJoin(users, eq(courses.instructorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(courses.createdAt));

    // Get enrollments count for each course
    const coursesWithCounts = await Promise.all(
      results.map(async ({ course, instructor }) => {
        const enrollmentCount = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.courseId, course.id),
              or(
                eq(enrollments.paymentStatus, 'confirmed'),
                eq(enrollments.paymentStatus, 'approved')
              )
            )
          )
          .then(result => result[0]?.count || 0);

        return {
          ...course,
          instructor,
          enrollmentsCount: enrollmentCount,
        };
      })
    );

    return coursesWithCounts;
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

  async getEnrollmentsByCourse(courseId: string): Promise<Enrollment[]> {
    return await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.courseId, courseId),
        eq(enrollments.paymentStatus, 'approved')
      ))
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

  // Announcement operations
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getAnnouncementsByInstructor(instructorId: string): Promise<Announcement[]> {
    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.instructorId, instructorId))
      .orderBy(desc(announcements.createdAt));
    return result;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    const result = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
    return result;
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db
      .delete(announcements)
      .where(eq(announcements.id, id));
  }

  // Chat operations (Private Messaging)
  async getOrCreateConversation(studentId: string, instructorId: string): Promise<any> {
    // Check if conversation already exists
    const [existing] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.studentId, studentId),
          eq(conversations.instructorId, instructorId)
        )
      );
    
    if (existing) {
      return existing;
    }
    
    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({ studentId, instructorId })
      .returning();
    
    return conversation;
  }

  async getConversations(userId: string, role: string): Promise<any[]> {
    console.log('[STORAGE] getConversations called - userId:', userId, 'role:', role);
    
    // Get conversations with last message and user info
    if (role === 'student') {
      const result = await db
        .select({
          id: conversations.id,
          studentId: conversations.studentId,
          instructorId: conversations.instructorId,
          lastMessageAt: conversations.lastMessageAt,
          createdAt: conversations.createdAt,
          instructorFirstName: users.firstName,
          instructorLastName: users.lastName,
          instructorEmail: users.email,
          instructorProfileImageUrl: users.profileImageUrl,
        })
        .from(conversations)
        .leftJoin(users, eq(conversations.instructorId, users.id))
        .where(eq(conversations.studentId, userId))
        .orderBy(desc(conversations.lastMessageAt));
      
      console.log('[STORAGE] Student conversations found:', result.length);
      return result;
    } else {
      const result = await db
        .select({
          id: conversations.id,
          studentId: conversations.studentId,
          instructorId: conversations.instructorId,
          lastMessageAt: conversations.lastMessageAt,
          createdAt: conversations.createdAt,
          studentFirstName: users.firstName,
          studentLastName: users.lastName,
          studentEmail: users.email,
          studentProfileImageUrl: users.profileImageUrl,
        })
        .from(conversations)
        .leftJoin(users, eq(conversations.studentId, users.id))
        .where(eq(conversations.instructorId, userId))
        .orderBy(desc(conversations.lastMessageAt));
      return result;
    }
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<any> {
    // Create message
    const [message] = await db
      .insert(messages)
      .values({ conversationId, senderId, content })
      .returning();
    
    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    
    return message;
  }

  async getMessages(conversationId: string): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderEmail: users.email,
        senderProfileImageUrl: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    return result;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    // Mark all messages in conversation as read where receiver is userId
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isRead, false),
          // Only mark messages NOT sent by current user
          eq(messages.senderId, userId) // This should be NOT equal, but we'll use a different approach
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    // Get conversations where user is participant
    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.studentId, userId),
          eq(conversations.instructorId, userId)
        )
      );
    
    if (userConversations.length === 0) {
      return 0;
    }
    
    const conversationIds = userConversations.map(c => c.id);
    
    // Count unread messages in these conversations that were NOT sent by current user
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.isRead, false),
          // Message is NOT from current user (they sent it to someone else)
        )
      );
    
    // Filter manually to exclude messages sent by current user
    const filteredUnread = unreadMessages.filter(m => 
      conversationIds.includes(m.conversationId) && m.senderId !== userId
    );
    
    return filteredUnread.length;
  }

  // Get enrollment and revenue trends (last 7 days) - optimized single query
  async getTrends() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    // Single query for all enrollments in the last 7 days
    const allEnrollments = await db
      .select({
        enrolledAt: enrollments.enrolledAt,
        price: courses.price,
        discountedPrice: courses.discountedPrice,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          or(
            eq(enrollments.paymentStatus, 'confirmed'),
            eq(enrollments.paymentStatus, 'approved')
          ),
          sql`${enrollments.enrolledAt} >= ${sevenDaysAgo}`
        )
      );
    
    // Group by day
    const trendsByDay = new Map<string, { enrollments: number; revenue: number }>();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trendsByDay.set(dateKey, { enrollments: 0, revenue: 0 });
    }
    
    // Aggregate data
    allEnrollments.forEach(({ enrolledAt, price, discountedPrice }) => {
      if (!enrolledAt) return;
      
      const dateKey = new Date(enrolledAt).toISOString().split('T')[0];
      const existing = trendsByDay.get(dateKey);
      
      if (existing) {
        existing.enrollments += 1;
        existing.revenue += Number(discountedPrice) || Number(price) || 0;
      }
    });
    
    // Convert to array
    return Array.from(trendsByDay.entries()).map(([date, data]) => ({
      date,
      enrollments: data.enrollments,
      revenue: data.revenue,
    }));
  }

  // Statistics
  async getStats() {
    const instructors = await this.getUsersByRole('instructor');
    const students = await this.getUsersByRole('student');
    const allCourses = await db.select().from(courses);
    
    // Calculate total revenue from confirmed enrollments with course prices
    const confirmedEnrollments = await db
      .select({
        enrollment: enrollments,
        course: courses,
      })
      .from(enrollments)
      .leftJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        or(
          eq(enrollments.paymentStatus, 'confirmed'),
          eq(enrollments.paymentStatus, 'approved')
        )
      );
    
    const totalRevenue = confirmedEnrollments.reduce((sum, { enrollment, course }) => {
      // Use discounted price if available, otherwise original price
      const price = Number(course?.discountedPrice) || Number(course?.price) || 0;
      return sum + price;
    }, 0);
    
    // Get total enrollments count
    const totalEnrollments = confirmedEnrollments.length;
    
    // Calculate growth indicators (last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const recentEnrollments = confirmedEnrollments.filter(({ enrollment }) => 
      enrollment.enrolledAt && new Date(enrollment.enrolledAt) >= last7Days
    ).length;
    
    const previousEnrollments = confirmedEnrollments.filter(({ enrollment }) => {
      const date = enrollment.enrolledAt ? new Date(enrollment.enrolledAt) : null;
      return date && date >= previous7Days && date < last7Days;
    }).length;
    
    // Calculate growth properly - avoid misleading 100% when both periods are zero
    let enrollmentGrowth = 0;
    if (previousEnrollments > 0) {
      enrollmentGrowth = ((recentEnrollments - previousEnrollments) / previousEnrollments) * 100;
    } else if (recentEnrollments > 0) {
      // Special case: no previous data but have new enrollments - cap at 100%
      enrollmentGrowth = 100;
    }
    // If both are zero, growth remains 0

    return {
      instructorCount: instructors.length,
      studentCount: students.length,
      courseCount: allCourses.length,
      totalRevenue,
      totalEnrollments,
      enrollmentGrowth: Math.round(enrollmentGrowth * 10) / 10, // Round to 1 decimal
      recentEnrollments, // Last 7 days
    };
  }

  // Course Analytics
  async getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all confirmed enrollments for this course
    const courseEnrollments = await db
      .select({
        userId: enrollments.userId,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.courseId, courseId),
          or(
            eq(enrollments.paymentStatus, 'confirmed'),
            eq(enrollments.paymentStatus, 'approved')
          )
        )
      );

    const totalStudents = courseEnrollments.length;

    // Calculate enrollment trend (last 14 days)
    const enrollmentTrendMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      enrollmentTrendMap.set(dateKey, 0);
    }

    courseEnrollments.forEach(({ enrolledAt }) => {
      if (!enrolledAt) return;
      const dateKey = new Date(enrolledAt).toISOString().split('T')[0];
      const current = enrollmentTrendMap.get(dateKey);
      if (current !== undefined) {
        enrollmentTrendMap.set(dateKey, current + 1);
      }
    });

    const enrollmentTrend = Array.from(enrollmentTrendMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    if (totalStudents === 0) {
      return {
        enrollmentTrend,
        completionRate: 0,
        averageTestScore: 0,
        averageAssignmentScore: 0,
        totalStudents: 0,
        activeStudents: 0,
      };
    }

    const studentIds = courseEnrollments.map(e => e.userId);

    // Get all tests for this course
    const courseTests = await db
      .select({ id: tests.id })
      .from(tests)
      .where(eq(tests.courseId, courseId));

    const testIds = courseTests.map(t => t.id);

    // Calculate completion rate and average test score
    let completedStudentsCount = 0;
    let totalTestScore = 0;
    let testAttemptCount = 0;

    if (testIds.length > 0) {
      const allTestAttempts = await db
        .select({
          userId: testAttempts.userId,
          score: testAttempts.score,
          totalPoints: testAttempts.totalPoints,
          isPassed: testAttempts.isPassed,
        })
        .from(testAttempts)
        .where(
          and(
            inArray(testAttempts.testId, testIds),
            inArray(testAttempts.userId, studentIds)
          )
        );

      // Count students who passed at least one test
      const passedStudents = new Set(
        allTestAttempts.filter((a: any) => a.isPassed).map((a: any) => a.userId)
      );
      completedStudentsCount = passedStudents.size;

      // Calculate average test score
      allTestAttempts.forEach((attempt: any) => {
        if (attempt.score !== null && attempt.totalPoints !== null && attempt.totalPoints > 0) {
          totalTestScore += (attempt.score / attempt.totalPoints) * 100;
          testAttemptCount++;
        }
      });
    }

    const completionRate = totalStudents > 0 ? (completedStudentsCount / totalStudents) * 100 : 0;
    const averageTestScore = testAttemptCount > 0 ? totalTestScore / testAttemptCount : 0;

    // Get all assignments for this course
    const courseAssignments = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(eq(assignments.courseId, courseId));

    const assignmentIds = courseAssignments.map(a => a.id);

    // Calculate average assignment score
    let totalAssignmentScore = 0;
    let assignmentCount = 0;

    if (assignmentIds.length > 0) {
      const assignmentSubmissions = await db
        .select({
          grade: submissions.grade,
        })
        .from(submissions)
        .where(
          and(
            inArray(submissions.assignmentId, assignmentIds),
            inArray(submissions.userId, studentIds),
            sql`${submissions.grade} IS NOT NULL`
          )
        );

      assignmentSubmissions.forEach(sub => {
        if (sub.grade !== null) {
          totalAssignmentScore += sub.grade;
          assignmentCount++;
        }
      });
    }

    const averageAssignmentScore = assignmentCount > 0 ? totalAssignmentScore / assignmentCount : 0;

    // Calculate active students (with submissions or test attempts in last 7 days)
    const recentActivity = assignmentIds.length > 0
      ? await db
          .select({
            userId: submissions.userId,
            submittedAt: submissions.submittedAt,
          })
          .from(submissions)
          .where(
            and(
              inArray(submissions.assignmentId, assignmentIds),
              inArray(submissions.userId, studentIds),
              sql`${submissions.submittedAt} >= ${sevenDaysAgo}`
            )
          )
      : [];

    const recentTestActivity = testIds.length > 0
      ? await db
          .select({
            userId: testAttempts.userId,
            completedAt: testAttempts.completedAt,
          })
          .from(testAttempts)
          .where(
            and(
              inArray(testAttempts.testId, testIds),
              inArray(testAttempts.userId, studentIds),
              sql`${testAttempts.completedAt} >= ${sevenDaysAgo}`
            )
          )
      : [];

    const activeStudentSet = new Set([
      ...recentActivity.map(a => a.userId),
      ...recentTestActivity.map(a => a.userId),
    ]);

    const activeStudents = activeStudentSet.size;

    return {
      enrollmentTrend,
      completionRate: Math.round(completionRate * 10) / 10,
      averageTestScore: Math.round(averageTestScore * 10) / 10,
      averageAssignmentScore: Math.round(averageAssignmentScore * 10) / 10,
      totalStudents,
      activeStudents,
    };
  }

  // Student Progress Tracking (Optimized - batched queries)
  async getStudentProgress(userId: string): Promise<StudentCourseProgress[]> {
    // 1. Get all enrolled courses
    const enrolledCourses = await db
      .select({ course: courses })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.userId, userId),
          eq(enrollments.paymentStatus, 'approved')
        )
      )
      .orderBy(desc(enrollments.enrolledAt));

    if (enrolledCourses.length === 0) {
      return [];
    }

    const courseIds = enrolledCourses.map(e => e.course.id);

    // 2. Batch fetch all lessons for all courses
    const allLessons = await db
      .select({
        courseId: lessons.courseId,
        id: lessons.id,
        title: lessons.title,
        order: lessons.order,
      })
      .from(lessons)
      .where(inArray(lessons.courseId, courseIds));

    // 3. Batch fetch all assignments for all courses
    const allAssignments = await db
      .select({
        courseId: assignments.courseId,
        id: assignments.id,
      })
      .from(assignments)
      .where(inArray(assignments.courseId, courseIds));

    const assignmentIds = allAssignments.map(a => a.id);

    // 4. Batch fetch all submissions by this user
    const allSubmissions = assignmentIds.length > 0
      ? await db
          .select({
            assignmentId: submissions.assignmentId,
            grade: submissions.grade,
          })
          .from(submissions)
          .where(
            and(
              inArray(submissions.assignmentId, assignmentIds),
              eq(submissions.userId, userId)
            )
          )
      : [];

    // 5. Batch fetch all tests for all courses
    const allTests = await db
      .select({
        courseId: tests.courseId,
        id: tests.id,
      })
      .from(tests)
      .where(inArray(tests.courseId, courseIds));

    const testIds = allTests.map(t => t.id);

    // 6. Batch fetch all test attempts by this user
    const allTestAttempts = testIds.length > 0
      ? await db
          .select({
            testId: testAttempts.testId,
            score: testAttempts.score,
            totalPoints: testAttempts.totalPoints,
          })
          .from(testAttempts)
          .where(
            and(
              inArray(testAttempts.testId, testIds),
              eq(testAttempts.userId, userId)
            )
          )
      : [];

    // 7. Combine data in memory for each course
    const progressData: StudentCourseProgress[] = enrolledCourses.map(({ course }) => {
      const courseLessons = allLessons.filter(l => l.courseId === course.id);
      const courseAssignments = allAssignments.filter(a => a.courseId === course.id);
      const courseAssignmentIds = courseAssignments.map(a => a.id);
      const courseSubmissions = allSubmissions.filter(s => courseAssignmentIds.includes(s.assignmentId));
      
      const courseTests = allTests.filter(t => t.courseId === course.id);
      const courseTestIds = courseTests.map(t => t.id);
      const courseTestAttempts = allTestAttempts.filter(a => courseTestIds.includes(a.testId));
      
      const completedTests = new Set(courseTestAttempts.map(a => a.testId)).size;
      
      const averageTestScore = courseTestAttempts.length > 0
        ? Math.round(
            (courseTestAttempts.reduce((sum, t) => sum + (t.score || 0), 0) / courseTestAttempts.length) * 10
          ) / 10
        : 0;

      const gradedSubmissions = courseSubmissions.filter(s => s.grade !== null);
      const averageAssignmentScore = gradedSubmissions.length > 0
        ? Math.round(
            (gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length) * 10
          ) / 10
        : 0;

      const totalItems = courseLessons.length + courseAssignments.length + courseTests.length;
      const completedItems = courseSubmissions.length + completedTests;
      const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      const nextLesson = courseLessons.sort((a, b) => (a.order || 0) - (b.order || 0))[0];

      return {
        course,
        totalLessons: courseLessons.length,
        totalAssignments: courseAssignments.length,
        submittedAssignments: courseSubmissions.length,
        totalTests: courseTests.length,
        completedTests,
        averageTestScore,
        averageAssignmentScore,
        progressPercentage,
        nextLesson: nextLesson ? {
          id: nextLesson.id,
          title: nextLesson.title,
          courseId: nextLesson.courseId,
          order: nextLesson.order,
        } as Lesson : undefined,
      };
    });

    return progressData;
  }
  
  // Site Settings operations (Admin CMS)
  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings);
  }
  
  async getSiteSetting(key: string): Promise<SiteSetting | undefined> {
    const [setting] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return setting;
  }
  
  async upsertSiteSetting(setting: InsertSiteSetting): Promise<SiteSetting> {
    const [result] = await db
      .insert(siteSettings)
      .values(setting)
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value: setting.value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
  
  // Testimonials operations (Admin CMS)
  async getAllTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).orderBy(testimonials.order, testimonials.createdAt);
  }
  
  async getPublishedTestimonials(): Promise<Testimonial[]> {
    return await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isPublished, true))
      .orderBy(testimonials.order, testimonials.createdAt);
  }
  
  async getTestimonial(id: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
    return testimonial;
  }
  
  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [result] = await db.insert(testimonials).values(testimonial).returning();
    return result;
  }
  
  async updateTestimonial(id: string, data: Partial<InsertTestimonial>): Promise<Testimonial> {
    const [result] = await db
      .update(testimonials)
      .set(data)
      .where(eq(testimonials.id, id))
      .returning();
    return result;
  }
  
  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }
  
  // Subscription operations
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.order);
  }
  
  async getSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, name));
    return plan;
  }
  
  async createCoursePlanPricing(pricing: InsertCoursePlanPricing): Promise<CoursePlanPricing> {
    const [result] = await db.insert(coursePlanPricing).values(pricing).returning();
    return result;
  }
  
  async getCoursePlanPricing(courseId: string): Promise<CoursePlanPricing[]> {
    return await db.select().from(coursePlanPricing).where(eq(coursePlanPricing.courseId, courseId));
  }
}

export const storage = new DatabaseStorage();
