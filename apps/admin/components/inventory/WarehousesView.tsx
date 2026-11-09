"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Pencil, Plus, Warehouse } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { WarehouseRecord } from "@platform/database";
import { saveLocationAction, saveWarehouseAction } from "../../app/actions/inventory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

interface WarehouseDraft {
  id?: string;
  code: string;
  nameEn: string;
  nameAr: string;
  address: string;
  isActive: boolean;
  isDefault: boolean;
}
interface LocationDraft {
  id?: string;
  warehouseId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export function WarehousesView({ warehouses, languages, canEdit }: { warehouses: WarehouseRecord[]; languages: readonly ContentLanguage[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.inventory.warehouses;
  const router = useRouter();
  const [warehouse, setWarehouse] = React.useState<WarehouseDraft | null>(null);
  const [location, setLocation] = React.useState<LocationDraft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      setWarehouse(null);
      setLocation(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const name = (w: WarehouseRecord) => (locale === "ar" ? w.name_ar : w.name_en);
  const actions = (save: () => void) => (
    <div className="flex gap-2">
      <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={save}>
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {copy.save}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => { setWarehouse(null); setLocation(null); }}>{copy.cancel}</Button>
    </div>
  );

  const warehouseEditor = warehouse && (
    <Card className="p-5 space-y-4" data-testid="warehouse-editor">
      <div className="grid sm:grid-cols-2 gap-4">
        <LanguageFields name="warehouseName" label={copy.name} languages={languages} required maxLength={120} en={warehouse.nameEn} ar={warehouse.nameAr} onChange={({ en, ar }) => setWarehouse({ ...warehouse, nameEn: en, nameAr: ar })} />
        <Field label={copy.code}>
          {(id) => <Input id={id} name="warehouseCode" dir="ltr" maxLength={20} value={warehouse.code} onChange={(e) => setWarehouse({ ...warehouse, code: e.target.value.toUpperCase() })} className="rounded-lg font-mono" />}
        </Field>
        <Field label={copy.address} wide>
          {(id) => <Input id={id} maxLength={300} value={warehouse.address} onChange={(e) => setWarehouse({ ...warehouse, address: e.target.value })} className="rounded-lg" />}
        </Field>
        {([["isActive", copy.active], ["isDefault", copy.default]] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={warehouse[key]} onChange={(e) => setWarehouse({ ...warehouse, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>
      {actions(() => run(() => saveWarehouseAction(warehouse)))}
    </Card>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        actions={canEdit && !warehouse && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" onClick={() => setWarehouse({ code: "", nameEn: "", nameAr: "", address: "", isActive: true, isDefault: false })}>
            <Plus className="w-3.5 h-3.5" />
            {copy.add}
          </Button>
        )}
      />
      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
      {warehouse && !warehouse.id && warehouseEditor}
      {warehouses.map((w) => (
        <Card key={w.id} className="p-5 space-y-4">
          {warehouse?.id === w.id ? (
            warehouseEditor
          ) : (
            <div className="flex items-start gap-3">
              <Warehouse className="w-5 h-5 text-accent mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-ink flex flex-wrap items-center gap-2">
                  {name(w)}
                  <span className="font-mono text-xs text-ink-muted" dir="ltr"><bdi dir="ltr">{w.code}</bdi></span>
                  {w.is_default && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">{copy.defaultBadge}</span>}
                  {!w.is_active && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] text-ink-muted">{copy.inactive}</span>}
                </h2>
                {w.address && <p className="text-xs text-ink-muted mt-0.5">{w.address}</p>}
              </div>
              {canEdit && (
                <button type="button" aria-label={formatMessage(copy.edit, { name: name(w) })} onClick={() => setWarehouse({ id: w.id, code: w.code, nameEn: w.name_en, nameAr: w.name_ar, address: w.address, isActive: w.is_active, isDefault: w.is_default })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-ink/5">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-ink-muted">{copy.locations}</h3>
            <ul className="flex flex-wrap gap-2">
              {w.locations.map((l) => (
                <li key={l.id}>
                  <button type="button" disabled={!canEdit} onClick={() => setLocation({ id: l.id, warehouseId: w.id, code: l.code, name: l.name, isActive: l.is_active })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${l.is_active ? "border-outline-variant text-ink" : "border-dashed border-outline-variant text-ink-muted"} enabled:hover:border-accent`}>
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    <span className="font-mono" dir="ltr"><bdi dir="ltr">{l.code}</bdi></span>
                    {l.name && <span className="text-ink-muted"><bdi dir="auto">{l.name}</bdi></span>}
                  </button>
                </li>
              ))}
              {canEdit && (
                <li>
                  <button type="button" onClick={() => setLocation({ warehouseId: w.id, code: "", name: "", isActive: true })} className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent/50 px-3 py-1 text-xs text-accent hover:bg-accent/5">
                    <Plus className="w-3 h-3" aria-hidden="true" />
                    {copy.addLocation}
                  </button>
                </li>
              )}
            </ul>
            {location?.warehouseId === w.id && (
              <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end rounded-xl border border-outline-variant p-3" data-testid="location-editor">
                <Field label={copy.locationCode}>
                  {(id) => <Input id={id} name="locationCode" dir="ltr" maxLength={20} value={location.code} onChange={(e) => setLocation({ ...location, code: e.target.value.toUpperCase() })} className="rounded-lg font-mono" />}
                </Field>
                <Field label={copy.locationName}>
                  {(id) => <Input id={id} maxLength={80} value={location.name} onChange={(e) => setLocation({ ...location, name: e.target.value })} className="rounded-lg" />}
                </Field>
                <label className="flex items-center gap-2 text-sm text-ink h-11">
                  <input type="checkbox" className="h-4 w-4 accent-accent" checked={location.isActive} onChange={(e) => setLocation({ ...location, isActive: e.target.checked })} />
                  {copy.active}
                </label>
                <div className="sm:col-span-3">{actions(() => run(() => saveLocationAction(location)))}</div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
