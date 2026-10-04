import { db } from "../db";
import { BankSettlement, PaymentAllocation } from "../types";

/**
 * Standard CBB/market baseline rates if provider is offline or on weekends.
 * BHD is pegged to USD at 1 USD = 0.376 BHD (approx 2.65957 USD/BHD).
 */
/** Currencies with a baseline BHD rate; quotations can be issued in these. */
export const QUOTABLE_CURRENCIES = ["BHD", "USD", "SAR", "AED", "KWD", "OMR", "QAR", "EUR", "GBP"] as const;

const DEFAULT_RATES: Record<string, number> = {
  "BHD:USD": 2.65957,
  "USD:BHD": 0.37600,
  "BHD:SAR": 9.97340,
  "SAR:BHD": 0.10027,
  "BHD:AED": 9.76860,
  "AED:BHD": 0.10237,
  "BHD:KWD": 0.81630,
  "KWD:BHD": 1.22500,
  "BHD:OMR": 1.02460,
  "OMR:BHD": 0.97600,
  "BHD:QAR": 9.68200,
  "QAR:BHD": 0.10328,
  "BHD:EUR": 2.45000,
  "EUR:BHD": 0.40816,
  "BHD:GBP": 2.08000,
  "GBP:BHD": 0.48077,
};

export async function getLatestExchangeRate(
  baseCurrency: string,
  quoteCurrency: string,
): Promise<{ rate: number; isFallback: boolean; provider: string; effectiveDate: Date }> {
  if (baseCurrency === quoteCurrency) {
    return { rate: 1.0, isFallback: false, provider: "parity", effectiveDate: new Date() };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try to find recorded snapshot for today
  const snapshot = await db.exchangeRateSnapshot.findFirst({
    where: {
      baseCurrency,
      quoteCurrency,
      effectiveDate: { lte: today },
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (snapshot) {
    return {
      rate: Number(snapshot.rate),
      isFallback: false,
      provider: snapshot.provider,
      effectiveDate: snapshot.effectiveDate,
    };
  }

  // Fallback to pegged / baseline rate. Never invent a 1:1 rate for an unknown pair.
  const pairKey = `${baseCurrency}:${quoteCurrency}`;
  const fallbackRate = DEFAULT_RATES[pairKey];
  if (!fallbackRate) throw new Error(`No exchange rate is available for ${baseCurrency} → ${quoteCurrency}`);

  // Persist fallback snapshot so calculations remain stable
  await db.exchangeRateSnapshot.upsert({
    where: {
      baseCurrency_quoteCurrency_effectiveDate: {
        baseCurrency,
        quoteCurrency,
        effectiveDate: today,
      },
    },
    update: {},
    create: {
      baseCurrency,
      quoteCurrency,
      rate: fallbackRate,
      effectiveDate: today,
      provider: "cbb_baseline",
      sourceEvidence: "Pegged reference baseline fallback",
    },
  });

  return {
    rate: fallbackRate,
    isFallback: true,
    provider: "cbb_baseline",
    effectiveDate: today,
  };
}

export async function recordBankSettlement(input: {
  paymentId: string;
  settlementDate: Date;
  receivedAmount: number;
  receivedCurrency: string;
  settledAmountBhd: number;
  bankFeeBhd?: number;
  bankReference?: string | null;
}): Promise<BankSettlement> {
  const bankFee = input.bankFeeBhd || 0;

  // Compute FX Gain/Loss relative to invoice/payment face value in BHD
  const payment = await db.payment.findUnique({
    where: { id: input.paymentId },
    include: { invoice: true },
  });

  if (!payment) throw new Error("Payment record not found");

  const faceAmountBhd = payment.currency === "BHD" ? Number(payment.amount) : input.settledAmountBhd;
  const fxGainLossBhd = Math.round((input.settledAmountBhd - bankFee - faceAmountBhd) * 1000) / 1000;

  const settlement = await db.bankSettlement.upsert({
    where: { paymentId: input.paymentId },
    update: {
      settlementDate: input.settlementDate,
      receivedAmount: input.receivedAmount,
      receivedCurrency: input.receivedCurrency,
      settledAmountBhd: input.settledAmountBhd,
      bankFeeBhd: bankFee,
      fxGainLossBhd,
      bankReference: input.bankReference || null,
      status: "settled",
    },
    create: {
      paymentId: input.paymentId,
      settlementDate: input.settlementDate,
      receivedAmount: input.receivedAmount,
      receivedCurrency: input.receivedCurrency,
      settledAmountBhd: input.settledAmountBhd,
      bankFeeBhd: bankFee,
      fxGainLossBhd,
      bankReference: input.bankReference || null,
      status: "settled",
    },
  });

  return {
    ...settlement,
    receivedAmount: Number(settlement.receivedAmount),
    settledAmountBhd: Number(settlement.settledAmountBhd),
    bankFeeBhd: Number(settlement.bankFeeBhd),
    fxGainLossBhd: Number(settlement.fxGainLossBhd),
    settlementDate: settlement.settlementDate.toISOString(),
    createdAt: settlement.createdAt.toISOString(),
  };
}

export async function allocatePaymentToInvoice(
  paymentId: string,
  invoiceId: string,
  amount: number,
  currency: string = "BHD",
): Promise<PaymentAllocation> {
  const allocation = await db.paymentAllocation.create({
    data: {
      paymentId,
      invoiceId,
      allocatedAmount: amount,
      currency,
    },
  });

  return {
    ...allocation,
    allocatedAmount: Number(allocation.allocatedAmount),
    allocatedAt: allocation.allocatedAt.toISOString(),
  };
}
