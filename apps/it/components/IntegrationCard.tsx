"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  Mail,
  Package,
  RefreshCw,
  Send,
  Unlink,
  Link2,
  FileCode,
} from "lucide-react";
import { IntegrationDocsModal } from "./IntegrationDocsModal";
import {
  ConfirmDialog,
  DateDisplay,
} from "@platform/ui";
import {
  INTEGRATION_ENVIRONMENTS,
  PAYTABS_REGIONS,
  type IntegrationProvider,
} from "@platform/config/constants/integrations";
import { findSocialPlatform } from "@platform/config/constants/social";
import type { DeskIntegration } from "@platform/api-client";
import {
  saveIntegrationAction,
  unlinkIntegrationAction,
  testIntegrationAction,
  syncIntegrationAction,
  sendWhatsAppTestAction,
} from "../app/actions";
import { useCopy } from "./CopyProvider";

const statusTone: Record<string, string> = {
  configured: "border-sky-400 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  healthy: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  error: "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  unknown: "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  off: "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function SocialBrandIcon({
  name,
  hint,
  className = "w-4 h-4",
}: {
  name?: string;
  hint?: string;
  className?: string;
}) {
  const platform = findSocialPlatform(name) ?? findSocialPlatform(hint);
  if (!platform) return <Link2 className={className} aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={platform.path} />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: IntegrationProvider }) {
  if (provider.id === "resend") return <Mail className="w-4 h-4" />;
  if (provider.kind === "payments") return <CreditCard className="w-4 h-4" />;
  if (provider.kind === "couriers") return <Package className="w-4 h-4" />;
  if (provider.id === "meta")
    return (
      <span className="flex -space-x-1 rtl:space-x-reverse">
        <SocialBrandIcon name="facebook" className="w-4 h-4" />
        <SocialBrandIcon name="instagram" className="w-4 h-4" />
      </span>
    );
  return <SocialBrandIcon name={provider.id} className="w-4 h-4" />;
}

export function IntegrationCard({
  provider,
  view,
  canEdit,
  canExecute,
  canDelete,
}: {
  provider: IntegrationProvider;
  view: DeskIntegration;
  canEdit: boolean;
  canExecute: boolean;
  canDelete: boolean;
}) {
  const { copy } = useCopy();
  const c = copy.integrations;
  const provCopy = c.providers[provider.id as keyof typeof c.providers];
  const router = useRouter();

  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState<
    null | "save" | "test" | "sync" | "send" | "unlink"
  >(null);
  const [isActive, setIsActive] = React.useState(view.isActive);
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      provider.fields.map((field) => [
        field.key,
        field.secret ? "" : (view.values[field.key] ?? ""),
      ]),
    ),
  );
  const [confirmUnlink, setConfirmUnlink] = React.useState(false);
  const [docsOpen, setDocsOpen] = React.useState(false);
  const [waTo, setWaTo] = React.useState("");
  const [error, setError] = React.useState("");

  const status = !view.isActive
    ? "off"
    : view.healthStatus === "healthy"
      ? "healthy"
      : view.healthStatus === "error"
        ? "error"
        : view.accountName
          ? "configured"
          : "unknown";

  const configured = Boolean(view.accountName || view.isActive);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy("save");
    setError("");

    try {
      const payload: Record<string, string> = { ...values };
      const secrets: Record<string, string> = {};
      for (const field of provider.fields) {
        if (field.secret) {
          const val = payload[field.key];
          if (val) secrets[field.key] = val;
          delete payload[field.key];
        }
      }

      const res = await saveIntegrationAction(
        provider.id,
        isActive,
        payload,
        secrets,
      );

      if (res.ok) {
        toast.success(c.saved);
        setEditing(false);
        router.refresh();
      } else {
        const msg = c.failed;
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : c.failed;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleUnlink = async () => {
    if (!canDelete) return;
    setBusy("unlink");
    try {
      const res = await unlinkIntegrationAction(provider.id);
      if (res.ok) {
        toast.success(c.unlinked);
        setConfirmUnlink(false);
        router.refresh();
      } else {
        toast.error(c.failed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    if (!canExecute) return;
    setBusy("test");
    setError("");
    try {
      const result = await testIntegrationAction(provider.id);
      if (result.ok) {
        toast.success(c.testOk);
      } else {
        const msg = result.error ?? c.testFailed;
        setError(msg);
        toast.error(msg);
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : c.testFailed;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    if (!canExecute) return;
    setBusy("sync");
    setError("");
    try {
      const result = await syncIntegrationAction(provider.id);
      if (result.ok) {
        toast.success(c.syncOk.replace("{posts}", String(result.posts ?? 0)));
      } else {
        const msg = result.error ? `${c.syncFailed}: ${result.error}` : c.syncFailed;
        setError(msg);
        toast.error(msg);
      }
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : c.syncFailed;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!canExecute || !waTo.trim()) return;
    setBusy("send");
    try {
      const result = await sendWhatsAppTestAction(waTo);
      if (result.ok) {
        toast.success(c.sent);
      } else {
        toast.error(result.error ?? c.failed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      data-testid={`integration-${provider.id}`}
      className="it-card flex flex-col p-0 overflow-hidden space-y-0"
    >
      <div className="flex items-start gap-3 p-3 bg-surface">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-ink">
          <ProviderIcon provider={provider} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold font-mono text-ink uppercase">
              {provCopy?.name ?? provider.id}
            </h3>
            <span
              className={`border px-1.5 py-0.2 text-[10px] font-bold font-mono uppercase ${statusTone[status] ?? statusTone.unknown}`}
            >
              [{c.status[status as keyof typeof c.status] ?? status}]
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            {provCopy?.description ?? ""}
          </p>
          {(view.accountName || view.lastCheckedAt) && (
            <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono text-ink-muted">
              {view.accountName && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.account}:</dt>
                  <dd className="truncate font-bold text-ink">
                    <bdi>{view.accountName}</bdi>
                  </dd>
                </div>
              )}
              {view.lastCheckedAt && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.lastChecked}:</dt>
                  <dd className="text-ink">
                    <DateDisplay date={view.lastCheckedAt} />
                  </dd>
                </div>
              )}
              {view.lastSyncedAt && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.lastSynced}:</dt>
                  <dd className="text-ink">
                    <DateDisplay date={view.lastSyncedAt} />
                  </dd>
                </div>
              )}
            </dl>
          )}
          {view.lastError && (
            <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-mono font-bold break-all">
              ERR: {view.lastError}
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="border-t border-slate-300 dark:border-slate-700 p-3 space-y-3 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase text-ink">
              {c.enabled}
            </label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4"
            />
          </div>

          <div className="space-y-2.5">
            {provider.fields.map((field) => {
              const fieldLabel =
                c.fields[field.key as keyof typeof c.fields] ?? field.key;
              const secretInfo = view.secrets[field.key];
              const isSecret = field.secret;

              if (field.key === "environment") {
                return (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold text-ink-muted mb-0.5 uppercase">
                      {fieldLabel}
                    </label>
                    <select
                      value={values.environment ?? "test"}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          environment: e.target.value,
                        }))
                      }
                      className="it-field-sunken w-full text-xs font-mono"
                    >
                      {INTEGRATION_ENVIRONMENTS.map((env) => (
                        <option key={env} value={env}>
                          {env}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.key === "region" && provider.id === "paytabs") {
                return (
                  <div key={field.key}>
                    <label className="block text-[10px] font-bold text-ink-muted mb-0.5 uppercase">
                      {fieldLabel}
                    </label>
                    <select
                      value={values.region ?? "GLOBAL"}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          region: e.target.value,
                        }))
                      }
                      className="it-field-sunken w-full text-xs font-mono"
                    >
                      {Object.keys(PAYTABS_REGIONS).map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[10px] font-bold text-ink-muted uppercase">
                      {fieldLabel}
                      {field.required && <span className="text-rose-500 ms-0.5">*</span>}
                    </label>
                    {isSecret && secretInfo?.set && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {c.secretSet.replace("{hint}", secretInfo.hint)}
                      </span>
                    )}
                  </div>
                  <input
                    type={isSecret ? "password" : "text"}
                    value={values[field.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={
                      isSecret && secretInfo?.set
                        ? c.secretKeep
                        : ""
                    }
                    className="it-field-sunken w-full text-xs font-mono"
                  />
                </div>
              );
            })}
          </div>

          {error && <p className="text-[11px] text-rose-500 font-bold">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              disabled={busy !== null}
              className="it-btn-3d py-1 px-3 text-xs"
            >
              {c.cancel}
            </button>
            <button
              type="submit"
              disabled={busy !== null}
              className="it-btn-3d py-1 px-4 text-xs font-bold text-emerald-800 dark:text-emerald-300"
            >
              {busy === "save" ? c.saving : c.save}
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-300 dark:border-slate-700 p-2 bg-surface flex flex-wrap items-center justify-between gap-1.5 mt-auto font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy !== null}
                className="it-btn-3d py-0.5 px-2 text-[11px]"
              >
                {c.configure}
              </button>
            )}

            {configured && canExecute && (
              <button
                type="button"
                onClick={handleTest}
                disabled={busy !== null}
                className="it-btn-3d py-0.5 px-2 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${busy === "test" ? "animate-spin" : ""}`}
                />
                <span>{busy === "test" ? c.testing : c.test}</span>
              </button>
            )}

            {view.isActive && provider.kind === "social" && canExecute && (
              <button
                type="button"
                onClick={handleSync}
                disabled={busy !== null}
                className="it-btn-3d py-0.5 px-2 text-[11px] flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3 h-3 ${busy === "sync" ? "animate-spin" : ""}`}
                />
                <span>{busy === "sync" ? c.syncing : c.sync}</span>
              </button>
            )}

            {view.isActive && provider.id === "whatsapp" && canExecute && (
              <div className="flex items-center gap-1">
                <input
                  type="tel"
                  value={waTo}
                  onChange={(e) => setWaTo(e.target.value)}
                  placeholder={c.whatsappTo}
                  className="it-field-sunken w-28 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={busy !== null || !waTo.trim()}
                  className="it-btn-3d py-0.5 px-2 text-[11px] flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{busy === "send" ? c.testing : c.send}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              className="it-btn-3d py-0.5 px-2 text-[11px] flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold"
              title="View Ingress Webhook URL, Verification Signatures & JSON Payload Schema"
            >
              <FileCode className="w-3 h-3 text-amber-600" />
              <span>{c.specs}</span>
            </button>
          </div>

          {configured && canDelete && (
            <button
              type="button"
              onClick={() => setConfirmUnlink(true)}
              disabled={busy !== null}
              className="it-btn-3d py-0.5 px-2 text-[11px] text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              <span>{c.unlink}</span>
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        title={c.unlinkTitle}
        description={c.unlinkBody}
        onConfirm={handleUnlink}
        variant="danger"
      />

      <IntegrationDocsModal
        provider={provider}
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
      />
    </div>
  );
}
