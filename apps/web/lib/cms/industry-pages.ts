import { newBlockData, type Block, type BlockType } from "./blocks";
import type { CollectionLayout } from "../website-presets";
import type { BusinessActivity } from "../website-presets";

type PageRecipe = { slug: string; en: string; ar: string; blocks: BlockType[] };
export const INDUSTRY_PAGES: Record<BusinessActivity, PageRecipe[]> = {
  media: [
    {
      slug: "capabilities",
      en: "Production capabilities",
      ar: "قدرات الإنتاج",
      blocks: ["services", "equipment", "catalogue", "cta"],
    },
  ],
  agency: [
    {
      slug: "capabilities",
      en: "Our capabilities",
      ar: "قدراتنا",
      blocks: ["services", "catalogue", "clients", "cta"],
    },
  ],
  products: [
    {
      slug: "product-support",
      en: "Product support",
      ar: "دعم المنتجات",
      blocks: ["downloads", "faq", "cta"],
    },
  ],
  food: [
    {
      slug: "restaurant",
      en: "Our restaurant",
      ar: "مطعمنا",
      blocks: ["about", "locations", "catalogue", "cta"],
    },
    {
      slug: "menu-guide",
      en: "Menu and dietary information",
      ar: "قائمة الطعام والمعلومات الغذائية",
      blocks: ["catalogue", "downloads", "faq", "cta"],
    },
  ],
  services: [
    {
      slug: "our-services",
      en: "Our services",
      ar: "خدماتنا",
      blocks: ["services", "testimonials", "faq", "cta"],
    },
  ],
  real_estate: [
    {
      slug: "viewings",
      en: "Property inquiries and viewings",
      ar: "استفسارات العقارات والمعاينة",
      blocks: ["catalogue", "locations", "cta"],
    },
  ],
  construction: [
    {
      slug: "construction-services",
      en: "Construction services",
      ar: "خدمات الإنشاءات",
      blocks: ["services", "downloads", "cta"],
    },
    {
      slug: "completed-projects",
      en: "Completed projects",
      ar: "المشاريع المنجزة",
      blocks: ["catalogue", "clients", "stats", "cta"],
    },
  ],
  education: [
    {
      slug: "admissions",
      en: "Programs and admission inquiries",
      ar: "البرامج واستفسارات القبول",
      blocks: ["catalogue", "team", "downloads", "faq", "cta"],
    },
  ],
  healthcare: [
    {
      slug: "care-locations",
      en: "Services and care locations",
      ar: "الخدمات ومواقع الرعاية",
      blocks: ["services", "team", "locations", "cta"],
    },
  ],
  events: [
    {
      slug: "event-services",
      en: "Events and packages",
      ar: "الفعاليات والباقات",
      blocks: ["catalogue", "services", "faq", "cta"],
    },
  ],
  online_store: [
    {
      slug: "shopping-help",
      en: "Shopping and collection information",
      ar: "معلومات التسوق والاستلام",
      blocks: ["locations", "downloads", "faq", "cta"],
    },
  ],
  beauty: [
    {
      slug: "treatments",
      en: "Treatments and appointment inquiries",
      ar: "العلاجات واستفسارات المواعيد",
      blocks: ["services", "team", "catalogue", "cta"],
    },
  ],
  fitness: [
    {
      slug: "training",
      en: "Programs and trainers",
      ar: "البرامج والمدربون",
      blocks: ["catalogue", "team", "downloads", "cta"],
    },
  ],
  automotive: [
    {
      slug: "automotive-services",
      en: "Vehicles, parts and services",
      ar: "المركبات والقطع والخدمات",
      blocks: ["catalogue", "services", "locations", "cta"],
    },
  ],
  logistics: [
    {
      slug: "coverage",
      en: "Services and coverage",
      ar: "الخدمات والتغطية",
      blocks: ["services", "locations", "downloads", "cta"],
    },
  ],
  travel: [
    {
      slug: "travel-guide",
      en: "Tours and travel information",
      ar: "الجولات ومعلومات السفر",
      blocks: ["catalogue", "downloads", "faq", "cta"],
    },
  ],
  hotel: [
    {
      slug: "stay",
      en: "Rooms and stay inquiries",
      ar: "الغرف واستفسارات الإقامة",
      blocks: ["catalogue", "services", "locations", "cta"],
    },
  ],
  law_firm: [
    {
      slug: "practice-areas",
      en: "Practice areas and professionals",
      ar: "مجالات الممارسة والفريق",
      blocks: ["services", "team", "latest_articles", "cta"],
    },
  ],
  nonprofit: [
    {
      slug: "our-impact",
      en: "Causes, projects and impact",
      ar: "القضايا والمشاريع والأثر",
      blocks: ["catalogue", "stats", "latest_articles", "cta"],
    },
  ],
  pharmacy: [
    {
      slug: "pharmacy-information",
      en: "Products and pharmacy information",
      ar: "المنتجات ومعلومات الصيدلية",
      blocks: ["catalogue", "locations", "faq", "cta"],
    },
  ],
  manufacturing: [
    {
      slug: "manufacturing-capabilities",
      en: "Manufacturing capabilities",
      ar: "قدرات التصنيع",
      blocks: ["services", "catalogue", "downloads", "cta"],
    },
  ],
  it_software: [
    {
      slug: "solutions",
      en: "Solutions and documentation",
      ar: "الحلول والوثائق",
      blocks: ["catalogue", "services", "downloads", "cta"],
    },
  ],
  other: [
    {
      slug: "what-we-do",
      en: "What we do",
      ar: "ما نقدمه",
      blocks: ["about", "services", "catalogue", "cta"],
    },
  ],
};

export function industryPageBlocks(
  recipe: PageRecipe,
  id: () => string,
  presentation?: CollectionLayout,
): Block[] {
  return recipe.blocks.map(
    (type) =>
      ({
        id: id(),
        type,
        visible: true,
        data:
          type === "cta"
            ? {
                ...newBlockData("cta"),
                title: { en: "Talk to our team", ar: "تحدث مع فريقنا" },
                text: {
                  en: "Send your requirements or ask a question. Our team will respond to your inquiry.",
                  ar: "أرسل متطلباتك أو سؤالك وسيرد فريقنا على استفسارك.",
                },
                buttonLabel: { en: "Contact us", ar: "اتصل بنا" },
              }
            : type === "catalogue"
              ? {
                  ...newBlockData("catalogue"),
                  presentation: presentation ?? "inherit",
                  title: { en: recipe.en, ar: recipe.ar },
                }
              : newBlockData(type),
      }) as Block,
  );
}
