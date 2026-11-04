import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Visible = inside the viewport AND not covered by the fixed bottom bar. */
async function expectAboveBar(page: Page, selector: string) {
  const box = (await page.locator(selector).boundingBox())!;
  const bar = (await page.locator("[data-action-button]").locator("xpath=ancestor::*[@data-bottom-chrome]").boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(Math.min(vh, bar.y) + 1);
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`verb drill (${locale})`, () => {
    test("answering shows feedback and Next without scrolling", async ({ page }) => {
      await page.goto(`/${locale}/verbs?practice=1`);
      await page.locator("#verb-answer").fill("x");
      const groups = page.getByRole("radiogroup");
      if ((await groups.count()) > 1) await groups.nth(1).getByRole("radio").first().click(); // Perfekt: pick auxiliary

      const action = page.locator("[data-action-button]");
      await action.click(); // Check
      const feedback = page.locator("main [role=status].min-h-feedback");
      await expect(feedback).not.toBeEmpty();
      await expect(feedback).toBeInViewport();
      await expect(action).toBeInViewport();
      await expect(action).toBeFocused(); // focus never dropped
      await expectAboveBar(page, "main [role=status].min-h-feedback > div");

      await action.click(); // Next -> new question, input focused again
      await expect(page.locator("#verb-answer")).toBeFocused();
      await expect(page.locator("#verb-answer")).toHaveValue("");
    });

    test("disabled Check says what is missing", async ({ page }) => {
      await page.goto(`/${locale}/verbs?practice=1`);
      const action = page.locator("[data-action-button]");
      await expect(action).toHaveAttribute("aria-disabled", "true");
      await expect(page.locator("[data-action-button]").locator("xpath=preceding-sibling::p")).not.toBeEmpty();
    });

    test("reset asks for confirmation", async ({ page }) => {
      await page.goto(`/${locale}/verbs?practice=1`);
      await page.locator("section button.btn-ghost").last().click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    });

    test("leaving the drill restores the mobile bottom nav", async ({ page, isMobile }) => {
      await page.goto(`/${locale}/verbs?practice=1`);
      await expect(page.locator("html")).toHaveAttribute("data-action-bar", "");
      if (isMobile) await expect(page.locator("nav.app-bottom-nav")).toBeHidden();

      await page.locator("header a[href$='/" + locale + "']").first().click(); // logo -> Home (client navigation)
      await expect(page).toHaveURL(new RegExp(`/${locale}$`));
      await expect(page.locator("html")).not.toHaveAttribute("data-action-bar", "");
      if (isMobile) await expect(page.locator("nav.app-bottom-nav")).toBeVisible();
    });
  });
}
