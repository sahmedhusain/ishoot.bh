import {
  getAdminTranslations,
  getTranslations,
  formatMessage,
  serverMessages,
} from "@platform/locales";

import crypto from "crypto";
import { listTableRows, upsertTableRow, deleteTableRow } from "../api/tables";
import { ROUTES } from "../constants/routes";
import type {
  CalendarEvent,
  CalendarLayer,
  CalendarVisibility,
} from "../types";
import { getEffectivePermissions } from "./permissions";
import { getCompanyConfiguration } from "../api/company";

const ACCENT = "rgb(var(--brand-accent))";

export const CALENDAR_VISIBILITIES = [
  "private",
  "team",
  "department",
  "company",
  "custom",
] as const;
export const CALENDAR_LAYERS = [
  "own",
  "shared",
  "leave",
  "holidays",
  "sales",
  "finance",
  "hr",
  "payroll",
  "meetings",
  "requests",
] as const;

export function mapEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    title_ar: e.titleAr || undefined,
    description: e.description || undefined,
    start_date: new Date(e.startDate || e.startTime || Date.now()).toISOString(),
    end_date: new Date(e.endDate || e.endTime || e.startDate || Date.now()).toISOString(),
    all_day: !!e.allDay,
    location: e.location || undefined,
    color: e.color || ACCENT,
    event_type: e.eventType as any,
    deal_id: e.dealId || undefined,
    created_by: e.createdById || undefined,
    google_event_id: e.googleEventId || undefined,
    google_calendar_id: e.googleCalendarId || undefined,
    recurrence: e.recurrence || undefined,
    reminders: (e.reminders as any) || undefined,
    attendees: (e.attendees as any) || undefined,
    created_at: new Date(e.createdAt || Date.now()).toISOString(),
    updated_at: new Date(e.updatedAt || e.createdAt || Date.now()).toISOString(),
    visibility: (e.visibility ?? "company") as CalendarVisibility,
    audience_user_ids: e.audienceUserIds ?? [],
    audience_department_ids: e.audienceDepartmentIds ?? [],
    audience_roles: e.audienceRoles ?? [],
    source: "event",
    deal: e.deal
      ? {
          id: e.deal.id,
          title: e.deal.title,
          value: Number(e.deal.dealValue ?? 0),
          currency: e.deal.currency as any,
          stage: e.deal.dealStage as any,
          probability: e.deal.probability,
          created_at: new Date(e.deal.createdAt || Date.now()).toISOString(),
          updated_at: new Date(e.deal.updatedAt || e.deal.createdAt || Date.now()).toISOString(),
        }
      : undefined,
  };
}

interface Person {
  id: string;
  role: string;
  managerId: string | null;
  departmentId: string | null;
}

export interface CalendarViewer extends Person {
  managers: Set<string>;
  reports: Set<string>;
  people: Map<string, Person>;
  permissions: Record<string, boolean>;
}

export async function calendarViewer(userId: string): Promise<CalendarViewer> {
  const [users, employees] = await Promise.all([
    listTableRows<any>("identity", "user").catch(() => []),
    listTableRows<any>("hr", "employee").catch(() => []),
  ]);
  const department = new Map(
    employees.filter((e) => e.userId).map((e): [any, any] => [e.userId!, e.departmentId]),
  );
  const people = new Map<string, Person>(
    users.map((u): [string, Person] => [
      u.id,
      {
        id: u.id,
        role: u.role,
        managerId: u.managerId,
        departmentId: department.get(u.id) ?? null,
      },
    ]),
  );
  let me = users.find((u) => u.id === userId);
  if (!me) {
    const isSuper = userId === "super-admin" || userId === "usr_super_admin";
    me = {
      id: userId,
      role: isSuper ? "super_admin" : "admin",
      managerId: null,
      permissions: {},
    };
    people.set(userId, {
      id: userId,
      role: me.role,
      managerId: null,
      departmentId: null,
    });
  }
  const managers = new Set<string>();
  for (
    let cursor = me.managerId, guard = 0;
    cursor && guard < 20;
    cursor = people.get(cursor)?.managerId ?? null, guard++
  )
    managers.add(cursor);
  const reports = new Set<string>();
  const queue = [userId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const p of Array.from(people.values()))
      if (p.managerId === current && !reports.has(p.id) && p.id !== userId) {
        reports.add(p.id);
        queue.push(p.id);
      }
  }
  return {
    ...people.get(userId)!,
    managers,
    reports,
    people,
    permissions: await getEffectivePermissions(
      me.role,
      me.permissions as Record<string, boolean> | null,
    ),
  };
}

export function canSeeEvent(
  event: {
    createdById: string | null;
    visibility: string;
    audienceUserIds: string[];
    audienceDepartmentIds: string[];
    audienceRoles: string[];
  },
  viewer: CalendarViewer,
): boolean {
  if (viewer.role === "super_admin") return true;
  if (
    event.createdById === viewer.id ||
    event.audienceUserIds.includes(viewer.id)
  )
    return true;
  if (event.visibility === "private") return false;
  const creator = event.createdById
    ? viewer.people.get(event.createdById)
    : undefined;
  if (creator && viewer.reports.has(creator.id)) return true;
  if (
    viewer.departmentId &&
    event.audienceDepartmentIds.includes(viewer.departmentId)
  )
    return true;
  if (event.audienceRoles.includes(viewer.role)) return true;
  switch (event.visibility) {
    case "company":
      return true;
    case "department":
      return (
        !!creator &&
        !!viewer.departmentId &&
        creator.departmentId === viewer.departmentId
      );
    case "team":
      return (
        !!creator &&
        (viewer.managers.has(creator.id) ||
          (!!creator.managerId && creator.managerId === viewer.managerId) ||
          creator.managerId === viewer.id)
      );
    default:
      return false;
  }
}

export function canEditEvent(
  event: { createdById: string | null },
  viewer: { id: string; role: string },
) {
  return (
    event.createdById === viewer.id ||
    viewer.role === "super_admin" ||
    viewer.role === "admin"
  );
}

const COLORS: Record<CalendarLayer, string> = {
  own: ACCENT,
  shared: "#3B82F6",
  leave: "#8B5CF6",
  holidays: "#F59E0B",
  sales: "#0EA5E9",
  finance: "#E11D48",
  hr: "#14B8A6",
  payroll: "#10B981",
  meetings: "#6366F1",
  requests: "#F97316",
};

const allDayItem = (input: {
  id: string;
  layer: CalendarLayer;
  title: string;
  titleAr: string;
  date: Date;
  endDate?: Date;
  href?: string;
  type?: CalendarEvent["event_type"];
  description?: string;
}): CalendarEvent => {
  const start = new Date(
    Date.UTC(
      input.date.getUTCFullYear(),
      input.date.getUTCMonth(),
      input.date.getUTCDate(),
      5,
    ),
  );
  const endBase = input.endDate ?? input.date;
  const end = new Date(
    Date.UTC(
      endBase.getUTCFullYear(),
      endBase.getUTCMonth(),
      endBase.getUTCDate(),
      20,
    ),
  );
  return {
    id: `sys:${input.layer}:${input.id}`,
    title: input.title,
    title_ar: input.titleAr,
    description: input.description,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    all_day: true,
    color: COLORS[input.layer],
    event_type: input.type ?? "deadline",
    created_at: start.toISOString(),
    updated_at: start.toISOString(),
    source: "system",
    layer: input.layer,
    href: input.href,
    editable: false,
  };
};

async function systemEvents(
  viewer: CalendarViewer,
  start: Date,
  end: Date,
  layers: Set<CalendarLayer>,
): Promise<CalendarEvent[]> {
  const can = (key: string) =>
    viewer.role === "super_admin" || viewer.permissions[key] === true;
  const team = [viewer.id, ...Array.from(viewer.reports)];
  const out: CalendarEvent[] = [];
  const name = (e: {
    firstNameEn: string;
    lastNameEn: string;
    firstNameAr: string;
    lastNameAr: string;
  }) => ({
    en: `${e.firstNameEn} ${e.lastNameEn}`,
    ar: `${e.firstNameAr} ${e.lastNameAr}`,
  });

  const inRange = (d: Date | string | null | undefined) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return t >= start.getTime() && t <= end.getTime();
  };

  if (layers.has("holidays")) {
    const holidays = await listTableRows<any>("system", "public_holiday").catch(() => []);
    for (const h of holidays.filter((row) => inRange(row.date)))
      out.push(
        allDayItem({
          id: h.id,
          layer: "holidays",
          title: h.nameEn,
          titleAr: h.nameAr,
          date: new Date(h.date),
          type: "reminder",
        }),
      );
  }

  if (layers.has("leave")) {
    const everyone = can("employees:read");
    const teamSet = new Set(team);
    const [leaveReqs, leaveTypes, emps] = await Promise.all([
      listTableRows<any>("hr", "leave_request").catch(() => []),
      listTableRows<any>("hr", "leave_type").catch(() => []),
      listTableRows<any>("hr", "employee").catch(() => []),
    ]);
    const ltMap = new Map<string, any>(leaveTypes.map((lt): [any, any] => [lt.id, lt]));
    const empMap = new Map<string, any>(emps.map((e): [any, any] => [e.id, e]));
    const leave = leaveReqs
      .filter((l) => {
        if (l.status !== "approved") return false;
        const s = new Date(l.startDate).getTime();
        const e = new Date(l.endDate).getTime();
        if (!(s <= end.getTime() && e >= start.getTime())) return false;
        if (!everyone) {
          const emp = empMap.get(l.employeeId);
          if (!emp?.userId || !teamSet.has(emp.userId)) return false;
        }
        return true;
      })
      .slice(0, 500);
    for (const l of leave) {
      const emp = empMap.get(l.employeeId) || { firstNameEn: "", lastNameEn: "", firstNameAr: "", lastNameAr: "" };
      const lt = ltMap.get(l.leaveTypeId) || { nameEn: "", nameAr: "" };
      const n = name(emp);
      out.push(
        allDayItem({
          id: l.id,
          layer: "leave",
          title: `${n.en} · ${lt.nameEn}`,
          titleAr: `${n.ar} · ${lt.nameAr}`,
          date: new Date(l.startDate),
          endDate: new Date(l.endDate),
          href: ROUTES.approvalItem("leave_request", l.id),
          type: "reminder",
        }),
      );
    }
  }

  if (layers.has("sales") && can("deals:read")) {
    const all = can("deals:delete");
    const teamSet = new Set(team);
    const activity = (
      await getCompanyConfiguration().catch(() => null)
    )?.businessActivity;
    const rawDeals = await listTableRows<any>("sales", "crm_deal").catch(() => []);
    const deals = rawDeals
      .filter((d) => {
        if (d.dealStage === "closed_lost") return false;
        if (!inRange(d.shootDate) && !inRange(d.expectedCloseDate)) return false;
        if (!all && (!d.assignedTo || !teamSet.has(d.assignedTo))) return false;
        return true;
      })
      .slice(0, 500)
      .map((d) => ({
        ...d,
        shootDate: d.shootDate ? new Date(d.shootDate) : null,
        expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate) : null,
      }));
    for (const d of deals) {
      if (d.shootDate && d.shootDate >= start && d.shootDate <= end)
        out.push(
          allDayItem({
            id: `${d.id}:shoot`,
            layer: "sales",
            title: formatMessage(
              getAdminTranslations("en", activity).calendarMessages.shoot,
              { title: d.title },
            ),
            titleAr: formatMessage(
              getAdminTranslations("ar", activity).calendarMessages.shoot,
              { title: d.title },
            ),
            date: d.shootDate,
            href: ROUTES.crm.deal(d.id),
            type: "shoot",
          }),
        );
      if (
        d.expectedCloseDate &&
        d.expectedCloseDate >= start &&
        d.expectedCloseDate <= end &&
        !["closed_won", "invoiced", "delivered"].includes(d.dealStage)
      )
        out.push(
          allDayItem({
            id: `${d.id}:close`,
            layer: "sales",
            title: formatMessage(
              getTranslations("en").admin.calendarMessages.expectedClose,
              { title: d.title },
            ),
            titleAr: formatMessage(
              getTranslations("ar").admin.calendarMessages.expectedClose,
              { title: d.title },
            ),
            date: d.expectedCloseDate,
            href: ROUTES.crm.deal(d.id),
          }),
        );
    }
  }

  if (layers.has("sales") && can("quotations:read")) {
    const all = can("quotations:issue_send");
    const teamSet = new Set(team);
    const rawQuotes = await listTableRows<any>("sales", "quotation").catch(() => []);
    const quotes = rawQuotes
      .filter((q) => {
        if (!["issued", "approved"].includes(q.status)) return false;
        if (!inRange(q.validUntilDate)) return false;
        if (!all && !teamSet.has(q.salesOwnerId) && !teamSet.has(q.createdById)) return false;
        return true;
      })
      .slice(0, 300);
    for (const q of quotes)
      out.push(
        allDayItem({
          id: q.id,
          layer: "sales",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.quotationExpiry,
            { number: q.quotationNumber },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.quotationExpiry,
            { number: q.quotationNumber },
          ),
          date: new Date(q.validUntilDate),
          href: ROUTES.quotations.detail(q.id),
        }),
      );
  }

  if (layers.has("finance") && can("invoices:read")) {
    const rawInvoices = await listTableRows<any>("finance", "invoice").catch(() => []);
    const invoices = rawInvoices
      .filter(
        (i) =>
          ["sent", "partially_paid", "overdue"].includes(i.status) &&
          inRange(i.dueDate),
      )
      .slice(0, 300);
    for (const i of invoices)
      out.push(
        allDayItem({
          id: i.id,
          layer: "finance",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.invoiceDue,
            { number: i.invoiceNumber },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.invoiceDue,
            { number: i.invoiceNumber },
          ),
          date: new Date(i.dueDate),
          href: ROUTES.invoices.detail(i.id),
        }),
      );
  }

  if (layers.has("finance") && can("expenses:read")) {
    const rawBills = await listTableRows<any>("finance", "recurring_expense").catch(() => []);
    const bills = rawBills
      .filter((b) => b.isActive && inRange(b.nextDueDate))
      .slice(0, 200);
    for (const b of bills)
      out.push(
        allDayItem({
          id: b.id,
          layer: "finance",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.billDue,
            { title: b.titleEn },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.billDue,
            { title: b.titleAr || b.titleEn },
          ),
          date: new Date(b.nextDueDate),
          href: ROUTES.expenses.recurring,
        }),
      );
  }

  if (layers.has("payroll") && can("payroll:read")) {
    const rawRuns = await listTableRows<any>("hr", "payroll_run").catch(() => []);
    const runs = rawRuns.filter((r) => inRange(r.payDate));
    for (const r of runs)
      out.push(
        allDayItem({
          id: r.id,
          layer: "payroll",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.payrollPaid,
            { period: `${r.year}-${String(r.month).padStart(2, "0")}` },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.payrollPaid,
            { period: `${r.year}-${String(r.month).padStart(2, "0")}` },
          ),
          date: new Date(r.payDate!),
          href: ROUTES.hr.payroll({ highlight: r.id }),
        }),
      );
  }

  if (layers.has("hr")) {
    const everyone = can("employees:read");
    const [rawEmps, rawCreds] = await Promise.all([
      listTableRows<any>("hr", "employee").catch(() => []),
      listTableRows<any>("hr", "employee_credential").catch(() => []),
    ]);
    const credsByEmp = new Map<string, any[]>();
    for (const c of rawCreds) {
      if (inRange(c.expiryDate)) {
        const arr = credsByEmp.get(c.employeeId) || [];
        arr.push({ ...c, expiryDate: new Date(c.expiryDate) });
        credsByEmp.set(c.employeeId, arr);
      }
    }
    const employees = rawEmps
      .filter((e) => {
        if (e.status === "terminated") return false;
        if (!everyone && e.userId !== viewer.id) return false;
        return (
          inRange(e.passportExpiryDate) ||
          inRange(e.cprExpiryDate) ||
          (credsByEmp.get(e.id)?.length ?? 0) > 0
        );
      })
      .slice(0, 300)
      .map((e) => ({
        ...e,
        passportExpiryDate: e.passportExpiryDate ? new Date(e.passportExpiryDate) : null,
        cprExpiryDate: e.cprExpiryDate ? new Date(e.cprExpiryDate) : null,
        credentials: credsByEmp.get(e.id) || [],
      }));
    for (const e of employees) {
      const n = name(e);
      if (
        e.passportExpiryDate &&
        e.passportExpiryDate >= start &&
        e.passportExpiryDate <= end
      )
        out.push(
          allDayItem({
            id: `${e.id}:passport`,
            layer: "hr",
            title: formatMessage(
              getTranslations("en").admin.calendarMessages.passportExpiry,
              { name: n.en },
            ),
            titleAr: formatMessage(
              getTranslations("ar").admin.calendarMessages.passportExpiry,
              { name: n.ar },
            ),
            date: e.passportExpiryDate,
            href: ROUTES.hr.employee(e.id),
          }),
        );
      if (e.cprExpiryDate && e.cprExpiryDate >= start && e.cprExpiryDate <= end)
        out.push(
          allDayItem({
            id: `${e.id}:cpr`,
            layer: "hr",
            title: formatMessage(
              getTranslations("en").admin.calendarMessages.cprExpiry,
              { name: n.en },
            ),
            titleAr: formatMessage(
              getTranslations("ar").admin.calendarMessages.cprExpiry,
              { name: n.ar },
            ),
            date: e.cprExpiryDate,
            href: ROUTES.hr.employee(e.id),
          }),
        );
      for (const c of e.credentials)
        out.push(
          allDayItem({
            id: c.id,
            layer: "hr",
            title: formatMessage(
              getTranslations("en").admin.calendarMessages.credentialExpiry,
              {
                document:
                  c.label ||
                  (
                    getTranslations("en").admin.employeeResidency
                      .kinds as Record<string, string>
                  )[c.kind] ||
                  getTranslations("en").admin.calendarMessages.document,
                name: n.en,
              },
            ),
            titleAr: formatMessage(
              getTranslations("ar").admin.calendarMessages.credentialExpiry,
              {
                document:
                  c.label ||
                  (
                    getTranslations("ar").admin.employeeResidency
                      .kinds as Record<string, string>
                  )[c.kind] ||
                  getTranslations("ar").admin.calendarMessages.document,
                name: n.ar,
              },
            ),
            date: c.expiryDate!,
            href: ROUTES.hr.employee(e.id),
          }),
        );
    }
    if (can("settings:read")) {
      const docs = await listTableRows<any>("system", "company_document").catch(() => []);
      for (const d of docs.filter((row) => inRange(row.validUntil)).slice(0, 100))
        out.push(
          allDayItem({
            id: d.id,
            layer: "hr",
            title: formatMessage(
              getTranslations("en").admin.calendarMessages
                .companyDocumentExpiry,
              { title: d.titleEn },
            ),
            titleAr: formatMessage(
              getTranslations("ar").admin.calendarMessages
                .companyDocumentExpiry,
              { title: d.titleAr || d.titleEn },
            ),
            date: new Date(d.validUntil!),
            href: ROUTES.archive,
          }),
        );
    }
  }

  if (layers.has("meetings") && can("moms:read")) {
    const rawMoms = await listTableRows<any>("workflow", "minute_of_meeting").catch(() => []);
    const moms = rawMoms.filter((m) => inRange(m.meetingDate)).slice(0, 200);
    for (const m of moms)
      out.push(
        allDayItem({
          id: m.id,
          layer: "meetings",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.meeting,
            { title: m.title },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.meeting,
            { title: m.titleAr || m.title },
          ),
          date: new Date(m.meetingDate),
          href: ROUTES.moms.detail(m.id),
          type: "meeting",
        }),
      );
  }

  if (layers.has("requests") && can("requests:read")) {
    const teamSet = new Set(team);
    const canAssign = can("requests:assign");
    const rawRequests = await listTableRows<any>("sales", "inquiry").catch(() => []);
    const requests = rawRequests
      .filter((r) => {
        if (!inRange(r.slaDueDate)) return false;
        if (["resolved", "rejected"].includes(r.workflowStatus)) return false;
        if (!canAssign && (!r.assignedToId || !teamSet.has(r.assignedToId))) return false;
        return true;
      })
      .slice(0, 200);
    for (const r of requests)
      out.push(
        allDayItem({
          id: r.id,
          layer: "requests",
          title: formatMessage(
            getTranslations("en").admin.calendarMessages.requestDue,
            { title: r.projectReference || r.name },
          ),
          titleAr: formatMessage(
            getTranslations("ar").admin.calendarMessages.requestDue,
            { title: r.projectReference || r.name },
          ),
          date: new Date(r.slaDueDate!),
          href: ROUTES.requests.detail(r.id),
        }),
      );
  }
  return out;
}

export async function getCalendarFor(
  userId: string,
  start: Date,
  end: Date,
  layers: readonly CalendarLayer[] = CALENDAR_LAYERS,
): Promise<CalendarEvent[]> {
  const viewer = await calendarViewer(userId);
  const wanted = new Set(layers);
  const [rawEvents, rawDeals, rawUsers] = await Promise.all([
    listTableRows<any>("workflow", "calendar_event", "start_date ASC").catch(() => []),
    listTableRows<any>("sales", "crm_deal").catch(() => []),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
  const userMap = new Map<string, any>(rawUsers.map((u): [any, any] => [u.id, u]));
  const rows = rawEvents
    .filter((row) => {
      const s = new Date(row.startDate || row.startTime || 0).getTime();
      const e = new Date(row.endDate || row.endTime || row.startDate || 0).getTime();
      return s <= end.getTime() && e >= start.getTime();
    })
    .slice(0, 2000)
    .map((row) => ({
      ...row,
      deal: row.dealId ? dealMap.get(row.dealId) || null : null,
      createdBy: row.createdById ? userMap.get(row.createdById) || null : null,
    }));
  let events = rows
    .filter((row) => canSeeEvent(row, viewer))
    .map((row) => {
      const own = row.createdById === viewer.id;
      return {
        ...mapEvent(row),
        layer: (own ? "own" : "shared") as CalendarLayer,
        editable: canEditEvent(row, viewer),
        created_by_name: row.createdBy?.fullName,
      };
    })
    .filter((e) => wanted.has(e.layer));
  if (!events.length) {
    const { listCalendarEvents } = await import("../api/workflow");
    const apiEvents = await listCalendarEvents().catch(() => []);
    if (apiEvents && apiEvents.length) {
      events = apiEvents.map((ev: any): any => ({
        id: ev.id || ev.ID || "",
        title: ev.title || ev.Title || "",
        description: ev.description || ev.Description || undefined,
        start_date: (ev.startTime || ev.StartTime || new Date().toISOString()).replace("Z", ""),
        end_date: (ev.endTime || ev.EndTime || new Date().toISOString()).replace("Z", ""),
        is_all_day: Boolean(ev.isAllDay),
        location: ev.location || undefined,
        deal_id: ev.dealId || undefined,
        created_by: ev.organizerId || undefined,
        created_by_name: "Staff",
        created_at: ev.createdAt || new Date().toISOString(),
        updated_at: ev.updatedAt || new Date().toISOString(),
        layer: "own" as CalendarLayer,
        editable: true,
      }));
    }
  }
  const system = await systemEvents(viewer, start, end, wanted);
  return [...events, ...system].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );
}

export async function getUpcomingEventsFor(userId: string, limit = 3) {
  const now = new Date();
  return (
    await getCalendarFor(
      userId,
      now,
      new Date(now.getTime() + 60 * 86_400_000),
      ["own", "shared", "leave", "holidays", "sales", "meetings"],
    )
  )
    .filter((e) => new Date(e.end_date) >= now)
    .slice(0, limit);
}

export async function getCalendarEvents(
  startDate?: Date,
  endDate?: Date,
  limit?: number,
): Promise<CalendarEvent[]> {
  const [rawEvents, rawDeals] = await Promise.all([
    listTableRows<any>("workflow", "calendar_event", "start_date ASC").catch(() => []),
    listTableRows<any>("sales", "crm_deal").catch(() => []),
  ]);
  const dealMap = new Map<string, any>(rawDeals.map((d): [any, any] => [d.id, d]));
  let events = rawEvents.filter((row) => {
    const s = new Date(row.startDate || row.startTime || 0).getTime();
    const e = new Date(row.endDate || row.endTime || row.startDate || 0).getTime();
    if (startDate && endDate) return s <= endDate.getTime() && e >= startDate.getTime();
    if (startDate) return e >= startDate.getTime();
    return true;
  });
  if (limit) events = events.slice(0, limit);
  return events.map((ev) => mapEvent({ ...ev, deal: ev.dealId ? dealMap.get(ev.dealId) || null : null }));
}

export async function getCalendarEventById(
  id: string,
): Promise<CalendarEvent | null> {
  const [rawEvents, rawDeals] = await Promise.all([
    listTableRows<any>("workflow", "calendar_event").catch(() => []),
    listTableRows<any>("sales", "crm_deal").catch(() => []),
  ]);
  const event = rawEvents.find((e) => e.id === id);
  if (!event) return null;
  const deal = event.dealId ? rawDeals.find((d) => d.id === event.dealId) || null : null;
  return mapEvent({ ...event, deal });
}

export interface CalendarAudienceInput {
  visibility?: CalendarVisibility;
  audience_user_ids?: string[];
  audience_department_ids?: string[];
  audience_roles?: string[];
}

function normalizeAudience(input: CalendarAudienceInput) {
  const visibility = input.visibility ?? "team";
  if (!(CALENDAR_VISIBILITIES as readonly string[]).includes(visibility))
    throw new Error(serverMessages.chooseWhoCanSeeTheEvent);
  const unique = (list?: string[]) =>
    Array.from(
      new Set(
        (list ?? []).filter((x) => typeof x === "string" && x.length <= 150),
      ),
    ).slice(0, 200);
  const audience = {
    visibility,
    audienceUserIds: unique(input.audience_user_ids),
    audienceDepartmentIds: unique(input.audience_department_ids),
    audienceRoles: unique(input.audience_roles),
  };
  if (
    visibility === "custom" &&
    !audience.audienceUserIds.length &&
    !audience.audienceDepartmentIds.length &&
    !audience.audienceRoles.length
  )
    throw new Error(serverMessages.chooseThePeopleDepartmentsOrRoles);
  return audience;
}

export async function createCalendarEvent(
  data: {
    title: string;
    title_ar?: string;
    description?: string;
    start_date: string;
    end_date: string;
    all_day?: boolean;
    location?: string;
    color?: string;
    event_type?: "meeting" | "shoot" | "deadline" | "reminder";
    deal_id?: string;
    created_by?: string;
    google_event_id?: string;
    google_calendar_id?: string;
  } & CalendarAudienceInput,
): Promise<CalendarEvent> {
  const created = await upsertTableRow<any>("workflow", "calendar_event", {
    id: crypto.randomUUID(),
    title: data.title,
    titleAr: data.title_ar || null,
    description: data.description || null,
    startDate: new Date(data.start_date).toISOString(),
    endDate: new Date(data.end_date).toISOString(),
    allDay: data.all_day ?? false,
    location: data.location || null,
    color: data.color || null,
    eventType: data.event_type || "meeting",
    dealId: data.deal_id || null,
    createdById: data.created_by || null,
    googleEventId: data.google_event_id || null,
    googleCalendarId: data.google_calendar_id || null,
    ...normalizeAudience(data),
  });
  return mapEvent(created);
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent> & CalendarAudienceInput,
): Promise<CalendarEvent | null> {
  const existing = (await listTableRows<any>("workflow", "calendar_event")).find((e) => e.id === id);
  if (!existing) return null;
  const updateData: any = { ...existing, id };
  if (data.title !== undefined) updateData.title = data.title;
  if (data.title_ar !== undefined) updateData.titleAr = data.title_ar || null;
  if (data.description !== undefined)
    updateData.description = data.description || null;
  if (data.start_date !== undefined)
    updateData.startDate = new Date(data.start_date).toISOString();
  if (data.end_date !== undefined) updateData.endDate = new Date(data.end_date).toISOString();
  if (data.all_day !== undefined) updateData.allDay = data.all_day;
  if (data.location !== undefined) updateData.location = data.location || null;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.event_type !== undefined) updateData.eventType = data.event_type;
  if (data.deal_id !== undefined) updateData.dealId = data.deal_id || null;
  if (data.google_event_id !== undefined)
    updateData.googleEventId = data.google_event_id;
  if (data.google_calendar_id !== undefined)
    updateData.googleCalendarId = data.google_calendar_id;
  if (data.visibility !== undefined)
    Object.assign(updateData, normalizeAudience(data));
  const updated = await upsertTableRow<any>("workflow", "calendar_event", updateData);
  return mapEvent(updated);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  await deleteTableRow("workflow", "calendar_event", id);
  return true;
}

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function getCalendarFeedInfo(userId: string) {
  const rows = await listTableRows<any>("system", "calendar_feed_token").catch(() => []);
  const row = rows.find((r) => r.userId === userId);
  return row
    ? {
        layers: row.layers as CalendarLayer[],
        createdAt: new Date(row.createdAt || Date.now()).toISOString(),
        lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
      }
    : null;
}

export async function createCalendarFeedToken(
  userId: string,
  layers: string[],
) {
  const chosen = Array.from(new Set(layers)).filter((l) =>
    (CALENDAR_LAYERS as readonly string[]).includes(l),
  );
  if (!chosen.length)
    throw new Error(serverMessages.chooseWhatYourCalendarLinkIncludes);
  const token = crypto.randomBytes(32).toString("base64url");
  const rows = await listTableRows<any>("system", "calendar_feed_token").catch(() => []);
  const existing = rows.find((r) => r.userId === userId);
  await upsertTableRow("system", "calendar_feed_token", {
    ...(existing || {}),
    id: existing?.id ?? crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    layers: chosen,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  });
  return token;
}

export async function updateCalendarFeedLayers(
  userId: string,
  layers: string[],
) {
  const chosen = Array.from(new Set(layers)).filter((l) =>
    (CALENDAR_LAYERS as readonly string[]).includes(l),
  );
  if (!chosen.length)
    throw new Error(serverMessages.chooseWhatYourCalendarLinkIncludes);
  const rows = await listTableRows<any>("system", "calendar_feed_token");
  const existing = rows.find((r) => r.userId === userId);
  if (existing) {
    await upsertTableRow("system", "calendar_feed_token", {
      ...existing,
      layers: chosen,
    });
  }
}

export async function revokeCalendarFeedToken(userId: string) {
  const rows = await listTableRows<any>("system", "calendar_feed_token").catch(() => []);
  for (const r of rows.filter((row) => row.userId === userId)) {
    await deleteTableRow("system", "calendar_feed_token", r.id);
  }
}

export async function resolveCalendarFeedToken(token: string) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100)
    return null;
  const [rows, users] = await Promise.all([
    listTableRows<any>("system", "calendar_feed_token").catch(() => []),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  const tokenHash = hashToken(token);
  const row = rows.find((r) => r.tokenHash === tokenHash);
  if (!row) return null;
  const user = users.find((u) => u.id === row.userId);
  if (!user || !user.isActive) return null;
  await upsertTableRow("system", "calendar_feed_token", {
    ...row,
    lastUsedAt: new Date().toISOString(),
  });
  return {
    userId: row.userId,
    layers: row.layers as CalendarLayer[],
    role: user.role,
    permissions: user.permissions as Record<string, boolean> | null,
  };
}
