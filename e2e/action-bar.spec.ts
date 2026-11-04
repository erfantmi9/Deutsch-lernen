import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { bottomChromeTop, seedQuiz } from "./helpers";

const action = (page: Page) => page.locator("[data-action-button]");
const bar = (page: Page) => action(page).locator("xpath=ancestor::*[@data-bottom-chrome]");

const messages = (locale: string) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));

test.describe("action bar geometry", () => {
  test("--bottom-chrome-h = measured bar height + --safe-bottom (home indicator)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the bar is fixed to the screen edge on mobile only");
    await seedQuiz(page, false);
    await page.goto("/en/arcade");
    await expect(action(page)).toBeVisible();
    // Pretend to be on a phone with a home indicator (headless Chromium reports 0 for env(safe-area-inset-bottom)).
    await page.addStyleTag({ content: ":root { --safe-bottom: 34px !important; }" });
    await expect(async () => {
      const m = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.cssText = "position:absolute;visibility:hidden;height:var(--bottom-chrome-h)";
        document.body.appendChild(probe);
        const chrome = probe.getBoundingClientRect().height;
        probe.remove();
        const el = document.querySelector("[data-action-button]")!.closest("[data-bottom-chrome]")!;
        return { chrome, bar: el.getBoundingClientRect().height, bottom: el.getBoundingClientRect().bottom, vh: innerHeight };
      });
      expect(Math.abs(m.chrome - m.bar)).toBeLessThanOrEqual(2); // 1px border-top is the only difference
      expect(m.bar).toBeGreaterThan(34 + 44); // the inset really is inside the bar
      expect(Math.abs(m.bottom - m.vh)).toBeLessThanOrEqual(1);
    }).toPass({ timeout: 3000 });
  });

  test("the viewport meta asks for viewport-fit=cover (otherwise env(safe-area-inset-*) is always 0 on iOS)", async ({ page }) => {
    await page.goto("/en/arcade");
    expect(await page.locator('meta[name="viewport"]').getAttribute("content")).toContain("viewport-fit=cover");
  });

  test("the bar sits flush at the bottom edge on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await seedQuiz(page, false);
    await page.goto("/en/arcade");
    const b = (await bar(page).boundingBox())!;
    expect(Math.abs(b.y + b.height - page.viewportSize()!.height)).toBeLessThanOrEqual(1);
  });

  for (const path of ["/en/arcade", "/en/verbs?practice=1", "/en/verbs", "/en/grammar"]) {
    test(`the end of the page is not covered by the fixed bar (${path})`, async ({ page }) => {
      await seedQuiz(page, false);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect(async () => {
        const top = await bottomChromeTop(page);
        const last = await page.evaluate(() => {
          const kids = [...document.querySelector("main")!.children].filter((c) => (c as HTMLElement).offsetHeight > 0);
          return kids[kids.length - 1].getBoundingClientRect().bottom;
        });
        expect(last).toBeLessThanOrEqual(top + 1);
      }).toPass({ timeout: 3000 });
    });
  }
});

test.describe("status line", () => {
  // The strings a status can show, in the longest languages, plus synthetic worst cases.
  const STATUS_KEYS: [string, string][] = [
    ["Arcade", "chooseArticle"],
    ["Grammar", "missingAnswer"],
    ["Grammar", "missingChoice"],
    ["Verbs", "missingAux"],
    ["Verbs", "missingAnswer"],
  ];
  const WORST: Record<string, string> = {
    de: "Bitte zuerst alle Wörter in der richtigen Reihenfolge auf die Antwortzeile setzen, danach prüfen und anschließend die Satzerklärung lesen",
    fa: "لطفاً ابتدا همهٔ کلمه‌ها را به ترتیب درست روی خط پاسخ بگذارید، سپس بررسی کنید و بعد توضیح جمله را بخوانید",
    en: "Please place all the words on the answer line in the right order first, then check and read the sentence explanation afterwards",
  };

  for (const locale of ["de", "fa", "en"] as const) {
    test(`long status text (${locale}) is clamped to two lines and never squeezes the controls`, async ({ page }) => {
      await seedQuiz(page, false);
      await page.goto(`/${locale}/arcade`);
      await expect(action(page)).toBeVisible();
      const m = messages(locale);
      const candidates = [...STATUS_KEYS.map(([ns, k]) => m[ns]?.[k] as string).filter(Boolean), WORST[locale]];
      const vw = page.viewportSize()!.width;
      const vh = page.viewportSize()!.height;

      for (const text of candidates) {
        await page.evaluate((txt) => {
          document.querySelector("[data-action-button]")!.closest("[data-bottom-chrome]")!.querySelector("p[role=status]")!.textContent = txt;
        }, text);
        const r = await page.evaluate(() => {
          const barEl = document.querySelector("[data-action-button]")!.closest("[data-bottom-chrome]")!;
          const p = barEl.querySelector("p[role=status]") as HTMLElement;
          const btn = document.querySelector("[data-action-button]")!.getBoundingClientRect();
          const lh = parseFloat(getComputedStyle(p).lineHeight);
          return { lines: p.getBoundingClientRect().height / lh, barH: barEl.getBoundingClientRect().height, barScroll: barEl.scrollWidth - barEl.clientWidth, btnL: btn.left, btnR: btn.right, btnW: btn.width };
        });
        expect(r.lines, text).toBeLessThanOrEqual(2.05); // clamped
        expect(r.barScroll, text).toBeLessThanOrEqual(0); // no horizontal overflow inside the bar
        expect(r.btnL, text).toBeGreaterThanOrEqual(0);
        expect(r.btnR, text).toBeLessThanOrEqual(vw + 0.5);
        expect(r.btnW, text).toBeGreaterThanOrEqual(80); // the button keeps its size
        expect(r.barH, text).toBeLessThanOrEqual(vh * 0.25 + 1); // fixed chrome <= ~25% of the screen
      }
    });
  }
});

test.describe("one live region speaks per answer", () => {
  const liveText = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll("[role=status], [aria-live=polite], [aria-live=assertive]")]
        .map((el) => (el.textContent ?? "").trim())
        .filter((t) => t.length > 0),
    );

  test("arcade: after answering only the feedback region has text (bar status is empty)", async ({ page }) => {
    await seedQuiz(page, false);
    await page.goto("/en/arcade");
    await page.locator("section [role=group] button.candy").first().click();
    await expect(action(page)).toHaveAttribute("aria-disabled", "false");
    const live = await liveText(page);
    expect(live, JSON.stringify(live)).toHaveLength(1);
    expect(live[0]).toMatch(/Correct|Not quite/);
  });

  test("verb drill: after answering only the feedback region has text", async ({ page }) => {
    await page.goto("/en/verbs?practice=1");
    await page.locator("#verb-answer").fill("x");
    const groups = page.getByRole("radiogroup");
    if ((await groups.count()) > 1) await groups.nth(1).getByRole("radio").first().click();
    await action(page).click();
    await expect(page.locator("main .feedback-success, main .feedback-error")).toBeVisible();
    const live = await liveText(page);
    expect(live, JSON.stringify(live)).toHaveLength(1);
  });
});

test("lesson page: the action bar mounts at most once while slowly scrolling across the threshold", async ({ page }) => {
  await page.goto("/en/grammar/dative");
  await page.locator("#practice").waitFor();
  await page.evaluate(() => {
    const w = window as unknown as { __bar: { mounts: number; unmounts: number } };
    w.__bar = { mounts: 0, unmounts: 0 };
    const has = (n: Node) => n instanceof Element && (n.hasAttribute("data-action-button") || !!n.querySelector("[data-action-button]"));
    new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => has(n) && w.__bar.mounts++);
        r.removedNodes.forEach((n) => has(n) && w.__bar.unmounts++);
      }
    }).observe(document.body, { childList: true, subtree: true });
  });

  // 3px per frame from well above the practice block to well inside it, then all the way back up.
  const crossed = await page.evaluate(async () => {
    const top = document.querySelector("#practice")!.getBoundingClientRect().top + scrollY;
    const from = Math.max(0, top - innerHeight - 300);
    const to = top + 300;
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    for (let y = from; y <= to; y += 3) {
      scrollTo(0, y);
      await frame();
    }
    const down = { ...(window as unknown as { __bar: { mounts: number; unmounts: number } }).__bar };
    for (let y = to; y >= from; y -= 3) {
      scrollTo(0, y);
      await frame();
    }
    return { down, all: { ...(window as unknown as { __bar: { mounts: number; unmounts: number } }).__bar } };
  });
  expect(crossed.down.mounts, "mounted more than once while scrolling down").toBe(1);
  expect(crossed.down.unmounts).toBe(0);
  expect(crossed.all.mounts, "re-mounted while scrolling back up").toBe(1);
  expect(crossed.all.unmounts, "unmounted more than once while scrolling back up").toBe(1);
});
