/**
 * Railway Lesson Migration Script
 * Bu script Railway database'ga pdf_url ustunini qo'shadi
 */

import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  const DATABASE_URL = process.env.RAILWAY_DATABASE_URL || 'postgresql://user:password@host:port/railway';
  
  console.log('🔄 Connecting to Railway database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lessons' 
      AND column_name = 'pdf_url';
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ pdf_url column already exists!');
      return;
    }
    
    // Add pdf_url column to lessons table
    console.log('📝 Adding pdf_url column to lessons table...');
    
    const migrationQuery = `
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS pdf_url TEXT;
    `;
    
    await pool.query(migrationQuery);
    
    console.log('✅ Migration successful! pdf_url column added.');
    
    // Verify
    const verifyResult = await pool.query(checkQuery);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verified: Column exists in database');
    }
    
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
