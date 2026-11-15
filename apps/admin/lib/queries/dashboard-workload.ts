import { listHRUsers } from "../api/hr";
import { listInquiries } from "../api/sales";
import { listApprovals } from "../api/workflow";
import { STALE_APPROVAL_DAYS } from "../constants/approvals";
import {
  REQUEST_CLOSED_STATUSES,
  REQUEST_KINDS,
  requestKindOf,
  type RequestKind,
} from "../constants/requests";

const DAY = 86400000;

const countBy = <T extends string>(
  groups: { key: string | null | undefined; count: number }[],
  keys?: readonly T[],
) => {
  const out: Record<string, number> = Object.fromEntries(
    (keys ?? []).map((k) => [k, 0]),
  );
  for (const g of groups) {
    const k = g.key ?? "none";
    out[k] = (out[k] ?? 0) + g.count;
  }
  return out;
};

const hoursBetween = (from: Date, to: Date) =>
  Math.max(0, (to.getTime() - from.getTime()) / 3600000);

const average = (values: number[]) =>
  values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : null;

const parseDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

export interface ApprovalQueueItem {
  id: string;
  targetType: string;
  targetId: string;
  requester: string;
  currentStep: number;
  createdAt: string;
}

export interface ApprovalWorkload {
  awaitingMe: number;
  awaitingMeByType: Record<string, number>;
  oldestAwaitingAt: string | null;
  queue: ApprovalQueueItem[];
  mySubmittedPending: number;
  myDecidedLast30: number;
  org: {
    pending: number;
    stale: number;
    byType: Record<string, number>;
    approvedLast30: number;
    rejectedLast30: number;
    avgDecisionHours: number | null;
  } | null;
}

export async function getApprovalWorkload(
  userId: string,
  readableTargetTypes: string[],
  now = new Date(),
): Promise<ApprovalWorkload> {
  const [approvals, users] = await Promise.all([
    listApprovals().catch(() => []),
    listHRUsers().catch(() => []),
  ]);
  const userNames = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u.fullName || u.email || u.id]));
  const since = new Date(now.getTime() - 30 * DAY);

  const awaiting = approvals
    .filter((a: any) => {
      if (a.status !== "pending") return false;
      const ids: string[] = Array.isArray(a.approverIds) ? a.approverIds : [];
      return ids.includes(userId);
    })
    .sort((a: any, b: any) =>
      String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
    );

  const awaitingMeByType = countBy(
    awaiting.map((a: any) => ({ key: a.targetType, count: 1 })),
  );

  const mySubmittedPending = approvals.filter(
    (a: any) => a.status === "pending" && a.requestedById === userId,
  ).length;

  let myDecidedLast30 = 0;
  for (const a of approvals as any[]) {
    if (Array.isArray(a.decisions)) {
      for (const d of a.decisions) {
        const dt = parseDate(d.decidedAt);
        if (d.decidedById === userId && dt && dt >= since) myDecidedLast30++;
      }
    }
  }

  let org: ApprovalWorkload["org"] = null;
  if (readableTargetTypes.length) {
    const scopeSet = new Set(readableTargetTypes);
    const scoped = approvals.filter((a: any) => scopeSet.has(a.targetType));
    const pendingScoped = scoped.filter((a: any) => a.status === "pending");
    const staleCutoff = new Date(now.getTime() - STALE_APPROVAL_DAYS * DAY);
    const stale = pendingScoped.filter((a: any) => {
      const c = parseDate(a.createdAt);
      return c ? c < staleCutoff : false;
    }).length;
    const decidedScoped = scoped.filter((a: any) => {
      if (a.status !== "approved" && a.status !== "rejected") return false;
      const u = parseDate(a.updatedAt ?? a.createdAt);
      return u ? u >= since : false;
    });
    const byType = countBy(
      pendingScoped.map((a: any) => ({ key: a.targetType, count: 1 })),
    );
    const byStatus = countBy(
      decidedScoped.map((a: any) => ({ key: a.status, count: 1 })),
    );
    const decisionHours: number[] = [];
    for (const d of decidedScoped as any[]) {
      const created = parseDate(d.createdAt);
      const decidedAt = parseDate(d.decidedAt ?? d.decisions?.[0]?.decidedAt ?? d.updatedAt);
      if (created && decidedAt) decisionHours.push(hoursBetween(created, decidedAt));
    }
    org = {
      pending: pendingScoped.length,
      stale,
      byType,
      approvedLast30: byStatus.approved ?? 0,
      rejectedLast30: byStatus.rejected ?? 0,
      avgDecisionHours: average(decisionHours),
    };
  }

  const oldestDate = parseDate((awaiting[0] as any)?.createdAt);

  return {
    awaitingMe: awaiting.length,
    awaitingMeByType,
    oldestAwaitingAt: oldestDate?.toISOString() ?? null,
    queue: awaiting.slice(0, 6).map((q: any) => ({
      id: q.id,
      targetType: q.targetType ?? "",
      targetId: q.targetId ?? "",
      requester:
        q.requestedBy?.fullName ||
        (q.requestedById && userNames.get(q.requestedById)) ||
        q.requestedById ||
        "",
      currentStep: q.currentStep ?? 1,
      createdAt: parseDate(q.createdAt)?.toISOString() ?? now.toISOString(),
    })),
    mySubmittedPending,
    myDecidedLast30,
    org,
  };
}

export interface WorkloadRequestRow {
  id: string;
  reference: string;
  kind: RequestKind;
  title: string;
  customer: string;
  priority: string;
  workflowStatus: string;
  slaDueDate: string | null;
  overdue: boolean;
  createdAt: string;
}

function toRow(r: any, now: Date): WorkloadRequestRow {
  const slaDue = parseDate(r.slaDueDate ?? r.sla_due_date);
  const created = parseDate(r.createdAt ?? r.created_at) ?? now;
  const msg = String(r.message ?? "");
  return {
    id: r.id,
    reference: r.reference ?? r.id,
    kind: requestKindOf({
      requestType: r.requestType ?? r.request_type,
      intent: r.intent,
    }),
    title:
      r.serviceType ||
      r.service_type ||
      (msg.length > 80 ? msg.slice(0, 80) + "…" : msg),
    customer: r.companyName || r.company_name || r.name || "",
    priority: r.priority ?? "normal",
    workflowStatus: r.workflowStatus ?? r.workflow_status ?? "new",
    slaDueDate: slaDue?.toISOString() ?? null,
    overdue: !!slaDue && slaDue < now,
    createdAt: created.toISOString(),
  };
}

function computeResolutionStats(rows: any[], since: Date) {
  const resolved = rows.filter((r) => {
    const ws = r.workflowStatus ?? r.workflow_status;
    const resAt = parseDate(r.resolvedAt ?? r.resolved_at);
    return ws === "resolved" && resAt && resAt >= since;
  });
  const withSla = resolved.filter((r) => parseDate(r.slaDueDate ?? r.sla_due_date));
  const hours = resolved
    .map((r) => {
      const c = parseDate(r.createdAt ?? r.created_at);
      const res = parseDate(r.resolvedAt ?? r.resolved_at);
      return c && res ? hoursBetween(c, res) : null;
    })
    .filter((v): v is number => v !== null);
  return {
    resolvedLast30: resolved.length,
    avgResolutionHours: average(hours),
    slaMetPct: withSla.length
      ? Math.round(
          (withSla.filter((r) => {
            const res = parseDate(r.resolvedAt ?? r.resolved_at);
            const sla = parseDate(r.slaDueDate ?? r.sla_due_date);
            return !!res && !!sla && res <= sla;
          }).length /
            withSla.length) *
            100,
        )
      : null,
  };
}

export interface RequestWorkload {
  open: number;
  overdue: number;
  unassigned: number;
  awaitingApproval: number;
  newLast7: number;
  resolvedLast30: number;
  avgResolutionHours: number | null;
  slaMetPct: number | null;
  byKind: Record<string, number>;
  byTeam: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  mine: { open: number; overdue: number; items: WorkloadRequestRow[] };
}

export async function getRequestWorkload(
  viewerId: string,
  options: { includeComplaints: boolean },
  now = new Date(),
): Promise<RequestWorkload> {
  const all = await listInquiries().catch(() => []);
  const closedSet = new Set<string>(REQUEST_CLOSED_STATUSES);
  const visible = (all as any[]).filter(
    (r) => options.includeComplaints || r.intent !== "complaint",
  );
  const open = visible.filter(
    (r) => !closedSet.has(r.workflowStatus ?? r.workflow_status ?? ""),
  );
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);

  const overdue = open.filter((r) => {
    const sla = parseDate(r.slaDueDate ?? r.sla_due_date);
    return sla ? sla < now : false;
  }).length;
  const unassigned = open.filter(
    (r) => !(r.assignedToId ?? r.assigned_to_id),
  ).length;
  const awaitingApproval = visible.filter(
    (r) => (r.workflowStatus ?? r.workflow_status) === "pending_approval",
  ).length;
  const newLast7 = visible.filter((r) => {
    const c = parseDate(r.createdAt ?? r.created_at);
    return c ? c >= weekAgo : false;
  }).length;

  const mineAll = open.filter(
    (r) => (r.assignedToId ?? r.assigned_to_id) === viewerId,
  );
  const mineOverdue = mineAll.filter((r) => {
    const sla = parseDate(r.slaDueDate ?? r.sla_due_date);
    return sla ? sla < now : false;
  }).length;
  const mineSorted = [...mineAll].sort((a, b) => {
    const as = parseDate(a.slaDueDate ?? a.sla_due_date)?.getTime() ?? Infinity;
    const bs = parseDate(b.slaDueDate ?? b.sla_due_date)?.getTime() ?? Infinity;
    if (as !== bs) return as - bs;
    return (
      (parseDate(b.createdAt ?? b.created_at)?.getTime() ?? 0) -
      (parseDate(a.createdAt ?? a.created_at)?.getTime() ?? 0)
    );
  });

  const byKind: Record<string, number> = Object.fromEntries(
    REQUEST_KINDS.map((k) => [k, 0]),
  );
  for (const r of open) {
    const kind = requestKindOf({
      requestType: r.requestType ?? r.request_type,
      intent: r.intent,
    });
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }

  return {
    open: open.length,
    overdue,
    unassigned,
    awaitingApproval,
    newLast7,
    ...computeResolutionStats(visible, monthAgo),
    byKind,
    byTeam: countBy(open.map((r) => ({ key: r.team, count: 1 }))),
    byPriority: countBy(
      open.map((r) => ({ key: r.priority, count: 1 })),
      ["urgent", "high", "normal"],
    ),
    byStatus: countBy(
      open.map((r) => ({
        key: r.workflowStatus ?? r.workflow_status,
        count: 1,
      })),
    ),
    mine: {
      open: mineAll.length,
      overdue: mineOverdue,
      items: mineSorted.slice(0, 5).map((r) => toRow(r, now)),
    },
  };
}

export interface ComplaintWorkload {
  open: number;
  overdue: number;
  unassigned: number;
  newLast7: number;
  newPrevious7: number;
  resolvedLast30: number;
  avgResolutionHours: number | null;
  slaMetPct: number | null;
  byPriority: Record<string, number>;
  latest: (WorkloadRequestRow & { assignee: string | null })[];
}

export async function getComplaintWorkload(
  now = new Date(),
): Promise<ComplaintWorkload> {
  const [all, users] = await Promise.all([
    listInquiries().catch(() => []),
    listHRUsers().catch(() => []),
  ]);
  const userNames = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u.fullName || u.email || u.id]));
  const closedSet = new Set<string>(REQUEST_CLOSED_STATUSES);
  const complaints = (all as any[]).filter((r) => r.intent === "complaint");
  const open = complaints.filter(
    (r) => !closedSet.has(r.workflowStatus ?? r.workflow_status ?? ""),
  );
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);

  const overdue = open.filter((r) => {
    const sla = parseDate(r.slaDueDate ?? r.sla_due_date);
    return sla ? sla < now : false;
  }).length;
  const unassigned = open.filter(
    (r) => !(r.assignedToId ?? r.assigned_to_id),
  ).length;
  const newLast7 = complaints.filter((r) => {
    const c = parseDate(r.createdAt ?? r.created_at);
    return c ? c >= weekAgo : false;
  }).length;
  const newPrevious7 = complaints.filter((r) => {
    const c = parseDate(r.createdAt ?? r.created_at);
    return c ? c >= twoWeeksAgo && c < weekAgo : false;
  }).length;

  const sortedOpen = [...open].sort((a, b) => {
    const as = parseDate(a.slaDueDate ?? a.sla_due_date)?.getTime() ?? Infinity;
    const bs = parseDate(b.slaDueDate ?? b.sla_due_date)?.getTime() ?? Infinity;
    if (as !== bs) return as - bs;
    return (
      (parseDate(b.createdAt ?? b.created_at)?.getTime() ?? 0) -
      (parseDate(a.createdAt ?? a.created_at)?.getTime() ?? 0)
    );
  });

  return {
    open: open.length,
    overdue,
    unassigned,
    newLast7,
    newPrevious7,
    ...computeResolutionStats(complaints, monthAgo),
    byPriority: countBy(
      open.map((r) => ({ key: r.priority, count: 1 })),
      ["urgent", "high", "normal"],
    ),
    latest: sortedOpen.slice(0, 5).map((r) => {
      const assignedId = r.assignedToId ?? r.assigned_to_id;
      return {
        ...toRow(r, now),
        assignee: (assignedId && userNames.get(assignedId)) || null,
      };
    }),
  };
}
