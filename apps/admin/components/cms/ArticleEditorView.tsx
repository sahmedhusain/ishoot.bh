"use client";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useConfirmation } from "@platform/ui";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Loader2, Save, Send, Trash2 } from "lucide-react";
import { Select, Button, Card, Input } from "@platform/ui";
import type { CmsArticleRecord } from "@platform/database/queries/cms-articles";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { deleteCmsArticleAction, saveCmsArticleAction } from "../../app/actions/cms-articles";
import { previewWebsiteAction } from "../../app/actions/website";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { AssetUrlInput } from "../shared/AssetUrlInput";
import { Field, LanguageFields } from "../setup/LanguageFields";
import { RichTextEditor } from "./RichTextEditor";

/** Local date-time for <input type="datetime-local"> from an ISO time, and back. */
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : "");

/** The article editor: title, address, category, cover, excerpt, body (per content language), schedule and SEO. */
export function ArticleEditorView({ article, languages, canPublish, canDelete, articlesSlug }: { article: CmsArticleRecord; languages: readonly ContentLanguage[]; canPublish: boolean; canDelete: boolean; articlesSlug: string }) {
  const confirmAction = useConfirmation();
  const { t, locale } = useAdminLocale();
  const copy = t.cmsArticles;
  const router = useRouter();
  const [draft, setDraft] = React.useState(article);
  const [tags, setTags] = React.useState(article.tags.join(", "));
  const markSaved = useUnsavedChanges({ draft, tags });
  const [busy, setBusy] = React.useState<"save" | "publish" | null>(null);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const set = <K extends keyof CmsArticleRecord>(key: K, value: CmsArticleRecord[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async (publish: boolean) => {
    setBusy(publish ? "publish" : "save");
    setMessage(null);
    try {
      const result = await saveCmsArticleAction({
        id: draft.id || undefined,
        slug: draft.slug,
        title_en: draft.title_en,
        title_ar: draft.title_ar,
        excerpt_en: draft.excerpt_en,
        excerpt_ar: draft.excerpt_ar,
        body_en: draft.body_en,
        body_ar: languages.length === 1 ? draft.body_en ?? draft.body_ar : draft.body_ar,
        cover_url: draft.cover_url,
        category: draft.category,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        author_name: draft.author_name,
        status: publish ? "published" : draft.status === "published" && canPublish ? "published" : "draft",
        publish_at: draft.publish_at ?? "",
        featured: draft.featured,
        seo_title_en: draft.seo_title_en,
        seo_title_ar: draft.seo_title_ar,
        seo_description_en: draft.seo_description_en,
        seo_description_ar: draft.seo_description_ar,
      });
      if (!markSaved({ draft: result.article, tags })) return;
      setMessage({ tone: "ok", text: result.published ? copy.savedPublished : copy.saved });
      if (!draft.id) return router.replace(ROUTES.cms.article(result.article.id));
      setDraft(result.article);
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setBusy(null);
    }
  };

  const preview = async () => {
    try {
      window.open(await previewWebsiteAction(locale, `/${locale}/${articlesSlug}/${draft.slug}`), "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    }
  };

  const remove = async () => {
    return confirmAction({
      description: copy.deleteConfirm,
      onConfirm: async () => {
        await deleteCmsArticleAction(draft.id);
        if (!markSaved()) return;
        router.replace(ROUTES.cms.articles);
      },
    });
  };

  return (
    <div inert={!!busy} aria-busy={!!busy} className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={ROUTES.cms.articles} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {copy.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          {draft.id && canDelete && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full gap-1.5 text-rose-600" onClick={remove}>
              <Trash2 className="w-3.5 h-3.5" />
              {copy.delete}
            </Button>
          )}
          {draft.id && (
            <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" onClick={preview}>
              <Eye className="w-3.5 h-3.5" />
              {t.cmsPages.preview}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="rounded-full gap-1.5" disabled={!!busy} onClick={() => save(false)}>
            {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {draft.status === "published" ? copy.saveChanges : copy.saveDraft}
          </Button>
          {canPublish && draft.status !== "published" && (
            <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={!!busy} onClick={() => save(true)}>
              {busy === "publish" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {copy.publish}
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>
      )}

      <Card className="p-5 grid sm:grid-cols-2 gap-4">
        <LanguageFields label={copy.fields.title} languages={languages} required maxLength={200} en={draft.title_en} ar={draft.title_ar} onChange={({ en, ar }) => setDraft({ ...draft, title_en: en, title_ar: ar })} />
        <Field label={copy.fields.slug} hint={copy.hints.slug}>
          {(id) => <Input id={id} dir="ltr" value={draft.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} className="rounded-lg" />}
        </Field>
        <Field label={copy.category}>
          {(id) => (
            <Select id={id} value={draft.category} onChange={(e) => set("category", e.target.value)} className="w-full h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm">
              {Object.entries(copy.categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          )}
        </Field>
        <Field label={copy.fields.tags} hint={copy.hints.tags}>
          {(id) => <Input id={id} value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-lg" />}
        </Field>
        <Field label={copy.fields.author}>
          {(id) => <Input id={id} value={draft.author_name} onChange={(e) => set("author_name", e.target.value)} className="rounded-lg" />}
        </Field>
        <Field label={copy.fields.publishAt} hint={copy.hints.publishAt}>
          {(id) => <Input id={id} type="datetime-local" value={toLocal(draft.publish_at)} onChange={(e) => set("publish_at", fromLocal(e.target.value) || null)} className="rounded-lg" />}
        </Field>
        <Field label={copy.fields.cover} wide>
          {(id) => <AssetUrlInput id={id} resource="articles" value={draft.cover_url} onChange={(url) => set("cover_url", url)} />}
        </Field>
        <LanguageFields label={copy.fields.excerpt} languages={languages} multiline maxLength={600} en={draft.excerpt_en} ar={draft.excerpt_ar} onChange={({ en, ar }) => setDraft({ ...draft, excerpt_en: en, excerpt_ar: ar })} />
        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} />
          {copy.featured}
        </label>
      </Card>

      <div className="space-y-4">
        {languages.map((language) => (
          <RichTextEditor
            key={language}
            label={languages.length > 1 ? `${copy.fields.body} (${language === "en" ? t.websiteEditor.inEnglish : t.websiteEditor.inArabic})` : copy.fields.body}
            dir={language === "ar" ? "rtl" : "ltr"}
            value={language === "en" ? draft.body_en : draft.body_ar}
            onChange={(doc) => setDraft((current) => (languages.length === 1 ? { ...current, body_en: doc, body_ar: doc } : { ...current, [language === "en" ? "body_en" : "body_ar"]: doc }))}
            imageResource="articles"
          />
        ))}
      </div>

      <Card className="p-5 grid sm:grid-cols-2 gap-4">
        <LanguageFields label={copy.fields.seoTitle} languages={languages} maxLength={200} en={draft.seo_title_en} ar={draft.seo_title_ar} onChange={({ en, ar }) => setDraft({ ...draft, seo_title_en: en, seo_title_ar: ar })} />
        <LanguageFields label={copy.fields.seoDescription} languages={languages} multiline maxLength={400} en={draft.seo_description_en} ar={draft.seo_description_ar} onChange={({ en, ar }) => setDraft({ ...draft, seo_description_en: en, seo_description_ar: ar })} />
      </Card>
    </div>
  );
}
