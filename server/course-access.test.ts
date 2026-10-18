import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
  coursePermission,
  createCourseContentGuard,
  learnerConfig,
} from "./course-access";
function fixture() {
  let end = new Date(Date.now() + 86400000);
  const storage: any = {
    getCourse: async (id: string) => ({
      id,
      status: "published",
      isFree: false,
      instructorId: "teacher",
      subscriptionDays: 30,
    }),
    getUser: async (id: string) => ({
      id,
      status: "active",
      role:
        id === "admin" ? "admin" : id === "teacher" ? "instructor" : "student",
    }),
    getEnrollmentByCourseAndUser: async () => ({
      paymentStatus: "approved",
      planId: "plan",
    }),
    getUserSubscriptions: async () => [
      {
        subscription: {
          courseId: "course",
          status: "active",
          startDate: new Date(Date.now() - 86400000),
          endDate: end,
        },
      },
    ],
    getLesson: async (id: string) => ({
      id,
      courseId: "course",
      isDemo: id === "demo",
    }),
    getTest: async (id: string) => ({
      id,
      courseId: "course",
      lessonId: "locked",
      isDraft: false,
    }),
  };
  return { storage, expire: () => (end = new Date(Date.now() - 1)) };
}
test("paid enrollment is insufficient after subscription expiry; only course owner/admin bypasses", async () => {
  const f = fixture();
  assert.equal(
    (await coursePermission(f.storage, "student", "course")).allowed,
    true,
  );
  f.expire();
  assert.equal(
    (await coursePermission(f.storage, "student", "course")).allowed,
    false,
  );
  assert.equal(
    (await coursePermission(f.storage, "teacher", "course")).allowed,
    true,
  );
  assert.equal(
    (await coursePermission(f.storage, "admin", "course")).allowed,
    true,
  );
  assert.equal(
    (await coursePermission(f.storage, "other-teacher", "course")).allowed,
    false,
  );
});
test("original lesson/test routes enforce expiry and scheduled locks before returning content", async () => {
  const f = fixture(),
    app = express();
  app.use((req: any, res, next) => {
    if (req.get("x-test-user")) req.user = { id: req.get("x-test-user") };
    next();
  });
  app.use(
    createCourseContentGuard(f.storage, async () => ({
      lockedLessons: { locked: { locked: true } },
    })),
  );
  app.get("/api/courses/:id/lessons", (_req, res) =>
    res.json([
      {
        id: "locked",
        title: "Hidden",
        videoUrl: "private-video",
        pdfUrl: "private-pdf",
      },
      { id: "open", title: "Open", videoUrl: "allowed" },
    ]),
  );
  app.get("/api/lessons/:id/sections", (_req, res) =>
    res.json([{ videoUrl: "private-video" }]),
  );
  app.get("/api/tests/:id/questions", (_req, res) =>
    res.json([{ question: "private question" }]),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  try {
    const h = { "x-test-user": "student" };
    const list = await (
      await fetch(base + "/api/courses/course/lessons", { headers: h })
    ).json();
    assert.equal(list[0].videoUrl, undefined);
    assert.equal(list[1].videoUrl, "allowed");
    assert.equal(
      (await fetch(base + "/api/lessons/locked/sections", { headers: h }))
        .status,
      403,
    );
    assert.equal(
      (await fetch(base + "/api/tests/test/questions", { headers: h })).status,
      403,
    );
    assert.equal(
      (await fetch(base + "/api/lessons/demo/sections")).status,
      200,
    );
    f.expire();
    assert.equal(
      (await fetch(base + "/api/courses/course/lessons", { headers: h }))
        .status,
      403,
    );
    assert.equal(
      (await fetch(base + "/api/lessons/open/sections", { headers: h })).status,
      403,
    );
    assert.equal(
      (await fetch(base + "/api/lessons/open/sections")).status,
      401,
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});
test("learner config never contains nested answer keys or instructor rubrics", () => {
  assert.deepEqual(
    learnerConfig({
      readingPassage: "Read",
      correctAnswer: "key",
      nested: { acceptableAnswers: ["key"], imageUrl: "image" },
      options: [{ text: "A", isCorrect: true }],
    }),
    {
      readingPassage: "Read",
      nested: { imageUrl: "image" },
      options: [{ text: "A" }],
    },
  );
});
