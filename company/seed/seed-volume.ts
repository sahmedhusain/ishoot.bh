// Large, internally consistent demo dataset.
//
// Every business record here is created through the application's own domain functions (the same
// code the admin app calls), so document numbers, totals, statuses, approvals, deal stages and
// payroll figures are exactly what the app would have produced. Dates are relative to the day the
// seed runs (≈15 months of history plus a little future), so date-driven states stay valid.
// The generator is deterministic: the same day produces the same data.
import type { PrismaClient } from "@prisma/client";
import {
  createCRMContact,
  createCRMDeal,
  updateCRMDeal,
  advanceDealForEvent,
} from "../../packages/database/src/queries/crm";
import {
  createQuotation,
  submitQuotationForApproval,
  issueQuotation,
  acceptQuotation,
} from "../../packages/database/src/queries/quotations";
import {
  createInvoice,
  updateInvoiceStatus,
  markOverdueInvoices,
} from "../../packages/database/src/queries/invoices";
import { createPayment } from "../../packages/database/src/queries/payments";
import {
  signDocument,
  requestInvoiceApproval,
} from "../../packages/database/src/queries/document-signing";
import { createExpense } from "../../packages/database/src/queries/expenses";
import {
  getSupportClaims,
  recordSupportReimbursement,
} from "../../packages/database/src/queries/support-claims";
import { supportSchedule } from "../../packages/database/src/constants/hr-support";
import {
  reassignSalesOwner,
  getCommissionStatement,
  recordCommissionPayout,
} from "../../packages/database/src/queries/sales-attribution";
import {
  createExpenseClaim,
  scheduleExpenseClaim,
  payExpenseClaim,
  cancelExpenseClaim,
} from "../../packages/database/src/queries/expense-claims";
import { createConsolidatedRequest } from "../../packages/database/src/queries/requests";
import {
  assignRequest,
  submitRequestForApproval,
  confirmRequest,
  resolveRequest,
  returnRequest,
} from "../../packages/database/src/queries/inquiries";
import { createLeaveRequest } from "../../packages/database/src/queries/leave";
import { storeFileBytes } from "../../packages/database/src/services/uploads";
import { SAMPLE_RECEIPT_JPEG } from "../../packages/database/src/services/sample-files";
import { createEmployee } from "../../packages/database/src/queries/hrms";
import {
  createPayrollRun,
  submitPayrollRunForApproval,
  markPayrollAsPaid,
  setPayrollItemLines,
} from "../../packages/database/src/queries/payroll";
import { createCalendarEvent } from "../../packages/database/src/queries/calendar";
import {
  createMinuteOfMeeting,
  approveAndSignMom,
} from "../../packages/database/src/queries/moms";
import {
  submitForApproval,
  decideApprovalRequest,
  type ApprovalOutcome,
} from "../../packages/database/src/services/approval-engine";
import type { ApprovalTargetType } from "../../packages/database/src/constants/approvals";
import { lineTotal } from "../../packages/database/src/finance/money";
import { saveAsset } from "../../packages/database/src/queries/assets";
import { resolveIncomingLead } from "../../packages/database/src/services/lead-resolver";
import { ACTIVITY_SAMPLES } from "../../packages/database/src/samples/activity-samples";
import type { BusinessActivity } from "../../packages/database/src/website-presets";

let seedPrisma: PrismaClient;
/** The demo company's short name, from the company profile. */
let brand = { nameEn: "", nameAr: "" };
let sampleSignatureUrl: string | null = null;

type SeedUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  signatureUrl?: string | null;
};

// ---------------------------------------------------------------- deterministic helpers
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(20261005);
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];
const shuffle = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const DAY = 86_400_000;
const TODAY = (() => {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
})();
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const minDate = (a: Date, b: Date) => (a < b ? a : b);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------- reference vocabulary
const FIRST = [
  ["Ahmed", "أحمد"],
  ["Mohamed", "محمد"],
  ["Ali", "علي"],
  ["Hassan", "حسن"],
  ["Hussain", "حسين"],
  ["Fatima", "فاطمة"],
  ["Maryam", "مريم"],
  ["Zainab", "زينب"],
  ["Noora", "نورة"],
  ["Khalid", "خالد"],
  ["Yousif", "يوسف"],
  ["Abdulla", "عبدالله"],
  ["Sara", "سارة"],
  ["Layla", "ليلى"],
  ["Ebrahim", "إبراهيم"],
  ["Jassim", "جاسم"],
  ["Hamad", "حمد"],
  ["Reem", "ريم"],
  ["Dana", "دانة"],
  ["Salman", "سلمان"],
  ["Faisal", "فيصل"],
  ["Huda", "هدى"],
  ["Amina", "آمنة"],
  ["Omar", "عمر"],
  ["Mariam", "مريم"],
  ["Nasser", "ناصر"],
  ["Hessa", "حصة"],
  ["Tariq", "طارق"],
  ["Shaikha", "شيخة"],
  ["Isa", "عيسى"],
] as const;
const LAST = [
  ["Al-Mahmood", "المحمود"],
  ["Al-Sayed", "السيد"],
  ["Al-Hashimi", "الهاشمي"],
  ["Al-Ansari", "الأنصاري"],
  ["Al-Mannai", "المناعي"],
  ["Al-Hilal", "الهلال"],
  ["Fakhro", "فخرو"],
  ["Al-Aali", "العالي"],
  ["Janahi", "جناحي"],
  ["Al-Shirawi", "الشيراوي"],
  ["Bucheeri", "بوجيري"],
  ["Al-Musallam", "المسلم"],
  ["Al-Hayki", "الحايكي"],
  ["Al-Doseri", "الدوسري"],
  ["Al-Jowder", "الجودر"],
  ["Al-Awadhi", "العوضي"],
  ["Al-Kooheji", "الكوهجي"],
  ["Al-Bastaki", "البستكي"],
  ["Al-Qassab", "القصاب"],
  ["Al-Najjar", "النجار"],
] as const;
const PLACES = [
  "Pearl Bay",
  "Dilmun",
  "Gulf Crest",
  "Manama Gate",
  "Seafront Square",
  "Amwaj",
  "Sitra",
  "Riffa Hills",
  "Awali",
  "Muharraq",
  "Juffair",
  "Zallaq",
  "Budaiya",
  "Hidd",
  "Tubli",
  "Saar",
  "Hamala",
  "Durrat",
  "Karbabad",
  "Diyar",
] as const;
const SECTORS = [
  "Developments",
  "Hospitality",
  "Fintech",
  "Retail Group",
  "Healthcare",
  "Logistics",
  "Motors",
  "Foods",
  "Education",
  "Energy Services",
  "Telecom",
  "Fitness Clubs",
  "Real Estate",
  "Fashion House",
  "Events",
] as const;
const JOB_TITLES = [
  "Marketing Director",
  "Brand Manager",
  "Head of Communications",
  "CEO",
  "Events Manager",
  "Digital Marketing Lead",
  "Procurement Officer",
  "PR Manager",
  "Creative Lead",
  "General Manager",
] as const;
const PROJECTS = [
  ["Brand Film", "فيلم العلامة التجارية"],
  ["TVC Campaign", "حملة إعلان تلفزيوني"],
  ["Corporate Documentary", "فيلم وثائقي مؤسسي"],
  ["Product Launch Video", "فيديو إطلاق منتج"],
  ["Social Media Series", "سلسلة محتوى للتواصل الاجتماعي"],
  ["Event Coverage", "تغطية فعالية"],
  ["Aerial Showcase", "عرض جوي بالدرون"],
  ["Training Video Series", "سلسلة فيديوهات تدريبية"],
  ["Ramadan Campaign", "حملة رمضان"],
  ["National Day Film", "فيلم العيد الوطني"],
  ["Property Walkthrough", "جولة مصورة للعقار"],
  ["Testimonial Series", "سلسلة شهادات العملاء"],
] as const;
const LOST_REASONS = [
  "Budget reallocated to digital advertising",
  "Chose a lower-cost production vendor",
  "Project postponed to next fiscal year",
  "Client moved the campaign in-house",
  "Timeline too short for the requested production scope",
  "Internal approvals not obtained on the client side",
];
const PAYMENT_METHODS = [
  "bank_transfer",
  "bank_transfer",
  "bank_transfer",
  "cheque",
  "card",
  "online",
  "cash",
] as const;

// ---------------------------------------------------------------- approvals
/**
 * Records a client acceptance that happened in the past, inside the quotation's validity window.
 * Same state change as acceptQuotation (which checks validity against *today*), applied atomically.
 */
async function acceptHistoricQuotation(
  prisma: PrismaClient,
  id: string,
  acceptedOn: Date,
  evidence: string,
) {
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id } });
  if (quotation.status !== "issued")
    throw new Error(
      `Quotation cannot be accepted: current status is ${quotation.status}`,
    );
  if (acceptedOn > quotation.validUntilDate)
    throw new Error(
      "Historic acceptance must fall within the quotation's validity",
    );
  await prisma.$transaction(async (tx) => {
    const accepted = await tx.quotation.update({
      where: { id },
      data: { status: "accepted", acceptanceEvidence: evidence },
    });
    await advanceDealForEvent(tx, accepted.dealId, "quotation_accepted");
  });
}

/** Takes an approval through every step with the approvers the engine itself selected. */
async function decideFully(
  outcome: ApprovalOutcome,
  decision: "approved" | "rejected",
  reason?: string,
) {
  let current = outcome;
  for (let guard = 0; current.status === "pending" && guard < 5; guard++) {
    const approver =
      current.approverIds[0] ??
      (await approverIdsFor(seedPrisma, current.approvalRequestId))[0];
    if (!approver)
      throw new Error(
        `Approval ${current.approvalRequestId} has no approver to decide it`,
      );
    current = await decideApprovalRequest(
      current.approvalRequestId,
      approver,
      decision,
      reason,
    );
  }
  return current;
}
/** Signs as this person when they have an approved signature, otherwise as the Super Admin. */
async function signerFor(userId: string) {
  const user = await seedPrisma.user.findUnique({
    where: { id: userId },
    select: { signatureUrl: true },
  });
  if (user?.signatureUrl) return userId;
  return (
    await seedPrisma.user.findFirstOrThrow({
      where: { role: "super_admin", signatureUrl: { not: null } },
      select: { id: true },
    })
  ).id;
}
async function submit(
  targetType: ApprovalTargetType,
  targetId: string,
  requesterId: string,
  policySnapshot: Record<string, unknown> = {},
) {
  return submitForApproval({
    targetType,
    targetId,
    requesterId,
    policySnapshot,
  });
}

// ---------------------------------------------------------------- main entry
export async function seedVolume(
  prisma: PrismaClient,
  ctx: {
    users: Record<string, SeedUser>;
    passwordHash: string;
    brand: { nameEn: string; nameAr: string };
    sampleSignatureUrl: string | null;
    activities: BusinessActivity[];
  },
) {
  seedPrisma = prisma;
  brand = ctx.brand;
  sampleSignatureUrl = ctx.sampleSignatureUrl;
  rand = mulberry32(Number(iso(TODAY).replace(/-/g, "")));
  const started = Date.now();
  const company = await prisma.companySetting.findFirstOrThrow();
  const vatEnabled = company.vatEnabled;
  const vatPercentage = Number(company.vatPercentage);
  const u = ctx.users;
  const owner = u.super_admin,
    finance = u.finance_manager,
    prodManager = u.operations_manager,
    sales = u.sales;
  const usedEmails = new Set(
    (await prisma.crmContact.findMany({ select: { emailNorm: true } })).map(
      (c) => c.emailNorm,
    ),
  );
  const usedPhones = new Set<string>();
  const counts: Record<string, number> = {};
  const bump = (key: string, n = 1) => (counts[key] = (counts[key] ?? 0) + n);

  // ============================================================ 1. staff (users + HR records)
  const departments = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.code, d.id]),
  );
  const CONTRIBUTIONS = {
    employee: { mode: "percentage" as const, value: 7 },
    employer: { mode: "percentage" as const, value: 12 },
    supports: [],
  };
  const staffPlan: Array<{
    role: string | null;
    dept: string;
    deptCode: string;
    titleEn: string;
    titleAr: string;
    salary: [number, number];
  }> = [
    {
      role: "project_lead",
      dept: "production",
      deptCode: "PROD",
      titleEn: "Line Producer",
      titleAr: "منتج منفذ",
      salary: [1300, 1700],
    },
    {
      role: "project_lead",
      dept: "production",
      deptCode: "PROD",
      titleEn: "Field Producer",
      titleAr: "منتج ميداني",
      salary: [1100, 1400],
    },
    {
      role: "project_lead",
      dept: "production",
      deptCode: "PROD",
      titleEn: "Director of Photography",
      titleAr: "مدير تصوير",
      salary: [1600, 2100],
    },
    {
      role: "editor",
      dept: "post_production",
      deptCode: "POST",
      titleEn: "Senior Editor",
      titleAr: "مونتير أول",
      salary: [1400, 1800],
    },
    {
      role: "editor",
      dept: "post_production",
      deptCode: "POST",
      titleEn: "Colorist",
      titleAr: "أخصائي تلوين",
      salary: [1300, 1700],
    },
    {
      role: "editor",
      dept: "post_production",
      deptCode: "POST",
      titleEn: "Motion Designer",
      titleAr: "مصمم موشن جرافيك",
      salary: [1100, 1500],
    },
    {
      role: "sales",
      dept: "sales",
      deptCode: "COMM",
      titleEn: "Account Manager",
      titleAr: "مدير حسابات العملاء",
      salary: [1200, 1600],
    },
    {
      role: "sales",
      dept: "sales",
      deptCode: "COMM",
      titleEn: "Business Development Executive",
      titleAr: "تنفيذي تطوير أعمال",
      salary: [1000, 1300],
    },
    {
      role: "accountant",
      dept: "finance",
      deptCode: "FIN",
      titleEn: "Accounts Payable Officer",
      titleAr: "موظف حسابات دائنة",
      salary: [900, 1200],
    },
    {
      role: "marketing",
      dept: "marketing",
      deptCode: "COMM",
      titleEn: "Social Media Coordinator",
      titleAr: "منسق وسائل التواصل",
      salary: [850, 1100],
    },
    {
      role: "operations_manager",
      dept: "production",
      deptCode: "PROD",
      titleEn: "Studio Operations Manager",
      titleAr: "مدير عمليات الاستوديو",
      salary: [1700, 2200],
    },
    {
      role: "project_lead",
      dept: "production",
      deptCode: "PROD",
      titleEn: "Sound Recordist",
      titleAr: "مهندس تسجيل صوتي",
      salary: [1000, 1300],
    },
    // HR-only crew without a login
    {
      role: null,
      dept: "production",
      deptCode: "PROD",
      titleEn: "Gaffer",
      titleAr: "فني إضاءة رئيسي",
      salary: [800, 1000],
    },
    {
      role: null,
      dept: "production",
      deptCode: "PROD",
      titleEn: "Grip",
      titleAr: "فني معدات التصوير",
      salary: [650, 800],
    },
    {
      role: null,
      dept: "production",
      deptCode: "PROD",
      titleEn: "Production Driver",
      titleAr: "سائق الإنتاج",
      salary: [450, 600],
    },
    {
      role: null,
      dept: "production",
      deptCode: "PROD",
      titleEn: "Drone Pilot",
      titleAr: "طيار درون",
      salary: [900, 1200],
    },
    {
      role: null,
      dept: "post_production",
      deptCode: "POST",
      titleEn: "Media Archivist",
      titleAr: "أمين الأرشيف الإعلامي",
      salary: [700, 900],
    },
    {
      role: null,
      dept: "finance",
      deptCode: "FIN",
      titleEn: "Office Administrator",
      titleAr: "إداري المكتب",
      salary: [600, 800],
    },
  ];
  const managerByDept: Record<string, string> = {
    production: prodManager.id,
    post_production: prodManager.id,
    finance: finance.id,
    sales: owner.id,
    marketing: owner.id,
  };
  const staffUsers: SeedUser[] = [];
  const usedStaffNames = new Set<string>();
  for (const [index, plan] of staffPlan.entries()) {
    let first, last;
    do {
      first = pick(FIRST);
      last = pick(LAST);
    } while (usedStaffNames.has(first[0] + last[0]));
    usedStaffNames.add(first[0] + last[0]);
    const slug = `${first[0]}.${last[0].replace(/^Al-/, "")}`.toLowerCase();
    const email = `${slug}${index}@example.com`;
    const hireDate = daysAgo(int(120, 2400));
    let userId: string | null = null;
    if (plan.role) {
      const user = await prisma.user.create({
        data: {
          email,
          fullName: `${first[0]} ${last[0]}`,
          passwordHash: ctx.passwordHash,
          role: plan.role,
          department: plan.dept,
          phone: `+973 3${int(100, 999)} ${int(1000, 9999)}`,
          managerId: managerByDept[plan.dept],
          isActive: true,
        },
      });
      userId = user.id;
      staffUsers.push({
        id: user.id,
        email,
        fullName: user.fullName,
        role: plan.role,
      });
    }
    await createEmployee(
      {
        userId,
        firstNameEn: first[0],
        lastNameEn: last[0],
        firstNameAr: first[1],
        lastNameAr: last[1],
        email: userId ? email : null,
        phone: `+973 3${int(100, 999)} ${int(1000, 9999)}`,
        cprNumber: String(int(800000000, 999999999)),
        jobTitleEn: plan.titleEn,
        jobTitleAr: plan.titleAr,
        departmentId: departments[plan.deptCode] ?? null,
        hireDate,
        basicSalary: int(plan.salary[0], plan.salary[1]),
        housingAllowance: pick([0, 150, 200, 250, 300]),
        transportAllowance: pick([0, 50, 75, 100]),
        // Bahraini hires from the last three years are on Wage support fund's 70/50/30% wage support.
        payrollSettings:
          hireDate > daysAgo(3 * 365) && chance(0.7)
            ? { ...CONTRIBUTIONS, supports: supportSchedule("Wage support fund", iso(hireDate).slice(0, 7), [70, 50, 30]) }
            : CONTRIBUTIONS,
      },
      owner.id,
    );
    bump("employees");
  }
  const allStaff = [
    ...Object.values(u).filter((x) => x.role !== "viewer"),
    ...staffUsers,
  ];
  const salesTeam = allStaff.filter((x) =>
    ["sales", "super_admin", "admin"].includes(x.role),
  );
  // Sales staff may give up to 7.5% without approval; everyone else uses the 5% company default.
  await prisma.user.updateMany({
    where: { role: "sales" },
    data: { discountLimitPercent: 7.5, commissionRatePercent: 5 },
  });
  await prisma.user.updateMany({
    where: { role: "admin" },
    data: { commissionRatePercent: 2 },
  });
  const productionTeam = allStaff.filter(
    (x) =>
      ["project_lead", "operations_manager", "editor"].includes(x.role) &&
      x.id !== u.editor?.id,
  );
  const projects: readonly (readonly [string, string])[] =
    ctx.activities.length === 1 && ctx.activities[0] === "media"
      ? PROJECTS
      : ctx.activities.flatMap((activity) =>
          ACTIVITY_SAMPLES[activity].items.map((item) => item.title),
        );

  // ============================================================ 2. customers
  const companies = shuffle(
    PLACES.flatMap((p) => SECTORS.map((s) => `${p} ${s}`)),
  ).slice(0, 110);
  const contacts: Array<{
    id: string;
    company: string;
    name: string;
    email: string;
  }> = [];
  for (const companyName of companies) {
    const first = pick(FIRST),
      last = pick(LAST);
    const domain =
      companyName.toLowerCase().replace(/[^a-z]+/g, "") + ".example";
    let email =
      `${first[0]}.${last[0].replace(/^Al-/, "")}@${domain}`.toLowerCase();
    for (let n = 2; usedEmails.has(email); n++)
      email = email.replace("@", `${n}@`);
    usedEmails.add(email);
    let phone;
    do phone = `+973 3${int(200, 999)} ${int(1000, 9999)}`;
    while (usedPhones.has(phone));
    usedPhones.add(phone);
    const jobTitle = pick(JOB_TITLES);
    const contact = await createCRMContact({
      client_kind: "company",
      company_origin: "local",
      cr_number: `${100000 + contacts.length}-1`,
      first_name: first[0],
      last_name: last[0],
      email,
      phone,
      company: companyName,
      job_title: jobTitle,
      contact_persons: [
        {
          full_name: `${first[0]} ${last[0]}`,
          position: jobTitle,
          email,
          phone,
          is_primary: true,
        },
      ],
      vat_number: chance(0.6)
        ? `2${int(10000000, 99999999)}00000${int(1, 9)}`
        : undefined,
      contact_type: chance(0.9) ? "client" : "agency",
      notes: chance(0.3)
        ? "Prefers WhatsApp for scheduling; finance contact copied on invoices."
        : undefined,
    });
    contacts.push({
      id: contact.id,
      company: companyName,
      name: `${first[0]} ${last[0]}`,
      email,
    });
    bump("contacts");
  }
  // Customers are created "over time" so dossiers show a believable history.
  for (const [i, c] of contacts.entries())
    await prisma.crmContact.update({
      where: { id: c.id },
      data: { createdAt: daysAgo(470 - i * 4) },
    });

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  const lineItemsFor = (scale = 1) =>
    shuffle(services)
      .slice(0, int(3, 5))
      .map((s) => ({
        serviceId: s.id,
        descriptionEn: s.nameEn,
        descriptionAr: s.nameAr,
        quantity:
          s.unit === "day" || s.unit === "hour" ? int(2, 7) * scale : int(1, 2),
        unitPrice: Number(s.defaultRate) || int(300, 2500),
      }));

  // ============================================================ 3. deals, quotations, invoices
  type InvoicePlan = {
    issueDate: Date;
    contactId: string;
    dealId?: string;
    quotationId?: string;
    lines: ReturnType<typeof lineItemsFor>;
    discount?: { type: "percentage" | "fixed"; value: number };
    salesOwnerId?: string;
  };
  const invoicePlans: InvoicePlan[] = [];
  const deals: Array<{
    id: string;
    contactId: string;
    created: Date;
    shootDate: Date;
  }> = [];

  for (let i = 0; i < 150; i++) {
    const contact = pick(contacts);
    const project = pick(projects);
    const created = daysAgo(chance(0.4) ? int(2, 90) : int(91, 440)); // busier recent quarter
    const shootDate = addDays(created, int(20, 75));
    const lines = lineItemsFor();
    const value = round3(
      lines.reduce(
        (sum, l) => sum + lineTotal(l.quantity, l.unitPrice, "BHD"),
        0,
      ),
    );
    const owner_ = pick(salesTeam);
    const deal = await createCRMDeal({
      title: `${contact.company} — ${project[0]}`,
      value,
      contact_id: contact.id,
      stage: "lead",
      probability: 20,
      shoot_date: iso(shootDate),
      target_close_date: iso(addDays(created, 30)),
      assigned_to: owner_.id,
      notes: `Brief: ${project[0]} (${project[1]}). Primary contact ${contact.name}.`,
    });
    await prisma.crmDeal.update({
      where: { id: deal.id },
      data: { createdAt: created },
    });
    deals.push({ id: deal.id, contactId: contact.id, created, shootDate });
    bump("deals");

    // ~22% of deals never get a quotation (cold leads or lost early).
    if (chance(0.22)) {
      if (created < daysAgo(60) && chance(0.45)) {
        await updateCRMDeal(deal.id, {
          stage: "closed_lost",
          lost_reason: pick(LOST_REASONS),
          probability: 0,
        });
        bump("dealsLost");
      }
      continue;
    }

    const issueDate = addDays(created, int(2, 6));
    const discount = chance(0.3)
      ? { type: "percentage" as const, value: pick([5, 7.5, 10]) }
      : undefined;
    const quotation = await createQuotation(
      {
        clientId: contact.id,
        dealId: deal.id,
        issueDate,
        validUntilDate: addDays(issueDate, 30),
        currency: "BHD",
        language: chance(0.6) ? "ar" : "en",
        vatEnabled,
        vatPercentage,
        discountType: discount?.type ?? "none",
        discountValue: discount?.value ?? 0,
        termsEn:
          "50% advance on confirmation, balance on delivery. Valid for 30 days.",
        termsAr:
          "دفعة مقدمة 50% عند التأكيد والباقي عند التسليم. العرض ساري لمدة 30 يوماً.",
        lineItems: lines.map((l) => ({
          descriptionEn: l.descriptionEn,
          descriptionAr: l.descriptionAr,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
        // Most quotations are credited to their issuer; some to the salesperson who brought the lead.
        salesOwnerId: chance(0.2) ? pick(salesTeam).id : owner_.id,
      },
      owner_.id,
    );
    bump("quotations");
    if (issueDate > daysAgo(3) && chance(0.5)) continue; // fresh drafts

    const submitted = await submitQuotationForApproval(
      quotation.id,
      owner_.id,
      discount
        ? `Agreed ${discount.value}% for ${pick(["repeat client", "multi-film package", "annual retainer", "early confirmation"])}`
        : undefined,
    );
    const pending = await prisma.approvalRequest.findUniqueOrThrow({
      where: { id: submitted.approvalRequestId },
    });
    // Discounts within the issuer's limit are approved on submit; larger ones wait for a decision.
    if (pending.status === "pending") {
      const approvers = await approverIdsFor(prisma, pending.id);
      if (issueDate > daysAgo(21) && chance(0.45)) continue; // waiting in the Approvals Center
      const rejected = chance(0.1);
      await decideFully(
        {
          approvalRequestId: pending.id,
          status: "pending",
          finalized: false,
          approverIds: approvers,
        },
        rejected ? "rejected" : "approved",
        rejected
          ? "Margin below the minimum for this scope; revise crew days."
          : "Pricing and scope approved.",
      );
      if (rejected) {
        if (created < daysAgo(45))
          (await updateCRMDeal(deal.id, {
            stage: "closed_lost",
            lost_reason:
              "Quotation rejected internally; client chose another vendor",
            probability: 0,
          }),
            bump("dealsLost"));
        continue;
      }
    } else if (pending.status !== "approved") continue;
    const validUntil = addDays(issueDate, 30);
    if (chance(0.08)) continue; // approved, not yet sent
    await signDocument("quotation", quotation.id, await signerFor(owner_.id));
    await issueQuotation(
      quotation.id,
      owner_.id,
      pick(["email", "whatsapp", "manual"]),
    );
    if (validUntil < TODAY) {
      // Old quotations were either accepted or lapsed (the app marks unaccepted ones expired).
      if (chance(0.78))
        await acceptHistoricQuotation(
          prisma,
          quotation.id,
          addDays(issueDate, int(3, 25)),
          `PO-${int(10000, 99999)}`,
        );
      else {
        await prisma.quotation.update({
          where: { id: quotation.id },
          data: { status: "expired" },
        });
        if (chance(0.7))
          (await updateCRMDeal(deal.id, {
            stage: "closed_lost",
            lost_reason: "Quotation expired without client confirmation",
            probability: 0,
          }),
            bump("dealsLost"));
        continue;
      }
    } else if (chance(0.45))
      continue; // still with the client, within validity
    else
      await acceptQuotation(
        quotation.id,
        owner_.id,
        `Signed acceptance ${int(100, 999)}`,
      );
    bump("quotationsAccepted");

    // Production moves on after acceptance; the deal only ever moves forward.
    const sinceShoot = (TODAY.getTime() - shootDate.getTime()) / DAY;
    const stage =
      sinceShoot > 25
        ? "delivered"
        : sinceShoot > 5
          ? "post_production"
          : sinceShoot > -10
            ? "production"
            : null;
    if (stage)
      await updateCRMDeal(deal.id, {
        stage,
        probability: { production: 80, post_production: 90, delivered: 95 }[
          stage
        ],
      });

    if (sinceShoot < 10 && chance(0.75)) continue; // in production: billed after delivery
    const invoiceDate = minDate(addDays(issueDate, int(5, 20)), daysAgo(0));
    if (invoiceDate > daysAgo(2) && chance(0.6)) continue; // accepted, invoice not raised yet
    invoicePlans.push({
      issueDate: invoiceDate,
      contactId: contact.id,
      dealId: deal.id,
      quotationId: quotation.id,
      lines,
      discount,
    });
  }

  // Monthly retainers and one-off jobs billed without a quotation, credited to the client's account manager.
  const accountManagers = new Map<string, string>();
  for (let i = 0; i < 110; i++) {
    const contact = pick(contacts.slice(0, 40)); // a core of repeat clients
    if (!accountManagers.has(contact.id))
      accountManagers.set(contact.id, pick(salesTeam).id);
    invoicePlans.push({
      issueDate: daysAgo(int(1, 450)),
      contactId: contact.id,
      lines: lineItemsFor(),
      salesOwnerId: accountManagers.get(contact.id),
    });
  }

  // Raise invoices in date order so numbers run chronologically.
  invoicePlans.sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime());
  const paymentPlans: Array<{
    invoiceId: string;
    date: Date;
    amount: number;
    method: string;
  }> = [];
  for (const plan of invoicePlans) {
    const issuer = pick([finance, u.accountant ?? finance]);
    const invoice = await createInvoice({
      contact_id: plan.contactId,
      deal_id: plan.dealId,
      quotation_id: plan.quotationId,
      issue_date: iso(plan.issueDate),
      due_date: iso(addDays(plan.issueDate, company.paymentTermsDays ?? 30)),
      currency: "BHD",
      language: chance(0.6) ? "ar" : "en",
      vat_enabled: vatEnabled,
      vat_percentage: vatPercentage,
      discount_type: plan.discount?.type ?? "none",
      discount_value: plan.discount?.value ?? 0,
      line_items: plan.lines.map((l) => ({
        service_id: l.serviceId,
        description_en: l.descriptionEn,
        description_ar: l.descriptionAr,
        quantity: l.quantity,
        unit_price: l.unitPrice,
      })),
      notes_en: `Thank you for choosing ${brand.nameEn}.`,
      notes_ar: `شكراً لاختياركم ${brand.nameAr}.`,
      created_by: issuer.id,
      sales_owner_id: plan.salesOwnerId,
    });
    bump("invoices");
    const age = (TODAY.getTime() - plan.issueDate.getTime()) / DAY;
    if (age < 6 && chance(0.4)) continue; // draft
    if (age > 30 && chance(0.03)) {
      await updateInvoiceStatus(invoice.id, "void");
      bump("invoicesVoid");
      continue;
    }
    // Invoices above the policy threshold wait for an approver; the seed takes them through every step.
    await decideFully(
      await requestInvoiceApproval(invoice.id, issuer.id),
      "approved",
      "Invoice checked against the signed scope.",
    );
    await signDocument(
      "invoice",
      invoice.id,
      await signerFor(plan.salesOwnerId ?? issuer.id),
    );
    await updateInvoiceStatus(invoice.id, "sent");

    const total = invoice.total_amount;
    const roll =
      age > 75 ? (chance(0.93) ? 0 : chance(0.5) ? 0.8 : 0.95) : rand();
    if (age < 10 || roll > 0.9) continue; // unpaid (becomes overdue once past due)
    const lastDay = minDate(addDays(plan.issueDate, int(5, 45)), daysAgo(0));
    if (roll < 0.72) {
      if (chance(0.25)) {
        const first = round3(total * 0.5);
        paymentPlans.push({
          invoiceId: invoice.id,
          date: addDays(plan.issueDate, int(1, 7)),
          amount: first,
          method: pick(PAYMENT_METHODS),
        });
        paymentPlans.push({
          invoiceId: invoice.id,
          date: lastDay,
          amount: round3(total - first),
          method: pick(PAYMENT_METHODS),
        });
      } else
        paymentPlans.push({
          invoiceId: invoice.id,
          date: lastDay,
          amount: total,
          method: pick(PAYMENT_METHODS),
        });
    } else
      paymentPlans.push({
        invoiceId: invoice.id,
        date: lastDay,
        amount: round3(total * pick([0.3, 0.4, 0.5, 0.6])),
        method: pick(PAYMENT_METHODS),
      });
  }
  paymentPlans.sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const p of paymentPlans) {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: p.invoiceId },
      select: { issueDate: true },
    });
    const date = p.date < invoice.issueDate ? invoice.issueDate : p.date;
    const receipt = await createPayment({
      invoice_id: p.invoiceId,
      payment_date: iso(minDate(date, TODAY)),
      amount: p.amount,
      currency: "BHD",
      payment_method: p.method as never,
      reference_number:
        p.method === "cheque"
          ? `CHQ-${int(100000, 999999)}`
          : p.method === "cash"
            ? undefined
            : `TRF${int(10000000, 99999999)}`,
      created_by: finance.id,
    });
    if (chance(0.92))
      await signDocument("receipt", receipt.id, await signerFor(finance.id));
    bump("payments");
  }

  // ============================================================ 3b. sales credit changes & commission payouts
  {
    const credited = await prisma.invoice.findMany({
      where: { status: { not: "void" }, salesOwnerId: { not: null } },
      select: { id: true, salesOwnerId: true },
      take: 400,
    });
    for (const inv of shuffle(credited).slice(0, 14)) {
      const to = pick(salesTeam.filter((x) => x.id !== inv.salesOwnerId));
      if (!to) continue;
      await reassignSalesOwner(
        "invoice",
        inv.id,
        to.id,
        owner.id,
        pick([
          "Lead introduced by this salesperson",
          "Account handed over",
          "Corrected credit after client confirmation",
        ]),
      );
      bump("salesCreditChanges");
    }
    const currentMonth = iso(TODAY).slice(0, 7);
    // Staff on payroll are paid their commission with their salary; only others get a separate payout.
    const onPayroll = new Set(
      (
        await prisma.employee.findMany({
          where: { userId: { not: null }, status: { not: "terminated" } },
          select: { userId: true },
        })
      ).map((e) => e.userId),
    );
    for (let back = 6; back >= 1; back--) {
      const month = iso(
        new Date(
          Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - back, 1),
        ),
      ).slice(0, 7);
      if (month >= currentMonth) continue;
      for (const row of await getCommissionStatement(month)) {
        if (
          row.commission > 0 &&
          !onPayroll.has(row.userId) &&
          (back > 1 || chance(0.5))
        ) {
          await recordCommissionPayout(row.userId, month, finance.id);
          bump("commissionPayouts");
        }
      }
    }
  }

  // ============================================================ 4. expenses (with approvals)
  const categories = Object.fromEntries(
    (await prisma.expenseCategory.findMany()).map((c) => [c.slug, c.id]),
  );
  const VATABLE = new Set([
    "gear_rental",
    "travel_logistics",
    "studio_overhead",
  ]);
  const expenseSpecs: Array<{
    slug: string;
    en: string;
    ar: string;
    amount: number;
    vendor: string;
    date: Date;
    dealId?: string;
    clientId?: string;
    recurring?: string;
  }> = [];
  for (let m = 14; m >= 0; m--) {
    const first = new Date(
      Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - m, 1),
    );
    if (first > TODAY) continue;
    expenseSpecs.push({
      slug: "studio_overhead",
      en: "Studio lease & utilities",
      ar: "إيجار الاستوديو والخدمات",
      amount: 1375,
      vendor: "Seafront Commercial Real Estate",
      date: first,
      recurring: "monthly",
    });
    expenseSpecs.push({
      slug: "software_licenses",
      en: "Editing suite & cloud storage subscriptions",
      ar: "اشتراكات برامج المونتاج والتخأوربت السحابي",
      amount: 280,
      vendor: "Blackmagic Cloud / LucidLink",
      date: addDays(first, 2),
      recurring: "monthly",
    });
    expenseSpecs.push({
      slug: "telecom",
      en: "Fibre internet & mobile lines",
      ar: "الإنترنت والخطوط المتنقلة",
      amount: 145,
      vendor: "Gulfwave",
      date: addDays(first, 4),
      recurring: "monthly",
    });
    expenseSpecs.push({
      slug: "fuel_transport",
      en: "Production van fuel",
      ar: "وقود سيارة الإنتاج",
      amount: int(60, 140),
      vendor: "Delta",
      date: addDays(first, int(5, 20)),
    });
    if (chance(0.5))
      expenseSpecs.push({
        slug: "office_supplies",
        en: "Office supplies & printing",
        ar: "قرطاسية وطباعة",
        amount: int(25, 120),
        vendor: "Jashanmal Office",
        date: addDays(first, int(6, 25)),
      });
    if (chance(0.4))
      expenseSpecs.push({
        slug: "advertising",
        en: "Instagram & LinkedIn paid campaigns",
        ar: "حملات إعلانية مدفوعة على إنستغرام ولينكدإن",
        amount: int(150, 600),
        vendor: "Meta Ads / LinkedIn",
        date: addDays(first, int(3, 20)),
      });
    if (chance(0.25))
      expenseSpecs.push({
        slug: "maintenance",
        en: "Camera sensor cleaning & servicing",
        ar: "تنظيف وصيانة حساسات الكاميرات",
        amount: int(40, 220),
        vendor: "Gulf Camera Service Centre",
        date: addDays(first, int(5, 25)),
      });
    expenseSpecs.push({
      slug: "bank_charges",
      en: "Bank transfer & card charges",
      ar: "رسوم التحويلات والبطاقات",
      amount: int(8, 35),
      vendor: "Harbor National Bank",
      date: addDays(first, 27),
    });
    if (first.getUTCMonth() % 12 === 0) {
      expenseSpecs.push({
        slug: "insurance",
        en: "Annual equipment insurance",
        ar: "تأمين المعدات السنوي",
        amount: 1850,
        vendor: "Bahrain National Insurance",
        date: addDays(first, 10),
      });
      expenseSpecs.push({
        slug: "government_fees",
        en: "CR renewal & municipal licence",
        ar: "تجديد السجل التجاري والرخصة البلدية",
        amount: 240,
        vendor: "MOIC Sijilat",
        date: addDays(first, 12),
      });
    }
    if (m % 4 === 2)
      expenseSpecs.push({
        slug: "training",
        en: "DaVinci Resolve colour grading course",
        ar: "دورة تصحيح الألوان في دافنشي",
        amount: int(180, 450),
        vendor: "Online Academy",
        date: addDays(first, int(8, 20)),
      });
  }
  const PROJECT_COSTS = [
    [
      "gear_rental",
      "Camera & lens package rental",
      "استئجار باقة كاميرا وعدسات",
      [300, 1600],
      "Gulf Camera Gear Rentals",
    ],
    [
      "gear_rental",
      "Lighting & grip truck rental",
      "استئجار شاحنة الإضاءة والمعدات",
      [250, 900],
      "Gulf Motion Grip Services",
    ],
    [
      "crew_wages",
      "Freelance crew day rates",
      "أجور الطاقم المستقل اليومية",
      [200, 1200],
      "Freelance crew",
    ],
    [
      "crew_wages",
      "Talent & voice-over fees",
      "أجور المواهب والتعليق الصوتي",
      [150, 900],
      "Bahrain Talent Casting",
    ],
    [
      "travel_logistics",
      "Location permits & transport",
      "تصاريح المواقع والنقل",
      [80, 450],
      "Manama Logistics",
    ],
    [
      "travel_logistics",
      "Crew catering",
      "ضيافة طاقم التصوير",
      [90, 380],
      "Manama Gourmet Catering",
    ],
    [
      "marketing_pr",
      "Festival submission & showreel promotion",
      "رسوم المهرجانات والترويج",
      [100, 400],
      "Festival submissions",
    ],
    [
      "freelancers",
      "Freelance editor & colourist",
      "محرر ومصحح ألوان مستقل",
      [250, 1100],
      "Freelance post team",
    ],
    [
      "location_permits",
      "Location booking & municipality permit",
      "حجز الموقع وتصريح البلدية",
      [60, 500],
      "Bahrain Municipality",
    ],
    [
      "props_set",
      "Set dressing, props & wardrobe",
      "تجهيز الديكور والإكسسوارات والأزياء",
      [80, 650],
      "Manama Props House",
    ],
    [
      "catering",
      "Shoot day catering",
      "وجبات يوم التصوير",
      [70, 320],
      "Manama Gourmet Catering",
    ],
    [
      "post_production",
      "Outsourced VFX & motion graphics",
      "مؤثرات بصرية وموشن جرافيك خارجية",
      [300, 1500],
      "Pixel Gulf Studio",
    ],
    [
      "music_licensing",
      "Licensed music & stock footage",
      "موسيقى مرخصة ولقطات جاهزة",
      [40, 300],
      "Artlist / Envato",
    ],
  ] as const;
  for (const deal of deals) {
    if (deal.shootDate > TODAY || chance(0.35)) continue;
    for (let k = int(1, 3); k > 0; k--) {
      const [slug, en, ar, [lo, hi], vendor] = pick(PROJECT_COSTS);
      expenseSpecs.push({
        slug,
        en,
        ar,
        amount: int(lo, hi),
        vendor,
        date: minDate(addDays(deal.shootDate, int(-3, 3)), TODAY),
        dealId: deal.id,
      });
    }
  }
  // Client costs outside a deal: pitches and account hospitality, filed under the client.
  for (let i = 0; i < 18; i++) {
    const client = pick(contacts);
    const [en, ar, vendor, slug] = pick([
      [
        "Pitch mock-up shoot",
        "تصوير نموذج للعرض التقديمي",
        "In-house",
        "props_set",
      ],
      [
        "Client meeting hospitality",
        "ضيافة اجتماع العميل",
        "Café Lilou",
        "catering",
      ],
      [
        "Courier of hard drives to client",
        "توصيل الأقراص الصلبة للعميل",
        "Aramex",
        "fuel_transport",
      ],
    ] as const);
    expenseSpecs.push({
      slug,
      en,
      ar,
      amount: int(15, 220),
      vendor,
      date: daysAgo(int(5, 420)),
      clientId: client.id,
    });
  }
  expenseSpecs.sort((a, b) => a.date.getTime() - b.date.getTime());
  const spenders = [prodManager, finance, ...productionTeam.slice(0, 4)];
  for (const spec of expenseSpecs) {
    const vat = VATABLE.has(spec.slug) ? round3((spec.amount * 10) / 110) : 0;
    const creator = spec.recurring ? finance : pick(spenders);
    const expense = await createExpense(
      {
        category_id: categories[spec.slug],
        deal_id: spec.dealId,
        client_id: spec.clientId,
        scope: spec.dealId ? "deal" : spec.clientId ? "client" : "internal",
        description_en: spec.en,
        description_ar: spec.ar,
        amount: spec.amount,
        currency: "BHD",
        expense_date: iso(spec.date),
        vendor_name: spec.vendor,
        is_recurring: !!spec.recurring,
        recurrence_interval: spec.recurring,
        is_billable: !!spec.dealId && chance(0.3),
        input_vat_amount: vat,
        is_vat_recoverable: vatEnabled && vat > 0,
      },
      creator.id,
    );
    const outcome = await submit("expense", expense.id, creator.id, {
      amount: spec.amount,
      currency: "BHD",
      vendor: spec.vendor,
    });
    bump("expenses");
    if (outcome.status !== "pending") continue;
    if (spec.date > daysAgo(21) && chance(0.35)) continue; // awaiting approval
    await decideFully(
      outcome,
      chance(0.05) ? "rejected" : "approved",
      "Reviewed against project budget.",
    );
  }

  // ============================================================ 5. service requests (SR/CR) & inquiries
  const REQUEST_TOPICS = {
    SR: [
      ["Additional shoot day", "يوم تصوير إضافي"],
      ["Re-edit of the 30s cut", "إعادة مونتاج نسخة 30 ثانية"],
      [
        "Subtitle files in Arabic and English",
        "ملفات الترجمة بالعربية والإنجليزية",
      ],
      ["Raw footage delivery on drive", "تسليم المواد الخام على قرص"],
      ["Vertical cut for social media", "نسخة عمودية لوسائل التواصل"],
    ],
    CR: [
      [
        "Colour mismatch in final delivery",
        "اختلاف الألوان في النسخة النهائية",
      ],
      ["Late delivery of event highlights", "تأخر تسليم ملخص الفعالية"],
      ["Audio levels uneven in interview", "عدم توازن مستوى الصوت في المقابلة"],
      ["Logo placement incorrect", "موضع الشعار غير صحيح"],
    ],
    quote_request: [
      ["Quote for product launch film", "عرض سعر لفيلم إطلاق منتج"],
      [
        "Pricing for monthly social content",
        "تسعير محتوى شهري للتواصل الاجتماعي",
      ],
      ["Drone package for property launch", "باقة درون لإطلاق مشروع عقاري"],
    ],
    inquiry: [
      ["Studio availability next month", "توفر الاستوديو الشهر القادم"],
      ["Partnership for a festival", "شراكة في مهرجان"],
      ["Internship opportunities", "فرص التدريب"],
    ],
  } as const;
  const requesters = [prodManager, sales, owner, finance];
  for (let i = 0; i < 80; i++) {
    const type = pick([
      "SR",
      "SR",
      "SR",
      "SR",
      "quote_request",
      "quote_request",
      "inquiry",
    ] as const);
    const topic = pick<readonly [string, string]>(REQUEST_TOPICS[type]);
    const contact = pick(contacts);
    const actor = pick(requesters);
    const request = await createConsolidatedRequest(
      {
        requestType: type,
        name: contact.name,
        email: contact.email,
        companyName: contact.company,
        serviceType: topic[0],
        message: `${topic[0]} — ${topic[1]}. Requested by ${contact.name}.`,
        priority: pick(["normal", "normal", "normal", "high", "urgent"]),
        team: "production",
        customerId: contact.id,
        slaDueDate: addDays(TODAY, int(-5, 20)),
      },
      actor.id,
    );
    bump("requests");
    if (type !== "SR") continue;
    const roll = rand();
    if (roll < 0.15) continue; // received
    const assignee = pick(productionTeam);
    await assignRequest(request.id, {
      assignedToId: assignee.id,
      team: "production",
      assignedById: prodManager.id,
      assignedByName: prodManager.fullName,
      notes: "Please handle and update the client.",
    });
    if (roll < 0.3) continue; // assigned
    if (roll < 0.36) {
      await returnRequest(request.id, {
        returnedById: prodManager.id,
        returnedByName: prodManager.fullName,
        reason: "Missing the client's delivery specifications.",
      });
      continue;
    }
    await submitRequestForApproval(request.id, {
      submittedById: assignee.id,
      submittedByName: assignee.fullName,
      notes: "Work completed, ready for sign-off.",
    });
    const outcome = await submit("service_request", request.id, assignee.id, {
      reference: request.reference,
      requestType: type,
    });
    if (roll < 0.45 || outcome.status !== "pending") continue; // pending approval
    await decideFully(outcome, "approved", "Checked against the brief.");
    if (roll < 0.55) continue; // approved
    await confirmRequest(request.id, {
      confirmedById: owner.id,
      confirmedByName: owner.fullName,
      notes: "Confirmed with the client.",
    });
    if (roll < 0.65) continue; // confirmed
    await resolveRequest(request.id, {
      resolvedById: prodManager.id,
      resolvedByName: prodManager.fullName,
      resolutionNotes: "Delivered and acknowledged by the client.",
    });
  }

  // ============================================================ 6. leave
  const leaveTypes = Object.fromEntries(
    (await prisma.leaveType.findMany()).map((t) => [t.code, t.id]),
  );
  const employees = await prisma.employee.findMany({
    where: { userId: { not: null } },
    include: { user: true },
  });
  for (const employee of employees) {
    if (employee.user?.role === "super_admin") continue;
    let cursor = daysAgo(int(300, 360));
    for (let k = int(1, 3); k > 0; k--) {
      cursor = addDays(cursor, int(40, 120));
      const days = int(1, 5);
      const start = cursor,
        end = addDays(cursor, days - 1);
      // Nobody is on leave today: on-leave staff cannot act in the app, and current absences belong to the core fixtures.
      if (start <= addDays(TODAY, 2) && end >= addDays(TODAY, -2)) continue;
      if (start > addDays(TODAY, 60)) break;
      const type = pick(["annual", "annual", "annual", "sick", "emergency"]);
      let leave;
      try {
        leave = await createLeaveRequest({
          employeeId: employee.id,
          leaveTypeId: leaveTypes[type] ?? leaveTypes.annual,
          startDate: start,
          endDate: end,
          reason:
            type === "sick"
              ? "Medical rest as advised by the doctor."
              : type === "emergency"
                ? "Family emergency."
                : "Annual leave.",
        });
      } catch {
        continue; // the leave rules (weekends, balance, overlaps) refused it — exactly as the app would
      }
      const outcome = await submit(
        "leave_request",
        leave.id,
        employee.userId!,
        {
          startDate: iso(start),
          endDate: iso(end),
          leaveTypeId: leave.leaveTypeId,
        },
      );
      bump("leaveRequests");
      if (outcome.status !== "pending" || (start > TODAY && chance(0.4)))
        continue;
      await decideFully(
        outcome,
        chance(0.12) ? "rejected" : "approved",
        "Coverage confirmed with the team.",
      );
      cursor = end;
    }
  }

  for (const employee of shuffle(
    employees.filter((e) => e.user?.role !== "super_admin"),
  ).slice(0, 9)) {
    const start = addDays(TODAY, int(7, 50));
    let leave;
    try {
      leave = await createLeaveRequest({
        employeeId: employee.id,
        leaveTypeId: leaveTypes.annual,
        startDate: start,
        endDate: addDays(start, int(1, 6)),
        reason: "Annual leave.",
      });
    } catch {
      continue;
    }
    const outcome = await submit("leave_request", leave.id, employee.userId!, {
      startDate: iso(start),
      leaveTypeId: leave.leaveTypeId,
    });
    bump("leaveRequests");
    if (outcome.status === "pending" && chance(0.4))
      await decideFully(outcome, "approved", "Approved; handover agreed.");
  }

  // ============================================================ 7. payroll (12 paid months + current month calculated)
  for (let m = 12; m >= 0; m--) {
    const period = new Date(
      Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - m, 1),
    );
    const month = period.getUTCMonth() + 1,
      year = period.getUTCFullYear();
    if (
      await prisma.payrollRun.findUnique({
        where: { year_month: { year, month } },
      })
    )
      continue;
    const run = await createPayrollRun(month, year, finance.id);
    bump("payrollRuns");
    // HR adjusts a few lines each month: project bonuses and unpaid-leave deductions.
    for (const item of shuffle(run.items ?? []).slice(0, int(1, 3))) {
      const bonus = chance(0.7) ? pick([50, 75, 100, 150, 250]) : 0;
      const deduction = bonus
        ? 0
        : round3((Number(item.basicSalary) / 30) * int(1, 2));
      await setPayrollItemLines(
        item.id,
        {
          additions: bonus
            ? [
                {
                  category: "bonus",
                  label: pick([
                    "Project delivery bonus",
                    "Overtime on festival week",
                    "Client appreciation incentive",
                  ]),
                  amount: bonus,
                },
              ]
            : [],
          deductions: deduction
            ? [
                {
                  category: "absence_adjustment",
                  label: "Unpaid leave days",
                  amount: deduction,
                },
              ]
            : [],
        },
        finance.id,
      );
      bump("payrollAdjustments");
    }
    if (m === 0) continue; // current month: calculated, not yet submitted
    const submitted = await submitPayrollRunForApproval(run.id, finance.id);
    const approvers = await approverIdsFor(prisma, submitted.approvalRequestId);
    if (approvers.length)
      await decideFully(
        {
          approvalRequestId: submitted.approvalRequestId,
          status: "pending",
          finalized: false,
          approverIds: approvers,
        },
        "approved",
        "Payroll reconciled with attendance and contracts.",
      );
    const approved = await prisma.payrollRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    if (m === 1 && chance(0.5)) continue; // last month approved, payment pending
    if (approved.status === "approved")
      await markPayrollAsPaid(run.id, owner.id);
  }

  // ============================================================ 7b. Wage support fund six-monthly reimbursements received
  for (const claim of await getSupportClaims()) {
    if (
      claim.status !== "claimable" ||
      claim.periodEnd >= iso(daysAgo(75)).slice(0, 7)
    )
      continue;
    await recordSupportReimbursement(
      {
        employeeId: claim.employeeId,
        provider: claim.provider,
        periodStart: claim.periodStart,
        receivedAmount: claim.accrued,
        receivedOn: iso(
          addDays(new Date(`${claim.periodEnd}-28T00:00:00Z`), int(20, 50)),
        ),
        reference: `TMK-${int(100000, 999999)}`,
      },
      finance.id,
    );
    bump("supportReimbursements");
  }

  // ============================================================ 7c. signature history (each current signature was approved) and one waiting
  for (const person of Object.values(u)) {
    const current = await prisma.user.findUniqueOrThrow({
      where: { id: person.id },
      select: { signatureUrl: true, createdAt: true },
    });
    if (!current.signatureUrl) continue;
    await prisma.signatureChange.create({
      data: {
        userId: person.id,
        signatureUrl: current.signatureUrl,
        status: "approved",
        reviewedById: owner.id,
        reviewNotes: "Signature on file at onboarding.",
        decidedAt: current.createdAt,
        createdAt: current.createdAt,
      },
    });
    bump("signatureChanges");
  }
  {
    const newcomer = staffUsers[0];
    const change = await prisma.signatureChange.create({
      data: { userId: newcomer.id, signatureUrl: sampleSignatureUrl ?? "" },
    });
    await submit("signature_change", change.id, newcomer.id);
    bump("signatureChanges");
  }

  // ============================================================ 8. calendar & minutes of meetings
  for (const deal of deals) {
    if (deal.shootDate < daysAgo(200) || deal.shootDate > addDays(TODAY, 90))
      continue;
    const start = new Date(deal.shootDate.getTime() + 7 * 3600_000);
    await createCalendarEvent({
      title: "Shoot day",
      title_ar: "يوم التصوير",
      start_date: start.toISOString(),
      end_date: new Date(start.getTime() + 9 * 3600_000).toISOString(),
      event_type: "shoot",
      color: "#09937F",
      deal_id: deal.id,
      location: pick([
        "Studio Stage A",
        "Client premises",
        "Amwaj Islands",
        "Bahrain Bay",
        "Exhibition World Bahrain",
      ]),
      created_by: prodManager.id,
    });
    const meeting = new Date(
      addDays(deal.created, int(1, 4)).getTime() + 10 * 3600_000,
    );
    await createCalendarEvent({
      title: "Client briefing",
      title_ar: "اجتماع إحاطة مع العميل",
      start_date: meeting.toISOString(),
      end_date: new Date(meeting.getTime() + 3600_000).toISOString(),
      event_type: "meeting",
      color: "#3B82F6",
      deal_id: deal.id,
      created_by: pick(salesTeam).id,
    });
    bump("calendarEvents", 2);
  }
  for (let w = -8; w <= 8; w++) {
    const deadline = new Date(
      addDays(TODAY, w * 7 + 4).getTime() + 14 * 3600_000,
    );
    await createCalendarEvent({
      title: "Weekly delivery review",
      title_ar: "مراجعة التسليمات الأسبوعية",
      start_date: deadline.toISOString(),
      end_date: new Date(deadline.getTime() + 3600_000).toISOString(),
      event_type: "deadline",
      color: "#E11D48",
      created_by: prodManager.id,
    });
    bump("calendarEvents");
  }

  for (const deal of shuffle(
    deals.filter((d) => d.created < daysAgo(10)),
  ).slice(0, 26)) {
    const contact = contacts.find((c) => c.id === deal.contactId)!;
    const meetingDate = addDays(deal.created, int(1, 6));
    const mom = await createMinuteOfMeeting({
      title: `Kick-off meeting — ${contact.company}`,
      titleAr: `اجتماع الانطلاق — ${contact.company}`,
      meetingDate: iso(meetingDate),
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      location: pick([`${brand.nameEn} Studio`, "Client HQ", "Zoom"]),
      dealId: deal.id,
      clientId: contact.id,
      attendees: [
        {
          name: contact.name,
          role: "Client",
          email: contact.email,
          organization: contact.company,
          attended: true,
        },
        {
          name: prodManager.fullName,
          role: "Production Manager",
          email: prodManager.email,
          organization: `${brand.nameEn}`,
          attended: true,
        },
      ] as never,
      agenda: "Creative brief, schedule, deliverables and budget.",
      discussionPoints: [
        {
          topic: "Creative direction",
          notes: "Agreed on tone and reference films.",
          speaker: contact.name,
        },
      ] as never,
      actionItems: [
        {
          task: "Share shot list",
          assignee: prodManager.fullName,
          dueDate: iso(addDays(meetingDate, 5)),
          status: meetingDate < daysAgo(10) ? "completed" : "pending",
        },
      ] as never,
      decisions: ["Proceed with pre-production"],
      status: "draft",
      createdById: prodManager.id,
    });
    bump("moms");
    if (meetingDate < daysAgo(5) && chance(0.7) && owner.signatureUrl)
      await approveAndSignMom(mom.id, owner.id, owner.signatureUrl);
  }

  // ============================================================ 8b. staff expense claims (approve → schedule → pay)
  {
    const claimCategories = [
      "fuel_transport",
      "catering",
      "office_supplies",
      "location_permits",
      "props_set",
      "telecom",
    ]
      .map((slug) => categories[slug])
      .filter(Boolean);
    const meetings = await prisma.calendarEvent.findMany({
      where: { startDate: { lte: TODAY, gte: daysAgo(150) } },
      select: { id: true, startDate: true },
      take: 80,
    });
    const invoicesForClaims = await prisma.invoice.findMany({
      where: { status: { not: "draft" } },
      select: { id: true },
      take: 40,
    });
    const CLAIM_REASONS = [
      "Taxi to and from the shoot location",
      "Parking at the client's office",
      "Lunch for the crew on an overrun shoot day",
      "Batteries and gaffer tape bought on set",
      "Courier of drives to the client",
      "Printing call sheets and release forms",
      "Prepaid data for live-stream upload",
      "Coffee for the client review meeting",
    ];
    const claimants = allStaff.filter((x) => x.role !== "super_admin");
    for (let i = 0; i < 46; i++) {
      const claimant = pick(claimants);
      const paidOn = daysAgo(int(2, 140));
      const deal = chance(0.5) ? pick(deals) : null;
      const meeting =
        !deal && meetings.length && chance(0.35) ? pick(meetings) : null;
      const fileUrl = `/api/files/general/seed_claim_${i}_${claimant.id.slice(0, 8)}.jpg`;
      // A real (sample) receipt file, so the claim's receipt opens and passes upload verification.
      await storeFileBytes(fileUrl, SAMPLE_RECEIPT_JPEG, "image/jpeg");
      await prisma.uploadObject.create({
        data: {
          fileUrl,
          ownerId: claimant.id,
          fileName: `receipt-${i + 1}.jpg`,
          fileSize: SAMPLE_RECEIPT_JPEG.length,
          mimeType: "image/jpeg",
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
      const claim = await createExpenseClaim(
        {
          amount: round3(int(3, 95) + rand()),
          expenseDate: iso(paidOn),
          reason: pick(CLAIM_REASONS),
          categoryId: chance(0.8) ? pick(claimCategories) : null,
          dealId: deal?.id ?? null,
          invoiceId:
            deal && invoicesForClaims.length && chance(0.2)
              ? pick(invoicesForClaims).id
              : null,
          calendarEventId: meeting?.id ?? null,
          receiptUrl: fileUrl,
        },
        claimant.id,
      );
      bump("expenseClaims");
      const outcome = await submit("expense_claim", claim.id, claimant.id, {
        amount: claim.amount,
        currency: claim.currency,
      });
      const roll = rand();
      if (outcome.status === "pending" && paidOn > daysAgo(14) && roll < 0.35) {
        if (roll < 0.06) await cancelExpenseClaim(claim.id, claimant.id);
        continue; // awaiting approval (or withdrawn)
      }
      if (outcome.status === "pending" && roll > 0.93) {
        await decideFully(
          outcome,
          "rejected",
          "Personal expense, not reimbursable.",
        );
        continue;
      }
      if (outcome.status === "pending")
        await decideFully(outcome, "approved", "Reasonable and receipted.");
      if (paidOn > daysAgo(10) && chance(0.5)) continue; // approved, waiting for finance
      if (paidOn > daysAgo(25) && chance(0.5)) {
        await scheduleExpenseClaim(
          claim.id,
          finance.id,
          iso(addDays(TODAY, int(1, 7))),
        );
        continue;
      }
      await payExpenseClaim(claim.id, finance.id, {
        method: pick(["bank_transfer", "bank_transfer", "cash", "benefit_pay"]),
        reference: `TRF-${int(10000, 99999)}`,
        categoryId: claim.categoryId ?? pick(claimCategories),
      });
      bump("expenseClaimsPaid");
    }
  }

  // Social analytics are populated only by provider syncs, including in demo companies.

  // ============================================================ 10. company assets (every status and condition)
  {
    const categoriesByCode = Object.fromEntries(
      (await prisma.assetCategory.findMany()).map((c) => [c.code, c]),
    );
    const catalog: Array<[string, string, string, string, number]> = [
      ["camera", "Cinema camera body", "Sony", "FX6", 2900],
      ["camera", "Mirrorless camera", "Sony", "A7S III", 1500],
      ["camera", "Cinema camera body", "Canon", "C70", 2800],
      ["camera", "Mirrorless camera", "Canon", "R5", 1700],
      ["lens", "Cinema prime 35mm", "Sigma", "35mm T1.5", 1650],
      ["lens", "Zoom lens 24-70", "Sony", "GM II", 900],
      ["lens", "Telephoto 70-200", "Canon", "RF 70-200 f/2.8", 1050],
      ["laptop", "Editing laptop", "Apple", "MacBook Pro 16", 1250],
      ["laptop", "Office laptop", "Dell", "Latitude 7440", 520],
      ["laptop", "Editing laptop", "Apple", "MacBook Pro 14", 980],
      ["phone", "Company phone", "Apple", "iPhone 15", 340],
      ["phone", "Company phone", "Samsung", "Galaxy S24", 280],
      ["tablet", "Client presentation tablet", "Apple", "iPad Pro", 420],
      ["drone", "Aerial drone", "DJI", "Mavic 3 Pro", 1000],
      ["drone", "Aerial drone", "DJI", "Inspire 3", 4800],
      ["lighting", "LED light panel", "Aputure", "600d Pro", 750],
      ["lighting", "LED light panel", "Aputure", "300x", 450],
      ["lighting", "Softbox kit", "Godox", "SL-60W", 120],
      ["audio", "Wireless lavalier set", "Sennheiser", "EW-DP", 850],
      ["audio", "Shotgun microphone", "Rode", "NTG5", 480],
      ["audio", "Field recorder", "Zoom", "F6", 590],
      ["memory_card", "CFexpress card", "ProGrade", "Type B 512GB", 210],
      ["memory_card", "SD card V90", "Angelbird", "256GB", 120],
      ["vehicle", "Production van", "Toyota", "Hiace", 11500],
      ["other", "Tripod fluid head", "Sachtler", "Ace XL", 640],
      ["other", "Gimbal stabiliser", "DJI", "RS 3 Pro", 560],
      ["other", "Monitor 17 inch", "SmallHD", "Cine 17", 2400],
    ];
    // The state each asset ends in: mostly available, some issued by hand, a few in service, and damaged ones that stay available.
    const plan = [
      "available",
      "available",
      "assigned",
      "available",
      "available",
      "assigned",
      "available",
      "assigned",
      "available",
      "available",
      "maintenance",
      "available",
      "assigned",
      "available",
      "maintenance",
      "available",
      "lost",
      "available",
      "assigned",
      "available",
      "retired",
      "available",
      "available",
      "assigned",
      "available",
      "maintenance",
      "available",
    ];
    const holders = (
      await prisma.employee.findMany({
        where: { status: { not: "terminated" } },
        select: { id: true },
      })
    ).map((e) => e.id);
    for (const [index, [code, name, brand, model, cost]] of catalog.entries()) {
      const category = categoriesByCode[code];
      if (!category) continue;
      const specs: Record<string, string> = {};
      for (const f of (category.specFields as Array<{
        key: string;
        type: string;
      }>) ?? []) {
        specs[f.key] =
          f.type === "number"
            ? String(int(2, 64))
            : f.type === "date"
              ? iso(daysAgo(int(10, 900)))
              : f.type === "boolean"
                ? "yes"
                : `${brand.slice(0, 3).toUpperCase()}-${int(1000, 9999)}`;
      }
      const state = plan[index % plan.length];
      const damagedButUsable = state === "available" && chance(0.14);
      const base = {
        category_id: category.id,
        name,
        brand,
        model,
        serial_number: `${brand.slice(0, 2).toUpperCase()}${int(10000000, 99999999)}`,
        purchase_date: iso(daysAgo(int(60, 1100))),
        purchase_cost: cost,
        supplier: pick([
          "Gulf Pro Audio Visual",
          "Jarir Bahrain",
          "B&H Photo (import)",
          "Lulu Technology",
        ]),
        invoice_reference: `PUR-${int(1000, 9999)}`,
        warranty_until: iso(addDays(TODAY, int(-200, 700))),
        condition: damagedButUsable
          ? "damaged"
          : state === "maintenance"
            ? pick(["poor", "damaged"])
            : state === "lost" || state === "retired"
              ? "poor"
              : pick(["new", "excellent", "good", "good", "fair"]),
        location: pick([
          "Studio A cage",
          "Gear room",
          "Edit suite",
          "Reception",
          "Van",
        ]),
        specs,
        notes: damagedButUsable
          ? "Cosmetic damage after a shoot; still works and stays in the pool until someone decides it needs servicing."
          : undefined,
      };
      const created = await saveAsset(base, owner.id);
      bump("assets");
      if (state === "available") continue;
      await saveAsset(
        {
          ...base,
          status: state,
          ...(state === "assigned"
            ? { holder_employee_id: pick(holders) }
            : {}),
        },
        owner.id,
        created.id,
      );
      bump(`assets_${state}`);
    }
  }

  // ============================================================ 10b. salary documents (payslips and certificates)
  {
    const months = await prisma.payrollItem.findMany({
      where: { payrollRun: { status: { in: ["approved", "paid", "closed"] } } },
      select: {
        employeeId: true,
        payrollRun: { select: { year: true, month: true } },
      },
    });
    const monthsByEmployee = new Map<string, string[]>();
    for (const m of months) {
      const key = `${m.payrollRun.year}-${String(m.payrollRun.month).padStart(2, "0")}`;
      monthsByEmployee.set(m.employeeId, [
        ...(monthsByEmployee.get(m.employeeId) ?? []),
        key,
      ]);
    }
    for (const employee of shuffle(
      employees.filter((e) => e.userId && e.user?.role !== "super_admin"),
    ).slice(0, 22)) {
      const available = (monthsByEmployee.get(employee.id) ?? []).sort();
      const wantsPayslip = available.length > 0 && chance(0.6);
      const picked = wantsPayslip
        ? available.slice(-int(1, Math.min(3, available.length)))
        : [];
      const document = await prisma.salaryDocument.create({
        data: {
          employeeId: employee.id,
          kind: wantsPayslip ? "payslip" : "salary_certificate",
          months: picked,
          languages: pick([["ar"], ["en"], ["ar", "en"]]),
          requestedById: employee.userId!,
          status: "pending",
        },
      });
      const outcome = await submit(
        "salary_document",
        document.id,
        employee.userId!,
        { kind: document.kind, months: picked },
      );
      bump("salaryDocuments");
      if (outcome.status !== "pending" || chance(0.25)) continue; // some wait for HR
      await decideFully(
        outcome,
        chance(0.08) ? "rejected" : "approved",
        "Checked against payroll records.",
      );
    }
  }

  // ============================================================ 10c. website enquiries, complaints and suggestions
  {
    const voices: Array<
      [
        string,
        string,
        "inquiry" | "quote_request" | "complaint" | "suggestion",
        string,
      ]
    > = [
      [
        "Khalid Al-Mannai",
        "khalid@alsafwa-trading.example",
        "complaint",
        "The edited video was delivered two days after the date we agreed, and we missed our campaign launch.",
      ],
      [
        "Noora Al-Hilal",
        "noora.z@seafront-mall.example",
        "complaint",
        "Subtitles in the Arabic version have several spelling mistakes. Please correct and resend.",
      ],
      [
        "Hasan Jaffar",
        "hasan.jaffar@gulfbuild.example",
        "complaint",
        "The invoice shows a day rate we did not agree on in the quotation.",
      ],
      [
        "Maryam Al-Dosari",
        "maryam@dosari-events.example",
        "complaint",
        "The crew arrived 45 minutes late to our conference shoot.",
      ],
      [
        "Yusuf Rashed",
        "yusuf@rashed-motors.example",
        "suggestion",
        "Please add a client portal where we can review cuts and leave timecoded comments.",
      ],
      [
        "Fatima Bucheeri",
        "fatima@bucheeri-group.example",
        "suggestion",
        "A monthly content report with views per platform would help us plan the next campaign.",
      ],
      [
        "Ali Salman",
        "ali.salman@support-fund.example",
        "suggestion",
        "Offering vertical versions by default would save us a lot of back and forth.",
      ],
      [
        "Reem Al-Khalifa",
        "reem@khalifa-jewels.example",
        "quote_request",
        "We need a quote for a 60-second product film and 10 social cutdowns for our new collection.",
      ],
      [
        "Omar Fakhro",
        "omar@fakhro-holding.example",
        "quote_request",
        "Looking for pricing on a corporate documentary, around 12 minutes, shooting in March.",
      ],
      [
        "Layla Mattar",
        "layla@mattar-clinic.example",
        "quote_request",
        "Monthly social media content, two shoot days a month. Please quote.",
      ],
      [
        "Jassim Al-Aali",
        "jassim@aali-realestate.example",
        "inquiry",
        "Do you offer drone shoots with a licensed pilot for a property launch?",
      ],
      [
        "Sara Al-Hammadi",
        "sara@hammadi-cafe.example",
        "inquiry",
        "What is the lead time for a short brand video?",
      ],
      [
        "Tariq Al-Sayed",
        "tariq@alsayed-law.example",
        "inquiry",
        "Can the studio be hired for a two-hour interview recording?",
      ],
      [
        "Dana Al-Ansari",
        "dana@ansari-fashion.example",
        "complaint",
        "The colours in the final lookbook video do not match the brand guide we supplied.",
      ],
    ];
    for (const [name, email, intent, message] of voices) {
      await resolveIncomingLead({
        name,
        email,
        intent,
        message,
        locale: chance(0.5) ? "en" : "ar",
        source: pick(["website", "website", "email", "whatsapp"] as const),
      });
      bump(`web_${intent}`);
    }
  }

  console.log(
    `✅ Volume data (${Math.round((Date.now() - started) / 1000)}s): ${Object.entries(
      counts,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(", ")}`,
  );
}

/** The approvers the engine assigned to a pending request (Super Admin may step in otherwise). */
async function approverIdsFor(
  prisma: PrismaClient,
  approvalRequestId: string,
): Promise<string[]> {
  const request = await prisma.approvalRequest.findUniqueOrThrow({
    where: { id: approvalRequestId },
  });
  if (request.status !== "pending") return [];
  if (request.approverIds.length) return request.approverIds;
  const owner = await prisma.user.findFirstOrThrow({
    where: {
      role: "super_admin",
      isActive: true,
      id: { not: request.requestedById },
    },
    select: { id: true },
  });
  return [owner.id];
}

/**
 * Brings every record (core fixtures included) to the state the app's own rules imply:
 * requests awaiting approval get their approval, deals catch up with their documents, past-due
 * invoices become overdue, and every reference sequence is ahead of the numbers already used.
 */
export async function reconcileSeed(prisma: PrismaClient) {
  seedPrisma = prisma;
  // Requests marked "pending approval" by fixtures without an approval record.
  const orphanRequests = await prisma.inquiry.findMany({
    where: { workflowStatus: "pending_approval" },
    select: {
      id: true,
      reference: true,
      requestType: true,
      assignedToId: true,
    },
  });
  for (const r of orphanRequests) {
    if (
      await prisma.approvalRequest.findFirst({
        where: { targetId: r.id, status: "pending" },
      })
    )
      continue;
    const requester =
      r.assignedToId ??
      (
        await prisma.user.findFirstOrThrow({
          where: { role: "operations_manager" },
        })
      ).id;
    await submit("service_request", r.id, requester, {
      reference: r.reference,
      requestType: r.requestType,
    });
  }
  // Hand-written fixtures are credited like migrated data: to their issuer, invoices to their quotation's owner.
  const fallbackOwner = (
    await prisma.user.findFirstOrThrow({
      where: { role: "sales", isActive: true },
      select: { id: true },
    })
  ).id;
  await prisma.$executeRaw`UPDATE "Quotation" SET "salesOwnerId" = COALESCE("createdById", ${fallbackOwner}) WHERE "salesOwnerId" IS NULL`;
  await prisma.$executeRaw`UPDATE "Invoice" i SET "salesOwnerId" = q."salesOwnerId" FROM "Quotation" q WHERE q."invoiceId" = i.id AND i."salesOwnerId" IS NULL`;
  await prisma.$executeRaw`UPDATE "Invoice" i SET "salesOwnerId" = d."assignedTo" FROM "CrmDeal" d WHERE d.id = i."dealId" AND i."salesOwnerId" IS NULL AND d."assignedTo" IS NOT NULL`;
  await prisma.$executeRaw`UPDATE "Invoice" SET "salesOwnerId" = ${fallbackOwner} WHERE "salesOwnerId" IS NULL`;
  // Fixture documents already with clients were signed by their issuer (as the migration does for real data).
  await prisma.$executeRaw`UPDATE "Quotation" q SET "signedById" = q."createdById", "signedAt" = q."updatedAt", "signerSignatureUrl" = u."signatureUrl" FROM "User" u WHERE u.id = q."createdById" AND q."signedAt" IS NULL AND q.status IN ('issued', 'accepted', 'rejected', 'expired', 'converted')`;
  await prisma.$executeRaw`UPDATE "Invoice" i SET "signedById" = i."createdById", "signedAt" = i."updatedAt", "signerSignatureUrl" = u."signatureUrl", "approvalStatus" = 'approved' FROM "User" u WHERE u.id = i."createdById" AND i."signedAt" IS NULL AND i.status <> 'draft'`;
  // Deals follow their quotations and invoices (forward only, never reopening closed deals).
  const quotations = await prisma.quotation.findMany({
    where: {
      dealId: { not: null },
      status: { in: ["issued", "accepted", "converted"] },
    },
    select: { dealId: true, status: true },
  });
  for (const q of quotations)
    await advanceDealForEvent(
      prisma,
      q.dealId,
      q.status === "issued" ? "quotation_issued" : "quotation_accepted",
    );
  const invoices = await prisma.invoice.findMany({
    where: {
      dealId: { not: null },
      status: { in: ["sent", "partially_paid", "overdue", "paid"] },
    },
    select: { dealId: true, status: true },
  });
  for (const i of invoices)
    await advanceDealForEvent(
      prisma,
      i.dealId,
      i.status === "paid" ? "invoice_paid" : "invoice_issued",
    );
  await markOverdueInvoices(new Date());
  // Every sequence-numbered prefix is ahead of the highest number in use.
  const used = await prisma.$queryRaw<
    Array<{ id: string; prefix: string; yr: number; max: number }>
  >`
    SELECT prefix || '_' || yr AS id, prefix, yr, MAX(n)::int AS max FROM (
      SELECT split_part("quotationNumber", '-', 1) AS prefix, split_part("quotationNumber", '-', 2)::int AS yr, split_part("quotationNumber", '-', 3)::int AS n FROM "Quotation"
      UNION ALL SELECT split_part(reference, '-', 1), split_part(reference, '-', 2)::int, split_part(reference, '-', 3)::int FROM "Inquiry" WHERE reference ~ '^(SR|CR|INQ|RFQ|CMP|SUG)-[0-9]{4}-[0-9]+$'
      UNION ALL SELECT split_part("employeeNumber", '-', 1), split_part("employeeNumber", '-', 2)::int, split_part("employeeNumber", '-', 3)::int FROM "Employee" WHERE "employeeNumber" ~ '^EMP-[0-9]{4}-[0-9]+$'
    ) x GROUP BY prefix, yr`;
  for (const s of used) {
    const current = await prisma.referenceSequence.findUnique({
      where: { id: s.id },
    });
    if (current && current.lastNumber >= s.max) continue; // never move a counter backwards
    await prisma.referenceSequence.upsert({
      where: { id: s.id },
      update: { lastNumber: s.max },
      create: { id: s.id, prefix: s.prefix, year: s.yr, lastNumber: s.max },
    });
  }
  console.log(
    "✅ Reconciled fixtures with the app's rules (approvals, deal stages, overdue invoices, sequences)",
  );
}
