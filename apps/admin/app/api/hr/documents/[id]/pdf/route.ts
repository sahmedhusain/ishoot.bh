import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "../../../../../../lib/auth";
import { getAccessibleSalaryDocument } from "../../../../../../lib/salary-documents";
import { generateSalaryDocumentPdf } from "../../../../../../lib/pdf/salary-document-pdf";
import { getCompanySettings, createActivityLog } from "@platform/database";
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
  // Only the languages the employee asked for are issued.
  const requested = request.nextUrl.searchParams.get("locale");
  const locale = (
    requested === "ar" || requested === "en" ? requested : document.languages[0]
  ) as "ar" | "en";
  if (!document.languages.includes(locale))
    return new NextResponse(null, { status: 404 });
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
      "Content-Disposition": `${request.nextUrl.searchParams.get("download") === "true" ? "attachment" : "inline"}; filename="${document.kind === "payslip" ? "Payslip" : "Salary-Certificate"}-${document.employee.employeeNumber}-${locale.toUpperCase()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
