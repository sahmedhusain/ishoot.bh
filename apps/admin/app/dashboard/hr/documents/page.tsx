import { requireAuth } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { canManageSalaryDocuments } from "../../../../lib/salary-documents";
import { SalaryDocumentsView } from "../../../../components/hr/SalaryDocumentsView";
export const dynamic = "force-dynamic";
export default async function SalaryDocumentsPage() {
  const user = await requireAuth();
  const canManage = await canManageSalaryDocuments(user);
  const employee = await db.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  const documents = await db.salaryDocument.findMany({
    where: canManage ? {} : { employee: { userId: user.id } },
    include: { employee: { select: { firstNameEn: true, lastNameEn: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <SalaryDocumentsView
      employeeId={employee?.id}
      canManage={canManage}
      documents={documents.map((item) => ({
        id: item.id,
        kind: item.kind,
        status: item.status,
        months: item.months as string[],
        createdAt: item.createdAt.toISOString(),
        reviewNotes: item.reviewNotes,
        employeeName: `${item.employee.firstNameEn} ${item.employee.lastNameEn}`,
      }))}
    />
  );
}
