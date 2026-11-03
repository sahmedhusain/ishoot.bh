import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { t } from "../../locale";
import { STYLE_PRESETS } from "../../lib/database/constants/theme";
import { acceptConfirmations } from "../../helpers";

for (const mode of ["light", "dark"] as const) {
  test.describe(`Material 3 / ${mode}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (mode) => localStorage.setItem("platform_admin_theme", mode),
        mode,
      );
    });

    for (const path of [
      "/dashboard",
      "/dashboard/settings/preferences",
      "/dashboard/crm/contacts",
      "/dashboard/settings/company",
    ]) {
      test(`${path} has accessible controls and contrast`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.ok()).toBe(true);
        await expect(page.locator("main h1").first()).toBeVisible();
        await expect(page.locator("html")).toHaveClass(mode);
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter(
                (animation) =>
                  animation.timeline instanceof DocumentTimeline &&
                  Number.isFinite(
                    animation.effect?.getTiming().iterations ?? 1,
                  ),
              )
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
        if (path === "/dashboard") {
          await page.waitForFunction(() => !!customElements.get("md-ripple"));
          const ripple = page
            .locator("button[data-ui=button] md-ripple")
            .first();
          expect(
            await ripple.evaluate(
              (element) =>
                (element as HTMLElement & { control: HTMLElement }).control ===
                element.parentElement,
            ),
          ).toBe(true);
        }
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          scan.violations.map(({ id, nodes }) => ({
            id,
            nodes: nodes.map(({ target, failureSummary }) => ({
              target,
              failureSummary,
            })),
          })),
        ).toEqual([]);
        if (path.endsWith("preferences")) {
          await page.screenshot({
            path: test.info().outputPath(`material-${mode}.png`),
            fullPage: true,
          });
        }
      });
    }
  });
}

test("appearance segments support keyboard input, persistence and OS changes", async ({
  page,
}) => {
  await acceptConfirmations(page);
  await page.goto("/dashboard/settings/preferences");
  const light = page.getByRole("radio", {
    name: t.preferences.lightTitle,
    exact: true,
  });
  const dark = page.getByRole("radio", {
    name: t.preferences.darkTitle,
    exact: true,
  });
  await light.check();
  await light.focus();
  await page.keyboard.press("ArrowDown");
  await expect(dark).toBeChecked();
  await page.getByTestId("appearance-save").first().click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(dark).toBeChecked();
  await page
    .getByRole("radio", { name: t.preferences.systemTitle, exact: true })
    .check();
  await page.getByTestId("appearance-save").first().click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass("dark");
});

test("compact RTL drawer keeps focus and reduced motion preferences", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard/settings/preferences");
  const trigger = page.getByRole("button", {
    name: t.topbar.toggleNavigationMenu,
  });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: t.sidebar.mobileNavigation });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(t.nav.dashboard);
  await page.keyboard.press("Tab");
  await expect(drawer).toContainText(t.nav.dashboard);
  expect(
    await drawer.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  expect(
    await drawer.evaluate((element) => getComputedStyle(element).transform),
  ).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("appearance presets preview Material roles and shared company shapes", async ({
  page,
}) => {
  await page.goto("/dashboard/settings/company");
  await page
    .getByRole("tab", { name: t.setupWizard.steps.brand, exact: true })
    .click();
  const presets = page.locator('[aria-labelledby="theme-styles"] button');
  await expect(presets).toHaveCount(STYLE_PRESETS.length);
  const preview = page.getByTestId("theme-preview");
  for (let index = 0; index < STYLE_PRESETS.length; index++) {
    await presets.nth(index).click();
    await expect(presets.nth(index)).toHaveAttribute("aria-pressed", "true");
    expect(
      await preview.evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue("--md-sys-color-primary")
          .trim(),
      ),
    ).toMatch(/^#[0-9a-f]{6}$/);
  }
  await page
    .getByRole("button", {
      name: t.setupWizard.brand.previewAdmin,
      exact: true,
    })
    .click();
  await expect(
    page.getByText(t.setupWizard.brand.adminShapeHint, { exact: true }),
  ).toBeVisible();
  expect(
    await preview
      .locator("[data-preview-primary]")
      .evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe(
    await preview.evaluate((element) =>
      getComputedStyle(element)
        .getPropertyValue("--brand-button-radius")
        .trim(),
    ),
  );
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    scan.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
});
