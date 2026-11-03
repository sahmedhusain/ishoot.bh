import { formatMessage, getTranslations } from "@platform/locales";
import { createNotification, getAllUsers, getProduct } from "@platform/database";

/** Tells everyone who can see stock that items fell to their reorder point (once per dip). */
export async function notifyLowStock(low: any) {
  if (!low || !Array.isArray(low) || !low.length) return;
  const users = await getAllUsers().catch(() => []);
  const recipients = users.filter((u: any) => u.is_active);
  const en = getTranslations("en").admin.inventory.notifications.lowStock;
  for (const item of low) {
    if (!item?.productId) continue;
    const product = await getProduct(item.productId).catch(() => null);
    if (!product) continue;
    const params = {
      nameEn: product.name_en || "",
      nameAr: product.name_ar || "",
      sku: product.sku || "",
      available: String(item.available ?? 0),
      point: String(item.reorderPoint ?? 0),
    };
    for (const user of recipients)
      await createNotification({
        user_id: user.id,
        title: formatMessage(en.title, { name: params.nameEn }),
        message: formatMessage(en.message, params),
        message_key: "inventory.notifications.lowStock",
        message_params: params,
        type: "warning",
        entity_type: "product",
        entity_id: item.productId,
      });
  }
}
