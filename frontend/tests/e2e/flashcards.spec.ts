import { type Page, expect, test } from "@playwright/test";

/**
 * Chat flashcards → spaced-repetition decks, against a running local stack.
 * The chat test drives the real UI: the flashcards the model makes are saved
 * with the Save deck button under them.
 */

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "ada.okafor@miva.edu.ng",
  password: process.env.E2E_STUDENT_PASSWORD ?? "AsklyStudent2026!",
};
const COURSE = process.env.E2E_STUDENT_COURSE ?? "COS101";
const CHAT_MODEL = (process.env.E2E_CHAT_MODEL ?? "openai/gpt-4.1-mini").split(
  "/",
);

type Deck = { id: string; title: string; courseCode: string | null };

test.describe
  .serial("Flashcard decks from chat", () => {
    test.describe.configure({ timeout: 180_000 });
    let page: Page;
    const stamp = Date.now();
    const decks: string[] = [];

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
      for (const id of decks) {
        await page.request.delete(`/api/flashcards/decks/${id}`);
      }
      await page.close();
    });

    const listDecks = async () =>
      (await (await page.request.get("/api/flashcards/decks")).json())
        .data as Deck[];

    test("saving is idempotent and keeps the course only if enrolled", async () => {
      const cards = [
        { front: "What is RAM?", back: "Volatile working memory" },
        { front: "What is ROM?", back: "Read-only, non-volatile memory" },
      ];
      const save = (chatSource: string, courseCode: string) =>
        page.request.post("/api/flashcards/decks", {
          data: { title: `E2E deck ${stamp}`, courseCode, chatSource, cards },
        });

      const first = await save(`e2e:${stamp}:a`, COURSE);
      expect(first.status()).toBe(201);
      const { deckId } = await first.json();
      decks.push(deckId);

      const again = await save(`e2e:${stamp}:a`, COURSE);
      expect(again.status()).toBe(200);
      expect(await again.json()).toMatchObject({ deckId, alreadySaved: true });

      const other = await save(`e2e:${stamp}:b`, "ZZZ999");
      expect(other.status()).toBe(201);
      const otherId = (await other.json()).deckId;
      decks.push(otherId);

      const all = await listDecks();
      expect(all.find((d) => d.id === deckId)?.courseCode).toBe(COURSE);
      expect(all.find((d) => d.id === otherId)?.courseCode).toBeNull();

      const detail = await (
        await page.request.get(`/api/flashcards/decks/${otherId}`)
      ).json();
      expect(detail.data.cards).toHaveLength(2);
    });

    test("decks can be deleted only by their owner", async ({ request }) => {
      const anon = await request.delete(`/api/flashcards/decks/${decks[1]}`);
      expect(anon.status()).toBe(401);
      const del = await page.request.delete(`/api/flashcards/decks/${decks[1]}`);
      expect(del.status()).toBe(200);
      const again = await page.request.delete(
        `/api/flashcards/decks/${decks[1]}`,
      );
      expect(again.status()).toBe(404);
      expect(
        (await page.request.delete("/api/flashcards/decks/not-a-uuid")).status(),
      ).toBe(404);
      decks.pop();
    });

    test("flashcards made in chat are saved from the chat UI", async () => {
      test.setTimeout(240_000);
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
                text: `Make me 3 flashcards on the generations of computing from my ${COURSE} notes. Use the flashcards tool.`,
              },
            ],
          },
          toolChoice: "auto",
        },
      });
      expect(res.status()).toBe(200);
      expect(await res.text()).toContain('"toolName":"createFlashcards"');

      await page.goto(`/chat/${threadId}`);
      const save = page.getByRole("button", { name: "Save deck" });
      await expect(save).toBeVisible({ timeout: 90_000 });
      const before = (await listDecks()).length;
      await save.click();
      const review = page.getByRole("link", { name: /Saved · Review/ });
      await expect(review).toBeVisible({ timeout: 30_000 });

      const after = await listDecks();
      expect(after.length).toBe(before + 1);
      const href = await review.getAttribute("href");
      const deckId = href!.split("/").pop()!;
      decks.push(deckId);
      const detail = await (
        await page.request.get(`/api/flashcards/decks/${deckId}`)
      ).json();
      expect(detail.data.cards.length).toBeGreaterThanOrEqual(3);

      // The review page opens the saved deck
      await review.click();
      await expect(page).toHaveURL(new RegExp(`/student/flashcards/${deckId}`), {
        timeout: 60_000,
      });
    });
  });
