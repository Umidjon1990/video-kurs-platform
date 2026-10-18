import type { Request, Response, NextFunction } from "express";
/** Access is checked on every content request; scheduled jobs are not an authorization boundary. */
export async function coursePermission(
  storage: any,
  userId: string | undefined,
  courseId: string,
  now = new Date(),
) {
  const course = await storage.getCourse(courseId);
  if (!course) return { allowed: false, staff: false, course: null };
  const user = userId ? await storage.getUser(userId) : null;
  const staff =
    user?.status === "active" &&
    (user.role === "admin" ||
      (user.role === "instructor" && course.instructorId === userId));
  if (staff) return { allowed: true, staff: true, course };
  if (course.isFree === true && course.status === "published")
    return { allowed: true, staff: false, course };
  if (!userId || !user || user.status !== "active")
    return { allowed: false, staff: false, course };
  const enrollment = await storage.getEnrollmentByCourseAndUser(
    courseId,
    userId,
  );
  if (
    !enrollment ||
    !["approved", "confirmed"].includes(enrollment.paymentStatus)
  )
    return { allowed: false, staff: false, course };
  const subscriptions = await storage.getUserSubscriptions(userId);
  const rows = subscriptions
    .map((r: any) => r.subscription || r)
    .filter((s: any) => s.courseId === courseId);
  const active = rows.some(
    (s: any) =>
      s.status === "active" &&
      new Date(s.startDate) <= now &&
      new Date(s.endDate) > now,
  );
  // Explicit permanent legacy enrollments are retained. A missing timed subscription grants no access.
  const permanentLegacy =
    rows.length === 0 && !enrollment.planId && course.subscriptionDays === null;
  return { allowed: active || permanentLegacy, staff: false, course };
}
export function learnerConfig(value: any): any {
  if (Array.isArray(value)) return value.map(learnerConfig);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) => !/(?:correct|answer|solution|keyfacts|rubric)/i.test(key),
        )
        .map(([key, v]) => [key, learnerConfig(v)]),
    );
  return value;
}
export function createCourseContentGuard(
  storage: any,
  getLocks: (courseId: string, userId: string) => Promise<any>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = req.path;
      let courseId: string | undefined, lesson: any, test: any;
      const userId = (req.user as any)?.id || (req.user as any)?.claims?.sub;
      let match =
        /^\/api\/(?:student\/)?courses\/([^/]+)\/(lessons|tests|assignments|essay-questions|progress|speaking-tests)$/.exec(
          path,
        );
      if (match) courseId = decodeURIComponent(match[1]);
      match =
        /^\/api\/lessons\/([^/]+)\/(?:sections|progress|essay-question|essay-submission)$/.exec(
          path,
        );
      if (match) {
        lesson = await storage.getLesson(decodeURIComponent(match[1]));
        if (!lesson) return res.status(404).json({ message: "Dars topilmadi" });
        courseId = lesson.courseId;
      }
      match =
        /^\/api\/(?:student\/)?tests\/([^/]+)\/(?:questions|submit)$/.exec(
          path,
        );
      if (match) {
        test = await storage.getTest(decodeURIComponent(match[1]));
        if (!test) return res.status(404).json({ message: "Test topilmadi" });
        courseId = test.courseId;
        if (test.lessonId) lesson = await storage.getLesson(test.lessonId);
      }
      match = /^\/api\/questions\/([^/]+)\/options$/.exec(path);
      if (match) {
        const question = await storage.getQuestion(
          decodeURIComponent(match[1]),
        );
        if (!question)
          return res.status(404).json({ message: "Savol topilmadi" });
        test = await storage.getTest(question.testId);
        if (!test) return res.status(404).json({ message: "Test topilmadi" });
        courseId = test.courseId;
        if (test.lessonId) lesson = await storage.getLesson(test.lessonId);
      }
      match = /^\/api\/assignments\/([^/]+)\/submit$/.exec(path);
      if (match) {
        const assignment = await storage.getAssignment(
          decodeURIComponent(match[1]),
        );
        if (!assignment)
          return res.status(404).json({ message: "Vazifa topilmadi" });
        courseId = assignment.courseId;
        if (assignment.lessonId)
          lesson = await storage.getLesson(assignment.lessonId);
      }
      match = /^\/api\/student\/speaking-tests\/([^/]+)(?:\/submit)?$/.exec(
        path,
      );
      if (match) {
        test = await storage.getSpeakingTest(decodeURIComponent(match[1]));
        if (!test) return res.status(404).json({ message: "Test topilmadi" });
        courseId = test.courseId;
        if (test.lessonId) lesson = await storage.getLesson(test.lessonId);
      }
      if (!courseId) return next();
      if (
        (req as any).platformGrant?.courseId &&
        (req as any).platformGrant.courseId !== courseId
      )
        return res
          .status(403)
          .json({ message: "Boshqa mahsulotga kirish ruxsati yo‘q" });
      const permission = await coursePermission(storage, userId, courseId);
      const demo =
        (lesson?.isDemo === true || test?.isDemo === true) &&
        permission.course?.status === "published";
      if (!permission.allowed && !demo)
        return res
          .status(userId ? 403 : 401)
          .json({ message: "Kursga faol kirish huquqi kerak" });
      const features = (req as any).platformGrant?.features;
      if (!permission.staff && !demo && features) {
        if (
          (test || /\/(?:tests|speaking-tests)(?:\/|$)/.test(path)) &&
          features.hasTests !== true
        )
          return res.status(403).json({ message: "Bu tarifda testlar yo‘q" });
        if (
          /\/(?:assignments|essay-question|essay-submission)/.test(path) &&
          features.hasAssignments !== true
        )
          return res
            .status(403)
            .json({ message: "Bu tarifda yozma vazifalar yo‘q" });
      }
      if (
        !permission.staff &&
        test &&
        (test.isDraft === true || test.isPublished === false)
      )
        return res.status(404).json({ message: "Test nashrda mavjud emas" });
      if (!permission.staff && !demo && userId) {
        const locks = await getLocks(courseId, userId);
        if (lesson && locks.lockedLessons?.[lesson.id]?.locked)
          return res
            .status(403)
            .json({ message: "Dars hali ochilmagan", code: "LESSON_LOCKED" });
        if (
          !lesson &&
          /\/(?:lessons|tests|assignments|essay-questions)$/.test(path) &&
          req.method === "GET"
        ) {
          const send = res.json.bind(res);
          res.json = ((body: any) =>
            send(
              Array.isArray(body)
                ? body.map((item: any) =>
                    locks.lockedLessons?.[item.lessonId || item.id]?.locked
                      ? {
                          id: item.id,
                          title: item.title,
                          description: item.description,
                          courseId: item.courseId,
                          moduleId: item.moduleId,
                          order: item.order,
                          isDemo: item.isDemo,
                          locked: true,
                        }
                      : item,
                  )
                : body,
            )) as any;
        }
      }
      return next();
    } catch (error) {
      next(error);
    }
  };
}
