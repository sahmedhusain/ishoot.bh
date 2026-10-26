// The admin dictionary is activity-neutral; an activity whose own vocabulary reads better (a media studio's
// shoots, gear and post-production) layers it on top. Kept apart from index.ts so the admin client can
// import it without the website dictionaries.
import type adminEn from "./admin/en.json";
import adminActivities from "./admin-activities.json";
import { deepMerge, type DeepPartial } from "./merge";

type AdminDictionary = typeof adminEn;
type AdminLocale = "en" | "ar";
export type AdminCopyOverlay = DeepPartial<AdminDictionary>;

const copy = adminActivities as unknown as Record<
  string,
  Partial<Record<AdminLocale, AdminCopyOverlay>>
>;

/** The wording an activity layers over the neutral admin copy (most activities use the base as it is). */
export function adminActivityCopy(
  locale: AdminLocale,
  activity: string | null | undefined,
): AdminCopyOverlay {
  return (activity && copy[activity]?.[locale]) || {};
}

/** An admin dictionary with the company's activity wording on top. */
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
