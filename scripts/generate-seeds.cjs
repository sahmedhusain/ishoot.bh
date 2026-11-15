const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require(path.resolve(__dirname, "../apps/admin/node_modules/sharp"));
const { COMPANIES } = require("./seed-companies.cjs");
const { buildRichModuleSql } = require("./seed-rich-modules.cjs");
const { EXTRA_STAFF, EXTRA_CUSTOMERS, buildExtraModuleSql } = require("./seed-extra-modules.cjs");

const root = path.resolve(__dirname, "..");
const schemaMeta = require("./schema-meta.json");
const templateSqlPath = path.join(root, "seeds/zayed-group/seed.sql");
const templateSql = fs.readFileSync(templateSqlPath, "utf8");

// Extract static identity roles/permissions/scopes (preserving IT roles/permissions)
const identityMatch = templateSql.match(/-- IDENTITY\n[\s\S]*?(?=\nINSERT INTO identity\.account)/);
if (!identityMatch) {
  throw new Error("Could not extract identity roles block from template SQL.");
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
  { id: "omar-haddad", nameEn: "Omar Haddad", nameAr: "عمر حداد", username: "OH0002", role: "super_admin", dept: "d-exec", titleEn: "Managing Partner", titleAr: "الشريك الإداري", salary: 2400, reportTo: null },
  { id: "yusuf-rahman", nameEn: "Yusuf Al-Rahman", nameAr: "يوسف الرحمن", username: "YR0003", role: "admin", dept: "d-exec", titleEn: "General Director", titleAr: "المدير العام", salary: 2100, reportTo: "omar-haddad" },
  { id: "layla-nasser", nameEn: "Layla Al-Nasser", nameAr: "ليلى الناصر", username: "LN0004", role: "finance_manager", dept: "d-fin", titleEn: "Finance Manager", titleAr: "المدير المالي", salary: 1650, reportTo: "yusuf-rahman" },
  { id: "karim-fawzi", nameEn: "Karim Fawzi", nameAr: "كريم فوزي", username: "KF0005", role: "operations_manager", dept: "d-ops", titleEn: "Operations Manager", titleAr: "مدير العمليات", salary: 1600, reportTo: "yusuf-rahman" },
  { id: "tariq-saleh", nameEn: "Tariq Al-Saleh", nameAr: "طارق الصالح", username: "TS0006", role: "project_lead", dept: "d-ops", titleEn: "Operations Lead", titleAr: "قائد المشاريع", salary: 1250, reportTo: "karim-fawzi" },
  { id: "noor-hamdan", nameEn: "Noor Al-Hamdan", nameAr: "نور الحمدان", username: "NH0007", role: "editor", dept: "d-ops", titleEn: "Senior Coordinator", titleAr: "منسق أول", salary: 950, reportTo: "tariq-saleh" },
  { id: "faisal-mansour", nameEn: "Faisal Al-Mansour", nameAr: "فيصل المنصور", username: "FM0008", role: "accountant", dept: "d-fin", titleEn: "Senior Accountant", titleAr: "محاسب أول", salary: 980, reportTo: "layla-nasser" },
  { id: "sami-khoury", nameEn: "Sami Khoury", nameAr: "سامي خوري", username: "SK0009", role: "sales", dept: "d-sales", titleEn: "Account Executive", titleAr: "تنفيذي مبيعات", salary: 1100, reportTo: "karim-fawzi" },
  { id: "hana-yousef", nameEn: "Hana Yousef", nameAr: "هناء يوسف", username: "HY0010", role: "marketing", dept: "d-mkt", titleEn: "Growth Specialist", titleAr: "أخصائية نمو وتسويق", salary: 920, reportTo: "karim-fawzi" },
  ...EXTRA_STAFF,
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
  lines.push(`INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)`);
  lines.push(`VALUES ('c0000000-0000-0000-0000-000000000001', true, ${sqlQ(companyData)}, false, 1, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`);

  for (const [key, enabled] of Object.entries(modules)) {
    lines.push(`INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at) VALUES (${sqlQ(key)}, ${enabled}, 'seed:sql', now()) ON CONFLICT (module_key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();`);
  }

  lines.push(`INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', ${sqlQ(company.prefix)}, 120), ('receipt', 'RCT', 120) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;`);
  lines.push(`INSERT INTO system.site_setting (id, website_domain, admin_domain, code, updated_at, updated_by) VALUES (true, ${sqlQ(domainHost)}, ${sqlQ("admin." + domainHost)}, '{"headHtml":"","bodyHtml":"","customCss":""}'::jsonb, now(), 'seed:sql') ON CONFLICT (id) DO UPDATE SET website_domain = EXCLUDED.website_domain, admin_domain = EXCLUDED.admin_domain, updated_at = now();`);

  lines.push(`INSERT INTO system.public_holiday (id, date, name_en, name_ar) VALUES`);
  lines.push(`  ('hol-01', '2026-01-01', 'New Year''s Day', 'رأس السنة الميلادية'),`);
  lines.push(`  ('hol-02', '2026-12-16', 'Bahrain National Day', 'العيد الوطني لمملكة البحرين')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  if (company.services.length > 0) {
    lines.push(`INSERT INTO system.service (id, code, name_en, name_ar, category, description_en, description_ar, unit, default_rate, is_active, display_order, is_public, created_at, updated_at, is_sample) VALUES`);
    company.services.forEach((s, i) => {
      const comma = i === company.services.length - 1 ? "" : ",";
      lines.push(`  (${sqlQ(`svc-${i + 1}`)}, ${sqlQ(s.code)}, ${sqlQ(s.en)}, ${sqlQ(s.ar)}, ${sqlQ(s.cat)}, ${sqlQ(s.en)}, ${sqlQ(s.ar)}, ${sqlQ(s.unit)}, ${s.rate.toFixed(3)}, true, ${i + 1}, ${company.hasWeb}, now(), now(), false)${comma}`);
    });
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  lines.push(``);
  lines.push(`-- FILES`);
  filesList.forEach((f, i) => {
    const id = crypto.createHash("md5").update(`${company.slug}:${f.fileUrl}`).digest("hex");
    const uuid = `${id.slice(0, 8)}-${id.slice(8, 12)}-4${id.slice(13, 16)}-8${id.slice(17, 20)}-${id.slice(20, 32)}`;
    lines.push(`INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at) VALUES (${sqlQ(uuid)}, ${sqlQ(f.fileUrl)}, 'system', ${sqlQ(f.fileName)}, ${f.size}, ${sqlQ(f.mime)}, true, now(), now() + interval '100 years', now()) ON CONFLICT (file_url) DO NOTHING;`);
    if (f.rel.startsWith("brand/") && f.fileName.endsWith(".png")) {
      lines.push(`INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at) VALUES (${sqlQ(`ca-${i + 1}`)}, ${sqlQ(f.fileName.replace(/\.png$/, ""))}, ${sqlQ(f.fileName)}, ${sqlQ(f.fileUrl)}, ${sqlQ(f.mime)}, ${f.size}, now(), now()) ON CONFLICT (id) DO NOTHING;`);
    }
  });

  lines.push(``);
  lines.push(`-- IDENTITY`);
  lines.push(identityRolesBlock);
  for (const s of STAFF_ROSTER) {
    const email = `${s.id}@${domainHost}`;
    lines.push(`INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at) VALUES ('staff', ${sqlQ(s.id)}, ${sqlQ(email)}, ${sqlQ(s.username)}, ${sqlQ(DEFAULT_PASSWORD_HASH)}, ${sqlQ([s.role])}, true, false, ${sqlQ(s.reportTo)}, now(), now()) ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, reporting_to = EXCLUDED.reporting_to, updated_at = now();`);
    lines.push(`INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', ${sqlQ(s.id)}, '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO identity.branch (id, code, name, time_zone, business_day_start, is_active, revision, created_at, updated_at) VALUES ('br-hq', 'HQ-01', ${sqlQ(`${company.shortEn} ${company.city} HQ`)}, 'Asia/Bahrain', 8, true, 1, now(), now()) ON CONFLICT (id) DO NOTHING;`);

  lines.push(``);
  lines.push(`-- HR`);
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d-exec', 'EXEC', 'Executive', 'الإدارة التنفيذية'), ('d-fin', 'FIN', 'Finance', 'المالية'), ('d-ops', 'OPS', 'Operations', 'العمليات'), ('d-sales', 'SLS', 'Sales', 'المبيعات'), ('d-mkt', 'MKT', 'Marketing', 'التسويق'), ('d-hr', 'HR', 'Human Resources', 'الموارد البشرية'), ('d-it', 'IT', 'Information Technology', 'تقنية المعلومات'), ('d-log', 'LOG', 'Logistics & Warehousing', 'اللوجستيات والمستودعات'), ('d-proc', 'PROC', 'Procurement', 'المشتريات') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.leave_type (id, code, name_en, name_ar, days_allowed_per_year, is_paid, pay_percent) VALUES ('lt-annual', 'ANN', 'Annual Leave', 'إجازة سنوية', 30, true, 100), ('lt-sick', 'SCK', 'Sick Leave', 'إجازة مرضية', 15, true, 100) ON CONFLICT (id) DO NOTHING;`);
  for (const s of STAFF_ROSTER) {
    const [firstEn, ...restEn] = s.nameEn.split(" ");
    const lastEn = restEn.join(" ") || firstEn;
    const [firstAr, ...restAr] = s.nameAr.split(" ");
    const lastAr = restAr.join(" ") || firstAr;
    const housingAllow = Number((s.salary * 0.1).toFixed(3));
    const transportAllow = Number((s.salary * 0.05).toFixed(3));
    lines.push(`INSERT INTO hr.employee (id, user_id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, job_title_en, job_title_ar, department_id, reporting_to, manager_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, leave_balance_days, created_at, updated_at) VALUES (${sqlQ(s.id)}, ${sqlQ(s.id)}, ${sqlQ(s.username)}, ${sqlQ(firstEn)}, ${sqlQ(lastEn)}, ${sqlQ(firstAr)}, ${sqlQ(lastAr)}, ${sqlQ(`${s.id}@${domainHost}`)}, ${sqlQ(s.titleEn)}, ${sqlQ(s.titleAr)}, ${sqlQ(s.dept)}, ${sqlQ(s.reportTo)}, ${sqlQ(s.reportTo)}, '2023-01-15', 'active', ${s.salary.toFixed(3)}, ${housingAllow.toFixed(3)}, ${transportAllow.toFixed(3)}, 27, now(), now()) ON CONFLICT (id) DO NOTHING;`);
  }

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
  }));

  if (true) {
    lines.push(``);
    lines.push(`-- CMS PAGES & STATS`);
    lines.push(`INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, is_visible, in_header, in_footer, sort_order, blocks, updated_at) VALUES`);
    lines.push(`  ('pg-home', 'home', 'home', ${sqlQ(company.shortEn)}, ${sqlQ(company.shortAr)}, ${company.hasWeb}, ${company.hasWeb}, false, 1, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-about', 'about', 'about', 'About Us', 'من نحن', ${company.hasWeb}, ${company.hasWeb}, ${company.hasWeb}, 2, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-services', 'services', 'services', 'Services', 'خدماتنا', ${company.hasWeb}, ${company.hasWeb}, ${company.hasWeb}, 3, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-work', 'work', 'portfolio', 'Portfolio', 'أعمالنا', ${company.hasWeb}, ${company.hasWeb}, ${company.hasWeb}, 4, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-contact', 'contact', 'contact', 'Contact', 'تواصل معنا', ${company.hasWeb}, ${company.hasWeb}, ${company.hasWeb}, 5, '[]'::jsonb, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order) VALUES`);
    lines.push(`  ('stat-1', '${2026 - company.foundedYear}+', 'Years of Excellence', 'سنوات من التميز', 1),`);
    lines.push(`  ('stat-2', '120+', 'Enterprise Clients', 'عملاء المؤسسات', 2),`);
    lines.push(`  ('stat-3', '99.4%', 'On-Time Delivery', 'الالتزام بالمواعيد', 3),`);
    lines.push(`  ('stat-4', '24/7', 'Client Support', 'دعم العملاء', 4)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

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
