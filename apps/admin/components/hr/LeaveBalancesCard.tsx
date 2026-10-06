"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Button, Card, Modal } from "@ishoot/ui";
import type { LeaveBalance } from "@ishoot/database/queries/leave-balances";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { addLeaveAdjustmentAction } from "../../app/actions/hr-settings";

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";

/** Per-type leave balances for one employee and year; HR can add adjustments. */
export function LeaveBalancesCard({ balances, year, employeeId, canAdjust = false }: { balances: LeaveBalance[]; year: number; employeeId?: string; canAdjust?: boolean }) {
  const { t, locale } = useAdminLocale();
  const l = t.leaveForm;
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const withBalance = balances.filter((b) => b.entitled != null);
  const [form, setForm] = React.useState({ leaveTypeId: withBalance[0]?.leaveTypeId ?? "", days: "", reason: "" });
  const n = (value: number) => <bdi dir="ltr" className="tabular-nums">{Math.round(value * 100) / 100}</bdi>;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeId) return;
    try {
      await addLeaveAdjustmentAction({ employeeId, leaveTypeId: form.leaveTypeId, year, days: Number(form.days), reason: form.reason });
      toast.success(l.adjustSaved);
      setOpen(false);
      setForm((f) => ({ ...f, days: "", reason: "" }));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : l.adjust);
    }
  };

  return (
    <Card className="space-y-3 p-5 dark:bg-surface-raised">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
          {l.balances} <span className="font-normal text-slate-500">· <bdi dir="ltr">{year}</bdi></span>
        </h2>
        {canAdjust && employeeId && withBalance.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {l.adjust}
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th scope="col" className="py-2 pe-3 text-start font-medium">{t.leaveManagement.leaveType2.replace(/\s*\*$/, "")}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.entitled}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.carried}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.adjusted}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.used}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.pending}</th>
              <th scope="col" className="py-2 ps-2 text-end font-semibold text-slate-700 dark:text-slate-200">{l.available}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {balances.map((b) => (
              <tr key={b.leaveTypeId}>
                <th scope="row" className="py-2 pe-3 text-start font-medium text-slate-800 dark:text-slate-100">
                  {locale === "ar" ? b.nameAr : b.nameEn}
                  <span className="block text-[10px] font-normal text-slate-500">
                    {b.hasPayBands ? l.bands : l.paidAt.replace("{percent}", String(b.payPercent))}
                    {!b.eligible && b.eligibleFrom ? ` · ${l.eligibleFrom.replace("{date}", b.eligibleFrom)}` : ""}
                  </span>
                </th>
                <td className="py-2 px-2 text-end text-slate-700 dark:text-slate-300">{b.entitled == null ? "—" : n(b.entitled)}</td>
                <td className="py-2 px-2 text-end text-slate-700 dark:text-slate-300">{b.carriedOver ? n(b.carriedOver) : "—"}</td>
                <td className="py-2 px-2 text-end text-slate-700 dark:text-slate-300">{b.adjustments ? n(b.adjustments) : "—"}</td>
                <td className="py-2 px-2 text-end text-slate-700 dark:text-slate-300">{n(b.used)}</td>
                <td className="py-2 px-2 text-end text-amber-700 dark:text-amber-400">{b.pending ? n(b.pending) : "—"}</td>
                <td className={`py-2 ps-2 text-end font-semibold ${b.available != null && b.available < 0 ? "text-rose-700 dark:text-rose-400" : "text-primary dark:text-accent"}`}>
                  {b.available == null ? l.unlimited : n(b.available)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={l.adjust} closeLabel={t.shared.cancel}>
        <form onSubmit={save} className="space-y-3">
          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            {t.leaveManagement.leaveType2}
            <select className={fieldClass} value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
              {withBalance.map((b) => <option key={b.leaveTypeId} value={b.leaveTypeId}>{locale === "ar" ? b.nameAr : b.nameEn}</option>)}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            {l.adjustDays}
            <input type="number" required step={0.5} min={-366} max={366} dir="ltr" className={fieldClass} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            {l.adjustReason}
            <input required maxLength={300} className={fieldClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.shared.cancel}</Button>
            <Button type="submit" size="sm">{l.adjust}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
