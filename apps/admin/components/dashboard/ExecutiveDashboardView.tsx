"use client";

import * as React from "react";
import Link from "next/link";
import type {
  FinancialSummary,
  CRMDeal,
  Inquiry,
  CompanySettings,
  CalendarEvent,
  MonthlyCashflowPoint,
} from "@ishoot/database";
import {
  Card,
  Button,
  CurrencyDisplay,
  DateDisplay,
  StatusBadge,
} from "@ishoot/ui";
import {
  DollarSign,
  Briefcase,
  TrendingUp,
  Inbox,
  Plus,
  ArrowUpRight,
  Building2,
  Calendar as CalendarIcon,
  TrendingDown,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface ExecutiveDashboardViewProps {
  finance: FinancialSummary;
  monthlyCashflow?: MonthlyCashflowPoint[];
  deals: CRMDeal[];
  inquiries: Inquiry[];
  company: CompanySettings;
  upcomingEvents: CalendarEvent[];
}

export function ExecutiveDashboardView({
  finance,
  monthlyCashflow = [],
  deals,
  inquiries,
  company,
  upcomingEvents,
}: ExecutiveDashboardViewProps) {
  const { t, isRTL, locale } = useAdminLocale();

  const activePipelineValue = deals
    .filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost")
    .reduce((acc, d) => acc + Number(d.value), 0);

  const cashflowData = monthlyCashflow.map((pt) => {
    const [year, month] = pt.monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = new Intl.DateTimeFormat(
      locale === "ar" ? "ar-BH" : "en-US",
      { month: "short" },
    ).format(date);
    return {
      month: monthName,
      revenue: pt.revenue,
      expenses: pt.expenses,
    };
  });

  const stageStats: Record<string, { count: number; value: number }> = {};
  deals.forEach((d) => {
    if (!stageStats[d.stage]) {
      stageStats[d.stage] = { count: 0, value: 0 };
    }
    stageStats[d.stage].count += 1;
    stageStats[d.stage].value += Number(d.value);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
            {t.executiveOps}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.executiveSub}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/invoices/new">
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 bg-[#014842] hover:bg-[#014842]/90 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.newInvoice}</span>
            </Button>
          </Link>
          <Link href="/dashboard/calendar">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#09937F]" />
              <span>{t.nav.calendar}</span>
            </Button>
          </Link>
          <Link href="/dashboard/crm/deals">
            <Button variant="secondary" size="sm">
              <span>{t.nav.deals}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-[#10B981]/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.totalRevenue}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            <CurrencyDisplay amount={finance.revenue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#10B981] font-mono flex items-center gap-1 font-medium">
            <span>+18.4%</span>
            <span className="text-slate-400">
              {t.dashboardView.vsLastMonth}
            </span>
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-[#09937F]/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.pipelineValue}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F] font-mono font-medium">
            {deals.length} {t.kpi.activeDealsCount}
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-amber-500/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.receivables}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-medium">
            {finance.overdue > 0
              ? `${finance.overdue.toFixed(3)} BHD ${t.kpi.overdueAlert}`
              : t.kpi.allOnTrack}
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-rose-500/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.operatingExpenses}
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            <CurrencyDisplay amount={finance.expenses} currency="BHD" />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {t.kpi.expensesDesc}
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-[#09937F]/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.profitMargin}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <span className="text-xs font-mono font-bold">%</span>
            </div>
          </div>
          <div
            className={`text-xl font-bold font-mono ${finance.netProfit >= 0 ? "text-[#014842] dark:text-[#09937F]" : "text-rose-500"}`}
          >
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#09937F] font-mono font-medium">
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" />{" "}
            {t.kpi.netProfit}
          </div>
        </Card>

        <Card className="p-5 space-y-2 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 transition-all rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.kpi.incomingLeads}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
            {inquiries.length}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
            {t.kpi.lastSevenDays}
          </div>
        </Card>
      </div>

      {/* Main Charts & Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-6 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.charts.monthlyRevenueExpenses}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.dashboardView.cashInflowSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#09937F]" />
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.dashboardView.revenue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.dashboardView.expenses}</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashflowData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148, 163, 184, 0.2)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121B19",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    fontSize: 12,
                    color: "#FFF",
                  }}
                  formatter={(value: any) => [
                    `${Number(value).toFixed(3)} BHD`,
                    "",
                  ]}
                />
                <Bar
                  dataKey="revenue"
                  fill="#09937F"
                  radius={[6, 6, 0, 0]}
                  name={t.dashboardView.revenue}
                />
                <Bar
                  dataKey="expenses"
                  fill="#F43F5E"
                  radius={[6, 6, 0, 0]}
                  name={t.dashboardView.expenses}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 p-6 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-white/10 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.charts.pipelineByStage}
            </h2>
            <Link
              href="/dashboard/crm/deals"
              className="text-xs text-[#014842] dark:text-[#09937F] hover:underline font-semibold"
            >
              {t.actions.view}
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 py-1">
            {Object.entries(stageStats).map(([stageKey, data]) => {
              const label = (t.stages as any)[stageKey] || stageKey;
              const percent =
                activePipelineValue > 0
                  ? (data.value / activePipelineValue) * 100
                  : 0;
              return (
                <div key={stageKey} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {label} ({data.count})
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={data.value} currency="BHD" />
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#09937F] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(8, percent))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">
              {t.dashboardView.activePipeline}
            </span>
            <span className="font-bold text-[#014842] dark:text-[#09937F] text-sm">
              <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
            </span>
          </div>
        </Card>
      </div>

      {/* Recent Deals & Upcoming Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Deals
            </h2>
            <Link
              href="/dashboard/crm/deals"
              className="text-xs text-[#014842] dark:text-[#09937F] hover:underline flex items-center gap-1 transition-colors font-semibold"
            >
              <span>{t.dashboardView.viewKanban}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-white/5">
            {deals.slice(0, 5).map((deal) => (
              <div
                key={deal.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1">
                  <Link
                    href={`/dashboard/crm/deals/${deal.id}`}
                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#014842] dark:hover:text-[#09937F] transition-colors"
                  >
                    {deal.title}
                  </Link>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    {deal.contact ? (
                      <Link
                        href={`/dashboard/crm/customers/${deal.contact.id}`}
                        className="hover:text-[#014842] dark:hover:text-[#09937F] hover:underline font-medium inline-flex items-center gap-1"
                        title="View Customer Dossier"
                      >
                        <span>{deal.contact.company || deal.contact.full_name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    ) : (
                      <span>{t.dashboardView.directLead}</span>
                    )}
                    {deal.shoot_date && (
                      <span className="font-mono text-[10px] text-[#09937F] bg-[#09937F]/10 px-2 py-0.5 rounded font-medium">
                        {t.dashboardView.shootDate} {deal.shoot_date}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <StatusBadge status={deal.stage} />
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono text-end min-w-[90px]">
                    <CurrencyDisplay
                      amount={deal.value}
                      currency={deal.currency}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#09937F]" />
                <span>{t.calendar.title}</span>
              </h2>
              <Link
                href="/dashboard/calendar"
                className="text-xs text-[#014842] dark:text-[#09937F] hover:underline font-semibold"
              >
                {t.actions.all}
              </Link>
            </div>

            <div className="bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-3 shadow-sm">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase"
                        style={{
                          backgroundColor: `${event.color || "#09937F"}20`,
                          color: event.color || "#09937F",
                        }}
                      >
                        {(t.calendarView as any)[event.event_type] ||
                          event.event_type}
                      </span>
                      <DateDisplay
                        date={event.start_date}
                        locale={locale}
                        className="text-[10px] text-slate-400 font-mono"
                      />
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {locale === "ar" && event.title_ar
                        ? event.title_ar
                        : event.title}
                    </div>
                    {event.location && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#09937F]" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-4 text-center">
                  {t.dashboardView.zeroUpcomingShoots}
                </div>
              )}
            </div>
          </div>

          <Card className="p-5 bg-white dark:bg-[#121B19] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="w-9 h-9 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4 text-[#09937F]" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {locale === "ar"
                    ? company.company_name_ar
                    : company.company_name_en}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  CR: {company.cr_number}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.settings.vatTitle}:</span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    company.vat_enabled
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                  }`}
                >
                  {company.vat_enabled
                    ? t.dashboardView.vatRegistered
                    : t.dashboardView.nonVat}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.settings.bankName}:</span>
                <span className="text-slate-900 dark:text-white text-end truncate max-w-[140px] font-mono text-[11px] font-medium">
                  {company.bank_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{t.settings.bankIban}:</span>
                <span className="text-slate-900 dark:text-white text-end truncate max-w-[140px] font-mono text-[10px]">
                  {company.bank_iban}
                </span>
              </div>
            </div>

            <Link href="/dashboard/settings/company" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs">
                {t.nav.companySettings}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
