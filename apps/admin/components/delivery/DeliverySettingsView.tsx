"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinned, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Select, Textarea, formatCurrencyValue } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { DELIVERY_MODES } from "@platform/database/constants/delivery";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { DeliverySettingsRecord, DeliveryZoneInput, DeliveryZoneRecord } from "@platform/database";
import { deleteDeliverySlotAction, saveDeliverySettingsAction, saveDeliverySlotAction, saveDeliveryZoneAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

type Slot = DeliveryZoneRecord["slots"][number];

export function DeliverySettingsView({ settings, zones, sharedSlots, currency, languages, canEdit }: { settings: DeliverySettingsRecord; zones: DeliveryZoneRecord[]; sharedSlots: Slot[]; currency: string; languages: readonly ContentLanguage[]; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.settings;
  const router = useRouter();
  const [form, setForm] = React.useState({ mode: settings.mode as string, slaHours: String(settings.sla_hours), timeZone: settings.time_zone, slotDays: String(settings.slot_days), leadMinutes: String(settings.lead_minutes), requireSlot: settings.require_slot });
  const [zone, setZone] = React.useState<DeliveryZoneInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const money = (value: number) => formatCurrencyValue(value, currency, locale === "ar");

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <Card className="p-5 space-y-4">
        <fieldset disabled={!canEdit} className="grid sm:grid-cols-2 gap-4">
          <Field label={copy.mode}>
            {(id) => (
              <Select id={id} name="mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="rounded-lg">
                {DELIVERY_MODES.map((m) => <option key={m} value={m}>{copy.modes[m]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.slaHours} hint={copy.slaHint}>{(id) => <Input id={id} name="slaHours" type="number" min={1} max={720} value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.timeZone} hint={formatMessage(copy.timeZoneHint, { zone: settings.effective_time_zone })}>{(id) => <Input id={id} name="timeZone" dir="ltr" maxLength={60} placeholder={settings.effective_time_zone} value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.slotDays}>{(id) => <Input id={id} type="number" min={1} max={60} value={form.slotDays} onChange={(e) => setForm({ ...form, slotDays: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.leadMinutes}>{(id) => <Input id={id} type="number" min={0} max={10080} value={form.leadMinutes} onChange={(e) => setForm({ ...form, leadMinutes: e.target.value })} className="rounded-lg" />}</Field>
          <label className="flex items-center gap-2.5 text-sm text-ink sm:pt-6">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.requireSlot} onChange={(e) => setForm({ ...form, requireSlot: e.target.checked })} />
            {copy.requireSlot}
          </label>
        </fieldset>
        {canEdit && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => void run(() => saveDeliverySettingsAction(form))} data-testid="delivery-settings-save">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {copy.save}
          </Button>
        )}
      </Card>

      <Card className="p-5 space-y-4" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><MapPinned className="w-4 h-4 text-accent" aria-hidden="true" />{copy.zones}</h2>
          {canEdit && !zone && (
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setZone({ nameEn: "", nameAr: "", areas: "", fee: "", minOrder: "", freeOver: "", isActive: true })}>
              <Plus className="w-3.5 h-3.5" />
              {copy.addZone}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-muted">{copy.zonesHint}</p>
        {zone && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="zone-editor">
            <LanguageFields label={copy.zoneName} languages={languages} wide maxLength={120} en={zone.nameEn} ar={zone.nameAr} onChange={({ en, ar }) => setZone({ ...zone, nameEn: en, nameAr: ar })} />
            <Field label={copy.areas} wide>{(id) => <Textarea id={id} name="zoneAreas" rows={3} value={zone.areas} onChange={(e) => setZone({ ...zone, areas: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={formatMessage(copy.fee, { currency })}>{(id) => <Input id={id} name="zoneFee" type="number" min={0} step="any" value={zone.fee} onChange={(e) => setZone({ ...zone, fee: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={formatMessage(copy.minOrder, { currency })}>{(id) => <Input id={id} name="zoneMinOrder" type="number" min={0} step="any" value={zone.minOrder} onChange={(e) => setZone({ ...zone, minOrder: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={formatMessage(copy.freeOver, { currency })}>{(id) => <Input id={id} type="number" min={0} step="any" value={zone.freeOver} onChange={(e) => setZone({ ...zone, freeOver: e.target.value })} className="rounded-lg" />}</Field>
            <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-accent" checked={zone.isActive} onChange={(e) => setZone({ ...zone, isActive: e.target.checked })} />{copy.active}</label>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveDeliveryZoneAction(zone))) setZone(null); }} data-testid="zone-save">{copy.saveZone}</Button>
              <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setZone(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {zones.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noZones}</p>
        ) : (
          <ul className="space-y-3" data-testid="zones-list">
            {zones.map((z) => (
              <li key={z.id} className={`rounded-xl border border-outline-variant p-4 space-y-3 ${z.is_active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-ink">{locale === "ar" ? z.name_ar || z.name_en : z.name_en || z.name_ar}</span>
                  <span>{money(z.fee)}</span>
                  {z.min_order != null && <span className="text-xs text-ink-muted">{formatMessage(copy.minOrder, { currency })}: {money(z.min_order)}</span>}
                  {z.free_over != null && <span className="text-xs text-ink-muted">{formatMessage(copy.freeOver, { currency })}: {money(z.free_over)}</span>}
                  {!z.is_active && <span className="text-xs text-ink-muted">{copy.inactive}</span>}
                  {canEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setZone({ id: z.id, nameEn: z.name_en, nameAr: z.name_ar, areas: z.areas.join("\n"), fee: String(z.fee), minOrder: z.min_order?.toString() ?? "", freeOver: z.free_over?.toString() ?? "", isActive: z.is_active })}>{copy.editZone}</button>}
                </div>
                <p className="text-xs text-ink-muted">{z.areas.length ? z.areas.join(" · ") : copy.everywhereElse}</p>
                <SlotsEditor slots={z.slots} zoneId={z.id} canEdit={canEdit} busy={busy} run={run} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy.sharedSlots}</h2>
        <SlotsEditor slots={sharedSlots} zoneId="" canEdit={canEdit} busy={busy} run={run} />
      </Card>
    </div>
  );
}

function SlotsEditor({ slots, zoneId, canEdit, busy, run }: { slots: Slot[]; zoneId: string; canEdit: boolean; busy: boolean; run: (task: () => Promise<unknown>) => Promise<boolean> }) {
  const { t } = useAdminLocale();
  const copy = t.delivery.settings;
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ weekdays: [] as number[], start: "09:00", end: "13:00", capacity: "" });
  const label = (s: Slot) => `${copy.weekdaysShort[s.weekday]} ${s.start}–${s.end}`;
  return (
    <div className="space-y-2" data-testid={`slots-${zoneId || "shared"}`}>
      {slots.length === 0 ? (
        <p className="text-xs text-ink-muted">{copy.noSlots}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1 text-xs">
              <span dir="ltr">{label(s)}</span>
              {s.capacity != null && <span className="text-ink-muted">· {formatMessage(copy.perSlot, { count: s.capacity })}</span>}
              {canEdit && <button type="button" aria-label={formatMessage(copy.removeSlot, { slot: label(s) })} disabled={busy} onClick={() => void run(() => deleteDeliverySlotAction(s.id))} className="text-rose-600"><Trash2 className="w-3 h-3" /></button>}
            </li>
          ))}
        </ul>
      )}
      {canEdit && !adding && (
        <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-mint" onClick={() => setAdding(true)}><Plus className="w-3 h-3" />{copy.addSlot}</button>
      )}
      {adding && (
        <div className="space-y-2 rounded-xl bg-ink/[0.03] p-3">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">{copy.weekdaysLabel}</legend>
            {copy.weekdaysShort.map((day, index) => (
              <label key={day} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${draft.weekdays.includes(index) ? "border-accent bg-accent/10" : "border-outline-variant"}`}>
                <input type="checkbox" className="sr-only" checked={draft.weekdays.includes(index)} onChange={(e) => setDraft({ ...draft, weekdays: e.target.checked ? [...draft.weekdays, index] : draft.weekdays.filter((d) => d !== index) })} />
                {day}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs space-y-1"><span className="block text-ink-muted">{copy.start}</span><Input type="time" name="slotStart" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="h-9 w-28 rounded-lg" /></label>
            <label className="text-xs space-y-1"><span className="block text-ink-muted">{copy.end}</span><Input type="time" name="slotEnd" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="h-9 w-28 rounded-lg" /></label>
            <label className="text-xs space-y-1"><span className="block text-ink-muted">{copy.capacity}</span><Input type="number" min={1} name="slotCapacity" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} className="h-9 w-28 rounded-lg" /></label>
            <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveDeliverySlotAction({ zoneId: zoneId || undefined, ...draft }))) { setAdding(false); setDraft({ ...draft, weekdays: [] }); } }} data-testid="slot-save">{copy.saveSlot}</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setAdding(false)}>{copy.cancel}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
