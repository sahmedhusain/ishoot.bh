import { NextRequest, NextResponse } from "next/server";
import { serverMessages } from "@platform/locales";
import { getCompanySettings, getPurchaseOrder, hasPermission, isFeatureEnabled, measureOperation } from "@platform/database";
import { getCurrentUser } from "../../../../../../lib/auth";
import { generatePurchaseOrderPdf } from "../../../../../../lib/pdf/purchase-order-pdf";

/** The purchase order PDF, in the company's main language unless another is asked for. */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return measureOperation("admin:procurement/orders/[id]/pdf:GET", async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: serverMessages.unauthorized }, { status: 401 });
    const download = request.nextUrl.searchParams.get("download") === "true";
    if (!(await isFeatureEnabled("procurement")) || !(await hasPermission(user.role, "procurement", "read", user.permissions)) || (download && !(await hasPermission(user.role, "procurement", "export", user.permissions))))
      return NextResponse.json({ error: serverMessages.runtimeForbidden }, { status: 403 });
    const { id } = await context.params;
    const [order, company] = await Promise.all([getPurchaseOrder(id), getCompanySettings()]);
    if (!order) return NextResponse.json({ error: serverMessages.procurementDocumentMissing }, { status: 404 });
    const asked = request.nextUrl.searchParams.get("lang");
    const locale = asked === "ar" || asked === "en" ? asked : company.primary_language === "ar" ? "ar" : "en";
    const buffer = await generatePurchaseOrderPdf(order, company, locale);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="PurchaseOrder-${order.number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  });
}
