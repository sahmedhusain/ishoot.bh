import { defineConfig, devices } from "@playwright/test";

// Disposable encryption key shared by fixture writers and the isolated test servers.
process.env.ENCRYPTION_KEY ||= "0123456789abcdef0123456789abcdef";

// End-to-end tests for both apps. Each app runs against its own disposable database (tests/e2e/prepare-db.cjs):
//   admin + web     → seeded demo company (E2E_SEEDED_DATABASE, default platform_e2e_test)
//   setup wizard    → blank install       (E2E_BLANK_DATABASE,  default platform_e2e_blank_test)
// `pnpm test:e2e` prepares both databases first (Playwright starts the servers before any setup hook runs);
// `pnpm exec playwright test` reuses them. E2E_SERVER_MODE=start serves production builds.
const seeded = process.env.E2E_SEEDED_DATABASE || "platform_e2e_test";
const blank = process.env.E2E_BLANK_DATABASE || "platform_e2e_blank_test";
export const ports = {
  admin: 3012,
  web: 3013,
  setup: 3014,
  it: 3015,
  stripe: 3199,
};
const session = "tests/.results/admin-session.json";
/** The test servers' own secret for the scheduled-jobs endpoint, so specs can run the jobs. */
export const cronSecret = "e2e-cron-secret";
const server = (
  app: "admin" | "web" | "it",
  port: number,
  database: string,
) => ({
  command: `node tests/e2e/serve.cjs ${app} ${port} ${database}`,
  url: `http://localhost:${port}${app === "web" ? "/en" : "/login"}`,
  reuseExistingServer: !process.env.CI,
  timeout: 240_000,
  stdout: "ignore" as const,
  stderr: "pipe" as const,
  // The admin previews website media from the website's origin, so both point at the test servers.
  // Preview links and cache refreshes go to the test website too, never to a developer's own servers.
  env: {
    NEXT_PUBLIC_WEB_URL: `http://localhost:${ports.web}`,
    NEXT_PUBLIC_ADMIN_URL: `http://localhost:${ports.admin}`,
    ADMIN_PREVIEW_ORIGINS: `http://localhost:${ports.setup}`,
    WEB_URL: `http://localhost:${ports.web}`,
    ADMIN_URL: `http://localhost:${ports.admin}`,
    ADMIN_PREVIEW_ORIGINS: `http://localhost:${ports.setup}`,
    // Card payments go to a local stand-in for Stripe's API that the payment specs start (tests/e2e/stripe-stand-in.ts).
    PAYMENT_GATEWAY_BASE_URL_STRIPE: `http://localhost:${ports.stripe}`,
    CRON_SECRET: cronSecret,
    // Specs switch modules and reload at once (tests/e2e/modules.ts).
    SYSTEM_MODULES_CACHE_MS: "0",
    SYSTEM_SITE_CACHE_MS: "0",
  },
});

export default defineConfig({
  testDir: "tests/e2e/specs",
  outputDir: "tests/.results/playwright",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [
        ["github"],
        [
          "html",
          { outputFolder: "tests/.results/playwright-report", open: "never" },
        ],
        ["junit", { outputFile: "tests/.results/playwright-junit.xml" }],
      ]
    : [
        ["list"],
        [
          "html",
          { outputFolder: "tests/.results/playwright-report", open: "never" },
        ],
      ],
  use: {
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "setup-wizard",
      testDir: "tests/e2e/specs/setup",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${ports.setup}`,
      },
    },
    {
      name: "admin-login",
      testDir: "tests/e2e/auth",
      testMatch: /admin\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${ports.admin}`,
      },
    },
    {
      name: "admin",
      testDir: "tests/e2e/specs/admin",
      dependencies: ["admin-login"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${ports.admin}`,
        storageState: session,
      },
    },
    {
      name: "admin-mobile",
      testDir: "tests/e2e/specs/admin",
      testMatch: /responsive\.spec\.ts/,
      dependencies: ["admin-login"],
      use: {
        ...devices["Pixel 7"],
        baseURL: `http://localhost:${ports.admin}`,
        storageState: session,
      },
    },
    {
      name: "it",
      testDir: "tests/e2e/specs/it",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${ports.it}`,
      },
    },
    {
      name: "web",
      testDir: "tests/e2e/specs/web",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${ports.web}`,
      },
    },
    {
      name: "web-mobile",
      testDir: "tests/e2e/specs/web",
      testMatch: /site\.spec\.ts/,
      use: { ...devices["Pixel 7"], baseURL: `http://localhost:${ports.web}` },
    },
  ],
  webServer: [
    server("admin", ports.admin, seeded),
    server("web", ports.web, seeded),
    server("admin", ports.setup, blank),
    // The IT dashboard signs in through identity; tests/e2e/it-account.cjs creates its account.
    server("it", ports.it, seeded),
  ],
});
