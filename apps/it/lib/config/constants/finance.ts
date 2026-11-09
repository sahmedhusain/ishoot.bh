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

export const DOCUMENT_NUMBER_PADDING = 4;

export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(DOCUMENT_NUMBER_PADDING, "0")}`;
}

export const OPEN_RECEIVABLE_STATUSES = [
  "sent",
  "partially_paid",
  "overdue",
] as const;

export const OVERDUE_ELIGIBLE_STATUSES = ["sent", "partially_paid"] as const;

export const PAYABLE_INVOICE_STATUSES = [
  "sent",
  "partially_paid",
  "overdue",
] as const;

export const QUOTATION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "issued",
  "accepted",
  "rejected",
  "converted",
  "expired",
  "cancelled",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const OPEN_QUOTATION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "issued",
  "accepted",
] as const satisfies readonly QuotationStatus[];

export const INVOICE_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["sent", "void"],
  sent: ["overdue", "void"],
  partially_paid: ["overdue"],
  overdue: ["void"],
  paid: [],
  void: [],
};

export const EXPENSE_PAYMENT_METHODS = [
  "bank_transfer",
  "company_card",
  "cash",
  "cheque",
  "benefit_pay",
  "staff_reimbursement",
] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_SCOPES = ["deal", "client", "internal"] as const;
export type ExpenseScope = (typeof EXPENSE_SCOPES)[number];

export const EXPENSE_CATEGORY_KINDS = [
  "cost_of_sales",
  "operating",
  "payroll",
] as const;
export type ExpenseCategoryKind = (typeof EXPENSE_CATEGORY_KINDS)[number];
