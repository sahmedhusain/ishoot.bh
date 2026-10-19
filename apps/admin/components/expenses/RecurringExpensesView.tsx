"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlarmClock, ArrowLeft, CalendarClock, CheckCircle2, Pause, Pencil, Play, Plus, Repeat, SkipForward, Trash2, X, Zap } from "lucide-react";
import { Button, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import type { ExpenseCategory } from "@platform/database/types";
import type { RecurringExpenseInput, RecurringExpenseRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import {
  deleteRecurringExpenseAction,
  recordRecurringExpenseAction,
  saveRecurringExpenseAction,
  skipRecurringExpenseAction,
} from "../../app/actions/recurring-expenses";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useCompanyVat } from "../../hooks/useCompanyVat";
import { errorMessage } from "../../lib/error-text";

const FREQUENCIES = ["weekly", "monthly", "quarterly", "semiannual", "yearly"] as const;
const PAYMENT_METHODS = ["bank_transfer", "card", "cash", "cheque", "online"] as const;
const today = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const empty = (): RecurringExpenseInput => ({
  title_en: "", title_ar: "", category_id: "", vendor_name: "", reference: "", amount: 0, input_vat_amount: 0, is_vat_recoverable: true,
  currency: "BHD", payment_method: "bank_transfer", frequency: "monthly", start_date: today(), end_date: "", auto_record: false,
  remind_days_before: 3, is_active: true, notes: "",
});
const toInput = (r: RecurringExpenseRecord): RecurringExpenseInput => ({
  title_en: r.title_en, title_ar: r.title_ar ?? "", category_id: r.category_id ?? "", vendor_name: r.vendor_name ?? "", reference: r.reference ?? "",
  amount: r.amount, input_vat_amount: r.input_vat_amount, is_vat_recoverable: r.is_vat_recoverable, currency: r.currency, payment_method: r.payment_method ?? "",
  frequency: r.frequency, start_date: r.start_date, end_date: r.end_date ?? "", auto_record: r.auto_record, remind_days_before: r.remind_days_before,
  is_active: r.is_active, notes: r.notes ?? "",
});

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-ink mb-1 block">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

/** Periodic company bills: what is due, what they cost a month, and recording or skipping each due date. */
export function RecurringExpensesView({ items, categories, canWrite, canDelete }: { items: RecurringExpenseRecord[]; categories: ExpenseCategory[]; canWrite: boolean; canDelete: boolean }) {
  const { t, locale } = useAdminLocale();
  const c = t.recurringExpenses;
  const vat = useCompanyVat();
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ id?: string; value: RecurringExpenseInput } | null>(null);
  const [recording, setRecording] = React.useState<{ id: string; amount: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const isAr = locale === "ar";
  const money = (v: number, currency = "BHD") => formatCurrencyValue(v, currency, isAr);
  const set = <K extends keyof RecurringExpenseInput>(key: K, value: RecurringExpenseInput[K]) => setEditing((e) => (e ? { ...e, value: { ...e.value, [key]: value } } : e));

  const run = async (work: () => Promise<unknown>, success: string, done?: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(success);
      done?.();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.failed));
    } finally {
      setBusy(false);
    }
  };

  const active = items.filter((i) => i.is_active);
  const bhd = active.filter((i) => i.currency === "BHD");
  const monthly = bhd.reduce((sum, i) => sum + i.monthly_equivalent, 0);
  const dueSoon = active.filter((i) => i.days_until <= Math.max(7, i.remind_days_before));
  const overdue = active.filter((i) => i.days_until < 0 && !i.auto_record);
  const title = (r: RecurringExpenseRecord) => (isAr && r.title_ar) || r.title_en;
  const dueText = (r: RecurringExpenseRecord) =>
    r.days_until < 0 ? formatMessage(c.overdueBy, { days: String(-r.days_until) }) : r.days_until === 0 ? c.dueToday : formatMessage(c.dueIn, { days: String(r.days_until) });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.expenses.list()} aria-label={t.actions.back} className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2"><Repeat className="h-5 w-5 text-accent" />{c.title}</h1>
            <p className="text-xs text-ink-muted mt-1">{c.subtitle}</p>
          </div>
        </div>
        {canWrite && !editing ? (
          <Button size="sm" className="gap-1.5 self-start" onClick={() => setEditing({ value: empty() })}><Plus className="h-4 w-4" />{c.add}</Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [c.stats.active, String(active.length)],
          [c.stats.monthly, money(monthly)],
          [c.stats.yearly, money(monthly * 12)],
          [c.stats.dueSoon, String(dueSoon.length), overdue.length ? "text-rose-600 dark:text-rose-300" : ""],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-ink/10 bg-white dark:bg-surface-raised p-4">
            <div className="text-[11px] text-ink-muted">{label}</div>
            <div className={`mt-1 text-lg font-bold tabular-nums ${tone || "text-ink"}`}>{value}</div>
          </div>
        ))}
      </div>

      {editing ? (
        <section className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{editing.id ? c.edit : c.add}</h2>
            <button type="button" aria-label={t.actions.cancel} onClick={() => setEditing(null)} className="rounded-lg p-1 text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label={c.fields.titleEn}><Input value={editing.value.title_en} onChange={(e) => set("title_en", e.target.value)} placeholder={c.fields.titlePlaceholder} /></Field>
            <Field label={c.fields.titleAr}><Input dir="rtl" value={editing.value.title_ar ?? ""} onChange={(e) => set("title_ar", e.target.value)} /></Field>
            <Field label={c.fields.category}>
              <Select value={editing.value.category_id ?? ""} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">{c.fields.select}</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{isAr ? cat.name_ar : cat.name_en}</option>)}
              </Select>
            </Field>
            <Field label={c.fields.vendor}><Input value={editing.value.vendor_name ?? ""} onChange={(e) => set("vendor_name", e.target.value)} /></Field>
            <Field label={c.fields.reference} hint={c.fields.referenceHint}><Input dir="ltr" value={editing.value.reference ?? ""} onChange={(e) => set("reference", e.target.value)} /></Field>
            <Field label={c.fields.amount}><Input type="number" min={0.001} step="0.001" dir="ltr" value={editing.value.amount || ""} onChange={(e) => set("amount", Number(e.target.value))} /></Field>
            {vat.enabled ? (
              <Field label={c.fields.inputVat}><Input type="number" min={0} step="0.001" dir="ltr" value={editing.value.input_vat_amount || ""} onChange={(e) => set("input_vat_amount", Number(e.target.value))} /></Field>
            ) : null}
            <Field label={c.fields.paymentMethod}>
              <Select value={editing.value.payment_method ?? ""} onChange={(e) => set("payment_method", e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{(t.pdfDocs.paymentMethods as Record<string, string>)[m] ?? m}</option>)}
              </Select>
            </Field>
            <Field label={c.fields.frequency}>
              <Select value={editing.value.frequency} onChange={(e) => set("frequency", e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{c.frequencies[f]}</option>)}
              </Select>
            </Field>
            <Field label={c.fields.startDate} hint={c.fields.startHint}><Input type="date" value={editing.value.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
            <Field label={c.fields.endDate}><Input type="date" value={editing.value.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} /></Field>
            <Field label={c.fields.remind}><Input type="number" min={0} max={60} value={editing.value.remind_days_before ?? 3} onChange={(e) => set("remind_days_before", Number(e.target.value))} /></Field>
            <Field label={c.fields.notes} wide><Input value={editing.value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {([false, true] as const).map((auto) => (
              <button
                key={String(auto)}
                type="button"
                aria-pressed={editing.value.auto_record === auto}
                onClick={() => set("auto_record", auto)}
                className={`rounded-2xl border p-3 text-start ${editing.value.auto_record === auto ? "border-accent bg-white dark:bg-surface ring-2 ring-accent/20" : "border-ink/15"}`}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-ink">{auto ? <Zap className="h-4 w-4 text-accent" /> : <AlarmClock className="h-4 w-4 text-accent" />}{auto ? c.modes.auto : c.modes.manual}</span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">{auto ? c.modes.autoHint : c.modes.manualHint}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={editing.value.is_active} onChange={(e) => set("is_active", e.target.checked)} />
            {c.fields.active}
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>{t.actions.cancel}</Button>
            <Button size="sm" disabled={busy} onClick={() => run(() => saveRecurringExpenseAction({ ...editing.value, end_date: editing.value.end_date || undefined, category_id: editing.value.category_id || undefined }, editing.id), c.saved, () => setEditing(null))}>{c.save}</Button>
          </div>
        </section>
      ) : null}

      {items.length === 0 && !editing ? (
        <div className="rounded-3xl border border-dashed border-ink/15 p-10 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-ink-muted" />
          <p className="mt-2 text-sm font-semibold text-ink">{c.empty}</p>
          <p className="text-xs text-ink-muted">{c.emptyHint}</p>
        </div>
      ) : null}

      {items.length ? (
        <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{c.columns.bill}</th>
                  <th className="px-4 py-3 text-start font-semibold">{c.columns.frequency}</th>
                  <th className="px-4 py-3 text-end font-semibold">{c.columns.amount}</th>
                  <th className="px-4 py-3 text-start font-semibold">{c.columns.nextDue}</th>
                  <th className="px-4 py-3"><span className="sr-only">{c.columns.actions}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {items.map((r) => (
                  <tr key={r.id} className={`align-top ${r.is_active ? "" : "opacity-60"}`}>
                    <td className="px-4 py-3 min-w-56">
                      <div className="font-semibold text-ink flex items-center gap-2">
                        {r.category ? <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.category.color }} /> : null}
                        {title(r)}
                      </div>
                      <div className="text-[11px] text-ink-muted">
                        {[r.category ? (isAr ? r.category.name_ar : r.category.name_en) : null, r.vendor_name, r.reference].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink whitespace-nowrap">
                      <div>{c.frequencies[r.frequency]}</div>
                      <div className="text-ink-muted">{r.auto_record ? c.modes.auto : c.modes.manual}</div>
                    </td>
                    <td className="px-4 py-3 text-end text-xs whitespace-nowrap tabular-nums">
                      <div className="font-semibold text-ink">{money(r.amount, r.currency)}</div>
                      {r.frequency !== "monthly" ? <div className="text-ink-muted">{formatMessage(c.perMonth, { amount: money(r.monthly_equivalent, r.currency) })}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.is_active ? (
                        <>
                          <div className="text-ink">{formatDate(r.next_due_date, locale)}</div>
                          <div className={r.days_until < 0 ? "font-semibold text-rose-600 dark:text-rose-300" : r.days_until <= r.remind_days_before ? "font-semibold text-amber-600 dark:text-amber-300" : "text-ink-muted"}>{dueText(r)}</div>
                        </>
                      ) : (
                        <span className="text-ink-muted">{c.paused}</span>
                      )}
                      {r.recorded_count ? <div className="text-ink-muted">{formatMessage(c.recordedCount, { n: String(r.recorded_count) })}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">
                      {canWrite ? (
                        recording?.id === r.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <input aria-label={c.actualAmount} type="number" min={0.001} step="0.001" dir="ltr" className="h-8 w-24 rounded-lg border border-ink/15 bg-surface-sunken/60 px-2 text-xs" value={recording.amount} onChange={(e) => setRecording({ id: r.id, amount: e.target.value })} />
                            <button type="button" disabled={busy} onClick={() => run(() => recordRecurringExpenseAction(r.id, Number(recording.amount) !== r.amount ? { amount: Number(recording.amount) } : {}), c.recorded, () => setRecording(null))} className="rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white">{c.confirmRecord}</button>
                            <button type="button" aria-label={t.actions.cancel} onClick={() => setRecording(null)} className="rounded-lg p-1.5 text-ink-muted"><X className="h-3.5 w-3.5" /></button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {r.is_active ? (
                              <>
                                <button type="button" title={c.record} onClick={() => setRecording({ id: r.id, amount: String(r.amount) })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/10"><CheckCircle2 className="h-3.5 w-3.5" />{c.record}</button>
                                <button type="button" title={c.skip} aria-label={c.skip} disabled={busy} onClick={() => run(() => skipRecurringExpenseAction(r.id), c.skipped)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"><SkipForward className="h-3.5 w-3.5" /></button>
                              </>
                            ) : null}
                            <button type="button" title={r.is_active ? c.pause : c.resume} aria-label={r.is_active ? c.pause : c.resume} disabled={busy} onClick={() => run(() => saveRecurringExpenseAction({ ...toInput(r), is_active: !r.is_active, end_date: r.end_date, category_id: r.category_id }, r.id), c.saved)} className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5">{r.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
                            <button type="button" title={c.edit} aria-label={c.edit} onClick={() => setEditing({ id: r.id, value: toInput(r) })} className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"><Pencil className="h-3.5 w-3.5" /></button>
                            {canDelete && r.recorded_count === 0 ? (
                              <button type="button" title={c.delete} aria-label={c.delete} disabled={busy} onClick={() => run(() => deleteRecurringExpenseAction(r.id), c.deleted)} className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                            ) : null}
                          </span>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-ink/10 px-4 py-3 text-[11px] text-ink-muted">{c.footnote}</p>
        </div>
      ) : null}
    </div>
  );
}
