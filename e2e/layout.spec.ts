import { expect, test } from "@playwright/test";

const LOCALES = ["en", "fa", "de"] as const;

test.describe("fixed chrome", () => {
  for (const locale of LOCALES) {
    test(`header fits without clipping or wrapping (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/verbs`);
      const vw = page.viewportSize()!.width; // NOT window.innerWidth: mobile emulation grows it to fit overflowing content
      const m = await page.evaluate((vw) => {
        const header = document.querySelector("header")!;
        const probe = document.createElement("div");
        probe.style.height = "var(--header-h)";
        document.body.appendChild(probe);
        const tokenPx = probe.getBoundingClientRect().height;
        probe.remove();
        const items = [...header.querySelectorAll("a, button")].map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        return {
          pageOverflow: document.documentElement.scrollWidth - vw,
          headerHeight: header.getBoundingClientRect().height,
          tokenPx,
          clipped: items.filter((r) => r.left < -0.5 || r.right > vw + 0.5).length,
          rows: new Set(items.map((r) => Math.round(r.top + r.height / 2))).size,
        };
      }, vw);
      expect(m.pageOverflow).toBeLessThanOrEqual(0); // no horizontal scroll
      expect(m.clipped).toBe(0); // every header control is inside the viewport
      expect(m.rows).toBe(1); // nothing wrapped to a second row
      expect(Math.abs(m.headerHeight - m.tokenPx)).toBeLessThan(2); // --header-h matches the real header (+1px border)
    });
  }

  test("mobile bottom nav sits flush at the viewport bottom", async ({ page, isMobile }) => {
    test.skip(!isMobile, "bottom nav is mobile only");
    await page.goto("/en/verbs");
    const nav = page.locator("nav.app-bottom-nav");
    await expect(nav).toBeVisible();
    const box = (await nav.boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(Math.abs(box.y + box.height - vh)).toBeLessThan(2);
  });

  test("previous / next arrows mirror in RTL and not in LTR", async ({ page }) => {
    const arrow = async (locale: string) => {
      await page.goto(`/${locale}/verbs/haben`);
      return page.locator("a[rel=next] span[aria-hidden]").evaluate((el) => getComputedStyle(el).transform);
    };
    expect(await arrow("en")).toBe("none");
    expect(await arrow("fa")).toBe("matrix(-1, 0, 0, 1, 0, 0)");
  });

  test("old /verbs?verb=<id> links redirect to the detail page", async ({ page }) => {
    await page.goto("/en/verbs?verb=sein");
    await expect(page).toHaveURL(/\/en\/verbs\/sein/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("sein");
  });
});
