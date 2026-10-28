"use client";
import { useCompanyCurrency } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { Input, Select, formatCurrencyValue } from "@platform/ui";
import type { EmployeeCredentialInput } from "@platform/database";
import {
  COST_FREQUENCIES,
  CREDENTIAL_KINDS,
  VISA_TYPES,
  monthlyCost,
} from "@platform/database/constants/employee-documents";
import { countryOptions } from "@platform/database/constants/clients";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadForClaim } from "../../lib/upload-client";
import { LinkOrUploadField } from "../shared/LinkOrUploadField";

export const emptyCredential = (kind = "visa"): EmployeeCredentialInput => ({
  kind,
  visa_type: kind === "visa" ? "employment" : "",
  label: "",
  number: "",
  issuing_country:
    kind === "visa" || kind === "work_permit" || kind === "residence_permit"
      ? "BH"
      : "",
  issue_date: "",
  expiry_date: "",
  sponsor: "",
  cost_amount: undefined,
  cost_frequency: "yearly",
  cost_term_months: undefined,
  paid_by: "company",
  notes: "",
});

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-ink mb-1 block">{label}</span>
      {children}
    </label>
  );
}

/** One visa, permit, licence, insurance or other document with its dates and what it costs the company. */
export function CredentialFields({
  value,
  onChange,
  lockKind = false,
  employeeId,
}: {
  value: EmployeeCredentialInput;
  onChange: (next: EmployeeCredentialInput) => void;
  lockKind?: boolean;
  /** Set once the employee exists, so a copy can be uploaded; before that only a link can be given. */
  employeeId?: string;
}) {
  const companyCurrency = useCompanyCurrency();
  const { t, locale } = useAdminLocale();
  const c = t.employeeResidency;
  const countries = React.useMemo(
    () => countryOptions(t.countries),
    [t.countries],
  );
  const set = <K extends keyof EmployeeCredentialInput>(
    key: K,
    v: EmployeeCredentialInput[K],
  ) => onChange({ ...value, [key]: v });
  const hasCost =
    value.cost_amount !== undefined &&
    value.cost_amount !== null &&
    !Number.isNaN(value.cost_amount);
  const perMonth = hasCost
    ? monthlyCost(
      value.cost_amount,
      value.cost_frequency,
      value.cost_term_months,
    )
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {!lockKind ? (
        <Field label={c.fields.kind}>
          <Select
            value={value.kind}
            onChange={(e) =>
              onChange({
                ...emptyCredential(e.target.value),
                ...value,
                kind: e.target.value,
              })
            }
          >
            {CREDENTIAL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {c.kinds[kind]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {value.kind === "visa" ? (
        <Field label={c.fields.visaType}>
          <Select
            value={value.visa_type ?? ""}
            onChange={(e) => set("visa_type", e.target.value)}
          >
            {VISA_TYPES.map((type) => (
              <option key={type} value={type}>
                {c.visaTypes[type]}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {value.kind === "other" ? (
        <Field label={c.fields.label}>
          <Input
            value={value.label ?? ""}
            onChange={(e) => set("label", e.target.value)}
            required
          />
        </Field>
      ) : null}
      <Field label={c.fields.number}>
        <Input
          dir="ltr"
          value={value.number ?? ""}
          onChange={(e) => set("number", e.target.value)}
        />
      </Field>
      <Field label={c.fields.issuingCountry}>
        <Select
          value={value.issuing_country ?? ""}
          onChange={(e) => set("issuing_country", e.target.value)}
        >
          <option value="">{c.fields.select}</option>
          {countries.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={c.fields.issueDate}>
        <Input
          type="date"
          value={value.issue_date ?? ""}
          onChange={(e) => set("issue_date", e.target.value)}
        />
      </Field>
      <Field label={c.fields.expiryDate}>
        <Input
          type="date"
          value={value.expiry_date ?? ""}
          onChange={(e) => set("expiry_date", e.target.value)}
        />
      </Field>
      {value.kind === "visa" ||
        value.kind === "work_permit" ||
        value.kind === "residence_permit" ? (
        <Field label={c.fields.sponsor}>
          <Input
            value={value.sponsor ?? ""}
            onChange={(e) => set("sponsor", e.target.value)}
            placeholder={c.fields.sponsorPlaceholder}
          />
        </Field>
      ) : null}
      <Field label={c.fields.cost}>
        <Input
          type="number"
          min={0}
          step="any"
          value={hasCost ? value.cost_amount : ""}
          onChange={(e) =>
            set(
              "cost_amount",
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
        />
      </Field>
      <Field label={c.fields.frequency}>
        <Select
          value={value.cost_frequency ?? "yearly"}
          onChange={(e) => set("cost_frequency", e.target.value)}
          disabled={!hasCost}
        >
          {COST_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {c.frequencies[f]}
            </option>
          ))}
        </Select>
      </Field>
      {hasCost && value.cost_frequency === "term" ? (
        <Field label={c.fields.termMonths}>
          <Input
            type="number"
            min={1}
            max={120}
            value={value.cost_term_months ?? ""}
            onChange={(e) =>
              set(
                "cost_term_months",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
          />
        </Field>
      ) : null}
      <Field label={c.fields.paidBy}>
        <Select
          value={value.paid_by ?? "company"}
          onChange={(e) =>
            set("paid_by", e.target.value as "company" | "employee")
          }
        >
          <option value="company">{c.paidBy.company}</option>
          <option value="employee">{c.paidBy.employee}</option>
        </Select>
      </Field>
      <Field label={c.fields.notes} wide>
        <Input
          value={value.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      {perMonth > 0 && value.paid_by !== "employee" ? (
        <p className="sm:col-span-2 lg:col-span-4 text-[11px] text-ink-muted">
          {formatMessage(c.perMonthHint, { amount: formatCurrencyValue(perMonth, companyCurrency, locale === "ar"), yearly: formatCurrencyValue(perMonth * 12, companyCurrency, locale === "ar") })}
        </p>
      ) : null}
      <div className="sm:col-span-2 lg:col-span-4">
        <LinkOrUploadField
          label={c.fields.file}
          value={value.file_url ?? ""}
          onChange={(url) => set("file_url", url)}
          upload={
            employeeId
              ? (file) =>
                uploadForClaim(file, {
                  entityType: "employee",
                  entityId: employeeId,
                })
              : undefined
          }
        />
      </div>
    </div>
  );
}
