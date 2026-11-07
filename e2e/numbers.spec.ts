import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectClearOfBar, shot } from "./helpers";

// Numbers: the practice drill (one persistent bar button, reserved feedback, no layout jump), the clock and date
// explorers (sticky readout, settled-value announcements, sliders that do not fight touch scrolling).

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
const action = (page: Page) => page.locator("[data-action-button]");
const feedback = (page: Page) => page.locator("main [role=status].min-h-feedback");
/**
 * Number of live regions in the page's own DOM (the bar status is plain text on these pages). Not a Playwright
 * locator: those pierce shadow roots and would count Next's global route announcer.
 */
const liveRegions = (page: Page) => page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);
/** Top edge in document coordinates (independent of scrolling). */
const docTop = (l: Locator) => l.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

async function openTab(page: Page, locale: "en" | "fa", tab: string) {
  await page.goto(`/${locale}/numbers`);
  await page.getByRole("group", { name: M[locale].Numbers.tabsLabel }).getByRole("button", { name: M[locale].Numbers.tabs[tab], exact: true }).click();
}

async function openDrill(page: Page, locale: "en" | "fa", kind: string) {
  await openTab(page, locale, "practice");
  await page.getByRole("button", { name: M[locale].Numbers.practice.kinds[kind], exact: true }).click();
  await expect(page.getByRole("button", { name: M[locale].Numbers.practice.kinds[kind], exact: true })).toHaveAttribute("aria-pressed", "true");
}

/** Records every non-empty text the live region takes, to prove only the settled value is announced. */
async function recordAnnouncements(region: Locator) {
  await region.evaluate((el) => {
    const w = window as unknown as { __ann: string[] };
    w.__ann = [];
    new MutationObserver(() => {
      const txt = (el.textContent ?? "").trim();
      if (txt && txt !== w.__ann.at(-1)) w.__ann.push(txt);
    }).observe(el, { childList: true, subtree: true, characterData: true });
  });
}
const announcements = (page: Page) => page.evaluate(() => (window as unknown as { __ann: string[] }).__ann);

async function headerBottom(page: Page) {
  const h = (await page.locator("header.sticky").boundingBox())!;
  return h.y + h.height;
}

function drillTests(locale: "en" | "fa", tag: string) {
  const m = M[locale];

  test(`typed answer: Check -> Next in the bar, readOnly input, focus on the bar, no jump, one live region${tag}`, async ({ page }, testInfo) => {
    await openDrill(page, locale, "cardinal");
    const input = page.locator("form input").first();
    await expect(input).toBeFocused();
    await expect(page.locator("header.sticky ~ * .card-hero h1, main .card-hero h1")).toHaveCount(0); // compact header
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await expect(action(page)).toHaveText(m.Numbers.practice.check);
    await shot(page, testInfo, "numbers", locale, `drill-1-before${tag}`);

    const reset = page.getByRole("button", { name: m.Numbers.practice.reset, exact: true });
    const before = { feedback: await docTop(feedback(page)), reset: await docTop(reset) };
    await input.fill("x");
    await action(page).click();
    await expect(feedback(page)).not.toBeEmpty();
    await expect(action(page)).toBeFocused();
    await expect(action(page)).toContainText(m.Numbers.practice.next);
    await expect(input).toHaveAttribute("readonly", "");
    await expect(input).toBeEnabled();
    await expectClearOfBar(page, feedback(page).locator("> div"));
    expect(Math.abs((await docTop(feedback(page))) - before.feedback)).toBeLessThanOrEqual(1);
    expect(Math.abs((await docTop(reset)) - before.reset)).toBeLessThanOrEqual(1); // reserved height: nothing below moved
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "numbers", locale, `drill-2-after${tag}`);

    // Double Enter on Next: one advance, then the empty field ignores the second Enter.
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(feedback(page)).toBeEmpty();
    await expect(input).toHaveValue("");
    await expect(input).not.toHaveAttribute("readonly", "");
    await expect(input).toBeFocused();
    await expect(action(page)).toHaveText(m.Numbers.practice.check);
  });

  test(`set the clock: Check lives in the bar and the sliders stay put after answering${tag}`, async ({ page }, testInfo) => {
    await openDrill(page, locale, "clock-set");
    const sliders = page.locator("main input[type=range]");
    await expect(sliders).toHaveCount(2);
    await expect(page.locator("main button.btn-primary:not([data-action-button])")).toHaveCount(0); // no in-page Check: the bar has it
    await expect(action(page)).toHaveAttribute("aria-disabled", "false");
    const reset = page.getByRole("button", { name: m.Numbers.practice.reset, exact: true });
    const before = await docTop(reset);
    await action(page).click();
    await expect(feedback(page)).not.toBeEmpty();
    await expect(action(page)).toBeFocused();
    await expect(sliders).toHaveCount(2);
    await expect(sliders.first()).toBeDisabled();
    expect(Math.abs((await docTop(reset)) - before)).toBeLessThanOrEqual(1); // no ~200px collapse
    await expectClearOfBar(page, feedback(page).locator("> div"));
    await shot(page, testInfo, "numbers", locale, `drill-3-clock-set${tag}`);

    // Double click on Next: one advance; the second click must not check the fresh (untouched) question.
    await action(page).dblclick();
    await expect(sliders.first()).toBeEnabled();
    await page.waitForTimeout(300);
    await expect(feedback(page)).toBeEmpty();
    await expect(action(page)).toHaveText(m.Numbers.practice.check);
  });

  test(`umlaut keys under typed word answers${tag}`, async ({ page }) => {
    await openDrill(page, locale, "cardinal");
    const input = page.locator("form input").first();
    await input.fill("zw");
    await page.getByRole("button", { name: m.Grammar.insertChar.replace("{char}", "ö") }).first().click();
    await expect(input).toHaveValue("zwö");
  });
}

for (const locale of ["en", "fa"] as const) {
  const m = M[locale];
  test.describe(`numbers (${locale})`, () => {
    drillTests(locale, "");

    test("converter and date explorer come first in their sections", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/numbers`);
      const converter = page.locator("#converter");
      const firstRule = page.getByRole("heading", { name: m.Numbers.cardinals.ruleTitle });
      expect(await docTop(converter)).toBeLessThan(await docTop(firstRule));
      await converter.fill("21");
      await expect(page.locator("main").getByText("einundzwanzig").first()).toBeVisible();
      await shot(page, testInfo, "numbers", locale, "converter");

      await page.getByRole("button", { name: m.Numbers.tabs.calendar, exact: true }).click();
      const explorer = page.locator("#date-title");
      const months = page.getByRole("heading", { name: m.Numbers.calendar.monthsTitle });
      expect(await docTop(explorer)).toBeLessThan(await docTop(months));
    });

    test("date explorer: sticky readout, only the settled date is announced", async ({ page }, testInfo) => {
      await openTab(page, locale, "calendar");
      const region = page.locator("#date-title ~ p[role=status]");
      expect(await liveRegions(page)).toBe(1);
      await page.waitForTimeout(800); // today's date set on mount must not be announced
      await recordAnnouncements(region);
      expect(await announcements(page)).toEqual([]);

      const day = (n: number) => page.locator("main svg g[role=button]").nth(n);
      await day(4).click();
      await day(9).click();
      await day(14).click();
      await expect.poll(() => announcements(page), { timeout: 3000 }).toHaveLength(1);
      await page.waitForTimeout(800);
      expect(await announcements(page)).toHaveLength(1);

      // Readout stays visible while the calendar scrolls under it.
      const readout = page.locator("#date-title ~ dl[data-readout]");
      await page.locator("main svg").first().evaluate((el) => el.scrollIntoView({ block: "end" }));
      await page.mouse.wheel(0, 120);
      await expect(async () => {
        const box = (await readout.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
        expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      }).toPass({ timeout: 3000 });
      await shot(page, testInfo, "numbers", locale, "date-explorer-sticky");
    });

    test("clock explorer: sticky readout, held arrow key announces only the final time", async ({ page }, testInfo) => {
      await openTab(page, locale, "clock");
      expect(await liveRegions(page)).toBe(1);
      const region = page.locator("#clock-title ~ p[role=status]");
      await recordAnnouncements(region);
      const hour = page.locator("main input[type=range]").first();
      await hour.focus();
      for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowUp");
      await expect(hour).toHaveValue("19");
      await expect.poll(() => announcements(page), { timeout: 3000 }).toHaveLength(1);
      await page.waitForTimeout(800);
      const ann = await announcements(page);
      expect(ann).toHaveLength(1);
      expect(ann[0]).toContain("19:30");

      const minute = page.locator("main input[type=range]").nth(1);
      await minute.evaluate((el) => el.scrollIntoView({ block: "end" }));
      const readout = page.locator("#clock-title ~ dl[data-readout]");
      await expect(async () => {
        const box = (await readout.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
        const m2 = (await minute.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(m2.y); // never covers the slider being moved
      }).toPass({ timeout: 3000 });
      await shot(page, testInfo, "numbers", locale, "clock-explorer-sticky");
    });

    test("clock sliders on touch: a vertical swipe scrolls the page, a horizontal drag moves the thumb", async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch input: phone project only");
      await openTab(page, locale, "clock");
      const hour = page.locator("main input[type=range]").first();
      await hour.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(300);
      const cdp = await page.context().newCDPSession(page);
      const swipe = async (x: number, y: number, dx: number, dy: number) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let i = 1; i <= 10; i++) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + (dx * i) / 10, y: y + (dy * i) / 10 }] });
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      };
      const box = (await hour.boundingBox())!;
      const value = await hour.inputValue();
      const scrollBefore = await page.evaluate(() => window.scrollY);
      expect(scrollBefore).toBeGreaterThan(100); // room to scroll back up
      // Finger down on the track away from the thumb (the native slider would jump there), then straight down.
      await swipe(box.x + box.width * 0.3, box.y + box.height / 2, 0, 200);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(scrollBefore - 50);
      await expect(hour).toHaveValue(value);

      const box2 = (await hour.boundingBox())!;
      await swipe(box2.x + box2.width / 2, box2.y + box2.height / 2, 100, 0);
      await expect(hour).not.toHaveValue(value);
    });
  });

  test.describe(`numbers drill at 1366x650 (${locale})`, () => {
    test.use({ viewport: { width: 1366, height: 650 } });
    test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop size: run once, in the desktop project"));
    drillTests(locale, "-1366x650");
  });
}
