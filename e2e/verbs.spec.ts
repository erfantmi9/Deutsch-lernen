import { expect, test } from "@playwright/test";

// Core rule: every action produces a visible result inside the current viewport, without scrolling.
for (const locale of ["en", "fa"] as const) {
  test.describe(`verbs (${locale})`, () => {
    test("selecting a verb shows its conjugation in the viewport", async ({ page }) => {
      await page.goto(`/${locale}/verbs`);
      const firstCard = page.locator("ul li a[href*='/verbs/']").first();
      await firstCard.click();

      await expect(page).toHaveURL(/\/verbs\/[^/?]+/);
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
      await expect(page.getByRole("tablist")).toBeInViewport();
      await expect(page.getByRole("table")).toBeInViewport({ ratio: 0.3 });
    });

    test("filtering updates the URL and results stay visible", async ({ page }) => {
      await page.goto(`/${locale}/verbs`);
      const chips = page.getByRole("group").getByRole("button");
      await chips.nth(1).click(); // first type chip after "All"

      await expect(page).toHaveURL(/[?&]type=/);
      await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("status").first()).toBeInViewport(); // "Showing N items"
      await expect(page.locator("ul li a[href*='/verbs/']").first()).toBeInViewport();
    });

    test("back link keeps the list filter", async ({ page }) => {
      await page.goto(`/${locale}/verbs?type=irregular`);
      await page.locator("ul li a[href*='/verbs/']").first().click();
      await expect(page).toHaveURL(/\/verbs\/[^/?]+\?type=irregular/);
      await page.locator("main a[href$=\"/verbs?type=irregular\"]").click();
      await expect(page).toHaveURL(/\/verbs\?type=irregular/);
    });
  });
}

test("detail page canonical points at the clean URL (no filter query)", async ({ page }) => {
  await page.goto("/en/verbs/sein?type=modal");
  const href = await page.locator("link[rel=canonical]").getAttribute("href");
  expect(href).toMatch(/\/en\/verbs\/sein$/);
  expect(href).not.toContain("?");
});
