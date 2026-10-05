"use client";

import * as React from "react";
import Link from "next/link";
import type { ExpenseCategory } from "@ishoot/database/types";
import { EXPENSE_CATEGORY_KINDS, type ExpenseCategoryKind } from "@ishoot/database/constants/finance";
import { Card, Button, Input } from "@ishoot/ui";
import { ArrowLeft, Plus, Eye, EyeOff, Trash2, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  createExpenseCategoryAction,
  updateExpenseCategoryAction,
  deleteExpenseCategoryAction,
} from "../../app/actions/finance";

export function ExpenseCategoriesView({ initialCategories, canDelete }: { initialCategories: ExpenseCategory[]; canDelete: boolean }) {
  const { t, locale } = useAdminLocale();
  const cT = t.expenseCategories;
  const [categories, setCategories] = React.useState(initialCategories);
  const [drafts, setDrafts] = React.useState<Record<string, Partial<ExpenseCategory>>>({});
  const [newCat, setNewCat] = React.useState({ name_en: "", name_ar: "", color: "#09937F", kind: "operating" as ExpenseCategoryKind });
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : cT.saveFailed);
    } finally {
      setBusy(null);
    }
  };

  const replace = (category: ExpenseCategory) => setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
  const field = "rounded-xl border border-ink/15 bg-surface px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.expenses.list()}>
          <Button variant="outline" size="sm" className="gap-1.5 text-ink-muted">
            <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
            <span>{t.actions.back}</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink font-display">{cT.title}</h1>
          <p className="text-xs text-ink-muted mt-1">{cT.subtitle}</p>
        </div>
      </div>

      <Card className="p-5 bg-surface border border-ink/10 rounded-3xl">
        <form
          className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run("new", async () => {
              const res = await createExpenseCategoryAction(newCat);
              setCategories((prev) => [...prev, res.category]);
              setNewCat({ ...newCat, name_en: "", name_ar: "" });
              toast.success(cT.created);
            });
          }}
        >
          <label className="text-xs text-ink space-y-1">
            <span className="block font-semibold">{cT.nameEn}</span>
            <Input required value={newCat.name_en} onChange={(e) => setNewCat({ ...newCat, name_en: e.target.value })} />
          </label>
          <label className="text-xs text-ink space-y-1">
            <span className="block font-semibold">{cT.nameAr}</span>
            <Input dir="rtl" value={newCat.name_ar} onChange={(e) => setNewCat({ ...newCat, name_ar: e.target.value })} />
          </label>
          <label className="text-xs text-ink space-y-1">
            <span className="block font-semibold">{cT.kind}</span>
            <select className={`${field} py-2.5`} value={newCat.kind} onChange={(e) => setNewCat({ ...newCat, kind: e.target.value as ExpenseCategoryKind })}>
              {EXPENSE_CATEGORY_KINDS.map((k) => <option key={k} value={k}>{t.expenseMeta.kinds[k]}</option>)}
            </select>
          </label>
          <label className="text-xs text-ink space-y-1">
            <span className="block font-semibold">{cT.color}</span>
            <input type="color" aria-label={cT.color} className="h-10 w-12 rounded-lg border border-ink/15 bg-surface" value={newCat.color} onChange={(e) => setNewCat({ ...newCat, color: e.target.value })} />
          </label>
          <Button type="submit" variant="primary" size="sm" disabled={busy === "new"} className="gap-1.5 h-10">
            <Plus className="w-4 h-4" />
            {cT.add}
          </Button>
        </form>
      </Card>

      {EXPENSE_CATEGORY_KINDS.map((kind) => {
        const rows = categories.filter((c) => c.kind === kind);
        if (!rows.length) return null;
        return (
          <section key={kind} className="space-y-2">
            <h2 className="text-sm font-bold text-ink px-1">{t.expenseMeta.kinds[kind]}</h2>
            <Card className="p-0 bg-surface border border-ink/10 rounded-3xl divide-y divide-ink/5 overflow-hidden">
              {rows.map((c) => {
                const draft = drafts[c.id] ?? {};
                const dirty = Object.keys(draft).length > 0;
                const set = (patch: Partial<ExpenseCategory>) => setDrafts((d) => ({ ...d, [c.id]: { ...d[c.id], ...patch } }));
                return (
                  <div key={c.id} className={`p-3 sm:px-5 flex flex-wrap items-center gap-2 ${c.is_active ? "" : "opacity-55"}`}>
                    <input type="color" aria-label={cT.color} className="h-8 w-9 rounded-md border border-ink/15 bg-surface" value={draft.color ?? c.color} onChange={(e) => set({ color: e.target.value })} />
                    <input className={`${field} flex-1 min-w-[140px]`} aria-label={cT.nameEn} value={draft.name_en ?? c.name_en} onChange={(e) => set({ name_en: e.target.value })} />
                    <input className={`${field} flex-1 min-w-[140px]`} dir="rtl" aria-label={cT.nameAr} value={draft.name_ar ?? c.name_ar} onChange={(e) => set({ name_ar: e.target.value })} />
                    <select className={field} aria-label={cT.kind} value={draft.kind ?? c.kind} onChange={(e) => set({ kind: e.target.value as ExpenseCategoryKind })}>
                      {EXPENSE_CATEGORY_KINDS.map((k) => <option key={k} value={k}>{t.expenseMeta.kinds[k]}</option>)}
                    </select>
                    {c.is_system && (
                      <span title={cT.systemHint} className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                        <Lock className="w-3 h-3" />
                        {cT.system}
                      </span>
                    )}
                    <div className="flex items-center gap-1 ms-auto">
                      {dirty && (
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() =>
                            run(c.id, async () => {
                              const res = await updateExpenseCategoryAction(c.id, {
                                name_en: draft.name_en,
                                name_ar: draft.name_ar,
                                color: draft.color,
                                kind: draft.kind,
                              });
                              replace(res.category);
                              setDrafts((d) => {
                                const next = { ...d };
                                delete next[c.id];
                                return next;
                              });
                              toast.success(cT.saved);
                            })
                          }
                          className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
                          title={t.actions.save}
                          aria-label={t.actions.save}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy === c.id}
                        onClick={() =>
                          run(c.id, async () => {
                            const res = await updateExpenseCategoryAction(c.id, { is_active: !c.is_active });
                            replace(res.category);
                          })
                        }
                        className="p-2 rounded-lg text-ink-muted hover:bg-ink/5"
                        title={c.is_active ? cT.hide : cT.show}
                        aria-label={c.is_active ? cT.hide : cT.show}
                      >
                        {c.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      {canDelete && !c.is_system && (
                        <button
                          type="button"
                          disabled={busy === c.id}
                          onClick={() =>
                            run(c.id, async () => {
                              const res = await deleteExpenseCategoryAction(c.id);
                              if (res.outcome === "deleted") setCategories((prev) => prev.filter((x) => x.id !== c.id));
                              else replace({ ...c, is_active: false });
                              toast.success(res.outcome === "deleted" ? cT.deleted : cT.hiddenInUse);
                            })
                          }
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10"
                          title={t.actions.delete}
                          aria-label={t.actions.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="sr-only">{locale === "ar" ? c.name_ar : c.name_en}</span>
                  </div>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
