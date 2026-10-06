// Role dashboards: approvals waiting, request/SR workload and complaints, scoped by the caller.
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { STALE_APPROVAL_DAYS } from "../constants/approvals";
import { REQUEST_CLOSED_STATUSES, REQUEST_KINDS, requestKindOf, type RequestKind } from "../constants/requests";

const DAY = 86400000;

const countBy = <T extends string>(groups: { key: string | null; count: number }[], keys?: readonly T[]) => {
  const out: Record<string, number> = Object.fromEntries((keys ?? []).map((k) => [k, 0]));
  for (const g of groups) out[g.key ?? "none"] = (out[g.key ?? "none"] ?? 0) + g.count;
  return out;
};
const hoursBetween = (from: Date, to: Date) => Math.max(0, (to.getTime() - from.getTime()) / 3600000);
const average = (values: number[]) => (values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null);

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
  /** Company-wide view of the target types the caller may read; null when they may read none. */
  org: {
    pending: number;
    stale: number;
    byType: Record<string, number>;
    approvedLast30: number;
    rejectedLast30: number;
    avgDecisionHours: number | null;
  } | null;
}

export async function getApprovalWorkload(userId: string, readableTargetTypes: string[], now = new Date()): Promise<ApprovalWorkload> {
  const awaiting: Prisma.ApprovalRequestWhereInput = { status: "pending", approverIds: { has: userId } };
  const since = new Date(now.getTime() - 30 * DAY);
  const [awaitingGroups, queue, oldest, mySubmittedPending, myDecidedLast30] = await Promise.all([
    db.approvalRequest.groupBy({ by: ["targetType"], where: awaiting, _count: { _all: true } }),
    db.approvalRequest.findMany({
      where: awaiting,
      orderBy: { createdAt: "asc" },
      take: 6,
      select: { id: true, targetType: true, targetId: true, currentStep: true, createdAt: true, requestedBy: { select: { fullName: true } } },
    }),
    db.approvalRequest.findFirst({ where: awaiting, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.approvalRequest.count({ where: { status: "pending", requestedById: userId } }),
    db.approvalDecision.count({ where: { decidedById: userId, decidedAt: { gte: since } } }),
  ]);
  const awaitingMeByType = countBy(awaitingGroups.map((g) => ({ key: g.targetType, count: g._count._all })));

  let org: ApprovalWorkload["org"] = null;
  if (readableTargetTypes.length) {
    const scope: Prisma.ApprovalRequestWhereInput = { targetType: { in: readableTargetTypes } };
    const [pendingGroups, stale, decidedGroups, decided] = await Promise.all([
      db.approvalRequest.groupBy({ by: ["targetType"], where: { ...scope, status: "pending" }, _count: { _all: true } }),
      db.approvalRequest.count({ where: { ...scope, status: "pending", createdAt: { lt: new Date(now.getTime() - STALE_APPROVAL_DAYS * DAY) } } }),
      db.approvalRequest.groupBy({ by: ["status"], where: { ...scope, status: { in: ["approved", "rejected"] }, updatedAt: { gte: since } }, _count: { _all: true } }),
      db.approvalRequest.findMany({
        where: { ...scope, status: { in: ["approved", "rejected"] }, updatedAt: { gte: since } },
        select: { createdAt: true, decisions: { select: { decidedAt: true }, orderBy: { decidedAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      }),
    ]);
    const byType = countBy(pendingGroups.map((g) => ({ key: g.targetType, count: g._count._all })));
    const byStatus = countBy(decidedGroups.map((g) => ({ key: g.status, count: g._count._all })));
    org = {
      pending: Object.values(byType).reduce((a, b) => a + b, 0),
      stale,
      byType,
      approvedLast30: byStatus.approved ?? 0,
      rejectedLast30: byStatus.rejected ?? 0,
      avgDecisionHours: average(decided.flatMap((d) => (d.decisions[0] ? [hoursBetween(d.createdAt, d.decisions[0].decidedAt)] : []))),
    };
  }

  return {
    awaitingMe: Object.values(awaitingMeByType).reduce((a, b) => a + b, 0),
    awaitingMeByType,
    oldestAwaitingAt: oldest?.createdAt.toISOString() ?? null,
    queue: queue.map((q) => ({
      id: q.id,
      targetType: q.targetType,
      targetId: q.targetId,
      requester: q.requestedBy.fullName,
      currentStep: q.currentStep,
      createdAt: q.createdAt.toISOString(),
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

const openWhere: Prisma.InquiryWhereInput = { workflowStatus: { notIn: [...REQUEST_CLOSED_STATUSES] } };
const rowSelect = {
  id: true, reference: true, requestType: true, intent: true, serviceType: true, message: true, name: true, companyName: true,
  priority: true, workflowStatus: true, slaDueDate: true, createdAt: true,
} satisfies Prisma.InquirySelect;
function toRow(r: Prisma.InquiryGetPayload<{ select: typeof rowSelect }>, now: Date): WorkloadRequestRow {
  return {
    id: r.id,
    reference: r.reference,
    kind: requestKindOf(r),
    title: r.serviceType || (r.message.length > 80 ? r.message.slice(0, 80) + "…" : r.message),
    customer: r.companyName || r.name,
    priority: r.priority,
    workflowStatus: r.workflowStatus,
    slaDueDate: r.slaDueDate?.toISOString() ?? null,
    overdue: !!r.slaDueDate && r.slaDueDate < now,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Resolution speed and SLA hit rate over the given resolved requests. */
async function resolutionStats(where: Prisma.InquiryWhereInput, since: Date) {
  const resolved = await db.inquiry.findMany({
    where: { AND: [where, { workflowStatus: "resolved", resolvedAt: { gte: since } }] },
    select: { createdAt: true, resolvedAt: true, slaDueDate: true },
    orderBy: { resolvedAt: "desc" },
    take: 2000,
  });
  const withSla = resolved.filter((r) => r.slaDueDate);
  return {
    resolvedLast30: resolved.length,
    avgResolutionHours: average(resolved.map((r) => hoursBetween(r.createdAt, r.resolvedAt!))),
    slaMetPct: withSla.length ? Math.round((withSla.filter((r) => r.resolvedAt! <= r.slaDueDate!).length / withSla.length) * 100) : null,
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

/** Request and SR workload. Complaints are left out unless the caller may read them. */
export async function getRequestWorkload(viewerId: string, options: { includeComplaints: boolean }, now = new Date()): Promise<RequestWorkload> {
  const visible: Prisma.InquiryWhereInput = options.includeComplaints ? {} : { intent: { not: "complaint" } };
  const open: Prisma.InquiryWhereInput = { AND: [visible, openWhere] };
  const overdueWhere: Prisma.InquiryWhereInput = { AND: [open, { slaDueDate: { lt: now } }] };
  const mineWhere: Prisma.InquiryWhereInput = { AND: [open, { assignedToId: viewerId }] };
  const [kindGroups, overdue, unassigned, awaitingApproval, newLast7, teamGroups, priorityGroups, statusGroups, mineOpen, mineOverdue, mineItems, resolution] =
    await Promise.all([
      db.inquiry.groupBy({ by: ["requestType", "intent"], where: open, _count: { _all: true } }),
      db.inquiry.count({ where: overdueWhere }),
      db.inquiry.count({ where: { AND: [open, { assignedToId: null }] } }),
      db.inquiry.count({ where: { AND: [visible, { workflowStatus: "pending_approval" }] } }),
      db.inquiry.count({ where: { AND: [visible, { createdAt: { gte: new Date(now.getTime() - 7 * DAY) } }] } }),
      db.inquiry.groupBy({ by: ["team"], where: open, _count: { _all: true } }),
      db.inquiry.groupBy({ by: ["priority"], where: open, _count: { _all: true } }),
      db.inquiry.groupBy({ by: ["workflowStatus"], where: open, _count: { _all: true } }),
      db.inquiry.count({ where: mineWhere }),
      db.inquiry.count({ where: { AND: [mineWhere, { slaDueDate: { lt: now } }] } }),
      db.inquiry.findMany({
        where: mineWhere,
        select: rowSelect,
        orderBy: [{ slaDueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        take: 5,
      }),
      resolutionStats(visible, new Date(now.getTime() - 30 * DAY)),
    ]);
  const byKind: Record<string, number> = Object.fromEntries(REQUEST_KINDS.map((k) => [k, 0]));
  for (const g of kindGroups) byKind[requestKindOf(g)] += g._count._all;
  return {
    open: Object.values(byKind).reduce((a, b) => a + b, 0),
    overdue,
    unassigned,
    awaitingApproval,
    newLast7,
    ...resolution,
    byKind,
    byTeam: countBy(teamGroups.map((g) => ({ key: g.team, count: g._count._all }))),
    byPriority: countBy(priorityGroups.map((g) => ({ key: g.priority, count: g._count._all })), ["urgent", "high", "normal"]),
    byStatus: countBy(statusGroups.map((g) => ({ key: g.workflowStatus, count: g._count._all }))),
    mine: { open: mineOpen, overdue: mineOverdue, items: mineItems.map((r) => toRow(r, now)) },
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

/** Customer complaints. Only for callers with support access. */
export async function getComplaintWorkload(now = new Date()): Promise<ComplaintWorkload> {
  const complaint: Prisma.InquiryWhereInput = { intent: "complaint" };
  const open: Prisma.InquiryWhereInput = { AND: [complaint, openWhere] };
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [openCount, overdue, unassigned, newLast7, newPrevious7, priorityGroups, latest, resolution] = await Promise.all([
    db.inquiry.count({ where: open }),
    db.inquiry.count({ where: { AND: [open, { slaDueDate: { lt: now } }] } }),
    db.inquiry.count({ where: { AND: [open, { assignedToId: null }] } }),
    db.inquiry.count({ where: { ...complaint, createdAt: { gte: weekAgo } } }),
    db.inquiry.count({ where: { ...complaint, createdAt: { gte: new Date(now.getTime() - 14 * DAY), lt: weekAgo } } }),
    db.inquiry.groupBy({ by: ["priority"], where: open, _count: { _all: true } }),
    db.inquiry.findMany({
      where: open,
      select: { ...rowSelect, assignedTo: { select: { fullName: true } } },
      orderBy: [{ slaDueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 5,
    }),
    resolutionStats(complaint, new Date(now.getTime() - 30 * DAY)),
  ]);
  return {
    open: openCount,
    overdue,
    unassigned,
    newLast7,
    newPrevious7,
    ...resolution,
    byPriority: countBy(priorityGroups.map((g) => ({ key: g.priority, count: g._count._all })), ["urgent", "high", "normal"]),
    latest: latest.map((r) => ({ ...toRow(r, now), assignee: r.assignedTo?.fullName ?? null })),
  };
}
