import {
  ARCHIVE_GROUPS,
  ARCHIVE_KINDS,
  activityFeed,
  archiveKindsFor,
  availableDashboardWidgets,
  defaultDashboardLayout,
  employeeIdForUser,
  getActiveDealStages,
  getApprovalWorkload,
  getComplaintWorkload,
  getCRMDealOverview,
  getDashboardLayout,
  getDocumentArchivePage,
  getFinancialSummary,
  getMonthlyCashflow,
  getRequestWorkload,
  getStockOverview,
  getUpcomingEventsFor,
  hrPulseSummary,
  isFeatureEnabled,
  listCampaigns,
  listCustomFoldersForUser,
  listOrders,
  myTaskSummary,
  normalizeDashboardLayout,
  orderSummary,
  procurementPulseSummary,
  shipmentCounts,
  upcomingLegalDates,
  type ArchiveGroup,
  type CustomArchiveFolder,
  type DashboardLayoutItem,
  type PermissionResource,
} from "@platform/database";
import { listInquiries } from "@platform/api-client";
import { ROUTES } from "../constants/routes";
import { readableApprovalTypes } from "./approval-access";
import { getCurrentPermissions, requireAuth } from "./auth";
import { getCachedCompanySettings } from "./cached-queries";
import { dashboardFocus } from "./dashboard-focus";
import { dataScope } from "./data-scope";

const MODULES = [
  "invoicing",
  "crm_deals",
  "store",
  "delivery",
  "tasks",
  "calendar",
  "products",
  "marketing",
  "legal",
  "procurement",
  "hrms",
];

export async function dashboardContext() {
  const user = await requireAuth();
  const grants = await getCurrentPermissions();
  const on = new Map(
    await Promise.all(
      MODULES.map(async (m) => [m, await isFeatureEnabled(m)] as const),
    ),
  );
  const moduleOn = (m: string) => on.get(m) ?? true;
  const widgets = availableDashboardWidgets(grants, moduleOn);
  return {
    user,
    grants,
    moduleOn,
    focus: dashboardFocus(user.role, grants),
    available: new Set(widgets.map((w) => w.id)),
  };
}
export type DashboardContext = Awaited<ReturnType<typeof dashboardContext>>;

export async function dashboardLayoutFor(
  ctx: DashboardContext,
): Promise<{ layout: DashboardLayoutItem[]; custom: boolean }> {
  const saved = await getDashboardLayout(ctx.user.id);
  if (saved)
    return {
      layout: normalizeDashboardLayout(saved, ctx.available),
      custom: true,
    };
  return {
    layout: normalizeDashboardLayout(
      defaultDashboardLayout(ctx.user.role, ctx.focus),
      ctx.available,
    ),
    custom: false,
  };
}

function quickActions(ctx: DashboardContext) {
  const can = (key: string) => ctx.grants[key] === true;
  const items: { key: string; href: string; show: boolean }[] = [
    {
      key: "newInvoice",
      href: ROUTES.invoices.create(),
      show:
        ctx.moduleOn("invoicing") &&
        can("invoices:write") &&
        can("contacts:read"),
    },
    {
      key: "newDeal",
      href: ROUTES.crm.newDeal(),
      show: ctx.moduleOn("crm_deals") && can("deals:create"),
    },
    {
      key: "newSale",
      href: ROUTES.orders.new,
      show: ctx.moduleOn("store") && can("orders:create"),
    },
    {
      key: "tasks",
      href: ROUTES.tasks.list,
      show: ctx.moduleOn("tasks") && can("tasks:read"),
    },
    {
      key: "newRequisition",
      href: ROUTES.procurement.newRequisition,
      show: ctx.moduleOn("procurement") && can("procurement:create"),
    },
    {
      key: "newProduct",
      href: ROUTES.products.new,
      show: ctx.moduleOn("products") && can("products:create"),
    },
    {
      key: "myDeliveries",
      href: "/dashboard/driver",
      show:
        ctx.moduleOn("delivery") &&
        can("deliveries:read") &&
        !can("deliveries:assign"),
    },
    {
      key: "newClaim",
      href: ROUTES.claims.create,
      show: can("self_service:read"),
    },
    {
      key: "calendar",
      href: ROUTES.calendar,
      show: ctx.moduleOn("calendar") && can("calendar:read"),
    },
    { key: "reports", href: ROUTES.reports.list, show: true },
  ];
  return items.filter((i) => i.show).map(({ key, href }) => ({ key, href }));
}

export async function loadDashboardData(
  ctx: DashboardContext,
  layout: DashboardLayoutItem[],
) {
  const ids = new Set(layout.map((w) => w.id));
  const has = (...wanted: string[]) => wanted.some((id) => ids.has(id));
  const can = (key: string) => ctx.grants[key] === true;
  const now = new Date();
  const canFinance = can("finance_analytics:read");
  const userId = ctx.user.id;

  const finance = has(
    "kpi_revenue",
    "kpi_receivables",
    "kpi_expenses",
    "kpi_profit",
  )
    ? getFinancialSummary()
    : null;
  const cashflow = has("cashflow") ? getMonthlyCashflow(6) : null;
  const deals = has("kpi_pipeline", "pipeline_stages", "recent_deals")
    ? dataScope("deals").then((scope) => getCRMDealOverview(true, scope))
    : null;
  const stages = has("pipeline_stages", "recent_deals")
    ? getActiveDealStages()
    : null;
  const leads = has("kpi_leads")
    ? listInquiries()
        .then((inqs) =>
          (inqs || []).filter(
            (i) =>
              i.inquiryType !== "complaint" &&
              new Date(i.createdAt).getTime() >= now.getTime() - 7 * 86400000,
          ).length,
        )
        .catch(() => 0)
    : null;
  const orders = has("kpi_orders") ? orderSummary(now) : null;
  const recentOrders = has("recent_orders")
    ? listOrders({ pageSize: 6 }).then((r) => r.rows)
    : null;
  const lowStock = has("low_stock")
    ? getStockOverview({ filter: "low", pageSize: 6 }).then((r) => ({
        rows: r.rows,
        total: r.total,
      }))
    : null;
  const shipments = has("kpi_shipments")
    ? (async () =>
        shipmentCounts(
          now,
          can("deliveries:assign")
            ? null
            : ((await employeeIdForUser(userId)) ?? "-"),
        ))()
    : null;
  const tasks = has("kpi_tasks", "my_tasks")
    ? myTaskSummary(userId, now)
    : null;
  const campaigns = has("campaigns")
    ? listCampaigns().then((rows) =>
        rows
          .filter((c) => c.status === "running" || c.status === "planned")
          .slice(0, 5),
      )
    : null;
  const legal = has("legal_dates") ? upcomingLegalDates(now) : null;
  const events = has("upcoming_events", "calendar_mini")
    ? getUpcomingEventsFor(userId, 8).catch((err) => {
        console.error("Error loading upcoming events for dashboard:", err);
        return [];
      })
    : null;
  const activity = has("activity")
    ? activityFeed(userId, can("audit_logs:read"))
    : null;
  const hrPulse = has("hr_pulse") ? hrPulseSummary(now) : null;
  const procurementPulse = has("procurement_pulse")
    ? procurementPulseSummary()
    : null;
  const archiveFolders = has("archive_folders")
    ? (async () => {
        const permittedKinds = archiveKindsFor(
          (res: PermissionResource) => can(`${res}:read`),
        );
        if (!permittedKinds.length) {
          return {
            groups: [] as { group: ArchiveGroup; count: number }[],
            recent: [] as {
              id: string;
              file_name: string;
              file_url: string;
              kind: string;
              created_at: string;
            }[],
            expired: 0,
            expiring: 0,
          };
        }
        const page = await getDocumentArchivePage({}, permittedKinds, 5);
        const permittedGroups = Array.from(
          new Set(
            ARCHIVE_GROUPS.filter((g) =>
              permittedKinds.some((k) => ARCHIVE_KINDS[k].group === g || page.counts.byGroup[g] >= 0),
            ),
          ),
        );
        return {
          groups: permittedGroups.map((g) => ({
            group: g,
            count: page.counts.byGroup[g] ?? 0,
          })),
          recent: page.items.slice(0, 5).map((item) => ({
            id: item.id,
            file_name: item.file_name,
            file_url: item.file_url,
            kind: item.kind,
            created_at: item.created_at,
          })),
          expired: page.counts.expired,
          expiring: page.counts.expiring,
        };
      })()
    : null;
  const customFolders = has("custom_folders")
    ? (async () => {
        return listCustomFoldersForUser({
          userId,
          role: ctx.user.role,
          departmentId: (ctx.user as any).department_id ?? null,
        });
      })()
    : null;
  const userProfile = has("welcome_profile", "custom_folders")
    ? (async () => {
        return {
          id: userId,
          fullName: ctx.user.full_name,
          email: ctx.user.email,
          role: ctx.user.role,
          departmentId: (ctx.user as any).department_id ?? null,
          departmentNameEn: "",
          departmentNameAr: "",
          jobTitleEn: "",
          jobTitleAr: "",
        };
      })()
    : null;
  const company = getCachedCompanySettings();
  const workload = has("workload")
    ? (async () => {
        const [approvals, requests, complaints] = await Promise.all([
          readableApprovalTypes().then((types) =>
            getApprovalWorkload(userId, types, now),
          ),
          can("requests:read")
            ? getRequestWorkload(
                userId,
                { includeComplaints: can("support:read") },
                now,
              )
            : Promise.resolve(null),
          can("support:read")
            ? getComplaintWorkload(now)
            : Promise.resolve(null),
        ]);
        return {
          approvals,
          requests,
          complaints,
          generatedAt: now.toISOString(),
        };
      })()
    : null;

  const safe = async <T>(promise: Promise<T> | T | null, fallback: T | null = null): Promise<T | null> => {
    if (!promise) return fallback;
    try {
      return await promise;
    } catch (err) {
      console.error("Dashboard widget query failed:", err);
      return fallback;
    }
  };

  const [
    financeData,
    cashflowData,
    dealsData,
    stagesData,
    leadsData,
    ordersData,
    recentOrdersData,
    lowStockData,
    shipmentsData,
    tasksData,
    campaignsData,
    legalData,
    eventsData,
    activityData,
    companyData,
    workloadData,
    hrPulseData,
    procurementPulseData,
    archiveFoldersData,
    customFoldersData,
    userProfileData,
  ] = await Promise.all([
    safe(finance),
    safe(cashflow),
    safe(deals),
    safe(stages),
    safe(leads, 0),
    safe(orders),
    safe(recentOrders, []),
    safe(lowStock, { rows: [], total: 0 }),
    safe(shipments),
    safe(tasks),
    safe(campaigns, []),
    safe(legal),
    safe(events, []),
    safe(activity, []),
    safe(company),
    safe(workload),
    safe(hrPulse),
    safe(procurementPulse),
    safe(archiveFolders),
    safe(customFolders, []),
    safe(userProfile),
  ]);

  return {
    generatedAt: now.toISOString(),
    showMoney: canFinance,
    finance: financeData,
    cashflow: cashflowData,
    deals: dealsData,
    stages: stagesData,
    leads: leadsData,
    orders: ordersData,
    recentOrders: recentOrdersData,
    lowStock: lowStockData,
    shipments: shipmentsData,
    tasks: tasksData,
    campaigns: campaignsData,
    legal: legalData,
    events: eventsData,
    activity: activityData,
    hrPulse: hrPulseData,
    procurementPulse: procurementPulseData,
    archiveFolders: archiveFoldersData,
    customFolders: (customFoldersData ?? []) as CustomArchiveFolder[],
    userProfile: userProfileData,
    currency: companyData.default_currency,
    companyCity: companyData.city || "",
    company: has("company")
      ? canFinance
        ? companyData
        : {
            ...companyData,
            bank_name: "",
            bank_iban: "",
            bank_account_number: "",
            bank_swift: "",
          }
      : null,
    workload: workloadData,
    actions: has("quick_actions") ? quickActions(ctx) : [],
  };
}
export type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;
