import { defineConfig, devices } from "@playwright/test";

export const ports = {
  web: Number(process.env.WEB_PORT) || 3000,
  admin: Number(process.env.ADMIN_PORT) || 3001,
  it: Number(process.env.IT_PORT) || 3002,
  gateway: Number(process.env.GATEWAY_PORT) || 8080,
};

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/.results/playwright",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.ADMIN_URL || `http://localhost:${ports.admin}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "e2e-all",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
