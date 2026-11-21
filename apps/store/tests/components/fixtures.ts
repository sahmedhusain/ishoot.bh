import * as React from "react";
import { normalizeTheme } from "@platform/database/constants/theme";
import { defaultWebsiteConfig, resolveWebsiteConfig } from "@platform/database/website-config";
import type {
  HeroBanner,
  PortfolioCategory,
  PortfolioItem,
  PublicCompanySettings,
  SocialLink,
} from "@platform/database/types";
import type { CartQuote, CustomerProfile, DeliveryOptions } from "@platform/database";
import type { PublicBranch } from "@platform/database/constants/website-commerce";
import {
  CompanyCurrencyProvider,
  ConfirmationProvider,
  PhoneCountryProvider,
} from "@platform/ui";
import { SiteProvider } from "../../components/site/SiteProvider";
import { SiteThemeProvider } from "../../components/site/SiteTheme";
import type { SiteInfo } from "../../lib/site-copy";

export function makeStoreCompany(
  overrides: Partial<PublicCompanySettings> = {},
): PublicCompanySettings {
  return {
    setup_completed: true,
    theme: normalizeTheme({}),
    content_languages: ["en", "ar"],
    primary_language: "en",
    business_activity: "creative_studio",
    tagline_en: "Pro Production Gear & Merch",
    tagline_ar: "معدات الإنتاج والمنتجات",
    founded_year: 2018,
    city: "Manama",
    country: "BH",
    map_url: "https://maps.google.com/?q=26.2285,50.5860",
    website_domain: "store.example.test",
    default_currency: "BHD",
    company_name_en: "Zayed Store",
    company_name_ar: "متجر زايد",
    cr_number: "CR-12345",
    address_en: "Seef District, Manama, Bahrain",
    address_ar: "ضاحية السيف، المنامة، البحرين",
    phone: "+97317000001",
    whatsapp_phone: "+97339000001",
    email: "store@example.test",
    website: "https://store.example.test",
    instagram_url: "https://instagram.com/example",
    linkedin_url: "https://linkedin.com/company/example",
    youtube_url: "https://youtube.com/@example",
    time_zone: "Asia/Bahrain",
    logo_url: "/media/logo-light.svg",
    dark_logo_url: "/media/logo-dark.svg",
    icon_url: "/media/icon-light.svg",
    dark_icon_url: "/media/icon-dark.svg",
    terms_en: "Store terms of sale apply.",
    terms_ar: "تطبق شروط البيع.",
    rules_en: "14-day unused return policy.",
    rules_ar: "سياسة الاسترجاع خلال 14 يوماً.",
    ...overrides,
  };
}

export function makeResolvedConfig() {
  return resolveWebsiteConfig(defaultWebsiteConfig, "dark");
}

export function makeBranches(): PublicBranch[] {
  return [
    {
      id: "br-1",
      nameEn: "Manama Flagship",
      nameAr: "الفرع الرئيسي المنامة",
      addressEn: "Seef District, Road 2819",
      addressAr: "ضاحية السيف، طريق 2819",
      city: "Manama",
      country: "BH",
      phone: "+97317000001",
      hoursEn: "Sun–Thu 09:00–18:00",
      hoursAr: "الأحد–الخميس 09:00–18:00",
      directionsUrl: "",
      latitude: 26.2285,
      longitude: 50.586,
      active: true,
      pickup: true,
    },
  ];
}

export function makeSiteInfo(overrides: Partial<SiteInfo> = {}): SiteInfo {
  const config = makeResolvedConfig();
  return {
    activity: config.purpose,
    languages: ["en", "ar"],
    primaryLanguage: "en",
    interfaceCopy: config.interfaceCopy,
    collection: {
      ...config.collection,
      slug: "products",
    },
    articles: config.articles,
    heroStyle: config.heroStyle,
    inquiry: config.inquiry,
    whatsappButton: false,
    commerce: {
      ...config.commerce,
      branches: makeBranches(),
      facetLabels: ["Brand"],
    },
    showEquipment: true,
    footerInvitation: true,
    currency: "BHD",
    companyNameEn: "Zayed Store",
    companyNameAr: "متجر زايد",
    ...overrides,
  };
}

export function makeCategories(): PortfolioCategory[] {
  return [
    {
      id: "cat-1",
      slug: "cameras",
      name_en: "Cameras",
      name_ar: "الكاميرات",
      display_order: 1,
    },
    {
      id: "cat-2",
      slug: "lighting",
      name_en: "Lighting",
      name_ar: "الإضاءة",
      display_order: 2,
    },
  ];
}

export function makeCatalogueItems(): PortfolioItem[] {
  const cats = makeCategories();
  return [
    {
      id: "prod-1",
      category_id: "cat-1",
      category: cats[0],
      slug: "cinema-rig",
      title_en: "Cinema Rig Pro",
      title_ar: "منصة التصوير الاحترافية",
      subtitle_en: "Carbon shoulder mount",
      subtitle_ar: "حامل كتف كربوني",
      client_name: "Zayed Gear",
      year: 2026,
      price: 120,
      price_note_en: "In Stock",
      price_note_ar: "متوفر",
      aspect_ratio: "1:1",
      thumbnail_url: "/media/rig.jpg",
      attributes: [{ labelEn: "Brand", labelAr: "الماركة", valueEn: "ARRI", valueAr: "أري" }],
      is_featured: true,
      display_order: 1,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "prod-2",
      category_id: "cat-2",
      category: cats[1],
      slug: "cob-light-300",
      title_en: "Bi-Color COB Light 300W",
      title_ar: "إضاءة ثنائية اللون 300 واط",
      client_name: "Zayed Gear",
      year: 2026,
      price: 85,
      aspect_ratio: "1:1",
      thumbnail_url: "/media/light.jpg",
      attributes: [{ labelEn: "Brand", labelAr: "الماركة", valueEn: "Aputure", valueAr: "أبوتشر" }],
      is_featured: false,
      display_order: 2,
      created_at: "2026-02-01T00:00:00Z",
    },
  ];
}

export function makeBanners(): HeroBanner[] {
  return [
    {
      id: "ban-1",
      title_en: "Studio Grade Equipment",
      title_ar: "معدات بمستوى الاستوديو",
      subtitle_en: "Same-day Manama dispatch",
      subtitle_ar: "توصيل في نفس اليوم بالمنامة",
      media_type: "image",
      media_url: "/media/store-hero.jpg",
      display_order: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
}

export function makeCustomerProfile(
  overrides: Partial<CustomerProfile> = {},
): CustomerProfile {
  return {
    id: "cust-1",
    email: "buyer@example.test",
    name: "Layla Khalifa",
    phone: "+97339001122",
    locale: "en",
    has_password: true,
    google: false,
    apple: false,
    marketing_opt_in: true,
    email_verified: true,
    ...overrides,
  };
}

export function makeAddresses() {
  return [
    {
      id: "addr-1",
      label: "Studio Office",
      name: "Layla Khalifa",
      phone: "+97339001122",
      line1: "Building 42, Road 2819",
      line2: "Floor 3",
      area: "Seef",
      city: "Manama",
      country: "BH",
      postal_code: "00973",
      is_default: true,
    },
  ];
}

export function makeCartQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    lines: [
      {
        productId: "prod-1",
        variantKey: "std",
        sku: "RIG-01",
        description: "Cinema Rig Pro · Standard",
        nameEn: "Cinema Rig Pro",
        nameAr: "منصة التصوير الاحترافية",
        variantEn: "Standard",
        variantAr: "قياسي",
        imageUrl: "/media/rig.jpg",
        quantity: 2,
        unitPrice: 120,
        vatExempt: false,
        trackStock: true,
      },
    ],
    problems: [],
    couponCode: null,
    currency: "BHD",
    zoneId: "zone-1",
    minOrder: null,
    subtotal: 240,
    discount: 0,
    deliveryFee: 2,
    vatAmount: 24,
    total: 266,
    vatEnabled: true,
    vatPercentage: 10,
    freeDeliveryOver: null,
    ...overrides,
  } as CartQuote;
}

export function makeDeliveryOptions(): DeliveryOptions {
  return {
    covered: true,
    requireSlot: false,
    slaHours: 24,
    slots: [
      {
        date: "2026-12-01",
        slotId: "slot-am",
        start: "09:00",
        end: "12:00",
        left: 2,
      },
    ],
  } as unknown as DeliveryOptions;
}

export function makeSocialLinks(): SocialLink[] {
  return [
    {
      id: "soc-1",
      platform: "instagram",
      url: "https://instagram.com/example",
      is_active: true,
      display_order: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ];
}

export function StoreTestProviders({
  children,
  site = makeSiteInfo(),
  design = makeResolvedConfig().design,
}: {
  children: React.ReactNode;
  site?: SiteInfo;
  design?: ReturnType<typeof makeResolvedConfig>["design"];
}) {
  return React.createElement(
    CompanyCurrencyProvider,
    { currency: site.currency },
    React.createElement(
      PhoneCountryProvider,
      { country: "BH" },
      React.createElement(
        ConfirmationProvider,
        null,
        React.createElement(
          SiteProvider,
          { site },
          React.createElement(SiteThemeProvider, { design }, children),
        ),
      ),
    ),
  );
}

/** Recursively resolves async React Server Components so jsdom can render nested RSC trees. */
export async function resolveServerJsx(node: React.ReactNode): Promise<React.ReactNode> {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") {
    return node;
  }
  if (Array.isArray(node)) {
    return Promise.all(node.map((child) => resolveServerJsx(child)));
  }
  if (React.isValidElement(node)) {
    const type = node.type;
    if (typeof type === "function" && type.constructor?.name === "AsyncFunction") {
      const rendered = await (type as (props: unknown) => Promise<React.ReactNode>)(node.props);
      return resolveServerJsx(rendered);
    }
    const props = node.props as Record<string, unknown> | undefined;
    if (props && "children" in props && props.children !== undefined) {
      const resolvedChildren = await resolveServerJsx(props.children as React.ReactNode);
      return React.cloneElement(node as React.ReactElement<Record<string, unknown>>, {
        children: resolvedChildren,
      });
    }
  }
  return node;
}
