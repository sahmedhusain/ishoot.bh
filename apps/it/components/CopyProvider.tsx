"use client";

import * as React from "react";
import { formatMessage } from "@platform/locales";
import type { Copy, ItLocale } from "../lib/i18n";

const Context = React.createContext<{ copy: Copy; locale: ItLocale } | null>(
  null,
);
const subscribe = () => () => undefined;

export function CopyProvider({
  copy,
  locale,
  children,
}: {
  copy: Copy;
  locale: ItLocale;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ copy, locale }), [copy, locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** The interface copy and helpers for catalogue keys (a key without copy is shown as it is). */
export function useCopy() {
  const value = React.useContext(Context);
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!value) throw new Error("useCopy must be used inside CopyProvider");
  const { copy, locale } = value;
  const pick = (labels: Record<string, string>, key: string) =>
    labels[key] ?? key;
  const dates = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-u-nu-latn" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      // Match server and first client render, then show the operator's local time.
      timeZone: hydrated ? undefined : "UTC",
    },
  );
  return {
    copy,
    locale,
    status: (key: string) => pick(copy.statuses, key),
    priority: (key: string) => pick(copy.priorities, key),
    transition: (key: string) => pick(copy.transitions, key),
    event: (key: string) => pick(copy.events, key),
    role: (key: string) => pick(copy.roles, key),
    number: (n: number) => formatMessage(copy.tickets.number, { number: n }),
    name: (entry: { nameEn: string; nameAr: string }) =>
      locale === "ar" ? entry.nameAr : entry.nameEn,
    date: (value: string) => dates.format(new Date(value)),
  };
}
