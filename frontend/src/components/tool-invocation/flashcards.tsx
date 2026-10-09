"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Loader2, Save } from "lucide-react";
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
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Flashcards - {props.topic}</CardTitle>
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
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Card className="absolute inset-0 backface-hidden bg-secondary/40 hover:bg-secondary/60 transition-colors">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium">{card.front}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to flip
                  </p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-accent/50">
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
        <Card className="bg-secondary/40">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Sources Used:</p>
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
