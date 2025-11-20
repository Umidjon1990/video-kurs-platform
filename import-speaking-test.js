#!/usr/bin/env node

/**
 * Speaking Test Import Script
 * 
 * Bu script Excel fayldan speaking testlarni import qiladi
 * 
 * Excel fayl formati:
 * Sheet 1: Test Info
 *   - Test Name
 *   - Course ID
 *   - Duration (daqiqa)
 *   - Pass Score
 *   - Total Score
 *   - Instructions
 *   - Is Published (true/false)
 *   - Is Demo (true/false)
 * 
 * Sheet 2: Sections
 *   - Section Number
 *   - Section Title
 *   - Instructions
 *   - Preparation Time (soniya)
 *   - Speaking Time (soniya)
 *   - Image URL (optional)
 * 
 * Sheet 3: Questions
 *   - Section Number
 *   - Question Number
 *   - Question Text
 *   - Preparation Time (soniya, optional)
 *   - Speaking Time (soniya, optional)
 *   - Image URL (optional)
 * 
 * Ishlatish:
 *   node import-speaking-test.js <excel-file-path> <instructor-id>
 * 
 * Misol:
 *   node import-speaking-test.js speaking-test.xlsx user123
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as XLSX from 'xlsx';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import {
  speakingTests,
  speakingTestSections,
  speakingQuestions,
  courses,
} from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable topilmadi!');
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function importSpeakingTest(excelFilePath, instructorId) {
  try {
    console.log('📂 Excel faylni o\'qiyapman:', excelFilePath);
    
    // Excel faylni o'qish
    const filePath = resolve(process.cwd(), excelFilePath);
    const workbook = XLSX.readFile(filePath);
    
    // Sheetlarni tekshirish
    const requiredSheets = ['Test Info', 'Sections', 'Questions'];
    for (const sheetName of requiredSheets) {
      if (!workbook.SheetNames.includes(sheetName)) {
        throw new Error(`❌ "${sheetName}" sheet topilmadi! Iltimos, to'g'ri formatdagi Excel faylni ishlating.`);
      }
    }
    
    // Test Info sheet
    const testInfoSheet = workbook.Sheets['Test Info'];
    const testInfoData = XLSX.utils.sheet_to_json(testInfoSheet);
    
    if (testInfoData.length === 0) {
      throw new Error('❌ Test Info sheet bo\'sh!');
    }
    
    const testInfo = testInfoData[0];
    
    // Validate required fields
    if (!testInfo['Test Name'] || !testInfo['Course ID']) {
      throw new Error('❌ Test Name va Course ID majburiy!');
    }
    
    // Check if course exists
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, testInfo['Course ID']))
      .limit(1);
    
    if (!course) {
      throw new Error(`❌ Course topilmadi: ${testInfo['Course ID']}`);
    }
    
    // Check if instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new Error('❌ Instructor bu kursga ega emas!');
    }
    
    console.log('✅ Kurs topildi:', course.title);
    
    // Create speaking test
    console.log('📝 Speaking test yaratyapman...');
    const [speakingTest] = await db
      .insert(speakingTests)
      .values({
        courseId: testInfo['Course ID'],
        instructorId: instructorId,
        title: testInfo['Test Name'],
        description: testInfo['Description'] || '',
        duration: parseInt(testInfo['Duration (daqiqa)']) || 60,
        passScore: parseInt(testInfo['Pass Score']) || 60,
        totalScore: parseInt(testInfo['Total Score']) || 100,
        instructions: testInfo['Instructions'] || '',
        isPublished: testInfo['Is Published'] === 'true' || testInfo['Is Published'] === true,
        isDemo: testInfo['Is Demo'] === 'true' || testInfo['Is Demo'] === true,
      })
      .returning();
    
    console.log('✅ Speaking test yaratildi:', speakingTest.title);
    
    // Sections sheet
    const sectionsSheet = workbook.Sheets['Sections'];
    const sectionsData = XLSX.utils.sheet_to_json(sectionsSheet);
    
    if (sectionsData.length === 0) {
      throw new Error('❌ Sections sheet bo\'sh!');
    }
    
    console.log(`📝 ${sectionsData.length} ta section import qilyapman...`);
    
    const sectionMap = new Map(); // sectionNumber -> sectionId
    
    for (const sectionData of sectionsData) {
      const [section] = await db
        .insert(speakingTestSections)
        .values({
          speakingTestId: speakingTest.id,
          sectionNumber: parseInt(sectionData['Section Number']),
          title: sectionData['Section Title'] || `Section ${sectionData['Section Number']}`,
          instructions: sectionData['Instructions'] || '',
          preparationTime: parseInt(sectionData['Preparation Time (soniya)']) || 30,
          speakingTime: parseInt(sectionData['Speaking Time (soniya)']) || 60,
          imageUrl: sectionData['Image URL'] || null,
        })
        .returning();
      
      sectionMap.set(parseInt(sectionData['Section Number']), section.id);
      console.log(`  ✅ Section ${section.sectionNumber}: ${section.title}`);
    }
    
    // Questions sheet
    const questionsSheet = workbook.Sheets['Questions'];
    const questionsData = XLSX.utils.sheet_to_json(questionsSheet);
    
    if (questionsData.length === 0) {
      throw new Error('❌ Questions sheet bo\'sh!');
    }
    
    console.log(`📝 ${questionsData.length} ta savol import qilyapman...`);
    
    let questionCount = 0;
    for (const questionData of questionsData) {
      const sectionNumber = parseInt(questionData['Section Number']);
      const sectionId = sectionMap.get(sectionNumber);
      
      if (!sectionId) {
        console.warn(`⚠️  Savol uchun section topilmadi: Section ${sectionNumber}`);
        continue;
      }
      
      await db
        .insert(speakingQuestions)
        .values({
          sectionId: sectionId,
          questionNumber: parseInt(questionData['Question Number']),
          questionText: questionData['Question Text'],
          preparationTime: parseInt(questionData['Preparation Time (soniya)']) || null,
          speakingTime: parseInt(questionData['Speaking Time (soniya)']) || null,
          imageUrl: questionData['Image URL'] || null,
        });
      
      questionCount++;
      console.log(`  ✅ Savol ${questionData['Question Number']} (Section ${sectionNumber})`);
    }
    
    console.log('\n✅ Import muvaffaqiyatli yakunlandi!');
    console.log(`📊 Natijalar:`);
    console.log(`   - Test: ${speakingTest.title}`);
    console.log(`   - Sections: ${sectionsData.length}`);
    console.log(`   - Savollar: ${questionCount}`);
    console.log(`   - ID: ${speakingTest.id}`);
    
  } catch (error) {
    console.error('\n❌ Import xatolik:', error.message);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Noto\'g\'ri parametrlar!');
  console.error('\nIshlatish:');
  console.error('  node import-speaking-test.js <excel-file-path> <instructor-id>');
  console.error('\nMisol:');
  console.error('  node import-speaking-test.js speaking-test.xlsx user123');
  process.exit(1);
}

const [excelFilePath, instructorId] = args;

importSpeakingTest(excelFilePath, instructorId)
  .then(() => {
    console.log('\n✅ Import yakunlandi!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import xatolik:', error);
    process.exit(1);
  });
