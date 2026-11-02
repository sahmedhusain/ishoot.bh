"use client";

import * as React from "react";
import { Package, Plus, Receipt } from "lucide-react";
import { Button, Card, Input, PhoneInput, Select, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { COURIER_KINDS } from "@platform/database/constants/delivery";
import type { CourierAgencyInput, CourierAgencyRecord, listAgencyInvoices, unbilledAgencyShipments } from "@platform/database";
import { recordAgencyInvoiceAction, saveCourierAgencyAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { ShipmentStatusPill } from "./ShipmentPills";
import { PageHeader } from "../layout/PageHeader";

type Unbilled = Awaited<ReturnType<typeof unbilledAgencyShipments>>;
type Invoice = Awaited<ReturnType<typeof listAgencyInvoices>>[number];

/** Delivery → courier agencies: who carries for you, and their invoices recorded as delivery expenses. */
export function AgenciesView({ agencies, unbilled, invoices, currency, canInvoice }: { agencies: CourierAgencyRecord[]; unbilled: Record<string, Unbilled>; invoices: Invoice[]; currency: string; canInvoice: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.agencies;
  const [draft, setDraft] = React.useState<CourierAgencyInput | null>(null);
  const [billing, setBilling] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const money = (value: number) => formatCurrencyValue(value, currency, locale === "ar");
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: copy.saved });
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
      <PageHeader
        actions={!draft && (
          <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setDraft({ name: "", kind: "manual", trackingUrl: "", phone: "", email: "", fee: "", isActive: true })}>
            <Plus className="w-4 h-4" />
            {copy.add}
          </Button>
        )}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      {draft && (
        <Card className="p-5 grid sm:grid-cols-2 gap-4" data-testid="agency-editor">
          <Field label={copy.name}>{(id) => <Input id={id} name="agencyName" maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.kind}>
            {(id) => (
              <Select id={id} name="agencyKind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} className="rounded-lg">
                {COURIER_KINDS.map((k) => <option key={k} value={k}>{copy.kinds[k]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.trackingUrl} hint={copy.trackingUrlHint} wide>{(id) => <Input id={id} name="agencyTrackingUrl" dir="ltr" maxLength={300} value={draft.trackingUrl} onChange={(e) => setDraft({ ...draft, trackingUrl: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.phone}>{(id) => <PhoneInput id={id} value={draft.phone} onChange={(phone) => setDraft({ ...draft, phone })} />}</Field>
          <Field label={copy.email}>{(id) => <Input id={id} type="email" dir="ltr" maxLength={254} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={formatMessage(copy.fee, { currency })}>{(id) => <Input id={id} name="agencyFee" type="number" min={0} step="any" value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} className="rounded-lg" />}</Field>
          <label className="flex items-center gap-2.5 text-sm text-ink sm:pt-6"><input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />{copy.active}</label>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveCourierAgencyAction(draft))) setDraft(null); }} data-testid="agency-save">{copy.save}</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
          </div>
        </Card>
      )}
      {agencies.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">{copy.empty}</Card>
      ) : (
        <ul className="space-y-3" data-testid="agencies-list">
          {agencies.map((a) => (
            <li key={a.id}>
              <Card className={`p-4 space-y-3 ${a.is_active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <Package className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span className="font-semibold text-ink"><bdi dir="auto">{a.name}</bdi></span>
                  <span className="text-xs text-ink-muted">{(copy.kinds as Record<string, string>)[a.kind]}</span>
                  {a.fee != null && <span className="text-xs text-ink-muted">{money(a.fee)}</span>}
                  <span className="text-xs text-ink-muted">{formatMessage(copy.shipments, { count: a.shipments })}</span>
                  {!a.is_active && <span className="text-xs text-ink-muted">{copy.inactive}</span>}
                  <span className="ms-auto flex gap-3">
                    {canInvoice && (unbilled[a.id]?.length ?? 0) > 0 && <button type="button" className="text-xs font-semibold text-primary dark:text-mint" onClick={() => setBilling(billing === a.id ? null : a.id)} data-testid="agency-invoice-open">{copy.invoice}</button>}
                    <button type="button" className="text-xs font-semibold text-primary dark:text-mint" onClick={() => setDraft({ id: a.id, name: a.name, kind: a.kind, trackingUrl: a.tracking_url, phone: a.phone, email: a.email, fee: a.fee?.toString() ?? "", isActive: a.is_active })}>{copy.edit}</button>
                  </span>
                </div>
                {billing === a.id && <InvoiceForm agencyId={a.id} shipments={unbilled[a.id] ?? []} currency={currency} busy={busy} onSave={(input) => run(() => recordAgencyInvoiceAction(input)).then((ok) => ok && setBilling(null))} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Card className="p-5 space-y-3" data-page-section>
        <h2 className="font-bold text-ink flex items-center gap-2"><Receipt className="w-4 h-4 text-accent" aria-hidden="true" />{copy.invoices}</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noInvoices}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm" data-testid="agency-invoices">
            {invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="font-semibold">{i.agency}</span>
                <span className="font-mono text-xs" dir="ltr"><bdi dir="ltr">{i.reference}</bdi></span>
                <span className="text-xs text-ink-muted">{formatDate(i.invoice_date, locale)}</span>
                <span className="text-xs text-ink-muted">{formatMessage(copy.shipments, { count: i.shipments })}</span>
                <span className="ms-auto font-semibold">{money(i.amount)}</span>
                {Math.abs(i.difference) > 0.0005 && i.expected > 0 && <span className="text-xs font-semibold text-amber-600">{copy.difference}: {money(i.difference)}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function InvoiceForm({ agencyId, shipments, currency, busy, onSave }: { agencyId: string; shipments: Unbilled; currency: string; busy: boolean; onSave: (input: { agencyId: string; reference: string; invoiceDate: string; amount: string; shipmentIds: string[] }) => void }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.agencies;
  const [picked, setPicked] = React.useState<string[]>(shipments.map((s) => s.id));
  const [form, setForm] = React.useState({ reference: "", invoiceDate: new Date().toISOString().slice(0, 10), amount: "" });
  const expected = Math.round(shipments.filter((s) => picked.includes(s.id)).reduce((sum, s) => sum + (s.fee ?? 0), 0) * 1000) / 1000;
  return (
    <div className="space-y-3 rounded-xl bg-ink/[0.03] p-3" data-testid="agency-invoice-form">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label={copy.invoiceReference}>{(id) => <Input id={id} name="invoiceReference" dir="ltr" maxLength={60} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-lg" />}</Field>
        <Field label={copy.invoiceDate}>{(id) => <Input id={id} type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} className="rounded-lg" />}</Field>
        <Field label={formatMessage(copy.invoiceAmount, { currency })} hint={expected > 0 ? formatMessage(copy.invoiceExpected, { amount: formatCurrencyValue(expected, currency, locale === "ar") }) : undefined}>{(id) => <Input id={id} name="invoiceAmount" type="number" min={0} step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg" />}</Field>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-ink">{copy.invoiceShipments}</legend>
        {shipments.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs">
            <input type="checkbox" className="h-3.5 w-3.5 accent-accent" checked={picked.includes(s.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, s.id] : picked.filter((x) => x !== s.id))} />
            <span className="font-mono" dir="ltr">{s.number} · {s.tracking_number}</span>
            <ShipmentStatusPill status={s.status} />
          </label>
        ))}
      </fieldset>
      <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !picked.length} onClick={() => onSave({ agencyId, ...form, shipmentIds: picked })} data-testid="agency-invoice-save">{copy.invoiceSave}</Button>
    </div>
  );
}
