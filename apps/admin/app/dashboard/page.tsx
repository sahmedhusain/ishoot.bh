import * as React from 'react';
import Link from 'next/link';
import {
  getFinancialSummary,
  getCRMDeals,
  getAllInquiries,
  getCompanySettings,
} from '@ishoot/database';
import { Card, Button, CurrencyDisplay, StatusBadge } from '@ishoot/ui';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Inbox,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export default async function DashboardPage() {
  const [finance, deals, inquiries, company] = await Promise.all([
    getFinancialSummary(),
    getCRMDeals(),
    getAllInquiries(),
    getCompanySettings(),
  ]);

  const activePipelineValue = deals
    .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    .reduce((acc, d) => acc + Number(d.value), 0);

  const kpis = [
    {
      label: 'Cash Revenue Collected',
      value: finance.revenue,
      isCurrency: true,
      change: '+14.2%',
      icon: DollarSign,
      color: 'text-[#10B981]',
    },
    {
      label: 'Active Deals Pipeline',
      value: activePipelineValue,
      isCurrency: true,
      change: `${deals.length} active`,
      icon: Briefcase,
      color: 'text-[#09937F]',
    },
    {
      label: 'Outstanding Invoices',
      value: finance.outstanding,
      isCurrency: true,
      change: finance.overdue > 0 ? `${finance.overdue.toFixed(3)} BHD overdue` : 'On track',
      icon: TrendingUp,
      color: 'text-amber-400',
    },
    {
      label: 'Incoming Leads',
      value: inquiries.length,
      isCurrency: false,
      change: 'Recent 7 days',
      icon: Inbox,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Executive Studio Operations
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Real-time telemetry across cinema production, pipeline deals, and financial cashflow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices/new">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>New Invoice</span>
            </Button>
          </Link>
          <Link href="/dashboard/crm/deals">
            <Button variant="secondary" size="sm">
              <span>View Pipeline</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} className="p-5 space-y-3 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#9EADA9]">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {kpi.isCurrency ? (
                  <CurrencyDisplay amount={kpi.value as number} currency="BHD" />
                ) : (
                  kpi.value
                )}
              </div>
              <div className="text-[11px] text-[#9EADA9]/70 flex items-center gap-1">
                <span>{kpi.change}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 2-Column Overview: Active Deals & Quick System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Deal Pipeline Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Active Production Deals
            </h2>
            <Link
              href="/dashboard/crm/deals"
              className="text-xs text-[#09937F] hover:text-[#0BB49B] flex items-center gap-1 transition-colors"
            >
              <span>Full Kanban Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl divide-y divide-white/5">
            {deals.slice(0, 5).map((deal) => (
              <div
                key={deal.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">
                    {deal.title}
                  </div>
                  <div className="text-xs text-[#9EADA9]">
                    {deal.contact?.company || deal.contact?.full_name || 'Direct Lead'}
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

        {/* Right Column (1/3): Company & Tax Status Card */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Entity Configuration
          </h2>

          <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5 text-[#09937F]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{company.company_name_en}</div>
                <div className="text-xs text-[#9EADA9] font-mono">{company.cr_number}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Tax Status:</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                  company.vat_enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/10 text-[#9EADA9] border border-white/10'
                }`}>
                  {company.vat_enabled ? 'VAT Registered (10%)' : 'Non-VAT Entity'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Primary Currency:</span>
                <span className="font-mono font-bold text-white">
                  {company.default_currency} ({company.currency_decimals} Decimals)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">Settlement Bank:</span>
                <span className="text-white text-end max-w-[150px] truncate">{company.bank_name}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9EADA9]">IBAN:</span>
                <span className="font-mono text-white text-[11px] truncate max-w-[150px]">
                  {company.bank_iban}
                </span>
              </div>
            </div>

            <Link href="/dashboard/settings/company" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Manage Company & VAT Settings
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
