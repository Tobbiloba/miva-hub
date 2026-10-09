import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from "@playwright/test";

/**
 * The assistant remembers the student (lib/memory): quiz results, deadlines,
 * captures and questions are recorded, shown on the timeline, and used by
 * the chat. Runs against a running local stack.
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
    answer: [...stream.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => JSON.parse(`"${m[1]}"`))
      .join(""),
  };
}

test.describe
  .serial("Assistant memory", () => {
    test.describe.configure({ timeout: 240_000 });
    let page: Page;
    const stamp = Date.now();
    const deadlineTitle = `Lab report on logic gates ${stamp}`;
    let deadlineKey: string;

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
      if (deadlineKey) {
        await page.request.delete(
          `/api/student/deadlines?key=${encodeURIComponent(deadlineKey)}`,
        );
      }
      await page.close();
    });

    test("quiz results are recorded and validated", async ({ request }) => {
      const bad = await page.request.post("/api/student/quiz-results", {
        data: { kind: "quiz", title: "x", totalPoints: 0 },
      });
      expect(bad.status()).toBe(400);
      expect(
        (
          await request.post("/api/student/quiz-results", {
            data: {},
          })
        ).status(),
      ).toBe(401);

      const res = await page.request.post("/api/student/quiz-results", {
        data: {
          kind: "quiz",
          title: `Computer generations ${stamp}`,
          courseCode: COURSE,
          earnedPoints: 2,
          totalPoints: 5,
          correct: 2,
          questionCount: 5,
          missed: [
            "Which component defined the second generation of computers?",
            "What replaced transistors in the third generation?",
          ],
        },
      });
      expect(res.status()).toBe(201);

      const { events } = await (
        await page.request.get("/api/student/activity?days=1")
      ).json();
      const quiz = events.find((e: { text: string }) =>
        e.text.includes(`Computer generations ${stamp}`),
      );
      expect(quiz?.text).toContain("40%");
      expect(quiz?.courseCode).toBe(COURSE);
    });

    test("finishing a deadline is remembered", async () => {
      const add = await page.request.post("/api/student/deadlines", {
        data: {
          title: deadlineTitle,
          dueAt: new Date(Date.now() + 2 * DAY).toISOString(),
        },
      });
      expect(add.status()).toBe(201);
      deadlineKey = (await add.json()).deadline.key;
    });

    test("the chat brings up what's due and weak spots unprompted", async () => {
      const { answer } = await chat(
        page.request,
        "I have a free evening. What should I work on?",
      );
      // From memory: the deadline due in 2 days and/or the missed quiz topic
      expect(answer).toMatch(/logic gates|lab report|transistor|generation/i);
    });

    test("the chat recalls what the student did this week", async () => {
      const { tools, answer } = await chat(
        page.request,
        "What have I done in Askly in the last day?",
      );
      expect(tools).toContain("get-my-activity");
      expect(answer).toMatch(/40%|quiz|computer generations/i);
    });

    test("course questions are remembered", async () => {
      const { tools } = await chat(
        page.request,
        "What do my notes say about vacuum tubes?",
      );
      expect(tools).toContain("search-course-materials");
      await expect
        .poll(
          async () => {
            const { events } = await (
              await page.request.get("/api/student/activity?days=1")
            ).json();
            return events.some(
              (e: { type: string; text: string }) =>
                e.type === "course_question_asked" &&
                /vacuum tubes/i.test(e.text),
            );
          },
          { timeout: 30_000 },
        )
        .toBe(true);

      const tick = await page.request.patch("/api/student/deadlines", {
        data: { key: deadlineKey, done: true },
      });
      expect(tick.status()).toBe(200);
      const { events } = await (
        await page.request.get("/api/student/activity?days=1")
      ).json();
      expect(
        events.some(
          (e: { type: string; text: string }) =>
            e.type === "deadline_completed" && e.text.includes(deadlineTitle),
        ),
      ).toBe(true);
    });

    test("the timeline shows it on My Courses", async () => {
      await page.goto("/student/courses");
      await expect(
        page.getByRole("heading", { name: "Recent activity" }),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByText(`Computer generations ${stamp}`, { exact: false }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/You asked about/).first()).toBeVisible();
    });
  });
