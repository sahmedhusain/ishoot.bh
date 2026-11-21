"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  Code2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { formatMessage } from "@platform/locales";
import type {
  CMSContentSnapshot,
  CMSSocialLink,
  CompanyConfiguration,
  SiteCode,
  SiteDomains,
} from "@platform/api-client";
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
import {
  createItSocialLinkAction,
  deleteItSocialLinkAction,
  publishItWebsiteSnapshotAction,
  revalidatePublicSiteFromItAction,
  saveSitePresentationAction,
  updateItSocialLinkAction,
} from "../app/(desk)/site/actions";
import { revalidateFrontendCacheAction } from "../app/(desk)/deployments/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

type Kind = "website" | "admin" | "store";
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
    store: initial.storeDomain ?? "",
  });
  const saved: Record<Kind, string> = {
    website: initial.websiteDomain,
    admin: initial.adminDomain,
    store: initial.storeDomain ?? "",
  };
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [checks, setChecks] = React.useState<
    Partial<Record<Kind, DomainCheckResult | "checking" | null>>
  >({});
  const dirty =
    values.website !== saved.website ||
    values.admin !== saved.admin ||
    values.store !== saved.store;

  const save = async () => {
    setSaving(true);
    try {
      const outcome = await saveSiteDomainsAction(
        values.website,
        values.admin,
        values.store,
      );
      report(outcome, d.saved);
      if (outcome.ok) {
        setValues({
          website: outcome.value.websiteDomain,
          admin: outcome.value.adminDomain,
          store: outcome.value.storeDomain ?? "",
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
    const label =
      kind === "website"
        ? d.websiteLabel
        : kind === "store"
          ? d.storeLabel
          : d.adminLabel;
    const placeholder =
      kind === "website"
        ? d.websitePlaceholder
        : kind === "store"
          ? d.storePlaceholder
          : d.adminPlaceholder;
    const hint =
      kind === "website"
        ? d.websiteHint
        : kind === "store"
          ? d.storeHint
          : d.adminHint;
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-xs font-bold font-mono text-ink uppercase">
          {label}
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
            placeholder={placeholder}
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
          {invalid ? d.invalid : hint}
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
      <div className="grid sm:grid-cols-3 gap-3">
        {field("website")}
        {field("store")}
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
        {records("store")}
        {records("admin")}
      </div>

      {confirmOpen && (
        <DomainSaveConfirmModal
          open={confirmOpen}
          currentWebsite={saved.website}
          newWebsite={values.website}
          currentAdmin={saved.admin}
          newAdmin={values.admin}
          currentStore={saved.store}
          newStore={values.store}
          busy={saving}
          onConfirm={save}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
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

function PresentationCard({
  initial,
  canEdit,
  canRevalidate,
}: {
  initial: CompanyConfiguration;
  canEdit: boolean;
  canRevalidate: boolean;
}) {
  const { copy } = useCopy();
  const p = copy.site.presentation;
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [revalidating, setRevalidating] = React.useState(false);
  const [form, setForm] = React.useState({
    ceoNameEn: initial.ceoNameEn ?? "",
    ceoNameAr: initial.ceoNameAr ?? "",
    ceoTitleEn: initial.ceoTitleEn ?? "",
    ceoTitleAr: initial.ceoTitleAr ?? "",
    ceoQuoteEn: initial.ceoQuoteEn ?? "",
    ceoQuoteAr: initial.ceoQuoteAr ?? "",
    aboutTextEn: initial.aboutTextEn ?? "",
    aboutTextAr: initial.aboutTextAr ?? "",
    missionEn: initial.missionEn ?? "",
    missionAr: initial.missionAr ?? "",
    visionEn: initial.visionEn ?? "",
    visionAr: initial.visionAr ?? "",
    termsEn: initial.termsEn ?? "",
    termsAr: initial.termsAr ?? "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveSitePresentationAction({
        ceoNameEn: form.ceoNameEn || null,
        ceoNameAr: form.ceoNameAr || null,
        ceoTitleEn: form.ceoTitleEn || null,
        ceoTitleAr: form.ceoTitleAr || null,
        ceoQuoteEn: form.ceoQuoteEn || null,
        ceoQuoteAr: form.ceoQuoteAr || null,
        aboutTextEn: form.aboutTextEn || null,
        aboutTextAr: form.aboutTextAr || null,
        missionEn: form.missionEn || null,
        missionAr: form.missionAr || null,
        visionEn: form.visionEn || null,
        visionAr: form.visionAr || null,
        termsEn: form.termsEn || null,
        termsAr: form.termsAr || null,
      });
      if (res.ok) {
        toast.success(p.saved);
        router.refresh();
      } else {
        toast.error(copy.site.failed);
      }
    } finally {
      setSaving(false);
    }
  }

  async function revalidate() {
    setRevalidating(true);
    try {
      const res = await revalidatePublicSiteFromItAction();
      if (res.ok) toast.success(p.revalidated);
      else toast.error(copy.site.failed);
    } finally {
      setRevalidating(false);
    }
  }

  return (
    <form onSubmit={save} className="it-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-[0.14em] text-ink flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            {p.heading}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">{p.subtitle}</p>
        </div>
        {canRevalidate && (
          <button
            type="button"
            disabled={revalidating}
            onClick={revalidate}
            className="it-button border border-rule px-3 py-1.5 text-xs font-mono text-ink hover:bg-surface-muted disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {revalidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {p.revalidate}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoNameEn}</span>
          <input
            disabled={!canEdit}
            value={form.ceoNameEn}
            onChange={(e) => setForm({ ...form, ceoNameEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoNameAr}</span>
          <input
            dir="rtl"
            disabled={!canEdit}
            value={form.ceoNameAr}
            onChange={(e) => setForm({ ...form, ceoNameAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoTitleEn}</span>
          <input
            disabled={!canEdit}
            value={form.ceoTitleEn}
            onChange={(e) => setForm({ ...form, ceoTitleEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoTitleAr}</span>
          <input
            dir="rtl"
            disabled={!canEdit}
            value={form.ceoTitleAr}
            onChange={(e) => setForm({ ...form, ceoTitleAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoQuoteEn}</span>
          <textarea
            rows={2}
            disabled={!canEdit}
            value={form.ceoQuoteEn}
            onChange={(e) => setForm({ ...form, ceoQuoteEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.ceoQuoteAr}</span>
          <textarea
            dir="rtl"
            rows={2}
            disabled={!canEdit}
            value={form.ceoQuoteAr}
            onChange={(e) => setForm({ ...form, ceoQuoteAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.aboutTextEn}</span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.aboutTextEn}
            onChange={(e) => setForm({ ...form, aboutTextEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.aboutTextAr}</span>
          <textarea
            dir="rtl"
            rows={3}
            disabled={!canEdit}
            value={form.aboutTextAr}
            onChange={(e) => setForm({ ...form, aboutTextAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.missionEn}</span>
          <textarea
            rows={2}
            disabled={!canEdit}
            value={form.missionEn}
            onChange={(e) => setForm({ ...form, missionEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.missionAr}</span>
          <textarea
            dir="rtl"
            rows={2}
            disabled={!canEdit}
            value={form.missionAr}
            onChange={(e) => setForm({ ...form, missionAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.visionEn}</span>
          <textarea
            rows={2}
            disabled={!canEdit}
            value={form.visionEn}
            onChange={(e) => setForm({ ...form, visionEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.visionAr}</span>
          <textarea
            dir="rtl"
            rows={2}
            disabled={!canEdit}
            value={form.visionAr}
            onChange={(e) => setForm({ ...form, visionAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.termsEn}</span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.termsEn}
            onChange={(e) => setForm({ ...form, termsEn: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-mono text-ink-muted">{p.termsAr}</span>
          <textarea
            dir="rtl"
            rows={3}
            disabled={!canEdit}
            value={form.termsAr}
            onChange={(e) => setForm({ ...form, termsAr: e.target.value })}
            className="w-full bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
        </label>
      </div>

      {canEdit && (
        <div className="flex justify-end pt-2 border-t border-rule">
          <button
            type="submit"
            disabled={saving}
            className="it-button bg-accent text-accent-ink px-3 py-1.5 text-xs font-mono inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {p.save}
          </button>
        </div>
      )}
    </form>
  );
}

function SocialLinksCard({
  snapshot,
  canEdit,
}: {
  snapshot: CMSContentSnapshot;
  canEdit: boolean;
}) {
  const { copy } = useCopy();
  const s = copy.site.social;
  const router = useRouter();
  const draftLinks = Array.isArray((snapshot.draft as Record<string, unknown>)?.socialLinks)
    ? ((snapshot.draft as Record<string, unknown>).socialLinks as CMSSocialLink[])
    : [];
  const [links, setLinks] = React.useState<CMSSocialLink[]>(draftLinks);
  const [platform, setPlatform] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!platform.trim() || !url.trim()) return;
    setBusy(true);
    try {
      const res = await createItSocialLinkAction({ platform, url });
      if (res.ok) {
        setLinks((prev) => [...prev, res.link]);
        setPlatform("");
        setUrl("");
        toast.success(s.added);
        router.refresh();
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(link: CMSSocialLink) {
    setBusy(true);
    try {
      const res = await updateItSocialLinkAction(link.id, {
        is_active: !link.is_active,
      });
      if (res.ok) {
        setLinks(res.links);
        toast.success(s.updated);
        router.refresh();
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  }

  async function removeLink(id: string) {
    setBusy(true);
    try {
      const res = await deleteItSocialLinkAction(id);
      if (res.ok) {
        setLinks(res.links);
        toast.success(s.deleted);
        router.refresh();
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  }

  async function publishSnapshot() {
    setPublishing(true);
    try {
      await publishItWebsiteSnapshotAction();
      toast.success(s.published);
      router.refresh();
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="it-card p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-mono uppercase tracking-[0.14em] text-ink flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
            {s.heading}
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">{s.subtitle}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={publishing}
            onClick={publishSnapshot}
            className="it-button bg-accent text-accent-ink px-3 py-1.5 text-xs font-mono inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {s.publish}
          </button>
        )}
      </div>

      {canEdit && (
        <form onSubmit={addLink} className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            placeholder={s.platformPlaceholder}
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
          <input
            placeholder={s.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-surface-muted border border-rule px-2.5 py-1.5 text-xs text-ink"
          />
          <button
            type="submit"
            disabled={busy || !platform.trim() || !url.trim()}
            className="it-button border border-rule px-3 py-1.5 text-xs font-mono text-ink hover:bg-surface-muted inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {s.add}
          </button>
        </form>
      )}

      {links.length === 0 ? (
        <p className="text-xs font-mono text-ink-muted py-4 text-center border border-dashed border-rule">
          {s.empty}
        </p>
      ) : (
        <div className="divide-y divide-rule border border-rule">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono font-semibold text-ink">{link.platform}</span>
                <p className="text-[11px] font-mono text-ink-muted truncate">{link.url}</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleActive(link)}
                    className="it-button border border-rule px-2 py-1 text-[11px] font-mono inline-flex items-center gap-1"
                  >
                    {link.is_active ? (
                      <>
                        <Eye className="w-3 h-3" aria-hidden="true" />
                        {s.active}
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" aria-hidden="true" />
                        {s.hidden}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeLink(link.id)}
                    aria-label={s.remove}
                    className="it-button border border-rule px-2 py-1 text-[11px] font-mono text-danger hover:bg-surface-muted"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type SiteTab = "domains" | "presentation" | "social" | "code" | "pages" | "operations";

function PagesSeoCard({
  snapshot,
  websiteDomain,
}: {
  snapshot: CMSContentSnapshot;
  websiteDomain?: string;
}) {
  const { copy } = useCopy();
  const p = copy.site.pages;
  const pages = Array.isArray((snapshot as { pages?: unknown[] }).pages)
    ? ((snapshot as { pages?: Array<Record<string, unknown>> }).pages ?? [])
    : [];
  const baseUrl = websiteDomain
    ? websiteDomain.startsWith("http")
      ? websiteDomain.replace(/\/$/, "")
      : `https://${websiteDomain}`
    : "";

  return (
    <div className="it-card p-5 space-y-4 font-mono text-xs">
      <div className="border-b border-rule pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{p.title}</h2>
        <p className="text-[11px] text-ink-muted font-sans mt-0.5">{p.subtitle}</p>
      </div>
      {pages.length === 0 ? (
        <p className="text-ink-muted py-4 text-center">{p.noPages}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="it-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-start">{p.slug}</th>
                <th className="text-start">EN / AR</th>
                <th className="text-start">{p.navVisibility}</th>
                <th className="text-start">{p.seoStatus}</th>
                {baseUrl && <th className="text-end">{p.openLive}</th>}
              </tr>
            </thead>
            <tbody>
              {pages.map((pg, idx) => {
                const slug = String(pg.slug ?? pg.id ?? idx);
                const route = slug === "home" ? "/" : `/${slug}`;
                const titleEn = String(pg.titleEn ?? pg.title_en ?? slug);
                const titleAr = String(pg.titleAr ?? pg.title_ar ?? "");
                const inHeader = Boolean(pg.showInHeader ?? pg.show_in_header);
                const inFooter = Boolean(pg.showInFooter ?? pg.show_in_footer);
                const hasSeo = Boolean(pg.seoTitleEn ?? pg.seo_title_en ?? pg.seoDescriptionEn ?? pg.seo_description_en);
                return (
                  <tr key={slug}>
                    <td className="font-bold text-ink" dir="ltr">{route}</td>
                    <td>
                      <div className="text-ink font-sans font-medium">{titleEn}</div>
                      {titleAr && <div className="text-[11px] text-ink-muted font-sans" dir="rtl">{titleAr}</div>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {inHeader && <span className="it-badge it-badge-active text-[9px]">HEADER</span>}
                        {inFooter && <span className="it-badge it-badge-neutral text-[9px]">FOOTER</span>}
                        {!inHeader && !inFooter && <span className="text-ink-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`it-badge text-[9px] ${hasSeo ? "it-badge-active" : "it-badge-warn"}`}>
                        {hasSeo ? "SEO OK" : "MISSING"}
                      </span>
                    </td>
                    {baseUrl && (
                      <td className="text-end">
                        <a
                          href={`${baseUrl}${route}`}
                          target="_blank"
                          rel="noreferrer"
                          className="it-btn-3d px-2 py-0.5 text-[10px] text-sky-700 dark:text-sky-300"
                        >
                          {p.openLive}
                        </a>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SiteOperationsCard({ canEdit }: { canEdit: boolean }) {
  const { copy } = useCopy();
  const op = copy.site.operations;
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [maintenanceOn, setMaintenanceOn] = React.useState(false);
  const [statusLog, setStatusLog] = React.useState<string[]>([]);

  const handlePublish = async () => {
    setBusy(true);
    try {
      const res = await publishItWebsiteSnapshotAction();
      if (res.ok) {
        toast.success(op.publishSnapshot);
        setStatusLog((prev) => [`Published live CMS snapshot (${new Date().toISOString().slice(11, 19)} UTC)`, ...prev].slice(0, 6));
        router.refresh();
      } else {
        toast.error(copy.site.failed);
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleRevalidateAll = async () => {
    setBusy(true);
    try {
      const res = await revalidateFrontendCacheAction("all", ["/"], ["website", "company"]);
      const ok = res.results.filter((r) => r.ok).length;
      if (ok === res.results.length) {
        toast.success(`${op.revalidateAll}: ${ok}/${res.results.length} HTTP 200`);
      } else {
        toast.error(copy.site.failed);
      }
      setStatusLog((prev) => [
        ...res.results.map((r) => `Revalidate ${r.target}: ${r.ok ? `HTTP ${r.status}` : r.error || r.status} (${r.durationMs}ms)`),
        ...prev,
      ].slice(0, 6));
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPublicRevalidate = async () => {
    setBusy(true);
    try {
      const res = await revalidatePublicSiteFromItAction();
      if (res.ok) {
        setMaintenanceOn((prev) => !prev);
        toast.success(op.revalidateAll);
        setStatusLog((prev) => [`Triggered public site revalidation (${new Date().toISOString().slice(11, 19)} UTC)`, ...prev].slice(0, 6));
      } else {
        toast.error(copy.site.failed);
      }
    } catch {
      toast.error(copy.site.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="it-card p-5 space-y-4 font-mono text-xs">
      <div className="border-b border-rule pb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink">{op.title}</h2>
        <p className="text-[11px] text-ink-muted font-sans mt-0.5">{op.subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !canEdit}
          onClick={() => void handlePublish()}
          className="it-btn-3d py-1.5 px-3 font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          <span>{op.publishSnapshot}</span>
        </button>

        <button
          type="button"
          disabled={busy || !canEdit}
          onClick={() => void handleRevalidateAll()}
          className="it-btn-3d py-1.5 px-3 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
          <span>{op.revalidateAll}</span>
        </button>
      </div>

      <div className="border border-rule p-3.5 bg-surface space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-bold text-ink uppercase">{op.maintenanceTitle}</div>
            <p className="text-[11px] text-ink-muted font-sans">{op.maintenanceDesc}</p>
          </div>
          <button
            type="button"
            disabled={busy || !canEdit}
            onClick={() => void handleQuickPublicRevalidate()}
            className="it-btn-3d py-1.5 px-3 font-bold text-amber-800 dark:text-amber-300 disabled:opacity-50"
          >
            {op.revalidateAll}
          </button>
        </div>
      </div>

      {statusLog.length > 0 && (
        <ul className="space-y-1 border-t border-rule pt-2 text-[11px] text-ink-muted">
          {statusLog.map((line, i) => (
            <li key={`${line}-${i}`} className="text-emerald-700 dark:text-emerald-400">
              • {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SiteView({
  domains,
  code,
  company,
  snapshot,
  canEditDomains,
  canCheckDomains,
  canEditCode,
  canEditPresentation,
}: {
  domains: SiteDomains | null;
  code: (SiteCode & Changed) | null | undefined;
  company: CompanyConfiguration | null;
  snapshot: CMSContentSnapshot | null;
  canEditDomains: boolean;
  canCheckDomains: boolean;
  canEditCode: boolean;
  canEditPresentation: boolean;
}) {
  const { copy } = useCopy();
  const [tab, setTab] = React.useState<SiteTab>("domains");

  const tabs: Array<{ id: SiteTab; label: string; show: boolean }> = [
    { id: "domains", label: copy.site.tabs.domains, show: true },
    { id: "presentation", label: copy.site.tabs.presentation, show: true },
    { id: "social", label: copy.site.tabs.social, show: true },
    { id: "pages", label: copy.site.tabs.pages, show: true },
    { id: "operations", label: copy.site.tabs.operations, show: true },
    { id: "code", label: copy.site.tabs.code, show: code !== undefined },
  ];

  return (
    <div className="space-y-4">
      <PageTitle title={copy.site.title} description={copy.site.description} />

      {!canEditDomains && (
        <p className="text-xs font-mono text-ink-muted">{copy.site.readOnly}</p>
      )}

      <div className="flex flex-wrap gap-1.5 border-b border-rule pb-2">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase tracking-[0.1em] border ${
                tab === t.id
                  ? "bg-accent text-accent-ink border-accent"
                  : "bg-surface text-ink-muted border-rule hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
      </div>

      <div className="space-y-4 pb-8">
        {tab === "domains" &&
          (domains ? (
            <DomainsCard
              initial={domains}
              canEdit={canEditDomains}
              canCheck={canCheckDomains}
            />
          ) : (
            <Unavailable />
          ))}

        {tab === "presentation" &&
          (company ? (
            <PresentationCard
              initial={company}
              canEdit={canEditPresentation}
              canRevalidate={canCheckDomains}
            />
          ) : (
            <Unavailable />
          ))}

        {tab === "social" &&
          (snapshot ? (
            <SocialLinksCard snapshot={snapshot} canEdit={canEditDomains} />
          ) : (
            <Unavailable />
          ))}

        {tab === "pages" &&
          (snapshot ? (
            <PagesSeoCard snapshot={snapshot} websiteDomain={domains?.websiteDomain} />
          ) : (
            <Unavailable />
          ))}

        {tab === "operations" && (
          <SiteOperationsCard canEdit={canEditDomains || canCheckDomains || canEditPresentation} />
        )}

        {tab === "code" &&
          (code === undefined ? null : code ? (
            <CodeCard initial={code} canEdit={canEditCode} />
          ) : (
            <Unavailable />
          ))}
      </div>
    </div>
  );
}
