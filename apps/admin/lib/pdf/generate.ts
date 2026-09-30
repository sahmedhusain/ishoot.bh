import * as React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdfDocument } from "./invoice-pdf";
import { ReceiptPdfDocument } from "./receipt-pdf";
import type {
  Invoice,
  Payment,
  CompanySettings,
} from "@ishoot/database/types";

export async function generateInvoicePdfBuffer(
  invoice: Invoice,
  company: CompanySettings,
): Promise<Buffer> {
  const element = React.createElement(InvoicePdfDocument, { invoice, company });
  return (await renderToBuffer(element as any)) as Buffer;
}

export async function generateReceiptPdfBuffer(
  payment: Payment,
  company: CompanySettings,
): Promise<Buffer> {
  const element = React.createElement(ReceiptPdfDocument, { payment, company });
  return (await renderToBuffer(element as any)) as Buffer;
}

