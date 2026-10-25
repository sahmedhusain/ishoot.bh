"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Mail,
  PlugZap,
  RefreshCw,
  Send,
  Unlink,
} from "lucide-react";
import { Button, Card, ConfirmDestructiveModal, DateDisplay } from "@platform/ui";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationKind,
  type IntegrationProvider,
} from "@platform/database/constants/integrations";
import type { IntegrationAdminView } from "@platform/database/queries/integrations";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  saveIntegration,
  sendWhatsAppTestAction,
  syncIntegrationAction,
  testIntegrationAction,
  unlinkIntegration,
} from "../../app/actions/integrations";
import { SocialBrandIcon } from "../shared/PlatformPicker";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { CalendarSyncCard } from "./CalendarSyncCard";
import type { CalendarLayer } from "@platform/database/types";

const KINDS: IntegrationKind[] = ["social", "messaging", "email", "sign_in"];

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/15 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40";

const statusTone: Record<string, string> = {
  healthy:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  unknown:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  off: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-ink/15",
};

function ProviderIcon({ provider }: { provider: IntegrationProvider }) {
  if (provider.id === "resend") return <Mail className="w-5 h-5" />;
  if (provider.id === "meta")
    return (
      <span className="flex -space-x-1 rtl:space-x-reverse">
        <SocialBrandIcon name="facebook" className="w-5 h-5" />
        <SocialBrandIcon name="instagram" className="w-5 h-5" />
      </span>
    );
  return <SocialBrandIcon name={provider.id} className="w-5 h-5" />;
}

function IntegrationCard({
  provider,
  view,
}: {
  provider: IntegrationProvider;
  view: IntegrationAdminView;
}) {
  const { t, locale } = useAdminLocale();
  const c = t.integrations;
  const copy = c.providers[provider.id];
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState<
    null | "save" | "test" | "sync" | "send"
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
  const [waTo, setWaTo] = React.useState("");
  const configured = provider.fields.some((field) =>
    field.secret ? view.secrets[field.key]?.set : view.values[field.key],
  );
  const status = !view.isActive ? "off" : view.healthStatus;

  const run = async <T,>(
    kind: NonNullable<typeof busy>,
    fn: () => Promise<T>,
  ) => {
    setBusy(kind);
    try {
      return await fn();
    } catch (error) {
      toast.error(errorMessage(error, t, c.testFailed));
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    run("save", async () => {
      await saveIntegration(provider.id, isActive, values);
      toast.success(c.saved);
      setEditing(false);
      setValues((v) =>
        Object.fromEntries(
          Object.entries(v).map(([key, value]) => [
            key,
            provider.fields.find((f) => f.key === key)?.secret ? "" : value,
          ]),
        ),
      );
    });

  const test = () =>
    run("test", async () => {
      const result = await testIntegrationAction(provider.id);
      if (result.ok)
        toast.success(
          result.accountName ? `${c.testOk} · ${result.accountName}` : c.testOk,
        );
      else {
        const detail = errorMessage(result.error, t, "");
        toast.error(detail ? `${c.testFailed}: ${detail}` : c.testFailed);
      }
    });

  const sync = () =>
    run("sync", async () => {
      const result = await syncIntegrationAction(provider.id);
      if (result.ok)
        toast.success(formatMessage(c.syncOk, { posts: String(result.posts) }));
      else {
        const detail = errorMessage(result.error, t, "");
        toast.error(detail ? `${c.syncFailed}: ${detail}` : c.syncFailed);
      }
    });

  const sendTest = () =>
    run("send", async () => {
      await sendWhatsAppTestAction(waTo, c.whatsappBody);
      toast.success(c.sent);
    });

  return (
    <Card className="flex flex-col p-0 overflow-hidden dark:bg-surface-raised">
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-white/10 dark:text-white">
          <ProviderIcon provider={provider} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {copy.name}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusTone[status] ?? statusTone.unknown}`}
            >
              {c.status[status as keyof typeof c.status] ?? status}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {copy.description}
          </p>
          {(view.accountName || view.lastCheckedAt) && (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              {view.accountName && (
                <div className="flex gap-1 min-w-0">
                  <dt>{c.account}:</dt>
                  <dd className="truncate font-medium text-slate-700 dark:text-slate-200">
                    <bdi>{view.accountName}</bdi>
                  </dd>
                </div>
              )}
              {view.lastCheckedAt && (
                <div className="flex gap-1">
                  <dt>{c.lastChecked}:</dt>
                  <dd>
                    <DateDisplay date={view.lastCheckedAt} locale={locale} />
                  </dd>
                </div>
              )}
              {provider.kind === "social" && (
                <div className="flex gap-1">
                  <dt>{c.lastSynced}:</dt>
                  <dd>
                    {view.lastSyncedAt ? (
                      <DateDisplay date={view.lastSyncedAt} locale={locale} />
                    ) : (
                      c.never
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {view.lastError && view.isActive && (
            <p
              className="mt-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-300"
              dir="auto"
            >
              {view.lastError}
            </p>
          )}
        </div>
      </div>

      {editing && (
        <div className="space-y-3 border-t border-ink/10 bg-slate-50/60 dark:bg-white/[0.02] p-4 sm:p-5">
          {provider.fields.map((field) => {
            const secret = view.secrets[field.key];
            const id = `${provider.id}-${field.key}`;
            return (
              <div key={field.key} className="space-y-1">
                <label
                  htmlFor={id}
                  className="text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  {c.fields[field.key as keyof typeof c.fields] ?? field.key}
                  {field.required && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  id={id}
                  type={
                    field.secret
                      ? "password"
                      : field.key === "fromEmail"
                        ? "email"
                        : "text"
                  }
                  autoComplete="off"
                  dir="ltr"
                  className={fieldClass}
                  value={values[field.key] ?? ""}
                  placeholder={
                    field.secret && secret?.set
                      ? formatMessage(c.secretSet, { hint: secret.hint })
                      : formatMessage(c.fieldPlaceholder, { label: c.fields[field.key as keyof typeof c.fields] ?? field.key })
                  }
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                />
                {field.secret && secret?.set && (
                  <p className="text-[11px] text-slate-500">{c.secretKeep}</p>
                )}
              </div>
            );
          })}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              role="switch"
              className="accent-accent"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            {c.enabled}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy !== null}
              onClick={save}
            >
              {busy === "save" ? c.saving : c.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {c.cancel}
            </Button>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="ms-auto inline-flex items-center gap-1 text-xs font-medium text-primary dark:text-accent hover:underline"
            >
              {c.docs}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {provider.id === "whatsapp" &&
        view.isActive &&
        view.healthStatus === "healthy" &&
        !editing && (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 px-4 py-3 sm:px-5">
            <label
              htmlFor="wa-test-to"
              className="text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              {c.whatsappTest}
            </label>
            <input
              id="wa-test-to"
              type="tel"
              dir="ltr"
              className={`${fieldClass} max-w-44`}
              placeholder={t.copy.phoneInternational}
              value={waTo}
              onChange={(e) => setWaTo(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!waTo || busy !== null}
              onClick={sendTest}
            >
              <Send className="w-3.5 h-3.5 me-1" />
              {c.send}
            </Button>
          </div>
        )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink/10 px-4 py-3 sm:px-5">
        {!editing && (
          <Button
            type="button"
            size="sm"
            variant={configured ? "outline" : "primary"}
            onClick={() => setEditing(true)}
          >
            <PlugZap className="w-3.5 h-3.5 me-1" />
            {configured ? c.edit : c.configure}
          </Button>
        )}
        {configured && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={test}
          >
            {busy === "test" ? c.testing : c.test}
          </Button>
        )}
        {provider.kind === "social" && view.isActive && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy !== null}
            onClick={sync}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 me-1 ${busy === "sync" ? "animate-spin" : ""}`}
            />
            {busy === "sync" ? c.syncing : c.sync}
          </Button>
        )}
        {configured && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto text-rose-600 dark:text-rose-400"
            aria-label={c.unlink}
            onClick={() => setConfirmUnlink(true)}
          >
            <Unlink className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <ConfirmDestructiveModal
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={async () => {
          await run("save", () => unlinkIntegration(provider.id));
          setConfirmUnlink(false);
          setIsActive(false);
        }}
        title={formatMessage(c.unlinkTitle, { name: copy.name })}
        description={c.unlinkBody}
        confirmLabel={c.unlink}
      />
    </Card>
  );
}

export function IntegrationsView({
  integrations,
  canManage = true,
  calendar,
}: {
  integrations: IntegrationAdminView[];
  canManage?: boolean;
  /** The viewer's own calendar link; null when they have no calendar access. */
  calendar: {
    feed: {
      layers: CalendarLayer[];
      createdAt: string;
      lastUsedAt: string | null;
    } | null;
    syncEnabled: boolean;
  } | null;
}) {
  const { t } = useAdminLocale();
  const c = t.integrations;
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {canManage && <SettingsNavTabs />}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {c.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          {canManage ? c.subtitle : t.calendarSync.personalSubtitle}
        </p>
      </header>
      {calendar && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.calendarSync.kind}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <CalendarSyncCard
              feed={calendar.feed}
              syncEnabled={calendar.syncEnabled}
              canManage={canManage}
            />
          </div>
        </section>
      )}
      {canManage &&
        KINDS.map((kind) => {
          const providers = INTEGRATION_PROVIDERS.filter(
            (provider) => provider.kind === kind,
          );
          return (
            <section key={kind} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {c.kinds[kind]}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {providers.map((provider) => (
                  <IntegrationCard
                    key={provider.id}
                    provider={provider}
                    view={integrations.find(
                      (view) => view.provider === provider.id,
                    )!}
                  />
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
}
