"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal } from "lucide-react";
import { Select, Button, Card, Modal } from "@platform/ui";
import type { LeaveBalance } from "@platform/database/queries/leave-balances";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { addLeaveAdjustmentAction } from "../../app/actions/hr-settings";

const fieldClass =
  "w-full min-w-0 rounded-lg border border-outline-variant bg-surface-raised dark:bg-surface px-3 py-2 text-sm text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

/** Per-type leave balances for one employee and year; HR can add adjustments. */
export function LeaveBalancesCard({ balances, year, employeeId, canAdjust = false }: { balances: LeaveBalance[]; year: number; employeeId?: string; canAdjust?: boolean }) {
  const modalFormId = React.useId();

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
      toast.error(errorMessage(error, t, l.adjust));
    }
  };

  return (
    <Card className="space-y-3 p-5 dark:bg-surface-raised" data-page-section>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold text-ink dark:text-ink">
          {l.balances} <span className="font-normal text-ink-muted">· <bdi dir="ltr">{year}</bdi></span>
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
            <tr className="text-ink-muted dark:text-ink-muted">
              <th scope="col" className="py-2 pe-3 text-start font-medium">{t.leaveManagement.leaveType2.replace(/\s*\*$/, "")}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.entitled}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.carried}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.adjusted}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.used}</th>
              <th scope="col" className="py-2 px-2 text-end font-medium">{l.pending}</th>
              <th scope="col" className="py-2 ps-2 text-end font-semibold text-ink dark:text-ink">{l.available}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {balances.map((b) => (
              <tr key={b.leaveTypeId}>
                <th scope="row" className="py-2 pe-3 text-start font-medium text-ink dark:text-ink">
                  {locale === "ar" ? b.nameAr : b.nameEn}
                  <span className="block text-[10px] font-normal text-ink-muted">
                    {b.hasPayBands ? l.bands : formatMessage(l.paidAt, { percent: String(b.payPercent) })}
                    {!b.eligible && b.eligibleFrom ? ` · ${formatMessage(l.eligibleFrom, { date: b.eligibleFrom })}` : ""}
                  </span>
                </th>
                <td className="py-2 px-2 text-end text-ink dark:text-ink">{b.entitled == null ? "—" : n(b.entitled)}</td>
                <td className="py-2 px-2 text-end text-ink dark:text-ink">{b.carriedOver ? n(b.carriedOver) : "—"}</td>
                <td className="py-2 px-2 text-end text-ink dark:text-ink">{b.adjustments ? n(b.adjustments) : "—"}</td>
                <td className="py-2 px-2 text-end text-ink dark:text-ink">{n(b.used)}</td>
                <td className="py-2 px-2 text-end text-amber-700 dark:text-amber-400">{b.pending ? n(b.pending) : "—"}</td>
                <td className={`py-2 ps-2 text-end font-semibold ${b.available != null && b.available < 0 ? "text-rose-700 dark:text-rose-400" : "text-primary dark:text-accent"}`}>
                  {b.available == null ? l.unlimited : n(b.available)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={l.adjust} closeLabel={t.shared.cancel} footer={<div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.shared.cancel}</Button>
            <Button type="submit" size="sm" form={modalFormId}>{l.adjust}</Button>
          </div>}>
        <form onSubmit={save} className="space-y-3" id={modalFormId}>
          <label className="block space-y-1 text-xs font-medium text-ink dark:text-ink">
            {t.leaveManagement.leaveType2}
            <Select className={fieldClass} value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
              {withBalance.map((b) => <option key={b.leaveTypeId} value={b.leaveTypeId}>{locale === "ar" ? b.nameAr : b.nameEn}</option>)}
            </Select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-ink dark:text-ink">
            {l.adjustDays}
            <input type="number" required step={0.5} min={-366} max={366} dir="ltr" className={fieldClass} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          </label>
          <label className="block space-y-1 text-xs font-medium text-ink dark:text-ink">
            {l.adjustReason}
            <input required maxLength={300} className={fieldClass} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>

        </form>
      </Modal>
    </Card>
  );
}
