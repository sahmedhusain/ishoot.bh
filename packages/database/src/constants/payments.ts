// Online payments: the gateways, attempt states and gateway amounts. Runtime-free.
import { getCurrencyDecimals } from "@platform/config/currency";

export const PAYMENT_GATEWAY_IDS = ["stripe", "tap", "paypal", "checkout_com", "paytabs", "moyasar", "hyperpay"] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number];
export const isPaymentGateway = (id: string): id is PaymentGatewayId => (PAYMENT_GATEWAY_IDS as readonly string[]).includes(id);

/** created → pending (customer at the gateway) → paid | failed | expired; review holds unverified captured payments. */
export const PAYMENT_ATTEMPT_STATUSES = ["created", "pending", "paid", "failed", "expired", "review"] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

/** An unpaid online order gives its stock back after this long. */
export const ONLINE_PAYMENT_TIMEOUT_MINUTES = 60;

/** An amount from the currency's smallest unit (fils, halalas, cents) back to major units. */
export const fromMinorUnits = (minor: number, currency: string) => minor / 10 ** getCurrencyDecimals(currency);

/** An amount written with exactly the currency's decimals, as most gateways want it ("12.500"). */
export const formatGatewayAmount = (amount: number, currency: string) => amount.toFixed(getCurrencyDecimals(currency));
