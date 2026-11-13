import { defineConfig, devices } from "@playwright/test";

export const ports = {
  admin: Number(process.env.ADMIN_PORT) || 3012,
  web: Number(process.env.WEB_PORT) || 3013,
  setup: 3014,
  it: Number(process.env.IT_PORT) || 3015,
  stripe: 3199,
};

export const cronSecret = process.env.CRON_SECRET || "e2e-cron-secret";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  outputDir: "./tests/.results/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.ADMIN_URL || "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});