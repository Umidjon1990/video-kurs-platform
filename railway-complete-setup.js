/**
 * Railway Database Complete Setup
 * Bu script Railway database'ni to'liq sozlaydi:
 * 1. Schema tekshiradi
 * 2. discountPercentage column qo'shadi
 * 3. Test admin va instructor yaratadi
 * 4. Test kurslar qo'shadi
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const RAILWAY_DB_URL = process.env.RAILWAY_DATABASE_URL || 
  'postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway';

async function setupDatabase() {
  console.log('🚀 Railway Database Setup Started...\n');
  
  const pool = new Pool({
    connectionString: RAILWAY_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    // 1. Check tables exist
    console.log('📋 Step 1: Checking database schema...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found! Please run schema push first:');
      console.log('   npx drizzle-kit push');
      console.log('   or');
      console.log('   railway run npx drizzle-kit push');
      process.exit(1);
    }
    
    console.log(`✅ Found ${tablesResult.rows.length} tables`);
    
    // 2. Check/Add discount_percentage column
    console.log('\n📋 Step 2: Checking discount_percentage column...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'discount_percentage';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('➕ Adding discount_percentage column...');
      await pool.query(`
        ALTER TABLE courses 
        ADD COLUMN discount_percentage INTEGER DEFAULT 0;
      `);
      console.log('✅ discount_percentage column added');
    } else {
      console.log('✅ discount_percentage column already exists');
    }
    
    // 3. Check existing data
    console.log('\n📋 Step 3: Checking existing data...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const courseCount = await pool.query('SELECT COUNT(*) FROM courses');
    
    console.log(`👥 Users: ${userCount.rows[0].count}`);
    console.log(`📚 Courses: ${courseCount.rows[0].count}`);
    
    // 4. Create admin if not exists
    console.log('\n📋 Step 4: Setting up admin user...');
    const adminCheck = await pool.query(`
      SELECT id FROM users WHERE email = 'admin@lms.uz';
    `);
    
    let adminId;
    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      const adminResult = await pool.query(`
        INSERT INTO users (email, first_name, last_name, role, status, password_hash, phone)
        VALUES ('admin@lms.uz', 'Admin', 'User', 'admin', 'active', $1, '+998901234567')
        RETURNING id;
      `, [passwordHash]);
      adminId = adminResult.rows[0].id;
      console.log('✅ Admin user created');
      console.log('   Email: admin@lms.uz');
      console.log('   Password: admin123');
    } else {
      adminId = adminCheck.rows[0].id;
      console.log('✅ Admin user already exists');
    }
    
    // 5. Create instructor if not exists
    console.log('\n📋 Step 5: Setting up instructor user...');
    const instructorCheck = await pool.query(`
      SELECT id FROM users WHERE email = 'instructor@lms.uz';
    `);
    
    let instructorId;
    if (instructorCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('instructor123', 10);
      const instructorResult = await pool.query(`
        INSERT INTO users (email, first_name, last_name, role, status, password_hash, phone)
        VALUES ('instructor@lms.uz', 'Test', 'Instructor', 'instructor', 'active', $1, '+998901234568')
        RETURNING id;
      `, [passwordHash]);
      instructorId = instructorResult.rows[0].id;
      console.log('✅ Instructor user created');
      console.log('   Email: instructor@lms.uz');
      console.log('   Password: instructor123');
    } else {
      instructorId = instructorCheck.rows[0].id;
      console.log('✅ Instructor user already exists');
    }
    
    // 6. Create test courses if not exists
    console.log('\n📋 Step 6: Creating test courses...');
    const existingCourses = await pool.query('SELECT COUNT(*) FROM courses');
    
    if (parseInt(existingCourses.rows[0].count) === 0) {
      const courses = [
        {
          title: 'Web Dasturlash Asoslari',
          description: 'HTML, CSS, JavaScript asoslari. Frontend dasturlashni o\'rganing.',
          category: 'IT',
          price: '150000',
          originalPrice: '200000',
          discountPercentage: 25,
          author: 'Rustam Azimov'
        },
        {
          title: 'Python Dasturlash',
          description: 'Python tilida dasturlashni noldan o\'rganing. Backend va data science.',
          category: 'IT',
          price: '180000',
          originalPrice: '180000',
          discountPercentage: 0,
          author: 'Feruza Karimova'
        },
        {
          title: 'Grafik Dizayn Kursi',
          description: 'Adobe Photoshop va Illustrator dasturlarini o\'rganing.',
          category: 'Design',
          price: '120000',
          originalPrice: '160000',
          discountPercentage: 25,
          author: 'Dilshod Alimov'
        }
      ];
      
      for (const course of courses) {
        await pool.query(`
          INSERT INTO courses (
            title, description, category, price, original_price, 
            discount_percentage, author, instructor_id, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')
        `, [
          course.title,
          course.description,
          course.category,
          course.price,
          course.originalPrice,
          course.discountPercentage,
          course.author,
          instructorId
        ]);
        console.log(`✅ Created course: ${course.title}`);
      }
    } else {
      console.log(`✅ Courses already exist (${existingCourses.rows[0].count} courses)`);
    }
    
    // 7. Final status
    console.log('\n📊 Final Status:');
    const finalUserCount = await pool.query('SELECT COUNT(*) FROM users');
    const finalCourseCount = await pool.query('SELECT COUNT(*) FROM courses');
    
    console.log(`👥 Total Users: ${finalUserCount.rows[0].count}`);
    console.log(`📚 Total Courses: ${finalCourseCount.rows[0].count}`);
    
    console.log('\n✅ Railway Database Setup Complete!');
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@lms.uz / admin123');
    console.log('   Instructor: instructor@lms.uz / instructor123');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

setupDatabase()
  .then(() => {
    console.log('\n🎉 Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
