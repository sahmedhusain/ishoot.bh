import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attempts: vi.fn(),
  expire: vi.fn(),
  order: vi.fn(),
  gateway: vi.fn(),
  status: vi.fn(),
  move: vi.fn(),
}));
vi.mock("../../lib/atomic", () => ({
  db: {
    paymentAttempt: { findMany: mocks.attempts, updateMany: mocks.expire },
    salesOrder: { findUnique: mocks.order },
  },
}));
vi.mock("../../lib/db", () => ({
  db: {
    paymentAttempt: { findMany: mocks.attempts, updateMany: mocks.expire },
    salesOrder: { findUnique: mocks.order },
  },
}));
vi.mock("../../lib/payments/active", () => ({
  activePaymentGateway: vi.fn(),
  gatewayWithCredentials: mocks.gateway,
}));
vi.mock("../../lib/queries/store", () => ({
  moveOrder: mocks.move,
  recordOrderPayment: vi.fn(),
  recordOrderRefund: vi.fn(),
}));
vi.mock("../../lib/queries/notify", () => ({
  notifyUsersWithPermission: vi.fn(),
}));
import { expireOnlinePayments } from "../../lib/queries/online-payments";

const now = new Date("2026-10-26T12:00:00Z");
beforeEach(() => {
  vi.resetAllMocks();
  mocks.attempts.mockResolvedValue([
    {
      id: "attempt",
      orderId: "order",
      gateway: "hyperpay",
      sessionId: "session",
      createdAt: new Date("2026-10-25T00:00:00Z"),
    },
  ]);
  mocks.gateway.mockResolvedValue({
    credentials: {},
    gateway: { status: mocks.status },
  });
  mocks.expire.mockResolvedValue({ count: 1 });
  mocks.order.mockResolvedValue({
    id: "order",
    paymentMethod: "online",
    status: "placed",
    amountPaid: 0,
    paymentAttempts: [],
    locale: "en",
  });
});

test("a provider outage never expires or cancels an unverified remote payment, even after both timeouts", async () => {
  mocks.status.mockRejectedValue(new Error("Provider unavailable"));
  expect(await expireOnlinePayments(now)).toEqual({ expired: 0, cancelled: 0 });
  expect(mocks.expire).not.toHaveBeenCalled();
  expect(mocks.move).not.toHaveBeenCalled();
});

test("disconnecting a gateway leaves unresolved remote attempts for reconciliation", async () => {
  mocks.gateway.mockResolvedValue(null);
  expect(await expireOnlinePayments(now)).toEqual({ expired: 0, cancelled: 0 });
  expect(mocks.expire).not.toHaveBeenCalled();
});

test("a verified failed payment can expire and release its unpaid order", async () => {
  mocks.status.mockResolvedValue({ state: "failed" });
  expect(await expireOnlinePayments(now)).toEqual({ expired: 1, cancelled: 1 });
  expect(mocks.move).toHaveBeenCalledWith(
    "order",
    "cancelled",
    null,
    expect.any(String),
  );
});
