"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Deck {
  id: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  weekNumber: number | null;
  cardCount: number;
  dueCount: number;
  createdAt: string;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flashcards/decks")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDecks(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Layers className="h-8 w-8 text-primary" />
          Flashcards
        </h1>
        <p className="text-muted-foreground">
          Review your spaced-repetition flashcard decks
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading decks...
        </div>
      ) : decks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium mb-2">No flashcard decks yet</p>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ask Askly to make some — try &quot;make flashcards for COS201 week
              3&quot; in the chat.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <Card key={deck.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">
                    {deck.title}
                  </CardTitle>
                  {deck.dueCount > 0 && (
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {deck.dueCount} due
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{deck.courseCode}</span>
                  {deck.weekNumber && (
                    <span className="text-xs">· Week {deck.weekNumber}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end gap-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{deck.cardCount} cards</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(deck.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <Link href={`/student/flashcards/${deck.id}`}>
                  <Button
                    className="w-full"
                    variant={deck.dueCount > 0 ? "default" : "outline"}
                  >
                    {deck.dueCount > 0
                      ? `Review ${deck.dueCount} card${deck.dueCount !== 1 ? "s" : ""}`
                      : "View deck"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
