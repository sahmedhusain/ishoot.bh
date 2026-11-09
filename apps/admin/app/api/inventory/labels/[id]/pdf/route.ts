import { NextRequest, NextResponse } from "next/server";
import { serverMessages } from "@platform/locales";
import {
  getCompanySettings,
  getSerialLabelJob,
  hasPermission,
  isFeatureEnabled,
  measureOperation,
} from "@platform/database";
import { getCurrentUser } from "../../../../../../lib/auth";
import { generateStockLabelsPdf, type StockLabelJobData } from "../../../../../../lib/pdf/stock-label-pdf";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return measureOperation("admin:inventory/labels/[id]/pdf:GET", async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: serverMessages.unauthorized },
        { status: 401 },
      );
    }
    if (
      !(await isFeatureEnabled("inventory")) ||
      !(await hasPermission(user.role, "inventory", "read", user.permissions))
    ) {
      return NextResponse.json(
        { error: serverMessages.runtimeForbidden },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
    const [job, company] = await Promise.all([
      getSerialLabelJob(id, user.id),
      getCompanySettings(),
    ]);

    const pdfBuffer = await generateStockLabelsPdf(
      job as unknown as StockLabelJobData,
      company,
      locale,
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="labels-${id}.pdf"`,
      },
    });
  });
}
