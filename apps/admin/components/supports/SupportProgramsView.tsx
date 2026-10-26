"use client";
import { useConfirmation } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  HandHeart,
  History,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Modal,
  Input,
  Select,
  formatCurrencyValue,
  formatDate,
} from "@platform/ui";
import type {
  listSupportPrograms,
  EmployeeSupportRecord,
} from "@platform/database";
import {
  QUALIFICATIONS,
  SUPPORT_STATUSES,
  WAGE_BASES,
} from "@platform/database/hr/social-insurance";
import { ROUTES } from "../../constants/routes";
import {
  deleteEmployeeSupportAction,
  deleteSupportRuleAction,
  saveEmployeeSupportAction,
  saveSupportProgramAction,
  scheduleSupportRuleAction,
} from "../../app/actions/social-insurance";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

type Program = Awaited<ReturnType<typeof listSupportPrograms>>[number];
type Employee = { id: string; number: string; nameEn: string; nameAr: string };

const card =
  "rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised";
const label = "mb-1 block text-xs font-semibold text-ink";
const thisMonth = () =>
  new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 7);
const firstOfNextMonth = () => {
  const d = new Date(Date.now() + 3 * 3600000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
};
const STATUS_STYLE: Record<string, string> = {
  applied: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partially_approved: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  suspended: "bg-ink/10 text-ink-muted",
  ended: "bg-ink/10 text-ink-muted",
};

/** Wage-support programmes with their dated terms, and every employee's application, decision and partial approval. */
export function SupportProgramsView({
  programs,
  enrolments,
  employees,
  filters,
  canEdit,
}: {
  programs: Program[];
  enrolments: EmployeeSupportRecord[];
  employees: Employee[];
  filters: { program: string; status: string };
  canEdit: boolean;
}) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const s = t.supports;
  const router = useRouter();
  const isAr = locale === "ar";
  const [busy, setBusy] = React.useState(false);
  const pending = React.useRef(false);
  const enrolmentFormId = React.useId();
  const [actionError, setActionError] = React.useState("");
  const [programForm, setProgramForm] = React.useState<{
    id?: string;
    name_en: string;
    name_ar: string;
    provider: string;
    claim_period_months: string;
    prorate: boolean;
    is_active: boolean;
    notes: string;
  } | null>(null);
  const [ruleFor, setRuleFor] = React.useState<{
    program: Program;
    effective_from: string;
    wage_basis: string;
    schedule: Array<{ year: string; percent: string }>;
    wage_cap: string;
    monthly_cap: string;
    qualification_caps: Array<{ qualification: string; cap: string }>;
    notes: string;
  } | null>(null);
  const [enrolment, setEnrolment] = React.useState<
    (Record<string, string> & { id?: string }) | null
  >(null);
  const [historyOf, setHistoryOf] = React.useState<string | null>(null);
  const money = (v: number) => formatCurrencyValue(v, "BHD", isAr);

  const run = async (work: () => Promise<unknown>, done: string) => {
    if (pending.current) return false;
    pending.current = true; setActionError(""); setBusy(true);
    try {
      await work();
      toast.success(done);
      router.refresh();
      return true;
    } catch (error) {
      setActionError(errorMessage(error, t, s.failed));
      toast.error(errorMessage(error, t, s.failed));
      return false;
    } finally {
      pending.current = false; setBusy(false);
    }
  };
  const currentRule = (p: Program) => {
    const on = `${thisMonth()}-01`;
    return (
      p.rules.find(
        (r) => r.effectiveFrom <= on && (!r.effectiveTo || r.effectiveTo >= on),
      ) ?? p.rules[0]
    );
  };
  const href = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    return ROUTES.hr.supports({
      program: next.program === "all" ? null : next.program,
      status: next.status === "all" ? null : next.status,
    });
  };
  const openEnrolment = (e?: EmployeeSupportRecord) => {
    setActionError("");
    setEnrolment({
      ...(e ? { id: e.id } : {}),
      employee_id: e?.employee.id ?? "",
      program_id: e?.program.id ?? programs[0]?.id ?? "",
      status: e?.status ?? "applied",
      qualification: e?.qualification ?? "",
      application_ref: e?.applicationRef ?? "",
      applied_on: e?.appliedOn ?? "",
      decided_on: e?.decidedOn ?? "",
      start_month: e?.startMonth ?? thisMonth(),
      end_month: e?.endMonth ?? "",
      approved_percent:
        e?.approvedPercent == null ? "" : String(e.approvedPercent),
      approved_amount:
        e?.approvedAmount == null ? "" : String(e.approvedAmount),
      monthly_cap: e?.monthlyCap == null ? "" : String(e.monthlyCap),
      notes: e?.notes ?? "",
    });
  };

  const saveEnrolment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!enrolment) return;
    const n = (v: string) => (v === "" ? null : Number(v));
    const ok = await run(
      () =>
        saveEmployeeSupportAction(
          {
            employee_id: enrolment.employee_id,
            program_id: enrolment.program_id,
            status: enrolment.status,
            qualification: enrolment.qualification || null,
            application_ref: enrolment.application_ref || null,
            applied_on: enrolment.applied_on || null,
            decided_on: enrolment.decided_on || null,
            start_month: enrolment.start_month,
            end_month: enrolment.end_month || null,
            approved_percent: n(enrolment.approved_percent),
            approved_amount: n(enrolment.approved_amount),
            monthly_cap: n(enrolment.monthly_cap),
            notes: enrolment.notes || null,
          },
          enrolment.id,
        ),
      s.saved,
    );
    if (ok) setEnrolment(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
            <HandHeart className="h-5 w-5 text-accent" aria-hidden />
            {s.title}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">{s.subtitle}</p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() =>
              setProgramForm({
                name_en: "",
                name_ar: "",
                provider: "",
                claim_period_months: "6",
                prorate: true,
                is_active: true,
                notes: "",
              })
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            {s.addProgram}
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {programs.map((p) => {
          const rule = currentRule(p);
          return (
            <section key={p.id} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink">
                    {isAr ? p.nameAr : p.nameEn}
                  </h2>
                  <p className="text-[11px] text-ink-muted">
                    {p.provider} ·{" "}
                    {formatMessage(s.claimEvery, { n: String(p.claimPeriodMonths) })}
                    {p.prorate ? ` · ${s.prorated}` : ""}
                    {!p.isActive ? ` · ${s.inactive}` : ""}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={s.editProgram}
                      title={s.editProgram}
                      onClick={() =>
                        setProgramForm({
                          id: p.id,
                          name_en: p.nameEn,
                          name_ar: p.nameAr,
                          provider: p.provider,
                          claim_period_months: String(p.claimPeriodMonths),
                          prorate: p.prorate,
                          is_active: p.isActive,
                          notes: p.notes ?? "",
                        })
                      }
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={s.scheduleTerms}
                      title={s.scheduleTerms}
                      onClick={() =>
                        setRuleFor({
                          program: p,
                          effective_from: firstOfNextMonth(),
                          wage_basis: rule?.wageBasis ?? "fixed",
                          schedule: (
                            rule?.schedule ?? [{ year: 1, percent: 70 }]
                          ).map((x) => ({
                            year: String(x.year),
                            percent: String(x.percent),
                          })),
                          wage_cap:
                            rule?.wageCap == null ? "" : String(rule.wageCap),
                          monthly_cap:
                            rule?.monthlyCap == null
                              ? ""
                              : String(rule.monthlyCap),
                          qualification_caps: (
                            rule?.qualificationCaps ?? []
                          ).map((q) => ({
                            qualification: q.qualification,
                            cap: String(q.cap),
                          })),
                          notes: "",
                        })
                      }
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {rule ? (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    {rule.schedule.map((x) => (
                      <span
                        key={x.year}
                        className="rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent"
                      >
                        {formatMessage(s.yearShare, { year: String(x.year), percent: String(x.percent) })}
                      </span>
                    ))}
                  </div>
                  <p className="text-ink-muted">
                    {s.bases[rule.wageBasis as keyof typeof s.bases]}
                    {rule.wageCap != null
                      ? ` · ${formatMessage(s.wageCapLine, { amount: money(rule.wageCap) })}`
                      : ""}
                    {rule.monthlyCap != null
                      ? ` · ${formatMessage(s.monthlyCapLine, { amount: money(rule.monthlyCap) })}`
                      : ""}
                  </p>
                  {rule.qualificationCaps.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {rule.qualificationCaps.map((q) => (
                        <li
                          key={q.qualification}
                          className="rounded-lg border border-ink/10 px-2 py-0.5 text-[11px] text-ink"
                        >
                          {
                            s.qualifications[
                              q.qualification as keyof typeof s.qualifications
                            ]
                          }
                          : {money(q.cap)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <details className="text-[11px] text-ink-muted">
                    <summary className="cursor-pointer font-semibold">
                      {s.termsHistory}
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {p.rules.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>
                            {formatDate(r.effectiveFrom, locale)} –{" "}
                            {r.effectiveTo
                              ? formatDate(r.effectiveTo, locale)
                              : s.openEnded}{" "}
                            ·{" "}
                            {r.schedule.map((x) => `${x.percent}%`).join(" / ")}
                            {r.monthlyCap != null
                              ? ` · ${money(r.monthlyCap)}`
                              : ""}
                          </span>
                          {canEdit && p.rules.length > 1 ? (
                            <button
                              type="button"
                              aria-label={s.delete}
                              disabled={busy}
                              onClick={() =>
                                confirmAction({ description: s.deleteTermsConfirm, onConfirm: async () => { if (!(await run(
                                  () => deleteSupportRuleAction(r.id),
                                  s.saved,
                                ))) throw new Error(s.failed); } })
                              }
                              className="text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ) : (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  {s.noTerms}
                </p>
              )}
              <p className="mt-3 text-[11px] text-ink-muted">
                {formatMessage(s.enrolledCount, { n: String(p.enrolments) })}
              </p>
            </section>
          );
        })}
      </div>

      {programForm && (
        <form
          className={`${card} space-y-3 border-accent/30`}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(
              () =>
                saveSupportProgramAction(
                  {
                    name_en: programForm.name_en,
                    name_ar: programForm.name_ar,
                    provider: programForm.provider,
                    claim_period_months: Number(
                      programForm.claim_period_months,
                    ),
                    prorate: programForm.prorate,
                    is_active: programForm.is_active,
                    notes: programForm.notes || null,
                  },
                  programForm.id,
                ),
              s.saved,
            );
            if (ok) setProgramForm(null);
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              {programForm.id ? s.editProgram : s.addProgram}
            </h2>
            <button
              type="button"
              aria-label={t.actions.cancel}
              onClick={() => setProgramForm(null)}
            >
              <X className="h-4 w-4 text-ink-muted" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className={label}>{s.fields.nameEn}</span>
              <Input
                required
                value={programForm.name_en}
                onChange={(e) =>
                  setProgramForm({ ...programForm, name_en: e.target.value })
                }
              />
            </label>
            <label>
              <span className={label}>{s.fields.nameAr}</span>
              <Input
                required
                value={programForm.name_ar}
                onChange={(e) =>
                  setProgramForm({ ...programForm, name_ar: e.target.value })
                }
              />
            </label>
            <label>
              <span className={label}>{s.fields.provider}</span>
              <Input
                required
                value={programForm.provider}
                onChange={(e) =>
                  setProgramForm({ ...programForm, provider: e.target.value })
                }
                placeholder={t.copy.supportExample}
              />
            </label>
            <label>
              <span className={label}>{s.fields.claimPeriod}</span>
              <Input
                type="number"
                dir="ltr"
                min={1}
                max={24}
                value={programForm.claim_period_months}
                onChange={(e) =>
                  setProgramForm({
                    ...programForm,
                    claim_period_months: e.target.value,
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={programForm.prorate}
                onChange={(e) =>
                  setProgramForm({ ...programForm, prorate: e.target.checked })
                }
              />
              {s.fields.prorate}
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={programForm.is_active}
                onChange={(e) =>
                  setProgramForm({
                    ...programForm,
                    is_active: e.target.checked,
                  })
                }
              />
              {s.fields.active}
            </label>
          </div>
          <label className="block">
            <span className={label}>{s.fields.notes}</span>
            <Input
              value={programForm.notes}
              onChange={(e) =>
                setProgramForm({ ...programForm, notes: e.target.value })
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setProgramForm(null)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {s.save}
            </Button>
          </div>
        </form>
      )}

      {ruleFor && (
        <form
          className={`${card} space-y-3 border-accent/30`}
          onSubmit={async (e) => {
            e.preventDefault();
            const n = (v: string) => (v === "" ? null : Number(v));
            const ok = await run(
              () =>
                scheduleSupportRuleAction(ruleFor.program.id, {
                  effective_from: ruleFor.effective_from,
                  wage_basis: ruleFor.wage_basis,
                  schedule: ruleFor.schedule.map((x) => ({
                    year: Number(x.year),
                    percent: Number(x.percent),
                  })),
                  wage_cap: n(ruleFor.wage_cap),
                  monthly_cap: n(ruleFor.monthly_cap),
                  qualification_caps: ruleFor.qualification_caps
                    .filter((q) => q.cap !== "")
                    .map((q) => ({
                      qualification: q.qualification,
                      cap: Number(q.cap),
                    })),
                  notes: ruleFor.notes || null,
                }),
              s.scheduled,
            );
            if (ok) setRuleFor(null);
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">
              {formatMessage(s.scheduleTermsFor, { name: isAr ? ruleFor.program.nameAr : ruleFor.program.nameEn })}
            </h2>
            <button
              type="button"
              aria-label={t.actions.cancel}
              onClick={() => setRuleFor(null)}
            >
              <X className="h-4 w-4 text-ink-muted" />
            </button>
          </div>
          <p className="text-[11px] text-ink-muted">{s.scheduleTermsHint}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <label>
              <span className={label}>{s.fields.effectiveFrom}</span>
              <Input
                type="date"
                required
                value={ruleFor.effective_from}
                onChange={(e) =>
                  setRuleFor({ ...ruleFor, effective_from: e.target.value })
                }
              />
            </label>
            <label>
              <span className={label}>{s.fields.wageBasis}</span>
              <Select
                value={ruleFor.wage_basis}
                onChange={(e) =>
                  setRuleFor({ ...ruleFor, wage_basis: e.target.value })
                }
              >
                {WAGE_BASES.map((b) => (
                  <option key={b} value={b}>
                    {s.bases[b]}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className={label}>{s.fields.wageCap}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                step="0.001"
                value={ruleFor.wage_cap}
                onChange={(e) =>
                  setRuleFor({ ...ruleFor, wage_cap: e.target.value })
                }
              />
            </label>
            <label>
              <span className={label}>{s.fields.monthlyCap}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                step="0.001"
                value={ruleFor.monthly_cap}
                onChange={(e) =>
                  setRuleFor({ ...ruleFor, monthly_cap: e.target.value })
                }
              />
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className={label}>{s.fields.schedule}</legend>
            <div className="flex flex-wrap gap-2">
              {ruleFor.schedule.map((x, i) => (
                <div
                  key={i}
                  className="flex items-end gap-1 rounded-xl border border-ink/10 p-2"
                >
                  <label className="w-16">
                    <span className="text-[10px] text-ink-muted">
                      {s.fields.year}
                    </span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={1}
                      max={10}
                      value={x.year}
                      onChange={(e) =>
                        setRuleFor({
                          ...ruleFor,
                          schedule: ruleFor.schedule.map((y, j) =>
                            j === i ? { ...y, year: e.target.value } : y,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="w-20">
                    <span className="text-[10px] text-ink-muted">%</span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={100}
                      step="0.01"
                      value={x.percent}
                      onChange={(e) =>
                        setRuleFor({
                          ...ruleFor,
                          schedule: ruleFor.schedule.map((y, j) =>
                            j === i ? { ...y, percent: e.target.value } : y,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={s.delete}
                    onClick={() =>
                      setRuleFor({
                        ...ruleFor,
                        schedule: ruleFor.schedule.filter((_, j) => j !== i),
                      })
                    }
                    className="mb-2 text-ink-muted hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-semibold text-accent hover:underline"
                onClick={() =>
                  setRuleFor({
                    ...ruleFor,
                    schedule: [
                      ...ruleFor.schedule,
                      {
                        year: String(ruleFor.schedule.length + 1),
                        percent: "0",
                      },
                    ],
                  })
                }
              >
                {s.addYear}
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend className={label}>{s.fields.qualificationCaps}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUALIFICATIONS.map((q) => {
                const value =
                  ruleFor.qualification_caps.find((x) => x.qualification === q)
                    ?.cap ?? "";
                return (
                  <label key={q}>
                    <span className="text-[11px] text-ink-muted">
                      {s.qualifications[q]}
                    </span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      step="0.001"
                      value={value}
                      onChange={(e) =>
                        setRuleFor({
                          ...ruleFor,
                          qualification_caps: [
                            ...ruleFor.qualification_caps.filter(
                              (x) => x.qualification !== q,
                            ),
                            { qualification: q, cap: e.target.value },
                          ],
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="block">
            <span className={label}>{s.fields.notes}</span>
            <Input
              value={ruleFor.notes}
              onChange={(e) =>
                setRuleFor({ ...ruleFor, notes: e.target.value })
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRuleFor(null)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {s.schedule}
            </Button>
          </div>
        </form>
      )}

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">{s.enrolmentsTitle}</h2>
            <p className="text-xs text-ink-muted">{s.enrolmentsHint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label={s.fields.program}
              value={filters.program}
              onChange={(e) => router.push(href({ program: e.target.value }))}
            >
              <option value="all">{s.allPrograms}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {isAr ? p.nameAr : p.nameEn}
                </option>
              ))}
            </Select>
            <Select
              aria-label={s.fields.status}
              value={filters.status}
              onChange={(e) => router.push(href({ status: e.target.value }))}
            >
              <option value="all">{s.allStatuses}</option>
              {SUPPORT_STATUSES.map((x) => (
                <option key={x} value={x}>
                  {s.statuses[x]}
                </option>
              ))}
            </Select>
            {canEdit && programs.length ? (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => openEnrolment()}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {s.addEnrolment}
              </Button>
            ) : null}
          </div>
        </div>
        {enrolments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-xs text-ink-muted">
            {s.noEnrolments}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink/10">
            <table className="w-full text-xs">
              <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-start">{s.fields.employee}</th>
                  <th className="px-3 py-2 text-start">{s.fields.program}</th>
                  <th className="px-3 py-2 text-start">{s.fields.status}</th>
                  <th className="px-3 py-2 text-start">{s.fields.period}</th>
                  <th className="px-3 py-2 text-start">{s.fields.approval}</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">{s.actions}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {enrolments.map((e) => (
                  <React.Fragment key={e.id}>
                    <tr className="align-top">
                      <td className="px-3 py-2.5">
                        <Link
                          href={ROUTES.hr.employee(e.employee.id)}
                          className="font-semibold text-ink hover:underline"
                        >
                          {isAr ? e.employee.nameAr : e.employee.nameEn}
                        </Link>
                        <div className="text-[10px] text-ink-muted">
                          {e.employee.number}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {isAr ? e.program.nameAr : e.program.nameEn}
                        {e.applicationRef ? (
                          <div
                            className="font-mono text-[10px] text-ink-muted"
                            dir="ltr"
                          >
                            {e.applicationRef}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[e.status]}`}
                        >
                          {s.statuses[e.status as keyof typeof s.statuses]}
                        </span>
                        {e.qualification ? (
                          <div className="mt-1 text-[10px] text-ink-muted">
                            {
                              s.qualifications[
                                e.qualification as keyof typeof s.qualifications
                              ]
                            }
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-ink" dir="ltr">
                        {e.startMonth}
                        {e.endMonth ? ` → ${e.endMonth}` : " →"}
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {e.approvedAmount != null
                          ? formatMessage(s.fixedAmount, { amount: money(e.approvedAmount) })
                          : e.approvedPercent != null
                            ? formatMessage(s.approvedShare, { percent: String(e.approvedPercent) })
                            : s.programSchedule}
                        {e.monthlyCap != null ? (
                          <div className="text-[10px] text-ink-muted">
                            {formatMessage(s.monthlyCapLine, { amount: money(e.monthlyCap) })}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">
                        <button
                          type="button"
                          aria-label={s.history}
                          title={s.history}
                          onClick={() =>
                            setHistoryOf(historyOf === e.id ? null : e.id)
                          }
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            aria-label={s.edit}
                            title={s.edit}
                            onClick={() => openEnrolment(e)}
                            className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canEdit &&
                          !["approved", "partially_approved"].includes(
                            e.status,
                          ) && (
                            <button
                              type="button"
                              aria-label={s.delete}
                              title={s.delete}
                              disabled={busy}
                              onClick={() =>
                                confirmAction({ description: s.deleteConfirm, onConfirm: async () => { if (!(await run(
                                  () => deleteEmployeeSupportAction(e.id),
                                  s.saved,
                                ))) throw new Error(s.failed); } })
                              }
                              className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-500/10 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                      </td>
                    </tr>
                    {historyOf === e.id && (
                      <tr>
                        <td colSpan={6} className="bg-ink/[0.02] px-3 py-2">
                          <ul className="space-y-1 text-[11px] text-ink">
                            {e.events.map((ev) => (
                              <li key={ev.id}>
                                <span className="font-semibold">
                                  {(s.events as Record<string, string>)[
                                    ev.action
                                  ] ?? s.events.updated}
                                </span>{" "}
                                · {formatDate(ev.createdAt, locale, "time")}
                                {ev.details ? (
                                  <span className="text-ink-muted">
                                    {" "}
                                    ·{" "}
                                    {Object.entries(ev.details)
                                      .map(([k, v]) =>
                                        typeof v === "object" &&
                                        v &&
                                        "to" in (v as object)
                                          ? `${(s.fields as Record<string, string>)[k] ?? k}: ${String((v as { from: unknown }).from ?? "—")} → ${String((v as { to: unknown }).to ?? "—")}`
                                          : `${(s.fields as Record<string, string>)[k] ?? k}: ${String(v)}`,
                                      )
                                      .join("; ")}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {enrolment && <Modal isOpen onClose={() => setEnrolment(null)} title={enrolment.id ? s.editEnrolment : s.addEnrolment}
        busy={busy} className="max-w-3xl" footer={<div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setEnrolment(null)}>{t.actions.cancel}</Button>
          <Button type="submit" form={enrolmentFormId} disabled={busy}>{busy ? t.actions.saving : s.save}</Button>
        </div>}>
        <form id={enrolmentFormId} onSubmit={saveEnrolment}>
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <span className={label}>{s.fields.employee}</span>
                <Select
                  required
                  disabled={!!enrolment.id}
                  value={enrolment.employee_id}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, employee_id: e.target.value })
                  }
                >
                  <option value="">{s.select}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {isAr ? e.nameAr : e.nameEn} ({e.number})
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className={label}>{s.fields.program}</span>
                <Select
                  required
                  disabled={!!enrolment.id}
                  value={enrolment.program_id}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, program_id: e.target.value })
                  }
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.nameAr : p.nameEn}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className={label}>{s.fields.status}</span>
                <Select
                  value={enrolment.status}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, status: e.target.value })
                  }
                >
                  {SUPPORT_STATUSES.map((x) => (
                    <option key={x} value={x}>
                      {s.statuses[x]}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className={label}>{s.fields.qualification}</span>
                <Select
                  value={enrolment.qualification}
                  onChange={(e) =>
                    setEnrolment({
                      ...enrolment,
                      qualification: e.target.value,
                    })
                  }
                >
                  <option value="">{s.select}</option>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q} value={q}>
                      {s.qualifications[q]}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className={label}>{s.fields.applicationRef}</span>
                <Input
                  dir="ltr"
                  value={enrolment.application_ref}
                  onChange={(e) =>
                    setEnrolment({
                      ...enrolment,
                      application_ref: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span className={label}>{s.fields.appliedOn}</span>
                <Input
                  type="date"
                  value={enrolment.applied_on}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, applied_on: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{s.fields.decidedOn}</span>
                <Input
                  type="date"
                  value={enrolment.decided_on}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, decided_on: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{s.fields.startMonth}</span>
                <Input
                  type="month"
                  required
                  value={enrolment.start_month}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, start_month: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{s.fields.endMonth}</span>
                <Input
                  type="month"
                  min={enrolment.start_month}
                  value={enrolment.end_month}
                  onChange={(e) =>
                    setEnrolment({ ...enrolment, end_month: e.target.value })
                  }
                />
              </label>
            </div>
            <fieldset className="rounded-2xl border border-ink/10 p-3">
              <legend className="px-1 text-xs font-semibold text-ink">
                {s.partialTitle}
              </legend>
              <p className="mb-2 text-[11px] text-ink-muted">{s.partialHint}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label>
                  <span className={label}>{s.fields.approvedPercent}</span>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    max={100}
                    step="0.01"
                    value={enrolment.approved_percent}
                    onChange={(e) =>
                      setEnrolment({
                        ...enrolment,
                        approved_percent: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span className={label}>{s.fields.approvedAmount}</span>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    step="0.001"
                    value={enrolment.approved_amount}
                    onChange={(e) =>
                      setEnrolment({
                        ...enrolment,
                        approved_amount: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span className={label}>{s.fields.employeeCap}</span>
                  <Input
                    type="number"
                    dir="ltr"
                    min={0}
                    step="0.001"
                    value={enrolment.monthly_cap}
                    onChange={(e) =>
                      setEnrolment({
                        ...enrolment,
                        monthly_cap: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <label className="block">
              <span className={label}>{s.fields.notes}</span>
              <Input
                value={enrolment.notes}
                onChange={(e) =>
                  setEnrolment({ ...enrolment, notes: e.target.value })
                }
              />
            </label>
          </fieldset>
          {actionError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{actionError}</p>}
        </form>
      </Modal>}
    </div>
  );
}
