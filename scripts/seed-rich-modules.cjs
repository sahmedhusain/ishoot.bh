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

  // Services
  const svcList = company.services.length ? company.services : [primarySvc];
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

  // Projects (6) & Contracts (6)
  for (let i = 1; i <= 6; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "system.project",
        {
          id: `prj-${String(i).padStart(3, "0")}`,
          code: `${pfx}-PRJ-2026-0${i}`,
          name: `${cust.nameEn} — ${svc.en}`,
          description: `End-to-end delivery for ${cust.nameEn} managed by ${company.shortEn}.`,
          status: i <= 2 ? "completed" : i <= 5 ? "active" : "planned",
          department_id: "d-ops",
          owner_id: "tariq-saleh",
          color: company.theme.primary,
          start_date: dateAgo(45 - i * 5),
          due_date: dateAhead(15 + i * 7),
          created_by_id: "karim-fawzi",
          created_at: ago(45 - i * 5),
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
          contract_number: `${pfx}-CTR-2026-0${i}`,
          deal_id: `deal-${i}`,
          contact_id: `cnt-${i}`,
          title_en: `Master Service Agreement — ${cust.nameEn}`,
          title_ar: `اتفاقية تقديم خدمات رئيسية — ${cust.nameAr}`,
          body_html: `<p>Agreement between ${company.nameEn} and ${cust.nameEn} for ${svc.en}.</p>`,
          status: i <= 4 ? "signed" : "pending_signature",
          signed_at: i <= 4 ? ago(30 - i * 4) : null,
          valid_from: dateAgo(60),
          valid_until: dateAhead(305),
          created_by_id: "omar-haddad",
          created_at: ago(35 - i * 4),
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

  // 12 Deals + 10 Inquiries + 10 Quotations (with 20 line items) + 6 Campaigns
  for (let i = 1; i <= 12; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const stage = i <= 6 ? "stg-won" : i <= 9 ? "stg-prop" : i <= 11 ? "stg-neg" : "stg-new";
    const val = svc.rate * ((i % 4) + 1);
    const dealId = `deal-${i}`;
    lines.push(
      ins(
        "sales.deal",
        {
          id: dealId,
          title: `${cust.nameEn} — ${svc.en}`,
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          stage,
          value: val,
          currency: cur,
          probability: i <= 6 ? 100 : i <= 9 ? 50 : 80,
          expected_close_date: dateAhead(i * 4),
          status: i <= 6 ? "won" : "open",
          assigned_to: "sami-khoury",
          created_at: ago(50 - i * 3),
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
          contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
          title: `${cust.nameEn} — ${svc.en}`,
          deal_stage: stage,
          deal_value: val,
          currency: cur,
          probability: i <= 6 ? 100 : 50,
          expected_close_date: dateAhead(i * 4),
          assigned_to: "sami-khoury",
          created_at: ago(50 - i * 3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 10) {
      lines.push(
        ins(
          "sales.inquiry",
          {
            id: `inq-${i}`,
            inquiry_type: "proposal",
            subject: `Request for Proposal: ${svc.en}`,
            message: `Hello ${company.shortEn}, we would like a formal quotation for ${svc.en} for our ${cust.city} branch.`,
            status: i <= 6 ? "converted" : i <= 8 ? "in_review" : "new",
            priority: i <= 3 ? "high" : "normal",
            requester_name: cust.nameEn,
            requester_email: cust.email,
            requester_phone: cust.phone,
            assignee_id: "sami-khoury",
            deal_id: dealId,
            created_at: ago(55 - i * 4),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      const qId = `qt-${String(i).padStart(3, "0")}`;
      const sub = val;
      const vat = Number((sub * 0.1).toFixed(3));
      const tot = Number((sub + vat).toFixed(3));
      lines.push(
        ins(
          "sales.quotation",
          {
            id: qId,
            quotation_number: `${pfx}-QT-2026-${200 + i}`,
            deal_id: dealId,
            contact_id: `cnt-${((i - 1) % customers.length) + 1}`,
            status: i <= 6 ? "accepted" : "sent",
            subtotal: sub,
            vat_rate: 10.0,
            vat_amount: vat,
            total: tot,
            total_amount: tot,
            currency: cur,
            valid_until: ahead(30),
            issue_date: dateAgo(45 - i * 3),
            valid_until_date: dateAhead(30),
            vat_enabled: true,
            vat_percentage: 10.0,
            language: "en",
            created_by_id: "sami-khoury",
            sales_owner_id: "sami-khoury",
            created_at: ago(45 - i * 3),
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
            quantity: 1,
            unit_price: sub,
            amount: sub,
            sort_order: 1,
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
            quantity: 1,
            unit_price: sub,
            line_total: sub,
            order_index: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }
  for (let i = 1; i <= 6; i++) {
    lines.push(
      ins(
        "sales.campaign",
        {
          id: `cmp-${i}`,
          name: `${company.shortEn} ${["Q3 Outreach", "Enterprise Launch", "Ramadan & Eid Special", "GCC Partner Drive", "Annual Renewal", "Q4 Growth"][i - 1]}`,
          subject: `Partner with ${company.shortEn} for ${svcList[(i - 1) % svcList.length].en}`,
          body: `Explore ${company.shortEn}'s enterprise capabilities and dedicated local support.`,
          status: i <= 4 ? "sent" : "draft",
          sent_at: i <= 4 ? ago(i * 14) : null,
          code: `${pfx}-CMP-0${i}`,
          channel: i % 2 === 0 ? "email" : "linkedin",
          start_date: dateAgo(i * 15),
          end_date: dateAhead(30),
          budget: 800 * i,
          spend: 450 * i,
          utm_campaign: `${company.slug}_q${((i - 1) % 4) + 1}`,
          owner_id: "hana-yousef",
          created_by_id: "hana-yousef",
          created_at: ago(i * 15),
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

  // 18 Invoices spanning past 150 days -> +15 days + line items + payments + allocations
  for (let i = 1; i <= 18; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const invNum = `${pfx}-2026-${100 + i}`;
    const daysBack = Math.max(1, 160 - i * 9);
    const qty1 = (i % 3) + 1;
    const qty2 = 1;
    const line1 = Number((svc.rate * qty1).toFixed(3));
    const line2 = Number((svc.rate * 0.4).toFixed(3));
    const sub = Number((line1 + line2).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const isPaid = i <= 13;
    const paid = isPaid ? tot : i === 14 ? Number((tot * 0.5).toFixed(3)) : 0;
    const bal = Number((tot - paid).toFixed(3));
    const status = isPaid ? "paid" : i === 14 ? "partially_paid" : "sent";
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;

    lines.push(
      ins(
        "finance.invoice",
        {
          id: invId,
          invoice_number: invNum,
          quotation_id: i <= 10 ? `qt-${String(i).padStart(3, "0")}` : null,
          contact_id: contactId,
          deal_id: i <= 12 ? `deal-${i}` : null,
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
          description: `${svc.en} — Setup & Support`,
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

  // Attendance entries (past 4 days x 9 staff = 36 entries) + Leave Requests (9) + Payroll Runs (3 x 9 = 27 items)
  for (const s of staffRoster) {
    const sIdx = staffRoster.indexOf(s);
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
    for (let d = 1; d <= 4; d++) {
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
            late_minutes: d === 2 && sIdx % 3 === 0 ? 10 : 0,
            overtime_minutes: d === 1 && sIdx % 2 === 0 ? 45 : 0,
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
  }

  for (const m of [8, 9, 10]) {
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

  const prodList = company.products.length
    ? company.products
    : [
        { sku: `${pfx}-SUP-01`, en: `${company.shortEn} Operational Kit`, ar: `حقيبة تشغيل ${company.shortAr}`, cat: "Operations", cost: 45, price: 85 },
        { sku: `${pfx}-SUP-02`, en: `${company.shortEn} Branded Package`, ar: `باقة ${company.shortAr} المعتمدة`, cat: "Operations", cost: 80, price: 140 },
        { sku: `${pfx}-SUP-03`, en: `${company.shortEn} Enterprise Hardware`, ar: `أجهزة ${company.shortAr} للمؤسسات`, cat: "Hardware", cost: 160, price: 280 },
      ];
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
    for (let i = 1; i <= 10; i++) {
      const cust = customers[(i - 1) % customers.length];
      const p = prodList[(i - 1) % prodList.length];
      const ordId = `ord-${String(i).padStart(3, "0")}`;
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
            email: cust.email,
            name: cust.nameEn,
            phone: cust.phone,
            channel: i % 3 === 0 ? "pos" : "storefront",
            status: i <= 6 ? "delivered" : i <= 8 ? "shipped" : "processing",
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
            warehouse_id: "wh-main",
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
          { id: `orde-${i}-1`, order_id: ordId, kind: "placed", status: "placed", note: "Order confirmed", by_id: "noor-hamdan", created_at: ago(i * 2) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  if (hasLogistics) {
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
        "delivery.route_sheet",
        { id: "rs-001", number: `${pfx}-RS-001`, driver_id: "tariq-saleh", vehicle_id: "veh-01", status: "completed", run_date: dateAgo(1), created_at: ago(1), updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (let i = 1; i <= 5; i++) {
      const cust = customers[(i - 1) % customers.length];
      const shpId = `shp-00${i}`;
      lines.push(
        ins(
          "delivery.shipment",
          {
            id: shpId,
            number: `${pfx}-SHP-${500 + i}`,
            order_id: `ord-${String(i).padStart(3, "0")}`,
            status: i <= 3 ? "delivered" : "out_for_delivery",
            method: "fleet",
            zone_id: zones[(i - 1) % zones.length].id,
            promised_by: ahead(1),
            recipient_name: cust.nameEn,
            recipient_phone: cust.phone,
            address: { line1: "Building 120, Road 28", city: cust.city, country: "BH" },
            tracking_token: `trk-${pfx.toLowerCase()}-${500 + i}`,
            vehicle_id: "veh-01",
            route_sheet_id: "rs-001",
            created_at: ago(i),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "delivery.shipment_event",
          { id: `shpe-${i}`, shipment_id: shpId, status: i <= 3 ? "delivered" : "dispatched", note: "Handled by fleet dispatch", by_id: "tariq-saleh", at: ago(i) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 9. ITSM, WORKFLOW, NOTIFY, REALTIME, AUDIT ──────────────────────────────
  lines.push(``);
  lines.push(`-- ITSM, WORKFLOW, NOTIFY, REALTIME & AUDIT`);
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
    const tId = u(`ticket:${i}`);
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
          priority: i <= 2 ? "high" : "normal",
          status: i <= 5 ? "resolved" : "open",
          title: `${["VPN Profile Renewal", "ERP Role Adjustment", "Printer Calibration", "Email DKIM Check", "Workstation Backup", "POS Terminal Sync", "SSL Certificate Check", "New Staff Onboarding"][i - 1]}`,
          description: `Operational IT support request submitted by ${s.nameEn}.`,
          assignee_id: "it-eng-001",
          assignee_name: "IT Engineer",
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
  }

  for (let i = 1; i <= 10; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    lines.push(
      ins(
        "itsm.task",
        {
          id: `itask-${i}`,
          number: `${pfx}-TSK-${100 + i}`,
          title: `${company.shortEn} Operational Milestone #${i}`,
          description: `Tracked deliverable for ${svcList[(i - 1) % svcList.length].en}.`,
          project_id: `prj-${String(((i - 1) % 6) + 1).padStart(3, "0")}`,
          status: i <= 5 ? "done" : i <= 8 ? "in_progress" : "todo",
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
        "workflow.task",
        {
          id: `tsk-${String(i).padStart(3, "0")}`,
          title: `${company.shortEn} Review & Sign-Off #${i}`,
          description: `Departmental review task assigned to ${s.nameEn}.`,
          assigned_to: s.id,
          due_date: ahead(i * 2),
          status: i <= 5 ? "completed" : "in_progress",
          priority: i <= 3 ? "high" : "medium",
          created_at: ago(i),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
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
          created_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 6; i++) {
    const reqId = `apr-${i}`;
    lines.push(
      ins(
        "workflow.approval_request",
        {
          id: reqId,
          kind: i % 2 === 0 ? "expense" : "invoice",
          entity_id: i % 2 === 0 ? `exp-${String(i).padStart(3, "0")}` : `inv-${String(i).padStart(3, "0")}`,
          requester_id: "faisal-mansour",
          status: i <= 4 ? "approved" : "pending",
          priority: "normal",
          reason: "Standard monthly authorization workflow",
          created_at: ago(i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 4) {
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
