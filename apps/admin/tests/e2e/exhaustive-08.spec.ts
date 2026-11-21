import { expect, test } from "@playwright/test";
import { createStrictObserver, loginAsAdminStrict } from "./helpers/strict-audit";
import { setAdminGovernance } from "./helpers/governance";
import { en, visitAndAuditRoute } from "./helpers/exhaustive-helper";

test.describe("Admin Exhaustive 08 — CMS & Website Experience (13 routes)", () => {
  test("all 13 CMS routes render with governance delegation, preserve unsaved article edits, and validate modals", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const observer = createStrictObserver(page, "admin-exhaustive-08");

    await setAdminGovernance({ web: true, company: true, appearance: true });
    try {
      await page.addInitScript(() =>
        localStorage.setItem("platform_admin_locale", "en"),
      );
      await loginAsAdminStrict(page);

      await visitAndAuditRoute(page, observer, "/dashboard/cms/website", "/dashboard/cms/website");
      await visitAndAuditRoute(page, observer, "/dashboard/cms/pages", "/dashboard/cms/pages");
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/pages/[id]",
        "/dashboard/cms/pages/pg-home",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/articles",
        "/dashboard/cms/articles",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/articles/[id]",
        "/dashboard/cms/articles/art-1",
      );

      // Ported unsaved-changes check on article editor
      const main = page.getByRole("main");
      const titleInput = main
        .getByRole("textbox", {
          name: new RegExp(`^${en.cmsArticles.fields.title}( \\(|$)`),
        })
        .first();
      await expect(titleInput).toBeVisible();
      const origTitle = await titleInput.inputValue();
      await titleInput.fill(`${origTitle} E2E Draft`);
      await main.locator('a[href="/dashboard/cms/articles"]').click();
      const unsavedDialog = page.getByRole("dialog", {
        name: en.unsavedChanges.title,
        exact: true,
      });
      await expect(unsavedDialog).toBeVisible();
      await unsavedDialog
        .getByRole("button", { name: en.unsavedChanges.stay, exact: true })
        .click();
      await expect(titleInput).toHaveValue(`${origTitle} E2E Draft`);
      await titleInput.fill(origTitle);

      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/portfolio",
        "/dashboard/cms/portfolio",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/banners",
        "/dashboard/cms/banners",
      );
      await visitAndAuditRoute(page, observer, "/dashboard/cms/faqs", "/dashboard/cms/faqs");
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/reviews",
        "/dashboard/cms/reviews",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/clients",
        "/dashboard/cms/clients",
      );
      await visitAndAuditRoute(
        page,
        observer,
        "/dashboard/cms/equipment",
        "/dashboard/cms/equipment",
      );
      await visitAndAuditRoute(page, observer, "/dashboard/cms/menus", "/dashboard/cms/menus");
      await visitAndAuditRoute(page, observer, "/dashboard/cms/stats", "/dashboard/cms/stats");

      // Open New Stat modal & verify footer submit HTML5 constraint check
      await main
        .getByRole("button", { name: en.statsView.newStat, exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: en.statsView.newStat,
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await dialog.locator('[data-modal-footer] button[type="submit"]').click();
      await expect(dialog).toBeVisible();
      await dialog.locator("[data-modal-header] button").click();
      await expect(dialog).toHaveCount(0);

      await observer.assertClean("admin-exhaustive-08-final");
    } finally {
      await setAdminGovernance(null);
    }
  });
});
