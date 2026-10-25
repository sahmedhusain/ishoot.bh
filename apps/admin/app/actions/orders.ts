"use server";
import { revalidatePath } from "next/cache";
import { serverMessages } from "@platform/locales";
import {
  addOrderNote,
  createActivityLog,
  issueOrderInvoice,
  measureOperation,
  moveOrder,
  placeOrder,
  recordOrderPayment,
  refundOrder,
  requireFeatureEnabled,
  saveCoupon,
  saveStoreSettings,
  type CouponInput,
  type OrderAddress,
  type StoreSettingsInput,
} from "@platform/database";
import { ORDER_CHANNELS, type OrderStatus } from "@platform/database/constants/store";
import { ROUTES } from "../../constants/routes";
import { requirePermission } from "../../lib/auth";
import { validateActionArguments } from "../../lib/action-input";
import { notifyLowStock } from "../../lib/low-stock";

const refresh = (id?: string) => {
  revalidatePath(ROUTES.orders.list);
  if (id) revalidatePath(ROUTES.orders.detail(id));
};

/** Moves an order on (packing, shipped, delivered…), with the stock that goes with it. */
export async function moveOrderAction(id: string, status: string, note: string) {
  return measureOperation("action:moveOrderAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "edit");
    validateActionArguments("moveOrderAction", { id, status, note });
    const low = await moveOrder(id, status as OrderStatus, user.id, note);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "sales_order", entity_id: id, details: { status } });
    await notifyLowStock(low);
    refresh(id);
    revalidatePath(ROUTES.inventory.stock);
    return { success: true };
  });
}

export async function recordOrderPaymentAction(id: string, input: { amount: string; method: string; reference: string }) {
  return measureOperation("action:recordOrderPaymentAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "edit");
    validateActionArguments("recordOrderPaymentAction", { id, input });
    if (!["cash", "card", "bank_transfer"].includes(input.method)) throw new Error(serverMessages.storePaymentMethodInvalid);
    await recordOrderPayment(id, { amount: Number(input.amount), method: input.method as "cash" | "card" | "bank_transfer", reference: input.reference }, user.id);
    await createActivityLog({ user_id: user.id, action: "payment", entity_type: "sales_order", entity_id: id, details: { amount: input.amount, method: input.method } });
    refresh(id);
    return { success: true };
  });
}

export async function recordOrderRefundAction(id: string, amount: string, reason: string) {
  return measureOperation("action:recordOrderRefundAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "approve");
    validateActionArguments("recordOrderRefundAction", { id, amount, reason });
    await refundOrder(id, Number(amount), reason, user.id);
    await createActivityLog({ user_id: user.id, action: "refund", entity_type: "sales_order", entity_id: id, details: { amount } });
    refresh(id);
    return { success: true };
  });
}

export async function addOrderNoteAction(id: string, note: string) {
  return measureOperation("action:addOrderNoteAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "edit");
    validateActionArguments("addOrderNoteAction", { id, note });
    await addOrderNote(id, note, user.id);
    refresh(id);
    return { success: true };
  });
}

export async function issueOrderInvoiceAction(id: string) {
  return measureOperation("action:issueOrderInvoiceAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "edit");
    await requirePermission("invoices", "create");
    validateActionArguments("issueOrderInvoiceAction", { id });
    const invoiceId = await issueOrderInvoice(id, user.id);
    await createActivityLog({ user_id: user.id, action: "create", entity_type: "invoice", entity_id: invoiceId, details: { orderId: id } });
    refresh(id);
    return { success: true, invoiceId };
  });
}

export interface StaffOrderInput {
  channel: string;
  contactId?: string;
  name: string;
  email: string;
  phone: string;
  lines: { productId: string; variantId?: string; quantity: string }[];
  couponCode: string;
  fulfilment: string;
  address?: OrderAddress | null;
  /** Paid at the counter now: cash or card. Empty to take payment later. */
  paidWith: string;
  note: string;
}

/** An order taken by phone, WhatsApp or at the counter; counter sales paid now are handed over at once. */
export async function createStaffOrderAction(input: StaffOrderInput) {
  return measureOperation("action:createStaffOrderAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "create");
    validateActionArguments("createStaffOrderAction", { input });
    if (!(ORDER_CHANNELS as readonly string[]).includes(input.channel) || input.channel === "website") throw new Error(serverMessages.orderStatusInvalid);
    const paidNow = input.paidWith === "cash" || input.paidWith === "card";
    const order = await placeOrder({
      lines: input.lines.map((l) => ({ productId: l.productId, variantId: l.variantId || undefined, quantity: Number(l.quantity) })),
      couponCode: input.couponCode,
      fulfilment: input.fulfilment === "delivery" ? "delivery" : "pickup",
      address: input.fulfilment === "delivery" ? input.address ?? null : null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      paymentMethod: paidNow ? input.paidWith : "pay_later",
      note: input.note,
      locale: "ar",
      channel: input.channel as "phone" | "whatsapp" | "pos",
      contactId: input.contactId || null,
      createdById: user.id,
    });
    if (paidNow) {
      await recordOrderPayment(order.id, { amount: Number(order.total), method: input.paidWith as "cash" | "card" }, user.id);
      // A counter sale leaves with the customer.
      if (input.channel === "pos") {
        await notifyLowStock(await moveOrder(order.id, "packing", user.id));
        await notifyLowStock(await moveOrder(order.id, "shipped", user.id));
        await moveOrder(order.id, "delivered", user.id);
      }
    }
    await createActivityLog({ user_id: user.id, action: "create", entity_type: "sales_order", entity_id: order.id, details: { channel: input.channel, number: order.number } });
    refresh();
    return { success: true, id: order.id, number: order.number };
  });
}

export async function saveStoreSettingsAction(input: StoreSettingsInput) {
  return measureOperation("action:saveStoreSettingsAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("settings", "edit");
    validateActionArguments("saveStoreSettingsAction", { input });
    await saveStoreSettings(input);
    await createActivityLog({ user_id: user.id, action: "update", entity_type: "settings", entity_id: "store", details: {} });
    revalidatePath(ROUTES.orders.settings);
    return { success: true };
  });
}

export async function saveCouponAction(input: CouponInput) {
  return measureOperation("action:saveCouponAction", async () => {
    await requireFeatureEnabled("store");
    const user = await requirePermission("orders", "approve");
    validateActionArguments("saveCouponAction", { input });
    const coupon = await saveCoupon(input);
    await createActivityLog({ user_id: user.id, action: input.id ? "update" : "create", entity_type: "coupon", entity_id: coupon.id, details: { code: coupon.code } });
    revalidatePath(ROUTES.orders.settings);
    return { success: true };
  });
}
