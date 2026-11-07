import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, expectClearOfBar, shot } from "./helpers";

// Reading text page: compact header, Check in the action bar with "n/m answered · Missing", reserved verdicts (no
// layout jumps), focus on the result after Check and on task 1 after Try again, lg two columns with a sticky text
// column, translation in a sheet.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
type Task =
  | { type: "true-false"; answer: boolean }
  | { type: "choice"; answer: string }
  | { type: "matching"; pairs: { item: string; answer: string }[] };
const T = (JSON.parse(readFileSync("data/reading/a1.json", "utf8")) as { id: string; tasks: Task[] }[])[0];

const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const status = (page: Page) => bar(page).locator("[role=status]");
const task = (page: Page, n: number) => page.locator(`[data-task="${n}"]`);
const liveRegions = (page: Page) =>
  page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);
const docTop = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

/** Answers task n (1-based); `right` false picks a wrong answer. */
async function answer(page: Page, locale: "en" | "fa", n: number, right: boolean) {
  const m = M[locale].Reading;
  const tk = T.tasks[n - 1];
  const card = task(page, n);
  if (tk.type === "true-false") {
    const v = right ? tk.answer : !tk.answer;
    await card.getByRole("button", { name: v ? m.true : m.false, exact: true }).click();
  } else if (tk.type === "choice") {
    const btn = right ? card.getByRole("button", { name: tk.answer, exact: true }) : card.getByRole("button").filter({ hasNotText: tk.answer }).first();
    await btn.click();
  } else {
    const selects = card.locator("select");
    for (let i = 0; i < tk.pairs.length; i++) await selects.nth(i).selectOption(tk.pairs[i].answer);
  }
}

function readingTests(locale: "en" | "fa", tag: string) {
  const m = M[locale].Reading;

  test(`compact header, missing-items status, reserved verdicts, focus after check and retry${tag}`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/reading/${T.id}`);
    // Compact header at every size: no illustrated hero card.
    await expect(page.locator("main .card-hero")).toHaveCount(0);
    await expect(page.locator("main h1")).toBeVisible();

    await expect(action(page)).toHaveText(m.check);
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await expect(status(page)).toHaveText(
      `${m.answered.replace("{answered}", "0").replace("{total}", "4")} · ${m.missing.replace("{items}", "1, 2, 3, 4")}`,
    );
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "reading", locale, `1-start${tag}`);

    await answer(page, locale, 1, true);
    await answer(page, locale, 2, false);
    await answer(page, locale, 4, true);
    await expect(status(page)).toContainText(m.missing.replace("{items}", "3"));
    await action(page).evaluate((b: HTMLElement) => b.click()); // aria-disabled: no effect
    await expect(action(page)).toHaveText(m.check);
    await answer(page, locale, 3, true);
    await expect(action(page)).toHaveAttribute("aria-disabled", "false");

    const tops = await Promise.all([1, 2, 3, 4].map((n) => docTop(page, `[data-task="${n}"]`)));
    const textTop = await docTop(page, "[data-reading-text]");
    const textHeight = await page.locator("[data-reading-text] p[lang=de]").evaluate((el) => el.getBoundingClientRect().height);
    await action(page).click();
    const after = await Promise.all([1, 2, 3, 4].map((n) => docTop(page, `[data-task="${n}"]`)));
    after.forEach((t, i) => expect(Math.abs(t - tops[i])).toBeLessThanOrEqual(1));
    // Stacked layouts only: on lg the text column is sticky, so its document position follows the scroll by design.
    if (page.viewportSize()!.width < 1024) {
      expect(Math.abs((await docTop(page, "[data-reading-text]")) - textTop)).toBeLessThanOrEqual(1);
    }
    expect(await page.locator("[data-reading-text] p[lang=de]").evaluate((el) => el.getBoundingClientRect().height)).toBeCloseTo(textHeight, 0);

    const result = page.locator("[data-reading-result]");
    await expect(result).toBeFocused();
    await expectClearOfBar(page, result);
    await expectBelowHeader(page, result);
    await expect(status(page)).toContainText(m.score.replace("{correct}", "3").replace("{total}", "4"));
    await expect(action(page)).toHaveText(m.retry);
    await expect(task(page, 1).getByRole("button").first()).toHaveAttribute("aria-disabled", "true");
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "reading", locale, `2-checked${tag}`);

    await action(page).click();
    await expect(task(page, 1)).toBeFocused();
    await expectBelowHeader(page, task(page, 1));
    await expect(action(page)).toHaveText(m.check);
    await expect(status(page)).toContainText(m.missing.replace("{items}", "1, 2, 3, 4"));
  });

  test(`layout: two columns with a sticky text on lg, stacked on phones; translation in a sheet${tag}`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/reading/${T.id}`);
    const text = page.locator("[data-reading-text]");
    const tasks = page.locator("section[aria-labelledby=tasks-title]");
    const vw = page.viewportSize()!.width;
    const tb = (await text.boundingBox())!;
    const kb = (await tasks.boundingBox())!;
    if (vw >= 1024) {
      expect(Math.abs(tb.y - kb.y)).toBeLessThanOrEqual(2); // side by side
      expect(tb.x + tb.width <= kb.x + 1 || kb.x + kb.width <= tb.x + 1).toBe(true);
      // Scroll so the tasks column moves on while the text column stays put.
      await task(page, 3).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      const headerBottom = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().bottom);
      const top = (await text.boundingBox())!.y;
      expect(top).toBeGreaterThanOrEqual(headerBottom - 1); // stuck under the header, still visible
      expect(top).toBeLessThan(headerBottom + 40);
      await shot(page, testInfo, "reading", locale, `3-lg-sticky-text${tag}`);
    } else {
      expect(kb.y).toBeGreaterThanOrEqual(tb.y + tb.height - 1); // stacked
    }

    const before = await docTop(page, "[data-task='1']");
    await page.getByRole("button", { name: m.showTranslation }).click();
    const sheet = page.locator("dialog[open]");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: m.translation })).toBeVisible();
    if (vw < 768) {
      const sb = (await sheet.boundingBox())!;
      expect(sb.y + sb.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 2); // bottom sheet
    }
    expect(Math.abs((await docTop(page, "[data-task='1']")) - before)).toBeLessThanOrEqual(1);
    await shot(page, testInfo, "reading", locale, `4-translation${tag}`);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`reading (${locale})`, () => readingTests(locale, ""));
  test.describe(`reading at 1366x650 (${locale})`, () => {
    test.use({ viewport: { width: 1366, height: 650 } });
    test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop size: run once, in the desktop project"));
    readingTests(locale, "-1366x650");
  });
}
