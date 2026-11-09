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
  locale = "en",
  children,
}: {
  copy: Copy;
  locale?: ItLocale;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ copy, locale: "en" as ItLocale }), [copy]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCopy() {
  const value = React.useContext(Context);
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!value) throw new Error("useCopy must be used inside CopyProvider");
  const { copy } = value;
  const locale: ItLocale = value.locale;

  const pick = (labels: Record<string, string>, key: string) =>
    labels[key] ?? key;

  const dates = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",

    timeZone: hydrated ? undefined : "UTC",
  });

  return {
    copy,
    locale,
    status: (key: string) => pick(copy.statuses, key),
    priority: (key: string) => pick(copy.priorities, key),
    transition: (key: string) => pick(copy.transitions, key),
    event: (key: string) => pick(copy.events, key),
    role: (
      key: string,
      dbRoles?: Array<{ id: string; nameEn?: string; nameAr?: string }>,
    ) => {
      if (dbRoles && dbRoles.length > 0) {
        const found = dbRoles.find((r) => r.id === key);
        if (found) {
          return found.nameEn || found.nameAr || key;
        }
      }
      return key
        .replace(/^it_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    },
    number: (n: number) => formatMessage(copy.tickets.number, { number: n }),
    name: (entry: { nameEn: string; nameAr: string }) =>
      entry.nameEn || entry.nameAr,
    date: (value: string) => dates.format(new Date(value)),
  };
}
