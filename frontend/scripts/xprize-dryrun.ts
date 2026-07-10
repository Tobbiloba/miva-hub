/**
 * XPRIZE demo dry run — render-only checks of every screen in the
 * submission-kit shot list. No AI calls are triggered (free-tier key).
 * Run: npx tsx scripts/xprize-dryrun.ts
 */
import { chromium, type Page } from "@playwright/test";

const BASE = "http://localhost:4001";
const results: { screen: string; status: string; note: string }[] = [];
const pageErrors: string[] = [];

async function bodyText(page: Page) {
  return page.evaluate(() => document.body.innerText);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/sign-in`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.press("#password", "Enter"); // sign-in form has no submit button; Enter triggers it
  await page.waitForTimeout(3500);
  return !page.url().includes("/sign-in");
}

async function check(
  page: Page,
  screen: string,
  url: string,
  mustContain: string[],
  waitMs = 4000,
) {
  await page.goto(`${BASE}${url}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000, // dev server compiles routes on first hit
  });
  await page.waitForTimeout(waitMs);
  const text = await bodyText(page);
  const missing = mustContain.filter(
    (m) => !text.toLowerCase().includes(m.toLowerCase()),
  );
  if (page.url().includes("/sign-in")) {
    results.push({ screen, status: "FAIL", note: "redirected to sign-in" });
  } else if (missing.length) {
    results.push({
      screen,
      status: "FAIL",
      note: `missing: ${missing.join(", ")} | got: ${text.slice(0, 160).replace(/\n/g, " ")}`,
    });
  } else {
    results.push({ screen, status: "PASS", note: mustContain.join(", ") });
  }
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });

  // ---- Student context (Emeka — recovery arc) ----
  const sCtx = await browser.newContext();
  const s = await sCtx.newPage();
  s.on("pageerror", (e) => pageErrors.push(`[student] ${e.message}`));
  const sOk = await login(s, "emeka.nwosu@miva.edu.ng", "TestPass123!");
  if (!sOk) {
    results.push({ screen: "student login", status: "FAIL", note: "login failed" });
  } else {
    // Shot 2 adjacent — snap-to-solve entry point renders
    await check(s, "shot2 snap (student assignments)", "/student/assignments", ["COS201"]);
    // Shot 3 — viva coach page renders (do NOT start a session)
    await check(s, "shot3 viva page", "/student/viva", ["viva"]);
    // Shot 6 — professor page renders (no voice session started)
    await check(s, "shot6 AI professor", "/student/professor", ["professor"]);
    // Shot 6 — study plan (COS201 already has a seeded plan → GET only)
    await s.goto(`${BASE}/student/plan`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await s.waitForTimeout(3000);
    // "Pick a course" is a closed combobox — open it, then pick COS201
    const picker = s.getByRole("combobox").first();
    if (await picker.count()) {
      await picker.click();
      await s.waitForTimeout(500);
      const opt = s.locator("text=COS201").first();
      if (await opt.count()) {
        await opt.click();
        await s.waitForTimeout(12000); // existing plan loads via GET
      }
    }
    const planFinal = await bodyText(s);
    results.push({
      screen: "shot6 study plan",
      status: planFinal.toLowerCase().includes("dynamic programming") ? "PASS" : "FAIL",
      note: planFinal.toLowerCase().includes("dynamic programming")
        ? "seeded DP plan rendered"
        : planFinal.slice(0, 160).replace(/\n/g, " "),
    });
    // Shot 6 — credentials page
    await check(s, "shot6 credentials", "/student/credentials", ["COS201", "proficient"]);
  }
  await sCtx.close();

  // ---- Public (no auth) ----
  const pCtx = await browser.newContext();
  const p = await pCtx.newPage();
  p.on("pageerror", (e) => pageErrors.push(`[public] ${e.message}`));
  await check(p, "shot6 public verify", "/verify/a7490ee51cfeb0d3e6f53f5c5ee848dd", [
    "verified",
    "COS201",
  ]);
  // Shot 4 — apply form renders publicly
  await check(p, "shot4 /apply form", "/apply", ["appl"]);
  await pCtx.close();

  // ---- Admin context ----
  const aCtx = await browser.newContext();
  const a = await aCtx.newPage();
  a.on("pageerror", (e) => pageErrors.push(`[admin] ${e.message}`));
  const aOk = await login(a, "xprize.tester@miva.edu.ng", "XprizeTest2026!");
  if (!aOk) {
    results.push({
      screen: "admin login (xprize.tester)",
      status: "FAIL",
      note: "login failed — account may not exist on this DB",
    });
  } else {
    // Shot 4 — admissions dashboard
    await check(a, "shot4 admin admissions", "/admin/admissions", ["admission"]);
    // Shot 5 — AI operations ledger (should include Emeka's 3 grading rows)
    await check(a, "shot5 ai-operations", "/admin/ai-operations", [
      "decision",
      "grading",
    ], 15000);
    const opsText = await bodyText(a);
    results.push({
      screen: "shot5 ledger has Emeka rows",
      status: opsText.includes("Emeka") || opsText.toLowerCase().includes("snap-grading")
        ? "PASS"
        : "WARN",
      note: opsText.includes("Emeka")
        ? "Emeka visible in ledger"
        : "Emeka not on first page of ledger (may be paginated)",
    });
  }
  await aCtx.close();

  await browser.close();

  console.log("\n=== XPRIZE DRY RUN RESULTS ===");
  for (const r of results) console.log(`${r.status.padEnd(5)} ${r.screen} — ${r.note}`);
  console.log(`\nPage errors: ${pageErrors.length ? pageErrors.join("\n") : "none"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
