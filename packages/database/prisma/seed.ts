import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "fs";
import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting dynamic enterprise database seed...");

  const configPath = path.resolve(__dirname, "initial-company-config.json");
  const initialConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    throw new Error(
      "SECURITY CONFIGURATION REQUISITE: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be strictly defined in environment (.env). Fallback credentials or '||' operators are strictly prohibited for database bootstrapping.",
    );
  }

  const superAdminName = process.env.SUPER_ADMIN_NAME ?? "Super Admin";
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE ?? "";

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  const usersData = [
    {
      email: superAdminEmail,
      fullName: superAdminName,
      role: "super_admin",
      department: "executive",
      phone: superAdminPhone,
      signatureUrl: "/brand/signatures/sayed-ahmed.svg",
    },
    {
      email: "director@ishoot.bh",
      fullName: "محمد المهدي",
      role: "admin",
      department: "executive",
      phone: "+973 3900 2200",
      signatureUrl: "/brand/signatures/mohamed-almahdi.svg",
    },
    {
      email: "finance@ishoot.bh",
      fullName: "زينب الشامي",
      role: "finance_manager",
      department: "finance",
      phone: "+973 3900 3300",
      signatureUrl: "/brand/signatures/zainab-alshami.svg",
    },
    {
      email: "production@ishoot.bh",
      fullName: "علي السماهيجي",
      role: "production_manager",
      department: "production",
      phone: "+973 3900 4400",
      signatureUrl: "/brand/signatures/ali-alsamahiji.svg",
    },
    {
      email: "producer@ishoot.bh",
      fullName: "حسين الجمري",
      role: "producer",
      department: "production",
      phone: "+973 3900 5500",
      signatureUrl: "/brand/signatures/husain-aljamri.svg",
    },
    {
      email: "editor@ishoot.bh",
      fullName: "فاطمة الكعبي",
      role: "editor",
      department: "post_production",
      phone: "+973 3900 6600",
      signatureUrl: "/brand/signatures/fatima-alkaabi.svg",
    },
    {
      email: "accountant@ishoot.bh",
      fullName: "جاسم المطوع",
      role: "accountant",
      department: "finance",
      phone: "+973 3900 7700",
      signatureUrl: "/brand/signatures/jasim-almutawa.svg",
    },
    {
      email: "sales@ishoot.bh",
      fullName: "خالد السعيد",
      role: "sales",
      department: "sales",
      phone: "+973 3900 8811",
      signatureUrl: "/brand/signatures/khalid-alsaeed.svg",
    },
    {
      email: "marketing@ishoot.bh",
      fullName: "مريم العالي",
      role: "marketing",
      department: "marketing",
      phone: "+973 3900 8822",
      signatureUrl: "/brand/signatures/maryam-alaali.svg",
    },
    {
      email: "guest@ishoot.bh",
      fullName: "مراقب عام (Guest)",
      role: "viewer",
      department: "operations",
      phone: "+973 3900 8800",
      signatureUrl: "/brand/signatures/guest.svg",
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        role: u.role,
        fullName: u.fullName,
        department: u.department,
        phone: u.phone,
        signatureUrl: u.signatureUrl,
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        role: u.role,
        department: u.department,
        phone: u.phone,
        signatureUrl: u.signatureUrl,
        isActive: true,
      },
    });
    createdUsers[u.role] = user;
  }

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
  console.log("✅ Created 10 RBAC Users with Signatures & Hierarchy (Password: Admin123!)");

  const ALL_RESOURCES = [
    "invoices",
    "payments",
    "expenses",
    "finance_analytics",
    "deals",
    "contacts",
    "leads",
    "contracts",
    "banners",
    "portfolio",
    "clients",
    "equipment",
    "calendar",
    "users",
    "settings",
    "audit_logs",
  ];
  const ALL_ACTIONS = ["read", "write", "delete", "export", "approve"];
  const ROLE_RULES: Record<string, Partial<Record<string, string[]>>> = {
    super_admin: {},
    admin: {
      invoices: ["read", "write", "export", "approve"],
      payments: ["read", "write", "export"],
      expenses: ["read", "write", "export"],
      finance_analytics: ["read", "export"],
      deals: ["read", "write", "delete", "export"],
      contacts: ["read", "write", "delete", "export"],
      leads: ["read", "write", "delete", "export"],
      contracts: ["read", "write", "export"],
      banners: ["read", "write", "delete"],
      portfolio: ["read", "write", "delete"],
      clients: ["read", "write", "delete"],
      equipment: ["read", "write", "delete"],
      calendar: ["read", "write", "delete"],
      users: ["read", "write"],
      settings: ["read", "write"],
      audit_logs: ["read"],
    },
    finance_manager: {
      invoices: ["read", "write", "export", "approve"],
      payments: ["read", "write", "export", "approve"],
      expenses: ["read", "write", "export", "approve"],
      finance_analytics: ["read", "export"],
      deals: ["read"],
      contacts: ["read"],
      contracts: ["read"],
      calendar: ["read"],
    },
    accountant: {
      invoices: ["read", "write", "export"],
      payments: ["read", "write", "export"],
      expenses: ["read", "write", "export"],
      finance_analytics: ["read"],
      deals: ["read"],
      contacts: ["read"],
      contracts: ["read"],
    },
    production_manager: {
      deals: ["read", "write", "export"],
      contacts: ["read", "write"],
      leads: ["read", "write"],
      contracts: ["read", "write"],
      equipment: ["read", "write"],
      calendar: ["read", "write", "delete"],
      portfolio: ["read"],
      invoices: ["read"],
    },
    producer: {
      deals: ["read", "write"],
      contacts: ["read", "write"],
      leads: ["read", "write"],
      contracts: ["read"],
      equipment: ["read", "write"],
      calendar: ["read", "write"],
      portfolio: ["read"],
    },
    sales: {
      deals: ["read", "write", "delete", "export"],
      contacts: ["read", "write", "delete", "export"],
      leads: ["read", "write", "delete", "export"],
      contracts: ["read", "write"],
      calendar: ["read", "write"],
      invoices: ["read"],
    },
    marketing: {
      banners: ["read", "write", "delete"],
      portfolio: ["read", "write", "delete"],
      clients: ["read", "write", "delete"],
      leads: ["read", "write"],
      calendar: ["read", "write"],
      equipment: ["read"],
    },
    editor: {
      portfolio: ["read", "write"],
      banners: ["read"],
      equipment: ["read"],
      calendar: ["read"],
    },
    viewer: {
      deals: ["read"],
      contacts: ["read"],
      leads: ["read"],
      portfolio: ["read"],
      clients: ["read"],
      equipment: ["read"],
      calendar: ["read"],
    },
  };

  const rbacRoles = Object.keys(ROLE_RULES);
  for (const role of rbacRoles) {
    const roleRules = ROLE_RULES[role] || {};
    for (const resource of ALL_RESOURCES) {
      const allowedActions = roleRules[resource] || [];
      for (const action of ALL_ACTIONS) {
        const allowed =
          role === "super_admin" ? true : allowedActions.includes(action);
        await prisma.permission.upsert({
          where: {
            role_resource_action: {
              role,
              resource,
              action,
            },
          },
          update: { allowed },
          create: {
            role,
            resource,
            action,
            allowed,
          },
        });
      }
    }
  }
  console.log("✅ Seeded Granular RBAC Permissions Matrix");

  const companySettingId = "00000000-0000-0000-0000-000000000001";
  await prisma.companySetting.upsert({
    where: { id: companySettingId },
    update: { ...initialConfig.company },
    create: {
      id: companySettingId,
      ...initialConfig.company,
    },
  });
  console.log("✅ Created Company & Tax Settings from initial-company-config.json");

  if (initialConfig.brandingAssets && Array.isArray(initialConfig.brandingAssets)) {
    for (const asset of initialConfig.brandingAssets) {
      await prisma.companyAsset.upsert({
        where: { assetKey: asset.assetKey },
        update: {
          title: asset.title,
          fileUrl: asset.fileUrl,
          mimeType: asset.mimeType,
        },
        create: {
          assetKey: asset.assetKey,
          title: asset.title,
          fileUrl: asset.fileUrl,
          mimeType: asset.mimeType,
        },
      });
    }
    console.log("✅ Seeded Enterprise Brand Assets in Database");
  }
  console.log("✅ Created Company & Tax Settings");


  const socialLinks = [
    { platform: "Instagram", url: "https://instagram.com/ishoot.bh", icon: "Instagram", displayOrder: 1, isActive: true },
    { platform: "LinkedIn", url: "https://linkedin.com/company/ishoot-bh", icon: "Linkedin", displayOrder: 2, isActive: true },
    { platform: "YouTube", url: "https://youtube.com/@ishootbh", icon: "Youtube", displayOrder: 3, isActive: true },
    { platform: "Vimeo", url: "https://vimeo.com/ishoot", icon: "Video", displayOrder: 4, isActive: true }
  ];

  for (const sl of socialLinks) {
    await prisma.socialLink.create({ data: sl });
  }
  console.log("✅ Seeded Social Links");


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
      mediaUrl: "/banners/youtube-cover-01.jpg",
      posterUrl: "/banners/youtube-cover-01.jpg",
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
      mediaUrl: "/banners/web-banner-04.jpg",
      posterUrl: "/banners/web-banner-04.jpg",
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
      mediaUrl: "/banners/web-banner-02.jpg",
      posterUrl: "/banners/web-banner-02.jpg",
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
      titleEn: "Batelco — National Day Cinema Anthem",
      titleAr: "بتلكو — فيلم اليوم الوطني السينمائي",
      clientName: "Batelco Telecommunications",
      year: 2025,
      aspectRatio: "2.39:1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1518135714426-c18f5ffb6f4d?auto=format&fit=crop&w=1200&q=80",
      previewVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4",
      fullVideoUrl:
        "https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4",
      galleryUrls: [
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80",
      ],
      descriptionEn:
        "A high-impact cinematic commercial capturing the heritage and technological future of Bahrain across 6 iconic locations.",
      descriptionAr:
        "عمل سينمائي فخم يوثق أصالة وتطور مملكة البحرين عبر 6 مواقع تاريخية وحديثة.",
      credits: {
        director: "Sayed Ahmed Husain",
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
      titleEn: "Bahrain Financial Harbour — High Speed FPV",
      titleAr: "مرفأ البحرين المالي — استعراض FPV فائق السرعة",
      clientName: "BFH Properties",
      year: 2025,
      aspectRatio: "16:9",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80",
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
        director: "Sayed Ahmed Husain",
        dop: "Husain Aljamri",
        colorist: "ishoot Grading Suite",
        editor: "Fatima Alkaabi",
      },
      isFeatured: true,
      displayOrder: 2,
    },
    {
      id: "work-03",
      categoryId: "cat-01",
      slug: "gulf-air-falcon-gold",
      titleEn: "Gulf Air — Falcon Gold Reimagined",
      titleAr: "طيران الخليج — تجربة الصقر الذهبي",
      clientName: "Gulf Air",
      year: 2024,
      aspectRatio: "2.39:1",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
      descriptionEn:
        "Luxury airline cabin commercial filmed on soundstage with bespoke lighting rigs mimicking cruising altitude skies.",
      descriptionAr:
        "إعلان تجاري فخم لمقصورة الصقر الذهبي مصور داخل الاستوديو بمحاكاة إضاءة الطيران.",
      credits: {
        director: "Sayed Ahmed Husain",
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
      titleEn: "ALBA — The Smelter of the Future",
      titleAr: "ألبا — مصهر المستقبل",
      clientName: "Aluminium Bahrain (ALBA)",
      year: 2024,
      aspectRatio: "16:9",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
      descriptionEn:
        "Industrial cinema documentary revealing molten metal craftsmanship and safety excellence.",
      descriptionAr:
        "فيلم وثائقي صناعي سينمائي يبرز ريادة مصهر الألمنيوم والكوادر الوطنية.",
      credits: {
        director: "Sayed Ahmed Husain",
        dop: "Ali Alsamaheji",
        colorist: "ishoot Suite",
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

  const clientLogos = [
    {
      id: "logo-01",
      name: "Batelco",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Batelco_By_Beyon_logo.svg",
      websiteUrl: "https://batelco.com",
      displayOrder: 1,
    },
    {
      id: "logo-02",
      name: "Gulf Air",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/97/Gulf_Air_2018_wordmark.svg",
      websiteUrl: "https://gulfair.com",
      displayOrder: 2,
    },
    {
      id: "logo-03",
      name: "ALBA Aluminium",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/85/Aluminium_Bahrain_Logo.png",
      websiteUrl: "https://albasmelter.com",
      displayOrder: 3,
    },
    {
      id: "logo-04",
      name: "National Bank of Bahrain (NBB)",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/39/NBB_Logo_Primary.svg",
      websiteUrl: "https://nbbonline.com",
      displayOrder: 4,
    },
    {
      id: "logo-05",
      name: "Zain Bahrain",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Zain_%28Unternehmen%29_logo.svg",
      websiteUrl: "https://bh.zain.com",
      displayOrder: 5,
    },
    {
      id: "logo-06",
      name: "stc Bahrain",
      logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e3/STC-01.svg",
      websiteUrl: "https://stc.com.bh",
      displayOrder: 6,
    },
    {
      id: "logo-07",
      name: "Bapco Energies",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/da/Bapco_Energies_logo.svg",
      websiteUrl: "https://bapcoenergies.com",
      displayOrder: 7,
    },
    {
      id: "logo-08",
      name: "Bahrain Mumtalakat Holding",
      logoUrl: "https://d22x99z9pyemfq.cloudfront.net/static/mumtalakat-logo.svg",
      websiteUrl: "https://mumtalakat.bh",
      displayOrder: 8,
    },
    {
      id: "logo-09",
      name: "Four Seasons Hotel Bahrain Bay",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/a/a1/Four_Seasons_logo.svg",
      websiteUrl: "https://fourseasons.com/bahrain",
      displayOrder: 9,
    },
    {
      id: "logo-10",
      name: "Bahrain Economic Development Board",
      logoUrl: "https://www.bahrainedb.com/app/themes/bedb/assets/images/edb_logo_grey-01.svg",
      websiteUrl: "https://bahrainedb.com",
      displayOrder: 10,
    },
    {
      id: "logo-11",
      name: "Bahrain Tourism & Exhibitions Authority",
      logoUrl: "https://tourismbh.com/uploads/footer-logo/BTEA_logo.svg",
      websiteUrl: "https://btea.bh",
      displayOrder: 11,
    },
    {
      id: "logo-12",
      name: "Seef Properties",
      logoUrl: "https://seef.com.bh/wp-content/uploads/2021/03/logo-for-web-site.svg",
      websiteUrl: "https://seef.bh",
      displayOrder: 12,
    },
    {
      id: "logo-13",
      name: "Beyon Digital",
      logoUrl: "https://beyon.com/wp-content/uploads/2026/08/Beyon_Logo_Full_Colour.svg",
      websiteUrl: "https://beyon.com",
      displayOrder: 13,
    },
    {
      id: "logo-14",
      name: "Bahrain International Circuit (BIC)",
      logoUrl: "https://upload.wikimedia.org/wikipedia/en/d/d1/Bahrain_International_Circuit_logo.png",
      websiteUrl: "https://bahraingp.com",
      displayOrder: 14,
    },
    {
      id: "logo-15",
      name: "Beyon Money FinTech",
      logoUrl: "https://www.beyonmoney.com/wp-content/uploads/2026/06/2024_Beyon_Money_Logo_App_Icon.svg",
      websiteUrl: "https://beyonmoney.com",
      displayOrder: 15,
    },
    {
      id: "logo-16",
      name: "Royal Golf Club Bahrain",
      logoUrl: "https://www.theroyalgolfclub.com/logo.png",
      websiteUrl: "https://theroyalgolfclub.com",
      displayOrder: 16,
    },
  ];

  for (const l of clientLogos) {
    await prisma.clientLogo.upsert({
      where: { id: l.id },
      update: l,
      create: l,
    });
  }
  console.log("✅ Created 16 Enterprise Client Logos");

  const equipmentList = [
    {
      id: "eq-01",
      category: "cameras",
      nameEn: "RED V-Raptor XL 8K VV Cinema Package",
      nameAr: "كاميرا ريد في-رابتور إكس إل 8 كي",
      brand: "RED Digital Cinema",
      specification:
        "8K VistaVision multi-format sensor, up to 120fps at 8K, 17+ stops dynamic range, PL mount.",
      dailyRateBhd: 450.0,
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
      dailyRateBhd: 180.0,
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
      dailyRateBhd: 350.0,
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
      dailyRateBhd: 300.0,
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
      dailyRateBhd: 120.0,
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
      dailyRateBhd: 95.0,
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
      dailyRateBhd: 110.0,
      displayOrder: 7,
    },
    {
      id: "eq-08",
      category: "stages",
      nameEn: "Soundstage A — 250m² Acoustically Treated Cyclorama",
      nameAr: "استوديو أ — استوديو عازل للصوت 250 م² مع سايك مقوس",
      brand: "ishoot Soundstage",
      specification:
        "Infinity curve cyclorama, 6m overhead lighting grid, 60kW 3-phase power, soundproof control booth.",
      dailyRateBhd: 550.0,
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
      companyName: "Batelco Telecommunications",
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
      companyName: "Gulf Air Marketing",
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
      companyName: "Bahrain Tourism & Exhibitions Authority (BTEA)",
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
      companyName: "Impact BBDO Bahrain Agency",
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
      lastName: "الزياني",
      companyName: "Zayani Motors",
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
      companyName: "Zain Bahrain",
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
      companyName: "National Bank of Bahrain (NBB)",
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
      companyName: "Aluminium Bahrain (ALBA)",
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
      companyName: "Bapco Energies",
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
      companyName: "Bahrain Mumtalakat Holding",
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
      companyName: "Four Seasons Hotel Bahrain Bay",
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
      companyName: "Economic Development Board (EDB)",
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
      companyName: "stc Bahrain",
      email: "l.almannai@stc.com.bh",
      emailNorm: "l.almannai@stc.com.bh",
      phone: "+973 3500 8899",
      phoneE164: "+97335008899",
      jobTitle: "General Manager — Marketing Communications",
      contactType: "client",
      notes: "Fiber broadband advertising campaigns, stc pay promotional videos, and music event filming.",
    },
    {
      id: "contact-14",
      firstName: "الشيخ سلمان",
      lastName: "بن عيسى آل خليفة",
      companyName: "Bahrain International Circuit (BIC)",
      email: "s.binisa@bic.com.bh",
      emailNorm: "s.binisa@bic.com.bh",
      phone: "+973 3922 0011",
      phoneE164: "+97339220011",
      jobTitle: "Chief Executive Officer",
      contactType: "client",
      notes: "Formula 1 Gulf Air Bahrain GP official teasers, WEC endurance coverage, and night racing films.",
    },
    {
      id: "contact-15",
      firstName: "زياد",
      lastName: "العلوي",
      companyName: "Beyon Money FinTech",
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
      companyName: "Royal Golf Club Bahrain",
      email: "d.campbell@theroyalgolfclub.com",
      emailNorm: "d.campbell@theroyalgolfclub.com",
      phone: "+973 1775 0777",
      phoneE164: "+97317750777",
      jobTitle: "Managing Director",
      contactType: "client",
      notes: "European Tour DP World tournament broadcast capture and golf academy promotional documentaries.",
    },
  ];

  for (const c of contacts) {
    await prisma.crmContact.upsert({
      where: { id: c.id },
      update: c,
      create: c,
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
      title: "Batelco 5G-Advanced Launch Campaign",
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
      title: "Gulf Air Summer Destination Series",
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
      title: "Bahrain Grand Prix 2027 Teaser Film",
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
      title: "Zayani Luxury EV Cinematic Commercial",
      dealStage: "post_production",
      dealValue: 8750.0,
      currency: "BHD",
      probability: 100,
      expectedCloseDate: new Date("2026-09-30"),
      shootDate: new Date("2026-09-18"),
      notes: "Currently in color grading and 5.1 surround sound mastering at ishoot suite.",
    },
    {
      id: "deal-05",
      contactId: "contact-01",
      title: "Batelco Ramadan Brand Film 2027",
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
      title: "Ferrari Bahrain Showroom Showcase",
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
      title: "Zain Bahrain Youth Esports Film",
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
      title: "NBB Digital Banking App Rebrand Film",
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
      title: "ALBA Net-Zero Carbon Milestone Documentary",
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
      title: "Bapco Energies Future of Energy Showcase",
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
      title: "Mumtalakat Portfolio Corporate Film",
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
      title: "Four Seasons Bahrain Bay Luxury Dining Vignettes",
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
      title: "EDB Invest in Bahrain Global Film",
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
      title: "stc Bahrain 5G Fiber Broadband Commercial",
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
      title: "BIC World Endurance Championship Promo",
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
      title: "Beyon Money SuperApp Launch Film",
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
      title: "Royal Golf Club International Invitational",
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
      title: "Impact BBDO National Day Multi-Brand Film",
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
      title: "Gulf Air First Class Cabin Experience Film",
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
      invoiceNumber: "ISH-2026-001",
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
      invoiceNumber: "ISH-2026-002",
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
      invoiceNumber: "ISH-2026-003",
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
      invoiceNumber: "ISH-2026-004",
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
      notesEn: "Full settlement for Four Seasons luxury dining vignettes.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Macro Food & Dining Cinematography (2 Days)", descriptionAr: "تصوير سينمائي ماكرو للأطباق الفاخرة (يومان)", quantity: 2.0, unitPrice: 1600.0, lineTotal: 3200.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "Color Grading & High-End 4K Deliverables", descriptionAr: "تصحيح ألوان وإخراج نهائي بدقة 4K", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-005",
      invoiceNumber: "ISH-2026-005",
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
      invoiceNumber: "ISH-2026-006",
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
      invoiceNumber: "ISH-2026-007",
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
      notesAr: "دفعة كاملة مسددة عن إنتاج فيلم تطبيق الخدمات الرقمية لبنك البحرين الوطني.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "App UI Cinema Integration & Live-Action Shoot", descriptionAr: "تصوير سينمائي حي ودمج شاشات التطبيق التفاعلية", quantity: 1.0, unitPrice: 4800.0, lineTotal: 4800.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "DaVinci Color Grade & Finishing", descriptionAr: "تصحيح ألوان وإخراج نهائي للبث التلفزيوني والرقمي", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-008",
      invoiceNumber: "ISH-2026-008",
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
      notesEn: "Invoice issued for ALBA Net-Zero Carbon Documentary; undergoing client SAP procurement clearance.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "Industrial Plant 5-Day Cinematography & Executive Interviews", descriptionAr: "تصوير صناعي في المصهر لمدة 5 أيام ومقابلات الإدارة التنفيذية", quantity: 5.0, unitPrice: 2000.0, lineTotal: 10000.0, displayOrder: 1 },
        { serviceId: "srv-03", descriptionEn: "Industrial Aerial Survey & Thermal Drone Cinema", descriptionAr: "مسح جوي سينمائي وتصوير بالدرون الحراري", quantity: 2.0, unitPrice: 1500.0, lineTotal: 3000.0, displayOrder: 2 },
        { serviceId: "srv-10", descriptionEn: "Environmental Data 3D Infographics & Narrative Finishing", descriptionAr: "رسوم بيانية متحركة ثلاثية الأبعاد للبيانات البيئية", quantity: 1.0, unitPrice: 3500.0, lineTotal: 3500.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-009",
      invoiceNumber: "ISH-2026-009",
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
      notesEn: "OVERDUE: Reminder sent for Ferrari showroom showcase delivery balance.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Ferrari Showroom Lighting & Gimbal Cinematography", descriptionAr: "تصوير سينمائي احترافي بصالة العرض مع الإضاءة المتقدمة", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "ProRes 4444 XQ Master Grading & HDR Delivery", descriptionAr: "معالجة ألوان وتصدير ماستر بدقة فائقة HDR", quantity: 1.0, unitPrice: 1500.0, lineTotal: 1500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-010",
      invoiceNumber: "ISH-2026-010",
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
      invoiceNumber: "ISH-2026-011",
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
        { serviceId: "srv-01", descriptionEn: "Night Circuit Track High-Speed Tracking Shoot", descriptionAr: "تصوير تتبع ليلي عالي السرعة على مضمار حلبة البحرين", quantity: 2.0, unitPrice: 2500.0, lineTotal: 5000.0, displayOrder: 1 },
        { serviceId: "srv-04", descriptionEn: "FPV Aerial Drone Pitlane Fly-throughs", descriptionAr: "لقطات جوية درون FPV عبر خط الصيانة ومنصات الفرق", quantity: 1.0, unitPrice: 2000.0, lineTotal: 2000.0, displayOrder: 2 },
        { serviceId: "srv-09", descriptionEn: "Engine Roar Foley & Dolby 5.1 Sound Design", descriptionAr: "تصميم صوتي واقعي لزئير المحركات ومكساج محيطي", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 3 },
      ],
    },
    {
      id: "inv-012",
      invoiceNumber: "ISH-2026-012",
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
      invoiceNumber: "ISH-2026-013",
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
      invoiceNumber: "ISH-2026-014",
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
      invoiceNumber: "ISH-2026-015",
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
      notesEn: "Phase 2 delivery invoice for EDB global investor promotional documentary.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "3-Day Financial Harbor & Industrial Zone Shoot", descriptionAr: "3 أيام تصوير في مرفأ البحرين المالي والمناطق الصناعية", quantity: 3.0, unitPrice: 1800.0, lineTotal: 5400.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "Multilingual Voiceover Sync & HDR Master Grading", descriptionAr: "مزامنة التعليق الصوتي متعدد اللغات والتلوين السينمائي", quantity: 1.0, unitPrice: 3000.0, lineTotal: 3000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-016",
      invoiceNumber: "ISH-2026-016",
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
      invoiceNumber: "ISH-2026-017",
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
      notesEn: "Full settlement for Mumtalakat holding portfolio highlights.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Sovereign Portfolio Commercial Cinematography", descriptionAr: "تصوير سينمائي لمشاريع المحفظة الاستثمارية", quantity: 1.0, unitPrice: 4200.0, lineTotal: 4200.0, displayOrder: 1 },
        { serviceId: "srv-08", descriptionEn: "DaVinci Color Grade & Broadcast Titles", descriptionAr: "تلوين دافينشي وعناوين إخراج احترافية", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-018",
      invoiceNumber: "ISH-2026-018",
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
      invoiceNumber: "ISH-2026-019",
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
      notesEn: "Initial mobilization deposit invoice for Gulf Air Summer Destination series.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "International Filming Crew & Equipment Logistics", descriptionAr: "طاقم التصوير الدولي واللوجستيات والمعدات", quantity: 1.0, unitPrice: 10500.0, lineTotal: 10500.0, displayOrder: 1 },
        { serviceId: "srv-01", descriptionEn: "Aircraft Cabin Interior Cinematography", descriptionAr: "تصوير سينمائي لمقصورات الطائرة والمقاعد الفاخرة", quantity: 2.0, unitPrice: 4000.0, lineTotal: 8000.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-020",
      invoiceNumber: "ISH-2026-020",
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
      notesEn: "Phase 1 advance for EDB Global Cinema campaign.",
      lineItems: [
        { serviceId: "srv-11", descriptionEn: "Treatment, Scripting & Creative Pitch Deck", descriptionAr: "المعالجة الإبداعية والسيناريو والعرض التقديمي", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 1 },
        { serviceId: "srv-01", descriptionEn: "Bahrain World Trade Center Helicopter & Drone Filming", descriptionAr: "تصوير جوي سينمائي لمركز التجارة العالمي بالمنامة", quantity: 1.0, unitPrice: 3400.0, lineTotal: 3400.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-021",
      invoiceNumber: "ISH-2026-021",
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
      notesEn: "Phase 1 production advance for Beyon Money app campaign.",
      lineItems: [
        { serviceId: "srv-02", descriptionEn: "High-Energy Commercial Studio Shoot (2 Days)", descriptionAr: "تصوير إعلاني عالي الحيوية في الاستوديو (يومان)", quantity: 2.0, unitPrice: 2400.0, lineTotal: 4800.0, displayOrder: 1 },
        { serviceId: "srv-07", descriptionEn: "Offline Edit & Visual Rhythm Cut", descriptionAr: "مونتاج متسارع ومؤثرات حركية", quantity: 1.0, unitPrice: 2500.0, lineTotal: 2500.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-022",
      invoiceNumber: "ISH-2026-022",
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
      notesAr: "تم استلام 50% دفعة أولى عن تصوير أصول ممتلكات الصناعية.",
      lineItems: [
        { serviceId: "srv-01", descriptionEn: "Sovereign Industrial Assets Cinematography (3 Days)", descriptionAr: "تصوير أصول ممتلكات الصناعية (3 أيام)", quantity: 3.0, unitPrice: 2200.0, lineTotal: 6600.0, displayOrder: 1 },
        { serviceId: "srv-03", descriptionEn: "Drone Cinema Inspection Footage & 8K Delivery", descriptionAr: "تصوير درون سينمائي بدقة 8K ومسح للمواقع", quantity: 2.0, unitPrice: 2100.0, lineTotal: 4200.0, displayOrder: 2 },
      ],
    },
    {
      id: "inv-023",
      invoiceNumber: "ISH-2026-023",
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
      invoiceNumber: "ISH-2026-024",
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
      invoiceNumber: "ISH-2026-025",
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
      notesEn: "Draft invoice for Impact BBDO joint agency bid deliverables.",
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
      receiptNumber: "RCT-2026-001",
      paymentDate: new Date("2026-08-25"),
      amount: 9800.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-NBB-8492019",
      notes: "Full payment cleared via National Bank of Bahrain corporate wire.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-002",
      invoiceId: "inv-002",
      receiptNumber: "RCT-2026-002",
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
      receiptNumber: "RCT-2026-003",
      paymentDate: new Date("2026-08-15"),
      amount: 5200.0,
      currency: "BHD",
      paymentMethod: "card",
      referenceNumber: "AUTH-AMEX-99201",
      notes: "Paid in full via Four Seasons Corporate AMEX card.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-004",
      invoiceId: "inv-005",
      receiptNumber: "RCT-2026-004",
      paymentDate: new Date("2026-07-05"),
      amount: 3400.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-HSBC-481920",
      notes: "Direct wire settlement from Royal Golf Club account.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-005",
      invoiceId: "inv-006",
      receiptNumber: "RCT-2026-005",
      paymentDate: new Date("2026-09-18"),
      amount: 6000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-AUB-882194",
      notes: "Zain Bahrain 50% mobilization advance.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-006",
      invoiceId: "inv-007",
      receiptNumber: "RCT-2026-006",
      paymentDate: new Date("2026-09-02"),
      amount: 7800.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-NBB-992100",
      notes: "National Bank of Bahrain full project settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-007",
      invoiceId: "inv-010",
      receiptNumber: "RCT-2026-007",
      paymentDate: new Date("2026-08-05"),
      amount: 6200.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-BISB-109281",
      notes: "stc Bahrain fiber commercial full settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-008",
      invoiceId: "inv-011",
      receiptNumber: "RCT-2026-008",
      paymentDate: new Date("2026-09-08"),
      amount: 4750.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-NBB-772189",
      notes: "50% advance for BIC WEC championship promo.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-009",
      invoiceId: "inv-013",
      receiptNumber: "RCT-2026-009",
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
      receiptNumber: "RCT-2026-010",
      paymentDate: new Date("2026-09-12"),
      amount: 2900.0,
      currency: "BHD",
      paymentMethod: "cheque",
      referenceNumber: "CHQ-BBK-001928",
      notes: "Zayani Motors manager corporate cheque cleared.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-011",
      invoiceId: "inv-016",
      receiptNumber: "RCT-2026-011",
      paymentDate: new Date("2026-09-12"),
      amount: 5000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-BAPCO-9921",
      notes: "Bapco Energies 1st mobilization disbursement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-012",
      invoiceId: "inv-016",
      receiptNumber: "RCT-2026-012",
      paymentDate: new Date("2026-09-20"),
      amount: 5000.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-BAPCO-9988",
      notes: "Bapco Energies 2nd progress installment.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-013",
      invoiceId: "inv-017",
      receiptNumber: "RCT-2026-013",
      paymentDate: new Date("2026-08-30"),
      amount: 6700.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-MUMT-4910",
      notes: "Mumtalakat holding full settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-014",
      invoiceId: "inv-020",
      receiptNumber: "RCT-2026-014",
      paymentDate: new Date("2026-07-25"),
      amount: 5900.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-EDB-29108",
      notes: "Bahrain EDB advance payment cleared.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-015",
      invoiceId: "inv-021",
      receiptNumber: "RCT-2026-015",
      paymentDate: new Date("2026-06-25"),
      amount: 7300.0,
      currency: "BHD",
      paymentMethod: "online",
      referenceNumber: "BENEFIT-PAY-88210",
      notes: "Beyon Money phase 1 settlement.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-016",
      invoiceId: "inv-022",
      receiptNumber: "RCT-2026-016",
      paymentDate: new Date("2026-09-10"),
      amount: 5400.0,
      currency: "BHD",
      paymentMethod: "bank_transfer",
      referenceNumber: "TRF-MUMT-5520",
      notes: "Mumtalakat industrial asset shoot 50% advance.",
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: "pay-017",
      invoiceId: "inv-001",
      receiptNumber: "RCT-2026-017",
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
    { id: "expcat-01", slug: "gear_rental", nameEn: "Equipment & Gear Rentals", nameAr: "استئجار معدات وكاميرات", color: "#09937F", displayOrder: 1 },
    { id: "expcat-02", slug: "crew_wages", nameEn: "Crew & Talent Wages", nameAr: "أجور الطواقم والممثلين", color: "#3B82F6", displayOrder: 2 },
    { id: "expcat-03", slug: "travel_logistics", nameEn: "Travel & Location Logistics", nameAr: "سفر ونقل وإعاشة", color: "#F59E0B", displayOrder: 3 },
    { id: "expcat-04", slug: "studio_overhead", nameEn: "Studio Lease & Utilities", nameAr: "إيجار ومصاريف الاستوديو", color: "#8B5CF6", displayOrder: 4 },
    { id: "expcat-05", slug: "software_licenses", nameEn: "Software, Storage & Cloud", nameAr: "برمجيات واشتراكات وسحابة", color: "#EC4899", displayOrder: 5 },
    { id: "expcat-06", slug: "marketing_pr", nameEn: "Marketing & Festival Submissions", nameAr: "تسويق ومشاركات مهرجانات", color: "#10B981", displayOrder: 6 },
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
    { id: "exp-03", categoryId: "expcat-04", descriptionEn: "Monthly Soundstage A Facility Lease & Electricity", descriptionAr: "إيجار استوديو أ ومصاريف الكهرباء الشهرية", amount: 1250.0, currency: "BHD", expenseDate: new Date("2026-09-01"), vendorName: "Seef Commercial Real Estate", isRecurring: true, recurrenceInterval: "monthly", createdById: createdUsers.finance_manager?.id },
    { id: "exp-04", categoryId: "expcat-05", descriptionEn: "DaVinci Resolve Studio Cloud & LucidLink 10TB Cinema Cloud", descriptionAr: "اشتراك سحابة دافينشي ومساحة تخزين لوسيد لينك 10 تيرابايت", amount: 280.0, currency: "BHD", expenseDate: new Date("2026-09-03"), vendorName: "LucidLink Inc / Blackmagic Cloud", isRecurring: true, recurrenceInterval: "monthly", createdById: createdUsers.editor?.id },
    { id: "exp-05", categoryId: "expcat-02", dealId: "deal-01", descriptionEn: "Principal Cast Actors & Talent Agency Retainers", descriptionAr: "أجور الممثلين الرئيسيين ورسوم وكالة المواهب", amount: 1800.0, currency: "BHD", expenseDate: new Date("2026-09-15"), vendorName: "Bahrain Talent Casting", createdById: createdUsers.producer?.id },
    { id: "exp-06", categoryId: "expcat-03", dealId: "deal-01", descriptionEn: "Production Catering & Craft Services (4 Shoot Days)", descriptionAr: "خدمات الضيافة والإعاشة لطاقم التصوير لـ 4 أيام", amount: 650.0, currency: "BHD", expenseDate: new Date("2026-09-18"), vendorName: "Manama Gourmet Catering", createdById: createdUsers.producer?.id },
    { id: "exp-07", categoryId: "expcat-01", dealId: "deal-03", descriptionEn: "ARRI Master Grips & Wireless Follow Focus Unit Rental", descriptionAr: "استئجار أجهزة تحكم بالعدسات لاسلكية من آرّي", amount: 480.0, currency: "BHD", expenseDate: new Date("2026-09-20"), vendorName: "Gulf Camera Gear Rentals", createdById: createdUsers.production_manager?.id },
    { id: "exp-08", categoryId: "expcat-06", descriptionEn: "Cannes Corporate Media & TV Awards Submission Fees", descriptionAr: "رسوم التقديم في مهرجان كان لجوائز الأفلام الإعلانية والمؤسسية", amount: 350.0, currency: "BHD", expenseDate: new Date("2026-08-28"), vendorName: "Cannes Corporate Media Festival", createdById: createdUsers.super_admin?.id },
    { id: "exp-09", categoryId: "expcat-05", descriptionEn: "Annual Adobe Creative Cloud Enterprise Suite (10 Seats)", descriptionAr: "اشتراك باقة أدوبي كرييتف كلاود للشركات (10 مستخدمين)", amount: 890.0, currency: "BHD", expenseDate: new Date("2026-07-01"), vendorName: "Adobe Systems Direct", isRecurring: true, recurrenceInterval: "yearly", createdById: createdUsers.finance_manager?.id },
    { id: "exp-10", categoryId: "expcat-02", dealId: "deal-08", descriptionEn: "High-Speed FPV Drone Pilot Day Rate & Insurance", descriptionAr: "أجر طيار درون FPV السريع ورسوم التأمين", amount: 450.0, currency: "BHD", expenseDate: new Date("2026-09-14"), vendorName: "AeroMotion FPV Pilots", createdById: createdUsers.production_manager?.id },
  ];

  for (const e of expenses) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: e,
      create: e,
    });
  }
  console.log("✅ Seeded 10 Production & Studio Operating Expenses");

  // ==========================================
  // 7. CALENDAR EVENTS & PRODUCTION SCHEDULE
  // ==========================================
  const calendarEvents = [
    {
      id: "event-01",
      title: "Batelco 5G Cinema Shoot — Day 1 (Seef District)",
      titleAr: "تصوير إعلان بتلكو — اليوم الأول (ضاحية السيف)",
      description: "Principal photography with RED 8K and anamorphic glass. Call time 05:30 AM.",
      startDate: new Date("2026-10-05T05:30:00Z"),
      endDate: new Date("2026-10-05T18:00:00Z"),
      allDay: false,
      location: "Seef District, Manama",
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-01",
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: "event-02",
      title: "Batelco 5G Cinema Shoot — Day 2 (Bahrain Bay)",
      titleAr: "تصوير إعلان بتلكو — اليوم الثاني (خليج البحرين)",
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
      title: "Gulf Air Summer Series — Creative Pitch Meeting",
      titleAr: "اجتماع تقديم العرض الإبداعي لطيران الخليج",
      description: "Presentation of 3 storyboard directions to Gulf Air executive board.",
      startDate: new Date("2026-09-28T10:00:00Z"),
      endDate: new Date("2026-09-28T11:30:00Z"),
      allDay: false,
      location: "Gulf Air HQ, Muharraq / Hybrid Zoom",
      color: "#3B82F6",
      eventType: "meeting",
      dealId: "deal-02",
      createdById: createdUsers.super_admin?.id,
    },
    {
      id: "event-04",
      title: "Zayani Motors Master Delivery Deadline",
      titleAr: "الموعد النهائي لتسليم ماستر إعلان الزياني",
      description: "Final 4K master ProRes delivery to broadcast TV networks.",
      startDate: new Date("2026-09-30T17:00:00Z"),
      endDate: new Date("2026-09-30T18:00:00Z"),
      allDay: false,
      location: "ishoot Soundstage Suite",
      color: "#E11D48",
      eventType: "deadline",
      dealId: "deal-04",
      createdById: createdUsers.editor?.id,
    },
    {
      id: "event-05",
      title: "BIC Grand Prix Teaser — Night Chase Filming",
      titleAr: "تصوير ليلي لمطاردات إعلان سباق الفورمولا 1",
      description: "Night shoot under high-output circuit floodlights with tracking vehicle.",
      startDate: new Date("2026-10-12T18:00:00Z"),
      endDate: new Date("2026-10-13T04:00:00Z"),
      allDay: false,
      location: "Bahrain International Circuit, Sakhir",
      color: "#09937F",
      eventType: "shoot",
      dealId: "deal-03",
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: "event-06",
      title: "Zain Esports Commercial — Studio Day (Stage A)",
      titleAr: "تصوير إعلان زين للألعاب الإلكترونية في استوديو أ",
      description: "Actors in LED volumetric lighting and gaming rigs.",
      startDate: new Date("2026-10-08T08:00:00Z"),
      endDate: new Date("2026-10-08T20:00:00Z"),
      allDay: false,
      location: "ishoot Stage A, Manama",
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
      companyName: "Labour Fund (Tamkeen)",
      serviceType: "Documentary Production & Talent Interviews",
      budgetRange: "8,000 – 15,000 BHD",
      timeline: "October 2026",
      message: "طلب إنتاج سلسلة مقابلات وثائقية ملهمة لرواد الأعمال البحرينيين.",
      status: "contacted",
      intent: "service_request",
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
      intent: "service_request",
      team: "production",
      workflowStatus: "confirmed",
      assignedToId: createdUsers.production_manager?.id,
      confirmedById: createdUsers.super_admin?.id,
      confirmedAt: new Date(),
      locale: "en",
    },
    {
      id: "inq-05",
      name: "طارق المؤيد",
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
      companyName: "Bahrain Tourism & Exhibitions Authority",
      serviceType: "Additional Sound Design Stems",
      budgetRange: "1,000 BHD",
      timeline: "This Week",
      message: "طلب تزويدنا بالتسجيلات الصوتية المنفصلة (Stems) وموسيقى الخلفية لحملة موسم الصيف.",
      status: "qualified",
      intent: "service_request",
      team: "post_production",
      workflowStatus: "resolved",
      assignedToId: createdUsers.editor?.id,
      resolutionNotes: "تم تصدير الحزم الصوتية كاملة ورفعها على سحابة العميل",
      resolvedAt: new Date(),
      locale: "ar",
    },
  ];

  for (const inq of inquiries) {
    await prisma.inquiry.upsert({
      where: { id: inq.id },
      update: inq,
      create: inq,
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
      title: "BAPCO Energies Brand Film 2026 - Production Kickoff & Safety Brief",
      titleAr: "فيلم بابكو إنرجيز المؤسسي 2026 - اجتماع إطلاق الإنتاج وإرشادات السلامة",
      meetingDate: new Date("2026-02-15"),
      startTime: "10:00 AM",
      endTime: "11:45 AM",
      location: "ishoot Studio Stage A & Virtual Boardroom",
      dealId: "deal-02",
      clientId: "contact-02",
      attendees: [
        { name: "Sayed Ahmed Husain", role: "Executive Producer", email: "sayed@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Ali Al Samahiji", role: "Production Manager", email: "production@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Fatima Al Kaabi", role: "Senior Editor & DIT", email: "editor@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Reem Al Hashimi", role: "Corporate Comms Lead", email: "reem@bapcoenergies.com", organization: "BAPCO Energies", attended: true },
        { name: "Hassan Kanoo", role: "HSE Director", email: "hassan.k@bapcoenergies.com", organization: "BAPCO Energies", attended: true },
      ],
      agenda: "1. Refinery filming safety permits & PPE certification.\n2. Technical camera package review (RED V-Raptor 8K + Master Primes).\n3. Talent casting schedule & offshore helicopter unit timing.\n4. Post-production timeline and delivery cutoffs.",
      discussionPoints: [
        { topic: "Safety Clearances", notes: "BAPCO HSE team approved the ATEX-rated monitor housings and required on-site safety induction for all 14 crew members on day one.", speaker: "Hassan Kanoo" },
        { topic: "Aerial Helicopter Unit", notes: "Helicopter Cineflex gimbal approved for offshore refinery sweep shots. Flight window confirmed for 06:00 to 08:30 on March 2nd.", speaker: "Ali Al Samahiji" },
        { topic: "Sound & Voiceover", notes: "Bilingual voiceover recorded in both English (UK neutral) and Arabic (Gulf refined). Client provided updated brand manifesto script.", speaker: "Reem Al Hashimi" },
      ],
      actionItems: [
        { task: "Submit full crew passport & CPR copies for refinery security badges", assignee: "Husain Al Jamri", dueDate: "2026-02-18", status: "completed" },
        { task: "Prepare camera prep report and sensor calibration at studio", assignee: "Ali Al Samahiji", dueDate: "2026-02-22", status: "completed" },
        { task: "Share preliminary 3D previz for offshore tank sequence", assignee: "Fatima Al Kaabi", dueDate: "2026-02-25", status: "in_progress" },
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
      signatureUrl: "/brand/signatures/sayed-ahmed.svg",
    },
    {
      id: "mom-002",
      momNumber: "MOM-2026-002",
      title: "Batelco 5G Launch Campaign - Post-Production Review & VFX Alignment",
      titleAr: "حملة بتلكو 5G - اجتماع مراجعة المونتاج ومؤثرات الجرافيكس",
      meetingDate: new Date("2026-03-05"),
      startTime: "02:00 PM",
      endTime: "03:30 PM",
      location: "Batelco Innovation Lab, Hamala",
      dealId: "deal-01",
      clientId: "contact-01",
      attendees: [
        { name: "Mohamed Al Mahdi", role: "Creative Director", email: "director@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Fatima Al Kaabi", role: "Post-Production Supervisor", email: "editor@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Nasser Al Khalifa", role: "Brand Marketing GM", email: "nasser@batelco.com.bh", organization: "Batelco", attended: true },
      ],
      agenda: "1. Review Rough Cut V2 of 60s TV Commercial.\n2. CGI holographic UI elements timing & integration.\n3. Music licensing & custom sound design soundscape.",
      discussionPoints: [
        { topic: "Edit Pacing", notes: "Client commended the high-energy transitions between Manama skyline and modern fiber connectivity nodes.", speaker: "Nasser Al Khalifa" },
        { topic: "Color Tone", notes: "Enhanced cyan and emerald highlights to preserve Batelco new identity vibrance.", speaker: "Fatima Al Kaabi" },
      ],
      actionItems: [
        { task: "Incorporate localized Arabic calligraphy end-frame title", assignee: "Fatima Al Kaabi", dueDate: "2026-03-08", status: "completed" },
        { task: "Export broadcast-spec MXF files for Bahrain TV transmission", assignee: "Fatima Al Kaabi", dueDate: "2026-03-10", status: "pending" },
      ],
      decisions: [
        "Approved 60s main commercial cut without further story edits.",
        "Commissioned 15s cutdowns for TikTok, Instagram Reels, and YouTube bumper ads."
      ],
      status: "approved",
      createdById: createdUsers.production_manager?.id,
      approvedById: createdUsers.admin?.id,
      signatureUrl: "/brand/signatures/mohamed-almahdi.svg",
    },
    {
      id: "mom-003",
      momNumber: "MOM-2026-003",
      title: "Q2 Studio Equipment Expansion & Virtual Production Capabilities",
      titleAr: "خطة توسعة معدات الاستوديو للربع الثاني وتقنيات الإنتاج الافتراضي",
      meetingDate: new Date("2026-03-20"),
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      location: "ishoot Manama Headquarters",
      attendees: [
        { name: "Sayed Ahmed Husain", role: "CEO", email: "sayed@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Zainab Al Shami", role: "Finance Manager", email: "finance@ishoot.bh", organization: "iShoot", attended: true },
        { name: "Ali Al Samahiji", role: "Production Manager", email: "production@ishoot.bh", organization: "iShoot", attended: true },
      ],
      agenda: "1. CapEx evaluation for LED virtual production volume backdrop.\n2. Lens fleet expansion: Cook Full Frame Plus.\n3. Q2 resource scheduling and staff certifications.",
      discussionPoints: [
        { topic: "Virtual Production ROI", notes: "Demand for car commercial virtual staging has increased by 40%. Stage B LED wall conversion will pay back in 9 months.", speaker: "Sayed Ahmed Husain" },
        { topic: "Budget Allocation", notes: "Financing package secured with local bank at preferential tier.", speaker: "Zainab Al Shami" },
      ],
      actionItems: [
        { task: "Finalize vendor RFQ for 2.6mm pitch LED display panels", assignee: "Ali Al Samahiji", dueDate: "2026-04-01", status: "in_progress" },
        { task: "Prepare CapEx depreciation and tax amortisation schedule", assignee: "Zainab Al Shami", dueDate: "2026-04-05", status: "in_progress" },
      ],
      decisions: [
        "Proceed with Phase 1 virtual production design.",
        "Authorize procurement of Cooke FF Anamorphic set."
      ],
      status: "in_review",
      createdById: createdUsers.super_admin?.id,
      signatureUrl: "/brand/signatures/sayed-ahmed.svg",
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
        details: { invoiceNumber: "ISH-2026-001", amount: 9800.0, client: "BTEA" },
        ipAddress: "185.120.45.14",
      },
      {
        userId: createdUsers.producer.id,
        action: "stage_change",
        entityType: "deal",
        entityId: "deal-01",
        details: { dealTitle: "Batelco 5G Launch", from: "contract_signed", to: "production" },
        ipAddress: "89.148.33.20",
      },
      {
        userId: createdUsers.finance_manager.id,
        action: "create",
        entityType: "payment",
        entityId: "pay-001",
        details: { receiptNumber: "RCT-2026-001", amount: 9800.0, method: "bank_transfer" },
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
        message: "تم استلام دفعة مسجلة بقيمة 6,000 د.ب من شركة زين البحرين (إيصال RCT-2026-005).",
        type: "success",
        entityType: "payment",
        entityId: "pay-005",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: "تذكير موعد تصوير سينمائي",
        message: "جلسة تصوير الحملة الإعلانية لشركة بتلكو مجدولة في تقويم الإنتاج غداً.",
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
        message: "الفاتورة رقم ISH-2026-009 لشركة الزياني تجاوزت موعد الاستحقاق (4,500 د.ب).",
        type: "warning",
        entityType: "invoice",
        entityId: "inv-009",
        isRead: false,
      },
      {
        userId: createdUsers.super_admin.id,
        title: "مرحباً بك في نظام آي شوت المتكامل",
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
      fileName: "Master-Service-Agreement-Batelco-2026.pdf",
      fileUrl: "/documents/vault/Master-Service-Agreement-Batelco-2026.pdf",
      fileSize: 2450000,
      mimeType: "application/pdf",
      entityType: "contact",
      entityId: "contact-01",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Commercial-Shoot-Permit-BIC-F1.pdf",
      fileUrl: "/documents/vault/Commercial-Shoot-Permit-BIC-F1.pdf",
      fileSize: 1200000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-01",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Al-Zayani-Motors-Brand-Guidelines.pdf",
      fileUrl: "/documents/vault/Al-Zayani-Motors-Brand-Guidelines.pdf",
      fileSize: 4800000,
      mimeType: "application/pdf",
      entityType: "contact",
      entityId: "contact-02",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Invoice-ISH-2026-001-Signed.pdf",
      fileUrl: "/documents/vault/Invoice-ISH-2026-001-Signed.pdf",
      fileSize: 850000,
      mimeType: "application/pdf",
      entityType: "invoice",
      entityId: "inv-001",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Four-Seasons-Location-Release-Form.pdf",
      fileUrl: "/documents/vault/Four-Seasons-Location-Release-Form.pdf",
      fileSize: 640000,
      mimeType: "application/pdf",
      entityType: "customer_vault",
      entityId: "contact-11",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Mumtalakat-Annual-Investor-Moodboard.pdf",
      fileUrl: "/documents/vault/Mumtalakat-Annual-Investor-Moodboard.pdf",
      fileSize: 7200000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-03",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "BAPCO-Energies-NDA-Signed.pdf",
      fileUrl: "/documents/vault/BAPCO-Energies-NDA-Signed.pdf",
      fileSize: 1540000,
      mimeType: "application/pdf",
      entityType: "customer_vault",
      entityId: "contact-04",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "stc-5G-Commercial-Storyboard-v3.pdf",
      fileUrl: "/documents/vault/stc-5G-Commercial-Storyboard-v3.pdf",
      fileSize: 12400000,
      mimeType: "application/pdf",
      entityType: "deal",
      entityId: "deal-05",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Ministry-Information-Drone-Flight-Authorization.pdf",
      fileUrl: "/documents/vault/Ministry-Information-Drone-Flight-Authorization.pdf",
      fileSize: 3100000,
      mimeType: "application/pdf",
      entityType: "general",
      entityId: "permits-2026",
      uploadedById: createdUsers.super_admin.id,
    },
    {
      fileName: "Invoice-ISH-2026-004-Receipt-Stamped.pdf",
      fileUrl: "/documents/vault/Invoice-ISH-2026-004-Receipt-Stamped.pdf",
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
    where: { id: companySettingId },
    data: {
      ceoNameEn: "Sayed Ahmed Husain",
      ceoNameAr: "سيد أحمد حسين",
      ceoTitleEn: "Founder & Creative Director",
      ceoTitleAr: "المؤسس والمدير الإبداعي",
      ceoQuoteEn: "We don't merely capture light; we shape the way memories, emotions, and brands resonate through time.",
      ceoQuoteAr: "نحن لا نلتقط الضوء فحسب، بل نصوغ الذكريات والمشاعر لترسخ في الأذهان عبر الزمن.",
      missionEn: "Empower market leaders to tell their brand narratives with uncompromised visual precision and emotional depth.",
      missionAr: "تمكين رواد السوق من سرد قصص علاماتهم التجارية بدقة بصرية متناهية وعمق عاطفي.",
      visionEn: "To be the premier commercial cinema production destination in Bahrain and the Arabian Gulf.",
      visionAr: "أن نكون الوجهة الأولى للإنتاج السينمائي التجاري في البحرين والخليج العربي.",
      aboutTextEn: "Founded in the Kingdom of Bahrain, ishoot is a premier creative media production house uniting cinematic storytelling with engineering precision. We believe that true visual impact is created at the intersection of technical discipline and unconstrained creative curiosity.",
      aboutTextAr: "تأسست دار آي شوت في مملكة البحرين كدار إنتاج سينمائي إبداعية رائدة تجمع بين القصص السينمائية والدقة الهندسية. نؤمن بأن التأثير البصري الحقيقي ينبع من تقاطع الانضباط التقني والفضول الإبداعي اللامحدود.",
    },
  });

  const systemRoles = [
    { id: "super_admin", nameEn: "Super Administrator", nameAr: "مسؤول النظام العام", isSystem: true },
    { id: "admin", nameEn: "System Administrator", nameAr: "مدير النظام", isSystem: true },
    { id: "finance_manager", nameEn: "Finance Manager", nameAr: "المدير المالي", isSystem: true },
    { id: "production_manager", nameEn: "Production Manager", nameAr: "مدير الإنتاج", isSystem: true },
    { id: "sales", nameEn: "Commercial Sales Director", nameAr: "مدير المبيعات التجارية", isSystem: true },
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

  const features = [
    { moduleKey: "crm_deals", nameEn: "Deals & Pipeline", nameAr: "الصفقات ومسارات البيع" },
    { moduleKey: "invoicing", nameEn: "Invoicing & Billing", nameAr: "الفواتير والتحصيل" },
    { moduleKey: "calendar", nameEn: "Shoot Calendar", nameAr: "جدول التصوير" },
    { moduleKey: "equipment", nameEn: "Gear Inventory", nameAr: "خزانة المعدات" },
    { moduleKey: "cms", nameEn: "Content Management", nameAr: "إدارة محتوى الموقع" },
    { moduleKey: "reviews", nameEn: "Customer Reviews", nameAr: "تقييمات العملاء" },
  ];

  for (const feature of features) {
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
    { value: "10+", labelEn: "Years of Industry Excellence", labelAr: "سنوات من التميز الإبداعي", subLabelEn: "Headquartered in Manama, Seef", subLabelAr: "المقر الرئيسي ضاحية السيف، المنامة", icon: "Award", sortOrder: 4 },
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
      companyEn: "National Bank of Bahrain (NBB)",
      companyAr: "بنك البحرين الوطني",
      quoteEn: "iShoot delivered an exceptional TV commercial campaign that exceeded our highest cinematic expectations. Their color grading and drone shots were world-class.",
      quoteAr: "قدمت آي شوت حملة إعلانية سينمائية استثنائية فاقت توقعاتنا. كانت الألوان والتصوير الجوي بمستوى عالمي رائع.",
      year: "2026",
      rating: 5,
      isApproved: true,
      sortOrder: 1,
    },
    {
      authorEn: "Corporate Communications Lead",
      authorAr: "رئيس الاتصال المؤسسي",
      companyEn: "Zain Bahrain",
      companyAr: "زين البحرين",
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

  console.log("✨ Massive database seed completed successfully with verified financial data, vault attachments, and headless CMS records!");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
