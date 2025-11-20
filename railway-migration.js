/**
 * Railway Database Migration Script
 * Bu script Railway database'ga image_url ustunini qo'shadi
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
    // Check if column exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      AND column_name = 'image_url';
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ image_url column already exists!');
      return;
    }
    
    // Add image_url column
    console.log('📝 Adding image_url column...');
    
    const migrationQuery = `
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `;
    
    await pool.query(migrationQuery);
    
    console.log('✅ Migration successful! image_url column added.');
    
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
