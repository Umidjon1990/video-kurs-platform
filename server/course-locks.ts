import { storage } from "./storage";
import { db } from "./db";
import { studentGroupMembers, testAttempts, tests } from "@shared/schema";
import { and, eq, inArray } from "drizzle-orm";
export async function getCourseLocks(courseId: string, userId: string) {
  // Get student's group enrollment
  const enrollment = await storage.getEnrollmentByCourseAndUser(
    courseId,
    userId,
  );
  if (!enrollment) return { settings: null, lockedLessons: {} };

  // Try group-specific settings first
  let settings: any = null;
  const groupId = enrollment.groupId;
  if (groupId) {
    settings = await storage.getGroupCourseSettings(groupId, courseId);
  }

  // Fallback: use course-level settings (including test gate)
  const course = await storage.getCourse(courseId);
  if (!settings && course) {
    const hasSchedule = course.unlockType && course.unlockType !== "free";
    const hasTestGate = course.testGateEnabled;
    if (hasSchedule || hasTestGate) {
      settings = {
        unlockType: course.unlockType || "free",
        unlockIntervalDays: course.unlockIntervalDays ?? 1,
        unlockWeekDays: course.unlockWeekDays ?? [],
        unlockStartDate: course.unlockStartDate,
        testGateEnabled: course.testGateEnabled ?? false,
        minPassScore: course.minPassScore ?? 80,
      };
    }
  }

  // Check if any lesson has requiresTestPass — if so, we need to process even without schedule
  const courseLessons = await storage.getLessonsByCourse(courseId);
  const hasPerLessonGate = courseLessons.some((l: any) => l.requiresTestPass);

  if (!settings && hasPerLessonGate) {
    settings = {
      unlockType: "free",
      unlockIntervalDays: 1,
      unlockWeekDays: [],
      unlockStartDate: null,
      testGateEnabled: false,
      minPassScore: course?.minPassScore ?? 80,
    };
  }

  if (!settings) {
    return { settings: null, lockedLessons: {} };
  }

  const hasAnyGate = settings.testGateEnabled || hasPerLessonGate;
  const onlyTestGate = settings.unlockType === "free" && hasAnyGate;
  if (!onlyTestGate && settings.unlockType === "free") {
    return { settings, lockedLessons: {} };
  }

  // Individual start date logic:
  // When useIndividualStartDate is enabled, each student's schedule starts
  // from their personalStartDate (if set) or addedAt date (when they joined the group).
  // This means admin doesn't need to set dates per student - it's automatic.
  if (settings.useIndividualStartDate && groupId) {
    const membership = await db
      .select()
      .from(studentGroupMembers)
      .where(
        and(
          eq(studentGroupMembers.groupId, groupId),
          eq(studentGroupMembers.userId, userId),
        ),
      )
      .limit(1);
    if (membership[0]) {
      const personalDate =
        membership[0].personalStartDate || membership[0].addedAt;
      if (personalDate) {
        settings.unlockStartDate = new Date(personalDate);
      }
    }
  }

  if (!settings.unlockStartDate && settings.unlockType !== "free") {
    settings.unlockStartDate = new Date();
  }

  // Get all lessons ordered (reuse courseLessons from above)
  const sorted = [...courseLessons].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  // Get student's test attempts
  const attempts = await db
    .select()
    .from(testAttempts)
    .where(eq(testAttempts.userId, userId));

  // Get tests per lesson (each lesson may have a test)
  const testsForLessons = await db
    .select()
    .from(tests)
    .where(
      inArray(
        tests.lessonId,
        sorted.map((l) => l.id),
      ),
    );

  const testByLesson: Record<string, string> = {};
  for (const t of testsForLessons) {
    if (t.lessonId) testByLesson[t.lessonId] = t.id;
  }

  // Calculate lock status for each lesson
  const lockedLessons: Record<
    string,
    {
      locked: boolean;
      unlockDate?: string;
      reason: string;
      scheduleReady?: boolean;
    }
  > = {};

  // Normalize to start-of-day for fair date-only comparison
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Helper: get the unlock date for the Nth lesson in weekly batch mode.
  // Each session (unlock event) corresponds to one occurrence of a selected weekday.
  // Sessions cycle through selected weekdays in order, week by week.
  // Lesson index 0 = startDate itself (always unlocked on day 0).
  // Lesson index 1 = first selected weekday >= startDate.
  // Lesson index N = Nth occurrence of any selected weekday from startDate.
  function getWeeklyBatchUnlockDate(
    startDate: Date,
    weekDays: string[],
    lessonIndex: number,
  ): Date {
    if (lessonIndex === 0) return new Date(startDate);
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const validDays = weekDays
      .map((d) => dayMap[d.toLowerCase()])
      .filter((d) => d !== undefined)
      .sort((a, b) => a - b);
    if (validDays.length === 0) return new Date(startDate);

    // Walk forward from startDate, counting occurrences of valid days
    // until we've found lessonIndex occurrences
    let count = 0;
    const date = new Date(startDate);
    // Move to next day first (lesson 0 is already at startDate)
    date.setDate(date.getDate() + 1);
    while (count < lessonIndex) {
      if (validDays.includes(date.getDay())) {
        count++;
        if (count === lessonIndex) break;
      }
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  // Build module-based unlock index: lessons in the same module share the same unlock day.
  // moduleId → moduleUnlockIndex mapping. Lessons without moduleId get their own index.
  const moduleUnlockIndexMap = new Map<string, number>();
  let currentModuleIndex = 0;
  for (let i = 0; i < sorted.length; i++) {
    const lesson = sorted[i];
    if (lesson.moduleId) {
      if (!moduleUnlockIndexMap.has(lesson.moduleId)) {
        moduleUnlockIndexMap.set(lesson.moduleId, currentModuleIndex);
        currentModuleIndex++;
      }
    } else {
      currentModuleIndex++;
    }
  }

  function getLessonUnlockIndex(lesson: any, lessonArrayIndex: number): number {
    if (lesson.moduleId && moduleUnlockIndexMap.has(lesson.moduleId)) {
      return moduleUnlockIndexMap.get(lesson.moduleId)!;
    }
    // No module — count distinct modules before this lesson + standalone lessons before it
    let idx = 0;
    const seenModules = new Set<string>();
    for (let j = 0; j < lessonArrayIndex; j++) {
      const prev = sorted[j];
      if (prev.moduleId) {
        if (!seenModules.has(prev.moduleId)) {
          seenModules.add(prev.moduleId);
          idx++;
        }
      } else {
        idx++;
      }
    }
    return idx;
  }

  // Helper to check if a test has been passed
  const isTestPassed = (gateTestId: string): boolean => {
    return attempts.some((a) => {
      if (a.testId !== gateTestId) return false;
      if (a.isPassed) return true;
      const total = a.totalPoints ?? 0;
      if (total > 0) {
        const pct = ((a.score ?? 0) / total) * 100;
        return pct >= (settings.minPassScore ?? 80);
      }
      return false;
    });
  };

  // Track cascading test gate block: if any previous lesson's test gate
  // hasn't been passed, ALL subsequent lessons remain locked
  let cascadeTestGateBlocked = false;

  for (let i = 0; i < sorted.length; i++) {
    const lesson = sorted[i];
    let locked = false;
    let unlockDate: string | undefined;
    let reason = "";

    const unlockIdx = getLessonUnlockIndex(lesson, i);

    // Schedule check: first module/lesson (index 0) is always unlocked by schedule
    if (
      settings.unlockType === "daily" &&
      settings.unlockStartDate &&
      unlockIdx > 0
    ) {
      const startD = new Date(settings.unlockStartDate);
      startD.setHours(0, 0, 0, 0);
      const targetDate = new Date(startD);
      targetDate.setDate(
        targetDate.getDate() + unlockIdx * (settings.unlockIntervalDays || 1),
      );
      unlockDate = targetDate.toISOString();
      if (now < targetDate) {
        locked = true;
        reason = "schedule";
      }
    } else if (
      settings.unlockType === "weekly" &&
      settings.unlockStartDate &&
      settings.unlockWeekDays?.length &&
      unlockIdx > 0
    ) {
      const startD = new Date(settings.unlockStartDate);
      startD.setHours(0, 0, 0, 0);
      const targetDate = getWeeklyBatchUnlockDate(
        startD,
        settings.unlockWeekDays as string[],
        unlockIdx,
      );
      unlockDate = targetDate.toISOString();
      if (now < targetDate) {
        locked = true;
        reason = "schedule";
      }
    }

    // Cascading test gate: if a previous lesson's test gate was not passed,
    // all subsequent lessons remain locked until that test is passed
    if (i > 0 && cascadeTestGateBlocked) {
      locked = true;
      reason = "test_gate";
    }

    // Test gate check (stacks with schedule)
    // Two modes:
    // 1. Course/group-level testGateEnabled: checks at module boundaries
    // 2. Per-lesson requiresTestPass: checks if previous lesson has mandatory test
    if (i > 0 && !cascadeTestGateBlocked) {
      const prevLesson = sorted[i - 1];

      // Per-lesson test gate: if previous lesson has requiresTestPass=true
      if ((prevLesson as any).requiresTestPass) {
        const gateTestId = testByLesson[prevLesson.id];
        if (gateTestId) {
          if (!isTestPassed(gateTestId)) {
            locked = true;
            reason = "test_gate";
            cascadeTestGateBlocked = true;
          }
        }
      }

      // Course/group-level test gate: checks at module boundaries
      if (!locked && settings.testGateEnabled) {
        const currentModuleId = lesson.moduleId;
        const sameModule =
          currentModuleId &&
          prevLesson.moduleId &&
          currentModuleId === prevLesson.moduleId;

        if (!sameModule) {
          let gateLesson = prevLesson;
          if (prevLesson.moduleId) {
            for (let k = i - 1; k >= 0; k--) {
              if (sorted[k].moduleId === prevLesson.moduleId) {
                const tid = testByLesson[sorted[k].id];
                if (tid) {
                  gateLesson = sorted[k];
                  break;
                }
              }
            }
          }
          const gateTestId = testByLesson[gateLesson.id];
          if (gateTestId) {
            if (!isTestPassed(gateTestId)) {
              locked = true;
              reason = "test_gate";
              cascadeTestGateBlocked = true;
            }
          }
        }
      }
    }

    // Check if current lesson has a test gate that could block subsequent lessons
    // Reset cascade if this lesson's test has been passed
    if ((lesson as any).requiresTestPass) {
      const currentTestId = testByLesson[lesson.id];
      if (currentTestId && !isTestPassed(currentTestId)) {
        cascadeTestGateBlocked = true;
      }
    }

    let scheduleReady = true;
    if (unlockDate && now < new Date(unlockDate)) {
      scheduleReady = false;
    }
    lockedLessons[lesson.id] = { locked, unlockDate, reason, scheduleReady };
  }

  return { settings, lockedLessons };
}
