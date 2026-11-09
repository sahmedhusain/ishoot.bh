import { phoneSearchVariants } from "../constants/phone";
import { Prisma } from "@prisma/client";
import { db } from "../atomic";
import { ROUTES } from "../constants/routes";
import { OPEN_TASK_STATUSES } from "../constants/tasks";
import type {
  CustomArchiveFolder,
  DashboardLayoutItem,
} from "../constants/dashboard";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const dateOnly = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

function extractStoredFolders(raw: unknown): CustomArchiveFolder[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const folders = (raw as { customFolders?: unknown }).customFolders;
  if (!Array.isArray(folders)) return [];
  return folders.filter(
    (f): f is CustomArchiveFolder =>
      !!f &&
      typeof f === "object" &&
      typeof (f as CustomArchiveFolder).id === "string" &&
      typeof (f as CustomArchiveFolder).nameEn === "string",
  );
}

export async function getDashboardLayout(
  userId: string,
): Promise<unknown | null> {
  const row = await db.dashboardLayout.findUnique({
    where: { userId },
    select: { widgets: true },
  });
  if (!row) return null;
  if (Array.isArray(row.widgets)) return row.widgets;
  if (
    row.widgets &&
    typeof row.widgets === "object" &&
    Array.isArray((row.widgets as { items?: unknown }).items)
  ) {
    return (row.widgets as { items: unknown[] }).items;
  }
  return null;
}

export async function saveDashboardLayout(
  userId: string,
  widgets: DashboardLayoutItem[],
) {
  const existing = await db.dashboardLayout.findUnique({
    where: { userId },
    select: { widgets: true },
  });
  const customFolders = extractStoredFolders(existing?.widgets);
  const items = widgets.map((w) => ({
    id: w.id,
    size: w.size,
    ...(w.settings ? { settings: w.settings } : {}),
  }));
  const value = (
    customFolders.length > 0 ? { items, customFolders } : items
  ) as Prisma.InputJsonValue;
  await db.dashboardLayout.upsert({
    where: { userId },
    create: { userId, widgets: value },
    update: { widgets: value },
  });
}

export async function resetDashboardLayout(userId: string) {
  const existing = await db.dashboardLayout.findUnique({
    where: { userId },
    select: { widgets: true },
  });
  const customFolders = extractStoredFolders(existing?.widgets);
  if (customFolders.length > 0) {
    await db.dashboardLayout.update({
      where: { userId },
      data: {
        widgets: { customFolders } as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    await db.dashboardLayout.deleteMany({ where: { userId } });
  }
}

export async function listCustomFoldersForUser(params: {
  userId: string;
  role: string;
  departmentId?: string | null;
}): Promise<CustomArchiveFolder[]> {
  const rows = await db.dashboardLayout.findMany({
    select: { userId: true, widgets: true },
  });
  const all: CustomArchiveFolder[] = [];
  for (const row of rows) {
    for (const folder of extractStoredFolders(row.widgets)) {
      const isOwner = folder.ownerId === params.userId || row.userId === params.userId;
      const isCompany = folder.scope === "company";
      const isDept =
        folder.scope === "department" &&
        !!params.departmentId &&
        folder.departmentId === params.departmentId;
      const isRole =
        folder.scope === "role" &&
        (folder.roleKey === params.role || params.role === "super_admin" || params.role === "admin");
      if (isOwner || isCompany || isDept || isRole || params.role === "super_admin") {
        all.push({ ...folder, ownerId: folder.ownerId || row.userId });
      }
    }
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertCustomFolderForUser(
  userId: string,
  folder: CustomArchiveFolder,
): Promise<CustomArchiveFolder[]> {
  const existing = await db.dashboardLayout.findUnique({
    where: { userId },
    select: { widgets: true },
  });
  const raw = existing?.widgets;
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : undefined;
  const folders = extractStoredFolders(raw);
  const idx = folders.findIndex((f) => f.id === folder.id);
  const nextFolders =
    idx >= 0
      ? folders.map((f, i) => (i === idx ? folder : f))
      : [folder, ...folders].slice(0, 30);

  const payload = (
    items ? { items, customFolders: nextFolders } : { customFolders: nextFolders }
  ) as unknown as Prisma.InputJsonValue;

  await db.dashboardLayout.upsert({
    where: { userId },
    create: { userId, widgets: payload },
    update: { widgets: payload },
  });
  return nextFolders;
}

export async function deleteCustomFolderForUser(
  userId: string,
  folderId: string,
): Promise<void> {
  const existing = await db.dashboardLayout.findUnique({
    where: { userId },
    select: { widgets: true },
  });
  if (!existing) return;
  const raw = existing.widgets;
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : undefined;
  const nextFolders = extractStoredFolders(raw).filter((f) => f.id !== folderId);
  const payload = (
    items
      ? nextFolders.length > 0
        ? { items, customFolders: nextFolders }
        : items
      : { customFolders: nextFolders }
  ) as unknown as Prisma.InputJsonValue;

  await db.dashboardLayout.update({
    where: { userId },
    data: { widgets: payload },
  });
}

export async function hrPulseSummary(now = new Date()) {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const [activeCount, onLeaveCount, pendingLeaveCount] = await Promise.all([
    db.employee.count({ where: { status: "active" } }),
    db.leaveRequest.count({
      where: {
        status: "approved",
        startDate: { lte: now },
        endDate: { gte: today },
      },
    }),
    db.leaveRequest.count({ where: { status: "pending" } }),
  ]);
  return {
    active: activeCount,
    on_leave: onLeaveCount,
    pending_leave: pendingLeaveCount,
  };
}

export async function procurementPulseSummary() {
  const [openRequisitions, openOrders] = await Promise.all([
    db.purchaseRequisition.count({
      where: { status: { in: ["draft", "submitted", "approved"] } },
    }),
    db.purchaseOrder.count({
      where: { status: { in: ["draft", "sent", "partially_received"] } },
    }),
  ]);
  return {
    open_requisitions: openRequisitions,
    open_orders: openOrders,
  };
}

const OPEN_ORDER_STATUSES = ["placed", "paid", "packing", "shipped"];

export async function orderSummary(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const [open, today] = await Promise.all([
    db.salesOrder.count({ where: { status: { in: OPEN_ORDER_STATUSES } } }),
    db.salesOrder.aggregate({
      where: { placedAt: { gte: start }, status: { notIn: ["cancelled"] } },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);
  return {
    open,
    today_count: today._count._all,
    today_total: num(today._sum.total),
  };
}

export async function myTaskSummary(
  userId: string,
  now = new Date(),
  limit = 6,
) {
  const today = now.toISOString().slice(0, 10);
  const where: Prisma.TaskWhereInput = {
    assigneeId: userId,
    status: { in: OPEN_TASK_STATUSES },
  };
  const [open, overdue, rows] = await Promise.all([
    db.task.count({ where }),
    db.task.count({
      where: { ...where, dueDate: { lt: new Date(`${today}T00:00:00Z`) } },
    }),
    db.task.findMany({
      where,
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "asc" },
      ],
      take: limit,
      select: {
        id: true,
        number: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { name: true, color: true } },
      },
    }),
  ]);
  return {
    open,
    overdue,
    tasks: rows.map((t) => ({
      id: t.id,
      number: t.number,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: dateOnly(t.dueDate),
      project: t.project?.name ?? "",
      color: t.project?.color ?? "",
    })),
  };
}

export async function upcomingLegalDates(now = new Date(), limit = 5) {
  const rows = await db.legalMatter.findMany({
    where: {
      status: { not: "closed" },
      nextDate: { gte: new Date(now.toISOString().slice(0, 10)) },
    },
    orderBy: { nextDate: "asc" },
    take: limit,
    select: { id: true, number: true, title: true, kind: true, nextDate: true },
  });
  return rows.map((m) => ({
    id: m.id,
    number: m.number,
    title: m.title,
    kind: m.kind,
    next_date: dateOnly(m.nextDate),
  }));
}

export interface ActivityFeedEntry {
  id: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  at: string;
}

export async function activityFeed(
  userId: string,
  everyone: boolean,
  limit = 12,
): Promise<ActivityFeedEntry[]> {
  const rows = await db.activityLog.findMany({
    where: {
      ...(everyone ? {} : { userId }),
      action: { notIn: ["login", "logout", "view"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      user: { select: { fullName: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    user: r.user.fullName,
    action: r.action,
    entity_type: r.entityType,
    entity_id: r.entityId,
    at: r.createdAt.toISOString(),
  }));
}

export async function dashboardDepartments(userId: string, all: boolean) {
  const rows = await db.department.findMany({
    where: {
      isActive: true,
      ...(all ? {} : { OR: [{ managerId: userId }, { deputyId: userId }] }),
    },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameEn: true, nameAr: true },
  });
  return rows.map((d) => ({ id: d.id, name_en: d.nameEn, name_ar: d.nameAr }));
}

export async function departmentDashboard(
  departmentIds: string[],
  now = new Date(),
) {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const employees = await db.employee.findMany({
    where: {
      departmentId: { in: departmentIds },
      status: { in: ["active", "on_leave"] },
    },
    orderBy: [{ firstNameEn: "asc" }, { lastNameEn: "asc" }],
    take: 500,
    select: {
      id: true,
      userId: true,
      firstNameEn: true,
      lastNameEn: true,
      firstNameAr: true,
      lastNameAr: true,
      jobTitleEn: true,
      jobTitleAr: true,
      departmentId: true,
    },
  });
  const employeeIds = employees.map((e) => e.id);
  const userIds = employees
    .map((e) => e.userId)
    .filter((v): v is string => !!v);
  const [away, pendingLeave, openTasks, overdueTasks, openRequests] =
    await Promise.all([
      db.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: "approved",
          startDate: { lte: now },
          endDate: { gte: today },
        },
        select: { employeeId: true, endDate: true },
      }),
      db.leaveRequest.count({
        where: { employeeId: { in: employeeIds }, status: "pending" },
      }),
      db.task.groupBy({
        by: ["assigneeId"],
        where: {
          assigneeId: { in: userIds },
          status: { in: OPEN_TASK_STATUSES },
        },
        _count: { _all: true },
      }),
      db.task.groupBy({
        by: ["assigneeId"],
        where: {
          assigneeId: { in: userIds },
          status: { in: OPEN_TASK_STATUSES },
          dueDate: { lt: today },
        },
        _count: { _all: true },
      }),
      db.inquiry.groupBy({
        by: ["assignedToId"],
        where: {
          assignedToId: { in: userIds },
          workflowStatus: { notIn: ["resolved", "rejected"] },
          status: { not: "archived" },
        },
        _count: { _all: true },
      }),
    ]);
  const awayUntil = new Map(
    away.map((a) => [a.employeeId, dateOnly(a.endDate)]),
  );
  const open = new Map(openTasks.map((r) => [r.assigneeId, r._count._all]));
  const overdue = new Map(
    overdueTasks.map((r) => [r.assigneeId, r._count._all]),
  );
  const requests = new Map(
    openRequests.map((r) => [r.assignedToId, r._count._all]),
  );
  const people = employees.map((e) => ({
    id: e.id,
    name_en: `${e.firstNameEn} ${e.lastNameEn}`.trim(),
    name_ar: `${e.firstNameAr} ${e.lastNameAr}`.trim(),
    title_en: e.jobTitleEn,
    title_ar: e.jobTitleAr,
    away_until: awayUntil.get(e.id) ?? null,
    open_tasks: (e.userId && open.get(e.userId)) || 0,
    overdue_tasks: (e.userId && overdue.get(e.userId)) || 0,
    open_requests: (e.userId && requests.get(e.userId)) || 0,
  }));
  return {
    headcount: people.length,
    away_today: people.filter((p) => p.away_until).length,
    pending_leave: pendingLeave,
    open_tasks: people.reduce((sum, p) => sum + p.open_tasks, 0),
    overdue_tasks: people.reduce((sum, p) => sum + p.overdue_tasks, 0),
    open_requests: people.reduce((sum, p) => sum + p.open_requests, 0),
    people,
  };
}
export type DepartmentDashboard = Awaited<
  ReturnType<typeof departmentDashboard>
>;

export type RecordSearchCategory =
  | "orders"
  | "products"
  | "shipments"
  | "tasks"
  | "purchase_orders"
  | "legal"
  | "campaigns";

export interface RecordSearchOptions {
  tasks?: { userId: string; departmentId: string | null; all: boolean } | null;
  driverId?: string | null;
}

export async function searchRecords(
  query: string,
  limit: number,
  categories: ReadonlySet<RecordSearchCategory>,
  options: RecordSearchOptions = {},
) {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const like = { contains: q, mode: "insensitive" as const };
  const take = Math.min(Math.max(limit, 1), 20);
  const results: {
    category: RecordSearchCategory;
    id: string;
    title: string;
    subtitle: string;
    url: string;
    badge?: string;
  }[] = [];

  const [
    orders,
    products,
    shipments,
    tasks,
    purchaseOrders,
    matters,
    campaigns,
  ] = await Promise.all([
    categories.has("orders")
      ? db.salesOrder.findMany({
          where: {
            OR: [
              { number: like },
              { name: like },
              { email: like },
              ...phoneSearchVariants(q).map((value) => ({ phone: { contains: value } })),
            ],
          },
          orderBy: { placedAt: "desc" },
          take,
          select: {
            id: true,
            number: true,
            name: true,
            status: true,
            total: true,
            currency: true,
          },
        })
      : [],
    categories.has("products")
      ? db.product.findMany({
          where: {
            OR: [
              { nameEn: like },
              { nameAr: { contains: q } },
              { sku: like },
              { barcode: q },
              { variants: { some: { OR: [{ sku: like }, { barcode: q }] } } },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take,
          select: { id: true, nameEn: true, nameAr: true, sku: true },
        })
      : [],
    categories.has("shipments")
      ? db.shipment.findMany({
          where: {
            ...(options.driverId ? { driverId: options.driverId } : {}),
            OR: [
              { number: like },
              { recipientName: like },
              { trackingNumber: like },
              { order: { number: like } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, number: true, recipientName: true, status: true },
        })
      : [],
    categories.has("tasks")
      ? db.task.findMany({
          where: {
            AND: [
              options.tasks && !options.tasks.all
                ? {
                    OR: [
                      { assigneeId: options.tasks.userId },
                      { createdById: options.tasks.userId },
                      ...(options.tasks.departmentId
                        ? [{ departmentId: options.tasks.departmentId }]
                        : []),
                      { project: { ownerId: options.tasks.userId } },
                    ],
                  }
                : {},
              { OR: [{ number: like }, { title: like }] },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take,
          select: { id: true, number: true, title: true, status: true },
        })
      : [],
    categories.has("purchase_orders")
      ? db.purchaseOrder.findMany({
          where: {
            OR: [
              { number: like },
              { supplier: { companyName: like } },
              { supplier: { firstName: like } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take,
          select: {
            id: true,
            number: true,
            status: true,
            total: true,
            supplier: {
              select: { companyName: true, firstName: true, lastName: true },
            },
          },
        })
      : [],
    categories.has("legal")
      ? db.legalMatter.findMany({
          where: {
            OR: [
              { number: like },
              { title: like },
              { counterparty: like },
              { reference: like },
            ],
          },
          orderBy: { updatedAt: "desc" },
          take,
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            counterparty: true,
          },
        })
      : [],
    categories.has("campaigns")
      ? db.campaign.findMany({
          where: {
            OR: [{ code: like }, { name: like }, { utmCampaign: like }],
          },
          orderBy: { createdAt: "desc" },
          take,
          select: { id: true, code: true, name: true, status: true },
        })
      : [],
  ]);
  for (const o of orders)
    results.push({
      category: "orders",
      id: o.id,
      title: o.number,
      subtitle: `${o.name} • ${num(o.total).toFixed(3)} ${o.currency}`,
      url: ROUTES.orders.detail(o.id),
      badge: o.status,
    });
  for (const p of products)
    results.push({
      category: "products",
      id: p.id,
      title: p.nameEn || p.nameAr,
      subtitle: [p.sku, p.nameAr !== p.nameEn ? p.nameAr : ""]
        .filter(Boolean)
        .join(" • "),
      url: ROUTES.products.detail(p.id),
    });
  for (const s of shipments)
    results.push({
      category: "shipments",
      id: s.id,
      title: s.number,
      subtitle: s.recipientName,
      url: ROUTES.delivery.shipment(s.id),
      badge: s.status,
    });
  for (const t of tasks)
    results.push({
      category: "tasks",
      id: t.id,
      title: t.title,
      subtitle: t.number,
      url: ROUTES.tasks.detail(t.id),
      badge: t.status,
    });
  for (const po of purchaseOrders)
    results.push({
      category: "purchase_orders",
      id: po.id,
      title: po.number,
      subtitle: `${po.supplier.companyName || `${po.supplier.firstName ?? ""} ${po.supplier.lastName ?? ""}`.trim()} • ${num(po.total).toFixed(3)}`,
      url: ROUTES.procurement.order(po.id),
      badge: po.status,
    });
  for (const m of matters)
    results.push({
      category: "legal",
      id: m.id,
      title: m.title,
      subtitle: [m.number, m.counterparty].filter(Boolean).join(" • "),
      url: ROUTES.legal.matter(m.id),
      badge: m.status,
    });
  for (const c of campaigns)
    results.push({
      category: "campaigns",
      id: c.id,
      title: c.name,
      subtitle: c.code,
      url: ROUTES.marketing.campaigns,
      badge: c.status,
    });
  return results;
}
