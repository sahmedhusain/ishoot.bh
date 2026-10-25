"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2, MapPin, Phone } from "lucide-react";
import { Button, Card, Input, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { FAILURE_REASONS, SHIPMENT_TRANSITIONS, type ShipmentStatus } from "@platform/database/constants/delivery";
import type { ShipmentRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { moveShipmentAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { LatePill, ShipmentStatusPill } from "./ShipmentPills";

/** One shipment: where and when, what is in it, moving it along (with a reason when it fails) and its history. */
export function ShipmentView({ shipment, trackingLink, canEdit }: { shipment: ShipmentRecord; trackingLink: string; canEdit: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.detail;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [failing, setFailing] = React.useState(false);
  const [reason, setReason] = React.useState<string>(FAILURE_REASONS[0]);
  const [note, setNote] = React.useState("");
  const [collected, setCollected] = React.useState(String(shipment.cod_amount));
  const money = (value: number) => formatCurrencyValue(value, shipment.order.currency, locale === "ar");
  const next = SHIPMENT_TRANSITIONS[shipment.status as ShipmentStatus] ?? [];
  const address = shipment.address;
  const addressText = [address.line1, address.line2, address.area, address.city, address.country, address.postalCode].filter(Boolean).join(", ");

  const move = async (to: string, extra: { reason?: string; codCollected?: number } = {}) => {
    const confirm = (copy.moveConfirm as Record<string, string>)[to];
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setMessage(null);
    try {
      await moveShipmentAction(shipment.id, { to, note, ...extra });
      setMessage({ tone: "ok", text: copy.saved });
      setFailing(false);
      setNote("");
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href={ROUTES.delivery.shipments} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
            <span dir="ltr">{shipment.number}</span>
            <ShipmentStatusPill status={shipment.status} />
            {shipment.late && <LatePill />}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            <Link href={ROUTES.orders.detail(shipment.order.id)} className="hover:text-accent">{formatMessage(copy.order, { number: shipment.order.number })}</Link>
            {" · "}
            {(t.delivery.methods as Record<string, string>)[shipment.method]}
            {" · "}
            {formatMessage(copy.attempts, { count: shipment.attempts })}
          </p>
        </div>
        {canEdit && next.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {next.map((to) => (
              <Button key={to} type="button" size="sm" variant={to === "cancelled" || to === "returned" || to === "failed" ? "ghost" : "primary"} className={`rounded-full ${to === "failed" || to === "cancelled" ? "text-rose-600" : ""}`} disabled={busy} onClick={() => (to === "failed" ? setFailing(true) : void move(to, to === "delivered" ? { codCollected: Number(collected) || 0 } : {}))} data-testid={`shipment-move-${to}`}>
                {(copy.moveTo as Record<string, string>)[to]}
              </Button>
            ))}
            {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
          </div>
        )}
      </div>
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
            <Field label={copy.codCollected}>{(id) => <Input id={id} name="codCollected" type="number" min={0} step="0.001" value={collected} onChange={(e) => setCollected(e.target.value)} className="rounded-lg" />}</Field>
          )}
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-2 text-sm">
          <h2 className="font-bold text-ink">{copy.recipient}</h2>
          <p className="font-semibold text-ink">{shipment.recipient}</p>
          {shipment.phone && <a href={`tel:${shipment.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-ink-muted hover:text-accent" dir="ltr"><Phone className="w-3.5 h-3.5" aria-hidden="true" />{shipment.phone}</a>}
          <p className="flex items-start gap-1.5 text-ink-muted"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />{addressText}</p>
          {(shipment.zone_en || shipment.zone_ar) && <p className="text-xs text-ink-muted">{locale === "ar" ? shipment.zone_ar : shipment.zone_en}</p>}
        </Card>
        <Card className="p-5 space-y-2 text-sm">
          <h2 className="font-bold text-ink">{copy.slot}</h2>
          <p className="text-ink" data-testid="shipment-slot">{shipment.slot ? `${formatDate(shipment.slot.date, locale)} ${shipment.slot.start}–${shipment.slot.end}` : copy.noSlot}</p>
          <p className="text-xs text-ink-muted">{copy.promise}: {formatDate(shipment.promised_by, locale, "time")}</p>
          {shipment.cod_amount > 0 && <p className="text-sm"><span className="text-ink-muted">{copy.codToCollect}:</span> <span className="font-semibold">{money(shipment.cod_amount)}</span>{shipment.status === "delivered" && <span className="text-ink-muted"> · {copy.codCollected}: {money(shipment.cod_collected)}</span>}</p>}
          {shipment.failure_reason && <p className="text-xs text-rose-600">{(t.delivery.reasons as Record<string, string>)[shipment.failure_reason]}</p>}
        </Card>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold text-ink">{copy.items}</h2>
        <ul className="divide-y divide-ink/10 text-sm">
          {shipment.order.lines.map((l, index) => (
            <li key={index} className="flex justify-between gap-3 py-2"><span>{l.description} <span className="font-mono text-xs text-ink-muted" dir="ltr">{l.sku}</span></span><span className="tabular-nums">× {l.quantity}</span></li>
          ))}
        </ul>
      </Card>

      {trackingLink && (
        <Card className="p-5 space-y-2">
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

      <Card className="p-5 space-y-3">
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
