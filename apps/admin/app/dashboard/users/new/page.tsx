import { requirePagePermission } from "../../../../lib/auth";
import { getStaffRoles } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { NewUserFormView } from "@/components/users/NewUserFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("users/new");

export default async function NewUserPage() {
  await requirePagePermission("users", "write");
  const [dbRoles, rawEmployees] = await Promise.all([
    getStaffRoles(),
    listEmployees().catch(() => []),
  ]);
  const roles = dbRoles.map((r) => ({
    id: r.id,
    nameEn: r.nameEn || r.id,
    nameAr: r.nameAr || r.id,
  }));
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number || e.id,
    firstNameEn: e.first_name_en || "",
    lastNameEn: e.last_name_en || "",
    email: e.email || "",
  }));
  return <NewUserFormView roles={roles} employees={employees} />;
}
