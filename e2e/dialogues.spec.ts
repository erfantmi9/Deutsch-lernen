import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, expectClearOfBar, shot } from "./helpers";

// Dialogue page: role-play (sticky choices above the action bar), comprehension quiz (Check in the bar, missing items,
// scroll + focus to the first wrong question), and the read view's word sheet (no layout shift, 44px word targets).

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
type Line = { speaker: string; de: string };
type Q = { options: string[]; answer: string };
const D = (JSON.parse(readFileSync("data/dialogues/a1.json", "utf8")) as { id: string; lines: Line[]; quiz: Q[] }[])[0];

const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const liveRegions = (page: Page) =>
  page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);
const docTop = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
/** Top of whatever covers the bottom of the viewport: the fixed bar (phones) or the floating sticky bar (lg). */
const barTop = async (page: Page) => (await bar(page).boundingBox())!.y;

async function openMode(page: Page, locale: "en" | "fa", mode: "read" | "roleplay" | "quiz") {
  await page.goto(`/${locale}/dialogues/${D.id}`);
  await page.getByRole("group", { name: M[locale].Dialogues.modeLabel }).getByRole("button", { name: M[locale].Dialogues.modes[mode], exact: true }).click();
}

function dialogueTests(locale: "en" | "fa", tag: string) {
  const m = M[locale].Dialogues;

  test(`role-play: choices sit in a sticky panel above the bar, new lines stay visible, focus never drops${tag}`, async ({ page }, testInfo) => {
    await openMode(page, locale, "roleplay");
    const role = D.lines[1].speaker; // the second speaker: the partner's first line is shown at once
    await page.getByRole("button", { name: m.roleplay.playAs.replace("{name}", role) }).click();
    const panel = page.locator("[data-choices-panel]");
    await expect(panel).toBeVisible();
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await expect(bar(page).locator("[role=status]")).toHaveText(m.roleplay.yourTurn);
    await expect(panel.locator("button").first()).toBeFocused();
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "dialogues", locale, `roleplay-1-turn${tag}`);

    const mine = D.lines.filter((l) => l.speaker === role);
    for (let step = 0; step < mine.length; step++) {
      // Panel sits right on top of the bar and inside the viewport.
      const p = (await panel.boundingBox())!;
      expect(p.y + p.height).toBeLessThanOrEqual((await barTop(page)) + 1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      // The newest line is visible above the panel.
      const last = page.locator("[data-line]").last();
      await expect(async () => {
        const b = (await last.boundingBox())!;
        expect(b.y + b.height).toBeLessThanOrEqual((await panel.boundingBox())!.y + 1);
        expect(b.y).toBeGreaterThanOrEqual(0);
      }).toPass({ timeout: 3000 });

      const wrong = step === 0;
      const choice = wrong
        ? panel.locator("button").filter({ hasNotText: mine[step].de }).first()
        : panel.locator("button").filter({ hasText: mine[step].de });
      await choice.click();
      await expect(action(page)).toBeFocused();
      await expect(action(page)).toHaveAttribute("aria-disabled", "false");
      await expect(choice).toHaveAttribute("aria-disabled", "true");
      if (wrong) {
        await expect(bar(page).locator("[role=status]")).toContainText(m.roleplay.wrong);
        await shot(page, testInfo, "dialogues", locale, `roleplay-2-wrong${tag}`);
      }
      expect(await liveRegions(page)).toBe(1);
      // The picked (right) line is now in the chat, visible above the panel.
      await expect(async () => {
        const b = (await page.locator("[data-line]").last().boundingBox())!;
        expect(b.y + b.height).toBeLessThanOrEqual((await panel.boundingBox())!.y + 1);
      }).toPass({ timeout: 3000 });
      await action(page).click();
    }

    await expect(panel).toHaveCount(0);
    await expect(page.getByRole("heading", { name: m.roleplay.done })).toBeFocused();
    await expect(action(page)).toHaveText(m.roleplay.again);
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "dialogues", locale, `roleplay-3-done${tag}`);
  });

  test(`quiz: Check disabled with missing items, then scroll + focus to the first wrong question${tag}`, async ({ page }, testInfo) => {
    await openMode(page, locale, "quiz");
    const status = bar(page).locator("[role=status]");
    await expect(action(page)).toHaveText(m.quiz.check);
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await expect(status).toHaveText(`${m.quiz.progress.replace("{answered}", "0").replace("{total}", "4")} · ${m.quiz.missing.replace("{items}", "1, 2, 3, 4")}`);
    expect(await liveRegions(page)).toBe(1);

    const q = (n: number) => page.locator(`[data-question="${n}"]`);
    // Answer 1 (right), 2 (wrong), 3 (right). 4 still missing.
    await q(1).getByRole("button", { name: D.quiz[0].answer, exact: true }).click();
    await q(2).getByRole("button").filter({ hasNotText: D.quiz[1].answer }).first().click();
    await q(3).getByRole("button", { name: D.quiz[2].answer, exact: true }).click();
    await expect(status).toContainText(m.quiz.missing.replace("{items}", "4"));
    await expect(status).toContainText("3/4");
    await action(page).evaluate((b: HTMLElement) => b.click()); // aria-disabled: nothing happens
    await expect(action(page)).toHaveText(m.quiz.check);
    await shot(page, testInfo, "dialogues", locale, `quiz-1-missing${tag}`);

    await q(4).getByRole("button", { name: D.quiz[3].answer, exact: true }).click();
    await expect(action(page)).toHaveAttribute("aria-disabled", "false");
    await expect(status).not.toContainText(m.quiz.missing.split(":")[0]);

    const tops = await Promise.all([1, 2, 3, 4].map((n) => docTop(page, `[data-question="${n}"]`)));
    await action(page).click();
    // Verdicts are reserved: the questions don't move in document coordinates.
    const after = await Promise.all([1, 2, 3, 4].map((n) => docTop(page, `[data-question="${n}"]`)));
    after.forEach((t, i) => expect(Math.abs(t - tops[i])).toBeLessThanOrEqual(1));
    await expect(q(2)).toBeFocused();
    await expectBelowHeader(page, q(2));
    await expectClearOfBar(page, q(2).locator("[data-verdict]"));
    await expect(status).toContainText(m.quiz.score.replace("{correct}", "3").replace("{total}", "4"));
    await expect(action(page)).toHaveText(m.quiz.retry);
    await expect(q(1).getByRole("button").first()).toHaveAttribute("aria-disabled", "true");
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "dialogues", locale, `quiz-2-checked${tag}`);

    await action(page).click();
    await expect(q(1)).toBeFocused();
    await expect(action(page)).toHaveText(m.quiz.check);
    await expect(status).toContainText("0/4");
  });

  test(`read: tapping a word opens a sheet without moving the chat; words have 44px targets${tag}`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/dialogues/${D.id}`);
    const word = page.locator("[data-word]").first();
    await expect(word).toBeVisible();
    expect(await liveRegions(page)).toBe(0);

    // Hit area: the ::before extends the inline button to at least 44px; the line flow is untouched.
    const hit = await word.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const b = getComputedStyle(el, "::before");
      const lh = parseFloat(getComputedStyle(el.parentElement!).lineHeight);
      return { h: r.height - parseFloat(b.top) - parseFloat(b.bottom), own: r.height, lh, pos: b.position };
    });
    expect(hit.pos).toBe("absolute");
    expect(hit.h).toBeGreaterThanOrEqual(44);
    expect(hit.own).toBeLessThanOrEqual(hit.lh); // the button itself never makes its line taller
    // A point 20px above the word's centre (outside its text box) still hits the word.
    const box = (await word.boundingBox())!;
    const hits = await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest("[data-word]"),
      { x: box.x + box.width / 2, y: box.y + box.height / 2 - 20 },
    );
    expect(hits).toBe(true);

    const chatTop = await docTop(page, "main ol");
    const scrollY = await page.evaluate(() => window.scrollY);
    await word.click();
    const sheet = page.locator("dialog[open]");
    await expect(sheet).toBeVisible();
    expect(Math.abs((await docTop(page, "main ol")) - chatTop)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    await shot(page, testInfo, "dialogues", locale, `read-word-sheet${tag}`);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(word).toBeFocused();
  });
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`dialogues (${locale})`, () => dialogueTests(locale, ""));
  test.describe(`dialogues at 1366x650 (${locale})`, () => {
    test.use({ viewport: { width: 1366, height: 650 } });
    test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop size: run once, in the desktop project"));
    dialogueTests(locale, "-1366x650");
  });
}
