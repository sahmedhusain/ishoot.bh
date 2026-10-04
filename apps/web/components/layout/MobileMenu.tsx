"use client";
import {ContentImage} from "../shared/ContentImage";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "../../hooks/useTranslation";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { PublicCompanySettings } from "@ishoot/database/types";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links?: { href: string; label: string }[];
  company: PublicCompanySettings;
}

export function MobileMenu({
  isOpen,
  onClose,
  links,
  company,
}: MobileMenuProps) {
  const { t, locale, isRTL } = useTranslation();

  const navLinks = links || [
    { href: `/${locale}`, label: t("nav.home") },
    { href: `/${locale}/works`, label: t("nav.works") },
    { href: `/${locale}/about`, label: t("nav.about") },
    { href: `/${locale}/contact`, label: t("nav.contact") },
  ];

  const dialog = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <dialog
      ref={dialog}
      id="mobile-navigation"
      aria-label={t("common.menu")}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-0 w-full max-w-none h-[100dvh] max-h-none z-50 flex flex-col justify-between bg-[#050807] text-white p-6 sm:p-10"
      data-lenis-prevent
    >
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}`}
          onClick={onClose}
          className="flex items-center gap-2.5"
        >
          <ContentImage
            src={
              company.dark_icon_url ||
              company.icon_url
            }
            alt={t("common.brandIconAlt")}
            className="h-8 w-auto object-contain"
           width={40} height={40} />
          <ContentImage
            src={
              company.dark_logo_url ||
              company.logo_url
            }
            alt={t("common.brandLogoAlt")}
            className="h-6 w-auto object-contain"
           fallbackText={company.company_name_en}  width={240} height={60} />
        </Link>
        <div className="flex items-center gap-4">
          <button
            aria-label={t("common.closeMenu")}
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:text-[#09937F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="flex flex-col gap-6 my-auto py-8">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="group flex items-center justify-between text-3xl sm:text-4xl font-bold text-[#F2F6F5] hover:text-[#09937F] transition-colors py-2 border-b border-white/5"
          >
            <span>{link.label}</span>
            <ArrowIcon className="w-6 h-6 opacity-60 group-hover:opacity-100 transition-opacity duration-150 text-[#09937F]" />
          </Link>
        ))}
      </nav>

      <div className="space-y-4 pt-4 border-t border-white/10">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        <div className="text-center text-xs text-[#9EADA9]">
          {t("common.location")}
        </div>
      </div>
    </dialog>
  );
}
