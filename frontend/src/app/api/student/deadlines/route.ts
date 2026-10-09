import { requireStudent } from "@/lib/auth/student";
import {
  DeadlineError,
  addPersonalDeadline,
  deletePersonalDeadline,
  listDeadlines,
  setDeadlineDone,
} from "@/lib/deadlines";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * The signed-in student's deadlines: lecturer assignments, captured LMS
 * deadlines and their own (lib/deadlines). The student id is always the
 * session's.
 *
 * GET    ?from&to&includeDone&courseId  → { deadlines }
 * POST   { title, dueAt, courseId?, notes? } → { deadline }   (add your own)
 * PATCH  { key, done }                  → { ok }               (tick)
 * DELETE ?key=personal:<id>             → { ok }               (your own only)
 */

const QuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeDone: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  courseId: z.string().uuid().optional(),
});

const AddSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.coerce.date(),
  courseId: z.string().uuid().nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

const TickSchema = z.object({
  key: z.string().max(100),
  done: z.boolean(),
});

function errorResponse(error: unknown) {
  if (error instanceof DeadlineError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  throw error;
}

export async function GET(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const deadlines = await listDeadlines(session.user.id, parsed.data);
  return NextResponse.json({ deadlines });
}

export async function POST(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A title and a valid due date are required" },
      { status: 400 },
    );
  }
  try {
    const deadline = await addPersonalDeadline(session.user.id, parsed.data);
    return NextResponse.json({ deadline }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const parsed = TickSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    await setDeadlineDone(session.user.id, parsed.data.key, parsed.data.done);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireStudent();
  if (session instanceof NextResponse) return session;

  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }
  try {
    await deletePersonalDeadline(session.user.id, key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
