import * as React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './shared-styles';
import type { Payment, CompanySettings } from '@ishoot/database/types';

interface ReceiptPdfProps {
  payment: Payment;
  company: CompanySettings;
}

function formatAmount(val: number | string | undefined, decimals = 3): string {
  const num = typeof val === 'number' ? val : parseFloat(val as string) || 0;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export function ReceiptPdfDocument({ payment, company }: ReceiptPdfProps) {
  const currency = payment.currency || company.default_currency || 'BHD';
  const decimals = company.currency_decimals ?? 3;
  const invoice = payment.invoice;
  const clientName =
    invoice?.contact?.full_name ||
    invoice?.deal?.contact?.full_name ||
    company.company_name_en;

  const previouslyPaid = invoice
    ? Math.max(0, invoice.total_amount - invoice.amount_due - payment.amount)
    : 0;

  return (
    <Document title={`Receipt ${payment.receipt_number} - ishoot`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header Letterhead */}
        <View style={pdfStyles.headerBanner}>
          <View>
            <Text style={pdfStyles.brandTitle}>
              ishoot<Text style={pdfStyles.brandDot}>.</Text>
            </Text>
            <Text style={pdfStyles.companySubtitle}>{company.company_name_en}</Text>
            <Text style={pdfStyles.companyMeta}>CR: {company.cr_number}</Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>PAYMENT RECEIPT</Text>
            <Text style={pdfStyles.docNumber}>{payment.receipt_number}</Text>
          </View>
        </View>

        {/* Metadata Grid */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>RECEIVED FROM</Text>
            <Text style={pdfStyles.metaValue}>{clientName}</Text>
            {invoice?.contact?.company ? (
              <Text style={pdfStyles.metaSub}>{invoice.contact.company}</Text>
            ) : null}
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>PAYMENT DETAILS</Text>
            <Text style={pdfStyles.metaSub}>Date: {formatDate(payment.payment_date)}</Text>
            <Text style={pdfStyles.metaSub}>
              Method: {payment.payment_method.replace('_', ' ').toUpperCase()}
            </Text>
            {payment.reference_number ? (
              <Text style={pdfStyles.metaSub}>Ref / Cheque: {payment.reference_number}</Text>
            ) : null}
            {invoice ? (
              <Text style={pdfStyles.metaSub}>Linked Invoice: {invoice.invoice_number}</Text>
            ) : null}
          </View>
        </View>

        {/* Payment Summary Box */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={{ flex: 3 }}>PAYMENT DESCRIPTION</Text>
            <Text style={{ flex: 2, textAlign: 'right' }}>AMOUNT RECEIVED ({currency})</Text>
          </View>

          <View style={[pdfStyles.tableRow, { paddingVertical: 12 }]}>
            <View style={{ flex: 3 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 10 }}>
                Direct Production Payment
              </Text>
              {invoice ? (
                <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 3 }}>
                  Settlement toward Invoice {invoice.invoice_number}
                </Text>
              ) : null}
              {payment.notes ? (
                <Text style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>
                  Notes: {payment.notes}
                </Text>
              ) : null}
            </View>
            <Text
              style={{
                flex: 2,
                textAlign: 'right',
                fontWeight: 'bold',
                fontSize: 12,
                color: '#014842',
              }}
            >
              {currency} {formatAmount(payment.amount, decimals)}
            </Text>
          </View>
        </View>

        {/* Ledger Reconciliation Details */}
        {invoice && (
          <View style={[pdfStyles.totalsContainer, { justifyContent: 'flex-end' }]}>
            <View style={pdfStyles.totalsBlock}>
              <View style={pdfStyles.totalRow}>
                <Text>Total Invoice:</Text>
                <Text>
                  {currency} {formatAmount(invoice.total_amount, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.totalRow}>
                <Text>Previously Paid:</Text>
                <Text>
                  {currency} {formatAmount(previouslyPaid, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.totalRow}>
                <Text>This Payment:</Text>
                <Text style={{ fontWeight: 'bold', color: '#059669' }}>
                  {currency} {formatAmount(payment.amount, decimals)}
                </Text>
              </View>

              <View style={pdfStyles.dueRow}>
                <Text>Remaining Balance:</Text>
                <Text>
                  {currency} {formatAmount(invoice.amount_due, decimals)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Verification Note */}
        <View
          style={{
            marginTop: 15,
            padding: 10,
            backgroundColor: '#F0FDF4',
            borderRadius: 6,
            borderWidth: 1,
            borderColor: '#BBF7D0',
          }}
        >
          <Text style={{ fontSize: 8, color: '#166534', fontWeight: 'bold' }}>
            ✓ Funds verified and deposited to company accounts
          </Text>
          <Text style={{ fontSize: 7.5, color: '#4B5563', marginTop: 2 }}>
            This electronically generated receipt serves as proof of payment issued by ishoot Cinema Production.
          </Text>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Official Payment Receipt • ishoot Cinema Production</Text>
          <Text>{company.website || 'https://ishoot.bh'} • {company.email || 'hello@ishoot.bh'}</Text>
        </View>
      </Page>
    </Document>
  );
}
