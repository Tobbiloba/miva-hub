/**
 * Split material text into overlapping chunks for embedding.
 * ~1200 chars (~300 tokens) with 200-char overlap keeps each chunk semantically
 * coherent while preserving context across boundaries.
 */
export function chunkText(
  text: string,
  { size = 1200, overlap = 200 }: { size?: number; overlap?: number } = {},
): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let i = 0; i < clean.length; i += step) {
    chunks.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return chunks;
}
