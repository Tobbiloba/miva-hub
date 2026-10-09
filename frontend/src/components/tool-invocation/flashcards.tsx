"use client";

import { CardProgress, FlipCard } from "@/components/flashcards/flip-card";
import { Button } from "@/components/ui/button";
import { stripCitationMarkers } from "lib/ai/citations";
import { cn } from "lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
  Loader2,
  Save,
  Shuffle,
  SquareStack,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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
  const cards = useMemo(
    () =>
      props.cards.map((c) => ({
        front: stripCitationMarkers(c.front ?? ""),
        back: stripCitationMarkers(c.back ?? ""),
      })),
    [props.cards],
  );
  const total = cards.length;
  const [order, setOrder] = useState<number[]>(() =>
    props.cards.map((_, i) => i),
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [view, setView] = useState<"study" | "list">("study");

  const [saving, setSaving] = useState(false);
  const [savedDeckId, setSavedDeckId] = useState<string | null>(null);

  // Cards can stream in while the tool runs; keep the order covering all of them
  const deck = useMemo(() => {
    const seen = order.filter((i) => i < total);
    for (let i = 0; i < total; i++) if (!seen.includes(i)) seen.push(i);
    return seen;
  }, [order, total]);
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const card = cards[deck[safeIndex]];

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setFlipped(false);
      setIndex((i) => (Math.min(i, total - 1) + delta + total) % total);
    },
    [total],
  );

  function shuffle() {
    const next = [...deck];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setIndex(0);
    setFlipped(false);
  }

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
          cards,
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

  const saveAction =
    props.chatSource && total > 0 ? (
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

  const iconButton =
    "size-8 rounded-full text-muted-foreground hover:text-foreground";

  return (
    <ToolCard
      icon={<Layers />}
      eyebrow={joinMeta("Flashcards", props.course_code)}
      title={props.topic}
      meta={joinMeta(
        `${total} ${total === 1 ? "card" : "cards"}`,
        props.difficulty_level &&
          props.difficulty_level.charAt(0).toUpperCase() +
            props.difficulty_level.slice(1),
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
      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No cards yet.
        </p>
      ) : view === "study" && card ? (
        <div
          className="outline-none"
          // Arrow keys move through the deck once the card area has focus
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              go(1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              go(-1);
            }
          }}
        >
          <FlipCard
            key={deck[safeIndex]}
            front={card.front}
            back={card.back}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            position={`${safeIndex + 1} of ${total}`}
            stacked={total > 1}
            className="min-h-[240px] animate-in fade-in-0 slide-in-from-right-2 duration-300"
          />
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={iconButton}
              onClick={() => go(-1)}
              aria-label="Previous card"
              disabled={total < 2}
            >
              <ChevronLeft />
            </Button>
            <CardProgress total={total} current={safeIndex + 1} />
            <Button
              variant="ghost"
              size="icon"
              className={iconButton}
              onClick={() => go(1)}
              aria-label="Next card"
              disabled={total < 2}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-border rounded-xl border border-border">
          {cards.map((c, i) => (
            <li
              key={i}
              className="grid gap-1 px-4 py-3.5 sm:grid-cols-2 sm:gap-6"
            >
              <p className="text-sm font-medium leading-snug">
                <span className="mr-1.5 text-muted-foreground tabular-nums">
                  {i + 1}.
                </span>
                {c.front}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.back}
              </p>
            </li>
          ))}
        </ol>
      )}

      {total > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="inline-flex rounded-lg bg-secondary p-0.5 text-xs font-medium">
            {(
              [
                ["study", "Study", SquareStack],
                ["list", "All cards", List],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors",
                  view === key
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          {view === "study" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={shuffle}
            >
              <Shuffle className="size-3.5" />
              Shuffle
            </Button>
          )}
        </div>
      )}
    </ToolCard>
  );
}
