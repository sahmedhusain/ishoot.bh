"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Pencil,
  Plus,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  formatCurrencyValue,
  formatDate,
} from "@platform/ui";
import type {
  EmployeeCredentialInput,
  EmployeeCredentialRecord,
  EmployeeIdentityInput,
  EmployeeResidency,
} from "@platform/database";
import {
  expiryStatus,
  needsWorkVisa,
  type ExpiryStatus,
} from "@platform/database/constants/employee-documents";
import {
  countryName,
  countryOptions,
} from "@platform/database/constants/clients";
import {
  deleteEmployeeCredentialAction,
  saveEmployeeCredentialAction,
  updateEmployeeIdentityAction,
} from "../../app/actions/employee-credentials";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { CredentialFields, emptyCredential } from "./CredentialFields";

const STATUS_STYLE: Record<ExpiryStatus, string> = {
  expired: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  expiring: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  valid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  none: "bg-ink/5 text-ink-muted",
};

const toInput = (c: EmployeeCredentialRecord): EmployeeCredentialInput => ({
  kind: c.kind,
  visa_type: c.visa_type ?? "",
  label: c.label ?? "",
  number: c.number ?? "",
  issuing_country: c.issuing_country ?? "",
  issue_date: c.issue_date ?? "",
  expiry_date: c.expiry_date ?? "",
  sponsor: c.sponsor ?? "",
  cost_amount: c.cost_amount,
  cost_frequency: c.cost_frequency ?? "yearly",
  cost_term_months: c.cost_term_months,
  paid_by: (c.paid_by as "company" | "employee") ?? "company",
  file_url: c.file_url,
  notes: c.notes ?? "",
});

/** Identity (nationality, CPR, passport) and residency documents of an employee, with expiries and costs. */
export function EmployeeResidencyPanel({
  employeeId,
  residency,
  canEdit,
}: {
  employeeId: string;
  residency: EmployeeResidency;
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.employeeResidency;
  const router = useRouter();
  const countries = React.useMemo(
    () => countryOptions(t.countries),
    [t.countries],
  );
  const [identity, setIdentity] = React.useState<EmployeeIdentityInput | null>(
    null,
  );
  const [editing, setEditing] = React.useState<{
    id?: string;
    value: EmployeeCredentialInput;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const id = residency.identity;
  const money = (v: number) => formatCurrencyValue(v, "BHD", locale === "ar");

  const run = async (work: () => Promise<unknown>, done: () => void) => {
    setBusy(true);
    try {
      await work();
      toast.success(c.saved);
      done();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, c.failed));
    } finally {
      setBusy(false);
    }
  };

  const badge = (date?: string) => {
    const { status, days } = expiryStatus(date);
    if (status === "none") return null;
    const text =
      status === "expired"
        ? c.status.expired
        : status === "expiring"
          ? formatMessage(c.status.expiresIn, { days: String(days) })
          : c.status.valid;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status]}`}
      >
        {status !== "valid" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <BadgeCheck className="h-3 w-3" />
        )}
        {text}
      </span>
    );
  };
  const item = (
    label: string,
    value?: string,
    extra?: React.ReactNode,
    ltr?: boolean,
  ) => (
    <div>
      <dt className="text-[11px] text-ink-muted mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-ink flex flex-wrap items-center gap-2">
        <span dir={ltr ? "ltr" : undefined}>{value || "—"}</span>
        {extra}
      </dd>
    </div>
  );
  const visaMissing =
    needsWorkVisa(id.nationality) &&
    !residency.credentials.some(
      (x) => x.kind === "visa" || x.kind === "work_permit",
    );

  return (
    <section className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 sm:p-6 shadow-xs space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{c.title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{c.subtitle}</p>
        </div>
        {residency.monthlyCost > 0 ? (
          <div className="rounded-2xl bg-accent/5 px-4 py-2 text-end">
            <div className="text-[11px] text-ink-muted">{c.costPerMonth}</div>
            <div className="text-base font-bold text-ink tabular-nums">
              {money(residency.monthlyCost)}
            </div>
            <div className="text-[11px] text-ink-muted">
              {formatMessage(c.costPerYear, { amount: money(residency.yearlyCost) })}
            </div>
          </div>
        ) : null}
      </div>

      {visaMissing ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {c.visaMissing}
        </div>
      ) : null}

      {/* Identity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">{c.identity}</h3>
          {canEdit && !identity ? (
            <button
              type="button"
              onClick={() =>
                setIdentity({
                  ...id,
                  gender: (id.gender as "male" | "female" | undefined) ?? "",
                })
              }
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
            >
              <Pencil className="h-3.5 w-3.5" />
              {c.edit}
            </button>
          ) : null}
        </div>
        {identity ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.nationality}
                </span>
                <Select
                  value={identity.nationality ?? ""}
                  onChange={(e) =>
                    setIdentity({ ...identity, nationality: e.target.value })
                  }
                >
                  <option value="">{c.fields.select}</option>
                  {countries.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.dateOfBirth}
                </span>
                <Input
                  type="date"
                  value={identity.date_of_birth ?? ""}
                  onChange={(e) =>
                    setIdentity({ ...identity, date_of_birth: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.gender}
                </span>
                <Select
                  value={identity.gender ?? ""}
                  onChange={(e) =>
                    setIdentity({
                      ...identity,
                      gender: e.target.value as "male" | "female" | "",
                    })
                  }
                >
                  <option value="">{c.fields.select}</option>
                  <option value="male">{c.genders.male}</option>
                  <option value="female">{c.genders.female}</option>
                </Select>
              </label>
              <span />
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.cprNumber}
                </span>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={9}
                  value={identity.cpr_number ?? ""}
                  onChange={(e) =>
                    setIdentity({ ...identity, cpr_number: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.cprExpiry}
                </span>
                <Input
                  type="date"
                  value={identity.cpr_expiry_date ?? ""}
                  onChange={(e) =>
                    setIdentity({
                      ...identity,
                      cpr_expiry_date: e.target.value,
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.passportNumber}
                </span>
                <Input
                  dir="ltr"
                  value={identity.passport_number ?? ""}
                  onChange={(e) =>
                    setIdentity({
                      ...identity,
                      passport_number: e.target.value,
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.passportCountry}
                </span>
                <Select
                  value={identity.passport_country ?? ""}
                  onChange={(e) =>
                    setIdentity({
                      ...identity,
                      passport_country: e.target.value,
                    })
                  }
                >
                  <option value="">{c.fields.select}</option>
                  {countries.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink mb-1 block">
                  {c.fields.passportExpiry}
                </span>
                <Input
                  type="date"
                  value={identity.passport_expiry_date ?? ""}
                  onChange={(e) =>
                    setIdentity({
                      ...identity,
                      passport_expiry_date: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIdentity(null)}
              >
                {t.actions.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () => updateEmployeeIdentityAction(employeeId, identity),
                    () => setIdentity(null),
                  )
                }
              >
                {c.save}
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {item(
              c.fields.nationality,
              countryName(id.nationality, t.countries),
            )}
            {item(
              c.fields.dateOfBirth,
              id.date_of_birth
                ? formatDate(id.date_of_birth, locale)
                : undefined,
            )}
            {item(
              c.fields.gender,
              id.gender ? c.genders[id.gender as "male" | "female"] : undefined,
            )}
            {item(
              c.fields.cprNumber,
              id.cpr_number,
              badge(id.cpr_expiry_date),
              true,
            )}
            {item(
              c.fields.cprExpiry,
              id.cpr_expiry_date
                ? formatDate(id.cpr_expiry_date, locale)
                : undefined,
            )}
            {item(
              c.fields.passportNumber,
              id.passport_number,
              badge(id.passport_expiry_date),
              true,
            )}
            {item(
              c.fields.passportCountry,
              countryName(id.passport_country, t.countries),
            )}
            {item(
              c.fields.passportExpiry,
              id.passport_expiry_date
                ? formatDate(id.passport_expiry_date, locale)
                : undefined,
            )}
          </dl>
        )}
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">{c.documents}</h3>
          {canEdit && !editing ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() =>
                setEditing({
                  value: emptyCredential(
                    needsWorkVisa(id.nationality) ? "visa" : "health_insurance",
                  ),
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              {c.addDocument}
            </Button>
          ) : null}
        </div>

        {editing ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-ink">
                {editing.id ? c.editDocument : c.addDocument}
              </h4>
              <button
                type="button"
                aria-label={t.actions.cancel}
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CredentialFields
              employeeId={employeeId}
              value={editing.value}
              onChange={(value) => setEditing({ ...editing, value })}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                {t.actions.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      saveEmployeeCredentialAction(
                        employeeId,
                        editing.value,
                        editing.id,
                      ),
                    () => setEditing(null),
                  )
                }
              >
                {c.save}
              </Button>
            </div>
          </div>
        ) : null}

        {residency.credentials.length === 0 && !editing ? (
          <p className="text-xs text-ink-muted">{c.noDocuments}</p>
        ) : null}
        {residency.credentials.length ? (
          <div className="overflow-x-auto rounded-2xl border border-ink/10">
            <table className="w-full text-xs">
              <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">
                    {c.fields.kind}
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    {c.fields.number}
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    {c.fields.expiryDate}
                  </th>
                  <th className="px-3 py-2 text-end font-semibold">
                    {c.fields.cost}
                  </th>
                  <th className="px-3 py-2">
                    <span className="sr-only">{c.edit}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {residency.credentials.map((cred) => (
                  <tr key={cred.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-ink">
                        {cred.kind === "other"
                          ? cred.label
                          : c.kinds[cred.kind as keyof typeof c.kinds]}
                      </div>
                      <div className="text-ink-muted">
                        {[
                          cred.visa_type
                            ? c.visaTypes[
                            cred.visa_type as keyof typeof c.visaTypes
                            ]
                            : null,
                          cred.sponsor,
                          countryName(cred.issuing_country, t.countries),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ink" dir="ltr">
                      {cred.number || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="text-ink">
                        {cred.expiry_date
                          ? formatDate(cred.expiry_date, locale)
                          : "—"}
                      </div>
                      <div className="mt-0.5">{badge(cred.expiry_date)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-end whitespace-nowrap">
                      {cred.cost_amount !== undefined ? (
                        <>
                          <div className="font-semibold text-ink tabular-nums">
                            {money(cred.cost_amount)}
                          </div>
                          <div className="text-ink-muted">
                            {cred.cost_frequency === "term"
                              ? formatMessage(c.frequencyTerm, { months: String(cred.cost_term_months) })
                              : c.frequencies[
                              cred.cost_frequency as keyof typeof c.frequencies
                              ]}
                            {cred.paid_by === "employee"
                              ? ` · ${c.paidBy.employee}`
                              : ""}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-end whitespace-nowrap">
                      {cred.file_url ? (
                        <a
                          href={cred.file_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={c.fields.openFile}
                          title={c.fields.openFile}
                          className="inline-flex rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            aria-label={c.edit}
                            title={c.edit}
                            onClick={() =>
                              setEditing({ id: cred.id, value: toInput(cred) })
                            }
                            className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={c.delete}
                            title={c.delete}
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => deleteEmployeeCredentialAction(cred.id),
                                () => undefined,
                              )
                            }
                            className="rounded-lg p-1.5 text-ink-muted hover:text-rose-500 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
