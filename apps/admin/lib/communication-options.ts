import { listTableRows } from "./api/tables";

export async function communicationOptions() {
  const [allUsers, allDepartments, allRoles] = await Promise.all([
    listTableRows<Record<string, any>>("identity", "user"),
    listTableRows<Record<string, any>>("hr", "department"),
    listTableRows<Record<string, any>>("identity", "role"),
  ]);
  const users = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ id: u.id, fullName: u.fullName }))
    .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
  const departments = allDepartments.map((d) => ({
    id: d.id,
    nameEn: d.nameEn,
    nameAr: d.nameAr,
  }));
  const roles = allRoles.map((r) => ({
    id: r.id,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
  }));
  return { users, departments, roles };
}
export async function letterEmployees() {
  const employees = await listTableRows<Record<string, any>>("hr", "employee");
  return employees
    .sort((a, b) => String(a.firstNameEn || "").localeCompare(String(b.firstNameEn || "")))
    .map((e) => ({ id: e.id, name: `${e.firstNameEn} ${e.lastNameEn}` }));
}
