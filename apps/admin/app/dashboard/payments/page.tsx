'use client';

import * as React from 'react';
import { getAllPayments, getCompanySettings, Payment, CompanySettings } from '@ishoot/database';
import { Card, Button, Modal, CurrencyDisplay } from '@ishoot/ui';
import { ReceiptTemplate } from '../../../components/payments/ReceiptTemplate';
import { DeliveryToolbar } from '../../../components/shared/DeliveryToolbar';
import { CreditCard, Eye, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function PaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [company, setCompany] = React.useState<CompanySettings | null>(null);
  const [activeReceipt, setActiveReceipt] = React.useState<Payment | null>(null);

  React.useEffect(() => {
    Promise.all([getAllPayments(), getCompanySettings()]).then(([pList, comp]) => {
      setPayments(pList);
      setCompany(comp);
    });
  }, []);

  const totalCollected = payments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Payments Ledger & Receipts
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Reconciled transactions, auto-numbered receipts (RCT), and multi-channel receipt dispatch.
          </p>
        </div>

        <div className="p-3 px-5 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-[#10B981]" />
          <div>
            <div className="text-[10px] text-[#9EADA9] uppercase font-mono">Total Liquid Cash Received</div>
            <div className="text-lg font-bold text-white font-mono">
              <CurrencyDisplay amount={totalCollected} currency="BHD" />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">Receipt #</th>
              <th className="p-4 text-start">Invoice #</th>
              <th className="p-4 text-start">Client</th>
              <th className="p-4 text-start">Date</th>
              <th className="p-4 text-start">Method</th>
              <th className="p-4 text-end">Amount</th>
              <th className="p-4 text-end">Receipt Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-mono font-bold text-[#10B981]">
                  {p.receipt_number}
                </td>
                <td className="p-4 font-mono">
                  <Link
                    href={`/dashboard/invoices/${p.invoice_id}`}
                    className="text-[#09937F] hover:underline"
                  >
                    {p.invoice?.invoice_number || 'Linked Invoice'}
                  </Link>
                </td>
                <td className="p-4 font-medium text-white">
                  {p.invoice?.contact?.company || p.invoice?.contact?.full_name || 'Client'}
                </td>
                <td className="p-4 text-[#9EADA9] font-mono">{p.payment_date}</td>
                <td className="p-4 uppercase font-mono text-[11px] text-[#9EADA9]">
                  {p.payment_method.replace('_', ' ')}
                </td>
                <td className="p-4 text-end font-mono font-bold text-white">
                  <CurrencyDisplay amount={p.amount} currency={p.currency} />
                </td>
                <td className="p-4 text-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveReceipt(p)}
                    className="gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Receipt</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal with Multi-channel Delivery */}
      {activeReceipt && company && (
        <Modal
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          title={`Receipt: ${activeReceipt.receipt_number}`}
          className="max-w-4xl p-8"
        >
          <div className="space-y-6">
            <DeliveryToolbar
              documentType="receipt"
              documentNumber={activeReceipt.receipt_number}
              clientName={activeReceipt.invoice?.contact?.company || activeReceipt.invoice?.contact?.full_name || 'Client'}
              clientEmail={activeReceipt.invoice?.contact?.email}
              clientPhone={activeReceipt.invoice?.contact?.phone}
              amountFormatted={`${activeReceipt.amount.toFixed(3)} ${activeReceipt.currency}`}
            />

            <div className="p-4 bg-[#050807] rounded-2xl border border-white/10 flex justify-center">
              <ReceiptTemplate payment={activeReceipt} company={company} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
