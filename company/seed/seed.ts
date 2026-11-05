import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

import { apiTimeoutMs, apiUrl } from "../../apps/admin/lib/api/config";
import { serviceToken } from "../../apps/admin/lib/api/service-token";
import { installCompanyProfile, loadCompanyProfile } from "../tools/company-profile";
import { demoPreset } from "./demo-presets";
import demoStaff from "./demo-staff.json";
import demoClients from "./demo-clients.json";

type RecordWithID = { id: string };
const today = new Date().toISOString().slice(0, 10);

async function request<T>(method: string, pathname: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiUrl()}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${await serviceToken()}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
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

async function seedStaffAndHR() {
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
    const [firstEn, lastEn] = member.nameEn.split(" ");
    const [firstAr, lastAr] = member.nameAr.split(" ");
    const emp = await create<{ id: string }>("/v1/hr/employees", {
      employeeNumber: `DEMO-${String(idx + 1).padStart(3, "0")}`,
      firstNameEn: firstEn,
      lastNameEn: lastEn || "",
      firstNameAr: firstAr,
      lastNameAr: lastAr || "",
      email: member.email || `${member.key}@example.invalid`,
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
  for (const [idx, client] of demoClients.slice(0, 6).entries()) {
    const contact = await create<{ id: string }>("/v1/sales/contacts", {
      firstName: client.name,
      lastName: "Representative",
      email: `contact@${client.slug}.example`,
      phone: `+97317000${String(idx + 10).padStart(3, "0")}`,
      company: client.name,
      contactType: "client",
      tags: ["demo", "production"],
    });
    createdContacts[client.slug] = contact;
  }

  const primaryContact = createdContacts["gulfwave"] || Object.values(createdContacts)[0];

  const deal = await create<{ id: string }>("/v1/sales/deals", {
    title: "Gulfwave brand film",
    contactId: primaryContact.id,
    stage: "proposal",
    value: 4500.0,
    currency: "BHD",
    probability: 65,
    expectedCloseDate: `${today}T00:00:00Z`,
  });

  const quotation = await create<{ id: string }>("/v1/sales/quotations", {
    quotationNumber: "DEMO-Q-0001",
    contactId: primaryContact.id,
    dealId: deal.id,
    subtotal: 4500.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 450.0,
    total: 4950.0,
    currency: "BHD",
    validUntil: `${today}T00:00:00Z`,
    items: [{ description: "Brand film production", quantity: 1, unitPrice: 4500.0, amount: 4500.0, sortOrder: 0 }],
  });

  const invoice = await create<{ id: string }>("/v1/finance/invoices", {
    invoiceNumber: "DEMO-INV-0001",
    contactId: primaryContact.id,
    dealId: deal.id,
    quotationId: quotation.id,
    issueDate: today,
    dueDate: today,
    subtotal: 4500.0,
    discount: 0,
    vatRate: 10.0,
    vatAmount: 450.0,
    total: 4950.0,
    amountPaid: 0,
    balanceDue: 4950.0,
    currency: "BHD",
    items: [{ description: "Brand film production", quantity: 1, unitPrice: 4500.0, amount: 4500.0, sortOrder: 0 }],
  });

  await create("/v1/finance/payments", {
    paymentNumber: "DEMO-RCT-0001",
    invoiceId: invoice.id,
    contactId: primaryContact.id,
    amount: 2475.0,
    currency: "BHD",
    paymentMethod: "bank_transfer",
    paymentDate: today,
    reference: "DEMO-PAY-0001",
  });

  await create("/v1/finance/expenses", {
    title: "Demo location permit",
    amount: 180.0,
    currency: "BHD",
    expenseDate: today,
    vendor: "Example Authority",
    notes: "Fictional demo expense.",
  });

  await create("/v1/sales/inquiries", {
    subject: "Campaign enquiry",
    message: "We would like a production proposal.",
    requesterName: "Mariam Ali",
    requesterEmail: "mariam@client.example",
    requesterPhone: "+97317000202",
  });

  return { deal };
}

async function seedOperations(deal: RecordWithID, employees: Record<string, RecordWithID>) {
  const leadEmployee = employees["karim-fawzi"] || Object.values(employees)[0];

  await create<{ id: string }>("/v1/inventory/warehouses", {
    code: "DEMO",
    nameEn: "Demo Store",
    nameAr: "مخزن تجريبي",
    address: "Manama",
    isDefault: true,
  });

  await create<{ id: string }>("/v1/inventory/products", {
    sku: "DEMO-CAM-001",
    nameEn: "Demo camera package",
    nameAr: "حزمة كاميرا تجريبية",
    descriptionEn: "Cinema camera kit",
    descriptionAr: "طقم كاميرا سينمائية",
    costPrice: 900.0,
    sellingPrice: 1250.0,
    taxRate: 0,
    currency: "BHD",
    reorderPoint: 0,
    isActive: true,
    trackInventory: true,
  });

  await create<{ id: string }>("/v1/commerce/customers", {
    firstName: "Sami",
    lastName: "Saleh",
    email: "sami.saleh@example.invalid",
    phone: "+97317000404",
  });

  await create("/v1/delivery/vehicles", { plate: "DEMO-1001", name: "Demo delivery van", kind: "van" });

  await create("/v1/workflow/tasks", {
    title: "Prepare demo production",
    description: "Fictional task for the demo workspace.",
    assignedTo: leadEmployee.id,
    dueDate: `${today}T00:00:00Z`,
    priority: "high",
    relatedEntityType: "deal",
    relatedEntityId: deal.id,
  });

  await create("/v1/workflow/calendar", {
    title: "Demo production day",
    description: "Fictional calendar fixture.",
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
  const employees = await seedStaffAndHR();
  const { deal } = await seedSalesAndFinance();
  await seedOperations(deal, employees);

  console.log(`Seeded ${profile.display.nameEn} demo through backend service APIs.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
