import { expect, test } from "@playwright/test";
import { shot } from "./helpers";

// Search writes its query back to ?q= (debounced replaceState), so Back from a result restores the same results.
for (const locale of ["en", "fa"] as const) {
  test.describe(`search (${locale})`, () => {
    test("query goes into the URL and Back from a result restores input and results", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/search`);
      const input = page.locator("main input[type=search]");
      await input.fill("Haus");
      await expect(page).toHaveURL(/[?&]q=Haus/);
      const results = page.locator("main ul li a");
      await expect(results.first()).toBeVisible();
      const count = await results.count();
      const status = await page.locator("main [role=status]").textContent();
      await shot(page, testInfo, "search", locale, "results");

      await results.first().click();
      await expect(page).not.toHaveURL(/\/search/);
      await page.goBack();

      await expect(page).toHaveURL(/\/search\?q=Haus/);
      await expect(input).toHaveValue("Haus");
      await expect(results).toHaveCount(count);
      await expect(page.locator("main [role=status]")).toHaveText(status!);
      await shot(page, testInfo, "search", locale, "restored");
    });

    test("clearing the field removes q from the URL; history does not grow while typing", async ({ page }) => {
      await page.goto(`/${locale}/search`);
      const length = await page.evaluate(() => history.length);
      const input = page.locator("main input[type=search]");
      await input.pressSequentially("Brot", { delay: 30 });
      await expect(page).toHaveURL(/q=Brot/);
      await input.fill("");
      await expect(page).not.toHaveURL(/q=/);
      expect(await page.evaluate(() => history.length)).toBe(length);
      expect(await page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length)).toBe(1);
    });
  });
}
