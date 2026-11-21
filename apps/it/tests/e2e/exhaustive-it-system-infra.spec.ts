import { expect, test } from "@playwright/test";
import t from "@platform/locales/en.json";
import {
  auditAllTabs,
  createStrictObserver,
  gotoStrict,
  loadManifest,
  loginToItStrict,
} from "./helpers/strict-audit";

test.describe("IT Console — Modules, Integrations, Site, Company, Presets, Settings, Setup & Infra", () => {
  test("exercises modules, integrations docs, site tabs, company sections, store presets, settings tabs, setup, system-health, logs, database SQL, jobs, backups, deployments & 30-route manifest gate", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const observer = createStrictObserver(page, "it-exhaustive-system-infra");
    await loginToItStrict(page);

    // 1. /modules: filter search & verify toggle list renders cleanly
    await gotoStrict(page, "/modules", observer);
    await expect(page.getByRole("heading", { name: t.modules.title, exact: true })).toBeVisible();
    const modSearch = page.locator(`input[placeholder="${t.modules.searchPlaceholder}"]`);
    await expect(modSearch).toBeVisible();
    await modSearch.fill("store");
    await expect(page.locator('p[dir="ltr"]', { hasText: /^store$/ })).toBeVisible();
    await modSearch.fill("");

    // 2. /integrations: verify cards & inspect docs modal
    await gotoStrict(page, "/integrations", observer);
    await expect(page.getByRole("heading", { name: t.integrations.title, exact: true })).toBeVisible();
    await expect(page.getByTestId("integration-resend")).toBeVisible();
    const docsBtn = page.getByTestId("integration-resend").getByRole("button", { name: t.integrations.specs });
    await expect(docsBtn).toBeVisible();
    await docsBtn.click();
    await expect(page.getByText(t.integrationDocs.modalTitle)).toBeVisible();
    await page.getByRole("button", { name: t.integrationDocs.close }).first().click();

    // 3. /site: click every custom tab button (Domains, Site Presentation, Social Links, Tracking Code)
    await gotoStrict(page, "/site", observer);
    await expect(page.getByRole("heading", { name: t.site.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.site.tabs.presentation }).click();
    await expect(page.getByText(t.site.presentation.heading)).toBeVisible();
    await page.getByRole("button", { name: t.site.tabs.social }).click();
    await expect(page.getByText(t.site.social.heading)).toBeVisible();
    await page.getByRole("button", { name: t.site.tabs.code }).click();
    await expect(page.getByLabel(t.site.code.googleAnalyticsId)).toBeVisible();
    await page.getByRole("button", { name: t.site.tabs.domains }).click();
    await expect(page.getByLabel(t.site.domains.websiteLabel)).toBeVisible();

    // 4. /company: switch through all 7 section select options
    await gotoStrict(page, "/company", observer);
    await expect(page.getByRole("heading", { name: t.company.title, exact: true })).toBeVisible();
    const sectionSelect = page.locator("select").first();
    for (const sec of ["profile", "finance", "sequences", "branding", "appearance", "governance", "setup"]) {
      await sectionSelect.selectOption(sec);
    }

    // 5. /store-presets & /dashboard/store-presets: exercise both routes & tabs/buttons
    for (const presetPath of ["/store-presets", "/dashboard/store-presets"]) {
      await gotoStrict(page, presetPath, observer);
      await expect(page.getByRole("heading", { name: t.storePresets.title, exact: true })).toBeVisible();
      await auditAllTabs(page, { minTabs: 0 });
    }

    // 6. /settings: click all 4 tabs (Notifications, Appearance, Account, Roles)
    await gotoStrict(page, "/settings", observer);
    await expect(page.getByRole("heading", { name: t.settings.title, exact: true })).toBeVisible();
    for (const label of [
      t.settings.tabs.appearance,
      t.settings.tabs.account,
      t.settings.tabs.roles,
      t.settings.tabs.notifications,
    ]) {
      await page.getByRole("button", { name: label }).click();
    }

    // 7. /setup: verify wizard steps render without mutating seeded company
    await gotoStrict(page, "/setup", observer);
    await expect(page.getByRole("list", { name: t.setupWizard.stepsLabel })).toBeVisible();

    // 8. /system-health, /logs, /database (read-only SELECT 1 diagnostic), /jobs, /backups, /deployments
    await gotoStrict(page, "/system-health", observer);
    await expect(page.getByRole("heading", { name: t.systemHealth.title, exact: true })).toBeVisible();

    await gotoStrict(page, "/logs", observer);
    await expect(page.getByRole("heading", { name: t.logs.title, exact: true })).toBeVisible();

    await gotoStrict(page, "/database", observer);
    await expect(page.getByRole("heading", { name: t.database.title, exact: true })).toBeVisible();
    const sqlInput = page.locator('textarea[placeholder*="SELECT"]').first();
    await expect(sqlInput).toBeVisible();
    await sqlInput.fill("DELETE FROM system.company");
    await page.getByRole("button", { name: t.database.executeSql }).click();
    await expect(page.getByText(t.database.safetyViolation).first()).toBeVisible({ timeout: 10_000 });

    await sqlInput.fill("SELECT 1 AS ok");
    await page.getByRole("button", { name: t.database.executeSql }).click();
    await expect(page.getByText(/RESULT:\s*\d+\s*ROWS/i)).toBeVisible({ timeout: 15_000 });

    await gotoStrict(page, "/jobs", observer);
    await expect(page.getByRole("heading", { name: t.jobs.title, exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.jobs.refresh }).click();

    await gotoStrict(page, "/backups", observer);
    await expect(page.getByRole("heading", { name: t.backups.title, exact: true })).toBeVisible();

    await gotoStrict(page, "/deployments", observer);
    await expect(page.getByRole("heading", { name: t.deployments.title, exact: true })).toBeVisible();

    // 9. Assert full 30-route coverage against .local/qa-manifest.json
    const manifest = loadManifest();
    const itManifestRoutes: string[] = (manifest.apps.it.pages as Array<{ route?: string } | string>).map((entry) =>
      typeof entry === "string" ? entry : entry.route || "",
    );
    const coveredRoutes = new Set([
      "/",
      "/api-keys",
      "/api-tester",
      "/audit",
      "/backups",
      "/company",
      "/database",
      "/deployments",
      "/integrations",
      "/it-accounts",
      "/jobs",
      "/logs",
      "/modules",
      "/notifications",
      "/notifications/[id]",
      "/sessions",
      "/settings",
      "/setup",
      "/site",
      "/sla",
      "/staff-accounts",
      "/staff-roles",
      "/store-presets",
      "/dashboard/store-presets",
      "/system-health",
      "/tickets",
      "/tickets/[id]",
      "/login",
      "/login/forgot",
      "/login/reset",
    ]);
    expect(itManifestRoutes.length).toBe(30);
    for (const r of itManifestRoutes) {
      expect(coveredRoutes.has(r), `Missing IT route in exhaustive suite: ${r}`).toBe(true);
    }

    await observer.assertClean("it-exhaustive-system-infra");
  });
});
