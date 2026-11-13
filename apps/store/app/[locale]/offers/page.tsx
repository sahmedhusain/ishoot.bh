import { Tag } from "lucide-react";
import { listCoupons } from "@platform/database/queries/store";
import { promotionVisible } from "@platform/database/constants/website-promotions";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../../lib/site";
import { formatPrice } from "../../../lib/site-copy";

export default async function OffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ config, info }, t, coupons] = await Promise.all([
    getSite(),
    siteTranslations(locale),
    listCoupons().catch(() => []),
  ]);

  const promos = (config.promotions ?? []).filter(
    (promo) => promotionVisible(promo, "home", "") || promotionVisible(promo, "catalogue", ""),
  );
  const liveCoupons = coupons.filter((c) => c.is_active);

  return (
    <section className="shell page-heading space-y-10 pb-20">
      <header className="space-y-2 border-b border-m3-outline-variant pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {t.store.offersAndAnnouncements}
        </p>
        <h1 className="text-4xl font-display font-bold text-ink">
          {t.store.offersTitle}
        </h1>
        <p className="max-w-2xl text-base text-ink-muted">
          {t.store.offersSubtitle}
        </p>
      </header>

      {promos.length === 0 && liveCoupons.length === 0 ? (
        <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-10 text-center text-ink-muted">
          {t.store.noOffers}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 stagger-children">
          {promos.map((promo, index) => (
            <article
              key={index}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-6 shadow-elevation-1"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-m3-primary-container px-3 py-1 text-xs font-semibold text-m3-on-primary-container">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{t.store.offersAndAnnouncements}</span>
                </div>
                <h2 className="text-xl font-bold text-ink">
                  {pickText(promo.titleEn, promo.titleAr, locale)}
                </h2>
                {(promo.textEn || promo.textAr) && (
                  <p className="text-sm text-ink-muted">
                    {pickText(promo.textEn, promo.textAr, locale)}
                  </p>
                )}
              </div>
              {promo.couponCode && (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-m3-outline bg-m3-surface-container-high px-4 py-3">
                  <span className="text-xs font-medium text-ink-muted">
                    {t.store.coupon}
                  </span>
                  <bdi className="font-mono text-sm font-bold tracking-wider text-accent">
                    {promo.couponCode}
                  </bdi>
                </div>
              )}
            </article>
          ))}

          {liveCoupons.map((coupon) => (
            <article
              key={coupon.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-6"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-m3-secondary-container px-3 py-1 text-xs font-semibold text-m3-on-secondary-container">
                  <Tag className="h-3.5 w-3.5" />
                  <bdi className="font-mono">{coupon.code}</bdi>
                </div>
                <h2 className="text-xl font-bold text-ink">
                  {coupon.kind === "percent"
                    ? `${coupon.value}%`
                    : formatPrice(coupon.value, info.currency, locale)}
                </h2>
                {coupon.min_order != null && (
                  <p className="text-xs text-ink-muted">
                    {formatPrice(coupon.min_order, info.currency, locale)}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
