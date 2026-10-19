import { db } from "@ishoot/database";
export async function communicationOptions() {
  const [users, departments, roles] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    db.department.findMany({
      select: { id: true, nameEn: true, nameAr: true },
    }),
    db.role.findMany({ select: { id: true, nameEn: true, nameAr: true } }),
  ]);
  return { users, departments, roles };
}
export async function letterEmployees() {
  return (
    await db.employee.findMany({
      select: { id: true, firstNameEn: true, lastNameEn: true },
      orderBy: { firstNameEn: "asc" },
    })
  ).map((e) => ({ id: e.id, name: `${e.firstNameEn} ${e.lastNameEn}` }));
}
