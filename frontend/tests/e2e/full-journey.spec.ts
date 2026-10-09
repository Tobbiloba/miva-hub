import {
  type APIRequestContext,
  type Page,
  expect,
  test,
} from "@playwright/test";

/**
 * Full end-to-end journeys per persona against a running local stack
 * (frontend :4001 + MCP :8080, local DB). Accounts come from env so they can
 * point at any seeded environment; defaults are the local test accounts.
 *
 * Chat tests call a real model (E2E_CHAT_MODEL, default openai/gpt-4.1-mini)
 * and assert on tool usage + grounded content, so they need an API key and
 * indexed course materials for the student's courses.
 */

const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "ada.okafor@miva.edu.ng",
  password: process.env.E2E_STUDENT_PASSWORD ?? "AsklyStudent2026!",
};
const FACULTY = {
  email: process.env.E2E_FACULTY_EMAIL ?? "adebayo.olumide@miva.edu.ng",
  password: process.env.E2E_FACULTY_PASSWORD ?? "AsklyFaculty2026!",
};
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "xprize.tester@miva.edu.ng",
  password: process.env.E2E_ADMIN_PASSWORD ?? "XprizeTest2026!",
};
const CHAT_MODEL = (process.env.E2E_CHAT_MODEL ?? "openai/gpt-4.1-mini").split(
  "/",
);

const ERROR_MARKERS = [
  "Application error",
  "Internal Server Error",
  "Unhandled Runtime Error",
  "This page could not be found",
];

async function uiSignIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email" }).fill(who.email);
  await page.getByRole("textbox", { name: "Password" }).fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Sign-in → /post-sign-in → the persona's home
  await page.waitForURL(
    (url) =>
      !url.pathname.startsWith("/sign-in") &&
      !url.pathname.startsWith("/post-sign-in"),
    { timeout: 90_000 },
  );
}

/** Load a page as the signed-in user and assert it rendered cleanly. */
async function expectPageRenders(page: Page, path: string) {
  const pageErrors: string[] = [];
  const onError = (e: Error) => pageErrors.push(e.message);
  page.on("pageerror", onError);
  const res = await page.goto(path, { timeout: 120_000 });
  await page.waitForLoadState("domcontentloaded");
  page.off("pageerror", onError);

  expect(res?.status() ?? 0, `${path} HTTP status`).toBeLessThan(400);
  expect(new URL(page.url()).pathname, `${path} redirected away`).not.toMatch(
    /^\/(sign-in|unauthorized|billing)/,
  );
  const body = await page.locator("body").innerText();
  for (const marker of ERROR_MARKERS) {
    expect(body, `${path} shows "${marker}"`).not.toContain(marker);
  }
  expect(pageErrors, `${path} client errors`).toEqual([]);
}

/** Send one chat turn through the real API with the browser's session. */
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
  const tools = [...stream.matchAll(/"toolName":"([^"]+)"/g)].map((m) => m[1]);
  const answer = [...stream.matchAll(/"delta":"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => JSON.parse(`"${m[1]}"`))
    .join("");
  return { tools, answer, stream };
}

// ───────────────────────────── Student ─────────────────────────────

test.describe
  .serial("Student journey", () => {
    // Sign-in + first compile of each page can exceed the 30s default
    test.describe.configure({ timeout: 180_000 });
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await uiSignIn(page, STUDENT);
    });
    test.afterAll(() => page.close());

    test("lands on the chat home after sign-in", async () => {
      await expect(page.locator('[contenteditable="true"]')).toBeVisible({
        timeout: 60_000,
      });
    });

    // The student launch surface (lib/config/product.ts, CHAT_FIRST on)
    for (const path of [
      "/",
      "/student/courses",
      "/student/courses/browse",
      "/student/assignments",
      "/student/flashcards",
    ]) {
      test(`page renders: ${path}`, async () => {
        test.setTimeout(150_000);
        await expectPageRenders(page, path);
      });
    }

    for (const path of [
      "/student",
      "/student/dashboard",
      "/student/materials",
      "/student/grades",
      "/student/schedule",
      "/student/calendar",
      "/student/announcements",
      "/student/notifications",
      "/student/progress",
      "/student/faculty",
      "/student/credentials",
      "/student/whatsapp",
      "/student/viva",
      "/student/professor",
      "/student/tutor",
      "/student/plan",
      "/agents",
      "/agent/new",
      "/test",
    ]) {
      test(`archived page returns to the chat: ${path}`, async () => {
        test.setTimeout(150_000);
        await page.goto(path, { timeout: 120_000 });
        await page.waitForURL((url) => url.pathname === "/", {
          timeout: 60_000,
        });
      });
    }

    test("archived feature APIs are gone", async () => {
      for (const path of [
        "/api/student/viva/token",
        "/api/student/credentials",
        "/api/student/plan/x",
      ]) {
        const res = await page.request.get(path);
        expect(res.status(), path).toBe(404);
      }
    });

    test("sidebar shows only the study pages", async () => {
      await page.goto("/");
      const sidebar = page.locator('[data-sidebar="sidebar"]').first();
      for (const name of ["My Courses", "Deadlines", "Flashcards"]) {
        await expect(sidebar.getByRole("link", { name })).toBeVisible();
      }
      await expect(sidebar.getByTestId("agents-link")).toHaveCount(0);
    });

    test("study pages keep the chat sidebar", async () => {
      await page.goto("/student/flashcards");
      await expect(
        page
          .locator('[data-sidebar="sidebar"]')
          .first()
          .getByRole("link", { name: "My Courses" }),
      ).toBeVisible({ timeout: 60_000 });
    });

    test("model picker only offers allowed models", async () => {
      const res = await page.request.get("/api/chat/models");
      const providers = (await res.json()) as {
        provider: string;
        models: { name: string }[];
      }[];
      const offered = providers.flatMap((p) =>
        p.models.map((m) => `${p.provider}/${m.name}`),
      );
      expect(offered).not.toContain("openai/gpt-4.1");
      expect(offered).toContain(CHAT_MODEL.join("/"));
    });

    test("enroll in and drop a course", async () => {
      const browse = await page.request.get("/api/courses/available");
      expect(browse.status()).toBe(200);
      const { courses } = (await browse.json()) as {
        courses: { id: string; code: string }[];
      };
      // Pick a course the student isn't already in: try until enroll succeeds
      let picked: string | undefined;
      for (const c of courses) {
        const res = await page.request.post("/api/student/enroll", {
          data: { courseId: c.id },
        });
        if (res.status() === 200 || res.status() === 201) {
          picked = c.id;
          break;
        }
      }
      expect(picked, "found a course to enroll in").toBeTruthy();
      const drop = await page.request.delete(
        `/api/student/enroll?courseId=${picked}`,
      );
      expect(drop.status()).toBe(200);
    });

    test("chat lists the student's own courses", async () => {
      test.setTimeout(200_000);
      const { tools, answer } = await chat(
        page.request,
        "What courses am I enrolled in this semester?",
      );
      expect(tools.join(",")).toMatch(/get-my-courses|list_enrolled_courses/);
      expect(answer).toContain("COS101");
    });

    test("chat answers from course materials with citations", async () => {
      test.setTimeout(200_000);
      const { tools, answer } = await chat(
        page.request,
        "What do my notes say about the generations of computing?",
      );
      expect(tools).toContain("search-course-materials");
      expect(answer).toMatch(/\[S\d/);
      expect(answer.toLowerCase()).toContain("vacuum");
    });

    test("chat refuses a course the student isn't enrolled in", async () => {
      test.setTimeout(200_000);
      const { answer } = await chat(
        page.request,
        "Show me the materials for COS201.",
      );
      expect(answer.toLowerCase()).toMatch(
        /not enrolled|aren't enrolled|not currently enrolled/,
      );
    });

    test("admin and faculty areas are closed to students", async () => {
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/unauthorized/, { timeout: 90_000 });
      const body = await page.locator("body").innerText();
      expect(body).not.toContain("Total Students");
      expect((await page.request.get("/api/admin/users")).status()).toBe(403);
      expect((await page.request.get("/api/faculty/courses")).status()).toBe(
        403,
      );
    });

    test("extension token: mint, use, revoke", async ({ request }) => {
      const mint = await request.post("/api/extension/token", {
        data: { ...STUDENT, label: "e2e" },
      });
      expect(mint.status()).toBe(200);
      const { token } = await mint.json();
      const auth = { Authorization: `Bearer ${token}` };
      const revoke = await request.delete("/api/extension/token", {
        headers: auth,
      });
      expect(revoke.status()).toBe(200);
      const after = await request.post("/api/ingest/upload-url", {
        headers: auth,
        data: {},
      });
      expect(after.status()).toBe(401);
    });
  });

// ───────────────────────────── Faculty ─────────────────────────────

test.describe
  .serial("Faculty journey", () => {
    // Sign-in + first compile of each page can exceed the 30s default
    test.describe.configure({ timeout: 180_000 });
    let page: Page;
    let ownCourseId: string;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await uiSignIn(page, FACULTY);
    });
    test.afterAll(() => page.close());

    test("lands on the faculty portal", async () => {
      expect(new URL(page.url()).pathname).toMatch(/^\/faculty/);
    });

    for (const path of [
      "/faculty",
      "/faculty/courses",
      "/faculty/assignments",
      "/faculty/students",
      "/faculty/announcements",
      "/faculty/materials",
      "/faculty/grades",
      "/faculty/schedule",
      "/faculty/review-queue",
      "/faculty/lecture-studio",
    ]) {
      test(`page renders: ${path}`, async () => {
        test.setTimeout(150_000);
        await expectPageRenders(page, path);
      });
    }

    test("own course opens with the current term and its students", async () => {
      test.setTimeout(150_000);
      const res = await page.request.get("/api/faculty/courses");
      expect(res.status()).toBe(200);
      const { data } = await res.json();
      expect(data.length).toBeGreaterThan(0);
      ownCourseId = data[0].courseId ?? data[0].course?.id ?? data[0].id;
      expect(ownCourseId).toBeTruthy();

      await page.goto(`/faculty/courses/${ownCourseId}`, { timeout: 120_000 });
      // The page streams in; wait for the term badge rather than reading early
      await expect(page.locator("body")).toContainText(
        /(First|Second) Semester \d{4}\/\d{4}/,
        { timeout: 90_000 },
      );
      await expect(page.locator("body")).not.toContainText("Access denied");

      const roster = await page.request.get(
        `/api/faculty/students?courseId=${ownCourseId}`,
      );
      expect(roster.status()).toBe(200);
    });

    test("a course they don't teach is denied", async () => {
      test.setTimeout(150_000);
      const catalogue = await page.request.get("/api/courses/available");
      const { courses } = (await catalogue.json()) as {
        courses: { id: string }[];
      };
      const foreign = courses.find((c) => c.id !== ownCourseId);
      expect(foreign).toBeTruthy();
      const mine = (
        await (await page.request.get("/api/faculty/courses")).json()
      ).data as any[];
      const mineIds = new Set(
        mine.map((d) => d.courseId ?? d.course?.id ?? d.id),
      );
      const notMine = courses.find((c) => !mineIds.has(c.id));
      test.skip(!notMine, "faculty teaches every course");
      await page.goto(`/faculty/courses/${notMine!.id}`, { timeout: 120_000 });
      await expect(page.locator("body")).toContainText("Access denied", {
        timeout: 90_000,
      });
    });

    test("create and delete a draft assignment", async () => {
      const due = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const create = await page.request.post("/api/faculty/assignments", {
        data: {
          title: "E2E draft assignment",
          courseId: ownCourseId,
          totalPoints: 10,
          dueDate: due,
          isPublished: false,
        },
      });
      expect(create.status()).toBe(201);
      const { data } = await create.json();
      const del = await page.request.delete(
        `/api/faculty/assignments/${data.id}`,
      );
      expect(del.status()).toBeLessThan(300);
    });

    test("an expired/forged session gets 401 JSON, not a 500", async ({
      request,
    }) => {
      const res = await request.get("/api/faculty/courses", {
        headers: { Cookie: "better-auth.session_token=forged.value" },
      });
      expect(res.status()).toBe(401);
    });
  });

// ────────────────────────────── Admin ──────────────────────────────

test.describe
  .serial("Admin journey", () => {
    // Sign-in + first compile of each page can exceed the 30s default
    test.describe.configure({ timeout: 180_000 });
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      await uiSignIn(page, ADMIN);
    });
    test.afterAll(() => page.close());

    test("lands on the admin dashboard with tenant stats", async () => {
      expect(new URL(page.url()).pathname).toMatch(/^\/admin/);
      await expect(page.locator("body")).toContainText("Total Students", {
        timeout: 60_000,
      });
    });

    for (const path of [
      "/admin",
      "/admin/students",
      "/admin/faculty",
      "/admin/users",
      "/admin/courses",
      "/admin/departments",
      "/admin/programs",
      "/admin/academic",
      "/admin/schedule",
      "/admin/content",
      "/admin/content/moderation",
      "/admin/admissions",
      "/admin/announcements",
      "/admin/calendar",
      "/admin/analytics",
      "/admin/ai-operations",
      "/admin/reports",
      "/admin/billing",
      "/admin/settings",
    ]) {
      test(`page renders: ${path}`, async () => {
        test.setTimeout(150_000);
        await expectPageRenders(page, path);
      });
    }

    test("faculty list includes the university's faculty", async () => {
      const res = await page.request.get("/api/admin/faculty");
      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.total).toBeGreaterThan(0);
    });

    test("create, update and delete a student", async () => {
      const suffix = Date.now().toString(36);
      const create = await page.request.post("/api/admin/students", {
        data: {
          name: "E2E Student",
          email: `e2e.${suffix}@miva.edu.ng`,
          studentId: `E2E${suffix}`.slice(0, 20),
          academicYear: "100",
          enrollmentStatus: "active",
        },
      });
      expect(create.status(), await create.text()).toBeLessThan(300);
      const created = await create.json();
      const id = created.data?.id ?? created.data?.user?.id ?? created.user?.id;
      expect(id).toBeTruthy();

      const update = await page.request.put(`/api/admin/users/${id}`, {
        data: { name: "E2E Student Renamed" },
      });
      expect(update.status()).toBe(200);
      expect(await update.text()).not.toContain('"password"');

      const offDomain = await page.request.put(`/api/admin/users/${id}`, {
        data: { email: "someone@gmail.com" },
      });
      expect(offDomain.status()).toBe(400);

      const del = await page.request.delete(`/api/admin/students/${id}`);
      expect(del.status()).toBeLessThan(300);
    });

    test("peer admins can't be edited", async () => {
      const res = await page.request.get("/api/admin/users?role=admin");
      const json = await res.json();
      const list = (json.data?.users ?? json.data ?? json.users ?? []) as {
        id: string;
        email: string;
        role: string;
      }[];
      const peer = list.find(
        (u) => u.role === "admin" && u.email !== ADMIN.email,
      );
      test.skip(!peer, "no peer admin in this tenant");
      const put = await page.request.put(`/api/admin/users/${peer!.id}`, {
        data: {},
      });
      expect(put.status()).toBe(403);
    });
  });
