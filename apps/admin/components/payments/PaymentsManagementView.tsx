"use client";
import Link from "next/link";
import type { PaymentListRow } from "@ishoot/database";
import { CurrencyDisplay, DateDisplay } from "@ishoot/ui";
import { useAdminLocale } from "../../hooks/useAdminLocale";
export function PaymentsManagementView({ initialPayments, totals, receiptCount, invoiceCount }: { initialPayments: PaymentListRow[]; totals: { currency: string; amount: number }[]; receiptCount: number; invoiceCount: number }) {
  const { t, locale } = useAdminLocale();
  return <div className="space-y-6 max-w-7xl mx-auto pb-16">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">{t.nav.payments}</h1><Link className="rounded-full bg-[#014842] text-white px-4 py-2 text-xs" href="/dashboard/payments/new">{t.finance.recordPayment}</Link></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      <div className="rounded-xl border p-5"><p className="text-xs">{t.kpi.totalRevenue}</p>{totals.map((v) => <div key={v.currency} className="text-xl font-bold"><CurrencyDisplay amount={v.amount} currency={v.currency as any} /></div>)}</div>
      <div className="rounded-xl border p-5"><p className="text-xs">{t.paymentsView.issuedReceipts}</p><p className="text-xl font-bold">{receiptCount}</p></div>
      <div className="rounded-xl border p-5"><p className="text-xs">{t.paymentsView.invoicesInPlay}</p><p className="text-xl font-bold">{invoiceCount}</p></div>
    </div>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-xs"><thead><tr>{[t.finance.receiptNumber, t.finance.invoiceNumber, t.finance.client, t.finance.paymentDate, t.finance.paymentMethod, t.paymentsView.amountReceived, t.paymentsView.viewReceipt].map((label) => <th key={label} className="p-4 text-start">{label}</th>)}</tr></thead>
      <tbody>{initialPayments.map((p) => <tr key={p.id} className="border-t"><td className="p-4"><Link href={`/dashboard/payments/${p.id}`}>{p.receipt_number}</Link></td><td className="p-4"><Link href={`/dashboard/invoices/${p.invoice_id}`}>{p.invoiceNumber}</Link></td><td className="p-4">{p.customerName || "—"}</td><td className="p-4"><DateDisplay date={p.payment_date} locale={locale} /></td><td className="p-4">{p.payment_method.replaceAll("_", " ")}</td><td className="p-4"><CurrencyDisplay amount={p.amount} currency={p.currency} /></td><td className="p-4"><Link href={`/dashboard/payments/${p.id}`}>{t.actions.view}</Link></td></tr>)}</tbody>
    </table></div>
  </div>;
}
