import { db } from "@platform/database";
import { requirePagePermission } from "../../../../../lib/auth";
import { NewSettlementForm } from "../../../../../components/settlements/NewSettlementForm";

export const dynamic = "force-dynamic";

export default async function NewSettlementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("payroll", "create");
  const query = await searchParams;
  const employeeId =
    typeof query.employeeId === "string" ? query.employeeId : "";
  const handoverId =
    typeof query.handoverId === "string" ? query.handoverId : "";
  const [employees, handover] = await Promise.all([
    db.employee.findMany({
      where: {
        finalSettlements: {
          none: { status: { in: ["draft", "submitted", "approved", "paid"] } },
        },
      },
      select: {
        id: true,
        employeeNumber: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameAr: true,
        lastNameAr: true,
        status: true,
      },
      orderBy: { firstNameEn: "asc" },
    }),
    handoverId
      ? db.employeeHandover.findUnique({
          where: { id: handoverId },
          select: {
            id: true,
            employeeId: true,
            effectiveDate: true,
            reason: true,
          },
        })
      : null,
  ]);
  return (
    <NewSettlementForm
      employees={employees.map((e) => ({
        id: e.id,
        number: e.employeeNumber,
        nameEn: `${e.firstNameEn} ${e.lastNameEn}`,
        nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
      }))}
      initial={{
        employeeId: handover?.employeeId ?? employeeId,
        handoverId: handover?.id ?? "",
        lastWorkingDay: handover
          ? handover.effectiveDate.toISOString().slice(0, 10)
          : "",
        notes: handover?.reason ?? "",
      }}
    />
  );
}
