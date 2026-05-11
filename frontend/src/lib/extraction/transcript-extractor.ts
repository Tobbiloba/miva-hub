/**
 * Transcript extraction for course materials.
 * Extracts text from PDFs (via pdfjs-dist) and VTT transcripts from Vimeo videos.
 */

import { pgDb } from "@/lib/db/pg/db.pg";
import { CourseMaterialSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

// ── PDF text extraction ─────────────────────────────────────────────

export async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  // Use legacy build to avoid ESM worker issues in Node/Next.js API routes
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str)
      .join(" ");
    if (pageText.trim()) {
      pages.push(pageText.trim());
    }
  }
  doc.destroy();

  return pages.join("\n\n");
}

// ── Vimeo VTT extraction ────────────────────────────────────────────

export async function fetchVimeoVtt(
  vimeoVideoId: string,
  vimeoHash?: string
): Promise<string | null> {
  // Step 1: Fetch Vimeo player page to get config with text tracks
  const playerUrl = vimeoHash
    ? `https://player.vimeo.com/video/${vimeoVideoId}?h=${vimeoHash}`
    : `https://player.vimeo.com/video/${vimeoVideoId}`;

  const res = await fetch(playerUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Askly/1.0)",
      Referer: "https://player.vimeo.com/",
    },
  });

  if (!res.ok) {
    console.warn(`[transcript] Vimeo player fetch failed: ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Extract playerConfig JSON from the HTML
  const configMatch = html.match(/window\.playerConfig\s*=\s*({.+?});?\s*(?:<\/script>|$)/s);
  if (!configMatch) {
    console.warn("[transcript] Could not find playerConfig in Vimeo HTML");
    return null;
  }

  let config: any;
  try {
    config = JSON.parse(configMatch[1]);
  } catch {
    console.warn("[transcript] Failed to parse Vimeo playerConfig JSON");
    return null;
  }

  // Step 2: Find auto-generated English captions
  const textTracks = config?.request?.text_tracks;
  if (!Array.isArray(textTracks) || textTracks.length === 0) {
    return null; // No captions available
  }

  // Prefer AI-generated English, fall back to any English, fall back to first track
  const track =
    textTracks.find(
      (t: any) => t.lang === "en" && t.kind === "captions"
    ) ||
    textTracks.find((t: any) => t.lang === "en") ||
    textTracks[0];

  if (!track?.url) return null;

  // Step 3: Fetch the VTT file
  const vttUrl = track.url.startsWith("http")
    ? track.url
    : `https://player.vimeo.com${track.url}`;

  const vttRes = await fetch(vttUrl);
  if (!vttRes.ok) {
    console.warn(`[transcript] VTT fetch failed: ${vttRes.status}`);
    return null;
  }

  const vttText = await vttRes.text();
  return parseVtt(vttText);
}

/**
 * Parse VTT content: strip timestamps, metadata, and WEBVTT header.
 * Keep only spoken text lines, deduplicated.
 */
export function parseVtt(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip WEBVTT header, NOTE blocks, blank lines, timestamps, and cue identifiers
    if (
      !trimmed ||
      trimmed === "WEBVTT" ||
      trimmed.startsWith("NOTE") ||
      trimmed.startsWith("Kind:") ||
      trimmed.startsWith("Language:") ||
      /^\d+$/.test(trimmed) || // numeric cue identifiers
      /^\d{2}:\d{2}[:\.]/.test(trimmed) // timestamp lines (00:00:01.000 --> ...)
    ) {
      continue;
    }
    // Strip VTT formatting tags like <c>, </c>, etc.
    const clean = trimmed.replace(/<[^>]+>/g, "").trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      textLines.push(clean);
    }
  }

  return textLines.join(" ");
}

// ── Orchestrator: run extraction for a material row ─────────────────

export async function extractTranscriptForMaterial(
  materialId: string,
  mimeType: string | null,
  options: {
    pdfBuffer?: Buffer;
    s3Key?: string;
    vimeoVideoId?: string;
    vimeoHash?: string;
  }
): Promise<{ status: string; wordCount?: number; error?: string }> {
  // Mark as extracting
  await pgDb
    .update(CourseMaterialSchema)
    .set({ transcriptStatus: "extracting", updatedAt: new Date() })
    .where(eq(CourseMaterialSchema.id, materialId));

  try {
    let text: string | null = null;
    let source: "pdfjs" | "vimeo_vtt" | "manual" = "pdfjs";

    if (mimeType === "application/pdf") {
      // PDF extraction
      let buffer = options.pdfBuffer;

      if (!buffer && options.s3Key) {
        // Download from S3 if buffer not provided
        const { s3Service } = await import("@/lib/aws/s3-service");
        const url = await s3Service.generateDownloadUrl(options.s3Key, {
          userId: "system",
          userRole: "admin",
        });
        if (!url) throw new Error("Failed to generate S3 download URL");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`S3 download failed: ${res.status}`);
        buffer = Buffer.from(await res.arrayBuffer());
      }

      if (!buffer) throw new Error("No PDF buffer available for extraction");

      text = await extractPdfText(buffer);
      source = "pdfjs";

      if (!text || text.trim().length === 0) {
        // Image-only PDF or empty
        await pgDb
          .update(CourseMaterialSchema)
          .set({
            transcriptStatus: "failed",
            transcriptErrorMessage: "PDF contains no extractable text (image-only or empty)",
            updatedAt: new Date(),
          })
          .where(eq(CourseMaterialSchema.id, materialId));
        return { status: "failed", error: "No extractable text" };
      }
    } else if (mimeType?.startsWith("video/")) {
      // Video — try Vimeo VTT
      if (!options.vimeoVideoId) {
        await pgDb
          .update(CourseMaterialSchema)
          .set({
            transcriptStatus: "skipped",
            transcriptErrorMessage: "No Vimeo video ID available for transcript extraction",
            updatedAt: new Date(),
          })
          .where(eq(CourseMaterialSchema.id, materialId));
        return { status: "skipped", error: "No Vimeo video ID" };
      }

      text = await fetchVimeoVtt(options.vimeoVideoId, options.vimeoHash);
      source = "vimeo_vtt";

      if (!text || text.trim().length === 0) {
        await pgDb
          .update(CourseMaterialSchema)
          .set({
            transcriptStatus: "skipped",
            transcriptErrorMessage: "No auto-captions available",
            updatedAt: new Date(),
          })
          .where(eq(CourseMaterialSchema.id, materialId));
        return { status: "skipped", error: "No auto-captions available" };
      }
    } else {
      // Unknown mime type — skip
      await pgDb
        .update(CourseMaterialSchema)
        .set({
          transcriptStatus: "skipped",
          transcriptErrorMessage: `Unsupported mime type for extraction: ${mimeType}`,
          updatedAt: new Date(),
        })
        .where(eq(CourseMaterialSchema.id, materialId));
      return { status: "skipped", error: `Unsupported mime type: ${mimeType}` };
    }

    // Save extracted text
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    await pgDb
      .update(CourseMaterialSchema)
      .set({
        transcriptText: text,
        transcriptSource: source,
        transcriptExtractedAt: new Date(),
        transcriptWordCount: wordCount,
        transcriptStatus: "extracted",
        transcriptErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(CourseMaterialSchema.id, materialId));

    return { status: "extracted", wordCount };
  } catch (error: any) {
    console.error(`[transcript] Extraction failed for ${materialId}:`, error);

    await pgDb
      .update(CourseMaterialSchema)
      .set({
        transcriptStatus: "failed",
        transcriptErrorMessage: error.message || "Unknown extraction error",
        updatedAt: new Date(),
      })
      .where(eq(CourseMaterialSchema.id, materialId));

    return { status: "failed", error: error.message };
  }
}
