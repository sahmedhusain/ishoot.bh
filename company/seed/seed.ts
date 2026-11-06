import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { apiTimeoutMs, apiUrl } from "../../apps/admin/lib/api/config";
import { serviceToken } from "../../apps/admin/lib/api/service-token";
import { setAccountPassword, syncAccount } from "../../apps/admin/lib/api/identity";
import { formatUsername } from "../../contracts/src/username";
import { installCompanyProfile, loadCompanyProfile } from "../tools/company-profile";
import { demoPreset } from "./demo-presets";
import demoStaff from "./demo-staff.json";
import demoClients from "./demo-clients.json";

type RecordWithID = { id: string };
const today = new Date().toISOString().slice(0, 10);
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || "Admin12345678!";

async function request<T>(method: string, pathname: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiUrl()}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${await serviceToken()}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!response.ok) throw new Error(`${method} ${pathname} failed (${response.status}): ${await response.text()}`);
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

const create = <T extends RecordWithID>(pathname: string, body: unknown) => request<T>("POST", pathname, body);

async function assertEmpty() {
  const [contacts, pages, invoices, employees, products, customers] = await Promise.all([
    request<RecordWithID[]>("GET", "/v1/sales/contacts"),
    request<RecordWithID[]>("GET", "/v1/cms/pages?all=true"),
    request<RecordWithID[]>("GET", "/v1/finance/invoices"),
    request<RecordWithID[]>("GET", "/v1/hr/employees"),
    request<RecordWithID[]>("GET", "/v1/inventory/products"),
    request<RecordWithID[]>("GET", "/v1/commerce/customers"),
  ]);
  if ([contacts, pages, invoices, employees, products, customers].some((items) => (items?.length ?? 0) > 0))
    throw new Error("Demo seed requires an empty service database; existing records were preserved.");
}

async function seedCMS(profileName: string) {
  // 1. Pages
  await create("/v1/cms/pages", {
    slug: "about",
    pageType: "about",
    titleEn: `${profileName} — About`,
    titleAr: `عن ${profileName}`,
    blocks: [{ type: "hero", titleEn: "Made for the Story", titleAr: "نصنع القصة" }],
    isVisible: true,
    inHeader: true,
    sortOrder: 1,
  }).catch(() => null);

  await create("/v1/cms/pages", {
    slug: "portfolio",
    pageType: "works",
    titleEn: "Featured Productions & Showcases",
    titleAr: "أبرز الأعمال والإنتاجات",
    blocks: [{ type: "portfolio", titleEn: "Our Work", titleAr: "أعمالنا" }],
    isVisible: true,
    inHeader: true,
    sortOrder: 2,
  }).catch(() => null);

  await create("/v1/cms/pages", {
    slug: "equipment-rental",
    pageType: "services",
    titleEn: "Cinema Gear & Studio Soundstage Vault",
    titleAr: "تأجير المعدات السينمائية والاستوديو",
    blocks: [{ type: "services", titleEn: "Equipment Vault", titleAr: "خزينة المعدات" }],
    isVisible: true,
    inHeader: true,
    sortOrder: 3,
  }).catch(() => null);

  // 2. Articles
  const articlesData = [
    ["Behind the Scenes: Gulfwave 5G Anamorphic Campaign", "خلف الكواليس: حملة ألترا 5G الأنامورفية", "Behind-the-scenes look at filming with ARRI Alexa 35 and Cooke Anamorphic lenses at Bahrain Bay.", "نظرة على كواليس التصوير بكاميرات آري وعدسات أنامورفيك في خليج البحرين."],
    ["Documenting Bahrain's Heritage in 8K RAW", "توثيق تراث البحرين بدقة 8K RAW", "Behind the 8K RAW aerial and ground production for Exhibition World Bahrain.", "كيف تم إنتاج الفيلم التوثيقي لمركز المعارض بدقة 8K RAW."],
    ["Mastering HDR Color Grading in DaVinci Resolve Studio", "إتقان التلوين السينمائي HDR في دافينشي ريزولف", "Technical breakdown of our post-production color pipeline.", "تفاصيل استراتيجية التلوين السينمائي الرقمي لإصدارات HDR."],
    ["Next-Gen Aerial Drone Cinematography Workflows", "تقنيات التصوير الجوي السينمائي بالدرون", "How heavy-lifter drones and 8K sensors transform commercial filming.", "كيف تسهم طائرات الدرون مع مستشعرات 8K في الارتقاء بالإعلانات التجارية."]
  ];

  for (const [index, [titleEn, titleAr, excerptEn, excerptAr]] of articlesData.entries()) {
    await create("/v1/cms/articles", {
      slug: `story-${index + 1}`,
      titleEn,
      titleAr,
      excerptEn,
      excerptAr,
      category: index % 2 === 0 ? "case-study" : "technology",
      tags: ["production", "cinema", "tech"],
      status: "published",
      featured: index === 0,
    }).catch(() => null);
  }

  // 3. Seed FAQs
  const faqsData = [
    ["What media production services do you offer?", "ما هي خدمات الإنتاج الإعلامي التي تقدمونها؟", "We offer full-service commercial production, brand films, aerial drone cinematography, studio soundstage rental, and DaVinci Resolve HDR color grading.", "نقدم خدمات الإنتاج الإعلاني والسينمائي المتكامل، التصوير الجوي بالدرون، تأجير الاستوديو، والتلوين السينمائي HDR."],
    ["What cinema camera packages are available for rental?", "ما هي حزم الكاميرات السينمائية المتاحة للتأجير؟", "Our equipment vault features ARRI Alexa 35, RED V-Raptor XL 8K, Cooke Anamorphic prime lenses, and Astera Titan tube packages.", "تتضمن خزينة معداتنا كاميرات آري أليكسا 35، ريد رابتور 8K، عدسات كوك أنامورفيك، وأطقم إضاءة أستيرا."],
    ["How do you manage filming permits and government clearances?", "كيف تنظمون تصاريح التصوير والتراخيص الحكومية؟", "We manage all location permits, airspace approvals for drone operations, and filming clearances with the Ministry of Information Affairs.", "نتولى كافة تصاريح الموقع وتراخيص الطيران الجوي للدرون وموافقات وزارة الإعلام."],
    ["What are your standard payment and invoicing terms?", "ما هي شروط الدفع والفوترة المعتمدة؟", "Standard terms are 50% deposit upon contract signing and 50% upon final master export delivery, with net-30 terms for corporate accounts.", "تتضمن الشروط الدفع 50% عند التوقيع و50% عند التسليم النهائي، مع فترة سداد 30 يوماً للشركات."]
  ];

  for (const [idx, [qEn, qAr, aEn, aAr]] of faqsData.entries()) {
    await create("/v1/cms/faqs", {
      questionEn: qEn,
      questionAr: qAr,
      answerEn: aEn,
      answerAr: aAr,
      category: "general",
      isPublished: true,
      sortOrder: idx + 1,
    }).catch(() => null);
  }

  // 4. Seed Statistics
  const statsData = [
    ["years-exp", "12+", "Years of Experience", "سنوات من الخبرة", 1],
    ["completed-films", "450+", "Productions Delivered", "إنتاجات منجزة", 2],
    ["happy-clients", "180+", "Corporate & Brand Clients", "عملاء وشركات", 3],
    ["gear-value", "100%", "In-House Gear & Studio", "معدات واستوديو مملوك بالكامل", 4]
  ];

  for (const [id, metricValue, labelEn, labelAr, sortOrder] of statsData) {
    await create("/v1/cms/statistics", {
      id,
      metricValue,
      labelEn,
      labelAr,
      sortOrder,
    }).catch(() => null);
  }

  // 5. Seed Reviews
  const reviewsData = [
    ["Hamad Al-Romaihi", "حمد الرميحي", "Gulfwave Telecom", "الاتصالات الخليجية", "Exceptional quality and professional execution throughout the production. The Alexa 35 visuals were stunning.", "جودة استثنائية وتنفيذ احترافي في جميع مراحل الإنتاج. صورة أليكسا 35 كانت مذهلة.", 5],
    ["Tariq Al-Doseri", "طارق الدوسري", "Exhibition World Bahrain", "مركز البحرين العالمي للمعارض", "Delivered our brand story with world-class cinematic polish and flawless 8K aerial drone shots.", "قدموا قصة علامتنا بنمط سينمائي عالمي ولقطات جوية 8K مبهرة.", 5],
    ["Mona Al-Khatib", "منى الخطيب", "Falcon Airways", "طيران الفالكون", "Outstanding crew and seamless post-production color grading. High standards from start to finish.", "فريق عمل رائع وتلوين سينمائي مميز. معايير عالية من البداية حتى النهاية.", 5],
    ["Sami Saleh", "سامي صالح", "Harbor National Bank", "بنك المرفأ الوطني", "The most reliable cinema unit in the region. Always delivering ahead of schedule.", "وحدة الإنتاج السينمائي الأكثر موثوقية بالمنطقة. التزام دائم بالمواعيد.", 5]
  ];

  for (const [idx, [authorEn, authorAr, companyEn, companyAr, quoteEn, quoteAr, rating]] of reviewsData.entries()) {
    await create("/v1/cms/reviews", {
      authorEn,
      authorAr,
      companyEn,
      companyAr,
      quoteEn,
      quoteAr,
      rating,
      isApproved: true,
      year: "2026",
      sortOrder: idx + 1,
    }).catch(() => null);
  }
}

async function seedIdentityAndHR() {
  console.log("🔑 Seeding Identity staff and IT accounts (email & password authentication)...");

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;
  const superAdminUsername = (process.env.SUPER_ADMIN_USERNAME || "BA0001").trim().toUpperCase();

  // Create IT realm admin account for IT app access with MFA disabled by default
  await syncAccount("it", "it-admin", {
    email: superAdminEmail,
    username: superAdminUsername,
    roles: ["it_admin"],
    active: true,
  }).catch((e) => console.warn("Sync IT admin warning:", e?.message || e));
  await setAccountPassword("it", "it-admin", { password: superAdminPassword }).catch((e) =>
    console.warn("Set IT admin password warning:", e?.message || e),
  );

  // Create staff realm super-admin account for Admin app access with MFA disabled by default
  await syncAccount("staff", "super-admin", {
    email: superAdminEmail,
    username: superAdminUsername,
    roles: ["super_admin"],
    active: true,
  }).catch((e) => console.warn("Sync staff super-admin warning:", e?.message || e));
  await setAccountPassword("staff", "super-admin", { password: superAdminPassword }).catch((e) =>
    console.warn("Set staff super-admin password warning:", e?.message || e),
  );

  const deptExecutive = await create<{ id: string }>("/v1/hr/departments", { nameEn: "Executive", nameAr: "الإدارة التنفيذية", code: "EXEC" });
  const deptFinance = await create<{ id: string }>("/v1/hr/departments", { nameEn: "Finance", nameAr: "المالية", code: "FIN" });
  const deptProduction = await create<{ id: string }>("/v1/hr/departments", { nameEn: "Production", nameAr: "الإنتاج", code: "PROD" });
  const deptSales = await create<{ id: string }>("/v1/hr/departments", { nameEn: "Sales & Marketing", nameAr: "المبيعات والتسويق", code: "SALES" });

  const depts: Record<string, string> = {
    executive: deptExecutive.id,
    finance: deptFinance.id,
    production: deptProduction.id,
    post_production: deptProduction.id,
    sales: deptSales.id,
    marketing: deptSales.id,
    operations: deptProduction.id,
  };

  const employees: Record<string, RecordWithID> = {};
  for (const [idx, member] of demoStaff.entries()) {
    const email = member.email || `${member.key}@example.com`;
    // Format username according to: <FirstInitial><LastInitial><4-digit-incremental>
    // Since super-admin is employee #1 (BA0001), demoStaff starts from #2 (e.g. OH0002)
    const staffUsername = formatUsername(member.nameEn, idx + 2);

    // 1. Create Identity staff account with regular email and password (MFA disabled by default)
    await syncAccount("staff", member.key, {
      email,
      username: staffUsername,
      roles: [member.role],
      active: true,
    }).catch((e) => console.warn(`Sync staff ${member.key} warning:`, e?.message || e));
    await setAccountPassword("staff", member.key, { password: DEFAULT_PASSWORD }).catch((e) =>
      console.warn(`Set staff ${member.key} password warning:`, e?.message || e),
    );

    // 2. Create HR Employee record
    const [firstEn, lastEn] = member.nameEn.split(" ");
    const [firstAr, lastAr] = member.nameAr.split(" ");
    const emp = await create<{ id: string }>("/v1/hr/employees", {
      employeeNumber: staffUsername,
      firstNameEn: firstEn,
      lastNameEn: lastEn || "",
      firstNameAr: firstAr,
      lastNameAr: lastAr || "",
      email,
      phone: member.phone ? member.phone.replace(/\s+/g, "") : "+97317000000",
      jobTitleEn: member.role.replace(/_/g, " "),
      jobTitleAr: member.nameAr,
      departmentId: depts[member.department] || deptProduction.id,
      hireDate: today,
      basicSalary: 1200.0 + idx * 100,
      housingAllowance: 250.0,
      transportAllowance: 75.0,
      otherAllowances: 0,
    });
    employees[member.key] = emp;
  }
  return employees;
}

async function seedSalesAndFinance() {
  const createdContacts: Record<string, RecordWithID> = {};
  for (const [idx, client] of demoClients.entries()) {
    const contact = await create<{ id: string }>("/v1/sales/contacts", {
      firstName: client.name,
      lastName: "Representative",
      email: `contact@${client.slug}.example`,
      phone: `+97317000${String(idx + 10).padStart(3, "0")}`,
      company: client.name,
      contactType: "client",
      tags: ["demo", "production", client.slug],
    });
    createdContacts[client.slug] = contact;
  }

  const primaryContact = createdContacts["gulfwave"] || Object.values(createdContacts)[0];
  const secondaryContact = createdContacts["falcon-airways"] || Object.values(createdContacts)[1];
  const tourismContact = createdContacts["iteb"] || Object.values(createdContacts)[2];
  const bankContact = createdContacts["harbor-national-bank"] || Object.values(createdContacts)[3];
  const circuitContact = createdContacts["desert-speedway"] || Object.values(createdContacts)[4];

  // Deals across different stages
  const deal1 = await create<{ id: string }>("/v1/sales/deals", {
    title: "Gulfwave 5G Commercial Campaign",
    contactId: primaryContact.id,
    stage: "proposal",
    value: 4500.0,
    currency: "BHD",
    probability: 65,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  const deal2 = await create<{ id: string }>("/v1/sales/deals", {
    title: "Falcon Airways Fleet Brand Story",
    contactId: secondaryContact.id,
    stage: "negotiation",
    value: 6000.0,
    currency: "BHD",
    probability: 80,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  const deal3 = await create<{ id: string }>("/v1/sales/deals", {
    title: "Tourism Kingdom Showcase Film",
    contactId: tourismContact.id,
    stage: "closed_won",
    value: 12000.0,
    currency: "BHD",
    probability: 100,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  const deal4 = await create<{ id: string }>("/v1/sales/deals", {
    title: "Harbor National Bank Digital Banking TVC",
    contactId: bankContact.id,
    stage: "closed_won",
    value: 8500.0,
    currency: "BHD",
    probability: 100,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  const deal5 = await create<{ id: string }>("/v1/sales/deals", {
    title: "Bahrain Circuit 2026 Season Opener Film",
    contactId: circuitContact.id,
    stage: "qualification",
    value: 15000.0,
    currency: "BHD",
    probability: 40,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  // Quotations
  const quotation1 = await create<{ id: string }>("/v1/sales/quotations", {
    quotationNumber: "QTE-2026-000001",
    contactId: primaryContact.id,
    dealId: deal1.id,
    subtotal: 3500.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 350.0,
    total: 3850.0,
    currency: "BHD",
    validUntil: `${today}T00:00:00Z`,
    items: [
      { description: "Arri Alexa 35 Camera Package (2 Days)", quantity: 2, unitPrice: 1000.0, amount: 2000.0, sortOrder: 0 },
      { description: "Cinema Prime Lenses (Set of 5)", quantity: 2, unitPrice: 500.0, amount: 1000.0, sortOrder: 1 },
      { description: "Grip & Sound Equipment Package", quantity: 1, unitPrice: 500.0, amount: 500.0, sortOrder: 2 },
    ],
  });

  const quotation2 = await create<{ id: string }>("/v1/sales/quotations", {
    quotationNumber: "QTE-2026-000002",
    contactId: secondaryContact.id,
    dealId: deal2.id,
    subtotal: 6000.0,
    discount: 300.0,
    vatRate: 10.0,
    vatAmount: 570.0,
    total: 6270.0,
    currency: "BHD",
    validUntil: `${today}T00:00:00Z`,
    items: [
      { description: "Commercial Film Production — In-flight Brand Story", quantity: 1, unitPrice: 4500.0, amount: 4500.0, sortOrder: 0 },
      { description: "DaVinci Resolve HDR Color Grading & Mastering", quantity: 1, unitPrice: 1500.0, amount: 1500.0, sortOrder: 1 },
    ],
  });

  const quotation3 = await create<{ id: string }>("/v1/sales/quotations", {
    quotationNumber: "QTE-2026-000003",
    contactId: tourismContact.id,
    dealId: deal3.id,
    subtotal: 12000.0,
    discount: 1200.0,
    vatRate: 10.0,
    vatAmount: 1080.0,
    total: 11880.0,
    currency: "BHD",
    validUntil: `${today}T00:00:00Z`,
    items: [
      { description: "Tourism Kingdom Showcase Film (8K Raw)", quantity: 1, unitPrice: 7000.0, amount: 7000.0, sortOrder: 0 },
      { description: "Heavy-Lifter Drone Cinematography with Operator", quantity: 2, unitPrice: 1500.0, amount: 3000.0, sortOrder: 1 },
      { description: "Original Cinematic Orchestral Score & Sound Design", quantity: 1, unitPrice: 2000.0, amount: 2000.0, sortOrder: 2 },
    ],
  });

  const quotation4 = await create<{ id: string }>("/v1/sales/quotations", {
    quotationNumber: "QTE-2026-000004",
    contactId: bankContact.id,
    dealId: deal4.id,
    subtotal: 8500.0,
    discount: 500.0,
    vatRate: 10.0,
    vatAmount: 800.0,
    total: 8800.0,
    currency: "BHD",
    validUntil: `${today}T00:00:00Z`,
    items: [
      { description: "Digital Banking Mobile App Commercial TVC", quantity: 1, unitPrice: 6000.0, amount: 6000.0, sortOrder: 0 },
      { description: "Studio Soundstage & Lighting Package (3 Days)", quantity: 1, unitPrice: 2500.0, amount: 2500.0, sortOrder: 1 },
    ],
  });

  // Invoices across different payment statuses (Partially Paid, Paid, Unpaid/Sent, Overdue)
  const invoice1 = await create<{ id: string }>("/v1/finance/invoices", {
    invoiceNumber: "DEMO-INV-0001",
    contactId: primaryContact.id,
    dealId: deal1.id,
    quotationId: quotation1.id,
    issueDate: today,
    dueDate: today,
    subtotal: 3500.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 350.0,
    total: 3850.0,
    amountPaid: 1925.0,
    balanceDue: 1925.0,
    currency: "BHD",
    items: [{ description: "Gulfwave 5G Commercial Production (50% Deposit)", quantity: 1, unitPrice: 3500.0, amount: 3500.0, sortOrder: 0 }],
  });

  const invoice2 = await create<{ id: string }>("/v1/finance/invoices", {
    invoiceNumber: "INV-2026-0001",
    contactId: tourismContact.id,
    dealId: deal3.id,
    quotationId: quotation3.id,
    issueDate: today,
    dueDate: today,
    subtotal: 10800.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 1080.0,
    total: 11880.0,
    amountPaid: 11880.0,
    balanceDue: 0.0,
    currency: "BHD",
    items: [{ description: "Exhibition World Inauguration Film (100% Paid)", quantity: 1, unitPrice: 10800.0, amount: 10800.0, sortOrder: 0 }],
  });

  const invoice3 = await create<{ id: string }>("/v1/finance/invoices", {
    invoiceNumber: "INV-2026-0002",
    contactId: bankContact.id,
    dealId: deal4.id,
    quotationId: quotation4.id,
    issueDate: today,
    dueDate: today,
    subtotal: 8000.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 800.0,
    total: 8800.0,
    amountPaid: 0.0,
    balanceDue: 8800.0,
    currency: "BHD",
    items: [{ description: "Digital Banking TVC Principal Photography & Post", quantity: 1, unitPrice: 8000.0, amount: 8000.0, sortOrder: 0 }],
  });

  // Payments & Receipts
  await create("/v1/finance/payments", {
    paymentNumber: "DEMO-RCT-0001",
    invoiceId: invoice1.id,
    contactId: primaryContact.id,
    amount: 1925.0,
    currency: "BHD",
    paymentMethod: "bank_transfer",
    paymentDate: today,
    reference: "DEMO-PAY-0001",
  });

  await create("/v1/finance/payments", {
    paymentNumber: "RCT-2026-0001",
    invoiceId: invoice2.id,
    contactId: tourismContact.id,
    amount: 11880.0,
    currency: "BHD",
    paymentMethod: "bank_transfer",
    paymentDate: today,
    reference: "PAY-BAT-2026-9921",
  });

  await create("/v1/finance/payments", {
    paymentNumber: "RCT-2026-0002",
    invoiceId: invoice1.id,
    contactId: primaryContact.id,
    amount: 1925.0,
    currency: "BHD",
    paymentMethod: "benefit_pay",
    paymentDate: today,
    reference: "BENEFIT-992812",
  });

  // Expenses across different operational areas
  await create("/v1/finance/expenses", {
    title: "Filming permit — Bahrain Bay Coastal Sequence",
    amount: 180.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Information Affairs Authority",
    notes: "Production filming permit for Bahrain Bay coastal sequence.",
  });

  await create("/v1/finance/expenses", {
    title: "Location Catering — 40-Person Crew & Cast",
    amount: 450.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Bahrain Gourmet Catering Services",
    notes: "Full day catering for Gulfwave 5G commercial shoot.",
  });

  await create("/v1/finance/expenses", {
    title: "Heavy-Lifter Drone Flight Airspace License",
    amount: 250.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Civil Aviation Affairs (CAA)",
    notes: "Restricted airspace clearance for Exhibition World aerial passes.",
  });

  await create("/v1/finance/expenses", {
    title: "Specialized Anamorphic Lens Sub-Lease",
    amount: 350.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Regional Optics Sub-Lease Co.",
    notes: "Macro anamorphic specialty lens for extreme close-up shots.",
  });

  // Sales Inquiries / Leads
  await create("/v1/sales/inquiries", {
    subject: "Gulfwave 5G Commercial Pickup Day",
    message: "Requesting studio crew, Arri Alexa 35 package, and director for 5G Ultra commercial pickup day.",
    requesterName: "Hamad Al-Romaihi",
    requesterEmail: "h.alromaihi@gulfwave.example",
    requesterPhone: "+97339441122",
  });

  await create("/v1/sales/inquiries", {
    subject: "Exhibition World Bahrain Drone Scope Change",
    message: "Scope change: Additional 4K FPV drone passes and sunset hyperlapse shots over Exhibition World Bahrain.",
    requesterName: "Tariq Al-Doseri",
    requesterEmail: "t.aldoseri@iteb.example",
    requesterPhone: "+97336119900",
  });

  await create("/v1/sales/inquiries", {
    subject: "NBB Annual Shareholders Summit Video Coverage",
    message: "Requesting multi-camera live streaming and highlight video production for NBB Annual Summit.",
    requesterName: "Lulwa Al-Sada",
    requesterEmail: "l.alsada@nbb.example",
    requesterPhone: "+97339887766",
  });

  return { deal: deal1 };
}

async function seedOperations(deal: RecordWithID, employees: Record<string, RecordWithID>) {
  const leadEmployee = employees["karim-fawzi"] || Object.values(employees)[0];
  const editorEmployee = employees["noor-hamdan"] || Object.values(employees)[0];
  const producerEmployee = employees["tariq-saleh"] || Object.values(employees)[0];
  const adminEmployee = employees["omar-haddad"] || Object.values(employees)[0];

  // Warehouses
  await create<{ id: string }>("/v1/inventory/warehouses", {
    code: "DEMO",
    nameEn: "Main Cinema Equipment Vault",
    nameAr: "مخزن المعدات السينمائية الرئيسي",
    address: "Seef District, Manama, Kingdom of Bahrain",
    isDefault: true,
  }).catch(() => null);

  await create<{ id: string }>("/v1/inventory/warehouses", {
    code: "STUDIO",
    nameEn: "Seef Soundstage & Studio Vault",
    nameAr: "مخزن استوديو السيف السينمائي",
    address: "Seef District, Kingdom of Bahrain",
    isDefault: false,
  }).catch(() => null);

  // Cinema Products & Rental Gear
  const productsData = [
    ["DEMO-CAM-001", "ARRI Alexa 35 Cinema Package", "حزمة كاميرا آري أليكسا 35 السينمائية", "4K RAW Super35 Cinema Camera with LPL mount", "كاميرا سينمائية فائقة الوضوح 4K RAW", 12000.0, 1000.0],
    ["DEMO-CAM-002", "RED V-Raptor XL 8K VV Package", "حزمة كاميرا ريد رابتور 8K السينمائية", "8K Vista Vision Cinema Camera System with PL Mount", "نظام كاميرا سينمائي بدقة 8K مع مانت PL", 14000.0, 1200.0],
    ["DEMO-LENS-001", "Cooke Anamorphic Prime Lenses (Set of 5)", "طقم عدسات كوك أنامورفيك (5 عدسات)", "Full-frame anamorphic lens set (32mm, 40mm, 50mm, 75mm, 100mm)", "طقم عدسات سينمائية أنامورفيك كاملة الإطار", 8500.0, 500.0],
    ["DEMO-LENS-002", "ARRI Signature Prime Lens Set (18-125mm)", "طقم عدسات آري سيجنتشر برايم", "Full-frame large format cinema lens set", "عدسات آري السينمائية للإطار الكامل", 9500.0, 600.0],
    ["DEMO-LIGHT-001", "Aputure 1200d Pro Daylight LED Package", "حزمة إضاءة أبتشر 1200d برو النهارية", "High-output daylight LED fixture with F10 Fresnel", "إضاءة LED فائقة القوة مع عدسة فرينل F10", 2500.0, 150.0],
    ["DEMO-LIGHT-002", "Astera Titan Tube 8-Light Kit with Charging Case", "طقم أنابيب إضاءة أستيرا تايتان (8 أنابيب)", "Wireless pixel-controlled RGBMA LED tube lights", "أنابيب إضاءة لاسلكية ذكية RGBMA", 1800.0, 120.0],
    ["DEMO-GRIP-001", "Freefly MōVI Pro Gimbal & Ring Package", "نظام مانع الاهتزاز موفي برو للسينما", "3-axis motorized camera stabilizer with Mimic controller", "مثبت كاميرا ثلاثي المحاور مع جهاز التحكم هواء", 3200.0, 200.0],
    ["DEMO-DRONE-001", "DJI Inspire 3 8K Cinema Drone Package", "طائرات درون سينمائية DJI Inspire 3 8K", "Full-frame 8K ProRes RAW cinema drone system", "نظام تصوير جوي سينمائي بدقة 8K ProRes RAW", 7500.0, 800.0],
    ["DEMO-AUDIO-001", "Sound Devices 888 16-Channel Audio Recorder", "جهاز تسجيل الصوت السينمائي الميداني 16 قناة", "16-channel portable audio recorder & mixer with timecode", "جهاز تسجيل ومزج صوت ميداني سينمائي مع تايم كود", 4200.0, 250.0],
    ["DEMO-POST-001", "DaVinci Resolve Studio Advanced Control Panel", "لوحة التحكم المتقدمة دافينشي ريزولف", "Hardware control surface for 8K HDR color grading", "لوحة تحكم هاردوير للتلوين السينمائي 8K HDR", 11000.0, 800.0]
  ];

  for (const [sku, nameEn, nameAr, descEn, descAr, costPrice, sellingPrice] of productsData) {
    await create<{ id: string }>("/v1/inventory/products", {
      sku,
      nameEn,
      nameAr,
      descriptionEn: descEn,
      descriptionAr: descAr,
      costPrice,
      sellingPrice,
      taxRate: 0,
      currency: "BHD",
      reorderPoint: 1,
      isActive: true,
      trackInventory: true,
    }).catch(() => null);
  }

  // E-Commerce Customers
  await create<{ id: string }>("/v1/commerce/customers", {
    firstName: "Sami",
    lastName: "Saleh",
    email: "sami.saleh@example.invalid",
    phone: "+97317000404",
  }).catch(() => null);

  await create<{ id: string }>("/v1/commerce/customers", {
    firstName: "Mona",
    lastName: "Al-Khatib",
    email: "mona.khatib@example.invalid",
    phone: "+97339112233",
  }).catch(() => null);

  // Fleet & Delivery Vehicles
  await create("/v1/delivery/vehicles", { plate: "DEMO-1001", name: "Grip & Lighting Unit Van", kind: "van" }).catch(() => null);
  await create("/v1/delivery/vehicles", { plate: "DEMO-1002", name: "Camera & Audio Production Truck", kind: "truck" }).catch(() => null);

  // Tasks
  const tasksData = [
    ["Prepare demo production equipment call-sheet", "Verify ARRI Alexa 35 sensor calibration and Cooke Anamorphic lens package.", leadEmployee.id, "high"],
    ["Color grading & HDR master export", "DaVinci Resolve Studio color pass for Gulfwave 5G commercial reel.", editorEmployee.id, "high"],
    ["Location Recce & Power Load Audit at Marassi", "Inspect power distribution and camera positioning angles for Marassi shoot.", producerEmployee.id, "medium"],
    ["Submit Filming Permit Application to IAA", "Submit location details and crew passport IDs to Ministry of Information Affairs.", adminEmployee.id, "high"],
    ["Pre-Production Equipment Checkout & Test Shots", "Assemble Alexa 35 rig, test wireless video transmitters and Astera tube sync.", leadEmployee.id, "medium"]
  ];

  for (const [title, description, assignedTo, priority] of tasksData) {
    await create("/v1/workflow/tasks", {
      title,
      description,
      assignedTo,
      dueDate: `${today}T00:00:00Z`,
      priority,
      relatedEntityType: "deal",
      relatedEntityId: deal.id,
    }).catch(() => null);
  }

  // Calendar Events
  const calendarData = [
    ["Gulfwave 5G Commercial Principal Photography", "Location shoot at Bahrain Bay with Alexa 35 package.", leadEmployee.id, "production", "09:00:00Z", "17:00:00Z"],
    ["Pre-Production Technical Meeting with Client", "Review storyboard, shot list and lighting setup at Seef Studio Soundstage.", producerEmployee.id, "meeting", "10:00:00Z", "12:00:00Z"],
    ["Final Color Suite Screening with Director & Client", "DaVinci Resolve HDR 4K screening in Post-Production Suite 1.", editorEmployee.id, "screening", "14:00:00Z", "16:00:00Z"]
  ];

  for (const [title, description, organizerId, eventType, startTime, endTime] of calendarData) {
    await create("/v1/workflow/calendar", {
      title,
      description,
      startTime: `${today}T${startTime}`,
      endTime: `${today}T${endTime}`,
      organizerId,
      eventType,
    }).catch(() => null);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seed is disabled in production.");
  const preset = demoPreset(process.env.SEED_PRESET?.trim() || "media", process.env.SEED_STYLE?.trim());
  const profile = loadCompanyProfile(process.env.COMPANY_PROFILE?.trim() || "demo");

  await assertEmpty();
  await installCompanyProfile(profile, "demo-seed");

  for (const module of preset.modules) {
    await request<void>("PUT", `/v1/system/modules/${encodeURIComponent(module.moduleKey)}`, {
      enabled: module.isEnabled,
      actorId: "demo-seed",
    });
  }

  await seedCMS(profile.display.nameEn);
  const employees = await seedIdentityAndHR();
  const { deal } = await seedSalesAndFinance();
  await seedOperations(deal, employees);
  await publishDemoWebsite(preset.activity);

  console.log(`Seeded ${profile.display.nameEn} demo through backend service APIs (MFA disabled by default, regular password/email authentication enabled).`);
}

async function publishDemoWebsite(activity: string = "media") {
  try {
    const { exampleSnapshot } = require("../../apps/admin/lib/database/queries/samples");
    const snapshot = exampleSnapshot(activity as any);

    await request<void>("PUT", "/v1/cms/snapshots/main/draft", snapshot).catch((e) =>
      console.warn("CMS save draft warning:", e?.message || e),
    );
    await request<void>("POST", "/v1/cms/snapshots/main/publish").catch((e) =>
      console.warn("CMS publish warning:", e?.message || e),
    );
  } catch (e) {
    console.warn("CMS snapshot generation warning:", e);
  }

  await request<void>("POST", "/v1/system/setup/complete", { actorId: "seed" }).catch((e) =>
    console.warn("System complete setup warning:", e?.message || e),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
