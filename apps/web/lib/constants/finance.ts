import { serverTemplates, formatMessage } from "@platform/locales";

export { CURRENCY_CODES as SUPPORTED_CURRENCIES } from "@platform/config/currency";
import { CURRENCY_CODES as SUPPORTED_CURRENCIES, isCurrencyCode } from "@platform/config/currency";
export type SupportedCurrencyCode = string;
export const isSupportedCurrency = isCurrencyCode;

export function assertSupportedCurrency(
  code: unknown,
): asserts code is SupportedCurrencyCode {
  if (!isSupportedCurrency(code))
    throw new Error(
      formatMessage(serverTemplates.unsupportedCurrencyUseOneOf0, {
        0: SUPPORTED_CURRENCIES.join(", "),
      }),
    );
}

/** Digits in the running part of invoice and receipt numbers: PREFIX-YYYY-0001. */
export const DOCUMENT_NUMBER_PADDING = 4;

export const PAYABLE_INVOICE_STATUSES = [
  "sent",
  "partially_paid",
  "overdue",
] as const;

export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(DOCUMENT_NUMBER_PADDING, "0")}`;
}
