import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { requireSiwesStudent } from "lib/siwes/api";
import {
  MAX_LETTER_BYTES,
  readPlacementLetter,
  sniffLetterType,
} from "lib/siwes/letter";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/student/siwes/letter (multipart "file") — read a placement
 * letter (PDF, JPG, PNG or WebP) and return the details found, to pre-fill
 * the placement form. The file is read in memory and never stored.
 */
export async function POST(request: NextRequest) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const rate = await checkRateLimit(`siwes-letter:${guard.userId}`, 5, 600);
  if (!rate.allowed) return rateLimitResponse(rate);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Attach your placement letter" },
      { status: 400 },
    );
  }
  if (file.size > MAX_LETTER_BYTES) {
    return NextResponse.json(
      { error: "The letter must be under 4 MB" },
      { status: 413 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffLetterType(bytes);
  if (!type) {
    return NextResponse.json(
      { error: "Upload the letter as a PDF or a photo (JPG, PNG or WebP)" },
      { status: 415 },
    );
  }
  const reading = await readPlacementLetter({ bytes, type });
  if (!reading) {
    return NextResponse.json(
      { error: "We couldn't read that letter. Fill in the details yourself." },
      { status: 422 },
    );
  }
  if (!reading.isPlacementLetter) {
    return NextResponse.json(
      { error: "That doesn't look like a SIWES placement letter." },
      { status: 422 },
    );
  }
  return NextResponse.json({ reading });
}
