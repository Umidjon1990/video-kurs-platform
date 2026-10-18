import type { Express, RequestHandler } from "express";
import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "./db";
import { courseFeatures, courseSourceVersion } from "./platform";

const fail = (status: number, message: string): never => {
  throw Object.assign(new Error(message), { status });
};
const legacyId = (id: string) => {
  const h = createHash("sha256")
    .update("courses:legacy:" + id)
    .digest("hex");
  return (
    h.slice(0, 8) +
    "-" +
    h.slice(8, 12) +
    "-5" +
    h.slice(13, 16) +
    "-a" +
    h.slice(17, 20) +
    "-" +
    h.slice(20, 32)
  );
};
export async function registerCourseLegacy(app: Express, auth: RequestHandler) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS platform_legacy_course_links(external_user_id varchar PRIMARY KEY,native_user_id varchar NOT NULL UNIQUE REFERENCES users(id),linked_at timestamptz NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS platform_legacy_course_audit(id uuid PRIMARY KEY,external_user_id varchar NOT NULL,native_user_id varchar NOT NULL,created_at timestamptz NOT NULL DEFAULT now())",
  );
  const limits = new Map<string, { n: number; until: number }>();
  const run =
    (fn: (req: any, res: any) => Promise<any>): RequestHandler =>
    (req, res, next) => {
      void fn(req, res).catch((e) => {
        if (e instanceof z.ZodError)
          res.status(400).json({ message: "So‘rov formati noto‘g‘ri" });
        else next(e);
      });
    };
  async function synchronize(external: string, native: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "zt-course:" + external,
      ]);
      const user = (
        await client.query("SELECT * FROM users WHERE id=$1", [native])
      ).rows[0];
      if (!user || user.status !== "active")
        fail(403, "Manba hisobi faol emas");
      const linked = (
        await client.query(
          "SELECT * FROM platform_legacy_course_links WHERE external_user_id=$1 OR native_user_id=$2 FOR UPDATE",
          [external, native],
        )
      ).rows;
      if (
        linked.some(
          (r: any) =>
            r.external_user_id !== external || r.native_user_id !== native,
        )
      )
        fail(409, "Bu eski hisob boshqa hisobga bog‘langan");
      const identity = (
        await client.query(
          "SELECT * FROM platform_identities WHERE external_user_id=$1 OR native_user_id=$2",
          [external, native],
        )
      ).rows;
      if (
        identity.some(
          (r: any) =>
            r.native_user_id === native && r.external_user_id !== external,
        )
      )
        fail(409, "Eski hisob boshqa kabinetda ishlatilgan");
      if (!identity.some((r: any) => r.external_user_id === external))
        await client.query(
          "INSERT INTO platform_identities(external_user_id,native_user_id) VALUES($1,$2)",
          [external, native],
        );
      if (!linked.length) {
        await client.query(
          "INSERT INTO platform_legacy_course_links(external_user_id,native_user_id) VALUES($1,$2)",
          [external, native],
        );
        await client.query(
          "INSERT INTO platform_legacy_course_audit(id,external_user_id,native_user_id) VALUES($1,$2,$3)",
          [randomUUID(), external, native],
        );
      }
      const rows = (
        await client.query(
          "SELECT s.*,c.title,c.description,c.updated_at AS course_updated,p.features,p.display_name,e.payment_status FROM user_subscriptions s JOIN courses c ON c.id=s.course_id JOIN subscription_plans p ON p.id=s.plan_id JOIN enrollments e ON e.id=s.enrollment_id WHERE s.user_id=$1 AND COALESCE(e.payment_method,'')<>'platform_coin' ORDER BY s.start_date DESC",
          [native],
        )
      ).rows;
      const grants = [];
      for (const row of rows) {
        if (!["approved", "confirmed"].includes(row.payment_status)) continue;
        const orderId = legacyId(row.id),
          sourceId = row.course_id + ":" + row.plan_id,
          features = courseFeatures(row.features),
          expires = row.status === "active" ? row.end_date : new Date(0);
        const version = courseSourceVersion(
          { id: row.course_id, updated_at: row.course_updated },
          row.plan_id,
          row.features,
        );
        const prior = (
          await client.query(
            "SELECT external_user_id FROM platform_grants WHERE order_id=$1",
            [orderId],
          )
        ).rows[0];
        if (prior && prior.external_user_id !== external)
          fail(409, "Eski xarid mos emas");
        await client.query(
          "INSERT INTO platform_grants(order_id,external_user_id,source_id,course_id,plan_id,enrollment_id,subscription_id,expires_at,features,source_version,native_user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(order_id) DO UPDATE SET expires_at=CASE WHEN platform_grants.revoked_at IS NULL THEN excluded.expires_at ELSE platform_grants.expires_at END,features=excluded.features",
          [
            orderId,
            external,
            sourceId,
            row.course_id,
            row.plan_id,
            row.enrollment_id,
            row.id,
            expires,
            JSON.stringify(features),
            version,
            native,
          ],
        );
        grants.push({
          orderId,
          sourceId,
          kind: "course",
          title: (row.title + " · " + row.display_name).slice(0, 200),
          description: (row.description || "").slice(0, 5000),
          sourceVersion: version,
          expiresAt: expires,
          maxAttempts: null,
          legacy: true,
        });
      }
      const permanent = (
        await client.query(
          "SELECT e.*,c.title,c.description FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=$1 AND e.payment_status IN('approved','confirmed') AND e.plan_id IS NULL AND c.subscription_days IS NULL AND NOT EXISTS(SELECT 1 FROM user_subscriptions s WHERE s.enrollment_id=e.id)",
          [native],
        )
      ).rows;
      for (const row of permanent) {
        const orderId = legacyId(row.id),
          sourceId = row.course_id + ":legacy-" + row.id,
          version = "legacy-permanent",
          features = { hasTests: true, hasAssignments: true };
        await client.query(
          "INSERT INTO platform_grants(order_id,external_user_id,source_id,course_id,enrollment_id,expires_at,features,source_version,native_user_id) VALUES($1,$2,$3,$4,$5,NULL,$6,$7,$8) ON CONFLICT(order_id) DO NOTHING",
          [
            orderId,
            external,
            sourceId,
            row.course_id,
            row.id,
            JSON.stringify(features),
            version,
            native,
          ],
        );
        grants.push({
          orderId,
          sourceId,
          kind: "course",
          title: row.title.slice(0, 200),
          description: (row.description || "").slice(0, 5000),
          sourceVersion: version,
          expiresAt: null,
          maxAttempts: null,
          legacy: true,
        });
      }
      await client.query("COMMIT");
      return {
        linked: true,
        provider: "courses",
        fullName: [user.first_name, user.last_name].filter(Boolean).join(" "),
        grants,
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  app.post(
    "/api/platform/legacy/link",
    auth,
    run(async (req, res) => {
      const v = z
          .object({
            externalUserId: z.string().min(1).max(100),
            username: z.string().trim().min(1).max(200),
            password: z.string().min(1).max(1024),
          })
          .strict()
          .parse(req.body),
        now = Date.now(),
        old = limits.get(v.externalUserId);
      if (old && old.until > now && old.n >= 8)
        fail(429, "Birozdan keyin qayta urinib ko‘ring");
      limits.set(v.externalUserId, {
        n: (old && old.until > now ? old.n : 0) + 1,
        until: now + 900000,
      });
      if (limits.size > 10000)
        for (const [k, v] of limits) if (v.until < now) limits.delete(k);
      const users = (
          await pool.query(
            "SELECT * FROM users WHERE (lower(email)=lower($1) OR phone=$1) AND status='active'",
            [v.username],
          )
        ).rows,
        user = users.length === 1 ? users[0] : null;
      if (
        !user?.password_hash ||
        !(await bcrypt.compare(v.password, user.password_hash))
      )
        fail(
          401,
          "Eski hisob login yoki paroli noto‘g‘ri, yoxud hisob faol emas",
        );
      const result = await synchronize(v.externalUserId, user.id);
      limits.delete(v.externalUserId);
      res.json(result);
    }),
  );
  app.get(
    "/api/platform/legacy/status/:userId",
    auth,
    run(async (req, res) => {
      const external = z.string().min(1).max(100).parse(req.params.userId),
        link = (
          await pool.query(
            "SELECT * FROM platform_legacy_course_links WHERE external_user_id=$1",
            [external],
          )
        ).rows[0];
      res.json(
        link
          ? await synchronize(external, link.native_user_id)
          : { linked: false, provider: "courses", grants: [] },
      );
    }),
  );
}
