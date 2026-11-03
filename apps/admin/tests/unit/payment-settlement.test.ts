import { getTranslations } from "../../locales";
import { PAYMENT_ATTEMPT_STATUSES } from "../../lib/database/constants/payments";
import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  attempt: vi.fn(),
  update: vi.fn(),
  used: vi.fn(),
  order: vi.fn(),
  events: vi.fn(),
  receipt: vi.fn(),
  notify: vi.fn(),
  status: vi.fn(),
  active: vi.fn(),
  count: vi.fn(),
  currency: vi.fn(),
}));
vi.mock("../../lib/database/db", () => ({
  db: {
    $queryRaw: mocks.currency,
    paymentAttempt: {
      findUnique: mocks.attempt,
      update: mocks.update,
      updateMany: mocks.update,
      findFirst: mocks.used,
      count: mocks.count,
      create: vi.fn(),
    },
    salesOrder: { findUnique: mocks.order, findUniqueOrThrow: mocks.order },
    paymentWebhookEvent: { createMany: mocks.events },
  },
  runAtomicMutation: (operation: () => Promise<unknown>) => operation(),
}));
vi.mock("../../lib/database/queries/store", () => ({
  recordOrderPayment: mocks.receipt,
  recordOrderRefund: vi.fn(),
  moveOrder: vi.fn(),
}));
vi.mock("../../lib/database/queries/notify", () => ({
  notifyUsersWithPermission: mocks.notify,
}));
vi.mock("../../lib/database/payments/active", () => ({
  activePaymentGateway: mocks.active,
  gatewayWithCredentials: async () => ({
    credentials: {},
    gateway: { status: mocks.status },
  }),
}));
import {
  confirmReturn,
  settleAttempt,
  startOrderPayment,
} from "../../lib/database/queries/online-payments";

const order = {
  id: "order",
  number: "SO-test",
  locale: "en",
  currency: "BHD",
  total: 12.5,
  amountPaid: 0,
  status: "placed",
};
const attempt = {
  id: "attempt",
  gateway: "stripe",
  sessionId: "stored-session",
  orderId: order.id,
  amount: 12.5,
  currency: "BHD",
  status: "pending",
  paymentId: null,
  order,
};
const capture = {
  state: "paid" as const,
  paymentId: "provider-capture",
  amount: 12.5,
  currency: "BHD",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.count.mockResolvedValue(0);
  mocks.currency.mockResolvedValue([{ defaultCurrency: "BHD" }]);
  mocks.attempt.mockResolvedValue(attempt);
  mocks.order.mockResolvedValue(order);
  mocks.used.mockResolvedValue(null);
  mocks.events.mockResolvedValue({ count: 1 });
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.receipt.mockResolvedValue("receipt");
});

test.each([
  { ...capture, amount: undefined },
  { ...capture, currency: undefined },
  { ...capture, currency: "USD" },
  { ...capture, amount: 0 },
  { ...capture, amount: -1 },
  { ...capture, amount: NaN },
  { ...capture, amount: 12 },
  { ...capture, amount: 13 },
  { ...capture, amount: 12.5004 },
  { ...capture, paymentId: undefined },
])(
  "unverified or mismatched capture never substitutes the requested money (%j)",
  async (payment) => {
    expect((await settleAttempt(attempt.id, payment))?.state).toBe("review");
    expect(mocks.receipt).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "review" }),
      }),
    );
  },
);
test("an already used capture cannot pay another attempt", async () => {
  mocks.used.mockResolvedValue({ id: "other-attempt" });
  expect((await settleAttempt(attempt.id, capture))?.state).toBe("review");
  expect(mocks.receipt).not.toHaveBeenCalled();
});
test("verified capture links the exact receipt returned by the atomic payment writer", async () => {
  expect((await settleAttempt(attempt.id, capture))?.state).toBe("paid");
  expect(mocks.receipt).toHaveBeenCalledWith(
    order.id,
    { amount: 12.5, method: "online", reference: "stripe provider-capture" },
    null,
  );
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        paymentId: "receipt",
        failureReason: null,
      }),
    }),
  );
});
test("ledger failures propagate so the receipt transaction and webhook deduplication can roll back", async () => {
  mocks.receipt.mockRejectedValue(new Error("ledger unavailable"));
  await expect(settleAttempt(attempt.id, capture, "event")).rejects.toThrow(
    "ledger unavailable",
  );
  expect(mocks.update).not.toHaveBeenCalled();
});
test("another payment or a closed order goes to review without clamping the captured amount", async () => {
  for (const changed of [
    { ...order, amountPaid: 5 },
    { ...order, status: "cancelled" },
  ]) {
    mocks.order.mockResolvedValue(changed);
    expect((await settleAttempt(attempt.id, capture))?.state).toBe("review");
  }
  expect(mocks.receipt).not.toHaveBeenCalled();
});
test("a browser cancellation parameter cannot turn a gateway-pending payment into failed", async () => {
  mocks.status.mockResolvedValue({ state: "pending" });
  expect((await confirmReturn(attempt.id, { cancelled: "1" }))?.state).toBe(
    "pending",
  );
  expect(mocks.update).not.toHaveBeenCalledWith(
    expect.objectContaining({ data: { status: "failed" } }),
  );
});

test.each([
  ["JPY", 12.5],
  ["USD", 12.345],
])(
  "%s checkout rejects unsupported precision before creating a remote charge",
  async (currency, amount) => {
    mocks.active.mockResolvedValue({
      id: "stripe",
      credentials: {},
      gateway: {},
    });
    mocks.order.mockResolvedValue({ ...order, currency, total: amount });
    mocks.currency.mockResolvedValue([{ defaultCurrency: currency }]);
    await expect(
      startOrderPayment(order.id, {
        url: "https://shop.example.test",
        locale: "en",
      }),
    ).rejects.toThrow(/currency supports/);
  },
);
test("every payment attempt state, including review, is named in both languages", () => {
  for (const locale of ["en", "ar"] as const)
    for (const status of PAYMENT_ATTEMPT_STATUSES)
      expect(
        getTranslations(locale).admin.orders.detail.attemptStatuses[status],
      ).toBeTruthy();
});
