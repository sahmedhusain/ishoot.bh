"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, ExternalLink, Inbox, ShieldAlert, XCircle } from "lucide-react";
import { Button, Card, Modal, Textarea } from "@ishoot/ui";
import { APPROVAL_TARGET_TYPES } from "@ishoot/database/constants/approvals";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { decideApprovalAction } from "../../app/actions/approvals";
import type { ApprovalListItem, ApprovalScope } from "../../types/approvals";

interface ApprovalsCenterViewProps {
  requests: ApprovalListItem[];
  total: number;
  page: number;
  pageSize: number;
  scope: ApprovalScope;
  status: string;
  targetType: string;
  canViewAll: boolean;
  currentUserId: string;
  counts: { awaiting: number; mine: number };
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
};

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);

export function ApprovalsCenterView({
  requests,
  total,
  page,
  pageSize,
  scope,
  status,
  targetType,
  canViewAll,
  currentUserId,
  counts,
}: ApprovalsCenterViewProps) {
  const { t, locale } = useAdminLocale();
  const a = t.approvals;
  const router = useRouter();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<ApprovalListItem | null>(null);
  const [reason, setReason] = React.useState("");
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const navigate = (next: Partial<{ scope: string; status: string; type: string; page: number }>) => {
    const params = new URLSearchParams();
    const merged = { scope, status, type: targetType, page: 1, ...next };
    if (merged.scope !== "awaiting") params.set("scope", merged.scope);
    if (merged.status !== "all" && merged.scope !== "awaiting") params.set("status", merged.status);
    if (merged.type !== "all") params.set("type", merged.type);
    if (merged.page > 1) params.set("page", String(merged.page));
    router.push(`${ROUTES.approvals()}${params.size ? `?${params}` : ""}`);
  };

  const decide = async (item: ApprovalListItem, decision: "approved" | "rejected", note?: string) => {
    setLoadingId(item.id);
    try {
      await decideApprovalAction(item.id, decision, note);
      toast.success(decision === "approved" ? a.toast.approved : a.toast.rejected);
      setRejecting(null);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : a.toast.error);
    } finally {
      setLoadingId(null);
    }
  };

  const typeLabel = (type: string) => a.types[type as keyof typeof a.types] ?? type;
  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleString(locale === "ar" ? "ar-BH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  const tabs: Array<{ id: ApprovalScope; label: string; count?: number }> = [
    { id: "awaiting", label: a.tabs.awaiting, count: counts.awaiting },
    { id: "mine", label: a.tabs.mine, count: counts.mine },
    ...(canViewAll ? [{ id: "all" as const, label: a.tabs.all }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <header className="border-b border-slate-200 dark:border-white/10 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{a.title}</h1>
        <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1">{a.subtitle}</p>
      </header>

      <nav aria-label={a.title} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={scope === tab.id ? "page" : undefined}
            onClick={() => navigate({ scope: tab.id, status: "all" })}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              scope === tab.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 ${scope === tab.id ? "bg-white/20" : "bg-white dark:bg-white/10"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label={a.types.all}
          value={targetType}
          onChange={(event) => navigate({ type: event.target.value })}
          className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface px-3 py-1.5 text-sm"
        >
          <option value="all">{a.types.all}</option>
          {APPROVAL_TARGET_TYPES.map((type) => (
            <option key={type} value={type}>{typeLabel(type)}</option>
          ))}
        </select>
        {scope !== "awaiting" && (
          <select
            aria-label={a.status.all}
            value={status}
            onChange={(event) => navigate({ status: event.target.value })}
            className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface px-3 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>{a.status[value]}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-500 ms-auto">{a.kpis.total}: {total}</span>
      </div>

      {requests.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500">{a.empty[scope]}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((item) => {
            const isOwn = item.requestedById === currentUserId;
            return (
              <li key={item.id}>
                <Card className="p-5 dark:bg-surface-raised flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{typeLabel(item.targetType)}</span>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[item.status] ?? "bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-neutral-300 dark:border-white/10"}`}>
                        {a.status[item.status as keyof typeof a.status] ?? item.status}
                      </span>
                      {item.status === "pending" && (
                        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {fill(a.step, { step: item.currentStep })} · {fill(a.waitingFor, { count: item.approverIds.length })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {fill(a.requestedBy, { name: item.requestedBy?.fullName || item.requestedBy?.email || "—" })} · {formatDate(item.createdAt)}
                    </p>
                    {item.discountReason && (
                      <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-md px-3 py-2">{item.discountReason}</p>
                    )}
                    {item.selfApproved && <p className="text-xs text-slate-500 italic">{a.selfApproved}</p>}
                    {item.decisions && item.decisions.length > 0 && (
                      <ul className="text-xs text-slate-500 space-y-0.5">
                        {item.decisions.map((decision) => (
                          <li key={decision.id}>
                            {fill(decision.decision === "rejected" ? a.decision.rejected : a.decision.approved, {
                              name: decision.decidedBy?.fullName || "—",
                              date: formatDate(decision.decidedAt),
                            })}
                            {decision.reason && <span className="block text-slate-400 italic">“{decision.reason}”</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    <Link href={item.href} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                      {a.openRecord}
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                    {item.status === "pending" &&
                      (item.canDecide ? (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={loadingId === item.id} onClick={() => { setRejecting(item); setReason(""); }}>
                            <XCircle className="w-3.5 h-3.5 me-1" aria-hidden="true" />
                            {a.reject}
                          </Button>
                          <Button size="sm" disabled={loadingId === item.id} onClick={() => decide(item, "approved")} className="bg-primary text-white">
                            <CheckCircle2 className="w-3.5 h-3.5 me-1" aria-hidden="true" />
                            {a.approve}
                          </Button>
                        </div>
                      ) : (
                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-md px-2.5 py-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                          {isOwn ? a.ownRequest : a.notEligible}
                        </p>
                      ))}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label={fill(a.pageOf, { page, pages })} className="flex items-center justify-center gap-3 text-sm">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>{a.previous}</Button>
          <span className="text-slate-500">{fill(a.pageOf, { page, pages })}</span>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => navigate({ page: page + 1 })}>{a.next}</Button>
        </nav>
      )}

      <Modal closeLabel={t.actions.close} isOpen={!!rejecting} onClose={() => setRejecting(null)} title={a.rejectTitle}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (rejecting && reason.trim()) void decide(rejecting, "rejected", reason.trim());
          }}
          className="space-y-4"
        >
          <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300">
            <span className="block mb-1">{a.rejectReasonLabel}</span>
            <Textarea rows={3} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder={a.rejectReasonPlaceholder} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRejecting(null)}>{a.cancel}</Button>
            <Button type="submit" variant="danger" disabled={!reason.trim() || loadingId === rejecting?.id}>{a.confirmReject}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
