import { ACTIVITY_PRESETS } from "../../apps/admin/lib/database/website-presets";
import {
  ACTIVITY_SAMPLES,
  SAMPLE_FAQS,
} from "../../apps/admin/lib/database/samples/activity-samples";
import { applyActivityDealPipeline } from "../../apps/admin/lib/database/queries/deal-pipeline";
import type { DemoPreset } from "./demo-presets";
import { setModule } from "../../apps/admin/lib/api/system";
import {
  listFAQs,
  createFAQ,
  deleteFAQ,
  listStatistics,
  upsertStatistic,
  deleteStatistic,
  listReviews,
  createReview,
  updateReview,
  deleteReview,
  listArticles,
  createArticle,
  deleteArticle,
} from "../../apps/admin/lib/api/cms";
import { updateCompanySettings } from "../../apps/admin/lib/database/queries/company-settings";

/** Install preset content before volume generation so its services are used in the sales history. */
export async function seedPresetWebsite(
  db: any,
  preset: DemoPreset,
  ownerId: string,
) {
  const primary = ACTIVITY_SAMPLES[preset.activity];
  await applyActivityDealPipeline(preset.activity);

  for (const module of preset.modules) {
    await setModule(module.moduleKey, module.isEnabled, ownerId).catch(() => {});
  }

  if (preset.activity !== "media") {
    // Clean existing FAQs
    const existingFaqs = await listFAQs(true).catch(() => []);
    for (const faq of existingFaqs) {
      await deleteFAQ("service-token", faq.id).catch(() => {});
    }
    for (const [sortOrder, faq] of SAMPLE_FAQS.entries()) {
      await createFAQ("service-token", {
        questionEn: faq.question[0],
        questionAr: faq.question[1],
        answerEn: faq.answer[0],
        answerAr: faq.answer[1],
        sortOrder,
        isPublished: true,
        category: "general",
      }).catch(() => {});
    }

    // Clean and seed statistics
    const existingStats = await listStatistics().catch(() => []);
    for (const stat of existingStats) {
      await deleteStatistic("service-token", stat.id).catch(() => {});
    }
    for (const [sortOrder, stat] of primary.stats.entries()) {
      await upsertStatistic("service-token", {
        id: `stat-${sortOrder + 1}`,
        metricValue: stat.value,
        labelEn: stat.label[0],
        labelAr: stat.label[1],
        sortOrder,
      }).catch(() => {});
    }

    // Update Company Settings
    await updateCompanySettings({
      about_text_en: primary.banner.subtitle[0],
      about_text_ar: primary.banner.subtitle[1],
      mission_en: primary.banner.title[0],
      mission_ar: primary.banner.title[1],
      terms_en:
        "Demo terms: scope, price and delivery are confirmed before work starts.",
      terms_ar:
        "شروط تجريبية: يتم تأكيد النطاق والسعر والتسليم قبل بدء العمل.",
    }).catch(() => {});

    // Seed Reviews
    const existingReviews = await listReviews(true).catch(() => []);
    for (const review of existingReviews) {
      await updateReview("service-token", review.id, {
        quoteEn:
          "Clear communication, reliable service and a helpful team throughout.",
        quoteAr: "تواصل واضح وخدمة موثوقة وفريق متعاون طوال التجربة.",
      }).catch(() => {});
    }
  }

  // Seed Articles per activity
  for (const [activityIndex, activity] of preset.activities.entries()) {
    const sample = ACTIVITY_SAMPLES[activity];

    for (let i = 0; i < 4; i++) {
      const titleEn = `${sample.banner.title[0]}: ${["Our approach", "Client story", "Coming soon", "Team notes"][i]}`;
      const titleAr = `${sample.banner.title[1]}: ${["منهجنا", "قصة عميل", "قريبًا", "ملاحظات الفريق"][i]}`;
      const body = (text: string) => ({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });

      await createArticle("service-token", {
        slug: `demo-${activity}-article-${i + 1}`,
        titleEn,
        titleAr,
        excerptEn: sample.banner.subtitle[0],
        excerptAr: sample.banner.subtitle[1],
        bodyEn: body(sample.banner.subtitle[0]),
        bodyAr: body(sample.banner.subtitle[1]),
        bodyHtmlEn: `<p>${sample.banner.subtitle[0]}</p>`,
        bodyHtmlAr: `<p>${sample.banner.subtitle[1]}</p>`,
        category: ["news", "press_release", "update", "post"][i],
        tags: [activity, "demo"],
        status: i === 3 ? "draft" : "published",
        featured: i === 0,
      }).catch(() => {});
    }
  }

  console.log(
    `✅ Preset ${preset.id}: ${preset.activities.length * 4} articles seeded via Go API; ${preset.modules.filter((m) => m.isEnabled).length} enabled modules`,
  );
}
