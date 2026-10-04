"use client";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PayrollRun } from "@ishoot/database/types";
import { Card, Button } from "@ishoot/ui";
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

interface PayrollManagementViewProps {
  runs: PayrollRun[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

export function PayrollManagementView({
  runs,
  isSuperAdmin,
}: PayrollManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const router = useRouter();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = React.useState<string | null>(
    runs[0]?.id || null,
  );

  // Generate Run Modal
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
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
        toast.error(t.hrText.text144, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra304, {
        id: toastId,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitForApproval = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.hrText.text145);
    try {
      const res = await submitPayrollRunForApprovalAction(runId);
      if (res.success) {
        toast.success(t.hrText.text146, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.hrText.text147, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra305, {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleApprove = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.hrText.text148);
    try {
      const res = await approvePayrollRunAction(runId);
      if (res.success) {
        toast.success(t.hrText.text149, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.hrText.text150, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra306, {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkPaid = async (runId: string) => {
    setLoadingId(runId);
    const toastId = toast.loading(t.hrText.text151);
    try {
      const res = await markPayrollRunPaidAction(runId);
      if (res.success) {
        toast.success(t.hrText.text152, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.hrText.text153, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.hrText.extra307, {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-[#7de0d1] px-2.5 py-0.5 rounded-full font-medium">
              {t.hrText.text154}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.hrText.text155}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.hrText.text156}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 bg-[#014842] hover:bg-[#013833] text-white px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.hrText.text157}</span>
          </Button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text158}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totalNetDisbursed.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t.hrText.text33}
            </span>
          </div>
          <div className="text-xs text-slate-400">{t.hrText.text159}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text160}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {totalEmployerCosts.toFixed(3)}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t.hrText.text33}
            </span>
          </div>
          <div className="text-xs text-slate-400">{t.hrText.text161}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text162}
          </div>
          <div className="text-2xl font-bold font-mono text-[#014842] dark:text-[#7de0d1]">
            {runs.length}
          </div>
          <div className="text-xs text-slate-400">{t.hrText.text163}</div>
        </div>
      </div>

      {/* Runs List */}
      <div className="space-y-6">
        {runs.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed border-[#EAEAEA] dark:border-white/10 bg-white/50 dark:bg-[#111]/50">
            <DollarSign className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.hrText.text164}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {t.hrText.text165}
            </p>
            <Button
              onClick={() => setShowGenerateModal(true)}
              className="bg-[#014842] hover:bg-[#013833] text-white px-4 py-2 text-xs rounded-md"
            >
              {t.hrText.text166}
            </Button>
          </div>
        ) : (
          runs.map((run) => {
            const isExpanded = expandedRunId === run.id;
            const monthName = months[run.month - 1];

            return (
              <Card
                key={run.id}
                className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg overflow-hidden space-y-0"
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
                                  : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {(t.hrExtensions as Record<string, string>)[
                            run.status
                          ] || run.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {run.items?.length || 0}
                        {t.hrText.text167}
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.hrText.text168}
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                        {Number(run.totalGross).toFixed(3)}
                        {t.hrText.text33}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.hrText.text169}
                      </span>
                      <span className="font-mono font-semibold text-amber-600">
                        -{Number(run.totalDeductions).toFixed(3)}
                        {t.hrText.text33}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.hrText.text170}
                      </span>
                      <span className="font-mono font-bold text-[#014842] dark:text-[#7de0d1]">
                        {Number(run.totalNet).toFixed(3)}
                        {t.hrText.text33}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">
                        {t.hrText.text171}
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {Number(run.totalEmployerCost).toFixed(3)}
                        {t.hrText.text33}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
                      {run.status === "draft" && (
                        <Button
                          onClick={() => handleSubmitForApproval(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-[#014842] hover:bg-[#013833] text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <Send className="w-3.5 h-3.5 mr-1 inline" />
                          {t.hrText.text172}
                        </Button>
                      )}

                      {run.status === "submitted" && isSuperAdmin && (
                        <Button
                          onClick={() => handleApprove(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-[#014842] hover:bg-[#013833] text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                          {t.hrText.text173}
                        </Button>
                      )}

                      {run.status === "approved" && (
                        <Button
                          onClick={() => handleMarkPaid(run.id)}
                          disabled={loadingId === run.id}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs rounded-md"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1 inline" />
                          {t.hrText.text174}
                        </Button>
                      )}

                      {run.status === "paid" && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-purple-700 dark:text-purple-300">
                          <FileCheck className="w-3.5 h-3.5" />
                          {t.hrText.text175}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Items Table */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#EAEAEA] dark:border-white/10 space-y-4">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      {t.hrText.text176}
                      {monthName} {run.year})
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EAEAEA] dark:border-white/10 font-mono uppercase text-slate-400">
                            <th className="py-2.5 px-3">{t.hrText.text58}</th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text177}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text20}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text21}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text178}
                            </th>
                            <th className="py-2.5 px-3 text-right text-amber-600">
                              {t.hrText.text179}
                            </th>
                            <th className="py-2.5 px-3 text-right font-bold text-[#014842] dark:text-[#7de0d1]">
                              {t.hrText.text180}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text181}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrExtensions.externalSupport}
                            </th>
                            <th className="py-2.5 px-3 text-right">
                              {t.hrText.text171}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAEAEA] dark:divide-white/5">
                          {run.items?.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                            >
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {item.employee?.firstNameEn}{" "}
                                  {item.employee?.lastNameEn}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {item.employee?.employeeNumber}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {Number(item.basicSalary).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {Number(item.housingAllowance).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono">
                                {Number(item.transportAllowance).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-semibold">
                                {Number(item.grossSalary).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-amber-600">
                                -{Number(item.gosiEmployee).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-[#014842] dark:text-[#7de0d1]">
                                {Number(item.netSalary).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-500">
                                +{Number(item.gosiEmployer).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-emerald-600">
                                {Number(item.externalSupport || 0).toFixed(3)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                                {(
                                  Number(item.grossSalary) +
                                  Number(item.gosiEmployer) -
                                  Number(item.externalSupport || 0)
                                ).toFixed(3)}
                              </td>
                            </tr>
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
          <form
            onSubmit={handleGenerate}
            className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.hrText.text182}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.hrText.text183}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.hrText.text184}
                </label>
                <select
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(Number(e.target.value))}
                  className="w-full text-xs rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
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
                  {t.hrText.text185}
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={generateYear}
                  onChange={(e) => setGenerateYear(Number(e.target.value))}
                  className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 rounded-md"
              >
                {t.hrText.text23}
              </button>
              <Button
                type="submit"
                disabled={generating}
                className="bg-[#014842] hover:bg-[#013833] text-white px-4 py-1.5 text-xs rounded-md"
              >
                {generating ? t.hrText.extra308 : t.hrText.extra309}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
