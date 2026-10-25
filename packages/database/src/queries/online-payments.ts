import { Prisma } from "@prisma/client";
import { formatMessage, getTranslations, serverMessages } from "@platform/locales";
import { db } from "../db";
import { ONLINE_PAYMENT_TIMEOUT_MINUTES, PAYMENT_GATEWAY_IDS, isPaymentGateway, type PaymentGatewayId } from "../constants/payments";
import { activePaymentGateway, gatewayWithCredentials } from "../payments/active";
import { GatewayError, WebhookSignatureError, type GatewayPayment, type StartedPayment } from "../payments/gateways";
import { moveOrder, recordOrderPayment, recordOrderRefund } from "./store";
import { notifyUsersWithPermission } from "./notify";
export { orderFromPaymentLink, paymentLinkToken } from "../services/payment-links";

const num = (value: { toString(): string } | null | undefined) => (value == null ? 0 : Number(value.toString()));
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const OPEN = ["created", "pending"];

export { GatewayError, WebhookSignatureError };

/** Payment gateways switched on in Integrations, for choosing the one behind "Pay online". */
export async function availablePaymentGateways() {
  const found = await Promise.all(PAYMENT_GATEWAY_IDS.map((id) => gatewayWithCredentials(id)));
  return found.filter((g) => g !== null).map((g) => ({ id: g.id, test_mode: g.testMode }));
}

/** Is "Pay online" available at checkout now? */
export async function onlinePaymentAvailable() {
  return !!(await activePaymentGateway());
}

/**
 * Starts paying what is still owed on an order with the store's gateway: records the attempt, asks the gateway for its
 * hosted page and returns where to send the customer (or the widget our page hosts).
 */
export async function startOrderPayment(orderId: string, site: { url: string; locale: "en" | "ar" }): Promise<StartedPayment & { attemptId: string; testMode: boolean }> {
  const active = await activePaymentGateway();
  if (!active) throw new Error(serverMessages.storePaymentMethodInvalid);
  const order = await db.salesOrder.findUnique({ where: { id: orderId } });
  if (!order || ["cancelled", "returned"].includes(order.status)) throw new Error(serverMessages.orderStatusInvalid);
  const owed = round3(num(order.total) - num(order.amountPaid));
  if (owed <= 0) throw new Error(serverMessages.orderAlreadyPaid);
  const attempt = await db.paymentAttempt.create({ data: { orderId, gateway: active.id, amount: owed, currency: order.currency, testMode: active.testMode } });
  const back = `${site.url}/api/store/payment/return?attempt=${attempt.id}`;
  try {
    const started = await active.gateway.start(active.credentials, {
      attemptId: attempt.id,
      orderNumber: order.number,
      amount: owed,
      currency: order.currency,
      customer: { name: order.name, email: order.email ?? "", phone: order.phone ?? "" },
      locale: site.locale,
      returnUrl: back,
      cancelUrl: `${back}&cancelled=1`,
      webhookUrl: `${site.url}/api/store/payment/webhook/${active.id}`,
    });
    await db.paymentAttempt.update({ where: { id: attempt.id }, data: { sessionId: started.sessionId, status: "pending" } });
    return { ...started, attemptId: attempt.id, testMode: active.testMode };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 300) : "error";
    await db.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "failed", failureReason: reason } });
    console.error(`Payment gateway ${active.id} refused to start a payment: ${reason}`);
    throw new Error(serverMessages.paymentGatewayUnavailable);
  }
}

/** The attempt behind a hosted widget page (HyperPay): only while it is still open. */
export async function openPaymentAttempt(attemptId: string) {
  const attempt = await db.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: { select: { number: true, total: true, currency: true, locale: true } } } });
  if (!attempt || !OPEN.includes(attempt.status)) return null;
  return { id: attempt.id, gateway: attempt.gateway, sessionId: attempt.sessionId, amount: num(attempt.amount), currency: attempt.currency, order_number: attempt.order.number, locale: attempt.order.locale };
}

/**
 * Applies what the gateway says about an attempt. Moving an attempt to paid is a guarded change, so the webhook and
 * the customer's return can both arrive and the money is recorded once.
 */
export async function settleAttempt(attemptId: string, payment: GatewayPayment) {
  const attempt = await db.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true } });
  if (!attempt) return null;
  if (payment.state === "pending") {
    await db.paymentAttempt.updateMany({ where: { id: attemptId, status: "created" }, data: { status: "pending" } });
    return { state: "pending" as const, order: attempt.order };
  }
  if (payment.state === "failed") {
    await db.paymentAttempt.updateMany({ where: { id: attemptId, status: { in: OPEN } }, data: { status: "failed" } });
    return { state: "failed" as const, order: attempt.order };
  }
  // Paid: claim the attempt first (an expired attempt that was paid after all is claimed too).
  const claimed = await db.paymentAttempt.updateMany({ where: { id: attemptId, status: { not: "paid" } }, data: { status: "paid", paidAt: new Date(), gatewayPaymentId: payment.paymentId ?? null } });
  if (claimed.count === 0) return { state: "paid" as const, order: attempt.order };
  const sameCurrency = !payment.currency || payment.currency.toUpperCase() === attempt.currency.toUpperCase();
  const paid = round3(Math.min(sameCurrency && payment.amount ? payment.amount : num(attempt.amount), num(attempt.order.total) - num(attempt.order.amountPaid)));
  try {
    if (paid <= 0) throw new Error(serverMessages.orderAlreadyPaid);
    await recordOrderPayment(attempt.orderId, { amount: paid, method: "online", reference: `${attempt.gateway} ${payment.paymentId ?? attempt.sessionId ?? ""}`.trim() }, null);
    const invoiceId = (await db.salesOrder.findUnique({ where: { id: attempt.orderId }, select: { invoiceId: true } }))?.invoiceId;
    const receipt = invoiceId ? await db.payment.findFirst({ where: { invoiceId, paymentMethod: "online" }, orderBy: { createdAt: "desc" }, select: { id: true } }) : null;
    await db.paymentAttempt.update({ where: { id: attemptId }, data: { paymentId: receipt?.id ?? null, ...(sameCurrency ? {} : { failureReason: `currency ${payment.currency}` }) } });
  } catch (error) {
    // Money arrived for an order that can no longer take it (cancelled after timing out, or already paid): keep the
    // attempt paid so it can be refunded, and tell the people who handle orders.
    const reason = error instanceof Error ? error.message : "error";
    await db.paymentAttempt.update({ where: { id: attemptId }, data: { failureReason: reason.slice(0, 300) } });
    const alert = getTranslations("en").admin.orders.notifications.paidNeedsAttention;
    const params = { number: attempt.order.number };
    await notifyUsersWithPermission("orders", "edit", { title: formatMessage(alert.title, params), message: formatMessage(alert.message, params), message_key: "orders.notifications.paidNeedsAttention", message_params: params, type: "warning", entity_type: "sales_order", entity_id: attempt.orderId }).catch(() => undefined);
  }
  return { state: "paid" as const, order: attempt.order };
}

/** The customer is back from the gateway: ask the gateway (never the browser) how it went. */
export async function confirmReturn(attemptId: string, params: Record<string, string>) {
  const attempt = await db.paymentAttempt.findUnique({ where: { id: attemptId }, include: { order: true } });
  if (!attempt) return null;
  if (attempt.status === "paid" || !attempt.sessionId || !isPaymentGateway(attempt.gateway)) return { state: attempt.status === "paid" ? ("paid" as const) : ("failed" as const), order: attempt.order };
  const active = await gatewayWithCredentials(attempt.gateway);
  if (!active) return { state: "pending" as const, order: attempt.order };
  try {
    const payment = await active.gateway.status(active.credentials, attempt.sessionId, params);
    // Leaving the gateway's page without paying ends this attempt; the order can be paid again.
    if (payment.state === "pending" && params.cancelled === "1") return settleAttempt(attemptId, { state: "failed" });
    return settleAttempt(attemptId, payment);
  } catch (error) {
    console.error(`Payment gateway ${attempt.gateway} status check failed: ${error instanceof Error ? error.message : "error"}`);
    return { state: "pending" as const, order: attempt.order };
  }
}

/** A gateway's webhook: verified, handled once, applied to its attempt. Throws WebhookSignatureError when forged. */
export async function handlePaymentWebhook(gatewayId: string, request: { headers: Headers; rawBody: string }) {
  if (!isPaymentGateway(gatewayId)) throw new WebhookSignatureError("Unknown gateway");
  const active = await gatewayWithCredentials(gatewayId);
  if (!active) throw new WebhookSignatureError("Gateway is not set up");
  const event = await active.gateway.webhook(active.credentials, request);
  if (!event || !event.eventId) return { handled: false };
  const attempt = event.attemptId
    ? await db.paymentAttempt.findFirst({ where: { id: event.attemptId, gateway: gatewayId } })
    : event.sessionId
      ? await db.paymentAttempt.findUnique({ where: { gateway_sessionId: { gateway: gatewayId, sessionId: event.sessionId } } })
      : null;
  if (!attempt) return { handled: false };
  try {
    await db.paymentWebhookEvent.create({ data: { gateway: gatewayId, eventId: event.eventId.slice(0, 200), attemptId: attempt.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { handled: true, duplicate: true };
    throw error;
  }
  let payment: GatewayPayment = event;
  // PayPal reports approval first; the payment exists once captured, which reading the order does.
  if (gatewayId === "paypal" && event.state === "pending" && attempt.sessionId) payment = await active.gateway.status(active.credentials, attempt.sessionId, {});
  await settleAttempt(attempt.id, payment);
  return { handled: true };
}

/**
 * Refunds an order. Money paid online goes back through the gateway that took it (newest payment first); otherwise
 * the refund is recorded as given back by hand.
 */
export async function refundOrder(orderId: string, amountInput: number, reason: string, byId: string | null) {
  const amount = round3(amountInput);
  const attempts = await db.paymentAttempt.findMany({ where: { orderId, status: "paid", gatewayPaymentId: { not: null } }, orderBy: { paidAt: "desc" } });
  if (!attempts.length) return recordOrderRefund(orderId, amount, reason, byId);
  const refundable = round3(attempts.reduce((sum, a) => sum + num(a.amount) - num(a.amountRefunded), 0));
  if (!Number.isFinite(amount) || amount <= 0 || amount > refundable + 0.0005) throw new Error(serverMessages.orderRefundTooLarge);
  let left = amount;
  for (const attempt of attempts) {
    const part = round3(Math.min(left, num(attempt.amount) - num(attempt.amountRefunded)));
    if (part <= 0 || !isPaymentGateway(attempt.gateway)) continue;
    const active = await gatewayWithCredentials(attempt.gateway);
    if (!active) throw new Error(serverMessages.paymentGatewayUnavailable);
    try {
      await active.gateway.refund(active.credentials, { paymentId: attempt.gatewayPaymentId!, amount: part, currency: attempt.currency, reason, attemptId: attempt.id });
    } catch (error) {
      console.error(`Payment gateway ${attempt.gateway} refused a refund: ${error instanceof Error ? error.message : "error"}`);
      throw new Error(serverMessages.paymentRefundFailed);
    }
    await db.paymentAttempt.update({ where: { id: attempt.id }, data: { amountRefunded: { increment: part } } });
    await recordOrderRefund(orderId, part, reason, byId);
    left = round3(left - part);
    if (left <= 0) break;
  }
}

/** The order's online payment attempts, newest first, for the order page. */
export async function orderPaymentAttempts(orderId: string) {
  const rows = await db.paymentAttempt.findMany({ where: { orderId }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map((a) => ({ id: a.id, gateway: a.gateway, status: a.status, amount: num(a.amount), amount_refunded: num(a.amountRefunded), currency: a.currency, test_mode: a.testMode, reference: a.gatewayPaymentId ?? a.sessionId ?? "", created_at: a.createdAt.toISOString(), failure: a.failureReason ?? "" }));
}

/**
 * Online payments nobody finished: asks the gateway once more (a lost webhook), then expires the attempt. An online
 * order with nothing paid and no attempt left open is cancelled, which gives its stock back.
 */
export async function expireOnlinePayments(now = new Date()) {
  const cutoff = new Date(now.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000);
  const stale = await db.paymentAttempt.findMany({ where: { status: { in: OPEN }, createdAt: { lt: cutoff } }, take: 200 });
  let expired = 0;
  let cancelled = 0;
  for (const attempt of stale) {
    let state: GatewayPayment["state"] = "failed";
    if (attempt.sessionId && isPaymentGateway(attempt.gateway)) {
      const active = await gatewayWithCredentials(attempt.gateway as PaymentGatewayId);
      if (active) state = await active.gateway.status(active.credentials, attempt.sessionId, {}).then((p) => {
        if (p.state === "paid") return settleAttempt(attempt.id, p).then(() => "paid" as const);
        return p.state;
      }).catch(() => "pending" as const);
    }
    if (state === "paid") continue;
    // A payment still in progress at the gateway gets one more timeout before giving up.
    if (state === "pending" && attempt.createdAt > new Date(cutoff.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000)) continue;
    const changed = await db.paymentAttempt.updateMany({ where: { id: attempt.id, status: { in: OPEN } }, data: { status: "expired" } });
    expired += changed.count;
    const order = await db.salesOrder.findUnique({ where: { id: attempt.orderId }, include: { paymentAttempts: { where: { status: { in: OPEN } }, select: { id: true } } } });
    if (order && order.paymentMethod === "online" && order.status === "placed" && num(order.amountPaid) === 0 && order.paymentAttempts.length === 0) {
      await moveOrder(order.id, "cancelled", null, getTranslations(order.locale === "en" ? "en" : "ar").admin.orders.paymentTimedOut);
      cancelled += 1;
    }
  }
  return { expired, cancelled };
}

// ─── Payment links ───────────────────────────────────────────────────────────────────────────────────────────────

/** What a payment link page shows: the order and what is still owed. */
export async function paymentLinkOrder(orderId: string) {
  const order = await db.salesOrder.findUnique({ where: { id: orderId }, include: { lines: { orderBy: { sortOrder: "asc" } } } });
  if (!order) return null;
  return {
    id: order.id,
    number: order.number,
    name: order.name,
    currency: order.currency,
    total: num(order.total),
    owed: round3(num(order.total) - num(order.amountPaid)),
    closed: ["cancelled", "returned"].includes(order.status),
    lines: order.lines.map((l) => ({ description: l.description, quantity: num(l.quantity), line_total: num(l.lineTotal) })),
  };
}
