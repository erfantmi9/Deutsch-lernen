import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { shot } from "./helpers";

// Home: one "today" card with a single main button (due review first, then the next path step), the path as a
// timeline, the daily goal only after the first answer, and no hydration shift above the button.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };

/** A user who finished the articles step (best streak 5), was last on /verbs and answered something today. */
async function seedReturning(page: Page, opts: { dueCards: boolean }) {
  await page.addInitScript((due) => {
    localStorage.setItem("deutsch-learner:quiz", JSON.stringify({ state: { autoAdvance: false, score: 5, streak: 0, bestStreak: 5, wrongWordIds: [] }, version: 1 }));
    localStorage.setItem("deutsch-learner:learn", JSON.stringify({ state: { lastVisit: "/verbs", dailyGoal: 40 }, version: 1 }));
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    localStorage.setItem("deutsch-learner:activity", JSON.stringify({ state: { days: { [today]: 3 } }, version: 1 }));
    if (due) {
      const card = (id: string) => ({ id, ease: 2.5, interval: 1, reps: 1, lapses: 0, due: "2024-01-02", added: "2024-01-01", last: "2024-01-01" });
      localStorage.setItem(
        "deutsch-learner:srs",
        JSON.stringify({ state: { cards: { "noun:kopf": card("noun:kopf"), "noun:hand": card("noun:hand") }, log: {}, newPerDay: 10 }, version: 1 }),
      );
    }
  }, opts.dueCards);
}

function homeTests(locale: "en" | "fa") {
  const p = M[locale].Path;

  test(`new user: one button that starts step 1, how it works, no daily goal yet`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}`);
    const cta = page.locator("a[data-hero-cta]");
    await expect(cta).toHaveAttribute("href", `/${locale}/arcade`);
    await expect(cta).toContainText(p.startFirst);
    await expect(page.locator("[data-today-eyebrow]")).toContainText(p.firstStep);
    await expect(page.locator("[data-hero-hint]")).toContainText(p.steps.articles.desc);
    await expect(page.locator("[data-today-why]")).toHaveText(p.steps.articles.why);
    await expect(page.getByRole("list", { name: p.howTitle })).toBeVisible();
    await expect(page.locator("[data-goal]")).toHaveCount(0);
    await expect(page.locator("[data-resume-link]")).toHaveCount(0);
    await expect(page.locator("main a[aria-current='step']")).toHaveAttribute("href", `/${locale}/arcade`);
    await shot(page, testInfo, "home", locale, "1-new");
  });

  test(`greets in German by the local time of day, with a translation`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 10, 10, 8, 30));
    await page.goto(`/${locale}`);
    const row = page.locator("[data-greeting]");
    await expect(row).toHaveAttribute("data-greeting", "morning");
    await expect(row).toContainText("Guten Morgen!");
    await expect(row).toContainText(p.greeting.morning);

    await page.clock.setFixedTime(new Date(2026, 10, 10, 23, 15));
    await page.reload();
    await expect(row).toHaveAttribute("data-greeting", "night");
    await expect(row).toContainText("Noch wach?");
  });

  test(`returning user: next path step, link back to the last section, daily goal`, async ({ page }, testInfo) => {
    await seedReturning(page, { dueCards: false });
    await page.goto(`/${locale}`);
    const cta = page.locator("a[data-hero-cta]");
    await expect(cta).toHaveAttribute("href", `/${locale}/grammar/pronouns`);
    await expect(cta).toContainText(p.startStep);
    await expect(page.locator("#today-title")).toHaveText(p.steps.pronouns.title);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    await expect(page.locator("[data-resume-link]")).toHaveAttribute("href", `/${locale}/verbs`);
    await expect(page.locator("[data-goal]")).toBeVisible();
    await shot(page, testInfo, "home", locale, "2-returning");

    await cta.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/grammar/pronouns$`));
  });

  test(`due cards come first, with a way to skip to the next step`, async ({ page }, testInfo) => {
    await seedReturning(page, { dueCards: true });
    await page.goto(`/${locale}`);
    const cta = page.locator("a[data-hero-cta]");
    await expect(cta).toHaveAttribute("href", `/${locale}/review`);
    await expect(page.locator("#today-title")).toContainText(/[2۲]/);
    await expect(page.locator("[data-skip-link]")).toHaveAttribute("href", `/${locale}/grammar/pronouns`);
    // Only one main button: the resume link is not offered on top of review + skip.
    await expect(page.locator("[data-resume-link]")).toHaveCount(0);
    await shot(page, testInfo, "home", locale, "3-due");
  });

  test(`no hydration shift: the button keeps its box from skeleton to hydrated card, no label swap`, async ({ page }, testInfo) => {
    await seedReturning(page, { dueCards: false });
    // Server HTML (JS disabled): skeletons, never a default label that is later replaced.
    const ctx = await page.context().browser()!.newContext({ javaScriptEnabled: false, viewport: page.viewportSize()!, baseURL: testInfo.project.use.baseURL });
    const ssr = await ctx.newPage();
    await ssr.goto(`/${locale}`);
    await expect(ssr.locator("[data-hero-cta]")).toHaveAttribute("aria-busy", "true");
    await expect(ssr.locator("[data-today]")).toHaveAttribute("aria-busy", "true");
    await expect(ssr.locator("[data-hero-cta]")).not.toContainText(p.startFirst);
    await ctx.close();

    // Real load: sample every frame from first paint until well after hydration, relative to the card's top.
    await page.addInitScript(() => {
      const w = window as unknown as { __samples: { busy: boolean; cta: string; text: string }[] };
      w.__samples = [];
      const tick = () => {
        const cta = document.querySelector("[data-hero-cta]");
        const card = document.querySelector("[data-today]");
        if (cta && card) {
          const a = cta.getBoundingClientRect();
          const b = card.getBoundingClientRect();
          w.__samples.push({
            busy: cta.getAttribute("aria-busy") === "true",
            cta: [a.left - b.left, a.top - b.top, a.width, a.height].map(Math.round).join(","),
            text: [...cta.childNodes].filter((n) => !(n instanceof HTMLElement && n.classList.contains("sr-only"))).map((n) => n.textContent).join("").trim(),
          });
        }
        if (w.__samples.length < 400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(`/${locale}`);
    await expect(page.locator("a[data-hero-cta]")).toBeVisible();
    await page.waitForTimeout(1000);
    const samples = await page.evaluate(() => (window as unknown as { __samples: { busy: boolean; cta: string; text: string }[] }).__samples);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((s) => s.busy)).toBe(true); // the skeleton was painted before hydration
    expect(samples.at(-1)!.busy).toBe(false);
    // Position inside the card never changes; the width may (skeleton vs. label), the height may not.
    const tops = new Set(samples.map((s) => s.cta.split(",")[1]));
    const heights = new Set(samples.map((s) => s.cta.split(",")[3]));
    expect([...tops], "button top").toHaveLength(1);
    expect([...heights], "button height").toHaveLength(1);
    expect([...new Set(samples.map((s) => s.text).filter(Boolean))]).toHaveLength(1);
  });

  test(`goal pills are at least 44px tall`, async ({ page }) => {
    await seedReturning(page, { dueCards: false });
    await page.goto(`/${locale}`);
    const pills = page.getByRole("group", { name: p.goalChoose }).getByRole("button");
    await expect(pills).toHaveCount(3);
    for (const b of await pills.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
}

for (const locale of ["en", "fa"] as const) test.describe(`home (${locale})`, () => homeTests(locale));
