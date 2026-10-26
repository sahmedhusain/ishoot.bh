"use client";

import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { Card } from "@platform/ui";
import { REPORT_AREAS } from "@platform/database/constants/reports";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Reports: every report the person may run, by area. */
export function ReportsCatalogView({ reports }: { reports: { key: string; area: string }[] }) {
  const { t } = useAdminLocale();
  const copy = t.reports;
  const catalog = copy.catalog as Record<string, { title: string; description: string }>;
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      {reports.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">{copy.none}</Card>
      ) : (
        REPORT_AREAS.filter((area) => reports.some((r) => r.area === area)).map((area) => (
          <section key={area} className="space-y-3" data-testid={`reports-${area}`}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{copy.areas[area]}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {reports.filter((r) => r.area === area).map((r) => (
                <li key={r.key}>
                  <Link href={ROUTES.reports.report(r.key)} className="flex h-full gap-3 rounded-2xl border border-ink/10 bg-white dark:bg-surface p-4 hover:border-accent hover:shadow-sm press transition-[border-color,box-shadow,transform] duration-base ease-standard" data-testid={`report-${r.key}`}>
                    <FileBarChart className="w-5 h-5 shrink-0 text-accent" aria-hidden="true" />
                    <span className="space-y-1">
                      <span className="block font-semibold text-ink">{catalog[r.key]?.title ?? r.key}</span>
                      <span className="block text-xs text-ink-muted">{catalog[r.key]?.description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
