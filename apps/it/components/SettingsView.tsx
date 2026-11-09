"use client";

import * as React from "react";
import {
  BellOff,
  Check,
  Languages,
  Monitor,
  Play,
  RotateCcw,
  Save,
  Shield,
  Sun,
  Trash2,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import {
  desktopPermission,
  playNotificationSound,
  requestDesktopPermission,
  unlockNotificationSound,
  type DesktopPermission,
} from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { NOTIFICATION_SOUNDS, notificationCategory } from "@platform/contracts";
import type { NotificationPreferences, StatusChoice } from "@platform/api-client";

type PresenceStatus = "available" | "busy" | "do_not_disturb" | "in_a_meeting" | "away";
import { setLocaleAction, signOutAction, beginItMFAAction, cancelItMFAAction, confirmItMFAAction, disableItMFAAction, getItSecurityStatusAction } from "../app/actions";
import { savePreferencesAction, unmuteRecordAction, setStatusAction, clearStatusAction } from "../app/live-actions";
import { useCopy } from "./CopyProvider";
import { useItLive } from "./live/ItLive";
import { PageTitle } from "./ticket-ui";
import {
  getITRolesAction,
  saveITRoleAction,
  deleteITRoleAction,
} from "../app/(desk)/settings/actions";
import type { ITRoleDraft } from "@platform/api-client";
import { CriticalActionModal } from "./CriticalActionModal";

const FOREVER = "9999-12-31T00:00:00Z";

const IT_TAB_RESOURCES = [
  { key: "tickets", label: "Ticket Queue [SM37]", group: "Workspace" },
  { key: "ticket_settings", label: "SLA Targets [ST03]", group: "Workspace" },
  { key: "modules", label: "Feature Modules [RZ10]", group: "Platform" },
  { key: "integrations", label: "Integrations & RFC [SM59]", group: "Platform" },
  { key: "domains", label: "Site & DNS [AL08]", group: "Platform" },
  { key: "setup", label: "Company Setup [SPRO]", group: "Platform" },
  { key: "staff_accounts", label: "Staff Accounts [SU01]", group: "Access" },
  { key: "staff_roles", label: "Staff Roles (RBAC) [PFCG]", group: "Access" },
  { key: "it_accounts", label: "IT Team Accounts [SU10]", group: "Access" },
  { key: "sessions", label: "Active Sessions [SM04S]", group: "Access" },
  { key: "audit", label: "Audit Trail [SM20]", group: "Access" },
  { key: "system_health", label: "System Health [ST06]", group: "Operations" },
  { key: "logs", label: "System Logs & Traces [SM21]", group: "Operations" },
  { key: "database", label: "Database Operations [DB02]", group: "Operations" },
  { key: "jobs", label: "Background Jobs [SM36]", group: "Operations" },
  { key: "backups", label: "Database Backups [DB13]", group: "Operations" },
  { key: "api_keys", label: "API Keys [STRUST]", group: "Operations" },
  { key: "notifications", label: "Notifications Log [SOST]", group: "Operations" },
] as const;

const IT_CATEGORIES = ["it_tickets", "it_platform", "security", "system"] as const;

function muteUntil(choice: "1h" | "8h" | "tomorrow" | "forever"): string {
  const d = new Date();
  if (choice === "1h") d.setHours(d.getHours() + 1);
  else if (choice === "8h") d.setHours(d.getHours() + 8);
  else if (choice === "tomorrow") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else return FOREVER;
  return d.toISOString();
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`it-btn-3d py-0.5 px-2 text-xs font-mono font-bold ${
        checked ? "text-emerald-800 dark:text-emerald-300" : "text-slate-500"
      }`}
    >
      {checked ? "[ON]" : "[OFF]"}
    </button>
  );
}

function Section({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="it-card space-y-3 p-3 font-mono text-xs">
      <div className="flex items-start gap-2 border-b border-slate-300 dark:border-slate-700 pb-1.5">
        <span className="mt-0.5 text-sky-600 dark:text-sky-400">{icon}</span>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-[11px] text-ink-muted font-sans">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function TwoFactorSettings() {
  const { copy } = useCopy();
  const sec = copy.settings.security;
  const [loading, setLoading] = React.useState(false);
  const [mfaEnabled, setMfaEnabled] = React.useState(false);
  const [step, setStep] = React.useState<"idle" | "enrolling" | "confirming" | "disabling">("idle");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [setupData, setSetupData] = React.useState<{ secret: string; uri: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);

  React.useEffect(() => {
    getItSecurityStatusAction().then((res) => {
      if (res.ok) setMfaEnabled(res.mfaEnabled);
    });
  }, []);

  const handleStartEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await beginItMFAAction(password);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error === "invalid_password" ? sec.currentPassword : sec.hint);
      return;
    }
    setSetupData({ secret: res.secret!, uri: res.uri! });
    setStep("confirming");
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await confirmItMFAAction(password, code);
    setLoading(false);
    if (!res.ok) {
      toast.error(sec.otpPlaceholder);
      return;
    }
    setMfaEnabled(true);
    setRecoveryCodes(res.recoveryCodes || []);
    setStep("idle");
    setPassword("");
    setCode("");
    toast.success(sec.mfaEnrolled);
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await disableItMFAAction(password, code);
    setLoading(false);
    if (!res.ok) {
      toast.error(sec.disablePrompt);
      return;
    }
    setMfaEnabled(false);
    setStep("idle");
    setPassword("");
    setCode("");
    toast.success(sec.mfaDisabled);
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 dark:border-slate-700 pb-2">
        <div>
          <p className="font-bold text-ink uppercase">{sec.title}</p>
          <p className="text-[11px] text-ink-muted font-sans">
            {sec.hint}
          </p>
        </div>
        <span
          className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            mfaEnabled
              ? "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {mfaEnabled ? "ACTIVE (TOTP)" : "DISABLED (PASSWORD ONLY)"}
        </span>
      </div>

      {recoveryCodes.length > 0 && (
        <div className="border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 space-y-1.5">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
            {sec.mfaRecoveryTitle}
          </p>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-emerald-900 dark:text-emerald-100">
            {recoveryCodes.map((rc, idx) => (
              <span key={idx} className="border border-emerald-300 dark:border-emerald-700 bg-surface p-1 select-all">{rc}</span>
            ))}
          </div>
        </div>
      )}

      {step === "idle" && (
        <div>
          {mfaEnabled ? (
            <button
              type="button"
              onClick={() => setStep("disabling")}
              className="it-btn-3d py-1 px-3 text-rose-700 dark:text-rose-400 font-bold"
            >
              {sec.disableMfa}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep("enrolling")}
              className="it-btn-3d py-1 px-3 text-emerald-800 dark:text-emerald-300 font-bold"
            >
              {sec.setupMfa}
            </button>
          )}
        </div>
      )}

      {step === "enrolling" && (
        <form onSubmit={handleStartEnroll} className="space-y-2 max-w-sm">
          <p className="text-[11px] text-ink-muted font-sans">{sec.enrollPrompt}</p>
          <input
            type="password"
            placeholder={sec.currentPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="it-field-sunken w-full font-mono text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="it-btn-3d py-1 px-3 font-bold text-emerald-800 dark:text-emerald-300"
            >
              {loading ? sec.verifying : sec.continue}
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setPassword(""); }}
              className="it-btn-3d py-1 px-3"
            >
              {sec.cancel}
            </button>
          </div>
        </form>
      )}

      {step === "confirming" && setupData && (
        <form onSubmit={handleConfirm} className="space-y-2 max-w-sm">
          <p className="text-[11px] text-ink-muted font-sans">
            {sec.enrollSecretHelp}
          </p>
          <div className="border border-slate-300 dark:border-slate-700 bg-surface p-2 text-center font-mono text-xs select-all font-bold">
            {setupData.secret}
          </div>
          <input
            type="text"
            placeholder={sec.otpPlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            required
            className="it-field-sunken w-full font-mono text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !code}
              className="it-btn-3d py-1 px-3 font-bold text-emerald-800 dark:text-emerald-300"
            >
              {loading ? sec.verifying : sec.enrollSubmit}
            </button>
            <button
              type="button"
              onClick={() => {
                cancelItMFAAction(password);
                setStep("idle");
                setPassword("");
                setCode("");
              }}
              className="it-btn-3d py-1 px-3"
            >
              {sec.cancel}
            </button>
          </div>
        </form>
      )}

      {step === "disabling" && (
        <form onSubmit={handleDisable} className="space-y-2 max-w-sm">
          <p className="text-[11px] text-ink-muted font-sans">{sec.disablePrompt}</p>
          <input
            type="password"
            placeholder={sec.currentPassword}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="it-field-sunken w-full font-mono text-xs"
          />
          <input
            type="text"
            placeholder={sec.otpPlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="it-field-sunken w-full font-mono text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password || !code}
              className="it-btn-3d py-1 px-3 text-rose-700 dark:text-rose-400 font-bold"
            >
              {loading ? sec.verifying : sec.disableSubmit}
            </button>
            <button
              type="button"
              onClick={() => { setStep("idle"); setPassword(""); setCode(""); }}
              className="it-btn-3d py-1 px-3"
            >
              {sec.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ITRolesSettings() {
  const { copy } = useCopy();
  const ir = copy.itRoles;
  const [roleList, setRoleList] = React.useState<ITRoleDraft[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("");
  const [nameEn, setNameEn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [reportingToRole, setReportingToRole] = React.useState<string>("");
  const [rules, setRules] = React.useState<Record<string, string[]>>({});
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [showNewRoleForm, setShowNewRoleForm] = React.useState(false);
  const [newRoleId, setNewRoleId] = React.useState("");
  const [newNameEn, setNewNameEn] = React.useState("");
  const [newNameAr, setNewNameAr] = React.useState("");
  const [newReportingToRole, setNewReportingToRole] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const grantsToRules = (grants: Record<string, boolean>): Record<string, string[]> => {
    const r: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(grants || {})) {
      if (v) {
        const [res, act] = k.split(":");
        if (res && act) {
          if (!r[res]) r[res] = [];
          r[res].push(act);
        }
      }
    }
    return r;
  };

  const rulesToGrants = (r: Record<string, string[]>): Record<string, boolean> => {
    const g: Record<string, boolean> = {};
    for (const [res, acts] of Object.entries(r)) {
      for (const act of acts) {
        g[`${res}:${act}`] = true;
      }
    }
    return g;
  };

  const loadRoles = async (selectId?: string) => {
    setLoading(true);
    try {
      const res = await getITRolesAction();
      if (res.ok && res.items.length > 0) {
        setRoleList(res.items);
        const toSelect = selectId
          ? res.items.find((r) => r.id === selectId) || res.items[0]
          : res.items.find((r) => r.id === selectedRoleId) || res.items[0];
        if (toSelect) {
          setSelectedRoleId(toSelect.id);
          setNameEn(toSelect.nameEn);
          setNameAr(toSelect.nameAr);
          setReportingToRole(toSelect.reportingToRole || "");
          setRules(grantsToRules(toSelect.grants));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void loadRoles();
  }, []);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const found = roleList.find((r) => r.id === roleId);
    if (found) {
      setNameEn(found.nameEn);
      setNameAr(found.nameAr);
      setReportingToRole(found.reportingToRole || "");
      setRules(grantsToRules(found.grants));
    }
  };

  const handleTogglePermission = (resourceKey: string, perm: string) => {
    setRules((prev) => {
      const current = prev[resourceKey] || [];
      const hasIt = current.includes(perm);
      const updated = hasIt
        ? current.filter((p) => p !== perm)
        : [...current, perm];
      return { ...prev, [resourceKey]: updated };
    });
  };

  const handleSaveRole = async () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      toast.error(ir.nameRequired);
      return;
    }
    const target = roleList.find((r) => r.id === selectedRoleId);
    if (!target) return;
    setLoading(true);
    try {
      const draft: ITRoleDraft = {
        id: selectedRoleId,
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        system: target.system,
        reportingToRole: reportingToRole.trim() ? reportingToRole.trim() : null,
        grants: rulesToGrants(rules),
      };
      const res = await saveITRoleAction(draft, false);
      if (res.ok) {
        toast.success(ir.savedSuccess);
        setShowConfirmModal(false);
        await loadRoles(selectedRoleId);
      } else {
        toast.error(res.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newRoleId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!cleanId || !newNameEn.trim() || !newNameAr.trim()) {
      toast.error(ir.nameRequired);
      return;
    }
    if (roleList.some((r) => r.id === cleanId)) {
      toast.error(ir.roleExists);
      return;
    }
    setLoading(true);
    try {
      const draft: ITRoleDraft = {
        id: cleanId,
        nameEn: newNameEn.trim(),
        nameAr: newNameAr.trim(),
        system: false,
        reportingToRole: newReportingToRole.trim() ? newReportingToRole.trim() : null,
        grants: {
          "tickets:read": true,
          "logs:read": true,
        },
      };
      const res = await saveITRoleAction(draft, true);
      if (res.ok) {
        toast.success(ir.roleCreated);
        setShowNewRoleForm(false);
        setNewRoleId("");
        setNewNameEn("");
        setNewNameAr("");
        setNewReportingToRole("");
        await loadRoles(cleanId);
      } else {
        toast.error(res.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    const target = roleList.find((r) => r.id === selectedRoleId);
    if (!target || target.system) return;
    if (confirm(ir.confirmDeleteBody)) {
      setLoading(true);
      try {
        const res = await deleteITRoleAction(selectedRoleId);
        if (res.ok) {
          toast.success(ir.roleDeleted);
          await loadRoles();
        } else {
          toast.error(res.reason);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const activeRole = roleList.find((r) => r.id === selectedRoleId);
  const permissionsList = ["read", "create", "edit", "delete", "execute"] as const;
  const permLabels: Record<string, string> = {
    read: ir.permRead,
    create: ir.permCreate,
    edit: ir.permEdit,
    delete: ir.permDelete,
    execute: ir.permExecute,
  };

  return (
    <Section
      icon={<Shield className="size-5" aria-hidden />}
      title={ir.tabTitle}
      hint={ir.tabSubtitle}
    >
      <div className="space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3 p-2 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink uppercase">{ir.selectRole}:</span>
            <select
              value={selectedRoleId}
              onChange={(e) => handleSelectRole(e.target.value)}
              className="it-field-sunken font-bold text-xs"
              disabled={loading}
            >
              {roleList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameEn} ({r.nameAr}) {r.system ? `[${ir.isSystemRole}]` : `[${ir.isCustomRole}]`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewRoleForm((prev) => !prev)}
              disabled={loading}
              className="it-btn-3d py-1 px-3 font-bold text-sky-800 dark:text-sky-300"
            >
              + {ir.newRole}
            </button>
            <button
              type="button"
              onClick={() => void loadRoles(selectedRoleId)}
              disabled={loading}
              className="it-btn-3d py-1 px-2.5 text-slate-700 dark:text-slate-300"
              title={ir.refreshRoles}
            >
              <RotateCcw className="h-3 w-3 inline me-1" />
              <span>{ir.refreshRoles}</span>
            </button>
          </div>
        </div>

        {showNewRoleForm && (
          <form onSubmit={(e) => void handleCreateNewRole(e)} className="p-3 border border-sky-400 bg-sky-50 dark:bg-sky-950/40 space-y-3 font-mono text-xs">
            <div className="font-bold text-sky-900 dark:text-sky-200 uppercase">{ir.newRole}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block space-y-1">
                <span className="text-[10px] text-ink-muted uppercase">{ir.roleId} (e.g. tier1_support)</span>
                <input
                  required
                  placeholder="custom_role_code"
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="it-field-sunken w-full font-mono text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-ink-muted uppercase">{ir.nameEn}</span>
                <input
                  required
                  placeholder={ir.placeholderNameEn}
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  className="it-field-sunken w-full text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-ink-muted uppercase">{ir.nameAr}</span>
                <input
                  required
                  dir="rtl"
                  placeholder={ir.placeholderNameAr}
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  className="it-field-sunken w-full text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-ink-muted uppercase">{ir.reportingToRole}</span>
                <select
                  value={newReportingToRole}
                  onChange={(e) => setNewReportingToRole(e.target.value)}
                  className="it-field-sunken w-full text-xs"
                >
                  <option value="">{ir.noReportingToRole}</option>
                  {roleList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nameEn} ({r.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-sky-300 dark:border-sky-800">
              <button type="submit" disabled={loading} className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300">
                {ir.createRoleBtn}
              </button>
              <button type="button" onClick={() => setShowNewRoleForm(false)} className="it-btn-3d py-1 px-3">
                {copy.shared.ui.cancel}
              </button>
            </div>
          </form>
        )}

        <div className="p-3 border border-slate-300 dark:border-slate-700 bg-surface font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <span className="font-bold text-ink uppercase text-[11px]">{ir.editRoleMetadata}:</span>
              <code className="ms-2 font-bold text-sky-700 dark:text-sky-300">[{selectedRoleId}]</code>
            </div>
            {!activeRole?.system && (
              <button
                type="button"
                onClick={() => void handleDeleteRole()}
                disabled={loading}
                className="it-btn-3d py-0.5 px-2 text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>{ir.deleteRole}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase">{ir.nameEn}</span>
              <input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="it-field-sunken w-full text-xs font-bold"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase">{ir.nameAr}</span>
              <input
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="it-field-sunken w-full text-xs font-bold"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold text-ink-muted uppercase">{ir.reportingToRole}</span>
              <select
                value={reportingToRole}
                onChange={(e) => setReportingToRole(e.target.value)}
                className="it-field-sunken w-full text-xs font-bold"
              >
                <option value="">{ir.noReportingToRole}</option>
                {roleList
                  .filter((r) => r.id !== selectedRoleId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nameEn} ({r.id})
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-ink">
              {ir.tabTitle}
            </h3>
            <span className="text-[10px] font-mono text-ink-muted">{ir.tabSubtitle}</span>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="it-table w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-start">{ir.resource}</th>
                  <th className="text-start">{ir.categoryCol}</th>
                  {permissionsList.map((p) => (
                    <th key={p} className="text-center uppercase font-mono">
                      {permLabels[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IT_TAB_RESOURCES.map((res) => {
                  const currentGrants = rules[res.key] || [];
                  return (
                    <tr key={res.key}>
                      <td className="font-bold text-ink font-mono text-xs">
                        {res.label}
                      </td>
                      <td className="text-ink-muted text-[10px] font-mono uppercase">
                        [{res.group}]
                      </td>
                      {permissionsList.map((p) => {
                        const hasGrant = currentGrants.includes(p);
                        return (
                          <td key={p} className="text-center p-1">
                            <input
                              type="checkbox"
                              checked={hasGrant}
                              onChange={() => handleTogglePermission(res.key, p)}
                              className="size-4 cursor-pointer"
                              title={`${res.label} - ${permLabels[p]}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="it-btn-3d py-1.5 px-4 font-bold text-emerald-800 dark:text-emerald-300 font-mono flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{ir.saveRole}</span>
          </button>
        </div>

        {showConfirmModal && (
          <CriticalActionModal
            open={showConfirmModal}
            title={ir.confirmModal}
            description={ir.confirmModalBody}
            impactDetails={[
              `Role: ${nameEn} (${selectedRoleId})`,
              "Modifies permissions across all 18 portal modules and tabs.",
              "IT team members with this role will immediately reflect new access bounds upon page navigation.",
            ]}
            requiredConfirmationText="CONFIRM"
            confirmLabel={ir.saveRole}
            dangerLevel="warning"
            onConfirm={handleSaveRole}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}
      </div>
    </Section>
  );
}

function same(a: NotificationPreferences | null, b: NotificationPreferences | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SettingsView({
  email,
  roles,
  dbRoles,
}: {
  email: string;
  roles: string[];
  dbRoles?: Array<{ id: string; nameEn?: string; nameAr?: string }>;
}) {
  const { copy, locale, role } = useCopy();
  const s = copy.settings;
  const sn = s.notifications;
  const sa = s.appearance;
  const { preferences, setPreferences, mutes, status, reload } = useItLive();

  const [activeTab, setActiveTab] = React.useState<"notifications" | "appearance" | "account" | "roles">("notifications");
  const [draft, setDraft] = React.useState<NotificationPreferences | null>(preferences);
  const [saving, setSaving] = React.useState(false);
  const [permission, setPermission] = React.useState<DesktopPermission>("default");
  const [themeMode, setThemeMode] = React.useState<"light" | "dark" | "system">("system");
  const [muteDuration, setMuteDuration] = React.useState<"1h" | "8h" | "tomorrow" | "forever">("1h");
  const [selectedPresence, setSelectedPresence] = React.useState<PresenceStatus>("available");

  React.useEffect(() => {
    setPermission(desktopPermission());
    const saved = localStorage.getItem("platform_it_theme");
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeMode(saved);
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "roles" || tabParam === "appearance" || tabParam === "account" || tabParam === "notifications") {
        setActiveTab(tabParam as "notifications" | "appearance" | "account" | "roles");
      }
    }
  }, []);

  const lastSaved = React.useRef(preferences);
  React.useEffect(() => {
    setDraft((current) => (current === null || same(current, lastSaved.current) ? preferences : current));
    lastSaved.current = preferences;
  }, [preferences]);

  const applyTheme = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("platform_it_theme", mode);
    const isDark =
      mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  };

  if (!draft) {
    return (
      <div className="py-12 text-center text-xs font-mono text-ink-muted">
        <p>{copy.live.reconnecting}</p>
      </div>
    );
  }

  const dirty = !same(draft, preferences);
  const set = (change: Partial<NotificationPreferences>) => setDraft({ ...draft, ...change });
  const setCategory = (catKey: string, change: { muted?: boolean; sound?: boolean }) => {
    const existing = draft.categories.find((c) => c.category === catKey);
    const updatedCategories = existing
      ? draft.categories.map((c) => (c.category === catKey ? { ...c, ...change } : c))
      : [...draft.categories, { category: catKey, muted: change.muted ?? false, sound: change.sound ?? true }];
    set({ categories: updatedCategories });
  };

  const mutedUntil = draft.mutedUntil && new Date(draft.mutedUntil).getTime() > Date.now() ? draft.mutedUntil : null;
  const isForever = mutedUntil?.startsWith("9999");

  const save = async () => {
    setSaving(true);
    try {
      const saved = await savePreferencesAction({
        mutedUntil: draft.mutedUntil,
        soundEnabled: draft.soundEnabled,
        sound: draft.sound,
        volume: draft.volume,
        popupsEnabled: draft.popupsEnabled,
        desktopEnabled: draft.desktopEnabled,
        categories: draft.categories.map(({ category, muted, sound }) => ({ category, muted, sound })),
      });
      setPreferences(saved);
      setDraft(saved);
      toast.success(s.saved);
    } catch {
      toast.error(s.failed);
    } finally {
      setSaving(false);
    }
  };

  const enableDesktop = async () => {
    unlockNotificationSound();
    const result = await requestDesktopPermission();
    setPermission(result);
    if (result === "granted") set({ desktopEnabled: true });
  };

  const handleTestSound = () => {
    unlockNotificationSound();
    void playNotificationSound(draft.sound ?? "chime", draft.volume ?? 70);
  };

  const handleSetStatus = async (choice: StatusChoice) => {
    try {
      await setStatusAction(choice);
      toast.success(copy.live.status);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  const handleClearStatus = async () => {
    try {
      await clearStatusAction();
      toast.success(copy.live.status);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  const handleUnmuteRecord = async (entityType: string, entityId: string) => {
    try {
      await unmuteRecordAction(entityType, entityId);
      toast.success(copy.live.recordMuted);
      await reload();
    } catch {
      toast.error(copy.live.failed);
    }
  };

  const presenceStatusLabels: Record<string, string> = {
    available: sa.presenceStatuses.available,
    busy: sa.presenceStatuses.busy,
    do_not_disturb: sa.presenceStatuses.do_not_disturb,
    in_a_meeting: sa.presenceStatuses.in_a_meeting,
    away: sa.presenceStatuses.away,
  };

  return (
    <div className="space-y-4">
      <PageTitle title={s.title} description={s.description} />

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: "notifications", label: s.tabs.notifications },
          { id: "appearance", label: s.tabs.appearance },
          { id: "account", label: s.tabs.account },
          { id: "roles", label: s.tabs.roles },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-[#0070d2] text-[#0070d2] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "notifications" && (
        <div className="space-y-4">

          <Section icon={<BellOff className="size-4" aria-hidden />} title={sn.pauseTitle} hint={sn.pauseHint}>
            {mutedUntil ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 border border-amber-400 bg-amber-50 dark:bg-amber-950/40">
                <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-mono">
                  <BellOff className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    {isForever
                      ? sn.pauseForever
                      : formatMessage(sn.pauseActive, {
                          time: new Date(mutedUntil).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }),
                        })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => set({ mutedUntil: null })}
                  className="it-btn-3d py-1 px-3 text-xs font-bold font-mono"
                >
                  {sn.unmute}
                </button>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                <p className="text-[10px] uppercase font-bold text-ink-muted">{sn.muteFor}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(e.target.value as any)}
                    className="it-field-sunken text-xs font-mono"
                  >
                    <option value="1h">{formatMessage(sn.muteOptions["1h"], { hours: 1 })}</option>
                    <option value="8h">{formatMessage(sn.muteOptions["8h"], { hours: 8 })}</option>
                    <option value="tomorrow">{sn.muteOptions.tomorrow}</option>
                    <option value="forever">{sn.muteOptions.forever}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => set({ mutedUntil: muteUntil(muteDuration) })}
                    className="it-btn-3d py-1 px-3 text-xs font-bold text-amber-800 dark:text-amber-300 font-mono"
                  >
                    [APPLY MUTE]
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section icon={<Volume2 className="size-4" aria-hidden />} title={sn.soundTitle} hint={sn.soundHint}>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-ink">{sn.soundEnabled}</span>
                <Toggle
                  checked={draft.soundEnabled ?? true}
                  onChange={(v) => set({ soundEnabled: v })}
                  label={sn.soundEnabled}
                />
              </div>

              {(draft.soundEnabled ?? true) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-300 dark:border-slate-700">
                  <div>
                    <label htmlFor="sound-select" className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
                      {sn.soundChoice}
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        id="sound-select"
                        value={draft.sound ?? "chime"}
                        onChange={(e) => set({ sound: e.target.value as NotificationPreferences["sound"] })}
                        className="it-field-sunken flex-1 text-xs font-mono"
                      >
                        {NOTIFICATION_SOUNDS.map((soundKey) => (
                          <option key={soundKey} value={soundKey}>
                            {sn.sounds[soundKey as keyof typeof sn.sounds] ?? soundKey}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleTestSound}
                        className="it-btn-3d py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                        title={sn.testSound}
                      >
                        <Play className="size-3 text-sky-600" aria-hidden />
                        <span>TEST</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="volume-range" className="block text-[10px] uppercase font-bold text-ink-muted mb-1">
                      {formatMessage(sn.volume, { volume: String(draft.volume ?? 70) })}
                    </label>
                    <input
                      id="volume-range"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={draft.volume ?? 70}
                      onChange={(e) => set({ volume: Number(e.target.value) })}
                      className="w-full accent-sky-700 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section icon={<Monitor className="size-4" aria-hidden />} title={sn.alertsTitle} hint={sn.alertsHint}>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-ink">{sn.popupsEnabled}</span>
                <Toggle
                  checked={draft.popupsEnabled ?? true}
                  onChange={(v) => set({ popupsEnabled: v })}
                  label={sn.popupsEnabled}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 dark:border-slate-700 pt-2">
                <div>
                  <p className="font-bold text-ink">{sn.desktopEnabled}</p>
                  <p className="text-[10px] text-ink-muted font-sans">
                    {permission === "denied"
                      ? sn.desktopDenied
                      : permission === "granted"
                      ? sn.desktopGranted
                      : sn.alertsHint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {permission !== "granted" && permission !== "denied" && (
                    <button
                      type="button"
                      onClick={enableDesktop}
                      className="it-btn-3d py-1 px-3 text-xs font-bold text-sky-800 dark:text-sky-300"
                    >
                      {sn.desktopEnableBtn}
                    </button>
                  )}
                  <Toggle
                    checked={draft.desktopEnabled && permission === "granted"}
                    disabled={permission !== "granted"}
                    onChange={(v) => set({ desktopEnabled: v })}
                    label={sn.desktopEnabled}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section icon={<Shield className="size-4" aria-hidden />} title={sn.categoriesTitle} hint={sn.categoriesHint}>
            <ul className="divide-y divide-slate-300 dark:divide-slate-700 font-mono text-xs">
              {IT_CATEGORIES.map((catKey) => {
                const catDef = notificationCategory(catKey);
                const setting = draft.categories.find((c) => c.category === catKey);
                const isMandatory = catDef?.mandatory ?? false;
                const isMuted = !isMandatory && setting?.muted === true;
                const isSoundOn = setting?.sound !== false;
                const catName = locale === "ar" ? catDef?.nameAr ?? catKey : catDef?.nameEn ?? catKey;
                const catDesc = locale === "ar" ? catDef?.descriptionAr ?? "" : catDef?.descriptionEn ?? "";

                return (
                  <li key={catKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink uppercase">{catName}</span>
                        {isMandatory && (
                          <span className="border border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-1 py-0.2 text-[9px] font-bold">
                            MANDATORY
                          </span>
                        )}
                      </div>
                      {catDesc && <p className="text-[10px] text-ink-muted font-sans">{catDesc}</p>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {!isMandatory && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-ink-muted">{isMuted ? sn.muted : sn.active}</span>
                          <Toggle
                            checked={!isMuted}
                            onChange={(on) => setCategory(catKey, { muted: !on })}
                            label={catName}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setCategory(catKey, { sound: !isSoundOn })}
                        title={isSoundOn ? sn.soundOn : sn.soundOff}
                        aria-label={isSoundOn ? sn.soundOn : sn.soundOff}
                        className={`it-btn-3d py-0.5 px-1.5 ${
                          isSoundOn ? "text-sky-800 dark:text-sky-300" : "text-ink-muted"
                        }`}
                      >
                        {isSoundOn ? <Volume2 className="size-3.5" aria-hidden /> : <VolumeX className="size-3.5" aria-hidden />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section icon={<BellOff className="size-4" aria-hidden />} title={sn.mutedItemsTitle} hint={sn.mutedItemsHint}>
            {!mutes.length ? (
              <p className="text-xs text-ink-muted font-mono">{sn.noMutedItems}</p>
            ) : (
              <ul className="divide-y divide-slate-300 dark:divide-slate-700 font-mono text-xs">
                {mutes.map((mute) => (
                  <li key={`${mute.entityType}:${mute.entityId}`} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-bold text-ink">
                        {mute.entityType.toUpperCase()} #{mute.entityId}
                      </p>
                      {mute.until && (
                        <p className="text-[10px] text-ink-muted">
                          {formatMessage(sn.pauseActive, {
                            time: new Date(mute.until).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB"),
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnmuteRecord(mute.entityType, mute.entityId)}
                      className="it-btn-3d py-0.5 px-2 text-[10px]"
                    >
                      {sn.unmuteItem}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="it-card flex justify-end gap-2 p-2 mt-4 font-mono text-xs">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="it-btn-3d py-1.5 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Save className="size-3.5" aria-hidden />
              <span>{saving ? s.saving : s.save}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === "appearance" && (
        <div className="space-y-4 font-mono text-xs">

          <Section icon={<Sun className="size-4" aria-hidden />} title={sa.themeTitle} hint={sa.themeHint}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink uppercase">THEME MODE:</span>
              <select
                value={themeMode}
                onChange={(e) => applyTheme(e.target.value as any)}
                className="it-field-sunken font-bold text-xs"
              >
                <option value="light">LIGHT (CLASSIC 3D FACE)</option>
                <option value="dark">DARK (SAP FIORI DARK)</option>
                <option value="system">{sa.system.toUpperCase()}</option>
              </select>
            </div>
          </Section>

          <Section icon={<Languages className="size-4" aria-hidden />} title={sa.languageTitle} hint={sa.languageHint}>
            <div className="flex items-center gap-2">
              <form action={setLocaleAction.bind(null, "en")}>
                <button
                  type="submit"
                  className={`it-btn-3d py-1 px-3 text-xs font-mono font-bold ${
                    locale === "en" ? "text-sky-800 dark:text-sky-300 border-2" : ""
                  }`}
                >
                  {locale === "en" && <Check className="size-3 inline me-1" aria-hidden />}
                  {sa.languageEnglish} [EN]
                </button>
              </form>
              <form action={setLocaleAction.bind(null, "ar")}>
                <button
                  type="submit"
                  className={`it-btn-3d py-1 px-3 text-xs font-mono font-bold ${
                    locale === "ar" ? "text-sky-800 dark:text-sky-300 border-2" : ""
                  }`}
                >
                  {locale === "ar" && <Check className="size-3 inline me-1" aria-hidden />}
                  {sa.languageArabic} [AR]
                </button>
              </form>
            </div>
          </Section>

          <Section icon={<User className="size-4" aria-hidden />} title={sa.statusTitle} hint={sa.statusHint}>
            <div className="space-y-2">
              {status && (
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>{copy.live.status}:</span>
                  <span className="font-bold text-ink uppercase">
                    [{presenceStatusLabels[status.presence.status] ?? status.presence.status}]
                  </span>
                  {status.presence.message && <span>— {status.presence.message}</span>}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedPresence}
                  onChange={(e) => setSelectedPresence(e.target.value as PresenceStatus)}
                  className="it-field-sunken text-xs font-mono font-bold"
                >
                  <option value="available">🟢 {presenceStatusLabels.available}</option>
                  <option value="busy">🔴 {presenceStatusLabels.busy}</option>
                  <option value="do_not_disturb">⛔ {presenceStatusLabels.do_not_disturb}</option>
                  <option value="in_a_meeting">📅 {presenceStatusLabels.in_a_meeting}</option>
                  <option value="away">🟡 {presenceStatusLabels.away}</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleSetStatus({ status: selectedPresence })}
                  className="it-btn-3d py-1 px-3 font-bold text-emerald-800 dark:text-emerald-300 font-mono"
                >
                  [APPLY STATUS]
                </button>
                <button
                  type="button"
                  onClick={handleClearStatus}
                  className="it-btn-3d py-1 px-2 font-mono flex items-center gap-1"
                >
                  <RotateCcw className="size-3" aria-hidden />
                  <span>{copy.live.reset}</span>
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {activeTab === "account" && (
        <div className="space-y-4 font-mono text-xs">
          <Section icon={<User className="size-4" aria-hidden />} title={s.account.title}>
            <div className="space-y-3">
              <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                <p className="text-[10px] uppercase font-bold text-ink-muted">{s.account.email}</p>
                <p className="text-xs font-bold text-ink mt-0.5" dir="ltr">
                  {email}
                </p>
              </div>

              <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
                <p className="text-[10px] uppercase font-bold text-ink-muted">{s.account.roles}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="border border-slate-300 dark:border-slate-700 bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    >
                      {role(r, dbRoles)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-b border-slate-300 dark:border-slate-700 pb-3 pt-1">
                <TwoFactorSettings />
              </div>

              <div className="pt-1">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="it-btn-3d py-1 px-4 text-xs font-bold text-rose-700 dark:text-rose-400"
                  >
                    {s.account.signOut}
                  </button>
                </form>
              </div>
            </div>
          </Section>
        </div>
      )}

      {activeTab === "roles" && <ITRolesSettings />}
    </div>
  );
}
