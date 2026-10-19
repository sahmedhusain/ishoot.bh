"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, Plus, Search, Settings2 } from "lucide-react";
import {
  Button,
  Input,
  Select,
  formatCurrencyValue,
  formatDate,
} from "@platform/ui";
import type { listFinalSettlements, SettlementRules } from "@platform/database";
import { INSURED_CATEGORIES } from "@platform/database/hr/social-insurance";
import { ROUTES } from "../../constants/routes";
import { updateSettlementRulesAction } from "../../app/actions/final-settlements";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

type Row = Awaited<ReturnType<typeof listFinalSettlements>>[number];
export const SETTLEMENT_STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  submitted: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paid: "bg-emerald-600 text-white",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  cancelled: "bg-ink/10 text-ink-muted",
};
const STATUSES = [
  "all",
  "draft",
  "submitted",
  "approved",
  "paid",
  "rejected",
  "cancelled",
] as const;
const label = "mb-1 block text-xs font-semibold text-ink";

/** Final settlements, and the rules for leaving indemnity and unused leave they are worked out with. */
export function SettlementsListView({
  items,
  rules,
  status,
  q,
  canCreate,
  canEdit,
}: {
  items: Row[];
  rules: SettlementRules;
  status: string;
  q: string;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const f = t.settlements;
  const router = useRouter();
  const isAr = locale === "ar";
  const [search, setSearch] = React.useState(q);
  const [editingRules, setEditingRules] = React.useState(false);
  const [form, setForm] = React.useState({
    ...rules.gratuity,
    serviceUntil: rules.gratuity.serviceUntil ?? "",
    leaveEncashmentBase: rules.leaveEncashmentBase,
  });
  const [busy, setBusy] = React.useState(false);
  const href = (patch: { status?: string; q?: string }) => {
    const next = { status, q, ...patch };
    const params = new URLSearchParams();
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    return `${ROUTES.hr.settlements()}${params.size ? `?${params}` : ""}`;
  };
  const chip = (active: boolean) =>
    `h-9 inline-flex items-center rounded-full border px-4 text-xs font-semibold ${active ? "border-accent bg-accent/10 text-ink" : "border-ink/15 text-ink-muted hover:text-ink"}`;

  const saveRules = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { leaveEncashmentBase, ...gratuity } = form;
      await updateSettlementRulesAction({
        gratuity: { ...gratuity, serviceUntil: gratuity.serviceUntil || null },
        leaveEncashmentBase,
      });
      toast.success(f.rulesSaved);
      setEditingRules(false);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, f.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink sm:text-2xl">
            <FileSignature className="h-5 w-5 text-accent" aria-hidden />
            {f.title}
          </h1>
          <p className="mt-1 text-xs text-ink-muted">{f.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setEditingRules((v) => !v)}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
              {f.rules}
            </Button>
          )}
          {canCreate && (
            <Link
              href={ROUTES.hr.newSettlement()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {f.new}
            </Link>
          )}
        </div>
      </div>

      {editingRules && (
        <form
          onSubmit={saveRules}
          className="space-y-4 rounded-3xl border border-accent/30 bg-accent/5 p-5"
        >
          <div>
            <h2 className="text-sm font-bold text-ink">{f.rulesTitle}</h2>
            <p className="text-xs text-ink-muted">{f.rulesHint}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            {f.ruleFields.enabled}
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <span className={label}>{f.ruleFields.wageBasis}</span>
              <Select
                value={form.wageBasis}
                onChange={(e) =>
                  setForm({
                    ...form,
                    wageBasis: e.target.value as "basic" | "fixed",
                  })
                }
              >
                <option value="basic">{f.bases.basic}</option>
                <option value="fixed">{f.bases.fixed}</option>
              </Select>
            </label>
            <label>
              <span className={label}>{f.ruleFields.firstYears}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={40}
                value={form.firstYears}
                onChange={(e) =>
                  setForm({ ...form, firstYears: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className={label}>{f.ruleFields.firstYearsMonths}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={3}
                step="0.05"
                value={form.firstYearsMonths}
                onChange={(e) =>
                  setForm({ ...form, firstYearsMonths: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className={label}>{f.ruleFields.laterYearsMonths}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={3}
                step="0.05"
                value={form.laterYearsMonths}
                onChange={(e) =>
                  setForm({ ...form, laterYearsMonths: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className={label}>{f.ruleFields.minServiceMonths}</span>
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={120}
                value={form.minServiceMonths}
                onChange={(e) =>
                  setForm({ ...form, minServiceMonths: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span className={label}>{f.ruleFields.serviceUntil}</span>
              <Input
                type="date"
                value={form.serviceUntil}
                onChange={(e) =>
                  setForm({ ...form, serviceUntil: e.target.value })
                }
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                {f.ruleFields.serviceUntilHint}
              </span>
            </label>
            <label>
              <span className={label}>{f.ruleFields.leaveBase}</span>
              <Select
                value={form.leaveEncashmentBase}
                onChange={(e) =>
                  setForm({
                    ...form,
                    leaveEncashmentBase: e.target.value as "basic" | "fixed",
                  })
                }
              >
                <option value="fixed">{f.bases.fixed}</option>
                <option value="basic">{f.bases.basic}</option>
              </Select>
            </label>
          </div>
          <fieldset>
            <legend className={label}>{f.ruleFields.appliesTo}</legend>
            <div className="flex flex-wrap gap-3">
              {INSURED_CATEGORIES.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={form.appliesTo.includes(c)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        appliesTo: e.target.checked
                          ? [...form.appliesTo, c]
                          : form.appliesTo.filter((x) => x !== c),
                      })
                    }
                  />
                  {t.gosi.categories[c]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditingRules(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {f.saveRules}
            </Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s })}
            className={chip(status === s)}
          >
            {f.statuses[s]}
          </Link>
        ))}
        <form
          className="ms-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(href({ q: search.trim() }));
          }}
        >
          <Input
            aria-label={f.search}
            placeholder={f.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            aria-label={f.search}
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-ink/15 p-10 text-center text-sm text-ink-muted">
          {f.empty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.03] text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 text-start">{f.fields.reference}</th>
                <th className="px-4 py-3 text-start">{f.fields.employee}</th>
                <th className="px-4 py-3 text-start">{f.fields.reason}</th>
                <th className="px-4 py-3 text-start">
                  {f.fields.lastWorkingDay}
                </th>
                <th className="px-4 py-3 text-end">{f.fields.net}</th>
                <th className="px-4 py-3 text-start">{f.fields.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      href={ROUTES.hr.settlement(s.id)}
                      className="font-mono text-xs font-semibold text-accent hover:underline"
                      dir="ltr"
                    >
                      {s.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {isAr ? s.employee.nameAr : s.employee.nameEn}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {s.employee.number}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {f.reasons[s.reason as keyof typeof f.reasons]}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatDate(s.lastWorkingDay, locale)}
                  </td>
                  <td
                    className={`px-4 py-3 text-end font-semibold tabular-nums ${s.netAmount < 0 ? "text-rose-600" : "text-ink"}`}
                  >
                    {formatCurrencyValue(s.netAmount, s.currency, isAr)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SETTLEMENT_STATUS_STYLE[s.status]}`}
                    >
                      {f.statuses[s.status as keyof typeof f.statuses]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
