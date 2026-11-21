import { randomUUID } from "node:crypto";
import { getCurrencyDecimals } from "@platform/config/currency";
import { serverMessages } from "@platform/locales";
import {
  ONLINE_PAYMENT_TIMEOUT_MINUTES,
  PAYMENT_GATEWAY_IDS,
  isPaymentGateway,
  type PaymentGatewayId,
} from "../constants/payments";
import { assertCompanyCurrency } from "../finance/company-currency";
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
import { notifyUsersWithPermission } from "./notify";
import {
  getOrder,
  moveOrder,
  recordOrderPayment,
  recordOrderRefund,
} from "./store";
export {
  orderFromPaymentLink,
  paymentLinkToken,
} from "../services/payment-links";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const OPEN = ["created", "pending"];

type OrderSnapshot = {
  id: string;
  number: string;
  locale: string;
  status: string;
  total: number;
  amountPaid: number;
  amountRefunded: number;
  currency: string;
  paymentMethod: string;
  name: string;
  email: string;
  phone: string;
};

type PaymentAttemptRecord = {
  id: string;
  orderId: string;
  gateway: string;
  status: string;
  sessionId: string | null;
  gatewayPaymentId: string | null;
  paymentId: string | null;
  amount: number;
  amountRefunded: number;
  currency: string;
  testMode: boolean;
  failureReason: string | null;
  createdAt: Date;
  paidAt: Date | null;
  order: OrderSnapshot;
};

const onlinePaymentStore = ((globalThis as unknown as Record<string, unknown>).__platformOnlinePaymentStore ??= {
  attemptsMap: new Map<string, PaymentAttemptRecord>(),
  webhookEvents: new Set<string>(),
}) as {
  attemptsMap: Map<string, PaymentAttemptRecord>;
  webhookEvents: Set<string>;
};
const { attemptsMap, webhookEvents } = onlinePaymentStore;

function toOrderSnapshot(o: NonNullable<Awaited<ReturnType<typeof getOrder>>>): OrderSnapshot {
  return {
    id: o.id,
    number: o.number,
    locale: o.locale || "en",
    status: o.status,
    total: num(o.total),
    amountPaid: num(o.amount_paid),
    amountRefunded: num(o.amount_refunded),
    currency: o.currency,
    paymentMethod: o.payment_method,
    name: o.name,
    email: o.email ?? "",
    phone: o.phone ?? "",
  };
}

export { GatewayError, WebhookSignatureError };

export async function availablePaymentGateways() {
  const found = await Promise.all(
    PAYMENT_GATEWAY_IDS.map((id) => gatewayWithCredentials(id)),
  );
  return found
    .filter((g) => g !== null)
    .map((g) => ({ id: g.id, test_mode: g.testMode }));
}

export async function onlinePaymentAvailable() {
  return !!(await activePaymentGateway());
}

export async function startOrderPayment(
  orderId: string,
  site: { url: string; locale: string },
): Promise<StartedPayment & { attemptId: string; testMode: boolean }> {
  const active = await activePaymentGateway();
  if (!active) throw new Error(serverMessages.storePaymentMethodInvalid);
  const rawOrder = await getOrder(orderId);
  if (!rawOrder || ["cancelled", "returned"].includes(rawOrder.status)) {
    throw new Error(serverMessages.orderStatusInvalid);
  }
  const order = toOrderSnapshot(rawOrder);
  const needsReview = Array.from(attemptsMap.values()).some(
    (a) =>
      a.orderId === orderId &&
      (a.status === "review" || (a.status === "paid" && !a.paymentId)),
  );
  if (needsReview) {
    throw new Error(serverMessages.paymentNeedsReview);
  }

  const owed = round3(order.total - order.amountPaid);
  if (owed <= 0) throw new Error(serverMessages.orderAlreadyPaid);
  await assertCompanyCurrency(order.currency);
  if (Number(owed.toFixed(getCurrencyDecimals(order.currency))) !== owed) {
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  }

  const attempt: PaymentAttemptRecord = {
    id: randomUUID(),
    orderId,
    gateway: active.id,
    status: "created",
    sessionId: null,
    gatewayPaymentId: null,
    paymentId: null,
    amount: owed,
    amountRefunded: 0,
    currency: order.currency,
    testMode: active.testMode,
    failureReason: null,
    createdAt: new Date(),
    paidAt: null,
    order,
  };
  attemptsMap.set(attempt.id, attempt);

  const back = `${site.url}/api/store/payment/return?attempt=${attempt.id}`;
  try {
    const started = await active.gateway.start(active.credentials, {
      attemptId: attempt.id,
      orderNumber: order.number,
      amount: owed,
      currency: order.currency,
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
      },
      locale: site.locale === "ar" ? "ar" : "en",
      returnUrl: back,
      cancelUrl: `${back}&cancelled=1`,
      webhookUrl: `${site.url}/api/store/payment/webhook/${active.id}`,
    });
    attempt.sessionId = started.sessionId;
    attempt.status = "pending";
    return { ...started, attemptId: attempt.id, testMode: active.testMode };
  } catch {
    attempt.status = "failed";
    attempt.failureReason = serverMessages.paymentGatewayUnavailable;
    console.error(`Payment gateway ${active.id} refused to start a payment`);
    throw new Error(serverMessages.paymentGatewayUnavailable);
  }
}

export async function openPaymentAttempt(attemptId: string) {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt || !OPEN.includes(attempt.status)) return null;
  const freshOrder = await getOrder(attempt.orderId).catch(() => null);
  const order = freshOrder ? toOrderSnapshot(freshOrder) : attempt.order;
  return {
    id: attempt.id,
    gateway: attempt.gateway,
    sessionId: attempt.sessionId,
    amount: num(attempt.amount),
    currency: attempt.currency,
    order_number: order.number,
    locale: order.locale,
  };
}

export async function settleAttempt(
  attemptId: string,
  payment: GatewayPayment,
  providerEventId?: string,
) {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt) return null;
  const freshOrder = await getOrder(attempt.orderId).catch(() => null);
  const order = freshOrder ? toOrderSnapshot(freshOrder) : attempt.order;
  attempt.order = order;

  if (providerEventId) {
    const eventKey = `${attempt.gateway}:${providerEventId.slice(0, 200)}`;
    if (webhookEvents.has(eventKey)) {
      return {
        state:
          attempt.status === "paid" && attempt.paymentId
            ? ("paid" as const)
            : attempt.status === "review"
              ? ("review" as const)
              : ("pending" as const),
        order,
        duplicate: true,
      };
    }
    webhookEvents.add(eventKey);
  }

  if (attempt.status === "paid" && attempt.paymentId) {
    return { state: "paid" as const, order };
  }
  if (payment.state !== "paid") {
    if (attempt.status === "review" || attempt.status === "paid") {
      return { state: "review" as const, order };
    }
    if (OPEN.includes(attempt.status)) {
      attempt.status = payment.state;
    }
    return { state: payment.state, order };
  }

  const reference = payment.paymentId?.trim();
  const paymentId =
    reference && reference.length <= 200 ? reference : undefined;
  const used = paymentId
    ? Array.from(attemptsMap.values()).find(
        (a) =>
          a.id !== attemptId &&
          a.gateway === attempt.gateway &&
          a.gatewayPaymentId === paymentId,
      )
    : undefined;

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
    order.amountPaid + (amount ?? 0) > order.total + 0.0005
  ) {
    const reason = used
      ? serverMessages.paymentReferenceAlreadyUsed
      : serverMessages.paymentNeedsReview;
    const changed = attempt.status !== "review" || attempt.failureReason !== reason;
    attempt.status = "review";
    attempt.paidAt = attempt.paidAt ?? new Date();
    attempt.failureReason = reason;
    if (!used && paymentId) attempt.gatewayPaymentId = paymentId;

    if (changed) {
      const alert = {
        title: "Payment for order {number} needs review",
        message: "Payment received for order {number} requires administrative review",
      };
      await notifyUsersWithPermission("orders", "edit", {
        title: alert.title.replace("{number}", order.number),
        message: alert.message.replace("{number}", order.number),
        message_key: "orders.notifications.paidNeedsAttention",
        message_params: { number: order.number },
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
  attempt.status = "paid";
  attempt.paidAt = attempt.paidAt ?? new Date();
  attempt.gatewayPaymentId = paymentId!;
  attempt.paymentId = receiptId;
  attempt.failureReason = null;
  order.amountPaid = round3(order.amountPaid + amount!);
  return { state: "paid" as const, order };
}

export async function confirmReturn(
  attemptId: string,
  params: Record<string, string>,
) {
  const attempt = attemptsMap.get(attemptId);
  if (!attempt) return null;
  const freshOrder = await getOrder(attempt.orderId).catch(() => null);
  const order = freshOrder ? toOrderSnapshot(freshOrder) : attempt.order;

  if (attempt.status === "paid" && attempt.paymentId) {
    return { state: "paid" as const, order };
  }
  if (!attempt.sessionId || !isPaymentGateway(attempt.gateway)) {
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : OPEN.includes(attempt.status)
            ? ("pending" as const)
            : ("failed" as const),
      order,
      unavailable: true,
    };
  }
  const active = await gatewayWithCredentials(attempt.gateway);
  if (!active) {
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : ("pending" as const),
      order,
      unavailable: true,
    };
  }
  try {
    const payment = await active.gateway.status(
      active.credentials,
      attempt.sessionId,
      params,
    );
    return settleAttempt(attemptId, payment);
  } catch {
    console.error(`Payment gateway ${attempt.gateway} status check failed`);
    return {
      state:
        attempt.status === "review" || attempt.status === "paid"
          ? ("review" as const)
          : ("pending" as const),
      order,
      unavailable: true,
    };
  }
}

export async function handlePaymentWebhook(
  gatewayId: string,
  request: { headers: Headers; rawBody: string },
) {
  if (!isPaymentGateway(gatewayId)) {
    throw new WebhookSignatureError("Unknown gateway");
  }
  const active = await gatewayWithCredentials(gatewayId);
  if (!active) throw new WebhookSignatureError("Gateway is not set up");
  const event = await active.gateway.webhook(active.credentials, request);
  if (!event || !event.eventId) return { handled: false };

  const attempt = event.attemptId
    ? attemptsMap.get(event.attemptId)
    : event.sessionId
      ? Array.from(attemptsMap.values()).find(
          (a) => a.gateway === gatewayId && a.sessionId === event.sessionId,
        )
      : undefined;
  if (!attempt || attempt.gateway !== gatewayId) return { handled: false };

  let payment: GatewayPayment = event;
  if (gatewayId === "paypal" && event.state === "pending" && attempt.sessionId) {
    payment = await active.gateway.status(
      active.credentials,
      attempt.sessionId,
      {},
    );
  }
  const result = await settleAttempt(attempt.id, payment, event.eventId);
  return {
    handled: true,
    ...(result && "duplicate" in result && result.duplicate
      ? { duplicate: true }
      : {}),
  };
}

export async function refundOrder(
  orderId: string,
  amountInput: number,
  reason: string,
  byId: string | null,
) {
  const amount = round3(amountInput);
  const attempts = Array.from(attemptsMap.values())
    .filter(
      (a) =>
        a.orderId === orderId &&
        a.status === "paid" &&
        !!a.paymentId &&
        !!a.gatewayPaymentId,
    )
    .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));

  if (!attempts.length) return recordOrderRefund(orderId, amount, reason, byId);
  const refundable = round3(
    attempts.reduce((sum, a) => sum + num(a.amount) - num(a.amountRefunded), 0),
  );
  if (!Number.isFinite(amount) || amount <= 0 || amount > refundable + 0.0005) {
    throw new Error(serverMessages.orderRefundTooLarge);
  }
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
    } catch {
      console.error(`Payment gateway ${attempt.gateway} refused a refund`);
      throw new Error(serverMessages.paymentRefundFailed);
    }
    attempt.amountRefunded = round3(attempt.amountRefunded + part);
    await recordOrderRefund(orderId, part, reason, byId);
    left = round3(left - part);
    if (left <= 0) break;
  }
}

export async function orderPaymentAttempts(orderId: string) {
  return Array.from(attemptsMap.values())
    .filter((a) => a.orderId === orderId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20)
    .map((a) => ({
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

export async function expireOnlinePayments(now = new Date()) {
  const cutoff = new Date(
    now.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000,
  );
  const stale = Array.from(attemptsMap.values())
    .filter((a) => OPEN.includes(a.status) && a.createdAt < cutoff)
    .slice(0, 200);

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
      if (active) {
        state = await active.gateway
          .status(active.credentials, attempt.sessionId, {})
          .then((p) => {
            if (p.state === "paid") {
              return settleAttempt(attempt.id, p).then(() => "paid" as const);
            }
            return p.state;
          })
          .catch(() => "unknown" as const);
      }
    }
    if (state === "paid" || state === "unknown") continue;
    if (
      state === "pending" &&
      attempt.createdAt >
        new Date(cutoff.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000)
    ) {
      continue;
    }
    if (OPEN.includes(attempt.status)) {
      attempt.status = "expired";
      expired += 1;
    }
    const order = await getOrder(attempt.orderId).catch(() => null);
    const openCount = Array.from(attemptsMap.values()).filter(
      (a) => a.orderId === attempt.orderId && OPEN.includes(a.status),
    ).length;
    if (
      order &&
      order.payment_method === "online" &&
      order.status === "placed" &&
      num(order.amount_paid) === 0 &&
      openCount === 0
    ) {
      await moveOrder(
        order.id,
        "cancelled",
        null,
        order.locale === "ar"
          ? "انتهت مهلة الدفع عبر الإنترنت"
          : "Online payment timed out",
      );
      cancelled += 1;
    }
  }
  return { expired, cancelled };
}

export async function paymentLinkOrder(orderId: string) {
  const order = await getOrder(orderId);
  if (!order) return null;
  const paymentReview = Array.from(attemptsMap.values()).some(
    (a) =>
      a.orderId === orderId &&
      (a.status === "review" || (a.status === "paid" && !a.paymentId)),
  );
  return {
    id: order.id,
    number: order.number,
    name: order.name,
    currency: order.currency,
    total: num(order.total),
    owed: round3(num(order.total) - num(order.amount_paid)),
    closed: ["cancelled", "returned"].includes(order.status),
    payment_review: paymentReview,
    lines: order.lines.map((l) => ({
      description: l.description,
      quantity: num(l.quantity),
      line_total: num(l.line_total),
    })),
  };
}
