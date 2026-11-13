import { defineConfig, devices } from "@playwright/test";

process.env.E2E_SEEDED_DATABASE ||= "platform_web_redesign_test";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
export default defineConfig({
  outputDir: "../.results/redesign",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web",
      testDir: "./specs/web",
      testMatch:
        /(?:redesign|site|links|store|account|payments|delivery)\.spec\.ts/,
      use: { baseURL: "http://localhost:3013" },
    },
    {
      name: "admin-login",
      testDir: "./auth",
      testMatch: /admin\.setup\.ts/,
      use: { baseURL: "http://localhost:3012" },
    },
    {
      name: "admin",
      testDir: "./specs/admin",
      testMatch: /(?:redesign|controls-layout)\.spec\.ts/,
      dependencies: ["admin-login"],
      use: {
        baseURL: "http://localhost:3012",
        storageState: "tests/.results/admin-session.json",
      },
    },
  ],
});
