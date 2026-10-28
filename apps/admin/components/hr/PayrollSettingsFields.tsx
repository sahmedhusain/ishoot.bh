"use client";
import { Select } from "@platform/ui";
import type { EmployeePayrollSettings } from "@platform/database/types";
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
  const inputClass =
    "w-full rounded border border-outline-variant bg-transparent p-2 text-sm";
  return (
    <section className="space-y-4 rounded-lg border border-outline-variant dark:border-white/10 p-5" data-page-section>
      <h2 className="font-semibold">{h.contributions}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["employee", "employer"] as const).map((key) => (
          <fieldset key={key} className="space-y-2">
            <legend>
              {key === "employee"
                ? h.employeeContribution
                : h.employerContribution}
            </legend>
            <Select
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
            </Select>
            <input
              aria-label={h.value}
              className={inputClass}
              type="number"
              min={0}
              max={value[key].mode === "percentage" ? 100 : undefined}
              step="any"
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
                step="any"
                value={support.value}
                onChange={(e) => change({ value: Number(e.target.value) })}
              />
            </label>
            <Select
              aria-label={h.value}
              className={inputClass}
              value={support.mode}
              onChange={(e) =>
                change({ mode: e.target.value as "percentage" | "fixed" })
              }
            >
              <option value="percentage">{h.percentage}</option>
              <option value="fixed">{h.fixed}</option>
            </Select>
            <label>{t.wageSupport.claimPeriod}<input className={inputClass} type="number" min={1} max={60} step={1} required value={support.claimPeriodMonths ?? 6} onChange={(event) => change({ claimPeriodMonths: Number(event.target.value) })} /></label>
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
                claimPeriodMonths: 1,
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
