"use server";
import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createLeaveRequest,
  createActivityLog,
  submitForApproval,
  findPendingApproval,
  decideApprovalRequest,
  cancelPendingApprovals,
  refreshLeaveBalanceCache,
  getLeaveConflicts,
  db,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { hasPermission, requireAuth, requirePermission } from "../../lib/auth";

export async function createLeaveRequestAction(data: {
  employeeId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  fullDay?: boolean;
  hours?: number;
  /** "full", "half_am", "half_pm" or "hours". */
  dayPortion?: "full" | "half_am" | "half_pm" | "hours";
  attachmentUrl?: string | null;
}) {
  return measureOperation("action:createLeaveRequestAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("createLeaveRequestAction", { data });

    // Determine target employee: if employeeId not specified, lookup current actor's employee record
    let targetEmployeeId = data.employeeId;
    if (!targetEmployeeId) {
      const emp = await db.employee.findFirst({
        where: { userId: actor.id },
        select: { id: true },
      });
      if (!emp) throw new Error("Your HR profile is not set up yet. Ask HR to create your employee record.");
      targetEmployeeId = emp.id;
    }

    const target = await db.employee.findUnique({ where: { id: targetEmployeeId }, select: { userId: true } });
    if (!target) throw new Error("Employee not found");
    if (target.userId === actor.id) await requirePermission("self_service", "create");
    else await requirePermission("employees", "create");
    const { leaveRequest, approval } = await runAtomicMutation(async () => {
      const leaveRequest = await createLeaveRequest({
        employeeId: targetEmployeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        fullDay: data.fullDay !== false,
        hours: data.hours,
        dayPortion: data.dayPortion,
        attachmentUrl: data.attachmentUrl ?? null,
      });

      // The employee is the requester even when HR files on their behalf, so they can't self-approve.
      const requesterId = target.userId ?? actor.id;
      const approval = await submitForApproval({
        targetType: "leave_request",
        targetId: leaveRequest.id,
        requesterId,
        policySnapshot: { startDate: data.startDate, endDate: data.endDate, leaveTypeId: data.leaveTypeId },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "leave_request",
        entity_id: leaveRequest.id,
        details: { startDate: data.startDate, endDate: data.endDate, reason: data.reason, approvalStatus: approval.status },
      });

      return { leaveRequest, approval };
    });

    revalidatePath(ROUTES.hr.leave());
    revalidatePath(ROUTES.approvals());
    return { success: true, leaveRequest, approvalStatus: approval.status };
  });
}

export async function decideLeaveRequestAction(
  requestId: string,
  decision: "approved" | "rejected",
  notes?: string,
) {
  return measureOperation("action:decideLeaveRequestAction", async () => {
    // Who may decide is defined by the leave approval policy and enforced by the engine.
    const actor = await requireAuth();
    validateActionArguments("decideLeaveRequestAction", { requestId, decision, notes });

    const result = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("leave_request", requestId);
      if (!pending) throw new Error("This leave request has no pending approval");
      const outcome = await decideApprovalRequest(pending.id, actor.id, decision, notes);
      const conflicts =
        decision === "approved"
          ? await getLeaveConflicts(
              await db.leaveRequest.findUniqueOrThrow({
                where: { id: requestId },
                select: { startDate: true, endDate: true, employee: { select: { userId: true } } },
              }),
            )
          : null;
      await createActivityLog({
        user_id: actor.id,
        action: decision === "approved" ? "approve" : "reject",
        entity_type: "leave_request",
        entity_id: requestId,
        details: { notes, approvalStatus: outcome.status, conflicts },
      });
      return { approvalStatus: outcome.status, conflicts };
    });

    revalidatePath(ROUTES.hr.leave());
    revalidatePath(ROUTES.approvals());
    revalidatePath(ROUTES.requests.list);
    return { success: true, ...result };
  });
}

export async function cancelLeaveRequestAction(requestId: string) {
  return measureOperation("action:cancelLeaveRequestAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("cancelLeaveRequestAction", { requestId });

    const leave = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "pending") throw new Error(`Cannot cancel leave with status: ${leave.status}`);

    // Your own pending request, or anyone's if you manage employee records.
    if (leave.employee.userId !== actor.id && !(await hasPermission("employees", "edit"))) {
      throw new Error("You can only cancel your own pending leave requests");
    }

    await runAtomicMutation(async () => {
      await db.leaveRequest.update({
        where: { id: requestId },
        data: { status: "cancelled" },
      });
      await cancelPendingApprovals("leave_request", requestId);
      await refreshLeaveBalanceCache(leave.employeeId);
    });

    await createActivityLog({
      user_id: actor.id,
      action: "cancel",
      entity_type: "leave_request",
      entity_id: requestId,
      details: {},
    });

    revalidatePath(ROUTES.hr.leave());
    return { success: true };
  });
}
