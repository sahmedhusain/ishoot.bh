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
} from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  DateDisplay,
  Input,
  Select,
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
  configured: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  healthy:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  unknown:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  off: "bg-surface-sunken/10 text-ink-muted dark:text-ink border-outline-variant",
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
  if (provider.id === "resend") return <Mail className="w-5 h-5" />;
  if (provider.kind === "payments") return <CreditCard className="w-5 h-5" />;
  if (provider.kind === "couriers") return <Package className="w-5 h-5" />;
  if (provider.id === "meta")
    return (
      <span className="flex -space-x-1 rtl:space-x-reverse">
        <SocialBrandIcon name="facebook" className="w-5 h-5" />
        <SocialBrandIcon name="instagram" className="w-5 h-5" />
      </span>
    );
  return <SocialBrandIcon name={provider.id} className="w-5 h-5" />;
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
  const [error, setError] = React.useState("");
  const [waTo, setWaTo] = React.useState("");

  const configured = provider.fields.some((field) =>
    field.secret ? view.secrets[field.key]?.set : view.values[field.key],
  );
  const status = !view.isActive ? "off" : view.healthStatus;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy("save");
    setError("");
    try {
      const { ok } = await saveIntegrationAction(
        provider.id,
        isActive,
        values,
        view.config,
      );
      if (ok) {
        toast.success(c.saved);
        setEditing(false);
        router.refresh();
      } else {
        setError(c.failed);
        toast.error(c.failed);
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
    setError("");
    try {
      const { ok } = await unlinkIntegrationAction(provider.id);
      if (ok) {
        toast.success(c.unlinked);
        setConfirmUnlink(false);
        setEditing(false);
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
        toast.success(
          result.accountName
            ? `${c.testOk} · ${result.accountName}`
            : c.testOk,
        );
      } else {
        const msg = result.error ? `${c.testFailed}: ${result.error}` : c.testFailed;
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
    <Card
      data-testid={`integration-${provider.id}`}
      className="flex flex-col p-0 overflow-hidden bg-surface dark:bg-surface-raised border border-outline-variant rounded-2xl"
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-white/10 dark:text-ink">
          <ProviderIcon provider={provider} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">
              {provCopy?.name ?? provider.id}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone[status] ?? statusTone.unknown}`}
            >
              {c.status[status as keyof typeof c.status] ?? status}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {provCopy?.description ?? ""}
          </p>
          {(view.accountName || view.lastCheckedAt) && (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
              {view.accountName && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.account}:</dt>
                  <dd className="truncate font-medium text-ink">
                    <bdi>{view.accountName}</bdi>
                  </dd>
                </div>
              )}
              {view.lastCheckedAt && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.lastChecked}:</dt>
                  <dd className="font-medium text-ink">
                    <DateDisplay date={view.lastCheckedAt} />
                  </dd>
                </div>
              )}
              {view.lastSyncedAt && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.lastSynced}:</dt>
                  <dd className="font-medium text-ink">
                    <DateDisplay date={view.lastSyncedAt} />
                  </dd>
                </div>
              )}
            </dl>
          )}
          {view.lastError && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-mono break-all">
              {view.lastError}
            </p>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="border-t border-outline-variant p-4 sm:p-5 space-y-4 bg-surface-container-low/50">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-ink uppercase tracking-wide">
              {c.enabled}
            </label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-outline-variant text-accent focus:ring-accent"
            />
          </div>

          <div className="space-y-3">
            {provider.fields.map((field) => {
              const fieldLabel =
                c.fields[field.key as keyof typeof c.fields] ?? field.key;
              const secretInfo = view.secrets[field.key];
              const isSecret = field.secret;

              if (field.key === "environment") {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      {fieldLabel}
                    </label>
                    <Select
                      value={values.environment ?? "test"}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          environment: e.target.value,
                        }))
                      }
                    >
                      {INTEGRATION_ENVIRONMENTS.map((env) => (
                        <option key={env} value={env}>
                          {env}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              }

              if (field.key === "region" && provider.id === "paytabs") {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-ink-muted mb-1">
                      {fieldLabel}
                    </label>
                    <Select
                      value={values.region ?? "GLOBAL"}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          region: e.target.value,
                        }))
                      }
                    >
                      {Object.keys(PAYTABS_REGIONS).map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-ink-muted">
                      {fieldLabel}
                      {field.required && <span className="text-rose-500 ms-0.5">*</span>}
                    </label>
                    {isSecret && secretInfo?.set && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {c.secretSet.replace("{hint}", secretInfo.hint)}
                      </span>
                    )}
                  </div>
                  <Input
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
                    className="w-full text-xs"
                  />
                </div>
              );
            })}
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              disabled={busy !== null}
            >
              {c.cancel}
            </Button>
            <Button type="submit" size="sm" disabled={busy !== null}>
              {busy === "save" ? c.saving : c.save}
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-outline-variant p-3 sm:px-5 bg-surface-container-low/30 flex flex-wrap items-center justify-between gap-2 mt-auto">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={busy !== null}
              >
                {c.configure}
              </Button>
            )}

            {configured && canExecute && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={busy !== null}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 me-1.5 ${busy === "test" ? "animate-spin" : ""}`}
                />
                {busy === "test" ? c.testing : c.test}
              </Button>
            )}

            {view.isActive && provider.kind === "social" && canExecute && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={busy !== null}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 me-1.5 ${busy === "sync" ? "animate-spin" : ""}`}
                />
                {busy === "sync" ? c.syncing : c.sync}
              </Button>
            )}

            {view.isActive && provider.id === "whatsapp" && canExecute && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="tel"
                  value={waTo}
                  onChange={(e) => setWaTo(e.target.value)}
                  placeholder={c.whatsappTo}
                  className="w-36 text-xs h-8"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendWhatsApp}
                  disabled={busy !== null || !waTo.trim()}
                >
                  <Send className="w-3.5 h-3.5 me-1" />
                  {busy === "send" ? c.testing : c.send}
                </Button>
              </div>
            )}
          </div>

          {configured && canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmUnlink(true)}
              disabled={busy !== null}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:text-rose-400"
            >
              <Unlink className="w-3.5 h-3.5 me-1" />
              {c.unlink}
            </Button>
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
    </Card>
  );
}
