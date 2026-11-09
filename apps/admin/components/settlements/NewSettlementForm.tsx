"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, Input, Select } from "@platform/ui";
import { SETTLEMENT_REASONS } from "@platform/database/constants/settlements";
import { ROUTES } from "../../constants/routes";
import { createFinalSettlementAction } from "../../app/actions/final-settlements";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { PageHeader } from "../layout/PageHeader";

export function NewSettlementForm({
  employees,
  initial,
}: {
  employees: Array<{
    id: string;
    number: string;
    nameEn: string;
    nameAr: string;
  }>;
  initial: {
    employeeId: string;
    handoverId: string;
    lastWorkingDay: string;
    notes: string;
  };
}) {
  const { t, locale } = useAdminLocale();
  const f = t.settlements;
  const router = useRouter();
  const isAr = locale === "ar";
  const [form, setForm] = React.useState({
    employee_id: initial.employeeId,
    reason: "resignation",
    last_working_day: initial.lastWorkingDay,
    notes: initial.notes,
  });
  const [busy, setBusy] = React.useState(false);
  const label = "mb-1 block text-xs font-semibold text-ink";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await createFinalSettlementAction({
        ...form,
        handover_id: initial.handoverId || null,
        notes: form.notes || null,
      });
      toast.success(f.created);
      router.push(ROUTES.hr.settlement(result.id));
    } catch (error) {
      toast.error(errorMessage(error, t, f.failed));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <PageHeader
        back={{ href: ROUTES.hr.settlements() }}
      />
      <form
        onSubmit={submit}
        className="space-y-4 rounded-3xl border border-outline-variant bg-surface-raised p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>{f.fields.employee}</span>
            <Select
              required
              value={form.employee_id}
              onChange={(e) =>
                setForm({ ...form, employee_id: e.target.value })
              }
            >
              <option value="">{f.select}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {isAr ? e.nameAr : e.nameEn} ({e.number})
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className={label}>{f.fields.reason}</span>
            <Select
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            >
              {SETTLEMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {f.reasons[r]}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className={label}>{f.fields.lastWorkingDay}</span>
            <Input
              type="date"
              required
              value={form.last_working_day}
              onChange={(e) =>
                setForm({ ...form, last_working_day: e.target.value })
              }
            />
          </label>
          <label className="sm:col-span-2">
            <span className={label}>{f.fields.notes}</span>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>
        <p className="rounded-2xl bg-ink/[0.03] p-3 text-xs text-ink-muted">
          {f.whatIsIncluded}
        </p>
        <div className="flex justify-end gap-2">
          <Link href={ROUTES.hr.settlements()}>
            <Button type="button" size="sm" variant="outline">
              {t.actions.cancel}
            </Button>
          </Link>
          <Button
            type="submit"
            size="sm"
            disabled={busy || !form.employee_id || !form.last_working_day}
          >
            {busy ? f.calculating : f.calculate}
          </Button>
        </div>
      </form>
    </div>
  );
}
