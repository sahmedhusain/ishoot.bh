import Link from "next/link";
import { MailX, Home } from "lucide-react";
import { unsubscribeCustomer } from "@platform/database";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  await requireSiteLanguage(locale);
  const [t, done] = await Promise.all([
    siteTranslations(locale),
    unsubscribeCustomer(decodeURIComponent(token)),
  ]);
  return (
    <div className="relative min-h-[75vh] bg-m3-surface text-m3-on-surface flex items-center justify-center px-6 py-24">
      <div
        className="w-full max-w-lg rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low p-8 sm:p-10 space-y-5 text-center shadow-m3-1"
        data-testid="unsubscribe"
      >
        <div className="w-14 h-14 rounded-full bg-m3-secondary-container text-m3-on-secondary-container flex items-center justify-center mx-auto">
          <MailX className="w-7 h-7" aria-hidden="true" />
        </div>
        {done ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-m3-on-surface font-display">
              {t.marketing.unsubscribedTitle}
            </h1>
            <p className="text-sm sm:text-base text-m3-on-surface-variant leading-relaxed">
              {t.marketing.unsubscribedText}
            </p>
          </>
        ) : (
          <p role="alert" className="text-sm sm:text-base text-m3-error font-medium">
            {t.marketing.unsubscribeInvalid}
          </p>
        )}
        <div className="pt-2">
          <Link href={`/${locale}`} className="web-button">
            <Home aria-hidden="true" className="w-4 h-4" />
            <span>{t.common.returnHome}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
