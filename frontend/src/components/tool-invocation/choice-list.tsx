"use client";

import { cn } from "lib/utils";
import { RadioGroup, RadioGroupItem } from "ui/radio-group";

const KEYS = "ABCDEFGHIJ";

/** Answer options for quiz/exam questions: the whole row is the target. */
export function ChoiceList({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="gap-2">
      {options.map((option, i) => {
        const id = `${name}-${i}`;
        const checked = value === option;
        return (
          <label
            key={id}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[15px] leading-snug transition-colors duration-150",
              checked
                ? "border-brand bg-tint-blue/60"
                : "border-border hover:bg-accent/60",
            )}
          >
            <RadioGroupItem value={option} id={id} className="sr-only" />
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold transition-colors",
                checked
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-input text-muted-foreground",
              )}
            >
              {KEYS[i] ?? i + 1}
            </span>
            <span className="min-w-0 flex-1">{option}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
