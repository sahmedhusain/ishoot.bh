import { BranchLocations } from "./BranchLocations";
import { Reveal } from "../shared/Reveal";
import { getPublicCompanySettings } from "../../lib/company";
import { getWebsite } from "../../lib/website";
import { ContactForm } from "./ContactForm";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../lib/site";

export async function ContactBody({
  locale,
  query,
}: {
  locale: string;
  query: { intent?: string; service?: string; item?: string };
}) {
  const ar = locale === "ar";
  const [company, website] = await Promise.all([getPublicCompanySettings(), getWebsite()]);

  const t = await siteTranslations(locale);
  const item = query.item ? website.portfolio.find((entry) => entry.slug === query.item) : undefined;
  const initialMessage = item
    ? `${formatMessage(t.contact.aboutItem, { item: pickText(item.title_en, item.title_ar, locale) })}\n`
    : "";
  const { config } = await getSite();
  const hours = ar ? config.hoursAr : config.hoursEn;
  const response = ar ? config.responseAr : config.responseEn;
  const heading = (ar ? config.contactTitleAr : config.contactTitleEn) || t.contact.makeYourselfHeard;
  const intro =
    (ar ? config.contactIntroAr : config.contactIntroEn) ||
    pickText(company.tagline_en, company.tagline_ar, locale) ||
    t.hero.fallbackSubtitle;

  return (
    <div className="relative min-h-screen bg-m3-surface text-m3-on-surface overflow-hidden">
      <header className="shell relative z-10 page-heading">
        <Reveal>
          <p className="web-eyebrow text-m3-primary mb-4">
            {t.contact.directStudioLine}
          </p>
          <h1 className="max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.08] tracking-tight text-m3-on-surface">
            {heading}
          </h1>
          <p className="max-w-2xl mt-5 text-base sm:text-lg text-m3-on-surface-variant leading-relaxed">
            {intro}
          </p>
        </Reveal>
      </header>

      <section className="relative z-10 pb-24 md:pb-32">
        <div className="shell grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-8 lg:gap-12 items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="border-b border-m3-outline-variant pb-5">
              <h2 className="text-2xl font-display font-bold text-m3-on-surface">
                {t.contact.makeYourselfHeard}
              </h2>
            </div>

            <div className="space-y-3 text-sm text-m3-on-surface-variant">
              {company.email && (
                <a
                  className="flex gap-3.5 items-center p-4 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary hover:text-m3-on-surface transition-colors duration-150 break-all group"
                  href={`mailto:${company.email}`}
                >
                  <div className="w-10 h-10 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0">
                    <Mail aria-hidden="true" className="w-4 h-4" />
                  </div>
                  <bdi dir="ltr" className="font-medium text-m3-on-surface">{company.email}</bdi>
                </a>
              )}

              {company.phone && (
                <a
                  className="flex gap-3.5 items-center p-4 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant hover:border-m3-primary hover:text-m3-on-surface transition-colors duration-150 group"
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                >
                  <div className="w-10 h-10 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0">
                    <Phone aria-hidden="true" className="w-4 h-4" />
                  </div>
                  <bdi dir="ltr" className="font-medium text-m3-on-surface">{company.phone}</bdi>
                </a>
              )}

              {((ar ? company.address_ar : company.address_en) || company.address_en) && (
                <div className="flex gap-3.5 items-start p-4 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant">
                  <div className="w-10 h-10 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin aria-hidden="true" className="w-4 h-4" />
                  </div>
                  <span className="leading-relaxed text-m3-on-surface-variant">
                    {ar ? company.address_ar || company.address_en : company.address_en}
                  </span>
                </div>
              )}

              {hours && (
                <div className="flex gap-3.5 items-start p-4 rounded-[var(--md-sys-shape-corner-large,16px)] bg-m3-surface-container-low border border-m3-outline-variant">
                  <div className="w-10 h-10 rounded-[var(--md-sys-shape-corner-medium,12px)] bg-m3-primary-container text-m3-on-primary-container flex items-center justify-center shrink-0 mt-0.5">
                    <Clock aria-hidden="true" className="w-4 h-4" />
                  </div>
                  <p className="whitespace-pre-line text-xs text-m3-on-surface-variant leading-relaxed">
                    {hours}
                  </p>
                </div>
              )}
            </div>
          </aside>

          {config.commerce.capabilities.inquiries && (
            <Reveal className="contact-panel min-w-0" delay={0.08}>
              <ContactForm
                services={website.services}
                initialIntent={query.intent}
                initialService={query.service}
                initialMessage={initialMessage}
                response={response}
              />
            </Reveal>
          )}
        </div>
      </section>
      <BranchLocations branches={config.commerce.branches} locale={locale} />
    </div>
  );
}
