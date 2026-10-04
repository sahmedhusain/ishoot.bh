"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@ishoot/ui";
import { APPROVER_MODES, type ApproverMode } from "@ishoot/database/constants/approvals";
import { ALL_ACTIONS, ALL_ROLES, PERMISSION_GROUPS } from "@ishoot/database/constants/permissions";
import type { ApprovalPolicyView } from "@ishoot/database/queries/approval-policies";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateApprovalPolicyAction } from "../../app/actions/approval-policies";
import { SettingsNavTabs } from "./SettingsNavTabs";

type Step = ApprovalPolicyView["steps"][number];

const selectClass =
  "rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface px-2.5 py-1.5 text-xs";

function PolicyCard({
  policy,
  users,
}: {
  policy: ApprovalPolicyView;
  users: Array<{ id: string; fullName: string; role: string }>;
}) {
  const { t } = useAdminLocale();
  const p = t.approvalPolicies;
  const labels = t.permissionLabels;
  const [draft, setDraft] = React.useState(policy);
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);

  const updateStep = (index: number, patch: Partial<Step>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }));

  const save = async () => {
    setSaving(true);
    try {
      await updateApprovalPolicyAction(draft.targetType, {
        enabled: draft.enabled,
        allowSelfApproval: draft.allowSelfApproval,
        autoApproveRoles: draft.autoApproveRoles,
        steps: draft.steps.map(({ approverMode, roleKey, userId, permission }) => ({ approverMode, roleKey, userId, permission })),
      });
      toast.success(p.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : p.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4 dark:bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t.approvals.types[draft.targetType]}
        </h2>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-accent"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          {p.enabled}
        </label>
      </div>
      {!draft.enabled && <p className="text-xs text-slate-500">{p.enabledHint}</p>}

      {draft.enabled && (
        <>
          <ol className="space-y-2">
            {draft.steps.map((step, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-white/5 p-2.5">
                <span className="text-xs font-semibold text-slate-500 w-16">{p.stepN.replace("{n}", String(index + 1))}</span>
                <select
                  aria-label={p.steps}
                  className={selectClass}
                  value={step.approverMode}
                  onChange={(e) => updateStep(index, { approverMode: e.target.value as ApproverMode, roleKey: null, userId: null, permission: null })}
                >
                  {APPROVER_MODES.map((mode) => (
                    <option key={mode} value={mode}>{p.modes[mode]}</option>
                  ))}
                </select>
                {step.approverMode === "role" && (
                  <select aria-label={p.chooseRole} className={selectClass} value={step.roleKey ?? ""} onChange={(e) => updateStep(index, { roleKey: e.target.value })}>
                    <option value="" disabled>{p.chooseRole}</option>
                    {ALL_ROLES.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}
                  </select>
                )}
                {step.approverMode === "user" && (
                  <select aria-label={p.chooseUser} className={selectClass} value={step.userId ?? ""} onChange={(e) => updateStep(index, { userId: e.target.value })}>
                    <option value="" disabled>{p.chooseUser}</option>
                    {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
                  </select>
                )}
                {step.approverMode === "permission" && (
                  <select aria-label={p.choosePermission} className={selectClass} value={step.permission ?? ""} onChange={(e) => updateStep(index, { permission: e.target.value })}>
                    <option value="" disabled>{p.choosePermission}</option>
                    {PERMISSION_GROUPS.flatMap((group) => group.resources).flatMap((resource) =>
                      ALL_ACTIONS.filter((action) => action === "approve" || action === "issue_send").map((action) => (
                        <option key={`${resource}:${action}`} value={`${resource}:${action}`}>
                          {labels.resources[resource]} — {labels.actions[action]}
                        </option>
                      )),
                    )}
                  </select>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={p.removeStep}
                  className="ms-auto"
                  onClick={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }))}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </li>
            ))}
          </ol>
          {draft.steps.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((d) => ({ ...d, steps: [...d.steps, { order: d.steps.length + 1, approverMode: "manager", roleKey: null, userId: null, permission: null }] }))
              }
            >
              <Plus className="w-3.5 h-3.5 me-1" />
              {p.addStep}
            </Button>
          )}

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-accent"
                checked={draft.allowSelfApproval}
                onChange={(e) => setDraft({ ...draft, allowSelfApproval: e.target.checked })}
              />
              {p.allowSelf}
            </label>
            <fieldset>
              <legend className="mb-1 text-slate-500">{p.autoApproveRoles}</legend>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((role) => {
                  const on = draft.autoApproveRoles.includes(role);
                  return (
                    <label key={role} className={`cursor-pointer rounded-full border px-2 py-0.5 ${on ? "border-accent bg-accent/10" : "border-slate-200 dark:border-white/10"}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() =>
                          setDraft((d) => ({
                            ...d,
                            autoApproveRoles: on ? d.autoApproveRoles.filter((r) => r !== role) : [...d.autoApproveRoles, role],
                          }))
                        }
                      />
                      {role.replaceAll("_", " ")}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={save} className="bg-primary text-white">
          {p.save}
        </Button>
      </div>
    </Card>
  );
}

export function ApprovalPoliciesView({
  policies,
  users,
}: {
  policies: ApprovalPolicyView[];
  users: Array<{ id: string; fullName: string; role: string }>;
}) {
  const { t } = useAdminLocale();
  const p = t.approvalPolicies;
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <SettingsNavTabs />
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{p.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{p.subtitle}</p>
        <p className="text-xs text-slate-400 mt-2">{p.fallbackNote}</p>
      </header>
      <div className="space-y-4">
        {policies.map((policy) => (
          <PolicyCard key={policy.targetType} policy={policy} users={users} />
        ))}
      </div>
    </div>
  );
}
