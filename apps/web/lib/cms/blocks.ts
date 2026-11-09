import type { CollectionLayout } from "../website-presets";
import type { SiteTone } from "../constants/website-design";

export const BLOCK_TYPES = [
  "hero",
  "about",
  "rich_text",
  "image_text",
  "gallery",
  "video",
  "catalogue",
  "services",
  "stats",
  "testimonials",
  "faq",
  "clients",
  "cta",
  "contact_form",
  "map",
  "team",
  "latest_articles",
  "columns",
  "spacer",
  "divider",
  "code",
  "embed",
  "leader",
  "pillars",
  "equipment",
  "locations",
  "downloads",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const DATA_BLOCKS: readonly BlockType[] = [
  "hero",
  "about",
  "catalogue",
  "services",
  "stats",
  "testimonials",
  "faq",
  "clients",
  "contact_form",
  "latest_articles",
  "leader",
  "pillars",
  "equipment",
  "locations",
  "downloads",
];

export const CODE_BLOCKS: readonly BlockType[] = ["code"];

export interface LocalText {
  en: string;
  ar: string;
}

export const EMBED_PRESETS = [
  "google_maps",
  "youtube",
  "vimeo",
  "instagram",
  "calendly",
  "typeform",
] as const;
export type EmbedPreset = (typeof EMBED_PRESETS)[number];

export interface BlockData {
  hero: {
    style: "inherit" | "cinematic" | "split" | "centered";
    title: LocalText;
    subtitle: LocalText;
  };
  about: { title: LocalText };
  rich_text: { html: LocalText; doc: { en: unknown; ar: unknown } };
  image_text: {
    title: LocalText;
    text: LocalText;
    imageUrl: string;
    imageSide: "start" | "end";
    buttonLabel: LocalText;
    buttonUrl: string;
  };
  gallery: {
    title: LocalText;
    images: { url: string; caption: LocalText }[];
    columns: 2 | 3 | 4;
  };
  video: { title: LocalText; url: string; posterUrl: string };
  catalogue: {
    title: LocalText;
    layout: "grid" | "list";
    presentation?: CollectionLayout | "inherit";
    category?: string;
    filterable: boolean;
    limit: number;
  };
  services: { title: LocalText };
  stats: { title: LocalText };
  testimonials: { title: LocalText };
  faq: { title: LocalText };
  clients: { title: LocalText };
  cta: {
    title: LocalText;
    text: LocalText;
    buttonLabel: LocalText;
    buttonUrl: string;
  };
  contact_form: { title: LocalText };
  map: { title: LocalText; embedUrl: string };
  team: {
    title: LocalText;
    members: { name: LocalText; role: LocalText; photoUrl: string }[];
  };
  latest_articles: { title: LocalText; count: number; category: string };
  columns: {
    title: LocalText;
    columns: { title: LocalText; text: LocalText }[];
  };
  spacer: { size: "sm" | "md" | "lg" };
  divider: Record<string, never>;
  code: { html: string; css: string; js: string; height: number };
  embed: { title: LocalText; preset: EmbedPreset; url: string };
  leader: { title: LocalText };
  pillars: { title: LocalText };
  equipment: { title: LocalText };
  locations: { title: LocalText };
  downloads: { title: LocalText };
}

export type Block<T extends BlockType = BlockType> = {
  id: string;
  type: T;
  visible: boolean;
  tone?: SiteTone;
  data: BlockData[T];
};

const text = (en = "", ar = en): LocalText => ({ en, ar });
const none = () => text();

export function newBlockData<T extends BlockType>(type: T): BlockData[T] {
  const data: { [K in BlockType]: () => BlockData[K] } = {
    hero: () => ({ style: "inherit", title: none(), subtitle: none() }),
    about: () => ({ title: none() }),
    rich_text: () => ({ html: none(), doc: { en: null, ar: null } }),
    image_text: () => ({
      title: none(),
      text: none(),
      imageUrl: "",
      imageSide: "end",
      buttonLabel: none(),
      buttonUrl: "",
    }),
    gallery: () => ({ title: none(), images: [], columns: 3 }),
    video: () => ({ title: none(), url: "", posterUrl: "" }),
    catalogue: () => ({
      title: none(),
      layout: "grid",
      presentation: "inherit",
      category: "",
      filterable: true,
      limit: 12,
    }),
    services: () => ({ title: none() }),
    stats: () => ({ title: none() }),
    testimonials: () => ({ title: none() }),
    faq: () => ({ title: none() }),
    clients: () => ({ title: none() }),
    cta: () => ({
      title: none(),
      text: none(),
      buttonLabel: none(),
      buttonUrl: "",
    }),
    contact_form: () => ({ title: none() }),
    map: () => ({ title: none(), embedUrl: "" }),
    team: () => ({ title: none(), members: [] }),
    latest_articles: () => ({ title: none(), count: 3, category: "" }),
    columns: () => ({
      title: none(),
      columns: [
        { title: none(), text: none() },
        { title: none(), text: none() },
      ],
    }),
    spacer: () => ({ size: "md" }),
    divider: () => ({}),
    code: () => ({ html: "", css: "", js: "", height: 0 }),
    embed: () => ({ title: none(), preset: "youtube", url: "" }),
    leader: () => ({ title: none() }),
    pillars: () => ({ title: none() }),
    equipment: () => ({ title: none() }),
    locations: () => ({ title: none() }),
    downloads: () => ({ title: none() }),
  };
  return data[type]() as BlockData[T];
}

export const EMBED_HOSTS: Record<EmbedPreset, RegExp> = {
  google_maps: /^(www\.)?google\.[a-z.]+$|^maps\.google\.[a-z.]+$/,
  youtube: /^(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)$/,
  vimeo: /^(www\.|player\.)?vimeo\.com$/,
  instagram: /^(www\.)?instagram\.com$/,
  calendly: /^(www\.)?calendly\.com$/,
  typeform: /^([a-z0-9-]+\.)?typeform\.com$/,
};

export function embedSource(preset: EmbedPreset, input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || !EMBED_HOSTS[preset].test(url.hostname))
    return "";
  const path = url.pathname.split("/").filter(Boolean);
  switch (preset) {
    case "youtube": {
      const id = url.hostname.endsWith("youtu.be")
        ? path[0]
        : (url.searchParams.get("v") ??
          (["embed", "shorts", "live"].includes(path[0]) ? path[1] : ""));
      return id && /^[\w-]{6,20}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : "";
    }
    case "vimeo": {
      const id = path.find((part) => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
    case "instagram": {
      const at = path.findIndex((part) => part === "p" || part === "reel");
      const id = at >= 0 ? path[at + 1] : "";
      return id && /^[\w-]+$/.test(id)
        ? `https://www.instagram.com/${path[at]}/${id}/embed`
        : "";
    }
    case "google_maps":
      return path[0] === "maps" && path[1] === "embed" ? url.href : "";
    case "calendly":
    case "typeform":
      return url.href;
  }
}

export function videoSource(
  input: string,
): { kind: "iframe" | "file"; src: string } | null {
  const youtube = embedSource("youtube", input) || "";
  if (youtube) return { kind: "iframe", src: youtube };
  const vimeo = embedSource("vimeo", input) || "";
  if (vimeo) return { kind: "iframe", src: vimeo };
  if (/^(https:\/\/|\/)[^\s]+\.(mp4|webm)(\?[^\s]*)?$/i.test(input.trim()))
    return { kind: "file", src: input.trim() };
  return null;
}
