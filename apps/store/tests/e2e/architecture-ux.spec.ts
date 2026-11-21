import { expect, test } from "@playwright/test";

test.describe("Store Architecture & UX", () => {
  test("renders live catalogue & 100% localized Arabic storefront", async ({ page }) => {
    const enRes = await page.goto("/en", { waitUntil: "domcontentloaded" });
    expect(enRes?.status()).toBe(200);

    const enHtml = await page.content();
    expect(enHtml).not.toMatch(/mock-/i);
    expect(await page.locator('[data-testid^="product-card-"]').count()).toBeGreaterThan(0);

    const arRes = await page.goto("/ar", { waitUntil: "domcontentloaded" });
    expect(arRes?.status()).toBe(200);

    const arText = await page.locator("body").innerText();
    expect(arText).not.toMatch(/mock-/i);
    expect(arText).not.toContain("Express Delivery");
    expect(arText).not.toContain("Best Store Deals");
    expect(arText).not.toContain("100% Authentic");
  });

  test("top bar & footer language/appearance dropdowns", async ({ page }) => {
    await page.goto("/en");

    const navbar = page.locator(".site-navbar");
    await expect(navbar).toBeVisible();
    await expect(navbar.locator('[data-testid="appearance-switcher"]')).toHaveCount(0);

    const compactLang = navbar.locator('[data-testid="language-switcher-compact"]');
    await expect(compactLang).toBeVisible();
    await expect(compactLang).toContainText("EN");
    expect(await compactLang.locator("svg").count()).toBeGreaterThanOrEqual(1);

    await expect(async () => {
      await compactLang.click();
      await expect(navbar.locator('[role="menu"]')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await navbar.locator('[role="menu"] [role="menuitemradio"][lang="ar"]').click();
    await expect(page).toHaveURL(/\/ar/);
    await expect(page.locator('.site-navbar [data-testid="language-switcher-compact"]')).toContainText("ع");

    const footer = page.locator(".site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('[data-testid="language-switcher-footer"]')).toBeVisible();
    await expect(async () => {
      await footer.locator('[data-testid="language-switcher-footer"]').click();
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

  test("straight separators & non-circular product cards under pill button preset", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });

    const separatorStyles = await page.evaluate(() => {
      const slope = getComputedStyle(document.documentElement)
        .getPropertyValue("--section-slope")
        .trim();
      const nodes = Array.from(
        document.querySelectorAll("#main-content section:not(#home), .section-divider, .site-footer"),
      );
      return {
        slope,
        clipPaths: nodes.map((el) => getComputedStyle(el).clipPath),
      };
    });

    expect(separatorStyles.slope).toBe("0px");
    for (const clipPath of separatorStyles.clipPaths) {
      expect(clipPath).toBe("none");
    }

    const radiusMetrics = await page.evaluate(() => {
      document.documentElement.setAttribute("data-corners", "rounded");
      const card = document.querySelector<HTMLElement>('[data-testid^="product-card-"]');
      const cartBtn = document.querySelector<HTMLElement>('button[aria-label="Add to cart"]');
      return {
        cardRadius: card ? parseFloat(getComputedStyle(card).borderTopLeftRadius) : null,
        btnRadius: cartBtn ? parseFloat(getComputedStyle(cartBtn).borderTopLeftRadius) : null,
      };
    });

    expect(radiusMetrics.cardRadius).not.toBeNull();
    expect(radiusMetrics.cardRadius!).toBeLessThanOrEqual(32);
    expect(radiusMetrics.btnRadius).not.toBeNull();
    expect(radiusMetrics.btnRadius!).toBeGreaterThanOrEqual(50);
  });

  test("interactive search, sort, category filters, clear filters, and cart", async ({ page }) => {
    await page.goto("/en");

    const resultsCount = page.locator('[data-testid="product-results-count"]');
    await expect(resultsCount).toBeVisible();
    const initialCountText = await resultsCount.innerText();
    expect(initialCountText).toMatch(/\d+/);

    const firstCardTitle = await page.locator('[data-testid^="product-card-"] h3').first().innerText();
    const searchQuery = firstCardTitle.trim().split(/\s+/)[0] || "POS";
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchInput = page.locator('#main-content input[type="search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(searchQuery);
    await searchInput.press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]q=${escapedQuery}`));
    await expect(resultsCount).toContainText(/\d+/);

    const sortCombo = page.getByRole("combobox", { name: /sort by/i });
    await expect(sortCombo).toBeVisible();
    await sortCombo.click();
    await page.getByRole("option").nth(1).click();
    await expect(page).toHaveURL(/[?&]sort=/);

    const categoryButtons = page.locator('[data-testid="product-grid"] button[aria-pressed]');
    expect(await categoryButtons.count()).toBeGreaterThan(1);
    await categoryButtons.nth(1).click();
    await expect(categoryButtons.nth(1)).toHaveAttribute("aria-pressed", "true");

    const clearBtn = page.locator('[data-testid="product-grid"]').getByRole("button", { name: /clear/i }).first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(page).not.toHaveURL(new RegExp(`[?&]q=${escapedQuery}`));

    const addCartBtn = page.locator('button[aria-label="Add to cart"]').first();
    await expect(addCartBtn).toBeVisible();
    await addCartBtn.click();

    const cartRes = await page.goto("/en/cart");
    expect(cartRes?.status()).toBe(200);
    await expect(page.locator('[data-testid="cart-lines"] li').first()).toBeVisible();
  });

  test("validates GET /api/health and POST /api/store/quote", async ({ page, request, baseURL }) => {
    const healthRes = await request.get("/api/health");
    expect(healthRes.status()).toBe(200);

    await page.goto("/en");
    const firstProductId =
      (await page.locator('[data-testid^="product-card-"]').first().getAttribute("data-product-id")) ||
      "prod-1";

    const origin = baseURL || "http://localhost:3003";
    const emptyQuoteRes = await request.post("/api/store/quote", {
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      data: {
        lines: [],
        fulfilment: "delivery",
      },
    });
    expect(emptyQuoteRes.status()).toBe(200);

    const stockedQuoteRes = await request.post("/api/store/quote", {
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      data: {
        lines: [{ productId: firstProductId, quantity: 1 }],
        fulfilment: "delivery",
      },
    });
    expect(stockedQuoteRes.status()).toBe(200);
    const stockedQuote = (await stockedQuoteRes.json()) as {
      lines: { productId: string }[];
      problems: unknown[];
    };
    expect(stockedQuote.lines).toHaveLength(1);
    expect(stockedQuote.lines[0].productId).toBe(firstProductId);
    expect(stockedQuote.problems).toHaveLength(0);
  });
});
