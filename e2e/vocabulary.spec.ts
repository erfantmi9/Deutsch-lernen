import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { shot } from "./helpers";

// Vocabulary: topic grid -> topic word list (pills, search, expandable rows, practice bar) -> topic practice round.
const allLiveRegions = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]")].filter(
        (el) => !el.closest("next-route-announcer"),
      ).length,
  );

for (const locale of ["en", "fa"] as const) {
  test.describe(`vocabulary (${locale})`, () => {
    test("topic grid lists every topic and opens one", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary`);
      await expect(page.locator("main a[data-topic]")).toHaveCount(23);
      expect(await allLiveRegions(page)).toBe(1);
      // The deck loads on the client; each tile then names its review share for screen readers.
      await expect(page.locator("main a[data-topic=family] .sr-only")).toHaveText(/\p{Nd}/u);
      await shot(page, testInfo, "vocabulary", locale, "topics");

      await page.locator("main a[data-topic=family]").click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/vocabulary/family$`));
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator("main [data-word-row]").first()).toBeVisible();
    });

    test("search: results, then nothing found with a way back to the topics", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary`);
      const search = page.locator("main input[type=search]");
      await search.fill("Vater");
      await expect(page.locator("main [data-word-row]").first()).toContainText("Vater");
      await expect(page.locator("main a[data-topic]")).toHaveCount(0);

      await search.fill("zzzzqqq");
      await expect(page.locator("main [data-word-row]")).toHaveCount(0);
      await shot(page, testInfo, "vocabulary", locale, "empty");
      await expect(page.locator("main a[href$='/vocabulary/family']")).toBeVisible(); // a suggested topic
      await page.getByRole("button", { name: /Clear search|پاک کردن جستجو/ }).last().click();
      await expect(search).toHaveValue("");
      await expect(search).toBeFocused();
      await expect(page.locator("main a[data-topic]")).toHaveCount(23);
      expect(await allLiveRegions(page)).toBe(1);
    });

    test("topic page: pills filter, a row opens in place, adding marks it", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary/family`);
      const rows = page.locator("main [data-word-row]");
      const all = await rows.count();
      const pills = page.locator("main [role=group] button");
      const first = (await pills.first().boundingBox())!;
      const last = (await pills.last().boundingBox())!;
      expect(Math.abs(first.y - last.y)).toBeLessThan(2); // one scrollable row
      await pills.nth(1).click();
      await expect(pills.nth(1)).toHaveAttribute("aria-pressed", "true");
      await expect.poll(() => rows.count()).toBeLessThan(all);

      const toggle = rows.first().locator("button[aria-expanded]");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const add = rows.first().locator("button[data-add-review]");
      await expect(add).not.toHaveAttribute("aria-busy", "true");
      await add.click();
      await expect(add).toHaveAttribute("aria-pressed", "true");
      await expect(rows.first().getByText(/In your review deck|در مرور تو هست/)).toHaveCount(1);
      await shot(page, testInfo, "vocabulary", locale, "topic-open");
      expect(await allLiveRegions(page)).toBe(1);

      // The practice bar stays in view above the bottom navigation and starts the selected sub-topic.
      const cta = page.locator("main a[data-practice-link]");
      await expect(cta).toBeInViewport();
      await expect(cta).toHaveAttribute("href", /\/vocabulary\/family\/practice\?sub=/);
    });

    test("the colour tip shows with the colour adjectives", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary/adjectives?sub=color`);
      await expect(page.locator("main [role=group] button[aria-pressed=true]")).not.toHaveText(/All|همه/);
      await expect(page.locator("main bdi", { hasText: "dunkelblau" }).first()).toBeVisible();
      await shot(page, testInfo, "vocabulary", locale, "colours");
    });

    test("practice round: ten questions, then a summary", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/vocabulary/family/practice`);
      const next = page.locator("[data-action-button]");
      for (let i = 0; i < 10; i++) {
        const options = page.locator("main [data-option]");
        await expect(options).toHaveCount(4);
        await options.first().click();
        await expect(options.first()).toHaveAttribute("data-result", /correct|wrong/);
        if (i === 0) await shot(page, testInfo, "vocabulary", locale, "practice");
        await next.click();
      }
      await expect(page.locator("#practice-summary")).toBeVisible();
      await expect(next).toHaveCount(0);
      await shot(page, testInfo, "vocabulary", locale, "practice-summary");
    });
  });
}
