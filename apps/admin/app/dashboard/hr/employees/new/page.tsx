import { hasPermission, requirePagePermission } from "../../../../../lib/auth";
import { listDepartments, getHrPolicy, db } from "@platform/database";
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
  const query = await searchParams;
  const userId = typeof query.userId === "string" ? query.userId : undefined;

  const [departments, linkUser] = await Promise.all([
    listDepartments(),
    // Creating the HR record for an existing account that has none yet.
    userId
      ? db.user.findFirst({
        where: { id: userId, employee: null },
        select: { id: true, fullName: true, email: true },
      })
      : Promise.resolve(null),
  ]);

  return <NewEmployeeFormView visaExemptCountries={(await getHrPolicy()).visaExemptCountries} departments={departments} linkUser={linkUser} canSetPay={await hasPermission("payroll", "edit")} />;
}
