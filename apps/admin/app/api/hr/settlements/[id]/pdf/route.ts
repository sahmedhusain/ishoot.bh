import { NextRequest, NextResponse } from "next/server";
import {
  canDecideApproval,
  createActivityLog,
  getCompanySettings,
  getFinalSettlement,
  measureOperation,
} from "@platform/database";
import { getCurrentUser, hasPermission } from "../../../../../../lib/auth";
import { generateFinalSettlementPdf } from "../../../../../../lib/pdf/final-settlement-pdf";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:hr/settlements/[id]/pdf:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return new NextResponse(null, { status: 401 });
    const { id } = await params;
    const settlement = await getFinalSettlement(id);
    if (!settlement) return new NextResponse(null, { status: 404 });
    const approval: any = null;
    const allowed =
      (await hasPermission("payroll", "read")) ||
      settlement.employee.userId === user.id ||
      (approval
        ? canDecideApproval(approval, user) ||
          approval.approverIds.includes(user.id)
        : false);
    if (!allowed) return new NextResponse(null, { status: 403 });
    const locale =
      request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const download = request.nextUrl.searchParams.get("download") === "true";
    const buffer = await generateFinalSettlementPdf(
      settlement,
      await getCompanySettings(),
      locale,
    );
    if (download)
      await createActivityLog({
        user_id: user.id,
        action: "export",
        entity_type: "final_settlement",
        entity_id: id,
        details: { locale },
      });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${settlement.reference}-${locale.toUpperCase()}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
