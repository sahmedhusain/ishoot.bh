"use client";

import * as React from "react";
import Link from "next/link";
import { BrandImage } from "../site/BrandImage";
import { SiteRegion, SiteModeSwitch } from "../site/SiteTheme";
import { useTranslation } from "../../hooks/useTranslation";
import { LegalModal } from "../shared/LegalModal";
import {
  CheckCircle2,
  Cookie,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import type { PublicCompanySettings, SocialLink } from "@platform/database/types";
import { SocialIcon } from "./SocialIcon";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { openCookieSettingsModal } from "./StorePreferencesBar";

interface FooterProps {
  company: PublicCompanySettings;
  socialLinks?: SocialLink[];
  sslBadgeEnabled?: boolean;
  crNumber?: string;
}

export function Footer({ company, socialLinks = [], sslBadgeEnabled, crNumber }: FooterProps) {
  void sslBadgeEnabled;
  const { isArabic, t, locale } = useTranslation();
  const [modalType, setModalType] = React.useState<"terms" | "rules" | "warranty" | "vat" | null>(null);
  const [newsletterEmail, setNewsletterEmail] = React.useState("");
  const [newsletterDone, setNewsletterDone] = React.useState(false);

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
    if (modalType === "warranty") {
      return t("store.warrantyPolicyBody", {
        defaultValue:
          "1. Return & Exchange Window:\nUnused sealed products may be returned within 7-14 days with original invoice.\n\n2. Warranty Service:\nApproved returns can be credited directly to your Store Wallet, original payment method, or replaced.",
      });
    }
    if (modalType === "vat") {
      return t("store.vatPolicyBody", {
        defaultValue:
          "1. VAT & Official Store Currency:\nAll product prices, taxes, and checkout totals are billed cleanly in the store's official company currency.\n\n2. Shipping & Pickup Location:\nOrders are dispatched and available for collection from the store's configured company location.",
      });
    }
    return "";
  };

  return (
    <SiteRegion region="footer">
      <footer className="site-footer bg-m3-surface-container-low border-t border-m3-outline-variant/60 pt-8 pb-8">
        <div className="shell space-y-10">
          {/* Top Secure Payments Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-m3-outline-variant bg-m3-surface px-5 py-3.5">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-on-surface">
              <CreditCard className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              {t("store.acceptedPayments")}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {["Apple Pay", "Visa", "Mastercard", "BenefitPay", "Tamara", "Tabby", "Amwal", "PayPal", "COD", "Wallet Credit"].map((method) => (
                <span
                  key={method}
                  className="px-2.5 py-1 rounded-full border border-m3-outline-variant bg-m3-surface-container-low text-[11px] font-semibold text-m3-on-surface"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {/* Main 5-Column Directory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Col 1: Brand + Newsletter + Social */}
            <div className="space-y-4 lg:col-span-1">
              <Link href={`/${locale}`} className="flex items-center gap-2.5 group w-fit">
                <BrandImage company={company} icon className="h-9 w-9 shrink-0 object-contain" />
                <BrandImage company={company} className="h-6 min-w-0 max-w-[11rem] object-contain" />
              </Link>
              <p className="text-xs text-m3-on-surface-variant leading-relaxed">
                {(isArabic ? company.tagline_ar : company.tagline_en) ||
                  (isArabic ? company.address_ar : company.address_en)}
              </p>

              <form
                data-testid="newsletter-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  setNewsletterDone(true);
                  setNewsletterEmail("");
                }}
                className="space-y-1.5"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-m3-on-surface">
                  {t("store.newsletterTitle", { defaultValue: "Stay in the loop" })}
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t("store.newsletterPlaceholder", { defaultValue: "you@example.com" })}
                    aria-label={t("store.newsletterTitle", { defaultValue: "Newsletter email" })}
                    className="flex-1 min-w-0 h-10 rounded-full bg-m3-surface border border-m3-outline-variant px-3.5 text-xs text-m3-on-surface placeholder:text-m3-on-surface-variant focus:outline-none focus:border-m3-primary"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-full bg-m3-primary text-m3-on-primary text-xs font-bold shrink-0 hover:brightness-95 cursor-pointer"
                  >
                    {t("store.newsletterSubscribe", { defaultValue: "Join" })}
                  </button>
                </div>
                {newsletterDone && (
                  <p className="text-[11px] text-m3-primary font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    {t("store.newsletterSubscribed", { defaultValue: "Subscribed to store deals." })}
                  </p>
                )}
              </form>

              {activeLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
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

            {/* Col 2: Shop */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {t("store.shopping")}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                <li><Link href={`/${locale}/shop`} className="hover:text-m3-primary transition-colors">{isArabic ? "تسوق الكل" : "Shop All"}</Link></li>
                <li><Link href={`/${locale}/categories`} className="hover:text-m3-primary transition-colors">{isArabic ? "كل الفئات" : "Categories"}</Link></li>
                <li><Link href={`/${locale}/ready-made-pcs`} className="hover:text-m3-primary transition-colors">{isArabic ? "الباقات الجاهزة" : "Curated Packages"}</Link></li>
                <li><Link href={`/${locale}/build-pc`} className="hover:text-m3-primary transition-colors">{isArabic ? "مصمم الباقات" : "Package Builder"}</Link></li>
                <li><Link href={`/${locale}/new-arrivals`} className="hover:text-m3-primary transition-colors">{t("store.navNewArrivals", { defaultValue: "New Arrivals" })}</Link></li>
                <li><Link href={`/${locale}/black-friday`} className="hover:text-m3-primary transition-colors">{isArabic ? "عروض الموسم" : "Season Sale"}</Link></li>
                <li><Link href={`/${locale}/deals`} className="hover:text-m3-primary transition-colors">{t("store.navDeals", { defaultValue: "Deals & Offers" })}</Link></li>
                <li><Link href={`/${locale}/drops`} className="hover:text-m3-primary transition-colors">{isArabic ? "إصدارات محدودة" : "Drops"}</Link></li>
                <li><Link href={`/${locale}/gift-cards`} className="hover:text-m3-primary transition-colors">{t("store.navGiftCards", { defaultValue: "Gift Cards" })}</Link></li>
              </ul>
            </div>

            {/* Col 3: Support & Account */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {t("store.support")}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                <li><Link href={`/${locale}/login`} className="hover:text-m3-primary transition-colors">{t("account.signIn")}</Link></li>
                <li><Link href={`/${locale}/register`} className="hover:text-m3-primary transition-colors">{t("store.navRegister", { defaultValue: "Create Account" })}</Link></li>
                <li><Link href={`/${locale}/account`} className="hover:text-m3-primary transition-colors">{t("nav.account")}</Link></li>
                <li><Link href={`/${locale}/account/orders`} className="hover:text-m3-primary transition-colors">{t("account.orders")}</Link></li>
                <li><Link href={`/${locale}/account/wallet`} className="hover:text-m3-primary transition-colors">{isArabic ? "المحفظة وبطاقات الهدايا" : "Wallet & Gift Cards"}</Link></li>
                <li><Link href={`/${locale}/account/returns`} className="hover:text-m3-primary transition-colors">{isArabic ? "المرتجعات والاسترداد" : "Returns & Refunds"}</Link></li>
                <li><Link href={`/${locale}/wishlist`} className="hover:text-m3-primary transition-colors">{t("account.wishlist")}</Link></li>
                <li><Link href={`/${locale}/track-order`} className="hover:text-m3-primary transition-colors">{isArabic ? "تتبع الطلب" : "Track Order"}</Link></li>
                <li><Link href={`/${locale}/stores`} className="hover:text-m3-primary transition-colors">{isArabic ? "فروعنا" : "Our Stores"}</Link></li>
                <li><Link href={`/${locale}/rewards`} className="hover:text-m3-primary transition-colors">{isArabic ? "نقاط الولاء والمحفظة" : "Loyalty & Rewards"}</Link></li>
                <li><Link href={`/${locale}/giveaways/seasonal`} className="hover:text-m3-primary transition-colors">{isArabic ? "سحوبات الجوائز" : "Giveaways"}</Link></li>
                <li><Link href={`/${locale}/page/faq`} className="hover:text-m3-primary transition-colors">{t("store.navFaq", { defaultValue: "FAQ" })}</Link></li>
              </ul>
            </div>

            {/* Col 4: Legal & Policies */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {isArabic ? "السياسات والضمان" : "Legal & Policies"}
              </h3>
              <ul className="space-y-2 text-xs text-m3-on-surface-variant">
                <li><Link href={`/${locale}/terms`} className="hover:text-m3-primary transition-colors">{t("footer.terms")}</Link></li>
                <li><Link href={`/${locale}/privacy`} className="hover:text-m3-primary transition-colors">{t("footer.rules")}</Link></li>
                <li><Link href={`/${locale}/return-policy`} className="hover:text-m3-primary transition-colors">{t("store.navReturnPolicy", { defaultValue: "Return Policy" })}</Link></li>
                <li><Link href={`/${locale}/warranty`} className="hover:text-m3-primary transition-colors">{t("store.navWarrantyPolicy", { defaultValue: "Warranty Policy" })}</Link></li>
                <li><Link href={`/${locale}/devo-warranty`} className="hover:text-m3-primary transition-colors">{isArabic ? "الضمان الممتد" : "Extended Warranty"}</Link></li>
                <li><Link href={`/${locale}/vat-tax`} className="hover:text-m3-primary transition-colors">{t("store.navVatPolicy", { defaultValue: "VAT & Tax" })}</Link></li>
                <li><Link href={`/${locale}/page/payment-methods`} className="hover:text-m3-primary transition-colors">{t("store.navPaymentMethods", { defaultValue: "Payment Methods" })}</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType("terms")}
                    className="hover:text-m3-primary transition-colors text-start bg-transparent border-none p-0"
                  >
                    {t("store.quickTermsModal", { defaultValue: "Quick Terms" })}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    data-testid="cookie-settings-trigger"
                    onClick={() => openCookieSettingsModal()}
                    className="inline-flex items-center gap-1 hover:text-m3-primary transition-colors text-start bg-transparent border-none p-0"
                  >
                    <Cookie className="h-3 w-3" aria-hidden="true" />
                    {t("store.cookieSettings", { defaultValue: "Cookie Settings" })}
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 5: Get in touch */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-m3-on-surface">
                {isArabic ? "تواصل معنا" : "Get in touch"}
              </h3>
              <ul className="space-y-2.5 text-xs text-m3-on-surface-variant">
                {(company.address_en || company.address_ar) && (
                  <li className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-m3-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{isArabic ? company.address_ar || company.address_en : company.address_en || company.address_ar}</span>
                  </li>
                )}
                {company.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                    <a href={`tel:${company.phone}`} dir="ltr" className="hover:text-m3-primary transition-colors">
                      {company.phone}
                    </a>
                  </li>
                )}
                {company.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-m3-primary shrink-0" aria-hidden="true" />
                    <a href={`mailto:${company.email}`} dir="ltr" className="hover:text-m3-primary transition-colors">
                      {company.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* 4-Column Trust Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-m3-surface border border-m3-outline-variant/60">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.fastDelivery")}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.fastDeliverySub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.guaranteed")}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.guaranteedSub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.branchPickup")}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.branchPickupSub")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-m3-primary/10 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4 text-m3-primary" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-m3-on-surface">{t("store.easyReturns")}</h4>
                <p className="text-[11px] text-m3-on-surface-variant">{t("store.easyReturnsSub")}</p>
              </div>
            </div>
          </div>

          {/* Bottom Copyright, SSL Badge & Controls */}
          <div className="pt-4 border-t border-m3-outline-variant/40 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs text-m3-on-surface-variant">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <span>
                © {new Date().getFullYear()}{" "}
                {isArabic
                  ? company.company_name_ar || company.company_name_en
                  : company.company_name_en}{" "}
                · {t("footer.allRights")}
              </span>
              {(company.cr_number || crNumber) && (
                <span className="font-mono text-[11px]" dir="ltr">
                  CR {company.cr_number || crNumber}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <LanguageSwitcher variant="footer" />
              <SiteModeSwitch locale={locale} placement="up" />
            </div>
          </div>
        </div>

        <LegalModal
          isOpen={modalType !== null}
          onClose={() => setModalType(null)}
          title={
            modalType === "terms"
              ? t("footer.termsModalTitle")
              : modalType === "rules"
                ? t("footer.rulesModalTitle")
                : modalType === "warranty"
                  ? t("store.warrantyPolicyTitle", { defaultValue: "Warranty & Returns Policy" })
                  : t("store.vatPolicyTitle", { defaultValue: "VAT & Regional Shipping" })
          }
          content={renderModalContent()}
        />
      </footer>
    </SiteRegion>
  );
}

export const StoreFooter = Footer;
