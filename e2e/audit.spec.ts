import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { expectBelowHeader, shot } from "./helpers";

// Module E audit: grammar Practice jump, GrammarTable scroll cue, AddToReviewButton (fixed width, stable name, one shared
// announcer), SpeakButton footprint before/after support detection, index badges that never flip, compact headers.

const M = { en: JSON.parse(readFileSync("messages/en.json", "utf8")), fa: JSON.parse(readFileSync("messages/fa.json", "utf8")) };
const READING = (JSON.parse(readFileSync("data/reading/a1.json", "utf8")) as { id: string }[])[0].id;
const DIALOGUE = (JSON.parse(readFileSync("data/dialogues/a1.json", "utf8")) as { id: string }[])[0].id;
const FIRST_LINE = (JSON.parse(readFileSync("data/dialogues/a1.json", "utf8")) as { lines: { de: string }[] }[])[0].lines[0].de;
const VERB = "sein";
const LESSON = "dative";

const liveRegions = (page: Page) =>
  page.evaluate(() => document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]").length);

/** Holds back the JS chunks so that several frames are painted from the server HTML before hydration. */
async function delayHydration(page: Page, ms = 400) {
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((r) => setTimeout(r, ms));
    await route.continue();
  });
}

/** Minimal speechSynthesis stub with one German voice; speak() keeps "speaking" until cancel(). */
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const events = new EventTarget();
    let current: { onend?: (() => void) | null } | null = null;
    const synth = {
      get speaking() {
        return current !== null;
      },
      pending: false,
      paused: false,
      getVoices: () => [{ lang: "de-DE", name: "Stub DE", default: false, localService: true, voiceURI: "stub" }],
      speak(u: { onend?: (() => void) | null }) {
        current = u;
      },
      cancel() {
        const u = current;
        current = null;
        u?.onend?.();
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
  });
}

for (const locale of ["en", "fa"] as const) {
  const m = M[locale];
  test.describe(`audit (${locale})`, () => {
    test("Practice jump scrolls the exercise section below the header and focuses it", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/grammar/${LESSON}`);
      const jump = page.getByRole("button", { name: m.Grammar.jumpToPractice });
      await expect(jump).toBeVisible();
      await jump.click();
      const practice = page.locator("#practice");
      await expect(practice).toBeFocused();
      await expect(practice).toBeInViewport();
      await expectBelowHeader(page, practice.locator("h2"));
      await shot(page, testInfo, "audit", locale, "1-practice-jump");
    });

    test("GrammarTable: focusable named region, logical edge fade follows the scroll", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/grammar/${LESSON}`);
      const regions = page.locator("main div[role=region][tabindex='0']");
      expect(await regions.count()).toBeGreaterThan(0);
      const first = regions.first();
      await expect(first).toHaveAttribute("aria-label", /.+/);
      await first.focus();
      await expect(first).toBeFocused();

      const states = await regions.evaluateAll((els) => els.map((el) => el.scrollWidth > el.clientWidth + 1));
      const fades = (i: number) =>
        regions.nth(i).evaluate((el) => {
          const wrap = el.parentElement!;
          const get = (k: string) => wrap.querySelector(`[data-fade=${k}]`)!;
          const r = wrap.getBoundingClientRect();
          const s = get("start").getBoundingClientRect();
          return {
            start: get("start").hasAttribute("data-visible"),
            end: get("end").hasAttribute("data-visible"),
            startOnRight: s.left + s.width / 2 > r.left + r.width / 2,
          };
        });

      for (let i = 0; i < states.length; i++) {
        if (!states[i]) {
          await expect.poll(() => fades(i)).toMatchObject({ start: false, end: false });
        }
      }
      const idx = states.indexOf(true);
      if (testInfo.project.name.startsWith("mobile")) expect(idx, "a lesson table overflows on a phone").toBeGreaterThanOrEqual(0);
      if (idx < 0) return; // nothing scrolls at this width; every fade was checked hidden above

      const region = regions.nth(idx);
      await region.scrollIntoViewIfNeeded();
      await expect.poll(() => fades(idx)).toMatchObject({ start: false, end: true, startOnRight: locale === "fa" });
      await shot(page, testInfo, "audit", locale, "2-table-start");
      // Scroll to the logical end (negative scrollLeft in RTL).
      await region.evaluate((el) => el.scrollTo({ left: (getComputedStyle(el).direction === "rtl" ? -1 : 1) * el.scrollWidth }));
      await expect.poll(() => fades(idx)).toMatchObject({ start: true, end: false });
      await shot(page, testInfo, "audit", locale, "3-table-end");
      // Halfway: both edges hide content.
      await region.evaluate((el) => el.scrollTo({ left: ((getComputedStyle(el).direction === "rtl" ? -1 : 1) * (el.scrollWidth - el.clientWidth)) / 2 }));
      await expect.poll(() => fades(idx)).toMatchObject({ start: true, end: true });
    });

    test("AddToReviewButton: fixed width, stable name, one shared announcer", async ({ page }, testInfo) => {
      await page.goto(`/${locale}/verbs/${VERB}`);
      const btn = page.locator("button[data-add-review]");
      await expect(btn).toHaveAttribute("aria-pressed", "false");
      await expect(btn).not.toHaveAttribute("aria-busy", "true");
      const name = m.Review.addAria.replace("{word}", VERB);
      await expect(btn).toHaveAttribute("aria-label", name);
      const before = (await btn.boundingBox())!;
      // No live region of its own: the shared one is created by the first announcement.
      expect(await liveRegions(page)).toBe(0);

      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true");
      await expect(btn).toHaveAttribute("aria-label", name);
      const after = (await btn.boundingBox())!;
      expect(after.width).toBeCloseTo(before.width, 1);
      expect(after.height).toBeCloseTo(before.height, 1);
      const announcer = page.locator("[data-announcer]");
      await expect(announcer).toHaveCount(1);
      await expect(announcer).toHaveText(m.Review.announceAdded.replace("{word}", VERB));
      expect(await liveRegions(page)).toBe(1);
      await shot(page, testInfo, "audit", locale, "4-added");

      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "false");
      await expect(announcer).toHaveText(m.Review.announceRemoved.replace("{word}", VERB));
      expect((await btn.boundingBox())!.width).toBeCloseTo(before.width, 1);
      expect(await liveRegions(page)).toBe(1);
    });

    test("AddToReviewButton: many buttons on a page still give one live region", async ({ page }) => {
      await page.goto(`/${locale}/dialogues/${DIALOGUE}`);
      const btns = page.locator("button[data-add-review]");
      expect(await btns.count()).toBeGreaterThan(1);
      await expect(btns.first()).not.toHaveAttribute("aria-busy", "true");
      expect(await liveRegions(page)).toBe(0); // read mode has no live region until something is announced
      const b = btns.last();
      await b.scrollIntoViewIfNeeded();
      const w = (await b.boundingBox())!.width;
      await b.click();
      await expect(b).toHaveAttribute("aria-pressed", "true");
      expect((await b.boundingBox())!.width).toBeCloseTo(w, 1);
      await expect(page.locator("[data-announcer]")).toHaveText(/\S/);
      expect(await liveRegions(page)).toBe(1);
      // Navigating away removes the shared announcer with its last button.
      await page.goto(`/${locale}/grammar`);
      await expect(page.locator("[data-announcer]")).toHaveCount(0);
    });

    test("AddToReviewButton announces through the page's existing live region when there is one", async ({ page }) => {
      await page.goto(`/${locale}/vocabulary/family`);
      await page.locator("main [data-word-row] button[aria-expanded]").first().click();
      const b = page.locator("button[data-add-review]").first();
      await expect(b).not.toHaveAttribute("aria-busy", "true");
      expect(await liveRegions(page)).toBe(1); // the topic page's word count
      await b.click();
      await expect(b).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("main [role=status] [data-announce-host]")).toHaveText(/\S/);
      await expect(page.locator("[data-announcer]")).toHaveCount(0);
      expect(await liveRegions(page)).toBe(1);
    });

    test("SpeakButton keeps its box from first paint through support detection; Play/Stop", async ({ page }, testInfo) => {
      await stubSpeech(page);
      await page.addInitScript(() => {
        const w = window as unknown as { __s: { ready: boolean; fonts: boolean; size: string; pos: string }[] };
        w.__s = [];
        const tick = () => {
          const b = document.querySelector("[data-speak-button]");
          if (b) {
            const r = b.getBoundingClientRect();
            w.__s.push({
              ready: b.hasAttribute("data-speech-ready"),
              fonts: document.fonts.status === "loaded",
              size: [r.width, r.height].map(Math.round).join(),
              pos: [r.x, r.y + window.scrollY].map(Math.round).join(),
            });
          }
          if (w.__s.length < 300) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      // The dialogue page (not the verb page, whose body renders on the client only) server-renders the speak buttons.
      await page.goto(`/${locale}/dialogues/${DIALOGUE}`);
      await page.evaluate(() => document.fonts.ready);
      await delayHydration(page);
      await page.reload(); // fonts cached: a font swap is not what this measures
      const btn = page.locator("[data-speak-button]").first();
      await expect(btn).toHaveAttribute("data-speech-ready", "");
      await page.waitForTimeout(500);
      const s = await page.evaluate(() => (window as unknown as { __s: { ready: boolean; fonts: boolean; size: string; pos: string }[] }).__s);
      expect(s.length).toBeGreaterThan(0);
      expect(s.some((x) => !x.ready), "the footprint was painted before detection").toBe(true);
      expect([...new Set(s.map((x) => x.size))]).toHaveLength(1);
      // Its position follows the buttons before it, whose text width changes when a web font swaps in: compare it once fonts are in.
      expect([...new Set(s.filter((x) => x.fonts).map((x) => x.pos))]).toHaveLength(1);

      await expect(btn).toHaveAttribute("aria-label", m.Speech.listen.replace("{text}", FIRST_LINE));
      await btn.click();
      await expect(btn).toHaveAttribute("data-speaking", "");
      await expect(btn).toHaveAttribute("aria-label", m.Speech.stop);
      await shot(page, testInfo, "audit", locale, "5-speaking");
      await btn.click();
      await expect(btn).not.toHaveAttribute("data-speaking", "");
    });

    for (const area of ["reading", "dialogues"] as const) {
      test(`${area} index: a done badge never shows another label`, async ({ page }, testInfo) => {
        const id = area === "reading" ? READING : DIALOGUE;
        await page.addInitScript(
          ({ key, id }) => {
            localStorage.setItem(key, JSON.stringify({ state: { results: { [id]: { best: 4, attempts: 1 } } }, version: 1 }));
            const w = window as unknown as { __b: { fonts: boolean; label: string; box: string }[] };
            w.__b = [];
            const tick = () => {
              const a = document.querySelector(`a[href$="/${id}"]`);
              const badge = a?.querySelector("[data-status-badge]");
              if (badge) {
                const r = badge.getBoundingClientRect();
                const visible = [...badge.children].filter((c) => getComputedStyle(c).visibility !== "hidden");
                w.__b.push({ fonts: document.fonts.status === "loaded", label: visible.map((c) => c.textContent).join("").trim(), box: [r.width, r.height].map(Math.round).join() });
              }
              if (w.__b.length < 300) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          },
          { key: `deutsch-learner:${area}`, id },
        );
        // Warm the font cache first: a web font swapping in changes text width, which is not a hydration shift.
        await page.goto(`/${locale}/${area}`);
        await page.evaluate(() => document.fonts.ready);
        await delayHydration(page);
        await page.reload();
        const badge = page.locator(`a[href$="/${id}"] [data-status-badge]`);
        await expect(badge).toHaveAttribute("data-status-badge", "done");
        await page.waitForTimeout(500);
        const b = await page.evaluate(() => (window as unknown as { __b: { fonts: boolean; label: string; box: string }[] }).__b);
        const ns = area === "reading" ? m.Reading : m.Dialogues;
        expect([...new Set(b.map((x) => x.label).filter(Boolean))]).toEqual([`✓ ${ns.statusDone}`]);
        // Sizes are compared once the web fonts are in (a font swap is not a hydration shift); the placeholder must have
        // been painted in that window too (the JS is delayed, so it is).
        const loaded = b.filter((x) => x.fonts);
        expect(loaded.some((x) => x.label === ""), "placeholder painted").toBe(true);
        expect([...new Set(loaded.map((x) => x.box))]).toHaveLength(1);
        await expect(page.getByRole("list", { name: ns.listLabel })).not.toHaveAttribute("aria-busy", "true");
        await shot(page, testInfo, "audit", locale, `6-${area}-index`);
      });
    }

    test("builder/drill pages use the compact header at every size", async ({ page }, testInfo) => {
      for (const path of ["sentences", "numbers", `reading/${READING}`]) {
        await page.goto(`/${locale}/${path}`);
        const h1 = page.locator("main h1");
        await expect(h1).toBeVisible();
        // No illustrated hero card around the title (the compact header is a bare title row).
        expect(await h1.evaluate((el) => el.closest(".card-hero") === null), path).toBe(true);
        const box = (await h1.boundingBox())!;
        expect(box.height, path).toBeLessThan(80);
        expect(box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      await shot(page, testInfo, "audit", locale, "7-compact-reading");
    });
  });
}
