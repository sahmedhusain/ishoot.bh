import {
  serverTemplates,
  getTranslations,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import crypto from "node:crypto";
import { db, runAtomicMutation } from "../atomic";
import {
  APPROVAL_FALLBACK_ROLES,
  approvalTargetUrl,
  type ApprovalTargetType,
  type ApproverMode,
} from "../constants/approvals";
import type {
  PermissionAction,
  PermissionResource,
} from "../constants/permissions";
import { hasPermission } from "../queries/permissions";
import { approveLeaveRequest, rejectLeaveRequest } from "../queries/leave";
import {
  approveProfileChange,
  rejectProfileChange,
} from "../queries/profile-changes";
import { salaryDocumentSnapshot } from "../queries/salary-documents";
import { approveRequest, returnRequest } from "../queries/inquiries";
import {
  approveSignatureChange,
  rejectSignatureChange,
} from "../queries/signature-changes";
import {
  approveAccountChange,
  rejectAccountChange,
} from "../queries/account-changes";
import { assertCompanyCurrency } from "../finance/company-currency";
import { roundMoney } from "../finance/money";
import { leaveDaysRequested } from "../constants/hr";
import { getSignatureMode } from "../queries/signature-policies";
import { validateSignatureImage } from "./signature-image";

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
  minAmount?: unknown;
  minDays?: unknown;
  minDiscountPercent?: unknown;
}

export interface ApprovalMetrics {
  amount?: number;
  days?: number;
  discountPercent?: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

async function toCompanyCurrency(amount: number, currency: string, _historicalRate?: unknown): Promise<number> {
  await assertCompanyCurrency(currency);
  return roundMoney(amount, currency);
}

function discountPercent(subtotal: unknown, discount: unknown): number {
  const base = Number(subtotal);
  return base > 0 ? Math.round((Number(discount) / base) * 10000) / 100 : 0;
}

export async function approvalMetrics(
  targetType: string,
  targetId: string,
): Promise<ApprovalMetrics> {
  switch (targetType) {
    case "purchase_requisition": {
      const r = await db.purchaseRequisition.findUnique({
        where: { id: targetId },
        select: { estimatedTotal: true },
      });
      return r ? { amount: Number(r.estimatedTotal) } : {};
    }
    case "purchase_order": {
      const o = await db.purchaseOrder.findUnique({
        where: { id: targetId },
        select: { total: true },
      });
      return o ? { amount: Number(o.total) } : {};
    }
    case "quotation": {
      const q = await db.quotation.findUnique({
        where: { id: targetId },
        select: {
          totalAmount: true,
          subtotal: true,
          discountAmount: true,
          currency: true,
          effectiveRate: true,
        },
      });
      return q
        ? {
            amount: await toCompanyCurrency(
              Number(q.totalAmount),
              q.currency,
              q.effectiveRate,
            ),
            discountPercent: discountPercent(q.subtotal, q.discountAmount),
          }
        : {};
    }
    case "invoice": {
      const i = await db.invoice.findUnique({
        where: { id: targetId },
        select: {
          totalAmount: true,
          subtotal: true,
          discountAmount: true,
          currency: true,
        },
      });
      return i
        ? {
            amount: await toCompanyCurrency(Number(i.totalAmount), i.currency),
            discountPercent: discountPercent(i.subtotal, i.discountAmount),
          }
        : {};
    }
    case "expense": {
      const e = await db.expense.findUnique({
        where: { id: targetId },
        select: { amount: true, currency: true },
      });
      return e ? { amount: await toCompanyCurrency(Number(e.amount), e.currency) } : {};
    }
    case "expense_claim": {
      const c = await db.expenseClaim.findUnique({
        where: { id: targetId },
        select: { amount: true, currency: true },
      });
      return c ? { amount: await toCompanyCurrency(Number(c.amount), c.currency) } : {};
    }
    case "payroll_run": {
      const r = await db.payrollRun.findUnique({
        where: { id: targetId },
        select: { totalNet: true },
      });
      return r ? { amount: round3(Number(r.totalNet)) } : {};
    }
    case "leave_request": {
      const l = await db.leaveRequest.findUnique({
        where: { id: targetId },
        select: { startDate: true, endDate: true, fullDay: true, hours: true },
      });
      return l
        ? {
            days: leaveDaysRequested(
              l.startDate,
              l.endDate,
              l.fullDay,
              l.hours ? Number(l.hours) : null,
            ),
          }
        : {};
    }
    case "asset_handover": {
      const h = await db.assetHandover.findUnique({
        where: { id: targetId },
        select: { asset: { select: { purchaseCost: true, currency: true } } },
      });
      return h?.asset.purchaseCost != null
        ? {
            amount: await toCompanyCurrency(Number(h.asset.purchaseCost), h.asset.currency),
          }
        : {};
    }
    case "final_settlement": {
      const f = await db.finalSettlement.findUnique({
        where: { id: targetId },
        select: { netAmount: true },
      });
      return f ? { amount: round3(Math.abs(Number(f.netAmount))) } : {};
    }
    default:
      return {};
  }
}

export function stepApplies(
  step: Pick<PolicyStep, "minAmount" | "minDays" | "minDiscountPercent">,
  metrics: ApprovalMetrics,
): boolean {
  const checks: Array<[unknown, number | undefined]> = [
    [step.minAmount, metrics.amount],
    [step.minDays, metrics.days],
    [step.minDiscountPercent, metrics.discountPercent],
  ];
  return checks.every(
    ([min, value]) => min == null || (value != null && value >= Number(min)),
  );
}

export interface Finalizer {
  approve(targetId: string, deciderId: string, reason?: string): Promise<void>;
  reject(targetId: string, deciderId: string, reason?: string): Promise<void>;
}

const finalizers: Partial<Record<ApprovalTargetType, Finalizer>> = {
  leave_request: {
    approve: async (id, decider, reason) =>
      void (await approveLeaveRequest(id, decider, reason)),
    reject: async (id, decider, reason) =>
      void (await rejectLeaveRequest(id, decider, reason || "Rejected")),
  },
  profile_change: {
    approve: async (id, decider, reason) =>
      void (await approveProfileChange(id, decider, reason)),
    reject: async (id, decider, reason) =>
      void (await rejectProfileChange(id, decider, reason || "Rejected")),
  },
  salary_document: {
    async approve(id, decider, reason) {
      const document = await db.salaryDocument.findUniqueOrThrow({
        where: { id },
      });
      if (document.status !== "pending")
        throw new Error(
          serverMessages.salaryDocumentRequestHasAlreadyBeenReviewed,
        );
      const snapshot = await salaryDocumentSnapshot(
        document.employeeId,
        document.kind,
        document.months as string[],
      );
      await db.salaryDocument.update({
        where: { id },
        data: {
          status: "issued",
          reviewedById: decider,
          reviewNotes: reason || null,
          snapshot,
          issuedAt: new Date(),
        },
      });
    },
    async reject(id, decider, reason) {
      await db.salaryDocument.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedById: decider,
          reviewNotes: reason || null,
        },
      });
    },
  },
  service_request: {
    approve: async (id, decider, reason) =>
      void (await approveRequest(id, { approvedById: decider, notes: reason })),
    reject: async (id, decider, reason) =>
      void (await returnRequest(id, {
        returnedById: decider,
        reason: reason || "Rejected",
      })),
  },
  expense: {
    approve: async (id, _decider, reason) =>
      void (await db.expense.update({
        where: { id },
        data: { status: "approved", reviewNotes: reason || null },
      })),
    reject: async (id, _decider, reason) =>
      void (await db.expense.update({
        where: { id },
        data: { status: "rejected", reviewNotes: reason || null },
      })),
  },
  signature_change: {
    approve: (id, decider, reason) =>
      approveSignatureChange(id, decider, reason),
    reject: (id, decider, reason) => rejectSignatureChange(id, decider, reason),
  },
  account_change: {
    approve: (id, decider, reason) => approveAccountChange(id, decider, reason),
    reject: (id, decider, reason) => rejectAccountChange(id, decider, reason),
  },
  expense_claim: {
    async approve(id, _decider, reason) {
      const claim = await db.expenseClaim.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (claim.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.claimIs0ItCanNoLonger, {
            0: claim.status,
          }),
        );
      await db.expenseClaim.update({
        where: { id },
        data: { status: "approved", reviewNotes: reason || null },
      });
    },
    async reject(id, _decider, reason) {
      const claim = await db.expenseClaim.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (claim.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.claimIs0ItCanNoLonger2, {
            0: claim.status,
          }),
        );
      await db.expenseClaim.update({
        where: { id },
        data: { status: "rejected", reviewNotes: reason || null },
      });
    },
  },
  quotation: {
    approve: async (id) =>
      void (await db.quotation.update({
        where: { id },
        data: { status: "approved" },
      })),
    reject: async (id) =>
      void (await db.quotation.update({
        where: { id },
        data: { status: "draft" },
      })),
  },
  invoice: {
    approve: async (id) =>
      void (await db.invoice.update({
        where: { id },
        data: { approvalStatus: "approved" },
      })),
    reject: async (id) =>
      void (await db.invoice.update({
        where: { id },
        data: { approvalStatus: "rejected" },
      })),
  },
  payroll_run: {
    async approve(id, decider) {
      const run = await db.payrollRun.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (run.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.payrollRunIs0ItCanNo, {
            0: run.status,
          }),
        );
      await db.payrollRun.update({
        where: { id },
        data: {
          status: "approved",
          approvedById: decider,
          approvedAt: new Date(),
        },
      });
    },
    async reject(id) {
      const run = await db.payrollRun.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (run.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.payrollRunIs0ItCanNo2, {
            0: run.status,
          }),
        );
      await db.payrollRun.update({
        where: { id },
        data: { status: "draft", approvedById: null, approvedAt: null },
      });
    },
  },
};

export function registerApprovalFinalizer(
  targetType: ApprovalTargetType,
  finalizer: Finalizer,
) {
  finalizers[targetType] = finalizer;
}

function finalizerFor(targetType: string): Finalizer {
  const finalizer = finalizers[targetType as ApprovalTargetType];
  if (!finalizer)
    throw new Error(
      formatMessage(serverTemplates.noApprovalHandlerRegisteredFor0, {
        0: targetType,
      }),
    );
  return finalizer;
}

async function activeUserIds(
  where: Record<string, unknown>,
): Promise<string[]> {
  const users = await db.user.findMany({
    where: { ...where, isActive: true },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function resolveStep(
  step: PolicyStep,
  requester: Requester,
): Promise<string[]> {
  switch (step.approverMode as ApproverMode) {
    case "manager":
      return requester.managerId
        ? activeUserIds({ id: requester.managerId })
        : [];
    case "department_manager": {
      const account = await db.user.findUnique({
        where: { id: requester.id },
        select: {
          departmentId: true,
          employee: { select: { departmentId: true } },
        },
      });
      let departmentId =
        account?.departmentId ?? account?.employee?.departmentId ?? null;
      for (let level = 0; departmentId && level < 8; level++) {
        const department = await db.department.findUnique({
          where: { id: departmentId },
          select: { managerId: true, deputyId: true, parentId: true },
        });
        const leaders = [department?.managerId, department?.deputyId].filter(
          (id): id is string => !!id && id !== requester.id,
        );
        if (leaders.length) {
          const active = await activeUserIds({ id: { in: leaders } });
          if (active.length) return active;
        }
        departmentId = department?.parentId ?? null;
      }
      return [];
    }
    case "role":
      return step.roleKey ? activeUserIds({ role: step.roleKey }) : [];
    case "user":
      return step.userId ? activeUserIds({ id: step.userId }) : [];
    case "permission": {
      if (!step.permission) return [];
      const [resource, action] = step.permission.split(":") as [
        PermissionResource,
        PermissionAction,
      ];
      const users = await db.user.findMany({
        where: { isActive: true },
        select: { id: true, role: true, permissions: true },
      });
      const allowed = await Promise.all(
        users.map((u) =>
          hasPermission(
            u.role,
            resource,
            action,
            u.permissions as Record<string, boolean> | null,
          ),
        ),
      );
      return users.filter((_, i) => allowed[i]).map((u) => u.id);
    }
    default:
      return [];
  }
}

async function nextApprovers(
  steps: PolicyStep[],
  fromOrder: number,
  requester: Requester,
  allowSelf: boolean,
  exclude: Set<string>,
  metrics: ApprovalMetrics = {},
): Promise<{ step: number; approverIds: string[] } | null> {
  for (const step of steps.filter(
    (s) => s.order >= fromOrder && stepApplies(s, metrics),
  )) {
    const ids = (await resolveStep(step, requester)).filter(
      (id) => (allowSelf || id !== requester.id) && !exclude.has(id),
    );
    if (ids.length) return { step: step.order, approverIds: ids };
  }
  return null;
}

async function fallbackApprovers(requester: Requester): Promise<string[]> {
  for (const role of APPROVAL_FALLBACK_ROLES) {
    const ids = (await activeUserIds({ role })).filter(
      (id) => id !== requester.id,
    );
    if (ids.length) return ids;
  }
  return [];
}

async function notify(
  userIds: string[],
  input: {
    title: string;
    message: string;
    messageKey: string;
    targetType: string;
    targetId: string;
    type?: string;
  },
) {
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

function hashContent(
  targetType: string,
  targetId: string,
  revision: number,
  data?: unknown,
) {
  const body =
    data === undefined
      ? `${targetType}:${targetId}`
      : JSON.stringify(data, Object.keys((data as object) || {}).sort());
  return crypto
    .createHash("sha256")
    .update(`${revision}:${body}`)
    .digest("hex");
}

export interface SubmitForApprovalInput {
  targetType: ApprovalTargetType;
  targetId: string;
  requesterId: string;
  contentData?: unknown;
  policySnapshot?: Record<string, unknown>;
  diffPayload?: Record<string, unknown> | null;
  discountReason?: string | null;
  autoApproveReason?: string | null;
}

export interface ApprovalOutcome {
  approvalRequestId: string;
  status: "pending" | "approved" | "rejected";
  finalized: boolean;
  approverIds: string[];
}

export async function submitForApproval(
  input: SubmitForApprovalInput,
): Promise<ApprovalOutcome> {
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
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        status: "pending",
      },
      data: { status: "superseded" },
    });
    const latest = await db.approvalRequest.findFirst({
      where: { targetType: input.targetType, targetId: input.targetId },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });
    const revision = (latest?.revision ?? 0) + 1;
    const metrics = await approvalMetrics(input.targetType, input.targetId);
    const belowThreshold =
      !!policy?.enabled &&
      policy.steps.length > 0 &&
      !policy.steps.some((step) => stepApplies(step, metrics));

    const superAdmin = requester.role === "super_admin";
    const requiresLiveSignature =
      (await getSignatureMode(input.targetType)) === "live";
    const autoApprove =
      !requiresLiveSignature &&
      (superAdmin ||
        !!input.autoApproveReason ||
        belowThreshold ||
        (!!policy &&
          (!policy.enabled ||
            policy.autoApproveRoles.includes(requester.role))));
    const allowSelf = policy?.allowSelfApproval ?? false;
    const route = autoApprove
      ? null
      : await nextApprovers(
          policy?.steps ?? [],
          1,
          requester,
          allowSelf,
          new Set(),
          metrics,
        );
    const approverIds =
      route?.approverIds ??
      (autoApprove ? [] : await fallbackApprovers(requester));
    const selfApproved =
      requiresLiveSignature && superAdmin
        ? true
        : !requiresLiveSignature && !autoApprove && approverIds.length === 0;

    const created = await db.approvalRequest.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        revision,
        contentHash: hashContent(
          input.targetType,
          input.targetId,
          revision,
          input.contentData,
        ),
        status: "pending",
        requestedById: requester.id,
        policyId: policy?.id ?? null,
        currentStep: route?.step ?? 1,
        approverIds,
        selfApproved,
        metrics: metrics as object,
        policySnapshot: (input.policySnapshot ?? {}) as object,
        diffPayload: (input.diffPayload ?? undefined) as object | undefined,
        discountReason: input.discountReason ?? null,
      },
    });

    if (!requiresLiveSignature && (autoApprove || selfApproved)) {
      const reason = superAdmin
        ? "super_admin"
        : input.autoApproveReason
          ? input.autoApproveReason
          : belowThreshold
            ? "below_threshold"
            : autoApprove
              ? "policy_auto"
              : "no_alternate_approver";
      await db.approvalDecision.create({
        data: {
          approvalRequestId: created.id,
          decision: "approved",
          decidedById: requester.id,
          reason,
          step: created.currentStep,
        },
      });
      await db.approvalRequest.update({
        where: { id: created.id },
        data: { status: "approved" },
      });
      await finalizerFor(input.targetType).approve(
        input.targetId,
        requester.id,
        reason,
      );
      await db.activityLog.create({
        data: {
          userId: requester.id,
          action: "auto_approve",
          entityType: input.targetType,
          entityId: input.targetId,
          details: { approvalRequestId: created.id, reason },
        },
      });
      return {
        approvalRequestId: created.id,
        status: "approved",
        finalized: true,
        approverIds: [],
      };
    }

    await notify(approverIds, {
      title:
        getTranslations("en").admin.approvals.notifications.awaitingYou.title,
      message: formatMessage(
        getTranslations("en").admin.approvals.notifications.awaitingYou.message,
        {
          type:
            (
              getTranslations("en").admin.approvals.types as Record<
                string,
                string
              >
            )[input.targetType] ?? input.targetType,
        },
      ),
      messageKey: "approvals.notifications.awaitingYou",
      targetType: input.targetType,
      targetId: input.targetId,
    });
    return {
      approvalRequestId: created.id,
      status: "pending",
      finalized: false,
      approverIds,
    };
  });
}

export function canDecideApproval(
  request: {
    status: string;
    requestedById: string;
    approverIds: string[];
    selfApproved?: boolean;
  },
  actor: { id: string; role: string },
): boolean {
  if (request.status !== "pending") return false;
  if (request.approverIds.includes(actor.id)) return true;
  if (
    actor.role === "super_admin" &&
    request.selfApproved &&
    request.requestedById === actor.id
  )
    return true;
  return actor.role === "super_admin" && request.requestedById !== actor.id;
}

export async function decideApprovalRequest(
  approvalRequestId: string,
  actorId: string,
  decision: Decision,
  reason?: string,
  signature?: string | null,
): Promise<ApprovalOutcome> {
  return runAtomicMutation(async () => {
    await db.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${approvalRequestId} FOR UPDATE`;
    const request = await db.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: {
        policy: { include: { steps: { orderBy: { order: "asc" } } } },
        decisions: { select: { decidedById: true } },
      },
    });
    if (!request) throw new Error(serverMessages.approvalRequestNotFound);
    if (request.status !== "pending")
      throw new Error(
        formatMessage(serverTemplates.thisRequestIsAlready0, {
          0: request.status,
        }),
      );
    const actor = await db.user.findUniqueOrThrow({
      where: { id: actorId },
      select: { id: true, role: true, isActive: true },
    });
    if (!actor.isActive)
      throw new Error(serverMessages.inactiveUsersCannotDecideApprovals);
    if (!canDecideApproval(request, actor)) {
      throw new Error(
        request.requestedById === actorId
          ? "You cannot approve or reject your own request"
          : "You are not an approver for this request",
      );
    }
    if (decision === "rejected" && !reason?.trim())
      throw new Error(serverMessages.aReasonIsRequiredToRejectA);
    let signatureData: string | null = null;
    if (decision === "approved") {
      if (signature) {
        validateSignatureImage(signature);
        signatureData = signature;
      } else if ((await getSignatureMode(request.targetType)) === "live") {
        throw new Error(serverMessages.thisDocumentMustBeSignedNowDraw);
      }
    }

    await db.approvalDecision.create({
      data: {
        approvalRequestId,
        decision,
        decidedById: actorId,
        reason: reason?.trim() || null,
        step: request.currentStep,
        signatureData,
      },
    });

    const requester = await db.user.findUniqueOrThrow({
      where: { id: request.requestedById },
      select: { id: true, role: true, managerId: true },
    });

    if (decision === "approved") {
      const alreadyDecided = new Set([
        ...request.decisions.map((d) => d.decidedById),
        actorId,
      ]);
      const next = await nextApprovers(
        request.policy?.steps ?? [],
        request.currentStep + 1,
        requester,
        request.policy?.allowSelfApproval ?? false,
        alreadyDecided,
        (request.metrics ?? {}) as ApprovalMetrics,
      );
      if (next) {
        await db.approvalRequest.update({
          where: { id: approvalRequestId },
          data: {
            currentStep: next.step,
            approverIds: next.approverIds,
            stepStartedAt: new Date(),
            remindedAt: null,
            escalatedAt: null,
          },
        });
        await notify(next.approverIds, {
          title:
            getTranslations("en").admin.approvals.notifications.awaitingYou
              .title,
          message: formatMessage(
            getTranslations("en").admin.approvals.notifications.awaitingYou
              .message,
            {
              type:
                (
                  getTranslations("en").admin.approvals.types as Record<
                    string,
                    string
                  >
                )[request.targetType] ?? request.targetType,
            },
          ),
          messageKey: "approvals.notifications.awaitingYou",
          targetType: request.targetType,
          targetId: request.targetId,
        });
        return {
          approvalRequestId,
          status: "pending",
          finalized: false,
          approverIds: next.approverIds,
        };
      }
    }

    await db.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: decision },
    });
    const finalizer = finalizerFor(request.targetType);
    if (decision === "approved")
      await finalizer.approve(request.targetId, actorId, reason);
    else await finalizer.reject(request.targetId, actorId, reason);

    await notify([request.requestedById], {
      title: decision === "approved" ? "Request approved" : "Request rejected",
      message:
        reason?.trim() ||
        (decision === "approved"
          ? "Your request was approved."
          : "Your request was rejected."),
      messageKey:
        decision === "approved"
          ? "approvals.notifications.approved"
          : "approvals.notifications.rejected",
      targetType: request.targetType,
      targetId: request.targetId,
      type: decision === "approved" ? "success" : "warning",
    });
    return {
      approvalRequestId,
      status: decision,
      finalized: true,
      approverIds: [],
    };
  });
}

export async function findPendingApproval(
  targetType: ApprovalTargetType,
  targetId: string,
) {
  return db.approvalRequest.findFirst({
    where: { targetType, targetId, status: "pending" },
    orderBy: { revision: "desc" },
    select: {
      id: true,
      requestedById: true,
      approverIds: true,
      status: true,
      currentStep: true,
    },
  });
}

export async function cancelPendingApprovals(
  targetType: ApprovalTargetType,
  targetId: string,
) {
  await db.approvalRequest.updateMany({
    where: { targetType, targetId, status: "pending" },
    data: { status: "cancelled" },
  });
}

export async function processApprovalTimeouts(
  now = new Date(),
): Promise<{ reminded: number; escalated: number }> {
  const pending = await db.approvalRequest.findMany({
    where: { status: "pending", policyId: { not: null } },
    select: {
      id: true,
      targetType: true,
      targetId: true,
      currentStep: true,
      approverIds: true,
      requestedById: true,
      stepStartedAt: true,
      remindedAt: true,
      escalatedAt: true,
      policy: { select: { reminderAfterHours: true, steps: true } },
    },
  });
  let reminded = 0;
  let escalated = 0;
  for (const request of pending) {
    const waitedHours =
      (now.getTime() - request.stepStartedAt.getTime()) / 3_600_000;
    const step = request.policy?.steps.find(
      (s) => s.order === request.currentStep,
    );
    if (
      step?.escalateAfterHours &&
      !request.escalatedAt &&
      waitedHours >= step.escalateAfterHours
    ) {
      const targets =
        step.escalateMode === "role" && step.escalateRoleKey
          ? await activeUserIds({ role: step.escalateRoleKey })
          : step.escalateMode === "user" && step.escalateUserId
            ? await activeUserIds({ id: step.escalateUserId })
            : [];
      const added = targets.filter(
        (id) =>
          id !== request.requestedById && !request.approverIds.includes(id),
      );
      await db.approvalRequest.update({
        where: { id: request.id },
        data: {
          escalatedAt: now,
          approverIds: [...request.approverIds, ...added],
        },
      });
      await notify(added, {
        title:
          getTranslations("en").admin.approvals.notifications.escalated.title,
        message: formatMessage(
          getTranslations("en").admin.approvals.notifications.escalated.message,
          {
            type:
              (
                getTranslations("en").admin.approvals.types as Record<
                  string,
                  string
                >
              )[request.targetType] ?? request.targetType,
          },
        ),
        messageKey: "approvals.notifications.escalated",
        targetType: request.targetType,
        targetId: request.targetId,
        type: "warning",
      });
      await db.activityLog.create({
        data: {
          userId: request.requestedById,
          action: "escalate",
          entityType: request.targetType,
          entityId: request.targetId,
          details: {
            approvalRequestId: request.id,
            step: request.currentStep,
            added,
          },
        },
      });
      escalated++;
      continue;
    }
    const remindAfter = request.policy?.reminderAfterHours;
    if (remindAfter && !request.remindedAt && waitedHours >= remindAfter) {
      await db.approvalRequest.update({
        where: { id: request.id },
        data: { remindedAt: now },
      });
      await notify(request.approverIds, {
        title:
          getTranslations("en").admin.approvals.notifications.reminder.title,
        message: formatMessage(
          getTranslations("en").admin.approvals.notifications.reminder.message,
          {
            type:
              (
                getTranslations("en").admin.approvals.types as Record<
                  string,
                  string
                >
              )[request.targetType] ?? request.targetType,
          },
        ),
        messageKey: "approvals.notifications.reminder",
        targetType: request.targetType,
        targetId: request.targetId,
      });
      reminded++;
    }
  }
  return { reminded, escalated };
}
