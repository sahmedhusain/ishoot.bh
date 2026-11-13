"use client";

import * as React from "react";
import Link from "next/link";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion, SiteModeSwitch } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { LegalModal } from "../shared/LegalModal";
import { CreditCard, ShieldCheck, Truck, RotateCcw, HelpCircle, Store, MapPin, Phone, Mail } from "lucide-react";
import type { PublicCompanySettings, SocialLink } from "@platform/database/types";
import { SocialIcon } from "./SocialIcon";

interface FooterProps {
  company: PublicCompanySettings;
  socialLinks?: SocialLink[];
}

export function Footer({ company, socialLinks = [] }: FooterProps) {
  const { isArabic, t, locale } = useTranslation();
  const [modalType, setModalType] = React.useState<"terms" | "rules" | null>(null);

  const activeLinks = React.useMemo(() => {
    const seen = new Set<string>();
    return [...socialLinks]
      .filter((link) => link.is_active && !/whatsapp/i.test(link.platform))
      .sort((a, b) => a.display_order - b.display_order)
      .filter((link) => {
        const dest = link.url.trim().replace(/\/+$/, "");
        if (seen.has(dest)) return false;
        seen.add(dest);
        return true;
      });
  }, [socialLinks]);

  const renderModalContent = () => {
    if (modalType === "terms") {
      return (isArabic ? company.terms_ar : company.terms_en) || t("footer.termsUnavailable");
    }
    if (modalType === "rules") {
      return (isArabic ? company.rules_ar : company.rules_en) || t("footer.rulesUnavailable");
    }
    return "";
  };

  return (
    <SiteRegion region="footer">
      <footer className="site-footer bg-m3-surface-container-low border-t border-m3-outline-variant/60 pt-12 pb-8">
        <div className="shell space-y-12">
          {/* E-Commerce Trust / Value Props Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl bg-m3-surface-container border border-m3-outline-variant/40">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.fastDelivery", { defaultValue: "Fast Delivery" })}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.fastDeliverySub", { defaultValue: "Express courier to your door" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.branchPickup", { defaultValue: "Store Pickup" })}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.branchPickupSub", { defaultValue: "Ready in 1 hour at branches" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.securePayment", { defaultValue: "100% Secure" })}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.securePaymentSub", { defaultValue: "Encrypted checkout gateways" })}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.easyReturns", { defaultValue: "Easy Returns" })}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.easyReturnsSub", { defaultValue: "Hassle-free exchange policy" })}</p>
              </div>
            </div>
          </div>

          {/* Main Footer Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Store Branding */}
            <div className="space-y-4 md:col-span-1">
              <Link href={`/${locale}`} className="flex items-center gap-3 group w-fit">
                <BrandImage company={company} icon className="h-9 w-9 shrink-0 object-contain" />
                <BrandImage company={company} className="h-6 min-w-0 max-w-[12rem] object-contain" />
              </Link>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                {(isArabic ? company.address_ar : company.address_en) ||
                  (isArabic ? company.tagline_ar : company.tagline_en)}
              </p>
              {company.cr_number && (
                <p className="text-[11px] text-m3-on-surface-variant/80 font-mono">
                  {t("footer.registrationLabel")}: {company.cr_number}
                </p>
              )}
            </div>

            {/* Shop Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {t("store.shopping", { defaultValue: "Shopping" })}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                <li>
                  <Link href={`/${locale}/products`} className="hover:text-m3-primary transition-colors">
                    {t("nav.products")}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/offers`} className="hover:text-m3-primary transition-colors">
                    {t("nav.offers")}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/branches`} className="hover:text-m3-primary transition-colors">
                    {t("nav.branches")}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/cart`} className="hover:text-m3-primary transition-colors">
                    {t("store.cart")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account & Orders */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {t("nav.account")}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                <li>
                  <Link href={`/${locale}/account`} className="hover:text-m3-primary transition-colors">
                    {t("account.signIn")}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/account?tab=orders`} className="hover:text-m3-primary transition-colors">
                    {t("account.orders")}
                  </Link>
                </li>
                <li>
                  <Link href={`/${locale}/account?tab=wishlist`} className="hover:text-m3-primary transition-colors">
                    {t("account.wishlist")}
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setModalType("terms")}
                    className="hover:text-m3-primary transition-colors text-start bg-transparent border-none p-0"
                  >
                    {t("footer.terms")}
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Social */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {t("store.support", { defaultValue: "Customer Support" })}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                {company.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-m3-primary" />
                    <a href={`tel:${company.phone}`} dir="ltr" className="hover:text-m3-primary transition-colors">
                      {company.phone}
                    </a>
                  </li>
                )}
                {company.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-m3-primary" />
                    <a href={`mailto:${company.email}`} dir="ltr" className="hover:text-m3-primary transition-colors">
                      {company.email}
                    </a>
                  </li>
                )}
              </ul>

              {activeLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {activeLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 w-8 rounded-full bg-m3-surface-container-high grid place-items-center text-m3-on-surface hover:bg-m3-primary hover:text-m3-on-primary transition-colors"
                      title={link.platform}
                    >
                      <SocialIcon name={link.platform} hint={link.icon} className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Copyright & Payment Gateways */}
          <div className="pt-6 border-t border-m3-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-m3-on-surface-variant">
            <div>
              © {new Date().getFullYear()}{" "}
              {isArabic
                ? company.company_name_ar || company.company_name_en
                : company.company_name_en}{" "}
              · {t("footer.allRights")}
            </div>

            <div className="flex items-center gap-2 text-m3-on-surface-variant">
              <CreditCard className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              <span className="text-[11px] font-medium">{t("store.acceptedPayments", { defaultValue: "Visa · Mastercard · BenefitPay · Apple Pay · COD" })}</span>
            </div>
          </div>
        </div>

        <LegalModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          title={modalType === "terms" ? t("footer.termsModalTitle") : t("footer.rulesModalTitle")}
          content={renderModalContent()}
        />
      </footer>
    </SiteRegion>
  );
}

export const StoreFooter = Footer;
