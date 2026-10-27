"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, X } from "lucide-react";
import { Button, Input, Select, formatDate } from "@platform/ui";
import type { listEmployeeHandovers } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { openEmployeeHandoverAction } from "../../app/actions/employee-handovers";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

type Row = Awaited<ReturnType<typeof listEmployeeHandovers>>[number];
type Option = { id: string; name_en: string; name_ar: string };
const STATUSES = ["active", "open", "pending_approval", "completed", "cancelled", "all"] as const;
const KINDS = ["all", "exit", "leave"] as const;
export const HANDOVER_STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending_approval: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-ink/10 text-ink-muted",
};

/** Exit and leave handovers: what each leaving or absent employee still has to hand over. */
export function HandoversListView({ items, status, kind, startFor, employees, canEdit }: {
  items: Row[];
  status: string;
  kind: string;
  startFor?: string;
  employees: Option[];
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const e = t.employeeHandovers;
  const router = useRouter();
  const isAr = locale === "ar";
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const [starting, setStarting] = React.useState(!!startFor && canEdit);
  const [form, setForm] = React.useState({ employee_id: startFor ?? "", kind: "exit" as "exit" | "leave", effective_date: today, return_date: "", reason: "" });
  const [busy, setBusy] = React.useState(false);
  const href = (patch: { status?: string; kind?: string }) => {
    const next = { status, kind, ...patch };
    return ROUTES.hr.handovers({ status: next.status === "active" ? null : next.status, kind: next.kind === "all" ? null : next.kind });
  };
  const chip = (active: boolean) => `h-9 inline-flex items-center rounded-full border px-4 text-xs font-semibold ${active ? "border-accent bg-accent/10 text-ink" : "border-outline-variant text-ink-muted hover:text-ink"}`;

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await openEmployeeHandoverAction({
        employee_id: form.employee_id,
        kind: form.kind,
        effective_date: form.effective_date,
        ...(form.kind === "leave" && form.return_date ? { return_date: form.return_date } : {}),
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
      });
      toast.success(e.started);
      router.push(ROUTES.hr.handover(result.id));
    } catch (error) {
      toast.error(errorMessage(error, t, e.failed));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-accent" /><bdi dir="auto">{e.title}</bdi></h1>
          <p className="text-xs text-ink-muted mt-1">{e.subtitle}</p>
        </div>
        {canEdit && !starting ? <Button size="sm" className="gap-1.5 rounded-full h-9 self-start" onClick={() => setStarting(true)}><Plus className="h-4 w-4" />{e.start}</Button> : null}
      </div>

      {starting ? (
        <form onSubmit={start} className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{e.start}</h2>
            <button type="button" aria-label={t.actions.cancel} onClick={() => setStarting(false)} className="rounded-lg p-1 text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{e.employee}</span>
              <Select required value={form.employee_id} onChange={(ev) => setForm({ ...form, employee_id: ev.target.value })}>
                <option value="">{e.select}</option>
                {employees.map((o) => <option key={o.id} value={o.id}>{isAr ? o.name_ar : o.name_en}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{e.kind}</span>
              <Select value={form.kind} onChange={(ev) => setForm({ ...form, kind: ev.target.value as "exit" | "leave" })}>
                <option value="exit">{e.kinds.exit}</option>
                <option value="leave">{e.kinds.leave}</option>
              </Select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{form.kind === "exit" ? e.lastDay : e.leaveStart}</span>
              <Input type="date" required value={form.effective_date} onChange={(ev) => setForm({ ...form, effective_date: ev.target.value })} />
            </label>
            {form.kind === "leave" ? (
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">{e.returnDate}</span>
                <Input type="date" min={form.effective_date} value={form.return_date} onChange={(ev) => setForm({ ...form, return_date: ev.target.value })} />
              </label>
            ) : null}
            <label className="block sm:col-span-2 lg:col-span-4">
              <span className="text-xs font-semibold text-ink mb-1 block">{e.reason}</span>
              <Input value={form.reason} onChange={(ev) => setForm({ ...form, reason: ev.target.value })} placeholder={form.kind === "exit" ? e.exitReasonHint : e.leaveReasonHint} />
            </label>
          </div>
          <p className="text-[11px] text-ink-muted">{form.kind === "exit" ? e.exitHint : e.leaveHint}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setStarting(false)}>{t.actions.cancel}</Button>
            <Button type="submit" size="sm" disabled={busy || !form.employee_id}>{e.start}</Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => <Link key={s} href={href({ status: s })} className={chip(status === s)}>{e.filters[s]}</Link>)}
        <span className="mx-1 h-5 w-px bg-ink/15" />
        {KINDS.map((k) => <Link key={k} href={href({ kind: k })} className={chip(kind === k)}>{k === "all" ? e.filters.allKinds : e.kinds[k]}</Link>)}
      </div>

      {items.length ? (
        <div className="overflow-x-auto rounded-3xl border border-outline-variant bg-surface-raised dark:bg-surface-raised">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
              <tr className="border-b border-outline-variant">
                <th className="px-4 py-3 text-start"><bdi dir="ltr">{e.reference}</bdi></th>
                <th className="px-4 py-3 text-start">{e.employee}</th>
                <th className="px-4 py-3 text-start">{e.kind}</th>
                <th className="px-4 py-3 text-start">{e.dates}</th>
                <th className="px-4 py-3 text-start">{e.cases}</th>
                <th className="px-4 py-3 text-start">{e.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map((h) => (
                <tr key={h.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3"><Link href={ROUTES.hr.handover(h.id)} className="font-mono text-xs font-semibold text-accent hover:underline">{h.reference}</Link></td>
                  <td className="px-4 py-3">
                    <Link href={ROUTES.hr.employee(h.employee.id)} className="font-semibold text-ink hover:underline">{isAr ? h.employee.name_ar : h.employee.name_en}</Link>
                    <div className="text-[11px] text-ink-muted">{h.employee.number}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">{e.kinds[h.kind as "exit" | "leave"]}</td>
                  <td className="px-4 py-3 text-xs text-ink">
                    {formatDate(h.effective_date, locale)}
                    {h.return_date ? <span className="text-ink-muted"> → {formatDate(h.return_date, locale)}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">{h.cases_pending ? formatMessage(e.casesPending, { n: String(h.cases_pending) }) : formatMessage(e.casesClear, { n: String(h.cases_total) })}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${HANDOVER_STATUS_STYLE[h.status] ?? ""}`}>{e.statuses[h.status as keyof typeof e.statuses]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-outline-variant p-10 text-center text-sm text-ink-muted">{e.empty}</div>
      )}
    </div>
  );
}
