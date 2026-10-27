import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { alertMessage } from "../../helpers";
import en from "../../../../packages/locales/src/admin/en.json";
import ar from "../../../../packages/locales/src/admin/ar.json";

test.use({ storageState: { cookies: [], origins: [] } });
for (const locale of ["en", "ar"] as const)
  for (const screen of ["login", "forgot", "reset"] as const) {
    test(`authentication surfaces fit and retain readable errors (${locale}, ${screen})`, async ({
      page,
    }) => {
      const t = locale === "ar" ? ar : en;
      await page.addInitScript((locale) => {
        localStorage.setItem("platform_admin_locale", locale);
        localStorage.setItem(
          "platform_admin_theme",
          locale === "ar" ? "dark" : "light",
        );
      }, locale);
      const url =
        screen === "login"
          ? "/login"
          : screen === "forgot"
            ? "/login/forgot"
            : "/login/reset?token=layout-test&email=audit%40example.test";
      await page.goto(url);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        ).toBeLessThanOrEqual(1);
      }
      const initial = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        initial.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      if (screen === "login") {
        await page.getByLabel(t.loginView.emailLabel, { exact: true }).click();
        await expect(
          page.getByLabel(t.loginView.emailLabel, { exact: true }),
        ).toBeFocused();
        const email = page.getByLabel(t.loginView.emailLabel, { exact: true });
        const decorated = await email.evaluate((element) => {
          const field = element as HTMLElement,
            box = field.getBoundingClientRect();
          const icon = field
            .parentElement!.querySelector("svg")!
            .getBoundingClientRect();
          return {
            direction: getComputedStyle(field).direction,
            contentStart:
              box.left + parseFloat(getComputedStyle(field).paddingLeft),
            iconEnd: icon.right,
          };
        });
        expect(decorated.direction).toBe("ltr");
        expect(decorated.contentStart).toBeGreaterThan(decorated.iconEnd);
        return;
      }
      await page.route(
        `**/api/auth/${screen === "forgot" ? "forgot-password" : "reset-password"}`,
        (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "INVALID_INPUT" }),
          }),
      );
      if (screen === "forgot")
        await page
          .getByLabel(t.forgotPasswordForm.emailAddress, { exact: true })
          .fill("audit@example.test");
      else
        await page
          .getByLabel(t.resetPasswordForm.newPassword, { exact: true })
          .fill("layout-test-password");
      await page.locator('button[type="submit"]').click();
      await expect(alertMessage(page).filter({ visible: true })).toBeVisible();
      const errors = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        errors.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
    });
  }
