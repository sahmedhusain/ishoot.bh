import Link from "next/link";
import { Award, Gift, Sparkles, Ticket, Wallet } from "lucide-react";
import { getStoreSettings } from "@platform/database";
import { pickText } from "@platform/database/constants/languages";
import { getSite } from "../../../lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { company } = await getSite();
  const companyName = pickText(company?.company_name_en, company?.company_name_ar, locale);
  const label = locale === "ar" ? "نقاط الولاء والمكافآت" : "Loyalty Points, Wallet & VIP Rewards";
  return { title: companyName ? `${label} — ${companyName}` : label };
}

export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const [{ info }, settings] = await Promise.all([
    getSite(),
    getStoreSettings().catch(() => null),
  ]);

  const pointsPerUnit = settings?.points_per_unit ?? 10;
  const redeemRate = settings?.points_redemption_rate ?? 500;
  const minRedeem = settings?.min_redeem_points ?? 1000;

  return (
    <div className="bg-m3-surface text-m3-on-surface space-y-10 pb-20">
      <header className="shell pt-6 space-y-6">
        <div className="rounded-3xl bg-m3-primary-container text-m3-on-primary-container border border-m3-outline-variant/60 p-6 sm:p-10 space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            {isAr ? "برنامج الولاء والمحفظة" : "LOYALTY POINTS & STORE WALLET"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight">
            {isAr ? "اكسب نقاطاً وحوّلها لرصيد فوري" : "Earn Loyalty Points on Every Order"}
          </h1>
          <p className="text-sm sm:text-base opacity-85 max-w-2xl">
            {isAr
              ? `اكسب ${pointsPerUnit} نقاط مقابل كل 1 ${info.currency} واستبدل كل ${redeemRate} نقطة بـ 1 ${info.currency} مباشرة في محفظتك أو عند الدفع.`
              : `Earn ${pointsPerUnit} points per 1 ${info.currency} spent and convert ${redeemRate} points = 1 ${info.currency} directly into Store Wallet credit or instant checkout savings.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/${locale}/account`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary hover:brightness-95"
            >
              <Wallet className="w-4 h-4" aria-hidden="true" />
              {isAr ? "إدارة نقاطي ومحفظتي" : "Open My Wallet & Points"}
            </Link>
            <Link
              href={`/${locale}/gift-cards`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-m3-outline bg-m3-surface px-5 py-3 text-sm font-semibold text-m3-on-surface hover:border-m3-primary"
            >
              <Gift className="w-4 h-4 text-m3-primary" aria-hidden="true" />
              {isAr ? "استرداد بطاقة هدية" : "Redeem Gift Card"}
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { tier: "Standard", rate: "0%", pts: `0–999 ${isAr ? "نقطة" : "pts"}`, icon: Sparkles },
            { tier: "Silver", rate: "3%", pts: `1,000+ ${isAr ? "نقطة" : "pts"}`, icon: Award },
            { tier: "Gold", rate: "5%", pts: `5,000+ ${isAr ? "نقطة" : "pts"}`, icon: TrophyIcon },
            { tier: "Platinum VIP", rate: "10%", pts: `15,000+ ${isAr ? "نقطة" : "pts"}`, icon: Ticket },
          ].map((item) => (
            <div
              key={item.tier}
              className="rounded-2xl border border-m3-outline-variant bg-m3-surface-container-low p-5 space-y-2"
            >
              <span className="inline-flex items-center rounded-full bg-m3-secondary-container px-2.5 py-0.5 text-[11px] font-bold text-m3-on-secondary-container">
                {item.tier}
              </span>
              <p className="font-display text-2xl font-bold text-m3-on-surface">{item.rate}</p>
              <p className="text-xs text-m3-on-surface-variant">
                {isAr ? `الحد الأدنى للاستبدال: ${minRedeem} نقطة` : `Member discount · ${item.pts}`}
              </p>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return <Award className={className} aria-hidden="true" />;
}
