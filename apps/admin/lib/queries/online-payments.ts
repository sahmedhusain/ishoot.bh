import { assertCompanyCurrency } from "../finance/company-currency";
import {
  formatMessage,
  getTranslations,
  serverMessages,
} from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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
  const [orders, attempts] = await Promise.all([
    listTableRows<any>("commerce", "sales_order"),
    listTableRows<any>("finance", "payment_attempt"),
  ]);
  const order = orders.find((o) => o.id === orderId);
  if (!order || ["cancelled", "returned"].includes(order.status))
    throw new Error(serverMessages.orderStatusInvalid);
  if (
    attempts.some(
      (a) =>
        a.orderId === orderId &&
        (a.status === "review" || (a.status === "paid" && !a.paymentId)),
    )
  )
    throw new Error(serverMessages.paymentNeedsReview);
  const owed = round3(num(order.total) - num(order.amountPaid));
  if (owed <= 0) throw new Error(serverMessages.orderAlreadyPaid);
  await assertCompanyCurrency(order.currency);
  if (Number(owed.toFixed(getCurrencyDecimals(order.currency))) !== owed)
    throw new Error(serverMessages.paymentCurrencyPrecisionInvalid);
  const attempt = await upsertTableRow<any>("finance", "payment_attempt", {
    id: crypto.randomUUID(),
    orderId,
    gateway: active.id,
    amount: owed,
    currency: order.currency,
    testMode: active.testMode,
    status: "pending",
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
    await upsertTableRow("finance", "payment_attempt", {
      ...attempt,
      sessionId: started.sessionId,
      status: "pending",
    });
    return { ...started, attemptId: attempt.id, testMode: active.testMode };
  } catch (error) {
    const reason = serverMessages.paymentGatewayUnavailable;
    await upsertTableRow("finance", "payment_attempt", {
      ...attempt,
      status: "failed",
      failureReason: reason,
    });
    console.error(`Payment gateway ${active.id} refused to start a payment`);
    throw new Error(serverMessages.paymentGatewayUnavailable);
  }
}

export async function openPaymentAttempt(attemptId: string) {
  const [attempts, orders] = await Promise.all([
    listTableRows<any>("finance", "payment_attempt"),
    listTableRows<any>("commerce", "sales_order"),
  ]);
  const raw = attempts.find((a) => a.id === attemptId);
  const attempt = raw
    ? { ...raw, order: orders.find((o) => o.id === raw.orderId) ?? null }
    : null;
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

export async function settleAttempt(
  attemptId: string,
  payment: GatewayPayment,
  providerEventId?: string,
) {
  return runAtomicMutation(async () => {
    const [attempts, orders, webhookEvents] = await Promise.all([
      listTableRows<any>("finance", "payment_attempt"),
      listTableRows<any>("commerce", "sales_order"),
      listTableRows<any>("finance", "payment_webhook_event"),
    ]);
    const rawAttempt = attempts.find((a) => a.id === attemptId);
    if (!rawAttempt) return null;
    const order = orders.find((o) => o.id === rawAttempt.orderId);
    if (!order) throw new Error(serverMessages.orderStatusInvalid);
    const attempt = { ...rawAttempt, order };
    if (providerEventId) {
      const eventId = providerEventId.slice(0, 200);
      const exists = webhookEvents.some(
        (e) => e.gateway === attempt.gateway && e.eventId === eventId,
      );
      if (exists)
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
      await upsertTableRow("finance", "payment_webhook_event", {
        id: crypto.randomUUID(),
        gateway: attempt.gateway,
        eventId,
        attemptId,
      });
    }
    if (attempt.status === "paid" && attempt.paymentId)
      return { state: "paid" as const, order: attempt.order };
    if (payment.state !== "paid") {
      if (attempt.status === "review" || attempt.status === "paid")
        return { state: "review" as const, order: attempt.order };
      if (OPEN.includes(attempt.status)) {
        await upsertTableRow("finance", "payment_attempt", {
          ...rawAttempt,
          status: payment.state,
        });
      }
      return { state: payment.state, order: attempt.order };
    }
    const reference = payment.paymentId?.trim();
    const paymentId =
      reference && reference.length <= 200 ? reference : undefined;
    const used = paymentId
      ? attempts.find(
          (a) =>
            a.id !== attemptId &&
            a.gateway === attempt.gateway &&
            a.gatewayPaymentId === paymentId,
        ) ?? null
      : null;
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
      await upsertTableRow("finance", "payment_attempt", {
        ...rawAttempt,
        status: "review",
        paidAt: rawAttempt.paidAt ?? new Date().toISOString(),
        failureReason: reason,
        ...(!used && paymentId ? { gatewayPaymentId: paymentId } : {}),
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
    await upsertTableRow("finance", "payment_attempt", {
      ...rawAttempt,
      status: "paid",
      paidAt: rawAttempt.paidAt ?? new Date().toISOString(),
      gatewayPaymentId: paymentId!,
      paymentId: receiptId,
      failureReason: null,
    });
    return { state: "paid" as const, order };
  });
}

export async function confirmReturn(
  attemptId: string,
  params: Record<string, string>,
) {
  const [attempts, orders] = await Promise.all([
    listTableRows<any>("finance", "payment_attempt"),
    listTableRows<any>("commerce", "sales_order"),
  ]);
  const raw = attempts.find((a) => a.id === attemptId);
  const attempt = raw
    ? { ...raw, order: orders.find((o) => o.id === raw.orderId) ?? null }
    : null;
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
  const allAttempts = await listTableRows<any>("finance", "payment_attempt");
  const attempt = event.attemptId
    ? allAttempts.find((a) => a.id === event.attemptId && a.gateway === gatewayId) ?? null
    : event.sessionId
      ? allAttempts.find((a) => a.gateway === gatewayId && a.sessionId === event.sessionId) ?? null
      : null;
  if (!attempt || attempt.gateway !== gatewayId) return { handled: false };
  let payment: GatewayPayment = event;
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

export async function refundOrder(
  orderId: string,
  amountInput: number,
  reason: string,
  byId: string | null,
  toWallet = false,
) {
  const amount = round3(amountInput);
  if (toWallet) return recordOrderRefund(orderId, amount, reason, byId, true);
  const allAttempts = await listTableRows<any>("finance", "payment_attempt");
  const attempts = allAttempts
    .filter(
      (a) =>
        a.orderId === orderId &&
        a.status === "paid" &&
        a.paymentId != null &&
        a.gatewayPaymentId != null,
    )
    .sort((a, b) => String(b.paidAt ?? "").localeCompare(String(a.paidAt ?? "")));
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
    await upsertTableRow("finance", "payment_attempt", {
      ...attempt,
      amountRefunded: round3(num(attempt.amountRefunded) + part),
    });
    await recordOrderRefund(orderId, part, reason, byId);
    left = round3(left - part);
    if (left <= 0) break;
  }
}

export async function orderPaymentAttempts(orderId: string) {
  const allRows = await listTableRows<any>("finance", "payment_attempt");
  const rows = allRows
    .filter((a) => a.orderId === orderId)
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )
    .slice(0, 20);
  return rows.map((a) => ({
    id: a.id,
    gateway: a.gateway,
    status: a.status === "paid" && !a.paymentId ? "review" : a.status,
    amount: num(a.amount),
    amount_refunded: num(a.amountRefunded),
    currency: a.currency,
    test_mode: a.testMode,
    reference: a.gatewayPaymentId ?? a.sessionId ?? "",
    created_at: String(a.createdAt ?? new Date().toISOString()),
    failure: a.failureReason ?? "",
  }));
}

export async function expireOnlinePayments(now = new Date()) {
  const cutoff = new Date(
    now.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000,
  );
  const [allAttempts, allOrders] = await Promise.all([
    listTableRows<any>("finance", "payment_attempt"),
    listTableRows<any>("commerce", "sales_order"),
  ]);
  const stale = allAttempts
    .filter(
      (a) =>
        OPEN.includes(a.status) &&
        a.createdAt &&
        new Date(a.createdAt) < cutoff,
    )
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
    if (
      state === "pending" &&
      new Date(attempt.createdAt) >
        new Date(cutoff.getTime() - ONLINE_PAYMENT_TIMEOUT_MINUTES * 60_000)
    )
      continue;
    if (OPEN.includes(attempt.status)) {
      await upsertTableRow("finance", "payment_attempt", {
        ...attempt,
        status: "expired",
      });
      attempt.status = "expired";
      expired += 1;
    }
    const order = allOrders.find((o) => o.id === attempt.orderId);
    const openForOrder = allAttempts.filter(
      (a) => a.orderId === attempt.orderId && OPEN.includes(a.status),
    );
    if (
      order &&
      order.paymentMethod === "online" &&
      order.status === "placed" &&
      num(order.amountPaid) === 0 &&
      openForOrder.length === 0
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

export async function paymentLinkOrder(orderId: string) {
  const [orders, allLines, allAttempts] = await Promise.all([
    listTableRows<any>("commerce", "sales_order"),
    listTableRows<any>("commerce", "sales_order_line"),
    listTableRows<any>("finance", "payment_attempt"),
  ]);
  const rawOrder = orders.find((o) => o.id === orderId);
  if (!rawOrder) return null;
  const order = {
    ...rawOrder,
    lines: allLines
      .filter((l) => l.orderId === orderId)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    paymentAttempts: allAttempts.filter(
      (a) =>
        a.orderId === orderId &&
        (a.status === "review" || (a.status === "paid" && !a.paymentId)),
    ),
  };
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
