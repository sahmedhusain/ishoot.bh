import path from "node:path";
import { expect, test } from "@playwright/test";
import { alertMessage, channels, login, themeVariable, watchErrors } from "../../helpers";
import { t } from "../../locale";

// One continuous first-run journey on a blank install: the database is prepared fresh for every run.
test.describe.configure({ mode: "serial", retries: 0 });

const copy = t.setupWizard;
const logo = path.resolve(__dirname, "../../../../company/profiles/demo/assets/brand/logo-light.png");

test("a new company completes the setup wizard and gets its own brand", async ({ page }) => {
  const errors = watchErrors(page);
  await login(page);
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.title);

  // Step 1: company identity (both names required)
  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(copy.company.required);
  await page.locator('input[name="companyNameEn"]').fill("Acme Trading W.L.L.");
  await page.locator('input[name="companyNameAr"]').fill("أكمي للتجارة ذ.م.م");
  await page.locator('input[name="crNumber"]').fill("CR-12345-1");
  await page.locator('input[name="email"]').fill("hello@acme.example");
  await page.getByTestId("setup-next").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(copy.steps.brand);
  await expect(page).toHaveTitle(/أكمي للتجارة/);

  // Step 2: colours and fonts, previewed live, then applied to the whole app
  await page.getByRole("button", { name: "#7F1D1D / #DC2626" }).click();
  await page.getByRole("radio", { name: "Cairo" }).nth(1).click();
  await expect(page.getByTestId("theme-preview")).toHaveAttribute("style", /--brand-primary:\s*127 29 29/);
  await page.getByTestId("setup-next").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(copy.steps.assets);
  await expect.poll(() => themeVariable(page, "--brand-primary")).toBe(channels("#7F1D1D"));
  await expect.poll(() => themeVariable(page, "--brand-font-heading")).toContain("Cairo");

  // Step 3: a logo is required, then uploaded through the normal upload flow
  await page.getByTestId("setup-next").click();
  await expect(alertMessage(page)).toHaveText(copy.assets.logoRequired);
  await page.locator("#asset-logo_light").setInputFiles(logo);
  await expect(page.getByTestId("asset-logo_light").locator("img")).toHaveAttribute("src", /\/api\/files\/brand\//);
  await page.getByTestId("setup-next").click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(copy.steps.configuration);

  // Step 4: configuration
  await page.getByLabel(copy.configuration.currency).selectOption("SAR");
  await page.getByLabel(copy.configuration.invoicePrefix).fill("ACM");
  await expect(page.getByText(/ACM-\d{4}-0001/)).toBeVisible();
  await page.getByTestId("setup-next").click();

  // Step 5: review and finish
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(copy.steps.review);
  await expect(page.getByText("#7F1D1D · #DC2626")).toBeVisible();
  await page.getByTestId("setup-next").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page).toHaveTitle(/أكمي للتجارة/);

  // Setup never shows again, and the theme stays editable in settings
  await page.goto("/setup");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/settings/company");
  await page.getByRole("button", { name: copy.steps.brand }).click();
  await expect(page.getByTestId("theme-preview")).toHaveAttribute("style", /--brand-primary:\s*127 29 29/);
  errors.assertClean();
});
