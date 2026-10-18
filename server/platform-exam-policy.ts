import { randomInt, randomUUID } from "node:crypto";
export function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function makeExamSnapshot(
  test: any,
  questions: any[],
  sections: any[],
  options: Record<string, any[]>,
) {
  if (
    questions.some(
      (q) =>
        ![
          "multiple_choice",
          "true_false",
          "fill_blanks",
          "matching",
          "short_answer",
          "essay",
        ].includes(q.type),
    )
  )
    throw Object.assign(
      new Error("Testda qo‘llab-quvvatlanmagan savol turi bor"),
      { status: 409 },
    );
  const records = questions.map((q) => ({
    ...q,
    options: test.shuffleAnswers
      ? shuffled(options[q.id] || [])
      : options[q.id] || [],
    matchingChoices: shuffled(
      (q.config?.rightColumn || []).map((text: any, index: number) => ({
        id: randomUUID(),
        index,
        text,
      })),
    ),
  }));
  const stages: { ids: string[]; seconds: number | null; label: string }[] = [];
  const append = (items: any[], seconds: number | null, label: string) => {
    const values = test.randomOrder ? shuffled(items) : items;
    if (values.length)
      stages.push({ ids: values.map((q) => q.id), seconds, label });
  };
  if (test.timerMode === "per_question") {
    for (const q of test.randomOrder ? shuffled(records) : records)
      append([q], Math.max(1, q.timeLimit || test.timerValue || 60), "Savol");
  } else if (test.timerMode === "sections") {
    const assigned = new Set<string>();
    for (const s of [...sections].sort((a, b) => a.orderIndex - b.orderIndex)) {
      const items = records.filter((q) => q.sectionId === s.id);
      items.forEach((q) => assigned.add(q.id));
      if (s.timerType === "per_question") {
        for (const q of test.randomOrder ? shuffled(items) : items)
          append([q], Math.max(1, q.timeLimit || s.timerValue || 60), s.title);
      } else append(items, Math.max(1, s.timerValue || 60), s.title);
    }
    append(
      records.filter((q) => !assigned.has(q.id)),
      null,
      "Qo‘shimcha savollar",
    );
  } else
    append(
      records,
      test.timerMode === "global"
        ? Math.max(1, test.timerValue || 30) * 60
        : null,
      test.title,
    );
  if (!stages.length)
    throw Object.assign(new Error("Testda savollar yo‘q"), { status: 409 });
  return {
    test: {
      id: test.id,
      title: test.title,
      courseId: test.courseId,
      passingScore: test.passingScore || 0,
      timerMode: test.timerMode || "none",
    },
    questions: records,
    sections,
    stages,
  };
}
function safeConfig(value: any): any {
  if (Array.isArray(value)) return value.map(safeConfig);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) => !/(?:answer|correct|solution|rubric|keyfacts)/i.test(key),
        )
        .map(([key, v]) => [key, safeConfig(v)]),
    );
  return value;
}
export function publicExamQuestion(q: any) {
  const config = safeConfig(q.config || {});
  if (q.type === "matching")
    config.rightColumn = q.matchingChoices.map((c: any) => ({
      id: c.id,
      text: c.text,
    }));
  return {
    id: q.id,
    type: q.type,
    questionText: q.questionText,
    points: q.points,
    mediaUrl: q.mediaUrl,
    config,
    options: q.options.map((o: any) => ({
      id: o.id,
      optionText: o.optionText,
    })),
    correctCount: q.options.filter((o: any) => o.isCorrect).length,
  };
}
const normalized = (v: unknown) =>
  String(v ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("und");
export function gradeExam(
  snapshot: any,
  answers: Record<string, any>,
  manualScores?: Record<string, number>,
) {
  let score = 0,
    totalPoints = 0;
  const manual: any[] = [];
  const details = [];
  for (const q of snapshot.questions) {
    const points = Math.max(0, Number(q.points) || 0);
    totalPoints += points;
    const answer = answers[q.id];
    let correct = false,
      earned = 0;
    if (["essay", "short_answer"].includes(q.type)) {
      if (String(answer || "").trim())
        manual.push({
          id: q.id,
          questionText: q.questionText,
          answer: answer || "",
          points,
        });
      if (manualScores?.[q.id] !== undefined) earned = manualScores[q.id];
    } else if (q.type === "multiple_choice") {
      const expected = q.options
        .filter((o: any) => o.isCorrect)
        .map((o: any) => o.id)
        .sort();
      const selected = [
        ...new Set(Array.isArray(answer) ? answer : answer ? [answer] : []),
      ].sort();
      correct =
        expected.length > 0 &&
        JSON.stringify(expected) === JSON.stringify(selected);
    } else if (q.type === "true_false")
      correct =
        ["true", "false"].includes(normalized(q.correctAnswer)) &&
        normalized(answer) === normalized(q.correctAnswer);
    else if (q.type === "fill_blanks")
      correct =
        normalized(q.correctAnswer) !== "" &&
        normalized(answer) === normalized(q.correctAnswer);
    else if (q.type === "matching") {
      const expected = (q.config?.correctPairs || [])
        .map((p: any) => [Number(p[0]), Number(p[1])])
        .sort((a: any, b: any) => a[0] - b[0]);
      const pairs = Array.isArray(answer)
        ? answer
            .map((p: any) => [
              Number(p?.[0]),
              q.matchingChoices.find((c: any) => c.id === p?.[1])?.index ?? -1,
            ])
            .sort((a: any, b: any) => a[0] - b[0])
        : [];
      correct =
        expected.length > 0 &&
        JSON.stringify(expected) === JSON.stringify(pairs);
    } else
      throw Object.assign(
        new Error("Savol turi qo‘llab-quvvatlanmadi: " + q.type),
        { status: 409 },
      );
    if (correct) earned = points;
    if (earned < 0 || earned > points)
      throw Object.assign(new Error("Baho chegaradan tashqarida"), {
        status: 400,
      });
    score += earned;
    details.push({ questionId: q.id, score: earned, points });
  }
  const requiresManualReview =
    manual.length > 0 && manual.some((q) => manualScores?.[q.id] === undefined);
  const percentage = totalPoints ? (score / totalPoints) * 100 : 0;
  return {
    score,
    totalPoints,
    percentage,
    isPassed: !requiresManualReview && percentage >= snapshot.test.passingScore,
    requiresManualReview,
    manual,
    details,
  };
}
