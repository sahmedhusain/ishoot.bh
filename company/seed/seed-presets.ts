import type { PrismaClient } from "@prisma/client";
import { ACTIVITY_PRESETS } from "../../apps/admin/lib/database/website-presets";
import {
  ACTIVITY_SAMPLES,
  SAMPLE_FAQS,
} from "../../apps/admin/lib/database/samples/activity-samples";
import { applyActivityDealPipeline } from "../../apps/admin/lib/database/queries/deal-pipeline";
import type { DemoPreset } from "./demo-presets";
import { setModule } from "../../apps/admin/lib/api/system";

/** Install preset content before volume generation so its services are used in the sales history. */
export async function seedPresetWebsite(
  db: PrismaClient,
  preset: DemoPreset,
  ownerId: string,
) {
  const primary = ACTIVITY_SAMPLES[preset.activity];
  await applyActivityDealPipeline(preset.activity);
  for (const module of preset.modules) {
    await setModule(module.moduleKey, module.isEnabled, ownerId);
  }
  if (preset.activity !== "media") {
    await db.portfolioItem.deleteMany();
    await db.portfolioCategory.deleteMany();
    await db.service.updateMany({ data: { isActive: false, isPublic: false } });
    await db.heroBanner.updateMany({
      data: {
        titleEn: primary.banner.title[0],
        titleAr: primary.banner.title[1],
        subtitleEn: primary.banner.subtitle[0],
        subtitleAr: primary.banner.subtitle[1],
      },
    });
    await db.faq.deleteMany();
    await db.faq.createMany({
      data: SAMPLE_FAQS.map((faq, sortOrder) => ({
        questionEn: faq.question[0],
        questionAr: faq.question[1],
        answerEn: faq.answer[0],
        answerAr: faq.answer[1],
        sortOrder,
      })),
    });
    await db.statistic.deleteMany();
    await db.statistic.createMany({
      data: primary.stats.map((stat, sortOrder) => ({
        value: stat.value,
        labelEn: stat.label[0],
        labelAr: stat.label[1],
        sortOrder,
      })),
    });
    await db.companySetting.updateMany({
      data: {
        aboutTextEn: primary.banner.subtitle[0],
        aboutTextAr: primary.banner.subtitle[1],
        missionEn: primary.banner.title[0],
        missionAr: primary.banner.title[1],
        termsEn:
          "Demo terms: scope, price and delivery are confirmed before work starts.",
        termsAr:
          "شروط تجريبية: يتم تأكيد النطاق والسعر والتسليم قبل بدء العمل.",
      },
    });
    await db.review.updateMany({
      data: {
        quoteEn:
          "Clear communication, reliable service and a helpful team throughout.",
        quoteAr: "تواصل واضح وخدمة موثوقة وفريق متعاون طوال التجربة.",
      },
    });
  }
  const images = (
    await db.heroBanner.findMany({ orderBy: { displayOrder: "asc" } })
  ).map((banner) => banner.mediaUrl);
  for (const [activityIndex, activity] of preset.activities.entries()) {
    const sample = ACTIVITY_SAMPLES[activity];
    const category = await db.portfolioCategory.create({
      data: {
        slug: `demo-${activity}`,
        nameEn: sample.banner.title[0],
        nameAr: sample.banner.title[1],
        displayOrder: activityIndex + 10,
      },
    });
    for (let i = 0; i < 12; i++) {
      const item = sample.items[i % sample.items.length];
      const edition = Math.floor(i / sample.items.length);
      const fields = ACTIVITY_PRESETS[activity].collection.fields;
      await db.portfolioItem.create({
        data: {
          categoryId: category.id,
          slug: `demo-${activity}-${i + 1}`,
          titleEn:
            item.title[0] +
            (edition ? ` — ${edition === 1 ? "Premium" : "Custom"}` : ""),
          titleAr:
            item.title[1] +
            (edition ? ` — ${edition === 1 ? "مميز" : "حسب الطلب"}` : ""),
          subtitleEn: item.subtitle[0],
          subtitleAr: item.subtitle[1],
          descriptionEn: `${sample.banner.subtitle[0]} ${item.subtitle[0]}.`,
          descriptionAr: `${sample.banner.subtitle[1]} ${item.subtitle[1]}.`,
          price: fields.includes("price") ? item.price : null,
          location: fields.includes("location")
            ? ["Manama", "Riffa", "Muharraq"][i % 3]
            : null,
          clientName: fields.includes("client")
            ? ["Harbor National Bank", "Bayview Grand Hotel", "Pearl Holding"][
                i % 3
              ]
            : null,
          year: fields.includes("year")
            ? new Date().getFullYear() - edition
            : null,
          thumbnailUrl: images[i % images.length],
          galleryUrls: fields.includes("gallery") ? images : [],
          attributes: fields.includes("attributes")
            ? [
                {
                  labelEn: "Package",
                  labelAr: "الباقة",
                  valueEn:
                    edition === 0
                      ? "Standard"
                      : edition === 1
                        ? "Premium"
                        : "Custom",
                  valueAr:
                    edition === 0
                      ? "أساسي"
                      : edition === 1
                        ? "مميز"
                        : "حسب الطلب",
                },
              ]
            : [],
          displayOrder: activityIndex * 12 + i + 10,
          isFeatured: i < 2,
        },
      });
    }
    for (const [index, service] of sample.services.entries()) {
      await db.service.create({
        data: {
          code: `DEMO-${activity.toUpperCase()}-${index + 1}`,
          nameEn: service.name[0],
          nameAr: service.name[1],
          descriptionEn: service.description[0],
          descriptionAr: service.description[1],
          unit: "project",
          category: "consulting",
          defaultRate: sample.items[index]?.price ?? 150,
          isPublic: true,
          displayOrder: activityIndex * 3 + index,
        },
      });
    }
    for (let i = 0; i < 4; i++) {
      const titleEn = `${sample.banner.title[0]}: ${["Our approach", "Client story", "Coming soon", "Team notes"][i]}`;
      const titleAr = `${sample.banner.title[1]}: ${["منهجنا", "قصة عميل", "قريبًا", "ملاحظات الفريق"][i]}`;
      const body = (text: string) => ({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });
      await db.cmsArticle.create({
        data: {
          slug: `demo-${activity}-article-${i + 1}`,
          titleEn,
          titleAr,
          excerptEn: sample.banner.subtitle[0],
          excerptAr: sample.banner.subtitle[1],
          bodyEn: body(sample.banner.subtitle[0]),
          bodyAr: body(sample.banner.subtitle[1]),
          bodyHtmlEn: `<p>${sample.banner.subtitle[0]}</p>`,
          bodyHtmlAr: `<p>${sample.banner.subtitle[1]}</p>`,
          coverUrl: images[i % images.length],
          authorId: ownerId,
          category: ["news", "press_release", "update", "post"][i],
          tags: [activity, "demo"],
          status: i === 3 ? "draft" : "published",
          publishAt: new Date(
            Date.now() + (i === 2 ? 7 : -30 * (i + 1)) * 86_400_000,
          ),
          featured: i === 0,
        },
      });
    }
  }
  console.log(
    `✅ Preset ${preset.id}: ${preset.activities.length * 12} catalogue items, ${preset.activities.length * 4} articles; ${preset.modules.filter((m) => m.isEnabled).length} enabled modules`,
  );
}
