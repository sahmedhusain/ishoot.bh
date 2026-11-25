import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { currentCustomer, storeEnabled } from "../../../lib/customer";
import { getStoreCatalog, listWishlist } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../lib/site";
import { ProductCard } from "../../../components/catalog/ProductCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }, t] = await Promise.all([getSite(), siteTranslations(locale)]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  return {
    title: companyName ? `${t.account.wishlist} — ${companyName}` : t.account.wishlist,
  };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website }, t, storeOn, customer] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    storeEnabled().catch(() => false),
    currentCustomer().catch(() => null),
  ]);
  if (!website) return null;

  const [{ items: catalogueItems }, saved] = await Promise.all([
    storeOn
      ? getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
      : Promise.resolve({ items: website.portfolio ?? [] }),
    customer?.id ? listWishlist(customer.id).catch(() => []) : Promise.resolve([]),
  ]);

  const savedIds = new Set(saved.map((s) => s.id));
  const savedItems = catalogueItems.filter((item) => savedIds.has(item.id));
  const displayItems = savedItems.length > 0 ? savedItems : catalogueItems.slice(0, 8);

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-secondary-container px-3.5 py-1 text-xs font-semibold text-m3-on-secondary-container">
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              {t.account.wishlist}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
              {t.account.sections.wishlist}
            </h1>
            <p className="text-sm sm:text-base text-m3-on-surface-variant">
              {customer
                ? isAr
                  ? "اعرض المنتجات المحفوظة في حسابك وأضفها للسلة بضغطة واحدة."
                  : "Review your saved items and move favorites directly to your shopping cart."
                : isAr
                  ? "سجل الدخول لمزامنة المفضلة عبر جميع أجهزتك أو اضغط على رمز القلب لحفظ أي منتج محلياً."
                  : "Sign in to sync saved items across devices, or tap the heart icon on any product card."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href={`/${locale}/${customer ? "account/wishlist" : "login"}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-m3-primary px-5 py-2.5 text-xs font-bold text-m3-on-primary hover:brightness-95"
            >
              {customer ? t.nav.account : t.account.signIn}
            </Link>
            <Link
              href={`/${locale}/shop`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-m3-outline-variant bg-m3-surface px-5 py-2.5 text-xs font-semibold hover:border-m3-primary"
            >
              <ShoppingBag className="w-4 h-4 text-m3-primary" aria-hidden="true" />
              {isAr ? "تصفح المتجر" : "Browse Shop"}
            </Link>
          </div>
        </div>
      </header>

      <div className="shell space-y-4">
        <h2 className="font-display text-xl font-bold text-m3-on-surface">
          {savedItems.length > 0
            ? isAr ? "منتجاتك المحفوظة" : "Your Saved Items"
            : isAr ? "مقترحات قد تعجبك" : "Popular Storefront Picks"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayItems.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
