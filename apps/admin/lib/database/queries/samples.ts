import { randomUUID } from "node:crypto";
import { db } from "../atomic";
import {
  ACTIVITY_SAMPLES,
  SAMPLE_ARTICLE,
  SAMPLE_FAQS,
  sampleImage,
} from "../samples/activity-samples";
import { activityPreset, type BusinessActivity } from "../website-presets";
import {
  resolveWebsiteConfig,
  websiteConfigForActivity,
  type PublicService,
} from "../website-config";
import { defaultCmsPages, type CmsPageRecord } from "./cms-pages";
import type { PublicArticle } from "./cms-articles";
import type { WebsiteSnapshot } from "./website";
import type { HeroBanner, PortfolioItem } from "../types";

const paragraph = (text: string) =>
  `<p>${text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)}</p>`;
const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

/** How much sample content there is (the Website page offers to remove it while any is left). */
export async function sampleContentCount() {
  const counts = await Promise.all([
    db.heroBanner.count({ where: { isSample: true } }),
    db.portfolioItem.count({ where: { isSample: true } }),
    db.service.count({ where: { isSample: true } }),
    db.faq.count({ where: { isSample: true } }),
    db.statistic.count({ where: { isSample: true } }),
    db.cmsArticle.count({ where: { isSample: true } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

/**
 * Fills the website with an activity's sample content (banners, catalogue, services, questions, figures and an
 * article), all marked as samples. Adding twice does not duplicate: earlier samples are replaced.
 */
export async function insertSampleContent(
  activity: BusinessActivity,
  authorId: string | null,
) {
  const sample = ACTIVITY_SAMPLES[activity];
  const prices = activityPreset(activity).collection.fields.includes("price");
  await removeSampleContent();
  await db.$transaction(async (tx) => {
    await tx.heroBanner.create({
      data: {
        titleEn: sample.banner.title[0],
        titleAr: sample.banner.title[1],
        subtitleEn: sample.banner.subtitle[0],
        subtitleAr: sample.banner.subtitle[1],
        mediaType: "image",
        mediaUrl: sampleImage("banner", 0),
        displayOrder: 0,
        isSample: true,
      },
    });
    for (let index = 0; index < sample.items.length; index++) {
      const item = sample.items[index];
      await tx.portfolioItem.create({
        data: {
          slug: `sample-${index + 1}-${randomUUID().slice(0, 6)}`,
          titleEn: item.title[0],
          titleAr: item.title[1],
          subtitleEn: item.subtitle[0],
          subtitleAr: item.subtitle[1],
          price: prices && item.price !== null ? item.price : null,
          thumbnailUrl: sampleImage("item", index),
          isFeatured: index === 0,
          displayOrder: index,
          isSample: true,
        },
      });
    }
    for (let index = 0; index < sample.services.length; index++) {
      const service = sample.services[index];
      await tx.service.create({
        data: {
          nameEn: service.name[0],
          nameAr: service.name[1],
          descriptionEn: service.description[0],
          descriptionAr: service.description[1],
          category: "other",
          unit: "project",
          isPublic: true,
          displayOrder: index,
          isSample: true,
        },
      });
    }
    for (let index = 0; index < SAMPLE_FAQS.length; index++) {
      const faq = SAMPLE_FAQS[index];
      await tx.faq.create({
        data: {
          questionEn: faq.question[0],
          questionAr: faq.question[1],
          answerEn: faq.answer[0],
          answerAr: faq.answer[1],
          sortOrder: index,
          isSample: true,
        },
      });
    }
    for (let index = 0; index < sample.stats.length; index++) {
      const stat = sample.stats[index];
      await tx.statistic.create({
        data: {
          value: stat.value,
          labelEn: stat.label[0],
          labelAr: stat.label[1],
          sortOrder: index,
          isSample: true,
        },
      });
    }
    await tx.cmsArticle.upsert({
      where: { slug: SAMPLE_ARTICLE.slug },
      update: {},
      create: {
        slug: SAMPLE_ARTICLE.slug,
        titleEn: SAMPLE_ARTICLE.title[0],
        titleAr: SAMPLE_ARTICLE.title[1],
        excerptEn: SAMPLE_ARTICLE.excerpt[0],
        excerptAr: SAMPLE_ARTICLE.excerpt[1],
        bodyEn: doc(SAMPLE_ARTICLE.body[0]),
        bodyAr: doc(SAMPLE_ARTICLE.body[1]),
        bodyHtmlEn: paragraph(SAMPLE_ARTICLE.body[0]),
        bodyHtmlAr: paragraph(SAMPLE_ARTICLE.body[1]),
        coverUrl: sampleImage("banner", 1),
        status: "published",
        publishAt: new Date(),
        authorId,
        isSample: true,
      },
    });
  });
}

/** Removes every sample (and only samples); content the company wrote is never touched. */
export async function removeSampleContent() {
  await db.$transaction([
    db.heroBanner.deleteMany({ where: { isSample: true } }),
    db.portfolioItem.deleteMany({ where: { isSample: true } }),
    db.service.deleteMany({ where: { isSample: true } }),
    db.faq.deleteMany({ where: { isSample: true } }),
    db.statistic.deleteMany({ where: { isSample: true } }),
    db.cmsArticle.deleteMany({ where: { isSample: true } }),
  ]);
}

/**
 * A complete website snapshot for an activity built from its samples, in memory: what "Show an example" previews
 * in the setup wizard. Nothing is saved.
 */
export function exampleSnapshot(activity: BusinessActivity): WebsiteSnapshot {
  const sample = ACTIVITY_SAMPLES[activity];
  const config = resolveWebsiteConfig(websiteConfigForActivity(activity));
  const prices = activityPreset(activity).collection.fields.includes("price");
  const now = new Date().toISOString();
  const banners: HeroBanner[] = [
    {
      id: "example-banner",
      title_en: sample.banner.title[0],
      title_ar: sample.banner.title[1],
      subtitle_en: sample.banner.subtitle[0],
      subtitle_ar: sample.banner.subtitle[1],
      media_type: "image",
      media_url: sampleImage("banner", 0),
      display_order: 0,
      is_active: true,
      created_at: now,
    },
  ];
  const portfolio = sample.items.map((item, index): PortfolioItem => ({
    id: `example-item-${index}`,
    slug: `example-${index + 1}`,
    title_en: item.title[0],
    title_ar: item.title[1],
    client_name: "",
    subtitle_en: item.subtitle[0],
    subtitle_ar: item.subtitle[1],
    price: prices && item.price !== null ? item.price : undefined,
    attributes: [],
    aspect_ratio: "16:9",
    thumbnail_url: sampleImage("item", index),
    is_featured: index === 0,
    display_order: index,
    created_at: now,
  }));
  const services: PublicService[] = sample.services.map((service, index) => ({
    id: `example-service-${index}`,
    nameEn: service.name[0],
    nameAr: service.name[1],
    descriptionEn: service.description[0],
    descriptionAr: service.description[1],
    imageUrl: null,
  }));
  const created = new Date();
  const faqs: WebsiteSnapshot["faqs"] = SAMPLE_FAQS.map((faq, index) => ({
    id: `example-faq-${index}`,
    questionEn: faq.question[0],
    questionAr: faq.question[1],
    answerEn: faq.answer[0],
    answerAr: faq.answer[1],
    category: "general",
    isPublished: true,
    sortOrder: index,
    createdAt: created,
    isSample: true,
  }));
  const stats: WebsiteSnapshot["stats"] = sample.stats.map((stat, index) => ({
    id: `example-stat-${index}`,
    value: stat.value,
    storedValue: stat.value,
    labelEn: stat.label[0],
    labelAr: stat.label[1],
    subLabelEn: null,
    subLabelAr: null,
    icon: null,
    sortOrder: index,
    source: "manual",
    preset: null,
    presetParam: null,
    roundTo: null,
    suffix: null,
    isSample: true,
  }));
  const pages: CmsPageRecord[] = defaultCmsPages(config).map((page, index) => ({
    id: `example-page-${index}`,
    slug: page.slug,
    page_type: page.pageType as CmsPageRecord["page_type"],
    title_en: page.titleEn,
    title_ar: page.titleAr,
    seo_title_en: "",
    seo_title_ar: "",
    seo_description_en: "",
    seo_description_ar: "",
    blocks: page.blocks,
    is_visible: page.isVisible,
    in_header: page.inHeader,
    in_footer: page.inFooter,
    sort_order: page.sortOrder,
    updated_at: now,
  }));
  const articles: PublicArticle[] = [
    {
      id: "example-article",
      slug: SAMPLE_ARTICLE.slug,
      title_en: SAMPLE_ARTICLE.title[0],
      title_ar: SAMPLE_ARTICLE.title[1],
      excerpt_en: SAMPLE_ARTICLE.excerpt[0],
      excerpt_ar: SAMPLE_ARTICLE.excerpt[1],
      body_html_en: paragraph(SAMPLE_ARTICLE.body[0]),
      body_html_ar: paragraph(SAMPLE_ARTICLE.body[1]),
      cover_url: sampleImage("banner", 1),
      category: "news",
      tags: [],
      author_name: "",
      publish_at: now,
      featured: false,
      seo_title_en: "",
      seo_title_ar: "",
      seo_description_en: "",
      seo_description_ar: "",
    },
  ];
  return {
    config,
    categories: Array.from(new Map(portfolio.filter(item => item.category).map(item => [item.category!.slug, item.category!])).values()),
    brandTheme: undefined as import("../constants/theme").BrandTheme | undefined,
    brandAssets: undefined as import("./website").WebsiteSnapshot["brandAssets"] | undefined,
    banners,
    portfolio,
    clients: [],
    faqs,
    stats,
    services,
    pages,
    articles,
  };
}
