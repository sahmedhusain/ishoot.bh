"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Loader2, PackagePlus } from "lucide-react";
import { Button, Card, CurrencyDisplay, Input, Select } from "@platform/ui";
import type { WarehouseRecord } from "@platform/database";
import { variantLabel, type ProductOption } from "@platform/database/constants/products";
import { ROUTES } from "../../constants/routes";
import { saveReorderPointsAction } from "../../app/actions/inventory";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { StockChangeModal, useLocationOptions } from "./StockDialogs";

interface ProductStockPanelProps {
  productId: string;
  name: string;
  sku: string;
  trackBatches: boolean;
  options: ProductOption[];
  variants: { id: string; values: string[] }[];
  stock: {
    levels: { variant_key: string; location: string; batch: string | null; expiry: string | null; on_hand: number; reserved: number }[];
    items: { variant_key: string; reorder_point: number | null; reorder_quantity: number | null; average_cost: number }[];
  };
  warehouses: WarehouseRecord[];
  currency: string;
  canEdit: boolean;
}

export function ProductStockPanel({ productId, name, sku, trackBatches, options, variants: rawVariants, stock, warehouses, currency, canEdit }: ProductStockPanelProps) {
  const { t, locale } = useAdminLocale();
  const variants = rawVariants.map((v) => ({ id: v.id, label: variantLabel(options, v.values, locale) }));
  const copy = t.inventory.product;
  const router = useRouter();
  const locations = useLocationOptions(warehouses);
  const keys = variants.length ? variants.map((v) => v.id) : [""];
  const label = (key: string) => variants.find((v) => v.id === key)?.label ?? "";
  const item = (key: string) => stock.items.find((i) => i.variant_key === key);
  const [levels, setLevels] = React.useState(() => Object.fromEntries(keys.map((key) => [key, { reorderPoint: item(key)?.reorder_point?.toString() ?? "", reorderQuantity: item(key)?.reorder_quantity?.toString() ?? "" }])));
  const [changeFor, setChangeFor] = React.useState<string | null>(null);
  const [pick, setPick] = React.useState(keys[0]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const saveReorder = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await saveReorderPointsAction(productId, keys.map((key) => ({ variantKey: key, ...levels[key] })));
      setMessage({ tone: "ok", text: copy.reorderSaved });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-4" data-testid="product-stock" data-page-section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-ink flex items-center gap-2"><Boxes className="w-4 h-4 text-accent" aria-hidden="true" />{copy.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && locations.length > 0 && (
            <>
              {variants.length > 0 && (
                <Select aria-label={t.inventory.change.variant} value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 rounded-full text-xs w-40">
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              )}
              <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setChangeFor(pick)} data-testid="product-stock-change">
                <PackagePlus className="w-3.5 h-3.5" />
                {t.inventory.stock.change}
              </Button>
            </>
          )}
          <Link href={ROUTES.inventory.movements({ productId })} className="text-xs font-semibold text-accent hover:underline">{copy.allMovements}</Link>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-ink-muted mb-2">{copy.levels}</h3>
        {stock.levels.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noStock}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                <tr>
                  {variants.length > 0 && <th scope="col" className="px-3 py-2 text-start font-semibold">{t.inventory.change.variant}</th>}
                  <th scope="col" className="px-3 py-2 text-start font-semibold">{t.inventory.change.location}</th>
                  {trackBatches && <th scope="col" className="px-3 py-2 text-start font-semibold">{t.inventory.stock.batchColumn}</th>}
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{t.inventory.stock.columns.onHand}</th>
                  <th scope="col" className="px-3 py-2 text-end font-semibold">{t.inventory.stock.columns.reserved}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stock.levels.map((l, index) => (
                  <tr key={index}>
                    {variants.length > 0 && <td className="px-3 py-2">{label(l.variant_key)}</td>}
                    <td className="px-3 py-2 font-mono text-xs" dir="ltr">{l.location}</td>
                    {trackBatches && <td className="px-3 py-2 font-mono text-xs" dir="ltr">{[l.batch, l.expiry].filter(Boolean).join(" · ")}</td>}
                    <td className="px-3 py-2 text-end tabular-nums">{l.on_hand}</td>
                    <td className="px-3 py-2 text-end tabular-nums text-ink-muted">{l.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-ink-muted">{copy.reorderHint}</p>
        <div className="space-y-2">
          {keys.map((key) => (
            <div key={key || "product"} className="grid grid-cols-2 sm:grid-cols-[1fr_8rem_8rem_8rem] gap-2 items-center">
              <span className="col-span-2 sm:col-span-1 text-sm font-medium text-ink">{label(key) || sku}</span>
              <Input aria-label={`${copy.reorderPoint} · ${label(key) || name}`} placeholder={copy.reorderPoint} type="number" min={0} step="0.001" disabled={!canEdit} value={levels[key]?.reorderPoint ?? ""} onChange={(e) => setLevels((c) => ({ ...c, [key]: { ...c[key], reorderPoint: e.target.value } }))} className="h-9 rounded-lg" />
              <Input aria-label={`${copy.reorderQuantity} · ${label(key) || name}`} placeholder={copy.reorderQuantity} type="number" min={0} step="0.001" disabled={!canEdit} value={levels[key]?.reorderQuantity ?? ""} onChange={(e) => setLevels((c) => ({ ...c, [key]: { ...c[key], reorderQuantity: e.target.value } }))} className="h-9 rounded-lg" />
              <span className="text-xs text-ink-muted text-end" title={copy.averageCost}><CurrencyDisplay amount={item(key)?.average_cost ?? 0} currency={currency} /></span>
            </div>
          ))}
        </div>
        {canEdit && (
          <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" disabled={busy} onClick={saveReorder}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {copy.saveReorder}
          </Button>
        )}
        {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-xs ${message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"}`}>{message.text}</p>}
      </div>

      {changeFor !== null && (
        <StockChangeModal
          target={{ productId, variantId: changeFor || null, name: [name, label(changeFor)].filter(Boolean).join(" · "), trackBatches }}
          locations={locations}
          currency={currency}
          onClose={() => setChangeFor(null)}
          onDone={() => {
            setChangeFor(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
