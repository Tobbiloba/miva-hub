"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  clearQuizProgress,
  useLoadQuizProgress,
  useQuizProgress,
} from "@/hooks/useQuizProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CloudOff,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChoiceList } from "./choice-list";
import { reportQuizResult } from "./report-result";
import { ResultRow, ScoreSummary } from "./result-row";
import { ToolCard, joinMeta } from "./tool-card";

type QuizProps = {
  quiz_id?: string;
  title: string;
  course_name?: string;
  course_code?: string;
  total_questions: number;
  total_points: number;
  estimated_time?: string;
  instructions?: string;
  questions: Array<{
    question: string;
    question_type: "multiple_choice" | "true_false" | "short_answer";
    options?: string[];
    points: number;
    correct_answer?: string;
  }>;
};

export function Quiz(props: QuizProps) {
  const { data: session } = authClient.useSession();
  const studentId = getStudentId(session?.user);

  const [mode, setMode] = useState<"preview" | "interactive" | "results">(
    "preview",
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const { progress: savedProgress } = useLoadQuizProgress(
    props.quiz_id,
    studentId || undefined,
  );

  const { saveStatus } = useQuizProgress({
    quizId: props.quiz_id,
    studentId: studentId || undefined,
    data: { answers, currentQuestion, mode },
    debounceMs: 1000,
  });

  useEffect(() => {
    if (savedProgress && mode === "preview") {
      if (savedProgress.mode === "results") {
        setAnswers(savedProgress.answers);
        setCurrentQuestion(savedProgress.currentQuestion);
        setMode("results");
      } else if (!showResumePrompt) {
        setShowResumePrompt(true);
      }
    }
  }, [savedProgress, showResumePrompt, mode]);

  const handleResumeProgress = () => {
    if (savedProgress) {
      setAnswers(savedProgress.answers);
      setCurrentQuestion(savedProgress.currentQuestion);
      setMode(savedProgress.mode as "preview" | "interactive" | "results");
      setShowResumePrompt(false);
    }
  };

  const handleStartFresh = async () => {
    await clearQuizProgress(props.quiz_id, studentId || undefined);
    setShowResumePrompt(false);
    setMode("interactive");
  };

  const questionProgress =
    ((currentQuestion + 1) / props.total_questions) * 100;

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: answer,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < props.total_questions - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    await clearQuizProgress(props.quiz_id, studentId || undefined);
    setMode("results");
    reportQuizResult({
      kind: "quiz",
      title: props.title,
      courseCode: props.course_code,
      questions: props.questions,
      ...calculateScore(),
    });
  };

  const calculateScore = () => {
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;
    const missedIndexes: number[] = [];

    props.questions.forEach((q, i) => {
      totalPoints += q.points;
      const correctBefore = correct;

      if (q.correct_answer && answers[i]) {
        if (answers[i] === q.correct_answer) {
          correct++;
          earnedPoints += q.points;
        } else if (q.question_type === "short_answer") {
          const similarity = calculateStringSimilarity(
            answers[i],
            q.correct_answer,
          );
          if (similarity > 0.85) {
            correct++;
            earnedPoints += q.points;
          } else if (similarity > 0.5) {
            earnedPoints += q.points * similarity;
          }
        }
      }
      if (q.correct_answer && correct === correctBefore) missedIndexes.push(i);
    });

    return { correct, totalPoints, earnedPoints, missedIndexes };
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(s1, s2);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  if (mode === "preview") {
    const resumable = showResumePrompt && savedProgress;
    return (
      <ToolCard
        icon={<ClipboardList />}
        eyebrow={joinMeta("Practice quiz", props.course_code)}
        title={props.title}
        meta={joinMeta(
          `${props.total_questions} questions`,
          `${props.total_points} points`,
          props.estimated_time,
        )}
        footer={
          resumable ? (
            <>
              <Button size="sm" onClick={handleResumeProgress}>
                Resume ({Object.keys(savedProgress.answers).length} answered)
              </Button>
              <Button size="sm" variant="ghost" onClick={handleStartFresh}>
                Start over
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setMode("interactive")}>
              Start quiz
            </Button>
          )
        }
      >
        {props.instructions && (
          <p className="text-sm text-muted-foreground">{props.instructions}</p>
        )}
      </ToolCard>
    );
  }

  if (mode === "results") {
    const { correct, totalPoints, earnedPoints } = calculateScore();
    const percentage = (earnedPoints / totalPoints) * 100;

    return (
      <ToolCard
        icon={<ClipboardList />}
        eyebrow={joinMeta("Quiz results", props.course_code)}
        title={props.title}
        footer={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode("preview")}
          >
            Done
          </Button>
        }
      >
        <ScoreSummary
          percentage={percentage}
          detail={`${correct} of ${props.total_questions} correct · ${earnedPoints.toFixed(1)} / ${totalPoints} points`}
        />
        <ol className="mt-3 divide-y divide-border border-t border-border">
          {props.questions.map((q, i) => {
            const wasAnswered = answers[i] !== undefined;
            let score = 0;
            let isFullyCorrect = false;
            let isPartialCredit = false;

            if (q.correct_answer && answers[i]) {
              if (answers[i] === q.correct_answer) {
                score = 1.0;
                isFullyCorrect = true;
              } else if (q.question_type === "short_answer") {
                const similarity = calculateStringSimilarity(
                  answers[i],
                  q.correct_answer,
                );
                score = similarity;
                if (similarity > 0.85) {
                  isFullyCorrect = true;
                } else if (similarity > 0.5) {
                  isPartialCredit = true;
                }
              }
            }

            return (
              <ResultRow
                key={i}
                index={i + 1}
                question={q.question}
                state={
                  isFullyCorrect
                    ? "correct"
                    : isPartialCredit
                      ? "partial"
                      : wasAnswered
                        ? "wrong"
                        : "skipped"
                }
                answer={answers[i]}
                correctAnswer={q.correct_answer}
                points={
                  wasAnswered
                    ? `${(score * q.points).toFixed(1)} / ${q.points}`
                    : undefined
                }
              />
            );
          })}
        </ol>
      </ToolCard>
    );
  }

  const question = props.questions[currentQuestion];
  const currentAnswer = answers[currentQuestion];

  const getSaveStatusDisplay = () => {
    switch (saveStatus.status) {
      case "saving":
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case "saved":
        return (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Saved</span>
          </div>
        );
      case "offline":
        return (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <CloudOff className="w-3 h-3" />
            <span>Offline</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <XCircle className="w-3 h-3" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ToolCard
      icon={<ClipboardList />}
      eyebrow={`Question ${currentQuestion + 1} of ${props.total_questions}`}
      action={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {getSaveStatusDisplay()}
          <span>
            {question.points} {question.points === 1 ? "point" : "points"}
          </span>
        </div>
      }
      title={question.question}
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft />
            Previous
          </Button>
          <div className="flex-1" />
          {currentQuestion === props.total_questions - 1 ? (
            <Button size="sm" onClick={handleSubmit}>
              Submit quiz
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext}>
              Next
              <ChevronRight />
            </Button>
          )}
        </>
      }
    >
      <Progress value={questionProgress} className="mb-5 h-1" />

      {question.question_type === "multiple_choice" && question.options && (
        <ChoiceList
          name={`q${currentQuestion}`}
          options={question.options}
          value={currentAnswer}
          onChange={handleAnswer}
        />
      )}

      {question.question_type === "true_false" && (
        <ChoiceList
          name={`q${currentQuestion}`}
          options={["True", "False"]}
          value={currentAnswer}
          onChange={handleAnswer}
        />
      )}

      {question.question_type === "short_answer" && (
        <Input
          value={currentAnswer || ""}
          onChange={(e) => handleAnswer(e.target.value)}
          placeholder="Type your answer"
          className="w-full"
        />
      )}
    </ToolCard>
  );
}
