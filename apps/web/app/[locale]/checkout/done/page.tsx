import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";
import { currentCustomer, storeEnabled } from "../../../../lib/customer";
import { formatMessage } from "@platform/locales";

export const dynamic = "force-dynamic";

/** After placing an order: its number and where to follow it. */
export default async function OrderPlacedPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ number?: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await storeEnabled())) notFound();
  const [{ number }, t, customer] = await Promise.all([searchParams, siteTranslations(locale), currentCustomer()]);
  const safe = typeof number === "string" && /^SO-\d{4}-\d{6}$/.test(number) ? number : "";
  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-2xl space-y-6 text-center">
        <CheckCircle2 className="mx-auto w-14 h-14 text-emerald-400" aria-hidden="true" />
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">{t.store.placedTitle}</h1>
        <p className="text-ink-muted" data-testid="order-placed">{formatMessage(t.store.placedText, { number: safe })}</p>
        {customer && <Link href={`/${locale}/account`} className="inline-flex font-semibold text-[var(--web-accent)] hover:underline">{t.store.placedAccount}</Link>}
      </div>
    </div>
  );
}
