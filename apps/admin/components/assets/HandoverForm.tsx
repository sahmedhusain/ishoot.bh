"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { Button, Input, Select } from "@ishoot/ui";
import type { AssetRecord } from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { startAssetHandoverAction } from "../../app/actions/assets";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { SignatureCanvas } from "../shared/SignatureCanvas";

const CONDITIONS = ["new", "excellent", "good", "fair", "poor", "damaged"] as const;
type Employee = { id: string; name_en: string; name_ar: string };

/**
 * Issue an asset to an employee or take it back. Every checklist item of the category is confirmed or noted,
 * damage is described (and optionally recovered from salary), and the employee signs now or from their profile.
 */
export function HandoverForm({ asset, kind, employees, onCancel, offboardingId }: { asset: AssetRecord; kind: "issue" | "return"; employees: Employee[]; onCancel: () => void; offboardingId?: string }) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const h = a.handover;
  const router = useRouter();
  const isAr = locale === "ar";
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const [employeeId, setEmployeeId] = React.useState(kind === "return" ? asset.holder?.id ?? "" : "");
  const [date, setDate] = React.useState(today);
  const [condition, setCondition] = React.useState(asset.condition);
  const [checks, setChecks] = React.useState<Record<string, { ok: boolean; note: string }>>(() =>
    Object.fromEntries(asset.category.checklist.map((c) => [c.key, { ok: false, note: "" }])),
  );
  const [accessories, setAccessories] = React.useState("");
  const [damage, setDamage] = React.useState("");
  const [charge, setCharge] = React.useState("");
  const [deduct, setDeduct] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [signNow, setSignNow] = React.useState(false);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [signer, setSigner] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const unchecked = asset.category.checklist.filter((c) => !checks[c.key]?.ok && !checks[c.key]?.note.trim()).length;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await startAssetHandoverAction(
        {
          asset_id: asset.id,
          employee_id: employeeId,
          kind,
          handover_date: date,
          condition,
          checklist: Object.entries(checks).map(([key, v]) => ({ key, ok: v.ok, ...(v.note.trim() ? { note: v.note.trim() } : {}) })),
          accessories: accessories || undefined,
          damage_notes: damage || undefined,
          damage_charge: charge === "" ? undefined : Number(charge),
          deduct_from_salary: deduct,
          notes: notes || undefined,
          ...(offboardingId ? { offboarding_id: offboardingId } : {}),
        },
        signNow && signature ? { signature, signer_name: signer } : undefined,
      );
      toast.success(result.status === "pending_approval" ? h.sentForApproval : h.awaitingEmployee);
      router.push(ROUTES.assets.handover(result.id));
    } catch (error) {
      toast.error(errorMessage(error, t, a.failed));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-accent/30 bg-accent/5 p-5">
      <h2 className="text-base font-bold text-ink">{kind === "issue" ? h.issueTitle : h.returnTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.employee}</span>
          {kind === "issue" ? (
            <Select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">{a.fields.select}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{isAr ? e.name_ar : e.name_en}</option>)}
            </Select>
          ) : (
            <Input value={asset.holder ? (isAr ? asset.holder.name_ar : asset.holder.name_en) : ""} disabled />
          )}
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.date}</span>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.condition}</span>
          <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{a.conditions[c]}</option>)}
          </Select>
        </label>
      </div>

      {asset.category.checklist.length ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">{h.checklist}</h3>
            {unchecked ? <span className="text-[11px] text-amber-600 dark:text-amber-300">{h.uncheckedCount.replace("{n}", String(unchecked))}</span> : null}
          </div>
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white dark:bg-surface-raised">
            {asset.category.checklist.map((item) => {
              const state = checks[item.key];
              return (
                <li key={item.key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 py-2.5">
                  <button type="button" aria-pressed={state.ok} onClick={() => setChecks((prev) => ({ ...prev, [item.key]: { ...prev[item.key], ok: !prev[item.key].ok } }))} className="flex items-center gap-2 text-start text-sm text-ink">
                    {state.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-ink-muted" />}
                    {isAr ? item.labelAr : item.labelEn}
                  </button>
                  <input
                    aria-label={h.itemNote}
                    placeholder={h.itemNote}
                    value={state.note}
                    onChange={(e) => { const note = e.target.value; setChecks((prev) => ({ ...prev, [item.key]: { ...prev[item.key], note } })); }}
                    className="h-9 rounded-lg border border-ink/15 bg-surface-sunken/60 px-2.5 text-xs text-ink"
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.accessories}</span>
          <Input value={accessories} onChange={(e) => setAccessories(e.target.value)} placeholder={h.accessoriesPlaceholder} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.damage}</span>
          <Input value={damage} onChange={(e) => setDamage(e.target.value)} placeholder={kind === "issue" ? h.damageIssueHint : h.damageReturnHint} />
        </label>
        {kind === "return" ? (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-ink mb-1 block">{h.charge}</span>
              <Input type="number" min={0} step="0.001" dir="ltr" value={charge} onChange={(e) => setCharge(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 self-end h-11 text-sm text-ink">
              <input type="checkbox" checked={deduct} disabled={!Number(charge)} onChange={(e) => setDeduct(e.target.checked)} />
              {h.deduct}
            </label>
          </>
        ) : null}
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-ink mb-1 block">{h.notes}</span>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white dark:bg-surface-raised p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={signNow} onChange={(e) => setSignNow(e.target.checked)} />
          {h.signInPerson}
        </label>
        <p className="text-[11px] text-ink-muted">{signNow ? h.signInPersonHint : h.signLaterHint}</p>
        {signNow ? (
          <>
            <Input required value={signer} onChange={(e) => setSigner(e.target.value)} placeholder={h.signerName} />
            <SignatureCanvas onChange={setSignature} clearLabel={h.clear} hint={h.drawHere} />
          </>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>{t.actions.cancel}</Button>
        <Button type="submit" size="sm" disabled={saving || !employeeId || (signNow && (!signature || !signer.trim()))}>{kind === "issue" ? h.issueSubmit : h.returnSubmit}</Button>
      </div>
    </form>
  );
}
