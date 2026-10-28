import Link from "next/link";
import { getTranslations } from "@platform/locales";
import { db } from "@platform/database";
import { couponProblem } from "@platform/database/constants/store";
import { promotionVisible } from "@platform/database/constants/website-promotions";
import { getSite } from "../../lib/site";
import { collectionHref, formatPrice } from "../../lib/site-copy";
import { ContentImage } from "../shared/ContentImage";

/** Promotion copy is published CMS content; coupon availability and conditions are read from the live store. */
export async function Promotions({
  locale,
  placement,
  category = "",
}: {
  locale: string;
  placement: "home" | "catalogue";
  category?: string;
}) {
  const { config, info } = await getSite();
  const promos = (config.promotions ?? []).filter((promo) =>
    promotionVisible(promo, placement, category),
  );
  if (!promos.length) return null;
  const coupons = await db.coupon.findMany({
    where: {
      code: { in: promos.map((promo) => promo.couponCode).filter(Boolean) },
    },
  });
  const ar = locale === "ar";
  const shown = promos.filter(
    (promo) =>
      !promo.couponCode ||
      coupons.some(
        (coupon) =>
          coupon.code === promo.couponCode &&
          couponProblem({ ...coupon, minOrder: null }, 0) === null,
      ),
  );
  if (!shown.length) return null;
  const t = getTranslations(locale as "en" | "ar");
  return (
    <section
      className="shell py-10 space-y-5"
      aria-label={t.store.offersAndAnnouncements}
    >
      {shown.map((promo, index) => {
        const coupon = coupons.find((c) => c.code === promo.couponCode);
        const href = promo.url || collectionHref(info, locale);
        const destination =
          /^\/(en|ar)(\/|$)/.test(href) || !href.startsWith("/")
            ? href
            : `/${locale}${href}`;
        return (
          <article
            key={index}
            className={`grid overflow-hidden rounded-brand bg-m3-secondary-container text-m3-on-secondary-container ${promo.imageUrl ? "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : ""}`}
          >
            {promo.imageUrl && (
              <ContentImage
                src={promo.imageUrl}
                alt=""
                width={800}
                height={500}
                className="h-full w-full object-cover max-h-80"
              />
            )}
            <div className="p-6 sm:p-8 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-display font-bold">
                {ar ? promo.titleAr : promo.titleEn}
              </h2>
              <p className="max-w-2xl whitespace-pre-line">
                {ar ? promo.textAr : promo.textEn}
              </p>
              {coupon && (
                <p className="text-sm font-semibold">
                  <bdi dir="ltr">{coupon.code}</bdi> ·{" "}
                  {coupon.kind === "percent"
                    ? `${Number(coupon.value)}%`
                    : formatPrice(Number(coupon.value), info.currency, locale)}
                  {coupon.minOrder
                    ? ` · ${t.store.minimumOrder}: ${formatPrice(Number(coupon.minOrder), info.currency, locale)}`
                    : ""}
                </p>
              )}
              {(ar ? promo.labelAr : promo.labelEn) && (
                <Link
                  href={destination}
                  className="inline-flex min-h-11 items-center rounded-brand border border-current px-5 py-2 font-semibold hover:bg-m3-surface/20"
                >
                  {ar ? promo.labelAr : promo.labelEn}
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
