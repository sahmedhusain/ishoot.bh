import { serverMessages, getTranslations } from "@platform/locales";
import { measureOperation } from "@platform/database";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import {
  getInvoiceByIdOrNumber,
  getPaymentByIdOrNumber,
  getQuotationById,
  getCompanySettings,
  hasPermission,
} from "@platform/database";

import {
  generateInvoicePdfBuffer,
  generateReceiptPdfBuffer,
  generateQuotationPdfBuffer,
} from "../../../../../lib/pdf/generate";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:documents/[id]/pdf:GET", async () => {
    const reqLocale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const trans: any = getTranslations(reqLocale);

    try {
      const { id } = await context.params;
      const url = new URL(request.url);
      const docType = url.searchParams.get("type") || "invoice";

      if (!["invoice", "receipt", "quotation"].includes(docType)) {
        return NextResponse.json(
          { error: serverMessages.runtimeInvalidDocumentType },
          { status: 400 },
        );
      }

      // Check auth if requested from admin dashboard
      const user = await getCurrentUser();
      const isDownload = url.searchParams.get("download") === "true";

      if (user) {
        const resource =
          docType === "receipt"
            ? "payments"
            : docType === "quotation"
              ? "quotations"
              : "invoices";

        if (
          !(await hasPermission(user.role, resource, "read", user.permissions)) ||
          (isDownload &&
            !(await hasPermission(
              user.role,
              resource,
              "export",
              user.permissions,
            )))
        ) {
          return NextResponse.json(
            { error: serverMessages.runtimeForbidden },
            { status: 403 },
          );
        }
      }

      const company = await getCompanySettings();

      if (docType === "quotation") {
        const quotation = await getQuotationById(id);
        if (!quotation) {
          return NextResponse.json(
            { error: trans?.api?.pdf?.quotationNotFound ?? "Quotation not found." },
            { status: 404 },
          );
        }
        const buffer = await generateQuotationPdfBuffer(quotation, company);
        const fileName = `Quotation-${quotation.quotationNumber}.pdf`;
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      if (docType === "receipt") {
        const payment = await getPaymentByIdOrNumber(id);
        if (!payment) {
          return NextResponse.json(
            { error: trans?.api?.pdf?.receiptNotFound ?? "Receipt not found." },
            { status: 404 },
          );
        }

        const buffer = await generateReceiptPdfBuffer(payment, company);
        const fileName = `Receipt-${payment.receipt_number || payment.id}.pdf`;

        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
      }

      const invoice = await getInvoiceByIdOrNumber(id);
      if (!invoice) {
        return NextResponse.json(
          { error: trans?.api?.pdf?.invoiceNotFound ?? "Invoice not found." },
          { status: 404 },
        );
      }

      const buffer = await generateInvoicePdfBuffer(invoice, company);
      const fileName = `Invoice-${invoice.invoice_number || invoice.id}.pdf`;

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (err: any) {
      console.error("PDF generation error:", err);
      return NextResponse.json(
        { error: trans?.api?.pdf?.generationError ?? "Error generating PDF." },
        { status: 500 },
      );
    }
  });
}
