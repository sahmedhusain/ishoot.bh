import { getStaffAccessForAccount } from "@platform/api-client";
import { serverMessages } from "@platform/locales";
import {
  listAdminRoleDataScopesApi,
  listAdminUsersApi,
  setAdminRoleDataScopesApi,
} from "../api/identity";
import { listEmployees } from "../api/hr";
import {
  DATA_SCOPE_AREAS,
  defaultDataScope,
  isDataScope,
  isDataScopeArea,
  type DataScope,
  type DataScopeArea,
} from "../constants/data-scope";
import { departmentSubtree, userDepartmentId } from "./departments";

export async function getRoleDataScopes(
  role: string,
): Promise<Record<DataScopeArea, DataScope>> {
  const rows =
    role === "super_admin"
      ? []
      : (await listAdminRoleDataScopesApi()).filter((r) => r.role === role);
  return Object.fromEntries(
    DATA_SCOPE_AREAS.map((area) => {
      const stored = rows.find((row) => row.area === area)?.scope;
      return [
        area,
        isDataScope(stored) ? stored : defaultDataScope(role, area),
      ];
    }),
  ) as Record<DataScopeArea, DataScope>;
}

export async function setRoleDataScopes(
  role: string,
  scopes: Record<string, string>,
) {
  if (role === "super_admin") throw new Error(serverMessages.dataScopeInvalid);
  const entries = Object.entries(scopes);
  if (
    entries.some(
      ([area, scope]) => !isDataScopeArea(area) || !isDataScope(scope),
    )
  )
    throw new Error(serverMessages.dataScopeInvalid);
  await setAdminRoleDataScopesApi({ role, scopes });
}

export async function scopedUserIds(
  user: { id: string; role: string },
  area: DataScopeArea,
): Promise<string[] | null> {
  const policy = await getStaffAccessForAccount(user.id);
  if (
    policy.subjectId !== user.id ||
    policy.role !== user.role ||
    !isDataScope(policy.dataScopes[area])
  )
    throw new Error(serverMessages.outsideDataScope);
  const scope = policy.dataScopes[area];
  if (scope === "all") return null;
  if (scope === "own") return [user.id];
  const own = await userDepartmentId(user.id);
  if (!own) return [user.id];
  const departments = await departmentSubtree([own]);
  const deptSet = new Set(departments);
  const [users, employees] = await Promise.all([
    listAdminUsersApi(),
    listEmployees().catch(() => []),
  ]);
  const empDeptByUser = new Map(
    employees.filter((e: any) => e.userId).map((e: any) => [e.userId, e.departmentId]),
  );
  const memberIds = users
    .filter((u: any) => {
      const dep = u.department_id ?? u.departmentId ?? empDeptByUser.get(u.id);
      return dep && deptSet.has(dep);
    })
    .map((u: any) => u.id);
  return Array.from(new Set([user.id, ...memberIds]));
}

export function assertInScope(
  scope: string[] | null,
  ownerId: string | null | undefined,
) {
  if (scope === null) return;
  if (!ownerId || !scope.includes(ownerId))
    throw new Error(serverMessages.outsideDataScope);
}
