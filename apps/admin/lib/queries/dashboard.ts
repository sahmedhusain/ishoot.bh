import { phoneSearchVariants } from "../constants/phone";
import { listOrders } from "../api/commerce";
import { listShipments } from "../api/delivery";
import {
  listDepartments,
  listEmployees,
  listHRUsers,
  listLeaveRequests,
} from "../api/hr";
import {
  listProducts,
  listPurchaseOrders,
  listPurchaseRequisitions,
} from "../api/inventory";
import { listCampaigns, listInquiries } from "../api/sales";
import {
  getWorkspacePrefsApi,
  listActivityLogsApi,
  listLegalMattersApi,
  listWorkspaceFoldersApi,
  putWorkspacePrefsApi,
  resetWorkspaceLayoutApi,
  type WorkspacePrefs,
} from "../api/system";
import { listTasks } from "../api/workflow";
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

export async function getWorkspacePrefs(
  userId: string,
): Promise<WorkspacePrefs> {
  return getWorkspacePrefsApi(userId);
}

export async function saveWorkspacePrefs(
  userId: string,
  input: {
    widgets?: unknown;
    scratchpad?: Record<string, unknown>;
    sidebarPrefs?: Record<string, unknown>;
  },
): Promise<WorkspacePrefs> {
  return putWorkspacePrefsApi(userId, input);
}

export async function getScratchpad(
  userId: string,
): Promise<Record<string, unknown>> {
  const prefs = await getWorkspacePrefsApi(userId);
  return prefs.scratchpad && typeof prefs.scratchpad === "object"
    ? prefs.scratchpad
    : {};
}

export async function saveScratchpad(
  userId: string,
  scratchpad: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const updated = await putWorkspacePrefsApi(userId, { scratchpad });
  return updated.scratchpad ?? scratchpad;
}

export async function getSidebarPrefs(
  userId: string,
): Promise<Record<string, unknown>> {
  const prefs = await getWorkspacePrefsApi(userId);
  return prefs.sidebarPrefs && typeof prefs.sidebarPrefs === "object"
    ? prefs.sidebarPrefs
    : {};
}

export async function saveSidebarPrefs(
  userId: string,
  sidebarPrefs: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const updated = await putWorkspacePrefsApi(userId, { sidebarPrefs });
  return updated.sidebarPrefs ?? sidebarPrefs;
}

export async function getDashboardLayout(
  userId: string,
): Promise<unknown | null> {
  const row = await getWorkspacePrefsApi(userId);
  if (Array.isArray(row.widgets)) {
    return row.widgets.length > 0 ? row.widgets : null;
  }
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
  const existing = await getWorkspacePrefsApi(userId);
  const customFolders = extractStoredFolders(existing.widgets);
  const items = widgets.map((w) => ({
    id: w.id,
    size: w.size,
    ...(w.settings ? { settings: w.settings } : {}),
  }));
  const value = customFolders.length > 0 ? { items, customFolders } : items;
  await putWorkspacePrefsApi(userId, { widgets: value });
}

export async function resetDashboardLayout(userId: string) {
  const existing = await getWorkspacePrefsApi(userId);
  const customFolders = extractStoredFolders(existing.widgets);
  await resetWorkspaceLayoutApi(
    userId,
    customFolders.length > 0 ? { customFolders } : [],
  );
}

export async function listCustomFoldersForUser(params: {
  userId: string;
  role: string;
  departmentId?: string | null;
}): Promise<CustomArchiveFolder[]> {
  const rows = await listWorkspaceFoldersApi();
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
  const existing = await getWorkspacePrefsApi(userId);
  const raw = existing.widgets;
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

  const payload = items
    ? { items, customFolders: nextFolders }
    : { customFolders: nextFolders };

  await putWorkspacePrefsApi(userId, { widgets: payload });
  return nextFolders;
}

export async function deleteCustomFolderForUser(
  userId: string,
  folderId: string,
): Promise<void> {
  const existing = await getWorkspacePrefsApi(userId);
  const raw = existing.widgets;
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : undefined;
  const nextFolders = extractStoredFolders(raw).filter((f) => f.id !== folderId);
  const payload = items
    ? nextFolders.length > 0
      ? { items, customFolders: nextFolders }
      : items
    : { customFolders: nextFolders };

  await putWorkspacePrefsApi(userId, { widgets: payload });
}

export async function hrPulseSummary(now = new Date()) {
  const todayIso = now.toISOString().slice(0, 10);
  const [employees, leaveRequests] = await Promise.all([
    listEmployees().catch(() => []),
    listLeaveRequests().catch(() => []),
  ]);
  const activeCount = employees.filter((e) => e.status === "active").length;
  const onLeaveCount = leaveRequests.filter((l) => {
    if (l.status !== "approved") return false;
    const start = String(l.startDate ?? "").slice(0, 10);
    const end = String(l.endDate ?? "").slice(0, 10);
    return start <= todayIso && end >= todayIso;
  }).length;
  const pendingLeaveCount = leaveRequests.filter((l) => l.status === "pending").length;
  return {
    active: activeCount,
    on_leave: onLeaveCount,
    pending_leave: pendingLeaveCount,
  };
}

export async function procurementPulseSummary() {
  const [requisitions, orders] = await Promise.all([
    listPurchaseRequisitions().catch(() => []),
    listPurchaseOrders().catch(() => []),
  ]);
  const openRequisitions = requisitions.filter((r) =>
    ["draft", "submitted", "approved"].includes(r.status),
  ).length;
  const openOrders = orders.filter((o) =>
    ["draft", "sent", "partially_received"].includes(o.status),
  ).length;
  return {
    open_requisitions: openRequisitions,
    open_orders: openOrders,
  };
}

const OPEN_ORDER_STATUSES = ["placed", "paid", "packing", "shipped"];

export async function orderSummary(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const orders = await listOrders().catch(() => []);
  const open = orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length;
  const todayOrders = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    const placed = o.placedAt ? new Date(o.placedAt) : null;
    return placed ? placed >= start : false;
  });
  return {
    open,
    today_count: todayOrders.length,
    today_total: todayOrders.reduce((sum, o) => sum + num(o.total), 0),
  };
}

export async function myTaskSummary(
  userId: string,
  now = new Date(),
  limit = 6,
) {
  const today = now.toISOString().slice(0, 10);
  const allTasks = await listTasks({ assignedTo: userId }).catch(() => []);
  const openTasks = allTasks.filter((t) =>
    OPEN_TASK_STATUSES.includes(t.status as (typeof OPEN_TASK_STATUSES)[number]),
  );
  const overdue = openTasks.filter(
    (t) => t.dueDate && String(t.dueDate).slice(0, 10) < today,
  ).length;
  const sorted = [...openTasks].sort((a, b) => {
    const ad = a.dueDate ? String(a.dueDate) : "9999-12-31";
    const bd = b.dueDate ? String(b.dueDate) : "9999-12-31";
    if (ad !== bd) return ad.localeCompare(bd);
    return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
  });
  return {
    open: openTasks.length,
    overdue,
    tasks: sorted.slice(0, limit).map((t) => ({
      id: t.id,
      number: (t as any).number ?? "",
      title: t.title,
      status: t.status,
      priority: t.priority ?? "medium",
      due_date: t.dueDate ? dateOnly(new Date(t.dueDate)) : null,
      project: (t as any).projectName ?? "",
      color: (t as any).projectColor ?? "",
    })),
  };
}

export async function upcomingLegalDates(now = new Date(), limit = 5) {
  const today = now.toISOString().slice(0, 10);
  const matters = await listLegalMattersApi().catch(() => []);
  const filtered = matters
    .filter(
      (m) =>
        m.status !== "closed" &&
        m.nextDate &&
        String(m.nextDate).slice(0, 10) >= today,
    )
    .sort((a, b) => String(a.nextDate ?? "").localeCompare(String(b.nextDate ?? "")))
    .slice(0, limit);
  return filtered.map((m) => ({
    id: m.id,
    number: m.number ?? "",
    title: m.title ?? "",
    kind: m.kind ?? "matter",
    next_date: m.nextDate ? dateOnly(new Date(m.nextDate)) : null,
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
  const [rows, users] = await Promise.all([
    listActivityLogsApi(Math.max(limit * 3, 50)).catch(() => []),
    listHRUsers().catch(() => []),
  ]);
  const userNames = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u.fullName || u.email || u.id]));
  return rows
    .filter((r) => {
      if (!everyone && r.userId !== userId) return false;
      return !["login", "logout", "view"].includes(r.action ?? "");
    })
    .slice(0, limit)
    .map((r) => {
      const details =
        r.details && typeof r.details === "object" && !Array.isArray(r.details)
          ? (r.details as Record<string, unknown>)
          : undefined;
      const at =
        typeof details?.created_at === "string"
          ? details.created_at
          : new Date().toISOString();
      return {
        id: r.id,
        user: (r.userId && userNames.get(r.userId)) || r.userId || "System",
        action: r.action ?? "",
        entity_type: r.entityType ?? "",
        entity_id: r.entityId ?? null,
        at,
      };
    });
}

export async function dashboardDepartments(userId: string, all: boolean) {
  const rows = await listDepartments().catch(() => []);
  return rows
    .filter((d) => {
      if ((d as any).isActive === false) return false;
      if (all) return true;
      return (d as any).managerId === userId || (d as any).deputyId === userId;
    })
    .sort((a, b) => {
      const sa = (a as any).sortOrder ?? 0;
      const sb = (b as any).sortOrder ?? 0;
      if (sa !== sb) return sa - sb;
      return String(a.nameEn ?? "").localeCompare(String(b.nameEn ?? ""));
    })
    .map((d) => ({ id: d.id, name_en: d.nameEn, name_ar: d.nameAr }));
}

export async function departmentDashboard(
  departmentIds: string[],
  now = new Date(),
) {
  const todayIso = now.toISOString().slice(0, 10);
  const deptSet = new Set(departmentIds);
  const [allEmployees, allLeaves, allTasks, allInquiries] = await Promise.all([
    listEmployees().catch(() => []),
    listLeaveRequests().catch(() => []),
    listTasks().catch(() => []),
    listInquiries().catch(() => []),
  ]);

  const employees = allEmployees
    .filter(
      (e) =>
        e.departmentId &&
        deptSet.has(e.departmentId) &&
        ["active", "on_leave"].includes(e.status ?? ""),
    )
    .sort((a, b) =>
      `${a.firstNameEn} ${a.lastNameEn}`.localeCompare(
        `${b.firstNameEn} ${b.lastNameEn}`,
      ),
    )
    .slice(0, 500);

  const employeeIds = new Set(employees.map((e) => e.id));
  const userIds = new Set(
    employees.map((e: any) => e.userId as string | undefined).filter((v): v is string => !!v),
  );

  const awayUntil = new Map<string, string | null>();
  let pendingLeave = 0;
  for (const l of allLeaves) {
    if (!employeeIds.has(l.employeeId)) continue;
    if (l.status === "pending") pendingLeave++;
    if (l.status === "approved") {
      const start = String(l.startDate ?? "").slice(0, 10);
      const end = String(l.endDate ?? "").slice(0, 10);
      if (start <= todayIso && end >= todayIso) {
        awayUntil.set(l.employeeId, end || null);
      }
    }
  }

  const open = new Map<string, number>();
  const overdue = new Map<string, number>();
  for (const t of allTasks as any[]) {
    const assignee = t.assigneeId ?? t.assignedTo;
    if (!assignee || !userIds.has(assignee)) continue;
    if (!OPEN_TASK_STATUSES.includes(t.status as (typeof OPEN_TASK_STATUSES)[number])) {
      continue;
    }
    open.set(assignee, (open.get(assignee) ?? 0) + 1);
    if (t.dueDate && String(t.dueDate).slice(0, 10) < todayIso) {
      overdue.set(assignee, (overdue.get(assignee) ?? 0) + 1);
    }
  }

  const requests = new Map<string, number>();
  for (const r of allInquiries as any[]) {
    const assigned = r.assignedToId ?? r.assigned_to_id;
    if (!assigned || !userIds.has(assigned)) continue;
    if (["resolved", "rejected"].includes(r.workflowStatus ?? r.workflow_status)) continue;
    if (r.status === "archived") continue;
    requests.set(assigned, (requests.get(assigned) ?? 0) + 1);
  }

  const people = employees.map((e: any) => ({
    id: e.id,
    name_en: `${e.firstNameEn} ${e.lastNameEn}`.trim(),
    name_ar: `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim(),
    title_en: e.jobTitleEn ?? "",
    title_ar: e.jobTitleAr ?? "",
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
  const qLower = q.toLowerCase();
  const phoneVariants = phoneSearchVariants(q);
  const matches = (val: unknown) =>
    typeof val === "string" && val.toLowerCase().includes(qLower);
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
    categories.has("orders") ? listOrders().catch(() => []) : [],
    categories.has("products") ? listProducts().catch(() => []) : [],
    categories.has("shipments") ? listShipments().catch(() => []) : [],
    categories.has("tasks") ? listTasks().catch(() => []) : [],
    categories.has("purchase_orders") ? listPurchaseOrders().catch(() => []) : [],
    categories.has("legal") ? listLegalMattersApi().catch(() => []) : [],
    categories.has("campaigns") ? listCampaigns().catch(() => []) : [],
  ]);

  for (const o of orders
    .filter(
      (o) =>
        matches(o.number) ||
        matches(o.name) ||
        matches(o.email) ||
        (o.phone && phoneVariants.some((v) => o.phone!.includes(v))),
    )
    .slice(0, take)) {
    results.push({
      category: "orders",
      id: o.id,
      title: o.number,
      subtitle: `${o.name} • ${num(o.total).toFixed(3)} ${o.currency}`,
      url: ROUTES.orders.detail(o.id),
      badge: o.status,
    });
  }

  for (const p of products
    .filter(
      (p) =>
        matches(p.nameEn) ||
        matches(p.nameAr) ||
        matches(p.sku) ||
        p.barcode === q,
    )
    .slice(0, take)) {
    results.push({
      category: "products",
      id: p.id,
      title: p.nameEn || p.nameAr || p.sku || p.id,
      subtitle: [p.sku, p.nameAr !== p.nameEn ? p.nameAr : ""]
        .filter(Boolean)
        .join(" • "),
      url: ROUTES.products.detail(p.id),
    });
  }

  for (const s of shipments
    .filter((s) => {
      if (options.driverId && s.driverId !== options.driverId) return false;
      return (
        matches(s.number) ||
        matches(s.recipientName) ||
        matches(s.trackingNumber)
      );
    })
    .slice(0, take)) {
    results.push({
      category: "shipments",
      id: s.id,
      title: s.number,
      subtitle: s.recipientName,
      url: ROUTES.delivery.shipment(s.id),
      badge: s.status,
    });
  }

  for (const t of (tasks as any[])
    .filter((t) => {
      if (options.tasks && !options.tasks.all) {
        const assignee = t.assigneeId ?? t.assignedTo;
        const allowed =
          assignee === options.tasks.userId ||
          t.createdById === options.tasks.userId ||
          (!!options.tasks.departmentId && t.departmentId === options.tasks.departmentId);
        if (!allowed) return false;
      }
      return matches(t.number) || matches(t.title);
    })
    .slice(0, take)) {
    results.push({
      category: "tasks",
      id: t.id,
      title: t.title,
      subtitle: t.number ?? "",
      url: ROUTES.tasks.detail(t.id),
      badge: t.status,
    });
  }

  for (const po of purchaseOrders
    .filter((po) => matches(po.number) || matches((po as any).supplierName))
    .slice(0, take)) {
    results.push({
      category: "purchase_orders",
      id: po.id,
      title: po.number,
      subtitle: `${(po as any).supplierName ?? ""} • ${num(po.total).toFixed(3)}`,
      url: ROUTES.procurement.order(po.id),
      badge: po.status,
    });
  }

  for (const m of matters
    .filter(
      (m) =>
        matches(m.number) ||
        matches(m.title) ||
        matches(m.counterparty) ||
        matches(m.reference),
    )
    .slice(0, take)) {
    results.push({
      category: "legal",
      id: m.id,
      title: m.title ?? m.number ?? m.id,
      subtitle: [m.number, m.counterparty].filter(Boolean).join(" • "),
      url: ROUTES.legal.matter(m.id),
      badge: m.status ?? undefined,
    });
  }

  for (const c of (campaigns as any[])
    .filter(
      (c: any) =>
        matches(c.code) || matches(c.name) || matches(c.utmCampaign),
    )
    .slice(0, take)) {
    results.push({
      category: "campaigns",
      id: c.id,
      title: c.name,
      subtitle: c.code ?? "",
      url: ROUTES.marketing.campaigns,
      badge: c.status,
    });
  }

  return results;
}
