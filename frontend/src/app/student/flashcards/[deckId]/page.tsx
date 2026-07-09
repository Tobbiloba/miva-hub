"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

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
  courseCode: string;
  courseTitle: string;
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
        await fetch(`/api/flashcards/cards/${currentCard.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        });

        setReviewed((r) => r + 1);
        setFlipped(false);
        setCurrentIndex((i) => i + 1);
      } catch {
        // silently continue — card stays in queue
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
      <div className="text-center py-12 text-muted-foreground">
        Loading deck...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Link href="/student/flashcards">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to decks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/student/flashcards">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Decks
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          {deck?.courseCode} · {deck?.title}
        </div>
      </div>

      {queue.length === 0 ? (
        /* No cards due */
        <Card>
          <CardContent className="text-center py-12">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium mb-2">All caught up!</p>
            <p className="text-muted-foreground">
              No cards are due for review right now. Check back later.
            </p>
            <Link href="/student/flashcards" className="mt-4 inline-block">
              <Button variant="outline">Back to decks</Button>
            </Link>
          </CardContent>
        </Card>
      ) : isComplete ? (
        /* Session complete */
        <Card>
          <CardContent className="text-center py-12">
            <Check className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium mb-2">Session complete!</p>
            <p className="text-muted-foreground mb-4">
              You reviewed {reviewed} card{reviewed !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/student/flashcards")}
              >
                Back to decks
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentIndex(0);
                  setReviewed(0);
                  setFlipped(false);
                  // Re-fetch due cards
                  fetch(`/api/flashcards/decks/${deckId}/due`)
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.success) setQueue(data.data);
                    });
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Review again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress */}
          <div className="text-center text-sm text-muted-foreground">
            Card {currentIndex + 1} of {queue.length}
          </div>

          {/* Flip card */}
          <div
            className="cursor-pointer select-none"
            onClick={handleFlip}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleFlip()}
          >
            <Card className="min-h-[280px] flex items-center justify-center transition-all">
              <CardContent className="p-8 text-center w-full">
                {!flipped ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                      Question
                    </p>
                    <p className="text-xl leading-relaxed">
                      {currentCard?.front}
                    </p>
                    <p className="text-xs text-muted-foreground mt-6">
                      Click to reveal · Space
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                      Answer
                    </p>
                    <p className="text-xl leading-relaxed">
                      {currentCard?.back}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rating buttons — only visible after flip */}
          {flipped && (
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                className="flex-1 max-w-[200px] border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => handleRate("again")}
                disabled={reviewing}
              >
                <X className="h-4 w-4 mr-1" /> Again
                <span className="ml-1 text-xs text-muted-foreground">(1)</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 max-w-[200px] border-green-300 text-green-600 hover:bg-green-50"
                onClick={() => handleRate("good")}
                disabled={reviewing}
              >
                <Check className="h-4 w-4 mr-1" /> Good
                <span className="ml-1 text-xs text-muted-foreground">(2)</span>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
