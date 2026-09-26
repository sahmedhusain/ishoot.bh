'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslation } from '../../hooks/useTranslation';
import { Instagram, Linkedin, Youtube, ArrowUpRight } from 'lucide-react';

export function Footer() {
  const { t, locale, isRTL } = useTranslation();

  return (
    <footer className="relative bg-[#050807] border-t border-white/10 pt-20 pb-12 overflow-hidden">
      {/* Background Ambient Radial Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-t from-[#014842]/20 via-[#09937F]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#014842] border border-[#09937F]/40">
                <span className="w-3 h-3 rounded-full bg-[#09937F]" />
              </div>
              <span className="text-3xl font-bold tracking-tight text-white font-display">
                ishoot<span className="text-[#09937F]">.</span>
              </span>
            </Link>
            <p className="text-sm text-[#9EADA9] max-w-md leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="text-xs text-[#9EADA9]/70 pt-2">
              {t('footer.cr')}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              {t('footer.navigation')}
            </h4>
            <ul className="space-y-2.5 text-sm text-[#9EADA9]">
              <li>
                <Link href={`/${locale}`} className="hover:text-[#09937F] transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/works`} className="hover:text-[#09937F] transition-colors">
                  {t('nav.works')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="hover:text-[#09937F] transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-[#09937F] transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Socials & Connect */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              {t('footer.social')}
            </h4>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] hover:text-[#09937F] hover:border-[#09937F]/40 transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
            <div className="pt-2 text-xs text-[#9EADA9]">
              <a href="mailto:hello@ishoot.bh" className="hover:text-[#09937F] transition-colors">
                hello@ishoot.bh
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9EADA9]/60">
          <div>
            © {new Date().getFullYear()} ishoot. {t('footer.allRights')}
          </div>
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/about`} className="hover:text-[#09937F] transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link href={`/${locale}/about`} className="hover:text-[#09937F] transition-colors">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
