"use client";
import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import type { PaymentListRow } from "@ishoot/database";
import { CurrencyDisplay, DateDisplay } from "@ishoot/ui";
import { Banknote, CreditCard, FileText, Globe, Landmark, Plus, Receipt, ReceiptText, Wallet } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const METHOD_ICONS: Record<string, typeof Banknote> = {
  bank_transfer: Landmark,
  cheque: ReceiptText,
  cash: Banknote,
  card: CreditCard,
  online: Globe,
};

export function PaymentsManagementView({ initialPayments, totals, receiptCount, invoiceCount, controls }: { initialPayments: PaymentListRow[]; totals: { currency: string; amount: number }[]; receiptCount: number; invoiceCount: number; controls?: React.ReactNode }) {
  const { t, locale } = useAdminLocale();
  const methodLabel: Record<string, string> = {
    bank_transfer: t.paymentRecorder.bankTransfer,
    cheque: t.paymentRecorder.cheque,
    cash: t.paymentRecorder.cash,
    card: t.paymentRecorder.card,
    online: t.paymentRecorder.online,
  };
  const columns = [t.finance.receiptNumber, t.finance.invoiceNumber, t.finance.client, t.finance.paymentDate, t.finance.paymentMethod, t.paymentsView.amountReceived];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">{t.nav.payments}</h1>
          <p className="text-sm text-ink-muted max-w-2xl">{t.paymentsView.subtitle}</p>
        </div>
        <Link
          className="inline-flex items-center gap-2 self-start sm:self-auto h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
          href={ROUTES.payments.create()}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {t.finance.recordPayment}
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Wallet} tone="bg-accent/10 text-accent" label={t.kpi.totalRevenue} hint={t.paymentsView.allReconciled}>
          {totals.length ? totals.map((v) => (
            <div key={v.currency}><CurrencyDisplay amount={v.amount} currency={v.currency as never} /></div>
          )) : <CurrencyDisplay amount={0} currency="BHD" />}
        </Kpi>
        <Kpi icon={Receipt} tone="bg-sky-500/10 text-sky-600 dark:text-sky-400" label={t.paymentsView.issuedReceipts} hint={t.paymentsView.receiptsCount.replace("{n}", String(receiptCount))}>
          {receiptCount}
        </Kpi>
        <Kpi icon={FileText} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" label={t.paymentsView.invoicesInPlay} hint={t.paymentsView.activeBilling}>
          {invoiceCount}
        </Kpi>
      </div>

      {controls && <div className="[&>div]:mb-0">{controls}</div>}

      <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken/70 text-ink-muted">
              <tr>
                {columns.map((label, i) => (
                  <th key={label} scope="col" className={`px-5 py-3 text-xs font-semibold whitespace-nowrap ${i === columns.length - 1 ? "text-end" : "text-start"}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {initialPayments.map((p) => {
                const Icon = METHOD_ICONS[p.payment_method] ?? Banknote;
                return (
                  <tr key={p.id} className="group hover:bg-accent/5 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={ROUTES.payments.detail(p.id)} dir="ltr" className="font-mono text-xs font-semibold text-primary dark:text-mint hover:underline">{p.receipt_number}</Link>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={ROUTES.invoices.detail(p.invoice_id)} dir="ltr" className="font-mono text-xs text-ink-muted hover:text-ink hover:underline">{p.invoiceNumber}</Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink">{p.customerName || "—"}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-ink-muted"><DateDisplay date={p.payment_date} locale={locale} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink">
                        <Icon className="w-3.5 h-3.5 text-accent" aria-hidden />
                        {methodLabel[p.payment_method] ?? p.payment_method.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-end whitespace-nowrap font-semibold text-ink">
                      <CurrencyDisplay amount={p.amount} currency={p.currency} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!initialPayments.length && (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <Receipt className="w-8 h-8 text-ink-muted" aria-hidden />
            <p className="text-sm text-ink-muted">{t.paymentsView.empty}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, hint, children }: { icon: typeof Wallet; tone: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-white dark:bg-surface-raised p-5 shadow-xs flex items-start gap-4">
      <span className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${tone}`} aria-hidden>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        <div className="text-xl font-bold text-ink tabular-nums">{children}</div>
        <p className="text-[11px] text-ink-muted truncate">{hint}</p>
      </div>
    </div>
  );
}
