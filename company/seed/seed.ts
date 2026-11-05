import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { apiTimeoutMs, apiUrl } from "../../apps/admin/lib/api/config";
import { serviceToken } from "../../apps/admin/lib/api/service-token";
import { setAccountPassword, syncAccount } from "../../apps/admin/lib/api/identity";
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
  await create("/v1/cms/pages", {
    slug: "about",
    pageType: "about",
    titleEn: `${profileName} — About`,
    titleAr: `عن ${profileName}`,
    blocks: [{ type: "hero", titleEn: "Made for the story", titleAr: "نصنع القصة" }],
    isVisible: true,
    inHeader: true,
    sortOrder: 1,
  });
  for (const [index, [titleEn, titleAr]] of [
    ["Behind the scene", "خلف الكواليس"],
    ["New production", "إنتاج جديد"],
    ["Meet the team", "تعرف على الفريق"],
  ].entries()) {
    await create("/v1/cms/articles", {
      slug: `demo-story-${index + 1}`,
      titleEn,
      titleAr,
      excerptEn: "Fictional demo content.",
      excerptAr: "محتوى تجريبي خيالي.",
      category: "news",
      tags: ["demo"],
      status: index === 2 ? "draft" : "published",
      featured: index === 0,
    });
  }
}

async function seedIdentityAndHR() {
  console.log("🔑 Seeding Identity staff and IT accounts (email & password authentication)...");

  // Create IT realm admin account for IT app access with MFA disabled by default
  await syncAccount("it", "it-admin", {
    email: "admin@example.com",
    roles: ["it_admin"],
    active: true,
  }).catch((e) => console.warn("Sync IT admin warning:", e?.message || e));
  await setAccountPassword("it", "it-admin", { password: DEFAULT_PASSWORD }).catch((e) =>
    console.warn("Set IT admin password warning:", e?.message || e),
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
    // 1. Create Identity staff account with regular email and password (MFA disabled by default)
    await syncAccount("staff", member.key, {
      email,
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
      employeeNumber: `DEMO-${String(idx + 1).padStart(3, "0")}`,
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
    items: [{ description: "Gulfwave 5G Commercial Production", quantity: 1, unitPrice: 3500.0, amount: 3500.0, sortOrder: 0 }],
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
    items: [{ description: "Exhibition World Inauguration Film", quantity: 1, unitPrice: 10800.0, amount: 10800.0, sortOrder: 0 }],
  });

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

  await create("/v1/finance/expenses", {
    title: "Demo location permit — Bahrain Bay",
    amount: 180.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Information Affairs Authority",
    notes: "Production filming permit for Bahrain Bay coastal sequence.",
  });

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

  return { deal: deal1 };
}

async function seedOperations(deal: RecordWithID, employees: Record<string, RecordWithID>) {
  const leadEmployee = employees["karim-fawzi"] || Object.values(employees)[0];
  const editorEmployee = employees["noor-hamdan"] || Object.values(employees)[0];

  await create<{ id: string }>("/v1/inventory/warehouses", {
    code: "DEMO",
    nameEn: "Main Cinema Equipment Vault",
    nameAr: "مخزن المعدات السينمائية الرئيسي",
    address: "Manama, Kingdom of Bahrain",
    isDefault: true,
  });

  await create<{ id: string }>("/v1/inventory/products", {
    sku: "DEMO-CAM-001",
    nameEn: "ARRI Alexa 35 Cinema Package",
    nameAr: "حزمة كاميرا آري أليكسا 35 السينمائية",
    descriptionEn: "4K RAW Super35 Cinema Camera with LPL mount",
    descriptionAr: "كاميرا سينمائية فائقة الوضوح 4K RAW",
    costPrice: 12000.0,
    sellingPrice: 1000.0,
    taxRate: 0,
    currency: "BHD",
    reorderPoint: 1,
    isActive: true,
    trackInventory: true,
  });

  await create<{ id: string }>("/v1/inventory/products", {
    sku: "DEMO-LENS-002",
    nameEn: "Cooke Anamorphic Prime Lenses (Set of 5)",
    nameAr: "طقم عدسات كوك أنامورفيك (5 عدسات)",
    descriptionEn: "Full-frame anamorphic lens set (32mm, 40mm, 50mm, 75mm, 100mm)",
    descriptionAr: "طقم عدسات سينمائية أنامورفيك كاملة الإطار",
    costPrice: 8500.0,
    sellingPrice: 500.0,
    taxRate: 0,
    currency: "BHD",
    reorderPoint: 1,
    isActive: true,
    trackInventory: true,
  });

  await create<{ id: string }>("/v1/commerce/customers", {
    firstName: "Sami",
    lastName: "Saleh",
    email: "sami.saleh@example.invalid",
    phone: "+97317000404",
  });

  await create("/v1/delivery/vehicles", { plate: "DEMO-1001", name: "Grip & Lighting Unit Van", kind: "van" });

  await create("/v1/workflow/tasks", {
    title: "Prepare demo production equipment call-sheet",
    description: "Verify ARRI Alexa 35 sensor calibration and Cooke Anamorphic lens package.",
    assignedTo: leadEmployee.id,
    dueDate: `${today}T00:00:00Z`,
    priority: "high",
    relatedEntityType: "deal",
    relatedEntityId: deal.id,
  });

  await create("/v1/workflow/tasks", {
    title: "Color grading & HDR master export",
    description: "DaVinci Resolve Studio color pass for Gulfwave 5G commercial reel.",
    assignedTo: editorEmployee.id,
    dueDate: `${today}T00:00:00Z`,
    priority: "medium",
    relatedEntityType: "deal",
    relatedEntityId: deal.id,
  });

  await create("/v1/workflow/calendar", {
    title: "Gulfwave 5G Commercial Principal Photography",
    description: "Location shoot at Bahrain Bay with Alexa 35 package.",
    startTime: `${today}T09:00:00Z`,
    endTime: `${today}T17:00:00Z`,
    organizerId: leadEmployee.id,
    eventType: "production",
  });
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

  console.log(`Seeded ${profile.display.nameEn} demo through backend service APIs (MFA disabled by default, regular password/email authentication enabled).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
