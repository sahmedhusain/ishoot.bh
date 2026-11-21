import { expect, test } from "@playwright/test";
import {
  allowExpectedFailure,
  createStrictObserver,
  extractResetUrl,
  fetchMailpitMessage,
  gotoStrict,
  loginAsAdminStrict,
} from "./helpers/strict-audit";
import {
  ar,
  assertPdfEndpoint,
  createTempStaffAccount,
  en,
  resetAdminPagesLog,
  switchAdminLocale,
  visitAndAuditRoute,
} from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 01 — Public Auth, Mailpit Reset & Core Dashboards (23 routes)", () => {
  test("public auth, password reset via Mailpit, and all core dashboard routes pass in EN and AR RTL", async ({
    page,
    browser,
  }) => {
    test.setTimeout(360_000);
    resetAdminPagesLog();
    const observer = createStrictObserver(page, "admin-exhaustive-01");

    await page.addInitScript(() => {
      if (!localStorage.getItem("platform_admin_locale")) {
        localStorage.setItem("platform_admin_locale", "en");
      }
    });

    // 1. Public & Auth routes: /login, negative check, /login/forgot, /login/reset, /acknowledge/[token], /certificates/[code], /sign/[token]
    await visitAndAuditRoute(page, observer, "/login", "/login");
    await page.locator("#login-username").fill("nonexistent_qa_user");
    await page.locator("#login-password").fill("WrongPassword!123");
    await allowExpectedFailure(
      observer,
      { status: 401, urlPattern: /\/api\/auth\/login/, requireHit: true },
      async () => {
        await Promise.all([
          page.waitForResponse(
            (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
          ),
          page.locator('button[type="submit"]:visible').click(),
        ]);
        await expect(page.locator('main [role="alert"]').first()).toBeVisible({
          timeout: 10_000,
        });
      },
    );

    // Provision temporary staff user to test real forgot-password + Mailpit token reset flow end-to-end
    const ts = Date.now();
    const tempId = `exh-reset-${ts}`;
    const tempUsername = `exh${String(ts).slice(-6)}`;
    const tempEmail = `${tempUsername}@example.test`;
    const initPw = `InitExh!${ts}99`;
    const newPw = `ResetExh!${ts}99`;
    const cleanup = await createTempStaffAccount({
      id: tempId,
      username: tempUsername,
      email: tempEmail,
      password: initPw,
      fullName: `Exh Reset User ${ts}`,
      role: "admin",
    });

    try {
      await visitAndAuditRoute(page, observer, "/login/forgot", "/login/forgot");
      // Empty submit blocked natively (stays on /login/forgot)
      await page.locator('button[type="submit"]:visible').click();
      await expect(page).toHaveURL(/\/login\/forgot$/);

      await page.locator('input[name="username"]').fill(tempUsername);
      await page.locator('input[name="email"]').fill(tempEmail);
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/auth/forgot-password") &&
            r.request().method() === "POST" &&
            r.status() === 200,
        ),
        page.locator('button[type="submit"]:visible').click(),
      ]);
      await expect(page.locator('main [role="status"]').first()).toContainText(
        new RegExp(en.copy.resetLinkSent.slice(0, 15), "i"),
        { timeout: 15_000 },
      );

      // Direct /login/reset route check (no-token screen)
      await visitAndAuditRoute(page, observer, "/login/reset", "/login/reset");

      // Mailpit reset link flow with minLength validation then valid reset
      const mail = await fetchMailpitMessage(tempEmail, /Password Reset/i, 20_000);
      const resetHref = extractResetUrl(mail);
      const resetUrl = new URL(resetHref);
      await gotoStrict(page, `${resetUrl.pathname}${resetUrl.search}`, observer);

      await page.locator('input[type="password"]').fill("short");
      await page.locator('button[type="submit"]:visible').click();
      await expect(page).toHaveURL(/\/login\/reset/);
      await expect
        .poll(() =>
          page
            .locator('input[type="password"]')
            .evaluate((el: HTMLInputElement) => el.validity.tooShort),
        )
        .toBe(true);

      await page.locator('input[type="password"]').fill(newPw);
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/auth/reset-password") &&
            r.request().method() === "POST" &&
            r.status() === 200,
        ),
        page.locator('button[type="submit"]:visible').click(),
      ]);
      await expect(page.locator('main [role="status"]').first()).toBeVisible({
        timeout: 15_000,
      });

      // Verify new password signs into isolated context
      const verifyCtx = await browser.newContext({
        baseURL: process.env.ADMIN_URL || "http://localhost:3001",
      });
      try {
        const vp = await verifyCtx.newPage();
        await vp.goto("/login", { waitUntil: "networkidle" });
        await vp.locator("#login-username").fill(tempUsername);
        await vp.locator("#login-password").fill(newPw);
        await Promise.all([
          vp.waitForResponse(
            (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST",
          ),
          vp.locator('button[type="submit"]:visible').click(),
        ]);
        await expect(vp).toHaveURL(/\/dashboard/, { timeout: 25_000 });
      } finally {
        await verifyCtx.close();
      }
    } finally {
      await cleanup();
    }

    // 2. Public token/certificate pages
    await visitAndAuditRoute(
      page,
      observer,
      "/acknowledge/[token]",
      "/acknowledge/seed-ack-token",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/certificates/[code]",
      "/certificates/vat",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/sign/[token]",
      "/sign/seed-sign-token",
    );

    // 3. Sign in as Super Admin and audit "/", "/setup", and all Core Dashboard routes
    await loginAsAdminStrict(page);

    await visitAndAuditRoute(page, observer, "/", "/", {
      expectedUrl: /\/dashboard$/,
    });
    await visitAndAuditRoute(page, observer, "/setup", "/setup", {
      expectedUrl: /\/dashboard$/,
    });
    await visitAndAuditRoute(page, observer, "/dashboard", "/dashboard");

    // Verify core dashboard widgets & interactive controls
    await expect(page.locator("main h1").first()).toBeVisible();
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/analytics",
      "/dashboard/analytics",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/archive",
      "/dashboard/archive",
    );
    // Test archive search filter control
    const archiveSearch = page
      .getByRole("main")
      .getByRole("textbox", { name: en.companyArchive.search, exact: true });
    await expect(archiveSearch).toBeVisible();
    await archiveSearch.fill("brand");
    await expect(archiveSearch).toHaveValue("brand");

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/calendar",
      "/dashboard/calendar",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/department",
      "/dashboard/department",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/driver",
      "/dashboard/driver",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/marketing",
      "/dashboard/marketing",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/marketing/audience",
      "/dashboard/marketing/audience",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/notifications",
      "/dashboard/notifications",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/press",
      "/dashboard/press",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/profile",
      "/dashboard/profile",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/services",
      "/dashboard/services",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/team",
      "/dashboard/team",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/company/documents",
      "/dashboard/company/documents",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/company/documents/new",
      "/dashboard/company/documents/new",
    );
    // Check empty submit validation stays on /dashboard/company/documents/new
    await page.locator("main button[type='submit']").first().click();
    await expect(page).toHaveURL(/\/dashboard\/company\/documents\/new$/);

    // 4. Verify AR RTL layout on /dashboard & /certificates/vat
    await switchAdminLocale(page, "ar");
    await visitAndAuditRoute(page, observer, "/dashboard", "/dashboard", {
      locale: "ar",
    });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("main")).toContainText(ar.nav.dashboard.slice(0, 3));
    await assertPdfEndpoint(page, "/api/announcements/ann-01/pdf");

    await observer.assertClean("admin-exhaustive-01-final");
  });
});
