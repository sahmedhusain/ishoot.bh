import type { Notification } from "@ishoot/database/types";
import type { AdminTranslations } from "./translations";
import { formatDate } from "@ishoot/ui";
import { approvalTargetUrl } from "@ishoot/database/constants/approvals";
import { ROUTES } from "@ishoot/database/constants/routes";
export function notificationText(
  n: Notification,
  t: AdminTranslations,
  locale: "ar" | "en",
) {
  const entry = n.message_key
    ?.split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      t,
    ) as { title?: string; message?: string } | undefined;
  const params = n.message_params ?? {};
  const types = t.approvals.types as Record<string, string>;
  const docs = {
    ...t.employeeResidency.kinds,
    ...t.expiryReminders.documents,
  } as Record<string, string>;
  const values: Record<string, string> = {
    ...params,
    type: types[params.targetType] ?? params.targetType ?? "",
    name:
      (locale === "ar" ? params.nameAr : params.nameEn) ?? params.nameEn ?? "",
    document: params.label ?? docs[params.document] ?? params.document ?? "",
    date: params.date ? formatDate(params.date, locale) : "",
    days: params.days ? String(Math.abs(Number(params.days))) : "",
  };
  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);
  return {
    title: fill(entry?.title ?? n.title),
    message: fill(entry?.message ?? n.message),
  };
}
export function notificationHref(n: Notification): string | null {
  if (n.action_url?.startsWith("/dashboard/")) return n.action_url;
  const id = n.entity_id;
  if (!id) return n.entity_type === "calendar" ? ROUTES.calendar : null;
  switch (n.entity_type) {
    case "payment":
      return ROUTES.payments.detail(id);
    case "expense_claim":
      return ROUTES.claims.list({ highlight: id });
    case "invoice":
      return ROUTES.invoices.detail(id);
    case "deal":
      return ROUTES.crm.deal(id);
    case "calendar":
      return ROUTES.calendar;
    case "inquiry":
    case "lead":
      return ROUTES.requests.detail(id);
    case "announcement":
      return ROUTES.announcements.detail(id);
    case "approval":
      return n.message_params?.targetType
        ? approvalTargetUrl(n.message_params.targetType, id)
        : ROUTES.approvals();
    default:
      return null;
  }
}
export function notificationAge(date: string, locale: "ar" | "en") {
  const seconds = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(
    locale === "ar" ? "ar-BH-u-nu-latn" : "en",
    { numeric: "auto" },
  );
  if (seconds < 60) return format.format(0, "minute");
  if (seconds < 3600) return format.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86400)
    return format.format(-Math.floor(seconds / 3600), "hour");
  return format.format(-Math.floor(seconds / 86400), "day");
}
