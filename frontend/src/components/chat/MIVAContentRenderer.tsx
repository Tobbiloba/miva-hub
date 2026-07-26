"use client";

import { callMcpToolByServerNameAction } from "@/app/api/mcp/actions";
import { ContentRenderer } from "./ContentRenderer";

interface MIVAContentRendererProps {
  toolName: string;
  result: any;
}

export function MIVAContentRenderer({
  toolName,
  result,
}: MIVAContentRendererProps) {
  // Extract content from result structure
  const getContent = () => {
    // Handle different result structures
    if (result?.content && Array.isArray(result.content)) {
      // MCP tool response format
      const textContent = result.content.find(
        (item: any) => item.type === "text",
      );
      if (textContent?.text) {
        if (typeof textContent.text === "string") {
          try {
            return JSON.parse(textContent.text);
          } catch {
            return textContent.text;
          }
        }
        return textContent.text;
      }
    }

    // Direct result
    if (result && typeof result === "object") {
      return result;
    }

    return result;
  };

  // Determine content type based on tool name
  const getContentType = (toolName: string) => {
    const toolTypeMap: Record<string, string> = {
      get_course_materials: "course_materials",
      list_enrolled_courses: "enrollments",
      get_upcoming_assignments: "assignments",
      generate_study_guide: "study_guide",
      view_course_announcements: "announcements",
      get_course_schedule: "schedule",
      get_academic_schedule: "schedule",
      get_course_info: "course_info",
      get_course_syllabus: "syllabus",
      create_flashcards: "flashcards",
      generate_quiz: "quiz",
      ask_study_question: "study_answer",
    };

    return toolTypeMap[toolName] || "default";
  };

  // Handle tool calls from the content renderer
  const handleToolCall = async (toolName: string, params: any) => {
    try {
      await callMcpToolByServerNameAction("miva-academic", toolName, params);
    } catch (error) {
      console.error("Tool call failed:", error);
    }
  };

  const content = getContent();
  const contentType = getContentType(toolName);

  // Handle error cases
  if (!content) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>No content available</p>
      </div>
    );
  }

  if (typeof content === "string" && content.includes("error")) {
    return (
      <div className="bg-card border border-destructive rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-destructive mr-2">⚠️</div>
          <div>
            <h4 className="font-semibold text-destructive">Error</h4>
            <p className="text-destructive text-sm">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render special content types with enhanced UI
  if (contentType === "study_guide" && typeof content === "string") {
    return (
      <div className="space-y-4">
        <ContentRenderer
          content={content}
          type={contentType}
          onToolCall={handleToolCall}
        />
      </div>
    );
  }

  if (contentType === "study_answer" && typeof content === "string") {
    return (
      <div className="bg-card rounded-lg p-6 border">
        <div className="flex items-start space-x-3">
          <div className="text-3xl">🧠</div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary mb-3">
              Study Buddy Answer
            </h3>
            <div className="prose max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/\n/g, "<br/>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use ContentRenderer for other academic content types. getContentType may
  // produce richer types (e.g. course_info, syllabus) than ContentRenderer
  // accepts; those fall back to its 'default' rendering.
  const rendererTypes = [
    "course_materials",
    "enrollments",
    "assignments",
    "study_guide",
    "announcements",
    "schedule",
  ] as const;
  const rendererType = (rendererTypes as readonly string[]).includes(
    contentType,
  )
    ? (contentType as (typeof rendererTypes)[number])
    : "default";

  return (
    <ContentRenderer
      content={content}
      type={rendererType}
      onToolCall={handleToolCall}
    />
  );
}
