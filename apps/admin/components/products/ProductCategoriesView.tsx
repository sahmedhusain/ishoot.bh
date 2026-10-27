"use client";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FolderTree, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, Select } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { ContentLanguage } from "@platform/database/constants/languages";
import type { ProductCategoryRecord } from "@platform/database";
import { deleteProductCategoryAction, saveProductCategoryAction } from "../../app/actions/products";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field, LanguageFields } from "../setup/LanguageFields";

interface Draft {
  id?: string;
  nameEn: string;
  nameAr: string;
  parentId: string;
  isActive: boolean;
}

/** Products → categories: a nested list with inline add and edit. */
export function ProductCategoriesView({ categories, languages, canEdit, canDelete }: { categories: ProductCategoryRecord[]; languages: readonly ContentLanguage[]; canEdit: boolean; canDelete: boolean }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.products.categories;
  const router = useRouter();
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const name = (c: ProductCategoryRecord) => (locale === "ar" ? c.name_ar || c.name_en : c.name_en || c.name_ar);

  // Parents first, each followed by its subcategories.
  const ordered = React.useMemo(() => {
    const out: { category: ProductCategoryRecord; depth: number }[] = [];
    const visit = (parent: string | null, depth: number, seen: Set<string>) => {
      for (const category of categories.filter((c) => c.parent_id === parent)) {
        if (seen.has(category.id)) continue;
        seen.add(category.id);
        out.push({ category, depth });
        visit(category.id, depth + 1, seen);
      }
    };
    const seen = new Set<string>();
    visit(null, 0, seen);
    for (const category of categories) if (!seen.has(category.id)) out.push({ category, depth: 0 });
    return out;
  }, [categories]);

  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await task();
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const editor = draft && (
    <Card className="p-5 space-y-4" data-testid="category-editor">
      <div className="grid sm:grid-cols-2 gap-4">
        <LanguageFields name="categoryName" label={copy.name} languages={languages} required maxLength={120} en={draft.nameEn} ar={draft.nameAr} onChange={({ en, ar }) => setDraft({ ...draft, nameEn: en, nameAr: ar })} />
        <Field label={copy.parent}>
          {(id) => (
            <Select id={id} value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })} className="rounded-lg">
              <option value="">{copy.none}</option>
              {ordered.filter(({ category }) => category.id !== draft.id).map(({ category, depth }) => <option key={category.id} value={category.id}>{`${"— ".repeat(depth)}${name(category)}`}</option>)}
            </Select>
          )}
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
          {copy.active}
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={() => run(() => saveProductCategoryAction(draft))}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {copy.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4" data-page-header>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
          <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canEdit && !draft && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" onClick={() => setDraft({ nameEn: "", nameAr: "", parentId: "", isActive: true })}>
            <Plus className="w-3.5 h-3.5" />
            {copy.add}
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm rounded-xl px-4 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-300">{error}</p>}
      {editor}
      <Card className="overflow-hidden">
        {ordered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <FolderTree className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {ordered.map(({ category, depth }) => (
              <li key={category.id} className="flex items-center gap-3 px-4 py-3" style={{ paddingInlineStart: `${16 + depth * 24}px` }}>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{name(category)}</span>
                  <span className="block text-xs text-ink-muted">
                    {formatMessage(copy.count, { count: category.product_count })}
                    {!category.is_active && ` · ${copy.inactive}`}
                  </span>
                </span>
                {canEdit && (
                  <button type="button" aria-label={formatMessage(copy.edit, { name: name(category) })} onClick={() => setDraft({ id: category.id, nameEn: category.name_en, nameAr: category.name_ar, parentId: category.parent_id ?? "", isActive: category.is_active })} className="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-ink/5">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button type="button" aria-label={formatMessage(copy.delete, { name: name(category) })} disabled={busy} onClick={() => confirmAction({ description: copy.deleteConfirm, onConfirm: () => run(() => deleteProductCategoryAction(category.id)) })} className="h-8 w-8 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
