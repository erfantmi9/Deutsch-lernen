import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectClearOfBar, shot } from "./helpers";

// Review (spaced repetition). The deck is seeded in localStorage (stores/srsStore.ts, "deutsch-learner:srs", v1).

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const liveRegions = (page: Page) => page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);
const answerBox = (page: Page) => page.locator("[data-review-answer]");
const docBox = (page: Page, sel: string) =>
  page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, height: r.height };
  });

const IDS = ["noun:kopf", "noun:hand", "noun:arm"];

async function seedDeck(page: Page) {
  await page.addInitScript((ids) => {
    if (sessionStorage.getItem("seeded")) return;
    const cards = Object.fromEntries(ids.map((id) => [id, { id, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: "2024-01-01", added: "2024-01-01" }]));
    localStorage.setItem("deutsch-learner:srs", JSON.stringify({ state: { cards, log: {}, newPerDay: 10 }, version: 1 }));
    sessionStorage.setItem("seeded", "1");
  }, IDS);
}

async function startSession(page: Page, locale: "en" | "fa") {
  await seedDeck(page);
  await page.goto(`/${locale}/review`);
  await page.getByRole("button", { name: M[locale].Review.start }).click();
  await expect(action(page)).toHaveText(M[locale].Review.showAnswer);
}

function reviewTests(locale: "en" | "fa", tag: string) {
  const r = M[locale].Review;

  test(`one persistent bar button: Show answer -> Good, grades in the bar, focus kept, one live region${tag}`, async ({ page }, testInfo) => {
    await startSession(page, locale);
    expect(await liveRegions(page)).toBe(1);
    await expect(bar(page).locator("[data-grade]")).toHaveCount(3);
    for (const g of ["again", "hard", "easy"]) {
      await expect(bar(page).locator(`[data-grade=${g}]`)).toHaveAttribute("aria-disabled", "true");
      await expect(bar(page).locator(`[data-grade=${g}]`)).toContainText(/[0-9۰-۹]/); // preview interval
    }
    await shot(page, testInfo, "review", locale, `1-front${tag}`);
    const before = await docBox(page, "[data-review-answer]");
    const handle = await action(page).elementHandle();

    await action(page).click();
    await expect(action(page)).toContainText(r.grades.good);
    await expect(action(page)).toBeFocused();
    expect(await action(page).elementHandle().then((h) => h!.evaluate((el, old) => el === old, handle))).toBe(true); // same node
    for (const g of ["again", "hard", "easy"]) await expect(bar(page).locator(`[data-grade=${g}]`)).toHaveAttribute("aria-disabled", "false");
    const after = await docBox(page, "[data-review-answer]");
    expect(Math.abs(after.top - before.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    await expectClearOfBar(page, answerBox(page));
    await expect(bar(page).locator("[role=status]")).toContainText(r.answerStatus.replace("{answer}", "").trim());
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "review", locale, `2-answer${tag}`);

    // Grading with a secondary button: focus moves to the persistent primary, never to body.
    await bar(page).locator("[data-grade=hard]").click();
    await expect(action(page)).toHaveText(r.showAnswer);
    await expect(action(page)).toBeFocused();
    await expect(bar(page).locator("[role=status]")).toHaveText(r.progress.replace("{current}", "2").replace("{total}", "3"));

    // Grading with the primary (Good) keeps focus on it.
    await action(page).click();
    await action(page).click();
    await expect(action(page)).toHaveText(r.showAnswer);
    await expect(action(page)).toBeFocused();
    expect(await liveRegions(page)).toBe(1);

    // Last card -> summary: heading focused, a clear next step.
    await action(page).click();
    await action(page).click();
    const heading = page.getByRole("heading", { level: 1, name: r.summaryTitle });
    await expect(heading).toBeFocused();
    await expect(page.locator("[data-summary-next]")).toHaveText(r.addWords); // nothing else due
    await expect(page.getByRole("button", { name: r.backToOverview })).toBeVisible();
    await expect(action(page)).toHaveCount(0);
    await shot(page, testInfo, "review", locale, `3-summary${tag}`);
  });

  test(`"Back to overview" mid-session asks first${tag}`, async ({ page }) => {
    await startSession(page, locale);
    await action(page).click();
    await action(page).click(); // Good
    await page.getByRole("button", { name: r.backToOverview }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: M[locale].Ui.leaveAction }).click();
    await expect(page.getByRole("button", { name: r.start })).toBeVisible();
    await expect(action(page)).toHaveCount(0);
  });

  test(`Reset asks first; import and reset status sit under the Import button${tag}`, async ({ page }, testInfo) => {
    await seedDeck(page);
    await page.goto(`/${locale}/review`);
    await expect(page.getByRole("button", { name: r.start })).toBeVisible();
    expect(await liveRegions(page)).toBe(1);
    const importLabel = page.locator("label", { hasText: r.importLabel });
    const status = page.locator("[role=status]");
    const statusBefore = await docBox(page, "[role=status]");

    await importLabel.locator("input[type=file]").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{nope") });
    await expect(status).toHaveText(r.importJson);
    const lb = (await importLabel.boundingBox())!;
    const sb = (await status.boundingBox())!;
    expect(sb.y - (lb.y + lb.height)).toBeGreaterThanOrEqual(0);
    expect(sb.y - (lb.y + lb.height)).toBeLessThanOrEqual(40);
    const statusAfter = await docBox(page, "[role=status]");
    expect(Math.abs(statusAfter.height - statusBefore.height)).toBeLessThanOrEqual(1); // reserved: no jump
    await importLabel.scrollIntoViewIfNeeded();
    await shot(page, testInfo, "review", locale, `4-import-status${tag}`);

    await page.getByRole("button", { name: r.reset }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: r.resetCancel }).click();
    await expect(page.getByRole("button", { name: r.start })).toBeVisible();
    await page.getByRole("button", { name: r.reset }).click();
    await dialog.getByRole("button", { name: M[locale].Ui.resetAction }).click();
    await expect(status).toHaveText(r.resetDone);
    await expect(page.getByRole("heading", { name: r.emptyDeckTitle })).toBeVisible();
  });
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`review (${locale})`, () => reviewTests(locale, ""));
  test.describe(`review at 1366x650 (${locale})`, () => {
    test.use({ viewport: { width: 1366, height: 650 } });
    test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop size: run once, in the desktop project"));
    reviewTests(locale, "-1366x650");
  });
}
