"use client";

import { formatMessage } from "@platform/locales";
import { useAdminLocale } from "../../hooks/useAdminLocale";

// Labels for the itsm catalogue's keys (contracts/catalog/itsm.json). A key the interface has no words for yet is
// shown as it is, so a catalogue addition never breaks the page.

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  triaged: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  assigned: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  waiting_on_requester: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "bg-ink/5 text-ink-muted",
  cancelled: "bg-ink/5 text-ink-muted",
};

export function useTicketText() {
  const { t, locale } = useAdminLocale();
  const s = t.itSupport;
  const pick = <T extends Record<string, string>>(labels: T, key: string) =>
    (labels as Record<string, string>)[key] ?? key;
  const dateFormat = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-u-nu-latn" : "en-GB",
    { dateStyle: "medium", timeStyle: "short" },
  );
  return {
    status: (key: string) => pick(s.statuses, key),
    priority: (key: string) => pick(s.priorities, key),
    transition: (key: string) => pick(s.transitions, key),
    event: (key: string) => pick(s.events, key),
    number: (n: number) => formatMessage(s.number, { number: n }),
    name: (entry: { nameEn: string; nameAr: string }) =>
      locale === "ar" ? entry.nameAr : entry.nameEn,
    date: (value: string) => dateFormat.format(new Date(value)),
  };
}

export function TicketStatusBadge({ status }: { status: string }) {
  const text = useTicketText();
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.closed}`}
    >
      {text.status(status)}
    </span>
  );
}
