import { assertRecordInScope } from "./data-scope";
import { serverMessages } from "@platform/locales";
import {
  db,
  type PermissionAction,
  type PermissionResource,
} from "@platform/database";
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
    const inquiry = await db.inquiry.findUnique({ where: { id: entityId }, select: { assignedToId: true } });
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
        ? await db.expenseClaim.findUnique({
            where: { id: entityId },
            select: { claimantId: true },
          })
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
    const exists =
      entityType === "employee"
        ? await db.employee.findUnique({
            where: { id: entityId },
            select: { id: true },
          })
        : entityType === "user_signature"
          ? await db.user.findUnique({
              where: { id: entityId },
              select: { id: true },
            })
          : entityType === "expense"
            ? await db.expense.findUnique({
                where: { id: entityId },
                select: { id: true },
              })
            : entityType === "payment"
              ? await db.payment.findUnique({
                  where: { id: entityId },
                  select: { id: true },
                })
              : entityType === "invoice"
                ? await db.invoice.findUnique({
                    where: { id: entityId },
                    select: { id: true },
                  })
                : entityType === "quotation"
                  ? await db.quotation.findUnique({
                      where: { id: entityId },
                      select: { id: true },
                    })
                  : entityType === "sales_order"
                    ? await db.salesOrder.findUnique({
                        where: { id: entityId },
                        select: { id: true },
                      })
                    : entityType === "supplier_bill"
                      ? await db.supplierBill.findUnique({
                          where: { id: entityId },
                          select: { id: true },
                        })
                      : entityType === "contact" ||
                          entityType === "customer_vault"
                        ? await db.crmContact.findUnique({
                            where: { id: entityId },
                            select: { id: true },
                          })
                        : entityType === "deal"
                          ? await db.crmDeal.findUnique({
                              where: { id: entityId },
                              select: { id: true },
                            })
                          : true;
    if (!exists) throw new Error(serverMessages.attachmentTargetNotFound);
  }
  return user;
}
