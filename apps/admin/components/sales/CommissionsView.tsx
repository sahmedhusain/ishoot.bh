"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@ishoot/ui";
import { BadgeDollarSign, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { CommissionRow } from "@ishoot/database/queries/sales-attribution";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { recordCommissionPayoutAction } from "../../app/actions/sales";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function CommissionsView({ month, rows, canRecord, canSetRates }: { month: string; rows: CommissionRow[]; canRecord: boolean; canSetRates: boolean }) {
  const { t } = useAdminLocale();
  const c = t.commissions;
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const totals = rows.reduce((acc, r) => ({ collected: acc.collected + r.collectedNet, commission: acc.commission + r.commission }), { collected: 0, commission: 0 });
  const current = new Date().toISOString().slice(0, 7);

  const record = async (userId: string) => {
    setBusy(userId);
    try {
      await recordCommissionPayoutAction(userId, month);
      toast.success(c.recorded);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-accent" />
            {c.title}
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">{c.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={ROUTES.finance.commissions({ month: shiftMonth(month, -1) })} aria-label={c.previous} className="p-2 rounded-full border border-ink/15 hover:bg-ink/5">
            <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
          <form>
            <input type="month" name="month" defaultValue={month} max={current} aria-label={c.month} className="rounded-full border border-ink/15 bg-surface px-3 py-1.5 text-sm text-ink" onChange={(e) => router.push(ROUTES.finance.commissions({ month: e.target.value }))} />
          </form>
          {month < current && (
            <Link href={ROUTES.finance.commissions({ month: shiftMonth(month, 1) })} aria-label={c.next} className="p-2 rounded-full border border-ink/15 hover:bg-ink/5">
              <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-3xl bg-surface border border-ink/10">
          <div className="text-xs text-ink-muted">{c.collected}</div>
          <div className="text-2xl font-bold text-ink mt-1">BHD {fmt(totals.collected)}</div>
        </Card>
        <Card className="p-5 rounded-3xl bg-surface border border-ink/10">
          <div className="text-xs text-ink-muted">{c.totalCommission}</div>
          <div className="text-2xl font-bold text-accent mt-1">BHD {fmt(totals.commission)}</div>
        </Card>
        <Card className="p-5 rounded-3xl bg-surface border border-ink/10">
          <div className="text-xs text-ink-muted">{c.recordedCount}</div>
          <div className="text-2xl font-bold text-ink mt-1">{rows.filter((r) => r.payout).length} / {rows.filter((r) => r.commission > 0).length}</div>
        </Card>
      </div>

      <Card className="p-0 rounded-3xl bg-surface border border-ink/10 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">{c.empty}</p>
        ) : (
          <table className="w-full text-xs min-w-[720px]">
            <thead className="bg-surface-sunken text-ink-muted">
              <tr>
                <th className="p-3 ps-5 text-start">{c.person}</th>
                <th className="p-3 text-end">{c.invoices}</th>
                <th className="p-3 text-end">{c.collectedNet}</th>
                <th className="p-3 text-end">{c.rate}</th>
                <th className="p-3 text-end">{c.commission}</th>
                <th className="p-3 pe-5 text-end">{c.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.map((r) => (
                <tr key={r.userId}>
                  <td className="p-3 ps-5">
                    <div className="font-semibold text-ink">{r.name}</div>
                    <div className="text-[11px] text-ink-muted">{r.role.replace("_", " ")}</div>
                  </td>
                  <td className="p-3 text-end text-ink">{r.invoices}</td>
                  <td className="p-3 text-end text-ink">{fmt(r.collectedNet)}</td>
                  <td className="p-3 text-end text-ink-muted">{r.ratePercent ? `${r.ratePercent}%` : canSetRates ? <Link href={ROUTES.users.list} className="text-accent hover:underline">{c.setRate}</Link> : "—"}</td>
                  <td className="p-3 text-end font-bold text-ink">{fmt(r.commission)}</td>
                  <td className="p-3 pe-5 text-end">
                    {r.payout ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {r.payout.viaPayroll ? c.paidWithSalary : c.recordedOn.replace("{date}", r.payout.recordedAt.slice(0, 10))}
                      </span>
                    ) : r.onPayroll && r.commission > 0 ? (
                      <span className="text-ink-muted">{c.inPayroll}</span>
                    ) : canRecord && r.commission > 0 && month < current ? (
                      <button type="button" disabled={busy === r.userId} onClick={() => record(r.userId)} className="px-3 py-1.5 rounded-full bg-accent text-white font-semibold disabled:opacity-60">
                        {c.record}
                      </button>
                    ) : (
                      <span className="text-ink-muted">{month >= current && r.commission > 0 ? c.monthOpen : "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
