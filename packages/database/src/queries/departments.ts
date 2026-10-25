import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../db";
import { DEPARTMENT_CODES, activityDepartments, isDepartmentKey, type DepartmentKey } from "../constants/departments";

/** A department with its place in the tree and how many people it holds. */
export interface DepartmentNode {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  catalogue_key: string | null;
  parent_id: string | null;
  manager_id: string | null;
  deputy_id: string | null;
  manager_name: string | null;
  deputy_name: string | null;
  cost_centre: string | null;
  sort_order: number;
  is_active: boolean;
  /** Staff accounts and employee records directly in this department. */
  user_count: number;
  employee_count: number;
}

/** Every department, parents before children, siblings by their order then name. */
export async function getDepartmentTree(): Promise<DepartmentNode[]> {
  const rows = await db.department.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    include: { _count: { select: { users: true, employees: true } } },
  });
  const leaders = await db.user.findMany({
    where: { id: { in: rows.flatMap((row) => [row.managerId, row.deputyId]).filter((id): id is string => !!id) } },
    select: { id: true, fullName: true },
  });
  const name = (id: string | null) => (id ? leaders.find((user) => user.id === id)?.fullName ?? null : null);
  const nodes: DepartmentNode[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name_en: row.nameEn,
    name_ar: row.nameAr,
    catalogue_key: row.catalogueKey,
    parent_id: row.parentId,
    manager_id: row.managerId,
    deputy_id: row.deputyId,
    manager_name: name(row.managerId),
    deputy_name: name(row.deputyId),
    cost_centre: row.costCentre,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    user_count: row._count.users,
    employee_count: row._count.employees,
  }));
  // Depth-first order, so a flat list reads as an indented tree.
  const ordered: DepartmentNode[] = [];
  const visit = (parent: string | null, seen: Set<string>) => {
    for (const node of nodes.filter((n) => n.parent_id === parent)) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      ordered.push(node);
      visit(node.id, seen);
    }
  };
  const seen = new Set<string>();
  visit(null, seen);
  // Anything whose parent is missing still shows, at the top level.
  for (const node of nodes) if (!seen.has(node.id)) ordered.push(node);
  return ordered;
}

/** A department and every department nested under it, at any depth. */
export async function departmentSubtree(rootIds: string[]): Promise<string[]> {
  if (!rootIds.length) return [];
  const rows = await db.department.findMany({ select: { id: true, parentId: true } });
  const result = new Set(rootIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) if (row.parentId && result.has(row.parentId) && !result.has(row.id)) { result.add(row.id); grew = true; }
  }
  return Array.from(result);
}

/** The department a staff account belongs to: its own, else its employee record's. */
export async function userDepartmentId(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { departmentId: true, employee: { select: { departmentId: true } } } });
  return user?.departmentId ?? user?.employee?.departmentId ?? null;
}

export interface DepartmentInput {
  id?: string;
  code: string;
  name_en: string;
  name_ar: string;
  parent_id: string | null;
  manager_id: string | null;
  deputy_id: string | null;
  cost_centre: string;
  is_active: boolean;
}

const CODE = /^[A-Z0-9][A-Z0-9_-]{0,19}$/;

/** Creates or updates a department. A department cannot sit under itself or under one of its own sub-departments. */
export async function saveDepartment(input: DepartmentInput) {
  const code = input.code.trim().toUpperCase();
  if (!CODE.test(code)) throw new Error(serverMessages.departmentCodeInvalid);
  if (!input.name_en.trim() || !input.name_ar.trim() || input.name_en.length > 120 || input.name_ar.length > 120) throw new Error(serverMessages.departmentNameRequired);
  if (input.cost_centre.length > 40) throw new Error(serverMessages.departmentCodeInvalid);
  if (input.parent_id) {
    if (input.id && (await departmentSubtree([input.id])).includes(input.parent_id)) throw new Error(serverMessages.departmentParentLoop);
    if (!(await db.department.findUnique({ where: { id: input.parent_id }, select: { id: true } }))) throw new Error(serverMessages.departmentParentLoop);
  }
  for (const userId of [input.manager_id, input.deputy_id]) {
    if (userId && !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) throw new Error(serverMessages.userNotFound);
  }
  const clash = await db.department.findUnique({ where: { code }, select: { id: true } });
  if (clash && clash.id !== input.id) throw new Error(serverMessages.departmentCodeTaken);
  const data = {
    code,
    nameEn: input.name_en.trim(),
    nameAr: input.name_ar.trim(),
    parentId: input.parent_id || null,
    managerId: input.manager_id || null,
    deputyId: input.deputy_id || null,
    costCentre: input.cost_centre.trim() || null,
    isActive: input.is_active,
  };
  if (input.id) return db.department.update({ where: { id: input.id }, data });
  const last = await db.department.aggregate({ _max: { sortOrder: true } });
  return db.department.create({ data: { ...data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
}

/** Removes an empty department; its sub-departments move up to its parent. */
export async function deleteDepartment(id: string) {
  const department = await db.department.findUnique({ where: { id }, include: { _count: { select: { users: true, employees: true } } } });
  if (!department) return;
  if (department._count.users || department._count.employees) throw new Error(serverMessages.departmentNotEmpty);
  await db.$transaction([
    db.department.updateMany({ where: { parentId: id }, data: { parentId: department.parentId } }),
    db.department.delete({ where: { id } }),
  ]);
}

/** Moves staff accounts (and their employee records) into a department, or out of every department. */
export async function assignUsersToDepartment(userIds: string[], departmentId: string | null) {
  if (departmentId && !(await db.department.findUnique({ where: { id: departmentId }, select: { id: true } }))) throw new Error(serverMessages.departmentNotFound);
  await db.$transaction([
    db.user.updateMany({ where: { id: { in: userIds } }, data: { departmentId } }),
    db.employee.updateMany({ where: { userId: { in: userIds } }, data: { departmentId } }),
  ]);
}

/** Creates the catalogue departments an activity recommends that the company does not have yet. Nothing is removed. */
export async function applyActivityDepartments(activity: string | null | undefined, only?: readonly DepartmentKey[]) {
  const wanted = (only ?? activityDepartments(activity)).filter(isDepartmentKey);
  const existing = await db.department.findMany({ select: { code: true, catalogueKey: true } });
  const en = getTranslations("en").admin.departmentCatalogue as Record<DepartmentKey, string>;
  const ar = getTranslations("ar").admin.departmentCatalogue as Record<DepartmentKey, string>;
  let order = existing.length;
  for (const key of wanted) {
    if (existing.some((row) => row.catalogueKey === key || row.code === DEPARTMENT_CODES[key])) continue;
    await db.department.create({ data: { code: DEPARTMENT_CODES[key], catalogueKey: key, nameEn: en[key], nameAr: ar[key], sortOrder: ++order } });
  }
}
