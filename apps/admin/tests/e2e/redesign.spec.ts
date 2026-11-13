import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import enLocale from "../../locales/en.json";
import arLocale from "../../locales/ar.json";
import { acceptConfirmations } from "./helpers/helpers";
const en = enLocale.admin;
const ar = arLocale.admin;

for (const locale of ["en", "ar"] as const) {
  const t = locale === "en" ? en : ar;
  test(`workspace customization and dialog regions (${locale})`, async ({
    page,
  }) => {
    await acceptConfirmations(page);
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 900,
    });
    await page.addInitScript(
      ({ locale }) => {
        localStorage.setItem("platform_admin_locale", locale);
        localStorage.setItem(
          "platform_admin_theme",
          locale === "en" ? "light" : "dark",
        );
      },
      { locale },
    );
    await page.goto("/dashboard/settings/preferences");
    if (locale === "en") {
      await page
        .getByRole("button", {
          name: t.appearance.collapseNavigation,
          exact: true,
        })
        .click();
      await expect(page.locator(".admin-sidebar")).toHaveAttribute(
        "data-collapsed",
        "true",
      );
      await page.reload();
      await expect(page.locator(".admin-sidebar")).toHaveAttribute(
        "data-collapsed",
        "true",
      );
      await page
        .getByRole("button", {
          name: t.appearance.expandNavigation,
          exact: true,
        })
        .click();
      await expect(page.locator(".admin-sidebar")).toHaveAttribute(
        "data-collapsed",
        "false",
      );
    }

    await page
      .getByRole("button", {
        name: new RegExp(`^${t.appearance.presets.focused.name}`),
      })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-density",
      "compact",
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-corners",
      "square",
    );
    for (const [key, value] of [
      ["dialogPlacement", "side"],
      ["backdrop", "dim"],
      ["motion", "none"],
    ] as const) {
      await page
        .getByRole("radiogroup", { name: t.appearance[key], exact: true })
        .getByRole("radio", {
          name: t.appearance.options[key][value],
          exact: true,
        })
        .check();
    }
    await page.getByTestId("appearance-save").first().click();
    await expect(page.getByTestId("appearance-save").first()).toBeDisabled();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-dialog-placement",
      "side",
    );
    await expect(page.locator("html")).toHaveAttribute("data-motion", "none");
    await page.screenshot({
      path: test.info().outputPath(`workspace-${locale}.png`),
    });

    await page.goto("/dashboard/cms/stats");
    await page
      .getByRole("main")
      .getByRole("button", { name: t.statsView.newStat, exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: t.statsView.newStat,
      exact: true,
    });
    const header = dialog.locator("[data-modal-header]");
    const footer = dialog.locator("[data-modal-footer]");
    const body = dialog.locator("[data-dialog-body]");
    await expect(header).toBeVisible();
    await expect(footer).toBeVisible();
    await expect(footer.locator('button[type="submit"]')).toHaveCount(1);
    expect(
      await footer.locator('button[type="submit"]').evaluate((button) => {
        const submit = button as HTMLButtonElement;
        return (
          !!submit.form &&
          submit.form.contains(submit) === false &&
          submit.form.id === submit.getAttribute("form")
        );
      }),
    ).toBe(true);
    await footer.locator('button[type="submit"]').click();
    await expect(dialog).toBeVisible();
    expect(
      await dialog
        .locator("form")
        .evaluate((form) => (form as HTMLFormElement).checkValidity()),
    ).toBe(false);
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 360,
    });
    await expect
      .poll(() =>
        body.evaluate((body) => body.scrollHeight > body.clientHeight),
      )
      .toBe(true);
    const before = await footer.boundingBox();
    await body.evaluate((body) => {
      body.scrollTop = body.scrollHeight;
    });
    const after = await footer.boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 0);
    expect(after!.y + after!.height).toBeLessThanOrEqual(360);
    expect((await header.boundingBox())!.y).toBeGreaterThanOrEqual(0);
    const scan = await new AxeBuilder({ page })
      .include("[data-modal-card]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
    await page.setViewportSize({
      width: locale === "ar" ? 390 : 1440,
      height: 900,
    });
    await page.screenshot({
      path: test.info().outputPath(`dialog-${locale}.png`),
    });
    await header.getByRole("button").click();
    await expect(dialog).toHaveCount(0);
    await page.goto("/dashboard/settings/preferences");
    await page
      .getByRole("button", { name: t.appearance.reset, exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-density",
      "comfortable",
    );
    await expect(page.locator("html")).toHaveAttribute("data-corners", "brand");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page
      .getByRole("radiogroup", { name: t.appearance.motion, exact: true })
      .getByRole("radio", {
        name: t.appearance.options.motion.reduced,
        exact: true,
      })
      .check();
    await page.getByTestId("appearance-save").first().click();
    await expect(page.getByTestId("appearance-save").first()).toBeDisabled();
    await page.goto("/dashboard/cms/stats");
    await page
      .getByRole("main")
      .getByRole("button", { name: t.statsView.newStat, exact: true })
      .click();
    const exitAnimation = await dialog.evaluate(async (card) => {
      (
        card.querySelector("[data-modal-header] button") as HTMLButtonElement
      ).click();
      await Promise.resolve();
      return getComputedStyle(card).animationName;
    });
    expect(exitAnimation).toBe("admin-scrim-out");
    await expect(dialog).toHaveCount(0);
  });
}

test("a modular planner form retains its submit association in the footer", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("platform_admin_locale", "en"),
  );
  await page.goto("/dashboard/analytics");
  await page
    .getByRole("tab", { name: en.socialAnalytics.tabs.planner, exact: true })
    .click();
  await page
    .getByRole("button", { name: en.socialAnalytics.plan.add, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: en.socialAnalytics.plan.add,
    exact: true,
  });
  const submit = dialog.locator('[data-modal-footer] button[type="submit"]');
  await expect(submit).toBeVisible();
  expect(
    await submit.evaluate(
      (button) =>
        !!(button as HTMLButtonElement).form &&
        !(button as HTMLButtonElement).form!.contains(button),
    ),
  ).toBe(true);
  await submit.click();
  await expect(dialog).toBeVisible();
  expect(
    await dialog
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(false);
  let submissions = 0;
  await page.route("**/dashboard/analytics", (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submissions++;
    return route.fulfill({
      status: 500,
      contentType: "text/plain",
      body: "E2E save recovery",
    });
  });
  await dialog.locator("input[required]").first().fill("E2E footer validation");
  await submit.click();
  await expect.poll(() => submissions).toBe(1);
  await expect(submit).toBeEnabled();
  await expect(dialog).toBeVisible();
});
