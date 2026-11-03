import { describe, expect, test } from "vitest";
import { getTranslations } from "../../locales";
import { BUSINESS_ACTIVITIES } from "../../lib/database/website-presets";
import {
  ACTIVITY_DEPARTMENTS,
  DEPARTMENT_CATALOGUE,
  DEPARTMENT_CODES,
  activityDepartments,
} from "../../lib/database/constants/departments";

describe("department catalogue", () => {
  test("every catalogue department has a unique code and a name in both languages", () => {
    expect(new Set(Object.values(DEPARTMENT_CODES)).size).toBe(
      DEPARTMENT_CATALOGUE.length,
    );
    for (const locale of ["en", "ar"] as const) {
      const names = getTranslations(locale).admin.departmentCatalogue as Record<
        string,
        string
      >;
      for (const key of DEPARTMENT_CATALOGUE)
        expect(names[key], `${locale} ${key}`).toBeTruthy();
    }
  });

  test("every activity starts with management, finance and HR, without repeats", () => {
    for (const activity of BUSINESS_ACTIVITIES) {
      expect(ACTIVITY_DEPARTMENTS[activity], activity).toBeDefined();
      const list = activityDepartments(activity);
      expect(new Set(list).size, activity).toBe(list.length);
      for (const key of ["management", "finance", "hr"])
        expect(list, activity).toContain(key);
    }
  });
});

describe("data scope defaults", async () => {
  const { DATA_SCOPE_AREAS, defaultDataScope } =
    await import("../../lib/database/constants/data-scope");
  test("owners see everything and roles from before data scopes keep seeing everything", () => {
    for (const area of DATA_SCOPE_AREAS) {
      for (const role of [
        "super_admin",
        "admin",
        "sales",
        "project_lead",
        "finance_manager",
        "viewer",
      ])
        expect(defaultDataScope(role, area), `${role} ${area}`).toBe("all");
    }
    expect(defaultDataScope("department_manager", "deals")).toBe("department");
    expect(defaultDataScope("employee", "leave")).toBe("own");
  });
});
