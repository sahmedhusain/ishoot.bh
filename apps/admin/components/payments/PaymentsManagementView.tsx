"use client";

import * as React from "react";
import Link from "next/link";
import type { Payment, CompanySettings, Invoice } from "@ishoot/database/types";
import {
  Card,
  Button,
  Modal,
  CurrencyDisplay,
  DateDisplay,
  Badge,
} from "@ishoot/ui";
import { ReceiptTemplate } from "./ReceiptTemplate";
import { DeliveryToolbar } from "../shared/DeliveryToolbar";
import { CreditCard, Eye, Plus, Search, CheckCircle2 } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface PaymentsManagementViewProps {
  initialPayments: Payment[];
  invoices: Invoice[];
  company: CompanySettings | null;
}

export function PaymentsManagementView({
  initialPayments,
  invoices,
  company,
}: PaymentsManagementViewProps) {
  const { t, locale } = useAdminLocale();

  const [payments, setPayments] = React.useState<Payment[]>(initialPayments);
  const [activeReceipt, setActiveReceipt] = React.useState<Payment | null>(
    null,
  );

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.nav.payments}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.paymentsView.subtitle}
          </p>
        </div>

        <Link href="/dashboard/payments/new">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.finance.recordPayment}</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.kpi.totalRevenue}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            <CurrencyDisplay amount={totalCollected} currency="BHD" />
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            {t.kpi.revenueDesc}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.paymentsView.issuedReceipts}</span>
            <div className="w-8 h-8 rounded-lg bg-[#09937F]/10 flex items-center justify-center text-[#09937F]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {payments.length}
          </div>
          <div className="text-[11px] text-[#09937F]">
            {t.paymentsView.allReconciled}
          </div>
        </Card>

        <Card className="p-6 bg-[#0B1210] border border-white/10 space-y-2 rounded-3xl">
          <div className="flex items-center justify-between text-xs text-[#9EADA9]">
            <span>{t.paymentsView.invoicesInPlay}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {invoices.length}
          </div>
          <div className="text-[11px] text-amber-400">
            {t.paymentsView.activeBilling}
          </div>
        </Card>
      </div>

      <div className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">{t.finance.receiptNumber}</th>
              <th className="p-4 text-start">{t.finance.invoiceNumber}</th>
              <th className="p-4 text-start">{t.finance.client}</th>
              <th className="p-4 text-start">{t.finance.paymentDate}</th>
              <th className="p-4 text-start">{t.finance.paymentMethod}</th>
              <th className="p-4 text-end">{t.paymentsView.amountReceived}</th>
              <th className="p-4 text-end">{t.paymentsView.viewReceipt}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="p-4 font-mono font-bold text-[#09937F]">
                  {payment.receipt_number}
                </td>
                <td className="p-4 font-mono">
                  {payment.invoice ? (
                    <Link
                      href={`/dashboard/invoices/${payment.invoice_id}`}
                      className="text-white hover:text-[#09937F] hover:underline"
                    >
                      {payment.invoice.invoice_number}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4 font-bold text-white">
                  {payment.invoice?.contact?.full_name ||
                    t.paymentsView.directSettlement}
                </td>
                <td className="p-4 font-mono text-[#9EADA9]">
                  <DateDisplay date={payment.payment_date} locale={locale} />
                </td>
                <td className="p-4">
                  <Badge variant="outline">
                    {payment.payment_method.replace("_", " ").toUpperCase()}
                  </Badge>
                </td>
                <td className="p-4 text-end font-mono font-bold text-emerald-400 text-sm">
                  +
                  <CurrencyDisplay
                    amount={Number(payment.amount)}
                    currency="BHD"
                  />
                </td>
                <td className="p-4 text-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveReceipt(payment)}
                    className="gap-1 text-[#9EADA9] hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.actions.view}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeReceipt && company && (
        <Modal
          isOpen={true}
          onClose={() => setActiveReceipt(null)}
          title={`${t.finance.paymentReceipt} — ${activeReceipt.receipt_number}`}
          className="max-w-2xl"
        >
          <div className="space-y-6">
            <ReceiptTemplate
              payment={activeReceipt}
              company={company}
              locale={locale}
            />
            <DeliveryToolbar
              documentType="receipt"
              clientEmail={
                activeReceipt.invoice?.contact?.email || "finance@ishoot.bh"
              }
              clientPhone={
                activeReceipt.invoice?.contact?.phone || "+97339000000"
              }
              clientName={activeReceipt.invoice?.contact?.full_name || "Client"}
              documentNumber={activeReceipt.receipt_number}
              amountFormatted={`${Number(activeReceipt.amount).toFixed(3)} BHD`}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
