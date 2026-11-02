import { expect, test, vi } from "vitest";
import vectors from "../../contracts/fixtures/staff-access.v1.json";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  isDefaultAllowed,
} from "../../packages/database/src/constants/permissions";
import { DEFAULT_FEATURE_MODULES } from "../../packages/database/src/constants/features";
import { DATA_SCOPE_AREAS } from "../../packages/database/src/constants/data-scope";

const mocks = vi.hoisted(() => ({
  grants: vi.fn(),
  scopes: vi.fn(),
  modules: vi.fn(),
}));
vi.mock("../../packages/database/src/db", () => ({
  db: {
    permission: { findMany: mocks.grants },
    roleDataScope: { findMany: mocks.scopes },
  },
}));
vi.mock("../../packages/database/src/queries/features", () => ({
  getFeatureToggles: mocks.modules,
  isFeatureEnabled: vi.fn(),
}));
vi.mock("../../packages/database/src/queries/departments", () => ({
  departmentSubtree: vi.fn(),
  userDepartmentId: vi.fn(),
}));

import { getEffectivePermissions } from "../../packages/database/src/queries/permissions";
import { getRoleDataScopes } from "../../packages/database/src/queries/data-scope";

type Vector = {
  name: string;
  role: string;
  stored?: Record<string, boolean>;
  overrides?: Record<string, boolean>;
  modules?: Record<string, boolean>;
  storedScopes?: Record<string, string>;
  permissions: Record<string, boolean>;
  scopes?: Record<string, string>;
  absent?: string[];
};

function storedGrants(stored: Record<string, boolean>) {
  return Object.entries(stored).map(([key, allowed]) => {
    const [resource, action] = key.split(":");
    return { resource, action, allowed };
  });
}

test.each(vectors as Vector[])("staff policy parity: $name", async (vector) => {
  mocks.grants.mockResolvedValue(storedGrants(vector.stored || {}));
  mocks.modules.mockResolvedValue(
    Object.entries(vector.modules || {}).map(([moduleKey, isEnabled]) => ({
      moduleKey,
      isEnabled,
    })),
  );
  mocks.scopes.mockResolvedValue(
    Object.entries(vector.storedScopes || {}).map(([area, scope]) => ({
      area,
      scope,
    })),
  );
  const permissions = await getEffectivePermissions(
    vector.role,
    vector.overrides,
  );
  const scopes = await getRoleDataScopes(vector.role);
  expect(Object.keys(permissions)).toHaveLength(
    ALL_RESOURCES.length * ALL_ACTIONS.length,
  );
  expect(Object.keys(scopes)).toHaveLength(DATA_SCOPE_AREAS.length);
  expect(permissions).toMatchObject(vector.permissions);
  expect(scopes).toMatchObject(vector.scopes || {});
  for (const key of vector.absent || [])
    expect(permissions).not.toHaveProperty(key);
  if (vector.role === "super_admin")
    expect(Object.values(permissions).every(Boolean)).toBe(true);
});

test.each(ALL_ROLES)("provisioned staff template: %s", async (role) => {
  const stored = Object.fromEntries(
    ALL_RESOURCES.flatMap((resource) =>
      ALL_ACTIONS.map((action) => [
        `${resource}:${action}`,
        isDefaultAllowed(role, resource, action),
      ]),
    ),
  );
  mocks.grants.mockResolvedValue(storedGrants(stored));
  mocks.modules.mockResolvedValue(
    DEFAULT_FEATURE_MODULES.map(({ moduleKey }) => ({
      moduleKey,
      isEnabled: true,
    })),
  );
  expect(await getEffectivePermissions(role)).toEqual(stored);
  mocks.grants.mockResolvedValue([]);
  expect(
    Object.values(await getEffectivePermissions(role)).every(
      (value) => value === (role === "super_admin"),
    ),
  ).toBe(true);
});
