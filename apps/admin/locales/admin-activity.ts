import type dictionary from "./en.json";
import adminActivities from "./admin-activities.json";
import { deepMerge, type DeepPartial } from "./merge";

type AdminDictionary = typeof dictionary.admin;
type AdminLocale = "en" | "ar";
export type AdminCopyOverlay = DeepPartial<AdminDictionary>;

const copy = adminActivities as unknown as Record<
  string,
  Partial<Record<AdminLocale, AdminCopyOverlay>>
>;

export function adminActivityCopy(
  locale: AdminLocale,
  activity: string | null | undefined,
): AdminCopyOverlay {
  return (activity && copy[activity]?.[locale]) || {};
}

export function withAdminActivity(
  dictionary: AdminDictionary,
  locale: AdminLocale,
  activity: string | null | undefined,
): AdminDictionary {
  const overlay = adminActivityCopy(locale, activity);
  return Object.keys(overlay).length
    ? deepMerge(dictionary, overlay)
    : dictionary;
}
