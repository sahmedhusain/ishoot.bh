import { PublicDocuments } from "../../../components/blocks/PublicDocuments";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Mail, Newspaper } from "lucide-react";
import { isFeatureEnabled, listPressReleases } from "@platform/database";
import { getSite, requireSiteLanguage, siteTranslations } from "../../../lib/site";

export const dynamic = "force-dynamic";

/** The press page: press releases, a short "about", the logo to download and where media can write. */
export default async function PressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireSiteLanguage(locale);
  if (!(await isFeatureEnabled("pr"))) notFound();
  const [t, { company, info }, releases] = await Promise.all([siteTranslations(locale), getSite(), listPressReleases(true)]);
  const ar = locale === "ar";
  const name = ar ? company.company_name_ar || company.company_name_en : company.company_name_en || company.company_name_ar;
  const about = ar ? company.tagline_ar || company.tagline_en : company.tagline_en || company.tagline_ar;
  const when = (iso: string) => new Date(iso).toLocaleDateString(ar ? "ar-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="relative min-h-screen bg-brand-base text-ink">
      <div className="shell page-heading max-w-4xl space-y-12">
        <header className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">{t.press.title}</h1>
          <p className="text-ink-muted max-w-2xl">{t.press.subtitle}</p>
        </header>
        <section className="space-y-4" aria-labelledby="press-releases">
          <h2 id="press-releases" className="flex items-center gap-2 text-xl font-bold text-white"><Newspaper className="w-5 h-5" aria-hidden="true" />{t.press.releases}</h2>
          {releases.length === 0 ? (
            <p className="text-ink-muted">{t.press.noReleases}</p>
          ) : (
            <ul className="divide-y divide-white/10" data-testid="press-releases">
              {releases.map((r) => (
                <li key={r.id} className="py-4 space-y-1">
                  <p className="text-xs text-ink-muted">{when(r.date)}</p>
                  <Link href={`/${locale}/${info.articles.slug}/${r.slug}`} className="text-lg font-semibold text-white hover:text-[var(--web-accent)]">{ar ? r.title_ar || r.title_en : r.title_en || r.title_ar}</Link>
                  {(ar ? r.excerpt_ar : r.excerpt_en) && <p className="text-sm text-ink-muted">{ar ? r.excerpt_ar : r.excerpt_en}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <PublicDocuments locale={locale} />
        <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="press-kit">
          <h2 id="press-kit" className="sm:col-span-2 text-xl font-bold text-white">{t.press.kit}</h2>
          <div className="rounded-2xl border border-white/10 p-5 space-y-2">
            <h3 className="font-semibold text-white">{t.press.about}</h3>
            <p className="text-sm text-ink-muted">{[name, about].filter(Boolean).join(" — ")}</p>
            {company.logo_url && info.commerce?.capabilities.downloads !== false && (
              <a href={company.logo_url} download className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--web-accent)] hover:underline"><Download className="w-4 h-4" aria-hidden="true" />{t.press.logo}</a>
            )}
          </div>
          {company.email && (
            <div className="rounded-2xl border border-white/10 p-5 space-y-2">
              <h3 className="font-semibold text-white">{t.press.contact}</h3>
              <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--web-accent)] hover:underline" dir="ltr"><Mail className="w-4 h-4" aria-hidden="true" />{company.email}</a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
