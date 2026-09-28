"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function BreadcrumbTrail() {
  const pathname = usePathname();
  const { t, isRTL } = useAdminLocale();
  const segments = pathname.split("/").filter(Boolean);

  const segmentLabels: Record<string, string> = {
    dashboard: t.nav.overview,
    calendar: t.nav.calendar,
    crm: t.nav.crm,
    deals: t.nav.deals,
    contacts: t.nav.contacts,
    leads: t.nav.leads,
    finance: t.nav.finance,
    invoices: t.nav.invoices,
    payments: t.nav.payments,
    expenses: t.nav.expenses,
    cms: t.nav.cms,
    banners: t.nav.banners,
    portfolio: t.nav.portfolio,
    clients: t.nav.clients,
    equipment: t.nav.equipment,
    users: t.nav.users,
    settings: t.nav.system,
    company: t.nav.companySettings,
    preferences: t.nav.appearance,
    audit: t.nav.auditLogs,
    integrations: t.nav.integrations,
    services: t.nav.services,
    new: t.actions.newInvoice,
  };

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <nav
      data-breadcrumb
      className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
    >
      <Link
        href="/dashboard"
        className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
      >
        {t.layout.home}
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = segmentLabels[segment] || segment;

        return (
          <React.Fragment key={url}>
            <Chevron className="w-3.5 h-3.5 text-slate-300 dark:text-white/20" />
            {isLast ? (
              <span className="text-[#014842] dark:text-[#09937F] font-semibold">{label}</span>
            ) : (
              <Link
                href={url}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

