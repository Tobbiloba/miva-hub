"use client";

import { Markdown } from "@/components/markdown";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { BackgroundPaths } from "ui/background-paths";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "ui/context-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "ui/resizable";
import { Section, SubSection } from "./design-shell";

// The real chat field. Client-only: it mounts a TipTap editor.
const PromptInput = dynamic(() => import("@/components/prompt-input"), {
  ssr: false,
  loading: () => (
    <div className="h-24 w-full animate-pulse rounded-lg border bg-card" />
  ),
});

const SAMPLE_MARKDOWN = `### Week 4 — Sorting Algorithms

The AI professor renders **markdown** exactly like this in chat:

1. *Merge sort* — divide and conquer, \`O(n log n)\`
2. *Quick sort* — in-place, pivot-sensitive
3. *Bubble sort* — teaching tool only

> Rule of thumb: reach for the standard library first.

| Algorithm | Best | Worst |
| --- | --- | --- |
| Merge | n log n | n log n |
| Quick | n log n | n² |

\`\`\`python
def merge_sort(xs):
    if len(xs) <= 1:
        return xs
    mid = len(xs) // 2
    return merge(merge_sort(xs[:mid]), merge_sort(xs[mid:]))
\`\`\`
`;

const SAMPLE_MERMAID = `flowchart LR
  A[Student snaps photo] --> B{AI grades}
  B -->|confidence >= threshold<br/>and course calibrated| C[Grade auto-posts]
  B -->|otherwise| D[Faculty review queue]
  D -->|approved| E[Calibration count +1]
  E --> B`;

export function ChatSection() {
  const [input, setInput] = useState("");

  const sendMessage: UseChatHelpers<UIMessage>["sendMessage"] = async () => {
    toast.info("Design-system demo — messages are not sent from this page.");
    setInput("");
  };

  return (
    <Section
      id="chat"
      title="Chat & Rich Content"
      description="The real chat composer and the renderers that display AI responses — markdown, diagrams, and layout primitives."
    >
      <SubSection title="Chat composer (PromptInput)">
        <div className="min-w-0 space-y-2">
          <div className="mx-auto w-full max-w-3xl">
            <PromptInput
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              onStop={() => {}}
              placeholder="Ask your AI professor anything…"
              voiceDisabled
              disabledMention
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            PromptInput — TipTap editor, model selector, tool mode, attachments.
            Sending is stubbed to a toast on this page.
          </p>
        </div>
      </SubSection>

      <SubSection title="Markdown renderer">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <div className="min-w-0 overflow-x-auto rounded-lg border bg-card p-4">
              <Markdown>{SAMPLE_MARKDOWN}</Markdown>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Markdown — headings, lists, tables, blockquotes, fenced code
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="min-w-0 overflow-x-auto rounded-lg border bg-card p-4">
              <MermaidDiagram chart={SAMPLE_MERMAID} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              MermaidDiagram — flowcharts/sequence diagrams inside chat replies
            </p>
          </div>
        </div>
      </SubSection>

      <SubSection title="Layout primitives — Resizable · ContextMenu">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <ResizablePanelGroup
              direction="horizontal"
              className="h-32 rounded-lg border"
            >
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Panel A
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Panel B
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <p className="font-mono text-xs text-muted-foreground">
              Resizable — drag the handle
            </p>
          </div>
          <div className="min-w-0 space-y-2">
            <ContextMenu>
              <ContextMenuTrigger className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Right-click here
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Open</ContextMenuItem>
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <p className="font-mono text-xs text-muted-foreground">
              ContextMenu — right-click menus (thread list, file cards)
            </p>
          </div>
        </div>
      </SubSection>

      <SubSection title="Ambient background — BackgroundPaths">
        <div className="min-w-0 space-y-2">
          <div className="relative h-40 overflow-hidden rounded-lg border">
            <BackgroundPaths />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            BackgroundPaths — animated SVG paths, auth/landing surfaces
          </p>
        </div>
      </SubSection>
    </Section>
  );
}
