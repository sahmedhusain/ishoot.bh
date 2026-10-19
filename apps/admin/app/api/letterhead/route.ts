import { NextRequest, NextResponse } from "next/server";
import { getCompanySettings } from "@ishoot/database";
import { getCurrentUser } from "../../../lib/auth";
import { generateLetterheadPdf } from "../../../lib/pdf/communications-pdf";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!(await getCurrentUser())) return new NextResponse(null, { status: 401 });
  const lang = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const bytes = await generateLetterheadPdf(await getCompanySettings(), lang);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline"}; filename="Letterhead-${lang}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
