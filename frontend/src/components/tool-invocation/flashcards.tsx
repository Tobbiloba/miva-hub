"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
};

export function Flashcards(props: FlashcardsProps) {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleCard = (index: number) => {
    setFlippedCards(prev => ({
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
            {props.course_code && <span className="font-medium">{props.course_code}</span>}
            {props.course_name && props.course_code && " • "}
            {props.course_name && <span>{props.course_name}</span>}
            {(props.course_name || props.course_code) && " • "}
            {props.total_cards} cards
            {props.difficulty_level && <span className="capitalize"> • {props.difficulty_level}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click on any card to flip it
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {props.cards.map((card, index) => (
          <div
            key={index}
            className="h-48 cursor-pointer perspective-1000"
            onClick={() => toggleCard(index)}
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
                  <p className="text-xs text-muted-foreground mt-2">Click to flip</p>
                </CardContent>
              </Card>

              {/* Back */}
              <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-accent/50">
                <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                  <p className="text-sm">{card.back}</p>
                  <p className="text-xs text-muted-foreground mt-2">Click to flip</p>
                </CardContent>
              </Card>
            </div>
          </div>
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
