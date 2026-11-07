import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// Destructive actions must ask first. The dialog opens with Cancel focused (the safe choice); cancelling changes nothing.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
const dialog = (page: Page) => page.locator("dialog[open]");
const cancel = (page: Page) => dialog(page).locator(".border-t button").first();
const confirmBtn = (page: Page) => dialog(page).locator(".border-t button").last();

async function expectAsks(page: Page, trigger: ReturnType<Page["locator"]>) {
  await trigger.click();
  await expect(dialog(page)).toBeVisible();
  await expect(cancel(page)).toBeFocused();
  await cancel(page).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

for (const locale of ["en", "fa"] as const) {
  const m = M[locale];
  test.describe(`confirmations (${locale})`, () => {
    for (const [route, ns] of [
      ["grammar", "Grammar"],
      ["dialogues", "Dialogues"],
      ["reading", "Reading"],
    ] as const) {
      test(`${route}: reset progress asks first`, async ({ page }) => {
        await page.goto(`/${locale}/${route}`);
        await expectAsks(page, page.getByRole("button", { name: m[ns].reset, exact: true }));
      });
    }

    test("numbers drill: reset asks; switching kind with an unchecked answer asks", async ({ page }) => {
      await page.goto(`/${locale}/numbers`);
      await page.getByRole("group", { name: m.Numbers.tabsLabel }).getByRole("button", { name: m.Numbers.tabs.practice, exact: true }).click();
      await expectAsks(page, page.getByRole("button", { name: m.Numbers.practice.reset, exact: true }));

      await page.getByRole("button", { name: m.Numbers.practice.kinds.cardinal, exact: true }).click();
      const input = page.locator("section input[type=text], section input:not([type])").first();
      await input.fill("zwölf");
      await page.getByRole("button", { name: m.Numbers.practice.kinds.price, exact: true }).click();
      await expect(dialog(page)).toBeVisible();
      await cancel(page).click();
      await expect(input).toHaveValue("zwölf"); // nothing lost
      await page.getByRole("button", { name: m.Numbers.practice.kinds.price, exact: true }).click();
      await confirmBtn(page).click();
      await expect(page.getByRole("button", { name: m.Numbers.practice.kinds.price, exact: true })).toHaveAttribute("aria-pressed", "true");
    });

    test("vocabulary: Add all asks with the number of cards", async ({ page }) => {
      await page.goto(`/${locale}/vocabulary`);
      const addAll = page.locator("main button[aria-haspopup=dialog].btn-secondary");
      await addAll.click();
      await expect(dialog(page)).toBeVisible();
      await expect(dialog(page).locator("h2")).toContainText(/\d|[۰-۹]/);
      await cancel(page).click();
      await expect(dialog(page)).toHaveCount(0);
    });
  });
}
