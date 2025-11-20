/**
 * OpenAI Service for Speaking Test Evaluation
 * Bu service Whisper (audio-to-text) va GPT-5 (baholash) uchun ishlatiladi
 * 
 * Note: OPENAI_API_KEY environment variable kerak
 * - Replit: Secrets pane orqali qo'shing
 * - Railway: Environment Variables orqali qo'shing
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface TranscriptionResult {
  text: string;
  duration: number;
}

export interface EvaluationResult {
  score: number; // 0-100
  feedback: string;
  detailedAnalysis: {
    fluency: number; // 0-10
    pronunciation: number; // 0-10
    vocabulary: number; // 0-10
    grammar: number; // 0-10
    relevance: number; // 0-10
    keyPointsCovered: string[];
    keyPointsMissed: string[];
    strengths: string[];
    improvements: string[];
  };
}

/**
 * Audio faylni transkripsiya qilish (Whisper)
 * @param audioFilePath - Audio fayl yo'li
 * @returns Transkripsiya matni va davomiyligi
 */
export async function transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
    });

    return {
      text: transcription.text,
      duration: transcription.duration || 0,
    };
  } catch (error: any) {
    console.error('❌ Transcription error:', error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Og'zaki javobni baholash (GPT-5)
 * @param params - Baholash parametrlari
 * @returns Baholash natijalari
 */
export async function evaluateSpeakingAnswer(params: {
  questionText: string;
  transcription: string;
  language: string;
  keyFactsPlus?: string; // Aytilishi kerak bo'lgan faktlar
  keyFactsMinus?: string; // Aytilmasligi kerak bo'lgan faktlar
}): Promise<EvaluationResult> {
  try {
    const { questionText, transcription, language, keyFactsPlus, keyFactsMinus } = params;

    // Language names
    const languageNames: Record<string, string> = {
      'ar': 'Arabic',
      'uz': 'Uzbek',
      'en': 'English',
      'ru': 'Russian',
    };

    const languageName = languageNames[language] || language;

    // Build evaluation prompt
    let evaluationPrompt = `You are an expert language teacher evaluating a student's spoken answer in ${languageName}.

**Question:** ${questionText}

**Student's Transcribed Answer:** ${transcription}
`;

    if (keyFactsPlus) {
      evaluationPrompt += `\n**Key Points the student SHOULD mention:** ${keyFactsPlus}`;
    }

    if (keyFactsMinus) {
      evaluationPrompt += `\n**Points the student SHOULD NOT mention (negative factors):** ${keyFactsMinus}`;
    }

    evaluationPrompt += `\n\nPlease evaluate the student's answer on these criteria (each 0-10):
1. **Fluency** - How smoothly and naturally they speak
2. **Pronunciation** - Clarity and accuracy of pronunciation
3. **Vocabulary** - Range and appropriateness of vocabulary used
4. **Grammar** - Grammatical accuracy
5. **Relevance** - How well they answered the question

Provide:
- Overall score (0-100)
- Detailed feedback in ${languageName} (for the student)
- Key points covered (list)
- Key points missed (list)
- Strengths (list of 2-3 points)
- Areas for improvement (list of 2-3 points)

**IMPORTANT:** Respond in JSON format:
{
  "score": number (0-100),
  "feedback": "string in ${languageName}",
  "fluency": number (0-10),
  "pronunciation": number (0-10),
  "vocabulary": number (0-10),
  "grammar": number (0-10),
  "relevance": number (0-10),
  "keyPointsCovered": ["point1", "point2", ...],
  "keyPointsMissed": ["point1", "point2", ...],
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert language teacher. Evaluate student speaking performances fairly but thoroughly. Provide constructive feedback.`,
        },
        {
          role: "user",
          content: evaluationPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      score: Math.max(0, Math.min(100, result.score || 0)),
      feedback: result.feedback || '',
      detailedAnalysis: {
        fluency: Math.max(0, Math.min(10, result.fluency || 0)),
        pronunciation: Math.max(0, Math.min(10, result.pronunciation || 0)),
        vocabulary: Math.max(0, Math.min(10, result.vocabulary || 0)),
        grammar: Math.max(0, Math.min(10, result.grammar || 0)),
        relevance: Math.max(0, Math.min(10, result.relevance || 0)),
        keyPointsCovered: Array.isArray(result.keyPointsCovered) ? result.keyPointsCovered : [],
        keyPointsMissed: Array.isArray(result.keyPointsMissed) ? result.keyPointsMissed : [],
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
      },
    };
  } catch (error: any) {
    console.error('❌ Evaluation error:', error.message);
    throw new Error(`Evaluation failed: ${error.message}`);
  }
}

/**
 * Test qilish uchun - OpenAI connection'ni tekshirish
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    // Simple test with a small completion
    await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: "Say hello" }],
      max_completion_tokens: 10,
    });
    return true;
  } catch (error: any) {
    console.error('❌ OpenAI connection test failed:', error.message);
    return false;
  }
}
