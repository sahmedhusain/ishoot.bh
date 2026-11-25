import { siteLogo } from "../../lib/brand-images";
import { Mail, Phone, MapPin } from "lucide-react";
import type { PublicCompanySettings } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { formatMessage, type TranslationKeys } from "@platform/locales";
import { ContentImage } from "../shared/ContentImage";

export function WebsiteOffline({
  company,
  locale,
  t,
}: {
  company: PublicCompanySettings;
  locale: string;
  t: TranslationKeys;
}) {
  const name = pickText(company.company_name_en, company.company_name_ar, locale);
  const tagline = pickText(company.tagline_en, company.tagline_ar, locale);
  const address = pickText(company.address_en, company.address_ar, locale);
  const item =
    "flex items-center gap-3 rounded-[var(--md-sys-shape-corner-medium,12px)] border border-m3-outline-variant bg-m3-surface-container-low px-4 py-3.5 text-sm text-m3-on-surface hover:border-m3-primary transition-colors";

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-m3-surface text-m3-on-surface px-6 py-16"
      data-testid="website-offline"
    >
      <div className="w-full max-w-md rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low p-8 space-y-8 text-center shadow-m3-1">
        <ContentImage
          src={siteLogo(company)}
          alt={formatMessage(t.common.brandLogoAlt, { companyName: name })}
          fallbackText={name}
          width={240}
          height={60}
          className="mx-auto h-10 w-auto object-contain"
        />
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold text-m3-on-surface">{name}</h1>
          {tagline ? <p className="text-sm text-m3-on-surface-variant leading-relaxed">{tagline}</p> : null}
        </div>
        <div className="space-y-2.5 text-start">
          {company.email ? (
            <a href={`mailto:${company.email}`} className={item}>
              <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-m3-primary" />
              <span className="break-all">{company.email}</span>
            </a>
          ) : null}
          {company.phone ? (
            <a href={`tel:${company.phone.replace(/\s/g, "")}`} className={item}>
              <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-m3-primary" />
              <span dir="ltr">{company.phone}</span>
            </a>
          ) : null}
          {address ? (
            <p className={item}>
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-m3-primary" />
              <span>{address}</span>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
