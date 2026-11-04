import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

// Smoke tests run against a production build, at the two viewports the UX rules are written for.
// Dev dependency only: nothing here runs in the Vercel build (`next build`).
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  workers: process.env.CI ? 2 : undefined,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile-375x667", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true } },
    { name: "desktop-1280x800", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
