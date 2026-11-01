"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Loader2, MapPin, Phone } from "lucide-react";
import { Button, Card, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { UNRESOLVED_COURIER_BOOKINGS, measuredCourierParcel, FAILURE_REASONS, SHIPMENT_TRANSITIONS, type ShipmentStatus } from "@platform/database/constants/delivery";
import type { CourierAgencyRecord, DriverOption, ShipmentRecord, VehicleRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { assignShipmentAction, handToAgencyAction, moveShipmentAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { LatePill, ShipmentStatusPill } from "./ShipmentPills";
import { PageHeader } from "../layout/PageHeader";

/** One shipment: where and when, what is in it, moving it along (with a reason when it fails) and its history. */
export function ShipmentView({ shipment, trackingLink, canEdit, canAssign, drivers, vehicles, agencies, currency }: { shipment: ShipmentRecord; trackingLink: string; canEdit: boolean; canAssign: boolean; drivers: DriverOption[]; vehicles: VehicleRecord[]; agencies: CourierAgencyRecord[]; currency: string }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.detail;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [failing, setFailing] = React.useState(false);
  const [reason, setReason] = React.useState<string>(FAILURE_REASONS[0]);
  const [note, setNote] = React.useState("");
  const [collected, setCollected] = React.useState(String(shipment.cod_amount));
  const [assignee, setAssignee] = React.useState({ driverId: shipment.driver_id, vehicleId: shipment.vehicle_id });
  const bookingBlocked = UNRESOLVED_COURIER_BOOKINGS.some(status => status === shipment.courier_booking);
  const dispatchable = ["pending", "assigned", "failed"].includes(shipment.status);
  const handoverAllowed = (dispatchable || (bookingBlocked && !!shipment.courier_booking_agency)) && shipment.courier_booking !== "pending";
  const assignable = dispatchable && !bookingBlocked;
  const driverName = (d: DriverOption) => (locale === "ar" ? d.name_ar : d.name_en);
  const [handover, setHandover] = React.useState({ agencyId: shipment.courier_booking_agency?.id ?? shipment.agency?.id ?? agencies[0]?.id ?? "", trackingNumber: "", fee: "", weightKg: "", lengthCm: "", widthCm: "", heightCm: "" });
  const money = (value: number) => formatCurrencyValue(value, shipment.order.currency, locale === "ar");
  const next = bookingBlocked ? [] : SHIPMENT_TRANSITIONS[shipment.status as ShipmentStatus] ?? [];
  const selectedAgency = agencies.find(agency => agency.id === handover.agencyId);
  const automaticBooking = dispatchable && !!selectedAgency && selectedAgency.kind !== "manual" && !handover.trackingNumber.trim();
  const pending = React.useRef(false);
  const address = shipment.address;
  const addressText = [address.line1, address.line2, address.area, address.city, address.country, address.postalCode].filter(Boolean).join(", ");

  const run = async (task: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true);
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
      pending.current = false; setBusy(false); router.refresh();
    }
  };
  const handoverToAgency = (retry = false) => {
    if (automaticBooking && !measuredCourierParcel(handover, selectedAgency?.kind === "dhl_express")) {
      setMessage({ tone: "error", text: t.serverErrors.messages.courierParcelRequired }); return;
    }
    confirmAction({
      title: retry ? t.delivery.handover.retryTitle : t.delivery.handover.confirmTitle,
      description: formatMessage(retry ? t.delivery.handover.retryBody : t.delivery.handover.confirmBody, { number: shipment.number }),
      confirmMatchText: retry || bookingBlocked || shipment.agency?.tracking_number ? shipment.number : undefined,
      onConfirm: async () => {
        let warning = "";
        const ok = await run(async () => {
          const result = await handToAgencyAction(shipment.id, { ...handover, ...(retry ? { confirmNoBooking: shipment.number } : {}) });
          warning = result.needsAttention ? t.delivery.handover.needsReview : result.labelUnavailable ? t.delivery.handover.labelUnavailable : "";
        });
        if (!ok) throw new Error();
        if (warning) setMessage({ tone: "error", text: warning });
      },
    });
  };
  const move = async (
    to: string,
    extra: { reason?: string; codCollected?: number } = {},
  ) => {
    const confirm = (copy.moveConfirm as Record<string, string>)[to];
    const apply = async () => {
      if (
        await run(() => moveShipmentAction(shipment.id, { to, note, ...extra }))
      ) {
        setFailing(false);
        setNote("");
      }
    };
    if (confirm) confirmAction({ description: confirm, onConfirm: apply });
    else await apply();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title={<><span dir="ltr" className="break-all">{shipment.number}</span><ShipmentStatusPill status={shipment.status} />{shipment.late && <LatePill />}</>}
        description={<><Link href={ROUTES.orders.detail(shipment.order.id)} className="hover:text-accent">{formatMessage(copy.order, { number: shipment.order.number })}</Link>
            {" · "}
            {(t.delivery.methods as Record<string, string>)[shipment.method]}
            {" · "}
            {formatMessage(copy.attempts, { count: shipment.attempts })}</>}
        back={{ href: ROUTES.delivery.shipments, label: copy.back }}
        actions={canEdit && next.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {next.map((to) => (
              <Button key={to} type="button" size="sm" variant={to === "cancelled" || to === "returned" || to === "failed" ? "ghost" : "primary"} className={`rounded-full ${to === "failed" || to === "cancelled" ? "text-rose-600" : ""}`} disabled={busy} onClick={() => (to === "failed" ? setFailing(true) : void move(to, to === "delivered" ? { codCollected: Number(collected) || 0 } : {}))} data-testid={`shipment-move-${to}`}>
                {(copy.moveTo as Record<string, string>)[to]}
              </Button>
            ))}
            {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
          </div>
        )}
      />
      {bookingBlocked && <div role="status" data-testid="courier-booking-warning" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">{shipment.courier_booking === "pending" ? t.delivery.handover.bookingPending : shipment.courier_booking === "review" ? t.delivery.handover.needsReview : t.delivery.handover.bookingUncertain}{shipment.courier_booking_agency && <span className="ms-1 font-semibold"><bdi dir="auto">{shipment.courier_booking_agency.name}</bdi></span>}</div>}
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      {canEdit && (failing || (next.includes("delivered") && shipment.cod_amount > 0)) && (
        <Card className="p-5 grid sm:grid-cols-3 gap-3 items-end" data-testid="shipment-outcome">
          {failing ? (
            <>
              <Field label={copy.reason}>
                {(id) => (
                  <Select id={id} name="failureReason" value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg">
                    {FAILURE_REASONS.map((r) => <option key={r} value={r}>{t.delivery.reasons[r]}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={copy.note}>{(id) => <Input id={id} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />}</Field>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void move("failed", { reason })} data-testid="shipment-fail-save">{copy.moveTo.failed}</Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setFailing(false)}>{t.delivery.settings.cancel}</Button>
              </div>
            </>
          ) : (
            <Field label={copy.codCollected}>{(id) => <Input id={id} name="codCollected" type="number" min={0} step="any" value={collected} onChange={(e) => setCollected(e.target.value)} className="rounded-lg" />}</Field>
          )}
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-2 text-sm" data-page-section>
          <h2 className="font-bold text-ink">{copy.recipient}</h2>
          <p className="font-semibold text-ink">{shipment.recipient}</p>
          {shipment.phone && <a href={`tel:${shipment.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-ink-muted hover:text-accent" dir="ltr"><Phone className="w-3.5 h-3.5" aria-hidden="true" /><bdi dir="ltr">{shipment.phone}</bdi></a>}
          <p className="flex items-start gap-1.5 text-ink-muted"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />{addressText}</p>
          {(shipment.zone_en || shipment.zone_ar) && <p className="text-xs text-ink-muted">{locale === "ar" ? shipment.zone_ar : shipment.zone_en}</p>}
        </Card>
        <Card className="p-5 space-y-2 text-sm" data-page-section>
          <h2 className="font-bold text-ink">{copy.slot}</h2>
          <p className="text-ink" data-testid="shipment-slot">{shipment.slot ? `${formatDate(shipment.slot.date, locale)} ${shipment.slot.start}–${shipment.slot.end}` : copy.noSlot}</p>
          <p className="text-xs text-ink-muted">{copy.promise}: {formatDate(shipment.promised_by, locale, "time")}</p>
          {shipment.cod_amount > 0 && <p className="text-sm"><span className="text-ink-muted">{copy.codToCollect}:</span> <span className="font-semibold">{money(shipment.cod_amount)}</span>{shipment.status === "delivered" && <span className="text-ink-muted"> · {copy.codCollected}: {money(shipment.cod_collected)}</span>}</p>}
          {shipment.failure_reason && <p className="text-xs text-rose-600">{(t.delivery.reasons as Record<string, string>)[shipment.failure_reason]}</p>}
        </Card>
      </div>

      {(canAssign || shipment.driver_id || shipment.route_sheet || shipment.proof_photo_url || shipment.proof_signature) && (
        <Card className="p-5 space-y-3" data-testid="shipment-driver" data-page-section>
          <h2 className="font-bold text-ink">{t.delivery.assign.title}</h2>
          {canAssign && assignable ? (
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <Field label={t.delivery.assign.driver}>
                {(id) => (
                  <Select id={id} name="driverId" value={assignee.driverId} onChange={(e) => setAssignee({ ...assignee, driverId: e.target.value })} className="rounded-lg">
                    <option value="">{t.delivery.assign.none}</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{driverName(d)}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t.delivery.assign.vehicle}>
                {(id) => (
                  <Select id={id} name="vehicleId" value={assignee.vehicleId} onChange={(e) => setAssignee({ ...assignee, vehicleId: e.target.value })} className="rounded-lg">
                    <option value="">{t.delivery.assign.noVehicle}</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{`${v.name} · ${v.plate}`}</option>)}
                  </Select>
                )}
              </Field>
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void run(() => assignShipmentAction(shipment.id, assignee))} data-testid="shipment-assign">{t.delivery.assign.save}</Button>
            </div>
          ) : (
            <p className="text-sm text-ink">{drivers.find((d) => d.id === shipment.driver_id) ? driverName(drivers.find((d) => d.id === shipment.driver_id)!) : shipment.driver_id ? "" : t.delivery.assign.none}</p>
          )}
          {shipment.route_sheet && <Link href={ROUTES.delivery.route(shipment.route_sheet.id)} className="text-xs text-ink-muted hover:text-accent">{formatMessage(t.delivery.assign.routeSheet, { number: shipment.route_sheet.number, stop: shipment.route_sheet.stop ?? "" })}</Link>}
          {shipment.cod_settlement && <p className="text-xs text-ink-muted">{formatMessage(t.delivery.assign.settled, { number: shipment.cod_settlement })}</p>}
          {(shipment.proof_photo_url || shipment.proof_signature) && (
            <div className="space-y-2" data-testid="shipment-proof">
              <h3 className="text-xs font-semibold text-ink">{t.delivery.assign.proof}</h3>
              <div className="flex flex-wrap gap-4">
                {shipment.proof_photo_url && (
                  <a href={shipment.proof_photo_url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a private file served by the owner-checked file route */}
                    <img src={shipment.proof_photo_url} alt={t.delivery.assign.photo} className="h-32 rounded-lg border border-outline-variant object-cover" />
                  </a>
                )}
                {shipment.proof_signature && (
                  // eslint-disable-next-line @next/next/no-img-element -- an inline PNG data URL
                  <img src={shipment.proof_signature} alt={t.delivery.assign.signature} className="h-32 rounded-lg border border-outline-variant bg-surface-raised" />
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {(shipment.agency || (canAssign && handoverAllowed && agencies.length > 0)) && (
        <Card className="p-5 space-y-3" data-testid="shipment-agency" data-page-section>
          <h2 className="font-bold text-ink">{t.delivery.handover.title}</h2>
          {shipment.agency && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold"><bdi dir="auto">{shipment.agency.name}</bdi></span>
              <span className="font-mono text-xs break-all" dir="ltr" data-testid="shipment-tracking-number">{shipment.agency.tracking_number}</span>
              {shipment.agency.tracking_link && <a href={shipment.agency.tracking_link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary dark:text-mint">{t.delivery.handover.track}</a>}
              {shipment.agency.label_url && <a href={shipment.agency.label_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary dark:text-mint">{t.delivery.handover.label}</a>}
              {shipment.agency.fee != null && <span className="text-xs text-ink-muted">{formatCurrencyValue(shipment.agency.fee, currency, locale === "ar")}</span>}
              {shipment.agency.invoice && <span className="text-xs text-ink-muted">{formatMessage(t.delivery.handover.invoiced, { reference: shipment.agency.invoice })}</span>}
            </div>
          )}
          {canAssign && handoverAllowed && agencies.length > 0 && (
            <div className="grid sm:grid-cols-4 gap-3 items-end">
              <Field label={t.delivery.handover.agency}>
                {(id) => (
                  <Select id={id} name="agencyId" value={handover.agencyId} onChange={(e) => setHandover({ ...handover, agencyId: e.target.value })} className="rounded-lg">
                    {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                )}
              </Field>
              <Field label={t.delivery.handover.trackingNumber} hint={agencies.find((a) => a.id === handover.agencyId)?.kind !== "manual" ? t.delivery.handover.trackingHint : undefined}>{(id) => <Input id={id} name="trackingNumber" dir="ltr" maxLength={60} value={handover.trackingNumber} onChange={(e) => setHandover({ ...handover, trackingNumber: e.target.value })} className="rounded-lg" />}</Field>
              <Field label={formatMessage(t.delivery.handover.fee, { currency })}>{(id) => <Input id={id} name="agencyFee" type="number" min={0} step="any" placeholder={agencies.find((a) => a.id === handover.agencyId)?.fee?.toString() ?? ""} value={handover.fee} onChange={(e) => setHandover({ ...handover, fee: e.target.value })} className="rounded-lg" />}</Field>
              {automaticBooking && <div className="sm:col-span-4 space-y-3"><p className="text-xs text-ink-muted">{t.delivery.handover.parcelHint}</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Field label={t.delivery.handover.weightKg}>{id => <Input id={id} name="weightKg" type="number" min="0.001" step="0.001" inputMode="decimal" placeholder={t.delivery.handover.weightPlaceholder} value={handover.weightKg} onChange={event => setHandover({ ...handover, weightKg: event.target.value })} required disabled={busy} />}</Field>{selectedAgency?.kind === "dhl_express" && (["lengthCm", "widthCm", "heightCm"] as const).map(key => <Field key={key} label={t.delivery.handover[key]}>{id => <Input id={id} name={key} type="number" min="0.1" step="0.1" inputMode="decimal" placeholder={t.delivery.handover.dimensionPlaceholder} value={handover[key]} onChange={event => setHandover({ ...handover, [key]: event.target.value })} required disabled={busy} />}</Field>)}</div></div>}
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !handover.agencyId || (bookingBlocked && !handover.trackingNumber.trim())} onClick={() => handoverToAgency()} data-testid="shipment-handover">{t.delivery.handover.save}</Button>
              {dispatchable && shipment.courier_booking === "unknown" && !handover.trackingNumber.trim() && <div className="sm:col-span-4 space-y-2"><p className="text-xs text-ink-muted">{t.delivery.handover.retryHint}</p><Button type="button" size="sm" variant="outline" disabled={busy || !shipment.courier_booking_retry_allowed} onClick={() => handoverToAgency(true)} data-testid="courier-booking-retry">{t.delivery.handover.retryTitle}</Button></div>}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy.items}</h2>
        <ul className="divide-y divide-outline-variant text-sm">
          {shipment.order.lines.map((l, index) => (
            <li key={index} className="flex justify-between gap-3 py-2"><span>{l.description} <span className="font-mono text-xs text-ink-muted" dir="ltr">{l.sku}</span></span><span className="tabular-nums">× {l.quantity}</span></li>
          ))}
        </ul>
      </Card>

      {trackingLink && (
        <Card className="p-5 space-y-2" data-page-section>
          <h2 className="font-bold text-ink">{copy.trackingLink}</h2>
          <div className="flex gap-2">
            <Input readOnly aria-label={copy.trackingLink} value={trackingLink} dir="ltr" className="rounded-lg font-mono text-xs" onFocus={(e) => e.currentTarget.select()} data-testid="shipment-tracking-link" />
            <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => void navigator.clipboard?.writeText(trackingLink).then(() => setMessage({ tone: "ok", text: copy.linkCopied }))}>
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              {copy.copyLink}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink">{copy.history}</h2>
        <ol className="space-y-2 text-sm" data-testid="shipment-history">
          {shipment.events.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3">
              <span className="text-xs text-ink-muted w-36">{formatDate(e.at, locale, "time")}</span>
              <span className="font-medium text-ink">{(t.delivery.statuses as Record<string, string>)[e.status] ?? e.status}</span>
              {e.reason && <span className="text-rose-600">{(t.delivery.reasons as Record<string, string>)[e.reason] ?? e.reason}</span>}
              {e.note && <span className="text-ink-muted">{e.note}</span>}
              {e.by && <span className="text-xs text-ink-muted">{e.by}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
