/**
 * Railway Schema Push Script
 * Bu script barcha table'larni Railway database'ga yaratadi
 */

import { execSync } from 'child_process';

// Railway DATABASE_URL
const RAILWAY_DB_URL = 'postgresql://postgres:XFEZGttFQaFukGeDFlAwCwMhtACRpZBZ@gondola.proxy.rlwy.net:53013/railway';

console.log('🚀 Pushing schema to Railway database...\n');

try {
  // Set environment variable and run drizzle-kit push
  const result = execSync(
    `DATABASE_URL="${RAILWAY_DB_URL}" npx drizzle-kit push`,
    { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: RAILWAY_DB_URL }
    }
  );
  
  console.log('\n✅ Schema pushed successfully to Railway!');
  console.log('📊 All tables created in Railway database.');
  
} catch (error) {
  console.error('\n❌ Schema push failed:', error.message);
  console.error('\n💡 Yo\'llanma:');
  console.error('1. Railway dashboard\'ga kiring');
  console.error('2. Database service\'ni ochib DATABASE_URL ni tekshiring');
  console.error('3. Connection string to\'g\'ri ekanligini tasdiqlang');
  process.exit(1);
}
