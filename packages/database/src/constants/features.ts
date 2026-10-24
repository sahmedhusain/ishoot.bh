/** Optional modules a company can switch on or off (setup wizard, Settings → Modules). */
export const DEFAULT_FEATURE_MODULES = [
  { moduleKey: "crm_deals", nameEn: "Deals & Pipeline", nameAr: "الصفقات ومسارات البيع" },
  { moduleKey: "invoicing", nameEn: "Invoicing & Billing", nameAr: "الفواتير والتحصيل" },
  { moduleKey: "calendar", nameEn: "Production Calendar", nameAr: "جدول الإنتاج" },
  { moduleKey: "equipment", nameEn: "Equipment Inventory", nameAr: "مخزون المعدات" },
  { moduleKey: "cms", nameEn: "Website Content", nameAr: "إدارة محتوى الموقع" },
  { moduleKey: "reviews", nameEn: "Customer Reviews", nameAr: "تقييمات العملاء" },
] as const;
