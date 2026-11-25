import Link from "next/link";
import { Building2, Mail, Phone, MapPin, ShieldCheck, ArrowUpRight, Newspaper } from "lucide-react";
import { listPressReleases } from "@platform/database/queries/press";
import { pickText } from "@platform/database/constants/languages";
import { cleanSentenceEnd } from "../../../lib/format-site";
import { getSite, requireSiteLanguage, siteTranslations } from "../../../lib/site";

export const dynamic = "force-dynamic";

export default async function PressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  const [t, { company, website, info }, releases] = await Promise.all([
    siteTranslations(locale),
    getSite(),
    listPressReleases(true).catch(() => []),
  ]);
  const ar = locale === "ar";
  const brand = cleanSentenceEnd(pickText(company.company_name_en, company.company_name_ar, locale));
  const articlesBase = `/${locale}/${info.articles.slug}`;
  const recentArticles = (website?.articles ?? []).slice(0, 4);
  const address = ar ? company.address_ar || company.address_en : company.address_en;

  return (
    <main className="shell page-heading space-y-12 pb-24">
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
          <Newspaper className="w-3.5 h-3.5" />
          <span>{t.press.kit}</span>
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight text-ink">
          {t.press.title}
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-ink-muted leading-relaxed">
          {t.press.subtitle}
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-8 items-start">
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-m3-outline-variant">
            <h2 className="text-2xl font-display font-bold text-ink">{t.press.releases}</h2>
            <Link href={articlesBase} className="text-xs font-semibold text-m3-primary hover:underline inline-flex items-center gap-1">
              <span>{t.nav.articles}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
            </Link>
          </div>

          {releases.length > 0 ? (
            <ul className="space-y-4">
              {releases.map((r) => (
                <li
                  key={r.id}
                  className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 space-y-3"
                >
                  <div className="text-xs font-medium text-m3-on-surface-variant">
                    {(r.publishedAt ?? r.createdAt).toLocaleDateString(ar ? "ar-BH" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <h3 className="text-xl font-display font-bold text-ink">
                    {ar ? r.titleAr || r.titleEn : r.titleEn}
                  </h3>
                  {(ar ? r.summaryAr : r.summaryEn) && (
                    <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                      {ar ? r.summaryAr || r.summaryEn : r.summaryEn}
                    </p>
                  )}
                  {(ar ? r.bodyAr : r.bodyEn) && (
                    <p className="whitespace-pre-line text-sm text-ink-muted/90 leading-relaxed">
                      {ar ? r.bodyAr || r.bodyEn : r.bodyEn}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : recentArticles.length > 0 ? (
            <ul className="space-y-4">
              {recentArticles.map((art) => (
                <li key={art.id}>
                  <Link
                    href={`${articlesBase}/${encodeURIComponent(art.slug)}`}
                    className="group block rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-2.5 hover:border-m3-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4 text-xs text-m3-on-surface-variant">
                      <span>{art.category || t.press.title}</span>
                      <span>
                        {art.publish_at
                          ? new Date(art.publish_at).toLocaleDateString(ar ? "ar-BH" : "en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-ink group-hover:text-m3-primary transition-colors">
                      {pickText(art.title_en, art.title_ar, locale)}
                    </h3>
                    <p className="text-sm text-ink-muted line-clamp-2">
                      {pickText(art.excerpt_en, art.excerpt_ar, locale)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-8 text-sm text-ink-muted">
              {t.press.noReleases}
            </div>
          )}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-28">
          <section className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-5">
            <h2 className="text-lg font-display font-bold text-ink">{t.press.kit}</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              {pickText(company.tagline_en, company.tagline_ar, locale) || t.hero.caption}
            </p>
            <dl className="space-y-3 text-sm pt-2 border-t border-m3-outline-variant/60">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                <div>
                  <dt className="text-xs text-m3-on-surface-variant">{brand}</dt>
                  {company.founded_year && (
                    <dd className="font-medium text-ink">
                      {t.about.foundedLabel}: <bdi dir="ltr">{company.founded_year}</bdi>
                    </dd>
                  )}
                </div>
              </div>
              {company.cr_number && (
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-m3-on-surface-variant">{t.about.crLabel}</dt>
                    <dd className="font-medium text-ink"><bdi dir="ltr">{company.cr_number}</bdi></dd>
                  </div>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                  <div>
                    <dt className="text-xs text-m3-on-surface-variant">{t.about.headquartersLabel}</dt>
                    <dd className="text-ink-muted leading-relaxed">{address}</dd>
                  </div>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-3 pt-2">
              {company.logo_url && (
                <a
                  href={company.logo_url}
                  download
                  className="web-button text-xs"
                >
                  {t.press.logo}
                </a>
              )}
              <Link href={`/${locale}/about`} className="web-hero-secondary text-xs">
                {t.press.about}
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-3">
            <h2 className="text-lg font-display font-bold text-ink">{t.press.contact}</h2>
            <div className="space-y-2.5 text-sm">
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-2.5 text-m3-primary hover:underline break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <bdi dir="ltr">{company.email}</bdi>
                </a>
              )}
              {company.phone && (
                <a
                  href={`tel:${company.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2.5 text-ink hover:text-m3-primary transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0 text-m3-primary" />
                  <bdi dir="ltr">{company.phone}</bdi>
                </a>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
