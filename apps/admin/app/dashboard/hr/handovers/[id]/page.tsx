import { notFound } from "next/navigation";
import {
  getSignatureMode,
  canDecideApproval,
  db,
  findPendingApproval,
  getEmployeeAssets,
  getEmployeeHandover,
} from "@ishoot/database";
import { hasPermission, requireAuth } from "../../../../../lib/auth";
import { ForbiddenView } from "../../../../../components/shared/ForbiddenView";
import { HandoverWorkspaceView } from "../../../../../components/handovers/HandoverWorkspaceView";

export const dynamic = "force-dynamic";

/** Open to HR and to whoever has to approve the handover. */
export default async function EmployeeHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const handover = await getEmployeeHandover(id);
  if (!handover) notFound();
  const [canRead, canEdit, canReturnAssets, pending, assets, users] =
    await Promise.all([
      hasPermission("employees", "read"),
      hasPermission("employees", "edit"),
      hasPermission("assets", "edit"),
      findPendingApproval("employee_handover", id),
      getEmployeeAssets(handover.employee.id),
      db.user.findMany({
        where: {
          isActive: true,
          ...(handover.employee.user_id
            ? { id: { not: handover.employee.user_id } }
            : {}),
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      }),
    ]);
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
