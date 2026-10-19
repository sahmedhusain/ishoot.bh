import { expect, test } from "@playwright/test";
import { login } from "../../helpers";

// Phone and desktop widths: key pages fit the screen without sideways scrolling.
for (const path of ["/dashboard", "/dashboard/archive", "/dashboard/assets", "/dashboard/invoices", "/dashboard/settings/company"]) {
  test(`${path} fits the viewport`, async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
