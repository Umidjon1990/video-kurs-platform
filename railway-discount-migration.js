/**
 * Railway Discount Migration
 * discountPercentage column qo'shadi
 */

import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  const DATABASE_URL = 'postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway';
  
  console.log('🔄 Connecting to Railway database...');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Check if courses table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'courses';
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️  courses table does not exist!');
      console.log('💡 Run schema push first: node railway-schema-push.js');
      return;
    }
    
    // Check if discount_percentage column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'discount_percentage';
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ discount_percentage column already exists!');
      
      // Show current courses
      const coursesResult = await pool.query('SELECT COUNT(*) as count FROM courses');
      console.log(`📊 Current courses in Railway database: ${coursesResult.rows[0].count}`);
      return;
    }
    
    // Add discount_percentage column
    console.log('📝 Adding discount_percentage column...');
    
    await pool.query(`
      ALTER TABLE courses 
      ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;
    `);
    
    console.log('✅ Migration successful! discount_percentage column added.');
    
    // Show status
    const coursesResult = await pool.query('SELECT COUNT(*) as count FROM courses');
    console.log(`\n📊 Current courses in Railway database: ${coursesResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
