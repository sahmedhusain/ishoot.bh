const {
  uuidOf,
  sha256,
  sqlRaw,
  ins,
  splitPhone,
  staffEmail,
} = require("./lib/seed-sql.cjs");

/**
 * Rich multi-scenario expansion across all 15 database service schemas for all 25 seed companies.
 * Every record uses authentic Bahraini/GCC corporate & personal names, real districts,
 * and complete lifecycle edge-cases (overdue, partial, breached, multi-session, unused keys, etc.).
 */
function buildScenarioExpansionSql({
  company,
  domainHost,
  staffRoster,
  customers,
  itRoster = [],
}) {
  const lines = [];
  const pfx = company.prefix;
  const cur = company.currency;
  const u = (k) => uuidOf(`${company.slug}:exp:${k}`);
  const now = sqlRaw("now()");
  const ago = (days) => sqlRaw(`now() - interval '${days} days'`);
  const hoursAgo = (h) => sqlRaw(`now() - interval '${h} hours'`);
  const ahead = (days) => sqlRaw(`now() + interval '${days} days'`);
  const hoursAhead = (h) => sqlRaw(`now() + interval '${h} hours'`);
  const dateAgo = (days) => sqlRaw(`(now() - interval '${days} days')::date`);
  const dateAhead = (days) => sqlRaw(`(now() + interval '${days} days')::date`);

  const sa = staffRoster[0] || { id: "super-admin", nameEn: "Bader Ali", nameAr: "بدر علي" };
  const finMgr = staffRoster.find((s) => s.role === "finance_manager") || staffRoster[3] || sa;
  const opsMgr = staffRoster.find((s) => s.role === "operations_manager") || staffRoster[4] || sa;
  const salesLead = staffRoster.find((s) => s.id === "waleed-almoayyed") || staffRoster.find((s) => s.role === "sales") || sa;
  const hrMgr = staffRoster.find((s) => s.role === "hr_manager") || staffRoster[13] || sa;
  const itAdmin = itRoster[0] || { id: "430c4105-6360-4415-bf1b-087d582c7fc6", email: "admin@example.com", displayName: "Bader Ali" };
  const itMgr = itRoster[1] || { id: "it-manager-001", email: `rashid.khalifa@${domainHost}`, displayName: "Rashid Al-Khalifa" };
  const itEng = itRoster[3] || { id: "it-eng-001", email: `khalid.buainain@${domainHost}`, displayName: "Khalid Al-Buainain" };
  const itSupp = itRoster[5] || { id: "it-supp-001", email: `aisha.zayani@${domainHost}`, displayName: "Aisha Al-Zayani" };

  const pickCust = (idx) => customers[idx % customers.length];
  const contactIdOf = (idx) => `cnt-${(idx % customers.length) + 1}`;
  const pickStaff = (idx) => staffRoster[idx % staffRoster.length];

  // ── 1. IDENTITY: Multi-session anomaly, active/expired/revoked session families ──
  lines.push(`\n-- SCENARIO EXPANSION: IDENTITY SESSIONS (ACTIVE, MULTI-SESSION ANOMALY, EXPIRED, REVOKED)`);
  const sessionScenarios = [
    { key: "it-multi-1", subjectId: itMgr.id, realm: "it", ip: "185.125.190.42", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0", createdDays: 1, expDays: 14, revoked: null },
    { key: "it-multi-2", subjectId: itMgr.id, realm: "it", ip: "82.194.55.18", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/605.1", createdDays: 0, expDays: 14, revoked: null },
    { key: "it-multi-3", subjectId: itMgr.id, realm: "it", ip: "193.188.110.9", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/131.0", createdDays: 0, expDays: 10, revoked: null },
    { key: "staff-multi-1", subjectId: finMgr.id, realm: "staff", ip: "185.125.190.14", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/18.0", createdDays: 2, expDays: 12, revoked: null },
    { key: "staff-multi-2", subjectId: finMgr.id, realm: "staff", ip: "82.194.55.91", ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Safari/605.1", createdDays: 1, expDays: 12, revoked: null },
    { key: "staff-revoked-1", subjectId: salesLead.id, realm: "staff", ip: "37.131.12.74", ua: "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile", createdDays: 8, expDays: 6, revoked: ago(3) },
    { key: "staff-expired-1", subjectId: opsMgr.id, realm: "staff", ip: "185.125.190.22", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/132.0", createdDays: 24, expDays: -4, revoked: null },
    { key: "cust-active-1", subjectId: pickCust(12).id, realm: "customer", ip: "37.131.44.19", ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Mobile/15E148", createdDays: 1, expDays: 20, revoked: null },
  ];
  for (const s of sessionScenarios) {
    lines.push(
      ins(
        "identity.session_family",
        {
          id: u(`sf-${s.key}`),
          subject_id: s.subjectId,
          realm: s.realm,
          expires_at: s.expDays >= 0 ? ahead(s.expDays) : ago(Math.abs(s.expDays)),
          revoked_at: s.revoked,
          created_at: s.createdDays === 0 ? hoursAgo(2) : ago(s.createdDays),
          user_agent: s.ua,
          client_ip: s.ip,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 2. SYSTEM: API Keys (Active, Unused, High-Rate, Revoked), Backups, Projects, Canned Replies ──
  lines.push(`\n-- SCENARIO EXPANSION: SYSTEM API KEYS, BACKUPS, PROJECTS & CANNED REPLIES`);
  const apiKeyScenarios = [
    { key: "erp-live", name: "SAP Business One Finance Bridge", prefix: `sk_${pfx.toLowerCase()}_erp`, scopes: ["invoices:read", "payments:read", "journals:write"], rate: 300, lastUsed: hoursAgo(1), revoked: null, expDays: 180 },
    { key: "webhook-unused", name: "BenefitPay Settlement Listener (Staging)", prefix: `sk_${pfx.toLowerCase()}_bp`, scopes: ["orders:read", "payments:write"], rate: 120, lastUsed: null, revoked: null, expDays: 90 },
    { key: "bi-highrate", name: "PowerBI Executive Warehouse Feed", prefix: `sk_${pfx.toLowerCase()}_bi`, scopes: ["analytics:read", "invoices:read", "orders:read", "inventory:read"], rate: 1200, lastUsed: hoursAgo(4), revoked: null, expDays: 365 },
    { key: "legacy-revoked", name: "Legacy Courier Sync (Decommissioned)", prefix: `sk_${pfx.toLowerCase()}_old`, scopes: ["shipments:read", "shipments:write"], rate: 60, lastUsed: ago(45), revoked: ago(12), expDays: 30 },
  ];
  for (const ak of apiKeyScenarios) {
    lines.push(
      ins(
        "system.api_key",
        {
          id: u(`apikey-${ak.key}`),
          name: ak.name,
          key_prefix: ak.prefix,
          key_hash: sha256(`${company.slug}:${ak.key}:secret-v2`),
          scopes: ak.scopes,
          rate_limit: ak.rate,
          last_used_at: ak.lastUsed,
          expires_at: ahead(ak.expDays),
          created_by: itAdmin.email,
          created_at: ago(40),
          revoked_at: ak.revoked,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const backupScenarios = [
    { key: "db-verified-latest", kind: "database", file: `${company.slug}-pg-daily-verified.sql.gz`, size: 48_920_440, status: "verified", createdDays: 1, verifiedDays: 1, err: null },
    { key: "bucket-verified", kind: "bucket", file: `${company.slug}-s3-media-archive.tar.zst`, size: 192_450_110, status: "verified", createdDays: 2, verifiedDays: 2, err: null },
    { key: "full-completed", kind: "full", file: `${company.slug}-full-stack-weekly.tar.gz`, size: 318_640_920, status: "completed", createdDays: 0, verifiedDays: null, err: null },
    { key: "db-failed-retry", kind: "database", file: `${company.slug}-pg-pre-upgrade.sql.gz`, size: 0, status: "failed", createdDays: 6, verifiedDays: null, err: "S3 multipart upload interrupted during network maintenance window" },
  ];
  for (const bk of backupScenarios) {
    lines.push(
      ins(
        "system.backup_record",
        {
          id: u(`bak-${bk.key}`),
          kind: bk.kind,
          file_name: bk.file,
          file_size: bk.size,
          checksum: bk.status === "failed" ? "" : sha256(`${company.slug}:${bk.file}:${bk.size}`),
          status: bk.status,
          error_message: bk.err,
          created_by: itMgr.email,
          created_at: bk.createdDays === 0 ? hoursAgo(3) : ago(bk.createdDays),
          verified_at: bk.verifiedDays ? ago(bk.verifiedDays) : null,
          details: { retentionDays: bk.kind === "bucket" ? 7 : 30, region: "me-south-1-bh", verifiedBy: bk.verifiedDays ? itMgr.displayName : null },
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const projectScenarios = [
    { key: "erp-rollout", code: `${pfx}-PRJ-401`, name: `${company.shortEn} NBR E-Invoicing Readiness`, desc: "Align invoice templates, QR tax metadata, and audit exports with National Bureau for Revenue standards.", status: "active", dept: "d-fin", owner: finMgr.id, color: "#0284c7", startDays: 45, dueDays: 35 },
    { key: "b2b-portal", code: `${pfx}-PRJ-402`, name: `${company.shortEn} GCC Corporate Portal Expansion`, desc: "Onboard Bahrain and Eastern Province wholesale accounts with tiered credit terms and live shipment tracking.", status: "planning", dept: "d-sales", owner: salesLead.id, color: "#7c3aed", startDays: 5, dueDays: 75 },
    { key: "iso-audit", code: `${pfx}-PRJ-403`, name: "ISO 27001 & PDPL Annual Surveillance Audit", desc: "Complete access reviews, backup restore drills, and encryption key rotation across all departments.", status: "on_hold", dept: "d-it", owner: opsMgr.id, color: "#d97706", startDays: 30, dueDays: 20 },
    { key: "branch-sitra", code: `${pfx}-PRJ-404`, name: "Sitra Fulfillment & Cold-Chain Commissioning", desc: "Commission barcode scanners, dock bays, and BenefitPay POS terminals at Sitra logistics facility.", status: "completed", dept: "d-log", owner: opsMgr.id, color: "#059669", startDays: 110, dueDays: -12 },
  ];
  for (const pr of projectScenarios) {
    lines.push(
      ins(
        "system.project",
        {
          id: u(`proj-${pr.key}`),
          code: pr.code,
          name: pr.name,
          description: pr.desc,
          status: pr.status,
          department_id: pr.dept,
          owner_id: pr.owner,
          color: pr.color,
          start_date: dateAgo(pr.startDays),
          due_date: pr.dueDays >= 0 ? dateAhead(pr.dueDays) : dateAgo(Math.abs(pr.dueDays)),
          created_by_id: sa.id,
          created_at: ago(pr.startDays),
          updated_at: ago(2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const cannedReplies = [
    { key: "sla-ack", title: "SLA Acknowledgement", en: "Thank you for contacting our team. Your request has been logged and assigned to a specialist.", ar: "شكراً لتواصلكم معنا. تم تسجيل طلبكم وإسناده إلى المختص للمتابعة." },
    { key: "invoice-copy", title: "VAT Invoice Copy Dispatched", en: "Please find attached your official NBR-compliant VAT tax invoice and NBB IBAN settlement details.", ar: "مرفق لكم نسخة الفاتورة الضريبية الرسمية المتوافقة مع الجهاز الوطني للإيرادات وبيانات التحويل البنكي." },
    { key: "delivery-window", title: "Bahrain Delivery Window Confirmation", en: "Your shipment is scheduled for delivery tomorrow between 09:00 and 13:00. Our driver will call 30 minutes prior.", ar: "تم جدولة شحنتكم للتوصيل غداً بين الساعة 09:00 و 13:00 وسيتواصل السائق قبل 30 دقيقة." },
    { key: "escalation", title: "Priority Escalation Notice", en: "This case has been escalated to senior operations leadership for expedited resolution.", ar: "تم تصعيد هذه الحالة إلى قيادة العمليات العليا لضمان المعالجة العاجلة." },
  ];
  cannedReplies.forEach((cr, idx) => {
    lines.push(
      ins(
        "system.canned_reply",
        {
          id: u(`canned-${cr.key}`),
          title: cr.title,
          body_en: cr.en,
          body_ar: cr.ar,
          is_active: true,
          sort_order: 20 + idx,
          created_at: ago(30),
          updated_at: ago(5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // ── 3. SALES: Full Pipeline Lifecycle (Inquiries, Deals, Quotations) ──
  lines.push(`\n-- SCENARIO EXPANSION: SALES INQUIRIES, MULTI-STAGE DEALS & QUOTATIONS`);
  const dealScenarios = [
    { key: "rfp-seef", custIdx: 9, title: "Annual Corporate Supply Retainer — Seef Waterfront", stage: "negotiation", status: "open", value: 18500, prob: 75, closeDays: 14, notes: "Final commercial review with procurement committee; 10% VAT included." },
    { key: "rfp-hidd", custIdx: 10, title: "Industrial Operations Package — Hidd Fabrication", stage: "proposal", status: "open", value: 26400, prob: 55, closeDays: 28, notes: "Technical proposal submitted; site walkthrough scheduled next Tuesday." },
    { key: "rfp-dilmunia", custIdx: 12, title: "Multi-Year Wellness Center Turnkey Contract", stage: "closed_won", status: "won", value: 34200, prob: 100, closeDays: -6, notes: "Signed by CFO; kickoff deposit invoice issued and settled via NBB." },
    { key: "rfp-zallaq", custIdx: 14, title: "Seasonal Resort Hospitality Program — Zallaq Coast", stage: "closed_lost", status: "lost", value: 14800, prob: 0, closeDays: -11, notes: "Lost on timeline — client required 5-day mobilization during peak holiday." },
    { key: "rfp-saar", custIdx: 15, title: "Academic Year Campus Services — Saar Academy", stage: "qualification", status: "open", value: 9600, prob: 35, closeDays: 42, notes: "Budget approved for Q3; awaiting board sign-off on scope." },
    { key: "rfp-amwaj", custIdx: 17, title: "Marina Members VIP Concierge & Supply", stage: "prospecting", status: "open", value: 7200, prob: 20, closeDays: 60, notes: "Introductory meeting requested via referral from Bahrain Bay Hospitality." },
  ];
  dealScenarios.forEach((d, idx) => {
    const cust = pickCust(d.custIdx);
    const contactId = contactIdOf(d.custIdx);
    const dealId = u(`deal-${d.key}`);
    lines.push(
      ins(
        "sales.deal",
        {
          id: dealId,
          title: d.title,
          contact_id: contactId,
          stage: d.stage,
          value: d.value,
          currency: cur,
          probability: d.prob,
          expected_close_date: d.closeDays >= 0 ? dateAhead(d.closeDays) : dateAgo(Math.abs(d.closeDays)),
          status: d.status,
          assigned_to: salesLead.id,
          notes: d.notes,
          created_at: ago(25 - idx * 3),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const phoneParts = splitPhone(cust.phone);
    lines.push(
      ins(
        "sales.inquiry",
        {
          id: u(`inq-${d.key}`),
          inquiry_type: idx % 2 === 0 ? "enterprise_rfp" : "consultation",
          subject: d.title,
          message: `Requesting formal commercial proposal and Bahrain delivery schedule for ${cust.nameEn} (${cust.city}).`,
          status: d.status === "won" ? "converted" : d.status === "lost" ? "closed" : idx === 0 ? "qualified" : "new",
          priority: d.value >= 20000 ? "high" : "medium",
          requester_name: cust.nameEn,
          requester_email: cust.email,
          requester_phone: cust.phone,
          requester_country_code: phoneParts.countryCode,
          requester_mobile_number: phoneParts.mobileNumber,
          assignee_id: salesLead.id,
          deal_id: dealId,
          created_at: ago(28 - idx * 3),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    const qStatus = d.status === "won" ? "accepted" : d.status === "lost" ? "rejected" : idx === 0 ? "sent" : idx === 1 ? "draft" : "expired";
    const sub = d.value;
    const vat = Number((sub * 0.1).toFixed(company.decimals));
    const tot = Number((sub + vat).toFixed(company.decimals));
    lines.push(
      ins(
        "sales.quotation",
        {
          id: u(`quot-${d.key}`),
          quotation_number: `${pfx}-QT-90${idx + 1}`,
          deal_id: dealId,
          contact_id: contactId,
          client_id: contactId,
          inquiry_id: u(`inq-${d.key}`),
          status: qStatus,
          subtotal: sub,
          discount: 0,
          vat_rate: 10,
          vat_amount: vat,
          total: tot,
          total_amount: tot,
          vat_enabled: true,
          vat_percentage: 10,
          currency: cur,
          language: idx % 2 === 0 ? "en" : "ar",
          issue_date: dateAgo(20 - idx * 2),
          valid_until: qStatus === "expired" ? dateAgo(3) : dateAhead(21),
          valid_until_date: qStatus === "expired" ? dateAgo(3) : dateAhead(21),
          terms_en: "50% mobilization deposit upon PO confirmation; balance net 30 days via NBB IBAN.",
          terms_ar: "50% دفعة مقدمة عند تأكيد أمر الشراء والرصيد خلال 30 يوماً عبر التحويل البنكي.",
          notes: d.notes,
          issued_at: ago(20 - idx * 2),
          accepted_at: qStatus === "accepted" ? ago(6) : null,
          rejected_at: qStatus === "rejected" ? ago(11) : null,
          created_by_id: salesLead.id,
          sales_owner_id: salesLead.id,
          created_at: ago(20 - idx * 2),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // ── 4. FINANCE: Invoices (Draft, Sent, Partial, Paid, 30/60/90d Overdue, Void) + Expense Claims + Supplier Bills ──
  lines.push(`\n-- SCENARIO EXPANSION: FINANCE INVOICES (AGING & LIFECYCLE), EXPENSE CLAIMS & SUPPLIER BILLS`);
  const invoiceScenarios = [
    { key: "paid-retainer", custIdx: 12, num: `${pfx}-INV-9001`, status: "paid", sub: 12400, paidRatio: 1, issueDays: 22, dueDays: -8, noteEn: "Q2 retainer settlement received in full via BenefitPay corporate transfer." },
    { key: "partial-milestone", custIdx: 9, num: `${pfx}-INV-9002`, status: "partially_paid", sub: 8600, paidRatio: 0.5, issueDays: 18, dueDays: 12, noteEn: "50% mobilization deposit settled; remaining milestone balance due on handover." },
    { key: "overdue-30", custIdx: 16, num: `${pfx}-INV-9003`, status: "overdue", sub: 4950, paidRatio: 0, issueDays: 62, dueDays: -32, noteEn: "30+ days past due — formal finance reminder dispatched to accounts payable." },
    { key: "overdue-60", custIdx: 18, num: `${pfx}-INV-9004`, status: "overdue", sub: 7150, paidRatio: 0.2, issueDays: 95, dueDays: -65, noteEn: "60+ days overdue — escalated to credit controller for installment schedule." },
    { key: "sent-current", custIdx: 19, num: `${pfx}-INV-9005`, status: "sent", sub: 3250, paidRatio: 0, issueDays: 4, dueDays: 26, noteEn: "Dispatched electronically with NBR VAT QR code." },
    { key: "draft-pending", custIdx: 20, num: `${pfx}-INV-9006`, status: "draft", sub: 5400, paidRatio: 0, issueDays: 1, dueDays: 30, noteEn: "Draft awaiting final delivery sign-off before client dispatch." },
    { key: "void-duplicate", custIdx: 21, num: `${pfx}-INV-9007`, status: "void", sub: 1800, paidRatio: 0, issueDays: 14, dueDays: 16, noteEn: "Voided prior to settlement — superseded by consolidated monthly billing." },
  ];
  for (const inv of invoiceScenarios) {
    const cust = pickCust(inv.custIdx);
    const contactId = contactIdOf(inv.custIdx);
    const vat = Number((inv.sub * 0.1).toFixed(company.decimals));
    const total = Number((inv.sub + vat).toFixed(company.decimals));
    const paid = Number((total * inv.paidRatio).toFixed(company.decimals));
    const bal = Number((total - paid).toFixed(company.decimals));
    lines.push(
      ins(
        "finance.invoice",
        {
          id: u(`inv-${inv.key}`),
          invoice_number: inv.num,
          contact_id: contactId,
          client_id: contactId,
          status: inv.status,
          issue_date: dateAgo(inv.issueDays),
          due_date: inv.dueDays >= 0 ? dateAhead(inv.dueDays) : dateAgo(Math.abs(inv.dueDays)),
          subtotal: inv.sub,
          discount: 0,
          vat_rate: 10,
          vat_amount: vat,
          total,
          total_amount: total,
          amount_paid: paid,
          balance_due: bal,
          vat_enabled: true,
          vat_percentage: 10,
          currency: cur,
          language: "en",
          notes: inv.noteEn,
          notes_en: inv.noteEn,
          notes_ar: `فاتورة ضريبية صادرة لصالح ${cust.nameAr} وفق متطلبات ضريبة القيمة المضافة في البحرين.`,
          created_by_id: finMgr.id,
          sales_owner_id: salesLead.id,
          created_at: ago(inv.issueDays),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  const claimScenarios = [
    { key: "clm-submitted", staffIdx: 10, num: `${pfx}-CLM-901`, amt: 145.5, status: "submitted", reason: "King Fahd Causeway tolls, fuel, and client site visit in Al-Khobar" },
    { key: "clm-approved", staffIdx: 12, num: `${pfx}-CLM-902`, amt: 280.0, status: "approved", reason: "Emergency exhibition print collateral and stand lighting cables at Bahrain Bay" },
    { key: "clm-paid", staffIdx: 14, num: `${pfx}-CLM-903`, amt: 92.25, status: "paid", reason: "Annual SSL certificate renewal and domain diagnostic tooling" },
    { key: "clm-rejected", staffIdx: 17, num: `${pfx}-CLM-904`, amt: 410.0, status: "rejected", reason: "Unapproved hospitality invoice missing itemized VAT tax receipt" },
  ];
  claimScenarios.forEach((clm, idx) => {
    const st = pickStaff(clm.staffIdx);
    lines.push(
      ins(
        "finance.expense_claim",
        {
          id: u(`claim-${clm.key}`),
          claim_number: clm.num,
          claimant_id: st.id,
          amount: clm.amt,
          currency: cur,
          expense_date: dateAgo(10 - idx * 2),
          reason: clm.reason,
          status: clm.status,
          review_notes: clm.status === "rejected" ? "Please attach NBR VAT receipt and re-submit." : clm.status === "paid" ? "Reimbursed via NBB payroll batch." : null,
          paid_at: clm.status === "paid" ? ago(2) : null,
          paid_by_id: clm.status === "paid" ? finMgr.id : null,
          payment_method: clm.status === "paid" ? "bank_transfer" : null,
          created_at: ago(10 - idx * 2),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  // ── 5. COMMERCE: Full Storefront Order Lifecycle (Pending -> Delivered, Cancelled, Refunded) ──
  lines.push(`\n-- SCENARIO EXPANSION: COMMERCE ORDERS (ALL LIFECYCLE STATES & PAYMENT METHODS)`);
  const orderScenarios = [
    { key: "ord-pending-cod", custIdx: 35, num: `${pfx}-SO-9101`, status: "pending", payStatus: "unpaid", payMethod: "cod", sub: 84.5, disc: 0, days: 0, note: "Call customer on arrival at Riffa Views East Gate." },
    { key: "ord-confirmed-bp", custIdx: 36, num: `${pfx}-SO-9102`, status: "confirmed", payStatus: "paid", payMethod: "benefitpay", sub: 142.0, disc: 14.2, days: 1, note: "Paid via BenefitPay; gift-wrap requested." },
    { key: "ord-processing-card", custIdx: 37, num: `${pfx}-SO-9103`, status: "processing", payStatus: "paid", payMethod: "card", sub: 265.0, disc: 0, days: 2, note: "Priority packing at Manama central hub." },
    { key: "ord-shipped-cod", custIdx: 38, num: `${pfx}-SO-9104`, status: "shipped", payStatus: "unpaid", payMethod: "cod", sub: 118.75, disc: 10, days: 3, note: "Dispatched with Express Courier — Amwaj Islands route." },
    { key: "ord-delivered-card", custIdx: 39, num: `${pfx}-SO-9105`, status: "delivered", payStatus: "paid", payMethod: "card", sub: 390.0, disc: 39.0, days: 6, note: "Signed delivery proof captured by recipient." },
    { key: "ord-cancelled", custIdx: 40, num: `${pfx}-SO-9106`, status: "cancelled", payStatus: "unpaid", payMethod: "cod", sub: 64.0, disc: 0, days: 5, note: "Cancelled by customer before dispatch — duplicate order." },
    { key: "ord-refunded", custIdx: 41, num: `${pfx}-SO-9107`, status: "refunded", payStatus: "refunded", payMethod: "card", sub: 195.0, disc: 0, days: 9, note: "Full refund issued to card after damaged outer carton return." },
  ];
  for (const o of orderScenarios) {
    const cust = pickCust(o.custIdx);
    const phoneParts = splitPhone(cust.phone);
    const net = o.sub - o.disc;
    const vat = Number((net * 0.1).toFixed(company.decimals));
    const fee = net >= 150 ? 0 : 2.5;
    const total = Number((net + vat + fee).toFixed(company.decimals));
    lines.push(
      ins(
        "commerce.sales_order",
        {
          id: u(`so-${o.key}`),
          number: o.num,
          customer_id: cust.id,
          contact_id: contactIdOf(o.custIdx),
          email: cust.email,
          name: cust.nameEn,
          phone: cust.phone,
          country_code: phoneParts.countryCode,
          mobile_number: phoneParts.mobileNumber,
          channel: "online_store",
          status: o.status,
          payment_status: o.payStatus,
          payment_method: o.payMethod,
          fulfilment: "delivery",
          shipping_address: { city: cust.city, country: "Bahrain", block: "328", road: "2819", building: "144" },
          subtotal: o.sub,
          discount_amount: o.disc,
          vat_amount: vat,
          delivery_fee: fee,
          total,
          amount_paid: o.payStatus === "paid" || o.payStatus === "refunded" ? total : 0,
          amount_refunded: o.payStatus === "refunded" ? total : 0,
          currency: cur,
          locale: "en",
          note: o.note,
          placed_at: o.days === 0 ? hoursAgo(3) : ago(o.days),
          paid_at: o.payStatus === "paid" || o.payStatus === "refunded" ? ago(o.days) : null,
          shipped_at: o.status === "shipped" || o.status === "delivered" ? ago(Math.max(1, o.days - 1)) : null,
          delivered_at: o.status === "delivered" ? ago(Math.max(1, o.days - 2)) : null,
          cancelled_at: o.status === "cancelled" ? ago(o.days) : null,
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 6. DELIVERY: Shipments covering Failed Attempt, Returned, Out-for-Delivery, Delivered ──
  lines.push(`\n-- SCENARIO EXPANSION: DELIVERY SHIPMENTS (IN-TRANSIT, FAILED ATTEMPT, RETURNED, DELIVERED)`);
  const shipScenarios = [
    { key: "shp-out", custIdx: 38, num: `${pfx}-SHP-9201`, status: "out_for_delivery", cod: 120.0, collected: 0, attempts: 1, reason: null, days: 1 },
    { key: "shp-failed", custIdx: 42, num: `${pfx}-SHP-9202`, status: "failed", cod: 75.5, collected: 0, attempts: 2, reason: "Recipient unavailable at Saar villa; rescheduled for tomorrow morning slot.", days: 2 },
    { key: "shp-returned", custIdx: 41, num: `${pfx}-SHP-9203`, status: "returned", cod: 0, collected: 0, attempts: 1, reason: "Returned to Sitra hub — outer packaging damaged in transit.", days: 6 },
    { key: "shp-delivered", custIdx: 39, num: `${pfx}-SHP-9204`, status: "delivered", cod: 85.0, collected: 85.0, attempts: 1, reason: null, days: 4 },
  ];
  for (const sh of shipScenarios) {
    const cust = pickCust(sh.custIdx);
    const phoneParts = splitPhone(cust.phone);
    lines.push(
      ins(
        "delivery.shipment",
        {
          id: u(`shp-${sh.key}`),
          number: sh.num,
          order_id: u(`so-ord-${sh.key === "shp-out" ? "shipped-cod" : sh.key === "shp-delivered" ? "delivered-card" : sh.key === "shp-returned" ? "refunded" : "pending-cod"}`),
          status: sh.status,
          method: "own_fleet",
          promised_by: sh.status === "delivered" ? ago(sh.days - 1) : ahead(1),
          recipient_name: cust.nameEn,
          recipient_phone: cust.phone,
          recipient_country_code: phoneParts.countryCode,
          recipient_mobile_number: phoneParts.mobileNumber,
          address: { city: cust.city, country: "Bahrain", block: "412", road: "1208", building: "88" },
          cod_amount: sh.cod,
          cod_collected: sh.collected,
          tracking_token: sha256(`${company.slug}:${sh.num}`).slice(0, 24),
          attempts: sh.attempts,
          failure_reason: sh.reason,
          out_at: ago(sh.days),
          delivered_at: sh.status === "delivered" ? ago(sh.days - 1) : null,
          tracking_number: `BH-${pfx}-${sh.num.slice(-4)}`,
          created_at: ago(sh.days + 1),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 7. HR: Leave Requests across Pending, Approved, Rejected, Cancelled ──
  lines.push(`\n-- SCENARIO EXPANSION: HR LEAVE REQUESTS (ALL APPROVAL STATES)`);
  const leaveScenarios = [
    { key: "lv-pending-annual", staffIdx: 11, type: "annual", startAhead: 12, days: 5, status: "pending", reason: "Family travel to Oman during school midterm break" },
    { key: "lv-approved-sick", staffIdx: 15, type: "sick", startAhead: -4, days: 2, status: "approved", reason: "Medical certificate submitted from King Hamad University Hospital" },
    { key: "lv-rejected-peak", staffIdx: 18, type: "annual", startAhead: 4, days: 7, status: "rejected", reason: "Requested during quarter-end financial close; rescheduled to next month" },
    { key: "lv-cancelled", staffIdx: 22, type: "emergency", startAhead: 8, days: 1, status: "cancelled", reason: "Withdrawn by employee — appointment moved to weekend" },
  ];
  for (const lv of leaveScenarios) {
    const st = pickStaff(lv.staffIdx);
    const startSql = lv.startAhead >= 0 ? dateAhead(lv.startAhead) : dateAgo(Math.abs(lv.startAhead));
    const endSql = lv.startAhead + lv.days >= 0 ? dateAhead(lv.startAhead + lv.days) : dateAgo(Math.abs(lv.startAhead + lv.days));
    lines.push(
      ins(
        "hr.leave_request",
        {
          id: u(`leave-${lv.key}`),
          employee_id: st.id,
          leave_type: lv.type,
          start_date: startSql,
          end_date: endSql,
          days_count: lv.days,
          days: lv.days,
          full_day: true,
          status: lv.status,
          reason: lv.reason,
          approved_by: lv.status === "approved" || lv.status === "rejected" ? hrMgr.id : null,
          approved_by_id: lv.status === "approved" || lv.status === "rejected" ? hrMgr.id : null,
          approved_at: lv.status === "approved" || lv.status === "rejected" ? ago(1) : null,
          review_notes: lv.status === "rejected" ? "Overlap with quarterly inventory count." : lv.status === "approved" ? "Approved with coverage confirmed." : null,
          created_at: ago(5),
          updated_at: ago(1),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 8. ITSM: SLA-Breached, Reminded, Unassigned Urgent, Waiting & Resolved Tickets + Conversation ──
  lines.push(`\n-- SCENARIO EXPANSION: ITSM TICKETS (BREACHED SLA, REMINDED, UNASSIGNED URGENT, RESOLVED)`);
  const ticketScenarios = [
    {
      key: "tkt-breached",
      num: 901,
      staffIdx: 3,
      cat: "software",
      sub: "erp",
      prio: "critical",
      status: "in_progress",
      title: "NBR VAT QR code failing to render on Arabic PDF invoices",
      desc: "When exporting Arabic VAT tax invoices for Seef Waterfront Hospitality, the TLV QR block overflows the footer margin.",
      assigneeId: itEng.id,
      assigneeName: itEng.displayName,
      respondBy: ago(2),
      resolveBy: ago(1),
      breachedAt: ago(1),
      remindedAt: ago(2),
      resolvedAt: null,
      closedAt: null,
    },
    {
      key: "tkt-unassigned-urgent",
      num: 902,
      staffIdx: 14,
      cat: "network",
      sub: "vpn",
      prio: "critical",
      status: "open",
      title: "Sitra warehouse barcode scanners losing Wi-Fi roaming at Bay 4",
      desc: "Handheld Zebra scanners drop connection to the inventory API whenever forklifts pass loading bay 4.",
      assigneeId: null,
      assigneeName: null,
      respondBy: hoursAhead(2),
      resolveBy: hoursAhead(6),
      breachedAt: null,
      remindedAt: null,
      resolvedAt: null,
      closedAt: null,
    },
    {
      key: "tkt-reminded-high",
      num: 903,
      staffIdx: 7,
      cat: "access",
      sub: "permissions",
      prio: "high",
      status: "assigned",
      title: "Provision read-only finance reporting access for external BDO auditor",
      desc: "Need time-boxed read-only access for Q3 statutory audit covering general ledger and supplier bills.",
      assigneeId: itSupp.id,
      assigneeName: itSupp.displayName,
      respondBy: hoursAhead(1),
      resolveBy: hoursAhead(10),
      breachedAt: null,
      remindedAt: hoursAgo(1),
      resolvedAt: null,
      closedAt: null,
    },
    {
      key: "tkt-resolved-full",
      num: 904,
      staffIdx: 9,
      cat: "hardware",
      sub: "workstation",
      prio: "normal",
      status: "resolved",
      title: "Replace thermal receipt printer head at Manama POS counter 2",
      desc: "Receipts printing faded barcodes on BenefitPay customer slips.",
      assigneeId: itSupp.id,
      assigneeName: itSupp.displayName,
      respondBy: ago(3),
      resolveBy: ago(2),
      breachedAt: null,
      remindedAt: null,
      resolvedAt: ago(2),
      closedAt: null,
    },
  ];
  for (const tk of ticketScenarios) {
    const req = pickStaff(tk.staffIdx);
    const tktId = u(`tkt-${tk.key}`);
    lines.push(
      ins(
        "itsm.ticket",
        {
          id: tktId,
          number: tk.num,
          requester_id: req.id,
          requester_name: req.nameEn,
          requester_email: staffEmail(req, domainHost),
          category: tk.cat,
          subcategory: tk.sub,
          priority: tk.prio,
          status: tk.status,
          title: tk.title,
          description: tk.desc,
          assignee_id: tk.assigneeId,
          assignee_name: tk.assigneeName,
          respond_by: tk.respondBy,
          resolve_by: tk.resolveBy,
          first_response_at: tk.assigneeId ? ago(2) : null,
          breached_at: tk.breachedAt,
          reminded_at: tk.remindedAt,
          resolved_at: tk.resolvedAt,
          closed_at: tk.closedAt,
          employee_id: req.id,
          department_id: req.dept,
          created_at: ago(3),
          updated_at: now,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    if (tk.assigneeId) {
      lines.push(
        ins(
          "itsm.ticket_comment",
          {
            id: u(`tkt-c1-${tk.key}`),
            ticket_id: tktId,
            author_realm: "it",
            author_id: tk.assigneeId,
            author_name: tk.assigneeName,
            body: `Investigating ${tk.title.toLowerCase()} — diagnostics attached to engineering trace.`,
            internal: true,
            created_at: ago(2),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
      lines.push(
        ins(
          "itsm.ticket_comment",
          {
            id: u(`tkt-c2-${tk.key}`),
            ticket_id: tktId,
            author_realm: "it",
            author_id: tk.assigneeId,
            author_name: tk.assigneeName,
            body: tk.status === "resolved"
              ? "Thermal head replaced and test receipt verified with barcode scanner. Marking as resolved."
              : "We have reproduced the issue and are deploying the patch. Will confirm shortly.",
            internal: false,
            created_at: ago(1),
          },
          "ON CONFLICT (id) DO NOTHING",
        ),
      );
    }
  }

  // ── 9. WORKFLOW: Expiring/Renewed Contracts, Approvals & Signature Requests ──
  lines.push(`\n-- SCENARIO EXPANSION: WORKFLOW CONTRACTS (EXPIRING SOON, RENEWED, EXPIRED) & APPROVALS`);
  const contractScenarios = [
    { key: "ctr-expiring", num: `${pfx}-CTR-901`, custIdx: 9, en: "Seef Waterfront Annual SLA & Maintenance Agreement", ar: "اتفاقية مستوى الخدمة والصيانة السنوية - سيف ووترفرونت", status: "active", startDays: 345, endDays: 18, val: 24000 },
    { key: "ctr-renewed", num: `${pfx}-CTR-902`, custIdx: 12, en: "Dilmunia Wellness Center Multi-Year Supply Contract", ar: "عقد التوريد متعدد السنوات - مركز دلمونيا الصحي", status: "active", startDays: 15, endDays: 350, val: 34200 },
    { key: "ctr-expired", num: `${pfx}-CTR-903`, custIdx: 16, en: "Sitra Logistics Legacy Fleet Lease", ar: "عقد تأجير الأسطول السابق - سترة اللوجستية", status: "expired", startDays: 400, endDays: -35, val: 16800 },
  ];
  for (const ct of contractScenarios) {
    const cust = pickCust(ct.custIdx);
    const contactId = contactIdOf(ct.custIdx);
    const ctrId = u(`ctr-${ct.key}`);
    lines.push(
      ins(
        "workflow.contract",
        {
          id: ctrId,
          contract_number: ct.num,
          title: ct.en,
          title_ar: ct.ar,
          contract_type: "client_agreement",
          contact_id: contactId,
          status: ct.status,
          start_date: dateAgo(ct.startDays),
          end_date: ct.endDays >= 0 ? dateAhead(ct.endDays) : dateAgo(Math.abs(ct.endDays)),
          value: ct.val,
          currency: cur,
          notes: `Governing commercial contract with ${cust.nameEn} (${cust.city}).`,
          created_by_id: sa.id,
          signed_by_id: sa.id,
          created_at: ago(ct.startDays),
          updated_at: ago(2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
    lines.push(
      ins(
        "workflow.signature_request",
        {
          id: u(`sig-${ct.key}`),
          title: `Counter-Signature: ${ct.en}`,
          document_type: "contract",
          document_id: ctrId,
          requested_from: cust.email,
          status: ct.key === "ctr-expiring" ? "pending" : "signed",
          signed_at: ct.key === "ctr-expiring" ? null : ago(14),
          expires_at: ahead(14),
          client_id: cust.id,
          created_by_id: sa.id,
          created_at: ago(16),
          updated_at: ago(2),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 10. NOTIFY: Email & WhatsApp messages in Sent, Queued, and Failed states ──
  lines.push(`\n-- SCENARIO EXPANSION: NOTIFY MESSAGES (SENT, QUEUED, FAILED FOR RETRY)`);
  const notifyScenarios = [
    { key: "mail-sent", ch: "email", to: pickCust(9).email, subj: `${company.shortEn}: VAT Invoice ${pfx}-INV-9002 Issued`, status: "sent", err: null, days: 1 },
    { key: "mail-failed", ch: "email", to: pickCust(16).email, subj: `${company.shortEn}: Overdue Payment Reminder ${pfx}-INV-9003`, status: "failed", err: "SMTP 451 temporary recipient greylisting — eligible for retry", days: 0 },
    { key: "wa-sent", ch: "whatsapp", to: pickCust(38).phone, subj: null, status: "sent", err: null, days: 1 },
    { key: "wa-failed", ch: "whatsapp", to: pickCust(42).phone, subj: null, status: "failed", err: "WhatsApp template window expired — retry with approved delivery template", days: 0 },
    { key: "mail-queued", ch: "email", to: pickCust(12).email, subj: `${company.shortEn}: Contract Renewal Schedule`, status: "queued", err: null, days: 0 },
  ];
  for (const n of notifyScenarios) {
    lines.push(
      ins(
        "notify.message",
        {
          id: u(`msg-${n.key}`),
          caller: "system",
          idempotency_key: `${company.slug}:exp:${n.key}`,
          actor: sa.id,
          channel: n.ch,
          recipient: n.to,
          subject: n.subj,
          body_text: n.subj || `${company.shortEn}: Your delivery update is ready for tracking.`,
          body_html: n.ch === "email" ? `<p>${n.subj}</p>` : null,
          status: n.status,
          attempts: n.status === "failed" ? 3 : n.status === "sent" ? 1 : 0,
          provider: n.ch === "email" ? "smtp" : "whatsapp",
          last_error: n.err,
          created_at: n.days === 0 ? hoursAgo(2) : ago(n.days),
          updated_at: now,
          sent_at: n.status === "sent" ? ago(n.days) : null,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 11. AUDIT: Correlated cross-service events with trace_ids & real ticket UUIDs ──
  lines.push(`\n-- SCENARIO EXPANSION: AUDIT CORRELATED EVENTS`);
  const auditScenarios = [
    { key: "aud-tkt-1", subject: "itsm.ticket.updated", service: "itsm", entity: "ticket", verb: "updated", actor: `it:${itEng.id}`, trace: `tr-${pfx.toLowerCase()}-sla-901`, payload: { ticketId: u("tkt-tkt-breached"), number: 901, status: "in_progress", priority: "urgent" }, hours: 3 },
    { key: "aud-bak-1", subject: "system.backup.verified", service: "system", entity: "backup", verb: "verified", actor: `it:${itMgr.id}`, trace: `tr-${pfx.toLowerCase()}-bak-01`, payload: { backupId: u("bak-db-verified-latest"), kind: "database", status: "verified" }, hours: 8 },
    { key: "aud-inv-1", subject: "finance.invoice.posted", service: "finance", entity: "invoice", verb: "posted", actor: `staff:${finMgr.id}`, trace: `tr-${pfx.toLowerCase()}-inv-9001`, payload: { invoiceId: u("inv-paid-retainer"), invoiceNumber: `${pfx}-INV-9001`, currency: cur }, hours: 16 },
    { key: "aud-sess-1", subject: "identity.session.started", service: "identity", entity: "session", verb: "started", actor: `it:${itMgr.id}`, trace: `tr-${pfx.toLowerCase()}-sess-01`, payload: { realm: "it", ip: "185.125.190.42", concurrentSessions: 3 }, hours: 2 },
  ];
  for (const ev of auditScenarios) {
    lines.push(
      ins(
        "audit.event",
        {
          id: u(`audit-${ev.key}`),
          subject: ev.subject,
          service: ev.service,
          entity: ev.entity,
          verb: ev.verb,
          actor: ev.actor,
          occurred_at: hoursAgo(ev.hours),
          received_at: hoursAgo(ev.hours),
          payload: ev.payload,
          trace_id: ev.trace,
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  }

  // ── 12. CMS: Additional Authentic Bilingual Reviews & FAQs ──
  lines.push(`\n-- SCENARIO EXPANSION: CMS REVIEWS & FAQS`);
  const extraReviews = [
    {
      key: "rev-almoayyed",
      authorEn: "Eng. Salman Al-Moayyed",
      authorAr: "م. سلمان المؤيد",
      compEn: "Almoayyed Contracting Group W.L.L.",
      compAr: "مجموعة المؤيد للمقاولات ذ.م.م",
      quoteEn: `${company.shortEn} consistently delivers on complex Bahrain commercial schedules with transparent VAT documentation and responsive bilingual account leads.`,
      quoteAr: `تلتزم ${company.shortAr} دائماً بالجداول الزمنية للمشاريع التجارية في البحرين مع توثيق ضريبي شفاف وفريق حسابات سريع الاستجابة.`,
      rating: 5,
    },
    {
      key: "rev-dilmunia",
      authorEn: "Dr. Hessa Al-Zayani",
      authorAr: "د. حصة الزياني",
      compEn: "Dilmunia Health & Wellness Center",
      compAr: "مركز دلمونيا للصحة والعافية",
      quoteEn: `From initial quotation to final commissioning, the ${company.shortEn} operations team exceeded our SLA expectations.`,
      quoteAr: `من عرض السعر الأولي حتى التسليم النهائي، تجاوز فريق عمليات ${company.shortAr} توقعاتنا في الالتزام بمستوى الخدمة.`,
      rating: 5,
    },
  ];
  extraReviews.forEach((rv, idx) => {
    lines.push(
      ins(
        "cms.review",
        {
          id: u(`rev-${rv.key}`),
          author_en: rv.authorEn,
          author_ar: rv.authorAr,
          company_en: rv.compEn,
          company_ar: rv.compAr,
          quote_en: rv.quoteEn,
          quote_ar: rv.quoteAr,
          rating: rv.rating,
          is_approved: true,
          sort_order: 20 + idx,
          year: 2026,
          created_at: ago(15 + idx * 5),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  const extraFaqs = [
    {
      key: "faq-vat",
      qEn: `Are all ${company.shortEn} invoices compliant with Bahrain NBR 10% VAT regulations?`,
      qAr: `هل جميع فواتير ${company.shortAr} متوافقة مع لوائح ضريبة القيمة المضافة 10% في البحرين؟`,
      aEn: `Yes. Every quotation and tax invoice includes our registered VAT ID (${company.vatId}), itemized tax calculations, and verifiable QR metadata.`,
      aAr: `نعم، تتضمن كل فاتورة ضريبية وعرض سعر رقمنا الضريبي المسجل (${company.vatId}) مع تفصيل الضريبة ورمز التحقق.`,
      cat: "billing",
    },
    {
      key: "faq-delivery",
      qEn: "Which Bahrain governorates and GCC destinations do you cover?",
      qAr: "ما هي المحافظات في البحرين ووجهات الخليج التي تغطونها؟",
      aEn: "We provide same-day and next-day fulfillment across Capital, Muharraq, Northern, and Southern Governorates, plus scheduled cross-border freight to Saudi Arabia, UAE, Qatar, Kuwait, and Oman.",
      aAr: "نوفر التوصيل في نفس اليوم أو اليوم التالي في جميع محافظات البحرين، بالإضافة إلى الشحن المجدول لدول مجلس التعاون الخليجي.",
      cat: "logistics",
    },
  ];
  extraFaqs.forEach((fq, idx) => {
    lines.push(
      ins(
        "cms.faq",
        {
          id: u(`faq-${fq.key}`),
          question_en: fq.qEn,
          question_ar: fq.qAr,
          answer_en: fq.aEn,
          answer_ar: fq.aAr,
          category: fq.cat,
          is_published: true,
          sort_order: 20 + idx,
          created_at: ago(20 + idx * 3),
        },
        "ON CONFLICT (id) DO NOTHING",
      ),
    );
  });

  return lines.join("\n");
}

module.exports = { buildScenarioExpansionSql };
