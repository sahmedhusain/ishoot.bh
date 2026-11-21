import { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import {
  listContacts,
  createContact,
  updateContact,
  listProducts,
} from "@platform/api-client";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
import { documentTotals } from "../constants/procurement";
import { getCompanySettings } from "./company-settings";
import { getNextSequenceNumber } from "./sequence";

const num = (value: any) => (value == null ? 0 : Number(value.toString()));
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const isoDay = (value: unknown) =>
  value
    ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
    : null;
const isoTimestamp = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00.000Z`).toISOString()
    : raw;
};

export interface PurchaseOrderRecord {
  id: string;
  number: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  order_date: string;
  expected_date: string | null;
  issue_date: string;
  expected_delivery_date: string | null;
  status: string;
  currency_code: string;
  subtotal: number;
  vat_enabled: boolean;
  vat_percentage: number;
  vat_amount: number;
  tax_total: number;
  total: number;
  grand_total: number;
  warehouse?: { name_en: string; name_ar: string; id?: string; [key: string]: any } | null;
  supplier: {
    name: string;
    id?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    vat_number?: string | null;
    [key: string]: any;
  };
  terms?: string | null;
  approved_by?: string | null;
  lines: any[];
  [key: string]: any;
}

export interface PurchaseOrderInput {
  id?: string;
  supplierId?: string;
  issueDate?: string;
  expectedDeliveryDate?: string;
  notes?: string;
  requisitionId?: string;
  warehouseId?: string;
  lines: any[];
  [key: string]: any;
}

export interface RequisitionInput {
  id?: string;
  requestedById?: string;
  departmentId?: string;
  neededByDate?: string;
  neededBy?: string;
  justification?: string;
  lines: any[];
  [key: string]: any;
}

export interface RfqInput {
  id?: string;
  title: string;
  deadline?: string;
  dueDate?: string;
  requisitionId?: string;
  supplierIds?: string[];
  lines: any[];
  [key: string]: any;
}

export interface SupplierInput {
  id?: string;
  name?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  leadTimeDays?: number | string;
  paymentTermsDays?: number | string;
  [key: string]: any;
}

const contactDisplayName = (c: any) =>
  c ? c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ") : "";

function hydratePurchaseOrder(
  po: any,
  allLines: any[],
  contacts: any[],
  warehouses: any[],
  users: any[],
  reqs: any[],
  rfqs: any[],
  receipts: any[],
  receiptLines: any[],
  bills: any[],
  currency: string,
): PurchaseOrderRecord {
  const supplier = contacts.find((c) => c.id === po.supplierId);
  const warehouse = warehouses.find((w) => w.id === po.warehouseId);
  const creator = users.find((u) => u.id === po.createdById);
  const approver = users.find((u) => u.id === po.approvedById);
  const req = po.requisitionId
    ? reqs.find((r) => r.id === po.requisitionId)
    : null;
  const rfq = po.rfqId ? rfqs.find((r) => r.id === po.rfqId) : null;
  const poLines = allLines
    .filter((l) => l.purchaseOrderId === po.id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((l) => {
      const received = num(l.receivedQuantity);
      const rejected = num(l.rejectedQuantity);
      const billed = num(l.billedQuantity);
      return {
        id: l.id,
        product_id: l.productId ?? null,
        variant_key: l.variantKey ?? "",
        description: l.description ?? "",
        quantity: num(l.quantity),
        unit_price: num(l.unitPrice),
        received,
        rejected,
        billed,
        received_quantity: received,
        rejected_quantity: rejected,
        billed_quantity: billed,
        sort_order: Number(l.sortOrder ?? 0),
      };
    });
  const poReceipts = receipts
    .filter((r) => r.purchaseOrderId === po.id)
    .map((r) => {
      const qty = receiptLines
        .filter((rl) => rl.receiptId === r.id)
        .reduce((sum, rl) => sum + num(rl.quantity), 0);
      return {
        id: r.id,
        number: r.number,
        received_at: r.receivedAt ?? r.createdAt ?? "",
        quantity: round3(qty),
      };
    });
  const poBills = bills
    .filter((b) => b.purchaseOrderId === po.id)
    .map((b) => ({
      id: b.id,
      number: b.number,
      status: b.status || "draft",
      total: num(b.total),
    }));
  const supName = contactDisplayName(supplier) || po.supplierName || "";
  const orderDate =
    isoDay(po.orderDate ?? po.createdAt) ?? new Date().toISOString().slice(0, 10);
  const expectedDate = isoDay(po.expectedDate);
  return {
    id: po.id,
    number: po.number,
    order_number: po.number,
    supplier_id: po.supplierId ?? "",
    supplier_name: supName,
    order_date: orderDate,
    expected_date: expectedDate,
    issue_date: orderDate,
    expected_delivery_date: expectedDate,
    status: po.status || "draft",
    currency_code: currency,
    vat_enabled: Boolean(po.vatEnabled),
    vat_percentage: num(po.vatPercentage),
    subtotal: num(po.subtotal),
    vat_amount: num(po.vatAmount),
    tax_total: num(po.vatAmount),
    total: num(po.total),
    grand_total: num(po.total),
    note: po.note ?? "",
    terms: po.terms ?? "",
    sent_at: po.sentAt ? String(po.sentAt) : null,
    sent_via: po.sentVia ?? null,
    created_by: creator?.fullName ?? creator?.name ?? null,
    approved_by: approver?.fullName ?? approver?.name ?? null,
    requisition: req ? { id: req.id, number: req.number } : null,
    rfq: rfq ? { id: rfq.id, number: rfq.number } : null,
    warehouse: warehouse
      ? {
          id: warehouse.id,
          name_en: warehouse.nameEn ?? warehouse.name_en ?? "",
          name_ar: warehouse.nameAr ?? warehouse.name_ar ?? "",
        }
      : null,
    supplier: {
      id: supplier?.id ?? po.supplierId ?? "",
      name: supName,
      email: supplier?.email ?? null,
      phone: supplier?.phone ?? null,
      address: supplier?.address ?? null,
      vat_number: supplier?.vatNumber ?? null,
    },
    lines: poLines,
    receipts: poReceipts,
    bills: poBills,
  };
}

export async function awardRfq(
  rfqId: string,
  quoteIds: string[],
  userId?: string,
): Promise<Array<{ id: string; number: string }>> {
  const [rfqs, rfqLines, rfqQuotes] = await Promise.all([
    listTableRows<any>("inventory", "rfq"),
    listTableRows<any>("inventory", "rfq_line"),
    listTableRows<any>("inventory", "rfq_quote"),
  ]);
  const rfq = rfqs.find((r) => r.id === rfqId);
  if (!rfq) throw new Error(serverMessages.procurementDocumentMissing);
  const pickedSet = new Set((quoteIds || []).map(String));
  const chosenQuotes = rfqQuotes.filter(
    (q) => q.rfqId === rfqId && pickedSet.has(String(q.id)),
  );
  if (!chosenQuotes.length) {
    throw new Error(serverMessages.procurementLinesRequired);
  }
  const lineById = new Map<string, any>(rfqLines.map((l) => [String(l.id), l]));
  const grouped = new Map<string, any[]>();
  for (const q of chosenQuotes) {
    await upsertTableRow("inventory", "rfq_quote", { ...q, selected: true });
    const list = grouped.get(String(q.supplierId)) ?? [];
    list.push(q);
    grouped.set(String(q.supplierId), list);
  }
  const orders: Array<{ id: string; number: string }> = [];
  for (const [supplierId, quotes] of grouped.entries()) {
    const orderLines = quotes.map((q) => {
      const line = lineById.get(String(q.lineId));
      return {
        productId: line?.productId ?? undefined,
        variantId: line?.variantKey ?? undefined,
        description: line?.description ?? "Item",
        quantity: num(line?.quantity || 1),
        unitPrice: num(q.unitPrice),
      };
    });
    const created = await savePurchaseOrder(
      {
        supplierId,
        rfqId,
        requisitionId: rfq.requisitionId ?? undefined,
        note: rfq.note ?? undefined,
        lines: orderLines,
      },
      userId ?? "admin",
    );
    orders.push(created);
  }
  await upsertTableRow("inventory", "rfq", { ...rfq, status: "awarded" });
  return orders;
}

export async function cancelRfq(id: string): Promise<void> {
  const rfqs = await listTableRows<any>("inventory", "rfq");
  const rfq = rfqs.find((r) => r.id === id);
  if (!rfq) throw new Error(serverMessages.procurementDocumentMissing);
  await upsertTableRow("inventory", "rfq", { ...rfq, status: "cancelled" });
}

export async function submitPurchaseOrder(
  id: string,
  userId?: string,
): Promise<{ id: string; number: string; status: string }> {
  const orders = await listTableRows<any>("inventory", "purchase_order");
  const po = orders.find((o) => o.id === id);
  if (!po) throw new Error(serverMessages.procurementDocumentMissing);
  const updated = await upsertTableRow<any>("inventory", "purchase_order", {
    ...po,
    status: "approved",
    approvedById: userId ?? po.approvedById ?? "admin",
    approvedAt: new Date().toISOString(),
  });
  return {
    id: updated.id ?? po.id,
    number: updated.number ?? po.number,
    status: "approved",
  };
}

export async function markPurchaseOrderSent(
  id: string,
  via?: string,
): Promise<void> {
  const orders = await listTableRows<any>("inventory", "purchase_order");
  const po = orders.find((o) => o.id === id);
  if (!po) throw new Error(serverMessages.procurementDocumentMissing);
  await upsertTableRow("inventory", "purchase_order", {
    ...po,
    status: "sent",
    sentAt: new Date().toISOString(),
    sentVia: via ?? "email",
  });
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  const orders = await listTableRows<any>("inventory", "purchase_order");
  const po = orders.find((o) => o.id === id);
  if (!po) throw new Error(serverMessages.procurementDocumentMissing);
  await upsertTableRow("inventory", "purchase_order", {
    ...po,
    status: "cancelled",
  });
}

const supplierName = (c: any) => c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ");

export async function listSuppliers(
  search?: string,
) {
  const contacts = await listContacts();
  const filtered = (contacts || []).filter((c: any) => {
    if (c.contactType !== "vendor") return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.companyName || "").toLowerCase().includes(s) || (c.firstName || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s);
  });
  return filtered.map((c: any) => ({
    id: c.id,
    name: supplierName(c),
    contact_name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    email: c.email ?? "",
    phone: c.phone ?? "",
    vat_number: c.vatNumber ?? "",
    lead_time_days: c.supplierLeadTimeDays,
    payment_terms_days: c.supplierPaymentTermsDays,
    open_orders: 0,
  }));
}

export async function saveSupplier(input: any) {
  if (input.id) {
    return updateContact(input.id, input);
  }
  return createContact({
    ...input,
    contactType: "vendor",
  });
}

export async function saveRequisition(input: any, userId: string): Promise<{ id: string; number: string; [key: string]: any }> {
  const { createPurchaseRequisition, updatePurchaseRequisition } = await import("../api/inventory");
  if (input?.id) {
    return updatePurchaseRequisition(input.id, { ...input, requestedById: input.requestedById ?? userId });
  }
  return createPurchaseRequisition({ ...input, requestedById: input.requestedById ?? userId });
}

export async function submitRequisition(id: string, userId: string): Promise<{ status: string; [key: string]: any }> {
  const { updatePurchaseRequisition } = await import("../api/inventory");
  return updatePurchaseRequisition(id, { status: "submitted", requestedById: userId });
}

export async function cancelRequisition(id: string): Promise<any> {
  const { updatePurchaseRequisition } = await import("../api/inventory");
  return updatePurchaseRequisition(id, { status: "cancelled" });
}

export async function listRequisitions(
  filter: { status?: string; requestedById?: string } = {},
): Promise<any[]> {
  const { listPurchaseRequisitions } = await import("../api/inventory");
  const [rows, allLines, users] = await Promise.all([
    listPurchaseRequisitions().catch(() => []),
    listTableRows<any>("inventory", "purchase_requisition_line").catch(() => []),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  const userMap = new Map<string, any>(
    (users || []).map((u: any): [string, any] => [String(u.id), u]),
  );
  return rows
    .filter((r) => {
      if (filter.status && r.status !== filter.status) return false;
      if (filter.requestedById && r.requestedById !== filter.requestedById)
        return false;
      return true;
    })
    .map((r) => {
      const reqId = String(r.id);
      const u = r.requestedById ? userMap.get(String(r.requestedById)) : null;
      const lineCount = allLines.filter(
        (l) => (l.requisitionId ?? l.requisition_id) === reqId,
      ).length;
      return {
        id: r.id,
        number: r.number,
        status: r.status || "draft",
        requested_by_id: r.requestedById ?? "",
        requested_by: u?.fullName ?? u?.name ?? r.requestedById ?? "",
        needed_by: isoDay(r.neededBy),
        estimated_total: num(r.estimatedTotal),
        lines: lineCount,
        created_at: r.createdAt ?? "",
      };
    });
}

export async function getRequisition(id: string): Promise<any> {
  const { getPurchaseRequisition } = await import("../api/inventory");
  const [req, allLines, rfqs, orders, users] = await Promise.all([
    getPurchaseRequisition(id).catch(() => null),
    listTableRows<any>(
      "inventory",
      "purchase_requisition_line",
      "sort_order ASC",
    ).catch(() => []),
    listTableRows<any>("inventory", "rfq").catch(() => []),
    listTableRows<any>("inventory", "purchase_order", "created_at DESC").catch(
      () => [],
    ),
    listTableRows<any>("identity", "user").catch(() => []),
  ]);
  if (!req) return null;
  const userMap = new Map<string, any>(
    (users || []).map((u: any): [string, any] => [String(u.id), u]),
  );
  const reqUser = req.requestedById
    ? userMap.get(String(req.requestedById))
    : null;
  const reqLines = allLines
    .filter((l) => (l.requisitionId ?? l.requisition_id) === id)
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? a.sort_order ?? 0) -
        Number(b.sortOrder ?? b.sort_order ?? 0),
    )
    .map((l) => ({
      id: l.id,
      product_id: l.productId ?? l.product_id ?? null,
      variant_key: l.variantKey ?? l.variant_key ?? "",
      description: l.description ?? "",
      quantity: num(l.quantity),
      unit_price: num(l.estimatedUnitCost ?? l.estimated_unit_cost ?? 0),
    }));
  const reqRfqs = rfqs
    .filter((r) => (r.requisitionId ?? r.requisition_id) === id)
    .map((r) => ({
      id: r.id,
      number: r.number,
      status: r.status || "open",
    }));
  const reqOrders = orders
    .filter((o) => (o.requisitionId ?? o.requisition_id) === id)
    .map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status || "draft",
    }));
  return {
    id: req.id,
    number: req.number,
    status: req.status || "draft",
    requested_by_id: req.requestedById ?? "",
    requested_by: reqUser?.fullName ?? reqUser?.name ?? req.requestedById ?? "",
    department_id: req.departmentId ?? null,
    needed_by: isoDay(req.neededBy),
    note: req.note ?? "",
    decision_note: req.decisionNote ?? "",
    estimated_total: num(req.estimatedTotal),
    lines: reqLines,
    rfqs: reqRfqs,
    orders: reqOrders,
  };
}

export async function createRfq(
  input: RfqInput,
  userId: string,
): Promise<{ id: string; number: string; [key: string]: any }> {
  const title = String(input?.title ?? "").trim();
  if (!title) throw new Error(serverMessages.invalidInput);
  let rawLines = Array.isArray(input.lines) ? input.lines : [];
  if (!rawLines.length && input.requisitionId) {
    const reqLines = await listTableRows<any>(
      "inventory",
      "purchase_requisition_line",
      "sort_order ASC",
    ).catch(() => []);
    rawLines = reqLines
      .filter((l) => l.requisitionId === input.requisitionId)
      .map((l) => ({
        productId: l.productId ?? undefined,
        variantId: l.variantKey ?? undefined,
        description: l.description ?? "",
        quantity: num(l.quantity),
      }));
  }
  const products = await listProducts().catch(() => []);
  const productMap = new Map<string, any>(products.map((p): [string, any] => [p.id, p]));
  const cleanLines = rawLines
    .map((l) => {
      const qty = round3(Number(l.quantity || 0));
      const prod = l.productId ? productMap.get(String(l.productId)) : null;
      const desc =
        String(l.description ?? "").trim() ||
        prod?.nameEn ||
        prod?.nameAr ||
        "";
      return {
        productId: l.productId ? String(l.productId) : null,
        variantKey: l.variantId ?? l.variantKey ?? "",
        description: desc,
        quantity: qty,
      };
    })
    .filter((l) => l.quantity > 0 && l.description);
  if (!cleanLines.length) throw new Error(serverMessages.procurementLinesRequired);
  const number = await getNextSequenceNumber("RFQ");
  const id = input.id || randomUUID();
  const dueDate = isoTimestamp(input.dueDate ?? input.deadline);
  const rfq = await upsertTableRow<any>("inventory", "rfq", {
    id,
    number,
    requisitionId: input.requisitionId ?? null,
    title,
    status: "open",
    dueDate,
    note: input.note?.trim().slice(0, 1000) || null,
    createdById: userId,
  });
  await Promise.all(
    cleanLines.map((line, index) =>
      upsertTableRow("inventory", "rfq_line", {
        id: randomUUID(),
        rfqId: id,
        productId: line.productId,
        variantKey: line.variantKey,
        description: line.description,
        quantity: line.quantity,
        sortOrder: index,
      }),
    ),
  );
  return { ...rfq, id, number: rfq.number ?? number };
}

export async function listRfqs(): Promise<any[]> {
  const [rfqs, lines, quotes] = await Promise.all([
    listTableRows<any>("inventory", "rfq", "created_at DESC").catch(() => []),
    listTableRows<any>("inventory", "rfq_line").catch(() => []),
    listTableRows<any>("inventory", "rfq_quote").catch(() => []),
  ]);
  return rfqs.map((r) => {
    const rLines = lines.filter((l) => l.rfqId === r.id);
    const rSuppliers = new Set(
      quotes.filter((q) => q.rfqId === r.id).map((q) => String(q.supplierId)),
    );
    return {
      id: r.id,
      number: r.number,
      title: r.title ?? "",
      status: r.status || "open",
      due_date: isoDay(r.dueDate),
      lines: rLines.length,
      suppliers: rSuppliers.size,
    };
  });
}

export async function getRfq(id: string): Promise<any> {
  const [rfqs, allLines, allQuotes, reqs, orders, contacts] = await Promise.all([
    listTableRows<any>("inventory", "rfq").catch(() => []),
    listTableRows<any>("inventory", "rfq_line", "sort_order ASC").catch(() => []),
    listTableRows<any>("inventory", "rfq_quote").catch(() => []),
    listTableRows<any>("inventory", "purchase_requisition").catch(() => []),
    listTableRows<any>("inventory", "purchase_order", "created_at DESC").catch(() => []),
    listContacts().catch(() => []),
  ]);
  const r = rfqs.find((x) => x.id === id);
  if (!r) return null;
  const req = r.requisitionId
    ? reqs.find((x) => x.id === r.requisitionId)
    : null;
  const lines = allLines
    .filter((l) => l.rfqId === id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((l) => ({
      id: l.id,
      description: l.description ?? "",
      quantity: num(l.quantity),
    }));
  const quotes = allQuotes
    .filter((q) => q.rfqId === id)
    .map((q) => ({
      id: q.id,
      line_id: q.lineId,
      supplier_id: q.supplierId,
      unit_price: num(q.unitPrice),
      lead_time_days: q.leadTimeDays == null ? null : Number(q.leadTimeDays),
      selected: Boolean(q.selected),
    }));
  const supplierIds = Array.from(
    new Set(quotes.map((q) => String(q.supplier_id))),
  );
  const contactMap = new Map<string, any>((contacts || []).map((c: any): [string, any] => [String(c.id), c]));
  const suppliers = supplierIds.map((sid) => ({
    id: sid,
    name: contactDisplayName(contactMap.get(sid)) || sid,
  }));
  const rfqOrders = orders
    .filter((o) => o.rfqId === id)
    .map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status || "draft",
    }));
  return {
    id: r.id,
    number: r.number,
    title: r.title ?? "",
    status: r.status || "open",
    due_date: isoDay(r.dueDate),
    note: r.note ?? "",
    requisition: req ? { id: req.id, number: req.number } : null,
    lines,
    suppliers,
    quotes,
    orders: rfqOrders,
  };
}

export async function saveRfqQuotes(
  rfqId: string,
  supplierId: string,
  quotes: Array<{ lineId: string; unitPrice: string | number; leadTimeDays?: string | number }>,
): Promise<any> {
  const existing = await listTableRows<any>("inventory", "rfq_quote").catch(() => []);
  await Promise.all(
    existing
      .filter((q) => q.rfqId === rfqId && q.supplierId === supplierId)
      .map((q) => deleteTableRow("inventory", "rfq_quote", q.id)),
  );
  const valid = (quotes || []).filter(
    (q) => q.lineId && String(q.unitPrice ?? "").trim() !== "" && Number(q.unitPrice) >= 0,
  );
  return Promise.all(
    valid.map((q) =>
      upsertTableRow("inventory", "rfq_quote", {
        id: randomUUID(),
        rfqId,
        lineId: q.lineId,
        supplierId,
        unitPrice: Number(q.unitPrice),
        leadTimeDays:
          q.leadTimeDays != null && String(q.leadTimeDays).trim() !== ""
            ? Number(q.leadTimeDays)
            : null,
        selected: false,
      }),
    ),
  );
}

export async function listPurchaseOrders(
  filter: { status?: string; supplierId?: string; search?: string; page?: number; pageSize?: number; [key: string]: any } = {},
): Promise<{ rows: any[]; total: number }> {
  const [orders, contacts] = await Promise.all([
    listTableRows<any>("inventory", "purchase_order", "created_at DESC").catch(() => []),
    listContacts().catch(() => []),
  ]);
  const contactMap = new Map<string, any>((contacts || []).map((c: any): [string, any] => [String(c.id), c]));
  const search = String(filter.search ?? filter.q ?? "").trim().toLowerCase();
  const filtered = orders
    .map((po) => {
      const sup = contactMap.get(String(po.supplierId));
      const supplierLabel = contactDisplayName(sup) || po.supplierId || "";
      return {
        id: po.id,
        number: po.number,
        supplier: supplierLabel,
        supplier_id: po.supplierId ?? "",
        supplier_name: supplierLabel,
        status: po.status || "draft",
        order_date:
          isoDay(po.orderDate ?? po.createdAt) ??
          new Date().toISOString().slice(0, 10),
        expected_date: isoDay(po.expectedDate),
        total: num(po.total),
      };
    })
    .filter((row) => {
      if (filter.status && row.status !== filter.status) return false;
      if (filter.supplierId && row.supplier_id !== filter.supplierId) return false;
      if (search) {
        return (
          String(row.number || "").toLowerCase().includes(search) ||
          String(row.supplier || "").toLowerCase().includes(search)
        );
      }
      return true;
    });
  const page = Math.max(1, Number(filter.page ?? 1));
  const pageSize = Math.max(1, Number(filter.pageSize ?? 25));
  return {
    rows: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
  };
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrderRecord | null> {
  const [
    orders,
    allLines,
    contacts,
    warehouses,
    users,
    reqs,
    rfqs,
    receipts,
    receiptLines,
    bills,
    company,
  ] = await Promise.all([
    listTableRows<any>("inventory", "purchase_order").catch(() => []),
    listTableRows<any>("inventory", "purchase_order_line").catch(() => []),
    listContacts().catch(() => []),
    listTableRows<any>("inventory", "warehouse").catch(() => []),
    listTableRows<any>("identity", "user").catch(() => []),
    listTableRows<any>("inventory", "purchase_requisition").catch(() => []),
    listTableRows<any>("inventory", "rfq").catch(() => []),
    listTableRows<any>("inventory", "goods_receipt", "created_at DESC").catch(() => []),
    listTableRows<any>("inventory", "goods_receipt_line").catch(() => []),
    listTableRows<any>("finance", "supplier_bill", "created_at DESC").catch(() => []),
    getCompanySettings(),
  ]);
  const po = orders.find((o) => o.id === id);
  if (!po) return null;
  return hydratePurchaseOrder(
    po,
    allLines,
    contacts || [],
    warehouses || [],
    users,
    reqs,
    rfqs,
    receipts,
    receiptLines,
    bills,
    company.default_currency,
  );
}

export async function savePurchaseOrder(
  input: PurchaseOrderInput,
  userId: string,
): Promise<{ id: string; number: string; [key: string]: any }> {
  const [company, existingOrders, existingLines, products] = await Promise.all([
    getCompanySettings(),
    input.id
      ? listTableRows<any>("inventory", "purchase_order").catch(() => [])
      : Promise.resolve([]),
    input.id
      ? listTableRows<any>("inventory", "purchase_order_line").catch(() => [])
      : Promise.resolve([]),
    listProducts().catch(() => []),
  ]);
  const existing = input.id
    ? existingOrders.find((o) => o.id === input.id)
    : null;
  if (!input.supplierId) throw new Error(serverMessages.invalidInput);
  const productMap = new Map<string, any>(products.map((p): [string, any] => [p.id, p]));
  const rawLines = Array.isArray(input.lines) ? input.lines : [];
  const cleanLines = rawLines
    .map((l) => {
      const prod = l.productId ? productMap.get(String(l.productId)) : null;
      const quantity = round3(Number(l.quantity || 0));
      const unitPrice = round3(Number(l.unitPrice || 0));
      const description =
        String(l.description ?? "").trim() ||
        prod?.nameEn ||
        prod?.nameAr ||
        "";
      return {
        productId: l.productId ? String(l.productId) : null,
        variantKey: l.variantId ?? l.variantKey ?? "",
        description,
        quantity,
        unitPrice,
      };
    })
    .filter((l) => l.quantity > 0 && l.description);
  if (!cleanLines.length) throw new Error(serverMessages.procurementLinesRequired);
  const vatEnabled =
    input.vatEnabled !== undefined
      ? Boolean(input.vatEnabled)
      : Boolean(company.vat_enabled);
  const vatPercentage = vatEnabled ? Number(company.vat_percentage || 0) : 0;
  const totals = documentTotals(cleanLines, vatPercentage);
  const id = existing?.id ?? input.id ?? randomUUID();
  const number = existing?.number ?? (await getNextSequenceNumber("PO"));
  const saved = await upsertTableRow<any>("inventory", "purchase_order", {
    ...(existing || {}),
    id,
    number,
    supplierId: input.supplierId,
    status: existing?.status || "draft",
    orderDate: isoTimestamp(input.orderDate ?? input.issueDate) ?? new Date().toISOString(),
    expectedDate: isoTimestamp(input.expectedDate ?? input.expectedDeliveryDate),
    warehouseId: input.warehouseId || null,
    requisitionId: input.requisitionId ?? existing?.requisitionId ?? null,
    rfqId: input.rfqId ?? existing?.rfqId ?? null,
    note: (input.note ?? input.notes)?.trim().slice(0, 1000) || null,
    terms: input.terms?.trim().slice(0, 2000) || null,
    vatEnabled,
    vatPercentage,
    subtotal: totals.subtotal,
    vatAmount: totals.vatAmount,
    total: totals.total,
    createdById: existing?.createdById ?? userId,
  });
  await Promise.all(
    existingLines
      .filter((l) => l.purchaseOrderId === id)
      .map((l) => deleteTableRow("inventory", "purchase_order_line", l.id)),
  );
  await Promise.all(
    cleanLines.map((line, index) =>
      upsertTableRow("inventory", "purchase_order_line", {
        id: randomUUID(),
        purchaseOrderId: id,
        productId: line.productId,
        variantKey: line.variantKey,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        receivedQuantity: 0,
        rejectedQuantity: 0,
        billedQuantity: 0,
        sortOrder: index,
      }),
    ),
  );
  return { ...saved, id, number };
}

export async function issuePurchaseOrder(
  id: string,
  actorId: string,
): Promise<{ status: string; [key: string]: any }> {
  return submitPurchaseOrder(id, actorId);
}

export async function recordPurchaseReceipt(
  id: string,
  receipts: any,
  userId: string,
): Promise<any> {
  const { receiveGoods } = await import("./procurement-billing");
  const input = Array.isArray(receipts)
    ? {
        locationId: receipts[0]?.locationId ?? "",
        note: receipts[0]?.note ?? "",
        lines: receipts,
      }
    : receipts;
  return receiveGoods(id, input, userId);
}

export async function listPurchaseReceipts(id: string): Promise<any[]> {
  const [receipts, lines] = await Promise.all([
    listTableRows<any>("inventory", "goods_receipt", "created_at DESC").catch(() => []),
    listTableRows<any>("inventory", "goods_receipt_line").catch(() => []),
  ]);
  return receipts
    .filter((r) => r.purchaseOrderId === id)
    .map((r) => {
      const rLines = lines.filter((l) => l.receiptId === r.id);
      return {
        ...r,
        received_at: r.receivedAt ?? r.createdAt ?? "",
        quantity: round3(rLines.reduce((sum, l) => sum + num(l.quantity), 0)),
        lines: rLines,
      };
    });
}

export async function listPurchaseBills(id: string): Promise<any[]> {
  const bills = await listTableRows<any>(
    "finance",
    "supplier_bill",
    "created_at DESC",
  ).catch(() => []);
  return bills
    .filter((b) => b.purchaseOrderId === id)
    .map((b) => ({
      ...b,
      total: num(b.total),
      bill_date: isoDay(b.billDate),
      due_date: isoDay(b.dueDate),
    }));
}

export async function recordPurchaseBill(
  id: string,
  bill: any,
  userId: string,
): Promise<any> {
  const { saveSupplierBill } = await import("./procurement-billing");
  return saveSupplierBill({ ...bill, purchaseOrderId: id }, userId);
}

export async function getPurchaseOrder_details(id: string): Promise<any> {
  return getPurchaseOrder(id);
}

export async function procurementProductOptions() {
  const products = await listProducts();
  return (products || []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name_en: p.nameEn,
    name_ar: p.nameAr,
    cost: Number(p.costPrice),
    variants: [],
  }));
}