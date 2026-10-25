"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ProcurementProductOption } from "@platform/database";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface LineDraft {
  productId: string;
  variantId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export const emptyLine = (): LineDraft => ({ productId: "", variantId: "", description: "", quantity: "1", unitPrice: "" });

const round3 = (value: number) => Math.round(value * 1000) / 1000;
export const linesSubtotal = (lines: LineDraft[]) => round3(lines.reduce((sum, l) => sum + round3((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)), 0));

/** Lines of a requisition, request for quotation or purchase order: a catalogue product or something described. */
export function LinesEditor({ lines, onChange, products, priceLabel, showPrice = true, readOnly = false }: { lines: LineDraft[]; onChange: (lines: LineDraft[]) => void; products: ProcurementProductOption[]; priceLabel: string; showPrice?: boolean; readOnly?: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.lines;
  const name = (p: { name_en: string; name_ar: string }) => (locale === "ar" ? p.name_ar || p.name_en : p.name_en || p.name_ar);
  const set = (index: number, patch: Partial<LineDraft>) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const chooseProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    const variant = product?.variants[0];
    const cost = variant?.cost ?? product?.cost;
    set(index, { productId, variantId: variant?.id ?? "", unitPrice: lines[index].unitPrice || (cost ? String(cost) : "") });
  };
  return (
    <div className="space-y-2" data-testid="lines-editor">
      {lines.map((line, index) => {
        const product = products.find((p) => p.id === line.productId);
        const total = round3((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0));
        return (
          <div key={index} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-start rounded-xl border border-ink/10 p-3">
            <Select aria-label={copy.product} disabled={readOnly} value={line.productId} onChange={(e) => chooseProduct(index, e.target.value)} className="col-span-2 sm:col-span-4 h-10 rounded-lg">
              <option value="">{copy.freeText}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{`${name(p)} · ${p.sku}`}</option>)}
            </Select>
            {product && product.variants.length > 0 ? (
              <Select aria-label={copy.variant} disabled={readOnly} value={line.variantId} onChange={(e) => set(index, { variantId: e.target.value })} className="col-span-2 sm:col-span-3 h-10 rounded-lg">
                {product.variants.map((v) => <option key={v.id} value={v.id}>{`${locale === "ar" ? v.label_ar : v.label_en} · ${v.sku}`}</option>)}
              </Select>
            ) : (
              <Input aria-label={copy.description} placeholder={product ? name(product) : copy.description} disabled={readOnly} maxLength={300} value={line.description} onChange={(e) => set(index, { description: e.target.value })} className="col-span-2 sm:col-span-3 h-10 rounded-lg" />
            )}
            <Input aria-label={`${copy.quantity} ${index + 1}`} type="number" min={0} step="0.001" inputMode="decimal" disabled={readOnly} value={line.quantity} onChange={(e) => set(index, { quantity: e.target.value })} className="sm:col-span-1 h-10 rounded-lg" />
            {showPrice && <Input aria-label={`${priceLabel} ${index + 1}`} placeholder={priceLabel} type="number" min={0} step="0.001" inputMode="decimal" disabled={readOnly} value={line.unitPrice} onChange={(e) => set(index, { unitPrice: e.target.value })} className="sm:col-span-2 h-10 rounded-lg" />}
            <div className="col-span-2 sm:col-span-2 flex items-center justify-between gap-2 h-10">
              {showPrice && <span className="text-sm tabular-nums text-ink-muted" title={copy.lineTotal}>{total.toFixed(3)}</span>}
              {!readOnly && (
                <button type="button" aria-label={formatMessage(copy.remove, { number: index + 1 })} disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, i) => i !== index))} className="ms-auto p-2 rounded-lg text-rose-600 hover:bg-rose-500/10 disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {!readOnly && (
        <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" disabled={lines.length >= 200} onClick={() => onChange([...lines, emptyLine()])}>
          <Plus className="w-3.5 h-3.5" />
          {copy.add}
        </Button>
      )}
    </div>
  );
}

/** Lines as the server actions take them. */
export const linesInput = (lines: LineDraft[]) => lines.map((l) => ({ productId: l.productId || undefined, variantId: l.variantId || undefined, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice }));
