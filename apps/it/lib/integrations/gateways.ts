import crypto from "node:crypto";
import {
  formatMessage,
  serverMessages,
  serverTemplates,
} from "@platform/locales";
import { getCurrencyDecimals } from "@platform/config/currency";
import {
  formatGatewayAmount,
  fromMinorUnits,
  type PaymentGatewayId,
} from "../config/constants/payments";
import { PAYTABS_REGIONS } from "../config/constants/integrations";
import { toMinorUnits } from "../config/currency";
import type { ConnectionCheck, Credentials } from "./providers";

interface StartPaymentInput {

  attemptId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customer: { name: string; email: string; phone: string };
  locale: "en" | "ar";

  returnUrl: string;
  cancelUrl: string;

  webhookUrl: string;
}

export type StartedPayment =
  | { sessionId: string; redirectUrl: string }

  | {
      sessionId: string;
      widget: { scriptUrl: string; integrity?: string; brands: string };
    };

type GatewayPaymentState = "paid" | "pending" | "failed";

export interface GatewayPayment {
  state: GatewayPaymentState;

  paymentId?: string;

  amount?: number;
  currency?: string;
}

interface GatewayEvent extends GatewayPayment {

  eventId: string;
  attemptId?: string;
  sessionId?: string;
}

interface WebhookRequest {
  headers: Headers;
  rawBody: string;
}

export interface PaymentGateway {
  id: PaymentGatewayId;

  testMode(c: Credentials): boolean;
  start(c: Credentials, input: StartPaymentInput): Promise<StartedPayment>;

  status(
    c: Credentials,
    sessionId: string,
    returnParams: Record<string, string>,
  ): Promise<GatewayPayment>;

  webhook(
    c: Credentials,
    request: WebhookRequest,
  ): Promise<GatewayEvent | null>;
  refund(
    c: Credentials,
    input: {
      paymentId: string;
      amount: number;
      currency: string;
      reason: string;
      attemptId: string;
    },
  ): Promise<{ refundId: string }>;
  check(c: Credentials): Promise<ConnectionCheck>;
}

export class GatewayError extends Error {}

export class WebhookSignatureError extends GatewayError {}

const TIMEOUT_MS = 20_000;

const base = (id: PaymentGatewayId, fallback: string) =>
  (
    process.env[`PAYMENT_GATEWAY_BASE_URL_${id.toUpperCase()}`] || fallback
  ).replace(/\/$/, "");

function need(c: Credentials, ...keys: string[]) {
  for (const key of keys)
    if (!c[key]?.trim()) throw new GatewayError(`Missing ${key}`);
}

const message = (body: unknown): string | undefined => {
  if (!body || typeof body !== "object")
    return typeof body === "string" && body.length < 300 ? body : undefined;
  const b = body as Record<string, unknown>;
  const pick = (v: unknown): string | undefined =>
    typeof v === "string"
      ? v
      : v && typeof v === "object"
        ? pick(
            (v as Record<string, unknown>).message ??
              (v as Record<string, unknown>).description,
          )
        : undefined;
  const errors = Array.isArray(b.errors)
    ? b.errors.map(pick).filter(Boolean).join("; ")
    : undefined;
  return (
    pick(b.error) ??
    pick(b.message) ??
    errors ??
    pick(b.error_description) ??
    pick(b.result) ??
    pick(b.details) ??
    undefined
  );
};

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new GatewayError(
      error instanceof Error && error.name === "TimeoutError"
        ? "The payment gateway did not respond in time"
        : "Could not reach the payment gateway",
    );
  }
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {}
  if (!response.ok)
    throw new GatewayError(
      message(body) ?? `The payment gateway returned HTTP ${response.status}`,
    );
  return body as T;
}

const json = (headers: Record<string, string>, body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});
const form = (
  headers: Record<string, string>,
  fields: Record<string, string>,
): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
  body: new URLSearchParams(fields).toString(),
});
const hmacHex = (key: string | Buffer, text: string) =>
  crypto.createHmac("sha256", key).update(text, "utf8").digest("hex");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const parse = (raw: string): Record<string, unknown> => {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    throw new WebhookSignatureError("Unreadable webhook");
  }
};
const str = (value: unknown) =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";
const obj = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const live = (c: Credentials) =>
  (c.environment ?? "").trim().toLowerCase() === "live";
const nameParts = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return {
    first: parts[0] || "-",
    last: parts.slice(1).join(" ") || parts[0] || "-",
  };
};

const stripeMinor = (amount: number, currency: string) => {
  const minor = toMinorUnits(amount, currency);
  return getCurrencyDecimals(currency) === 3
    ? Math.round(minor / 10) * 10
    : minor;
};

export const stripe: PaymentGateway = {
  id: "stripe",
  testMode: (c) =>
    (c.secretKey ?? "").startsWith("sk_test_") ||
    (c.secretKey ?? "").startsWith("rk_test_"),
  async start(c, input) {
    need(c, "secretKey");
    const currency = input.currency.toLowerCase();
    const session = await call<{ id: string; url: string }>(
      `${base("stripe", "https://api.stripe.com")}/v1/checkout/sessions`,
      form(
        {
          Authorization: `Bearer ${c.secretKey}`,
          "Idempotency-Key": `start-${input.attemptId}`,
        },
        {
          mode: "payment",
          "line_items[0][quantity]": "1",
          "line_items[0][price_data][currency]": currency,
          "line_items[0][price_data][unit_amount]": String(
            stripeMinor(input.amount, input.currency),
          ),
          "line_items[0][price_data][product_data][name]": input.orderNumber,
          client_reference_id: input.attemptId,
          "metadata[attempt]": input.attemptId,
          "payment_intent_data[metadata][attempt]": input.attemptId,
          ...(input.customer.email
            ? { customer_email: input.customer.email }
            : {}),
          locale: input.locale === "ar" ? "auto" : "en",
          success_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: input.cancelUrl,
        },
      ),
    );
    if (!session.url)
      throw new GatewayError("Stripe did not return a checkout page");
    return { sessionId: session.id, redirectUrl: session.url };
  },
  async status(c, sessionId) {
    const s = await call<{
      payment_status?: string;
      status?: string;
      payment_intent?: string | { id: string };
      amount_total?: number;
      currency?: string;
    }>(
      `${base("stripe", "https://api.stripe.com")}/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${c.secretKey}` } },
    );
    return stripeSession(s);
  },
  async webhook(c, request) {
    need(c, "webhookSecret");
    const header = request.headers.get("stripe-signature") ?? "";
    const parts = Object.fromEntries(
      header.split(",").map((p) => p.split("=", 2) as [string, string]),
    );
    const signatures = header
      .split(",")
      .filter((p) => p.startsWith("v1="))
      .map((p) => p.slice(3));
    const timestamp = Number(parts.t);
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300)
      throw new WebhookSignatureError("Stripe webhook is too old");
    const expected = hmacHex(c.webhookSecret, `${parts.t}.${request.rawBody}`);
    if (!signatures.some((s) => safeEqual(s, expected)))
      throw new WebhookSignatureError(
        "Stripe webhook signature does not match",
      );
    const event = parse(request.rawBody);
    const type = str(event.type);
    if (!type.startsWith("checkout.session.")) return null;
    const session = obj(obj(event.data).object);
    const result =
      type === "checkout.session.expired" ||
      type === "checkout.session.async_payment_failed"
        ? { state: "failed" as const }
        : stripeSession(session);
    return {
      ...result,
      eventId: str(event.id),
      sessionId: str(session.id),
      attemptId:
        str(obj(session.metadata).attempt) || str(session.client_reference_id),
    };
  },
  async refund(c, input) {
    const refund = await call<{ id: string }>(
      `${base("stripe", "https://api.stripe.com")}/v1/refunds`,
      form(
        {
          Authorization: `Bearer ${c.secretKey}`,
          "Idempotency-Key": `refund-${input.attemptId}-${input.amount}-${Date.now()}`,
        },
        {
          payment_intent: input.paymentId,
          amount: String(stripeMinor(input.amount, input.currency)),
          "metadata[reason]": input.reason.slice(0, 200),
        },
      ),
    );
    return { refundId: refund.id };
  },
  async check(c) {
    need(c, "secretKey", "webhookSecret");
    const balance = await call<{ livemode?: boolean }>(
      `${base("stripe", "https://api.stripe.com")}/v1/balance`,
      { headers: { Authorization: `Bearer ${c.secretKey}` } },
    );
    return { ok: true, accountName: balance.livemode ? "Live" : "Test mode" };
  },
};

function stripeSession(
  s:
    | Record<string, unknown>
    | {
        payment_status?: string;
        status?: string;
        payment_intent?: unknown;
        amount_total?: number;
        currency?: string;
      },
): GatewayPayment {
  const session = s as Record<string, unknown>;
  const intent = session.payment_intent;
  const currency = str(session.currency).toUpperCase();
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  return {
    state: paid ? "paid" : session.status === "expired" ? "failed" : "pending",
    paymentId:
      typeof intent === "string" ? intent : str(obj(intent).id) || undefined,
    amount:
      typeof session.amount_total === "number" && currency
        ? fromMinorUnits(session.amount_total, currency)
        : undefined,
    currency: currency || undefined,
  };
}

const TAP_PAID = new Set(["CAPTURED"]);
const TAP_PENDING = new Set(["INITIATED", "IN_PROGRESS", "AUTHORIZED"]);

export const tap: PaymentGateway = {
  id: "tap",
  testMode: (c) => (c.secretKey ?? "").startsWith("sk_test_"),
  async start(c, input) {
    need(c, "secretKey");
    const { first, last } = nameParts(input.customer.name);
    const charge = await call<{ id: string; transaction?: { url?: string } }>(
      `${base("tap", "https://api.tap.company")}/v2/charges`,
      json(
        { Authorization: `Bearer ${c.secretKey}`, lang_code: input.locale },
        {
          amount: Number(formatGatewayAmount(input.amount, input.currency)),
          currency: input.currency,
          threeDSecure: true,
          save_card: false,
          description: input.orderNumber,
          reference: { transaction: input.attemptId, order: input.orderNumber },
          metadata: { attempt: input.attemptId },
          customer: {
            first_name: first,
            last_name: last,
            email: input.customer.email || undefined,
            phone: input.customer.phone
              ? {
                  number: input.customer.phone.replace(/[^\d]/g, "").slice(-12),
                }
              : undefined,
          },
          source: { id: "src_all" },
          post: { url: input.webhookUrl },
          redirect: { url: input.returnUrl },
        },
      ),
    );
    if (!charge.transaction?.url)
      throw new GatewayError("Tap did not return a payment page");
    return { sessionId: charge.id, redirectUrl: charge.transaction.url };
  },
  async status(c, sessionId, params) {

    const id = sessionId || params.tap_id;
    return tapCharge(
      await call<Record<string, unknown>>(
        `${base("tap", "https://api.tap.company")}/v2/charges/${encodeURIComponent(id)}`,
        { headers: { Authorization: `Bearer ${c.secretKey}` } },
      ),
    );
  },
  async webhook(c, request) {
    need(c, "secretKey");
    const charge = parse(request.rawBody);
    const currency = str(charge.currency);
    const amount = formatGatewayAmount(Number(charge.amount), currency);
    const text = `x_id${str(charge.id)}x_amount${amount}x_currency${currency}x_gateway_reference${str(obj(charge.gateway).reference)}x_payment_reference${str(obj(charge.reference).payment)}x_status${str(charge.status)}x_created${str(obj(charge.transaction).created)}`;
    const given = request.headers.get("hashstring") ?? "";
    if (!given || !safeEqual(given, hmacHex(c.secretKey, text)))
      throw new WebhookSignatureError("Tap webhook signature does not match");
    if (!str(charge.id).startsWith("chg_")) return null;
    return {
      ...tapCharge(charge),
      eventId: `${str(charge.id)}:${str(charge.status)}`,
      sessionId: str(charge.id),
      attemptId:
        str(obj(charge.metadata).attempt) ||
        str(obj(charge.reference).transaction),
    };
  },
  async refund(c, input) {
    const refund = await call<{ id: string }>(
      `${base("tap", "https://api.tap.company")}/v2/refunds`,
      json(
        { Authorization: `Bearer ${c.secretKey}` },
        {
          charge_id: input.paymentId,
          amount: Number(formatGatewayAmount(input.amount, input.currency)),
          currency: input.currency,
          reason: input.reason.slice(0, 200) || "requested_by_customer",
          reference: { merchant: input.attemptId },
          metadata: { attempt: input.attemptId },
        },
      ),
    );
    return { refundId: refund.id };
  },
  async check(c) {
    need(c, "secretKey");
    await call(
      `${base("tap", "https://api.tap.company")}/v2/charges/list`,
      json({ Authorization: `Bearer ${c.secretKey}` }, { limit: 1 }),
    );
    return { ok: true, accountName: tap.testMode(c) ? "Test mode" : "Live" };
  },
};

function tapCharge(charge: Record<string, unknown>): GatewayPayment {
  const status = str(charge.status).toUpperCase();
  return {
    state: TAP_PAID.has(status)
      ? "paid"
      : TAP_PENDING.has(status)
        ? "pending"
        : "failed",
    paymentId: str(charge.id) || undefined,
    amount: Number(charge.amount) || undefined,
    currency: str(charge.currency) || undefined,
  };
}

const paypalBase = (c: Credentials) =>
  base(
    "paypal",
    live(c) ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
  );

const PAYPAL_CURRENCIES = new Set([
  "AUD",
  "BRL",
  "CAD",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "HKD",
  "HUF",
  "ILS",
  "JPY",
  "MYR",
  "MXN",
  "TWD",
  "NZD",
  "NOK",
  "PHP",
  "PLN",
  "GBP",
  "SGD",
  "SEK",
  "CHF",
  "THB",
  "USD",
]);

async function paypalToken(c: Credentials) {
  need(c, "clientId", "clientSecret");
  const token = await call<{ access_token: string }>(
    `${paypalBase(c)}/v1/oauth2/token`,
    form(
      {
        Authorization: `Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64")}`,
      },
      { grant_type: "client_credentials" },
    ),
  );
  return token.access_token;
}

export const paypal: PaymentGateway = {
  id: "paypal",
  testMode: (c) => !live(c),
  async start(c, input) {
    if (!PAYPAL_CURRENCIES.has(input.currency.toUpperCase()))
      throw new GatewayError(`PayPal does not accept ${input.currency}`);
    const token = await paypalToken(c);
    const order = await call<{
      id: string;
      links?: { rel: string; href: string }[];
    }>(
      `${paypalBase(c)}/v2/checkout/orders`,
      json(
        {
          Authorization: `Bearer ${token}`,
          "PayPal-Request-Id": `start-${input.attemptId}`,
        },
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: input.attemptId,
              custom_id: input.attemptId,
              invoice_id: `${input.orderNumber}-${input.attemptId.slice(0, 8)}`,
              description: input.orderNumber,
              amount: {
                currency_code: input.currency.toUpperCase(),
                value: formatGatewayAmount(input.amount, input.currency),
              },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                return_url: input.returnUrl,
                cancel_url: input.cancelUrl,
                user_action: "PAY_NOW",
                shipping_preference: "NO_SHIPPING",
                locale: input.locale === "ar" ? "ar-SA" : "en-US",
              },
            },
          },
        },
      ),
    );
    const href = order.links?.find(
      (l) => l.rel === "payer-action" || l.rel === "approve",
    )?.href;
    if (!href) throw new GatewayError("PayPal did not return an approval page");
    return { sessionId: order.id, redirectUrl: href };
  },
  async status(c, sessionId) {
    const token = await paypalToken(c);
    let order = await call<Record<string, unknown>>(
      `${paypalBase(c)}/v2/checkout/orders/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (order.status === "APPROVED")
      order = await call<Record<string, unknown>>(
        `${paypalBase(c)}/v2/checkout/orders/${encodeURIComponent(sessionId)}/capture`,
        json(
          {
            Authorization: `Bearer ${token}`,
            "PayPal-Request-Id": `capture-${sessionId}`,
          },
          {},
        ),
      );
    return paypalOrder(order);
  },
  async webhook(c, request) {
    need(c, "webhookId");
    const event = parse(request.rawBody);
    const token = await paypalToken(c);
    const h = (name: string) => request.headers.get(name) ?? "";
    const verified = await call<{ verification_status?: string }>(
      `${paypalBase(c)}/v1/notifications/verify-webhook-signature`,
      json(
        { Authorization: `Bearer ${token}` },
        {
          auth_algo: h("paypal-auth-algo"),
          cert_url: h("paypal-cert-url"),
          transmission_id: h("paypal-transmission-id"),
          transmission_sig: h("paypal-transmission-sig"),
          transmission_time: h("paypal-transmission-time"),
          webhook_id: c.webhookId,
          webhook_event: event,
        },
      ),
    );
    if (verified.verification_status !== "SUCCESS")
      throw new WebhookSignatureError(
        "PayPal webhook signature does not match",
      );
    const type = str(event.event_type);
    const resource = obj(event.resource);
    if (type === "CHECKOUT.ORDER.APPROVED")
      return {
        state: "pending",
        eventId: str(event.id),
        sessionId: str(resource.id),
        attemptId: str(
          obj((resource.purchase_units as unknown[] | undefined)?.[0])
            .custom_id,
        ),
      };
    if (!type.startsWith("PAYMENT.CAPTURE.")) return null;
    const amount = obj(resource.amount);
    return {
      state:
        type === "PAYMENT.CAPTURE.COMPLETED"
          ? "paid"
          : type === "PAYMENT.CAPTURE.PENDING"
            ? "pending"
            : "failed",
      paymentId: str(resource.id),
      amount: Number(amount.value) || undefined,
      currency: str(amount.currency_code) || undefined,
      eventId: str(event.id),
      sessionId:
        str(obj(obj(resource.supplementary_data).related_ids).order_id) ||
        undefined,
      attemptId: str(resource.custom_id) || undefined,
    };
  },
  async refund(c, input) {
    const token = await paypalToken(c);
    const refund = await call<{ id: string }>(
      `${paypalBase(c)}/v2/payments/captures/${encodeURIComponent(input.paymentId)}/refund`,
      json(
        {
          Authorization: `Bearer ${token}`,
          "PayPal-Request-Id": `refund-${input.attemptId}-${Date.now()}`,
        },
        {
          amount: {
            value: formatGatewayAmount(input.amount, input.currency),
            currency_code: input.currency.toUpperCase(),
          },
          note_to_payer: input.reason.slice(0, 255) || undefined,
        },
      ),
    );
    return { refundId: refund.id };
  },
  async check(c) {
    need(c, "environment", "clientId", "clientSecret", "webhookId");
    await paypalToken(c);
    return { ok: true, accountName: live(c) ? "Live" : "Sandbox" };
  },
};

function paypalOrder(order: Record<string, unknown>): GatewayPayment {
  const capture = obj(
    (
      obj(obj((order.purchase_units as unknown[] | undefined)?.[0]).payments)
        .captures as unknown[] | undefined
    )?.[0],
  );
  const amount = obj(capture.amount);
  const status = str(order.status);
  const captured = str(capture.status);
  return {
    state:
      status === "COMPLETED" && captured === "COMPLETED"
        ? "paid"
        : status === "VOIDED" ||
            captured === "DECLINED" ||
            captured === "FAILED"
          ? "failed"
          : "pending",
    paymentId: str(capture.id) || undefined,
    amount: Number(amount.value) || undefined,
    currency: str(amount.currency_code) || undefined,
  };
}

const ckoBase = (c: Credentials) => {
  const prefix = c.apiPrefix?.trim() ?? "";
  if (prefix && !/^[a-z0-9]+$/.test(prefix))
    throw new GatewayError(serverMessages.paymentApiPrefixInvalid);
  return base(
    "checkout_com",
    `https://${prefix ? `${prefix}.` : ""}api${live(c) ? "" : ".sandbox"}.checkout.com`,
  );
};

export const checkoutCom: PaymentGateway = {
  id: "checkout_com",
  testMode: (c) => !live(c),
  async start(c, input) {
    need(c, "secretKey", "processingChannelId", "billingCountry");
    const page = await call<{
      id: string;
      _links?: { redirect?: { href?: string } };
    }>(
      `${ckoBase(c)}/hosted-payments`,
      json(
        {
          Authorization: `Bearer ${c.secretKey}`,
          "Cko-Idempotency-Key": `start-${input.attemptId}`,
        },
        {
          amount: toMinorUnits(input.amount, input.currency),
          currency: input.currency.toUpperCase(),
          reference: input.orderNumber,
          description: input.orderNumber,
          processing_channel_id: c.processingChannelId,
          billing: {
            address: { country: c.billingCountry.trim().toUpperCase() },
          },
          customer: {
            name: input.customer.name,
            email: input.customer.email || undefined,
          },
          metadata: { attempt: input.attemptId },
          locale: input.locale === "ar" ? "ar" : "en-GB",
          success_url: input.returnUrl,
          failure_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      ),
    );
    const href = page._links?.redirect?.href;
    if (!href)
      throw new GatewayError("Checkout.com did not return a payment page");
    return { sessionId: page.id, redirectUrl: href };
  },
  async status(c, sessionId) {
    const page = await call<{ _links?: { payment?: { href?: string } } }>(
      `${ckoBase(c)}/hosted-payments/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${c.secretKey}` } },
    );
    const paymentId = page._links?.payment?.href?.split("/").pop() ?? "";
    if (!paymentId) return { state: "pending" };
    return ckoPayment(
      await call<Record<string, unknown>>(
        `${ckoBase(c)}/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${c.secretKey}` } },
      ),
    );
  },
  async webhook(c, request) {
    need(c, "webhookSecret");
    const given = request.headers.get("cko-signature") ?? "";
    if (!given || !safeEqual(given, hmacHex(c.webhookSecret, request.rawBody)))
      throw new WebhookSignatureError(
        "Checkout.com webhook signature does not match",
      );
    const event = parse(request.rawBody);
    const type = str(event.type);
    const data = obj(event.data);
    const state: GatewayPaymentState | null =
      type === "payment_captured"
        ? "paid"
        : [
              "payment_declined",
              "payment_expired",
              "payment_canceled",
              "payment_capture_declined",
            ].includes(type)
          ? "failed"
          : type === "payment_approved"
            ? "pending"
            : null;
    if (!state) return null;
    const currency = str(data.currency);
    return {
      state,
      paymentId: str(data.id),
      amount:
        currency && typeof data.amount === "number"
          ? fromMinorUnits(data.amount, currency)
          : undefined,
      currency: currency || undefined,
      eventId: str(event.id),
      attemptId: str(obj(data.metadata).attempt) || undefined,
    };
  },
  async refund(c, input) {
    const refund = await call<{ action_id: string }>(
      `${ckoBase(c)}/payments/${encodeURIComponent(input.paymentId)}/refunds`,
      json(
        {
          Authorization: `Bearer ${c.secretKey}`,
          "Cko-Idempotency-Key": `refund-${input.attemptId}-${Date.now()}`,
        },
        {
          amount: toMinorUnits(input.amount, input.currency),
          reference: input.attemptId,
        },
      ),
    );
    return { refundId: refund.action_id };
  },
  async check(c) {
    need(
      c,
      "environment",
      "secretKey",
      "processingChannelId",
      "billingCountry",
      "webhookSecret",
    );
    if (!/^[A-Za-z]{2}$/.test(c.billingCountry.trim()))
      return { ok: false, error: serverMessages.paymentBillingCountryInvalid };
    await call(`${ckoBase(c)}/payments?reference=connection-check`, {
      headers: { Authorization: `Bearer ${c.secretKey}` },
    });
    return { ok: true, accountName: live(c) ? "Live" : "Sandbox" };
  },
};

function ckoPayment(payment: Record<string, unknown>): GatewayPayment {
  const status = str(payment.status);
  const currency = str(payment.currency);
  return {
    state:
      status === "Captured" || status === "Paid"
        ? "paid"
        : ["Declined", "Canceled", "Expired", "Voided"].includes(status)
          ? "failed"
          : "pending",
    paymentId: str(payment.id) || undefined,
    amount:
      currency && typeof payment.amount === "number"
        ? fromMinorUnits(payment.amount, currency)
        : undefined,
    currency: currency || undefined,
  };
}

const paytabsBase = (c: Credentials) =>
  base(
    "paytabs",
    PAYTABS_REGIONS[(c.region ?? "").trim().toUpperCase()] ??
      PAYTABS_REGIONS.GLOBAL,
  );

export const paytabs: PaymentGateway = {
  id: "paytabs",

  testMode: () => false,
  async start(c, input) {
    need(c, "profileId", "serverKey");
    const page = await call<{ tran_ref: string; redirect_url?: string }>(
      `${paytabsBase(c)}/payment/request`,
      json(
        { authorization: c.serverKey },
        {
          profile_id: Number(c.profileId),
          tran_type: "sale",
          tran_class: "ecom",
          cart_id: input.attemptId,
          cart_currency: input.currency.toUpperCase(),
          cart_amount: Number(
            formatGatewayAmount(input.amount, input.currency),
          ),
          cart_description: input.orderNumber,
          paypage_lang: input.locale,
          hide_shipping: true,
          customer_details: {
            name: input.customer.name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
          callback: input.webhookUrl,
          return: input.returnUrl,
        },
      ),
    );
    if (!page.redirect_url)
      throw new GatewayError("PayTabs did not return a payment page");
    return { sessionId: page.tran_ref, redirectUrl: page.redirect_url };
  },
  async status(c, sessionId, params) {
    return paytabsResult(
      await call<Record<string, unknown>>(
        `${paytabsBase(c)}/payment/query`,
        json(
          { authorization: c.serverKey },
          {
            profile_id: Number(c.profileId),
            tran_ref: sessionId || params.tranRef,
          },
        ),
      ),
    );
  },
  async webhook(c, request) {
    need(c, "serverKey");
    const given = request.headers.get("signature") ?? "";
    if (!given || !safeEqual(given, hmacHex(c.serverKey, request.rawBody)))
      throw new WebhookSignatureError(
        "PayTabs callback signature does not match",
      );
    const body = parse(request.rawBody);
    if (str(body.tran_type).toLowerCase() !== "sale") return null;
    return {
      ...paytabsResult(body),
      eventId: `${str(body.tran_ref)}:${str(obj(body.payment_result).response_status)}`,
      sessionId: str(body.tran_ref),
      attemptId: str(body.cart_id) || undefined,
    };
  },
  async refund(c, input) {
    const refund = await call<Record<string, unknown>>(
      `${paytabsBase(c)}/payment/request`,
      json(
        { authorization: c.serverKey },
        {
          profile_id: Number(c.profileId),
          tran_type: "refund",
          tran_class: "ecom",
          tran_ref: input.paymentId,
          cart_id: `${input.attemptId}-r${Date.now()}`,
          cart_currency: input.currency.toUpperCase(),
          cart_amount: Number(
            formatGatewayAmount(input.amount, input.currency),
          ),
          cart_description: input.reason.slice(0, 100) || "Refund",
        },
      ),
    );
    if (str(obj(refund.payment_result).response_status) !== "A")
      throw new GatewayError(
        str(obj(refund.payment_result).response_message) ||
          "PayTabs refused the refund",
      );
    return { refundId: str(refund.tran_ref) };
  },
  async check(c) {
    need(c, "region", "profileId", "serverKey");
    if (!PAYTABS_REGIONS[c.region.trim().toUpperCase()])
      return {
        ok: false,
        error: formatMessage(serverTemplates.paymentRegionInvalid, {
          0: Object.keys(PAYTABS_REGIONS).join(", "),
        }),
      };
    const result = await call<Record<string, unknown>>(
      `${paytabsBase(c)}/payment/query`,
      json(
        { authorization: c.serverKey },
        { profile_id: Number(c.profileId), tran_ref: "TST0000000000000" },
      ),
    );
    if (result.code != null || !result.tran_ref)
      return {
        ok: false,
        error: message(result) ?? serverMessages.providerInvalidResponse,
      };
    return { ok: true, accountName: c.region.trim().toUpperCase() };
  },
};

function paytabsResult(body: Record<string, unknown>): GatewayPayment {
  const status = str(obj(body.payment_result).response_status);
  return {
    state:
      status === "A"
        ? "paid"
        : status === "H" || status === "P"
          ? "pending"
          : "failed",
    paymentId: str(body.tran_ref) || undefined,
    amount: Number(body.tran_total ?? body.cart_amount) || undefined,
    currency: str(body.tran_currency ?? body.cart_currency) || undefined,
  };
}

const moyasarAuth = (c: Credentials) => ({
  Authorization: `Basic ${Buffer.from(`${c.secretKey}:`).toString("base64")}`,
});

export const moyasar: PaymentGateway = {
  id: "moyasar",
  testMode: (c) => (c.secretKey ?? "").startsWith("sk_test_"),
  async start(c, input) {
    need(c, "secretKey");
    const invoice = await call<{ id: string; url?: string }>(
      `${base("moyasar", "https://api.moyasar.com")}/v1/invoices`,
      json(moyasarAuth(c), {
        amount: toMinorUnits(input.amount, input.currency),
        currency: input.currency.toUpperCase(),
        description: input.orderNumber,
        success_url: input.returnUrl,
        back_url: input.cancelUrl,
        metadata: { attempt: input.attemptId },
      }),
    );
    if (!invoice.url)
      throw new GatewayError("Moyasar did not return a payment page");
    return { sessionId: invoice.id, redirectUrl: invoice.url };
  },
  async status(c, sessionId) {
    const invoice = await call<{
      status?: string;
      amount?: number;
      currency?: string;
      payments?: { id: string; status: string }[];
    }>(
      `${base("moyasar", "https://api.moyasar.com")}/v1/invoices/${encodeURIComponent(sessionId)}`,
      { headers: moyasarAuth(c) },
    );
    const paid = invoice.payments?.find((p) => p.status === "paid");
    const currency = str(invoice.currency);
    return {
      state:
        invoice.status === "paid"
          ? "paid"
          : invoice.status === "expired" || invoice.status === "canceled"
            ? "failed"
            : "pending",
      paymentId: paid?.id,
      amount:
        currency && typeof invoice.amount === "number"
          ? fromMinorUnits(invoice.amount, currency)
          : undefined,
      currency: currency || undefined,
    };
  },
  async webhook(c, request) {
    need(c, "webhookSecret");
    const event = parse(request.rawBody);
    if (!safeEqual(str(event.secret_token), c.webhookSecret))
      throw new WebhookSignatureError("Moyasar webhook token does not match");
    const type = str(event.type);
    const payment = obj(event.data);
    const state: GatewayPaymentState | null =
      type === "payment_paid"
        ? "paid"
        : type === "payment_failed" || type === "payment_voided"
          ? "failed"
          : null;
    if (!state) return null;
    const currency = str(payment.currency);
    return {
      state,
      paymentId: str(payment.id),
      amount:
        currency && typeof payment.amount === "number"
          ? fromMinorUnits(payment.amount, currency)
          : undefined,
      currency: currency || undefined,
      eventId: str(event.id),
      sessionId: str(payment.invoice_id) || undefined,
      attemptId: str(obj(payment.metadata).attempt) || undefined,
    };
  },
  async refund(c, input) {
    const refunded = await call<{ id: string }>(
      `${base("moyasar", "https://api.moyasar.com")}/v1/payments/${encodeURIComponent(input.paymentId)}/refund`,
      json(moyasarAuth(c), {
        amount: toMinorUnits(input.amount, input.currency),
      }),
    );
    return { refundId: refunded.id };
  },
  async check(c) {
    need(c, "secretKey", "webhookSecret");
    await call(
      `${base("moyasar", "https://api.moyasar.com")}/v1/payments?per=1`,
      { headers: moyasarAuth(c) },
    );
    return {
      ok: true,
      accountName: moyasar.testMode(c) ? "Test mode" : "Live",
    };
  },
};

const hyperpayBase = (c: Credentials) =>
  base(
    "hyperpay",
    live(c) ? "https://eu-prod.oppwa.com" : "https://eu-test.oppwa.com",
  );
const HYPERPAY_PAID = /^(000\.000\.|000\.100\.1|000\.[36])/;
const HYPERPAY_PENDING = /^(000\.200|800\.400\.5|100\.400\.500)/;
const hyperpayResult = (code: string): GatewayPaymentState =>
  HYPERPAY_PAID.test(code)
    ? "paid"
    : HYPERPAY_PENDING.test(code)
      ? "pending"
      : "failed";

const hyperpayAmount = (amount: number) => {
  const value = amount.toFixed(2);
  if (
    amount <= 0 ||
    !/^[0-9]{1,10}\.[0-9]{2}$/.test(value) ||
    Number(value) !== amount
  )
    throw new GatewayError(serverMessages.paymentAmountPrecisionInvalid);
  return value;
};

export const hyperpay: PaymentGateway = {
  id: "hyperpay",
  testMode: (c) => !live(c),
  async start(c, input) {
    need(c, "entityId", "accessToken", "brands");
    const { first, last } = nameParts(input.customer.name);
    const checkout = await call<{ id: string; integrity?: string }>(
      `${hyperpayBase(c)}/v1/checkouts`,
      form(
        { Authorization: `Bearer ${c.accessToken}` },
        {
          entityId: c.entityId,
          amount: hyperpayAmount(input.amount),
          currency: input.currency.toUpperCase(),
          paymentType: "DB",
          merchantTransactionId: input.attemptId,
          "customer.email": input.customer.email,
          "customer.givenName": first,
          "customer.surname": last,
          "customParameters[attempt]": input.attemptId,
          ...(hyperpay.testMode(c) ? { testMode: "EXTERNAL" } : {}),
        },
      ),
    );
    return {
      sessionId: checkout.id,
      widget: {
        scriptUrl: `${hyperpayBase(c)}/v1/paymentWidgets.js?checkoutId=${encodeURIComponent(checkout.id)}`,
        integrity: checkout.integrity,
        brands: c.brands
          .trim()
          .toUpperCase()
          .replace(/[^A-Z_ ]/g, ""),
      },
    };
  },
  async status(c, sessionId) {
    type HyperPayment = {
      id?: string;
      amount?: string;
      currency?: string;
      result?: { code?: string };
    };
    const payment = await call<HyperPayment>(
      `${hyperpayBase(c)}/v1/checkouts/${encodeURIComponent(sessionId)}/payment?entityId=${encodeURIComponent(c.entityId)}`,
      { headers: { Authorization: `Bearer ${c.accessToken}` } },
    );
    if (!payment?.result?.code)
      throw new GatewayError(serverMessages.providerInvalidResponse);
    return {
      state: hyperpayResult(payment.result.code),
      paymentId: payment.id,
      amount: Number(payment.amount) || undefined,
      currency: payment.currency,
    };
  },
  async webhook(c, request) {
    need(c, "webhookKey");
    const iv = request.headers.get("x-initialization-vector") ?? "";
    const tag = request.headers.get("x-authentication-tag") ?? "";
    let text: string;
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        Buffer.from(c.webhookKey, "hex"),
        Buffer.from(iv, "hex"),
      );
      decipher.setAuthTag(Buffer.from(tag, "hex"));
      text =
        decipher.update(request.rawBody.trim(), "hex", "utf8") +
        decipher.final("utf8");
    } catch {
      throw new WebhookSignatureError(
        "HyperPay webhook could not be decrypted",
      );
    }
    const event = parse(text);
    if (str(event.type) !== "PAYMENT") return null;
    const payload = obj(event.payload);
    const code = str(obj(payload.result).code);
    if (str(payload.paymentType) === "RF") return null;
    return {
      state: hyperpayResult(code),
      paymentId: str(payload.id),
      amount: Number(payload.amount) || undefined,
      currency: str(payload.currency) || undefined,
      eventId: `${str(payload.id)}:${code}`,
      sessionId: str(payload.ndc) || undefined,
      attemptId:
        str(payload.merchantTransactionId) ||
        str(obj(payload.customParameters).attempt) ||
        undefined,
    };
  },
  async refund(c, input) {
    const refund = await call<{
      id: string;
      result?: { code?: string; description?: string };
    }>(
      `${hyperpayBase(c)}/v1/payments/${encodeURIComponent(input.paymentId)}`,
      form(
        { Authorization: `Bearer ${c.accessToken}` },
        {
          entityId: c.entityId,
          amount: hyperpayAmount(input.amount),
          currency: input.currency.toUpperCase(),
          paymentType: "RF",
        },
      ),
    );
    if (hyperpayResult(refund.result?.code ?? "") !== "paid")
      throw new GatewayError(
        refund.result?.description ?? "HyperPay refused the refund",
      );
    return { refundId: refund.id };
  },
  async check(c) {
    need(c, "environment", "entityId", "accessToken", "brands", "webhookKey");
    if (!/^[0-9a-fA-F]{64}$/.test(c.webhookKey.trim()))
      return { ok: false, error: serverMessages.paymentWebhookKeyInvalid };
    const result = await call<{
      result?: { code?: string; description?: string };
    }>(
      `${hyperpayBase(c)}/v1/query?entityId=${encodeURIComponent(c.entityId)}&merchantTransactionId=connection-check`,
      { headers: { Authorization: `Bearer ${c.accessToken}` } },
    );
    if (!result.result?.code || !/^000\.000\./.test(result.result.code))
      return {
        ok: false,
        error:
          result.result?.description ?? serverMessages.providerInvalidResponse,
      };
    return { ok: true, accountName: live(c) ? "Live" : "Test" };
  },
};

const GATEWAYS: Record<PaymentGatewayId, PaymentGateway> = {
  stripe,
  tap,
  paypal,
  checkout_com: checkoutCom,
  paytabs,
  moyasar,
  hyperpay,
};
export const paymentGateway = (id: PaymentGatewayId) => GATEWAYS[id];
