import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient } from './generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for ishoot...');

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  // 1. All 8 User Roles (Odoo-grade RBAC)
  const usersData = [
    {
      email: 'admin@ishoot.bh',
      fullName: 'سيد أحمد حسين',
      role: 'super_admin',
      department: 'executive',
      phone: '+973 3900 1100',
    },
    {
      email: 'director@ishoot.bh',
      fullName: 'محمد المهدي',
      role: 'admin',
      department: 'executive',
      phone: '+973 3900 2200',
    },
    {
      email: 'finance@ishoot.bh',
      fullName: 'زينب الشامي',
      role: 'finance_manager',
      department: 'finance',
      phone: '+973 3900 3300',
    },
    {
      email: 'production@ishoot.bh',
      fullName: 'علي السماهيجي',
      role: 'production_manager',
      department: 'production',
      phone: '+973 3900 4400',
    },
    {
      email: 'producer@ishoot.bh',
      fullName: 'حسين الجمري',
      role: 'producer',
      department: 'production',
      phone: '+973 3900 5500',
    },
    {
      email: 'editor@ishoot.bh',
      fullName: 'فاطمة الكعبي',
      role: 'editor',
      department: 'post_production',
      phone: '+973 3900 6600',
    },
    {
      email: 'accountant@ishoot.bh',
      fullName: 'جاسم المطوع',
      role: 'accountant',
      department: 'finance',
      phone: '+973 3900 7700',
    },
    {
      email: 'guest@ishoot.bh',
      fullName: 'مراقب عام (Guest)',
      role: 'viewer',
      department: 'operations',
      phone: '+973 3900 8800',
    },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, fullName: u.fullName, department: u.department, phone: u.phone },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        role: u.role,
        department: u.department,
        phone: u.phone,
        isActive: true,
      },
    });
    createdUsers[u.role] = user;
  }
  console.log('✅ Created 8 RBAC Users (Password: Admin123!)');

  // 2. Company Settings
  const companySettingId = '00000000-0000-0000-0000-000000000001';
  await prisma.companySetting.upsert({
    where: { id: companySettingId },
    update: {},
    create: {
      id: companySettingId,
      companyNameEn: 'ishoot Cinema Production S.P.C.',
      companyNameAr: 'دار آي شوت للإنتاج السينمائي ذ.م.م',
      crNumber: 'CR-142859-1',
      vatId: '200019283700002',
      vatEnabled: false, // Default non-VAT, toggleable to 10%
      vatPercentage: 10.00,
      defaultCurrency: 'BHD',
      currencyDecimals: 3,
      addressEn: 'Office 402, Platinum Tower, Seef District, Manama, Kingdom of Bahrain',
      addressAr: 'مكتب ٤٠٢، برج بلاتينيوم، ضاحية السيف، المنامة، مملكة البحرين',
      phone: '+973 1700 0000',
      email: 'hello@ishoot.bh',
      website: 'https://ishoot.bh',
      bankName: 'National Bank of Bahrain (NBB)',
      bankIban: 'BH29NBOB00000012345678',
      bankAccountNumber: '0012345678',
      bankSwift: 'NBOBBHBM',
      logoUrl: '/images/logo-color.svg',
      paymentTermsDays: 30,
      invoicePrefix: 'ISH',
      invoiceNextNumber: 104,
      receiptPrefix: 'RCT',
      receiptNextNumber: 106,
    },
  });
  console.log('✅ Created Company & Tax Settings');

  // 3. Hero Banners
  const banners = [
    {
      id: 'banner-01',
      titleEn: 'CINEMA IN EVERY FRAME.',
      titleAr: 'سينما في كل إطار.',
      subtitleEn: 'High-end commercial cinematography, aerial drone capture, and creative studio productions based in Bahrain.',
      subtitleAr: 'تصوير سينمائي إعلاني، وتصوير جوي سينمائي، وتصحيح ألوان متقدم في مملكة البحرين.',
      mediaType: 'image',
      mediaUrl: '/banners/Youtube cover 01.jpg',
      posterUrl: '/banners/Youtube cover 01.jpg',
      displayOrder: 1,
      isActive: true,
      ctaLabelEn: 'Explore Works',
      ctaLabelAr: 'استكشف الأعمال',
      ctaLink: '/works',
    },
    {
      id: 'banner-02',
      titleEn: 'PRECISION CINEMATOGRAPHY',
      titleAr: 'دقة بصرية سينمائية متناهية',
      subtitleEn: 'Equipped with RED V-Raptor 8K and ARRI optical primes for prestigious brand anthems.',
      subtitleAr: 'مجهزون بأحدث كاميرات ريد في-رابتور ٨ كي وعدسات آرّي للعلامات التجارية الرائدة.',
      mediaType: 'image',
      mediaUrl: '/banners/Web Banner 04.jpg',
      posterUrl: '/banners/Web Banner 04.jpg',
      displayOrder: 2,
      isActive: true,
      ctaLabelEn: 'Our Gear Locker',
      ctaLabelAr: 'خزانة المعدات',
      ctaLink: '/about',
    },
    {
      id: 'banner-03',
      titleEn: 'LICENSED AERIAL & FPV',
      titleAr: 'تصوير جوي مرخص وتقنيات FPV',
      subtitleEn: 'Capturing dynamic perspectives across the Arabian Gulf with heavy-lift cinema drones.',
      subtitleAr: 'نلتقط زوايا جوية مذهلة في سماء الخليج العربي بطائرات الدرون السينمائية.',
      mediaType: 'image',
      mediaUrl: '/banners/web banner 02.jpg',
      posterUrl: '/banners/web banner 02.jpg',
      displayOrder: 3,
      isActive: true,
      ctaLabelEn: 'Start a Project',
      ctaLabelAr: 'ابدأ مشروعك',
      ctaLink: '/contact',
    },
  ];

  for (const b of banners) {
    await prisma.heroBanner.upsert({
      where: { id: b.id },
      update: b,
      create: b,
    });
  }
  console.log('✅ Created 3 Hero Banners');

  // 4. Portfolio Categories
  const categories = [
    { id: 'cat-01', slug: 'commercial', nameEn: 'Commercials', nameAr: 'إعلانات تجارية', displayOrder: 1 },
    { id: 'cat-02', slug: 'aerial', nameEn: 'Aerial & FPV', nameAr: 'تصوير جوي و FPV', displayOrder: 2 },
    { id: 'cat-03', slug: 'documentary', nameEn: 'Documentaries', nameAr: 'أفلام وثائقية', displayOrder: 3 },
    { id: 'cat-04', slug: 'photography', nameEn: 'Photography', nameAr: 'تصوير فوتوغرافي', displayOrder: 4 },
    { id: 'cat-05', slug: 'color', nameEn: 'Color Grading', nameAr: 'تصحيح ألوان', displayOrder: 5 },
    { id: 'cat-06', slug: 'studio', nameEn: 'Soundstage', nameAr: 'إنتاج الاستوديو', displayOrder: 6 },
  ];

  for (const c of categories) {
    await prisma.portfolioCategory.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log('✅ Created 6 Portfolio Categories');

  // 5. Portfolio Items
  const portfolioItems = [
    {
      id: 'work-01',
      categoryId: 'cat-01',
      slug: 'batelco-national-day-anthem',
      titleEn: 'Batelco — National Day Cinema Anthem',
      titleAr: 'بتلكو — فيلم اليوم الوطني السينمائي',
      clientName: 'Batelco Telecommunications',
      year: 2025,
      aspectRatio: '2.39:1',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518135714426-c18f5ffb6f4d?auto=format&fit=crop&w=1200&q=80',
      previewVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4',
      fullVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematographer-filming-a-scene-40893-large.mp4',
      galleryUrls: [
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=800&q=80',
      ],
      descriptionEn: 'A high-impact cinematic commercial capturing the heritage and technological future of Bahrain across 6 iconic locations.',
      descriptionAr: 'عمل سينمائي فخم يوثق أصالة وتطور مملكة البحرين عبر ٦ مواقع تاريخية وحديثة.',
      credits: {
        director: 'Sayed Ahmed Husain',
        dop: 'Ali Alsamaheji',
        colorist: 'DaVinci Resolve Certified Colorist',
        editor: 'Fatima Alkaabi',
      },
      isFeatured: true,
      displayOrder: 1,
    },
    {
      id: 'work-02',
      categoryId: 'cat-02',
      slug: 'bahrain-financial-harbour-fpv',
      titleEn: 'Bahrain Financial Harbour — High Speed FPV',
      titleAr: 'مرفأ البحرين المالي — استعراض FPV فائق السرعة',
      clientName: 'BFH Properties',
      year: 2025,
      aspectRatio: '16:9',
      thumbnailUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
      previewVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-sunset-41477-large.mp4',
      fullVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-sunset-41477-large.mp4',
      galleryUrls: [],
      descriptionEn: 'Dynamic acrobatic FPV flight weaving between twin towers during sunset golden hour.',
      descriptionAr: 'طيران FPV سينمائي بهلواني بين الأبراج الزجاجية في الساعة الذهبية لغروب الشمس.',
      credits: {
        director: 'Sayed Ahmed Husain',
        dop: 'Husain Aljamri',
        colorist: 'ishoot Grading Suite',
        editor: 'Fatima Alkaabi',
      },
      isFeatured: true,
      displayOrder: 2,
    },
    {
      id: 'work-03',
      categoryId: 'cat-01',
      slug: 'gulf-air-falcon-gold',
      titleEn: 'Gulf Air — Falcon Gold Reimagined',
      titleAr: 'طيران الخليج — تجربة الصقر الذهبي',
      clientName: 'Gulf Air',
      year: 2024,
      aspectRatio: '2.39:1',
      thumbnailUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
      descriptionEn: 'Luxury airline cabin commercial filmed on soundstage with bespoke lighting rigs mimicking cruising altitude skies.',
      descriptionAr: 'إعلان تجاري فخم لمقصورة الصقر الذهبي مصور داخل الاستوديو بمحاكاة إضاءة الطيران.',
      credits: {
        director: 'Sayed Ahmed Husain',
        dop: 'Ali Alsamaheji',
        colorist: 'DaVinci Resolve Studio',
        editor: 'Fatima Alkaabi',
      },
      isFeatured: true,
      displayOrder: 3,
    },
    {
      id: 'work-04',
      categoryId: 'cat-03',
      slug: 'alba-potline-6-heritage',
      titleEn: 'ALBA — The Smelter of the Future',
      titleAr: 'ألبا — مصهر المستقبل',
      clientName: 'Aluminium Bahrain (ALBA)',
      year: 2024,
      aspectRatio: '16:9',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80',
      descriptionEn: 'Industrial cinema documentary revealing molten metal craftsmanship and safety excellence.',
      descriptionAr: 'فيلم وثائقي صناعي سينمائي يبرز ريادة مصهر الألمنيوم والكوادر الوطنية.',
      credits: {
        director: 'Sayed Ahmed Husain',
        dop: 'Ali Alsamaheji',
        colorist: 'ishoot Suite',
        editor: 'Fatima Alkaabi',
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
  console.log('✅ Created 4 Featured Portfolio Works');

  // 6. Client Logos
  const clientLogos = [
    { id: 'logo-01', name: 'Batelco', logoUrl: '/images/icon.svg', websiteUrl: 'https://batelco.com', displayOrder: 1 },
    { id: 'logo-02', name: 'Gulf Air', logoUrl: '/images/icon.svg', websiteUrl: 'https://gulfair.com', displayOrder: 2 },
    { id: 'logo-03', name: 'ALBA Aluminium', logoUrl: '/images/icon.svg', websiteUrl: 'https://albasmelter.com', displayOrder: 3 },
    { id: 'logo-04', name: 'National Bank of Bahrain', logoUrl: '/images/icon.svg', websiteUrl: 'https://nbbonline.com', displayOrder: 4 },
    { id: 'logo-05', name: 'Bahrain Tourism & Exhibitions Authority', logoUrl: '/images/icon.svg', websiteUrl: 'https://btea.bh', displayOrder: 5 },
    { id: 'logo-06', name: 'Bahrain Economic Development Board', logoUrl: '/images/icon.svg', websiteUrl: 'https://bahrainedb.com', displayOrder: 6 },
    { id: 'logo-07', name: 'Beyon Digital', logoUrl: '/images/icon.svg', websiteUrl: 'https://beyon.com', displayOrder: 7 },
    { id: 'logo-08', name: 'Seef Properties', logoUrl: '/images/icon.svg', websiteUrl: 'https://seef.bh', displayOrder: 8 },
  ];

  for (const l of clientLogos) {
    await prisma.clientLogo.upsert({
      where: { id: l.id },
      update: l,
      create: l,
    });
  }
  console.log('✅ Created 8 Enterprise Client Logos');

  // 7. Studio Equipment Locker
  const equipmentList = [
    {
      id: 'eq-01',
      category: 'cameras',
      nameEn: 'RED V-Raptor XL 8K VV Cinema Package',
      nameAr: 'كاميرا ريد في-رابتور إكس إل ٨ كي',
      brand: 'RED Digital Cinema',
      specification: '8K VistaVision multi-format sensor, up to 120fps at 8K, 17+ stops dynamic range, PL mount.',
      dailyRateBhd: 450.000,
      displayOrder: 1,
    },
    {
      id: 'eq-02',
      category: 'cameras',
      nameEn: 'Sony FX6 Full-Frame Cinema Line',
      nameAr: 'كاميرا سوني إف إكس ٦ سينمائية',
      brand: 'Sony Cinema',
      specification: '4K full-frame sensor, 15+ stops dynamic range, electronic variable ND filter, dual base ISO.',
      dailyRateBhd: 180.000,
      displayOrder: 2,
    },
    {
      id: 'eq-03',
      category: 'lenses',
      nameEn: 'ARRI Master Prime T1.3 Lens Set (18, 25, 35, 50, 85mm)',
      nameAr: 'طقم عدسات آري ماستر برايم T1.3',
      brand: 'ARRI / ZEISS',
      specification: 'Ultra-fast T1.3 aperture across all focal lengths, zero breathing, legendary contrast and bokeh.',
      dailyRateBhd: 350.000,
      displayOrder: 3,
    },
    {
      id: 'eq-04',
      category: 'lenses',
      nameEn: 'Cooke Anamorphic /i Full Frame Plus 40mm & 75mm',
      nameAr: 'عدسات كوك أنامورفيك كاملة الإطار',
      brand: 'Cooke Optics',
      specification: 'True 2x anamorphic squeeze, classic Cooke look, smooth organic fall-off, PL mount.',
      dailyRateBhd: 300.000,
      displayOrder: 4,
    },
    {
      id: 'eq-05',
      category: 'lighting',
      nameEn: 'Aputure Electro Storm CS15 1500W RGB Spotlight',
      nameAr: 'إضاءة أباتشر إليكترو ستورم ١٥٠٠ واط ملونة',
      brand: 'Aputure Pro',
      specification: '1500W full-color point source with dual accessory mount, IP65 weather resistant.',
      dailyRateBhd: 120.000,
      displayOrder: 5,
    },
    {
      id: 'eq-06',
      category: 'lighting',
      nameEn: 'Astera Titan Tube FP1 8-Light Kit with PowerBox',
      nameAr: 'طقم أنابيب أستيرا تايتان ٨ لمبات لاسلكية',
      brand: 'Astera',
      specification: 'Wireless RGBMintAmber LED tubes, CRMX wireless control, 20h internal battery.',
      dailyRateBhd: 95.000,
      displayOrder: 6,
    },
    {
      id: 'eq-07',
      category: 'grip',
      nameEn: 'DJI Ronin 2 3-Axis Professional Gimbal System',
      nameAr: 'مثبت كاميرا دي جي آي رونين ٢ احترافي',
      brand: 'DJI Pro',
      specification: 'Heavy-payload 13.6kg motor support, dual battery hot-swap, ready for crane, vehicle, or handheld.',
      dailyRateBhd: 110.000,
      displayOrder: 7,
    },
    {
      id: 'eq-08',
      category: 'stages',
      nameEn: 'Soundstage A — 250m² Acoustically Treated Cyclorama',
      nameAr: 'استوديو أ — استوديو عازل للصوت ٢٥٠ م² مع سايك مقوس',
      brand: 'ishoot Soundstage',
      specification: 'Infinity curve cyclorama, 6m overhead lighting grid, 60kW 3-phase power, soundproof control booth.',
      dailyRateBhd: 550.000,
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
  console.log('✅ Created 8 Studio Equipment Units');

  // 8. CRM Contacts
  const contacts = [
    {
      id: 'contact-01',
      firstName: 'حمد',
      lastName: 'الرميحي',
      companyName: 'Batelco Telecommunications',
      email: 'h.alromaihi@batelco.com.bh',
      phone: '+973 3944 1122',
      jobTitle: 'Head of Brand & Communications',
      contactType: 'client',
      notes: 'Key decision maker for national TV campaigns and annual creative retainers.',
    },
    {
      id: 'contact-02',
      firstName: 'سارة',
      lastName: 'الماجد',
      companyName: 'Gulf Air Marketing',
      email: 's.almajed@gulfair.com',
      phone: '+973 3988 3344',
      jobTitle: 'Senior Vice President — Brand',
      contactType: 'client',
      notes: 'Oversees in-flight cinema branding and global promotional films.',
    },
    {
      id: 'contact-03',
      firstName: 'طارق',
      lastName: 'الدوسري',
      companyName: 'Bahrain Tourism & Exhibitions (BTEA)',
      email: 't.aldoseri@btea.bh',
      phone: '+973 3611 9900',
      jobTitle: 'Director of International Marketing',
      contactType: 'client',
      notes: 'Manages tourism films and Bahrain season festival video content.',
    },
    {
      id: 'contact-04',
      firstName: 'نورة',
      lastName: 'آل خليفة',
      companyName: 'Impact BBDO Bahrain Agency',
      email: 'noura@impactbbdo.bh',
      phone: '+973 3922 7788',
      jobTitle: 'Executive Creative Director',
      contactType: 'agency',
      notes: 'Agency partner frequently bidding on joint commercial productions.',
    },
    {
      id: 'contact-05',
      firstName: 'خالد',
      lastName: 'الزياني',
      companyName: 'Zayani Motors',
      email: 'k.zayani@zmotors.bh',
      phone: '+973 3901 2345',
      jobTitle: 'Marketing Director',
      contactType: 'client',
      notes: 'Automotive brand launch films and commercial photography.',
    },
  ];

  for (const c of contacts) {
    await prisma.crmContact.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }
  console.log('✅ Created 5 High-Value CRM Contacts');

  // 9. CRM Deals across the 9 stages
  const deals = [
    {
      id: 'deal-01',
      contactId: 'contact-01',
      title: 'Batelco 5G-Advanced Launch Campaign',
      dealStage: 'production',
      dealValue: 14500.000,
      currency: 'BHD',
      probability: 90,
      expectedCloseDate: new Date('2026-10-15'),
      shootDate: new Date('2026-10-05'),
      notes: 'Multi-location commercial shoot with heavy drone work in Manama.',
    },
    {
      id: 'deal-02',
      contactId: 'contact-02',
      title: 'Gulf Air Summer Destination Series',
      dealStage: 'proposal_sent',
      dealValue: 18200.000,
      currency: 'BHD',
      probability: 60,
      expectedCloseDate: new Date('2026-11-01'),
      shootDate: new Date('2026-10-20'),
      notes: 'Awaiting creative committee review for European destination vignettes.',
    },
    {
      id: 'deal-03',
      contactId: 'contact-03',
      title: 'Bahrain Grand Prix 2027 Teaser Film',
      dealStage: 'contract_signed',
      dealValue: 22000.000,
      currency: 'BHD',
      probability: 95,
      expectedCloseDate: new Date('2026-10-10'),
      shootDate: new Date('2026-10-12'),
      notes: 'Night shoot with RED 8K and high-speed chase vehicles.',
    },
    {
      id: 'deal-04',
      contactId: 'contact-04',
      title: 'Zayani Luxury EV Cinematic Commercial',
      dealStage: 'post_production',
      dealValue: 8750.000,
      currency: 'BHD',
      probability: 100,
      expectedCloseDate: new Date('2026-09-30'),
      shootDate: new Date('2026-09-18'),
      notes: 'Currently in color grading and 5.1 surround sound mastering.',
    },
    {
      id: 'deal-05',
      contactId: 'contact-01',
      title: 'Batelco Ramadan Brand Film 2027',
      dealStage: 'lead',
      dealValue: 12000.000,
      currency: 'BHD',
      probability: 40,
      expectedCloseDate: new Date('2026-12-01'),
      notes: 'Initial storyboard discussion and talent casting requirements.',
    },
    {
      id: 'deal-06',
      contactId: 'contact-05',
      title: 'Ferrari Bahrain Showroom Showcase',
      dealStage: 'delivered',
      dealValue: 6500.000,
      currency: 'BHD',
      probability: 100,
      expectedCloseDate: new Date('2026-09-15'),
      shootDate: new Date('2026-09-02'),
      notes: 'Master delivered in ProRes 4444 XQ and social media cutdowns.',
    },
    {
      id: 'deal-07',
      contactId: 'contact-03',
      title: 'Bahrain Heritage Festival 2026',
      dealStage: 'closed_won',
      dealValue: 9800.000,
      currency: 'BHD',
      probability: 100,
      expectedCloseDate: new Date('2026-08-30'),
      shootDate: new Date('2026-08-15'),
      notes: 'Successfully billed and paid in full.',
    },
  ];

  for (const d of deals) {
    await prisma.crmDeal.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }
  console.log('✅ Created 7 CRM Deals across Pipeline Stages');

  // 10. Invoices with Line Items
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'ISH-2026-001' },
    update: {},
    create: {
      id: 'inv-001',
      dealId: 'deal-07',
      invoiceNumber: 'ISH-2026-001',
      clientId: 'contact-03',
      issueDate: new Date('2026-08-15'),
      dueDate: new Date('2026-09-15'),
      subtotal: 9800.000,
      discountType: 'none',
      discountValue: 0.000,
      discountAmount: 0.000,
      vatAmount: 0.000,
      totalAmount: 9800.000,
      currency: 'BHD',
      language: 'ar',
      status: 'paid',
      createdById: createdUsers.super_admin?.id,
      notesAr: 'دفعة كاملة عن إنتاج وتصوير فيلم مهرجان التراث البحريني.',
      notesEn: 'Full payment for Bahrain Heritage Festival cinema commercial production.',
      lineItems: {
        create: [
          {
            descriptionEn: 'Principal Cinematography & Director of Photography Package (3 Days)',
            descriptionAr: 'حزمة التصوير السينمائي وإدارة التصوير (٣ أيام تصوير)',
            quantity: 3.00,
            unitPrice: 1800.000,
            lineTotal: 5400.000,
            displayOrder: 1,
          },
          {
            descriptionEn: 'RED 8K Camera, ARRI Primes & Master Lighting Package',
            descriptionAr: 'طقم كاميرا ريد ٨ كي وعدسات آرّي مع طاقم الإضاءة الكامل',
            quantity: 3.00,
            unitPrice: 800.000,
            lineTotal: 2400.000,
            displayOrder: 2,
          },
          {
            descriptionEn: 'DaVinci Resolve Studio Color Grading & 4K Mastering',
            descriptionAr: 'تصحيح ألوان سينمائي في استوديو دافينشي وتصدير ماستر ٤ كي',
            quantity: 1.00,
            unitPrice: 2000.000,
            lineTotal: 2000.000,
            displayOrder: 3,
          },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'ISH-2026-002' },
    update: {},
    create: {
      id: 'inv-002',
      dealId: 'deal-04',
      invoiceNumber: 'ISH-2026-002',
      clientId: 'contact-04',
      issueDate: new Date('2026-09-01'),
      dueDate: new Date('2026-10-01'),
      subtotal: 8750.000,
      discountType: 'fixed',
      discountValue: 250.000,
      discountAmount: 250.000,
      vatAmount: 0.000,
      totalAmount: 8500.000,
      currency: 'BHD',
      language: 'en',
      status: 'partially_paid',
      createdById: createdUsers.finance_manager?.id,
      notesEn: '50% mobilization deposit received; remaining 50% due on delivery of ProRes master.',
      lineItems: {
        create: [
          {
            descriptionEn: 'Commercial Automotive Cinema Production Package',
            descriptionAr: 'حزمة تصوير سينمائي إعلاني للسيارات الفاخرة',
            quantity: 1.00,
            unitPrice: 6500.000,
            lineTotal: 6500.000,
            displayOrder: 1,
          },
          {
            descriptionEn: 'High Speed Acrobatic FPV Aerial Sequence',
            descriptionAr: 'تصوير جوي بهلواني سريع بطائرات FPV',
            quantity: 1.00,
            unitPrice: 2250.000,
            lineTotal: 2250.000,
            displayOrder: 2,
          },
        ],
      },
    },
  });

  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'ISH-2026-003' },
    update: {},
    create: {
      id: 'inv-003',
      dealId: 'deal-01',
      invoiceNumber: 'ISH-2026-003',
      clientId: 'contact-01',
      issueDate: new Date('2026-09-10'),
      dueDate: new Date('2026-10-10'),
      subtotal: 14500.000,
      discountType: 'none',
      discountValue: 0.000,
      discountAmount: 0.000,
      vatAmount: 0.000,
      totalAmount: 14500.000,
      currency: 'BHD',
      language: 'ar',
      status: 'sent',
      createdById: createdUsers.super_admin?.id,
      notesAr: 'الدفعة الأولى المستحقة لتجهيز موقع التصوير وبدء مرحلة الإنتاج.',
      lineItems: {
        create: [
          {
            descriptionEn: 'Pre-production, Casting, Location Permits & Creative Direction',
            descriptionAr: 'مرحلة ما قبل الإنتاج، واختيار الممثلين، وتصاريح المواقع، والإشراف الإبداعي',
            quantity: 1.00,
            unitPrice: 4500.000,
            lineTotal: 4500.000,
            displayOrder: 1,
          },
          {
            descriptionEn: '4 Production Shoot Days with Cinema Dual-Camera Crews',
            descriptionAr: '٤ أيام تصوير سينمائي مع طاقمي كاميرا كاملين',
            quantity: 4.00,
            unitPrice: 2500.000,
            lineTotal: 10000.000,
            displayOrder: 2,
          },
        ],
      },
    },
  });
  console.log('✅ Created 3 Invoices with Verified Line Items');

  // 11. Payments with Receipts
  await prisma.payment.upsert({
    where: { receiptNumber: 'RCT-2026-001' },
    update: {},
    create: {
      id: 'pay-001',
      invoiceId: 'inv-001',
      receiptNumber: 'RCT-2026-001',
      paymentDate: new Date('2026-08-25'),
      amount: 9800.000,
      currency: 'BHD',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-NBB-8492019',
      notes: 'Full payment cleared via National Bank of Bahrain wire transfer.',
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
  });

  await prisma.payment.upsert({
    where: { receiptNumber: 'RCT-2026-002' },
    update: {},
    create: {
      id: 'pay-002',
      invoiceId: 'inv-002',
      receiptNumber: 'RCT-2026-002',
      paymentDate: new Date('2026-09-05'),
      amount: 4250.000,
      currency: 'BHD',
      paymentMethod: 'bank_transfer',
      referenceNumber: 'TRF-BBK-392019',
      notes: '50% initial production advance cleared.',
      notificationSent: true,
      createdById: createdUsers.finance_manager?.id,
    },
  });
  console.log('✅ Created Reconciled Payment Receipts');

  // 12. Expense Categories
  const expenseCats = [
    { id: 'expcat-01', slug: 'gear_rental', nameEn: 'Equipment & Gear Rentals', nameAr: 'استئجار معدات وكاميرات', color: '#09937F', displayOrder: 1 },
    { id: 'expcat-02', slug: 'crew_wages', nameEn: 'Crew & Talent Wages', nameAr: 'أجور الطواقم والممثلين', color: '#3B82F6', displayOrder: 2 },
    { id: 'expcat-03', slug: 'travel_logistics', nameEn: 'Travel & Location Logistics', nameAr: 'سفر ونقل وإعاشة', color: '#F59E0B', displayOrder: 3 },
    { id: 'expcat-04', slug: 'studio_overhead', nameEn: 'Studio Lease & Utilities', nameAr: 'إيجار ومصاريف الاستوديو', color: '#8B5CF6', displayOrder: 4 },
    { id: 'expcat-05', slug: 'software_licenses', nameEn: 'Software, Storage & Cloud', nameAr: 'برمجيات واشتراكات وسحابة', color: '#EC4899', displayOrder: 5 },
    { id: 'expcat-06', slug: 'marketing_pr', nameEn: 'Marketing & Festival Submissions', nameAr: 'تسويق ومشاركات مهرجانات', color: '#10B981', displayOrder: 6 },
  ];

  for (const ec of expenseCats) {
    await prisma.expenseCategory.upsert({
      where: { id: ec.id },
      update: ec,
      create: ec,
    });
  }

  // 13. Expenses
  const expenses = [
    {
      id: 'exp-01',
      categoryId: 'expcat-02',
      dealId: 'deal-07',
      descriptionEn: 'Steadicam Operator & 1st AC Wages (3 Shoot Days)',
      descriptionAr: 'أجور مشغل ستيديكام ومساعد المصور الأول (٣ أيام)',
      amount: 1050.000,
      currency: 'BHD',
      expenseDate: new Date('2026-08-16'),
      vendorName: 'Direct Freelance Crew',
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: 'exp-02',
      categoryId: 'expcat-01',
      dealId: 'deal-04',
      descriptionEn: 'Russian Arm Camera Crane Tracking Car Rental',
      descriptionAr: 'استئجار سيارة تتبع بكاميرا كرين متقدمة',
      amount: 1400.000,
      currency: 'BHD',
      expenseDate: new Date('2026-09-02'),
      vendorName: 'Gulf Motion Grip Services',
      createdById: createdUsers.producer?.id,
    },
    {
      id: 'exp-03',
      categoryId: 'expcat-04',
      descriptionEn: 'Monthly Soundstage A Facility Lease & Facility Electricity',
      descriptionAr: 'إيجار استوديو أ ومصاريف الكهرباء الشهرية',
      amount: 1250.000,
      currency: 'BHD',
      expenseDate: new Date('2026-09-01'),
      vendorName: 'Seef Commercial Real Estate',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      createdById: createdUsers.finance_manager?.id,
    },
    {
      id: 'exp-04',
      categoryId: 'expcat-05',
      descriptionEn: 'DaVinci Resolve Studio Cloud & LucidLink 10TB Cinema Cloud',
      descriptionAr: 'اشتراك سحابة دافينشي ومساحة تخزين لوسيد لينك ١٠ تيرابايت',
      amount: 280.000,
      currency: 'BHD',
      expenseDate: new Date('2026-09-03'),
      vendorName: 'LucidLink Inc / Blackmagic Cloud',
      isRecurring: true,
      recurrenceInterval: 'monthly',
      createdById: createdUsers.editor?.id,
    },
  ];

  for (const e of expenses) {
    await prisma.expense.upsert({
      where: { id: e.id },
      update: e,
      create: e,
    });
  }
  console.log('✅ Created Production & Studio Operating Expenses');

  // 14. Calendar Events (Month/Week views & Google Sync ready)
  const calendarEvents = [
    {
      id: 'event-01',
      title: 'Batelco 5G Cinema Shoot — Day 1 (Seef District)',
      titleAr: 'تصوير إعلان بتلكو — اليوم الأول (ضاحية السيف)',
      description: 'Principal photography with RED 8K and anamorphic glass. Call time 05:30 AM.',
      startDate: new Date('2026-10-05T05:30:00Z'),
      endDate: new Date('2026-10-05T18:00:00Z'),
      allDay: false,
      location: 'Seef District, Manama',
      color: '#09937F',
      eventType: 'shoot',
      dealId: 'deal-01',
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: 'event-02',
      title: 'Batelco 5G Cinema Shoot — Day 2 (Bahrain Bay)',
      titleAr: 'تصوير إعلان بتلكو — اليوم الثاني (خليج البحرين)',
      description: 'Sunset and night drone capture. FPV operations licensed with BCAA.',
      startDate: new Date('2026-10-06T14:00:00Z'),
      endDate: new Date('2026-10-06T22:30:00Z'),
      allDay: false,
      location: 'Bahrain Bay Promenade',
      color: '#09937F',
      eventType: 'shoot',
      dealId: 'deal-01',
      createdById: createdUsers.production_manager?.id,
    },
    {
      id: 'event-03',
      title: 'Gulf Air Summer Series — Creative Pitch Meeting',
      titleAr: 'اجتماع تقديم العرض الإبداعي لطيران الخليج',
      description: 'Presentation of 3 storyboard directions to Gulf Air executive board.',
      startDate: new Date('2026-09-28T10:00:00Z'),
      endDate: new Date('2026-09-28T11:30:00Z'),
      allDay: false,
      location: 'Gulf Air HQ, Muharraq / Hybrid Zoom',
      color: '#3B82F6',
      eventType: 'meeting',
      dealId: 'deal-02',
      createdById: createdUsers.super_admin?.id,
    },
    {
      id: 'event-04',
      title: 'Zayani Motors Master Delivery Deadline',
      titleAr: 'الموعد النهائي لتسليم ماستر إعلان الزياني',
      description: 'Final 4K master ProRes delivery to broadcast TV networks.',
      startDate: new Date('2026-09-30T17:00:00Z'),
      endDate: new Date('2026-09-30T18:00:00Z'),
      allDay: false,
      location: 'ishoot Soundstage Suite',
      color: '#E11D48',
      eventType: 'deadline',
      dealId: 'deal-04',
      createdById: createdUsers.editor?.id,
    },
  ];

  for (const ce of calendarEvents) {
    await prisma.calendarEvent.upsert({
      where: { id: ce.id },
      update: ce,
      create: ce,
    });
  }
  console.log('✅ Created 4 Calendar Events with Deal Associations');

  // 15. Inquiries
  const inquiries = [
    {
      id: 'inq-01',
      name: 'عبدالله الخاجة',
      email: 'a.khajah@albaraka.com',
      phone: '+973 3944 5566',
      companyName: 'Al Baraka Banking Group',
      serviceType: 'Commercial Cinematography, DaVinci Resolve Color Grading',
      budgetRange: '5,000 – 10,000 BHD',
      timeline: 'November 2026',
      message: 'نود تصوير فيلم وثائقي ترويجي سنوي لتقرير الاستدامة والحوكمة في نوفمبر.',
      status: 'new',
      locale: 'ar',
    },
    {
      id: 'inq-02',
      name: 'Elena Rostova',
      email: 'elena@redbullgulf.com',
      phone: '+971 50 123 4567',
      companyName: 'Red Bull Middle East',
      serviceType: 'Aerial & FPV Cinematography',
      budgetRange: '> 10,000 BHD',
      timeline: 'December 2026',
      message: 'Looking for a licensed cinema heavy-lift drone crew for an extreme watersports shoot in Bahrain.',
      status: 'qualified',
      locale: 'en',
    },
  ];

  for (const inq of inquiries) {
    await prisma.inquiry.upsert({
      where: { id: inq.id },
      update: inq,
      create: inq,
    });
  }
  console.log('✅ Created 2 Production Leads / Inquiries');

  // 16. Activity Logs & Notifications
  await prisma.activityLog.create({
    data: {
      userId: createdUsers.super_admin.id,
      action: 'seed_init',
      entityType: 'system',
      details: { message: 'Database initialized with enterprise mock dataset' },
      ipAddress: '127.0.0.1',
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdUsers.super_admin.id,
      title: 'مرحباً بك في نظام آي شوت Odoo المتكامل',
      message: 'تم تفعيل جميع الوحدات الإدارية، وإعدادات الضرائب، والصلاحيات بنجاح.',
      type: 'success',
      isRead: false,
    },
  });

  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
