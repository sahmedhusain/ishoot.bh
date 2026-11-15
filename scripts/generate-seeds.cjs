const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require(path.resolve(__dirname, "../apps/admin/node_modules/sharp"));
const { COMPANIES } = require("./seed-companies.cjs");
const { buildRichModuleSql } = require("./seed-rich-modules.cjs");
const { EXTRA_STAFF, EXTRA_CUSTOMERS, buildExtraModuleSql } = require("./seed-extra-modules.cjs");
const {
  schemaMeta,
  uuidOf,
  sqlRaw,
  ins,
  splitPhone,
  staffEmail,
  loadDotEnv,
} = require("./lib/seed-sql.cjs");
const { getActivityCatalog } = require("./lib/activity-catalogs.cjs");

const root = path.resolve(__dirname, "..");
const envVars = loadDotEnv(path.join(root, ".env"));

const SUPER_ADMIN_USERNAME = envVars.SUPER_ADMIN_USERNAME || "BA0001";
const SUPER_ADMIN_EMAIL = envVars.SUPER_ADMIN_EMAIL || "admin@example.com";
const SUPER_ADMIN_NAME = envVars.SUPER_ADMIN_NAME || "Super Admin";
const SUPER_ADMIN_PASSWORD_HASH =
  envVars.SUPER_ADMIN_PASSWORD_HASH ||
  "$argon2id$v=19$m=19456,t=2,p=1$pY9XsX6uhwv8DfyY+1St1w$+gLc4Swb4+gFXMhwXuQYoMx/NxPL4Qbg1gCEk4w1ODA";
const IT_ADMIN_USERNAME = envVars.IT_ADMIN_USERNAME || "BA0001";
const IT_ADMIN_EMAIL = envVars.IT_ADMIN_EMAIL || "admin@example.com";
const IT_ADMIN_PASSWORD_HASH =
  envVars.IT_ADMIN_PASSWORD_HASH ||
  "$argon2id$v=19$m=19456,t=2,p=1$f6QjVQlUTFDJVEOR+5VS7w$re5Ds6ToUPvX8R5nHc4qg6UkyVdxWyZapa6/WErJd44";

// Extract static RBAC roles/permissions cleanly from canonical bootstrap SQL (never from generated seeds)
const bootstrapSqlPath = path.join(root, "seeds/bootstrap/seed_bootstrap.sql");
const bootstrapSql = fs.readFileSync(bootstrapSqlPath, "utf8");
const identityMatch = bootstrapSql.match(
  /-- Staff roles with hierarchy[\s\S]*?(?=\n-- Bootstrap Accounts)/,
);
if (!identityMatch) {
  throw new Error("Could not extract static RBAC roles/permissions block from seeds/bootstrap/seed_bootstrap.sql.");
}
const identityRolesBlock = identityMatch[0].trimEnd();

// Complete list of company-scoped operational, transactional, and projection tables to TRUNCATE cleanly
// before loading any standalone company seed (filtered dynamically against schema-meta.json).
const TRUNCATE_TABLES = [
  "realtime.status_window", "realtime.status",
  "files.entity_attachment", "files.upload_object",
  "workflow.signature_request", "workflow.calendar_event", "workflow.mom_action_item", "workflow.mom_attendee",
  "workflow.task", "workflow.approval_decision", "workflow.approval_request", "workflow.minute_of_meeting",
  "workflow.official_letter", "workflow.letter_template", "workflow.contract", "workflow.directory_ref",
  "delivery.cod_settlement", "delivery.shipment_event", "delivery.shipment", "delivery.route_sheet",
  "delivery.courier_agency", "delivery.vehicle", "delivery.delivery_slot", "delivery.delivery_zone",
  "delivery.delivery_settings", "delivery.order_ref", "delivery.driver_ref",
  "commerce.retail_closing", "commerce.retail_shift", "commerce.retail_register",
  "commerce.sales_order_event", "commerce.sales_order_line", "commerce.sales_order",
  "commerce.delivery_slot", "commerce.delivery_zone", "commerce.delivery_settings",
  "commerce.store_region", "commerce.customer_segment", "commerce.store_settings",
  "commerce.coupon", "commerce.customer_address", "commerce.customer", "commerce.warehouse_ref",
  "inventory.stock_allocation_line", "inventory.stock_allocation",
  "inventory.stock_count_line", "inventory.stock_count", "inventory.stock_serial", "inventory.stock_batch",
  "inventory.goods_receipt_line", "inventory.goods_receipt",
  "inventory.rfq_quote", "inventory.rfq_line", "inventory.rfq",
  "inventory.purchase_requisition_line", "inventory.purchase_requisition",
  "inventory.purchase_order_line", "inventory.purchase_order",
  "inventory.product_packaging_unit", "inventory.product_variant", "inventory.stock_movement",
  "inventory.stock_level", "inventory.stock_item", "inventory.product", "inventory.stock_location",
  "inventory.warehouse", "inventory.product_category",
  "finance.commission_payout", "finance.commission_rule",
  "finance.supplier_payment", "finance.supplier_bill_line", "finance.supplier_bill",
  "finance.journal_line", "finance.journal_entry", "finance.recurring_expense", "finance.bank_settlement",
  "finance.payment_method_config", "finance.tax_rate", "finance.payment_allocation", "finance.payment",
  "finance.invoice_line_item", "finance.invoice_item", "finance.invoice",
  "finance.expense_claim", "finance.expense", "finance.expense_category",
  "finance.quotation_ref", "finance.contact_ref", "finance.catalog_item_ref",
  "sales.campaign", "sales.deal_pipeline_stage", "sales.inquiry",
  "sales.quotation_line_item", "sales.quotation_item", "sales.quotation",
  "sales.crm_deal", "sales.deal", "sales.crm_contact", "sales.contact", "sales.catalog_item_ref",
  "hr.employee_handover_case", "hr.employee_handover", "hr.employee_recurring_pay",
  "hr.employee_gosi_record", "hr.employee_credential", "hr.salary_document", "hr.shift_type",
  "hr.benefit_plan", "hr.leave_balance", "hr.leave_request", "hr.leave_type",
  "hr.payroll_item", "hr.payroll_run", "hr.attendance_entry", "hr.employee", "hr.department", "hr.identity_user_ref",
  "cms.social_content_plan", "cms.social_metric", "cms.social_post", "cms.social_link",
  "cms.portfolio_item", "cms.portfolio_category", "cms.content_snapshot", "cms.statistic",
  "cms.review", "cms.faq", "cms.article", "cms.page",
  "itsm.support_program_rule", "itsm.support_program", "itsm.asset_handover", "itsm.asset", "itsm.asset_category",
  "itsm.task_comment", "itsm.task",
  "itsm.ticket_attachment", "itsm.ticket_comment", "itsm.ticket_event", "itsm.ticket",
  "itsm.sla_policy", "itsm.staff_ref",
  "notify.attachment", "notify.message", "notify.category_setting", "notify.preference", "notify.notification",
  "identity.branch_grant", "identity.user", "identity.branch",
  "system.announcement_receipt", "system.announcement", "system.hr_policy",
  "system.legal_matter_event", "system.legal_matter", "system.media_coverage", "system.media_contact",
  "system.canned_reply", "system.client_logo", "system.contract", "system.project",
  "system.studio_equipment", "system.exchange_rate_snapshot", "system.accounting_period",
  "system.accounting_account", "system.communication_settings", "system.service_settings", "system.company_setting",
  "system.service", "system.public_holiday", "system.backup_record", "system.site_setting",
  "system.company_asset", "system.company",
].filter((t) => Boolean(schemaMeta[t]));

// Also include all remaining schemaMeta tables (except static RBAC tables and append-only audit.event) and event mesh inbox/outbox tables
const STATIC_RBAC_TABLES = new Set([
  "audit.event",
  "identity.it_role",
  "identity.it_permission",
  "identity.staff_role",
  "identity.staff_permission",
]);
for (const tbl of Object.keys(schemaMeta)) {
  if (!STATIC_RBAC_TABLES.has(tbl) && !TRUNCATE_TABLES.includes(tbl)) {
    TRUNCATE_TABLES.unshift(tbl);
  }
}
for (const svc of ["cms", "commerce", "delivery", "finance", "hr", "identity", "inventory", "itsm", "notify", "sales", "system", "workflow"]) {
  TRUNCATE_TABLES.unshift(`${svc}.inbox`, `${svc}.outbox`);
}

const truncateBlock = `TRUNCATE TABLE\n    ${TRUNCATE_TABLES.join(",\n    ")}\nCASCADE;`;

const DEFAULT_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU";

const STAFF_ROSTER = [
  { id: "super-admin", nameEn: "Bader Ali", nameAr: "بدر علي", displayName: SUPER_ADMIN_NAME, username: SUPER_ADMIN_USERNAME, email: SUPER_ADMIN_EMAIL, passwordHash: SUPER_ADMIN_PASSWORD_HASH, role: "super_admin", dept: "d-exec", titleEn: "Group Chief Executive", titleAr: "الرئيس التنفيذي للمجموعة", salary: 3200, reportTo: null, hireDate: "2020-01-01", gender: "male", nationality: "BH" },
  { id: "omar-haddad", nameEn: "Omar Haddad", nameAr: "عمر حداد", username: "OH0002", role: "super_admin", dept: "d-exec", titleEn: "Managing Partner", titleAr: "الشريك الإداري", salary: 2400, reportTo: "super-admin", hireDate: "2021-02-01", gender: "male", nationality: "BH" },
  { id: "yusuf-rahman", nameEn: "Yusuf Al-Rahman", nameAr: "يوسف الرحمن", username: "YR0003", role: "admin", dept: "d-exec", titleEn: "General Director", titleAr: "المدير العام", salary: 2100, reportTo: "omar-haddad", hireDate: "2021-06-15", gender: "male", nationality: "BH" },
  { id: "layla-nasser", nameEn: "Layla Al-Nasser", nameAr: "ليلى الناصر", username: "LN0004", role: "finance_manager", dept: "d-fin", titleEn: "Finance Manager", titleAr: "المدير المالي", salary: 1650, reportTo: "yusuf-rahman", hireDate: "2022-01-10", gender: "female", nationality: "BH" },
  { id: "karim-fawzi", nameEn: "Karim Fawzi", nameAr: "كريم فوزي", username: "KF0005", role: "operations_manager", dept: "d-ops", titleEn: "Operations Manager", titleAr: "مدير العمليات", salary: 1600, reportTo: "yusuf-rahman", hireDate: "2022-03-01", gender: "male", nationality: "BH" },
  { id: "tariq-saleh", nameEn: "Tariq Al-Saleh", nameAr: "طارق الصالح", username: "TS0006", role: "project_lead", dept: "d-ops", titleEn: "Operations Lead", titleAr: "قائد المشاريع", salary: 1250, reportTo: "karim-fawzi", hireDate: "2022-07-01", gender: "male", nationality: "BH" },
  { id: "noor-hamdan", nameEn: "Noor Al-Hamdan", nameAr: "نور الحمدان", username: "NH0007", role: "editor", dept: "d-ops", titleEn: "Senior Coordinator", titleAr: "منسق أول", salary: 950, reportTo: "tariq-saleh", hireDate: "2023-01-15", gender: "female", nationality: "BH" },
  { id: "faisal-mansour", nameEn: "Faisal Al-Mansour", nameAr: "فيصل المنصور", username: "FM0008", role: "accountant", dept: "d-fin", titleEn: "Senior Accountant", titleAr: "محاسب أول", salary: 980, reportTo: "layla-nasser", hireDate: "2023-02-01", gender: "male", nationality: "SA" },
  { id: "sami-khoury", nameEn: "Sami Khoury", nameAr: "سامي خوري", username: "SK0009", role: "sales", dept: "d-sales", titleEn: "Account Executive", titleAr: "تنفيذي مبيعات", salary: 1100, reportTo: "karim-fawzi", hireDate: "2023-04-01", gender: "male", nationality: "JO" },
  { id: "hana-yousef", nameEn: "Hana Yousef", nameAr: "هناء يوسف", username: "HY0010", role: "marketing", dept: "d-mkt", titleEn: "Growth Specialist", titleAr: "أخصائية نمو وتسويق", salary: 920, reportTo: "karim-fawzi", hireDate: "2023-05-15", gender: "female", nationality: "BH" },
  ...EXTRA_STAFF,
];

const FEMALE_STAFF_IDS = new Set([
  "layla-nasser", "noor-hamdan", "hana-yousef", "maryam-bucheeri", "fatima-khalifa",
  "zahra-jaffar", "reem-ansari", "latifa-shaker", "amal-sultan", "dina-mansoor",
  "sara-kanoo", "mona-essa", "nadia-fakhro",
]);
const NATIONALITY_CYCLE = ["BH", "BH", "BH", "BH", "SA", "EG", "JO", "AE", "IN", "BH", "BH", "GB"];

const IT_ROSTER = [
  { id: "430c4105-6360-4415-bf1b-087d582c7fc6", username: IT_ADMIN_USERNAME, email: IT_ADMIN_EMAIL, displayName: `${SUPER_ADMIN_NAME} (IT)`, passwordHash: IT_ADMIN_PASSWORD_HASH, role: "it_admin", reportTo: null },
  { id: "it-manager-001", username: "IT0002", email: "it-manager@example.com", displayName: "IT Operations Manager", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_manager", reportTo: "430c4105-6360-4415-bf1b-087d582c7fc6" },
  { id: "it-lead-001", username: "IT0003", email: "it-lead@example.com", displayName: "IT Team Lead", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_lead", reportTo: "it-manager-001" },
  { id: "it-eng-001", username: "IT0004", email: "it-engineer@example.com", displayName: "IT Systems Engineer", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_engineer", reportTo: "it-lead-001" },
  { id: "it-work-001", username: "IT0005", email: "it-worker@example.com", displayName: "IT Operations Worker", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_worker", reportTo: "it-lead-001" },
  { id: "it-supp-001", username: "IT0006", email: "it-support@example.com", displayName: "IT Support Specialist", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_support", reportTo: "it-lead-001" },
  { id: "it-audit-001", username: "IT0007", email: "it-auditor@example.com", displayName: "IT Compliance Auditor", passwordHash: DEFAULT_PASSWORD_HASH, role: "it_auditor", reportTo: "it-manager-001" },
];

const CUSTOMERS = [
  { id: "cust-001", nameEn: "Al-Jazeera Gulf Holdings W.L.L.", nameAr: "مجموعة الجزيرة الخليجية القابضة", email: "procurement@aljazeeragulf.bh", phone: "+97317223344", city: "Manama" },
  { id: "cust-002", nameEn: "Bahrain Bay Hospitality Group", nameAr: "مجموعة خليج البحرين للضيافة", email: "finance@bahrainbayhosp.bh", phone: "+97317334455", city: "Seef District" },
  { id: "cust-003", nameEn: "Dilmun Energy Partners", nameAr: "شركاء دلمون للطاقة", email: "ap@dilmunenergy.bh", phone: "+97317445566", city: "Diplomatic Area" },
  { id: "cust-004", nameEn: "Pearl Coast Real Estate", nameAr: "ساحل اللؤلؤة العقارية", email: "accounts@pearlcoast.bh", phone: "+97317556677", city: "Amwaj Islands" },
  { id: "cust-005", nameEn: "Muharraq Heritage Artisans", nameAr: "حرفيو تراث المحرق", email: "orders@muharraqartisans.bh", phone: "+97317667788", city: "Muharraq" },
  { id: "cust-006", nameEn: "Al-Waha Medical Supplies", nameAr: "الواحة للمستلزمات الطبية", email: "buying@alwahamed.bh", phone: "+97317778899", city: "Zinj" },
  { id: "cust-007", nameEn: "Riffa Athletic Foundation", nameAr: "مؤسسة الرفاع الرياضية", email: "admin@riffaathletic.bh", phone: "+97317889900", city: "Riffa" },
  { id: "cust-008", nameEn: "Sitra Maritime Services", nameAr: "سترة للخدمات البحرية", email: "ops@sitramaritime.bh", phone: "+97317990011", city: "Sitra" },
  ...EXTRA_CUSTOMERS,
];

function sqlQ(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === "object") {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    }
    return `'{${val.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",")}}'`;
  }
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mimeFor(filePath) {
  const low = filePath.toLowerCase();
  if (low.endsWith(".png")) return "image/png";
  if (low.endsWith(".jpg") || low.endsWith(".jpeg")) return "image/jpeg";
  if (low.endsWith(".webp")) return "image/webp";
  if (low.endsWith(".woff2")) return "font/woff2";
  if (low.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function initialsOf(name) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "CO";
}

async function generateCompanyAssets(company, assetsDir) {
  const brandDir = path.join(assetsDir, "brand");
  const bannerDir = path.join(assetsDir, "media/banners");
  fs.mkdirSync(brandDir, { recursive: true });
  fs.mkdirSync(bannerDir, { recursive: true });

  if (company.isIshoot) {
    if (fs.existsSync(path.join(assetsDir, "brand/logo-light.png"))) {
      return;
    }
    const srcRoot = path.join(root, "seeds/assets/ishoot/assets");
    const copyIfExists = (relSrc, relDst) => {
      const s = path.join(srcRoot, relSrc);
      const d = path.join(assetsDir, relDst);
      if (fs.existsSync(s)) {
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(s, d);
      }
    };
    copyIfExists("brand/logo-text-light.png", "brand/logo-light.png");
    copyIfExists("brand/logo-text-dark.png", "brand/logo-dark.png");
    copyIfExists("brand/icon-light.png", "brand/icon-light.png");
    copyIfExists("brand/icon-dark.png", "brand/icon-dark.png");
    copyIfExists("brand/stamp.png", "brand/stamp.png");
    copyIfExists("brand/signature.png", "brand/signature.png");

    const fontsSrc = path.join(srcRoot, "fonts");
    if (fs.existsSync(fontsSrc)) {
      for (const f of fs.readdirSync(fontsSrc)) {
        if (f.endsWith(".woff2")) {
          copyIfExists(`fonts/${f}`, `brand/${f}`);
        }
      }
    }
    const bannersSrc = path.join(srcRoot, "media/banners");
    if (fs.existsSync(bannersSrc)) {
      let idx = 1;
      for (const f of fs.readdirSync(bannersSrc).sort()) {
        if (/\.(png|jpg|jpeg|webp)$/i.test(f)) {
          const ext = path.extname(f).toLowerCase();
          copyIfExists(`media/banners/${f}`, `media/banners/banner-0${idx}${ext}`);
          idx++;
        }
      }
    }
    return;
  }

  const { primary, accent } = company.theme;
  const initials = initialsOf(company.shortEn);
  const label = escapeXml(company.shortEn);

  const writePng = async (svgStr, relPath) => {
    const out = path.join(assetsDir, relPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(Buffer.from(svgStr)).png({ compressionLevel: 9 }).toFile(out);
  };

  // Wordmarks (light text for dark bg, dark text for light bg)
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72"><text x="16" y="46" fill="#F8FAFC" font-family="sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">${label}</text><rect x="16" y="56" width="44" height="4" rx="2" fill="${accent}"/></svg>`,
    "brand/logo-light.png",
  );
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72"><text x="16" y="46" fill="${primary}" font-family="sans-serif" font-size="30" font-weight="800" letter-spacing="-0.5">${label}</text><rect x="16" y="56" width="44" height="4" rx="2" fill="${accent}"/></svg>`,
    "brand/logo-dark.png",
  );

  // Square Icons
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${primary}"/><rect x="14" y="14" width="100" height="100" rx="20" fill="none" stroke="${accent}" stroke-width="4"/><text x="64" y="76" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="44" font-weight="800">${escapeXml(initials)}</text></svg>`,
    "brand/icon-light.png",
  );
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0F172A"/><rect x="14" y="14" width="100" height="100" rx="20" fill="none" stroke="${accent}" stroke-width="4"/><text x="64" y="76" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="44" font-weight="800">${escapeXml(initials)}</text></svg>`,
    "brand/icon-dark.png",
  );

  // Official Stamp
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><circle cx="120" cy="120" r="106" fill="none" stroke="${primary}" stroke-width="6"/><circle cx="120" cy="120" r="94" fill="none" stroke="${primary}" stroke-width="2" stroke-dasharray="6 4"/><text x="120" y="108" text-anchor="middle" fill="${primary}" font-family="sans-serif" font-size="22" font-weight="800">${escapeXml(initials)}</text><text x="120" y="136" text-anchor="middle" fill="${primary}" font-family="sans-serif" font-size="13" font-weight="700">${escapeXml(company.crNumber)}</text><text x="120" y="158" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="11" font-weight="700">KINGDOM OF BAHRAIN</text></svg>`,
    "brand/stamp.png",
  );

  // Executive Signature
  await writePng(
    `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="90" viewBox="0 0 280 90"><path d="M24 62 C48 22, 68 72, 96 36 C118 12, 134 66, 164 42 C188 22, 212 58, 252 34" fill="none" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round"/><path d="M40 72 L236 68" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6"/></svg>`,
    "brand/signature.png",
  );

  // 3 Editorial Banners
  for (let i = 1; i <= 3; i++) {
    await writePng(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${primary}"/><stop offset="100%" stop-color="#090D16"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g${i})"/><circle cx="${950 - i * 120}" cy="${180 + i * 60}" r="220" fill="${accent}" opacity="0.16"/><text x="80" y="320" fill="#FFFFFF" font-family="sans-serif" font-size="54" font-weight="800">${label}</text><text x="80" y="380" fill="${accent}" font-family="sans-serif" font-size="26" font-weight="600">${escapeXml(company.taglineEn)}</text></svg>`,
      `media/banners/banner-0${i}.png`,
    );
  }
}

function buildFilesList(assetsDir) {
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const rel = path.relative(assetsDir, full).replace(/\\/g, "/");
        const stat = fs.statSync(full);
        results.push({
          rel,
          fileUrl: `/api/files/${rel}`,
          fileName: path.basename(full),
          size: stat.size,
          mime: mimeFor(full),
        });
      }
    }
  };
  walk(assetsDir);
  return results.sort((a, b) => a.rel.localeCompare(b.rel));
}

function buildThemeJson(company) {
  if (company.isIshoot) {
    return JSON.parse(fs.readFileSync(path.join(root, "seeds/ishoot/theme.json"), "utf8"));
  }
  return {
    primary: company.theme.primary,
    accent: company.theme.accent,
    radius: company.theme.radius,
    defaultMode: company.theme.defaultMode,
    fonts: {
      body: { kind: "google", family: company.theme.fontBody },
      heading: { kind: "google", family: company.theme.fontHeading },
    },
  };
}

function buildCompanyJson(company) {
  return {
    display: { nameEn: company.shortEn, nameAr: company.shortAr },
    company: {
      companyNameEn: company.nameEn,
      companyNameAr: company.nameAr,
      businessActivity: company.activity,
      country: "BH",
      city: company.city,
      contentLanguages: ["ar", "en"],
      primaryLanguage: "ar",
      crNumber: company.crNumber,
      vatId: company.vatId,
      vatEnabled: true,
      vatPercentage: 10.0,
      defaultCurrency: company.currency,
      currencyDecimals: company.decimals,
      addressEn: company.addressEn,
      addressAr: company.addressAr,
      phone: company.phone,
      whatsappPhone: company.whatsapp,
      email: company.email,
      website: company.website,
      bankName: company.bankName,
      bankIban: company.iban,
      bankAccountNumber: company.accountNo,
      bankSwift: company.swift,
      paymentTermsDays: 30,
      invoicePrefix: company.prefix,
      invoiceNextNumber: 120,
      receiptPrefix: "RCT",
      receiptNextNumber: 120,
      taglineEn: company.taglineEn,
      taglineAr: company.taglineAr,
      aboutTextEn: company.aboutEn,
      aboutTextAr: company.aboutAr,
      ceoNameEn: company.ceoEn,
      ceoNameAr: company.ceoAr,
      ceoTitleEn: company.ceoTitleEn,
      ceoTitleAr: company.ceoTitleAr,
      foundedYear: company.foundedYear,
      defaultDiscountLimitPercent: 15.0,
      quotationsAlwaysNeedApproval: false,
    },
    assets: {
      logo: "brand/logo-dark.png",
      darkLogo: "brand/logo-light.png",
      icon: "brand/icon-light.png",
      darkIcon: "brand/icon-dark.png",
      stamp: "brand/stamp.png",
      signature: "brand/signature.png",
    },
  };
}

function buildSeedSql(company, companyJson, themeJson, filesList) {
  const domainHost = company.website.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const isAll = company.activity === "all";

  const themeForDb = JSON.parse(JSON.stringify(themeJson));
  if (company.isIshoot) {
    // Point uploaded font URLs directly to /api/files/brand/<font>
    for (const slot of ["body", "heading"]) {
      if (themeForDb.fonts?.[slot]?.files) {
        themeForDb.fonts[slot].files = themeForDb.fonts[slot].files.map((f) => ({
          weight: f.weight,
          url: `/api/files/brand/${path.basename(f.file || f.url)}`,
        }));
      }
    }
  }

  const companyData = {
    ...companyJson.company,
    logoUrl: "/api/files/brand/logo-dark.png",
    darkLogoUrl: "/api/files/brand/logo-light.png",
    iconUrl: "/api/files/brand/icon-light.png",
    darkIconUrl: "/api/files/brand/icon-dark.png",
    stampUrl: "/api/files/brand/stamp.png",
    signatureUrl: "/api/files/brand/signature.png",
    theme: themeForDb,
    websitePublished: company.hasWeb,
    setupCompletedAt: "2026-01-01T00:00:00Z",
  };

  const modules = {
    crm_deals: true,
    invoicing: true,
    calendar: true,
    equipment: isAll || ["media", "events", "construction", "manufacturing"].includes(company.activity),
    cms: company.hasWeb,
    reviews: company.hasWeb,
    products: isAll || company.products.length > 0,
    procurement: isAll || company.products.length > 0 || ["construction", "manufacturing", "logistics"].includes(company.activity),
    store: company.hasStore,
    delivery: company.hasStore || company.activity === "logistics",
    hr_payroll: true,
    itsm: true,
    audit_trail: true,
    notifications: true,
    tasks: true,
    marketing: company.hasWeb || isAll,
    pr: company.hasWeb || isAll,
    legal: true,
  };

  const catalog = getActivityCatalog(company);
  const nowSql = sqlRaw("now()");
  const agoSql = (hours) => sqlRaw(`now() - interval '${hours} hours'`);

  const lines = [];
  lines.push(`-- ============================================================================`);
  lines.push(`-- STANDALONE COMPANY SEED: ${company.nameEn} (${company.slug})`);
  lines.push(`-- Activity: ${company.activity} | Web: ${company.hasWeb} | Store: ${company.hasStore}`);
  lines.push(`-- ============================================================================`);
  lines.push(`BEGIN;`);
  lines.push(``);
  lines.push(truncateBlock);
  lines.push(``);
  lines.push(`-- SYSTEM`);
  lines.push(
    ins(
      "system.company",
      {
        id: "c0000000-0000-0000-0000-000000000001",
        singleton: true,
        data: companyData,
        currency_locked: false,
        revision: 1,
        updated_by: "seed:sql",
        updated_at: nowSql,
      },
      "ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
    ),
  );

  for (const [key, enabled] of Object.entries(modules)) {
    lines.push(
      ins(
        "system.module_setting",
        { module_key: key, enabled, updated_by: "seed:sql", updated_at: nowSql },
        "ON CONFLICT (module_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()",
      ),
    );
  }

  const sequences = [
    ["invoice", company.prefix, 150],
    ["receipt", "RCT", 150],
  ];
  for (const [kind, prefix, nextNum] of sequences) {
    lines.push(
      ins(
        "system.document_sequence",
        { kind, prefix, next_number: nextNum },
        "ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number",
      ),
    );
  }

  lines.push(
    ins(
      "system.site_setting",
      {
        id: true,
        website_domain: domainHost,
        admin_domain: `admin.${domainHost}`,
        code: {
          headHtml: `<!-- ${company.shortEn} Production Telemetry -->`,
          bodyHtml: "",
          customCss: `:root { --brand-primary: ${company.theme.primary}; --brand-accent: ${company.theme.accent}; }`,
        },
        updated_at: nowSql,
        updated_by: "seed:sql",
      },
      "ON CONFLICT (id) DO UPDATE SET website_domain = EXCLUDED.website_domain, admin_domain = EXCLUDED.admin_domain, updated_at = now()",
    ),
  );

  const publicHolidays = [
    ["hol-01", "2026-01-01", "New Year's Day", "رأس السنة الميلادية"],
    ["hol-02", "2026-03-20", "Eid Al-Fitr (Day 1)", "عيد الفطر المبارك - اليوم الأول"],
    ["hol-03", "2026-03-21", "Eid Al-Fitr (Day 2)", "عيد الفطر المبارك - اليوم الثاني"],
    ["hol-04", "2026-05-01", "Labour Day", "عيد العمال العالمي"],
    ["hol-05", "2026-05-27", "Eid Al-Adha (Day 1)", "عيد الأضحى المبارك - اليوم الأول"],
    ["hol-06", "2026-06-16", "Islamic New Year 1448H", "رأس السنة الهجرية 1448"],
    ["hol-07", "2026-12-16", "Bahrain National Day", "العيد الوطني لمملكة البحرين"],
    ["hol-08", "2026-12-17", "Accession Day", "عيد جلوس جلالة الملك"],
  ];
  for (const [id, date, en, ar] of publicHolidays) {
    lines.push(ins("system.public_holiday", { id, date, name_en: en, name_ar: ar }, "ON CONFLICT (id) DO NOTHING"));
  }

  catalog.services.forEach((s, i) => {
    lines.push(
      ins(
        "system.service",
        {
          id: `svc-${i + 1}`,
          code: s.code,
          name_en: s.en,
          name_ar: s.ar,
          category: s.cat,
          description_en: `${s.en} delivered in ${company.city} under ${company.shortEn} SLA standards.`,
          description_ar: `تقديم خدمة ${s.ar} في ${company.city} وفق معايير الجودة لدى ${company.shortAr}.`,
          unit: s.unit,
          default_rate: Number(s.rate.toFixed(3)),
          is_active: true,
          display_order: i + 1,
          is_public: company.hasWeb,
          image_url: `/api/files/media/banners/banner-0${(i % 3) + 1}.png`,
          created_at: nowSql,
          updated_at: nowSql,
          is_sample: false,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  lines.push(``);
  lines.push(`-- FILES`);
  filesList.forEach((f, i) => {
    const id = crypto.createHash("md5").update(`${company.slug}:${f.fileUrl}`).digest("hex");
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-4${id.slice(13, 16)}-8${id.slice(17, 20)}-${id.slice(20, 32)}`;
    lines.push(
      ins(
        "files.upload_object",
        {
          id: uuid,
          file_url: f.fileUrl,
          owner_id: "super-admin",
          file_name: f.fileName,
          file_size: f.size,
          mime_type: f.mime,
          is_public: true,
          claimed_at: nowSql,
          expires_at: sqlRaw("now() + interval '100 years'"),
          created_at: nowSql,
        },
        "ON CONFLICT (file_url) DO NOTHING",
      ),
    );
    if (f.rel.startsWith("brand/") && f.fileName.endsWith(".png")) {
      lines.push(
        ins(
          "system.company_asset",
          {
            id: `ca-${i + 1}`,
            asset_key: f.fileName.replace(/\.png$/, ""),
            title: f.fileName,
            file_url: f.fileUrl,
            mime_type: f.mime,
            file_size: f.size,
            created_at: nowSql,
            updated_at: nowSql,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  });

  lines.push(``);
  lines.push(`-- IDENTITY`);
  lines.push(identityRolesBlock);

  for (const itAcc of IT_ROSTER) {
    lines.push(
      ins(
        "identity.account",
        {
          realm: "it",
          subject_id: itAcc.id,
          email: itAcc.email,
          username: itAcc.username,
          password_hash: itAcc.passwordHash,
          roles: [itAcc.role],
          active: true,
          mfa_enabled: false,
          mfa_secret_encrypted: null,
          mfa_last_step: null,
          mfa_pending_secret_encrypted: null,
          mfa_pending_expires_at: null,
          last_login_at: agoSql(4),
          reporting_to: itAcc.reportTo,
          created_at: agoSql(720),
          updated_at: nowSql,
        },
        "ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now()",
      ),
    );
  }

  STAFF_ROSTER.forEach((s, idx) => {
    const email = staffEmail(s, domainHost);
    const display = s.displayName || s.nameEn;
    lines.push(
      ins(
        "identity.account",
        {
          realm: "staff",
          subject_id: s.id,
          email,
          username: s.username,
          password_hash: s.passwordHash || DEFAULT_PASSWORD_HASH,
          roles: [s.role],
          active: true,
          mfa_enabled: false,
          mfa_secret_encrypted: null,
          mfa_last_step: null,
          mfa_pending_secret_encrypted: null,
          mfa_pending_expires_at: null,
          last_login_at: agoSql((idx % 48) + 1),
          reporting_to: s.reportTo,
          created_at: agoSql(1440),
          updated_at: nowSql,
        },
        "ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, updated_at = now()",
      ),
    );
    lines.push(
      ins(
        "identity.staff_access",
        {
          realm: "staff",
          subject_id: s.id,
          display_name: display,
          permission_overrides: s.id === "super-admin" ? { "*": { view: true, create: true, edit: true, delete: true, export: true } } : {},
          data_scopes:
            idx <= 3
              ? { scope: "global", branches: ["br-hq", "br-seef", "br-muharraq", "br-riffa"] }
              : { scope: "department", departmentId: s.dept, branches: ["br-hq"] },
          updated_at: nowSql,
        },
        "ON CONFLICT (realm, subject_id) DO UPDATE SET display_name = EXCLUDED.display_name, data_scopes = EXCLUDED.data_scopes, updated_at = now()",
      ),
    );
  });

  lines.push(
    ins(
      "identity.branch",
      {
        id: "br-hq",
        code: "HQ-01",
        name: `${company.shortEn} ${company.city} HQ`,
        time_zone: "Asia/Bahrain",
        business_day_start: 8,
        is_active: true,
        revision: 1,
        created_at: agoSql(2160),
        updated_at: nowSql,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  lines.push(``);
  lines.push(`-- HR`);
  const coreDepartments = [
    { id: "d-exec", code: "EXEC", en: "Executive", ar: "الإدارة التنفيذية", head: "super-admin", mgr: "super-admin", dep: "omar-haddad", parent: null, cc: "CC-100", order: 1 },
    { id: "d-fin", code: "FIN", en: "Finance & Accounting", ar: "المالية والمحاسبة", head: "layla-nasser", mgr: "layla-nasser", dep: "faisal-mansour", parent: "d-exec", cc: "CC-200", order: 2 },
    { id: "d-ops", code: "OPS", en: "Operations Delivery", ar: "إدارة العمليات", head: "karim-fawzi", mgr: "karim-fawzi", dep: "tariq-saleh", parent: "d-exec", cc: "CC-300", order: 3 },
    { id: "d-sales", code: "SLS", en: "Commercial & Sales", ar: "المبيعات والتطوير", head: "sami-khoury", mgr: "karim-fawzi", dep: "ahmed-zayani", parent: "d-exec", cc: "CC-400", order: 4 },
    { id: "d-mkt", code: "MKT", en: "Marketing & Growth", ar: "التسويق والنمو", head: "hana-yousef", mgr: "karim-fawzi", dep: "zahra-jaffar", parent: "d-exec", cc: "CC-500", order: 5 },
    { id: "d-hr", code: "HR", en: "Human Resources", ar: "الموارد البشرية", head: "fatima-khalifa", mgr: "fatima-khalifa", dep: "mona-essa", parent: "d-exec", cc: "CC-600", order: 6 },
    { id: "d-it", code: "IT", en: "Information Technology", ar: "تقنية المعلومات", head: "ali-mahmood", mgr: "karim-fawzi", dep: "amal-sultan", parent: "d-exec", cc: "CC-700", order: 7 },
    { id: "d-log", code: "LOG", en: "Logistics & Warehousing", ar: "اللوجستيات والمستودعات", head: "khalid-doseri", mgr: "karim-fawzi", dep: "hamad-ali", parent: "d-ops", cc: "CC-800", order: 8 },
    { id: "d-proc", code: "PROC", en: "Procurement & Vendors", ar: "المشتريات والموردين", head: "ibrahim-kooheji", mgr: "karim-fawzi", dep: "maryam-bucheeri", parent: "d-ops", cc: "CC-850", order: 9 },
    { id: "d-legal", code: "LGL", en: "Legal & Compliance", ar: "الشؤون القانونية والامتثال", head: "dina-mansoor", mgr: "yusuf-rahman", dep: "dina-mansoor", parent: "d-exec", cc: "CC-900", order: 10 },
    { id: "d-prod", code: "PRD", en: "Field Production & Quality", ar: "الإنتاج الميداني والجودة", head: "majed-harbi", mgr: "tariq-saleh", dep: "hassan-matar", parent: "d-ops", cc: "CC-910", order: 11 },
    { id: "d-cs", code: "CS", en: "Customer Success & Support", ar: "خدمة العملاء والدعم", head: "sara-kanoo", mgr: "karim-fawzi", dep: "reem-ansari", parent: "d-sales", cc: "CC-920", order: 12 },
  ];
  for (const d of coreDepartments) {
    lines.push(
      ins(
        "hr.department",
        {
          id: d.id,
          code: d.code,
          name_en: d.en,
          name_ar: d.ar,
          head_id: d.head,
          parent_id: d.parent,
          catalogue_key: d.code.toLowerCase(),
          manager_id: d.mgr,
          deputy_id: d.dep,
          cost_centre: d.cc,
          sort_order: d.order,
          is_active: true,
          created_at: agoSql(2160),
          updated_at: nowSql,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const leaveTypes = [
    { id: "lt-annual", code: "ANN", en: "Annual Leave", ar: "إجازة سنوية", days: 30, paid: true, pct: 100 },
    { id: "lt-sick", code: "SCK", en: "Sick Leave", ar: "إجازة مرضية", days: 15, paid: true, pct: 100 },
    { id: "lt-emerg", code: "EMG", en: "Emergency & Bereavement", ar: "إجازة طارئة ووفاة", days: 5, paid: true, pct: 100 },
    { id: "lt-matern", code: "MAT", en: "Maternity Leave", ar: "إجازة وضع وأمومة", days: 60, paid: true, pct: 100 },
    { id: "lt-patern", code: "PAT", en: "Paternity Leave", ar: "إجازة أبوة", days: 3, paid: true, pct: 100 },
    { id: "lt-hajj", code: "HJJ", en: "Hajj Pilgrimage Leave", ar: "إجازة الحج", days: 14, paid: true, pct: 100 },
  ];
  for (const lt of leaveTypes) {
    lines.push(
      ins(
        "hr.leave_type",
        {
          id: lt.id,
          code: lt.code,
          name_en: lt.en,
          name_ar: lt.ar,
          days_allowed_per_year: lt.days,
          is_paid: lt.paid,
          pay_percent: lt.pct,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  STAFF_ROSTER.forEach((s, idx) => {
    const [firstEn, ...restEn] = s.nameEn.split(" ");
    const lastEn = restEn.join(" ") || firstEn;
    const [firstAr, ...restAr] = s.nameAr.split(" ");
    const lastAr = restAr.join(" ") || firstAr;
    const housingAllow = Number((s.salary * 0.1).toFixed(3));
    const transportAllow = Number((s.salary * 0.05).toFixed(3));
    const otherAllow = idx === 0 ? 180.0 : Number((s.salary * 0.04).toFixed(3));
    const phone = s.phone || `+9733900${String(idx + 1).padStart(4, "0")}`;
    const phoneParts = splitPhone(phone);
    const nat = s.nationality || NATIONALITY_CYCLE[idx % NATIONALITY_CYCLE.length];
    const gender = s.gender || (FEMALE_STAFF_IDS.has(s.id) ? "female" : "male");
    const cprPrefix = `${80 + (idx % 16)}0${(idx % 9) + 1}`;
    const cprNumber = `${cprPrefix}${String(10001 + idx).slice(-5)}`;
    const dobYear = 1980 + (idx % 16);
    const dobMonth = String((idx % 12) + 1).padStart(2, "0");
    const dobDay = String(((idx * 3) % 27) + 1).padStart(2, "0");
    lines.push(
      ins(
        "hr.employee",
        {
          id: s.id,
          user_id: s.id,
          employee_number: s.username,
          first_name_en: firstEn,
          last_name_en: lastEn,
          first_name_ar: firstAr,
          last_name_ar: lastAr,
          email: staffEmail(s, domainHost),
          phone,
          country_code: phoneParts.country_code,
          mobile_number: phoneParts.mobile_number,
          job_title_en: s.titleEn,
          job_title_ar: s.titleAr,
          department_id: s.dept,
          reporting_to: s.reportTo,
          manager_id: s.reportTo,
          hire_date: s.hireDate || `2023-0${(idx % 9) + 1}-${String(((idx * 2) % 27) + 1).padStart(2, "0")}`,
          status: "active",
          basic_salary: Number(s.salary.toFixed(3)),
          housing_allowance: housingAllow,
          transport_allowance: transportAllow,
          other_allowances: otherAllow,
          cpr_number: cprNumber,
          cpr_expiry_date: `2028-${dobMonth}-28`,
          nationality: nat,
          date_of_birth: `${dobYear}-${dobMonth}-${dobDay}`,
          gender,
          passport_number: `${nat}P-${100400 + idx}`,
          passport_country: nat,
          passport_expiry_date: `2030-${dobMonth}-15`,
          leave_balance_days: 24 + (idx % 7),
          created_at: agoSql(1440),
          updated_at: nowSql,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  lines.push(``);
  lines.push(`-- FINANCE, SALES, HR, INVENTORY, COMMERCE, DELIVERY, ITSM, WORKFLOW, NOTIFY, REALTIME & AUDIT`);
  lines.push(buildRichModuleSql({
    company,
    companyJson,
    domainHost,
    staffRoster: STAFF_ROSTER,
    customers: CUSTOMERS,
    filesList,
    defaultPasswordHash: DEFAULT_PASSWORD_HASH,
    superAdminEmail: SUPER_ADMIN_EMAIL,
    itRoster: IT_ROSTER,
  }));

  lines.push(``);
  lines.push(`-- FULL COVERAGE & HIGH-VOLUME MODULES`);
  lines.push(buildExtraModuleSql({
    company,
    companyJson,
    domainHost,
    staffRoster: STAFF_ROSTER,
    customers: CUSTOMERS,
    filesList,
    defaultPasswordHash: DEFAULT_PASSWORD_HASH,
    superAdminEmail: SUPER_ADMIN_EMAIL,
    itRoster: IT_ROSTER,
  }));

  lines.push(``);
  lines.push(`-- CMS PAGES & STATS`);
  const cmsPages = [
    { id: "pg-home", slug: "home", type: "home", en: company.shortEn, ar: company.shortAr, hdr: company.hasWeb, ftr: false, seoEn: `${company.shortEn} | ${company.taglineEn}`, seoAr: `${company.shortAr} | ${company.taglineAr}` },
    { id: "pg-about", slug: "about", type: "about", en: "About Us", ar: "من نحن", hdr: company.hasWeb, ftr: company.hasWeb, seoEn: `About ${company.shortEn} — Established ${company.foundedYear} in ${company.city}`, seoAr: `عن ${company.shortAr} — تأسست عام ${company.foundedYear} في ${company.city}` },
    { id: "pg-services", slug: "services", type: "services", en: "Services", ar: "خدماتنا", hdr: company.hasWeb, ftr: company.hasWeb, seoEn: `Enterprise Services | ${company.shortEn}`, seoAr: `الخدمات المؤسسية | ${company.shortAr}` },
    { id: "pg-work", slug: "work", type: "portfolio", en: "Portfolio", ar: "أعمالنا", hdr: company.hasWeb, ftr: company.hasWeb, seoEn: `Selected Case Studies | ${company.shortEn}`, seoAr: `أبرز المشاريع والأعمال | ${company.shortAr}` },
    { id: "pg-shop", slug: "shop", type: "shop", en: "Catalog & Store", ar: "المتجر والكتالوج", hdr: company.hasStore, ftr: company.hasWeb, seoEn: `Official Products & Packages | ${company.shortEn}`, seoAr: `المنتجات والباقات الرسمية | ${company.shortAr}` },
    { id: "pg-insights", slug: "insights", type: "articles", en: "Insights & Press", ar: "المقالات والأخبار", hdr: company.hasWeb, ftr: company.hasWeb, seoEn: `Market Reports & Briefings | ${company.shortEn}`, seoAr: `التقارير والمقالات | ${company.shortAr}` },
    { id: "pg-faq", slug: "faq", type: "faq", en: "FAQ", ar: "الأسئلة الشائعة", hdr: false, ftr: company.hasWeb, seoEn: `Frequently Asked Questions | ${company.shortEn}`, seoAr: `الأسئلة الشائعة | ${company.shortAr}` },
    { id: "pg-contact", slug: "contact", type: "contact", en: "Contact", ar: "تواصل معنا", hdr: company.hasWeb, ftr: company.hasWeb, seoEn: `Contact ${company.shortEn} — ${company.city}, Bahrain`, seoAr: `تواصل مع ${company.shortAr} — ${company.city}، البحرين` },
  ];
  cmsPages.forEach((pg, idx) => {
    lines.push(
      ins(
        "cms.page",
        {
          id: pg.id,
          slug: pg.slug,
          page_type: pg.type,
          title_en: pg.en,
          title_ar: pg.ar,
          seo_title_en: pg.seoEn,
          seo_title_ar: pg.seoAr,
          seo_description_en: `${company.aboutEn} Explore ${pg.en} in ${company.city}.`,
          seo_description_ar: `${company.aboutAr} تصفح صفحة ${pg.ar}.`,
          blocks: [
            { id: `${pg.id}-hero`, type: "hero", titleEn: pg.seoEn, titleAr: pg.seoAr, image: `/api/files/media/banners/banner-0${(idx % 3) + 1}.png` },
            { id: `${pg.id}-body`, type: "rich_section", ctaEn: "Request Proposal", ctaAr: "طلب عرض سعر", sortOrder: idx + 1 },
          ],
          is_visible: company.hasWeb,
          in_header: pg.hdr,
          in_footer: pg.ftr,
          sort_order: idx + 1,
          created_at: agoSql(2160),
          updated_at: nowSql,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const cmsStats = [
    { id: "stat-1", val: `${2026 - company.foundedYear}+`, en: "Years of Excellence", ar: "سنوات من التميز", subEn: "Continuous Bahrain operations", subAr: "عمليات متواصلة في البحرين", icon: "Award" },
    { id: "stat-2", val: "140+", en: "Enterprise Clients", ar: "عملاء المؤسسات", subEn: "Across 12 regional sectors", subAr: "في 12 قطاعاً إقليمياً", icon: "Building2" },
    { id: "stat-3", val: "99.4%", en: "On-Time Delivery", ar: "الالتزام بالمواعيد", subEn: "Audited SLA completion rate", subAr: "معدل الالتزام بالاتفاقيات", icon: "CheckCircle2" },
    { id: "stat-4", val: "24/7", en: "Client Support", ar: "دعم العملاء", subEn: "Bilingual response desk", subAr: "فريق دعم ثنائي اللغة", icon: "Headphones" },
    { id: "stat-5", val: "4.9/5", en: "Client Satisfaction", ar: "رضا العملاء", subEn: "Verified post-project score", subAr: "تقييم موثق بعد التسليم", icon: "Star" },
    { id: "stat-6", val: "100%", en: "NBR VAT Compliant", ar: "الامتثال الضريبي", subEn: "ISO & PDPL aligned governance", subAr: "حوكمة متوافقة مع المعايير", icon: "ShieldCheck" },
  ];
  cmsStats.forEach((st, idx) => {
    lines.push(
      ins(
        "cms.statistic",
        {
          id: st.id,
          metric_value: st.val,
          label_en: st.en,
          label_ar: st.ar,
          sub_label_en: st.subEn,
          sub_label_ar: st.subAr,
          icon: st.icon,
          sort_order: idx + 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  lines.push(``);
  lines.push(`COMMIT;`);
  return lines.join("\n") + "\n";
}

const SERVICE_SCHEMAS = [
  "identity",
  "system",
  "files",
  "cms",
  "sales",
  "finance",
  "hr",
  "inventory",
  "commerce",
  "delivery",
  "itsm",
  "workflow",
  "notify",
  "realtime",
  "audit",
];

function writePerServiceSeeds(company, dir, seedSql) {
  const buckets = Object.fromEntries(SERVICE_SCHEMAS.map((s) => [s, []]));
  const rawLines = seedSql.split("\n");
  let buf = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!buf.length && (!trimmed || trimmed.startsWith("--") || trimmed === "BEGIN;" || trimmed === "COMMIT;")) {
      continue;
    }
    buf.push(line);
    if (trimmed.endsWith(";")) {
      const stmt = buf.join("\n");
      buf = [];
      const m = stmt.match(/^INSERT INTO\s+([a-z_]+)\./i);
      if (m && buckets[m[1]]) {
        buckets[m[1]].push(stmt);
      }
    }
  }
  for (const svc of SERVICE_SCHEMAS) {
    const stmts = buckets[svc];
    const header = `-- ============================================================================\n-- SERVICE SEED (${svc}): ${company.nameEn} (${company.slug})\n-- ============================================================================\nBEGIN;\n`;
    const body = stmts.length ? stmts.join("\n") : `-- No ${svc} rows for this company scenario.`;
    fs.writeFileSync(path.join(dir, `seed.${svc}.sql`), `${header}\n${body}\n\nCOMMIT;\n`);
  }
}

async function main() {
  for (const company of COMPANIES) {
    const dir = path.join(root, "seeds", company.slug);
    const assetsDir = path.join(dir, "assets");
    fs.mkdirSync(dir, { recursive: true });

    await generateCompanyAssets(company, assetsDir);
    const filesList = buildFilesList(assetsDir);
    const companyJson = buildCompanyJson(company);
    const themeJson = buildThemeJson(company);
    const seedSql = buildSeedSql(company, companyJson, themeJson, filesList);

    fs.writeFileSync(path.join(dir, "company.json"), JSON.stringify(companyJson, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "theme.json"), JSON.stringify(themeJson, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "seed.sql"), seedSql);
    writePerServiceSeeds(company, dir, seedSql);
    console.log(`✓ Generated ${company.slug} (${company.activity}, web=${company.hasWeb}, store=${company.hasStore}, ${filesList.length} assets, 15 service SQLs)`);
  }
  console.log(`\nDone: ${COMPANIES.length} standalone seed companies generated under seeds/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
