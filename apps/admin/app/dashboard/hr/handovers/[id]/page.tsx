import { notFound } from "next/navigation";
import {
  getSignatureMode,
  canDecideApproval,
  findPendingApproval,
  getEmployeeAssets,
  getEmployeeHandover,
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { hasPermission, requireAuth } from "../../../../../lib/auth";
import { ForbiddenView } from "../../../../../components/shared/ForbiddenView";
import { HandoverWorkspaceView } from "../../../../../components/handovers/HandoverWorkspaceView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/handovers/[id]");

export const dynamic = "force-dynamic";

export default async function EmployeeHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const handover = await getEmployeeHandover(id);
  if (!handover) notFound();
  const [canRead, canEdit, canReturnAssets, pending, assets, rawEmployees] =
    await Promise.all([
      hasPermission("employees", "read"),
      hasPermission("employees", "edit"),
      hasPermission("assets", "edit"),
      findPendingApproval("employee_handover", id),
      getEmployeeAssets(handover.employee.id),
      listEmployees().catch(() => []),
    ]);
  const users = rawEmployees.map((e) => ({
    id: e.id,
    fullName: `${e.first_name_en || ""} ${e.last_name_en || ""}`.trim() || e.id,
  }));
  const canDecide = pending ? canDecideApproval(pending, user) : false;
  if (!canRead && !canDecide) return <ForbiddenView />;
  return (
    <HandoverWorkspaceView
      handover={handover}
      held={assets.held}
      users={users.map((u) => ({ id: u.id, name: u.fullName }))}
      canEdit={canEdit}
      canReturnAssets={canReturnAssets}
      approvalId={canDecide && pending ? pending.id : null}
      signatureRequired={
        (await getSignatureMode("employee_handover")) === "live"
      }
    />
  );
}
