import { assertCompanyCurrency } from "../finance/company-currency";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { db, runAtomicMutation } from "../db";
import { getCurrencyDecimals } from "@platform/config/currency";
import {
  ONLINE_PAYMENT_TIMEOUT_MINUTES,
  PAYMENT_GATEWAY_IDS,
  isPaymentGateway,
  type PaymentGatewayId,
} from "../constants/payments";
import {
  activePaymentGateway,
  gatewayWithCredentials,
} from "../payments/active";
import {
  GatewayError,
  WebhookSignatureError,
  type GatewayPayment,
  type StartedPayment,
} from "../payments/gateways";
import { moveOrder, recordOrderPayment, recordOrderRefund } from "./store";
import { notifyUsersWithPermission } from "./notify";
export {
  orderFromPaymentLink,
  paymentLinkToken,
} from "../services/payment-links";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const OPEN = ["created", "pending"];

export { GatewayError, WebhookSignatureError };

/** Payment gateways switched on in Integrations, for choosing the one behind "Pay online". */
export async function availablePaymentGateways() {
  const found = await Promise.all(
    PAYMENT_GATEWAY_IDS.map((id) => gatewayWithCredentials(id)),
  );
  return found
    .filter((g) => g !== null)
    .map((g) => ({ id: g.id, test_mode: g.testMode }));
}

/** Is "Pay online" available at checkout now? */
export async function onlinePaymentAvailable() {
  return !!(await activePaymentGateway());
}

/**
 * Starts paying what is still owed on an order with the store's gateway: records the attempt, asks the gateway for its
 * hosted page and returns where to send the customer (or the widget our page hosts).
 */
export async function startOrderPayment(
  orderId: string,
  site: { url: string; locale: string },
): Promise<StartedPayment & { attemptId: string; testMode: boolean }> {
  const active = await activePaymentGateway();
  if (!active) throw new Error(serverMessages.storePaymentMethodInvalid);
  const order = await db.salesOrder.findUnique({ where: { id: orderId } });
  if (!order || ["cancelled", "returned"].includes(order.status))
    throw new Error(serverMessages.orderStatusInvalid);
  if (
    await db.paymentAttempt.count({
      where: {
        orderId,
        OR: [{ status: "review" }, { status: "paid", paymentId: null }],
      },
    })
  )
    throw new Error(serverMessages.paymentNeedsReview);
  const owed = round3(num(order.total) - num(order.amountPaid));
  if (owed <= 0) throw new Error(serverMessages.orderAlreadyPaid);
  await assertCompanyCurrency(order.currency);
  if (Number(owed.toFixed(getCurrencyDecimals(order.currency))) !== owed)
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  const attempt = await db.paymentAttempt.create({
    data: {
      orderId,
      gateway: active.id,
      amount: owed,
      currency: order.currency,
      testMode: active.testMode,
    },
  });
  const back = `${site.url}/api/store/payment/return?attempt=${attempt.id}`;
  try {
    const started = await active.gateway.start(active.credentials, {
      attemptId: attempt.id,
      orderNumber: order.number,
      amount: owed,
      currency: order.currency,
      customer: {
        name: order.name,
        email: order.email ?? "",
        phone: order.phone ?? "",
      },
      locale: site.locale === "ar" ? "ar" : "en",
      returnUrl: back,
      cancelUrl: `${back}&cancelled=1`,
      webhookUrl: `${site.url}/api/store/payment/webhook/${active.id}`,
    });
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { sessionId: started.sessionId, status: "pending" },
    });
    return { ...started, attemptId: attempt.id, testMode: active.testMode };
  } catch (error) {
    const reason = serverMessages.paymentGatewayUnavailable;
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed", failureReason: reason },
    });
    console.error(`Payment gateway ${active.id} refused to start a payment`);
    throw new Error(serverMessages.paymentGatewayUnavailable);
  }
}

/** The attempt behind a hosted widget page (HyperPay): only while it is still open. */
export async function openPaymentAttempt(attemptId: string) {
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      order: {
        select: { number: true, total: true, currency: true, locale: true },
      },
    },
  });
  if (!attempt || !OPEN.includes(attempt.status)) return null;
  return {
    id: attempt.id,
    gateway: attempt.gateway,
    sessionId: attempt.sessionId,
    amount: num(attempt.amount),
    currency: attempt.currency,
    order_number: attempt.order.number,
    locale: attempt.order.locale,
  };
}

/**
 * Applies what the gateway says about an attempt. Moving an attempt to paid is a guarded change, so the webhook and
 * the customer's return can both arrive and the money is recorded once.
 */
export async function settleAttempt(
  attemptId: string,
  payment: GatewayPayment,
  providerEventId?: string,
) {
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "PaymentAttempt" WHERE id = ${attemptId} FOR UPDATE`;
    const attempt = await db.paymentAttempt.findUnique({
      where: { id: attemptId },
      include: { order: true },
    });
    if (!attempt) return null;
    if (providerEventId) {
      const event = await db.paymentWebhookEvent.createMany({
        data: [
          {
            gateway: attempt.gateway,
            eventId: providerEventId.slice(0, 200),
            attemptId,
          },
        ],
        skipDuplicates: true,
      });
      if (!event.count)
        return {
          state:
            attempt.status === "paid" && attempt.paymentId
              ? ("paid" as const)
              : attempt.status === "review"
                ? ("review" as const)
                : ("pending" as const),
          order: attempt.order,
          duplicate: true,
        };
    }
    if (attempt.status === "paid" && attempt.paymentId)
      return { state: "paid" as const, order: attempt.order };
    if (payment.state !== "paid") {
      if (attempt.status === "review" || attempt.status === "paid")
        return { state: "review" as const, order: attempt.order };
      await db.paymentAttempt.updateMany({
        where: { id: attemptId, status: { in: OPEN } },
        data: { status: payment.state },
      });
      return { state: payment.state, order: attempt.order };
    }
    const reference = payment.paymentId?.trim();
    const paymentId =
      reference && reference.length <= 200 ? reference : undefined;
    if (paymentId)
      await db.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`${attempt.gateway}:${paymentId}`}, 0))`;
    const used = paymentId
      ? await db.paymentAttempt.findFirst({
          where: {
            id: { not: attemptId },
            gateway: attempt.gateway,
            gatewayPaymentId: paymentId,
          },
          select: { id: true },
        })
      : null;
    await db.$queryRaw`SELECT id FROM "SalesOrder" WHERE id = ${attempt.orderId} FOR UPDATE`;
    const order = await db.salesOrder.findUniqueOrThrow({
      where: { id: attempt.orderId },
    });
    const amount = payment.amount;
    const currency = payment.currency?.toUpperCase();
    const verified =
      !!paymentId &&
      !used &&
      typeof amount === "number" &&
      Number.isFinite(amount) &&
      amount > 0 &&
      !!currency &&
      /^[A-Z]{3}$/.test(currency) &&
      currency === attempt.currency.toUpperCase() &&
      Number(amount.toFixed(getCurrencyDecimals(currency))) === amount &&
      amount === num(attempt.amount);
    if (
      !verified ||
      ["cancelled", "returned"].includes(order.status) ||
      num(order.amountPaid) + (amount ?? 0) > num(order.total) + 0.0005
    ) {
      const reason = used
        ? serverMessages.paymentReferenceAlreadyUsed
        : serverMessages.paymentNeedsReview;
      await db.paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: "review",
          paidAt: attempt.paidAt ?? new Date(),
          failureReason: reason,
          ...(!used && paymentId ? { gatewayPaymentId: paymentId } : {}),
        },
      });
      if (attempt.status !== "review" || attempt.failureReason !== reason) {
        const alert =
          getTranslations("en").admin.orders.notifications.paidNeedsAttention;
        const params = { number: order.number };
        await notifyUsersWithPermission("orders", "edit", {
          title: formatMessage(alert.title, params),
          message: formatMessage(alert.message, params),
          message_key: "orders.notifications.paidNeedsAttention",
          message_params: params,
          type: "warning",
          entity_type: "sales_order",
          entity_id: order.id,
        });
      }
      return { state: "review" as const, order };
    }
    const receiptId = await recordOrderPayment(
      attempt.orderId,
      {
        amount: amount!,
        method: "online",
        reference: `${attempt.gateway} ${paymentId}`,
      },
      null,
    );
    await db.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: "paid",
        paidAt: attempt.paidAt ?? new Date(),
        gatewayPaymentId: paymentId!,
        paymentId: receiptId,
        failureReason: null,
      },
    });
    return { state: "paid" as const, order };
  });
}

/** The customer is back from the gateway: ask the gateway (never the browser) how it went. */
export async function confirmReturn(
  attemptId: string,
  params: Record<string, string>,
) {
  const attempt = await db.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: { order: true },
  });
  if (!attempt) return null;
  if (attempt.status === "paid" && attempt.paymentId)
    return { state: "paid" as const, order: attempt.order };
  if (!attempt.sessionId || !isPaymentGateway(attempt.gateway))
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : OPEN.includes(attempt.status)
            ? ("pending" as const)
            : ("failed" as const),
      order: attempt.order,
      unavailable: true,
    };
  const active = await gatewayWithCredentials(attempt.gateway);
  if (!active)
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : ("pending" as const),
      order: attempt.order,
      unavailable: true,
    };
  try {
    const payment = await active.gateway.status(
      active.credentials,
      attempt.sessionId,
      params,
    );
    return settleAttempt(attemptId, payment);
  } catch (error) {
    console.error(`Payment gateway ${attempt.gateway} status check failed`);
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : ("pending" as const),
      order: attempt.order,
      unavailable: true,
    };
  }
}

/** A gateway's webhook: verified, handled once, applied to its attempt. Throws WebhookSignatureError when forged. */
export async function handlePaymentWebhook(
  gatewayId: string,
  request: { headers: Headers; rawBody: string },
) {
  if (!isPaymentGateway(gatewayId))
    throw new WebhookSignatureError("Unknown gateway");
  const active = await gatewayWithCredentials(gatewayId);
  if (!active) throw new WebhookSignatureError("Gateway is not set up");
  const event = await active.gateway.webhook(active.credentials, request);
  if (!event || !event.eventId) return { handled: false };
  const attempt = event.attemptId
    ? await db.paymentAttempt.findFirst({
        where: { id: event.attemptId, gateway: gatewayId },
      })
    : event.sessionId
      ? await db.paymentAttempt.findUnique({
          where: {
            gateway_sessionId: {
              gateway: gatewayId,
              sessionId: event.sessionId,
            },
          },
        })
      : null;
  if (!attempt || attempt.gateway !== gatewayId) return { handled: false };
  let payment: GatewayPayment = event;
  // PayPal approval precedes capture; resolve the external operation before opening the receipt transaction.
  if (gatewayId === "paypal" && event.state === "pending" && attempt.sessionId)
    payment = await active.gateway.status(
      active.credentials,
      attempt.sessionId,
      {},
    );
  const result = await settleAttempt(attempt.id, payment, event.eventId);
  return {
    handled: true,
    ...(result && "duplicate" in result && result.duplicate
      ? { duplicate: true }
      : {}),
  };
}

/**
 * Refunds an order. Money paid online goes back through the gateway that took it (newest payment first); otherwise
 * the refund is recorded as given back by hand.
 */
export async function refundOrder(
  orderId: string,
  amountInput: number,
  reason: string,
  byId: string | null,
) {
  const amount = round3(amountInput);
  const attempts = await db.paymentAttempt.findMany({
    where: {
      orderId,
      status: "paid",
      paymentId: { not: null },
      gatewayPaymentId: { not: null },
    },
    orderBy: { paidAt: "desc" },
  });
  if (!attempts.length) return recordOrderRefund(orderId, amount, reason, byId);
  const refundable = round3(
    attempts.reduce((sum, a) => sum + num(a.amount) - num(a.amountRefunded), 0),
  );
  if (!Number.isFinite(amount) || amount <= 0 || amount > refundable + 0.0005)
    throw new Error(serverMessages.orderRefundTooLarge);
  let left = amount;
  for (const attempt of attempts) {
    const part = round3(
      Math.min(left, num(attempt.amount) - num(attempt.amountRefunded)),
    );
    if (part <= 0 || !isPaymentGateway(attempt.gateway)) continue;
    const active = await gatewayWithCredentials(attempt.gateway);
    if (!active) throw new Error(serverMessages.paymentGatewayUnavailable);
    try {
      await active.gateway.refund(active.credentials, {
        paymentId: attempt.gatewayPaymentId!,
        amount: part,
        currency: attempt.currency,
        reason,
        attemptId: attempt.id,
      });
    } catch (error) {
      console.error(`Payment gateway ${attempt.gateway} refused a refund`);
      throw new Error(serverMessages.paymentRefundFailed);
    }
    await db.paymentAttempt.update({
      where: { id: attempt.id },
      data: { amountRefunded: { increment: part } },
    });
    await recordOrderRefund(orderId, part, reason, byId);
    left = round3(left - part);
    if (left <= 0) break;
  }
}

/** The order's online payment attempts, newest first, for the order page. */
export async function orderPaymentAttempts(orderId: string) {
  const rows = await db.paymentAttempt.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((a) => ({
    id: a.id,
    gateway: a.gateway,
    status: a.status === "paid" && !a.paymentId ? "review" : a.status,
    amount: num(a.amount),
    amount_refunded: num(a.amountRefunded),
    currency: a.currency,
    test_mode: a.testMode,
    reference: a.gatewayPaymentId ?? a.sessionId ?? "",
    created_at: a.createdAt.toISOString(),
    failure: a.failureReason ?? "",
  }));
}

/**
 * Online payments nobody finished: asks the gateway once more (a lost webhook), then expires the attempt. An online
 * order with nothing paid and no attempt left open is cancelled, which gives its stock back.
 */
export async function expireOnlinePayments(now = new Date()) {
  const cutoff = new Date(
    now.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000,
  );
  const stale = await db.paymentAttempt.findMany({
    where: { status: { in: OPEN }, createdAt: { lt: cutoff } },
    take: 200,
  });
  let expired = 0;
  let cancelled = 0;
  for (const attempt of stale) {
    let state: GatewayPayment["state"] | "unknown" = attempt.sessionId
      ? "unknown"
      : "failed";
    if (attempt.sessionId && isPaymentGateway(attempt.gateway)) {
      const active = await gatewayWithCredentials(
        attempt.gateway as PaymentGatewayId,
      );
      if (active)
        state = await active.gateway
          .status(active.credentials, attempt.sessionId, {})
          .then((p) => {
            if (p.state === "paid")
              return settleAttempt(attempt.id, p).then(() => "paid" as const);
            return p.state;
          })
          .catch(() => "unknown" as const);
    }
    if (state === "paid" || state === "unknown") continue;
    // A payment still in progress at the gateway gets one more timeout before giving up.
    if (
      state === "pending" &&
      attempt.createdAt >
        new Date(cutoff.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000)
    )
      continue;
    const changed = await db.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { in: OPEN } },
      data: { status: "expired" },
    });
    expired += changed.count;
    const order = await db.salesOrder.findUnique({
      where: { id: attempt.orderId },
      include: {
        paymentAttempts: {
          where: { status: { in: OPEN } },
          select: { id: true },
        },
      },
    });
    if (
      order &&
      order.paymentMethod === "online" &&
      order.status === "placed" &&
      num(order.amountPaid) === 0 &&
      order.paymentAttempts.length === 0
    ) {
      await moveOrder(
        order.id,
        "cancelled",
        null,
        getTranslations(order.locale === "en" ? "en" : "ar").admin.orders
          .paymentTimedOut,
      );
      cancelled += 1;
    }
  }
  return { expired, cancelled };
}

// ─── Payment links ───────────────────────────────────────────────────────────────────────────────────────────────

/** What a payment link page shows: the order and what is still owed. */
export async function paymentLinkOrder(orderId: string) {
  const order = await db.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      paymentAttempts: {
        where: {
          OR: [{ status: "review" }, { status: "paid", paymentId: null }],
        },
        select: { id: true },
      },
    },
  });
  if (!order) return null;
  return {
    id: order.id,
    number: order.number,
    name: order.name,
    currency: order.currency,
    total: num(order.total),
    owed: round3(num(order.total) - num(order.amountPaid)),
    closed: ["cancelled", "returned"].includes(order.status),
    payment_review: order.paymentAttempts.length > 0,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: num(l.quantity),
      line_total: num(l.lineTotal),
    })),
  };
}
