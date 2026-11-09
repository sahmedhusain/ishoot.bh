"use client";

import Link from "next/link";
import { FileQuestion, Home, FileText, Receipt, Calendar, CreditCard, Box, Users } from "lucide-react";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function NotFoundView() {
  const { t, isRTL } = useAdminLocale();
  const copy = t.notFound;

  const quickLinks = [
    { href: ROUTES.invoices.list, label: copy.invoices, icon: FileText },
    { href: ROUTES.quotations.list, label: copy.quotations, icon: Receipt },
    { href: ROUTES.moms.list, label: copy.moms, icon: Calendar },
    { href: ROUTES.payments.list, label: copy.payments, icon: CreditCard },
    { href: ROUTES.assets.list(), label: copy.assets, icon: Box },
    { href: ROUTES.directory, label: copy.directory, icon: Users },
  ];

  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center p-6 text-center"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl p-8 sm:p-10 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-inner">
            <FileQuestion className="h-8 w-8" aria-hidden />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
            {copy.codeBadge}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {copy.title}
          </h1>

          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {copy.body}
          </p>
        </div>

        {/* Quick jump to core documents */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            {copy.jumpToRecords}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Return button */}
        <div className="pt-2">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 shadow-sm transition-all"
          >
            <Home className="h-4 w-4" />
            <span>{copy.back}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
