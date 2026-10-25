"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Coins } from "lucide-react";
import { Button, Card, Input, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { CashToSettle, listCodSettlements } from "@platform/database";
import { settleCashAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

type Settlement = Awaited<ReturnType<typeof listCodSettlements>>[number];

/** Delivery → cash from drivers: what each driver holds, recording the handover, and past handovers. */
export function CashSettlementView({ pending, history, currency, canSettle }: { pending: CashToSettle[]; history: Settlement[]; currency: string; canSettle: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.cash;
  const router = useRouter();
  const money = (value: number) => formatCurrencyValue(value, currency, locale === "ar");
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <section className="space-y-3">
        <h2 className="font-bold text-ink">{copy.toSettle}</h2>
        {pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-muted">{copy.nothing}</Card>
        ) : (
          pending.map((p) => <DriverCash key={p.driver_id} entry={p} money={money} currency={currency} canSettle={canSettle} onDone={(text) => { setMessage({ tone: "ok", text }); router.refresh(); }} onError={(text) => setMessage({ tone: "error", text })} />)
        )}
      </section>
      <Card className="p-5 space-y-3">
        <h2 className="font-bold text-ink">{copy.history}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noHistory}</p>
        ) : (
          <ul className="divide-y divide-ink/10 text-sm" data-testid="cash-history">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="font-mono text-xs font-semibold" dir="ltr">{h.number}</span>
                <span>{locale === "ar" ? h.driver_ar : h.driver_en}</span>
                <span className="text-xs text-ink-muted">{formatMessage(copy.shipments, { count: h.shipments })}</span>
                <span className="text-xs text-ink-muted">{copy.expected}: {money(h.expected)}</span>
                <span className="font-semibold">{money(h.received)}</span>
                {Math.abs(h.difference) > 0.0005 && <span className={`text-xs font-semibold ${h.difference < 0 ? "text-rose-600" : "text-amber-600"}`}>{copy.difference}: {money(h.difference)}</span>}
                <span className="ms-auto text-xs text-ink-muted">{formatDate(h.settled_at, locale, "time")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function DriverCash({ entry, money, currency, canSettle, onDone, onError }: { entry: CashToSettle; money: (v: number) => string; currency: string; canSettle: boolean; onDone: (text: string) => void; onError: (text: string) => void }) {
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.cash;
  const [received, setReceived] = React.useState(String(entry.total));
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const settle = async () => {
    setBusy(true);
    try {
      await settleCashAction({ driverId: entry.driver_id, shipmentIds: entry.shipments.map((s) => s.id), received, note });
      onDone(copy.saved);
    } catch (err) {
      onError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5 space-y-3" data-testid="cash-driver">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Coins className="w-4 h-4 text-accent" aria-hidden="true" />
        <span className="font-semibold text-ink">{locale === "ar" ? entry.name_ar : entry.name_en}</span>
        <span className="text-xs text-ink-muted">{formatMessage(copy.shipments, { count: entry.shipments.length })}</span>
        <span className="ms-auto text-lg font-bold">{money(entry.total)}</span>
      </div>
      <ul className="text-xs text-ink-muted space-y-0.5">
        {entry.shipments.map((s) => <li key={s.id} className="flex justify-between gap-3"><span dir="ltr">{s.number} · {s.order_number}</span><span>{money(s.amount)}</span></li>)}
      </ul>
      {canSettle && (
        <div className="grid sm:grid-cols-3 gap-3 items-end">
          <Field label={formatMessage(copy.received, { currency })}>{(id) => <Input id={id} name="cashReceived" type="number" min={0} step="0.001" value={received} onChange={(e) => setReceived(e.target.value)} className="rounded-lg" />}</Field>
          <Field label={copy.note}>{(id) => <Input id={id} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />}</Field>
          <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void settle()} data-testid="cash-settle">{copy.settle}</Button>
        </div>
      )}
    </Card>
  );
}
