import crypto from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import { getTranslations } from "../../locales";
import {
  PAYMENT_GATEWAY_IDS,
  formatGatewayAmount,
  fromMinorUnits,
} from "../../lib/constants/payments";
import { INTEGRATION_PROVIDERS } from "../../lib/constants/integrations";
import {
  WebhookSignatureError,
  checkoutCom,
  hyperpay,
  moyasar,
  paymentGateway,
  paypal,
  paytabs,
  stripe,
  tap,
} from "../../lib/payments/gateways";
import {
  orderFromPaymentLink,
  paymentLinkToken,
} from "../../lib/services/payment-links";

const hmac = (key: string, text: string) =>
  crypto.createHmac("sha256", key).update(text).digest("hex");
const request = (body: string, headers: Record<string, string>) => ({
  headers: new Headers(headers),
  rawBody: body,
});

afterEach(() => vi.unstubAllGlobals());

/** Replaces fetch with one answer and keeps what was sent. */
function stubFetch(answer: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(answer), { status });
  });
  return calls;
}

describe("payment gateways", () => {
  test("amounts use the currency's decimals", () => {
    expect(formatGatewayAmount(12.5, "BHD")).toBe("12.500");
    expect(formatGatewayAmount(12.5, "SAR")).toBe("12.50");
    expect(formatGatewayAmount(1200, "JPY")).toBe("1200");
    expect(fromMinorUnits(12500, "KWD")).toBe(12.5);
    expect(fromMinorUnits(1250, "USD")).toBe(12.5);
  });

  test("every gateway is a payments integration with a name and description in both languages", () => {
    for (const id of PAYMENT_GATEWAY_IDS) {
      expect(paymentGateway(id).id).toBe(id);
      const provider = INTEGRATION_PROVIDERS.find((p) => p.id === id);
      expect(provider?.kind).toBe("payments");
      for (const locale of ["en", "ar"] as const) {
        const t = getTranslations(locale).admin.integrations as unknown as {
          providers: Record<string, { name: string; description: string }>;
          fields: Record<string, string>;
        };
        expect(t.providers[id]?.description).toBeTruthy();
        for (const field of provider!.fields)
          expect(t.fields[field.key], `${locale} ${field.key}`).toBeTruthy();
      }
    }
  });

  test("Stripe: a hosted checkout in whole tens of fils, and only signed, fresh webhooks", async () => {
    const calls = stubFetch({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
    const started = await stripe.start(
      { secretKey: "sk_test_x" },
      {
        attemptId: "a1",
        orderNumber: "SO-2026-000001",
        amount: 7.975,
        currency: "BHD",
        customer: { name: "A B", email: "a@example.test", phone: "" },
        locale: "en",
        returnUrl: "https://shop.test/r?attempt=a1",
        cancelUrl: "https://shop.test/r?attempt=a1&cancelled=1",
        webhookUrl: "",
      },
    );
    expect(started).toEqual({
      sessionId: "cs_test_1",
      redirectUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
    const sent = new URLSearchParams(String(calls[0].init.body));
    expect(sent.get("line_items[0][price_data][unit_amount]")).toBe("7980");
    expect(sent.get("success_url")).toBe(
      "https://shop.test/r?attempt=a1&session_id={CHECKOUT_SESSION_ID}",
    );
    expect(new Headers(calls[0].init.headers).get("Idempotency-Key")).toBe(
      "start-a1",
    );
    expect(stripe.testMode({ secretKey: "sk_test_x" })).toBe(true);
    expect(stripe.testMode({ secretKey: "sk_live_x" })).toBe(false);

    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          payment_status: "paid",
          payment_intent: "pi_1",
          amount_total: 7980,
          currency: "bhd",
          metadata: { attempt: "a1" },
        },
      },
    });
    const t = Math.floor(Date.now() / 1000);
    const event = await stripe.webhook(
      { webhookSecret: "whsec_1" },
      request(body, {
        "stripe-signature": `t=${t},v1=${hmac("whsec_1", `${t}.${body}`)}`,
      }),
    );
    expect(event).toMatchObject({
      state: "paid",
      eventId: "evt_1",
      attemptId: "a1",
      paymentId: "pi_1",
      amount: 7.98,
      currency: "BHD",
    });
    await expect(
      stripe.webhook(
        { webhookSecret: "whsec_1" },
        request(body, {
          "stripe-signature": `t=${t},v1=${hmac("whsec_2", `${t}.${body}`)}`,
        }),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
    const old = t - 3600;
    await expect(
      stripe.webhook(
        { webhookSecret: "whsec_1" },
        request(body, {
          "stripe-signature": `t=${old},v1=${hmac("whsec_1", `${old}.${body}`)}`,
        }),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  test("Tap: the hashstring covers the charge's id, amount, status and references", async () => {
    const charge = {
      id: "chg_1",
      amount: 12.5,
      currency: "BHD",
      status: "CAPTURED",
      gateway: { reference: "g1" },
      reference: { payment: "p1", transaction: "a1" },
      transaction: { created: "1700000000000" },
      metadata: { attempt: "a1" },
    };
    const text =
      "x_idchg_1x_amount12.500x_currencyBHDx_gateway_referenceg1x_payment_referencep1x_statusCAPTUREDx_created1700000000000";
    const body = JSON.stringify(charge);
    expect(
      await tap.webhook(
        { secretKey: "sk_test_1" },
        request(body, { hashstring: hmac("sk_test_1", text) }),
      ),
    ).toMatchObject({
      state: "paid",
      attemptId: "a1",
      paymentId: "chg_1",
      eventId: "chg_1:CAPTURED",
    });
    await expect(
      tap.webhook(
        { secretKey: "sk_test_1" },
        request(body.replace("CAPTURED", "FAILED"), {
          hashstring: hmac("sk_test_1", text),
        }),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  test("Checkout.com, PayTabs and Moyasar verify their webhooks", async () => {
    const cko = JSON.stringify({
      id: "evt_1",
      type: "payment_captured",
      data: {
        id: "pay_1",
        amount: 12500,
        currency: "BHD",
        metadata: { attempt: "a1" },
      },
    });
    expect(
      await checkoutCom.webhook(
        { webhookSecret: "k" },
        request(cko, { "cko-signature": hmac("k", cko) }),
      ),
    ).toMatchObject({ state: "paid", amount: 12.5, attemptId: "a1" });
    await expect(
      checkoutCom.webhook(
        { webhookSecret: "k" },
        request(cko, { "cko-signature": hmac("other", cko) }),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);

    const pt = JSON.stringify({
      tran_ref: "TST1",
      tran_type: "Sale",
      cart_id: "a1",
      cart_amount: "12.500",
      cart_currency: "BHD",
      payment_result: { response_status: "A" },
    });
    expect(
      await paytabs.webhook(
        { serverKey: "s" },
        request(pt, { signature: hmac("s", pt) }),
      ),
    ).toMatchObject({ state: "paid", attemptId: "a1", paymentId: "TST1" });
    await expect(
      paytabs.webhook({ serverKey: "s" }, request(pt, { signature: "0" })),
    ).rejects.toBeInstanceOf(WebhookSignatureError);

    const my = JSON.stringify({
      id: "e1",
      type: "payment_paid",
      secret_token: "tok",
      data: {
        id: "pm_1",
        amount: 1250,
        currency: "SAR",
        invoice_id: "inv_1",
        metadata: { attempt: "a1" },
      },
    });
    expect(
      await moyasar.webhook({ webhookSecret: "tok" }, request(my, {})),
    ).toMatchObject({ state: "paid", amount: 12.5, sessionId: "inv_1" });
    await expect(
      moyasar.webhook({ webhookSecret: "nope" }, request(my, {})),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  test("HyperPay: webhooks are decrypted with the key, and tampering is refused", async () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const payload = JSON.stringify({
      type: "PAYMENT",
      payload: {
        id: "8ac7",
        paymentType: "DB",
        merchantTransactionId: "a1",
        amount: "12.50",
        currency: "SAR",
        result: { code: "000.100.110" },
      },
    });
    const body = cipher.update(payload, "utf8", "hex") + cipher.final("hex");
    const headers = {
      "x-initialization-vector": iv.toString("hex"),
      "x-authentication-tag": cipher.getAuthTag().toString("hex"),
    };
    expect(
      await hyperpay.webhook(
        { webhookKey: key.toString("hex") },
        request(body, headers),
      ),
    ).toMatchObject({ state: "paid", attemptId: "a1", paymentId: "8ac7" });
    const tampered = (body[0] === "0" ? "1" : "0") + body.slice(1);
    await expect(
      hyperpay.webhook(
        { webhookKey: key.toString("hex") },
        request(tampered, headers),
      ),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  test("PayPal refuses currencies it does not take before calling it", async () => {
    const calls = stubFetch({});
    await expect(
      paypal.start(
        { environment: "sandbox", clientId: "c", clientSecret: "s" },
        {
          attemptId: "a1",
          orderNumber: "SO",
          amount: 5,
          currency: "BHD",
          customer: { name: "A", email: "", phone: "" },
          locale: "en",
          returnUrl: "",
          cancelUrl: "",
          webhookUrl: "",
        },
      ),
    ).rejects.toThrow("PayPal does not accept BHD");
    expect(calls).toHaveLength(0);
  });

  test("a payment link opens only the order it was made for", () => {
    vi.stubEnv("CUSTOMER_AUTH_SECRET", "test-secret-for-links-0123456789");
    const id = "6f1c2c5e-1111-4222-8333-944455556666";
    const token = paymentLinkToken(id);
    expect(orderFromPaymentLink(token)).toBe(id);
    expect(
      orderFromPaymentLink(
        token.replace(id, "6f1c2c5e-1111-4222-8333-944455556667"),
      ),
    ).toBeNull();
    expect(orderFromPaymentLink(`${id}.short`)).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe("current provider request contracts", () => {
  test("Checkout.com uses the account API prefix and rejects host injection", async () => {
    const credentials = {
      environment: "test",
      apiPrefix: "account123",
      secretKey: "sk_test_key",
      processingChannelId: "pc_1",
      billingCountry: "BH",
      webhookSecret: "secret",
    };
    const calls = stubFetch({});
    await checkoutCom.check(credentials);
    expect(calls[0].url).toBe(
      "https://account123.api.sandbox.checkout.com/payments?reference=connection-check",
    );
    await expect(
      checkoutCom.check({ ...credentials, apiPrefix: "attacker.example/" }),
    ).rejects.toThrow(/prefix/);
    expect(calls).toHaveLength(1);
  });
  test("Moyasar does not send invoice notifications to a browser-return handler", async () => {
    const calls = stubFetch({
      id: "invoice",
      url: "https://checkout.example.test/invoice",
    });
    await moyasar.start(
      { secretKey: "sk_test_key" },
      {
        attemptId: "attempt",
        orderNumber: "order",
        amount: 10,
        currency: "SAR",
        customer: { name: "Customer", email: "buyer@example.test", phone: "" },
        locale: "en",
        returnUrl: "https://shop.example.test/return",
        cancelUrl: "https://shop.example.test/cancel",
        webhookUrl: "https://shop.example.test/webhook",
      },
    );
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.success_url).toBe("https://shop.example.test/return");
    expect(body).not.toHaveProperty("callback_url");
  });
  test("HyperPay propagates unavailable or malformed state rather than fabricating pending", async () => {
    stubFetch({ result: { description: "Temporarily unavailable" } }, 503);
    await expect(
      hyperpay.status(
        { entityId: "entity", accessToken: "token" },
        "checkout",
        {},
      ),
    ).rejects.toThrow("Temporarily unavailable");
    stubFetch({});
    await expect(
      hyperpay.status(
        { entityId: "entity", accessToken: "token" },
        "checkout",
        {},
      ),
    ).rejects.toThrow("Invalid provider response");
  });
  test.each([
    ["KWT", "secure-kuwait.paytabs.com"],
    ["MAR", "secure-morocco.paytabs.com"],
    ["QAT", "secure-doha.paytabs.com"],
  ])("PayTabs supports documented %s regional host", async (region, host) => {
    const calls = stubFetch({ tran_ref: "transaction" });
    await paytabs.check({ region, profileId: "1", serverKey: "test_key" });
    expect(new URL(calls[0].url).hostname).toBe(host);
  });
  test("DHL API keys are masked in integration settings", () => {
    expect(
      INTEGRATION_PROVIDERS.find(
        (provider) => provider.id === "dhl_express",
      )?.fields.find((field) => field.key === "apiKey")?.secret,
    ).toBe(true);
  });
});

test("HyperPay rejects precision loss before creating a checkout or refund", async () => {
  const calls = stubFetch({ id: "checkout" });
  const credentials = {
    entityId: "entity",
    accessToken: "token",
    brands: "VISA",
  };
  const input = {
    attemptId: "attempt",
    orderNumber: "order",
    amount: 12.345,
    currency: "BHD",
    customer: { name: "Customer", email: "buyer@example.test", phone: "" },
    locale: "en" as const,
    returnUrl: "https://shop.example.test/return",
    cancelUrl: "https://shop.example.test/cancel",
    webhookUrl: "https://shop.example.test/webhook",
  };
  await expect(hyperpay.start(credentials, input)).rejects.toThrow(
    /two decimal places/,
  );
  await expect(
    hyperpay.refund(credentials, {
      paymentId: "payment",
      amount: 12.345,
      currency: "BHD",
      reason: "Return",
      attemptId: "attempt",
    }),
  ).rejects.toThrow(/two decimal places/);
  expect(calls).toHaveLength(0);
  await hyperpay.start(credentials, { ...input, amount: 12.34 });
  expect(new URLSearchParams(String(calls[0].init.body)).get("amount")).toBe(
    "12.34",
  );
});

test("Checkout.com resolves payment identity from the stored hosted page, ignoring browser substitutions", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          _links: {
            payment: {
              href: "https://api.sandbox.checkout.com/payments/pay_bound",
            },
          },
        }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "pay_bound",
          status: "Captured",
          amount: 12500,
          currency: "BHD",
        }),
        { status: 200 },
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await checkoutCom.status(
        { environment: "sandbox", secretKey: "key" },
        "stored-page",
        { "cko-payment-id": "pay_substituted" },
      )
    ).state,
  ).toBe("paid");
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    "https://api.sandbox.checkout.com/hosted-payments/stored-page",
    "https://api.sandbox.checkout.com/payments/pay_bound",
  ]);
});
