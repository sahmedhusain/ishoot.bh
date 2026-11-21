import { expect, test, type Page } from "@playwright/test";

function attachErrorListeners(page: Page) {
  const errors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/favicon|Download the React DevTools|\[Fast Refresh\]|webpack-hmr|_next\/webpack|ERR_ABORTED/i.test(text)) {
      return;
    }
    errors.push(`console.error: ${text}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) {
      serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });
  return { errors, serverErrors };
}

test.describe("Store App — Full Page-by-Page, Account, Wishlist, Cart & Checkout (EN)", () => {
  test("public store pages (home, products, categories, offers, branches, product detail) load cleanly", async ({
    page,
  }) => {
    const { errors, serverErrors } = attachErrorListeners(page);

    for (const path of ["/en", "/en/products", "/en/offers", "/en/branches"]) {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `HTTP status for ${path}`).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    }

    // Visit products and click into first product detail
    await page.goto("/en/products", { waitUntil: "domcontentloaded" });
    const productCards = page.locator('[data-testid^="product-card-"] a, a[href*="/en/products/"]');
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);

    // Click category tab unconditionally
    const categoryTabs = page.locator('[role="tab"], a[href*="/en/categories/"], button[aria-pressed]');
    expect(await categoryTabs.count()).toBeGreaterThan(0);
    await categoryTabs.first().click();
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/en/products", { waitUntil: "domcontentloaded" });
    const firstHref = await productCards.first().getAttribute("href");
    expect(firstHref).toBeTruthy();
    await page.goto(firstHref!, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1").first()).toBeVisible();

    expect(serverErrors).toEqual([]);
    // Ignore the expected 401 console error from the negative invalid-password test
    expect(errors.filter((e) => !/status of 401 \(Unauthorized\)/.test(e))).toEqual([]);
  });

  test("customer signs up, validates forms, adds address, signs in via password & Mailpit OTP, adds wishlist, and places order", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const { errors, serverErrors } = attachErrorListeners(page);
    const ts = Date.now();
    const email = `e2e-store-${ts}@example.test`;
    const password = `StorePass!${ts}`;

    // 1. Account page tabs & validations
    await page.goto("/en/account", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("tab")).toHaveCount(3);

    // Empty password sign-in validation
    await page.getByTestId("account-submit").click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible();

    // Switch to Sign Up tab
    await page.locator("#customer-sign-in-signUp").click();
    await page.locator('input[name="name"]').fill("E2E Store Customer");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("123"); // too short validation
    await page.getByTestId("account-submit").click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible();

    // Valid Sign Up
    await page.locator('input[name="password"]').fill(password);
    const [signUpRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/account/sign-up") && r.request().method() === "POST"),
      page.getByTestId("account-submit").click(),
    ]);
    expect(signUpRes.status(), `Sign-up API status: ${await signUpRes.text()}`).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Store Customer", { timeout: 15_000 });

    // 2. Add Address & validate unconditionally
    const addAddrBtn = page.getByRole("button", { name: /add address/i });
    await expect(addAddrBtn).toBeVisible();
    await addAddrBtn.click();
    const addrForm = page.getByTestId("account-address-form");
    await expect(addrForm).toBeVisible();
    await addrForm.locator('input[name="address-line1"]').fill("Road 42, Block 318");
    await addrForm.locator('input[name="address-city"]').fill("Manama");
    await addrForm.locator('input[name="address-country"]').fill("Bahrain");
    await addrForm.locator('input[name="address-phone"]').fill("+97336001234");
    await page.getByTestId("account-address-save").click();
    await expect(page.getByText(/Road 42, Block 318/)).toBeVisible({ timeout: 10_000 });

    // 3. Sign out and test Password Sign-In + Mailpit OTP Sign-In unconditionally
    const signOutBtn = page.getByRole("button", { name: /sign out|log out/i });
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await expect(page.getByTestId("account-submit")).toBeVisible({ timeout: 10_000 });

    // Wrong password validation
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("WrongPassword999!");
    await page.getByTestId("account-submit").click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible();

    // Test Email Code (OTP) via Mailpit
    await page.locator("#customer-sign-in-code").click();
    await page.locator('input[name="email"]').fill(email);
    await page.getByTestId("account-submit").click();
    await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 10_000 });

    // Fetch code from Mailpit
    let otpCode = "";
    await expect
      .poll(
        async () => {
          const mpRes = await request.get("http://localhost:8025/api/v1/messages");
          if (!mpRes.ok()) return "";
          const mpData = (await mpRes.json()) as { messages?: Array<{ ID: string; To?: Array<{ Address: string }> }> };
          const msg = mpData.messages?.find((m) => m.To?.some((t) => t.Address === email));
          if (!msg) return "";
          const detailRes = await request.get(`http://localhost:8025/api/v1/message/${msg.ID}`);
          const detail = (await detailRes.json()) as { Text?: string; HTML?: string };
          const match = (detail.Text || detail.HTML || "").match(/\b(\d{6})\b/);
          otpCode = match?.[1] || "";
          return otpCode;
        },
        { timeout: 15_000 },
      )
      .toMatch(/^\d{6}$/);

    await page.locator('input[name="code"]').fill(otpCode);
    await page.getByTestId("account-submit").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Store Customer", { timeout: 15_000 });

    // 4. Add a product to Wishlist & Cart unconditionally
    await page.goto("/en/products", { waitUntil: "domcontentloaded" });
    const firstProductHref = await page.locator('[data-testid^="product-card-"] a, a[href*="/en/products/"]').first().getAttribute("href");
    expect(firstProductHref).toBeTruthy();
    await page.goto(firstProductHref!, { waitUntil: "domcontentloaded" });

    const wishlistBtn = page.getByTestId("wishlist-toggle");
    await expect(wishlistBtn).toBeVisible();
    await wishlistBtn.click();
    await expect(wishlistBtn).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });

    const addToCartBtn = page.getByRole("button", { name: /add to cart|add to bag/i }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // 5. Cart page: quantity update, invalid coupon validation, proceed to checkout
    await page.goto("/en/cart", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("cart-lines")).toBeVisible({ timeout: 10_000 });

    const qtyInput = page.locator('[data-testid="cart-lines"] input[type="number"]').first();
    await qtyInput.fill("2");

    // Apply invalid coupon then remove it so checkout is enabled
    const couponInput = page.locator('input[placeholder*="coupon" i], input[aria-label*="coupon" i]').first();
    await expect(couponInput).toBeVisible();
    await couponInput.fill("INVALID-E2E-COUPON");
    await page.getByRole("button", { name: /apply/i }).click();
    const removeCouponBtn = page.getByRole("button", { name: /remove coupon/i });
    await expect(removeCouponBtn).toBeVisible({ timeout: 10_000 });
    await removeCouponBtn.click();

    const checkoutLink = page.locator('a[href*="/en/checkout"]').first();
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/en\/checkout/);

    // 6. Checkout: place order
    const phoneInput = page.getByRole("textbox", { name: /national phone number/i });
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("+97336001234");
    await phoneInput.blur();
    const codRadio = page.locator('input[type="radio"][value="cod"]');
    await expect(codRadio).toBeAttached();
    await codRadio.check({ force: true });
    const placeOrderBtn = page.locator('button[type="submit"]').last();
    await expect(placeOrderBtn).toBeVisible();
    await placeOrderBtn.click();

    await expect(page).toHaveURL(/\/en\/checkout\/done/, { timeout: 20_000 });
    await expect(page.locator("h1").first()).toBeVisible();

    // 7. Verify order appears in Account unconditionally
    await page.goto("/en/account", { waitUntil: "domcontentloaded" });
    const orderLink = page.locator('a[href*="/en/account/orders/"]').first();
    await expect(orderLink).toBeVisible();
    await orderLink.click();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("h1").first()).toBeVisible();

    expect(serverErrors).toEqual([]);
    // Ignore the expected 401 console error from the negative invalid-password test
    expect(errors.filter((e) => !/status of 401 \(Unauthorized\)/.test(e))).toEqual([]);
  });
});
