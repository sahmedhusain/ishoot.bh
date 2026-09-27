import * as React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { pdfStyles } from './shared-styles';
import type { Invoice, CompanySettings } from '@ishoot/database/types';

interface InvoicePdfProps {
  invoice: Invoice;
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

export function InvoicePdfDocument({ invoice, company }: InvoicePdfProps) {
  const currency = invoice.currency || company.default_currency || 'BHD';
  const decimals = company.currency_decimals ?? 3;
  const lineItems = invoice.line_items || [];
  const clientName =
    invoice.contact?.full_name ||
    invoice.deal?.contact?.full_name ||
    company.company_name_en;
  const clientCompany =
    invoice.contact?.company ||
    invoice.deal?.contact?.company ||
    '';
  const clientEmail =
    invoice.contact?.email ||
    invoice.deal?.contact?.email ||
    '';

  return (
    <Document title={`Invoice ${invoice.invoice_number} - ishoot`}>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header Letterhead */}
        <View style={pdfStyles.headerBanner}>
          <View>
            <Text style={pdfStyles.brandTitle}>
              ishoot<Text style={pdfStyles.brandDot}>.</Text>
            </Text>
            <Text style={pdfStyles.companySubtitle}>{company.company_name_en}</Text>
            <Text style={pdfStyles.companyMeta}>
              CR: {company.cr_number}
              {invoice.vat_enabled && company.vat_id ? ` • VAT: ${company.vat_id}` : ''}
            </Text>
          </View>

          <View style={pdfStyles.docTitleBlock}>
            <Text style={pdfStyles.docMainTitle}>TAX INVOICE</Text>
            <Text style={pdfStyles.docNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Metadata Grid */}
        <View style={pdfStyles.metaGrid}>
          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>BILLED TO</Text>
            <Text style={pdfStyles.metaValue}>{clientName}</Text>
            {clientCompany ? <Text style={pdfStyles.metaSub}>{clientCompany}</Text> : null}
            {clientEmail ? <Text style={pdfStyles.metaSub}>{clientEmail}</Text> : null}
          </View>

          <View style={pdfStyles.metaCard}>
            <Text style={pdfStyles.metaLabel}>INVOICE DETAILS</Text>
            <Text style={pdfStyles.metaSub}>Issue Date: {formatDate(invoice.issue_date)}</Text>
            <Text style={pdfStyles.metaSub}>Due Date: {formatDate(invoice.due_date)}</Text>
            <Text style={pdfStyles.metaSub}>
              Status: {(invoice.status || 'draft').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader}>
            <Text style={pdfStyles.colDesc}>DESCRIPTION</Text>
            <Text style={pdfStyles.colQty}>QTY</Text>
            <Text style={pdfStyles.colUnitPrice}>UNIT PRICE ({currency})</Text>
            <Text style={pdfStyles.colTotal}>TOTAL ({currency})</Text>
          </View>

          {lineItems.map((item, index) => (
            <View
              key={item.id || index}
              style={[pdfStyles.tableRow, index % 2 === 1 ? pdfStyles.tableRowAlt : {}]}
            >
              <Text style={pdfStyles.colDesc}>{item.description_en}</Text>
              <Text style={pdfStyles.colQty}>{item.quantity}</Text>
              <Text style={pdfStyles.colUnitPrice}>
                {formatAmount(item.unit_price, decimals)}
              </Text>
              <Text style={pdfStyles.colTotal}>
                {formatAmount(item.line_total, decimals)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals & Bank Coordinates */}
        <View style={pdfStyles.totalsContainer}>
          <View style={pdfStyles.bankBlock}>
            <Text style={pdfStyles.metaLabel}>BANK TRANSFER COORDINATES</Text>
            <Text style={pdfStyles.metaSub}>Bank: {company.bank_name || 'National Bank of Bahrain'}</Text>
            <Text style={pdfStyles.metaSub}>IBAN: {company.bank_iban || '-'}</Text>
            <Text style={pdfStyles.metaSub}>Account: {company.bank_account_number || '-'}</Text>
            <Text style={pdfStyles.metaSub}>SWIFT: {company.bank_swift || '-'}</Text>
          </View>

          <View style={pdfStyles.totalsBlock}>
            <View style={pdfStyles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>
                {currency} {formatAmount(invoice.subtotal, decimals)}
              </Text>
            </View>

            {invoice.discount_amount > 0 && (
              <View style={pdfStyles.totalRow}>
                <Text>Discount:</Text>
                <Text>
                  - {currency} {formatAmount(invoice.discount_amount, decimals)}
                </Text>
              </View>
            )}

            <View style={pdfStyles.totalRow}>
              <Text>VAT {invoice.vat_enabled ? `(${invoice.vat_percentage || 10}%)` : '(0%)'}:</Text>
              <Text>
                {invoice.vat_enabled
                  ? `${currency} ${formatAmount(invoice.vat_amount, decimals)}`
                  : 'N/A'}
              </Text>
            </View>

            <View style={pdfStyles.totalRowFinal}>
              <Text>TOTAL:</Text>
              <Text>
                {currency} {formatAmount(invoice.total_amount, decimals)}
              </Text>
            </View>

            {invoice.amount_paid > 0 && (
              <>
                <View style={pdfStyles.paidRow}>
                  <Text>Amount Paid:</Text>
                  <Text>
                    {currency} {formatAmount(invoice.amount_paid, decimals)}
                  </Text>
                </View>
                <View style={pdfStyles.dueRow}>
                  <Text>Balance Due:</Text>
                  <Text>
                    {currency} {formatAmount(invoice.amount_due, decimals)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text>Thank you for choosing ishoot Cinema Production.</Text>
          <Text>{company.website || 'https://ishoot.bh'} • {company.email || 'hello@ishoot.bh'}</Text>
        </View>
      </Page>
    </Document>
  );
}
