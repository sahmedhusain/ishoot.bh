"use client";
import { useCompanyCurrency } from "@platform/ui";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@platform/ui";
import { ROUTES } from "@platform/database/constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface PayHistoryRow {
  id: string;
  month: number;
  year: number;
  netSalary: number;
  paymentStatus: string;
  runStatus: string;
}

/** An employee's recent salaries; each opens its payment page. */
export function EmployeePayHistory({ rows }: { rows: PayHistoryRow[] }) {
  const companyCurrency = useCompanyCurrency();
  const { t, locale, isRTL } = useAdminLocale();
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  const month = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const money = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (!rows.length) return null;
  return (
    <Card className="p-5 dark:bg-surface-raised" data-page-section>
      <h2 className="mb-2 text-sm font-semibold text-ink dark:text-ink">{t.payrollManagement.payrollAndCompensationRuns}</h2>
      <ul className="divide-y divide-outline-variant">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={ROUTES.hr.payrollItem(row.id)} className="flex items-center gap-3 py-2.5 text-sm hover:bg-ink/[0.03]">
              <span className="flex-1 text-ink dark:text-ink">{month.format(new Date(Date.UTC(row.year, row.month - 1, 1)))}</span>
              <bdi dir="ltr" className="font-mono text-ink dark:text-ink">{money.format(row.netSalary)} {companyCurrency}</bdi>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${row.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-surface-sunken/10 text-ink-muted dark:text-ink"}`}>
                {row.paymentStatus === "paid" ? t.payroll.statusPaid : (t.hrExtensions as Record<string, string>)[row.runStatus] ?? row.runStatus}
              </span>
              <Arrow className="w-4 h-4 text-ink-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
