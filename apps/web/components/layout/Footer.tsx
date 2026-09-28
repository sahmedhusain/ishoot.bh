"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { Instagram, Linkedin, Youtube, ArrowUpRight } from "lucide-react";
import initialCompanyConfig from "@ishoot/database/config";

export function Footer() {
  const { t, locale, isRTL } = useTranslation();
  const company = initialCompanyConfig.company;

  return (
    <footer className="relative bg-[#050807] border-t border-white/10 pt-20 pb-12 overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-[#014842]/20 via-[#09937F]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2 space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative h-9 w-9 flex items-center justify-center shrink-0">
                <img
                  src="/icon.svg"
                  alt={t("common.brandIconAlt")}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <img
                src="/images/logo-color.svg"
                alt={t("common.brandLogoAlt")}
                className="h-7 w-auto object-contain brightness-125"
              />
            </Link>
            <p className="text-sm text-[#9EADA9] max-w-md leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="text-xs text-[#9EADA9]/70 pt-2">
              {t("footer.cr")}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              {t("footer.navigation")}
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9EADA9]">
              <li>
                <Link
                  href={`/${locale}`}
                  className="hover:text-[#09937F] transition-colors"
                >
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/works`}
                  className="hover:text-[#09937F] transition-colors"
                >
                  {t("nav.works")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="hover:text-[#09937F] transition-colors"
                >
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="hover:text-[#09937F] transition-colors"
                >
                  {t("nav.contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              {t("footer.social")}
            </h4>
            <div className="flex items-center gap-3">
              <a
                href={company.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={company.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
            <div className="pt-2 text-xs text-[#9EADA9]">
              <a
                href={`mailto:${company.email}`}
                className="hover:text-[#09937F] transition-colors"
              >
                {company.email}
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9EADA9]/60">
          <div>
            © {new Date().getFullYear()} {t("footer.companyName")}. {t("footer.allRights")}
          </div>
          <div className="flex items-center gap-6">
            <Link
              href={`/${locale}/about`}
              className="hover:text-[#09937F] transition-colors"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="hover:text-[#09937F] transition-colors"
            >
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
