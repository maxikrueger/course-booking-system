import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3001);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "de-CH",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile-.*\.spec\.ts/,
    },
    {
      name: "mobile",
      // iPhone-Viewport, aber Chromium als Engine: WebKit müsste separat
      // installiert werden und läuft weder in CI noch in jedem Container.
      // Geprüft wird hier Layout-Verhalten, nicht Engine-Rendering.
      use: { ...devices["iPhone 14"], browserName: "chromium" },
      testMatch: /mobile-.*\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: `pnpm dev`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
