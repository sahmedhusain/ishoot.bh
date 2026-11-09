"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  Code2,
  Globe,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { SiteCode, SiteDomains } from "@platform/api-client";
import type { DomainCheckResult } from "@platform/config/domain-check";
import {
  dnsRecords,
  normalizeDomain,
} from "@platform/config/constants/domains";
import { DomainSaveConfirmModal } from "./DomainSaveConfirmModal";
import {
  checkSiteDomainAction,
  saveSiteCodeAction,
  saveSiteDomainsAction,
  type SiteOutcome,
} from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

type Kind = "website" | "admin";
type Changed = { updatedAt?: string; updatedBy?: string };

function ChangedBy({ value }: { value: Changed | null }) {
  const { copy, date } = useCopy();
  if (!value?.updatedAt) return null;
  return (
    <p className="text-[10px] font-mono text-ink-muted">
      {formatMessage(copy.site.changed, {
        when: date(value.updatedAt),
        who: value.updatedBy ?? "",
      })}
    </p>
  );
}

function Unavailable() {
  const { copy } = useCopy();
  return (
    <div
      role="alert"
      className="it-card p-6 text-center text-xs font-mono text-ink-muted"
    >
      {copy.site.unavailable}
    </div>
  );
}

/** The outcome's message: the saved text, or why it was refused. */
function useOutcome() {
  const { copy } = useCopy();
  return (outcome: SiteOutcome<unknown>, saved: string) => {
    if (outcome.ok) toast.success(saved);
    else
      toast.error(
        outcome.reason === "domainsMustDiffer"
          ? copy.site.domainsMustDiffer
          : copy.site.failed,
      );
  };
}

function DomainsCard({
  initial,
  canEdit,
  canCheck,
}: {
  initial: SiteDomains;
  canEdit: boolean;
  canCheck: boolean;
}) {
  const { copy } = useCopy();
  const d = copy.site.domains;
  const router = useRouter();
  const report = useOutcome();
  const [values, setValues] = React.useState<Record<Kind, string>>({
    website: initial.websiteDomain,
    admin: initial.adminDomain,
  });
  const saved: Record<Kind, string> = {
    website: initial.websiteDomain,
    admin: initial.adminDomain,
  };
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [checks, setChecks] = React.useState<
    Partial<Record<Kind, DomainCheckResult | "checking" | null>>
  >({});
  const dirty =
    values.website !== saved.website || values.admin !== saved.admin;

  const save = async () => {
    setSaving(true);
    try {
      const outcome = await saveSiteDomainsAction(values.website, values.admin);
      report(outcome, d.saved);
      if (outcome.ok) {
        setValues({
          website: outcome.value.websiteDomain,
          admin: outcome.value.adminDomain,
        });
        setChecks({});
        setConfirmOpen(false);
        router.refresh();
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setSaving(false);
    }
  };

  const check = async (kind: Kind) => {
    setChecks((current) => ({ ...current, [kind]: "checking" }));
    const result = await checkSiteDomainAction(kind, saved[kind]).catch(
      () => null,
    );
    setChecks((current) => ({
      ...current,
      [kind]: result ?? { state: "unreachable" },
    }));
  };

  const field = (kind: Kind) => {
    const id = `domain-${kind}`;
    const invalid =
      values[kind].trim() !== "" && !normalizeDomain(values[kind]);
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-bold font-mono text-ink uppercase">
          {kind === "website" ? d.websiteLabel : d.adminLabel}
        </label>
        <div className="flex items-center">
          <span className="it-status-pane text-ink-muted" dir="ltr">
            {d.scheme}
          </span>
          <input
            id={id}
            dir="ltr"
            value={values[kind]}
            disabled={!canEdit}
            placeholder={
              kind === "website" ? d.websitePlaceholder : d.adminPlaceholder
            }
            onChange={(e) =>
              setValues((current) => ({ ...current, [kind]: e.target.value }))
            }
            aria-invalid={invalid}
            className="it-field-sunken w-full font-mono text-xs"
          />
        </div>
        <p
          className={`text-[11px] ${invalid ? "text-rose-600 font-bold" : "text-ink-muted font-mono"}`}
        >
          {invalid
            ? d.invalid
            : kind === "website"
              ? d.websiteHint
              : d.adminHint}
        </p>
      </div>
    );
  };

  const records = (kind: Kind) => {
    const domain = saved[kind];
    if (!domain) return null;
    const state = checks[kind];
    return (
      <div className="border border-slate-300 dark:border-slate-700 p-3 space-y-2 bg-surface font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
          <p className="font-bold text-ink text-start">
            HOST: <bdi dir="ltr">{domain}</bdi>
          </p>
          {canCheck && (
            <button
              type="button"
              disabled={state === "checking"}
              onClick={() => check(kind)}
              className="it-btn-3d py-0.5 px-2 text-[10px] flex items-center gap-1 font-bold text-sky-800 dark:text-sky-300"
            >
              {state === "checking" ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="size-3" aria-hidden />
              )}
              <span>{d.check}</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-ink-muted font-sans">{formatMessage(d.dnsIntro, { hours: 48 })}</p>
        <div className="overflow-x-auto">
          <table className="it-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-start">{d.hosting}</th>
                <th className="text-start">{d.type}</th>
                <th className="text-start">{d.name}</th>
                <th className="text-start">{d.value}</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords(domain).map((record) => (
                <tr key={record.hosting}>
                  <td>
                    {record.hosting === "vercel"
                      ? d.hostingVercel
                      : d.hostingServer}
                  </td>
                  <td className="font-bold" dir="ltr">
                    {record.type}
                  </td>
                  <td dir="ltr">
                    <bdi dir="auto">{record.name}</bdi>
                  </td>
                  <td dir={record.value ? "ltr" : undefined}>
                    {record.value ?? d.serverAddress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {state && state !== "checking" && (
          <p
            role="status"
            className={`border px-2 py-1 text-xs font-mono font-bold flex items-center gap-2 ${
              state.state === "connected"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                : "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
            }`}
          >
            {state.state === "connected" ? (
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              {state.state === "other"
                ? formatMessage(d.result.other, { status: state.status ?? "" })
                : d.result[state.state]}
            </span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      inert={saving}
      aria-busy={saving}
      className="it-card p-4 space-y-4 font-mono text-xs"
    >
      <div className="flex items-start gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
        <Globe className="size-4 text-sky-600 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold uppercase text-ink">{d.title}</h2>
          <p className="text-[11px] text-ink-muted font-sans">{d.subtitle}</p>
          <ChangedBy value={initial} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {field("website")}
        {field("admin")}
      </div>
      {canEdit && (
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => setConfirmOpen(true)}
          className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
        >
          <Save className="size-3.5" aria-hidden />
          <span>{saving ? d.saving : d.save}</span>
        </button>
      )}
      <div className="space-y-3 pt-2">
        {records("website")}
        {records("admin")}
      </div>

      <DomainSaveConfirmModal
        open={confirmOpen}
        currentWebsite={saved.website}
        newWebsite={values.website}
        currentAdmin={saved.admin}
        newAdmin={values.admin}
        busy={saving}
        onConfirm={save}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

const ID_FIELDS = ["googleAnalyticsId", "metaPixelId", "tiktokPixelId"] as const;

function CodeCard({
  initial,
  canEdit,
}: {
  initial: SiteCode & Changed;
  canEdit: boolean;
}) {
  const { copy } = useCopy();
  const c = copy.site.code;
  const router = useRouter();
  const report = useOutcome();
  const [code, setCode] = React.useState<SiteCode>({
    googleAnalyticsId: initial.googleAnalyticsId,
    metaPixelId: initial.metaPixelId,
    tiktokPixelId: initial.tiktokPixelId,
    headHtml: initial.headHtml,
    bodyHtml: initial.bodyHtml,
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const outcome = await saveSiteCodeAction(code);
      report(outcome, c.saved);
      if (outcome.ok) router.refresh();
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      inert={saving}
      aria-busy={saving}
      className="it-card p-4 space-y-4 font-mono text-xs"
    >
      <div className="flex items-start gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
        <Code2 className="size-4 text-sky-600 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold uppercase text-ink">{c.title}</h2>
          <p className="text-[11px] text-ink-muted font-sans">{c.subtitle}</p>
          <ChangedBy value={initial} />
        </div>
      </div>
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-ink">{c.analytics}</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {ID_FIELDS.map((key) => (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`code-${key}`}
                className="text-[10px] font-bold text-ink-muted uppercase"
              >
                {c[key]}
              </label>
              <input
                id={`code-${key}`}
                dir="ltr"
                disabled={!canEdit}
                value={code[key]}
                onChange={(e) =>
                  setCode({ ...code, [key]: e.target.value.trim() })
                }
                className="it-field-sunken w-full font-mono text-xs"
              />
              <p className="text-[10px] text-ink-muted font-sans">{c.hints[key]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-ink">{c.custom}</h3>
        <p className="flex items-center gap-2 text-xs border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-2 font-sans">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          <span>{c.sandboxed}</span>
        </p>
        {(["headHtml", "bodyHtml"] as const).map((key) => (
          <div key={key} className="space-y-1">
            <label
              htmlFor={`code-${key}`}
              className="text-[10px] font-bold text-ink-muted uppercase"
            >
              {c[key]}
            </label>
            <textarea
              id={`code-${key}`}
              dir="ltr"
              rows={5}
              maxLength={50_000}
              disabled={!canEdit}
              value={code[key]}
              onChange={(e) => setCode({ ...code, [key]: e.target.value })}
              className="it-field-sunken w-full font-mono text-xs"
            />
          </div>
        ))}
      </section>
      {canEdit && (
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-3.5" aria-hidden />
          )}
          <span>{saving ? c.saving : c.save}</span>
        </button>
      )}
    </div>
  );
}

/** The website's technical settings: domains (domains:*) and site-wide tracking and code (site_code:*). */
export function SiteView({
  domains,
  code,
  canEditDomains,
  canCheckDomains,
  canEditCode,
}: {
  domains: SiteDomains | null;
  /** undefined: the role cannot see the code; null: the service could not be reached. */
  code: (SiteCode & Changed) | null | undefined;
  canEditDomains: boolean;
  canCheckDomains: boolean;
  canEditCode: boolean;
}) {
  const { copy } = useCopy();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={copy.site.title} description={copy.site.description} />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SICF [INTERNET DOMAINS & SCRIPT INJECTION]
        </span>
      </div>

      {!canEditDomains && (
        <p className="text-xs font-mono text-ink-muted">{copy.site.readOnly}</p>
      )}
      <div className="space-y-4 pb-8">
        {domains ? (
          <DomainsCard
            initial={domains}
            canEdit={canEditDomains}
            canCheck={canCheckDomains}
          />
        ) : (
          <Unavailable />
        )}
        {code === undefined ? null : code ? (
          <CodeCard initial={code} canEdit={canEditCode} />
        ) : (
          <Unavailable />
        )}
      </div>
    </div>
  );
}
