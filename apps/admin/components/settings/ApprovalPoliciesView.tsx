"use client";

import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { toast } from "sonner";
import { AlarmClock, BellRing, ChevronDown, Filter, Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@platform/ui";
import {
  APPROVAL_CONDITION_FIELDS,
  APPROVER_MODES,
  type ApprovalConditionField,
  type ApproverMode,
} from "@platform/database/constants/approvals";
import { ALL_ACTIONS, ALL_ROLES, PERMISSION_GROUPS } from "@platform/database/constants/permissions";
import type { ApprovalPolicyView } from "@platform/database/queries/approval-policies";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { updateApprovalPolicyAction } from "../../app/actions/approval-policies";
import { SettingsNavTabs } from "./SettingsNavTabs";

type Step = ApprovalPolicyView["steps"][number];
type User = { id: string; fullName: string; role: string };

const fieldClass =
  "min-w-0 rounded-lg border border-ink/15 bg-white dark:bg-surface px-2.5 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/40";
const numberClass = `${fieldClass} w-24`;

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

function useRoleLabel() {
  const { t } = useAdminLocale();
  return (role: string) => (t.roles as Record<string, string>)[role] ?? role.replaceAll("_", " ");
}

function StepEditor({
  step,
  index,
  targetType,
  users,
  onChange,
  onRemove,
}: {
  step: Step;
  index: number;
  targetType: ApprovalPolicyView["targetType"];
  users: User[];
  onChange: (patch: Partial<Step>) => void;
  onRemove: () => void;
}) {
  const { t } = useAdminLocale();
  const p = t.approvalPolicies;
  const labels = t.permissionLabels;
  const roleLabel = useRoleLabel();
  const conditionFields = APPROVAL_CONDITION_FIELDS[targetType];
  const escalating = step.escalateAfterHours != null;

  return (
    <li className="relative rounded-xl border border-ink/10 bg-slate-50/70 dark:bg-white/[0.03] p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-bold text-white">
          {index + 1}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{p.approverLabel}</span>
        <select
          aria-label={p.steps}
          className={fieldClass}
          value={step.approverMode}
          onChange={(e) => onChange({ approverMode: e.target.value as ApproverMode, roleKey: null, userId: null, permission: null })}
        >
          {APPROVER_MODES.map((mode) => (
            <option key={mode} value={mode}>{p.modes[mode]}</option>
          ))}
        </select>
        {step.approverMode === "role" && (
          <select aria-label={p.chooseRole} className={fieldClass} value={step.roleKey ?? ""} onChange={(e) => onChange({ roleKey: e.target.value })}>
            <option value="" disabled>{p.chooseRole}</option>
            {ALL_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
          </select>
        )}
        {step.approverMode === "user" && (
          <select aria-label={p.chooseUser} className={fieldClass} value={step.userId ?? ""} onChange={(e) => onChange({ userId: e.target.value })}>
            <option value="" disabled>{p.chooseUser}</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
          </select>
        )}
        {step.approverMode === "permission" && (
          <select aria-label={p.choosePermission} className={`${fieldClass} max-w-full`} value={step.permission ?? ""} onChange={(e) => onChange({ permission: e.target.value })}>
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
        <Button type="button" variant="ghost" size="sm" aria-label={p.removeStep} className="ms-auto" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {conditionFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
            <Filter className="w-3.5 h-3.5" />
            {p.conditions}
          </span>
          {conditionFields.map((field: ApprovalConditionField) => (
            <label key={field} className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              {p[field]}
              <input
                type="number"
                min={0}
                step={field === "minAmount" ? "0.001" : field === "minDays" ? "0.5" : "0.01"}
                inputMode="decimal"
                className={numberClass}
                value={step[field] ?? ""}
                placeholder="—"
                onChange={(e) => onChange({ [field]: toNumber(e.target.value) })}
              />
            </label>
          ))}
          <span className="basis-full text-[11px] text-slate-500">{p.conditionsHint}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <label className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="accent-accent"
            checked={escalating}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { escalateAfterHours: 24, escalateMode: "role", escalateRoleKey: "admin", escalateUserId: null }
                  : { escalateAfterHours: null, escalateMode: null, escalateRoleKey: null, escalateUserId: null },
              )
            }
          />
          <AlarmClock className="w-3.5 h-3.5" />
          {p.escalate}
        </label>
        {escalating && (
          <>
            <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              {p.escalateAfter}
              <input
                type="number"
                min={1}
                max={720}
                className={numberClass}
                value={step.escalateAfterHours ?? ""}
                onChange={(e) => onChange({ escalateAfterHours: toNumber(e.target.value) })}
              />
            </label>
            <select
              aria-label={p.escalateTo}
              className={fieldClass}
              value={step.escalateMode ?? "role"}
              onChange={(e) => onChange({ escalateMode: e.target.value as "role" | "user", escalateRoleKey: null, escalateUserId: null })}
            >
              <option value="role">{p.escalateModes.role}</option>
              <option value="user">{p.escalateModes.user}</option>
            </select>
            {step.escalateMode === "user" ? (
              <select aria-label={p.chooseUser} className={fieldClass} value={step.escalateUserId ?? ""} onChange={(e) => onChange({ escalateUserId: e.target.value })}>
                <option value="" disabled>{p.chooseUser}</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
              </select>
            ) : (
              <select aria-label={p.chooseRole} className={fieldClass} value={step.escalateRoleKey ?? ""} onChange={(e) => onChange({ escalateRoleKey: e.target.value })}>
                <option value="" disabled>{p.chooseRole}</option>
                {ALL_ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function PolicyCard({ policy, users }: { policy: ApprovalPolicyView; users: User[] }) {
  const { t, isRTL } = useAdminLocale();
  const p = t.approvalPolicies;
  const roleLabel = useRoleLabel();
  const [draft, setDraft] = React.useState(policy);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  const panelId = `policy-${policy.targetType}`;

  const updateStep = (index: number, patch: Partial<Step>) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) }));

  const save = async () => {
    setSaving(true);
    try {
      await updateApprovalPolicyAction(draft.targetType, {
        enabled: draft.enabled,
        allowSelfApproval: draft.allowSelfApproval,
        autoApproveRoles: draft.autoApproveRoles,
        reminderAfterHours: draft.reminderAfterHours,
        steps: draft.steps.map(({ order: _order, ...step }) => step),
      });
      toast.success(p.saved);
    } catch (error) {
      toast.error(errorMessage(error, t, p.saveError));
    } finally {
      setSaving(false);
    }
  };

  const summary = !draft.enabled
    ? p.enabledHint
    : draft.steps.length === 0
      ? p.summaryNoSteps
      : draft.steps
          .map((step) =>
            step.approverMode === "role" && step.roleKey
              ? roleLabel(step.roleKey)
              : step.approverMode === "user"
                ? users.find((u) => u.id === step.userId)?.fullName ?? p.modes.user
                : p.modes[step.approverMode],
          )
          .join(isRTL ? " ← " : " → ");

  return (
    <Card className="p-0 overflow-hidden dark:bg-surface-raised">
      <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t.approvals.types[draft.targetType]}</span>
            <span className="block truncate text-xs text-slate-500">{summary}</span>
          </span>
        </button>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            role="switch"
            className="accent-accent"
            checked={draft.enabled}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          {p.enabled}
        </label>
      </div>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-ink/10 p-4 sm:p-5">
          {draft.enabled ? (
            <>
              <ol className="space-y-2.5">
                {draft.steps.map((step, index) => (
                  <StepEditor
                    key={index}
                    step={step}
                    index={index}
                    targetType={draft.targetType}
                    users={users}
                    onChange={(patch) => updateStep(index, patch)}
                    onRemove={() => setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== index) }))}
                  />
                ))}
              </ol>
              {draft.steps.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      steps: [...d.steps, { order: d.steps.length + 1, approverMode: "manager", roleKey: null, userId: null, permission: null }],
                    }))
                  }
                >
                  <Plus className="w-3.5 h-3.5 me-1" />
                  {p.addStep}
                </Button>
              )}
              {APPROVAL_CONDITION_FIELDS[draft.targetType].length > 0 && (
                <p className="text-[11px] text-slate-500">{p.thresholdNote}</p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={draft.allowSelfApproval}
                      onChange={(e) => setDraft({ ...draft, allowSelfApproval: e.target.checked })}
                    />
                    {p.allowSelf}
                  </label>
                  <label className="block space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                      <BellRing className="w-3.5 h-3.5" />
                      {p.reminder}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      className={`${numberClass} block`}
                      placeholder="—"
                      value={draft.reminderAfterHours ?? ""}
                      onChange={(e) => setDraft({ ...draft, reminderAfterHours: toNumber(e.target.value) })}
                    />
                    <span className="block text-[11px] text-slate-500">{p.reminderHint}</span>
                  </label>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-slate-700 dark:text-slate-200">{p.autoApproveRoles}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((role) => {
                      const on = draft.autoApproveRoles.includes(role);
                      return (
                        <label
                          key={role}
                          className={`cursor-pointer rounded-full border px-2.5 py-1 transition-colors focus-within:ring-2 focus-within:ring-accent/40 ${
                            on ? "border-accent bg-accent/10 text-slate-900 dark:text-white" : "border-ink/15 text-slate-600 dark:text-slate-300"
                          }`}
                        >
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
                          {roleLabel(role)}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">{p.enabledHint}</p>
          )}
        </div>
      )}

      {(open || dirty) && (
        <div className="flex justify-end border-t border-ink/10 px-4 py-3 sm:px-5">
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={save} className="bg-primary text-white">
            {p.save}
          </Button>
        </div>
      )}
    </Card>
  );
}

export function ApprovalPoliciesView({ policies, users }: { policies: ApprovalPolicyView[]; users: User[] }) {
  const { t } = useAdminLocale();
  const p = t.approvalPolicies;
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <SettingsNavTabs />
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{p.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{p.subtitle}</p>
        <p className="text-xs text-slate-500 mt-2">{p.fallbackNote}</p>
      </header>
      <div className="space-y-3">
        {policies.map((policy) => (
          <PolicyCard key={policy.targetType} policy={policy} users={users} />
        ))}
      </div>
    </div>
  );
}
