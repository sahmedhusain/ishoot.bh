"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Modal } from "@platform/ui";
import { PERMISSION_GROUPS } from "@platform/database/constants/permissions";
import { setUserPermissionOverridesAction } from "../../app/actions/permission-overrides";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

const ACTIONS = ["read", "create", "edit", "delete", "approve", "export", "issue_send", "assign"] as const;
type Cell = "role" | "allow" | "deny";

/**
 * One person's privileges on top of their role: each permission follows the role, or is allowed or denied for this
 * person only. Changes take effect at their next page load.
 */
export function UserPermissionOverrides({ user, roleGrants, onClose }: { user: { id: string; name: string; role: string; permissions?: Record<string, boolean> | null }; roleGrants: Record<string, boolean>; onClose: () => void }) {
  const { t } = useAdminLocale();
  const o = t.permissionOverrides;
  const labels = t.permissionLabels as { groups: Record<string, string>; actions: Record<string, string>; resources: Record<string, string> };
  const router = useRouter();
  const initial = Object.fromEntries(Object.entries(user.permissions ?? {}).filter(([key]) => !key.endsWith(":write"))) as Record<string, boolean>;
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>(initial);
  const [busy, setBusy] = React.useState(false);

  const state = (key: string): Cell => (overrides[key] === undefined ? "role" : overrides[key] ? "allow" : "deny");
  const cycle = (key: string) =>
    setOverrides((prev) => {
      const next = { ...prev };
      const current = state(key);
      if (current === "role") next[key] = !roleGrants[key];
      else if (current === "allow") next[key] = false;
      else delete next[key];
      // A choice that matches the role is no override at all.
      if (next[key] === roleGrants[key] && current !== "role") delete next[key];
      return next;
    });
  const effective = (key: string) => (overrides[key] ?? roleGrants[key]) === true;
  const count = Object.keys(overrides).length;

  const save = async () => {
    setBusy(true);
    try {
      await setUserPermissionOverridesAction(user.id, overrides);
      toast.success(o.saved);
      router.refresh();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, t, o.failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal closeLabel={t.actions.close} isOpen onClose={onClose} title={o.title.replace("{name}", user.name)}>
      <div className="space-y-4 text-xs">
        <p className="text-ink-muted">{o.hint}</p>
        <div className="flex flex-wrap gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-ink/20 bg-ink/5" />{o.legend.role}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" />{o.legend.allow}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" />{o.legend.deny}</span>
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-2xl border border-ink/10">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-surface text-ink-muted">
              <tr>
                <th className="px-2 py-2 text-start">{o.resource}</th>
                {ACTIONS.map((a) => <th key={a} className="px-1 py-2 text-center font-medium">{labels.actions[a] ?? a}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <React.Fragment key={group.key}>
                  <tr><td colSpan={ACTIONS.length + 1} className="bg-ink/[0.03] px-2 py-1 text-[10px] font-bold uppercase text-ink-muted">{labels.groups[group.key] ?? group.key}</td></tr>
                  {group.resources.map((resource) => (
                    <tr key={resource} className="border-t border-ink/5">
                      <td className="px-2 py-1.5 text-ink">{labels.resources[resource] ?? resource}</td>
                      {ACTIONS.map((action) => {
                        const key = `${resource}:${action}`;
                        const cell = state(key);
                        const on = effective(key);
                        return (
                          <td key={action} className="px-1 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => cycle(key)}
                              aria-label={`${labels.resources[resource] ?? resource} · ${labels.actions[action] ?? action}: ${o.cells[cell]} (${on ? o.on : o.off})`}
                              title={o.cells[cell]}
                              className={`h-6 w-9 rounded-md text-[10px] font-bold ${cell === "allow" ? "bg-emerald-500 text-white" : cell === "deny" ? "bg-rose-500 text-white" : on ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border border-ink/15 bg-ink/5 text-ink-muted"
                                }`}
                            >
                              {on ? "✓" : "–"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-ink-muted">{o.count.replace("{n}", String(count))}</span>
          <div className="flex gap-2">
            {count > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => setOverrides({})}>{o.reset}</Button>}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>{t.actions.cancel}</Button>
            <Button type="button" size="sm" disabled={busy} onClick={save}>{o.save}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
