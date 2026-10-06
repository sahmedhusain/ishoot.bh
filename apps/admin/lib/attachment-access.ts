import {
  db,
  type PermissionAction,
  type PermissionResource,
} from "@ishoot/database";
import { getCurrentUser, requirePermission } from "./auth";

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
  company_document: "settings",
  general: "settings",
};

/** Public website media (client logos, banners, portfolio, gear photos): the entity id names the CMS resource. */
export const CMS_ASSET_RESOURCES = ["banners", "portfolio", "clients", "equipment", "reviews", "settings"] as const;

export async function requireAttachmentAccess(
  entityType: string,
  entityId: string,
  action: PermissionAction,
) {
  if (entityType === "employee" && (!entityId || entityId === "pending")) throw new Error("Create the employee before attaching documents");
  if (entityType === "user_signature" && (entityId === "pending" || !entityId)) {
    // Anyone may upload a drawn signature for themselves; it only applies after approval.
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    if (action === "read") return requirePermission("users", "read");
    return user;
  }
  if (entityType === "user_signature" && action === "read") {
    const user = await getCurrentUser();
    if (user && user.id === entityId) return user;
  }
  if (entityType === "expense_claim") {
    // Every staff member files claims; receipts are visible to the claimant and to finance.
    if (action !== "read") return requirePermission("self_service", "create");
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    const claim = entityId && entityId !== "pending" ? await db.expenseClaim.findUnique({ where: { id: entityId }, select: { claimantId: true } }) : null;
    if (claim?.claimantId === user.id) return user;
    return requirePermission("expenses", "read");
  }
  if (entityType === "cms_asset") {
    const resource = CMS_ASSET_RESOURCES.find((r) => r === entityId);
    if (!resource) throw new Error("Unsupported attachment type");
    return requirePermission(resource, action);
  }
  const resource = resources[entityType];
  if (!resource) throw new Error("Unsupported attachment type");
  const user = await requirePermission(resource, action);
  if (entityId && entityId !== "pending" && entityId !== "company_setting") {
    const exists =
      entityType === "employee"
        ? await db.employee.findUnique({ where: { id: entityId }, select: { id: true } })
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
              ? await db.quotation.findUnique({ where: { id: entityId }, select: { id: true } })
              : entityType === "contact" || entityType === "customer_vault"
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
    if (!exists) throw new Error("Attachment target not found");
  }
  return user;
}
