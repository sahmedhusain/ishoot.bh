import { assertRecordInScope } from "./data-scope";
import { serverMessages } from "@platform/locales";
import {
  type PermissionAction,
  type PermissionResource,
} from "@platform/database";
import { listTableRows, type ServiceSchema } from "./api/tables";
import { getCurrentUser, requirePermission } from "./auth";
import { requireShipmentAccess } from "./delivery-scope";

const resources: Record<string, PermissionResource> = {
  employee: "employees",
  user_signature: "users",
  expense: "expenses",
  payment: "payments",
  invoice: "invoices",
  quotation: "quotations",
  contact: "contacts",
  customer_vault: "contacts",
  deal: "deals",
  company_setting: "settings",
  company_asset: "settings",
  company_font: "settings",
  company_document: "settings",
  general: "settings",
  supplier_bill: "procurement",
  sales_order: "orders",
};

const CMS_ASSET_RESOURCES = [
  "banners",
  "portfolio",
  "clients",
  "equipment",
  "reviews",
  "settings",
  "pages",
  "articles",
  "products",
] as const;

export async function requireAttachmentAccess(
  entityType: string,
  entityId: string,
  action: PermissionAction,
) {
  if (entityType === "inquiry") {
    const user = await requirePermission("requests", action);
    const inquiries = await listTableRows<Record<string, any>>("sales", "inquiry");
    const inquiry = inquiries.find((i) => i.id === entityId);
    if (!inquiry) throw new Error(serverMessages.attachmentTargetNotFound);
    await assertRecordInScope("requests", inquiry.assignedToId);
    return user;
  }
  if (entityType === "employee" && (!entityId || entityId === "pending"))
    throw new Error(serverMessages.createTheEmployeeBeforeAttachingDocuments);
  if (
    entityType === "user_signature" &&
    (entityId === "pending" || !entityId)
  ) {
    const user = await getCurrentUser();
    if (!user) throw new Error(serverMessages.unauthorized);
    if (action === "read") return requirePermission("users", "read");
    return user;
  }
  if (entityType === "user_avatar" && (entityId === "pending" || !entityId)) {
    const user = await getCurrentUser();
    if (!user) throw new Error(serverMessages.unauthorized);
    return user;
  }
  if (entityType === "user_signature" && action === "read") {
    const user = await getCurrentUser();
    if (user && user.id === entityId) return user;
  }
  if (entityType === "expense_claim") {
    if (action !== "read") return requirePermission("self_service", "create");
    const user = await getCurrentUser();
    if (!user) throw new Error(serverMessages.unauthorized);
    const claim =
      entityId && entityId !== "pending"
        ? (await listTableRows<Record<string, any>>("finance", "expense_claim")).find(
            (c) => c.id === entityId,
          )
        : null;
    if (claim?.claimantId === user.id) return user;
    return requirePermission("expenses", "read");
  }
  if (entityType === "it_ticket") {
    if (action === "read" || (entityId && entityId !== "pending"))
      throw new Error(serverMessages.unsupportedAttachmentType);
    return requirePermission("it_support", "create");
  }
  if (entityType === "shipment") {
    return (
      await requireShipmentAccess(entityId, action === "read" ? "read" : "edit")
    ).user;
  }
  if (entityType === "cms_asset" || entityType === "cms_document") {
    const resource = CMS_ASSET_RESOURCES.find((r) => r === entityId);
    if (!resource) throw new Error(serverMessages.unsupportedAttachmentType);
    return requirePermission(resource, action);
  }
  const resource = resources[entityType];
  if (!resource) throw new Error(serverMessages.unsupportedAttachmentType);
  const user = await requirePermission(resource, action);
  if (entityId && entityId !== "pending" && entityId !== "company_setting") {
    const targetMap: Record<string, [ServiceSchema, string]> = {
      employee: ["hr", "employee"],
      user_signature: ["identity", "user"],
      expense: ["finance", "expense"],
      payment: ["finance", "payment"],
      invoice: ["finance", "invoice"],
      quotation: ["sales", "quotation"],
      sales_order: ["commerce", "sales_order"],
      supplier_bill: ["finance", "supplier_bill"],
      contact: ["sales", "crm_contact"],
      customer_vault: ["sales", "crm_contact"],
      deal: ["sales", "crm_deal"],
    };
    const target = targetMap[entityType];
    const exists = target
      ? (await listTableRows<Record<string, any>>(target[0], target[1])).some(
          (r) => r.id === entityId,
        )
      : true;
    if (!exists) throw new Error(serverMessages.attachmentTargetNotFound);
  }
  return user;
}
