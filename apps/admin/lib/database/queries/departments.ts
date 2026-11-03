import {
  listDepartments,
  createDepartment,
} from "@platform/api-client";

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
  const rows = await listDepartments("service-token");
  return rows.map(row => ({
    id: row.id,
    code: row.code,
    name_en: row.nameEn,
    name_ar: row.nameAr,
    catalogue_key: null,
    parent_id: row.parentId,
    manager_id: row.headId,
    deputy_id: null,
    manager_name: null,
    deputy_name: null,
    cost_centre: null,
    sort_order: 0,
    is_active: true,
    user_count: 0,
    employee_count: 0,
  }));
}

export async function departmentSubtree(rootIds: string[]): Promise<string[]> {
  const rows = await listDepartments("service-token");
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
  // This would need an API call to get user info.
  throw new Error("userDepartmentId is not implemented in API");
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
    throw new Error("updateDepartment is not implemented in API");
  }
  return createDepartment({
    code: input.code,
    nameEn: input.name_en,
    nameAr: input.name_ar,
    parentId: input.parent_id || null,
    headId: input.manager_id || null,
  }, "service-token");
}

export async function deleteDepartment(id: string) {
  // Not implemented in API.
  throw new Error("deleteDepartment is not implemented in API");
}

export async function assignUsersToDepartment(
  userIds: string[],
  departmentId: string | null,
) {
  // Must be a single API call.
  throw new Error("assignUsersToDepartment must be implemented as a single API call in Go backend");
}

export async function applyActivityDepartments(
  activity: string | null | undefined,
  only?: readonly string[],
) {
  // Not implemented in API.
  throw new Error("applyActivityDepartments is not implemented in API");
}

export async function getOrgChart(): Promise<{
  departments: any[];
  unassigned: number;
}> {
  return { departments: [], unassigned: 0 };
}