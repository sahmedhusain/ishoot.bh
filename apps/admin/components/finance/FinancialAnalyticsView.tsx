"use client";

import * as React from "react";
import type {
  FinancialSummary,
  Expense,
  ExpenseCategory,
  Invoice,
} from "@ishoot/database/types";
import { Card, CurrencyDisplay } from "@ishoot/ui";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Percent,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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
    const slug = e.category?.slug || "other";
    categoryTotals[slug] = (categoryTotals[slug] || 0) + Number(e.amount);
  });

  const chartData = [
    {
      name: "Jan",
      revenue: finance.revenue * 0.1,
      expenses: finance.expenses * 0.12,
    },
    {
      name: "Feb",
      revenue: finance.revenue * 0.15,
      expenses: finance.expenses * 0.1,
    },
    {
      name: "Mar",
      revenue: finance.revenue * 0.2,
      expenses: finance.expenses * 0.18,
    },
    {
      name: "Apr",
      revenue: finance.revenue * 0.25,
      expenses: finance.expenses * 0.2,
    },
    {
      name: "May",
      revenue: finance.revenue * 0.1,
      expenses: finance.expenses * 0.15,
    },
    {
      name: "Jun",
      revenue: finance.revenue * 0.2,
      expenses: finance.expenses * 0.25,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          {t.charts.pnlStatement}
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">{t.charts.pnlSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          <div className="text-[11px] text-[#9EADA9]">{t.kpi.expensesDesc}</div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.netProfit}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono ${finance.netProfit >= 0 ? "text-[#09937F]" : "text-rose-400"}`}
          >
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F] font-mono">
            {t.financialView.revenueMinusExpenses}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.profitMargin}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono ${finance.profitMargin >= 0 ? "text-[#09937F]" : "text-rose-400"}`}
          >
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#9EADA9]">
            {t.financialView.acrossContracts}
          </div>
        </Card>
      </div>

      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-[#09937F]" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              {t.kpi.totalRevenue} vs {t.kpi.operatingExpenses}
            </h2>
          </div>
        </div>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#9EADA9"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9EADA9"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0B1210",
                  borderColor: "rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ fontWeight: "bold" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#F43F5E"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorExpenses)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">
                {t.charts.grossRevenue}
              </span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.depositedViaBank}
              </p>
            </div>
            <span className="font-mono font-bold text-emerald-400 text-base">
              +<CurrencyDisplay amount={finance.revenue} currency="BHD" />
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-white font-medium">
                {t.charts.discountsGiven}
              </span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.approvedDiscounts}
              </p>
            </div>
            <span className="font-mono text-amber-400">
              -
              <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
            </span>
          </div>

          <div className="py-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-white">
                {t.charts.operatingCosts}
              </span>
              <p className="text-xs text-[#9EADA9]">
                {t.financialView.productionCostsDesc}
              </p>
            </div>
            <span className="font-mono font-bold text-rose-400 text-base">
              -<CurrencyDisplay amount={finance.expenses} currency="BHD" />
            </span>
          </div>

          <div className="py-4 flex items-center justify-between bg-[#050807] px-4 rounded-xl my-2">
            <span className="font-bold text-white">
              {t.charts.bottomLineProfit}
            </span>
            <span
              className={`font-mono font-bold text-lg ${finance.netProfit >= 0 ? "text-[#09937F]" : "text-rose-400"}`}
            >
              <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
          {t.charts.expensesByCategory}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {categories.map((c) => {
            const sum = categoryTotals[c.slug] || 0;
            const percentage =
              finance.expenses > 0 ? (sum / finance.expenses) * 100 : 0;
            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-[#050807] border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {locale === "ar" ? c.name_ar : c.name_en}
                  </span>
                  <span className="text-[11px] font-mono text-[#9EADA9]">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="text-base font-bold text-white font-mono">
                  <CurrencyDisplay amount={sum} currency="BHD" />
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: c.color || "#09937F",
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
