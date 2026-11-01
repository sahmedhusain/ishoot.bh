import { requirePagePermission } from "../../../../lib/auth";
import { db } from "@platform/database";
import {
  availablePayslipMonths,
  decidableSalaryDocumentIds,
} from "../../../../lib/salary-documents";
import { SalaryDocumentsView } from "../../../../components/hr/SalaryDocumentsView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/documents");

export const dynamic = "force-dynamic";

export default async function SalaryDocumentsPage() {
  const user = await requirePagePermission("self_service", "read");
  // "My salary documents" is strictly the signed-in person's own, whatever their role. HR sees everyone's in HR Requests.
  const employee = await db.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const documents = await db.salaryDocument.findMany({
    where: { employee: { userId: user.id } },
    include: {
      employee: {
        select: {
          userId: true,
          firstNameEn: true,
          lastNameEn: true,
          firstNameAr: true,
          lastNameAr: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const [availableMonths, decidableIds] = await Promise.all([
    employee ? availablePayslipMonths(employee.id) : Promise.resolve([]),
    decidableSalaryDocumentIds(
      user,
      documents.filter((d) => d.status === "pending").map((d) => d.id),
    ),
  ]);
  return (
    <SalaryDocumentsView
      employeeId={employee?.id}
      availableMonths={availableMonths}
      decidableIds={decidableIds}
      showNoProfile
      documents={documents.map((item) => ({
        id: item.id,
        kind: item.kind,
        status: item.status,
        months: item.months as string[],
        createdAt: item.createdAt.toISOString(),
        reviewNotes: item.reviewNotes,
        employeeName: `${item.employee.firstNameEn} ${item.employee.lastNameEn}`,
        employeeNameAr: `${item.employee.firstNameAr} ${item.employee.lastNameAr}`,
        languages: item.languages,
        // Only HR sends documents, and never to themselves; requesters view, download and print.
        shareable: false,
      }))}
    />
  );
}
