"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Layers, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="grid-cols-[auto_1fr] gap-x-3">
          <span className="row-span-2 grid size-11 place-items-center rounded-xl bg-tint-green text-green-700 dark:text-green-300">
            <Layers className="size-5" />
          </span>
          <CardTitle className="font-display text-lg">
            Flashcards · {props.topic}
          </CardTitle>
          <CardDescription>
            {props.course_code && (
              <span className="font-medium">{props.course_code}</span>
            )}
            {props.course_name && props.course_code && " • "}
            {props.course_name && <span>{props.course_name}</span>}
            {(props.course_name || props.course_code) && " • "}
            {props.total_cards} cards
            {props.difficulty_level && (
              <span className="capitalize"> • {props.difficulty_level}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Click on any card to flip it
          </p>
          {props.chatSource &&
            props.cards.length > 0 &&
            (savedDeckId ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/student/flashcards/${savedDeckId}`}>
                  <Check className="size-4" />
                  Saved · Review
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={saveDeck} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save deck
              </Button>
            ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {props.cards.map((card, index) => (
          <button
            type="button"
            key={index}
            className="h-48 w-full cursor-pointer text-left perspective-1000 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => toggleCard(index)}
            aria-pressed={!!flippedCards[index]}
            aria-label={
              flippedCards[index]
                ? `Answer: ${card.back}`
                : `Card ${index + 1}: ${card.front}. Press to show the answer`
            }
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                flippedCards[index] ? "rotate-y-180" : ""
              }`}
            >
              {/* Front */}
              <Card className="absolute inset-0 backface-hidden py-0 transition-colors hover:border-foreground/25">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <span className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Card {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-snug">
                    {card.front}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to flip
                  </p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card className="absolute inset-0 backface-hidden rotate-y-180 border-brand/30 bg-tint-blue py-0">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm">{card.back}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to flip
                  </p>
                </CardContent>
              </Card>
            </div>
          </button>
        ))}
      </div>

      {props.sources_used && props.sources_used.length > 0 && (
        <Card className="py-4">
          <CardContent>
            <p className="text-sm font-medium mb-2">Sources used</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {props.sources_used.map((source, i) => (
                <li key={i}>• {source}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
