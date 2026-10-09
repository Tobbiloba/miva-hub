import { type UIMessage, getToolName, isToolUIPart } from "ai";

/**
 * Course-material citations in chat answers. search-course-materials numbers
 * its passages S1..Sn and the model cites them as [S1]; numbering restarts
 * with every search, so an answer's [S#] refer to the most recent search
 * before that text in the same message.
 */

export const SEARCH_TOOL_NAME = "search-course-materials";

export type CitationSource = {
  source: string;
  title: string;
  course: string;
  week: number | null;
  materialId: string;
};

/** The passages of the last material search before `partIndex`, by S#. */
export function citationSourcesBefore(
  parts: UIMessage["parts"],
  partIndex: number,
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
  return new Map();
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
