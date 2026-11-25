import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";
import { currentCustomer, storeEnabled } from "../../../../lib/customer";
import { formatMessage } from "@platform/locales";

export const dynamic = "force-dynamic";

export default async function OrderPlacedPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ number?: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [{ number }, t, customer] = await Promise.all([searchParams, siteTranslations(locale), currentCustomer()]);
  const safe = typeof number === "string" && /^SO-\d{4}-\d{6}$/.test(number) ? number : "";
  return (
    <div className="bg-m3-surface text-m3-on-surface pb-20">
      <div className="shell page-heading">
        <div className="max-w-xl mx-auto rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-8 sm:p-10 space-y-6 text-center shadow-m3-1">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-m3-primary-container text-m3-on-primary-container grid place-items-center">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-m3-on-surface font-display">{t.store.placedTitle}</h1>
          <p className="text-m3-on-surface-variant" data-testid="order-placed">{formatMessage(t.store.placedText, { number: safe })}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {customer && (
              <Link href={`/${locale}/account`} className="inline-flex min-h-11 items-center rounded-full bg-m3-primary px-6 py-2.5 text-sm font-bold text-m3-on-primary hover:brightness-95">
                {t.store.placedAccount}
              </Link>
            )}
            <Link href={`/${locale}/shop`} className="inline-flex min-h-11 items-center rounded-full border border-m3-outline bg-m3-surface px-5 py-2.5 text-sm font-semibold text-m3-on-surface hover:border-m3-primary">
              {t.store.continueShopping}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
