const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const schemaMeta = JSON.parse(
  fs.readFileSync(path.join(__dirname, "schema-meta.json"), "utf8"),
);

function uuidOf(seed) {
  const h = crypto.createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sha256(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function sqlRaw(raw) {
  return { __rawSql: String(raw) };
}

function sqlLit(val, udt = "text") {
  if (val && typeof val === "object" && val.__rawSql !== undefined) {
    return val.__rawSql;
  }
  if (val === null || val === undefined) return "NULL";
  if (udt === "jsonb" || udt === "json") {
    const str = typeof val === "string" ? val : JSON.stringify(val);
    return `'${str.replace(/'/g, "''")}'::jsonb`;
  }
  if (udt === "_text" || udt === "_varchar") {
    const arr = Array.isArray(val) ? val : [String(val)];
    const items = arr.map((x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
    return `'${`{${items.join(",")}}`.replace(/'/g, "''")}'::text[]`;
  }
  if (typeof val === "boolean" || udt === "bool") {
    return val ? "true" : "false";
  }
  if (typeof val === "number") {
    return Number.isFinite(val) ? String(val) : "0";
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function ins(table, row, conflictClause = "ON CONFLICT DO NOTHING") {
  const colsMeta = schemaMeta[table];
  if (!colsMeta) {
    throw new Error(`Unknown table in schema-meta.json: ${table}`);
  }
  const cols = [];
  const vals = [];
  for (const [k, v] of Object.entries(row)) {
    if (!colsMeta[k]) continue;
    cols.push(k === "order" ? `"order"` : k);
    vals.push(sqlLit(v, colsMeta[k].udt));
  }
  for (const [colName, meta] of Object.entries(colsMeta)) {
    if (meta.req && !(colName in row)) {
      throw new Error(`Missing required column ${table}.${colName} (udt=${meta.udt})`);
    }
  }
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ${conflictClause};`;
}

// 21 additional staff members (combined with 9 base = 30 staff per company)
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
];

// 42 additional customers (combined with 8 base = 50 customers per company)
const EXTRA_CUSTOMERS = Array.from({ length: 42 }, (_, idx) => {
  const num = idx + 9;
  const padded = String(num).padStart(3, "0");
  const cities = ["Manama", "Seef District", "Muharraq", "Riffa", "Isa Town", "Amwaj Islands", "Sitra", "Budaiya", "Saar", "Juffair"];
  const sectors = ["Trading", "Logistics", "Hospitality", "Healthcare", "Construction", "Retail", "Technology", "Consultancy", "Media", "Manufacturing"];
  const city = cities[idx % cities.length];
  const sector = sectors[idx % sectors.length];
  return {
    id: `cust-${padded}`,
    nameEn: `Bahrain ${sector} Group #${num} W.L.L.`,
    nameAr: `مجموعة البحرين للخدمات ${num} ذ.م.م`,
    email: `accounts${num}@bh-enterprise-${num}.bh`,
    phone: `+97317${String(100000 + num * 137).slice(0, 6)}`,
    city,
  };
});

function buildExtraModuleSql({
  company,
  domainHost,
  staffRoster,
  customers,
  filesList = [],
  defaultPasswordHash,
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

  const extraDepts = [
    { id: "d-hr", code: "HR", nameEn: "Human Resources", nameAr: "الموارد البشرية" },
    { id: "d-it", code: "IT", nameEn: "Information Technology", nameAr: "تقنية المعلومات" },
    { id: "d-log", code: "LOG", nameEn: "Logistics & Warehousing", nameAr: "اللوجستيات والمستودعات" },
    { id: "d-proc", code: "PROC", nameEn: "Procurement", nameAr: "المشتريات" },
  ];
  for (const d of extraDepts) {
    lines.push(ins("hr.department", {
      id: d.id, code: d.code, name_en: d.nameEn, name_ar: d.nameAr,
      parent_id: "d-exec", manager_id: staffRoster[1]?.id || "yusuf-rahman",
      cost_centre: `CC-${d.code}`, is_active: true, created_at: ago(365), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // Additional branches (br-seef, br-sitra)
  for (const b of [
    { id: "br-seef", code: "SF-04", name: `${company.shortEn} Seef District` },
    { id: "br-sitra", code: "ST-05", name: `${company.shortEn} Sitra Logistics` },
  ]) {
    lines.push(ins("identity.branch", {
      id: b.id, code: b.code, name: b.name, time_zone: "Asia/Bahrain",
      business_day_start: 8, is_active: true, revision: 1, created_at: ago(300), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 1. IDENTITY FULL COVERAGE (17 previously unseeded tables) ─────────────────
  lines.push(`\n-- IDENTITY: ROLES, PERMISSIONS, SESSIONS, TOKENS & PROJECTIONS`);
  const roles = [
    { id: "super_admin", name: "Super Administrator", desc: "Full platform access" },
    { id: "admin", name: "Company Admin", desc: "Administrative & operational management" },
    { id: "finance_manager", name: "Finance Manager", desc: "Accounting, invoicing, payroll & treasury" },
    { id: "operations_manager", name: "Operations Manager", desc: "Operations, inventory & delivery" },
    { id: "sales", name: "Sales Executive", desc: "CRM, quotations & deals" },
    { id: "accountant", name: "Accountant", desc: "Ledger, expenses & reconciliations" },
    { id: "editor", name: "Editor", desc: "Content, operations & coordination" },
    { id: "marketing", name: "Marketing", desc: "Campaigns, PR & social analytics" },
  ];
  for (const r of roles) {
    lines.push(ins("identity.role", {
      id: r.id, name: r.name, description: r.desc, is_system: true, created_at: ago(365),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("identity.role_data_scope", {
      role: r.id, area: "all", scope: r.id.includes("admin") ? "all" : "department",
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("identity.staff_role_scope", {
      role_id: r.id, area: "records", scope: r.id.includes("admin") ? "all" : "department",
    }, "ON CONFLICT DO NOTHING"));
  }
  const perms = [
    { id: "perm-fin-read", key: "finance:read", name: "View Finance", cat: "Finance" },
    { id: "perm-fin-write", key: "finance:write", name: "Manage Finance", cat: "Finance" },
    { id: "perm-hr-read", key: "hr:read", name: "View HR", cat: "HR" },
    { id: "perm-hr-write", key: "hr:write", name: "Manage HR", cat: "HR" },
    { id: "perm-sales-read", key: "sales:read", name: "View Sales", cat: "Sales" },
    { id: "perm-sales-write", key: "sales:write", name: "Manage Sales", cat: "Sales" },
    { id: "perm-inv-read", key: "inventory:read", name: "View Inventory", cat: "Inventory" },
    { id: "perm-inv-write", key: "inventory:write", name: "Manage Inventory", cat: "Inventory" },
    { id: "perm-sys-admin", key: "system:admin", name: "System Administration", cat: "System" },
  ];
  for (const p of perms) {
    lines.push(ins("identity.permission", {
      id: p.id, key: p.key, name: p.name, category: p.cat, description: `${p.name} permission`, created_at: ago(365),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < staffRoster.length; i++) {
    const s = staffRoster[i];
    const email = `${s.id}@${domainHost}`;
    const famId = u(`sess-fam-${i}`);
    const sessId = u(`sess-${i}`);
    lines.push(ins("identity.profile_projection", {
      realm: "staff", subject_id: s.id, email, full_name: s.nameEn, avatar_url: `/api/files/brand/icon-light.png`,
      department_id: s.dept, updated_at: now,
    }, "ON CONFLICT (realm, subject_id) DO NOTHING"));

    lines.push(ins("identity.session_family", {
      id: famId, realm: "staff", subject_id: s.id, user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      ip_address: `10.20.1.${10 + i}`, expires_at: ahead(30), created_at: ago(5), last_used_at: ago(0), revoked_at: null,
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("identity.session", {
      id: sessId, user_id: s.id, token_hash: uuidOf(`tok-${s.id}`), expires_at: ahead(7),
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", ip_address: `10.20.1.${10 + i}`, created_at: ago(1),
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("identity.refresh_token", {
      id: u(`rtok-${i}`), family_id: famId, token_hash: sha256(`rt-${s.id}`),
      expires_at: ahead(30), used_at: i % 3 === 0 ? ago(1) : null, revoked_at: null, created_at: ago(5),
    }, "ON CONFLICT DO NOTHING"));

    if (i < 10) {
      lines.push(ins("identity.mfa_recovery_code", {
        id: u(`mfa-rc-${i}`), realm: "staff", subject_id: s.id, code_hash: sha256(`mfa-${s.id}`),
        used_at: null, created_at: ago(60),
      }, "ON CONFLICT DO NOTHING"));
      lines.push(ins("identity.auth_challenge", {
        id: u(`auth-ch-${i}`), realm: "staff", subject_id: s.id, kind: "mfa_totp",
        code_hash: sha256(`ch-${s.id}`), attempts: 0, expires_at: ago(10), consumed_at: ago(10), created_at: ago(10),
      }, "ON CONFLICT DO NOTHING"));
      lines.push(ins("identity.password_reset", {
        id: u(`pw-rst-${i}`), realm: "staff", subject_id: s.id, token_hash: sha256(`pwr-${s.id}`),
        expires_at: ago(20), used_at: ago(20), created_at: ago(21),
      }, "ON CONFLICT DO NOTHING"));
      lines.push(ins("identity.legacy_reset_challenge", {
        id: u(`lrst-${i}`), subject_id: s.id, email, code_hash: sha256(`lrc-${s.id}`),
        kind: "password_reset", attempts: 1, expires_at: ago(30), consumed_at: ago(30), created_at: ago(31),
      }, "ON CONFLICT DO NOTHING"));
    }
  }

  for (let i = 0; i < 20; i++) {
    const c = customers[i];
    lines.push(ins("commerce.customer_auth_code", {
      id: u(`c-acode-${i}`), email: c.email, code_hash: sha256(`cac-${c.id}`),
      attempts: 0, expires_at: ago(5), used_at: ago(5), created_at: ago(5),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("commerce.customer_session", {
      id: u(`c-sess-${i}`), customer_id: c.id, token_hash: sha256(`csess-${c.id}`),
      expires_at: ahead(14), user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      created_at: ago(1),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("identity.customer_code", {
      id: u(`cust-code-${i}`), email: c.email, code_hash: sha256(`cc-${c.id}`),
      purpose: "login_otp", attempts: 0, expires_at: ago(2), consumed_at: ago(2), created_at: ago(2),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("identity.customer_provider", {
      id: u(`cust-prov-${i}`), subject_id: c.id, provider: i % 2 === 0 ? "google" : "apple",
      provider_subject: `sub-${c.id}-${i}`, email: c.email, created_at: ago(90),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("identity.oauth_state", {
      id: u(`oauth-st-${i}`), state_hash: sha256(`st-${i}`), provider: i % 2 === 0 ? "google" : "apple",
      redirect_uri: `https://${domainHost}/auth/callback`, next_path: "/store", locale: "en",
      secret_encrypted: sha256(`sec-${i}`), expires_at: ago(1), consumed_at: ago(1), created_at: ago(1),
    }, "ON CONFLICT DO NOTHING"));
  }

  // ── 2. CMS FULL COVERAGE ────────────────────────────────────────────────────
  lines.push(`\n-- CMS: SNAPSHOTS & WEBSITE CONTENT`);
  const cmsPages = ["home", "about", "services", "portfolio", "contact", "faq"];
  for (let i = 0; i < cmsPages.length; i++) {
    const slug = cmsPages[i];
    const doc = {
      slug,
      hero: { titleEn: `${company.shortEn} — ${slug.toUpperCase()}`, titleAr: `${company.shortAr} — ${slug}`, subtitleEn: company.taglineEn, subtitleAr: company.taglineAr },
      sections: [{ type: "editorial", headingEn: company.aboutEn, headingAr: company.aboutAr }],
    };
    lines.push(ins("cms.website_content", {
      id: `wc-${slug}`, draft: doc, published: doc, previous: doc, revision: 3, published_at: ago(5), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("cms.content_snapshot", {
      id: `snap-${slug}`, draft: doc, published: doc, revision: 2, published_at: ago(10), updated_at: ago(2),
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (let i = 0; i < 15; i++) {
    lines.push(ins("cms.social_insight_snapshot", {
      id: u(`soc-ins-${i}`), platform: i % 2 === 0 ? "instagram" : "linkedin",
      source_provider: "meta_graph", source_account_id: `acct-${company.slug}`,
      period_days: 30, period_start: ago(30 + i * 7), period_end: ago(i * 7),
      time_zone: "Asia/Bahrain",
      metrics: { impressions: 12500 + i * 850, reach: 8400 + i * 420, engagement: 640 + i * 35 },
      native_metrics: { profile_views: 1200 + i * 60, website_clicks: 310 + i * 18 },
      recorded_at: ago(i * 7),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("cms.social_post_snapshot", {
      id: u(`soc-psnap-${i}`), post_id: `sp-${(i % 6) + 1}`, source_account_id: `acct-${company.slug}`,
      recorded_at: ago(i * 3), counters: { likes: 140 + i * 12, comments: 18 + i * 2, shares: 9 + i },
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 3. COMMERCE & DELIVERY FULL COVERAGE (HIGH VOLUME) ──────────────────────
  lines.push(`\n-- COMMERCE & DELIVERY: REGIONS, COUPONS, RETAIL POS, 80 ORDERS & 80 SHIPMENTS`);
  const regions = [
    { id: "reg-bh", code: "BH", nameEn: "Bahrain", nameAr: "البحرين", mult: 1.0 },
    { id: "reg-sa", code: "SA", nameEn: "Saudi Arabia", nameAr: "السعودية", mult: 1.05 },
    { id: "reg-ae", code: "AE", nameEn: "United Arab Emirates", nameAr: "الإمارات", mult: 1.05 },
    { id: "reg-kw", code: "KW", nameEn: "Kuwait", nameAr: "الكويت", mult: 1.03 },
    { id: "reg-qa", code: "QA", nameEn: "Qatar", nameAr: "قطر", mult: 1.03 },
  ];
  for (const r of regions) {
    lines.push(ins("commerce.store_region", {
      id: r.id, code: r.code, name_en: r.nameEn, name_ar: r.nameAr, currency: cur,
      default_language: "en", branch_id: "br-hq", is_enabled: true, price_multiplier: r.mult,
      settings: { vatEnabled: true, freeShippingThreshold: 50 },
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  const coupons = [
    { id: "cpn-welcome10", code: "WELCOME10", type: "percent", val: 10 },
    { id: "cpn-vip20", code: "VIP20", type: "percent", val: 20 },
    { id: "cpn-save15", code: "SAVE15", type: "fixed", val: 15 },
    { id: "cpn-bahrain", code: "BAHRAIN26", type: "percent", val: 15 },
    { id: "cpn-bulk25", code: "BULK25", type: "fixed", val: 25 },
  ];
  for (const cp of coupons) {
    lines.push(ins("commerce.coupon", {
      id: cp.id, code: cp.code, discount_type: cp.type, discount_value: cp.val,
      min_order_amount: 20, max_discount_amount: 100, starts_at: ago(90), expires_at: ahead(180),
      usage_limit: 500, usage_count: 14, is_active: true, created_at: ago(90),
      kind: cp.type, value: cp.val, min_order: 20, ends_at: ahead(180), max_uses: 500, used_count: 14,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  const registers = [
    { id: "pos-reg-1", code: "POS-HQ-01", name: "HQ Main Counter", branch: "br-hq" },
    { id: "pos-reg-2", code: "POS-HQ-02", name: "HQ Express Desk", branch: "br-hq" },
    { id: "pos-reg-3", code: "POS-MH-01", name: "Muharraq Showroom", branch: "br-muharraq" },
    { id: "pos-reg-4", code: "POS-RF-01", name: "Riffa Hub POS", branch: "br-riffa" },
  ];
  for (const reg of registers) {
    lines.push(ins("commerce.retail_register", {
      id: reg.id, name: reg.name, branch_id: reg.branch, is_active: true,
      code: reg.code, revision: 1, created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (let i = 0; i < 24; i++) {
    const shId = u(`retail-shift-${i}`);
    const reg = registers[i % registers.length];
    const cashier = staffRoster[(i % (staffRoster.length - 2)) + 1];
    const salesTotal = Number((420 + (i % 7) * 145.5).toFixed(3));
    lines.push(ins("commerce.retail_shift", {
      id: shId, register_id: reg.id, cashier_id: cashier.id,
      opened_at: ago(i + 1), closed_at: i === 0 ? null : ago(i),
      starting_cash: 100, closing_cash: i === 0 ? 0 : Number((100 + salesTotal * 0.4).toFixed(3)),
      expected_cash: Number((100 + salesTotal * 0.4).toFixed(3)),
      status: i === 0 ? "open" : "closed",
    }, "ON CONFLICT (id) DO NOTHING"));
    if (i > 0) {
      lines.push(ins("commerce.retail_closing", {
        id: u(`retail-close-${i}`), shift_id: shId, closing_date: dateAgo(i),
        total_sales: salesTotal, total_cash: Number((salesTotal * 0.4).toFixed(3)),
        total_card: Number((salesTotal * 0.6).toFixed(3)), notes: `End-of-shift Z-report #${i}`,
        branch_id: reg.branch, level: "register", target_id: reg.id, business_date: ago(i),
        closed_at: ago(i), closed_by_id: cashier.id, total_returns: 0, total_other: 0,
        cash_variance: 0, snapshot: { txCount: 14 + (i % 9), register: reg.code },
        signature: `SIG-${reg.code}-${i}`, journal_id: null, status: "posted", revision: 1,
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }

  // Courier agencies, vehicles, slots, drivers
  const agencies = [
    { id: "ag-aramex", name: "Aramex Bahrain", contact: "Dispatch Desk", email: "dispatch@aramex.bh", phone: "+97317339900" },
    { id: "ag-dhl", name: "DHL Express Gulf", contact: "Account Ops", email: "ops@dhl.bh", phone: "+97317364100" },
    { id: "ag-naqel", name: "Naqel Express", contact: "GCC Hub", email: "bahrain@naqelexpress.com", phone: "+97317408800" },
    { id: "ag-smsa", name: "SMSA Express", contact: "Manama Station", email: "manama@smsaexpress.com", phone: "+97317552211" },
  ];
  for (const ag of agencies) {
    lines.push(ins("delivery.courier_agency", {
      id: ag.id, name: ag.name, contact_name: ag.contact, email: ag.email, phone: ag.phone,
      api_endpoint: `https://api.${ag.id.replace("ag-", "")}.example.bh/v1`, is_active: true, created_at: ago(200),
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  const vehicles = Array.from({ length: 8 }, (_, i) => ({
    id: `veh-${i + 1}`,
    plate: `BH-${20410 + i * 117}`,
    model: ["Toyota HiAce", "Ford Transit", "Nissan Urvan", "Hyundai H350"][i % 4],
    type: i % 2 === 0 ? "van" : "refrigerated_van",
  }));
  for (const v of vehicles) {
    lines.push(ins("delivery.vehicle", {
      id: v.id, plate: v.plate, name: `${v.model} (${v.plate})`, vehicle_type: v.type,
      capacity_kg: 1200, is_active: true, created_at: ago(200), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  const slotIds = [];
  for (let wd = 0; wd < 7; wd++) {
    const sid = `slot-${wd}-am`;
    slotIds.push(sid);
    lines.push(ins("delivery.delivery_slot", {
      id: sid, zone_id: "dz-manama", weekday: wd, slot_start: "09:00", slot_end: "13:00",
      capacity: 25, is_active: true, created_at: ago(180),
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  const drivers = staffRoster.filter((s) => s.role === "driver" || s.dept === "d-log").slice(0, 6);
  for (const drv of drivers) {
    lines.push(ins("delivery.driver_ref", {
      employee_id: drv.id, user_id: drv.id, name_en: drv.nameEn, name_ar: drv.nameAr,
      phone: `+9733988${String(staffRoster.indexOf(drv) + 1000)}`, department_id: drv.dept,
      status: "active", updated_at: now,
    }, "ON CONFLICT (employee_id) DO NOTHING"));
  }

  // Route sheets & COD settlements
  const routeSheets = [];
  for (let i = 0; i < 12; i++) {
    const rsId = u(`rs-${i}`);
    const drv = drivers[i % drivers.length] || staffRoster[0];
    const veh = vehicles[i % vehicles.length];
    routeSheets.push({ id: rsId, driverId: drv.id });
    lines.push(ins("delivery.route_sheet", {
      id: rsId, number: `${pfx}-RS-${String(1001 + i)}`, driver_id: drv.id, vehicle_id: veh.id,
      status: i < 2 ? "in_progress" : "completed", run_date: dateAgo(i), created_at: ago(i), updated_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("delivery.cod_settlement", {
      id: u(`cod-${i}`), sheet_id: rsId, driver_id: drv.id,
      amount_collected: Number((185 + i * 24.5).toFixed(3)),
      amount_settled: Number((185 + i * 24.5).toFixed(3)),
      status: i < 2 ? "pending" : "settled", settled_at: i < 2 ? null : ago(i), created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // 80 Sales Orders + Lines + Events + Delivery Order Refs + 80 Shipments + Events
  const prodList = company.products.length > 0 ? company.products : [
    { sku: `${pfx}-ITEM-01`, en: `${company.shortEn} Standard Package`, ar: `باقة ${company.shortAr}`, price: 120 },
  ];
  for (let i = 0; i < 80; i++) {
    const cust = customers[i % customers.length];
    const ordId = u(`order-${i}`);
    const ordNum = `${pfx}-ORD-${String(2001 + i)}`;
    const prod = prodList[i % prodList.length];
    const qty = (i % 4) + 1;
    const subtotal = Number((prod.price * qty).toFixed(3));
    const vat = Number((subtotal * 0.1).toFixed(3));
    const total = Number((subtotal + vat + 2.5).toFixed(3));
    const status = i < 10 ? "pending" : i < 25 ? "processing" : i < 65 ? "delivered" : "shipped";
    const payStatus = i < 10 ? "unpaid" : "paid";
    lines.push(ins("commerce.sales_order", {
      id: ordId, number: ordNum, customer_id: cust.id, contact_id: cust.id,
      email: cust.email, name: cust.nameEn, phone: cust.phone, channel: i % 3 === 0 ? "pos" : "web",
      status, payment_status: payStatus, payment_method: i % 2 === 0 ? "benefit_pay" : "card",
      fulfilment: "delivery",
      shipping_address: { line1: `Building ${10 + i}, Road ${120 + i}`, city: cust.city, country: "BH" },
      subtotal, discount_amount: 0, coupon_code: i % 5 === 0 ? "WELCOME10" : null,
      vat_amount: vat, delivery_fee: 2.5, total, amount_paid: payStatus === "paid" ? total : 0,
      amount_refunded: 0, currency: cur, locale: i % 2 === 0 ? "en" : "ar",
      note: `Order #${2001 + i} for ${cust.nameEn}`, warehouse_id: "wh-main",
      invoice_id: null, created_by_id: staffRoster[i % staffRoster.length].id,
      placed_at: ago(i % 60), paid_at: payStatus === "paid" ? ago(i % 60) : null,
      shipped_at: status === "delivered" || status === "shipped" ? ago(Math.max(0, (i % 60) - 1)) : null,
      delivered_at: status === "delivered" ? ago(Math.max(0, (i % 60) - 2)) : null,
      cancelled_at: null, utm_campaign: "q4-growth", utm_source: "direct", utm_medium: "web",
      updated_at: ago(i % 60), shipment_id: u(`ship-${i}`), shipment_status: status,
      tracking_token: `TRK-${pfx}-${2001 + i}`,
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("commerce.sales_order_line", {
      id: u(`ord-line-${i}`), order_id: ordId, product_id: `prod-${(i % prodList.length) + 1}`,
      variant_key: "default", sku: prod.sku, description: prod.en, quantity: qty,
      unit_price: prod.price, vat_exempt: false, line_total: subtotal,
      location_id: "loc-a1", returned_quantity: 0, sort_order: 1,
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("commerce.sales_order_event", {
      id: u(`ord-evt-${i}`), order_id: ordId, kind: "status_change", status,
      note: `Order transitioned to ${status}`, amount: total,
      by_id: staffRoster[i % staffRoster.length].id, created_at: ago(i % 60),
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("delivery.order_ref", {
      order_id: ordId, order_number: ordNum, customer_id: cust.id, contact_id: cust.id,
      recipient_name: cust.nameEn, recipient_phone: cust.phone, status, total, currency: cur, updated_at: now,
    }, "ON CONFLICT (order_id) DO NOTHING"));

    const rs = routeSheets[i % routeSheets.length];
    const ag = agencies[i % agencies.length];
    const shipId = u(`ship-${i}`);
    lines.push(ins("delivery.shipment", {
      id: shipId, number: `${pfx}-SHP-${String(3001 + i)}`, order_id: ordId,
      status: status === "delivered" ? "delivered" : status === "shipped" ? "out_for_delivery" : "packed",
      method: i % 3 === 0 ? "courier_agency" : "in_house_fleet",
      zone_id: "dz-manama", slot_id: slotIds[i % slotIds.length],
      slot_date: dateAgo(i % 30), slot_start: "09:00", slot_end: "13:00",
      driver_id: rs.driverId, vehicle_id: vehicles[i % vehicles.length].id,
      route_sheet_id: rs.id, agency_id: ag.id,
      tracking_number: `AWB-${pfx}-${80001 + i}`, tracking_token: `TRK-${pfx}-${80001 + i}`,
      tracking_url: `https://track.${domainHost}/AWB-${80001 + i}`,
      promised_by: ahead(2),
      recipient_name: cust.nameEn, recipient_phone: cust.phone,
      address: { line1: `Building ${10 + i}, ${cust.city}`, area: cust.city, city: cust.city, country: "BH" },
      cod_amount: i % 4 === 0 ? total : 0, cod_collected: i % 4 === 0 && status === "delivered" ? total : 0,
      delivery_fee: 2.5, proof_photo_url: null, signature_url: null,
      notes: `Shipment for ${ordNum}`, packed_at: ago(i % 30),
      dispatched_at: ago(Math.max(0, (i % 30) - 1)),
      delivered_at: status === "delivered" ? ago(Math.max(0, (i % 30) - 2)) : null,
      created_at: ago(i % 30), updated_at: ago(i % 30),
    }, "ON CONFLICT (id) DO NOTHING"));

    lines.push(ins("delivery.shipment_event", {
      id: u(`ship-evt-${i}`), shipment_id: shipId,
      status: status === "delivered" ? "delivered" : "dispatched",
      note: `Scanned at ${cust.city} hub`, location: cust.city,
      by_id: rs.driverId, created_at: ago(i % 30),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 4. FINANCE FULL COVERAGE ────────────────────────────────────────────────
  lines.push(`\n-- FINANCE: TAX RATES, CASH DRAWERS, SESSIONS, WEBHOOKS & AGENCY INVOICES`);
  const taxRates = [
    { id: "tax-vat-10", nameEn: "Standard VAT 10%", nameAr: "ضريبة القيمة المضافة 10%", rate: 10, def: true },
    { id: "tax-vat-0", nameEn: "Zero-Rated VAT 0%", nameAr: "ضريبة القيمة المضافة 0%", rate: 0, def: false },
    { id: "tax-exempt", nameEn: "VAT Exempt", nameAr: "معفى من الضريبة", rate: 0, def: false },
  ];
  for (const tr of taxRates) {
    lines.push(ins("finance.tax_rate", {
      id: tr.id, name_en: tr.nameEn, name_ar: tr.nameAr, rate_percent: tr.rate,
      code: tr.id.toUpperCase(), country: "BH", is_default: tr.def, is_active: true,
      effective_from: dateAgo(365), effective_to: null, description: tr.nameEn,
      created_at: ago(365), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (let i = 0; i < 4; i++) {
    const cdId = `cd-${i + 1}`;
    lines.push(ins("finance.cash_drawer", {
      id: cdId, branch_id: i < 2 ? "br-hq" : "br-muharraq", code: `DRW-0${i + 1}`,
      name_en: `Cash Drawer #${i + 1}`, name_ar: `صندوق النقد ${i + 1}`,
      currency: cur, opening_balance: 150, current_balance: 480 + i * 65,
      is_active: true, created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    for (let s = 0; s < 5; s++) {
      lines.push(ins("finance.cashier_session", {
        id: u(`csess-${i}-${s}`), cash_drawer_id: cdId, cashier_id: staffRoster[(s + 2) % staffRoster.length].id,
        branch_id: i < 2 ? "br-hq" : "br-muharraq", status: s === 0 ? "open" : "closed",
        opening_float: 150, expected_closing: 520, actual_closing: s === 0 ? null : 520,
        variance: 0, opened_at: ago(s * 3 + 1), closed_at: s === 0 ? null : ago(s * 3),
        notes: `Shift session #${s + 1}`, created_at: ago(s * 3 + 1), updated_at: ago(s * 3),
        total_cash_sales: 210, total_card_sales: 310, total_refunds: 0,
        approved_by_id: staffRoster[2].id, approved_at: s === 0 ? null : ago(s * 3),
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }
  for (let i = 0; i < 12; i++) {
    const ag = agencies[i % agencies.length];
    lines.push(ins("finance.agency_invoice", {
      id: u(`ag-inv-${i}`), agency_id: ag.id, invoice_number: `${ag.id.toUpperCase()}-2026-${100 + i}`,
      total_amount: Number((180 + i * 32.5).toFixed(3)), currency: cur,
      status: i < 4 ? "pending" : "paid", period_start: dateAgo((i + 1) * 30), period_end: dateAgo(i * 30),
      created_at: ago(i * 30),
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (let i = 0; i < 20; i++) {
    const invNum = i + 1;
    const cust = customers[i % customers.length];
    const amt = Number((150 + i * 42.5).toFixed(3));
    lines.push(ins("finance.document_tax", {
      id: u(`doc-tax-${i}`), document_type: "invoice", document_id: `inv-${String(invNum).padStart(3, "0")}`,
      tax_rate_id: "tax-vat-10", tax_name: "Standard VAT 10%", rate_percent: 10,
      taxable_amount: amt, tax_amount: Number((amt * 0.1).toFixed(3)),
      currency: cur, created_at: ago(i * 4), updated_at: ago(i * 4),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("finance.payment_attempt", {
      id: u(`pay-att-${i}`), order_id: u(`order-${i}`), invoice_id: `inv-${String(invNum).padStart(3, "0")}`,
      gateway: i % 2 === 0 ? "benefit_pay" : "tap_payments",
      gateway_ref: `GW-${pfx}-${9000 + i}`, amount: Number((amt * 1.1).toFixed(3)), currency: cur,
      status: "succeeded", error_message: null, metadata: { channel: "web" },
      created_at: ago(i * 4), updated_at: ago(i * 4), completed_at: ago(i * 4),
      customer_id: cust.id, payment_method: i % 2 === 0 ? "benefit" : "card",
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("finance.payment_collection", {
      id: u(`pay-col-${i}`), collector_id: staffRoster[i % staffRoster.length].id,
      customer_id: cust.id, invoice_id: `inv-${String(invNum).padStart(3, "0")}`, amount: Number((amt * 1.1).toFixed(3)),
      currency: cur, method: i % 2 === 0 ? "cash" : "bank_transfer",
      reference: `COL-${pfx}-${500 + i}`, collected_at: ago(i * 3), status: "verified",
      notes: `Collected from ${cust.nameEn}`, created_at: ago(i * 3), updated_at: ago(i * 3),
      branch_id: "br-hq",
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("finance.payment_webhook_event", {
      id: u(`pwh-${i}`), gateway: i % 2 === 0 ? "benefit_pay" : "tap_payments",
      event_id: `evt_${pfx}_${7000 + i}`, processed_at: ago(i * 4),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("finance.commission_snapshot", {
      id: u(`comm-snap-${i}`), invoice_id: `inv-${String(invNum).padStart(3, "0")}`, owner_id: staffRoster[7].id,
      rule_id: "crule-std", rate_percent: 5, commissionable_amount: amt,
      commission_amount: Number((amt * 0.05).toFixed(3)), currency: cur,
      status: i < 10 ? "paid" : "accrued", period_month: "2026-10",
      created_at: ago(i * 4), updated_at: ago(i * 4), payout_id: null,
      notes: `5% sales commission on invoice #${invNum}`, source_type: "invoice",
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 5. HR FULL COVERAGE (BENEFITS, GOSI, SUPPORT, 360+ PAYROLL LINES, 600 ATTENDANCE) ──
  lines.push(`\n-- HR: GOSI, BENEFITS, SUPPORT, SALARY DOCS, 600 ATTENDANCE & PAYROLL LINES`);
  lines.push(ins("hr.gosi_settings", {
    id: "default", settings: { employeeRateBahraini: 7, employerRateBahraini: 12, employeeRateExpat: 0, employerRateExpat: 3, wageCap: 4000 },
  }, "ON CONFLICT (id) DO NOTHING"));
  for (const gc of [
    { id: "gosi-bh-emp", nameEn: "Bahraini Employee Share", nameAr: "حصة الموظف البحريني", rate: 7, payer: "employee" },
    { id: "gosi-bh-er", nameEn: "Bahraini Employer Share", nameAr: "حصة صاحب العمل البحريني", rate: 12, payer: "employer" },
    { id: "gosi-ex-er", nameEn: "Expat Occupational Hazard", nameAr: "تأمين إصابات العمل للوافدين", rate: 3, payer: "employer" },
  ]) {
    lines.push(ins("hr.gosi_component", {
      id: gc.id, name_en: gc.nameEn, name_ar: gc.nameAr, rate_percent: gc.rate, payer: gc.payer, is_active: true,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (const bp of [
    { id: "bp-med-gold", nameEn: "Gold Medical Insurance", nameAr: "التأمين الطبي الذهبي", cat: "medical", cost: 45 },
    { id: "bp-med-silver", nameEn: "Silver Medical Insurance", nameAr: "التأمين الطبي الفضي", cat: "medical", cost: 28 },
    { id: "bp-life", nameEn: "Group Life & Accident", nameAr: "تأمين الحياة والحوادث", cat: "insurance", cost: 12 },
    { id: "bp-edu", nameEn: "Training & Certification Allowance", nameAr: "بدل التدريب والشهادات", cat: "allowance", cost: 35 },
  ]) {
    lines.push(ins("hr.benefit_plan", {
      id: bp.id, name_en: bp.nameEn, name_ar: bp.nameAr, category: bp.cat,
      employer_contribution: bp.cost, employee_contribution: 0, is_active: true, created_at: ago(300),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < staffRoster.length; i++) {
    const s = staffRoster[i];
    lines.push(ins("hr.leave_adjustment", {
      id: u(`la-${i}`), employee_id: s.id, leave_type_id: "lt-annual", year: 2026,
      days: 2, reason: "Carried forward from 2025", adjusted_by_id: staffRoster[0].id, created_at: ago(300),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("hr.salary_document", {
      id: u(`sal-doc-${i}`), employee_id: s.id, title: `Salary Certificate — ${s.nameEn}`,
      document_type: "salary_certificate", file_url: `/api/files/brand/stamp.png`,
      issued_at: ago(30), issued_by_id: staffRoster[2].id, basic_salary: s.salary,
      allowances: Number((s.salary * 0.15).toFixed(3)), currency: cur,
      notes: "Official HR salary certificate", created_at: ago(30), updated_at: ago(30),
    }, "ON CONFLICT (id) DO NOTHING"));

    // 20 days of attendance per employee (30 * 20 = 600 rows!)
    for (let d = 1; d <= 20; d++) {
      lines.push(ins("hr.attendance_entry", {
        id: u(`att-${i}-${d}`), employee_id: s.id, date: dateAgo(d),
        check_in: sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '8 hours ${d % 9} minutes'`),
        check_out: sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '17 hours ${d % 9} minutes'`),
        status: d % 17 === 0 ? "late" : "present", worked_minutes: 480,
        overtime_minutes: d % 5 === 0 ? 60 : 0, late_minutes: d % 17 === 0 ? 12 : 0,
        notes: "Biometric HQ check-in", created_at: ago(d), updated_at: ago(d),
        shift_type_id: "shf-morning", source: "biometric",
        overtime_night_minutes: 0, overtime_rest_day_minutes: 0, overtime_holiday_minutes: 0,
      }, "ON CONFLICT DO NOTHING"));
    }

    if (i < 15) {
      const supId = u(`emp-sup-${i}`);
      lines.push(ins("hr.employee_support", {
        id: supId, employee_id: s.id, program_id: "sp-tamkeen", title: `Tamkeen Wage Support — ${s.nameEn}`,
        status: i < 10 ? "active" : "pending", monthly_amount: 150, currency: cur,
        start_date: dateAgo(180), end_date: dateAhead(180), reference: `TMK-2026-${100 + i}`,
        notes: "National employment wage subsidy", created_by_id: staffRoster[2].id,
        created_at: ago(180), updated_at: now, approved_at: ago(175), approved_by_id: staffRoster[0].id,
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("hr.employee_support_event", {
        id: u(`emp-sup-evt-${i}`), support_id: supId, event_type: "claim_verified",
        note: "Monthly Tamkeen disbursement confirmed", actor_id: staffRoster[2].id,
        amount: 150, created_at: ago(15),
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }

  // Payroll item lines (for existing payroll runs/items)
  for (const m of [7, 8, 9, 10]) {
    for (let i = 0; i < staffRoster.length; i++) {
      const s = staffRoster[i];
      const piId = `pi-prun-2026-${String(m).padStart(2, "0")}-${s.id}`;
      lines.push(ins("hr.payroll_item_line", {
        id: u(`pil-basic-${m}-${i}`), payroll_item_id: piId, kind: "earning", category: "basic_salary",
        label_en: "Basic Salary", label_ar: "الراتب الأساسي", amount: s.salary,
        is_taxable: false, sort_order: 1, created_at: ago(m * 30),
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("hr.payroll_item_line", {
        id: u(`pil-allow-${m}-${i}`), payroll_item_id: piId, kind: "earning", category: "housing_allowance",
        label_en: "Housing & Transport Allowance", label_ar: "بدل السكن والمواصلات",
        amount: Number((s.salary * 0.15).toFixed(3)), is_taxable: false, sort_order: 2, created_at: ago(m * 30),
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }

  // ── 6. INVENTORY FULL COVERAGE (SERIALS, PACKAGES, TRACE EVENTS) ────────────
  lines.push(`\n-- INVENTORY: PACKAGING UNITS, SERIALS, PACKAGES, ACKNOWLEDGMENTS & TRACE EVENTS`);
  for (let i = 0; i < prodList.length; i++) {
    const prod = prodList[i];
    const pid = `prod-${i + 1}`;
    lines.push(ins("inventory.product_packaging_unit", {
      id: `ppu-${i + 1}`, product_id: pid, code: "BOX-10", name_en: "Master Carton (10 Units)",
      name_ar: "كرتون رئيسي (10 وحدات)", units_per_package: 10, barcode: `629000100${100 + i}`,
      is_default: true, created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));

    for (let j = 0; j < 15; j++) {
      const serId = u(`ser-${i}-${j}`);
      const serNum = `${prod.sku}-SN-${String(1000 + i * 100 + j)}`;
      lines.push(ins("inventory.stock_serial", {
        id: serId, product_id: pid, variant_key: "default", batch_key: `B-2026-0${(j % 3) + 1}`,
        serial_number: serNum, status: j < 10 ? "in_stock" : "sold",
        warehouse_id: "wh-main", location_id: "loc-a1",
        purchase_order_id: null, goods_receipt_id: null,
        notes: `Serialized unit ${serNum}`, created_at: ago(60), updated_at: ago(j),
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("inventory.stock_trace_event", {
        id: u(`ste-${i}-${j}`), serial_id: serId, event_type: j < 10 ? "received" : "dispatched",
        from_location_id: j < 10 ? null : "loc-a1", to_location_id: j < 10 ? "loc-a1" : null,
        reference_type: j < 10 ? "goods_receipt" : "sales_order",
        reference_id: u(`order-${j}`), created_at: ago(j * 2),
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }
  for (let i = 0; i < 12; i++) {
    const pkgId = u(`pkg-${i}`);
    lines.push(ins("inventory.stock_package", {
      id: pkgId, code: `${pfx}-PKG-${500 + i}`, warehouse_id: "wh-main", location_id: "loc-a1",
      status: i < 4 ? "sealed" : "dispatched", weight_kg: 12.5 + i,
      notes: `Outbound pallet package #${500 + i}`, created_by_id: staffRoster[0].id,
      created_at: ago(i * 3), updated_at: ago(i * 3),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("inventory.stock_acknowledgment", {
      id: u(`ack-${i}`), allocation_id: `salloc-00${(i % 2) + 1}`,
      acknowledged_by_id: staffRoster[(i % 10) + 1].id, status: "acknowledged",
      received_quantity: 5 + i, damaged_quantity: 0, missing_quantity: 0,
      notes: `Handover acknowledged at ${company.city}`, acknowledged_at: ago(i * 2),
      created_at: ago(i * 2), updated_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 7. ITSM, NOTIFY, REALTIME & SALES FULL COVERAGE ─────────────────────────
  lines.push(`\n-- ITSM, NOTIFY, REALTIME & SALES EXTRAS`);
  for (const sp of [
    { id: "sp-tamkeen", nameEn: "Tamkeen Wage Support", nameAr: "دعم الأجور - تمكين", pct: 50 },
    { id: "sp-equip", nameEn: "Equipment Care & Warranty", nameAr: "ضمان وصيانة المعدات", pct: 100 },
  ]) {
    lines.push(ins("itsm.support_program", {
      id: sp.id, code: sp.id.toUpperCase(), name_en: sp.nameEn, name_ar: sp.nameAr,
      description: `${sp.nameEn} corporate policy`, is_active: true, default_coverage_percent: sp.pct,
      max_claim_amount: 1500, currency: cur, created_at: ago(200), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("itsm.support_program_rule", {
      id: `${sp.id}-r1`, program_id: sp.id, rule_key: "eligibility_tenure_days",
      rule_value: "90", description: "Minimum 90 days active employment", created_at: ago(200),
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (let i = 0; i < 15; i++) {
    lines.push(ins("itsm.support_reimbursement", {
      id: u(`itsm-reimb-${i}`), program_id: i % 2 === 0 ? "sp-tamkeen" : "sp-equip",
      employee_id: staffRoster[i % staffRoster.length].id, amount: 85 + i * 15,
      currency: cur, status: i < 5 ? "pending" : "approved",
      receipt_url: `/api/files/brand/stamp.png`, notes: `Support claim #${i + 1}`,
      submitted_at: ago(i * 4), decided_at: i < 5 ? null : ago(i * 4 - 1),
      decided_by_id: i < 5 ? null : staffRoster[0].id,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("itsm.ticket_attachment", {
      id: u(`tkt-att-${i}`), ticket_id: u(`ticket:${(i % 12) + 1}`),
      file_name: `diagnostic-log-${i + 1}.pdf`, file_url: `/api/files/brand/stamp.png`,
      mime_type: "application/pdf", file_size: 48200 + i * 1024,
      added_by: staffRoster[i % staffRoster.length].id, created_at: ago(i * 2),
    }, "ON CONFLICT DO NOTHING"));
  }

  for (let i = 0; i < 12; i++) {
    lines.push(ins("notify.category_setting", {
      id: `ncat-${i + 1}`, realm: "staff", user_id: staffRoster[i % staffRoster.length].id,
      category: ["finance", "hr", "sales", "itsm"][i % 4], email_enabled: true,
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("notify.message", {
      id: u(`nmsg-${i}`), caller: "notify-seed", idempotency_key: `nmsg-${pfx}-${i}`,
      channel: i % 2 === 0 ? "email" : "whatsapp",
      recipient: `${staffRoster[i % staffRoster.length].id}@${domainHost}`,
      subject: `${company.shortEn}: Action Required #${i + 1}`,
      body: `Automated notification dispatch #${i + 1} for ${company.shortEn}.`,
      status: "sent", provider: "smtp", provider_id: `msg-${pfx}-${i}`,
      attempts: 1, last_error: null, metadata: { priority: "normal" },
      user_id: staffRoster[i % staffRoster.length].id, realm: "staff",
      created_by_id: "system", sent_at: ago(i), created_at: ago(i), updated_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("notify.attachment", {
      id: u(`natt-${i}`), message_id: u(`nmsg-${i}`), position: 1,
      filename: `summary-${i + 1}.pdf`, content_type: "application/pdf",
      content: sqlRaw("E'\\\\x25504446'::bytea"),
    }, "ON CONFLICT DO NOTHING"));
    lines.push(ins("notify.mute", {
      id: u(`nmute-${i}`), realm: "staff", user_id: staffRoster[i % staffRoster.length].id,
      entity_type: "ticket", entity_id: u(`ticket:${(i % 12) + 1}`), created_at: ago(1),
    }, "ON CONFLICT DO NOTHING"));
  }

  for (let i = 0; i < staffRoster.length; i++) {
    lines.push(ins("realtime.status_window", {
      id: u(`rt-win-${i}`), realm: "staff", user_id: staffRoster[i].id,
      source: "calendar", source_id: u(`cal-${(i % 14) + 1}`),
      kind: i % 4 === 0 ? "busy" : "online",
      starts_at: ago(1), ends_at: ahead(1), created_at: ago(1), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 15; i++) {
    lines.push(ins("sales.sales_attribution_change", {
      id: u(`sac-${i}`), entity_type: "quotation", entity_id: `qt-${String((i % 14) + 1).padStart(3, "0")}`,
      from_owner_id: staffRoster[7].id, to_owner_id: staffRoster[8].id,
      changed_by_id: staffRoster[0].id, reason: "Territory rebalancing Q4",
      created_at: ago(i * 5),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  // ── 8. SYSTEM REMAINING TABLES (45+ TABLES) ─────────────────────────────────
  lines.push(`\n-- SYSTEM: GOVERNANCE, POLICIES, API KEYS, BROADCASTS, DOCS, COMMS & LOGS`);
  for (let i = 0; i < 10; i++) {
    lines.push(ins("system.abuse_window", {
      key: `rate:login:10.20.1.${i + 1}`, count: 1 + (i % 3), reset_at: ahead(1),
    }, "ON CONFLICT (key) DO NOTHING"));
    lines.push(ins("system.api_key", {
      id: u(`apikey-${i}`), name: `Integration Key #${i + 1}`, key_prefix: `${pfx.toLowerCase()}_live_${10 + i}`,
      key_hash: uuidOf(`ak-${i}`), scopes: ["read:orders", "read:inventory"],
      created_by: staffRoster[0].id, last_used_at: ago(i), expires_at: ahead(365),
      revoked_at: null, created_at: ago(90), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.backup_record", {
      id: u(`bkp-${i}`), kind: i % 2 === 0 ? "database" : "full",
      file_name: `${company.slug}-backup-2026-11-${String(15 - i).padStart(2, "0")}.dump`,
      storage_path: `backups/${company.slug}/${i}.dump`, size_bytes: 18450000 + i * 240000,
      checksum: uuidOf(`chk-${i}`), status: "completed",
      created_by: staffRoster[0].id, completed_at: ago(i), created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.tag", {
      id: `tag-${i + 1}`, name: ["VIP", "Urgent", "Enterprise", "Recurring", "Export", "Government", "B2B", "Retail", "Media", "Priority"][i],
      name_ar: ["كبار الشخصيات", "عاجل", "مؤسسات", "متكرر", "تصدير", "حكومي", "أعمال", "تجزئة", "إعلام", "أولوية"][i],
      color: ["#0F766E", "#DC2626", "#2563EB", "#7C3AED", "#D97706", "#059669", "#4F46E5", "#DB2777", "#0891B2", "#EA580C"][i],
      entity_type: "general", created_at: ago(180),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 6; i++) {
    const apId = `ap-pol-${i + 1}`;
    lines.push(ins("system.approval_policy", {
      id: apId, entity_type: ["expense", "purchase_order", "leave_request", "quotation", "contract", "payment"][i],
      name_en: `Standard Approval Policy #${i + 1}`, name_ar: `سياسة الاعتماد القياسية ${i + 1}`,
      is_active: true, created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.approval_policy_step", {
      id: `${apId}-s1`, policy_id: apId, step_order: 1, approver_role: "operations_manager",
      approver_user_id: staffRoster[3].id, min_amount: 0, max_amount: 1000,
      require_all: false, auto_approve_below: 50, label_en: "Department Manager", label_ar: "مدير القسم",
      escalate_after_hours: 24, notify_channel: "in_app", created_at: ago(180),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 8; i++) {
    const bcId = u(`bc-${i}`);
    lines.push(ins("system.broadcast", {
      id: bcId, title_en: `${company.shortEn} Operational Update #${i + 1}`,
      title_ar: `تحديث تشغيلي رقم ${i + 1}`, body_en: "Quarterly performance & compliance notice for all teams.",
      body_ar: "إشعار الأداء والامتثال الربع سنوي لجميع الفرق.", channel: "email",
      audience: "all_staff", status: "sent", sent_count: staffRoster.length,
      failed_count: 0, created_by_id: staffRoster[0].id, sent_at: ago(i * 7), created_at: ago(i * 7),
    }, "ON CONFLICT (id) DO NOTHING"));
    for (let j = 0; j < 5; j++) {
      const s = staffRoster[(i + j) % staffRoster.length];
      lines.push(ins("system.broadcast_recipient", {
        id: u(`bcr-${i}-${j}`), broadcast_id: bcId, user_id: s.id,
        email: `${s.id}@${domainHost}`, status: "delivered", delivered_at: ago(i * 7),
        read_at: ago(i * 7), error_message: null,
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }

  for (let i = 0; i < 10; i++) {
    const thId = u(`comm-th-${i}`);
    const cust = customers[i % customers.length];
    lines.push(ins("system.communication_thread", {
      id: thId, subject: `Client Thread: ${cust.nameEn} (#${i + 1})`,
      contact_id: cust.id, deal_id: `deal-${(i % 8) + 1}`, inquiry_id: null,
      status: i < 4 ? "open" : "resolved", last_message_at: ago(i), created_at: ago(i + 2),
    }, "ON CONFLICT (id) DO NOTHING"));
    const msgId = u(`comm-msg-${i}`);
    lines.push(ins("system.communication_message", {
      id: msgId, thread_id: thId, direction: i % 2 === 0 ? "outbound" : "inbound",
      channel: "email", sender_name: i % 2 === 0 ? staffRoster[7].nameEn : cust.nameEn,
      sender_email: i % 2 === 0 ? `${staffRoster[7].id}@${domainHost}` : cust.email,
      recipient_email: i % 2 === 0 ? cust.email : `sales@${domainHost}`,
      subject: `Re: Proposal & Deliverables #${i + 1}`,
      body_text: "Thank you for confirming the schedule and commercial terms.",
      body_html: "<p>Thank you for confirming the schedule and commercial terms.</p>",
      status: "delivered", external_id: `ext-${pfx}-${i}`,
      sent_by_id: staffRoster[7].id, sent_at: ago(i), created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.message_attachment", {
      id: u(`msg-att-${i}`), message_id: msgId, filename: `proposal-${i + 1}.pdf`,
      content_type: "application/pdf", size: 124500, storage_path: `docs/proposal-${i + 1}.pdf`,
      is_quarantined: false, created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < staffRoster.length; i++) {
    const s = staffRoster[i];
    lines.push(ins("system.calendar_feed_token", {
      id: u(`cft-${i}`), user_id: s.id, token: uuidOf(`cal-tok-${s.id}`),
      is_active: true, created_at: ago(90),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.employment_record", {
      id: u(`emprec-${i}`), employee_id: s.id, contract_type: "full_time",
      basic_salary: s.salary, housing_allowance: Number((s.salary * 0.1).toFixed(3)),
      transport_allowance: Number((s.salary * 0.05).toFixed(3)), other_allowances: 0,
      payroll_settings: { gosi: true, payDay: 28 }, effective_from: ago(365),
      effective_to: null, is_current: true, created_at: ago(365),
    }, "ON CONFLICT (id) DO NOTHING"));
    if (i < 10) {
      lines.push(ins("system.payslip", {
        id: u(`sys-ps-${i}`), payroll_item_id: `pi-prun-2026-10-${s.id}`, employee_id: s.id,
        month: 10, year: 2026, storage_path: `payslips/2026-10/${s.id}.pdf`, issued_at: ago(15),
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("system.account_change_request", {
        id: u(`acr-${i}`), user_id: s.id, requested_by_id: s.id,
        change_type: "role_update", payload: { requestedRole: s.role },
        status: i < 3 ? "pending" : "approved", reviewed_by_id: i < 3 ? null : staffRoster[0].id,
        review_notes: "Verified with department head", decided_at: i < 3 ? null : ago(5),
        created_at: ago(10), updated_at: ago(5),
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("system.profile_change_request", {
        id: u(`pcr-${i}`), user_id: s.id, requested_by_id: s.id, manager_id: staffRoster[1].id,
        status: i < 3 ? "pending" : "approved", old_values: { phone: "+97339000000" },
        new_values: { phone: `+9733900${1000 + i}` }, reviewed_at: i < 3 ? null : ago(4),
        review_notes: "Approved HR contact update", created_at: ago(7), updated_at: ago(4),
      }, "ON CONFLICT (id) DO NOTHING"));
      lines.push(ins("system.signature_change", {
        id: u(`sigchg-${i}`), user_id: s.id, signature_url: "/api/files/brand/signature.png",
        previous_url: null, status: "approved", reviewed_by_id: staffRoster[0].id,
        review_notes: "Authorized digital signature", decided_at: ago(30), created_at: ago(31),
      }, "ON CONFLICT (id) DO NOTHING"));
    }
  }

  for (let i = 0; i < 10; i++) {
    const cust = customers[i];
    lines.push(ins("system.client_contact_person", {
      id: u(`ccp-${i}`), client_id: cust.id, name_en: `Contact ${i + 1} (${cust.city})`,
      name_ar: `جهة الاتصال ${i + 1}`, email: cust.email, phone: cust.phone,
      job_title: "Procurement Director", is_primary: true, notes: "Primary billing & project contact",
      created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.client_signature", {
      id: u(`csig-${i}`), client_id: cust.id, signer_name: `Authorized Signatory #${i + 1}`,
      signer_email: cust.email, signer_phone: cust.phone, signature_url: "/api/files/brand/signature.png",
      document_type: "quotation", document_id: `qt-${String((i % 14) + 1).padStart(3, "0")}`,
      ip_address: `185.12.4.${20 + i}`, user_agent: "Mozilla/5.0",
      signed_at: ago(i * 3), created_by_id: staffRoster[7].id, created_at: ago(i * 3),
      notes: "E-signed via client portal", verified: true, verification_code: `VER-${1000 + i}`,
      expires_at: ahead(365), status: "signed", updated_at: ago(i * 3),
      metadata: { source: "portal" },
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.wishlist_item", {
      id: u(`wish-${i}`), customer_id: cust.id, catalogue_item_id: `prod-${(i % prodList.length) + 1}`,
      created_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  lines.push(ins("system.dashboard_layout", {
    user_id: staffRoster[0].id,
  }, "ON CONFLICT (user_id) DO NOTHING"));

  for (const [key, en, ar] of [
    ["ai_copilot", "AI Operations Copilot", "مساعد العمليات الذكي"],
    ["multi_currency", "Multi-Currency FX", "تعدد العملات"],
    ["e_signatures", "Digital E-Signatures", "التوقيع الإلكتروني"],
    ["pos_offline", "POS Offline Queue", "نقاط البيع بدون إنترنت"],
    ["gosi_auto", "Automated GOSI Sync", "مزامنة التأمينات التلقائية"],
  ]) {
    lines.push(ins("system.feature_toggle", {
      id: `ft-${key}`, module_key: key, is_enabled: true, name_en: en, name_ar: ar,
      description: `Feature flag for ${en}`,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (const dk of ["sql_trace", "nats_verbose", "webhook_replay"]) {
    lines.push(ins("system.debug_toggle", {
      id: `dbg-${dk}`, service: dk, enabled_by: staffRoster[0].id, expires_at: ahead(7),
      key: dk, enabled: false, description: `Diagnostic toggle: ${dk}`,
      updated_by_id: staffRoster[0].id, updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }
  for (const prov of ["google_workspace", "microsoft_365", "meta_business", "tap_payments", "aramex_api"]) {
    lines.push(ins("system.integration_setting", {
      provider: prov, is_active: true, credentials: "encrypted:placeholder",
      config: { region: "me-south-1", sandbox: false }, sync_lease_token: null, sync_lease_until: null,
      health_status: "healthy", last_checked_at: ago(0), last_error: null,
      account_name: `${company.shortEn} (${prov})`, last_synced_at: ago(0),
      updated_at: now, updated_by: staffRoster[0].id, updated_by_id: staffRoster[0].id,
    }, "ON CONFLICT (provider) DO NOTHING"));
  }

  for (const dt of ["quotation", "invoice", "receipt", "contract", "official_letter"]) {
    lines.push(ins("system.signature_policy", {
      document_type: dt, mode: "optional", updated_by_id: staffRoster[0].id, updated_at: now,
    }, "ON CONFLICT (document_type) DO NOTHING"));
    lines.push(ins("system.document_template", {
      id: `tmpl-${dt}`, document_type: dt, name_en: `Standard ${dt} Template`,
      name_ar: `قالب ${dt} القياسي`, header_html: `<div>${company.nameEn}</div>`,
      footer_html: `<div>${company.addressEn}</div>`, body_template: "<p>{{content}}</p>",
      is_default: true, is_active: true, created_by_id: staffRoster[0].id,
      created_at: ago(180), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 6; i++) {
    lines.push(ins("system.company_document", {
      id: u(`cdoc-${i}`), title_en: ["Commercial Registration", "VAT Certificate", "GOSI Clearance", "Chamber Membership", "Trade License", "ISO 9001 Certificate"][i],
      title_ar: ["السجل التجاري", "شهادة القيمة المضافة", "شهادة التأمينات", "عضوية الغرفة", "الرخصة التجارية", "شهادة الجودة"][i],
      category: "compliance", document_number: `${company.crNumber}-${i + 1}`,
      file_url: "/api/files/brand/stamp.png", issue_date: dateAgo(300), expiry_date: dateAhead(180 + i * 30),
      remind_days_before: 30, status: "valid", uploaded_by_id: staffRoster[0].id,
      notes: "Verified corporate compliance document", created_at: ago(300), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.generated_document", {
      id: u(`gdoc-${i}`), document_type: "invoice_pdf", source_entity_type: "invoice",
      source_entity_id: `inv-${String(i + 1).padStart(3, "0")}`, file_name: `${pfx}-INV-${100 + i}.pdf`,
      storage_path: `generated/invoices/${pfx}-INV-${100 + i}.pdf`, file_size: 84200,
      checksum: uuidOf(`gdoc-chk-${i}`), generated_by_id: staffRoster[2].id, created_at: ago(i * 3),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.hero_banner", {
      id: `hb-${i + 1}`, title_en: company.taglineEn, title_ar: company.taglineAr,
      subtitle_en: company.aboutEn, subtitle_ar: company.aboutAr, media_type: "image",
      media_url: "/api/files/media/banners/hero-1.png", poster_url: "/api/files/media/banners/hero-1.png",
      display_order: i + 1, is_active: true, cta_label_en: "Explore Services",
      cta_label_ar: "استكشف خدماتنا", cta_link: "/services", created_at: ago(120), is_sample: false,
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.report_schedule", {
      id: u(`rsch-${i}`), report_key: ["pnl_monthly", "ar_aging", "payroll_summary", "stock_valuation", "sales_pipeline", "vat_return"][i],
      frequency: "monthly", format: "pdf", locale: "en", compare: true,
      owner_id: staffRoster[2].id, is_active: true, next_run_at: ahead(15),
      last_sent_at: ago(15), last_error: null, created_at: ago(90), updated_at: now,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 10; i++) {
    lines.push(ins("system.activity_log", {
      id: u(`actlog-${i}`), user_id: staffRoster[i % staffRoster.length].id,
      action: ["invoice.issued", "quotation.sent", "employee.onboarded", "stock.adjusted", "ticket.resolved"][i % 5],
      entity_type: ["invoice", "quotation", "employee", "product", "ticket"][i % 5],
      entity_id: u(`act-ent-${i}`), metadata: { ip: `10.20.1.${10 + i}`, source: "admin" },
      created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.email_job", {
      id: u(`ejob-${i}`), event_key: `invoice.sent.${i}`, mom_id: null,
      created_by_id: staffRoster[2].id, recipient: customers[i % customers.length].email,
      subject: `${company.shortEn} — Document #${100 + i}`, html: "<p>Please find attached your official document.</p>",
      attachment_name: `doc-${100 + i}.pdf`, attachment: null, status: "sent",
      attempts: 1, next_attempt_at: ago(i), provider_id: `smtp-${pfx}-${i}`,
      last_error: null, accepted_at: ago(i), created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.document_fx", {
      id: u(`dfx-${i}`), document_type: "invoice", document_id: `inv-${String(i + 1).padStart(3, "0")}`,
      base_currency: cur, quote_currency: "USD", raw_rate: 2.6525,
      margin_percent: 0.5, effective_rate: 2.6658, snapshot_id: null, created_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.revalidation_job", {
      id: u(`reval-${i}`), event_key: `cms.publish.${i}`, payload: { paths: ["/", "/services"] },
      status: "delivered", attempts: 1, next_attempt_at: ago(i), last_error: null,
      delivered_at: ago(i), created_at: ago(i),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 3; i++) {
    const fsId = u(`finset-${i}`);
    lines.push(ins("system.final_settlement", {
      id: fsId, reference: `${pfx}-EOS-${101 + i}`, employee_id: staffRoster[staffRoster.length - 1 - i].id,
      handover_id: `ho-00${i + 1}`, reason: "contract_completion", last_working_day: ago(10 + i * 30),
      status: "settled", currency: cur, total_additions: 1450, total_deductions: 120,
      net_amount: 1330, employer_contributions: 180, calculation: { yearsOfService: 2.5 },
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.final_settlement_line", {
      id: u(`fsl-${i}`), settlement_id: fsId, kind: "addition", category: "gratuity",
      label_en: "End of Service Indemnity", label_ar: "مكافأة نهاية الخدمة",
      amount: 1450, source: "labor_law_bh", details: { formula: "half_month_per_year" }, display_order: 1,
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  for (let i = 0; i < 6; i++) {
    const reqId = u(`inq-${(i % 14) + 1}`);
    lines.push(ins("system.request_assignment", {
      id: u(`req-asg-${i}`), inquiry_id: reqId, assigned_to_id: staffRoster[7].id,
      assigned_by_id: staffRoster[3].id, team: "sales", reason: "Primary account owner",
      active: true, created_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.request_comment", {
      id: u(`req-cmt-${i}`), inquiry_id: reqId, author_id: staffRoster[7].id,
      body: "Follow-up call completed; quotation scheduled.", is_client_visible: false,
      channel: "internal", attachments: [], created_at: ago(i * 2), updated_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
    lines.push(ins("system.request_event", {
      id: u(`req-evt-${i}`), inquiry_id: reqId, actor_id: staffRoster[7].id,
      event_type: "assigned", details: { to: staffRoster[7].id }, created_at: ago(i * 2),
    }, "ON CONFLICT (id) DO NOTHING"));
  }

  lines.push(ins("system.reference_sequence", {
    id: `seq-${pfx}-2026`, prefix: pfx, year: 2026, last_number: 250, updated_at: now,
  }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("system.number_reservation", {
    caller: "finance-service", idempotency_key: `res-${pfx}-001`, kind: "invoice",
    document_date: dateAgo(1), document_number: `${pfx}-INV-2026-0250`, created_at: ago(1),
  }, "ON CONFLICT (caller, idempotency_key) DO NOTHING"));
  lines.push(ins("system.serial_generation", {
    id: u("ser-gen-1"), idempotency_key: `sg-${pfx}-001`, request_hash: uuidOf("sg-1"),
    product_id: "prod-1", variant_key: "default", batch_key: "B-2026-01", location_id: "loc-a1",
    quantity: 15, created_by_id: staffRoster[0].id, created_at: ago(30),
  }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("system.label_print_job", {
    id: u("lbl-job-1"), idempotency_key: `lbl-${pfx}-001`, request_hash: uuidOf("lbl-1"),
    template: { size: "50x25mm", dpi: 203 }, labels: [{ sku: prodList[0].sku, qty: 15 }],
    status: "confirmed", original_job_id: null, created_by_id: staffRoster[0].id,
    confirmed_by_id: staffRoster[0].id, confirmed_at: ago(30), created_at: ago(30),
  }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("system.package_content", {
    id: u("pkg-cnt-1"), package_id: u("pkg-0"), product_id: "prod-1",
    variant_key: "default", batch_key: "B-2026-01", quantity: 10,
  }, "ON CONFLICT (id) DO NOTHING"));

  // ── 9. HISTORICAL PROCESSED INBOX & OUTBOX EVENT MESH ROWS (24 TABLES) ──────
  lines.push(`\n-- EVENT MESH: HISTORICAL PUBLISHED OUTBOX & PROCESSED INBOX RECORDS`);
  const meshServices = [
    "cms", "commerce", "delivery", "finance", "hr", "identity",
    "inventory", "itsm", "notify", "sales", "system", "workflow",
  ];
  for (const svc of meshServices) {
    for (let i = 0; i < 5; i++) {
      const msgId = uuidOf(`${company.slug}:mesh:${svc}:${i}`);
      lines.push(`INSERT INTO ${svc}.outbox (id, subject, payload, headers, attempts, next_try_at, last_error, created_at, published_at) VALUES ('${msgId}', '${svc}.entity.seeded', '{"company":"${company.slug}","seq":${i + 1}}'::jsonb, '{"source":"seed"}'::jsonb, 1, now() - interval '1 hour', NULL, now() - interval '2 hours', now() - interval '1 hour') ON CONFLICT (id) DO NOTHING;`);
      lines.push(`INSERT INTO ${svc}.inbox (consumer, event_id, handled_at) VALUES ('${svc}-worker', '${msgId}', now() - interval '1 hour') ON CONFLICT (consumer, event_id) DO NOTHING;`);
    }
  }

  return lines.join("\n");
}

module.exports = { EXTRA_STAFF, EXTRA_CUSTOMERS, buildExtraModuleSql };
