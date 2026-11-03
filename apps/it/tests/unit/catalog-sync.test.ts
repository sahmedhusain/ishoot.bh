// The shared catalogue (contracts/catalog) must equal the TypeScript constants it was taken from, so Go and the
// apps never disagree. `pnpm catalog:sync` rewrites the catalogue from the TypeScript constants (CATALOG_WRITE=1).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  ALL_ACTIONS,
  ALL_RESOURCES,
  ALL_ROLES,
  DEFAULT_ROLE_RULES,
  LEGACY_ROLE_IDS,
  PERMISSION_GROUPS,
  RESOURCE_FEATURES,
} from "../../../../packages/database/src/constants/permissions";
import { DEFAULT_FEATURE_MODULES } from "../../../../packages/database/src/constants/features";
import {
  DATA_SCOPE_AREAS,
  DATA_SCOPES,
  DEFAULT_DATA_SCOPES,
} from "../../../../packages/database/src/constants/data-scope";

const CATALOG_DIR = join(__dirname, "../../../../contracts/catalog");
const WRITE = process.env.CATALOG_WRITE === "1";

const fromTypeScript: Record<string, unknown> = {
  "staff-access.json": {
    resources: ALL_RESOURCES,
    actions: ALL_ACTIONS,
    roles: ALL_ROLES,
    legacyRoleIds: LEGACY_ROLE_IDS,
    resourceModules: RESOURCE_FEATURES,
    permissionGroups: PERMISSION_GROUPS,
    defaultRoleRules: DEFAULT_ROLE_RULES,
  },
  "modules.json": {
    modules: DEFAULT_FEATURE_MODULES.map((entry) => ({
      key: entry.moduleKey,
      nameEn: entry.nameEn,
      nameAr: entry.nameAr,
      enabledByDefault: !("isEnabled" in entry) || entry.isEnabled !== false,
    })),
  },
  "data-scopes.json": {
    areas: DATA_SCOPE_AREAS,
    scopes: DATA_SCOPES,
    defaults: DEFAULT_DATA_SCOPES,
  },
};

const normalize = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("shared catalogue", () => {
  for (const [file, expected] of Object.entries(fromTypeScript)) {
    test(`${file} matches the TypeScript constants`, () => {
      const path = join(CATALOG_DIR, file);
      if (WRITE)
        writeFileSync(path, `${JSON.stringify(expected, null, 2)}\n`, "utf8");
      const stored = JSON.parse(readFileSync(path, "utf8"));
      delete stored.$schema;
      expect(stored).toEqual(normalize(expected));
    });
  }
});
