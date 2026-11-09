import { NextRequest, NextResponse } from "next/server";
import {
  getCompanySettings,
  getSignatureRequestSession,
  measureOperation,
} from "@platform/database";
import {
  consumeAbuseLimit,
  trustedClientIp,
} from "@platform/database/services/abuse-limits";
import { generateAssetHandoverPdf } from "../../../../../lib/pdf/asset-handover-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGNED_COPY_DAYS = 30;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  return measureOperation("admin:acknowledge/[token]/pdf:GET", async () => {
    const { token } = await params;
    try {
      await consumeAbuseLimit(
        "handover-sign-pdf",
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
    const session = await getSignatureRequestSession(token);
    const recentlySigned =
      session.state === "signed" &&
      session.record.signedAt &&
      Date.now() - session.record.signedAt.getTime() <
        SIGNED_COPY_DAYS * 86_400_000;
    if (session.state !== "open" && !recentlySigned)
      return new NextResponse(null, { status: 410 });
    const { handover } = session as Extract<
      typeof session,
      { handover: unknown }
    >;
    const locale =
      request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
    const buffer = await generateAssetHandoverPdf(
      handover,
      await getCompanySettings(),
      locale,
    );
    const download = request.nextUrl.searchParams.get("download") === "true";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${handover.reference}-${locale.toUpperCase()}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  });
}
