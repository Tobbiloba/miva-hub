import { test, expect } from "@playwright/test";

/**
 * Phase 1C: API Route Tests
 * Hit each route, assert status + response shape.
 * Uses Playwright's request fixture (no browser needed).
 */

test.describe("Phase 1C: API Routes", () => {
  // ── Public routes (no auth) ──────────────────────────────────────────────

  test("GET /api/programs/public → 200, array with ≥1 program", async ({
    request,
  }) => {
    const res = await request.get("/api/programs/public");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0]).toHaveProperty("id");
    expect(data[0]).toHaveProperty("name");
    expect(data[0]).toHaveProperty("code");
  });

  test("GET /api/academic/session/current → 200, session + semester mapping", async ({
    request,
  }) => {
    const res = await request.get("/api/academic/session/current");
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("sessionName");
    expect(data).toHaveProperty("currentSemester");
    expect(data).toHaveProperty("academicYear");
    expect(data).toHaveProperty("enrollmentSemester");
    expect(["first", "second"]).toContain(data.currentSemester);
  });

  // ── Auth-required routes (should 401 without session) ────────────────────

  test("GET /api/admin/users → redirects or 401 without session", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/users", {
      maxRedirects: 0,
    });
    // Middleware redirects to /sign-in (302) or route returns 401
    expect([302, 307, 401]).toContain(res.status());
  });

  // ── POST /api/auth/register validation ───────────────────────────────────

  test("POST /api/auth/register → 400 on missing fields", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "incomplete@test.com" },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/auth/register → 400 on malformed matric", async ({
    request,
  }) => {
    const res = await request.post("/api/auth/register", {
      data: {
        name: "Test",
        email: `pwtest-matric-${Date.now()}@example.com`,
        password: "Test1234!",
        programId: "66d8efe2-29b7-4db2-80b3-f1aaa687865a",
        level: 200,
        matricNumber: "BADFORMAT",
      },
    });
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("matric");
  });
});
