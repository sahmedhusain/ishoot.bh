"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Route } from "lucide-react";
import { Button, Card, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { DriverOption, VehicleRecord, listRouteSheets, routableShipments } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { createRouteSheetAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { ShipmentStatusPill } from "./ShipmentPills";
import { PageHeader } from "../layout/PageHeader";

type Sheet = Awaited<ReturnType<typeof listRouteSheets>>[number];
type Routable = Awaited<ReturnType<typeof routableShipments>>[number];

const today = () => new Date().toISOString().slice(0, 10);

/** Delivery → route sheets: plan a driver's run from the shipments waiting to go out. */
export function RouteSheetsView({ sheets, shipments, drivers, vehicles }: { sheets: Sheet[]; shipments: Routable[]; drivers: DriverOption[]; vehicles: VehicleRecord[] }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.routes;
  const router = useRouter();
  const [planning, setPlanning] = React.useState(false);
  const [plan, setPlan] = React.useState({ date: today(), driverId: drivers[0]?.id ?? "", vehicleId: "", note: "" });
  const [picked, setPicked] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const name = (d: { name_en: string; name_ar: string }) => (locale === "ar" ? d.name_ar : d.name_en);
  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const shift = (index: number, by: number) =>
    setPicked((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await createRouteSheetAction({ ...plan, shipmentIds: picked });
      router.push(ROUTES.delivery.route(result.id));
    } catch (err) {
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };
  const byId = new Map(shipments.map((s) => [s.id, s]));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={!planning && (
          <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setPlanning(true)}>
            <Plus className="w-4 h-4" />
            {copy.new}
          </Button>
        )}
      />

      {planning && (
        <Card className="p-5 space-y-4" data-testid="route-planner">
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label={copy.date}>{(id) => <Input id={id} name="routeDate" type="date" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.driver}>
              {(id) => (
                <Select id={id} name="routeDriver" value={plan.driverId} onChange={(e) => setPlan({ ...plan, driverId: e.target.value })} className="rounded-lg">
                  {drivers.map((d) => <option key={d.id} value={d.id}>{name(d)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.vehicle}>
              {(id) => (
                <Select id={id} value={plan.vehicleId} onChange={(e) => setPlan({ ...plan, vehicleId: e.target.value })} className="rounded-lg">
                  <option value="">{t.delivery.assign.noVehicle}</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{`${v.name} · ${v.plate}`}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.note}>{(id) => <Input id={id} maxLength={500} value={plan.note} onChange={(e) => setPlan({ ...plan, note: e.target.value })} className="rounded-lg" />}</Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">{copy.pick}</legend>
            {shipments.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.noRoutable}</p>
            ) : (
              <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant" data-testid="route-candidates">
                {shipments.map((s) => (
                  <li key={s.id}>
                    <label className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 accent-accent" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} aria-label={s.number} />
                      <span className="font-mono text-xs font-semibold" dir="ltr">{s.number}</span>
                      <ShipmentStatusPill status={s.status} />
                      <span>{s.recipient}</span>
                      <span className="text-xs text-ink-muted">{[s.area, locale === "ar" ? s.zone_ar : s.zone_en].filter(Boolean).join(" · ")}</span>
                      <span className="ms-auto text-xs text-ink-muted">{s.slot ? `${formatDate(s.slot.date, locale)} ${s.slot.start}–${s.slot.end}` : formatDate(s.promised_by, locale, "time")}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
          {picked.length > 0 && (
            <ol className="space-y-1 text-sm" data-testid="route-order">
              {picked.map((id, index) => (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-6 text-end tabular-nums text-ink-muted">{index + 1}.</span>
                  <span className="font-mono text-xs" dir="ltr">{byId.get(id)?.number}</span>
                  <span>{byId.get(id)?.recipient}</span>
                  <button type="button" disabled={index === 0} aria-label={formatMessage(copy.up, { number: byId.get(id)?.number ?? "" })} onClick={() => shift(index, -1)} className="p-1 rounded text-ink-muted disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={index === picked.length - 1} aria-label={formatMessage(copy.down, { number: byId.get(id)?.number ?? "" })} onClick={() => shift(index, 1)} className="p-1 rounded text-ink-muted disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ol>
          )}
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !picked.length || !plan.driverId} onClick={() => void create()} data-testid="route-create">{copy.create}</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setPlanning(false)}>{copy.cancel}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        {sheets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Route className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant" data-testid="route-sheets">
            {sheets.map((r) => (
              <li key={r.id}>
                <Link href={ROUTES.delivery.route(r.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold" dir="ltr">{r.number}</span>
                  <span>{formatDate(r.date, locale)}</span>
                  <span className="font-medium">{locale === "ar" ? r.driver_ar : r.driver_en}</span>
                  {r.vehicle && <span className="font-mono text-xs text-ink-muted" dir="ltr">{r.vehicle}</span>}
                  <span className="text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[r.status]}</span>
                  <span className="ms-auto text-xs text-ink-muted">{formatMessage(copy.stops, { delivered: r.delivered, count: r.stops })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
