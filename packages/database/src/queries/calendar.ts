import { getTranslations, formatMessage, serverMessages } from "@ishoot/locales";

import crypto from "crypto";
import { db } from "../db";
import { ROUTES } from "../constants/routes";
import type {
  CalendarEvent,
  CalendarLayer,
  CalendarVisibility,
} from "../types";
import { getEffectivePermissions } from "./permissions";

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
    start_date: e.startDate.toISOString(),
    end_date: e.endDate.toISOString(),
    all_day: e.allDay,
    location: e.location || undefined,
    color: e.color || "#09937F",
    event_type: e.eventType as any,
    deal_id: e.dealId || undefined,
    created_by: e.createdById || undefined,
    google_event_id: e.googleEventId || undefined,
    google_calendar_id: e.googleCalendarId || undefined,
    recurrence: e.recurrence || undefined,
    reminders: (e.reminders as any) || undefined,
    attendees: (e.attendees as any) || undefined,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
    visibility: (e.visibility ?? "company") as CalendarVisibility,
    audience_user_ids: e.audienceUserIds ?? [],
    audience_department_ids: e.audienceDepartmentIds ?? [],
    audience_roles: e.audienceRoles ?? [],
    source: "event",
    deal: e.deal
      ? {
          id: e.deal.id,
          title: e.deal.title,
          value: Number(e.deal.dealValue),
          currency: e.deal.currency as any,
          stage: e.deal.dealStage as any,
          probability: e.deal.probability,
          created_at: e.deal.createdAt.toISOString(),
          updated_at: e.deal.updatedAt.toISOString(),
        }
      : undefined,
  };
}

// ---------- Who sees what ----------

interface Person {
  id: string;
  role: string;
  managerId: string | null;
  departmentId: string | null;
}

export interface CalendarViewer extends Person {
  /** Everyone above the viewer in the reporting line. */
  managers: Set<string>;
  /** Everyone below the viewer in the reporting line. */
  reports: Set<string>;
  people: Map<string, Person>;
  permissions: Record<string, boolean>;
}

/** The viewer's place in the company: department, reporting line and permissions. */
export async function calendarViewer(userId: string): Promise<CalendarViewer> {
  const [users, employees] = await Promise.all([
    db.user.findMany({
      select: { id: true, role: true, managerId: true, permissions: true },
    }),
    db.employee.findMany({
      where: { userId: { not: null } },
      select: { userId: true, departmentId: true },
    }),
  ]);
  const department = new Map(employees.map((e) => [e.userId!, e.departmentId]));
  const people = new Map<string, Person>(
    users.map((u) => [
      u.id,
      {
        id: u.id,
        role: u.role,
        managerId: u.managerId,
        departmentId: department.get(u.id) ?? null,
      },
    ]),
  );
  const me = users.find((u) => u.id === userId);
  if (!me) throw new Error(serverMessages.userNotFound);
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

/** Whether `viewer` sees an event created in the calendar. */
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
  // Managers above the creator see what their team plans.
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
      // The creator's reports, their peers under the same manager, and the creator's own manager chain.
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

/** Only the creator changes an event; administrators may manage any. */
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

// ---------- Role-related events from the rest of the system ----------

const COLORS: Record<CalendarLayer, string> = {
  own: "#09937F",
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

/** Dated work from leave, deals, quotations, invoices, payroll, documents, minutes and requests that the viewer is part of. */
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

  if (layers.has("holidays")) {
    for (const h of await db.publicHoliday.findMany({
      where: { date: { gte: start, lte: end } },
    }))
      out.push(
        allDayItem({
          id: h.id,
          layer: "holidays",
          title: h.nameEn,
          titleAr: h.nameAr,
          date: h.date,
          type: "reminder",
        }),
      );
  }

  if (layers.has("leave")) {
    // Your own leave, your team's, and everyone's for HR.
    const everyone = can("employees:read");
    const leave = await db.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: end },
        endDate: { gte: start },
        ...(everyone ? {} : { employee: { userId: { in: team } } }),
      },
      include: {
        leaveType: { select: { nameEn: true, nameAr: true } },
        employee: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
      take: 500,
    });
    for (const l of leave) {
      const n = name(l.employee);
      out.push(
        allDayItem({
          id: l.id,
          layer: "leave",
          title: `${n.en} · ${l.leaveType.nameEn}`,
          titleAr: `${n.ar} · ${l.leaveType.nameAr}`,
          date: l.startDate,
          endDate: l.endDate,
          href: ROUTES.approvalItem("leave_request", l.id),
          type: "reminder",
        }),
      );
    }
  }

  if (layers.has("sales") && can("deals:read")) {
    // Shoot days and expected closing: your deals and your team's; all of them for whoever manages the pipeline.
    const all = can("deals:delete");
    const deals = await db.crmDeal.findMany({
      where: {
        dealStage: { notIn: ["closed_lost"] },
        OR: [
          { shootDate: { gte: start, lte: end } },
          { expectedCloseDate: { gte: start, lte: end } },
        ],
        ...(all ? {} : { assignedTo: { in: team } }),
      },
      select: {
        id: true,
        title: true,
        shootDate: true,
        expectedCloseDate: true,
        dealStage: true,
      },
      take: 500,
    });
    for (const d of deals) {
      if (d.shootDate && d.shootDate >= start && d.shootDate <= end)
        out.push(
          allDayItem({
            id: `${d.id}:shoot`,
            layer: "sales",
            title: formatMessage(getTranslations("en").admin.calendarMessages.shoot, { title: d.title }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.shoot, { title: d.title }),
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
            title: formatMessage(getTranslations("en").admin.calendarMessages.expectedClose, { title: d.title }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.expectedClose, { title: d.title }),
            date: d.expectedCloseDate,
            href: ROUTES.crm.deal(d.id),
          }),
        );
    }
  }

  if (layers.has("sales") && can("quotations:read")) {
    const all = can("quotations:issue_send");
    const quotes = await db.quotation.findMany({
      where: {
        status: { in: ["issued", "approved"] },
        validUntilDate: { gte: start, lte: end },
        ...(all
          ? {}
          : {
              OR: [
                { salesOwnerId: { in: team } },
                { createdById: { in: team } },
              ],
            }),
      },
      select: { id: true, quotationNumber: true, validUntilDate: true },
      take: 300,
    });
    for (const q of quotes)
      out.push(
        allDayItem({
          id: q.id,
          layer: "sales",
          title: formatMessage(getTranslations("en").admin.calendarMessages.quotationExpiry, { number: q.quotationNumber }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.quotationExpiry, { number: q.quotationNumber }),
          date: q.validUntilDate,
          href: ROUTES.quotations.detail(q.id),
        }),
      );
  }

  if (layers.has("finance") && can("invoices:read")) {
    const invoices = await db.invoice.findMany({
      where: {
        status: { in: ["sent", "partially_paid", "overdue"] },
        dueDate: { gte: start, lte: end },
      },
      select: { id: true, invoiceNumber: true, dueDate: true },
      take: 300,
    });
    for (const i of invoices)
      out.push(
        allDayItem({
          id: i.id,
          layer: "finance",
          title: formatMessage(getTranslations("en").admin.calendarMessages.invoiceDue, { number: i.invoiceNumber }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.invoiceDue, { number: i.invoiceNumber }),
          date: i.dueDate,
          href: ROUTES.invoices.detail(i.id),
        }),
      );
  }

  if (layers.has("finance") && can("expenses:read")) {
    const bills = await db.recurringExpense.findMany({
      where: { isActive: true, nextDueDate: { gte: start, lte: end } },
      select: { id: true, titleEn: true, titleAr: true, nextDueDate: true },
      take: 200,
    });
    for (const b of bills)
      out.push(
        allDayItem({
          id: b.id,
          layer: "finance",
          title: formatMessage(getTranslations("en").admin.calendarMessages.billDue, { title: b.titleEn }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.billDue, { title: b.titleAr || b.titleEn }),
          date: b.nextDueDate,
          href: ROUTES.expenses.recurring,
        }),
      );
  }

  if (layers.has("payroll") && can("payroll:read")) {
    const runs = await db.payrollRun.findMany({
      where: { payDate: { gte: start, lte: end } },
      select: { id: true, year: true, month: true, payDate: true },
    });
    for (const r of runs)
      out.push(
        allDayItem({
          id: r.id,
          layer: "payroll",
          title: formatMessage(getTranslations("en").admin.calendarMessages.payrollPaid, { period: `${r.year}-${String(r.month).padStart(2, "0")}` }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.payrollPaid, { period: `${r.year}-${String(r.month).padStart(2, "0")}` }),
          date: r.payDate!,
          href: ROUTES.hr.payroll({ highlight: r.id }),
        }),
      );
  }

  if (layers.has("hr")) {
    // Document expiries: your own documents, and everyone's for HR.
    const everyone = can("employees:read");
    const employees = await db.employee.findMany({
      where: {
        status: { not: "terminated" },
        ...(everyone ? {} : { userId: viewer.id }),
        OR: [
          { passportExpiryDate: { gte: start, lte: end } },
          { cprExpiryDate: { gte: start, lte: end } },
          { credentials: { some: { expiryDate: { gte: start, lte: end } } } },
        ],
      },
      select: {
        id: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameAr: true,
        lastNameAr: true,
        passportExpiryDate: true,
        cprExpiryDate: true,
        credentials: {
          where: { expiryDate: { gte: start, lte: end } },
          select: { id: true, kind: true, label: true, expiryDate: true },
        },
      },
      take: 300,
    });
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
            title: formatMessage(getTranslations("en").admin.calendarMessages.passportExpiry, { name: n.en }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.passportExpiry, { name: n.ar }),
            date: e.passportExpiryDate,
            href: ROUTES.hr.employee(e.id),
          }),
        );
      if (e.cprExpiryDate && e.cprExpiryDate >= start && e.cprExpiryDate <= end)
        out.push(
          allDayItem({
            id: `${e.id}:cpr`,
            layer: "hr",
            title: formatMessage(getTranslations("en").admin.calendarMessages.cprExpiry, { name: n.en }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.cprExpiry, { name: n.ar }),
            date: e.cprExpiryDate,
            href: ROUTES.hr.employee(e.id),
          }),
        );
      for (const c of e.credentials)
        out.push(
          allDayItem({
            id: c.id,
            layer: "hr",
            title: formatMessage(getTranslations("en").admin.calendarMessages.credentialExpiry, { document: c.label || (getTranslations("en").admin.employeeResidency.kinds as Record<string,string>)[c.kind] || getTranslations("en").admin.calendarMessages.document, name: n.en }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.credentialExpiry, { document: c.label || (getTranslations("ar").admin.employeeResidency.kinds as Record<string,string>)[c.kind] || getTranslations("ar").admin.calendarMessages.document, name: n.ar }),
            date: c.expiryDate!,
            href: ROUTES.hr.employee(e.id),
          }),
        );
    }
    if (can("settings:read")) {
      for (const d of await db.companyDocument.findMany({
        where: { validUntil: { gte: start, lte: end } },
        select: { id: true, titleEn: true, titleAr: true, validUntil: true },
        take: 100,
      }))
        out.push(
          allDayItem({
            id: d.id,
            layer: "hr",
            title: formatMessage(getTranslations("en").admin.calendarMessages.companyDocumentExpiry, { title: d.titleEn }),
            titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.companyDocumentExpiry, { title: d.titleAr || d.titleEn }),
            date: d.validUntil!,
            href: ROUTES.archive,
          }),
        );
    }
  }

  if (layers.has("meetings") && can("moms:read")) {
    const moms = await db.minuteOfMeeting.findMany({
      where: { meetingDate: { gte: start, lte: end } },
      select: { id: true, title: true, titleAr: true, meetingDate: true },
      take: 200,
    });
    for (const m of moms)
      out.push(
        allDayItem({
          id: m.id,
          layer: "meetings",
          title: formatMessage(getTranslations("en").admin.calendarMessages.meeting, { title: m.title }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.meeting, { title: m.titleAr || m.title }),
          date: m.meetingDate,
          href: ROUTES.moms.detail(m.id),
          type: "meeting",
        }),
      );
  }

  if (layers.has("requests") && can("requests:read")) {
    const requests = await db.inquiry.findMany({
      where: {
        slaDueDate: { gte: start, lte: end },
        workflowStatus: { notIn: ["resolved", "rejected"] },
        ...(can("requests:assign") ? {} : { assignedToId: { in: team } }),
      },
      select: {
        id: true,
        reference: true,
        projectReference: true,
        name: true,
        slaDueDate: true,
      },
      take: 200,
    });
    for (const r of requests)
      out.push(
        allDayItem({
          id: r.id,
          layer: "requests",
          title: formatMessage(getTranslations("en").admin.calendarMessages.requestDue, { title: r.projectReference || r.name }),
          titleAr: formatMessage(getTranslations("ar").admin.calendarMessages.requestDue, { title: r.projectReference || r.name }),
          date: r.slaDueDate!,
          href: ROUTES.requests.detail(r.id),
        }),
      );
  }
  return out;
}

/**
 * Everything on one person's calendar between two dates: events they may see (their own, shared with them, their
 * team's and the company's) and, for the layers asked for, the dated work their role is part of.
 */
export async function getCalendarFor(
  userId: string,
  start: Date,
  end: Date,
  layers: readonly CalendarLayer[] = CALENDAR_LAYERS,
): Promise<CalendarEvent[]> {
  const viewer = await calendarViewer(userId);
  const wanted = new Set(layers);
  const rows = await db.calendarEvent.findMany({
    where: { startDate: { lte: end }, endDate: { gte: start } },
    include: { deal: true, createdBy: { select: { fullName: true } } },
    orderBy: { startDate: "asc" },
    take: 2000,
  });
  const events = rows
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
  const system = await systemEvents(viewer, start, end, wanted);
  return [...events, ...system].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  );
}

/** Upcoming events the user may see (dashboard widget). */
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

/** @deprecated Ignores who may see what; use getCalendarFor. Kept for older callers. */
export async function getCalendarEvents(
  startDate?: Date,
  endDate?: Date,
  limit?: number,
): Promise<CalendarEvent[]> {
  const where: any = {};
  if (startDate && endDate) {
    where.startDate = { lte: endDate };
    where.endDate = { gte: startDate };
  } else if (startDate) {
    where.endDate = { gte: startDate };
  }
  const events = await db.calendarEvent.findMany({
    where,
    take: limit,
    include: { deal: true },
    orderBy: { startDate: "asc" },
  });
  return events.map(mapEvent);
}

export async function getCalendarEventById(
  id: string,
): Promise<CalendarEvent | null> {
  const event = await db.calendarEvent.findUnique({
    where: { id },
    include: { deal: true },
  });
  return event ? mapEvent(event) : null;
}

// ---------- Saving ----------

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
    throw new Error(
      serverMessages.chooseThePeopleDepartmentsOrRoles,
    );
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
  const created = await db.calendarEvent.create({
    data: {
      title: data.title,
      titleAr: data.title_ar || null,
      description: data.description || null,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      allDay: data.all_day ?? false,
      location: data.location || null,
      color: data.color || "#09937F",
      eventType: data.event_type || "meeting",
      dealId: data.deal_id || null,
      createdById: data.created_by || null,
      googleEventId: data.google_event_id || null,
      googleCalendarId: data.google_calendar_id || null,
      ...normalizeAudience(data),
    },
    include: { deal: true },
  });
  return mapEvent(created);
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<CalendarEvent> & CalendarAudienceInput,
): Promise<CalendarEvent | null> {
  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  // Empty optional fields are cleared, not stored as empty strings.
  if (data.title_ar !== undefined) updateData.titleAr = data.title_ar || null;
  if (data.description !== undefined)
    updateData.description = data.description || null;
  if (data.start_date !== undefined)
    updateData.startDate = new Date(data.start_date);
  if (data.end_date !== undefined) updateData.endDate = new Date(data.end_date);
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
  const updated = await db.calendarEvent.update({
    where: { id },
    data: updateData,
    include: { deal: true },
  });
  return mapEvent(updated);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  await db.calendarEvent.delete({ where: { id } });
  return true;
}

// ---------- Personal subscription links ----------

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function getCalendarFeedInfo(userId: string) {
  const row = await db.calendarFeedToken.findUnique({
    where: { userId },
    select: { layers: true, createdAt: true, lastUsedAt: true },
  });
  return row
    ? {
        layers: row.layers as CalendarLayer[],
        createdAt: row.createdAt.toISOString(),
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      }
    : null;
}

/** A new secret subscription link (the previous one stops working). The raw token is returned once. */
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
  await db.calendarFeedToken.upsert({
    where: { userId },
    update: {
      tokenHash: hashToken(token),
      layers: chosen,
      lastUsedAt: null,
      createdAt: new Date(),
    },
    create: { userId, tokenHash: hashToken(token), layers: chosen },
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
  await db.calendarFeedToken.update({
    where: { userId },
    data: { layers: chosen },
  });
}

export async function revokeCalendarFeedToken(userId: string) {
  await db.calendarFeedToken.deleteMany({ where: { userId } });
}

/** The user behind a subscription link, if the link is valid and the user is still active. */
export async function resolveCalendarFeedToken(token: string) {
  if (typeof token !== "string" || token.length < 30 || token.length > 100)
    return null;
  const row = await db.calendarFeedToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, isActive: true, role: true, permissions: true },
      },
    },
  });
  if (!row || !row.user.isActive) return null;
  await db.calendarFeedToken.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    userId: row.userId,
    layers: row.layers as CalendarLayer[],
    role: row.user.role,
    permissions: row.user.permissions as Record<string, boolean> | null,
  };
}
