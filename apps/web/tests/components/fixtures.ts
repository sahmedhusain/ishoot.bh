import * as React from "react";
import { normalizeTheme } from "@platform/database/constants/theme";
import { defaultWebsiteConfig, resolveWebsiteConfig } from "@platform/database/website-config";
import type {
  ClientLogo,
  Faq,
  HeroBanner,
  PortfolioCategory,
  PortfolioItem,
  PublicCompanySettings,
  Review,
  SocialLink,
  StudioEquipment,
} from "@platform/database/types";
import type { PublicArticle } from "@platform/database/queries/cms-articles";
import type { CmsPageRecord } from "@platform/database/queries/cms-pages";
import type { WebsiteSnapshot } from "@platform/database";
import { CompanyCurrencyProvider, PhoneCountryProvider } from "@platform/ui";
import { SiteProvider } from "../../components/site/SiteProvider";
import { SiteThemeProvider } from "../../components/site/SiteTheme";
import type { SiteInfo } from "../../lib/site-copy";

export function makeWebCompany(
  overrides: Partial<PublicCompanySettings> = {},
): PublicCompanySettings {
  return {
    setup_completed: true,
    theme: normalizeTheme({}),
    content_languages: ["en", "ar"],
    primary_language: "en",
    business_activity: "creative_studio",
    tagline_en: "Visual Production & Creative Direction",
    tagline_ar: "الإنتاج البصري والإدارة الإبداعية",
    founded_year: 2018,
    city: "Manama",
    country: "BH",
    map_url: "https://maps.google.com/?q=26.2285,50.5860",
    website_domain: "example.com",
    default_currency: "BHD",
    company_name_en: "Zayed Studio",
    company_name_ar: "استوديو زايد",
    cr_number: "CR-12345",
    address_en: "Seef District, Manama, Bahrain",
    address_ar: "ضاحية السيف، المنامة، البحرين",
    phone: "+97317000001",
    whatsapp_phone: "+97339000001",
    email: "hello@example.test",
    website: "https://example.test",
    instagram_url: "https://instagram.com/example",
    linkedin_url: "https://linkedin.com/company/example",
    youtube_url: "https://youtube.com/@example",
    time_zone: "Asia/Bahrain",
    logo_url: "/media/logo-light.svg",
    dark_logo_url: "/media/logo-dark.svg",
    icon_url: "/media/icon-light.svg",
    dark_icon_url: "/media/icon-dark.svg",
    ceo_name_en: "Tariq Al-Zayed",
    ceo_name_ar: "طارق الزايد",
    ceo_title_en: "Founder & Executive Director",
    ceo_title_ar: "المؤسس والمدير التنفيذي",
    ceo_quote_en: "Every frame is built with intent.",
    ceo_quote_ar: "كل لقطة تُصنع بشغف.",
    mission_en: "Crafting visual narratives across the Gulf.",
    mission_ar: "صناعة القصص البصرية في الخليج.",
    vision_en: "Regional benchmark in production.",
    vision_ar: "المعيار الإقليمي للإنتاج.",
    about_text_en: "Independent creative production house in Bahrain.",
    about_text_ar: "دار إنتاج إبداعي مستقلة في البحرين.",
    terms_en: "Standard service terms apply.",
    terms_ar: "تطبق شروط الخدمة القياسية.",
    rules_en: "Respect copyright notices.",
    rules_ar: "احترم حقوق النشر.",
    ...overrides,
  };
}

export function makeResolvedConfig() {
  return resolveWebsiteConfig(defaultWebsiteConfig, "dark");
}

export function makeSiteInfo(overrides: Partial<SiteInfo> = {}): SiteInfo {
  const config = makeResolvedConfig();
  return {
    activity: config.purpose,
    languages: ["en", "ar"],
    primaryLanguage: "en",
    interfaceCopy: config.interfaceCopy,
    collection: config.collection,
    articles: config.articles,
    heroStyle: config.heroStyle,
    inquiry: config.inquiry,
    whatsappButton: false,
    commerce: {
      ...config.commerce,
      facetLabels: ["Format"],
      branches: [
        {
          id: "br-1",
          nameEn: "Manama HQ",
          nameAr: "المقر الرئيسي المنامة",
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
      ],
    },
    showEquipment: true,
    footerInvitation: true,
    currency: "BHD",
    companyNameEn: "Zayed Studio",
    companyNameAr: "استوديو زايد",
    ...overrides,
  };
}

export function makeCategories(): PortfolioCategory[] {
  return [
    {
      id: "cat-1",
      slug: "commercials",
      name_en: "Commercials",
      name_ar: "الإعلانات",
      display_order: 1,
    },
    {
      id: "cat-2",
      slug: "documentary",
      name_en: "Documentary",
      name_ar: "الوثائقيات",
      display_order: 2,
    },
  ];
}

export function makePortfolioItems(): PortfolioItem[] {
  const categories = makeCategories();
  return [
    {
      id: "work-1",
      category_id: "cat-1",
      category: categories[0],
      slug: "pearl-horizon",
      title_en: "Pearl Horizon Campaign",
      title_ar: "حملة أفق اللؤلؤ",
      client_name: "Gulf Aviation",
      year: 2026,
      subtitle_en: "Flagship launch film",
      subtitle_ar: "فيلم الإطلاق الرئيسي",
      aspect_ratio: "16:9",
      thumbnail_url: "/media/work-1.jpg",
      preview_video_url: "/media/work-1-preview.mp4",
      full_video_url: "/media/work-1-full.mp4",
      gallery_urls: ["/media/work-1.jpg"],
      description_en: "Shot on anamorphic lenses across Bahrain.",
      description_ar: "تم التصوير بعدسات سينمائية في البحرين.",
      attributes: [{ labelEn: "Format", labelAr: "الصيغة", valueEn: "4K Anamorphic", valueAr: "4K سينمائي" }],
      credits: { director: "Nasser Bader", dop: "Laila Hassan" },
      is_featured: true,
      display_order: 1,
      created_at: "2026-01-10T00:00:00Z",
    },
    {
      id: "work-2",
      category_id: "cat-2",
      category: categories[1],
      slug: "desert-craft",
      title_en: "Desert Craft",
      title_ar: "حرفة الصحراء",
      client_name: "Heritage Authority",
      year: 2025,
      aspect_ratio: "1:1",
      thumbnail_url: "/media/work-2.jpg",
      attributes: [{ labelEn: "Format", labelAr: "الصيغة", valueEn: "6K RAW", valueAr: "6K خام" }],
      is_featured: false,
      display_order: 2,
      created_at: "2025-11-05T00:00:00Z",
    },
  ];
}

export function makeBanners(): HeroBanner[] {
  return [
    {
      id: "ban-1",
      title_en: "Cinema Built For Brands",
      title_ar: "سينما مصممة للعلامات التجارية",
      subtitle_en: "Commercial direction & post-production",
      subtitle_ar: "الإخراج التجاري وما بعد الإنتاج",
      media_type: "image",
      media_url: "/media/hero-1.jpg",
      poster_url: "/media/hero-1.jpg",
      display_order: 1,
      is_active: true,
      cta_label_en: "Start a Project",
      cta_label_ar: "ابدأ مشروعاً",
      cta_link: "/en/contact",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
}

export function makeArticles(): PublicArticle[] {
  return [
    {
      id: "art-1",
      slug: "lighting-in-desert",
      title_en: "Natural Light in Desert Shoots",
      title_ar: "الإضاءة الطبيعية في التصوير الصحراوي",
      excerpt_en: "Field techniques for high-contrast locations.",
      excerpt_ar: "تقنيات ميدانية للمواقع عالية التباين.",
      body_html_en: "<p>Golden hour scheduling is critical.</p>",
      body_html_ar: "<p>توقيت الساعة الذهبية حاسم.</p>",
      cover_url: "/media/article-1.jpg",
      category: "insights",
      tags: ["cinematography", "outdoor"],
      author_name: "Tariq Al-Zayed",
      publish_at: "2026-02-01T00:00:00Z",
      featured: true,
      seo_title_en: "Natural Light",
      seo_title_ar: "الإضاءة الطبيعية",
      seo_description_en: "Field guide",
      seo_description_ar: "دليل ميداني",
    },
  ];
}

export function makeReviews(): Review[] {
  return [
    {
      id: "rev-1",
      authorEn: "Sara Mansoor",
      authorAr: "سارة منصور",
      companyEn: "Al-Noor Bank",
      companyAr: "بنك النور",
      quoteEn: "Delivered ahead of schedule with extraordinary polish.",
      quoteAr: "تم التسليم قبل الموعد بجودة استثنائية.",
      rating: 5,
      year: "2026",
      isApproved: true,
      sortOrder: 1,
    },
  ];
}

export function makeFaqs(): Faq[] {
  return [
    {
      id: "faq-1",
      questionEn: "What is your typical turnaround?",
      questionAr: "ما هي مدة التنفيذ المعتادة؟",
      answerEn: "Two to four weeks depending on post-production scope.",
      answerAr: "من أسبوعين إلى أربعة أسابيع حسب نطاق المونتاج.",
      category: "process",
      isPublished: true,
      sortOrder: 1,
    },
  ];
}

export function makeEquipment(): StudioEquipment[] {
  return [
    {
      id: "eq-1",
      category: "Camera",
      model_name: "ARRI Alexa 35",
      name_ar: "أري أليكسا 35",
      brand: "ARRI",
      specification: "4.6K Super 35",
      description_en: "Primary cinema camera package.",
      description_ar: "حزمة الكاميرا السينمائية الرئيسية.",
      image_url: "/media/alexa.jpg",
      quantity: 2,
      display_order: 1,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
}

export function makeClientLogos(): ClientLogo[] {
  return [
    {
      id: "cl-1",
      client_name: "Gulf Aviation",
      logo_svg_url: "/media/client-1.svg",
      website_url: "https://gulfaviation.example",
      display_order: 1,
      is_active: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
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

export function makeWebsiteSnapshot(): WebsiteSnapshot {
  const company = makeWebCompany();
  return {
    config: makeResolvedConfig(),
    brandTheme: company.theme,
    brandAssets: {
      logo_url: company.logo_url,
      dark_logo_url: company.dark_logo_url,
      icon_url: company.icon_url,
      dark_icon_url: company.dark_icon_url,
    },
    banners: makeBanners(),
    portfolio: makePortfolioItems(),
    categories: makeCategories(),
    clients: makeClientLogos(),
    faqs: makeFaqs(),
    stats: [
      {
        id: "st-1",
        value: "140+",
        labelEn: "Campaigns",
        labelAr: "حملة",
        sortOrder: 1,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      } as unknown as WebsiteSnapshot["stats"][number],
    ],
    services: [
      {
        id: "srv-1",
        nameEn: "Commercial Film",
        nameAr: "فيلم تجاري",
        descriptionEn: "End-to-end campaign production.",
        descriptionAr: "إنتاج الحملات من البداية للنهاية.",
        imageUrl: "/media/service-1.jpg",
      },
    ],
    pages: [],
    articles: makeArticles(),
    socialLinks: makeSocialLinks(),
  };
}

export function makeCmsPage(overrides: Partial<CmsPageRecord> = {}): CmsPageRecord {
  return {
    id: "pg-1",
    slug: "showcase-custom",
    page_type: "custom",
    title_en: "Custom Studio Showcase",
    title_ar: "عرض الاستوديو المخصص",
    seo_title_en: "Showcase",
    seo_title_ar: "العرض",
    seo_description_en: "Description",
    seo_description_ar: "الوصف",
    blocks: [
      {
        id: "blk-1",
        type: "cta",
        visible: true,
        tone: "inherit",
        data: {
          title: { en: "Book a Shoot", ar: "احجز جلسة" },
          body: { en: "Talk with our producers.", ar: "تحدث مع منتجينا." },
          buttonLabel: { en: "Contact Us", ar: "تواصل معنا" },
          buttonUrl: "/en/contact",
        },
      },
    ],
    is_visible: true,
    in_header: true,
    in_footer: true,
    sort_order: 1,
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function WebTestProviders({
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
        SiteProvider,
        { site },
        React.createElement(SiteThemeProvider, { design }, children),
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
