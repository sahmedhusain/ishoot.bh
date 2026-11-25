import { expect, test } from "@playwright/test";
import {
  createStrictObserver,
  gotoStrict,
  verifyReloadPersistence,
} from "./helpers/strict-audit";

test.describe("Store App — Exhaustive Catalog, Categories, Cart, Offers, Branches, Pay & Track (EN + AR)", () => {
  test("EN & AR public storefront routes, search/sort/filter, variant selection, cart persistence & coupon validation", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const observer = createStrictObserver(page, "store-exhaustive-catalog");

    // 1. Public pages in EN & AR
    for (const locale of ["en", "ar"] as const) {
      const dir = locale === "ar" ? "rtl" : "ltr";
      for (const path of [`/${locale}`, `/${locale}/products`, `/${locale}/offers`, `/${locale}/branches`]) {
        await gotoStrict(page, path, observer);
        await expect(page.locator("html")).toHaveAttribute("dir", dir);
        await expect(page.locator("h1").first()).toBeVisible();
      }

      if (locale === "ar") {
        const arText = await page.goto("/ar/products", { waitUntil: "domcontentloaded" }).then(() =>
          page.locator("body").innerText(),
        );
        expect(arText).not.toMatch(/mock-/i);
        expect(arText).not.toContain("Express Delivery");
        expect(arText).not.toContain("Best Store Deals");
      }

      // Pay & Track invalid token pages return 200 with clean alert (zero 5xx)
      await gotoStrict(page, `/${locale}/pay/invalid-exhaustive-token`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible();

      await gotoStrict(page, `/${locale}/track/invalid-exhaustive-token`, observer);
      await expect(page.locator("html")).toHaveAttribute("dir", dir);
      await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible();
    }

    // 2. Category route (from /en category cards) & filter/search/sort on EN products
    const homeCategoryLinks = page.locator('a[href*="/en/categories/"]');
    await gotoStrict(page, "/en", observer);
    expect(await homeCategoryLinks.count()).toBeGreaterThan(0);
    const catHref = await homeCategoryLinks.first().getAttribute("href");
    expect(catHref).toBeTruthy();
    await gotoStrict(page, catHref!, observer);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    const arCatHref = catHref!.replace("/en/", "/ar/");
    await gotoStrict(page, arCatHref, observer);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await gotoStrict(page, "/en/products", observer);
    const categoryButtons = page.locator('[data-testid="product-grid"] button[aria-pressed]');
    expect(await categoryButtons.count()).toBeGreaterThan(1);
    await categoryButtons.nth(1).click();
    await expect(categoryButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
    await categoryButtons.first().click();
    await expect(categoryButtons.first()).toHaveAttribute("aria-pressed", "true");

    await gotoStrict(page, "/en/products", observer);
    const searchInput = page.locator('#main-content input[type="search"]');
    await expect(searchInput).toBeVisible();
    const firstCardTitle = await page.locator('[data-testid^="product-card-"] h3').first().innerText();
    const token = firstCardTitle.trim().split(/\s+/)[0] || "POS";
    await searchInput.fill(token);
    await searchInput.press("Enter");
    await expect(page).toHaveURL(new RegExp(`[?&]q=${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    const sortCombo = page.getByRole("combobox", { name: /sort by/i });
    await expect(sortCombo).toBeVisible();
    await sortCombo.click();
    await page.getByRole("option").nth(1).click();
    await expect(page).toHaveURL(/[?&]sort=/);

    const clearBtn = page.locator('[data-testid="product-grid"]').getByRole("button", { name: /clear/i }).first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(page).not.toHaveURL(/[?&]q=/);

    // 3. Find first in-stock product detail (EN + AR), add to cart, verify reload persistence & coupon rejection
    const productHrefs = await page
      .locator('[data-testid^="product-card-"] a[href*="/en/products/"]')
      .evaluateAll((els) => Array.from(new Set(els.map((el) => el.getAttribute("href")).filter(Boolean))) as string[]);
    expect(productHrefs.length).toBeGreaterThan(0);

    let inStockHref = "";
    for (const href of productHrefs) {
      await gotoStrict(page, href, observer);
      const addBtn = page.getByTestId("add-to-cart-button");
      if ((await addBtn.count()) > 0 && (await addBtn.isEnabled())) {
        inStockHref = href;
        break;
      }
    }
    expect(inStockHref, "Expected at least one in-stock product in seed").toBeTruthy();

    // Verify AR product detail too
    await gotoStrict(page, inStockHref.replace("/en/", "/ar/"), observer);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1").first()).toBeVisible();

    // Add item in EN
    await gotoStrict(page, inStockHref, observer);
    const addBtn = page.getByTestId("add-to-cart-button");
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    await expect(page.locator('[data-testid="add-to-cart"] [role="status"]')).toBeVisible();

    // Cart page: qty update, reload persistence, invalid coupon rejection & removal, remove item
    await gotoStrict(page, "/en/cart", observer);
    await expect(page.getByTestId("cart-lines")).toBeVisible({ timeout: 10_000 });
    const qtyInput = page.locator('[data-testid="cart-lines"] input[type="number"]').first();
    await qtyInput.fill("2");
    await expect(qtyInput).toHaveValue("2");

    await verifyReloadPersistence(page, async () => {
      await expect(page.getByTestId("cart-lines")).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[data-testid="cart-lines"] input[type="number"]').first()).toHaveValue("2");
    });

    const couponInput = page.locator('input[placeholder*="coupon" i], input[aria-label*="coupon" i]').first();
    await expect(couponInput).toBeVisible();
    await couponInput.fill("INVALID-E2E-COUPON");
    await page.getByRole("button", { name: /apply/i }).click();
    const removeCouponBtn = page.getByRole("button", { name: /remove coupon/i });
    await expect(removeCouponBtn).toBeVisible({ timeout: 10_000 });
    await removeCouponBtn.click();

    // Remove item & verify empty cart message
    await page
      .locator('[data-testid="cart-lines"] button[aria-label*="Remove" i]')
      .first()
      .click();
    await expect(page.getByTestId("cart-lines")).toHaveCount(0);
    await expect(page.locator('a[href*="/en/products"]').first()).toBeVisible();

    // Check Store Preferences (8-currency selector), Cookie Consent & SSL Security badge
    const cookieBanner = page.getByTestId("cookie-consent-banner");
    if (await cookieBanner.isVisible().catch(() => false)) {
      await page.getByTestId("cookie-accept-all").click();
    }
    await page.getByTestId("preferences-trigger").click();
    await expect(page.getByTestId("welcome-modal")).toBeVisible();
    await expect(page.getByTestId("region-option-SAR")).toHaveCount(0);
    await page.getByTestId("region-option-BHD").click();
    await page.getByRole("button", { name: /Apply Preferences/i }).click();
    // Global pages must NOT display the 256-Bit SSL badge; it only appears on Terms/Cookies/Privacy pages
    await expect(page.getByTestId("ssl-security-badge")).toHaveCount(0);

    // Check storefront hubs & legal policy routes
    for (const extraRoute of [
      "/en/shop",
      "/en/categories",
      "/en/deals",
      "/en/black-friday",
      "/en/drops",
      "/en/ready-made-pcs",
      "/en/build-pc",
      "/en/giveaways/seasonal",
      "/en/rewards",
      "/en/wishlist",
      "/en/track-order",
      "/en/stores",
      "/en/new-arrivals",
      "/en/gift-cards",
      "/en/account",
      "/en/account/orders",
      "/en/account/wallet",
      "/en/account/rewards",
      "/en/account/addresses",
      "/en/account/wishlist",
      "/en/account/returns",
      "/en/account/profile",
      "/en/terms",
      "/en/privacy",
      "/en/return-policy",
      "/en/warranty",
      "/en/devo-warranty",
      "/en/vat-tax",
      "/en/page/faq",
    ]) {
      await gotoStrict(page, extraRoute, observer);
      await expect(page.locator("h1").first()).toBeVisible();
    }

    // AR Cart page
    await gotoStrict(page, "/ar/cart", observer);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await observer.assertClean("store-exhaustive-catalog");
  });
});
