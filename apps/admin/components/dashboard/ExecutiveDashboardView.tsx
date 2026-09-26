'use client';

import * as React from 'react';
import Link from 'next/link';
import type {
  FinancialSummary,
  CRMDeal,
  Inquiry,
  CompanySettings,
  CalendarEvent,
} from '@ishoot/database/types';
import { Card, Button, CurrencyDisplay, DateDisplay, StatusBadge } from '@ishoot/ui';
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface ExecutiveDashboardViewProps {
  finance: FinancialSummary;
  deals: CRMDeal[];
  inquiries: Inquiry[];
  company: CompanySettings;
  upcomingEvents: CalendarEvent[];
}

export function ExecutiveDashboardView({
  finance,
  deals,
  inquiries,
  company,
  upcomingEvents,
}: ExecutiveDashboardViewProps) {
  const { t, isRTL, locale } = useAdminLocale();

  const activePipelineValue = deals
    .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    .reduce((acc, d) => acc + Number(d.value), 0);

  // Monthly Cashflow data for chart
  const cashflowData = [
    {
      month: locale === 'ar' ? 'مايو' : 'May',
      revenue: 12400,
      expenses: 4200,
    },
    {
      month: locale === 'ar' ? 'يونيو' : 'Jun',
      revenue: 18500,
      expenses: 6100,
    },
    {
      month: locale === 'ar' ? 'يوليو' : 'Jul',
      revenue: 14200,
      expenses: 5300,
    },
    {
      month: locale === 'ar' ? 'أغسطس' : 'Aug',
      revenue: 21800,
      expenses: 7400,
    },
    {
      month: locale === 'ar' ? 'سبتمبر' : 'Sep',
      revenue: finance.revenue > 0 ? finance.revenue : 24050,
      expenses: finance.expenses > 0 ? finance.expenses : 4980,
    },
    {
      month: locale === 'ar' ? 'أكتوبر (متوقع)' : 'Oct (Proj)',
      revenue: activePipelineValue * 0.45,
      expenses: 5500,
    },
  ];

  // Pipeline stage aggregation
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
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.executiveOps}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.executiveSub}
          </p>
        </div>

        {/* Odoo Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/dashboard/invoices/new">
            <Button variant="primary" size="sm" className="gap-1.5 shadow-lg shadow-[#09937F]/20">
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

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Liquid Revenue */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-[#10B981]/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.totalRevenue}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.revenue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#10B981] font-mono flex items-center gap-1">
            <span>+18.4%</span>
            <span className="text-[#9EADA9]/60">vs last mo</span>
          </div>
        </Card>

        {/* 2. Active Deals Pipeline */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.pipelineValue}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F] font-mono">
            {deals.length} {t.kpi.activeDealsCount}
          </div>
        </Card>

        {/* 3. Outstanding Receivables */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-amber-500/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.receivables}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono">
            {finance.overdue > 0 ? `${finance.overdue.toFixed(3)} BHD ${t.kpi.overdueAlert}` : t.kpi.allOnTrack}
          </div>
        </Card>

        {/* 4. Operating Costs */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-rose-500/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.operatingExpenses}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.expenses} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/70 truncate">
            {t.kpi.expensesDesc}
          </div>
        </Card>

        {/* 5. Net Operating Profit Margin */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.profitMargin}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <span className="text-xs font-mono font-bold">%</span>
            </div>
          </div>
          <div className={`text-xl font-bold font-mono ${finance.netProfit >= 0 ? 'text-[#09937F]' : 'text-rose-400'}`}>
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#09937F] font-mono">
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" /> {t.kpi.netProfit}
          </div>
        </Card>

        {/* 6. Incoming Inquiries */}
        <Card className="p-5 space-y-2 bg-[#0B1210] border border-white/10 hover:border-blue-500/50 transition-all rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9EADA9]">{t.kpi.incomingLeads}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {inquiries.length}
          </div>
          <div className="text-[11px] text-blue-400 font-mono">
            {t.kpi.lastSevenDays}
          </div>
        </Card>
      </div>

      {/* Visual Analytics Row: Cashflow Bar Chart + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8/12): Cashflow Bar Chart */}
        <Card className="lg:col-span-8 p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.charts.monthlyRevenueExpenses}
              </h2>
              <p className="text-xs text-[#9EADA9]">BHD Cash Inflow vs Operating Deductions</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#09937F]" />
                <span className="text-white">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500/80" />
                <span className="text-white">Expenses</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#9EADA9" fontSize={11} tickLine={false} />
                <YAxis stroke="#9EADA9" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#070C0A',
                    borderColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#FFF',
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(3)} BHD`, '']}
                />
                <Bar dataKey="revenue" fill="#09937F" radius={[6, 6, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#F43F5E" radius={[6, 6, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right Column (4/12): Pipeline Funnel Breakdown */}
        <Card className="lg:col-span-4 p-6 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.charts.pipelineByStage}
            </h2>
            <Link href="/dashboard/crm/deals" className="text-xs text-[#09937F] hover:underline">
              {t.actions.view}
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-64 py-1">
            {Object.entries(stageStats).map(([stageKey, data]) => {
              const label = (t.stages as any)[stageKey] || stageKey;
              const percent = activePipelineValue > 0 ? (data.value / activePipelineValue) * 100 : 0;
              return (
                <div key={stageKey} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9EADA9] font-medium">{label} ({data.count})</span>
                    <span className="font-mono font-bold text-white">
                      <CurrencyDisplay amount={data.value} currency="BHD" />
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#09937F] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(8, percent))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-[#9EADA9]">Active Pipeline:</span>
            <span className="font-bold text-[#09937F] text-sm">
              <CurrencyDisplay amount={activePipelineValue} currency="BHD" />
            </span>
          </div>
        </Card>
      </div>

      {/* 2-Column Operational Grid: Active Deals & Upcoming Shoot Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2/3): Active Production Deals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.nav.deals}
            </h2>
            <Link
              href="/dashboard/crm/deals"
              className="text-xs text-[#09937F] hover:text-[#0BB49B] flex items-center gap-1 transition-colors font-medium"
            >
              <span>{t.actions.view} Kanban</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl divide-y divide-white/5">
            {deals.slice(0, 5).map((deal) => (
              <div
                key={deal.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {deal.title}
                  </div>
                  <div className="text-xs text-[#9EADA9] flex items-center gap-2">
                    <span>{deal.contact?.company || deal.contact?.full_name || 'Direct Lead'}</span>
                    {deal.shoot_date && (
                      <span className="font-mono text-[10px] text-[#09937F] bg-[#09937F]/10 px-2 py-0.5 rounded">
                        Shoot: {deal.shoot_date}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <StatusBadge status={deal.stage} />
                  <div className="text-sm font-bold text-white font-mono text-end min-w-[90px]">
                    <CurrencyDisplay amount={deal.value} currency={deal.currency} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1/3): Upcoming Shoot Schedule & Entity Card */}
        <div className="space-y-6">
          {/* Upcoming Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#09937F]" />
                <span>{t.calendar.title}</span>
              </h2>
              <Link href="/dashboard/calendar" className="text-xs text-[#09937F] hover:underline">
                {t.actions.all}
              </Link>
            </div>

            <div className="bg-[#0B1210] border border-white/10 rounded-3xl p-5 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-2xl bg-[#050807] border border-white/5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase"
                        style={{
                          backgroundColor: `${event.color || '#09937F'}20`,
                          color: event.color || '#09937F',
                        }}
                      >
                        {event.event_type}
                      </span>
                      <DateDisplay date={event.start_date} locale={locale} className="text-[10px] text-[#9EADA9]" />
                    </div>
                    <div className="text-xs font-bold text-white line-clamp-1">
                      {locale === 'ar' && event.title_ar ? event.title_ar : event.title}
                    </div>
                    {event.location && (
                      <div className="text-[11px] text-[#9EADA9] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#09937F]" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#9EADA9] py-4 text-center">
                  Zero upcoming shoots scheduled
                </div>
              )}
            </div>
          </div>

          {/* Company Tax Status Card */}
          <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4 text-[#09937F]" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {locale === 'ar' ? company.company_name_ar : company.company_name_en}
                </div>
                <div className="text-[10px] text-[#9EADA9] font-mono">{company.cr_number}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">{t.settings.vatTitle}:</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  company.vat_enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-[#9EADA9] border border-white/10'
                }`}>
                  {company.vat_enabled ? 'VAT Registered (10%)' : 'Non-VAT (0%)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">{t.settings.bankName}:</span>
                <span className="text-white text-end truncate max-w-[140px] font-mono text-[11px]">
                  {company.bank_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">IBAN:</span>
                <span className="text-white text-end truncate max-w-[140px] font-mono text-[10px]">
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
