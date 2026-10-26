import { db } from "../db";
import { departmentSubtree } from "./departments";

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

export interface DirectoryFilters {
  /** Name (either language), job title, email or phone. */
  q?: string;
  /** A department; people in its sub-departments are included. */
  departmentId?: string;
  page?: number;
}

const DIRECTORY_PAGE = 48;

/**
 * Everyone at the company with their work contact details: staff accounts and HR-only crew, searched on the
 * server and returned a page at a time. Only work-facing fields are exposed (no salary, ID or personal records).
 */
export async function getCompanyDirectory(filters: DirectoryFilters = {}) {
  const q = (filters.q ?? "").trim().slice(0, 120);
  const departments =
    filters.departmentId && filters.departmentId !== "all"
      ? await departmentSubtree([filters.departmentId])
      : null;
  const text = (field: string, insensitive = true) => ({
    [field]: {
      contains: q,
      ...(insensitive ? { mode: "insensitive" as const } : {}),
    },
  });
  const employeeMatch = q
    ? [
        text("firstNameEn"),
        text("lastNameEn"),
        text("firstNameAr", false),
        text("lastNameAr", false),
        text("jobTitleEn"),
        text("jobTitleAr", false),
        text("phone", false),
      ]
    : [];
  const [users, crew] = await Promise.all([
    db.user.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        ...(departments
          ? {
              OR: [
                { departmentId: { in: departments } },
                {
                  departmentId: null,
                  employee: { departmentId: { in: departments } },
                },
              ],
            }
          : {}),
        ...(q
          ? {
              AND: [
                {
                  OR: [
                    text("fullName"),
                    text("email"),
                    text("phone", false),
                    { employee: { OR: employeeMatch } },
                  ],
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        avatarUrl: true,
        departmentRecord: { select: { nameEn: true, nameAr: true } },
        manager: { select: { fullName: true } },
        employee: {
          select: {
            id: true,
            firstNameAr: true,
            lastNameAr: true,
            jobTitleEn: true,
            jobTitleAr: true,
            phone: true,
            status: true,
            department: { select: { nameEn: true, nameAr: true } },
          },
        },
      },
    }),
    db.employee.findMany({
      where: {
        userId: null,
        status: { in: ["active", "on_leave"] },
        ...(departments ? { departmentId: { in: departments } } : {}),
        ...(q ? { OR: [...employeeMatch, text("email")] } : {}),
      },
      select: {
        id: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameAr: true,
        lastNameAr: true,
        jobTitleEn: true,
        jobTitleAr: true,
        email: true,
        phone: true,
        status: true,
        department: { select: { nameEn: true, nameAr: true } },
      },
    }),
  ]);
  const entries: DirectoryEntry[] = [
    ...users
      .filter(
        (u) =>
          !u.employee || ["active", "on_leave"].includes(u.employee.status),
      )
      .map((u) => ({
        id: u.employee?.id ?? u.id,
        userId: u.id,
        name: u.fullName,
        nameAr: u.employee
          ? `${u.employee.firstNameAr} ${u.employee.lastNameAr}`
          : null,
        title: u.employee?.jobTitleEn ?? null,
        titleAr: u.employee?.jobTitleAr ?? null,
        role: u.role,
        department:
          u.departmentRecord?.nameEn ??
          u.employee?.department?.nameEn ??
          u.department ??
          null,
        departmentAr:
          u.departmentRecord?.nameAr ?? u.employee?.department?.nameAr ?? null,
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
  entries.sort(
    (a, b) =>
      (a.department ?? "~").localeCompare(b.department ?? "~") ||
      a.name.localeCompare(b.name),
  );
  const pages = Math.max(1, Math.ceil(entries.length / DIRECTORY_PAGE));
  const page = Math.min(Math.max(1, filters.page || 1), pages);
  return {
    items: entries.slice((page - 1) * DIRECTORY_PAGE, page * DIRECTORY_PAGE),
    total: entries.length,
    page,
    pageSize: DIRECTORY_PAGE,
    filters: { q, departmentId: filters.departmentId || "all" },
  };
}
