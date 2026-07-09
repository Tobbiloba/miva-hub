"use client";

import { cn } from "lib/utils";
import { ExpandableVideoContent } from "./ExpandableVideoContent";

interface MediaRendererProps {
  content: string;
  className?: string;
}

export function MediaRenderer({ content, className }: MediaRendererProps) {
  // Check if content contains video URLs - focusing on videos only
  const hasVideo =
    /https?:\/\/[^\s]+\.(?:mp4|avi|mov|webm|mkv)(?:\?[^\s]*)?/i.test(content);

  if (!hasVideo) {
    return null;
  }

  return (
    <div className={cn("", className)}>
      <ExpandableVideoContent content={content} />
    </div>
  );
}
