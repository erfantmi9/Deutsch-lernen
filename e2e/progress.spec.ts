import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { shot } from "./helpers";

// Progress: calendar days open a per-day count sheet, weak chips link to practise the item, empty weak state has a next step.
// Stores seeded in localStorage: activity (v1, {days}), quiz (v1, wrongWordIds), verbs (v1, wrongVerbIds), srs (v1, cards).

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAY = localKey(new Date(Date.now() - 2 * 86_400_000));

async function seed(page: Page) {
  await page.addInitScript((day) => {
    if (sessionStorage.getItem("seeded")) return;
    localStorage.setItem("deutsch-learner:activity", JSON.stringify({ state: { days: { [day]: 7 } }, version: 1 }));
    localStorage.setItem(
      "deutsch-learner:quiz",
      JSON.stringify({ state: { autoAdvance: false, score: 0, streak: 0, bestStreak: 0, wrongWordIds: ["kopf"] }, version: 1 }),
    );
    localStorage.setItem("deutsch-learner:verbs", JSON.stringify({ state: { score: 0, streak: 0, bestStreak: 0, wrongVerbIds: ["sein"] }, version: 1 }));
    const card = { id: "adjective:rot", ease: 1.8, interval: 1, reps: 0, lapses: 3, due: "2024-01-01", added: "2024-01-01" };
    localStorage.setItem("deutsch-learner:srs", JSON.stringify({ state: { cards: { [card.id]: card }, log: {}, newPerDay: 10 }, version: 1 }));
    sessionStorage.setItem("seeded", "1");
  }, DAY);
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`progress (${locale})`, () => {
    test("tapping a calendar day shows its count in a sheet", async ({ page }, testInfo) => {
      await seed(page);
      await page.goto(`/${locale}/progress`);
      const cell = page.locator(`button[data-day="${DAY}"]`);
      await expect(cell).toHaveAttribute("aria-label", /7|۷/);
      // One Tab stop for the whole calendar (roving tabindex).
      expect(await page.locator("[role=group] button[data-day][tabindex='0']").count()).toBe(1);

      if (testInfo.project.use.hasTouch) await cell.tap();
      else await cell.click();
      const sheet = page.locator("dialog[open]");
      await expect(sheet).toBeVisible();
      await expect(sheet.getByTestId("day-count")).toHaveText(/7|۷/);
      await expect(sheet).toBeInViewport();
      await shot(page, testInfo, "progress", locale, "day-sheet");
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(cell).toBeFocused();
    });

    test("arrow keys move between calendar days", async ({ page }) => {
      await seed(page);
      await page.goto(`/${locale}/progress`);
      const cell = page.locator(`button[data-day="${DAY}"]`);
      await cell.focus();
      await page.keyboard.press("ArrowUp");
      const prev = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.day);
      expect(prev! < DAY).toBe(true);
      await page.keyboard.press("Enter");
      await expect(page.locator("dialog[open]")).toBeVisible();
    });

    test("weak chips link to practise the item", async ({ page }, testInfo) => {
      await seed(page);
      await page.goto(`/${locale}/progress`);
      const weak = page.locator("section[aria-labelledby=weak-title]");
      await expect(weak.locator(`a[href="/${locale}/vocabulary?kind=noun&q=der%20Kopf"]`)).toBeVisible();
      await expect(weak.locator(`a[href="/${locale}/verbs/sein"]`)).toBeVisible();
      const rot = weak.locator(`a[href="/${locale}/vocabulary?kind=adjective&q=rot"]`);
      await expect(rot).toBeVisible();
      const box = (await rot.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      await rot.scrollIntoViewIfNeeded();
      await shot(page, testInfo, "progress", locale, "weak-chips");

      await rot.click();
      await expect(page).toHaveURL(/\/vocabulary\?kind=adjective&q=rot/);
      await expect(page.locator("main input[type=search]")).toHaveValue("rot");
      await expect(page.locator("main ul li.card").first()).toContainText("rot");
    });

    test("no weak items: offers a next step", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/progress`);
      const next = page.getByTestId("weak-empty-next");
      await expect(next).toHaveAttribute("href", `/${locale}/arcade`);
      await next.scrollIntoViewIfNeeded();
      await shot(page, testInfo, "progress", locale, "weak-empty");
      await next.click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/arcade`));
    });
  });
}
