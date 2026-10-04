"use server";
import { measureOperation, runAtomicMutation } from "@ishoot/database";
import { validateActionArguments } from "../../lib/action-input";
import {
  createLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createActivityLog,
  db,
} from "@ishoot/database";
import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "../../lib/auth";

export async function createLeaveRequestAction(data: {
  employeeId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  fullDay?: boolean;
  hours?: number;
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
      if (!emp) throw new Error("No employee profile found for your account");
      targetEmployeeId = emp.id;
    }

    const target = await db.employee.findUnique({ where: { id: targetEmployeeId }, select: { userId: true } });
    if (!target) throw new Error("Employee not found");
    if (target.userId !== actor.id) await requirePermission("employees", "create");
    const { leaveRequest } = await runAtomicMutation(async () => {
      let leaveRequest = await createLeaveRequest({
        employeeId: targetEmployeeId,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        fullDay: data.fullDay !== false,
        hours: data.hours,
      });

      if (actor.role === "super_admin") {
        leaveRequest = (await approveLeaveRequest(leaveRequest.id, actor.id)).request;
      }
      await createActivityLog({
        user_id: actor.id,
        action: actor.role === "super_admin" ? "auto_approve" : "create",
        entity_type: "leave_request",
        entity_id: leaveRequest.id,
        details: { startDate: data.startDate, endDate: data.endDate, reason: data.reason },
      });

      return { leaveRequest };
    });

    revalidatePath("/dashboard/hr/leave");
    revalidatePath("/dashboard/approvals");
    return { success: true, leaveRequest };
  });
}

export async function decideLeaveRequestAction(
  requestId: string,
  decision: "approved" | "rejected",
  notes?: string,
) {
  return measureOperation("action:decideLeaveRequestAction", async () => {
    const actor = await requirePermission("employees", "approve");
    validateActionArguments("decideLeaveRequestAction", { requestId, decision, notes });

    const result = await runAtomicMutation(async () => {
      if (decision === "approved") {
        const { request, conflicts } = await approveLeaveRequest(requestId, actor.id, notes);
        await createActivityLog({
          user_id: actor.id,
          action: "approve",
          entity_type: "leave_request",
          entity_id: requestId,
          details: { conflicts },
        });
        return { request, conflicts };
      } else {
        const request = await rejectLeaveRequest(requestId, actor.id, notes || "Rejected");
        await createActivityLog({
          user_id: actor.id,
          action: "reject",
          entity_type: "leave_request",
          entity_id: requestId,
          details: { notes },
        });
        return { request, conflicts: null };
      }
    });

    revalidatePath("/dashboard/hr/leave");
    revalidatePath("/dashboard/approvals");
    revalidatePath("/dashboard/requests");
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

    // Must be either own leave request or super_admin
    if (leave.employee.userId !== actor.id && actor.role !== "super_admin") {
      throw new Error("You can only cancel your own pending leave requests");
    }

    await db.leaveRequest.update({
      where: { id: requestId },
      data: { status: "cancelled" },
    });

    await createActivityLog({
      user_id: actor.id,
      action: "cancel",
      entity_type: "leave_request",
      entity_id: requestId,
      details: {},
    });

    revalidatePath("/dashboard/hr/leave");
    return { success: true };
  });
}
