/**
 * Matching LMS courses to Askly's catalog. MIVA's LMS names courses
 * inconsistently ("COS 409", "MIVA-CSC 303", "CSC 301 301", "IFT 299 ");
 * Askly stores the bare code ("COS409"). Pure functions so they're testable.
 */

const CODE = /\b([A-Z]{2,4})\s*-?\s*(\d{3})\b/;

/** "MIVA-CSC 303" → "CSC303"; null when there's no recognisable code. */
export function normaliseLmsCourseCode(
  shortname: string,
  fullname = "",
): string | null {
  for (const raw of [shortname, fullname]) {
    const cleaned = raw
      .toUpperCase()
      .replace(/&AMP;/g, "&")
      .replace(/\bMIVA\s*-\s*/g, " ");
    const match = cleaned.match(CODE);
    if (match) return `${match[1]}${match[2]}`;
  }
  return null;
}

/** "COS 409-Research Methodology…" → "Research Methodology…" */
export function lmsCourseTitle(fullname: string, code: string | null): string {
  const decoded = fullname.replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  const withoutCode = decoded
    .replace(/^(MIVA\s*-\s*)?[A-Z]{2,4}\s*\d{3}(\s*\d{3})?\s*[-–:]?\s*/i, "")
    .trim();
  return (withoutCode || decoded || code || "Untitled course").slice(0, 200);
}

/** "COS409" → "400L"; codes outside 1xx–4xx fall back to 100L. */
export function levelFromCode(code: string): "100L" | "200L" | "300L" | "400L" {
  const digit = code.match(/\d/)?.[0];
  if (digit === "2") return "200L";
  if (digit === "3") return "300L";
  if (digit === "4") return "400L";
  return "100L";
}
