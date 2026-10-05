"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, StickyNote } from "lucide-react";
import { toast } from "sonner";
import type { PayrollItem } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updatePayrollItemAction } from "../../app/actions/payroll";

const FIELDS = ["basicSalary", "housingAllowance", "transportAllowance", "otherAllowances", "bonus", "otherDeductions"] as const;
type Field = (typeof FIELDS)[number];

const money = (n: number | undefined) => Number(n ?? 0).toFixed(3);

/** One employee's payroll line; editable in place while the run has not been submitted. */
export function PayrollItemRow({ item, editable }: { item: PayrollItem; editable: boolean }) {
  const { t } = useAdminLocale();
  const p = t.payrollEdit;
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const initial = React.useCallback(
    () => ({ ...Object.fromEntries(FIELDS.map((f) => [f, String(Number(item[f] ?? 0))])), note: item.adjustmentNote ?? "" }) as Record<Field | "note", string>,
    [item],
  );
  const [draft, setDraft] = React.useState(initial);

  const save = async () => {
    setSaving(true);
    try {
      const patch = Object.fromEntries(FIELDS.map((f) => [f, Number(draft[f]) || 0])) as Record<Field, number>;
      await updatePayrollItemAction(item.id, { ...patch, adjustmentNote: draft.note || null });
      toast.success(p.saved);
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : p.failed);
    } finally {
      setSaving(false);
    }
  };

  const cell = "py-3 px-3 text-end font-mono";
  const input = (f: Field) => (
    <input
      type="number"
      min={0}
      step="0.001"
      aria-label={p.fields[f]}
      value={draft[f]}
      onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
      className="w-24 rounded-lg border border-ink/15 bg-surface px-2 py-1 text-xs text-end font-mono text-ink"
    />
  );
  const employerCost = Number(item.grossSalary) + Number(item.gosiEmployer) - Number(item.externalSupport || 0);

  return (
    <>
      <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] align-top">
        <td className="py-3 px-3">
          <div className="font-semibold text-slate-900 dark:text-white">
            {item.employee?.firstNameEn} {item.employee?.lastNameEn}
          </div>
          <div className="text-[10px] font-mono text-slate-400">{item.employee?.employeeNumber}</div>
          {item.adjustmentNote && !editing && (
            <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-1 max-w-[220px]">
              <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
              {item.adjustmentNote}
            </div>
          )}
        </td>
        {editing ? (
          <>
            <td className={cell}>{input("basicSalary")}</td>
            <td className={cell}>{input("housingAllowance")}</td>
            <td className={cell}>{input("transportAllowance")}</td>
            <td className={cell}>{input("otherAllowances")}</td>
            <td className={cell}>{input("bonus")}</td>
            <td className={cell}>{input("otherDeductions")}</td>
            <td className={cell} colSpan={5}>
              <div className="flex items-center justify-end gap-2">
                <input
                  aria-label={p.note}
                  placeholder={p.notePlaceholder}
                  value={draft.note}
                  maxLength={500}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  className="flex-1 min-w-[160px] rounded-lg border border-ink/15 bg-surface px-2 py-1 text-xs text-ink font-sans"
                />
                <button type="button" disabled={saving} onClick={save} className="p-1.5 rounded-lg bg-accent text-white" aria-label={t.actions.save}>
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setDraft(initial()); setEditing(false); }} className="p-1.5 rounded-lg border border-ink/15 text-ink" aria-label={t.actions.cancel}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className={cell}>{money(item.basicSalary)}</td>
            <td className={cell}>{money(item.housingAllowance)}</td>
            <td className={cell}>{money(item.transportAllowance)}</td>
            <td className={cell}>{money(item.otherAllowances)}</td>
            <td className={`${cell} text-emerald-600`}>{Number(item.bonus ?? 0) ? `+${money(item.bonus)}` : "—"}</td>
            <td className={`${cell} text-rose-600`}>{Number(item.otherDeductions) ? `-${money(item.otherDeductions)}` : "—"}</td>
            <td className={`${cell} font-semibold`}>{money(item.grossSalary)}</td>
            <td className={`${cell} text-amber-600`}>-{money(item.gosiEmployee)}</td>
            <td className={`${cell} font-bold text-primary dark:text-mint`}>{money(item.netSalary)}</td>
            <td className={`${cell} text-slate-500`}>
              +{money(item.gosiEmployer)}
              {Number(item.externalSupport || 0) > 0 && <div className="text-[10px] text-emerald-600">-{money(item.externalSupport)}</div>}
            </td>
            <td className={`${cell} font-semibold text-slate-900 dark:text-white`}>
              <div className="flex items-center justify-end gap-2">
                {employerCost.toFixed(3)}
                {editable && (
                  <button type="button" onClick={() => setEditing(true)} className="p-1 rounded-lg text-ink-muted hover:text-accent hover:bg-accent/10" aria-label={p.edit} title={p.edit}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </td>
          </>
        )}
      </tr>
    </>
  );
}
