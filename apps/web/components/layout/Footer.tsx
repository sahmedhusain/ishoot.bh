"use client";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion, SiteModeSwitch, useSiteTheme } from "../site/SiteTheme";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "../../hooks/useTranslation";
import { collectionHref } from "../../lib/site-copy";
import { ArrowUpRight } from "lucide-react";
import type { PublicCompanySettings, SocialLink } from "@platform/database/types";
import { SocialIcon } from "./SocialIcon";
import { Reveal } from "../shared/Reveal";
import { LegalModal } from "../shared/LegalModal";

interface FooterProps {
  company: PublicCompanySettings;
  socialLinks?: SocialLink[];
  pages?: { id: string; visible: boolean }[];
  links?: { id: string; href: string; label: string }[];
}

export function Footer({ company, socialLinks = [], pages, links }: FooterProps) {
  const { isArabic, t, locale, site } = useTranslation();
  const pathname = usePathname();
  const theme = useSiteTheme();
  const showInvitation = site?.footerInvitation !== false && theme?.design.footerLayout !== "compact" &&
    !pathname.endsWith("/contact") &&
    pages?.find((page) => page.id === "contact")?.visible !== false;
  const [modalType, setModalType] = React.useState<"terms" | "rules" | null>(
    null,
  );

  const pageMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    pages?.forEach((p) => map.set(p.id, p.visible));
    return map;
  }, [pages]);

  const navLinks = links ?? [
    { id: "home", href: `/${locale}`, label: t("nav.home") },
    { id: "works", href: site ? collectionHref(site, locale) : `/${locale}/works`, label: t("nav.works") },
    { id: "about", href: `/${locale}/about`, label: t("nav.about") },
    { id: "contact", href: `/${locale}/contact`, label: t("nav.contact") },
  ].filter((item) => item.id === "home" || pageMap.get(item.id) !== false);

  const activeLinks = React.useMemo(() => {
    const seen = new Set<string>();
    return [...socialLinks]
      .filter((link) => link.is_active && !/whatsapp/i.test(link.platform) && !/^https?:\/\/(wa\.me|(?:[a-z0-9-]+\.)*whatsapp\.com)(?:\/|$)/i.test(link.url))
      .sort((a, b) => a.display_order - b.display_order)
      .filter((link) => {
        const destination = link.url.trim().replace(/\/+$/, "");
        if (seen.has(destination)) return false;
        seen.add(destination);
        return true;
      });
  }, [socialLinks]);

  const renderModalContent = () => {
    if (modalType === "terms") {
      const content = isArabic ? company.terms_ar : company.terms_en;
      return content ? content : t("footer.termsUnavailable");
    }
    if (modalType === "rules") {
      const content = isArabic ? company.rules_ar : company.rules_en;
      return content ? content : t("footer.rulesUnavailable");
    }
    return "";
  };

  const renderModalTitle = () => {
    if (modalType === "terms") {
      return t("footer.termsModalTitle");
    }
    if (modalType === "rules") {
      return t("footer.rulesModalTitle");
    }
    return "";
  };

  return (
    <SiteRegion region="footer"><footer className="site-footer relative bg-brand-surface border-t border-white/10 pt-16 sm:pt-24 pb-6">
      <div className="shell relative">
        {showInvitation && (
          <Reveal className="footer-invitation sloped-rule-bottom">
            <p className="web-eyebrow text-ink-muted">
              {t("footer.invitationLabel")}
            </p>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mt-4">
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.12] max-w-2xl">
                {t("footer.invitationTitle")}
              </h2>
              <Link
                href={`/${locale}/contact?intent=quote_request`}
                className="web-button self-start md:self-end shrink-0"
              >
                {t("footer.invitationAction")}
                <ArrowUpRight
                  aria-hidden="true"
                  className="w-4 h-4 rtl:-scale-x-100"
                />
              </Link>
            </div>
            {company.email && (
              <a
                href={`mailto:${company.email}`}
                className="footer-email"
                dir="ltr"
              >
                {company.email}
              </a>
            )}
          </Reveal>
        )}
        <div className="site-footer-grid grid grid-cols-1 md:grid-cols-[2fr_1fr_1.2fr] gap-10 lg:gap-16 py-12 sm:py-16">
          <div className="space-y-5">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-3 group w-fit"
            >
              <BrandImage company={company} icon className="h-10 w-10 shrink-0" />
              <BrandImage company={company} className="h-7 min-w-0 max-w-[min(36vw,15rem)]" />
            </Link>
            {(locale === "ar" ? company.address_ar : company.address_en) ? (
              <p className="text-sm text-ink-muted max-w-md leading-relaxed font-sans">
                {locale === "ar" ? company.address_ar : company.address_en}
              </p>
            ) : null}
            <div className="text-xs text-ink-muted pt-2 font-sans">
              {company.cr_number &&
                `${t("footer.registrationLabel")}: ${company.cr_number}`}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-sans">
              {t("footer.navigation")}
            </h3>
            <ul className="space-y-2.5 text-sm text-ink-muted font-sans">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-sans">
              {t("footer.social")}
            </h3>
            <div className="flex flex-col items-start gap-1">
              {activeLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link group inline-flex items-center gap-3"
                  aria-label={link.platform}
                  title={link.platform}
                >
                  <SocialIcon
                    name={link.platform}
                    hint={link.icon}
                    className="w-4 h-4"
                  />
                  <span>{link.platform}</span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="w-3.5 h-3.5 rtl:-scale-x-100"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs text-ink-muted font-sans">
          <div>
            © {new Date().getFullYear()}{" "}
            {isArabic
              ? company.company_name_ar || company.company_name_en
              : company.company_name_en}
            {" · "}
            {t("footer.allRights")}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <SiteModeSwitch locale={locale} />
            <button
              onClick={() => setModalType("rules")}
              className="footer-link bg-transparent border-none cursor-pointer"
            >
              {t("footer.rules")}
            </button>
            <button
              onClick={() => setModalType("terms")}
              className="footer-link bg-transparent border-none cursor-pointer"
            >
              {t("footer.terms")}
            </button>
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={renderModalTitle()}
        content={renderModalContent()}
      />
    </footer></SiteRegion>
  );
}
