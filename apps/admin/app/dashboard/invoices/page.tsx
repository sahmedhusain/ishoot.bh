import * as React from 'react';
import Link from 'next/link';
import { getAllInvoices, getFinancialSummary } from '@ishoot/database';
import { Card, Button, StatusBadge, CurrencyDisplay } from '@ishoot/ui';
import { Plus, Eye, CreditCard } from 'lucide-react';

export default async function InvoicesPage() {
  const [invoices, finance] = await Promise.all([
    getAllInvoices(),
    getFinancialSummary(),
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Invoicing Studio
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Commercial billing, multi-currency invoices (BHD, SAR, AED, USD), discounts, and regulatory tax management.
          </p>
        </div>

        <Link href="/dashboard/invoices/new">
          <Button variant="primary" size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Financial Health Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1">
          <div className="text-xs text-[#9EADA9]">Total Outstanding Balance</div>
          <div className="text-2xl font-bold text-white font-mono">
            <CurrencyDisplay amount={finance.outstanding} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">Across pending & partial invoices</div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1">
          <div className="text-xs text-[#9EADA9]">Overdue Invoices</div>
          <div className={`text-2xl font-bold font-mono ${finance.overdue > 0 ? 'text-rose-400' : 'text-[#10B981]'}`}>
            <CurrencyDisplay amount={finance.overdue} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">{finance.overdue > 0 ? 'Action required' : 'Zero overdue payments'}</div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 space-y-1">
          <div className="text-xs text-[#9EADA9]">Discounts Applied</div>
          <div className="text-2xl font-bold text-[#09937F] font-mono">
            <CurrencyDisplay amount={finance.discountsGiven} currency="BHD" />
          </div>
          <div className="text-[11px] text-[#9EADA9]/60">Approved commercial client discounts</div>
        </Card>
      </div>

      {/* Invoices Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">Invoice #</th>
              <th className="p-4 text-start">Client</th>
              <th className="p-4 text-start">Issue / Due Date</th>
              <th className="p-4 text-end">Total Amount</th>
              <th className="p-4 text-end">Balance Due</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 font-mono font-bold text-white">
                  <Link href={`/dashboard/invoices/${inv.id}`} className="hover:text-[#09937F] transition-colors">
                    {inv.invoice_number}
                  </Link>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-white">
                    {inv.contact?.company || inv.contact?.full_name || 'Client'}
                  </div>
                  <div className="text-[11px] text-[#9EADA9]">{inv.contact?.email}</div>
                </td>
                <td className="p-4 text-[#9EADA9] font-mono text-[11px]">
                  <div>{inv.issue_date}</div>
                  <div className="text-white/40">Due: {inv.due_date}</div>
                </td>
                <td className="p-4 text-end font-mono font-bold text-white">
                  <CurrencyDisplay amount={inv.total_amount} currency={inv.currency} />
                </td>
                <td className="p-4 text-end font-mono font-bold">
                  {inv.amount_due > 0 ? (
                    <span className="text-amber-400">
                      <CurrencyDisplay amount={inv.amount_due} currency={inv.currency} />
                    </span>
                  ) : (
                    <span className="text-[#10B981]">0.000 {inv.currency}</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="p-4 text-end">
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#09937F]/20 text-[#9EADA9] hover:text-[#09937F] transition-colors text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View & Dispatch</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
