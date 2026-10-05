"use client";
import Link from "next/link";
import type { Expense } from "@ishoot/database/types";
import { Plus, Receipt } from "lucide-react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

interface RelatedExpensesPanelProps {
  dealId?: string;
  clientId?: string;
  items: Expense[];
  totals: { currency: string; amount: number }[];
  canWrite: boolean;
}

/** Costs recorded against a deal or client, shown in its file. */
export function RelatedExpensesPanel({ dealId, clientId, items, totals, canWrite }: RelatedExpensesPanelProps) {
  const { t, locale } = useAdminLocale();
  const addHref = `${ROUTES.expenses.create}?${dealId ? `dealId=${encodeURIComponent(dealId)}` : `clientId=${encodeURIComponent(clientId!)}`}`;
  return (
    <section className="max-w-7xl mx-auto mt-8 rounded-3xl border border-ink/10 bg-surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-ink/10">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-ink">{t.relatedExpenses.title}</h2>
          <span className="text-xs text-ink-muted">({items.length})</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {totals.map((row) => (
            <span key={row.currency} className="text-xs text-ink-muted">
              {t.relatedExpenses.approvedTotal}: <strong className="text-rose-500">{money(row.amount, row.currency)}</strong>
            </span>
          ))}
          {canWrite && (
            <Link href={addHref} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-white text-xs font-semibold hover:bg-accent-hover">
              <Plus className="w-3.5 h-3.5" />
              {t.actions.addExpense}
            </Link>
          )}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="p-6 text-xs text-ink-muted text-center">{t.relatedExpenses.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <tbody className="divide-y divide-ink/5">
              {items.map((e) => (
                <tr key={e.id}>
                  <td className="p-3 ps-5 text-ink-muted whitespace-nowrap">{e.expense_date}</td>
                  <td className="p-3">
                    <Link href={ROUTES.expenses.list({ highlight: e.id })} className="font-semibold text-ink hover:text-accent">
                      {locale === "ar" ? e.description_ar || e.description_en : e.description_en}
                    </Link>
                    {clientId && e.deal_title && <div className="text-[11px] text-ink-muted">{e.deal_title}</div>}
                  </td>
                  <td className="p-3 text-ink-muted">{e.category ? (locale === "ar" ? e.category.name_ar : e.category.name_en) : "—"}</td>
                  <td className="p-3 text-ink-muted">{e.status === "approved" ? "" : t.approvals.status[e.status as "pending" | "rejected"] ?? e.status}</td>
                  <td className="p-3 pe-5 text-end font-bold text-rose-500 whitespace-nowrap">{money(e.amount, e.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
