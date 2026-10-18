import {
  pendingPlatformReviews,
  gradePlatformReview,
  ensurePlatformReviews,
} from "./platform-reviews";
import { ensurePrivateFiles, servePrivateFile } from "./private-files";
import type { Express, Request, Response, NextFunction } from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { pool } from "./db";
import { storage } from "./storage";
declare global {
  namespace Express {
    interface Request {
      platformGrant?: {
        courseId: string;
        features: Record<string, any>;
        orderId: string;
      };
    }
  }
}
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export function providerAuthenticated(value: string | undefined) {
  const secret = process.env.PLATFORM_SERVICE_SECRET;
  return (
    !!secret &&
    secret.length >= 32 &&
    !!value &&
    value.length <= 256 &&
    timingSafeEqual(Buffer.from(digest(value)), Buffer.from(digest(secret)))
  );
}
const handle =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch((error) => {
      if (error instanceof z.ZodError)
        res.status(400).json({ message: "So‘rov ma’lumotlari noto‘g‘ri" });
      else next(error);
    });
  };
const grantSchema = z
  .object({
    orderId: z.string().uuid(),
    externalUserId: z.string().min(1).max(100),
    fullName: z.string().min(1).max(200),
    sourceId: z.string().min(3).max(200),
    kind: z.literal("course"),
    durationDays: z.number().int().min(1).max(3650),
    maxAttempts: z.null(),
    sourceVersion: z.string().min(1).max(100),
  })
  .strict();
function courseImage(value: unknown) {
  if (typeof value !== "string" || value.length > 4096) return null;
  try {
    const url = new URL(value, "https://zamonaviy-videokurs.up.railway.app");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
const splitSource = (value: string) => {
  const parts = value.split(":");
  if (
    parts.length !== 2 ||
    !parts.every((p) => /^[a-zA-Z0-9_-]{1,100}$/.test(p))
  )
    throw Object.assign(new Error("Kurs tarifi noto‘g‘ri"), { status: 400 });
  return { courseId: parts[0], planId: parts[1] };
};
export function courseFeatures(features: any) {
  return {
    ...features,
    hasTests: features?.hasTests ?? features?.access === "full",
    hasAssignments: features?.hasAssignments ?? features?.access === "full",
  };
}
export const courseSourceVersion = (
  course: any,
  planId: string,
  features: any,
) =>
  digest(
    [
      course.id,
      course.updatedAt?.toISOString?.() || course.updated_at || "",
      planId,
      JSON.stringify(courseFeatures(features)),
    ].join(":"),
  ).slice(0, 32);
export async function ensurePlatformTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS platform_identities(external_user_id varchar PRIMARY KEY,native_user_id varchar NOT NULL UNIQUE REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS platform_grants(order_id uuid PRIMARY KEY,external_user_id varchar NOT NULL REFERENCES platform_identities(external_user_id),source_id text NOT NULL,course_id varchar NOT NULL REFERENCES courses(id),plan_id varchar NOT NULL REFERENCES subscription_plans(id),enrollment_id varchar REFERENCES enrollments(id),subscription_id varchar REFERENCES user_subscriptions(id),expires_at timestamptz NOT NULL,revoked_at timestamptz,features jsonb NOT NULL,source_version text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS platform_grants_owner_idx ON platform_grants(external_user_id,course_id);
CREATE TABLE IF NOT EXISTS platform_revocations(order_id uuid PRIMARY KEY,external_user_id varchar NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS platform_operations(operation_id uuid PRIMARY KEY,order_id uuid NOT NULL,kind text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());`);
}
export async function provisionCourse(input: unknown) {
  const v = grantSchema.parse(input);
  const { courseId, planId } = splitSource(v.sourceId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "zt-course:" + v.externalUserId,
    ]);
    const revoked = (
      await client.query(
        "SELECT 1 FROM platform_revocations WHERE order_id=$1",
        [v.orderId],
      )
    ).rowCount;
    if (revoked)
      throw Object.assign(new Error("Buyurtma bekor qilingan"), {
        status: 409,
      });
    const existing = (
      await client.query(
        "SELECT * FROM platform_grants WHERE order_id=$1 FOR UPDATE",
        [v.orderId],
      )
    ).rows[0];
    if (existing) {
      if (
        existing.external_user_id !== v.externalUserId ||
        existing.source_id !== v.sourceId
      )
        throw Object.assign(new Error("Buyurtma mazmuni mos emas"), {
          status: 409,
        });
      await client.query("COMMIT");
      return {
        orderId: v.orderId,
        active: !existing.revoked_at,
        expiresAt: existing.expires_at,
      };
    }
    const course = (
      await client.query(
        "SELECT * FROM courses WHERE id=$1 AND status='published' FOR SHARE",
        [courseId],
      )
    ).rows[0];
    const plan = (
      await client.query(
        'SELECT p.* FROM subscription_plans p WHERE p.id=$2 AND (EXISTS(SELECT 1 FROM course_plan_pricing cp WHERE cp.course_id=$1 AND cp.plan_id=p.id) OR (NOT EXISTS(SELECT 1 FROM course_plan_pricing cp WHERE cp.course_id=$1) AND p.id=(SELECT id FROM subscription_plans ORDER BY "order",id LIMIT 1)))',
        [courseId, planId],
      )
    ).rows[0];
    if (!course || !plan)
      throw Object.assign(new Error("Kurs yoki tarif sotuvda mavjud emas"), {
        status: 404,
      });
    if (courseSourceVersion(course, planId, plan.features) !== v.sourceVersion)
      throw Object.assign(
        new Error("Manba yangilangan. Katalog qayta tasdiqlanishi kerak"),
        { status: 409 },
      );
    let identity = (
      await client.query(
        "SELECT * FROM platform_identities WHERE external_user_id=$1",
        [v.externalUserId],
      )
    ).rows[0];
    if (!identity) {
      const nativeId = randomUUID();
      const names = v.fullName.trim().split(/\s+/);
      await client.query(
        "INSERT INTO users(id,first_name,last_name,role,status) VALUES($1,$2,$3,'student','active')",
        [nativeId, names.shift() || "O‘quvchi", names.join(" ")],
      );
      identity = (
        await client.query(
          "INSERT INTO platform_identities(external_user_id,native_user_id) VALUES($1,$2) RETURNING *",
          [v.externalUserId, nativeId],
        )
      ).rows[0];
    }
    const nativeUser = (
      await client.query("SELECT status FROM users WHERE id=$1 FOR SHARE", [
        identity.native_user_id,
      ])
    ).rows[0];
    if (nativeUser?.status !== "active")
      throw Object.assign(new Error("Manba hisobi faol emas"), { status: 403 });
    const enrollmentId = randomUUID(),
      subscriptionId = randomUUID(),
      expires = new Date(Date.now() + v.durationDays * 86400000),
      now = new Date();
    await client.query(
      "INSERT INTO enrollments(id,user_id,course_id,plan_id,payment_method,payment_status) VALUES($1,$2,$3,$4,'platform_coin','approved')",
      [enrollmentId, identity.native_user_id, courseId, planId],
    );
    await client.query(
      "INSERT INTO user_subscriptions(id,user_id,course_id,plan_id,enrollment_id,start_date,end_date,status) VALUES($1,$2,$3,$4,$5,$6,$7,'active')",
      [
        subscriptionId,
        identity.native_user_id,
        courseId,
        planId,
        enrollmentId,
        now,
        expires,
      ],
    );
    await client.query(
      "INSERT INTO platform_grants(order_id,external_user_id,source_id,course_id,plan_id,enrollment_id,subscription_id,expires_at,features,source_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        v.orderId,
        v.externalUserId,
        v.sourceId,
        courseId,
        planId,
        enrollmentId,
        subscriptionId,
        expires,
        JSON.stringify(courseFeatures(plan.features)),
        v.sourceVersion,
      ],
    );
    await client.query("COMMIT");
    return {
      orderId: v.orderId,
      active: true,
      expiresAt: expires.toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function ownedGrant(req: Request) {
  const user = z.string().min(1).max(100).parse(req.get("x-platform-user"));
  const order = z.string().uuid().parse(req.get("x-platform-order"));
  const row = (
    await pool.query(
      "SELECT g.*,i.native_user_id FROM platform_grants g JOIN platform_identities i ON i.external_user_id=g.external_user_id JOIN users u ON u.id=i.native_user_id WHERE g.order_id=$1 AND g.external_user_id=$2 AND g.revoked_at IS NULL AND g.expires_at>now() AND u.status='active'",
      [order, user],
    )
  ).rows[0];
  if (!row)
    throw Object.assign(new Error("Kursga faol kirish huquqi kerak"), {
      status: 403,
    });
  return row;
}
export async function manageCourseGrant(orderId: string, input: unknown) {
  const v = z
    .object({
      externalUserId: z.string().min(1).max(100),
      operationId: z.string().uuid(),
      action: z.enum(["extend", "revoke"]),
      days: z.number().int().min(1).max(3650).optional(),
    })
    .strict()
    .parse(input);
  z.string().uuid().parse(orderId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "zt-course:" + v.externalUserId,
    ]);
    const prior = (
      await client.query(
        "SELECT * FROM platform_operations WHERE operation_id=$1",
        [v.operationId],
      )
    ).rows[0];
    if (prior) {
      if (prior.order_id !== orderId || prior.kind !== v.action)
        throw Object.assign(new Error("Amal kaliti mos emas"), { status: 409 });
      await client.query("COMMIT");
      return prior.result;
    }
    const row = (
      await client.query(
        "SELECT * FROM platform_grants WHERE order_id=$1 FOR UPDATE",
        [orderId],
      )
    ).rows[0];
    if (row && row.external_user_id !== v.externalUserId)
      throw Object.assign(new Error("Xarid egasi mos emas"), { status: 403 });
    let expires = row?.expires_at || null;
    if (v.action === "revoke") {
      await client.query(
        "INSERT INTO platform_revocations(order_id,external_user_id) VALUES($1,$2) ON CONFLICT(order_id) DO NOTHING",
        [orderId, v.externalUserId],
      );
      if (row) {
        await client.query(
          "UPDATE platform_grants SET revoked_at=now() WHERE order_id=$1",
          [orderId],
        );
        await client.query(
          "UPDATE user_subscriptions SET status='cancelled',updated_at=now() WHERE id=$1",
          [row.subscription_id],
        );
        await client.query(
          "UPDATE enrollments SET payment_status='cancelled' WHERE id=$1",
          [row.enrollment_id],
        );
      }
    } else {
      if (!row || row.revoked_at || !v.days)
        throw Object.assign(new Error("Faol xarid va kunlar soni kerak"), {
          status: 409,
        });
      expires = new Date(
        Math.max(Date.now(), new Date(row.expires_at).getTime()) +
          v.days * 86400000,
      );
      await client.query(
        "UPDATE platform_grants SET expires_at=$2 WHERE order_id=$1",
        [orderId, expires],
      );
      await client.query(
        "UPDATE user_subscriptions SET end_date=$2,status='active',updated_at=now() WHERE id=$1",
        [row.subscription_id, expires],
      );
    }
    const result = {
      orderId,
      active: v.action === "extend",
      expiresAt: expires,
    };
    await client.query(
      "INSERT INTO platform_operations(operation_id,order_id,kind,result) VALUES($1,$2,$3,$4)",
      [v.operationId, orderId, v.action, JSON.stringify(result)],
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function registerCoursePlatform(app: Express) {
  await ensurePlatformTables();
  await ensurePrivateFiles();
  await ensurePlatformReviews();
  const auth = (req: Request, res: Response, next: NextFunction) => {
    if (!providerAuthenticated(req.get("x-platform-key")))
      return res.status(403).json({ message: "Xizmat ruxsati yo‘q" });
    res.set("Cache-Control", "private, no-store");
    next();
  };
  app.get(
    "/api/platform/admin/files/:id",
    auth,
    handle(async (req, res) => {
      const file = (
        await pool.query(
          "SELECT owner_id FROM platform_private_files WHERE id=$1",
          [z.string().uuid().parse(req.params.id)],
        )
      ).rows[0];
      if (!file) return res.status(404).json({ message: "Fayl topilmadi" });
      return servePrivateFile(req, res, file.owner_id, undefined, true);
    }),
  );
  app.get(
    "/api/platform/files/:id",
    auth,
    handle(async (req, res) => {
      const grant = await ownedGrant(req);
      return servePrivateFile(req, res, grant.native_user_id, grant.course_id);
    }),
  );
  app.get(
    "/api/platform/admin/exam-attempts",
    auth,
    handle(async (_req, res) =>
      res.json({ attempts: await pendingPlatformReviews() }),
    ),
  );
  app.post(
    "/api/platform/admin/exam-attempts/:id/grade",
    auth,
    handle(async (req, res) =>
      res.json(await gradePlatformReview(String(req.params.id), req.body)),
    ),
  );
  app.get("/api/platform/capabilities", auth, (_req, res) =>
    res.json({
      provider: "courses",
      version: 1,
      kind: "course",
      durationRequired: true,
      native: true,
    }),
  );
  app.get(
    "/api/platform/catalog",
    auth,
    handle(async (_req, res) => {
      const courses = (
        await pool.query(
          "SELECT c.*,l.code AS level FROM courses c LEFT JOIN language_levels l ON l.id=c.level_id WHERE c.status='published' ORDER BY c.created_at DESC LIMIT 500",
        )
      ).rows;
      const result = [];
      for (const c of courses) {
        let plans = (
          await pool.query(
            'SELECT p.*,cp.price AS source_price FROM subscription_plans p JOIN course_plan_pricing cp ON cp.plan_id=p.id WHERE cp.course_id=$1 ORDER BY p."order",p.id',
            [c.id],
          )
        ).rows;
        if (!plans.length)
          plans = (
            await pool.query(
              'SELECT p.*,$1::numeric AS source_price FROM subscription_plans p ORDER BY p."order",p.id LIMIT 1',
              [c.price],
            )
          ).rows;
        const demo = (
          await pool.query(
            'SELECT id FROM lessons WHERE course_id=$1 AND is_demo=true ORDER BY "order" LIMIT 1',
            [c.id],
          )
        ).rows[0];
        for (const p of plans)
          result.push({
            sourceId: c.id + ":" + p.id,
            kind: "course",
            title: (c.title + " · " + p.display_name).slice(0, 200),
            description: (c.description || "").slice(0, 5000),
            thumbnailUrl: courseImage(c.thumbnail_url || c.image_url),
            level: c.level,
            sourceVersion: courseSourceVersion(c, p.id, p.features),
            demoRef: demo ? c.id + ":" + p.id : null,
            recommendedDurationDays: c.subscription_days || 30,
            sourcePriceUzs: p.source_price,
            features: courseFeatures(p.features),
            readyForSale: !(
              (Number(p.features?.liveClassesPerWeek) || 0) > 0 ||
              p.features?.hasCertificate === true
            ),
            saleNote:
              (Number(p.features?.liveClassesPerWeek) || 0) > 0
                ? "Jonli guruh biriktirish hali sozlanmagan"
                : p.features?.hasCertificate === true
                  ? "Sertifikat jarayoni hali ulanmagan"
                  : null,
          });
      }
      res.json({ products: result });
    }),
  );
  app.get(
    "/api/platform/products/:sourceId/demo",
    auth,
    handle(async (req, res) => {
      const { courseId } = splitSource(String(req.params.sourceId));
      const c = await storage.getCourse(courseId);
      if (!c || c.status !== "published")
        return res.status(404).json({ message: "Demo mavjud emas" });
      const lessons = (await storage.getDemoLessonsByCourse(courseId)).sort(
        (a, b) => a.order - b.order,
      );
      if (!lessons.length)
        return res.status(404).json({ message: "Demo dars belgilanmagan" });
      const lesson = lessons[0];
      const sections = await storage.getLessonSections(lesson.id);
      res.json({
        kind: "course",
        title: lesson.title,
        videoUrl: lesson.videoUrl,
        sections: sections.map((s) => ({
          id: s.id,
          title: s.title,
          videoUrl: s.videoUrl,
        })),
        pdfUrl: lesson.pdfUrl,
      });
    }),
  );
  app.post(
    "/api/platform/grants",
    auth,
    handle(async (req, res) => res.json(await provisionCourse(req.body))),
  );
  app.post(
    "/api/platform/grants/:orderId/manage",
    auth,
    handle(async (req, res) =>
      res.json(await manageCourseGrant(String(req.params.orderId), req.body)),
    ),
  );
  app.get(
    "/api/platform/grants/:orderId",
    auth,
    handle(async (req, res) => {
      const row = (
        await pool.query(
          "SELECT order_id,expires_at,revoked_at FROM platform_grants WHERE order_id=$1",
          [z.string().uuid().parse(req.params.orderId)],
        )
      ).rows[0];
      if (!row) return res.status(404).json({ message: "Xarid topilmadi" });
      res.json({
        orderId: row.order_id,
        active: !row.revoked_at && new Date(row.expires_at) > new Date(),
        expiresAt: row.expires_at,
      });
    }),
  );
  // This gateway maps the verified central identity to a separate native student record.
  // No email/name matching, password export, shared database connection, or browser credential is used.
  app.get(
    "/api/platform/owned/:sourceId/view",
    auth,
    handle(async (req, res) => {
      const grant = await ownedGrant(req);
      if (grant.source_id !== String(req.params.sourceId))
        return res.status(403).json({ message: "Mahsulot mos emas" });
      const course = await storage.getCourse(grant.course_id);
      if (!course) return res.status(404).json({ message: "Kurs topilmadi" });
      const lessons = await storage.getLessonsByCourse(grant.course_id);
      const progress = await storage.getLessonProgressByCourse(
        grant.course_id,
        grant.native_user_id,
      );
      const completionPercent = lessons.length
        ? Math.round(
            (progress.filter((p: any) => p.completed).length / lessons.length) *
              100,
          )
        : 0;
      res.json({
        kind: "course",
        completionPercent,
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
        },
        features: grant.features,
        expiresAt: grant.expires_at,
      });
    }),
  );
  app.use((req: any, res, next) => {
    if (!req.path.startsWith("/api/platform/native/")) return next();
    if (!providerAuthenticated(req.get("x-platform-key")))
      return res.status(403).json({ message: "Xizmat ruxsati yo‘q" });
    const path = "/api/" + req.path.slice("/api/platform/native/".length);
    if (
      !/^\/api\/(?:course-exams\/[^/]+\/start|course-exam-attempts\/[^/]+|courses\/[^/]+\/(?:lessons|progress|tests|assignments|modules|essay-questions|lesson-lock-status)|lessons\/[^/]+\/(?:sections|progress|essay-question|essay-submission)|tests\/[^/]+\/(?:questions|submit)|questions\/[^/]+\/options|student\/(?:tests\/[^/]+\/submit|test-attempts|courses\/[^/]+\/speaking-tests|speaking-tests\/[^/]+(?:\/submit)?|speaking-submissions|submissions|submissions\/[^/]+)|assignments\/[^/]+\/submit)$/.test(
        path,
      ) ||
      !["GET", "POST"].includes(req.method)
    )
      return res.status(404).json({ message: "API yo‘li mavjud emas" });
    void ownedGrant(req)
      .then((grant) => {
        req.user = {
          id: grant.native_user_id,
          claims: { sub: grant.native_user_id },
          role: "student",
        };
        req.isAuthenticated = () => true;
        req.platformGrant = {
          courseId: grant.course_id,
          features: grant.features,
          orderId: grant.order_id,
        };
        req.url = "/api/" + req.url.slice("/api/platform/native/".length);
        next();
      })
      .catch(next);
  });
}
