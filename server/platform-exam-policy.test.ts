import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeExamSnapshot,
  publicExamQuestion,
  gradeExam,
} from "./platform-exam-policy";
const base = {
  id: "test",
  courseId: "course",
  title: "Fixture",
  passingScore: 60,
  timerMode: "none",
  randomOrder: true,
  shuffleAnswers: true,
};
const questions = [
  {
    id: "mc",
    type: "multiple_choice",
    questionText: "MC",
    points: 2,
    correctAnswer: "do not leak",
    config: { nested: { answerKey: "hidden" } },
    order: 1,
  },
  {
    id: "match",
    type: "matching",
    questionText: "Match",
    points: 2,
    config: {
      leftColumn: ["A", "B"],
      rightColumn: ["One", "Two"],
      correctPairs: [
        [0, 0],
        [1, 1],
      ],
    },
    order: 2,
  },
  { id: "essay", type: "essay", questionText: "Write", points: 6, order: 3 },
];
function snapshot() {
  return makeExamSnapshot(base, questions, [], {
    mc: [
      { id: "right", optionText: "Right", isCorrect: true },
      { id: "wrong", optionText: "Wrong", isCorrect: false },
    ],
  });
}
test("public exam payload contains no answer keys or original matching indices", () => {
  const s = snapshot();
  const dto = s.questions.map(publicExamQuestion);
  const text = JSON.stringify(dto);
  assert.equal(text.includes("do not leak"), false);
  assert.equal(text.includes("answerKey"), false);
  assert.equal(text.includes("isCorrect"), false);
  assert.equal(text.includes("correctPairs"), false);
  assert.equal(text.includes('"index"'), false);
  const q = dto.find((q) => q.id === "match")!;
  assert.equal(q.config.rightColumn.length, 2);
  assert.ok(
    q.config.rightColumn.every((c: any) => /^[0-9a-f-]{36}$/.test(c.id)),
  );
});
test("grading uses a frozen snapshot and opaque matching choices; written answers await manual grading", () => {
  const s = snapshot();
  const match = s.questions.find((q) => q.id === "match")!;
  const pairs = [0, 1].map((i) => [
    i,
    match.matchingChoices.find((c: any) => c.index === i).id,
  ]);
  const answers = { mc: ["right"], match: pairs, essay: "A written response" };
  const result = gradeExam(s, answers);
  assert.equal(result.score, 4);
  assert.equal(result.requiresManualReview, true);
  assert.equal(result.isPassed, false);
  assert.equal(gradeExam(s, answers, { essay: 6 }).score, 10);
  assert.equal(gradeExam(s, answers, { essay: 6 }).isPassed, true);
  assert.throws(() => gradeExam(s, answers, { essay: 7 }), /chegaradan/);
  questions[0].correctAnswer = "edited";
  assert.equal(gradeExam(s, answers).score, 4);
});
test("per-question and section timers preserve boundaries; unanswered manual questions receive zero", () => {
  const s = makeExamSnapshot(
    { ...base, timerMode: "per_question", timerValue: 30 },
    questions,
    [],
    {},
  );
  assert.equal(s.stages.length, 3);
  assert.ok(s.stages.every((s) => s.seconds === 30));
  assert.equal(gradeExam(s, {}).requiresManualReview, false);
  const sectional = makeExamSnapshot(
    { ...base, timerMode: "sections" },
    [
      { ...questions[0], sectionId: "one" },
      { ...questions[1], sectionId: "two" },
    ],
    [
      {
        id: "one",
        orderIndex: 1,
        timerType: "total",
        timerValue: 120,
        title: "First",
      },
      {
        id: "two",
        orderIndex: 2,
        timerType: "per_question",
        timerValue: 45,
        title: "Second",
      },
    ],
    {},
  );
  assert.deepEqual(
    sectional.stages.map((s) => s.seconds),
    [120, 45],
  );
});
