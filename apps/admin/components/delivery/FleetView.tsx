"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CarFront, Plus, UserRound } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { VEHICLE_KINDS } from "@platform/database/constants/delivery";
import type { DriverOption, VehicleInput, VehicleRecord } from "@platform/database";
import { saveVehicleAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

export function FleetView({ vehicles, drivers }: { vehicles: VehicleRecord[]; drivers: DriverOption[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.fleet;
  const router = useRouter();
  const [draft, setDraft] = React.useState<VehicleInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveVehicleAction(draft);
      setDraft(null);
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        actions={!draft && (
          <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setDraft({ plate: "", name: "", kind: "van", notes: "", isActive: true })}>
            <Plus className="w-4 h-4" />
            {copy.add}
          </Button>
        )}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      {draft && (
        <Card className="p-5 grid sm:grid-cols-2 gap-4" data-testid="vehicle-editor">
          <Field label={copy.plate}>{(id) => <Input id={id} name="plate" dir="ltr" maxLength={30} value={draft.plate} onChange={(e) => setDraft({ ...draft, plate: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.name}>{(id) => <Input id={id} name="vehicleName" maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.kind}>
            {(id) => (
              <Select id={id} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="rounded-lg">
                {VEHICLE_KINDS.map((k) => <option key={k} value={k}>{t.delivery.kinds[k]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.notes}>{(id) => <Input id={id} maxLength={500} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="rounded-lg" />}</Field>
          <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />{copy.active}</label>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void save()} data-testid="vehicle-save">{copy.save}</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {vehicles.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-muted">{copy.empty}</p>
        ) : (
          <ul className="divide-y divide-outline-variant" data-testid="vehicles-list">
            {vehicles.map((v) => (
              <li key={v.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm ${v.is_active ? "" : "opacity-60"}`}>
                <CarFront className="w-4 h-4 text-accent" aria-hidden="true" />
                <span className="font-mono font-semibold text-ink" dir="ltr">{v.plate}</span>
                <span className="text-ink"><bdi dir="auto">{v.name}</bdi></span>
                <span className="text-xs text-ink-muted">{(t.delivery.kinds as Record<string, string>)[v.kind]}</span>
                {!v.is_active && <span className="text-xs text-ink-muted">{copy.inactive}</span>}
                <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setDraft({ id: v.id, plate: v.plate, name: v.name, kind: v.kind, notes: v.notes, isActive: v.is_active })}>{copy.edit}</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy.drivers}</h2>
        {drivers.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noDrivers}</p>
        ) : (
          <ul className="flex flex-wrap gap-2" data-testid="drivers-list">
            {drivers.map((d) => (
              <li key={d.id} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1 text-xs">
                <UserRound className="w-3.5 h-3.5" aria-hidden="true" />
                {locale === "ar" ? d.name_ar : d.name_en}
                {d.phone && <span className="text-ink-muted" dir="ltr"><bdi dir="ltr">{d.phone}</bdi></span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
