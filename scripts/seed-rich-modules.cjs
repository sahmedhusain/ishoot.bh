const crypto = require("node:crypto");
const {
  schemaMeta,
  uuidOf,
  sqlRaw,
  ins,
  splitPhone,
  staffEmail,
} = require("./lib/seed-sql.cjs");
const { getActivityCatalog } = require("./lib/activity-catalogs.cjs");

function buildRichModuleSql({
  company,
  companyJson,
  themeJson = {},
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

  const catalog = getActivityCatalog(company);
  const svcList = catalog.services;
  const prodList = catalog.products;
  const primarySvc = svcList[0];

  // ── 1. IDENTITY EXTRAS ──────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- IDENTITY: BRANCHES, USERS & CUSTOMER ACCOUNTS`);
  const branches = [
    { id: "br-hq", code: "HQ-01", name: `${company.shortEn} ${company.city} HQ` },
    { id: "br-muharraq", code: "MH-02", name: `${company.shortEn} Muharraq Office` },
    { id: "br-riffa", code: "RF-03", name: `${company.shortEn} Riffa Hub` },
    { id: "br-seef", code: "SF-04", name: `${company.shortEn} Seef Lounge` },
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
          created_at: ago(90),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  staffRoster.forEach((s, idx) => {
    const email = staffEmail(s, domainHost);
    const phone = s.phone || `+9733900${String(idx + 1).padStart(4, "0")}`;
    const pp = splitPhone(phone);
    lines.push(
      ins(
        "identity.user",
        {
          id: s.id,
          email,
          full_name: s.nameEn,
          password_hash: s.passwordHash || defaultPasswordHash,
          role: s.role,
          permissions: s.id === "super-admin" ? ["*"] : [],
          phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          department: s.dept,
          department_id: s.dept,
          manager_id: s.reportTo,
          avatar_url: "/api/files/brand/icon-light.png",
          signature_url: "/api/files/brand/signature.png",
          is_active: true,
          mfa_enabled: false,
          mfa_secret_encrypted: null,
          mfa_pending_secret_encrypted: null,
          mfa_pending_expires_at: null,
          mfa_last_step: null,
          reset_token: null,
          reset_expires_at: null,
          archived_at: null,
          archived_by_id: null,
          suspended_at: null,
          suspended_by_id: null,
          suspension_reason: null,
          last_login_at: ago((idx % 5) + 1),
          created_at: ago(90),
          updated_at: now,
          discount_limit_percent: s.id === "super-admin" ? 50 : 15,
          commission_rate_percent: s.role === "sales" ? 5 : 0,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const grantBranches = idx <= 4 ? branches.map((b) => b.id) : ["br-hq"];
    for (const brId of grantBranches) {
      lines.push(
        ins(
          "identity.branch_grant",
          {
            id: `bg-${s.id}-${brId.replace("br-", "")}`,
            branch_id: brId,
            user_id: s.id,
            can_manage: ["super_admin", "admin", "operations_manager"].includes(s.role),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  });
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
          mfa_secret_encrypted: null,
          mfa_last_step: null,
          mfa_pending_secret_encrypted: null,
          mfa_pending_expires_at: null,
          last_login_at: ago((idx % 12) + 1),
          reporting_to: null,
          created_at: ago(60),
          updated_at: now,
        },
        "ON CONFLICT (realm, subject_id) DO NOTHING",
      ),
    );
  });

  // ── 2. SYSTEM OPERATIONAL TABLES ────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- SYSTEM: SETTINGS, SERVICES, EQUIPMENT, PROJECTS, CONTRACTS & GOVERNANCE`);
  const coPhone = splitPhone(company.phone);
  const coWa = splitPhone(company.whatsapp);
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
        vat_certificate_url: "/api/files/brand/stamp.png",
        default_currency: cur,
        currency_decimals: company.decimals,
        address_en: company.addressEn,
        address_ar: company.addressAr,
        phone: company.phone,
        country_code: coPhone.country_code,
        mobile_number: coPhone.mobile_number,
        whatsapp_phone: company.whatsapp,
        whatsapp_country_code: coWa.country_code,
        whatsapp_mobile_number: coWa.mobile_number,
        email: company.email,
        website: `https://${domainHost}`,
        instagram_url: `https://instagram.com/${company.slug}`,
        linkedin_url: `https://linkedin.com/company/${company.slug}`,
        youtube_url: `https://youtube.com/@${company.slug}`,
        map_url: `https://maps.google.com/?q=${encodeURIComponent(`${company.city}, Bahrain`)}`,
        bank_name: companyJson.company.bankName,
        bank_iban: companyJson.company.bankIban,
        bank_account_number: companyJson.company.bankAccountNumber,
        bank_swift: companyJson.company.bankSwift,
        time_zone: "Asia/Bahrain",
        logo_url: "/api/files/brand/logo-dark.png",
        dark_logo_url: "/api/files/brand/logo-light.png",
        full_logo_url: "/api/files/brand/logo-dark.png",
        dark_full_logo_url: "/api/files/brand/logo-light.png",
        icon_url: "/api/files/brand/icon-light.png",
        dark_icon_url: "/api/files/brand/icon-dark.png",
        stamp_url: "/api/files/brand/stamp.png",
        signature_url: "/api/files/brand/signature.png",
        document_header_url: "/api/files/media/banners/banner-01.png",
        document_footer_url: "/api/files/media/banners/banner-02.png",
        payment_terms_days: 30,
        invoice_prefix: pfx,
        invoice_next_number: 150,
        receipt_prefix: "RCT",
        receipt_next_number: 150,
        ceo_name_en: company.ceoEn,
        ceo_name_ar: company.ceoAr,
        ceo_title_en: company.ceoTitleEn,
        ceo_title_ar: company.ceoTitleAr,
        ceo_quote_en: `Precision delivery from ${company.city} across the GCC.`,
        ceo_quote_ar: `التميز التشغيلي من ${company.city} إلى جميع أسواق الخليج.`,
        tagline_en: company.taglineEn,
        tagline_ar: company.taglineAr,
        about_text_en: company.aboutEn,
        about_text_ar: company.aboutAr,
        mission_en: `Deliver benchmark ${company.activity.replace(/_/g, " ")} services with clear bilingual accountability.`,
        mission_ar: `تقديم خدمات موثوقة ثنائية اللغة وفق أعلى معايير الجودة والالتزام.`,
        vision_en: `To lead Bahrain's enterprise ecosystem in ${company.activity.replace(/_/g, " ")} innovation.`,
        vision_ar: `أن نكون الشريك المرجعي الأول لقطاع الأعمال في مملكة البحرين والخليج.`,
        terms_en: `Invoices are payable within 30 calendar days in ${cur}. Late balances accrue documented reminders.`,
        terms_ar: `تستحق الفواتير خلال 30 يوماً بعملة ${cur} وفق شروط العقد المعتمد.`,
        rules_en: `10% VAT compliant with Bahrain NBR e-invoicing guidelines; signed approvals logged digitally.`,
        rules_ar: `تطبق ضريبة القيمة المضافة 10% وفق متطلبات الجهاز الوطني للإيرادات.`,
        founded_year: company.foundedYear,
        city: company.city,
        country: "BH",
        primary_language: "ar",
        business_activity: company.activity,
        default_discount_limit_percent: 15,
        quotations_always_need_approval: false,
        theme: themeJson || companyJson.company.theme || {},
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
        code: { company: company.slug, analytics: true },
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
        updated_by_id: "super-admin",
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

  // Services & Catalog Product List (already loaded from getActivityCatalog)
  // system.service rows are emitted cleanly by generate-seeds.cjs across all catalog.services.

  // Operational / Studio Equipment (12 items from industry catalog + field diagnostics)
  const equipmentItems = [
    ...catalog.equipment,
    { code: `${pfx}-EQ-09`, nameEn: `${company.shortEn} Mobile Diagnostics Kit`, nameAr: `حقيبة فحص ميدانية ${company.shortAr}`, cat: "Field & Mobility", dailyRate: 35, assetValue: 480 },
    { code: `${pfx}-EQ-10`, nameEn: `${company.shortEn} Telemetry Base Station`, nameAr: `محطة قياس وتشغيل ${company.shortAr}`, cat: "Support & Diagnostics", dailyRate: 52, assetValue: 820 },
    { code: `${pfx}-EQ-11`, nameEn: `${company.shortEn} Backup Power Rack`, nameAr: `وحدة طاقة احتياطية ${company.shortAr}`, cat: "Infrastructure", dailyRate: 44, assetValue: 690 },
    { code: `${pfx}-EQ-12`, nameEn: `${company.shortEn} Calibration Bench Suite`, nameAr: `منصة معايرة وضبط الجودة`, cat: "Quality", dailyRate: 68, assetValue: 960 },
  ];
  equipmentItems.forEach((eq, i) => {
    lines.push(
      ins(
        "system.studio_equipment",
        {
          id: `eq-${String(i + 1).padStart(2, "0")}`,
          category: eq.cat,
          name_en: eq.nameEn,
          name_ar: eq.nameAr,
          brand: ["Apple", "Bosch", "Schneider", "Siemens", "DJI", "Sony", "Honeywell", "Dell", "Honeywell", "APC", "Fluke", "Cisco"][i % 12],
          daily_rate_bhd: eq.dailyRate,
          quantity: (i % 4) + 1,
          specification: `${eq.code} — enterprise-grade ${company.activity} unit calibrated 2026`,
          description_en: `Maintained operational asset (${eq.code}) assigned to ${company.shortEn} teams.`,
          description_ar: `أصل تشغيلي معتمد (${eq.code}) ومخصص لفرق العمل في ${company.shortAr}.`,
          image_url: `/api/files/media/banners/banner-0${(i % 3) + 1}.png`,
          display_order: i + 1,
          created_at: ago(45),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Projects (12)
  const projectDepts = ["d-ops", "d-sales", "d-mkt", "d-fin", "d-prod", "d-cs"];
  for (let i = 1; i <= 12; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const owner = i === 1 || i === 9 ? staffRoster[0] : staffRoster[(i + 2) % staffRoster.length];
    const theme = catalog.portfolioThemes[(i - 1) % catalog.portfolioThemes.length];
    lines.push(
      ins(
        "system.project",
        {
          id: `prj-${String(i).padStart(3, "0")}`,
          code: `${pfx}-PRJ-2026-${String(i).padStart(2, "0")}`,
          name: `${cust.nameEn} — ${theme ? theme.en : svc.en}`,
          description: `End-to-end delivery of ${svc.en} for ${cust.nameEn} led by ${owner.nameEn}.`,
          status: i <= 4 ? "completed" : i <= 9 ? "active" : "planned",
          department_id: projectDepts[(i - 1) % projectDepts.length],
          owner_id: owner.id,
          color: company.theme.primary,
          start_date: dateAgo(Math.max(5, 75 - i * 5)),
          due_date: dateAhead(10 + i * 7),
          created_by_id: "super-admin",
          created_at: ago(Math.max(5, 75 - i * 5)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Announcements (8) + Receipts
  for (let i = 1; i <= 8; i++) {
    const annId = `ann-${String(i).padStart(2, "0")}`;
    lines.push(
      ins(
        "system.announcement",
        {
          id: annId,
          reference: `${pfx}-ANN-2026-${String(i).padStart(2, "0")}`,
          title_en: `Operational & Governance Brief #${i} — ${svcList[(i - 1) % svcList.length].cat}`,
          title_ar: `التعميم التشغيلي والحوكمة رقم ${i} — ${company.shortAr}`,
          body_en: `All ${company.shortEn} department leads must verify updated SLA targets, Q4 close schedules, and Bahrain NBR audit checklists.`,
          body_ar: `يرجى من جميع رؤساء الأقسام في ${company.shortAr} مراجعة أهداف مستوى الخدمة ومواعيد الإقفال الشهري وقوائم الامتثال.`,
          category: i <= 2 ? "policy" : i <= 5 ? "operations" : "hr",
          priority: i <= 2 ? "high" : "normal",
          audience: "all",
          official: true,
          requires_acknowledgement: i <= 4,
          pinned: i === 1,
          status: "published",
          publish_at: ago(25 - i * 2),
          published_at: ago(25 - i * 2),
          expires_at: ahead(60 + i * 5),
          signed_by_id: "super-admin",
          signature_url: "/api/files/brand/signature.png",
          signed_at: ago(24 - i * 2),
          decision_notes: "Approved by executive desk for mandatory all-hands distribution.",
          created_by_id: "super-admin",
          created_at: ago(25 - i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    for (const readerId of ["super-admin", "omar-haddad", "yusuf-rahman", "karim-fawzi"]) {
      lines.push(
        ins(
          "system.announcement_receipt",
          {
            announcement_id: annId,
            user_id: readerId,
            read_at: ago(16 - i),
            acknowledged_at: i <= 4 ? ago(15 - i) : null,
            hidden_at: i === 8 && readerId === "karim-fawzi" ? ago(1) : null,
          },
          "ON CONFLICT (announcement_id, user_id) DO NOTHING",
        ),
      );
    }
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
        gratuity_rules: {
          law: "Bahrain Labour Law 2012",
          firstThreeYearsDaysPerYear: 15,
          afterThreeYearsDaysPerYear: 30,
          eligibleStatuses: ["resigned", "terminated", "end_of_contract"],
        },
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  // Legal Matters (6) & Events
  for (let i = 1; i <= 6; i++) {
    const matterId = `lgl-${String(i).padStart(2, "0")}`;
    const lt = catalog.legalThemes[(i - 1) % catalog.legalThemes.length];
    const isClosed = i >= 5;
    lines.push(
      ins(
        "system.legal_matter",
        {
          id: matterId,
          number: `${pfx}-LGL-2026-${String(i).padStart(2, "0")}`,
          reference: `${pfx}-LEG-REF-${100 + i}`,
          title: `${lt.en} (${customers[(i - 1) % customers.length].nameEn})`,
          kind: lt.type,
          status: isClosed ? "closed" : "active",
          counterparty: customers[(i - 1) % customers.length].nameEn,
          next_date: dateAhead(10 + i * 5),
          reminded_for: ahead(5 + i * 2),
          assignee_id: "dina-mansoor",
          amount_at_stake: 5000 * i,
          description: `${lt.en} (${lt.ar}) under ${lt.court} compliance review for ${company.shortEn}.`,
          outcome: isClosed ? "Executed cleanly with bilateral sign-off and zero dispute balance." : "Active counsel review in progress.",
          closed_at: isClosed ? ago(5 - (i % 4)) : null,
          created_by_id: "super-admin",
          created_at: ago(35 - i * 3),
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
          kind: isClosed ? "closed" : "note",
          body: `Compliance & Commercial Law verification logged by Dina Mansoor against ${pfx}-LEG-REF-${100 + i}.`,
          by_id: "dina-mansoor",
          at: ago(25 - i * 2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Media Contacts (8), Media Coverage (8), Canned Replies (10), Client Logos (10)
  const mediaNames = [
    "Tariq Al-Jowder", "Mariam Al-Binali", "Hassan Al-Zayani", "Dana Al-Dossary",
    "Rashed Al-Mannai", "Sara Al-Qahtani", "Bader Al-Subaie", "Noora Al-Buainain",
  ];
  const mediaOutlets = [
    "Gulf Business Daily", "Bahrain Tribune", "Al-Ayam Press", "Akhbar Al-Khaleej",
    "MENA Enterprise", "TechGulf", "Bahrain Economic Quarterly", "Gulf Newsroom",
  ];
  for (let i = 1; i <= 8; i++) {
    const mcPhone = `+973398800${String(i).padStart(2, "0")}`;
    const mcpp = splitPhone(mcPhone);
    lines.push(
      ins(
        "system.media_contact",
        {
          id: `mc-${i}`,
          name: mediaNames[i - 1],
          outlet: mediaOutlets[i - 1],
          role: i % 2 === 0 ? "Senior Editor" : "Business Correspondent",
          beat: company.activity,
          email: `press${i}@media-network.bh`,
          phone: mcPhone,
          country_code: mcpp.country_code,
          mobile_number: mcpp.mobile_number,
          notes: `Primary media contact covering ${company.shortEn} announcements in ${company.city}.`,
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
          title: `${company.shortEn} Expands ${company.city} Operations & SLA Standards (#${i})`,
          outlet: mediaOutlets[i - 1],
          url: `https://news.example.bh/articles/${company.slug}-${i}`,
          published_on: dateAgo(i * 10),
          reach: 15000 * i,
          sentiment: "positive",
          article_id: `art-${i}`,
          notes: `Syndicated release featuring executive commentary from ${company.ceoEn}.`,
          created_by_id: "hana-yousef",
          created_at: ago(i * 10),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  const replyTitles = [
    "Initial Inquiry Acknowledgement", "Quotation Follow-Up", "Invoice Payment Confirmation",
    "Delivery Schedule Update", "Support Ticket Escalation", "Project Kickoff Welcome",
    "Renewal Proposal Check-In", "Contract Signature Reminder", "Feedback & NPS Request",
    "SLA Resolution Verification",
  ];
  for (let i = 1; i <= 10; i++) {
    lines.push(
      ins(
        "system.canned_reply",
        {
          id: `cr-${i}`,
          title: replyTitles[i - 1],
          body_en: `Thank you for contacting ${company.shortEn}. Regarding ${replyTitles[i - 1].toLowerCase()}, our specialist team is reviewing your record and will respond shortly.`,
          body_ar: `شكراً لتواصلكم مع ${company.shortAr}. يقوم فريقنا المختص بمتابعة الطلب وسيتواصل معكم قريباً.`,
          is_active: true,
          sort_order: i,
          created_at: ago(30),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const cust = customers[(i - 1) % customers.length];
    lines.push(
      ins(
        "system.client_logo",
        {
          id: `clogo-${i}`,
          name: cust.nameEn,
          logo_url: i % 2 === 0 ? "/api/files/brand/logo-light.png" : "/api/files/brand/logo-dark.png",
          website_url: `https://client-${i}.example.bh`,
          is_dark_logo: i % 2 === 0,
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

  for (let i = 1; i <= 12; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const pTheme = catalog.portfolioThemes[(i - 1) % catalog.portfolioThemes.length];
    const artTopic = catalog.articleTopics[(i - 1) % catalog.articleTopics.length];
    const faqItem = catalog.faqTopics[(i - 1) % catalog.faqTopics.length];
    lines.push(
      ins(
        "cms.portfolio_item",
        {
          id: `port-${i}`,
          category_id: portCats[(i - 1) % portCats.length].id,
          slug: `${company.slug}-case-${i}`,
          title_en: pTheme ? `${pTheme.en}` : `${cust.nameEn} — ${svc.en}`,
          title_ar: pTheme ? `${pTheme.ar}` : `${cust.nameAr} — ${svc.ar}`,
          client_name: cust.nameEn,
          year: 2026 - (i % 2),
          subtitle_en: `Delivered for ${cust.nameEn} across ${company.city} with measurable SLA benchmarks.`,
          subtitle_ar: `تم التنفيذ لصالح ${cust.nameAr} في ${company.city} وفق أعلى معايير الجودة والالتزام.`,
          price: Number((svc.rate * ((i % 3) + 1)).toFixed(3)),
          price_note_en: `Turnkey scope including 10% NBR VAT compliance (${cur})`,
          price_note_ar: `باقة تنفيذ متكاملة شاملة التقارير وضريبة القيمة المضافة`,
          external_url: `https://${domainHost}/work/${company.slug}-case-${i}`,
          location: `${company.city}, Bahrain`,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.article",
        {
          id: `art-${i}`,
          slug: artTopic.slug,
          title_en: artTopic.titleEn,
          title_ar: artTopic.titleAr,
          excerpt_en: `Key operational benchmarks, real metrics, and 2026 guidance from ${company.shortEn} in ${company.city}.`,
          excerpt_ar: `أبرز المعايير التشغيلية والأرقام الموثقة وإرشادات 2026 من ${company.shortAr} في ${company.city}.`,
          body_en: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${company.aboutEn} Focusing on ${svc.en}, our teams help Gulf enterprises scale reliably.` }] }] },
          body_ar: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `${company.aboutAr} من خلال خدمة ${svc.ar} نساعد المؤسسات على النمو المستدام.` }] }] },
          body_html_en: `<p>${company.aboutEn}</p><p>Focusing on <strong>${svc.en}</strong>, our ${company.city} specialists help Gulf organizations standardize turnaround times and audit transparency.</p>`,
          body_html_ar: `<p>${company.aboutAr}</p><p>من خلال خدمة <strong>${svc.ar}</strong>، يعمل فريقنا في ${company.city} على توحيد سرعة التسليم ووضوح التدقيق.</p>`,
          cover_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          seo_title_en: `${artTopic.titleEn} | ${company.shortEn}`,
          seo_title_ar: `${artTopic.titleAr} | ${company.shortAr}`,
          seo_description_en: `Executive guide by ${company.shortEn} covering ${svc.en} benchmarks in Bahrain.`,
          seo_description_ar: `دليل تنفيذي من ${company.shortAr} حول معايير ${svc.ar} في البحرين.`,
          category: artTopic.cat,
          tags: [company.activity, artTopic.cat.toLowerCase(), company.city, "2026"],
          author_name: i % 2 === 0 ? "Bader Ali" : "Hana Yousef",
          status: company.hasWeb ? "published" : "draft",
          publish_at: ago(i * 6),
          featured: i <= 3,
          created_at: ago(i * 6),
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
          question_en: faqItem.qEn,
          question_ar: faqItem.qAr,
          answer_en: faqItem.aEn,
          answer_ar: faqItem.aAr,
          category: faqItem.cat,
          is_published: company.hasWeb,
          sort_order: i,
          created_at: ago(45),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 15; i++) {
    const cust = customers[(i - 1) % customers.length];
    lines.push(
      ins(
        "cms.review",
        {
          id: `rev-${i}`,
          author_en: cust.contactEn || `Executive Director ${i}`,
          author_ar: `المدير التنفيذي ${i}`,
          company_en: cust.nameEn,
          company_ar: cust.nameAr,
          quote_en: `Working with ${company.shortEn} on ${svcList[(i - 1) % svcList.length].en} streamlined our operations and exceeded SLA targets.`,
          quote_ar: `التعاون مع ${company.shortAr} في ${svcList[(i - 1) % svcList.length].ar} رفع كفاءة عملياتنا وتجاوز توقعات التسليم.`,
          rating: i % 5 === 0 ? 4 : 5,
          is_approved: true,
          sort_order: i,
          year: 2026,
          created_at: ago(i * 5),
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
          created_at: ago(90),
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
          value: 4800 + idx * 2150,
          source_provider: pl,
          source_account_id: company.slug,
          recorded_at: ago(1),
          is_stale: false,
          error_status: idx === 2 ? "recovered" : "ok",
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 12; i++) {
    const pl = platforms[(i - 1) % platforms.length];
    const svc = svcList[(i - 1) % svcList.length];
    const isPub = i <= 6;
    lines.push(
      ins(
        "cms.social_post",
        {
          id: `spost-${i}`,
          platform: pl,
          external_id: `${company.slug}-${pl}-${i}`,
          source_provider: pl,
          source_account_id: company.slug,
          caption: `${company.shortEn} spotlight: ${svc.en} delivered in ${company.city}.`,
          media_type: i % 3 === 0 ? "video" : i % 2 === 0 ? "carousel" : "image",
          permalink: `https://${pl}.com/p/${company.slug}-${i}`,
          thumbnail_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          published_at: ago(i * 3),
          likes: 145 + i * 38,
          comments: 12 + i * 3,
          shares: 18 + i * 2,
          views: 2100 + i * 440,
          reach: 1750 + i * 360,
          saves: 26 + i * 4,
          fetched_at: now,
          created_at: ago(i * 3),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "cms.social_content_plan",
        {
          id: `scplan-${i}`,
          title: `${company.shortEn} Editorial Feature #${i} — ${svc.cat}`,
          caption: `How regional leaders deploy ${svc.en} with ${company.shortEn}.`,
          scheduled_for: isPub ? ago(i * 2) : ahead(i * 2),
          status: isPub ? "published" : "scheduled",
          media_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          published_url: isPub ? `https://${pl}.com/p/${company.slug}-${i}` : null,
          assignee_id: "hana-yousef",
          created_by_id: "hana-yousef",
          created_at: ago(14),
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
    { id: "stg-lead", en: "New Lead", ar: "عميل محتمل", prob: 10, ord: 1, kind: "open", color: "#6366F1" },
    { id: "stg-new", en: "Qualified", ar: "مؤهل", prob: 25, ord: 2, kind: "open", color: "#3B82F6" },
    { id: "stg-prop", en: "Proposal Sent", ar: "عرض سعر", prob: 50, ord: 3, kind: "open", color: "#F59E0B" },
    { id: "stg-neg", en: "Negotiation", ar: "تفاوض", prob: 80, ord: 4, kind: "open", color: "#8B5CF6" },
    { id: "stg-won", en: "Closed Won", ar: "مغلق ناجح", prob: 100, ord: 5, kind: "won", color: "#10B981" },
    { id: "stg-lost", en: "Closed Lost", ar: "مغلق خاسر", prob: 0, ord: 6, kind: "lost", color: "#EF4444" },
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
          color: st.color,
          is_system: true,
          is_active: true,
          created_at: ago(120),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const areas = ["Seef", "Diplomatic Area", "Hidd", "Riffa", "Juffair", "Adliya", "Amwaj", "Saar"];
  const nats = ["BH", "BH", "SA", "AE", "KW", "QA", "GB", "US"];
  customers.forEach((c, idx) => {
    const [cfEn, ...clEn] = c.nameEn.split(" ");
    const clName = clEn.join(" ") || "Group";
    const pp = splitPhone(c.phone);
    const cntId = `cnt-${idx + 1}`;
    const isSup = idx >= 8 && idx <= 9;
    const isIndiv = idx % 10 === 7;
    const area = areas[idx % areas.length];
    const postal = String(100 + ((idx * 17) % 899));
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
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          password_hash: defaultPasswordHash,
          email_verified_at: ago(55 - (idx % 30)),
          locale: idx % 2 === 0 ? "ar" : "en",
          google_sub: idx % 5 === 0 ? `google-${company.slug}-${c.id}` : null,
          apple_sub: idx % 7 === 0 ? `apple-${company.slug}-${c.id}` : null,
          marketing_opt_in: idx % 3 !== 0,
          crm_contact_id: cntId,
          loyalty_points: company.hasStore ? 500 + (idx % 12) * 250 : 0,
          wallet_balance: company.hasStore && idx % 3 === 0 ? Number((15 + (idx % 6) * 2.5).toFixed(3)) : 0,
          discount_percent: company.hasStore ? (idx === 0 ? 10 : idx < 4 ? 5 : 0) : 0,
          tier: company.hasStore ? (idx === 0 ? "platinum" : idx < 4 ? "gold" : idx < 10 ? "silver" : "standard") : "standard",
          preferred_currency: cur,
          status: "active",
          created_at: ago(Math.max(5, 65 - idx)),
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
          address_type: "office",
          name: c.nameEn,
          phone: c.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          line1: `Building ${120 + idx * 3}, Road ${28 + (idx % 40)}`,
          line2: `Block ${302 + (idx % 50)}, Floor ${(idx % 8) + 1}`,
          area,
          city: c.city,
          state: "Capital Governorate",
          postal_code: postal,
          country: "BH",
          is_default: true,
          created_at: ago(Math.max(5, 65 - idx)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (idx < 12) {
      lines.push(
        ins(
          "commerce.customer_address",
          {
            id: `addr-wh-${idx + 1}`,
            customer_id: c.id,
            label: "Receiving Dock",
            address_type: "shipping",
            name: `${c.nameEn} Warehouse`,
            phone: c.phone,
            country_code: pp.country_code,
            mobile_number: pp.mobile_number,
            line1: `Plot ${45 + idx}, Industrial Road ${12 + idx}`,
            line2: `Gate B-${idx + 1}`,
            area: "Hidd",
            city: "Muharraq",
            state: "Muharraq Governorate",
            postal_code: String(115 + idx),
            country: "BH",
            is_default: false,
            created_at: ago(40),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    lines.push(
      ins(
        "sales.contact",
        {
          id: cntId,
          first_name: cfEn,
          last_name: clName,
          email: c.email,
          phone: c.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          company: c.nameEn,
          contact_type: isSup ? "supplier" : "client",
          notes: `Key ${company.city} enterprise account active across 2026.`,
          tags: [isSup ? "supplier" : "enterprise", company.activity, c.city],
          status: "active",
          created_at: ago(Math.max(5, 65 - idx)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "sales.crm_contact",
        {
          id: cntId,
          first_name: cfEn,
          last_name: clName,
          email: c.email,
          email_norm: c.email.toLowerCase(),
          phone: c.phone,
          phone_e164: c.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          company_name: c.nameEn,
          company_name_ar: c.nameAr,
          job_title: isSup ? "Commercial Director" : "Head of Procurement",
          contact_type: isSup ? "supplier" : "client",
          client_kind: isIndiv ? "individual" : idx % 12 === 11 ? "government" : "company",
          company_origin: idx % 6 === 5 ? "gcc" : "bahrain",
          legal_form: idx % 12 === 11 ? "gov_entity" : "wll",
          cr_number: `CR-${210400 + idx}-1`,
          cr_expiry_date: ahead(365),
          vat_number: `2000${210400 + idx}0002`,
          registration_number: `REG-${pfx}-${1000 + idx}`,
          registration_country: "BH",
          government_type: idx % 12 === 11 ? "ministry_directorate" : "private_sector",
          supplier_number: isSup ? `SUP-${100 + idx}` : `VND-${100 + idx}`,
          requires_purchase_order: idx % 2 === 0,
          nationality: nats[idx % nats.length],
          industry: company.activity,
          website: `https://account-${idx + 1}.example.bh`,
          preferred_language: idx % 2 === 0 ? "ar" : "en",
          payment_terms_days: 30,
          address_country: "BH",
          address_city: c.city,
          address_area: area,
          address_block: String(302 + (idx % 50)),
          address_road: String(28 + (idx % 40)),
          address_building: String(120 + idx * 3),
          address_unit: String((idx % 12) + 1),
          address_line: `Building ${120 + idx * 3}, Road ${28 + (idx % 40)}, ${area}`,
          address_state: "Capital Governorate",
          address_postal_code: postal,
          address_po_box: String(5100 + idx),
          notes: `Verified KYC & NBR VAT registration for ${c.nameEn}.`,
          supplier_lead_time_days: isSup ? 5 : 7,
          supplier_payment_terms_days: 30,
          created_at: ago(Math.max(5, 65 - idx)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const suppliers = [
    { id: "cnt-9", firstEn: "Khalid", lastEn: "Al-Doseri", email: "sales@gulfequipment.bh", phone: "+97317410099", companyEn: "Gulf Equipment Suppliers W.L.L.", companyAr: "شركة الخليج لتوريد المعدات ذ.م.م", city: "Salmabad", cr: "CR-88410-1", vat: "200008841000002" },
    { id: "cnt-10", firstEn: "Mariam", lastEn: "Al-Binali", email: "dispatch@manamalogistics.bh", phone: "+97317420088", companyEn: "Manama Industrial Logistics Co.", companyAr: "شركة المنامة للخدمات اللوجستية الصناعية", city: "Hidd", cr: "CR-91205-2", vat: "200009120500002" },
  ];
  for (const sup of suppliers) {
    const pp = splitPhone(sup.phone);
    lines.push(
      ins(
        "sales.contact",
        {
          id: sup.id,
          first_name: sup.firstEn,
          last_name: sup.lastEn,
          email: sup.email,
          phone: sup.phone,
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          company: sup.companyEn,
          contact_type: "supplier",
          notes: `Preferred Tier-1 Bahrain vendor (${sup.cr}).`,
          tags: ["supplier", "preferred", sup.city],
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
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          company_name: sup.companyEn,
          company_name_ar: sup.companyAr,
          job_title: "Key Account Manager",
          contact_type: "supplier",
          client_kind: "company",
          company_origin: "bahrain",
          legal_form: "wll",
          cr_number: sup.cr,
          cr_expiry_date: ahead(400),
          vat_number: sup.vat,
          registration_number: sup.cr,
          registration_country: "BH",
          government_type: "private_sector",
          supplier_number: sup.id.toUpperCase(),
          requires_purchase_order: true,
          nationality: "BH",
          industry: "industrial_supply",
          website: `https://${sup.id}.example.bh`,
          preferred_language: "en",
          payment_terms_days: 30,
          address_country: "BH",
          address_city: sup.city,
          address_area: sup.city,
          address_block: "704",
          address_road: "412",
          address_building: "88",
          address_unit: "2",
          address_line: `Building 88, Road 412, ${sup.city}`,
          address_state: "Southern Governorate",
          address_postal_code: "704",
          address_po_box: "20400",
          notes: `Master vendor framework active for ${company.shortEn}.`,
          supplier_lead_time_days: 4,
          supplier_payment_terms_days: 30,
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

  // 30 Deals (all 6 stages) + 24 Inquiries + 24 Quotations (48 line items each) + 10 Campaigns
  for (let i = 1; i <= 30; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const svc2 = svcList[i % svcList.length];
    const stage =
      i <= 14 ? "stg-won" : i <= 18 ? "stg-prop" : i <= 22 ? "stg-neg" : i <= 25 ? "stg-new" : i <= 27 ? "stg-lead" : "stg-lost";
    const status = stage === "stg-won" ? "won" : stage === "stg-lost" ? "lost" : "open";
    const prob = stage === "stg-won" ? 100 : stage === "stg-lost" ? 0 : stage === "stg-neg" ? 80 : stage === "stg-prop" ? 50 : 25;
    const qty1 = (i % 4) + 1;
    const val = Number((svc.rate * qty1).toFixed(3));
    const dealId = `deal-${i}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const inqId = i <= 24 ? `inq-${i}` : null;
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
          probability: prob,
          expected_close_date: dateAhead(i * 3),
          status,
          assigned_to: i % 4 === 0 ? "super-admin" : i % 3 === 0 ? "ahmed-zayani" : "sami-khoury",
          notes: `Pipeline opportunity ${dealId} covering ${svc.en} in ${cust.city}.`,
          created_at: ago(Math.max(2, 70 - i * 2)),
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
          source_inquiry_id: inqId,
          title: `${cust.nameEn} — ${svc.en}`,
          deal_stage: stage,
          deal_value: val,
          currency: cur,
          probability: prob,
          shoot_date: ahead(14 + i),
          expected_close_date: dateAhead(i * 3),
          lost_reason: status === "lost" ? "Deferred budget allocation to Q1 2027 cycle" : null,
          notes: `CRM deal workspace linked to ${contactId} (${cust.city}).`,
          assigned_to: i % 4 === 0 ? "super-admin" : i % 3 === 0 ? "ahmed-zayani" : "sami-khoury",
          created_at: ago(Math.max(2, 70 - i * 2)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 24) {
      const custPhone = splitPhone(cust.phone);
      lines.push(
        ins(
          "sales.inquiry",
          {
            id: inqId,
            inquiry_type: i % 3 === 0 ? "consultation" : "proposal",
            subject: `Request for Proposal: ${svc.en}`,
            message: `Hello ${company.shortEn}, we would like a formal quotation for ${svc.en} at our ${cust.city} office.`,
            status: i <= 14 ? "converted" : i <= 20 ? "in_review" : "new",
            priority: i <= 6 ? "high" : "normal",
            requester_name: cust.nameEn,
            requester_email: cust.email,
            requester_phone: cust.phone,
            requester_country_code: custPhone.country_code,
            requester_mobile_number: custPhone.mobile_number,
            assignee_id: i % 3 === 0 ? "ahmed-zayani" : "sami-khoury",
            deal_id: dealId,
            created_at: ago(Math.max(2, 72 - i * 2)),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      const qId = `qt-${String(i).padStart(3, "0")}`;
      const qNum = `${pfx}-QT-2026-${200 + i}`;
      const item2Rate = Number((svc2.rate * 0.5).toFixed(3));
      const grossSub = Number((val + item2Rate).toFixed(3));
      const discAmt = i % 4 === 0 ? Number((grossSub * 0.05).toFixed(3)) : 0;
      const sub = Number((grossSub - discAmt).toFixed(3));
      const vat = Number((sub * 0.1).toFixed(3));
      const tot = Number((sub + vat).toFixed(3));
      const qStatus = i <= 14 ? "accepted" : i <= 19 ? "sent" : i <= 22 ? "rejected" : "draft";
      const issuedAgo = Math.max(2, 65 - i * 2);
      lines.push(
        ins(
          "sales.quotation",
          {
            id: qId,
            quotation_number: qNum,
            deal_id: dealId,
            contact_id: contactId,
            client_id: contactId,
            inquiry_id: inqId,
            invoice_id: i <= 14 ? `inv-${String(i).padStart(3, "0")}` : null,
            status: qStatus,
            subtotal: sub,
            discount: discAmt,
            discount_type: discAmt > 0 ? "percent" : "none",
            discount_value: discAmt > 0 ? 5.0 : 0,
            discount_amount: discAmt,
            vat_rate: 10.0,
            vat_amount: vat,
            other_tax_amount: 0,
            total: tot,
            total_amount: tot,
            currency: cur,
            raw_rate: 1.0,
            fx_margin_percent: 0,
            effective_rate: 1.0,
            valid_until: ahead(30),
            issue_date: dateAgo(issuedAgo),
            valid_until_date: dateAhead(30),
            vat_enabled: true,
            vat_percentage: 10.0,
            language: i % 3 === 0 ? "ar" : "en",
            revision: 1,
            approval_revision: 1,
            content_hash: crypto.createHash("sha256").update(`${company.slug}:${qNum}:${tot}`).digest("hex"),
            terms: "Valid 30 days. Net 30 settlement upon invoice issue. 10% Bahrain VAT included.",
            terms_en: "Quotation valid for 30 days. 50% mobilization upon PO, 50% on final sign-off.",
            terms_ar: "يسري عرض السعر لمدة 30 يوماً. الدفع 50% عند التعميد و50% عند التسليم النهائي.",
            notes: `Prepared for ${cust.nameEn} (${cust.city}) covering ${svc.en}.`,
            issued_at: qStatus !== "draft" ? ago(issuedAgo) : null,
            accepted_at: qStatus === "accepted" ? ago(Math.max(1, issuedAgo - 2)) : null,
            rejected_at: qStatus === "rejected" ? ago(3) : null,
            acceptance_evidence: qStatus === "accepted" ? `Verified digital sign-off for ${qNum}` : null,
            pdf_storage_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
            delivery_channel: qStatus === "draft" ? null : "email",
            delivered_at: qStatus !== "draft" ? ago(issuedAgo) : null,
            signed_by_id: qStatus === "accepted" ? "super-admin" : null,
            signed_at: qStatus === "accepted" ? ago(Math.max(1, issuedAgo - 2)) : null,
            signer_signature_url: qStatus === "accepted" ? "/api/files/brand/signature.png" : null,
            created_by_id: "sami-khoury",
            sales_owner_id: i % 4 === 0 ? "super-admin" : "sami-khoury",
            created_at: ago(issuedAgo),
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
            item_kind: "service",
            service_id: `svc-${((i - 1) % svcList.length) + 1}`,
            product_id: null,
            variant_id: "",
            sku: svc.code,
            unit: svc.unit || "engagement",
            description: svc.en,
            description_en: svc.en,
            description_ar: svc.ar,
            quantity: qty1,
            unit_price: svc.rate,
            tax_rate: 10.0,
            amount: val,
            sort_order: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      const prod2 = prodList[(i - 1) % prodList.length];
      lines.push(
        ins(
          "sales.quotation_item",
          {
            id: `qti-${i}-2`,
            quotation_id: qId,
            item_kind: "service",
            service_id: `svc-${(i % svcList.length) + 1}`,
            product_id: `prod-${((i - 1) % prodList.length) + 1}`,
            variant_id: `var-${((i - 1) % prodList.length) + 1}`,
            sku: prod2.sku,
            unit: svc2.unit || "engagement",
            description: `${svc2.en} — Advisory & Mobilization`,
            description_en: `${svc2.en} — Advisory & Mobilization`,
            description_ar: `${svc2.ar} — الاستشارة والتجهيز`,
            quantity: 1,
            unit_price: item2Rate,
            tax_rate: 10.0,
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
            quantity: qty1,
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
    "Bahrain National Day Showcase",
    "VIP Client Referral Program",
  ];
  for (let i = 1; i <= 10; i++) {
    lines.push(
      ins(
        "sales.campaign",
        {
          id: `cmp-${i}`,
          name: `${company.shortEn} ${campaignTitles[i - 1]}`,
          subject: `Partner with ${company.shortEn} for ${svcList[(i - 1) % svcList.length].en}`,
          body: `Explore ${company.shortEn}'s enterprise capabilities and dedicated local support across Bahrain.`,
          status: i <= 7 ? "sent" : "draft",
          sent_at: i <= 7 ? ago(i * 9) : null,
          code: `${pfx}-CMP-${String(i).padStart(2, "0")}`,
          channel: i % 3 === 0 ? "whatsapp" : i % 2 === 0 ? "email" : "linkedin",
          coupon_code: i === 1 ? "WELCOME10" : `${pfx}${10 + i}`,
          notes: `Targeted GCC enterprise campaign track #${i}.`,
          start_date: dateAgo(i * 10),
          end_date: dateAhead(30),
          budget: 800 * i,
          spend: 450 * i,
          utm_campaign: `${company.slug}_c${i}`,
          owner_id: "hana-yousef",
          created_by_id: "hana-yousef",
          created_at: ago(i * 10),
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
    { id: "ec-ops", code: "OPS", en: "Operations", ar: "تشغيل", slug: "operations", color: "#2563EB" },
    { id: "ec-rent", code: "RNT", en: "Facility & Rent", ar: "إيجارات ومرافق", slug: "facility-rent", color: "#7C3AED" },
    { id: "ec-tech", code: "TCH", en: "Software & Cloud", ar: "برمجيات وسحابة", slug: "software-cloud", color: "#059669" },
    { id: "ec-mkt", code: "MKT", en: "Marketing & PR", ar: "تسويق وعلاقات عامة", slug: "marketing-pr", color: "#D97706" },
    { id: "ec-trv", code: "TRV", en: "Travel & Fleet", ar: "سفر وأسطول", slug: "travel-fleet", color: "#DC2626" },
    { id: "ec-util", code: "UTL", en: "Utilities & Telecom", ar: "كهرباء واتصالات", slug: "utilities", color: "#0891B2" },
    { id: "ec-legal", code: "LGL", en: "Legal & Compliance", ar: "الشؤون القانونية والامتثال", slug: "legal-compliance", color: "#4F46E5" },
    { id: "ec-hr", code: "HRD", en: "People & Training", ar: "الموارد البشرية والتدريب", slug: "people-training", color: "#DB2777" },
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
          color: ec.color,
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
    { id: "pm-wire", code: "wire_transfer", en: "International Wire", ar: "حوالة دولية" },
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
          unit: p.unit || "unit",
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
    const pp = splitPhone(c.phone);
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
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (const sup of suppliers) {
    const pp = splitPhone(sup.phone);
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
          country_code: pp.country_code,
          mobile_number: pp.mobile_number,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 24; i++) {
    const svc = svcList[(i - 1) % svcList.length];
    const svc2 = svcList[i % svcList.length];
    const qty1 = (i % 4) + 1;
    const val = svc.rate * qty1;
    const item2Rate = Number((svc2.rate * 0.5).toFixed(3));
    const grossSub = Number((val + item2Rate).toFixed(3));
    const discAmt = i % 4 === 0 ? Number((grossSub * 0.05).toFixed(3)) : 0;
    const sub = Number((grossSub - discAmt).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const qStatus = i <= 14 ? "accepted" : i <= 19 ? "sent" : i <= 22 ? "rejected" : "draft";
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
          discount: discAmt,
          vat_rate: 10.0,
          vat_amount: vat,
          total: tot,
          status: qStatus,
          items: [
            { description: svc.en, quantity: qty1, unitPrice: svc.rate, amount: val },
            { description: `${svc2.en} — Advisory & Mobilization`, quantity: 1, unitPrice: item2Rate, amount: item2Rate },
          ],
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // 40 Invoices spanning past 176 days -> 4 days + line items + payments + allocations
  const paidPaymentIds = [];
  for (let i = 1; i <= 40; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svcIdx1 = (i - 1) % svcList.length;
    const svcIdx2 = i % svcList.length;
    const svc = svcList[svcIdx1];
    const svc2 = svcList[svcIdx2];
    const prodIdx = (i - 1) % prodList.length;
    const prod = prodList[prodIdx];
    const invId = `inv-${String(i).padStart(3, "0")}`;
    const invNum = `${pfx}-2026-${100 + i}`;
    const daysBack = Math.max(4, 180 - i * 4);
    const qty1 = (i % 3) + 1;
    const qty2 = 1;
    const line1 = Number((svc.rate * qty1).toFixed(3));
    const useProdLine2 = i % 2 === 0;
    const line2Unit = useProdLine2 ? prod.price : Number((svc2.rate * 0.4).toFixed(3));
    const line2 = line2Unit;
    const grossSub = Number((line1 + line2).toFixed(3));
    const discAmt = i % 5 === 0 ? Number((grossSub * 0.05).toFixed(3)) : 0;
    const sub = Number((grossSub - discAmt).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const isPaid = i <= 28;
    const isPartial = i >= 29 && i <= 33;
    const isSent = i >= 34 && i <= 38;
    const paid = isPaid ? tot : isPartial ? Number((tot * 0.5).toFixed(3)) : 0;
    const bal = Number((tot - paid).toFixed(3));
    const status = isPaid ? "paid" : isPartial ? "partially_paid" : isSent ? "sent" : "draft";
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const dealRefId = `deal-${((i - 1) % 30) + 1}`;
    const qtRefId = i <= 14 ? `qt-${String(i).padStart(3, "0")}` : null;
    const dueDate = i <= 36 ? dateAgo(Math.max(1, daysBack - 30)) : dateAhead(15);

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
          due_date: dueDate,
          subtotal: sub,
          discount: discAmt,
          discount_type: discAmt > 0 ? "percent" : "none",
          discount_value: discAmt > 0 ? 5.0 : 0,
          discount_amount: discAmt,
          vat_rate: 10.0,
          vat_amount: vat,
          other_tax_amount: 0,
          total: tot,
          total_amount: tot,
          amount_paid: paid,
          balance_due: bal,
          currency: cur,
          vat_enabled: true,
          vat_percentage: 10.0,
          language: i % 3 === 0 ? "ar" : "en",
          approval_status: status === "draft" ? "pending" : "approved",
          approval_revision: 1,
          content_hash: crypto.createHash("sha256").update(`${company.slug}:${invNum}:${tot}`).digest("hex"),
          pdf_storage_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          delivery_channel: status === "draft" ? null : "email",
          delivered_at: status === "draft" ? null : ago(daysBack),
          notes: `Official tax invoice issued for ${cust.nameEn} (${cust.city}).`,
          notes_en: `Please remit payment within 30 days citing ${invNum} via NBB IBAN or BenefitPay.`,
          notes_ar: `يرجى سداد الفاتورة خلال 30 يوماً مع ذكر المرجع ${invNum} عبر التحويل البنكي أو بنفت باي.`,
          terms: "Net 30 days. 10% Bahrain VAT included per NBR guidelines.",
          signed_by_id: status === "draft" ? null : "super-admin",
          signed_at: status === "draft" ? null : ago(daysBack),
          signer_signature_url: status === "draft" ? null : "/api/files/brand/signature.png",
          created_by_id: i === 1 ? "super-admin" : "layla-nasser",
          sales_owner_id: i % 5 === 0 ? "super-admin" : i % 2 === 0 ? "sami-khoury" : "hana-yousef",
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
          item_kind: "service",
          service_id: `svc-${svcIdx1 + 1}`,
          product_id: null,
          variant_id: "",
          sku: svc.code,
          unit: svc.unit || "engagement",
          description: svc.en,
          description_en: svc.en,
          description_ar: svc.ar,
          quantity: qty1,
          unit_price: svc.rate,
          tax_rate: 10.0,
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
          item_kind: useProdLine2 ? "product" : "service",
          service_id: useProdLine2 ? null : `svc-${svcIdx2 + 1}`,
          product_id: useProdLine2 ? `prod-${prodIdx + 1}` : null,
          variant_id: useProdLine2 ? `var-${prodIdx + 1}` : "",
          sku: useProdLine2 ? prod.sku : svc2.code,
          unit: useProdLine2 ? prod.unit || "unit" : svc2.unit || "engagement",
          description: useProdLine2 ? prod.en : `${svc2.en} — Setup & Support`,
          description_en: useProdLine2 ? prod.en : `${svc2.en} — Setup & Support`,
          description_ar: useProdLine2 ? prod.ar : `${svc2.ar} — التجهيز والدعم`,
          quantity: qty2,
          unit_price: line2Unit,
          tax_rate: 10.0,
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
          service_id: `svc-${svcIdx1 + 1}`,
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
          service_id: `svc-${svcIdx2 + 1}`,
          description_en: `${svc2.en} — Setup & Support`,
          description_ar: `${svc2.ar} — التجهيز والدعم`,
          quantity: qty2,
          unit_price: line2Unit,
          line_total: line2,
          display_order: 2,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (paid > 0) {
      const payId = `pay-${String(i).padStart(3, "0")}`;
      paidPaymentIds.push(payId);
      const payDaysAgo = Math.max(0, daysBack - 3);
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
            payment_date: dateAgo(payDaysAgo),
            reference: `TXN-${pfx}-${1000 + i}`,
            reference_number: `REF-${pfx}-${5000 + i}`,
            receipt_number: `RCT-${pfx}-${100 + i}`,
            receipt_pdf_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
            notification_channel: "email",
            notification_sent: true,
            status: "completed",
            notes: `Settled against ${invNum} for ${cust.nameEn}`,
            created_by_id: i === 1 ? "super-admin" : "faisal-mansour",
            signed_by_id: "super-admin",
            signed_at: ago(payDaysAgo),
            signer_signature_url: "/api/files/brand/signature.png",
            bank_settlement_id: null,
            created_at: ago(payDaysAgo),
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
            allocated_at: ago(payDaysAgo),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // 10 Recurring Expenses (inserted before finance.expense for clean FK order)
  for (let i = 1; i <= 10; i++) {
    const titlesEn = [
      "HQ Office Lease",
      "Enterprise Cloud Hosting",
      "Fiber & SIP Trunks",
      "Accounting & ERP Suite",
      "Fleet Maintenance",
      "Commercial Insurance",
      "Security & Access Control",
      "Annual Software Licenses",
      "Managed CDN & DNS",
      "Facility Cleaning & HVAC",
    ];
    const titlesAr = [
      "إيجار المقر الرئيسي",
      "استضافة السحابة المؤسسية",
      "خطوط الألياف والاتصالات",
      "أنظمة المحاسبة وتخطيط الموارد",
      "صيانة الأسطول",
      "التأمين التجاري",
      "الأمن والتحكم بالدخول",
      "تراخيص البرمجيات السنوية",
      "شبكة توصيل المحتوى المدارة",
      "صيانة التكييف والنظافة",
    ];
    lines.push(
      ins(
        "finance.recurring_expense",
        {
          id: `rexp-${i}`,
          title_en: titlesEn[i - 1],
          title_ar: titlesAr[i - 1],
          category_id: expCats[(i - 1) % expCats.length].id,
          vendor_name: ["Seef Properties", "AWS EMEA", "Batelco", "Zain Cloud", "Al-Ahlia Motors", "Bahrain National Insurance", "G4S Security", "Microsoft Gulf", "Cloudflare Enterprise", "Diyar Services"][i - 1],
          reference: `REC-${pfx}-${10 + i}`,
          amount: 120 * i,
          input_vat_amount: Number((120 * i * 0.1).toFixed(3)),
          is_vat_recoverable: true,
          currency: cur,
          payment_method: "bank_transfer",
          frequency: i >= 8 ? "quarterly" : "monthly",
          start_date: dateAgo(180),
          end_date: dateAhead(365),
          next_due_date: dateAhead(5 + i * 3),
          auto_record: true,
          remind_days_before: 7,
          is_active: true,
          notes: `Recurring facility & infrastructure commitment #${i} under NBB standing instruction.`,
          created_by_id: "layla-nasser",
          last_recorded_at: ago(5 + i),
          created_at: ago(180),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // 48 Expenses (disjoint slices: 1..16 expense_claims, 17..22 commission_payouts, 23..34 supplier_bills, 35..40 agency_invoices, 41..48 recurring/ops)
  for (let i = 1; i <= 48; i++) {
    const cat = expCats[(i - 1) % expCats.length];
    const amt = Number((45 + (i % 16) * 32.5).toFixed(3));
    const vat = Number(((amt * 0.1) / 1.1).toFixed(3));
    const net = Number((amt - vat).toFixed(3));
    const titleSuffix = ["Batelco Fiber", "NBB Facility Lease", "Cloud Infrastructure", "AWS & Backups", "Office Supplies", "Fleet Fuel", "Digital Ads", "Equipment Service", "Courier Settlement", "Legal Advisory"][i % 10];
    const isRecurringExp = i >= 41;
    lines.push(
      ins(
        "finance.expense",
        {
          id: `exp-${String(i).padStart(3, "0")}`,
          title: `${cat.en} — ${titleSuffix} (#${i})`,
          description_en: `Approved operational expenditure for ${cat.en} (${titleSuffix})`,
          description_ar: `مصروف تشغيلي معتمد لبند ${cat.ar} (${titleSuffix})`,
          category_id: cat.id,
          deal_id: `deal-${((i - 1) % 30) + 1}`,
          client_id: `cnt-${((i - 1) % customers.length) + 1}`,
          scope: i % 4 === 0 ? "project" : "company",
          amount: amt,
          net_amount: net,
          input_vat_amount: vat,
          is_vat_recoverable: true,
          is_billable: i % 5 === 0,
          is_recurring: isRecurringExp,
          recurrence_interval: isRecurringExp ? "monthly" : null,
          recurring_expense_id: isRecurringExp ? `rexp-${((i - 41) % 10) + 1}` : null,
          tax_invoice_number: `TAX-${pfx}-${500 + i}`,
          currency: cur,
          expense_date: dateAgo(Math.max(1, 150 - i * 3)),
          status: i <= 44 ? "approved" : "pending",
          vendor: ["Batelco Business", "Seef Properties", "Amazon Web Services", "Zain Bahrain", "Gulf Office Depot", "Bapco Stations"][i % 6],
          vendor_name: ["Batelco Business", "Seef Properties", "Amazon Web Services", "Zain Bahrain", "Gulf Office Depot", "Bapco Stations"][i % 6],
          payment_method: i % 3 === 0 ? "card" : "bank_transfer",
          receipt_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          notes: `Booked to ${cat.code} cost centre (${titleSuffix}).`,
          review_notes: i <= 44 ? "Matched against original NBR VAT tax invoice." : "Awaiting CFO final verification.",
          created_by: i === 1 ? "super-admin" : "faisal-mansour",
          created_by_id: i === 1 ? "super-admin" : "faisal-mansour",
          approved_by: i <= 44 ? "layla-nasser" : null,
          created_at: ago(Math.max(1, 150 - i * 3)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 16; i++) {
    const staff = i === 1 ? staffRoster[0] : staffRoster[i % staffRoster.length];
    const claimStatus = i <= 10 ? "paid" : i <= 13 ? "scheduled" : "pending";
    const daysBack = Math.max(1, 65 - i * 4);
    lines.push(
      ins(
        "finance.expense_claim",
        {
          id: `ecl-${String(i).padStart(3, "0")}`,
          claim_number: `${pfx}-CLM-2026-${String(i).padStart(3, "0")}`,
          claimant_id: staff.id,
          amount: Number((18 + i * 9.5).toFixed(3)),
          currency: cur,
          expense_date: dateAgo(daysBack),
          reason: `Client meeting & field logistics reimbursement (#${i})`,
          category_id: expCats[(i - 1) % expCats.length].id,
          deal_id: `deal-${((i - 1) % 30) + 1}`,
          invoice_id: `inv-${String(i).padStart(3, "0")}`,
          calendar_event_id: `cal-${String(i).padStart(3, "0")}`,
          expense_id: i <= 13 ? `exp-${String(i).padStart(3, "0")}` : null,
          receipt_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          status: claimStatus,
          review_notes: claimStatus === "pending" ? "Receipt attached, awaiting AP review." : "Verified and approved for settlement.",
          scheduled_at: claimStatus !== "pending" ? ago(Math.max(1, daysBack - 1)) : null,
          scheduled_for_date: claimStatus !== "pending" ? dateAgo(Math.max(0, daysBack - 2)) : null,
          scheduled_by_id: claimStatus !== "pending" ? "layla-nasser" : null,
          paid_at: claimStatus === "paid" ? ago(Math.max(0, daysBack - 2)) : null,
          paid_by_id: claimStatus === "paid" ? "faisal-mansour" : null,
          payment_method: claimStatus === "paid" ? "bank_transfer" : null,
          payment_reference: claimStatus === "paid" ? `REIMB-${pfx}-${200 + i}` : null,
          created_at: ago(daysBack),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 6; i++) {
    lines.push(
      ins(
        "finance.bank_settlement",
        {
          id: `bset-${i}`,
          settlement_number: `${pfx}-SET-2026-0${i}`,
          bank_account: companyJson.company.bankIban,
          amount: 2500 + i * 850,
          currency: cur,
          settled_at: ago((7 - i) * 25),
          settlement_date: dateAgo((7 - i) * 25),
          bank_reference: `NBB-STMT-2026-${String(i).padStart(2, "0")}`,
          payment_id: `pay-${String(i).padStart(3, "0")}`,
          status: "reconciled",
          notes: `Monthly NBB statement reconciliation #${i}`,
          created_at: ago((7 - i) * 25),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  paidPaymentIds.forEach((pId, idx) => {
    const bsetId = `bset-${(idx % 6) + 1}`;
    lines.push(`UPDATE finance.payment SET bank_settlement_id = '${bsetId}' WHERE id = '${pId}' AND bank_settlement_id IS NULL;`);
  });

  for (let i = 1; i <= 24; i++) {
    const jeId = `je-${String(i).padStart(3, "0")}`;
    const amt = Number((300 + i * 115).toFixed(3));
    const revOf = i === 23 ? "je-009" : i === 24 ? "je-010" : null;
    lines.push(
      ins(
        "finance.journal_entry",
        {
          id: jeId,
          source_key: `seed:je:${i}`,
          request_hash: `hash-${pfx}-je-${i}`,
          period_id: i <= 14 ? "per-2026-10" : "per-2026-11",
          posting_date: dateAgo(Math.max(1, 52 - i * 2)),
          currency: cur,
          memo: revOf ? `Reversal adjustment of ${revOf}` : `Posted invoice & settlement recognition #${i}`,
          branch_id: `br-${["hq", "muharraq", "riffa", "seef"][(i - 1) % 4]}`,
          reversal_of_id: revOf,
          created_by_id: i === 1 ? "super-admin" : "faisal-mansour",
          created_at: ago(Math.max(1, 52 - i * 2)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.journal_line",
        { id: `jel-${i}-d`, entry_id: jeId, account_id: revOf ? "acc-4000" : "acc-1000", debit: amt, credit: 0, memo: revOf ? "Revenue reversal" : "Bank receipt" },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.journal_line",
        { id: `jel-${i}-c`, entry_id: jeId, account_id: revOf ? "acc-1000" : "acc-4000", debit: 0, credit: amt, memo: revOf ? "Cash adjustment" : "Operating revenue" },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Commission Rules & Payouts + Supplier Bills & Payments
  for (const cr of [
    { id: "crule-std", code: "STD-5", name: "Standard Sales Commission (5%)", rate: 5.0 },
    { id: "crule-ent", code: "ENT-75", name: "Enterprise Retainer Bonus (7.5%)", rate: 7.5 },
    { id: "crule-ren", code: "REN-3", name: "Annual Contract Renewal (3%)", rate: 3.0 },
    { id: "crule-exec", code: "EXEC-10", name: "Strategic Deal Acceleration (10%)", rate: 10.0 },
  ]) {
    lines.push(
      ins(
        "finance.commission_rule",
        { id: cr.id, code: cr.code, name: cr.name, rate: cr.rate, effective_from: "2026-01-01", effective_to: "2026-12-31", version: 1, is_active: true, created_at: ago(180) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  [5, 6, 7, 8, 9, 10].forEach((m, idx) => {
    const owner = ["sami-khoury", "hana-yousef", "tareq-saad"][idx % 3];
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
          expense_id: `exp-${String(17 + idx).padStart(3, "0")}`,
          payroll_item_id: `pi-prun-2026-${String(m).padStart(2, "0")}-${owner}`,
          recorded_by_id: "layla-nasser",
          created_at: ago((11 - m) * 28),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });
  for (let i = 1; i <= 12; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const sub = Number((p.cost * 8).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const tot = Number((sub + vat).toFixed(3));
    const billId = `sbill-${String(i).padStart(3, "0")}`;
    const billStatus = i <= 6 ? "paid" : i <= 10 ? "approved" : "draft";
    const poRef = i <= 10 ? `po-${String(i).padStart(3, "0")}` : null;
    lines.push(
      ins(
        "finance.supplier_bill",
        {
          id: billId,
          number: `${pfx}-BILL-2026-${String(i).padStart(3, "0")}`,
          supplier_ref: `SUP-INV-${400 + i}`,
          supplier_id: `cnt-${9 + (i % 2)}`,
          purchase_order_id: poRef,
          bill_date: dateAgo(Math.max(2, 65 - i * 5)),
          due_date: dateAhead(i * 4),
          status: billStatus,
          subtotal: sub,
          vat_amount: vat,
          total: tot,
          amount_paid: billStatus === "paid" ? tot : 0,
          expense_id: `exp-${String(23 + (i - 1)).padStart(3, "0")}`,
          override_reason: i % 4 === 0 ? "Expedited air freight surcharge pre-approved by CFO" : null,
          attachment_url: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          note: `Supplier invoice for ${p.en}`,
          created_by_id: "faisal-mansour",
          approved_by_id: billStatus !== "draft" ? "layla-nasser" : null,
          approved_at: billStatus !== "draft" ? ago(Math.max(1, 63 - i * 5)) : null,
          created_at: ago(Math.max(2, 65 - i * 5)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "finance.supplier_bill_line",
        { id: `sbl-${i}-1`, bill_id: billId, order_line_id: poRef ? `pol-${String(i).padStart(3, "0")}-1` : null, description: p.en, quantity: 8, unit_price: p.cost, sort_order: 1 },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (billStatus === "paid") {
      lines.push(
        ins(
          "finance.supplier_payment",
          { id: `spay-${i}`, bill_id: billId, amount: tot, paid_on: dateAgo(Math.max(1, 58 - i * 4)), method: "bank_transfer", reference: `WIRE-${pfx}-${700 + i}`, created_by_id: "faisal-mansour", created_at: ago(Math.max(1, 58 - i * 4)) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 6. HR & PAYROLL ─────────────────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- HR: SHIFTS, EMPLOYEES, ATTENDANCE, LEAVES, HANDOVERS & PAYROLL RUNS`);
  const shifts = [
    { id: "shf-morning", code: "MORN", en: "Morning Shift (08:00-16:00)", ar: "الفترة الصباحية", mode: "none", val: 0 },
    { id: "shf-evening", code: "EVE", en: "Evening Shift (14:00-22:00)", ar: "الفترة المسائية", mode: "fixed", val: 2.5 },
    { id: "shf-night", code: "NGT", en: "Night Operations Shift (22:00-06:00)", ar: "الفترة الليلية", mode: "fixed", val: 4.5 },
    { id: "shf-flex", code: "FLEX", en: "Flexible Core Hours", ar: "ساعات مرنة", mode: "none", val: 0 },
  ];
  for (const sh of shifts) {
    lines.push(
      ins(
        "hr.shift_type",
        { id: sh.id, code: sh.code, name_en: sh.en, name_ar: sh.ar, allowance_mode: sh.mode, allowance_value: sh.val, is_active: true },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // Identity projection + Leave Balances + Recurring Pay + GOSI + Credentials + Attendance (14d x 31 = 434) + Leave Requests + Handovers + Payroll (6 x 31 = 186)
  for (const s of staffRoster) {
    const sIdx = staffRoster.indexOf(s);
    const gosiCat = !s.nationality || s.nationality === "BH" ? "bahraini" : ["SA", "AE", "KW", "OM", "QA"].includes(s.nationality) ? "gcc" : "expat";
    const gosiPfx = gosiCat === "bahraini" ? "BH" : gosiCat === "gcc" ? "GCC" : "EXP";
    lines.push(
      ins(
        "hr.identity_user_ref",
        {
          subject_id: s.id,
          realm: "staff",
          display_name: s.nameEn,
          email: staffEmail(s, domainHost),
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
          used_days: sIdx < 16 && sIdx % 3 !== 0 ? 3 : 0,
          remaining_days: sIdx < 16 && sIdx % 3 !== 0 ? 27 : 30,
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
          used_days: sIdx < 16 && sIdx % 3 === 0 ? 3 : 0,
          remaining_days: sIdx < 16 && sIdx % 3 === 0 ? 12 : 15,
          updated_at: now,
        },
        "ON CONFLICT DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "hr.leave_balance",
        {
          id: `lb-${s.id}-emg-2026`,
          employee_id: s.id,
          leave_type_id: "lt-emerg",
          leave_type: "emergency",
          year: 2026,
          entitled_days: 5,
          used_days: sIdx % 7 === 0 ? 1 : 0,
          remaining_days: sIdx % 7 === 0 ? 4 : 5,
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
          end_month: sIdx % 5 === 0 ? "2026-12" : null,
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
          end_month: sIdx % 5 === 0 ? "2026-12" : null,
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
          category: gosiCat,
          registration_number: `GOSI-${gosiPfx}-${880000 + sIdx}`,
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
          visa_type: gosiCat === "expat" ? "LMRA Work Visa (2-Year)" : null,
          label: "Bahrain National CPR",
          number: `92010${1000 + sIdx}`,
          issuing_country: s.nationality || "BH",
          issue_date: "2022-01-10",
          expiry_date: "2028-01-10",
          sponsor: gosiCat === "expat" ? company.nameEn : "Government of Bahrain",
          cost_amount: gosiCat === "expat" ? 172.0 : 12.0,
          cost_currency: cur,
          cost_frequency: "biennial",
          cost_term_months: 24,
          paid_by: "company",
          file_url: "/api/files/brand/icon-light.png",
          notes: gosiCat === "expat" ? "LMRA permit and residency tracked in HR compliance" : "Verified National CPR on file",
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (sIdx < 12) {
      lines.push(
        ins(
          "hr.employee_credential",
          {
            id: `cred-pass-${s.id}`,
            employee_id: s.id,
            kind: "passport",
            visa_type: gosiCat === "expat" ? "Residence Permit" : "GCC Passport",
            label: "International Passport",
            number: `P${s.nationality || "BH"}${310000 + sIdx * 17}`,
            issuing_country: s.nationality || "BH",
            issue_date: "2023-06-01",
            expiry_date: "2033-06-01",
            sponsor: company.nameEn,
            cost_amount: 45.0,
            cost_currency: cur,
            cost_frequency: "one_time",
            cost_term_months: 120,
            paid_by: "employee",
            file_url: "/api/files/brand/icon-light.png",
            notes: "Verified primary travel document",
            created_at: now,
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (let d = 1; d <= 14; d++) {
      const lateMin = d % 4 === 0 && sIdx % 3 === 0 ? 10 : 0;
      const otMin = d % 3 === 1 && sIdx % 2 === 0 ? 45 : 0;
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
            late_minutes: lateMin,
            overtime_minutes: otMin,
            overtime_night_minutes: d === 7 && sIdx % 4 === 0 ? 30 : 0,
            overtime_rest_day_minutes: d === 14 && sIdx % 6 === 0 ? 60 : 0,
            overtime_holiday_minutes: 0,
            shift_type_id: sIdx === 0 || s.dept === "d-exec" ? "shf-flex" : "shf-morning",
            source: "biometric",
            notes: otMin > 0 ? "Biometric check-out logged approved project overtime" : "Standard shift attendance",
            recorded_by_id: "karim-fawzi",
            created_at: ago(d),
            updated_at: ago(d),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    const lrStatus = sIdx < 16 ? "approved" : sIdx < 25 ? "pending" : "rejected";
    lines.push(
      ins(
        "hr.leave_request",
        {
          id: `lr-${s.id}`,
          employee_id: s.id,
          leave_type: sIdx % 3 === 0 ? "sick" : "annual",
          leave_type_id: sIdx % 3 === 0 ? "lt-sick" : "lt-annual",
          start_date: dateAgo(Math.max(1, 35 - sIdx)),
          end_date: dateAgo(Math.max(0, 33 - sIdx)),
          days_count: 3,
          days: 3,
          hours: 24,
          full_day: true,
          day_portion: "full",
          status: lrStatus,
          reason: sIdx % 3 === 0 ? "Medical appointment & recovery" : "Scheduled family leave",
          attachment_url: sIdx % 3 === 0 ? "/api/files/media/banners/banner-01.png" : null,
          approved_by: lrStatus !== "pending" ? "yusuf-rahman" : null,
          approved_by_id: lrStatus !== "pending" ? "yusuf-rahman" : null,
          approved_at: lrStatus === "approved" ? ago(Math.max(1, 36 - sIdx)) : null,
          review_notes: lrStatus === "approved" ? "Approved per departmental coverage plan." : lrStatus === "rejected" ? "Deferred due to month-end closing schedule." : "Awaiting HR & line manager review.",
          created_at: ago(Math.max(2, 38 - sIdx)),
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
          start_date: dateAgo(90 + sIdx * 2),
          end_date: dateAgo(89 + sIdx * 2),
          days_count: 2,
          days: 2,
          hours: 16,
          full_day: true,
          day_portion: "full",
          status: "approved",
          reason: "Mid-year planned leave",
          attachment_url: null,
          approved_by: s.reportTo || "omar-haddad",
          approved_by_id: s.reportTo || "omar-haddad",
          approved_at: ago(92 + sIdx * 2),
          review_notes: "Mid-year leave approved and balanced.",
          created_at: ago(95 + sIdx * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 6; i++) {
    const s = staffRoster[i + 2];
    const delegate = i === 1 ? staffRoster[0] : staffRoster[i];
    const hoId = `ho-${String(i).padStart(3, "0")}`;
    lines.push(
      ins(
        "hr.employee_handover",
        {
          id: hoId,
          reference: `${pfx}-HO-2026-${String(i).padStart(2, "0")}`,
          employee_id: s.id,
          kind: "leave",
          leave_request_id: `lr-${s.id}`,
          effective_date: dateAgo(Math.max(2, 35 - (i + 2))),
          return_date: dateAgo(Math.max(0, 32 - (i + 2))),
          reason: "Scheduled duty coverage during approved leave",
          status: i <= 4 ? "completed" : "active",
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
          case_id: `prj-${String(i).padStart(3, "0")}`,
          label: `Active Project #${String(i).padStart(2, "0")} Oversight`,
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

  for (const [mIdx, m] of [5, 6, 7, 8, 9, 10].entries()) {
    const mm = String(m).padStart(2, "0");
    const runId = `prun-2026-${mm}`;
    const totalBasic = staffRoster.reduce((acc, s) => acc + s.salary, 0);
    const totalGross = Number((totalBasic * 1.175).toFixed(3));
    const totalDed = Number((totalBasic * 0.07).toFixed(3));
    const totalNet = Number((totalGross - totalDed).toFixed(3));
    const totalEmployerCost = Number((totalBasic * 0.12).toFixed(3));
    const commOwner = ["sami-khoury", "hana-yousef", "tareq-saad"][mIdx % 3];
    const commBasis = Number((primarySvc.rate * (3 + mIdx)).toFixed(3));
    const commRate = mIdx % 2 === 0 ? 5.0 : 3.0;
    const commAmt = Number(((commBasis * commRate) / 100).toFixed(3));
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
          total_employer_cost: totalEmployerCost,
          currency: cur,
          period_start: `2026-${mm}-01`,
          period_end: `2026-${mm}-28`,
          attendance_start: `2026-${mm}-01`,
          attendance_end: `2026-${mm}-28`,
          pay_date: `2026-${mm}-28`,
          processed_at: ago((11 - m) * 28),
          approved_by: "layla-nasser",
          approved_by_id: "layla-nasser",
          approved_at: ago((11 - m) * 28),
          paid_at: ago((11 - m) * 28),
          created_at: ago((11 - m) * 28),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    staffRoster.forEach((s, sIdx) => {
      const housing = Number((s.salary * 0.1).toFixed(3));
      const transport = Number((s.salary * 0.05).toFixed(3));
      const otherAllow = Number((s.salary * 0.025).toFixed(3));
      const allow = Number((housing + transport + otherAllow).toFixed(3));
      const otPay = sIdx % 2 === 0 ? 18.5 : 0;
      const shiftAllow = s.dept === "d-ops" ? 12.0 : 0;
      const bonus = sIdx === 0 || sIdx <= 3 ? Number((s.salary * 0.05).toFixed(3)) : 0;
      const commission = s.id === commOwner ? commAmt : 0;
      const gross = Number((s.salary + allow + otPay + shiftAllow + bonus + commission).toFixed(3));
      const gosiEmp = Number((s.salary * 0.07).toFixed(3));
      const gosiEr = Number((s.salary * 0.12).toFixed(3));
      const extSupport = sIdx >= 10 && sIdx < 16 ? Number((s.salary * 0.3).toFixed(3)) : 0;
      const lateDed = sIdx % 3 === 0 ? 2.5 : 0;
      const totalItemDed = Number((gosiEmp + lateDed).toFixed(3));
      const net = Number((gross - totalItemDed).toFixed(3));
      const paidAt = ago((11 - m) * 28);
      lines.push(
        ins(
          "hr.payroll_item",
          {
            id: `pi-${runId}-${s.id}`,
            payroll_run_id: runId,
            employee_id: s.id,
            basic_salary: s.salary,
            allowances: allow,
            housing_allowance: housing,
            transport_allowance: transport,
            other_allowances: otherAllow,
            bonus,
            overtime_pay: otPay,
            shift_allowance: shiftAllow,
            commission,
            deductions: totalItemDed,
            gosi_employee: gosiEmp,
            gosi_employer: gosiEr,
            external_support: extSupport,
            other_deductions: 0,
            absence_deduction: 0,
            leave_deduction: 0,
            lateness_deduction: lateDed,
            gross_salary: gross,
            net_salary: net,
            calculation_snapshot: { formula: "bahrain_2026_v2", basic: s.salary, gosiEmployeeRate: 0.07, gosiEmployerRate: 0.12, commission },
            attendance_summary: { workingDays: 22, presentDays: 22, lateMinutes: sIdx % 3 === 0 ? 10 : 0, overtimeMinutes: sIdx % 2 === 0 ? 90 : 0 },
            adjustment_note: commission > 0 ? `Includes ${mm}/2026 sales commission payout (${cur} ${commission})` : "Standard monthly WPS payroll calculation",
            edited_by_id: "layla-nasser",
            edited_at: paidAt,
            status: "paid",
            payment_status: "paid",
            payment_method: "bank_transfer",
            paid_at: paidAt,
            paid_by_id: "faisal-mansour",
            payment_reference: `WPS-${pfx}-2026${mm}-${String(sIdx + 1).padStart(3, "0")}`,
            created_at: paidAt,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    });
  }

  // ── 7. INVENTORY & PROCUREMENT ──────────────────────────────────────────────
  lines.push(``);
  lines.push(`-- INVENTORY: WAREHOUSES, PRODUCTS, VARIANTS, STOCK & PROCUREMENT`);
  const warehouses = [
    { id: "wh-main", code: "WH-01", en: `${company.shortEn} Main Warehouse`, ar: `${company.shortAr} المستودع الرئيسي`, addr: company.addressEn, branch: "br-hq", def: true },
    { id: "wh-hub", code: "WH-02", en: `${company.shortEn} Muharraq Hub`, ar: `${company.shortAr} مستودع المحرق`, addr: "Muharraq Logistics Park, Bahrain", branch: "br-muharraq", def: false },
    { id: "wh-riffa", code: "WH-03", en: `${company.shortEn} Riffa Depot`, ar: `${company.shortAr} مستودع الرفاع`, addr: "Riffa Industrial Avenue, Bahrain", branch: "br-riffa", def: false },
    { id: "wh-seef", code: "WH-04", en: `${company.shortEn} Seef Showroom Store`, ar: `${company.shortAr} مخزن السيف`, addr: "Seef District Complex, Manama", branch: "br-seef", def: false },
    { id: "wh-transit", code: "WH-05", en: `${company.shortEn} Fleet Transit Staging`, ar: `${company.shortAr} مستودع النقل العابر`, addr: "Mina Salman Port Gate 3, Bahrain", branch: "br-hq", def: false },
    { id: "wh-cold", code: "WH-06", en: `${company.shortEn} Climate Controlled Annex`, ar: `${company.shortAr} الملحق المبرد`, addr: "Hidd Logistics Zone, Bahrain", branch: "br-muharraq", def: false },
  ];
  warehouses.forEach((w, idx) => {
    lines.push(
      ins(
        "inventory.warehouse",
        {
          id: w.id,
          code: w.code,
          name_en: w.en,
          name_ar: w.ar,
          address: w.addr,
          is_active: true,
          is_default: w.def,
          branch_id: w.branch,
          sort_order: idx + 1,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const locs = [
    { id: "loc-a1", wh: "wh-main", code: "A-01", name: "Primary Bay A-01" },
    { id: "loc-a2", wh: "wh-main", code: "A-02", name: "Secondary Bay A-02" },
    { id: "loc-a3", wh: "wh-main", code: "A-03", name: "High-Value Cage A-03" },
    { id: "loc-b1", wh: "wh-hub", code: "B-01", name: "Muharraq Dispatch B-01" },
    { id: "loc-b2", wh: "wh-hub", code: "B-02", name: "Muharraq Receiving B-02" },
    { id: "loc-r1", wh: "wh-riffa", code: "R-01", name: "Riffa Bulk Rack R-01" },
    { id: "loc-r2", wh: "wh-riffa", code: "R-02", name: "Riffa Reserve R-02" },
    { id: "loc-s1", wh: "wh-seef", code: "S-01", name: "Seef Showroom Bin S-01" },
    { id: "loc-s2", wh: "wh-seef", code: "S-02", name: "Seef Pickup Locker S-02" },
    { id: "loc-tr1", wh: "wh-transit", code: "TR-01", name: "In-Transit Staging TR-01" },
    { id: "loc-tr2", wh: "wh-transit", code: "TR-02", name: "Cross-Dock Bay TR-02" },
    { id: "loc-c1", wh: "wh-cold", code: "C-01", name: "Climate Bay C-01" },
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

  lines.push(
    ins(
      "inventory.product_category",
      {
        id: "pcat-root",
        name_en: `${company.shortEn} Master Catalog`,
        name_ar: `الكتالوج الرئيسي — ${company.shortAr}`,
        description_en: `All physical equipment, deliverables, and retail inventory for ${company.nameEn}.`,
        description_ar: `كافة المعدات والمنتجات والمواد المخزنية الخاصة بشركة ${company.nameAr}.`,
        slug: "master-catalog",
        parent_id: null,
        sort_order: 0,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );
  const pCats = [...new Set(prodList.map((p) => p.cat))];
  pCats.forEach((cat, idx) => {
    lines.push(
      ins(
        "inventory.product_category",
        {
          id: `pcat-${idx + 1}`,
          name_en: cat,
          name_ar: cat,
          description_en: `Curated ${cat} inventory line stocked in Bahrain warehouses.`,
          description_ar: `فئة مخزون ${cat} المتوفرة في مستودعات البحرين.`,
          slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          parent_id: "pcat-root",
          sort_order: idx + 1,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const numSeedPfx = (pfx.replace(/[^0-9]/g, "") || "77").padEnd(3, "7").slice(0, 3);
  prodList.forEach((p, idx) => {
    const pid = `prod-${idx + 1}`;
    const catId = `pcat-${pCats.indexOf(p.cat) + 1}`;
    const varId = `var-${idx + 1}`;
    const varProId = `var-pro-${idx + 1}`;
    const qty = 30 + idx * 12;
    const batchCode = `${pfx}-B26-${100 + idx}`;
    const barcodeBase = `629${numSeedPfx}${String(10000 + idx * 7).slice(0, 5)}9`;
    lines.push(
      ins(
        "inventory.product",
        {
          id: pid,
          sku: p.sku,
          barcode: barcodeBase,
          name_en: p.en,
          name_ar: p.ar,
          description_en: `Enterprise-grade ${p.en} supplied by ${company.nameEn} with regional warranty.`,
          description_ar: `منتج احترافي: ${p.ar} من ${company.nameAr} مع ضمان ودعم محلي في البحرين.`,
          category_id: catId,
          brand: p.brand || company.shortEn,
          unit: p.unit || "unit",
          cost_price: p.cost,
          selling_price: p.price,
          cost: p.cost,
          price: p.price,
          currency: cur,
          tax_rate: 10.0,
          vat_exempt: false,
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
          barcode: `${barcodeBase}-1`,
          name_en: `${p.en} (Standard)`,
          name_ar: `${p.ar} (قياسي)`,
          cost_price: p.cost,
          selling_price: p.price,
          cost: p.cost,
          price: p.price,
          attributes: { tier: "Standard", edition: company.prefix, warrantyMonths: 12 },
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
        "inventory.product_variant",
        {
          id: varProId,
          product_id: pid,
          sku: `${p.sku}-PRO`,
          barcode: `${barcodeBase}-2`,
          name_en: `${p.en} (Enterprise Pro)`,
          name_ar: `${p.ar} (إصدار احترافي)`,
          cost_price: Number((p.cost * 1.15).toFixed(3)),
          selling_price: Number((p.price * 1.2).toFixed(3)),
          cost: Number((p.cost * 1.15).toFixed(3)),
          price: Number((p.price * 1.2).toFixed(3)),
          attributes: { tier: "Pro", edition: "Enterprise", warrantyMonths: 24 },
          is_active: true,
          sort_order: 2,
          created_at: now,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_item",
        {
          id: `sit-${idx + 1}`,
          product_id: pid,
          variant_key: "STD",
          average_cost: p.cost,
          reorder_point: 10,
          reorder_quantity: 20,
          low_alerted_at: idx % 4 === 0 ? ago(2) : null,
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
          variant_key: "STD",
          batch_key: batchCode,
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
        "inventory.stock_level",
        {
          id: `sl-hub-${idx + 1}`,
          product_id: pid,
          variant_id: varId,
          variant_key: "STD",
          batch_key: batchCode,
          location_id: "loc-b1",
          quantity_on_hand: 15,
          quantity_reserved: 1,
          quantity_available: 14,
          on_hand: 15,
          reserved: 1,
          reorder_point: 5,
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
          batch_number: batchCode,
          variant_key: "STD",
          product_id: pid,
          variant_id: varId,
          location_id: "loc-a1",
          initial_quantity: qty + 10,
          remaining_quantity: qty,
          cost_per_unit: p.cost,
          expiry_date: dateAhead(365 + idx * 30),
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
          variant_key: "STD",
          batch_key: batchCode,
          location_id: "loc-a1",
          quantity: qty + 10,
          unit_cost: p.cost,
          source_type: idx < 8 ? "goods_receipt" : "opening_balance",
          source_id: idx < 8 ? `grn-${String(idx + 1).padStart(3, "0")}` : `init-${idx + 1}`,
          transfer_id: idx < 8 ? `salloc-${String(idx + 1).padStart(3, "0")}` : null,
          reason: "Initial stock receipt",
          note: `Verified intake & QA check for ${p.sku} at Main Warehouse`,
          created_by_id: "karim-fawzi",
          created_at: ago(20),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Procurement Pipeline: Requisitions (10) -> RFQs & Quotes (10) -> Purchase Orders (10) -> Goods Receipts (8) -> Stock Counts (8) -> Stock Allocations (8)
  for (let i = 1; i <= 10; i++) {
    const p = prodList[(i - 1) % prodList.length];
    const pId = `prod-${((i - 1) % prodList.length) + 1}`;
    const reqId = `preq-${String(i).padStart(3, "0")}`;
    const rfqId = `rfq-${String(i).padStart(3, "0")}`;
    const poId = `po-${String(i).padStart(3, "0")}`;
    const daysBack = Math.max(4, 52 - i * 4);
    lines.push(
      ins(
        "inventory.purchase_requisition",
        {
          id: reqId,
          number: `${pfx}-PRQ-2026-${String(i).padStart(3, "0")}`,
          requested_by_id: "tariq-saleh",
          department_id: "d-ops",
          status: i <= 8 ? "converted" : "approved",
          needed_by: dateAhead(10 + i * 2),
          note: `Replenishment request for ${p.en}`,
          decision_note: i <= 8 ? "Approved & converted into formal RFQ/PO" : "Approved for upcoming replenishment cycle",
          estimated_total: Number((p.cost * 12).toFixed(3)),
          created_at: ago(daysBack + 6),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.purchase_requisition_line",
        {
          id: `prql-${String(i).padStart(3, "0")}-1`,
          requisition_id: reqId,
          product_id: pId,
          variant_key: "STD",
          description: p.en,
          quantity: 12,
          estimated_unit_cost: p.cost,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq",
        {
          id: rfqId,
          number: `${pfx}-RFQ-2026-${String(i).padStart(3, "0")}`,
          requisition_id: reqId,
          title: `Vendor Quote Solicitation: ${p.en}`,
          status: i <= 8 ? "awarded" : "sent",
          due_date: dateAhead(7),
          note: "Requested dual vendor comparison quotes under annual frame agreement",
          created_by_id: "karim-fawzi",
          created_at: ago(daysBack + 4),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq_line",
        {
          id: `rfql-${String(i).padStart(3, "0")}-1`,
          rfq_id: rfqId,
          product_id: pId,
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
        { id: `rfqq-${i}-a`, rfq_id: rfqId, line_id: `rfql-${String(i).padStart(3, "0")}-1`, supplier_id: "cnt-9", unit_price: p.cost, lead_time_days: 5, note: "Primary vendor offer", selected: true, created_at: ago(daysBack + 2) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.rfq_quote",
        { id: `rfqq-${i}-b`, rfq_id: rfqId, line_id: `rfql-${String(i).padStart(3, "0")}-1`, supplier_id: "cnt-10", unit_price: Number((p.cost * 1.06).toFixed(3)), lead_time_days: 7, note: "Secondary vendor quote", selected: false, created_at: ago(daysBack + 2) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );

    const sub = Number((p.cost * 10).toFixed(3));
    const vat = Number((sub * 0.1).toFixed(3));
    const supIdx = i % 2 === 0 ? 0 : 1;
    const poStatus = i <= 6 ? "received" : i <= 8 ? "partially_received" : "approved";
    lines.push(
      ins(
        "inventory.purchase_order",
        {
          id: poId,
          number: `${pfx}-PO-2026-${String(i).padStart(3, "0")}`,
          supplier_id: `cnt-${9 + (i % 2)}`,
          supplier_name: customers[8 + supIdx].nameEn,
          requisition_id: reqId,
          rfq_id: rfqId,
          document_id: `sbill-${String(i).padStart(3, "0")}`,
          status: poStatus,
          order_date: dateAgo(daysBack),
          expected_date: dateAhead(5 + i),
          warehouse_id: i % 3 === 0 ? "wh-hub" : "wh-main",
          vat_enabled: true,
          vat_percentage: 10,
          subtotal: sub,
          vat_amount: vat,
          total: Number((sub + vat).toFixed(3)),
          note: `Replenishment PO for ${p.en} (${p.sku})`,
          terms: "Net 30 days upon QC warehouse acceptance",
          sent_at: ago(daysBack),
          sent_via: "email",
          approved_by_id: "layla-nasser",
          approved_at: ago(daysBack),
          created_by_id: "karim-fawzi",
          created_at: ago(daysBack),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.purchase_order_line",
        {
          id: `pol-${String(i).padStart(3, "0")}-1`,
          purchase_order_id: poId,
          product_id: pId,
          variant_key: "STD",
          description: p.en,
          quantity: 10,
          unit_price: p.cost,
          received_quantity: i <= 6 ? 10 : i <= 8 ? 6 : 0,
          rejected_quantity: i === 5 ? 1 : 0,
          billed_quantity: i <= 6 ? 10 : i <= 8 ? 6 : 0,
          sort_order: 1,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 8; i++) {
    const pIdx = (i - 1) % prodList.length;
    const p = prodList[pIdx];
    const grId = `grn-${String(i).padStart(3, "0")}`;
    const poRef = `po-${String(i).padStart(3, "0")}`;
    const polRef = `pol-${String(i).padStart(3, "0")}-1`;
    const batchCode = `${pfx}-B26-${100 + pIdx}`;
    lines.push(
      ins(
        "inventory.goods_receipt",
        {
          id: grId,
          number: `${pfx}-GRN-2026-${String(i).padStart(3, "0")}`,
          purchase_order_id: poRef,
          location_id: i % 3 === 0 ? "loc-b1" : "loc-a1",
          received_by_id: "tariq-saleh",
          received_at: ago(Math.max(1, 24 - i * 2)),
          note: `Inspected & checked into ${i % 3 === 0 ? "Muharraq Hub" : "Main Warehouse"}`,
          created_at: ago(Math.max(1, 24 - i * 2)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.goods_receipt_line",
        {
          id: `grnl-${String(i).padStart(3, "0")}-1`,
          receipt_id: grId,
          order_line_id: polRef,
          quantity: i <= 6 ? 10 : 6,
          rejected_quantity: i === 5 ? 1 : 0,
          reject_reason: i === 5 ? "Minor outer carton scuff during port transit" : null,
          batch_number: batchCode,
          expiry_date: dateAhead(365 + pIdx * 30),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const scId = `scnt-${String(i).padStart(3, "0")}`;
    const cntQty = 30 + pIdx * 12;
    lines.push(
      ins(
        "inventory.stock_count",
        {
          id: scId,
          count_number: `${pfx}-CNT-2026-${String(i).padStart(3, "0")}`,
          number: `${pfx}-CNT-2026-${String(i).padStart(3, "0")}`,
          warehouse_id: i % 2 === 1 ? "wh-main" : "wh-hub",
          scope: "cycle",
          status: i <= 6 ? "approved" : "submitted",
          notes: "Monthly physical cycle count verification",
          note: `Zone audit covering ${p.cat} shelves`,
          counted_by_id: "tariq-saleh",
          approved_by_id: i <= 6 ? "karim-fawzi" : null,
          counted_at: ago(Math.max(1, 18 - i * 2)),
          submitted_at: ago(Math.max(1, 18 - i * 2)),
          approved_at: i <= 6 ? ago(Math.max(1, 16 - i * 2)) : null,
          created_by_id: "karim-fawzi",
          created_at: ago(Math.max(2, 20 - i * 2)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_count_line",
        {
          id: `scntl-${String(i).padStart(3, "0")}-1`,
          count_id: scId,
          product_id: `prod-${pIdx + 1}`,
          variant_id: `var-${pIdx + 1}`,
          variant_key: "STD",
          batch_key: batchCode,
          location_id: i % 2 === 1 ? "loc-a1" : "loc-b1",
          system_quantity: cntQty,
          counted_quantity: cntQty,
          variance: 0,
          expected: cntQty,
          counted: cntQty,
          notes: `Verified ${p.sku} barcode count`,
          note: `Batch ${batchCode} reconciled 100%`,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_allocation",
        {
          id: `salloc-${String(i).padStart(3, "0")}`,
          number: `${pfx}-TRF-2026-${String(i).padStart(3, "0")}`,
          kind: "transfer",
          source_location_id: "loc-a1",
          transit_location_id: "loc-tr1",
          destination_location_id: i % 2 === 0 ? "loc-b1" : "loc-s1",
          carrier_id: "tariq-saleh",
          status: i <= 5 ? "received" : "dispatched",
          revision: 1,
          created_by_id: "tariq-saleh",
          approved_by_id: "karim-fawzi",
          created_at: ago(Math.max(1, 12 - i)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "inventory.stock_allocation_line",
        {
          id: `sallocl-${String(i).padStart(3, "0")}-1`,
          allocation_id: `salloc-${String(i).padStart(3, "0")}`,
          product_id: `prod-${pIdx + 1}`,
          variant_key: "STD",
          batch_key: batchCode,
          requested: 5,
          dispatched: 5,
          received: i <= 5 ? 5 : 0,
          rejected: 0,
          unit_snapshot: { code: p.unit || "unit", name: "Unit", factor: 1 },
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
        bank_instructions_en: `Remit transfers to ${company.nameEn} NBB IBAN ${companyJson.company.bankIban} referencing your order number.`,
        bank_instructions_ar: `يرجى تحويل المبلغ إلى حساب ${company.nameAr} الآيبان ${companyJson.company.bankIban} مع ذكر رقم الطلب.`,
        payment_gateway: "benefitpay",
        order_notify_email: company.email,
        loyalty_enabled: true,
        points_per_unit: 10.0,
        points_redemption_rate: 500,
        min_redeem_points: 1000,
        wallet_enabled: true,
        min_partial_wallet: 1.0,
        raffle_enabled: true,
        raffle_spend_unit: 10.0,
        raffle_prize_en: `${company.shortEn} Seasonal Prize & Voucher Draw`,
        raffle_prize_ar: `سحب الجوائز والقسائم الموسمية من ${company.shortAr}`,
        custom_categories_json: JSON.stringify(
          pCats.slice(0, 8).map((c, idx) => ({
            id: `cat-${idx + 1}`,
            slug: c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `cat-${idx + 1}`,
            name_en: c,
            name_ar: c,
            display_order: idx + 1,
            featured: idx < 6,
            is_active: true,
          })),
        ),
        cookie_banner_enabled: true,
        ssl_badge_enabled: true,
        announcement_en: `Fast delivery across Bahrain — ${company.shortEn} Official Store`,
        announcement_ar: `توصيل سريع في جميع أنحاء البحرين — متجر ${company.shortAr} الرسمي`,
        cr_number: company.crNumber || "136704-1",
        vat_number: company.vatId || "220001367040002",
        return_window_days: 14,
        show_category_bar: true,
        show_deals_section: true,
        show_gift_cards_section: true,
        updated_at: now,
      },
      "ON CONFLICT (id) DO UPDATE SET delivery_enabled = EXCLUDED.delivery_enabled, pickup_enabled = EXCLUDED.pickup_enabled, guest_checkout = EXCLUDED.guest_checkout, bank_instructions_en = EXCLUDED.bank_instructions_en, bank_instructions_ar = EXCLUDED.bank_instructions_ar, payment_gateway = EXCLUDED.payment_gateway, loyalty_enabled = EXCLUDED.loyalty_enabled, wallet_enabled = EXCLUDED.wallet_enabled, raffle_enabled = EXCLUDED.raffle_enabled, announcement_en = EXCLUDED.announcement_en, announcement_ar = EXCLUDED.announcement_ar, cr_number = EXCLUDED.cr_number, vat_number = EXCLUDED.vat_number, raffle_prize_en = EXCLUDED.raffle_prize_en, raffle_prize_ar = EXCLUDED.raffle_prize_ar, custom_categories_json = EXCLUDED.custom_categories_json, updated_at = now()",
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
    { id: "dz-manama", en: "Capital Governorate", ar: "محافظة العاصمة", fee: 2.0, areas: ["Manama", "Seef", "Diplomatic Area", "Juffair", "Adliya", "Zinj"] },
    { id: "dz-muharraq", en: "Muharraq Governorate", ar: "محافظة المحرق", fee: 2.5, areas: ["Muharraq", "Amwaj", "Diyar Al Muharraq", "Hidd", "Arad", "Busaiteen"] },
    { id: "dz-northern", en: "Northern Governorate", ar: "المحافظة الشمالية", fee: 2.5, areas: ["Budaiya", "Saar", "Janabiya", "A'ali", "Isa Town", "Hamad Town"] },
    { id: "dz-southern", en: "Southern Governorate", ar: "المحافظة الجنوبية", fee: 3.0, areas: ["Riffa", "Awali", "Sanad", "Zallaq", "Askar", "Durrat Al Bahrain"] },
  ];
  zones.forEach((z, idx) => {
    lines.push(
      ins(
        "delivery.delivery_zone",
        { id: z.id, name_en: z.en, name_ar: z.ar, areas: z.areas, fee: z.fee, min_order: 5, free_over: 40, is_active: hasLogistics, sort_order: idx + 1, created_at: now, updated_at: now },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // Cross-Service Warehouse & Customer Segment Projections for Commerce
  for (const wh of warehouses.slice(0, 4)) {
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
    const companyCode = company.country || "BH";
    const companyCurrency = company.currency || "BHD";
    const storeRegions = [
      {
        id: `reg-${companyCode.toLowerCase()}`,
        code: companyCode,
        en: company.city || "Bahrain",
        ar: company.city || "البحرين",
        cc: companyCurrency,
        sym: companyCurrency === "BHD" ? "BD" : companyCurrency,
        lang: "ar",
        br: "br-hq",
        mul: 1.0,
        free: 25.0,
      },
    ];
    for (const r of storeRegions) {
      lines.push(
        ins(
          "commerce.store_region",
          {
            id: r.id,
            code: r.code,
            name_en: r.en,
            name_ar: r.ar,
            currency: r.cc,
            currency_symbol: r.sym,
            free_shipping_threshold: r.free,
            default_language: r.lang,
            branch_id: r.br,
            is_enabled: true,
            price_multiplier: r.mul,
            settings: {},
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (const [gcIdx, gcVal] of [10, 25, 50].entries()) {
      lines.push(
        ins(
          "commerce.gift_card",
          {
            id: `gc-${gcIdx + 1}`,
            code: `${pfx}-GIFT-${gcVal}`,
            initial_value: gcVal,
            remaining_value: gcVal,
            currency: cur,
            recipient_email: customers[gcIdx]?.email || company.email,
            note: `Promotional gift voucher (${gcVal} ${cur})`,
            is_active: true,
            expires_at: ahead(365),
            created_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    lines.push(
      ins(
        "commerce.coupon",
        {
          id: "cpn-welcome10",
          code: "WELCOME10",
          discount_type: "percent",
          discount_value: 10,
          kind: "percent",
          value: 10,
          min_order_amount: 15,
          max_discount_amount: 50,
          starts_at: ago(60),
          expires_at: ahead(180),
          usage_limit: 500,
          usage_count: 14,
          min_order: 15,
          ends_at: ahead(180),
          max_uses: 500,
          used_count: 14,
          is_active: true,
          created_at: now,
        },
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
    for (let i = 1; i <= 24; i++) {
      const cust = customers[(i - 1) % customers.length];
      const p = prodList[(i - 1) % prodList.length];
      const pp = splitPhone(cust.phone);
      const ordId = `ord-${String(i).padStart(3, "0")}`;
      const invRefId = `inv-${String(i).padStart(3, "0")}`;
      const shpRefId = i <= 20 ? `shp-${String(i).padStart(3, "0")}` : null;
      const discAmt = i % 5 === 0 ? 2.5 : 0;
      const sub = p.price;
      const vat = Number(((sub - discAmt) * 0.1).toFixed(3));
      const tot = Number((sub - discAmt + vat + 2).toFixed(3));
      const ordStatus = i <= 12 ? "delivered" : i <= 18 ? "shipped" : "processing";
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
            country_code: pp.country_code,
            mobile_number: pp.mobile_number,
            channel: i % 3 === 0 ? "pos" : "storefront",
            status: ordStatus,
            payment_status: "paid",
            payment_method: i % 2 === 0 ? "card" : "benefitpay",
            fulfilment: "delivery",
            shipping_address: { line1: `Building ${100 + i}, Road 28`, city: cust.city, country: "BH" },
            subtotal: sub,
            discount_amount: discAmt,
            coupon_code: i % 5 === 0 ? "WELCOME10" : null,
            vat_amount: vat,
            delivery_fee: 2.0,
            total: tot,
            amount_paid: tot,
            amount_refunded: 0,
            currency: cur,
            locale: i % 2 === 0 ? "en" : "ar",
            note: `Order #${i} for ${cust.nameEn} (${cust.city})`,
            warehouse_id: i % 4 === 0 ? "wh-hub" : "wh-main",
            invoice_id: invRefId,
            shipment_id: shpRefId,
            shipment_status: shpRefId ? (i <= 12 ? "delivered" : i === 19 ? "failed_attempt" : "out_for_delivery") : null,
            tracking_token: shpRefId ? `trk-${pfx.toLowerCase()}-${500 + i}` : null,
            created_by_id: "noor-hamdan",
            placed_at: ago(i * 2),
            paid_at: ago(i * 2),
            shipped_at: i <= 18 ? ago(Math.max(1, i * 2 - 1)) : null,
            delivered_at: i <= 12 ? ago(Math.max(0, i * 2 - 2)) : null,
            cancelled_at: null,
            utm_campaign: i % 3 === 0 ? `${company.slug}_c1` : null,
            utm_source: i % 3 === 0 ? "instagram" : "direct",
            utm_medium: i % 3 === 0 ? "social" : "web",
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
            variant_key: "STD",
            sku: p.sku,
            description: p.en,
            quantity: 1,
            unit_price: p.price,
            vat_exempt: false,
            line_total: p.price,
            location_id: i % 4 === 0 ? "loc-b1" : "loc-a1",
            returned_quantity: 0,
            sort_order: 1,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "commerce.sales_order_event",
          { id: `orde-${i}-1`, order_id: ordId, kind: "placed", status: "placed", note: "Order confirmed & linked to invoice", amount: tot, by_id: "noor-hamdan", created_at: ago(i * 2) },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }

    // Seed Customer Wallet Transactions, Loyalty Points Ledger, Wishlists & Return Requests
    for (let wIdx = 0; wIdx < Math.min(4, customers.length); wIdx++) {
      const cust = customers[wIdx];
      lines.push(
        ins(
          "commerce.customer_wallet_tx",
          {
            id: `wtx-${wIdx + 1}`,
            customer_id: cust.id,
            kind: "gift_card",
            amount: 15.0 + wIdx * 5,
            balance_after: 15.0 + wIdx * 5,
            reference: `${pfx}-GIFT-${wIdx === 0 ? 25 : 10}`,
            note: "Store wallet welcome credit",
            created_by: "super-admin",
            created_at: ago(10 - wIdx),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "commerce.customer_points_tx",
          {
            id: `ptx-${wIdx + 1}`,
            customer_id: cust.id,
            kind: "earn",
            points: 500 + wIdx * 250,
            balance_after: 500 + wIdx * 250,
            reference: `${pfx}-ORD-${1001 + wIdx}`,
            note: "Order loyalty points earned",
            created_by: "system",
            created_at: ago(10 - wIdx),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "commerce.customer_wishlist",
          {
            id: `wsh-${wIdx + 1}`,
            customer_id: cust.id,
            product_id: `prod-${(wIdx % prodList.length) + 1}`,
            created_at: ago(5 - wIdx),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    lines.push(
      ins(
        "commerce.order_return_request",
        {
          id: "ret-req-001",
          order_id: "ord-001",
          customer_id: customers[0].id,
          status: "pending",
          refund_destination: "wallet",
          amount_requested: Number(Math.min(25, prodList[0].price || 15).toFixed(3)),
          reason: "Requested exchange/wallet credit within return window",
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  if (hasLogistics) {
    // Delivery Cross-Service Driver & Order Projections + Slots + Route Sheets + Shipments + COD Settlements
    for (const drvId of ["tariq-saleh", "noor-hamdan", "karim-fawzi", "rashid-qahtani", "salman-bader", "jassim-hilal"]) {
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
              phone: drv.phone || `+9733900${1000 + staffRoster.indexOf(drv)}`,
              department_id: drv.dept,
              status: "active",
              updated_at: now,
            },
            "ON CONFLICT (employee_id) DO NOTHING",
          ),
        );
      }
    }
    const orderRefCount = company.hasStore ? 24 : 20;
    for (let i = 1; i <= orderRefCount; i++) {
      const cust = customers[(i - 1) % customers.length];
      const p = prodList[(i - 1) % prodList.length];
      const pp = splitPhone(cust.phone);
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
            recipient_country_code: pp.country_code,
            recipient_mobile_number: pp.mobile_number,
            status: i <= 12 ? "delivered" : "shipped",
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
            { id: `dslot-${z.id}-${slot.k}`, zone_id: z.id, weekday: (zIdx % 5) + 1, slot_start: slot.s, slot_end: slot.e, capacity: 16, is_active: true, created_at: now },
            "ON CONFLICT (id) DO NOTHING",
          ),
        );
      }
    });
    for (const cag of [
      { id: "cag-smsa", name: "SMSA Express Bahrain", contact: "Dispatch Desk", email: "dispatch@smsa.example.bh", phone: "+97317400001", api: "https://api.smsa.example.bh/v1" },
      { id: "cag-aramex", name: "Aramex Gulf Express", contact: "Operations Hub", email: "hub@aramex.example.bh", phone: "+97317400002", api: "https://api.aramex.example.bh/v1" },
    ]) {
      const pp = splitPhone(cag.phone);
      lines.push(
        ins(
          "delivery.courier_agency",
          { id: cag.id, name: cag.name, contact_name: cag.contact, email: cag.email, phone: cag.phone, country_code: pp.country_code, mobile_number: pp.mobile_number, api_endpoint: cag.api, is_active: true, created_at: now },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (const v of [
      { id: "veh-01", plate: "BH-44102", name: `${company.shortEn} Van 01`, kind: "van", notes: "Manama & Capital primary chilled van" },
      { id: "veh-02", plate: "BH-44108", name: `${company.shortEn} Van 02`, kind: "van", notes: "Muharraq & Hidd express delivery van" },
      { id: "veh-03", plate: "BH-44215", name: `${company.shortEn} Pickup 03`, kind: "truck", notes: "Riffa & Southern bulk cargo pickup" },
      { id: "veh-04", plate: "BH-44309", name: `${company.shortEn} Courier Bike 04`, kind: "motorcycle", notes: "Seef & Diplomat Area rapid bike" },
    ]) {
      lines.push(
        ins(
          "delivery.vehicle",
          { id: v.id, plate: v.plate, name: v.name, kind: v.kind, notes: v.notes, is_active: true, created_at: now, updated_at: now },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (let r = 1; r <= 6; r++) {
      lines.push(
        ins(
          "delivery.route_sheet",
          {
            id: `rs-00${r}`,
            number: `${pfx}-RS-00${r}`,
            driver_id: r % 2 === 1 ? "tariq-saleh" : "noor-hamdan",
            vehicle_id: `veh-0${((r - 1) % 4) + 1}`,
            status: r <= 4 ? "completed" : "in_progress",
            run_date: dateAgo(Math.max(0, 7 - r)),
            created_at: ago(Math.max(1, 7 - r)),
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
            amount_settled: r <= 4 ? Number((125 * r).toFixed(3)) : 0,
            status: r <= 4 ? "settled" : "pending",
            settled_at: r <= 4 ? ago(Math.max(0, 6 - r)) : null,
            created_at: ago(Math.max(1, 7 - r)),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
    for (let i = 1; i <= 20; i++) {
      const cust = customers[(i - 1) % customers.length];
      const pp = splitPhone(cust.phone);
      const shpId = `shp-${String(i).padStart(3, "0")}`;
      const z = zones[(i - 1) % zones.length];
      const rsIdx = ((i - 1) % 6) + 1;
      const shpStatus = i <= 12 ? "delivered" : i === 19 ? "failed_attempt" : "out_for_delivery";
      const deliveredAgo = Math.max(0, 20 - i);
      lines.push(
        ins(
          "delivery.shipment",
          {
            id: shpId,
            number: `${pfx}-SHP-${500 + i}`,
            order_id: `ord-${String(i).padStart(3, "0")}`,
            status: shpStatus,
            method: i % 5 === 0 ? "courier" : "fleet",
            zone_id: z.id,
            slot_id: `dslot-${z.id}-${i % 2 === 0 ? "pm" : "am"}`,
            slot_date: dateAgo(deliveredAgo),
            slot_start: i % 2 === 0 ? "14:00" : "09:00",
            slot_end: i % 2 === 0 ? "18:00" : "13:00",
            promised_by: ahead(1),
            recipient_name: cust.nameEn,
            recipient_phone: cust.phone,
            recipient_country_code: pp.country_code,
            recipient_mobile_number: pp.mobile_number,
            address: { line1: `Building ${120 + i}, Road 28`, city: cust.city, country: "BH" },
            cod_amount: i % 4 === 0 ? Number((18 + i * 3.5).toFixed(3)) : 0,
            cod_collected: i % 4 === 0 && i <= 12 ? Number((18 + i * 3.5).toFixed(3)) : 0,
            tracking_token: `trk-${pfx.toLowerCase()}-${500 + i}`,
            tracking_number: i % 5 === 0 ? `SMSA-${pfx}-${8800 + i}` : null,
            agency_id: i % 5 === 0 ? "cag-smsa" : null,
            attempts: i === 19 ? 2 : 1,
            failure_reason: i === 19 ? "Recipient unavailable during AM delivery window — rescheduled PM" : null,
            out_at: ago(deliveredAgo + 1),
            delivered_at: shpStatus === "delivered" ? ago(deliveredAgo) : null,
            driver_id: rsIdx % 2 === 1 ? "tariq-saleh" : "noor-hamdan",
            vehicle_id: `veh-0${((rsIdx - 1) % 4) + 1}`,
            route_sheet_id: `rs-00${rsIdx}`,
            route_stop: i,
            proof_photo_url: shpStatus === "delivered" ? "/api/files/media/banners/banner-01.png" : null,
            proof_signature: shpStatus === "delivered" ? "/api/files/brand/signature.png" : null,
            created_at: ago(deliveredAgo + 2),
            updated_at: now,
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "delivery.shipment_event",
          {
            id: `shpe-${i}`,
            shipment_id: shpId,
            status: shpStatus,
            reason: i === 19 ? "Customer requested evening callback" : "Standard route execution",
            note: shpStatus === "delivered" ? "Signed POD collected at doorstep" : "Handled by fleet dispatch",
            by_id: "tariq-saleh",
            at: ago(deliveredAgo),
          },
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
          email: staffEmail(s, domainHost),
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
        { priority: sl.p, response_minutes: sl.r, resolve_minutes: sl.res, updated_by: "super-admin", updated_at: now },
        "ON CONFLICT (priority) DO NOTHING",
      ),
    );
  }
  lines.push(ins("itsm.asset_category", { id: "acat-laptop", code: "LAP", name_en: "Laptops & Workstations", name_ar: "أجهزة الحاسوب" }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("itsm.asset_category", { id: "acat-net", code: "NET", name_en: "Networking & Security", name_ar: "الشبكات والأمن" }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("itsm.asset_category", { id: "acat-av", code: "AVP", name_en: "Studio & AV Gear", name_ar: "معدات الإنتاج والعرض" }, "ON CONFLICT (id) DO NOTHING"));
  lines.push(ins("itsm.asset_category", { id: "acat-mobile", code: "MOB", name_en: "Mobile & Field Devices", name_ar: "الأجهزة اللوحية والميدانية" }, "ON CONFLICT (id) DO NOTHING"));

  for (let i = 1; i <= 24; i++) {
    const s = staffRoster[(i - 1) % staffRoster.length];
    const assetId = `itast-${String(i).padStart(2, "0")}`;
    const catId = i <= 14 ? "acat-laptop" : i <= 18 ? "acat-net" : i <= 21 ? "acat-av" : "acat-mobile";
    lines.push(
      ins(
        "itsm.asset",
        {
          id: assetId,
          asset_tag: `${pfx}-IT-${String(i).padStart(2, "0")}`,
          category_id: catId,
          name: i <= 14 ? `MacBook Pro 14 (${s.nameEn})` : i <= 18 ? `UniFi Gateway Pro #${i}` : i <= 21 ? `Dell UltraSharp 32 4K #${i}` : `iPad Pro M4 Field Tablet #${i}`,
          brand: i <= 14 || i >= 22 ? "Apple" : i <= 18 ? "Ubiquiti" : "Dell",
          model: i <= 14 ? "M4 Pro" : i <= 18 ? "UXG-Pro" : i <= 21 ? "U3223QE" : "M4-13",
          serial_number: `SN-${pfx}-88${100 + i}`,
          purchase_date: dateAgo(180 + i * 3),
          purchase_cost: i <= 14 ? 750 : i <= 18 ? 320 : 410,
          currency: cur,
          supplier: i % 2 === 0 ? "Bahrain Business Tech WLL" : "Almoayyed Computers",
          invoice_reference: `SUP-IT-${900 + i}`,
          warranty_until: dateAhead(540),
          condition: "good",
          status: "assigned",
          specs: { cpu: i <= 14 ? "Apple M4 Pro" : "Embedded", ramGb: i <= 14 ? 24 : 8, storageGb: i <= 14 ? 1024 : 256, managedByMdm: true },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "itsm.asset_handover",
        {
          id: `iastho-${String(i).padStart(2, "0")}`,
          reference: `${pfx}-ITHO-2026-${String(i).padStart(2, "0")}`,
          asset_id: assetId,
          employee_id: s.id,
          kind: "issue",
          status: "completed",
          handover_date: ago(160 - i * 4),
          condition: "good",
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const ticketTopics = catalog.ticketTopics || [];
  const defaultTicketTitles = [
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
  for (let i = 1; i <= 24; i++) {
    const s = i === 1 || i === 13 ? staffRoster[0] : staffRoster[i % staffRoster.length];
    const tId = u(`ticket:${i}`);
    const assetRefIdx = ((i - 1) % 24) + 1;
    const assetId = `itast-${String(assetRefIdx).padStart(2, "0")}`;
    const prjId = `prj-${String(((i - 1) % 12) + 1).padStart(3, "0")}`;
    const rawTitle = ticketTopics[(i - 1) % (ticketTopics.length || 1)] || defaultTicketTitles[(i - 1) % defaultTicketTitles.length];
    const tStatus = i <= 12 ? "closed" : i <= 16 ? "resolved" : i <= 20 ? "in_progress" : "open";
    const tCreatedAgo = Math.max(2, 48 - i * 2);
    const itAssignee = ["it-eng-001", "it-supp-001", "it-manager-001"][(i - 1) % 3];
    const itAssigneeName = itAssignee === "it-eng-001" ? "Khalid Al-Buainain" : itAssignee === "it-supp-001" ? "Aisha Al-Zayani" : "Rashid Al-Khalifa";
    lines.push(
      ins(
        "itsm.ticket",
        {
          id: tId,
          number: 300 + i,
          requester_id: s.id,
          requester_name: s.nameEn,
          requester_email: staffEmail(s, domainHost),
          category: i % 3 === 0 ? "network" : i % 2 === 0 ? "access" : "hardware",
          subcategory: i % 3 === 0 ? "connectivity" : i % 2 === 0 ? "permissions" : "workstation",
          priority: i <= 4 ? "critical" : i <= 10 ? "high" : i <= 20 ? "normal" : "low",
          status: tStatus,
          title: String(rawTitle).slice(0, 190),
          description: `Operational IT support request submitted by ${s.nameEn} (${s.username}) for ${prjId}.`,
          asset_ref: `${pfx}-IT-${String(assetRefIdx).padStart(2, "0")}`,
          assignee_id: itAssignee,
          assignee_name: itAssigneeName,
          employee_id: s.id,
          department_id: s.dept,
          project_id: prjId,
          asset_id: assetId,
          document_id: `inv-${String(((i - 1) % 24) + 1).padStart(3, "0")}`,
          respond_by: i === 18 || i === 19 ? ago(2) : ahead(1),
          resolve_by: i === 18 || i === 19 ? ago(1) : ahead(3),
          first_response_at: tStatus !== "open" ? ago(tCreatedAgo - 1) : null,
          breached_at: i === 18 || i === 19 ? ago(1) : null,
          resolved_at: tStatus === "resolved" || tStatus === "closed" ? ago(Math.max(1, tCreatedAgo - 1)) : null,
          closed_at: tStatus === "closed" ? ago(Math.max(1, tCreatedAgo - 1)) : null,
          reminded_at: tStatus === "open" ? ago(1) : null,
          created_at: ago(tCreatedAgo),
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
          author_id: itAssignee,
          author_name: itAssigneeName,
          body: "Verified configuration and applied standard security baseline.",
          internal: false,
          created_at: ago(Math.max(1, tCreatedAgo - 1)),
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
          actor_id: itAssignee,
          kind: tStatus === "closed" || tStatus === "resolved" ? "resolved" : "assigned",
          from_status: "open",
          to_status: tStatus,
          detail: { message: tStatus === "closed" || tStatus === "resolved" ? "Resolution verified with requester" : "Assigned to IT operations queue" },
          created_at: ago(Math.max(1, tCreatedAgo - 1)),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 30; i++) {
    const s = i === 1 ? staffRoster[0] : staffRoster[(i - 1) % staffRoster.length];
    const itaskId = `itask-${i}`;
    const done = i <= 14;
    const prjId = `prj-${String(((i - 1) % 12) + 1).padStart(3, "0")}`;
    lines.push(
      ins(
        "itsm.task",
        {
          id: itaskId,
          number: `${pfx}-TSK-${100 + i}`,
          title: `${company.shortEn} Operational Milestone #${i}`,
          description: `Tracked deliverable for ${svcList[(i - 1) % svcList.length].en}.`,
          project_id: prjId,
          status: done ? "done" : i <= 22 ? "in_progress" : "todo",
          priority: i <= 6 ? "high" : "medium",
          assignee_id: s.id,
          department_id: s.dept,
          start_date: dateAgo(10 - (i % 5)),
          due_date: dateAhead(i * 2),
          sort_order: i,
          link_type: i % 2 === 0 ? "project" : "ticket",
          link_id: i % 2 === 0 ? prjId : u(`ticket:${((i - 1) % 24) + 1}`),
          completed_at: done ? ago(Math.max(1, 16 - i)) : null,
          reminded_at: !done ? ago(1) : null,
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
  const wfDepts = [
    { id: "d-exec", en: "Executive", ar: "الإدارة التنفيذية" },
    { id: "d-fin", en: "Finance", ar: "المالية" },
    { id: "d-ops", en: "Operations", ar: "العمليات" },
    { id: "d-sales", en: "Sales", ar: "المبيعات" },
    { id: "d-mkt", en: "Marketing", ar: "التسويق" },
    { id: "d-it", en: "IT & Systems", ar: "تقنية المعلومات" },
    { id: "d-hr", en: "Human Resources", ar: "الموارد البشرية" },
    { id: "d-legal", en: "Legal & Compliance", ar: "الشؤون القانونية والامتثال" },
    { id: "d-prod", en: "Production & Studio", ar: "الإنتاج والاستوديو" },
    { id: "d-log", en: "Logistics & Fleet", ar: "اللوجستيات والأسطول" },
    { id: "d-proc", en: "Procurement & Supply", ar: "المشتريات والتوريد" },
    { id: "d-qa", en: "Quality Assurance", ar: "ضمان الجودة" },
  ];
  for (const d of wfDepts) {
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
        { kind: "employee", id: s.id, name: s.nameEn, name_ar: s.nameAr, email: staffEmail(s, domainHost), parent_id: s.dept, metadata: { titleEn: s.titleEn, role: s.role }, updated_at: now },
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
  for (let i = 1; i <= 30; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    lines.push(
      ins(
        "workflow.directory_ref",
        { kind: "deal", id: `deal-${i}`, name: `${cust.nameEn} — ${svc.en}`, parent_id: `cnt-${((i - 1) % customers.length) + 1}`, metadata: { status: i <= 14 ? "won" : "open" }, updated_at: now },
        "ON CONFLICT (kind, id) DO NOTHING",
      ),
    );
  }
  for (let i = 1; i <= 12; i++) {
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

  // Workflow Minutes of Meeting (16) + Attendees (48) + Action Items (24) -> Linked Tasks (24) & Calendar (24)
  for (let i = 1; i <= 16; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const momId = `mom-${String(i).padStart(3, "0")}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const prjId = `prj-${String(((i - 1) % 12) + 1).padStart(3, "0")}`;
    const dealId = `deal-${i}`;
    const deptId = projectDepts[(i - 1) % projectDepts.length];
    const org = i % 4 === 1 ? staffRoster[0] : staffRoster[i % staffRoster.length];
    lines.push(
      ins(
        "workflow.minute_of_meeting",
        {
          id: momId,
          mom_number: `${pfx}-MOM-2026-${String(i).padStart(2, "0")}`,
          title: `${cust.nameEn} — ${svc.en} Alignment`,
          title_ar: `${cust.nameAr} — اجتماع تنسيق ${svc.ar}`,
          meeting_date: dateAgo(Math.max(1, 48 - i * 2)),
          start_time: "10:00",
          end_time: "11:15",
          location: `${company.city} HQ — Boardroom ${i % 2 === 0 ? "B" : "A"}`,
          attendees: [org.nameEn, "Bader Ali", "Omar Haddad", cust.nameEn],
          discussion: `Reviewed milestones, commercial scope, and delivery SLAs for ${svc.en} with ${cust.nameEn}.`,
          action_items: `Finalize deliverable schedule; confirm quotation ${pfx}-QT-2026-${200 + i} and milestone sign-off.`,
          agenda: `1. Progress review\n2. Budget & invoicing alignment\n3. Next-phase action items`,
          decisions: [{ title: "Proceed with phase execution", owner: org.id }],
          notes: `Approved during bi-weekly client & operations review.`,
          status: i <= 12 ? "approved" : "draft",
          client_id: contactId,
          deal_id: dealId,
          project_id: prjId,
          department_id: deptId,
          team_id: `team-${((i - 1) % 4) + 1}`,
          organizer_id: org.id,
          created_by_id: org.id,
          approved_by_id: i <= 12 ? "super-admin" : null,
          signature_url: "/api/files/brand/signature.png",
          pdf_storage_path: `/api/files/media/banners/banner-0${((i - 1) % 3) + 1}.png`,
          created_at: ago(Math.max(2, 48 - i * 2)),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 24; i++) {
    const s = i === 1 ? staffRoster[0] : staffRoster[(i - 1) % staffRoster.length];
    const momIdx = ((i - 1) % 16) + 1;
    const momId = `mom-${String(momIdx).padStart(3, "0")}`;
    const contactId = `cnt-${((momIdx - 1) % customers.length) + 1}`;
    const dealId = `deal-${momIdx}`;
    const prjId = `prj-${String(((momIdx - 1) % 12) + 1).padStart(3, "0")}`;
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
          status: i <= 12 ? "completed" : "in_progress",
          priority: i <= 6 ? "high" : "medium",
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
          status: i <= 12 ? "completed" : "open",
          created_at: ago(i),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 16; i++) {
    const cust = customers[(i - 1) % customers.length];
    const momId = `mom-${String(i).padStart(3, "0")}`;
    const org = staffRoster[i % staffRoster.length];
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const superAdmin = staffRoster[0];
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-1`, mom_id: momId, attendee_type: "employee", employee_id: superAdmin.id, user_id: superAdmin.id, department_id: superAdmin.dept, display_name: superAdmin.nameEn, email: staffEmail(superAdmin, domainHost), role_title: superAdmin.titleEn, attended: true, created_at: ago(Math.max(1, 46 - i * 2)) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-2`, mom_id: momId, attendee_type: "employee", employee_id: org.id, user_id: org.id, department_id: org.dept, display_name: org.nameEn, email: staffEmail(org, domainHost), role_title: org.titleEn, attended: true, created_at: ago(Math.max(1, 46 - i * 2)) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.mom_attendee",
        { id: `momatt-${i}-3`, mom_id: momId, attendee_type: "client", contact_id: contactId, display_name: cust.nameEn, email: cust.email, role_title: "Client Representative", attended: true, created_at: ago(Math.max(1, 46 - i * 2)) },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 24; i++) {
    const s = i === 1 ? staffRoster[0] : staffRoster[(i - 1) % staffRoster.length];
    const momIdx = ((i - 1) % 16) + 1;
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
          project_id: `prj-${String(((momIdx - 1) % 12) + 1).padStart(3, "0")}`,
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

  // Workflow Contracts, Templates, Signature Requests & Official Letters (16 each, all cross-linked!)
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

  for (let i = 1; i <= 16; i++) {
    const cust = customers[(i - 1) % customers.length];
    const svc = svcList[(i - 1) % svcList.length];
    const s = i === 1 ? staffRoster[0] : staffRoster[(i - 1) % staffRoster.length];
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const prjId = `prj-${String(((i - 1) % 12) + 1).padStart(3, "0")}`;
    const deptId = projectDepts[(i - 1) % projectDepts.length];
    const sreqId = `sreq-${String(i).padStart(3, "0")}`;
    const daysBack = Math.max(2, 64 - i * 3);
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
          project_id: prjId,
          quotation_id: i <= 14 ? `qt-${String(i).padStart(3, "0")}` : null,
          invoice_id: `inv-${String(i).padStart(3, "0")}`,
          employee_id: i % 4 === 0 ? "super-admin" : "sami-khoury",
          department_id: deptId,
          document_id: `inv-${String(i).padStart(3, "0")}`,
          file_url: `/api/files/media/banners/banner-0${(i % 3) + 1}.png`,
          status: i <= 12 ? "active" : "pending_signature",
          start_date: dateAgo(60),
          end_date: dateAhead(305),
          value: Number((svc.rate * 4).toFixed(3)),
          currency: cur,
          notes: `Bilingual service contract covering ${svc.en} under Kingdom of Bahrain law.`,
          created_by_id: i === 1 ? "super-admin" : "omar-haddad",
          signed_by_id: i <= 12 ? "super-admin" : null,
          created_at: ago(daysBack),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.signature_request",
        {
          id: sreqId,
          title: `Authorisation & Sign-Off: ${cust.nameEn} (${pfx}-DOC-${String(i).padStart(2, "0")})`,
          document_type: i % 2 === 0 ? "contract" : "official_letter",
          document_id: i % 2 === 0 ? `wctr-${String(i).padStart(3, "0")}` : `olet-${String(i).padStart(3, "0")}`,
          requested_from: cust.email,
          status: i <= 10 ? "signed" : "pending",
          signature_url: i <= 10 ? "/api/files/brand/signature.png" : null,
          signed_at: i <= 10 ? ago(Math.max(1, daysBack - 2)) : null,
          expires_at: ahead(30),
          client_id: contactId,
          deal_id: `deal-${i}`,
          project_id: prjId,
          employee_id: s.id,
          department_id: s.dept,
          created_by_id: "omar-haddad",
          file_url: "/api/files/brand/signature.png",
          created_at: ago(daysBack),
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
          letter_number: `${pfx}-LTR-2026-${String(i).padStart(2, "0")}`,
          template_id: letterTemplates[(i - 1) % letterTemplates.length].id,
          recipient_name: cust.nameEn,
          recipient_title: "Authorized Signatory",
          subject: `${letterTemplates[(i - 1) % letterTemplates.length].en} — ${cust.nameEn}`,
          body: `Formal correspondence issued by ${company.nameEn} referencing ${prjId} and deal-${i}.`,
          status: i <= 12 ? "issued" : "draft",
          issued_at: i <= 12 ? ago(Math.max(1, daysBack - 1)) : null,
          client_id: contactId,
          deal_id: `deal-${i}`,
          project_id: prjId,
          employee_id: s.id,
          department_id: s.dept,
          document_id: `wctr-${String(i).padStart(3, "0")}`,
          created_by_id: i === 1 ? "super-admin" : "omar-haddad",
          signed_by_id: i <= 12 ? "super-admin" : null,
          signature_request_id: sreqId,
          file_url: "/api/files/brand/stamp.png",
          created_at: ago(daysBack),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  for (let i = 1; i <= 16; i++) {
    const reqId = `apr-${i}`;
    const contactId = `cnt-${((i - 1) % customers.length) + 1}`;
    const entityId = i % 2 === 0 ? `exp-${String(i).padStart(3, "0")}` : `inv-${String(i).padStart(3, "0")}`;
    const prjId = `prj-${String(((i - 1) % 12) + 1).padStart(3, "0")}`;
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
          project_id: prjId,
          department_id: i % 2 === 0 ? "d-fin" : "d-sales",
          employee_id: i === 1 ? "super-admin" : "faisal-mansour",
          requester_id: i === 1 ? "super-admin" : "faisal-mansour",
          status: i <= 11 ? "approved" : "pending",
          priority: i <= 4 ? "high" : "normal",
          reason: "Standard monthly authorization workflow",
          created_at: ago(i * 2),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (i <= 11) {
      lines.push(
        ins(
          "workflow.approval_decision",
          {
            id: `aprd-${i}`,
            request_id: reqId,
            approver_id: i <= 3 ? "super-admin" : "layla-nasser",
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
      { id: "attl-inv-1", entity_type: "invoice", entity_id: "inv-001", doc_type: "invoice", rel: "supporting", title: "Signed Tax Invoice #1", client_id: "cnt-1", emp: "super-admin", prj: "prj-001" },
      { id: "attl-qt-1", entity_type: "quotation", entity_id: "qt-001", doc_type: "quotation", rel: "supporting", title: "Client Proposal Brief #1", client_id: "cnt-1", emp: "sami-khoury", prj: "prj-001" },
      { id: "attl-ctr-1", entity_type: "contract", entity_id: "wctr-001", doc_type: "contract", rel: "signed_copy", title: "Executed MSA Copy #1", client_id: "cnt-1", emp: "super-admin", prj: "prj-001" },
      { id: "attl-mom-1", entity_type: "mom", entity_id: "mom-001", doc_type: "mom", rel: "minutes_pack", title: "Signed Meeting Minutes #1", client_id: "cnt-1", emp: "karim-fawzi", prj: "prj-001" },
      { id: "attl-ltr-1", entity_type: "official_letter", entity_id: "olet-001", doc_type: "official_letter", rel: "stamped_pdf", title: "Official Company Stamp Copy #1", client_id: "cnt-1", emp: "super-admin", prj: "prj-001" },
      { id: "attl-tkt-1", entity_type: "ticket", entity_id: u("ticket:1"), doc_type: "ticket", rel: "diagnostic", title: "IT Configuration Snapshot", client_id: null, emp: "super-admin", prj: "prj-001" },
      { id: "attl-prj-1", entity_type: "project", entity_id: "prj-002", doc_type: "project", rel: "deliverable", title: "Project Overview Deck", client_id: "cnt-2", emp: "tariq-saleh", prj: "prj-002" },
      { id: "attl-emp-0", entity_type: "employee", entity_id: "super-admin", doc_type: "employee", rel: "credential", title: "Executive HR & Governance Pack (BA0001)", client_id: null, emp: "super-admin", prj: null },
      { id: "attl-emp-1", entity_type: "employee", entity_id: "tariq-saleh", doc_type: "employee", rel: "credential", title: "Staff Onboarding Pack", client_id: null, emp: "tariq-saleh", prj: null },
      { id: "attl-inv-2", entity_type: "invoice", entity_id: "inv-002", doc_type: "invoice", rel: "supporting", title: "Signed Tax Invoice #2", client_id: "cnt-2", emp: "layla-nasser", prj: "prj-002" },
      { id: "attl-ctr-2", entity_type: "contract", entity_id: "wctr-002", doc_type: "contract", rel: "signed_copy", title: "Executed MSA Copy #2", client_id: "cnt-2", emp: "omar-haddad", prj: "prj-002" },
      { id: "attl-exp-1", entity_type: "expense", entity_id: "exp-001", doc_type: "expense", rel: "receipt", title: "Expense Tax Receipt #1", client_id: "cnt-1", emp: "super-admin", prj: "prj-001" },
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
            uploaded_by_id: at.emp || "super-admin",
            created_at: ago(idx + 1),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    });
  }

  for (const s of staffRoster) {
    const sIdx = staffRoster.indexOf(s);
    lines.push(
      ins(
        "realtime.status",
        {
          realm: "staff",
          user_id: s.id,
          status: sIdx % 5 === 0 ? "busy" : "online",
          message: sIdx === 0 ? "Super Admin — Available" : "Available",
          expires_at: ahead(1),
          updated_at: now,
        },
        "ON CONFLICT (realm, user_id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "notify.preference",
        {
          realm: "staff",
          user_id: s.id,
          muted_until: sIdx === 2 ? ahead(1) : null,
          sound_enabled: true,
          sound: "chime",
          volume: 80,
          popups_enabled: true,
          desktop_enabled: true,
          updated_at: now,
        },
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
          priority: sIdx === 0 ? "high" : "normal",
          title: `Welcome to ${company.shortEn}`,
          body: `Workspace ready for ${s.nameEn} (${s.titleEn}).`,
          message_key: "system.workspace.welcome",
          message_params: { company: company.shortEn, name: s.nameEn, role: s.role },
          action_url: "/dashboard",
          entity_type: "employee",
          entity_id: s.id,
          actor: "super-admin",
          caller: "system",
          dedupe_key: `welcome:${s.id}`,
          silent: false,
          deliver_at: ago(1),
          read_at: sIdx > 0 && sIdx < 12 ? ago(1) : null,
          archived_at: sIdx >= 28 ? ago(1) : null,
          created_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }
  lines.push(
    ins(
      "realtime.status",
      {
        realm: "it",
        user_id: "super-admin",
        status: "online",
        message: "IT & Platform Administration Ready",
        expires_at: ahead(1),
        updated_at: now,
      },
      "ON CONFLICT (realm, user_id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "notify.preference",
      {
        realm: "it",
        user_id: "super-admin",
        muted_until: null,
        sound_enabled: true,
        sound: "chime",
        volume: 85,
        popups_enabled: true,
        desktop_enabled: true,
        updated_at: now,
      },
      "ON CONFLICT (realm, user_id) DO NOTHING",
    ),
  );
  lines.push(
    ins(
      "notify.notification",
      {
        id: u("notif:it:super-admin"),
        realm: "it",
        recipient: "super-admin",
        category: "itsm",
        priority: "high",
        title: `IT Portal Operational — ${company.shortEn}`,
        body: "All tenant microservices, SLA policies, and audit trails are initialized.",
        message_key: "itsm.portal.ready",
        message_params: { company: company.shortEn, code: pfx },
        action_url: "/it/tickets",
        entity_type: "ticket",
        entity_id: u("ticket:1"),
        actor: "it-eng-001",
        caller: "itsm",
        dedupe_key: "it-welcome:super-admin",
        silent: false,
        deliver_at: ago(1),
        read_at: null,
        archived_at: null,
        created_at: ago(1),
      },
      "ON CONFLICT (id) DO NOTHING",
    ),
  );

  for (let i = 1; i <= 32; i++) {
    const s = i === 1 ? staffRoster[0] : staffRoster[(i - 1) % staffRoster.length];
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
          trace_id: `trace-${pfx.toLowerCase()}-${String(i).padStart(4, "0")}`,
          occurred_at: ago(i),
          received_at: ago(i),
          payload: { company: company.slug, seq: i, actorNumber: s.username },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  return lines.join("\n");
}

module.exports = { buildRichModuleSql };
