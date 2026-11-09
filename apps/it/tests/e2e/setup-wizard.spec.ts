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

test.describe.configure({ mode: "serial", retries: 0 });

const copy = t.setupWizard;
const logo = path.resolve(
  __dirname,
  "../../../../seeds/assets/demo/assets/brand/logo-light.png",
);

test("a new company completes the setup wizard and gets its own brand and website", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await login(page);
  await expect(page).toHaveURL(/\/setup$/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);

  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(
    t.serverErrors.messages.businessActivityInvalid,
  );
  await page.getByTestId("activity-products").click();

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

  await expect(page).toHaveTitle(/Acme Trading/);

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

  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(copy.assets.logoRequired);
  await page.locator("#asset-logo_light").setInputFiles(logo);
  await expect(
    page.getByTestId("asset-logo_light").locator("img"),
  ).toHaveAttribute("src", /\/api\/files\/brand\//, { timeout: 60_000 });
  await page.getByTestId("setup-next").click();

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

  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    copy.steps.configuration,
  );
  await expect(page.getByLabel("مخزون المعدات")).not.toBeChecked();
  await expect(page.getByLabel("إدارة محتوى الموقع")).toBeChecked();

  await selectOption(page.getByLabel(copy.configuration.currency), "BHD");
  await page.getByLabel(copy.configuration.invoicePrefix).fill("ACM");
  await expect(page.getByText(/ACM-\d{4}-0001/)).toBeVisible();

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
      .filter({ hasText: /legal_counsel|Legal Counsel|مستشار قانوني/i }),
  ).toBeVisible();
  await page.getByTestId("setup-next").click();

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

  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  await expect(page).toHaveTitle(/Acme Trading/);

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

  await page.goto("/dashboard/cms/portfolio");
  await expect(
    page.getByText(/Classic Chair|الكرسي الكلاسيكي/).first(),
  ).toBeVisible();
  await page.goto("/dashboard/cms/website");
  await page.getByTestId("remove-samples").click();
  await expect(page.getByTestId("add-samples")).toBeVisible();

  await page.goto("/dashboard/settings/departments");
  await expect(
    page.getByText(t.departmentCatalogue.warehouse).first(),
  ).toBeVisible();
  await expect(
    page.getByText(t.departmentCatalogue.legal).first(),
  ).toBeVisible();
  errors.assertClean();
});
