// What the company does decides how its website reads and is laid out: the name and route of its catalogue
// ("Works", "Products", "Menu"…), the item details it shows, the hero, the homepage sections, the enquiry form
// and the modules worth switching on. The setup wizard applies a preset; everything stays editable afterwards.
import type { WebsitePage, WebsiteSection } from "./website-config";

// Spelled out (not derived from the list) so the server-action input contracts can read it.
export type BusinessActivity =
  | "media"
  | "agency"
  | "products"
  | "food"
  | "services"
  | "real_estate"
  | "construction"
  | "education"
  | "healthcare"
  | "events"
  | "online_store"
  | "beauty"
  | "fitness"
  | "automotive"
  | "logistics"
  | "travel"
  | "hotel"
  | "law_firm"
  | "nonprofit"
  | "pharmacy"
  | "manufacturing"
  | "it_software"
  | "other";
export const BUSINESS_ACTIVITIES: readonly BusinessActivity[] = [
  "media",
  "agency",
  "products",
  "food",
  "services",
  "real_estate",
  "construction",
  "education",
  "healthcare",
  "events",
  "online_store",
  "beauty",
  "fitness",
  "automotive",
  "logistics",
  "travel",
  "hotel",
  "law_firm",
  "nonprofit",
  "pharmacy",
  "manufacturing",
  "it_software",
  "other",
];

export function isBusinessActivity(value: unknown): value is BusinessActivity {
  return (
    typeof value === "string" &&
    (BUSINESS_ACTIVITIES as readonly string[]).includes(value)
  );
}

/** How catalogue items are shown: video projects, priced products, listings with facts, or case studies. */
export const COLLECTION_LAYOUTS = [
  "media",
  "product",
  "listing",
  "case",
] as const;
export type CollectionLayout = (typeof COLLECTION_LAYOUTS)[number];

/** The homepage opening: full-bleed media, text beside an image, or a centred headline. */
export const HERO_STYLES = ["cinematic", "split", "centered"] as const;
export type HeroStyle = (typeof HERO_STYLES)[number];

/** Item details an activity uses; the admin catalogue form shows only these. */
export const COLLECTION_FIELDS = [
  "client",
  "year",
  "video",
  "credits",
  "subtitle",
  "price",
  "location",
  "attributes",
  "externalUrl",
  "gallery",
] as const;
export type CollectionField = (typeof COLLECTION_FIELDS)[number];

/** Optional questions on the website's quote request. */
export interface InquiryOptions {
  budget: boolean;
  timeline: boolean;
  location: boolean;
  reference: boolean;
}

/** Optional modules (constants/features.ts) worth switching on for an activity. */
type ModuleChoice = Partial<
  Record<
    | "crm_deals"
    | "invoicing"
    | "calendar"
    | "equipment"
    | "cms"
    | "reviews"
    | "products"
    | "procurement"
    | "store"
    | "delivery",
    boolean
  >
>;

export interface ActivityPreset {
  /** lucide-react icon name shown in the wizard. */
  icon: string;
  /** STYLE_PRESETS id suggested for this activity. */
  stylePreset: string;
  heroStyle: HeroStyle;
  collection: {
    slug: string;
    layout: CollectionLayout;
    fields: readonly CollectionField[];
  };
  /** Homepage sections in order; sections left out are hidden. */
  sections: readonly WebsiteSection[];
  pages: Record<WebsitePage, boolean>;
  inquiry: InquiryOptions;
  /** The studio equipment list on the About page (media companies that rent gear). */
  showEquipment: boolean;
  modules: ModuleChoice;
}

const ALL_PAGES = { works: true, about: true, contact: true };
const SOFT_INQUIRY: InquiryOptions = {
  budget: false,
  timeline: false,
  location: false,
  reference: false,
};

export const ACTIVITY_PRESETS: Record<BusinessActivity, ActivityPreset> = {
  media: {
    icon: "Clapperboard",
    stylePreset: "cinematic",
    heroStyle: "cinematic",
    collection: {
      slug: "works",
      layout: "media",
      fields: ["client", "year", "video", "credits", "gallery"],
    },
    sections: [
      "about",
      "clients",
      "services",
      "portfolio",
      "stats",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: true },
    showEquipment: true,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: true,
      cms: true,
      reviews: true,
    },
  },
  agency: {
    icon: "Megaphone",
    stylePreset: "modern",
    heroStyle: "split",
    collection: {
      slug: "case-studies",
      layout: "case",
      fields: ["client", "year", "subtitle", "video", "attributes", "gallery"],
    },
    sections: [
      "about",
      "services",
      "portfolio",
      "clients",
      "stats",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: false, reference: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  products: {
    icon: "ShoppingBag",
    stylePreset: "fresh",
    heroStyle: "split",
    collection: {
      slug: "products",
      layout: "product",
      fields: ["subtitle", "price", "attributes", "externalUrl", "gallery"],
    },
    sections: ["portfolio", "about", "services", "reviews", "stats", "faq"],
    pages: ALL_PAGES,
    inquiry: {
      budget: false,
      timeline: false,
      location: true,
      reference: false,
    },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: false,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
      store: true,
      delivery: true,
    },
  },
  food: {
    icon: "UtensilsCrossed",
    stylePreset: "friendly",
    heroStyle: "cinematic",
    collection: {
      slug: "menu",
      layout: "product",
      fields: ["subtitle", "price", "attributes", "gallery"],
    },
    sections: ["portfolio", "about", "reviews", "stats", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
      store: true,
      delivery: true,
    },
  },
  services: {
    icon: "BriefcaseBusiness",
    stylePreset: "corporate",
    heroStyle: "split",
    collection: {
      slug: "projects",
      layout: "case",
      fields: ["client", "year", "subtitle", "attributes", "gallery"],
    },
    sections: [
      "about",
      "services",
      "stats",
      "portfolio",
      "clients",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: {
      budget: true,
      timeline: true,
      location: false,
      reference: false,
    },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  real_estate: {
    icon: "Building2",
    stylePreset: "elegant",
    heroStyle: "cinematic",
    collection: {
      slug: "properties",
      layout: "listing",
      fields: [
        "subtitle",
        "price",
        "location",
        "attributes",
        "externalUrl",
        "video",
        "gallery",
      ],
    },
    sections: ["portfolio", "about", "services", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: false },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  construction: {
    icon: "HardHat",
    stylePreset: "bold",
    heroStyle: "cinematic",
    collection: {
      slug: "projects",
      layout: "case",
      fields: [
        "client",
        "year",
        "subtitle",
        "location",
        "attributes",
        "gallery",
      ],
    },
    sections: [
      "about",
      "services",
      "portfolio",
      "stats",
      "clients",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: false },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  education: {
    icon: "GraduationCap",
    stylePreset: "modern",
    heroStyle: "split",
    collection: {
      slug: "programs",
      layout: "listing",
      fields: ["subtitle", "price", "location", "attributes", "externalUrl"],
    },
    sections: ["about", "portfolio", "services", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  healthcare: {
    icon: "Stethoscope",
    stylePreset: "fresh",
    heroStyle: "split",
    collection: {
      slug: "treatments",
      layout: "listing",
      fields: ["subtitle", "price", "attributes"],
    },
    sections: ["about", "services", "portfolio", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  events: {
    icon: "PartyPopper",
    stylePreset: "bold",
    heroStyle: "cinematic",
    collection: {
      slug: "events",
      layout: "case",
      fields: ["client", "year", "subtitle", "location", "video", "gallery"],
    },
    sections: [
      "about",
      "portfolio",
      "services",
      "clients",
      "stats",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: false },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: true,
      cms: true,
      reviews: true,
    },
  },
  online_store: {
    icon: "Store",
    stylePreset: "market",
    heroStyle: "split",
    collection: {
      slug: "shop",
      layout: "product",
      fields: ["subtitle", "price", "attributes", "gallery"],
    },
    sections: ["portfolio", "services", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, location: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: false,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
      store: true,
      delivery: true,
    },
  },
  beauty: {
    icon: "Sparkle",
    stylePreset: "boutique",
    heroStyle: "split",
    collection: {
      slug: "treatments",
      layout: "listing",
      fields: ["subtitle", "price", "attributes", "gallery"],
    },
    sections: ["portfolio", "about", "reviews", "stats", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
    },
  },
  fitness: {
    icon: "Dumbbell",
    stylePreset: "energetic",
    heroStyle: "cinematic",
    collection: {
      slug: "memberships",
      layout: "listing",
      fields: ["subtitle", "price", "attributes"],
    },
    sections: ["portfolio", "about", "services", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  automotive: {
    icon: "Car",
    stylePreset: "motor",
    heroStyle: "cinematic",
    collection: {
      slug: "vehicles",
      layout: "listing",
      fields: ["subtitle", "price", "year", "attributes", "gallery"],
    },
    sections: ["portfolio", "services", "about", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: {
      budget: true,
      timeline: true,
      location: false,
      reference: false,
    },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
    },
  },
  logistics: {
    icon: "Truck",
    stylePreset: "logistics",
    heroStyle: "split",
    collection: {
      slug: "solutions",
      layout: "case",
      fields: ["subtitle", "attributes", "gallery"],
    },
    sections: ["about", "services", "stats", "clients", "portfolio", "faq"],
    pages: ALL_PAGES,
    inquiry: { budget: false, timeline: true, location: true, reference: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  travel: {
    icon: "Plane",
    stylePreset: "voyage",
    heroStyle: "cinematic",
    collection: {
      slug: "trips",
      layout: "listing",
      fields: ["subtitle", "price", "location", "attributes", "gallery"],
    },
    sections: ["portfolio", "about", "reviews", "stats", "faq"],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: false },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  hotel: {
    icon: "BedDouble",
    stylePreset: "hospitality",
    heroStyle: "cinematic",
    collection: {
      slug: "rooms",
      layout: "listing",
      fields: ["subtitle", "price", "attributes", "gallery"],
    },
    sections: ["portfolio", "about", "services", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, timeline: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  law_firm: {
    icon: "Scale",
    stylePreset: "counsel",
    heroStyle: "centered",
    collection: {
      slug: "practice-areas",
      layout: "case",
      fields: ["subtitle", "attributes"],
    },
    sections: ["about", "services", "portfolio", "stats", "faq"],
    pages: ALL_PAGES,
    inquiry: {
      budget: false,
      timeline: true,
      location: false,
      reference: true,
    },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: false,
    },
  },
  nonprofit: {
    icon: "HeartHandshake",
    stylePreset: "civic",
    heroStyle: "split",
    collection: {
      slug: "programs",
      layout: "case",
      fields: ["subtitle", "location", "attributes", "gallery"],
    },
    sections: ["about", "portfolio", "stats", "clients", "faq"],
    pages: ALL_PAGES,
    inquiry: SOFT_INQUIRY,
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: false,
    },
  },
  pharmacy: {
    icon: "Pill",
    stylePreset: "clinical",
    heroStyle: "split",
    collection: {
      slug: "products",
      layout: "product",
      fields: ["subtitle", "price", "attributes"],
    },
    sections: ["portfolio", "services", "about", "faq"],
    pages: ALL_PAGES,
    inquiry: { ...SOFT_INQUIRY, location: true },
    showEquipment: false,
    modules: {
      crm_deals: false,
      invoicing: true,
      calendar: false,
      equipment: false,
      cms: true,
      reviews: true,
      products: true,
      procurement: true,
      store: true,
      delivery: true,
    },
  },
  manufacturing: {
    icon: "Factory",
    stylePreset: "industrial",
    heroStyle: "cinematic",
    collection: {
      slug: "products",
      layout: "product",
      fields: ["subtitle", "attributes", "externalUrl", "gallery"],
    },
    sections: ["about", "portfolio", "services", "stats", "clients", "faq"],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: true, reference: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: false,
      products: true,
      procurement: true,
    },
  },
  it_software: {
    icon: "Code2",
    stylePreset: "tech",
    heroStyle: "split",
    collection: {
      slug: "solutions",
      layout: "case",
      fields: [
        "client",
        "year",
        "subtitle",
        "attributes",
        "externalUrl",
        "gallery",
      ],
    },
    sections: [
      "about",
      "services",
      "portfolio",
      "clients",
      "stats",
      "reviews",
      "faq",
    ],
    pages: ALL_PAGES,
    inquiry: { budget: true, timeline: true, location: false, reference: true },
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
  other: {
    icon: "Sparkles",
    stylePreset: "corporate",
    heroStyle: "centered",
    collection: {
      slug: "work",
      layout: "case",
      fields: ["subtitle", "attributes", "gallery"],
    },
    sections: ["about", "services", "portfolio", "stats", "reviews", "faq"],
    pages: ALL_PAGES,
    inquiry: SOFT_INQUIRY,
    showEquipment: false,
    modules: {
      crm_deals: true,
      invoicing: true,
      calendar: true,
      equipment: false,
      cms: true,
      reviews: true,
    },
  },
};

/** Companies set up before activities existed were built as media websites. */
export const DEFAULT_ACTIVITY: BusinessActivity = "media";

export function activityPreset(activity: unknown): ActivityPreset {
  return ACTIVITY_PRESETS[
    isBusinessActivity(activity) ? activity : DEFAULT_ACTIVITY
  ];
}

/** Paths a catalogue can never take, because pages or the router already use them. */
export const RESERVED_COLLECTION_SLUGS = [
  "about",
  "contact",
  "api",
  "en",
  "ar",
  "admin",
  "preview",
  "files",
  "fonts",
  "images",
];
