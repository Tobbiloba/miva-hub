"use client";

import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Deck {
  id: string;
  title: string;
  courseCode: string | null;
  courseTitle: string | null;
  weekNumber: number | null;
  cardCount: number;
  dueCount: number;
  createdAt: string;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/flashcards/decks")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message);
        setDecks(data.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Flashcards"
        description="Review your spaced-repetition decks. Ask Askly in the chat to make a new one from your notes."
      />

      {loading ? (
        <div className="flex justify-center py-16" aria-label="Loading">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<Layers />}
          title="Couldn't load your decks"
          action={
            <Button variant="outline" onClick={load}>
              Try again
            </Button>
          }
        />
      ) : decks.length === 0 ? (
        <EmptyState icon={<Layers />} title="No decks yet">
          Ask Askly to make some, like &ldquo;make flashcards on my COS101 week
          3 notes&rdquo;, then press Save deck under the cards.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/student/flashcards/${deck.id}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {deck.courseCode ?? "General"}
                </span>
                {deck.weekNumber && <span>Week {deck.weekNumber}</span>}
              </p>
              <h3 className="mt-1.5 text-[17px] leading-snug font-semibold tracking-[-0.015em]">
                {deck.title}
              </h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {deck.cardCount} cards · Made{" "}
                {new Date(deck.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="mt-5 flex items-center justify-between">
                {deck.dueCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-brand">
                    <span className="size-1.5 rounded-full bg-brand" />
                    {deck.dueCount} due for review
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">
                    All caught up
                  </span>
                )}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
