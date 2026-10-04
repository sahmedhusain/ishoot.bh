"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { FinancialSummaryReport } from "@ishoot/database";
import { Card, Button } from "@ishoot/ui";
import {
  Download,
  Receipt,
  TrendingUp,
  HelpCircle,
  DollarSign,
  Globe,
} from "lucide-react";
import { exportFinancialReportCsvAction } from "../../app/actions/finance";
import { toast } from "sonner";

interface FinancialReportsViewProps {
  report: FinancialSummaryReport;
  currentBasis: "cash" | "accrual";
  dateFrom?: string;
  dateTo?: string;
}

export function FinancialReportsView({
  report,
  currentBasis,
  dateFrom,
  dateTo,
}: FinancialReportsViewProps) {
  const router = useRouter();
  const [exporting, setExporting] = React.useState(false);

  const [filterDateFrom, setFilterDateFrom] = React.useState(dateFrom || "");
  const [filterDateTo, setFilterDateTo] = React.useState(dateTo || "");

  const handleBasisChange = (newBasis: "cash" | "accrual") => {
    const params = new URLSearchParams();
    params.set("basis", newBasis);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    router.push(`${ROUTES.finance.reports}?${params.toString()}`);
  };

  const handleApplyDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("basis", currentBasis);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    router.push(`${ROUTES.finance.reports}?${params.toString()}`);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    const toastId = toast.loading("Generating formula-safe CSV financial report...");
    try {
      const res = await exportFinancialReportCsvAction({
        basis: currentBasis,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename || `financial_report_${currentBasis}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("CSV export downloaded successfully", { id: toastId });
      } else {
        toast.error("Failed to generate CSV export", { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-[#7de0d1] px-2.5 py-0.5 rounded-full font-medium">
              Accounting & Purity Standards
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Financial & Tax Summary
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Compliant financial reporting separating gross receipts, output VAT, net revenue, recoverable VAT, and payroll costs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-[#111] dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? "Exporting..." : "Export Formula-Safe CSV"}</span>
          </Button>
        </div>
      </div>

      {/* Basis & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10">
        {/* Cash vs Accrual Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase">Accounting Basis:</span>
          <div className="inline-flex p-1 rounded-md bg-slate-100 dark:bg-neutral-800 border border-[#EAEAEA] dark:border-white/10">
            <button
              onClick={() => handleBasisChange("cash")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentBasis === "cash"
                  ? "bg-[#014842] text-white shadow-xs"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Cash Basis (Receipts)
            </button>
            <button
              onClick={() => handleBasisChange("accrual")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentBasis === "accrual"
                  ? "bg-[#014842] text-white shadow-xs"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Accrual Basis (Invoiced)
            </button>
          </div>
        </div>

        {/* Date Filter Form */}
        <form onSubmit={handleApplyDateFilter} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 px-2.5 py-1 text-slate-800 dark:text-neutral-200"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 px-2.5 py-1 text-slate-800 dark:text-neutral-200"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-md text-xs font-medium transition-colors"
          >
            Apply Dates
          </button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setFilterDateFrom("");
                setFilterDateTo("");
                router.push(`${ROUTES.finance.reports}?basis=${currentBasis}`);
              }}
              className="text-xs text-slate-400 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Accounting Method Notice */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-[#EAEAEA] dark:border-white/5 text-xs space-y-1">
        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#09937F]" />
          <span>
            {currentBasis === "cash"
              ? "Cash Basis Active: Reflects actual cash inflows and outflows"
              : "Accrual Basis Active: Reflects invoiced revenue and incurred expenses regardless of payment timing"}
          </span>
        </div>
        <p className="text-slate-500 dark:text-neutral-400 leading-relaxed text-[11px]">
          Notice: In compliance with financial purity rules, revenue and net margins exclude output VAT collected on behalf of NBR Bahrain. Recoverable input VAT is treated as a tax asset and excluded from operating costs.
        </p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operating Net Profit */}
        <div className="bg-[#014842] text-white p-5 rounded-lg space-y-2 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-[#7de0d1]">
            Operating Net Profit ({currentBasis})
          </div>
          <div className="text-2xl font-bold font-mono">
            {report.operatingProfit.toFixed(3)}{" "}
            <span className="text-xs font-normal text-white/70">BHD</span>
          </div>
          <div className="text-xs text-white/80 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#7de0d1]" />
            <span>Net Margin: {report.netMarginPercentage.toFixed(2)}%</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            Net Revenue (Excl. VAT)
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {currentBasis === "cash" ? report.cashNetReceipts.toFixed(3) : report.invoicedNet.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">BHD</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Gross: {currentBasis === "cash" ? report.cashGrossReceipts.toFixed(3) : report.invoicedGross.toFixed(3)} BHD
          </div>
        </div>

        {/* Output VAT Collected */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            Output VAT (NBR Tax)
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {currentBasis === "cash" ? report.cashOutputVat.toFixed(3) : report.invoicedOutputVat.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">BHD</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            Fiduciary tax liability
          </div>
        </div>

        {/* Operating Costs */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            Operating Expenses & Costs
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {(report.expensesNet + report.inputVatNonRecoverable + report.payrollCostsTotal).toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">BHD</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Payroll + Net Vendor Invoices
          </div>
        </div>
      </div>

      {/* Comprehensive Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#09937F]" />
            1. Revenue & Sales Realization
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Invoiced Sales (Gross with VAT)</span>
              <span className="font-mono font-medium">{report.invoicedGross.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Invoiced Output VAT (10%)</span>
              <span className="font-mono font-medium text-amber-600">-{report.invoicedOutputVat.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 font-semibold text-slate-900 dark:text-white">
              <span>Invoiced Net Revenue (Accrual)</span>
              <span className="font-mono">{report.invoicedNet.toFixed(3)} BHD</span>
            </div>
            <div className="pt-2" />
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Cash Receipts Collected (Gross)</span>
              <span className="font-mono font-medium">{report.cashGrossReceipts.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Allocated Cash Output VAT</span>
              <span className="font-mono font-medium text-amber-600">-{report.cashOutputVat.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 font-semibold text-slate-900 dark:text-white">
              <span>Cash Net Receipts (Cash Basis Revenue)</span>
              <span className="font-mono text-[#014842] dark:text-[#7de0d1]">
                {report.cashNetReceipts.toFixed(3)} BHD
              </span>
            </div>
          </div>
        </Card>

        {/* Expenses & VAT Recoverability Breakdown */}
        <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#09937F]" />
            2. Operating Expenses & Input VAT
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Total Expenses (Gross with VAT)</span>
              <span className="font-mono font-medium">{report.totalExpensesGross.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">Net Operating Expenses</span>
              <span className="font-mono font-medium">{report.expensesNet.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400">
              <span>Recoverable Input VAT (Claimable from NBR)</span>
              <span className="font-mono font-medium">+{report.inputVatRecoverable.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 text-slate-500">
              <span>Non-Recoverable Input VAT (Cost)</span>
              <span className="font-mono font-medium">{report.inputVatNonRecoverable.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 font-semibold text-slate-900 dark:text-white">
              <span>Payroll & Employee Costs Total</span>
              <span className="font-mono">{report.payrollCostsTotal.toFixed(3)} BHD</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-500">
              <span>Bank Processing Fees</span>
              <span className="font-mono font-medium">{report.bankFeesTotal.toFixed(3)} BHD</span>
            </div>
          </div>
        </Card>
      </div>

      {/* FX & Settlement Realization */}
      <Card className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-[#EAEAEA] dark:border-white/10 pb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#09937F]" />
          3. Multi-Currency Settlement & Realized FX Gain/Loss
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Commercial Pricing Policy</span>
            <p className="text-slate-600 dark:text-neutral-400 leading-relaxed text-[11px]">
              Foreign currency quotations (USD, SAR, AED, EUR, GBP) apply a mandatory 3% exchange buffer built directly into unit pricing to safeguard gross margins.
            </p>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">Bank Settlement Reconciliation</span>
            <p className="text-slate-600 dark:text-neutral-400 leading-relaxed text-[11px]">
              Actual bank settlement credits in BHD are matched against foreign currency receivables, recording realized bank fees and conversion variance distinctly.
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-neutral-900/50 rounded-md border border-[#EAEAEA] dark:border-white/10 space-y-1">
            <span className="text-slate-400 uppercase font-mono text-[10px]">Realized FX Impact (BHD)</span>
            <div className={`text-xl font-bold font-mono ${report.realizedFxGainLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {report.realizedFxGainLoss >= 0 ? `+${report.realizedFxGainLoss.toFixed(3)}` : report.realizedFxGainLoss.toFixed(3)} BHD
            </div>
            <div className="text-[11px] text-slate-400">Net FX gain/loss on closed settlements</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
