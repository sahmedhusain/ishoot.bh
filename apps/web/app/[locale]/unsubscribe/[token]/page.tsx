import { MailX } from "lucide-react";
import { unsubscribeCustomer } from "@platform/database";
import { requireSiteLanguage, siteTranslations } from "../../../../lib/site";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  await requireSiteLanguage(locale);
  const [t, done] = await Promise.all([siteTranslations(locale), unsubscribeCustomer(decodeURIComponent(token))]);
  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-xl space-y-4 text-center" data-testid="unsubscribe">
        <MailX className="mx-auto w-12 h-12 text-[var(--web-accent)]" aria-hidden="true" />
        {done ? (
          <>
            <h1 className="text-3xl font-bold text-white font-display">{t.marketing.unsubscribedTitle}</h1>
            <p className="text-ink-muted">{t.marketing.unsubscribedText}</p>
          </>
        ) : (
          <p role="alert" className="text-ink-muted">{t.marketing.unsubscribeInvalid}</p>
        )}
      </div>
    </div>
  );
}
