import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { siteTranslations } from "../../lib/site";

export async function ExecutiveCtaBanner({
  locale,
  companyName,
  catalogueHref,
}: {
  locale: string;
  companyName: string;
  catalogueHref: string;
}) {
  const t = await siteTranslations(locale);
  return (
    <section
      data-testid="executive-cta-banner"
      className="relative bg-brand-base text-ink py-20 sm:py-24 border-t border-white/10"
    >
      <div className="shell">
        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-mint">
              {t.about.credentialsBadge}
            </span>
            <h2 className="text-2xl sm:text-4xl font-display font-bold text-white leading-tight">
              {formatMessage(t.about.executiveCtaTitle, { companyName })}
            </h2>
            <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
              {t.about.executiveCtaSub}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href={`/${locale}/contact?intent=quote_request`} className="web-button">
              <span>{t.about.requestConsultation}</span>
              <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
            <Link
              href={catalogueHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-brand border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <span>{t.portfolio.filterAll}</span>
              <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
