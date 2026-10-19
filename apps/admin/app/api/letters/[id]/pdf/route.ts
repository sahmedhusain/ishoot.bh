import { NextRequest, NextResponse } from "next/server";
import { getOfficialLetter, getCompanySettings } from "@platform/database";
import { getCurrentUser, hasPermission } from "../../../../../lib/auth";
import { generateCommunicationPdf } from "../../../../../lib/pdf/communications-pdf";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  if (!(await hasPermission("letters", "export")))
    return new NextResponse(null, { status: 403 });
  const { id } = await params;
  const item = await getOfficialLetter(id);
  if (!item) return new NextResponse(null, { status: 404 });
  const lang = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  if (!item.languages.includes(lang))
    return new NextResponse(null, { status: 404 });
  const bytes = await generateCommunicationPdf(
    item,
    await getCompanySettings(),
    lang,
  );
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${req.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline"}; filename="${item.reference}-${lang}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
