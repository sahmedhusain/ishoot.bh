import type { EmployeePayrollSettings } from "./types";

export function parsePayrollSettings(
  value: unknown,
): EmployeePayrollSettings | null {
  if (value == null) return null;
  const settings = value as EmployeePayrollSettings;
  const validate = (part: EmployeePayrollSettings["employee"]) => {
    if (
      !part ||
      !["fixed", "percentage"].includes(part.mode) ||
      !Number.isFinite(part.value) ||
      part.value < 0 ||
      (part.mode === "percentage" && part.value > 100)
    )
      throw new Error(
        "Invalid contribution: use a non-negative fixed amount or a percentage from 0 to 100",
      );
  };
  validate(settings.employee);
  validate(settings.employer);
  if (!Array.isArray(settings.supports) || settings.supports.length > 30)
    throw new Error("Invalid support programs");
  for (const support of settings.supports) {
    validate(support);
    if (
      !support.provider?.trim() ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(support.startMonth) ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(support.endMonth) ||
      support.endMonth < support.startMonth
    )
      throw new Error(
        "Support requires a provider and a valid inclusive month range",
      );
  }
  return settings;
}

export function calculateContributions(
  gross: number,
  settings: EmployeePayrollSettings | null,
  month: string,
) {
  if (!settings)
    throw new Error(
      "Configure employee and employer contributions before generating payroll",
    );
  parsePayrollSettings(settings);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const amount = (part: EmployeePayrollSettings["employee"]) =>
    round(part.mode === "percentage" ? (gross * part.value) / 100 : part.value);
  const employee = amount(settings.employee);
  const employer = amount(settings.employer);
  if (employee > gross)
    throw new Error("Employee contribution cannot exceed gross salary");
  const support = round(
    Math.min(
      gross + employer,
      settings.supports
        .filter((s) => s.startMonth <= month && s.endMonth >= month)
        .reduce((sum, s) => sum + amount(s), 0),
    ),
  );
  return {
    employee,
    employer,
    support,
    net: round(gross - employee),
    employerCost: round(gross + employer - support),
  };
}
