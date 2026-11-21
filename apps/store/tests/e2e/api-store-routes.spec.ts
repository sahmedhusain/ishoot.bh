import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  extractOtpCode,
  fetchMailpitMessage,
  loadRootEnv,
  mintServiceToken,
} from "./helpers/strict-audit";

const STORE_ORIGIN = (process.env.STORE_URL || "http://localhost:3003").replace(/\/$/, "");
const GATEWAY = process.env.API_URL || "http://127.0.0.1:8080";

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test.describe("Phase 1.4 — Store App Next.js API Routes (all 13 routes & sub-actions)", () => {
  test("health, CSRF sameOrigin checks, store actions (regions/quote/delivery/order/pay), payment return/webhook, preview, revalidate & telemetry", async ({
    playwright,
    request,
  }) => {
    const env = loadRootEnv();
    const adminToken = mintServiceToken("admin");
    const ts = Date.now();
    const ctx = await playwright.request.newContext({ baseURL: STORE_ORIGIN });

    // 1. Health
    const healthRes = await ctx.get("/api/health");
    expect(healthRes.status()).toBe(200);
    expect((await healthRes.json()).ok).toBe(true);

    // 2. CSRF sameOrigin enforcement (403 on cross-origin POST)
    expect(
      (
        await ctx.post("/api/store/quote", {
          headers: { Origin: "https://evil.example" },
          data: { lines: [] },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await ctx.post("/api/account/sign-in", {
          headers: { Origin: "https://evil.example" },
          data: { email: "x@example.test", password: "nope" },
        })
      ).status(),
    ).toBe(403);

    // 3. Get a live active product + variant with stock >= 1 from inventory for cart/order checks
    const prodRes = await request.get(`${GATEWAY}/v1/inventory/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(prodRes.status()).toBe(200);
    const products: any[] = await prodRes.json();
    const activeProd = products.find((p) => p.isActive);
    expect(activeProd, "Expected at least one active product in zayed-group seed").toBeTruthy();
    const [varsRes, lvlsRes] = await Promise.all([
      request.get(`${GATEWAY}/v1/inventory/products/${activeProd.id}/variants`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
      request.get(`${GATEWAY}/v1/inventory/stock/levels?productId=${activeProd.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ]);
    expect(varsRes.status()).toBe(200);
    expect(lvlsRes.status()).toBe(200);
    const variants: any[] = await varsRes.json();
    const levels: any[] = await lvlsRes.json();
    const stockedLevel = levels.find((l) => Number(l.quantityAvailable) >= 1);
    const activeVar =
      variants.find((v) => v.isActive && v.id === stockedLevel?.variantId) ??
      variants.find((v) => v.isActive);
    const cartItem = {
      productId: activeProd.id,
      ...(activeVar ? { variantId: activeVar.id } : {}),
      quantity: 1,
    };

    // 4. POST /api/store/regions, quote, delivery
    const regRes = await ctx.post("/api/store/regions", {
      headers: { Origin: STORE_ORIGIN },
      data: {},
    });
    expect(regRes.status()).toBe(200);
    expect(Array.isArray(await regRes.json())).toBe(true);

    const quoteRes = await ctx.post("/api/store/quote", {
      headers: { Origin: STORE_ORIGIN },
      data: {
        lines: [cartItem],
        fulfilment: "pickup",
      },
    });
    expect(quoteRes.status(), await quoteRes.text()).toBe(200);
    const quoteBody = await quoteRes.json();
    expect(Number(quoteBody.total)).toBeGreaterThanOrEqual(5);

    const delivRes = await ctx.post("/api/store/delivery", {
      headers: { Origin: STORE_ORIGIN },
      data: { address: { area: "Manama", city: "Manama" } },
    });
    expect(delivRes.status(), await delivRes.text()).toBe(200);

    // 5. Unknown store action -> 404
    expect(
      (
        await ctx.post("/api/store/unknown-action", {
          headers: { Origin: STORE_ORIGIN },
          data: {},
        })
      ).status(),
    ).toBe(404);

    // 6. Online payment rejected cleanly when no gateway configured (400 storePaymentMethodInvalid), then COD pickup order -> 200
    const onlineRejectRes = await ctx.post("/api/store/order", {
      headers: { Origin: STORE_ORIGIN },
      data: {
        lines: [cartItem],
        fulfilment: "pickup",
        paymentMethod: "online",
        name: `Store Online Check ${ts}`,
        email: `store-online-${ts}@example.test`,
        phone: "+97336007777",
        locale: "en",
      },
    });
    expect(onlineRejectRes.status(), await onlineRejectRes.text()).toBe(400);

    const orderEmail = `store-api-cod-${ts}@example.test`;
    const orderRes = await ctx.post("/api/store/order", {
      headers: { Origin: STORE_ORIGIN },
      data: {
        lines: [cartItem],
        fulfilment: "pickup",
        paymentMethod: "cod",
        name: `Store API Buyer ${ts}`,
        email: orderEmail,
        phone: "+97336007777",
        locale: "en",
      },
    });
    expect(orderRes.status(), await orderRes.text()).toBe(200);
    const orderJson = await orderRes.json();
    expect(orderJson.success).toBe(true);
    expect(orderJson.number).toBeTruthy();

    // Verify invalid pay token -> 404
    expect(
      (
        await ctx.post("/api/store/pay", {
          headers: { Origin: STORE_ORIGIN },
          data: { token: "invalid-pay-token" },
        })
      ).status(),
    ).toBe(404);

    // Payment return & webhook checks
    const retRes = await ctx.get("/api/store/payment/return", { maxRedirects: 0 });
    expect(retRes.status()).toBe(303);

    const whBad = await ctx.post("/api/store/payment/webhook/stripe", {
      headers: { "stripe-signature": "t=0,v1=deadbeef" },
      data: JSON.stringify({ id: "evt_test" }),
    });
    expect(whBad.status()).toBe(401);

    // 7. Preview GET/POST, Revalidate POST, Telemetry POST, Files GET, Internal Identity Projection POST
    const exp = String(Date.now() + 120_000);
    const hmac = createHmac("sha256", env.REVALIDATION_SECRET).update(`website-preview:${exp}`).digest("hex");
    expect((await ctx.get(`/api/preview?expires=${exp}&token=${hmac}&locale=en&path=/en`, { maxRedirects: 0 })).status()).toBe(307);
    expect((await ctx.post("/api/preview", { headers: { Origin: STORE_ORIGIN }, maxRedirects: 0 })).status()).toBe(303);
    expect(
      (
        await ctx.post("/api/revalidate", {
          headers: { "x-revalidate-secret": env.REVALIDATION_SECRET },
          data: { tags: ["website"], paths: ["/en/products"] },
        })
      ).status(),
    ).toBe(200);
    expect((await ctx.post("/api/telemetry", { data: { logs: [{ action: "STORE_PING", message: "ok" }] } })).status()).toBe(200);
    expect((await ctx.get("/api/files/general/missing-no-ext")).status()).toBe(404);
    expect((await ctx.post("/api/internal/identity-projection", { data: {} })).status()).toBe(401);

    // Clean up test order from commerce
    const ordersList = await request.get(`${GATEWAY}/v1/commerce/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const orders: any[] = await ordersList.json();
    const matchOrder = orders.find((o) => (o.number || o.orderNumber) === orderJson.number || o.email === orderEmail);
    if (matchOrder) {
      await request.delete(`${GATEWAY}/v1/commerce/tables/sales_order/${matchOrder.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    await ctx.dispose();
  });

  test("full /api/account/[action] lifecycle: sign-up, profile, address CRUD, wishlist, order + attachment + order-help, sign-out, sign-in, OTP code, oauth callback & delete", async ({
    playwright,
    request,
  }) => {
    const adminToken = mintServiceToken("admin");
    const ts = Date.now();
    const ctx = await playwright.request.newContext({ baseURL: STORE_ORIGIN });
    const email = `store-acc-${ts}@example.test`;
    const password = `StorePass!${ts}`;

    // 1. Validation: missing name -> 400
    expect(
      (
        await ctx.post("/api/account/sign-up", {
          headers: { Origin: STORE_ORIGIN },
          data: { email, name: "", password },
        })
      ).status(),
    ).toBe(400);

    // 2. Sign-up -> 200 + cookies set
    const signUp = await ctx.post("/api/account/sign-up", {
      headers: { Origin: STORE_ORIGIN },
      data: { email, name: `Store API User ${ts}`, password, locale: "en", marketingOptIn: true },
    });
    expect(signUp.status(), await signUp.text()).toBe(200);

    // Duplicate sign-up -> 409
    const dupUp = await ctx.post("/api/account/sign-up", {
      headers: { Origin: STORE_ORIGIN },
      data: { email, name: "Dup User", password, locale: "en" },
    });
    expect(dupUp.status()).toBe(409);

    // 3. Profile update
    const profRes = await ctx.post("/api/account/profile", {
      headers: { Origin: STORE_ORIGIN },
      data: { name: `Store API Updated ${ts}`, phone: "+97336008888", preferredLocale: "en", marketingOptIn: false },
    });
    expect(profRes.status(), await profRes.text()).toBe(200);

    // 4. Address create + delete
    const addrRes = await ctx.post("/api/account/address", {
      headers: { Origin: STORE_ORIGIN },
      data: {
        label: "Office",
        name: `Store API User ${ts}`,
        phone: "+97336008888",
        line1: "Building 123, Road 45",
        area: "Seef",
        city: "Manama",
        country: "BH",
        isDefault: true,
      },
    });
    expect(addrRes.status(), await addrRes.text()).toBe(200);
    const addrJson = await addrRes.json();
    expect(addrJson.id).toBeTruthy();

    const delAddr = await ctx.post("/api/account/address-delete", {
      headers: { Origin: STORE_ORIGIN },
      data: { id: addrJson.id },
    });
    expect(delAddr.status()).toBe(200);

    // 5. Wishlist toggle & authenticated COD order on active product + stocked variant
    const prodRes = await request.get(`${GATEWAY}/v1/inventory/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const activeProd = (await prodRes.json()).find((p: any) => p.isActive);
    expect(activeProd).toBeTruthy();
    const [varsRes, lvlsRes] = await Promise.all([
      request.get(`${GATEWAY}/v1/inventory/products/${activeProd.id}/variants`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
      request.get(`${GATEWAY}/v1/inventory/stock/levels?productId=${activeProd.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    ]);
    const variants: any[] = await varsRes.json();
    const levels: any[] = await lvlsRes.json();
    const stockedLevel = levels.find((l) => Number(l.quantityAvailable) >= 1);
    const activeVar =
      variants.find((v) => v.isActive && v.id === stockedLevel?.variantId) ??
      variants.find((v) => v.isActive);

    const wishRes = await ctx.post("/api/account/wishlist", {
      headers: { Origin: STORE_ORIGIN },
      data: { itemId: activeProd.id },
    });
    expect(wishRes.status(), await wishRes.text()).toBe(200);
    expect(typeof (await wishRes.json()).saved).toBe("boolean");

    // 6. Place authenticated COD order -> attach file -> GET attachment -> submit order-help
    const codRes = await ctx.post("/api/store/order", {
      headers: { Origin: STORE_ORIGIN },
      data: {
        lines: [
          {
            productId: activeProd.id,
            ...(activeVar ? { variantId: activeVar.id } : {}),
            quantity: 1,
          },
        ],
        fulfilment: "pickup",
        paymentMethod: "cod",
        name: `Store API Updated ${ts}`,
        email,
        phone: "+97336008888",
        locale: "en",
      },
    });
    expect(codRes.status(), await codRes.text()).toBe(200);
    const codJson = await codRes.json();

    const orders: any[] = await (
      await request.get(`${GATEWAY}/v1/commerce/orders`, { headers: { Authorization: `Bearer ${adminToken}` } })
    ).json();
    const myOrder = orders.find((o) => (o.number || o.orderNumber) === codJson.number);
    expect(myOrder).toBeTruthy();

    const attUp = await ctx.post(`/api/account/orders/${myOrder.id}/attachments`, {
      headers: {
        Origin: STORE_ORIGIN,
        "x-file-name": encodeURIComponent(`order-doc-${ts}.png`),
        "content-type": "application/octet-stream",
      },
      data: SAMPLE_PNG,
    });
    expect(attUp.status(), await attUp.text()).toBe(201);
    const attJson = await attUp.json();

    const attGet = await ctx.get(`/api/account/orders/${myOrder.id}/attachments/${attJson.id}`);
    expect(attGet.status()).toBe(200);

    const helpRes = await ctx.post("/api/account/order-help", {
      headers: { Origin: STORE_ORIGIN },
      data: { orderId: myOrder.id, kind: "question", message: `API order question ${ts}`, locale: "en" },
    });
    expect(helpRes.status(), await helpRes.text()).toBe(200);
    expect((await helpRes.json()).reference).toBeTruthy();

    // 7. Sign-out -> Wrong password 401 -> Password sign-in 200 -> Sign-out -> Mailpit OTP code & code-verify
    expect((await ctx.post("/api/account/sign-out", { headers: { Origin: STORE_ORIGIN }, data: {} })).status()).toBe(200);
    expect(
      (
        await ctx.post("/api/account/sign-in", {
          headers: { Origin: STORE_ORIGIN },
          data: { email, password: "WrongPassword!" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await ctx.post("/api/account/sign-in", {
          headers: { Origin: STORE_ORIGIN },
          data: { email, password },
        })
      ).status(),
    ).toBe(200);

    expect((await ctx.post("/api/account/sign-out", { headers: { Origin: STORE_ORIGIN }, data: {} })).status()).toBe(200);
    const codeReq = await ctx.post("/api/account/code", {
      headers: { Origin: STORE_ORIGIN },
      data: { email, locale: "en" },
    });
    expect(codeReq.status(), await codeReq.text()).toBe(200);
    const otpMsg = await fetchMailpitMessage(email, undefined, 15_000);
    const otp = extractOtpCode(otpMsg);
    const codeVer = await ctx.post("/api/account/code-verify", {
      headers: { Origin: STORE_ORIGIN },
      data: { email, code: otp, locale: "en" },
    });
    expect(codeVer.status(), await codeVer.text()).toBe(200);

    // 8. OAuth redirect/callback graceful failure handling
    const oauthCallback = await ctx.get("/api/account/google/callback?error=access_denied", { maxRedirects: 0 });
    expect(oauthCallback.status()).toBe(303);

    // 9. Delete customer account (wrong confirmEmail -> 400, exact -> 200)
    expect(
      (
        await ctx.post("/api/account/delete", {
          headers: { Origin: STORE_ORIGIN },
          data: { confirmEmail: "wrong@example.test" },
        })
      ).status(),
    ).toBe(400);
    const delAcc = await ctx.post("/api/account/delete", {
      headers: { Origin: STORE_ORIGIN },
      data: { confirmEmail: email },
    });
    expect(delAcc.status(), await delAcc.text()).toBe(200);

    // Cleanup order row
    await request.delete(`${GATEWAY}/v1/commerce/tables/sales_order/${myOrder.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await ctx.dispose();
  });
});
