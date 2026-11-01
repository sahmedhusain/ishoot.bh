"use client";

import Link from "next/link";
import { CalendarClock, FileText, Plus, Search, Star } from "lucide-react";
import { Select, Card } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { CmsArticleRecord } from "@platform/database/queries/cms-articles";
import type { WebsiteSnapshotSection } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { UnpublishedChangesNotice } from "./UnpublishedChangesNotice";
import { PageHeader } from "../layout/PageHeader";

/** Website → Articles: news, updates, posts and press releases with their status and date. */
export function ArticlesListView({
  articles,
  total,
  page,
  pageSize,
  filters,
  canCreate,
  canPublish,
  publication,
}: {
  articles: CmsArticleRecord[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: string; category: string };
  canCreate: boolean;
  canPublish: boolean;
  publication: { isPublished: boolean; changedSections: WebsiteSnapshotSection[] };
}) {
  const { t, locale } = useAdminLocale();
  const copy = t.cmsArticles;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => `${ROUTES.cms.articles}?${new URLSearchParams({ ...filters, page: String(next) })}`;
  const date = (value: string | null) => (value ? new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—");
  const scheduled = (article: CmsArticleRecord) => article.status === "published" && !!article.publish_at && Date.parse(article.publish_at) > Date.now();
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <UnpublishedChangesNotice section="articles" status={publication} canPublish={canPublish} />
      <PageHeader
        actions={canCreate && (
          <Link href={ROUTES.cms.newArticle} className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5" />
            {copy.newArticle}
          </Link>
        )}
      />
      <form method="get" action={ROUTES.cms.articles} role="search" className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ink-muted absolute start-3 top-1/2 -translate-y-1/2" />
          <input type="search" name="q" defaultValue={filters.q} aria-label={t.actions.search} placeholder={t.actions.search} className="w-full ps-9 pe-3 h-9 rounded-full border border-outline-variant bg-surface text-sm" />
        </label>
        <Select name="status" defaultValue={filters.status} aria-label={copy.status} className="h-9 px-3 rounded-full border border-outline-variant bg-surface text-sm">
          <option value="all">{copy.allStatuses}</option>
          <option value="draft">{copy.statuses.draft}</option>
          <option value="published">{copy.statuses.published}</option>
        </Select>
        <Select name="category" defaultValue={filters.category} aria-label={copy.category} className="h-9 px-3 rounded-full border border-outline-variant bg-surface text-sm">
          <option value="all">{copy.allCategories}</option>
          {Object.entries(copy.categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <button type="submit" className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold">{t.actions.search}</button>
      </form>
      {articles.length === 0 ? (
        <Card className="p-10 text-center text-sm text-ink-muted">{copy.empty}</Card>
      ) : (
        <ul className="space-y-2">
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={ROUTES.cms.article(article.id)} className="block">
                <Card className="p-4 flex flex-wrap items-center gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none">
                  <FileText className="w-4 h-4 text-accent" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold text-sm text-ink flex items-center gap-1.5">
                      {article.featured && <Star className="w-3.5 h-3.5 text-amber-500" aria-label={copy.featured} />}
                      {locale === "ar" ? article.title_ar : article.title_en}
                    </p>
                    <p className="text-[11px] text-ink-muted">{(copy.categories as Record<string, string>)[article.category] ?? article.category} · {date(article.publish_at)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${scheduled(article) ? "bg-sky-500/10 text-sky-700 dark:text-sky-300" : article.status === "published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-ink/5 text-ink-muted"}`}>
                    {scheduled(article) && <CalendarClock className="w-3 h-3" />}
                    {scheduled(article) ? copy.statuses.scheduled : copy.statuses[article.status]}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav aria-label={t.usersBulk.pages} className="flex items-center justify-between text-xs">
          {page > 1 ? <Link href={href(page - 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.previous}</Link> : <span />}
          <span className="text-ink-muted">{formatMessage(t.usersBulk.pageOf, { page, pages })}</span>
          {page < pages ? <Link href={href(page + 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.next}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
