import { describe, expect, test } from "vitest";
import { getTranslations } from "../../packages/locales/src";
import { PROJECT_STATUSES, TASK_LINK_TYPES, TASK_PRIORITIES, TASK_STATUSES, dueBucket, projectProgress } from "../../packages/database/src/constants/tasks";
import { ALL_RESOURCES, DEFAULT_ROLE_RULES, RESOURCE_FEATURES } from "../../packages/database/src/constants/permissions";
import { DEFAULT_FEATURE_MODULES, moduleOnByDefault } from "../../packages/database/src/constants/features";

describe("tasks", () => {
  test("due dates group into overdue, today, this week, later and none", () => {
    const today = "2026-06-10";
    expect(dueBucket("2026-06-09", today)).toBe("overdue");
    expect(dueBucket("2026-06-10", today)).toBe("today");
    expect(dueBucket("2026-06-17", today)).toBe("week");
    expect(dueBucket("2026-06-18", today)).toBe("later");
    expect(dueBucket(null, today)).toBe("none");
  });

  test("project progress counts done against everything not cancelled", () => {
    expect(projectProgress({ todo: 1, in_progress: 1, done: 2, cancelled: 5 })).toBe(50);
    expect(projectProgress({})).toBe(0);
  });

  test("tasks are on for every company and every working role can use them", () => {
    expect(ALL_RESOURCES).toContain("tasks");
    expect(RESOURCE_FEATURES.tasks).toBe("tasks");
    expect(DEFAULT_FEATURE_MODULES.some((m) => m.moduleKey === "tasks")).toBe(true);
    expect(moduleOnByDefault("tasks")).toBe(true);
    for (const [role, rules] of Object.entries(DEFAULT_ROLE_RULES)) {
      if (role === "super_admin" || role === "viewer") continue;
      expect((rules as Record<string, string[]>).tasks, role).toEqual(expect.arrayContaining(["read", "create", "edit"]));
    }
  });

  test("every status, priority, project status and link is named in both languages", () => {
    for (const locale of ["en", "ar"] as const) {
      const t = (getTranslations(locale).admin as unknown as { tasks: { statuses: Record<string, string>; priorities: Record<string, string>; links: Record<string, string>; projects: { statuses: Record<string, string> } } }).tasks;
      for (const s of TASK_STATUSES) expect(t.statuses[s]).toBeTruthy();
      for (const p of TASK_PRIORITIES) expect(t.priorities[p]).toBeTruthy();
      for (const l of TASK_LINK_TYPES) expect(t.links[l]).toBeTruthy();
      for (const s of PROJECT_STATUSES) expect(t.projects.statuses[s]).toBeTruthy();
    }
  });
});
