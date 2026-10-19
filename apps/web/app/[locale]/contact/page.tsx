import { Reveal } from "../../../components/shared/Reveal";
import { getPublicCompanySettings } from "../../../lib/company";
import { getWebsite, isWebsitePreview } from "../../../lib/website";
import { ContactForm } from "../../../components/contact/ContactForm";
import {
  Mail,
  Phone,
  MapPin,
  ArrowUpRight,
  MessageSquare,
  Clock,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, Locale } from "@platform/locales";

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ intent?: string; service?: string }>;
}) {
  const { locale } = await params;
  const ar = locale === "ar";
  const [company, website, query, isPreview] = await Promise.all([
    getPublicCompanySettings(),
    getWebsite(),
    searchParams,
    isWebsitePreview(),
  ]);

  const pageVisible =
    website?.config?.pages?.find((p) => p.id === "contact")?.visible ?? true;
  if (!pageVisible && !isPreview) {
    notFound();
  }

  const t = getTranslations(locale as Locale);
  const config = website.config;
  const hours = ar ? config.hoursAr : config.hoursEn;
  const response = ar ? config.responseAr : config.responseEn;

  return (
    <div className="relative min-h-screen bg-[#050807] text-[#F2F6F5] overflow-hidden">
      {/* Hero Header */}
      <header className="shell relative z-10 page-heading">
        <Reveal>
          <p className="web-eyebrow text-[#5EEAD4] mb-5">
            {t.contact.directStudioLine}
          </p>
          <h1 className="max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.08] tracking-tight text-white">
            {ar ? config.contactTitleAr : config.contactTitleEn}
          </h1>
          <p className="max-w-2xl mt-5 text-base sm:text-lg text-[#9EADA9] leading-relaxed">
            {ar ? config.contactIntroAr : config.contactIntroEn}
          </p>
        </Reveal>
      </header>

      {/* Main Content Section */}
      <section className="relative z-10 pb-24 md:pb-32">
        <div className="shell grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-8 lg:gap-12 items-start">
          {/* Aside Information Card */}
          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="border-b border-white/10 pb-5">
              <h2 className="text-2xl font-display font-bold text-white">
                {t.contact.makeYourselfHeard}
              </h2>
            </div>

            <div className="space-y-4 text-sm text-[#d4dfd8]">
              {company.email && (
                <a
                  className="flex gap-3.5 items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#09937F]/60 hover:text-white transition-colors duration-150 break-all group"
                  href={`mailto:${company.email}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] ">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>{company.email}</span>
                </a>
              )}

              {company.phone && (
                <a
                  className="flex gap-3.5 items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#09937F]/60 hover:text-white transition-colors duration-150 group"
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] ">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span dir="ltr">{company.phone}</span>
                </a>
              )}

              {((ar ? company.address_ar : company.address_en) ||
                company.address_en) && (
                <div className="flex gap-3.5 items-start p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] mt-0.5">
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
                <div className="flex gap-3.5 items-start p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="whitespace-pre-line text-xs text-[#9EADA9] leading-relaxed">
                    {hours}
                  </p>
                </div>
              )}
            </div>

            {company.whatsapp_phone && (
              <a
                href={`https://wa.me/${company.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#014842] hover:bg-[#014842]/80 border border-[#09937F]/50 text-white font-semibold text-sm  transition-colors duration-150"
              >
                <MessageSquare className="w-4 h-4 text-[#5EEAD4]" />
                <span>{t.contact.chatWhatsapp}</span>
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </a>
            )}
          </aside>

          {/* Form Container Card */}
          <Reveal className="contact-panel min-w-0" delay={0.08}>
            <ContactForm
              services={website.services}
              initialIntent={query.intent}
              initialService={query.service}
              response={response}
            />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
