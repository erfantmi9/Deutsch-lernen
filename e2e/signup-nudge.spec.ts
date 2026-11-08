import { expect, test } from "@playwright/test";

// The signed-out "save your progress" card must never cover the quiz's action bar (Check / Next).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // 30 answers today: past the nudge threshold.
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("deutsch-learner:activity", JSON.stringify({ state: { days: { [today]: 30 } }, version: 1 }));
  });
});

for (const locale of ["en", "fa"] as const) {
  test(`${locale}: sign-up card sits above the action bar, not over it`, async ({ page }) => {
    await page.goto(`/${locale}/arcade`);
    const nudge = page.locator("aside").filter({ has: page.locator(`a[href*="mode=signup"]`) });
    await expect(nudge).toBeVisible();
    const bar = page.locator("div[data-bottom-chrome]");
    await expect(bar).toBeVisible();
    const n = (await nudge.boundingBox())!;
    const b = (await bar.boundingBox())!;
    expect(n.y + n.height).toBeLessThanOrEqual(b.y);
  });
}
