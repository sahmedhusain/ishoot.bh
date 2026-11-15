"use client";
import { DataTable } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import type { Expense, ExpenseCategory } from "@platform/database/types";
import { Card, CurrencyDisplay, DateDisplay, ConfirmDialog, StatusBadge } from "@platform/ui";
import { Plus, Receipt, Tag, TrendingDown, Trash2, Pencil, Briefcase, UserRound, Building2, Paperclip, Settings2, Repeat } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { deleteExpenseAction, updateExpenseAction } from "../../app/actions/finance";
import { PageHeader } from "../layout/PageHeader";

interface ExpensesManagementViewProps {
  totals: { currency: string; amount: number }[];
  count: number;
  scopeCounts?: Record<string, number>;
  initialExpenses: Expense[];
  categories: ExpenseCategory[];
  controls?: React.ReactNode;
}

export function ExpensesManagementView({ initialExpenses, categories, totals, count, scopeCounts = {}, controls }: ExpensesManagementViewProps) {
  const { t, locale } = useAdminLocale();
  const { can } = usePermissions();
  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [editingExpense, setEditingExpense] = React.useState<Expense | null>(null);
  const [editDesc, setEditDesc] = React.useState("");
  const [editVendor, setEditVendor] = React.useState("");
  const [editAmount, setEditAmount] = React.useState("");
  const [editCategoryId, setEditCategoryId] = React.useState("");
  const [editNotes, setEditNotes] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditDesc(expense.description_en || "");
    setEditVendor(expense.vendor_name || "");
    setEditAmount(String(expense.amount ?? ""));
    setEditCategoryId(expense.category_id || "");
    setEditNotes(expense.notes || "");
  };

  const handleSaveEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const numAmount = Number(editAmount);
    if (!editDesc.trim() || !Number.isFinite(numAmount) || numAmount <= 0) return;
    setSavingEdit(true);
    try {
      const res = await updateExpenseAction(editingExpense.id, {
        description_en: editDesc.trim(),
        vendor_name: editVendor.trim() || undefined,
        amount: numAmount,
        category_id: editCategoryId || undefined,
        notes: editNotes.trim() || undefined,
      });
      if (res.expense) {
        setExpenses((prev) => prev.map((item) => (item.id === editingExpense.id ? res.expense : item)));
      }
      setEditingExpense(null);
    } catch (err) {
      console.error("Failed to update expense:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpenseAction(id);
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const recordedAgainst = (expense: Expense) => {
    if (expense.scope === "deal" && expense.deal_id)
      return (
        <Link href={ROUTES.crm.deal(expense.deal_id)} className="inline-flex items-center gap-1.5 text-accent hover:underline">
          <Briefcase className="w-3.5 h-3.5" />
          {expense.deal_title || t.expenseMeta.scopes.deal}
        </Link>
      );
    if (expense.scope === "client" && expense.client_id)
      return (
        <Link href={ROUTES.crm.customer(expense.client_id)} className="inline-flex items-center gap-1.5 text-accent hover:underline">
          <UserRound className="w-3.5 h-3.5" />
          {expense.client_name || t.expenseMeta.scopes.client}
        </Link>
      );
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-muted">
        <Building2 className="w-3.5 h-3.5" />
        {t.expenseMeta.scopes.internal}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        actions={<div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {can("expenses", "write") && (
            <Link href={ROUTES.expenses.recurring} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline-variant text-xs font-semibold text-ink hover:bg-ink/5">
              <Repeat className="w-3.5 h-3.5" />
              {t.recurringExpenses.title}
            </Link>
          )}
          {can("expenses", "write") && (
            <Link href={ROUTES.expenses.categories} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-outline-variant text-xs font-semibold text-ink hover:bg-ink/5">
              <Settings2 className="w-3.5 h-3.5" />
              {t.expensesNew.manageCategories}
            </Link>
          )}
          {can("expenses", "write") && (
            <Link href={ROUTES.expenses.create} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent-hover">
              <Plus className="w-3.5 h-3.5" />
              {t.actions.addExpense}
            </Link>
          )}
        </div>}
      />
      {controls && <div className="[&>div]:mb-0">{controls}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 bg-surface border border-outline-variant space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.kpi.operatingExpenses}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-ink">
            {totals.map((v) => (
              <div key={v.currency}>
                <CurrencyDisplay amount={v.amount} currency={v.currency as never} />
              </div>
            ))}
          </div>
          <div className="text-[11px] text-ink-muted">
            {count} {t.expensesView.loggedItems}
          </div>
        </Card>

        <Card className="p-6 bg-surface border border-outline-variant space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.expensesView.costCenters}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-ink">{categories.length}</div>
          <div className="text-[11px] text-ink-muted">{t.expensesView.overheadSubtitle}</div>
        </Card>

        <Card className="p-6 bg-surface border border-outline-variant space-y-3 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>{t.expensesNew.scopeLabel}</span>
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          {(["deal", "client", "internal"] as const).map((scope) => (
            <div key={scope} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{t.expenseMeta.scopes[scope]}</span>
              <span className="font-bold text-ink">{scopeCounts[scope] ?? 0}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="bg-surface border border-outline-variant rounded-3xl overflow-x-auto">
        <DataTable className="w-full text-start text-xs min-w-[860px]">
          <thead className="bg-surface-sunken border-b border-outline-variant text-ink-muted uppercase tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.expensesView.desc}</th>
              <th className="p-4 text-start">{t.expensesView.category}</th>
              <th className="p-4 text-start">{t.expensesNew.scopeLabel}</th>
              <th className="p-4 text-start">{t.expensesView.vendor}</th>
              <th className="p-4 text-start">{t.expensesView.date}</th>
              <th className="p-4 text-end">{t.expensesView.amount}</th>
              <th className="p-4 text-end">{t.expensesView.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {expenses.map((expense) => (
              <tr key={expense.id} id={expense.id} className="hover:bg-ink/[0.02] transition-colors">
                <td className="p-4">
                  <div className="font-bold text-ink text-sm flex items-center gap-1.5">
                    {locale === "ar" ? expense.description_ar || expense.description_en : expense.description_en}
                    {expense.receipt_url && (
                      <a href={expense.receipt_url} target="_blank" rel="noreferrer" title={t.expensesNew.proofLabel} className="text-ink-muted hover:text-accent">
                        <Paperclip className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {expense.status !== "approved" && (
                    <div className="mt-1">
                      <StatusBadge status={expense.status} label={t.approvals.status[expense.status as "pending" | "rejected"] ?? expense.status} />
                    </div>
                  )}
                </td>
                <td className="p-4">
                  {expense.category ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-ink/5 text-ink">
                      <span className="w-2 h-2 rounded-full" style={{ background: expense.category.color }} />
                      {locale === "ar" ? expense.category.name_ar : expense.category.name_en}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4">{recordedAgainst(expense)}</td>
                <td className="p-4 text-ink-muted">{expense.vendor_name || "—"}</td>
                <td className="p-4 text-ink-muted">
                  <DateDisplay date={expense.expense_date} locale={locale} />
                </td>
                <td className="p-4 text-end font-bold text-rose-500 whitespace-nowrap">
                  <CurrencyDisplay amount={Number(expense.amount)} currency={expense.currency} />
                </td>
                <td className="p-4 text-end">
                  <div className="inline-flex items-center gap-1.5">
                    {can("expenses", "write") && (
                      <button
                        type="button"
                        onClick={() => openEditExpense(expense)}
                        className="p-1.5 rounded-lg bg-ink/5 hover:bg-ink/10 text-ink transition-colors inline-flex"
                        title={t.actions.edit}
                        aria-label={t.actions.edit}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {can("expenses", "delete") && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(expense.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors inline-flex"
                        title={t.actions.delete}
                        aria-label={t.actions.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDeleteExpense(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.expensesView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />

      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t.actions.edit}>
          <form onSubmit={handleSaveEditExpense} className="w-full max-w-md rounded-xl border border-outline-variant bg-surface p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-ink">{t.actions.edit}</h3>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">{t.expensesNew.descriptionEnLabel ?? "Description"}</label>
              <input
                type="text"
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">{t.expensesView.vendor}</label>
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">{t.expensesView.amount}</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">{t.expensesView.category}</label>
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="">—</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {locale === "ar" ? cat.name_ar : cat.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">{t.expensesNew.notesLabel ?? "Notes"}</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-ink hover:bg-ink/5"
              >
                {t.actions.cancel}
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
              >
                {savingEdit ? "..." : t.actions.save}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
