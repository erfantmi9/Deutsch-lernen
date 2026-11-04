import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, expectClearOfBar, shot } from "./helpers";

interface Ex {
  id: string;
  grammarFocus: string;
  tokens: string[];
  distractors?: string[];
  translations: Record<string, string>;
}
const RAW = JSON.parse(readFileSync("data/sentences/a1.json", "utf8"));
const EXERCISES: Ex[] = Array.isArray(RAW) ? RAW : RAW.exercises;
const ALL_FOCI = ["v2", "question", "modal-bracket", "separable-bracket", "subordinate-weil", "negation-nicht-kein", "time-manner-place"];

const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const builder = (page: Page) => page.locator("section[aria-labelledby=builder-title]");
const answerZone = (page: Page) => builder(page).locator("div[role=group]").nth(0);
const bankZone = (page: Page) => builder(page).locator("div[role=group]").nth(1);
/** The bar's status line: hint while building, the verdict after a check. The page's one live region. */
const statusP = (page: Page) => bar(page).locator("p[role=status]");
const chips = (zone: Locator) => zone.locator("li[data-chip] button");

/** Seeds the persisted store (focus filter + "all mini lessons already seen" so they start collapsed). */
async function seed(page: Page, focus = "v2", lessonsSeen = true) {
  await page.addInitScript(
    ({ focus, seen, foci }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(
        "deutsch-learner:sentences",
        JSON.stringify({ state: { solvedIds: [], wrongIds: [], streak: 0, bestStreak: 0, focus, lessonSeen: seen ? foci : [] }, version: 1 }),
      );
      const w = window as unknown as { __writes: number };
      w.__writes = 0;
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === "deutsch-learner:sentences") w.__writes++;
        return orig.call(this, k, v);
      };
    },
    { focus, seen: lessonsSeen, foci: ALL_FOCI },
  );
}

async function current(page: Page, locale: string): Promise<Ex> {
  let ex: Ex | undefined;
  await expect
    .poll(async () => {
      const shown = (await page.locator("#builder-title + p").innerText()).trim();
      ex = EXERCISES.find((e) => e.translations[locale === "de" ? "en" : locale] === shown);
      return ex !== undefined;
    })
    .toBe(true);
  return ex!;
}

/** Taps the bank chip showing `word`. */
async function place(page: Page, word: string) {
  await bankZone(page)
    .locator("li[data-chip] button")
    .filter({ has: page.locator(`span.text-lg:text-is("${word}")`) })
    .first()
    .click();
}

/** Bounding box in DOCUMENT coordinates (viewport box + scroll), so Playwright's own scrolling never looks like a layout jump. */
const box = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  const scrollY = await l.page().evaluate(() => window.scrollY);
  return { x: b.x, y: b.y + scrollY, width: b.width, height: b.height };
};
/** Viewport box (for geometry relative to the screen). */
const vbox = async (l: Locator) => (await l.boundingBox())!;

for (const locale of ["en", "fa"] as const) {
  test.describe(`sentences (${locale})`, () => {
    test("states: no layout jumps, wrong tokens marked on the answer line, details behind a sheet; screenshots", async ({ page, isMobile }, testInfo) => {
      await seed(page, "v2");
      await page.goto(`/${locale}/sentences`);
      await expect(chips(bankZone(page)).first()).toBeVisible();
      const ex = await current(page, locale);
      const tokens = ex.tokens;

      // Height budget at 375x667 (this focus has 4-word sentences): everything fits without scrolling.
      await expectBelowHeader(page, builder(page).locator(".card-hero").first());
      if (isMobile) {
        // 375x667: prompt, answer line, word bank and the bar all fit without scrolling.
        await expectClearOfBar(page, bankZone(page));
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
      }

      const zones0 = { answer: await box(answerZone(page)), bank: await box(bankZone(page)), bar: await box(bar(page)) };
      const barButtons0 = await bar(page).locator("button, a").count();
      await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      await expect(action(page).locator("xpath=preceding-sibling::p")).not.toBeEmpty(); // "Tap a word to start"
      await shot(page, testInfo, "sentences", locale, "1-initial");

      // Partially built.
      await place(page, tokens[0]);
      await place(page, tokens[1]);
      await expect(chips(answerZone(page))).toHaveCount(2);
      await expect(action(page)).toHaveAttribute("aria-disabled", "false");
      const zones1 = { answer: await box(answerZone(page)), bank: await box(bankZone(page)) };
      expect(zones1.answer, "answer area moved while placing words").toEqual(zones0.answer);
      expect(zones1.bank, "word bank moved while placing words").toEqual(zones0.bank);
      await shot(page, testInfo, "sentences", locale, "2-partial");

      // Wrong: remaining words in reverse order (wrong for every 4-word V2 sentence here).
      for (const w of [...tokens.slice(2)].reverse()) await place(page, w);
      await expect(chips(bankZone(page))).toHaveCount(0);
      await action(page).click();
      await expect(statusP(page)).toContainText("✗");
      await expect(statusP(page)).toBeInViewport();
      await expect(builder(page).locator("li[data-chip] button span.bg-danger").first()).toBeVisible(); // ✗ on the answer line itself
      expect((await statusP(page).innerText()).length).toBeLessThan(90); // short verdict; hint + explanation are in Details
      const zones2 = { answer: await box(answerZone(page)), bank: await box(bankZone(page)), bar: await box(bar(page)) };
      expect(zones2.answer).toEqual(zones0.answer);
      expect(zones2.bank).toEqual(zones0.bank);
      expect(zones2.bar.height).toBe(zones0.bar.height);
      expect(await bar(page).locator("button, a").count()).toBe(barButtons0); // reset/skip never swapped in or out
      await shot(page, testInfo, "sentences", locale, "3-wrong");

      // Details: hint + explanation in a sheet, focus returns to its trigger.
      const details = bar(page).locator("button[aria-haspopup=dialog]");
      await details.click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await expect(page.locator("dialog[open] .feedback-hint")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(details).toBeFocused();

      // Reset (secondary control in the bar), then the right order.
      await bar(page).locator("button").first().click(); // Reset: first of the secondary controls
      await expect(chips(answerZone(page))).toHaveCount(0);
      for (const w of tokens) await place(page, w);
      await action(page).click();
      await expect(statusP(page)).toContainText("✓");
      await expect(action(page)).toBeFocused(); // Enter / Space now goes to the next sentence
      // Parts coloured after a correct answer: badges are >= 12px and change no sizes.
      const badge = builder(page).locator("li[data-chip] button span.uppercase").first();
      await expect(badge).toBeVisible();
      expect(await badge.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
      const zones3 = { answer: await box(answerZone(page)), bank: await box(bankZone(page)), bar: await box(bar(page)) };
      expect(zones3.answer).toEqual(zones0.answer);
      expect(zones3.bank).toEqual(zones0.bank);
      expect(zones3.bar.height).toBe(zones0.bar.height);
      expect(await bar(page).locator("button, a").count()).toBe(barButtons0);
      await shot(page, testInfo, "sentences", locale, "4-correct");
    });

    test("the German sentence area is always left-to-right, even in /fa", async ({ page }) => {
      await seed(page, "v2");
      await page.goto(`/${locale}/sentences`);
      const ex = await current(page, locale);
      await place(page, ex.tokens[0]);
      await place(page, ex.tokens[1]);
      expect(await answerZone(page).evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
      const a = await vbox(chips(answerZone(page)).nth(0));
      const b = await vbox(chips(answerZone(page)).nth(1));
      expect(a.x, "first word must be to the left of the second").toBeLessThan(b.x);
      await expect(page.locator("div[dir=ltr][lang=de]").filter({ has: page.locator("div[role=group]") })).toHaveCount(1);
    });

    test("a swipe starting on a word still scrolls the page; press-and-hold drags; a tap places the word", async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch only");
      await seed(page, "v2");
      await page.goto(`/${locale}/sentences`);
      const first = chips(bankZone(page)).first();
      await expect(first).toBeVisible();
      expect(await first.evaluate((el) => getComputedStyle(el).touchAction)).not.toBe("none");
      // Make the page scrollable. Real touch input through CDP (Playwright has no swipe API).
      await page.addStyleTag({ content: "main{padding-bottom:100vh !important}" });
      const cdp = await page.context().newCDPSession(page);
      const touch = async (x: number, y: number, dy: number, holdMs = 0) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        if (holdMs) await page.waitForTimeout(holdMs);
        for (let i = 1; i <= 10; i++) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (dy * i) / 10 }] });
          await page.waitForTimeout(16);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(300);
      };
      const centre = async () => {
        const b = await vbox(chips(bankZone(page)).first());
        return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
      };

      // 1) Swipe up, starting ON a word: the page scrolls and the word is NOT placed.
      let c = await centre();
      await touch(c.x, c.y, -200);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
      await expect(chips(answerZone(page))).toHaveCount(0);

      // 2) Press-and-hold (>250ms) then move: optional drag places the word, the page does not scroll.
      await page.evaluate(() => window.scrollTo(0, 0));
      c = await centre();
      const answerBox = await vbox(answerZone(page));
      await touch(c.x, c.y, answerBox.y + answerBox.height / 2 - c.y, 400);
      await expect(chips(answerZone(page))).toHaveCount(1);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      // 3) A plain tap places the next word.
      await page.evaluate(() => window.scrollTo(0, 0));
      c = await centre();
      await page.touchscreen.tap(c.x, c.y);
      await expect(chips(answerZone(page))).toHaveCount(2);
    });

    test("double-clicking Check in the same tick records the result once", async ({ page }) => {
      await seed(page, "v2");
      await page.goto(`/${locale}/sentences`);
      const ex = await current(page, locale);
      for (const w of ex.tokens) await place(page, w);
      const before = await page.evaluate(() => (window as unknown as { __writes: number }).__writes);
      await page.evaluate(() => {
        const b = document.querySelector<HTMLElement>("[data-action-button]")!;
        b.click();
        b.click();
      });
      await expect(statusP(page)).toContainText("✓");
      const after = await page.evaluate(() => (window as unknown as { __writes: number }).__writes);
      expect(after - before).toBe(1);
    });

    test("the mini lesson is open on the first visit of a focus and collapsed afterwards; the toggle works", async ({ page }) => {
      await seed(page, "v2", false); // nothing seen yet
      await page.goto(`/${locale}/sentences`);
      const lesson = page.locator("#sentence-lesson");
      const toggle = page.locator("button[aria-controls=sentence-lesson]:visible");
      await expect(lesson).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.reload();
      await expect(page.locator("#builder-title")).toBeVisible();
      await expect(lesson).toBeHidden();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(lesson).toBeVisible();
      await toggle.click();
      await expect(lesson).toBeHidden();
    });

    test("focus filter + reset progress live in a sheet; reset asks for confirmation", async ({ page }) => {
      await seed(page, "v2");
      await page.goto(`/${locale}/sentences`);
      await page.locator("button[aria-haspopup=dialog]:visible").first().click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await page.locator("dialog[open] [role=group] button").nth(2).click(); // another focus
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      await page.locator("button[aria-haspopup=dialog]:visible").first().click();
      await page.locator("dialog[open] footer button, dialog[open] .btn-ghost").last().click();
      await expect(page.locator("dialog[open]")).toBeVisible(); // the confirm dialog
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    });
  });
}

// Height budget at 375x667 for EVERY sentence, the 8-word ones included: the answer line, the word bank and the verdict
// (in the bar) are on screen at the same time, with no scrolling, after a wrong check.
for (const locale of ["en", "fa"] as const) {
  test(`every sentence fits 375x667 without scrolling, verdict visible (${locale})`, async ({ page, isMobile }) => {
    test.skip(!isMobile, "the budget is defined for the phone");
    test.setTimeout(120_000);
    const seen = new Set<string>();
    for (const focus of ALL_FOCI) {
      const inFocus = EXERCISES.filter((e) => e.grammarFocus === focus);
      const done = new Set<string>();
      const pg = await page.context().newPage(); // a fresh tab per focus: its own sessionStorage, so seeding runs again
      await seed(pg, focus);
      await pg.goto(`/${locale}/sentences`);
      await expect(chips(bankZone(pg)).first()).toBeVisible();
      for (let guard = 0; guard < 40 && done.size < inFocus.length; guard++) {
        const ex = await current(pg, locale);
        if (!done.has(ex.id)) {
          done.add(ex.id);
          seen.add(ex.id);
          expect(await pg.evaluate(() => window.scrollY), `${ex.id}: scrolled at start`).toBe(0);
          for (const w of [...ex.tokens].reverse()) await place(pg, w);
          await action(pg).click();
          await expect(statusP(pg)).toContainText("✗");
          // Wrong order for this focus, unless the reverse happens to be accepted (then it shows ✓: still fine).
          expect(await pg.evaluate(() => window.scrollY), `${ex.id}: pg had to scroll`).toBe(0);
          await expectBelowHeader(pg, builder(pg).locator(".card-hero").first());
          await expectClearOfBar(pg, bankZone(pg));
          await expectClearOfBar(pg, answerZone(pg));
          await expect(statusP(pg)).toBeInViewport();
        }
        await bar(pg).locator("button").nth(1).click(); // Skip: next sentence
      }
      await pg.close();
      expect(done.size, `focus ${focus}: not every sentence was shown`).toBe(inFocus.length);
    }
    expect(seen.size).toBe(EXERCISES.length);
  });
}

for (const locale of ["en", "fa"] as const) {
  test(`chip names state where the word is and update when moved; Details is labelled (${locale})`, async ({ page }) => {
    await seed(page);
    await page.goto(`/${locale}/sentences`);
    const ex = await current(page, locale);
    const liveBefore = await page.evaluate(() => document.querySelectorAll("body [aria-live], body [role=status], body [role=alert]").length);

    const bankName = await chips(bankZone(page)).first().getAttribute("aria-label");
    expect(bankName).toMatch(locale === "en" ? /in the word bank/ : /بانک واژه/);

    const [w1, w2] = [ex.tokens[0], ex.tokens[1]];
    await place(page, w1);
    await place(page, w2);
    const answer = chips(answerZone(page));
    const pos = (n: number) => (locale === "en" ? new RegExp(`position ${n} of 2 in your sentence`) : new RegExp(`جایگاه ${n} از 2`));
    await expect(answer.nth(0)).toHaveAttribute("aria-label", new RegExp(`^${w1}`));
    await expect(answer.nth(0)).toHaveAttribute("aria-label", pos(1));
    await expect(answer.nth(1)).toHaveAttribute("aria-label", pos(2));

    // Move w1 one to the right with the keyboard: its name now says position 2, focus stays on it.
    await answer.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    const moved = answer.filter({ has: page.locator(`span.text-lg:text-is("${w1}")`) });
    await expect(moved).toHaveAttribute("aria-label", pos(2));
    await expect(answer.filter({ has: page.locator(`span.text-lg:text-is("${w2}")`) })).toHaveAttribute("aria-label", pos(1));

    // No extra live region was added for any of this.
    expect(await page.evaluate(() => document.querySelectorAll("body [aria-live], body [role=status], body [role=alert]").length)).toBe(liveBefore);

    const details = bar(page).locator("button[data-details]");
    await expect(details).toHaveAttribute("aria-label", /.+/);
    await expect(details).toHaveAttribute("title", /.+/);
    const visibleLabel = details.locator("span.text-sm");
    if (page.viewportSize()!.width >= 640) await expect(visibleLabel).toBeVisible();
    else await expect(visibleLabel).toBeHidden();
  });
}
