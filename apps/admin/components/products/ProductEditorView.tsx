"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Loader2, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { ProductCategoryRecord, ProductRecord } from "@platform/database";
import { MAX_OPTIONS, PRODUCT_UNITS, parseProductOptions, variantCombinations, variantLabel, variantSku, type ProductOption } from "@platform/database/constants/products";
import { ROUTES } from "../../constants/routes";
import { deleteProductAction, saveProductAction, setProductOnWebsiteAction } from "../../app/actions/products";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import { ContentImage } from "../shared/ContentImage";
import { Field, LanguageFields } from "../setup/LanguageFields";

/** An option as typed: values as comma-separated text in each language. */
interface OptionDraft {
  nameEn: string;
  nameAr: string;
  valuesEn: string;
  valuesAr: string;
}
interface VariantDraft {
  id?: string;
  sku: string;
  barcode: string;
  price: string;
  cost: string;
  isActive: boolean;
}

const split = (text: string) => text.split(/[,،]/).map((value) => value.trim()).filter(Boolean);
const toOptions = (drafts: OptionDraft[]): ProductOption[] | null =>
  parseProductOptions(
    drafts.map((draft) => {
      const en = split(draft.valuesEn);
      const ar = split(draft.valuesAr);
      if (en.length && ar.length && en.length !== ar.length) return null;
      return { nameEn: draft.nameEn, nameAr: draft.nameAr, values: (en.length ? en : ar).map((value, index) => ({ en: en[index] ?? value, ar: ar[index] ?? value })) };
    }),
  );
const comboKey = (values: string[]) => values.join("\u0000");
const amountText = (value: number | null) => (value == null ? "" : String(value));

interface ProductEditorViewProps {
  product: ProductRecord | null;
  categories: ProductCategoryRecord[];
  currency: string;
  languages: readonly ContentLanguage[];
  canEdit: boolean;
  canDelete: boolean;
  /** May put the product in the website catalogue (portfolio access). */
  canPublish: boolean;
  /** New products start batch-tracked in activities that usually have expiry dates. */
  batchesByDefault?: boolean;
  /** The stock panel, when the person may see stock. */
  stockPanel?: React.ReactNode;
}

/** Products → one product: details, price, pictures, options and their variants, and the website. */
export function ProductEditorView({ product, categories, currency, languages, canEdit, canDelete, canPublish, batchesByDefault = false, stockPanel }: ProductEditorViewProps) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.products.editor;
  const router = useRouter();
  const [form, setForm] = React.useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    nameEn: product?.name_en ?? "",
    nameAr: product?.name_ar ?? "",
    descriptionEn: product?.description_en ?? "",
    descriptionAr: product?.description_ar ?? "",
    categoryId: product?.category_id ?? "",
    brand: product?.brand ?? "",
    unit: product?.unit ?? "piece",
    cost: product ? String(product.cost) : "",
    price: product ? String(product.price) : "",
    vatExempt: product?.vat_exempt ?? false,
    trackStock: product?.track_stock ?? true,
    trackBatches: product?.track_batches ?? batchesByDefault,
    isActive: product?.is_active ?? true,
  });
  const [images, setImages] = React.useState<string[]>(product?.image_urls ?? []);
  const [nextImage, setNextImage] = React.useState("");
  const [optionDrafts, setOptionDrafts] = React.useState<OptionDraft[]>(
    (product?.options ?? []).map((option) => ({ nameEn: option.nameEn, nameAr: option.nameAr, valuesEn: option.values.map((v) => v.en).join(", "), valuesAr: option.values.map((v) => v.ar).join("، ") })),
  );
  const [variants, setVariants] = React.useState<Record<string, VariantDraft>>(() =>
    Object.fromEntries((product?.variants ?? []).map((v) => [comboKey(v.option_values), { id: v.id, sku: v.sku, barcode: v.barcode ?? "", price: amountText(v.price), cost: amountText(v.cost), isActive: v.is_active }])),
  );
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const markSaved = useUnsavedChanges({ form, images, nextImage, optionDrafts, variants });

  const options = React.useMemo(() => toOptions(optionDrafts), [optionDrafts]);
  const combos = React.useMemo(() => variantCombinations(options ?? []), [options]);
  const variantFor = (values: string[]): VariantDraft => variants[comboKey(values)] ?? { sku: "", barcode: "", price: "", cost: "", isActive: true };
  const setVariant = (values: string[], patch: Partial<VariantDraft>) => setVariants((current) => ({ ...current, [comboKey(values)]: { ...variantFor(values), ...patch } }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const price = Number(form.price);
  const cost = Number(form.cost);
  const margin = price > 0 && form.cost !== "" && Number.isFinite(cost) ? Math.round(((price - cost) / price) * 100) : null;
  const name = (en: string, ar: string) => (locale === "ar" ? ar || en : en || ar);

  const run = async (task: () => Promise<unknown>, done?: string, rethrow = false) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      if (done) setMessage({ tone: "ok", text: done });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
      if (rethrow) throw error;
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (nextImage.trim()) throw new Error(copy.pendingImage);
      if (!options) throw new Error(t.serverErrors.messages.productOptionsInvalid);
      const result = await saveProductAction({
        id: product?.id,
        ...form,
        imageUrls: images,
        options,
        variants: combos.map((values) => ({ ...variantFor(values), optionValues: values })),
      });
      if (!markSaved()) return;
      if (!product) router.replace(ROUTES.products.detail(result.id));
    }, copy.saved);

  const fillSkus = () =>
    setVariants((current) => {
      const next = { ...current };
      for (const values of combos) {
        const draft = next[comboKey(values)] ?? { sku: "", barcode: "", price: "", cost: "", isActive: true };
        if (!draft.sku.trim()) next[comboKey(values)] = { ...draft, sku: variantSku(form.sku.trim() || "SKU", values) };
      }
      return next;
    });

  const readOnly = !canEdit;
  return (
    <div inert={busy} aria-busy={busy} className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <Link href={ROUTES.products.list} className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent">
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
            {copy.back}
          </Link>
          <h1 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{product ? name(product.name_en, product.name_ar) : copy.titleNew}</h1>
        </div>
        <div className="flex gap-2">
          {product && canDelete && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5 text-rose-600" disabled={busy} onClick={() => confirmAction({ description: copy.deleteConfirm, onConfirm: () => run(async () => { await deleteProductAction(product.id); if (!markSaved()) return; router.replace(ROUTES.products.list); }, undefined, true) })}>
              <Trash2 className="w-3.5 h-3.5" />
              {copy.delete}
            </Button>
          )}
          {canEdit && (
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={save} data-testid="product-save">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {busy ? copy.saving : copy.save}
            </Button>
          )}
        </div>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <fieldset disabled={readOnly} className="space-y-6">
        <Card className="p-5 space-y-5" data-page-section>
          <h2 className="font-bold text-ink">{copy.details}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <LanguageFields name="productName" label={copy.name} languages={languages} required maxLength={200} en={form.nameEn} ar={form.nameAr} onChange={({ en, ar }) => setForm((f) => ({ ...f, nameEn: en, nameAr: ar }))} />
            <Field label={copy.sku} hint={copy.skuHint}>
              {(id) => <Input id={id} name="sku" dir="ltr" maxLength={60} value={form.sku} onChange={(e) => set("sku", e.target.value)} className="rounded-lg font-mono" />}
            </Field>
            <Field label={copy.barcode} hint={copy.barcodeHint}>
              {(id) => <Input id={id} name="barcode" dir="ltr" maxLength={40} inputMode="numeric" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} className="rounded-lg font-mono" />}
            </Field>
            <Field label={copy.category}>
              {(id) => (
                <Select id={id} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="rounded-lg">
                  <option value="">{copy.noCategory}</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{name(category.name_en, category.name_ar)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.brand}>
              {(id) => <Input id={id} maxLength={80} value={form.brand} onChange={(e) => set("brand", e.target.value)} className="rounded-lg" />}
            </Field>
            <Field label={copy.unit}>
              {(id) => (
                <Select id={id} value={form.unit} onChange={(e) => set("unit", e.target.value)} className="rounded-lg">
                  {PRODUCT_UNITS.map((unit) => <option key={unit} value={unit}>{copy.units[unit]}</option>)}
                </Select>
              )}
            </Field>
            <LanguageFields label={copy.description} languages={languages} multiline wide maxLength={5000} en={form.descriptionEn} ar={form.descriptionAr} onChange={({ en, ar }) => setForm((f) => ({ ...f, descriptionEn: en, descriptionAr: ar }))} />
          </div>
        </Card>

        <Card className="p-5 space-y-4" data-page-section>
          <h2 className="font-bold text-ink">{copy.pricing}</h2>
          <div className="grid sm:grid-cols-3 gap-4 items-start">
            <Field label={formatMessage(copy.price, { currency })}>
              {(id) => <Input id={id} name="price" type="number" min={0} step="0.001" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} className="rounded-lg" />}
            </Field>
            <Field label={formatMessage(copy.cost, { currency })} hint={margin != null ? formatMessage(copy.margin, { percent: margin }) : undefined}>
              {(id) => <Input id={id} name="cost" type="number" min={0} step="0.001" inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} className="rounded-lg" />}
            </Field>
            <div className="space-y-2 pt-6">
              {([["vatExempt", copy.vatExempt, copy.vatExemptHint], ["trackStock", copy.trackStock, copy.trackStockHint], ...(form.trackStock ? ([["trackBatches", t.inventory.product.trackBatches, t.inventory.product.trackBatchesHint]] as const) : []), ["isActive", copy.isActive, ""]] as const).map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2.5 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                  <span>
                    <span className="block font-medium">{label}</span>
                    {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4" data-page-section>
          <div>
            <h2 className="font-bold text-ink">{copy.images}</h2>
            <p className="text-xs text-ink-muted mt-0.5">{copy.imagesHint}</p>
          </div>
          {images.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {images.map((url, index) => (
                <li key={url} className="relative h-24 w-24 overflow-hidden rounded-xl border border-outline-variant bg-ink/5">
                  <ContentImage src={url} alt="" width={96} height={96} className="h-full w-full object-cover" />
                  {canEdit && (
                    <button type="button" aria-label={formatMessage(copy.removeImage, { number: index + 1 })} onClick={() => setImages((current) => current.filter((u) => u !== url))} className="absolute top-1 end-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && images.length < 12 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
              <div className="flex-1"><AssetUrlInput value={nextImage} onChange={setNextImage} resource="products" /></div>
              <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" disabled={!nextImage || images.includes(nextImage)} onClick={() => { setImages((current) => [...current, nextImage]); setNextImage(""); }}>
                <Plus className="w-3.5 h-3.5" />
                {copy.addImage}
              </Button>
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4" data-page-section>
          <div>
            <h2 className="font-bold text-ink">{copy.options}</h2>
            <p className="text-xs text-ink-muted mt-0.5">{copy.optionsHint}</p>
          </div>
          {optionDrafts.map((draft, index) => {
            const update = (patch: Partial<OptionDraft>) => setOptionDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...patch } : d)));
            return (
              <div key={index} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 rounded-xl border border-outline-variant p-3">
                <LanguageFields label={copy.optionName} languages={languages} maxLength={40} en={draft.nameEn} ar={draft.nameAr} onChange={({ en, ar }) => update({ nameEn: en, nameAr: ar })} />
                <LanguageFields label={copy.optionValues} hint={copy.optionValuesHint} languages={languages} maxLength={600} en={draft.valuesEn} ar={draft.valuesAr} onChange={({ en, ar }) => update({ valuesEn: en, valuesAr: ar })} />
                {canEdit && (
                  <button type="button" aria-label={copy.removeOption} onClick={() => setOptionDrafts((current) => current.filter((_, i) => i !== index))} className="self-start mt-6 p-2 rounded-lg text-rose-600 hover:bg-rose-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          {canEdit && optionDrafts.length < MAX_OPTIONS && (
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setOptionDrafts((current) => [...current, { nameEn: "", nameAr: "", valuesEn: "", valuesAr: "" }])}>
              <Plus className="w-3.5 h-3.5" />
              {copy.addOption}
            </Button>
          )}

          {combos.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink">{copy.variants}</h3>
                  <p className="text-xs text-ink-muted">{copy.variantsHint}</p>
                </div>
                {canEdit && (
                  <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={fillSkus}>
                    <Wand2 className="w-3.5 h-3.5" />
                    {copy.fillSkus}
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto rounded-xl border border-outline-variant">
                <table className="w-full text-sm" data-testid="product-variants">
                  <thead className="bg-ink/[0.03] text-xs text-ink-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{copy.variant}</th>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{copy.sku}</th>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{copy.barcode}</th>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{formatMessage(copy.price, { currency })}</th>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{formatMessage(copy.cost, { currency })}</th>
                      <th scope="col" className="px-3 py-2 text-start font-semibold">{copy.variantActive}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {combos.map((values) => {
                      const draft = variantFor(values);
                      const label = variantLabel(options ?? [], values, locale);
                      return (
                        <tr key={comboKey(values)}>
                          <th scope="row" className="px-3 py-2 text-start font-medium whitespace-nowrap">{label}</th>
                          <td className="px-3 py-2"><Input aria-label={`${copy.sku} · ${label}`} dir="ltr" maxLength={60} value={draft.sku} onChange={(e) => setVariant(values, { sku: e.target.value })} className="h-9 min-w-[140px] rounded-lg font-mono text-xs" /></td>
                          <td className="px-3 py-2"><Input aria-label={`${copy.barcode} · ${label}`} dir="ltr" maxLength={40} value={draft.barcode} onChange={(e) => setVariant(values, { barcode: e.target.value })} className="h-9 min-w-[120px] rounded-lg font-mono text-xs" /></td>
                          <td className="px-3 py-2"><Input aria-label={`${formatMessage(copy.price, { currency })} · ${label}`} type="number" min={0} step="0.001" placeholder={form.price} value={draft.price} onChange={(e) => setVariant(values, { price: e.target.value })} className="h-9 w-28 rounded-lg" /></td>
                          <td className="px-3 py-2"><Input aria-label={`${formatMessage(copy.cost, { currency })} · ${label}`} type="number" min={0} step="0.001" placeholder={form.cost} value={draft.cost} onChange={(e) => setVariant(values, { cost: e.target.value })} className="h-9 w-28 rounded-lg" /></td>
                          <td className="px-3 py-2"><input type="checkbox" aria-label={`${copy.variantActive} · ${label}`} className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setVariant(values, { isActive: e.target.checked })} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </fieldset>

      {stockPanel}

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4" data-page-section>
        <Globe className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-bold text-ink">{copy.website}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{!product ? copy.saveFirst : product.on_website ? copy.websiteOn : copy.websiteOff}</p>
        </div>
        {product && canEdit && canPublish && (
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={() => confirmAction({ description: product.on_website ? copy.hideConfirm : copy.showConfirm, variant: "warning", onConfirm: () => run(() => setProductOnWebsiteAction(product.id, !product.on_website), undefined, true) })} data-testid="product-website">
            {product.on_website ? copy.removeFromWebsite : copy.addToWebsite}
          </Button>
        )}
      </Card>
    </div>
  );
}
