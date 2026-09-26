import * as React from 'react';
import {
  getFinancialSummary,
  getAllExpenses,
  getExpenseCategories,
  getAllInvoices,
} from '@ishoot/database';
import { Card, CurrencyDisplay, Badge } from '@ishoot/ui';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Percent,
  Receipt,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default async function FinancialDashboardPage() {
  const [finance, expenses, categories, invoices] = await Promise.all([
    getFinancialSummary(),
    getAllExpenses(),
    getExpenseCategories(),
    getAllInvoices(),
  ]);

  // Aggregate expenses by category
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
          Financial Intelligence & P&L Dashboard
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          Executive financial reporting: Cashflow telemetry, operating expenditures, profit margins, and tax tracking.
        </p>
      </div>

      {/* 1. Core Financial Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Cash Revenue */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>Liquid Cash Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.revenue} currency="BHD" />
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            Verified cash deposited
          </div>
        </Card>

        {/* Total Operating Costs */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>Operating Expenditures</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.expenses} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]">
            Across production & studio overhead
          </div>
        </Card>

        {/* Net Operating Profit */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>Net Operating Profit</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold font-mono ${finance.netProfit >= 0 ? 'text-[#09937F]' : 'text-rose-400'}`}>
            <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#09937F] font-mono">
            Revenue minus Total Expenses
          </div>
        </Card>

        {/* Profit Margin % */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>Net Profit Margin</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {finance.profitMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-amber-400/90 font-mono">
            Commercial profit efficiency
          </div>
        </Card>
      </div>

      {/* 2. Visual Breakdown: Expenses by Category & Receivables Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Expenses by Category */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#09937F]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Cost Breakdown by Category
              </h3>
            </div>
            <span className="text-xs font-mono text-[#9EADA9]">{categories.length} Categories</span>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const catAmount = categoryTotals[cat.slug] || 0;
              const percent = finance.expenses > 0 ? (catAmount / finance.expenses) * 100 : 0;

              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{cat.name_en}</span>
                    <span className="font-mono text-[#9EADA9]">
                      <CurrencyDisplay amount={catAmount} currency="BHD" /> ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: cat.color || '#09937F',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Receivables Aging & Commercial Adjustments */}
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Accounts Receivable & Deductions
              </h3>
            </div>
            <span className="text-xs font-mono text-[#9EADA9]">Billing Aging</span>
          </div>

          <div className="space-y-4">
            {/* Overdue */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Overdue Invoices</div>
                  <div className="text-[11px] text-[#9EADA9]">Past payment terms</div>
                </div>
              </div>
              <div className="text-base font-mono font-bold text-rose-400">
                <CurrencyDisplay amount={finance.overdue} currency="BHD" />
              </div>
            </div>

            {/* Total Outstanding */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Active Receivables Due</div>
                  <div className="text-[11px] text-[#9EADA9]">Sent & Partially Paid</div>
                </div>
              </div>
              <div className="text-base font-mono font-bold text-amber-400">
                <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
              </div>
            </div>

            {/* Commercial Discounts Given */}
            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Commercial Discounts Allowed</div>
                <div className="text-[11px] text-[#9EADA9]">Client concessions granted</div>
              </div>
              <div className="text-base font-mono font-bold text-[#09937F]">
                <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
              </div>
            </div>

            {/* VAT Collected */}
            <div className="p-4 rounded-xl bg-[#050807] border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">VAT Collected (Output Tax)</div>
                <div className="text-[11px] text-[#9EADA9]">
                  {finance.vatCollected > 0 ? 'Bahrain NBR 10%' : 'Non-VAT Entity (0.000 BHD)'}
                </div>
              </div>
              <div className="text-base font-mono font-bold text-white">
                <CurrencyDisplay amount={finance.vatCollected} currency="BHD" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Structured Profit & Loss Statement (P&L) */}
      <Card className="p-6 sm:p-8 bg-[#0B1210] border border-white/10 rounded-3xl space-y-6">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-display">
            Comprehensive Profit & Loss Statement (P&L)
          </h2>
          <p className="text-xs text-[#9EADA9]">
            Full executive breakdown of gross revenues, operational deductions, net margins, and tax obligations.
          </p>
        </div>

        <div className="divide-y divide-white/5 font-mono text-xs">
          {/* INCOME SECTION */}
          <div className="py-4 space-y-2">
            <div className="text-xs font-bold text-[#09937F] uppercase tracking-wider font-sans">
              1. Operating Revenue & Receivables
            </div>
            <div className="flex justify-between pl-4 text-white">
              <span>Liquid Cash Collected (Payments Ledger):</span>
              <span className="font-bold">+{finance.revenue.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between pl-4 text-[#9EADA9]">
              <span>Pending Receivables Outstanding:</span>
              <span>+{finance.outstanding.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between pl-4 pt-1 font-bold text-white border-t border-white/5">
              <span>Total Accrued Revenue:</span>
              <span>+{(finance.revenue + finance.outstanding).toFixed(3)} BHD</span>
            </div>
          </div>

          {/* DEDUCTIONS & DISCOUNTS */}
          <div className="py-4 space-y-2">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider font-sans">
              2. Commercial Adjustments
            </div>
            <div className="flex justify-between pl-4 text-rose-400">
              <span>Commercial Client Discounts Deducted:</span>
              <span>-{finance.discountsGiven.toFixed(3)} BHD</span>
            </div>
          </div>

          {/* OPERATING EXPENDITURES */}
          <div className="py-4 space-y-2">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider font-sans">
              3. Operating Costs & Production Expenses
            </div>
            {categories.map((cat) => {
              const amount = categoryTotals[cat.slug] || 0;
              if (amount === 0) return null;
              return (
                <div key={cat.id} className="flex justify-between pl-4 text-[#9EADA9]">
                  <span>{cat.name_en}:</span>
                  <span>-{amount.toFixed(3)} BHD</span>
                </div>
              );
            })}
            <div className="flex justify-between pl-4 pt-1 font-bold text-rose-400 border-t border-white/5">
              <span>Total Operational Costs:</span>
              <span>-{finance.expenses.toFixed(3)} BHD</span>
            </div>
          </div>

          {/* REGULATORY TAX (VAT) */}
          <div className="py-4 space-y-2">
            <div className="text-xs font-bold text-white/80 uppercase tracking-wider font-sans">
              4. Regulatory Value Added Tax (VAT)
            </div>
            <div className="flex justify-between pl-4 text-[#9EADA9]">
              <span>VAT Rate Status:</span>
              <span className="text-white">
                {finance.vatCollected > 0 ? '10.00% Standard' : '0.00% (Non-VAT Entity)'}
              </span>
            </div>
            <div className="flex justify-between pl-4 text-white">
              <span>Total Output VAT Due to NBR:</span>
              <span>{finance.vatCollected.toFixed(3)} BHD</span>
            </div>
          </div>

          {/* NET BOTTOM LINE PROFIT */}
          <div className="pt-6 pb-2 flex items-center justify-between text-base sm:text-lg font-bold text-white font-sans border-t-2 border-white/20">
            <div>
              <div>NET OPERATING BOTTOM-LINE PROFIT</div>
              <div className="text-xs text-[#09937F] font-mono font-normal">
                Cash Margin: {finance.profitMargin.toFixed(1)}%
              </div>
            </div>
            <div className="font-mono text-xl sm:text-2xl text-[#09937F]">
              <CurrencyDisplay amount={finance.netProfit} currency="BHD" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
