import "server-only";

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

// text-embedding-3-small → 1536 dims, matches material_chunk.embedding vector(1536).
const EMBED_MODEL = "text-embedding-3-small";

/** Embed many chunks in one batched request. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: openai.textEmbedding(EMBED_MODEL),
    values: texts,
  });
  return embeddings;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.textEmbedding(EMBED_MODEL),
    value: text,
  });
  return embedding;
}

/** Format a vector for a pgvector literal, e.g. "[0.1,0.2,...]" (cast ::vector). */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
