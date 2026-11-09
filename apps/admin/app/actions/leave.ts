"use server";
import { syncLeaveStatus } from "@platform/database/services/status-windows";
import {
  serverTemplates,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { ROUTES } from "../../constants/routes";
import { measureOperation, runAtomicMutation } from "@platform/database";
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
} from "@platform/database";
import { listEmployees } from "@platform/api-client";
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
  dayPortion?: "full" | "half_am" | "half_pm" | "hours";
  attachmentUrl?: string | null;
}) {
  return measureOperation("action:createLeaveRequestAction", async () => {
    const actor = await requireAuth();
    validateActionArguments("createLeaveRequestAction", { data });

    const employees = await listEmployees().catch(() => []);
    let targetEmployeeId = data.employeeId;
    if (!targetEmployeeId) {
      const emp = employees.find((e) => (e as any).userId === actor.id);
      targetEmployeeId = emp?.id || actor.id;
    }

    const target = employees.find((e) => e.id === targetEmployeeId) as any;
    if (target?.userId === actor.id)
      await requirePermission("self_service", "create");
    else await requirePermission("employees", "create");
    const { leaveRequest, approval } = await runAtomicMutation(async () => {
      const leaveRequest = await createLeaveRequest({
        employeeId: targetEmployeeId!,
        leaveTypeId: data.leaveTypeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        fullDay: data.fullDay !== false,
        hours: data.hours,
        dayPortion: data.dayPortion,
        attachmentUrl: data.attachmentUrl ?? null,
      });

      const requesterId = target?.userId ?? actor.id;
      const approval = await submitForApproval({
        targetType: "leave_request",
        targetId: leaveRequest.id,
        requesterId,
        policySnapshot: {
          startDate: data.startDate,
          endDate: data.endDate,
          leaveTypeId: data.leaveTypeId,
        },
      });
      await createActivityLog({
        user_id: actor.id,
        action: "create",
        entity_type: "leave_request",
        entity_id: leaveRequest.id,
        details: {
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          approvalStatus: approval.status,
        },
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
    const actor = await requireAuth();
    validateActionArguments("decideLeaveRequestAction", {
      requestId,
      decision,
      notes,
    });

    const result = await runAtomicMutation(async () => {
      const pending = await findPendingApproval("leave_request", requestId);
      if (!pending)
        throw new Error(serverMessages.thisLeaveRequestHasNoPendingApproval);
      const outcome = await decideApprovalRequest(
        pending.id,
        actor.id,
        decision,
        notes,
      );
      const conflicts = null;
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

    await runAtomicMutation(async () => {
      await cancelPendingApprovals("leave_request", requestId);
    });
    await syncLeaveStatus(requestId);

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
