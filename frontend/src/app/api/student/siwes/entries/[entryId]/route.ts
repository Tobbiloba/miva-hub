import { deleteEntry, editEntryWording } from "lib/siwes";
import { requireSiwesStudent, siwesErrorResponse } from "lib/siwes/api";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ entryId: string }> };
const notFound = () =>
  NextResponse.json({ error: "Entry not found" }, { status: 404 });

/** PATCH /api/student/siwes/entries/:id — the student edits the wording */
export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const { entryId } = await params;
  if (!z.string().uuid().safeParse(entryId).success) return notFound();
  const parsed = z
    .object({ formattedEntry: z.string().trim().min(1).max(2000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write something for the day" },
      { status: 400 },
    );
  }
  try {
    const entry = await editEntryWording(
      guard.userId,
      entryId,
      parsed.data.formattedEntry,
    );
    return NextResponse.json({ entry });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}

/** DELETE /api/student/siwes/entries/:id */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const guard = await requireSiwesStudent();
  if (guard instanceof Response) return guard;
  const { entryId } = await params;
  if (!z.string().uuid().safeParse(entryId).success) return notFound();
  try {
    await deleteEntry(guard.userId, entryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return siwesErrorResponse(error);
  }
}
