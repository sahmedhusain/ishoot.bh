import { getPublicCompanySettings } from "../../../lib/company";
import { getWebsite, isWebsitePreview } from "../../../lib/website";
import { ContactForm } from "../../../components/contact/ContactForm";
import { Mail, Phone, MapPin, ArrowUpRight, MessageSquare, Clock } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, Locale } from "@ishoot/locales";

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
      {/* Background Graphic Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/4 start-1/3 w-[600px] h-[600px] bg-radial from-[#09937F]/15 via-[#014842]/5 to-transparent blur-3xl pointer-events-none"
      />

      {/* Hero Header */}
      <header className="shell relative z-10 pt-36 pb-12 md:pt-44 md:pb-16">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#5EEAD4] mb-4">
          <span className="text-[#09937F] opacity-80">&lt;&lt;</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{t.contact.directStudioLine}</span>
          <span className="text-[#09937F] opacity-80">&gt;&gt;</span>
        </div>
        <h1 className="max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-display font-bold leading-[1.08] tracking-tight text-white">
          {ar ? config.contactTitleAr : config.contactTitleEn}
        </h1>
        <p className="max-w-2xl mt-5 text-base sm:text-lg text-[#9EADA9] leading-relaxed">
          {ar ? config.contactIntroAr : config.contactIntroEn}
        </p>
      </header>

      {/* Main Content Section */}
      <section className="relative z-10 pb-24 md:pb-32">
        <div className="shell grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-8 lg:gap-12 items-start">
          {/* Aside Information Card */}
          <aside className="space-y-6 p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-[#014842]/25 via-[#0B1210] to-[#050807] border border-[#09937F]/30 backdrop-blur-xl shadow-2xl">
            <div className="border-b border-white/10 pb-5">
              <p className="text-xs font-mono uppercase tracking-widest text-[#5EEAD4] mb-1.5">
                {t.contact.directLineToTeam}
              </p>
              <h2 className="text-2xl font-display font-bold text-white">
                {t.contact.makeYourselfHeard}
              </h2>
            </div>

            <div className="space-y-4 text-sm text-[#d4dfd8]">
              {company.email && (
                <a
                  className="flex gap-3.5 items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#09937F]/60 hover:text-white transition-all break-all group"
                  href={`mailto:${company.email}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span>{company.email}</span>
                </a>
              )}

              {company.phone && (
                <a
                  className="flex gap-3.5 items-center p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#09937F]/60 hover:text-white transition-all group"
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span dir="ltr">{company.phone}</span>
                </a>
              )}

              {((ar ? company.address_ar : company.address_en) || company.address_en) && (
                <div className="flex gap-3.5 items-start p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-9 h-9 rounded-lg bg-[#09937F]/15 border border-[#09937F]/30 flex items-center justify-center shrink-0 text-[#5EEAD4] mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="leading-relaxed">
                    {ar ? company.address_ar || company.address_en : company.address_en}
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
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-[#014842] hover:bg-[#014842]/80 border border-[#09937F]/50 text-white font-semibold text-sm shadow-lg hover:shadow-[0_0_20px_rgba(9,147,127,0.3)] transition-all"
              >
                <MessageSquare className="w-4 h-4 text-[#5EEAD4]" />
                <span>{t.contact.chatWhatsapp}</span>
                <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
              </a>
            )}

            {response && (
              <div className="border-t border-white/10 pt-5">
                <h3 className="font-semibold text-xs text-[#5EEAD4] uppercase tracking-wider mb-2">
                  {t.contact.immediateResponse}
                </h3>
                <p className="text-xs leading-relaxed text-[#9EADA9]">
                  {response}
                </p>
              </div>
            )}
          </aside>

          {/* Form Container Card */}
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-[#014842]/15 via-[#0B1210] to-[#050807] border border-[#09937F]/30 backdrop-blur-xl shadow-2xl min-w-0">
            <ContactForm
              services={website.services}
              initialIntent={query.intent}
              initialService={query.service}
              response={response}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
