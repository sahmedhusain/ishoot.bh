import Link from "next/link";
import { Gift, ShieldCheck, Wallet } from "lucide-react";
import { GIFT_CARD_DENOMINATIONS } from "@platform/database/constants/store";
import { getStoreCatalog, getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { storeEnabled } from "../../../lib/customer";
import { getSite } from "../../../lib/site";
import { formatPrice } from "../../../lib/site-copy";
import { ProductGrid } from "../../../components/store/ProductGrid";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [{ company }] = await Promise.all([getSite()]);
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "بطاقات الهدايا" : "Gift Cards & Vouchers";
  return {
    title: companyName ? `${label} — ${companyName}` : label,
  };
}

export default async function GiftCardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ website, info }, storeOn, settings] = await Promise.all([
    getSite(),
    storeEnabled().catch(() => false),
    getStoreSettings().catch(() => null),
  ]);
  if (!website) return null;

  const { items: catalogueItems, categories } = storeOn
    ? await getStoreCatalog(website.portfolio ?? [], website.categories ?? [])
    : { items: website.portfolio ?? [], categories: website.categories ?? [] };

  const giftItems = catalogueItems.filter(
    (item) =>
      item.category?.slug === "gift-cards" ||
      /gift\s*card|voucher/i.test(`${item.title_en} ${item.title_ar}`),
  );

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6">
        <div className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-10 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary/10 px-3.5 py-1 text-xs font-semibold text-m3-primary">
              <Gift className="w-3.5 h-3.5" aria-hidden="true" />
              {isAr ? "قسائم هدايا رقمية فورية" : "Digital Store Vouchers"}
            </span>
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface">
              {isAr ? "بطاقات الهدايا ورصيد المحفظة" : "Gift Cards & Wallet Credit"}
            </h1>
            <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
              {isAr
                ? "استرد رمز بطاقة الهدية مباشرة في محفظة حسابك واستخدم الرصيد في أي عملية شراء أو دمج مع طرق الدفع الأخرى."
                : "Redeem gift voucher codes directly into your Store Wallet balance and pay partially or in full across any order."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3" data-testid="gift-card-tiers">
            {GIFT_CARD_DENOMINATIONS.map((amount) => (
              <div
                key={amount}
                className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container p-4 flex flex-col justify-between gap-3"
              >
                <span className="text-xs font-semibold text-m3-on-surface-variant">
                  {isAr ? "بطاقة هدية رقمية" : "E-Gift Card"}
                </span>
                <span className="font-display text-xl font-bold text-m3-on-surface">
                  {formatPrice(amount, info.currency, locale)}
                </span>
                <Link
                  href={`/${locale}/account#account-wallet`}
                  className="inline-flex min-h-10 items-center justify-center rounded-full bg-m3-primary px-3 py-1.5 text-xs font-semibold text-m3-on-primary hover:brightness-95"
                >
                  {isAr ? "استرداد في الحساب" : "Redeem Code"}
                </Link>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface p-4 flex items-start gap-3">
              <Wallet className="w-5 h-5 text-m3-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-m3-on-surface">
                  {isAr ? "شحن فوري للمحفظة" : "Instant Store Wallet Top-Up"}
                </p>
                <p className="text-m3-on-surface-variant">
                  {isAr
                    ? "يتم تفعيل الرصيد فورا بمجرد إدخال الكود في صفحة المحفظة بحسابك."
                    : "Voucher balances credit immediately upon redemption inside your Account Wallet."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-m3-outline-variant bg-m3-surface p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-m3-primary shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p className="font-semibold text-m3-on-surface">
                  {isAr ? "تحويل نقاط الولاء" : "Convert Loyalty Points Too"}
                </p>
                <p className="text-m3-on-surface-variant">
                  {isAr
                    ? `كل ${settings?.points_redemption_rate ?? 500} نقطة ولاء تعادل 1.000 ${info.currency} رصيد محفظة.`
                    : `Every ${settings?.points_redemption_rate ?? 500} loyalty points convert to 1.000 ${info.currency} in wallet credit.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {giftItems.length > 0 && (
        <div className="shell">
          <ProductGrid items={giftItems} categories={categories} />
        </div>
      )}
    </div>
  );
}
