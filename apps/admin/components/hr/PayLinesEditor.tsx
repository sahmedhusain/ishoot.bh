"use client";

import { Select } from "@platform/ui";
import * as React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PAY_LINE_CATEGORIES, type PayLineKind } from "@platform/database/constants/hr";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface PayLineDraft {
  key: string;
  category: string;
  label: string;
  amount: string;
  note: string;
}

let lineKey = 0;
const newPayLine = (kind: PayLineKind): PayLineDraft => ({ key: `l${++lineKey}`, category: PAY_LINE_CATEGORIES[kind][0], label: "", amount: "", note: "" });
export const toPayLineDraft = (line: { category: string; label: string; amount: number; note?: string | null }): PayLineDraft => ({
  key: `l${++lineKey}`,
  category: line.category,
  label: line.label,
  amount: String(line.amount),
  note: line.note ?? "",
});

const field = "h-9 w-full rounded-lg border border-outline-variant bg-surface-sunken/60 px-2.5 text-xs text-ink focus:outline-none focus:border-accent";

export function PayLinesEditor({ kind, lines, onChange }: { kind: PayLineKind; lines: PayLineDraft[]; onChange: (lines: PayLineDraft[]) => void }) {
  const { t } = useAdminLocale();
  const c = t.payLines;
  const set = (key: string, patch: Partial<PayLineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const Icon = kind === "addition" ? Plus : Minus;
  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  return (
    <div className={`rounded-2xl border p-3 space-y-2 ${kind === "addition" ? "border-emerald-500/25 bg-emerald-500/5" : "border-rose-500/25 bg-rose-500/5"}`}>
      <div className="flex items-center justify-between">
        <h3 className={`flex items-center gap-1.5 text-xs font-bold ${kind === "addition" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
          <Icon className="h-3.5 w-3.5" />
          {kind === "addition" ? c.additions : c.deductions}
        </h3>
        <span className="text-[11px] font-semibold tabular-nums text-ink-muted" dir="ltr">{total.toFixed(3)}</span>
      </div>
      {lines.length === 0 ? <p className="text-[11px] text-ink-muted">{kind === "addition" ? c.noAdditions : c.noDeductions}</p> : null}
      {lines.map((line) => (
        <div key={line.key} className="grid grid-cols-12 gap-2 items-start">
          <Select aria-label={c.category} className={`${field} col-span-12 sm:col-span-3`} value={line.category} onChange={(e) => set(line.key, { category: e.target.value })}>
            {PAY_LINE_CATEGORIES[kind].map((category) => (
              <option key={category} value={category}>{(c.categories as Record<string, string>)[category]}</option>
            ))}
          </Select>
          <input aria-label={c.description} placeholder={c.description} maxLength={120} className={`${field} col-span-12 sm:col-span-5`} value={line.label} onChange={(e) => set(line.key, { label: e.target.value })} />
          <input aria-label={c.amount} type="number" min={0} step="any" inputMode="decimal" dir="ltr" placeholder="0.000" className={`${field} col-span-9 sm:col-span-3`} value={line.amount} onChange={(e) => set(line.key, { amount: e.target.value })} />
          <button type="button" aria-label={c.remove} title={c.remove} onClick={() => onChange(lines.filter((l) => l.key !== line.key))} className="col-span-3 sm:col-span-1 h-9 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...lines, newPayLine(kind)])} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/10">
        <Plus className="h-3 w-3" />
        {kind === "addition" ? c.addAddition : c.addDeduction}
      </button>
    </div>
  );
}
