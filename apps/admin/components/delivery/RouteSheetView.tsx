"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button, Card, formatCurrencyValue, formatDate } from "@platform/ui";
import type { RouteSheetRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { closeRouteSheetAction, startRouteSheetAction } from "../../app/actions/delivery";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { ShipmentStatusPill } from "./ShipmentPills";

/** One route sheet: the stops in order, ready to print, and sending the driver out or closing the run. */
export function RouteSheetView({ sheet }: { sheet: RouteSheetRecord }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.delivery.routes;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const run = async (task: () => Promise<unknown>, confirm?: string): Promise<void> => {
    if (confirm) return confirmAction({ description: confirm, onConfirm: () => run(task) });
    setBusy(true);
    setError("");
    try {
      await task();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };
  const total = sheet.stops.reduce((sum, s) => sum + s.cod_amount, 0);
  const currency = sheet.stops[0]?.currency ?? "";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 print:max-w-none print:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href={ROUTES.delivery.routes} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent print:hidden">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink flex flex-wrap items-center gap-3">
            <span dir="ltr">{sheet.number}</span>
            <span className="text-sm font-medium text-ink-muted" data-testid="route-status">{(copy.statuses as Record<string, string>)[sheet.status]}</span>
          </h1>
          <p className="text-sm text-ink mt-1">{[formatDate(sheet.date, locale), locale === "ar" ? sheet.driver.name_ar : sheet.driver.name_en, sheet.vehicle].filter(Boolean).join(" · ")}</p>
          {sheet.note && <p className="text-xs text-ink-muted mt-1">{sheet.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" />{copy.print}</Button>
          {sheet.status === "draft" && <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={() => void run(() => startRouteSheetAction(sheet.id), copy.startConfirm)} data-testid="route-start">{copy.start}</Button>}
          {sheet.status === "out" && <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => void run(() => closeRouteSheetAction(sheet.id))} data-testid="route-close">{copy.close}</Button>}
          {busy && <Loader2 className="w-4 h-4 animate-spin self-center" aria-hidden="true" />}
        </div>
      </div>
      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
      <Card className="overflow-x-auto print:border-0 print:shadow-none">
        <table className="w-full text-sm" data-testid="route-stops">
          <thead className="text-xs text-ink-muted">
            <tr className="border-b border-outline-variant text-start">
              <th className="px-3 py-2 text-start w-12">{copy.stop}</th>
              <th className="px-3 py-2 text-start">{t.delivery.detail.recipient}</th>
              <th className="px-3 py-2 text-start">{t.delivery.detail.address}</th>
              <th className="px-3 py-2 text-start">{t.delivery.detail.items}</th>
              <th className="px-3 py-2 text-end">{copy.collect}</th>
              <th className="px-3 py-2 text-start print:w-40">{copy.signatureLine}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {sheet.stops.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-3 py-3 font-bold tabular-nums">{s.stop}</td>
                <td className="px-3 py-3">
                  <Link href={ROUTES.delivery.shipment(s.id)} className="font-medium hover:text-accent">{s.recipient}</Link>
                  <div className="text-xs text-ink-muted text-start"><bdi dir="ltr">{s.phone}</bdi></div>
                  <div className="mt-1 print:hidden"><ShipmentStatusPill status={s.status} /></div>
                </td>
                <td className="px-3 py-3 text-xs">
                  {[s.address.line1, s.address.line2, s.address.area, s.address.city].filter(Boolean).join(", ")}
                  {s.slot && <div className="text-ink-muted">{`${s.slot.start}–${s.slot.end}`}</div>}
                </td>
                <td className="px-3 py-3 text-xs">{s.items.map((i) => `${i.description} × ${i.quantity}`).join(", ")}</td>
                <td className="px-3 py-3 text-end tabular-nums">{s.cod_amount > 0 ? formatCurrencyValue(s.cod_amount, s.currency, locale === "ar") : "—"}</td>
                <td className="px-3 py-3"><div className="h-8 border-b border-dashed border-ink/30" /></td>
              </tr>
            ))}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t border-outline-variant font-semibold">
                <td colSpan={4} />
                <td className="px-3 py-2 text-end tabular-nums">{formatCurrencyValue(total, currency, locale === "ar")}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
