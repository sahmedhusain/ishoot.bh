import users from "../../fixtures/users.json";
import { t } from "../helpers/locale";
import { expect, test } from "@playwright/test";
import { admin, alertMessage, demo, login, testDatabase } from "../../helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test("protected pages send people to the login page", async ({ page }) => {
  await page.goto("/dashboard/invoices");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Finvoices/);
});

test("a wrong password is refused with a visible message", async ({ page }) => {
  await login(page, demo.company.email, "not-the-password-123");
  await expect(alertMessage(page)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("the admin signs in to the company dashboard and the sign-in is audited", async ({
  page,
}) => {
  const db = testDatabase();
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { email: admin.email },
    });
    const before = await db.activityLog.count({
      where: { userId: user.id, action: "login" },
    });
    await login(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page).toHaveTitle(new RegExp(demo.company.companyNameAr));
    await expect
      .poll(() =>
        db.activityLog.count({ where: { userId: user.id, action: "login" } }),
      )
      .toBe(before + 1);
  } finally {
    await db.$disconnect();
  }
});

test("a narrow-role denial has one main landmark and does not expose the user directory", async ({
  page,
}) => {
  await login(page, users.driver.email, users.driver.password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/users");
  await expect(
    page.getByRole("heading", { name: t.forbidden.title }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("table")).toHaveCount(0);
});
