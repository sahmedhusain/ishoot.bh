"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Copy,
  CreditCard,
  Package,
  Mail,
  PlugZap,
  RefreshCw,
  Send,
  Unlink,
} from "lucide-react";
import {
  Button,
  Card,
  ConfirmDialog,
  DateDisplay,
  Input,
  Select,
  useConfirmation,
} from "@platform/ui";
import {
  INTEGRATION_PROVIDERS,
  INTEGRATION_ENVIRONMENTS,
  PAYTABS_REGIONS,
  type integrationSetupLinks,
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

const KINDS: IntegrationKind[] = [
  "social",
  "messaging",
  "email",
  "sign_in",
  "payments",
  "couriers",
];

const fieldClass =
  "w-full min-w-0 rounded-lg border border-ink/15 bg-white dark:bg-surface px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/40";

type SetupLinks = ReturnType<typeof integrationSetupLinks>;

const statusTone: Record<string, string> = {
  configured: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  healthy:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  error: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  unknown:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  off: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-ink/15",
};

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

function IntegrationCard({
  provider,
  view,
  links,
}: {
  links: SetupLinks;
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
  const [readingKey, setReadingKey] = React.useState(false);
  const blocked = busy !== null || readingKey;
  const pending = React.useRef(false);
  const confirmAction = useConfirmation();
  const [error, setError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const dirty =
    isActive !== view.isActive ||
    provider.fields.some((field) =>
      field.secret
        ? !!values[field.key]?.trim()
        : (values[field.key] ?? "").trim() !==
        (view.values[field.key] ?? "").trim(),
    );
  const markSaved = useUnsavedChanges({ isActive, values });
  const resetEditing = () => {
    const resetValues = Object.fromEntries(
      provider.fields.map((field) => [
        field.key,
        field.secret ? "" : (view.values[field.key] ?? ""),
      ]),
    );
    markSaved({ isActive: view.isActive, values: resetValues });
    setValues(resetValues);
    setIsActive(view.isActive);
    setFieldErrors({});
    setError("");
    setEditing(false);
  };
  const discardEditing = () => {
    if (blocked) return;
    if (!dirty) {
      resetEditing();
      return;
    }
    confirmAction({
      title: c.setup.discardTitle,
      description: c.setup.discardBody,
      variant: "warning",
      onConfirm: resetEditing,
    });
  };
  const copyAddress = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(c.setup.copied);
    } catch {
      setError(c.setup.copyFailed);
    }
  };
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
    if (pending.current || readingKey) return undefined;
    pending.current = true;
    setError("");
    setBusy(kind);
    try {
      return await fn();
    } catch (error) {
      const message = errorMessage(error, t, c.testFailed);
      setError(message);
      toast.error(message);
      return undefined;
    } finally {
      pending.current = false;
      setBusy(null);
    }
  };

  const save = () => {
    if (blocked || fieldErrors.privateKey === c.setup.keyInvalid) return;
    const missing = Object.fromEntries(
      provider.fields
        .filter(
          (field) =>
            isActive &&
            field.required &&
            !values[field.key]?.trim() &&
            !(field.secret && view.secrets[field.key]?.set),
        )
        .map((field) => [
          field.key,
          formatMessage(c.setup.requiredField, {
            label: c.fields[field.key as keyof typeof c.fields],
          }),
        ]),
    );
    setFieldErrors(missing);
    if (Object.keys(missing).length) {
      document
        .getElementById(`${provider.id}-${Object.keys(missing)[0]}`)
        ?.focus();
      return;
    }
    return run("save", async () => {
      await saveIntegration(provider.id, isActive, values);
      toast.success(c.saved);
      setEditing(false);
      const savedValues = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, provider.fields.find(field => field.key === key)?.secret ? "" : value]));
      markSaved({ isActive, values: savedValues });
      setValues(savedValues);
    });
  };

  const test = () =>
    run("test", async () => {
      const result = await testIntegrationAction(provider.id);
      if (result.ok)
        toast.success(
          result.validation === "format"
            ? c.setup.formatOk
            : result.accountName
              ? `${c.testOk} · ${result.accountName}`
              : c.testOk,
        );
      else {
        const detail = errorMessage(result.error, t, "");
        const message = detail ? `${c.testFailed}: ${detail}` : c.testFailed;
        setError(message);
        toast.error(message);
      }
    });

  const sync = () =>
    run("sync", async () => {
      const result = await syncIntegrationAction(provider.id);
      if (result.ok)
        toast.success(formatMessage(c.syncOk, { posts: String(result.posts) }));
      else {
        const detail = errorMessage(result.error, t, "");
        const message = detail ? `${c.syncFailed}: ${detail}` : c.syncFailed;
        setError(message);
        toast.error(message);
      }
    });

  const sendTest = () =>
    run("send", async () => {
      await sendWhatsAppTestAction(waTo, c.whatsappBody);
      toast.success(c.sent);
    });

  return (
    <Card
      inert={busy === "save" || readingKey}
      aria-busy={busy === "save" || readingKey}
      data-testid={`integration-${provider.id}`}
      className="flex flex-col p-0 overflow-hidden dark:bg-surface-raised"
    >
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
                    <DateDisplay
                      date={view.lastCheckedAt}
                      locale={locale}
                      format="time"
                    />
                  </dd>
                </div>
              )}
              {provider.kind === "social" && (
                <div className="flex gap-1">
                  <dt>{c.lastSynced}:</dt>
                  <dd>
                    {view.lastSyncedAt ? (
                      <DateDisplay
                        date={view.lastSyncedAt}
                        locale={locale}
                        format="time"
                      />
                    ) : (
                      c.never
                    )}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {view.isActive && view.config.lastSyncPartial === true && (
            <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t.socialAnalytics.partial}</p>
          )}
          {view.lastError && view.isActive && (
            <p
              className="mt-2 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-700 dark:text-rose-300"
              dir="auto"
            >
              {errorMessage(view.lastError, t, c.testFailed)}
            </p>
          )}
        </div>
      </div>

      <details className="border-t border-ink/10 px-4 py-3 text-xs sm:px-5">
        <summary className="cursor-pointer rounded font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-accent">
          {c.setup.title}
        </summary>
        <div className="mt-3 space-y-3 leading-relaxed text-slate-600 dark:text-slate-300">
          {(["prerequisites", "permissions", "environment"] as const).map(
            (key) => (
              <div key={key}>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                  {c.setup[key]}
                </h4>
                <p>{copy.guide[key]}</p>
              </div>
            ),
          )}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
              {c.setup.steps}
            </h4>
            <ol className="list-decimal space-y-1 ps-5">
              {copy.guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
              {c.setup.addresses}
            </h4>
            {links.map((link) => (
              <div key={link.kind} className="space-y-1">
                <p className="font-medium">{c.setup[link.kind]}</p>
                <div className="flex min-w-0 items-start gap-2">
                  <code
                    dir="ltr"
                    className="min-w-0 flex-1 break-all rounded border border-ink/10 p-2 select-all"
                  >
                    {link.url}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={formatMessage(c.setup.copyAddress, {
                      kind: c.setup[link.kind],
                    })}
                    onClick={() => void copyAddress(link.url)}
                  >
                    <Copy aria-hidden="true" className="me-1 h-3 w-3" />
                    {c.setup.copy}
                  </Button>
                </div>
                {link.kind === "return" && <p>{c.setup.returnHelp}</p>}
              </div>
            ))}
            {!links.length && (
              <p>
                {provider.kind === "payments" ||
                  provider.kind === "sign_in" ||
                  provider.id === "resend"
                  ? c.setup.missingOrigin
                  : c.setup.noCallback}
              </p>
            )}
          </div>
          {(["verify", "errors", "limits"] as const).map((key) => (
            <div key={key}>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                {c.setup[key]}
              </h4>
              <p>{copy.guide[key]}</p>
            </div>
          ))}
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline dark:text-accent"
          >
            {c.docs}
            <ExternalLink aria-hidden="true" className="h-3 w-3" />
          </a>
        </div>
      </details>
      {error && (
        <p
          role="alert"
          className="mx-4 my-2 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-300"
          dir="auto"
        >
          {error}
        </p>
      )}
      {editing && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="space-y-3 border-t border-ink/10 bg-slate-50/60 dark:bg-white/[0.02] p-4 sm:p-5"
        >
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
                {field.key === "environment" || field.key === "region" ? (
                  <Select
                    id={id}
                    disabled={blocked}
                    value={values[field.key] ?? ""}
                    required={isActive && field.required}
                    aria-invalid={!!fieldErrors[field.key]}
                    aria-describedby={`${id}-help${fieldErrors[field.key] ? ` ${id}-error` : ""}`}
                    onChange={(event) => {
                      setValues((v) => ({
                        ...v,
                        [field.key]: event.target.value,
                      }));
                      setFieldErrors((v) => ({ ...v, [field.key]: "" }));
                    }}
                  >
                    <option value="">{c.placeholders[field.key]}</option>
                    {(field.key === "environment"
                      ? [...INTEGRATION_ENVIRONMENTS]
                      : Object.keys(PAYTABS_REGIONS)
                    ).map((value) => (
                      <option key={value} value={value}>
                        {field.key === "environment"
                          ? c.setup.environments[
                          value as keyof typeof c.setup.environments
                          ]
                          : value}
                      </option>
                    ))}
                  </Select>
                ) : field.key === "privateKey" ? (
                  <>
                    <Input
                      id={id}
                      type="file"
                      accept=".p8,.pem"
                      disabled={blocked}
                      aria-label={c.setup.keyUpload}
                      aria-invalid={!!fieldErrors[field.key]}
                      aria-describedby={`${id}-help${fieldErrors[field.key] ? ` ${id}-error` : ""}`}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setReadingKey(true);
                        const input = event.currentTarget;
                        try {
                          if (file.size > 2000) throw new Error();
                          const text = await file.text();
                          if (
                            !/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(
                              text,
                            )
                          )
                            throw new Error();
                          setValues((v) => ({ ...v, [field.key]: text }));
                          setFieldErrors((v) => ({ ...v, [field.key]: "" }));
                        } catch {
                          setFieldErrors((v) => ({
                            ...v,
                            [field.key]: c.setup.keyInvalid,
                          }));
                          setValues((v) => ({ ...v, [field.key]: "" }));
                          input.value = "";
                        } finally {
                          setReadingKey(false);
                        }
                      }}
                    />
                    {values.privateKey && (
                      <p
                        role="status"
                        className="text-xs text-emerald-700 dark:text-emerald-300"
                      >
                        {c.setup.keyReady}
                      </p>
                    )}
                  </>
                ) : (
                  <Input
                    id={id}
                    name={field.key}
                    type={
                      field.secret
                        ? "password"
                        : field.key === "fromEmail"
                          ? "email"
                          : "text"
                    }
                    autoComplete="off"
                    dir="ltr"
                    disabled={blocked}
                    value={values[field.key] ?? ""}
                    required={
                      isActive &&
                      field.required &&
                      !(field.secret && secret?.set)
                    }
                    maxLength={field.maxLength ?? 2000}
                    aria-invalid={!!fieldErrors[field.key]}
                    aria-describedby={`${id}-help${fieldErrors[field.key] ? ` ${id}-error` : ""}`}
                    placeholder={
                      field.secret && secret?.set
                        ? formatMessage(c.secretSet, { hint: secret.hint })
                        : c.placeholders[
                        field.key as keyof typeof c.placeholders
                        ]
                    }
                    onChange={(event) => {
                      setValues((v) => ({
                        ...v,
                        [field.key]: event.target.value,
                      }));
                      setFieldErrors((v) => ({ ...v, [field.key]: "" }));
                    }}
                  />
                )}
                <p
                  id={`${id}-help`}
                  className="text-[11px] text-slate-500 dark:text-slate-400"
                >
                  {field.secret && secret?.set
                    ? c.secretKeep
                    : c.placeholders[field.key as keyof typeof c.placeholders]}
                </p>
                {fieldErrors[field.key] && (
                  <p
                    id={`${id}-error`}
                    role="alert"
                    className="text-xs text-rose-700 dark:text-rose-300"
                  >
                    {fieldErrors[field.key]}
                  </p>
                )}
              </div>
            );
          })}
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              role="switch"
              className="accent-accent"
              disabled={blocked}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            {c.enabled}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={blocked}>
              {readingKey
                ? c.setup.readingKey
                : busy === "save"
                  ? c.saving
                  : c.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={blocked}
              onClick={discardEditing}
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
        </form>
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
            disabled={blocked}
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
            disabled={blocked}
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
            disabled={blocked}
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
            disabled={blocked}
            onClick={() => setConfirmUnlink(true)}
          >
            <Unlink className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={async () => {
          try {
            await unlinkIntegration(provider.id);
            const clearedValues = Object.fromEntries(provider.fields.map(field => [field.key, ""]));
            markSaved({ isActive: false, values: clearedValues });
            setValues(clearedValues);
            setIsActive(false);
            setEditing(false);
          } catch (error) {
            toast.error(errorMessage(error, t, c.testFailed));
            throw error;
          }
        }}
        title={formatMessage(c.unlinkTitle, { name: copy.name })}
        description={c.unlinkBody}
        confirmMatchText={copy.name}
        confirmLabel={c.unlink}
      />
    </Card>
  );
}

export function IntegrationsView({
  integrations,
  canManage = true,
  setupLinks,
  calendar,
}: {
  integrations: IntegrationAdminView[];
  setupLinks: Record<string, SetupLinks>;
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
                    links={setupLinks[provider.id] ?? []}
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
