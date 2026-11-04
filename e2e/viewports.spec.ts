import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
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
