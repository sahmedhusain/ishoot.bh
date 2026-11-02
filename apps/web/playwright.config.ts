import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/.results/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.WEB_URL || "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "web",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});