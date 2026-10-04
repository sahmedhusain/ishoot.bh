"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  decideApprovalRequest,
  createActivityLog,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth } from "../../lib/auth";

export async function decideApprovalAction(
  approvalRequestId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  return measureOperation("action:decideApprovalAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("decideApprovalAction", { approvalRequestId, decision, reason });

    const { decisionResult } = await runAtomicMutation(async () => {
      const res = await decideApprovalRequest(approvalRequestId, actor.id, decision, reason);

      await createActivityLog({
        user_id: actor.id,
        action: `approval_${decision}`,
        entity_type: "approval_request",
        entity_id: approvalRequestId,
        details: { decision, reason, status: res.status },
      });

      return { decisionResult: res };
    });

    revalidatePath(ROUTES.approvals());
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
