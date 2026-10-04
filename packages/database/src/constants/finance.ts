// Finance rules shared by queries and the UI. Runtime-free.

/** Digits in the running part of invoice and receipt numbers: PREFIX-YYYY-0001. */
export const DOCUMENT_NUMBER_PADDING = 4;

export function formatDocumentNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(DOCUMENT_NUMBER_PADDING, "0")}`;
}

/** Invoice statuses that represent an issued claim on the customer. Drafts and voids are not receivables. */
export const OPEN_RECEIVABLE_STATUSES = ["sent", "partially_paid", "overdue"] as const;
/** Statuses an invoice can move to "overdue" from when its due date passes. */
export const OVERDUE_ELIGIBLE_STATUSES = ["sent", "partially_paid"] as const;
/** Invoice statuses that accept payments. */
export const PAYABLE_INVOICE_STATUSES = ["sent", "partially_paid", "overdue"] as const;

export const QUOTATION_STATUSES = ["draft", "submitted", "approved", "issued", "accepted", "rejected", "converted", "expired", "cancelled"] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Functional (reporting) currency. */
export const FUNCTIONAL_CURRENCY = "BHD";

/** Manual invoice status changes. Payment statuses (partially_paid/paid) are derived from payments, never set by hand. */
export const INVOICE_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["sent", "void"],
  sent: ["overdue", "void"],
  partially_paid: ["overdue"],
  overdue: ["void"],
  paid: [],
  void: [],
};
