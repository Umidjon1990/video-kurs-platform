import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function runMigrations() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS course_series (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        title varchar(255) NOT NULL,
        slug varchar(255) NOT NULL UNIQUE,
        description text,
        cover_image_url text,
        owner_id varchar NOT NULL REFERENCES users(id),
        status varchar(20) NOT NULL DEFAULT 'draft',
        "order" integer NOT NULL DEFAULT 0,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS series_id varchar REFERENCES course_series(id) ON DELETE SET NULL`);
    await db.execute(sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS series_order integer NOT NULL DEFAULT 0`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS course_series_status_order_idx ON course_series (status, "order")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS courses_series_order_idx ON courses (series_id, series_order)`);
    await db.execute(sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS test_gate_enabled BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE courses ADD COLUMN IF NOT EXISTS min_pass_score INTEGER DEFAULT 80`);
    await db.execute(sql`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS requires_test_pass BOOLEAN DEFAULT false`);

    await db.execute(sql`
      INSERT INTO course_series (title, slug, description, cover_image_url, owner_id, status, "order")
      SELECT
        'Bosqichli arab tili kitoblari',
        'bosqichli-arab-tili-kitoblari',
        'Arab tilini A0 darajadan boshlab bosqichma-bosqich o''rganish uchun tartiblangan video kurslar.',
        COALESCE(c.thumbnail_url, c.image_url),
        c.instructor_id,
        'published',
        0
      FROM courses c
      WHERE LOWER(TRIM(c.title)) LIKE 'bosqichli arab tili%'
        AND NOT EXISTS (
          SELECT 1 FROM course_series s WHERE s.slug = 'bosqichli-arab-tili-kitoblari'
        )
      ORDER BY c.created_at
      LIMIT 1
    `);

    await db.execute(sql`
      UPDATE courses c
      SET
        series_id = s.id,
        series_order = COALESCE(
          (SELECT l."order" FROM language_levels l WHERE l.id = c.level_id),
          CASE
            WHEN UPPER(c.title) LIKE '% A0%' THEN 0
            WHEN UPPER(c.title) LIKE '% A1%' THEN 1
            WHEN UPPER(c.title) LIKE '% A2%' THEN 2
            WHEN UPPER(c.title) LIKE '% B1%' THEN 3
            WHEN UPPER(c.title) LIKE '% B2%' THEN 4
            ELSE 99
          END
        )
      FROM course_series s
      WHERE s.slug = 'bosqichli-arab-tili-kitoblari'
        AND LOWER(TRIM(c.title)) LIKE 'bosqichli arab tili%'
        AND c.series_id IS NULL
    `);
    console.log('[DB Init] ✓ Migrations applied');
  } catch (error) {
    console.error('[DB Init] Migration error:', error);
  }
}

export async function ensureDefaultSubscriptionPlan() {
  try {
    console.log('[DB Init] Checking for subscription plans...');
    
    // Check if any subscription plans exist
    const existingPlans = await db
      .select()
      .from(subscriptionPlans)
      .limit(1);
    
    if (existingPlans.length > 0) {
      console.log(`[DB Init] ✓ Subscription plans found (${existingPlans.length}). Skipping initialization.`);
      return;
    }
    
    // No plans exist - create a default plan
    console.log('[DB Init] ⚠️  No subscription plans found. Creating default plan...');
    
    const [defaultPlan] = await db
      .insert(subscriptionPlans)
      .values({
        name: 'Asosiy Tarif',
        displayName: 'Asosiy Tarif',
        description: 'Standart obuna tarifi - barcha kurslar uchun',
        features: sql`'{"access": "full", "description": "Avtomatik yaratilgan asosiy tarif"}'::jsonb`,
        order: 1,
      })
      .returning();
    
    console.log(`[DB Init] ✓ Default subscription plan created: ${defaultPlan.name} (ID: ${defaultPlan.id})`);
    console.log('[DB Init] System is now ready for course enrollments.');
  } catch (error) {
    console.error('[DB Init] ❌ Failed to initialize database:', error);
    // Don't throw - let the server start, but log the error
    console.error('[DB Init] ⚠️  Course enrollment may not work until a subscription plan is created manually.');
  }
}
