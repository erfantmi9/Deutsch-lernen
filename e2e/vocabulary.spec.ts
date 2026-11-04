import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { shot } from "./helpers";

// Vocabulary: sticky FilterBar (kind pills, topic pills, search, "Showing N" count). The count is the page's only live region.
const liveRegions = (page: Page) =>
  page.evaluate(() => document.querySelectorAll("main [role=status], main [aria-live=polite], main [aria-live=assertive]").length);
const allLiveRegions = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]")].filter(
        (el) => !el.closest("next-route-announcer"),
      ).length,
  );

/** Records every text change of the FilterBar count, so a single filter change is shown to announce exactly once. */
async function watchCount(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __countChanges: string[] };
    w.__countChanges = [];
    const el = document.querySelector("main [role=status]")!;
    new MutationObserver(() => w.__countChanges.push(el.textContent ?? "")).observe(el, { childList: true, characterData: true, subtree: true });
  });
}
const countChanges = (page: Page) => page.evaluate(() => (window as unknown as { __countChanges: string[] }).__countChanges);

for (const locale of ["en", "fa"] as const) {
  test.describe(`vocabulary (${locale})`, () => {
    test("filter bar sticks under the header, stays small and holds the one live count", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary`);
      const bar = page.locator("main div.sticky").filter({ has: page.locator("input[type=search]") });
      const status = bar.getByRole("status");
      await expect(status).toHaveText(/\p{Nd}/u);
      expect(await allLiveRegions(page)).toBe(1);
      expect(await liveRegions(page)).toBe(1);

      const vh = page.viewportSize()!.height;
      const height = (await bar.boundingBox())!.height;
      expect(height).toBeLessThanOrEqual(vh * 0.4);

      // Kind and topic pills are single scrollable rows, so they never wrap into a tall block.
      for (const group of await bar.getByRole("group").all()) {
        const pills = group.getByRole("button");
        const first = (await pills.first().boundingBox())!;
        const last = (await pills.last().boundingBox())!;
        expect(Math.abs(first.y - last.y)).toBeLessThan(2);
      }

      await shot(page, testInfo, "vocabulary", locale, "top");
      await page.mouse.wheel(0, 1500);
      await expect(async () => {
        const header = (await page.locator("header").first().boundingBox())!;
        const box = (await bar.boundingBox())!;
        expect(Math.abs(box.y - (header.y + header.height))).toBeLessThan(2);
      }).toPass({ timeout: 3000 });
      await expect(status).toBeInViewport();
      await shot(page, testInfo, "vocabulary", locale, "scrolled");
    });

    test("count updates once per filter change", async ({ page }) => {
      await page.goto(`/${locale}/vocabulary`);
      const status = page.locator("main [role=status]");
      await expect(status).toHaveText(/\p{Nd}/u);
      const before = await status.textContent();
      await watchCount(page);
      await page.locator("main [role=group]").nth(1).getByRole("button").nth(1).click(); // first topic
      await expect(status).not.toHaveText(before!);
      await page.waitForTimeout(300);
      expect(await countChanges(page)).toHaveLength(1);
      expect(await allLiveRegions(page)).toBe(1);
    });

    test("empty state: Clear filters resets kind, topic and query and focuses the search", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary`);
      await page.getByRole("button", { name: /Adjectives|صفت/ }).first().click();
      const search = page.locator("main input[type=search]");
      await search.fill("zzzzqqq");
      const clear = page.locator("main .card button");
      await expect(clear).toBeVisible();
      await expect(clear).toBeInViewport();
      await shot(page, testInfo, "vocabulary", locale, "empty");
      await clear.click();
      await expect(search).toHaveValue("");
      await expect(search).toBeFocused();
      await expect(page.locator("main [role=group]").first().getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main [role=group]").nth(1).getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main ul li.card").first()).toBeVisible();
      expect(await allLiveRegions(page)).toBe(1);
    });

    test("add-all result is shown without adding a second live region", async ({ page }) => {
      await page.goto(`/${locale}/vocabulary`);
      await page.locator("main [role=group]").nth(1).getByRole("button").nth(1).click();
      await page.locator("main button[aria-haspopup=dialog].btn-secondary").click();
      await page.locator("dialog[open] button.btn-primary").click();
      const result = page.getByTestId("add-all-result");
      await expect(result).toBeVisible();
      await expect(result).toBeFocused();
      expect(await allLiveRegions(page)).toBe(1);
    });
  });
}
