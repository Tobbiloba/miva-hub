import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from "@playwright/test";

/**
 * Deadlines + captures against a running local stack (frontend :4001, local
 * DB). A captured LMS assignment page becomes a deadline; students tick,
 * add and remove deadlines from the page and through the chat.
 */

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "ada.okafor@miva.edu.ng",
  password: process.env.E2E_STUDENT_PASSWORD ?? "AsklyStudent2026!",
};
const COURSE = process.env.E2E_STUDENT_COURSE ?? "COS101";
const CHAT_MODEL = (process.env.E2E_CHAT_MODEL ?? "openai/gpt-4.1-mini").split(
  "/",
);
const DAY = 24 * 60 * 60 * 1000;
const LAGOS_OFFSET = 60 * 60 * 1000;

type Deadline = {
  key: string;
  kind: string;
  title: string;
  dueAt: string;
  done: boolean;
};

/** Moodle's rendered date for `daysAhead` days from now at 5:00 PM Lagos. */
function moodleDate(daysAhead: number) {
  const lagos = new Date(Date.now() + daysAhead * DAY + LAGOS_OFFSET);
  const [y, m, d] = [
    lagos.getUTCFullYear(),
    lagos.getUTCMonth(),
    lagos.getUTCDate(),
  ];
  const month = new Date(Date.UTC(y, m, 1)).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  return {
    text: `Due: ${d} ${month} ${y}, 5:00 PM`,
    iso: new Date(Date.UTC(y, m, d, 17, 0) - LAGOS_OFFSET).toISOString(),
  };
}

async function listDeadlines(request: APIRequestContext, includeDone = false) {
  const res = await request.get(
    `/api/student/deadlines${includeDone ? "?includeDone=true" : ""}`,
  );
  expect(res.status()).toBe(200);
  return (await res.json()).deadlines as Deadline[];
}

async function chat(request: APIRequestContext, text: string) {
  const id = crypto.randomUUID();
  const res = await request.post("/api/chat", {
    timeout: 180_000,
    data: {
      id,
      chatModel: { provider: CHAT_MODEL[0], model: CHAT_MODEL[1] },
      message: { id: `m-${id}`, role: "user", parts: [{ type: "text", text }] },
      toolChoice: "auto",
    },
  });
  expect(res.status()).toBe(200);
  const stream = await res.text();
  return {
    tools: [...stream.matchAll(/"toolName":"([^"]+)"/g)].map((m) => m[1]),
  };
}

test.describe
  .serial("Deadlines and captures", () => {
    test.describe.configure({ timeout: 180_000 });
    let page: Page;
    const stamp = Date.now();
    const title = `E2E assignment ${stamp}`;
    const sourceUrl = `https://lms.miva.university/mod/assign/view.php?id=${stamp}`;
    let materialId: string;
    const created: string[] = [];

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await page.goto("/sign-in");
      await page.getByRole("textbox", { name: "Email" }).fill(STUDENT.email);
      await page
        .getByRole("textbox", { name: "Password" })
        .fill(STUDENT.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(
        (url) =>
          !url.pathname.startsWith("/sign-in") &&
          !url.pathname.startsWith("/post-sign-in"),
        { timeout: 90_000 },
      );
    });

    test.afterAll(async () => {
      for (const key of created) {
        await page.request.delete(
          `/api/student/deadlines?key=${encodeURIComponent(key)}`,
        );
      }
      if (materialId) {
        await page.request.delete(
          `/api/student/captures/${encodeURIComponent(`material:${materialId}`)}`,
        );
      }
      await page.close();
    });

    test("a captured assignment's due date becomes a deadline", async () => {
      const due = moodleDate(5);
      const res = await page.request.post("/api/ingest/lesson", {
        data: {
          source_url: sourceUrl,
          course_code: COURSE,
          lesson_title: title,
          content_type: "assignment_external",
          assignment_instructions:
            "Write 500 words on the history of computing.",
          assignment_metadata: { due_date: due.text },
        },
      });
      expect(res.status(), await res.text()).toBeLessThan(300);
      materialId = (await res.json()).material_id;

      const item = (await listDeadlines(page.request)).find(
        (d) => d.key === `lms:${materialId}`,
      );
      expect(item, "deadline listed").toBeTruthy();
      expect(item!.dueAt).toBe(due.iso);
      expect(item!.title).toBe(title);
    });

    test("capturing the page again picks up an extended due date", async () => {
      const due = moodleDate(9);
      const res = await page.request.post("/api/ingest/lesson", {
        data: {
          source_url: sourceUrl,
          course_code: COURSE,
          lesson_title: title,
          content_type: "assignment_external",
          assignment_instructions:
            "Write 500 words on the history of computing.",
          assignment_metadata: { due_date: due.text },
        },
      });
      expect(res.status()).toBe(200);
      expect((await res.json()).updated).toBe(true);
      const item = (await listDeadlines(page.request)).find(
        (d) => d.key === `lms:${materialId}`,
      );
      expect(item!.dueAt).toBe(due.iso);
    });

    test("ticking a captured deadline moves it to done", async () => {
      const key = `lms:${materialId}`;
      const tick = await page.request.patch("/api/student/deadlines", {
        data: { key, done: true },
      });
      expect(tick.status()).toBe(200);
      expect(
        (await listDeadlines(page.request)).some((d) => d.key === key),
      ).toBe(false);
      const done = (await listDeadlines(page.request, true)).find(
        (d) => d.key === key,
      );
      expect(done?.done).toBe(true);
      await page.request.patch("/api/student/deadlines", {
        data: { key, done: false },
      });
    });

    test("lecturer assignments and unknown keys can't be ticked", async () => {
      const lecturer = await page.request.patch("/api/student/deadlines", {
        data: { key: `assignment:${crypto.randomUUID()}`, done: true },
      });
      expect(lecturer.status()).toBe(400);
      const unknown = await page.request.patch("/api/student/deadlines", {
        data: { key: `lms:${crypto.randomUUID()}`, done: true },
      });
      expect(unknown.status()).toBe(404);
    });

    test("students add and remove their own deadlines", async () => {
      const notEnrolled = await page.request.post("/api/student/deadlines", {
        data: {
          title: "Not my course",
          dueAt: new Date(Date.now() + DAY).toISOString(),
          courseId: crypto.randomUUID(),
        },
      });
      expect(notEnrolled.status()).toBe(400);

      const add = await page.request.post("/api/student/deadlines", {
        data: {
          title: `E2E own deadline ${stamp}`,
          dueAt: new Date(Date.now() + 2 * DAY).toISOString(),
        },
      });
      expect(add.status()).toBe(201);
      const { deadline } = await add.json();
      expect(deadline.key).toMatch(/^personal:/);

      const del = await page.request.delete(
        `/api/student/deadlines?key=${encodeURIComponent(deadline.key)}`,
      );
      expect(del.status()).toBe(200);
      const again = await page.request.delete(
        `/api/student/deadlines?key=${encodeURIComponent(deadline.key)}`,
      );
      expect(again.status()).toBe(404);
    });

    test("deadline APIs need a signed-in student", async ({ request }) => {
      expect((await request.get("/api/student/deadlines")).status()).toBe(401);
      expect((await request.get("/api/student/captures")).status()).toBe(401);
    });

    test("the chat saves a deadline the student mentions", async () => {
      test.setTimeout(200_000);
      const { tools } = await chat(
        page.request,
        `My ${COURSE} group presentation is due next Wednesday at 3pm. Please add it to my deadlines.`,
      );
      expect(tools).toContain("manage-deadlines");
      const saved = (await listDeadlines(page.request)).find(
        (d) => d.kind === "personal" && /presentation/i.test(d.title),
      );
      expect(saved, "chat-created deadline").toBeTruthy();
      created.push(saved!.key);
      // Wednesday, 3:00 PM in Lagos
      const lagos = new Date(new Date(saved!.dueAt).getTime() + LAGOS_OFFSET);
      expect(lagos.getUTCDay()).toBe(3);
      expect(lagos.getUTCHours()).toBe(15);
    });

    test("the chat answers what's due from the deadline list", async () => {
      test.setTimeout(200_000);
      const { tools } = await chat(
        page.request,
        "What's due in the next two weeks?",
      );
      expect(tools).toContain("get-upcoming-assignments");
    });

    test("the deadlines page shows them", async () => {
      await page.goto("/student/deadlines");
      await expect(
        page.getByRole("heading", { name: "Deadlines" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(title)).toBeVisible();
    });

    test("captures are listed and can be removed", async () => {
      const res = await page.request.get("/api/student/captures");
      expect(res.status()).toBe(200);
      const { captures } = await res.json();
      const capture = captures.find(
        (c: { key: string }) => c.key === `material:${materialId}`,
      );
      expect(capture, "capture listed").toBeTruthy();
      expect(["ready", "processing"]).toContain(capture.state);

      const del = await page.request.delete(
        `/api/student/captures/${encodeURIComponent(`material:${materialId}`)}`,
      );
      expect(del.status()).toBe(200);
      expect(
        (await listDeadlines(page.request)).some(
          (d) => d.key === `lms:${materialId}`,
        ),
      ).toBe(false);
      materialId = "";
    });

    test("a failed capture shows why and can be retried, then removed", async () => {
      test.setTimeout(150_000);
      // On the allowlisted LMS host, but the file doesn't exist
      const res = await page.request.post("/api/ingest/lesson", {
        data: {
          source_url: `https://lms.miva.university/mod/resource/view.php?id=${stamp}`,
          course_code: COURSE,
          lesson_title: `E2E missing PDF ${stamp}`,
          content_type: "pdf",
          pdf_url: `https://lms-assets.miva.university/e2e/missing-${stamp}.pdf`,
          pdf_filename: `missing-${stamp}.pdf`,
        },
      });
      expect(res.status(), await res.text()).toBeLessThan(300);

      const findCapture = async () => {
        const { captures } = await (
          await page.request.get("/api/student/captures")
        ).json();
        return captures.find(
          (c: { title: string }) => c.title === `E2E missing PDF ${stamp}`,
        ) as { key: string; state: string; error: string | null } | undefined;
      };
      await expect
        .poll(async () => (await findCapture())?.state, { timeout: 60_000 })
        .toBe("failed");
      const failed = (await findCapture())!;
      expect(failed.error).toBeTruthy();

      const retry = await page.request.post(
        `/api/student/captures/${encodeURIComponent(failed.key)}/retry`,
      );
      expect(retry.status()).toBe(202);
      await expect
        .poll(async () => (await findCapture())?.state, { timeout: 60_000 })
        .toBe("failed");

      const notFailed = await page.request.post(
        `/api/student/captures/${encodeURIComponent(`job:${crypto.randomUUID()}`)}/retry`,
      );
      expect(notFailed.status()).toBe(404);

      const del = await page.request.delete(
        `/api/student/captures/${encodeURIComponent(failed.key)}`,
      );
      expect(del.status()).toBe(200);
      expect(await findCapture()).toBeUndefined();
    });
  });
