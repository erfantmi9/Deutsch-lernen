import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { MODULE_MINUTES } from "../types/exam";
import { bottomChromeTop, installFakeKeyboard, shot } from "./helpers";

const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const status = (page: Page) => action(page).locator("xpath=preceding-sibling::p");
const dialog = (page: Page) => page.locator("dialog[open]");
/** Persian/Arabic-Indic digits to Latin, so assertions do not depend on the locale's numerals. */
const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Confirm button of the open ConfirmDialog (cancel is first, confirm last). */
const confirm = (page: Page) => dialog(page).locator(".border-t button").last();
const cancel = (page: Page) => dialog(page).locator(".border-t button").first();

/** Start screen: the n-th "practise this part" button (0 lesen, 1 hoeren, 2 schreiben, 3 sprechen). */
const practiseButton = (page: Page, n: number) => page.locator("main ul.grid > li").nth(n).locator("button");
const startFull = (page: Page) => page.locator("main button.btn-primary.w-full");

async function startPart(page: Page, n: number) {
  await practiseButton(page, n).click();
  await expect(dialog(page)).toBeVisible();
  await confirm(page).click();
  await expect(page.locator("[role=timer]")).toBeVisible();
}

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

for (const locale of ["en", "fa"] as const) {
  test.describe(`exam (${locale})`, () => {
    test("the timer only starts after a confirmation; cancelling changes nothing", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/exam`);
      await shot(page, testInfo, "exam", locale, "1-start");

      await practiseButton(page, 2).click();
      await expect(dialog(page)).toBeVisible();
      expect(latin(await dialog(page).innerText())).toContain(String(MODULE_MINUTES.schreiben)); // the minutes are in the question
      await expect(cancel(page)).toBeFocused(); // the safe choice is the default
      await shot(page, testInfo, "exam", locale, "2-confirm-start");
      await cancel(page).click();
      await expect(dialog(page)).toHaveCount(0);
      await expect(page.locator("[role=timer]")).toHaveCount(0); // no part, no timer
      await expect(practiseButton(page, 2)).toBeFocused(); // focus came back to the trigger

      await practiseButton(page, 2).click();
      await page.keyboard.press("Escape");
      await expect(page.locator("[role=timer]")).toHaveCount(0);
    });

    test("Schreiben: progress in the bar, hand-in confirmation with the unanswered count, focus on the next screen; screenshots", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/exam`);
      await startPart(page, 2);

      // New screen: heading focused, at the top; one live region only (the timer warnings), the bar status is plain text.
      await expect(page.locator("h1#exam-focus")).toBeFocused();
      expect(await scrollY(page)).toBe(0);
      await expect(status(page)).not.toHaveAttribute("role", "status");
      await expect(status(page)).not.toHaveAttribute("aria-live", /.*/);
      expect(await page.locator("[aria-live=polite]:not(:empty), [role=status]:not(:empty)").count()).toBe(0);

      const total = 6; // 5 form fields + the message
      expect(latin(await status(page).innerText())).toContain(`0/${total}`);
      await shot(page, testInfo, "exam", locale, "3-part-start");

      const inputs = page.locator("main input[type=text]");
      await inputs.nth(0).fill("Müller");
      await inputs.nth(1).fill("Anna");
      await expect(async () => expect(latin(await status(page).innerText())).toContain(`2/${total}`)).toPass();
      expect(latin(await status(page).innerText())).toMatch(/·/); // "Missing: …" follows the count
      await shot(page, testInfo, "exam", locale, "4-part-filled");

      // Hand in: the dialog says how many are open; Esc keeps working on the part.
      await action(page).click();
      await expect(dialog(page)).toBeVisible();
      const message = latin(await dialog(page).innerText());
      expect(message).toContain(String(total - 2));
      expect(message).toContain(String(total));
      await shot(page, testInfo, "exam", locale, "5-confirm-handin");
      await page.keyboard.press("Escape");
      await expect(dialog(page)).toHaveCount(0);
      await expect(page.locator("[role=timer]")).toBeVisible();
      await expect(action(page)).toBeFocused(); // back on the trigger

      // Confirm: result screen, heading focused, scrolled to the top, bar and nav state restored.
      await action(page).click();
      await confirm(page).click();
      await expect(page.locator("h1#exam-focus")).toBeFocused();
      await expect(page.locator("[role=timer]")).toHaveCount(0);
      expect(await scrollY(page)).toBe(0);
      await expect(page.locator("html")).not.toHaveAttribute("data-action-bar", "");
      await shot(page, testInfo, "exam", locale, "6-result");
    });

    test("full run: heading focus on every transition; a double-clicked hand-in counts once", async ({ page }) => {
      await page.goto(`/${locale}/exam`);
      await startFull(page).click();
      await expect(dialog(page)).toBeVisible();
      await confirm(page).click();
      await expect(page.locator("h1#exam-focus")).toBeFocused(); // part 1 (Lesen)

      await action(page).click();
      // Same-tick double click on "Hand in": one result, one transition.
      await confirm(page).evaluate((el) => {
        (el as HTMLElement).click();
        (el as HTMLElement).click();
      });
      await expect(page.locator("h2#exam-focus")).toBeFocused(); // between parts
      expect(await scrollY(page)).toBe(0);
      await page.locator("main button.btn-primary").click(); // Continue
      await expect(page.locator("h1#exam-focus")).toBeFocused(); // part 2 (Hören)
      await expect(page.locator("[role=timer]")).toBeVisible();
    });

    test("the part is handed in by itself when the time is up (no confirmation)", async ({ page }) => {
      await page.clock.install();
      await page.goto(`/${locale}/exam`);
      await startPart(page, 2);
      await page.clock.fastForward("26:00");
      await expect(page.locator("h1#exam-focus")).toBeFocused();
      await expect(page.locator("[role=timer]")).toHaveCount(0);
      await expect(dialog(page)).toHaveCount(0);
    });

    test("the end of a long part is not covered by the bar", async ({ page }) => {
      await page.goto(`/${locale}/exam`);
      await startPart(page, 0); // Lesen: three texts, many tasks
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(async () => {
        const top = await bottomChromeTop(page);
        const last = (await page.locator("main section").last().boundingBox())!;
        expect(last.y + last.height).toBeLessThanOrEqual(top + 1);
      }).toPass({ timeout: 3000 });
    });
  });
}

test.describe("Schreiben with the on-screen keyboard", () => {
  test("the umlaut keys move into the bar above the keyboard, insert into the focused field and keep the keyboard", async ({ page, isMobile }) => {
    test.skip(!isMobile, "an on-screen keyboard only exists on phones");
    await installFakeKeyboard(page, 290);
    await page.goto("/en/exam");
    await startPart(page, 2);
    const vh = page.viewportSize()!.height;

    // Keyboard closed: the keys are inline under the message, not in the bar.
    await page.locator("main textarea").evaluate((el) => (el as HTMLTextAreaElement).blur());
    await expect(bar(page).locator("[role=group]")).toHaveCount(0);
    await expect(page.locator("main section [role=group]")).toHaveCount(1);

    // Focus the SECOND form field: the keys go to the bar, one row, directly above the keyboard.
    const field = page.locator("main input[type=text]").nth(1);
    await field.focus();
    await expect(bar(page).locator("[role=group]")).toHaveCount(1);
    await expect(page.locator("main section [role=group]")).toHaveCount(0);
    await expect(async () => {
      const b = (await bar(page).boundingBox())!;
      expect(Math.abs(b.y + b.height - (vh - 290))).toBeLessThanOrEqual(1);
      expect(b.height).toBeLessThan(80); // still one row
      const f = (await field.boundingBox())!;
      expect(f.y + f.height).toBeLessThanOrEqual(b.y + 0.5); // the field is not under the bar
    }).toPass({ timeout: 4000 });

    // The key inserts into THAT field, and focus (the keyboard) stays.
    await field.fill("Mi");
    await bar(page).locator("[role=group] button").first().click(); // ä
    await expect(field).toHaveValue(/Mi.*ä|äMi|M.*ä/);
    await expect(field).toBeFocused();
    await expect(page.locator("main textarea")).toHaveValue(""); // not the message

    // Hand-in works with the keyboard open and the confirmation fits above it.
    await action(page).click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
