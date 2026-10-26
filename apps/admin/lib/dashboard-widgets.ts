import {
  activityFeed,
  availableDashboardWidgets,
  db,
  defaultDashboardLayout,
  employeeIdForUser,
  getActiveDealStages,
  getApprovalWorkload,
  getComplaintWorkload,
  getCRMDealOverview,
  getDashboardLayout,
  getFinancialSummary,
  getMonthlyCashflow,
  getRequestWorkload,
  getStockOverview,
  getUpcomingEventsFor,
  isFeatureEnabled,
  listCampaigns,
  listOrders,
  myTaskSummary,
  normalizeDashboardLayout,
  orderSummary,
  shipmentCounts,
  upcomingLegalDates,
  type DashboardLayoutItem,
} from "@platform/database";
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
];

/** Who is looking: their grants, the modules that are on, and the widgets they may place. */
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

/** The person's layout: what they saved, else their role's default, keeping only what they may see. */
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

/** Shortcuts on the quick actions widget, each shown only to people who can use it. */
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

/** Loads the data of the widgets on the board only (each loader checks nothing more than the catalogue did). */
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
  // Deals follow the person's data scope; values only for people who see finance.
  const deals = has("kpi_pipeline", "pipeline_stages", "recent_deals")
    ? dataScope("deals").then((scope) => getCRMDealOverview(true, scope))
    : null;
  const stages = has("pipeline_stages", "recent_deals")
    ? getActiveDealStages()
    : null;
  const leads = has("kpi_leads")
    ? db.inquiry.count({
        where: {
          intent: { not: "complaint" },
          createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
        },
      })
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
  // Drivers count only their own shipments.
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
  const events = has("upcoming_events")
    ? getUpcomingEventsFor(userId, 4)
    : null;
  const activity = has("activity")
    ? activityFeed(userId, can("audit_logs:read"))
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
  ] = await Promise.all([
    finance,
    cashflow,
    deals,
    stages,
    leads,
    orders,
    recentOrders,
    lowStock,
    shipments,
    tasks,
    campaigns,
    legal,
    events,
    activity,
    company,
    workload,
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
    currency: companyData.default_currency,
    // Bank and registration details only for people who see finance.
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
