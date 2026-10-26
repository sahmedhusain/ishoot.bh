// The dashboard widget catalogue: every widget, who may see it, the module it needs and the sizes it can take,
// plus the default layout of each role. Runtime-free (no Prisma), so the browser can use it too.

/** Widths on the 12-column grid of a wide screen: quarter, third, half, two thirds, full. */
export type DashboardWidgetSize = "s" | "m" | "l" | "xl" | "full";
export const DASHBOARD_WIDGET_SIZES: readonly DashboardWidgetSize[] = ["s", "m", "l", "xl", "full"];

export type DashboardWidgetKind = "kpi" | "chart" | "list" | "actions" | "inbox" | "feed";

export interface DashboardWidgetDefinition {
  id: string;
  kind: DashboardWidgetKind;
  /** Permission grants ("resource:action"); the widget shows when every one is held. */
  requires: string[];
  /** Module the widget belongs to; off means hidden, even for Super Admin. */
  module?: string;
  sizes: readonly DashboardWidgetSize[];
  defaultSize: DashboardWidgetSize;
}

const kpi = (id: string, requires: string[], module?: string): DashboardWidgetDefinition => ({ id, kind: "kpi", requires, module, sizes: ["s", "m"], defaultSize: "s" });
const panel = (id: string, kind: DashboardWidgetKind, requires: string[], module: string | undefined, sizes: DashboardWidgetSize[], defaultSize: DashboardWidgetSize): DashboardWidgetDefinition => ({ id, kind, requires, module, sizes, defaultSize });

export const DASHBOARD_WIDGETS: readonly DashboardWidgetDefinition[] = [
  // Figures
  kpi("kpi_revenue", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_receivables", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_expenses", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_profit", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_pipeline", ["deals:read"], "crm_deals"),
  kpi("kpi_leads", ["leads:read"], "crm_deals"),
  kpi("kpi_orders", ["orders:read"], "store"),
  kpi("kpi_shipments", ["deliveries:read"], "delivery"),
  kpi("kpi_tasks", ["tasks:read"], "tasks"),
  // Charts
  panel("cashflow", "chart", ["finance_analytics:read"], "invoicing", ["l", "xl", "full"], "xl"),
  panel("pipeline_stages", "chart", ["deals:read"], "crm_deals", ["m", "l", "xl"], "m"),
  // Inboxes and lists
  panel("workload", "inbox", [], undefined, ["xl", "full"], "full"),
  panel("my_tasks", "list", ["tasks:read"], "tasks", ["m", "l", "xl", "full"], "l"),
  panel("recent_deals", "list", ["deals:read"], "crm_deals", ["l", "xl", "full"], "xl"),
  panel("upcoming_events", "list", ["calendar:read"], "calendar", ["m", "l"], "m"),
  panel("recent_orders", "list", ["orders:read"], "store", ["l", "xl", "full"], "l"),
  panel("low_stock", "list", ["inventory:read"], "products", ["m", "l", "xl"], "l"),
  panel("campaigns", "list", ["marketing:read"], "marketing", ["l", "xl", "full"], "l"),
  panel("legal_dates", "list", ["legal:read"], "legal", ["m", "l"], "m"),
  panel("company", "list", ["settings:read"], undefined, ["m", "l"], "m"),
  // Actions and activity
  panel("quick_actions", "actions", [], undefined, ["m", "l", "xl", "full"], "m"),
  panel("activity", "feed", [], undefined, ["m", "l", "xl"], "l"),
];

export const dashboardWidget = (id: string) => DASHBOARD_WIDGETS.find((w) => w.id === id);

export interface DashboardLayoutItem {
  id: string;
  size: DashboardWidgetSize;
}

/** Desks the default layout is chosen by (the dashboard focus of the role). */
export type DashboardDesk = "executive" | "finance" | "hr" | "sales" | "production" | "staff";

const DESK_LAYOUTS: Record<DashboardDesk, string[]> = {
  executive: ["kpi_revenue", "kpi_pipeline", "kpi_receivables", "kpi_profit", "kpi_orders", "kpi_tasks", "kpi_leads", "kpi_expenses", "workload", "cashflow", "pipeline_stages", "recent_deals", "upcoming_events", "recent_orders", "low_stock", "activity", "company"],
  finance: ["kpi_revenue", "kpi_receivables", "kpi_expenses", "kpi_profit", "workload", "cashflow", "quick_actions", "recent_orders", "activity"],
  hr: ["kpi_tasks", "workload", "my_tasks", "upcoming_events", "quick_actions", "activity"],
  sales: ["kpi_pipeline", "kpi_leads", "kpi_orders", "kpi_tasks", "workload", "pipeline_stages", "recent_deals", "recent_orders", "my_tasks", "upcoming_events"],
  production: ["kpi_tasks", "kpi_shipments", "kpi_orders", "workload", "my_tasks", "upcoming_events", "recent_orders", "low_stock"],
  staff: ["kpi_tasks", "workload", "my_tasks", "upcoming_events", "quick_actions", "activity"],
};

/** Roles whose work is narrower than their desk start from their own layout. */
const ROLE_LAYOUTS: Partial<Record<string, string[]>> = {
  warehouse_keeper: ["kpi_orders", "kpi_shipments", "kpi_tasks", "low_stock", "recent_orders", "workload", "my_tasks"],
  delivery_coordinator: ["kpi_shipments", "kpi_orders", "kpi_tasks", "workload", "recent_orders", "my_tasks", "quick_actions"],
  driver: ["kpi_shipments", "kpi_tasks", "my_tasks", "quick_actions"],
  customer_service: ["kpi_orders", "kpi_shipments", "kpi_tasks", "workload", "recent_orders", "my_tasks", "quick_actions"],
  marketing: ["kpi_orders", "kpi_leads", "kpi_tasks", "campaigns", "workload", "my_tasks", "upcoming_events"],
  pr_officer: ["kpi_tasks", "workload", "my_tasks", "upcoming_events", "activity"],
  legal_counsel: ["kpi_tasks", "legal_dates", "workload", "my_tasks", "upcoming_events"],
  procurement_officer: ["kpi_tasks", "low_stock", "workload", "my_tasks", "quick_actions", "activity"],
  department_manager: ["kpi_tasks", "kpi_pipeline", "kpi_orders", "workload", "my_tasks", "upcoming_events", "activity"],
};

/** The layout someone starts with: their role's, or their desk's, at each widget's default size. */
export function defaultDashboardLayout(role: string, desk: DashboardDesk): DashboardLayoutItem[] {
  const ids = ROLE_LAYOUTS[role] ?? DESK_LAYOUTS[desk] ?? DESK_LAYOUTS.staff;
  return ids.map((id) => ({ id, size: dashboardWidget(id)?.defaultSize ?? "m" }));
}

export const MAX_DASHBOARD_WIDGETS = 40;

/**
 * A stored or submitted layout made safe: known widgets the person may see, each once, at a size the widget
 * allows, at most 40. Anything else is dropped.
 */
export function normalizeDashboardLayout(raw: unknown, available: ReadonlySet<string>): DashboardLayoutItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: DashboardLayoutItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const size = (entry as { size?: unknown }).size;
    const widget = typeof id === "string" ? dashboardWidget(id) : undefined;
    if (!widget || seen.has(widget.id) || !available.has(widget.id)) continue;
    seen.add(widget.id);
    items.push({ id: widget.id, size: typeof size === "string" && (widget.sizes as readonly string[]).includes(size) ? (size as DashboardWidgetSize) : widget.defaultSize });
    if (items.length >= MAX_DASHBOARD_WIDGETS) break;
  }
  return items;
}

/** The widgets someone may see: every grant held and the module on. */
export function availableDashboardWidgets(grants: Record<string, boolean>, moduleOn: (moduleKey: string) => boolean) {
  return DASHBOARD_WIDGETS.filter((w) => w.requires.every((key) => grants[key] === true) && (!w.module || moduleOn(w.module)));
}

/** The next size a widget can take (wrapping round), for the resize button. */
export function nextDashboardSize(id: string, size: DashboardWidgetSize): DashboardWidgetSize {
  const sizes = dashboardWidget(id)?.sizes ?? DASHBOARD_WIDGET_SIZES;
  return sizes[(sizes.indexOf(size) + 1) % sizes.length];
}
