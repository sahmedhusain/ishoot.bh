"use client";
import { ROUTES } from "../../constants/routes";
import { DeferredCashflowChart } from "../shared/DeferredCharts";

import Link from "next/link";
import type {
FinancialSummary,CompanySettings,
CalendarEvent,
MonthlyCashflowPoint
} from "@ishoot/database";
import {
Button,
CurrencyDisplay,
DateDisplay,
StatusBadge
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
TrendingDown,MapPin,ExternalLink
} from "lucide-react";

import { useAdminLocale } from "../../hooks/useAdminLocale";
import { WorkloadPanels } from "./WorkloadPanels";

interface ExecutiveDashboardViewProps {
  capabilities: { finance: boolean; deals: boolean; leads: boolean; calendar: boolean; createInvoice: boolean; settings: boolean };
  finance: FinancialSummary;
  monthlyCashflow?: MonthlyCashflowPoint[];
  dealOverview: Awaited<
    ReturnType<typeof import("@ishoot/database").getCRMDealOverview>
  >;
  inquiryCount: number;
  company: CompanySettings;
  upcomingEvents: CalendarEvent[];
  /** Role desk the page leads with; omitted keeps the generic title. */
  focus?: "executive" | "finance" | "hr" | "sales" | "production" | "staff";
  /** Approvals, requests and complaints panels, shown under the KPIs. */
  workload?: React.ComponentProps<typeof WorkloadPanels>;
}

export function ExecutiveDashboardView({
  capabilities,
  finance,
  monthlyCashflow = [],
  dealOverview,
  inquiryCount,
  company,
  upcomingEvents,
  focus,
  workload,
}: ExecutiveDashboardViewProps) {
  const { t, locale } = useAdminLocale();

  const {
    recent: deals,
    stageStats,
    activeCount,
    activePipelineValue,
  } = dealOverview;
  const totalStageValue = Object.values(stageStats).reduce(
    (total, stage) => total + stage.value,
    0,
  );

  const cashflowData = monthlyCashflow.map((pt) => {
    const [year, month] = pt.monthKey.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const monthName = new Intl.DateTimeFormat(
      locale === "ar" ? "ar-BH-u-nu-latn" : "en-US",
      { month: "short" },
    ).format(date);
    return {
      month: monthName,
      revenue: pt.revenue,
      expenses: pt.expenses,
    };
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {focus ? t.workload.focus[focus] : capabilities.finance ? t.executiveOps : t.dashboardView.workspaceTitle}
          </h1>
          {focus && <p className="text-sm text-ink-muted mt-1">{t.workload.focusSubtitle[focus]}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {capabilities.createInvoice && (<Link href={ROUTES.invoices.create()}>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-white rounded-full h-8 px-3.5 text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.newInvoice}</span>
            </Button>
          </Link>)}
          {capabilities.calendar && (<Link href={ROUTES.calendar}>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-full h-8 px-3.5 text-xs font-medium"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-accent" />
              <span>{t.nav.calendar}</span>
            </Button>
          </Link>)}
          {capabilities.deals && (<Link href={ROUTES.crm.deals}>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full h-8 px-3.5 text-xs font-medium"
            >
              <span>{t.nav.deals}</span>
            </Button>
          </Link>)}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {capabilities.finance && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.totalRevenue}
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={finance.revenue} currency="BHD" />
          </div>

        </div>)}

        {capabilities.finance && capabilities.deals && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.pipelineValue}
            </span>
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-accent">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
          </div>
          <div className="text-[10px] text-accent  font-medium">
            {activeCount} {t.kpi.activeDealsCount}
          </div>
        </div>)}

        {capabilities.finance && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.receivables}
            </span>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400  font-medium">
            {finance.overdue > 0
              ? <><CurrencyDisplay amount={finance.overdue} currency="BHD" /> {t.kpi.overdueAlert}</>
              : t.kpi.allOnTrack}
          </div>
        </div>)}

        {capabilities.finance && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.operatingExpenses}
            </span>
            <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-500">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white ">
            <CurrencyDisplay amount={finance.expenses} currency="BHD" />
          </div>
          <div className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">
            {t.kpi.expensesDesc}
          </div>
        </div>)}

        {capabilities.finance && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.profitMargin}
            </span>
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-accent">
              <span className="text-[10px]  font-bold">%</span>
            </div>
          </div>
          <div
            className={`text-lg font-bold  ${finance.netProfit >= 0 ? "text-primary dark:text-mint" : "text-rose-500"}`}
          >
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[10px] text-accent  font-medium">
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" />{" "}
            {t.kpi.netProfit}
          </div>
        </div>)}

        {capabilities.leads && (<div className="p-4 space-y-1.5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
              {t.kpi.incomingLeads}
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white ">
            {inquiryCount}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400  font-medium">
            {t.kpi.lastSevenDays}
          </div>
        </div>)}
      </div>

      {workload && <WorkloadPanels {...workload} />}

      {/* Main Charts & Pipeline Grid */}
      {capabilities.finance && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t.charts.monthlyRevenueExpenses}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs ">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-accent" />
                <span className="text-slate-700 dark:text-neutral-300 font-semibold">
                  {t.dashboardView.revenue}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                <span className="text-slate-700 dark:text-neutral-300 font-semibold">
                  {t.dashboardView.expenses}
                </span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <DeferredCashflowChart kind="dashboard" data={cashflowData} />
          </div>
        </div>

        {capabilities.deals && (<div className="lg:col-span-4 p-5 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 dark:border-neutral-800 pb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.charts.pipelineByStage}
            </h2>
            <Link
              href={ROUTES.crm.deals}
              className="text-xs text-primary dark:text-mint hover:underline font-semibold"
            >
              {t.actions.view}
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 py-1">
            {Object.entries(stageStats).map(([stageKey, data]) => {
              const label = (t.stages as any)[stageKey] || stageKey;
              const percent =
                totalStageValue > 0
                  ? (data.value / totalStageValue) * 100
                  : 0;
              return (
                <div key={stageKey} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {label} ({data.count})
                    </span>
                    <span className=" font-bold text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={data.value} currency="BHD" />
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, percent))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs ">
            <span className="text-slate-500 dark:text-neutral-400 font-semibold">
              {t.dashboardView.activePipeline}
            </span>
            <span className="font-bold text-primary dark:text-mint text-sm">
              <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
            </span>
          </div>
        </div>)}
      </div>)}

      {/* Recent Deals & Upcoming Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {capabilities.deals && (<div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.dashboardView.recentDeals}
            </h2>
            <Link
              href={ROUTES.crm.deals}
              className="text-xs text-primary dark:text-accent hover:underline flex items-center gap-1 transition-colors font-semibold"
            >
              <span>{t.dashboardView.viewKanban}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl overflow-hidden shadow-xs divide-y divide-[#dadce0]/70 dark:divide-[#3c4043]/70">
            {deals.slice(0, 5).map((deal) => (
              <div
                key={deal.id}
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors"
              >
                <div className="space-y-0.5">
                  <Link
                    href={ROUTES.crm.deal(deal.id)}
                    className="text-xs font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-mint transition-colors"
                  >
                    {deal.title}
                  </Link>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-2">
                    {deal.contact ? (
                      <Link
                        href={ROUTES.crm.customer(deal.contact.id)}
                        className="hover:text-primary dark:hover:text-mint hover:underline font-medium inline-flex items-center gap-1"
                        title={t.executiveDashboard.viewCustomerDossier}
                      >
                        <span>
                          {deal.contact.company || deal.contact.full_name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    ) : (
                      <span>{t.dashboardView.directLead}</span>
                    )}
                    {deal.shoot_date && (
                      <span className=" text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded font-medium">
                        {t.dashboardView.shootDate} {deal.shoot_date}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={deal.stage} />
                  <div className="text-xs font-bold text-slate-900 dark:text-white  text-end min-w-[80px]">
                    <CurrencyDisplay
                      amount={deal.value}
                      currency={deal.currency}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>)}

        <div className="space-y-6">
          {capabilities.calendar && (<div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-accent" />
                <span>{t.calendar.title}</span>
              </h2>
              <Link
                href={ROUTES.calendar}
                className="text-xs text-primary dark:text-mint hover:underline font-semibold"
              >
                {t.actions.all}
              </Link>
            </div>

            <div className="bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl p-4 space-y-2.5 shadow-xs">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-neutral-800/40 border border-slate-100 dark:border-neutral-800 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[9px]  px-1.5 py-0.5 rounded font-bold uppercase"
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
                        className="text-[10px] text-slate-400 "
                      />
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {locale === "ar" && event.title_ar
                        ? event.title_ar
                        : event.title}
                    </div>
                    {event.location && (
                      <div className="text-[10px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-accent" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  {t.dashboardView.zeroUpcomingShoots}
                </div>
              )}
            </div>
          </div>)}

          {capabilities.settings && (<div className="p-4 bg-white dark:bg-surface-raised border border-ink/15 dark:border-ink/15 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-neutral-800">
              <div className="w-8 h-8 rounded-lg bg-primary border border-accent/40 flex items-center justify-center text-white">
                <Building2 className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {locale === "ar"
                    ? company.company_name_ar
                    : company.company_name_en}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-neutral-400 ">
                  CR: {company.cr_number}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {company.vat_enabled && <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">
                  {t.settings.vatTitle}:
                </span>
                <span
                  className={`px-2 py-0.5 rounded  text-[10px] font-bold ${
                    company.vat_enabled
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700"
                  }`}
                >
                  {company.vat_enabled
                    ? t.dashboardView.vatRegistered
                    : t.dashboardView.nonVat}
                </span>
              </div>}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">
                  {t.settings.bankName}:
                </span>
                <span className="text-slate-900 dark:text-white text-end truncate max-w-[140px]  text-[11px] font-medium">
                  {company.bank_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-neutral-400">
                  {t.settings.bankIban}:
                </span>
                <span className="text-slate-900 dark:text-white text-end truncate max-w-[140px]  text-[10px]">
                  {company.bank_iban}
                </span>
              </div>
            </div>

            <Link href={ROUTES.settings.company} className="block pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs rounded-lg h-7"
              >
                {t.nav.companySettings}
              </Button>
            </Link>
          </div>)}
        </div>
      </div>
    </div>
  );
}
