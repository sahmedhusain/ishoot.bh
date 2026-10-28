import { SITE_TONES, type SiteTone } from "../constants/website-design";
import { randomUUID } from "node:crypto";
import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../db";
import {
  BLOCK_TYPES,
  CODE_BLOCKS,
  EMBED_PRESETS,
  newBlockData,
  type Block,
  type BlockType,
  type LocalText,
} from "../cms/blocks";
import {
  resolveWebsiteConfig,
  safeWebsiteUrl,
  validateWebsiteConfig,
  type ResolvedWebsiteConfig,
  type WebsiteSection,
} from "../website-config";
import { RESERVED_COLLECTION_SLUGS } from "../website-presets";

/** A website page as the admin edits it and the website shows it. */
export interface CmsPageRecord {
  id: string;
  slug: string;
  page_type: "home" | "about" | "contact" | "custom";
  title_en: string;
  title_ar: string;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  blocks: Block[];
  is_visible: boolean;
  in_header: boolean;
  in_footer: boolean;
  sort_order: number;
  updated_at: string;
}

type PageRow = Awaited<ReturnType<typeof db.cmsPage.findMany>>[number];
const PAGE_TYPES = ["home", "about", "contact", "custom"] as const;

const mapPage = (row: PageRow): CmsPageRecord => ({
  id: row.id,
  slug: row.slug,
  page_type: (PAGE_TYPES as readonly string[]).includes(row.pageType)
    ? (row.pageType as CmsPageRecord["page_type"])
    : "custom",
  title_en: row.titleEn,
  title_ar: row.titleAr,
  seo_title_en: row.seoTitleEn ?? "",
  seo_title_ar: row.seoTitleAr ?? "",
  seo_description_en: row.seoDescriptionEn ?? "",
  seo_description_ar: row.seoDescriptionAr ?? "",
  blocks: Array.isArray(row.blocks) ? (row.blocks as unknown as Block[]) : [],
  is_visible: row.isVisible,
  in_header: row.inHeader,
  in_footer: row.inFooter,
  sort_order: row.sortOrder,
  updated_at: row.updatedAt.toISOString(),
});

const blockId = () => randomUUID().slice(0, 8);
const block = <T extends BlockType>(
  type: T,
  visible = true,
  data?: Partial<Block<T>["data"]>,
): Block<T> => ({
  id: blockId(),
  type,
  visible,
  data: { ...newBlockData(type), ...data },
});

/** Homepage sections of the old fixed layout and the blocks that now show them. */
const SECTION_BLOCKS: Partial<Record<WebsiteSection, BlockType>> = {
  about: "about",
  clients: "clients",
  services: "services",
  portfolio: "catalogue",
  stats: "stats",
  reviews: "testimonials",
  faq: "faq",
};

/** The pages a website starts with, built from its settings: same sections, order, visibility and content. */
export function defaultCmsPages(config: ResolvedWebsiteConfig) {
  const en = getTranslations("en");
  const ar = getTranslations("ar");
  const visible = (id: string) =>
    config.pages.find((page) => page.id === id)?.visible !== false;
  const home: Block[] = [
    block("hero", true, { style: "inherit" }),
    ...config.sections.flatMap((section) => {
      const type = SECTION_BLOCKS[section.id];
      return type ? [block(type, section.visible)] : [];
    }),
  ];
  return [
    {
      slug: "",
      pageType: "home",
      titleEn: en.nav.home,
      titleAr: ar.nav.home,
      blocks: home,
      isVisible: true,
      inHeader: false,
      inFooter: false,
      sortOrder: 0,
    },
    {
      slug: "about",
      pageType: "about",
      titleEn: en.nav.about,
      titleAr: ar.nav.about,
      blocks: [
        block("leader"),
        block("pillars"),
        block("stats"),
        block("equipment", config.showEquipment),
      ],
      isVisible: visible("about"),
      inHeader: true,
      inFooter: true,
      sortOrder: 1,
    },
    {
      slug: "contact",
      pageType: "contact",
      titleEn: en.nav.contact,
      titleAr: ar.nav.contact,
      blocks: [block("contact_form")],
      isVisible: visible("contact"),
      inHeader: true,
      inFooter: true,
      sortOrder: 2,
    },
  ];
}

/** Creates the starting pages from the current website draft the first time pages are needed. */
export async function ensureCmsPages() {
  if ((await db.cmsPage.count()) > 0) return;
  const content = await db.websiteContent.findUnique({
    where: { id: "main" },
    select: { draft: true },
  });
  const config = resolveWebsiteConfig(
    validateWebsiteConfig(content?.draft ?? {}),
  );
  for (const page of defaultCmsPages(config)) {
    await db.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, blocks: JSON.parse(JSON.stringify(page.blocks)) },
    });
  }
}

export async function listCmsPages(): Promise<CmsPageRecord[]> {
  await ensureCmsPages().catch(() => undefined);
  const rows = await db.cmsPage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapPage);
}

export async function getCmsPage(id: string): Promise<CmsPageRecord | null> {
  const row = await db.cmsPage.findUnique({ where: { id } });
  return row ? mapPage(row) : null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9-]{1,40}$/i;

function localText(value: unknown, max = 2000): LocalText {
  const source = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const pick = (key: string) =>
    typeof source[key] === "string"
      ? (source[key] as string).slice(0, max).trim()
      : "";
  return { en: pick("en"), ar: pick("ar") };
}
const url = (value: unknown) =>
  typeof value === "string" ? safeWebsiteUrl(value.trim().slice(0, 2000)) : "";
const oneOf = <T extends string>(
  value: unknown,
  list: readonly T[],
  fallback: T,
): T =>
  (list as readonly string[]).includes(value as string)
    ? (value as T)
    : fallback;
const count = (value: unknown, min: number, max: number, fallback: number) =>
  Number.isInteger(value)
    ? Math.min(max, Math.max(min, value as number))
    : fallback;

/** Cleans one block's data to the shape its type allows; anything else is dropped. Rich text HTML is set by the caller. */
function cleanData(
  type: BlockType,
  raw: Record<string, unknown>,
): Block["data"] {
  const base = newBlockData(type) as Record<string, unknown>;
  const title = localText(raw.title, 300);
  switch (type) {
    case "hero":
      return {
        style: oneOf(raw.style, ["inherit", "cinematic", "split", "centered"], "inherit"),
        title,
        subtitle: localText(raw.subtitle, 600),
      };
    case "rich_text":
      return {
        html: localText(raw.html, 200_000),
        doc: {
          en: (raw.doc as { en?: unknown })?.en ?? null,
          ar: (raw.doc as { ar?: unknown })?.ar ?? null,
        },
      };
    case "image_text":
      return {
        title,
        text: localText(raw.text, 5000),
        imageUrl: url(raw.imageUrl),
        imageSide: oneOf(raw.imageSide, ["start", "end"], "end"),
        buttonLabel: localText(raw.buttonLabel, 80),
        buttonUrl: url(raw.buttonUrl),
      };
    case "gallery":
      return {
        title,
        images: (Array.isArray(raw.images) ? raw.images : [])
          .slice(0, 60)
          .map((image) => ({
            url: url((image as Record<string, unknown>)?.url),
            caption: localText(
              (image as Record<string, unknown>)?.caption,
              300,
            ),
          }))
          .filter((image) => image.url),
        columns:
          oneOf(String(raw.columns), ["2", "3", "4"], "3") === "2"
            ? 2
            : String(raw.columns) === "4"
              ? 4
              : 3,
      };
    case "video":
      return { title, url: url(raw.url), posterUrl: url(raw.posterUrl) };
    case "catalogue": {
      const category = typeof raw.category === "string" ? raw.category.trim() : "";
      if ((raw.category !== undefined && typeof raw.category !== "string") || category.length > 80 || (category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))) throw new Error(serverMessages.cmsBlocksInvalid);
      return {
        category,
        title,
        layout: oneOf(raw.layout, ["grid", "list"], "grid"),
        presentation: oneOf(raw.presentation, ["inherit", "media", "case", "product", "listing"] as const, "inherit"),
        filterable: raw.filterable !== false,
        limit: count(raw.limit, 1, 60, 12),
      };
    }
    case "cta":
      return {
        title,
        text: localText(raw.text, 1500),
        buttonLabel: localText(raw.buttonLabel, 80),
        buttonUrl: url(raw.buttonUrl),
      };
    case "map":
      return { title, embedUrl: url(raw.embedUrl) };
    case "team":
      return {
        title,
        members: (Array.isArray(raw.members) ? raw.members : [])
          .slice(0, 60)
          .map((member) => {
            const m = (member ?? {}) as Record<string, unknown>;
            return {
              name: localText(m.name, 120),
              role: localText(m.role, 120),
              photoUrl: url(m.photoUrl),
            };
          }),
      };
    case "latest_articles":
      return {
        title,
        count: count(raw.count, 1, 12, 3),
        category:
          typeof raw.category === "string" ? raw.category.slice(0, 40) : "",
      };
    case "columns":
      return {
        title,
        columns: (Array.isArray(raw.columns) ? raw.columns : [])
          .slice(0, 4)
          .map((column) => ({
            title: localText((column as Record<string, unknown>)?.title, 200),
            text: localText((column as Record<string, unknown>)?.text, 2000),
          })),
      };
    case "spacer":
      return { size: oneOf(raw.size, ["sm", "md", "lg"], "md") };
    case "divider":
      return {};
    case "code": {
      const code = (key: string) =>
        typeof raw[key] === "string"
          ? (raw[key] as string).slice(0, 50_000)
          : "";
      return {
        html: code("html"),
        css: code("css"),
        js: code("js"),
        height: count(raw.height, 0, 4000, 0),
      };
    }
    case "embed":
      return {
        title,
        preset: oneOf(raw.preset, EMBED_PRESETS, "youtube"),
        url: url(raw.url),
      };
    default:
      return { ...base, title } as Block["data"];
  }
}

/** Validates the blocks an editor sent: known types, unique ids, at most 80 blocks, data cleaned per type. */
export function validateBlocks(input: unknown): Block[] {
  if (!Array.isArray(input) || input.length > 80)
    throw new Error(serverMessages.cmsBlocksInvalid);
  const seen = new Set<string>();
  return input.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const type = raw.type as BlockType;
    if (!(BLOCK_TYPES as readonly string[]).includes(type))
      throw new Error(serverMessages.cmsBlocksInvalid);
    const id =
      typeof raw.id === "string" && ID.test(raw.id) && !seen.has(raw.id)
        ? raw.id
        : blockId();
    seen.add(id);
    if (raw.tone !== undefined && !SITE_TONES.includes(raw.tone as SiteTone)) throw new Error(serverMessages.cmsBlocksInvalid);
    return {
      id,
      type,
      visible: raw.visible !== false,
      ...(raw.tone !== undefined ? { tone: raw.tone as SiteTone } : {}),
      data: cleanData(type, (raw.data ?? {}) as Record<string, unknown>),
    } as Block;
  });
}

/** Whether two block lists differ in any block that only code editors may touch. */
export function codeBlocksChanged(before: Block[], after: Block[]) {
  const code = (blocks: Block[]) =>
    JSON.stringify(
      blocks
        .filter((b) => (CODE_BLOCKS as readonly string[]).includes(b.type))
        .map((b) => [b.id, b.data]),
    );
  return code(before) !== code(after);
}

export interface CmsPageInput {
  id?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  blocks: unknown;
  is_visible: boolean;
  in_header: boolean;
  in_footer: boolean;
}

/** Saves a page (the draft: the website changes when the website is published). */
export async function saveCmsPage(
  input: CmsPageInput,
  blocks: Block[],
  collectionSlug: string,
) {
  const existing = input.id
    ? await db.cmsPage.findUnique({ where: { id: input.id } })
    : null;
  if (input.id && !existing) throw new Error(serverMessages.cmsPageNotFound);
  // Built-in pages keep their addresses; new pages need one that is free and not a reserved route.
  const slug =
    existing && existing.pageType !== "custom"
      ? existing.slug
      : input.slug.trim().toLowerCase();
  if (!existing || existing.pageType === "custom") {
    if (
      !SLUG.test(slug) ||
      slug.length > 60 ||
      RESERVED_COLLECTION_SLUGS.includes(slug) ||
      slug === collectionSlug ||
      ["about", "contact"].includes(slug)
    )
      throw new Error(serverMessages.cmsPageSlugInvalid);
    const clash = await db.cmsPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (clash && clash.id !== input.id)
      throw new Error(serverMessages.cmsPageSlugTaken);
  }
  if (!input.title_en.trim() || !input.title_ar.trim())
    throw new Error(serverMessages.cmsPageTitleRequired);
  const text = (value: string, max: number) =>
    value.trim().slice(0, max) || null;
  const data = {
    slug,
    titleEn: input.title_en.trim().slice(0, 200),
    titleAr: input.title_ar.trim().slice(0, 200),
    seoTitleEn: text(input.seo_title_en, 200),
    seoTitleAr: text(input.seo_title_ar, 200),
    seoDescriptionEn: text(input.seo_description_en, 400),
    seoDescriptionAr: text(input.seo_description_ar, 400),
    blocks: JSON.parse(JSON.stringify(blocks)),
    // The homepage is always on; it is reached through the logo, not a menu.
    isVisible: existing?.pageType === "home" ? true : input.is_visible,
    inHeader: existing?.pageType === "home" ? false : input.in_header,
    inFooter: existing?.pageType === "home" ? false : input.in_footer,
  };
  if (existing)
    return mapPage(
      await db.cmsPage.update({ where: { id: existing.id }, data }),
    );
  const last = await db.cmsPage.aggregate({ _max: { sortOrder: true } });
  return mapPage(
    await db.cmsPage.create({
      data: {
        ...data,
        pageType: "custom",
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    }),
  );
}

/** A copy of a page with fresh block ids, hidden until the editor shows it. */
export async function duplicateCmsPage(id: string) {
  const page = await db.cmsPage.findUnique({ where: { id } });
  if (!page) throw new Error(serverMessages.cmsPageNotFound);
  let slug = `${page.slug || "home"}-copy`;
  for (
    let n = 2;
    await db.cmsPage.findUnique({ where: { slug }, select: { id: true } });
    n++
  )
    slug = `${page.slug || "home"}-copy-${n}`;
  const blocks = (
    Array.isArray(page.blocks) ? (page.blocks as unknown as Block[]) : []
  ).map((b) => ({ ...b, id: blockId() }));
  const last = await db.cmsPage.aggregate({ _max: { sortOrder: true } });
  return mapPage(
    await db.cmsPage.create({
      data: {
        slug,
        pageType: "custom",
        titleEn: page.titleEn,
        titleAr: page.titleAr,
        blocks: JSON.parse(JSON.stringify(blocks)),
        isVisible: false,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    }),
  );
}

/** Removes a page the company added; the built-in pages can be hidden but not removed. */
export async function deleteCmsPage(id: string) {
  const page = await db.cmsPage.findUnique({
    where: { id },
    select: { pageType: true },
  });
  if (!page) return;
  if (page.pageType !== "custom")
    throw new Error(serverMessages.cmsPageBuiltIn);
  await db.cmsPage.delete({ where: { id } });
}

export async function reorderCmsPages(ids: string[]) {
  await db.$transaction(
    ids
      .slice(0, 200)
      .map((id, index) =>
        db.cmsPage.updateMany({ where: { id }, data: { sortOrder: index } }),
      ),
  );
}

/** Whether a page shows on the website and in the header and footer menus (the homepage is always shown, menus never). */
export async function updateCmsPageFlags(
  id: string,
  flags: { is_visible: boolean; in_header: boolean; in_footer: boolean },
) {
  const page = await db.cmsPage.findUnique({
    where: { id },
    select: { pageType: true },
  });
  if (!page) return;
  const home = page.pageType === "home";
  await db.cmsPage.update({
    where: { id },
    data: {
      isVisible: home || flags.is_visible,
      inHeader: !home && flags.in_header,
      inFooter: !home && flags.in_footer,
    },
  });
}
