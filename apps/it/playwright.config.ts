import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/.results/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.IT_URL || "http://localhost:3002",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "it",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});