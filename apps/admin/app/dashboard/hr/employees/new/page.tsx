import { requirePermission } from "../../../../../lib/auth";
import { listDepartments } from "@ishoot/database";
import { NewEmployeeFormView } from "../../../../../components/hr/NewEmployeeFormView";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  await requirePermission("employees", "create");

  const departments = await listDepartments();

  return (
    <NewEmployeeFormView
      departments={departments}
    />
  );
}
