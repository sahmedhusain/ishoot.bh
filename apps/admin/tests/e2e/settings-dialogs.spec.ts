import { selectOption } from "../../select-option";
import { expect, test } from "@playwright/test";
import { formatMessage } from "@platform/locales";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
const en = enLocale.admin;
const ar = arLocale.admin;

for (const locale of ["en", "ar"] as const) {
  test(`shared service, payroll and settings dialogs preserve failed edits (${locale})`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : ar;
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 900,
    });
    await page.addInitScript((locale) => {
      localStorage.setItem("platform_admin_locale", locale);
      localStorage.setItem(
        "platform_admin_theme",
        locale === "ar" ? "dark" : "light",
      );
    }, locale);
    const nativeDialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      nativeDialogs.push(dialog.type());
      await dialog.dismiss();
    });
    await page.goto("/dashboard/services");
    await page
      .getByRole("main")
      .getByRole("button", { name: t.servicesView.addService, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAccessibleName(t.servicesView.modalNewTitle);
    await dialog
      .getByLabel(t.servicesView.codeLabel, { exact: true })
      .fill("E2E-DIALOG");
    await dialog.getByLabel(t.servicesView.categoryLabel).fill("E2E category");
    const names = dialog.locator('[name="nameEn"], [name="nameAr"]');
    for (const name of await names.all())
      await name.fill("E2E retained service");
    await dialog.getByRole("spinbutton").fill("12.5");
    let serviceCalls = 0;
    let releaseService!: () => void;
    const blockedService = new Promise<void>((resolve) => {
      releaseService = resolve;
    });
    await page.route("**/dashboard/services", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      serviceCalls++;
      await blockedService;
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Test save failure",
      });
    });
    await dialog
      .getByRole("button", { name: t.actions.add, exact: true })
      .click();
    try {
      await expect(
        dialog.getByRole("button", { name: t.actions.cancel, exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog
        .locator("form")
        .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    } finally {
      releaseService();
    }
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(
      dialog.getByLabel(t.servicesView.codeLabel, { exact: true }),
    ).toHaveValue("E2E-DIALOG");
    expect(serviceCalls).toBe(1);
    await dialog
      .getByRole("button", { name: t.actions.cancel, exact: true })
      .click();

    await page.goto("/dashboard/hr/payroll");
    await page
      .getByRole("main")
      .getByRole("button", {
        name: t.payrollManagement.generateMonthlyRun,
        exact: true,
      })
      .first()
      .click();
    await expect(dialog).toHaveAccessibleName(
      t.payrollManagement.generateMonthlyPayrollCycle,
    );
    await selectOption(
      dialog.getByLabel(t.payrollManagement.month, { exact: true }),
      "3",
    );
    const year = dialog.getByLabel(t.payrollManagement.year, { exact: true });
    await year.fill("2019");
    await dialog
      .getByRole("button", {
        name: t.payrollManagement.generateRun,
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toHaveText(
      formatMessage(t.payrollManagement.invalidPeriod, {
        startYear: 2020,
        endYear: 2035,
      }),
    );
    await year.fill("2026");
    await page.route("**/dashboard/hr/payroll", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 500,
            contentType: "text/plain",
            body: "Test calculation failure",
          })
        : route.continue(),
    );
    await dialog
      .getByRole("button", {
        name: t.payrollManagement.generateRun,
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(year).toHaveValue("2026");
    await expect(
      dialog
        .getByLabel(t.payrollManagement.month, { exact: true })
        .locator("..")
        .locator("select"),
    ).toHaveValue("3");
    await dialog
      .getByRole("button", { name: t.shared.cancel, exact: true })
      .click();

    await page.goto("/dashboard/settings/company");
    const main = page.getByRole("main");
    const name = main.locator("input").first();
    const changedName = `${await name.inputValue()} E2E`;
    await name.fill(changedName);
    await main
      .getByRole("button", { name: t.actions.save, exact: true })
      .first()
      .click();
    await expect(dialog).toHaveAccessibleName(
      t.companySettingsView.diffModalTitle,
    );
    await expect(dialog).toContainText(changedName);
    let releaseCompany!: () => void;
    const blockedCompany = new Promise<void>((resolve) => {
      releaseCompany = resolve;
    });
    await page.route("**/dashboard/settings/company", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await blockedCompany;
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Test save failure",
      });
    });
    await dialog
      .getByRole("button", {
        name: t.companySettingsView.confirmChanges,
        exact: true,
      })
      .click();
    try {
      await expect(
        dialog.getByRole("button", {
          name: t.companySettingsView.cancel,
          exact: true,
        }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } finally {
      releaseCompany();
    }
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog
      .getByRole("button", { name: t.companySettingsView.cancel, exact: true })
      .click();
    await expect(name).toHaveValue(changedName);
    await main
      .getByRole("tab", { name: t.companySettingsTabs.taxVat, exact: true })
      .click();
    const vat = main.getByRole("switch", {
      name: t.companySettingsTabs.vatStateLabel,
      exact: true,
    });
    const checked = await vat.getAttribute("aria-checked");
    await vat.click();
    await dialog
      .getByRole("button", {
        name: t.companySettingsTabs.cancelTaxChange,
        exact: true,
      })
      .click();
    await expect(vat).toHaveAttribute("aria-checked", checked!);
    await vat.click();
    await dialog
      .getByRole("button", {
        name: t.companySettingsTabs.applyTaxChange,
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(vat).toHaveAttribute(
      "aria-checked",
      checked === "true" ? "false" : "true",
    );
    expect(nativeDialogs).toEqual([]);
  });
}
