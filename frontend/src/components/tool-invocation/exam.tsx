"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  clearExamProgress,
  useExamProgress,
  useLoadExamProgress,
} from "@/hooks/useExamProgress";
import { authClient } from "@/lib/auth/client";
import { getStudentId } from "@/lib/auth/user-utils";
import { cn } from "lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudOff,
  GraduationCap,
  Loader2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChoiceList } from "./choice-list";
import { reportQuizResult } from "./report-result";
import { ResultRow, ScoreSummary } from "./result-row";
import { ToolCard, joinMeta } from "./tool-card";

type ExamProps = {
  exam_id?: string;
  course_code: string;
  course_name: string;
  exam_type?: "midterm" | "final" | "quiz" | "practice";
  time_limit_minutes: number;
  total_questions: number;
  total_points: number;
  instructions?: string;
  questions: Array<{
    question: string;
    question_type: "multiple_choice" | "true_false" | "short_answer" | "essay";
    options?: string[];
    points: number;
    correct_answer?: string;
  }>;
  grading_rubric?: string;
  student_id?: string;
};

export function Exam(props: ExamProps) {
  const { data: session } = authClient.useSession();
  const studentId = getStudentId(session?.user);

  const [mode, setMode] = useState<"preview" | "interactive" | "results">(
    "preview",
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(
    props.time_limit_minutes * 60,
  );
  const [submitted, setSubmitted] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const { progress: savedProgress } = useLoadExamProgress(
    props.exam_id,
    studentId || undefined,
  );

  const { saveStatus } = useExamProgress({
    examId: props.exam_id,
    studentId: studentId || undefined,
    data: { answers, currentQuestion, timeRemaining, mode },
    debounceMs: 1000,
  });

  useEffect(() => {
    if (savedProgress && mode === "preview") {
      if (savedProgress.mode === "results") {
        setAnswers(savedProgress.answers);
        setCurrentQuestion(savedProgress.currentQuestion);
        setTimeRemaining(savedProgress.timeRemaining);
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
      setTimeRemaining(savedProgress.timeRemaining);
      setMode(savedProgress.mode as "preview" | "interactive" | "results");
      setShowResumePrompt(false);
    }
  };

  const handleStartFresh = async () => {
    await clearExamProgress(props.exam_id, studentId || undefined);
    setShowResumePrompt(false);
    setMode("interactive");
  };

  useEffect(() => {
    if (mode !== "interactive" || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion]: answer,
    }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    await clearExamProgress(props.exam_id, studentId || undefined);
    setMode("results");
    reportQuizResult({
      kind: "exam",
      title: `${props.course_code} ${props.exam_type ?? "practice"} exam`,
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
        } else if (
          q.question_type === "short_answer" ||
          q.question_type === "essay"
        ) {
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

  const isWarningTime = timeRemaining <= 300 && timeRemaining > 0;

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

  const examLabel = props.exam_type
    ? props.exam_type.charAt(0).toUpperCase() + props.exam_type.slice(1)
    : "Exam";

  if (mode === "preview") {
    const resumable = showResumePrompt && savedProgress;
    return (
      <ToolCard
        icon={<GraduationCap />}
        eyebrow={joinMeta("Practice exam", props.course_code)}
        title={
          props.course_name ? `${examLabel}: ${props.course_name}` : examLabel
        }
        meta={joinMeta(
          `${props.time_limit_minutes} minutes`,
          `${props.total_questions} questions`,
          `${props.total_points} points`,
        )}
        footer={
          resumable ? (
            <>
              <Button size="sm" onClick={handleResumeProgress}>
                Resume ({Math.floor(savedProgress.timeRemaining / 60)} min left)
              </Button>
              <Button size="sm" variant="ghost" onClick={handleStartFresh}>
                Start over
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setMode("interactive")}>
              <Clock />
              Start exam
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
        icon={<GraduationCap />}
        eyebrow={joinMeta("Exam results", props.course_code)}
        title={
          props.course_name ? `${examLabel}: ${props.course_name}` : examLabel
        }
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
              } else if (
                q.question_type === "short_answer" ||
                q.question_type === "essay"
              ) {
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

  return (
    <ToolCard
      icon={<GraduationCap />}
      eyebrow={`Question ${currentQuestion + 1} of ${props.total_questions} · ${question.points} ${question.points === 1 ? "point" : "points"}`}
      title={question.question}
      action={
        <div className="flex items-center gap-3">
          {getSaveStatusDisplay()}
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm tabular-nums",
              isWarningTime
                ? "bg-warning/12 text-warning"
                : "bg-secondary text-foreground",
            )}
            aria-label={
              isWarningTime
                ? "Less than five minutes remaining"
                : "Time remaining"
            }
          >
            {isWarningTime ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
            {formatTime(timeRemaining)}
          </span>
        </div>
      }
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCurrentQuestion((i) => Math.max(0, i - 1))}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft />
            Previous
          </Button>
          <div className="flex-1" />
          {currentQuestion < props.total_questions - 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setCurrentQuestion((i) =>
                  Math.min(props.total_questions - 1, i + 1),
                )
              }
            >
              Next
              <ChevronRight />
            </Button>
          )}
          <Button size="sm" onClick={handleSubmit}>
            Submit exam
          </Button>
        </>
      }
    >
      <nav aria-label="Questions" className="mb-5 flex flex-wrap gap-1.5">
        {props.questions.map((_, i) => {
          const isCurrent = currentQuestion === i;
          const isAnswered = answers[i] !== undefined;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentQuestion(i)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ""}`}
              className={cn(
                "grid size-8 place-items-center rounded-lg text-xs font-medium tabular-nums transition-colors",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isAnswered
                    ? "bg-tint-blue text-brand"
                    : "bg-secondary text-muted-foreground hover:bg-accent",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

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

      {question.question_type === "essay" && (
        <Textarea
          value={currentAnswer || ""}
          onChange={(e) => handleAnswer(e.target.value)}
          placeholder="Write your answer"
          className="min-h-[200px] w-full"
        />
      )}
    </ToolCard>
  );
}
