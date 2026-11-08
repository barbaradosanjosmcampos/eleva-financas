import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./pwa-tests",
  outputDir: "./test-results/pwa-production",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5175",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: "node scripts/pwa-test-server.mjs",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
  },
});
