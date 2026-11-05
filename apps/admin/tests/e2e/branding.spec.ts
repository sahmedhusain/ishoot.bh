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
import { t } from "../helpers/locale";

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
});

test("the dashboard uses the company's theme, fonts and logos", async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.reload();
  expect(await themeVariable(page, "--brand-primary")).toBe(
    channels(demo.theme.primary),
  );
  expect(await themeVariable(page, "--brand-accent")).toBe(
    channels(demo.theme.accent),
  );
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
  ).toContain(demo.theme.fonts.body.family);
  expect(await brokenImages(page)).toEqual([]);
  const html = await visibleContent(page);
  for (const name of otherCompanyNames)
    expect(html, `found "${name}"`).not.toContain(name);
  expect(html).not.toMatch(/["'(]\/(brand|branding|fonts|banners)\//);
  errors.assertClean();
});

test("changing the theme in settings re-colours the app", async ({ page }) => {
  await page.goto("/dashboard/settings/company");
  await page.getByRole("tab", { name: t.setupWizard.steps.brand }).click();
  const accent = page
    .getByLabel(t.setupWizard.brand.accent, { exact: true })
    .last();
  await accent.fill("#DC2626");
  await page.getByTestId("theme-save").click();
  await expect
    .poll(() => themeVariable(page, "--brand-accent"))
    .toBe(channels("#DC2626"));
  // Restore the demo accent for the other tests.
  await accent.fill(demo.theme.accent);
  await page.getByTestId("theme-save").click();
  await expect
    .poll(() => themeVariable(page, "--brand-accent"))
    .toBe(channels(demo.theme.accent));
});
