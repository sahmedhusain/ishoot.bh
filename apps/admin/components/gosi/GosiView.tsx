"use client";
import { useConfirmation } from "@platform/ui";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  History,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  formatCurrencyValue,
  formatDate,
} from "@platform/ui";
import type {
  listGosiComponents,
  listGosiRegistrations,
  GosiRules,
} from "@platform/database";
import {
  INSURED_CATEGORIES,
  WAGE_BASES,
} from "@platform/database/hr/social-insurance";
import {
  deleteEmployeeGosiRecordAction,
  endGosiComponentAction,
  registerUnregisteredEmployeesAction,
  saveEmployeeGosiRecordAction,
  scheduleGosiComponentAction,
  updateGosiComponentAction,
  updateGosiRulesAction,
} from "../../app/actions/social-insurance";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

type Component = Awaited<ReturnType<typeof listGosiComponents>>[number];
type Registration = Awaited<ReturnType<typeof listGosiRegistrations>>[number];

const today = () =>
  new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
const firstOfNextMonth = () => {
  const d = new Date(Date.now() + 3 * 3600000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
};
const card =
  "rounded-3xl border border-ink/10 bg-white p-5 dark:bg-surface-raised";
const label = "mb-1 block text-xs font-semibold text-ink";

interface ComponentForm {
  mode: "add" | "schedule" | "correct";
  id?: string;
  code: string;
  name_en: string;
  name_ar: string;
  applies_to: string[];
  employee_percent: string;
  employer_percent: string;
  service_tiers: Array<{
    from_years: string;
    employee_percent: string;
    employer_percent: string;
  }>;
  wage_basis: string;
  min_wage: string;
  max_wage: string;
  effective_from: string;
  notes: string;
}

const toForm = (c?: Component, schedule = false): ComponentForm => ({
  mode: !c ? "add" : schedule ? "schedule" : "correct",
  id: schedule ? undefined : c?.id,
  code: c?.code ?? "",
  name_en: c?.nameEn ?? "",
  name_ar: c?.nameAr ?? "",
  applies_to: c?.appliesTo ?? ["bahraini"],
  employee_percent: String(c?.employeePercent ?? 0),
  employer_percent: String(c?.employerPercent ?? 0),
  service_tiers: (c?.serviceTiers ?? []).map((t) => ({
    from_years: String(t.fromYears),
    employee_percent: String(t.employeePercent),
    employer_percent: String(t.employerPercent),
  })),
  wage_basis: c?.wageBasis ?? "fixed",
  min_wage: c?.minWage == null ? "" : String(c.minWage),
  max_wage: c?.maxWage == null ? "" : String(c.maxWage),
  effective_from: schedule
    ? firstOfNextMonth()
    : (c?.effectiveFrom ?? firstOfNextMonth()),
  notes: c?.notes ?? "",
});

/** Social insurance: rules, dated contribution rates (a change takes effect from its date), employee registrations. */
export function GosiView({
  rules,
  components,
  registrations,
  canEdit,
}: {
  rules: GosiRules;
  components: Component[];
  registrations: Registration[];
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const g = t.gosi;
  const router = useRouter();
  const isAr = locale === "ar";
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState<ComponentForm | null>(null);
  const [registering, setRegistering] = React.useState<Registration | null>(
    null,
  );
  const [bulkFrom, setBulkFrom] = React.useState(firstOfNextMonth());
  const [showHistory, setShowHistory] = React.useState<string | null>(null);
  const money = (v: number) => formatCurrencyValue(v, "BHD", isAr);

  const run = async (work: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await work();
      toast.success(done);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(errorMessage(error, t, g.failed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Current version per code, with older and future versions as its history.
  const codes = Array.from(new Set(components.map((c) => c.code)));
  const current = (code: string) => {
    const on = today();
    const versions = components.filter((c) => c.code === code);
    return (
      versions.find(
        (v) =>
          v.isActive &&
          v.effectiveFrom <= on &&
          (!v.effectiveTo || v.effectiveTo >= on),
      ) ?? versions[0]
    );
  };
  const upcoming = (code: string) =>
    components.filter(
      (c) => c.code === code && c.isActive && c.effectiveFrom > today(),
    );

  const saveComponent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const payload = {
      name_en: form.name_en,
      name_ar: form.name_ar,
      applies_to: form.applies_to,
      employee_percent: Number(form.employee_percent),
      employer_percent: Number(form.employer_percent),
      service_tiers: form.service_tiers.map((t) => ({
        from_years: Number(t.from_years),
        employee_percent: Number(t.employee_percent),
        employer_percent: Number(t.employer_percent),
      })),
      wage_basis: form.wage_basis,
      min_wage: form.min_wage === "" ? null : Number(form.min_wage),
      max_wage: form.max_wage === "" ? null : Number(form.max_wage),
      notes: form.notes || null,
    };
    const ok = await run(
      () =>
        form.id
          ? updateGosiComponentAction(form.id, payload)
          : scheduleGosiComponentAction({
              ...payload,
              code: form.code,
              effective_from: form.effective_from,
            }),
      form.id ? g.saved : g.scheduled,
    );
    if (ok) setForm(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden />
          {g.title}
        </h1>
        <p className="mt-1 text-xs text-ink-muted">{g.subtitle}</p>
      </header>

      <section className={card}>
        <h2 className="mb-3 text-sm font-bold text-ink">{g.rulesTitle}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-ink/10 p-3 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1"
              disabled={!canEdit || busy}
              checked={rules.firstOfMonthRule}
              onChange={(e) =>
                run(
                  () =>
                    updateGosiRulesAction({
                      ...rules,
                      firstOfMonthRule: e.target.checked,
                    }),
                  g.saved,
                )
              }
            />
            <span>
              <span className="block font-semibold">{g.firstOfMonth}</span>
              <span className="block text-xs text-ink-muted">
                {g.firstOfMonthHint}
              </span>
            </span>
          </label>
          <div className="rounded-2xl border border-ink/10 p-3">
            <span className={label}>{g.wageSource}</span>
            <Select
              disabled={!canEdit || busy}
              value={rules.wageSource}
              onChange={(e) =>
                run(
                  () =>
                    updateGosiRulesAction({
                      ...rules,
                      wageSource: e.target.value as "contract" | "registered",
                    }),
                  g.saved,
                )
              }
            >
              <option value="registered">{g.wageSources.registered}</option>
              <option value="contract">{g.wageSources.contract}</option>
            </Select>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-ink">{g.componentsTitle}</h2>
            <p className="text-xs text-ink-muted">{g.componentsHint}</p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setForm(toForm())}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {g.addComponent}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full text-xs">
            <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-start">{g.fields.name}</th>
                <th className="px-3 py-2 text-start">{g.fields.appliesTo}</th>
                <th className="px-3 py-2 text-end">{g.fields.employee}</th>
                <th className="px-3 py-2 text-end">{g.fields.employer}</th>
                <th className="px-3 py-2 text-start">{g.fields.wage}</th>
                <th className="px-3 py-2 text-start">{g.fields.inForce}</th>
                <th className="px-3 py-2">
                  <span className="sr-only">{g.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {codes.map((code) => {
                const c = current(code);
                const next = upcoming(code);
                const history = components.filter((v) => v.code === code);
                return (
                  <React.Fragment key={code}>
                    <tr className="align-top">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-ink">
                          {isAr ? c.nameAr : c.nameEn}
                        </div>
                        <div className="font-mono text-[10px] text-ink-muted">
                          {c.code}
                        </div>
                        {!c.isActive ? (
                          <span className="text-[10px] text-rose-600">
                            {g.inactive}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {c.appliesTo
                          .map(
                            (a) => g.categories[a as keyof typeof g.categories],
                          )
                          .join(isAr ? "، " : ", ")}
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-ink">
                        {c.employeePercent}%
                      </td>
                      <td className="px-3 py-2.5 text-end tabular-nums text-ink">
                        {c.employerPercent}%
                        {c.serviceTiers.map((tier) => (
                          <div
                            key={tier.fromYears}
                            className="text-[10px] text-ink-muted"
                          >
                            {formatMessage(g.tierLine, { years: String(tier.fromYears), rate: String(tier.employerPercent) })}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {g.bases[c.wageBasis as keyof typeof g.bases]}
                        {c.maxWage != null ? (
                          <div className="text-[10px] text-ink-muted">
                            {formatMessage(g.capLine, { amount: money(c.maxWage) })}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-ink">
                        {formatDate(c.effectiveFrom, locale)}
                        {c.effectiveTo
                          ? ` – ${formatDate(c.effectiveTo, locale)}`
                          : ""}
                        {next.map((n) => (
                          <div
                            key={n.id}
                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                          >
                            <CalendarClock className="h-3 w-3" aria-hidden />
                            {formatMessage(g.fromDate, { date: formatDate(n.effectiveFrom, locale) })}
                            : {n.employeePercent}% / {n.employerPercent}%
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">
                        <button
                          type="button"
                          aria-label={g.history}
                          title={g.history}
                          onClick={() =>
                            setShowHistory(showHistory === code ? null : code)
                          }
                          className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              aria-label={g.scheduleChange}
                              title={g.scheduleChange}
                              onClick={() => setForm(toForm(c, true))}
                              className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                            >
                              <CalendarClock className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label={g.correct}
                              title={g.correct}
                              onClick={() => setForm(toForm(c))}
                              className="rounded-lg p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {showHistory === code && (
                      <tr>
                        <td colSpan={7} className="bg-ink/[0.02] px-3 py-2">
                          <ul className="space-y-1">
                            {history.map((v) => (
                              <li
                                key={v.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink"
                              >
                                <span>
                                  {formatDate(v.effectiveFrom, locale)} –{" "}
                                  {v.effectiveTo
                                    ? formatDate(v.effectiveTo, locale)
                                    : g.openEnded}{" "}
                                  · {v.employeePercent}% / {v.employerPercent}%
                                  {v.maxWage != null
                                    ? ` · ${formatMessage(g.capLine, { amount: money(v.maxWage) })}`
                                    : ""}
                                </span>
                                {canEdit && !v.effectiveTo && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className="font-semibold text-rose-600 hover:underline"
                                    onClick={() => {
                                      const end = window.prompt(
                                        g.endPrompt,
                                        today(),
                                      );
                                      if (end)
                                        void run(
                                          () =>
                                            endGosiComponentAction(v.id, end),
                                          g.saved,
                                        );
                                    }}
                                  >
                                    {g.end}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {form && (
          <form
            onSubmit={saveComponent}
            className="mt-4 space-y-4 rounded-2xl border border-accent/30 bg-accent/5 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">
                {form.mode === "correct"
                  ? g.correctTitle
                  : form.mode === "schedule"
                    ? g.scheduleTitle
                    : g.addComponent}
              </h3>
              <button
                type="button"
                aria-label={t.actions.cancel}
                onClick={() => setForm(null)}
                className="rounded-lg p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-ink-muted">
              {form.mode === "correct" ? g.correctHint : g.scheduleHint}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <span className={label}>{g.fields.code}</span>
                <Input
                  dir="ltr"
                  required
                  disabled={form.mode !== "add"}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={t.copy.pensionExample}
                />
              </label>
              <label>
                <span className={label}>{g.fields.nameEn}</span>
                <Input
                  required
                  value={form.name_en}
                  onChange={(e) =>
                    setForm({ ...form, name_en: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{g.fields.nameAr}</span>
                <Input
                  required
                  value={form.name_ar}
                  onChange={(e) =>
                    setForm({ ...form, name_ar: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{g.fields.employee} (%)</span>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  max={100}
                  step="0.001"
                  required
                  value={form.employee_percent}
                  onChange={(e) =>
                    setForm({ ...form, employee_percent: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{g.fields.employer} (%)</span>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  max={100}
                  step="0.001"
                  required
                  value={form.employer_percent}
                  onChange={(e) =>
                    setForm({ ...form, employer_percent: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{g.fields.wage}</span>
                <Select
                  value={form.wage_basis}
                  onChange={(e) =>
                    setForm({ ...form, wage_basis: e.target.value })
                  }
                >
                  {WAGE_BASES.map((b) => (
                    <option key={b} value={b}>
                      {g.bases[b]}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span className={label}>{g.fields.minWage}</span>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  step="0.001"
                  value={form.min_wage}
                  onChange={(e) =>
                    setForm({ ...form, min_wage: e.target.value })
                  }
                />
              </label>
              <label>
                <span className={label}>{g.fields.maxWage}</span>
                <Input
                  type="number"
                  dir="ltr"
                  min={0}
                  step="0.001"
                  value={form.max_wage}
                  onChange={(e) =>
                    setForm({ ...form, max_wage: e.target.value })
                  }
                />
              </label>
              {!form.id && (
                <label>
                  <span className={label}>{g.fields.effectiveFrom}</span>
                  <Input
                    type="date"
                    required
                    value={form.effective_from}
                    onChange={(e) =>
                      setForm({ ...form, effective_from: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
            <fieldset>
              <legend className={label}>{g.fields.appliesTo}</legend>
              <div className="flex flex-wrap gap-3">
                {INSURED_CATEGORIES.filter((c) => c !== "exempt").map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={form.applies_to.includes(c)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          applies_to: e.target.checked
                            ? [...form.applies_to, c]
                            : form.applies_to.filter((x) => x !== c),
                        })
                      }
                    />
                    {g.categories[c]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className={label}>{g.serviceTiers}</legend>
              <p className="text-[11px] text-ink-muted">{g.serviceTiersHint}</p>
              {form.service_tiers.map((tier, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <label className="w-28">
                    <span className={label}>{g.fields.fromYears}</span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={1}
                      max={50}
                      value={tier.from_years}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          service_tiers: form.service_tiers.map((x, j) =>
                            j === i ? { ...x, from_years: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="w-28">
                    <span className={label}>{g.fields.employee} (%)</span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={100}
                      step="0.001"
                      value={tier.employee_percent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          service_tiers: form.service_tiers.map((x, j) =>
                            j === i
                              ? { ...x, employee_percent: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="w-28">
                    <span className={label}>{g.fields.employer} (%)</span>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={100}
                      step="0.001"
                      value={tier.employer_percent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          service_tiers: form.service_tiers.map((x, j) =>
                            j === i
                              ? { ...x, employer_percent: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={g.remove}
                    onClick={() =>
                      setForm({
                        ...form,
                        service_tiers: form.service_tiers.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                    className="mb-2 rounded-lg p-1.5 text-ink-muted hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-semibold text-accent hover:underline"
                onClick={() =>
                  setForm({
                    ...form,
                    service_tiers: [
                      ...form.service_tiers,
                      {
                        from_years: "3",
                        employee_percent: form.employee_percent,
                        employer_percent: form.employer_percent,
                      },
                    ],
                  })
                }
              >
                {g.addTier}
              </button>
            </fieldset>
            <label className="block">
              <span className={label}>{g.fields.notes}</span>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm(null)}
              >
                {t.actions.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {form.id ? g.save : g.schedule}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Users className="h-4 w-4 text-accent" aria-hidden />
              {g.employeesTitle}
            </h2>
            <p className="text-xs text-ink-muted">{g.employeesHint}</p>
          </div>
          {canEdit && registrations.some((r) => !r.current) ? (
            <div className="flex items-end gap-2">
              <label>
                <span className={label}>{g.fields.effectiveFrom}</span>
                <Input
                  type="date"
                  value={bulkFrom}
                  onChange={(e) => setBulkFrom(e.target.value)}
                />
              </label>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const r =
                      await registerUnregisteredEmployeesAction(bulkFrom);
                    toast.info(
                      formatMessage(g.bulkResult, { registered: String(r.registered), skipped: String(r.skipped) }),
                    );
                  }, g.saved)
                }
              >
                {g.registerAll}
              </Button>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-ink/10">
          <table className="w-full text-xs">
            <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
              <tr>
                <th className="px-3 py-2 text-start">
                  {g.fields.employeeName}
                </th>
                <th className="px-3 py-2 text-start">{g.fields.category}</th>
                <th className="px-3 py-2 text-start">
                  {g.fields.registrationNumber}
                </th>
                <th className="px-3 py-2 text-end">
                  {g.fields.registeredWage}
                </th>
                <th className="px-3 py-2 text-end">{g.thisMonth}</th>
                <th className="px-3 py-2">
                  <span className="sr-only">{g.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {registrations.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-ink">
                      {isAr ? r.nameAr : r.nameEn}
                    </div>
                    <div className="text-[10px] text-ink-muted">
                      {r.employeeNumber}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.current ? (
                      g.categories[
                        r.current.category as keyof typeof g.categories
                      ]
                    ) : (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        {g.unregistered}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-ink" dir="ltr">
                    {r.current?.registrationNumber || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-ink">
                    {r.current?.registeredWage != null
                      ? money(r.current.registeredWage)
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-end tabular-nums">
                    {r.thisMonth ? (
                      r.thisMonth.due ? (
                        <>
                          <div className="text-ink">
                            {g.employeeShort}: {money(r.thisMonth.employee)}
                          </div>
                          <div className="text-ink-muted">
                            {g.employerShort}: {money(r.thisMonth.employer)}
                          </div>
                        </>
                      ) : (
                        <span className="text-ink-muted">
                          {
                            g.reasons[
                              r.thisMonth.reason as keyof typeof g.reasons
                            ]
                          }
                        </span>
                      )
                    ) : (
                      <span className="text-ink-muted">{g.manualSettings}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-end">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRegistering(r)}
                      >
                        {r.current ? g.changeRegistration : g.register}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {registering && (
        <RegistrationForm
          employee={registering}
          components={codes.map(current)}
          onClose={() => setRegistering(null)}
          onDone={() => {
            setRegistering(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RegistrationForm({
  employee,
  components,
  onClose,
  onDone,
}: {
  employee: Registration;
  components: Component[];
  onClose: () => void;
  onDone: () => void;
}) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const g = t.gosi;
  const isAr = locale === "ar";
  const base = employee.current;
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    category: (base?.category ??
      (employee.nationality === "BH"
        ? "bahraini"
        : ["SA", "KW", "AE", "QA", "OM"].includes(employee.nationality ?? "")
          ? "gcc"
          : "expat")) as string,
    registration_number: base?.registrationNumber ?? "",
    registered_wage:
      base?.registeredWage == null ? "" : String(base.registeredWage),
    effective_from: firstOfNextMonth(),
    notes: "",
    overrides: components.map((c) => {
      const o = base?.overrides.find((x) => x.code === c.code);
      return {
        code: c.code,
        exempt: !!o?.exempt,
        wage: o?.wage == null ? "" : String(o.wage),
        employee_percent:
          o?.employeePercent == null ? "" : String(o.employeePercent),
        employer_percent:
          o?.employerPercent == null ? "" : String(o.employerPercent),
      };
    }),
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveEmployeeGosiRecordAction(employee.id, {
        category: form.category,
        registration_number: form.registration_number || null,
        registered_wage:
          form.registered_wage === "" ? null : Number(form.registered_wage),
        effective_from: form.effective_from,
        notes: form.notes || null,
        overrides: form.overrides.map((o) => ({
          code: o.code,
          exempt: o.exempt,
          wage: o.wage === "" ? null : Number(o.wage),
          employee_percent:
            o.employee_percent === "" ? null : Number(o.employee_percent),
          employer_percent:
            o.employer_percent === "" ? null : Number(o.employer_percent),
        })),
      });
      toast.success(g.saved);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, t, g.failed));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto modal-scrim p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gosi-reg-title"
    >
      <form
        onSubmit={submit}
        className="my-8 w-full max-w-3xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-surface-raised"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="gosi-reg-title" className="text-base font-bold text-ink">
              {formatMessage(g.registrationTitle, {
                name: isAr ? employee.nameAr : employee.nameEn,
              })}
            </h2>
            <p className="text-xs text-ink-muted">{g.registrationHint}</p>
          </div>
          <button
            type="button"
            aria-label={t.actions.close}
            onClick={onClose}
            className="rounded-lg p-1 text-ink-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            <span className={label}>{g.fields.category}</span>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {INSURED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {g.categories[c]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className={label}>{g.fields.effectiveFrom}</span>
            <Input
              type="date"
              required
              value={form.effective_from}
              onChange={(e) =>
                setForm({ ...form, effective_from: e.target.value })
              }
            />
          </label>
          <label>
            <span className={label}>{g.fields.registrationNumber}</span>
            <Input
              dir="ltr"
              value={form.registration_number}
              onChange={(e) =>
                setForm({ ...form, registration_number: e.target.value })
              }
            />
          </label>
          <label>
            <span className={label}>{g.fields.registeredWage}</span>
            <Input
              type="number"
              dir="ltr"
              min={0}
              step="0.001"
              value={form.registered_wage}
              onChange={(e) =>
                setForm({ ...form, registered_wage: e.target.value })
              }
              placeholder={g.registeredWageHint}
            />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className={label}>{g.exceptions}</legend>
          <p className="text-[11px] text-ink-muted">{g.exceptionsHint}</p>
          <div className="overflow-x-auto rounded-2xl border border-ink/10">
            <table className="w-full text-xs">
              <thead className="bg-ink/[0.03] text-[11px] text-ink-muted">
                <tr>
                  <th className="px-3 py-2 text-start">{g.fields.name}</th>
                  <th className="px-3 py-2">{g.exempt}</th>
                  <th className="px-3 py-2">{g.fields.employee} (%)</th>
                  <th className="px-3 py-2">{g.fields.employer} (%)</th>
                  <th className="px-3 py-2">{g.fields.componentWage}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {form.overrides.map((o, i) => {
                  const c = components.find((x) => x.code === o.code)!;
                  const set = (patch: Partial<typeof o>) =>
                    setForm({
                      ...form,
                      overrides: form.overrides.map((x, j) =>
                        j === i ? { ...x, ...patch } : x,
                      ),
                    });
                  return (
                    <tr key={o.code}>
                      <td className="px-3 py-2 text-ink">
                        {isAr ? c.nameAr : c.nameEn}{" "}
                        <span className="text-[10px] text-ink-muted">
                          ({c.employeePercent}% / {c.employerPercent}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={g.exempt}
                          checked={o.exempt}
                          onChange={(e) => set({ exempt: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          dir="ltr"
                          min={0}
                          max={100}
                          step="0.001"
                          disabled={o.exempt}
                          value={o.employee_percent}
                          onChange={(e) =>
                            set({ employee_percent: e.target.value })
                          }
                          placeholder={String(c.employeePercent)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          dir="ltr"
                          min={0}
                          max={100}
                          step="0.001"
                          disabled={o.exempt}
                          value={o.employer_percent}
                          onChange={(e) =>
                            set({ employer_percent: e.target.value })
                          }
                          placeholder={String(c.employerPercent)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          dir="ltr"
                          min={0}
                          step="0.001"
                          disabled={o.exempt}
                          value={o.wage}
                          aria-label={g.fields.componentWage}
                          onChange={(e) => set({ wage: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
        <label className="block">
          <span className={label}>{g.fields.notes}</span>
          <Input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </label>
        {employee.history.length ? (
          <div>
            <h3 className={label}>{g.history}</h3>
            <ul className="space-y-1">
              {employee.history.map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/10 px-3 py-2 text-[11px] text-ink"
                >
                  <span>
                    {formatDate(h.effectiveFrom, locale)} –{" "}
                    {h.effectiveTo
                      ? formatDate(h.effectiveTo, locale)
                      : g.openEnded}{" "}
                    · {g.categories[h.category as keyof typeof g.categories]}
                    {h.registeredWage != null ? ` · ${h.registeredWage}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    className="font-semibold text-rose-600 hover:underline"
                    onClick={async () => {
                      return confirmAction({
                        description: g.deleteConfirm,
                        onConfirm: async () => {
                          setBusy(true);
                          try {
                            await deleteEmployeeGosiRecordAction(h.id);
                            toast.success(g.saved);
                            onDone();
                          } catch (error) {
                            toast.error(errorMessage(error, t, g.failed));
                          } finally {
                            setBusy(false);
                          }
                        },
                      });
                    }}
                  >
                    {g.delete}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            {t.actions.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            {g.saveRegistration}
          </Button>
        </div>
      </form>
    </div>
  );
}
