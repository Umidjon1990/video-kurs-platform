import type { Express, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "./db";
import { storage } from "./storage";
import { getCourseLocks } from "./course-locks";
import {
  makeExamSnapshot,
  publicExamQuestion,
  gradeExam,
} from "./platform-exam-policy";
const handle =
  (fn: (req: any, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch((e) => {
      if (e instanceof z.ZodError)
        res.status(400).json({ message: "So‘rov noto‘g‘ri" });
      else next(e);
    });
  };
export async function ensurePlatformExams() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS platform_course_attempts(id uuid PRIMARY KEY,user_id varchar NOT NULL REFERENCES users(id),course_id varchar NOT NULL REFERENCES courses(id),test_id varchar NOT NULL REFERENCES tests(id),grant_order_id uuid NOT NULL REFERENCES platform_grants(order_id),snapshot jsonb NOT NULL,answers jsonb NOT NULL DEFAULT '{}',stage_index integer NOT NULL DEFAULT 0,deadline timestamptz,status text NOT NULL DEFAULT 'started' CHECK(status IN('started','submitted')),result jsonb,native_attempt_id varchar REFERENCES test_attempts(id),feedback text,graded_by text,created_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,graded_at timestamptz);CREATE UNIQUE INDEX IF NOT EXISTS platform_course_active_attempt_idx ON platform_course_attempts(user_id,test_id) WHERE status='started'`,
  );
}
async function finish(client: any, row: any) {
  if (row.status !== "started") return;
  const result = gradeExam(row.snapshot, row.answers);
  const nativeId = randomUUID();
  await client.query(
    "INSERT INTO test_attempts(id,test_id,user_id,answers,score,total_points,is_passed,completed_at,graded_at) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8)",
    [
      nativeId,
      row.test_id,
      row.user_id,
      JSON.stringify(row.answers),
      result.score,
      result.totalPoints,
      result.isPassed,
      result.requiresManualReview ? null : new Date(),
    ],
  );
  row.status = "submitted";
  row.result = result;
  row.native_attempt_id = nativeId;
  await client.query(
    "UPDATE platform_course_attempts SET status='submitted',result=$2,native_attempt_id=$3,finished_at=now() WHERE id=$1",
    [row.id, JSON.stringify(result), nativeId],
  );
}
async function advance(
  client: any,
  row: any,
  now = Date.now(),
  automatic = false,
) {
  const next = row.stage_index + 1;
  if (next >= row.snapshot.stages.length) return finish(client, row);
  const seconds = row.snapshot.stages[next].seconds;
  const start =
    automatic && row.deadline ? new Date(row.deadline).getTime() : now;
  row.stage_index = next;
  row.deadline = seconds ? new Date(start + seconds * 1000) : null;
  await client.query(
    "UPDATE platform_course_attempts SET stage_index=$2,deadline=$3 WHERE id=$1",
    [row.id, next, row.deadline],
  );
}
async function expire(client: any, row: any) {
  while (
    row.status === "started" &&
    row.deadline &&
    new Date(row.deadline).getTime() <= Date.now()
  )
    await advance(client, row, Date.now(), true);
}
function view(row: any) {
  const stage = row.snapshot.stages[row.stage_index];
  return {
    id: row.id,
    test: row.snapshot.test,
    status: row.status,
    stageIndex: row.stage_index,
    stageCount: row.snapshot.stages.length,
    deadline: row.deadline,
    serverNow: new Date().toISOString(),
    stageLabel: stage?.label,
    questions:
      row.status === "started"
        ? stage.ids.map((id: string) =>
            publicExamQuestion(
              row.snapshot.questions.find((q: any) => q.id === id),
            ),
          )
        : [],
    answers: row.answers,
    sections: row.snapshot.sections
      .filter((s: any) =>
        stage?.ids.some(
          (id: string) =>
            row.snapshot.questions.find((q: any) => q.id === id)?.sectionId ===
            s.id,
        ),
      )
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        readingPassage: s.readingPassage,
      })),
    result: row.result
      ? {
          score: row.result.score,
          totalPoints: row.result.totalPoints,
          percentage: row.result.percentage,
          isPassed: row.result.isPassed,
          requiresManualReview: row.result.requiresManualReview,
        }
      : null,
    feedback: row.feedback,
  };
}
async function attemptFor(client: any, req: any, id: string) {
  if (!req.platformGrant || !req.user?.id)
    throw Object.assign(new Error("Platforma ruxsati kerak"), { status: 403 });
  const row = (
    await client.query(
      "SELECT * FROM platform_course_attempts WHERE id=$1 AND user_id=$2 AND course_id=$3 FOR UPDATE",
      [z.string().uuid().parse(id), req.user.id, req.platformGrant.courseId],
    )
  ).rows[0];
  if (!row)
    throw Object.assign(new Error("Urinish topilmadi"), { status: 404 });
  await expire(client, row);
  return row;
}
export async function registerNativePlatformExams(app: Express) {
  await ensurePlatformExams();
  app.post(
    "/api/course-exams/:testId/start",
    handle(async (req: any, res) => {
      if (!req.platformGrant || req.platformGrant.features.hasTests !== true)
        return res.status(403).json({ message: "Tarifda testlar yo‘q" });
      const test = await storage.getTest(String(req.params.testId));
      if (!test || test.isDraft || test.courseId !== req.platformGrant.courseId)
        return res.status(404).json({ message: "Test nashrda mavjud emas" });
      const locks = await getCourseLocks(test.courseId, req.user.id);
      if (test.lessonId && locks.lockedLessons?.[test.lessonId]?.locked)
        return res.status(403).json({ message: "Dars hali ochilmagan" });
      const questions = await storage.getQuestionsByTest(test.id),
        sections = await storage.getTestSectionsByTest(test.id);
      const options = Object.fromEntries(
        await Promise.all(
          questions.map(async (q) => [
            q.id,
            await storage.getQuestionOptionsByQuestion(q.id),
          ]),
        ),
      );
      const snapshot = makeExamSnapshot(test, questions, sections, options);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "course-exam:" + req.user.id + ":" + test.id,
        ]);
        let row = (
          await client.query(
            "SELECT * FROM platform_course_attempts WHERE user_id=$1 AND test_id=$2 AND status='started' FOR UPDATE",
            [req.user.id, test.id],
          )
        ).rows[0];
        if (row) {
          await expire(client, row);
          await client.query("COMMIT");
          return res.json(view(row));
        }
        const deadline = snapshot.stages[0].seconds
          ? new Date(Date.now() + snapshot.stages[0].seconds * 1000)
          : null;
        row = (
          await client.query(
            "INSERT INTO platform_course_attempts(id,user_id,course_id,test_id,grant_order_id,snapshot,deadline) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
            [
              randomUUID(),
              req.user.id,
              test.courseId,
              test.id,
              req.platformGrant.orderId,
              JSON.stringify(snapshot),
              deadline,
            ],
          )
        ).rows[0];
        await client.query("COMMIT");
        res.json(view(row));
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );
  app.get(
    "/api/course-exam-attempts/:id",
    handle(async (req: any, res) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const row = await attemptFor(c, req, String(req.params.id));
        await c.query("COMMIT");
        res.json(view(row));
      } catch (error) {
        await c.query("ROLLBACK");
        throw error;
      } finally {
        c.release();
      }
    }),
  );
  app.post(
    "/api/course-exam-attempts/:id",
    handle(async (req: any, res) => {
      const input = z
        .object({
          stageIndex: z.number().int().min(0),
          answers: z.record(z.unknown()),
          action: z.enum(["save", "next", "finish"]),
        })
        .strict()
        .parse(req.body);
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const row = await attemptFor(c, req, String(req.params.id));
        if (row.status === "started" && row.stage_index === input.stageIndex) {
          const allowed = new Set(row.snapshot.stages[row.stage_index].ids);
          for (const [id, answer] of Object.entries(input.answers)) {
            if (!allowed.has(id))
              throw Object.assign(
                new Error("Javob bu bo‘limga tegishli emas"),
                { status: 400 },
              );
            const question = row.snapshot.questions.find(
              (q: any) => q.id === id,
            );
            if (
              ["essay", "short_answer", "fill_blanks", "true_false"].includes(
                question.type,
              )
            )
              z.string().max(100000).parse(answer);
            else if (question.type === "multiple_choice")
              z.union([z.string(), z.array(z.string()).max(100)]).parse(answer);
            else if (question.type === "matching")
              z.array(z.tuple([z.number().int().min(0), z.string().max(100)]))
                .max(100)
                .parse(answer);
            if (JSON.stringify(answer).length > 100000)
              throw Object.assign(new Error("Javob juda katta"), {
                status: 413,
              });
            row.answers[id] = answer;
          }
          await c.query(
            "UPDATE platform_course_attempts SET answers=$2 WHERE id=$1",
            [row.id, JSON.stringify(row.answers)],
          );
          if (input.action === "finish") await finish(c, row);
          else if (input.action === "next") await advance(c, row);
        }
        await c.query("COMMIT");
        res.json(view(row));
      } catch (error) {
        await c.query("ROLLBACK");
        throw error;
      } finally {
        c.release();
      }
    }),
  );
}
export async function pendingExamReviews() {
  return (
    await pool.query(
      "SELECT a.id,a.course_id,a.test_id,a.snapshot,a.answers,a.result,a.created_at,u.first_name,u.last_name FROM platform_course_attempts a JOIN users u ON u.id=a.user_id WHERE a.status='submitted' AND (a.result->>'requiresManualReview')='true' ORDER BY a.finished_at LIMIT 200",
    )
  ).rows.map((a: any) => ({
    id: a.id,
    title: a.snapshot.test.title,
    fullName: [a.first_name, a.last_name].filter(Boolean).join(" "),
    questions: a.result.manual,
    createdAt: a.created_at,
  }));
}
export async function gradeManualExam(id: string, input: unknown) {
  const v = z
    .object({
      scores: z.record(z.number().int().min(0)),
      feedback: z.string().trim().min(3).max(10000),
      actorId: z.string().min(1).max(100),
    })
    .strict()
    .parse(input);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const row = (
      await c.query(
        "SELECT * FROM platform_course_attempts WHERE id=$1 AND status='submitted' FOR UPDATE",
        [z.string().uuid().parse(id)],
      )
    ).rows[0];
    if (!row)
      throw Object.assign(new Error("Urinish topilmadi"), { status: 404 });
    if (!row.result.requiresManualReview) {
      await c.query("COMMIT");
      return view(row);
    }
    const result = gradeExam(row.snapshot, row.answers, v.scores);
    if (result.requiresManualReview)
      throw Object.assign(new Error("Har bir yozma savol baholanishi kerak"), {
        status: 400,
      });
    await c.query(
      "UPDATE test_attempts SET score=$2,is_passed=$3,graded_at=now() WHERE id=$1",
      [row.native_attempt_id, result.score, result.isPassed],
    );
    await c.query(
      "UPDATE platform_course_attempts SET result=$2,feedback=$3,graded_by=$4,graded_at=now() WHERE id=$1",
      [id, JSON.stringify(result), v.feedback, v.actorId],
    );
    row.result = result;
    row.feedback = v.feedback;
    await c.query("COMMIT");
    return view(row);
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
