"use client";

import { useMemo } from "react";
import { Markdown } from "./markdown";
import { FileDisplay } from "./files";

interface MarkdownWithFilesProps {
  children: string;
  className?: string;
}

interface ParsedFile {
  url: string;
  title: string;
  materialType?: string;
}

export function MarkdownWithFiles({ children, className }: MarkdownWithFilesProps) {
  // Parse the markdown text to extract file URLs and information
  const { cleanedMarkdown, files } = useMemo(() => {
    const text = children;
    const files: ParsedFile[] = [];
    
    // Regex patterns to match our file links from MCP tools
    const patterns = [
      // Pattern: - 🔗 [View Material](/api/files/abc123)
      /- 🔗 \[([^\]]+)\]\(([^)]+)\)/g,
      // Pattern: 🔗 [View](/api/files/abc123)
      /🔗 \[([^\]]+)\]\(([^)]+)\)/g,
      // Pattern: [View Material](/api/files/abc123)
      /\[View Material\]\(([^)]+)\)/g,
    ];

    let cleanedText = text;
    
    // Extract files from each pattern
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [fullMatch, title, url] = match;
        
        // Check if it's one of our file URLs
        if (url && url.startsWith('/api/files/')) {
          files.push({
            url,
            title: title || 'Course Material',
          });
          
          // Remove the file link from markdown to avoid duplication
          cleanedText = cleanedText.replace(fullMatch, '');
        }
      }
    });

    // Also check for standalone URLs in the format /api/files/...
    const urlPattern = /^(\s*)([\/]api\/files\/[a-zA-Z0-9-]+)(\s*)$/gm;
    let urlMatch;
    while ((urlMatch = urlPattern.exec(text)) !== null) {
      const [fullMatch, beforeSpace, url, afterSpace] = urlMatch;
      files.push({
        url,
        title: 'Course Material',
      });
      cleanedText = cleanedText.replace(fullMatch, beforeSpace + afterSpace);
    }

    // Clean up any remaining empty lines or bullet points
    cleanedText = cleanedText
      .replace(/^\s*-\s*$/gm, '') // Remove empty bullet points
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple empty lines
      .trim();

    return { cleanedMarkdown: cleanedText, files };
  }, [children]);

  return (
    <div className={className}>
      {/* Render the cleaned markdown */}
      <Markdown>{cleanedMarkdown}</Markdown>
      
      {/* Render file displays */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((file, index) => (
            <FileDisplay
              key={`${file.url}-${index}`}
              publicUrl={file.url}
              title={file.title}
              materialType={file.materialType}
              className="max-w-2xl"
            />
          ))}
        </div>
      )}
    </div>
  );
}