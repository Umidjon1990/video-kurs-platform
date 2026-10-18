import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { installSchema } from "../tests/schema-fixture";
let pg: PGlite,
  socket: PGLiteSocketServer,
  pool: any,
  server: any,
  base: string,
  root: string;
const key = randomBytes(32).toString("hex"),
  externalUserId = randomUUID(),
  orderId = randomUUID(),
  teacherId = randomUUID(),
  courseId = randomUUID(),
  planId = randomUUID(),
  testId = randomUUID(),
  q1 = randomUUID(),
  q2 = randomUUID(),
  right = randomUUID(),
  wrong = randomUUID();
const headers = {
  "Content-Type": "application/json",
  "x-platform-key": key,
  "x-platform-user": externalUserId,
  "x-platform-order": orderId,
};
const native = (p: string) => base + "/api/platform/native/" + p;
const post = (p: string, value: any) =>
  fetch(native(p), { method: "POST", headers, body: JSON.stringify(value) });
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  socket = new PGLiteSocketServer({ db: pg, port: 0, maxConnections: 3 });
  await socket.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@" + socket.getServerConn() + "/postgres";
  process.env.PLATFORM_SERVICE_SECRET = key;
  process.env.DB_POOL_MAX = "1";
  root = await mkdtemp(path.join(tmpdir(), "zt-course-files-"));
  process.env.PRIVATE_UPLOAD_DIR = root;
  ({ pool } = await import("./db"));
  await installSchema(pool);
  await pool.query(
    "INSERT INTO users(id,first_name,role,status) VALUES($1,'Teacher','instructor','active')",
    [teacherId],
  );
  await pool.query(
    "INSERT INTO courses(id,title,price,instructor_id,status) VALUES($1,'Course fixture','100',$2,'published')",
    [courseId, teacherId],
  );
  await pool.query(
    'INSERT INTO subscription_plans(id,name,display_name,features,"order") VALUES($1,$2,$2,$3,1)',
    [
      planId,
      "fixture-plan",
      JSON.stringify({ hasTests: true, hasAssignments: true }),
    ],
  );
  await pool.query(
    "INSERT INTO course_plan_pricing(course_id,plan_id,price) VALUES($1,$2,'100')",
    [courseId, planId],
  );
  await pool.query(
    "INSERT INTO tests(id,course_id,title,instructor_id,is_draft,timer_mode,timer_value,passing_score) VALUES($1,$2,'Exam fixture',$3,false,'per_question',60,60)",
    [testId, courseId, teacherId],
  );
  for (const [id, order] of [
    [q1, 1],
    [q2, 2],
  ])
    await pool.query(
      "INSERT INTO questions(id,test_id,type,question_text,points,\"order\") VALUES($1,$2,'multiple_choice','Question fixture',2,$3)",
      [id, testId, order],
    );
  for (const [id, questionId, label, correct] of [
    [right, q1, "Right", true],
    [wrong, q1, "Wrong", false],
    [randomUUID(), q2, "Right", true],
  ])
    await pool.query(
      'INSERT INTO question_options(id,question_id,option_text,is_correct,"order") VALUES($1,$2,$3,$4,1)',
      [id, questionId, label, correct],
    );
  const { registerCoursePlatform, provisionCourse } = await import(
    "./platform"
  );
  const { registerNativePlatformExams } = await import("./platform-exams");
  const { createCourseContentGuard } = await import("./course-access");
  const { getCourseLocks } = await import("./course-locks");
  const { storage } = await import("./storage");
  const app = express();
  app.use(express.json());
  await registerCoursePlatform(app);
  app.use(createCourseContentGuard(storage, getCourseLocks));
  await registerNativePlatformExams(app);
  app.use((e: any, _req: any, res: any, _next: any) =>
    res.status(e.status || 500).json({ message: e.message }),
  );
  const c = (
    await pool.query("SELECT updated_at FROM courses WHERE id=$1", [courseId])
  ).rows[0];
  const sourceVersion = (await import("./platform")).courseSourceVersion(
    { id: courseId, ...c },
    planId,
    { hasTests: true, hasAssignments: true },
  );
  await provisionCourse({
    orderId,
    externalUserId,
    fullName: "Learner fixture",
    sourceId: courseId + ":" + planId,
    kind: "course",
    durationDays: 30,
    maxAttempts: null,
    sourceVersion,
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await pool?.end();
  await socket?.stop();
  await pg?.close();
  if (root) await rm(root, { recursive: true, force: true });
});
let attempt: any;
test("concurrent starts resume one timed attempt and never expose answer keys", async () => {
  const responses = await Promise.all([
    post("course-exams/" + testId + "/start", {}),
    post("course-exams/" + testId + "/start", {}),
  ]);
  for (const r of responses) assert.equal(r.status, 200);
  const values = await Promise.all(responses.map((r) => r.json()));
  assert.equal(values[0].id, values[1].id);
  attempt = values[0];
  assert.equal(attempt.questions.length, 1);
  assert.equal(attempt.questions[0].id, q1);
  assert.equal(JSON.stringify(attempt).includes("isCorrect"), false);
  assert.equal(JSON.stringify(attempt).includes("correctAnswer"), false);
  assert.ok(attempt.deadline);
});
test("editing a live question cannot change grading; replayed stage requests cannot skip a question", async () => {
  await pool.query("UPDATE question_options SET is_correct=false WHERE id=$1", [
    right,
  ]);
  const response = await post("course-exam-attempts/" + attempt.id, {
    stageIndex: 0,
    answers: { [q1]: [right] },
    action: "next",
  });
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.stageIndex, 1);
  const repeat = await post("course-exam-attempts/" + attempt.id, {
    stageIndex: 0,
    answers: { [q1]: [wrong] },
    action: "next",
  });
  assert.equal((await repeat.json()).stageIndex, 1);
  await pool.query(
    "UPDATE platform_course_attempts SET deadline=now()-interval '1 second' WHERE id=$1",
    [attempt.id],
  );
  const finished = await (
    await fetch(native("course-exam-attempts/" + attempt.id), { headers })
  ).json();
  assert.equal(finished.status, "submitted");
  assert.equal(finished.result.score, 2);
  assert.equal(finished.result.percentage, 50);
  const late = await post("course-exam-attempts/" + attempt.id, {
    stageIndex: 1,
    answers: { [q2]: ["forged"] },
    action: "finish",
  });
  assert.equal((await late.json()).result.score, 2);
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM test_attempts")).rows[0]
      .n,
    1,
  );
});
test("manual review records the native grade and repeated grading does not duplicate it", async () => {
  const essayTest = randomUUID(),
    essayId = randomUUID();
  await pool.query(
    "INSERT INTO tests(id,course_id,title,is_draft,passing_score) VALUES($1,$2,'Manual fixture',false,60)",
    [essayTest, courseId],
  );
  await pool.query(
    "INSERT INTO questions(id,test_id,type,question_text,points,\"order\") VALUES($1,$2,'essay','Write',10,1)",
    [essayId, essayTest],
  );
  const started = await (
    await post("course-exams/" + essayTest + "/start", {})
  ).json();
  const result = await (
    await post("course-exam-attempts/" + started.id, {
      stageIndex: 0,
      answers: { [essayId]: "Written response" },
      action: "finish",
    })
  ).json();
  assert.equal(result.result.requiresManualReview, true);
  const { pendingExamReviews, gradeManualExam } = await import(
    "./platform-exams"
  );
  assert.equal((await pendingExamReviews()).length, 1);
  const grade = {
    scores: { [essayId]: 8 },
    feedback: "Reviewed by teacher",
    actorId: teacherId,
  };
  const value = await gradeManualExam(started.id, grade);
  assert.equal(value.result.isPassed, true);
  assert.equal((await gradeManualExam(started.id, grade)).result.score, 8);
  assert.equal((await pendingExamReviews()).length, 0);
});
test("private uploads survive reads and reject a different student even with a valid course grant", async () => {
  const { savePrivateSubmission } = await import("./private-files");
  const owner = (
    await pool.query(
      "SELECT native_user_id FROM platform_identities WHERE external_user_id=$1",
      [externalUserId],
    )
  ).rows[0].native_user_id;
  const file = await savePrivateSubmission(
    {
      buffer: Buffer.from("private answer"),
      originalname: "answer.txt",
      mimetype: "text/plain",
    } as any,
    owner,
    courseId,
  );
  const id = file.split("/").pop();
  const r = await fetch(base + "/api/platform/files/" + id, { headers });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "private answer");
  assert.match(r.headers.get("content-disposition") || "", /^attachment/);
  const another = randomUUID();
  await pool.query(
    "INSERT INTO users(id,role,status) VALUES($1,'student','active')",
    [another],
  );
  await pool.query(
    "UPDATE platform_private_files SET owner_id=$1 WHERE id=$2",
    [another, id],
  );
  assert.equal(
    (await fetch(base + "/api/platform/files/" + id, { headers })).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/platform/files/" + id, {
        headers: { ...headers, "x-platform-key": "forged" },
      })
    ).status,
    403,
  );
});
test("assignment retry preserves one submission and removes newly duplicated private files", async () => {
  const { savePrivateSubmission, persistAssignment } = await import(
    "./private-files"
  );
  const userId = (
    await pool.query(
      "SELECT native_user_id FROM platform_identities WHERE external_user_id=$1",
      [externalUserId],
    )
  ).rows[0].native_user_id;
  const assignmentId = randomUUID(),
    key = randomUUID();
  await pool.query(
    "INSERT INTO assignments(id,course_id,title) VALUES($1,$2,'Work fixture')",
    [assignmentId, courseId],
  );
  const file = () =>
    savePrivateSubmission(
      {
        buffer: Buffer.from("answer"),
        originalname: "answer.txt",
        mimetype: "text/plain",
      } as any,
      userId,
      courseId,
    );
  const firstFile = await file();
  const first = await persistAssignment({
    userId,
    assignmentId,
    key,
    content: "Written work",
    imageUrls: [],
    audioUrls: [],
    fileUrls: [firstFile],
  });
  const extra = await file();
  const repeat = await persistAssignment({
    userId,
    assignmentId,
    key,
    content: "Written work",
    imageUrls: [],
    audioUrls: [],
    fileUrls: [extra],
  });
  assert.equal(repeat.submission.id, first.submission.id);
  assert.equal(repeat.duplicate, true);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM submissions WHERE platform_request_key=$1",
        [key],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM platform_private_files WHERE id=$1",
        [extra.split("/").pop()],
      )
    ).rows[0].n,
    0,
  );
});
test("speaking uploads commit together, retry once, and clean up after an interrupted database write", async () => {
  const { savePrivateSubmission, persistSpeaking } = await import(
    "./private-files"
  );
  const userId = (
    await pool.query(
      "SELECT native_user_id FROM platform_identities WHERE external_user_id=$1",
      [externalUserId],
    )
  ).rows[0].native_user_id;
  const speakingId = randomUUID(),
    sectionId = randomUUID(),
    questionId = randomUUID(),
    key = randomUUID();
  await pool.query(
    "INSERT INTO speaking_tests(id,course_id,instructor_id,title) VALUES($1,$2,$3,'Speaking fixture')",
    [speakingId, courseId, teacherId],
  );
  await pool.query(
    "INSERT INTO speaking_test_sections(id,speaking_test_id,section_number,title) VALUES($1,$2,1,'Section')",
    [sectionId, speakingId],
  );
  await pool.query(
    "INSERT INTO speaking_questions(id,section_id,question_number,question_text) VALUES($1,$2,1,'Speak')",
    [questionId, sectionId],
  );
  const file = () =>
    savePrivateSubmission(
      {
        buffer: Buffer.from("audio fixture"),
        originalname: "answer.webm",
        mimetype: "audio/webm",
      } as any,
      userId,
      courseId,
    );
  const first = await persistSpeaking({
    userId,
    testId: speakingId,
    key,
    answers: [{ questionId, audioUrl: await file() }],
  });
  const repeat = await persistSpeaking({
    userId,
    testId: speakingId,
    key,
    answers: [{ questionId, audioUrl: await file() }],
  });
  assert.equal(repeat.id, first.id);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM speaking_answers WHERE submission_id=$1",
        [first.id],
      )
    ).rows[0].n,
    1,
  );
  const brokenKey = randomUUID(),
    brokenFile = await file();
  await assert.rejects(
    persistSpeaking({
      userId,
      testId: speakingId,
      key: brokenKey,
      answers: [{ questionId: null as any, audioUrl: brokenFile }],
    }),
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM speaking_submissions WHERE platform_request_key=$1",
        [brokenKey],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM platform_private_files WHERE id=$1",
        [brokenFile.split("/").pop()],
      )
    ).rows[0].n,
    0,
  );
});
test("central admin can grade assignments, essays and speaking work with an audit and no duplicate grading", async () => {
  const { ensurePlatformReviews, pendingPlatformReviews, gradePlatformReview } =
    await import("./platform-reviews");
  await ensurePlatformReviews();
  const pending = await pendingPlatformReviews();
  const assignment = pending.find((r: any) => r.kind === "assignment");
  const speaking = pending.find((r: any) => r.kind === "speaking");
  assert.ok(assignment);
  assert.ok(speaking);
  const actorId = "verified-central-admin";
  await gradePlatformReview(assignment.id, {
    kind: "assignment",
    scores: { total: 80 },
    feedback: "Written work reviewed",
    actorId,
  });
  assert.equal(
    (
      await pool.query("SELECT grade FROM submissions WHERE id=$1", [
        assignment.id,
      ])
    ).rows[0].grade,
    80,
  );
  const scores = Object.fromEntries(
    speaking.questions.map((q: any) => [q.id, 90]),
  );
  await gradePlatformReview(speaking.id, {
    kind: "speaking",
    scores,
    feedback: "Audio work reviewed",
    actorId,
  });
  await gradePlatformReview(speaking.id, {
    kind: "speaking",
    scores,
    feedback: "Audio work reviewed",
    actorId,
  });
  assert.equal(
    (
      await pool.query("SELECT status FROM speaking_submissions WHERE id=$1", [
        speaking.id,
      ])
    ).rows[0].status,
    "completed",
  );
  const lesson = randomUUID(),
    question = randomUUID(),
    essay = randomUUID();
  const userId = (
    await pool.query(
      "SELECT native_user_id FROM platform_identities WHERE external_user_id=$1",
      [externalUserId],
    )
  ).rows[0].native_user_id;
  await pool.query(
    "INSERT INTO lessons(id,course_id,title,\"order\") VALUES($1,$2,'Essay lesson',1)",
    [lesson, courseId],
  );
  await pool.query(
    "INSERT INTO lesson_essay_questions(id,lesson_id,question_text) VALUES($1,$2,'Write')",
    [question, lesson],
  );
  await pool.query(
    "INSERT INTO essay_submissions(id,essay_question_id,student_id,essay_text) VALUES($1,$2,$3,'Written essay')",
    [essay, question, userId],
  );
  await gradePlatformReview(essay, {
    kind: "essay",
    scores: { total: 75 },
    feedback: "Essay reviewed",
    actorId,
  });
  const row = (
    await pool.query(
      "SELECT manual_score,ai_checked FROM essay_submissions WHERE id=$1",
      [essay],
    )
  ).rows[0];
  assert.equal(row.manual_score, 75);
  assert.equal(row.ai_checked, false);
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM platform_review_audit"))
      .rows[0].n,
    3,
  );
});
