import { getStaffAccessForAccount } from "@platform/api-client";
import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
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
      : await db.roleDataScope.findMany({ where: { role } });
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
  await db.$transaction(
    entries.map(([area, scope]) =>
      db.roleDataScope.upsert({
        where: { role_area: { role, area } },
        create: { role, area, scope },
        update: { scope },
      }),
    ),
  );
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
  const members = await db.user.findMany({
    where: {
      OR: [
        { departmentId: { in: departments } },
        { employee: { departmentId: { in: departments } } },
      ],
    },
    select: { id: true },
  });
  return Array.from(new Set([user.id, ...members.map((member) => member.id)]));
}

export function assertInScope(
  scope: string[] | null,
  ownerId: string | null | undefined,
) {
  if (scope === null) return;
  if (!ownerId || !scope.includes(ownerId))
    throw new Error(serverMessages.outsideDataScope);
}
