import { ContentImage } from "../../../../components/shared/ContentImage";
import { Reveal } from "../../../../components/shared/Reveal";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../../lib/site";
import { collectionHref, formatPrice } from "../../../../lib/site-copy";
import { publicSiteUrl } from "../../../../lib/site-url";
import { ArticleView, liveArticles } from "../../../../components/articles/ArticleViews";
import { isWebsitePreview } from "../../../../lib/website";
import { db } from "@platform/database";
import { currentCustomer, storeEnabled } from "../../../../lib/customer";
import { WishlistButton } from "../../../../components/account/WishlistButton";

/** One catalogue item: a project, product, property, dish, program… shown with the details its activity uses. */
export default async function CollectionItemPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; slug: string }>;
}) {
  const { locale, collection, slug } = await params;
  const [{ website, info }, t, preview] = await Promise.all([getSite(), siteTranslations(locale), isWebsitePreview()]);
  if (!website) notFound();
  if (collection === info.articles.slug && collection !== info.collection.slug) {
    // Scheduled articles stay hidden until their time, except in preview.
    const articles = preview ? website.articles ?? [] : liveArticles(website.articles);
    const article = articles.find((entry) => entry.slug === slug);
    if (!article) notFound();
    const base = `/${locale}/${info.articles.slug}`;
    const url = `${(await publicSiteUrl()).href.replace(/\/$/, "")}${base}/${encodeURIComponent(article.slug)}`;
    const related = liveArticles(website.articles).filter((entry) => entry.id !== article.id && entry.category === article.category).slice(0, 3);
    return <ArticleView article={article} related={related} locale={locale} base={base} url={url} />;
  }
  if (collection !== info.collection.slug) {
    if (collection === "works") permanentRedirect(collectionHref(info, locale, slug));
    notFound();
  }
  const isRTL = locale === "ar";

  const item = website.portfolio.find((project) => project.slug === slug);
  // With the online store on, items can be saved to the customer's wishlist.
  const customer = item && (await storeEnabled()) ? { signedIn: true, profile: await currentCustomer() } : null;
  const store = customer
    ? { signedIn: !!customer.profile, saved: !!customer.profile && !!(await db.wishlistItem.findUnique({ where: { customerId_catalogueItemId: { customerId: customer.profile.id, catalogueItemId: item!.id } }, select: { id: true } })) }
    : null;

  if (!item) {
    notFound();
  }

  const layout = info.collection.layout;
  const title = pickText(item.title_en, item.title_ar, locale);
  const description = pickText(item.description_en, item.description_ar, locale);
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const priceNote = pickText(item.price_note_en, item.price_note_ar, locale);
  const price = item.price !== undefined ? formatPrice(item.price, info.currency, locale) : "";
  const videoUrl = item.full_video_url || item.preview_video_url;
  const ArrowBackIcon = isRTL ? ArrowRight : ArrowLeft;
  const meta = [item.client_name, item.year, item.location].filter(Boolean);
  const credits = layout === "media" ? Object.entries(item.credits ?? {}).filter(([, value]) => value) : [];
  const creditLabels: Record<string, string> = { director: t.portfolio.director, dop: t.portfolio.dop, colorist: t.portfolio.colorist, editor: t.portfolio.editor };
  const gallery = (item.gallery_urls ?? []).filter((url) => url && url !== item.thumbnail_url);
  const enquire = `/${locale}/contact?intent=quote_request&item=${encodeURIComponent(item.slug)}`;
  const hasDetails = !!price || item.attributes.length > 0 || credits.length > 0 || !!item.external_url;

  return (
    <article className="shell page-heading space-y-10 sm:space-y-14">
      <div>
        <Link
          href={collectionHref(info, locale)}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon className="w-4 h-4" />
          <span>{t.portfolio.backToWorks}</span>
        </Link>
      </div>

      <Reveal className="space-y-4">
        {meta.length ? (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mint uppercase tracking-widest">
            {meta.map((value, index) => (
              <span key={String(value)} className="inline-flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden>•</span> : null}
                {value === item.location ? <MapPin className="h-3.5 w-3.5" /> : null}
                {value}
              </span>
            ))}
          </p>
        ) : null}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">{title}</h1>
        {subtitle ? <p className="max-w-3xl text-lg text-ink-muted">{subtitle}</p> : null}
        {store ? <WishlistButton itemId={item.id} initiallySaved={store.saved} signedIn={store.signedIn} next={`/${locale}/${collection}/${slug}`} /> : null}
      </Reveal>

      <Reveal className={`relative w-full overflow-hidden rounded-brand bg-black ${layout === "product" ? "aspect-[4/3] sm:aspect-[16/9]" : "aspect-video"}`}>
        {videoUrl ? (
          <video src={videoUrl} poster={item.thumbnail_url} controls playsInline className="w-full h-full object-cover" />
        ) : (
          <ContentImage src={item.thumbnail_url} alt={title} className={`w-full h-full ${layout === "product" ? "object-contain" : "object-cover"}`} />
        )}
      </Reveal>

      {gallery.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((url) => (
            <ContentImage key={url} src={url} alt={title} loading="lazy" width={600} height={400} className="aspect-[3/2] w-full rounded-brand object-cover" />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t border-white/10">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white font-display">{t.portfolio.productionOverview}</h2>
          {description ? <p className="text-base text-ink-muted leading-relaxed whitespace-pre-line">{description}</p> : null}
        </div>

        <aside className="space-y-4">
          {hasDetails ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-brand-surface p-6">
              {price ? (
                <p className="text-2xl font-bold text-white">
                  {price}
                  {priceNote ? <span className="ms-2 text-sm font-normal text-ink-muted">{priceNote}</span> : null}
                </p>
              ) : null}
              {item.attributes.length ? (
                <dl className="space-y-3 text-sm">
                  {item.attributes.map((fact) => (
                    <div key={fact.labelEn + fact.valueEn} className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
                      <dt className="text-ink-muted">{pickText(fact.labelEn, fact.labelAr, locale)}</dt>
                      <dd className="font-medium text-white">{pickText(fact.valueEn, fact.valueAr, locale)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {credits.length ? (
                <div className="space-y-3 text-xs">
                  <h3 className="border-b border-white/10 pb-3 text-sm font-semibold uppercase tracking-wider text-white">{t.portfolio.credits}</h3>
                  {credits.map(([role, name]) => (
                    <div key={role} className="flex justify-between gap-4">
                      <span className="text-ink-muted">{creditLabels[role] ?? role}:</span>
                      <span className="font-medium text-white">{name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {item.external_url ? (
                <a href={item.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint hover:underline">
                  {t.common.website}
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </a>
              ) : null}
            </div>
          ) : null}
          {layout !== "media" ? (
            <Link href={enquire} className="web-button w-full">
              {t.hero.ideaAction}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
