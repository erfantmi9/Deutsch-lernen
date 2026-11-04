import { expect, test } from "@playwright/test";

// The desktop header is as wide as the content column; the nav keeps text labels and collapses extras into "More".
for (const locale of ["en", "fa", "de"] as const) {
  for (const width of [1024, 1280, 1440]) {
    test(`header nav fits with text labels (${locale}, ${width}px)`, async ({ page, isMobile }) => {
      test.skip(isMobile, "desktop header only");
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/${locale}/verbs`);

      const m = await page.evaluate((vw) => {
        const header = document.querySelector("header")!;
        const inner = header.firstElementChild!.getBoundingClientRect();
        const main = document.querySelector("main")!.getBoundingClientRect();
        const items = [...header.querySelectorAll("a, button")].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        return {
          overflow: document.documentElement.scrollWidth - vw,
          rows: new Set(items.map((r) => Math.round(r.top + r.height / 2))).size,
          clipped: items.filter((r) => r.left < inner.left - 1 || r.right > inner.right + 1).length,
          leftDelta: Math.abs(inner.left - main.left),
          rightDelta: Math.abs(inner.right - main.right),
        };
      }, width);
      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.rows).toBe(1);
      expect(m.clipped).toBe(0); // nothing sticks out of the header column
      expect(m.leftDelta).toBeLessThan(1.5); // header aligns with the content column
      expect(m.rightDelta).toBeLessThan(1.5);

      // Text labels are really visible (not sr-only, not zero-width).
      const nav = page.getByRole("navigation").first();
      for (const label of await nav.locator("a, button").allInnerTexts()) expect(label.trim().length).toBeGreaterThan(0);
    });
  }
}

test("every icon control in the header has an aria-label and a title; More opens a menu", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop header only");
  await page.goto("/en/verbs");
  const header = page.locator("header");
  const icons = header.locator("a[href$='/search'], button[aria-label^='Switch'], button[aria-label^='Language']");
  expect(await icons.count()).toBe(3);
  for (const el of await icons.all()) {
    expect((await el.getAttribute("aria-label"))!.length).toBeGreaterThan(0);
    expect((await el.getAttribute("title"))!.length).toBeGreaterThan(0);
  }
  const more = header.getByRole("button", { name: "More" });
  await expect(more).toHaveAttribute("title", "More");
  await more.click();
  await expect(header.getByRole("link", { name: "Exam" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(header.getByRole("link", { name: "Exam" })).toBeHidden();
});
