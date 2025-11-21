-- Railway Database Diagnostic Queries
-- Run these queries in Railway PostgreSQL Data tab

-- 1. Check if Dilobar Unusova exists
SELECT id, email, first_name, last_name, role, status 
FROM users 
WHERE email = 'dilobar.unusova@test.uz' OR first_name ILIKE '%Dilobar%';

-- 2. Check her courses
SELECT c.id, c.title, c.instructor_id, c.status, c.created_at,
       COUNT(DISTINCT l.id) as lesson_count
FROM courses c
LEFT JOIN lessons l ON l.course_id = c.id
WHERE c.instructor_id = '9ff1f99a-3be1-4488-9f48-3b1b5140b11f'
GROUP BY c.id
ORDER BY c.created_at DESC;

-- 3. Check if courses table has all needed columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position;

-- 4. Check if tests table has instructor_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tests' 
AND column_name = 'instructor_id';

-- 5. Check if courseplanpricing table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'courseplanpricing';
