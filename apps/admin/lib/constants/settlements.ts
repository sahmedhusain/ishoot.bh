
export const SETTLEMENT_REASONS = [
  "resignation",
  "termination",
  "end_of_contract",
  "retirement",
  "death",
  "other",
] as const;
export const SETTLEMENT_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "paid",
  "cancelled",
] as const;
export const SETTLEMENT_LINE_CATEGORIES = {
  addition: [
    "salary",
    "unpaid_salary",
    "overtime",
    "allowance",
    "commission",
    "leave_encashment",
    "indemnity",
    "reimbursement",
    "bonus",
    "notice_pay",
    "other",
  ],
  deduction: [
    "absence",
    "not_employed",
    "social_insurance",
    "leave_advance",
    "loan",
    "advance",
    "damage",
    "notice_shortfall",
    "penalty",
    "unreturned_asset",
    "other",
  ],
} as const;
export const SETTLEMENT_PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "cheque",
  "wps",
] as const;
