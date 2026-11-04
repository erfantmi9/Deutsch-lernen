import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { expectBelowHeader, expectClearOfBar, quizWrites, seedQuiz, shot } from "./helpers";

const candy = (page: Page) => page.locator("section [role=group] button.candy");
const action = (page: Page) => page.locator("[data-action-button]");
const feedback = (page: Page) => page.locator("main [role=status].min-h-feedback-sm");

/** Answers with the n-th button and waits until the answer is registered. */
async function answerWith(page: Page, n: number) {
  await candy(page).nth(n % 3).click();
  await expect(action(page)).toHaveAttribute("aria-disabled", "false");
}

for (const locale of ["en", "fa"] as const) {
  test.describe(`arcade (${locale})`, () => {
    test("every state keeps feedback and Next in view; screenshots", async ({ page }, testInfo) => {
      await seedQuiz(page, false);
      await page.goto(`/${locale}/arcade`);
      await expect(candy(page)).toHaveCount(3);

      // Before answering: answer buttons are visible in the thumb zone, Next is disabled and says why.
      for (let i = 0; i < 3; i++) await expectClearOfBar(page, candy(page).nth(i));
      await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      await expect(action(page).locator("xpath=preceding-sibling::p")).not.toBeEmpty();
      await expect(page.locator("main input:not([type=checkbox])")).toHaveCount(0); // no input to auto-focus
      await shot(page, testInfo, "arcade", locale, "1-before-answer");

      let gotCorrect = false;
      let gotWrong = false;
      for (let i = 0; i < 40 && !(gotCorrect && gotWrong); i++) {
        await answerWith(page, i);
        const isCorrect = await page.locator("main .feedback-success").isVisible();
        const wanted = isCorrect ? !gotCorrect : !gotWrong;
        if (wanted) {
          await expect(feedback(page)).toBeInViewport();
          await expect(action(page)).toBeInViewport();
          await expect(action(page)).toBeFocused();
          await expectClearOfBar(page, feedback(page).locator("> div"));
          await expectBelowHeader(page, page.locator("section .card-hero").first()); // no extra scroll hides the question
          await shot(page, testInfo, "arcade", locale, isCorrect ? "2-after-correct" : "3-after-wrong");
          if (isCorrect) gotCorrect = true;
          else {
            gotWrong = true;
            // Explanation: opens as a sheet (bottom sheet on phone, side panel on desktop).
            const why = page.locator("[data-bottom-chrome] button[aria-haspopup=dialog]");
            await why.click();
            await expect(page.locator("dialog[open]")).toBeVisible();
            await expect(page.locator("dialog[open]").getByRole("heading", { level: 2 })).toBeInViewport();
            await expectBelowHeader(page, page.locator("section .card-hero").first());
            await shot(page, testInfo, "arcade", locale, "4-explanation-open");
            await page.keyboard.press("Escape");
            await expect(page.locator("dialog[open]")).toHaveCount(0);
            await expect(why).toBeFocused(); // focus returns to the trigger
          }
        }
        await action(page).click(); // Next
        await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      }
      expect(gotCorrect && gotWrong).toBe(true);
    });

    test("auto-advance moves on after a correct answer, but never while the explanation is open", async ({ page }) => {
      await seedQuiz(page, true);
      await page.goto(`/${locale}/arcade`);
      const word = page.locator("p[lang=de]").first();

      // 1) Correct answer, no interaction: advances by itself.
      let before = "";
      for (let i = 0; i < 40; i++) {
        before = (await word.textContent())!;
        await answerWith(page, i);
        if (await page.locator("main .feedback-success").isVisible()) break;
        await action(page).click();
      }
      await expect(page.locator("main .feedback-success")).toHaveCount(0, { timeout: 3000 });
      await expect(action(page)).toHaveAttribute("aria-disabled", "true");
      expect(await word.textContent()).not.toBe(before);

      // 2) Correct answer, explanation opened within the 1s window: stays put.
      for (let i = 0; i < 40; i++) {
        await candy(page).nth(i % 3).click();
        // Open the explanation from inside the page the moment it is enabled: no Playwright round trips, so this is
        // far inside the 1s auto-advance window even on a loaded machine.
        await page.evaluate(async () => {
          const why = document.querySelector<HTMLButtonElement>("[data-bottom-chrome] button[aria-haspopup=dialog]")!;
          while (why.disabled) await new Promise((r) => requestAnimationFrame(r));
          why.click();
        });
        await expect(page.locator("dialog[open]")).toBeVisible();
        if (await page.locator("main .feedback-success").isVisible()) break;
        await page.keyboard.press("Escape"); // wrong answer: close the sheet and try the next word
        await action(page).click();
      }
      await page.waitForTimeout(1800);
      await page.keyboard.press("Escape");
      await expect(page.locator("main .feedback-success")).toBeVisible(); // still on the answered word
      await page.waitForTimeout(1500);
      await expect(page.locator("main .feedback-success")).toBeVisible(); // and does not advance after closing either
      await expect(action(page)).toHaveAttribute("aria-disabled", "false");
    });

    test("the auto-advance setting is persisted", async ({ page }) => {
      await seedQuiz(page, true);
      await page.goto(`/${locale}/arcade`);
      const toggle = page.getByRole("switch");
      await expect(toggle).toBeChecked();
      await toggle.uncheck();
      await page.reload();
      await expect(page.getByRole("switch")).not.toBeChecked();
    });

    test("double Enter / Space / click on Next never skips a question", async ({ page }) => {
      await seedQuiz(page, false);
      await page.goto(`/${locale}/arcade`);

      const writesFor = async (fire: () => Promise<void>) => {
        await answerWith(page, 0);
        const before = await quizWrites(page);
        await fire();
        await expect(action(page)).toHaveAttribute("aria-disabled", "true"); // new, unanswered question
        return (await quizWrites(page)) - before;
      };

      // Same-tick double click: the second one must be inert (one store update = one question).
      expect(await writesFor(() => page.evaluate(() => { const b = document.querySelector<HTMLElement>("[data-action-button]")!; b.click(); b.click(); }))).toBe(1);
      // Same-tick keydown on the page + click on the focused button (what one Enter press can produce).
      expect(
        await writesFor(() =>
          page.evaluate(() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            document.querySelector<HTMLElement>("[data-action-button]")!.click();
          }),
        ),
      ).toBe(1);
      // Real keyboard: two quick Enter presses, then two Space presses.
      expect(await writesFor(async () => { await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); })).toBe(1);
      expect(await writesFor(async () => { await page.keyboard.press("Space"); await page.keyboard.press("Space"); })).toBe(1);
      // Holding the key (auto-repeat) is ignored too.
      expect(await writesFor(async () => { await page.keyboard.down("Enter"); await page.keyboard.down("Enter"); await page.keyboard.up("Enter"); })).toBe(1);
    });

    test("keyboard flow: 1/2/3 answers, Enter moves on", async ({ page }) => {
      await seedQuiz(page, false);
      await page.goto(`/${locale}/arcade`);
      await expect(candy(page)).toHaveCount(3); // wait until the quiz has hydrated and loaded a word
      await page.keyboard.press("2");
      await expect(action(page)).toHaveAttribute("aria-disabled", "false");
      await page.keyboard.press("Enter");
      await expect(action(page)).toHaveAttribute("aria-disabled", "true");
    });

    test("reset asks for confirmation", async ({ page }) => {
      await seedQuiz(page, false);
      await page.goto(`/${locale}/arcade`);
      await page.locator("section button.btn-ghost").click();
      await expect(page.locator("dialog[open]")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator("dialog[open]")).toHaveCount(0);
    });
  });
}
