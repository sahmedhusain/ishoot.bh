import { NextRequest, NextResponse } from "next/server";
import {
  measureOperation,
  getSigningSession,
  getQuotationById,
  getInvoiceById,
  getCompanySettings,
} from "@platform/database";
import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@platform/database/services/abuse-limits";
import {
  generateInvoicePdfBuffer,
  generateQuotationPdfBuffer,
} from "../../../../../lib/pdf/generate";
import { signingConsent } from "../../../../../lib/client-signing";

export const dynamic = "force-dynamic";

const SIGNED_COPY_DAYS = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  return measureOperation("admin:sign/[token]/pdf:GET", async () => {
    const { token } = await params;
    try {
      await consumeAbuseLimit(
        "client-sign-pdf",
        `${token}:${trustedClientIp(request.headers) ?? "unknown"}`,
        30,
        600,
      );
    } catch {
      return new NextResponse(null, {
        status: 429,
        headers: { "Retry-After": "600" },
      });
    }
    const session = await getSigningSession(token, signingConsent);
    const recentlySigned =
      session.state === "signed" &&
      session.record.signedAt &&
      Date.now() - session.record.signedAt.getTime() <
        SIGNED_COPY_DAYS * 86_400_000;
    if (session.state !== "open" && !recentlySigned)
      return new NextResponse(null, { status: 410 });
    const { doc } = session as Extract<typeof session, { doc: unknown }>;
    const company = await getCompanySettings();
    let buffer: Buffer;
    if (doc.type === "quotation") {
      const quotation = await getQuotationById(doc.id);
      if (!quotation) return new NextResponse(null, { status: 404 });
      buffer = await generateQuotationPdfBuffer(quotation, company);
    } else {
      const invoice = await getInvoiceById(doc.id);
      if (!invoice) return new NextResponse(null, { status: 404 });
      buffer = await generateInvoicePdfBuffer(invoice, company);
    }
    const download = request.nextUrl.searchParams.get("download") === "true";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.number}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
