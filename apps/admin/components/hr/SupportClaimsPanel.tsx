"use client";
import { formatMessage } from "@platform/locales";
import { getCurrencyLabel } from "@platform/config/currency";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { HandHeart, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { SupportClaimRow } from "@platform/database/queries/support-claims";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { recordSupportReimbursementAction } from "../../app/actions/payroll";

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Six-monthly wage-support claims (Tamkeen) built from approved payroll, with receipts. */
export function SupportClaimsPanel({ claims, canRecord }: { claims: SupportClaimRow[]; canRecord: boolean }) {
  const { t, locale } = useAdminLocale();
  const bhd = getCurrencyLabel("BHD", locale === "ar");
  const c = t.tamkeen;
  const [filter, setFilter] = React.useState<"open" | "all">("open");
  const rows = claims.filter((r) => filter === "all" || r.status !== "received");
  const sum = (status: SupportClaimRow["status"]) => claims.filter((r) => r.status === status).reduce((acc, r) => acc + r.accrued, 0);

  if (claims.length === 0) return null;
  return (
    <section className="rounded-3xl border border-outline-variant bg-surface overflow-hidden">
      <header className="p-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <HandHeart className="w-5 h-5 text-emerald-600" />
            {c.claimsTitle}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5 max-w-2xl">{c.claimsHint}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">{c.claimable}: {bhd} {fmt(sum("claimable"))}</span>
          <span className="px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300">{c.accruing}: {bhd} {fmt(sum("accruing"))}</span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{c.received}: {bhd} {fmt(sum("received"))}</span>
          <button type="button" onClick={() => setFilter(filter === "open" ? "all" : "open")} className="px-3 py-1.5 rounded-full border border-outline-variant text-ink">
            {filter === "open" ? c.showAll : c.showOpen}
          </button>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead className="bg-surface-sunken text-ink-muted">
            <tr>
              <th className="p-3 ps-5 text-start">{t.shared.employee}</th>
              <th className="p-3 text-start">{c.programme}</th>
              <th className="p-3 text-start">{c.period}</th>
              <th className="p-3 text-end">{c.months}</th>
              <th className="p-3 text-end">{c.accrued}</th>
              <th className="p-3 pe-5 text-end">{c.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((r) => (
              <ClaimRow key={`${r.employeeId}-${r.provider}-${r.periodStart}`} row={r} canRecord={canRecord} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClaimRow({ row, canRecord }: { row: SupportClaimRow; canRecord: boolean }) {
  const { t } = useAdminLocale();
  const c = t.tamkeen;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(String(row.accrued));
  const [receivedOn, setReceivedOn] = React.useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await recordSupportReimbursementAction({ employeeId: row.employeeId, provider: row.provider, periodStart: row.periodStart, receivedAmount: Number(amount), receivedOn, reference: reference || null });
      toast.success(c.recorded);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, c.failed));
    } finally {
      setSaving(false);
    }
  };
  const field = "rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-ink";

  return (
    <>
      <tr>
        <td className="p-3 ps-5">
          <div className="font-semibold text-ink"><bdi dir="auto">{row.employeeName}</bdi></div>
          <div className="text-[10px] text-ink-muted font-mono">{row.employeeNumber}</div>
        </td>
        <td className="p-3 text-ink">{row.provider}</td>
        <td className="p-3 text-ink-muted">{row.periodStart} → {row.periodEnd}</td>
        <td className="p-3 text-end text-ink">{row.monthsAccrued}/6</td>
        <td className="p-3 text-end font-semibold text-ink">{fmt(row.accrued)}</td>
        <td className="p-3 pe-5 text-end">
          {row.status === "received" && row.receipt ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold" title={row.receipt.reference ?? undefined}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {formatMessage(c.receivedOn, { amount: fmt(row.receipt.amount), date: row.receipt.receivedOn })}
            </span>
          ) : row.status === "claimable" ? (
            canRecord ? (
              <button type="button" onClick={() => setOpen(!open)} className="px-3 py-1 rounded-full bg-amber-600 text-white dark:bg-amber-400 dark:text-amber-950 font-semibold">
                {c.recordReceipt}
              </button>
            ) : (
              <span className="text-amber-600 font-semibold">{c.claimable}</span>
            )
          ) : (
            <span className="text-sky-600">{c.accruing}</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-amber-500/5">
          <td colSpan={6} className="p-3 ps-5">
            <div className="flex flex-wrap items-end justify-end gap-2">
              <label className="text-[11px] text-ink-muted space-y-1">
                <span className="block">{c.amountReceived}</span>
                <input type="number" min={0} step="0.001" className={field} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label className="text-[11px] text-ink-muted space-y-1">
                <span className="block">{c.receivedDate}</span>
                <input type="date" className={field} value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
              </label>
              <label className="text-[11px] text-ink-muted space-y-1">
                <span className="block">{c.reference}</span>
                <input className={field} value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
              <button type="button" disabled={saving} onClick={save} className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60">
                {t.actions.save}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
