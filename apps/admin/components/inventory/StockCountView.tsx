"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { StockCountLineRecord } from "@platform/database";
import { countVariance } from "@platform/database/constants/inventory";
import { ROUTES } from "../../constants/routes";
import { approveStockCountAction, saveCountedAction, scanCountItemAction, setStockCountStatusAction } from "../../app/actions/inventory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

interface StockCountViewProps {
  count: {
    id: string;
    number: string;
    warehouse_en: string;
    warehouse_ar: string;
    scope: string;
    status: string;
    note: string;
    created_by: string | null;
    approved_by: string | null;
    lines: StockCountLineRecord[];
  };
  locations: { id: string; code: string; name: string }[];
  canEdit: boolean;
  canApprove: boolean;
}

/** One stock count: scan or type counts, send for review, then approve the differences into stock. */
export function StockCountView({ count, locations, canEdit, canApprove }: StockCountViewProps) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.inventory.counts;
  const router = useRouter();
  const [counted, setCounted] = React.useState<Record<string, string>>(() => Object.fromEntries(count.lines.map((l) => [l.id, l.counted == null ? "" : String(l.counted)])));
  const [dirty, setDirty] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [scanLocation, setScanLocation] = React.useState(locations[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inputs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const open = count.status === "counting" && canEdit;

  // New lines (an item scanned that was not on the list) arrive with a refresh.
  React.useEffect(() => {
    setCounted((current) => ({ ...Object.fromEntries(count.lines.map((l) => [l.id, l.counted == null ? "" : String(l.counted)])), ...current }));
  }, [count.lines]);

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
  const saveCounts = () => saveCountedAction(count.id, count.lines.map((l) => ({ lineId: l.id, counted: counted[l.id] ?? "" }))).then(() => setDirty(false));

  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setMessage(null);
    try {
      if (dirty) await saveCounts();
      const result = await scanCountItemAction(count.id, code.trim(), scanLocation);
      if (!result.success) return setMessage({ tone: "error", text: copy.notFound });
      setCode("");
      const first = result.lineIds[0];
      if (inputs.current[first]) {
        inputs.current[first]?.focus();
        inputs.current[first]?.select();
      } else router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    }
  };

  const name = (l: StockCountLineRecord) => (locale === "ar" ? l.name_ar || l.name_en : l.name_en || l.name_ar);
  const done = count.lines.filter((l) => (counted[l.id] ?? "") !== "").length;
  const differences = count.lines.filter((l) => countVariance(l.expected, (counted[l.id] ?? "") === "" ? null : Number(counted[l.id])) !== 0).length;
  const statusName = (copy.statuses as Record<string, string>)[count.status] ?? count.status;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href={ROUTES.inventory.counts} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex flex-wrap items-center gap-3">
            <span dir="ltr">{count.number}</span>
            <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-medium text-ink" data-testid="count-status">{statusName}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            {[locale === "ar" ? count.warehouse_ar : count.warehouse_en, (copy.scopes as Record<string, string>)[count.scope], count.created_by && formatMessage(copy.createdBy, { name: count.created_by }), count.approved_by && formatMessage(copy.approvedBy, { name: count.approved_by })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {open && (
            <>
              <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy || !dirty} onClick={() => run(saveCounts, copy.saved)} data-testid="count-save">{copy.save}</Button>
              <Button type="button" variant="primary" size="sm" className="rounded-full" disabled={busy} onClick={() => run(async () => { if (dirty) await saveCounts(); await setStockCountStatusAction(count.id, "review"); })} data-testid="count-submit">{copy.submit}</Button>
            </>
          )}
          {count.status === "review" && canEdit && (
            <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={busy} onClick={() => run(() => setStockCountStatusAction(count.id, "counting"))}>{copy.reopen}</Button>
          )}
          {count.status === "review" && canApprove && (
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => confirmAction({ description: copy.approveConfirm, confirmMatchText: count.number, onConfirm: () => run(async () => { const result = await approveStockCountAction(count.id); setMessage({ tone: "ok", text: formatMessage(copy.approved, { count: result.adjusted }) }); }) })} data-testid="count-approve">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {copy.approve}
            </Button>
          )}
          {(count.status === "counting" || count.status === "review") && canEdit && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full text-rose-600" disabled={busy} onClick={() => confirmAction({ description: copy.cancelConfirm, onConfirm: () => run(() => setStockCountStatusAction(count.id, "cancelled")) })}>{copy.cancel}</Button>
          )}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>
      </div>

      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      {open && (
        <Card className="p-4">
          <form onSubmit={scan} className="grid sm:grid-cols-[2fr_1fr] gap-3 items-end">
            <Field label={copy.scan} hint={copy.scanHint}>
              {(id) => (
                <div className="relative">
                  <ScanLine className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" aria-hidden="true" />
                  <Input id={id} name="scan" dir="ltr" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="ps-9 rounded-lg font-mono" />
                </div>
              )}
            </Field>
            <Field label={copy.scanLocation}>
              {(id) => (
                <Select id={id} value={scanLocation} onChange={(e) => setScanLocation(e.target.value)} className="rounded-lg">
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name || l.code}</option>)}
                </Select>
              )}
            </Field>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <p className="px-4 py-3 text-xs text-ink-muted border-b border-ink/10" data-testid="count-summary">
          {formatMessage(copy.summary, { counted: done, lines: count.lines.length, differences })} · {copy.uncountedNote}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="count-lines">
            <thead className="bg-ink/[0.03] text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.lineColumns.item}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.lineColumns.location}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.lineColumns.expected}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.lineColumns.counted}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{copy.lineColumns.variance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {count.lines.map((l) => {
                const value = counted[l.id] ?? "";
                const variance = countVariance(l.expected, value === "" ? null : Number(value));
                const label = [name(l), l.variant_values.join(" / ")].filter(Boolean).join(" · ");
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5">
                      <span className="block font-medium text-ink">{label}</span>
                      <span className="block font-mono text-xs text-ink-muted" dir="ltr">{l.sku}{l.barcode ? ` · ${l.barcode}` : ""}{l.batch ? ` · ${l.batch}` : ""}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" dir="ltr">{l.location}</td>
                    <td className="px-4 py-2.5 text-end tabular-nums text-ink-muted">{l.expected}</td>
                    <td className="px-4 py-2.5 text-end">
                      {open ? (
                        <Input
                          ref={(el) => {
                            inputs.current[l.id] = el;
                          }}
                          aria-label={formatMessage(copy.countedFor, { name: label })}
                          type="number"
                          min={0}
                          step="0.001"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => {
                            setDirty(true);
                            setCounted((current) => ({ ...current, [l.id]: e.target.value }));
                          }}
                          className="h-9 w-24 ms-auto rounded-lg text-end"
                        />
                      ) : (
                        <span className="tabular-nums">{value === "" ? "—" : value}</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-end tabular-nums font-semibold ${variance < 0 ? "text-rose-600" : variance > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-ink-muted"}`} dir="ltr">
                      {value === "" ? "—" : variance > 0 ? `+${variance}` : variance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
