import { requirePagePermission } from "../../../../lib/auth";
import { db } from "@ishoot/database";
import { getTranslations } from "@ishoot/locales";
import { NewUserFormView } from "@/components/users/NewUserFormView";

export const metadata = { title: getTranslations("ar").admin.copy.newUser };

export default async function NewUserPage() {
  await requirePagePermission("users", "write");
  const roles = await db.role.findMany({
    select: { id: true, nameEn: true, nameAr: true },
    orderBy: { createdAt: "asc" },
  });
  const employees = await db.employee.findMany({ where: { userId: null, status: { in: ["active", "on_leave"] } }, select: { id: true, employeeNumber: true, firstNameEn: true, lastNameEn: true, email: true }, orderBy: { employeeNumber: "asc" } });
  return <NewUserFormView roles={roles} employees={employees} />;
}
