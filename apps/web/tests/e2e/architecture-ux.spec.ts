import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test.describe("Web Architecture & UX", () => {
  test("renders live ishoot data across key routes with zero legacy demo strings", async ({ page }) => {
    const routes = [
      { path: "/en", expectText: /ishoot/i, expectCr: true },
      { path: "/ar", expectText: /آي شوت/, expectCr: true },
      { path: "/en/works", expectText: /ishoot/i, expectCr: false },
      { path: "/en/about", expectText: /ishoot/i, expectCr: true },
      { path: "/en/contact", expectText: /ishoot/i, expectCr: false },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `Route ${route.path} HTTP status`).toBe(200);
      const html = await page.content();
      expect(html).not.toMatch(/Northwind|نورثويند|mock-|\/api\/samples\//i);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).toMatch(route.expectText);
      if (route.expectCr) {
        expect(bodyText).toContain("CR-142859-1");
      }
    }
  });

  test("top bar compact language switcher & footer language/appearance dropdowns", async ({ page }) => {
    await page.goto("/en");

    const navbar = page.locator(".site-navbar");
    await expect(navbar).toBeVisible();
    await expect(navbar.locator('[data-testid="appearance-switcher"]')).toHaveCount(0);

    const compactLang = navbar.locator('[data-testid="language-switcher-compact"]');
    await expect(compactLang).toBeVisible();
    await expect(compactLang).toContainText("EN");
    expect(await compactLang.locator("svg").count()).toBeGreaterThanOrEqual(1);

    const compactMenu = navbar.locator('[role="menu"]');
    await expect(async () => {
      await compactLang.click();
      await expect(compactMenu).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(compactMenu.locator('[role="menuitemradio"][lang="en"]')).toBeVisible();
    await compactMenu.locator('[role="menuitemradio"][lang="ar"]').click();

    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".site-navbar [data-testid='language-switcher-compact']")).toContainText("ع");

    const footer = page.locator(".site-footer");
    await footer.scrollIntoViewIfNeeded();
    const footerLang = footer.locator('[data-testid="language-switcher-footer"]');
    await expect(footerLang).toBeVisible();
    await expect(async () => {
      await footerLang.click();
      await expect(footer.locator('[role="menu"]')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await footer.locator('[role="menu"] [role="menuitemradio"][lang="en"]').click();
    await expect(page).toHaveURL(/\/en/);

    const appearanceBtn = page.locator('.site-footer [data-testid="appearance-switcher"]');
    await appearanceBtn.scrollIntoViewIfNeeded();
    await expect(appearanceBtn).toBeVisible();

    await expect(async () => {
      await appearanceBtn.click();
      await expect(page.locator('.site-footer [role="menu"]').last()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await page.locator('.site-footer [role="menu"]').last().getByRole("menuitemradio", { name: /light/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-site-mode", "light");

    await appearanceBtn.click();
    await page.locator('.site-footer [role="menu"]').last().getByRole("menuitemradio", { name: /dark/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-site-mode", "dark");
  });

  test("straight horizontal separators & button-only border-radius isolation", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    const separatorStyles = await page.evaluate(() => {
      const slope = getComputedStyle(document.documentElement)
        .getPropertyValue("--section-slope")
        .trim();
      const nodes = Array.from(
        document.querySelectorAll("#main-content section:not(#home), .section-divider, .site-footer"),
      );
      const clipPaths = nodes.map((el) => getComputedStyle(el).clipPath);
      return { slope, count: nodes.length, clipPaths };
    });

    expect(separatorStyles.slope).toBe("0px");
    expect(separatorStyles.count).toBeGreaterThan(0);
    for (const clipPath of separatorStyles.clipPaths) {
      expect(clipPath).toBe("none");
    }

    const radiusMetrics = await page.evaluate(() => {
      document.documentElement.setAttribute("data-corners", "rounded");
      const btn = document.querySelector<HTMLElement>("#main-content .web-button");
      const creds = document.querySelector<HTMLElement>('[data-testid="executive-credentials"]');
      const ctaCard = document.querySelector<HTMLElement>('[data-testid="executive-cta-banner"] .rounded-3xl');
      return {
        buttonRadius: btn ? parseFloat(getComputedStyle(btn).borderTopLeftRadius) : null,
        credsRadius: creds ? parseFloat(getComputedStyle(creds).borderTopLeftRadius) : null,
        ctaCardRadius: ctaCard ? parseFloat(getComputedStyle(ctaCard).borderTopLeftRadius) : null,
      };
    });

    expect(radiusMetrics.buttonRadius).not.toBeNull();
    expect(radiusMetrics.buttonRadius!).toBeGreaterThanOrEqual(50);
    expect(radiusMetrics.credsRadius).not.toBeNull();
    expect(radiusMetrics.credsRadius!).toBeLessThanOrEqual(32);
    expect(radiusMetrics.ctaCardRadius).not.toBeNull();
    expect(radiusMetrics.ctaCardRadius!).toBeLessThanOrEqual(32);
  });

  test("renders executive credentials/CTA & filters Works categories", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="executive-credentials"]')).toBeVisible();
    await expect(page.locator('[data-testid="executive-cta-banner"]')).toBeVisible();

    const filterButtons = page.locator("#main-content button[aria-pressed]");
    const tabCount = await filterButtons.count();
    expect(tabCount).toBeGreaterThan(1);

    const secondTab = filterButtons.nth(1);
    await secondTab.scrollIntoViewIfNeeded();
    await secondTab.click();
    await expect(secondTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#main-content .work-row").first()).toBeVisible();

    await filterButtons.first().click();
    await expect(filterButtons.first()).toHaveAttribute("aria-pressed", "true");
  });

  test("validates GET /api/health and POST /api/inquiry with Go backend", async ({ request, baseURL }) => {
    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);

    const inquiryRes = await request.post("/api/inquiry", {
      headers: {
        Origin: baseURL || "http://localhost:3000",
        "Content-Type": "application/json",
      },
      data: {
        submissionKey: randomUUID(),
        fullName: "Playwright Verifier",
        email: "e2e-web@example.test",
        phone: "+97317000000",
        intent: "inquiry",
        locale: "en",
        message: "Automated E2E verification message for ishoot architecture suite.",
      },
    });
    expect(inquiryRes.status()).toBe(200);
  });
});
