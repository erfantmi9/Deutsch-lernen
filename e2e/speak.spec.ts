import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { shot } from "./helpers";

// Speaking drill. Headless Chromium cannot really recognise speech, so (webkit)SpeechRecognition is replaced by a fake
// that "hears" whatever the test put in window.__say (null: nothing heard, "!<error>": that recognition error).

// A fake microphone, so the record-only path can really record.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const S = en.Speak;
const action = (page: Page) => page.locator("[data-action-button]");
const feedback = (page: Page) => page.locator("main [role=status].min-h-feedback-sm");
const sentence = (page: Page) => page.locator("[data-speak-sentence]");
const say = (page: Page, text: string | null) => page.evaluate((t) => ((window as unknown as { __say: string | null }).__say = t), text);

/** No speech recognition at all, as in Firefox; `noMicrophone` also takes MediaRecorder away. */
async function withoutRecognition(page: Page, noMicrophone = false) {
  await page.addInitScript((noMic) => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    if (noMic) delete w.MediaRecorder;
  }, noMicrophone);
}

async function fakeRecognition(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__say = null;
    class FakeRecognition {
      lang = "";
      interimResults = false;
      continuous = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      private timer: ReturnType<typeof setTimeout> | null = null;
      start() {
        (w.__recognitionLangs as string[] | undefined)?.push(this.lang) ?? (w.__recognitionLangs = [this.lang]);
        this.timer = setTimeout(() => {
          const text = w.__say as string | null;
          if (typeof text === "string" && text.startsWith("!")) this.onerror?.({ error: text.slice(1) });
          else if (text) {
            const result = Object.assign([{ transcript: text }, { transcript: "ganz anders" }], { isFinal: true });
            this.onresult?.({ results: [result] });
          } else this.onerror?.({ error: "no-speech" });
          this.onend?.();
        }, 50);
      }
      stop() {}
      abort() {
        if (this.timer) clearTimeout(this.timer);
      }
    }
    // Chromium has the real one under both names; replace both.
    w.SpeechRecognition = w.webkitSpeechRecognition = FakeRecognition;
  });
}

test.describe("speaking drill", () => {
  test("checks what was said, word by word, through a whole round", async ({ page }) => {
    await fakeRecognition(page);
    await page.goto("/en/speak");
    await expect(page.getByRole("button", { name: S.modes.check })).toHaveAttribute("aria-pressed", "true");
    await action(page).click(); // Start

    // Nothing heard: a hint, and the button still says Speak.
    await say(page, null);
    await action(page).click();
    await expect(feedback(page)).toContainText(S.heardNothing);
    await expect(action(page)).toContainText(S.speak);
    await expect(page.locator("[data-speak-again]")).toBeDisabled();

    // Only the first word: not yet; the missing words are marked.
    const first = (await sentence(page).innerText()).trim();
    await say(page, first.split(/\s+/)[0]);
    await action(page).click();
    await expect(feedback(page)).toContainText(S.notYet);
    await expect(page.locator("[data-speak-diff] [data-mark=missing]").first()).toBeVisible();

    // Try again, said right: perfect.
    await say(page, first.replace(/[.!?,]/g, "").toLowerCase());
    await page.locator("[data-speak-again]").click();
    await expect(feedback(page)).toContainText(S.perfect);
    await expect(page.locator("[data-speak-diff] [data-mark]:not([data-mark=ok])")).toHaveCount(0);

    // The rest of the round, all said right.
    for (let i = 1; i < 5; i++) {
      await action(page).click(); // Next
      await expect(page.getByText(S.question.replace("{current}", String(i + 1)).replace("{total}", "5"))).toBeVisible();
      await say(page, (await sentence(page).innerText()).trim());
      await action(page).click();
      await expect(feedback(page)).toContainText(S.perfect);
    }
    await action(page).click(); // Result
    await expect(feedback(page)).toContainText(S.average.replace("{percent}", "100"));
    expect(await page.evaluate(() => (window as unknown as { __recognitionLangs: string[] }).__recognitionLangs)).toContain("de-DE");

    // Progress is kept: the level now counts 5 sentences said.
    await expect(page.getByRole("button", { name: /Short · 5\// })).toBeVisible();
  });

  test("explains a blocked microphone", async ({ page }) => {
    await fakeRecognition(page);
    await page.goto("/en/speak");
    await action(page).click();
    await say(page, "!not-allowed");
    await action(page).click();
    await expect(feedback(page)).toContainText(S.problems.blocked);
  });

  test("says so when the browser has no microphone access at all", async ({ page }) => {
    await withoutRecognition(page, true);
    await page.goto("/en/speak");
    await expect(page.getByText(S.unsupported)).toBeVisible();
    await expect(action(page)).toHaveCount(0);
  });

  test("is in the Persian interface too, right to left with German left to right", async ({ page }, testInfo) => {
    await fakeRecognition(page);
    await page.goto("/fa/speak");
    const fa = JSON.parse(readFileSync("messages/fa.json", "utf8")).Speak;
    await expect(page.getByRole("heading", { name: fa.title })).toBeVisible();
    await action(page).click();
    await expect(sentence(page)).toHaveAttribute("dir", "ltr");
    await shot(page, testInfo, "speak", "fa", "question");
    const words = (await sentence(page).innerText()).trim().split(/\s+/);
    await say(page, words.slice(0, -1).join(" "));
    await action(page).click();
    await expect(page.locator("[data-speak-diff]")).toBeVisible();
    await shot(page, testInfo, "speak", "fa", "checked");
  });
});

test.describe("speaking drill without speech recognition", () => {
  test("records the learner, who then judges it", async ({ page, context }) => {
    await withoutRecognition(page);
    await context.grantPermissions(["microphone"]);
    await page.goto("/en/speak");
    await expect(page.getByText(S.recordOnly)).toBeVisible();
    await action(page).click(); // Start
    await expect(action(page)).toContainText(S.record);
    await action(page).click(); // Record
    await expect(action(page)).toContainText(S.stop);
    await page.waitForTimeout(400);
    await action(page).click(); // Stop
    await expect(page.locator("[data-my-voice]")).toBeVisible();
    await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    await page.locator("[data-judge=yes]").click();
    await expect(feedback(page)).toContainText(S.judgedYes);
    await expect(action(page)).not.toHaveAttribute("aria-disabled", "true");
  });
});
