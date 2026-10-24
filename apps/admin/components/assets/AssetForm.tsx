"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Select } from "@platform/ui";
import type { AssetCategoryRecord, AssetInput, AssetRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { saveAssetAction } from "../../app/actions/assets";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const CONDITIONS = ["new", "excellent", "good", "fair", "poor", "damaged"] as const;
/** Every status can be set by hand; issuing and returning through a handover keeps the signed paper trail. */
const MANUAL_STATUSES = ["available", "assigned", "maintenance", "lost", "retired"] as const;

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink mb-1 block">{label}{required ? <span className="text-rose-500 ms-0.5">*</span> : null}</span>
      {children}
    </label>
  );
}

export function AssetForm({ categories, asset, employees = [], onDone }: { categories: AssetCategoryRecord[]; asset?: AssetRecord; employees?: Array<{ id: string; name_en: string; name_ar: string }>; onDone?: () => void }) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const router = useRouter();
  const isAr = locale === "ar";
  const [value, setValue] = React.useState<AssetInput>(() => ({
    category_id: asset?.category.id ?? categories[0]?.id ?? "",
    name: asset?.name ?? "",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    serial_number: asset?.serial_number ?? "",
    purchase_date: asset?.purchase_date ?? "",
    purchase_cost: asset?.purchase_cost,
    supplier: asset?.supplier ?? "",
    invoice_reference: asset?.invoice_reference ?? "",
    warranty_until: asset?.warranty_until ?? "",
    condition: asset?.condition ?? "new",
    status: asset?.status,
    location: asset?.location ?? "",
    notes: asset?.notes ?? "",
    specs: { ...(asset?.specs ?? {}) },
  }));
  const [saving, setSaving] = React.useState(false);
  const category = categories.find((c) => c.id === value.category_id);
  const set = <K extends keyof AssetInput>(key: K, v: AssetInput[K]) => setValue((x) => ({ ...x, [key]: v }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const specs = Object.fromEntries((category?.spec_fields ?? []).map((f) => [f.key, value.specs[f.key] ?? ""]).filter(([, v]) => v !== ""));
      const result = await saveAssetAction({ ...value, specs, purchase_cost: value.purchase_cost === undefined || Number.isNaN(value.purchase_cost) ? undefined : value.purchase_cost }, asset?.id);
      toast.success(a.saved);
      if (asset) {
        onDone?.();
        router.refresh();
      } else router.push(ROUTES.assets.detail(result.id));
    } catch (error) {
      toast.error(errorMessage(error, t, a.failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label={a.fields.category} required>
          <Select value={value.category_id} onChange={(e) => set("category_id", e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>)}
          </Select>
        </Field>
        <Field label={a.fields.name} required><Input required value={value.name} onChange={(e) => set("name", e.target.value)} placeholder={a.fields.namePlaceholder} /></Field>
        <Field label={a.fields.brand}><Input value={value.brand ?? ""} onChange={(e) => set("brand", e.target.value)} /></Field>
        <Field label={a.fields.model}><Input value={value.model ?? ""} onChange={(e) => set("model", e.target.value)} /></Field>
        <Field label={a.fields.serial}><Input dir="ltr" value={value.serial_number ?? ""} onChange={(e) => set("serial_number", e.target.value)} /></Field>
        <Field label={a.fields.condition} required>
          <Select value={value.condition} onChange={(e) => set("condition", e.target.value)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{a.conditions[c]}</option>)}
          </Select>
        </Field>
        {asset ? (
          <Field label={a.fields.status}>
            <Select value={value.status ?? asset.status} onChange={(e) => set("status", e.target.value)}>
              {MANUAL_STATUSES.map((s) => <option key={s} value={s}>{a.statuses[s]}</option>)}
            </Select>
          </Field>
        ) : null}
        {asset && (value.status ?? asset.status) === "assigned" && asset.status !== "assigned" ? (
          <Field label={a.fields.holder} required>
            <Select value={value.holder_employee_id ?? ""} onChange={(e) => set("holder_employee_id", e.target.value)}>
              <option value="">{a.fields.select}</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{isAr ? e.name_ar : e.name_en}</option>)}
            </Select>
          </Field>
        ) : null}
        <Field label={a.fields.location}><Input value={value.location ?? ""} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label={a.fields.purchaseDate}><Input type="date" value={value.purchase_date ?? ""} onChange={(e) => set("purchase_date", e.target.value)} /></Field>
        <Field label={a.fields.purchaseCost}><Input type="number" min={0} step="0.001" dir="ltr" value={value.purchase_cost ?? ""} onChange={(e) => set("purchase_cost", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
        <Field label={a.fields.supplier}><Input value={value.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} /></Field>
        <Field label={a.fields.invoiceReference}><Input dir="ltr" value={value.invoice_reference ?? ""} onChange={(e) => set("invoice_reference", e.target.value)} /></Field>
        <Field label={a.fields.warrantyUntil}><Input type="date" value={value.warranty_until ?? ""} onChange={(e) => set("warranty_until", e.target.value)} /></Field>
      </div>

      {category && category.spec_fields.length ? (
        <div className="rounded-2xl border border-ink/10 p-4 space-y-3">
          <h3 className="text-sm font-bold text-ink">{formatMessage(a.specsTitle, { category: isAr ? category.name_ar : category.name_en })}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {category.spec_fields.map((f) => (
              <Field key={f.key} label={isAr ? f.labelAr : f.labelEn} required={f.required}>
                {f.type === "boolean" ? (
                  <Select value={value.specs[f.key] ?? ""} onChange={(e) => set("specs", { ...value.specs, [f.key]: e.target.value })}>
                    <option value="">{a.fields.select}</option>
                    <option value="yes">{a.yes}</option>
                    <option value="no">{a.no}</option>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    dir={f.type === "text" ? undefined : "ltr"}
                    value={value.specs[f.key] ?? ""}
                    onChange={(e) => set("specs", { ...value.specs, [f.key]: e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      <Field label={a.fields.notes}>
        <textarea rows={3} value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-xl border border-ink/25 bg-white dark:bg-surface p-3 text-sm text-ink focus:outline-none focus:border-accent" />
      </Field>

      <div className="flex justify-end gap-2">
        {onDone ? <Button type="button" size="sm" variant="outline" onClick={onDone}>{t.actions.cancel}</Button> : null}
        <Button type="submit" size="sm" disabled={saving || !categories.length}>{saving ? a.saving : a.save}</Button>
      </div>
    </form>
  );
}
