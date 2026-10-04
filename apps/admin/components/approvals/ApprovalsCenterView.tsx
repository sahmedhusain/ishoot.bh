"use client";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@ishoot/database/types";
import { Card, Button } from "@ishoot/ui";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileSignature,
  Receipt,
  Users,
  Calendar,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  FileText,
  UserCheck,
} from "lucide-react";
import { decideApprovalAction } from "../../app/actions/approvals";
import { toast } from "sonner";

interface ApprovalsCenterViewProps {
  initialRequests: ApprovalRequest[];
  total: number;
  currentStatus: string;
  currentType: string;
  currentUserId: string;
  currentUserRole: string;
  isSuperAdmin: boolean;
  canApproveLeave: boolean;
  canApproveProfile: boolean;
  page: number;
}

export function ApprovalsCenterView({
  initialRequests,
  total,
  currentStatus,
  currentType,
  currentUserId,
  isSuperAdmin,
  canApproveLeave,
  canApproveProfile,
}: ApprovalsCenterViewProps) {
  const { t } = useAdminLocale();
  const router = useRouter();

  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  // Reject modal state
  const [rejectingRequestId, setRejectingRequestId] = React.useState<
    string | null
  >(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const pendingCount = initialRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const financialCount = initialRequests.filter(
    (r) =>
      r.status === "pending" &&
      (r.targetType === "quotation" ||
        r.targetType === "invoice" ||
        r.targetType === "payroll_run"),
  ).length;
  const hrCount = initialRequests.filter(
    (r) =>
      r.status === "pending" &&
      (r.targetType === "leave_request" || r.targetType === "profile_change"),
  ).length;

  const targetTypeMeta: Record<
    string,
    {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      routePrefix: string;
    }
  > = {
    quotation: {
      label: "Quotation & Commercial Discount",
      icon: FileSignature,
      routePrefix: "/dashboard/quotations",
    },
    invoice: {
      label: "Tax Invoice & Pricing",
      icon: Receipt,
      routePrefix: "/dashboard/invoices",
    },
    payroll_run: {
      label: "Monthly Payroll Run",
      icon: Users,
      routePrefix: "/dashboard/hr/payroll",
    },
    leave_request: {
      label: "Employee Leave Application",
      icon: Calendar,
      routePrefix: "/dashboard/hr/leave",
    },
    profile_change: {
      label: "Employee Profile Identity Change",
      icon: UserCheck,
      routePrefix: "/dashboard/users",
    },
  };

  const handleDecision = async (
    requestId: string,
    decision: "approved" | "rejected",
    reason?: string,
  ) => {
    setLoadingId(requestId);
    const toastId = toast.loading(
      decision === "approved"
        ? "Recording governance approval..."
        : "Recording rejection...",
    );
    try {
      const res = await decideApprovalAction(requestId, decision, reason);
      if (res.success) {
        toast.success(
          decision === "approved"
            ? "Request approved successfully"
            : "Request rejected successfully",
          { id: toastId },
        );
        setRejectingRequestId(null);
        setRejectReason("");
        router.refresh();
      } else {
        toast.error(t.hrText.text245, { id: toastId });
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error recording decision",
        { id: toastId },
      );
    } finally {
      setLoadingId(null);
    }
  };

  const updateFilters = (newStatus?: string, newType?: string) => {
    const params = new URLSearchParams();
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    if (newType && newType !== "all") params.set("type", newType);
    params.set("page", "1");
    router.push(`/dashboard/approvals?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAEAEA] dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#09937F] bg-[#EDF3EC] dark:bg-[#004d40]/40 dark:text-[#7de0d1] px-2.5 py-0.5 rounded-full font-medium">
              {t.hrText.text246}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {t.hrText.text247}
          </h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">
            {t.hrText.text248}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EDF3EC] dark:bg-[#004d40]/40 text-[#014842] dark:text-[#7de0d1] text-xs font-mono font-medium rounded-full border border-[#09937F]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.hrText.text249}
            </span>
          )}
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text250}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && <Clock className="w-4 h-4 animate-pulse" />}
          </div>
          <div className="text-xs text-slate-400 mt-1">{t.hrText.text251}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text252}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {financialCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">{t.hrText.text253}</div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 p-5 rounded-lg">
          <div className="text-xs text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            {t.hrText.text254}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {hrCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">{t.hrText.text255}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-3">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EAEAEA] dark:border-white/10 pb-3">
          {[
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "all", label: "All History" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => updateFilters(tab.id, currentType)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentStatus === tab.id
                  ? "bg-[#014842] text-white"
                  : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Target Types" },
            { id: "quotation", label: "Quotations" },
            { id: "invoice", label: "Invoices" },
            { id: "payroll_run", label: "Payroll Runs" },
            { id: "leave_request", label: "Leave Requests" },
            { id: "profile_change", label: "Profile Changes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => updateFilters(currentStatus, tab.id)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                currentType === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-4">
        {initialRequests.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed border-[#EAEAEA] dark:border-white/10 bg-white/50 dark:bg-[#111]/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.hrText.text256}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {t.hrText.text257}
            </p>
          </div>
        ) : (
          initialRequests.map((req) => {
            const meta = targetTypeMeta[req.targetType] || {
              label: req.targetType,
              icon: FileText,
              routePrefix: "/dashboard",
            };
            const TargetIcon = meta.icon;

            const isFinancial =
              req.targetType === "quotation" ||
              req.targetType === "invoice" ||
              req.targetType === "payroll_run";

            const isOwnRequest = req.requestedById === currentUserId;
            const canUserDecideFinancial = isSuperAdmin;
            const canUserDecideHR =
              isSuperAdmin ||
              (!isOwnRequest &&
                (req.targetType === "leave_request"
                  ? canApproveLeave
                  : canApproveProfile));
            const isEligibleApprover = isFinancial
              ? canUserDecideFinancial
              : canUserDecideHR;

            return (
              <Card
                key={req.id}
                className="p-5 bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Request Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                        <TargetIcon className="w-4 h-4 text-[#09937F]" />
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-900 dark:text-white">
                        {meta.label}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-500">
                        {t.hrText.text258}
                        {req.revision}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-medium uppercase px-2 py-0.5 rounded-full ${
                          req.status === "pending"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : req.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>
                        {t.hrText.text259}{" "}
                        <strong className="text-slate-800 dark:text-neutral-200 font-medium">
                          {req.requestedBy?.fullName ||
                            req.requestedBy?.email ||
                            "User"}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(req.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Commercial Discount Reason if Present */}
                    {req.discountReason && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
                        <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          {t.hrText.text260}
                        </div>
                        <p className="text-slate-700 dark:text-neutral-300 leading-relaxed font-mono text-[11px]">
                          {req.discountReason}
                        </p>
                      </div>
                    )}

                    {/* Diff Payload Summary */}
                    {req.diffPayload && typeof req.diffPayload === "object" && (
                      <div className="p-3 bg-slate-50 dark:bg-neutral-900/40 rounded-md border border-[#EAEAEA] dark:border-white/5 text-xs font-mono space-y-1">
                        <div className="text-slate-400 uppercase text-[10px] tracking-wider">
                          {t.hrText.text261}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-700 dark:text-neutral-300">
                          {Object.entries(req.diffPayload).map(([key, val]) => (
                            <div key={key}>
                              <span className="text-slate-400">{key}: </span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {typeof val === "object"
                                  ? JSON.stringify(val)
                                  : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Decision Controls or Maker-Checker Notice */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Link
                      href={`${meta.routePrefix}/${req.targetId}`}
                      className="inline-flex items-center gap-1 text-xs text-[#09937F] hover:text-[#014842] dark:hover:text-[#7de0d1] font-medium"
                    >
                      <span>{t.hrText.text262}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {req.status === "pending" && (
                      <div className="pt-2">
                        {isOwnRequest && !isSuperAdmin ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs rounded-md border border-amber-200 dark:border-amber-900/50 max-w-xs text-right">
                            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{t.hrText.text263}</span>
                          </div>
                        ) : !isEligibleApprover ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 text-xs rounded-md">
                            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{t.hrText.text264}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setRejectingRequestId(req.id);
                                setRejectReason("");
                              }}
                              disabled={loadingId === req.id}
                              className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-md text-xs font-medium"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                              {t.hrText.text98}
                            </Button>
                            <Button
                              onClick={() => handleDecision(req.id, "approved")}
                              disabled={loadingId === req.id}
                              className="bg-[#014842] hover:bg-[#013833] text-white px-3.5 py-1.5 rounded-md text-xs font-medium active:scale-[0.98] transition-all shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                              {t.hrText.text99}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Past Decisions Log */}
                    {req.decisions && req.decisions.length > 0 && (
                      <div className="text-right text-[11px] text-slate-500 pt-1">
                        {req.decisions.map((dec) => (
                          <div key={dec.id}>
                            {t.hrText.text265}
                            <strong>
                              {dec.decidedBy?.fullName || "Admin"}
                            </strong>
                            {t.hrText.text266}{" "}
                            {new Date(dec.decidedAt).toLocaleDateString()}
                            {dec.reason && (
                              <div className="text-slate-400 text-[10px] italic">
                                {t.hrText.text230}
                                {dec.reason}
                                {t.hrText.text231}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-[#EAEAEA] dark:border-white/10 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.hrText.text267}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.hrText.text268}
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1">
                {t.hrText.text269}
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t.hrText.text270}
                className="w-full text-xs font-mono rounded-md border border-[#EAEAEA] dark:border-white/10 bg-slate-50 dark:bg-neutral-900 p-2 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-md"
              >
                {t.hrText.text23}
              </button>
              <Button
                onClick={() =>
                  handleDecision(rejectingRequestId, "rejected", rejectReason)
                }
                disabled={
                  !rejectReason.trim() || loadingId === rejectingRequestId
                }
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs rounded-md"
              >
                {t.hrText.text112}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
