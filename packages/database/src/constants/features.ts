/** Optional modules a company can switch on or off (setup wizard, Settings → Modules). */
export const DEFAULT_FEATURE_MODULES = [
  { moduleKey: "crm_deals", nameEn: "Deals & Pipeline", nameAr: "الصفقات ومسارات البيع" },
  { moduleKey: "invoicing", nameEn: "Invoicing & Billing", nameAr: "الفواتير والتحصيل" },
  { moduleKey: "calendar", nameEn: "Production Calendar", nameAr: "جدول الإنتاج" },
  { moduleKey: "equipment", nameEn: "Equipment Inventory", nameAr: "مخزون المعدات" },
  { moduleKey: "cms", nameEn: "Website Content", nameAr: "إدارة محتوى الموقع" },
  { moduleKey: "reviews", nameEn: "Customer Reviews", nameAr: "تقييمات العملاء" },
  // Off until a company that sells goods switches it on (activities with stock do in the setup wizard).
  { moduleKey: "products", nameEn: "Products", nameAr: "المنتجات", isEnabled: false },
  { moduleKey: "procurement", nameEn: "Purchasing", nameAr: "المشتريات", isEnabled: false },
  { moduleKey: "store", nameEn: "Online store", nameAr: "المتجر الإلكتروني", isEnabled: false },
  { moduleKey: "delivery", nameEn: "Delivery", nameAr: "التوصيل", isEnabled: false },
  // Every department can use tasks, so the module starts on.
  { moduleKey: "tasks", nameEn: "Tasks and projects", nameAr: "المهام والمشاريع" },
] as const;

/** Whether a module is on before anyone has chosen (a module missing from the database). */
export const moduleOnByDefault = (moduleKey: string) => {
  const entry = DEFAULT_FEATURE_MODULES.find((m) => m.moduleKey === moduleKey);
  return !entry || !("isEnabled" in entry) || entry.isEnabled !== false;
};
