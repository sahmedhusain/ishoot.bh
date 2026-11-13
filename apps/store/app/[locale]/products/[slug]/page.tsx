import { ProductCard } from "../../../../components/catalog/ProductCard";
import { catalogueProductPrices, storeProductForItem } from "@platform/database/queries/store";
import { ContentImage } from "../../../../components/shared/ContentImage";
import { Reveal } from "../../../../components/shared/Reveal";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../../lib/site";
import { formatPrice, collectionGridClass } from "../../../../lib/site-copy";
import { isWebsitePreview } from "../../../../lib/website";
import { AddToCart } from "../../../../components/store/AddToCart";
import { currentCustomer, storeEnabled, orderingEnabled } from "../../../../lib/customer";
import { WishlistButton } from "../../../../components/account/WishlistButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { website } = await getSite();
  if (!website) return {};
  const item = website.portfolio.find((project) => project.slug === slug);
  if (!item) return {};
  const title = pickText(item.title_en, item.title_ar, locale);
  const description =
    (pickText(item.subtitle_en, item.subtitle_ar, locale) ||
      pickText(item.description_en, item.description_ar, locale)).slice(0, 200) || undefined;
  const images = item.thumbnail_url ? [item.thumbnail_url] : undefined;
  return { title, description, openGraph: { title, description, images } };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [{ website, info, config }, t, preview] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    isWebsitePreview(),
  ]);
  if (!website) notFound();

  const isRTL = locale === "ar";
  const item = website.portfolio.find((project) => project.slug === slug);
  if (!item) notFound();

  const storeOn = await storeEnabled().catch(() => false);
  const customer =
    storeOn && config.commerce.capabilities.accounts && config.commerce.capabilities.wishlist
      ? { signedIn: true, profile: await currentCustomer() }
      : null;
  const canOrder = storeOn && !preview && (await orderingEnabled().catch(() => false));
  const storeProduct = storeOn && !preview ? await storeProductForItem(item.id) : null;
  const store = customer ? { signedIn: !!customer.profile, saved: false } : null;

  const layout = info.collection.layout;
  const title = pickText(item.title_en, item.title_ar, locale);
  const description = pickText(item.description_en, item.description_ar, locale);
  const subtitle = pickText(item.subtitle_en, item.subtitle_ar, locale);
  const priceNote = pickText(item.price_note_en, item.price_note_ar, locale);
  const price =
    storeProduct && !canOrder
      ? formatPrice(storeProduct.price, info.currency, locale)
      : !storeProduct && item.price !== undefined
        ? formatPrice(item.price, info.currency, locale)
        : "";
  const videoUrl = item.full_video_url || item.preview_video_url;
  const ArrowBackIcon = isRTL ? ArrowRight : ArrowLeft;
  const meta = [item.client_name, item.year, item.location].filter(Boolean);
  const gallery = (item.gallery_urls ?? []).filter((url) => url && url !== item.thumbnail_url);
  const hasDetails = !!price || item.attributes.length > 0 || !!item.external_url;

  const relatedItems =
    config.commerce.relatedItems === false
      ? []
      : website.portfolio
          .filter((entry) => entry.id !== item.id && (!item.category_id || entry.category_id === item.category_id))
          .slice(0, 3);
  const relatedPrices =
    storeOn && !preview
      ? await catalogueProductPrices(relatedItems.map((entry) => entry.id))
      : new Map<string, number>();

  const overview = (
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
      <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink font-display">{title}</h1>
      {subtitle ? <p className="max-w-3xl text-lg text-ink-muted">{subtitle}</p> : null}
      {storeProduct && canOrder ? <AddToCart product={storeProduct} currency={info.currency} /> : null}
      {store ? (
        <WishlistButton
          itemId={item.id}
          initiallySaved={store.saved}
          signedIn={store.signedIn}
          next={`/${locale}/products/${slug}`}
        />
      ) : null}
    </Reveal>
  );

  const media = (
    <Reveal className="relative w-full overflow-hidden rounded-brand bg-m3-surface-container aspect-square">
      {videoUrl ? (
        <video src={videoUrl} poster={item.thumbnail_url} controls playsInline className="w-full h-full object-cover" />
      ) : (
        <ContentImage src={item.thumbnail_url} alt={title} className="w-full h-full object-contain" />
      )}
    </Reveal>
  );

  return (
    <article className="shell page-heading space-y-10 sm:space-y-14 pb-20">
      <div>
        <Link
          href={`/${locale}/products`}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-accent transition-colors"
        >
          <ArrowBackIcon className="w-4 h-4" />
          <span>{t.portfolio.backToWorks}</span>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        {media}
        {overview}
      </div>

      {gallery.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((url) => (
            <ContentImage
              key={url}
              src={url}
              alt={title}
              loading="lazy"
              width={600}
              height={400}
              className="aspect-[3/2] w-full rounded-brand object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-8 border-t border-m3-outline-variant">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-ink font-display">
            {t.portfolio.projectOverview ?? t.portfolio.productionOverview}
          </h2>
          {description ? (
            <p className="text-base text-ink-muted leading-relaxed whitespace-pre-line">{description}</p>
          ) : null}
        </div>

        <aside className="space-y-4">
          {hasDetails ? (
            <div className="space-y-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6">
              {price ? (
                <p className="text-2xl font-bold text-ink">
                  {price}
                  {priceNote ? <span className="ms-2 text-sm font-normal text-ink-muted">{priceNote}</span> : null}
                </p>
              ) : null}
              {item.attributes.length ? (
                <dl className="space-y-3 text-sm">
                  {item.attributes.map((fact, index) => (
                    <div
                      key={`${fact.labelEn || ""}-${fact.valueEn || ""}-${index}`}
                      className="flex justify-between gap-4 border-b border-m3-outline-variant pb-2 last:border-0"
                    >
                      <dt className="text-ink-muted">{pickText(fact.labelEn, fact.labelAr, locale)}</dt>
                      <dd className="font-medium text-ink">{pickText(fact.valueEn, fact.valueAr, locale)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {item.external_url ? (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-mint hover:underline"
                >
                  {t.common.website}
                  <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>

      {relatedItems.length > 0 && (
        <section className="space-y-6 border-t border-m3-outline-variant pt-10">
          <h2 className="text-2xl font-display font-bold">{t.store.relatedProducts}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedItems.map((entry) => (
              <ProductCard
                key={entry.id}
                item={
                  relatedPrices.has(entry.id)
                    ? { ...entry, price: relatedPrices.get(entry.id) as number | undefined }
                    : entry
                }
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
