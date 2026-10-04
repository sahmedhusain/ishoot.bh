// Approval vocabulary shared by the engine, the Approvals Center and Settings → Approvals.
// Runtime-free so client components can import it.

export const APPROVAL_TARGET_TYPES = [
  "leave_request",
  "salary_document",
  "profile_change",
  "service_request",
  "quotation",
  "payroll_run",
  "expense",
  "invoice",
] as const;
export type ApprovalTargetType = (typeof APPROVAL_TARGET_TYPES)[number];

export const APPROVER_MODES = ["manager", "department_manager", "role", "user", "permission"] as const;
export type ApproverMode = (typeof APPROVER_MODES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "superseded", "cancelled"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/** Roles that receive a request when no configured step yields an approver other than the requester. */
export const APPROVAL_FALLBACK_ROLES = ["admin", "super_admin"] as const;

/** Where each target type is reviewed in the dashboard. `{id}` is replaced with the target id. */
export const APPROVAL_TARGET_ROUTES: Record<ApprovalTargetType, string> = {
  leave_request: "/dashboard/hr/leave?highlight={id}",
  salary_document: "/dashboard/hr/documents?highlight={id}",
  profile_change: "/dashboard/profile?highlight={id}",
  service_request: "/dashboard/requests/{id}",
  quotation: "/dashboard/quotations/{id}",
  payroll_run: "/dashboard/hr/payroll?highlight={id}",
  expense: "/dashboard/expenses?highlight={id}",
  invoice: "/dashboard/invoices/{id}",
};

export const approvalTargetUrl = (targetType: string, targetId: string) =>
  (APPROVAL_TARGET_ROUTES[targetType as ApprovalTargetType] ?? "/dashboard/approvals").replace("{id}", targetId);
