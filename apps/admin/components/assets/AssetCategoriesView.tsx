"use client";

import { formatMessage } from "@ishoot/locales";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ListChecks, Pencil, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button, Input } from "@ishoot/ui";
import type { AssetCategoryInput, AssetCategoryRecord } from "@ishoot/database";
import { ROUTES } from "../../constants/routes";
import { saveAssetCategoryAction } from "../../app/actions/assets";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const TYPES = ["text", "number", "date", "boolean"] as const;
const toInput = (c: AssetCategoryRecord): AssetCategoryInput => ({
  name_en: c.name_en,
  name_ar: c.name_ar,
  spec_fields: c.spec_fields.map((f) => ({ key: f.key, label_en: f.labelEn, label_ar: f.labelAr, type: f.type, ...(f.required ? { required: true } : {}) })),
  checklist: c.checklist.map((i) => ({ key: i.key, label_en: i.labelEn, label_ar: i.labelAr })),
  is_active: c.is_active,
});
const empty = (): AssetCategoryInput => ({ name_en: "", name_ar: "", spec_fields: [], checklist: [], is_active: true });

/** Asset categories: the details recorded for each kind of asset and what is checked at every handover. */
export function AssetCategoriesView({ categories }: { categories: AssetCategoryRecord[] }) {
  const { t, locale } = useAdminLocale();
  const a = t.assets;
  const c = a.categoryEditor;
  const router = useRouter();
  const isAr = locale === "ar";
  const [editing, setEditing] = React.useState<{ id?: string; value: AssetCategoryInput } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const patch = (next: Partial<AssetCategoryInput>) => setEditing((e) => (e ? { ...e, value: { ...e.value, ...next } } : e));
  const input = "h-9 w-full rounded-lg border border-ink/15 bg-surface-sunken/60 px-2.5 text-xs text-ink";

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await saveAssetCategoryAction(editing.value, editing.id);
      toast.success(a.saved);
      setEditing(null);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, a.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.assets.list()} aria-label={t.actions.back} className="rounded-full border border-ink/15 p-2 text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink">{a.categories}</h1>
            <p className="text-xs text-ink-muted mt-1">{c.subtitle}</p>
          </div>
        </div>
        {!editing ? <Button size="sm" className="gap-1.5 self-start" onClick={() => setEditing({ value: empty() })}><Plus className="h-4 w-4" />{c.add}</Button> : null}
      </div>

      {editing ? (
        <section className="rounded-3xl border border-accent/30 bg-accent/5 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{editing.id ? c.edit : c.add}</h2>
            <button type="button" aria-label={t.actions.cancel} onClick={() => setEditing(null)} className="rounded-lg p-1 text-ink-muted hover:text-ink"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block"><span className="text-xs font-semibold text-ink mb-1 block">{c.nameEn}</span><Input dir="ltr" value={editing.value.name_en} onChange={(e) => patch({ name_en: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-ink mb-1 block">{c.nameAr}</span><Input dir="rtl" value={editing.value.name_ar} onChange={(e) => patch({ name_ar: e.target.value })} /></label>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink"><SlidersHorizontal className="h-4 w-4 text-accent" />{c.fields}</h3>
            <p className="text-[11px] text-ink-muted">{c.fieldsHint}</p>
            {editing.value.spec_fields.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input aria-label={c.labelEn} placeholder={c.labelEn} dir="ltr" className={`${input} col-span-12 sm:col-span-4`} value={f.label_en} onChange={(e) => patch({ spec_fields: editing.value.spec_fields.map((x, j) => (j === i ? { ...x, label_en: e.target.value } : x)) })} />
                <input aria-label={c.labelAr} placeholder={c.labelAr} dir="rtl" className={`${input} col-span-12 sm:col-span-4`} value={f.label_ar} onChange={(e) => patch({ spec_fields: editing.value.spec_fields.map((x, j) => (j === i ? { ...x, label_ar: e.target.value } : x)) })} />
                <select aria-label={c.type} className={`${input} col-span-6 sm:col-span-2`} value={f.type} onChange={(e) => patch({ spec_fields: editing.value.spec_fields.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}>
                  {TYPES.map((ty) => <option key={ty} value={ty}>{c.types[ty]}</option>)}
                </select>
                <label className="col-span-4 sm:col-span-1 flex items-center gap-1 text-[11px] text-ink">
                  <input type="checkbox" checked={!!f.required} onChange={(e) => patch({ spec_fields: editing.value.spec_fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)) })} />
                  {c.required}
                </label>
                <button type="button" aria-label={c.remove} onClick={() => patch({ spec_fields: editing.value.spec_fields.filter((_, j) => j !== i) })} className="col-span-2 sm:col-span-1 h-9 rounded-lg text-ink-muted hover:text-rose-500 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button type="button" onClick={() => patch({ spec_fields: [...editing.value.spec_fields, { label_en: "", label_ar: "", type: "text" }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><Plus className="h-3.5 w-3.5" />{c.addField}</button>
          </div>

          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink"><ListChecks className="h-4 w-4 text-accent" />{c.checklist}</h3>
            <p className="text-[11px] text-ink-muted">{c.checklistHint}</p>
            {editing.value.checklist.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input aria-label={c.labelEn} placeholder={c.labelEn} dir="ltr" className={`${input} col-span-12 sm:col-span-5`} value={item.label_en} onChange={(e) => patch({ checklist: editing.value.checklist.map((x, j) => (j === i ? { ...x, label_en: e.target.value } : x)) })} />
                <input aria-label={c.labelAr} placeholder={c.labelAr} dir="rtl" className={`${input} col-span-10 sm:col-span-6`} value={item.label_ar} onChange={(e) => patch({ checklist: editing.value.checklist.map((x, j) => (j === i ? { ...x, label_ar: e.target.value } : x)) })} />
                <button type="button" aria-label={c.remove} onClick={() => patch({ checklist: editing.value.checklist.filter((_, j) => j !== i) })} className="col-span-2 sm:col-span-1 h-9 rounded-lg text-ink-muted hover:text-rose-500 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button type="button" onClick={() => patch({ checklist: [...editing.value.checklist, { label_en: "", label_ar: "" }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><Plus className="h-3.5 w-3.5" />{c.addItem}</button>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={editing.value.is_active} onChange={(e) => patch({ is_active: e.target.checked })} />
            {c.active}
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>{t.actions.cancel}</Button>
            <Button size="sm" disabled={busy} onClick={save}>{a.save}</Button>
          </div>
        </section>
      ) : null}

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <li key={cat.id} className={`rounded-2xl border border-ink/10 bg-white dark:bg-surface-raised p-4 ${cat.is_active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-ink">{isAr ? cat.name_ar : cat.name_en}</div>
                <div className="text-[11px] text-ink-muted">{formatMessage(c.summary, { fields: String(cat.spec_fields.length), items: String(cat.checklist.length), assets: String(cat.assets) })}</div>
              </div>
              <button type="button" aria-label={c.edit} title={c.edit} onClick={() => setEditing({ id: cat.id, value: toInput(cat) })} className="rounded-lg p-1.5 text-ink-muted hover:text-ink hover:bg-ink/5"><Pencil className="h-3.5 w-3.5" /></button>
            </div>
            {cat.checklist.length ? (
              <p className="mt-2 text-[11px] text-ink-muted line-clamp-2">{cat.checklist.map((i) => (isAr ? i.labelAr : i.labelEn)).join(isAr ? "، " : ", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
