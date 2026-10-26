import { expect, test } from "@playwright/test";
import {
  brokenImages,
  channels,
  demo,
  visibleContent,
  otherCompanyNames,
  themeVariable,
  watchErrors,
} from "../../helpers";

const PAGES = ["", "/works", "/about", "/contact"];

for (const locale of ["en", "ar"] as const) {
  for (const path of PAGES) {
    test(`/${locale}${path} renders with the company brand`, async ({
      page,
    }) => {
      const errors = watchErrors(page);
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page).toHaveTitle(
        new RegExp(
          locale === "ar"
            ? demo.company.companyNameAr
            : demo.company.companyNameEn,
        ),
      );
      expect(await themeVariable(page, "--brand-primary")).toBe(
        channels(demo.theme.primary),
      );
      expect(await brokenImages(page)).toEqual([]);
      const html = await visibleContent(page);
      for (const name of otherCompanyNames)
        expect(html, `found "${name}"`).not.toContain(name);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      errors.assertClean();
    });
  }
}

test("unknown pages return 404", async ({ page }) => {
  const response = await page.goto("/en/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});
