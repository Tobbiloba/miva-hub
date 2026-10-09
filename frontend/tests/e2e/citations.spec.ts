import { type Page, expect, test } from "@playwright/test";

/**
 * Grounded answers link their [S#] citations to the cited course material,
 * against a running local stack with indexed materials for the student.
 */

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "ada.okafor@miva.edu.ng",
  password: process.env.E2E_STUDENT_PASSWORD ?? "AsklyStudent2026!",
};
const CHAT_MODEL = (process.env.E2E_CHAT_MODEL ?? "openai/gpt-4.1-mini").split(
  "/",
);

test.describe
  .serial("Citations", () => {
    test.describe.configure({ timeout: 240_000 });
    let page: Page;

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
    test.afterAll(() => page.close());

    test("[S#] in an answer links to the cited material", async () => {
      const threadId = crypto.randomUUID();
      const res = await page.request.post("/api/chat", {
        timeout: 180_000,
        data: {
          id: threadId,
          chatModel: { provider: CHAT_MODEL[0], model: CHAT_MODEL[1] },
          message: {
            id: `m-${threadId}`,
            role: "user",
            parts: [
              {
                type: "text",
                text: "What do my notes say about the generations of computing?",
              },
            ],
          },
          toolChoice: "auto",
        },
      });
      expect(res.status()).toBe(200);
      expect(await res.text()).toMatch(/\[S\d/);

      await page.goto(`/chat/${threadId}`);
      const chip = page.locator('a[href*="?cite=S"]').first();
      await expect(chip).toBeVisible({ timeout: 90_000 });
      await expect(chip).toHaveText(/^S\d+$/);
      await expect(page.getByText("From your course materials")).toBeVisible();

      // The cited material opens for the student
      const href = (await chip.getAttribute("href"))!;
      const material = await page.request.get(href);
      expect(material.status()).toBeLessThan(400);
      await page.goto(href);
      await expect(page).toHaveURL(/\/student\/lecture-study\//);
      await expect(page.locator("body")).not.toContainText("Application error");
    });

    test("a course with no materials yet gets an honest answer", async () => {
      const code = process.env.E2E_EMPTY_COURSE ?? "CSC404";
      const { courses } = await (
        await page.request.get("/api/courses/available")
      ).json();
      const course = (courses as { id: string; code: string }[]).find(
        (c) => c.code === code,
      );
      test.skip(!course, `${code} isn't available to enroll in`);
      const enroll = await page.request.post("/api/student/enroll", {
        data: { courseId: course!.id },
      });
      expect(enroll.status()).toBeLessThan(300);
      try {
        const id = crypto.randomUUID();
        const res = await page.request.post("/api/chat", {
          timeout: 180_000,
          data: {
            id,
            chatModel: { provider: CHAT_MODEL[0], model: CHAT_MODEL[1] },
            message: {
              id: `m-${id}`,
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `What do my ${code} notes say about consensus algorithms?`,
                },
              ],
            },
            toolChoice: "auto",
          },
        });
        const stream = await res.text();
        expect(stream).toContain('"toolName":"search-course-materials"');
        expect(stream).toContain("coursesWithoutMaterials");
        const answer = [...stream.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)]
          .map((m) => JSON.parse(`"${m[1]}"`))
          .join("");
        expect(answer).toMatch(/captur/i);
        expect(answer).not.toMatch(/\[S\d/);
      } finally {
        await page.request.delete(`/api/student/enroll?courseId=${course!.id}`);
      }
    });
  });
