import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway',
  ssl: { rejectUnauthorized: false }
});

const result = await pool.query(`
  SELECT 
    id, 
    title, 
    category, 
    price, 
    original_price, 
    discount_percentage, 
    status,
    created_at
  FROM courses 
  ORDER BY created_at DESC;
`);

console.log('\n📚 Railway Database - Kurslar:\n');
result.rows.forEach((course, idx) => {
  console.log(`${idx + 1}. ${course.title}`);
  console.log(`   Kategoriya: ${course.category}`);
  console.log(`   Narx: ${course.price} so'm`);
  console.log(`   Asl narx: ${course.original_price} so'm`);
  console.log(`   Chegirma: ${course.discount_percentage}%`);
  console.log(`   Status: ${course.status}`);
  console.log(`   Yaratilgan: ${course.created_at}`);
  console.log('');
});

console.log(`Jami: ${result.rows.length} ta kurs\n`);

await pool.end();
