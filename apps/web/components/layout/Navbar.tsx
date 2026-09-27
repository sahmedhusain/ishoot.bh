'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
import { Menu } from 'lucide-react';

export function Navbar() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      // Find the banners / hero area on the current page
      const hero = document.getElementById('home') || document.querySelector('[data-hero="true"]');
      if (hero) {
        const rect = hero.getBoundingClientRect();
        // Top bar only changes background when banners scroll finishes (reaches bottom of banners area)
        setIsScrolled(rect.bottom <= 75);
      } else {
        // Fallback for pages without a full banner area
        setIsScrolled(window.scrollY > 80);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [pathname]);

  const navLinks = [
    { href: `/${locale}`, label: t('nav.home') },
    { href: `/${locale}/works`, label: t('nav.works') },
    { href: `/${locale}/about`, label: t('nav.about') },
    { href: `/${locale}/contact`, label: t('nav.contact') },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
            ? 'py-3.5 bg-[#050807]/90 backdrop-blur-2xl'
            : 'py-5 bg-transparent'
          }`}
        style={isScrolled ? { boxShadow: '0 16px 48px rgba(9, 147, 127, 0.12), 0 -8px 24px rgba(9, 147, 127, 0.06), 0 0 2px rgba(255, 255, 255, 0.08)' } : {}}
      >
        <div className="shell flex items-center justify-between">
          {/* Logo with Smoothly Rotating 45-degree Aperture on Hover */}
          <Link href={`/${locale}`} className={`flex items-center gap-3 group ${locale === 'ar' ? 'flex-row-reverse' : ''}`}>
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <img
                src="/icon.svg"
                alt="ishoot"
                className="h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45 filter drop-shadow-[0_0_8px_rgba(9,147,127,0.3)]"
              />
            </div>
            <img
              src="/images/logo-wordmark.svg"
              alt="ishoot"
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Centered Desktop Navigation with Animated Hairline Reveal */}
          <nav className="hidden lg:flex items-center gap-9">
            {navLinks.map((link) => {
              const isActive =
                link.href === `/${locale}`
                  ? pathname === `/${locale}`
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative text-sm tracking-wide font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-[#9EADA9] hover:text-white'
                    }`}
                >
                  <span className="relative pb-1">
                    {link.label}
                    <span
                      className={`absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left bg-[#09937F] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                        }`}
                    />
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        links={navLinks}
      />
    </>
  );
}
