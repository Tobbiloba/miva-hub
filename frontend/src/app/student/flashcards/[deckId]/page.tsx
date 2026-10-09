"use client";

import { CardProgress, FlipCard } from "@/components/flashcards/flip-card";
import { Button } from "@/components/ui/button";
import { stripCitationMarkers } from "lib/ai/citations";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FlashcardCard {
  id: string;
  front: string;
  back: string;
  intervalDays: number;
  reviewCount: number;
  nextDueAt: string | null;
}

interface DeckInfo {
  id: string;
  title: string;
  courseCode: string | null;
  courseTitle: string | null;
  cardCount: number;
}

export default function ReviewSessionPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();

  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [queue, setQueue] = useState<FlashcardCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [knew, setKnew] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch deck info + due cards
  useEffect(() => {
    if (!deckId) return;

    Promise.all([
      fetch(`/api/flashcards/decks/${deckId}`).then((r) => r.json()),
      fetch(`/api/flashcards/decks/${deckId}/due`).then((r) => r.json()),
    ])
      .then(([deckRes, dueRes]) => {
        if (!deckRes.success) {
          setError(deckRes.message || "Deck not found");
          return;
        }
        setDeck(deckRes.data);
        if (dueRes.success) {
          setQueue(dueRes.data);
        }
      })
      .catch(() => setError("Failed to load deck"))
      .finally(() => setLoading(false));
  }, [deckId]);

  const currentCard = queue[currentIndex] ?? null;
  const isComplete = currentIndex >= queue.length && queue.length > 0;

  const handleFlip = useCallback(() => {
    if (!reviewing || !currentCard) {
      setFlipped((f) => !f);
    }
  }, [reviewing, currentCard]);

  const handleRate = useCallback(
    async (rating: "again" | "good") => {
      if (!currentCard || reviewing) return;
      setReviewing(true);

      try {
        const res = await fetch(
          `/api/flashcards/cards/${currentCard.id}/review`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating }),
          },
        );
        if (!res.ok) throw new Error("review failed");

        setReviewed((r) => r + 1);
        if (rating === "good") setKnew((k) => k + 1);
        setFlipped(false);
        setCurrentIndex((i) => i + 1);
      } catch {
        // The card stays put so the rating can be tried again
        toast.error("Couldn't save that rating. Try again.");
      } finally {
        setReviewing(false);
      }
    },
    [currentCard, reviewing],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === " ") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "1" && flipped) {
        handleRate("again");
      } else if (e.key === "2" && flipped) {
        handleRate("good");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleFlip, handleRate, flipped]);

  if (loading) {
    return (
      <div className="flex justify-center py-16" aria-label="Loading">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link href="/student/flashcards">
            <ArrowLeft /> Back to decks
          </Link>
        </Button>
      </div>
    );
  }

  const restart = () => {
    setCurrentIndex(0);
    setReviewed(0);
    setKnew(0);
    setFlipped(false);
    fetch(`/api/flashcards/decks/${deckId}/due`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setQueue(data.data);
      });
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <Link
        href="/student/flashcards"
        className="mb-4 inline-flex items-center gap-0.5 text-[13px] text-brand hover:underline"
      >
        <ChevronLeft className="size-4" />
        Flashcards
      </Link>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            {deck?.courseCode ?? "General"}
            {deck ? ` · ${deck.cardCount} cards` : ""}
          </p>
          <h1 className="mt-0.5 truncate text-[22px] leading-tight font-semibold tracking-[-0.022em]">
            {deck?.title}
          </h1>
        </div>
        {queue.length > 0 && !isComplete && (
          <p className="shrink-0 pb-0.5 text-sm text-muted-foreground tabular-nums">
            {currentIndex + 1} / {queue.length}
          </p>
        )}
      </div>

      {queue.length === 0 ? (
        <Finished
          title="All caught up"
          body="No cards are due right now. Askly will bring this deck back when it's time."
        >
          <Button asChild variant="outline">
            <Link href="/student/flashcards">Back to decks</Link>
          </Button>
        </Finished>
      ) : isComplete ? (
        <Finished
          title="Session complete"
          body={`You reviewed ${reviewed} card${reviewed !== 1 ? "s" : ""}. You knew ${knew}, and ${reviewed - knew} will come back sooner.`}
        >
          <Button
            variant="outline"
            onClick={() => router.push("/student/flashcards")}
          >
            Back to decks
          </Button>
          <Button onClick={restart}>
            <RotateCcw />
            Review again
          </Button>
        </Finished>
      ) : (
        <div className="mt-6">
          <CardProgress total={queue.length} current={currentIndex} />

          {currentCard && (
            <FlipCard
              key={currentCard.id}
              front={stripCitationMarkers(currentCard.front)}
              back={stripCitationMarkers(currentCard.back)}
              flipped={flipped}
              onFlip={handleFlip}
              stacked={queue.length - currentIndex > 1}
              className="mt-6 min-h-[320px] animate-in fade-in-0 slide-in-from-bottom-2 duration-300 sm:min-h-[360px]"
            />
          )}

          {/* Rating: appears once the answer is showing */}
          <div className="mt-6 h-12">
            {flipped ? (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={() => handleRate("again")}
                  disabled={reviewing}
                >
                  Again
                </Button>
                <Button
                  size="lg"
                  className="h-12 rounded-xl"
                  onClick={() => handleRate("good")}
                  disabled={reviewing}
                >
                  Got it
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className="h-12 w-full rounded-xl"
                onClick={handleFlip}
              >
                Show answer
              </Button>
            )}
          </div>
          <p className="mt-3 hidden text-center text-xs text-muted-foreground md:block">
            Space flips the card · 1 for Again · 2 for Got it
          </p>
        </div>
      )}
    </div>
  );
}

function Finished({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-success/12 text-success">
        <Check className="size-6" strokeWidth={2.5} />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      <div className="mt-6 flex gap-2.5">{children}</div>
    </div>
  );
}
