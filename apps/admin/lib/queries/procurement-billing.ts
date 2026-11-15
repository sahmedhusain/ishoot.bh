import { assertCompanyCurrency } from "../finance/company-currency";
import { companyCurrency as getAccountingCurrency } from "../finance/company-currency";
import { getTranslations, serverMessages } from "@platform/locales";
import { runAtomicMutation } from "../api/atomic";
import { deleteTableRow, listTableRows, upsertTableRow } from "../api/tables";
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
const isoDay = (value: Date | string | null | undefined) =>
  value
    ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
    : null;
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
  return runAtomicMutation(async () => {
    const [orders, allPoLines, locations, warehouses, allProducts] =
      await Promise.all([
        listTableRows<any>("inventory", "purchase_order"),
        listTableRows<any>("inventory", "purchase_order_line"),
        listTableRows<any>("inventory", "stock_location"),
        listTableRows<any>("inventory", "warehouse"),
        listTableRows<any>("inventory", "product"),
      ]);
    const rawOrder = orders.find((o) => o.id === orderId);
    if (!rawOrder) throw new Error(serverMessages.procurementDocumentMissing);
    const poLines = allPoLines.filter((l) => l.purchaseOrderId === orderId);
    const order = { ...rawOrder, lines: poLines };
    if (
      !(RECEIVABLE_ORDER_STATUSES as readonly string[]).includes(order.status)
    )
      throw new Error(serverMessages.procurementNeedsApproval);
    const rawLocation = locations.find((l) => l.id === input.locationId);
    const warehouse = rawLocation
      ? warehouses.find((w) => w.id === rawLocation.warehouseId)
      : null;
    if (!rawLocation || !rawLocation.isActive || !warehouse?.isActive)
      throw new Error(serverMessages.stockLocationMissing);
    const location = { ...rawLocation, warehouse };
    const lines = input.lines
      .map((entry) => ({
        entry,
        line: order.lines.find((l: any) => l.id === entry.orderLineId),
        quantity: round3(Number(entry.quantity || 0)),
        rejected: round3(Number(entry.rejectedQuantity || 0)),
      }))
      .filter((l) => l.quantity > 0 || l.rejected > 0);
    if (!lines.length) throw new Error(serverMessages.stockQuantityInvalid);
    const productIds = new Set(
      lines.map((l) => l.line?.productId).filter((id): id is string => !!id),
    );
    const products = allProducts.filter((p) => productIds.has(p.id));
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
    const number = await getNextSequenceNumber("GRN");
    const receipt = await upsertTableRow<any>("inventory", "goods_receipt", {
      id: crypto.randomUUID(),
      number,
      purchaseOrderId: order.id,
      locationId: location.id,
      receivedById: userId,
      receivedAt: new Date().toISOString(),
      note: input.note.trim().slice(0, 500) || null,
    });
    await Promise.all(
      lines.map(({ entry, quantity, rejected }) =>
        upsertTableRow("inventory", "goods_receipt_line", {
          id: crypto.randomUUID(),
          receiptId: receipt.id,
          orderLineId: entry.orderLineId,
          quantity,
          rejectedQuantity: rejected,
          rejectReason: rejected > 0 ? entry.rejectReason : null,
          batchNumber: entry.batchNumber.trim().slice(0, 60) || null,
          expiryDate: day(entry.expiryDate)?.toISOString() ?? null,
        }),
      ),
    );
    const updatedLines = await Promise.all(
      lines.map(({ line, quantity, rejected }) =>
        upsertTableRow("inventory", "purchase_order_line", {
          ...line,
          receivedQuantity: round3(num(line.receivedQuantity) + quantity),
          rejectedQuantity: round3(num(line.rejectedQuantity) + rejected),
        }),
      ),
    );
    const updatedMap = new Map<string, any>(updatedLines.map((l: any) => [l.id, l]));
    const allOrderLines = poLines.map((l: any) => updatedMap.get(l.id) ?? l);
    const status = orderReceiptStatus(
      allOrderLines.map((l: any) => ({
        quantity: num(l.quantity),
        receivedQuantity: num(l.receivedQuantity) + num(l.rejectedQuantity),
      })),
      order.status as PurchaseOrderStatus,
    );
    await upsertTableRow("inventory", "purchase_order", {
      ...rawOrder,
      status,
    });
    const low = await postMovements(null as any, movements, userId);
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
  const [orders, allLines] = await Promise.all([
    listTableRows<any>("inventory", "purchase_order"),
    listTableRows<any>("inventory", "purchase_order_line"),
  ]);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  const poLines = allLines
    .filter((l) => l.purchaseOrderId === orderId)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const lines = poLines
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
  const [contacts, orders, poLines, allBills, allBillLines] = await Promise.all([
    listTableRows<any>("sales", "crm_contact"),
    listTableRows<any>("inventory", "purchase_order"),
    listTableRows<any>("inventory", "purchase_order_line"),
    listTableRows<any>("finance", "supplier_bill"),
    listTableRows<any>("finance", "supplier_bill_line"),
  ]);
  const supplier = contacts.find((c) => c.id === input.supplierId);
  if (supplier?.contactType !== "vendor")
    throw new Error(serverMessages.procurementSupplierMissing);
  if (!input.lines.length || input.lines.length > 200)
    throw new Error(serverMessages.procurementLinesRequired);
  const rawOrder = input.purchaseOrderId
    ? orders.find((o) => o.id === input.purchaseOrderId)
    : null;
  const order = rawOrder
    ? {
        ...rawOrder,
        lines: poLines.filter((l) => l.purchaseOrderId === rawOrder.id),
      }
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
      !order?.lines.some((l: any) => l.id === line.orderLineId)
    )
      throw new Error(serverMessages.procurementLinesRequired);
    const description =
      line.description.trim().slice(0, 300) ||
      order?.lines.find((l: any) => l.id === line.orderLineId)?.description ||
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
    allBills.some(
      (b) =>
        b.supplierId === input.supplierId &&
        b.supplierRef === supplierRef &&
        b.id !== (input.id ?? "") &&
        b.status !== "cancelled",
    )
  )
    throw new Error(serverMessages.procurementBillDuplicate);
  const attachmentUrl = input.attachmentUrl.trim();
  const data = {
    supplierId: input.supplierId,
    purchaseOrderId: input.purchaseOrderId || null,
    supplierRef,
    billDate: billDate.toISOString(),
    dueDate: dueDate ? dueDate.toISOString() : null,
    subtotal,
    vatAmount,
    total: round3(subtotal + vatAmount),
    note: input.note.trim().slice(0, 1000) || null,
    attachmentUrl: attachmentUrl.startsWith("/api/files/")
      ? attachmentUrl
      : null,
  };
  return runAtomicMutation(async () => {
    if (input.id) {
      const current = allBills.find((b) => b.id === input.id);
      if (current?.status !== "draft")
        throw new Error(serverMessages.procurementNotEditable);
      await Promise.all(
        allBillLines
          .filter((l) => l.billId === input.id)
          .map((l) => deleteTableRow("finance", "supplier_bill_line", l.id)),
      );
      const updated = await upsertTableRow("finance", "supplier_bill", {
        ...current,
        ...data,
      });
      await Promise.all(
        lines.map((l) =>
          upsertTableRow("finance", "supplier_bill_line", {
            id: crypto.randomUUID(),
            billId: input.id,
            ...l,
          }),
        ),
      );
      return updated;
    }
    const number = await getNextSequenceNumber("BILL");
    const billId = crypto.randomUUID();
    const created = await upsertTableRow("finance", "supplier_bill", {
      id: billId,
      ...data,
      number,
      status: "draft",
      amountPaid: 0,
      createdById: userId,
    });
    await Promise.all(
      lines.map((l) =>
        upsertTableRow("finance", "supplier_bill_line", {
          id: crypto.randomUUID(),
          billId,
          ...l,
        }),
      ),
    );
    return created;
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
  const [
    bills,
    contacts,
    orders,
    allBillLines,
    allPoLines,
    allPayments,
    allUsers,
  ] = await Promise.all([
    listTableRows<any>("finance", "supplier_bill"),
    listTableRows<any>("sales", "crm_contact"),
    listTableRows<any>("inventory", "purchase_order"),
    listTableRows<any>("finance", "supplier_bill_line"),
    listTableRows<any>("inventory", "purchase_order_line"),
    listTableRows<any>("finance", "supplier_payment"),
    listTableRows<any>("identity", "user"),
  ]);
  const rawBill = bills.find((b) => b.id === id);
  if (!rawBill) return null;
  const supplier = contacts.find((c) => c.id === rawBill.supplierId) ?? {};
  const purchaseOrder = rawBill.purchaseOrderId
    ? orders.find((o) => o.id === rawBill.purchaseOrderId) ?? null
    : null;
  const poLineMap = new Map<string, any>(allPoLines.map((l) => [l.id, l]));
  const billLines = allBillLines
    .filter((l) => l.billId === id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
    .map((l) => ({
      ...l,
      orderLine: l.orderLineId ? poLineMap.get(l.orderLineId) ?? null : null,
    }));
  const payments = allPayments
    .filter((p) => p.billId === id)
    .sort((a, b) => String(a.paidOn ?? "").localeCompare(String(b.paidOn ?? "")));
  const bill = {
    ...rawBill,
    supplier,
    purchaseOrder: purchaseOrder
      ? { id: purchaseOrder.id, number: purchaseOrder.number }
      : null,
    lines: billLines,
    payments,
  };
  const counted = bill.status !== "draft" && bill.status !== "cancelled";
  const lines: BillLineMatch[] = bill.lines.map((l: any) => {
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
  const peopleIds = [bill.createdById, bill.approvedById].filter(
    (v): v is string => !!v,
  );
  const people = allUsers.filter((u) => peopleIds.includes(u.id));
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
  const categories = await listTableRows<any>("finance", "expense_category");
  const existing = categories.find((c) => c.slug === "purchases");
  if (existing) return existing;
  return upsertTableRow("finance", "expense_category", {
    id: crypto.randomUUID(),
    slug: "purchases",
    nameEn: en.expenseCategory,
    nameAr: ar.expenseCategory,
    kind: "cost_of_sales",
    isSystem: true,
    color: "#0F766E",
    displayOrder: 50,
    isActive: true,
  });
}

export async function approveSupplierBill(
  id: string,
  userId: string,
  overrideReason?: string,
) {
  await getAccountingCurrency();
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
  return runAtomicMutation(async () => {
    const [bills, poLines] = await Promise.all([
      listTableRows<any>("finance", "supplier_bill"),
      listTableRows<any>("inventory", "purchase_order_line"),
    ]);
    const current = bills.find((b) => b.id === id);
    if (current?.status !== "draft")
      throw new Error(serverMessages.procurementNotEditable);
    for (const line of bill.lines)
      if (line.order_line_id) {
        const poLine = poLines.find((l) => l.id === line.order_line_id);
        if (poLine) {
          await upsertTableRow("inventory", "purchase_order_line", {
            ...poLine,
            billedQuantity: round3(num(poLine.billedQuantity) + line.quantity),
          });
        }
      }
    const expense = await upsertTableRow<any>("finance", "expense", {
      id: crypto.randomUUID(),
      categoryId: category.id,
      descriptionEn: `${en.expenseDescription} ${bill.number}${bill.supplier_ref ? ` (${bill.supplier_ref})` : ""}`,
      descriptionAr: `${ar.expenseDescription} ${bill.number}${bill.supplier_ref ? ` (${bill.supplier_ref})` : ""}`,
      amount: bill.total,
      netAmount: bill.subtotal,
      inputVatAmount: bill.vat_amount,
      taxInvoiceNumber: bill.supplier_ref || null,
      currency: await assertCompanyCurrency(),
      expenseDate: `${bill.bill_date}T00:00:00.000Z`,
      vendorName: bill.supplier.name,
      receiptUrl: bill.attachment_url,
      status: "approved",
      createdById: userId,
    });
    return upsertTableRow("finance", "supplier_bill", {
      ...current,
      status: "approved",
      approvedById: userId,
      approvedAt: new Date().toISOString(),
      overrideReason: bill.matched ? null : reason,
      expenseId: expense.id,
    });
  });
}

export async function cancelSupplierBill(id: string) {
  const bills = await listTableRows<any>("finance", "supplier_bill");
  const current = bills.find((b) => b.id === id && b.status === "draft");
  if (!current) throw new Error(serverMessages.procurementNotEditable);
  await upsertTableRow("finance", "supplier_bill", {
    ...current,
    status: "cancelled",
  });
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
  return runAtomicMutation(async () => {
    const bills = await listTableRows<any>("finance", "supplier_bill");
    const bill = bills.find((b) => b.id === billId);
    if (!bill) throw new Error(serverMessages.procurementDocumentMissing);
    if (!["approved", "partially_paid"].includes(bill.status))
      throw new Error(serverMessages.procurementNeedsApproval);
    if (num(bill.amountPaid) + amount > num(bill.total) + 0.0005)
      throw new Error(serverMessages.procurementOverpaid);
    await upsertTableRow("finance", "supplier_payment", {
      id: crypto.randomUUID(),
      billId,
      amount,
      paidOn: (day(input.paidOn) ?? new Date()).toISOString(),
      method: input.method,
      reference: input.reference.trim().slice(0, 100) || null,
      createdById: userId,
    });
    const next = billAfterPayment(
      num(bill.total),
      num(bill.amountPaid) + amount,
    );
    return upsertTableRow("finance", "supplier_bill", { ...bill, ...next });
  });
}

export async function listSupplierBills(
  filter: { status?: string; supplierId?: string } = {},
) {
  const [allBills, contacts] = await Promise.all([
    listTableRows<any>("finance", "supplier_bill"),
    listTableRows<any>("sales", "crm_contact"),
  ]);
  const contactMap = new Map<string, any>(contacts.map((c) => [c.id, c]));
  const rows = allBills
    .filter((b) => {
      if (filter.status && b.status !== filter.status) return false;
      if (filter.supplierId && b.supplierId !== filter.supplierId) return false;
      return true;
    })
    .sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
    )
    .slice(0, 300)
    .map((b) => ({ ...b, supplier: contactMap.get(b.supplierId) ?? {} }));
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
  const [allOrders, allReceipts, allPoLines, allBills] = await Promise.all([
    listTableRows<any>("inventory", "purchase_order"),
    listTableRows<any>("inventory", "goods_receipt"),
    listTableRows<any>("inventory", "purchase_order_line"),
    listTableRows<any>("finance", "supplier_bill"),
  ]);
  const orders = allOrders
    .filter((o) => !["draft", "cancelled"].includes(o.status))
    .map((o) => ({
      supplierId: o.supplierId,
      orderDate: new Date(o.orderDate),
      expectedDate: o.expectedDate ? new Date(o.expectedDate) : null,
      receipts: allReceipts
        .filter((r) => r.purchaseOrderId === o.id)
        .map((r) => ({ receivedAt: new Date(r.receivedAt) }))
        .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
        .slice(0, 1),
      lines: allPoLines.filter((l) => l.purchaseOrderId === o.id),
    }));
  const billTotalsBySupplier = new Map<
    string,
    { total: number; amountPaid: number }
  >();
  for (const b of allBills) {
    if (!["approved", "partially_paid", "paid"].includes(b.status)) continue;
    const entry = billTotalsBySupplier.get(b.supplierId) ?? {
      total: 0,
      amountPaid: 0,
    };
    entry.total += num(b.total);
    entry.amountPaid += num(b.amountPaid);
    billTotalsBySupplier.set(b.supplierId, entry);
  }
  const bills = Array.from(billTotalsBySupplier.entries()).map(
    ([supplierId, sums]) => ({
      supplierId,
      _sum: sums,
    }),
  );
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
  const [allLines, allOrders, allContacts] = await Promise.all([
    listTableRows<any>("inventory", "purchase_order_line"),
    listTableRows<any>("inventory", "purchase_order"),
    listTableRows<any>("sales", "crm_contact"),
  ]);
  const orderMap = new Map<string, any>(allOrders.map((o) => [o.id, o]));
  const contactMap = new Map<string, any>(allContacts.map((c) => [c.id, c]));
  const lines = allLines
    .filter((l) => l.productId === productId)
    .map((l) => {
      const po = orderMap.get(l.purchaseOrderId);
      if (!po || ["draft", "cancelled"].includes(po.status)) return null;
      return {
        ...l,
        purchaseOrder: {
          ...po,
          supplier: contactMap.get(po.supplierId) ?? {},
        },
      };
    })
    .filter((l): l is any => l !== null)
    .sort((a, b) =>
      String(b.purchaseOrder.orderDate ?? "").localeCompare(
        String(a.purchaseOrder.orderDate ?? ""),
      ),
    )
    .slice(0, limit);
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
  const [bills, expenses] = await Promise.all([
    listTableRows<any>("finance", "supplier_bill"),
    listTableRows<any>("finance", "expense"),
  ]);
  const bill = bills.find((b) => b.id === id);
  if (!bill || bill.status === "cancelled")
    throw new Error(serverMessages.procurementDocumentMissing);
  await upsertTableRow("finance", "supplier_bill", {
    ...bill,
    attachmentUrl: fileUrl,
  });
  if (bill.expenseId) {
    const exp = expenses.find((e) => e.id === bill.expenseId);
    if (exp) {
      await upsertTableRow("finance", "expense", {
        ...exp,
        receiptUrl: fileUrl,
      });
    }
  }
}
