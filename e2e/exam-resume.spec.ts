import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { MODULE_MINUTES } from "../types/exam";
import { shot } from "./helpers";

const KEY = "deutsch-learner:exam-session";
const dialog = (page: Page) => page.locator("dialog[open]");
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
/** Seconds shown by the part timer (mm:ss). */
const timerSeconds = async (page: Page) => {
  const [, m, s] = latin(await page.locator("[role=timer]").innerText()).match(/(\d+):(\d+)/)!;
  return Number(m) * 60 + Number(s);
};

async function startSchreiben(page: Page) {
  await page.locator("main ul.grid > li").nth(2).locator("button").click();
  await dialog(page).locator(".border-t button").last().click();
  await expect(page.locator("[role=timer]")).toBeVisible();
}

const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), KEY);

for (const locale of ["en", "fa"] as const) {
  test.describe(`exam resume (${locale})`, () => {
    test("a refresh mid-part resumes the same part, its answers and the real remaining time", async ({ page }, testInfo) => {
      await page.clock.install();
      await page.goto(`/${locale}/exam`);
      await startSchreiben(page);
      await page.locator("textarea").fill("Hallo Anna, ich komme gern.");
      await page.clock.fastForward(2 * 60_000); // two minutes pass
      const s = await stored(page);
      expect(s.current).toBe("schreiben");
      expect(typeof s.endsAt).toBe("number");

      await page.reload();
      await expect(page.locator("[role=timer]")).toBeVisible();
      await expect(page.locator("textarea")).toHaveValue("Hallo Anna, ich komme gern.");
      const left = await timerSeconds(page);
      const full = MODULE_MINUTES.schreiben * 60;
      expect(left).toBeLessThanOrEqual(full - 120);
      expect(left).toBeGreaterThan(full - 130);
      await shot(page, testInfo, "exam", locale, "resume-after-refresh");
    });

    test("time running out while the page is hidden hands in on return with a 'time is up' message, then clears the state", async ({ page }, testInfo) => {
      await page.clock.install();
      await page.goto(`/${locale}/exam`);
      await startSchreiben(page);
      await page.locator("textarea").fill("Hallo");
      const endsAt = (await stored(page)).endsAt as number;

      // Hidden (phone locked): timers frozen. Move the wall clock past the deadline WITHOUT firing any timer.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.clock.setSystemTime(endsAt + 60_000);
      await expect(page.locator("[role=timer]")).toBeVisible(); // nothing happened while hidden
      // Back to the page: the visibility re-check alone must hand it in.
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(page.locator("[data-time-up]")).toBeVisible();
      await expect(page.locator("[role=timer]")).toHaveCount(0);
      await expect(page.locator("h1#exam-focus")).toBeFocused();
      expect(await stored(page)).toBeNull(); // handed in: nothing left to resume
      await shot(page, testInfo, "exam", locale, "time-up-on-return");
    });

    test("time running out while the app was closed hands in on the next visit", async ({ page }) => {
      await page.goto(`/${locale}/exam`);
      await startSchreiben(page);
      await page.locator("textarea").fill("Hallo");
      await page.evaluate((k) => {
        const s = JSON.parse(localStorage.getItem(k)!);
        s.endsAt = Date.now() - 1000;
        localStorage.setItem(k, JSON.stringify(s));
      }, KEY);
      await page.reload();
      await expect(page.locator("[data-time-up]")).toBeVisible();
      await expect(page.locator("[role=timer]")).toHaveCount(0);
      expect(await stored(page)).toBeNull();
    });

    test("the 5-minute and 1-minute warnings are each announced exactly once", async ({ page }) => {
      await page.clock.install();
      await page.goto(`/${locale}/exam`);
      await startSchreiben(page);
      await page.evaluate(() => {
        const w = window as unknown as { __warnings: string[] };
        w.__warnings = [];
        const el = document.querySelector("[data-timer-warning]")!;
        new MutationObserver(() => w.__warnings.push(el.textContent ?? "")).observe(el, { childList: true, characterData: true, subtree: true });
      });
      const endsAt = (await stored(page)).endsAt as number;
      await page.clock.setSystemTime(endsAt - 305_000);
      await page.clock.runFor(20_000); // crosses 5:00
      await page.clock.runFor(20_000);
      await page.clock.setSystemTime(endsAt - 65_000);
      await page.clock.runFor(20_000); // crosses 1:00
      await page.clock.runFor(20_000);
      const warnings = await page.evaluate(() => (window as unknown as { __warnings: string[] }).__warnings);
      expect(warnings.filter(Boolean)).toHaveLength(2);
      expect(new Set(warnings.filter(Boolean)).size).toBe(2);
      // Only one live region on the part screen.
      // Only one live region on the part screen (querySelectorAll does not enter Next's route-announcer shadow root).
      expect(await page.evaluate(() => document.querySelectorAll("body [aria-live]:not([aria-live=off]), body [role=status], body [role=alert]").length)).toBe(1);
    });

    test("an old-shape or corrupt stored session does not crash the page", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      for (const raw of [JSON.stringify({ version: 1, module: "lesen", secondsLeft: 300 }), "{not json", JSON.stringify({ version: 2, current: "kochen" })]) {
        await page.goto(`/${locale}/exam`);
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]);
        await page.reload();
        await expect(page.locator("main ul.grid > li")).toHaveCount(4); // start screen
        await expect(page.locator("[role=timer]")).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    });
  });
}
