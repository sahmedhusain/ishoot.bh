"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";

import * as React from "react";
import { CheckCircle2, CircleAlert, Globe, Loader2, Save, ShieldCheck } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { dnsRecords, normalizeDomain } from "@platform/database/constants/domains";
import type { DomainCheckResult } from "@platform/database/services/domain-check";
import { checkDomainAction, saveDomainsAction } from "../../app/actions/domains";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

type Kind = "website" | "admin";

export function DomainSettingsCard({ initialWebsiteDomain, initialAdminDomain, canEdit, compact }: { initialWebsiteDomain?: string; initialAdminDomain?: string; canEdit: boolean; compact?: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.domains;
  const [values, setValues] = React.useState({ website: initialWebsiteDomain ?? "", admin: initialAdminDomain ?? "" });
  const markSaved = useUnsavedChanges(values);
  const [saved, setSaved] = React.useState({ website: initialWebsiteDomain ?? "", admin: initialAdminDomain ?? "" });
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [checks, setChecks] = React.useState<Partial<Record<Kind, DomainCheckResult | "checking">>>({});
  const dirty = values.website !== saved.website || values.admin !== saved.admin;

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveDomainsAction({ websiteDomain: values.website, adminDomain: values.admin });
      const next = { website: result.websiteDomain, admin: result.adminDomain };
      markSaved(next);
      setValues(next);
      setSaved(next);
      setChecks({});
      setMessage({ tone: "ok", text: copy.saved });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setSaving(false);
    }
  };

  const check = async (kind: Kind) => {
    setChecks((current) => ({ ...current, [kind]: "checking" }));
    try {
      const result = await checkDomainAction(kind, saved[kind]);
      setChecks((current) => ({ ...current, [kind]: result }));
    } catch (error) {
      setChecks((current) => ({ ...current, [kind]: undefined }));
      setMessage({ tone: "error", text: errorMessage(error, t) });
    }
  };

  const field = (kind: Kind) => {
    const id = `domain-${kind}`;
    const invalid = values[kind].trim() !== "" && !normalizeDomain(values[kind]);
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-xs font-medium text-ink">
          {kind === "website" ? copy.websiteLabel : copy.adminLabel}
        </label>
        <div className="flex items-center rounded-lg border border-outline-variant bg-surface focus-within:ring-2 focus-within:ring-accent">
          <span className="ps-3 text-xs text-ink-muted" dir="ltr">{copy.scheme}</span>
          <Input
            id={id}
            dir="ltr"
            value={values[kind]}
            disabled={!canEdit}
            placeholder={kind === "website" ? copy.websitePlaceholder : copy.adminPlaceholder}
            onChange={(e) => setValues((current) => ({ ...current, [kind]: e.target.value }))}
            aria-invalid={invalid}
            className="border-0 focus-visible:ring-0 rounded-lg"
          />
        </div>
        <p className={`text-[11px] ${invalid ? "text-rose-600" : "text-ink-muted dark:text-ink-muted"}`}>{invalid ? copy.invalid : kind === "website" ? copy.websiteHint : copy.adminHint}</p>
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
          <p className="text-sm font-semibold text-ink text-start"><bdi dir="ltr">{domain}</bdi></p>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" disabled={state === "checking"} onClick={() => check(kind)}>
            {state === "checking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {copy.check}
          </Button>
        </div>
        <p className="text-xs text-ink-muted">{formatMessage(copy.dnsIntro, { hours: 48 })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-start text-ink-muted">
                <th className="text-start font-medium py-1 pe-3">{copy.hosting}</th>
                <th className="text-start font-medium py-1 pe-3">{copy.type}</th>
                <th className="text-start font-medium py-1 pe-3">{copy.name}</th>
                <th className="text-start font-medium py-1">{copy.value}</th>
              </tr>
            </thead>
            <tbody>
              {dnsRecords(domain).map((record) => (
                <tr key={record.hosting} className="border-t border-outline-variant">
                  <td className="py-1.5 pe-3">{record.hosting === "vercel" ? copy.hostingVercel : copy.hostingServer}</td>
                  <td className="py-1.5 pe-3 font-mono" dir="ltr">{record.type}</td>
                  <td className="py-1.5 pe-3 font-mono" dir="ltr"><bdi dir="auto">{record.name}</bdi></td>
                  <td className="py-1.5 font-mono" dir={record.value ? "ltr" : undefined}>{record.value ?? copy.serverAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {state && state !== "checking" && (
          <p role="status" className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${state.state === "connected" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
            {state.state === "connected" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <CircleAlert className="w-4 h-4 shrink-0" />}
            <span>{state.state === "other" ? formatMessage(copy.result.other, { status: state.status ?? "" }) : copy.result[state.state]}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <Card inert={saving} aria-busy={saving} className={compact ? "p-4 space-y-4" : "p-5 space-y-5"}>
      <div className="flex items-start gap-3">
        <Globe className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          {compact ? <h3 className="font-bold text-ink">{copy.title}</h3> : <h2 className="font-bold text-ink">{copy.title}</h2>}
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">{copy.subtitle}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {field("website")}
        {field("admin")}
      </div>
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" className="gap-1.5 rounded-full" disabled={!dirty || saving} onClick={save}>
            <Save className="w-3.5 h-3.5" />
            {saving ? copy.saving : copy.save}
          </Button>
          {message && <span role="status" className={`text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</span>}
        </div>
      )}
      {records("website")}
      {records("admin")}
    </Card>
  );
}
