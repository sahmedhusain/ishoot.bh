"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { BadgeCheck, Download, Eye, Lock, PencilLine, ShieldCheck } from "lucide-react";
import { ALL_ACTIONS, PERMISSION_GROUPS, type PermissionAction, type PermissionResource } from "@platform/database/constants/permissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";

type Level = "full" | "edit" | "view" | "none";

const LEVEL_STYLE: Record<Level, string> = {
  full: "bg-emerald-500/12 text-emerald-800 ring-emerald-600/25 dark:text-emerald-300",
  edit: "bg-sky-500/12 text-sky-800 ring-sky-600/25 dark:text-sky-300",
  view: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300",
  none: "text-ink-muted ring-transparent",
};
const LEVEL_ICON = { full: ShieldCheck, edit: PencilLine, view: Eye, none: Lock } as const;

/** Summarises a role's grants on one module into a single access level, plus the extra rights worth flagging. */
function accessFor(grants: Record<string, boolean> | undefined, resource: string) {
  const has = (action: string) => grants?.[`${resource}:${action}`] === true;
  const canEdit = has("create") || has("edit") || has("write");
  const level: Level = !has("read") && !canEdit ? "none" : canEdit && has("delete") ? "full" : canEdit ? "edit" : "view";
  const actions = ALL_ACTIONS.filter((action) => action !== "write" && has(action));
  return { level, approve: has("approve"), export: has("export"), actions };
}

/** Read-only overview of what every role may do in every module. Editing lives in Settings → Roles. */
export function RolePermissionMatrix({
  roles,
  rolePermissions,
}: {
  roles: Array<{ key: string; name: string }>;
  rolePermissions: Record<string, Record<string, boolean>>;
}) {
  const { t } = useAdminLocale();
  const u = t.usersView;
  const labels = t.permissionLabels;
  const levelLabel: Record<Level, string> = { full: u.levelFull, edit: u.levelEdit, view: u.levelView, none: u.levelNone };
  const totalModules = PERMISSION_GROUPS.reduce((sum, group) => sum + group.resources.length, 0);
  const coverage = (role: string) =>
    PERMISSION_GROUPS.flatMap((group) => group.resources).filter((resource) => accessFor(rolePermissions[role], resource).level !== "none").length;

  return (
    <section className="overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm" aria-labelledby="matrix-title">
      <header className="flex flex-col gap-3 border-b border-outline-variant px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 id="matrix-title" className="text-base font-bold text-ink">{u.matrixTitle}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{u.matrixSubtitle}</p>
        </div>
        <ul className="flex flex-wrap items-center gap-2 text-[11px] font-medium" aria-label={u.legend}>
          {(["full", "edit", "view", "none"] as const).map((level) => {
            const Icon = LEVEL_ICON[level];
            return (
              <li key={level} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ring-inset ${LEVEL_STYLE[level]} ${level === "none" ? "ring-ink/10" : ""}`}>
                <Icon className="h-3 w-3" aria-hidden />
                {levelLabel[level]}
              </li>
            );
          })}
          <li className="inline-flex items-center gap-1 text-ink-muted"><BadgeCheck className="h-3 w-3 text-violet-600 dark:text-violet-400" aria-hidden />{labels.actions.approve}</li>
          <li className="inline-flex items-center gap-1 text-ink-muted"><Download className="h-3 w-3 text-ink-muted" aria-hidden />{labels.actions.export}</li>
        </ul>
      </header>

      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 top-0 z-30 min-w-[190px] border-b border-outline-variant bg-surface px-4 py-3 text-start font-semibold text-ink-muted">
                {u.moduleHeader}
              </th>
              {roles.map((role) => {
                const covered = coverage(role.key);
                return (
                  <th key={role.key} scope="col" className="sticky top-0 z-20 min-w-[112px] border-b border-outline-variant bg-surface px-2 py-3 text-center align-bottom">
                    <span className="block font-semibold leading-tight text-ink"><bdi dir="auto">{role.name}</bdi></span>
                    <span className="mt-1.5 block text-[10px] font-normal text-ink-muted">
                      {formatMessage(u.coverage, { count: String(covered), total: String(totalModules) })}
                    </span>
                    <span className="mx-auto mt-1 block h-1 w-14 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round((covered / totalModules) * 100)}%` }} />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          {PERMISSION_GROUPS.map((group) => (
            <tbody key={group.key}>
              <tr>
                <th scope="colgroup" colSpan={roles.length + 1} className="border-b border-outline-variant bg-ink/[0.04] px-4 py-2 text-start text-[11px] font-bold text-ink-muted">
                  <span className="sticky start-4">{labels.groups[group.key as keyof typeof labels.groups]}</span>
                </th>
              </tr>
              {group.resources.map((resource: PermissionResource) => (
                <tr key={resource} className="group">
                  <th scope="row" className="sticky start-0 z-10 border-b border-outline-variant bg-surface px-4 py-2.5 text-start font-medium text-ink group-hover:bg-ink/[0.03]">
                    {labels.resources[resource]}
                  </th>
                  {roles.map((role) => {
                    const access = accessFor(rolePermissions[role.key], resource);
                    const Icon = LEVEL_ICON[access.level];
                    const detail = access.actions.length
                      ? access.actions.map((action) => labels.actions[action as Exclude<PermissionAction, "write">]).join(u.listSeparator)
                      : u.levelNone;
                    return (
                      <td key={role.key} className="border-b border-outline-variant px-2 py-2 text-center group-hover:bg-ink/[0.03]">
                        <span className="inline-flex items-center gap-1" title={`${role.name} · ${labels.resources[resource]}: ${detail}`}>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${LEVEL_STYLE[access.level]}`}>
                            <Icon className="h-3 w-3" aria-hidden />
                            {access.level === "none" ? <span className="sr-only">{levelLabel.none}</span> : levelLabel[access.level]}
                          </span>
                          {access.approve && <BadgeCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-label={labels.actions.approve} />}
                          {access.export && <Download className="h-3 w-3 text-ink-muted" aria-label={labels.actions.export} />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="border-t border-outline-variant px-5 py-3 text-[11px] text-ink-muted">{u.matrixFootnote}</p>
    </section>
  );
}
