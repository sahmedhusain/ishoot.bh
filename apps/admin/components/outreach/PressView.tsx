"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Newspaper, Plus, UserRound } from "lucide-react";
import { Button, Card, Input, Select, Textarea, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { COVERAGE_SENTIMENTS } from "@platform/database/constants/outreach";
import type { CoverageInput, CoverageRecord, MediaContactInput, MediaContactRecord, coverageSummary, listPressReleases } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { saveCoverageAction, saveMediaContactAction } from "../../app/actions/outreach";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

type Release = Awaited<ReturnType<typeof listPressReleases>>[number];
type Summary = Awaited<ReturnType<typeof coverageSummary>>;

const SENTIMENT_TONES: Record<string, string> = { positive: "text-emerald-600", neutral: "text-ink-muted", negative: "text-rose-600" };

/** PR: press releases, media contacts and the coverage log. */
export function PressView({ releases, contacts, coverage, summary, canEdit, canWriteRelease }: { releases: Release[]; contacts: MediaContactRecord[]; coverage: CoverageRecord[]; summary: Summary; canEdit: boolean; canWriteRelease: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.press;
  const router = useRouter();
  const [contact, setContact] = React.useState<MediaContactInput | null>(null);
  const [item, setItem] = React.useState<CoverageInput | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
      return true;
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const title = (r: Release) => (locale === "ar" ? r.title_ar || r.title_en : r.title_en || r.title_ar);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div data-page-header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink dark:text-ink">{copy.title}</h1>
        <p className="text-xs text-ink-muted dark:text-ink-muted mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        <p className="mt-2 text-sm font-semibold text-ink" data-testid="press-summary">{formatMessage(copy.summary, { pieces: summary.pieces, reach: summary.reach.toLocaleString("en") })}</p>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}

      <Card className="p-5 space-y-3" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><Newspaper className="w-4 h-4 text-accent" aria-hidden="true" />{copy.releases}</h2>
          {canWriteRelease && <Link href={`${ROUTES.cms.newArticle}?category=press_release`} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 h-8 text-xs font-semibold hover:border-accent"><Plus className="w-3.5 h-3.5" />{copy.newRelease}</Link>}
        </div>
        <p className="text-xs text-ink-muted">{copy.releasesHint}</p>
        {releases.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noReleases}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm">
            {releases.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <Link href={ROUTES.cms.article(r.id)} className="font-medium hover:text-accent">{title(r)}</Link>
                <span className="text-xs text-ink-muted">{(copy.statuses as Record<string, string>)[r.status] ?? r.status}</span>
                <span className="ms-auto text-xs text-ink-muted">{formatDate(r.date, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-3" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink">{copy.coverage}</h2>
          {canEdit && !item && <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setItem({ title: "", outlet: "", url: "", publishedOn: today, reach: "", sentiment: "neutral", articleId: "", notes: "" })} data-testid="coverage-new"><Plus className="w-3.5 h-3.5" />{copy.newCoverage}</Button>}
        </div>
        {item && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="coverage-form">
            <div className="sm:col-span-2"><Field label={copy.fields.title}>{(id) => <Input id={id} name="coverageTitle" maxLength={300} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} className="rounded-lg" />}</Field></div>
            <Field label={copy.fields.outlet}>{(id) => <Input id={id} name="coverageOutlet" maxLength={120} value={item.outlet} onChange={(e) => setItem({ ...item, outlet: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.fields.url}>{(id) => <Input id={id} type="url" dir="ltr" maxLength={500} value={item.url} onChange={(e) => setItem({ ...item, url: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.fields.publishedOn}>{(id) => <Input id={id} type="date" value={item.publishedOn} onChange={(e) => setItem({ ...item, publishedOn: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.fields.reach}>{(id) => <Input id={id} name="coverageReach" type="number" min={0} value={item.reach} onChange={(e) => setItem({ ...item, reach: e.target.value })} className="rounded-lg" />}</Field>
            <Field label={copy.fields.sentiment}>
              {(id) => (
                <Select id={id} name="coverageSentiment" value={item.sentiment} onChange={(e) => setItem({ ...item, sentiment: e.target.value })} className="rounded-lg">
                  {COVERAGE_SENTIMENTS.map((s) => <option key={s} value={s}>{copy.sentiments[s]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.fields.release}>
              {(id) => (
                <Select id={id} value={item.articleId ?? ""} onChange={(e) => setItem({ ...item, articleId: e.target.value })} className="rounded-lg">
                  <option value="">{copy.fields.noRelease}</option>
                  {releases.map((r) => <option key={r.id} value={r.id}>{title(r)}</option>)}
                </Select>
              )}
            </Field>
            <Field label={copy.fields.notes}>{(id) => <Input id={id} maxLength={2000} value={item.notes} onChange={(e) => setItem({ ...item, notes: e.target.value })} className="rounded-lg" />}</Field>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveCoverageAction(item))) setItem(null); }} data-testid="coverage-save">{copy.save}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setItem(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {coverage.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noCoverage}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm" data-testid="coverage-list">
            {coverage.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="text-xs text-ink-muted w-24">{formatDate(c.published_on, locale)}</span>
                <span className="font-medium">{c.title}</span>
                <span className="text-xs text-ink-muted">{c.outlet}</span>
                <span className={`text-xs font-semibold ${SENTIMENT_TONES[c.sentiment] ?? ""}`}>{(copy.sentiments as Record<string, string>)[c.sentiment]}</span>
                {c.reach != null && <span className="text-xs text-ink-muted tabular-nums">{c.reach.toLocaleString("en")}</span>}
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-ink-muted hover:text-accent" aria-label={c.title}><ExternalLink className="w-3.5 h-3.5" /></a>}
                {canEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setItem({ id: c.id, title: c.title, outlet: c.outlet, url: c.url, publishedOn: c.published_on, reach: c.reach?.toString() ?? "", sentiment: c.sentiment, articleId: c.article_id, notes: c.notes })}>{copy.edit}</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 space-y-3" data-page-section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink flex items-center gap-2"><UserRound className="w-4 h-4 text-accent" aria-hidden="true" />{copy.contacts}</h2>
          {canEdit && !contact && <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" onClick={() => setContact({ name: "", outlet: "", role: "", beat: "", email: "", phone: "", notes: "", isActive: true })} data-testid="media-contact-new"><Plus className="w-3.5 h-3.5" />{copy.newContact}</Button>}
        </div>
        {contact && (
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-outline-variant p-3" data-testid="media-contact-form">
            {(["name", "outlet", "role", "beat", "email", "phone"] as const).map((key) => (
              <Field key={key} label={copy.fields[key]}>{(id) => <Input id={id} name={`media-${key}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} dir={key === "email" || key === "phone" ? "ltr" : undefined} maxLength={120} value={contact[key]} onChange={(e) => setContact({ ...contact, [key]: e.target.value })} className="rounded-lg" />}</Field>
            ))}
            <div className="sm:col-span-3"><Field label={copy.fields.notes}>{(id) => <Textarea id={id} rows={2} maxLength={2000} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} className="rounded-lg" />}</Field></div>
            <label className="flex items-center gap-2.5 text-sm text-ink"><input type="checkbox" className="h-4 w-4 accent-accent" checked={contact.isActive} onChange={(e) => setContact({ ...contact, isActive: e.target.checked })} />{copy.fields.active}</label>
            <div className="sm:col-span-3 flex gap-2">
              <Button type="button" size="sm" variant="primary" className="rounded-full" disabled={busy} onClick={async () => { if (await run(() => saveMediaContactAction(contact))) setContact(null); }} data-testid="media-contact-save">{copy.save}</Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setContact(null)}>{copy.cancel}</Button>
            </div>
          </div>
        )}
        {contacts.length === 0 ? (
          <p className="text-sm text-ink-muted">{copy.noContacts}</p>
        ) : (
          <ul className="divide-y divide-outline-variant text-sm" data-testid="media-contacts">
            {contacts.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2 ${c.is_active ? "" : "opacity-60"}`}>
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-ink-muted">{[c.outlet, c.role, c.beat].filter(Boolean).join(" · ")}</span>
                {c.email && <a href={`mailto:${c.email}`} className="text-xs text-ink-muted hover:text-accent" dir="ltr">{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="text-xs text-ink-muted hover:text-accent" dir="ltr">{c.phone}</a>}
                {canEdit && <button type="button" className="ms-auto text-xs font-semibold text-primary dark:text-mint" onClick={() => setContact({ id: c.id, name: c.name, outlet: c.outlet, role: c.role, beat: c.beat, email: c.email, phone: c.phone, notes: c.notes, isActive: c.is_active })}>{copy.edit}</button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
