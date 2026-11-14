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

function buildRichModuleSql({
  company,
  companyJson,
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

  const hasLogistics =
    company.hasStore ||
    ["logistics", "food", "products", "online_store", "pharmacy", "all"].includes(company.activity);

  const primarySvc = company.services[0] || {
    en: "Core Professional Engagement",
    ar: "الخدمة الأساسية",
    rate: 450,
    unit: "engagement",
  };

  // ── 1. IDENTITY EXTRAS ──────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- IDENTITY: BRANCHES, USERS & CUSTOMER ACCOUNTS`);
  const branches = [
    { id: "br-hq", code: "HQ-01", name: `${company.shortEn} ${company.city} HQ` },
    { id: "br-muharraq", code: "MH-02", name: `${company.shortEn} Muharraq Office` },
    { id: "br-riffa", code: "RF-03", name: `${company.shortEn} Riffa Hub` },
  ];
  for (const b of branches) {
    lines.push(
      ins(
        "identity.branch",
        {
          id: b.id,
          code: b.code,
          name: b.name,
          time_zone: "Asia/Bahrain",
          business_day_start: 8,
          is_active: true,
          revision: 1,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (const s of staffRoster) {
    const email = `${s.id}@${domainHost}`;
    lines.push(
      ins(
        "identity.user",
        {
          id: s.id,
          email,
          full_name: s.nameEn,
          password_hash: defaultPasswordHash,
          role: s.role,
          permissions: [],
          phone: `+9733900${String(staffRoster.indexOf(s) + 1001)}`,
          department: s.dept,
          department_id: s.dept,
          manager_id: s.reportTo,
          is_active: true,
          mfa_enabled: false,
          created_at: now,
          updated_at: now,
          discount_limit_percent: 15,
          commission_rate_percent: s.role === "sales" ? 5 : 0,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "identity.branch_grant",
        {
          id: `bg-${s.id}-hq`,
          branch_id: "br-hq",
          user_id: s.id,
          can_manage: ["super_admin", "admin", "operations_manager"].includes(s.role),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  customers.forEach((c, idx) => {
    lines.push(
      ins(
        "identity.account",
        {
          realm: "customer",
          subject_id: c.id,
          email: c.email,
          username: `CUST${String(1001 + idx)}`,
          password_hash: defaultPasswordHash,
          roles: ["customer"],
          active: true,
          mfa_enabled: false,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
  });

  // ── 2. SYSTEM OPERATIONAL TABLES ────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- SYSTEM: SETTINGS, SERVICES, EQUIPMENT, PROJECTS, CONTRACTS & GOVERNANCE`);
  lines.push(
    ins(
      "system.company_setting",
      {
        id: "c0000000-0000-0000-0000-000000000001",
        singleton: 1,
        company_name_en: company.nameEn,
        company_name_ar: company.nameAr,
        cr_number: company.crNumber,
        vat_id: company.vatId,
        vat_enabled: true,
        vat_percentage: 10.0,
        default_currency: cur,
        currency_decimals: company.decimals,
        address_en: company.addressEn,
        address_ar: company.addressAr,
        phone: company.phone,
        whatsapp_phone: company.whatsapp,
        email: company.email,
        website: `https://${domainHost}`,
        bank_name: companyJson.company.bankName,
        bank_iban: companyJson.company.bankIban,
        bank_account_number: companyJson.company.bankAccountNumber,
        bank_swift: companyJson.company.bankSwift,
        time_zone: "Asia/Bahrain",
        logo_url: "/api/files/brand/logo-dark.png",
        dark_logo_url: "/api/files/brand/logo-light.png",
        icon_url: "/api/files/brand/icon-light.png",
        dark_icon_url: "/api/files/brand/icon-dark.png",
        stamp_url: "/api/files/brand/stamp.png",
        signature_url: "/api/files/brand/signature.png",
        payment_terms_days: 30,
        invoice_prefix: pfx,
        invoice_next_number: 130,
        receipt_prefix: "RCT",
        receipt_next_number: 130,
        ceo_name_en: company.ceoEn,
        ceo_name_ar: company.ceoAr,
        ceo_title_en: company.ceoTitleEn,
        ceo_title_ar: company.ceoTitleAr,
        tagline_en: company.taglineEn,
        tagline_ar: company.taglineAr,
        about_text_en: company.aboutEn,
        about_text_ar: company.aboutAr,
        founded_year: company.foundedYear,
        city: company.city,
        country: "BH",
        primary_language: "ar",
        business_activity: company.activity,
        default_discount_limit_percent: 15,
        quotations_always_need_approval: false,
        theme: companyJson.company.theme,
        setup_completed_at: "2026-01-01T00:00:00Z",
        website_domain: domainHost,
        admin_domain: `admin.${domainHost}`,
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "system.site_setting",
      {
        id: true,
        website_domain: domainHost,
        admin_domain: `admin.${domainHost}`,
        code: { company: company.slug },
        updated_at: now,
        updated_by: "seed:sql",
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "system.service_settings",
      {
        id: "default",
        sla_urgent_hours: 2,
        sla_high_hours: 8,
        sla_normal_hours: 24,
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "system.communication_settings",
      {
        id: "default",
        managers_announce_to_team: true,
        updated_by_id: "omar-haddad",
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  // Accounting Accounts & Periods
  const accounts = [
    { id: "acc-1000", code: "1000", name: "Cash & Bank — NBB Operating", kind: "asset" },
    { id: "acc-1100", code: "1100", name: "Accounts Receivable", kind: "asset" },
    { id: "acc-1200", code: "1200", name: "Inventory Asset", kind: "asset" },
    { id: "acc-2000", code: "2000", name: "Accounts Payable", kind: "liability" },
    { id: "acc-2100", code: "2100", name: "VAT Output Payable (10%)", kind: "liability" },
    { id: "acc-2200", code: "2200", name: "GOSI & Payroll Liabilities", kind: "liability" },
    { id: "acc-3000", code: "3000", name: "Owner Equity & Retained Earnings", kind: "equity" },
    { id: "acc-4000", code: "4000", name: "Operating & Service Revenue", kind: "revenue" },
    { id: "acc-5000", code: "5000", name: "Cost of Goods & Direct Delivery", kind: "expense" },
    { id: "acc-6000", code: "6000", name: "Salaries, Rent & G&A Expenses", kind: "expense" },
  ];
  for (const a of accounts) {
    lines.push(
      ins(
        "system.accounting_account",
        { id: a.id, code: a.code, name: a.name, kind: a.kind, is_active: true },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  const periods = [
    { id: "per-2026-08", name: "August 2026", start: "2026-08-01", end: "2026-08-31", status: "closed" },
    { id: "per-2026-09", name: "September 2026", start: "2026-09-01", end: "2026-09-30", status: "closed" },
    { id: "per-2026-10", name: "October 2026", start: "2026-10-01", end: "2026-10-31", status: "closed" },
    { id: "per-2026-11", name: "November 2026", start: "2026-11-01", end: "2026-11-30", status: "open" },
  ];
  for (const p of periods) {
    lines.push(
      ins(
        "system.accounting_period",
        {
          id: p.id,
          name: p.name,
          starts_on: p.start,
          ends_on: p.end,
          status: p.status,
          closed_by_id: p.status === "closed" ? "layla-nasser" : null,
          closed_at: p.status === "closed" ? ago(10) : null,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Exchange Rate Snapshots
  const fxRates = [
    { q: "USD", r: 2.6525 },
    { q: "SAR", r: 9.947 },
    { q: "AED", r: 9.742 },
    { q: "EUR", r: 2.441 },
    { q: "GBP", r: 2.085 },
    { q: "KWD", r: 0.812 },
  ];
  fxRates.forEach((fx, i) => {
    lines.push(
      ins(
        "system.exchange_rate_snapshot",
        {
          id: `fx-${fx.q.toLowerCase()}`,
          base_currency: cur,
          quote_currency: fx.q,
          rate: fx.r,
          effective_date: dateAgo(i),
          fetched_at: ago(i),
          provider: "central_bank_bahrain",
          source_evidence: "CBB Daily Reference Rate",
          created_at: ago(i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Public Holidays
  const holidays = [
    { id: "hol-newyear", date: "2026-01-01", en: "New Year's Day", ar: "رأس السنة الميلادية" },
    { id: "hol-labour", date: "2026-05-01", en: "Labour Day", ar: "يوم العمال" },
    { id: "hol-fitr", date: "2026-03-20", en: "Eid Al-Fitr", ar: "عيد الفطر المبارك" },
    { id: "hol-adha", date: "2026-05-27", en: "Eid Al-Adha", ar: "عيد الأضحى المبارك" },
    { id: "hol-national-1", date: "2026-12-16", en: "Bahrain National Day", ar: "اليوم الوطني البحريني" },
    { id: "hol-national-2", date: "2026-12-17", en: "Accession Day", ar: "عيد الجلوس" },
  ];
  for (const h of holidays) {
    lines.push(
      ins(
        "system.public_holiday",
        { id: h.id, date: h.date, name_en: h.en, name_ar: h.ar },
        "ON CONFLICT DO NOTHING",
      ),
    );
  }

  // Services & Catalog Product List (hoisted so Sales/Finance catalog projections & Inventory share exact items)
  const svcList = company.services.length ? company.services : [primarySvc];
  const prodList = company.products.length
    ? company.products
    : [
        { sku: `${pfx}-SUP-01`, en: `${company.shortEn} Operational Kit`, ar: `حقيبة تشغيل ${company.shortAr}`, cat: "Operations", cost: 45, price: 85 },
        { sku: `${pfx}-SUP-02`, en: `${company.shortEn} Branded Package`, ar: `باقة ${company.shortAr} المعتمدة`, cat: "Operations", cost: 80, price: 140 },
        { sku: `${pfx}-SUP-03`, en: `${company.shortEn} Enterprise Hardware`, ar: `أجهزة ${company.shortAr} للمؤسسات`, cat: "Hardware", cost: 160, price: 280 },
      ];
  svcList.forEach((sv, idx) => {
    lines.push(
      ins(
        "system.service",
        {
          id: `svc-${idx + 1}`,
          code: `${pfx}-SVC-${idx + 1}`,
          name_en: sv.en,
          name_ar: sv.ar,
          category: company.activity,
          description_en: `${sv.en} delivered by ${company.shortEn} with dedicated project management and SLA assurance.`,
          description_ar: `${sv.ar} مقدمة من ${company.shortAr} مع إدارة مشاريع مخصصة وضمان مستوى الخدمة.`,
          unit: sv.unit || "engagement",
          default_rate: sv.rate,
          is_active: true,
          display_order: idx + 1,
          is_public: company.hasWeb,
          image_url: `/api/files/media/banners/banner-0${(idx % 3) + 1}.png`,
          created_at: now,
          updated_at: now,
          is_sample: false,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Operational / Studio Equipment (10 items)
  const equipBrands = ["Sony", "Bosch", "Schneider", "Siemens", "Canon", "Honeywell", "Apple", "DJI", "Dell", "Caterpillar"];
  for (let i = 1; i <= 10; i++) {
    lines.push(
      ins(
        "system.studio_equipment",
        {
          id: `eq-${String(i).padStart(2, "0")}`,
          category: i <= 4 ? "Primary Operations" : i <= 7 ? "Field & Mobility" : "Support & Diagnostics",
          name_en: `${company.shortEn} ${equipBrands[i - 1]} Unit ${i}00`,
          name_ar: `معدة ${equipBrands[i - 1]} رقم ${i}00`,
          brand: equipBrands[i - 1],
          daily_rate_bhd: 15 + i * 7.5,
          quantity: (i % 4) + 1,
          specification: `Enterprise-grade ${company.activity} unit — calibrated 2026`,
          description_en: `Maintained operational asset assigned to ${company.shortEn} project teams.`,
          description_ar: `أصل تشغيلي معتمد ومخصص لفرق العمل في ${company.shortAr}.`,
          display_order: i,
          created_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Projects (8) & Contracts (8)
  const projectDepts = ["d-ops", "d-sales", "d-mkt", "d-fin"];
  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const owner = staffRoster[(i + 2) % staffRoster.length];
    lines.push(
      ins(
        "system.project",
        {
          id: `prj-${String(i).padStart(3, "0")}`,
          code: `${pfx}-PRJ-2026-${String(i).padStart(2, "0")}`,
          name: `${cust.nameEn} — ${svc.en}`,
          description: `End-to-end delivery for ${cust.nameEn} managed by ${company.shortEn}.`,
          status: i <= 3 ? "completed" : i <= 6 ? "active" : "planned",
          department_id: projectDepts[(i - 1) % projectDepts.length],
          owner_id: owner.id,
          color: company.theme.primary,
          start_date: dateAgo(55 - i * 5),
          due_date: dateAhead(10 + i * 7),
          created_by_id: "karim-fawzi",
          created_at: ago(55 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.contract",
        {
          id: `ctr-${String(i).padStart(3, "0")}`,
          contract_number: `${pfx}-CTR-2026-${String(i).padStart(2, "0")}`,
          deal_id: `deal-${i}`,
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          title_en: `Master Service Agreement — ${cust.nameEn}`,
          title_ar: `اتفاقية تقديم خدمات رئيسية — ${cust.nameAr}`,
          body_html: `<p>Agreement between ${company.nameEn} and ${cust.nameEn} for ${svc.en}.</p>`,
          status: i <= 6 ? "signed" : "pending_signature",
          signed_at: i <= 6 ? ago(35 - i * 4) : null,
          valid_from: dateAgo(60),
          valid_until: dateAhead(305),
          created_by_id: "omar-haddad",
          created_at: ago(40 - i * 4),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Announcements, HR Policy, Legal Matters, Media Contacts/Coverage, Canned Replies, Client Logos
  for (let i = 1; i <= 5; i++) {
    const annId = `ann-${String(i).padStart(2, "0")}`;
    lines.push(
      ins(
        "system.announcement",
        {
          id: annId,
          reference: `${pfx}-ANN-2026-0${i}`,
          title_en: `Q4 Operational & Compliance Update #${i}`,
          title_ar: `تحديث العمليات والامتثال للربع الرابع #${i}`,
          body_en: `All ${company.shortEn} department leads should review updated SLA targets and monthly close deadlines.`,
          body_ar: `يرجى من جميع رؤساء الأقسام في ${company.shortAr} مراجعة أهداف مستوى الخدمة ومواعيد الإقفال الشهري.`,
          category: i === 1 ? "policy" : "operations",
          priority: i === 1 ? "high" : "normal",
          audience: "all",
          official: true,
          requires_acknowledgement: i <= 2,
          pinned: i === 1,
          status: "published",
          publish_at: ago(20 - i * 3),
          published_at: ago(20 - i * 3),
          created_by_id: "omar-haddad",
          created_at: ago(20 - i * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.announcement_receipt",
        {
          announcement_id: annId,
          user_id: "yusuf-rahman",
          read_at: ago(15 - i * 2),
          acknowledged_at: i <= 2 ? ago(15 - i * 2) : null,
        },
        "",
      ),
    );
  }

  lines.push(
    ins(
      "system.hr_policy",
      {
        id: "default",
        salary_timing: "monthly",
        pay_day: 28,
        attendance_cutoff_day: 25,
        workday_hours: 8,
        workday_start: "08:00",
        daily_rate_basis: "calendar_30",
        deduction_base: "basic",
        overtime_base: "basic",
        overtime_rate: 1.25,
        overtime_night_rate: 1.5,
        overtime_rest_day_rate: 1.5,
        overtime_holiday_rate: 2.0,
        late_grace_minutes: 15,
        deduct_lateness: true,
        unmarked_days: "absent",
        prorate_joiners: true,
        commission_in_payroll: true,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  for (let i = 1; i <= 5; i++) {
    const matterId = `lgl-${String(i).padStart(2, "0")}`;
    lines.push(
      ins(
        "system.legal_matter",
        {
          id: matterId,
          number: `${pfx}-LGL-2026-0${i}`,
          title: i % 2 === 0 ? `Commercial Vendor NDA Review #${i}` : `Enterprise Client MSA Renewal #${i}`,
          kind: i % 2 === 0 ? "nda" : "contract",
          status: i <= 3 ? "active" : "closed",
          counterparty: customers[(i - 1) % customers.length].nameEn,
          next_date: dateAhead(10 + i * 5),
          assignee_id: "yusuf-rahman",
          amount_at_stake: 5000 * i,
          description: `Standard commercial legal review managed by ${company.shortEn}.`,
          created_by_id: "omar-haddad",
          created_at: ago(30 - i * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.legal_matter_event",
        {
          id: `lgle-${i}`,
          matter_id: matterId,
          kind: "note",
          body: "Initial legal terms verified against Bahrain Commercial Companies Law.",
          by_id: "yusuf-rahman",
          at: ago(25 - i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 6; i++) {
    lines.push(
      ins(
        "system.media_contact",
        {
          id: `mc-${i}`,
          name: ["Tariq Al-Jowder", "Mariam Al-Binali", "Hassan Al-Zayani", "Dana Al-Dossary", "Rashed Al-Mannai", "Sara Al-Qahtani"][i - 1],
          outlet: ["Gulf Business Daily", "Bahrain Tribune", "Al-Ayam Press", "Akhbar Al-Khaleej", "MENA Enterprise", "TechGulf"][i - 1],
          role: i % 2 === 0 ? "Senior Editor" : "Business Correspondent",
          beat: company.activity,
          email: `press${i}@media-network.bh`,
          phone: `+973398800${i}0`,
          is_active: true,
          created_at: ago(40),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.media_coverage",
        {
          id: `mcov-${i}`,
          title: `${company.shortEn} Expands ${company.city} Operations in 2026 (#${i})`,
          outlet: ["Gulf Business Daily", "Bahrain Tribune", "Al-Ayam Press", "Akhbar Al-Khaleej", "MENA Enterprise", "TechGulf"][i - 1],
          url: `https://news.example.bh/articles/${company.slug}-${i}`,
          published_on: dateAgo(i * 12),
          reach: 12000 * i,
          sentiment: "positive",
          created_by_id: "hana-yousef",
          created_at: ago(i * 12),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.canned_reply",
        {
          id: `cr-${i}`,
          title: ["Initial Inquiry Acknowledgement", "Quotation Follow-Up", "Invoice Payment Confirmation", "Delivery Schedule Update", "Support Ticket Escalation", "Project Kickoff Welcome"][i - 1],
          body_en: `Thank you for contacting ${company.shortEn}. Our specialist team is reviewing your request and will respond shortly.`,
          body_ar: `شكراً لتواصلكم مع ${company.shortAr}. يقوم فريقنا المختص بمراجعة طلبكم وسيتواصل معكم قريباً.`,
          is_active: true,
          sort_order: i,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "system.client_logo",
        {
          id: `clogo-${i}`,
          name: customers[(i - 1) % customers.length].nameEn,
          logo_url: "/api/files/brand/logo-dark.png",
          is_dark_logo: false,
          display_order: i,
          is_active: true,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 3. CMS (when hasWeb is true, plus base reviews/portfolio) ───────────────
  lines.push(``);
  lines.push(`-- CMS: ARTICLES, PORTFOLIO, REVIEWS, FAQS, STATISTICS & SOCIAL`);
  const portCats = [
    { id: "pcat-cms-1", slug: "flagship", en: "Flagship Projects", ar: "المشاريع الرئيسية" },
    { id: "pcat-cms-2", slug: "enterprise", en: "Enterprise Solutions", ar: "حلول المؤسسات" },
    { id: "pcat-cms-3", slug: "retainers", en: "Annual Retainers", ar: "العقود السنوية" },
    { id: "pcat-cms-4", slug: "regional", en: "Regional GCC", ar: "المشاريع الخليجية" },
  ];
  portCats.forEach((pc, idx) => {
    lines.push(
      ins(
        "cms.portfolio_category",
        { id: pc.id, slug: pc.slug, name_en: pc.en, name_ar: pc.ar, display_order: idx + 1 },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "cms.portfolio_item",
        {
          id: `port-${i}`,
          category_id: portCats[(i - 1) % portCats.length].id,
          slug: `${company.slug}-case-${i}`,
          title_en: `${cust.nameEn} — ${svc.en}`,
          title_ar: `${cust.nameAr} — ${svc.ar}`,
          client_name: cust.nameEn,
          year: 2026 - (i % 2),
          subtitle_en: `Delivered across ${company.city} with measurable ROI and strict quality benchmarks.`,
          subtitle_ar: `تم التنفيذ في ${company.city} وفق أعلى معايير الجودة والالتزام بالجدول الزمني.`,
          price: svc.rate * (i % 3 + 1),
          location: `${company.city}, Bahrain`,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.review",
        {
          id: `rev-${i}`,
          author_en: cust.contactEn || `Executive Director ${i}`,
          author_ar: `المدير التنفيذي ${i}`,
          company_en: cust.nameEn,
          company_ar: cust.nameAr,
          quote_en: `Working with ${company.shortEn} streamlined our operations and exceeded delivery expectations.`,
          quote_ar: `العمل مع ${company.shortAr} ساهم في رفع كفاءة عملياتنا وتجاوز توقعاتنا في التسليم.`,
          rating: i % 5 === 0 ? 4 : 5,
          is_approved: true,
          sort_order: i,
          year: 2026,
          created_at: ago(i * 7),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.article",
        {
          id: `art-${i}`,
          slug: `${company.slug}-insights-${i}`,
          title_en: `${company.shortEn} Industry Brief #${i}: ${svc.en}`,
          title_ar: `تقرير ${company.shortAr} التخصصي #${i}: ${svc.ar}`,
          excerpt_en: `Key operational benchmarks and best practices from ${company.shortEn} in ${company.city}.`,
          excerpt_ar: `أبرز المعايير التشغيلية وأفضل الممارسات من ${company.shortAr} في ${company.city}.`,
          body_en: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${company.aboutEn} Our ${svc.en} division helps regional organizations scale predictably with transparent SLAs and bilingual reporting.` }] }] },
          body_ar: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${company.aboutAr} يساعد قسم ${svc.ar} المؤسسات الإقليمية على النمو بثبات مع وضوح مستويات الخدمة والتقارير.` }] }] },
          body_html_en: `<p>${company.aboutEn}</p><p>Our ${svc.en} division helps regional organizations scale predictably with transparent SLAs and bilingual reporting.</p>`,
          body_html_ar: `<p>${company.aboutAr}</p><p>يساعد قسم ${svc.ar} المؤسسات الإقليمية على النمو بثبات مع وضوح مستويات الخدمة والتقارير.</p>`,
          category: company.activity,
          tags: [company.activity, company.city, "2026"],
          author_name: "Hana Yousef",
          status: company.hasWeb ? "published" : "draft",
          publish_at: ago(i * 9),
          featured: i <= 2,
          created_at: ago(i * 9),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.faq",
        {
          id: `faq-${i}`,
          question_en: [
            `How do we engage ${company.shortEn} for a new project?`,
            `What is the typical turnaround time for ${svc.en}?`,
            `Do you support bilingual (Arabic & English) documentation?`,
            `What payment terms and VAT invoicing apply?`,
            `Can we schedule an on-site consultation in ${company.city}?`,
            `Do you offer annual SLA retainers?`,
            `How are deliverables approved and signed off?`,
            `Who is our dedicated account manager?`,
          ][i - 1],
          question_ar: [
            `كيف يمكننا البدء بمشروع جديد مع ${company.shortAr}؟`,
            `ما هي المدة المعتادة لتنفيذ ${svc.ar}؟`,
            `هل توفرون تقارير ووثائق باللغتين العربية والإنجليزية؟`,
            `ما هي شروط الدفع والفوترة الضريبية؟`,
            `هل يمكن حجز استشارة ميدانية في ${company.city}؟`,
            `هل تتوفر عقود صيانة وتشغيل سنوية؟`,
            `كيف يتم اعتماد المخرجات والتوقيع عليها؟`,
            `من هو مدير الحساب المخصص لمتابعة طلبنا؟`,
          ][i - 1],
          answer_en: `Contact ${company.shortEn} at ${company.email} or submit an inquiry online; our team responds within one business day.`,
          answer_ar: `يمكنكم التواصل عبر ${company.email} أو إرسال طلب إلكتروني وسيرد فريق ${company.shortAr} خلال يوم عمل واحد.`,
          category: "general",
          is_published: company.hasWeb,
          sort_order: i,
          created_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const platforms = ["instagram", "linkedin", "youtube"];
  platforms.forEach((pl, idx) => {
    lines.push(
      ins(
        "cms.social_link",
        {
          id: `soc-${pl}`,
          platform: pl,
          url: `https://${pl}.com/${company.slug}`,
          icon: pl,
          is_active: true,
          display_order: idx + 1,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.social_metric",
        {
          id: `smet-${pl}`,
          platform: pl,
          metric_type: "followers",
          value: 4200 + idx * 1850,
          source_provider: pl,
          source_account_id: company.slug,
          recorded_at: ago(1),
          is_stale: false,
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 6; i++) {
    const pl = platforms[(i - 1) % platforms.length];
    lines.push(
      ins(
        "cms.social_post",
        {
          id: `spost-${i}`,
          platform: pl,
          external_id: `${company.slug}-${pl}-${i}`,
          source_provider: pl,
          source_account_id: company.slug,
          caption: `${company.shortEn} highlights: ${svcList[(i - 1) % svcList.length].en} in ${company.city}.`,
          media_type: i % 2 === 0 ? "carousel" : "image",
          permalink: `https://${pl}.com/p/${company.slug}-${i}`,
          published_at: ago(i * 4),
          likes: 120 + i * 35,
          comments: 8 + i * 3,
          shares: 14 + i * 2,
          views: 1800 + i * 420,
          reach: 1500 + i * 350,
          saves: 22 + i * 4,
          fetched_at: now,
          created_at: ago(i * 4),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.social_content_plan",
        {
          id: `scplan-${i}`,
          title: `${company.shortEn} Campaign Post #${i}`,
          caption: `Discover how ${company.shortEn} delivers ${svcList[(i - 1) % svcList.length].en}.`,
          scheduled_for: ahead(i * 3),
          status: i <= 2 ? "published" : "scheduled",
          assignee_id: "hana-yousef",
          created_by_id: "hana-yousef",
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 4. SALES & CRM ──────────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- SALES: PIPELINE STAGES, CRM CONTACTS, DEALS, INQUIRIES, QUOTATIONS & CAMPAIGNS`);
  const stages = [
    { id: "stg-lead", en: "New Lead", ar: "عميل محتمل", prob: 10, ord: 1, kind: "open" },
    { id: "stg-new", en: "Qualified", ar: "مؤهل", prob: 25, ord: 2, kind: "open" },
    { id: "stg-prop", en: "Proposal Sent", ar: "عرض سعر", prob: 50, ord: 3, kind: "open" },
    { id: "stg-neg", en: "Negotiation", ar: "تفاوض", prob: 80, ord: 4, kind: "open" },
    { id: "stg-won", en: "Closed Won", ar: "مغلق ناجح", prob: 100, ord: 5, kind: "won" },
    { id: "stg-lost", en: "Closed Lost", ar: "مغلق خاسر", prob: 0, ord: 6, kind: "lost" },
  ];
  for (const st of stages) {
    lines.push(
      ins(
        "sales.deal_pipeline_stage",
        {
          id: st.id,
          name_en: st.en,
          name_ar: st.ar,
          probability: st.prob,
          sort_order: st.ord,
          kind: st.kind,
          is_system: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  customers.forEach((c, idx) => {
    const [cfEn, ...clEn] = c.nameEn.split(" ");
    const clName = clEn.join(" ") || "Group";
    lines.push(
      ins(
        "commerce.customer",
        {
          id: c.id,
          first_name: cfEn,
          last_name: clName,
          name: c.nameEn,
          email: c.email,
          phone: c.phone,
          status: "active",
          created_at: ago(60 - idx * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.customer_address",
        {
          id: `addr-${idx + 1}`,
          customer_id: c.id,
          label: "HQ",
          line1: "Building 120, Road 28",
          city: c.city,
          country: "BH",
          is_default: true,
          created_at: ago(60 - idx * 3),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "sales.contact",
        {
          id: `cnt-${idx + 1}`,
          first_name: cfEn,
          last_name: clName,
          email: c.email,
          phone: c.phone,
          company: c.nameEn,
          contact_type: idx >= 8 ? "supplier" : "client",
          status: "active",
          created_at: ago(60 - idx * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "sales.crm_contact",
        {
          id: `cnt-${idx + 1}`,
          first_name: cfEn,
          last_name: clName,
          email: c.email,
          email_norm: c.email.toLowerCase(),
          phone: c.phone,
          phone_e164: c.phone,
          company_name: c.nameEn,
          company_name_ar: c.nameAr,
          contact_type: idx >= 8 ? "supplier" : "client",
          client_kind: "company",
          preferred_language: "ar",
          payment_terms_days: 30,
          address_country: "BH",
          address_city: c.city,
          created_at: ago(60 - idx * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const suppliers = [
    { id: "cnt-9", firstEn: "Khalid", lastEn: "Al-Doseri", email: "sales@gulfequipment.bh", phone: "+97317410099", companyEn: "Gulf Equipment Suppliers W.L.L.", companyAr: "شركة الخليج لتوريد المعدات ذ.م.م", city: "Salmabad" },
    { id: "cnt-10", firstEn: "Mariam", lastEn: "Al-Binali", email: "dispatch@manamalogistics.bh", phone: "+97317420088", companyEn: "Manama Industrial Logistics Co.", companyAr: "شركة المنامة للخدمات اللوجستية الصناعية", city: "Hidd" },
  ];
  for (const sup of suppliers) {
    lines.push(
      ins(
        "sales.contact",
        {
          id: sup.id,
          first_name: sup.firstEn,
          last_name: sup.lastEn,
          email: sup.email,
          phone: sup.phone,
          company: sup.companyEn,
          contact_type: "supplier",
          status: "active",
          created_at: ago(75),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "sales.crm_contact",
        {
          id: sup.id,
          first_name: sup.firstEn,
          last_name: sup.lastEn,
          email: sup.email,
          email_norm: sup.email.toLowerCase(),
          phone: sup.phone,
          phone_e164: sup.phone,
          company_name: sup.companyEn,
          company_name_ar: sup.companyAr,
          contact_type: "supplier",
          client_kind: "company",
          preferred_language: "en",
          payment_terms_days: 30,
          address_country: "BH",
          address_city: sup.city,
          created_at: ago(75),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Sales Catalog Projection (Services & Products for Quotation line-item dropdowns)
  svcList.forEach((sv, idx) => {
    lines.push(
      ins(
        "sales.catalog_item_ref",
        {
          kind: "service",
          id: `svc-${idx + 1}`,
          variant_id: "",
          sku: sv.code || `${pfx}-SVC-${idx + 1}`,
          name_en: sv.en,
          name_ar: sv.ar,
          unit: sv.unit || "engagement",
          unit_price: sv.rate,
          currency: cur,
          tax_rate: 10.0,
          is_active: true,
          updated_at: now,
        },
        "ON CONFLICT (kind, id, variant_id) DO NOTHING",
      ),
    );
  });
  prodList.forEach((p, idx) => {
    lines.push(
      ins(
        "sales.catalog_item_ref",
        {
          kind: "product",
          id: `prod-${idx + 1}`,
          variant_id: "",
          sku: p.sku,
          name_en: p.en,
          name_ar: p.ar,
          unit: "unit",
          unit_price: p.price,
          currency: cur,
          tax_rate: 10.0,
          is_active: true,
          updated_at: now,
        },
        "ON CONFLICT (kind, id, variant_id) DO NOTHING",
      ),
    );
  });

  // 18 Deals + 14 Inquiries + 14 Quotations (28 line items) + 8 Campaigns
  for (let i = 1; i <= 18; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const svc2 = svcList[i % svcList.length];
    const stage = i <= 8 ? "stg-won" : i <= 12 ? "stg-prop" : i <= 16 ? "stg-neg" : "stg-new";
    const val = svc.rate * ((i % 4) + 1);
    const dealId = `deal-${i}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    lines.push(
      ins(
        "sales.deal",
        {
          id: dealId,
          title: `${cust.nameEn} — ${svc.en}`,
          contact_id: contactId,
          stage,
          pipeline_stage_id: stage,
          value: val,
          currency: cur,
          probability: i <= 8 ? 100 : i <= 12 ? 50 : 80,
          expected_close_date: dateAhead(i * 3),
          status: i <= 8 ? "won" : "open",
          assigned_to: "sami-khoury",
          created_at: ago(Math.max(2, 62 - i * 3)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "sales.crm_deal",
        {
          id: dealId,
          contact_id: contactId,
          title: `${cust.nameEn} — ${svc.en}`,
          deal_stage: stage,
          deal_value: val,
          currency: cur,
          probability: i <= 8 ? 100 : 50,
          expected_close_date: dateAhead(i * 3),
          assigned_to: "sami-khoury",
          created_at: ago(Math.max(2, 62 - i * 3)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 14) {
      const inqId = `inq-${i}`;
      lines.push(
        ins(
          "sales.inquiry",
          {
            id: inqId,
            inquiry_type: "proposal",
            subject: `Request for Proposal: ${svc.en}`,
            message: `Hello ${company.shortEn}, we would like a formal quotation for ${svc.en} for our ${cust.city} branch.`,
            status: i <= 8 ? "converted" : i <= 11 ? "in_review" : "new",
            priority: i <= 4 ? "high" : "normal",
            requester_name: cust.nameEn,
            requester_email: cust.email,
            requester_phone: cust.phone,
            assignee_id: "sami-khoury",
            deal_id: dealId,
            created_at: ago(Math.max(2, 65 - i * 4)),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      const qId = `qt-${String(i).padStart(3, "0")}`;
      const item2Rate = Number((svc2.rate * 0.5).toFixed(3));
      const sub = Number((val + item2Rate).toFixed(3));
      const vat = Number((sub * 0.1).toFixed(3));
      const tot = Number((sub + vat).toFixed(3));
      lines.push(
        ins(
          "sales.quotation",
          {
            id: qId,
            quotation_number: `${pfx}-QT-2026-${200 + i}`,
            deal_id: dealId,
            contact_id: contactId,
            client_id: contactId,
            inquiry_id: inqId,
            invoice_id: `inv-${String(i).padStart(3, "0")}`,
            status: i <= 8 ? "accepted" : "sent",
            subtotal: sub,
            vat_rate: 10.0,
            vat_amount: vat,
            total: tot,
            total_amount: tot,
            currency: cur,
            valid_until: ahead(30),
            issue_date: dateAgo(Math.max(2, 58 - i * 3)),
            valid_until_date: dateAhead(30),
            vat_enabled: true,
            vat_percentage: 10.0,
            language: i % 3 === 0 ? "ar" : "en",
            created_by_id: "sami-khoury",
            sales_owner_id: "sami-khoury",
            created_at: ago(Math.max(2, 58 - i * 3)),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "sales.quotation_item",
          {
            id: `qti-${i}-1`,
            quotation_id: qId,
            description: svc.en,
            quantity: (i % 4) + 1,
            unit_price: svc.rate,
            amount: val,
            sort_order: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "sales.quotation_item",
          {
            id: `qti-${i}-2`,
            quotation_id: qId,
            description: `${svc2.en} — Advisory & Mobilization`,
            quantity: 1,
            unit_price: item2Rate,
            amount: item2Rate,
            sort_order: 2,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "sales.quotation_line_item",
          {
            id: `qtli-${i}-1`,
            quotation_id: qId,
            description_en: svc.en,
            description_ar: svc.ar,
            quantity: (i % 4) + 1,
            unit_price: svc.rate,
            line_total: val,
            order_index: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "sales.quotation_line_item",
          {
            id: `qtli-${i}-2`,
            quotation_id: qId,
            description_en: `${svc2.en} — Advisory & Mobilization`,
            description_ar: `${svc2.ar} — الاستشارة والتجهيز`,
            quantity: 1,
            unit_price: item2Rate,
            line_total: item2Rate,
            order_index: 2,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  const campaignTitles = [
    "Q3 Enterprise Outreach",
    "Flagship Service Launch",
    "Ramadan & Eid Partner Drive",
    "GCC Expansion Roadshow",
    "Annual Retainer Renewal",
    "Q4 Growth Acceleration",
    "Sector VIP Roundtable",
    "Year-End Procurement Brief",
  ];
  for (let i = 1; i <= 8; i++) {
    lines.push(
      ins(
        "sales.campaign",
        {
          id: `cmp-${i}`,
          name: `${company.shortEn} ${campaignTitles[i - 1]}`,
          subject: `Partner with ${company.shortEn} for ${svcList[(i - 1) % svcList.length].en}`,
          body: `Explore ${company.shortEn}'s enterprise capabilities and dedicated local support.`,
          status: i <= 5 ? "sent" : "draft",
          sent_at: i <= 5 ? ago(i * 12) : null,
          code: `${pfx}-CMP-${String(i).padStart(2, "0")}`,
          channel: i % 2 === 0 ? "email" : "linkedin",
          start_date: dateAgo(i * 14),
          end_date: dateAhead(30),
          budget: 800 * i,
          spend: 450 * i,
          utm_campaign: `${company.slug}_c${i}`,
          owner_id: "hana-yousef",
          created_by_id: "hana-yousef",
          created_at: ago(i * 14),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 5. FINANCE ──────────────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- FINANCE: INVOICES, PAYMENTS, EXPENSES, CLAIMS, BILLS & JOURNAL ENTRIES`);
  const expCats = [
    { id: "ec-ops", code: "OPS", en: "Operations", ar: "تشغيل", slug: "operations" },
    { id: "ec-rent", code: "RNT", en: "Facility & Rent", ar: "إيجارات ومرافق", slug: "facility-rent" },
    { id: "ec-tech", code: "TCH", en: "Software & Cloud", ar: "برمجيات وسحابة", slug: "software-cloud" },
    { id: "ec-mkt", code: "MKT", en: "Marketing & PR", ar: "تسويق وعلاقات عامة", slug: "marketing-pr" },
    { id: "ec-trv", code: "TRV", en: "Travel & Fleet", ar: "سفر وأسطول", slug: "travel-fleet" },
    { id: "ec-util", code: "UTL", en: "Utilities & Telecom", ar: "كهرباء واتصالات", slug: "utilities" },
  ];
  expCats.forEach((ec, idx) => {
    lines.push(
      ins(
        "finance.expense_category",
        {
          id: ec.id,
          code: ec.code,
          name_en: ec.en,
          name_ar: ec.ar,
          slug: ec.slug,
          sort_order: idx + 1,
          display_order: idx + 1,
          kind: "expense",
          is_system: true,
          is_active: true,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const payMethods = [
    { id: "pm-bank", code: "bank_transfer", en: "Bank Transfer", ar: "تحويل بنكي" },
    { id: "pm-card", code: "card", en: "Credit / Debit Card", ar: "بطاقة بنكية" },
    { id: "pm-benefit", code: "benefitpay", en: "BenefitPay", ar: "بنفت باي" },
    { id: "pm-cash", code: "cash", en: "Cash", ar: "نقداً" },
    { id: "pm-cheque", code: "cheque", en: "Corporate Cheque", ar: "شيك" },
  ];
  payMethods.forEach((pm, idx) => {
    lines.push(
      ins(
        "finance.payment_method_config",
        {
          id: pm.id,
          branch_id: "br-hq",
          code: pm.code,
          name_en: pm.en,
          name_ar: pm.ar,
          is_enabled: true,
          allow_change: pm.code === "cash",
          requires_reference: pm.code !== "cash",
          surcharge_rate: 0,
          sort_order: idx + 1,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Finance Cross-Service Projections: Catalog Items, Contacts & Quotations (for Invoicing Pickers)
  svcList.forEach((sv, idx) => {
    lines.push(
      ins(
        "finance.catalog_item_ref",
        {
          kind: "service",
          id: `svc-${idx + 1}`,
          variant_id: "",
          sku: sv.code || `${pfx}-SVC-${idx + 1}`,
          name_en: sv.en,
          name_ar: sv.ar,
          unit: sv.unit || "engagement",
          unit_price: sv.rate,
          currency: cur,
          tax_rate: 10.0,
          is_active: true,
          updated_at: now,
        },
        "ON CONFLICT (kind, id, variant_id) DO NOTHING",
      ),
    );
  });
  prodList.forEach((p, idx) => {
    lines.push(
      ins(
        "finance.catalog_item_ref",
        {
          kind: "product",
          id: `prod-${idx + 1}`,
          variant_id: "",
          sku: p.sku,
          name_en: p.en,
          name_ar: p.ar,
          unit: "unit",
          unit_price: p.price,
          currency: cur,
          tax_rate: 10.0,
          is_active: true,
          updated_at: now,
        },
        "ON CONFLICT (kind, id, variant_id) DO NOTHING",
      ),
    );
  });
  customers.forEach((c, idx) => {
    const [cfEn, ...clEn] = c.nameEn.split(" ");
    lines.push(
      ins(
        "finance.contact_ref",
        {
          id: `cnt-${idx + 1}`,
          first_name: cfEn,
          last_name: clEn.join(" ") || "Group",
          company: c.nameEn,
          email: c.email,
          phone: c.phone,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (const sup of suppliers) {
    lines.push(
      ins(
        "finance.contact_ref",
        {
          id: sup.id,
          first_name: sup.firstEn,
          last_name: sup.lastEn,
          company: sup.companyEn,
          email: sup.email,
          phone: sup.phone,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 14; i++) {
    const svc = svcList[(i - 1) % svcList.length];
    const svc2 = svcList[i % svcList.length];
    const val = svc.rate * ((i % 4) + 1);
    const item2Rate = Number((svc2.rate * 0.5).toFixed(3));
    const sub = Number((val + item2Rate).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    lines.push(
      ins(
        "finance.quotation_ref",
        {
          id: `qt-${String(i).padStart(3, "0")}`,
          quotation_number: `${pfx}-QT-2026-${200 + i}`,
          deal_id: `deal-${i}`,
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          currency: cur,
          subtotal: sub,
          discount: 0,
          vat_rate: 10.0,
          vat_amount: vat,
          total: tot,
          status: i <= 8 ? "accepted" : "sent",
          items: [
            { description: svc.en, quantity: (i % 4) + 1, unitPrice: svc.rate, amount: val },
            { description: `${svc2.en} — Advisory & Mobilization`, quantity: 1, unitPrice: item2Rate, amount: item2Rate },
          ],
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // 24 Invoices spanning past 161 days -> 1 day + line items + payments + allocations
  for (let i = 1; i <= 24; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const svc2 = svcList[i % svcList.length];
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const invNum = `${pfx}-2026-${100 + i}`;
    const daysBack = Math.max(1, 168 - i * 7);
    const qty1 = (i % 3) + 1;
    const qty2 = 1;
    const line1 = Number((svc.rate * qty1).toFixed(3));
    const line2 = Number((svc2.rate * 0.4).toFixed(3));
    const sub = Number((line1 + line2).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const isPaid = i <= 18;
    const paid = isPaid ? tot : i <= 20 ? Number((tot * 0.5).toFixed(3)) : 0;
    const bal = Number((tot - paid).toFixed(3));
    const status = isPaid ? "paid" : i <= 20 ? "partially_paid" : "sent";
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const dealRefId = `deal-${((i - 1) % 18) + 1}`;
    const qtRefId = i <= 14 ? `qt-${String(i).padStart(3, "0")}` : null;

    lines.push(
      ins(
        "finance.invoice",
        {
          id: invId,
          invoice_number: invNum,
          quotation_id: qtRefId,
          contact_id: contactId,
          client_id: contactId,
          deal_id: dealRefId,
          status,
          issue_date: dateAgo(daysBack),
          due_date: dateAgo(Math.max(0, daysBack - 30)),
          subtotal: sub,
          vat_rate: 10.0,
          vat_amount: vat,
          total: tot,
          total_amount: tot,
          amount_paid: paid,
          balance_due: bal,
          currency: cur,
          vat_enabled: true,
          vat_percentage: 10.0,
          language: i % 3 === 0 ? "ar" : "en",
          approval_status: "approved",
          created_by_id: "layla-nasser",
          sales_owner_id: "sami-khoury",
          created_at: ago(daysBack),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.invoice_item",
        {
          id: `invi-${i}-1`,
          invoice_id: invId,
          description: svc.en,
          quantity: qty1,
          unit_price: svc.rate,
          amount: line1,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.invoice_item",
        {
          id: `invi-${i}-2`,
          invoice_id: invId,
          description: `${svc2.en} — Setup & Support`,
          quantity: qty2,
          unit_price: line2,
          amount: line2,
          sort_order: 2,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.invoice_line_item",
        {
          id: `invli-${i}-1`,
          invoice_id: invId,
          service_id: `svc-${((i - 1) % svcList.length) + 1}`,
          description_en: svc.en,
          description_ar: svc.ar,
          quantity: qty1,
          unit_price: svc.rate,
          line_total: line1,
          display_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.invoice_line_item",
        {
          id: `invli-${i}-2`,
          invoice_id: invId,
          service_id: `svc-${(i % svcList.length) + 1}`,
          description_en: `${svc2.en} — Setup & Support`,
          description_ar: `${svc2.ar} — التجهيز والدعم`,
          quantity: qty2,
          unit_price: line2,
          line_total: line2,
          display_order: 2,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (paid > 0) {
      const payId = `pay-${String(i).padStart(3, "0")}`;
      lines.push(
        ins(
          "finance.payment",
          {
            id: payId,
            payment_number: `PAY-${pfx}-${100 + i}`,
            invoice_id: invId,
            contact_id: contactId,
            amount: paid,
            currency: cur,
            payment_method: i % 3 === 0 ? "benefitpay" : "bank_transfer",
            payment_date: dateAgo(Math.max(0, daysBack - 5)),
            reference: `TXN-${pfx}-${1000 + i}`,
            receipt_number: `RCT-${pfx}-${100 + i}`,
            status: "completed",
            created_by_id: "faisal-mansour",
            created_at: ago(Math.max(0, daysBack - 5)),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "finance.payment_allocation",
          {
            id: `palloc-${i}`,
            payment_id: payId,
            invoice_id: invId,
            allocated_amount: paid,
            currency: cur,
            allocated_at: ago(Math.max(0, daysBack - 5)),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // 16 Expenses + 8 Expense Claims + 6 Recurring Expenses + 6 Supplier Bills + 10 Journal Entries
  for (let i = 1; i <= 16; i++) {
    const cat = expCats[(i - 1) % expCats.length];
    const amt = Number((45 + i * 32.5).toFixed(3));
    const vat = Number((amt * 0.1 / 1.1).toFixed(3));
    const net = Number((amt - vat).toFixed(3));
    lines.push(
      ins(
        "finance.expense",
        {
          id: `exp-${String(i).padStart(3, "0")}`,
          title: `${cat.en} — ${["Batelco Fiber", "NBB Facility Lease", "Cloud Infrastructure", "AWS & Backups", "Office Supplies", "Fleet Fuel", "Digital Ads", "Equipment Service"][i % 8]} (#${i})`,
          category_id: cat.id,
          amount: amt,
          net_amount: net,
          input_vat_amount: vat,
          is_vat_recoverable: true,
          currency: cur,
          expense_date: dateAgo(i * 6),
          status: i <= 13 ? "approved" : "pending",
          vendor: ["Batelco Business", "Seef Properties", "Amazon Web Services", "Zain Bahrain", "Gulf Office Depot", "Bapco Stations"][i % 6],
          vendor_name: ["Batelco Business", "Seef Properties", "Amazon Web Services", "Zain Bahrain", "Gulf Office Depot", "Bapco Stations"][i % 6],
          payment_method: "bank_transfer",
          created_by: "faisal-mansour",
          created_by_id: "faisal-mansour",
          approved_by: i <= 13 ? "layla-nasser" : null,
          created_at: ago(i * 6),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const staff = staffRoster[i % staffRoster.length];
    lines.push(
      ins(
        "finance.expense_claim",
        {
          id: `ecl-${String(i).padStart(3, "0")}`,
          claim_number: `${pfx}-CLM-2026-0${i}`,
          claimant_id: staff.id,
          amount: Number((18 + i * 9.5).toFixed(3)),
          currency: cur,
          expense_date: dateAgo(i * 5),
          reason: `Client meeting & field logistics reimbursement (#${i})`,
          category_id: expCats[(i - 1) % expCats.length].id,
          deal_id: `deal-${i}`,
          invoice_id: `inv-${String(i).padStart(3, "0")}`,
          calendar_event_id: `cal-${String(i).padStart(3, "0")}`,
          expense_id: `exp-${String(i).padStart(3, "0")}`,
          status: i <= 5 ? "paid" : "pending",
          paid_at: i <= 5 ? ago(i * 3) : null,
          paid_by_id: i <= 5 ? "faisal-mansour" : null,
          created_at: ago(i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 6; i++) {
    lines.push(
      ins(
        "finance.recurring_expense",
        {
          id: `rexp-${i}`,
          title_en: ["HQ Office Lease", "Enterprise Cloud Hosting", "Fiber & SIP Trunks", "Accounting & ERP Suite", "Fleet Maintenance", "Commercial Insurance"][i - 1],
          title_ar: ["إيجار المقر الرئيسي", "استضافة السحابة", "خطوط الألياف والاتصالات", "أنظمة المحاسبة", "صيانة الأسطول", "التأمين التجاري"][i - 1],
          category_id: expCats[(i - 1) % expCats.length].id,
          vendor_name: ["Seef Properties", "AWS EMEA", "Batelco", "Zain Cloud", "Al-Ahlia Motors", "Bahrain National Insurance"][i - 1],
          amount: 120 * i,
          input_vat_amount: Number((120 * i * 0.1).toFixed(3)),
          is_vat_recoverable: true,
          currency: cur,
          payment_method: "bank_transfer",
          frequency: "monthly",
          start_date: dateAgo(180),
          next_due_date: dateAhead(5 + i * 3),
          auto_record: true,
          is_active: true,
          created_by_id: "layla-nasser",
          created_at: ago(180),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 4; i++) {
    lines.push(
      ins(
        "finance.bank_settlement",
        {
          id: `bset-${i}`,
          settlement_number: `${pfx}-SET-2026-0${i}`,
          bank_account: companyJson.company.bankIban,
          amount: 2500 + i * 850,
          currency: cur,
          settled_at: ago(i * 28),
          status: "reconciled",
          notes: `Monthly NBB statement reconciliation #${i}`,
          created_at: ago(i * 28),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 10; i++) {
    const jeId = `je-${String(i).padStart(3, "0")}`;
    const amt = Number((300 + i * 115).toFixed(3));
    lines.push(
      ins(
        "finance.journal_entry",
        {
          id: jeId,
          source_key: `seed:je:${i}`,
          request_hash: `hash-${pfx}-je-${i}`,
          period_id: i <= 7 ? "per-2026-10" : "per-2026-11",
          posting_date: dateAgo(i * 4),
          currency: cur,
          memo: `Posted invoice & settlement recognition #${i}`,
          branch_id: "br-hq",
          created_by_id: "faisal-mansour",
          created_at: ago(i * 4),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.journal_line",
        { id: `jel-${i}-d`, entry_id: jeId, account_id: "acc-1000", debit: amt, credit: 0, memo: "Bank receipt" },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.journal_line",
        { id: `jel-${i}-c`, entry_id: jeId, account_id: "acc-4000", debit: 0, credit: amt, memo: "Operating revenue" },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Commission Rules & Payouts + Supplier Bills & Payments
  for (const cr of [
    { id: "crule-std", code: "STD-5", name: "Standard Sales Commission (5%)", rate: 5.0 },
    { id: "crule-ent", code: "ENT-75", name: "Enterprise Retainer Bonus (7.5%)", rate: 7.5 },
    { id: "crule-ren", code: "REN-3", name: "Annual Contract Renewal (3%)", rate: 3.0 },
  ]) {
    lines.push(
      ins(
        "finance.commission_rule",
        { id: cr.id, code: cr.code, name: cr.name, rate: cr.rate, effective_from: "2026-01-01", version: 1, is_active: true, created_at: ago(180) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  [7, 8, 9, 10].forEach((m, idx) => {
    const owner = idx % 2 === 0 ? "sami-khoury" : "hana-yousef";
    const basis = Number((primarySvc.rate * (3 + idx)).toFixed(3));
    const rate = idx % 2 === 0 ? 5.0 : 3.0;
    const amt = Number(((basis * rate) / 100).toFixed(3));
    lines.push(
      ins(
        "finance.commission_payout",
        {
          id: `cpay-2026-${m}`,
          user_id: owner,
          period_month: `2026-${String(m).padStart(2, "0")}`,
          basis_amount: basis,
          rate_percent: rate,
          amount: amt,
          currency: cur,
          expense_id: `exp-${String(idx + 1).padStart(3, "0")}`,
          payroll_item_id: `pi-prun-2026-${String(m).padStart(2, "0")}-${owner}`,
          recorded_by_id: "layla-nasser",
          created_at: ago((11 - m) * 28),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 4; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const sub = Number((p.cost * 8).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const billId = `sbill-${String(i).padStart(3, "0")}`;
    lines.push(
      ins(
        "finance.supplier_bill",
        {
          id: billId,
          number: `${pfx}-BILL-2026-0${i}`,
          supplier_ref: `SUP-INV-${400 + i}`,
          supplier_id: `cnt-${9 + (i % 2)}`,
          purchase_order_id: i <= 3 ? `po-00${i}` : null,
          bill_date: dateAgo(28 - i * 5),
          due_date: dateAhead(i * 5),
          status: i <= 2 ? "paid" : "approved",
          subtotal: sub,
          vat_amount: vat,
          total: tot,
          amount_paid: i <= 2 ? tot : 0,
          expense_id: `exp-${String(i).padStart(3, "0")}`,
          note: `Supplier invoice for ${p.en}`,
          created_by_id: "faisal-mansour",
          approved_by_id: "layla-nasser",
          approved_at: ago(26 - i * 5),
          created_at: ago(28 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.supplier_bill_line",
        { id: `sbl-${i}-1`, bill_id: billId, order_line_id: i <= 3 ? `pol-00${i}-1` : null, description: p.en, quantity: 8, unit_price: p.cost, sort_order: 1 },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 2) {
      lines.push(
        ins(
          "finance.supplier_payment",
          { id: `spay-${i}`, bill_id: billId, amount: tot, paid_on: dateAgo(20 - i * 5), method: "bank_transfer", reference: `WIRE-${pfx}-${700 + i}`, created_by_id: "faisal-mansour", created_at: ago(20 - i * 5) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 6. HR & PAYROLL ─────────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- HR: DEPARTMENTS, EMPLOYEES, ATTENDANCE, LEAVES & PAYROLL RUNS`);
  const depts = [
    { id: "d-exec", code: "EXEC", en: "Executive", ar: "الإدارة التنفيذية" },
    { id: "d-fin", code: "FIN", en: "Finance", ar: "المالية" },
    { id: "d-ops", code: "OPS", en: "Operations", ar: "العمليات" },
    { id: "d-sales", code: "SLS", en: "Sales", ar: "المبيعات" },
    { id: "d-mkt", code: "MKT", en: "Marketing", ar: "التسويق" },
    { id: "d-it", code: "IT", en: "IT & Systems", ar: "تقنية المعلومات" },
  ];
  depts.forEach((d, idx) => {
    lines.push(
      ins(
        "hr.department",
        { id: d.id, code: d.code, name_en: d.en, name_ar: d.ar, sort_order: idx + 1, is_active: true, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const shifts = [
    { id: "shf-morning", code: "MORN", en: "Morning Shift (08:00-16:00)", ar: "الفترة الصباحية" },
    { id: "shf-evening", code: "EVE", en: "Evening Shift (14:00-22:00)", ar: "الفترة المسائية" },
    { id: "shf-flex", code: "FLEX", en: "Flexible Core Hours", ar: "ساعات مرنة" },
  ];
  for (const sh of shifts) {
    lines.push(
      ins(
        "hr.shift_type",
        { id: sh.id, code: sh.code, name_en: sh.en, name_ar: sh.ar, allowance_mode: "none", allowance_value: 0, is_active: true },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const leaveTypes = [
    { id: "lt-annual", code: "ANN", en: "Annual Leave", ar: "إجازة سنوية", days: 30, paid: true, pct: 100 },
    { id: "lt-sick", code: "SCK", en: "Sick Leave", ar: "إجازة مرضية", days: 15, paid: true, pct: 100 },
    { id: "lt-emerg", code: "EMG", en: "Emergency Leave", ar: "إجازة طارئة", days: 5, paid: true, pct: 100 },
    { id: "lt-unpaid", code: "UNP", en: "Unpaid Leave", ar: "إجازة بدون راتب", days: 30, paid: false, pct: 0 },
  ];
  for (const lt of leaveTypes) {
    lines.push(
      ins(
        "hr.leave_type",
        { id: lt.id, code: lt.code, name_en: lt.en, name_ar: lt.ar, days_allowed_per_year: lt.days, is_paid: lt.paid, pay_percent: lt.pct },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Identity projection + Leave Balances + Recurring Pay + Attendance (12d x 9 = 108) + Leave Requests (18) + Handovers + Payroll (4 x 9 = 36)
  for (const s of staffRoster) {
    const sIdx = staffRoster.indexOf(s);
    lines.push(
      ins(
        "hr.identity_user_ref",
        {
          subject_id: s.id,
          realm: "staff",
          display_name: s.nameEn,
          email: `${s.id}@${domainHost}`,
          status: "active",
          employee_id: s.id,
          updated_at: now,
        },
        "ON CONFLICT (subject_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.leave_balance",
        {
          id: `lb-${s.id}-ann-2026`,
          employee_id: s.id,
          leave_type_id: "lt-annual",
          leave_type: "annual",
          year: 2026,
          entitled_days: 30,
          used_days: sIdx < 6 && sIdx % 3 !== 0 ? 3 : 0,
          remaining_days: sIdx < 6 && sIdx % 3 !== 0 ? 27 : 30,
          updated_at: now,
        },
        "ON CONFLICT DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.leave_balance",
        {
          id: `lb-${s.id}-sck-2026`,
          employee_id: s.id,
          leave_type_id: "lt-sick",
          leave_type: "sick",
          year: 2026,
          entitled_days: 15,
          used_days: sIdx < 6 && sIdx % 3 === 0 ? 3 : 0,
          remaining_days: sIdx < 6 && sIdx % 3 === 0 ? 12 : 15,
          updated_at: now,
        },
        "ON CONFLICT DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_recurring_pay",
        {
          id: `recpay-${s.id}-housing`,
          employee_id: s.id,
          kind: "allowance",
          category: "housing",
          label: "Housing Allowance",
          amount: Number((s.salary * 0.1).toFixed(3)),
          start_month: "2026-01",
          is_active: true,
          note: "Standard employment contract housing allowance",
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_recurring_pay",
        {
          id: `recpay-${s.id}-transport`,
          employee_id: s.id,
          kind: "allowance",
          category: "transport",
          label: "Transport Allowance",
          amount: Number((s.salary * 0.05).toFixed(3)),
          start_month: "2026-01",
          is_active: true,
          note: "Standard mobility & transport allowance",
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_gosi_record",
        {
          id: `gosi-${s.id}`,
          employee_id: s.id,
          category: "bahraini",
          registration_number: `GOSI-BH-${880000 + sIdx}`,
          registered_wage: s.salary,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_credential",
        {
          id: `cred-${s.id}`,
          employee_id: s.id,
          kind: "cpr",
          label: "Bahrain National CPR",
          number: `92010${1000 + sIdx}`,
          issuing_country: "BH",
          issue_date: "2022-01-10",
          expiry_date: "2028-01-10",
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (let d = 1; d <= 12; d++) {
      lines.push(
        ins(
          "hr.attendance_entry",
          {
            id: `att-${s.id}-d${d}`,
            employee_id: s.id,
            entry_date: dateAgo(d),
            date: dateAgo(d),
            check_in: sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '8 hours 2 minutes'`),
            check_out: sqlRaw(`date_trunc('day', now() - interval '${d} days') + interval '16 hours 15 minutes'`),
            status: "present",
            late_minutes: d % 4 === 0 && sIdx % 3 === 0 ? 10 : 0,
            overtime_minutes: d % 3 === 1 && sIdx % 2 === 0 ? 45 : 0,
            shift_type_id: "shf-morning",
            source: "biometric",
            recorded_by_id: "karim-fawzi",
            created_at: ago(d),
            updated_at: ago(d),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    lines.push(
      ins(
        "hr.leave_request",
        {
          id: `lr-${s.id}`,
          employee_id: s.id,
          leave_type: sIdx % 3 === 0 ? "sick" : "annual",
          leave_type_id: sIdx % 3 === 0 ? "lt-sick" : "lt-annual",
          start_date: dateAgo(25 - sIdx * 2),
          end_date: dateAgo(23 - sIdx * 2),
          days_count: 3,
          days: 3,
          full_day: true,
          status: sIdx < 6 ? "approved" : "pending",
          reason: sIdx % 3 === 0 ? "Medical appointment & recovery" : "Scheduled family leave",
          approved_by: sIdx < 6 ? "yusuf-rahman" : null,
          approved_by_id: sIdx < 6 ? "yusuf-rahman" : null,
          approved_at: sIdx < 6 ? ago(26 - sIdx * 2) : null,
          created_at: ago(28 - sIdx * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.leave_request",
        {
          id: `lr2-${s.id}`,
          employee_id: s.id,
          leave_type: "annual",
          leave_type_id: "lt-annual",
          start_date: dateAgo(90 + sIdx * 3),
          end_date: dateAgo(89 + sIdx * 3),
          days_count: 2,
          days: 2,
          full_day: true,
          status: "approved",
          reason: "Mid-year planned leave",
          approved_by: s.reportTo || "omar-haddad",
          approved_by_id: s.reportTo || "omar-haddad",
          approved_at: ago(92 + sIdx * 3),
          created_at: ago(95 + sIdx * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 3; i++) {
    const s = staffRoster[i + 3];
    const delegate = staffRoster[i + 1];
    const hoId = `ho-00${i}`;
    lines.push(
      ins(
        "hr.employee_handover",
        {
          id: hoId,
          reference: `${pfx}-HO-2026-0${i}`,
          employee_id: s.id,
          kind: "leave",
          leave_request_id: `lr-${s.id}`,
          effective_date: dateAgo(25 - (i + 3) * 2),
          return_date: dateAgo(22 - (i + 3) * 2),
          reason: "Scheduled duty coverage during approved leave",
          status: i <= 2 ? "completed" : "active",
          cases_mode: "selected",
          delegate_user_id: delegate.id,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_handover_case",
        {
          id: `hoc-${i}-1`,
          handover_id: hoId,
          case_type: "project",
          case_id: `prj-00${i}`,
          label: `Active Project #0${i} Oversight`,
          to_user_id: delegate.id,
          status: "reassigned",
          reassigned_at: ago(25),
          created_at: ago(25),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.employee_handover_case",
        {
          id: `hoc-${i}-2`,
          handover_id: hoId,
          case_type: "deal",
          case_id: `deal-${i}`,
          label: `Commercial Deal #${i} Follow-up`,
          to_user_id: delegate.id,
          status: "reassigned",
          reassigned_at: ago(25),
          created_at: ago(25),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (const m of [7, 8, 9, 10]) {
    const runId = `prun-2026-${String(m).padStart(2, "0")}`;
    const totalBasic = staffRoster.reduce((acc, s) => acc + s.salary, 0);
    const totalGross = Number((totalBasic * 1.15).toFixed(3));
    const totalDed = Number((totalBasic * 0.07).toFixed(3));
    const totalNet = Number((totalGross - totalDed).toFixed(3));
    lines.push(
      ins(
        "hr.payroll_run",
        {
          id: runId,
          period_month: m,
          period_year: 2026,
          month: m,
          year: 2026,
          status: "paid",
          total_gross: totalGross,
          total_deductions: totalDed,
          total_net: totalNet,
          currency: cur,
          period_start: `2026-${String(m).padStart(2, "0")}-01`,
          period_end: `2026-${String(m).padStart(2, "0")}-28`,
          pay_date: `2026-${String(m).padStart(2, "0")}-28`,
          processed_at: ago((11 - m) * 28),
          approved_by: "layla-nasser",
          approved_by_id: "layla-nasser",
          created_at: ago((11 - m) * 28),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (const s of staffRoster) {
      const allow = Number((s.salary * 0.15).toFixed(3));
      const gosiEmp = Number((s.salary * 0.07).toFixed(3));
      const net = Number((s.salary + allow - gosiEmp).toFixed(3));
      lines.push(
        ins(
          "hr.payroll_item",
          {
            id: `pi-${runId}-${s.id}`,
            payroll_run_id: runId,
            employee_id: s.id,
            basic_salary: s.salary,
            allowances: allow,
            housing_allowance: allow,
            deductions: gosiEmp,
            gosi_employee: gosiEmp,
            gross_salary: Number((s.salary + allow).toFixed(3)),
            net_salary: net,
            status: "paid",
            payment_status: "paid",
            payment_method: "bank_transfer",
            created_at: ago((11 - m) * 28),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 7. INVENTORY & PROCUREMENT ──────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- INVENTORY: WAREHOUSES, PRODUCTS, VARIANTS, STOCK & PROCUREMENT`);
  lines.push(
    ins(
      "inventory.warehouse",
      {
        id: "wh-main",
        code: "WH-01",
        name_en: `${company.shortEn} Main Warehouse`,
        name_ar: `${company.shortAr} المستودع الرئيسي`,
        address: company.addressEn,
        is_active: true,
        is_default: true,
        branch_id: "br-hq",
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "inventory.warehouse",
      {
        id: "wh-hub",
        code: "WH-02",
        name_en: `${company.shortEn} Muharraq Hub`,
        name_ar: `${company.shortAr} مستودع المحرق`,
        address: "Muharraq Logistics Park, Bahrain",
        is_active: true,
        is_default: false,
        branch_id: "br-muharraq",
        sort_order: 2,
        created_at: now,
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  const locs = [
    { id: "loc-a1", wh: "wh-main", code: "A-01", name: "Primary Bay A-01" },
    { id: "loc-a2", wh: "wh-main", code: "A-02", name: "Secondary Bay A-02" },
    { id: "loc-b1", wh: "wh-hub", code: "B-01", name: "Muharraq Dispatch B-01" },
  ];
  for (const l of locs) {
    lines.push(
      ins(
        "inventory.stock_location",
        { id: l.id, warehouse_id: l.wh, code: l.code, name: l.name, is_active: true, created_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const pCats = [...new Set(prodList.map((p) => p.cat))];
  pCats.forEach((cat, idx) => {
    lines.push(
      ins(
        "inventory.product_category",
        {
          id: `pcat-${idx + 1}`,
          name_en: cat,
          name_ar: cat,
          slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          sort_order: idx + 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  prodList.forEach((p, idx) => {
    const pid = `prod-${idx + 1}`;
    const catId = `pcat-${pCats.indexOf(p.cat) + 1}`;
    const varId = `var-${idx + 1}`;
    const qty = 30 + idx * 12;
    lines.push(
      ins(
        "inventory.product",
        {
          id: pid,
          sku: p.sku,
          name_en: p.en,
          name_ar: p.ar,
          category_id: catId,
          cost_price: p.cost,
          selling_price: p.price,
          cost: p.cost,
          price: p.price,
          currency: cur,
          is_active: true,
          track_inventory: true,
          reorder_point: 10,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.product_variant",
        {
          id: varId,
          product_id: pid,
          sku: `${p.sku}-STD`,
          name_en: `${p.en} (Standard)`,
          name_ar: `${p.ar} (قياسي)`,
          cost_price: p.cost,
          selling_price: p.price,
          cost: p.cost,
          price: p.price,
          is_active: true,
          sort_order: 1,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_level",
        {
          id: `sl-${idx + 1}`,
          product_id: pid,
          variant_id: varId,
          location_id: "loc-a1",
          quantity_on_hand: qty,
          quantity_reserved: 2,
          quantity_available: qty - 2,
          on_hand: qty,
          reserved: 2,
          reorder_point: 10,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_batch",
        {
          id: `bat-${idx + 1}`,
          batch_number: `${pfx}-B26-${100 + idx}`,
          product_id: pid,
          variant_id: varId,
          location_id: "loc-a1",
          initial_quantity: qty + 10,
          remaining_quantity: qty,
          cost_per_unit: p.cost,
          received_at: ago(20),
          created_at: ago(20),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_movement",
        {
          id: `mov-in-${idx + 1}`,
          movement_type: "receipt",
          type: "receipt",
          product_id: pid,
          variant_id: varId,
          location_id: "loc-a1",
          quantity: qty + 10,
          unit_cost: p.cost,
          reason: "Initial stock receipt",
          created_by_id: "karim-fawzi",
          created_at: ago(20),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Purchase Orders (3) + Goods Receipts (2) + Stock Count (1)
  for (let i = 1; i <= 3; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const poId = `po-00${i}`;
    const sub = Number((p.cost * 10).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    lines.push(
      ins(
        "inventory.purchase_order",
        {
          id: poId,
          number: `${pfx}-PO-2026-0${i}`,
          supplier_id: `cnt-${9 + (i % 2)}`,
          status: i <= 2 ? "received" : "approved",
          order_date: dateAgo(30 - i * 5),
          expected_date: dateAhead(5),
          warehouse_id: "wh-main",
          vat_enabled: true,
          vat_percentage: 10,
          subtotal: sub,
          vat_amount: vat,
          total: Number((sub + vat).toFixed(3)),
          created_by_id: "karim-fawzi",
          approved_by_id: "layla-nasser",
          created_at: ago(30 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.purchase_order_line",
        {
          id: `pol-00${i}-1`,
          purchase_order_id: poId,
          product_id: `prod-${((i - 1) % prodList.length) + 1}`,
          description: p.en,
          quantity: 10,
          unit_price: p.cost,
          received_quantity: i <= 2 ? 10 : 0,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Stock Items, Purchase Requisitions, RFQs & Quotes, Goods Receipts, Stock Counts & Inter-Warehouse Allocations
  prodList.forEach((p, idx) => {
    lines.push(
      ins(
        "inventory.stock_item",
        {
          id: `sit-${idx + 1}`,
          product_id: `prod-${idx + 1}`,
          variant_key: "STD",
          average_cost: p.cost,
          reorder_point: 10,
          reorder_quantity: 20,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 3; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const reqId = `preq-00${i}`;
    lines.push(
      ins(
        "inventory.purchase_requisition",
        {
          id: reqId,
          number: `${pfx}-PRQ-2026-0${i}`,
          requested_by_id: "tariq-saleh",
          department_id: "d-ops",
          status: i <= 2 ? "converted" : "approved",
          needed_by: dateAhead(10 + i * 3),
          note: `Replenishment request for ${p.en}`,
          estimated_total: Number((p.cost * 12).toFixed(3)),
          created_at: ago(38 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.purchase_requisition_line",
        {
          id: `prql-00${i}-1`,
          requisition_id: reqId,
          product_id: `prod-${((i - 1) % prodList.length) + 1}`,
          variant_key: "STD",
          description: p.en,
          quantity: 12,
          estimated_unit_cost: p.cost,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const rfqId = `rfq-00${i}`;
    lines.push(
      ins(
        "inventory.rfq",
        {
          id: rfqId,
          number: `${pfx}-RFQ-2026-0${i}`,
          requisition_id: reqId,
          title: `Vendor Quote Solicitation: ${p.en}`,
          status: i <= 2 ? "awarded" : "sent",
          due_date: dateAhead(7),
          note: "Requested dual vendor comparison quotes",
          created_by_id: "karim-fawzi",
          created_at: ago(34 - i * 5),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq_line",
        {
          id: `rfql-00${i}-1`,
          rfq_id: rfqId,
          product_id: `prod-${((i - 1) % prodList.length) + 1}`,
          variant_key: "STD",
          description: p.en,
          quantity: 12,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq_quote",
        { id: `rfqq-${i}-a`, rfq_id: rfqId, line_id: `rfql-00${i}-1`, supplier_id: "cnt-9", unit_price: p.cost, lead_time_days: 5, note: "Primary vendor offer", selected: true, created_at: ago(32 - i * 5) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq_quote",
        { id: `rfqq-${i}-b`, rfq_id: rfqId, line_id: `rfql-00${i}-1`, supplier_id: "cnt-10", unit_price: Number((p.cost * 1.06).toFixed(3)), lead_time_days: 7, note: "Secondary vendor quote", selected: false, created_at: ago(32 - i * 5) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 2; i++) {
    const grId = `grn-00${i}`;
    lines.push(
      ins(
        "inventory.goods_receipt",
        { id: grId, number: `${pfx}-GRN-2026-0${i}`, purchase_order_id: `po-00${i}`, location_id: "loc-a1", received_by_id: "tariq-saleh", received_at: ago(18 - i * 4), note: "Inspected & checked into primary warehouse", created_at: ago(18 - i * 4) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.goods_receipt_line",
        { id: `grnl-00${i}-1`, receipt_id: grId, order_line_id: `pol-00${i}-1`, quantity: 10, rejected_quantity: 0, batch_number: `${pfx}-B26-${100 + i - 1}` },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const scId = `scnt-00${i}`;
    const p = prodList[(i - 1) % prodList.length];
    lines.push(
      ins(
        "inventory.stock_count",
        { id: scId, count_number: `${pfx}-CNT-2026-0${i}`, number: `${pfx}-CNT-2026-0${i}`, warehouse_id: i === 1 ? "wh-main" : "wh-hub", scope: "cycle", status: i === 1 ? "approved" : "submitted", notes: "Monthly physical cycle count", counted_by_id: "tariq-saleh", approved_by_id: i === 1 ? "karim-fawzi" : null, counted_at: ago(10 - i * 3), approved_at: i === 1 ? ago(8) : null, created_by_id: "karim-fawzi", created_at: ago(12 - i * 3), updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_count_line",
        { id: `scntl-00${i}-1`, count_id: scId, product_id: `prod-${i}`, variant_id: `var-${i}`, variant_key: "STD", location_id: i === 1 ? "loc-a1" : "loc-b1", system_quantity: 30 + (i - 1) * 12, counted_quantity: 30 + (i - 1) * 12, variance: 0, expected: 30 + (i - 1) * 12, counted: 30 + (i - 1) * 12, notes: `Verified ${p.sku}` },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_allocation",
        { id: `salloc-00${i}`, number: `${pfx}-TRF-2026-0${i}`, kind: "transfer", source_location_id: "loc-a1", destination_location_id: "loc-b1", status: i === 1 ? "received" : "dispatched", revision: 1, created_by_id: "tariq-saleh", approved_by_id: "karim-fawzi", created_at: ago(7 - i), updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_allocation_line",
        { id: `sallocl-00${i}-1`, allocation_id: `salloc-00${i}`, product_id: `prod-${i}`, variant_key: "STD", requested: 5, dispatched: 5, received: i === 1 ? 5 : 0, rejected: 0, unit_snapshot: { code: "unit", name: "Unit", factor: 1 } },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 8. COMMERCE & DELIVERY ──────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- COMMERCE & DELIVERY`);
  lines.push(
    ins(
      "commerce.store_settings",
      {
        id: "default",
        currency: cur,
        tax_inclusive: true,
        default_tax_rate: 10.0,
        minimum_order_amount: 5.0,
        free_shipping_threshold: 50.0,
        guest_checkout: company.hasStore,
        delivery_enabled: company.hasStore,
        delivery_fee: 2.5,
        free_delivery_over: 50.0,
        pickup_enabled: company.hasStore,
        cod_enabled: company.hasStore,
        bank_transfer_enabled: true,
        order_notify_email: company.email,
        updated_at: now,
      },
      "ON CONFLICT (id) DO UPDATE SET delivery_enabled = EXCLUDED.delivery_enabled, pickup_enabled = EXCLUDED.pickup_enabled, guest_checkout = EXCLUDED.guest_checkout, updated_at = now()",
    ),
  );
  lines.push(
    ins(
      "delivery.delivery_settings",
      { id: "default", mode: company.hasStore ? "slots" : "disabled", sla_hours: 24, time_zone: "Asia/Bahrain", slot_days: 7, lead_minutes: 60, require_slot: false, updated_at: now },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  const zones = [
    { id: "dz-manama", en: "Capital Governorate", ar: "محافظة العاصمة", fee: 2.0 },
    { id: "dz-muharraq", en: "Muharraq Governorate", ar: "محافظة المحرق", fee: 2.5 },
    { id: "dz-northern", en: "Northern Governorate", ar: "المحافظة الشمالية", fee: 2.5 },
    { id: "dz-southern", en: "Southern Governorate", ar: "المحافظة الجنوبية", fee: 3.0 },
  ];
  zones.forEach((z, idx) => {
    lines.push(
      ins(
        "commerce.delivery_zone",
        { id: z.id, name_en: z.en, name_ar: z.ar, fee: z.fee, min_order: 5, free_over: 40, is_active: company.hasStore, sort_order: idx + 1, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "delivery.delivery_zone",
        { id: z.id, name_en: z.en, name_ar: z.ar, fee: z.fee, min_order: 5, free_over: 40, is_active: hasLogistics, sort_order: idx + 1, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Cross-Service Warehouse & Customer Segment Projections for Commerce
  for (const wh of [
    { id: "wh-main", code: "WH-01", en: `${company.shortEn} Main Warehouse`, ar: `${company.shortAr} المستودع الرئيسي`, def: true },
    { id: "wh-hub", code: "WH-02", en: `${company.shortEn} Muharraq Hub`, ar: `${company.shortAr} مستودع المحرق`, def: false },
  ]) {
    lines.push(
      ins(
        "commerce.warehouse_ref",
        { warehouse_id: wh.id, code: wh.code, name_en: wh.en, name_ar: wh.ar, is_active: true, is_default: wh.def, updated_at: now },
        "ON CONFLICT (warehouse_id) DO NOTHING",
      ),
    );
  }
  for (const seg of [
    { id: "seg-vip", name: "Enterprise VIP" },
    { id: "seg-corp", name: "Corporate Accounts" },
    { id: "seg-retail", name: "Direct Online" },
  ]) {
    lines.push(ins("commerce.customer_segment", seg, "ON CONFLICT (id) DO NOTHING"));
  }

  if (company.hasStore) {
    lines.push(
      ins(
        "commerce.store_region",
        { id: "reg-bh", code: "BH", name_en: "Bahrain", name_ar: "البحرين", currency: cur, default_language: "ar", branch_id: "br-hq", is_enabled: true, price_multiplier: 1.0, settings: {} },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.coupon",
        { id: "cpn-welcome10", code: "WELCOME10", discount_type: "percent", discount_value: 10, kind: "percent", value: 10, min_order_amount: 15, is_active: true, created_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.retail_register",
        { id: "reg-pos-1", name: "Main Counter POS", branch_id: "br-hq", is_active: true, code: "POS-01", revision: 1, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "commerce.retail_shift",
        { id: "rsh-001", register_id: "reg-pos-1", cashier_id: "noor-hamdan", opened_at: ago(1), closed_at: now, starting_cash: 100, closing_cash: 345, expected_cash: 345, status: "closed" },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (let i = 1; i <= 16; i++) {
      const cust = customers[(i - 1) % customers.length];
      const p = prodList[(i - 1) % prodList.length];
      const ordId = `ord-${String(i).padStart(3, "0")}`;
      const invRefId = `inv-${String(i).padStart(3, "0")}`;
      const shpRefId = i <= 10 ? `shp-${String(i).padStart(3, "0")}` : null;
      const sub = p.price;
      const vat = Number((sub * 0.1).toFixed(3));
      const tot = Number((sub + vat + 2).toFixed(3));
      lines.push(
        ins(
          "commerce.sales_order",
          {
            id: ordId,
            number: `${pfx}-ORD-${1000 + i}`,
            customer_id: cust.id,
            contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
            email: cust.email,
            name: cust.nameEn,
            phone: cust.phone,
            channel: i % 3 === 0 ? "pos" : "storefront",
            status: i <= 8 ? "delivered" : i <= 12 ? "shipped" : "processing",
            payment_status: "paid",
            payment_method: i % 2 === 0 ? "card" : "benefitpay",
            fulfilment: "delivery",
            subtotal: sub,
            vat_amount: vat,
            delivery_fee: 2.0,
            total: tot,
            amount_paid: tot,
            currency: cur,
            locale: i % 2 === 0 ? "en" : "ar",
            warehouse_id: i % 4 === 0 ? "wh-hub" : "wh-main",
            invoice_id: invRefId,
            shipment_id: shpRefId,
            shipment_status: shpRefId ? (i <= 5 ? "delivered" : "out_for_delivery") : null,
            tracking_token: shpRefId ? `trk-${pfx.toLowerCase()}-${500 + i}` : null,
            created_by_id: "noor-hamdan",
            placed_at: ago(i * 2),
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
            sku: p.sku,
            description: p.en,
            quantity: 1,
            unit_price: p.price,
            vat_exempt: false,
            line_total: p.price,
            sort_order: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "commerce.sales_order_event",
          { id: `orde-${i}-1`, order_id: ordId, kind: "placed", status: "placed", note: "Order confirmed & linked to invoice", by_id: "noor-hamdan", created_at: ago(i * 2) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  if (hasLogistics) {
    // Delivery Cross-Service Driver & Order Projections + Slots + Route Sheets + Shipments + COD Settlements
    for (const drvId of ["tariq-saleh", "noor-hamdan", "karim-fawzi"]) {
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
              phone: `+9733900${1000 + staffRoster.indexOf(drv)}`,
              department_id: drv.dept,
              status: "active",
              updated_at: now,
            },
            "ON CONFLICT (employee_id) DO NOTHING",
          ),
        );
      }
    }
    const orderRefCount = company.hasStore ? 16 : 10;
    for (let i = 1; i <= orderRefCount; i++) {
      const cust = customers[(i - 1) % customers.length];
      const p = prodList[(i - 1) % prodList.length];
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
            status: i <= 6 ? "delivered" : "shipped",
            total: Number((p.price * 1.1 + 2).toFixed(3)),
            currency: cur,
            updated_at: now,
          },
          "ON CONFLICT (order_id) DO NOTHING",
        ),
      );
    }
    zones.forEach((z, zIdx) => {
      for (const slot of [
        { s: "09:00", e: "13:00", k: "am" },
        { s: "14:00", e: "18:00", k: "pm" },
      ]) {
        lines.push(
          ins(
            "delivery.delivery_slot",
            { id: `dslot-${z.id}-${slot.k}`, zone_id: z.id, weekday: (zIdx % 5) + 1, slot_start: slot.s, slot_end: slot.e, capacity: 12, is_active: true, created_at: now },
            "ON CONFLICT (id) DO NOTHING",
          ),
        );
      }
    });
    lines.push(
      ins(
        "delivery.courier_agency",
        { id: "cag-smsa", name: "SMSA Express Bahrain", contact_name: "Dispatch Desk", email: "dispatch@smsa.example.bh", phone: "+97317400001", is_active: true, created_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "delivery.vehicle",
        { id: "veh-01", plate: "BH-44102", name: `${company.shortEn} Van 01`, kind: "van", is_active: true, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "delivery.vehicle",
        { id: "veh-02", plate: "BH-44108", name: `${company.shortEn} Van 02`, kind: "van", is_active: true, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (let r = 1; r <= 3; r++) {
      lines.push(
        ins(
          "delivery.route_sheet",
          {
            id: `rs-00${r}`,
            number: `${pfx}-RS-00${r}`,
            driver_id: r % 2 === 1 ? "tariq-saleh" : "noor-hamdan",
            vehicle_id: r % 2 === 1 ? "veh-01" : "veh-02",
            status: r <= 2 ? "completed" : "in_progress",
            run_date: dateAgo(4 - r),
            created_at: ago(4 - r),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "delivery.cod_settlement",
          {
            id: `cods-00${r}`,
            sheet_id: `rs-00${r}`,
            driver_id: r % 2 === 1 ? "tariq-saleh" : "noor-hamdan",
            amount_collected: Number((125 * r).toFixed(3)),
            amount_settled: r <= 2 ? Number((125 * r).toFixed(3)) : 0,
            status: r <= 2 ? "settled" : "pending",
            settled_at: r <= 2 ? ago(3 - r) : null,
            created_at: ago(4 - r),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (let i = 1; i <= 10; i++) {
      const cust = customers[(i - 1) % customers.length];
      const shpId = `shp-${String(i).padStart(3, "0")}`;
      const z = zones[(i - 1) % zones.length];
      const rsIdx = ((i - 1) % 3) + 1;
      lines.push(
        ins(
          "delivery.shipment",
          {
            id: shpId,
            number: `${pfx}-SHP-${500 + i}`,
            order_id: `ord-${String(i).padStart(3, "0")}`,
            status: i <= 5 ? "delivered" : "out_for_delivery",
            method: "fleet",
            zone_id: z.id,
            slot_id: `dslot-${z.id}-${i % 2 === 0 ? "pm" : "am"}`,
            slot_date: dateAgo(Math.max(0, 5 - i)),
            slot_start: i % 2 === 0 ? "14:00" : "09:00",
            slot_end: i % 2 === 0 ? "18:00" : "13:00",
            promised_by: ahead(1),
            recipient_name: cust.nameEn,
            recipient_phone: cust.phone,
            address: { line1: "Building 120, Road 28", city: cust.city, country: "BH" },
            tracking_token: `trk-${pfx.toLowerCase()}-${500 + i}`,
            driver_id: rsIdx % 2 === 1 ? "tariq-saleh" : "noor-hamdan",
            vehicle_id: rsIdx % 2 === 1 ? "veh-01" : "veh-02",
            route_sheet_id: `rs-00${rsIdx}`,
            route_stop: i,
            created_at: ago(i),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "delivery.shipment_event",
          { id: `shpe-${i}`, shipment_id: shpId, status: i <= 5 ? "delivered" : "dispatched", note: "Handled by fleet dispatch", by_id: "tariq-saleh", at: ago(i) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 9. ITSM, WORKFLOW, FILES, NOTIFY, REALTIME, AUDIT ───────────────────────
  lines.push(``);
  lines.push(`-- ITSM, WORKFLOW, FILES, NOTIFY, REALTIME & AUDIT`);
  for (const s of staffRoster) {
    lines.push(
      ins(
        "itsm.staff_ref",
        {
          employee_id: s.id,
          user_id: s.id,
          employee_number: s.username,
          name_en: s.nameEn,
          name_ar: s.nameAr,
          email: `${s.id}@${domainHost}`,
          department_id: s.dept,
          status: "active",
          updated_at: now,
        },
        "ON CONFLICT (employee_id) DO NOTHING",
      ),
    );
  }
  for (const sl of [
    { p: "critical", r: 30, res: 240 },
    { p: "high", r: 120, res: 1440 },
    { p: "normal", r: 480, res: 4320 },
    { p: "low", r: 1440, res: 10080 },
  ]) {
    lines.push(
      ins(
        "itsm.sla_policy",
        { priority: sl.p, response_minutes: sl.r, resolve_minutes: sl.res, updated_at: now },
        "ON CONFLICT (priority) DO NOTHING",
      ),
    );
  }
  lines.push(
    ins("itsm.asset_category", { id: "acat-laptop", code: "LAP", name_en: "Laptops & Workstations", name_ar: "أجهزة الحاسوب" }, "ON CONFLICT (id) DO NOTHING"),
  );
  lines.push(
    ins("itsm.asset_category", { id: "acat-net", code: "NET", name_en: "Networking & Security", name_ar: "الشبكات والأمن" }, "ON CONFLICT (id) DO NOTHING"),
  );

  for (let i = 1; i <= 8; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const assetId = `itast-${String(i).padStart(2, "0")}`;
    lines.push(
      ins(
        "itsm.asset",
        {
          id: assetId,
          asset_tag: `${pfx}-IT-0${i}`,
          category_id: i <= 6 ? "acat-laptop" : "acat-net",
          name: i <= 6 ? `MacBook Pro 14 (${s.nameEn})` : `UniFi Gateway Pro #${i}`,
          brand: i <= 6 ? "Apple" : "Ubiquiti",
          model: i <= 6 ? "M4 Pro" : "UXG-Pro",
          serial_number: `SN-${pfx}-88${100 + i}`,
          purchase_date: dateAgo(180),
          purchase_cost: i <= 6 ? 750 : 320,
          currency: cur,
          condition: "good",
          status: "assigned",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "itsm.asset_handover",
        {
          id: `iastho-${String(i).padStart(2, "0")}`,
          reference: `${pfx}-ITHO-2026-0${i}`,
          asset_id: assetId,
          employee_id: s.id,
          kind: "issue",
          status: "completed",
          handover_date: ago(160 - i * 8),
          condition: "good",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const ticketTitles = [
    "VPN Profile Renewal",
    "ERP Role Adjustment",
    "Printer Calibration",
    "Email DKIM Check",
    "Workstation Backup",
    "POS Terminal Sync",
    "SSL Certificate Check",
    "New Staff Onboarding",
    "Warehouse Scanner Pairing",
    "Biometric Timeclock Sync",
    "Firewall Policy Audit",
    "Project Folder Permissions",
  ];
  for (let i = 1; i <= 12; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const tId = u(`ticket:${i}`);
    const assetRefIdx = ((i - 1) % 8) + 1;
    const assetId = `itast-${String(assetRefIdx).padStart(2, "0")}`;
    const prjId = `prj-${String(((i - 1) % 8) + 1).padStart(3, "0")}`;
    lines.push(
      ins(
        "itsm.ticket",
        {
          id: tId,
          number: 300 + i,
          requester_id: s.id,
          requester_name: s.nameEn,
          requester_email: `${s.id}@${domainHost}`,
          category: i % 2 === 0 ? "access" : "hardware",
          subcategory: i % 2 === 0 ? "permissions" : "workstation",
          priority: i <= 3 ? "high" : "normal",
          status: i <= 7 ? "resolved" : "open",
          title: ticketTitles[i - 1],
          description: `Operational IT support request submitted by ${s.nameEn} for ${prjId}.`,
          asset_ref: `${pfx}-IT-0${assetRefIdx}`,
          assignee_id: "it-eng-001",
          assignee_name: "IT Engineer",
          employee_id: s.id,
          department_id: s.dept,
          project_id: prjId,
          asset_id: assetId,
          document_id: `inv-${String(((i - 1) % 12) + 1).padStart(3, "0")}`,
          respond_by: ahead(1),
          resolve_by: ahead(3),
          created_at: ago(i * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "itsm.ticket_comment",
        {
          id: u(`tkt-cmt:${i}`),
          ticket_id: tId,
          author_realm: "it",
          author_id: "it-eng-001",
          author_name: "IT Engineer",
          body: "Verified configuration and applied standard security baseline.",
          internal: false,
          created_at: ago(i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "itsm.ticket_event",
        {
          id: u(`tkt-evt:${i}`),
          ticket_id: tId,
          actor_realm: "it",
          actor_id: "it-eng-001",
          kind: i <= 7 ? "resolved" : "assigned",
          from_status: "open",
          to_status: i <= 7 ? "resolved" : "in_progress",
          detail: { message: i <= 7 ? "Resolution verified with requester" : "Assigned to IT operations queue" },
          created_at: ago(i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 12; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const itaskId = `itask-${i}`;
    lines.push(
      ins(
        "itsm.task",
        {
          id: itaskId,
          number: `${pfx}-TSK-${100 + i}`,
          title: `${company.shortEn} Operational Milestone #${i}`,
          description: `Tracked deliverable for ${svcList[(i - 1) % svcList.length].en}.`,
          project_id: `prj-${String(((i - 1) % 8) + 1).padStart(3, "0")}`,
          status: i <= 6 ? "done" : i <= 9 ? "in_progress" : "todo",
          priority: i <= 3 ? "high" : "medium",
          assignee_id: s.id,
          department_id: s.dept,
          start_date: dateAgo(10 - (i % 5)),
          due_date: dateAhead(i * 2),
          created_by_id: "karim-fawzi",
          created_at: ago(12),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "itsm.task_comment",
        {
          id: `itaskc-${i}`,
          task_id: itaskId,
          author_id: s.id,
          body: `Milestone #${i} checklist synchronized with departmental SLA schedule.`,
          created_at: ago(i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Workflow Directory Projections (Departments, Employees, Contacts, Deals, Projects)
  for (const d of depts) {
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "department", id: d.id, name: d.en, name_ar: d.ar, updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  }
  for (const s of staffRoster) {
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "employee", id: s.id, name: s.nameEn, name_ar: s.nameAr, email: `${s.id}@${domainHost}`, parent_id: s.dept, metadata: { titleEn: s.titleEn, role: s.role }, updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  }
  customers.forEach((c, idx) => {
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "contact", id: `cnt-${idx + 1}`, name: c.nameEn, name_ar: c.nameAr, email: c.email, metadata: { phone: c.phone, city: c.city }, updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 18; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "deal", id: `deal-${i}`, name: `${cust.nameEn} — ${svc.en}`, parent_id: `cnt-${((i - 1) % customers.length) + 1}`, metadata: { status: i <= 8 ? "won" : "open" }, updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "project", id: `prj-${String(i).padStart(3, "0")}`, name: `${cust.nameEn} — ${svc.en}`, parent_id: projectDepts[(i - 1) % projectDepts.length], updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  }

  // Workflow Minutes of Meeting (8) + Attendees (24) + Action Items (16) -> Linked Tasks (16) & Calendar (14)
  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const momId = `mom-${String(i).padStart(3, "0")}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const prjId = `prj-${String(i).padStart(3, "0")}`;
    const dealId = `deal-${i}`;
    const deptId = projectDepts[(i - 1) % projectDepts.length];
    const org = staffRoster[i % staffRoster.length];
    lines.push(
      ins(
        "workflow.minute_of_meeting",
        {
          id: momId,
          mom_number: `${pfx}-MOM-2026-${String(i).padStart(2, "0")}`,
          title: `${cust.nameEn} — ${svc.en} Alignment`,
          title_ar: `${cust.nameAr} — اجتماع تنسيق ${svc.ar}`,
          meeting_date: dateAgo(32 - i * 3),
          start_time: "10:00",
          end_time: "11:15",
          location: `${company.city} HQ — Boardroom ${i % 2 === 0 ? "B" : "A"}`,
          attendees: [org.nameEn, "Omar Haddad", cust.nameEn],
          discussion: `Reviewed milestones, commercial scope, and delivery SLAs for ${svc.en} with ${cust.nameEn}.`,
          action_items: `Finalize deliverable schedule; confirm quotation ${pfx}-QT-2026-${200 + i} and milestone sign-off.`,
          agenda: `1. Progress review\n2. Budget & invoicing alignment\n3. Next-phase action items`,
          decisions: [{ title: "Proceed with phase execution", owner: org.id }],
          notes: `Approved during bi-weekly client & operations review.`,
          status: i <= 6 ? "approved" : "draft",
          client_id: contactId,
          deal_id: dealId,
          project_id: prjId,
          department_id: deptId,
          organizer_id: org.id,
          created_by_id: org.id,
          approved_by_id: i <= 6 ? "omar-haddad" : null,
          signature_url: "/api/files/brand/signature.png",
          created_at: ago(32 - i * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 16; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const momIdx = ((i - 1) % 8) + 1;
    const momId = `mom-${String(momIdx).padStart(3, "0")}`;
    const contactId = `cnt-${((momIdx - 1) % customers.length) + 1}`;
    const dealId = `deal-${momIdx}`;
    const prjId = `prj-${String(momIdx).padStart(3, "0")}`;
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const tskId = `tsk-${String(i).padStart(3, "0")}`;
    lines.push(
      ins(
        "workflow.task",
        {
          id: tskId,
          title: `${company.shortEn} Action & Sign-Off #${i}`,
          description: `Deliverable linked to ${momId} & ${prjId}, assigned to ${s.nameEn}.`,
          assigned_to: s.id,
          due_date: ahead(i * 2),
          status: i <= 8 ? "completed" : "in_progress",
          priority: i <= 4 ? "high" : "medium",
          related_entity_type: i % 2 === 0 ? "invoice" : "mom",
          related_entity_id: i % 2 === 0 ? invId : momId,
          project_id: prjId,
          department_id: s.dept,
          mom_id: momId,
          client_id: contactId,
          deal_id: dealId,
          employee_id: s.id,
          created_by_id: "karim-fawzi",
          document_id: invId,
          created_at: ago(i),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.mom_action_item",
        {
          id: `moma-${String(i).padStart(3, "0")}`,
          mom_id: momId,
          task_id: tskId,
          title: `Execute action item #${i} from ${momId}`,
          description: `Follow-up coordinated between ${s.nameEn} and client account lead.`,
          assignee_employee_id: s.id,
          assignee_user_id: s.id,
          department_id: s.dept,
          due_date: dateAhead(i * 2),
          status: i <= 8 ? "completed" : "open",
          created_at: ago(i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const momId = `mom-${String(i).padStart(3, "0")}`;
    const org = staffRoster[i % staffRoster.length];
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const deptId = projectDepts[(i - 1) % projectDepts.length];
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-1`, mom_id: momId, attendee_type: "employee", employee_id: "omar-haddad", user_id: "omar-haddad", department_id: "d-exec", display_name: "Omar Haddad", email: `omar-haddad@${domainHost}`, role_title: "Managing Partner", attended: true, created_at: ago(30 - i * 3) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-2`, mom_id: momId, attendee_type: "employee", employee_id: org.id, user_id: org.id, department_id: org.dept, display_name: org.nameEn, email: `${org.id}@${domainHost}`, role_title: org.titleEn, attended: true, created_at: ago(30 - i * 3) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-3`, mom_id: momId, attendee_type: "client", contact_id: contactId, display_name: cust.nameEn, email: cust.email, role_title: "Client Representative", attended: true, created_at: ago(30 - i * 3) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 14; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const momIdx = ((i - 1) % 8) + 1;
    lines.push(
      ins(
        "workflow.calendar_event",
        {
          id: `cal-${String(i).padStart(3, "0")}`,
          title: `${company.shortEn} ${i % 2 === 0 ? "Client Sync" : "Operations Standup"} #${i}`,
          description: `Scheduled review in ${company.city} HQ.`,
          start_time: ahead(i),
          end_time: ahead(i),
          is_all_day: false,
          location: `${company.city} HQ`,
          organizer_id: s.id,
          event_type: i % 2 === 0 ? "meeting" : "milestone",
          client_id: `cnt-${((momIdx - 1) % customers.length) + 1}`,
          deal_id: `deal-${momIdx}`,
          project_id: `prj-${String(momIdx).padStart(3, "0")}`,
          department_id: s.dept,
          employee_id: s.id,
          mom_id: `mom-${String(momIdx).padStart(3, "0")}`,
          document_id: `inv-${String(i).padStart(3, "0")}`,
          created_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Workflow Contracts, Templates, Signature Requests & Official Letters (all cross-linked!)
  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const deptId = projectDepts[(i - 1) % projectDepts.length];
    lines.push(
      ins(
        "workflow.contract",
        {
          id: `wctr-${String(i).padStart(3, "0")}`,
          contract_number: `${pfx}-WCTR-2026-${String(i).padStart(2, "0")}`,
          title: `Master Service Contract — ${cust.nameEn}`,
          title_ar: `عقد خدمات رئيسي — ${cust.nameAr}`,
          contract_type: i % 3 === 0 ? "retainer" : "service_agreement",
          contact_id: contactId,
          deal_id: `deal-${i}`,
          project_id: `prj-${String(i).padStart(3, "0")}`,
          quotation_id: `qt-${String(i).padStart(3, "0")}`,
          invoice_id: `inv-${String(i).padStart(3, "0")}`,
          employee_id: "sami-khoury",
          department_id: deptId,
          document_id: `inv-${String(i).padStart(3, "0")}`,
          file_url: `/api/files/media/banners/banner-0${(i % 3) + 1}.png`,
          status: i <= 6 ? "active" : "pending_signature",
          start_date: dateAgo(60),
          end_date: dateAhead(305),
          value: Number((svc.rate * 4).toFixed(3)),
          currency: cur,
          notes: `Bilingual service contract covering ${svc.en} under Kingdom of Bahrain law.`,
          created_by_id: "omar-haddad",
          signed_by_id: i <= 6 ? "omar-haddad" : null,
          created_at: ago(45 - i * 4),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const letterTemplates = [
    { id: "ltmp-01", en: "Client Onboarding Welcome Letter", ar: "خطاب ترحيب وتأهيل عميل", body: "Dear {{recipient}}, Welcome to {{company}}. Our dedicated team is pleased to commence work on {{project}}." },
    { id: "ltmp-02", en: "Executive Employment Verification", ar: "شهادة تعريف بالراتب والعمل", body: "To Whom It May Concern: This certifies that {{recipient}} is employed full-time with {{company}} in Bahrain." },
    { id: "ltmp-03", en: "Project Milestone Acceptance Certificate", ar: "شهادة استلام وقبول مرحلة المشروع", body: "This certificate confirms satisfactory completion and client acceptance of {{project}} milestones." },
    { id: "ltmp-04", en: "Account Standing & Clearance Notice", ar: "إشعار مخالصة مالية وإدارية", body: "Please accept this formal notice confirming settled balances for {{recipient}} under contract {{contract}}." },
  ];
  letterTemplates.forEach((lt, idx) => {
    lines.push(
      ins(
        "workflow.letter_template",
        { id: lt.id, name_en: lt.en, name_ar: lt.ar, template_body: lt.body, sort_order: idx + 1 },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  for (let i = 1; i <= 8; i++) {
    const cust = customers[(i - 1) % customers.length];
    const s = staffRoster[(i - 1) % staffRoster.length];
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const prjId = `prj-${String(i).padStart(3, "0")}`;
    const dealId = `deal-${i}`;
    const sreqId = `sreq-${String(i).padStart(3, "0")}`;
    lines.push(
      ins(
        "workflow.signature_request",
        {
          id: sreqId,
          title: `Authorisation & Sign-Off: ${cust.nameEn} (${pfx}-DOC-0${i})`,
          document_type: i % 2 === 0 ? "contract" : "official_letter",
          document_id: i % 2 === 0 ? `wctr-${String(i).padStart(3, "0")}` : `olet-${String(i).padStart(3, "0")}`,
          requested_from: cust.email,
          status: i <= 5 ? "signed" : "pending",
          signature_url: i <= 5 ? "/api/files/brand/signature.png" : null,
          signed_at: i <= 5 ? ago(15 - i * 2) : null,
          expires_at: ahead(30),
          client_id: contactId,
          deal_id: dealId,
          project_id: prjId,
          employee_id: s.id,
          department_id: s.dept,
          created_by_id: "omar-haddad",
          file_url: "/api/files/brand/signature.png",
          created_at: ago(20 - i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.official_letter",
        {
          id: `olet-${String(i).padStart(3, "0")}`,
          letter_number: `${pfx}-LTR-2026-0${i}`,
          template_id: letterTemplates[(i - 1) % letterTemplates.length].id,
          recipient_name: cust.nameEn,
          recipient_title: "Authorized Signatory",
          subject: `${letterTemplates[(i - 1) % letterTemplates.length].en} — ${cust.nameEn}`,
          body: `Formal correspondence issued by ${company.nameEn} referencing ${prjId} and ${dealId}.`,
          status: i <= 6 ? "issued" : "draft",
          issued_at: i <= 6 ? ago(18 - i * 2) : null,
          client_id: contactId,
          deal_id: dealId,
          project_id: prjId,
          employee_id: s.id,
          department_id: s.dept,
          document_id: `wctr-${String(i).padStart(3, "0")}`,
          created_by_id: "omar-haddad",
          signed_by_id: i <= 6 ? "omar-haddad" : null,
          signature_request_id: sreqId,
          file_url: "/api/files/brand/stamp.png",
          created_at: ago(20 - i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 8; i++) {
    const reqId = `apr-${i}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const entityId = i % 2 === 0 ? `exp-${String(i).padStart(3, "0")}` : `inv-${String(i).padStart(3, "0")}`;
    lines.push(
      ins(
        "workflow.approval_request",
        {
          id: reqId,
          kind: i % 2 === 0 ? "expense" : "invoice",
          entity_type: i % 2 === 0 ? "expense" : "invoice",
          entity_id: entityId,
          document_id: entityId,
          client_id: contactId,
          deal_id: `deal-${i}`,
          project_id: `prj-${String(i).padStart(3, "0")}`,
          department_id: i % 2 === 0 ? "d-fin" : "d-sales",
          employee_id: "faisal-mansour",
          requester_id: "faisal-mansour",
          status: i <= 5 ? "approved" : "pending",
          priority: "normal",
          reason: "Standard monthly authorization workflow",
          created_at: ago(i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 5) {
      lines.push(
        ins(
          "workflow.approval_decision",
          {
            id: `aprd-${i}`,
            request_id: reqId,
            approver_id: "layla-nasser",
            decision: "approved",
            comments: "Verified against approved budget.",
            decided_at: ago(i),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // Files Entity Attachments (linking real uploaded assets to invoices, contracts, MoMs, letters & tickets)
  if (filesList.length > 0) {
    const uploadUuidOf = (fileUrl) => {
      const h = crypto.createHash("md5").update(`${company.slug}:${fileUrl}`).digest("hex");
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
    };
    const attachmentTargets = [
      { id: "attl-inv-1", entity_type: "invoice", entity_id: "inv-001", doc_type: "invoice", rel: "supporting", title: "Signed Tax Invoice", client_id: "cnt-1", emp: "layla-nasser", prj: "prj-001" },
      { id: "attl-qt-1", entity_type: "quotation", entity_id: "qt-001", doc_type: "quotation", rel: "supporting", title: "Client Proposal Brief", client_id: "cnt-1", emp: "sami-khoury", prj: "prj-001" },
      { id: "attl-ctr-1", entity_type: "contract", entity_id: "wctr-001", doc_type: "contract", rel: "signed_copy", title: "Executed MSA Copy", client_id: "cnt-1", emp: "omar-haddad", prj: "prj-001" },
      { id: "attl-mom-1", entity_type: "mom", entity_id: "mom-001", doc_type: "mom", rel: "minutes_pack", title: "Signed Meeting Minutes", client_id: "cnt-1", emp: "karim-fawzi", prj: "prj-001" },
      { id: "attl-ltr-1", entity_type: "official_letter", entity_id: "olet-001", doc_type: "official_letter", rel: "stamped_pdf", title: "Official Company Stamp Copy", client_id: "cnt-1", emp: "omar-haddad", prj: "prj-001" },
      { id: "attl-tkt-1", entity_type: "ticket", entity_id: u("ticket:1"), doc_type: "ticket", rel: "diagnostic", title: "IT Configuration Snapshot", client_id: null, emp: "omar-haddad", prj: "prj-001" },
      { id: "attl-prj-1", entity_type: "project", entity_id: "prj-002", doc_type: "project", rel: "deliverable", title: "Project Overview Deck", client_id: "cnt-2", emp: "tariq-saleh", prj: "prj-002" },
      { id: "attl-emp-1", entity_type: "employee", entity_id: "tariq-saleh", doc_type: "employee", rel: "credential", title: "Staff Onboarding Pack", client_id: null, emp: "tariq-saleh", prj: null },
    ];
    attachmentTargets.forEach((at, idx) => {
      const f = filesList[idx % filesList.length];
      lines.push(
        ins(
          "files.entity_attachment",
          {
            id: at.id,
            file_id: uploadUuidOf(f.fileUrl),
            file_url: f.fileUrl,
            file_name: f.fileName,
            file_size: f.size,
            mime_type: f.mime,
            entity_type: at.entity_type,
            entity_id: at.entity_id,
            document_id: at.entity_id,
            document_type: at.doc_type,
            relation_kind: at.rel,
            title: at.title,
            client_id: at.client_id,
            employee_id: at.emp,
            project_id: at.prj,
            uploaded_by_id: at.emp || "omar-haddad",
            created_at: ago(idx + 1),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    });
  }

  for (const s of staffRoster) {
    lines.push(
      ins(
        "realtime.status",
        { realm: "staff", user_id: s.id, status: "online", message: "Available", updated_at: now },
        "ON CONFLICT (realm, user_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "notify.preference",
        { realm: "staff", user_id: s.id, sound_enabled: true, popups_enabled: true, desktop_enabled: true, updated_at: now },
        "ON CONFLICT (realm, user_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "notify.notification",
        {
          id: u(`notif:${s.id}`),
          realm: "staff",
          recipient: s.id,
          category: "system",
          priority: "normal",
          title: `Welcome to ${company.shortEn}`,
          body: `Workspace ready for ${s.nameEn} (${s.titleEn}).`,
          caller: "system",
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 15; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    lines.push(
      ins(
        "audit.event",
        {
          id: u(`audit:${i}`),
          subject: i % 3 === 0 ? "finance.invoice.approved" : i % 3 === 1 ? "identity.session.created" : "system.setting.updated",
          service: i % 3 === 0 ? "finance" : i % 3 === 1 ? "identity" : "system",
          entity: i % 3 === 0 ? `inv-${String(i).padStart(3, "0")}` : s.id,
          verb: i % 3 === 0 ? "approved" : i % 3 === 1 ? "signed_in" : "updated",
          actor: s.id,
          occurred_at: ago(i),
          received_at: ago(i),
          payload: { company: company.slug, seq: i },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  return lines.join("\n");
}

module.exports = { buildRichModuleSql };
