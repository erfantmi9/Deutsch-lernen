import { expect, test } from "@playwright/test";

/*
 * Regression: hydration error #418 when the JS chunks arrive late (cold server, slow network).
 *
 * The root layout used to render its own <head> (only the theme script). When hydration had to wait for chunks, React
 * resumed at <head>'s first node and met <meta charset> where <body>'s first child should be, threw #418 and re-rendered
 * the whole page on the client. It never showed with fast, warm loads, so this test delays every JS chunk by a random
 * amount (0..DELAY ms) to recreate the slow, out-of-order arrival, and loads each route LOADS times.
 *
 * Desktop project only: the race is in the root layout and does not depend on the viewport; one project keeps CI time down.
 */
const ROUTES = ["/en", "/en/exam", "/fa/exam", "/en/verbs", "/en/verbs/sein", "/en/grammar/pronouns"];
const LOADS = 30;
const DELAY = 1200;

test.describe("no hydration errors with slow, out-of-order JS chunks", () => {
  test.skip(({ isMobile }) => isMobile, "layout-level race, viewport-independent: runs in the desktop project only");
  test.describe.configure({ mode: "parallel" });

  for (const route of ROUTES)
    test(`${route} × ${LOADS}`, async ({ page }) => {
      test.setTimeout(LOADS * 6_000);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
      page.on("console", (m) => {
        if (m.type() === "error" && /hydrat|#418|#423|#425|did(n't| not) match/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`);
      });
      await page.route(/\/_next\/static\/.*\.js/, async (r) => {
        await new Promise((res) => setTimeout(res, Math.random() * DELAY));
        await r.continue();
      });
      for (let i = 0; i < LOADS; i++) {
        await page.goto(route);
        // Hydration done: Next's route announcer is mounted by the client router.
        await page.waitForFunction(() => !!document.querySelector("next-route-announcer"), null, { timeout: 15_000 });
        expect(errors, `load ${i + 1} of ${route}`).toEqual([]);
      }
    });
});
