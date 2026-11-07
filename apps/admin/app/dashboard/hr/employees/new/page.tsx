import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { listDepartments, getHrPolicy } from "@platform/database";
import { NewEmployeeFormView } from "../../../../../components/hr/NewEmployeeFormView";
import { pageMetadata } from "../../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("hr/employees/new");

export const dynamic = "force-dynamic";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission("employees", "create");
  const departments = await listDepartments();

  return <NewEmployeeFormView visaExemptCountries={(await getHrPolicy()).visaExemptCountries} departments={departments} linkUser={null} canSetPay={await hasPermission("payroll", "edit")} />;
}
