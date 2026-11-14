const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require(path.resolve(__dirname, "../apps/admin/node_modules/sharp"));
const { COMPANIES } = require("./seed-companies.cjs");

const root = path.resolve(__dirname, "..");
const templateSqlPath = path.join(root, "seeds/zayed-group/seed.sql");
const templateSql = fs.readFileSync(templateSqlPath, "utf8");

// Extract static TRUNCATE block and static identity roles/permissions/scopes
const truncateMatch = templateSql.match(/TRUNCATE TABLE[\s\S]*?CASCADE;/);
const identityMatch = templateSql.match(/-- IDENTITY\n[\s\S]*?(?=\nINSERT INTO identity\.account)/);
if (!truncateMatch || !identityMatch) {
  throw new Error("Could not extract TRUNCATE or identity roles block from template SQL.");
}
const truncateBlock = truncateMatch[0];
const identityRolesBlock = identityMatch[0].trimEnd();

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
    lines.push(`INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at) VALUES ('staff', ${sqlQ(s.id)}, ${sqlQ(email)}, ${sqlQ(s.username)}, ${sqlQ(DEFAULT_PASSWORD_HASH)}, ${sqlQ([s.role])}, true, false, NULL, now(), now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
    lines.push(`INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', ${sqlQ(s.id)}, '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO identity.branch (id, code, name, time_zone, business_day_start, is_active, revision, created_at, updated_at) VALUES ('br-hq', 'HQ-01', ${sqlQ(`${company.shortEn} ${company.city} HQ`)}, 'Asia/Bahrain', 8, true, 1, now(), now()) ON CONFLICT (id) DO NOTHING;`);

  lines.push(``);
  lines.push(`-- HR`);
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d-exec', 'EXEC', 'Executive', 'الإدارة التنفيذية'), ('d-fin', 'FIN', 'Finance', 'المالية'), ('d-ops', 'OPS', 'Operations', 'العمليات'), ('d-sales', 'SLS', 'Sales', 'المبيعات'), ('d-mkt', 'MKT', 'Marketing', 'التسويق') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.leave_type (id, code, name_en, name_ar, days_allowed_per_year, is_paid, pay_percent) VALUES ('lt-annual', 'ANN', 'Annual Leave', 'إجازة سنوية', 30, true, 100), ('lt-sick', 'SCK', 'Sick Leave', 'إجازة مرضية', 15, true, 100) ON CONFLICT (id) DO NOTHING;`);
  for (const s of STAFF_ROSTER) {
    const [firstEn, ...restEn] = s.nameEn.split(" ");
    const lastEn = restEn.join(" ") || firstEn;
    const [firstAr, ...restAr] = s.nameAr.split(" ");
    const lastAr = restAr.join(" ") || firstAr;
    lines.push(`INSERT INTO hr.employee (id, user_id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, created_at, updated_at) VALUES (${sqlQ(s.id)}, ${sqlQ(s.id)}, ${sqlQ(s.username)}, ${sqlQ(firstEn)}, ${sqlQ(lastEn)}, ${sqlQ(firstAr)}, ${sqlQ(lastAr)}, ${sqlQ(`${s.id}@${domainHost}`)}, ${sqlQ(s.titleEn)}, ${sqlQ(s.titleAr)}, ${sqlQ(s.dept)}, '2023-01-15', 'active', ${s.salary.toFixed(3)}, now(), now()) ON CONFLICT (id) DO NOTHING;`);
  }

  lines.push(``);
  lines.push(`-- FINANCE & SALES`);
  lines.push(`INSERT INTO finance.expense_category (id, code, name_en, name_ar, slug, sort_order, display_order, kind, is_system, is_active) VALUES ('ec-ops', 'OPS', 'Operations', 'تشغيل', 'operations', 1, 1, 'expense', true, true), ('ec-rent', 'RNT', 'Facility & Rent', 'إيجارات ومرافق', 'facility-rent', 2, 2, 'expense', true, true), ('ec-tech', 'TCH', 'Software & Cloud', 'برمجيات وسحابة', 'software-cloud', 3, 3, 'expense', true, true) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO finance.tax_rate (id, code, name_en, name_ar, rate_percent, applies_to_invoices, applies_to_quotations, is_active, display_order, created_at, updated_at) VALUES ('tax-vat-10', 'VAT10', 'Bahrain VAT 10%', 'ضريبة القيمة المضافة 10%', 10.00, true, true, true, 1, now(), now()) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO sales.deal_pipeline_stage (id, name_en, name_ar, probability, sort_order, kind, is_system, is_active, created_at, updated_at) VALUES ('stg-new', 'Qualified', 'مؤهل', 20, 1, 'open', true, true, now(), now()), ('stg-prop', 'Proposal Sent', 'عرض سعر', 50, 2, 'open', true, true, now(), now()), ('stg-neg', 'Negotiation', 'تفاوض', 80, 3, 'open', true, true, now(), now()), ('stg-won', 'Closed Won', 'مغلق ناجح', 100, 4, 'won', true, true, now(), now()) ON CONFLICT (id) DO NOTHING;`);

  CUSTOMERS.forEach((c, idx) => {
    const [cfEn, ...clEn] = c.nameEn.split(" ");
    const clName = clEn.join(" ") || "Group";
    lines.push(`INSERT INTO commerce.customer (id, first_name, last_name, name, email, phone, status, created_at, updated_at) VALUES (${sqlQ(c.id)}, ${sqlQ(cfEn)}, ${sqlQ(clName)}, ${sqlQ(c.nameEn)}, ${sqlQ(c.email)}, ${sqlQ(c.phone)}, 'active', now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO commerce.customer_address (id, customer_id, label, line1, city, country, is_default, created_at) VALUES (${sqlQ(`addr-${idx + 1}`)}, ${sqlQ(c.id)}, 'HQ', 'Building 120, Road 28', ${sqlQ(c.city)}, 'BH', true, now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, created_at, updated_at) VALUES (${sqlQ(`cnt-${idx + 1}`)}, ${sqlQ(cfEn)}, ${sqlQ(clName)}, ${sqlQ(c.email)}, ${sqlQ(c.phone)}, ${sqlQ(c.nameEn)}, 'client', 'active', now(), now()) ON CONFLICT (id) DO NOTHING;`);
  });

  // Invoices & Deals
  const primarySvc = company.services[0] || { en: "Core Engagement", rate: 500 };
  for (let i = 1; i <= 6; i++) {
    const cust = CUSTOMERS[(i - 1) % CUSTOMERS.length];
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const invNum = `${company.prefix}-2026-${100 + i}`;
    const sub = primarySvc.rate * (i % 3 + 1);
    const vat = sub * 0.1;
    const tot = sub + vat;
    const paid = i <= 4 ? tot : 0;
    const bal = tot - paid;
    const status = i <= 4 ? "paid" : "sent";
    lines.push(`INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, created_at, updated_at) VALUES (${sqlQ(`deal-${i}`)}, ${sqlQ(`${cust.nameEn} — ${primarySvc.en}`)}, ${sqlQ(`cnt-${i}`)}, ${sqlQ(i <= 4 ? "stg-won" : "stg-prop")}, ${tot.toFixed(3)}, ${sqlQ(company.currency)}, ${i <= 4 ? 100 : 50}, now() + interval '14 days', ${sqlQ(i <= 4 ? "won" : "open")}, 'sami-khoury', now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, total_amount, amount_paid, balance_due, currency, vat_enabled, vat_percentage, created_by_id, created_at, updated_at) VALUES (${sqlQ(invId)}, ${sqlQ(invNum)}, ${sqlQ(`cnt-${i}`)}, ${sqlQ(status)}, now() - interval '${i * 7} days', now() + interval '23 days', ${sub.toFixed(3)}, 10.00, ${vat.toFixed(3)}, ${tot.toFixed(3)}, ${tot.toFixed(3)}, ${paid.toFixed(3)}, ${bal.toFixed(3)}, ${sqlQ(company.currency)}, true, 10.00, 'layla-nasser', now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES (${sqlQ(`invi-${i}`)}, ${sqlQ(invId)}, ${sqlQ(primarySvc.en)}, ${i % 3 + 1}, ${primarySvc.rate.toFixed(3)}, ${sub.toFixed(3)}, 1) ON CONFLICT (id) DO NOTHING;`);
    if (paid > 0) {
      lines.push(`INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, created_by_id, created_at) VALUES (${sqlQ(`pay-${i}`)}, ${sqlQ(`PAY-${company.prefix}-${100 + i}`)}, ${sqlQ(invId)}, ${sqlQ(`cnt-${i}`)}, ${paid.toFixed(3)}, ${sqlQ(company.currency)}, 'bank_transfer', now() - interval '${i * 3} days', ${sqlQ(`TXN-${company.prefix}-${1000 + i}`)}, 'completed', 'faisal-mansour', now()) ON CONFLICT (id) DO NOTHING;`);
    }
  }

  // Inventory
  if (company.products.length > 0) {
    lines.push(``);
    lines.push(`-- INVENTORY`);
    lines.push(`INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, branch_id, sort_order, created_at, updated_at) VALUES ('wh-main', 'WH-01', ${sqlQ(`${company.shortEn} Main Warehouse`)}, ${sqlQ(`${company.shortAr} المستودع الرئيسي`)}, ${sqlQ(company.addressEn)}, true, true, 'br-hq', 1, now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at) VALUES ('loc-a1', 'wh-main', 'A-01', 'Primary Bay A-01', true, now()) ON CONFLICT (id) DO NOTHING;`);
    const cats = [...new Set(company.products.map((p) => p.cat))];
    cats.forEach((cat, idx) => {
      lines.push(`INSERT INTO inventory.product_category (id, name_en, name_ar, slug, sort_order, is_active, created_at, updated_at) VALUES (${sqlQ(`pcat-${idx + 1}`)}, ${sqlQ(cat)}, ${sqlQ(cat)}, ${sqlQ(cat.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}, ${idx + 1}, true, now(), now()) ON CONFLICT (id) DO NOTHING;`);
    });
    company.products.forEach((p, idx) => {
      const catId = `pcat-${cats.indexOf(p.cat) + 1}`;
      const pid = `prod-${idx + 1}`;
      lines.push(`INSERT INTO inventory.product (id, sku, name_en, name_ar, category_id, cost_price, selling_price, cost, price, currency, is_active, created_at, updated_at) VALUES (${sqlQ(pid)}, ${sqlQ(p.sku)}, ${sqlQ(p.en)}, ${sqlQ(p.ar)}, ${sqlQ(catId)}, ${p.cost.toFixed(3)}, ${p.price.toFixed(3)}, ${p.cost.toFixed(3)}, ${p.price.toFixed(3)}, ${sqlQ(company.currency)}, true, now(), now()) ON CONFLICT (id) DO NOTHING;`);
      lines.push(`INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, on_hand, reserved, updated_at) VALUES (${sqlQ(`sl-${idx + 1}`)}, ${sqlQ(pid)}, 'loc-a1', ${25 + idx * 10}, 0, ${25 + idx * 10}, 0, now()) ON CONFLICT (id) DO NOTHING;`);
    });
  }

  // Commerce & Delivery
  lines.push(``);
  lines.push(`-- COMMERCE & DELIVERY`);
  lines.push(`INSERT INTO commerce.store_settings (id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold, guest_checkout, delivery_enabled, delivery_fee, free_delivery_over, pickup_enabled, cod_enabled, bank_transfer_enabled, order_notify_email, updated_at) VALUES ('default', ${sqlQ(company.currency)}, true, 10.000, 5.000, 50.000, ${company.hasStore}, ${company.hasStore}, 2.500, 50.000, ${company.hasStore}, ${company.hasStore}, true, ${sqlQ(company.email)}, now()) ON CONFLICT (id) DO UPDATE SET delivery_enabled = EXCLUDED.delivery_enabled, pickup_enabled = EXCLUDED.pickup_enabled, guest_checkout = EXCLUDED.guest_checkout, updated_at = now();`);
  if (company.hasStore && company.products.length > 0) {
    lines.push(`INSERT INTO commerce.store_region (id, code, name_en, name_ar, currency, default_language, branch_id, is_enabled, price_multiplier, settings) VALUES ('reg-bh', 'BH', 'Bahrain', 'البحرين', ${sqlQ(company.currency)}, 'ar', 'br-hq', true, 1.000, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO commerce.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES ('dz-manama', 'Capital Governorate', 'محافظة العاصمة', 2.000, 5.000, 40.000, true, 1, now(), now()), ('dz-muharraq', 'Muharraq Governorate', 'محافظة المحرق', 2.500, 5.000, 50.000, true, 2, now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO commerce.retail_register (id, name, branch_id, is_active, code, revision, created_at, updated_at) VALUES ('reg-pos-1', 'Main Counter POS', 'br-hq', true, 'POS-01', 1, now(), now()) ON CONFLICT (id) DO NOTHING;`);
    const p0 = company.products[0];
    lines.push(`INSERT INTO commerce.sales_order (id, number, customer_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, subtotal, vat_amount, delivery_fee, total, amount_paid, currency, locale, warehouse_id, placed_at, updated_at) VALUES ('ord-001', ${sqlQ(`${company.prefix}-ORD-1001`)}, 'cust-001', 'procurement@aljazeeragulf.bh', 'Al-Jazeera Gulf Holdings', '+97317223344', 'storefront', 'delivered', 'paid', 'card', 'delivery', ${p0.price.toFixed(3)}, ${(p0.price * 0.1).toFixed(3)}, 2.000, ${(p0.price * 1.1 + 2).toFixed(3)}, ${(p0.price * 1.1 + 2).toFixed(3)}, ${sqlQ(company.currency)}, 'en', 'wh-main', now() - interval '2 days', now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO commerce.sales_order_line (id, order_id, product_id, sku, description, quantity, unit_price, vat_exempt, line_total, sort_order) VALUES ('ordl-001', 'ord-001', 'prod-1', ${sqlQ(p0.sku)}, ${sqlQ(p0.en)}, 1, ${p0.price.toFixed(3)}, false, ${p0.price.toFixed(3)}, 1) ON CONFLICT (id) DO NOTHING;`);
  }

  // CMS (when hasWeb is true)
  if (company.hasWeb) {
    lines.push(``);
    lines.push(`-- CMS`);
    lines.push(`INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, is_visible, in_header, in_footer, sort_order, blocks, updated_at) VALUES`);
    lines.push(`  ('pg-home', 'home', 'home', ${sqlQ(company.shortEn)}, ${sqlQ(company.shortAr)}, true, true, false, 1, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-about', 'about', 'about', 'About Us', 'من نحن', true, true, true, 2, '[]'::jsonb, now()),`);
    lines.push(`  ('pg-contact', 'contact', 'contact', 'Contact', 'تواصل معنا', true, true, true, 3, '[]'::jsonb, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, is_published, sort_order, created_at) VALUES`);
    lines.push(`  ('faq-1', ${sqlQ(`How do I request a proposal from ${company.shortEn}?`)}, ${sqlQ(`كيف يمكنني طلب عرض سعر من ${company.shortAr}؟`)}, 'Submit an inquiry through our contact page and our team responds within one business day.', 'أرسل طلبك عبر صفحة التواصل وسيرد فريقنا خلال يوم عمل واحد.', true, 1, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order) VALUES`);
    lines.push(`  ('stat-1', '${2026 - company.foundedYear}+', 'Years of Excellence', 'سنوات من التميز', 1),`);
    lines.push(`  ('stat-2', '120+', 'Enterprise Clients', 'عملاء المؤسسات', 2)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Workflow & ITSM
  lines.push(``);
  lines.push(`-- WORKFLOW & ITSM`);
  lines.push(`INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, created_at, updated_at) VALUES ('tsk-001', ${sqlQ(`Q4 Operational Review — ${company.shortEn}`)}, 'Prepare quarterly KPIs and finance reconciliation.', 'layla-nasser', now() + interval '5 days', 'high', 'in_progress', now(), now()) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_at) VALUES ('medium', 60, 480, now()) ON CONFLICT (priority) DO NOTHING;`);

  lines.push(``);
  lines.push(`COMMIT;`);
  return lines.join("\n") + "\n";
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
    console.log(`✓ Generated ${company.slug} (${company.activity}, web=${company.hasWeb}, store=${company.hasStore}, ${filesList.length} assets)`);
  }
  console.log(`\nDone: ${COMPANIES.length} standalone seed companies generated under seeds/.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
