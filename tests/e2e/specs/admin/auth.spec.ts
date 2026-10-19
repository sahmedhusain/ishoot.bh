import { expect, test } from "@playwright/test";
import { alertMessage, demo, login } from "../../helpers";

test("protected pages send people to the login page", async ({ page }) => {
  await page.goto("/dashboard/invoices");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Finvoices/);
});

test("a wrong password is refused with a visible message", async ({ page }) => {
  await login(page, demo.company.email, "not-the-password-123");
  await expect(alertMessage(page)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("the admin signs in to the company dashboard", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page).toHaveTitle(new RegExp(demo.company.companyNameAr));
});
