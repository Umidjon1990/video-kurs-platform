import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "./db";
import { pendingExamReviews, gradeManualExam } from "./platform-exams";
export async function ensurePlatformReviews() {
  await pool.query(
    `ALTER TABLE essay_submissions ADD COLUMN IF NOT EXISTS manual_score integer;ALTER TABLE essay_submissions ADD COLUMN IF NOT EXISTS manual_feedback text;ALTER TABLE essay_submissions ADD COLUMN IF NOT EXISTS manual_checked_at timestamp;ALTER TABLE essay_submissions ADD COLUMN IF NOT EXISTS manual_checked_by text;CREATE TABLE IF NOT EXISTS platform_review_audit(id uuid PRIMARY KEY,actor_id text NOT NULL,kind text NOT NULL,submission_id varchar NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now())`,
  );
}
export async function pendingPlatformReviews() {
  const exam = (await pendingExamReviews()).map((v: any) => ({
    ...v,
    kind: "exam",
  }));
  const assignments = (
    await pool.query(
      "SELECT s.id,s.content,s.image_urls,s.audio_urls,s.file_urls,a.title,u.first_name,u.last_name FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN users u ON u.id=s.user_id WHERE s.grade IS NULL AND s.status='new_submitted' ORDER BY s.submitted_at LIMIT 100",
    )
  ).rows.map((r: any) => ({
    id: r.id,
    kind: "assignment",
    title: r.title,
    fullName: [r.first_name, r.last_name].filter(Boolean).join(" "),
    questions: [
      {
        id: "total",
        questionText: r.title,
        answer: r.content,
        points: 100,
        files: [
          ...(r.image_urls || []),
          ...(r.audio_urls || []),
          ...(r.file_urls || []),
        ],
      },
    ],
  }));
  const essays = (
    await pool.query(
      "SELECT s.id,s.essay_text,q.question_text,u.first_name,u.last_name FROM essay_submissions s JOIN lesson_essay_questions q ON q.id=s.essay_question_id JOIN users u ON u.id=s.student_id WHERE s.manual_score IS NULL AND s.overall_score IS NULL ORDER BY s.created_at LIMIT 100",
    )
  ).rows.map((r: any) => ({
    id: r.id,
    kind: "essay",
    title: "Insho",
    fullName: [r.first_name, r.last_name].filter(Boolean).join(" "),
    questions: [
      {
        id: "total",
        questionText: r.question_text,
        answer: r.essay_text,
        points: 100,
      },
    ],
  }));
  const rows = (
    await pool.query(
      "SELECT s.id,t.title,u.first_name,u.last_name FROM speaking_submissions s JOIN speaking_tests t ON t.id=s.speaking_test_id JOIN users u ON u.id=s.user_id WHERE s.status<>'completed' ORDER BY s.submitted_at LIMIT 100",
    )
  ).rows;
  const speaking = [];
  for (const r of rows) {
    const answers = (
      await pool.query(
        "SELECT a.id,a.audio_url,q.question_text,q.key_facts_plus,q.key_facts_minus FROM speaking_answers a JOIN speaking_questions q ON q.id=a.question_id WHERE a.submission_id=$1 ORDER BY q.question_number",
        [r.id],
      )
    ).rows;
    if (answers.length)
      speaking.push({
        id: r.id,
        kind: "speaking",
        title: r.title,
        fullName: [r.first_name, r.last_name].filter(Boolean).join(" "),
        questions: answers.map((a: any) => ({
          id: a.id,
          questionText: a.question_text,
          answer: "",
          audioUrl: a.audio_url,
          points: 100,
          criteriaPlus: a.key_facts_plus,
          criteriaMinus: a.key_facts_minus,
        })),
      });
  }
  return [...exam, ...assignments, ...essays, ...speaking];
}
export async function gradePlatformReview(id: string, input: unknown) {
  const v = z
    .object({
      kind: z.enum(["exam", "assignment", "essay", "speaking"]).default("exam"),
      scores: z.record(z.number().int().min(0)),
      feedback: z.string().trim().min(3).max(10000),
      actorId: z.string().min(1).max(100),
    })
    .strict()
    .parse(input);
  z.string().uuid().parse(id);
  if (v.kind === "exam")
    return gradeManualExam(id, {
      scores: v.scores,
      feedback: v.feedback,
      actorId: v.actorId,
    });
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    let score = 0,
      maxScore = 100;
    const table =
      v.kind === "assignment"
        ? "submissions"
        : v.kind === "essay"
          ? "essay_submissions"
          : "speaking_submissions";
    const row = (
      await c.query("SELECT * FROM " + table + " WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!row)
      throw Object.assign(new Error("Topshiriq topilmadi"), { status: 404 });
    const done =
      v.kind === "assignment"
        ? row.grade !== null
        : v.kind === "essay"
          ? row.manual_score !== null
          : row.status === "completed";
    if (done) {
      await c.query("COMMIT");
      return { success: true, alreadyGraded: true };
    }
    if (v.kind === "speaking") {
      const answers = (
        await c.query(
          "SELECT id FROM speaking_answers WHERE submission_id=$1",
          [id],
        )
      ).rows;
      if (!answers.length)
        throw Object.assign(new Error("Audio javoblar yo‘q"), { status: 409 });
      maxScore = answers.length * 100;
      for (const a of answers) {
        const value = v.scores[a.id];
        if (value === undefined || value > 100)
          throw Object.assign(
            new Error("Har bir audio javobni 0–100 baholang"),
            { status: 400 },
          );
        score += value;
        await c.query(
          "UPDATE speaking_answers SET score=$2,feedback=$3,evaluated_at=now() WHERE id=$1",
          [a.id, value, v.feedback],
        );
        await c.query(
          "INSERT INTO speaking_evaluations(answer_id,evaluation_type,score,feedback) VALUES($1,'manual',$2,$3)",
          [a.id, value, v.feedback],
        );
      }
      await c.query(
        "UPDATE speaking_submissions SET total_score=$2,max_score=$3,feedback=$4,status='completed',evaluated_at=now() WHERE id=$1",
        [id, score, maxScore, v.feedback],
      );
    } else {
      score = v.scores.total;
      if (score === undefined || score > 100)
        throw Object.assign(new Error("0–100 oralig‘ida baho kerak"), {
          status: 400,
        });
      if (v.kind === "assignment")
        await c.query(
          "UPDATE submissions SET grade=$2,feedback=$3,status='graded',graded_at=now() WHERE id=$1",
          [id, score, v.feedback],
        );
      else
        await c.query(
          "UPDATE essay_submissions SET manual_score=$2,manual_feedback=$3,manual_checked_at=now(),manual_checked_by=$4,updated_at=now() WHERE id=$1",
          [id, score, v.feedback, v.actorId],
        );
    }
    await c.query(
      "INSERT INTO platform_review_audit(id,actor_id,kind,submission_id,details) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        v.actorId,
        v.kind,
        id,
        JSON.stringify({
          scores: v.scores,
          feedback: v.feedback,
          score,
          maxScore,
        }),
      ],
    );
    await c.query("COMMIT");
    return { success: true, score, maxScore };
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
