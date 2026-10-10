import { type UIMessage, getToolName, isToolUIPart } from "ai";
import type { TutorSource } from "./course-tutor-context";

/**
 * Course-material citations in chat answers. Passages are numbered S1..Sn
 * and the model cites them as [S1]. They come from one of two places:
 * - a search-course-materials call: numbering restarts with every search, so
 *   an answer's [S#] refer to the most recent search before that text;
 * - course grounding: with a course selected, the server numbers passages
 *   into the system prompt and sends the same list as message metadata
 *   (ChatMetadata.groundingSources). Used when the message has no search.
 */

export const SEARCH_TOOL_NAME = "search-course-materials";

export type CitationSource = {
  source: string;
  title: string;
  course: string;
  week: number | null;
  materialId: string;
};

/** The grounding passages the server numbered into the prompt, as sources. */
export function groundingCitationSources(
  sources: TutorSource[],
  courseCode: string,
): CitationSource[] {
  return sources.map((s) => ({
    source: `S${s.index}`,
    title: s.title,
    course: courseCode,
    week: s.weekNumber,
    materialId: s.materialId,
  }));
}

/**
 * What the text at `partIndex` can cite, by S#: the last material search
 * before it, or else the course-grounding sources sent with the message.
 */
export function citationSourcesBefore(
  parts: UIMessage["parts"],
  partIndex: number,
  grounding: CitationSource[] = [],
): Map<string, CitationSource> {
  for (let i = partIndex - 1; i >= 0; i--) {
    const part = parts[i];
    if (!isToolUIPart(part) || getToolName(part) !== SEARCH_TOOL_NAME) continue;
    const passages = (part.output as { passages?: unknown[] } | undefined)
      ?.passages;
    if (!Array.isArray(passages)) continue;
    const map = new Map<string, CitationSource>();
    for (const p of passages as Partial<CitationSource>[]) {
      if (p.source && p.materialId) {
        map.set(p.source, {
          source: p.source,
          title: p.title ?? "Course material",
          course: p.course ?? "",
          week: p.week ?? null,
          materialId: p.materialId,
        });
      }
    }
    return map;
  }
  return new Map(grounding.map((s) => [s.source, s]));
}

export function citationHref(source: CitationSource): string {
  return `/student/lecture-study/${source.materialId}?cite=${source.source}`;
}

export function citationLabel(source: CitationSource): string {
  return [
    source.title,
    source.course,
    source.week ? `Week ${source.week}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// [S1], [S1, S3], [S1; S2]
const CITATION_GROUP = /\[(S\d+(?:\s*[,;]\s*S\d+)*)\](?!\()/g;

/**
 * Drop [S#] markers from text that isn't rendered as markdown (flashcard
 * faces), where they can't become links and would show up raw.
 */
export function stripCitationMarkers(text: string): string {
  return text
    .replace(CITATION_GROUP, "")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Turn [S#] markers into markdown links to the cited material, leaving any
 * marker without a known source as plain text. Returns the S#s it linked.
 */
export function linkCitations(
  text: string,
  sources: Map<string, CitationSource>,
): { text: string; cited: CitationSource[] } {
  if (sources.size === 0) return { text, cited: [] };
  const cited = new Map<string, CitationSource>();
  const linked = text.replace(CITATION_GROUP, (match, group: string) => {
    const ids = group.split(/\s*[,;]\s*/);
    if (!ids.every((id) => sources.has(id))) return match;
    return ids
      .map((id) => {
        const source = sources.get(id)!;
        cited.set(id, source);
        const title = citationLabel(source).replace(/"/g, "'");
        return `[${id}](${citationHref(source)} "${title}")`;
      })
      .join(" ");
  });
  return { text: linked, cited: [...cited.values()] };
}
