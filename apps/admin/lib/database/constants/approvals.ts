// Approval vocabulary shared by the engine, the Approvals Center and Settings → Approvals.
// Runtime-free so client components can import it.

import { ROUTES } from "./routes";

export const APPROVAL_TARGET_TYPES = [
  "leave_request",
  "salary_document",
  "profile_change",
  "service_request",
  "quotation",
  "payroll_run",
  "expense",
  "invoice",
  "expense_claim",
  "signature_change",
  "account_change",
  "asset_handover",
  "employee_handover",
  "final_settlement",
  "announcement",
  "official_letter",
  "purchase_requisition",
  "purchase_order",
] as const;
export type ApprovalTargetType = (typeof APPROVAL_TARGET_TYPES)[number];

export const APPROVER_MODES = [
  "manager",
  "department_manager",
  "role",
  "user",
  "permission",
] as const;
export type ApproverMode = (typeof APPROVER_MODES)[number];

export type ApprovalConditionField =
  "minAmount" | "minDays" | "minDiscountPercent";

/** Which conditions make sense for each request type. */
export const APPROVAL_CONDITION_FIELDS: Record<
  ApprovalTargetType,
  ApprovalConditionField[]
> = {
  quotation: ["minAmount", "minDiscountPercent"],
  invoice: ["minAmount", "minDiscountPercent"],
  expense: ["minAmount"],
  expense_claim: ["minAmount"],
  payroll_run: ["minAmount"],
  leave_request: ["minDays"],
  salary_document: [],
  profile_change: [],
  service_request: [],
  signature_change: [],
  account_change: [],
  asset_handover: ["minAmount"],
  employee_handover: [],
  final_settlement: ["minAmount"],
  announcement: [],
  official_letter: [],
  purchase_requisition: ["minAmount"],
  purchase_order: ["minAmount"],
};

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "superseded",
  "cancelled",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** A pending approval older than this many days is flagged as stale on dashboards. */
export const STALE_APPROVAL_DAYS = 3;

/** Roles that receive a request when no configured step yields an approver other than the requester. */
export const APPROVAL_FALLBACK_ROLES = ["admin", "super_admin"] as const;

/**
 * Where each request is reviewed: always the item itself. Records with their own decision screen (quotations,
 * asset and employee handovers) open there; everything else opens its own approval page with the full details.
 */
const item = (type: ApprovalTargetType) => (id: string) =>
  ROUTES.approvalItem(type, id);
export const APPROVAL_TARGET_ROUTES: Record<
  ApprovalTargetType,
  (id: string) => string
> = {
  leave_request: item("leave_request"),
  salary_document: item("salary_document"),
  profile_change: item("profile_change"),
  service_request: item("service_request"),
  quotation: ROUTES.quotations.detail,
  payroll_run: item("payroll_run"),
  expense: item("expense"),
  invoice: item("invoice"),
  expense_claim: item("expense_claim"),
  signature_change: item("signature_change"),
  account_change: item("account_change"),
  asset_handover: ROUTES.assets.handover,
  employee_handover: ROUTES.hr.handover,
  final_settlement: ROUTES.hr.settlement,
  announcement: ROUTES.announcements.detail,
  official_letter: ROUTES.letters.detail,
  purchase_requisition: item("purchase_requisition"),
  purchase_order: item("purchase_order"),
};

export const approvalTargetUrl = (targetType: string, targetId: string) =>
  APPROVAL_TARGET_ROUTES[targetType as ApprovalTargetType]?.(targetId) ??
  ROUTES.approvals();
