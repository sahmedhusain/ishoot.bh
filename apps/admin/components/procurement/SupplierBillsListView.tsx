"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { Card, CurrencyDisplay, Select, formatDate } from "@platform/ui";
import { BILL_STATUSES } from "@platform/database/constants/procurement";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { StatusPill } from "./StatusPill";

interface Row {
  id: string;
  number: string;
  supplier_ref: string;
  supplier: string;
  status: string;
  bill_date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
}

/** Purchasing → supplier bills. */
export function SupplierBillsListView({ rows, status, currency, canCreate }: { rows: Row[]; status: string; currency: string; canCreate: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.procurement.bills;
  const router = useRouter();
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canCreate && (
          <Link href={ROUTES.procurement.newBill()} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 h-9 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4" />
            {copy.new}
          </Link>
        )}
      </div>
      <Select aria-label={t.procurement.common.status} value={status} onChange={(e) => router.push(e.target.value ? `${ROUTES.procurement.bills}?status=${e.target.value}` : ROUTES.procurement.bills)} className="rounded-xl sm:w-52">
        <option value="">{copy.allStatuses}</option>
        {BILL_STATUSES.map((s) => <option key={s} value={s}>{(t.procurement.statuses as Record<string, string>)[s]}</option>)}
      </Select>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Receipt className="w-8 h-8 text-ink-muted" aria-hidden="true" />
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={ROUTES.procurement.bill(b.id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-ink/[0.02]">
                  <span className="font-mono text-xs font-semibold text-ink" dir="ltr">{b.number}</span>
                  <StatusPill status={b.status} />
                  <span className="text-sm text-ink">{b.supplier}</span>
                  {b.supplier_ref && <span className="font-mono text-xs text-ink-muted" dir="ltr">{b.supplier_ref}</span>}
                  {b.due_date && <span className="text-xs text-ink-muted">{`${copy.dueDate}: ${formatDate(b.due_date, locale)}`}</span>}
                  <span className="ms-auto text-sm font-semibold"><CurrencyDisplay amount={b.total} currency={currency} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
