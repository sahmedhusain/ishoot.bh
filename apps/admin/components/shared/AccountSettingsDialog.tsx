"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button, Modal } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { saveAccountSettingsAction } from "../../app/actions/account-settings";

export interface AccountSettingsValue {
  userId: string;
  fullName: string;
  role: string;
  managerId: string | null;
  status: "active" | "suspended" | "archived" | "inactive";
  discountLimitPercent: number | null;
  commissionRatePercent: number | null;
}

type Field = "role" | "managerId" | "status" | "discountLimitPercent" | "commissionRatePercent";

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/20 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";
const labelClass = "block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-200";

/**
 * Edit → review → confirm. Admins save directly; when `requiresApproval` the review step collects a reason and the
 * change is sent to an administrator instead.
 */
export function AccountSettingsDialog({
  value,
  fields,
  roles,
  managers,
  requiresApproval,
  onClose,
  onSaved,
}: {
  value: AccountSettingsValue;
  fields: Field[];
  roles: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; name: string }>;
  requiresApproval: boolean;
  onClose: () => void;
  onSaved?: (mode: "applied" | "pending") => void;
}) {
  const { t, isRTL } = useAdminLocale();
  const a = t.accountSettings;
  const router = useRouter();
  const [step, setStep] = React.useState<"edit" | "review">("edit");
  const [form, setForm] = React.useState(value);
  const [statusReason, setStatusReason] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const set = <K extends keyof AccountSettingsValue>(key: K, v: AccountSettingsValue[K]) => setForm((f) => ({ ...f, [key]: v }));

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;
  const managerName = (id: string | null) => (id ? managers.find((m) => m.id === id)?.name ?? "—" : a.noManager);
  const percentText = (v: number | null, empty: string) => (v == null ? empty : `${v}%`);
  const display = (field: Field, v: AccountSettingsValue) =>
    field === "role" ? roleName(v.role)
      : field === "managerId" ? managerName(v.managerId)
        : field === "status" ? a.statuses[v.status]
          : field === "discountLimitPercent" ? percentText(v.discountLimitPercent, a.discountDefault)
            : percentText(v.commissionRatePercent, a.noCommission);
  const label = (field: Field) =>
    field === "role" ? a.role : field === "managerId" ? a.manager : field === "status" ? a.status : field === "discountLimitPercent" ? a.discountLimit : a.commissionRate;
  const changed = fields.filter((field) => (form[field] ?? null) !== (value[field] ?? null));

  const percentInput = (key: "discountLimitPercent" | "commissionRatePercent", placeholder: string) => (
    <input
      type="number"
      min={0}
      max={100}
      step={0.5}
      dir="ltr"
      className={fieldClass}
      placeholder={placeholder}
      value={form[key] ?? ""}
      onChange={(e) => set(key, e.target.value === "" ? null : Number(e.target.value))}
    />
  );

  const save = async () => {
    setSaving(true);
    try {
      const changes: Record<string, unknown> = {};
      for (const field of changed) changes[field] = form[field];
      if (changed.includes("status")) changes.statusReason = statusReason || null;
      const result = await saveAccountSettingsAction(value.userId, changes, reason || null);
      toast.success(result.mode === "pending" ? a.requested : a.saved);
      onSaved?.(result.mode);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.saved));
    } finally {
      setSaving(false);
    }
  };

  const Back = isRTL ? ArrowRight : ArrowLeft;

  return (
    <Modal isOpen onClose={onClose} title={step === "edit" ? `${a.edit} — ${value.fullName}` : a.review} closeLabel={a.cancel} className="max-w-xl">
      {step === "edit" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!changed.length) return toast.info(a.nothing);
            setStep("review");
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.includes("role") && (
              <label className={labelClass}>
                {a.role}
                <select className={fieldClass} value={form.role} onChange={(e) => set("role", e.target.value)}>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            )}
            {fields.includes("managerId") && (
              <label className={labelClass}>
                {a.manager}
                <select className={fieldClass} value={form.managerId ?? ""} onChange={(e) => set("managerId", e.target.value || null)}>
                  <option value="">{a.noManager}</option>
                  {managers.filter((m) => m.id !== value.userId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            )}
            {fields.includes("status") && (
              <label className={labelClass}>
                {a.status}
                <select className={fieldClass} value={form.status === "inactive" ? "active" : form.status} onChange={(e) => set("status", e.target.value as AccountSettingsValue["status"])}>
                  {(["active", "suspended", "archived"] as const).map((s) => <option key={s} value={s}>{a.statuses[s]}</option>)}
                </select>
              </label>
            )}
            {fields.includes("status") && form.status === "suspended" && value.status !== "suspended" && (
              <label className={labelClass}>
                {a.statusReason}
                <input required maxLength={300} className={fieldClass} value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              </label>
            )}
            {fields.includes("discountLimitPercent") && (
              <label className={labelClass}>{a.discountLimit}{percentInput("discountLimitPercent", a.discountDefault)}</label>
            )}
            {fields.includes("commissionRatePercent") && (
              <label className={labelClass}>{a.commissionRate}{percentInput("commissionRatePercent", a.noCommission)}</label>
            )}
          </div>
          {requiresApproval && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <ShieldCheck className="mt-0.5 w-3.5 h-3.5 shrink-0" />{a.approvalNote}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>{a.cancel}</Button>
            <Button type="submit" size="sm" disabled={!changed.length}>{a.review}</Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{a.reviewHint}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th scope="col" className="py-1.5 text-start font-medium" />
                <th scope="col" className="py-1.5 text-start font-medium">{a.from}</th>
                <th scope="col" className="py-1.5 text-start font-medium">{a.to}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {changed.map((field) => (
                <tr key={field}>
                  <th scope="row" className="py-2 pe-3 text-start font-medium text-slate-700 dark:text-slate-200">{label(field)}</th>
                  <td className="py-2 pe-3 text-slate-500 line-through decoration-slate-400/60">{display(field, value)}</td>
                  <td className="py-2 font-semibold text-primary dark:text-accent">{display(field, form)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {changed.includes("status") && statusReason && <p className="text-xs text-slate-600 dark:text-slate-300">{a.statusReason}: {statusReason}</p>}
          {requiresApproval && (
            <label className={labelClass}>
              {a.requestReason}
              <input maxLength={500} className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("edit")}><Back className="w-3.5 h-3.5" />{a.back}</Button>
            <Button type="button" size="sm" disabled={saving} onClick={save}>{requiresApproval ? a.confirmRequest : a.confirm}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
