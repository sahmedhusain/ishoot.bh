import type { Prisma } from "@prisma/client";
import { db, runAtomicMutation } from "../db";
import { ROUTES } from "../constants/routes";
import { REQUEST_CLOSED_STATUSES, canTransitionRequest } from "../constants/requests";
import { isActiveDealStage } from "../constants/crm";
import { getNextSequenceNumber } from "./sequence";
import { assignConsolidatedRequest } from "./requests";
import { registerApprovalFinalizer, submitForApproval, cancelPendingApprovals } from "../services/approval-engine";

export const HANDOVER_KINDS = ["exit", "leave"] as const;
export const CASE_MODES = ["delegate", "spread", "manual"] as const;
/** What HR confirms before an employee leaves or goes on a long leave. */
export const HANDOVER_CHECKLIST = {
  exit: ["knowledge_transfer", "documents_returned", "keys_and_cards", "accounts_closed", "final_settlement", "exit_interview", "clearance_letter"],
  leave: ["knowledge_transfer", "cover_arranged", "out_of_office", "pending_work_reviewed"],
} as const;

export interface EmployeeHandoverInput {
  employee_id: string;
  kind: "exit" | "leave";
  effective_date: string;
  return_date?: string;
  reason?: string;
}

type ChecklistEntry = { key: string; done: boolean; notApplicable: boolean; note: string | null; byId: string | null; at: string | null };

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : undefined);
const clean = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const day = (value: unknown) => {
  const text = clean(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text))) throw new Error("Invalid date");
  return new Date(`${text}T00:00:00Z`);
};
const freshChecklist = (kind: "exit" | "leave"): ChecklistEntry[] =>
  HANDOVER_CHECKLIST[kind].map((key) => ({ key, done: false, notApplicable: false, note: null, byId: null, at: null }));

/** Opens an exit or leave handover; the employee's open cases are gathered straight away. */
export async function openEmployeeHandover(input: EmployeeHandoverInput, actorId: string, leaveRequestId?: string) {
  if (!(HANDOVER_KINDS as readonly string[]).includes(input.kind)) throw new Error("INVALID_INPUT");
  const effectiveDate = day(input.effective_date);
  if (!effectiveDate) throw new Error("Invalid date");
  const returnDate = day(input.return_date);
  if (returnDate && returnDate < effectiveDate) throw new Error("The return date cannot be before the start date");
  return runAtomicMutation(async () => {
    const employee = await db.employee.findUnique({ where: { id: input.employee_id }, select: { id: true, status: true } });
    if (!employee) throw new Error("Employee not found");
    if (employee.status === "terminated") throw new Error("This employee has already left");
    if (input.kind === "exit") {
      const open = await db.employeeHandover.findFirst({ where: { employeeId: employee.id, kind: "exit", status: { in: ["open", "pending_approval"] } }, select: { id: true } });
      if (open) throw new Error("This employee already has an exit handover in progress");
    }
    const handover = await db.employeeHandover.create({
      data: {
        reference: await getNextSequenceNumber("EHO"),
        employeeId: employee.id,
        kind: input.kind,
        leaveRequestId: leaveRequestId ?? null,
        effectiveDate,
        returnDate,
        reason: clean(input.reason),
        checklist: freshChecklist(input.kind) as unknown as Prisma.InputJsonValue,
        createdById: actorId,
      },
    });
    await refreshHandoverCases(handover.id);
    return handover;
  });
}

/**
 * Re-reads what the employee still owns: open service requests and inquiries assigned to them, active deals
 * they run and approvals waiting for them. New ones are added; ones closed elsewhere are marked closed.
 */
export async function refreshHandoverCases(handoverId: string) {
  const h = await db.employeeHandover.findUniqueOrThrow({ where: { id: handoverId }, include: { employee: { select: { userId: true } }, cases: true } });
  const userId = h.employee.userId;
  const live: Array<{ caseType: string; caseId: string; label: string }> = [];
  if (userId) {
    const [requests, deals, approvals] = await Promise.all([
      db.inquiry.findMany({ where: { assignedToId: userId, workflowStatus: { notIn: [...REQUEST_CLOSED_STATUSES] }, status: { notIn: [...REQUEST_CLOSED_STATUSES] } }, select: { id: true, reference: true, name: true, companyName: true } }),
      db.crmDeal.findMany({ where: { assignedTo: userId }, select: { id: true, title: true, dealStage: true } }),
      db.approvalRequest.findMany({ where: { status: "pending", approverIds: { has: userId } }, select: { id: true, targetType: true, targetId: true } }),
    ]);
    // Older website requests carry an internal id as their reference; show a short form and the client.
    for (const r of requests) {
      const ref = /^[A-Z]+-\d/.test(r.reference) ? r.reference : `#${r.reference.slice(-6).toUpperCase()}`;
      live.push({ caseType: "request", caseId: r.id, label: `${ref} · ${r.companyName || r.name}`.slice(0, 200) });
    }
    for (const d of deals) if (isActiveDealStage(d.dealStage)) live.push({ caseType: "deal", caseId: d.id, label: d.title.slice(0, 200) });
    for (const a of approvals) live.push({ caseType: "approval", caseId: a.id, label: `${a.targetType}:${a.targetId}`.slice(0, 200) });
  }
  const known = new Map(h.cases.map((c) => [`${c.caseType}:${c.caseId}`, c]));
  const liveKeys = new Set(live.map((c) => `${c.caseType}:${c.caseId}`));
  for (const c of live) if (!known.has(`${c.caseType}:${c.caseId}`)) await db.employeeHandoverCase.create({ data: { handoverId, ...c } });
  for (const c of h.cases) if (c.status === "pending" && !liveKeys.has(`${c.caseType}:${c.caseId}`)) await db.employeeHandoverCase.update({ where: { id: c.id }, data: { status: "closed" } });
}

/** How cases are to be reassigned: all to one delegate, spread across a team, or chosen one by one. */
export async function setHandoverCaseMode(handoverId: string, input: { mode: string; delegate_user_id?: string; team_user_ids?: string[] }) {
  const h = await db.employeeHandover.findUnique({ where: { id: handoverId }, include: { employee: { select: { userId: true } } } });
  if (!h) throw new Error("Handover not found");
  if (h.status !== "open") throw new Error("This handover can no longer be changed");
  if (!(CASE_MODES as readonly string[]).includes(input.mode)) throw new Error("INVALID_INPUT");
  const team = Array.from(new Set(input.team_user_ids ?? [])).filter((id) => id !== h.employee.userId).slice(0, 30);
  if (input.mode === "delegate" && !input.delegate_user_id) throw new Error("Choose who takes over the cases");
  if (input.mode === "spread" && team.length < 1) throw new Error("Choose the team members who share the cases");
  if (input.delegate_user_id && input.delegate_user_id === h.employee.userId) throw new Error("Choose someone other than the employee");
  const ids = [...(input.delegate_user_id ? [input.delegate_user_id] : []), ...team];
  const active = await db.user.count({ where: { id: { in: ids }, isActive: true } });
  if (active !== ids.length) throw new Error("Choose active team members");
  await db.employeeHandover.update({ where: { id: handoverId }, data: { casesMode: input.mode, delegateUserId: input.mode === "delegate" ? input.delegate_user_id! : null, teamUserIds: input.mode === "spread" ? team : [] } });
}

async function reassignCase(c: { caseType: string; caseId: string }, toUserId: string, actorId: string, reason: string) {
  if (c.caseType === "request") {
    const request = await db.inquiry.findUnique({ where: { id: c.caseId }, select: { workflowStatus: true, assignedToId: true } });
    if (!request) return;
    if (canTransitionRequest(request.workflowStatus, "assign") || canTransitionRequest(request.workflowStatus, "reassign")) {
      await assignConsolidatedRequest(c.caseId, toUserId, actorId, null, reason);
    } else {
      // Confirmed work keeps its stage; only the owner changes.
      await db.inquiry.update({ where: { id: c.caseId }, data: { assignedToId: toUserId } });
      await db.requestEvent.create({ data: { inquiryId: c.caseId, actorId, eventType: "assignment", details: { previousAssigneeId: request.assignedToId, newAssigneeId: toUserId, reason } } });
    }
  } else if (c.caseType === "deal") {
    await db.crmDeal.update({ where: { id: c.caseId }, data: { assignedTo: toUserId } });
  } else {
    const approval = await db.approvalRequest.findUnique({ where: { id: c.caseId }, select: { approverIds: true, status: true, requestedById: true } });
    if (!approval || approval.status !== "pending") return;
    const from = await db.employeeHandoverCase.findFirst({ where: { caseId: c.caseId }, select: { handover: { select: { employee: { select: { userId: true } } } } } });
    const leaving = from?.handover.employee.userId;
    if (toUserId === approval.requestedById) throw new Error("An approval cannot go to the person who requested it");
    const approverIds = Array.from(new Set(approval.approverIds.filter((id) => id !== leaving).concat(toUserId)));
    await db.approvalRequest.update({ where: { id: c.caseId }, data: { approverIds } });
  }
}

/**
 * Reassigns the pending cases: by the chosen mode, or for manual mode by the assignee chosen for each case
 * (`choices`: case id → user id). Each case keeps its own history (request events, approval approvers).
 */
export async function applyHandoverCases(handoverId: string, actorId: string, choices: Record<string, string> = {}) {
  return runAtomicMutation(async () => {
    await refreshHandoverCases(handoverId);
    const h = await db.employeeHandover.findUniqueOrThrow({ where: { id: handoverId }, include: { cases: { where: { status: "pending" }, orderBy: { createdAt: "asc" } } } });
    if (h.status !== "open") throw new Error("This handover can no longer be changed");
    const reason = h.kind === "exit" ? `Handover ${h.reference}: employee leaving` : `Handover ${h.reference}: employee on leave`;
    let index = 0;
    let moved = 0;
    for (const c of h.cases) {
      const target =
        h.casesMode === "delegate" ? h.delegateUserId
        : h.casesMode === "spread" ? h.teamUserIds[index++ % Math.max(1, h.teamUserIds.length)]
        : choices[c.id];
      if (!target) continue;
      await reassignCase(c, target, actorId, reason);
      await db.employeeHandoverCase.update({ where: { id: c.id }, data: { toUserId: target, status: "reassigned", reassignedAt: new Date() } });
      moved++;
    }
    return moved;
  });
}

export async function updateHandoverChecklist(handoverId: string, key: string, input: { done: boolean; not_applicable: boolean; note?: string }, actorId: string) {
  const h = await db.employeeHandover.findUnique({ where: { id: handoverId } });
  if (!h) throw new Error("Handover not found");
  if (h.status !== "open") throw new Error("This handover can no longer be changed");
  const list = (Array.isArray(h.checklist) ? h.checklist : []) as unknown as ChecklistEntry[];
  const entry = list.find((e) => e.key === key);
  if (!entry) throw new Error("INVALID_INPUT");
  const note = clean(input.note);
  if (input.not_applicable && !note) throw new Error("Say why the item does not apply");
  Object.assign(entry, { done: !!input.done && !input.not_applicable, notApplicable: !!input.not_applicable, note, byId: actorId, at: new Date().toISOString() });
  await db.employeeHandover.update({ where: { id: handoverId }, data: { checklist: list as unknown as Prisma.InputJsonValue } });
}

/** What still blocks submitting the handover for approval. */
export async function handoverBlockers(handoverId: string) {
  const h = await db.employeeHandover.findUniqueOrThrow({ where: { id: handoverId }, include: { cases: true } });
  const [held, openReturns] = await Promise.all([
    db.asset.count({ where: { holderEmployeeId: h.employeeId } }),
    db.assetHandover.count({ where: { employeeId: h.employeeId, kind: "return", status: { in: ["awaiting_employee", "pending_approval"] } } }),
  ]);
  const list = (Array.isArray(h.checklist) ? h.checklist : []) as unknown as ChecklistEntry[];
  return {
    assetsHeld: h.kind === "exit" ? held : 0,
    returnsInProgress: openReturns,
    casesPending: h.cases.filter((c) => c.status === "pending").length,
    checklistOpen: list.filter((e) => !e.done && !e.notApplicable).length,
  };
}

export async function submitEmployeeHandover(handoverId: string, actorId: string) {
  return runAtomicMutation(async () => {
    await refreshHandoverCases(handoverId);
    const h = await db.employeeHandover.findUnique({ where: { id: handoverId }, include: { employee: { select: { userId: true } } } });
    if (!h) throw new Error("Handover not found");
    if (h.status !== "open") throw new Error("This handover can no longer be changed");
    const b = await handoverBlockers(handoverId);
    if (b.assetsHeld || b.returnsInProgress) throw new Error("Every company asset must be returned first");
    if (b.casesPending) throw new Error("Reassign every open case first");
    if (b.checklistOpen) throw new Error("Complete every checklist item first");
    await db.employeeHandover.update({ where: { id: handoverId }, data: { status: "pending_approval" } });
    await submitForApproval({ targetType: "employee_handover", targetId: handoverId, requesterId: actorId, policySnapshot: { kind: h.kind, employeeId: h.employeeId } });
  });
}

export async function cancelEmployeeHandover(handoverId: string) {
  const h = await db.employeeHandover.findUnique({ where: { id: handoverId }, select: { status: true } });
  if (!h) throw new Error("Handover not found");
  if (!["open", "pending_approval"].includes(h.status)) throw new Error("This handover can no longer be changed");
  await cancelPendingApprovals("employee_handover", handoverId);
  await db.employeeHandover.update({ where: { id: handoverId }, data: { status: "cancelled", decidedAt: new Date() } });
}

registerApprovalFinalizer("employee_handover", {
  async approve(id, _decider, reason) {
    const h = await db.employeeHandover.findUniqueOrThrow({ where: { id } });
    if (h.status !== "pending_approval") throw new Error("This handover is not waiting for approval");
    await db.employeeHandover.update({ where: { id }, data: { status: "completed", decidedAt: new Date(), decisionNotes: reason || null } });
    if (h.kind === "exit") await db.employee.update({ where: { id: h.employeeId }, data: { status: "terminated" } });
  },
  async reject(id, _decider, reason) {
    // Back to HR to finish what the approvers found missing.
    await db.employeeHandover.update({ where: { id }, data: { status: "open", decisionNotes: reason || null } });
  },
});

/** Opens a leave handover when a leave type that needs one is approved, and tells HR. */
export async function openLeaveHandoverIfNeeded(leaveRequestId: string, actorId: string) {
  const leave = await db.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: { leaveType: { select: { requiresHandover: true } }, employee: { select: { firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } } },
  });
  if (!leave?.leaveType.requiresHandover) return null;
  if (await db.employeeHandover.findUnique({ where: { leaveRequestId }, select: { id: true } })) return null;
  const handover = await openEmployeeHandover(
    { employee_id: leave.employeeId, kind: "leave", effective_date: iso(leave.startDate)!, return_date: iso(leave.endDate) },
    actorId,
    leaveRequestId,
  );
  const hr = await db.user.findMany({ where: { isActive: true, role: { in: ["admin", "super_admin"] } }, select: { id: true } });
  if (hr.length)
    await db.notification.createMany({
      data: hr.map((u) => ({
        userId: u.id,
        title: "Leave handover to complete",
        message: `${leave.employee.firstNameEn} ${leave.employee.lastNameEn} starts leave on ${iso(leave.startDate)}. Complete the handover ${handover.reference}.`,
        type: "action",
        entityType: "employee_handover",
        entityId: handover.id,
        messageKey: "employeeHandovers.notifications.leaveOpened",
        messageParams: {
          nameEn: `${leave.employee.firstNameEn} ${leave.employee.lastNameEn}`,
          nameAr: `${leave.employee.firstNameAr} ${leave.employee.lastNameAr}`,
          date: iso(leave.startDate)!,
        },
        actionUrl: ROUTES.hr.handover(handover.id),
        eventKey: `employee-handover-open:${handover.id}`,
      })),
    });
  return handover;
}

export async function listEmployeeHandovers(filters: { status?: string; kind?: string; employeeId?: string } = {}) {
  const rows = await db.employeeHandover.findMany({
    where: {
      ...(filters.status && filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.kind && filters.kind !== "all" ? { kind: filters.kind } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
    },
    include: { employee: { select: { id: true, employeeNumber: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true } }, cases: { select: { status: true } } },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });
  return rows.map((h) => ({
    id: h.id,
    reference: h.reference,
    kind: h.kind,
    status: h.status,
    effective_date: iso(h.effectiveDate)!,
    return_date: iso(h.returnDate),
    employee: { id: h.employee.id, number: h.employee.employeeNumber, name_en: `${h.employee.firstNameEn} ${h.employee.lastNameEn}`, name_ar: `${h.employee.firstNameAr} ${h.employee.lastNameAr}` },
    cases_pending: h.cases.filter((c) => c.status === "pending").length,
    cases_total: h.cases.length,
  }));
}

export async function getEmployeeHandover(id: string) {
  const h = await db.employeeHandover.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, userId: true, employeeNumber: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true, jobTitleEn: true, jobTitleAr: true } },
      cases: { orderBy: [{ status: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!h) return null;
  const userIds = Array.from(new Set([h.createdById, h.delegateUserId, ...h.teamUserIds, ...h.cases.map((c) => c.toUserId)].filter(Boolean) as string[]));
  const checklist = (Array.isArray(h.checklist) ? h.checklist : []) as unknown as ChecklistEntry[];
  const [users, blockers, returns, approval] = await Promise.all([
    db.user.findMany({ where: { id: { in: [...userIds, ...checklist.map((c) => c.byId).filter(Boolean) as string[]] } }, select: { id: true, fullName: true } }),
    handoverBlockers(id),
    db.assetHandover.findMany({ where: { employeeId: h.employeeId, kind: "return", createdAt: { gte: h.createdAt } }, select: { id: true, reference: true, status: true, asset: { select: { assetTag: true, name: true } } }, orderBy: { createdAt: "desc" } }),
    db.approvalRequest.findFirst({
      where: { targetType: "employee_handover", targetId: id },
      orderBy: { createdAt: "desc" },
      include: { decisions: { orderBy: { decidedAt: "asc" }, include: { decidedBy: { select: { fullName: true } } } } },
    }),
  ]);
  const nameOf = (uid?: string | null) => users.find((u) => u.id === uid)?.fullName;
  return {
    id: h.id,
    reference: h.reference,
    kind: h.kind as "exit" | "leave",
    status: h.status,
    effective_date: iso(h.effectiveDate)!,
    return_date: iso(h.returnDate),
    reason: h.reason ?? undefined,
    cases_mode: h.casesMode,
    delegate_user_id: h.delegateUserId ?? undefined,
    team_user_ids: h.teamUserIds,
    created_by: nameOf(h.createdById) ?? "",
    decision_notes: h.decisionNotes ?? undefined,
    employee: { id: h.employee.id, user_id: h.employee.userId, number: h.employee.employeeNumber, name_en: `${h.employee.firstNameEn} ${h.employee.lastNameEn}`, name_ar: `${h.employee.firstNameAr} ${h.employee.lastNameAr}`, job_title_en: h.employee.jobTitleEn, job_title_ar: h.employee.jobTitleAr },
    cases: h.cases.map((c) => ({ id: c.id, type: c.caseType, case_id: c.caseId, label: c.label, status: c.status, to: nameOf(c.toUserId), reassigned_at: c.reassignedAt?.toISOString() })),
    checklist: checklist.map((e) => ({ ...e, by: nameOf(e.byId) })),
    blockers,
    returns: returns.map((r) => ({ id: r.id, reference: r.reference, status: r.status, asset: `${r.asset.assetTag} · ${r.asset.name}` })),
    approval: approval ? { status: approval.status, decisions: approval.decisions.map((d) => ({ decision: d.decision, name: d.decidedBy.fullName, at: d.decidedAt.toISOString(), note: d.reason ?? undefined })) } : null,
  };
}
export type EmployeeHandoverDetail = NonNullable<Awaited<ReturnType<typeof getEmployeeHandover>>>;
