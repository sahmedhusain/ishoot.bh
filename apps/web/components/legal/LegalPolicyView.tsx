"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, FileText, Cookie, Mail, MapPin, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { openCookiePreferences } from "../layout/CookieConsentBanner";
import { cleanSentenceEnd } from "../../lib/format-site";
import type { PublicCompanySettings } from "@platform/database/types";

export interface PolicySectionItem {
  heading: string;
  body: string;
}

export function LegalPolicyView({
  kind,
  title,
  intro,
  customHtmlOrText,
  sections,
  company,
}: {
  kind: "terms" | "privacy" | "cookies";
  title: string;
  intro: string;
  customHtmlOrText?: string | null;
  sections: PolicySectionItem[];
  company: PublicCompanySettings;
}) {
  const { t, locale, isRTL } = useTranslation();
  const ar = locale === "ar";
  const brandName = cleanSentenceEnd(
    ar ? company.company_name_ar || company.company_name_en : company.company_name_en || company.company_name_ar,
  );
  const address = ar ? company.address_ar || company.address_en : company.address_en;
  const Icon = kind === "terms" ? FileText : kind === "privacy" ? ShieldCheck : Cookie;
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-brand-base text-ink pb-20">
      <header className="shell page-heading space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
          <Icon className="w-3.5 h-3.5" />
          <span>{cleanSentenceEnd(brandName)}</span>
        </div>
        <h1 className="max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.08] tracking-tight text-ink">
          {title}
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-ink-muted leading-relaxed">
          {intro}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={`/${locale}/terms`}
            aria-current={kind === "terms" ? "page" : undefined}
            className={`min-h-11 px-4 rounded-full text-xs font-semibold inline-flex items-center border transition-colors ${
              kind === "terms"
                ? "bg-m3-primary text-m3-on-primary border-m3-primary"
                : "bg-m3-surface-container-low border-m3-outline-variant text-ink hover:bg-m3-surface-container"
            }`}
          >
            {t("footer.terms")}
          </Link>
          <Link
            href={`/${locale}/privacy`}
            aria-current={kind === "privacy" ? "page" : undefined}
            className={`min-h-11 px-4 rounded-full text-xs font-semibold inline-flex items-center border transition-colors ${
              kind === "privacy"
                ? "bg-m3-primary text-m3-on-primary border-m3-primary"
                : "bg-m3-surface-container-low border-m3-outline-variant text-ink hover:bg-m3-surface-container"
            }`}
          >
            {t("footer.rules")}
          </Link>
          <Link
            href={`/${locale}/cookies`}
            aria-current={kind === "cookies" ? "page" : undefined}
            className={`min-h-11 px-4 rounded-full text-xs font-semibold inline-flex items-center border transition-colors ${
              kind === "cookies"
                ? "bg-m3-primary text-m3-on-primary border-m3-primary"
                : "bg-m3-surface-container-low border-m3-outline-variant text-ink hover:bg-m3-surface-container"
            }`}
          >
            {t("footer.cookies")}
          </Link>
          {kind === "cookies" && (
            <button
              type="button"
              onClick={() => openCookiePreferences()}
              className="min-h-11 px-5 rounded-full bg-m3-secondary-container text-m3-on-secondary-container text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2 cursor-pointer"
            >
              <Cookie className="w-3.5 h-3.5" />
              <span>{t("cookies.manageButton")}</span>
            </button>
          )}
        </div>
      </header>

      <div className="shell grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-8 items-start">
        <div className="space-y-6">
          {customHtmlOrText && (
            <section className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 space-y-3">
              <h2 className="text-lg font-display font-bold text-ink">{title}</h2>
              <div className="text-sm sm:text-base text-ink-muted leading-relaxed whitespace-pre-line">
                {customHtmlOrText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
              </div>
            </section>
          )}

          {sections.map((section, idx) => (
            <section
              key={section.heading}
              className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 sm:p-8 space-y-2.5"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-m3-primary">
                0{idx + 1}
              </span>
              <h2 className="text-xl font-display font-bold text-ink">
                {section.heading}
              </h2>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <aside className="rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-5 lg:sticky lg:top-28">
          <h2 className="text-base font-display font-bold text-ink">
            {t("about.credentialsBadge")}
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
              <div>
                <dt className="text-xs text-ink-muted">{brandName}</dt>
                {company.cr_number && (
                  <dd className="font-medium text-ink">
                    {t("about.crLabel")}: <bdi dir="ltr">{company.cr_number}</bdi>
                  </dd>
                )}
              </div>
            </div>
            {company.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                <div>
                  <dt className="text-xs text-ink-muted">{t("contact.email")}</dt>
                  <dd>
                    <a
                      href={`mailto:${company.email}`}
                      className="font-medium text-m3-primary hover:underline break-all"
                    >
                      <bdi dir="ltr">{company.email}</bdi>
                    </a>
                  </dd>
                </div>
              </div>
            )}
            {address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                <div>
                  <dt className="text-xs text-ink-muted">{t("about.headquartersLabel")}</dt>
                  <dd className="text-ink-muted leading-relaxed">{address}</dd>
                </div>
              </div>
            )}
          </dl>

          <Link
            href={`/${locale}/contact`}
            className="web-button w-full justify-between"
          >
            <span>{t("nav.contact")}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
