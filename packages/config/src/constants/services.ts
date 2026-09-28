export interface ServiceCategoryConfig {
  value: string;
  translationKey: string;
  labelEn: string;
  labelAr: string;
  colorClass: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  {
    value: "all",
    translationKey: "services.categories.all",
    labelEn: "All Services",
    labelAr: "جميع الخدمات",
    colorClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
  {
    value: "production",
    translationKey: "services.categories.production",
    labelEn: "Production & Shoot",
    labelAr: "التصوير والإنتاج",
    colorClass: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300",
  },
  {
    value: "post_production",
    translationKey: "services.categories.postProduction",
    labelEn: "Post-Production & VFX",
    labelAr: "المونتاج والمؤثرات",
    colorClass: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  {
    value: "pre_production",
    translationKey: "services.categories.preProduction",
    labelEn: "Pre-Production & Script",
    labelAr: "ما قبل الإنتاج والسيناريو",
    colorClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
  },
  {
    value: "studio_rental",
    translationKey: "services.categories.studioRental",
    labelEn: "Studio & Stages",
    labelAr: "تأجير الاستوديو والمواقع",
    colorClass: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300",
  },
  {
    value: "equipment",
    translationKey: "services.categories.equipment",
    labelEn: "Camera & Lighting Gear",
    labelAr: "تأجير الكاميرات والإضاءة",
    colorClass: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
  },
  {
    value: "consulting",
    translationKey: "services.categories.consulting",
    labelEn: "Consulting & Creative",
    labelAr: "الاستشارات والرؤية الإبداعية",
    colorClass: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300",
  },
];

export interface ServiceUnitConfig {
  value: "day" | "hour" | "project" | "minute" | "unit";
  translationKey: string;
  labelEn: string;
  labelAr: string;
}

export const SERVICE_UNITS: ServiceUnitConfig[] = [
  { value: "day", translationKey: "services.units.day", labelEn: "Per Day", labelAr: "يومي" },
  { value: "hour", translationKey: "services.units.hour", labelEn: "Per Hour", labelAr: "بالساعة" },
  { value: "project", translationKey: "services.units.project", labelEn: "Per Project", labelAr: "لكل مشروع" },
  { value: "minute", translationKey: "services.units.minute", labelEn: "Per Minute", labelAr: "بالدقيقة" },
  { value: "unit", translationKey: "services.units.unit", labelEn: "Per Unit", labelAr: "لكل قطعة" },
];
