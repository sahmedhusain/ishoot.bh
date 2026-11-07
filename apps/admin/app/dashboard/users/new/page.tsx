import { requirePagePermission } from "../../../../lib/auth";
import { ALL_ROLES } from "@platform/database";
import { listEmployees } from "@platform/api-client";
import { NewUserFormView } from "@/components/users/NewUserFormView";
import { pageMetadata } from "../../../../lib/company-metadata";

export const generateMetadata = () => pageMetadata("users/new");

export default async function NewUserPage() {
  await requirePagePermission("users", "write");
  const roles = ALL_ROLES.map((id) => ({
    id,
    nameEn: id.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
    nameAr: id,
  }));
  const rawEmployees = await listEmployees().catch(() => []);
  const employees = rawEmployees.map((e) => ({
    id: e.id,
    employeeNumber: e.employee_number || e.id,
    firstNameEn: e.first_name_en || "",
    lastNameEn: e.last_name_en || "",
    email: e.email || "",
  }));
  return <NewUserFormView roles={roles} employees={employees} />;
}
