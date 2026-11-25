"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { ArrowUpRight, Mail, Phone, MapPin, ShieldCheck, Cookie } from "lucide-react";
import { LegalModal } from "../shared/LegalModal";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SocialIcon } from "./SocialIcon";
import { SiteModeSwitch } from "../site/SiteTheme";
import { BrandImage } from "../site/BrandImage";
import { openCookiePreferences } from "./CookieConsentBanner";
import { cleanSentenceEnd } from "../../lib/format-site";
import type { PublicCompanySettings, SocialLink } from "@platform/database/types";

export function Footer({
  company,
  pages,
  links = [],
  extraLinks = [],
  socialLinks = [],
}: {
  company: PublicCompanySettings;
  pages?: { id: string; visible: boolean }[];
  links?: { href: string; label: string }[];
  extraLinks?: { href: string; label: string }[];
  socialLinks?: SocialLink[];
}) {
  const { t, locale, isRTL, site } = useTranslation();
  const [activeModal, setActiveModal] = React.useState<"terms" | "rules" | null>(null);
  const year = new Date().getFullYear();

  const ar = locale === "ar";
  const brandName = cleanSentenceEnd(
    ar
      ? company.company_name_ar || company.company_name_en
      : company.company_name_en || company.company_name_ar,
  );
  const tagline = ar ? company.tagline_ar : company.tagline_en;
  const visible = (id: string) => pages?.find((p) => p.id === id)?.visible ?? true;
  const showFooterInvitation = site?.footerInvitation ?? true;

  const seenNav = new Set<string>();
  const navLinks = [
    ...(visible("home") ? [{ href: `/${locale}`, label: t("nav.home") }] : []),
    ...(visible("works")
      ? [{ href: site ? collectionHref(site, locale) : `/${locale}/work`, label: t("nav.works") }]
      : []),
    ...(visible("about") ? [{ href: `/${locale}/about`, label: t("nav.about") }] : []),
    ...(visible("articles")
      ? [{ href: `/${locale}/${site?.articles.slug ?? "news"}`, label: t("nav.articles") }]
      : []),
    ...links,
    ...extraLinks,
    ...(visible("contact") ? [{ href: `/${locale}/contact`, label: t("nav.contact") }] : []),
  ].filter((item) => {
    if (seenNav.has(item.href)) return false;
    seenNav.add(item.href);
    return true;
  });

  const governanceLinks = [
    { href: `/${locale}/press`, label: t("footer.pressKit") },
    { href: `/${locale}/terms`, label: t("footer.terms") },
    { href: `/${locale}/privacy`, label: t("footer.rules") },
    { href: `/${locale}/cookies`, label: t("footer.cookies") },
  ];

  const rulesText =
    (ar ? company.rules_ar || company.rules_en : company.rules_en || company.rules_ar) ||
    t("footer.rulesUnavailable");

  const termsText =
    (ar ? company.terms_ar || company.terms_en : company.terms_en || company.terms_ar) ||
    t("footer.termsUnavailable");

  const activeSocials = socialLinks.filter((s) => s.url);

  return (
    <>
      <footer
        dir={isRTL ? "rtl" : "ltr"}
        className="site-footer relative bg-m3-surface-container-low text-m3-on-surface border-t border-m3-outline-variant"
      >
        <div className="shell py-16 md:py-20 space-y-12">
          {showFooterInvitation && (
            <div className="pb-12 border-b border-m3-outline-variant flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="space-y-3">
                <span className="web-eyebrow text-m3-primary">
                  {t("footer.invitationLabel")}
                </span>
                <h2 className="text-3xl sm:text-5xl font-display font-bold tracking-tight text-m3-on-surface leading-[1.08] max-w-xl">
                  {cleanSentenceEnd(t("footer.invitationTitle"))}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/${locale}/contact?intent=quote_request`}
                  className="web-button group shadow-m3-1"
                >
                  <span>{t("footer.invitationAction")}</span>
                  <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          )}

          <div className="site-footer-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-4">
              <Link href={`/${locale}`} className="inline-flex items-center gap-3 min-h-11 group">
                <BrandImage company={company} icon className="h-9 w-9 shrink-0" />
                <BrandImage company={company} className="h-7 min-w-0 max-w-[min(45vw,16rem)]" />
              </Link>
              {tagline && (
                <p className="text-sm text-m3-on-surface-variant leading-relaxed max-w-sm">
                  {tagline}
                </p>
              )}
              {company.cr_number && (
                <div className="inline-flex items-center gap-2 rounded-full bg-m3-surface-container border border-m3-outline-variant px-3.5 py-1.5 text-xs text-m3-on-surface-variant">
                  <ShieldCheck className="w-3.5 h-3.5 text-m3-primary shrink-0" />
                  <span>
                    {t("footer.registrationLabel")}: <bdi dir="ltr">{company.cr_number}</bdi>
                  </span>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-m3-on-surface-variant">
                {t("footer.navigation")}
              </h3>
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm text-m3-on-surface-variant hover:text-m3-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-m3-on-surface-variant">
                {t("footer.companyLinks")}
              </h3>
              <ul className="space-y-1">
                {governanceLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center text-sm text-m3-on-surface-variant hover:text-m3-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-m3-on-surface-variant">
                {t("footer.social")}
              </h3>
              <div className="space-y-2.5 text-sm text-m3-on-surface-variant">
                {company.email && (
                  <a
                    href={`mailto:${company.email}`}
                    className="flex items-center gap-2.5 min-h-10 hover:text-m3-primary transition-colors break-all"
                  >
                    <Mail className="w-4 h-4 text-m3-primary shrink-0" />
                    <bdi dir="ltr">{company.email}</bdi>
                  </a>
                )}
                {company.phone && (
                  <a
                    href={`tel:${company.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-2.5 min-h-10 hover:text-m3-primary transition-colors"
                  >
                    <Phone className="w-4 h-4 text-m3-primary shrink-0" />
                    <bdi dir="ltr">{company.phone}</bdi>
                  </a>
                )}
                {(ar ? company.address_ar || company.address_en : company.address_en) && (
                  <p className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <MapPin className="w-4 h-4 text-m3-primary shrink-0 mt-0.5" />
                    <span>{ar ? company.address_ar || company.address_en : company.address_en}</span>
                  </p>
                )}
              </div>

              {activeSocials.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {activeSocials.map((social) => (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.platform}
                      className="w-11 h-11 rounded-full border border-m3-outline-variant bg-m3-surface-container hover:border-m3-primary hover:bg-m3-secondary-container flex items-center justify-center transition-colors text-m3-on-surface-variant hover:text-m3-on-secondary-container"
                    >
                      <SocialIcon name={social.platform} className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-m3-outline-variant flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-m3-on-surface-variant">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2">
              <p>
                © {year} {brandName.endsWith(".") ? brandName : `${brandName}.`} {t("footer.allRights")}
              </p>
              <button
                type="button"
                onClick={() => setActiveModal("terms")}
                className="min-h-11 hover:text-m3-primary transition-colors underline underline-offset-4 cursor-pointer"
              >
                {t("footer.terms")}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("rules")}
                className="min-h-11 hover:text-m3-primary transition-colors underline underline-offset-4 cursor-pointer"
              >
                {t("footer.rules")}
              </button>
              <button
                type="button"
                onClick={() => openCookiePreferences()}
                className="inline-flex min-h-11 items-center gap-1.5 hover:text-m3-primary transition-colors underline underline-offset-4 cursor-pointer"
              >
                <Cookie className="w-3.5 h-3.5" />
                <span>{t("footer.cookieSettings")}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher variant="footer" />
              <SiteModeSwitch locale={locale} />
            </div>
          </div>
        </div>
      </footer>

      <LegalModal
        isOpen={activeModal === "terms"}
        onClose={() => setActiveModal(null)}
        title={t("footer.termsModalTitle")}
        content={termsText}
      />

      <LegalModal
        isOpen={activeModal === "rules"}
        onClose={() => setActiveModal(null)}
        title={t("footer.rulesModalTitle")}
        content={rulesText}
      />
    </>
  );
}
