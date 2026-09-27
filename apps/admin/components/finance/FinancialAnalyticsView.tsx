'use client';

import * as React from 'react';
import type { FinancialSummary, Expense, ExpenseCategory, Invoice } from '@ishoot/database/types';
import { Card, CurrencyDisplay } from '@ishoot/ui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Percent,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface FinancialAnalyticsViewProps {
  finance: FinancialSummary;
  expenses: Expense[];
  categories: ExpenseCategory[];
  invoices: Invoice[];
}

export function FinancialAnalyticsView({
  finance,
  expenses,
  categories,
  invoices,
}: FinancialAnalyticsViewProps) {
  const { t, locale } = useAdminLocale();

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const slug = e.category?.slug || 'other';
    categoryTotals[slug] = (categoryTotals[slug] || 0) + Number(e.amount);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          {t.charts.pnlStatement}
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          {t.charts.pnlSubtitle}
        </p>
      </div>

      {/* 4 Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Cash Revenue */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.totalRevenue}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.revenue} currency="BHD" />
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            {t.kpi.revenueDesc}
          </div>
        </Card>

        {/* Total Operating Costs */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.operatingExpenses}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.expenses} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]">
            {t.kpi.expensesDesc}
          </div>
        </Card>

        {/* Net Operating Profit */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.netProfit}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono ${finance.netProfit >= 0 ? 'text-[#09937F]' : 'text-rose-400'}`}>
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F] font-mono">
            {t.financialView.revenueMinusExpenses}
          </div>
        </Card>

        {/* Profit Margin % */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.profitMargin}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono ${finance.profitMargin >= 0 ? 'text-[#09937F]' : 'text-rose-400'}`}>
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#9EADA9]">
            {t.financialView.acrossContracts}
          </div>
        </Card>
      </div>

      {/* 2. Structured P&L Table */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <PieChart className="w-5 h-5 text-[#09937F]" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              {t.charts.pnlStatement}
            </h2>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/5 text-[#9EADA9]">
            {t.financialView.fiscalYear}
          </span>
        </div>

        <div className="divide-y divide-white/5 text-sm">
          {/* Revenue */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">{t.charts.grossRevenue}</span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.depositedViaBank}
              </p>
            </div>
            <span className="font-mono font-bold text-emerald-400 text-base">
              +<CurrencyDisplay amount={finance.revenue} currency="BHD" />
            </span>
          </div>

          {/* Discounts */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-white font-medium">{t.charts.discountsGiven}</span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.approvedDiscounts}
              </p>
            </div>
            <span className="font-mono text-amber-400">
              -<CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
            </span>
          </div>

          {/* Cost of Production */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">{t.charts.operatingCosts}</span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.productionCostsDesc}
              </p>
            </div>
            <span className="font-mono font-bold text-rose-400 text-base">
              -<CurrencyDisplay amount={finance.expenses} currency="BHD" />
            </span>
          </div>

          {/* Operating Net Margin */}
          <div className="py-4 flex items-center justify-between bg-[#050807] px-4 rounded-xl my-2">
            <span className="font-bold text-white">{t.charts.bottomLineProfit}</span>
            <span className={`font-mono font-bold text-lg ${finance.netProfit >= 0 ? 'text-[#09937F]' : 'text-rose-400'}`}>
              <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Expense Breakdown by Category */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
          {t.charts.expensesByCategory}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {categories.map((c) => {
            const sum = categoryTotals[c.slug] || 0;
            const percentage = finance.expenses > 0 ? (sum / finance.expenses) * 100 : 0;
            return (
              <div key={c.id} className="p-4 rounded-2xl bg-[#050807] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {locale === 'ar' ? c.name_ar : c.name_en}
                  </span>
                  <span className="text-[11px] font-mono text-[#9EADA9]">{percentage.toFixed(0)}%</span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  <CurrencyDisplay amount={sum} currency="BHD" />
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: c.color || '#09937F',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
