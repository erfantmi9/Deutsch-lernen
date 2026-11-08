import { expect, test } from "@playwright/test";

// The theme is a per-browser setting: switching the interface language must never reset it.
for (const theme of ["dark", "light"] as const) {
  test(`${theme} theme survives a language switch`, async ({ page }) => {
    // The opposite system preference, so a fallback to the system theme would also be caught.
    await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/en/arcade");
    const html = page.locator("html");
    await expect(html).toHaveClass(theme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);

    for (const [from, to] of [["en", "fa"], ["fa", "de"], ["de", "en"]] as const) {
      await page.locator(`header button[aria-haspopup="true"][aria-label]`).filter({ has: page.locator(`span[lang=${from}]`) }).first().click();
      await page.locator(`header a[hreflang=${to}]`).first().click();
      await expect(html).toHaveAttribute("lang", to);
      await page.waitForTimeout(300); // let any late re-render land
      await expect(html).toHaveClass(theme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
    }
  });
}
