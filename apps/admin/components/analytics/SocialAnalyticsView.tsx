"use client";

import { Card, DateDisplay } from "@ishoot/ui";
import type { LatestSocialMetric } from "@ishoot/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export function SocialAnalyticsView({ metrics }: { metrics: LatestSocialMetric[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.socialAnalytics;
  const label = (map: Record<string, string>, key: string) => map[key] ?? key.replace(/_/g, " ");
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-BH" : "en-BH");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
      </div>
      {metrics.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">{copy.empty}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.id} className="space-y-2 p-5">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {label(copy.platforms, metric.platform)}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {label(copy.metrics, metric.metricType)}
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {metric.errorStatus ? (
                  <span className="text-sm text-rose-500">{metric.errorStatus}</span>
                ) : (
                  number.format(metric.value)
                )}
              </p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                <span>{metric.isStale ? copy.stale : copy.fresh}</span>
                <span>·</span>
                <span>{copy.updated}</span>
                <DateDisplay date={metric.recordedAt} locale={locale} />
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
