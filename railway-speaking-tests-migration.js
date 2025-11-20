/**
 * Railway Database Migration Script - Speaking Tests
 * Bu script Railway database'ga og'zaki test jadvall arini qo'shadi
 */

import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  // Railway DATABASE_PUBLIC_URL'ni shu yerga qo'ying
  const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || 'postgresql://user:password@host:port/railway';
  
  console.log('🔄 Connecting to Railway database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check if tables exist
    const checkQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('speaking_tests', 'speaking_test_sections', 'speaking_questions', 'speaking_submissions', 'speaking_answers', 'speaking_evaluations');
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length === 6) {
      console.log('✅ All speaking test tables already exist!');
      return;
    }
    
    console.log('📝 Creating speaking test tables...');
    
    // Create tables in order (respecting foreign key dependencies)
    const migrations = [
      // 1. Speaking Tests
      `CREATE TABLE IF NOT EXISTS speaking_tests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id VARCHAR NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        instructor_id VARCHAR NOT NULL REFERENCES users(id),
        lesson_id VARCHAR REFERENCES lessons(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL DEFAULT 60,
        pass_score INTEGER NOT NULL DEFAULT 60,
        total_score INTEGER NOT NULL DEFAULT 100,
        instructions TEXT,
        language VARCHAR(10) NOT NULL DEFAULT 'ar',
        is_demo BOOLEAN DEFAULT false,
        is_published BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`,
      
      // 2. Speaking Test Sections
      `CREATE TABLE IF NOT EXISTS speaking_test_sections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        speaking_test_id VARCHAR NOT NULL REFERENCES speaking_tests(id) ON DELETE CASCADE,
        section_number INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        instructions TEXT,
        preparation_time INTEGER NOT NULL DEFAULT 30,
        speaking_time INTEGER NOT NULL DEFAULT 60,
        image_url TEXT,
        parent_section_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      
      // 3. Speaking Questions
      `CREATE TABLE IF NOT EXISTS speaking_questions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id VARCHAR NOT NULL REFERENCES speaking_test_sections(id) ON DELETE CASCADE,
        question_number INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        image_url TEXT,
        preparation_time INTEGER,
        speaking_time INTEGER,
        question_audio_url TEXT,
        key_facts_plus TEXT,
        key_facts_minus TEXT,
        key_facts_plus_label TEXT,
        key_facts_minus_label TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      
      // 4. Speaking Submissions
      `CREATE TABLE IF NOT EXISTS speaking_submissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        speaking_test_id VARCHAR NOT NULL REFERENCES speaking_tests(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_score INTEGER,
        max_score INTEGER,
        feedback TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        evaluated_at TIMESTAMP
      );`,
      
      // 5. Speaking Answers
      `CREATE TABLE IF NOT EXISTS speaking_answers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id VARCHAR NOT NULL REFERENCES speaking_submissions(id) ON DELETE CASCADE,
        question_id VARCHAR NOT NULL REFERENCES speaking_questions(id) ON DELETE CASCADE,
        audio_url TEXT NOT NULL,
        transcription TEXT,
        score INTEGER,
        feedback TEXT,
        duration INTEGER,
        evaluated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      
      // 6. Speaking Evaluations
      `CREATE TABLE IF NOT EXISTS speaking_evaluations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        answer_id VARCHAR NOT NULL REFERENCES speaking_answers(id) ON DELETE CASCADE,
        evaluation_type VARCHAR(20) NOT NULL,
        evaluator_id VARCHAR REFERENCES users(id),
        score INTEGER NOT NULL,
        feedback TEXT,
        detailed_analysis JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );`,
      
      // Add self-reference constraint for parent_section_id
      `ALTER TABLE speaking_test_sections 
       DROP CONSTRAINT IF EXISTS speaking_test_sections_parent_section_id_fkey;`,
      
      `ALTER TABLE speaking_test_sections 
       ADD CONSTRAINT speaking_test_sections_parent_section_id_fkey 
       FOREIGN KEY (parent_section_id) REFERENCES speaking_test_sections(id);`
    ];
    
    for (const migration of migrations) {
      await pool.query(migration);
      console.log('✅ Executed migration query');
    }
    
    console.log('✅ All speaking test tables created successfully!');
    
    // Verify
    const verifyResult = await pool.query(checkQuery);
    console.log(`✅ Verified: ${verifyResult.rows.length}/6 tables exist`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
