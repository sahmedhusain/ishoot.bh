export const websiteSections = [
  "about",
  "clients",
  "services",
  "portfolio",
  "stats",
  "reviews",
  "faq",
  "cta",
] as const;
export type WebsiteSection = (typeof websiteSections)[number];

export const websitePages = ["works", "about", "contact"] as const;
export type WebsitePage = (typeof websitePages)[number];

export interface WebsiteConfig {
  sections: { id: WebsiteSection; visible: boolean }[];
  pages?: { id: WebsitePage; visible: boolean }[];
  contactTitleEn: string;
  contactTitleAr: string;
  contactIntroEn: string;
  contactIntroAr: string;
  hoursEn: string;
  hoursAr: string;
  responseEn: string;
  responseAr: string;
}
export const defaultWebsitePages: { id: WebsitePage; visible: boolean }[] = [
  { id: "works", visible: true },
  { id: "about", visible: true },
  { id: "contact", visible: true },
];
export const defaultWebsiteConfig: WebsiteConfig = {
  sections: websiteSections.map((id) => ({ id, visible: true })),
  pages: defaultWebsitePages,
  contactTitleEn: "Every conversation starts something.",
  contactTitleAr: "كل حوار بداية لشيء جديد.",
  contactIntroEn:
    "Tell us what you have in mind. Plan a production, ask a question, or share your experience with our team.",
  contactIntroAr:
    "شاركنا ما يدور في ذهنك. خطّط لإنتاجك القادم، اطرح سؤالك، أو أخبرنا عن تجربتك مع فريقنا.",
  hoursEn: "",
  hoursAr: "",
  responseEn:
    "Our team will review your message and contact you using the details you provide.",
  responseAr:
    "سيراجع فريقنا رسالتك ويتواصل معك عبر بيانات الاتصال التي تقدمها.",
};
export function validateWebsiteConfig(value: unknown): WebsiteConfig {
  if (!value || typeof value !== "object")
    throw new Error("Invalid website content");
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.sections) ||
    data.sections.length !== websiteSections.length ||
    data.sections.some((s) => !s || typeof s !== "object") ||
    new Set(data.sections.map((s) => s.id)).size !== websiteSections.length ||
    data.sections.some(
      (s) => !websiteSections.includes(s.id) || typeof s.visible !== "boolean",
    )
  )
    throw new Error("Invalid section order");

  const defaultPages: { id: WebsitePage; visible: boolean }[] = [
    { id: "works", visible: true },
    { id: "about", visible: true },
    { id: "contact", visible: true },
  ];

  let pages = defaultPages;
  if (Array.isArray(data.pages)) {
    pages = defaultPages.map((dp) => {
      const found = (data.pages as Array<{ id?: unknown; visible?: unknown }>).find(
        (p) => p && p.id === dp.id,
      );
      return {
        id: dp.id,
        visible: typeof found?.visible === "boolean" ? found.visible : true,
      };
    });
  }

  const result = {
    sections: data.sections.map((s) => ({ id: s.id, visible: s.visible })),
    pages,
  } as WebsiteConfig;
  for (const key of Object.keys(defaultWebsiteConfig).filter(
    (k) => k !== "sections" && k !== "pages",
  ) as Exclude<keyof WebsiteConfig, "sections" | "pages">[]) {
    if (typeof data[key] !== "string" || (data[key] as string).length > 1500)
      throw new Error(`Invalid ${key}`);
    result[key] = (data[key] as string).trim();
  }
  if (!result.contactTitleEn || !result.contactTitleAr)
    throw new Error("Contact titles are required in both languages");
  return result;
}
export interface PublicService {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
}
export function safeWebsiteUrl(value: string, fallback = ""): string {
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value))
    return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {}
  return fallback;
}
