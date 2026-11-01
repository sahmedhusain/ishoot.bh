import { BranchLocations } from "./BranchLocations";
import { Reveal } from "../shared/Reveal";
import { getPublicCompanySettings } from "../../lib/company";
import { getWebsite } from "../../lib/website";
import { ContactForm } from "./ContactForm";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import { formatMessage } from "@platform/locales";
import { pickText } from "@platform/database/constants/languages";
import { getSite, siteTranslations } from "../../lib/site";

/** The contact page's own layout: contact details beside the enquiry form. Shown by the "contact details and form" block. */
export async function ContactBody({ locale, query }: { locale: string; query: { intent?: string; service?: string; item?: string } }) {
  const ar = locale === "ar";
  const [company, website] = await Promise.all([getPublicCompanySettings(), getWebsite()]);

  const t = await siteTranslations(locale);
  const item = query.item ? website.portfolio.find((entry) => entry.slug === query.item) : undefined;
  const initialMessage = item ? `${formatMessage(t.contact.aboutItem, { item: pickText(item.title_en, item.title_ar, locale) })}\n` : "";
  const { config } = await getSite();
  const hours = ar ? config.hoursAr : config.hoursEn;
  const response = ar ? config.responseAr : config.responseEn;

  return (
    <div className="relative min-h-screen bg-brand-base text-ink overflow-hidden">
      <header className="shell relative z-10 page-heading">
        <Reveal>
          <p className="web-eyebrow text-mint mb-5">
            {t.contact.directStudioLine}
          </p>
          <h1 className="max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.08] tracking-tight text-white">
            {ar ? config.contactTitleAr : config.contactTitleEn}
          </h1>
          <p className="max-w-2xl mt-5 text-base sm:text-lg text-ink-muted leading-relaxed">
            {ar ? config.contactIntroAr : config.contactIntroEn}
          </p>
        </Reveal>
      </header>

      <section className="relative z-10 pb-24 md:pb-32">
        <div className="shell grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-8 lg:gap-12 items-start">
          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-display font-bold text-white">
                {t.contact.makeYourselfHeard}
              </h2>
            </div>

            <div className="space-y-4 text-sm text-ink-muted">
              {company.email && (
                <a
                  className="flex gap-3.5 items-center p-4 rounded-brand bg-m3-surface-container-low hover:border-accent/60 hover:text-white transition-colors duration-150 break-all group"
                  href={`mailto:${company.email}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 text-mint ">
                    <Mail className="w-4 h-4" />
                  </div>
                  <bdi dir="ltr">{company.email}</bdi>
                </a>
              )}

              {company.phone && (
                <a
                  className="flex gap-3.5 items-center p-4 rounded-brand bg-m3-surface-container-low hover:border-accent/60 hover:text-white transition-colors duration-150 group"
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 text-mint ">
                    <Phone className="w-4 h-4" />
                  </div>
                  <bdi dir="ltr">{company.phone}</bdi>
                </a>
              )}

              {((ar ? company.address_ar : company.address_en) ||
                company.address_en) && (
                  <div className="flex gap-3.5 items-start p-4 rounded-brand bg-m3-surface-container-low">
                    <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 text-mint mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="leading-relaxed">
                      {ar
                        ? company.address_ar || company.address_en
                        : company.address_en}
                    </span>
                  </div>
                )}

              {hours && (
                <div className="flex gap-3.5 items-start p-4 rounded-brand bg-m3-surface-container-low">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0 text-mint mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="whitespace-pre-line text-xs text-ink-muted leading-relaxed">
                    {hours}
                  </p>
                </div>
              )}
            </div>

          </aside>

          {config.commerce.capabilities.inquiries && <Reveal className="contact-panel min-w-0" delay={0.08}>
            <ContactForm
              services={website.services}
              initialIntent={query.intent}
              initialService={query.service}
              initialMessage={initialMessage}
              response={response}
            />
          </Reveal>}
        </div>
      </section>
      <BranchLocations branches={config.commerce.branches} locale={locale} />
    </div>
  );
}
