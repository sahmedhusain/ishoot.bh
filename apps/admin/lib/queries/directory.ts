import { listAdminUsersApi } from "../api/identity";
import { listDepartments, listEmployees } from "../api/hr";
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
  q?: string;
  departmentId?: string;
  page?: number;
}

const DIRECTORY_PAGE = 48;

export async function getCompanyDirectory(filters: DirectoryFilters = {}) {
  const q = (filters.q ?? "").trim().slice(0, 120).toLowerCase();
  const deptIds =
    filters.departmentId && filters.departmentId !== "all"
      ? new Set(await departmentSubtree([filters.departmentId]))
      : null;

  const [users, employees, departments] = await Promise.all([
    listAdminUsersApi().catch(() => []),
    listEmployees().catch(() => []),
    listDepartments().catch(() => []),
  ]);

  const deptById = new Map<string, any>(departments.map((d: any): [any, any] => [d.id, d]));
  const userById = new Map<string, any>(users.map((u: any): [any, any] => [u.id, u]));
  const empByUserId = new Map<string, any>(
    employees.filter((e: any) => e.userId).map((e: any): [any, any] => [e.userId, e]),
  );

  const matchesQ = (fields: Array<string | null | undefined>) =>
    !q || fields.some((f) => f && f.toLowerCase().includes(q));

  const userEntries: DirectoryEntry[] = users
    .filter((u: any) => (u.is_active ?? u.isActive ?? true) && !(u.archived_at ?? u.archivedAt))
    .filter((u: any) => {
      const emp = empByUserId.get(u.id);
      if (emp && !["active", "on_leave"].includes(emp.status)) return false;
      const depId = u.department_id ?? u.departmentId ?? emp?.departmentId ?? null;
      if (deptIds && (!depId || !deptIds.has(depId))) return false;
      return matchesQ([
        u.full_name ?? u.fullName,
        u.email,
        u.phone,
        emp?.firstNameEn,
        emp?.lastNameEn,
        emp?.firstNameAr,
        emp?.lastNameAr,
        emp?.jobTitleEn,
        emp?.jobTitleAr,
        emp?.phone,
      ]);
    })
    .map((u: any) => {
      const emp = empByUserId.get(u.id);
      const depId = u.department_id ?? u.departmentId ?? emp?.departmentId ?? null;
      const dep = depId ? deptById.get(depId) : null;
      const mgr = (u.manager_id ?? u.managerId) ? userById.get(u.manager_id ?? u.managerId) : null;
      return {
        id: emp?.id ?? u.id,
        userId: u.id,
        name: u.full_name ?? u.fullName ?? u.email ?? u.id,
        nameAr: emp ? `${emp.firstNameAr ?? ""} ${emp.lastNameAr ?? ""}`.trim() || null : null,
        title: emp?.jobTitleEn ?? null,
        titleAr: emp?.jobTitleAr ?? null,
        role: u.role ?? null,
        department: dep?.nameEn ?? u.department ?? null,
        departmentAr: dep?.nameAr ?? null,
        email: u.email ?? null,
        phone: u.phone || emp?.phone || null,
        avatarUrl: u.avatar_url ?? u.avatarUrl ?? null,
        manager: mgr ? (mgr.full_name ?? mgr.fullName ?? null) : null,
        onLeave: emp?.status === "on_leave",
      };
    });

  const unlinkedEntries: DirectoryEntry[] = employees
    .filter((e: any) => !e.userId && ["active", "on_leave"].includes(e.status))
    .filter((e: any) => {
      if (deptIds && (!e.departmentId || !deptIds.has(e.departmentId))) return false;
      return matchesQ([
        e.firstNameEn,
        e.lastNameEn,
        e.firstNameAr,
        e.lastNameAr,
        e.jobTitleEn,
        e.jobTitleAr,
        e.email,
        e.phone,
      ]);
    })
    .map((e: any) => {
      const dep = e.departmentId ? deptById.get(e.departmentId) : null;
      return {
        id: e.id,
        userId: null,
        name: `${e.firstNameEn ?? ""} ${e.lastNameEn ?? ""}`.trim(),
        nameAr: `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() || null,
        title: e.jobTitleEn ?? null,
        titleAr: e.jobTitleAr ?? null,
        role: null,
        department: dep?.nameEn ?? null,
        departmentAr: dep?.nameAr ?? null,
        email: e.email ?? null,
        phone: e.phone ?? null,
        avatarUrl: null,
        manager: null,
        onLeave: e.status === "on_leave",
      };
    });

  const entries = [...userEntries, ...unlinkedEntries].sort(
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
    filters: { q: (filters.q ?? "").trim().slice(0, 120), departmentId: filters.departmentId || "all" },
  };
}
