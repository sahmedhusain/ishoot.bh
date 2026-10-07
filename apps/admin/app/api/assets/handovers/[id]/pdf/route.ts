import { NextRequest, NextResponse } from "next/server";
import { canDecideApproval, createActivityLog, db, getAssetHandover, getCompanySettings, measureOperation } from "@ishoot/database";
import { getCurrentUser, hasPermission } from "../../../../../../lib/auth";
import { generateAssetHandoverPdf } from "../../../../../../lib/pdf/asset-handover-pdf";

export const runtime = "nodejs";

/** The handover form as PDF for staff with asset access, the employee in it and its approvers. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return measureOperation("admin:assets/handovers/[id]/pdf:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    const { id } = await params;
    const handover = await getAssetHandover(id);
    if (!handover) return new NextResponse(null, { status: 404 });
    const approval = await db.approvalRequest.findFirst({ where: { targetType: "asset_handover", targetId: id }, orderBy: { revision: "desc" } });
    const allowed = (await hasPermission("assets", "read")) || handover.employee.user_id === user.id || (approval ? canDecideApproval(approval, user) || approval.approverIds.includes(user.id) : false);
    if (!allowed) return new NextResponse(null, { status: 403 });
    const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const download = request.nextUrl.searchParams.get("download") === "true";
    const buffer = await generateAssetHandoverPdf(handover, await getCompanySettings(), locale);
    if (download) await createActivityLog({ user_id: user.id, action: "export", entity_type: "asset_handover", entity_id: id, details: { locale } });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${handover.reference}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
