import {
  getTranslations,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
import { ROUTES } from "../constants/routes";
import {
  REQUEST_CLOSED_STATUSES,
  canTransitionRequest,
} from "../constants/requests";
import { isActiveDealStage } from "../constants/crm";
import { getNextSequenceNumber } from "./sequence";
import { assignConsolidatedRequest } from "./requests";
import { onLeaveApproved } from "./leave";
import {
  registerApprovalFinalizer,
  submitForApproval,
  cancelPendingApprovals,
} from "../services/approval-engine";

export const HANDOVER_KINDS = ["exit", "leave"] as const;
export const CASE_MODES = ["delegate", "spread", "manual"] as const;
export const HANDOVER_CHECKLIST = {
  exit: [
    "knowledge_transfer",
    "documents_returned",
    "keys_and_cards",
    "accounts_closed",
    "final_settlement",
    "exit_interview",
    "clearance_letter",
  ],
  leave: [
    "knowledge_transfer",
    "cover_arranged",
    "out_of_office",
    "pending_work_reviewed",
  ],
} as const;

export interface EmployeeHandoverInput {
  employee_id: string;
  kind: "exit" | "leave";
  effective_date: string;
  return_date?: string;
  reason?: string;
}

type ChecklistEntry = {
  key: string;
  done: boolean;
  notApplicable: boolean;
  note: string | null;
  byId: string | null;
  at: string | null;
};

const iso = (d: Date | string | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10) : undefined;
const clean = (v: unknown, max = 500) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const day = (value: unknown) => {
  const text = clean(value, 10);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)))
    throw new Error(serverMessages.invalidDate);
  return new Date(`${text}T00:00:00Z`);
};
const freshChecklist = (kind: "exit" | "leave"): ChecklistEntry[] =>
  HANDOVER_CHECKLIST[kind].map((key) => ({
    key,
    done: false,
    notApplicable: false,
    note: null,
    byId: null,
    at: null,
  }));

export async function openEmployeeHandover(
  input: EmployeeHandoverInput,
  actorId: string,
  leaveRequestId?: string,
) {
  if (!(HANDOVER_KINDS as readonly string[]).includes(input.kind))
    throw new Error(serverMessages.invalidInput);
  const effectiveDate = day(input.effective_date);
  if (!effectiveDate) throw new Error(serverMessages.invalidDate);
  const returnDate = day(input.return_date);
  if (returnDate && returnDate < effectiveDate)
    throw new Error(serverMessages.theReturnDateCannotBeBeforeTheStartDate);
  return runAtomicMutation(async () => {
    const [employees, handovers] = await Promise.all([
      listTableRows<any>("hr", "employee"),
      listTableRows<any>("hr", "employee_handover"),
    ]);
    const employee = employees.find((e) => e.id === input.employee_id);
    if (!employee) throw new Error(serverMessages.employeeNotFound);
    if (employee.status === "terminated")
      throw new Error(serverMessages.thisEmployeeHasAlreadyLeft);
    if (input.kind === "exit") {
      const open = handovers.find(
        (h) =>
          h.employeeId === employee.id &&
          h.kind === "exit" &&
          ["open", "pending_approval"].includes(h.status),
      );
      if (open)
        throw new Error(
          serverMessages.thisEmployeeAlreadyHasAnExitHandoverInProgress,
        );
    }
    const handover = await upsertTableRow<any>("hr", "employee_handover", {
      id: crypto.randomUUID(),
      reference: await getNextSequenceNumber("EHO"),
      employeeId: employee.id,
      kind: input.kind,
      status: "open",
      leaveRequestId: leaveRequestId ?? null,
      effectiveDate: effectiveDate.toISOString(),
      returnDate: returnDate ? returnDate.toISOString() : null,
      reason: clean(input.reason),
      checklist: freshChecklist(input.kind),
      casesMode: "manual",
      teamUserIds: [],
      createdById: actorId,
    });
    await refreshHandoverCases(handover.id);
    return handover;
  });
}

export async function refreshHandoverCases(handoverId: string) {
  const [handovers, employees, cases] = await Promise.all([
    listTableRows<any>("hr", "employee_handover"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("hr", "employee_handover_case"),
  ]);
  const h = handovers.find((row) => row.id === handoverId);
  if (!h) throw new Error(serverMessages.handoverNotFound);
  const emp = employees.find((e) => e.id === h.employeeId);
  const hCases = cases.filter((c) => c.handoverId === handoverId);
  const userId = emp?.userId;
  const live: Array<{ caseType: string; caseId: string; label: string }> = [];
  if (userId) {
    const [requests, deals, approvals] = await Promise.all([
      listTableRows<any>("sales", "inquiry"),
      listTableRows<any>("sales", "crm_deal"),
      listTableRows<any>("workflow", "approval_request"),
    ]);
    for (const r of requests) {
      if (
        r.assignedToId !== userId ||
        (REQUEST_CLOSED_STATUSES as readonly string[]).includes(r.workflowStatus) ||
        (REQUEST_CLOSED_STATUSES as readonly string[]).includes(r.status)
      )
        continue;
      const ref = /^[A-Z]+-\d/.test(r.reference ?? "")
        ? r.reference
        : `#${String(r.reference ?? "").slice(-6).toUpperCase()}`;
      live.push({
        caseType: "request",
        caseId: r.id,
        label: `${ref} · ${r.companyName || r.name}`.slice(0, 200),
      });
    }
    for (const d of deals)
      if (d.assignedTo === userId && isActiveDealStage(d.dealStage))
        live.push({
          caseType: "deal",
          caseId: d.id,
          label: String(d.title ?? "").slice(0, 200),
        });
    for (const a of approvals)
      if (
        a.status === "pending" &&
        Array.isArray(a.approverIds) &&
        a.approverIds.includes(userId)
      )
        live.push({
          caseType: "approval",
          caseId: a.id,
          label: `${a.targetType}:${a.targetId}`.slice(0, 200),
        });
  }
  const known = new Map(hCases.map((c) => [`${c.caseType}:${c.caseId}`, c]));
  const liveKeys = new Set(live.map((c) => `${c.caseType}:${c.caseId}`));
  for (const c of live)
    if (!known.has(`${c.caseType}:${c.caseId}`))
      await upsertTableRow("hr", "employee_handover_case", {
        id: crypto.randomUUID(),
        handoverId,
        status: "pending",
        ...c,
      });
  for (const c of hCases)
    if (c.status === "pending" && !liveKeys.has(`${c.caseType}:${c.caseId}`))
      await upsertTableRow("hr", "employee_handover_case", {
        ...c,
        status: "closed",
      });
}

export async function setHandoverCaseMode(
  handoverId: string,
  input: { mode: string; delegate_user_id?: string; team_user_ids?: string[] },
) {
  const [handovers, employees, users] = await Promise.all([
    listTableRows<any>("hr", "employee_handover"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("identity", "user"),
  ]);
  const h = handovers.find((row) => row.id === handoverId);
  if (!h) throw new Error(serverMessages.handoverNotFound);
  if (h.status !== "open")
    throw new Error(serverMessages.thisHandoverCanNoLongerBeChanged);
  if (!(CASE_MODES as readonly string[]).includes(input.mode))
    throw new Error(serverMessages.invalidInput);
  const emp = employees.find((e) => e.id === h.employeeId);
  const team = Array.from(new Set(input.team_user_ids ?? []))
    .filter((id) => id !== emp?.userId)
    .slice(0, 30);
  if (input.mode === "delegate" && !input.delegate_user_id)
    throw new Error(serverMessages.chooseWhoTakesOverTheCases);
  if (input.mode === "spread" && team.length < 1)
    throw new Error(serverMessages.chooseTheTeamMembersWhoShareTheCases);
  if (input.delegate_user_id && input.delegate_user_id === emp?.userId)
    throw new Error(serverMessages.chooseSomeoneOtherThanTheEmployee);
  const ids = [
    ...(input.delegate_user_id ? [input.delegate_user_id] : []),
    ...team,
  ];
  const active = users.filter((u) => ids.includes(u.id) && u.isActive).length;
  if (active !== ids.length)
    throw new Error(serverMessages.chooseActiveTeamMembers);
  await upsertTableRow("hr", "employee_handover", {
    ...h,
    casesMode: input.mode,
    delegateUserId:
      input.mode === "delegate" ? input.delegate_user_id! : null,
    teamUserIds: input.mode === "spread" ? team : [],
  });
}

async function reassignCase(
  c: { caseType: string; caseId: string },
  toUserId: string,
  actorId: string,
  reason: string,
) {
  if (c.caseType === "request") {
    const requests = await listTableRows<any>("sales", "inquiry");
    const request = requests.find((r) => r.id === c.caseId);
    if (!request) return;
    if (
      canTransitionRequest(request.workflowStatus, "assign") ||
      canTransitionRequest(request.workflowStatus, "reassign")
    ) {
      await assignConsolidatedRequest(
        c.caseId,
        toUserId,
        actorId,
        null,
        reason,
      );
    } else {
      await upsertTableRow("sales", "inquiry", {
        ...request,
        assignedToId: toUserId,
      });
      await upsertTableRow("system", "request_event", {
        id: crypto.randomUUID(),
        inquiryId: c.caseId,
        actorId,
        eventType: "assignment",
        details: {
          previousAssigneeId: request.assignedToId,
          newAssigneeId: toUserId,
          reason,
        },
      });
    }
  } else if (c.caseType === "deal") {
    const deals = await listTableRows<any>("sales", "crm_deal");
    const deal = deals.find((d) => d.id === c.caseId);
    if (deal) {
      await upsertTableRow("sales", "crm_deal", {
        ...deal,
        assignedTo: toUserId,
      });
    }
  } else {
    const [approvals, cases, handovers, employees] = await Promise.all([
      listTableRows<any>("workflow", "approval_request"),
      listTableRows<any>("hr", "employee_handover_case"),
      listTableRows<any>("hr", "employee_handover"),
      listTableRows<any>("hr", "employee"),
    ]);
    const approval = approvals.find((a) => a.id === c.caseId);
    if (!approval || approval.status !== "pending") return;
    const fromCase = cases.find((row) => row.caseId === c.caseId);
    const fromHandover = fromCase
      ? handovers.find((row) => row.id === fromCase.handoverId)
      : undefined;
    const fromEmployee = fromHandover
      ? employees.find((row) => row.id === fromHandover.employeeId)
      : undefined;
    const leaving = fromEmployee?.userId;
    if (toUserId === approval.requestedById)
      throw new Error(
        serverMessages.anApprovalCannotGoToThePersonWhoRequestedIt,
      );
    const approverIds = Array.from(
      new Set(
        (Array.isArray(approval.approverIds) ? approval.approverIds : [])
          .filter((id: string) => id !== leaving)
          .concat(toUserId),
      ),
    );
    await upsertTableRow("workflow", "approval_request", {
      ...approval,
      approverIds,
    });
  }
}

export async function applyHandoverCases(
  handoverId: string,
  actorId: string,
  choices: Record<string, string> = {},
) {
  return runAtomicMutation(async () => {
    await refreshHandoverCases(handoverId);
    const [handovers, allCases] = await Promise.all([
      listTableRows<any>("hr", "employee_handover"),
      listTableRows<any>("hr", "employee_handover_case"),
    ]);
    const h = handovers.find((row) => row.id === handoverId);
    if (!h) throw new Error(serverMessages.handoverNotFound);
    if (h.status !== "open")
      throw new Error(serverMessages.thisHandoverCanNoLongerBeChanged);
    const pendingCases = allCases
      .filter((c) => c.handoverId === handoverId && c.status === "pending")
      .sort((a, b) =>
        String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")),
      );
    const reason =
      h.kind === "exit"
        ? `Handover ${h.reference}: employee leaving`
        : `Handover ${h.reference}: employee on leave`;
    const teamUserIds: string[] = Array.isArray(h.teamUserIds)
      ? h.teamUserIds
      : [];
    let index = 0;
    let moved = 0;
    for (const c of pendingCases) {
      const target =
        h.casesMode === "delegate"
          ? h.delegateUserId
          : h.casesMode === "spread"
            ? teamUserIds[index++ % Math.max(1, teamUserIds.length)]
            : choices[c.id];
      if (!target) continue;
      await reassignCase(c, target, actorId, reason);
      await upsertTableRow("hr", "employee_handover_case", {
        ...c,
        toUserId: target,
        status: "reassigned",
        reassignedAt: new Date().toISOString(),
      });
      moved++;
    }
    return moved;
  });
}

export async function updateHandoverChecklist(
  handoverId: string,
  key: string,
  input: { done: boolean; not_applicable: boolean; note?: string },
  actorId: string,
) {
  const handovers = await listTableRows<any>("hr", "employee_handover");
  const h = handovers.find((row) => row.id === handoverId);
  if (!h) throw new Error(serverMessages.handoverNotFound);
  if (h.status !== "open")
    throw new Error(serverMessages.thisHandoverCanNoLongerBeChanged);
  const list = (Array.isArray(h.checklist)
    ? h.checklist
    : []) as unknown as ChecklistEntry[];
  const entry = list.find((e) => e.key === key);
  if (!entry) throw new Error(serverMessages.invalidInput);
  const note = clean(input.note);
  if (input.not_applicable && !note)
    throw new Error(serverMessages.sayWhyTheItemDoesNotApply);
  Object.assign(entry, {
    done: !!input.done && !input.not_applicable,
    notApplicable: !!input.not_applicable,
    note,
    byId: actorId,
    at: new Date().toISOString(),
  });
  await upsertTableRow("hr", "employee_handover", {
    ...h,
    checklist: list,
  });
}

export async function handoverBlockers(handoverId: string) {
  const [handovers, cases, assets, assetHandovers] = await Promise.all([
    listTableRows<any>("hr", "employee_handover"),
    listTableRows<any>("hr", "employee_handover_case"),
    listTableRows<any>("itsm", "asset"),
    listTableRows<any>("itsm", "asset_handover"),
  ]);
  const h = handovers.find((row) => row.id === handoverId);
  if (!h) throw new Error(serverMessages.handoverNotFound);
  const hCases = cases.filter((c) => c.handoverId === handoverId);
  const held = assets.filter((a) => a.holderEmployeeId === h.employeeId).length;
  const openReturns = assetHandovers.filter(
    (a) =>
      a.employeeId === h.employeeId &&
      a.kind === "return" &&
      ["awaiting_employee", "pending_approval"].includes(a.status),
  ).length;
  const list = (Array.isArray(h.checklist)
    ? h.checklist
    : []) as unknown as ChecklistEntry[];
  return {
    assetsHeld: h.kind === "exit" ? held : 0,
    returnsInProgress: openReturns,
    casesPending: hCases.filter((c) => c.status === "pending").length,
    checklistOpen: list.filter((e) => !e.done && !e.notApplicable).length,
  };
}

export async function submitEmployeeHandover(
  handoverId: string,
  actorId: string,
) {
  return runAtomicMutation(async () => {
    await refreshHandoverCases(handoverId);
    const handovers = await listTableRows<any>("hr", "employee_handover");
    const h = handovers.find((row) => row.id === handoverId);
    if (!h) throw new Error(serverMessages.handoverNotFound);
    if (h.status !== "open")
      throw new Error(serverMessages.thisHandoverCanNoLongerBeChanged);
    const b = await handoverBlockers(handoverId);
    if (b.assetsHeld || b.returnsInProgress)
      throw new Error(serverMessages.everyCompanyAssetMustBeReturnedFirst);
    if (b.casesPending)
      throw new Error(serverMessages.reassignEveryOpenCaseFirst);
    if (b.checklistOpen)
      throw new Error(serverMessages.completeEveryChecklistItemFirst);
    await upsertTableRow("hr", "employee_handover", {
      ...h,
      status: "pending_approval",
    });
    await submitForApproval({
      targetType: "employee_handover",
      targetId: handoverId,
      requesterId: actorId,
      policySnapshot: { kind: h.kind, employeeId: h.employeeId },
    });
  });
}

export async function cancelEmployeeHandover(handoverId: string) {
  const handovers = await listTableRows<any>("hr", "employee_handover");
  const h = handovers.find((row) => row.id === handoverId);
  if (!h) throw new Error(serverMessages.handoverNotFound);
  if (!["open", "pending_approval"].includes(h.status))
    throw new Error(serverMessages.thisHandoverCanNoLongerBeChanged);
  await cancelPendingApprovals("employee_handover", handoverId);
  await upsertTableRow("hr", "employee_handover", {
    ...h,
    status: "cancelled",
    decidedAt: new Date().toISOString(),
  });
}

registerApprovalFinalizer("employee_handover", {
  async approve(id, _decider, reason) {
    const [handovers, employees] = await Promise.all([
      listTableRows<any>("hr", "employee_handover"),
      listTableRows<any>("hr", "employee"),
    ]);
    const h = handovers.find((row) => row.id === id);
    if (!h) throw new Error(serverMessages.handoverNotFound);
    if (h.status !== "pending_approval")
      throw new Error(serverMessages.thisHandoverIsNotWaitingFor2);
    await upsertTableRow("hr", "employee_handover", {
      ...h,
      status: "completed",
      decidedAt: new Date().toISOString(),
      decisionNotes: reason || null,
    });
    if (h.kind === "exit") {
      const emp = employees.find((e) => e.id === h.employeeId);
      if (emp) {
        await upsertTableRow("hr", "employee", {
          ...emp,
          status: "terminated",
        });
      }
    }
  },
  async reject(id, _decider, reason) {
    const handovers = await listTableRows<any>("hr", "employee_handover");
    const h = handovers.find((row) => row.id === id);
    if (h) {
      await upsertTableRow("hr", "employee_handover", {
        ...h,
        status: "open",
        decisionNotes: reason || null,
      });
    }
  },
});

export async function openLeaveHandoverIfNeeded(
  leaveRequestId: string,
  actorId: string,
) {
  const [leaves, leaveTypes, employees, handovers, users] = await Promise.all([
    listTableRows<any>("hr", "leave_request"),
    listTableRows<any>("hr", "leave_type"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("hr", "employee_handover"),
    listTableRows<any>("identity", "user"),
  ]);
  const leave = leaves.find((l) => l.id === leaveRequestId);
  if (!leave) return null;
  const leaveType = leaveTypes.find((t) => t.id === leave.leaveTypeId);
  if (!leaveType?.requiresHandover) return null;
  if (handovers.find((h) => h.leaveRequestId === leaveRequestId)) return null;
  const emp = employees.find((e) => e.id === leave.employeeId);
  const handover = await openEmployeeHandover(
    {
      employee_id: leave.employeeId,
      kind: "leave",
      effective_date: iso(leave.startDate)!,
      return_date: iso(leave.endDate),
    },
    actorId,
    leaveRequestId,
  );
  const hr = users.filter(
    (u) => u.isActive && ["admin", "super_admin"].includes(u.role),
  );
  if (hr.length) {
    const nameEn = emp ? `${emp.firstNameEn} ${emp.lastNameEn}` : leave.employeeId;
    const nameAr = emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : leave.employeeId;
    await Promise.all(
      hr.map((u) =>
        upsertTableRow("notify", "notification", {
          id: crypto.randomUUID(),
          userId: u.id,
          title:
            getTranslations("en").admin.employeeHandovers.notifications
              .leaveOpened.title,
          message: formatMessage(
            getTranslations("en").admin.employeeHandovers.notifications
              .leaveOpened.message,
            {
              name: nameEn,
              date: iso(leave.startDate),
            },
          ),
          type: "action",
          entityType: "employee_handover",
          entityId: handover.id,
          messageKey: "employeeHandovers.notifications.leaveOpened",
          messageParams: {
            nameEn,
            nameAr,
            date: iso(leave.startDate)!,
          },
          actionUrl: ROUTES.hr.handover(handover.id),
          eventKey: `employee-handover-open:${handover.id}`,
        }),
      ),
    );
  }
  return handover;
}

onLeaveApproved(openLeaveHandoverIfNeeded);

export async function listEmployeeHandovers(
  filters: { status?: string; kind?: string; employeeId?: string } = {},
) {
  const [{ listEmployeeHandovers: apiList }, { listEmployees }] = await Promise.all([
    import("../api/hr"),
    import("../api/hr"),
  ]);
  const [rows, employees] = await Promise.all([
    apiList({ employeeId: filters.employeeId }).catch(() => []),
    listEmployees().catch(() => []),
  ]);
  const empMap = new Map<string, any>(
    (employees || []).map((e: any) => [e.id, e] as [string, any]),
  );
  return (rows || [])
    .filter((h) => {
      if (filters.status && filters.status !== "all" && h.status !== filters.status) return false;
      if (filters.kind && filters.kind !== "all" && h.kind !== filters.kind) return false;
      return true;
    })
    .map((h) => {
      const emp = empMap.get(h.employeeId);
      return {
        id: h.id,
        reference: h.reference,
        kind: h.kind,
        status: h.status,
        effective_date: (h.effectiveDate || "").slice(0, 10),
        return_date: h.returnDate ? h.returnDate.slice(0, 10) : undefined,
        employee: {
          id: h.employeeId,
          number: emp?.employeeNumber || "",
          name_en: h.employeeName || (emp ? `${emp.firstNameEn} ${emp.lastNameEn}`.trim() : h.employeeId),
          name_ar: h.employeeName || (emp ? `${emp.firstNameAr || emp.firstNameEn} ${emp.lastNameAr || emp.lastNameEn}`.trim() : h.employeeId),
        },
        cases_pending: h.status === "open" || h.status === "pending_approval" ? 1 : 0,
        cases_total: 1,
      };
    });
}

export async function getEmployeeHandover(id: string) {
  const [handovers, employees, allCases] = await Promise.all([
    listTableRows<any>("hr", "employee_handover"),
    listTableRows<any>("hr", "employee"),
    listTableRows<any>("hr", "employee_handover_case"),
  ]);
  const h = handovers.find((row) => row.id === id);
  if (!h) return null;
  const emp = employees.find((e) => e.id === h.employeeId) ?? {};
  const hCases = allCases
    .filter((c) => c.handoverId === id)
    .sort((a, b) => {
      const sCmp = String(a.status ?? "").localeCompare(String(b.status ?? ""));
      return sCmp !== 0
        ? sCmp
        : String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
    });
  const checklist = (Array.isArray(h.checklist)
    ? h.checklist
    : []) as unknown as ChecklistEntry[];
  const [users, blockers, assetHandovers, assets, approvals, decisions] =
    await Promise.all([
      listTableRows<any>("identity", "user"),
      handoverBlockers(id),
      listTableRows<any>("itsm", "asset_handover"),
      listTableRows<any>("itsm", "asset"),
      listTableRows<any>("workflow", "approval_request"),
      listTableRows<any>("workflow", "approval_decision"),
    ]);
  const nameOf = (uid?: string | null) =>
    users.find((u) => u.id === uid)?.fullName;
  const returns = assetHandovers
    .filter(
      (r) =>
        r.employeeId === h.employeeId &&
        r.kind === "return" &&
        (!h.createdAt || String(r.createdAt ?? "") >= String(h.createdAt)),
    )
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    );
  const assetMap = new Map<string, any>(assets.map((a) => [a.id, a]));
  const approval = approvals
    .filter(
      (a) => a.targetType === "employee_handover" && a.targetId === id,
    )
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )[0];
  const approvalDecisions = approval
    ? decisions
        .filter((d) => d.approvalRequestId === approval.id)
        .sort((a, b) =>
          String(a.decidedAt ?? "").localeCompare(String(b.decidedAt ?? "")),
        )
    : [];
  const teamUserIds: string[] = Array.isArray(h.teamUserIds)
    ? h.teamUserIds
    : [];
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
    team_user_ids: teamUserIds,
    created_by: nameOf(h.createdById) ?? "",
    decision_notes: h.decisionNotes ?? undefined,
    employee: {
      id: emp.id ?? h.employeeId,
      user_id: emp.userId ?? null,
      number: emp.employeeNumber ?? "",
      name_en: `${emp.firstNameEn ?? ""} ${emp.lastNameEn ?? ""}`.trim(),
      name_ar: `${emp.firstNameAr ?? ""} ${emp.lastNameAr ?? ""}`.trim(),
      job_title_en: emp.jobTitleEn ?? "",
      job_title_ar: emp.jobTitleAr ?? "",
    },
    cases: hCases.map((c) => ({
      id: c.id,
      type: c.caseType,
      case_id: c.caseId,
      label: c.label,
      status: c.status,
      to: nameOf(c.toUserId),
      reassigned_at: c.reassignedAt ? String(c.reassignedAt) : undefined,
    })),
    checklist: checklist.map((e) => ({ ...e, by: nameOf(e.byId) })),
    blockers,
    returns: returns.map((r) => {
      const asset = assetMap.get(r.assetId);
      return {
        id: r.id,
        reference: r.reference,
        status: r.status,
        asset: asset ? `${asset.assetTag} · ${asset.name}` : r.assetId,
      };
    }),
    approval: approval
      ? {
          status: approval.status,
          decisions: approvalDecisions.map((d) => ({
            decision: d.decision,
            name: nameOf(d.decidedById) ?? "",
            at: String(d.decidedAt ?? ""),
            note: d.reason ?? undefined,
          })),
        }
      : null,
  };
}
export type EmployeeHandoverDetail = NonNullable<
  Awaited<ReturnType<typeof getEmployeeHandover>>
>;
