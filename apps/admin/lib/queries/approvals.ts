import { listTableRows } from "../api/tables";
import type { ApprovalRequest } from "../types";
import { decideApprovalRequest } from "../services/approval-engine";

const toIso = (v: unknown) => (v ? new Date(v as any).toISOString() : new Date().toISOString());

function hydrateRequest(
  record: Record<string, any>,
  allDecisions: Record<string, any>[],
  userById: Map<string, { id: string; fullName: string; email: string }>,
): ApprovalRequest {
  const decisions = allDecisions
    .filter((d) => d.approvalRequestId === record.id)
    .sort((a, b) => new Date(b.decidedAt ?? 0).getTime() - new Date(a.decidedAt ?? 0).getTime())
    .map((d) => ({
      ...d,
      decidedBy: d.decidedById ? (userById.get(String(d.decidedById)) ?? null) : null,
      decidedAt: toIso(d.decidedAt),
    }));

  return {
    ...(record as any),
    requestedBy: record.requestedById
      ? (userById.get(String(record.requestedById)) ?? null)
      : null,
    createdAt: toIso(record.createdAt),
    updatedAt: toIso(record.updatedAt),
    decisions,
  };
}

export async function getApprovalRequest(
  targetType: string,
  targetId: string,
  revision?: number,
): Promise<ApprovalRequest | null> {
  const [requests, decisions, users] = await Promise.all([
    listTableRows<Record<string, any>>("workflow", "approval_request"),
    listTableRows<Record<string, any>>("workflow", "approval_decision"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);
  const matches = requests
    .filter(
      (r) =>
        r.targetType === targetType &&
        r.targetId === targetId &&
        (revision === undefined || Number(r.revision) === revision),
    )
    .sort((a, b) => Number(b.revision ?? 0) - Number(a.revision ?? 0));
  const record = matches[0];
  if (!record) return null;

  const userById = new Map(
    users.map((u) => [
      String(u.id),
      { id: String(u.id), fullName: String(u.fullName ?? ""), email: String(u.email ?? "") },
    ]),
  );
  return hydrateRequest(record, decisions, userById);
}

export async function listApprovalRequests(filters: {
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

  const [requests, decisions, users] = await Promise.all([
    listTableRows<Record<string, any>>("workflow", "approval_request", "created_at DESC"),
    listTableRows<Record<string, any>>("workflow", "approval_decision"),
    listTableRows<Record<string, any>>("identity", "user"),
  ]);

  const readableSet = new Set(filters.readableTargetTypes || []);
  const decidersByReq = new Map<string, Set<string>>();
  for (const d of decisions) {
    const rid = String(d.approvalRequestId ?? "");
    const set = decidersByReq.get(rid) ?? new Set<string>();
    if (d.decidedById) set.add(String(d.decidedById));
    decidersByReq.set(rid, set);
  }

  const filtered = requests
    .filter((r) => {
      const approverIds = Array.isArray(r.approverIds) ? r.approverIds.map(String) : [];
      if (filters.awaitingUserId && !approverIds.includes(filters.awaitingUserId))
        return false;
      if (filters.visibleToUserId) {
        const uid = filters.visibleToUserId;
        const decided = decidersByReq.get(String(r.id))?.has(uid) ?? false;
        if (
          r.requestedById !== uid &&
          !approverIds.includes(uid) &&
          !decided &&
          !readableSet.has(String(r.targetType ?? ""))
        ) {
          return false;
        }
      }
      if (filters.targetType && r.targetType !== filters.targetType) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.requestedById && r.requestedById !== filters.requestedById) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  const userById = new Map(
    users.map((u) => [
      String(u.id),
      { id: String(u.id), fullName: String(u.fullName ?? ""), email: String(u.email ?? "") },
    ]),
  );

  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);
  return {
    total: filtered.length,
    items: slice.map((r) => hydrateRequest(r, decisions, userById)),
  };
}

export async function decideApproval(
  approvalRequestId: string,
  decision: "approved" | "rejected",
  decider: { id: string },
  reason?: string,
) {
  return decideApprovalRequest(approvalRequestId, decider.id, decision, reason);
}
