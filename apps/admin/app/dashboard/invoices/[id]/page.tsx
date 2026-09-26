import * as React from 'react';
import { notFound } from 'next/navigation';
import { getInvoiceById, getCompanySettings, getAllPayments } from '@ishoot/database';
import { InvoiceDetailView } from '../../../../components/invoices/InvoiceDetailView';

export const dynamic = 'force-dynamic';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;

  const [invoice, company, allPayments] = await Promise.all([
    getInvoiceById(id),
    getCompanySettings(),
    getAllPayments(),
  ]);

  if (!invoice || !company) {
    notFound();
  }

  const invoicePayments = allPayments.filter((p) => p.invoice_id === invoice.id);

  return (
    <InvoiceDetailView
      invoice={invoice}
      company={company}
      payments={invoicePayments}
    />
  );
}
