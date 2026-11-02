"use client";

import * as React from "react";
import { Loader2, PackageCheck } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { PurchaseOrderRecord } from "@platform/database";
import { REJECT_REASONS } from "@platform/database/constants/procurement";
import { receiveGoodsAction } from "../../app/actions/procurement";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

const round3 = (value: number) => Math.round(value * 1000) / 1000;

/** On a purchase order: what arrived (accepted into stock or rejected with a reason), line by line. */
export function ReceiveGoodsPanel({ order, locations, batchProducts }: { order: PurchaseOrderRecord; locations: { id: string; label: string }[]; batchProducts: string[] }) {
  const { t } = useAdminLocale();
  const copy = t.procurement.receive;
  const open = order.lines.map((l) => ({ ...l, remaining: round3(l.quantity - l.received - l.rejected) })).filter((l) => l.remaining > 0);
  const [locationId, setLocationId] = React.useState(locations[0]?.id ?? "");
  const [note, setNote] = React.useState("");
  const [entries, setEntries] = React.useState<Record<string, { quantity: string; rejectedQuantity: string; rejectReason: string; batchNumber: string; expiryDate: string }>>(() => Object.fromEntries(open.map((l) => [l.id, { quantity: String(l.remaining), rejectedQuantity: "", rejectReason: "damaged", batchNumber: "", expiryDate: "" }])));
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  if (!open.length) return <p className="text-sm text-ink-muted">{copy.nothingLeft}</p>;
  const set = (id: string, patch: Partial<(typeof entries)[string]>) => setEntries((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await receiveGoodsAction(order.id, { locationId, note, lines: open.map((l) => ({ orderLineId: l.id, ...entries[l.id] })) });
      setMessage({ tone: "ok", text: formatMessage(copy.saved, { number: result.number }) });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5 space-y-4" data-testid="receive-goods" data-page-section>
      <h2 className="font-bold text-ink flex items-center gap-2"><PackageCheck className="w-4 h-4 text-accent" aria-hidden="true" />{copy.title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={copy.location}>
          {(id) => (
            <Select id={id} value={locationId} onChange={(e) => setLocationId(e.target.value)} className="rounded-lg">
              {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label={copy.note}>
          {(id) => <Input id={id} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg" />}
        </Field>
      </div>
      <div className="space-y-2">
        {open.map((l) => {
          const entry = entries[l.id];
          const batch = !!l.product_id && batchProducts.includes(l.product_id);
          return (
            <div key={l.id} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center rounded-xl border border-outline-variant p-3">
              <span className="col-span-2 sm:col-span-4 text-sm text-ink">
                {l.description}
                <span className="block text-xs text-ink-muted">{`${copy.remaining}: ${l.remaining}`}</span>
              </span>
              <Input aria-label={formatMessage(copy.acceptedFor, { name: l.description })} placeholder={copy.accepted} type="number" min={0} step="0.001" value={entry.quantity} onChange={(e) => set(l.id, { quantity: e.target.value })} className="sm:col-span-2 h-9 rounded-lg" />
              <Input aria-label={formatMessage(copy.rejectedFor, { name: l.description })} placeholder={copy.rejected} type="number" min={0} step="0.001" value={entry.rejectedQuantity} onChange={(e) => set(l.id, { rejectedQuantity: e.target.value })} className="sm:col-span-2 h-9 rounded-lg" />
              {Number(entry.rejectedQuantity) > 0 ? (
                <Select aria-label={copy.reason} value={entry.rejectReason} onChange={(e) => set(l.id, { rejectReason: e.target.value })} className="sm:col-span-2 h-9 rounded-lg text-xs">
                  {REJECT_REASONS.map((r) => <option key={r} value={r}>{copy.reasons[r]}</option>)}
                </Select>
              ) : (
                <span className="hidden sm:block sm:col-span-2" />
              )}
              {batch && (
                <>
                  <Input aria-label={`${copy.batch} · ${l.description}`} placeholder={copy.batch} dir="ltr" maxLength={60} value={entry.batchNumber} onChange={(e) => set(l.id, { batchNumber: e.target.value })} className="sm:col-span-1 h-9 rounded-lg font-mono text-xs" />
                  <Input aria-label={`${copy.expiry} · ${l.description}`} type="date" value={entry.expiryDate} onChange={(e) => set(l.id, { expiryDate: e.target.value })} className="sm:col-span-1 h-9 rounded-lg text-xs" />
                </>
              )}
            </div>
          );
        })}
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy || !locationId} onClick={save} data-testid="receive-save">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {copy.save}
      </Button>
    </Card>
  );
}
