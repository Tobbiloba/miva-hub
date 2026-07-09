"use client";

import { HelpCircle, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "lib/utils";
import { Button } from "ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "ui/card";
import { Input } from "ui/input";

interface SupportMessage {
  role: "user" | "assistant";
  content: string;
  escalated?: boolean;
}

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;

    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Support request failed");
      }
      const data: { reply: string; escalated: boolean } = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, escalated: data.escalated },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
      // Remove the optimistic user message so it can be retried cleanly
      setMessages((prev) => prev.slice(0, -1));
      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <Card className="w-80 sm:w-96 shadow-lg py-0 gap-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3 space-y-0">
            <CardTitle className="text-sm font-semibold">
              Support Desk
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Close support chat"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={scrollRef}
              className="h-80 overflow-y-auto px-4 py-3 flex flex-col gap-3"
            >
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center my-auto">
                  Hi! Ask me about your courses, assignments, enrollment, or
                  billing — I&apos;ll escalate to a human if I can&apos;t help.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted",
                  )}
                >
                  {m.content}
                  {m.escalated && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Escalated to a human agent
                    </p>
                  )}
                </div>
              ))}
              {loading && (
                <div className="self-start flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking…
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t px-3 py-2 gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question…"
              aria-label="Support message"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
      <Button
        size="icon"
        className="size-11 rounded-full shadow-lg"
        aria-label={open ? "Close help" : "Open help"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <HelpCircle className="size-5" />}
      </Button>
    </div>
  );
}
