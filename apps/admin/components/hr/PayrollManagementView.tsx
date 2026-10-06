"use client";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PayrollRun } from "@ishoot/database/types";
import { Card, Button, useDialog } from "@ishoot/ui";
import {
  DollarSign,
  Plus,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileCheck,
} from "lucide-react";
import {
  generatePayrollRunAction,
  submitPayrollRunForApprovalAction,
  approvePayrollRunAction,
  markPayrollRunPaidAction,
} from "../../app/actions/payroll";
import { toast } from "sonner";
import { PayrollItemRow } from "./PayrollItemRow";

interface PayrollManagementViewProps {
  runs: PayrollRun[];
  currentUserId: string;
  /** Runs the current user may approve under the payroll approval policy. */
  decidableRunIds: string[];
  /** May adjust individual salary lines, submit runs and mark them paid. */
  canEdit?: boolean;
  /** May generate a monthly run. */
  canCreate?: boolean;
}

export function PayrollManagementView({
  runs,
  decidableRunIds,
  canEdit = false,
  canCreate = false,
}: PayrollManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const router = useRouter();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = React.useState<string | null>(
    runs[0]?.id || null,
  );

  // Generate Run Modal
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const generateDialog = useDialog(showGenerateModal, () => setShowGenerateModal(false));
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
    new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, month, 1)),
    ),
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    const toastId = toast.loading(t.hrExtensions.working);
    try {
      const res = await generatePayrollRunAction(generateMonth, generateYear);
      if (res.success && res.payrollRun) {
        toast.success(t.hrExtensions.saved, { id: toastId });
        setShowGenerateModal(false);
        setExpandedRunId(res.payrollRun.id);
        router.refresh();
      } else {
        toast.error(t.payrollManagement.failedToGeneratePayrollRun, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.payrollManagement.calculationFailed, {
        id: toastId,
      });
    } finally {
      setGenerating(false);
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
      toast.error(err instanceof Error ? err.message : t.payrollManagement.errorSubmitting, {
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
      toast.error(err instanceof Error ? err.message : t.payrollManagement.errorApproving, {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkPaid = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.payrollManagement.recordingSettlementAndGeneratingIndividual);
    try {
      const res = await markPayrollRunPaidAction(runId);
      if (res.success) {
        toast.success(t.payrollManagement.payrollMarkedAsPaidIndividual, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.payrollManagement.failedToMarkPaid, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.payrollManagement.errorSettlingPayroll, {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-mint px-2.5 py-0.5 rounded-full font-medium">
              {t.payrollManagement.hrAndStatutoryPayroll}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.payrollManagement.payrollAndCompensationRuns}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.payrollManagement.employeeSpecificGosiSettingsAllowances}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && <Button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.payrollManagement.generateMonthlyRun}</span>
          </Button>}
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.payrollManagement.totalNetSalaryOutlay}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totalNetDisbursed.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t.shared.bhd}
            </span>
          </div>
          <div className="text-xs text-slate-400">{t.payrollManagement.netPaidAcrossAllRuns}</div>
        </div>

        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.payrollManagement.totalEmployerGosiAndCosts}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totalEmployerCosts.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t.shared.bhd}
            </span>
          </div>
          <div className="text-xs text-slate-400">{t.payrollManagement.includingStatutoryEmployerContributions}</div>
        </div>

        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.payrollManagement.recordedPayrollCycles}
          </div>
          <div className="text-2xl font-bold font-mono text-primary dark:text-mint">
            {runs.length}
          </div>
          <div className="text-xs text-slate-400">{t.payrollManagement.historicalAndActiveRuns}</div>
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-6">
        {runs.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed border-ink/10 bg-white/50 dark:bg-surface-raised/50">
            <DollarSign className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.payrollManagement.noPayrollRunsGenerated}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {t.payrollManagement.generateAMonthlyPayrollRun}
            </p>
            {canCreate && (
              <Button
                onClick={() => setShowGenerateModal(true)}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 text-xs rounded-md"
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
                className="bg-white dark:bg-surface-raised border border-ink/10 rounded-lg overflow-hidden space-y-0"
              >
                {/* Run Summary Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-neutral-900/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setExpandedRunId(isExpanded ? null : run.id)
                      }
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-500 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {monthName} {run.year}
                        </span>
                        <span
                          className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                            run.status === "paid"
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
                      <div className="text-xs text-slate-400 mt-0.5">
                        {run.items?.length || 0}
                        {t.payrollManagement.employeesIncluded}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.payrollManagement.grossTotal}
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                        {Number(run.totalGross).toFixed(3)}
                        {t.shared.bhd}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.payrollManagement.gosiDeductions}
                      </span>
                      <span className="font-mono font-semibold text-amber-600">
                        -{Number(run.totalDeductions).toFixed(3)}
                        {t.shared.bhd}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.payrollManagement.netPayout}
                      </span>
                      <span className="font-mono font-bold text-primary dark:text-mint">
                        {Number(run.totalNet).toFixed(3)}
                        {t.shared.bhd}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.payrollManagement.totalEmployerCost}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {Number(run.totalEmployerCost).toFixed(3)}
                        {t.shared.bhd}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
                      {canEdit && (run.status === "draft" || run.status === "calculated") && (
                        <Button
                          onClick={() => handleSubmitForApproval(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <Send className="w-3.5 h-3.5 mr-1 inline" />
                          {t.payrollManagement.submitForSuperAdminApproval}
                        </Button>
                      )}

                      {run.status === "submitted" && decidableRunIds.includes(run.id) && (
                        <Button
                          onClick={() => handleApprove(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                          {t.payrollManagement.approvePayroll}
                        </Button>
                      )}

                      {canEdit && run.status === "approved" && (
                        <Button
                          onClick={() => handleMarkPaid(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1 inline" />
                          {t.payrollManagement.markPaidAndIssuePayslips}
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

                {/* Expanded Items Table */}
                {isExpanded && (
                  <div className="p-5 border-t border-ink/10 space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      {t.payrollManagement.employeeCalculationBreakdown}
                      {monthName} {run.year})
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-start text-xs min-w-[1100px]">
                        <thead>
                          <tr className="border-b border-ink/10 font-mono uppercase text-slate-400">
                            <th className="py-2.5 px-3 text-start">{t.shared.employee}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollManagement.basic}</th>
                            <th className="py-2.5 px-3 text-end">{t.shared.housing}</th>
                            <th className="py-2.5 px-3 text-end">{t.shared.transport}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollEdit.fields.otherAllowances}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollEdit.fields.bonus}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollEdit.fields.otherDeductions}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollManagement.grossSalary}</th>
                            <th className="py-2.5 px-3 text-end text-amber-600">{t.payrollManagement.gosiEmployee}</th>
                            <th className="py-2.5 px-3 text-end font-bold text-primary dark:text-mint">{t.payrollManagement.netSalary}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollEdit.employerShare}</th>
                            <th className="py-2.5 px-3 text-end">{t.payrollManagement.totalEmployerCost}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/10 dark:divide-white/5">
                          {run.items?.map((item) => (
                            <PayrollItemRow key={item.id} item={item} editable={canEdit && (run.status === "calculated" || run.status === "draft")} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Generate Run Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form {...generateDialog}
            onSubmit={handleGenerate}
            className="bg-white dark:bg-surface-raised border border-ink/10 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.payrollManagement.generateMonthlyPayrollCycle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.payrollManagement.calculateSalaryItemsUsingEmployment}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.payrollManagement.month}
                </label>
                <select
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(Number(e.target.value))}
                  className="w-full text-xs rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                >
                  {months.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.payrollManagement.year}
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={generateYear}
                  onChange={(e) => setGenerateYear(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 rounded-md"
              >
                {t.shared.cancel}
              </button>
              <Button
                type="submit"
                disabled={generating}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 text-xs rounded-md"
              >
                {generating ? t.payrollManagement.calculating : t.payrollManagement.generateRun}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
