import crypto from "node:crypto";
import { db, runAtomicMutation } from "../db";
import {
  APPROVAL_FALLBACK_ROLES,
  approvalTargetUrl,
  type ApprovalTargetType,
  type ApproverMode,
} from "../constants/approvals";
import type { PermissionAction, PermissionResource } from "../constants/permissions";
import { hasPermission } from "../queries/permissions";
import { approveLeaveRequest, rejectLeaveRequest } from "../queries/leave";
import { approveProfileChange, rejectProfileChange } from "../queries/profile-changes";
import { salaryDocumentSnapshot } from "../queries/salary-documents";
import { approveRequest, returnRequest } from "../queries/inquiries";

/**
 * Approval engine: every request that needs sign-off goes through submitForApproval / decideApprovalRequest.
 * Who may decide comes from the ApprovalPolicy for the target type; nobody decides their own request unless
 * the policy allows it or no other approver exists (recorded as selfApproved).
 */

type Decision = "approved" | "rejected";

interface Requester {
  id: string;
  role: string;
  managerId: string | null;
}

interface PolicyStep {
  order: number;
  approverMode: string;
  roleKey: string | null;
  userId: string | null;
  permission: string | null;
}

export interface Finalizer {
  approve(targetId: string, deciderId: string, reason?: string): Promise<void>;
  reject(targetId: string, deciderId: string, reason?: string): Promise<void>;
}

const finalizers: Partial<Record<ApprovalTargetType, Finalizer>> = {
  leave_request: {
    approve: async (id, decider, reason) => void (await approveLeaveRequest(id, decider, reason)),
    reject: async (id, decider, reason) => void (await rejectLeaveRequest(id, decider, reason || "Rejected")),
  },
  profile_change: {
    approve: async (id, decider, reason) => void (await approveProfileChange(id, decider, reason)),
    reject: async (id, decider, reason) => void (await rejectProfileChange(id, decider, reason || "Rejected")),
  },
  salary_document: {
    async approve(id, decider, reason) {
      const document = await db.salaryDocument.findUniqueOrThrow({ where: { id } });
      if (document.status !== "pending") throw new Error("Salary document request has already been reviewed");
      const snapshot = await salaryDocumentSnapshot(document.employeeId, document.kind, document.months as string[]);
      await db.salaryDocument.update({
        where: { id },
        data: { status: "issued", reviewedById: decider, reviewNotes: reason || null, snapshot, issuedAt: new Date() },
      });
    },
    async reject(id, decider, reason) {
      await db.salaryDocument.update({
        where: { id },
        data: { status: "rejected", reviewedById: decider, reviewNotes: reason || null },
      });
    },
  },
  service_request: {
    approve: async (id, decider, reason) => void (await approveRequest(id, { approvedById: decider, notes: reason })),
    // A rejected SR/CR goes back to the team with the approver's reason.
    reject: async (id, decider, reason) => void (await returnRequest(id, { returnedById: decider, reason: reason || "Rejected" })),
  },
  expense: {
    approve: async (id, _decider, reason) =>
      void (await db.expense.update({ where: { id }, data: { status: "approved", reviewNotes: reason || null } })),
    reject: async (id, _decider, reason) =>
      void (await db.expense.update({ where: { id }, data: { status: "rejected", reviewNotes: reason || null } })),
  },
  quotation: {
    approve: async (id) => void (await db.quotation.update({ where: { id }, data: { status: "approved" } })),
    reject: async (id) => void (await db.quotation.update({ where: { id }, data: { status: "draft" } })),
  },
  invoice: {
    approve: async (id) => void (await db.invoice.update({ where: { id }, data: { approvalStatus: "approved" } })),
    reject: async (id) => void (await db.invoice.update({ where: { id }, data: { approvalStatus: "rejected" } })),
  },
  payroll_run: {
    async approve(id, decider) {
      const run = await db.payrollRun.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (run.status !== "submitted") throw new Error(`Payroll run is ${run.status}; it can no longer be approved`);
      await db.payrollRun.update({ where: { id }, data: { status: "approved", approvedById: decider, approvedAt: new Date() } });
    },
    async reject(id) {
      const run = await db.payrollRun.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (run.status !== "submitted") throw new Error(`Payroll run is ${run.status}; it can no longer be rejected`);
      await db.payrollRun.update({ where: { id }, data: { status: "draft", approvedById: null, approvedAt: null } });
    },
  },
};

/** Lets other modules (e.g. service requests, expenses) plug in how a decision is applied to their records. */
export function registerApprovalFinalizer(targetType: ApprovalTargetType, finalizer: Finalizer) {
  finalizers[targetType] = finalizer;
}

function finalizerFor(targetType: string): Finalizer {
  const finalizer = finalizers[targetType as ApprovalTargetType];
  if (!finalizer) throw new Error(`No approval handler registered for ${targetType}`);
  return finalizer;
}

async function activeUserIds(where: Record<string, unknown>): Promise<string[]> {
  const users = await db.user.findMany({ where: { ...where, isActive: true }, select: { id: true } });
  return users.map((u) => u.id);
}

async function resolveStep(step: PolicyStep, requester: Requester): Promise<string[]> {
  switch (step.approverMode as ApproverMode) {
    case "manager":
      return requester.managerId ? activeUserIds({ id: requester.managerId }) : [];
    case "department_manager": {
      const employee = await db.employee.findUnique({
        where: { userId: requester.id },
        select: { department: { select: { managerId: true } } },
      });
      const managerId = employee?.department?.managerId;
      return managerId ? activeUserIds({ id: managerId }) : [];
    }
    case "role":
      return step.roleKey ? activeUserIds({ role: step.roleKey }) : [];
    case "user":
      return step.userId ? activeUserIds({ id: step.userId }) : [];
    case "permission": {
      if (!step.permission) return [];
      const [resource, action] = step.permission.split(":") as [PermissionResource, PermissionAction];
      const users = await db.user.findMany({ where: { isActive: true }, select: { id: true, role: true, permissions: true } });
      const allowed = await Promise.all(
        users.map((u) => hasPermission(u.role, resource, action, u.permissions as Record<string, boolean> | null)),
      );
      return users.filter((_, i) => allowed[i]).map((u) => u.id);
    }
    default:
      return [];
  }
}

/** First step at or after `fromOrder` that yields an eligible approver. */
async function nextApprovers(
  steps: PolicyStep[],
  fromOrder: number,
  requester: Requester,
  allowSelf: boolean,
  exclude: Set<string>,
): Promise<{ step: number; approverIds: string[] } | null> {
  for (const step of steps.filter((s) => s.order >= fromOrder)) {
    const ids = (await resolveStep(step, requester)).filter(
      (id) => (allowSelf || id !== requester.id) && !exclude.has(id),
    );
    if (ids.length) return { step: step.order, approverIds: ids };
  }
  return null;
}

async function fallbackApprovers(requester: Requester): Promise<string[]> {
  for (const role of APPROVAL_FALLBACK_ROLES) {
    const ids = (await activeUserIds({ role })).filter((id) => id !== requester.id);
    if (ids.length) return ids;
  }
  return [];
}

async function notify(userIds: string[], input: { title: string; message: string; messageKey: string; targetType: string; targetId: string; type?: string }) {
  if (!userIds.length) return;
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "action",
      entityType: input.targetType,
      entityId: input.targetId,
      messageKey: input.messageKey,
      messageParams: { targetType: input.targetType },
      actionUrl: approvalTargetUrl(input.targetType, input.targetId),
    })),
  });
}

function hashContent(targetType: string, targetId: string, revision: number, data?: unknown) {
  const body = data === undefined ? `${targetType}:${targetId}` : JSON.stringify(data, Object.keys((data as object) || {}).sort());
  return crypto.createHash("sha256").update(`${revision}:${body}`).digest("hex");
}

export interface SubmitForApprovalInput {
  targetType: ApprovalTargetType;
  targetId: string;
  requesterId: string;
  contentData?: unknown;
  policySnapshot?: Record<string, unknown>;
  diffPayload?: Record<string, unknown> | null;
  discountReason?: string | null;
}

export interface ApprovalOutcome {
  approvalRequestId: string;
  status: "pending" | "approved" | "rejected";
  /** True when the target has been finalized (decision applied to the record). */
  finalized: boolean;
  approverIds: string[];
}

export async function submitForApproval(input: SubmitForApprovalInput): Promise<ApprovalOutcome> {
  return runAtomicMutation(async () => {
    const requester = await db.user.findUniqueOrThrow({
      where: { id: input.requesterId },
      select: { id: true, role: true, managerId: true },
    });
    const policy = await db.approvalPolicy.findUnique({
      where: { targetType: input.targetType },
      include: { steps: { orderBy: { order: "asc" } } },
    });

    await db.approvalRequest.updateMany({
      where: { targetType: input.targetType, targetId: input.targetId, status: "pending" },
      data: { status: "superseded" },
    });
    const latest = await db.approvalRequest.findFirst({
      where: { targetType: input.targetType, targetId: input.targetId },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });
    const revision = (latest?.revision ?? 0) + 1;

    // Super Admin is the final authority: their own requests never wait on a lower approver.
    const superAdmin = requester.role === "super_admin";
    const autoApprove = superAdmin || (!!policy && (!policy.enabled || policy.autoApproveRoles.includes(requester.role)));
    const allowSelf = policy?.allowSelfApproval ?? false;
    // A missing policy falls back to the admin pool rather than silently approving.
    const route = autoApprove ? null : await nextApprovers(policy?.steps ?? [], 1, requester, allowSelf, new Set());
    const approverIds = route?.approverIds ?? (autoApprove ? [] : await fallbackApprovers(requester));
    const selfApproved = !autoApprove && approverIds.length === 0;

    const created = await db.approvalRequest.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        revision,
        contentHash: hashContent(input.targetType, input.targetId, revision, input.contentData),
        status: "pending",
        requestedById: requester.id,
        policyId: policy?.id ?? null,
        currentStep: route?.step ?? 1,
        approverIds,
        selfApproved,
        policySnapshot: (input.policySnapshot ?? {}) as object,
        diffPayload: (input.diffPayload ?? undefined) as object | undefined,
        discountReason: input.discountReason ?? null,
      },
    });

    if (autoApprove || selfApproved) {
      const reason = superAdmin ? "super_admin" : autoApprove ? "policy_auto" : "no_alternate_approver";
      await db.approvalDecision.create({
        data: { approvalRequestId: created.id, decision: "approved", decidedById: requester.id, reason, step: created.currentStep },
      });
      await db.approvalRequest.update({ where: { id: created.id }, data: { status: "approved" } });
      await finalizerFor(input.targetType).approve(input.targetId, requester.id, reason);
      await db.activityLog.create({
        data: { userId: requester.id, action: "auto_approve", entityType: input.targetType, entityId: input.targetId, details: { approvalRequestId: created.id, reason } },
      });
      return { approvalRequestId: created.id, status: "approved", finalized: true, approverIds: [] };
    }

    await notify(approverIds, {
      title: "Approval required",
      message: "A new request is waiting for your approval.",
      messageKey: "approvals.notifications.awaitingYou",
      targetType: input.targetType,
      targetId: input.targetId,
    });
    return { approvalRequestId: created.id, status: "pending", finalized: false, approverIds };
  });
}

/** Whether `actor` may decide this request right now (used by both the UI and the decide path). */
export function canDecideApproval(
  request: { status: string; requestedById: string; approverIds: string[]; selfApproved?: boolean },
  actor: { id: string; role: string },
): boolean {
  if (request.status !== "pending") return false;
  if (request.approverIds.includes(actor.id)) return true;
  // Super Admin may step in on anyone else's request, never silently on their own.
  return actor.role === "super_admin" && request.requestedById !== actor.id;
}

export async function decideApprovalRequest(
  approvalRequestId: string,
  actorId: string,
  decision: Decision,
  reason?: string,
): Promise<ApprovalOutcome> {
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${approvalRequestId} FOR UPDATE`;
    const request = await db.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { policy: { include: { steps: { orderBy: { order: "asc" } } } }, decisions: { select: { decidedById: true } } },
    });
    if (!request) throw new Error("Approval request not found");
    if (request.status !== "pending") throw new Error(`This request is already ${request.status}`);
    const actor = await db.user.findUniqueOrThrow({ where: { id: actorId }, select: { id: true, role: true, isActive: true } });
    if (!actor.isActive) throw new Error("Inactive users cannot decide approvals");
    if (!canDecideApproval(request, actor)) {
      throw new Error(
        request.requestedById === actorId
          ? "You cannot approve or reject your own request"
          : "You are not an approver for this request",
      );
    }
    if (decision === "rejected" && !reason?.trim()) throw new Error("A reason is required to reject a request");

    await db.approvalDecision.create({
      data: { approvalRequestId, decision, decidedById: actorId, reason: reason?.trim() || null, step: request.currentStep },
    });

    const requester = await db.user.findUniqueOrThrow({
      where: { id: request.requestedById },
      select: { id: true, role: true, managerId: true },
    });

    if (decision === "approved") {
      const alreadyDecided = new Set([...request.decisions.map((d) => d.decidedById), actorId]);
      const next = await nextApprovers(
        request.policy?.steps ?? [],
        request.currentStep + 1,
        requester,
        request.policy?.allowSelfApproval ?? false,
        alreadyDecided,
      );
      if (next) {
        await db.approvalRequest.update({
          where: { id: approvalRequestId },
          data: { currentStep: next.step, approverIds: next.approverIds },
        });
        await notify(next.approverIds, {
          title: "Approval required",
          message: "A request moved to your approval step.",
          messageKey: "approvals.notifications.awaitingYou",
          targetType: request.targetType,
          targetId: request.targetId,
        });
        return { approvalRequestId, status: "pending", finalized: false, approverIds: next.approverIds };
      }
    }

    await db.approvalRequest.update({ where: { id: approvalRequestId }, data: { status: decision } });
    const finalizer = finalizerFor(request.targetType);
    if (decision === "approved") await finalizer.approve(request.targetId, actorId, reason);
    else await finalizer.reject(request.targetId, actorId, reason);

    await notify([request.requestedById], {
      title: decision === "approved" ? "Request approved" : "Request rejected",
      message: reason?.trim() || (decision === "approved" ? "Your request was approved." : "Your request was rejected."),
      messageKey: decision === "approved" ? "approvals.notifications.approved" : "approvals.notifications.rejected",
      targetType: request.targetType,
      targetId: request.targetId,
      type: decision === "approved" ? "success" : "warning",
    });
    return { approvalRequestId, status: decision, finalized: true, approverIds: [] };
  });
}

/** Latest pending approval for a record, e.g. to decide a leave request from the leave page. */
export async function findPendingApproval(targetType: ApprovalTargetType, targetId: string) {
  return db.approvalRequest.findFirst({
    where: { targetType, targetId, status: "pending" },
    orderBy: { revision: "desc" },
    select: { id: true, requestedById: true, approverIds: true, status: true, currentStep: true },
  });
}

/** Withdraws a pending approval when the requester cancels the underlying record. */
export async function cancelPendingApprovals(targetType: ApprovalTargetType, targetId: string) {
  await db.approvalRequest.updateMany({
    where: { targetType, targetId, status: "pending" },
    data: { status: "cancelled" },
  });
}
