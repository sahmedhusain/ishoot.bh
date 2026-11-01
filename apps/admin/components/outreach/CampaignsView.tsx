"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, Megaphone, Plus } from "lucide-react";
import { Button, Card, Input, Select, Textarea, formatCurrencyValue, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, trackedLink } from "@platform/database/constants/outreach";
import type { CampaignInput, CampaignRow } from "@platform/database";
import { saveCampaignAction } from "../../app/actions/outreach";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";
import { PageHeader } from "../layout/PageHeader";

const blank: CampaignInput = { name: "", channel: "social", status: "planned", startDate: "", endDate: "", budget: "", spend: "", utmCampaign: "", couponCode: "", notes: "" };

/** Marketing → campaigns: budget against results (orders and requests from the campaign's links or coupon). */
export function CampaignsView({ campaigns, currency, canEdit, websiteUrl }: { campaigns: CampaignRow[]; currency: string; canEdit: boolean; websiteUrl: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.marketing.campaigns;
  const router = useRouter();
  const [draft, setDraft] = React.useState<CampaignInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const money = (value: number) => formatCurrencyValue(value, currency, locale === "ar");
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveCampaignAction(draft);
      setDraft(null);
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        actions={canEdit && !draft && (
          <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" onClick={() => setDraft(blank)} data-testid="campaign-new"><Plus className="w-4 h-4" />{copy.new}</Button>
        )}
      />
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      {draft && (
        <Card className="p-5 grid sm:grid-cols-3 gap-4" data-testid="campaign-form">
          <Field label={copy.name}>{(id) => <Input id={id} name="campaignName" maxLength={160} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.channel}>
            {(id) => (
              <Select id={id} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} className="rounded-lg">
                {CAMPAIGN_CHANNELS.map((c) => <option key={c} value={c}>{copy.channels[c]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.status}>
            {(id) => (
              <Select id={id} name="campaignStatus" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="rounded-lg">
                {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{copy.statuses[s]}</option>)}
              </Select>
            )}
          </Field>
          <Field label={copy.startDate}>{(id) => <Input id={id} type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.endDate}>{(id) => <Input id={id} type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.coupon}>{(id) => <Input id={id} name="campaignCoupon" dir="ltr" maxLength={30} value={draft.couponCode} onChange={(e) => setDraft({ ...draft, couponCode: e.target.value.toUpperCase() })} className="rounded-lg" />}</Field>
          <Field label={formatMessage(copy.budget, { currency })}>{(id) => <Input id={id} name="campaignBudget" type="number" min={0} step="any" value={draft.budget} onChange={(e) => setDraft({ ...draft, budget: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={formatMessage(copy.spend, { currency })}>{(id) => <Input id={id} name="campaignSpend" type="number" min={0} step="any" value={draft.spend} onChange={(e) => setDraft({ ...draft, spend: e.target.value })} className="rounded-lg" />}</Field>
          <Field label={copy.utm} hint={copy.utmHint}>{(id) => <Input id={id} name="campaignUtm" dir="ltr" maxLength={60} value={draft.utmCampaign} onChange={(e) => setDraft({ ...draft, utmCampaign: e.target.value.toLowerCase() })} className="rounded-lg font-mono" />}</Field>
          <div className="sm:col-span-3"><Field label={copy.notes}>{(id) => <Textarea id={id} rows={2} maxLength={5000} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="rounded-lg" />}</Field></div>
          <div className="sm:col-span-3 flex gap-2">
            <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy || !draft.name.trim()} onClick={() => void save()} data-testid="campaign-save">{copy.save}</Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>{copy.cancel}</Button>
          </div>
        </Card>
      )}
      {campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Megaphone className="w-8 h-8 text-ink-muted" aria-hidden="true" />
          <p className="text-sm text-ink-muted">{copy.empty}</p>
        </Card>
      ) : (
        <ul className="space-y-3" data-testid="campaigns-list">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Card className="p-4 space-y-3" data-testid={`campaign-${c.utm_campaign}`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span className="text-xs text-ink-muted">{(copy.channels as Record<string, string>)[c.channel]}</span>
                  <span className="text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[c.status]}</span>
                  {(c.start_date || c.end_date) && <span className="text-xs text-ink-muted">{[c.start_date, c.end_date].filter(Boolean).map((d) => formatDate(d!, locale)).join(" – ")}</span>}
                  {canEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setDraft({ id: c.id, name: c.name, channel: c.channel, status: c.status, startDate: c.start_date ?? "", endDate: c.end_date ?? "", budget: String(c.budget), spend: String(c.spend), utmCampaign: c.utm_campaign, couponCode: c.coupon_code, notes: c.notes })}>{copy.edit}</button>}
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm" data-testid="campaign-results">
                  <div><dt className="text-xs text-ink-muted">{formatMessage(copy.budget, { currency })}</dt><dd className="font-semibold">{money(c.budget)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">{formatMessage(copy.spend, { currency })}</dt><dd className="font-semibold">{money(c.spend)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">{copy.revenue}</dt><dd className="font-semibold">{money(c.revenue)}</dd></div>
                  <div><dt className="text-xs text-ink-muted">{formatMessage(copy.orders, { count: c.orders })}</dt><dd className="text-xs text-ink-muted">{formatMessage(copy.requests, { count: c.requests })}</dd></div>
                  <div>{c.return_on_spend != null && <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{formatMessage(copy.returnOnSpend, { value: c.return_on_spend })}</span>}</div>
                </dl>
                {websiteUrl && <LinkBuilder websiteUrl={websiteUrl} campaign={c.utm_campaign} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Makes a website link that carries the campaign, for posts, ads and messages. */
function LinkBuilder({ websiteUrl, campaign }: { websiteUrl: string; campaign: string }) {
  const { t, locale } = useAdminLocale();
  const copy = t.marketing.campaigns;
  const [page, setPage] = React.useState(`/${locale}`);
  const [source, setSource] = React.useState("");
  const [medium, setMedium] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  let link = "";
  try {
    link = trackedLink(`${websiteUrl}${page.startsWith("/") ? page : `/${page}`}`, { campaign, source: source.trim().toLowerCase(), medium: medium.trim().toLowerCase() });
  } catch {
    link = "";
  }
  return (
    <details className="rounded-xl bg-ink/[0.03] p-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-ink inline-flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" aria-hidden="true" />{copy.linkBuilder}</summary>
      <div className="mt-3 grid sm:grid-cols-3 gap-2">
        <Input aria-label={copy.linkPage} dir="ltr" value={page} onChange={(e) => setPage(e.target.value)} className="h-9 rounded-lg" />
        <Input aria-label={copy.linkSource} placeholder={copy.linkSource} dir="ltr" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-lg" />
        <Input aria-label={copy.linkMedium} placeholder={copy.linkMedium} dir="ltr" value={medium} onChange={(e) => setMedium(e.target.value)} className="h-9 rounded-lg" />
      </div>
      {link && (
        <div className="mt-2 flex gap-2">
          <Input readOnly aria-label={copy.linkBuilder} value={link} dir="ltr" className="h-9 rounded-lg font-mono text-xs" onFocus={(e) => e.currentTarget.select()} data-testid="tracked-link" />
          <Button type="button" size="sm" variant="outline" className="rounded-full shrink-0 gap-1.5" onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}><Copy className="w-3.5 h-3.5" />{copied ? copy.copied : copy.copy}</Button>
        </div>
      )}
    </details>
  );
}
