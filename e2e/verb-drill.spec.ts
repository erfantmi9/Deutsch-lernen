import { expect, test } from "@playwright/test";
import { installFakeKeyboard } from "./helpers";
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

// Typed drill with the on-screen keyboard (a faked ~290px one that opens/closes with focus).
test("verb drill with the keyboard open: question + field above the keyboard bar; answering closes the keyboard and the feedback fits", async ({ page, isMobile }) => {
  test.skip(!isMobile, "an on-screen keyboard only exists on phones");
  await installFakeKeyboard(page, 290);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("deutsch-learner:verbs", JSON.stringify({ state: { score: 0, streak: 0, bestStreak: 0, wrongVerbIds: [], mode: "present" }, version: 1 }));
    }
  });
  await page.goto("/en/verbs?practice=1");
  const field = page.locator("#verb-answer");
  await field.focus();
  const bar = page.locator("[data-action-button]").locator("xpath=ancestor::*[@data-bottom-chrome]");
  const card = page.locator("#drill-title ~ form .card-hero, section form .card-hero").first();
  const vh = page.viewportSize()!.height;
  const headerBottom = async () => {
    const h = (await page.locator("header.sticky").boundingBox())!;
    return h.y + h.height;
  };

  await expect(bar.locator("[role=group]")).toHaveCount(1); // umlaut keys in the bar
  await expect(async () => {
    const b = (await bar.boundingBox())!;
    expect(Math.abs(b.y + b.height - (vh - 290))).toBeLessThanOrEqual(1);
    expect(b.height).toBeLessThan(80);
    const f = (await field.boundingBox())!;
    expect(f.y + f.height).toBeLessThanOrEqual(b.y + 0.5);
    expect((await card.boundingBox())!.y).toBeGreaterThanOrEqual((await headerBottom()) - 0.5);
  }).toPass({ timeout: 4000 });

  await field.fill("x");
  await page.keyboard.press("Enter"); // answer: the field blurs, the keyboard closes
  const feedback = page.locator("main [role=status].min-h-feedback > div");
  await expect(feedback).toBeVisible();
  await expect(page.locator("[data-action-button]")).toBeFocused();
  await expect(async () => {
    const b = (await bar.boundingBox())!;
    expect(Math.abs(b.y + b.height - vh)).toBeLessThanOrEqual(1);
    const fb = (await feedback.boundingBox())!;
    expect(fb.y + fb.height).toBeLessThanOrEqual(b.y + 0.5);
    expect((await card.boundingBox())!.y).toBeGreaterThanOrEqual((await headerBottom()) - 0.5);
  }).toPass({ timeout: 4000 });
});
