"use server";
import { revalidatePath } from "next/cache";
import { formatMessage, getTranslations, serverMessages } from "@platform/locales";
import {
  awardRfq,
  cancelPurchaseOrder,
  cancelRequisition,
  cancelRfq,
  createActivityLog,
  createRfq,
  db,
  getCompanySettings,
  getPurchaseOrder,
  markPurchaseOrderSent,
  measureOperation,
  requireFeatureEnabled,
  savePurchaseOrder,
  saveRequisition,
  saveRfqQuotes,
  saveSupplier,
  submitPurchaseOrder,
  submitRequisition,
  type PurchaseOrderInput,
  type RequisitionInput,
  type RfqInput,
  type SupplierInput,
  approveSupplierBill,
  cancelSupplierBill,
  receiveGoods,
  recordSupplierPayment,
  saveSupplierBill,
  type GoodsReceiptInput,
  type SupplierBillInput,
  type SupplierPaymentInput,
} from "@platform/database";
import { notifyLowStock } from "../../lib/low-stock";
import { ROUTES } from "../../constants/routes";
import { hasPermission, requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { generatePurchaseOrderPdf } from "../../lib/pdf/purchase-order-pdf";

const log = (userId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) => createActivityLog({ user_id: userId, action, entity_type: entityType, entity_id: entityId, details });

export async function saveSupplierAction(input: SupplierInput) {
  return measureOperation("action:saveSupplierAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", input.id ? "edit" : "create");
    validateActionArguments("saveSupplierAction", { input });
    const supplier = await saveSupplier(input);
    await log(user.id, input.id ? "update" : "create", "supplier", supplier.id);
    revalidatePath(ROUTES.procurement.suppliers);
    return { success: true, id: supplier.id };
  });
}

/** Anyone who may ask to buy can work on their own requisitions; others need edit access. */
async function requireRequisitionAccess(id: string | undefined, userId: string) {
  if (!id) return;
  const requisition = await db.purchaseRequisition.findUnique({ where: { id }, select: { requestedById: true } });
  if (!requisition) throw new Error(serverMessages.procurementDocumentMissing);
  if (requisition.requestedById !== userId && !(await hasPermission("procurement", "edit"))) throw new Error(serverMessages.runtimeForbidden);
}

export async function saveRequisitionAction(input: RequisitionInput) {
  return measureOperation("action:saveRequisitionAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "create");
    validateActionArguments("saveRequisitionAction", { input });
    await requireRequisitionAccess(input.id, user.id);
    const requisition = await saveRequisition(input, user.id);
    await log(user.id, input.id ? "update" : "create", "purchase_requisition", requisition.id, { number: requisition.number });
    revalidatePath(ROUTES.procurement.requisitions);
    return { success: true, id: requisition.id };
  });
}

export async function submitRequisitionAction(id: string) {
  return measureOperation("action:submitRequisitionAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "create");
    validateActionArguments("submitRequisitionAction", { id });
    await requireRequisitionAccess(id, user.id);
    const outcome = await submitRequisition(id, user.id);
    await log(user.id, "submit", "purchase_requisition", id, { status: outcome.status });
    revalidatePath(ROUTES.procurement.requisitions);
    revalidatePath(ROUTES.procurement.requisition(id));
    return { success: true, status: outcome.status };
  });
}

export async function cancelRequisitionAction(id: string) {
  return measureOperation("action:cancelRequisitionAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "create");
    validateActionArguments("cancelRequisitionAction", { id });
    await requireRequisitionAccess(id, user.id);
    await cancelRequisition(id);
    await log(user.id, "cancel", "purchase_requisition", id);
    revalidatePath(ROUTES.procurement.requisitions);
    revalidatePath(ROUTES.procurement.requisition(id));
    return { success: true };
  });
}

export async function createRfqAction(input: RfqInput) {
  return measureOperation("action:createRfqAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("createRfqAction", { input });
    const rfq = await createRfq(input, user.id);
    await log(user.id, "create", "rfq", rfq.id, { number: rfq.number });
    revalidatePath(ROUTES.procurement.rfqs);
    if (input.requisitionId) revalidatePath(ROUTES.procurement.requisition(input.requisitionId));
    return { success: true, id: rfq.id };
  });
}

export async function saveRfqQuotesAction(rfqId: string, supplierId: string, quotes: { lineId: string; unitPrice: string; leadTimeDays: string }[]) {
  return measureOperation("action:saveRfqQuotesAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("saveRfqQuotesAction", { rfqId, supplierId, quotes });
    await saveRfqQuotes(rfqId, supplierId, quotes);
    await log(user.id, "update", "rfq", rfqId, { supplierId });
    revalidatePath(ROUTES.procurement.rfq(rfqId));
    return { success: true };
  });
}

export async function awardRfqAction(rfqId: string, quoteIds: string[]) {
  return measureOperation("action:awardRfqAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "create");
    validateActionArguments("awardRfqAction", { rfqId, quoteIds });
    const orders = await awardRfq(rfqId, quoteIds, user.id);
    await log(user.id, "award", "rfq", rfqId, { orders });
    revalidatePath(ROUTES.procurement.rfq(rfqId));
    revalidatePath(ROUTES.procurement.orders);
    return { success: true, orders };
  });
}

export async function cancelRfqAction(id: string) {
  return measureOperation("action:cancelRfqAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("cancelRfqAction", { id });
    await cancelRfq(id);
    await log(user.id, "cancel", "rfq", id);
    revalidatePath(ROUTES.procurement.rfq(id));
    return { success: true };
  });
}

export async function savePurchaseOrderAction(input: PurchaseOrderInput) {
  return measureOperation("action:savePurchaseOrderAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", input.id ? "edit" : "create");
    validateActionArguments("savePurchaseOrderAction", { input });
    const order = await savePurchaseOrder(input, user.id);
    await log(user.id, input.id ? "update" : "create", "purchase_order", order.id, { number: order.number });
    revalidatePath(ROUTES.procurement.orders);
    revalidatePath(ROUTES.procurement.order(order.id));
    if (input.requisitionId) revalidatePath(ROUTES.procurement.requisition(input.requisitionId));
    return { success: true, id: order.id };
  });
}

export async function submitPurchaseOrderAction(id: string) {
  return measureOperation("action:submitPurchaseOrderAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("submitPurchaseOrderAction", { id });
    const outcome = await submitPurchaseOrder(id, user.id);
    await log(user.id, "submit", "purchase_order", id, { status: outcome.status });
    revalidatePath(ROUTES.procurement.orders);
    revalidatePath(ROUTES.procurement.order(id));
    return { success: true, status: outcome.status };
  });
}

/** Emails the approved order to the supplier with its PDF (through the email outbox) and marks it sent. */
export async function emailPurchaseOrderAction(id: string) {
  return measureOperation("action:emailPurchaseOrderAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "export");
    validateActionArguments("emailPurchaseOrderAction", { id });
    const [order, company] = await Promise.all([getPurchaseOrder(id), getCompanySettings()]);
    if (!order) throw new Error(serverMessages.procurementDocumentMissing);
    if (!["approved", "sent", "partially_received"].includes(order.status)) throw new Error(serverMessages.procurementNeedsApproval);
    const recipient = order.supplier.email;
    if (!recipient) throw new Error(serverMessages.procurementSupplierEmailMissing);
    const locale = company.primary_language === "ar" ? "ar" : "en";
    const attachment = await generatePurchaseOrderPdf(order, company, locale);
    const copy = getTranslations(locale).admin.procurement.pdf;
    const escape = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
    const companyName = locale === "ar" ? company.company_name_ar : company.company_name_en;
    await db.emailJob.upsert({
      where: { eventKey: `purchase_order:${id}:${order.total}:${order.lines.length}` },
      update: {},
      create: {
        eventKey: `purchase_order:${id}:${order.total}:${order.lines.length}`,
        createdById: user.id,
        recipient,
        subject: `${copy.title} ${order.number} · ${companyName}`.slice(0, 200),
        html: `<p>${escape(formatMessage(copy.emailBody, { number: order.number }))}</p><p>${escape(companyName)}</p>`,
        attachmentName: `PurchaseOrder-${order.number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`,
        attachment,
      },
    });
    await markPurchaseOrderSent(id, "email");
    await log(user.id, "queue_email", "purchase_order", id, { recipient });
    revalidatePath(ROUTES.procurement.order(id));
    return { success: true, recipient };
  });
}

export async function markPurchaseOrderSentAction(id: string, via: "whatsapp" | "printed") {
  return measureOperation("action:markPurchaseOrderSentAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("markPurchaseOrderSentAction", { id, via });
    if (via !== "whatsapp" && via !== "printed") throw new Error(serverMessages.procurementNotEditable);
    await markPurchaseOrderSent(id, via);
    await log(user.id, "send", "purchase_order", id, { via });
    revalidatePath(ROUTES.procurement.order(id));
    return { success: true };
  });
}

export async function cancelPurchaseOrderAction(id: string) {
  return measureOperation("action:cancelPurchaseOrderAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("cancelPurchaseOrderAction", { id });
    await cancelPurchaseOrder(id);
    await log(user.id, "cancel", "purchase_order", id);
    revalidatePath(ROUTES.procurement.orders);
    revalidatePath(ROUTES.procurement.order(id));
    return { success: true };
  });
}

/** Records goods arriving against an order; accepted items enter stock at the ordered price. */
export async function receiveGoodsAction(orderId: string, input: GoodsReceiptInput) {
  return measureOperation("action:receiveGoodsAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "create");
    validateActionArguments("receiveGoodsAction", { orderId, input });
    const { receipt, low } = await receiveGoods(orderId, input, user.id);
    await log(user.id, "receive", "purchase_order", orderId, { receipt: receipt.number });
    await notifyLowStock(low);
    revalidatePath(ROUTES.procurement.order(orderId));
    revalidatePath(ROUTES.procurement.orders);
    revalidatePath(ROUTES.inventory.stock);
    return { success: true, number: receipt.number };
  });
}

export async function saveSupplierBillAction(input: SupplierBillInput) {
  return measureOperation("action:saveSupplierBillAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", input.id ? "edit" : "create");
    validateActionArguments("saveSupplierBillAction", { input });
    const bill = await saveSupplierBill(input, user.id);
    await log(user.id, input.id ? "update" : "create", "supplier_bill", bill.id, { number: bill.number });
    revalidatePath(ROUTES.procurement.bills);
    revalidatePath(ROUTES.procurement.bill(bill.id));
    return { success: true, id: bill.id };
  });
}

/** Approves a bill into an expense; differences from the three-way match need a reason. */
export async function approveSupplierBillAction(id: string, overrideReason: string) {
  return measureOperation("action:approveSupplierBillAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "approve");
    validateActionArguments("approveSupplierBillAction", { id, overrideReason });
    const bill = await approveSupplierBill(id, user.id, overrideReason);
    await log(user.id, "approve", "supplier_bill", id, { overridden: !!bill.overrideReason });
    revalidatePath(ROUTES.procurement.bills);
    revalidatePath(ROUTES.procurement.bill(id));
    if (bill.purchaseOrderId) revalidatePath(ROUTES.procurement.order(bill.purchaseOrderId));
    revalidatePath(ROUTES.expenses.list());
    return { success: true };
  });
}

export async function cancelSupplierBillAction(id: string) {
  return measureOperation("action:cancelSupplierBillAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("cancelSupplierBillAction", { id });
    await cancelSupplierBill(id);
    await log(user.id, "cancel", "supplier_bill", id);
    revalidatePath(ROUTES.procurement.bill(id));
    return { success: true };
  });
}

export async function recordSupplierPaymentAction(billId: string, input: SupplierPaymentInput) {
  return measureOperation("action:recordSupplierPaymentAction", async () => {
    await requireFeatureEnabled("procurement");
    const user = await requirePermission("procurement", "edit");
    validateActionArguments("recordSupplierPaymentAction", { billId, input });
    const bill = await recordSupplierPayment(billId, input, user.id);
    await log(user.id, "pay", "supplier_bill", billId, { amount: input.amount, method: input.method });
    revalidatePath(ROUTES.procurement.bill(billId));
    revalidatePath(ROUTES.procurement.bills);
    return { success: true, status: bill.status };
  });
}
