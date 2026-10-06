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
] as const;
export type ApprovalTargetType = (typeof APPROVAL_TARGET_TYPES)[number];

export const APPROVER_MODES = ["manager", "department_manager", "role", "user", "permission"] as const;
export type ApproverMode = (typeof APPROVER_MODES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "superseded", "cancelled"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** A pending approval older than this many days is flagged as stale on dashboards. */
export const STALE_APPROVAL_DAYS = 3;

/** Roles that receive a request when no configured step yields an approver other than the requester. */
export const APPROVAL_FALLBACK_ROLES = ["admin", "super_admin"] as const;

/** Where each target type is reviewed in the dashboard. */
export const APPROVAL_TARGET_ROUTES: Record<ApprovalTargetType, (id: string) => string> = {
  leave_request: (id) => ROUTES.hr.leave({ highlight: id }),
  salary_document: (id) => ROUTES.hr.documents({ highlight: id }),
  profile_change: (id) => ROUTES.profile({ highlight: id }),
  service_request: ROUTES.requests.detail,
  quotation: ROUTES.quotations.detail,
  payroll_run: (id) => ROUTES.hr.payroll({ highlight: id }),
  expense: (id) => ROUTES.expenses.list({ highlight: id }),
  invoice: ROUTES.invoices.detail,
  expense_claim: (id) => ROUTES.claims.list({ highlight: id }),
  signature_change: () => ROUTES.approvals(),
};

export const approvalTargetUrl = (targetType: string, targetId: string) =>
  APPROVAL_TARGET_ROUTES[targetType as ApprovalTargetType]?.(targetId) ?? ROUTES.approvals();
