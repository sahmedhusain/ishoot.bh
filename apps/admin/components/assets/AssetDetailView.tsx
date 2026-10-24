"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Pencil, Undo2, UserPlus } from "lucide-react";
import { Button, formatCurrencyValue, formatDate } from "@platform/ui";
import type { AssetCategoryRecord, AssetRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { AssetForm } from "./AssetForm";
import { HandoverForm } from "./HandoverForm";
import { ASSET_STATUS_STYLE } from "./AssetsListView";

type Handover = { id: string; reference: string; kind: string; status: string; handover_date: string; condition: string; employee: { name_en: string; name_ar: string }; damage_charge?: number };

export function AssetDetailView({ asset, handovers, categories, employees, canEdit }: {
  asset: AssetRecord;
  handovers: Handover[];
  categories: AssetCategoryRecord[];
  employees: Array<{ id: string; name_en: string; name_ar: string }>;
  canEdit: boolean;
}) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const isAr = locale === "ar";
  const [mode, setMode] = React.useState<"view" | "edit" | "issue" | "return">("view");
  const item = (label: string, value?: string | null, ltr?: boolean, key?: string) => (
    <div key={key}>
      <dt className="text-[11px] text-ink-muted mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-ink" dir={ltr ? "ltr" : undefined}>{value || "—"}</dd>
    </div>
  );
  const specValue = (key: string, type: string) => {
    const v = asset.specs[key];
    if (!v) return null;
    if (type === "date") return formatDate(v, locale);
    if (type === "boolean") return v === "yes" ? a.yes : a.no;
    return v;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.assets.list()} aria-label={t.actions.back} className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">{asset.name}</h1>
            <p className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-2">
              <bdi dir="ltr">{asset.asset_tag}</bdi>
              <span>· {isAr ? asset.category.name_ar : asset.category.name_en}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${ASSET_STATUS_STYLE[asset.status]}`}>{a.statuses[asset.status as keyof typeof a.statuses]}</span>
            </p>
          </div>
        </div>
        {canEdit && mode === "view" ? (
          <div className="flex flex-wrap gap-2">
            {asset.status === "available" && !asset.open_handover ? <Button size="sm" className="gap-1.5" onClick={() => setMode("issue")}><UserPlus className="h-4 w-4" />{a.handover.issue}</Button> : null}
            {asset.status === "assigned" && !asset.open_handover ? <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMode("return")}><Undo2 className="h-4 w-4" />{a.handover.return}</Button> : null}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMode("edit")}><Pencil className="h-4 w-4" />{a.edit}</Button>
          </div>
        ) : null}
      </div>

      {asset.open_handover ? (
        <Link href={ROUTES.assets.handover(asset.open_handover.id)} className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          <ArrowRightLeft className="h-4 w-4" />
          {formatMessage(a.openHandover, { reference: asset.open_handover.reference, status: a.handoverStatuses[asset.open_handover.status as keyof typeof a.handoverStatuses] })}
        </Link>
      ) : null}

      {mode === "edit" ? (
        <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5"><AssetForm categories={categories} asset={asset} employees={employees} onDone={() => setMode("view")} /></div>
      ) : mode === "issue" || mode === "return" ? (
        <HandoverForm asset={asset} kind={mode} employees={employees} onCancel={() => setMode("view")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 space-y-5">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {item(a.fields.brand, asset.brand)}
              {item(a.fields.model, asset.model)}
              {item(a.fields.serial, asset.serial_number, true)}
              {item(a.fields.condition, a.conditions[asset.condition as keyof typeof a.conditions])}
              {item(a.fields.location, asset.location)}
              {item(a.fields.holder, asset.holder ? (isAr ? asset.holder.name_ar : asset.holder.name_en) : null)}
              {item(a.fields.purchaseDate, asset.purchase_date ? formatDate(asset.purchase_date, locale) : null)}
              {item(a.fields.purchaseCost, asset.purchase_cost !== undefined ? formatCurrencyValue(asset.purchase_cost, asset.currency, isAr) : null)}
              {item(a.fields.supplier, asset.supplier)}
              {item(a.fields.invoiceReference, asset.invoice_reference, true)}
              {item(a.fields.warrantyUntil, asset.warranty_until ? formatDate(asset.warranty_until, locale) : null)}
            </dl>
            {asset.category.spec_fields.length ? (
              <div className="border-t border-ink/10 pt-4">
                <h2 className="mb-3 text-sm font-bold text-ink">{formatMessage(a.specsTitle, { category: isAr ? asset.category.name_ar : asset.category.name_en })}</h2>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {asset.category.spec_fields.map((f) => item(isAr ? f.labelAr : f.labelEn, specValue(f.key, f.type), f.type !== "text", f.key))}
                </dl>
              </div>
            ) : null}
            {asset.notes ? <p className="border-t border-ink/10 pt-4 text-xs text-ink whitespace-pre-wrap">{asset.notes}</p> : null}
          </section>
          <section className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 space-y-3">
            <h2 className="text-sm font-bold text-ink">{a.history}</h2>
            {handovers.length === 0 ? <p className="text-xs text-ink-muted">{a.noHistory}</p> : null}
            <ul className="space-y-2">
              {handovers.map((h) => (
                <li key={h.id}>
                  <Link href={ROUTES.assets.handover(h.id)} className="block rounded-2xl border border-ink/10 px-3 py-2 hover:border-accent/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{h.kind === "issue" ? a.handover.issued : a.handover.returned} · {isAr ? h.employee.name_ar : h.employee.name_en}</span>
                      <span className="text-[10px] text-ink-muted">{a.handoverStatuses[h.status as keyof typeof a.handoverStatuses]}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted"><bdi dir="ltr">{h.reference}</bdi> · {formatDate(h.handover_date, locale)} · {a.conditions[h.condition as keyof typeof a.conditions]}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
