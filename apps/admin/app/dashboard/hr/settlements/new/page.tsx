import { listEmployees } from "@platform/api-client";
import { requirePagePermission } from "../../../../../lib/auth";
import { NewSettlementForm } from "../../../../../components/settlements/NewSettlementForm";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/settlements/new");

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
  const rawEmployees = await listEmployees().catch(() => []);
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number || e.id,
    firstNameEn: e.first_name_en || "",
    lastNameEn: e.last_name_en || "",
    firstNameAr: e.first_name_ar || e.first_name_en || "",
    lastNameAr: e.last_name_ar || e.last_name_en || "",
    status: e.status || "active",
  }));
  const handover: any = null;
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
