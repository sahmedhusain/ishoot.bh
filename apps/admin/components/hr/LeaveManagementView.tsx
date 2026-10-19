"use client";
import { formatMessage } from "@ishoot/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { NoEmployeeProfile } from "./NoEmployeeProfile";
import { LeaveBalancesCard } from "./LeaveBalancesCard";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LeaveRequest, Employee } from "@ishoot/database/types";
import type { LeaveTypeView } from "@ishoot/database/queries/hr-settings";
import type { LeaveBalance } from "@ishoot/database/queries/leave-balances";
import { Card, Button, useDialog, formatDate } from "@ishoot/ui";
import { Clock, Plus } from "lucide-react";
import {
  createLeaveRequestAction,
  decideLeaveRequestAction,
  cancelLeaveRequestAction,
} from "../../app/actions/leave";
import { toast } from "sonner";

interface LeaveManagementViewProps {
  requests: LeaveRequest[];
  leaveTypes: LeaveTypeView[];
  /** The viewer's balances for this year, one per leave type. */
  myBalances?: LeaveBalance[];
  allEmployees: Employee[];
  myEmployee: any | null;
  currentUserId: string;
  /** May file leave on behalf of other employees. */
  canFileForOthers: boolean;
  /** Leave request ids the viewer may approve or reject (from the approval policy). */
  decidableIds: string[];
  currentStatus: string;
  total: number;
  page: number;
}

export function LeaveManagementView({
  requests,
  leaveTypes,
  myBalances = [],
  allEmployees,
  myEmployee,
  canFileForOthers,
  decidableIds,
  currentStatus,
}: LeaveManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const router = useRouter();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  // Apply Modal state
  const [showApplyModal, setShowApplyModal] = React.useState(false);
  const applyDialog = useDialog(showApplyModal, () => setShowApplyModal(false));
  const [submitting, setSubmitting] = React.useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = React.useState(
    myEmployee?.id || "",
  );
  const [leaveTypeId, setLeaveTypeId] = React.useState(leaveTypes[0]?.id || "");
  const [startDate, setStartDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [portion, setPortion] = React.useState<"full" | "half_am" | "half_pm" | "hours">("full");
  const [hours, setHours] = React.useState(2);
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId);
  React.useEffect(() => {
    // Keep the duration valid for the chosen leave type.
    if ((portion === "half_am" || portion === "half_pm") && selectedType && !selectedType.allowHalfDay) setPortion("full");
    if (portion === "hours" && selectedType && !selectedType.allowHours) setPortion("full");
  }, [selectedType, portion]);
  const [reason, setReason] = React.useState("");

  // Reject modal state
  const [rejectingRequestId, setRejectingRequestId] = React.useState<
    string | null
  >(null);
  const rejectDialog = useDialog(!!rejectingRequestId, () => setRejectingRequestId(null));
  const [rejectNotes, setRejectNotes] = React.useState("");

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !targetEmployeeId ||
      !leaveTypeId ||
      !startDate ||
      !endDate ||
      !reason.trim()
    ) {
      toast.error(t.leaveManagement.pleaseFillInAllRequired);
      return;
    }

    if (portion === "full" && new Date(endDate) < new Date(startDate)) {
      toast.error(t.leaveManagement.endDateCannotBeEarlier);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(t.leaveManagement.submittingLeaveRequest);
    try {
      const res = await createLeaveRequestAction({
        employeeId: targetEmployeeId,
        leaveTypeId,
        startDate,
        endDate: portion === "full" ? endDate : startDate,
        fullDay: portion === "full",
        hours: portion === "hours" ? hours : undefined,
        dayPortion: portion,
        attachmentUrl: attachmentUrl.trim() || null,
        reason: reason.trim(),
      });

      if (res.success) {
        toast.success(t.leaveManagement.leaveRequestSubmittedForManager, { id: toastId });
        setShowApplyModal(false);
        setReason("");
        router.refresh();
      } else {
        toast.error(t.leaveManagement.failedToSubmitLeaveRequest, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.leaveManagement.errorSubmittingLeave), {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (
    requestId: string,
    decision: "approved" | "rejected",
    notes?: string,
  ) => {
    setLoadingId(requestId);
    const toastId = toast.loading(
      decision === "approved" ? t.leaveManagement.approvingLeaveAndCheckingConflicts : t.leaveManagement.rejectingLeave,
    );
    try {
      const res = await decideLeaveRequestAction(requestId, decision, notes);
      if (res.success) {
        if (decision === "approved" && res.conflicts) {
          const totalConflicts =
            (res.conflicts.assignedInquiriesCount || 0) +
            (res.conflicts.assignedDealsCount || 0) +
            (res.conflicts.calendarEventsCount || 0);

          if (totalConflicts > 0) {
            toast.warning(
              formatMessage(t.copy.leaveConflicts, { count: totalConflicts }),
              { id: toastId, duration: 6000 },
            );
          } else {
            toast.success(t.leaveManagement.leaveApprovedWithZeroConflicts, { id: toastId });
          }
        } else {
          toast.success(t.leaveManagement.leaveRequestDecisionRecorded, { id: toastId });
        }
        setRejectingRequestId(null);
        setRejectNotes("");
        router.refresh();
      } else {
        toast.error(t.leaveManagement.failedToRecordDecision, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.leaveManagement.decisionFailed), {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setLoadingId(requestId);
    const toastId = toast.loading(t.leaveManagement.cancellingLeaveRequest);
    try {
      const res = await cancelLeaveRequestAction(requestId);
      if (res.success) {
        toast.success(t.leaveManagement.leaveRequestCancelled, { id: toastId });
        router.refresh();
      } else {
        toast.error(t.leaveManagement.failedToCancelLeaveRequest, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err, t, t.leaveManagement.cancellationFailed), {
        id: toastId,
      });
    } finally {
      setLoadingId(null);
    }
  };

  const updateStatusFilter = (st: string) => {
    const params = new URLSearchParams();
    if (st !== "all") params.set("status", st);
    router.push(`${ROUTES.hr.leave()}?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-accent bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-mint px-2.5 py-0.5 rounded-full font-medium">
              {t.leaveManagement.operationalAvailabilityAndHrms}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.leaveManagement.leaveAndAvailabilityManagement}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.leaveManagement.approvedLeavesStrictlyBlockOperational}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(myEmployee || canFileForOthers) && (
          <Button
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.leaveManagement.applyForLeave}</span>
          </Button>
          )}
        </div>
      </div>

      {!myEmployee && <NoEmployeeProfile />}

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {myEmployee && (
          <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
            <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
              {t.leaveManagement.myAnnualLeaveBalance}
            </div>
            <div className="text-2xl font-bold font-mono text-primary dark:text-mint">
              {Number(myBalances.find((b) => b.code === "annual")?.available ?? myEmployee.leaveBalanceDays).toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-400">
                {t.shared.days}
              </span>
            </div>
            <div className="text-xs text-slate-400">{t.leaveManagement.bahrainStatutoryAllowance}</div>
          </div>
        )}

        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.leaveManagement.pendingLeaveRequests}
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && <Clock className="w-4 h-4 animate-pulse" />}
          </div>
          <div className="text-xs text-slate-400">{t.leaveManagement.awaitingManagerReview}</div>
        </div>

        <div className="bg-white dark:bg-surface-raised border border-ink/10 p-5 rounded-lg space-y-1">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.leaveManagement.approvedLeaves}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {approvedCount}
          </div>
          <div className="text-xs text-slate-400">{t.leaveManagement.activeUpcomingBlockedPeriods}</div>
        </div>
      </div>

      {myEmployee && myBalances.length > 0 && <LeaveBalancesCard balances={myBalances} year={new Date().getFullYear()} />}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-3">
        {[
          { id: "all", label: t.leaveManagement.allRequests },
          { id: "pending", label: t.leaveManagement.pendingReview },
          { id: "approved", label: t.leaveManagement.tabApproved },
          { id: "rejected", label: t.leaveManagement.tabRejected },
          { id: "cancelled", label: t.leaveManagement.tabCancelled },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentStatus === tab.id
                ? "bg-primary text-white"
                : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leave Requests Table */}
      <Card className="bg-white dark:bg-surface-raised border border-ink/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-neutral-900/30">
                <th className="py-3 px-4">{t.shared.employee}</th>
                <th className="py-3 px-4">{t.leaveManagement.leaveType}</th>
                <th className="py-3 px-4">{t.leaveManagement.periodAndDuration}</th>
                <th className="py-3 px-4">{t.leaveManagement.reasonNotes}</th>
                <th className="py-3 px-4">{t.leaveManagement.statusAndInvariant}</th>
                <th className="py-3 px-4 text-end">{t.leaveManagement.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 dark:divide-white/5">
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-xs text-slate-400"
                  >
                    {t.leaveManagement.noLeaveRequestsFoundMatching}
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isOwn = req.employee?.id === myEmployee?.id;
                  const canDecide = req.status === "pending" && decidableIds.includes(req.id);

                  const start = formatDate(req.startDate, locale);
                  const end = formatDate(req.endDate, locale);

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {req.employee?.firstNameEn} {req.employee?.lastNameEn}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          {req.employee?.employeeNumber}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                          {(locale === "ar" ? req.leaveType?.nameAr : req.leaveType?.nameEn) || t.leaveManagement.generalLeave}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="text-slate-900 dark:text-white">
                          <bdi dir="ltr">{start} → {end}</bdi>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {req.dayPortion === "half_am"
                            ? t.leaveForm.halfAm
                            : req.dayPortion === "half_pm"
                              ? t.leaveForm.halfPm
                              : req.fullDay
                                ? t.leaveManagement.fullDay
                                : formatMessage(t.leaveManagement.hoursCount, { n: String(req.hours) })}
                          {req.days ? <> · <bdi dir="ltr">{req.days}</bdi> {t.shared.days}</> : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs max-w-xs">
                        <p dir="auto" className="text-slate-700 dark:text-neutral-300 truncate text-[11px]">
                          {req.reason}
                        </p>
                        {req.reviewNotes && (
                          <div className="text-[10px] text-slate-400 mt-0.5 italic">
                            {t.leaveManagement.reviewNote}
                            {req.reviewNotes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                            req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : req.status === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {(t.hrExtensions as Record<string, string>)[req.status] || req.status}
                        </span>
                        {req.status === "approved" && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            {t.leaveManagement.allocationStrictlyBlocked}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        {canDecide && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setRejectingRequestId(req.id);
                                setRejectNotes("");
                              }}
                              disabled={loadingId === req.id}
                              className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                            >
                              {t.shared.reject}
                            </button>
                            <button
                              onClick={() => handleDecision(req.id, "approved")}
                              disabled={loadingId === req.id}
                              className="px-2.5 py-1 text-xs bg-primary text-white hover:bg-primary-hover rounded"
                            >
                              {t.leaveManagement.approve}
                            </button>
                          </div>
                        )}

                        {isOwn && req.status === "pending" && (
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={loadingId === req.id}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded"
                          >
                            {t.shared.cancel}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">
          <form {...applyDialog}
            onSubmit={handleApply}
            className="bg-white dark:bg-surface-raised border border-ink/10 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.leaveManagement.applyForLeave}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.leaveManagement.onceApprovedYourLeaveWindow}
            </p>

            <div className="space-y-3">
              {canFileForOthers && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                    {t.shared.employee}
                  </label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="w-full text-xs rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                  >
                    {!targetEmployeeId && <option value="" disabled>—</option>}
                    {allEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstNameEn} {e.lastNameEn} ({e.employeeNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.leaveManagement.leaveType2}
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="w-full text-xs rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {locale === "ar" ? lt.nameAr : lt.nameEn}
                      {lt.accrual !== "none" ? ` — ${lt.daysAllowedPerYear}${t.leaveManagement.daysAllowed}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-1 text-xs font-medium text-slate-700 dark:text-neutral-300">{t.leaveForm.portion}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["full", t.leaveForm.full, true],
                    ["half_am", t.leaveForm.halfAm, selectedType?.allowHalfDay !== false],
                    ["half_pm", t.leaveForm.halfPm, selectedType?.allowHalfDay !== false],
                    ["hours", t.leaveForm.hours, selectedType?.allowHours === true],
                  ] as const).filter(([, , allowed]) => allowed).map(([value, label]) => (
                    <label key={value} className={`cursor-pointer rounded-full border px-3 py-1 text-xs focus-within:ring-2 focus-within:ring-accent/40 ${portion === value ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"}`}>
                      <input type="radio" name="leave-portion" className="sr-only" checked={portion === value} onChange={() => setPortion(value)} />
                      {label}
                    </label>
                  ))}
                </div>
                {portion === "hours" && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-700 dark:text-neutral-300">
                    {t.leaveForm.hoursCount}
                    <input type="number" min={0.5} max={7.5} step={0.5} dir="ltr" value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-20 rounded-md border border-ink/15 bg-white dark:bg-surface p-1.5 text-xs font-mono" />
                  </label>
                )}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                    {t.leaveManagement.startDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                  />
                </div>
                {portion === "full" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                    {t.leaveManagement.endDate}
                  </label>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                  />
                </div>
                )}
              </div>

              {selectedType?.requiresAttachment && (
                <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-neutral-300">
                  {t.leaveForm.attachment}
                  <input type="url" required dir="ltr" placeholder={t.copy.urlExample} value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} className="w-full text-xs rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white" />
                </label>
              )}
              {(() => {
                const balance = myBalances.find((b) => b.leaveTypeId === leaveTypeId);
                return balance && targetEmployeeId === myEmployee?.id ? (
                  <p className="rounded-lg bg-surface-sunken px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">
                    {t.leaveForm.available}: <bdi dir="ltr" className="font-semibold">{balance.available == null ? t.leaveForm.unlimited : balance.available}</bdi>
                    {balance.pending ? <> · {t.leaveForm.pending}: <bdi dir="ltr">{balance.pending}</bdi></> : null}
                    {!balance.eligible && balance.eligibleFrom ? <> · {formatMessage(t.leaveForm.eligibleFrom, { date: balance.eligibleFrom })}</> : null}
                  </p>
                ) : null;
              })()}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                  {t.leaveManagement.reasonForAbsence}
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t.leaveManagement.eGAnnualSummerFamily}
                  className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-ink/5 rounded-md"
              >
                {t.shared.cancel}
              </button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 text-xs rounded-md"
              >
                {submitting ? t.shared.submitting : t.leaveManagement.submitApplication}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 modal-scrim flex items-center justify-center p-4">
          <div {...rejectDialog} className="bg-white dark:bg-surface-raised border border-ink/10 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.leaveManagement.rejectLeaveApplication}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.leaveManagement.reasonForRejection}
              </label>
              <textarea
                rows={3}
                required
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={t.leaveManagement.eGCriticalCommercialShoot}
                className="w-full text-xs font-mono rounded-md border border-ink/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-ink/5 rounded-md"
              >
                {t.shared.cancel}
              </button>
              <Button
                onClick={() =>
                  handleDecision(rejectingRequestId, "rejected", rejectNotes)
                }
                disabled={
                  !rejectNotes.trim() || loadingId === rejectingRequestId
                }
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs rounded-md"
              >
                {t.shared.confirmRejection}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
