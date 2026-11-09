import { assertCompanyCurrency } from "../finance/company-currency";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../atomic";
import {
  REJECT_REASONS,
  RECEIVABLE_ORDER_STATUSES,
  SUPPLIER_PAYMENT_METHODS,
  billAfterPayment,
  daysBetween,
  documentTotals,
  matchBillLine,
  orderReceiptStatus,
  type MatchIssue,
  type PurchaseOrderStatus,
} from "../constants/procurement";
import { postMovements, type MovementInput } from "./inventory";
import { getNextSequenceNumber } from "./sequence";

const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;
const day = (value: string | undefined | null) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error(serverMessages.procurementDateInvalid);
  return new Date(`${value}T00:00:00.000Z`);
};
const isoDay = (value: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;
const supplierName = (c: {
  companyName: string | null;
  firstName: string;
  lastName: string | null;
}) => c.companyName || [c.firstName, c.lastName].filter(Boolean).join(" ");

export interface GoodsReceiptInput {
  locationId: string;
  note: string;
  lines: {
    orderLineId: string;
    quantity: string;
    rejectedQuantity: string;
    rejectReason: string;
    batchNumber: string;
    expiryDate: string;
  }[];
}

export async function receiveGoods(
  orderId: string,
  input: GoodsReceiptInput,
  userId: string | null,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    if (
      !(RECEIVABLE_ORDER_STATUSES as readonly string[]).includes(order.status)
    )
      throw new Error(serverMessages.procurementNeedsApproval);
    const location = await tx.stockLocation.findUnique({
      where: { id: input.locationId },
      include: { warehouse: true },
    });
    if (!location || !location.isActive || !location.warehouse.isActive)
      throw new Error(serverMessages.stockLocationMissing);
    const lines = input.lines
      .map((entry) => ({
        entry,
        line: order.lines.find((l) => l.id === entry.orderLineId),
        quantity: round3(Number(entry.quantity || 0)),
        rejected: round3(Number(entry.rejectedQuantity || 0)),
      }))
      .filter((l) => l.quantity > 0 || l.rejected > 0);
    if (!lines.length) throw new Error(serverMessages.stockQuantityInvalid);
    const products = await tx.product.findMany({
      where: {
        id: {
          in: lines
            .map((l) => l.line?.productId)
            .filter((id): id is string => !!id),
        },
      },
      select: { id: true, trackStock: true, trackBatches: true },
    });
    const movements: MovementInput[] = [];
    for (const { entry, line, quantity, rejected } of lines) {
      if (!line) throw new Error(serverMessages.procurementLinesRequired);
      if (
        !Number.isFinite(quantity) ||
        !Number.isFinite(rejected) ||
        quantity < 0 ||
        rejected < 0
      )
        throw new Error(serverMessages.stockQuantityInvalid);
      if (
        num(line.receivedQuantity) +
          num(line.rejectedQuantity) +
          quantity +
          rejected >
        num(line.quantity) + 1e-9
      )
        throw new Error(serverMessages.procurementOverReceived);
      if (
        rejected > 0 &&
        !(REJECT_REASONS as readonly string[]).includes(entry.rejectReason)
      )
        throw new Error(serverMessages.stockReasonRequired);
      const product = products.find((p) => p.id === line.productId);
      if (product?.trackStock && quantity > 0)
        movements.push({
          type: "receipt",
          productId: product.id,
          variantId: line.variantKey || undefined,
          locationId: location.id,
          quantity,
          unitCost: num(line.unitPrice),
          batchNumber: product.trackBatches ? entry.batchNumber : undefined,
          expiryDate: product.trackBatches ? entry.expiryDate : undefined,
          sourceType: "purchase_order",
          sourceId: order.id,
          note: order.number,
        });
    }
    const number = await getNextSequenceNumber("GRN", undefined, tx);
    const receipt = await tx.goodsReceipt.create({
      data: {
        number,
        purchaseOrderId: order.id,
        locationId: location.id,
        receivedById: userId,
        note: input.note.trim().slice(0, 500) || null,
        lines: {
          create: lines.map(({ entry, quantity, rejected }) => ({
            orderLineId: entry.orderLineId,
            quantity,
            rejectedQuantity: rejected,
            rejectReason: rejected > 0 ? entry.rejectReason : null,
            batchNumber: entry.batchNumber.trim().slice(0, 60) || null,
            expiryDate: day(entry.expiryDate),
          })),
        },
      },
    });
    for (const { line, quantity, rejected } of lines)
      await tx.purchaseOrderLine.update({
        where: { id: line!.id },
        data: {
          receivedQuantity: { increment: quantity },
          rejectedQuantity: { increment: rejected },
        },
      });
    const updated = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: order.id },
    });
    const status = orderReceiptStatus(
      updated.map((l) => ({
        quantity: num(l.quantity),
        receivedQuantity: num(l.receivedQuantity) + num(l.rejectedQuantity),
      })),
      order.status as PurchaseOrderStatus,
    );
    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status },
    });
    const low = await postMovements(tx, movements, userId);
    return { receipt, low };
  });
}

export interface SupplierBillInput {
  id?: string;
  supplierId: string;
  purchaseOrderId?: string;
  supplierRef: string;
  billDate: string;
  dueDate: string;
  vatAmount: string;
  note: string;
  attachmentUrl: string;
  lines: {
    orderLineId?: string;
    description: string;
    quantity: string;
    unitPrice: string;
  }[];
}

export async function billableOrderLines(orderId: string) {
  const order = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { lines: { orderBy: { sortOrder: "asc" } } },
  });
  if (!order) return null;
  const lines = order.lines
    .map((l) => ({
      orderLineId: l.id,
      description: l.description,
      quantity: round3(num(l.receivedQuantity) - num(l.billedQuantity)),
      unitPrice: num(l.unitPrice),
    }))
    .filter((l) => l.quantity > 0);
  const subtotal = documentTotals(lines, 0).subtotal;
  return {
    supplierId: order.supplierId,
    purchaseOrderId: order.id,
    number: order.number,
    lines,
    vatAmount: order.vatEnabled
      ? round3((subtotal * num(order.vatPercentage)) / 100)
      : 0,
  };
}

export async function saveSupplierBill(
  input: SupplierBillInput,
  userId: string,
) {
  const supplier = await db.crmContact.findUnique({
    where: { id: input.supplierId },
    select: { contactType: true, supplierPaymentTermsDays: true },
  });
  if (supplier?.contactType !== "vendor")
    throw new Error(serverMessages.procurementSupplierMissing);
  if (!input.lines.length || input.lines.length > 200)
    throw new Error(serverMessages.procurementLinesRequired);
  const order = input.purchaseOrderId
    ? await db.purchaseOrder.findUnique({
        where: { id: input.purchaseOrderId },
        include: { lines: true },
      })
    : null;
  if (
    input.purchaseOrderId &&
    (!order || order.supplierId !== input.supplierId)
  )
    throw new Error(serverMessages.procurementDocumentMissing);
  const lines = input.lines.map((line, index) => {
    const quantity = round3(Number(line.quantity));
    const unitPrice = Number(line.unitPrice);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      unitPrice > 99_999_999
    )
      throw new Error(serverMessages.productAmountInvalid);
    if (
      line.orderLineId &&
      !order?.lines.some((l) => l.id === line.orderLineId)
    )
      throw new Error(serverMessages.procurementLinesRequired);
    const description =
      line.description.trim().slice(0, 300) ||
      order?.lines.find((l) => l.id === line.orderLineId)?.description ||
      "";
    if (!description) throw new Error(serverMessages.procurementLinesRequired);
    return {
      orderLineId: line.orderLineId || null,
      description,
      quantity,
      unitPrice,
      sortOrder: index,
    };
  });
  const subtotal = documentTotals(lines, 0).subtotal;
  const vatAmount = round3(Number(input.vatAmount || 0));
  if (!Number.isFinite(vatAmount) || vatAmount < 0 || vatAmount > subtotal)
    throw new Error(serverMessages.productAmountInvalid);
  const billDate = day(input.billDate) ?? new Date();
  const dueDate =
    day(input.dueDate) ??
    (supplier.supplierPaymentTermsDays != null
      ? new Date(
          billDate.getTime() + supplier.supplierPaymentTermsDays * 86_400_000,
        )
      : null);
  const supplierRef = input.supplierRef.trim().slice(0, 60) || null;
  if (
    supplierRef &&
    (await db.supplierBill.findFirst({
      where: {
        supplierId: input.supplierId,
        supplierRef,
        id: { not: input.id ?? "" },
        status: { not: "cancelled" },
      },
      select: { id: true },
    }))
  )
    throw new Error(serverMessages.procurementBillDuplicate);
  const attachmentUrl = input.attachmentUrl.trim();
  const data = {
    supplierId: input.supplierId,
    purchaseOrderId: input.purchaseOrderId || null,
    supplierRef,
    billDate,
    dueDate,
    subtotal,
    vatAmount,
    total: round3(subtotal + vatAmount),
    note: input.note.trim().slice(0, 1000) || null,
    attachmentUrl: attachmentUrl.startsWith("/api/files/")
      ? attachmentUrl
      : null,
  };
  return db.$transaction(async (tx) => {
    if (input.id) {
      const current = await tx.supplierBill.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (current?.status !== "draft")
        throw new Error(serverMessages.procurementNotEditable);
      await tx.supplierBillLine.deleteMany({ where: { billId: input.id } });
      return tx.supplierBill.update({
        where: { id: input.id },
        data: { ...data, lines: { create: lines } },
      });
    }
    const number = await getNextSequenceNumber("BILL", undefined, tx);
    return tx.supplierBill.create({
      data: { ...data, number, createdById: userId, lines: { create: lines } },
    });
  });
}

export interface BillLineMatch {
  id: string;
  order_line_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  ordered: number | null;
  ordered_price: number | null;
  received: number | null;
  billed_before: number | null;
  issues: MatchIssue[];
}

export async function getSupplierBill(id: string) {
  const bill = await db.supplierBill.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchaseOrder: { select: { id: true, number: true } },
      lines: { orderBy: { sortOrder: "asc" }, include: { orderLine: true } },
      payments: { orderBy: { paidOn: "asc" } },
    },
  });
  if (!bill) return null;
  const counted = bill.status !== "draft" && bill.status !== "cancelled";
  const lines: BillLineMatch[] = bill.lines.map((l) => {
    const o = l.orderLine;
    const billedBefore = o
      ? round3(num(o.billedQuantity) - (counted ? num(l.quantity) : 0))
      : null;
    return {
      id: l.id,
      order_line_id: l.orderLineId,
      description: l.description,
      quantity: num(l.quantity),
      unit_price: num(l.unitPrice),
      ordered: o ? num(o.quantity) : null,
      ordered_price: o ? num(o.unitPrice) : null,
      received: o ? num(o.receivedQuantity) : null,
      billed_before: billedBefore,
      issues: matchBillLine(
        { quantity: num(l.quantity), unitPrice: num(l.unitPrice) },
        o
          ? {
              quantity: num(o.quantity),
              unitPrice: num(o.unitPrice),
              receivedQuantity: num(o.receivedQuantity),
              billedQuantity: billedBefore ?? 0,
            }
          : null,
      ),
    };
  });
  const people = await db.user.findMany({
    where: {
      id: {
        in: [bill.createdById, bill.approvedById].filter(
          (v): v is string => !!v,
        ),
      },
    },
    select: { id: true, fullName: true },
  });
  return {
    id: bill.id,
    number: bill.number,
    supplier_ref: bill.supplierRef ?? "",
    supplier: { id: bill.supplier.id, name: supplierName(bill.supplier) },
    order: bill.purchaseOrder,
    bill_date: isoDay(bill.billDate)!,
    due_date: isoDay(bill.dueDate),
    status: bill.status,
    subtotal: num(bill.subtotal),
    vat_amount: num(bill.vatAmount),
    total: num(bill.total),
    amount_paid: num(bill.amountPaid),
    expense_id: bill.expenseId,
    override_reason: bill.overrideReason ?? "",
    attachment_url: bill.attachmentUrl,
    note: bill.note ?? "",
    created_by: people.find((p) => p.id === bill.createdById)?.fullName ?? null,
    approved_by:
      people.find((p) => p.id === bill.approvedById)?.fullName ?? null,
    lines,
    matched: lines.every((l) => l.issues.length === 0),
    payments: bill.payments.map((p) => ({
      id: p.id,
      amount: num(p.amount),
      paid_on: isoDay(p.paidOn)!,
      method: p.method,
      reference: p.reference ?? "",
    })),
  };
}

export type SupplierBillRecord = NonNullable<
  Awaited<ReturnType<typeof getSupplierBill>>
>;

async function purchasesCategory() {
  const en = getTranslations("en").admin.procurement.bills;
  const ar = getTranslations("ar").admin.procurement.bills;
  return db.expenseCategory.upsert({
    where: { slug: "purchases" },
    update: {},
    create: {
      slug: "purchases",
      nameEn: en.expenseCategory,
      nameAr: ar.expenseCategory,
      kind: "cost_of_sales",
      isSystem: true,
      color: "#0F766E",
      displayOrder: 50,
    },
  });
}

export async function approveSupplierBill(
  id: string,
  userId: string,
  overrideReason?: string,
) {
  const accountingCurrency = await getAccountingCurrency();
  const bill = await getSupplierBill(id);
  if (!bill) throw new Error(serverMessages.procurementDocumentMissing);
  if (bill.status !== "draft")
    throw new Error(serverMessages.procurementNotEditable);
  const reason = overrideReason?.trim().slice(0, 500) || null;
  if (!bill.matched && !reason)
    throw new Error(serverMessages.procurementBillMismatch);
  const category = await purchasesCategory();
  const en = getTranslations("en").admin.procurement.bills;
  const ar = getTranslations("ar").admin.procurement.bills;
  return db.$transaction(async (tx) => {
    const current = await tx.supplierBill.findUnique({
      where: { id },
      select: { status: true },
    });
    if (current?.status !== "draft")
      throw new Error(serverMessages.procurementNotEditable);
    for (const line of bill.lines)
      if (line.order_line_id)
        await tx.purchaseOrderLine.update({
          where: { id: line.order_line_id },
          data: { billedQuantity: { increment: line.quantity } },
        });
    const expense = await tx.expense.create({
      data: {
        categoryId: category.id,
        descriptionEn: `${en.expenseDescription} ${bill.number}${bill.supplier_ref ? ` (${bill.supplier_ref})` : ""}`,
        descriptionAr: `${ar.expenseDescription} ${bill.number}${bill.supplier_ref ? ` (${bill.supplier_ref})` : ""}`,
        amount: bill.total,
        netAmount: bill.subtotal,
        inputVatAmount: bill.vat_amount,
        taxInvoiceNumber: bill.supplier_ref || null,
        currency: await assertCompanyCurrency(),
        expenseDate: new Date(`${bill.bill_date}T00:00:00.000Z`),
        vendorName: bill.supplier.name,
        receiptUrl: bill.attachment_url,
        status: "approved",
        createdById: userId,
      },
    });
    return tx.supplierBill.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
        overrideReason: bill.matched ? null : reason,
        expenseId: expense.id,
      },
    });
  });
}

export async function cancelSupplierBill(id: string) {
  const result = await db.supplierBill.updateMany({
    where: { id, status: "draft" },
    data: { status: "cancelled" },
  });
  if (!result.count) throw new Error(serverMessages.procurementNotEditable);
}

export interface SupplierPaymentInput {
  amount: string;
  paidOn: string;
  method: string;
  reference: string;
}

export async function recordSupplierPayment(
  billId: string,
  input: SupplierPaymentInput,
  userId: string,
) {
  const amount = round3(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error(serverMessages.productAmountInvalid);
  if (!(SUPPLIER_PAYMENT_METHODS as readonly string[]).includes(input.method))
    throw new Error(serverMessages.procurementPaymentMethodInvalid);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "SupplierBill" WHERE id = ${billId} FOR UPDATE`;
    const bill = await tx.supplierBill.findUnique({
      where: { id: billId },
      select: { status: true, total: true, amountPaid: true },
    });
    if (!bill) throw new Error(serverMessages.procurementDocumentMissing);
    if (!["approved", "partially_paid"].includes(bill.status))
      throw new Error(serverMessages.procurementNeedsApproval);
    if (num(bill.amountPaid) + amount > num(bill.total) + 0.0005)
      throw new Error(serverMessages.procurementOverpaid);
    await tx.supplierPayment.create({
      data: {
        billId,
        amount,
        paidOn: day(input.paidOn) ?? new Date(),
        method: input.method,
        reference: input.reference.trim().slice(0, 100) || null,
        createdById: userId,
      },
    });
    const next = billAfterPayment(
      num(bill.total),
      num(bill.amountPaid) + amount,
    );
    return tx.supplierBill.update({ where: { id: billId }, data: next });
  });
}

export async function listSupplierBills(
  filter: { status?: string; supplierId?: string } = {},
) {
  const rows = await db.supplierBill.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      supplier: {
        select: { companyName: true, firstName: true, lastName: true },
      },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    number: b.number,
    supplier_ref: b.supplierRef ?? "",
    supplier: supplierName(b.supplier),
    status: b.status,
    bill_date: isoDay(b.billDate)!,
    due_date: isoDay(b.dueDate),
    total: num(b.total),
    amount_paid: num(b.amountPaid),
  }));
}

export async function supplierPerformance() {
  const orders = await db.purchaseOrder.findMany({
    where: { status: { notIn: ["draft", "cancelled"] } },
    select: {
      supplierId: true,
      orderDate: true,
      expectedDate: true,
      receipts: {
        select: { receivedAt: true },
        orderBy: { receivedAt: "asc" },
        take: 1,
      },
      lines: { select: { receivedQuantity: true, rejectedQuantity: true } },
    },
  });
  const bills = await db.supplierBill.groupBy({
    by: ["supplierId"],
    where: { status: { in: ["approved", "partially_paid", "paid"] } },
    _sum: { total: true, amountPaid: true },
  });
  const stats = new Map<
    string,
    {
      leadDays: number[];
      onTime: number;
      dated: number;
      received: number;
      rejected: number;
      orders: number;
    }
  >();
  for (const o of orders) {
    const s = stats.get(o.supplierId) ?? {
      leadDays: [],
      onTime: 0,
      dated: 0,
      received: 0,
      rejected: 0,
      orders: 0,
    };
    s.orders += 1;
    const first = o.receipts[0]?.receivedAt;
    if (first) {
      s.leadDays.push(daysBetween(o.orderDate, first));
      if (o.expectedDate) {
        s.dated += 1;
        if (daysBetween(o.expectedDate, first) <= 0) s.onTime += 1;
      }
    }
    for (const l of o.lines) {
      s.received += num(l.receivedQuantity);
      s.rejected += num(l.rejectedQuantity);
    }
    stats.set(o.supplierId, s);
  }
  const result: Record<
    string,
    {
      orders: number;
      average_lead_days: number | null;
      on_time_percent: number | null;
      rejected_percent: number | null;
      billed: number;
      outstanding: number;
    }
  > = {};
  for (const [supplierId, s] of Array.from(stats)) {
    const bill = bills.find((b) => b.supplierId === supplierId);
    result[supplierId] = {
      orders: s.orders,
      average_lead_days: s.leadDays.length
        ? Math.round(
            (s.leadDays.reduce((a, b) => a + b, 0) / s.leadDays.length) * 10,
          ) / 10
        : null,
      on_time_percent: s.dated ? Math.round((s.onTime / s.dated) * 100) : null,
      rejected_percent:
        s.received + s.rejected > 0
          ? Math.round((s.rejected / (s.received + s.rejected)) * 1000) / 10
          : null,
      billed: num(bill?._sum.total),
      outstanding: round3(num(bill?._sum.total) - num(bill?._sum.amountPaid)),
    };
  }
  for (const bill of bills)
    if (!result[bill.supplierId])
      result[bill.supplierId] = {
        orders: 0,
        average_lead_days: null,
        on_time_percent: null,
        rejected_percent: null,
        billed: num(bill._sum.total),
        outstanding: round3(num(bill._sum.total) - num(bill._sum.amountPaid)),
      };
  return result;
}

export async function purchasePriceHistory(productId: string, limit = 10) {
  const lines = await db.purchaseOrderLine.findMany({
    where: {
      productId,
      purchaseOrder: { status: { notIn: ["draft", "cancelled"] } },
    },
    orderBy: { purchaseOrder: { orderDate: "desc" } },
    take: limit,
    include: {
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          orderDate: true,
          supplier: {
            select: { companyName: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
  return lines.map((l) => ({
    order_id: l.purchaseOrder.id,
    number: l.purchaseOrder.number,
    date: isoDay(l.purchaseOrder.orderDate)!,
    supplier: supplierName(l.purchaseOrder.supplier),
    variant_key: l.variantKey,
    quantity: num(l.quantity),
    unit_price: num(l.unitPrice),
  }));
}

export async function setSupplierBillFile(id: string, fileUrl: string) {
  const bill = await db.supplierBill.findUnique({
    where: { id },
    select: { status: true, expenseId: true },
  });
  if (!bill || bill.status === "cancelled")
    throw new Error(serverMessages.procurementDocumentMissing);
  await db.supplierBill.update({
    where: { id },
    data: { attachmentUrl: fileUrl },
  });
  if (bill.expenseId)
    await db.expense.update({
      where: { id: bill.expenseId },
      data: { receiptUrl: fileUrl },
    });
}
