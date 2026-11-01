"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { Button, Card, Input, Select, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProductCategoryRecord, WarehouseRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { createStockCountAction } from "../../app/actions/inventory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

interface CountRow {
  id: string;
  number: string;
  warehouse_en: string;
  warehouse_ar: string;
  scope: string;
  status: string;
  lines: number;
  counted: number;
  created_at: string;
}

const STATUS_TONE: Record<string, string> = {
  counting: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  review: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-ink/10 text-ink-muted",
};

/** Inventory → stock counts: the counts so far and starting a new one. */
export function StockCountsView({ counts, warehouses, categories, canCreate }: { counts: CountRow[]; warehouses: WarehouseRecord[]; categories: ProductCategoryRecord[]; canCreate: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.inventory.counts;
  const router = useRouter();
  const active = warehouses.filter((w) => w.is_active);
  const [draft, setDraft] = React.useState<{ warehouseId: string; scope: string; categoryId: string; note: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const start = async () => {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const result = await createStockCountAction({ warehouseId: draft.warehouseId, scope: draft.scope, categoryId: draft.scope === "cycle" ? draft.categoryId || undefined : undefined, note: draft.note });
      router.push(ROUTES.inventory.count(result.id));
    } catch (err) {
      setError(errorMessage(err, t));
      setBusy(false);
    }
  };
  const statusName = (status: string) => (copy.statuses as Record<string, string>)[status] ?? status;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canCreate && !draft && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" onClick={() => setDraft({ warehouseId: (active.find((w) => w.is_default) ?? active[0])?.id ?? "", scope: "full", categoryId: categories[0]?.id ?? "", note: "" })}>
            <Plus className="w-3.5 h-3.5" />
            {copy.new}
          </Button>
        )}
      />
      {draft && (
        <Card className="p-5 space-y-4" data-testid="count-new">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={copy.warehouse}>
              {(id) => (
                <Select id={id} value={draft.warehouseId} onChange={(e) => setDraft({ ...draft, warehouseId: e.target.value })} className="rounded-lg">
                  {active.map((w) => <option key={w.id} value={w.id}>{locale === "ar" ? w.name_ar : w.name_en}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.scope}>
              {(id) => (
                <Select id={id} value={draft.scope} onChange={(e) => setDraft({ ...draft, scope: e.target.value })} className="rounded-lg">
                  <option value="full">{copy.scopes.full}</option>
                  {categories.length > 0 && <option value="cycle">{copy.scopes.cycle}</option>}
                </Select>
              )}
            </Field>
            {draft.scope === "cycle" && (
              <Field label={copy.category}>
                {(id) => (
                  <Select id={id} value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className="rounded-lg">
                    {categories.map((c) => <option key={c.id} value={c.id}>{locale === "ar" ? c.name_ar : c.name_en}</option>)}
                  </Select>
                )}
              </Field>
            )}
            <Field label={copy.note} wide>
              {(id) => <Input id={id} maxLength={500} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className="rounded-lg" />}
            </Field>
          </div>
          {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy || !draft.warehouseId} onClick={start} data-testid="count-start">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {copy.start}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setDraft(null)}>{t.inventory.change.cancel}</Button>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {counts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ClipboardList className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.number}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.warehouse}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden sm:table-cell">{copy.columns.scope}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.progress}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">{copy.columns.status}</th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold hidden md:table-cell">{copy.columns.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {counts.map((c) => (
                  <tr key={c.id} className="hover:bg-ink/[0.02]">
                    <td className="px-4 py-3"><Link href={ROUTES.inventory.count(c.id)} className="font-mono text-xs font-semibold text-ink hover:text-accent" dir="ltr">{c.number}</Link></td>
                    <td className="px-4 py-3">{locale === "ar" ? c.warehouse_ar : c.warehouse_en}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-ink-muted">{(copy.scopes as Record<string, string>)[c.scope]}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMessage(copy.progress, { counted: c.counted, lines: c.lines })}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[c.status] ?? ""}`}>{statusName(c.status)}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-muted">{formatDate(c.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
