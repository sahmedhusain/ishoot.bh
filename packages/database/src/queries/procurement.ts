import { phoneSearchVariants } from "../constants/phone";
import { normalizeContactInput } from "./contact-validation";
import { Prisma } from "@prisma/client";
import { serverMessages } from "@platform/locales";
import { db } from "../db";
import { documentTotals } from "../constants/procurement";
import { normalizeProductOptions, variantLabel } from "../constants/products";
import {
  registerApprovalFinalizer,
  submitForApproval,
} from "../services/approval-engine";
import { getNextSequenceNumber } from "./sequence";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const numOrNull = (value: { toString(): string } | null | undefined) =>
  value == null ? null : Number(value.toString());
const day = (value: string | undefined | null) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(serverMessages.procurementDateInvalid);
  return new Date(`${value}T00:00:00.000Z`);
};
const isoDay = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

// ─── Suppliers ───────────────────────────────────────────────────────────────────────────────────────────────────

export interface SupplierRecord {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  vat_number: string;
  lead_time_days: number | null;
  payment_terms_days: number | null;
  open_orders: number;
}

const supplierName = (c: {
  companyName: string | null;
  firstName: string;
  lastName: string | null;
}) => c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ");

/** Suppliers are contacts of type "vendor". */
export async function listSuppliers(
  search?: string,
): Promise<SupplierRecord[]> {
  const text = search?.trim().slice(0, 80);
  const rows = await db.crmContact.findMany({
    where: {
      contactType: "vendor",
      ...(text
        ? {
            OR: [
              { companyName: { contains: text, mode: "insensitive" } },
              { firstName: { contains: text, mode: "insensitive" } },
              { email: { contains: text, mode: "insensitive" } },
              ...phoneSearchVariants(text).map((value) => ({ phone: { contains: value } })),
            ],
          }
        : {}),
    },
    orderBy: [{ companyName: "asc" }, { firstName: "asc" }],
    take: 500,
    include: {
      _count: {
        select: {
          purchaseOrders: {
            where: {
              status: { in: ["approved", "sent", "partially_received"] },
            },
          },
        },
      },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: supplierName(c),
    contact_name: [c.firstName, c.lastName].filter(Boolean).join(" "),
    email: c.email ?? "",
    phone: c.phone ?? "",
    vat_number: c.vatNumber ?? "",
    lead_time_days: c.supplierLeadTimeDays,
    payment_terms_days: c.supplierPaymentTermsDays,
    open_orders: c._count.purchaseOrders,
  }));
}

export interface SupplierInput {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  vatNumber: string;
  leadTimeDays: string;
  paymentTermsDays: string;
}

export async function saveSupplier(input: SupplierInput) {
  input = await normalizeContactInput(input);
  const companyName = input.companyName.trim().slice(0, 200);
  const contactName = input.contactName.trim().slice(0, 200);
  if (!companyName && !contactName)
    throw new Error(serverMessages.productNameRequired);
  const whole = (text: string) => {
    if (!text.trim()) return null;
    const value = Number(text);
    if (!Number.isInteger(value) || value < 0 || value > 365)
      throw new Error(serverMessages.procurementDaysInvalid);
    return value;
  };
  const email = input.email.trim().toLowerCase().slice(0, 254) || null;
  const data = {
    companyName: companyName || null,
    firstName: contactName || companyName,
    lastName: null,
    email,
    emailNorm: email,
    phone: input.phone.trim().slice(0, 40) || null,
    vatNumber: input.vatNumber.trim().slice(0, 40) || null,
    supplierLeadTimeDays: whole(input.leadTimeDays),
    supplierPaymentTermsDays: whole(input.paymentTermsDays),
    contactType: "vendor",
    clientKind: companyName ? "company" : "individual",
  };
  if (input.id) {
    const existing = await db.crmContact.findUnique({
      where: { id: input.id },
      select: { contactType: true },
    });
    if (existing?.contactType !== "vendor")
      throw new Error(serverMessages.procurementSupplierMissing);
    return db.crmContact.update({ where: { id: input.id }, data });
  }
  return db.crmContact.create({ data });
}

async function requireSupplier(
  id: string,
  client: Prisma.TransactionClient | typeof db = db,
) {
  const supplier = await client.crmContact.findUnique({
    where: { id },
    select: { id: true, contactType: true, supplierLeadTimeDays: true },
  });
  if (!supplier || supplier.contactType !== "vendor")
    throw new Error(serverMessages.procurementSupplierMissing);
  return supplier;
}

// ─── Lines shared by requisitions, RFQs and orders ───────────────────────────────────────────────────────────────

export interface ProcurementLineInput {
  productId?: string;
  variantId?: string;
  description: string;
  quantity: string;
  /** Estimated or agreed unit price; may be empty on requisitions and RFQs. */
  unitPrice: string;
}

/** Lines checked and described: a product line takes the product's name (and variant) when no words are given. */
async function cleanLines(
  lines: ProcurementLineInput[],
  priceRequired: boolean,
) {
  if (!lines.length || lines.length > 200)
    throw new Error(serverMessages.procurementLinesRequired);
  const productIds = Array.from(
    new Set(lines.map((l) => l.productId).filter((id): id is string => !!id)),
  );
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      nameEn: true,
      options: true,
      variants: { select: { id: true, optionValues: true } },
    },
  });
  return lines.map((line, index) => {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 10_000_000)
      throw new Error(serverMessages.stockQuantityInvalid);
    const priceText = String(line.unitPrice ?? "").trim();
    if (priceRequired && priceText === "")
      throw new Error(serverMessages.productAmountInvalid);
    const unitPrice = priceText === "" ? null : Number(priceText);
    if (
      unitPrice != null &&
      (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 99_999_999)
    )
      throw new Error(serverMessages.productAmountInvalid);
    let description = line.description.trim().slice(0, 300);
    let variantKey = "";
    if (line.productId) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) throw new Error(serverMessages.productMissing);
      if (
        product.variants.length &&
        !product.variants.some((v) => v.id === line.variantId)
      )
        throw new Error(serverMessages.stockVariantRequired);
      variantKey = product.variants.length ? line.variantId! : "";
      if (!description) {
        const variant = product.variants.find((v) => v.id === variantKey);
        description = [
          product.nameEn,
          variant
            ? variantLabel(
                normalizeProductOptions(product.options) ?? [],
                variant.optionValues,
                "en",
              )
            : "",
        ]
          .filter(Boolean)
          .join(" · ");
      }
    }
    if (!description) throw new Error(serverMessages.procurementLinesRequired);
    return {
      productId: line.productId || null,
      variantKey,
      description,
      quantity: Math.round(quantity * 1000) / 1000,
      unitPrice,
      sortOrder: index,
    };
  });
}

export interface ProcurementLineRecord {
  id: string;
  product_id: string | null;
  variant_key: string;
  description: string;
  quantity: number;
  unit_price: number | null;
}

// ─── Requisitions ────────────────────────────────────────────────────────────────────────────────────────────────

export interface RequisitionInput {
  id?: string;
  neededBy: string;
  note: string;
  lines: ProcurementLineInput[];
}

export async function saveRequisition(input: RequisitionInput, userId: string) {
  const lines = await cleanLines(input.lines, false);
  const estimatedTotal = documentTotals(
    lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice ?? 0 })),
    0,
  ).subtotal;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });
  const data = {
    neededBy: day(input.neededBy),
    note: input.note.trim().slice(0, 1000) || null,
    estimatedTotal,
  };
  const lineData = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    description: l.description,
    quantity: l.quantity,
    estimatedUnitCost: l.unitPrice,
    sortOrder: l.sortOrder,
  }));
  return db.$transaction(async (tx) => {
    if (input.id) {
      const current = await tx.purchaseRequisition.findUnique({
        where: { id: input.id },
        select: { status: true, requestedById: true },
      });
      if (!current) throw new Error(serverMessages.procurementDocumentMissing);
      if (!["draft", "rejected"].includes(current.status))
        throw new Error(serverMessages.procurementNotEditable);
      await tx.purchaseRequisitionLine.deleteMany({
        where: { requisitionId: input.id },
      });
      return tx.purchaseRequisition.update({
        where: { id: input.id },
        data: { ...data, status: "draft", lines: { create: lineData } },
      });
    }
    const number = await getNextSequenceNumber("PR", undefined, tx);
    return tx.purchaseRequisition.create({
      data: {
        ...data,
        number,
        requestedById: userId,
        departmentId: user?.departmentId ?? null,
        lines: { create: lineData },
      },
    });
  });
}

/** Sends a draft requisition for approval (Settings → Approvals decides who signs off and from what amount). */
export async function submitRequisition(id: string, userId: string) {
  const requisition = await db.purchaseRequisition.findUnique({
    where: { id },
    select: { status: true, requestedById: true },
  });
  if (!requisition) throw new Error(serverMessages.procurementDocumentMissing);
  if (!["draft", "rejected"].includes(requisition.status))
    throw new Error(serverMessages.procurementNotEditable);
  await db.purchaseRequisition.update({
    where: { id },
    data: { status: "pending_approval", decisionNote: null },
  });
  return submitForApproval({
    targetType: "purchase_requisition",
    targetId: id,
    requesterId: userId,
  });
}

registerApprovalFinalizer("purchase_requisition", {
  async approve(id) {
    await db.purchaseRequisition.updateMany({
      where: { id, status: "pending_approval" },
      data: { status: "approved" },
    });
  },
  async reject(id, _decider, reason) {
    await db.purchaseRequisition.updateMany({
      where: { id, status: "pending_approval" },
      data: { status: "rejected", decisionNote: reason || null },
    });
  },
});

export async function cancelRequisition(id: string) {
  const result = await db.purchaseRequisition.updateMany({
    where: { id, status: { in: ["draft", "rejected", "approved"] } },
    data: { status: "cancelled" },
  });
  if (!result.count) throw new Error(serverMessages.procurementNotEditable);
}

export async function listRequisitions(
  filter: { status?: string; requestedById?: string } = {},
) {
  const rows = await db.purchaseRequisition.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.requestedById ? { requestedById: filter.requestedById } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { _count: { select: { lines: true } } },
  });
  const people = await db.user.findMany({
    where: {
      id: { in: Array.from(new Set(rows.map((r) => r.requestedById))) },
    },
    select: { id: true, fullName: true },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    requested_by: people.find((p) => p.id === r.requestedById)?.fullName ?? "",
    needed_by: isoDay(r.neededBy),
    estimated_total: num(r.estimatedTotal),
    lines: r._count.lines,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getRequisition(id: string) {
  const r = await db.purchaseRequisition.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      purchaseOrders: { select: { id: true, number: true, status: true } },
      rfqs: { select: { id: true, number: true, status: true } },
    },
  });
  if (!r) return null;
  const requester = await db.user.findUnique({
    where: { id: r.requestedById },
    select: { fullName: true },
  });
  return {
    id: r.id,
    number: r.number,
    status: r.status,
    requested_by_id: r.requestedById,
    requested_by: requester?.fullName ?? "",
    needed_by: isoDay(r.neededBy),
    note: r.note ?? "",
    decision_note: r.decisionNote ?? "",
    estimated_total: num(r.estimatedTotal),
    lines: r.lines.map((l): ProcurementLineRecord => ({
      id: l.id,
      product_id: l.productId,
      variant_key: l.variantKey,
      description: l.description,
      quantity: num(l.quantity),
      unit_price: numOrNull(l.estimatedUnitCost),
    })),
    orders: r.purchaseOrders,
    rfqs: r.rfqs,
  };
}

// ─── Requests for quotation ──────────────────────────────────────────────────────────────────────────────────────

export interface RfqInput {
  title: string;
  dueDate: string;
  note: string;
  requisitionId?: string;
  /** Ignored when a requisition is given: its lines are copied. */
  lines: ProcurementLineInput[];
}

export async function createRfq(input: RfqInput, userId: string) {
  const title = input.title.trim().slice(0, 200);
  if (!title) throw new Error(serverMessages.productNameRequired);
  let lines: {
    productId: string | null;
    variantKey: string;
    description: string;
    quantity: number;
    sortOrder: number;
  }[];
  if (input.requisitionId) {
    const requisition = await db.purchaseRequisition.findUnique({
      where: { id: input.requisitionId },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    if (!requisition)
      throw new Error(serverMessages.procurementDocumentMissing);
    if (requisition.status !== "approved")
      throw new Error(serverMessages.procurementNeedsApproval);
    lines = requisition.lines.map((l) => ({
      productId: l.productId,
      variantKey: l.variantKey,
      description: l.description,
      quantity: num(l.quantity),
      sortOrder: l.sortOrder,
    }));
  } else {
    lines = (await cleanLines(input.lines, false)).map(
      ({ unitPrice: _unused, ...l }) => l,
    );
  }
  return db.$transaction(async (tx) => {
    const number = await getNextSequenceNumber("RFQ", undefined, tx);
    return tx.rfq.create({
      data: {
        number,
        title,
        dueDate: day(input.dueDate),
        note: input.note.trim().slice(0, 1000) || null,
        requisitionId: input.requisitionId || null,
        createdById: userId,
        lines: { create: lines },
      },
    });
  });
}

export async function listRfqs() {
  const rows = await db.rfq.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      _count: { select: { lines: true } },
      quotes: { select: { supplierId: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    status: r.status,
    due_date: isoDay(r.dueDate),
    lines: r._count.lines,
    suppliers: new Set(r.quotes.map((q) => q.supplierId)).size,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function getRfq(id: string) {
  const r = await db.rfq.findUnique({
    where: { id },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      quotes: {
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      purchaseOrders: {
        select: { id: true, number: true, status: true, supplierId: true },
      },
      requisition: { select: { id: true, number: true } },
    },
  });
  if (!r) return null;
  const suppliers = new Map<string, string>();
  for (const q of r.quotes)
    suppliers.set(q.supplierId, supplierName(q.supplier));
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    status: r.status,
    due_date: isoDay(r.dueDate),
    note: r.note ?? "",
    requisition: r.requisition,
    lines: r.lines.map((l) => ({
      id: l.id,
      product_id: l.productId,
      variant_key: l.variantKey,
      description: l.description,
      quantity: num(l.quantity),
    })),
    suppliers: Array.from(suppliers, ([supplierId, name]) => ({
      id: supplierId,
      name,
    })),
    quotes: r.quotes.map((q) => ({
      id: q.id,
      line_id: q.lineId,
      supplier_id: q.supplierId,
      unit_price: num(q.unitPrice),
      lead_time_days: q.leadTimeDays,
      selected: q.selected,
    })),
    orders: r.purchaseOrders,
  };
}

/** Records (or replaces) one supplier's prices on an open RFQ; an empty price removes that line's quote. */
export async function saveRfqQuotes(
  rfqId: string,
  supplierId: string,
  quotes: { lineId: string; unitPrice: string; leadTimeDays: string }[],
) {
  const rfq = await db.rfq.findUnique({
    where: { id: rfqId },
    select: { status: true, lines: { select: { id: true } } },
  });
  if (!rfq) throw new Error(serverMessages.procurementDocumentMissing);
  if (rfq.status !== "open")
    throw new Error(serverMessages.procurementNotEditable);
  await requireSupplier(supplierId);
  const lineIds = new Set(rfq.lines.map((l) => l.id));
  await db.$transaction(async (tx) => {
    for (const quote of quotes) {
      if (!lineIds.has(quote.lineId))
        throw new Error(serverMessages.procurementLinesRequired);
      const key = {
        rfqId_lineId_supplierId: { rfqId, lineId: quote.lineId, supplierId },
      };
      if (quote.unitPrice.trim() === "") {
        await tx.rfqQuote.deleteMany({
          where: { rfqId, lineId: quote.lineId, supplierId },
        });
        continue;
      }
      const unitPrice = Number(quote.unitPrice);
      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        unitPrice > 99_999_999
      )
        throw new Error(serverMessages.productAmountInvalid);
      const lead =
        quote.leadTimeDays.trim() === "" ? null : Number(quote.leadTimeDays);
      if (lead != null && (!Number.isInteger(lead) || lead < 0 || lead > 365))
        throw new Error(serverMessages.procurementDaysInvalid);
      await tx.rfqQuote.upsert({
        where: key,
        update: { unitPrice, leadTimeDays: lead },
        create: {
          rfqId,
          lineId: quote.lineId,
          supplierId,
          unitPrice,
          leadTimeDays: lead,
        },
      });
    }
  });
}

/**
 * Awards an RFQ: for each line the chosen quote; one draft purchase order per supplier at the quoted prices.
 * Returns the new orders' ids.
 */
export async function awardRfq(
  rfqId: string,
  quoteIds: string[],
  userId: string,
) {
  const rfq = await db.rfq.findUnique({
    where: { id: rfqId },
    include: { lines: true, quotes: true },
  });
  if (!rfq) throw new Error(serverMessages.procurementDocumentMissing);
  if (rfq.status !== "open")
    throw new Error(serverMessages.procurementNotEditable);
  const chosen = rfq.quotes.filter((q) => quoteIds.includes(q.id));
  if (
    !chosen.length ||
    new Set(chosen.map((q) => q.lineId)).size !== chosen.length
  )
    throw new Error(serverMessages.procurementAwardInvalid);
  const company = await db.companySetting.findFirst({
    select: { vatEnabled: true, vatPercentage: true },
  });
  const warehouse = await db.warehouse.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  return db.$transaction(async (tx) => {
    await tx.rfqQuote.updateMany({
      where: { rfqId },
      data: { selected: false },
    });
    await tx.rfqQuote.updateMany({
      where: { id: { in: chosen.map((q) => q.id) } },
      data: { selected: true },
    });
    const orders: string[] = [];
    for (const supplierId of Array.from(
      new Set(chosen.map((q) => q.supplierId)),
    )) {
      const mine = chosen.filter((q) => q.supplierId === supplierId);
      const lines = mine.map((q, index) => {
        const line = rfq.lines.find((l) => l.id === q.lineId)!;
        return {
          productId: line.productId,
          variantKey: line.variantKey,
          description: line.description,
          quantity: num(line.quantity),
          unitPrice: num(q.unitPrice),
          sortOrder: index,
        };
      });
      const vatPercentage = company?.vatEnabled
        ? num(company.vatPercentage)
        : 0;
      const totals = documentTotals(lines, vatPercentage);
      const lead = Math.max(0, ...mine.map((q) => q.leadTimeDays ?? 0));
      const number = await getNextSequenceNumber("PO", undefined, tx);
      const order = await tx.purchaseOrder.create({
        data: {
          number,
          supplierId,
          rfqId,
          requisitionId: rfq.requisitionId,
          warehouseId: warehouse?.id ?? null,
          expectedDate: lead ? new Date(Date.now() + lead * 86_400_000) : null,
          vatEnabled: vatPercentage > 0,
          vatPercentage,
          ...totals,
          createdById: userId,
          lines: { create: lines },
        },
      });
      orders.push(order.id);
    }
    await tx.rfq.update({ where: { id: rfqId }, data: { status: "awarded" } });
    if (rfq.requisitionId)
      await tx.purchaseRequisition.update({
        where: { id: rfq.requisitionId },
        data: { status: "ordered" },
      });
    return orders;
  });
}

export async function cancelRfq(id: string) {
  const result = await db.rfq.updateMany({
    where: { id, status: "open" },
    data: { status: "cancelled" },
  });
  if (!result.count) throw new Error(serverMessages.procurementNotEditable);
}

// ─── Purchase orders ─────────────────────────────────────────────────────────────────────────────────────────────

export interface PurchaseOrderInput {
  id?: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  warehouseId?: string;
  requisitionId?: string;
  vatEnabled: boolean;
  note: string;
  terms: string;
  lines: ProcurementLineInput[];
}

export async function savePurchaseOrder(
  input: PurchaseOrderInput,
  userId: string,
) {
  await requireSupplier(input.supplierId);
  const lines = await cleanLines(input.lines, true);
  const company = await db.companySetting.findFirst({
    select: { vatPercentage: true },
  });
  const vatPercentage = input.vatEnabled ? num(company?.vatPercentage) : 0;
  const totals = documentTotals(
    lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice ?? 0 })),
    vatPercentage,
  );
  if (
    input.warehouseId &&
    !(await db.warehouse.findFirst({
      where: { id: input.warehouseId, isActive: true },
      select: { id: true },
    }))
  )
    throw new Error(serverMessages.stockLocationMissing);
  const data = {
    supplierId: input.supplierId,
    orderDate: day(input.orderDate) ?? new Date(),
    expectedDate: day(input.expectedDate),
    warehouseId: input.warehouseId || null,
    vatEnabled: vatPercentage > 0,
    vatPercentage,
    ...totals,
    note: input.note.trim().slice(0, 1000) || null,
    terms: input.terms.trim().slice(0, 2000) || null,
  };
  const lineData = lines.map((l) => ({
    productId: l.productId,
    variantKey: l.variantKey,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice ?? 0,
    sortOrder: l.sortOrder,
  }));
  return db.$transaction(async (tx) => {
    if (input.id) {
      const current = await tx.purchaseOrder.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!current) throw new Error(serverMessages.procurementDocumentMissing);
      if (current.status !== "draft")
        throw new Error(serverMessages.procurementNotEditable);
      await tx.purchaseOrderLine.deleteMany({
        where: { purchaseOrderId: input.id },
      });
      return tx.purchaseOrder.update({
        where: { id: input.id },
        data: { ...data, lines: { create: lineData } },
      });
    }
    if (input.requisitionId) {
      const requisition = await tx.purchaseRequisition.findUnique({
        where: { id: input.requisitionId },
        select: { status: true },
      });
      if (requisition?.status !== "approved")
        throw new Error(serverMessages.procurementNeedsApproval);
      await tx.purchaseRequisition.update({
        where: { id: input.requisitionId },
        data: { status: "ordered" },
      });
    }
    const number = await getNextSequenceNumber("PO", undefined, tx);
    return tx.purchaseOrder.create({
      data: {
        ...data,
        number,
        requisitionId: input.requisitionId || null,
        createdById: userId,
        lines: { create: lineData },
      },
    });
  });
}

/** Sends a draft order for approval; with no approver needed (below the policy's amount) it is approved at once. */
export async function submitPurchaseOrder(id: string, userId: string) {
  const order = await db.purchaseOrder.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!order) throw new Error(serverMessages.procurementDocumentMissing);
  if (order.status !== "draft")
    throw new Error(serverMessages.procurementNotEditable);
  await db.purchaseOrder.update({
    where: { id },
    data: { status: "pending_approval" },
  });
  return submitForApproval({
    targetType: "purchase_order",
    targetId: id,
    requesterId: userId,
  });
}

registerApprovalFinalizer("purchase_order", {
  async approve(id, decider) {
    await db.purchaseOrder.updateMany({
      where: { id, status: "pending_approval" },
      data: {
        status: "approved",
        approvedById: decider,
        approvedAt: new Date(),
      },
    });
  },
  async reject(id, _decider, reason) {
    await db.purchaseOrder.updateMany({
      where: { id, status: "pending_approval" },
      data: { status: "draft", note: reason ? `${reason}` : undefined },
    });
  },
});

/** Records that an approved order went to the supplier. */
export async function markPurchaseOrderSent(
  id: string,
  via: "email" | "whatsapp" | "printed",
) {
  const result = await db.purchaseOrder.updateMany({
    where: { id, status: { in: ["approved", "sent"] } },
    data: { status: "sent", sentAt: new Date(), sentVia: via },
  });
  if (!result.count) throw new Error(serverMessages.procurementNeedsApproval);
}

export async function cancelPurchaseOrder(id: string) {
  const received = await db.purchaseOrderLine.findFirst({
    where: {
      purchaseOrderId: id,
      OR: [{ receivedQuantity: { gt: 0 } }, { billedQuantity: { gt: 0 } }],
    },
    select: { id: true },
  });
  if (received) throw new Error(serverMessages.procurementHasReceipts);
  const result = await db.purchaseOrder.updateMany({
    where: {
      id,
      status: { in: ["draft", "pending_approval", "approved", "sent"] },
    },
    data: { status: "cancelled" },
  });
  if (!result.count) throw new Error(serverMessages.procurementNotEditable);
}

export interface PurchaseOrderQuery {
  status?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listPurchaseOrders(query: PurchaseOrderQuery = {}) {
  const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const search = query.search?.trim().slice(0, 80);
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" } },
            {
              supplier: {
                companyName: { contains: search, mode: "insensitive" },
              },
            },
            {
              supplier: {
                firstName: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.purchaseOrder.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: {
          select: { companyName: true, firstName: true, lastName: true },
        },
      },
    }),
    db.purchaseOrder.count({ where }),
  ]);
  return {
    rows: rows.map((o) => ({
      id: o.id,
      number: o.number,
      supplier: supplierName(o.supplier),
      status: o.status,
      order_date: isoDay(o.orderDate)!,
      expected_date: isoDay(o.expectedDate),
      total: num(o.total),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getPurchaseOrder(id: string) {
  const o = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: { select: { id: true, nameEn: true, nameAr: true } },
      requisition: { select: { id: true, number: true } },
      rfq: { select: { id: true, number: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      receipts: { orderBy: { receivedAt: "desc" }, include: { lines: true } },
      bills: {
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true, status: true, total: true },
      },
    },
  });
  if (!o) return null;
  const people = await db.user.findMany({
    where: {
      id: {
        in: [o.createdById, o.approvedById].filter((v): v is string => !!v),
      },
    },
    select: { id: true, fullName: true },
  });
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    supplier: {
      id: o.supplier.id,
      name: supplierName(o.supplier),
      email: o.supplier.email ?? "",
      phone: o.supplier.phone ?? "",
      vat_number: o.supplier.vatNumber ?? "",
      address: [
        o.supplier.addressLine,
        o.supplier.addressCity,
        o.supplier.addressCountry,
      ]
        .filter(Boolean)
        .join(", "),
    },
    order_date: isoDay(o.orderDate)!,
    expected_date: isoDay(o.expectedDate),
    warehouse: o.warehouse
      ? {
          id: o.warehouse.id,
          name_en: o.warehouse.nameEn,
          name_ar: o.warehouse.nameAr,
        }
      : null,
    requisition: o.requisition,
    rfq: o.rfq,
    note: o.note ?? "",
    terms: o.terms ?? "",
    vat_enabled: o.vatEnabled,
    vat_percentage: num(o.vatPercentage),
    subtotal: num(o.subtotal),
    vat_amount: num(o.vatAmount),
    total: num(o.total),
    sent_at: o.sentAt?.toISOString() ?? null,
    sent_via: o.sentVia,
    created_by: people.find((p) => p.id === o.createdById)?.fullName ?? null,
    approved_by: people.find((p) => p.id === o.approvedById)?.fullName ?? null,
    lines: o.lines.map((l) => ({
      id: l.id,
      product_id: l.productId,
      variant_key: l.variantKey,
      description: l.description,
      quantity: num(l.quantity),
      unit_price: num(l.unitPrice),
      received: num(l.receivedQuantity),
      rejected: num(l.rejectedQuantity),
      billed: num(l.billedQuantity),
    })),
    receipts: o.receipts.map((r) => ({
      id: r.id,
      number: r.number,
      received_at: r.receivedAt.toISOString(),
      quantity: r.lines.reduce((sum, l) => sum + num(l.quantity), 0),
      rejected: r.lines.reduce((sum, l) => sum + num(l.rejectedQuantity), 0),
    })),
    bills: o.bills.map((b) => ({
      id: b.id,
      number: b.number,
      status: b.status,
      total: num(b.total),
    })),
  };
}

export type PurchaseOrderRecord = NonNullable<
  Awaited<ReturnType<typeof getPurchaseOrder>>
>;

/** Products to choose from on procurement lines: id, SKU, names and variants with labels. */
export async function procurementProductOptions() {
  const products = await db.product.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    take: 2000,
    select: {
      id: true,
      sku: true,
      nameEn: true,
      nameAr: true,
      cost: true,
      options: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sku: true, optionValues: true, cost: true },
      },
    },
  });
  return products.map((p) => {
    const options = normalizeProductOptions(p.options) ?? [];
    return {
      id: p.id,
      sku: p.sku,
      name_en: p.nameEn,
      name_ar: p.nameAr,
      cost: num(p.cost),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        label_en: variantLabel(options, v.optionValues, "en"),
        label_ar: variantLabel(options, v.optionValues, "ar"),
        cost: v.cost == null ? num(p.cost) : num(v.cost),
      })),
    };
  });
}

export type ProcurementProductOption = Awaited<
  ReturnType<typeof procurementProductOptions>
>[number];
