import { measureOperation } from "@ishoot/database";
import { NextRequest,NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../lib/auth";
import {
getInvoiceByIdOrNumber,
getPaymentByIdOrNumber,
getCompanySettings,
hasPermission,
} from "@ishoot/database";
import { getTranslations } from "@ishoot/locales";
import {
generateInvoicePdfBuffer,
generateReceiptPdfBuffer,
} from "../../../../../lib/pdf/generate";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:documents/[id]/pdf:GET", async () => {
  // Messages follow the requester's admin language; the document itself keeps its own language.
  const trans = getTranslations(request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en");
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const docType = url.searchParams.get("type") || "invoice";
    if (!["invoice", "receipt"].includes(docType))
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 },
      );
    const resource = docType === "receipt" ? "payments" : "invoices";
    const isDownload = url.searchParams.get("download") === "true";
    if (
      !(await hasPermission(user.role, resource, "read", user.permissions)) ||
      (isDownload &&
        !(await hasPermission(user.role, resource, "export", user.permissions)))
    )
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const company = await getCompanySettings();

    if (docType === "receipt") {
      const payment = await getPaymentByIdOrNumber(id);
      if (!payment) {
        return NextResponse.json(
          { error: trans.api.pdf.receiptNotFound },
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
      return NextResponse.json(
        { error: trans.api.pdf.invoiceNotFound },
        { status: 404 },
      );
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
      { error: trans.api.pdf.generationError },
      { status: 500 },
    );
  }

  });
}
