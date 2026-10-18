import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
let pg: PGlite,
  socket: PGLiteSocketServer,
  pool: any,
  platform: typeof import("./platform"),
  sourceId: string,
  sourceVersion: string;
const externalUserId = randomUUID(),
  orderId = randomUUID();
before(async () => {
  pg = new PGlite();
  await pg.waitReady;
  socket = new PGLiteSocketServer({ db: pg, port: 0, maxConnections: 2 });
  await socket.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@" + socket.getServerConn() + "/postgres";
  process.env.PLATFORM_SERVICE_SECRET = randomBytes(32).toString("hex");
  ({ pool } = await import("./db"));
  await pool.query(`CREATE TABLE users(id varchar PRIMARY KEY,first_name varchar,last_name varchar,role text,status text);
CREATE TABLE courses(id varchar PRIMARY KEY,title text,status text,updated_at timestamp);
CREATE TABLE subscription_plans(id varchar PRIMARY KEY,features jsonb,"order" integer DEFAULT 1);
CREATE TABLE course_plan_pricing(course_id varchar,plan_id varchar);
CREATE TABLE enrollments(id varchar PRIMARY KEY,user_id varchar REFERENCES users(id),course_id varchar REFERENCES courses(id),plan_id varchar REFERENCES subscription_plans(id),payment_method text,payment_status text);
CREATE TABLE user_subscriptions(id varchar PRIMARY KEY,user_id varchar REFERENCES users(id),course_id varchar REFERENCES courses(id),plan_id varchar REFERENCES subscription_plans(id),enrollment_id varchar REFERENCES enrollments(id),start_date timestamp,end_date timestamp,status text,updated_at timestamp);`);
  platform = await import("./platform");
  await platform.ensurePlatformTables();
  const c = randomUUID(),
    p = randomUUID();
  sourceId = c + ":" + p;
  await pool.query(
    "INSERT INTO courses VALUES($1,'Real course fixture','published',now())",
    [c],
  );
  await pool.query(
    "INSERT INTO subscription_plans(id,features) VALUES($1,$2)",
    [p, JSON.stringify({ hasTests: true })],
  );
  await pool.query("INSERT INTO course_plan_pricing VALUES($1,$2)", [c, p]);
  const row = (await pool.query("SELECT * FROM courses WHERE id=$1", [c]))
    .rows[0];
  const { createHash } = await import("node:crypto");
  sourceVersion = platform.courseSourceVersion(row, p, { hasTests: true });
});
after(async () => {
  await pool?.end();
  await socket?.stop();
  await pg?.close();
});
function input() {
  return {
    orderId,
    externalUserId,
    fullName: "Sinov o‘quvchi",
    sourceId,
    kind: "course",
    durationDays: 30,
    maxAttempts: null,
    sourceVersion,
  };
}
test("source grant creates one alias/enrollment/subscription and repeated delivery never duplicates them", async () => {
  const first = await platform.provisionCourse(input());
  assert.equal(first.active, true);
  const repeat = await platform.provisionCourse(input());
  assert.equal(repeat.orderId, first.orderId);
  for (const table of [
    "platform_identities",
    "enrollments",
    "user_subscriptions",
    "platform_grants",
  ])
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM " + table)).rows[0].n,
      1,
    );
});
test("source extension is idempotent and only its own subscription is revoked", async () => {
  const operationId = randomUUID();
  const value = { externalUserId, operationId, action: "extend", days: 10 };
  const first = await platform.manageCourseGrant(orderId, value);
  const repeat = await platform.manageCourseGrant(orderId, value);
  assert.equal(
    new Date(first.expiresAt).getTime(),
    new Date(repeat.expiresAt).getTime(),
  );
  await platform.manageCourseGrant(orderId, {
    externalUserId,
    operationId: randomUUID(),
    action: "revoke",
  });
  assert.equal(
    (await pool.query("SELECT status FROM user_subscriptions")).rows[0].status,
    "cancelled",
  );
  assert.equal(
    (await pool.query("SELECT payment_status FROM enrollments")).rows[0]
      .payment_status,
    "cancelled",
  );
  await assert.rejects(platform.provisionCourse(input()), /bekor qilingan/);
});
test("revocation before a delayed delivery prevents the late grant from appearing", async () => {
  const id = randomUUID();
  await platform.manageCourseGrant(id, {
    externalUserId,
    operationId: randomUUID(),
    action: "revoke",
  });
  await assert.rejects(
    platform.provisionCourse({ ...input(), orderId: id }),
    /bekor qilingan/,
  );
  assert.equal(
    (await pool.query("SELECT count(*)::int AS n FROM platform_grants")).rows[0]
      .n,
    1,
  );
});
test("provider credentials and purchased policy/version are validated", async () => {
  assert.equal(platform.providerAuthenticated("forged"), false);
  await assert.rejects(
    platform.provisionCourse({
      ...input(),
      orderId: randomUUID(),
      sourceVersion: "changed",
    }),
    /yangilangan/,
  );
  await assert.rejects(
    platform.provisionCourse({
      ...input(),
      orderId: randomUUID(),
      durationDays: null,
    }),
  );
});
