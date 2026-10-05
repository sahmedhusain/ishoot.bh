import { db } from "../db";

export interface DirectoryEntry {
  id: string;
  userId: string | null;
  name: string;
  nameAr: string | null;
  title: string | null;
  titleAr: string | null;
  role: string | null;
  department: string | null;
  departmentAr: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  manager: string | null;
  onLeave: boolean;
}

/**
 * Everyone at the company with their work contact details: staff accounts and HR-only crew.
 * Only work-facing fields are exposed (no salary, ID or personal records).
 */
export async function getCompanyDirectory(): Promise<DirectoryEntry[]> {
  const [users, crew] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, archivedAt: null },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true, department: true, avatarUrl: true,
        manager: { select: { fullName: true } },
        employee: {
          select: {
            id: true, firstNameAr: true, lastNameAr: true, jobTitleEn: true, jobTitleAr: true, phone: true, status: true,
            department: { select: { nameEn: true, nameAr: true } },
          },
        },
      },
    }),
    db.employee.findMany({
      where: { userId: null, status: { in: ["active", "on_leave"] } },
      select: {
        id: true, firstNameEn: true, lastNameEn: true, firstNameAr: true, lastNameAr: true, jobTitleEn: true, jobTitleAr: true,
        email: true, phone: true, status: true, department: { select: { nameEn: true, nameAr: true } },
      },
    }),
  ]);
  const entries: DirectoryEntry[] = [
    ...users
      .filter((u) => !u.employee || ["active", "on_leave"].includes(u.employee.status))
      .map((u) => ({
        id: u.employee?.id ?? u.id,
        userId: u.id,
        name: u.fullName,
        nameAr: u.employee ? `${u.employee.firstNameAr} ${u.employee.lastNameAr}` : null,
        title: u.employee?.jobTitleEn ?? null,
        titleAr: u.employee?.jobTitleAr ?? null,
        role: u.role,
        department: u.employee?.department?.nameEn ?? u.department ?? null,
        departmentAr: u.employee?.department?.nameAr ?? null,
        email: u.email,
        phone: u.phone || u.employee?.phone || null,
        avatarUrl: u.avatarUrl,
        manager: u.manager?.fullName ?? null,
        onLeave: u.employee?.status === "on_leave",
      })),
    ...crew.map((e) => ({
      id: e.id,
      userId: null,
      name: `${e.firstNameEn} ${e.lastNameEn}`,
      nameAr: `${e.firstNameAr} ${e.lastNameAr}`,
      title: e.jobTitleEn,
      titleAr: e.jobTitleAr,
      role: null,
      department: e.department?.nameEn ?? null,
      departmentAr: e.department?.nameAr ?? null,
      email: e.email,
      phone: e.phone,
      avatarUrl: null,
      manager: null,
      onLeave: e.status === "on_leave",
    })),
  ];
  return entries.sort((a, b) => (a.department ?? "~").localeCompare(b.department ?? "~") || a.name.localeCompare(b.name));
}
