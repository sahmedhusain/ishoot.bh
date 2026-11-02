import { presenceStatus } from "@platform/contracts";

/** A status's name in the person's language (contracts/catalog/presence.json). */
export function statusName(key: string | null | undefined, locale: string) {
  const status = presenceStatus(key ?? "");
  if (!status) return key ?? "";
  return locale === "ar" ? status.nameAr : status.nameEn;
}

/** A time of day (or day and time when not today) for "until …". */
export function statusTime(iso: string, locale: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    ...(sameDay ? {} : { weekday: "short", day: "numeric", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}
