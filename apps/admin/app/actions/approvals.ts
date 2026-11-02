"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@platform/database";
import { validateActionArguments } from "../../lib/action-input";
import { decideApprovalRequest, createActivityLog, db } from "@platform/database";
import { syncLeaveStatus } from "@platform/database/services/status-windows";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";
import { announceChange } from "../../lib/live";

export async function decideApprovalAction(
  approvalRequestId: string,
  decision: "approved" | "rejected",
  reason?: string,
  /** Drawn by the approver now, for documents that must be signed on the spot. */
  signature?: string,
) {
  return measureOperation("action:decideApprovalAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("decideApprovalAction", {
      approvalRequestId,
      decision,
      reason,
      signature,
    });

    const { decisionResult } = await runAtomicMutation(async () => {
      const res = await decideApprovalRequest(
        approvalRequestId,
        actor.id,
        decision,
        reason,
        signature,
      );

      await createActivityLog({
        user_id: actor.id,
        action: `approval_${decision}`,
        entity_type: "approval_request",
        entity_id: approvalRequestId,
        details: {
          decision,
          reason,
          status: res.status,
          signedNow: !!signature,
        },
      });

      return { decisionResult: res };
    });
    // A decided leave request changes the person's status (on leave) for its dates.
    const target = await db.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      select: { targetType: true, targetId: true },
    });
    if (target?.targetType === "leave_request") await syncLeaveStatus(target.targetId);
    void announceChange("approvals", approvalRequestId, { everyone: true });

    revalidatePath("/dashboard", "layout");
    revalidatePath(ROUTES.approvals());
    revalidatePath("/dashboard/approvals/[type]/[id]", "page");
    revalidatePath(ROUTES.quotations.list);
    revalidatePath(ROUTES.invoices.list);
    revalidatePath(ROUTES.hr.payroll());
    revalidatePath(ROUTES.users.list);
    revalidatePath(ROUTES.home);
    revalidatePath(ROUTES.hr.leave());
    revalidatePath(ROUTES.hr.documents());
    revalidatePath(ROUTES.profile());
    revalidatePath(ROUTES.requests.list);
    return { success: true, status: decisionResult.status };
  });
}
