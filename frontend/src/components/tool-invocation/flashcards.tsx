"use client";

import { Button } from "@/components/ui/button";
import { Check, Layers, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ToolCard, joinMeta } from "./tool-card";

type FlashcardsProps = {
  flashcards_id?: string;
  topic: string;
  course_name?: string;
  course_code?: string;
  total_cards: number;
  difficulty_level?: "beginner" | "intermediate" | "advanced";
  cards: Array<{
    front: string;
    back: string;
  }>;
  sources_used?: string[];
  /** "<messageId>:<toolCallId>", set once the set is complete; enables saving */
  chatSource?: string;
};

export function Flashcards(props: FlashcardsProps) {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const [saving, setSaving] = useState(false);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);

  async function saveDeck() {
    if (!props.chatSource) return;
    setSaving(true);
    try {
      const res = await fetch("/api/flashcards/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: props.topic,
          courseCode: props.course_code ?? null,
          chatSource: props.chatSource,
          cards: props.cards,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.deckId) {
        throw new Error(body.message ?? "Couldn't save this deck");
      }
      setSavedDeckId(body.deckId);
      toast.success(
        body.alreadySaved
          ? "Already in your flashcards"
          : "Saved. Askly will bring these back when they're due.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const toggleCard = (index: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const saveAction =
    props.chatSource && props.cards.length > 0 ? (
      savedDeckId ? (
        <Button asChild size="sm" variant="outline">
          <Link href={`/student/flashcards/${savedDeckId}`}>
            <Check />
            Saved · Review
          </Link>
        </Button>
      ) : (
        <Button size="sm" onClick={saveDeck} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save deck
        </Button>
      )
    ) : null;

  return (
    <ToolCard
      icon={<Layers />}
      eyebrow={joinMeta("Flashcards", props.course_code)}
      title={props.topic}
      meta={joinMeta(
        `${props.total_cards} cards`,
        props.difficulty_level &&
          props.difficulty_level.charAt(0).toUpperCase() +
            props.difficulty_level.slice(1),
        "Tap a card to flip it",
      )}
      action={saveAction}
      footer={
        props.sources_used && props.sources_used.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            From {props.sources_used.join(", ")}
          </p>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {props.cards.map((card, index) => (
          <button
            type="button"
            key={index}
            className="h-44 w-full cursor-pointer rounded-xl text-left perspective-1000 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => toggleCard(index)}
            aria-pressed={!!flippedCards[index]}
            aria-label={
              flippedCards[index]
                ? `Answer: ${card.back}`
                : `Card ${index + 1}: ${card.front}. Press to show the answer`
            }
          >
            <div
              className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${
                flippedCards[index] ? "rotate-y-180" : ""
              }`}
            >
              <div className="absolute inset-0 flex flex-col rounded-xl border border-border bg-card p-4 backface-hidden transition-colors hover:bg-accent/40">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <p className="m-auto text-center text-[15px] leading-snug font-medium">
                  {card.front}
                </p>
              </div>
              <div className="absolute inset-0 flex flex-col rounded-xl bg-tint-blue p-4 rotate-y-180 backface-hidden">
                <span className="text-xs font-medium text-brand">Answer</span>
                <p className="m-auto text-center text-sm leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ToolCard>
  );
}
