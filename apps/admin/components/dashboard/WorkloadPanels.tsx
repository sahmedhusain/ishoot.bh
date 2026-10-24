"use client";
import { formatMessage } from "@platform/locales";
import Link from "next/link";
import type { ApprovalWorkload, ComplaintWorkload, RequestWorkload, WorkloadRequestRow } from "@platform/database";
import { approvalTargetUrl, STALE_APPROVAL_DAYS } from "@platform/database/constants/approvals";
import { ROUTES } from "../../constants/routes";
import { ArrowUpRight, CheckCircle2, Clock, Inbox, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface WorkloadPanelsProps {
  approvals: ApprovalWorkload;
  requests: RequestWorkload | null;
  complaints: ComplaintWorkload | null;
  /** Server time, so ages render the same on server and client. */
  generatedAt: string;
}

const card = "bg-white dark:bg-surface-raised border border-ink/15 rounded-2xl shadow-xs";
const requestsLink = (query: Record<string, string> = {}) => {
  const params = new URLSearchParams(query).toString();
  return params ? `${ROUTES.requests.list}?${params}` : ROUTES.requests.list;
};

export function WorkloadPanels({ approvals, requests, complaints, generatedAt }: WorkloadPanelsProps) {
  const { t } = useAdminLocale();
  const w = t.workload;
  const now = new Date(generatedAt).getTime();
  const age = (iso: string | null) => {
    if (!iso) return w.none;
    const hours = Math.max(0, (now - new Date(iso).getTime()) / 3600000);
    return hours < 48 ? formatMessage(w.hours, { n: String(Math.round(hours)) }) : formatMessage(w.days, { n: String(Math.floor(hours / 24)) });
  };
  const duration = (hours: number | null) =>
    hours == null ? w.none : hours < 48 ? formatMessage(w.hours, { n: String(hours) }) : formatMessage(w.days, { n: String(Math.round(hours / 24)) });
  const typeLabel = (type: string) => (t.approvals.types as Record<string, string>)[type] ?? type;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section aria-labelledby="wl-approvals" className={`${card} p-5 space-y-4 ${approvals.org ? "xl:col-span-2" : "xl:col-span-3"}`}>
          <PanelHeader id="wl-approvals" icon={<ShieldCheck className="w-4 h-4" />} title={w.approvalsTitle} href={ROUTES.approvals()} linkLabel={w.openApprovals} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label={w.pending} value={approvals.awaitingMe} tone={approvals.awaitingMe ? "accent" : "neutral"} href={ROUTES.approvals()} />
            <Tile label={w.oldestWaiting} value={age(approvals.oldestAwaitingAt)} />
            <Tile label={w.submittedPending} value={approvals.mySubmittedPending} href={ROUTES.approvals({ scope: "mine" })} />
            <Tile label={w.decidedLast30} value={approvals.myDecidedLast30} />
          </div>
          {Object.keys(approvals.awaitingMeByType).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(approvals.awaitingMeByType).map(([type, count]) => (
                <Link key={type} href={ROUTES.approvals({ type })} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-ink/5">
                  {typeLabel(type)} <span className="rounded-full bg-accent/15 text-accent px-1.5 text-[11px] font-bold">{count}</span>
                </Link>
              ))}
            </div>
          )}
          {approvals.queue.length ? (
            <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10">
              {approvals.queue.map((item) => (
                <li key={item.id}>
                  <Link href={approvalTargetUrl(item.targetType, item.targetId)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink/5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{typeLabel(item.targetType)}</div>
                      <div className="text-[11px] text-ink-muted truncate">
                        {formatMessage(w.from, { name: item.requester })} · {formatMessage(w.step, { n: String(item.currentStep) })}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted shrink-0">
                      <Clock className="w-3 h-3" aria-hidden /> {age(item.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text={w.approvalsEmpty} />
          )}
        </section>

        {approvals.org && (
          <section aria-labelledby="wl-org" className={`${card} p-5 space-y-4`}>
            <PanelHeader id="wl-org" icon={<CheckCircle2 className="w-4 h-4" />} title={w.orgApprovalsTitle} href={ROUTES.approvals({ scope: "all", status: "pending" })} linkLabel={w.viewAll} />
            <div className="grid grid-cols-2 gap-3">
              <Tile label={w.pending} value={approvals.org.pending} />
              <Tile label={formatMessage(w.stale, { days: String(STALE_APPROVAL_DAYS) })} value={approvals.org.stale} tone={approvals.org.stale ? "warn" : "neutral"} />
              <Tile label={w.approved30} value={approvals.org.approvedLast30} />
              <Tile label={w.rejected30} value={approvals.org.rejectedLast30} />
              <Tile label={w.avgDecision} value={duration(approvals.org.avgDecisionHours)} wide />
            </div>
            <Breakdown title={w.byType} data={approvals.org.byType} label={typeLabel} />
          </section>
        )}
      </div>

      {requests && (
        <section aria-labelledby="wl-requests" className={`${card} p-5 space-y-5`}>
          <PanelHeader id="wl-requests" icon={<Inbox className="w-4 h-4" />} title={w.requestsTitle} href={requestsLink()} linkLabel={w.viewAll} />
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <Tile label={t.requestInbox.stats.open} value={requests.open} href={requestsLink()} />
            <Tile label={t.requestInbox.stats.overdue} value={requests.overdue} tone={requests.overdue ? "danger" : "neutral"} href={requestsLink({ overdue: "true" })} />
            <Tile label={t.requestInbox.stats.unassigned} value={requests.unassigned} tone={requests.unassigned ? "warn" : "neutral"} href={requestsLink({ scope: "unassigned" })} />
            <Tile label={t.requestInbox.stats.awaitingApproval} value={requests.awaitingApproval} href={requestsLink({ status: "pending_approval" })} />
            <Tile label={w.newLast7} value={requests.newLast7} />
            <Tile label={w.resolved30} value={requests.resolvedLast30} />
            <Tile label={w.avgResolution} value={duration(requests.avgResolutionHours)} />
            <Tile label={w.slaMet} value={requests.slaMetPct == null ? w.none : `${requests.slaMetPct}%`} tone={requests.slaMetPct != null && requests.slaMetPct < 80 ? "warn" : "neutral"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            <Breakdown title={w.byKind} data={requests.byKind} label={(k) => (t.requestInbox.kinds as Record<string, string>)[k] ?? k} href={(k) => requestsLink({ kind: k })} />
            <Breakdown title={w.byPriority} data={requests.byPriority} label={(k) => (t.requestLabels.priority as Record<string, string>)[k] ?? k} href={(k) => requestsLink({ priority: k })} />
            <Breakdown title={w.byTeam} data={requests.byTeam} label={(k) => (k === "none" ? w.noTeam : (t.requestLabels.teams as Record<string, string>)[k] ?? k)} href={(k) => (k === "none" ? undefined : requestsLink({ team: k }))} />
            <Breakdown title={w.byStatus} data={requests.byStatus} label={(k) => (t.requestLabels.workflow as Record<string, string>)[k] ?? k} href={(k) => requestsLink({ status: k })} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider">{w.myQueue} · {requests.mine.open}</h3>
              {requests.mine.overdue > 0 && (
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{formatMessage(w.myOverdue, { n: String(requests.mine.overdue) })}</span>
              )}
            </div>
            {requests.mine.items.length ? <RequestList rows={requests.mine.items} age={age} /> : <EmptyState text={w.myQueueEmpty} />}
          </div>
        </section>
      )}

      {complaints && (
        <section aria-labelledby="wl-complaints" className={`${card} p-5 space-y-5`}>
          <PanelHeader id="wl-complaints" icon={<MessageSquareWarning className="w-4 h-4" />} title={w.complaintsTitle} href={requestsLink({ kind: "feedback" })} linkLabel={w.viewAll} />
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
            <Tile label={t.requestInbox.stats.open} value={complaints.open} href={requestsLink({ kind: "feedback" })} />
            <Tile label={t.requestInbox.stats.overdue} value={complaints.overdue} tone={complaints.overdue ? "danger" : "neutral"} href={requestsLink({ kind: "feedback", overdue: "true" })} />
            <Tile label={t.requestInbox.stats.unassigned} value={complaints.unassigned} tone={complaints.unassigned ? "warn" : "neutral"} href={requestsLink({ kind: "feedback", scope: "unassigned" })} />
            <Tile label={w.newLast7} value={complaints.newLast7} hint={formatMessage(w.vsLastWeek, { n: String(complaints.newPrevious7) })} tone={complaints.newLast7 > complaints.newPrevious7 ? "warn" : "neutral"} />
            <Tile label={w.resolved30} value={complaints.resolvedLast30} />
            <Tile label={w.avgResolution} value={duration(complaints.avgResolutionHours)} />
            <Tile label={w.slaMet} value={complaints.slaMetPct == null ? w.none : `${complaints.slaMetPct}%`} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Breakdown title={w.byPriority} data={complaints.byPriority} label={(k) => (t.requestLabels.priority as Record<string, string>)[k] ?? k} />
            <div className="lg:col-span-2 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider">{w.latestComplaints}</h3>
              {complaints.latest.length ? <RequestList rows={complaints.latest} age={age} showAssignee /> : <EmptyState text={w.complaintsEmpty} />}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PanelHeader({ id, icon, title, href, linkLabel }: { id: string; icon: React.ReactNode; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-sm font-bold">
        <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center" aria-hidden>{icon}</span>
        {title}
      </h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint hover:underline">
        {linkLabel} <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden />
      </Link>
    </div>
  );
}

const tones = {
  neutral: "text-ink",
  accent: "text-accent",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
};

function Tile({ label, value, tone = "neutral", href, hint, wide }: { label: string; value: string | number; tone?: keyof typeof tones; href?: string; hint?: string; wide?: boolean }) {
  const body = (
    <>
      <div className="text-[11px] font-medium text-ink-muted leading-tight">{label}</div>
      <div className={`text-xl font-bold mt-1 tabular-nums ${tones[tone]}`}>{value}</div>
      {hint && <div className="text-[10px] text-ink-muted mt-0.5">{hint}</div>}
    </>
  );
  const cls = `block rounded-xl bg-surface-sunken/60 border border-ink/10 p-3 ${wide ? "col-span-2" : ""}`;
  return href ? <Link href={href} className={`${cls} hover:border-accent/40 transition-colors`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Breakdown({ title, data, label, href }: { title: string; data: Record<string, number>; label: (key: string) => string; href?: (key: string) => string | undefined }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider">{title}</h3>
      <ul className="space-y-1.5">
        {entries.map(([key, count]) => {
          const target = href?.(key);
          const row = (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted truncate">{label(key)}</span>
                <span className="font-bold tabular-nums">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </>
          );
          return <li key={key}>{target ? <Link href={target} className="block space-y-1 hover:opacity-80">{row}</Link> : <div className="space-y-1">{row}</div>}</li>;
        })}
      </ul>
    </div>
  );
}

function RequestList({ rows, age, showAssignee }: { rows: (WorkloadRequestRow & { assignee?: string | null })[]; age: (iso: string | null) => string; showAssignee?: boolean }) {
  const { t } = useAdminLocale();
  return (
    <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={ROUTES.requests.detail(row.id)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink/5">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{row.title}</div>
              <div className="text-[11px] text-ink-muted truncate">
                <span dir="ltr">{row.reference}</span> · {row.customer}
                {showAssignee && <> · {row.assignee ?? t.workload.unassigned}</>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-[11px]">
              <span className="rounded-full border border-ink/15 px-2 py-0.5">{(t.requestLabels.priority as Record<string, string>)[row.priority] ?? row.priority}</span>
              {row.overdue ? (
                <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 font-semibold">{t.workload.overdue}</span>
              ) : (
                <span className="text-ink-muted">{age(row.createdAt)}</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-xs text-ink-muted">{text}</p>;
}
