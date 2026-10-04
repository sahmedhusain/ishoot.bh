import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../../lib/auth";
import { getAccessibleSalaryDocument } from "../../../../../../lib/salary-documents";
import { generateSalaryDocumentPdf } from "../../../../../../lib/pdf/salary-document-pdf";
import { getCompanySettings, createActivityLog } from "@ishoot/database";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  let document;
  try {
    document = await getAccessibleSalaryDocument(id, user);
  } catch {
    return new NextResponse(null, { status: 403 });
  }
  if (document.status !== "issued")
    return new NextResponse(null, { status: 409 });
  const locale =
    request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
  const buffer = await generateSalaryDocumentPdf(
    document,
    await getCompanySettings(),
    locale,
  );
  await createActivityLog({
    user_id: user.id,
    action: "export",
    entity_type: "salary_document",
    entity_id: id,
    details: { locale },
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${request.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline"}; filename="Salary-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
