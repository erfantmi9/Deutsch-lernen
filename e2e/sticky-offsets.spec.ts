import { expect, test } from "@playwright/test";

// Sticky offsets and scroll padding are derived from --header-h. If the real header ever differs from that token
// (the "mutation" check made the header 40px taller), these fail even though every test that measures the real
// header stays green.
const headerBottom = (page: import("@playwright/test").Page) =>
  page.locator("header.sticky").evaluate((el) => el.getBoundingClientRect().bottom);

test("the sticky filter bar sits directly under the header while scrolling", async ({ page }) => {
  await page.goto("/en/verbs");
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(async () => {
    const bar = page.locator("main .sticky").first();
    const top = (await bar.boundingBox())!.y;
    expect(Math.abs(top - (await headerBottom(page)))).toBeLessThanOrEqual(1.5);
  }).toPass({ timeout: 3000 });
});

test("an anchor jump (#practice) lands below the header, not under it", async ({ page }) => {
  await page.goto("/en/grammar/dative#practice");
  await expect(async () => {
    const top = await page.locator("#practice h2").first().evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual((await headerBottom(page)) - 0.5);
  }).toPass({ timeout: 4000 });
});
