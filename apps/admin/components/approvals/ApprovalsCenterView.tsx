"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import { Select, Button, Card } from "@platform/ui";
import { APPROVAL_TARGET_TYPES } from "@platform/database/constants/approvals";
import { useAdminLocale } from "../../hooks/useAdminLocale";
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

const STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;

const STATUS_STYLES: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
};

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

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
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const navigate = (
    next: Partial<{
      scope: string;
      status: string;
      type: string;
      page: number;
    }>,
  ) => {
    const params = new URLSearchParams();
    const merged = { scope, status, type: targetType, page: 1, ...next };
    if (merged.scope !== "awaiting") params.set("scope", merged.scope);
    if (merged.status !== "all" && merged.scope !== "awaiting")
      params.set("status", merged.status);
    if (merged.type !== "all") params.set("type", merged.type);
    if (merged.page > 1) params.set("page", String(merged.page));
    router.push(`${ROUTES.approvals()}${params.size ? `?${params}` : ""}`);
  };

  const typeLabel = (type: string) =>
    a.types[type as keyof typeof a.types] ?? type;
  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleString(
      locale === "ar" ? "ar-BH-u-nu-latn" : "en-GB",
      { dateStyle: "medium", timeStyle: "short" },
    );

  const tabs: Array<{ id: ApprovalScope; label: string; count?: number }> = [
    { id: "awaiting", label: a.tabs.awaiting, count: counts.awaiting },
    { id: "mine", label: a.tabs.mine, count: counts.mine },
    ...(canViewAll ? [{ id: "all" as const, label: a.tabs.all }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <header className="border-b border-outline-variant dark:border-white/10 pb-5" data-page-header>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
          <bdi dir="auto">{a.title}</bdi>
        </h1>
        <p className="text-sm text-ink-muted dark:text-ink-muted mt-1">
          {a.subtitle}
        </p>
      </header>

      <nav aria-label={a.title} className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-current={scope === tab.id ? "page" : undefined}
            onClick={() => navigate({ scope: tab.id, status: "all" })}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${scope === tab.id
              ? "bg-primary text-primary-foreground"
              : "bg-surface-sunken text-ink-muted hover:bg-surface-sunken dark:bg-white/5 dark:text-ink dark:hover:bg-white/10"
              }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`text-xs rounded-full px-1.5 ${scope === tab.id ? "bg-white/20" : "bg-surface-raised dark:bg-white/10"}`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-3" data-page-toolbar>
        <Select
          aria-label={a.types.all}
          value={targetType}
          onChange={(event) => navigate({ type: event.target.value })}
          className="rounded-lg border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-surface px-3 py-1.5 text-sm"
        >
          <option value="all">{a.types.all}</option>
          {APPROVAL_TARGET_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </Select>
        {scope !== "awaiting" && (
          <Select
            aria-label={a.status.all}
            value={status}
            onChange={(event) => navigate({ status: event.target.value })}
            className="rounded-lg border border-outline-variant dark:border-white/10 bg-surface-raised dark:bg-surface px-3 py-1.5 text-sm"
          >
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>
                {a.status[value]}
              </option>
            ))}
          </Select>
        )}
        <span className="text-xs text-ink-muted ms-auto">
          {a.kpis.total}: {total}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-outline-variant dark:border-white/10">
          <Inbox
            className="w-8 h-8 text-ink mx-auto mb-3"
            aria-hidden="true"
          />
          <p className="text-sm text-ink-muted">{a.empty[scope]}</p>
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
                      <span className="text-sm font-semibold text-ink dark:text-ink">
                        {typeLabel(item.targetType)}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[item.status] ?? "bg-surface-raised text-ink-muted border-outline-variant dark:bg-white/5 dark:text-ink dark:border-white/10"}`}
                      >
                        {a.status[item.status as keyof typeof a.status] ??
                          item.status}
                      </span>
                      {item.status === "pending" && (
                        <span className="text-[11px] text-ink-muted inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {fill(a.step, { step: item.currentStep })} ·{" "}
                          {fill(a.waitingFor, {
                            count: item.approverIds.length,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted">
                      {fill(a.requestedBy, {
                        name:
                          item.requestedBy?.fullName ||
                          item.requestedBy?.email ||
                          "—",
                      })}{" "}
                      · {formatDate(item.createdAt)}
                    </p>
                    {item.discountReason && (
                      <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-md px-3 py-2">
                        {item.discountReason}
                      </p>
                    )}
                    {item.selfApproved && (
                      <p className="text-xs text-ink-muted italic">
                        {a.selfApproved}
                      </p>
                    )}
                    {item.decisions && item.decisions.length > 0 && (
                      <ul className="text-xs text-ink-muted space-y-0.5">
                        {item.decisions.map((decision) => (
                          <li key={decision.id}>
                            {fill(
                              decision.decision === "rejected"
                                ? a.decision.rejected
                                : a.decision.approved,
                              {
                                name: decision.decidedBy?.fullName || "—",
                                date: formatDate(decision.decidedAt),
                              },
                            )}
                            {decision.reason && (
                              <span className="block text-ink-muted italic">
                                “{decision.reason}”
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                    {/* Every request is decided on its own page, with the full record in front of the approver. */}
                    {item.status === "pending" && item.canDecide ? (
                      <Link
                        href={item.href}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckCircle2
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                        {a.reviewAndDecide}
                      </Link>
                    ) : (
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                      >
                        {a.openRecord}
                        <ExternalLink
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                      </Link>
                    )}
                    {item.status === "pending" && !item.canDecide && (
                      <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted bg-surface-raised dark:bg-white/5 rounded-md px-2.5 py-1.5">
                        <ShieldAlert
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                        {isOwn ? a.ownRequest : a.notEligible}
                      </p>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav
          aria-label={fill(a.pageOf, { page, pages })}
          className="flex items-center justify-center gap-3 text-sm"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
          >
            {a.previous}
          </Button>
          <span className="text-ink-muted">
            {fill(a.pageOf, { page, pages })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= pages}
            onClick={() => navigate({ page: page + 1 })}
          >
            {a.next}
          </Button>
        </nav>
      )}
    </div>
  );
}
