"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, MapPin, Navigation, Phone, X } from "lucide-react";
import { Button, Card, Input, Select, formatCurrencyValue } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { FAILURE_REASONS } from "@platform/database/constants/delivery";
import type { DriverStop } from "@platform/database";
import { completeDeliveryAction, moveShipmentAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { uploadForClaim } from "../../lib/upload-client";
import { SignatureCanvas } from "../shared/SignatureCanvas";
import { ShipmentStatusPill } from "./ShipmentPills";

/** A driver's stops: call, navigate, set off, and record each delivery with proof (or why it failed). */
export function DriverView({ stops, linked }: { stops: DriverStop[]; linked: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.delivery.driverView;
  return (
    <div className="space-y-4 max-w-xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
        <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 leading-relaxed">{copy.subtitle}</p>
      </div>
      {!linked ? (
        <Card className="p-6 text-sm text-ink-muted">{copy.notDriver}</Card>
      ) : stops.length === 0 ? (
        <Card className="p-6 text-center text-sm text-ink-muted">{copy.empty}</Card>
      ) : (
        <ol className="space-y-3" data-testid="driver-stops">
          {stops.map((stop) => <StopCard key={stop.id} stop={stop} />)}
        </ol>
      )}
    </div>
  );
}

function StopCard({ stop }: { stop: DriverStop }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.driverView;
  const router = useRouter();
  const [mode, setMode] = React.useState<"idle" | "deliver" | "fail">("idle");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [signature, setSignature] = React.useState<string | null>(null);
  const [collected, setCollected] = React.useState(String(stop.cod_amount));
  const [reason, setReason] = React.useState<string>(FAILURE_REASONS[0]);
  const address = [stop.address.line1, stop.address.line2, stop.address.area, stop.address.city, stop.address.country].filter(Boolean).join(", ");
  const money = (value: number) => formatCurrencyValue(value, stop.currency, locale === "ar");

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      setMode("idle");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const takePhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setPhotoUrl((await uploadForClaim(file, { entityType: "shipment", entityId: stop.id })).fileUrl);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li>
      <Card className="p-4 space-y-3" data-testid={`driver-stop-${stop.number}`}>
        <div className="flex flex-wrap items-center gap-2">
          {stop.stop != null && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">{formatMessage(copy.stop, { stop: stop.stop })}</span>}
          <span className="font-mono text-xs" dir="ltr">{stop.number}</span>
          <ShipmentStatusPill status={stop.status} />
          {stop.slot && <span className="ms-auto text-xs text-ink-muted" dir="ltr">{`${stop.slot.start}–${stop.slot.end}`}</span>}
        </div>
        <div>
          <p className="font-semibold text-ink">{stop.recipient}</p>
          <p className="flex items-start gap-1.5 text-sm text-ink-muted"><MapPin className="w-3.5 h-3.5 mt-1 shrink-0" aria-hidden="true" />{address}</p>
          <p className="text-xs text-ink-muted mt-1">{stop.items.map((i) => `${i.description} × ${i.quantity}`).join(", ")}</p>
          {stop.cod_amount > 0 && <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">{formatMessage(copy.collect, { amount: money(stop.cod_amount) })}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-variant h-10 text-sm font-medium"><Navigation className="w-4 h-4" aria-hidden="true" />{copy.navigate}</a>
          <a href={`tel:${stop.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-variant h-10 text-sm font-medium"><Phone className="w-4 h-4" aria-hidden="true" />{copy.call}</a>
        </div>
        {mode === "idle" && (
          <div className="grid grid-cols-2 gap-2">
            {stop.status !== "out_for_delivery" ? (
              <Button type="button" variant="primary" className="col-span-2 rounded-full h-11" disabled={busy} onClick={() => void run(() => moveShipmentAction(stop.id, { to: "out_for_delivery" }))} data-testid="driver-start">{copy.start}</Button>
            ) : (
              <>
                <Button type="button" variant="primary" className="rounded-full h-11 gap-1.5" onClick={() => setMode("deliver")} data-testid="driver-delivered"><Check className="w-4 h-4" />{copy.delivered}</Button>
                <Button type="button" variant="outline" className="rounded-full h-11 gap-1.5 text-rose-600" onClick={() => setMode("fail")} data-testid="driver-failed"><X className="w-4 h-4" />{copy.failed}</Button>
              </>
            )}
          </div>
        )}
        {mode === "deliver" && (
          <div className="space-y-3 rounded-xl bg-ink/[0.03] p-3">
            <label className={`flex items-center justify-center gap-2 rounded-full border h-11 text-sm font-medium cursor-pointer ${photoUrl ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : "border-outline-variant"}`}>
              <Camera className="w-4 h-4" aria-hidden="true" />
              {photoUrl ? copy.photoTaken : copy.photo}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" name="deliveryPhoto" onChange={(e) => void takePhoto(e.target.files?.[0])} />
            </label>
            <SignatureCanvas onChange={setSignature} clearLabel={copy.clear} hint={copy.signHere} />
            {stop.cod_amount > 0 && (
              <label className="block space-y-1 text-xs">
                <span className="font-medium text-ink">{copy.collected}</span>
                <Input type="number" min={0} step="0.001" name="driverCollected" value={collected} onChange={(e) => setCollected(e.target.value)} className="rounded-lg" />
              </label>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="primary" className="flex-1 rounded-full h-11" disabled={busy || (!photoUrl && !signature)} onClick={() => void run(() => completeDeliveryAction(stop.id, { photoUrl: photoUrl || undefined, signature: signature ?? undefined, codCollected: collected }))} data-testid="driver-confirm">{copy.confirm}</Button>
              <Button type="button" variant="ghost" className="rounded-full h-11" onClick={() => setMode("idle")}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {mode === "fail" && (
          <div className="space-y-3 rounded-xl bg-ink/[0.03] p-3">
            <label className="block space-y-1 text-xs">
              <span className="font-medium text-ink">{copy.reason}</span>
              <Select name="driverReason" value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg">
                {FAILURE_REASONS.map((r) => <option key={r} value={r}>{t.delivery.reasons[r]}</option>)}
              </Select>
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="primary" className="flex-1 rounded-full h-11" disabled={busy} onClick={() => void run(() => moveShipmentAction(stop.id, { to: "failed", reason }))} data-testid="driver-fail-save">{copy.saveFailed}</Button>
              <Button type="button" variant="ghost" className="rounded-full h-11" onClick={() => setMode("idle")}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      </Card>
    </li>
  );
}
