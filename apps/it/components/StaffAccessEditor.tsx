"use client";
import {
  STAFF_RESOURCES,
  STAFF_ACTIONS,
  STAFF_SCOPE_AREAS,
  STAFF_SCOPES,
} from "@platform/contracts";
import type { StaffAccessTemplate } from "@platform/api-client";
import { useCopy } from "./CopyProvider";

export function StaffAccessEditor({
  grants,
  scopes,
  onChange,
  inherit = false,
  disabled = false,
}: {
  grants: Record<string, boolean>;
  scopes: StaffAccessTemplate["dataScopes"];
  onChange: (
    grants: Record<string, boolean>,
    scopes: StaffAccessTemplate["dataScopes"],
  ) => void;
  inherit?: boolean;
  disabled?: boolean;
}) {
  const { copy } = useCopy();
  const n = copy.staffAccounts;
  const labels = copy.staffPermissionLabels;
  const resourceLabels: Record<string, string> = labels.resources,
    actionLabels: Record<string, string> = labels.actions;
  const scopeLabels: Record<string, string> = {
    own: n.own,
    department: n.department,
    all: n.all,
  };
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4 font-mono text-xs">
      <details className="border border-slate-300 dark:border-slate-700 p-2.5 bg-surface">
        <summary className="cursor-pointer font-bold uppercase text-ink">
          [+] {n.overrides}
        </summary>
        <div className="mt-2 max-h-96 overflow-auto">
          <table className="it-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-start">{n.effective}</th>
                {STAFF_ACTIONS.map((action) => (
                  <th key={action} className="text-center">
                    {actionLabels[action] ?? action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAFF_RESOURCES.map((resource) => (
                <tr key={resource}>
                  <th className="text-start font-bold uppercase text-ink">
                    {resourceLabels[resource] ?? resource}
                  </th>
                  {STAFF_ACTIONS.map((action) => {
                    const key = `${resource}:${action}`;
                    return (
                      <td key={action} className="p-0.5 text-center">
                        <select
                          aria-label={`${resourceLabels[resource] ?? resource}: ${actionLabels[action] ?? action}`}
                          value={
                            grants[key] === undefined
                              ? inherit
                                ? ""
                                : "false"
                              : String(grants[key])
                          }
                          onChange={(event) => {
                            const next = { ...grants };
                            if (event.target.value === "") delete next[key];
                            else next[key] = event.target.value === "true";
                            onChange(next, scopes);
                          }}
                          className="it-field-sunken text-[10px] font-mono py-0.5 px-1"
                        >
                          {inherit && <option value="">{n.inherit}</option>}
                          <option value="true">{n.allow}</option>
                          <option value="false">{n.deny}</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="font-bold uppercase text-ink sm:col-span-2">{n.scopes}</p>
        {STAFF_SCOPE_AREAS.map((area) => (
          <label key={area} className="space-y-1 block">
            <span className="font-bold text-ink-muted uppercase text-[10px]">
              {resourceLabels[area] ?? area}
            </span>
            <select
              value={scopes[area] ?? ""}
              onChange={(event) => {
                const next = { ...scopes };
                const value = event.target.value;
                if (value === "own" || value === "department" || value === "all")
                  next[area] = value;
                else delete next[area];
                onChange(grants, next);
              }}
              className="it-field-sunken block w-full text-xs font-mono"
            >
              <option value="">{n.inherit}</option>
              {STAFF_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scopeLabels[scope] ?? scope}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function StaffEffectiveAccess({
  permissions,
  scopes,
}: {
  permissions: Record<string, boolean>;
  scopes: Record<string, string>;
}) {
  const { copy } = useCopy();
  const n = copy.staffAccounts;
  const resources: Record<string, string> =
    copy.staffPermissionLabels.resources;
  const actions: Record<string, string> = copy.staffPermissionLabels.actions;
  const scopeLabels: Record<string, string> = {
    own: n.own,
    department: n.department,
    all: n.all,
  };
  return (
    <div
      aria-live="polite"
      className="max-h-80 overflow-auto border border-slate-300 dark:border-slate-700 bg-surface p-3 font-mono text-xs"
    >
      <h3 className="mb-2 font-bold uppercase tracking-wide text-ink">{n.effective}</h3>
      <dl className="space-y-1.5">
        {STAFF_RESOURCES.map((resource) => (
          <div key={resource} className="border-b border-slate-200 dark:border-slate-800 pb-1">
            <dt className="font-bold text-ink uppercase">{resources[resource] ?? resource}</dt>
            <dd className="text-ink-muted text-[11px]">
              {STAFF_ACTIONS.filter(
                (action) => permissions[`${resource}:${action}`],
              )
                .map((action) => actions[action] ?? action)
                .join(", ") || n.denied}
            </dd>
          </div>
        ))}
        {Object.entries(scopes).map(([area, scope]) => (
          <div key={`scope-${area}`} className="border-b border-slate-200 dark:border-slate-800 pb-1">
            <dt className="font-bold text-ink uppercase">{resources[area] ?? area}</dt>
            <dd className="text-ink-muted text-[11px]">{scopeLabels[scope] ?? scope}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
