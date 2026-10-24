// Preview fixtures only. This script refuses non-test databases.
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("Use a disposable *_test database");
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
  },
});
const { db } = require("../../packages/database/src/db.ts");
const { loadCompanyProfile, importProfileFile } = require("../tools/company-profile.ts");
const { createRequire } = require("node:module");
const databaseRequire = createRequire(
  require("node:path").resolve(__dirname, "../../packages/database/package.json"),
);
async function main() {
  const passwordHash = await databaseRequire("bcryptjs").hash(
    "Preview-only-2026!",
    10,
  );
  const admin = await db.user.upsert({
    where: { email: "preview@example.invalid" },
    update: { passwordHash },
    create: {
      email: "preview@example.invalid",
      fullName: "Preview administrator",
      role: "super_admin",
      passwordHash,
    },
  });
  // Preview images come from the neutral demo profile.
  const profile = loadCompanyProfile("demo");
  const banners = [];
  for (let i = 1; i <= 3; i++) banners.push(await importProfileFile(db, profile, `media/banners/banner-0${i}.jpg`, admin.id));
  await db.heroBanner.upsert({
    where: { id: "preview-banner" },
    update: {},
    create: {
      id: "preview-banner",
      titleEn: "Stories in motion.\nAn impression that stays.",
      titleAr: "قصص تُرى.\nوأثر يبقى.",
      subtitleEn:
        "Visual production, from the first idea to the final frame. Based in Bahrain.",
      subtitleAr: "إنتاج مرئي من الفكرة الأولى إلى المشهد الأخير، من البحرين.",
      mediaType: "image",
      mediaUrl: banners[0],
      ctaLabelEn: "Tell us your idea",
      ctaLabelAr: "ناقش مشروعك",
      ctaLink: "/contact?intent=quote_request",
    },
  });
  const category = await db.portfolioCategory.upsert({
    where: { slug: "preview-production" },
    update: {},
    create: {
      slug: "preview-production",
      nameEn: "Production",
      nameAr: "الإنتاج",
    },
  });
  for (let i = 1; i <= 3; i++)
    await db.portfolioItem.upsert({
      where: { slug: `preview-project-${i}` },
      update: {},
      create: {
        slug: `preview-project-${i}`,
        titleEn: [
          "A different perspective",
          "Behind the frame",
          "Built around a story",
        ][i - 1],
        titleAr: ["منظور مختلف", "خلف الكادر", "حكاية تستحق الصورة"][i - 1],
        clientName: "Preview project",
        year: 2026,
        thumbnailUrl: banners[i - 1],
        isFeatured: true,
        categoryId: category.id,
        displayOrder: i,
        descriptionEn:
          "Local preview fixture. Replace with approved project content before publishing.",
      },
    });
  const services = [
    [
      "Commercial production",
      "إنتاج إعلاني",
      "From a considered brief to a finished film, shaped around your audience.",
      "من موجز مدروس إلى فيلم متكامل يعبر عن علامتك.",
    ],
    [
      "Aerial cinematography",
      "تصوير جوي",
      "A fresh perspective for places, architecture and stories in motion.",
      "منظور جديد للأماكن والعمارة والقصص المتحركة.",
    ],
    [
      "Post-production",
      "ما بعد الإنتاج",
      "Editing, color and sound brought together in the final frame.",
      "مونتاج وألوان وصوت تجتمع في المشهد الأخير.",
    ],
  ];
  for (let i = 0; i < services.length; i++)
    await db.service.upsert({
      where: { code: `PREVIEW-${i}` },
      update: { isPublic: true },
      create: {
        code: `PREVIEW-${i}`,
        nameEn: services[i][0],
        nameAr: services[i][1],
        descriptionEn: services[i][2],
        descriptionAr: services[i][3],
        isPublic: true,
        displayOrder: i,
      },
    });
  for (const [id, q, a, qar, aar] of [
    [
      "preview-faq-1",
      "What should I include in a brief?",
      "Tell us your objective, audience, preferred date and the deliverables you need.",
      "ماذا أضمّن في موجز المشروع؟",
      "شاركنا هدفك وجمهورك والموعد المفضل والمخرجات المطلوبة.",
    ],
    [
      "preview-faq-2",
      "Can I discuss an idea before requesting a quote?",
      "Yes. Choose Inquiry on the contact page and tell us what you have in mind.",
      "هل يمكنني مناقشة الفكرة قبل طلب عرض سعر؟",
      "نعم. اختر استفساراً في صفحة التواصل وشاركنا فكرتك.",
    ],
  ])
    await db.faq.upsert({
      where: { id },
      update: {},
      create: {
        id,
        questionEn: q,
        answerEn: a,
        questionAr: qar,
        answerAr: aar,
      },
    });
  const {
    collectWebsiteDraft,
  } = require("../../packages/database/src/queries/website.ts");
  const {
    defaultWebsiteConfig,
  } = require("../../packages/database/src/website-config.ts");
  const snapshot = await collectWebsiteDraft(defaultWebsiteConfig);
  await db.websiteContent.upsert({
    where: { id: "main" },
    update: {
      draft: defaultWebsiteConfig,
      published: JSON.parse(JSON.stringify(snapshot)),
    },
    create: {
      id: "main",
      draft: defaultWebsiteConfig,
      published: JSON.parse(JSON.stringify(snapshot)),
      publishedAt: new Date(),
    },
  });
  console.log("Preview fixtures prepared in the isolated test database.");
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
