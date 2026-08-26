CREATE TABLE IF NOT EXISTS "course_series" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL,
  "description" text,
  "cover_image_url" text,
  "owner_id" varchar NOT NULL REFERENCES "users"("id"),
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "course_series_slug_unique" UNIQUE("slug")
);

ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "series_id" varchar REFERENCES "course_series"("id") ON DELETE SET NULL;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "series_order" integer DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS "course_series_status_order_idx" ON "course_series" ("status", "order");
CREATE INDEX IF NOT EXISTS "courses_series_order_idx" ON "courses" ("series_id", "series_order");

INSERT INTO "course_series" ("title", "slug", "description", "cover_image_url", "owner_id", "status", "order")
SELECT
  'Bosqichli arab tili kitoblari',
  'bosqichli-arab-tili-kitoblari',
  'Arab tilini A0 darajadan boshlab bosqichma-bosqich o''rganish uchun tartiblangan video kurslar.',
  COALESCE(c."thumbnail_url", c."image_url"),
  c."instructor_id",
  'published',
  0
FROM "courses" c
WHERE LOWER(TRIM(c."title")) LIKE 'bosqichli arab tili%'
  AND NOT EXISTS (
    SELECT 1 FROM "course_series" s WHERE s."slug" = 'bosqichli-arab-tili-kitoblari'
  )
ORDER BY c."created_at"
LIMIT 1;

UPDATE "courses" c
SET
  "series_id" = s."id",
  "series_order" = COALESCE(
    (SELECT l."order" FROM "language_levels" l WHERE l."id" = c."level_id"),
    CASE
      WHEN UPPER(c."title") LIKE '% A0%' THEN 0
      WHEN UPPER(c."title") LIKE '% A1%' THEN 1
      WHEN UPPER(c."title") LIKE '% A2%' THEN 2
      WHEN UPPER(c."title") LIKE '% B1%' THEN 3
      WHEN UPPER(c."title") LIKE '% B2%' THEN 4
      ELSE 99
    END
  )
FROM "course_series" s
WHERE s."slug" = 'bosqichli-arab-tili-kitoblari'
  AND LOWER(TRIM(c."title")) LIKE 'bosqichli arab tili%'
  AND c."series_id" IS NULL;
