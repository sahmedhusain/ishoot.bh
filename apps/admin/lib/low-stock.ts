import { formatMessage, getTranslations } from "@platform/locales";
import { createNotification, db, hasPermission } from "@platform/database";

/** Tells everyone who can see stock that items fell to their reorder point (once per dip). */
export async function notifyLowStock(low: { productId: string; variantKey: string; available: number; reorderPoint: number }[]) {
  if (!low.length) return;
  const users = await db.user.findMany({ where: { isActive: true, archivedAt: null }, select: { id: true, role: true } });
  const roles = Array.from(new Set(users.map((u) => u.role)));
  const allowed = new Set((await Promise.all(roles.map(async (role) => ((await hasPermission(role, "inventory", "read")) ? role : null)))).filter(Boolean));
  const recipients = users.filter((u) => allowed.has(u.role));
  const en = getTranslations("en").admin.inventory.notifications.lowStock;
  for (const item of low) {
    const product = await db.product.findUnique({ where: { id: item.productId }, select: { sku: true, nameEn: true, nameAr: true, variants: { where: { id: item.variantKey || "-" }, select: { sku: true } } } });
    if (!product) continue;
    const params = { nameEn: product.nameEn, nameAr: product.nameAr, sku: product.variants[0]?.sku ?? product.sku, available: String(item.available), point: String(item.reorderPoint) };
    for (const user of recipients)
      await createNotification({
        user_id: user.id,
        title: formatMessage(en.title, { name: product.nameEn }),
        message: formatMessage(en.message, params),
        message_key: "inventory.notifications.lowStock",
        message_params: params,
        type: "warning",
        entity_type: "product",
        entity_id: item.productId,
      });
  }
}

