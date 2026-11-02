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
    <fieldset disabled={disabled} className="min-w-0 space-y-5">
      <details className="rounded-2xl border border-outline-variant p-3">
        <summary className="cursor-pointer font-semibold">
          {n.overrides}
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-2 text-start">{n.effective}</th>
                {STAFF_ACTIONS.map((action) => (
                  <th key={action} className="p-2">
                    {actionLabels[action] ?? action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAFF_RESOURCES.map((resource) => (
                <tr key={resource} className="border-t border-outline-variant">
                  <th className="p-2 text-start font-medium">
                    {resourceLabels[resource] ?? resource}
                  </th>
                  {STAFF_ACTIONS.map((action) => {
                    const key = `${resource}:${action}`;
                    return (
                      <td key={action} className="p-1">
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
                          className="rounded-lg border border-outline-variant bg-surface p-1.5"
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
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="font-semibold sm:col-span-2">{n.scopes}</p>
        {STAFF_SCOPE_AREAS.map((area) => (
          <label key={area} className="space-y-1 text-sm">
            <span>{resourceLabels[area] ?? area}</span>
            <select
              value={scopes[area] ?? ""}
              onChange={(event) => {
                const next = { ...scopes };
                const value=event.target.value;
                if(value==="own"||value==="department"||value==="all")next[area]=value;
                else delete next[area];
                onChange(grants, next);
              }}
              className="block w-full rounded-xl border border-outline-variant bg-surface p-2"
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
      className="max-h-80 overflow-auto rounded-2xl bg-primary/5 p-4 text-sm"
    >
      <h3 className="mb-3 font-semibold">{n.effective}</h3>
      <dl className="space-y-2">
        {STAFF_RESOURCES.map((resource) => (
          <div key={resource}>
            <dt className="font-medium">{resources[resource] ?? resource}</dt>
            <dd className="text-ink-muted">
              {STAFF_ACTIONS.filter(
                (action) => permissions[`${resource}:${action}`],
              )
                .map((action) => actions[action] ?? action)
                .join(", ") || n.denied}
            </dd>
          </div>
        ))}
        {Object.entries(scopes).map(([area, scope]) => (
          <div key={`scope-${area}`}>
            <dt>{resources[area] ?? area}</dt>
            <dd>{scopeLabels[scope] ?? scope}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
