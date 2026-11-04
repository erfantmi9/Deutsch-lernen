import { expect, test } from "@playwright/test";

// No horizontal scrolling on the pages of the modules fixed so far. The reference width is the configured viewport
// (window.innerWidth is useless on mobile emulation: it grows to fit overflowing content and hides the problem).
const PAGES = ["/arcade", "/verbs", "/verbs/sein", "/verbs?practice=1", "/grammar", "/grammar/dative", "/sentences"];

for (const locale of ["en", "fa", "de"] as const) {
  for (const path of PAGES) {
    test(`no horizontal overflow: /${locale}${path}`, async ({ page }) => {
      await page.goto(`/${locale}${path}`);
      await page.waitForLoadState("networkidle");
      const vw = page.viewportSize()!.width;
      const over = await page.evaluate((vw) => {
        const offenders: string[] = [];
        document.querySelectorAll("body *").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== "fixed") {
            // ignore things inside a horizontally scrollable container (e.g. wide tables)
            for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === "auto" || ox === "scroll" || ox === "hidden") return;
            }
            offenders.push(`${el.tagName}.${String(el.className).slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}]`);
          }
        });
        return { sw: document.documentElement.scrollWidth - vw, offenders: offenders.slice(0, 5) };
      }, vw);
      expect(over, JSON.stringify(over.offenders)).toMatchObject({ sw: expect.any(Number) });
      expect(over.sw, JSON.stringify(over.offenders)).toBeLessThanOrEqual(0);
    });
  }
}
