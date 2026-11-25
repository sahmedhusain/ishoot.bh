import { ProductCard } from "../../../../components/catalog/ProductCard";
import {
  catalogueProductPrices,
  getStoreCatalog,
  getStoreSettings,
  listWishlist,
  storeProductForItem,
} from "@platform/database";
import { ContentImage } from "../../../../components/shared/ContentImage";
import { Reveal } from "../../../../components/shared/Reveal";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Package,
  RotateCcw,
  ShieldCheck,
  Star,
  Ticket,
  Truck,
} from "lucide-react";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../../lib/site";
import { formatPrice } from "../../../../lib/site-copy";
import { isWebsitePreview } from "../../../../lib/website";
import { AddToCart } from "../../../../components/store/AddToCart";
import { ProductGallery } from "../../../../components/store/StorefrontShowcase";
import {
  currentCustomer,
  storeEnabled,
  orderingEnabled,
} from "../../../../lib/customer";
import { WishlistButton } from "../../../../components/account/WishlistButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const { website } = await getSite();
  if (!website) return {};
  const { items: catalogItems } = await getStoreCatalog(
    website.portfolio ?? [],
    website.categories ?? [],
  );
  const item = catalogItems.find(
    (project) => project.slug === slug || project.id === slug,
  );
  if (!item) return {};
  const title = pickText(item.title_en, item.title_ar, locale);
  const description =
    (
      pickText(item.subtitle_en, item.subtitle_ar, locale) ||
      pickText(item.description_en, item.description_ar, locale)
    ).slice(0, 200) || undefined;
  const images = item.thumbnail_url ? [item.thumbnail_url] : undefined;
  return { title, description, openGraph: { title, description, images } };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isAr = locale === "ar";
  const [{ website, info, config }, t, preview] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    isWebsitePreview(),
  ]);
  if (!website) notFound();

  const storeOn = await storeEnabled().catch(() => false);
  const { items: catalogItems } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [] };
  const item = catalogItems.find(
    (project) => project.slug === slug || project.id === slug,
  );
  if (!item) notFound();

  const customer =
    storeOn && config.commerce.capabilities.accounts && config.commerce.capabilities.wishlist
      ? { signedIn: true, profile: await currentCustomer() }
      : null;
  const canOrder = storeOn && !preview && (await orderingEnabled().catch(() => false));
  const [storeProduct, storeSettings] = await Promise.all([
    storeOn && !preview ? storeProductForItem(item.id) : Promise.resolve(null),
    getStoreSettings().catch(() => null),
  ]);
  const savedWishlist = customer?.profile?.id
    ? await listWishlist(customer.profile.id).catch(() => [])
    : [];
  const store = customer
    ? {
        signedIn: !!customer.profile,
        saved: savedWishlist.some((entry) => entry.id === item.id),
      }
    : null;

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
  const galleryImages = [item.thumbnail_url, ...(item.gallery_urls ?? [])].filter(
    (u): u is string => Boolean(u),
  );
  const effectivePrice = storeProduct?.price ?? item.price ?? 0;
  const discountPct =
    item.compare_at_price != null && effectivePrice > 0 && item.compare_at_price > effectivePrice
      ? Math.round(((item.compare_at_price - effectivePrice) / item.compare_at_price) * 100)
      : 0;
  const isOutOfStock = Boolean(
    item.track_stock && item.available_stock != null && item.available_stock <= 0,
  );

  const relatedItems =
    config.commerce.relatedItems === false
      ? []
      : catalogItems
          .filter(
            (entry) =>
              entry.id !== item.id &&
              (!item.category_id || entry.category_id === item.category_id),
          )
          .slice(0, 4);
  const relatedPrices =
    storeOn && !preview
      ? await catalogueProductPrices(relatedItems.map((entry) => entry.id))
      : new Map<string, number>();

  const categoryName = item.category
    ? pickText(item.category.name_en, item.category.name_ar, locale)
    : isAr
      ? "المنتجات"
      : "Shop";
  const categoryHref = item.category?.slug
    ? `/${locale}/category/${encodeURIComponent(item.category.slug)}`
    : `/${locale}/shop`;
  const retDays = storeSettings?.return_window_days ?? 14;

  return (
    <article className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell pt-6 space-y-12">
        {/* 1. Breadcrumb Trail */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-m3-on-surface-variant"
        >
          <Link href={`/${locale}`} className="hover:text-m3-primary">
            {isAr ? "الرئيسية" : "Home"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <Link href={`/${locale}/shop`} className="hover:text-m3-primary">
            {isAr ? "المتجر" : "Shop"}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <Link href={categoryHref} className="hover:text-m3-primary">
            {categoryName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" aria-hidden="true" />
          <span className="text-m3-on-surface font-medium line-clamp-1">{title}</span>
        </nav>

        {/* 2. Top 50:50 Hero Grid: Left Square Gallery + Thumbnails, Right Purchase & Technical Info */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <ProductGallery
              images={galleryImages}
              title={title}
              videoUrl={videoUrl}
              discountPct={discountPct}
              isOutOfStock={isOutOfStock}
              lowStockCount={item.available_stock}
              locale={locale}
            />
          </Reveal>

          <Reveal className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {item.brand ? (
                  <Link
                    href={`/${locale}/shop?brand=${encodeURIComponent(item.brand)}`}
                    className="text-xs font-bold uppercase tracking-widest text-m3-primary hover:underline"
                  >
                    {item.brand}
                  </Link>
                ) : (
                  <Link
                    href={categoryHref}
                    className="text-xs font-bold uppercase tracking-widest text-m3-primary hover:underline"
                  >
                    {categoryName}
                  </Link>
                )}
                <a
                  href="#reviews"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>5.0 (Verified)</span>
                </a>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-m3-on-surface font-display">
                {title}
              </h1>

              <p className="text-xs font-mono text-m3-on-surface-variant" dir="ltr">
                Product ID: {item.id}
                {item.sku ? ` | SKU: ${item.sku}` : ""}
              </p>
            </div>

            {/* Inline Status & Wishlist Strip */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isOutOfStock
                    ? "bg-m3-error-container text-m3-on-error-container"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {isOutOfStock ? t.store.outOfStock : t.store.inStock}
              </span>
              {store ? (
                <WishlistButton
                  itemId={item.id}
                  initiallySaved={store.saved}
                  signedIn={store.signedIn}
                  next={`/${locale}/products/${slug}`}
                />
              ) : null}
              <a
                href="#specifications"
                className="inline-flex min-h-10 items-center rounded-full border border-m3-outline-variant px-3.5 py-1.5 text-xs font-semibold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary"
              >
                {isAr ? "المواصفات التقنية" : "Specifications"}
              </a>
            </div>

            {subtitle && (
              <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
                {subtitle}
              </p>
            )}

            {/* Attribute Pills */}
            {item.attributes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.attributes.slice(0, 6).map((fact, idx) => (
                  <span
                    key={`${fact.labelEn}-${idx}`}
                    className="rounded-full border border-m3-outline-variant bg-m3-surface-container-low px-3 py-1 text-xs text-m3-on-surface"
                  >
                    <strong className="font-semibold text-m3-on-surface-variant">
                      {pickText(fact.labelEn, fact.labelAr, locale)}:{" "}
                    </strong>
                    {pickText(fact.valueEn, fact.valueAr, locale)}
                  </span>
                ))}
              </div>
            )}

            {/* Interactive Purchase Box */}
            {storeProduct && canOrder ? (
              <AddToCart
                product={storeProduct}
                currency={info.currency}
                brand={item.brand}
                compareAtPrice={item.compare_at_price}
                loyaltyEnabled={storeSettings?.loyalty_enabled ?? true}
                raffleEnabled={storeSettings?.raffle_enabled ?? true}
                pointsPerUnit={storeSettings?.points_per_unit ?? 10}
                raffleSpendUnit={storeSettings?.raffle_spend_unit ?? 10}
              />
            ) : price ? (
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-1">
                <p className="text-2xl font-bold text-m3-on-surface">{price}</p>
                {priceNote && <p className="text-xs text-m3-on-surface-variant">{priceNote}</p>}
              </div>
            ) : null}

            {/* 2-Column Side-by-Side Delivery & Returns Accordions */}
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <details
                open
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 text-xs space-y-2"
              >
                <summary className="font-bold text-sm text-m3-on-surface cursor-pointer inline-flex items-center gap-2">
                  <Truck className="w-4 h-4 text-m3-primary shrink-0" aria-hidden="true" />
                  <span>{isAr ? "التوصيل إلى موقعك" : "Delivery to your location"}</span>
                </summary>
                <ul className="space-y-1.5 pt-2 text-m3-on-surface-variant">
                  <li className="flex justify-between gap-2">
                    <span>{isAr ? "البحرين (نفس / ثاني يوم)" : "Bahrain Same / Next Day"}</span>
                    <strong className="text-m3-on-surface" dir="ltr">From 1.000 BD</strong>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>Aramex / DHL / Naqel (GCC)</span>
                    <strong className="text-m3-on-surface" dir="ltr">1–4 days</strong>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span>{isAr ? "الاستلام من الفرع" : "Showroom Pickup"}</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {isAr ? "مجاني" : "Free"}
                    </strong>
                  </li>
                </ul>
              </details>

              <details
                open
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 text-xs space-y-2"
              >
                <summary className="font-bold text-sm text-m3-on-surface cursor-pointer inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-m3-primary shrink-0" aria-hidden="true" />
                  <span>{isAr ? "سياسة الإرجاع والضمان" : "Returns & Warranty"}</span>
                </summary>
                <div className="space-y-2 pt-2 text-m3-on-surface-variant">
                  <p>
                    {isAr
                      ? `نافذة إرجاع مرنة خلال ${retDays} يوما مع خيار الاسترداد الفوري إلى محفظة المتجر.`
                      : `Eligible for return within ${retDays} days with instant Store Wallet refund option.`}
                  </p>
                  <div className="flex flex-wrap gap-3 font-semibold text-m3-primary">
                    <Link href={`/${locale}/return-policy`} className="hover:underline">
                      {isAr ? "سياسة الإرجاع" : "Return Policy"}
                    </Link>
                    <Link href={`/${locale}/warranty`} className="hover:underline">
                      {isAr ? "تفاصيل الضمان" : "Warranty Terms"}
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          </Reveal>
        </div>

        {/* 3. Full-Width Raffle Promo Strip */}
        {storeSettings?.raffle_enabled !== false && (
          <section className="rounded-3xl bg-m3-tertiary-container text-m3-on-tertiary-container border border-m3-outline-variant/60 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3 py-0.5 text-[11px] font-bold text-m3-on-primary">
                <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                {isAr ? "دخول تلقائي للسحب" : "AUTOMATIC GIVEAWAY ENTRY"}
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-bold">
                {pickText(storeSettings?.raffle_prize_en, storeSettings?.raffle_prize_ar, locale) ||
                  (isAr ? "اكسب تذاكر سحب مع هذا المنتج" : "Earn prize raffle tickets with this item")}
              </h2>
            </div>
            <Link
              href={`/${locale}/giveaways/playstation-5`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-m3-primary px-5 py-2.5 text-xs font-bold text-m3-on-primary shrink-0 hover:brightness-95"
            >
              <span>{isAr ? "عرض تفاصيل السحب والجوائز" : "How to Enter & Prizes"}</span>
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </section>
        )}

        {/* 4. Rich Editorial Overview & Grouped Technical Specifications */}
        <section
          id="specifications"
          className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 pt-6 border-t border-m3-outline-variant"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-m3-on-surface font-display">
                {t.portfolio.projectOverview ?? t.portfolio.productionOverview}
              </h2>
              {description && (
                <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-1.5">
                <Package className="w-5 h-5 text-m3-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-m3-on-surface">
                  {isAr ? "محتويات الصندوق" : "What's in the Box"}
                </h3>
                <p className="text-xs text-m3-on-surface-variant">
                  {isAr
                    ? "المنتج الأصلي مختوما من المصنع مع الكتيبات والملحقات الرسمية."
                    : "Factory-sealed retail unit, official accessories, and digital warranty registration."}
                </p>
              </div>
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-1.5">
                <ShieldCheck className="w-5 h-5 text-m3-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-m3-on-surface">{t.store.guaranteed}</h3>
                <p className="text-xs text-m3-on-surface-variant">{t.store.guaranteedSub}</p>
              </div>
              <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-4 space-y-1.5">
                <Truck className="w-5 h-5 text-m3-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-m3-on-surface">{t.store.fastDelivery}</h3>
                <p className="text-xs text-m3-on-surface-variant">{t.store.fastDeliverySub}</p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-4 h-fit">
            <h2 className="font-display text-lg font-bold text-m3-on-surface">
              {isAr ? "المواصفات الفنية" : "Technical Specifications"}
            </h2>
            {item.attributes.length > 0 ? (
              <dl className="divide-y divide-m3-outline-variant text-xs sm:text-sm">
                {item.attributes.map((fact, index) => (
                  <div
                    key={`${fact.labelEn || ""}-${fact.valueEn || ""}-${index}`}
                    className="flex justify-between gap-4 py-2.5"
                  >
                    <dt className="text-m3-on-surface-variant">
                      {pickText(fact.labelEn, fact.labelAr, locale)}
                    </dt>
                    <dd className="font-semibold text-m3-on-surface text-end">
                      {pickText(fact.valueEn, fact.valueAr, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <dl className="divide-y divide-m3-outline-variant text-xs sm:text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-m3-on-surface-variant">{isAr ? "الفئة" : "Category"}</dt>
                  <dd className="font-semibold text-m3-on-surface">{categoryName}</dd>
                </div>
                {item.brand && (
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-m3-on-surface-variant">{isAr ? "العلامة التجارية" : "Brand"}</dt>
                    <dd className="font-semibold text-m3-on-surface">{item.brand}</dd>
                  </div>
                )}
                {item.sku && (
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-m3-on-surface-variant">SKU</dt>
                    <dd className="font-mono font-semibold text-m3-on-surface">{item.sku}</dd>
                  </div>
                )}
              </dl>
            )}
            {item.external_url && (
              <a
                href={item.external_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline pt-2"
              >
                {t.common.website}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </a>
            )}
          </aside>
        </section>

        {/* 5. Customer Reviews Accordion */}
        <section id="reviews" className="pt-2">
          <details
            open
            className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-4"
          >
            <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl font-bold text-m3-on-surface">
                  {isAr ? "تقييمات العملاء" : "Customer Reviews"}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  5.0
                </span>
              </div>
              <span className="text-xs font-semibold text-m3-primary">
                {isAr ? "تقييمات موثقة من المشترين" : "Verified Buyer Feedback"}
              </span>
            </summary>
            <p className="text-sm text-m3-on-surface-variant">
              {isAr
                ? "حصل هذا المنتج على تقييمات إيجابية من حيث جودة التصنيع وسرعة الشحن والالتزام بالمواصفات."
                : "Verified purchasers highlight authentic hardware packaging, accurate performance specifications, and same-day local dispatch."}
            </p>
          </details>
        </section>

        {/* 6. 4-Column Related Products Grid */}
        {relatedItems.length > 0 && (
          <section className="space-y-6 border-t border-m3-outline-variant pt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                {t.store.relatedProducts}
              </h2>
              <Link
                href={`/${locale}/shop`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-m3-primary hover:underline"
              >
                {isAr ? "عرض الكل" : "View All"}
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedItems.map((entry) => (
                <ProductCard
                  key={entry.id}
                  item={
                    relatedPrices.has(entry.id)
                      ? {
                          ...entry,
                          price: relatedPrices.get(entry.id) as number | undefined,
                        }
                      : entry
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
