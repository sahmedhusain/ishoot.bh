const {
  schemaMeta,
  uuidOf,
  sha256,
  sqlRaw,
  ins,
  splitPhone,
  staffEmail,
} = require("./lib/seed-sql.cjs");
const { getActivityCatalog } = require("./lib/activity-catalogs.cjs");

// 21 additional staff members (combined with 10 base = 31 active staff per company)
const EXTRA_STAFF = [
  { id: "ahmed-zayani", nameEn: "Ahmed Al-Zayani", nameAr: "أحمد الزياني", username: "AZ0011", role: "sales", dept: "d-sales", titleEn: "Senior Sales Executive", titleAr: "تنفيذي مبيعات أول", salary: 1200, reportTo: "sami-khoury" },
  { id: "maryam-bucheeri", nameEn: "Maryam Bucheeri", nameAr: "مريم بوشهري", username: "MB0012", role: "accountant", dept: "d-fin", titleEn: "Accounts Payable Specialist", titleAr: "أخصائية الحسابات الدائنة", salary: 880, reportTo: "layla-nasser" },
  { id: "hassan-matar", nameEn: "Hassan Matar", nameAr: "حسن مطر", username: "HM0013", role: "editor", dept: "d-ops", titleEn: "Operations Coordinator", titleAr: "منسق عمليات", salary: 860, reportTo: "tariq-saleh" },
  { id: "fatima-khalifa", nameEn: "Fatima Al-Khalifa", nameAr: "فاطمة آل خليفة", username: "FK0014", role: "hr_manager", dept: "d-hr", titleEn: "HR & People Manager", titleAr: "مديرة الموارد البشرية", salary: 1550, reportTo: "yusuf-rahman" },
  { id: "ali-mahmood", nameEn: "Ali Al-Mahmood", nameAr: "علي المحمود", username: "AM0015", role: "it_specialist", dept: "d-it", titleEn: "IT Systems Engineer", titleAr: "مهندس أنظمة تقنية", salary: 1350, reportTo: "karim-fawzi" },
  { id: "zahra-jaffar", nameEn: "Zahra Jaffar", nameAr: "زهراء جعفر", username: "ZJ0016", role: "marketing", dept: "d-mkt", titleEn: "Content Strategist", titleAr: "أخصائية استراتيجية المحتوى", salary: 940, reportTo: "hana-yousef" },
  { id: "khalid-doseri", nameEn: "Khalid Al-Doseri", nameAr: "خالد الدوسري", username: "KD0017", role: "warehouse_lead", dept: "d-log", titleEn: "Warehouse Supervisor", titleAr: "مشرف المستودع", salary: 980, reportTo: "karim-fawzi" },
  { id: "reem-ansari", nameEn: "Reem Al-Ansari", nameAr: "ريم الأنصاري", username: "RA0018", role: "sales", dept: "d-sales", titleEn: "Business Development Rep", titleAr: "ممثلة تطوير الأعمال", salary: 1050, reportTo: "sami-khoury" },
  { id: "rashid-qahtani", nameEn: "Rashid Al-Qahtani", nameAr: "راشد القحطاني", username: "RQ0019", role: "driver", dept: "d-log", titleEn: "Fleet & Delivery Driver", titleAr: "سائق أسطول وتوصيل", salary: 680, reportTo: "khalid-doseri" },
  { id: "salman-bader", nameEn: "Salman Bader", nameAr: "سلمان بدر", username: "SB0020", role: "driver", dept: "d-log", titleEn: "Express Courier Driver", titleAr: "سائق توصيل سريع", salary: 670, reportTo: "khalid-doseri" },
  { id: "latifa-shaker", nameEn: "Latifa Shaker", nameAr: "لطيفة شاكر", username: "LS0021", role: "accountant", dept: "d-fin", titleEn: "Payroll & GOSI Officer", titleAr: "مسؤولة الرواتب والتأمينات", salary: 960, reportTo: "layla-nasser" },
  { id: "ibrahim-kooheji", nameEn: "Ibrahim Al-Kooheji", nameAr: "إبراهيم الكوهجي", username: "IK0022", role: "procurement", dept: "d-proc", titleEn: "Procurement Specialist", titleAr: "أخصائي المشتريات", salary: 1120, reportTo: "karim-fawzi" },
  { id: "amal-sultan", nameEn: "Amal Sultan", nameAr: "أمل سلطان", username: "AS0023", role: "support", dept: "d-it", titleEn: "IT Service Desk Analyst", titleAr: "محللة دعم فني", salary: 890, reportTo: "ali-mahmood" },
  { id: "nawaf-hashim", nameEn: "Nawaf Hashim", nameAr: "نواف هاشم", username: "NH0024", role: "cashier", dept: "d-sales", titleEn: "Retail POS Cashier", titleAr: "أمين صندوق التجزئة", salary: 720, reportTo: "sami-khoury" },
  { id: "dina-mansoor", nameEn: "Dina Mansoor", nameAr: "دينا منصور", username: "DM0025", role: "legal", dept: "d-exec", titleEn: "Legal & Compliance Officer", titleAr: "مسؤولة الشؤون القانونية", salary: 1480, reportTo: "yusuf-rahman" },
  { id: "majed-harbi", nameEn: "Majed Al-Harbi", nameAr: "ماجد الحربي", username: "MH0026", role: "editor", dept: "d-ops", titleEn: "Field Production Lead", titleAr: "قائد الإنتاج الميداني", salary: 1150, reportTo: "tariq-saleh" },
  { id: "sara-kanoo", nameEn: "Sara Kanoo", nameAr: "سارة كانو", username: "SK0027", role: "marketing", dept: "d-mkt", titleEn: "PR & Media Relations", titleAr: "مسؤولة العلاقات العامة", salary: 1020, reportTo: "hana-yousef" },
  { id: "hamad-ali", nameEn: "Hamad Al-Ali", nameAr: "حمد العلي", username: "HA0028", role: "warehouse_staff", dept: "d-log", titleEn: "Inventory Clerk", titleAr: "أمين مخزن", salary: 740, reportTo: "khalid-doseri" },
  { id: "mona-essa", nameEn: "Mona Essa", nameAr: "منى عيسى", username: "ME0029", role: "hr_officer", dept: "d-hr", titleEn: "Talent & Onboarding Officer", titleAr: "مسؤولة التوظيف", salary: 910, reportTo: "fatima-khalifa" },
  { id: "jassim-hilal", nameEn: "Jassim Hilal", nameAr: "جاسم هلال", username: "JH0030", role: "driver", dept: "d-log", titleEn: "Heavy Van Driver", titleAr: "سائق شاحنة توصيل", salary: 710, reportTo: "khalid-doseri" },
  { id: "nadia-fakhro", nameEn: "Nadia Fakhro", nameAr: "نادية فخرو", username: "NF0031", role: "cashier", dept: "d-sales", titleEn: "Branch Cashier", titleAr: "أمينة صندوق الفرع", salary: 730, reportTo: "sami-khoury" },
  { id: "waleed-almoayyed", nameEn: "Waleed Al-Moayyed", nameAr: "وليد المؤيد", username: "WM0032", role: "sales", dept: "d-sales", titleEn: "Key Account Manager", titleAr: "مدير حسابات كبار العملاء", salary: 1420, reportTo: "sami-khoury" },
  { id: "huda-alghanim", nameEn: "Huda Al-Ghanim", nameAr: "هدى الغانم", username: "HG0033", role: "accountant", dept: "d-fin", titleEn: "Treasury & AR Controller", titleAr: "مراقبة الخزينة والحسابات المدينة", salary: 1280, reportTo: "layla-nasser" },
  { id: "mansoor-albuainain", nameEn: "Mansoor Al-Buainain", nameAr: "منصور البوعينين", username: "MB0034", role: "procurement", dept: "d-proc", titleEn: "Vendor Relations Lead", titleAr: "قائد علاقات الموردين", salary: 1240, reportTo: "ibrahim-kooheji" },
  { id: "dalal-alrumaihi", nameEn: "Dalal Al-Rumaihi", nameAr: "دلال الرميحي", username: "DR0035", role: "hr_officer", dept: "d-hr", titleEn: "Compensation & Benefits Analyst", titleAr: "محللة التعويضات والمزايا", salary: 1080, reportTo: "fatima-khalifa" },
  { id: "isa-alsharif", nameEn: "Isa Al-Sharif", nameAr: "عيسى الشريف", username: "IS0036", role: "warehouse_staff", dept: "d-log", titleEn: "Quality & Dispatch Inspector", titleAr: "مفتش الجودة والشحن", salary: 840, reportTo: "khalid-doseri" },
  { id: "shaikha-alsuwaidi", nameEn: "Shaikha Al-Suwaidi", nameAr: "شيخة السويدي", username: "SS0037", role: "marketing", dept: "d-mkt", titleEn: "Digital Performance Lead", titleAr: "قائدة التسويق الرقمي", salary: 1180, reportTo: "hana-yousef" },
];

// 52 realistic Bahraini & GCC corporate and individual customers (combined with 8 base = 60 real customers per company)
const EXTRA_CUSTOMERS = [
  { id: "cust-009", nameEn: "Almoayyed Contracting Group W.L.L.", nameAr: "مجموعة المؤيد للمقاولات ذ.م.م", email: "procurement@almoayyed-contracting.bh", phone: "+97317210940", city: "Manama" },
  { id: "cust-010", nameEn: "Seef Waterfront Hospitality W.L.L.", nameAr: "سيف ووترفرونت للضيافة ذ.م.م", email: "finance@seefwaterfront.bh", phone: "+97317582210", city: "Seef District" },
  { id: "cust-011", nameEn: "Hidd Industrial Fabrication Co.", nameAr: "شركة الحد للتصنيع الصناعي", email: "supply@hiddfab.bh", phone: "+97317671488", city: "Hidd" },
  { id: "cust-012", nameEn: "Riffa Views Property Management", nameAr: "إدارة عقارات رفاع فيوز", email: "accounts@riffaviews-pm.bh", phone: "+97317756120", city: "Riffa" },
  { id: "cust-013", nameEn: "Dilmunia Health & Wellness Center", nameAr: "مركز دلمونيا للصحة والعافية", email: "billing@dilmuniawellness.bh", phone: "+97316509300", city: "Muharraq" },
  { id: "cust-014", nameEn: "Arad Bay Maritime Services W.L.L.", nameAr: "خدمات خليج عراد البحرية ذ.م.م", email: "ops@aradmaritime.bh", phone: "+97317334890", city: "Muharraq" },
  { id: "cust-015", nameEn: "Zallaq Coast Resort & Spa", nameAr: "منتجع وسبا ساحل الزلاق", email: "purchasing@zallaqcoast.bh", phone: "+97317630410", city: "Zallaq" },
  { id: "cust-016", nameEn: "Saar International Academy", nameAr: "أكاديمية سار الدولية", email: "finance@saaracademy.bh", phone: "+97317691255", city: "Saar" },
  { id: "cust-017", nameEn: "Sitra Petrochemical Logistics", nameAr: "سترة للخدمات اللوجستية البتروكيماوية", email: "ap@sitralogistics.bh", phone: "+97317732800", city: "Sitra" },
  { id: "cust-018", nameEn: "Amwaj Marina Yacht Club", nameAr: "نادي مرسى أمواج لليخوت", email: "admin@amwajmarina.bh", phone: "+97316031940", city: "Amwaj Islands" },
  { id: "cust-019", nameEn: "Budaiya Organic Farms & Grocers", nameAr: "مزارع وبقالات البديع العضوية", email: "orders@budaiyaorganic.bh", phone: "+97317594210", city: "Budaiya" },
  { id: "cust-020", nameEn: "Diplomatic Tower Financial Advisory", nameAr: "برج الدبلوماسي للاستشارات المالية", email: "accounts@diptower-advisory.bh", phone: "+97317531180", city: "Diplomatic Area" },
  { id: "cust-021", nameEn: "Juffair Oasis Serviced Residences", nameAr: "واحة الجفير للشقق الفندقية", email: "procurement@juffairoasis.bh", phone: "+97317824600", city: "Juffair" },
  { id: "cust-022", nameEn: "Isa Town Medical Diagnostics Lab", nameAr: "مختبر مدينة عيسى للتشخيص الطبي", email: "supply@isatownlab.bh", phone: "+97317684920", city: "Isa Town" },
  { id: "cust-023", nameEn: "Sanabis Commercial Printing Press", nameAr: "مطبعة السنابس التجارية", email: "orders@sanabispress.bh", phone: "+97317552090", city: "Sanabis" },
  { id: "cust-024", nameEn: "Tubli Cold Chain Distribution", nameAr: "توبلي لتوزيع سلسلة التبريد", email: "dispatch@tublicoldchain.bh", phone: "+97317783510", city: "Tubli" },
  { id: "cust-025", nameEn: "Al-Fateh Engineering Consultants", nameAr: "الفاتح للاستشارات الهندسية", email: "finance@alfateh-eng.bh", phone: "+97317295140", city: "Manama" },
  { id: "cust-026", nameEn: "Kanoo Heritage Travel & Concierge", nameAr: "كانو التراثية للسفر والكونسيرج", email: "bookings@kanooheritage.bh", phone: "+97317228810", city: "Manama" },
  { id: "cust-027", nameEn: "Awali Solar & Clean Energy W.L.L.", nameAr: "عوالي للطاقة الشمسية والنظيفة ذ.م.م", email: "projects@awalisolar.bh", phone: "+97317759400", city: "Riffa" },
  { id: "cust-028", nameEn: "Adliya Artisan Roastery & Bakery", nameAr: "محمصة ومخبز العدلية الحرفي", email: "wholesale@adliyaroastery.bh", phone: "+97317714320", city: "Manama" },
  { id: "cust-029", nameEn: "Qalali Marine Hardware & Supply", nameAr: "قلالي للمعدات واللوازم البحرية", email: "sales@qalalimarinestore.bh", phone: "+97317324590", city: "Muharraq" },
  { id: "cust-030", nameEn: "Janabiyah Equestrian & Country Club", nameAr: "نادي الجنبية للفروسية والريف", email: "events@janabiyahequestrian.bh", phone: "+97317698410", city: "Saar" },
  { id: "cust-031", nameEn: "Salmabad Steel & Aluminum Works", nameAr: "سلماباد لأعمال الحديد والألمنيوم", email: "purchasing@salmabadsteel.bh", phone: "+97317874120", city: "Isa Town" },
  { id: "cust-032", nameEn: "Hamad Town Dental & Orthodontic Clinic", nameAr: "عيادة مدينة حمد لطب وتقويم الأسنان", email: "admin@hamadtowndental.bh", phone: "+97317412980", city: "Riffa" },
  { id: "cust-033", nameEn: "Diyar Al-Muharraq Urban Retail", nameAr: "ديار المحرق للتجزئة الحضرية", email: "leasing@diyarretail.bh", phone: "+97316608450", city: "Muharraq" },
  { id: "cust-034", nameEn: "Seef Horizon Legal Partners", nameAr: "آفاق السيف للشركاء القانونيين", email: "billing@seefhorizonlaw.bh", phone: "+97317589020", city: "Seef District" },
  { id: "cust-035", nameEn: "Bahrain Bay Cloud & Data Center", nameAr: "خليج البحرين للسحابة ومراكز البيانات", email: "ops@bahrainbaycloud.bh", phone: "+97317104430", city: "Diplomatic Area" },
  { id: "cust-036", nameEn: "Al-Khobar Causeway Freight Lines", nameAr: "خطوط شحن جسر الخبر", email: "customs@causewayfreight.sa", phone: "+966138902210", city: "Manama" },
  { id: "cust-037", nameEn: "Dammam Gulf Industrial Packaging", nameAr: "الدمام الخليجية للتغليف الصناعي", email: "orders@gulfpack-dmm.sa", phone: "+966138445190", city: "Sitra" },
  { id: "cust-038", nameEn: "Riyadh Najd Corporate Catering", nameAr: "نجد الرياض لتموين الشركات", email: "supply@najdcatering.sa", phone: "+966114628810", city: "Seef District" },
  { id: "cust-039", nameEn: "Doha Lusail Architectural Studio", nameAr: "استوديو لوسيل المعماري - الدوحة", email: "projects@lusailarch.qa", phone: "+97444128900", city: "Diplomatic Area" },
  { id: "cust-040", nameEn: "Dubai Creek Luxury Interior Fitout", nameAr: "خور دبي لتجهيز الديكورات الفاخرة", email: "procurement@creekfitout.ae", phone: "+97143298840", city: "Amwaj Islands" },
  { id: "cust-041", nameEn: "Kuwait Sharq Medical Supplies Co.", nameAr: "شركة شرق الكويت للمستلزمات الطبية", email: "imports@sharqmed.kw", phone: "+96522461090", city: "Manama" },
  { id: "cust-042", nameEn: "Muscat Qurum Boutique Hotels", nameAr: "فنادق القرم البوتيكية - مسقط", email: "finance@qurumboutique.om", phone: "+96824561920", city: "Seef District" },
  { id: "cust-043", nameEn: "Abdulla Al-Aali", nameAr: "عبدالله العالي", email: "abdulla.alaali@batelco-mail.bh", phone: "+97339412801", city: "Isa Town" },
  { id: "cust-044", nameEn: "Shaikha Al-BinAli", nameAr: "شيخة البنعلي", email: "shaikha.binali@gmail.com", phone: "+97339620415", city: "Riffa" },
  { id: "cust-045", nameEn: "Mohammed Al-Koheji", nameAr: "محمد الكوهجي", email: "m.alkoheji@icloud.com", phone: "+97336218490", city: "Muharraq" },
  { id: "cust-046", nameEn: "Noura Al-Rumaihi", nameAr: "نورة الرميحي", email: "noura.rumaihi@outlook.com", phone: "+97333891244", city: "Saar" },
  { id: "cust-047", nameEn: "Saeed Al-Balooshi", nameAr: "سعيد البلوشي", email: "saeed.balooshi@gmail.com", phone: "+97339104578", city: "Budaiya" },
  { id: "cust-048", nameEn: "Hessa Al-Sulaiti", nameAr: "حصة السليطي", email: "hessa.sulaiti@icloud.com", phone: "+97336782109", city: "Amwaj Islands" },
  { id: "cust-049", nameEn: "Fawaz Al-Thawadi", nameAr: "فواز الذوادي", email: "fawaz.thawadi@outlook.com", phone: "+97339845123", city: "Seef District" },
  { id: "cust-050", nameEn: "Lulwa Al-Jalahma", nameAr: "لولوة الجلاهمة", email: "lulwa.jalahma@gmail.com", phone: "+97333519082", city: "Manama" },
  { id: "cust-051", nameEn: "Ebrahim Al-Murbati", nameAr: "إبراهيم المرباطي", email: "ebrahim.murbati@gmail.com", phone: "+97339201467", city: "Muharraq" },
  { id: "cust-052", nameEn: "Amina Al-Khaja", nameAr: "آمنة الخاجة", email: "amina.khaja@icloud.com", phone: "+97336451298", city: "Juffair" },
  { id: "cust-053", nameEn: "Talal Al-Shaikh", nameAr: "طلال الشيخ", email: "talal.alshaikh@outlook.com", phone: "+97339773210", city: "Riffa" },
  { id: "cust-054", nameEn: "Mariam Al-Qassab", nameAr: "مريم القصاب", email: "mariam.qassab@gmail.com", phone: "+97333194822", city: "Sanabis" },
  { id: "cust-055", nameEn: "Nasser Al-Mannai", nameAr: "ناصر المناعي", email: "nasser.mannai@icloud.com", phone: "+97339508314", city: "Hidd" },
  { id: "cust-056", nameEn: "Zainab Al-Mahroos", nameAr: "زينب المحروس", email: "zainab.mahroos@gmail.com", phone: "+97336902341", city: "Tubli" },
  { id: "cust-057", nameEn: "Bader Al-Naimi", nameAr: "بدر النعيمي", email: "bader.naimi@outlook.com", phone: "+97339341892", city: "Zallaq" },
  { id: "cust-058", nameEn: "Kholood Al-Haddad", nameAr: "خلود الحداد", email: "kholood.haddad@gmail.com", phone: "+97333672915", city: "Saar" },
  { id: "cust-059", nameEn: "Yaqub Al-Arrayed", nameAr: "يعقوب العريض", email: "yaqub.arrayed@icloud.com", phone: "+97339118273", city: "Manama" },
  { id: "cust-060", nameEn: "Rawan Al-Sada", nameAr: "روان السادة", email: "rawan.sada@gmail.com", phone: "+97336048195", city: "Amwaj Islands" },
];

function buildExtraModuleSql({
  company,
  companyJson,
  domainHost,
  staffRoster,
  customers,
  filesList = [],
  defaultPasswordHash,
  superAdminEmail,
  itRoster = [],
}) {
  const lines = [];
  const pfx = company.prefix;
  const cur = company.currency;
  const u = (k) => uuidOf(`${company.slug}:${k}`);
  const now = sqlRaw("now()");
  const ago = (days) => sqlRaw(`now() - interval '${days} days'`);
  const ahead = (days) => sqlRaw(`now() + interval '${days} days'`);
  const dateAgo = (days) => sqlRaw(`(now() - interval '${days} days')::date`);
  const dateAhead = (days) => sqlRaw(`(now() + interval '${days} days')::date`);
  const hexBytea = (text) => sqlRaw(`decode('${Buffer.from(text, "utf8").toString("hex")}', 'hex')`);

  const catalog = getActivityCatalog(company);
  const svcList = catalog.services;
  const prodList = catalog.products;
  const hasLogistics =
    company.hasStore ||
    ["logistics", "food", "products", "online_store", "pharmacy", "all"].includes(company.activity);

  const saStaff = staffRoster[0] || { id: "super-admin", nameEn: "Bader Ali", nameAr: "بدر علي", email: superAdminEmail || "admin@example.com" };
  const saEmail = staffEmail(saStaff, domainHost);
  const saItId = itRoster[0]?.id || "430c4105-6360-4415-bf1b-087d582c7fc6";

  // ── 0. ADDITIONAL BRANCH (Sitra Logistics Hub) ───────────────────────────────
  lines.push(`\n-- IDENTITY: EXTRA BRANCH & ALUMNI/SUSPENDED LIFECYCLE STATES`);
  lines.push(
    ins(
      "identity.branch",
      {
        id: "br-sitra",
        code: "ST-05",
        name: `${company.shortEn} Sitra Logistics`,
        time_zone: "Asia/Bahrain",
        business_day_start: 8,
        is_active: true,
        revision: 1,
        created_at: ago(300),
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  // Two non-login lifecycle staff accounts (1 archived w/ MFA active, 1 suspended w/ pending MFA)
  // Populates 100% of nullable lifecycle & MFA columns on identity.account, identity.user, hr.employee
  const lifecycleStaff = [
    {
      id: "murad-mansoor",
      username: "MM0032",
      nameEn: "Murad Al-Mansoor",
      nameAr: "مراد المنصور",
      firstEn: "Murad",
      lastEn: "Al-Mansoor",
      firstAr: "مراد",
      lastAr: "المنصور",
      empNum: "EMP-0032",
      email: `murad.mansoor@${domainHost}`,
      phone: "+97339000032",
      dept: "d-ops",
      role: "editor",
      titleEn: "Former Field Producer",
      titleAr: "منتج ميداني سابق",
      salary: 920,
      hrStatus: "terminated",
      mfaEnabled: true,
      mfaSecret: `enc:${sha256(`${company.slug}:mfa:murad`)}`,
      mfaStep: 29481020,
      mfaPendingSecret: null,
      mfaPendingExpires: null,
      resetToken: sha256(`${company.slug}:reset:murad`),
      resetExpires: ahead(1),
      archivedAt: ago(30),
      archivedBy: "super-admin",
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    },
    {
      id: "jamila-alawi",
      username: "JA0033",
      nameEn: "Jamila Al-Alawi",
      nameAr: "جميلة العلوي",
      firstEn: "Jamila",
      lastEn: "Al-Alawi",
      firstAr: "جميلة",
      lastAr: "العلوي",
      empNum: "EMP-0033",
      email: `jamila.alawi@${domainHost}`,
      phone: "+97339000033",
      dept: "d-fin",
      role: "accountant",
      titleEn: "Payroll Specialist (On Leave / Suspended)",
      titleAr: "أخصائية رواتب (موقوفة مؤقتاً)",
      salary: 950,
      hrStatus: "on_leave",
      mfaEnabled: false,
      mfaSecret: null,
      mfaStep: null,
      mfaPendingSecret: `pend:${sha256(`${company.slug}:mfa-pend:jamila`)}`,
      mfaPendingExpires: ahead(1),
      resetToken: null,
      resetExpires: null,
      archivedAt: null,
      archivedBy: null,
      suspendedAt: ago(5),
      suspendedBy: "super-admin",
      suspensionReason: "Temporary clearance review during annual compliance audit",
    },
  ];
  for (const ls of lifecycleStaff) {
    const pp = splitPhone(ls.phone);
    lines.push(
      ins(
        "identity.account",
        {
          realm: "staff",
          subject_id: ls.id,
          username: ls.username,
          email: ls.email,
          password_hash: defaultPasswordHash,
          roles: [ls.role],
          active: false,
          mfa_enabled: ls.mfaEnabled,
          mfa_secret_encrypted: ls.mfaSecret,
          mfa_pending_secret_encrypted: ls.mfaPendingSecret,
          mfa_pending_expires_at: ls.mfaPendingExpires,
          mfa_last_step: ls.mfaStep,
          reporting_to: "tariq-saleh",
          last_login_at: ago(35),
          created_at: ago(280),
          updated_at: ago(5),
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.staff_access",
        {
          realm: "staff",
          subject_id: ls.id,
          display_name: ls.nameEn,
          data_scopes: { sales: "own", finance: "own", hr: "own" },
          permission_overrides: {},
          updated_at: ago(5),
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.user",
        {
          id: ls.id,
          email: ls.email,
          full_name: ls.nameEn,
          password_hash: defaultPasswordHash,
          role: ls.role,
          permissions: ["profile.read"],
          avatar_url: `/api/files/avatars/${ls.id}.png`,
          signature_url: `/api/files/brand/signature.png`,
          phone: ls.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          department: ls.dept,
          department_id: ls.dept,
          manager_id: "tariq-saleh",
          is_active: false,
          last_login_at: ago(35),
          mfa_enabled: ls.mfaEnabled,
          mfa_secret_encrypted: ls.mfaSecret,
          mfa_pending_secret_encrypted: ls.mfaPendingSecret,
          mfa_pending_expires_at: ls.mfaPendingExpires,
          mfa_last_step: ls.mfaStep,
          reset_token: ls.resetToken,
          reset_expires_at: ls.resetExpires,
          discount_limit_percent: 0,
          commission_rate_percent: 0,
          archived_at: ls.archivedAt,
          archived_by_id: ls.archivedBy,
          suspended_at: ls.suspendedAt,
          suspended_by_id: ls.suspendedBy,
          suspension_reason: ls.suspensionReason,
          created_at: ago(280),
          updated_at: ago(5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee",
        {
          id: ls.id,
          employee_number: ls.empNum,
          user_id: ls.id,
          first_name_en: ls.firstEn,
          last_name_en: ls.lastEn,
          first_name_ar: ls.firstAr,
          last_name_ar: ls.lastAr,
          email: ls.email,
          phone: ls.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          job_title_en: ls.titleEn,
          job_title_ar: ls.titleAr,
          department_id: ls.dept,
          hire_date: "2024-03-01",
          status: ls.hrStatus,
          basic_salary: ls.salary,
          housing_allowance: 100,
          transport_allowance: 60,
          other_allowances: 40,
          cpr_number: ls.id === "murad-mansoor" ? "910511234" : "930822345",
          cpr_expiry_date: dateAhead(320),
          nationality: "Bahraini",
          date_of_birth: "1991-05-11T00:00:00Z",
          gender: ls.id === "murad-mansoor" ? "male" : "female",
          passport_number: ls.id === "murad-mansoor" ? "BH449032" : "BH449033",
          passport_country: "BH",
          passport_expiry_date: dateAhead(780),
          leave_balance_days: 0,
          reporting_to: "tariq-saleh",
          manager_id: "tariq-saleh",
          created_at: ago(280),
          updated_at: ago(5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 1. IDENTITY FULL COVERAGE ────────────────────────────────────────────────
  lines.push(`\n-- IDENTITY: ROLES, PERMISSIONS, SESSIONS, TOKENS & PROJECTIONS`);
  const roles = [
    { id: "super_admin", en: "Super Administrator", ar: "المسؤول العام" },
    { id: "admin", en: "Company Admin", ar: "مدير النظام" },
    { id: "finance_manager", en: "Finance Manager", ar: "المدير المالي" },
    { id: "operations_manager", en: "Operations Manager", ar: "مدير العمليات" },
    { id: "project_lead", en: "Project Lead", ar: "مدير المشروع" },
    { id: "sales", en: "Sales Executive", ar: "تنفيذي مبيعات" },
    { id: "accountant", en: "Accountant", ar: "محاسب" },
    { id: "editor", en: "Editor", ar: "محرر محتوى" },
    { id: "marketing", en: "Marketing Specialist", ar: "أخصائي تسويق" },
    { id: "viewer", en: "Viewer", ar: "مراقب عام" },
  ];
  const areas = ["sales", "finance", "hr", "inventory", "commerce", "delivery", "itsm", "workflow"];
  for (const r of roles) {
    lines.push(
      ins(
        "identity.role",
        {
          id: r.id,
          name_en: r.en,
          name_ar: r.ar,
          is_system: true,
          created_at: ago(365),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const defaultScope = ["super_admin", "admin"].includes(r.id)
      ? "all"
      : ["finance_manager", "operations_manager", "project_lead"].includes(r.id)
        ? "department"
        : "own";
    for (const area of areas) {
      const areaScope =
        r.id === "finance_manager" && area === "finance"
          ? "all"
          : r.id === "operations_manager" && ["inventory", "delivery"].includes(area)
            ? "all"
            : defaultScope;
      lines.push(
        ins(
          "identity.role_data_scope",
          { role: r.id, area, scope: areaScope },
          "ON CONFLICT (role, area) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "identity.staff_role_scope",
          { role_id: r.id, area, scope: areaScope },
          "ON CONFLICT (role_id, area) DO NOTHING",
        ),
      );
    }
    for (const area of areas) {
      for (const act of ["read", "create", "update", "delete"]) {
        const allowed =
          r.id === "super_admin" ||
          r.id === "admin" ||
          (r.id !== "viewer" && act === "read") ||
          (r.id === "finance_manager" && area === "finance") ||
          (r.id === "operations_manager" && ["inventory", "delivery", "workflow"].includes(area)) ||
          (r.id === "sales" && ["sales", "commerce"].includes(area) && act !== "delete");
        lines.push(
          ins(
            "identity.permission",
            {
              id: `perm-${r.id}-${area}-${act}`,
              role: r.id,
              resource: area,
              action: act,
              allowed,
              created_at: ago(365),
            },
            "ON CONFLICT (id) DO NOTHING",
          ),
        );
      }
    }
  }

  // Profile projections across all 31 active staff + first 25 customers (realm CHECK IN ('staff','customer'))
  staffRoster.forEach((s, idx) => {
    lines.push(
      ins(
        "identity.profile_projection",
        {
          realm: "staff",
          subject_id: s.id,
          version: idx + 1,
          delivered_version: idx + 1,
          deleted: false,
          updated_at: ago(idx % 10),
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
  });
  customers.slice(0, 25).forEach((c, idx) => {
    lines.push(
      ins(
        "identity.profile_projection",
        {
          realm: "customer",
          subject_id: c.id,
          version: 1,
          delivered_version: 1,
          deleted: false,
          updated_at: ago(idx % 14),
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
  });

  // Session families (staff incl. BA0001 + IT BA0001 + customers + 2 revoked) & refresh tokens
  const sfTargets = [
    { id: u("sf-staff-sa"), subjectId: "super-admin", realm: "staff", revokedAt: null, ip: "185.12.44.10" },
    { id: u("sf-it-sa"), subjectId: saItId, realm: "it", revokedAt: null, ip: "185.12.44.10" },
    ...staffRoster.slice(1, 13).map((s, idx) => ({
      id: u(`sf-staff-${idx + 1}`),
      subjectId: s.id,
      realm: "staff",
      revokedAt: idx === 11 ? ago(3) : null,
      ip: `185.12.44.${20 + idx}`,
    })),
    ...customers.slice(0, 6).map((c, idx) => ({
      id: u(`sf-cust-${idx + 1}`),
      subjectId: c.id,
      realm: "customer",
      revokedAt: idx === 5 ? ago(2) : null,
      ip: `89.148.10.${40 + idx}`,
    })),
  ];
  sfTargets.forEach((sf, i) => {
    lines.push(
      ins(
        "identity.session_family",
        {
          id: sf.id,
          subject_id: sf.subjectId,
          realm: sf.realm,
          expires_at: ahead(30 - (i % 10)),
          revoked_at: sf.revokedAt,
          created_at: ago(i % 15),
          user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0",
          client_ip: sf.ip,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.refresh_token",
        {
          token_hash: sha256(`${company.slug}:rt:${i}`),
          family_id: sf.id,
          consumed_at: i % 3 === 0 ? ago(1) : null,
          created_at: ago(i % 15),
        },
        "ON CONFLICT (token_hash) DO NOTHING",
      ),
    );
  });

  // Legacy sessions (incl. BA0001) & auth challenges
  staffRoster.slice(0, 12).forEach((s, i) => {
    lines.push(
      ins(
        "identity.session",
        {
          id: `sess-${i + 1}`,
          user_id: s.id,
          token: sha256(`${company.slug}:sess-tok:${i}`),
          ip_address: `185.12.44.${10 + i}`,
          user_agent: "Mozilla/5.0 Platform-Desktop/2.4",
          expires_at: ahead(14),
          created_at: ago(i % 7),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 0; i < 6; i++) {
    const s = staffRoster[i];
    const recoveryHash = sha256(`${company.slug}:mfa-rec:${s.id}:${i}`);
    lines.push(
      ins(
        "identity.mfa_recovery_code",
        {
          id: `mrec-${i + 1}`,
          realm: "staff",
          subject_id: s.id,
          user_id: s.id,
          code_hash: recoveryHash,
          used_at: i % 2 === 1 ? ago(12 - i) : null,
        },
        "ON CONFLICT (realm, subject_id, code_hash) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.auth_challenge",
        {
          id: `ach-${i + 1}`,
          user_id: s.id,
          email: staffEmail(s, domainHost),
          type: i % 2 === 0 ? "totp" : "email_otp",
          code_hash: sha256(`${company.slug}:ach:${i}`),
          expires_at: ahead(1),
          attempts: i % 2,
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.password_reset",
        {
          token_hash: sha256(`${company.slug}:pwreset:${s.id}:${i}`),
          realm: "staff",
          subject_id: s.id,
          expires_at: ahead(1),
          used_at: i % 2 === 0 ? ago(5 + i) : null,
          created_at: ago(6 + i),
        },
        "ON CONFLICT (token_hash) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.legacy_reset_challenge",
        {
          id: `lrc-${i + 1}`,
          realm: "staff",
          subject_id: s.id,
          code_hash: sha256(`${company.slug}:lrc:${i}`),
          kind: i % 2 === 0 ? "password_reset" : "invitation",
          used_at: i % 2 === 0 ? ago(8 + i) : null,
          attempts: i % 3,
          expires_at: ahead(2),
          created_at: ago(10 + i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // Customer OTP codes, social OAuth providers, and OAuth states
  customers.slice(0, 12).forEach((c, i) => {
    lines.push(
      ins(
        "identity.customer_code",
        {
          id: `ccode-${i + 1}`,
          email: c.email,
          hash_kind: i % 2 === 0 ? "sha256" : "hmac",
          code_hash: sha256(`${company.slug}:ccode:${c.email}`),
          attempts: i % 3,
          expires_at: ahead(1),
          used_at: i % 2 === 0 ? ago(2) : null,
        },
        "ON CONFLICT (email) DO NOTHING",
      ),
    );
    if (i < 8) {
      const prov = i % 2 === 0 ? "google" : "apple";
      lines.push(
        ins(
          "identity.customer_provider",
          {
            provider: prov,
            provider_subject: `${prov}-sub-${company.prefix}-${1000 + i}`,
            realm: "customer",
            subject_id: c.id,
            created_at: ago(30 + i * 3),
          },
          "ON CONFLICT (provider, provider_subject) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "identity.oauth_state",
          {
            state_hash: sha256(`${company.slug}:oauth:${i}`),
            provider: prov,
            redirect_uri: `https://${domainHost}/api/auth/oauth/callback`,
            next_path: i % 2 === 0 ? "/account/orders" : "/checkout",
            locale: i % 2 === 0 ? "en" : "ar",
            secret_encrypted: sha256(`${company.slug}:oauth-sec:${i}`),
            claims_encrypted: i < 5 ? sha256(`${company.slug}:oauth-claims:${i}`) : null,
            exchanging_at: i < 5 ? ago(1) : null,
            consumed_at: i < 5 ? ago(1) : null,
            expires_at: ahead(1),
            created_at: ago(1),
          },
          "ON CONFLICT (state_hash) DO NOTHING",
        ),
      );
    }
  });

  // ── 2. CMS SNAPSHOTS & WEBSITE CONTENT ──────────────────────────────────────
  lines.push(`\n-- CMS: WEBSITE CONTENT, CONTENT SNAPSHOTS & SOCIAL INSIGHT SNAPSHOTS`);
  const publishedSitePayload = {
    company: {
      nameEn: company.nameEn,
      nameAr: company.nameAr,
      shortEn: company.shortEn,
      shortAr: company.shortAr,
      taglineEn: company.taglineEn,
      taglineAr: company.taglineAr,
      aboutEn: company.aboutEn,
      aboutAr: company.aboutAr,
    },
    hero: {
      titleEn: `${company.shortEn} — ${company.taglineEn}`,
      titleAr: `${company.shortAr} — ${company.taglineAr}`,
      ctaLabelEn: `Explore ${company.shortEn}`,
      ctaLabelAr: `استكشف ${company.shortAr}`,
    },
    featuredServices: svcList.slice(0, 4).map((s) => ({ code: s.code, en: s.en, ar: s.ar, rate: s.rate })),
  };
  lines.push(
    ins(
      "cms.website_content",
      {
        id: "main",
        draft: publishedSitePayload,
        published: publishedSitePayload,
        previous: {
          ...publishedSitePayload,
          hero: { ...publishedSitePayload.hero, titleEn: `${company.nameEn} Official Portal` },
        },
        revision: 4,
        published_at: ago(2),
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  for (let i = 1; i <= 3; i++) {
    lines.push(
      ins(
        "cms.content_snapshot",
        {
          id: `snap-${i}`,
          draft: { ...publishedSitePayload, version: i },
          published: i <= 2 ? publishedSitePayload : null,
          revision: i,
          published_at: i <= 2 ? ago(15 - i * 5) : null,
          updated_at: ago(15 - i * 5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  const platforms = ["instagram", "linkedin", "youtube", "tiktok"];
  platforms.forEach((pl, pIdx) => {
    for (const daysBack of [7, 30, 90]) {
      lines.push(
        ins(
          "cms.social_insight_snapshot",
          {
            id: `sis-${pl}-${daysBack}d`,
            platform: pl,
            source_provider: pl,
            source_account_id: company.slug,
            period_days: daysBack,
            period_start: ago(daysBack),
            period_end: now,
            time_zone: "Asia/Bahrain",
            metrics: {
              impressions: (18500 + pIdx * 3400) * Math.ceil(daysBack / 7),
              reach: (12400 + pIdx * 2100) * Math.ceil(daysBack / 7),
              engagement_rate: Number((4.8 + pIdx * 0.6).toFixed(2)),
              profile_visits: 920 + pIdx * 240,
            },
            native_metrics: {
              followers: 4200 + pIdx * 1350,
              link_clicks: 380 + pIdx * 95,
              saves: 210 + pIdx * 45,
            },
            recorded_at: ago(daysBack === 7 ? 0 : daysBack === 30 ? 3 : 7),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  });
  for (let i = 1; i <= 12; i++) {
    for (const snapIdx of [1, 2]) {
      lines.push(
        ins(
          "cms.social_post_snapshot",
          {
            id: `sps-${i}-${snapIdx}`,
            post_id: `spost-${i}`,
            source_account_id: company.slug,
            recorded_at: ago(snapIdx === 1 ? 7 : 1),
            counters: {
              likes: 120 + i * 24 + snapIdx * 18,
              comments: 14 + i * 3 + snapIdx * 2,
              shares: 9 + i * 2 + snapIdx,
              views: 2100 + i * 480 + snapIdx * 310,
              saves: 28 + i * 5 + snapIdx * 4,
            },
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 3. COMMERCE & DELIVERY FULL UNCONDITIONAL COVERAGE ───────────────────────
  lines.push(`\n-- COMMERCE & DELIVERY: AUTH, SESSIONS, REGIONS, COUPONS, POS, ORDERS & SHIPMENTS`);
  customers.slice(0, 12).forEach((c, i) => {
    lines.push(
      ins(
        "commerce.customer_auth_code",
        {
          id: `cauth-${i + 1}`,
          email: c.email,
          code_hash: sha256(`${company.slug}:cauth:${i}`),
          attempts: i % 2,
          expires_at: ahead(1),
          used_at: i % 2 === 0 ? ago(2) : null,
          created_at: ago(2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  customers.slice(0, 20).forEach((c, i) => {
    lines.push(
      ins(
        "commerce.customer_session",
        {
          id: `csess-${i + 1}`,
          customer_id: c.id,
          token_hash: sha256(`${company.slug}:csess:${i}`),
          expires_at: ahead(14),
          user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1",
          created_at: ago(i % 7),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Ensure all 6 GCC regions exist even if company.hasStore === false
  for (const r of [
    { id: "reg-bh", code: "BH", en: "Bahrain", ar: "البحرين", mult: 1.0, br: "br-hq" },
    { id: "reg-sa", code: "SA", en: "Saudi Arabia", ar: "المملكة العربية السعودية", mult: 1.05, br: "br-hq" },
    { id: "reg-ae", code: "AE", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة", mult: 1.05, br: "br-seef" },
    { id: "reg-kw", code: "KW", en: "Kuwait", ar: "الكويت", mult: 1.08, br: "br-muharraq" },
    { id: "reg-qa", code: "QA", en: "Qatar", ar: "قطر", mult: 1.05, br: "br-riffa" },
    { id: "reg-om", code: "OM", en: "Oman", ar: "عُمان", mult: 1.04, br: "br-sitra" },
  ]) {
    lines.push(
      ins(
        "commerce.store_region",
        {
          id: r.id,
          code: r.code,
          name_en: r.en,
          name_ar: r.ar,
          currency: cur,
          default_language: "ar",
          branch_id: r.br,
          is_enabled: true,
          price_multiplier: r.mult,
          settings: { vatRate: r.code === "BH" ? 10 : 5, expressAvailable: true },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Coupons (all 18 columns populated)
  for (const cp of [
    { id: "cpn-welcome10", code: "WELCOME10", type: "percent", val: 10, min: 15, maxD: 50, lim: 500, used: 14 },
    { id: "cpn-vip15", code: "VIP15", type: "percent", val: 15, min: 50, maxD: 120, lim: 200, used: 22 },
    { id: "cpn-fixed25", code: "SAVE25", type: "fixed", val: 25, min: 150, maxD: 25, lim: 100, used: 9 },
    { id: "cpn-corp12", code: "CORP12", type: "percent", val: 12, min: 100, maxD: 200, lim: 250, used: 19 },
    { id: "cpn-launch20", code: "LAUNCH20", type: "percent", val: 20, min: 75, maxD: 150, lim: 150, used: 31 },
    { id: "cpn-weekend5", code: "WEEKEND5", type: "fixed", val: 5, min: 25, maxD: 5, lim: 300, used: 42 },
  ]) {
    lines.push(
      ins(
        "commerce.coupon",
        {
          id: cp.id,
          code: cp.code,
          discount_type: cp.type,
          discount_value: cp.val,
          min_order_amount: cp.min,
          max_discount_amount: cp.maxD,
          starts_at: ago(60),
          expires_at: ahead(180),
          usage_limit: cp.lim,
          usage_count: cp.used,
          is_active: true,
          created_at: ago(60),
          kind: cp.type,
          value: cp.val,
          min_order: cp.min,
          ends_at: ahead(180),
          max_uses: cp.lim,
          used_count: cp.used,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // POS Registers, Shifts & Closings across all 25 companies (12 shifts + 12 closings)
  for (const reg of [
    { id: "reg-pos-1", name: "Main Counter POS", code: "POS-01", br: "br-hq" },
    { id: "reg-pos-2", name: "Seef District Counter", code: "POS-02", br: "br-seef" },
    { id: "reg-pos-3", name: "Muharraq Branch Terminal", code: "POS-03", br: "br-muharraq" },
    { id: "reg-pos-4", name: "Riffa Express Desk", code: "POS-04", br: "br-riffa" },
  ]) {
    lines.push(
      ins(
        "commerce.retail_register",
        {
          id: reg.id,
          name: reg.name,
          branch_id: reg.br,
          is_active: true,
          code: reg.code,
          revision: 1,
          created_at: ago(120),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 12; i++) {
    const shId = `rsh-${String(i).padStart(3, "0")}`;
    const regIdx = ((i - 1) % 4) + 1;
    const regId = `reg-pos-${regIdx}`;
    const cashier = i % 2 === 1 ? "nawaf-hashim" : "nadia-fakhro";
    const brId = ["br-hq", "br-seef", "br-muharraq", "br-riffa"][regIdx - 1];
    const cashSales = Number((180 + i * 42.5).toFixed(3));
    const cardSales = Number((320 + i * 55.25).toFixed(3));
    const returnsAmt = i % 4 === 0 ? 25.0 : 0;
    const otherAmt = i % 3 === 0 ? 45.0 : 15.0;
    const totSales = Number((cashSales + cardSales + otherAmt).toFixed(3));
    const startCash = 100;
    const closeCash = Number((startCash + cashSales - returnsAmt).toFixed(3));
    lines.push(
      ins(
        "commerce.retail_shift",
        {
          id: shId,
          register_id: regId,
          cashier_id: cashier,
          opened_at: ago(13 - i),
          closed_at: i <= 11 ? ago(12 - i) : now,
          starting_cash: startCash,
          closing_cash: closeCash,
          expected_cash: closeCash,
          status: i <= 11 ? "closed" : "open",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.retail_closing",
        {
          id: `rcls-${String(i).padStart(3, "0")}`,
          shift_id: shId,
          closing_date: dateAgo(13 - i),
          total_sales: totSales,
          total_cash: cashSales,
          total_card: cardSales,
          notes: `Verified Z-report closing #${i} for ${regId} (${brId})`,
          branch_id: brId,
          level: "register",
          target_id: regId,
          business_date: ago(13 - i),
          closed_at: ago(13 - i),
          closed_by_id: i % 2 === 0 ? "layla-nasser" : "super-admin",
          total_returns: returnsAmt,
          total_other: otherAmt,
          cash_variance: i === 6 ? -1.5 : 0,
          snapshot: { register: regId, shift: shId, transactions: 12 + i },
          signature: `sig:rcls:${pfx}:${i}`,
          journal_id: `je-${String(((i - 1) % 22) + 1).padStart(3, "0")}`,
          status: "reconciled",
          revision: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Delivery baseline if !hasLogistics, plus additional route sheets / vehicles / shipments for ALL 25 companies
  const deliveryZones = [
    { id: "dz-manama", en: "Capital Governorate" },
    { id: "dz-muharraq", en: "Muharraq Governorate" },
    { id: "dz-northern", en: "Northern Governorate" },
    { id: "dz-southern", en: "Southern Governorate" },
  ];
  if (!hasLogistics) {
    for (const drvId of ["tariq-saleh", "noor-hamdan", "karim-fawzi", "rashid-qahtani", "salman-bader", "jassim-hilal"]) {
      const drv = staffRoster.find((x) => x.id === drvId);
      if (drv) {
        lines.push(
          ins(
            "delivery.driver_ref",
            {
              employee_id: drv.id,
              user_id: drv.id,
              name_en: drv.nameEn,
              name_ar: drv.nameAr,
              phone: drv.phone || `+9733900${1000 + staffRoster.indexOf(drv)}`,
              department_id: drv.dept,
              status: "active",
              updated_at: now,
            },
            "ON CONFLICT (employee_id) DO NOTHING",
          ),
        );
      }
    }
    deliveryZones.forEach((z, zIdx) => {
      for (const slot of [
        { s: "09:00", e: "13:00", k: "am" },
        { s: "14:00", e: "18:00", k: "pm" },
      ]) {
        lines.push(
          ins(
            "delivery.delivery_slot",
            { id: `dslot-${z.id}-${slot.k}`, zone_id: z.id, weekday: (zIdx % 5) + 1, slot_start: slot.s, slot_end: slot.e, capacity: 16, is_active: true, created_at: now },
            "ON CONFLICT (id) DO NOTHING",
          ),
        );
      }
    });
    for (const cag of [
      { id: "cag-smsa", name: "SMSA Express Bahrain", contact: "Dispatch Desk", email: "dispatch@smsa.example.bh", phone: "+97317400001", api: "https://api.smsa.example.bh/v1" },
      { id: "cag-aramex", name: "Aramex Gulf Express", contact: "Operations Hub", email: "hub@aramex.example.bh", phone: "+97317400002", api: "https://api.aramex.example.bh/v1" },
    ]) {
      const pp = splitPhone(cag.phone);
      lines.push(
        ins(
          "delivery.courier_agency",
          { id: cag.id, name: cag.name, contact_name: cag.contact, email: cag.email, phone: cag.phone, country_code: pp.country_code, mobile_number: pp.mobile_number, api_endpoint: cag.api, is_active: true, created_at: now },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (const v of [
      { id: "veh-01", plate: "BH-44102", name: `${company.shortEn} Van 01`, kind: "van", notes: "Manama & Capital primary chilled van" },
      { id: "veh-02", plate: "BH-44108", name: `${company.shortEn} Van 02`, kind: "van", notes: "Muharraq & Hidd express delivery van" },
      { id: "veh-03", plate: "BH-44215", name: `${company.shortEn} Pickup 03`, kind: "truck", notes: "Riffa & Southern bulk cargo pickup" },
      { id: "veh-04", plate: "BH-44309", name: `${company.shortEn} Courier Bike 04`, kind: "motorcycle", notes: "Seef & Diplomat Area rapid bike" },
    ]) {
      lines.push(
        ins(
          "delivery.vehicle",
          { id: v.id, plate: v.plate, name: v.name, kind: v.kind, notes: v.notes, is_active: true, created_at: now, updated_at: now },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  // Additional courier agencies, evening slots, vehicles, route sheets & COD settlements for ALL 25 companies
  for (const cag of [
    { id: "cag-dhl", name: "DHL Express Bahrain", contact: "Muharraq Air Hub", email: "bh-ops@dhl.example.bh", phone: "+97317400003", api: "https://api.dhl.example.bh/v2" },
    { id: "cag-zajel", name: "Zajel Instant Courier", contact: "Manama Dispatch", email: "support@zajel.example.bh", phone: "+97317400004", api: "https://api.zajel.example.bh/v1" },
  ]) {
    const pp = splitPhone(cag.phone);
    lines.push(
      ins(
        "delivery.courier_agency",
        {
          id: cag.id,
          name: cag.name,
          contact_name: cag.contact,
          email: cag.email,
          phone: cag.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          api_endpoint: cag.api,
          is_active: true,
          created_at: ago(180),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  deliveryZones.forEach((z, zIdx) => {
    lines.push(
      ins(
        "delivery.delivery_slot",
        {
          id: `dslot-${z.id}-eve`,
          zone_id: z.id,
          weekday: (zIdx % 5) + 1,
          slot_start: "18:30",
          slot_end: "21:30",
          capacity: 12,
          is_active: true,
          created_at: ago(90),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (const v of [
    { id: "veh-e1", plate: `BH-55101`, name: `${company.shortEn} Transit Van 05`, kind: "van", notes: "Sitra & Isa Town commercial route" },
    { id: "veh-e2", plate: `BH-55102`, name: `${company.shortEn} Box Truck 06`, kind: "truck", notes: "Heavy equipment & event rigging truck" },
    { id: "veh-e3", plate: `BH-55103`, name: `${company.shortEn} Express EV 07`, kind: "car", notes: "Diplomatic Area Priority Express" },
    { id: "veh-e4", plate: `BH-55104`, name: `${company.shortEn} Rapid Moto 08`, kind: "motorcycle", notes: "Same-hour document & parcel courier" },
  ]) {
    lines.push(
      ins(
        "delivery.vehicle",
        {
          id: v.id,
          plate: v.plate,
          name: v.name,
          kind: v.kind,
          notes: v.notes,
          is_active: true,
          created_at: ago(120),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let r = 1; r <= 8; r++) {
    const rsId = `rs-e${r}`;
    const drvId = r % 3 === 0 ? "jassim-hilal" : r % 2 === 1 ? "rashid-qahtani" : "salman-bader";
    const vehId = `veh-e${((r - 1) % 4) + 1}`;
    const collAmt = Number((180 + r * 45.5).toFixed(3));
    lines.push(
      ins(
        "delivery.route_sheet",
        {
          id: rsId,
          number: `${pfx}-RSE-${20 + r}`,
          driver_id: drvId,
          vehicle_id: vehId,
          status: r <= 6 ? "completed" : "in_progress",
          run_date: dateAgo(10 - r),
          created_at: ago(10 - r),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "delivery.cod_settlement",
        {
          id: `cods-e${r}`,
          sheet_id: rsId,
          driver_id: drvId,
          amount_collected: collAmt,
          amount_settled: r <= 6 ? collAmt : 0,
          status: r <= 6 ? "settled" : "pending",
          settled_at: r <= 6 ? ago(Math.max(0, 9 - r)) : null,
          created_at: ago(10 - r),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Ensure orders 001..024 exist when company.hasStore === false, PLUS orders 025..060 for ALL 25 companies
  const orderStart = company.hasStore ? 25 : 1;
  for (let i = orderStart; i <= 60; i++) {
    const cust = customers[(i - 1) % customers.length];
    const p = prodList[(i - 1) % prodList.length];
    const pp = splitPhone(cust.phone);
    const ordId = `ord-${String(i).padStart(3, "0")}`;
    const ordNum = `${pfx}-ORD-${1000 + i}`;
    const invRefId = i <= 40 ? `inv-${String(i).padStart(3, "0")}` : null;
    const isCancelled = i >= 59;
    const isRefunded = i >= 59;
    const discAmt = i % 5 === 0 ? 2.5 : 0;
    const sub = Number(p.price.toFixed(3));
    const vat = Number(((sub - discAmt) * 0.1).toFixed(3));
    const tot = Number((sub - discAmt + vat + 2.0).toFixed(3));
    const shpIdx = i <= 56 ? i : null;
    const shpRefId = shpIdx ? `shp-${String(shpIdx).padStart(3, "0")}` : null;
    const trkTok = shpIdx ? (shpIdx <= 20 ? `trk-${pfx.toLowerCase()}-${500 + shpIdx}` : `trk-${pfx.toLowerCase()}-${600 + shpIdx}`) : null;
    const ordStatus = isCancelled ? "cancelled" : i <= 40 ? "delivered" : i <= 50 ? "shipped" : "processing";
    lines.push(
      ins(
        "commerce.sales_order",
        {
          id: ordId,
          number: ordNum,
          customer_id: cust.id,
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          email: cust.email,
          name: cust.nameEn,
          phone: cust.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          channel: i % 3 === 0 ? "pos" : "storefront",
          status: ordStatus,
          payment_status: isRefunded ? "refunded" : "paid",
          payment_method: i % 2 === 0 ? "card" : "benefitpay",
          fulfilment: "delivery",
          shipping_address: { line1: `Building ${100 + i}, Road 28`, city: cust.city, country: "BH" },
          subtotal: sub,
          discount_amount: discAmt,
          coupon_code: i % 5 === 0 ? "WELCOME10" : null,
          vat_amount: vat,
          delivery_fee: 2.0,
          total: tot,
          amount_paid: tot,
          amount_refunded: isRefunded ? tot : 0,
          currency: cur,
          locale: i % 2 === 0 ? "en" : "ar",
          note: `Enterprise order #${i} for ${cust.nameEn}`,
          warehouse_id: i % 4 === 0 ? "wh-hub" : "wh-main",
          invoice_id: invRefId,
          shipment_id: shpRefId,
          shipment_status: shpRefId ? (i <= 40 ? "delivered" : "out_for_delivery") : null,
          tracking_token: trkTok,
          created_by_id: i % 4 === 0 ? "super-admin" : i % 2 === 0 ? "noor-hamdan" : "nawaf-hashim",
          placed_at: ago(Math.max(1, 65 - i)),
          paid_at: ago(Math.max(1, 65 - i)),
          shipped_at: !isCancelled && i <= 50 ? ago(Math.max(1, 64 - i)) : null,
          delivered_at: !isCancelled && i <= 40 ? ago(Math.max(0, 63 - i)) : null,
          cancelled_at: isCancelled ? ago(2) : null,
          utm_campaign: i % 3 === 0 ? `${company.slug}_c1` : null,
          utm_source: i % 3 === 0 ? "instagram" : "direct",
          utm_medium: i % 3 === 0 ? "social" : "web",
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.sales_order_line",
        {
          id: `ordl-${i}-1`,
          order_id: ordId,
          product_id: `prod-${((i - 1) % prodList.length) + 1}`,
          variant_key: "STD",
          sku: p.sku,
          description: p.en,
          quantity: 1,
          unit_price: sub,
          vat_exempt: false,
          line_total: sub,
          location_id: i % 4 === 0 ? "loc-b1" : "loc-a1",
          returned_quantity: isRefunded ? 1 : 0,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.sales_order_event",
        {
          id: `orde-${i}-1`,
          order_id: ordId,
          kind: isCancelled ? "cancelled" : "placed",
          status: ordStatus,
          note: isCancelled ? "Customer requested full order refund" : "Order confirmed & scheduled",
          amount: tot,
          by_id: "super-admin",
          created_at: ago(Math.max(1, 65 - i)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Delivery order_ref & shipments
  const refStart = hasLogistics ? (company.hasStore ? 25 : 21) : 1;
  for (let i = refStart; i <= 60; i++) {
    const cust = customers[(i - 1) % customers.length];
    const p = prodList[(i - 1) % prodList.length];
    const pp = splitPhone(cust.phone);
    lines.push(
      ins(
        "delivery.order_ref",
        {
          order_id: `ord-${String(i).padStart(3, "0")}`,
          order_number: `${pfx}-ORD-${1000 + i}`,
          customer_id: cust.id,
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          recipient_name: cust.nameEn,
          recipient_phone: cust.phone,
          recipient_country_code: pp.country_code,
          recipient_mobile_number: pp.mobile_number,
          status: i <= 40 ? "delivered" : i <= 50 ? "shipped" : "processing",
          total: Number((p.price * 1.1 + 2).toFixed(3)),
          currency: cur,
          updated_at: now,
        },
        "ON CONFLICT (order_id) DO NOTHING",
      ),
    );
  }
  const shpStart = hasLogistics ? 21 : 1;
  for (let i = shpStart; i <= 56; i++) {
    const cust = customers[(i - 1) % customers.length];
    const pp = splitPhone(cust.phone);
    const shpId = `shp-${String(i).padStart(3, "0")}`;
    const ordId = `ord-${String(i).padStart(3, "0")}`;
    const z = deliveryZones[(i - 1) % deliveryZones.length];
    const shpStatus = i <= 40 ? "delivered" : i === 45 ? "failed_attempt" : "out_for_delivery";
    const deliveredAgo = Math.max(0, 56 - i);
    const rsId = `rs-e${((i - 1) % 8) + 1}`;
    const drvId = i % 3 === 0 ? "jassim-hilal" : i % 2 === 1 ? "rashid-qahtani" : "salman-bader";
    const vehId = `veh-e${((i - 1) % 4) + 1}`;
    const shpNum = i <= 20 ? `${pfx}-SHP-${500 + i}` : `${pfx}-SHP-${600 + i}`;
    const trkTok = i <= 20 ? `trk-${pfx.toLowerCase()}-${500 + i}` : `trk-${pfx.toLowerCase()}-${600 + i}`;
    lines.push(
      ins(
        "delivery.shipment",
        {
          id: shpId,
          number: shpNum,
          order_id: ordId,
          status: shpStatus,
          method: i % 5 === 0 ? "courier" : "fleet",
          zone_id: z.id,
          slot_id: `dslot-${z.id}-${i % 3 === 0 ? "eve" : i % 2 === 0 ? "pm" : "am"}`,
          slot_date: dateAgo(deliveredAgo),
          slot_start: i % 3 === 0 ? "18:30" : i % 2 === 0 ? "14:00" : "09:00",
          slot_end: i % 3 === 0 ? "21:30" : i % 2 === 0 ? "18:00" : "13:00",
          promised_by: ahead(1),
          recipient_name: cust.nameEn,
          recipient_phone: cust.phone,
          recipient_country_code: pp.country_code,
          recipient_mobile_number: pp.mobile_number,
          address: { line1: `Building ${120 + i}, Road 28`, city: cust.city, country: "BH" },
          cod_amount: i % 4 === 0 ? Number((20 + i * 2.5).toFixed(3)) : 0,
          cod_collected: i % 4 === 0 && i <= 40 ? Number((20 + i * 2.5).toFixed(3)) : 0,
          tracking_token: trkTok,
          attempts: i === 45 ? 2 : 1,
          failure_reason: i === 45 ? "Gate security pass required — rescheduled for evening slot" : null,
          out_at: ago(deliveredAgo + 1),
          delivered_at: shpStatus === "delivered" ? ago(deliveredAgo) : null,
          driver_id: drvId,
          vehicle_id: vehId,
          route_sheet_id: rsId,
          route_stop: ((i - 1) % 8) + 1,
          proof_photo_url: shpStatus === "delivered" ? `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png` : null,
          proof_signature: shpStatus === "delivered" ? `/api/files/brand/signature.png` : null,
          agency_id: i % 5 === 0 ? (i % 10 === 0 ? "cag-dhl" : "cag-smsa") : null,
          tracking_number: i % 5 === 0 ? `AWB-${pfx}-${8800 + i}` : null,
          created_at: ago(deliveredAgo + 2),
          updated_at: ago(deliveredAgo),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "delivery.shipment_event",
        {
          id: `shpe-${String(i).padStart(3, "0")}-1`,
          shipment_id: shpId,
          status: shpStatus,
          reason: i === 45 ? "recipient_unavailable" : null,
          note: `Scanned at ${cust.city} dispatch point`,
          by_id: drvId,
          at: ago(deliveredAgo),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 4. FINANCE FULL COVERAGE ─────────────────────────────────────────────────
  lines.push(`\n-- FINANCE: TAX RATES, DRAWERS, SESSIONS, ATTEMPTS, COLLECTIONS, WEBHOOKS & SNAPSHOTS`);
  for (const [idx, tr] of [
    { id: "tax-vat-10", code: "VAT-10", en: "Standard VAT 10%", ar: "ضريبة القيمة المضافة 10%", rate: 10, inv: true, qt: true },
    { id: "tax-vat-0", code: "VAT-0", en: "Zero-Rated VAT 0%", ar: "ضريبة القيمة المضافة 0%", rate: 0, inv: true, qt: true },
    { id: "tax-exempt", code: "EXEMPT", en: "VAT Exempt Supply", ar: "توريد معفى من الضريبة", rate: 0, inv: true, qt: false },
  ].entries()) {
    lines.push(
      ins(
        "finance.tax_rate",
        {
          id: tr.id,
          code: tr.code,
          name_en: tr.en,
          name_ar: tr.ar,
          rate_percent: tr.rate,
          registration_number: companyJson.company.vatId || `20001${pfx}0002`,
          certificate_url: "/api/files/media/banners/banner-01.png",
          certificate_valid_until: ahead(730),
          applies_to_invoices: tr.inv,
          applies_to_quotations: tr.qt,
          is_active: true,
          display_order: idx + 1,
          created_at: ago(365),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 4; i++) {
    lines.push(
      ins(
        "finance.cash_drawer",
        {
          id: `cd-${i}`,
          register_id: `reg-pos-${i}`,
          code: `DRW-0${i}`,
          name: `Primary Drawer POS-0${i}`,
          currency: cur,
          opening_float: 100,
          current_balance: Number((220 + i * 65.5).toFixed(3)),
          is_active: true,
          revision: 1,
          created_at: ago(120),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 12; i++) {
    const posIdx = ((i - 1) % 4) + 1;
    const expected = Number((320 + i * 35).toFixed(3));
    const actual = i === 6 ? Number((expected - 1.5).toFixed(3)) : expected;
    lines.push(
      ins(
        "finance.cashier_session",
        {
          id: `cs-${i}`,
          register_id: `reg-pos-${posIdx}`,
          drawer_id: `cd-${posIdx}`,
          cashier_id: i % 2 === 1 ? "nawaf-hashim" : "nadia-fakhro",
          shift_id: `rsh-${String(i).padStart(3, "0")}`,
          opened_at: ago(13 - i),
          closed_at: i <= 11 ? ago(12 - i) : now,
          opening_float: 100,
          closing_float: actual,
          expected_cash: expected,
          actual_cash: actual,
          cash_difference: Number((actual - expected).toFixed(3)),
          total_sales: Number((540 + i * 80).toFixed(3)),
          total_returns: i % 4 === 0 ? 25.0 : 0,
          status: i <= 11 ? "closed" : "open",
          note: `POS cashier reconciliation session #${i}`,
          revision: 1,
          created_at: ago(13 - i),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // Disjoint expense_id linkage (exp-035..040 unused by claims/commissions/bills!)
  for (let i = 1; i <= 8; i++) {
    lines.push(
      ins(
        "finance.agency_invoice",
        {
          id: `aginv-${i}`,
          agency_id: i % 2 === 1 ? "cag-smsa" : "cag-aramex",
          reference: `${pfx}-AG-${700 + i}`,
          invoice_date: ago(45 - i * 4),
          amount: Number((95 + i * 32.5).toFixed(3)),
          expense_id: i <= 6 ? `exp-${String(34 + i).padStart(3, "0")}` : null,
          created_by_id: i === 1 ? "super-admin" : "layla-nasser",
          created_at: ago(45 - i * 4),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 40; i++) {
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "finance.document_tax",
        {
          id: `doctax-inv-${i}`,
          invoice_id: `inv-${String(i).padStart(3, "0")}`,
          quotation_id: i <= 24 ? `qt-${String(i).padStart(3, "0")}` : null,
          tax_rate_id: "tax-vat-10",
          code: "VAT-10",
          name_en: "Standard VAT 10%",
          name_ar: "ضريبة القيمة المضافة 10%",
          rate_percent: 10,
          registration_number: companyJson.company.vatId || `20001${pfx}0002`,
          amount: Number((svc.rate * 0.1).toFixed(3)),
          display_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 24; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const attId = `patt-${i}`;
    const sessId = `cs-${((i - 1) % 12) + 1}`;
    const payId = `pay-${String(i).padStart(3, "0")}`;
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const ordId = `ord-${String(i).padStart(3, "0")}`;
    const gw = i % 3 === 0 ? "benefitpay" : i % 2 === 0 ? "tap" : "stripe";
    const status = i === 23 ? "failed" : i === 24 ? "refunded" : "succeeded";
    lines.push(
      ins(
        "finance.payment_attempt",
        {
          id: attId,
          order_id: ordId,
          gateway: gw,
          session_id: sessId,
          gateway_payment_id: `${gw.toUpperCase()}-TXN-${pfx}-${9000 + i}`,
          amount: Number((p.price * 1.1).toFixed(3)),
          currency: cur,
          status,
          test_mode: false,
          payment_id: status === "failed" ? null : payId,
          amount_refunded: status === "refunded" ? Number((p.price * 1.1).toFixed(3)) : 0,
          failure_reason: status === "failed" ? "3DS authentication timeout — retried successfully" : null,
          created_at: ago(30 - i),
          paid_at: status === "failed" ? null : ago(30 - i),
          updated_at: ago(30 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.payment_webhook_event",
        {
          gateway: gw,
          event_id: `evt-${gw}-${pfx}-${9000 + i}`,
          attempt_id: attId,
          received_at: ago(30 - i),
        },
        "ON CONFLICT (gateway, event_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.payment_collection",
        {
          id: `pcol-${i}`,
          number: `${pfx}-COL-${400 + i}`,
          branch_id: i % 4 === 0 ? "br-seef" : "br-hq",
          session_id: sessId,
          order_id: ordId,
          invoice_id: invId,
          amount: Number((p.price * 1.1).toFixed(3)),
          currency: cur,
          method_code: i % 2 === 0 ? "card" : "benefitpay",
          reference_number: `COL-REF-${pfx}-${500 + i}`,
          evidence: { gateway: gw, attemptId: attId, verified: true },
          status: "collected",
          collected_by_id: i === 1 ? "super-admin" : i % 2 === 0 ? "layla-nasser" : "nawaf-hashim",
          collected_at: ago(30 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  const cRules = ["crule-std", "crule-ent", "crule-ren", "crule-exec"];
  for (let i = 1; i <= 24; i++) {
    const svc = svcList[(i - 1) % svcList.length];
    const basis = Number(svc.rate.toFixed(3));
    const rate = [5.0, 7.5, 3.0, 10.0][(i - 1) % 4];
    const isRev = i >= 23;
    const revTarget = i === 23 ? "csnap-021" : i === 24 ? "csnap-022" : null;
    const commAmt = Number(((isRev ? -1 : 1) * ((basis * rate) / 100)).toFixed(3));
    lines.push(
      ins(
        "finance.commission_snapshot",
        {
          id: `csnap-${String(i).padStart(3, "0")}`,
          order_id: `ord-${String(i).padStart(3, "0")}`,
          order_line_id: `ordl-${i}-1`,
          attributed_user_id: i % 4 === 1 ? "super-admin" : i % 2 === 0 ? "sami-khoury" : "ahmed-zayani",
          rule_id: cRules[(i - 1) % cRules.length],
          rule_version: 1,
          rule_rate: rate,
          basis_amount: basis,
          commission_amount: commAmt,
          currency: cur,
          status: isRev ? "reversed" : i <= 14 ? "paid" : "earned",
          reversal_of_id: revTarget,
          calculation_details: { formula: "basis * rate / 100", invoice: `inv-${String(i).padStart(3, "0")}` },
          earned_at: ago(35 - i),
          created_by_id: "layla-nasser",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 5. HR FULL COVERAGE (GOSI, BENEFITS, ADJUSTMENTS, SUPPORT, ATTENDANCE & ALL PAYROLL LINES) ──
  lines.push(`\n-- HR: GOSI RULES, BENEFITS, LEAVE ADJUSTMENTS, SALARY CERTS, TAMKEEN SUPPORT & PAYROLL LINES`);
  lines.push(
    ins(
      "hr.gosi_settings",
      {
        id: "default",
        nationality_categories: {
          bahraini: { employeePercent: 8.0, employerPercent: 12.0, unempPercent: 1.0, injuryPercent: 3.0 },
          gcc: { employeePercent: 8.0, employerPercent: 11.0, injuryPercent: 3.0 },
          expat: { employeePercent: 1.0, employerPercent: 3.0, injuryPercent: 3.0 },
        },
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  for (const gc of [
    { id: "gosi-old-age", code: "GOSI-OLD", en: "Old Age, Disability & Survivors", ar: "التقاعد والعجز والوفاة", emp: 7.0, empr: 9.0 },
    { id: "gosi-injury", code: "GOSI-INJ", en: "Occupational Injury Insurance", ar: "إصابات العمل", emp: 0.0, empr: 3.0 },
    { id: "gosi-unemp", code: "GOSI-UNEMP", en: "Unemployment Insurance", ar: "التأمين ضد التعطل", emp: 1.0, empr: 1.0 },
    { id: "gosi-end-svc", code: "GOSI-EOS", en: "Expatriate End-of-Service Fund", ar: "صندوق نهاية الخدمة", emp: 0.0, empr: 4.2 },
  ]) {
    lines.push(
      ins(
        "hr.gosi_component",
        {
          id: gc.id,
          code: gc.code,
          name_en: gc.en,
          name_ar: gc.ar,
          employee_percent: gc.emp,
          employer_percent: gc.empr,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const bp of [
    { id: "bp-med-gold", code: "MED-GOLD", en: "Executive Medical & Dental Plan", ar: "التأمين الطبي الذهبي", cov: "Comprehensive hospital, outpatient & optical coverage across Bahrain", empr: 45, emp: 5 },
    { id: "bp-life", code: "LIFE-STD", en: "Group Life & Disability Cover", ar: "التأمين الجماعي على الحياة", cov: "24x monthly basic salary worldwide protection", empr: 12, emp: 0 },
    { id: "bp-edu", code: "EDU-ALLOW", en: "Certification & Upskilling Grant", ar: "منحة الشهادات المهنية والتطوير", cov: "Annual BHD 400 certification & conference reimbursement", empr: 25, emp: 0 },
    { id: "bp-wellness", code: "WELL-CLUB", en: "Fitness & Wellness Stipend", ar: "بدل اللياقة والعافية الصحية", cov: "Subsidized health club & annual medical screening", empr: 18, emp: 0 },
  ]) {
    lines.push(
      ins(
        "hr.benefit_plan",
        {
          id: bp.id,
          code: bp.code,
          name_en: bp.en,
          name_ar: bp.ar,
          coverage_details: bp.cov,
          employer_contribution: bp.empr,
          employee_contribution: bp.emp,
          created_at: ago(365),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 16; i++) {
    const s = i === 1 ? saStaff : staffRoster[(i - 1) % staffRoster.length];
    lines.push(
      ins(
        "hr.leave_adjustment",
        {
          id: `ladj-${i}`,
          employee_id: s.id,
          leave_type_id: i % 3 === 0 ? "lt-sick" : "lt-annual",
          year: 2026,
          days: i % 2 === 0 ? 2 : 3,
          reason: i % 2 === 0 ? "Weekend project delivery time-off in lieu" : "Annual carry-forward balance reconciliation",
          created_by_id: "fatima-khalifa",
          created_at: ago(40 - i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.salary_document",
        {
          id: `sdoc-${i}`,
          employee_id: s.id,
          kind: i % 3 === 0 ? "employment_verification" : "salary_certificate",
          months: ["2026-08", "2026-09", "2026-10"],
          status: i <= 12 ? "issued" : "pending_review",
          requested_by_id: s.id,
          reviewed_by_id: i <= 12 ? "fatima-khalifa" : null,
          review_notes: i <= 12 ? "Verified against approved payroll ledger" : null,
          snapshot: { employee: s.nameEn, basic: s.salary, currency: cur },
          created_at: ago(25 - i),
          issued_at: i <= 12 ? ago(24 - i) : null,
          updated_at: ago(24 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // Additional historical attendance entries (days 15..34, exact 18 schema columns, zero overlap with rich days 1..14)
  for (let d = 15; d <= 34; d++) {
    for (let sIdx = 0; sIdx < Math.min(20, staffRoster.length); sIdx++) {
      const s = staffRoster[sIdx];
      const isLeave = d % 11 === sIdx % 7;
      lines.push(
        ins(
          "hr.attendance_entry",
          {
            id: `att-${s.id}-d${d}`,
            employee_id: s.id,
            entry_date: dateAgo(d),
            date: dateAgo(d),
            check_in: isLeave ? null : sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '8 hours 1 minute'`),
            check_out: isLeave ? null : sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '17 hours 4 minutes'`),
            status: isLeave ? "on_leave" : "present",
            shift_type_id: s.dept === "d-log" || s.dept === "d-ops" ? "shf-evening" : "shf-morning",
            late_minutes: !isLeave && d % 5 === 0 ? 8 : 0,
            overtime_minutes: !isLeave && d % 4 === 0 && sIdx % 2 === 0 ? 30 : 0,
            overtime_night_minutes: 0,
            overtime_rest_day_minutes: !isLeave && d % 10 === 0 && sIdx % 4 === 0 ? 60 : 0,
            overtime_holiday_minutes: 0,
            source: "biometric",
            notes: isLeave ? "Approved leave entry" : "Historical attendance record verified",
            recorded_by_id: "fatima-khalifa",
            created_at: dateAgo(d),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  // Tamkeen National Employment & Wage Support records (hr.employee_support & hr.employee_support_event)
  staffRoster.slice(10, 20).forEach((s, i) => {
    const supId = `esup-${i + 1}`;
    lines.push(
      ins(
        "hr.employee_support",
        {
          id: supId,
          employee_id: s.id,
          program_id: i % 2 === 0 ? "sp-tamkeen-nes" : "sp-tamkeen-train",
          status: "approved",
          qualification: "B.Sc. / Diploma Graduate — Bahraini National",
          application_ref: `TMK-${pfx}-2026-${300 + i}`,
          applied_on: ago(240 - i * 5),
          decided_on: ago(225 - i * 5),
          start_month: "2026-02",
          end_month: "2027-01",
          approved_percent: i % 2 === 0 ? 50 : 30,
          approved_amount: i % 2 === 0 ? 250 : 180,
          monthly_cap: 300,
          notes: "Enrolled in Tamkeen wage support scheme",
          created_by_id: "fatima-khalifa",
          created_at: ago(240 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_support_event",
        {
          id: `esevt-${i + 1}-1`,
          support_id: supId,
          action: "submitted",
          details: { portal: "tamkeen.bh", ref: `TMK-${pfx}-${300 + i}` },
          actor_id: "fatima-khalifa",
          created_at: ago(240 - i * 5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_support_event",
        {
          id: `esevt-${i + 1}-2`,
          support_id: supId,
          action: "approved",
          details: { percent: i % 2 === 0 ? 50 : 30, periodMonths: 12 },
          actor_id: "super-admin",
          created_at: ago(225 - i * 5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  // Payroll item breakdown lines across ALL 6 months (5..10) x ALL 31 staff (incl. BA0001 super-admin!)
  for (const m of [5, 6, 7, 8, 9, 10]) {
    const mm = String(m).padStart(2, "0");
    staffRoster.forEach((s, idx) => {
      const piId = `pi-prun-2026-${mm}-${s.id}`;
      const housing = Math.round(s.salary * 0.12);
      const gosiDed = Number((s.salary * 0.07).toFixed(3));
      const bonusAmt = m === 10 && idx < 6 ? 120 : 0;
      const linesSpec = [
        { k: "earning", cat: "basic", lbl: "Basic Monthly Salary", amt: s.salary, note: `2026-${mm} base salary`, rec: null },
        { k: "earning", cat: "housing", lbl: "Housing Allowance", amt: housing, note: "Contractual housing benefit", rec: `recpay-${s.id}-housing` },
        { k: "earning", cat: "bonus", lbl: "Performance & Shift Stipend", amt: bonusAmt > 0 ? bonusAmt : 45, note: "Monthly operational allowance", rec: `recpay-${s.id}-transport` },
        { k: "deduction", cat: "gosi", lbl: "GOSI Social Insurance Contribution", amt: gosiDed, note: "Statutory Bahrain GOSI employee share", rec: null },
      ];
      linesSpec.forEach((sp, lIdx) => {
        lines.push(
          ins(
            "hr.payroll_item_line",
            {
              id: `pil-${mm}-${s.id}-${lIdx + 1}`,
              payroll_item_id: piId,
              kind: sp.k,
              category: sp.cat,
              label: sp.lbl,
              amount: sp.amt,
              note: sp.note,
              source: sp.rec ? "recurring" : "system",
              recurring_id: sp.rec,
              display_order: lIdx + 1,
              created_by_id: "latifa-shaker",
              created_at: ago(30),
            },
            "ON CONFLICT (id) DO NOTHING",
          ),
        );
      });
    });
  }

  // ── 6. INVENTORY PACKAGING, PACKAGES, SERIALS, TRACE EVENTS & ACKNOWLEDGMENTS ──
  lines.push(`\n-- INVENTORY: PACKAGING UNITS, PACKAGES, SERIALS, TRACE EVENTS & ACKNOWLEDGMENTS`);
  prodList.forEach((p, idx) => {
    const pid = `prod-${idx + 1}`;
    for (const [uIdx, pkg] of [
      { code: "UNIT", name: "Single Retail Unit", qty: 1, indiv: true },
      { code: "CASE12", name: "Master Carton (12 Units)", qty: 12, indiv: false },
    ].entries()) {
      lines.push(
        ins(
          "inventory.product_packaging_unit",
          {
            id: `ppu-${idx + 1}-${uIdx + 1}`,
            product_id: pid,
            code: pkg.code,
            name: pkg.name,
            base_units: pkg.qty,
            indivisible: pkg.indiv,
            barcode: `62911${pfx.charCodeAt(0)}${String(idx + 1).padStart(2, "0")}${uIdx + 1}${String(idx * 7).padStart(2, "0")}`,
            revision: 1,
            is_active: true,
            created_at: ago(180),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  });
  for (let i = 0; i < 6; i++) {
    const pid = `prod-${(i % prodList.length) + 1}`;
    lines.push(
      ins(
        "system.serial_generation",
        {
          id: u(`sgen-${i + 1}`),
          idempotency_key: `sgen-${pfx}-${i + 1}`,
          request_hash: sha256(`${company.slug}:sgen:${i}`),
          product_id: pid,
          variant_key: "STD",
          batch_key: `${pfx}-B26-${100 + i}`,
          location_id: "loc-a1",
          quantity: 6,
          created_by_id: i === 0 ? "super-admin" : "khalid-doseri",
          created_at: ago(30 - i * 4),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 0; i < 6; i++) {
    lines.push(
      ins(
        "inventory.stock_package",
        {
          id: u(`pkg-${i}`),
          code: `${pfx}-PLT-${100 + i}`,
          kind: "pallet",
          location_id: i % 2 === 0 ? "loc-a1" : "loc-b1",
          parent_id: null,
          status: "sealed",
          seal_number: `SEAL-P-${5000 + i}`,
          revision: 1,
          created_by_id: i === 0 ? "super-admin" : "khalid-doseri",
          created_at: ago(25 - i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_package",
        {
          id: u(`pkg-ctn-${i}`),
          code: `${pfx}-CTN-${200 + i}`,
          kind: "carton",
          location_id: i % 2 === 0 ? "loc-a1" : "loc-b1",
          parent_id: u(`pkg-${i}`),
          status: "packed",
          seal_number: `SEAL-C-${6000 + i}`,
          revision: 1,
          created_by_id: "hamad-ali",
          created_at: ago(24 - i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 36; i++) {
    const pIdx = (i - 1) % prodList.length;
    const pid = `prod-${pIdx + 1}`;
    const pkgIdx = (i - 1) % 6;
    lines.push(
      ins(
        "inventory.stock_serial",
        {
          id: u(`serial-${i}`),
          code: `${pfx}-SER-${10000 + i}`,
          product_id: pid,
          variant_key: "STD",
          batch_key: `${pfx}-B26-${100 + pIdx}`,
          location_id: i % 3 === 0 ? "loc-b1" : "loc-a1",
          manufacturer_serial: `MFG-${prodList[pIdx].sku}-${2000 + i}`,
          manufacturer_scope: "global",
          status: i <= 24 ? "in_stock" : "allocated",
          package_id: u(`pkg-ctn-${pkgIdx}`),
          generation_id: u(`sgen-${pkgIdx + 1}`),
          revision: 1,
          created_at: ago(22 - (i % 15)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_trace_event",
        {
          id: u(`trace-${i}`),
          entity_type: "serial",
          entity_id: u(`serial-${i}`),
          revision: 1,
          action: i <= 24 ? "received" : "allocated",
          actor_id: i === 1 ? "super-admin" : "khalid-doseri",
          details: { warehouse: "wh-main", batch: `${pfx}-B26-${100 + pIdx}` },
          created_at: ago(22 - (i % 15)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const allocId = `salloc-${String(i).padStart(3, "0")}`;
    const sender = i === 1 ? saStaff : staffRoster[i % staffRoster.length];
    const receiver = staffRoster[(i + 2) % staffRoster.length];
    for (const st of [
      { stage: "dispatch", actor: sender },
      { stage: "receipt", actor: receiver },
    ]) {
      lines.push(
        ins(
          "inventory.stock_acknowledgment",
          {
            id: u(`ack-${i}-${st.stage}`),
            allocation_id: allocId,
            revision: 1,
            stage: st.stage,
            actor_id: st.actor.id,
            signer_name: st.actor.nameEn,
            statement: `${st.stage === "dispatch" ? "Dispatched" : "Received & inspected"} stock allocation ${allocId} in good order.`,
            manifest: { allocation: allocId, items: 2, stage: st.stage },
            manifest_hash: sha256(`${company.slug}:ack:${allocId}:${st.stage}`),
            signature: `sig:${st.actor.id}:${allocId}`,
            created_at: ago(16 - i),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 7. ITSM, NOTIFY, REALTIME & SALES ATTRIBUTION ────────────────────────────
  lines.push(`\n-- ITSM, NOTIFY, REALTIME WINDOWS & SALES ATTRIBUTION`);
  for (const sp of [
    { id: "sp-tamkeen-nes", code: "NES-2026", en: "Tamkeen National Employment Support", ar: "برنامج تمكين لدعم التوظيف الوطني", prov: "Tamkeen Bahrain", months: 24 },
    { id: "sp-tamkeen-train", code: "TRN-2026", en: "Tamkeen Enterprise Upskilling Grant", ar: "منحة تمكين لتطوير المهارات المؤسسية", prov: "Tamkeen Bahrain", months: 12 },
    { id: "sp-lmra-onboard", code: "LMR-2026", en: "LMRA Skilled Talent Retention Subsidy", ar: "دعم استبقاء الكفاءات الوطنية", prov: "LMRA / SIO", months: 12 },
  ]) {
    lines.push(
      ins(
        "itsm.support_program",
        {
          id: sp.id,
          code: sp.code,
          name_en: sp.en,
          name_ar: sp.ar,
          provider: sp.prov,
          claim_period_months: sp.months,
          prorate: true,
          is_active: true,
          notes: `Official ${sp.prov} wage & certification support program`,
          created_at: ago(365),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (const [rIdx, wb] of ["basic_only", "gross_salary"].entries()) {
      lines.push(
        ins(
          "itsm.support_program_rule",
          {
            id: `spr-${sp.id}-${rIdx + 1}`,
            program_id: sp.id,
            effective_from: ago(365),
            effective_to: ahead(365),
            wage_basis: wb,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  for (let i = 1; i <= 12; i++) {
    const s = staffRoster[10 + (i % 10)];
    lines.push(
      ins(
        "itsm.support_reimbursement",
        {
          id: `sreimb-${i}`,
          employee_id: s.id,
          provider: "Tamkeen Bahrain",
          period_start: "2026-07-01",
          period_end: "2026-09-30",
          claimed_amount: 450,
          received_amount: i <= 10 ? 450 : 225,
          received_on: ago(25 - i),
          reference: `TMK-CLM-${pfx}-${100 + i}`,
          recorded_by_id: i === 1 ? "super-admin" : "fatima-khalifa",
          created_at: ago(25 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // Attachments linked to seeded tickets & ticket comments (NO id col!)
  for (let i = 1; i <= 24; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    lines.push(
      ins(
        "itsm.ticket_attachment",
        {
          ticket_id: u(`ticket:${i}`),
          file_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          file_name: `diagnostic-ticket-${String(i).padStart(2, "0")}.png`,
          mime_type: "image/png",
          file_size: 48200 + i * 1024,
          added_by: s.id,
          comment_id: u(`tkt-cmt:${i}`),
          created_at: ago(Math.max(1, 30 - i)),
        },
        "ON CONFLICT (ticket_id, file_url) DO NOTHING",
      ),
    );
  }

  // Notify category settings across ALL 31 staff (incl. super-admin) + IT admin
  const notifyUsers = [
    ...staffRoster.map((s) => ({ realm: "staff", id: s.id })),
    { realm: "it", id: saItId },
  ];
  for (const nu of notifyUsers) {
    for (const cat of ["system", "finance", "hr", "workflow"]) {
      lines.push(
        ins(
          "notify.category_setting",
          {
            realm: nu.realm,
            user_id: nu.id,
            category: cat,
            muted: false,
            sound: cat !== "system",
          },
          "ON CONFLICT (realm, user_id, category) DO NOTHING",
        ),
      );
    }
  }
  // Outbound notify messages & binary attachments
  for (let i = 1; i <= 24; i++) {
    const cust = customers[(i - 1) % customers.length];
    const msgId = u(`nmsg-${i}`);
    const isWa = i % 3 === 0;
    const isFail = i === 23;
    const isQueued = i === 24;
    lines.push(
      ins(
        "notify.message",
        {
          id: msgId,
          caller: i % 2 === 0 ? "finance-service" : "workflow-service",
          idempotency_key: `nmsg-${pfx}-${i}`,
          actor: i <= 3 ? "super-admin" : "layla-nasser",
          channel: isWa ? "whatsapp" : "email",
          recipient: isWa ? cust.phone : (i === 1 ? saEmail : cust.email),
          subject: isWa ? null : `${company.shortEn}: Document Notification #${i}`,
          body_text: `Official notice from ${company.nameEn} regarding transaction reference ${pfx}-${100 + i}.`,
          body_html: `<p>Official notice from <strong>${company.nameEn}</strong> regarding reference <code>${pfx}-${100 + i}</code>.</p>`,
          status: isFail ? "failed" : isQueued ? "queued" : "sent",
          attempts: isFail ? 3 : 1,
          provider: isWa ? "meta-whatsapp" : "resend",
          provider_id: isQueued || isFail ? null : `prov-${pfx}-${8000 + i}`,
          last_error: isFail ? "Temporary recipient SMTP 421 rate limit — scheduled retry" : null,
          created_at: ago(26 - i),
          updated_at: ago(26 - i),
          sent_at: isQueued || isFail ? null : ago(26 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 12) {
      lines.push(
        ins(
          "notify.attachment",
          {
            message_id: msgId,
            position: 1,
            filename: `${pfx}-Statement-${i}.pdf`,
            content_type: "application/pdf",
            content: hexBytea(`%PDF-1.4 ${company.slug} Notice #${i}`),
          },
          "ON CONFLICT (message_id, position) DO NOTHING",
        ),
      );
    }
  }
  for (let i = 1; i <= 8; i++) {
    const s = i === 1 ? saStaff : staffRoster[(i - 1) % staffRoster.length];
    lines.push(
      ins(
        "notify.mute",
        {
          realm: "staff",
          user_id: s.id,
          entity_type: i % 2 === 0 ? "ticket" : "project",
          entity_id: i % 2 === 0 ? u(`ticket:${i}`) : `prj-${String(i).padStart(3, "0")}`,
          until: ahead(7),
          created_at: ago(1),
        },
        "ON CONFLICT (realm, user_id, entity_type, entity_id) DO NOTHING",
      ),
    );
  }

  // Realtime presence windows (incl. BA0001 staff + IT)
  for (let i = 1; i <= 24; i++) {
    const isIt = i === 24;
    const s = isIt ? saItId : staffRoster[(i - 1) % staffRoster.length].id;
    lines.push(
      ins(
        "realtime.status_window",
        {
          id: u(`rsw-${i}`),
          realm: isIt ? "it" : "staff",
          user_id: s,
          source: i % 3 === 0 ? "leave" : "meeting",
          source_id: `mom-${String(((i - 1) % 16) + 1).padStart(3, "0")}`,
          kind: i % 3 === 0 ? "ooo" : "busy",
          starts_at: ahead(i),
          ends_at: ahead(i + 1),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Sales attribution audit trail (exact column names: from_user_id, to_user_id, changed_by_id)
  for (let i = 1; i <= 12; i++) {
    lines.push(
      ins(
        "sales.sales_attribution_change",
        {
          id: `attr-chg-${i}`,
          entity_type: "deal",
          entity_id: `deal-${i}`,
          from_user_id: "zaid-mansoor",
          to_user_id: i % 3 === 0 ? "super-admin" : i % 2 === 0 ? "ahmed-zayani" : "sami-khoury",
          changed_by_id: "super-admin",
          reason: "Territory rebalance & senior account director sponsorship",
          created_at: ago(25 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 8. SYSTEM ALL REMAINING 44 TABLES ─────────────────────────────────────────
  lines.push(`\n-- SYSTEM: GOVERNANCE, SECURITY, DOCS, COMMS, SETTLEMENTS, PAYSLIPS & SUPPORT REQUESTS`);
  for (const key of [
    "auth:login:ip:185.12.44.10",
    "auth:login:ip:89.148.10.40",
    "api:public:lead:rate",
    "api:store:checkout:rate",
  ]) {
    lines.push(
      ins(
        "system.abuse_window",
        { key, count: 2, expires_at: ahead(1) },
        "ON CONFLICT (key) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const s = staffRoster[i % staffRoster.length];
    lines.push(
      ins(
        "system.account_change_request",
        {
          id: `acr-${i}`,
          user_id: s.id,
          requested_by_id: s.id,
          before: { phone: `+9733900100${i}`, role: s.role },
          changes: { phone: `+9733999000${i}` },
          reason: "Updated official Bahrain mobile number",
          status: i <= 6 ? "approved" : "pending",
          decided_by_id: i <= 6 ? "super-admin" : null,
          review_notes: i <= 6 ? "Identity verified via HR directory" : null,
          decided_at: i <= 6 ? ago(20 - i) : null,
          created_at: ago(21 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // System activity log across BA0001 + leadership team (40 entries)
  for (let i = 1; i <= 40; i++) {
    const actor = i % 3 === 1 ? "super-admin" : staffRoster[(i - 1) % 10].id;
    lines.push(
      ins(
        "system.activity_log",
        {
          id: `act-${i}`,
          user_id: actor,
          action: i % 4 === 0 ? "payroll.approved" : i % 3 === 0 ? "invoice.posted" : i % 2 === 0 ? "deal.updated" : "policy.verified",
          entity_type: i % 4 === 0 ? "payroll_run" : i % 3 === 0 ? "invoice" : "deal",
          entity_id: i % 4 === 0 ? "prun-2026-10" : `inv-${String(((i - 1) % 40) + 1).padStart(3, "0")}`,
          details: { company: company.slug, actor, seq: i },
          diff_payload: { status: { before: "draft", after: "approved" } },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const ak of [
    { id: "key-erp-sync", name: "ERP Production Bridge", prefix: `pk_${pfx.toLowerCase()}_live`, scopes: ["finance:read", "inventory:write"], lim: 600, revoked: null },
    { id: "key-pos-term", name: "Retail POS Terminal Token", prefix: `pk_${pfx.toLowerCase()}_pos`, scopes: ["commerce:read", "commerce:write"], lim: 1200, revoked: null },
    { id: "key-legacy-rot", name: "Rotated Legacy Integration Key", prefix: `pk_${pfx.toLowerCase()}_old`, scopes: ["sales:read"], lim: 120, revoked: ago(15) },
  ]) {
    lines.push(
      ins(
        "system.api_key",
        {
          id: ak.id,
          name: ak.name,
          key_prefix: ak.prefix,
          key_hash: sha256(`${company.slug}:apikey:${ak.id}`),
          scopes: ak.scopes,
          rate_limit: ak.lim,
          last_used_at: ago(1),
          expires_at: ahead(365),
          created_by: "super-admin",
          created_at: ago(90),
          revoked_at: ak.revoked,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const ap of [
    { id: "apol-expense", target: "expense", minAmt: 500, minDays: null, minDisc: null, role: "finance_manager" },
    { id: "apol-leave", target: "leave_request", minAmt: null, minDays: 3, minDisc: null, role: "hr_manager" },
    { id: "apol-quotation", target: "quotation", minAmt: 1000, minDays: null, minDisc: 10, role: "admin" },
    { id: "apol-po", target: "purchase_order", minAmt: 1500, minDays: null, minDisc: null, role: "finance_manager" },
    { id: "apol-payroll", target: "payroll_run", minAmt: 5000, minDays: null, minDisc: null, role: "super_admin" },
    { id: "apol-contract", target: "contract", minAmt: 2000, minDays: null, minDisc: null, role: "super_admin" },
  ]) {
    lines.push(
      ins(
        "system.approval_policy",
        {
          id: ap.id,
          target_type: ap.target,
          enabled: true,
          allow_self_approval: false,
          reminder_after_hours: 24,
          created_at: ago(180),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.approval_policy_step",
        {
          id: `aps-${ap.target}-1`,
          policy_id: ap.id,
          order: 1,
          approver_mode: "role",
          role_key: ap.role,
          user_id: ap.role === "super_admin" ? "super-admin" : "layla-nasser",
          permission: `${ap.target}.approve`,
          min_amount: ap.minAmt,
          min_days: ap.minDays,
          min_discount_percent: ap.minDisc,
          escalate_after_hours: 48,
          escalate_mode: "user",
          escalate_role_key: "super_admin",
          escalate_user_id: "super-admin",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const isFailed = i === 7;
    lines.push(
      ins(
        "system.backup_record",
        {
          id: `bkp-${i}`,
          kind: i % 3 === 0 ? "bucket" : i % 2 === 0 ? "full" : "database",
          file_name: `${company.slug}-${i % 2 === 0 ? "full" : "pg"}-2026-10-${String(i).padStart(2, "0")}.tar.zst`,
          file_size: 48200000 + i * 2400000,
          checksum: sha256(`${company.slug}:bkp:${i}`),
          status: isFailed ? "failed" : "verified",
          error_message: isFailed ? "Transient S3 multipart timeout on chunk 4 — resolved on next run" : null,
          created_by: "super-admin",
          created_at: ago(10 - i),
          verified_at: isFailed ? null : ago(10 - i),
          details: { compression: "zstd", tables: 286, company: company.slug },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 6; i++) {
    const bcId = `bc-${i}`;
    lines.push(
      ins(
        "system.broadcast",
        {
          id: bcId,
          name: `${company.shortEn} Q${Math.ceil(i / 2)} Executive Update #${i}`,
          segment_id: i % 2 === 0 ? "seg-vip" : "seg-corp",
          campaign_id: `camp-${i}`,
          subject_en: `${company.shortEn}: Strategic Client Briefing #${i}`,
          subject_ar: `${company.shortAr}: نشرة العملاء التنفيذية رقم ${i}`,
          body_en: `Dear partner, explore the latest ${svcList[i % svcList.length].en} capabilities at ${company.shortEn}.`,
          body_ar: `عميلنا العزيز، تعرف على أحدث خدمات ${svcList[i % svcList.length].ar} لدى ${company.shortAr}.`,
          status: i <= 5 ? "sent" : "queued",
          created_by_id: i === 1 ? "super-admin" : "hana-yousef",
          queued_at: ago(20 - i * 2),
          sent_at: i <= 5 ? ago(19 - i * 2) : null,
          created_at: ago(21 - i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (let r = 0; r < 6; r++) {
      const cust = customers[(i * 6 + r) % customers.length];
      const recFail = i === 1 && r === 5;
      lines.push(
        ins(
          "system.broadcast_recipient",
          {
            id: `bcr-${i}-${r + 1}`,
            broadcast_id: bcId,
            customer_id: cust.id,
            email: cust.email,
            locale: r % 2 === 0 ? "en" : "ar",
            status: recFail ? "bounced" : "sent",
            error: recFail ? "550 5.1.1 Mailbox full on secondary relay" : null,
            sent_at: recFail ? null : ago(19 - i * 2),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // Calendar feed tokens & dashboard layouts for ALL 31 active staff (incl. BA0001 super-admin!)
  staffRoster.forEach((s, i) => {
    lines.push(
      ins(
        "system.calendar_feed_token",
        {
          id: `cft-${s.id}`,
          user_id: s.id,
          token_hash: sha256(`${company.slug}:ics:${s.id}`),
          last_used_at: ago(i % 5),
          created_at: ago(90),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.dashboard_layout",
        {
          user_id: s.id,
          widgets: [
            { id: "kpi-rev", x: 0, y: 0, w: 4, h: 2 },
            { id: "kpi-pipeline", x: 4, y: 0, w: 4, h: 2 },
            { id: "kpi-tasks", x: 8, y: 0, w: 4, h: 2 },
          ],
          scratchpad: { note: `${company.shortEn} priority tracker for ${s.nameEn}`, pinned: i === 0 },
          sidebar_prefs: { collapsed: false, locale: i % 2 === 0 ? "en" : "ar" },
          updated_at: now,
        },
        "ON CONFLICT (user_id) DO NOTHING",
      ),
    );
  });

  // Client contact persons & electronic signatures
  customers.slice(0, 30).forEach((c, i) => {
    const pp = splitPhone(c.phone);
    lines.push(
      ins(
        "system.client_contact_person",
        {
          id: `ccp-${i + 1}`,
          contact_id: `cnt-${i + 1}`,
          full_name: i % 2 === 0 ? `Faisal Al-Khalifa (${c.city})` : `Nadia Al-Banna (${c.city})`,
          position: i % 2 === 0 ? "Procurement Manager" : "Finance Controller",
          department: i % 2 === 0 ? "Procurement" : "Finance",
          email: c.email,
          phone: c.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          is_primary: true,
          notes: `Primary authorised signatory for ${c.nameEn}`,
          display_order: 1,
          created_at: ago(90),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 16; i++) {
    const cust = customers[(i - 1) % customers.length];
    const docType = i % 2 === 0 ? "quotation" : "contract";
    const isSigned = i <= 12;
    const isRevoked = i === 16;
    lines.push(
      ins(
        "system.client_signature",
        {
          id: `csig-${i}`,
          document_type: docType,
          document_id: docType === "quotation" ? `qt-${String(i).padStart(3, "0")}` : `wctr-${String(i).padStart(3, "0")}`,
          method: "otp_esign",
          status: isRevoked ? "revoked" : isSigned ? "signed" : "viewed",
          token_hash: sha256(`${company.slug}:csig:${i}`),
          expires_at: ahead(30),
          recipient_email: cust.email,
          signer_name: cust.nameEn,
          signer_title: "Authorised Signatory",
          signature_data: isSigned ? "/api/files/brand/signature.png" : null,
          signed_file_url: isSigned ? "/api/files/brand/stamp.png" : null,
          terms_text: "Signed under Bahrain Electronic Communications and Transactions Law No. 54 of 2018.",
          terms_accepted: isSigned,
          document_hash: sha256(`${company.slug}:doc-hash:${i}`),
          signed_ip: isSigned ? `185.12.50.${i}` : null,
          signed_user_agent: isSigned ? "Mozilla/5.0 Chrome/128.0" : null,
          signed_at: isSigned ? ago(20 - i) : null,
          viewed_at: ago(21 - i),
          revoked_at: isRevoked ? ago(1) : null,
          created_by_id: i === 1 ? "super-admin" : "sami-khoury",
          created_at: ago(22 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Communication threads, messages & attachments
  for (let i = 1; i <= 16; i++) {
    const thId = `cth-${i}`;
    const msg1Id = `cmsg-${i}-1`;
    const msg2Id = `cmsg-${i}-2`;
    const cust = customers[(i - 1) % customers.length];
    lines.push(
      ins(
        "system.communication_thread",
        {
          id: thId,
          subject: `${pfx}: Proposal & Scheduling Inquiry — ${cust.nameEn}`,
          status: i <= 10 ? "closed" : "open",
          contact_id: `cnt-${i}`,
          inquiry_id: `inq-${i}`,
          assigned_to: i % 3 === 1 ? "super-admin" : "sami-khoury",
          created_at: ago(30 - i),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.communication_message",
        {
          id: msg1Id,
          thread_id: thId,
          message_id: `<msg-${pfx}-${i}-1@${domainHost}>`,
          in_reply_to: null,
          direction: "inbound",
          from_email: cust.email,
          to_email: companyJson.company.email || `info@${domainHost}`,
          subject: `${pfx}: Proposal Request #${i}`,
          body_text: `Hello team, kindly share quotation ${pfx}-QT-2026-${200 + i} and availability.`,
          body_html: `<p>Hello team, kindly share quotation <strong>${pfx}-QT-2026-${200 + i}</strong>.</p>`,
          status: "received",
          delivery_log: { spf: "pass", dkim: "pass" },
          invoice_id: i <= 14 ? `inv-${String(i).padStart(3, "0")}` : null,
          quotation_id: `qt-${String(i).padStart(3, "0")}`,
          created_at: ago(30 - i),
          updated_at: ago(30 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.communication_message",
        {
          id: msg2Id,
          thread_id: thId,
          message_id: `<msg-${pfx}-${i}-2@${domainHost}>`,
          in_reply_to: `<msg-${pfx}-${i}-1@${domainHost}>`,
          direction: "outbound",
          from_email: i === 1 ? saEmail : `sales@${domainHost}`,
          to_email: cust.email,
          subject: `Re: ${pfx}: Proposal Request #${i}`,
          body_text: `Please find attached quotation ${pfx}-QT-2026-${200 + i} for your review.`,
          body_html: `<p>Please find attached quotation <strong>${pfx}-QT-2026-${200 + i}</strong>.</p>`,
          status: "delivered",
          delivery_log: { smtpCode: 250, tls: true },
          invoice_id: i <= 14 ? `inv-${String(i).padStart(3, "0")}` : null,
          quotation_id: `qt-${String(i).padStart(3, "0")}`,
          created_at: ago(29 - i),
          updated_at: ago(29 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.message_attachment",
        {
          id: `matt-${i}`,
          message_id: msg2Id,
          filename: `${pfx}-QT-2026-${200 + i}.pdf`,
          content_type: "application/pdf",
          size: 84200 + i * 512,
          storage_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          is_quarantined: false,
          created_at: ago(29 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 10; i++) {
    lines.push(
      ins(
        "system.company_document",
        {
          id: `cdoc-${i}`,
          title_en: ["Commercial Registration (CR)", "NBR VAT Registration Certificate", "LMRA Compliance Certificate", "GOSI Clearance Certificate", "ISO 9001:2015 Quality Manual", "Municipality Trade License", "Chamber of Commerce Certificate", "Information Security Policy", "Standard Vendor NDA", "Health & Safety Guidelines"][i - 1],
          title_ar: ["السجل التجاري", "شهادة ضريبة القيمة المضافة", "شهادة الامتثال لسوق العمل", "شهادة براءة ذمة التأمينات", "دليل الجودة ISO 9001", "الترخيص البلدي التجاري", "شهادة غرفة تجارة البحرين", "سياسة أمن المعلومات", "اتفاقية عدم الإفصاح", "إرشادات السلامة المهنية"][i - 1],
          category: i <= 4 ? "regulatory" : i <= 7 ? "licensing" : "governance",
          document_number: `${pfx}-DOC-2026-${String(i).padStart(3, "0")}`,
          file_url: "/api/files/media/banners/banner-01.png",
          file_size: 145000 + i * 8400,
          mime_type: "application/pdf",
          valid_from: ago(180),
          valid_until: ahead(365),
          notes: `Verified corporate document #${i} for ${company.nameEn}`,
          uploaded_by_id: i <= 3 ? "super-admin" : "dina-mansoor",
          created_at: ago(180),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const svc of ["identity", "finance", "hr", "inventory", "workflow", "gateway"]) {
    lines.push(
      ins(
        "system.debug_toggle",
        {
          id: `dbg-${svc}`,
          service: svc,
          log_level: svc === "gateway" ? "debug" : "info",
          enabled_by: "super-admin",
          enabled_at: ago(3),
          expires_at: ahead(7),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  const fxList = [
    { doc: "invoice", id: "inv-001", raw: 0.376, snap: "fx-usd", amt: 1000 },
    { doc: "invoice", id: "inv-002", raw: 10.0, snap: "fx-sar", amt: 4500 },
    { doc: "invoice", id: "inv-003", raw: 9.75, snap: "fx-aed", amt: 3200 },
    { doc: "invoice", id: "inv-004", raw: 0.409, snap: "fx-eur", amt: 850 },
    { doc: "invoice", id: "inv-005", raw: 0.482, snap: "fx-gbp", amt: 620 },
    { doc: "invoice", id: "inv-006", raw: 0.812, snap: "fx-kwd", amt: 540 },
    { doc: "quotation", id: "qt-001", raw: 0.376, snap: "fx-usd", amt: 1500 },
    { doc: "quotation", id: "qt-002", raw: 10.0, snap: "fx-sar", amt: 6000 },
    { doc: "quotation", id: "qt-003", raw: 9.75, snap: "fx-aed", amt: 4200 },
    { doc: "quotation", id: "qt-004", raw: 0.409, snap: "fx-eur", amt: 980 },
    { doc: "quotation", id: "qt-005", raw: 0.482, snap: "fx-gbp", amt: 740 },
    { doc: "quotation", id: "qt-006", raw: 0.812, snap: "fx-kwd", amt: 680 },
  ];
  fxList.forEach((f, i) => {
    const eff = Number((f.raw * 1.005).toFixed(4));
    lines.push(
      ins(
        "system.document_fx",
        {
          id: `dfx-${i + 1}`,
          document_type: f.doc,
          document_id: f.id,
          base_amount: f.amt,
          target_amount: Number((f.amt * (f.raw < 1 ? f.raw : 1 / f.raw)).toFixed(3)),
          raw_rate: f.raw,
          margin_percent: 0.5,
          effective_rate: eff,
          rate_snapshot_id: f.snap,
          created_at: ago(30 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (const [idx, dt] of [
    { id: "tpl-inv-b2b", slug: "vat-tax-invoice", en: "Bahrain NBR Tax Invoice", ar: "فاتورة ضريبية معتمدة", cat: "finance" },
    { id: "tpl-qt-pro", slug: "commercial-quotation", en: "Commercial Proposal & Quotation", ar: "عرض سعر تجاري", cat: "sales" },
    { id: "tpl-sal-cert", slug: "salary-certificate", en: "Official Salary & Employment Certificate", ar: "شهادة تعريف بالراتب", cat: "hr" },
    { id: "tpl-msa-std", slug: "master-service-agreement", en: "Master Services Agreement (MSA)", ar: "اتفاقية الخدمات الرئيسية", cat: "legal" },
    { id: "tpl-nda-std", slug: "mutual-nda", en: "Mutual Non-Disclosure Agreement", ar: "اتفاقية عدم الإفصاح المتبادلة", cat: "legal" },
    { id: "tpl-mom-exec", slug: "executive-mom", en: "Executive Minutes of Meeting", ar: "محضر اجتماع تنفيذي", cat: "workflow" },
    { id: "tpl-po-std", slug: "purchase-order", en: "Supplier Purchase Order", ar: "أمر شراء مورد", cat: "inventory" },
    { id: "tpl-eos-set", slug: "final-settlement-slip", en: "End-of-Service Final Settlement", ar: "مخالصة نهاية الخدمة", cat: "hr" },
  ].entries()) {
    lines.push(
      ins(
        "system.document_template",
        {
          id: dt.id,
          slug: dt.slug,
          name_en: dt.en,
          name_ar: dt.ar,
          category: dt.cat,
          body_html: `<h1>${dt.en}</h1><p>${company.nameEn} (${company.city}, Bahrain)</p>`,
          body_json: { titleEn: dt.en, titleAr: dt.ar, header: true, footer: true, stamp: true },
          version: 2,
          is_active: true,
          created_at: ago(180),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 16; i++) {
    const s = staffRoster[i % staffRoster.length];
    const isFail = i === 15;
    const isQueued = i === 16;
    lines.push(
      ins(
        "system.email_job",
        {
          id: `ejob-${i}`,
          event_key: `mom.minutes.${company.slug}.${i}`,
          mom_id: `mom-${String(i).padStart(3, "0")}`,
          created_by_id: i <= 2 ? "super-admin" : "tariq-saleh",
          recipient: i === 1 ? saEmail : staffEmail(s, domainHost),
          subject: `${company.shortEn} — Meeting Minutes Package MOM-${String(i).padStart(3, "0")}`,
          html: `<p>Meeting minutes #${i} distributed for action tracking.</p>`,
          attachment_name: `MOM-${String(i).padStart(3, "0")}.pdf`,
          attachment: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          status: isFail ? "failed" : isQueued ? "queued" : "sent",
          attempts: isFail ? 2 : 1,
          next_attempt_at: isFail ? ahead(1) : now,
          provider_id: isFail || isQueued ? null : `res-${pfx}-${400 + i}`,
          last_error: isFail ? "Temporary SMTP defer — retry queued" : null,
          accepted_at: isFail || isQueued ? null : ago(18 - i),
          created_at: ago(19 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Employment records for ALL 31 active staff (incl. BA0001 super-admin!) + 2 ended/historical records
  staffRoster.forEach((s, i) => {
    lines.push(
      ins(
        "system.employment_record",
        {
          id: `empr-${s.id}`,
          employee_id: s.id,
          contract_type: i < 20 ? "unlimited" : "fixed_term",
          basic_salary: s.salary,
          housing_allowance: Math.round(s.salary * 0.12),
          transport_allowance: 50,
          other_allowances: 30,
          payroll_settings: { currency: cur, payDay: 28, gosiEnabled: true },
          effective_from: "2025-01-01T00:00:00Z",
          effective_to: i >= 28 ? dateAhead(180) : null,
          is_current: true,
          created_at: ago(365),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (const ls of lifecycleStaff) {
    lines.push(
      ins(
        "system.employment_record",
        {
          id: `empr-${ls.id}`,
          employee_id: ls.id,
          contract_type: "unlimited",
          basic_salary: ls.salary,
          housing_allowance: 100,
          transport_allowance: 60,
          other_allowances: 40,
          payroll_settings: { currency: cur, payDay: 28, gosiEnabled: true },
          effective_from: "2024-03-01T00:00:00Z",
          effective_to: ago(30),
          is_current: false,
          created_at: ago(280),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Feature toggles across all 14 modules
  for (const ft of [
    ["web", "Public Corporate Portal", "البوابة المؤسسية"],
    ["store", "E-Commerce Storefront & Cart", "المتجر الإلكتروني"],
    ["pos", "Retail POS Registers", "نقاط البيع"],
    ["sales", "CRM, Leads & Quotations", "المبيعات والعروض"],
    ["finance", "General Ledger & Invoicing", "المالية والفواتير"],
    ["hr", "HR, Attendance & GOSI Payroll", "الموارد البشرية والرواتب"],
    ["inventory", "Multi-Warehouse & Serial Tracking", "المخزون والتتبع"],
    ["delivery", "Fleet Dispatch & COD", "التوصيل والأسطول"],
    ["itsm", "IT Service Desk & Assets", "الدعم الفني والأصول"],
    ["workflow", "MoMs, Contracts & Approvals", "المهام والعقود والاعتمادات"],
    ["notify", "Omnichannel Notifications", "الإشعارات المتعددة"],
    ["realtime", "Presence & Live Feed", "الحضور والوقت الفعلي"],
    ["esign", "Digital Client e-Signature", "التوقيع الإلكتروني"],
    ["tamkeen", "Tamkeen Wage Support", "دعم تمكين"],
  ]) {
    lines.push(
      ins(
        "system.feature_toggle",
        {
          id: `ft-${ft[0]}`,
          module_key: ft[0],
          is_enabled: ft[0] === "store" ? Boolean(company.hasStore) : ft[0] === "web" ? Boolean(company.hasWeb) : true,
          name_en: ft[1],
          name_ar: ft[2],
          description: `Feature toggle governing ${ft[1]} (${company.shortEn})`,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Final settlements & lines (linked to ho-001..ho-004 + murad-mansoor)
  for (let i = 1; i <= 4; i++) {
    const setId = `fset-${i}`;
    const empId = i === 1 ? "murad-mansoor" : staffRoster[10 + i].id;
    lines.push(
      ins(
        "system.final_settlement",
        {
          id: setId,
          reference: `${pfx}-EOS-2026-0${i}`,
          employee_id: empId,
          handover_id: `ho-${String(i).padStart(3, "0")}`,
          reason: i === 1 ? "end_of_contract" : "resignation",
          last_working_day: ago(30 - i * 3),
          status: i <= 2 ? "settled" : "approved",
          currency: cur,
          total_additions: Number((1450 + i * 250).toFixed(3)),
          total_deductions: Number((120 + i * 15).toFixed(3)),
          net_amount: Number((1330 + i * 235).toFixed(3)),
          employer_contributions: Number((180 + i * 20).toFixed(3)),
          calculation: { serviceMonths: 18 + i * 6, leaveEncashmentDays: 12 },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (const [lIdx, line] of [
      { k: "addition", cat: "gratuity", en: "End of Service Indemnity", ar: "مكافأة نهاية الخدمة", amt: 950 + i * 150 },
      { k: "addition", cat: "leave_encash", en: "Unused Annual Leave Encashment", ar: "بدل رصيد الإجازات", amt: 320 + i * 60 },
      { k: "addition", cat: "prorata_salary", en: "Pro-rata Final Month Salary", ar: "راتب الشهر الأخير النسبي", amt: 180 + i * 40 },
      { k: "deduction", cat: "advance_recovery", en: "GOSI & Loan Recovery", ar: "استقطاع التأمينات والسلف", amt: 120 + i * 15 },
    ].entries()) {
      lines.push(
        ins(
          "system.final_settlement_line",
          {
            id: `fsetl-${i}-${lIdx + 1}`,
            settlement_id: setId,
            kind: line.k,
            category: line.cat,
            label_en: line.en,
            label_ar: line.ar,
            amount: line.amt,
            source: "eos_calculator",
            details: { rule: "Bahrain Labor Law Art. 116" },
            display_order: lIdx + 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  for (let i = 1; i <= 20; i++) {
    lines.push(
      ins(
        "system.generated_document",
        {
          id: `gdoc-${i}`,
          document_type: i % 3 === 0 ? "quotation" : i % 2 === 0 ? "payslip" : "invoice",
          source_entity_type: i % 3 === 0 ? "quotation" : i % 2 === 0 ? "payroll_item" : "invoice",
          source_entity_id: i % 3 === 0 ? `qt-${String(i).padStart(3, "0")}` : i % 2 === 0 ? `pi-prun-2026-10-super-admin` : `inv-${String(i).padStart(3, "0")}`,
          file_name: `${pfx}-GEN-2026-${String(i).padStart(3, "0")}.pdf`,
          storage_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          file_size: 92400 + i * 1200,
          checksum: sha256(`${company.slug}:gdoc:${i}`),
          generated_by_id: i % 2 === 1 ? "super-admin" : "layla-nasser",
          created_at: ago(25 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 6; i++) {
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "system.hero_banner",
        {
          id: `hero-${i}`,
          title_en: `${company.shortEn}: ${svc.en}`,
          title_ar: `${company.shortAr}: ${svc.ar}`,
          subtitle_en: company.taglineEn,
          subtitle_ar: company.taglineAr,
          media_type: "image",
          media_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          poster_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          display_order: i,
          is_active: true,
          cta_label_en: i % 2 === 0 ? "Request Proposal" : "Explore Services",
          cta_label_ar: i % 2 === 0 ? "اطلب عرض سعر" : "استكشف الخدمات",
          cta_link: i % 2 === 0 ? "/contact" : "/services",
          is_sample: false,
          created_at: ago(90),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const [idx, intg] of [
    { p: "resend", act: true, health: "healthy", acct: `${company.shortEn} Mailer`, err: null },
    { p: "tap", act: true, health: "healthy", acct: `${company.shortEn} Tap PG`, err: null },
    { p: "benefitpay", act: true, health: "healthy", acct: `${company.shortEn} BenefitPay`, err: null },
    { p: "meta-whatsapp", act: true, health: "healthy", acct: `${company.shortEn} WA Business`, err: null },
    { p: "smsa", act: true, health: "healthy", acct: `${pfx} Courier Account`, err: null },
    { p: "tamkeen", act: true, health: "healthy", acct: `TMK-${pfx}`, err: null },
    { p: "google-workspace", act: true, health: "healthy", acct: `workspace@${domainHost}`, err: null },
    { p: "sandbox-webhook", act: false, health: "degraded", acct: "Staging Replay Target", err: "Disabled in production tenant profile" },
  ].entries()) {
    lines.push(
      ins(
        "system.integration_setting",
        {
          provider: intg.p,
          is_active: intg.act,
          credentials: `enc:${sha256(`${company.slug}:cred:${intg.p}`)}`,
          config: { environment: "production", webhookEnabled: intg.act, region: "me-south1" },
          sync_lease_token: `lease-${pfx}-${idx + 1}`,
          sync_lease_until: ahead(1),
          health_status: intg.health,
          last_checked_at: ago(1),
          last_error: intg.err,
          account_name: intg.acct,
          last_synced_at: ago(1),
          updated_at: now,
          updated_by: "super-admin",
          updated_by_id: "super-admin",
        },
        "ON CONFLICT (provider) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 6; i++) {
    const p = prodList[(i - 1) % prodList.length];
    lines.push(
      ins(
        "system.label_print_job",
        {
          id: `lbl-job-${i}`,
          idempotency_key: `lbl-${pfx}-00${i}`,
          request_hash: sha256(`${company.slug}:lbl:${i}`),
          template: { size: "50x25mm", dpi: 203, barcode: "CODE128" },
          labels: [{ sku: p.sku, name: p.en, qty: 12 + i * 5 }],
          status: "confirmed",
          original_job_id: i === 6 ? "lbl-job-1" : null,
          created_by_id: i === 1 ? "super-admin" : "khalid-doseri",
          confirmed_by_id: "khalid-doseri",
          confirmed_at: ago(30 - i * 3),
          created_at: ago(30 - i * 3),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 12; i++) {
    const kind = i % 2 === 0 ? "receipt" : "invoice";
    lines.push(
      ins(
        "system.number_reservation",
        {
          caller: kind === "receipt" ? "commerce-pos" : "finance-invoicing",
          idempotency_key: `nres-${pfx}-${kind}-${i}`,
          kind,
          document_date: dateAgo(30 - i),
          document_number: `${kind === "receipt" ? "RCT" : pfx}-${202600 + i}`,
          created_at: ago(30 - i),
        },
        "ON CONFLICT (caller, idempotency_key) DO NOTHING",
      ),
    );
  }
  for (let i = 0; i < 24; i++) {
    const pIdx = i % prodList.length;
    lines.push(
      ins(
        "system.package_content",
        {
          id: `pkg-cnt-${i + 1}`,
          package_id: u(`pkg-ctn-${i % 6}`),
          product_id: `prod-${pIdx + 1}`,
          variant_key: "STD",
          batch_key: `${pfx}-B26-${100 + pIdx}`,
          quantity: 10 + (i % 5) * 5,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  // Payslips for ALL 6 payroll runs (months 5..10) x ALL 31 staff (incl. BA0001 super-admin!)
  for (const m of [5, 6, 7, 8, 9, 10]) {
    const mm = String(m).padStart(2, "0");
    for (const s of staffRoster) {
      lines.push(
        ins(
          "system.payslip",
          {
            id: `ps-${mm}-${s.id}`,
            payroll_item_id: `pi-prun-2026-${mm}-${s.id}`,
            employee_id: s.id,
            month: m,
            year: 2026,
            storage_path: `/api/files/media/banners/banner-01.png`,
            issued_at: ago(Math.max(1, (10 - m) * 28)),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  for (let i = 1; i <= 10; i++) {
    const s = staffRoster[i % staffRoster.length];
    lines.push(
      ins(
        "system.profile_change_request",
        {
          id: `pcr-${i}`,
          user_id: s.id,
          requested_by_id: s.id,
          manager_id: s.reportTo || "super-admin",
          status: i <= 7 ? "approved" : "pending",
          old_values: { title_en: s.titleEn },
          new_values: { title_en: `Senior ${s.titleEn}` },
          reviewed_at: i <= 7 ? ago(15 - i) : null,
          review_notes: i <= 7 ? "Approved during mid-year HR review" : null,
          created_at: ago(16 - i),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const [idx, seq] of [
    ["INV", 150],
    ["QT", 240],
    ["RCT", 150],
    ["PO", 45],
    ["RFQ", 30],
    ["REQ", 30],
    ["MOM", 25],
    ["CTR", 20],
  ].entries()) {
    lines.push(
      ins(
        "system.reference_sequence",
        {
          id: `refseq-${seq[0].toLowerCase()}`,
          prefix: `${pfx}-${seq[0]}`,
          year: 2026,
          last_number: seq[1],
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const repKeys = [
      "monthly-pnl-statement",
      "aged-receivables",
      "nbr-vat-return",
      "payroll-gosi-summary",
      "inventory-valuation",
      "delivery-sla-performance",
      "sales-pipeline-forecast",
      "executive-board-pack",
    ];
    const isErr = i === 8;
    lines.push(
      ins(
        "system.report_schedule",
        {
          id: `rsch-${i}`,
          report_key: repKeys[i - 1],
          frequency: i % 2 === 0 ? "monthly" : "weekly",
          format: i % 3 === 0 ? "xlsx" : "pdf",
          locale: i % 2 === 0 ? "ar" : "en",
          compare: true,
          owner_id: i <= 2 ? "super-admin" : i % 2 === 0 ? "layla-nasser" : "sami-khoury",
          is_active: true,
          next_run_at: ahead(7 - (i % 5)),
          last_sent_at: ago(7),
          last_error: isErr ? "Transient timeout generating PDF charts — succeeded on retry" : null,
          created_at: ago(120),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Request assignments, client-visible comments & audit events across all 24 inquiries (`inq-1`..`inq-24`)
  for (let i = 1; i <= 24; i++) {
    const inqId = `inq-${i}`;
    const assignee = i % 4 === 1 ? "super-admin" : i % 2 === 0 ? "ahmed-zayani" : "sami-khoury";
    lines.push(
      ins(
        "system.request_assignment",
        {
          id: `req-asg-${i}`,
          inquiry_id: inqId,
          assigned_to_id: assignee,
          assigned_by_id: "super-admin",
          team: "sales",
          reason: `Assigned to ${assignee} for enterprise follow-up`,
          active: true,
          created_at: ago(Math.max(2, 60 - i * 2)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.request_comment",
        {
          id: `req-cmt-${i}`,
          inquiry_id: inqId,
          author_id: assignee,
          body: `Initial scoping call completed; prepared ${svcList[(i - 1) % svcList.length].en} quotation ${pfx}-QT-2026-${200 + i}.`,
          is_client_visible: i % 2 === 0,
          channel: i % 2 === 0 ? "email" : "internal_note",
          attachments: [{ name: `${pfx}-Scope-${i}.pdf`, url: "/api/files/media/banners/banner-01.png" }],
          created_at: ago(Math.max(1, 59 - i * 2)),
          updated_at: ago(Math.max(1, 59 - i * 2)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.request_event",
        {
          id: `req-evt-${i}`,
          inquiry_id: inqId,
          actor_id: assignee,
          event_type: i <= 14 ? "converted_to_quotation" : "assigned",
          details: { inquiry: inqId, deal: `deal-${i}`, quotation: `qt-${String(i).padStart(3, "0")}` },
          created_at: ago(Math.max(1, 58 - i * 2)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 10; i++) {
    const isErr = i === 10;
    lines.push(
      ins(
        "system.revalidation_job",
        {
          id: `reval-${i}`,
          event_key: `cms.publish.${company.slug}.${i}`,
          payload: { paths: ["/", "/services", "/shop", "/insights"], company: company.slug },
          status: isErr ? "failed" : "delivered",
          attempts: isErr ? 2 : 1,
          next_attempt_at: ahead(1),
          last_error: isErr ? "Edge cache warmup timed out on /shop — retried cleanly" : null,
          delivered_at: isErr ? null : ago(12 - i),
          created_at: ago(12 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const s = i === 1 ? saStaff : staffRoster[i % 10];
    lines.push(
      ins(
        "system.signature_change",
        {
          id: `sigchg-${i}`,
          user_id: s.id,
          signature_url: "/api/files/brand/signature.png",
          previous_url: "/api/files/brand/stamp.png",
          status: i <= 6 ? "approved" : "pending",
          reviewed_by_id: i <= 6 ? "super-admin" : null,
          review_notes: i <= 6 ? "Signature specimen matches wet-ink mandate on file" : null,
          decided_at: i <= 6 ? ago(20 - i) : null,
          created_at: ago(21 - i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const [docType, mode] of [
    ["invoice", "auto_stamp_and_sign"],
    ["quotation", "sales_owner_required"],
    ["official_letter", "executive_required"],
    ["contract", "dual_signatory"],
    ["salary_certificate", "hr_manager_required"],
    ["mom", "organizer_required"],
  ]) {
    lines.push(
      ins(
        "system.signature_policy",
        {
          document_type: docType,
          mode,
          updated_by_id: "super-admin",
          updated_at: now,
        },
        "ON CONFLICT (document_type) DO NOTHING",
      ),
    );
  }
  for (const tg of [
    { id: "tag-vip", en: "VIP Enterprise", ar: "عميل استراتيجي", col: "#B45309", et: "contact" },
    { id: "tag-gov", en: "Government Tender", ar: "مناقصة حكومية", col: "#1D4ED8", et: "deal" },
    { id: "tag-urgent", en: "SLA Priority", ar: "أولوية قصوى", col: "#DC2626", et: "ticket" },
    { id: "tag-gcc", en: "GCC Export", ar: "تصدير خليجي", col: "#047857", et: "order" },
    { id: "tag-retainer", en: "Annual Retainer", ar: "عقد سنوي", col: "#7C3AED", et: "contract" },
    { id: "tag-nbr", en: "VAT Audited", ar: "خاضع لضريبة القيمة المضافة", col: "#0F766E", et: "invoice" },
    { id: "tag-tamkeen", en: "Tamkeen Eligible", ar: "مؤهل لتمكين", col: "#0369A1", et: "employee" },
    { id: "tag-iso", en: "ISO Controlled", ar: "خاضع لمعايير الجودة", col: "#4338CA", et: "document" },
  ]) {
    lines.push(
      ins(
        "system.tag",
        {
          id: tg.id,
          name: tg.en,
          name_ar: tg.ar,
          color: tg.col,
          entity_type: tg.et,
          created_at: ago(180),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  customers.slice(0, 30).forEach((c, i) => {
    lines.push(
      ins(
        "system.wishlist_item",
        {
          id: `wish-${i + 1}`,
          customer_id: c.id,
          catalogue_item_id: i % 2 === 0 ? `prod-${(i % prodList.length) + 1}` : `srv-${(i % svcList.length) + 1}`,
          created_at: ago(15 - (i % 10)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // ── 9. HISTORICAL PROCESSED INBOX & OUTBOX EVENT MESH ROWS (24 TABLES) ───────
  lines.push(`\n-- EVENT MESH: HISTORICAL PUBLISHED OUTBOX & PROCESSED INBOX RECORDS`);
  const meshServices = [
    "cms", "commerce", "delivery", "finance", "hr", "identity",
    "inventory", "itsm", "notify", "sales", "system", "workflow",
  ];
  for (const svc of meshServices) {
    for (let i = 0; i < 6; i++) {
      const msgId = uuidOf(`${company.slug}:mesh:${svc}:${i}`);
      const isRetry = i === 5;
      const errSql = isRetry ? `'Initial relay timeout — published after backoff'` : "NULL";
      lines.push(
        `INSERT INTO ${svc}.outbox (id, subject, payload, headers, attempts, next_try_at, last_error, created_at, published_at) VALUES ('${msgId}', '${svc}.entity.seeded', '{"company":"${company.slug}","seq":${i + 1}}'::jsonb, '{"source":"seed"}'::jsonb, ${isRetry ? 2 : 1}, now() - interval '1 hour', ${errSql}, now() - interval '2 hours', now() - interval '1 hour') ON CONFLICT (id) DO NOTHING;`,
      );
      lines.push(
        `INSERT INTO ${svc}.inbox (consumer, event_id, handled_at) VALUES ('${svc}-worker', '${msgId}', now() - interval '1 hour') ON CONFLICT (consumer, event_id) DO NOTHING;`,
      );
    }
  }

  return lines.join("\n");
}

module.exports = { EXTRA_STAFF, EXTRA_CUSTOMERS, buildExtraModuleSql };
