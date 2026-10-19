import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "fs";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultWebsiteConfig } from "../../packages/database/src/website-config";
import { workingDaysBetween } from "../../packages/database/src/hr/payroll-engine";
import { ALL_ACTIONS, ALL_RESOURCES, ALL_ROLES, isDefaultAllowed } from "../../packages/database/src/constants/permissions";
import { collectWebsiteDraft } from "../../packages/database/src/queries/website";
import { calculateInvoiceTotals } from "../../packages/database/src/types";
import { seedVolume, reconcileSeed } from "./seed-volume";
import { storeFileBytes } from "../../packages/database/src/services/uploads";
import { db as websiteDb } from "../../packages/database/src/db";
import { importProfileFile, installCompanyProfile, loadCompanyProfile, profileAssetPath } from "../tools/company-profile";
import demoStaff from "./demo-staff.json";
import demoClients from "./demo-clients.json";
import { DEFAULT_FEATURE_MODULES } from "../../packages/database/src/constants/features";

const prisma = new PrismaClient();

/** A one-page PDF that says what the demo document stands for (a real file, so previews and downloads work). */
function placeholderPdf(title: string) {
  const text = title.replace(/[()\\]/g, "");
  const stream = `BT /F1 20 Tf 60 760 Td (${text}) Tj 0 -32 Td /F1 12 Tf (Demo document - sample content only.) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

/** Stores a placeholder PDF in the private vault and returns its file URL. */
async function demoDocument(fileName: string, ownerId: string) {
  const bytes = placeholderPdf(fileName.replace(/\.pdf$/i, "").replace(/-/g, " "));
  const fileUrl = `/api/files/vault/seed_${crypto.createHash("sha256").update(fileName).digest("hex").slice(0, 16)}.pdf`;
  await storeFileBytes(fileUrl, bytes, "application/pdf");
  await prisma.uploadObject.upsert({
    where: { fileUrl },
    update: {},
    create: { fileUrl, ownerId, fileName, fileSize: bytes.length, mimeType: "application/pdf", isPublic: false, claimedAt: new Date(), expiresAt: new Date("2999-12-31T00:00:00Z") },
  });
  return fileUrl;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production; use pnpm db:bootstrap for initial real accounts and configuration.");
  // Demo fixtures must never replace existing business records.
  const existing = await Promise.all([
    prisma.invoice.count(), prisma.payment.count(), prisma.attachment.count(),
    prisma.crmContact.count(), prisma.crmDeal.count(), prisma.expense.count(),
    prisma.inquiry.count(), prisma.statistic.count(), prisma.faq.count(), prisma.review.count(),
    prisma.companyAsset.count(), prisma.heroBanner.count(), prisma.portfolioCategory.count(),
    prisma.portfolioItem.count(), prisma.clientLogo.count(), prisma.studioEquipment.count(),
    prisma.websiteContent.count(), prisma.calendarEvent.count(),
    prisma.documentTemplate.count(), prisma.contract.count(), prisma.minuteOfMeeting.count(),
    prisma.generatedDocument.count(), prisma.companyDocument.count(), prisma.service.count(),
    prisma.socialLink.count(), prisma.quotation.count(), prisma.uploadObject.count(),
  ]);
  if (existing.some((count) => count > 0)) throw new Error("Demo seed requires an empty business database. Existing records were preserved. Use pnpm db:bootstrap for initial accounts/settings without replacing data.");
  console.log("🌱 Starting dynamic enterprise database seed...");

  const profile = loadCompanyProfile();
  const BRAND_EN = profile.display.nameEn;
  const BRAND_AR = profile.display.nameAr;
  const INVOICE_PREFIX = String(profile.company.invoicePrefix || "INV");
  console.log(`🏢 Company profile: company/profiles/${profile.name} (${profile.company.companyNameEn})`);

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      "SECURITY CONFIGURATION REQUISITE: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be strictly defined in environment (.env). Fallback credentials or '||' operators are strictly prohibited for database bootstrapping.",
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(superAdminEmail) || superAdminPassword.length < 12 || Buffer.byteLength(superAdminPassword, "utf8") > 72) {
    throw new Error("Set a valid SUPER_ADMIN_EMAIL and a SUPER_ADMIN_PASSWORD of at least 12 characters and at most 72 UTF-8 bytes.");
  }

  const superAdminName = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE ?? "";

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  const systemRoles = [
    { id: "super_admin", nameEn: "Super Administrator", nameAr: "مسؤول النظام العام", isSystem: true },
    { id: "admin", nameEn: "System Administrator", nameAr: "مدير النظام", isSystem: true },
    { id: "finance_manager", nameEn: "Finance Manager", nameAr: "المدير المالي", isSystem: true },
    { id: "production_manager", nameEn: "Production Manager", nameAr: "مدير الإنتاج", isSystem: true },
    { id: "sales", nameEn: "Commercial Sales Director", nameAr: "مدير المبيعات التجارية", isSystem: true },
    { id: "marketing", nameEn: "Marketing Manager", nameAr: "مدير التسويق", isSystem: true },
    { id: "producer", nameEn: "Executive Producer", nameAr: "المنتج المنفذ", isSystem: true },
    { id: "editor", nameEn: "Post-Production Editor", nameAr: "محرر المونتاج", isSystem: true },
    { id: "accountant", nameEn: "Accountant", nameAr: "محاسب", isSystem: true },
    { id: "viewer", nameEn: "Read-Only Observer", nameAr: "مراقب", isSystem: true },
  ];

  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: role,
      create: role,
    });
  }

  // Fictional staff (company/seed/demo-staff.json); the first one is the configured super admin.
  const usersData = demoStaff.map((person) =>
    person.role === "super_admin"
      ? { ...person, email: superAdminEmail, fullName: superAdminName, phone: superAdminPhone }
      : { ...person, email: person.email as string, fullName: person.nameAr, phone: person.phone ?? "" },
  );

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, fullName: u.fullName, department: u.department, phone: u.phone },
      create: { email: u.email, fullName: u.fullName, passwordHash, role: u.role, department: u.department, phone: u.phone, isActive: true },
    });
    createdUsers[u.role] = user;
  }

  // Brand files go into upload storage, owned by the super admin, so no app keeps company files in public/.
  const owner = createdUsers["super_admin"];
  const signatureUrls: Record<string, string> = {};
  for (const u of usersData) {
    const file = `brand/signatures/${u.key}.png`;
    if (!fs.existsSync(profileAssetPath(profile, file))) continue;
    signatureUrls[u.key] = await importProfileFile(prisma, profile, file, owner.id);
    await prisma.user.update({ where: { id: createdUsers[u.role].id }, data: { signatureUrl: signatureUrls[u.key] } });
  }
  const signatureOf = (key: string) => signatureUrls[key] ?? null;

  // Establish Reporting To Hierarchy
  const ceo = createdUsers["super_admin"];
  const director = createdUsers["admin"];
  const prodManager = createdUsers["production_manager"];
  const finManager = createdUsers["finance_manager"];

  if (ceo) {
    if (director) await prisma.user.update({ where: { id: director.id }, data: { managerId: ceo.id } });
    if (finManager) await prisma.user.update({ where: { id: finManager.id }, data: { managerId: ceo.id } });
    if (prodManager) await prisma.user.update({ where: { id: prodManager.id }, data: { managerId: ceo.id } });
    if (createdUsers["sales"]) await prisma.user.update({ where: { id: createdUsers["sales"].id }, data: { managerId: ceo.id } });
    if (createdUsers["marketing"]) await prisma.user.update({ where: { id: createdUsers["marketing"].id }, data: { managerId: ceo.id } });
  }
  if (prodManager) {
    if (createdUsers["producer"]) await prisma.user.update({ where: { id: createdUsers["producer"].id }, data: { managerId: prodManager.id } });
    if (createdUsers["editor"]) await prisma.user.update({ where: { id: createdUsers["editor"].id }, data: { managerId: prodManager.id } });
  }
  if (finManager && createdUsers["accountant"]) {
    await prisma.user.update({ where: { id: createdUsers["accountant"].id }, data: { managerId: finManager.id } });
  }
  if (director && createdUsers["viewer"]) {
    await prisma.user.update({ where: { id: createdUsers["viewer"].id }, data: { managerId: director.id } });
  }
  console.log(`✅ Created ${usersData.length} RBAC Users with Signatures & Hierarchy (passwords use the configured SUPER_ADMIN_PASSWORD)`);

  // Seed resets every system role to the shared defaults (packages/database/src/constants/permissions.ts).
  for (const role of ALL_ROLES) {
    await prisma.permission.deleteMany({ where: { role } });
    await prisma.permission.createMany({
      data: ALL_RESOURCES.flatMap((resource) =>
        ALL_ACTIONS.map((action) => ({ role, resource, action, allowed: isDefaultAllowed(role, resource, action) })),
      ),
    });
  }
  console.log("✅ Seeded Granular RBAC Permissions Matrix");

  await installCompanyProfile(prisma, profile, owner.id, { markSetupComplete: true });
  console.log("✅ Installed company identity, brand files and theme from the company profile");

  const socialLinks = [
    { platform: "Instagram", url: profile.company.instagramUrl, icon: "Instagram" },
    { platform: "LinkedIn", url: profile.company.linkedinUrl, icon: "Linkedin" },
    { platform: "YouTube", url: profile.company.youtubeUrl, icon: "Youtube" },
  ].filter((link): link is { platform: string; url: string; icon: string } => typeof link.url === "string" && !!link.url);

  for (const [index, sl] of socialLinks.entries()) {
    await prisma.socialLink.create({ data: { ...sl, displayOrder: index + 1, isActive: true } });
  }
  console.log("✅ Seeded Social Links");

  // Hero images come from the profile's media folder.
  const bannerDir = profileAssetPath(profile, "media/banners");
  const bannerFiles = fs.existsSync(bannerDir) ? fs.readdirSync(bannerDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
  const bannerUrls: string[] = [];
  for (const file of bannerFiles) bannerUrls.push(await importProfileFile(prisma, profile, `media/banners/${file}`, owner.id));
  const banner = (i: number) => bannerUrls.length ? bannerUrls[i % bannerUrls.length] : "";

  const banners = [
    {
      id: "banner-01",
      titleEn: "CINEMA IN EVERY FRAME.",
      titleAr: "سينما في كل إطار.",
      subtitleEn:
        "High-end commercial cinematography, aerial drone capture, and creative studio productions based in Bahrain.",
      subtitleAr:
        "تصوير سينمائي إعلاني، وتصوير جوي سينمائي، وتصحيح ألوان متقدم في مملكة البحرين.",
      mediaType: "image",
      mediaUrl: banner(0),
      posterUrl: banner(0),
      displayOrder: 1,
      isActive: true,
      ctaLabelEn: "Explore Works",
      ctaLabelAr: "استكشف الأعمال",
      ctaLink: "/works",
    },
    {
      id: "banner-02",
      titleEn: "PRECISION CINEMATOGRAPHY",
      titleAr: "دقة بصرية سينمائية متناهية",
      subtitleEn:
        "Equipped with RED V-Raptor 8K and ARRI optical primes for prestigious brand anthems.",
      subtitleAr:
        "مجهزون بأحدث كاميرات ريد في-رابتور 8 كي وعدسات آرّي للعلامات التجارية الرائدة.",
      mediaType: "image",
      mediaUrl: banner(1),
      posterUrl: banner(1),
      displayOrder: 2,
      isActive: true,
      ctaLabelEn: "Our Gear Locker",
      ctaLabelAr: "خزانة المعدات",
      ctaLink: "/about",
    },
    {
      id: "banner-03",
      titleEn: "LICENSED AERIAL & FPV",
      titleAr: "تصوير جوي مرخص وتقنيات FPV",
      subtitleEn:
        "Capturing dynamic perspectives across the Arabian Gulf with heavy-lift cinema drones.",
      subtitleAr:
        "نلتقط زوايا جوية مذهلة في سماء الخليج العربي بطائرات الدرون السينمائية.",
      mediaType: "image",
      mediaUrl: banner(2),
      posterUrl: banner(2),
      displayOrder: 3,
      isActive: true,
      ctaLabelEn: "Start a Project",
      ctaLabelAr: "ابدأ مشروعك",
      ctaLink: "/contact",
    },
  ];

  for (const b of banners) {
    await prisma.heroBanner.upsert({
      where: { id: b.id },
      update: b,
      create: b,
    });
  }
  console.log("✅ Created 3 Hero Banners");

  const categories = [
    {
      id: "cat-01",
      slug: "commercial",
      nameEn: "Commercials",
      nameAr: "إعلانات تجارية",
      displayOrder: 1,
    },
    {
      id: "cat-02",
      slug: "aerial",
      nameEn: "Aerial & FPV",
      nameAr: "تصوير جوي و FPV",
      displayOrder: 2,
    },
    {
      id: "cat-03",
      slug: "documentary",
      nameEn: "Documentaries",
      nameAr: "أفلام وثائقية",
      displayOrder: 3,
    },
    {
      id: "cat-04",
      slug: "photography",
      nameEn: "Photography",
      nameAr: "تصوير فوتوغرافي",
      displayOrder: 4,
    },
    {
      id: "cat-05",
      slug: "color",
      nameEn: "Color Grading",
      nameAr: "تصحيح ألوان",
      displayOrder: 5,
    },
    {
      id: "cat-06",
      slug: "studio",
      nameEn: "Soundstage",
      nameAr: "إنتاج الاستوديو",
      displayOrder: 6,
    },
  ];

  for (const c of categories) {
    await prisma.portfolioCategory.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log("✅ Created 6 Portfolio Categories");

  const portfolioItems = [
    {
      id: "work-01",
      categoryId: "cat-01",
      slug: "batelco-national-day-anthem",
      titleEn: "Gulfwave — National Day Cinema Anthem",
      titleAr: "جلف ويف — فيلم اليوم الوطني السينمائي",
      clientName: "Gulfwave Telecommunications",
      year: 2025,
      aspectRatio: "2.39:1",
      thumbnailUrl:
        banner(0),
      previewVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4",
      fullVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4",
      galleryUrls: [
        banner(1),
        banner(2),
      ],
      descriptionEn:
        "A high-impact cinematic commercial capturing the heritage and technological future of Bahrain across 6 iconic locations.",
      descriptionAr:
        "عمل سينمائي فخم يوثق أصالة وتطور مملكة البحرين عبر 6 مواقع تاريخية وحديثة.",
      credits: {
        director: "Omar Haddad",
        dop: "Ali Alsamaheji",
        colorist: "DaVinci Resolve Certified Colorist",
        editor: "Fatima Alkaabi",
      },
      isFeatured: true,
      displayOrder: 1,
    },
    {
      id: "work-02",
      categoryId: "cat-02",
      slug: "bahrain-financial-harbour-fpv",
      titleEn: "Marina Financial Centre — High Speed FPV",
      titleAr: "مركز المارينا المالي — استعراض FPV فائق السرعة",
      clientName: "BFH Properties",
      year: 2025,
      aspectRatio: "16:9",
      thumbnailUrl:
        banner(3),
      previewVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-sunset-41477-large.mp4",
      fullVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-sunset-41477-large.mp4",
      galleryUrls: [],
      descriptionEn:
        "Dynamic acrobatic FPV flight weaving between twin towers during sunset golden hour.",
      descriptionAr:
        "طيران FPV سينمائي بهلواني بين الأبراج الزجاجية في الساعة الذهبية لغروب الشمس.",
      credits: {
        director: "Omar Haddad",
        dop: "Husain Aljamri",
        colorist: `${BRAND_EN} Grading Suite`,
        editor: "Fatima Alkaabi",
      },
      isFeatured: true,
      displayOrder: 2,
    },
    {
      id: "work-03",
      categoryId: "cat-01",
      slug: "gulf-air-falcon-gold",
      titleEn: "Falcon Airways — Falcon Gold Reimagined",
      titleAr: "طيران الفالكون — تجربة الصقر الذهبي",
      clientName: "Falcon Airways",
      year: 2024,
      aspectRatio: "2.39:1",
      thumbnailUrl:
        banner(4),
      descriptionEn:
        "Luxury airline cabin commercial filmed on soundstage with bespoke lighting rigs mimicking cruising altitude skies.",
      descriptionAr:
        "إعلان تجاري فخم لمقصورة الصقر الذهبي مصور داخل الاستوديو بمحاكاة إضاءة الطيران.",
      credits: {
        director: "Omar Haddad",
        dop: "Ali Alsamaheji",
        colorist: "DaVinci Resolve Studio",
        editor: "Fatima Alkaabi",
      },
      isFeatured: true,
      displayOrder: 3,
    },
    {
      id: "work-04",
      categoryId: "cat-03",
      slug: "alba-potline-6-heritage",
      titleEn: "SUMMIT — The Smelter of the Future",
      titleAr: "سميت — مصهر المستقبل",
      clientName: "Aluminium Bahrain (SUMMIT)",
      year: 2024,
      aspectRatio: "16:9",
      thumbnailUrl:
        banner(5),
      descriptionEn:
        "Industrial cinema documentary revealing molten metal craftsmanship and safety excellence.",
      descriptionAr:
        "فيلم وثائقي صناعي سينمائي يبرز ريادة مصهر الألمنيوم والكوادر الوطنية.",
      credits: {
        director: "Omar Haddad",
        dop: "Ali Alsamaheji",
        colorist: `${BRAND_EN} Suite`,
        editor: "Fatima Alkaabi",
      },
      isFeatured: true,
      displayOrder: 4,
    },
  ];

  for (const item of portfolioItems) {
    await prisma.portfolioItem.upsert({
      where: { id: item.id },
      update: item,
      create: item,
    });
  }
  console.log("✅ Created 4 Featured Portfolio Works");

  // Fictional clients (company/seed/demo-clients.json) with wordmarks generated into the demo profile.
  for (const [index, client] of demoClients.entries()) {
    const file = `media/clients/${client.slug}.png`;
    if (!fs.existsSync(profileAssetPath(profile, file))) continue;
    const data = {
      name: client.name,
      logoUrl: await importProfileFile(prisma, profile, file, owner.id),
      websiteUrl: `https://${client.slug}.example`,
      displayOrder: index + 1,
    };
    const id = `logo-${String(index + 1).padStart(2, "0")}`;
    await prisma.clientLogo.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  console.log(`✅ Created ${demoClients.length} client logos`);

  const equipmentList = [
    {
      id: "eq-01",
      category: "cameras",
      nameEn: "RED V-Raptor XL 8K VV Cinema Package",
      nameAr: "كاميرا ريد في-رابتور إكس إل 8 كي",
      brand: "RED Digital Cinema",
      specification:
        "8K VistaVision multi-format sensor, up to 120fps at 8K, 17+ stops dynamic range, PL mount.",
      displayOrder: 1,
    },
    {
      id: "eq-02",
      category: "cameras",
      nameEn: "Sony FX6 Full-Frame Cinema Line",
      nameAr: "كاميرا سوني إف إكس 6 سينمائية",
      brand: "Sony Cinema",
      specification:
        "4K full-frame sensor, 15+ stops dynamic range, electronic variable ND filter, dual base ISO.",
      displayOrder: 2,
    },
    {
      id: "eq-03",
      category: "lenses",
      nameEn: "ARRI Master Prime T1.3 Lens Set (18, 25, 35, 50, 85mm)",
      nameAr: "طقم عدسات آري ماستر برايم T1.3",
      brand: "ARRI / ZEISS",
      specification:
        "Ultra-fast T1.3 aperture across all focal lengths, zero breathing, legendary contrast and bokeh.",
      displayOrder: 3,
    },
    {
      id: "eq-04",
      category: "lenses",
      nameEn: "Cooke Anamorphic /i Full Frame Plus 40mm & 75mm",
      nameAr: "عدسات كوك أنامورفيك كاملة الإطار",
      brand: "Cooke Optics",
      specification:
        "True 2x anamorphic squeeze, classic Cooke look, smooth organic fall-off, PL mount.",
      displayOrder: 4,
    },
    {
      id: "eq-05",
      category: "lighting",
      nameEn: "Aputure Electro Storm CS15 1500W RGB Spotlight",
      nameAr: "إضاءة أباتشر إليكترو ستورم 1500 واط ملونة",
      brand: "Aputure Pro",
      specification:
        "1500W full-color point source with dual accessory mount, IP65 weather resistant.",
      displayOrder: 5,
    },
    {
      id: "eq-06",
      category: "lighting",
      nameEn: "Astera Titan Tube FP1 8-Light Kit with PowerBox",
      nameAr: "طقم أنابيب أستيرا تايتان 8 لمبات لاسلكية",
      brand: "Astera",
      specification:
        "Wireless RGBMintAmber LED tubes, CRMX wireless control, 20h internal battery.",
      displayOrder: 6,
    },
    {
      id: "eq-07",
      category: "grip",
      nameEn: "DJI Ronin 2 3-Axis Professional Gimbal System",
      nameAr: "مثبت كاميرا دي جي آي رونين 2 احترافي",
      brand: "DJI Pro",
      specification:
        "Heavy-payload 13.6kg motor support, dual battery hot-swap, ready for crane, vehicle, or handheld.",
      displayOrder: 7,
    },
    {
      id: "eq-08",
      category: "stages",
      nameEn: "Soundstage A — 250m² Acoustically Treated Cyclorama",
      nameAr: "استوديو أ — استوديو عازل للصوت 250 م² مع سايك مقوس",
      brand: `${BRAND_EN} Soundstage`,
      specification:
        "Infinity curve cyclorama, 6m overhead lighting grid, 60kW 3-phase power, soundproof control booth.",
      displayOrder: 8,
    },
  ];

  for (const eq of equipmentList) {
    await prisma.studioEquipment.upsert({
      where: { id: eq.id },
      update: eq,
      create: eq,
    });
  }
  console.log("✅ Created 8 Studio Equipment Units");

  // ==========================================
  // 1. STANDARD SERVICES & RATE CATALOG (BHD)
  // ==========================================
  const servicesList = [
    {
      id: "srv-01",
      code: "SRV-CINE-01",
      nameEn: "Director of Photography (DoP) & Camera Operator",
      nameAr: "مدير تصوير سينمائي ومصور رئيسي",
      category: "production",
      unit: "day",
      defaultRate: 550.0,
      descriptionEn: "Master cinema framing, lighting design, and camera operation for commercial productions.",
      descriptionAr: "إدارة الإضاءة وتكوين اللقطات السينمائية والإشراف على طاقم الكاميرا.",
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "srv-02",
      code: "SRV-CINE-02",
      nameEn: "Commercial Cinema Camera Crew (1st AC, Gaffer, Grip)",
      nameAr: "طاقم تصوير سينمائي إعلاني متكامل (مساعد أول، فني إضاءة، وفني حركة)",
      category: "production",
      unit: "day",
      defaultRate: 850.0,
      descriptionEn: "Complete production technical support crew with focus pulling and master lighting rigging.",
      descriptionAr: "طاقم فني كامل لإدارة العدسات وضبط التركيز وتجهيز منصات الإضاءة المتقدمة.",
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "srv-03",
      code: "SRV-DRONE-01",
      nameEn: "Dual-Operator DJI Inspire 3 8K Cinema Drone Package",
      nameAr: "حزمة درون دي جي آي إنسباير 3 سينمائي 8K مع طاقم طيار ومصور",
      category: "production",
      unit: "day",
      defaultRate: 450.0,
      descriptionEn: "Licensed BCAA aerial capture with full-frame 8K ProRes RAW and dual pilot/gimbal operators.",
      descriptionAr: "تصوير جوي مرخص بدقة 8K مع مشغلين مستقلين للطيران وحركة الكاميرا.",
      displayOrder: 3,
      isActive: true,
    },
    {
      id: "srv-04",
      code: "SRV-DRONE-02",
      nameEn: "High-Speed Acrobatic FPV Aerial Cinema Sequence",
      nameAr: "تصوير جوي بهلواني سريع بطائرات FPV السينمائية",
      category: "production",
      unit: "day",
      defaultRate: 300.0,
      descriptionEn: "Dynamic chase sequences, architectural fly-throughs, and action camera maneuvers.",
      descriptionAr: "مطاردات ديناميكية عالية السرعة واختراق المنشآت بحركات استعراضية متقنة.",
      displayOrder: 4,
      isActive: true,
    },
    {
      id: "srv-05",
      code: "SRV-STUDIO-01",
      nameEn: "Soundstage Stage A Acoustic 12-Hour Rental",
      nameAr: "استئجار استوديو أ السينمائي العازل للصوت لمدة 12 ساعة",
      category: "studio_rental",
      unit: "day",
      defaultRate: 400.0,
      descriptionEn: "250m² soundproof studio with overhead lighting grid, cyclorama, and control room.",
      descriptionAr: "استوديو 250 متر مربع عازل للصوت مع شبكة إضاءة علوية وغرفة تحكم مجهزة.",
      displayOrder: 5,
      isActive: true,
    },
    {
      id: "srv-06",
      code: "SRV-STUDIO-02",
      nameEn: "Cyclorama White Infinity Stage 8-Hour Rental",
      nameAr: "استئجار استوديو السايك الأبيض المنحني لمدة 8 ساعات",
      category: "studio_rental",
      unit: "day",
      defaultRate: 250.0,
      descriptionEn: "Seamless white infinity cove ideal for product commercial shoots and fashion cinema.",
      descriptionAr: "خلفية بيضاء منحنية لا نهائية مثالية لإعلانات المنتجات والأزياء.",
      displayOrder: 6,
      isActive: true,
    },
    {
      id: "srv-07",
      code: "SRV-POST-01",
      nameEn: "Offline Commercial Editing & Narrative Assembly",
      nameAr: "المونتاج وسرد القصة الإعلانية الأولية",
      category: "post_production",
      unit: "project",
      defaultRate: 750.0,
      descriptionEn: "Narrative pacing, multi-camera sync, rough cut, and director revisions.",
      descriptionAr: "مونتاج القصة، مزامنة الكاميرات المتعددة، وبناء النسخة المبدئية والنهائية.",
      displayOrder: 7,
      isActive: true,
    },
    {
      id: "srv-08",
      code: "SRV-POST-02",
      nameEn: "DaVinci Resolve Studio HDR Color Grading & Mastering",
      nameAr: "تصحيح وضبط الألوان السينمائية بتقنية HDR على دافينشي",
      category: "post_production",
      unit: "project",
      defaultRate: 600.0,
      descriptionEn: "Colorist scene-by-scene balance, film-emulation look design, and Rec.709/DCI-P3 mastering.",
      descriptionAr: "معالجة ألوان سينمائية متقدمة، مظهر بصري مخصص، وتصدير لمعايير السينما العالمية.",
      displayOrder: 8,
      isActive: true,
    },
    {
      id: "srv-09",
      code: "SRV-POST-03",
      nameEn: "Sound Design, Foley & Dolby Atmos / 5.1 Surround Mix",
      nameAr: "تصميم وهندسة الصوت والمكساج المحيطي 5.1 ودولبي أتموس",
      category: "post_production",
      unit: "project",
      defaultRate: 450.0,
      descriptionEn: "Custom foley, ambient spatial audio, dialogue restoration, and broadcast loudness mix.",
      descriptionAr: "مؤثرات صوتية واقعية، هندسة الحوار، ومكساج صوتي محيطي لمعايير التلفزيون والسينما.",
      displayOrder: 9,
      isActive: true,
    },
    {
      id: "srv-10",
      code: "SRV-POST-04",
      nameEn: "VFX, 3D CGI Motion Graphics & Title Animation",
      nameAr: "خدع بصرية، مؤثرات ثلاثية الأبعاد وتحريك الشعارات",
      category: "post_production",
      unit: "project",
      defaultRate: 850.0,
      descriptionEn: "Screen cleanups, digital set extensions, 3D CGI compositing, and animated typography.",
      descriptionAr: "دمج عناصر ثلاثية الأبعاد، إزالة الشوائب، وتصميم عناوين ورسوم متحركة مبهرة.",
      displayOrder: 10,
      isActive: true,
    },
    {
      id: "srv-11",
      code: "SRV-PRE-01",
      nameEn: "Treatment Writing, Scriptwriting & Storyboarding",
      nameAr: "كتابة المعالجة الإبداعية، السيناريو، ورسم الستوري بورد",
      category: "pre_production",
      unit: "project",
      defaultRate: 400.0,
      descriptionEn: "Creative concept development, visual treatment pitch deck, and scene storyboard illustrations.",
      descriptionAr: "تطوير الفكرة الإبداعية، صياغة السيناريو الحواري، ورسم المشاهد التخطيطية.",
      displayOrder: 11,
      isActive: true,
    },
    {
      id: "srv-12",
      code: "SRV-PRE-02",
      nameEn: "Casting, Location Scouting & Government Filming Permits",
      nameAr: "تجارب الأداء، معاينة المواقع، واستخراج تصاريح التصوير الحكومية",
      category: "pre_production",
      unit: "project",
      defaultRate: 350.0,
      descriptionEn: "Talent casting sessions, scout photo dossiers, and official ministerial shooting permits.",
      descriptionAr: "إجراء اختبارات الممثلين، معاينة واختيار المواقع وتخليص التصاريح الرسمية.",
      displayOrder: 12,
      isActive: true,
    },
    {
      id: "srv-13",
      code: "SRV-GEAR-01",
      nameEn: "RED V-Raptor 8K VV Cinema Camera Kit",
      nameAr: "طقم كاميرا ريد في-رابتور 8 كي السينمائية",
      category: "equipment",
      unit: "day",
      defaultRate: 450.0,
      descriptionEn: "8K multi-format sensor, REDCODE RAW, high-speed 120fps 8K, with monitor and batteries.",
      descriptionAr: "كاميرا سينمائية بدقة 8K مع شاشات المراقبة والبطاريات وحوامل التثبيت.",
      displayOrder: 13,
      isActive: true,
    },
    {
      id: "srv-14",
      code: "SRV-GEAR-02",
      nameEn: "ARRI Alexa Mini LF Cinema Camera Package",
      nameAr: "حزمة كاميرا آرّي أليكسا ميني لارج فورمات",
      category: "equipment",
      unit: "day",
      defaultRate: 500.0,
      descriptionEn: "Large-format 4.5K ARRI sensor with unmatched color science and dynamic range.",
      descriptionAr: "كاميرا آرّي الشهيرة بحساس كامل وألوان سينمائية طبيعية ومجال ديناميكي واسع.",
      displayOrder: 14,
      isActive: true,
    },
    {
      id: "srv-15",
      code: "SRV-GEAR-03",
      nameEn: "Aputure & Nanlite Master LED Lighting Production Rig",
      nameAr: "طقم إضاءة سينمائي متكامل من أباتشر ونانلايت",
      category: "equipment",
      unit: "day",
      defaultRate: 300.0,
      descriptionEn: "1500W point-source spotlights, softboxes, motorized tubes, and wireless DMX control.",
      descriptionAr: "إضاءات استوديو قوية بقوة 1500 واط مع موجهات الإضاءة والتحكم اللاسلكي.",
      displayOrder: 15,
      isActive: true,
    },
    {
      id: "srv-16",
      code: "SRV-LIVE-01",
      nameEn: "Multi-Camera 4K Live Broadcast & Fiber Transmission",
      nameAr: "بث حي ومباشر متعدد الكاميرات بدقة 4K عبر الألياف البصرية",
      category: "production",
      unit: "day",
      defaultRate: 1200.0,
      descriptionEn: "Full mobile broadcast switcher, intercom, tally, and low-latency bonded streaming.",
      descriptionAr: "وحدة بث تلفزيوني متنقلة متكاملة لنقل الفعاليات والمؤتمرات الكبرى مباشرة.",
      displayOrder: 16,
      isActive: true,
    },
  ];

  for (const s of servicesList) {
    await prisma.service.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }
  console.log("✅ Seeded 16 Standard Production Services & Rates in BHD");

  // ==========================================
  // 2. CLIENT DIRECTORY & CRM CONTACTS (GCC)
  // ==========================================
  const contacts = [
    {
      id: "contact-01",
      firstName: "حمد",
      lastName: "الرميحي",
      companyName: "Gulfwave Telecommunications",
      email: "h.alromaihi@batelco.com.bh",
      emailNorm: "h.alromaihi@batelco.com.bh",
      phone: "+973 3944 1122",
      phoneE164: "+97339441122",
      jobTitle: "Head of Brand & Communications",
      contactType: "client",
      notes: "Key decision maker for national TV campaigns, 5G launches, and annual creative retainers.",
    },
    {
      id: "contact-02",
      firstName: "سارة",
      lastName: "الماجد",
      companyName: "Falcon Airways Marketing",
      email: "s.almajed@gulfair.com",
      emailNorm: "s.almajed@gulfair.com",
      phone: "+973 3988 3344",
      phoneE164: "+97339883344",
      jobTitle: "Senior Vice President — Brand & Experience",
      contactType: "client",
      notes: "Oversees in-flight entertainment cinema branding, cabin safety films, and global route commercials.",
    },
    {
      id: "contact-03",
      firstName: "طارق",
      lastName: "الدوسري",
      companyName: "Island Tourism & Events Board (ITEB)",
      email: "t.aldoseri@btea.bh",
      emailNorm: "t.aldoseri@btea.bh",
      phone: "+973 3611 9900",
      phoneE164: "+97336119900",
      jobTitle: "Director of Tourism Marketing",
      contactType: "client",
      notes: "Manages kingdom-wide tourism commercials, Bahrain Season campaigns, and Exhibition World films.",
    },
    {
      id: "contact-04",
      firstName: "نورة",
      lastName: "آل خليفة",
      companyName: "Spark Creative Agency",
      email: "noura@impactbbdo.bh",
      emailNorm: "noura@impactbbdo.bh",
      phone: "+973 3922 7788",
      phoneE164: "+97339227788",
      jobTitle: "Executive Creative Director",
      contactType: "agency",
      notes: "Top tier creative agency partner frequently commissioning large-scale cinema productions.",
    },
    {
      id: "contact-05",
      firstName: "خالد",
      lastName: "الهلال",
      companyName: "Crescent Motors",
      email: "k.zayani@zmotors.bh",
      emailNorm: "k.zayani@zmotors.bh",
      phone: "+973 3901 2345",
      phoneE164: "+97339012345",
      jobTitle: "Marketing Director",
      contactType: "client",
      notes: "Automotive brand launch films, dynamic car chase commercials, and showroom cinematography.",
    },
    {
      id: "contact-06",
      firstName: "عبدالله",
      lastName: "بوخوة",
      companyName: "Orbit Telecom",
      email: "a.bukhowa@bh.zain.com",
      emailNorm: "a.bukhowa@bh.zain.com",
      phone: "+973 3600 4400",
      phoneE164: "+97336004400",
      jobTitle: "Corporate Communications Director",
      contactType: "client",
      notes: "Youth-targeted digital commercials, esports tournament coverage, and sustainability films.",
    },
    {
      id: "contact-07",
      firstName: "فاطمة",
      lastName: "الجلاهمة",
      companyName: "Harbor National Bank (HNB)",
      email: "f.aljalahma@nbbonline.com",
      emailNorm: "f.aljalahma@nbbonline.com",
      phone: "+973 3977 1234",
      phoneE164: "+97339771234",
      jobTitle: "Chief Marketing Officer",
      contactType: "client",
      notes: "Institutional banking campaigns, National Day celebration videos, and mobile app commercials.",
    },
    {
      id: "contact-08",
      firstName: "إبراهيم",
      lastName: "الهاشمي",
      companyName: "Aluminium Bahrain (SUMMIT)",
      email: "e.alhashimi@alba.com.bh",
      emailNorm: "e.alhashimi@alba.com.bh",
      phone: "+973 3955 8899",
      phoneE164: "+97339558899",
      jobTitle: "Director of Public Relations & ESG",
      contactType: "client",
      notes: "Industrial documentary productions, safety compliance videos, and decarbonization milestone films.",
    },
    {
      id: "contact-09",
      firstName: "سلمان",
      lastName: "الكعبي",
      companyName: "Delta Energies",
      email: "s.alkaabi@bapcoenergies.bh",
      emailNorm: "s.alkaabi@bapcoenergies.bh",
      phone: "+973 3966 2211",
      phoneE164: "+97339662211",
      jobTitle: "Brand Transformation Manager",
      contactType: "client",
      notes: "Energy transition cinema showcases, refinery aerial drone documentation, and corporate films.",
    },
    {
      id: "contact-10",
      firstName: "نور",
      lastName: "الذوادي",
      companyName: "Pearl Holding Company",
      email: "n.althawadi@mumtalakat.bh",
      emailNorm: "n.althawadi@mumtalakat.bh",
      phone: "+973 3811 0022",
      phoneE164: "+97338110022",
      jobTitle: "Head of Strategic Communications",
      contactType: "client",
      notes: "Sovereign wealth fund investor reports, portfolio company cinema showcases, and annual summits.",
    },
    {
      id: "contact-11",
      firstName: "Jean-Pierre",
      lastName: "Laurent",
      companyName: "Bayview Grand Hotel",
      email: "j.laurent@fourseasons.com",
      emailNorm: "j.laurent@fourseasons.com",
      phone: "+973 1711 5000",
      phoneE164: "+97317115000",
      jobTitle: "Director of Luxury Sales & Marketing",
      contactType: "client",
      notes: "Ultra-luxury hospitality commercials, fine dining cinematography, and private island events.",
    },
    {
      id: "contact-12",
      firstName: "راشد",
      lastName: "السعيد",
      companyName: "Economic Development Board (RIB)",
      email: "r.alsaeed@bahrainedb.com",
      emailNorm: "r.alsaeed@bahrainedb.com",
      phone: "+973 3933 6677",
      phoneE164: "+97339336677",
      jobTitle: "Executive Director — Global Marketing",
      contactType: "client",
      notes: "International foreign direct investment promotional films shown at Davos and global summits.",
    },
    {
      id: "contact-13",
      firstName: "لولوة",
      lastName: "المناعي",
      companyName: "Nexa Mobile",
      email: "l.almannai@nexa.com.bh",
      emailNorm: "l.almannai@nexa.com.bh",
      phone: "+973 3500 8899",
      phoneE164: "+97335008899",
      jobTitle: "General Manager — Marketing Communications",
      contactType: "client",
      notes: "Fiber broadband advertising campaigns, nexa pay promotional videos, and music event filming.",
    },
    {
      id: "contact-14",
      firstName: "الشيخ سلمان",
      lastName: "بن عيسى آل خليفة",
      companyName: "Desert Speedway (DSW)",
      email: "s.binisa@bic.com.bh",
      emailNorm: "s.binisa@bic.com.bh",
      phone: "+973 3922 0011",
      phoneE164: "+97339220011",
      jobTitle: "Chief Executive Officer",
      contactType: "client",
      notes: "Formula 1 Falcon Airways Bahrain GP official teasers, WEC endurance coverage, and night racing films.",
    },
    {
      id: "contact-15",
      firstName: "زياد",
      lastName: "العلوي",
      companyName: "NovaPay FinTech",
      email: "z.alalawi@beyonmoney.com",
      emailNorm: "z.alalawi@beyonmoney.com",
      phone: "+973 3911 7733",
      phoneE164: "+97339117733",
      jobTitle: "Head of Growth & Digital Acquisition",
      contactType: "client",
      notes: "FinTech application motion design, user acquisition high-energy commercials, and social cuts.",
    },
    {
      id: "contact-16",
      firstName: "David",
      lastName: "Campbell",
      companyName: "Palm Golf Club",
      email: "d.campbell@theroyalgolfclub.com",
      emailNorm: "d.campbell@theroyalgolfclub.com",
      phone: "+973 1775 0777",
      phoneE164: "+97317750777",
      jobTitle: "Managing Director",
      contactType: "client",
      notes: "European Tour DP World tournament broadcast capture and golf academy promotional documentaries.",
    },
  ];

  // Client profiles: public bodies are government clients, the rest local Bahraini companies; the person on
  // file is the primary point of contact.
  const governmentTypes: Record<string, string> = { "contact-03": "authority", "contact-10": "semi_government", "contact-12": "authority" };
  for (const c of contacts) {
    const profile = governmentTypes[c.id]
      ? { clientKind: "government", governmentType: governmentTypes[c.id], companyOrigin: null, addressCountry: "BH", addressCity: "Manama" }
      : { clientKind: "company", companyOrigin: "local", crNumber: `${900000 + Number(c.id.split("-")[1])}-1`, legalForm: "bsc_closed", registrationCountry: "BH", addressCountry: "BH", addressCity: "Manama" };
    const record = { ...c, ...profile };
    await prisma.crmContact.upsert({
      where: { id: c.id },
      update: record,
      create: record,
    });
    await prisma.clientContactPerson.upsert({
      where: { id: `${c.id}-primary` },
      update: {},
      create: { id: `${c.id}-primary`, contactId: c.id, fullName: `${c.firstName} ${c.lastName}`, position: c.jobTitle, email: c.email, phone: c.phone, isPrimary: true },
    });
  }
  console.log("✅ Seeded 16 Top Enterprise CRM Clients");

  // ==========================================
  // 3. CRM DEALS & PRODUCTION PIPELINE
  // ==========================================
  const deals = [
    {
      id: "deal-01",
      contactId: "contact-01",
      title: "Gulfwave 5G-Advanced Launch Campaign",
      dealStage: "production",
      dealValue: 14500.0,
      currency: "BHD",
      probability: 90,
      expectedCloseDate: new Date("2026-10-15"),
      shootDate: new Date("2026-10-05"),
      notes: "Multi-location commercial shoot with heavy drone work in Manama and Bahrain Bay.",
    },
    {
      id: "deal-02",
      contactId: "contact-02",
      title: "Falcon Airways Summer Destination Series",
      dealStage: "proposal_sent",
      dealValue: 18200.0,
      currency: "BHD",
      probability: 60,
      expectedCloseDate: new Date("2026-11-01"),
      shootDate: new Date("2026-10-20"),
      notes: "Awaiting creative committee review for European destination vignettes.",
    },
    {
      id: "deal-03",
      contactId: "contact-03",
      title: "Island Grand Prix 2027 Teaser Film",
      dealStage: "contract_signed",
      dealValue: 22000.0,
      currency: "BHD",
      probability: 95,
      expectedCloseDate: new Date("2026-10-10"),
      shootDate: new Date("2026-10-12"),
      notes: "Night shoot with RED 8K and high-speed chase vehicles on the F1 circuit track.",
    },
    {
      id: "deal-04",
      contactId: "contact-05",
      title: "Crescent Luxury EV Cinematic Commercial",
      dealStage: "post_production",
      dealValue: 8750.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-09-30"),
      shootDate: new Date("2026-09-18"),
      notes: `Currently in color grading and 5.1 surround sound mastering at ${BRAND_EN} suite.`,
    },
    {
      id: "deal-05",
      contactId: "contact-01",
      title: "Gulfwave Ramadan Brand Film 2027",
      dealStage: "lead",
      dealValue: 12000.0,
      currency: "BHD",
      probability: 40,
      expectedCloseDate: new Date("2026-12-01"),
      notes: "Initial storyboard discussion and talent casting requirements.",
    },
    {
      id: "deal-06",
      contactId: "contact-05",
      title: "Rossa Motors Showroom Showcase",
      dealStage: "delivered",
      dealValue: 6500.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-09-15"),
      shootDate: new Date("2026-09-02"),
      notes: "Master delivered in ProRes 4444 XQ and social media cutdowns.",
    },
    {
      id: "deal-07",
      contactId: "contact-03",
      title: "Bahrain Heritage Festival 2026",
      dealStage: "closed_won",
      dealValue: 9800.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-08-30"),
      shootDate: new Date("2026-08-15"),
      notes: "Successfully billed and paid in full.",
    },
    {
      id: "deal-08",
      contactId: "contact-06",
      title: "Orbit Telecom Youth Esports Film",
      dealStage: "production",
      dealValue: 11200.0,
      currency: "BHD",
      probability: 85,
      expectedCloseDate: new Date("2026-10-18"),
      shootDate: new Date("2026-10-08"),
      notes: "Fast-paced neon aesthetic with heavy FPV drone maneuvers and motion graphics.",
    },
    {
      id: "deal-09",
      contactId: "contact-07",
      title: "HNB Digital Banking App Rebrand Film",
      dealStage: "closed_won",
      dealValue: 7800.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-08-20"),
      shootDate: new Date("2026-08-10"),
      notes: "Clean tech aesthetic, completed and fully settled.",
    },
    {
      id: "deal-10",
      contactId: "contact-08",
      title: "SUMMIT Net-Zero Carbon Milestone Documentary",
      dealStage: "closed_won",
      dealValue: 16500.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-07-25"),
      shootDate: new Date("2026-07-10"),
      notes: "Comprehensive documentary featuring CEO and plant operations.",
    },
    {
      id: "deal-11",
      contactId: "contact-09",
      title: "Delta Energies Future of Energy Showcase",
      dealStage: "production",
      dealValue: 15000.0,
      currency: "BHD",
      probability: 90,
      expectedCloseDate: new Date("2026-10-25"),
      shootDate: new Date("2026-10-14"),
      notes: "Refinery aerials, soundstage interviews, and high-end 3D graphics.",
    },
    {
      id: "deal-12",
      contactId: "contact-10",
      title: "Pearl Holding Portfolio Corporate Film",
      dealStage: "delivered",
      dealValue: 13500.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-09-22"),
      shootDate: new Date("2026-09-08"),
      notes: "Executive interviews filmed in 8K across 5 national assets.",
    },
    {
      id: "deal-13",
      contactId: "contact-11",
      title: "Bayview Grand Luxury Dining Vignettes",
      dealStage: "closed_won",
      dealValue: 5200.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-08-10"),
      shootDate: new Date("2026-08-03"),
      notes: "Macro cinematography for CUT by Wolfgang Puck restaurant.",
    },
    {
      id: "deal-14",
      contactId: "contact-12",
      title: "RIB Invest in Bahrain Global Film",
      dealStage: "closed_won",
      dealValue: 10800.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-08-01"),
      shootDate: new Date("2026-07-18"),
      notes: "Screened at international trade delegation summits.",
    },
    {
      id: "deal-15",
      contactId: "contact-13",
      title: "Nexa Mobile 5G Fiber Broadband Commercial",
      dealStage: "closed_won",
      dealValue: 6200.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-07-15"),
      shootDate: new Date("2026-07-02"),
      notes: "Fast turnaround 30-sec TV spot.",
    },
    {
      id: "deal-16",
      contactId: "contact-14",
      title: "DSW World Endurance Championship Promo",
      dealStage: "delivered",
      dealValue: 9500.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-09-12"),
      shootDate: new Date("2026-08-28"),
      notes: "Delivered in HDR10 for broadcast television.",
    },
    {
      id: "deal-17",
      contactId: "contact-15",
      title: "NovaPay SuperApp Launch Film",
      dealStage: "closed_won",
      dealValue: 6700.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-06-30"),
      shootDate: new Date("2026-06-15"),
      notes: "Fast viral social campaigns and billboard screens.",
    },
    {
      id: "deal-18",
      contactId: "contact-16",
      title: "Palm Golf Club International Invitational",
      dealStage: "closed_won",
      dealValue: 3400.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-06-20"),
      shootDate: new Date("2026-06-05"),
      notes: "Championship course aerial drone coverage.",
    },
    {
      id: "deal-19",
      contactId: "contact-04",
      title: "Spark Creative National Day Multi-Brand Film",
      dealStage: "proposal_sent",
      dealValue: 19500.0,
      currency: "BHD",
      probability: 50,
      expectedCloseDate: new Date("2026-11-15"),
      notes: "Multi-client integrated production for Bahrain National Day.",
    },
    {
      id: "deal-20",
      contactId: "contact-02",
      title: "Falcon Airways First Class Cabin Experience Film",
      dealStage: "closed_lost",
      dealValue: 8000.0,
      currency: "BHD",
      probability: 0,
      lostReason: "Postponed to Q2 2027 due to aircraft retrofit schedule.",
      notes: "Client postponed production indefinitely.",
    },
  ];

  for (const d of deals) {
    await prisma.crmDeal.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }
  console.log("✅ Seeded 20 CRM Deals across All Pipeline Stages");

  // ==========================================
  // 4. INVOICES & VERIFIED LINE ITEMS (BHD)
  // ==========================================
  // Clean up existing invoice line items and invoices to avoid conflicts
  await prisma.payment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});

  const invoicesData = [
    {
      id: "inv-001",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0001`,
      dealId: "deal-07",
      clientId: "contact-03",
      issueDate: new Date("2026-08-15"),
      dueDate: new Date("2026-09-15"),
      subtotal: 9800.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 9800.0,
      currency: "BHD",
      language: "ar",
      status: "paid",
      createdById: createdUsers.super_admin?.id,
      notesAr: "دفعة كاملة عن إنتاج وتصوير فيلم مهرجان التراث البحريني.",
      notesEn: "Full payment for Bahrain Heritage Festival cinema commercial production.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Principal Cinematography & Director of Photography Package (3 Days)", descriptionAr: "حزمة التصوير السينمائي وإدارة التصوير (3 أيام تصوير)", quantity: 3.0, unitPrice: 1800.0, lineTotal: 5400.0, displayOrder: 1 },
        { serviceId: "srv-13", descriptionEn: "RED 8K Camera, ARRI Primes & Master Lighting Package", descriptionAr: "طقم كاميرا ريد 8 كي وعدسات آرّي مع طاقم الإضاءة الكامل", quantity: 3.0, unitPrice: 800.0, lineTotal: 2400.0, displayOrder: 2 },
        { serviceId: "srv-08", descriptionEn: "DaVinci Resolve Studio Color Grading & 4K Mastering", descriptionAr: "تصحيح ألوان سينمائي في استوديو دافينشي وتصدير ماستر 4 كي", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-002",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0002`,
      dealId: "deal-04",
      clientId: "contact-05",
      issueDate: new Date("2026-09-01"),
      dueDate: new Date("2026-10-01"),
      subtotal: 8750.0,
      discountType: "fixed",
      discountValue: 250.0,
      discountAmount: 250.0,
      vatAmount: 0.0,
      totalAmount: 8500.0,
      currency: "BHD",
      language: "en",
      status: "partially_paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "50% mobilization deposit received; remaining balance due on delivery of final master.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "Commercial Automotive Cinema Production Package", descriptionAr: "حزمة تصوير سينمائي إعلاني للسيارات الفاخرة", quantity: 1.0, unitPrice: 6500.0, lineTotal: 6500.0, displayOrder: 1 },
        { serviceId: "srv-04", descriptionEn: "High Speed Acrobatic FPV Aerial Sequence", descriptionAr: "تصوير جوي بهلواني سريع بطائرات FPV", quantity: 1.0, unitPrice: 2250.0, lineTotal: 2250.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-003",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0003`,
      dealId: "deal-01",
      clientId: "contact-01",
      issueDate: new Date("2026-09-10"),
      dueDate: new Date("2026-10-10"),
      subtotal: 14500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 14500.0,
      currency: "BHD",
      language: "ar",
      status: "sent",
      createdById: createdUsers.super_admin?.id,
      notesAr: "الدفعة الأولى المستحقة لتجهيز موقع التصوير وبدء مرحلة الإنتاج.",
      lineItems: [
        { serviceId: "srv-11", descriptionEn: "Pre-production, Casting, Location Permits & Creative Direction", descriptionAr: "مرحلة ما قبل الإنتاج، واختيار الممثلين، وتصاريح المواقع، والإشراف الإبداعي", quantity: 1.0, unitPrice: 4500.0, lineTotal: 4500.0, displayOrder: 1 },
        { serviceId: "srv-02", descriptionEn: "4 Production Shoot Days with Cinema Dual-Camera Crews", descriptionAr: "4 أيام تصوير سينمائي مع طاقمي كاميرا كاملين", quantity: 4.0, unitPrice: 2500.0, lineTotal: 10000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-004",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0004`,
      dealId: "deal-13",
      clientId: "contact-11",
      issueDate: new Date("2026-08-05"),
      dueDate: new Date("2026-09-05"),
      subtotal: 5200.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 5200.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Full settlement for Bayview Grand luxury dining vignettes.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Macro Food & Dining Cinematography (2 Days)", descriptionAr: "تصوير سينمائي ماكرو للأطباق الفاخرة (يومان)", quantity: 2.0, unitPrice: 1600.0, lineTotal: 3200.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "Color Grading & High-End 4K Deliverables", descriptionAr: "تصحيح ألوان وإخراج نهائي بدقة 4K", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-005",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0005`,
      dealId: "deal-18",
      clientId: "contact-16",
      issueDate: new Date("2026-06-25"),
      dueDate: new Date("2026-07-25"),
      subtotal: 3400.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 3400.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Championship aerial drone filming and social media teaser reels.",
      lineItems: [
        { serviceId: "srv-03", descriptionEn: "DJI Inspire 3 Championship Aerial Coverage (2 Days)", descriptionAr: "تغطية جوية لبطولة الغولف بطائرة إنسباير 3 (يومان)", quantity: 2.0, unitPrice: 1200.0, lineTotal: 2400.0, displayOrder: 1 },
        { serviceId: "srv-07", descriptionEn: "Dynamic Social Media Cutdowns & Sound Design", descriptionAr: "مونتاج مقاطع ترويجية لشبكات التواصل مع المؤثرات الصوتية", quantity: 1.0, unitPrice: 1000.0, lineTotal: 1000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-006",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0006`,
      dealId: "deal-08",
      clientId: "contact-06",
      issueDate: new Date("2026-09-12"),
      dueDate: new Date("2026-10-12"),
      subtotal: 12000.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 12000.0,
      currency: "BHD",
      language: "ar",
      status: "partially_paid",
      createdById: createdUsers.super_admin?.id,
      notesAr: "تم سداد 50% كدفعة مقدمة للبدء في تجهيز استوديو التصوير والمؤثرات الضوئية.",
      lineItems: [
        { serviceId: "srv-05", descriptionEn: "Soundstage A 3-Day Production Booking", descriptionAr: "حجز استوديو أ السينمائي لمدة 3 أيام تصوير", quantity: 3.0, unitPrice: 1500.0, lineTotal: 4500.0, displayOrder: 1 },
        { serviceId: "srv-10", descriptionEn: "3D Motion Graphics & Cyberpunk Visual FX", descriptionAr: "مؤثرات بصرية ورسوم متحركة ثلاثية الأبعاد بنمط السيبربانك", quantity: 1.0, unitPrice: 4500.0, lineTotal: 4500.0, displayOrder: 2 },
        { serviceId: "srv-09", descriptionEn: "Spatial Audio & Original Electronic Score", descriptionAr: "هندسة صوتية محيطية وتأليف موسيقى إلكترونية أصلية", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-007",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0007`,
      dealId: "deal-09",
      clientId: "contact-07",
      issueDate: new Date("2026-08-25"),
      dueDate: new Date("2026-09-25"),
      subtotal: 7800.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 7800.0,
      currency: "BHD",
      language: "ar",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesAr: "دفعة كاملة مسددة عن إنتاج فيلم تطبيق الخدمات الرقمية لبنك هاربر الوطني.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "App UI Cinema Integration & Live-Action Shoot", descriptionAr: "تصوير سينمائي حي ودمج شاشات التطبيق التفاعلية", quantity: 1.0, unitPrice: 4800.0, lineTotal: 4800.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "DaVinci Color Grade & Finishing", descriptionAr: "تصحيح ألوان وإخراج نهائي للبث التلفزيوني والرقمي", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-008",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0008`,
      dealId: "deal-10",
      clientId: "contact-08",
      issueDate: new Date("2026-08-01"),
      dueDate: new Date("2026-09-01"),
      subtotal: 16500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 16500.0,
      currency: "BHD",
      language: "en",
      status: "sent",
      createdById: createdUsers.super_admin?.id,
      notesEn: "Invoice issued for SUMMIT Net-Zero Carbon Documentary; undergoing client SAP procurement clearance.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "Industrial Plant 5-Day Cinematography & Executive Interviews", descriptionAr: "تصوير صناعي في المصهر لمدة 5 أيام ومقابلات الإدارة التنفيذية", quantity: 5.0, unitPrice: 2000.0, lineTotal: 10000.0, displayOrder: 1 },
        { serviceId: "srv-03", descriptionEn: "Industrial Aerial Survey & Thermal Drone Cinema", descriptionAr: "مسح جوي سينمائي وتصوير بالدرون الحراري", quantity: 2.0, unitPrice: 1500.0, lineTotal: 3000.0, displayOrder: 2 },
        { serviceId: "srv-10", descriptionEn: "Environmental Data 3D Infographics & Narrative Finishing", descriptionAr: "رسوم بيانية متحركة ثلاثية الأبعاد للبيانات البيئية", quantity: 1.0, unitPrice: 3500.0, lineTotal: 3500.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-009",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0009`,
      dealId: "deal-06",
      clientId: "contact-05",
      issueDate: new Date("2026-08-10"),
      dueDate: new Date("2026-09-10"),
      subtotal: 4500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 4500.0,
      currency: "BHD",
      language: "en",
      status: "overdue",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "OVERDUE: Reminder sent for Rossa showroom showcase delivery balance.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Rossa Showroom Lighting & Gimbal Cinematography", descriptionAr: "تصوير سينمائي احترافي بصالة العرض مع الإضاءة المتقدمة", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "ProRes 4444 XQ Master Grading & HDR Delivery", descriptionAr: "معالجة ألوان وتصدير ماستر بدقة فائقة HDR", quantity: 1.0, unitPrice: 1500.0, lineTotal: 1500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-010",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0010`,
      dealId: "deal-15",
      clientId: "contact-13",
      issueDate: new Date("2026-07-20"),
      dueDate: new Date("2026-08-20"),
      subtotal: 6200.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 6200.0,
      currency: "BHD",
      language: "ar",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesAr: "سداد كامل عن الحملة الترويجية لشبكة الألياف البصرية.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "Commercial TVC Shoot & Family Scenario Casting", descriptionAr: "تصوير إعلان تلفزيوني وكاستينغ مشاهد منزلية", quantity: 1.0, unitPrice: 4200.0, lineTotal: 4200.0, displayOrder: 1 },
        { serviceId: "srv-07", descriptionEn: "Multi-Format Social Media & Broadcast Edits", descriptionAr: "مونتاج بمقاسات متعددة للشاشات التلفزيونية والمنصات الرقمية", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-011",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0011`,
      dealId: "deal-16",
      clientId: "contact-14",
      issueDate: new Date("2026-09-01"),
      dueDate: new Date("2026-10-01"),
      subtotal: 9500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 9500.0,
      currency: "BHD",
      language: "en",
      status: "partially_paid",
      createdById: createdUsers.super_admin?.id,
      notesEn: "50% advance received for World Endurance Championship promo teaser.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Night Circuit Track High-Speed Tracking Shoot", descriptionAr: "تصوير تتبع ليلي عالي السرعة على مضمار حلبة الصحراء", quantity: 2.0, unitPrice: 2500.0, lineTotal: 5000.0, displayOrder: 1 },
        { serviceId: "srv-04", descriptionEn: "FPV Aerial Drone Pitlane Fly-throughs", descriptionAr: "لقطات جوية درون FPV عبر خط الصيانة ومنصات الفرق", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
        { serviceId: "srv-09", descriptionEn: "Engine Roar Foley & Dolby 5.1 Sound Design", descriptionAr: "تصميم صوتي واقعي لزئير المحركات ومكساج محيطي", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-012",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0012`,
      dealId: "deal-05",
      clientId: "contact-01",
      issueDate: new Date("2026-08-05"),
      dueDate: new Date("2026-09-05"),
      subtotal: 3800.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 3800.0,
      currency: "BHD",
      language: "ar",
      status: "overdue",
      createdById: createdUsers.finance_manager?.id,
      notesAr: "تأخر سداد دفعة السيناريو المبدئي والستوري بورد لإعلان رمضان.",
      lineItems: [
        { serviceId: "srv-11", descriptionEn: "Concept Development, Narrative Script & Illustrated Storyboards", descriptionAr: "تطوير الفكرة، السيناريو الكامل ورسم القصة المصورة", quantity: 1.0, unitPrice: 3800.0, lineTotal: 3800.0, displayOrder: 1 },
      ],
    },
    {
      id: "inv-013",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0013`,
      dealId: "deal-17",
      clientId: "contact-15",
      issueDate: new Date("2026-07-01"),
      dueDate: new Date("2026-08-01"),
      subtotal: 6700.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 6700.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Full payment cleared via BENEFIT Pay Corporate gateway.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "FinTech Mobile App Live-Action Cinema Shoot", descriptionAr: "تصوير سينمائي إعلاني لتطبيق بينفت والتطبيقات المالية", quantity: 1.0, unitPrice: 3700.0, lineTotal: 3700.0, displayOrder: 1 },
        { serviceId: "srv-10", descriptionEn: "3D Hologram App Graphics & CGI Animation", descriptionAr: "مؤثرات هولوغرام ثلاثية الأبعاد ورسوم متحركة للشاشات", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-014",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0014`,
      dealId: "deal-06",
      clientId: "contact-05",
      issueDate: new Date("2026-09-05"),
      dueDate: new Date("2026-10-05"),
      subtotal: 2900.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 2900.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Social media cutdowns and billboard digital masters.",
      lineItems: [
        { serviceId: "srv-07", descriptionEn: "9:16 Vertical Cutdowns & 4K Billboard Formats", descriptionAr: "إخراج المقاسات الرأسية وشاشات الطرق الإعلانية", quantity: 1.0, unitPrice: 2900.0, lineTotal: 2900.0, displayOrder: 1 },
      ],
    },
    {
      id: "inv-015",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0015`,
      dealId: "deal-14",
      clientId: "contact-12",
      issueDate: new Date("2026-09-15"),
      dueDate: new Date("2026-10-15"),
      subtotal: 8400.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 8400.0,
      currency: "BHD",
      language: "en",
      status: "sent",
      createdById: createdUsers.super_admin?.id,
      notesEn: "Phase 2 delivery invoice for RIB global investor promotional documentary.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "3-Day Financial Harbor & Industrial Zone Shoot", descriptionAr: "3 أيام تصوير في مركز المارينا المالي والمناطق الصناعية", quantity: 3.0, unitPrice: 1800.0, lineTotal: 5400.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "Multilingual Voiceover Sync & HDR Master Grading", descriptionAr: "مزامنة التعليق الصوتي متعدد اللغات والتلوين السينمائي", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-016",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0016`,
      dealId: "deal-11",
      clientId: "contact-09",
      issueDate: new Date("2026-09-08"),
      dueDate: new Date("2026-10-08"),
      subtotal: 15000.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 15000.0,
      currency: "BHD",
      language: "ar",
      status: "partially_paid",
      createdById: createdUsers.finance_manager?.id,
      notesAr: "تم استلام دفعتين بقيمة إجمالية 10,000 د.ب؛ المتبقي 5,000 د.ب عند تسليم النسخة النهائية.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Executive Interviews & Soundstage Stage A Filming", descriptionAr: "تصوير المقابلات التنفيذية في استوديو أ السينمائي", quantity: 2.0, unitPrice: 3000.0, lineTotal: 6000.0, displayOrder: 1 },
        { serviceId: "srv-03", descriptionEn: "Solar Farm & Refinery 8K Aerial Drone Mapping", descriptionAr: "مسح وتصوير جوي بدقة 8K لمزارع الطاقة الشمسية والمصفاة", quantity: 2.0, unitPrice: 2000.0, lineTotal: 4000.0, displayOrder: 2 },
        { serviceId: "srv-10", descriptionEn: "3D Energy Grid Infographics & Master Sound Mix", descriptionAr: "رسوم متحركة ثلاثية الأبعاد لشبكات الطاقة والمكساج النهائي", quantity: 1.0, unitPrice: 5000.0, lineTotal: 5000.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-017",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0017`,
      dealId: "deal-12",
      clientId: "contact-10",
      issueDate: new Date("2026-08-18"),
      dueDate: new Date("2026-09-18"),
      subtotal: 6700.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 6700.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Full settlement for Pearl Holding holding portfolio highlights.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Sovereign Portfolio Commercial Cinematography", descriptionAr: "تصوير سينمائي لمشاريع المحفظة الاستثمارية", quantity: 1.0, unitPrice: 4200.0, lineTotal: 4200.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "DaVinci Color Grade & Broadcast Titles", descriptionAr: "تلوين دافينشي وعناوين إخراج احترافية", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-018",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0018`,
      dealId: "deal-04",
      clientId: "contact-05",
      issueDate: new Date("2026-08-01"),
      dueDate: new Date("2026-09-01"),
      subtotal: 4200.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 4200.0,
      currency: "BHD",
      language: "en",
      status: "overdue",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "OVERDUE: Secondary stage fee for EV launch commercial campaign.",
      lineItems: [
        { serviceId: "srv-04", descriptionEn: "FPV Aerial High-Speed Desert Road Chase", descriptionAr: "مطاردة صحراوية سريعة بطائرات الدرون FPV", quantity: 1.0, unitPrice: 2200.0, lineTotal: 2200.0, displayOrder: 1 },
        { serviceId: "srv-09", descriptionEn: "Synthesized Engine Audio & Sound Design", descriptionAr: "مؤثرات صوتية ومحاكاة أصوات المحركات الكهربائية", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-019",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0019`,
      dealId: "deal-02",
      clientId: "contact-02",
      issueDate: new Date("2026-09-20"),
      dueDate: new Date("2026-10-20"),
      subtotal: 18500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 18500.0,
      currency: "BHD",
      language: "en",
      status: "sent",
      createdById: createdUsers.super_admin?.id,
      notesEn: "Initial mobilization deposit invoice for Falcon Airways Summer Destination series.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "International Filming Crew & Equipment Logistics", descriptionAr: "طاقم التصوير الدولي واللوجستيات والمعدات", quantity: 1.0, unitPrice: 10500.0, lineTotal: 10500.0, displayOrder: 1 },
        { serviceId: "srv-01", descriptionEn: "Aircraft Cabin Interior Cinematography", descriptionAr: "تصوير سينمائي لمقصورات الطائرة والمقاعد الفاخرة", quantity: 2.0, unitPrice: 4000.0, lineTotal: 8000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-020",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0020`,
      dealId: "deal-14",
      clientId: "contact-12",
      issueDate: new Date("2026-07-10"),
      dueDate: new Date("2026-08-10"),
      subtotal: 5900.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 5900.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Phase 1 advance for RIB Global Cinema campaign.",
      lineItems: [
        { serviceId: "srv-11", descriptionEn: "Treatment, Scripting & Creative Pitch Deck", descriptionAr: "المعالجة الإبداعية والسيناريو والعرض التقديمي", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 1 },
        { serviceId: "srv-01", descriptionEn: "Bahrain World Trade Center Helicopter & Drone Filming", descriptionAr: "تصوير جوي سينمائي لمركز التجارة العالمي بالمنامة", quantity: 1.0, unitPrice: 3400.0, lineTotal: 3400.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-021",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0021`,
      dealId: "deal-17",
      clientId: "contact-15",
      issueDate: new Date("2026-06-10"),
      dueDate: new Date("2026-07-10"),
      subtotal: 7300.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 7300.0,
      currency: "BHD",
      language: "en",
      status: "paid",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Phase 1 production advance for NovaPay app campaign.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "High-Energy Commercial Studio Shoot (2 Days)", descriptionAr: "تصوير إعلاني عالي الحيوية في الاستوديو (يومان)", quantity: 2.0, unitPrice: 2400.0, lineTotal: 4800.0, displayOrder: 1 },
        { serviceId: "srv-07", descriptionEn: "Offline Edit & Visual Rhythm Cut", descriptionAr: "مونتاج متسارع ومؤثرات حركية", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-022",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0022`,
      dealId: "deal-12",
      clientId: "contact-10",
      issueDate: new Date("2026-09-01"),
      dueDate: new Date("2026-10-01"),
      subtotal: 10800.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 10800.0,
      currency: "BHD",
      language: "ar",
      status: "partially_paid",
      createdById: createdUsers.super_admin?.id,
      notesAr: "تم استلام 50% دفعة أولى عن تصوير أصول اللؤلؤ القابضة الصناعية.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Sovereign Industrial Assets Cinematography (3 Days)", descriptionAr: "تصوير أصول اللؤلؤ القابضة الصناعية (3 أيام)", quantity: 3.0, unitPrice: 2200.0, lineTotal: 6600.0, displayOrder: 1 },
        { serviceId: "srv-03", descriptionEn: "Drone Cinema Inspection Footage & 8K Delivery", descriptionAr: "تصوير درون سينمائي بدقة 8K ومسح للمواقع", quantity: 2.0, unitPrice: 2100.0, lineTotal: 4200.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-023",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0023`,
      dealId: "deal-03",
      clientId: "contact-03",
      issueDate: new Date("2026-09-22"),
      dueDate: new Date("2026-10-22"),
      subtotal: 13500.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 13500.0,
      currency: "BHD",
      language: "ar",
      status: "sent",
      createdById: createdUsers.finance_manager?.id,
      notesAr: "دفعة بدء الإنتاج الميداني لفيلم إعلان سباق جائزة البحرين الكبرى.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "Cinema Chase Car Rig & Night Track Crews", descriptionAr: "طاقم التصوير الليلي وسيارة التتبع المجهزة بالكرين", quantity: 1.0, unitPrice: 8500.0, lineTotal: 8500.0, displayOrder: 1 },
        { serviceId: "srv-04", descriptionEn: "High-Speed Acrobatic FPV Racing Sequences", descriptionAr: "لقطات درون FPV لمطاردة سيارات السباق على المضمار", quantity: 2.0, unitPrice: 2500.0, lineTotal: 5000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-024",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0024`,
      dealId: "deal-05",
      clientId: "contact-01",
      issueDate: new Date("2026-09-25"),
      dueDate: new Date("2026-10-25"),
      subtotal: 4600.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 4600.0,
      currency: "BHD",
      language: "ar",
      status: "draft",
      createdById: createdUsers.super_admin?.id,
      notesAr: "مسودة فاتورة مرحلة ما قبل الإنتاج والتجهيز لحملة رمضان.",
      lineItems: [
        { serviceId: "srv-11", descriptionEn: "Pre-Production Creative Treatment & Storyboard", descriptionAr: "المعالجة الإبداعية والقصة المصورة لإعلان رمضان", quantity: 1.0, unitPrice: 2600.0, lineTotal: 2600.0, displayOrder: 1 },
        { serviceId: "srv-12", descriptionEn: "Historical Heritage Casting & Location Permits", descriptionAr: "كاستينغ واختيار الممثلين وتصاريح البيوت التراثية", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-025",
      invoiceNumber: `${INVOICE_PREFIX}-2026-0025`,
      dealId: "deal-19",
      clientId: "contact-04",
      issueDate: new Date("2026-09-26"),
      dueDate: new Date("2026-10-26"),
      subtotal: 8200.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      vatAmount: 0.0,
      totalAmount: 8200.0,
      currency: "BHD",
      language: "en",
      status: "draft",
      createdById: createdUsers.finance_manager?.id,
      notesEn: "Draft invoice for Spark Creative joint agency bid deliverables.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Director of Photography & Creative Treatment", descriptionAr: "إدارة التصوير والمعالجة الإخراجية", quantity: 1.0, unitPrice: 4200.0, lineTotal: 4200.0, displayOrder: 1 },
        { serviceId: "srv-05", descriptionEn: "Soundstage A 2-Day Pre-Light and Tech Rehearsal", descriptionAr: "تجهيز الإضاءة وبروفات الحركة في استوديو أ (يومان)", quantity: 2.0, unitPrice: 2000.0, lineTotal: 4000.0, displayOrder: 2 },
      ],
    },
  ];

  for (const inv of invoicesData) {
    const { lineItems, ...invoiceHeader } = inv;
    await prisma.invoice.create({
      data: {
        ...invoiceHeader,
        lineItems: {
          create: lineItems,
        },
      },
    });
  }
  console.log("✅ Seeded 25 Invoices with Line Items across All Statuses");

  // ==========================================
  // 5. PAYMENT RECEIPTS & RECONCILIATION (BHD)
  // ==========================================
  const paymentsData = [
    {
      id: "pay-001",
      invoiceId: "inv-001",
      receiptNumber: "RCT-2026-0001",
      paymentDate: new Date("2026-08-25"),
      amount: 9800.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-HNB-8492019",
      notes: "Full payment cleared via Harbor National Bank corporate wire.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-002",
      invoiceId: "inv-002",
      receiptNumber: "RCT-2026-0002",
      paymentDate: new Date("2026-09-05"),
      amount: 4250.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-BBK-392019",
      notes: "50% initial production mobilization advance cleared.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-003",
      invoiceId: "inv-004",
      receiptNumber: "RCT-2026-0003",
      paymentDate: new Date("2026-08-15"),
      amount: 5200.0,
      currency: "BHD",
      paymentMethod: "card",
      referenceNumber: "AUTH-AMEX-99201",
      notes: "Paid in full via Bayview Grand Corporate AMEX card.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-004",
      invoiceId: "inv-005",
      receiptNumber: "RCT-2026-0004",
      paymentDate: new Date("2026-07-05"),
      amount: 3400.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-HSBC-481920",
      notes: "Direct wire settlement from Palm Golf Club account.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-005",
      invoiceId: "inv-006",
      receiptNumber: "RCT-2026-0005",
      paymentDate: new Date("2026-09-18"),
      amount: 6000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-AUB-882194",
      notes: "Orbit Telecom 50% mobilization advance.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-006",
      invoiceId: "inv-007",
      receiptNumber: "RCT-2026-0006",
      paymentDate: new Date("2026-09-02"),
      amount: 7800.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-HNB-992100",
      notes: "Harbor National Bank full project settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-007",
      invoiceId: "inv-010",
      receiptNumber: "RCT-2026-0007",
      paymentDate: new Date("2026-08-05"),
      amount: 6200.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-BISB-109281",
      notes: "Nexa Mobile fiber commercial full settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-008",
      invoiceId: "inv-011",
      receiptNumber: "RCT-2026-0008",
      paymentDate: new Date("2026-09-08"),
      amount: 4750.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-HNB-772189",
      notes: "50% advance for DSW WEC championship promo.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-009",
      invoiceId: "inv-013",
      receiptNumber: "RCT-2026-0009",
      paymentDate: new Date("2026-07-15"),
      amount: 6700.0,
      currency: "BHD",
      paymentMethod: "online",
      referenceNumber: "BENEFIT-PAY-94819",
      notes: "Instant clearance through BENEFIT Pay Business portal.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-010",
      invoiceId: "inv-014",
      receiptNumber: "RCT-2026-0010",
      paymentDate: new Date("2026-09-12"),
      amount: 2900.0,
      currency: "BHD",
      paymentMethod: "cheque",
      referenceNumber: "CHQ-BBK-001928",
      notes: "Crescent Motors manager corporate cheque cleared.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-011",
      invoiceId: "inv-016",
      receiptNumber: "RCT-2026-0011",
      paymentDate: new Date("2026-09-12"),
      amount: 5000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-DELTA-9921",
      notes: "Delta Energies 1st mobilization disbursement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-012",
      invoiceId: "inv-016",
      receiptNumber: "RCT-2026-0012",
      paymentDate: new Date("2026-09-20"),
      amount: 5000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-DELTA-9988",
      notes: "Delta Energies 2nd progress installment.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-013",
      invoiceId: "inv-017",
      receiptNumber: "RCT-2026-0013",
      paymentDate: new Date("2026-08-30"),
      amount: 6700.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-MUMT-4910",
      notes: "Pearl Holding holding full settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-014",
      invoiceId: "inv-020",
      receiptNumber: "RCT-2026-0014",
      paymentDate: new Date("2026-07-25"),
      amount: 5900.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-RIB-29108",
      notes: "Bahrain RIB advance payment cleared.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-015",
      invoiceId: "inv-021",
      receiptNumber: "RCT-2026-0015",
      paymentDate: new Date("2026-06-25"),
      amount: 7300.0,
      currency: "BHD",
      paymentMethod: "online",
      referenceNumber: "BENEFIT-PAY-88210",
      notes: "NovaPay phase 1 settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-016",
      invoiceId: "inv-022",
      receiptNumber: "RCT-2026-0016",
      paymentDate: new Date("2026-09-10"),
      amount: 5400.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-MUMT-5520",
      notes: "Pearl Holding industrial asset shoot 50% advance.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-017",
      invoiceId: "inv-001",
      receiptNumber: "RCT-2026-0017",
      paymentDate: new Date("2026-08-20"),
      amount: 0.0, // test marker or void demonstration if needed, let's keep valid amount
      currency: "BHD",
      paymentMethod: "cash",
      referenceNumber: "CSH-RCV-001",
      notes: "Petty cash verification.",
      notificationSent: false,
      createdById: createdUsers.finance_manager?.id,
    },
  ];

  // Filter out zero amount
  const validPayments = paymentsData.filter(p => p.amount > 0);
  for (const p of validPayments) {
    await prisma.payment.create({
      data: p,
    });
  }
  console.log("✅ Seeded 16 Payment Receipts with Reconciled Invoice Balances");

  // ==========================================
  // 6. EXPENSES & PRODUCTION OVERHEAD
  // ==========================================
  const expenseCats = [
    { id: "expcat-01", slug: "gear_rental", nameEn: "Equipment & Gear Rentals", nameAr: "استئجار معدات وكاميرات", color: "#09937F", displayOrder: 1, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-02", slug: "crew_wages", nameEn: "Crew & Talent Wages", nameAr: "أجور الطواقم والممثلين", color: "#3B82F6", displayOrder: 2, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-03", slug: "travel_logistics", nameEn: "Travel & Location Logistics", nameAr: "سفر ونقل وإعاشة", color: "#F59E0B", displayOrder: 3, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-04", slug: "studio_overhead", nameEn: "Studio Lease & Utilities", nameAr: "إيجار ومصاريف الاستوديو", color: "#8B5CF6", displayOrder: 4, kind: "operating", isSystem: true },
    { id: "expcat-05", slug: "software_licenses", nameEn: "Software, Storage & Cloud", nameAr: "برمجيات واشتراكات وسحابة", color: "#EC4899", displayOrder: 5, kind: "operating", isSystem: true },
    { id: "expcat-06", slug: "marketing_pr", nameEn: "Marketing & Festival Submissions", nameAr: "تسويق ومشاركات مهرجانات", color: "#10B981", displayOrder: 6, kind: "operating", isSystem: true },
    { id: "expcat-07", slug: "salaries", nameEn: "Salaries & Wages", nameAr: "الرواتب والأجور", color: "#0EA5E9", displayOrder: 7, kind: "payroll", isSystem: true },
    { id: "expcat-08", slug: "gosi", nameEn: "GOSI & Social Insurance", nameAr: "التأمينات الاجتماعية", color: "#0284C7", displayOrder: 8, kind: "payroll", isSystem: true },
    { id: "expcat-09", slug: "staff_benefits", nameEn: "Staff Benefits & Allowances", nameAr: "مزايا وبدلات الموظفين", color: "#38BDF8", displayOrder: 9, kind: "payroll", isSystem: true },
    { id: "expcat-10", slug: "commissions", nameEn: "Sales Commissions & Incentives", nameAr: "عمولات وحوافز المبيعات", color: "#6366F1", displayOrder: 10, kind: "payroll", isSystem: true },
    { id: "expcat-11", slug: "freelancers", nameEn: "Freelancers & Contractors", nameAr: "المستقلون والمتعاقدون", color: "#2563EB", displayOrder: 11, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-12", slug: "location_permits", nameEn: "Location Fees & Permits", nameAr: "رسوم المواقع والتصاريح", color: "#D97706", displayOrder: 12, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-13", slug: "props_set", nameEn: "Props, Set & Wardrobe", nameAr: "الديكور والإكسسوارات والأزياء", color: "#B45309", displayOrder: 13, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-14", slug: "post_production", nameEn: "Post-production Outsourcing", nameAr: "خدمات ما بعد الإنتاج الخارجية", color: "#7C3AED", displayOrder: 14, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-15", slug: "music_licensing", nameEn: "Music, Stock & Licensing", nameAr: "الموسيقى والمواد والتراخيص", color: "#C026D3", displayOrder: 15, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-16", slug: "catering", nameEn: "Catering & Hospitality", nameAr: "الضيافة والوجبات", color: "#EA580C", displayOrder: 16, kind: "cost_of_sales", isSystem: true },
    { id: "expcat-17", slug: "fuel_transport", nameEn: "Fuel & Local Transport", nameAr: "الوقود والمواصلات", color: "#CA8A04", displayOrder: 17, kind: "operating", isSystem: true },
    { id: "expcat-18", slug: "equipment_purchase", nameEn: "Equipment Purchases", nameAr: "شراء المعدات", color: "#059669", displayOrder: 18, kind: "operating", isSystem: true },
    { id: "expcat-19", slug: "maintenance", nameEn: "Maintenance & Repairs", nameAr: "الصيانة والإصلاحات", color: "#65A30D", displayOrder: 19, kind: "operating", isSystem: true },
    { id: "expcat-20", slug: "telecom", nameEn: "Telecom & Internet", nameAr: "الاتصالات والإنترنت", color: "#0891B2", displayOrder: 20, kind: "operating", isSystem: true },
    { id: "expcat-21", slug: "office_supplies", nameEn: "Office Supplies & Printing", nameAr: "القرطاسية والطباعة", color: "#64748B", displayOrder: 21, kind: "operating", isSystem: true },
    { id: "expcat-22", slug: "professional_fees", nameEn: "Legal & Professional Fees", nameAr: "الرسوم القانونية والمهنية", color: "#475569", displayOrder: 22, kind: "operating", isSystem: true },
    { id: "expcat-23", slug: "government_fees", nameEn: "Government Fees & Licences", nameAr: "الرسوم الحكومية والتراخيص", color: "#334155", displayOrder: 23, kind: "operating", isSystem: true },
    { id: "expcat-24", slug: "insurance", nameEn: "Insurance", nameAr: "التأمين", color: "#0F766E", displayOrder: 24, kind: "operating", isSystem: true },
    { id: "expcat-25", slug: "bank_charges", nameEn: "Bank Charges", nameAr: "الرسوم البنكية", color: "#71717A", displayOrder: 25, kind: "operating", isSystem: true },
    { id: "expcat-26", slug: "training", nameEn: "Training & Development", nameAr: "التدريب والتطوير", color: "#DB2777", displayOrder: 26, kind: "operating", isSystem: true },
    { id: "expcat-27", slug: "advertising", nameEn: "Advertising & Paid Media", nameAr: "الإعلانات المدفوعة", color: "#16A34A", displayOrder: 27, kind: "operating", isSystem: true },
    { id: "expcat-28", slug: "other", nameEn: "Other Expenses", nameAr: "مصروفات أخرى", color: "#9EADA9", displayOrder: 28, kind: "operating", isSystem: true },
  ];

  for (const ec of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { id: ec.id },
      update: ec,
      create: ec,
    });
  }

  const expenses = [
    { id: "exp-01", categoryId: "expcat-02", dealId: "deal-07", descriptionEn: "Steadicam Operator & 1st AC Wages (3 Shoot Days)", descriptionAr: "أجور مشغل ستيديكام ومساعد المصور الأول (3 أيام)", amount: 1050.0, currency: "BHD", expenseDate: new Date("2026-08-16"), vendorName: "Direct Freelance Crew", createdById: createdUsers.production_manager?.id },
    { id: "exp-02", categoryId: "expcat-01", dealId: "deal-04", descriptionEn: "Russian Arm Camera Crane Tracking Car Rental", descriptionAr: "استئجار سيارة تتبع بكاميرا كرين متقدمة", amount: 1400.0, currency: "BHD", expenseDate: new Date("2026-09-02"), vendorName: "Gulf Motion Grip Services", createdById: createdUsers.producer?.id },
    { id: "exp-03", categoryId: "expcat-04", descriptionEn: "Monthly Soundstage A Facility Lease & Electricity", descriptionAr: "إيجار استوديو أ ومصاريف الكهرباء الشهرية", amount: 1250.0, currency: "BHD", expenseDate: new Date("2026-09-01"), vendorName: "Seafront Commercial Real Estate", isRecurring: true, recurrenceInterval: "monthly", createdById: createdUsers.finance_manager?.id },
    { id: "exp-04", categoryId: "expcat-05", descriptionEn: "DaVinci Resolve Studio Cloud & LucidLink 10TB Cinema Cloud", descriptionAr: "اشتراك سحابة دافينشي ومساحة تخأوربت لوسيد لينك 10 تيرابايت", amount: 280.0, currency: "BHD", expenseDate: new Date("2026-09-03"), vendorName: "LucidLink Inc / Blackmagic Cloud", isRecurring: true, recurrenceInterval: "monthly", createdById: createdUsers.editor?.id },
    { id: "exp-05", categoryId: "expcat-02", dealId: "deal-01", descriptionEn: "Principal Cast Actors & Talent Agency Retainers", descriptionAr: "أجور الممثلين الرئيسيين ورسوم وكالة المواهب", amount: 1800.0, currency: "BHD", expenseDate: new Date("2026-09-15"), vendorName: "Bahrain Talent Casting", createdById: createdUsers.producer?.id },
    { id: "exp-06", categoryId: "expcat-03", dealId: "deal-01", descriptionEn: "Production Catering & Craft Services (4 Shoot Days)", descriptionAr: "خدمات الضيافة والإعاشة لطاقم التصوير لـ 4 أيام", amount: 650.0, currency: "BHD", expenseDate: new Date("2026-09-18"), vendorName: "Manama Gourmet Catering", createdById: createdUsers.producer?.id },
    { id: "exp-07", categoryId: "expcat-01", dealId: "deal-03", descriptionEn: "ARRI Master Grips & Wireless Follow Focus Unit Rental", descriptionAr: "استئجار أجهزة تحكم بالعدسات لاسلكية من آرّي", amount: 480.0, currency: "BHD", expenseDate: new Date("2026-09-20"), vendorName: "Gulf Camera Gear Rentals", createdById: createdUsers.production_manager?.id },
    { id: "exp-08", categoryId: "expcat-06", descriptionEn: "Cannes Corporate Media & TV Awards Submission Fees", descriptionAr: "رسوم التقديم في مهرجان كان لجوائز الأفلام الإعلانية والمؤسسية", amount: 350.0, currency: "BHD", expenseDate: new Date("2026-08-28"), vendorName: "Cannes Corporate Media Festival", createdById: createdUsers.super_admin?.id },
    { id: "exp-09", categoryId: "expcat-05", descriptionEn: "Annual Adobe Creative Cloud Enterprise Suite (10 Seats)", descriptionAr: "اشتراك باقة أدوبي كرييتف كلاود للشركات (10 مستخدمين)", amount: 890.0, currency: "BHD", expenseDate: new Date("2026-07-01"), vendorName: "Adobe Systems Direct", isRecurring: true, recurrenceInterval: "yearly", createdById: createdUsers.finance_manager?.id },
    { id: "exp-10", categoryId: "expcat-02", dealId: "deal-08", descriptionEn: "High-Speed FPV Drone Pilot Day Rate & Insurance", descriptionAr: "أجر طيار درون FPV السريع ورسوم التأمين", amount: 450.0, currency: "BHD", expenseDate: new Date("2026-09-14"), vendorName: "AeroMotion FPV Pilots", createdById: createdUsers.production_manager?.id },
  ];

  // Local VAT-registered suppliers (rentals, logistics, premises) charge 10% VAT inside the gross;
  // freelance wages and foreign subscriptions carry none. Gross always equals net + input VAT.
  const VATABLE_CATEGORIES = new Set(["expcat-01", "expcat-03", "expcat-04"]);
  for (const e of expenses) {
    const inputVatAmount = VATABLE_CATEGORIES.has(e.categoryId) ? Math.round((e.amount * 10 / 110) * 1000) / 1000 : 0;
    const dealId = (e as { dealId?: string }).dealId;
    const deal = dealId ? await prisma.crmDeal.findUnique({ where: { id: dealId }, select: { contactId: true } }) : null;
    const row = { ...e, inputVatAmount, netAmount: Math.round((e.amount - inputVatAmount) * 1000) / 1000, status: "approved", scope: dealId ? "deal" : "internal", clientId: deal?.contactId ?? null };
    await prisma.expense.upsert({
      where: { id: e.id },
      update: row,
      create: row,
    });
  }
  console.log("✅ Seeded 10 Production & Studio Operating Expenses");

  // ==========================================
  // 7. CALENDAR EVENTS & PRODUCTION SCHEDULE
  // ==========================================
  const calendarEvents = [
    {
      id: "event-01",
      title: "Gulfwave 5G Cinema Shoot — Day 1 (Seafront District)",
      titleAr: "تصوير إعلان جلف ويف — اليوم الأول (ضاحية الواجهة البحرية)",
      description: "Principal photography with RED 8K and anamorphic glass. Call time 05:30 AM.",
      startDate: new Date("2026-10-05T05:30:00Z"),
      endDate: new Date("2026-10-05T18:00:00Z"),
      allDay: false,
      location: "Seafront District, Manama",
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-01",
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: "event-02",
      title: "Gulfwave 5G Cinema Shoot — Day 2 (Bahrain Bay)",
      titleAr: "تصوير إعلان جلف ويف — اليوم الثاني (خليج البحرين)",
      description: "Sunset and night drone capture. FPV operations licensed with BCAA.",
      startDate: new Date("2026-10-06T14:00:00Z"),
      endDate: new Date("2026-10-06T22:30:00Z"),
      allDay: false,
      location: "Bahrain Bay Promenade",
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-01",
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: "event-03",
      title: "Falcon Airways Summer Series — Creative Pitch Meeting",
      titleAr: "اجتماع تقديم العرض الإبداعي لطيران الفالكون",
      description: "Presentation of 3 storyboard directions to Falcon Airways executive board.",
      startDate: new Date("2026-09-28T10:00:00Z"),
      endDate: new Date("2026-09-28T11:30:00Z"),
      allDay: false,
      location: "Falcon Airways HQ, Muharraq / Hybrid Zoom",
      color: "#3B82F6",
      eventType: "meeting",
      dealId: "deal-02",
      createdById: createdUsers.super_admin?.id,
    },
    {
      id: "event-04",
      title: "Crescent Motors Master Delivery Deadline",
      titleAr: "الموعد النهائي لتسليم ماستر إعلان الهلال",
      description: "Final 4K master ProRes delivery to broadcast TV networks.",
      startDate: new Date("2026-09-30T17:00:00Z"),
      endDate: new Date("2026-09-30T18:00:00Z"),
      allDay: false,
      location: `${BRAND_EN} Soundstage Suite`,
      color: "#E11D48",
      eventType: "deadline",
      dealId: "deal-04",
      createdById: createdUsers.editor?.id,
    },
    {
      id: "event-05",
      title: "DSW Grand Prix Teaser — Night Chase Filming",
      titleAr: "تصوير ليلي لمطاردات إعلان سباق الفورمولا 1",
      description: "Night shoot under high-output circuit floodlights with tracking vehicle.",
      startDate: new Date("2026-10-12T18:00:00Z"),
      endDate: new Date("2026-10-13T04:00:00Z"),
      allDay: false,
      location: "Desert Speedway, Sakhir",
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-03",
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: "event-06",
      title: "Orbit Esports Commercial — Studio Day (Stage A)",
      titleAr: "تصوير إعلان أوربت للألعاب الإلكترونية في استوديو أ",
      description: "Actors in LED volumetric lighting and gaming rigs.",
      startDate: new Date("2026-10-08T08:00:00Z"),
      endDate: new Date("2026-10-08T20:00:00Z"),
      allDay: false,
      location: `${BRAND_EN} Stage A, Manama`,
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-08",
      createdById: createdUsers.production_manager?.id,
    },
  ];

  for (const ce of calendarEvents) {
    await prisma.calendarEvent.upsert({
      where: { id: ce.id },
      update: ce,
      create: ce,
    });
  }
  console.log("✅ Seeded 6 Production Calendar Events");

  // ==========================================
  // 8. PRODUCTION LEADS & CLIENT INQUIRIES
  // ==========================================
  const inquiries = [
    {
      id: "inq-01",
      name: "عبدالله الخاجة",
      email: "a.khajah@albaraka.com",
      emailNorm: "a.khajah@albaraka.com",
      phone: "+973 3944 5566",
      phoneE164: "+97339445566",
      companyName: "Al Baraka Banking Group",
      serviceType: "Commercial Cinematography, DaVinci Resolve Color Grading",
      budgetRange: "5,000 – 10,000 BHD",
      timeline: "November 2026",
      message: "نود تصوير فيلم وثائقي ترويجي سنوي لتقرير الاستدامة والحوكمة في نوفمبر.",
      status: "new",
      intent: "inquiry",
      team: "production",
      workflowStatus: "assigned",
      assignedToId: createdUsers.producer?.id,
      locale: "ar",
      customAssignments: [
        {
          assignedToId: createdUsers.producer?.id,
          assignedByName: createdUsers.super_admin?.fullName,
          timestamp: new Date().toISOString(),
          notes: "تم الإسناد إلى المنتج لمراجعة متطلبات النص والجدول الزمني",
          action: "assign",
        },
      ],
    },
    {
      id: "inq-02",
      name: "Elena Rostova",
      email: "elena@redbullgulf.com",
      emailNorm: "elena@redbullgulf.com",
      phone: "+971 50 123 4567",
      phoneE164: "+971501234567",
      companyName: "Red Bull Middle East",
      serviceType: "Aerial & FPV Cinematography",
      budgetRange: "> 10,000 BHD",
      timeline: "December 2026",
      message: "Looking for a licensed cinema heavy-lift drone crew for an extreme watersports shoot in Bahrain.",
      status: "qualified",
      intent: "quote_request",
      team: "production",
      workflowStatus: "in_progress",
      assignedToId: createdUsers.production_manager?.id,
      locale: "en",
      customAssignments: [
        {
          assignedToId: createdUsers.production_manager?.id,
          assignedByName: createdUsers.super_admin?.fullName,
          timestamp: new Date().toISOString(),
          notes: "Assigned to production head for BCAA flight permit feasibility and crew quote",
          action: "assign",
        },
      ],
    },
    {
      id: "inq-03",
      name: "مريم العباسي",
      email: "m.alabbasi@tamkeen.bh",
      emailNorm: "m.alabbasi@tamkeen.bh",
      phone: "+973 3888 2211",
      phoneE164: "+97338882211",
      companyName: "Workforce Development Fund",
      serviceType: "Documentary Production & Talent Interviews",
      budgetRange: "8,000 – 15,000 BHD",
      timeline: "October 2026",
      message: "طلب إنتاج سلسلة مقابلات وثائقية ملهمة لرواد الأعمال البحرينيين.",
      status: "contacted",
      intent: "quote_request",
      team: "production",
      workflowStatus: "pending_approval",
      assignedToId: createdUsers.producer?.id,
      approvalNotes: "المقترح الفني جاهز بانتظار الاعتماد المالي والتنفيذي",
      locale: "ar",
    },
    {
      id: "inq-04",
      name: "Marcus Vance",
      email: "m.vance@mclaren.com",
      emailNorm: "m.vance@mclaren.com",
      phone: "+44 20 7946 0991",
      phoneE164: "+442079460991",
      companyName: "McLaren Automotive EMEA",
      serviceType: "Commercial Cinematography, Studio Stage A Rental",
      budgetRange: "> 15,000 BHD",
      timeline: "November 2026",
      message: "Supercar desert reveal film and studio lighting setup in Bahrain.",
      status: "qualified",
      intent: "quote_request",
      team: "production",
      workflowStatus: "confirmed",
      assignedToId: createdUsers.production_manager?.id,
      confirmedById: createdUsers.super_admin?.id,
      confirmedAt: new Date(),
      locale: "en",
    },
    {
      id: "inq-05",
      name: "طارق الرشيد",
      email: "tariq@gulfmedia.com",
      emailNorm: "tariq@gulfmedia.com",
      phone: "+973 3611 9922",
      phoneE164: "+97336119922",
      companyName: "Gulf Media Network",
      serviceType: "Color Grading & Master Delivery",
      budgetRange: "2,000 – 4,000 BHD",
      timeline: "Urgent",
      message: "ملاحظة بخصوص معايرة الألوان في الإعلان الأخير: نود تعديل درجات اللون الأخضر للعلامة التجارية ليتطابق مع الرمز اللوني المعتمد.",
      status: "new",
      intent: "complaint",
      team: "post_production",
      workflowStatus: "assigned",
      priority: "high",
      assignedToId: createdUsers.editor?.id,
      customAssignments: [
        {
          assignedToId: createdUsers.editor?.id,
          assignedByName: createdUsers.production_manager?.fullName,
          timestamp: new Date().toISOString(),
          notes: "تم التحويل لمونتير المشروع لإجراء التعديل فوراً وتصدير نسخة مراجعة",
          action: "assign",
        },
      ],
      locale: "ar",
    },
    {
      id: "inq-06",
      name: "هدى الشروقي",
      email: "huda@bahraintourism.bh",
      emailNorm: "huda@bahraintourism.bh",
      phone: "+973 3999 1144",
      phoneE164: "+97339991144",
      companyName: "Island Tourism & Events Board",
      serviceType: "Additional Sound Design Stems",
      budgetRange: "1,000 BHD",
      timeline: "This Week",
      message: "طلب تزويدنا بالتسجيلات الصوتية المنفصلة (Stems) وموسيقى الخلفية لحملة موسم الصيف.",
      status: "qualified",
      intent: "quote_request",
      team: "post_production",
      workflowStatus: "resolved",
      assignedToId: createdUsers.editor?.id,
      resolutionNotes: "تم تصدير الحزم الصوتية كاملة ورفعها على سحابة العميل",
      resolvedAt: new Date(),
      locale: "ar",
    },
  ];

  const inquiryReferences: Record<string, string> = {
    "inq-01": "INQ-2026-000001",
    "inq-02": "RFQ-2026-000001",
    "inq-03": "RFQ-2026-000002",
    "inq-04": "RFQ-2026-000003",
    "inq-05": "CMP-2026-000001",
    "inq-06": "RFQ-2026-000004",
  };
  for (const inq of inquiries) {
    const withReference = { ...inq, reference: inquiryReferences[inq.id] };
    await prisma.inquiry.upsert({
      where: { id: inq.id },
      update: withReference,
      create: withReference,
    });
  }
  console.log("✅ Seeded 6 Production Inquiries / Service Requests & Complaints (SR/CR)");

  // ==========================================
  // 8B. MINUTES OF MEETINGS (MOM)
  // ==========================================
  const momsData = [
    {
      id: "mom-001",
      momNumber: "MOM-2026-001",
      title: "Delta Energies Brand Film 2026 - Production Kickoff & Safety Brief",
      titleAr: "فيلم دلتا إنرجيز المؤسسي 2026 - اجتماع إطلاق الإنتاج وإرشادات السلامة",
      meetingDate: new Date("2026-02-15"),
      startTime: "10:00 AM",
      endTime: "11:45 AM",
      location: `${BRAND_EN} Studio Stage A & Virtual Boardroom`,
      dealId: "deal-02",
      clientId: "contact-02",
      attendees: [
        { name: "Omar Haddad", role: "Executive Producer", email: "omar@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Karim Fawzi", role: "Production Manager", email: "production@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Noor Hamdan", role: "Senior Editor & DIT", email: "editor@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Reem Al Hashimi", role: "Corporate Comms Lead", email: "reem@bapcoenergies.com", organization: "Delta Energies", attended: true },
        { name: "Adel Rashed", role: "HSE Director", email: "hassan.k@bapcoenergies.com", organization: "Delta Energies", attended: true },
      ],
      agenda: "1. Refinery filming safety permits & PPE certification.\n2. Technical camera package review (RED V-Raptor 8K + Master Primes).\n3. Talent casting schedule & offshore helicopter unit timing.\n4. Post-production timeline and delivery cutoffs.",
      discussionPoints: [
        { topic: "Safety Clearances", notes: "DELTA HSE team approved the ATEX-rated monitor housings and required on-site safety induction for all 14 crew members on day one.", speaker: "Adel Rashed" },
        { topic: "Aerial Helicopter Unit", notes: "Helicopter Cineflex gimbal approved for offshore refinery sweep shots. Flight window confirmed for 06:00 to 08:30 on March 2nd.", speaker: "Karim Fawzi" },
        { topic: "Sound & Voiceover", notes: "Bilingual voiceover recorded in both English (UK neutral) and Arabic (Gulf refined). Client provided updated brand manifesto script.", speaker: "Reem Al Hashimi" },
      ],
      actionItems: [
        { task: "Submit full crew passport & CPR copies for refinery security badges", assignee: "Tariq Saleh", dueDate: "2026-02-18", status: "completed" },
        { task: "Prepare camera prep report and sensor calibration at studio", assignee: "Karim Fawzi", dueDate: "2026-02-22", status: "completed" },
        { task: "Share preliminary 3D previz for offshore tank sequence", assignee: "Noor Hamdan", dueDate: "2026-02-25", status: "in_progress" },
      ],
      decisions: [
        "Filming dates locked for March 1-4, 2026.",
        "Color grade LUT selected: 35mm Eastman Print Emulation with high DR curve.",
        "Final deliverable format: 8K Master DCI + 4K ProRes 4444XQ + Social Verticals."
      ],
      notes: "Meeting concluded with full alignment across executive and safety teams. Formal approvals documented.",
      status: "approved",
      createdById: createdUsers.super_admin?.id,
      approvedById: createdUsers.super_admin?.id,
      signatureUrl: signatureOf("omar-haddad"),
    },
    {
      id: "mom-002",
      momNumber: "MOM-2026-002",
      title: "Gulfwave 5G Launch Campaign - Post-Production Review & VFX Alignment",
      titleAr: "حملة جلف ويف 5G - اجتماع مراجعة المونتاج ومؤثرات الجرافيكس",
      meetingDate: new Date("2026-03-05"),
      startTime: "02:00 PM",
      endTime: "03:30 PM",
      location: "Gulfwave Innovation Lab, Hamala",
      dealId: "deal-01",
      clientId: "contact-01",
      attendees: [
        { name: "Yusuf Rahman", role: "Creative Director", email: "director@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Noor Hamdan", role: "Post-Production Supervisor", email: "editor@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Nasser Al Khalifa", role: "Brand Marketing GM", email: "nasser@batelco.com.bh", organization: "Gulfwave", attended: true },
      ],
      agenda: "1. Review Rough Cut V2 of 60s TV Commercial.\n2. CGI holographic UI elements timing & integration.\n3. Music licensing & custom sound design soundscape.",
      discussionPoints: [
        { topic: "Edit Pacing", notes: "Client commended the high-energy transitions between Manama skyline and modern fiber connectivity nodes.", speaker: "Nasser Al Khalifa" },
        { topic: "Color Tone", notes: "Enhanced cyan and emerald highlights to preserve Gulfwave new identity vibrance.", speaker: "Noor Hamdan" },
      ],
      actionItems: [
        { task: "Incorporate localized Arabic calligraphy end-frame title", assignee: "Noor Hamdan", dueDate: "2026-03-08", status: "completed" },
        { task: "Export broadcast-spec MXF files for Bahrain TV transmission", assignee: "Noor Hamdan", dueDate: "2026-03-10", status: "pending" },
      ],
      decisions: [
        "Approved 60s main commercial cut without further story edits.",
        "Commissioned 15s cutdowns for TikTok, Instagram Reels, and YouTube bumper ads."
      ],
      status: "approved",
      createdById: createdUsers.production_manager?.id,
      approvedById: createdUsers.admin?.id,
      signatureUrl: signatureOf("yusuf-rahman"),
    },
    {
      id: "mom-003",
      momNumber: "MOM-2026-003",
      title: "Q2 Studio Equipment Expansion & Virtual Production Capabilities",
      titleAr: "خطة توسعة معدات الاستوديو للربع الثاني وتقنيات الإنتاج الافتراضي",
      meetingDate: new Date("2026-03-20"),
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      location: `${BRAND_EN} Manama Headquarters`,
      attendees: [
        { name: "Omar Haddad", role: "CEO", email: "omar@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Layla Nasser", role: "Finance Manager", email: "finance@example.com", organization: `${BRAND_EN}`, attended: true },
        { name: "Karim Fawzi", role: "Production Manager", email: "production@example.com", organization: `${BRAND_EN}`, attended: true },
      ],
      agenda: "1. CapEx evaluation for LED virtual production volume backdrop.\n2. Lens fleet expansion: Cook Full Frame Plus.\n3. Q2 resource scheduling and staff certifications.",
      discussionPoints: [
        { topic: "Virtual Production ROI", notes: "Demand for car commercial virtual staging has increased by 40%. Stage B LED wall conversion will pay back in 9 months.", speaker: "Omar Haddad" },
        { topic: "Budget Allocation", notes: "Financing package secured with local bank at preferential tier.", speaker: "Layla Nasser" },
      ],
      actionItems: [
        { task: "Finalize vendor RFQ for 2.6mm pitch LED display panels", assignee: "Karim Fawzi", dueDate: "2026-04-01", status: "in_progress" },
        { task: "Prepare CapEx depreciation and tax amortisation schedule", assignee: "Layla Nasser", dueDate: "2026-04-05", status: "in_progress" },
      ],
      decisions: [
        "Proceed with Phase 1 virtual production design.",
        "Authorize procurement of Cooke FF Anamorphic set."
      ],
      status: "in_review",
      createdById: createdUsers.super_admin?.id,
      signatureUrl: signatureOf("omar-haddad"),
    },
  ];

  for (const mom of momsData) {
    await prisma.minuteOfMeeting.upsert({
      where: { momNumber: mom.momNumber },
      update: mom,
      create: mom,
    });
  }
  console.log("✅ Seeded 3 Minutes of Meetings (MOM) with Agendas, Action Items, & Signatures");

  // ==========================================
  // 9. AUDIT LOGS & EXECUTIVE NOTIFICATIONS
  // ==========================================
  await prisma.activityLog.createMany({
    data: [
      {
        userId: createdUsers.super_admin.id,
        action: "login",
        entityType: "auth",
        details: { device: "Chrome on macOS (Manama, BH)", session: "sess_live_94820" },
        ipAddress: "185.120.45.12",
      },
      {
        userId: createdUsers.finance_manager.id,
        action: "create",
        entityType: "invoice",
        entityId: "inv-001",
        details: { invoiceNumber: `${INVOICE_PREFIX}-2026-0001`, amount: 9800.0, client: "ITEB" },
        ipAddress: "185.120.45.14",
      },
      {
        userId: createdUsers.producer.id,
        action: "stage_change",
        entityType: "deal",
        entityId: "deal-01",
        details: { dealTitle: "Gulfwave 5G Launch", from: "contract_signed", to: "production" },
        ipAddress: "89.148.33.20",
      },
      {
        userId: createdUsers.finance_manager.id,
        action: "create",
        entityType: "payment",
        entityId: "pay-001",
        details: { receiptNumber: "RCT-2026-0001", amount: 9800.0, method: "bank_transfer" },
        ipAddress: "185.120.45.14",
      },
      {
        userId: createdUsers.super_admin.id,
        action: "update",
        entityType: "company_settings",
        details: { vat_enabled: true, vat_percentage: 10.0 },
        ipAddress: "185.120.45.12",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: createdUsers.super_admin.id,
        title: "استلام دفعة مالية جديدة",
        message: "تم استلام دفعة مسجلة بقيمة 6,000 د.ب من شركة أوربت البحرين (إيصال RCT-2026-005).",
        type: "success",
        entityType: "payment",
        entityId: "pay-005",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: "تذكير موعد تصوير سينمائي",
        message: "جلسة تصوير الحملة الإعلانية لشركة جلف ويف مجدولة في تقويم الإنتاج غداً.",
        type: "action",
        entityType: "calendar",
        entityId: "event-01",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: "طلب إنتاج جديد عبر الموقع",
        message: "ورد استفسار إنتاجي جديد من شركة ريد بول الشرق الأوسط لتصوير سينمائي بالدرون.",
        type: "info",
        entityType: "lead",
        entityId: "inq-02",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: "فاتورة مستحقة الدفع",
        message: `الفاتورة رقم ${INVOICE_PREFIX}-2026-009 لشركة الهلال تجاوزت موعد الاستحقاق (4,500 د.ب).`,
        type: "warning",
        entityType: "invoice",
        entityId: "inv-009",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: `مرحباً بك في نظام ${BRAND_AR} المتكامل`,
        message: "تم تفعيل جميع الوحدات الإدارية، وإعدادات الضرائب، والصلاحيات بنجاح.",
        type: "info",
        entityType: "system",
        isRead: true,
      },
    ],
  });

  // Seed Vault Attachments
  await prisma.attachment.deleteMany();
  const attachmentsToSeed = [
    {
      fileName: "Master-Service-Agreement-Gulfwave-2026.pdf",
      fileUrl: await demoDocument("Master-Service-Agreement-Gulfwave-2026.pdf", owner.id),
      fileSize: 2450000,
      mimeType: "application/pdf",
      entityType: "contact",
      entityId: "contact-01",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Commercial-Shoot-Permit-DSW-F1.pdf",
      fileUrl: await demoDocument("Commercial-Shoot-Permit-DSW-F1.pdf", owner.id),
      fileSize: 1200000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-01",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Crescent-Motors-Brand-Guidelines.pdf",
      fileUrl: await demoDocument("Crescent-Motors-Brand-Guidelines.pdf", owner.id),
      fileSize: 4800000,
      mimeType: "application/pdf",
      entityType: "contact",
      entityId: "contact-02",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Invoice-INV-2026-001-Signed.pdf",
      fileUrl: await demoDocument("Invoice-INV-2026-001-Signed.pdf", owner.id),
      fileSize: 850000,
      mimeType: "application/pdf",
      entityType: "invoice",
      entityId: "inv-001",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Bayview-Grand-Location-Release-Form.pdf",
      fileUrl: await demoDocument("Bayview-Grand-Location-Release-Form.pdf", owner.id),
      fileSize: 640000,
      mimeType: "application/pdf",
      entityType: "customer_vault",
      entityId: "contact-11",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Pearl-Holding-Annual-Investor-Moodboard.pdf",
      fileUrl: await demoDocument("Pearl-Holding-Annual-Investor-Moodboard.pdf", owner.id),
      fileSize: 7200000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-03",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "DELTA-Energies-NDA-Signed.pdf",
      fileUrl: await demoDocument("DELTA-Energies-NDA-Signed.pdf", owner.id),
      fileSize: 1540000,
      mimeType: "application/pdf",
      entityType: "customer_vault",
      entityId: "contact-04",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "nexa-5G-Commercial-Storyboard-v3.pdf",
      fileUrl: await demoDocument("nexa-5G-Commercial-Storyboard-v3.pdf", owner.id),
      fileSize: 12400000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-05",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Ministry-Information-Drone-Flight-Authorization.pdf",
      fileUrl: await demoDocument("Ministry-Information-Drone-Flight-Authorization.pdf", owner.id),
      fileSize: 3100000,
      mimeType: "application/pdf",
      entityType: "general",
      entityId: "permits-2026",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Invoice-INV-2026-004-Receipt-Stamped.pdf",
      fileUrl: await demoDocument("Invoice-INV-2026-004-Receipt-Stamped.pdf", owner.id),
      fileSize: 520000,
      mimeType: "application/pdf",
      entityType: "invoice",
      entityId: "inv-004",
      uploadedById: createdUsers.super_admin.id,
    },
  ];

  for (const att of attachmentsToSeed) {
    await prisma.attachment.create({ data: att });
  }

  // ==========================================
  // ENTERPRISE & HEADLESS CMS SEEDING
  // ==========================================
  console.log("🌱 Seeding Enterprise Headless CMS & RBAC Tables...");

  // Update company profile with CEO / Mission
  await prisma.companySetting.update({
    where: { singleton: 1 },
    data: {
      ceoNameEn: demoStaff[0].nameEn,
      ceoNameAr: demoStaff[0].nameAr,
      ceoTitleEn: "Founder & Creative Director",
      ceoTitleAr: "المؤسس والمدير الإبداعي",
      ceoQuoteEn: "We don't merely capture light; we shape the way memories, emotions, and brands resonate through time.",
      ceoQuoteAr: "نحن لا نلتقط الضوء فحسب، بل نصوغ الذكريات والمشاعر لترسخ في الأذهان عبر الزمن.",
      missionEn: "Empower market leaders to tell their brand narratives with uncompromised visual precision and emotional depth.",
      missionAr: "تمكين رواد السوق من سرد قصص علاماتهم التجارية بدقة بصرية متناهية وعمق عاطفي.",
      visionEn: "To be the premier commercial cinema production destination in Bahrain and the Arabian Gulf.",
      visionAr: "أن نكون الوجهة الأولى للإنتاج السينمائي التجاري في البحرين والخليج العربي.",
      aboutTextEn: `Founded in the Kingdom of Bahrain, ${BRAND_EN} is a premier creative media production house uniting cinematic storytelling with engineering precision. We believe that true visual impact is created at the intersection of technical discipline and unconstrained creative curiosity.`,
      aboutTextAr: `تأسست ${BRAND_AR} في مملكة البحرين كدار إنتاج سينمائي إبداعية رائدة تجمع بين القصص السينمائية والدقة الهندسية. نؤمن بأن التأثير البصري الحقيقي ينبع من تقاطع الانضباط التقني والفضول الإبداعي اللامحدود.`,
      termsEn: `1. SCOPE OF ENGAGEMENT: All cinematic production, photography, sound recording, and post-production services rendered by ${BRAND_EN} are subject to authorized treatment proposals and confirmed call-sheets.\n\n2. INTELLECTUAL PROPERTY & RAW ASSETS: Upon full and final settlement of all issued invoices, the client receives worldwide commercial broadcast and digital exhibition rights for final rendered masters. Master RAW camera footage, unrendered DaVinci Resolve project files, and unreleased scene outtakes remain the proprietary intellectual property of ${BRAND_EN} unless explicitly transferred under a dedicated raw buy-out addendum.\n\n3. PAYMENT MILESTONES: Unless stated otherwise in writing, engagements require a 50% mobilization deposit prior to pre-production and location booking, 30% upon completion of primary photography, and 20% prior to final 8K ProRes master delivery.\n\n4. CANCELLATION & RESCHEDULING: Rescheduling requests submitted less than 48 hours prior to call-time incur actual incurred crew and permit costs. Cancellations after pre-production commencement forfeit the mobilization deposit.\n\n5. GOVERNING LAW: All commercial agreements and production engagements are governed exclusively by the laws and commercial regulations of the Kingdom of Bahrain.`,
      termsAr: `1. نطاق العمل والتعاقد: تخضع كافة خدمات الإنتاج السينمائي، التصوير الفوتوغرافي، المعايرة اللونية، وهندسة الصوت المقدمة من ${BRAND_AR} للإنتاج الإعلامي لعروض العمل المعتمدة وأوامر التصوير الرسمية.\n\n2. حقوق الملكية الفكرية والمواد الخام: عند السداد الكامل والنهائي لجميع المبالغ والفواتير المستحقة، يمنح العميل حقوق النشر والعرض التجاري والرقمي الكامل للمواد النهائية المعتمدة. تظل المواد المصورة الخام (RAW Footage) وملفات المشاريع غير المصدرة ملكاً فكرياً حصرياً ل${BRAND_AR} ما لم ينص ملحق العقد صراحة على شراء المواد الخام الكاملة.\n\n3. الدفعات المالية: ما لم يُتفق على خلاف ذلك كتابياً، يستحق سداد 50% كدفعة مقدمة قبل بدء التجهيزات وحجز المواقع، و30% فور انتهاء أيام التصوير الرئيسية، و20% قبل تسليم النسخ النهائية بدقة 8K ProRes.\n\n4. الإلغاء وتأجيل المواعيد: أي طلب لتأجيل موعد التصوير خلال أقل من 48 ساعة من موعد الحضور يتحمل العميل التكاليف الفعلية المترتبة على حجز الطواقم والتصاريح. في حال إلغاء المشروع بعد بدء التجهيزات الفعلية، تُعتبر الدفعة المقدمة غير مستردة.\n\n5. القانون المطبق: تخضع كافة العقود والاتفاقيات لأحكام القوانين والأنظمة التجارية المعمول بها في مملكة البحرين.`,
      rulesEn: `1. CONFIDENTIALITY & NON-DISCLOSURE: ${BRAND_EN} adheres to strict non-disclosure obligations. All unreleased campaign materials, product prototypes, and commercial treatments are maintained under strict confidentiality until formal public launch by the client.\n\n2. PERSONAL DATA PROTECTION (BAHRAIN PDPL): In full compliance with Bahrain Personal Data Protection Law (Law No. 30 of 2018), client contact details, commercial billing records, and inquiry information are encrypted and never shared, sold, or distributed to unauthorized third parties.\n\n3. SECURE DIGITAL ASSET ARCHIVING: All captured 8K/6K cinema footage is mirrored across localized redundant RAID arrays and cold off-site backups with strict hardware-encrypted access controls.\n\n4. COOKIES & SESSION STORAGE: Our web platforms utilize only strictly necessary session security tokens to authenticate verified portal users and preserve bilingual language preferences. We do not deploy invasive third-party cross-site behavioral tracking cookies without explicit consent.`,
      rulesAr: `1. السرية وحماية المعلومات: تلتزم ${BRAND_AR} بأعلى معايير السرية التامة وعدم الإفصاح. تُحفظ كافة المواد الدعائية المصورة ونماذج المنتجات ومفاهيم الحملات غير المعلنة بسرية مشددة حتى تاريخ إطلاقها الرسمي من قِبل العميل.\n\n2. حماية البيانات الشخصية (قانون البحرين رقم 30 لسنة 2018): امتثالاً لأحكام قانون حماية البيانات الشخصية المعمول به في مملكة البحرين، تُعامل كافة بيانات التواصل والفواتير وسجلات العملاء بأعلى درجات الأمان المشفر ولا يتم بيعها أو مشاركتها مع أي جهة خارجية.\n\n3. الأرشفة الرقمية الآمنة للمواد السينمائية: يتم حفظ المواد السينمائية المصورة في وحدات تخأوربت مصفوفية (RAID) مشفرة مع نسخ احتياطية خارجية مفصولة لتأمين الأصول الإبداعية للعملاء ضد أي فقدان تقني.\n\n4. ملفات تعريف الارتباط والأمان: يستخدم موقعنا فقط ملفات تعريف الارتباط الأساسية والضرورية تقنياً لتوثيق الجلسات وحفظ تفضيلات اللغة، ولا نستخدم أي برمجيات تتبع إعلاني خارجية متطفلة دون موافقة مسبقة.`,
    },
  });



  for (const feature of DEFAULT_FEATURE_MODULES) {
    await prisma.featureToggle.upsert({
      where: { moduleKey: feature.moduleKey },
      update: feature,
      create: feature,
    });
  }

  const stats = [
    { value: "150+", labelEn: "Commercial Films Delivered", labelAr: "فيلم تجاري سينمائي", subLabelEn: "For GCC Brands & Corporations", subLabelAr: "لكبرى الشركات والجهات في الخليج", icon: "Film", sortOrder: 1 },
    { value: "8K", labelEn: "RAW Cinema Resolution", labelAr: "دقة تصوير سينمائي خام", subLabelEn: "RED V-Raptor & ARRI ALEXA LF", subLabelAr: "كاميرات ريد وفانتوم وآري", icon: "Video", sortOrder: 2 },
    { value: "100%", labelEn: "Licensed Aerial Drone Ops", labelAr: "تصاريح طيران جوي مرخصة", subLabelEn: "Bahrain Civil Aviation Authority", subLabelAr: "شؤون الطيران المدني بمملكة البحرين", icon: "Plane", sortOrder: 3 },
    { value: "10+", labelEn: "Years of Industry Excellence", labelAr: "سنوات من التميز الإبداعي", subLabelEn: "Headquartered in Manama, Seafront", subLabelAr: "المقر الرئيسي ضاحية الواجهة البحرية، المنامة", icon: "Award", sortOrder: 4 },
  ];

  await prisma.statistic.deleteMany();
  for (const stat of stats) {
    await prisma.statistic.create({ data: stat });
  }

  const faqs = [
    {
      questionEn: "What camera systems and lenses do you use for commercial shoots?",
      questionAr: "ما هي أنظمة الكاميرات والعدسات المستخدمة في الإعلانات؟",
      answerEn: "We shoot primarily on RED V-Raptor 8K, ARRI ALEXA Mini LF, and Sony FX9 camera systems paired with ARRI Master Primes, Cooke Anamorphic, and Leica Cine lenses.",
      answerAr: "نعتمد بشكل أساسي على كاميرات RED V-Raptor 8K وكاميرات ARRI ALEXA Mini LF وسوني FX9 مع طقم عدسات آري ماستر برايم وكوك وأنامورفيك.",
      sortOrder: 1,
    },
    {
      questionEn: "Are your aerial drone operators licensed for commercial filming in Bahrain?",
      questionAr: "هل مشغلو طائرات الدرون حاصلون على تراخيص رسمية في البحرين؟",
      answerEn: "Yes, all our heavy-lift RED drone and custom FPV operators are fully licensed and certified by the Bahrain Civil Aviation Authority (BCAA) with full public liability insurance.",
      answerAr: "نعم، جميع طياري الدرون وكاميرات FPV لدينا مرخصون رسمياً من شؤون الطيران المدني بمملكة البحرين مع تغطية تأمينية شاملة.",
      sortOrder: 2,
    },
    {
      questionEn: "How long does post-production and DaVinci Resolve color grading take?",
      questionAr: "كم تستغرق مرحلة المونتاج وتصحيح الألوان في استوديو دافينشي؟",
      answerEn: "Standard post-production timelines range from 5 to 14 business days depending on visual effects, sound design complexity, and color grading review rounds.",
      answerAr: "تستغرق مرحلة ما بعد الإنتاج عادة من 5 إلى 14 يوم عمل، وتشمل المونتاج، الهندسة الصوتية، الخدع البصرية، ومعايرة الألوان.",
      sortOrder: 3,
    },
  ];

  await prisma.faq.deleteMany();
  for (const faq of faqs) {
    await prisma.faq.create({ data: faq });
  }

  const reviews = [
    {
      authorEn: "Marketing & Brand Director",
      authorAr: "مدير التسويق والعلامة التجارية",
      companyEn: "Harbor National Bank (HNB)",
      companyAr: "بنك هاربر الوطني",
      quoteEn: `${BRAND_EN} delivered an exceptional TV commercial campaign that exceeded our highest cinematic expectations. Their color grading and drone shots were world-class.`,
      quoteAr: `قدمت ${BRAND_AR} حملة إعلانية سينمائية استثنائية فاقت توقعاتنا. كانت الألوان والتصوير الجوي بمستوى عالمي رائع.`,
      year: "2026",
      rating: 5,
      isApproved: true,
      sortOrder: 1,
    },
    {
      authorEn: "Corporate Communications Lead",
      authorAr: "رئيس الاتصال المؤسسي",
      companyEn: "Orbit Telecom",
      companyAr: "أوربت البحرين",
      quoteEn: "The professionalism of the camera crew and the precision of the 8K footage transformed our brand film. Truly the finest cinema house in Bahrain.",
      quoteAr: "احترافية طاقم التصوير ودقة مشاهد 8K أحدثت فارقاً كبيراً في فيلماً الترويجي. بحق أفضل استوديو إنتاج سينمائي في البحرين.",
      year: "2025",
      rating: 5,
      isApproved: true,
      sortOrder: 2,
    },
  ];

  await prisma.review.deleteMany();
  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }

  // ==========================================
  // NEW FEATURES SEED: SEQUENCES, FX, HRMS, PAYROLL, APPROVALS, SR/CR & QUOTATIONS
  // ==========================================

  // 1. Reference Sequences
  const refSequences = [
    { id: "SR_2026", prefix: "SR", year: 2026, lastNumber: 2 },
    { id: "INQ_2026", prefix: "INQ", year: 2026, lastNumber: 1 },
    { id: "RFQ_2026", prefix: "RFQ", year: 2026, lastNumber: 4 },
    { id: "CMP_2026", prefix: "CMP", year: 2026, lastNumber: 1 },
    { id: "QTE_2026", prefix: "QTE", year: 2026, lastNumber: 6 },
    { id: "EMP_2026", prefix: "EMP", year: 2026, lastNumber: 9 },
  ];
  for (const seq of refSequences) {
    await prisma.referenceSequence.upsert({
      where: { id: seq.id },
      update: { lastNumber: seq.lastNumber },
      create: seq,
    });
  }

  // 2. Exchange Rate Snapshots (Canonical 9 Currencies: BHD against SAR, AED, KWD, OMR, QAR, USD, EUR, GBP)
  const fxSnapshotsData = [
    // Today
    { baseCurrency: "BHD", quoteCurrency: "USD", rate: 2.652520, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "SAR", rate: 9.946950, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "AED", rate: 9.741600, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "KWD", rate: 0.814210, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "OMR", rate: 1.020580, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "QAR", rate: 9.655170, effectiveDate: new Date("2026-10-04"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "EUR", rate: 2.450980, effectiveDate: new Date("2026-10-04"), provider: "frankfurter" },
    { baseCurrency: "BHD", quoteCurrency: "GBP", rate: 2.083330, effectiveDate: new Date("2026-10-04"), provider: "frankfurter" },
    // Baseline Previous Day
    { baseCurrency: "BHD", quoteCurrency: "USD", rate: 2.652520, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "SAR", rate: 9.947200, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "AED", rate: 9.741200, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "KWD", rate: 0.814150, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "OMR", rate: 1.020500, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "QAR", rate: 9.654800, effectiveDate: new Date("2026-10-03"), provider: "cbb_manual" },
    { baseCurrency: "BHD", quoteCurrency: "EUR", rate: 2.448500, effectiveDate: new Date("2026-10-03"), provider: "frankfurter" },
    { baseCurrency: "BHD", quoteCurrency: "GBP", rate: 2.081500, effectiveDate: new Date("2026-10-03"), provider: "frankfurter" },
  ];
  for (const fx of fxSnapshotsData) {
    await prisma.exchangeRateSnapshot.upsert({
      where: {
        baseCurrency_quoteCurrency_effectiveDate: {
          baseCurrency: fx.baseCurrency,
          quoteCurrency: fx.quoteCurrency,
          effectiveDate: fx.effectiveDate,
        },
      },
      update: { rate: fx.rate, provider: fx.provider },
      create: fx,
    });
  }

  // 3. HRMS Departments & Leave Types
  const departmentsData = [
    { code: "EXEC", nameEn: "Executive Management", nameAr: "الإدارة التنفيذية", managerId: createdUsers.super_admin?.id },
    { code: "PROD", nameEn: "Production & Cinematography", nameAr: "إدارة الإنتاج والتصوير السينمائي", managerId: createdUsers.production_manager?.id },
    { code: "POST", nameEn: "Post-Production & VFX", nameAr: "ما بعد الإنتاج والمونتاج والمؤثرات", managerId: createdUsers.production_manager?.id },
    { code: "FIN", nameEn: "Finance & Accounts", nameAr: "الشؤون المالية والمحاسبة", managerId: createdUsers.finance_manager?.id },
    { code: "COMM", nameEn: "Commercial & Business Development", nameAr: "الشؤون التجارية وتطوير الأعمال", managerId: createdUsers.sales?.id },
  ];
  const deptMap: Record<string, string> = {};
  for (const d of departmentsData) {
    const created = await prisma.department.upsert({
      where: { code: d.code },
      update: { nameEn: d.nameEn, nameAr: d.nameAr, managerId: d.managerId },
      create: d,
    });
    deptMap[d.code] = created.id;
  }

  const leaveTypesData = [
    // Bahrain labour law, as set by the hr_payroll_rework migration (which runs before this seed creates the rows).
    { code: "annual", nameEn: "Annual Leave", nameAr: "إجازة سنوية", daysAllowedPerYear: 30, isPaid: true, accrual: "monthly", maxCarryOverDays: 15, sortOrder: 1 },
    {
      code: "sick", nameEn: "Sick Leave", nameAr: "إجازة مرضية", daysAllowedPerYear: 55, isPaid: true, sortOrder: 2,
      payTiers: [{ upToDays: 15, percent: 100 }, { upToDays: 35, percent: 50 }, { upToDays: 55, percent: 0 }],
    },
    { code: "emergency", nameEn: "Emergency Leave", nameAr: "إجازة طارئة", daysAllowedPerYear: 6, isPaid: true, sortOrder: 3 },
    { code: "hajj", nameEn: "Hajj Leave", nameAr: "إجازة حج", daysAllowedPerYear: 21, isPaid: true, allowHalfDay: false, countCalendarDays: true, eligibleAfterMonths: 12, sortOrder: 5 },
  ];
  const leaveTypeMap: Record<string, string> = {};
  for (const lt of leaveTypesData) {
    const created = await prisma.leaveType.upsert({
      where: { code: lt.code },
      update: lt,
      create: lt,
    });
    leaveTypeMap[lt.code] = created.id;
  }

  // 4. HRMS Employees & Employment Records
  const employeesData = [
    {
      employeeNumber: "EMP-2026-000001",
      userId: createdUsers.super_admin?.id,
      departmentId: deptMap["EXEC"],
      firstNameEn: "Sayed",
      lastNameEn: "Ahmed",
      firstNameAr: "سيد",
      lastNameAr: "أحمد",
      email: "director@example.com",
      phone: "+973 3900 1100",
      cprNumber: "880112345",
      jobTitleEn: "General Director & Cinema Director",
      jobTitleAr: "المدير العام والمخرج السينمائي",
      hireDate: new Date("2020-01-01"),
      status: "active",
      leaveBalanceDays: 30.0,
      basicSalary: 3500.0,
      housingAllowance: 500.0,
      transportAllowance: 200.0,
    },
    {
      employeeNumber: "EMP-2026-000002",
      userId: createdUsers.admin?.id,
      departmentId: deptMap["EXEC"],
      firstNameEn: "Mohamed",
      lastNameEn: "Al-Mahdi",
      firstNameAr: "محمد",
      lastNameAr: "المهدي",
      email: "director@example.com",
      phone: "+973 3900 2200",
      cprNumber: "910223456",
      jobTitleEn: "Managing Director",
      jobTitleAr: "المدير التنفيذي",
      hireDate: new Date("2021-03-01"),
      status: "active",
      leaveBalanceDays: 28.0,
      basicSalary: 2800.0,
      housingAllowance: 400.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-2026-000003",
      userId: createdUsers.finance_manager?.id,
      departmentId: deptMap["FIN"],
      firstNameEn: "Zainab",
      lastNameEn: "Al-Shami",
      firstNameAr: "زينب",
      lastNameAr: "الشامي",
      email: "finance@example.com",
      phone: "+973 3900 3300",
      cprNumber: "930334567",
      jobTitleEn: "Chief Financial Officer",
      jobTitleAr: "المدير المالي الأول",
      hireDate: new Date("2022-01-15"),
      status: "active",
      leaveBalanceDays: 26.0,
      basicSalary: 2400.0,
      housingAllowance: 350.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-2026-000004",
      userId: createdUsers.production_manager?.id,
      departmentId: deptMap["PROD"],
      firstNameEn: "Ali",
      lastNameEn: "Al-Samahiji",
      firstNameAr: "علي",
      lastNameAr: "السماهيجي",
      email: "production@example.com",
      phone: "+973 3900 4400",
      cprNumber: "900445678",
      jobTitleEn: "Head of Cinematic Production",
      jobTitleAr: "رئيس الإنتاج السينمائي الميداني",
      hireDate: new Date("2021-06-01"),
      status: "active",
      leaveBalanceDays: 25.0,
      basicSalary: 2200.0,
      housingAllowance: 300.0,
      transportAllowance: 150.0,
    },
    {
      employeeNumber: "EMP-2026-000005",
      userId: createdUsers.editor?.id,
      departmentId: deptMap["POST"],
      firstNameEn: "Fatima",
      lastNameEn: "Al-Kaabi",
      firstNameAr: "فاطمة",
      lastNameAr: "الكعبي",
      email: "editor@example.com",
      phone: "+973 3900 6600",
      cprNumber: "950556789",
      jobTitleEn: "Lead Colorist & Senior Editor",
      jobTitleAr: "رئيسة قسم المونتاج وتلوين السينما",
      hireDate: new Date("2022-08-01"),
      status: "on_leave",
      leaveBalanceDays: 21.0,
      basicSalary: 1800.0,
      housingAllowance: 250.0,
      transportAllowance: 100.0,
    },
    {
      employeeNumber: "EMP-2026-000006",
      userId: createdUsers.sales?.id,
      departmentId: deptMap["COMM"],
      firstNameEn: "Khalid",
      lastNameEn: "Al-Saeed",
      firstNameAr: "خالد",
      lastNameAr: "السعيد",
      email: "sales@example.com",
      phone: "+973 3900 8811",
      cprNumber: "940667890",
      jobTitleEn: "Commercial Accounts Executive",
      jobTitleAr: "المسؤول التنفيذي للحسابات التجارية",
      hireDate: new Date("2023-02-01"),
      status: "active",
      leaveBalanceDays: 27.0,
      basicSalary: 1600.0,
      housingAllowance: 250.0,
      transportAllowance: 100.0,
    },
    // Every seeded staff role gets an employee record so self-service HR (leave, payslips) works for all of them.
    {
      employeeNumber: "EMP-2026-000007",
      userId: createdUsers.accountant?.id,
      departmentId: deptMap["FIN"],
      firstNameEn: "Noor",
      lastNameEn: "Al-Hashimi",
      firstNameAr: "نور",
      lastNameAr: "الهاشمي",
      email: createdUsers.accountant?.email ?? null,
      phone: "+973 3900 8812",
      cprNumber: "960778901",
      jobTitleEn: "Accountant",
      jobTitleAr: "محاسبة",
      hireDate: new Date("2023-06-01"),
      status: "active",
      leaveBalanceDays: 30.0,
      basicSalary: 1400.0,
      housingAllowance: 200.0,
      transportAllowance: 100.0,
    },
    {
      employeeNumber: "EMP-2026-000008",
      userId: createdUsers.producer?.id,
      departmentId: deptMap["PROD"],
      firstNameEn: "Hassan",
      lastNameEn: "Al-Mahroos",
      firstNameAr: "حسن",
      lastNameAr: "المحروس",
      email: createdUsers.producer?.email ?? null,
      phone: "+973 3900 8813",
      cprNumber: "930889012",
      jobTitleEn: "Producer",
      jobTitleAr: "منتج",
      hireDate: new Date("2023-09-01"),
      status: "active",
      leaveBalanceDays: 30.0,
      basicSalary: 1500.0,
      housingAllowance: 250.0,
      transportAllowance: 100.0,
    },
    {
      employeeNumber: "EMP-2026-000009",
      userId: createdUsers.marketing?.id,
      departmentId: deptMap["COMM"],
      firstNameEn: "Layla",
      lastNameEn: "Al-Khalifa",
      firstNameAr: "ليلى",
      lastNameAr: "الخليفة",
      email: createdUsers.marketing?.email ?? null,
      phone: "+973 3900 8814",
      cprNumber: "970990123",
      jobTitleEn: "Marketing Specialist",
      jobTitleAr: "أخصائية تسويق",
      hireDate: new Date("2024-01-15"),
      status: "active",
      leaveBalanceDays: 30.0,
      basicSalary: 1300.0,
      housingAllowance: 200.0,
      transportAllowance: 100.0,
    },
  ];

  const empMap: Record<string, any> = {};
  // Bahrain social insurance (SIO) defaults: 7% employee, 12% employer. Payroll cannot run without them.
  const SIO_SETTINGS = { employee: { mode: "percentage", value: 7 }, employer: { mode: "percentage", value: 12 }, supports: [] };
  const usersById = new Map(Object.values(createdUsers).filter(Boolean).map((u: any) => [u.id, u]));
  for (const emp of employeesData) {
    const { basicSalary, housingAllowance, transportAllowance, ...rawFields } = emp;
    // An employee linked to a login always carries that login's e-mail.
    const empFields = { ...rawFields, email: (usersById.get(rawFields.userId) as any)?.email ?? rawFields.email };
    const createdEmp = await prisma.employee.upsert({
      where: { employeeNumber: empFields.employeeNumber },
      update: empFields,
      create: empFields,
    });
    empMap[empFields.employeeNumber] = createdEmp;

    await prisma.employmentRecord.deleteMany({ where: { employeeId: createdEmp.id } });
    await prisma.employmentRecord.create({
      data: {
        employeeId: createdEmp.id,
        contractType: "full_time",
        basicSalary,
        housingAllowance,
        transportAllowance,
        otherAllowances: 0.0,
        payrollSettings: SIO_SETTINGS,
        effectiveFrom: empFields.hireDate,
        isCurrent: true,
      },
    });
  }

  // Approved Leave Request for EMP-005
  if (empMap["EMP-2026-000005"] && leaveTypeMap["annual"]) {
    await prisma.leaveRequest.deleteMany({ where: { employeeId: empMap["EMP-2026-000005"].id } });
    await prisma.leaveRequest.create({
      data: {
        employeeId: empMap["EMP-2026-000005"].id,
        leaveTypeId: leaveTypeMap["annual"],
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        fullDay: true,
        // Working days charged (Friday/Saturday weekend).
        days: workingDaysBetween(new Date("2026-10-01"), new Date("2026-10-07"), { weekendDays: [5, 6] }, new Set()),
        status: "approved",
        reason: "Annual vacation & rest after international commercial film project.",
        approvedById: createdUsers.production_manager?.id || createdUsers.super_admin?.id,
        approvedAt: new Date("2026-09-28"),
        reviewNotes: "Approved. All Davinci Resolve suites handed over to secondary colorist.",
      },
    });
  }

  // 5. Payroll runs are generated by the real payroll engine in seed-volume.ts, so every total,
  //    contribution and approval matches what the app itself would produce.

  // 6. Inquiries (Service Request & Change Request)
  const srInquiry = await prisma.inquiry.upsert({
    where: { reference: "SR-2026-000001" },
    update: {
      requestType: "SR",
      workflowStatus: "in_progress",
      priority: "high",
    },
    create: {
      reference: "SR-2026-000001",
      requestType: "SR",
      name: "حمد الرميحي",
      email: "h.alromaihi@batelco.com.bh",
      phone: "+973 3944 1122",
      companyName: "Gulfwave Telecommunications",
      customerId: "contact-01",
      serviceType: "commercial_film",
      message: "Requesting studio crew, Arri Alexa 35 package, and director for 5G Ultra commercial pickup day.",
      status: "qualified",
      workflowStatus: "in_progress",
      priority: "high",
      team: "production",
      assignedToId: createdUsers.production_manager?.id,
      slaDueDate: new Date("2026-10-10"),
    },
  });

  await prisma.requestEvent.deleteMany({ where: { inquiryId: srInquiry.id } });
  await prisma.requestAssignment.deleteMany({ where: { inquiryId: srInquiry.id } });
  await prisma.requestComment.deleteMany({ where: { inquiryId: srInquiry.id } });

  await prisma.requestEvent.createMany({
    data: [
      { inquiryId: srInquiry.id, actorId: createdUsers.super_admin?.id, eventType: "status_change", details: { from: "received", to: "in_progress" } },
      { inquiryId: srInquiry.id, actorId: createdUsers.production_manager?.id, eventType: "assignment", details: { assignedTo: "Ali Al-Samahiji" } },
    ],
  });

  await prisma.requestAssignment.create({
    data: {
      inquiryId: srInquiry.id,
      assignedToId: createdUsers.production_manager?.id || createdUsers.super_admin?.id,
      assignedById: createdUsers.super_admin?.id,
      team: "production",
      reason: "Lead production management for Gulfwave 5G pickup shoot.",
      active: true,
    },
  });

  await prisma.requestComment.createMany({
    data: [
      {
        inquiryId: srInquiry.id,
        authorId: createdUsers.production_manager?.id || createdUsers.super_admin?.id,
        body: "Arri Alexa 35 and Cooke Anamorphic lens kit reserved with grip team.",
        isClientVisible: false,
      },
      {
        inquiryId: srInquiry.id,
        authorId: createdUsers.super_admin?.id,
        body: "Schedule confirmed for Thursday at Bahrain Bay location.",
        isClientVisible: true,
      },
    ],
  });

  const crInquiry = await prisma.inquiry.upsert({
    where: { reference: "SR-2026-000002" },
    update: {
      requestType: "SR",
      workflowStatus: "under_review",
      priority: "urgent",
    },
    create: {
      reference: "SR-2026-000002",
      requestType: "SR",
      name: "طارق الدوسري",
      email: "t.aldoseri@btea.bh",
      phone: "+973 3611 9900",
      companyName: "Island Tourism & Events Board (ITEB)",
      customerId: "contact-03",
      serviceType: "aerial_cinematography",
      message: "Scope change: Additional 4K FPV drone passes and sunset hyperlapse shots over Exhibition World Bahrain.",
      status: "contacted",
      workflowStatus: "under_review",
      priority: "urgent",
      team: "production",
      assignedToId: createdUsers.producer?.id,
      slaDueDate: new Date("2026-10-08"),
    },
  });

  await prisma.requestEvent.deleteMany({ where: { inquiryId: crInquiry.id } });
  await prisma.requestAssignment.deleteMany({ where: { inquiryId: crInquiry.id } });
  await prisma.requestComment.deleteMany({ where: { inquiryId: crInquiry.id } });

  await prisma.requestEvent.create({
    data: { inquiryId: crInquiry.id, actorId: createdUsers.super_admin?.id, eventType: "status_change", details: { from: "received", to: "under_review" } },
  });

  await prisma.requestAssignment.create({
    data: {
      inquiryId: crInquiry.id,
      assignedToId: createdUsers.producer?.id || createdUsers.super_admin?.id,
      assignedById: createdUsers.super_admin?.id,
      team: "production",
      reason: "Evaluating flight permissions and additional equipment rate for sunset shoot.",
      active: true,
    },
  });

  // 7. Quotations across Full Lifecycle (Draft, Submitted, Approved, Issued, Accepted, Converted)
  const quotationsData = [
    {
      quotationNumber: "QTE-2026-000001",
      clientId: "contact-01",
      subtotal: 3500.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 3500.0,
      currency: "BHD",
      language: "ar",
      status: "draft",
      issueDate: new Date("2026-10-01"),
      validUntilDate: new Date("2026-11-01"),
      createdById: createdUsers.sales?.id || createdUsers.super_admin?.id,
      items: [
        { descriptionEn: "Arri Alexa 35 Camera Package (2 Days)", descriptionAr: "باقة كاميرا أري أليكسا 35 السينمائية (يومان)", quantity: 2, unitPrice: 1000.0, lineTotal: 2000.0, orderIndex: 0 },
        { descriptionEn: "Cinema Prime Lenses (Set of 5)", descriptionAr: "طقم عدسات سينمائية فاخرة (5 عدسات)", quantity: 2, unitPrice: 500.0, lineTotal: 1000.0, orderIndex: 1 },
        { descriptionEn: "Grip & Sound Equipment Package", descriptionAr: "باقة معدات الإضاءة وهندسة الصوت الميدانية", quantity: 1, unitPrice: 500.0, lineTotal: 500.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-000002",
      clientId: "contact-02",
      subtotal: 6000.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 570.0,
      discountType: "percentage",
      discountValue: 5.0,
      discountAmount: 300.0,
      totalAmount: 6270.0,
      currency: "BHD",
      language: "en",
      status: "submitted",
      issueDate: new Date("2026-10-02"),
      validUntilDate: new Date("2026-11-02"),
      createdById: createdUsers.sales?.id || createdUsers.super_admin?.id,
      items: [
        { descriptionEn: "Commercial Film Production — In-flight Brand Story", descriptionAr: "إنتاج فيلم إعلاني ترويجي — تجربة الضيافة الجوية", quantity: 1, unitPrice: 4500.0, lineTotal: 4500.0, orderIndex: 0 },
        { descriptionEn: "DaVinci Resolve HDR Color Grading & Mastering", descriptionAr: "تلوين سينمائي وماسترينغ رقمي بأحدث تقنيات HDR", quantity: 1, unitPrice: 1500.0, lineTotal: 1500.0, orderIndex: 1 },
      ],
    },
    {
      quotationNumber: "QTE-2026-000003",
      clientId: "contact-03",
      subtotal: 12000.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 1080.0,
      discountType: "percentage",
      discountValue: 10.0,
      discountAmount: 1200.0,
      totalAmount: 11880.0,
      currency: "BHD",
      language: "ar",
      status: "approved",
      issueDate: new Date("2026-09-25"),
      validUntilDate: new Date("2026-10-25"),
      createdById: createdUsers.sales?.id || createdUsers.super_admin?.id,
      items: [
        { descriptionEn: "Tourism Kingdom Showcase Film (8K Raw)", descriptionAr: "فيلم وثائقي ترويجي لمعالم مملكة البحرين (8K RAW)", quantity: 1, unitPrice: 7000.0, lineTotal: 7000.0, orderIndex: 0 },
        { descriptionEn: "Heavy-Lifter Drone Cinematography with Operator", descriptionAr: "تصوير جوي سينمائي متقدم بواسطة طائرة درون مخصصة للسينما", quantity: 2, unitPrice: 1500.0, lineTotal: 3000.0, orderIndex: 1 },
        { descriptionEn: "Original Cinematic Orchestral Score & Sound Design", descriptionAr: "تأليف موسيقى تصويرية أوركسترالية خاصة وتصميم صوتي", quantity: 1, unitPrice: 2000.0, lineTotal: 2000.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-000004",
      clientId: "contact-04",
      subtotal: 4800.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 4800.0,
      currency: "BHD",
      language: "en",
      status: "issued",
      deliveryChannel: "email",
      deliveredAt: new Date("2026-10-02T10:00:00Z"),
      issueDate: new Date("2026-10-02"),
      validUntilDate: new Date("2026-11-02"),
      createdById: createdUsers.sales?.id || createdUsers.super_admin?.id,
      items: [
        { descriptionEn: "Social Media 4K Campaign Reels (Set of 6)", descriptionAr: "إنتاج وتصوير 6 مقاطع فيديو ترويجية لمنصات التواصل (4K)", quantity: 6, unitPrice: 600.0, lineTotal: 3600.0, orderIndex: 0 },
        { descriptionEn: "High-End Motion Graphics & Typography Design", descriptionAr: "تصميم غرافيك متحرك وطباعة حركية عالية الدقة", quantity: 1, unitPrice: 1200.0, lineTotal: 1200.0, orderIndex: 1 },
      ],
    },
    {
      quotationNumber: "QTE-2026-000005",
      clientId: "contact-01",
      subtotal: 8500.0,
      vatEnabled: true,
      vatPercentage: 10.0,
      vatAmount: 850.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 9350.0,
      currency: "BHD",
      language: "ar",
      status: "accepted",
      acceptanceEvidence: "Client PO approval received: PO#BAT-2026-9921",
      issueDate: new Date("2026-09-20"),
      validUntilDate: new Date("2026-10-20"),
      createdById: createdUsers.sales?.id || createdUsers.super_admin?.id,
      invoiceId: null, // Ready for 1-Click Conversion!
      items: [
        { descriptionEn: "National Day 60s Cinema Commercial", descriptionAr: "إعلان اليوم الوطني السينمائي (60 ثانية)", quantity: 1, unitPrice: 6500.0, lineTotal: 6500.0, orderIndex: 0 },
        { descriptionEn: "Multi-cam Behind the Scenes Coverage", descriptionAr: "تغطية سينمائية خلف الكواليس بكاميرات متعددة", quantity: 1, unitPrice: 1000.0, lineTotal: 1000.0, orderIndex: 1 },
        { descriptionEn: "Spatial Audio Mix & Dolby Atmos Mastering", descriptionAr: "ماسترينغ وهندسة صوت دولبي أتموس ثلاثية الأبعاد", quantity: 1, unitPrice: 1000.0, lineTotal: 1000.0, orderIndex: 2 },
      ],
    },
    {
      quotationNumber: "QTE-2026-000006",
      clientId: "contact-03",
      subtotal: 9800.0,
      vatEnabled: false,
      vatPercentage: 10.0,
      vatAmount: 0.0,
      discountType: "none",
      discountValue: 0.0,
      discountAmount: 0.0,
      totalAmount: 9800.0,
      currency: "BHD",
      language: "ar",
      status: "converted",
      acceptanceEvidence: `Approved by ITEB procurement; converted to Tax Invoice ${INVOICE_PREFIX}-2026-001`,
      issueDate: new Date("2026-08-10"),
      validUntilDate: new Date("2026-09-10"),
      createdById: createdUsers.super_admin?.id,
      invoiceId: "inv-001", // Converted to existing seeded invoice!
      items: [
        { descriptionEn: "Exhibition World Bahrain Inauguration Documentary", descriptionAr: "فيلم وثائقي رسمي لافتتاح مركز البحرين العالمي للمعارض", quantity: 1, unitPrice: 8000.0, lineTotal: 8000.0, orderIndex: 0 },
        { descriptionEn: "4K Live Cinema Stream Relay Infrastructure", descriptionAr: "بث تلفزيوني سينمائي مباشر بدقة 4K", quantity: 1, unitPrice: 1800.0, lineTotal: 1800.0, orderIndex: 1 },
      ],
    },
  ];

  // Totals are computed with the app's own calculator and follow the company VAT registration, so a
  // quotation never promises a different amount from the invoice it becomes.
  const quotationVat = (await prisma.companySetting.findFirstOrThrow({ select: { vatEnabled: true, vatPercentage: true } }));
  for (const q of quotationsData) {
    const { items, ...rawQ } = q;
    const totals = calculateInvoiceTotals(
      items.map((i) => ({ quantity: i.quantity, unit_price: i.unitPrice })) as any,
      rawQ.discountType as any, rawQ.discountValue, quotationVat.vatEnabled, Number(quotationVat.vatPercentage), rawQ.currency as any,
    );
    const qData = {
      ...rawQ,
      vatEnabled: quotationVat.vatEnabled,
      vatPercentage: Number(quotationVat.vatPercentage),
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
    };
    const existingQ = await prisma.quotation.findUnique({ where: { quotationNumber: qData.quotationNumber } });
    let qId = existingQ?.id;
    if (existingQ) {
      await prisma.quotation.update({ where: { id: existingQ.id }, data: qData });
    } else {
      const created = await prisma.quotation.create({ data: qData });
      qId = created.id;
    }

    if (qId) {
      await prisma.quotationLineItem.deleteMany({ where: { quotationId: qId } });
      for (const item of items) {
        await prisma.quotationLineItem.create({
          data: { ...item, quotationId: qId },
        });
      }

      // Add approval fixtures for submitted and approved quotes
      if (q.quotationNumber === "QTE-2026-000002") {
        const hash = crypto.createHash("sha256").update(`quotation_${qId}_1`).digest("hex");
        await prisma.approvalRequest.upsert({
          where: { targetType_targetId_revision: { targetType: "quotation", targetId: qId, revision: 1 } },
          update: { status: "pending", discountReason: "5% commercial discount for annual Falcon Airways fleet campaign" },
          create: {
            targetType: "quotation",
            targetId: qId,
            revision: 1,
            contentHash: hash,
            status: "pending",
            requestedById: createdUsers.sales?.id || createdUsers.super_admin?.id,
            discountReason: "5% commercial discount for annual Falcon Airways fleet campaign",
            policySnapshot: { maxDiscountPercent: 10, requiredRole: "admin" },
          },
        });
      } else if (q.quotationNumber === "QTE-2026-000003") {
        const hash = crypto.createHash("sha256").update(`quotation_${qId}_1`).digest("hex");
        const appReq = await prisma.approvalRequest.upsert({
          where: { targetType_targetId_revision: { targetType: "quotation", targetId: qId, revision: 1 } },
          update: { status: "approved", discountReason: "10% strategic partner discount for ITEB national tourism campaign" },
          create: {
            targetType: "quotation",
            targetId: qId,
            revision: 1,
            contentHash: hash,
            status: "approved",
            requestedById: createdUsers.sales?.id || createdUsers.super_admin?.id,
            discountReason: "10% strategic partner discount for ITEB national tourism campaign",
            policySnapshot: { maxDiscountPercent: 10, requiredRole: "admin" },
          },
        });
        await prisma.approvalDecision.deleteMany({ where: { approvalRequestId: appReq.id } });
        await prisma.approvalDecision.create({
          data: {
            approvalRequestId: appReq.id,
            decision: "approved",
            decidedById: createdUsers.super_admin?.id,
            reason: "Strategic kingdom showcase project. Approved 10% partner discount.",
            decidedAt: new Date("2026-09-26"),
          },
        });
      }
    }
  }

  console.log("✅ Seeded new features: Sequences, FX Snapshots, HRMS, Payroll, Inquiries (SR/CR) & Quotations lifecycle");

  // Large dataset generated through the app's own domain functions, then a reconcile pass that
  // brings every fixture in line with the app's rules. SEED_VOLUME=off skips the volume stage.
  if (process.env.SEED_VOLUME !== "off") {
    const users = Object.fromEntries(Object.entries(createdUsers).map(([role, user]: [string, any]) => [role, { id: user.id, email: user.email, fullName: user.fullName, role, signatureUrl: user.signatureUrl }]));
    await seedVolume(prisma, { users, passwordHash, brand: profile.display, sampleSignatureUrl: signatureOf("guest") });
  }
  await reconcileSeed(prisma);

  // A local demo must have an explicit snapshot before the public site can render.
  const localDemo = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(process.env.DATABASE_URL!).hostname,
  );
  const snapshot = localDemo
    ? JSON.parse(JSON.stringify(await collectWebsiteDraft(defaultWebsiteConfig)))
    : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.websiteContent.create({
      data: {
        id: "main",
        draft: JSON.parse(JSON.stringify(defaultWebsiteConfig)),
        ...(snapshot ? { published: snapshot, publishedAt: new Date(), revision: 2 } : {}),
      },
    });
    if (snapshot) {
      await tx.revalidationJob.create({
        data: {
          eventKey: "website:publish:2",
          payload: { tags: ["website", "company"], paths: ["/", "/about", "/contact", "/works"] },
        },
      });
    }
  });
  console.log(localDemo ? "✅ Published local demo website snapshot" : "✅ Created website draft; publish approved content in the admin app");

  console.log("✨ Massive database seed completed successfully with verified financial data, vault attachments, and headless CMS records!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), websiteDb.$disconnect()]);
  });
