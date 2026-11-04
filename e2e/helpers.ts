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

/**
 * Fakes an on-screen keyboard (headless Chromium has none): visualViewport shrinks by `keyboardPx` while a text field
 * is focused and returns to full height when it is blurred, like a real phone. Call before page.goto.
 */
export async function installFakeKeyboard(page: Page, keyboardPx = 290, opts: { silentClose?: boolean } = {}) {
  await page.addInitScript(({ kb, silent }) => {
    let override: number | null = null;
    const vv = new EventTarget();
    // defineProperties, not Object.assign: assign would copy the getters' current values and freeze them.
    Object.defineProperties(vv, {
      offsetTop: { value: 0 }, offsetLeft: { value: 0 }, scale: { value: 1 }, pageTop: { value: 0 }, pageLeft: { value: 0 },
      height: { get: () => override ?? innerHeight },
      width: { get: () => innerWidth },
    });
    const set = (h: number | null) => {
      override = h;
      vv.dispatchEvent(new Event("resize"));
    };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true });
    const isText = (el: Element | null) =>
      !!el && /^(INPUT|TEXTAREA)$/.test(el.tagName) && !["checkbox", "radio", "button", "submit"].includes((el as HTMLInputElement).type);
    document.addEventListener("focusin", (e) => isText(e.target as Element) && set(innerHeight - kb));
    // silentClose: the keyboard goes away without any visualViewport event (the iOS quirk the re-measure guards against).
    document.addEventListener("focusout", () =>
      setTimeout(() => {
        if (isText(document.activeElement)) return;
        if (silent) override = null;
        else set(null);
      }, 0),
    );
  }, { kb: keyboardPx, silent: opts.silentClose ?? false });
}

/** Top edge (px) of the highest visible fixed-bottom bar (action bar or mobile nav); the viewport bottom if none. */
export async function bottomChromeTop(page: Page): Promise<number> {
  return page.evaluate(() => {
    const tops = [...document.querySelectorAll("[data-bottom-chrome]")]
      .filter((el) => getComputedStyle(el).display !== "none" && getComputedStyle(el).position === "fixed")
      .map((el) => el.getBoundingClientRect().top);
    return Math.min(window.innerHeight, ...tops);
  });
}
