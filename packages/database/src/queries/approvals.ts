import crypto from "node:crypto";
import { db } from "../db";
import { ApprovalRequest, ApprovalDecision, ApprovalTargetType } from "../types";

export function computeContentHash(data: unknown, revision: number): string {
  const serialized = JSON.stringify(data, Object.keys(data as object || {}).sort());
  return crypto.createHash("sha256").update(`${revision}:${serialized}`).digest("hex");
}

export async function createApprovalRequest(input: {
  targetType: ApprovalTargetType;
  targetId: string;
  revision?: number;
  requestedById: string;
  policySnapshot: Record<string, unknown>;
  diffPayload?: Record<string, unknown> | null;
  discountReason?: string | null;
  contentData?: unknown;
}): Promise<ApprovalRequest> {
  const revision = input.revision || 1;
  const contentHash = input.contentData
    ? computeContentHash(input.contentData, revision)
    : crypto.createHash("sha256").update(`${input.targetType}:${input.targetId}:${revision}`).digest("hex");

  // Supersede existing pending requests for the same target
  await db.approvalRequest.updateMany({
    where: {
      targetType: input.targetType,
      targetId: input.targetId,
      status: "pending",
    },
    data: {
      status: "superseded",
    },
  });

  const created = await db.approvalRequest.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      revision,
      contentHash,
      status: "pending",
      requestedById: input.requestedById,
      policySnapshot: input.policySnapshot as any,
      diffPayload: (input.diffPayload || null) as any,
      discountReason: input.discountReason || null,
    },
    include: {
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
      decisions: {
        include: {
          decidedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
    },
  });

  const actor = await db.user.findUnique({ where: { id: input.requestedById }, select: { role: true } });
  if (actor?.role === "super_admin") {
    const result = await decideApproval(created.id, "approved", { id: input.requestedById, role: actor.role }, "Automatic Super Admin approval");
    created.status = "approved";
    created.decisions.push({ ...result.decision, decidedAt: new Date(result.decision.decidedAt) } as typeof created.decisions[number]);
    await db.activityLog.create({ data: { userId: input.requestedById, action: "auto_approve", entityType: input.targetType, entityId: input.targetId, details: { approvalRequestId: created.id } } });
  }
  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    decisions: created.decisions.map((d) => ({
      ...d,
      decidedAt: d.decidedAt.toISOString(),
    })),
  };
}

export async function getApprovalRequest(
  targetType: string,
  targetId: string,
  revision?: number,
): Promise<ApprovalRequest | null> {
  const whereClause: any = { targetType, targetId };
  if (revision !== undefined) {
    whereClause.revision = revision;
  }

  const record = await db.approvalRequest.findFirst({
    where: whereClause,
    orderBy: { revision: "desc" },
    include: {
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
      decisions: {
        include: {
          decidedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { decidedAt: "desc" },
      },
    },
  });

  if (!record) return null;

  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    decisions: record.decisions.map((d) => ({
      ...d,
      decidedAt: d.decidedAt.toISOString(),
    })),
  };
}

export async function listApprovalRequests(filters: {
  visibleToUserId?: string;
  readableTargetTypes?: string[];
  targetType?: string;
  status?: string;
  requestedById?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: ApprovalRequest[]; total: number }> {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
  const where: any = {};

  if (filters.visibleToUserId) where.OR = [{ requestedById: filters.visibleToUserId }, { targetType: { in: filters.readableTargetTypes || [] } }];
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.status) where.status = filters.status;
  if (filters.requestedById) where.requestedById = filters.requestedById;

  const [total, records] = await Promise.all([
    db.approvalRequest.count({ where }),
    db.approvalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true },
        },
        decisions: {
          include: {
            decidedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    items: records.map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      decisions: record.decisions.map((d) => ({
        ...d,
        decidedAt: d.decidedAt.toISOString(),
      })),
    })),
  };
}

export async function decideApproval(
  approvalRequestId: string,
  decision: "approved" | "rejected",
  decider: { id: string; role: string },
  reason?: string,
): Promise<{ success: boolean; decision: ApprovalDecision }> {
  const request = await db.approvalRequest.findUnique({
    where: { id: approvalRequestId },
  });

  if (!request) {
    throw new Error("Approval request not found");
  }

  if (request.status !== "pending") {
    throw new Error(`Approval request cannot be decided: current status is ${request.status}`);
  }

  // Maker/Checker Rule 1: No self-approval for financial documents or payroll
  const isFinancial =
    request.targetType === "quotation" ||
    request.targetType === "invoice" ||
    request.targetType === "payroll_run";

  if (isFinancial && request.requestedById === decider.id && decider.role !== "super_admin") {
    throw new Error("Maker-checker violation: creators cannot self-approve financial or payroll documents");
  }

  // Maker/Checker Rule 2: Super Admin must approve financial documents and payroll
  if (isFinancial && decider.role !== "super_admin") {
    throw new Error("Unauthorized: Super Admin approval is strictly required for financial documents and payroll");
  }

  // Maker/Checker Rule 3: No self-approval for profile changes or leave
  if ((request.targetType === "profile_change" || request.targetType === "leave_request") && request.requestedById === decider.id && decider.role !== "super_admin") {
    throw new Error("Self-approval is forbidden: requests must be reviewed by an authorized manager or administrator");
  }

  const actor = await db.user.findUnique({ where: { id: decider.id }, select: { role: true, permissions: true } });
  if (!actor || actor.role !== decider.role) throw new Error("Invalid approval actor");
  const resource = request.targetType === "payroll_run" ? "payroll" : request.targetType === "quotation" ? "quotations" : request.targetType === "invoice" ? "invoices" : request.targetType === "leave_request" ? "employees" : "profile_changes";
  const { hasPermission } = await import("./permissions");
  if (!(await hasPermission(actor.role, resource, "approve", actor.permissions as Record<string, boolean> | undefined))) throw new Error("Approval permission required");
  // Record the decision in a transaction
  const result = await db.$transaction(async (tx) => {
    const dec = await tx.approvalDecision.create({
      data: {
        approvalRequestId,
        decision,
        decidedById: decider.id,
        reason: reason || null,
      },
      include: {
        decidedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    await tx.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: decision,
      },
    });

    // Update target document based on decision
    if (request.targetType === "quotation") {
      await tx.quotation.update({
        where: { id: request.targetId },
        data: {
          status: decision === "approved" ? "approved" : "draft",
        },
      });
    } else if (request.targetType === "invoice") {
      await tx.invoice.update({
        where: { id: request.targetId },
        data: {
          approvalStatus: decision === "approved" ? "approved" : "rejected",
        },
      });
    } else if (request.targetType === "payroll_run") {
      await tx.payrollRun.update({
        where: { id: request.targetId },
        data: {
          status: decision === "approved" ? "approved" : "draft",
          approvedById: decision === "approved" ? decider.id : null,
          approvedAt: decision === "approved" ? new Date() : null,
        },
      });
    } else if (request.targetType === "profile_change") {
      const { approveProfileChange, rejectProfileChange } = await import("./profile-changes");
      if (decision === "approved") await approveProfileChange(request.targetId, decider.id, actor.role, reason);
      else await rejectProfileChange(request.targetId, decider.id, reason || "Rejected");
    } else if (request.targetType === "leave_request") {
      const { approveLeaveRequest, rejectLeaveRequest } = await import("./leave");
      if (decision === "approved") await approveLeaveRequest(request.targetId, decider.id, reason);
      else await rejectLeaveRequest(request.targetId, decider.id, reason || "Rejected");
    }

    return dec;
  });

  return {
    success: true,
    decision: {
      ...result,
      decidedAt: result.decidedAt.toISOString(),
    },
  };
}
