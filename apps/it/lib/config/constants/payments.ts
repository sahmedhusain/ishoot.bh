
import { getCurrencyDecimals } from "@platform/config/currency";

export const PAYMENT_GATEWAY_IDS = [
  "stripe",
  "tap",
  "paypal",
  "checkout_com",
  "paytabs",
  "moyasar",
  "hyperpay",
] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number];
export const isPaymentGateway = (id: string): id is PaymentGatewayId =>
  (PAYMENT_GATEWAY_IDS as readonly string[]).includes(id);

export const PAYMENT_ATTEMPT_STATUSES = [
  "created",
  "pending",
  "paid",
  "failed",
  "expired",
  "review",
] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const ONLINE_PAYMENT_TIMEOUT_MINUTES = 60;

export const fromMinorUnits = (minor: number, currency: string) =>
  minor / 10 ** getCurrencyDecimals(currency);

export const formatGatewayAmount = (amount: number, currency: string) =>
  amount.toFixed(getCurrencyDecimals(currency));
