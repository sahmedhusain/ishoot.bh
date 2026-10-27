"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { Button, Input, Select, formatCurrencyValue } from "@platform/ui";
import type { RecurringPayInput, RecurringPayRecord } from "@platform/database";
import { PAY_LINE_CATEGORIES } from "@platform/database/constants/hr";
import { deleteRecurringPayAction, saveRecurringPayAction } from "../../app/actions/payroll";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const thisMonth = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 7);
const empty = (kind: "addition" | "deduction"): RecurringPayInput => ({ kind, category: PAY_LINE_CATEGORIES[kind][0], label: "", amount: 0, start_month: thisMonth(), end_month: "", is_active: true, note: "" });
const toInput = (r: RecurringPayRecord): RecurringPayInput => ({ kind: r.kind, category: r.category, label: r.label, amount: r.amount, start_month: r.start_month, end_month: r.end_month ?? "", is_active: r.is_active, note: r.note ?? "" });

/** Custom additions and deductions an employee gets every month; payroll adds them to each run automatically. */
export function RecurringPayPanel({ employeeId, items, canEdit }: { employeeId: string; items: RecurringPayRecord[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const c = t.payLines;
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ id?: string; value: RecurringPayInput } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const money = (v: number) => formatCurrencyValue(v, "BHD", locale === "ar");
  const set = <K extends keyof RecurringPayInput>(key: K, value: RecurringPayInput[K]) => setEditing((e) => (e ? { ...e, value: { ...e.value, [key]: value } } : e));
  const run = async (work: () => Promise<unknown>, done: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(c.saved);
      done();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.failed));
    } finally {
      setBusy(false);
    }
  };
  const monthly = (kind: string) => items.filter((i) => i.kind === kind && i.is_active).reduce((sum, i) => sum + i.amount, 0);

  return (
    <section className="rounded-3xl border border-outline-variant bg-surface-raised dark:bg-surface-raised p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Repeat className="h-4 w-4 text-accent" />{c.recurringTitle}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{c.recurringSubtitle}</p>
        </div>
        {canEdit && !editing ? (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing({ value: empty("addition") })}><Plus className="h-3.5 w-3.5" />{c.addAddition}</Button>
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing({ value: empty("deduction") })}><Plus className="h-3.5 w-3.5" />{c.addDeduction}</Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className={`rounded-2xl border p-4 space-y-3 ${editing.value.kind === "addition" ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">{editing.value.kind === "addition" ? c.additions : c.deductions}</h3>
            <button type="button" aria-label={t.actions.cancel} onClick={() => setEditing(null)} className="rounded-lg p-1 text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <label className="block lg:col-span-1">
              <span className="text-xs font-semibold text-ink mb-1 block">{c.category}</span>
              <Select value={editing.value.category} onChange={(e) => set("category", e.target.value)}>
                {PAY_LINE_CATEGORIES[editing.value.kind].map((cat) => <option key={cat} value={cat}>{(c.categories as Record<string, string>)[cat]}</option>)}
              </Select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold text-ink mb-1 block">{c.description}</span>
              <Input value={editing.value.label} maxLength={120} onChange={(e) => set("label", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{c.monthlyAmount}</span>
              <Input type="number" min={0.001} step="0.001" dir="ltr" value={editing.value.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{c.from}</span>
              <Input type="month" value={editing.value.start_month} onChange={(e) => set("start_month", e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{c.to}</span>
              <Input type="month" value={editing.value.end_month ?? ""} onChange={(e) => set("end_month", e.target.value)} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={editing.value.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            {c.active}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>{t.actions.cancel}</Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => run(() => saveRecurringPayAction(employeeId, { ...editing.value, end_month: editing.value.end_month || undefined }, editing.id), () => setEditing(null))}>{c.save}</Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 && !editing ? <p className="text-xs text-ink-muted">{c.noRecurring}</p> : null}
      {items.length ? (
        <>
          <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
            {items.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 ${r.is_active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{r.label}</div>
                  <div className="text-[11px] text-ink-muted">
                    {(c.categories as Record<string, string>)[r.category]} · {formatMessage(c.period, { from: r.start_month, to: r.end_month || c.openEnded })}
                    {!r.is_active ? ` · ${c.inactive}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${r.kind === "addition" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                    <bdi dir="ltr">{r.kind === "addition" ? "+" : "−"}</bdi> {money(r.amount)}
                  </span>
                  {canEdit ? (
                    <>
                      <button type="button" aria-label={c.edit} title={c.edit} onClick={() => setEditing({ id: r.id, value: toInput(r) })} className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label={c.remove} title={c.remove} disabled={busy} onClick={() => run(() => deleteRecurringPayAction(r.id), () => undefined)} className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-muted">
            {formatMessage(c.recurringTotals, { additions: money(monthly("addition")), deductions: money(monthly("deduction")) })}
          </p>
        </>
      ) : null}
    </section>
  );
}
