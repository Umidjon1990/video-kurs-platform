import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";
import { storage } from "./storage";
export async function ensurePrivateFiles() {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS platform_private_files(id uuid PRIMARY KEY,owner_id varchar NOT NULL REFERENCES users(id),course_id varchar NOT NULL REFERENCES courses(id),original_name text NOT NULL,mime_type text NOT NULL,size_bytes integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now());ALTER TABLE submissions ADD COLUMN IF NOT EXISTS platform_request_key uuid;CREATE UNIQUE INDEX IF NOT EXISTS platform_assignment_request_idx ON submissions(user_id,platform_request_key) WHERE platform_request_key IS NOT NULL;ALTER TABLE speaking_submissions ADD COLUMN IF NOT EXISTS platform_request_key uuid;CREATE UNIQUE INDEX IF NOT EXISTS platform_speaking_request_idx ON speaking_submissions(user_id,platform_request_key) WHERE platform_request_key IS NOT NULL;",
  );
}
function directory() {
  const value = process.env.PRIVATE_UPLOAD_DIR;
  if (!value)
    throw Object.assign(new Error("Fayl xotirasi sozlanmagan"), {
      status: 503,
    });
  return path.resolve(value);
}
export async function savePrivateSubmission(
  file: Express.Multer.File,
  ownerId: string,
  courseId: string,
) {
  if (!file?.buffer?.length || file.buffer.length > 5 * 1024 * 1024)
    throw Object.assign(new Error("Fayl 1 bayt–5 MB bo‘lishi kerak"), {
      status: 400,
    });
  const id = randomUUID(),
    root = directory();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const location = path.join(root, id);
  await writeFile(location, file.buffer, { flag: "wx", mode: 0o600 });
  try {
    await pool.query(
      "INSERT INTO platform_private_files(id,owner_id,course_id,original_name,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        ownerId,
        courseId,
        path.basename(file.originalname).slice(0, 200),
        file.mimetype,
        file.buffer.length,
      ],
    );
  } catch (error) {
    await unlink(location).catch(() => {});
    throw error;
  }
  return "/api/private-files/" + id;
}
export async function servePrivateFile(
  req: Request,
  res: Response,
  userId: string,
  courseId?: string,
  adminOverride = false,
) {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return res.status(404).json({ message: "Fayl topilmadi" });
  const file = (
    await pool.query(
      "SELECT f.*,c.instructor_id FROM platform_private_files f JOIN courses c ON c.id=f.course_id WHERE f.id=$1",
      [id],
    )
  ).rows[0];
  if (!file) return res.status(404).json({ message: "Fayl topilmadi" });
  const user = await storage.getUser(userId);
  const allowed =
    adminOverride ||
    (user?.status === "active" &&
      (file.owner_id === userId ||
        user.role === "admin" ||
        (user.role === "instructor" && file.instructor_id === userId)));
  if (!allowed || (courseId && file.course_id !== courseId))
    return res.status(403).json({ message: "Faylga kirish ruxsati yo‘q" });
  const inline =
    /^(?:image\/(?:jpeg|png|webp)|audio\/(?:mpeg|mp3|ogg|webm|wav|mp4|x-m4a))$/.test(
      file.mime_type,
    );
  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": inline ? file.mime_type : "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
  });
  return res.sendFile(path.join(directory(), id));
}
export function registerPrivateFiles(app: Express, isAuthenticated: any) {
  app.get("/api/private-files/:id", isAuthenticated, (req: any, res, next) => {
    void servePrivateFile(
      req,
      res,
      req.user?.id || req.user?.claims?.sub,
    ).catch(next);
  });
}
export async function discardPrivateFiles(urls: string[], ownerId: string) {
  const ids = urls
    .filter((u) => /^\/api\/private-files\/[0-9a-f-]{36}$/.test(u))
    .map((u) => u.split("/").pop());
  if (!ids.length) return;
  const rows = (
    await pool.query(
      "DELETE FROM platform_private_files WHERE id=ANY($1::uuid[]) AND owner_id=$2 RETURNING id",
      [ids, ownerId],
    )
  ).rows;
  await Promise.all(
    rows.map((r: any) => unlink(path.join(directory(), r.id)).catch(() => {})),
  );
}
export async function existingWork(
  kind: "assignment" | "speaking",
  userId: string,
  key: string,
  targetId: string,
) {
  const table = kind === "assignment" ? "submissions" : "speaking_submissions";
  const column = kind === "assignment" ? "assignment_id" : "speaking_test_id";
  const row = (
    await pool.query(
      "SELECT * FROM " +
        table +
        " WHERE user_id=$1 AND platform_request_key=$2",
      [userId, key],
    )
  ).rows[0];
  if (row && row[column] !== targetId)
    throw Object.assign(new Error("Topshiriq kaliti mos emas"), {
      status: 409,
    });
  return row;
}
export async function persistAssignment(input: {
  userId: string;
  assignmentId: string;
  key: string;
  content: string;
  imageUrls: string[];
  audioUrls: string[];
  fileUrls: string[];
}) {
  const { userId, assignmentId, key, content, imageUrls, audioUrls, fileUrls } =
    input;
  const urls = [...imageUrls, ...audioUrls, ...fileUrls];
  try {
    const row = (
      await pool.query(
        "INSERT INTO submissions(assignment_id,user_id,content,image_urls,audio_urls,file_urls,status,platform_request_key) VALUES($1,$2,$3,$4,$5,$6,'new_submitted',$7) ON CONFLICT(user_id,platform_request_key) WHERE platform_request_key IS NOT NULL DO NOTHING RETURNING *",
        [assignmentId, userId, content, imageUrls, audioUrls, fileUrls, key],
      )
    ).rows[0];
    if (row) return { submission: row, duplicate: false };
    await discardPrivateFiles(urls, userId);
    return {
      submission: await existingWork("assignment", userId, key, assignmentId),
      duplicate: true,
    };
  } catch (error) {
    await discardPrivateFiles(urls, userId);
    throw error;
  }
}
export async function persistSpeaking(input: {
  userId: string;
  testId: string;
  key: string;
  answers: { questionId: string; audioUrl: string }[];
}) {
  const c = await pool.connect();
  let failure: unknown;
  try {
    await c.query("BEGIN");
    const { userId, testId, key, answers } = input;
    const row = (
      await c.query(
        "INSERT INTO speaking_submissions(speaking_test_id,user_id,status,platform_request_key) VALUES($1,$2,'pending',$3) ON CONFLICT(user_id,platform_request_key) WHERE platform_request_key IS NOT NULL DO NOTHING RETURNING *",
        [testId, userId, key],
      )
    ).rows[0];
    if (row) {
      for (const answer of answers)
        await c.query(
          "INSERT INTO speaking_answers(submission_id,question_id,audio_url) VALUES($1,$2,$3)",
          [row.id, answer.questionId, answer.audioUrl],
        );
      await c.query("COMMIT");
      return row;
    }
    await c.query("ROLLBACK");
  } catch (error) {
    await c.query("ROLLBACK");
    failure = error;
  } finally {
    c.release();
  }
  await discardPrivateFiles(
    input.answers.map((a) => a.audioUrl),
    input.userId,
  );
  if (failure) throw failure;
  return existingWork("speaking", input.userId, input.key, input.testId);
}
