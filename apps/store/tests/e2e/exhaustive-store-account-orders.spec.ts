import { expect, test } from "@playwright/test";
import {
  allowExpectedFailure,
  createStrictObserver,
  extractOtpCode,
  fetchMailpitMessage,
  gotoStrict,
  mintServiceToken,
  verifyReloadPersistence,
} from "./helpers/strict-audit";

test.describe("Store App — Exhaustive Customer Account, Wishlist, OTP, Checkout & Order Tracking", () => {
  test("full lifecycle: validations -> signUp -> profile -> addresses CRUD -> wishlist -> password & OTP -> COD checkout -> done/track/order detail -> order help -> account delete", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const observer = createStrictObserver(page, "store-exhaustive-account-orders");
    const ts = Date.now();
    const email = `store-exh-${ts}@example.test`;
    const password = `StoreExh!${ts}`;
    const updatedName = `Updated Customer ${ts}`;

    // 1. Account sign-in / sign-up / code tabs & negative validations
    await gotoStrict(page, "/en/account", observer);
    await expect(page.getByRole("tab")).toHaveCount(3);

    // Empty login attempt -> native HTML5 required constraint validation
    const signInEmail = page.locator('input[name="email"]');
    const signInPassword = page.locator('input[name="password"]');
    await page.getByTestId("account-submit").click();
    expect(await signInEmail.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);

    // Invalid server credentials -> 401 error alert in main content
    await signInEmail.fill(`nonexistent-${ts}@example.test`);
    await signInPassword.fill("WrongPass!123");
    await allowExpectedFailure(
      observer,
      { status: 401, urlPattern: /\/api\/account\/sign-in/, requireHit: true },
      async () => {
        await page.getByTestId("account-submit").click();
        await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible({ timeout: 10_000 });
      },
    );

    // Switch to Sign Up tab -> short password native HTML5 minLength validation
    await page.locator("#customer-sign-in-signUp").click();
    await page.locator('input[name="name"]').fill("Initial Customer");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("123");
    await page.getByTestId("account-submit").click();
    expect(
      await page.locator('input[name="password"]').evaluate((el: HTMLInputElement) => el.validity.tooShort),
    ).toBe(true);

    // Valid Sign Up
    await page.locator('input[name="password"]').fill(password);
    const [signUpRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/account/sign-up") && r.request().method() === "POST"),
      page.getByTestId("account-submit").click(),
    ]);
    expect(signUpRes.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Initial Customer", { timeout: 15_000 });

    await verifyReloadPersistence(page, async () => {
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Initial Customer", { timeout: 15_000 });
    });

    // 2. Profile update & reload persistence
    await page.locator('input[name="profileName"]').fill(updatedName);
    const [profileRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/account/profile") && r.request().method() === "POST"),
      page.getByTestId("account-profile-save").click(),
    ]);
    expect(profileRes.status()).toBe(200);
    await verifyReloadPersistence(page, async () => {
      await expect(page.locator('input[name="profileName"]')).toHaveValue(updatedName, { timeout: 15_000 });
    });

    // 3. Addresses Create, second Address Create + Edit + Delete + reload persistence
    const addAddrBtn = page.getByRole("button", { name: /add address/i });
    await expect(addAddrBtn).toBeVisible();
    await addAddrBtn.click();
    const addrForm = page.getByTestId("account-address-form");
    await expect(addrForm).toBeVisible();
    await addrForm.locator('input[name="address-label"]').fill("HQ Office");
    await addrForm.locator('input[name="address-line1"]').fill("Building 10, Road 42, Block 318");
    await addrForm.locator('input[name="address-area"]').fill("Seef");
    await addrForm.locator('input[name="address-city"]').fill("Manama");
    await addrForm.locator('input[name="address-country"]').fill("Bahrain");
    await addrForm.locator('input[name="address-phone"]').fill("+97336001234");
    await page.getByTestId("account-address-save").click();
    await expect(page.getByText(/Building 10, Road 42/)).toBeVisible({ timeout: 10_000 });

    // Add second address then edit & delete it
    await page.getByRole("button", { name: /add address/i }).click();
    await addrForm.locator('input[name="address-label"]').fill("Temp Branch");
    await addrForm.locator('input[name="address-line1"]').fill("Villa 88 Temporary");
    await addrForm.locator('input[name="address-city"]').fill("Riffa");
    await addrForm.locator('input[name="address-country"]').fill("Bahrain");
    await addrForm.locator('input[name="address-phone"]').fill("+97336005678");
    await page.getByTestId("account-address-save").click();
    await expect(page.getByText(/Villa 88 Temporary/)).toBeVisible({ timeout: 10_000 });

    // Edit second address
    await page.locator('#account-addresses ~ ul li', { hasText: "Villa 88 Temporary" })
      .getByRole("button", { name: /edit/i })
      .click();
    await addrForm.locator('input[name="address-line1"]').fill("Villa 99 Edited");
    await page.getByTestId("account-address-save").click();
    await expect(page.getByText(/Villa 99 Edited/)).toBeVisible({ timeout: 10_000 });

    // Delete second address
    await page.locator('#account-addresses ~ ul li', { hasText: "Villa 99 Edited" })
      .getByRole("button", { name: /remove|delete/i })
      .click();
    await expect(page.getByText(/Villa 99 Edited/)).toHaveCount(0, { timeout: 10_000 });

    await verifyReloadPersistence(page, async () => {
      await expect(page.getByText(/Building 10, Road 42/)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Villa 99 Edited/)).toHaveCount(0);
    });

    // 4. Wishlist toggle + reload persistence + account wishlist verification
    await gotoStrict(page, "/en/products", observer);
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
    expect(inStockHref).toBeTruthy();

    const wishBtn = page.getByTestId("wishlist-toggle");
    await expect(wishBtn).toBeVisible();
    await wishBtn.click();
    await expect(wishBtn).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    await verifyReloadPersistence(page, async () => {
      await expect(page.getByTestId("wishlist-toggle")).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    });

    // Verify item appears in Account wishlist and remove one wishlist toggle roundtrip later
    await gotoStrict(page, "/en/account", observer);
    const wishSectionItems = page.locator('[aria-labelledby="account-wishlist"] li');
    await expect(wishSectionItems.first()).toBeVisible({ timeout: 10_000 });
    await wishSectionItems.first().getByRole("button").click();
    await expect(wishSectionItems).toHaveCount(0, { timeout: 10_000 });

    // 5. Sign out -> wrong password (401 expected) -> OTP login via Mailpit
    await page.getByTestId("account-sign-out").click();
    await expect(page.getByTestId("account-submit")).toBeVisible({ timeout: 10_000 });

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("WrongPassword999!");
    await allowExpectedFailure(
      observer,
      { status: 401, urlPattern: /\/api\/account\/sign-in/, requireHit: true },
      async () => {
        await page.getByTestId("account-submit").click();
        await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible({ timeout: 10_000 });
      },
    );

    // OTP sign-in via Mailpit
    await page.locator("#customer-sign-in-code").click();
    await page.locator('input[name="email"]').fill(email);
    await page.getByTestId("account-submit").click();
    await expect(page.locator('input[name="code"]')).toBeVisible({ timeout: 10_000 });

    const otpMsg = await fetchMailpitMessage(email, null, 20_000);
    const otpCode = extractOtpCode(otpMsg);
    await page.locator('input[name="code"]').fill(otpCode);
    await page.getByTestId("account-submit").click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(updatedName, { timeout: 15_000 });

    // 6. Add stocked product -> Checkout -> Place COD Order -> /checkout/done -> /track & /account/orders/[id] -> OrderHelp
    await gotoStrict(page, inStockHref, observer);
    await page.getByTestId("add-to-cart-button").click();
    await gotoStrict(page, "/en/checkout", observer);
    await expect(page.getByTestId("checkout-form")).toBeVisible();

    const phoneInput = page.getByRole("textbox", { name: /national phone number/i }).first();
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("+97336001234");
    await phoneInput.blur();

    const codRadio = page.locator('input[type="radio"][value="cod"]');
    await expect(codRadio).toBeAttached();
    await codRadio.check({ force: true });

    const placeBtn = page.getByTestId("checkout-place");
    await expect(placeBtn).toBeEnabled({ timeout: 15_000 });
    await placeBtn.click();

    await expect(page).toHaveURL(/\/en\/checkout\/done\?number=SO-/, { timeout: 25_000 });
    const placedText = await page.getByTestId("order-placed").innerText();
    const orderNumMatch = placedText.match(/SO-\d{4}-\d{6}/);
    expect(orderNumMatch?.[0]).toBeTruthy();
    const orderNumber = orderNumMatch![0];

    // Verify order in Account + reload persistence
    await gotoStrict(page, "/en/account", observer);
    const orderRow = page.getByTestId(`account-order-${orderNumber}`);
    await expect(orderRow).toBeVisible({ timeout: 10_000 });
    await verifyReloadPersistence(page, async () => {
      await expect(page.getByTestId(`account-order-${orderNumber}`)).toBeVisible({ timeout: 10_000 });
    });

    // Submit Order Help question
    await orderRow.getByTestId("order-help-open").click();
    await orderRow.locator('textarea[name="helpMessage"]').fill("Automated E2E customer inquiry about this placed order.");
    await orderRow.getByTestId("order-help-send").click();
    await expect(orderRow.locator('[role="status"]').first()).toBeVisible({ timeout: 10_000 });

    // Visit Customer Order Detail Page
    const orderDetailHref = await orderRow.locator('a[href*="/en/account/orders/"]').first().getAttribute("href");
    expect(orderDetailHref).toBeTruthy();
    await gotoStrict(page, orderDetailHref!, observer);
    await expect(page.getByTestId("customer-order-detail")).toBeVisible();
    await expect(page.getByTestId("customer-order-detail")).toContainText(orderNumber);

    // Visit live /track/[token] page from delivery API
    const deliveryRes = await page.request.get(
      `${(process.env.API_URL || "http://localhost:8080").replace(/\/$/, "")}/v1/delivery/shipments`,
      { headers: { Authorization: `Bearer ${mintServiceToken("store")}` } },
    );
    expect(deliveryRes.status()).toBe(200);
    const shipments = (await deliveryRes.json()) as Array<{ trackingToken?: string }>;
    const trackingToken = shipments.find((s) => s.trackingToken)?.trackingToken;
    expect(trackingToken, "Expected at least one seeded shipment with trackingToken").toBeTruthy();
    await gotoStrict(page, `/en/track/${trackingToken}`, observer);
    await expect(page.getByTestId("track-state")).toBeVisible();

    // 7. Verify Loyalty Points & Store Wallet Account Dashboard + Delete test customer account
    await gotoStrict(page, "/en/account", observer);
    await expect(page.getByTestId("account-wallet-balance")).toBeVisible();
    await expect(page.getByTestId("account-loyalty-points")).toBeVisible();
    await expect(page.getByTestId("redeem-gift-card-form")).toBeVisible();
    await expect(page.getByTestId("convert-points-form")).toBeVisible();
    await page.locator('input[name="confirmEmail"]').fill(email);
    const [delRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/account/delete") && r.request().method() === "POST"),
      page.getByTestId("account-delete").click(),
    ]);
    expect(delRes.status()).toBe(200);
    await expect(page.getByTestId("account-submit")).toBeVisible({ timeout: 15_000 });

    await observer.assertClean("store-exhaustive-account-orders");
  });
});
