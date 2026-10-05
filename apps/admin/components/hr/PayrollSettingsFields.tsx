"use client";
import type { EmployeePayrollSettings } from "@ishoot/database/types";
import * as React from "react";
import { tamkeenSupports, TAMKEEN_PROVIDER } from "@ishoot/database/constants/hr-support";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export const emptyPayrollSettings: EmployeePayrollSettings = {
  employee: { mode: "percentage", value: 0 },
  employer: { mode: "percentage", value: 0 },
  supports: [],
};
export function PayrollSettingsFields({
  value,
  onChange,
}: {
  value: EmployeePayrollSettings;
  onChange: (value: EmployeePayrollSettings) => void;
}) {
  const { t } = useAdminLocale();
  const h = t.hrExtensions;
  const [tamkeenStart, setTamkeenStart] = React.useState("");
  const hasTamkeen = value.supports.some((s) => s.provider.trim() === TAMKEEN_PROVIDER);
  const inputClass =
    "w-full rounded border border-slate-300 bg-transparent p-2 text-sm";
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 dark:border-white/10 p-5">
      <h2 className="font-semibold">{h.contributions}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["employee", "employer"] as const).map((key) => (
          <fieldset key={key} className="space-y-2">
            <legend>
              {key === "employee"
                ? h.employeeContribution
                : h.employerContribution}
            </legend>
            <select
              aria-label={
                key === "employee"
                  ? h.employeeContribution
                  : h.employerContribution
              }
              className={inputClass}
              value={value[key].mode}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: {
                    ...value[key],
                    mode: e.target.value as "percentage" | "fixed",
                  },
                })
              }
            >
              <option value="percentage">{h.percentage}</option>
              <option value="fixed">{h.fixed}</option>
            </select>
            <input
              aria-label={h.value}
              className={inputClass}
              type="number"
              min={0}
              max={value[key].mode === "percentage" ? 100 : undefined}
              step="0.001"
              required
              value={value[key].value}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: { ...value[key], value: Number(e.target.value) },
                })
              }
            />
          </fieldset>
        ))}
      </div>
      {value.supports.map((support, index) => {
        const change = (patch: Partial<typeof support>) =>
          onChange({
            ...value,
            supports: value.supports.map((item, i) =>
              i === index ? { ...item, ...patch } : item,
            ),
          });
        return (
          <fieldset
            key={index}
            className="grid gap-3 sm:grid-cols-2 border-t pt-3"
          >
            <label>
              {h.provider}
              <input
                required
                className={inputClass}
                value={support.provider}
                onChange={(e) => change({ provider: e.target.value })}
              />
            </label>
            <label>
              {h.value}
              <input
                required
                className={inputClass}
                type="number"
                min={0}
                max={support.mode === "percentage" ? 100 : undefined}
                step="0.001"
                value={support.value}
                onChange={(e) => change({ value: Number(e.target.value) })}
              />
            </label>
            <select
              aria-label={h.value}
              className={inputClass}
              value={support.mode}
              onChange={(e) =>
                change({ mode: e.target.value as "percentage" | "fixed" })
              }
            >
              <option value="percentage">{h.percentage}</option>
              <option value="fixed">{h.fixed}</option>
            </select>
            <label>
              {h.startMonth}
              <input
                required
                className={inputClass}
                type="month"
                value={support.startMonth}
                onChange={(e) => change({ startMonth: e.target.value })}
              />
            </label>
            <label>
              {h.endMonth}
              <input
                required
                className={inputClass}
                type="month"
                min={support.startMonth}
                value={support.endMonth}
                onChange={(e) => change({ endMonth: e.target.value })}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  supports: value.supports.filter((_, i) => i !== index),
                })
              }
            >
              {h.remove}
            </button>
          </fieldset>
        );
      })}
      {!hasTamkeen && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
          <label className="text-sm">
            <span className="block font-semibold">{t.tamkeen.addTitle}</span>
            <span className="block text-xs text-slate-500 mb-1">{t.tamkeen.addHint}</span>
            <input type="month" className={inputClass} value={tamkeenStart} onChange={(e) => setTamkeenStart(e.target.value)} aria-label={t.tamkeen.firstMonth} />
          </label>
          <button
            type="button"
            disabled={!tamkeenStart}
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            onClick={() => onChange({ ...value, supports: [...value.supports, ...tamkeenSupports(tamkeenStart)] })}
          >
            {t.tamkeen.add}
          </button>
        </div>
      )}
      <button
        type="button"
        className="text-emerald-600 underline"
        onClick={() =>
          onChange({
            ...value,
            supports: [
              ...value.supports,
              {
                provider: "",
                mode: "percentage",
                value: 0,
                startMonth: "",
                endMonth: "",
              },
            ],
          })
        }
      >
        {h.addSupport}
      </button>
    </section>
  );
}
