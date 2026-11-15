import { serverMessages } from "@platform/locales";
import { listTableRows } from "../api/tables";
import {
  reportDefinition,
  previousPeriod,
  type ReportDefinition,
} from "../constants/reports";
import { listCampaigns } from "./marketing";

type Row = Record<string, string | number | null>;
const num = (value: { toString(): string } | number | string | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;
const day = (text: string, end = false) =>
  new Date(`${text}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
const nameOf = (en: string, ar: string, locale: "en" | "ar") =>
  locale === "ar" ? ar || en : en || ar;
const contactName = (
  c:
    | { firstName: string; lastName: string | null; companyName: string | null }
    | null
    | undefined,
) =>
  c ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") : "";

export interface ReportParams {
  from: string;
  to: string;
  locale: "en" | "ar";
  labels: Record<string, string>;
}

async function soldLines(from: string, to: string) {
  const fromMs = day(from).getTime();
  const toMs = day(to, true).getTime();
  const [rawOrders, rawLines, rawMovements] = await Promise.all([
    listTableRows<any>("commerce", "sales_order").catch(() => []),
    listTableRows<any>("commerce", "sales_order_line").catch(() => []),
    listTableRows<any>("inventory", "stock_movement").catch(() => []),
  ]);
  const linesByOrder = new Map<string, any[]>();
  for (const l of rawLines) {
    const arr = linesByOrder.get(l.orderId) || [];
    arr.push(l);
    linesByOrder.set(l.orderId, arr);
  }
  const orders = rawOrders
    .filter((o) => {
      if (o.status === "cancelled") return false;
      const t = new Date(o.placedAt || o.createdAt || 0).getTime();
      return t >= fromMs && t <= toMs;
    })
    .map((o) => ({
      ...o,
      placedAt: new Date(o.placedAt || o.createdAt || Date.now()),
      lines: linesByOrder.get(o.id) || [],
    }));
  const orderIds = new Set(orders.map((o) => o.id));
  const costs = rawMovements.filter(
    (m) => m.type === "sale" && m.sourceType === "order" && orderIds.has(m.sourceId),
  );
  const costOf = new Map<string, number>();
  for (const c of costs)
    costOf.set(
      `${c.sourceId}|${c.productId}`,
      round3(
        (costOf.get(`${c.sourceId}|${c.productId}`) ?? 0) +
          Math.abs(num(c.quantity)) * num(c.unitCost),
      ),
    );
  return { orders, costOf };
}

const RUNNERS: Record<string, (p: ReportParams) => Promise<Row[]>> = {
  async sales_by_product({ from, to, locale }) {
    const { orders, costOf } = await soldLines(from, to);
    const totals = new Map<
      string,
      { quantity: number; revenue: number; cost: number }
    >();
    for (const o of orders)
      for (const l of o.lines) {
        const t = totals.get(l.productId) ?? {
          quantity: 0,
          revenue: 0,
          cost: 0,
        };
        t.quantity += num(l.quantity) - num(l.returnedQuantity);
        t.revenue = round3(t.revenue + num(l.lineTotal));
        t.cost = round3(t.cost + (costOf.get(`${o.id}|${l.productId}`) ?? 0));
        totals.set(l.productId, t);
      }
    const allProducts = await listTableRows<any>("inventory", "product").catch(() => []);
    const products = allProducts.filter((p) => totals.has(p.id));
    return products.map((p) => {
      const t = totals.get(p.id)!;
      const margin = round3(t.revenue - t.cost);
      return {
        key: p.id,
        name: nameOf(p.nameEn, p.nameAr, locale),
        sku: p.sku,
        quantity: t.quantity,
        revenue: t.revenue,
        cost: t.cost,
        margin,
        margin_rate: pct(margin, t.revenue),
      };
    });
  },
  async sales_by_category(params) {
    const rows = await RUNNERS.sales_by_product(params);
    const wantedIds = new Set(rows.map((r) => String(r.key)));
    const [allProducts, allCats] = await Promise.all([
      listTableRows<any>("inventory", "product").catch(() => []),
      listTableRows<any>("inventory", "product_category").catch(() => []),
    ]);
    const catMap = new Map<string, any>(allCats.map((c): [any, any] => [c.id, c]));
    const products = allProducts
      .filter((p) => wantedIds.has(p.id))
      .map((p) => ({ ...p, category: p.categoryId ? catMap.get(p.categoryId) || null : null }));
    const groups = new Map<
      string,
      { name: string; quantity: number; revenue: number; margin: number }
    >();
    for (const r of rows) {
      const category = products.find((p) => p.id === r.key)?.category;
      const id = category?.id ?? "none";
      const g = groups.get(id) ?? {
        name: category
          ? nameOf(category.nameEn, category.nameAr, params.locale)
          : (params.labels.uncategorised ?? "—"),
        quantity: 0,
        revenue: 0,
        margin: 0,
      };
      g.quantity += Number(r.quantity);
      g.revenue = round3(g.revenue + Number(r.revenue));
      g.margin = round3(g.margin + Number(r.margin));
      groups.set(id, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      ...g,
      margin_rate: pct(g.margin, g.revenue),
    }));
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
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      name: labels[`channel_${key}`] ?? key,
      orders: g.orders,
      revenue: g.revenue,
      average: round3(g.revenue / g.orders),
    }));
  },
  async sales_by_customer({ from, to }) {
    const { orders } = await soldLines(from, to);
    const groups = new Map<
      string,
      {
        name: string;
        email: string;
        orders: number;
        revenue: number;
        last: Date;
      }
    >();
    for (const o of orders) {
      const key = o.contactId ?? o.email ?? o.name;
      const g = groups.get(key) ?? {
        name: o.name,
        email: o.email ?? "",
        orders: 0,
        revenue: 0,
        last: o.placedAt,
      };
      g.orders++;
      g.revenue = round3(g.revenue + num(o.total));
      if (o.placedAt > g.last) g.last = o.placedAt;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      name: g.name,
      email: g.email,
      orders: g.orders,
      revenue: g.revenue,
      last_order: g.last.toISOString().slice(0, 10),
    }));
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
    const wantedUserIds = new Set(Array.from(groups.keys()).filter((k) => k !== "website"));
    const allUsers = wantedUserIds.size ? await listTableRows<any>("identity", "user").catch(() => []) : [];
    const users = allUsers.filter((u) => wantedUserIds.has(u.id));
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      name:
        key === "website"
          ? (labels.website ?? key)
          : (users.find((u) => u.id === key)?.fullName ?? "—"),
      orders: g.orders,
      revenue: g.revenue,
    }));
  },
  async order_funnel({ from, to, labels }) {
    const fromMs = day(from).getTime();
    const toMs = day(to, true).getTime();
    const allOrders = await listTableRows<any>("commerce", "sales_order").catch(() => []);
    const orders = allOrders.filter((o) => {
      const t = new Date(o.placedAt || o.createdAt || 0).getTime();
      return t >= fromMs && t <= toMs;
    });
    const total = orders.length;
    const steps = [
      ["placed", total],
      ["paid", orders.filter((o) => o.paidAt).length],
      ["shipped", orders.filter((o) => o.shippedAt).length],
      ["delivered", orders.filter((o) => o.deliveredAt).length],
      ["cancelled", orders.filter((o) => o.status === "cancelled").length],
      ["returned", orders.filter((o) => o.status === "returned").length],
    ] as const;
    return steps.map(([key, count]) => ({
      key,
      name: labels[`status_${key}`] ?? key,
      orders: count,
      share: pct(count, total),
    }));
  },
  async stock_on_hand({ locale }) {
    const [rawLevels, items, allProducts] = await Promise.all([
      listTableRows<any>("inventory", "stock_level").catch(() => []),
      listTableRows<any>("inventory", "stock_item").catch(() => []),
      listTableRows<any>("inventory", "product").catch(() => []),
    ]);
    const levelMap = new Map<string, { productId: string; variantKey: string; onHand: number; reserved: number }>();
    for (const l of rawLevels) {
      const k = `${l.productId}|${l.variantKey || ""}`;
      const cur = levelMap.get(k) || { productId: l.productId, variantKey: l.variantKey || "", onHand: 0, reserved: 0 };
      cur.onHand += num(l.onHand);
      cur.reserved += num(l.reserved);
      levelMap.set(k, cur);
    }
    const levels = Array.from(levelMap.values()).map((l) => ({
      productId: l.productId,
      variantKey: l.variantKey,
      _sum: { onHand: l.onHand, reserved: l.reserved },
    }));
    const products = allProducts.filter((p) => p.trackStock);
    return products.map((p) => {
      const mine = levels.filter((l) => l.productId === p.id);
      const onHand = round3(mine.reduce((s, l) => s + num(l._sum.onHand), 0));
      const reserved = round3(
        mine.reduce((s, l) => s + num(l._sum.reserved), 0),
      );
      const value = round3(
        mine.reduce(
          (s, l) =>
            s +
            num(l._sum.onHand) *
              num(
                items.find(
                  (i) => i.productId === p.id && i.variantKey === l.variantKey,
                )?.averageCost,
              ),
          0,
        ),
      );
      return {
        key: p.id,
        name: nameOf(p.nameEn, p.nameAr, locale),
        sku: p.sku,
        on_hand: onHand,
        reserved,
        available: round3(onHand - reserved),
        average_cost: onHand ? round3(value / onHand) : 0,
        value,
      };
    });
  },
  async stock_movers({ from, to, locale }) {
    const fromMs = day(from).getTime();
    const toMs = day(to, true).getTime();
    const [rawMovements, rawLevels, allProducts] = await Promise.all([
      listTableRows<any>("inventory", "stock_movement").catch(() => []),
      listTableRows<any>("inventory", "stock_level").catch(() => []),
      listTableRows<any>("inventory", "product").catch(() => []),
    ]);
    const soldMap = new Map<string, number>();
    for (const m of rawMovements) {
      if (m.type !== "sale") continue;
      const t = new Date(m.createdAt || 0).getTime();
      if (t >= fromMs && t <= toMs) {
        soldMap.set(m.productId, (soldMap.get(m.productId) ?? 0) + num(m.quantity));
      }
    }
    const stockMap = new Map<string, number>();
    for (const l of rawLevels) {
      stockMap.set(l.productId, (stockMap.get(l.productId) ?? 0) + num(l.onHand));
    }
    const sold = Array.from(soldMap.entries()).map(([productId, quantity]) => ({
      productId,
      _sum: { quantity },
    }));
    const stock = Array.from(stockMap.entries()).map(([productId, onHand]) => ({
      productId,
      _sum: { onHand },
    }));
    const products = allProducts.filter((p) => p.trackStock);
    const days = Math.max(
      1,
      Math.round((day(to).getTime() - day(from).getTime()) / 86_400_000) + 1,
    );
    return products.map((p) => {
      const s = Math.abs(
        num(sold.find((x) => x.productId === p.id)?._sum.quantity),
      );
      const onHand = num(stock.find((x) => x.productId === p.id)?._sum.onHand);
      return {
        key: p.id,
        name: nameOf(p.nameEn, p.nameAr, locale),
        sku: p.sku,
        sold: round3(s),
        on_hand: round3(onHand),
        days_of_cover: s ? Math.round((onHand / (s / days)) * 10) / 10 : null,
      };
    });
  },
  async count_variance({ from, to, locale }) {
    const fromMs = day(from).getTime();
    const toMs = day(to, true).getTime();
    const [rawLines, rawCounts, allProducts, allItems] = await Promise.all([
      listTableRows<any>("inventory", "stock_count_line").catch(() => []),
      listTableRows<any>("inventory", "stock_count").catch(() => []),
      listTableRows<any>("inventory", "product").catch(() => []),
      listTableRows<any>("inventory", "stock_item").catch(() => []),
    ]);
    const countMap = new Map<string, any>(rawCounts.map((c): [any, any] => [c.id, c]));
    const lines = rawLines
      .map((l) => ({ ...l, count: countMap.get(l.countId) }))
      .filter((l) => {
        if (l.counted === null || l.counted === undefined) return false;
        if (!l.count || l.count.status !== "approved") return false;
        const t = new Date(l.count.approvedAt || 0).getTime();
        return t >= fromMs && t <= toMs;
      });
    const variances = lines.filter((l) => num(l.counted) !== num(l.expected));
    const wantedIds = new Set(variances.map((l) => l.productId));
    const products = allProducts.filter((p) => wantedIds.has(p.id));
    const items = allItems.filter((i) => wantedIds.has(i.productId));
    return variances.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      const variance = round3(num(l.counted) - num(l.expected));
      return {
        key: l.id,
        name: p ? nameOf(p.nameEn, p.nameAr, locale) : "—",
        sku: p?.sku ?? "",
        count: l.count?.number ?? "",
        expected: num(l.expected),
        counted: num(l.counted),
        variance,
        variance_value: round3(
          variance *
            num(
              items.find(
                (i) =>
                  i.productId === l.productId && i.variantKey === l.variantKey,
              )?.averageCost,
            ),
        ),
      };
    });
  },
  async spend_by_supplier({ from, to }) {
    const fromMs = day(from).getTime();
    const toMs = day(to, true).getTime();
    const [rawBills, rawContacts] = await Promise.all([
      listTableRows<any>("finance", "supplier_bill").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const bills = rawBills
      .filter((b) => {
        if (!["approved", "partially_paid", "paid"].includes(b.status)) return false;
        const t = new Date(b.billDate || b.createdAt || 0).getTime();
        return t >= fromMs && t <= toMs;
      })
      .map((b) => ({ ...b, supplier: contactMap.get(b.supplierId) || null }));
    const groups = new Map<
      string,
      { name: string; bills: number; spend: number; paid: number }
    >();
    for (const b of bills) {
      const g = groups.get(b.supplierId) ?? {
        name: contactName(b.supplier),
        bills: 0,
        spend: 0,
        paid: 0,
      };
      g.bills++;
      g.spend = round3(g.spend + num(b.total));
      g.paid = round3(g.paid + num(b.amountPaid));
      groups.set(b.supplierId, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      ...g,
      owed: round3(g.spend - g.paid),
    }));
  },
  async open_purchase_orders({ labels }) {
    const [rawOrders, rawLines, rawContacts] = await Promise.all([
      listTableRows<any>("inventory", "purchase_order").catch(() => []),
      listTableRows<any>("inventory", "purchase_order_line").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const linesByPo = new Map<string, any[]>();
    for (const l of rawLines) {
      const arr = linesByPo.get(l.purchaseOrderId) || [];
      arr.push(l);
      linesByPo.set(l.purchaseOrderId, arr);
    }
    const orders = rawOrders
      .filter((o) => ["approved", "sent", "partially_received"].includes(o.status))
      .map((o) => ({
        ...o,
        supplier: o.supplierId ? contactMap.get(o.supplierId) || null : null,
        lines: linesByPo.get(o.id) || [],
        expectedDate: o.expectedDate ? new Date(o.expectedDate) : null,
      }));
    return orders.map((o) => ({
      key: o.id,
      name: o.number,
      supplier: contactName(o.supplier),
      status: labels[`po_${o.status}`] ?? o.status,
      expected: o.expectedDate?.toISOString().slice(0, 10) ?? null,
      total: num(o.total),
      open_value: round3(
        o.lines.reduce(
          (s: number, l: any) =>
            s +
            Math.max(0, num(l.quantity) - num(l.receivedQuantity)) *
              num(l.unitPrice),
          0,
        ),
      ),
    }));
  },
  async purchase_price_changes({ from, to, locale }) {
    const toMs = day(to, true).getTime();
    const [rawLines, rawOrders, allProducts] = await Promise.all([
      listTableRows<any>("inventory", "purchase_order_line").catch(() => []),
      listTableRows<any>("inventory", "purchase_order").catch(() => []),
      listTableRows<any>("inventory", "product").catch(() => []),
    ]);
    const orderMap = new Map<string, any>(rawOrders.map((o): [any, any] => [o.id, o]));
    const lines = rawLines
      .map((l) => ({ ...l, purchaseOrder: orderMap.get(l.purchaseOrderId) }))
      .filter((l) => {
        if (!l.productId || !l.purchaseOrder) return false;
        if (["draft", "cancelled"].includes(l.purchaseOrder.status)) return false;
        return new Date(l.purchaseOrder.orderDate || l.purchaseOrder.createdAt || 0).getTime() <= toMs;
      })
      .sort(
        (a, b) =>
          new Date(a.purchaseOrder.orderDate || a.purchaseOrder.createdAt || 0).getTime() -
          new Date(b.purchaseOrder.orderDate || b.purchaseOrder.createdAt || 0).getTime(),
      );
    const byProduct = new Map<string, { date: Date; price: number }[]>();
    for (const l of lines)
      byProduct.set(l.productId!, [
        ...(byProduct.get(l.productId!) ?? []),
        { date: new Date(l.purchaseOrder.orderDate || l.purchaseOrder.createdAt), price: num(l.unitPrice) },
      ]);
    const changed = Array.from(byProduct.entries()).filter(
      ([, prices]) =>
        prices.length >= 2 && prices[prices.length - 1].date >= day(from),
    );
    const changedIds = new Set(changed.map(([id]) => id));
    const products = allProducts.filter((p) => changedIds.has(p.id));
    return changed
      .map(([id, prices]) => {
        const latest = prices[prices.length - 1].price;
        const previous = prices[prices.length - 2].price;
        const p = products.find((x) => x.id === id);
        return {
          key: id,
          name: p ? nameOf(p.nameEn, p.nameAr, locale) : "—",
          sku: p?.sku ?? "",
          previous_price: previous,
          latest_price: latest,
          change: previous
            ? Math.round(((latest - previous) / previous) * 1000) / 10
            : 0,
        };
      })
      .filter((r) => r.change !== 0);
  },
  async delivery_performance({ from, to, locale, labels }) {
    const fromMs = day(from).getTime();
    const toMs = day(to, true).getTime();
    const [rawShipments, rawZones, rawAgencies, rawEvents] = await Promise.all([
      listTableRows<any>("delivery", "shipment").catch(() => []),
      listTableRows<any>("delivery", "delivery_zone").catch(() => []),
      listTableRows<any>("delivery", "courier_agency").catch(() => []),
      listTableRows<any>("delivery", "shipment_event").catch(() => []),
    ]);
    const zoneMap = new Map<string, any>(rawZones.map((z): [any, any] => [z.id, z]));
    const agencyMap = new Map<string, any>(rawAgencies.map((a): [any, any] => [a.id, a]));
    const failedByShipment = new Map<string, any[]>();
    for (const ev of rawEvents) {
      if (ev.status === "failed") {
        const arr = failedByShipment.get(ev.shipmentId) || [];
        arr.push(ev);
        failedByShipment.set(ev.shipmentId, arr);
      }
    }
    const shipments = rawShipments
      .filter((s) => {
        if (s.status === "cancelled") return false;
        const t = new Date(s.createdAt || 0).getTime();
        return t >= fromMs && t <= toMs;
      })
      .map((s) => ({
        ...s,
        zone: s.zoneId ? zoneMap.get(s.zoneId) || null : null,
        agency: s.agencyId ? agencyMap.get(s.agencyId) || null : null,
        events: failedByShipment.get(s.id) || [],
        deliveredAt: s.deliveredAt ? new Date(s.deliveredAt) : null,
        promisedBy: s.promisedBy ? new Date(s.promisedBy) : null,
      }));
    const groups = new Map<
      string,
      {
        name: string;
        shipments: number;
        delivered: number;
        onTime: number;
        failed: number;
        fees: number;
        cod: number;
      }
    >();
    for (const s of shipments) {
      const key = s.agencyId ?? (s.zoneId ? `zone:${s.zoneId}` : "own");
      const name =
        s.agency?.name ??
        (s.zone
          ? nameOf(s.zone.nameEn, s.zone.nameAr, locale)
          : (labels.ownFleet ?? "—"));
      const g = groups.get(key) ?? {
        name,
        shipments: 0,
        delivered: 0,
        onTime: 0,
        failed: 0,
        fees: 0,
        cod: 0,
      };
      g.shipments++;
      if (s.status === "delivered") {
        g.delivered++;
        if (s.deliveredAt && s.promisedBy && s.deliveredAt <= s.promisedBy) g.onTime++;
        if (!s.codSettlementId && s.driverId)
          g.cod = round3(g.cod + num(s.codCollected));
      }
      g.failed += s.events.length;
      g.fees = round3(g.fees + num(s.agencyFee));
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => ({
      key,
      name: g.name,
      shipments: g.shipments,
      delivered: g.delivered,
      on_time: pct(g.onTime, g.delivered),
      failed_attempts: g.failed,
      cost_per_delivery: g.delivered ? round3(g.fees / g.delivered) : 0,
      cod_outstanding: g.cod,
    }));
  },
  async receivables_aging() {
    const [rawInvoices, rawContacts, rawPayments] = await Promise.all([
      listTableRows<any>("finance", "invoice").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
      listTableRows<any>("finance", "payment").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const paymentsByInv = new Map<string, any[]>();
    for (const p of rawPayments) {
      const arr = paymentsByInv.get(p.invoiceId) || [];
      arr.push(p);
      paymentsByInv.set(p.invoiceId, arr);
    }
    const invoices = rawInvoices
      .filter((i) => ["sent", "partially_paid", "overdue"].includes(i.status))
      .map((i) => ({
        ...i,
        client: i.clientId ? contactMap.get(i.clientId) || null : null,
        payments: paymentsByInv.get(i.id) || [],
        dueDate: new Date(i.dueDate || i.issueDate || Date.now()),
      }));
    return aging(
      invoices.map((i) => ({
        key: i.clientId ?? "none",
        name: contactName(i.client),
        due: i.dueDate,
        owed: round3(
          num(i.totalAmount) -
            i.payments.reduce((s: number, p: any) => s + num(p.amount), 0),
        ),
      })),
    );
  },
  async payables_aging() {
    const [rawBills, rawContacts] = await Promise.all([
      listTableRows<any>("finance", "supplier_bill").catch(() => []),
      listTableRows<any>("sales", "crm_contact").catch(() => []),
    ]);
    const contactMap = new Map<string, any>(rawContacts.map((c): [any, any] => [c.id, c]));
    const bills = rawBills
      .filter((b) => ["approved", "partially_paid"].includes(b.status))
      .map((b) => ({
        ...b,
        supplier: b.supplierId ? contactMap.get(b.supplierId) || null : null,
        dueDate: b.dueDate ? new Date(b.dueDate) : null,
        billDate: new Date(b.billDate || b.createdAt || Date.now()),
      }));
    return aging(
      bills.map((b) => ({
        key: b.supplierId,
        name: contactName(b.supplier),
        due: b.dueDate ?? b.billDate,
        owed: round3(num(b.total) - num(b.amountPaid)),
      })),
    );
  },
  async marketing_roi({ labels }) {
    const campaigns = await listCampaigns();
    return campaigns.map((c) => ({
      key: c.id,
      name: c.name,
      channel: labels[`campaign_${c.channel}`] ?? c.channel,
      spend: c.spend,
      orders: c.orders,
      revenue: c.revenue,
      return_on_spend: c.return_on_spend,
    }));
  },
  async headcount_by_department({ from, to, locale, labels }) {
    const [rawEmployees, departments] = await Promise.all([
      listTableRows<any>("hr", "employee").catch(() => []),
      listTableRows<any>("hr", "department").catch(() => []),
    ]);
    const employees = rawEmployees.map((e) => ({
      ...e,
      hireDate: new Date(e.hireDate || e.createdAt || Date.now()),
      updatedAt: new Date(e.updatedAt || e.createdAt || Date.now()),
    }));
    const groups = new Map<
      string,
      { headcount: number; joined: number; left: number }
    >();
    for (const e of employees) {
      const key = e.departmentId ?? "none";
      const g = groups.get(key) ?? { headcount: 0, joined: 0, left: 0 };
      if (e.status !== "terminated") g.headcount++;
      if (e.hireDate >= day(from) && e.hireDate <= day(to, true)) g.joined++;
      if (
        e.status === "terminated" &&
        e.updatedAt >= day(from) &&
        e.updatedAt <= day(to, true)
      )
        g.left++;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).map(([key, g]) => {
      const d = departments.find((x) => x.id === key);
      return {
        key,
        name: d
          ? nameOf(d.nameEn, d.nameAr, locale)
          : (labels.noDepartment ?? "—"),
        ...g,
      };
    });
  },
};

function aging(
  items: { key: string; name: string; due: Date; owed: number }[],
  now = new Date(),
) {
  const groups = new Map<string, Row & { total: number }>();
  for (const item of items) {
    if (item.owed <= 0.0005) continue;
    const days = Math.floor((now.getTime() - item.due.getTime()) / 86_400_000);
    const bucket =
      days <= 0
        ? "current"
        : days <= 30
          ? "d1_30"
          : days <= 60
            ? "d31_60"
            : days <= 90
              ? "d61_90"
              : "d90_plus";
    const g = groups.get(item.key) ?? {
      key: item.key,
      name: item.name || "—",
      current: 0,
      d1_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
      total: 0,
    };
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
  previous: {
    from: string;
    to: string;
    totals: Row;
    byKey: Record<string, number>;
  } | null;
}

function totalsOf(definition: ReportDefinition, rows: Row[]) {
  const totals: Row = {};
  for (const column of definition.columns)
    if (column.kind === "money" || column.kind === "number")
      totals[column.key] = round3(
        rows.reduce((s, r) => s + (Number(r[column.key]) || 0), 0),
      );
  return totals;
}

export async function runReport(
  key: string,
  params: ReportParams & { compare?: boolean },
): Promise<ReportResult> {
  const definition = reportDefinition(key);
  if (!definition) throw new Error(serverMessages.reportNotFound);
  const runner = RUNNERS[key];
  const sort = (rows: Row[]) =>
    definition.measure
      ? [...rows].sort(
          (a, b) =>
            (Number(b[definition.measure!]) || 0) -
            (Number(a[definition.measure!]) || 0),
        )
      : rows;
  const rows = sort(await runner(params));
  let previous: ReportResult["previous"] = null;
  if (params.compare && definition.ranged && definition.measure) {
    const period = previousPeriod(params.from, params.to);
    const before = await runner({ ...params, ...period });
    previous = {
      ...period,
      totals: totalsOf(definition, before),
      byKey: Object.fromEntries(
        before.map((r) => [String(r.key), Number(r[definition.measure!]) || 0]),
      ),
    };
  }
  return {
    definition,
    from: params.from,
    to: params.to,
    rows,
    totals: totalsOf(definition, rows),
    previous,
  };
}
