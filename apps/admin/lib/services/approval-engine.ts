import {
  serverTemplates,
  getTranslations,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import crypto from "node:crypto";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow, type ServiceSchema } from "../api/tables";
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

async function findById(
  service: ServiceSchema,
  table: string,
  id: string,
): Promise<Record<string, any> | null> {
  const rows = await listTableRows<Record<string, any>>(service, table);
  return rows.find((r) => r.id === id) ?? null;
}

async function updateById(
  service: ServiceSchema,
  table: string,
  id: string,
  patch: Record<string, unknown>,
) {
  const existing = await findById(service, table, id);
  return upsertTableRow(service, table, {
    ...(existing ?? {}),
    id,
    ...patch,
  });
}

export async function approvalMetrics(
  targetType: string,
  targetId: string,
): Promise<ApprovalMetrics> {
  switch (targetType) {
    case "purchase_requisition": {
      const r = await findById("inventory", "purchase_requisition", targetId);
      return r ? { amount: Number(r.estimatedTotal) } : {};
    }
    case "purchase_order": {
      const o = await findById("inventory", "purchase_order", targetId);
      return o ? { amount: Number(o.total) } : {};
    }
    case "quotation": {
      const q = await findById("sales", "quotation", targetId);
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
      const i = await findById("finance", "invoice", targetId);
      return i
        ? {
            amount: await toCompanyCurrency(Number(i.totalAmount), i.currency),
            discountPercent: discountPercent(i.subtotal, i.discountAmount),
          }
        : {};
    }
    case "expense": {
      const e = await findById("finance", "expense", targetId);
      return e ? { amount: await toCompanyCurrency(Number(e.amount), e.currency) } : {};
    }
    case "expense_claim": {
      const c = await findById("finance", "expense_claim", targetId);
      return c ? { amount: await toCompanyCurrency(Number(c.amount), c.currency) } : {};
    }
    case "payroll_run": {
      const r = await findById("hr", "payroll_run", targetId);
      return r ? { amount: round3(Number(r.totalNet)) } : {};
    }
    case "leave_request": {
      const l = await findById("hr", "leave_request", targetId);
      return l
        ? {
            days: leaveDaysRequested(
              new Date(l.startDate),
              new Date(l.endDate),
              l.fullDay,
              l.hours ? Number(l.hours) : null,
            ),
          }
        : {};
    }
    case "asset_handover": {
      const h = await findById("itsm", "asset_handover", targetId);
      const asset = h?.assetId ? await findById("itsm", "asset", h.assetId) : null;
      return asset?.purchaseCost != null
        ? {
            amount: await toCompanyCurrency(Number(asset.purchaseCost), asset.currency),
          }
        : {};
    }
    case "final_settlement": {
      const f = await findById("system", "final_settlement", targetId);
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
      const document = await findById("hr", "salary_document", id);
      if (!document) throw new Error(serverMessages.salaryDocumentRequestHasAlreadyBeenReviewed);
      if (document.status !== "pending")
        throw new Error(
          serverMessages.salaryDocumentRequestHasAlreadyBeenReviewed,
        );
      const snapshot = await salaryDocumentSnapshot(
        document.employeeId,
        document.kind,
        document.months as string[],
      );
      await updateById("hr", "salary_document", id, {
        status: "issued",
        reviewedById: decider,
        reviewNotes: reason || null,
        snapshot,
        issuedAt: new Date().toISOString(),
      });
    },
    async reject(id, decider, reason) {
      await updateById("hr", "salary_document", id, {
        status: "rejected",
        reviewedById: decider,
        reviewNotes: reason || null,
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
      void (await updateById("finance", "expense", id, {
        status: "approved",
        reviewNotes: reason || null,
      })),
    reject: async (id, _decider, reason) =>
      void (await updateById("finance", "expense", id, {
        status: "rejected",
        reviewNotes: reason || null,
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
      const claim = await findById("finance", "expense_claim", id);
      if (!claim) throw new Error("Expense claim not found");
      if (claim.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.claimIs0ItCanNoLonger, {
            0: claim.status,
          }),
        );
      await updateById("finance", "expense_claim", id, {
        status: "approved",
        reviewNotes: reason || null,
      });
    },
    async reject(id, _decider, reason) {
      const claim = await findById("finance", "expense_claim", id);
      if (!claim) throw new Error("Expense claim not found");
      if (claim.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.claimIs0ItCanNoLonger2, {
            0: claim.status,
          }),
        );
      await updateById("finance", "expense_claim", id, {
        status: "rejected",
        reviewNotes: reason || null,
      });
    },
  },
  quotation: {
    approve: async (id) =>
      void (await updateById("sales", "quotation", id, { status: "approved" })),
    reject: async (id) =>
      void (await updateById("sales", "quotation", id, { status: "draft" })),
  },
  invoice: {
    approve: async (id) =>
      void (await updateById("finance", "invoice", id, { approvalStatus: "approved" })),
    reject: async (id) =>
      void (await updateById("finance", "invoice", id, { approvalStatus: "rejected" })),
  },
  payroll_run: {
    async approve(id, decider) {
      const run = await findById("hr", "payroll_run", id);
      if (!run) throw new Error("Payroll run not found");
      if (run.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.payrollRunIs0ItCanNo, {
            0: run.status,
          }),
        );
      await updateById("hr", "payroll_run", id, {
        status: "approved",
        approvedById: decider,
        approvedAt: new Date().toISOString(),
      });
    },
    async reject(id) {
      const run = await findById("hr", "payroll_run", id);
      if (!run) throw new Error("Payroll run not found");
      if (run.status !== "submitted")
        throw new Error(
          formatMessage(serverTemplates.payrollRunIs0ItCanNo2, {
            0: run.status,
          }),
        );
      await updateById("hr", "payroll_run", id, {
        status: "draft",
        approvedById: null,
        approvedAt: null,
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
  where: { id?: string | { in: string[] }; role?: string },
): Promise<string[]> {
  const users = await listTableRows<Record<string, any>>("identity", "user");
  return users
    .filter((u) => {
      if (!u.isActive) return false;
      if (where.role && u.role !== where.role) return false;
      if (typeof where.id === "string" && u.id !== where.id) return false;
      if (where.id && typeof where.id === "object" && !where.id.in.includes(u.id))
        return false;
      return true;
    })
    .map((u) => u.id);
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
      const [account, employees, departments] = await Promise.all([
        findById("identity", "user", requester.id),
        listTableRows<Record<string, any>>("hr", "employee"),
        listTableRows<Record<string, any>>("hr", "department"),
      ]);
      const emp = employees.find((e) => e.userId === requester.id || e.id === requester.id);
      let departmentId = account?.departmentId ?? emp?.departmentId ?? null;
      for (let level = 0; departmentId && level < 8; level++) {
        const department = departments.find((d) => d.id === departmentId);
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
      const users = (await listTableRows<Record<string, any>>("identity", "user")).filter(
        (u) => u.isActive,
      );
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
  for (const userId of userIds) {
    await upsertTableRow("notify", "notification", {
      id: crypto.randomUUID(),
      userId,
      title: input.title,
      message: input.message,
      type: input.type ?? "action",
      entityType: input.targetType,
      entityId: input.targetId,
      messageKey: input.messageKey,
      messageParams: { targetType: input.targetType },
      actionUrl: approvalTargetUrl(input.targetType, input.targetId),
    });
  }
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

const reqTargetType = (r: Record<string, any>): string =>
  r.targetType ?? r.entityType ?? r.kind ?? "";
const reqTargetId = (r: Record<string, any>): string =>
  r.targetId ?? r.entityId ?? "";
const reqRequesterId = (r: Record<string, any>): string =>
  r.requestedById ?? r.requesterId ?? "";

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
    const [requesterRow, policies, policySteps, existingRequests] =
      await Promise.all([
        findById("identity", "user", input.requesterId),
        listTableRows<Record<string, any>>("system", "approval_policy"),
        listTableRows<Record<string, any>>("system", "approval_policy_step"),
        listTableRows<Record<string, any>>("workflow", "approval_request"),
      ]);
    if (!requesterRow) throw new Error("Requester not found");
    const requester: Requester = {
      id: requesterRow.id,
      role: requesterRow.role,
      managerId: requesterRow.managerId ?? null,
    };
    const policyRow = policies.find((p) => p.targetType === input.targetType);
    const steps = policyRow
      ? (policySteps
          .filter((s) => s.policyId === policyRow.id)
          .sort((a, b) => Number(a.order) - Number(b.order)) as PolicyStep[])
      : ([] as PolicyStep[]);
    const policy: Record<string, any> | null = policyRow ? { ...policyRow, steps } : null;

    const matchingReqs = existingRequests.filter(
      (r) => reqTargetType(r) === input.targetType && reqTargetId(r) === input.targetId,
    );
    for (const pending of matchingReqs.filter((r) => r.status === "pending")) {
      await upsertTableRow("workflow", "approval_request", {
        ...pending,
        status: "superseded",
      });
    }
    const latest = matchingReqs.sort(
      (a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0),
    )[0];
    const revision = (Number(latest?.revision ?? 0)) + 1;
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
            (Array.isArray(policy.autoApproveRoles) &&
              policy.autoApproveRoles.includes(requester.role)))));
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

    const created = await upsertTableRow<Record<string, any>>(
      "workflow",
      "approval_request",
      {
        id: crypto.randomUUID(),
        kind: input.targetType,
        entityType: input.targetType,
        entityId: input.targetId,
        requesterId: requester.id,
        priority: "normal",
        reason: input.discountReason ?? null,
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
        stepStartedAt: new Date().toISOString(),
      },
    );

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
      await upsertTableRow("workflow", "approval_decision", {
        id: crypto.randomUUID(),
        requestId: created.id,
        approvalRequestId: created.id,
        decision: "approved",
        approverId: requester.id,
        decidedById: requester.id,
        comments: reason,
        reason,
        step: route?.step ?? 1,
      });
      await upsertTableRow("workflow", "approval_request", {
        ...created,
        status: "approved",
      });
      await finalizerFor(input.targetType).approve(
        input.targetId,
        requester.id,
        reason,
      );
      await upsertTableRow("system", "activity_log", {
        id: crypto.randomUUID(),
        userId: requester.id,
        action: "auto_approve",
        entityType: input.targetType,
        entityId: input.targetId,
        details: { approvalRequestId: created.id, reason },
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
    const [requestRow, policies, policySteps, decisions, users] =
      await Promise.all([
        findById("workflow", "approval_request", approvalRequestId),
        listTableRows<Record<string, any>>("system", "approval_policy"),
        listTableRows<Record<string, any>>("system", "approval_policy_step"),
        listTableRows<Record<string, any>>("workflow", "approval_decision"),
        listTableRows<Record<string, any>>("identity", "user"),
      ]);
    if (!requestRow) throw new Error(serverMessages.approvalRequestNotFound);
    const policyRow = requestRow.policyId
      ? policies.find((p) => p.id === requestRow.policyId)
      : null;
    const steps = policyRow
      ? (policySteps
          .filter((s) => s.policyId === policyRow.id)
          .sort((a, b) => Number(a.order) - Number(b.order)) as PolicyStep[])
      : ([] as PolicyStep[]);
    const reqDecisions = decisions.filter(
      (d) => (d.requestId ?? d.approvalRequestId) === approvalRequestId,
    );
    const request: Record<string, any> = {
      ...requestRow,
      targetType: reqTargetType(requestRow),
      targetId: reqTargetId(requestRow),
      requestedById: reqRequesterId(requestRow),
      currentStep: Number(requestRow.currentStep ?? 1),
      approverIds: Array.isArray(requestRow.approverIds)
        ? requestRow.approverIds
        : [],
      policy: policyRow ? ({ ...policyRow, steps } as Record<string, any>) : null,
      decisions: reqDecisions,
    };
    if (request.status !== "pending")
      throw new Error(
        formatMessage(serverTemplates.thisRequestIsAlready0, {
          0: request.status,
        }),
      );
    const actor = users.find((u) => u.id === actorId);
    if (!actor) throw new Error("Actor not found");
    if (!actor.isActive)
      throw new Error(serverMessages.inactiveUsersCannotDecideApprovals);
    if (
      !canDecideApproval(
        {
          status: request.status,
          requestedById: request.requestedById,
          approverIds: request.approverIds,
          selfApproved: request.selfApproved,
        },
        { id: actor.id, role: actor.role },
      )
    ) {
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

    await upsertTableRow("workflow", "approval_decision", {
      id: crypto.randomUUID(),
      requestId: approvalRequestId,
      approvalRequestId,
      decision,
      approverId: actorId,
      decidedById: actorId,
      comments: reason?.trim() || null,
      reason: reason?.trim() || null,
      step: request.currentStep,
      signatureData,
    });

    const requesterRow = users.find((u) => u.id === request.requestedById);
    if (!requesterRow) throw new Error("Requester not found");
    const requester: Requester = {
      id: requesterRow.id,
      role: requesterRow.role,
      managerId: requesterRow.managerId ?? null,
    };

    if (decision === "approved") {
      const alreadyDecided = new Set([
        ...request.decisions.map((d: any) => d.approverId ?? d.decidedById),
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
        await upsertTableRow("workflow", "approval_request", {
          ...requestRow,
          currentStep: next.step,
          approverIds: next.approverIds,
          stepStartedAt: new Date().toISOString(),
          remindedAt: null,
          escalatedAt: null,
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

    await upsertTableRow("workflow", "approval_request", {
      ...requestRow,
      status: decision,
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
  const rows = await listTableRows<Record<string, any>>(
    "workflow",
    "approval_request",
  );
  const found = rows
    .filter(
      (r) =>
        reqTargetType(r) === targetType &&
        reqTargetId(r) === targetId &&
        r.status === "pending",
    )
    .sort((a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0))[0];
  if (!found) return null;
  return {
    id: found.id,
    requestedById: reqRequesterId(found),
    approverIds: Array.isArray(found.approverIds) ? found.approverIds : [],
    status: found.status,
    currentStep: Number(found.currentStep ?? 1),
  };
}

export async function cancelPendingApprovals(
  targetType: ApprovalTargetType,
  targetId: string,
) {
  const rows = await listTableRows<Record<string, any>>(
    "workflow",
    "approval_request",
  );
  for (const r of rows.filter(
    (row) =>
      reqTargetType(row) === targetType &&
      reqTargetId(row) === targetId &&
      row.status === "pending",
  )) {
    await upsertTableRow("workflow", "approval_request", {
      ...r,
      status: "cancelled",
    });
  }
}

export async function processApprovalTimeouts(
  now = new Date(),
): Promise<{ reminded: number; escalated: number }> {
  const [requests, policies, policySteps] = await Promise.all([
    listTableRows<Record<string, any>>("workflow", "approval_request"),
    listTableRows<Record<string, any>>("system", "approval_policy"),
    listTableRows<Record<string, any>>("system", "approval_policy_step"),
  ]);
  const pending = requests.filter(
    (r) => r.status === "pending" && r.policyId != null,
  );
  let reminded = 0;
  let escalated = 0;
  for (const request of pending) {
    const stepStartedAt = new Date(request.stepStartedAt || request.createdAt);
    const waitedHours = (now.getTime() - stepStartedAt.getTime()) / 3_600_000;
    const policy = policies.find((p) => p.id === request.policyId);
    const steps = policy
      ? policySteps.filter((s) => s.policyId === policy.id)
      : [];
    const step = steps.find((s) => s.order === request.currentStep);
    const approverIds: string[] = Array.isArray(request.approverIds)
      ? request.approverIds
      : [];
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
        (id) => id !== request.requestedById && !approverIds.includes(id),
      );
      await upsertTableRow("workflow", "approval_request", {
        ...request,
        escalatedAt: now.toISOString(),
        approverIds: [...approverIds, ...added],
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
      await upsertTableRow("system", "activity_log", {
        id: crypto.randomUUID(),
        userId: request.requestedById,
        action: "escalate",
        entityType: request.targetType,
        entityId: request.targetId,
        details: {
          approvalRequestId: request.id,
          step: request.currentStep,
          added,
        },
      });
      escalated++;
      continue;
    }
    const remindAfter = policy?.reminderAfterHours;
    if (remindAfter && !request.remindedAt && waitedHours >= remindAfter) {
      await upsertTableRow("workflow", "approval_request", {
        ...request,
        remindedAt: now.toISOString(),
      });
      await notify(approverIds, {
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
