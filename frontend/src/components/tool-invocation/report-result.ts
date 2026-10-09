/**
 * Tell the server a quiz/exam the chat made was submitted, so the assistant
 * remembers the score and the questions missed. Best effort: the student's
 * results screen never waits on it.
 */
export function reportQuizResult(result: {
  kind: "quiz" | "exam";
  title: string;
  courseCode?: string | null;
  earnedPoints: number;
  totalPoints: number;
  correct: number;
  questions: { question: string }[];
  missedIndexes: number[];
}) {
  if (result.totalPoints <= 0 || result.questions.length === 0) return;
  void fetch("/api/student/quiz-results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: result.kind,
      title: result.title,
      courseCode: result.courseCode ?? null,
      earnedPoints: result.earnedPoints,
      totalPoints: result.totalPoints,
      correct: result.correct,
      questionCount: result.questions.length,
      missed: result.missedIndexes
        .slice(0, 20)
        .map((i) => result.questions[i].question.slice(0, 300)),
    }),
  }).catch(() => {});
}
