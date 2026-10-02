import { db, type PermissionAction, type PermissionResource } from "@ishoot/database";
import { requirePermission } from "./auth";

const resources: Record<string, PermissionResource> = {
  payment: "payments", invoice: "invoices", contact: "contacts",
  customer_vault: "contacts", deal: "deals", company_setting: "settings",
  company_asset: "settings", company_document: "settings", general: "settings",
};

export async function requireAttachmentAccess(entityType: string, entityId: string, action: PermissionAction) {
  const resource = resources[entityType];
  if (!resource) throw new Error("Unsupported attachment type");
  const user = await requirePermission(resource, action);
  if (entityId && entityId !== "pending" && entityId !== "company_setting") {
    const exists = entityType === "payment" ? await db.payment.findUnique({ where: { id: entityId }, select: { id: true } })
      : entityType === "invoice" ? await db.invoice.findUnique({ where: { id: entityId }, select: { id: true } })
      : entityType === "contact" || entityType === "customer_vault" ? await db.crmContact.findUnique({ where: { id: entityId }, select: { id: true } })
      : entityType === "deal" ? await db.crmDeal.findUnique({ where: { id: entityId }, select: { id: true } })
      : true;
    if (!exists) throw new Error("Attachment target not found");
  }
  return user;
}
