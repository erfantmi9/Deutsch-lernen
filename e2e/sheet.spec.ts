import { expect, test } from "@playwright/test";
import { seedQuiz } from "./helpers";

// Regression: dialogs rendered inside a Tailwind space-y-* parent used to inherit that parent's margin-top (it
// out-specifies the sheet rules), so bottom sheets sat at the TOP of the screen and confirmations were not centred.

for (const locale of ["en", "fa"] as const) {
  test(`bottom sheet / side panel sit at their edge (${locale})`, async ({ page, isMobile }) => {
    await seedQuiz(page, false);
    await page.goto(`/${locale}/arcade`); // the quiz section is a space-y-4 parent
    await page.locator("section [role=group] button.candy").first().click();
    await expect(page.locator("[data-action-button]")).toHaveAttribute("aria-disabled", "false");
    await page.locator("[data-bottom-chrome] button[aria-haspopup=dialog]").click();
    const dlg = page.locator("dialog[open]");
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(400); // slide-in animation
    const r = (await dlg.boundingBox())!;
    const { width, height } = page.viewportSize()!;
    if (isMobile) {
      expect(Math.abs(r.y + r.height - height)).toBeLessThanOrEqual(1); // bottom sheet: flush with the bottom edge
      expect(r.width).toBeGreaterThanOrEqual(width - 1);
    } else if (locale === "en") {
      expect(Math.abs(r.x + r.width - width)).toBeLessThanOrEqual(1); // side panel docks to the END edge (right)...
      expect(r.height).toBeGreaterThanOrEqual(height - 1);
    } else {
      expect(Math.abs(r.x)).toBeLessThanOrEqual(1); // ...which is the left edge in RTL
      expect(r.height).toBeGreaterThanOrEqual(height - 1);
    }
  });

  test(`confirmation dialogs are centred (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/exam`); // start screen: a space-y-6 parent
    await page.locator("main ul.grid > li").nth(2).locator("button").click();
    const dlg = page.locator("dialog[open]");
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(400);
    const r = (await dlg.boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(Math.abs(r.y + r.height / 2 - height / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.x + r.width / 2 - width / 2)).toBeLessThanOrEqual(2);
  });
}

// The trigger (and the component that renders the dialog) sit inside a space-y-* parent. The dialog must still be
// portalled out of the page tree (#overlay-root in <body>), keep a zero margin-top from that parent and land at its edge / centre.
for (const locale of ["en", "fa"] as const) {
  test(`dialog rendered from a space-y-* parent is portalled and positioned (${locale})`, async ({ page }) => {
    await page.goto(`/${locale}/exam`);
    const trigger = page.locator("main ul.grid > li").nth(2).locator("button");
    const spaced = await trigger.evaluate((el) => !!el.closest("[class*='space-y-']"));
    expect(spaced).toBe(true);
    await trigger.click();
    const dlg = page.locator("dialog[open]");
    await expect(dlg).toBeVisible();
    // Portalled into #overlay-root (a direct child of <body>, outside the page tree), not rendered in place.
    expect(await dlg.evaluate((d) => d.parentElement?.id === "overlay-root" && d.parentElement.parentElement === document.body)).toBe(true);
    await page.waitForTimeout(400);
    const r = (await dlg.boundingBox())!;
    const { width, height } = page.viewportSize()!;
    expect(Math.abs(r.y + r.height / 2 - height / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.x + r.width / 2 - width / 2)).toBeLessThanOrEqual(2);
  });
}
