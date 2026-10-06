import { db } from "../db";
import { STATISTIC_PRESETS, type StatisticPreset } from "../constants/statistics";

export { STATISTIC_PRESETS, type StatisticPreset };

/** Invoices that were issued to the client: everything except drafts and voids. */
const ISSUED_INVOICE_STATUSES = ["sent", "partially_paid", "paid", "overdue"];

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
  value: string;
  source: string;
  preset: string | null;
  presetParam: number | null;
  roundTo: number | null;
  suffix: string | null;
};

/** Normalises and checks a statistic; manual rows carry no preset settings. */
export function validateStatisticInput<T extends Partial<StatisticInput>>(data: T, now = new Date()): T {
  const source = data.source ?? "manual";
  if (source !== "manual" && source !== "preset") throw new Error("Choose manual or computed for the value");
  if (data.suffix != null && data.suffix.length > 10) throw new Error("The suffix can be at most 10 characters");
  if (data.roundTo != null && (!Number.isInteger(data.roundTo) || data.roundTo < 1 || data.roundTo > 1_000_000))
    throw new Error("Round to must be a whole number of at least 1");
  if (source === "manual") {
    if (!data.value?.trim() || data.value.length > 20) throw new Error("Enter a value of up to 20 characters");
    return { ...data, source, preset: null, presetParam: null, roundTo: null, suffix: null } as T;
  }
  if (!data.preset || !STATISTIC_PRESETS.includes(data.preset)) throw new Error("Choose what to count");
  if (data.preset === "years_in_business") {
    const year = data.presetParam;
    if (year == null || !Number.isInteger(year) || year < 1900 || year > now.getFullYear())
      throw new Error("Enter the founding year");
  }
  return {
    ...data,
    source,
    value: data.value ?? "",
    presetParam: data.preset === "years_in_business" ? data.presetParam : null,
    roundTo: data.roundTo ?? null,
    suffix: data.suffix?.trim() || null,
  } as T;
}

async function countPreset(preset: string, presetParam: number | null, now: Date): Promise<number> {
  switch (preset) {
    case "projects_delivered":
      return db.crmDeal.count({ where: { dealStage: "closed_won" } });
    case "clients_served": {
      const clients = await db.invoice.findMany({
        where: { clientId: { not: null }, status: { in: ISSUED_INVOICE_STATUSES } },
        distinct: ["clientId"],
        select: { clientId: true },
      });
      return clients.length;
    }
    case "team_members":
      return db.employee.count({ where: { status: "active" } });
    case "portfolio_projects":
      return db.portfolioItem.count();
    case "five_star_reviews":
      return db.review.count({ where: { isApproved: true, rating: 5 } });
    case "years_in_business":
      return presetParam == null ? 0 : Math.max(0, now.getFullYear() - presetParam);
    default:
      throw new Error(`Unknown statistic preset: ${preset}`);
  }
}

/** The value shown on the website: typed in, or counted from live data, rounded down, plus the suffix. */
export async function computeStatisticValue(stat: StatisticSettings, now = new Date()): Promise<string> {
  if (stat.source !== "preset" || !stat.preset) return stat.value;
  const count = await countPreset(stat.preset, stat.presetParam, now);
  const step = stat.roundTo && stat.roundTo > 0 ? stat.roundTo : 1;
  return `${Math.floor(count / step) * step}${stat.suffix ?? ""}`;
}

/** Statistics with each value resolved; `storedValue` is what the editor typed. */
export async function getStatistics() {
  try {
    const rows = await db.statistic.findMany({
      orderBy: { sortOrder: "asc" },
    });
    const now = new Date();
    return await Promise.all(
      rows.map(async (row) => ({ ...row, storedValue: row.value, value: await computeStatisticValue(row, now) })),
    );
  } catch (e) {
    console.error("Error fetching statistics from DB:", e instanceof Error ? e.message : e);
    throw e;
  }
}

export async function createStatistic(data: StatisticInput) {
  return await db.statistic.create({ data: validateStatisticInput(data) });
}

export async function updateStatistic(id: string, data: Partial<StatisticInput>) {
  const existing = await db.statistic.findUniqueOrThrow({ where: { id } });
  const merged = validateStatisticInput({
    value: existing.value,
    source: existing.source as StatisticInput["source"],
    preset: existing.preset as StatisticPreset | null,
    presetParam: existing.presetParam,
    roundTo: existing.roundTo,
    suffix: existing.suffix,
    ...data,
  });
  return await db.statistic.update({
    where: { id },
    data: { ...data, ...pickSettings(merged) },
  });
}

function pickSettings(data: Partial<StatisticInput>) {
  const { value, source, preset, presetParam, roundTo, suffix } = data;
  return { value, source, preset, presetParam, roundTo, suffix };
}

export async function deleteStatistic(id: string) {
  return await db.statistic.delete({ where: { id } });
}
