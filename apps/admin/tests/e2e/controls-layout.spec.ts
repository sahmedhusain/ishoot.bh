import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import en from "../../locales/admin/en";
import ar from "../../locales/admin/ar";
import uiEn from "../../locales/ui/en";
import uiAr from "../../locales/ui/ar";
import { selectOption } from "../../select-option";

test("deferred scroll content is enhanced only after it becomes visible", async ({
  page,
}) => {
  await page.goto("/dashboard/calendar");
  await expect(
    page.locator(".calendar-workbench[data-overlay-scroll-ready]"),
  ).toBeVisible();
  await page.evaluate(async () => {
    const pending = document.createElement("div");
    pending.id = "e2e-deferred-scroll";
    pending.hidden = true;
    pending.innerHTML =
      '<section data-overlay-scroll style="height:40px;overflow:auto"><div style="height:200px">Deferred content</div></section>';
    document.body.append(pending);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  const pending = page.locator("#e2e-deferred-scroll");
  await expect(pending.locator(".os-scrollbar")).toHaveCount(0);
  await pending.evaluate((element) => {
    (element as HTMLElement).hidden = false;
  });
  await expect(pending.locator(".os-scrollbar-vertical")).toHaveCount(1);
  await pending.evaluate((element) => element.remove());
});

async function insideViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width + 1,
  );
  expect(box!.y + box!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height + 1,
  );
}
async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.timeline instanceof DocumentTimeline &&
            Number.isFinite(animation.effect?.getTiming().iterations ?? 1),
        )
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
}

for (const locale of ["en", "ar"] as const)
  for (const width of [390, 768, 1440]) {
    const t = locale === "ar" ? ar : en,
      copy = locale === "ar" ? uiAr : uiEn;
    test(`calendar, selectors and overlay scrollbars (${locale}, ${width})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((locale) => {
        localStorage.setItem("platform_admin_locale", locale);
        localStorage.setItem(
          "platform_admin_theme",
          locale === "ar" ? "dark" : "light",
        );
      }, locale);
      await page.goto("/dashboard/calendar");
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      const calendar = page
        .locator(".calendar-workbench[data-overlay-scroll-ready]")
        .filter({ visible: true });
      await expect(calendar).toBeVisible();
      await expect(calendar.locator(".calendar-toolbar h1")).toBeVisible();
      const heading = await calendar
        .locator(".calendar-period-controls h2")
        .innerText();
      await page
        .getByRole("button", { name: t.actions.previous, exact: true })
        .click();
      await expect(
        calendar.locator(".calendar-period-controls h2"),
      ).not.toHaveText(heading);
      await page
        .getByRole("button", { name: t.actions.next, exact: true })
        .click();
      await expect(calendar.locator(".calendar-period-controls h2")).toHaveText(
        heading,
      );
      const previous = await page
        .getByRole("button", { name: t.actions.previous, exact: true })
        .boundingBox();
      const next = await page
        .getByRole("button", { name: t.actions.next, exact: true })
        .boundingBox();
      expect(
        locale === "ar" ? previous!.x > next!.x : previous!.x < next!.x,
      ).toBe(true);
      const view = calendar.locator(".calendar-toolbar").getByRole("combobox");
      const before = await page
        .locator(".admin-main")
        .evaluate((element) => element.clientWidth);
      await view.click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(
        page.locator("[data-select-popup] input[type=search]"),
      ).toHaveCount(0);
      await insideViewport(page, page.locator("[data-select-popup]"));
      await view.press("Escape");
      await selectOption(view, "week");
      await expect(calendar.locator(".calendar-time-column")).toHaveCount(7);
      await selectOption(view, "day");
      await expect(calendar.locator(".calendar-time-column")).toHaveCount(1);
      await selectOption(view, "month");
      await page.locator(".admin-main").hover();
      expect(
        await page
          .locator(".admin-main")
          .evaluate((element) => element.clientWidth),
      ).toBe(before);
      await expect(
        page.locator(".admin-main > .os-scrollbar-vertical"),
      ).toHaveCount(1);
      await page
        .getByRole("button", { name: t.calendarSharing.newEvent, exact: true })
        .filter({ visible: true })
        .first()
        .click();
      const dialog = page.getByRole("dialog", {
        name: t.calendarSharing.newEvent,
        exact: true,
      });
      await insideViewport(page, dialog);
      await expect(dialog.locator("input").nth(0)).toHaveAttribute(
        "dir",
        "ltr",
      );
      await expect(dialog.locator("input").nth(1)).toHaveAttribute(
        "dir",
        "rtl",
      );
      const field = dialog.getByRole("combobox").first();
      await field.click();
      await insideViewport(page, page.locator("[data-select-popup]"));
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await expect(field).toBeFocused();
      await dialog.locator("[data-modal-header] button").click();
      await expect(dialog).toHaveCount(0);
      await settle(page);
      const scan = await new AxeBuilder({ page })
        .include(".calendar-workbench")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
      ).toBeLessThanOrEqual(1);
      await page.goto("/dashboard/hr/employees/new");
      const country = page.getByRole("combobox", {
        name: t.employeeResidency.fields.nationality,
        exact: true,
      });
      await country.click();
      await expect(
        page.getByRole("searchbox", { name: copy.searchOptions, exact: true }),
      ).toBeVisible();
      await insideViewport(page, page.locator("[data-select-popup]"));
      await page.keyboard.press("Escape");
      await selectOption(country, "GB");
      expect(await country.locator("..").locator("select").inputValue()).toBe(
        "GB",
      );
      await expect(country).toBeFocused();
      expect(await page.locator("select:visible").count()).toBe(0);
    });
  }

for (const locale of ["en", "ar"] as const) {
  test(`Material tabs follow reading direction and retain keyboard focus (${locale})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto("/dashboard/settings/company");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      page.locator('main [role="tablist"] > .os-scrollbar-horizontal').first(),
    ).toHaveCount(1);
    const tabs = page.locator('main [role="tablist"]').first().getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "-1");
    expect(
      await tabs
        .first()
        .evaluate((element) => getComputedStyle(element, ":after").height),
    ).toBe("3px");
  });
}

for (const locale of ["en", "ar"] as const) {
  test(`decorated selectors keep icons and text apart (${locale})`, async ({
    page,
  }) => {
    const t = locale === "ar" ? ar : en;
    await page.setViewportSize({ width: 390, height: 900 });
    await page.addInitScript(
      (locale) => localStorage.setItem("platform_admin_locale", locale),
      locale,
    );
    await page.goto("/dashboard/settings/web");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page
      .getByRole("tab", { name: t.webSettingsView.tabSocial, exact: true })
      .click();
    const platform = page.getByRole("combobox", {
      name: t.webSettings.platform,
      exact: true,
    });
    const icon = platform.locator("../..").locator(":scope > span svg");
    await expect(platform.locator("svg")).toHaveCount(1);
    const iconBox = await icon.boundingBox(),
      textBox = await platform.locator(".m3-select-value").boundingBox();
    expect(
      locale === "ar"
        ? iconBox!.x > textBox!.x + textBox!.width
        : textBox!.x > iconBox!.x + iconBox!.width,
    ).toBe(true);
    await platform.click();
    await insideViewport(page, page.locator("[data-select-popup]"));
    await settle(page);
    const scan = await new AxeBuilder({ page })
      .include("[data-select-popup]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
}
