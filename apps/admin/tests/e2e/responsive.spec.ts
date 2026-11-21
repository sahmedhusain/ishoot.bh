import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin-audit";

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

for (const path of [
  "/dashboard",
  "/dashboard/archive",
  "/dashboard/assets",
  "/dashboard/invoices",
  "/dashboard/settings/company",
]) {
  test(`${path} fits the viewport`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
