import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };

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
      const chips = page.getByRole("group", { name: M[locale].Verbs.filterByType }).getByRole("button");
      await chips.nth(1).click(); // first type chip after "All"

      await expect(page).toHaveURL(/[?&]type=/);
      await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("status").first()).toBeInViewport(); // "Showing N items"
      await expect(page.locator("ul li a[href*='/verbs/']").first()).toBeInViewport();
    });

    test("usage filter: essentials first, then only the chosen level", async ({ page }) => {
      await page.goto(`/${locale}/verbs`);
      const cards = page.locator("ul li a[href*='/verbs/']");
      // Unfiltered, the list starts with the essential verbs.
      await expect(cards.first().locator("[data-usage]")).toHaveAttribute("data-usage", "essential");
      await page.getByRole("group", { name: M[locale].Verbs.filterByUsage }).getByRole("button", { name: M[locale].Verbs.usages.useful }).click();
      await expect(page).toHaveURL(/[?&]usage=useful/);
      await expect(cards.first()).toBeInViewport();
      const levels = await cards.locator("[data-usage]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-usage")))]);
      expect(levels).toEqual(["useful"]);
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
