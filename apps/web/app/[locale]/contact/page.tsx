import * as React from "react";
import { getTranslations, Locale } from "@ishoot/locales";
import { getCompanySettings } from "@ishoot/database";
import initialCompanyConfig from "@ishoot/database/config";
import { SectionBadge } from "../../../components/shared/SectionBadge";
import { ContactForm } from "../../../components/contact/ContactForm";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);
  const companySettings = await getCompanySettings().catch(() => null);
  const rawInitial = initialCompanyConfig.company;

  const company = {
    companyNameEn: companySettings?.company_name_en ?? rawInitial.companyNameEn,
    companyNameAr: companySettings?.company_name_ar ?? rawInitial.companyNameAr,
    addressEn: companySettings?.address_en ?? rawInitial.addressEn,
    addressAr: companySettings?.address_ar ?? rawInitial.addressAr,
    phone: companySettings?.phone ?? rawInitial.phone,
    whatsappPhone: companySettings?.whatsapp_phone ?? rawInitial.whatsappPhone,
    email: companySettings?.email ?? rawInitial.email,
  };

  return (
    <div className="py-20 max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <SectionBadge>{t.contact.badge}</SectionBadge>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white font-display">
          {t.contact.title}
        </h1>
        <p className="text-base sm:text-lg text-[#9EADA9] leading-relaxed">
          {t.contact.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0B1210] border border-white/10 rounded-3xl p-8 space-y-6">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              {t.contact.studioInfo}
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#09937F] shrink-0 mt-0.5" />
                <span className="text-[#9EADA9]">
                  {locale === "ar" ? company.addressAr : company.addressEn}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#09937F] shrink-0" />
                <a
                  href={`mailto:${company.email}`}
                  className="text-[#9EADA9] hover:text-[#09937F] transition-colors"
                >
                  {company.email}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#09937F] shrink-0" />
                <a
                  href={`tel:${company.phone.replace(/\s+/g, "")}`}
                  className="text-[#9EADA9] hover:text-[#09937F] transition-colors "
                >
                  {company.phone}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#09937F] shrink-0" />
                <span className="text-[#9EADA9]">{t.contact.workingHours}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#014842]/40 to-[#0B1210] border border-[#09937F]/30 rounded-3xl p-8 space-y-3">
            <div className="text-xs  uppercase tracking-widest text-[#09937F]">
              {t.contact.immediateResponse}
            </div>
            <div className="text-xl font-bold text-white">
              {t.contact.whatsappConcierge}
            </div>
            <p className="text-xs text-[#9EADA9]">{t.contact.whatsappDesc}</p>
            <a
              href={`https://wa.me/${company.whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                locale === "ar"
                  ? `مرحباً، أود الاستفسار عن مشروع إنتاج سينمائي مع ${company.companyNameAr}`
                  : `Hello, I would like to inquire about a production project with ${company.companyNameEn}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm font-semibold text-[#09937F] hover:text-[#0BB49B] transition-colors"
            >
              {t.contact.openWhatsapp}
            </a>
          </div>
        </div>

        <div className="lg:col-span-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
