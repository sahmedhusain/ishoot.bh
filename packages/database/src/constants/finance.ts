import { serverTemplates, formatMessage } from "@platform/locales";
// Finance rules shared by queries and the UI. Runtime-free.

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

export function formatDocumentNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(DOCUMENT_NUMBER_PADDING, "0")}`;
}

/** Invoice statuses that represent an issued claim on the customer. Drafts and voids are not receivables. */
export const OPEN_RECEIVABLE_STATUSES = [
  "sent",
  "partially_paid",
  "overdue",
] as const;
/** Statuses an invoice can move to "overdue" from when its due date passes. */
export const OVERDUE_ELIGIBLE_STATUSES = ["sent", "partially_paid"] as const;
/** Invoice statuses that accept payments. */
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
/** Quotations still in play: not yet invoiced, declined, lapsed or withdrawn. */
export const OPEN_QUOTATION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "issued",
  "accepted",
] as const satisfies readonly QuotationStatus[];

/** Manual invoice status changes. Payment statuses (partially_paid/paid) are derived from payments, never set by hand. */
export const INVOICE_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["sent", "void"],
  sent: ["overdue", "void"],
  partially_paid: ["overdue"],
  overdue: ["void"],
  paid: [],
  void: [],
};

/** How an expense was paid; also used for staff claim reimbursements. */
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
