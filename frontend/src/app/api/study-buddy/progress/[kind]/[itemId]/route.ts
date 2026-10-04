import { requireStudent } from "@/lib/auth/student";
import { getStudentId } from "@/lib/auth/user-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Authenticated proxy for Study Buddy draft-progress endpoints (quiz / exam /
 * assignment auto-save).
 *
 * The browser never talks to the Study Buddy service directly and never
 * supplies a student id: the id is derived from the session, and only the
 * three load/save/clear operations per kind are forwarded upstream, with the
 * internal shared secret attached.
 *
 *   GET    /api/study-buddy/progress/:kind/:itemId -> GET    /progress/:kind/load/:itemId/:studentId
 *   POST   /api/study-buddy/progress/:kind/:itemId -> POST   /progress/:kind/save
 *   DELETE /api/study-buddy/progress/:kind/:itemId -> DELETE /progress/:kind/clear/:itemId/:studentId
 */

const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 256 * 1024;

const answersSchema = z.record(z.string(), z.string());

const SAVE_SCHEMAS = {
  quiz: z.object({
    answers: answersSchema,
    current_question: z.number().int().min(0).default(0),
    mode: z.enum(["preview", "interactive", "results"]).default("interactive"),
  }),
  exam: z.object({
    answers: answersSchema,
    time_remaining_seconds: z.number().int().min(0).nullish(),
    current_question: z.number().int().min(0).default(0),
    mode: z.enum(["preview", "interactive", "results"]).default("interactive"),
  }),
  assignment: z.object({
    submission_text: z.string().nullish(),
    submission_files: z
      .array(
        z.object({
          name: z.string(),
          size: z.number(),
          type: z.string(),
          url: z.string().optional(),
        }),
      )
      .max(50)
      .nullish(),
    submission_link: z.string().nullish(),
  }),
} as const;

type ProgressKind = keyof typeof SAVE_SCHEMAS;

const ITEM_ID_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

interface RouteContext {
  params: Promise<{ kind: string; itemId: string }>;
}

function isProgressKind(kind: string): kind is ProgressKind {
  return Object.hasOwn(SAVE_SCHEMAS, kind);
}

function getUpstreamBase(): string | null {
  const configured = process.env.STUDY_BUDDY_API_URL;
  if (configured) return configured.replace(/\/+$/, "");
  // Localhost fallback is for local development only.
  return process.env.NODE_ENV === "production" ? null : "http://localhost:8083";
}

function upstreamHeaders(withJsonBody: boolean): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (withJsonBody) headers["Content-Type"] = "application/json";
  const secret = process.env.STUDY_BUDDY_SHARED_SECRET;
  if (secret) headers["X-Internal-Secret"] = secret;
  return headers;
}

/**
 * Authenticate, derive the student id from the session and validate the path.
 * Returns either an error response or the resolved request context.
 */
async function resolveContext(context: RouteContext): Promise<
  | NextResponse
  | {
      kind: ProgressKind;
      itemId: string;
      studentId: string;
      base: string;
    }
> {
  const sessionOrError = await requireStudent();
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const studentId = getStudentId(sessionOrError.user);
  if (!studentId) {
    return NextResponse.json(
      { error: "Student record not found for this account" },
      { status: 403 },
    );
  }

  const { kind, itemId } = await context.params;
  if (!isProgressKind(kind)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!ITEM_ID_PATTERN.test(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const base = getUpstreamBase();
  if (!base) {
    console.error("[study-buddy proxy] STUDY_BUDDY_API_URL is not configured");
    return NextResponse.json(
      { error: "Progress service unavailable" },
      { status: 503 },
    );
  }

  return { kind, itemId, studentId, base };
}

async function forward(url: string, init: RequestInit): Promise<NextResponse> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(
        `[study-buddy proxy] upstream ${init.method} returned ${response.status}`,
      );
      return NextResponse.json(
        { error: "Progress service error" },
        { status: 502 },
      );
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("[study-buddy proxy] upstream request failed:", error);
    return NextResponse.json(
      {
        error: timedOut
          ? "Progress service timed out"
          : "Progress service error",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}

function itemPath(itemId: string, studentId: string) {
  return `${encodeURIComponent(itemId)}/${encodeURIComponent(studentId)}`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const ctx = await resolveContext(context);
  if (ctx instanceof NextResponse) return ctx;

  return forward(
    `${ctx.base}/progress/${ctx.kind}/load/${itemPath(ctx.itemId, ctx.studentId)}`,
    { method: "GET", headers: upstreamHeaders(false) },
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ctx = await resolveContext(context);
  if (ctx instanceof NextResponse) return ctx;

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SAVE_SCHEMAS[ctx.kind].safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid progress payload" },
      { status: 400 },
    );
  }

  // Ids come from the URL + session only; anything the client sent is dropped.
  const body = {
    ...parsed.data,
    [`${ctx.kind}_id`]: ctx.itemId,
    student_id: ctx.studentId,
  };

  return forward(`${ctx.base}/progress/${ctx.kind}/save`, {
    method: "POST",
    headers: upstreamHeaders(true),
    body: JSON.stringify(body),
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const ctx = await resolveContext(context);
  if (ctx instanceof NextResponse) return ctx;

  return forward(
    `${ctx.base}/progress/${ctx.kind}/clear/${itemPath(ctx.itemId, ctx.studentId)}`,
    { method: "DELETE", headers: upstreamHeaders(false) },
  );
}
