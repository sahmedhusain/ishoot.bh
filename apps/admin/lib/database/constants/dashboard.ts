// The dashboard widget catalogue: every widget, who may see it, the module it needs and the sizes it can take,
// plus the default layout of each role. Runtime-free (no Prisma), so the browser can use it too.

/** Widths on the 12-column grid of a wide screen: quarter, third, half, two thirds, full. */
export type DashboardWidgetSize = "s" | "m" | "l" | "xl" | "full";
export const DASHBOARD_WIDGET_SIZES: readonly DashboardWidgetSize[] = [
  "s",
  "m",
  "l",
  "xl",
  "full",
];

export type DashboardWidgetKind =
  | "kpi"
  | "chart"
  | "list"
  | "actions"
  | "inbox"
  | "feed"
  | "folder"
  | "lifestyle";

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

const kpi = (
  id: string,
  requires: string[],
  module?: string,
): DashboardWidgetDefinition => ({
  id,
  kind: "kpi",
  requires,
  module,
  sizes: ["s", "m"],
  defaultSize: "s",
});
const panel = (
  id: string,
  kind: DashboardWidgetKind,
  requires: string[],
  module: string | undefined,
  sizes: DashboardWidgetSize[],
  defaultSize: DashboardWidgetSize,
): DashboardWidgetDefinition => ({
  id,
  kind,
  requires,
  module,
  sizes,
  defaultSize,
});

export const DASHBOARD_WIDGETS: readonly DashboardWidgetDefinition[] = [
  // Figures & KPIs
  kpi("kpi_revenue", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_receivables", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_expenses", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_profit", ["finance_analytics:read"], "invoicing"),
  kpi("kpi_pipeline", ["deals:read"], "crm_deals"),
  kpi("kpi_leads", ["leads:read"], "crm_deals"),
  kpi("kpi_orders", ["orders:read"], "store"),
  kpi("kpi_shipments", ["deliveries:read"], "delivery"),
  kpi("kpi_tasks", ["tasks:read"], "tasks"),
  panel("hr_pulse", "kpi", ["employees:read"], "hrms", ["s", "m", "l"], "m"),
  panel(
    "procurement_pulse",
    "kpi",
    ["procurement:read"],
    "procurement",
    ["s", "m"],
    "s",
  ),
  // Charts
  panel(
    "cashflow",
    "chart",
    ["finance_analytics:read"],
    "invoicing",
    ["l", "xl", "full"],
    "xl",
  ),
  panel(
    "pipeline_stages",
    "chart",
    ["deals:read"],
    "crm_deals",
    ["m", "l", "xl"],
    "m",
  ),
  // Inboxes and lists
  panel("workload", "inbox", [], undefined, ["xl", "full"], "full"),
  panel(
    "my_tasks",
    "list",
    ["tasks:read"],
    "tasks",
    ["m", "l", "xl", "full"],
    "l",
  ),
  panel(
    "recent_deals",
    "list",
    ["deals:read"],
    "crm_deals",
    ["l", "xl", "full"],
    "xl",
  ),
  panel(
    "upcoming_events",
    "list",
    ["calendar:read"],
    "calendar",
    ["m", "l"],
    "m",
  ),
  panel(
    "recent_orders",
    "list",
    ["orders:read"],
    "store",
    ["l", "xl", "full"],
    "l",
  ),
  panel(
    "low_stock",
    "list",
    ["inventory:read"],
    "products",
    ["m", "l", "xl"],
    "l",
  ),
  panel(
    "campaigns",
    "list",
    ["marketing:read"],
    "marketing",
    ["l", "xl", "full"],
    "l",
  ),
  panel("legal_dates", "list", ["legal:read"], "legal", ["m", "l"], "m"),
  panel("company", "list", ["settings:read"], undefined, ["m", "l"], "m"),
  // Actions and activity
  panel(
    "quick_actions",
    "actions",
    [],
    undefined,
    ["m", "l", "xl", "full"],
    "m",
  ),
  panel("activity", "feed", [], undefined, ["m", "l", "xl"], "l"),
  // Archive & Custom Folders (permission & scope filtered inside loader)
  panel(
    "archive_folders",
    "folder",
    [],
    undefined,
    ["m", "l", "xl", "full"],
    "l",
  ),
  panel(
    "custom_folders",
    "folder",
    [],
    undefined,
    ["m", "l", "xl", "full"],
    "l",
  ),
  // Personal & Lifestyle Widgets (available to all authenticated users)
  panel(
    "welcome_profile",
    "lifestyle",
    [],
    undefined,
    ["m", "l", "xl", "full"],
    "l",
  ),
  panel("clock_local", "lifestyle", [], undefined, ["s", "m", "l"], "s"),
  panel("clock_world", "lifestyle", [], undefined, ["s", "m", "l", "xl"], "m"),
  panel("weather_local", "lifestyle", [], undefined, ["s", "m", "l", "xl"], "s"),
  panel("calendar_mini", "lifestyle", [], undefined, ["s", "m", "l"], "m"),
  panel("scratchpad_notes", "lifestyle", [], undefined, ["s", "m", "l"], "m"),
  panel("focus_pomodoro", "lifestyle", [], undefined, ["s", "m"], "s"),
  panel("quick_calculator", "lifestyle", [], undefined, ["s", "m"], "s"),
  panel("currency_rates", "lifestyle", [], undefined, ["s", "m", "l"], "m"),
  panel("countdown_milestone", "lifestyle", [], undefined, ["s", "m", "l"], "s"),
  panel("sticky_quote", "lifestyle", [], undefined, ["s", "m", "l"], "s"),
  panel("bookmarks_launchpad", "lifestyle", [], undefined, ["s", "m", "l", "xl"], "m"),
];

export const dashboardWidget = (id: string) =>
  DASHBOARD_WIDGETS.find((w) => w.id === id);

export interface DashboardLayoutItem {
  id: string;
  size: DashboardWidgetSize;
  settings?: Record<string, string | number | boolean>;
}

export type CustomFolderScope = "personal" | "department" | "role" | "company";

export interface CustomFolderItemLink {
  id: string;
  title: string;
  url: string;
  kind?: string;
  addedAt: string;
}

export interface CustomArchiveFolder {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  color: "emerald" | "amber" | "sky" | "violet" | "rose" | "teal";
  scope: CustomFolderScope;
  ownerId: string;
  departmentId?: string | null;
  roleKey?: string | null;
  archiveGroup?: string | null;
  items: CustomFolderItemLink[];
  createdAt: string;
}

/** Desks the default layout is chosen by (the dashboard focus of the role). */
export type DashboardDesk =
  | "executive"
  | "finance"
  | "hr"
  | "sales"
  | "production"
  | "staff";

const DESK_LAYOUTS: Record<DashboardDesk, string[]> = {
  executive: [
    "welcome_profile",
    "clock_local",
    "clock_world",
    "weather_local",
    "kpi_revenue",
    "kpi_pipeline",
    "kpi_receivables",
    "kpi_profit",
    "kpi_orders",
    "kpi_tasks",
    "kpi_leads",
    "kpi_expenses",
    "workload",
    "cashflow",
    "pipeline_stages",
    "archive_folders",
    "custom_folders",
    "recent_deals",
    "upcoming_events",
    "recent_orders",
    "low_stock",
    "activity",
    "company",
  ],
  finance: [
    "welcome_profile",
    "clock_local",
    "currency_rates",
    "kpi_revenue",
    "kpi_receivables",
    "kpi_expenses",
    "kpi_profit",
    "workload",
    "cashflow",
    "archive_folders",
    "custom_folders",
    "quick_actions",
    "recent_orders",
    "activity",
  ],
  hr: [
    "welcome_profile",
    "clock_local",
    "weather_local",
    "hr_pulse",
    "kpi_tasks",
    "workload",
    "archive_folders",
    "custom_folders",
    "my_tasks",
    "calendar_mini",
    "upcoming_events",
    "quick_actions",
    "activity",
  ],
  sales: [
    "welcome_profile",
    "clock_local",
    "clock_world",
    "kpi_pipeline",
    "kpi_leads",
    "kpi_orders",
    "kpi_tasks",
    "workload",
    "pipeline_stages",
    "recent_deals",
    "recent_orders",
    "custom_folders",
    "my_tasks",
    "upcoming_events",
  ],
  production: [
    "welcome_profile",
    "clock_local",
    "weather_local",
    "kpi_tasks",
    "kpi_shipments",
    "kpi_orders",
    "workload",
    "my_tasks",
    "custom_folders",
    "upcoming_events",
    "recent_orders",
    "low_stock",
  ],
  staff: [
    "welcome_profile",
    "clock_local",
    "weather_local",
    "kpi_tasks",
    "workload",
    "my_tasks",
    "calendar_mini",
    "custom_folders",
    "scratchpad_notes",
    "upcoming_events",
    "quick_actions",
    "activity",
  ],
};

/** Roles whose work is narrower than their desk start from their own layout. */
const ROLE_LAYOUTS: Partial<Record<string, string[]>> = {
  warehouse_keeper: [
    "welcome_profile",
    "clock_world",
    "kpi_orders",
    "kpi_shipments",
    "kpi_tasks",
    "low_stock",
    "recent_orders",
    "custom_folders",
    "workload",
    "my_tasks",
  ],
  delivery_coordinator: [
    "welcome_profile",
    "weather_local",
    "clock_world",
    "kpi_shipments",
    "kpi_orders",
    "kpi_tasks",
    "workload",
    "recent_orders",
    "my_tasks",
    "quick_actions",
  ],
  driver: [
    "kpi_shipments",
    "welcome_profile",
    "weather_local",
    "clock_world",
    "kpi_tasks",
    "my_tasks",
    "quick_actions",
  ],
  customer_service: [
    "welcome_profile",
    "clock_world",
    "kpi_orders",
    "kpi_shipments",
    "kpi_tasks",
    "workload",
    "recent_orders",
    "my_tasks",
    "quick_actions",
  ],
  marketing: [
    "welcome_profile",
    "clock_world",
    "kpi_orders",
    "kpi_leads",
    "kpi_tasks",
    "campaigns",
    "custom_folders",
    "workload",
    "my_tasks",
    "upcoming_events",
  ],
  pr_officer: [
    "welcome_profile",
    "clock_world",
    "kpi_tasks",
    "workload",
    "custom_folders",
    "my_tasks",
    "upcoming_events",
    "activity",
  ],
  legal_counsel: [
    "welcome_profile",
    "clock_world",
    "kpi_tasks",
    "legal_dates",
    "archive_folders",
    "custom_folders",
    "workload",
    "my_tasks",
    "upcoming_events",
  ],
  procurement_officer: [
    "welcome_profile",
    "clock_world",
    "procurement_pulse",
    "kpi_tasks",
    "low_stock",
    "archive_folders",
    "custom_folders",
    "workload",
    "my_tasks",
    "quick_actions",
    "activity",
  ],
  department_manager: [
    "welcome_profile",
    "clock_world",
    "weather_local",
    "hr_pulse",
    "kpi_tasks",
    "kpi_pipeline",
    "kpi_orders",
    "workload",
    "archive_folders",
    "custom_folders",
    "my_tasks",
    "upcoming_events",
    "activity",
  ],
};

export type DashboardPresetId =
  | "role_default"
  | "executive_command"
  | "finance_focus"
  | "sales_commercial"
  | "operations_logistics"
  | "hr_people"
  | "lifestyle_balanced";

export const DASHBOARD_PRESETS: Record<
  Exclude<DashboardPresetId, "role_default">,
  string[]
> = {
  executive_command: DESK_LAYOUTS.executive,
  finance_focus: DESK_LAYOUTS.finance,
  sales_commercial: DESK_LAYOUTS.sales,
  operations_logistics: [
    "welcome_profile",
    "clock_world",
    "weather_local",
    "kpi_orders",
    "kpi_shipments",
    "procurement_pulse",
    "kpi_tasks",
    "low_stock",
    "archive_folders",
    "custom_folders",
    "workload",
    "my_tasks",
  ],
  hr_people: DESK_LAYOUTS.hr,
  lifestyle_balanced: [
    "welcome_profile",
    "clock_local",
    "clock_world",
    "weather_local",
    "calendar_mini",
    "scratchpad_notes",
    "focus_pomodoro",
    "quick_calculator",
    "currency_rates",
    "countdown_milestone",
    "sticky_quote",
    "kpi_tasks",
    "my_tasks",
    "custom_folders",
    "archive_folders",
    "upcoming_events",
    "quick_actions",
  ],
};

export interface WidgetGridBounds {
  minCols: number;
  maxCols: number;
  minRows: number;
  maxRows: number;
  defaultRows: number;
}

export function sizeToCols(size: DashboardWidgetSize): number {
  switch (size) {
    case "s":
      return 1;
    case "m":
    case "l":
      return 2;
    case "xl":
      return 3;
    case "full":
      return 4;
  }
}

export function colsToSize(
  cols: number,
  allowedSizes?: readonly DashboardWidgetSize[],
): DashboardWidgetSize {
  const clamped = Math.max(1, Math.min(4, Math.round(cols)));
  const preferred: DashboardWidgetSize[] =
    clamped === 1
      ? ["s", "m", "l", "xl", "full"]
      : clamped === 2
        ? ["l", "m", "s", "xl", "full"]
        : clamped === 3
          ? ["xl", "l", "full", "m", "s"]
          : ["full", "xl", "l", "m", "s"];
  if (!allowedSizes || allowedSizes.length === 0) return preferred[0];
  return preferred.find((s) => allowedSizes.includes(s)) ?? allowedSizes[0];
}

export function widgetGridBounds(id: string): WidgetGridBounds {
  const def = dashboardWidget(id);
  const sizes = def?.sizes ?? ["s", "m", "l"];
  const colValues = sizes.map(sizeToCols);
  const minCols = Math.min(...colValues);
  const maxCols = Math.max(...colValues);

  if (def?.kind === "kpi") {
    return { minCols, maxCols, minRows: 1, maxRows: 2, defaultRows: 1 };
  }
  if (def?.kind === "chart" || def?.kind === "inbox" || def?.kind === "folder") {
    return { minCols, maxCols, minRows: 2, maxRows: 4, defaultRows: 2 };
  }
  if (def?.kind === "list" || def?.kind === "feed") {
    return { minCols, maxCols, minRows: 2, maxRows: 4, defaultRows: 2 };
  }
  if (
    id === "clock_local" ||
    id === "weather_local" ||
    id === "countdown_milestone" ||
    id === "sticky_quote" ||
    id === "focus_pomodoro"
  ) {
    return { minCols, maxCols, minRows: 1, maxRows: 3, defaultRows: 2 };
  }
  if (
    id === "clock_world" ||
    id === "calendar_mini" ||
    id === "scratchpad_notes" ||
    id === "quick_calculator" ||
    id === "currency_rates" ||
    id === "bookmarks_launchpad"
  ) {
    return { minCols, maxCols, minRows: 2, maxRows: 4, defaultRows: 2 };
  }
  return { minCols, maxCols, minRows: 1, maxRows: 3, defaultRows: 2 };
}

/** The layout someone starts with: their role's, or their desk's, at each widget's default size. */
export function defaultDashboardLayout(
  role: string,
  desk: DashboardDesk,
): DashboardLayoutItem[] {
  const ids = ROLE_LAYOUTS[role] ?? DESK_LAYOUTS[desk] ?? DESK_LAYOUTS.staff;
  return ids.map((id) => ({
    id,
    size: dashboardWidget(id)?.defaultSize ?? "m",
  }));
}

export function presetDashboardLayout(
  presetId: DashboardPresetId,
  role: string,
  desk: DashboardDesk,
  available: ReadonlySet<string>,
): DashboardLayoutItem[] {
  if (presetId === "role_default") {
    return normalizeDashboardLayout(defaultDashboardLayout(role, desk), available);
  }
  const rawIds = DASHBOARD_PRESETS[presetId] ?? DESK_LAYOUTS.staff;
  return normalizeDashboardLayout(
    rawIds.map((id) => ({ id, size: dashboardWidget(id)?.defaultSize ?? "m" })),
    available,
  );
}

export const MAX_DASHBOARD_WIDGETS = 40;

/**
 * Unwraps either a legacy array `[{ id, size }]` or an object `{ items: [...], customFolders: [...] }`.
 */
export function extractDashboardItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: unknown[] }).items;
  }
  return [];
}

/**
 * A stored or submitted layout made safe: known widgets the person may see, each once, at a size the widget
 * allows, at most 40. Anything else is dropped.
 */
export function normalizeDashboardLayout(
  raw: unknown,
  available: ReadonlySet<string>,
): DashboardLayoutItem[] {
  const list = extractDashboardItems(raw);
  if (!list.length) return [];
  const seen = new Set<string>();
  const items: DashboardLayoutItem[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const size = (entry as { size?: unknown }).size;
    const rawSettings = (entry as { settings?: unknown }).settings;
    const widget = typeof id === "string" ? dashboardWidget(id) : undefined;
    if (!widget || seen.has(widget.id) || !available.has(widget.id)) continue;
    seen.add(widget.id);
    const settings: Record<string, string | number | boolean> | undefined =
      rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)
        ? Object.fromEntries(
            Object.entries(rawSettings as Record<string, unknown>).filter(
              ([k, v]) =>
                k.length <= 40 &&
                (typeof v === "string" || typeof v === "number" || typeof v === "boolean"),
            ) as [string, string | number | boolean][],
          )
        : undefined;
    items.push({
      id: widget.id,
      size:
        typeof size === "string" &&
        (widget.sizes as readonly string[]).includes(size)
          ? (size as DashboardWidgetSize)
          : widget.defaultSize,
      ...(settings && Object.keys(settings).length > 0 ? { settings } : {}),
    });
    if (items.length >= MAX_DASHBOARD_WIDGETS) break;
  }
  return items;
}

/** The widgets someone may see: every grant held and the module on. */
export function availableDashboardWidgets(
  grants: Record<string, boolean>,
  moduleOn: (moduleKey: string) => boolean,
) {
  return DASHBOARD_WIDGETS.filter(
    (w) =>
      w.requires.every((key) => grants[key] === true) &&
      (!w.module || moduleOn(w.module)),
  );
}

/** The next size a widget can take (wrapping round), for the resize button. */
export function nextDashboardSize(
  id: string,
  size: DashboardWidgetSize,
): DashboardWidgetSize {
  const sizes = dashboardWidget(id)?.sizes ?? DASHBOARD_WIDGET_SIZES;
  return sizes[(sizes.indexOf(size) + 1) % sizes.length];
}
