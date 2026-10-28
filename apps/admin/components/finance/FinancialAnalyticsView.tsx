"use client";
import { useCompanyCurrency } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import Link from "next/link";
import { Card, CurrencyDisplay } from "@platform/ui";
import { CalendarClock, Percent, Receipt, Wallet } from "lucide-react";
import type { ExpenseCategory, FinancialSummary } from "@platform/database/types";
import type { ReceivablesInsight } from "@platform/database";
import { DeferredCashflowChart } from "../shared/DeferredCharts";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface FinancialAnalyticsViewProps {
  finance: FinancialSummary;
  insight: ReceivablesInsight;
  categoryTotals: Record<string, number>;
  categories: ExpenseCategory[];
  monthlyCashflow: Array<{ monthKey: string; revenue: number; expenses: number }>;
}

const AGING_COLORS = ["bg-emerald-500", "bg-amber-400", "bg-orange-500", "bg-rose-500", "bg-rose-700"];

/**
 * Operational finance view: collections, receivables and spending trends.
 * The profit & loss statement, VAT and accounting basis live only in Financial Reports.
 */
export function FinancialAnalyticsView({ finance, insight, categoryTotals, categories, monthlyCashflow }: FinancialAnalyticsViewProps) {
  const companyCurrency = useCompanyCurrency();
  const { t, locale } = useAdminLocale();
  const copy = t.financialAnalytics;
  const chartData = monthlyCashflow.map((point) => ({
    ...point,
    name: new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      new Date(`${point.monthKey}-01T00:00:00Z`),
    ),
  }));
  const agingTotal = insight.aging.reduce((sum, bucket) => sum + bucket.amount, 0);
  const spendTotal = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

  const kpis = [
    { icon: Percent, label: copy.collectionRate, value: `${insight.collectionRate.toFixed(1)}%`, hint: copy.collectionRateHint },
    { icon: CalendarClock, label: copy.daysToCollect, value: `${insight.averageDaysToCollect} ${copy.days}`, hint: copy.daysToCollectHint },
    { icon: Wallet, label: copy.outstanding, value: <CurrencyDisplay amount={finance.outstanding} currency={companyCurrency} />, hint: copy.outstandingHint },
    { icon: Receipt, label: copy.averageInvoice, value: <CurrencyDisplay amount={insight.averageInvoiceValue} currency={companyCurrency} />, hint: formatMessage(copy.averageInvoiceHint, { count: String(insight.invoicesIssued) }) },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display">{copy.title}</h1>
        <p className="text-sm text-ink-muted mt-1">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, hint }) => (
          <Card key={label} className="p-6 space-y-2 rounded-3xl">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{label}</span>
              <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-bold text-ink">{value}</div>
            <div className="text-[11px] text-ink-muted">{hint}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 sm:p-8 rounded-3xl space-y-4" data-page-section>
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{copy.cashTrend}</h2>
        <div className="h-72 w-full">
          <DeferredCashflowChart kind="finance" data={chartData} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 rounded-3xl space-y-4" data-page-section>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{copy.aging}</h2>
          {agingTotal === 0 ? (
            <p className="text-sm text-ink-muted">{copy.noData}</p>
          ) : (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-ink/5">
                {insight.aging.map((bucket, i) => (
                  <div key={bucket.bucket} className={AGING_COLORS[i]} style={{ width: `${(bucket.amount / agingTotal) * 100}%` }} />
                ))}
              </div>
              <ul className="divide-y divide-outline-variant text-sm">
                {insight.aging.map((bucket, i) => (
                  <li key={bucket.bucket} className="flex items-center justify-between py-2.5">
                    <span className="flex items-center gap-2 text-ink">
                      <span className={`h-2.5 w-2.5 rounded-full ${AGING_COLORS[i]}`} />
                      {copy.agingBuckets[bucket.bucket]}
                      <span className="text-xs text-ink-muted">· {formatMessage(copy.invoicesCount, { count: String(bucket.count) })}</span>
                    </span>
                    <span className="font-semibold text-ink"><CurrencyDisplay amount={bucket.amount} currency={companyCurrency} /></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="p-6 rounded-3xl space-y-4" data-page-section>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{copy.topClients}</h2>
          {insight.topClients.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.noData}</p>
          ) : (
            <ol className="divide-y divide-outline-variant text-sm">
              {insight.topClients.map((client, i) => (
                <li key={client.clientId} className="flex items-center justify-between py-2.5">
                  <Link href={ROUTES.crm.customer(client.clientId)} className="flex items-center gap-3 text-ink hover:text-accent">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</span>
                    <span className="font-medium"><bdi dir="auto">{client.name}</bdi></span>
                    <span className="text-xs text-ink-muted">· {formatMessage(copy.invoicesCount, { count: String(client.invoices) })}</span>
                  </Link>
                  <span className="font-semibold text-ink"><CurrencyDisplay amount={client.collected} currency={companyCurrency} /></span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-6 sm:p-8 rounded-3xl space-y-4" data-page-section>
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{copy.spending}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const amount = categoryTotals[category.slug] || 0;
            const share = spendTotal > 0 ? (amount / spendTotal) * 100 : 0;
            return (
              <div key={category.id} className="p-4 rounded-2xl bg-surface-sunken border border-outline-variant space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{locale === "ar" ? category.name_ar : category.name_en}</span>
                  <span className="text-[11px] text-ink-muted">{share.toFixed(0)}%</span>
                </div>
                <div className="text-base font-bold text-ink"><CurrencyDisplay amount={amount} currency={companyCurrency} /></div>
                <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: category.color || "rgb(var(--brand-accent))" }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
