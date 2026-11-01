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
import { Button, Card, Input, Textarea } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { SiteCode, SiteDomains } from "@platform/api-client";
import type { DomainCheckResult } from "@platform/database/services/domain-check";
import {
  dnsRecords,
  normalizeDomain,
} from "@platform/database/constants/domains";
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
    <p className="text-[11px] text-ink-muted">
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
    <Card
      role="alert"
      className="p-8 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
    >
      {copy.site.unavailable}
    </Card>
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
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-medium text-ink">
          {kind === "website" ? d.websiteLabel : d.adminLabel}
        </label>
        <div className="flex items-center rounded-lg border border-outline-variant bg-surface focus-within:ring-2 focus-within:ring-accent">
          <span className="ps-3 text-xs text-ink-muted" dir="ltr">
            {d.scheme}
          </span>
          <Input
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
            className="border-0 focus-visible:ring-0 rounded-lg"
          />
        </div>
        <p
          className={`text-[11px] ${invalid ? "text-rose-600" : "text-ink-muted"}`}
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
      <div className="rounded-xl border border-outline-variant p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink text-start">
            <bdi dir="ltr">{domain}</bdi>
          </p>
          {canCheck && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              disabled={state === "checking"}
              onClick={() => check(kind)}
            >
              {state === "checking" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="size-3.5" aria-hidden />
              )}
              {d.check}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-muted">{d.dnsIntro}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-muted">
                <th className="text-start font-medium py-1 pe-3">
                  {d.hosting}
                </th>
                <th className="text-start font-medium py-1 pe-3">{d.type}</th>
                <th className="text-start font-medium py-1 pe-3">{d.name}</th>
                <th className="text-start font-medium py-1">{d.value}</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords(domain).map((record) => (
                <tr
                  key={record.hosting}
                  className="border-t border-outline-variant"
                >
                  <td className="py-1.5 pe-3">
                    {record.hosting === "vercel"
                      ? d.hostingVercel
                      : d.hostingServer}
                  </td>
                  <td className="py-1.5 pe-3 font-mono" dir="ltr">
                    {record.type}
                  </td>
                  <td className="py-1.5 pe-3 font-mono" dir="ltr">
                    <bdi dir="auto">{record.name}</bdi>
                  </td>
                  <td
                    className="py-1.5 font-mono"
                    dir={record.value ? "ltr" : undefined}
                  >
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
            className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${state.state === "connected" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}
          >
            {state.state === "connected" ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            ) : (
              <CircleAlert className="size-4 shrink-0" aria-hidden />
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
    <Card
      inert={saving}
      aria-busy={saving}
      className="p-5 space-y-5 rounded-3xl border border-outline-variant bg-surface"
    >
      <div className="flex items-start gap-3">
        <Globe className="size-5 text-accent shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 className="font-bold text-ink">{d.title}</h2>
          <p className="text-xs text-ink-muted leading-relaxed">{d.subtitle}</p>
          <ChangedBy value={initial} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("website")}
        {field("admin")}
      </div>
      {canEdit && (
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 rounded-full"
          disabled={!dirty || saving}
          onClick={save}
        >
          <Save className="size-3.5" aria-hidden />
          {saving ? d.saving : d.save}
        </Button>
      )}
      {records("website")}
      {records("admin")}
    </Card>
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
    <Card
      inert={saving}
      aria-busy={saving}
      className="p-5 space-y-5 rounded-3xl border border-outline-variant bg-surface"
    >
      <div className="flex items-start gap-3">
        <Code2 className="size-5 text-accent shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 className="font-bold text-ink">{c.title}</h2>
          <p className="text-xs text-ink-muted leading-relaxed">{c.subtitle}</p>
          <ChangedBy value={initial} />
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">{c.analytics}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {ID_FIELDS.map((key) => (
            <div key={key} className="space-y-1.5">
              <label
                htmlFor={`code-${key}`}
                className="text-xs font-medium text-ink"
              >
                {c[key]}
              </label>
              <Input
                id={`code-${key}`}
                dir="ltr"
                disabled={!canEdit}
                value={code[key]}
                onChange={(e) =>
                  setCode({ ...code, [key]: e.target.value.trim() })
                }
                className="rounded-lg font-mono"
              />
              <p className="text-[11px] text-ink-muted">{c.hints[key]}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">{c.custom}</h3>
        <p className="flex items-start gap-2 text-xs rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2">
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          {c.sandboxed}
        </p>
        {(["headHtml", "bodyHtml"] as const).map((key) => (
          <div key={key} className="space-y-1.5">
            <label
              htmlFor={`code-${key}`}
              className="text-xs font-medium text-ink"
            >
              {c[key]}
            </label>
            <Textarea
              id={`code-${key}`}
              dir="ltr"
              rows={6}
              maxLength={50_000}
              disabled={!canEdit}
              value={code[key]}
              onChange={(e) => setCode({ ...code, [key]: e.target.value })}
              className="font-mono text-xs rounded-lg"
            />
          </div>
        ))}
      </section>
      {canEdit && (
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 rounded-full"
          disabled={saving}
          onClick={save}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-3.5" aria-hidden />
          )}
          {saving ? c.saving : c.save}
        </Button>
      )}
    </Card>
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
    <>
      <PageTitle title={copy.site.title} description={copy.site.description} />
      {!canEditDomains && (
        <p className="mb-4 text-xs text-ink-muted">{copy.site.readOnly}</p>
      )}
      <div className="space-y-6 pb-12">
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
    </>
  );
}
