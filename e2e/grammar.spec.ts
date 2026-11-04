import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, expectClearOfBar, installFakeKeyboard, shot } from "./helpers";

interface Ex {
  id: string;
  type: "choice" | "fill" | "transform";
  sentenceDe: string;
  options?: string[];
  answer: string;
}
const EXERCISES: Ex[] = JSON.parse(readFileSync("data/grammar/exercises/dative.json", "utf8"));
const LESSON = "dative";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const action = (page: Page) => page.locator("[data-action-button]");
const feedback = (page: Page) => page.locator("main [role=status].min-h-feedback");
const counter = (page: Page) => page.locator("#practice section dl dd").first();
const input = (page: Page) => page.locator("#practice section input:not([type=checkbox])").first();

async function openPractice(page: Page, locale: string) {
  await page.goto(`/${locale}/grammar/${LESSON}`);
  await page.locator("#practice").scrollIntoViewIfNeeded();
  await expect(action(page)).toBeVisible(); // the bar appears once the practice block is on screen
}

/** The exercise currently on screen, found by its sentence. */
async function current(page: Page): Promise<Ex> {
  let ex: Ex | undefined;
  // Polled: right after clicking Next the DOM may still show the previous (filled-in) sentence for a frame.
  await expect
    .poll(async () => {
      const shown = norm(await page.locator("#practice section p[lang=de]").first().innerText());
      ex = EXERCISES.find((e) => norm(e.sentenceDe.replace("___", "")) === shown);
      return ex !== undefined;
    })
    .toBe(true);
  return ex!;
}

/** Answers the current question; returns the exercise. Typed questions are submitted with the bar button. */
async function answer(page: Page, right: boolean): Promise<Ex> {
  const ex = await current(page);
  if (ex.type === "choice") {
    const pick = right ? ex.answer : ex.options!.find((o) => o !== ex.answer)!;
    await page.locator("#practice section [role=group] button", { hasText: new RegExp(`^${pick}$`) }).click();
  } else {
    await input(page).fill(right ? ex.answer : "xyz");
    await action(page).click();
  }
  await expect(page.locator("main .feedback-success, main .feedback-error")).toBeVisible();
  return ex;
}

/** After an answer: result under the question, clear of the bar, Next reachable, reserved height was enough. */
async function expectAnswerLayout(page: Page, heightBefore: number) {
  const region = feedback(page);
  await expectClearOfBar(page, region.locator("> div"));
  await expect(action(page)).toBeInViewport();
  const after = (await region.boundingBox())!.height;
  expect(after, "feedback outgrew its reserved height (layout jump)").toBeLessThanOrEqual(heightBefore + 1);
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`grammar (${locale})`, () => {
    test("the action bar only shows while practicing; the mobile nav comes back afterwards", async ({ page, isMobile }) => {
      await page.goto(`/${locale}/grammar/${LESSON}`);
      await expect(page.locator("html")).not.toHaveAttribute("data-action-bar", "");
      if (isMobile) await expect(page.locator("nav.app-bottom-nav")).toBeVisible();
      await page.locator("#practice").scrollIntoViewIfNeeded();
      await expect(page.locator("html")).toHaveAttribute("data-action-bar", "");
      if (isMobile) await expect(page.locator("nav.app-bottom-nav")).toBeHidden();
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(page.locator("html")).not.toHaveAttribute("data-action-bar", "");
    });

    test("whole session: feedback + Next stay in view, no layout jump; summary scrolls up and focuses its heading", async ({ page }, testInfo) => {
      await openPractice(page, locale);

      // Before answering: Next/Check is disabled and says what is missing.
      await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      await expect(action(page).locator("xpath=preceding-sibling::p")).not.toBeEmpty();
      const reserved = (await feedback(page).boundingBox())!.height;
      await expectBelowHeader(page, page.locator("#practice section .card-hero").first());
      await shot(page, testInfo, "grammar", locale, "1-before-answer");

      const total = EXERCISES.length;
      let shotCorrect = false;
      let shotWrong = false;
      for (let i = 0; i < total; i++) {
        const wantWrong = i === 0; // first question wrong, the rest right
        const ex = await answer(page, !wantWrong);
        await expectAnswerLayout(page, reserved);
        if (ex.type === "choice") await expect(action(page)).toBeFocused(); // focus parked on the persistent button
        else {
          await expect(input(page)).toHaveAttribute("readonly", ""); // read-only, not disabled: focus is kept
          await expect(input(page)).not.toBeDisabled();
          // Focus is never dropped: it is in the input (Enter flow) or on the persistent button (tap flow).
          await expect
            .poll(() => page.evaluate(() => document.activeElement?.tagName === "INPUT" || !!document.activeElement?.hasAttribute("data-action-button")))
            .toBe(true);
        }
        if (wantWrong && !shotWrong) {
          shotWrong = true;
          await shot(page, testInfo, "grammar", locale, "3-after-wrong");
        } else if (!wantWrong && !shotCorrect) {
          shotCorrect = true;
          await shot(page, testInfo, "grammar", locale, "2-after-correct");
        }
        await action(page).click(); // Next (or Finish on the last one)
        if (i < total - 1) await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      }

      // Summary: heading focused and on screen, card top below the header (scrolled to the top), actions in the bar.
      const heading = page.locator("section ~ *, main").locator("h3[tabindex='-1']").first();
      await expect(heading).toBeFocused();
      await expectBelowHeader(page, page.locator("main .card-hero:has(h3[tabindex='-1'])"));
      await expect(heading).toBeInViewport();
      await expect(action(page)).toBeInViewport();
      await expect(action(page).locator("xpath=ancestor::*[@data-bottom-chrome]").locator("a[href$='/grammar']")).toBeInViewport();
      await shot(page, testInfo, "grammar", locale, "4-summary");

      await action(page).click(); // Practice again
      await expect(counter(page)).toContainText(`1 / ${total}`);
    });

    test("double Enter / double click on Next never skips a question", async ({ page }) => {
      await openPractice(page, locale);
      const num = async () => Number((await counter(page).innerText()).split("/")[0]);

      // Typed question: Enter submits, Enter goes on, a second quick Enter must not skip.
      for (let i = 0; i < EXERCISES.length; i++) {
        const ex = await current(page);
        if (ex.type === "choice") {
          await answer(page, true);
          await action(page).click();
          continue;
        }
        await input(page).fill(ex.answer);
        await page.keyboard.press("Enter"); // check
        await expect(page.locator("main .feedback-success")).toBeVisible();
        const before = await num();
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await expect(counter(page)).toContainText(`${before + 1} /`);
        await page.waitForTimeout(300);
        expect(await num()).toBe(before + 1);
        break;
      }

      // Same-tick double click on the bar.
      for (let i = 0; i < EXERCISES.length; i++) {
        const left = await num();
        if (left >= EXERCISES.length) break;
        await answer(page, true);
        await page.evaluate(() => {
          const b = document.querySelector<HTMLElement>("[data-action-button]")!;
          b.click();
          b.click();
        });
        await expect(counter(page)).toContainText(`${left + 1} /`);
        await page.waitForTimeout(200);
        expect(await num()).toBe(left + 1);
        break;
      }
    });

    test("typed question with the keyboard open: question + field above the bar; after answering the keyboard closes and question + feedback fit", async ({ page, isMobile }) => {
      test.skip(!isMobile, "an on-screen keyboard only exists on phones");
      await installFakeKeyboard(page, 290); // ~290px keyboard; it opens/closes with focus, like a phone
      await openPractice(page, locale);

      // Find a typed question (answering the others correctly).
      let ex = await current(page);
      for (let i = 0; i < EXERCISES.length && ex.type === "choice"; i++) {
        await answer(page, true);
        await action(page).click();
        ex = await current(page);
      }
      expect(ex.type).not.toBe("choice");
      const field = input(page);
      const bar = action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
      const card = page.locator("#practice form .card-hero");
      const vh = page.viewportSize()!.height;
      const headerBottom = async () => (await page.locator("header.sticky").boundingBox())!.y + (await page.locator("header.sticky").boundingBox())!.height;

      // Keyboard closed (a typed question reached after answering others is auto-focused, so blur first): umlaut
      // keys inline in the form, not in the bar.
      await field.evaluate((el) => (el as HTMLInputElement).blur());
      await expect(page.locator("form [role=group]")).toHaveCount(1);
      await expect(bar.locator("[role=group]")).toHaveCount(0);

      // Focus opens the (fake) keyboard.
      await field.focus();
      await expect(bar.locator("[role=group]")).toHaveCount(1); // umlaut keys moved into the bar
      await expect(page.locator("form [role=group]")).toHaveCount(0);
      await expect(async () => {
        const b = (await bar.boundingBox())!;
        expect(Math.abs(b.y + b.height - (vh - 290))).toBeLessThanOrEqual(1); // bar sits right above the keyboard
        const barTop = b.y;
        const c = (await card.boundingBox())!;
        const f = (await field.boundingBox())!;
        expect(c.y).toBeGreaterThanOrEqual((await headerBottom()) - 0.5); // question card not under the header
        expect(f.y + f.height).toBeLessThanOrEqual(barTop + 0.5); // field not under the bar
        expect(f.y + f.height).toBeLessThanOrEqual(vh - 290); // ...and inside the visual viewport
      }).toPass({ timeout: 4000 });
      // One row only: the bar did not grow a second row for the umlaut keys.
      expect((await bar.boundingBox())!.height).toBeLessThan(80);

      // Umlaut key: inserts, keeps focus (keyboard stays).
      await bar.locator("[role=group] button").first().click();
      await expect(field).toBeFocused();
      await expect(field).toHaveValue(/[äöüß]/);

      // Answer with the keyboard open (Enter): the field blurs, the keyboard closes, focus parks on the bar button.
      await field.fill(ex.answer);
      await page.keyboard.press("Enter");
      await expect(page.locator("main .feedback-success, main .feedback-error")).toBeVisible();
      await expect(action(page)).toBeFocused();
      await expect(async () => {
        const b = (await bar.boundingBox())!;
        expect(Math.abs(b.y + b.height - vh)).toBeLessThanOrEqual(1); // keyboard gone, bar back at the bottom
        const c = (await card.boundingBox())!;
        const fb = (await feedback(page).locator("> div").boundingBox())!;
        expect(c.y).toBeGreaterThanOrEqual((await headerBottom()) - 0.5); // question AND feedback in view,
        expect(fb.y + fb.height).toBeLessThanOrEqual(b.y + 0.5); // above the bar
      }).toPass({ timeout: 4000 });
      await expect(page.locator("form [role=group]")).toHaveCount(1); // umlaut keys back inline
    });
  });
}
