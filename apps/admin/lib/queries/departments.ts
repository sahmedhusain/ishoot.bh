import {
  assignUsersToDepartmentApi,
  createDepartment,
  deleteDepartmentApi,
  listDepartments,
  listEmployees,
  listHRUsers,
  updateDepartment,
} from "../api/hr";

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
  user_count: number;
  employee_count: number;
}

export async function getDepartmentTree(): Promise<DepartmentNode[]> {
  const [rows, employees, users] = await Promise.all([
    listDepartments().catch(() => []),
    listEmployees().catch(() => []),
    listHRUsers().catch(() => []),
  ]);
  const userNames = new Map((users as any[]).map((u) => [u.id, u.fullName || u.email || u.id]));
  const empByDept = new Map<string, number>();
  const usersByDept = new Map<string, number>();
  for (const e of employees as any[]) {
    if (e.departmentId) {
      empByDept.set(e.departmentId, (empByDept.get(e.departmentId) ?? 0) + 1);
      if (e.userId) {
        usersByDept.set(e.departmentId, (usersByDept.get(e.departmentId) ?? 0) + 1);
      }
    }
  }
  return (rows as any[]).map((row) => {
    const managerId = row.managerId ?? row.headId ?? null;
    const deputyId = row.deputyId ?? null;
    return {
      id: row.id,
      code: row.code ?? "",
      name_en: row.nameEn,
      name_ar: row.nameAr ?? row.nameEn,
      catalogue_key: row.catalogueKey ?? null,
      parent_id: row.parentId ?? null,
      manager_id: managerId,
      deputy_id: deputyId,
      manager_name: managerId ? userNames.get(managerId) ?? null : null,
      deputy_name: deputyId ? userNames.get(deputyId) ?? null : null,
      cost_centre: row.costCentre ?? null,
      sort_order: row.sortOrder ?? 0,
      is_active: row.isActive ?? true,
      user_count: usersByDept.get(row.id) ?? 0,
      employee_count: empByDept.get(row.id) ?? 0,
    };
  });
}

export async function departmentSubtree(rootIds: string[]): Promise<string[]> {
  const rows = await listDepartments().catch(() => []);
  const result = new Set(rootIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.parentId && result.has(row.parentId) && !result.has(row.id)) {
        result.add(row.id);
        grew = true;
      }
    }
  }
  return Array.from(result);
}

export async function userDepartmentId(userId: string): Promise<string | null> {
  const employees = await listEmployees().catch(() => []);
  return (employees as any[]).find((e) => e.userId === userId)?.departmentId ?? null;
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

export async function saveDepartment(input: DepartmentInput) {
  if (input.id) {
    return updateDepartment(input.id, {
      code: input.code,
      nameEn: input.name_en,
      nameAr: input.name_ar,
      parentId: input.parent_id || null,
      headId: input.manager_id || null,
      managerId: input.manager_id || null,
      deputyId: input.deputy_id || null,
      costCentre: input.cost_centre || null,
      isActive: input.is_active,
    } as any);
  }
  return createDepartment({
    code: input.code,
    nameEn: input.name_en,
    nameAr: input.name_ar,
    parentId: input.parent_id || null,
    headId: input.manager_id || null,
  });
}

export async function deleteDepartment(id: string) {
  await deleteDepartmentApi(id);
}

export async function assignUsersToDepartment(
  userIds: string[],
  departmentId: string | null,
) {
  await assignUsersToDepartmentApi(userIds, departmentId);
}

export async function applyActivityDepartments(
  _activity: string | null | undefined,
  _only?: readonly string[],
) {
  return getDepartmentTree();
}

export async function getOrgChart(): Promise<{
  departments: (DepartmentNode & {
    count: number;
    head: { name: string; avatar_url: string | null } | null;
    deputy: { name: string; avatar_url: string | null } | null;
    people: { name: string; name_ar?: string; avatar_url: string | null }[];
  })[];
  unassigned: number;
}> {
  const [deptTree, employees] = await Promise.all([
    getDepartmentTree(),
    listEmployees().catch(() => []),
  ]);
  const empList = (employees as any[]) || [];
  const empByDept = new Map<string, any[]>();
  for (const emp of empList) {
    if (emp.departmentId) {
      const list = empByDept.get(emp.departmentId) || [];
      list.push(emp);
      empByDept.set(emp.departmentId, list);
    }
  }

  const departments = deptTree.map((dept) => {
    const deptEmps = empByDept.get(dept.id) || [];
    const headEmp = deptEmps.find((e) => e.id === dept.manager_id || e.userId === dept.manager_id);
    const deputyEmp = deptEmps.find((e) => e.id === dept.deputy_id || e.userId === dept.deputy_id);

    const people = deptEmps.map((e) => ({
      name: e.nameEn || e.fullName || e.name || e.id,
      name_ar: e.nameAr || undefined,
      avatar_url: e.avatarUrl || e.avatar_url || null,
    }));

    return {
      ...dept,
      count: deptEmps.length || dept.employee_count || 0,
      head: dept.manager_name
        ? { name: dept.manager_name, avatar_url: headEmp?.avatarUrl || headEmp?.avatar_url || null }
        : headEmp
        ? { name: headEmp.nameEn || headEmp.fullName || headEmp.id, avatar_url: headEmp.avatarUrl || headEmp.avatar_url || null }
        : null,
      deputy: dept.deputy_name
        ? { name: dept.deputy_name, avatar_url: deputyEmp?.avatarUrl || deputyEmp?.avatar_url || null }
        : deputyEmp
        ? { name: deputyEmp.nameEn || deputyEmp.fullName || deputyEmp.id, avatar_url: deputyEmp.avatarUrl || deputyEmp.avatar_url || null }
        : null,
      people,
    };
  });

  const unassigned = empList.filter((e) => !e.departmentId).length;
  return { departments, unassigned };
}
