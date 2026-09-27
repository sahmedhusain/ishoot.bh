import { NextRequest, NextResponse } from "next/server";
import {
  getInvoiceByIdOrNumber,
  getPaymentByIdOrNumber,
  getCompanySettings,
} from "@ishoot/database";
import {
  generateInvoicePdfBuffer,
  generateReceiptPdfBuffer,
} from "../../../../../lib/pdf/generate";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const docType = url.searchParams.get("type") || "invoice";
    const isDownload = url.searchParams.get("download") === "true";

    const company = await getCompanySettings();

    if (docType === "receipt") {
      const payment = await getPaymentByIdOrNumber(id);
      if (!payment) {
        return NextResponse.json(
          { error: "Receipt not found" },
          { status: 404 },
        );
      }

      const buffer = await generateReceiptPdfBuffer(payment, company);
      const fileName = `Receipt-${payment.receipt_number}.pdf`;

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
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const buffer = await generateInvoicePdfBuffer(invoice, company);
    const fileName = `Invoice-${invoice.invoice_number}.pdf`;

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
      { error: err.message || "Error generating PDF" },
      { status: 500 },
    );
  }
}
