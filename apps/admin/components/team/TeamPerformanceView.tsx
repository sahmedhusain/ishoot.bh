"use client";
import { useCompanyCurrency } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { getCurrencyLabel } from "@platform/config/currency";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select, Card } from "@platform/ui";
import { Gauge, FileText, Receipt, LifeBuoy, ChevronDown, ChevronUp } from "lucide-react";
import type { TeamHistoryItem, TeamMemberKpis } from "@platform/database/queries/team-performance";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const PERIODS = ["month", "quarter", "year"] as const;

interface TeamPerformanceViewProps {
  period: (typeof PERIODS)[number];
  from: string;
  to: string;
  members: TeamMemberKpis[];
  history: Record<string, TeamHistoryItem[]>;
  managers?: { id: string; name: string }[];
  managerId?: string;
}

export function TeamPerformanceView({ period, from, to, members, history, managers, managerId }: TeamPerformanceViewProps) {
  const { t, locale } = useAdminLocale();
  const bhd = getCurrencyLabel(useCompanyCurrency(), locale === "ar");
  const k = t.team;
  const router = useRouter();
  const [open, setOpen] = React.useState<string | null>(null);
  const go = (next: { period?: string; manager?: string }) => {
    const params = new URLSearchParams({ period: next.period ?? period, ...(next.manager ?? managerId ? { manager: next.manager ?? managerId! } : {}) });
    router.push(`${ROUTES.team}?${params}`);
  };
  const total = members.reduce(
    (acc, m) => ({
      collected: acc.collected + m.sales.collectedNet,
      quotes: acc.quotes + m.quotations.issued,
      resolved: acc.resolved + m.requests.resolved,
      overdue: acc.overdue + m.requests.overdue,
    }),
    { collected: 0, quotes: 0, resolved: 0, overdue: 0 },
  );
  const href = (item: TeamHistoryItem) =>
    item.kind === "quotation" ? ROUTES.quotations.detail(item.id) : item.kind === "invoice" ? ROUTES.invoices.detail(item.id) : ROUTES.requests.detail(item.id);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <Gauge className="w-7 h-7 text-accent" />
            <bdi dir="auto">{k.title}</bdi>
          </h1>
          <p className="text-xs text-ink-muted mt-1">{formatMessage(k.subtitle, { from: from, to: to })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {managers && managers.length > 0 && (
            <Select aria-label={k.manager} value={managerId ?? ""} onChange={(e) => go({ manager: e.target.value })} className="px-3 py-2 rounded-full border border-outline-variant bg-surface text-sm text-ink">
              <option value="">{k.everyone}</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          )}
          <div role="tablist" className="inline-flex p-1 rounded-full bg-surface-sunken border border-outline-variant">
            {PERIODS.map((p) => (
              <button key={p} type="button" role="tab" aria-selected={period === p} onClick={() => go({ period: p })} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${period === p ? "bg-accent text-accent-foreground" : "text-ink-muted hover:text-ink"}`} tabIndex={period === p ? 0 : -1}>
                {k.periods[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          [k.collected, `${bhd} ${fmt(total.collected)}`],
          [k.quotesIssued, String(total.quotes)],
          [k.srResolved, String(total.resolved)],
          [k.srOverdue, String(total.overdue)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5 rounded-3xl bg-surface border border-outline-variant">
            <div className="text-xs text-ink-muted">{label}</div>
            <div className="text-2xl font-bold text-ink mt-1">{value}</div>
          </Card>
        ))}
      </div>

      {members.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant">{k.empty}</Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <Card key={m.userId} className="p-0 rounded-3xl bg-surface border border-outline-variant overflow-hidden">
              <button type="button" aria-expanded={open === m.userId} onClick={() => setOpen(open === m.userId ? null : m.userId)} className="w-full text-start p-5 grid gap-4 md:grid-cols-[1.2fr_repeat(3,1fr)_auto] items-center">
                <div>
                  <div className="font-bold text-ink"><bdi dir="auto">{m.name}</bdi></div>
                  <div className="text-[11px] text-ink-muted">{m.role.replace("_", " ")} · {formatMessage(k.leaveDays, { days: String(m.leaveDays) })}</div>
                </div>
                <div className="text-xs">
                  <div className="text-ink-muted flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{k.quotations}</div>
                  <div className="text-ink font-semibold mt-0.5">{formatMessage(k.quoteLine, { issued: String(m.quotations.issued), accepted: String(m.quotations.accepted), rate: String(m.quotations.winRate) })}</div>
                  <div className="text-ink-muted">{bhd} {fmt(m.quotations.acceptedValue)} / {fmt(m.quotations.value)}</div>
                </div>
                <div className="text-xs">
                  <div className="text-ink-muted flex items-center gap-1"><Receipt className="w-3.5 h-3.5" />{k.sales}</div>
                  <div className="text-ink font-semibold mt-0.5">{bhd} {fmt(m.sales.collectedNet)} {k.collectedShort}</div>
                  <div className="text-ink-muted">{formatMessage(k.invoicedLine, { count: String(m.sales.invoices), amount: fmt(m.sales.invoicedNet) })}</div>
                </div>
                <div className="text-xs">
                  <div className="text-ink-muted flex items-center gap-1"><LifeBuoy className="w-3.5 h-3.5" />{k.requests}</div>
                  <div className="text-ink font-semibold mt-0.5">{formatMessage(k.srLine, { resolved: String(m.requests.resolved), open: String(m.requests.open) })}</div>
                  <div className={m.requests.overdue ? "text-rose-600" : "text-ink-muted"}>
                    {formatMessage(k.srDetail, { overdue: String(m.requests.overdue), days: m.requests.avgResolutionDays === null ? "—" : String(m.requests.avgResolutionDays) })}
                  </div>
                </div>
                {open === m.userId ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
              </button>
              {open === m.userId && (
                <div className="border-t border-outline-variant overflow-x-auto">
                  {(history[m.userId] ?? []).length === 0 ? (
                    <p className="p-5 text-xs text-ink-muted">{k.noHistory}</p>
                  ) : (
                    <table className="w-full text-xs min-w-[560px]">
                      <tbody className="divide-y divide-outline-variant">
                        {(history[m.userId] ?? []).map((item) => (
                          <tr key={`${item.kind}-${item.id}`}>
                            <td className="p-3 ps-5 text-ink-muted whitespace-nowrap">{item.date.slice(0, 10)}</td>
                            <td className="p-3 text-ink-muted">{k.kinds[item.kind]}</td>
                            <td className="p-3"><Link href={href(item)} className="font-mono text-accent hover:underline">{item.reference}</Link></td>
                            <td className="p-3 text-ink truncate max-w-[220px]"><bdi dir="auto">{item.title}</bdi></td>
                            <td className="p-3 text-ink-muted">{item.status.replace("_", " ")}</td>
                            <td className="p-3 pe-5 text-end text-ink">{item.amount === null ? "" : `${item.currency} ${fmt(item.amount)}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
