export interface ServiceUnitConfig {
  value: "day" | "hour" | "project" | "minute" | "unit";
  translationKey: string;
  labelEn: string;
  labelAr: string;
}

export const SERVICE_UNITS: ServiceUnitConfig[] = [
  {
    value: "day",
    translationKey: "services.units.day",
    labelEn: "Per Day",
    labelAr: "يومي",
  },
  {
    value: "hour",
    translationKey: "services.units.hour",
    labelEn: "Per Hour",
    labelAr: "بالساعة",
  },
  {
    value: "project",
    translationKey: "services.units.project",
    labelEn: "Per Project",
    labelAr: "لكل مشروع",
  },
  {
    value: "minute",
    translationKey: "services.units.minute",
    labelEn: "Per Minute",
    labelAr: "بالدقيقة",
  },
  {
    value: "unit",
    translationKey: "services.units.unit",
    labelEn: "Per Unit",
    labelAr: "لكل قطعة",
  },
];
