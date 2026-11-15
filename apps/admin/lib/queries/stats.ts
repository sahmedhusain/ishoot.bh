import { randomUUID } from "node:crypto";
import { serverMessages } from "@platform/locales";
import {
  deleteStatistic as deleteStatisticApi,
  getContentSnapshot,
  listDeals,
  listEmployees,
  listInvoices,
  listPortfolioItems,
  listReviews,
  listStatistics,
  upsertStatistic,
} from "@platform/api-client";
import {
  STATISTIC_PRESETS,
  type StatisticPreset,
} from "../constants/statistics";

export { STATISTIC_PRESETS, type StatisticPreset };

export type StatisticInput = {
  value: string;
  labelEn: string;
  labelAr: string;
  subLabelEn?: string;
  subLabelAr?: string;
  icon?: string;
  sortOrder?: number;
  source?: "manual" | "preset";
  preset?: StatisticPreset | null;
  presetParam?: number | null;
  roundTo?: number | null;
  suffix?: string | null;
};

type StatisticSettings = {
  id: string;
  value: string;
  labelEn: string;
  labelAr: string;
  subLabelEn: string | null;
  subLabelAr: string | null;
  icon: string | null;
  sortOrder: number;
  source: string;
  preset: string | null;
  presetParam: number | null;
  roundTo: number | null;
  suffix: string | null;
};

export function validateStatisticInput<T extends Partial<StatisticInput>>(
  data: T,
) {
  const source =
    data.source === "preset"
      ? "preset"
      : data.source === "manual" || data.source === undefined
        ? "manual"
        : (() => {
            throw new Error(serverMessages.chooseManualOrComputedForTheValue);
          })();
  const preset = data.preset ?? null;
  if (source === "manual") {
    return {
      ...data,
      source: "manual" as const,
      preset: null,
      presetParam: null,
      roundTo: null,
      suffix: null,
    };
  }
  if (!preset || !(STATISTIC_PRESETS as readonly string[]).includes(preset))
    throw new Error(serverMessages.chooseWhatToCount);
  if (preset === "years_in_business") {
    const year = Number(data.presetParam);
    if (!Number.isInteger(year) || year < 1900 || year > 2100)
      throw new Error(serverMessages.enterTheFoundingYear);
  }
  if (
    data.roundTo != null &&
    (!Number.isInteger(data.roundTo) || data.roundTo < 1 || data.roundTo > 1000)
  )
    throw new Error(serverMessages.roundToMustBeAWholeNumber);
  if (data.suffix && data.suffix.length > 10)
    throw new Error(serverMessages.theSuffixCanBeAtMost10);
  return {
    ...data,
    source: "preset" as const,
    preset,
    value: data.value ?? "",
    presetParam: data.preset === "years_in_business" ? data.presetParam : null,
    roundTo: data.roundTo ?? null,
    suffix: data.suffix?.trim() || null,
  };
}

async function countPreset(
  preset: string,
  presetParam: number | null,
  now: Date,
): Promise<number> {
  switch (preset) {
    case "projects_delivered": {
      const deals = await listDeals().catch(() => []);
      return deals.filter((d: any) => (d.dealStage ?? d.stage) === "closed_won").length;
    }
    case "clients_served": {
      const invoices = await listInvoices().catch(() => []);
      return new Set(
        invoices
          .filter(
            (i: any) =>
              (i.clientId ?? i.contactId) &&
              i.status !== "cancelled" &&
              i.status !== "void",
          )
          .map((i: any) => String(i.clientId ?? i.contactId)),
      ).size;
    }
    case "team_members": {
      const staff = await listEmployees().catch(() => []);
      return staff.filter((e) => e.status === "active").length;
    }
    case "portfolio_projects": {
      const snap = await getContentSnapshot("main").catch(() => null);
      const snapItems = snap?.published?.portfolio ?? snap?.draft?.portfolio;
      if (Array.isArray(snapItems) && snapItems.length > 0) return snapItems.length;
      const items = await listPortfolioItems().catch(() => []);
      return items.length;
    }
    case "five_star_reviews": {
      const reviews = await listReviews(false).catch(() => []);
      return reviews.filter((r) => r.isApproved && r.rating === 5).length;
    }
    case "years_in_business":
      return presetParam ? Math.max(0, now.getUTCFullYear() - presetParam) : 0;
    default:
      return 0;
  }
}

export async function computeStatisticValue(
  stat: StatisticSettings,
  now = new Date(),
): Promise<string> {
  if (stat.source !== "preset" || !stat.preset) return stat.value;
  const count = await countPreset(stat.preset, stat.presetParam, now);
  const step = stat.roundTo && stat.roundTo > 0 ? stat.roundTo : 1;
  return `${Math.floor(count / step) * step}${stat.suffix ?? ""}`;
}

export async function getStatistics() {
  try {
    const items = await listStatistics();
    return items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.id,
        value: row.metricValue,
        storedValue: row.metricValue,
        labelEn: row.labelEn,
        labelAr: row.labelAr,
        subLabelEn: row.subLabelEn ?? null,
        subLabelAr: row.subLabelAr ?? null,
        icon: row.icon ?? null,
        sortOrder: row.sortOrder,
        source: "manual",
        preset: null as StatisticPreset | null,
      }));
  } catch (e) {
    console.error("Failed to fetch statistics from CMS API:", e);
    return [];
  }
}

export async function createStatistic(data: StatisticInput) {
  const valid = validateStatisticInput(data);
  const metricValue =
    valid.source === "preset"
      ? await computeStatisticValue({
          id: "",
          value: valid.value,
          labelEn: data.labelEn,
          labelAr: data.labelAr,
          subLabelEn: data.subLabelEn ?? null,
          subLabelAr: data.subLabelAr ?? null,
          icon: data.icon ?? null,
          sortOrder: data.sortOrder ?? 0,
          source: valid.source,
          preset: valid.preset,
          presetParam: valid.presetParam ?? null,
          roundTo: valid.roundTo ?? null,
          suffix: valid.suffix ?? null,
        })
      : valid.value;

  const saved = await upsertStatistic("", {
    id: randomUUID(),
    metricValue,
    labelEn: data.labelEn,
    labelAr: data.labelAr,
    subLabelEn: data.subLabelEn ?? null,
    subLabelAr: data.subLabelAr ?? null,
    icon: data.icon ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return {
    id: saved.id,
    value: saved.metricValue,
    storedValue: saved.metricValue,
    labelEn: saved.labelEn,
    labelAr: saved.labelAr,
    subLabelEn: saved.subLabelEn ?? null,
    subLabelAr: saved.subLabelAr ?? null,
    icon: saved.icon ?? null,
    sortOrder: saved.sortOrder,
    source: valid.source,
    preset: valid.preset,
  };
}

export async function updateStatistic(
  id: string,
  data: Partial<StatisticInput>,
) {
  const all = await listStatistics();
  const existing = all.find((s) => s.id === id);
  if (!existing)
    throw new Error((serverMessages as any).notFound ?? "Statistic not found");

  const valid = validateStatisticInput({
    value: data.value ?? existing.metricValue,
    labelEn: data.labelEn ?? existing.labelEn,
    labelAr: data.labelAr ?? existing.labelAr,
    subLabelEn: data.subLabelEn ?? existing.subLabelEn ?? undefined,
    subLabelAr: data.subLabelAr ?? existing.subLabelAr ?? undefined,
    icon: data.icon ?? existing.icon ?? undefined,
    sortOrder: data.sortOrder ?? existing.sortOrder,
    source: data.source ?? "manual",
    preset: data.preset,
    presetParam: data.presetParam,
    roundTo: data.roundTo,
    suffix: data.suffix,
  });

  const metricValue =
    valid.source === "preset"
      ? await computeStatisticValue({
          id,
          value: valid.value,
          labelEn: valid.labelEn ?? existing.labelEn,
          labelAr: valid.labelAr ?? existing.labelAr,
          subLabelEn: valid.subLabelEn ?? existing.subLabelEn ?? null,
          subLabelAr: valid.subLabelAr ?? existing.subLabelAr ?? null,
          icon: valid.icon ?? existing.icon ?? null,
          sortOrder: valid.sortOrder ?? existing.sortOrder,
          source: valid.source,
          preset: valid.preset,
          presetParam: valid.presetParam ?? null,
          roundTo: valid.roundTo ?? null,
          suffix: valid.suffix ?? null,
        })
      : (valid.value ?? existing.metricValue);

  const saved = await upsertStatistic("", {
    id,
    metricValue,
    labelEn: valid.labelEn ?? existing.labelEn,
    labelAr: valid.labelAr ?? existing.labelAr,
    subLabelEn: valid.subLabelEn ?? existing.subLabelEn ?? null,
    subLabelAr: valid.subLabelAr ?? existing.subLabelAr ?? null,
    icon: valid.icon ?? existing.icon ?? null,
    sortOrder: valid.sortOrder ?? existing.sortOrder,
  });

  return {
    id: saved.id,
    value: saved.metricValue,
    storedValue: saved.metricValue,
    labelEn: saved.labelEn,
    labelAr: saved.labelAr,
    subLabelEn: saved.subLabelEn ?? null,
    subLabelAr: saved.subLabelAr ?? null,
    icon: saved.icon ?? null,
    sortOrder: saved.sortOrder,
    source: valid.source,
    preset: valid.preset,
  };
}

export async function deleteStatistic(id: string) {
  await deleteStatisticApi("", id);
  return { id };
}
