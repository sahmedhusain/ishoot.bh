"use client";
import { getCurrencyLabel } from "@ishoot/config/currency";
import { errorMessage } from "../../lib/error-text";
import { useAdminLocale } from "../../hooks/useAdminLocale";

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
  /** VAT lines appear only when the company is VAT-registered or the period holds VAT documents. */
  showVat?: boolean;
}

export function FinancialReportsView({
  report,
  currentBasis,
  dateFrom,
  dateTo,
  showVat = true,
}: FinancialReportsViewProps) {
  const { t, locale } = useAdminLocale();
  const bhd = getCurrencyLabel("BHD", locale === "ar");
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
    const toastId = toast.loading(t.financialReports.generatingFormulaSafeCsvFinancial);
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
        toast.success(t.financialReports.csvExportDownloadedSuccessfully, { id: toastId });
      } else {
        toast.error(t.financialReports.failedToGenerateCsvExport, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.financialReports.exportFailed), { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-mint px-2.5 py-0.5 rounded-full font-medium">
              {t.financialReports.accountingAndPurityStandards}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.financialReports.financialAndTaxSummary}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.financialReports.compliantFinancialReportingSeparatingGross}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-[#111] dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? t.financialDetail.exporting : t.financialReports.exportFormulaSafeCsv}</span>
          </Button>
        </div>
      </div>

      {/* Basis & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-surface-raised border border-ink/10">
        {/* Cash vs Accrual Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase">{t.financialReports.accountingBasis}</span>
          <div className="inline-flex p-1 rounded-md bg-slate-100 dark:bg-neutral-800 border border-ink/10">
            <button
              onClick={() => handleBasisChange("cash")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentBasis === "cash"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t.financialReports.cashBasisReceipts}
            </button>
            <button
              onClick={() => handleBasisChange("accrual")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                currentBasis === "accrual"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t.financialReports.accrualBasisInvoiced}
            </button>
          </div>
        </div>

        {/* Date Filter Form */}
        <form onSubmit={handleApplyDateFilter} className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 px-2.5 py-1 text-slate-800 dark:text-neutral-200"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 px-2.5 py-1 text-slate-800 dark:text-neutral-200"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 rounded-md text-xs font-medium transition-colors"
          >
            {t.financialReports.applyDates}
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
              {t.financialReports.clear}
            </button>
          )}
        </form>
      </div>

      {/* Accounting Method Notice */}
      <div className="p-4 rounded-lg bg-slate-50 dark:bg-neutral-900/40 border border-ink/10 dark:border-white/5 text-xs space-y-1">
        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-accent" />
          <span>
            {currentBasis === "cash"
              ? t.financialReports.cashBasisActiveReflectsActual
              : t.financialReports.accrualBasisActiveReflectsInvoiced}
          </span>
        </div>
        <p className="text-slate-500 dark:text-neutral-400 leading-relaxed text-[11px]">
          {t.financialReports.noticeInComplianceWithFinancial}
        </p>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Operating Net Profit */}
        <div className="bg-primary text-white p-5 rounded-lg space-y-2 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-mint">
            {t.financialReports.operatingNetProfit}{currentBasis})
          </div>
          <div className="text-2xl font-bold font-mono">
            {report.operatingProfit.toFixed(3)}{" "}
            <span className="text-xs font-normal text-white/70">{bhd}</span>
          </div>
          <div className="text-xs text-white/80 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-mint" />
            <span>{t.financialReports.netMargin} {report.netMarginPercentage.toFixed(2)}%</span>
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {showVat ? t.financialReports.netRevenueExclVat : t.financialDetail.revenueNet}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {currentBasis === "cash" ? report.cashNetReceipts.toFixed(3) : report.invoicedNet.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">{bhd}</span>
          </div>
          {showVat && (
            <div className="text-[11px] text-slate-400">
              {t.financialDetail.gross}: {currentBasis === "cash" ? report.cashGrossReceipts.toFixed(3) : report.invoicedGross.toFixed(3)} {bhd}
            </div>
          )}
        </div>

        {/* Output VAT Collected */}
        {showVat && (
        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.financialReports.outputVatNbrTax}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {currentBasis === "cash" ? report.cashOutputVat.toFixed(3) : report.invoicedOutputVat.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">{bhd}</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400">
            {t.financialReports.fiduciaryTaxLiability}
          </div>
        </div>
        )}

        {/* Operating Costs */}
        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.financialReports.operatingExpensesAndCosts}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {(report.expensesNet + report.inputVatNonRecoverable + report.payrollCostsTotal).toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">{bhd}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {t.financialReports.payrollNetVendorInvoices}
          </div>
        </div>
      </div>

      {/* Comprehensive Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" />
            {t.financialReports.n1RevenueAndSalesRealization}
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">{showVat ? t.financialReports.invoicedSalesGrossWithVat : t.financialDetail.invoicedSales}</span>
              <span className="font-mono font-medium">{report.invoicedGross.toFixed(3)} {bhd}</span>
            </div>
            {showVat && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">{t.financialReports.invoicedOutputVat10}</span>
                <span className="font-mono font-medium text-amber-600">-{report.invoicedOutputVat.toFixed(3)} {bhd}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 font-semibold text-slate-900 dark:text-white">
              <span>{t.financialReports.invoicedNetRevenueAccrual}</span>
              <span className="font-mono">{report.invoicedNet.toFixed(3)} {bhd}</span>
            </div>
            <div className="pt-2" />
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">{showVat ? t.financialReports.cashReceiptsCollectedGross : t.financialDetail.cashReceipts}</span>
              <span className="font-mono font-medium">{report.cashGrossReceipts.toFixed(3)} {bhd}</span>
            </div>
            {showVat && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500">{t.financialReports.allocatedCashOutputVat}</span>
                <span className="font-mono font-medium text-amber-600">-{report.cashOutputVat.toFixed(3)} {bhd}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 font-semibold text-slate-900 dark:text-white">
              <span>{t.financialReports.cashNetReceiptsCashBasis}</span>
              <span className="font-mono text-primary dark:text-mint">
                {report.cashNetReceipts.toFixed(3)} {bhd}
              </span>
            </div>
          </div>
        </Card>

        {/* Expenses & VAT Recoverability Breakdown */}
        <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            {t.financialReports.n2OperatingExpensesAndInput}
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">{showVat ? t.financialReports.totalExpensesGrossWithVat : t.financialDetail.totalExpenses}</span>
              <span className="font-mono font-medium">{report.totalExpensesGross.toFixed(3)} {bhd}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5">
              <span className="text-slate-500">{t.financialReports.netOperatingExpenses}</span>
              <span className="font-mono font-medium">{report.expensesNet.toFixed(3)} {bhd}</span>
            </div>
            {showVat && (
              <>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 text-emerald-600 dark:text-emerald-400">
                  <span>{t.financialReports.recoverableInputVatClaimableFrom}</span>
                  <span className="font-mono font-medium">+{report.inputVatRecoverable.toFixed(3)} {bhd}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 text-slate-500">
                  <span>{t.financialReports.nonRecoverableInputVatCost}</span>
                  <span className="font-mono font-medium">{report.inputVatNonRecoverable.toFixed(3)} {bhd}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-white/5 font-semibold text-slate-900 dark:text-white">
              <span>{t.financialReports.payrollAndEmployeeCostsTotal}</span>
              <span className="font-mono">{report.payrollCostsTotal.toFixed(3)} {bhd}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-500">
              <span>{t.financialReports.bankProcessingFees}</span>
              <span className="font-mono font-medium">{report.bankFeesTotal.toFixed(3)} {bhd}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* FX & Settlement Realization */}
      <Card className="p-6 bg-white dark:bg-surface-raised border border-ink/10 rounded-lg space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono border-b border-ink/10 pb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent" />
          {t.financialReports.n3MultiCurrencySettlementAnd}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">{t.financialReports.commercialPricingPolicy}</span>
            <p className="text-slate-600 dark:text-neutral-400 leading-relaxed text-[11px]">
              {t.financialReports.foreignCurrencyQuotationsUsdSar}
            </p>
          </div>
          <div>
            <span className="text-slate-400 block mb-1">{t.financialReports.bankSettlementReconciliation}</span>
            <p className="text-slate-600 dark:text-neutral-400 leading-relaxed text-[11px]">
              {t.financialReports.actualBankSettlementCreditsIn}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-neutral-900/50 rounded-md border border-ink/10 space-y-1">
            <span className="text-slate-400 uppercase font-mono text-[10px]">{t.financialReports.realizedFxImpactBhd}</span>
            <div className={`text-xl font-bold font-mono ${report.realizedFxGainLoss >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {report.realizedFxGainLoss >= 0 ? `+${report.realizedFxGainLoss.toFixed(3)}` : report.realizedFxGainLoss.toFixed(3)} {bhd}
            </div>
            <div className="text-[11px] text-slate-400">{t.financialReports.netFxGainLossOn}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
