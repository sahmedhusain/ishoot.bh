"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button, Card, Input, Select, formatCurrencyValue } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { ROUTES } from "../../constants/routes";
import { awardRfqAction, cancelRfqAction, saveRfqQuotesAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { StatusPill } from "./StatusPill";

interface Rfq {
  id: string;
  number: string;
  title: string;
  status: string;
  requisition: { id: string; number: string } | null;
  lines: { id: string; description: string; quantity: number }[];
  suppliers: { id: string; name: string }[];
  quotes: { id: string; line_id: string; supplier_id: string; unit_price: number; lead_time_days: number | null; selected: boolean }[];
  orders: { id: string; number: string; status: string }[];
}

/** One request for quotation: each supplier's prices side by side, the best marked, and the chosen ones ordered. */
export function RfqView({ rfq, suppliers, currency, canEdit, canOrder }: { rfq: Rfq; suppliers: { id: string; name: string }[]; currency: string; canEdit: boolean; canOrder: boolean }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.rfqs;
  const router = useRouter();
  const open = rfq.status === "open";
  const quote = (lineId: string, supplierId: string) => rfq.quotes.find((q) => q.line_id === lineId && q.supplier_id === supplierId);
  const best = (lineId: string) => {
    const prices = rfq.quotes.filter((q) => q.line_id === lineId);
    return prices.length ? prices.reduce((a, b) => (b.unit_price < a.unit_price ? b : a)) : null;
  };
  // A line's choice is what the person picked, else the awarded price, else the cheapest one (as prices arrive).
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const choice = (lineId: string) => {
    const own = picked[lineId];
    if (own && rfq.quotes.some((q) => q.id === own)) return own;
    return rfq.quotes.find((q) => q.line_id === lineId && q.selected)?.id ?? best(lineId)?.id ?? "";
  };
  const [entry, setEntry] = React.useState<{ supplierId: string; prices: Record<string, { unitPrice: string; leadTimeDays: string }> } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const money = (value: number) => formatCurrencyValue(value, currency, locale === "ar");

  const run = async (task: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (done) setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  const startEntry = (supplierId: string) =>
    setEntry({ supplierId, prices: Object.fromEntries(rfq.lines.map((l) => { const q = quote(l.id, supplierId); return [l.id, { unitPrice: q ? String(q.unit_price) : "", leadTimeDays: q?.lead_time_days?.toString() ?? "" }]; })) });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <Link href={ROUTES.procurement.rfqs} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.title}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink flex flex-wrap items-center gap-3">
            <span dir="ltr">{rfq.number}</span>
            <StatusPill status={rfq.status} />
          </h1>
          <p className="text-xs text-ink-muted mt-1"><bdi dir="auto">{rfq.title}</bdi>{rfq.requisition && <> · <Link href={ROUTES.procurement.requisition(rfq.requisition.id)} className="hover:text-accent" dir="ltr">{rfq.requisition.number}</Link></>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {open && canEdit && !entry && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => suppliers[0] && startEntry(suppliers[0].id)} disabled={!suppliers.length} data-testid="rfq-add-quote">
              <Plus className="w-3.5 h-3.5" />
              {copy.addQuote}
            </Button>
          )}
          {open && canEdit && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => confirmAction({ description: t.procurement.common.cancelConfirm, onConfirm: () => run(() => cancelRfqAction(rfq.id)) })}>{t.procurement.common.cancel}</Button>
          )}
        </div>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      {entry && (
        <Card className="p-5 space-y-4" data-testid="rfq-quote-entry">
          <Field label={copy.supplier}>
            {(id) => (
              <Select id={id} value={entry.supplierId} onChange={(e) => startEntry(e.target.value)} className="rounded-lg sm:w-80">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </Field>
          <div className="space-y-2">
            {rfq.lines.map((l) => (
              <div key={l.id} className="grid grid-cols-2 sm:grid-cols-[1fr_9rem_7rem] gap-2 items-center">
                <span className="col-span-2 sm:col-span-1 text-sm text-ink">{`${l.description} × ${l.quantity}`}</span>
                <Input aria-label={`${t.procurement.lines.unitPrice} · ${l.description}`} placeholder={t.procurement.lines.unitPrice} type="number" min={0} step="0.001" value={entry.prices[l.id]?.unitPrice ?? ""} onChange={(e) => setEntry({ ...entry, prices: { ...entry.prices, [l.id]: { ...entry.prices[l.id], unitPrice: e.target.value } } })} className="h-9 rounded-lg" />
                <Input aria-label={`${copy.leadTime} · ${l.description}`} placeholder={copy.leadTime} type="number" min={0} max={365} value={entry.prices[l.id]?.leadTimeDays ?? ""} onChange={(e) => setEntry({ ...entry, prices: { ...entry.prices, [l.id]: { ...entry.prices[l.id], leadTimeDays: e.target.value } } })} className="h-9 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => run(async () => { await saveRfqQuotesAction(rfq.id, entry.supplierId, rfq.lines.map((l) => ({ lineId: l.id, unitPrice: entry.prices[l.id]?.unitPrice ?? "", leadTimeDays: entry.prices[l.id]?.leadTimeDays ?? "" }))); setEntry(null); })} data-testid="rfq-quote-save">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t.procurement.common.save}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setEntry(null)}>{t.procurement.common.cancel}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden" data-page-section>
        <h2 className="px-4 pt-4 font-bold text-ink">{copy.compare}</h2>
        {rfq.suppliers.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">{copy.noQuotes}</p>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm" data-testid="rfq-compare">
              <thead className="text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">{t.procurement.lines.description}</th>
                  {rfq.suppliers.map((s) => (
                    <th key={s.id} scope="col" className="px-3 py-2 text-end font-semibold">
                      {open && canEdit ? <button type="button" className="hover:text-accent underline-offset-2 hover:underline" onClick={() => startEntry(s.id)}>{s.name}</button> : s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rfq.lines.map((l) => {
                  const cheapest = best(l.id);
                  return (
                    <tr key={l.id}>
                      <th scope="row" className="px-3 py-2 text-start font-medium">{`${l.description} × ${l.quantity}`}</th>
                      {rfq.suppliers.map((s) => {
                        const q = quote(l.id, s.id);
                        return (
                          <td key={s.id} className={`px-3 py-2 text-end ${q && cheapest?.id === q.id ? "bg-emerald-500/[0.07]" : ""}`}>
                            {q ? (
                              <label className="inline-flex items-center gap-2 justify-end">
                                <span className="tabular-nums">
                                  {money(q.unit_price)}
                                  {q.lead_time_days != null && <span className="block text-[11px] text-ink-muted">{`${copy.leadTime}: ${q.lead_time_days}`}</span>}
                                  {cheapest?.id === q.id && <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{copy.best}</span>}
                                </span>
                                {open && canOrder && <input type="radio" name={`line-${l.id}`} aria-label={formatMessage(copy.choose, { line: l.description, supplier: s.name })} className="h-4 w-4 accent-accent" checked={choice(l.id) === q.id} onChange={() => setPicked((c) => ({ ...c, [l.id]: q.id }))} />}
                              </label>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {open && canOrder && rfq.quotes.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-4 py-3">
            <p className="text-xs text-ink-muted">{copy.awardHint}</p>
            <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={() => run(() => awardRfqAction(rfq.id, rfq.lines.map((l) => choice(l.id)).filter(Boolean)), copy.awarded)} data-testid="rfq-award">{copy.award}</Button>
          </div>
        )}
      </Card>

      {rfq.orders.length > 0 && (
        <Card className="p-5 space-y-2">
          {rfq.orders.map((o) => (
            <Link key={o.id} href={ROUTES.procurement.order(o.id)} className="flex items-center gap-3 text-sm hover:text-accent"><span className="font-mono text-xs" dir="ltr">{o.number}</span><StatusPill status={o.status} /></Link>
          ))}
        </Card>
      )}
    </div>
  );
}
