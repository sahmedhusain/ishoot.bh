import { NextRequest, NextResponse } from "next/server";
import {
  measureOperation,
  getMinuteOfMeetingById,
  getCompanySettings,
  createActivityLog,
  requireFeatureEnabled,
} from "@platform/database";
import { getCurrentUser, hasPermission } from "../../../../../lib/auth";
import { generateMomPdf } from "../../../../../lib/pdf/mom-pdf";

/** Minutes of meeting as PDF, in the viewer's language; the same file is printed, downloaded and e-mailed. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:moms/[id]/pdf:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    const download = request.nextUrl.searchParams.get("download") === "true";
    try {
      await requireFeatureEnabled("crm_deals");
    } catch {
      return new NextResponse(null, { status: 403 });
    }
    if (
      !(await hasPermission("moms", "read")) ||
      (download && !(await hasPermission("moms", "export")))
    )
      return new NextResponse(null, { status: 403 });
    const { id } = await params;
    const mom = await getMinuteOfMeetingById(id);
    if (!mom) return new NextResponse(null, { status: 404 });
    const locale =
      request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const buffer = await generateMomPdf(
      mom,
      await getCompanySettings(),
      locale,
    );
    if (download)
      await createActivityLog({
        user_id: user.id,
        action: "export",
        entity_type: "mom",
        entity_id: id,
        details: { locale },
      });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${mom.mom_number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
