import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { db } from "../db";
import { BankSettlement, PaymentAllocation } from "../types";

import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
} from "../constants/finance";

/** Currencies quotations can be issued in. */
export const QUOTABLE_CURRENCIES = SUPPORTED_CURRENCIES;

/**
 * Reference rates (units per 1 BHD) used only when no live or stored rate exists. BHD, SAR, AED, OMR
 * and QAR are pegged to USD, so their cross rates barely move; KWD, EUR and GBP float.
 */
const BASELINE_PER_BHD: Record<string, number> = {
  USD: 2.65957,
  SAR: 9.9734,
  AED: 9.7686,
  KWD: 0.8163,
  OMR: 1.0246,
  QAR: 9.682,
  EUR: 2.45,
  GBP: 2.08,
};

const LIVE_PROVIDER = "open.er-api";
const LIVE_TIMEOUT_MS = 5000;
let refreshInFlight: { day: string; promise: Promise<boolean> } | null = null;

function utcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Fetches today's BHD rates for every supported currency and stores them as snapshots.
 * Returns false when the provider is unreachable or answers with anything unexpected.
 * The provider can be swapped with FX_API_URL (must return `{ rates: { USD: n, ... } }` for base BHD).
 */
export async function refreshExchangeRates(
  options: { force?: boolean } = {},
): Promise<boolean> {
  const today = utcDay();
  const key = today.toISOString().slice(0, 10);
  if (!options.force && refreshInFlight?.day === key)
    return refreshInFlight.promise;
  const promise = (async () => {
    if (process.env.FX_LIVE_DISABLED === "1") return false;
    const url =
      process.env.FX_API_URL || "https://open.er-api.com/v6/latest/BHD";
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(LIVE_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!response.ok) return false;
      const body = (await response.json()) as {
        result?: string;
        rates?: Record<string, unknown>;
      };
      if (body.result && body.result !== "success") return false;
      const rates = body.rates ?? {};
      const fresh = SUPPORTED_CURRENCIES.filter(
        (code) => code !== "BHD",
      ).flatMap((code) => {
        const rate = Number(rates[code]);
        // Reject anything wildly away from the reference rate: a bad feed must never price a quotation.
        const reference = BASELINE_PER_BHD[code];
        return Number.isFinite(rate) &&
          rate > 0 &&
          rate / reference < 1.5 &&
          reference / rate < 1.5
          ? [{ code, rate }]
          : [];
      });
      if (!fresh.length) return false;
      await db.$transaction(
        fresh.flatMap(({ code, rate }) =>
          [
            ["BHD", code, rate],
            [code, "BHD", 1 / rate],
          ].map(([base, quote, value]) =>
            db.exchangeRateSnapshot.upsert({
              where: {
                baseCurrency_quoteCurrency_effectiveDate: {
                  baseCurrency: base as string,
                  quoteCurrency: quote as string,
                  effectiveDate: today,
                },
              },
              update: {
                rate: Number(value).toFixed(6),
                provider: LIVE_PROVIDER,
                fetchedAt: new Date(),
                sourceEvidence: url,
              },
              create: {
                baseCurrency: base as string,
                quoteCurrency: quote as string,
                rate: Number(value).toFixed(6),
                effectiveDate: today,
                provider: LIVE_PROVIDER,
                sourceEvidence: url,
              },
            }),
          ),
        ),
      );
      return true;
    } catch (error) {
      console.warn(
        "Live FX refresh failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  })();
  refreshInFlight = { day: key, promise };
  const ok = await promise;
  // A failed attempt may be retried later in the day.
  if (!ok && refreshInFlight?.promise === promise) refreshInFlight = null;
  return ok;
}

type RateInfo = {
  rate: number;
  isFallback: boolean;
  provider: string;
  effectiveDate: Date;
};

async function storedRate(
  base: string,
  quote: string,
  onlyDay?: Date,
): Promise<RateInfo | null> {
  const direct = await db.exchangeRateSnapshot.findFirst({
    where: {
      baseCurrency: base,
      quoteCurrency: quote,
      effectiveDate: onlyDay ?? { lte: utcDay() },
    },
    orderBy: [{ effectiveDate: "desc" }, { fetchedAt: "desc" }],
  });
  if (direct)
    return {
      rate: Number(direct.rate),
      isFallback: false,
      provider: direct.provider,
      effectiveDate: direct.effectiveDate,
    };
  const inverse = await db.exchangeRateSnapshot.findFirst({
    where: {
      baseCurrency: quote,
      quoteCurrency: base,
      effectiveDate: onlyDay ?? { lte: utcDay() },
    },
    orderBy: [{ effectiveDate: "desc" }, { fetchedAt: "desc" }],
  });
  if (inverse && Number(inverse.rate) > 0)
    return {
      rate: Math.round((1 / Number(inverse.rate)) * 1e6) / 1e6,
      isFallback: false,
      provider: inverse.provider,
      effectiveDate: inverse.effectiveDate,
    };
  return null;
}

/**
 * The rate to convert `baseCurrency` into `quoteCurrency`: today's stored rate, else a live fetch,
 * else the most recent stored rate, else the pegged reference. Only BHD pairs of supported currencies exist.
 */
export async function getLatestExchangeRate(
  baseCurrency: string,
  quoteCurrency: string,
): Promise<RateInfo> {
  if (baseCurrency === quoteCurrency) {
    return {
      rate: 1.0,
      isFallback: false,
      provider: "parity",
      effectiveDate: new Date(),
    };
  }
  if (
    !isSupportedCurrency(baseCurrency) ||
    !isSupportedCurrency(quoteCurrency) ||
    (baseCurrency !== "BHD" && quoteCurrency !== "BHD")
  )
    throw new Error(
      formatMessage(serverTemplates.noExchangeRateIsAvailableFor0, {
        0: baseCurrency,
        1: quoteCurrency,
      }),
    );

  const today = utcDay();
  const todays = await storedRate(baseCurrency, quoteCurrency, today);
  if (todays) return todays;
  if (await refreshExchangeRates()) {
    const live = await storedRate(baseCurrency, quoteCurrency, today);
    if (live) return live;
  }
  const latest = await storedRate(baseCurrency, quoteCurrency);
  if (latest) return { ...latest, isFallback: true };

  const foreign = baseCurrency === "BHD" ? quoteCurrency : baseCurrency;
  const perBhd = BASELINE_PER_BHD[foreign];
  const rate =
    baseCurrency === "BHD" ? perBhd : Math.round((1 / perBhd) * 1e6) / 1e6;
  return {
    rate,
    isFallback: true,
    provider: "cbb_baseline",
    effectiveDate: today,
  };
}

export interface FxBoardRow {
  currency: string;
  perBhd: number;
  provider: string;
  effectiveDate: string;
  isFallback: boolean;
}

/** Units of each supported currency per 1 BHD, with where each rate came from. */
export async function getFxBoard(): Promise<FxBoardRow[]> {
  const rows = await Promise.all(
    SUPPORTED_CURRENCIES.filter((code) => code !== "BHD").map(async (code) => {
      const info = await getLatestExchangeRate("BHD", code);
      return {
        currency: code,
        perBhd: info.rate,
        provider: info.provider,
        effectiveDate: info.effectiveDate.toISOString().slice(0, 10),
        isFallback: info.isFallback,
      };
    }),
  );
  return rows;
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

  if (!payment) throw new Error(serverMessages.paymentRecordNotFound);

  const faceAmountBhd =
    payment.currency === "BHD"
      ? Number(payment.amount)
      : input.settledAmountBhd;
  const fxGainLossBhd =
    Math.round((input.settledAmountBhd - bankFee - faceAmountBhd) * 1000) /
    1000;

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
