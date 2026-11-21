import fs from "node:fs";
import { expect, test } from "@playwright/test";
import {
  createStrictObserver,
  loadManifest,
  loginAsAdminStrict,
} from "./helpers/strict-audit";
import { setAdminGovernance } from "./helpers/governance";
import {
  ADMIN_PAGES_LOG,
  en,
  switchAdminLocale,
  visitAndAuditRoute,
} from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 09 — Settings, Users, Governance & 165-Route Manifest Gate (13 routes)", () => {
  test("all 13 Settings & Users routes honor governance, confirmations, RTL, and satisfy the 165-route Completeness Gate", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const observer = createStrictObserver(page, "admin-exhaustive-09");

    await page.addInitScript(() => {
      if (!localStorage.getItem("platform_admin_locale")) {
        localStorage.setItem("platform_admin_locale", "en");
      }
    });
    await loginAsAdminStrict(page);

    // 1. Verify default restricted governance redirects cleanly when IT has not delegated settings
    await page.goto("/dashboard/settings/company", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/dashboard\/settings\?restricted=1&section=company/);
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/dashboard/settings/roles", { waitUntil: "load" });
    await expect(page).toHaveURL(/\/dashboard\/settings\?restricted=1&section=roles/);
    await expect(page.locator("main")).toBeVisible();

    // 2. Temporarily delegate all governance settings and audit all 13 routes
    await setAdminGovernance({
      company: true,
      web: true,
      tax: true,
      appearance: true,
      domains: true,
      deployments: true,
      roles: true,
      audit: true,
    });
    try {
      await visitAndAuditRoute(page, observer, "/dashboard/settings", "/dashboard/settings", {
        expectedUrl: /\/dashboard\/settings\/preferences$/,
      });
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/approvals",
        "/dashboard/settings/approvals",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/audit",
        "/dashboard/settings/audit",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/company",
        "/dashboard/settings/company",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/departments",
        "/dashboard/settings/departments",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/pipeline",
        "/dashboard/settings/pipeline",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/preferences",
        "/dashboard/settings/preferences",
      );

      // Ported confirmation guard test on preferences
      await page
        .getByRole("button", { name: new RegExp(`^${en.appearance.presets.focused.name}`) })
        .click();
      await page.getByTestId("appearance-save").first().click();
      const confirmDlg = page
        .getByRole("dialog")
        .filter({ has: page.locator("[data-confirm-dialog]") });
      await expect(confirmDlg).toBeVisible();
      await confirmDlg.getByRole("button").first().click(); // Cancel
      await expect(confirmDlg).toHaveCount(0);
      await expect(page.getByTestId("appearance-save").first()).toBeEnabled();
      await page.getByTestId("appearance-discard").click();

      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/privacy",
        "/dashboard/settings/privacy",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/roles",
        "/dashboard/settings/roles",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/security",
        "/dashboard/settings/security",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/web",
        "/dashboard/settings/web",
      );
      await visitAndAuditRoute(page, observer, "/dashboard/users", "/dashboard/users");
      await visitAndAuditRoute(page, observer, "/dashboard/users/new", "/dashboard/users/new");
      const userFullName = page
        .getByRole("main")
        .getByPlaceholder(en.usersNew.fullNamePlaceholder, { exact: true });
      await expect(userFullName).toBeVisible();

      // Verify AR RTL on settings/preferences
      await switchAdminLocale(page, "ar");
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/settings/preferences",
        "/dashboard/settings/preferences",
        { locale: "ar" },
      );
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

      await observer.assertClean("admin-exhaustive-09-final");
    } finally {
      await setAdminGovernance(null);
    }

    // 3. 165-Route Manifest Completeness Gate
    expect(fs.existsSync(ADMIN_PAGES_LOG), `Missing ${ADMIN_PAGES_LOG}`).toBe(true);
    const records = fs
      .readFileSync(ADMIN_PAGES_LOG, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { route: string; status: number; errors: number });

    const manifest = loadManifest();
    const manifestRoutes: string[] = manifest.apps.admin.pages.map(
      (p: { route: string }) => p.route,
    );
    const visitedRoutes = new Set(records.map((r) => r.route));
    const missingRoutes = manifestRoutes.filter((r) => !visitedRoutes.has(r));
    const erroredRoutes = records.filter((r) => r.status >= 400 || r.errors > 0);

    expect(missingRoutes, `Unvisited Admin manifest routes: ${missingRoutes.join(", ")}`).toEqual(
      [],
    );
    expect(erroredRoutes, `Errored Admin routes: ${JSON.stringify(erroredRoutes)}`).toEqual([]);
    expect(visitedRoutes.size).toBe(manifestRoutes.length);
  });
});
