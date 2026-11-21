import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { assertPdfEndpoint, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 07 — Delivery, Assets, Tasks, Approvals, Letters, MoMs, Legal, IT Support & Announcements (34 routes)", () => {
  test("all 34 Operations routes audit tabs, inputs, validations, PDFs, and AR RTL layout", async ({
    page,
  }) => {
    test.setTimeout(480_000);
    const observer = createStrictObserver(page, "admin-exhaustive-07");

    await page.addInitScript(() =>
      localStorage.setItem("platform_admin_locale", "en"),
    );
    await loginAsAdminStrict(page);

    // Delivery & Fleet (8 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/delivery", "/dashboard/delivery");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/agencies",
      "/dashboard/delivery/agencies",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/cash",
      "/dashboard/delivery/cash",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/fleet",
      "/dashboard/delivery/fleet",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/routes",
      "/dashboard/delivery/routes",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/routes/[id]",
      "/dashboard/delivery/routes/rs-001",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/settings",
      "/dashboard/delivery/settings",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/delivery/[id]",
      "/dashboard/delivery/shp-001",
    );

    // Assets (5 routes) + Asset handover PDF
    await visitAndAuditRoute(page, observer, "/dashboard/assets", "/dashboard/assets");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/assets/categories",
      "/dashboard/assets/categories",
    );
    await visitAndAuditRoute(page, observer, "/dashboard/assets/new", "/dashboard/assets/new");
    await page.locator("main button[type='submit']").first().click();
    await expect(page).toHaveURL(/\/dashboard\/assets\/new$/);

    await visitAndAuditRoute(page, observer, "/dashboard/assets/[id]", "/dashboard/assets/ca-1");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/assets/handovers/[id]",
      "/dashboard/assets/handovers/iastho-01",
    );
    await assertPdfEndpoint(page, "/api/assets/handovers/iastho-01/pdf");

    // Tasks & Projects (4 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/tasks", "/dashboard/tasks");
    await visitAndAuditRoute(page, observer, "/dashboard/tasks/[id]", "/dashboard/tasks/tsk-001");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/tasks/projects",
      "/dashboard/tasks/projects",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/tasks/projects/[id]",
      "/dashboard/tasks/projects/prj-001",
    );

    // Approvals (2 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/approvals", "/dashboard/approvals");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/approvals/[type]/[id]",
      "/dashboard/approvals/invoice/inv-001",
    );

    // Letters + PDF (4 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/letters", "/dashboard/letters");
    await visitAndAuditRoute(page, observer, "/dashboard/letters/new", "/dashboard/letters/new");
    const letterInput = page.locator("main input:not([type='hidden']):not([readonly])").first();
    await expect(letterInput).toBeVisible();
    await letterInput.fill("E2E Letter Recipient Draft");
    await expect(letterInput).toHaveValue("E2E Letter Recipient Draft");

    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/letters/templates",
      "/dashboard/letters/templates",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/letters/[id]",
      "/dashboard/letters/olet-001",
    );
    await assertPdfEndpoint(page, "/api/letters/olet-001/pdf");

    // MoMs + PDF (3 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/moms", "/dashboard/moms");
    await visitAndAuditRoute(page, observer, "/dashboard/moms/new", "/dashboard/moms/new");
    await visitAndAuditRoute(page, observer, "/dashboard/moms/[id]", "/dashboard/moms/mom-001");
    await assertPdfEndpoint(page, "/api/moms/mom-001/pdf");

    // Legal (2 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/legal", "/dashboard/legal");
    await visitAndAuditRoute(page, observer, "/dashboard/legal/[id]", "/dashboard/legal/lgl-01");

    // IT Support (3 routes)
    await visitAndAuditRoute(page, observer, "/dashboard/it-support", "/dashboard/it-support");
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/it-support/new",
      "/dashboard/it-support/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/it-support/[id]",
      "/dashboard/it-support/e3046d28-10ba-4ae2-a5ec-95ba400c7990",
    );

    // Announcements (3 routes)
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/announcements",
      "/dashboard/announcements",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/announcements/new",
      "/dashboard/announcements/new",
    );
    await visitAndAuditRoute(
      page,
      observer,
      "/dashboard/announcements/[id]",
      "/dashboard/announcements/ann-01",
    );

    await observer.assertClean("admin-exhaustive-07-final");
  });
});
