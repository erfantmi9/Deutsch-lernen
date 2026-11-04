import { expect } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";

/**
 * Saves a viewport screenshot (not full page: it shows exactly what the user sees) for visual review:
 * e2e/screenshots/<module>/<project>__<locale>__<state>.png
 */
export async function shot(page: Page, testInfo: TestInfo, module: string, locale: string, state: string) {
  await page.screenshot({ path: `e2e/screenshots/${module}/${testInfo.project.name}__${locale}__${state}.png` });
}

/** Locator is inside the viewport and not covered by the fixed bottom bar (if one is showing). */
export async function expectClearOfBar(page: Page, target: Locator) {
  // Polled: scroll-into-view is smooth, so the final position is reached a moment after the click.
  await expect(async () => {
    const box = (await target.boundingBox())!;
    const vh = page.viewportSize()!.height;
    const bar = page.locator("[data-action-button]").locator("xpath=ancestor::*[@data-bottom-chrome]");
    const barTop = (await bar.count()) ? (await bar.boundingBox())!.y : vh;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(Math.min(vh, barTop) + 1);
  }).toPass({ timeout: 3000 });
}

/** The element's top edge is not hidden under the sticky header (polled: scrolling is smooth). */
export async function expectBelowHeader(page: Page, target: Locator) {
  await expect(async () => {
    const top = (await target.boundingBox())!.y;
    const headerBottom = (await page.locator("header").first().boundingBox())!.y + (await page.locator("header").first().boundingBox())!.height;
    expect(top).toBeGreaterThanOrEqual(headerBottom - 0.5);
  }).toPass({ timeout: 3000 });
}

/** Seeds the persisted Arcade store (before any page script runs) and counts its localStorage writes. */
export async function seedQuiz(page: Page, autoAdvance: boolean) {
  await page.addInitScript((auto) => {
    const KEY = "deutsch-learner:quiz";
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem(KEY, JSON.stringify({ state: { autoAdvance: auto, score: 0, streak: 0, bestStreak: 0, wrongWordIds: [] }, version: 1 }));
      sessionStorage.setItem("seeded", "1");
    }
    const w = window as unknown as { __quizWrites: number };
    w.__quizWrites = 0;
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === KEY) w.__quizWrites++;
      return orig.call(this, k, v);
    };
  }, autoAdvance);
}

export const quizWrites = (page: Page) => page.evaluate(() => (window as unknown as { __quizWrites: number }).__quizWrites);
