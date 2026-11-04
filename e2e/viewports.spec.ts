import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, expectClearOfBar, seedQuiz } from "./helpers";

// Awkward-but-common viewports: a 1366x650 laptop and 150% browser zoom (a 1280x800 window = 853x533 CSS px at 1.5x).
// Feedback and the action bar must not overlap, and the question must not slide under the header.
const VIEWPORTS = [
  { name: "1366x650", viewport: { width: 1366, height: 650 }, deviceScaleFactor: 1 },
  { name: "zoom-150% (853x533)", viewport: { width: 853, height: 533 }, deviceScaleFactor: 1.5 },
] as const;

const action = (page: Page) => page.locator("[data-action-button]");

for (const v of VIEWPORTS) {
  test.describe(`viewport ${v.name}`, () => {
    test.use({ viewport: v.viewport, deviceScaleFactor: v.deviceScaleFactor });
    test.beforeEach(({}, testInfo) => test.skip(!testInfo.project.name.startsWith("desktop"), "viewport is set per test"));

    for (const locale of ["en", "fa"] as const) {
      test(`arcade wrong + correct feedback clears the bar (${locale})`, async ({ page }) => {
        await seedQuiz(page, false);
        await page.goto(`/${locale}/arcade`);
        const buttons = page.locator("section [role=group] button.candy");
        await expect(buttons).toHaveCount(3);
        for (let i = 0; i < 3; i++) await expectClearOfBar(page, buttons.nth(i));

        let seenCorrect = false;
        let seenWrong = false;
        for (let i = 0; i < 40 && !(seenCorrect && seenWrong); i++) {
          await buttons.nth(i % 3).click();
          await expect(action(page)).toHaveAttribute("aria-disabled", "false");
          const ok = await page.locator("main .feedback-success").isVisible();
          await expectClearOfBar(page, page.locator("main [role=status].min-h-feedback-sm > div"));
          await expect(action(page)).toBeInViewport(); // bar itself is on screen
          await expectBelowHeader(page, page.locator("section .card-hero").first());
          if (ok) seenCorrect = true;
          else seenWrong = true;
          await action(page).click();
          await expect(action(page)).toHaveAttribute("aria-disabled", "true");
        }
        expect(seenCorrect && seenWrong).toBe(true);
      });

      test(`verb drill feedback clears the bar (${locale})`, async ({ page }) => {
        await page.goto(`/${locale}/verbs?practice=1`);
        await page.locator("#verb-answer").fill("x");
        const groups = page.getByRole("radiogroup");
        if ((await groups.count()) > 1) await groups.nth(1).getByRole("radio").first().click();
        await action(page).click();
        await expect(page.locator("main [role=status].min-h-feedback > div")).toBeVisible();
        await expectClearOfBar(page, page.locator("main [role=status].min-h-feedback > div"));
        await expect(action(page)).toBeInViewport();
      });
    }
  });
}

// Sentences at the awkward viewports: after a wrong check the verdict must clear the bar (the page scrolls itself if
// the screen is too short for everything at once).
const SENTENCES = JSON.parse(readFileSync("data/sentences/a1.json", "utf8"));
const EX: { tokens: string[]; translations: Record<string, string> }[] = Array.isArray(SENTENCES) ? SENTENCES : SENTENCES.exercises;

for (const v of VIEWPORTS) {
  test.describe(`sentences @ ${v.name}`, () => {
    test.use({ viewport: v.viewport, deviceScaleFactor: v.deviceScaleFactor });
    test.beforeEach(({}, testInfo) => test.skip(!testInfo.project.name.startsWith("desktop"), "viewport is set per test"));

    for (const focus of ["v2", "time-manner-place"]) {
      test(`wrong check: feedback clears the bar (${focus})`, async ({ page }) => {
        await page.addInitScript((f) => {
          localStorage.setItem("deutsch-learner:sentences", JSON.stringify({ state: { solvedIds: [], wrongIds: [], streak: 0, bestStreak: 0, focus: f, lessonSeen: ["v2", "question", "modal-bracket", "separable-bracket", "subordinate-weil", "negation-nicht-kein", "time-manner-place"] }, version: 1 }));
        }, focus);
        await page.goto("/en/sentences");
        const shown = (await page.locator("#builder-title + p").innerText()).trim();
        const ex = EX.find((e) => e.translations.en === shown)!;
        const bank = page.locator("section[aria-labelledby=builder-title] div[role=group]").nth(1);
        for (const w of [...ex.tokens].reverse()) {
          await bank.locator("li[data-chip] button").filter({ has: page.locator(`span.text-lg:text-is("${w}")`) }).first().click();
        }
        await action(page).click();
        const fb = page.locator("section[aria-labelledby=builder-title] [role=status].min-h-feedback-sm > div");
        await expect(fb).toBeVisible();
        await expectClearOfBar(page, fb);
        await expect(action(page)).toBeInViewport();
      });
    }
  });
}
