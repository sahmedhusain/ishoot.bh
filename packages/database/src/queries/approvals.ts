import { db } from "../db";
import type { ApprovalRequest } from "../types";
import { decideApprovalRequest } from "../services/approval-engine";

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
  /** Only requests this user can decide now. */
  awaitingUserId?: string;
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

  if (filters.awaitingUserId)
    where.approverIds = { has: filters.awaitingUserId };
  if (filters.visibleToUserId)
    where.OR = [
      { requestedById: filters.visibleToUserId },
      { approverIds: { has: filters.visibleToUserId } },
      { decisions: { some: { decidedById: filters.visibleToUserId } } },
      { targetType: { in: filters.readableTargetTypes || [] } },
    ];
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

/** Decides an approval through the policy engine. Kept for existing callers. */
export async function decideApproval(
  approvalRequestId: string,
  decision: "approved" | "rejected",
  decider: { id: string },
  reason?: string,
) {
  return decideApprovalRequest(approvalRequestId, decider.id, decision, reason);
}
