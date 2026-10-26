import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { reportDefinition, previousPeriod, type ReportDefinition } from "../constants/reports";
import { listCampaigns } from "./marketing";

type Row = Record<string, string | number | null>;
const num = (value: { toString(): string } | null | undefined) => (value == null ? 0 : Number(value.toString()));
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const day = (text: string, end = false) => new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
const nameOf = (en: string, ar: string, locale: "en" | "ar") => (locale === "ar" ? ar || en : en || ar);
const contactName = (c: { firstName: string; lastName: string | null; companyName: string | null } | null | undefined) => (c ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") : "");

export interface ReportParams {
  from: string;
  to: string;
  locale: "en" | "ar";
  /** Labels the report needs in the reader's language (channels, statuses, "website"…). */
  labels: Record<string, string>;
}

/** Sold lines in the period (orders not cancelled), with what the goods cost when they left stock. */
async function soldLines(from: string, to: string) {
  const orders = await db.salesOrder.findMany({
    where: { placedAt: { gte: day(from), lte: day(to, true) }, status: { notIn: ["cancelled"] } },
    select: { id: true, channel: true, createdById: true, contactId: true, name: true, email: true, total: true, placedAt: true, status: true, lines: { select: { productId: true, quantity: true, lineTotal: true, returnedQuantity: true } } },
  });
  const costs = await db.stockMovement.findMany({ where: { type: "sale", sourceType: "order", sourceId: { in: orders.map((o) => o.id) } }, select: { sourceId: true, productId: true, quantity: true, unitCost: true } });
  const costOf = new Map<string, number>();
  for (const c of costs) costOf.set(`${c.sourceId}|${c.productId}`, round3((costOf.get(`${c.sourceId}|${c.productId}`) ?? 0) + Math.abs(num(c.quantity)) * num(c.unitCost)));
  return { orders, costOf };
}

const RUNNERS: Record<string, (p: ReportParams) => Promise<Row[]>> = {
  async sales_by_product({ from, to, locale }) {
    const { orders, costOf } = await soldLines(from, to);
    const totals = new Map<string, { quantity: number; revenue: number; cost: number }>();
    for (const o of orders) for (const l of o.lines) {
      const t = totals.get(l.productId) ?? { quantity: 0, revenue: 0, cost: 0 };
      t.quantity += num(l.quantity) - num(l.returnedQuantity);
      t.revenue = round3(t.revenue + num(l.lineTotal));
      t.cost = round3(t.cost + (costOf.get(`${o.id}|${l.productId}`) ?? 0));
      totals.set(l.productId, t);
    }
    const products = await db.product.findMany({ where: { id: { in: Array.from(totals.keys()) } }, select: { id: true, sku: true, nameEn: true, nameAr: true } });
    return products.map((p) => {
      const t = totals.get(p.id)!;
      const margin = round3(t.revenue - t.cost);
      return { key: p.id, name: nameOf(p.nameEn, p.nameAr, locale), sku: p.sku, quantity: t.quantity, revenue: t.revenue, cost: t.cost, margin, margin_rate: pct(margin, t.revenue) };
    });
  },
  async sales_by_category(params) {
    const rows = await RUNNERS.sales_by_product(params);
    const products = await db.product.findMany({ where: { id: { in: rows.map((r) => String(r.key)) } }, select: { id: true, category: { select: { id: true, nameEn: true, nameAr: true } } } });
    const groups = new Map<string, { name: string; quantity: number; revenue: number; margin: number }>();
    for (const r of rows) {
      const category = products.find((p) => p.id === r.key)?.category;
      const id = category?.id ?? "none";
      const g = groups.get(id) ?? { name: category ? nameOf(category.nameEn, category.nameAr, params.locale) : params.labels.uncategorised ?? "—", quantity: 0, revenue: 0, margin: 0 };
      g.quantity += Number(r.quantity);
      g.revenue = round3(g.revenue + Number(r.revenue));
      g.margin = round3(g.margin + Number(r.margin));
      groups.set(id, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g, margin_rate: pct(g.margin, g.revenue) }));
  },
  async sales_by_channel({ from, to, labels }) {
    const { orders } = await soldLines(from, to);
    const groups = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const g = groups.get(o.channel) ?? { orders: 0, revenue: 0 };
      g.orders++;
      g.revenue = round3(g.revenue + num(o.total));
      groups.set(o.channel, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({ key, name: labels[`channel_${key}`] ?? key, orders: g.orders, revenue: g.revenue, average: round3(g.revenue / g.orders) }));
  },
  async sales_by_customer({ from, to }) {
    const { orders } = await soldLines(from, to);
    const groups = new Map<string, { name: string; email: string; orders: number; revenue: number; last: Date }>();
    for (const o of orders) {
      const key = o.contactId ?? o.email ?? o.name;
      const g = groups.get(key) ?? { name: o.name, email: o.email ?? "", orders: 0, revenue: 0, last: o.placedAt };
      g.orders++;
      g.revenue = round3(g.revenue + num(o.total));
      if (o.placedAt > g.last) g.last = o.placedAt;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({ key, name: g.name, email: g.email, orders: g.orders, revenue: g.revenue, last_order: g.last.toISOString().slice(0, 10) }));
  },
  async sales_by_salesperson({ from, to, labels }) {
    const { orders } = await soldLines(from, to);
    const groups = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const key = o.createdById ?? "website";
      const g = groups.get(key) ?? { orders: 0, revenue: 0 };
      g.orders++;
      g.revenue = round3(g.revenue + num(o.total));
      groups.set(key, g);
    }
    const users = await db.user.findMany({ where: { id: { in: Array.from(groups.keys()).filter((k) => k !== "website") } }, select: { id: true, fullName: true } });
    return Array.from(groups.entries()).map(([key, g]) => ({ key, name: key === "website" ? labels.website ?? key : users.find((u) => u.id === key)?.fullName ?? "—", orders: g.orders, revenue: g.revenue }));
  },
  async order_funnel({ from, to, labels }) {
    const orders = await db.salesOrder.findMany({ where: { placedAt: { gte: day(from), lte: day(to, true) } }, select: { status: true, paidAt: true, shippedAt: true, deliveredAt: true } });
    const total = orders.length;
    const steps = [
      ["placed", total],
      ["paid", orders.filter((o) => o.paidAt).length],
      ["shipped", orders.filter((o) => o.shippedAt).length],
      ["delivered", orders.filter((o) => o.deliveredAt).length],
      ["cancelled", orders.filter((o) => o.status === "cancelled").length],
      ["returned", orders.filter((o) => o.status === "returned").length],
    ] as const;
    return steps.map(([key, count]) => ({ key, name: labels[`status_${key}`] ?? key, orders: count, share: pct(count, total) }));
  },
  async stock_on_hand({ locale }) {
    const [levels, items, products] = await Promise.all([
      db.stockLevel.groupBy({ by: ["productId", "variantKey"], _sum: { onHand: true, reserved: true } }),
      db.stockItem.findMany({ select: { productId: true, variantKey: true, averageCost: true } }),
      db.product.findMany({ where: { trackStock: true }, select: { id: true, sku: true, nameEn: true, nameAr: true } }),
    ]);
    return products.map((p) => {
      const mine = levels.filter((l) => l.productId === p.id);
      const onHand = round3(mine.reduce((s, l) => s + num(l._sum.onHand), 0));
      const reserved = round3(mine.reduce((s, l) => s + num(l._sum.reserved), 0));
      const value = round3(mine.reduce((s, l) => s + num(l._sum.onHand) * num(items.find((i) => i.productId === p.id && i.variantKey === l.variantKey)?.averageCost), 0));
      return { key: p.id, name: nameOf(p.nameEn, p.nameAr, locale), sku: p.sku, on_hand: onHand, reserved, available: round3(onHand - reserved), average_cost: onHand ? round3(value / onHand) : 0, value };
    });
  },
  async stock_movers({ from, to, locale }) {
    const [sold, stock] = await Promise.all([
      db.stockMovement.groupBy({ by: ["productId"], where: { type: "sale", createdAt: { gte: day(from), lte: day(to, true) } }, _sum: { quantity: true } }),
      db.stockLevel.groupBy({ by: ["productId"], _sum: { onHand: true } }),
    ]);
    const products = await db.product.findMany({ where: { trackStock: true }, select: { id: true, sku: true, nameEn: true, nameAr: true } });
    const days = Math.max(1, Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000) + 1);
    return products.map((p) => {
      const s = Math.abs(num(sold.find((x) => x.productId === p.id)?._sum.quantity));
      const onHand = num(stock.find((x) => x.productId === p.id)?._sum.onHand);
      return { key: p.id, name: nameOf(p.nameEn, p.nameAr, locale), sku: p.sku, sold: round3(s), on_hand: round3(onHand), days_of_cover: s ? Math.round((onHand / (s / days)) * 10) / 10 : null };
    });
  },
  async count_variance({ from, to, locale }) {
    const lines = await db.stockCountLine.findMany({ where: { counted: { not: null }, count: { status: "approved", approvedAt: { gte: day(from), lte: day(to, true) } } }, include: { count: { select: { number: true } } } });
    const variances = lines.filter((l) => num(l.counted) !== num(l.expected));
    const [products, items] = await Promise.all([
      db.product.findMany({ where: { id: { in: variances.map((l) => l.productId) } }, select: { id: true, sku: true, nameEn: true, nameAr: true } }),
      db.stockItem.findMany({ where: { productId: { in: variances.map((l) => l.productId) } }, select: { productId: true, variantKey: true, averageCost: true } }),
    ]);
    return variances.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const variance = round3(num(l.counted) - num(l.expected));
      return { key: l.id, name: p ? nameOf(p.nameEn, p.nameAr, locale) : "—", sku: p?.sku ?? "", count: l.count.number, expected: num(l.expected), counted: num(l.counted), variance, variance_value: round3(variance * num(items.find((i) => i.productId === l.productId && i.variantKey === l.variantKey)?.averageCost)) };
    });
  },
  async spend_by_supplier({ from, to }) {
    const bills = await db.supplierBill.findMany({ where: { status: { in: ["approved", "partially_paid", "paid"] }, billDate: { gte: day(from), lte: day(to, true) } }, include: { supplier: { select: { id: true, firstName: true, lastName: true, companyName: true } } } });
    const groups = new Map<string, { name: string; bills: number; spend: number; paid: number }>();
    for (const b of bills) {
      const g = groups.get(b.supplierId) ?? { name: contactName(b.supplier), bills: 0, spend: 0, paid: 0 };
      g.bills++;
      g.spend = round3(g.spend + num(b.total));
      g.paid = round3(g.paid + num(b.amountPaid));
      groups.set(b.supplierId, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g, owed: round3(g.spend - g.paid) }));
  },
  async open_purchase_orders({ labels }) {
    const orders = await db.purchaseOrder.findMany({ where: { status: { in: ["approved", "sent", "partially_received"] } }, include: { supplier: { select: { firstName: true, lastName: true, companyName: true } }, lines: { select: { quantity: true, receivedQuantity: true, unitPrice: true } } } });
    return orders.map((o) => ({ key: o.id, name: o.number, supplier: contactName(o.supplier), status: labels[`po_${o.status}`] ?? o.status, expected: o.expectedDate?.toISOString().slice(0, 10) ?? null, total: num(o.total), open_value: round3(o.lines.reduce((s, l) => s + Math.max(0, num(l.quantity) - num(l.receivedQuantity)) * num(l.unitPrice), 0)) }));
  },
  async purchase_price_changes({ from, to, locale }) {
    const lines = await db.purchaseOrderLine.findMany({ where: { productId: { not: null }, purchaseOrder: { status: { notIn: ["draft", "cancelled"] }, orderDate: { lte: day(to, true) } } }, select: { productId: true, unitPrice: true, purchaseOrder: { select: { orderDate: true } } }, orderBy: { purchaseOrder: { orderDate: "asc" } } });
    const byProduct = new Map<string, { date: Date; price: number }[]>();
    for (const l of lines) byProduct.set(l.productId!, [...(byProduct.get(l.productId!) ?? []), { date: l.purchaseOrder.orderDate, price: num(l.unitPrice) }]);
    const changed = Array.from(byProduct.entries()).filter(([, prices]) => prices.length >= 2 && prices[prices.length - 1].date >= day(from));
    const products = await db.product.findMany({ where: { id: { in: changed.map(([id]) => id) } }, select: { id: true, sku: true, nameEn: true, nameAr: true } });
    return changed
      .map(([id, prices]) => {
        const latest = prices[prices.length - 1].price;
        const previous = prices[prices.length - 2].price;
        const p = products.find((x) => x.id === id);
        return { key: id, name: p ? nameOf(p.nameEn, p.nameAr, locale) : "—", sku: p?.sku ?? "", previous_price: previous, latest_price: latest, change: previous ? Math.round(((latest - previous) / previous) * 1000) / 10 : 0 };
      })
      .filter((r) => r.change !== 0);
  },
  async delivery_performance({ from, to, locale, labels }) {
    const shipments = await db.shipment.findMany({ where: { createdAt: { gte: day(from), lte: day(to, true) }, status: { not: "cancelled" } }, include: { zone: { select: { nameEn: true, nameAr: true } }, agency: { select: { name: true } }, events: { where: { status: "failed" }, select: { id: true } } } });
    const groups = new Map<string, { name: string; shipments: number; delivered: number; onTime: number; failed: number; fees: number; cod: number }>();
    for (const s of shipments) {
      const key = s.agencyId ?? (s.zoneId ? `zone:${s.zoneId}` : "own");
      const name = s.agency?.name ?? (s.zone ? nameOf(s.zone.nameEn, s.zone.nameAr, locale) : labels.ownFleet ?? "—");
      const g = groups.get(key) ?? { name, shipments: 0, delivered: 0, onTime: 0, failed: 0, fees: 0, cod: 0 };
      g.shipments++;
      if (s.status === "delivered") {
        g.delivered++;
        if (s.deliveredAt && s.deliveredAt <= s.promisedBy) g.onTime++;
        if (!s.codSettlementId && s.driverId) g.cod = round3(g.cod + num(s.codCollected));
      }
      g.failed += s.events.length;
      g.fees = round3(g.fees + num(s.agencyFee));
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({ key, name: g.name, shipments: g.shipments, delivered: g.delivered, on_time: pct(g.onTime, g.delivered), failed_attempts: g.failed, cost_per_delivery: g.delivered ? round3(g.fees / g.delivered) : 0, cod_outstanding: g.cod }));
  },
  async receivables_aging() {
    const invoices = await db.invoice.findMany({ where: { status: { in: ["sent", "partially_paid", "overdue"] } }, include: { client: { select: { id: true, firstName: true, lastName: true, companyName: true } }, payments: { select: { amount: true } } } });
    return aging(invoices.map((i) => ({ key: i.clientId ?? "none", name: contactName(i.client), due: i.dueDate, owed: round3(num(i.totalAmount) - i.payments.reduce((s, p) => s + num(p.amount), 0)) })));
  },
  async payables_aging() {
    const bills = await db.supplierBill.findMany({ where: { status: { in: ["approved", "partially_paid"] } }, include: { supplier: { select: { firstName: true, lastName: true, companyName: true } } } });
    return aging(bills.map((b) => ({ key: b.supplierId, name: contactName(b.supplier), due: b.dueDate ?? b.billDate, owed: round3(num(b.total) - num(b.amountPaid)) })));
  },
  async marketing_roi({ labels }) {
    const campaigns = await listCampaigns();
    return campaigns.map((c) => ({ key: c.id, name: c.name, channel: labels[`campaign_${c.channel}`] ?? c.channel, spend: c.spend, orders: c.orders, revenue: c.revenue, return_on_spend: c.return_on_spend }));
  },
  async headcount_by_department({ from, to, locale, labels }) {
    const [employees, departments] = await Promise.all([
      db.employee.findMany({ select: { departmentId: true, status: true, hireDate: true, updatedAt: true } }),
      db.department.findMany({ select: { id: true, nameEn: true, nameAr: true } }),
    ]);
    const groups = new Map<string, { headcount: number; joined: number; left: number }>();
    for (const e of employees) {
      const key = e.departmentId ?? "none";
      const g = groups.get(key) ?? { headcount: 0, joined: 0, left: 0 };
      if (e.status !== "terminated") g.headcount++;
      if (e.hireDate >= day(from) && e.hireDate <= day(to, true)) g.joined++;
      if (e.status === "terminated" && e.updatedAt >= day(from) && e.updatedAt <= day(to, true)) g.left++;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => {
      const d = departments.find((x) => x.id === key);
      return { key, name: d ? nameOf(d.nameEn, d.nameAr, locale) : labels.noDepartment ?? "—", ...g };
    });
  },
};

/** Amounts owed by party, in days-past-due buckets. */
function aging(items: { key: string; name: string; due: Date; owed: number }[], now = new Date()) {
  const groups = new Map<string, Row & { total: number }>();
  for (const item of items) {
    if (item.owed <= 0.0005) continue;
    const days = Math.floor((now.getTime() - item.due.getTime()) / 86_400_000);
    const bucket = days <= 0 ? "current" : days <= 30 ? "d1_30" : days <= 60 ? "d31_60" : days <= 90 ? "d61_90" : "d90_plus";
    const g = groups.get(item.key) ?? { key: item.key, name: item.name || "—", current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
    g[bucket] = round3(Number(g[bucket]) + item.owed);
    g.total = round3(g.total + item.owed);
    groups.set(item.key, g);
  }
  return Array.from(groups.values());
}

export interface ReportResult {
  definition: ReportDefinition;
  from: string;
  to: string;
  rows: Row[];
  totals: Row;
  /** The previous period of equal length: its totals and each row's measure, by row key. */
  previous: { from: string; to: string; totals: Row; byKey: Record<string, number> } | null;
}

/** Sums the money and number columns (percentages and dates are not summed). */
function totalsOf(definition: ReportDefinition, rows: Row[]) {
  const totals: Row = {};
  for (const column of definition.columns) if (column.kind === "money" || column.kind === "number") totals[column.key] = round3(rows.reduce((s, r) => s + (Number(r[column.key]) || 0), 0));
  return totals;
}

/** Runs a report for a period, sorted by its measure, optionally with the previous period to compare. */
export async function runReport(key: string, params: ReportParams & { compare?: boolean }): Promise<ReportResult> {
  const definition = reportDefinition(key);
  if (!definition) throw new Error(serverMessages.reportNotFound);
  const runner = RUNNERS[key];
  const sort = (rows: Row[]) => (definition.measure ? [...rows].sort((a, b) => (Number(b[definition.measure!]) || 0) - (Number(a[definition.measure!]) || 0)) : rows);
  const rows = sort(await runner(params));
  let previous: ReportResult["previous"] = null;
  if (params.compare && definition.ranged && definition.measure) {
    const period = previousPeriod(params.from, params.to);
    const before = await runner({ ...params, ...period });
    previous = { ...period, totals: totalsOf(definition, before), byKey: Object.fromEntries(before.map((r) => [String(r.key), Number(r[definition.measure!]) || 0])) };
  }
  return { definition, from: params.from, to: params.to, rows, totals: totalsOf(definition, rows), previous };
}
