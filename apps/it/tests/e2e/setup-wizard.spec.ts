import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  alertMessage,
  channels,
  login,
  themeVariable,
  watchErrors,
} from "../../helpers";
import { t } from "../helpers/locale";
import { selectOption } from "../../select-option";

// One continuous first-run journey on a blank install: the database is prepared fresh for every run.
test.describe.configure({ mode: "serial", retries: 0 });

const copy = t.setupWizard;
const logo = path.resolve(
  __dirname,
  "../../../../company/profiles/demo/assets/brand/logo-light.png",
);

test("a new company completes the setup wizard and gets its own brand and website", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await login(page);
  await expect(page).toHaveURL(/\/setup$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);

  // Step 1: what the company does comes first, then languages and identity
  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(
    t.serverErrors.messages.businessActivityInvalid,
  );
  await page.getByTestId("activity-products").click();
  // An English-only company fills each field once: there is no Arabic name to enter.
  await page.getByTestId("languages-en").click();
  await expect(page.locator('input[name="companyNameAr"]')).toHaveCount(0);
  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(copy.company.required);
  await page.locator('input[name="companyNameEn"]').fill("Acme Trading W.L.L.");
  await page
    .locator('input[name="taglineEn"]')
    .fill("Office furniture, delivered.");
  await page.locator('input[name="crNumber"]').fill("CR-12345-1");
  await page.locator('input[name="email"]').fill("hello@acme.example");
  await page
    .getByLabel(copy.company.whatsapp, { exact: true })
    .fill("+97336000000");
  await page.getByTestId("setup-next").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.brand,
  );
  // The single name is shown in both languages.
  await expect(page).toHaveTitle(/Acme Trading/);

  // Step 2: the activity's recommended style is applied, then changed by hand and previewed live
  await expect(page.getByTestId("theme-preview")).toHaveAttribute(
    "style",
    /--brand-primary:\s*6 78 59/,
  );
  await page.getByRole("button", { name: "#7F1D1D / #DC2626" }).click();
  await page
    .getByRole("radio", { name: /^Cairo/ })
    .nth(1)
    .click();
  await expect(page.getByTestId("theme-preview")).toHaveAttribute(
    "style",
    /--brand-primary:\s*127 29 29/,
  );
  // The real website is shown below the editor, at desktop or phone width
  await expect(
    page.getByTestId("website-preview").locator("iframe"),
  ).toBeVisible();
  await page
    .getByTestId("website-preview")
    .getByRole("button", { name: copy.preview.phone })
    .click();
  await expect(
    page
      .getByTestId("website-preview")
      .getByRole("button", { name: copy.preview.phone }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("setup-next").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.assets,
  );
  await expect
    .poll(() => themeVariable(page, "--brand-primary"))
    .toBe(channels("#7F1D1D"));
  await expect
    .poll(() => themeVariable(page, "--brand-font-heading"))
    .toContain("Cairo");

  // Step 3: a logo is required, then uploaded through the normal upload flow
  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(copy.assets.logoRequired);
  await page.locator("#asset-logo_light").setInputFiles(logo);
  await expect(
    page.getByTestId("asset-logo_light").locator("img"),
  ).toHaveAttribute("src", /\/api\/files\/brand\//, { timeout: 60_000 });
  await page.getByTestId("setup-next").click();

  // Step 4: a products website, recommended for the activity and then adjusted
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.website,
  );
  await expect(page.getByTestId("website-on")).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator('input[name="collectionNavEn"]')).toHaveValue(
    "Products",
  );
  await expect(page.locator('input[name="collectionNavAr"]')).toHaveCount(0);
  await page.locator('input[name="collectionNavEn"]').fill("Shop");
  await page.getByLabel(copy.website.collectionSlug).fill("shop");
  await expect(page.getByTestId("example-products")).toBeVisible();
  await page.getByTestId("sample-content").check();
  await page.getByTestId("setup-next").click();

  // Step 5: configuration; modules follow the activity (no studio equipment for a shop)
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.configuration,
  );
  await expect(page.getByLabel("مخزون المعدات")).not.toBeChecked();
  await expect(page.getByLabel("إدارة محتوى الموقع")).toBeChecked();
  // Priced samples already exist, so the accounting currency must stay fixed.
  await selectOption(page.getByLabel(copy.configuration.currency), "BHD");
  await page.getByLabel(copy.configuration.invoicePrefix).fill("ACM");
  await expect(page.getByText(/ACM-\d{4}-0001/)).toBeVisible();
  // Departments follow the activity (a shop has a warehouse, not public relations) and bring their roles
  const departments = page.getByTestId("setup-departments");
  await expect(
    departments.getByLabel(t.departmentCatalogue.warehouse),
  ).toBeChecked();
  await expect(
    departments.getByLabel(t.departmentCatalogue.pr),
  ).not.toBeChecked();
  await departments.getByLabel(t.departmentCatalogue.legal).check();
  await expect(
    departments
      .getByRole("listitem")
      .filter({ hasText: t.roles.legal_counsel }),
  ).toBeVisible();
  await page.getByTestId("setup-next").click();

  // Step 6: review and finish (the website is published on the way)
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.review,
  );
  await expect(page.getByText("#7F1D1D · #DC2626")).toBeVisible();
  await expect(page.getByText(/\/en\/shop/)).toBeVisible();
  await expect(page.getByText(copy.review.willPublish)).toBeVisible();
  await page.getByTestId("setup-next").click();
  await expect(
    page.getByRole("status").filter({ hasText: copy.finished }),
  ).toBeVisible();
  // The dashboard may be compiling for the first time on a development server.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  await expect(page).toHaveTitle(/Acme Trading/);

  // Setup never shows again, the theme stays editable in settings, and the website is live
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/settings/company");
  await page.getByRole("tab", { name: copy.steps.brand }).click();
  await expect(page.getByTestId("theme-preview")).toHaveAttribute(
    "style",
    /--brand-primary:\s*127 29 29/,
  );
  await page.goto("/dashboard/cms/website");
  await expect(
    page.getByRole("main").getByText(t.websiteEditor.lastPublished),
  ).toBeVisible();
  // The samples went live with the website, and one click removes them
  await page.goto("/dashboard/cms/portfolio");
  await expect(
    page.getByText(/Classic Chair|الكرسي الكلاسيكي/).first(),
  ).toBeVisible();
  await page.goto("/dashboard/cms/website");
  await page.getByTestId("remove-samples").click();
  await expect(page.getByTestId("add-samples")).toBeVisible();
  // The chosen departments were created, the activity's and the one added by hand
  await page.goto("/dashboard/settings/departments");
  await expect(
    page.getByText(t.departmentCatalogue.warehouse).first(),
  ).toBeVisible();
  await expect(
    page.getByText(t.departmentCatalogue.legal).first(),
  ).toBeVisible();
  errors.assertClean();
});
