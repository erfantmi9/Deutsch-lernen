import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { shot } from "./helpers";

// Home: hero CTA = next learning-path step, continue + due review above the module cards, no hydration shift.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };

/** A user who finished the articles step (best streak 5), was last on /verbs and has 2 cards due. */
async function seedProgress(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("deutsch-learner:quiz", JSON.stringify({ state: { autoAdvance: false, score: 5, streak: 0, bestStreak: 5, wrongWordIds: [] }, version: 1 }));
    localStorage.setItem("deutsch-learner:learn", JSON.stringify({ state: { lastVisit: "/verbs", dailyGoal: 40 }, version: 1 }));
    const card = (id: string) => ({ id, ease: 2.5, interval: 1, reps: 1, lapses: 0, due: "2024-01-02", added: "2024-01-01", last: "2024-01-01" });
    localStorage.setItem(
      "deutsch-learner:srs",
      JSON.stringify({ state: { cards: { "noun:kopf": card("noun:kopf"), "noun:hand": card("noun:hand") }, log: {}, newPerDay: 10 }, version: 1 }),
    );
  });
}

function homeTests(locale: "en" | "fa") {
  const p = M[locale].Path;

  test(`hero CTA goes to the next path step; continue and due review are above the module cards`, async ({ page }, testInfo) => {
    await seedProgress(page);
    await page.goto(`/${locale}`);
    const cta = page.locator("a[data-hero-cta]");
    await expect(cta).toHaveAttribute("href", `/${locale}/grammar/pronouns`);
    await expect(cta).toContainText(p.steps.pronouns.title);

    const cont = page.locator("[data-continue-box]");
    await expect(cont).toHaveAttribute("aria-busy", "false");
    await expect(cont.getByRole("link")).toHaveAttribute("href", `/${locale}/verbs`);
    const due = page.locator("[data-due-box]");
    await expect(due).toContainText(/[2۲]/);
    await expect(due.getByRole("link")).toHaveAttribute("href", `/${locale}/review`);

    const firstModule = (await page.locator(`main a[href='/${locale}/grammar']`).first().boundingBox())!;
    expect((await cont.boundingBox())!.y).toBeLessThan(firstModule.y);
    expect((await due.boundingBox())!.y).toBeLessThan(firstModule.y);
    await shot(page, testInfo, "home", locale, "1-returning");

    await cta.click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/grammar/pronouns$`));
  });

  test(`new user: CTA starts the first step`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("a[data-hero-cta]")).toHaveAttribute("href", `/${locale}/arcade`);
  });

  test(`no hydration shift: aria-busy skeletons keep the CTA and cards in the same box, no label swap`, async ({ page }, testInfo) => {
    await seedProgress(page);
    // Server HTML (JS disabled): skeletons, never a default label that is later replaced.
    const ctx = await page.context().browser()!.newContext({ javaScriptEnabled: false, viewport: page.viewportSize()!, baseURL: testInfo.project.use.baseURL });
    const ssr = await ctx.newPage();
    await ssr.goto(`/${locale}`);
    await expect(ssr.locator("[data-hero-cta]")).toHaveAttribute("aria-busy", "true");
    await expect(ssr.locator("[data-continue-box]")).toHaveAttribute("aria-busy", "true");
    await expect(ssr.locator("[data-due-box]")).toHaveAttribute("aria-busy", "true");
    await expect(ssr.locator("[data-hero-cta]")).not.toContainText(M[locale].Home.cta);
    await expect(ssr.locator("[data-continue-box]")).not.toContainText(p.continueEmpty);
    await ctx.close();

    // Real load: sample every frame from first paint until well after hydration, relative to what sits just above.
    await page.addInitScript(() => {
      const w = window as unknown as { __samples: { busy: boolean; cta: string; cont: string; due: string; text: string }[] };
      w.__samples = [];
      const rel = (el: Element | null, ref: Element | null) => {
        if (!el || !ref) return "";
        const a = el.getBoundingClientRect();
        const b = ref.getBoundingClientRect();
        return [a.left, a.top - b.bottom, a.width, a.height].map(Math.round).join(",");
      };
      const tick = () => {
        const cta = document.querySelector("[data-hero-cta]");
        if (cta) {
          w.__samples.push({
            busy: cta.getAttribute("aria-busy") === "true",
            cta: rel(cta, cta.previousElementSibling), // offset from the subtitle above: web-font rewrapping is not a hydration shift
            cont: rel(document.querySelector("[data-continue-box]"), document.querySelector("#path-title")),
            due: rel(document.querySelector("[data-due-box]"), document.querySelector("#path-title")),
            text: [...cta.childNodes].filter((n) => !(n instanceof HTMLElement && n.classList.contains("sr-only"))).map((n) => n.textContent).join("").trim(), // visible text only
          });
        }
        if (w.__samples.length < 400) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(`/${locale}`);
    await expect(page.locator("a[data-hero-cta]")).toBeVisible();
    await page.waitForTimeout(1000);
    const samples = await page.evaluate(() => (window as unknown as { __samples: { busy: boolean; cta: string; cont: string; due: string; text: string }[] }).__samples);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.some((s) => s.busy)).toBe(true); // the skeleton was painted before hydration
    expect(samples.at(-1)!.busy).toBe(false);
    for (const k of ["cta", "cont", "due"] as const) expect([...new Set(samples.map((s) => s[k]))], k).toHaveLength(1);
    // Only one visible label ever: the skeleton has no text, then the real one.
    expect([...new Set(samples.map((s) => s.text).filter(Boolean))]).toHaveLength(1);
    await shot(page, testInfo, "home", locale, "2-hydrated");
  });

  test(`goal pills are at least 44px tall`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const pills = page.getByRole("group", { name: p.goalChoose }).getByRole("button");
    await expect(pills).toHaveCount(3);
    for (const b of await pills.all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
}

for (const locale of ["en", "fa"] as const) test.describe(`home (${locale})`, () => homeTests(locale));
