import { cn } from "lib/utils";
import { Check, Minus, X } from "lucide-react";

export type ResultState = "correct" | "partial" | "wrong" | "skipped";

/** One graded question in a quiz/exam result list. */
export function ResultRow({
  index,
  question,
  state,
  answer,
  correctAnswer,
  points,
}: {
  index: number;
  question: string;
  state: ResultState;
  answer?: string;
  correctAnswer?: string;
  points?: string;
}) {
  const Icon = state === "correct" ? Check : state === "skipped" ? Minus : X;
  return (
    <li className="flex gap-3 py-3.5">
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full [&_svg]:size-3",
          state === "correct" && "bg-success/15 text-success",
          state === "partial" && "bg-warning/15 text-warning",
          state === "wrong" && "bg-destructive/12 text-destructive",
          state === "skipped" && "bg-secondary text-muted-foreground",
        )}
      >
        <Icon strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium leading-snug">
            <span className="text-muted-foreground">{index}.</span> {question}
          </p>
          {points && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {points}
            </span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">
          {answer ? `Your answer: ${answer}` : "Not answered"}
        </p>
        {correctAnswer && state !== "correct" && (
          <p className="mt-0.5 text-success">Correct answer: {correctAnswer}</p>
        )}
        {state === "partial" && (
          <p className="mt-0.5 text-warning">
            Partial credit: close, but not exact.
          </p>
        )}
      </div>
    </li>
  );
}

/** Big score at the top of a results card. */
export function ScoreSummary({
  percentage,
  detail,
}: {
  percentage: number;
  detail: string;
}) {
  return (
    <div className="flex items-end gap-3 pb-1">
      <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums">
        {Math.round(percentage)}%
      </span>
      <span className="pb-1.5 text-sm text-muted-foreground">{detail}</span>
    </div>
  );
}
