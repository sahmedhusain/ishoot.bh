"use client";
import { useCompanyCurrency } from "@platform/ui";
import { errorMessage } from "../../lib/error-text";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@platform/database/constants/routes";
import type { PayrollRun } from "@platform/database/types";
import { Card, Button, Input, Select, Modal } from "@platform/ui";
import {
  DollarSign,
  Plus,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck,
  RefreshCw,
  CalendarCheck,
  Settings2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  generatePayrollRunAction,
  submitPayrollRunForApprovalAction,
  approvePayrollRunAction,
  markPayrollRunPaidAction,
  recalculatePayrollRunAction,
} from "../../app/actions/payroll";
import { toast } from "sonner";

interface PayrollManagementViewProps {
  runs: PayrollRun[];
  currentUserId: string;
  /** Runs the current user may approve under the payroll approval policy. */
  decidableRunIds: string[];
  /** May adjust individual salary lines, submit runs and mark them paid. */
  canEdit?: boolean;
  /** May generate a monthly run. */
  canCreate?: boolean;
  /** May record salary payments. */
  canPay?: boolean;
}

export function PayrollManagementView({
  runs,
  decidableRunIds,
  canEdit = false,
  canCreate = false,
  canPay = false,
}: PayrollManagementViewProps) {
  const companyCurrency = useCompanyCurrency();
  const modalFormId = React.useId();

  const { t, locale, isRTL } = useAdminLocale();
  const [payAllRun, setPayAllRun] = React.useState<string | null>(null);
  const [payMethod, setPayMethod] = React.useState("bank_transfer");
  const [payReference, setPayReference] = React.useState("");
  const [search, setSearch] = React.useState("");
  const fmt = (value: number) => new Intl.NumberFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-BH", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
  const fill = (template: string, values: Record<string, string | number>) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
  const RowArrow = isRTL ? ChevronLeft : ChevronRight;
  const router = useRouter();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = React.useState<string | null>(
    runs[0]?.id || null,
  );

  // Generate Run Modal
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const generateFormId = React.useId();
  const generatePending = React.useRef(false);
  const [generateError, setGenerateError] = React.useState("");
  const [generateMonth, setGenerateMonth] = React.useState(
    new Date().getMonth() + 1,
  );
  const [generateYear, setGenerateYear] = React.useState(
    new Date().getFullYear(),
  );
  const [generating, setGenerating] = React.useState(false);

  // High-level aggregates
  const totalNetDisbursed = runs.reduce(
    (sum, r) => sum + (Number(r.totalNet) || 0),
    0,
  );
  const totalEmployerCosts = runs.reduce(
    (sum, r) => sum + (Number(r.totalEmployerCost) || 0),
    0,
  );

  const months = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, month, 1)),
    ),
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generatePending.current) return;
    generatePending.current = true; setGenerateError(""); setGenerating(true);
    const toastId = toast.loading(t.hrExtensions.working);
    try {
      const res = await generatePayrollRunAction(generateMonth, generateYear);
      if (res.success && res.payrollRun) {
        toast.success(t.hrExtensions.saved, { id: toastId });
        setShowGenerateModal(false);
        setExpandedRunId(res.payrollRun.id);
        router.refresh();
      } else {
        setGenerateError(t.payrollManagement.failedToGeneratePayrollRun);
        toast.error(t.payrollManagement.failedToGeneratePayrollRun, { id: toastId });
      }
    } catch (err: unknown) {
      setGenerateError(errorMessage(err, t, t.payrollManagement.calculationFailed));
      toast.error(errorMessage(err, t, t.payrollManagement.calculationFailed), {
        id: toastId,
      });
    } finally {
      generatePending.current = false; setGenerating(false);
    }
  };

  const handleSubmitForApproval = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.payrollManagement.submittingPayrollRunForSuper);
    try {
      const res = await submitPayrollRunForApprovalAction(runId);
      if (res.success) {
        toast.success(t.payrollManagement.payrollRunSubmittedForSuper, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.payrollManagement.submissionFailed, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.payrollManagement.errorSubmitting), {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.payrollManagement.recordingSuperAdminPayrollApproval);
    try {
      const res = await approvePayrollRunAction(runId);
      if (res.success) {
        toast.success(t.payrollManagement.payrollRunApprovedSuccessfully, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.payrollManagement.approvalFailed, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.payrollManagement.errorApproving), {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleRecalculate = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.payrollManagement.calculating);
    try {
      await recalculatePayrollRunAction(runId);
      toast.success(t.payroll.recalculated, { id: toastId });
      router.refresh();
    } catch (err: unknown) {
      setGenerateError(errorMessage(err, t, t.payrollManagement.calculationFailed));
      toast.error(errorMessage(err, t, t.payrollManagement.calculationFailed), { id: toastId });
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkPaid = async (runId: string) => {
    setLoadingId(runId);
    setPayAllRun(null);
    const toastId = toast.loading(t.payrollManagement.recordingSettlementAndGeneratingIndividual);
    try {
      const res = await markPayrollRunPaidAction(runId, { method: payMethod, reference: payReference.trim() || null });
      if (res.success) {
        toast.success(t.payrollManagement.payrollMarkedAsPaidIndividual, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.payrollManagement.failedToMarkPaid, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.payrollManagement.errorSettlingPayroll), {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6" data-page-header>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent bg-secondary-container dark:bg-tone-15/40 dark:text-mint px-2.5 py-0.5 rounded-full font-medium">
              {t.payrollManagement.hrAndStatutoryPayroll}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink dark:text-ink mt-1">
            {t.payrollManagement.payrollAndCompensationRuns}
          </h1>
          <p className="text-sm text-ink-muted dark:text-ink-muted mt-1">
            {t.payrollManagement.employeeSpecificGosiSettingsAllowances}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={ROUTES.hr.attendance} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-outline-variant px-3.5 text-xs font-medium text-primary hover:bg-primary/[0.06] dark:text-accent">
            <CalendarCheck className="w-3.5 h-3.5" />
            {t.payroll.attendanceLink}
          </Link>
          {canEdit && (
            <Link href={ROUTES.hr.settings} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-outline-variant px-3.5 text-xs font-medium text-primary hover:bg-primary/[0.06] dark:text-accent">
              <Settings2 className="w-3.5 h-3.5" />
              {t.payroll.settingsLink}
            </Link>
          )}
          {canCreate && <Button
            onClick={() => { setGenerateError(""); setShowGenerateModal(true); }}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.payrollManagement.generateMonthlyRun}</span>
          </Button>}
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.payrollManagement.totalNetSalaryOutlay}
          </div>
          <div className="text-2xl font-bold font-mono text-ink dark:text-ink">
            {totalNetDisbursed.toFixed(3)}{" "}
            <span className="text-xs font-normal text-ink-muted">
              {companyCurrency}
            </span>
          </div>
          <div className="text-xs text-ink-muted">{t.payrollManagement.netPaidAcrossAllRuns}</div>
        </div>

        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.payrollManagement.totalEmployerGosiAndCosts}
          </div>
          <div className="text-2xl font-bold font-mono text-ink dark:text-ink">
            {totalEmployerCosts.toFixed(3)}{" "}
            <span className="text-xs font-normal text-ink-muted">
              {companyCurrency}
            </span>
          </div>
          <div className="text-xs text-ink-muted">{t.payrollManagement.includingStatutoryEmployerContributions}</div>
        </div>

        <div className="bg-surface-raised dark:bg-surface-raised border border-outline-variant p-5 rounded-lg space-y-1">
          <div className="text-xs text-ink-muted dark:text-ink-muted uppercase tracking-wider font-mono">
            {t.payrollManagement.recordedPayrollCycles}
          </div>
          <div className="text-2xl font-bold font-mono text-primary dark:text-mint">
            {runs.length}
          </div>
          <div className="text-xs text-ink-muted">{t.payrollManagement.historicalAndActiveRuns}</div>
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-6">
        {runs.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed border-outline-variant bg-white/50 dark:bg-surface-raised/50">
            <DollarSign className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <h3 className="text-base font-semibold text-ink dark:text-ink">
              {t.payrollManagement.noPayrollRunsGenerated}
            </h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1 mb-4">
              {t.payrollManagement.generateAMonthlyPayrollRun}
            </p>
            {canCreate && (
              <Button
                onClick={() => { setGenerateError(""); setShowGenerateModal(true); }}
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 text-xs rounded-md"
              >
                {t.payrollManagement.generateFirstRun}
              </Button>
            )}
          </div>
        ) : (
          runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const monthName = months[run.month - 1];

            return (
              <Card
                key={run.id}
                className="bg-surface-raised dark:bg-surface-raised border border-outline-variant rounded-lg overflow-hidden space-y-0"
              >
                {/* Run Summary Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-raised/50 dark:bg-surface-raised/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setExpandedRunId(isExpanded ? null : run.id)
                      }
                      className="p-1.5 rounded-md hover:bg-surface-sunken dark:hover:bg-surface-raised text-ink-muted transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-ink dark:text-ink">
                          {monthName} {run.year}
                        </span>
                        <span
                          className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${run.status === "paid"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : run.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : run.status === "submitted"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-ink/5 text-ink"
                            }`}
                        >
                          {(t.hrExtensions as Record<string, string>)[
                            run.status
                          ] || run.status}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted dark:text-ink-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{run.items?.length || 0} {t.payrollManagement.employeesIncluded}</span>
                        {run.attendanceStart && run.attendanceEnd && (
                          <span><bdi dir="ltr">{fill(t.payroll.attendanceWindow, { start: run.attendanceStart.slice(0, 10), end: run.attendanceEnd.slice(0, 10) })}</bdi></span>
                        )}
                        {run.payDate && <span>{fill(t.payroll.payDate, { date: run.payDate.slice(0, 10) })}</span>}
                        {(run.status === "approved" || run.status === "paid") && (
                          <span>{fill(t.payroll.paidCount, { paid: run.items?.filter((i) => i.paymentStatus === "paid").length ?? 0, total: run.items?.length ?? 0 })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-ink-muted block text-[10px] uppercase font-mono">
                        {t.payrollManagement.grossTotal}
                      </span>
                      <span className="font-mono font-semibold text-ink dark:text-ink">
                        {Number(run.totalGross).toFixed(3)}
                        {companyCurrency}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-muted block text-[10px] uppercase font-mono">
                        {t.payroll.deductions}
                      </span>
                      <span className="font-mono font-semibold text-amber-600">
                        -{Number(run.totalDeductions).toFixed(3)}
                        {companyCurrency}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-muted block text-[10px] uppercase font-mono">
                        {t.payrollManagement.netPayout}
                      </span>
                      <span className="font-mono font-bold text-primary dark:text-mint">
                        {Number(run.totalNet).toFixed(3)}
                        {companyCurrency}
                      </span>
                    </div>

                    <div>
                      <span className="text-ink-muted block text-[10px] uppercase font-mono">
                        {t.payrollManagement.totalEmployerCost}
                      </span>
                      <span className="font-mono font-semibold text-ink dark:text-ink">
                        {Number(run.totalEmployerCost).toFixed(3)}
                        {companyCurrency}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-t border-outline-variant pt-3 sm:w-auto sm:border-t-0 sm:border-s sm:ps-4 sm:pt-0">
                      {canEdit && (run.status === "draft" || run.status === "calculated") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecalculate(run.id)}
                          disabled={loadingId === run.id}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingId === run.id ? "animate-spin" : ""}`} />
                          {t.payroll.recalculate}
                        </Button>
                      )}
                      {canEdit && (run.status === "draft" || run.status === "calculated") && (
                        <Button
                          onClick={() => handleSubmitForApproval(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1.5 text-xs rounded-md"
                        >
                          <Send className="w-3.5 h-3.5 me-1 inline" />
                          {t.payrollManagement.submitForSuperAdminApproval}
                        </Button>
                      )}

                      {run.status === "submitted" && decidableRunIds.includes(run.id) && (
                        <Button
                          onClick={() => handleApprove(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1.5 text-xs rounded-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 me-1 inline" />
                          {t.payrollManagement.approvePayroll}
                        </Button>
                      )}

                      {canPay && run.status === "approved" && (
                        <Button
                          onClick={() => setPayAllRun(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <Receipt className="w-3.5 h-3.5 me-1 inline" />
                          {t.payroll.payAll}
                        </Button>
                      )}

                      {run.status === "paid" && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-purple-700 dark:text-purple-300">
                          <FileCheck className="w-3.5 h-3.5" />
                          {t.payrollManagement.settledAndPayslipsIssued}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employees: each opens their own payment page */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 border-t border-outline-variant space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-ink-muted dark:text-ink">
                        {t.payrollManagement.employeeCalculationBreakdown}
                        {monthName} {run.year})
                      </h3>
                      <input
                        type="search"
                        aria-label={t.payroll.search}
                        placeholder={t.payroll.search}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-56 rounded-full border border-outline-variant bg-surface-raised dark:bg-surface px-3.5 py-1.5 text-xs text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                      />
                    </div>
                    <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant overflow-hidden">
                      {run.items
                        ?.filter((item) => {
                          const q = search.trim().toLowerCase();
                          if (!q) return true;
                          const e = item.employee as { firstNameEn?: string; lastNameEn?: string; firstNameAr?: string; lastNameAr?: string; employeeNumber?: string } | undefined;
                          return [e?.firstNameEn, e?.lastNameEn, e?.firstNameAr, e?.lastNameAr, e?.employeeNumber].some((v) => v?.toLowerCase().includes(q));
                        })
                        .map((item) => {
                          const e = item.employee as { firstNameEn?: string; lastNameEn?: string; firstNameAr?: string; lastNameAr?: string; employeeNumber?: string } | undefined;
                          const summary = (item as { attendanceSummary?: { absentDays?: number; unmarkedDays?: number; leave?: Record<string, { days: number }>; overtime?: Record<string, number> } | null }).attendanceSummary;
                          const leaveDays = summary?.leave ? Object.values(summary.leave).reduce((sum, l) => sum + l.days, 0) : 0;
                          const otHours = summary?.overtime ? Math.round((Object.values(summary.overtime).reduce((sum, m) => sum + m, 0) / 60) * 10) / 10 : 0;
                          const deductions = Number(item.gosiEmployee) + Number(item.absenceDeduction ?? 0) + Number(item.leaveDeduction ?? 0) + Number(item.latenessDeduction ?? 0) + Number(item.otherDeductions);
                          return (
                            <li key={item.id}>
                              <Link href={ROUTES.hr.payrollItem(item.id)} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06] focus-visible:outline-none">
                                <div className="min-w-0 flex-1 basis-48">
                                  <p className="truncate text-sm font-semibold text-ink dark:text-ink">
                                    {locale === "ar" && e?.firstNameAr ? `${e.firstNameAr} ${e.lastNameAr}` : `${e?.firstNameEn ?? ""} ${e?.lastNameEn ?? ""}`}
                                  </p>
                                  <p className="flex flex-wrap gap-x-2 text-[11px] text-ink-muted dark:text-ink-muted">
                                    <bdi dir="ltr">{e?.employeeNumber}</bdi>
                                    {summary?.absentDays ? <span className="text-rose-700 dark:text-rose-400">{t.payroll.absent} {summary.absentDays}</span> : null}
                                    {leaveDays ? <span>{t.payroll.leave} {leaveDays}</span> : null}
                                    {otHours ? <span className="text-emerald-700 dark:text-emerald-400">{t.payroll.overtime} {fill(t.payroll.hoursShort, { n: otHours })}</span> : null}
                                    {Number(item.commission ?? 0) > 0 && <span>{t.payroll.commission} {fmt(Number(item.commission))}</span>}
                                    {summary?.unmarkedDays ? <span className="text-amber-700 dark:text-amber-400">{fill(t.payroll.warningsUnmarked, { n: summary.unmarkedDays })}</span> : null}
                                  </p>
                                </div>
                                <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                                  <div><dt className="text-[10px] text-ink-muted">{t.payrollManagement.grossSalary}</dt><dd className="font-mono text-ink dark:text-ink"><bdi dir="ltr">{fmt(Number(item.grossSalary))}</bdi></dd></div>
                                  <div><dt className="text-[10px] text-ink-muted">{t.payroll.deductions}</dt><dd className="font-mono text-rose-700 dark:text-rose-400"><bdi dir="ltr">−{fmt(deductions)}</bdi></dd></div>
                                  <div><dt className="text-[10px] text-ink-muted">{t.payrollManagement.netSalary}</dt><dd className="font-mono font-bold text-primary dark:text-accent"><bdi dir="ltr">{fmt(Number(item.netSalary))}</bdi></dd></div>
                                </dl>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-surface-sunken/10 text-ink-muted dark:text-ink"}`}>
                                  {item.paymentStatus === "paid" ? t.payroll.statusPaid : t.payroll.statusPending}
                                </span>
                                <RowArrow className="w-4 h-4 text-ink-muted" aria-hidden />
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Modal isOpen={payAllRun !== null} onClose={() => setPayAllRun(null)} title={t.payroll.payAllTitle} closeLabel={t.shared.cancel} footer={<div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPayAllRun(null)}>{t.shared.cancel}</Button>
            <Button type="submit" size="sm" form={modalFormId}>{t.payroll.payAll}</Button>
          </div>}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (payAllRun) void handleMarkPaid(payAllRun);
          }}
          className="space-y-4"
         id={modalFormId}>
          <p className="text-sm text-ink-muted dark:text-ink">{t.payroll.payAllBody}</p>
          <label className="block space-y-1 text-xs font-medium text-ink dark:text-ink">
            {t.payrollItem.method}
            <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface-raised dark:bg-surface px-3 py-2 text-sm text-ink dark:text-ink">
              {Object.entries(t.payroll.methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-ink dark:text-ink">
            {t.payrollItem.reference}
            <input dir="ltr" maxLength={120} value={payReference} onChange={(e) => setPayReference(e.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface-raised dark:bg-surface px-3 py-2 text-sm text-ink dark:text-ink" />
          </label>

        </form>
      </Modal>

      {/* Generate Run Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title={t.payrollManagement.generateMonthlyPayrollCycle} description={t.payrollManagement.calculateSalaryItemsUsingEmployment} busy={generating} className="max-w-md" footer={<div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={generating} onClick={() => setShowGenerateModal(false)}>{t.shared.cancel}</Button><Button type="submit" form={generateFormId} disabled={generating}>{generating ? t.payrollManagement.calculating : t.payrollManagement.generateRun}</Button></div>}>
        <form id={generateFormId} onSubmit={handleGenerate} onInvalidCapture={() => setGenerateError(t.payrollManagement.invalidPeriod)}>
          <fieldset disabled={generating}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${generateFormId}-month`} className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.payrollManagement.month}
                </label>
                <Select
                  id={`${generateFormId}-month`}
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(Number(e.target.value))}
                  className="w-full text-xs rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                >
                  {months.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor={`${generateFormId}-year`} className="block text-xs font-medium text-ink dark:text-ink mb-1">
                  {t.payrollManagement.year}
                </label>
                <Input
                  id={`${generateFormId}-year`}
                  placeholder={t.payrollManagement.yearPlaceholder}
                  required
                  type="number"
                  min="2020"
                  max="2035"
                  value={generateYear}
                  onChange={(e) => setGenerateYear(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-outline-variant bg-surface-raised dark:bg-surface-raised p-2 text-ink dark:text-ink"
                />
              </div>
            </div>

          </fieldset>
          {generateError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{generateError}</p>}
        </form>
      </Modal>
    </div>
  );
}
