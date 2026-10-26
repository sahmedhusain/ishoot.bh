// The report catalogue: every report with who may run it, the module it belongs to and its columns. Runtime-free.
import type { PermissionResource } from "./permissions";

export const REPORT_AREAS = ["sales", "stock", "procurement", "delivery", "finance", "marketing", "people"] as const;
export type ReportArea = (typeof REPORT_AREAS)[number];

export type ReportColumnKind = "text" | "number" | "money" | "percent" | "date";

export interface ReportColumn {
  key: string;
  kind: ReportColumnKind;
}

export interface ReportDefinition {
  key: string;
  area: ReportArea;
  resource: PermissionResource;
  /** Optional module the report needs switched on. */
  module?: string;
  columns: ReportColumn[];
  /** Whether the report is about a date range (otherwise it is a snapshot of now). */
  ranged: boolean;
  /** The column compared with the previous period, and the one drawn as bars. */
  measure?: string;
}

const text = (key: string): ReportColumn => ({ key, kind: "text" });
const number = (key: string): ReportColumn => ({ key, kind: "number" });
const money = (key: string): ReportColumn => ({ key, kind: "money" });
const percent = (key: string): ReportColumn => ({ key, kind: "percent" });
const date = (key: string): ReportColumn => ({ key, kind: "date" });

export const REPORTS: readonly ReportDefinition[] = [
  // Sales
  { key: "sales_by_product", area: "sales", resource: "orders", module: "store", ranged: true, measure: "revenue", columns: [text("name"), text("sku"), number("quantity"), money("revenue"), money("cost"), money("margin"), percent("margin_rate")] },
  { key: "sales_by_category", area: "sales", resource: "orders", module: "store", ranged: true, measure: "revenue", columns: [text("name"), number("quantity"), money("revenue"), money("margin"), percent("margin_rate")] },
  { key: "sales_by_channel", area: "sales", resource: "orders", module: "store", ranged: true, measure: "revenue", columns: [text("name"), number("orders"), money("revenue"), money("average")] },
  { key: "sales_by_customer", area: "sales", resource: "orders", module: "store", ranged: true, measure: "revenue", columns: [text("name"), text("email"), number("orders"), money("revenue"), date("last_order")] },
  { key: "sales_by_salesperson", area: "sales", resource: "orders", module: "store", ranged: true, measure: "revenue", columns: [text("name"), number("orders"), money("revenue")] },
  { key: "order_funnel", area: "sales", resource: "orders", module: "store", ranged: true, measure: "orders", columns: [text("name"), number("orders"), percent("share")] },
  // Stock
  { key: "stock_on_hand", area: "stock", resource: "inventory", module: "products", ranged: false, measure: "value", columns: [text("name"), text("sku"), number("on_hand"), number("reserved"), number("available"), money("average_cost"), money("value")] },
  { key: "stock_movers", area: "stock", resource: "inventory", module: "products", ranged: true, measure: "sold", columns: [text("name"), text("sku"), number("sold"), number("on_hand"), number("days_of_cover")] },
  { key: "count_variance", area: "stock", resource: "inventory", module: "products", ranged: true, measure: "variance_value", columns: [text("name"), text("sku"), text("count"), number("expected"), number("counted"), number("variance"), money("variance_value")] },
  // Procurement
  { key: "spend_by_supplier", area: "procurement", resource: "procurement", module: "procurement", ranged: true, measure: "spend", columns: [text("name"), number("bills"), money("spend"), money("paid"), money("owed")] },
  { key: "open_purchase_orders", area: "procurement", resource: "procurement", module: "procurement", ranged: false, measure: "open_value", columns: [text("name"), text("supplier"), text("status"), date("expected"), money("total"), money("open_value")] },
  { key: "purchase_price_changes", area: "procurement", resource: "procurement", module: "procurement", ranged: true, measure: "change", columns: [text("name"), text("sku"), money("previous_price"), money("latest_price"), percent("change")] },
  // Delivery
  { key: "delivery_performance", area: "delivery", resource: "deliveries", module: "delivery", ranged: true, measure: "delivered", columns: [text("name"), number("shipments"), number("delivered"), percent("on_time"), number("failed_attempts"), money("cost_per_delivery"), money("cod_outstanding")] },
  // Finance
  { key: "receivables_aging", area: "finance", resource: "invoices", module: "invoicing", ranged: false, measure: "total", columns: [text("name"), money("current"), money("d1_30"), money("d31_60"), money("d61_90"), money("d90_plus"), money("total")] },
  { key: "payables_aging", area: "finance", resource: "procurement", module: "procurement", ranged: false, measure: "total", columns: [text("name"), money("current"), money("d1_30"), money("d31_60"), money("d61_90"), money("d90_plus"), money("total")] },
  // Marketing
  { key: "marketing_roi", area: "marketing", resource: "marketing", module: "marketing", ranged: false, measure: "revenue", columns: [text("name"), text("channel"), money("spend"), number("orders"), money("revenue"), number("return_on_spend")] },
  // People
  { key: "headcount_by_department", area: "people", resource: "employees", module: "hrms", ranged: true, measure: "headcount", columns: [text("name"), number("headcount"), number("joined"), number("left")] },
];

export const reportDefinition = (key: string) => REPORTS.find((r) => r.key === key);

export const REPORT_FORMATS = ["csv", "xlsx", "pdf"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];
export const REPORT_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

/** The period of equal length just before [from, to] ("YYYY-MM-DD", inclusive). */
export function previousPeriod(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const days = Math.round((end - start) / 86_400_000) + 1;
  const prevEnd = new Date(start - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  return { from: prevStart.toISOString().slice(0, 10), to: prevEnd.toISOString().slice(0, 10) };
}

/** Change from the previous value as a percentage (null when there was nothing before). */
export const changePercent = (current: number, previous: number) => (previous ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null);

/** The period a scheduled report covers when it runs: the day, week or month that just ended. */
export function scheduledPeriod(frequency: ReportFrequency, now: Date) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(today.getTime() - 86_400_000);
  const days = frequency === "daily" ? 1 : frequency === "weekly" ? 7 : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 0)).getUTCDate();
  const from = frequency === "monthly" ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1)) : new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** When a schedule runs next after `from`: tomorrow, the next Sunday, or the first of next month (early morning UTC). */
export function nextScheduledRun(frequency: ReportFrequency, from: Date) {
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 4));
  if (frequency === "daily") return new Date(day.getTime() + 86_400_000);
  if (frequency === "weekly") return new Date(day.getTime() + (((7 - day.getUTCDay()) % 7) || 7) * 86_400_000);
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1, 4));
}
