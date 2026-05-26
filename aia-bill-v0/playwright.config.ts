import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5660",
    headless: true,
    ignoreHTTPSErrors: true,
    storageState: "e2e/.auth.json",
  },
});
