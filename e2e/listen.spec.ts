import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectClearOfBar, shot } from "./helpers";

// Listening drill. Headless Chromium has no voices, so window.speechSynthesis is stubbed: voices arrive
// asynchronously (voiceschanged), and every speak()/cancel() is recorded in window.__speech.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");
const feedback = (page: Page) => page.locator("main [role=status].min-h-feedback-sm");
const liveRegions = (page: Page) => page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);
const docTop = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

type Call = { type: "speak" | "cancel"; text?: string };
const calls = (page: Page) => page.evaluate(() => (window as unknown as { __speech: Call[] }).__speech);
const speaks = async (page: Page) => (await calls(page)).filter((c) => c.type === "speak");

/** voices: what getVoices() returns once `voiceschanged` fires (after `delay` ms); before that it is empty. */
async function stubSpeech(page: Page, voices: { lang: string; name: string }[], delay = 200) {
  await page.addInitScript(
    ({ voices, delay }) => {
      const log: { type: string; text?: string }[] = [];
      const w = window as unknown as Record<string, unknown>;
      w.__speech = log;
      let list: unknown[] = [];
      let current: { onend?: (() => void) | null } | null = null;
      const events = new EventTarget();
      const synth = {
        get speaking() {
          return current !== null;
        },
        pending: false,
        paused: false,
        getVoices: () => list,
        speak(u: { text: string; onend?: (() => void) | null }) {
          log.push({ type: "speak", text: u.text });
          current = u;
        },
        cancel() {
          log.push({ type: "cancel" });
          const u = current;
          current = null;
          if (u) setTimeout(() => u.onend?.(), 0);
        },
        pause() {},
        resume() {},
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        dispatchEvent: events.dispatchEvent.bind(events),
        onvoiceschanged: null,
      };
      Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
      class Utterance {
        text: string;
        lang = "";
        rate = 1;
        voice: unknown = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
      // The utterance finishing on its own.
      w.__finishSpeech = () => {
        const u = current;
        current = null;
        u?.onend?.();
      };
      setTimeout(() => {
        list = voices;
        events.dispatchEvent(new Event("voiceschanged"));
      }, delay);
    },
    { voices, delay },
  );
}

const GERMAN = [{ lang: "en-US", name: "English" }, { lang: "de-DE", name: "Anna" }];

async function startRound(page: Page, locale: "en" | "fa", kind: "word" | "number") {
  const m = M[locale].Listen;
  await page.getByRole("group", { name: m.kindLabel }).getByRole("button", { name: m.kinds[kind], exact: true }).click();
  await expect(action(page)).toHaveText(m.start);
  await action(page).click();
  await expect(page.locator("#listen-q")).toBeVisible();
}

function listenTests(locale: "en" | "fa", tag: string) {
  const m = M[locale];

  test(`no speech before a tap; Play <-> Stop in the bar; one live region; Next plays once${tag}`, async ({ page }, testInfo) => {
    await stubSpeech(page, GERMAN);
    await page.goto(`/${locale}/listen/words`);
    await expect(action(page)).toBeVisible(); // voices loaded asynchronously: the drill appears
    await expect(page.getByText(m.Listen.needVoice)).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(await speaks(page)).toEqual([]);

    await startRound(page, locale, "word");
    await page.waitForTimeout(400);
    expect(await speaks(page)).toEqual([]); // the first item of a round waits for Play
    await shot(page, testInfo, "listen", locale, `1-question${tag}`);

    const play = bar(page).locator("[data-speak-button=normal]");
    await expect(play).toBeVisible();
    await play.click();
    expect(await speaks(page)).toHaveLength(1);
    await expect(play).toHaveAttribute("aria-label", m.Speech.stop);
    await expect(play).toHaveAttribute("data-speaking", "");
    await shot(page, testInfo, "listen", locale, `2-playing${tag}`);
    const cancelsBefore = (await calls(page)).filter((c) => c.type === "cancel").length;
    await play.click(); // Stop
    expect((await calls(page)).filter((c) => c.type === "cancel").length).toBeGreaterThan(cancelsBefore);
    await expect(play).not.toHaveAttribute("data-speaking", "");
    await expect(play).not.toHaveAttribute("aria-label", m.Speech.stop);

    // Speech finishing on its own also flips the button back.
    await play.click();
    await expect(play).toHaveAttribute("data-speaking", "");
    await page.evaluate(() => (window as unknown as { __finishSpeech: () => void }).__finishSpeech());
    await expect(play).not.toHaveAttribute("data-speaking", "");

    // Answer: feedback in place, focus on the bar button, exactly one live region.
    const fbTop = await docTop(page, "main [role=status].min-h-feedback-sm");
    await page.locator("[role=group][aria-labelledby=listen-q] button").first().click();
    await expect(feedback(page)).not.toBeEmpty();
    await expect(action(page)).toBeFocused();
    await expect(page.locator("[role=group][aria-labelledby=listen-q] button").first()).toHaveAttribute("aria-disabled", "true");
    expect(Math.abs((await docTop(page, "main [role=status].min-h-feedback-sm")) - fbTop)).toBeLessThanOrEqual(1);
    await expectClearOfBar(page, feedback(page).locator("> div"));
    expect(await liveRegions(page)).toBe(1);
    await shot(page, testInfo, "listen", locale, `3-answered${tag}`);

    // Same-tick double click on Next: one advance, one new utterance.
    const q = await page.locator("#listen-q").innerText();
    const n = (await speaks(page)).length;
    await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>("[data-action-button]")!;
      b.click();
      b.click();
    });
    await expect(page.locator("#listen-q")).not.toHaveText(q);
    await page.waitForTimeout(300);
    expect(await speaks(page)).toHaveLength(n + 1);
    await expect(feedback(page)).toBeEmpty();
    await expect(page.locator("#listen-q")).toHaveText(m.Listen.question.replace("{current}", "2").replace("{total}", "10")); // not 3
  });

  test(`typed numbers: readOnly after answering, focus on the bar, double Enter advances once${tag}`, async ({ page }, testInfo) => {
    await stubSpeech(page, GERMAN);
    await page.goto(`/${locale}/listen/words`);
    await startRound(page, locale, "number");
    const input = page.locator("#listen-answer");
    await expect(input).toBeFocused();
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await input.fill("1000"); // never asked (0-999): always wrong, which shows the longest feedback
    await page.keyboard.press("Enter");
    await expect(feedback(page)).not.toBeEmpty();
    await expect(input).toHaveAttribute("readonly", "");
    await expect(input).toBeEnabled();
    await expect(action(page)).toBeFocused();
    await expectClearOfBar(page, feedback(page).locator("> div"));
    await shot(page, testInfo, "listen", locale, `4-number-answered${tag}`);

    const n = (await speaks(page)).length;
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("");
    await expect(input).not.toHaveAttribute("readonly", "");
    await expect(input).toBeFocused();
    await page.waitForTimeout(300);
    expect(await speaks(page)).toHaveLength(n + 1); // one advance = one new utterance
    await expect(feedback(page)).toBeEmpty();
  });

  test(`speech is cancelled when leaving the page${tag}`, async ({ page }) => {
    await stubSpeech(page, GERMAN);
    await page.goto(`/${locale}/listen/words`);
    await startRound(page, locale, "word");
    await bar(page).locator("[data-speak-button=normal]").click();
    const before = (await calls(page)).length;
    await page.locator(`header a[href$='/${locale}']`).first().click(); // client-side navigation home
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    const after = (await calls(page)).slice(before);
    expect(after.some((c) => c.type === "cancel")).toBe(true);
    expect(after.some((c) => c.type === "speak")).toBe(false);
  });

  test(`no German voice: the drill is hidden and a tip shown${tag}`, async ({ page }, testInfo) => {
    await stubSpeech(page, [{ lang: "en-US", name: "English" }]);
    await page.goto(`/${locale}/listen/words`);
    await expect(page.getByText(m.Listen.needVoice)).toBeVisible();
    await expect(page.getByRole("group", { name: m.Listen.kindLabel })).toHaveCount(0);
    await expect(action(page)).toHaveCount(0);
    await shot(page, testInfo, "listen", locale, `5-no-voice${tag}`);
  });
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`listen (${locale})`, () => listenTests(locale, ""));
  test.describe(`listen at 1366x650 (${locale})`, () => {
    test.use({ viewport: { width: 1366, height: 650 } });
    test.beforeEach(({ isMobile }) => test.skip(isMobile, "desktop size: run once, in the desktop project"));
    listenTests(locale, "-1366x650");
  });
}

test("voices that never load: no tip flashes before the voice list is known, then the tip", async ({ page }) => {
  await stubSpeech(page, [], 100_000);
  await page.goto("/en/listen/words");
  await expect(page.getByText(M.en.Listen.needVoice)).toHaveCount(0);
  await expect(page.getByText(M.en.Listen.needVoice)).toBeVisible({ timeout: 4000 });
});

// ---- the listening hub and the new exercises ----

const MESSAGES_DATA: { id: string; question: { en: string; fa: string }; answer: string; lines: unknown[] }[] = JSON.parse(readFileSync("data/listening/messages.json", "utf8"));
const lastSpoken = async (page: Page) => (await speaks(page)).at(-1)?.text ?? "";

for (const locale of ["en", "fa"] as const) {
  const m = M[locale];

  test.describe(`listening exercises (${locale})`, () => {
    test("hub links every exercise and every dialogue", async ({ page }, testInfo) => {
      await stubSpeech(page, GERMAN);
      await page.goto(`/${locale}/listen`);
      for (const key of ["dictation", "messages", "sounds", "words"]) await expect(page.locator(`[data-listen-module=${key}]`)).toBeVisible();
      await expect(page.locator(`a[href$='/listen/dialogues/kennenlernen']`)).toBeVisible();
      await shot(page, testInfo, "listen", locale, "0-hub");
      await page.locator("[data-listen-module=dictation]").click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/listen/dictation$`));
    });

    test("dictation: the play label hides the sentence; a perfect and a faulty answer are checked word by word", async ({ page }, testInfo) => {
      await stubSpeech(page, GERMAN);
      await page.goto(`/${locale}/listen/dictation`);
      await action(page).click(); // Start
      const input = page.locator("#dictation-answer");
      await expect(input).toBeFocused();
      expect(await speaks(page)).toEqual([]);

      const play = bar(page).locator("[data-speak-button=normal]");
      await expect(play).toHaveAttribute("aria-label", m.Speech.play);
      await play.click();
      const sentence = await lastSpoken(page);
      expect(sentence.length).toBeGreaterThan(5);

      await input.fill(sentence);
      await page.keyboard.press("Enter");
      await expect(feedback(page)).toContainText(m.Listen.dictation.perfect);
      await expect(page.locator("[data-dictation-diff] [data-mark]").first()).toBeVisible();
      expect(await page.locator("[data-dictation-diff] [data-mark]:not([data-mark=ok])").count()).toBe(0);
      await expect(action(page)).toBeFocused();
      expect(await liveRegions(page)).toBe(1);

      // Next plays the next sentence once; leaving out its first word marks exactly that word missing.
      const n = (await speaks(page)).length;
      await action(page).click();
      await expect(input).toHaveValue("");
      expect(await speaks(page)).toHaveLength(n + 1);
      const next = await lastSpoken(page);
      await input.fill(next.split(" ").slice(1).join(" "));
      await action(page).click();
      await expect(feedback(page)).toContainText(m.Listen.dictation.notYet);
      await expect(page.locator("[data-dictation-diff] [data-mark=missing]")).toHaveCount(1);
      await expectClearOfBar(page, feedback(page).locator("> div"));
      await shot(page, testInfo, "listen", locale, "6-dictation-checked");
    });

    test("messages: the whole text is queued, the answer is checked and the transcript shows the evidence", async ({ page }, testInfo) => {
      await stubSpeech(page, GERMAN);
      await page.goto(`/${locale}/listen/messages`);
      await action(page).click(); // Start
      const question = (await page.locator("#message-q").innerText()).trim();
      const item = MESSAGES_DATA.find((x) => x.question[locale] === question);
      expect(item, question).toBeTruthy();
      await bar(page).locator("[data-sequence-button=normal]").click();
      expect(await speaks(page)).toHaveLength(item!.lines.length);
      await expect(bar(page).locator("[data-sequence-button=normal]")).toHaveAttribute("data-speaking", "");

      await page.locator("[role=group][aria-labelledby=message-q]").getByRole("button", { name: item!.answer, exact: true }).click();
      await expect(feedback(page)).toContainText(m.Listen.correct);
      await expect(action(page)).toBeFocused();
      await page.getByRole("button", { name: m.Listen.messages.showText }).click();
      await expect(page.locator("#message-transcript mark")).toHaveCount(1);
      await shot(page, testInfo, "listen", locale, "7-message-answered");
    });

    test("sounds: one of the two words is spoken; picking it is right", async ({ page }, testInfo) => {
      await stubSpeech(page, GERMAN);
      await page.goto(`/${locale}/listen/sounds`);
      await action(page).click(); // Start
      await bar(page).locator("[data-speak-button=normal]").click();
      const word = await lastSpoken(page);
      const choices = page.locator("[role=group][aria-labelledby=sounds-q] button");
      await expect(choices).toHaveCount(2);
      await choices.filter({ has: page.locator(`span[lang=de]`, { hasText: new RegExp(`^${word}$`) }) }).click();
      await expect(feedback(page)).toContainText(m.Listen.correct);
      await shot(page, testInfo, "listen", locale, "8-sounds-answered");
    });

    test("dialogue by ear: the text is hidden, Play queues every line, the transcript opens on demand", async ({ page }, testInfo) => {
      await stubSpeech(page, GERMAN);
      await page.goto(`/${locale}/listen/dialogues/kennenlernen`);
      const firstLine = "Hallo! Ich heiße Lena. Wie heißt du?";
      await expect(page.getByText(firstLine)).toHaveCount(0);
      await page.locator("main [data-sequence-button=normal]").click();
      const spoken = await speaks(page);
      expect(spoken[0]?.text).toBe(firstLine);
      expect(spoken.length).toBeGreaterThanOrEqual(6);
      await page.getByRole("button", { name: m.Listen.dialogues.showText }).click();
      await expect(page.getByText(firstLine)).toBeVisible();
      await shot(page, testInfo, "listen", locale, "9-dialogue-transcript");
    });
  });
}
