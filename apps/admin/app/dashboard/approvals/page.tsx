import { requireAuth, hasPermission } from "../../../lib/auth";
import { listApprovalRequests } from "@ishoot/database";
import { ApprovalsCenterView } from "../../../components/approvals/ApprovalsCenterView";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "pending";
  const targetType = typeof query.type === "string" ? query.type : undefined;
  const page = Math.max(1, Number(query.page) || 1);

  const access = await Promise.all([
    hasPermission("quotations", "read"), hasPermission("invoices", "read"), hasPermission("payroll", "read"), hasPermission("employees", "read"), hasPermission("profile_changes", "read"), hasPermission("employees", "approve"), hasPermission("profile_changes", "approve"),
  ]);
  const readableTargetTypes = ["quotation", "invoice", "payroll_run", "leave_request", "profile_change"].filter((_, index) => access[index]);
  const { items: requests, total } = await listApprovalRequests({
    visibleToUserId: user.id,
    readableTargetTypes,
    status: status === "all" ? undefined : status,
    targetType: targetType === "all" ? undefined : targetType,
    page,
    pageSize: 30,
  });

  // Calculate categorized metrics
  const isSuperAdmin = user.role === "super_admin";

  return (
    <ApprovalsCenterView
      initialRequests={requests}
      total={total}
      currentStatus={status}
      currentType={targetType || "all"}
      currentUserId={user.id}
      currentUserRole={user.role}
      canApproveLeave={access[5]}
      canApproveProfile={access[6]}
      isSuperAdmin={isSuperAdmin}
      page={page}
    />
  );
}
