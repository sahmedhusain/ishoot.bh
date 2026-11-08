const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function queryJson(sql) {
  try {
    const raw = execSync(
      `docker exec platform-postgres-1 psql -U platform -d platform_db -t -A -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    ).trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Query failed:", sql, err.message);
    return null;
  }
}

function sqlQuote(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0] === "object") {
      return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
    }
    const elements = val.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(",");
    return `'{${elements}}'`;
  }
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlJson(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

console.log("Loading base entities from platform_db...");

const ishootCompany = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company) t")[0];
const companyAssets = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company_asset) t") || [];
const moduleSettings = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.module_setting) t") || [];
const uploadObjects = queryJson("SELECT json_agg(t) FROM (SELECT * FROM files.upload_object) t") || [];
const staffRoles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role) t") || [];
const staffScopes = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role_scope) t") || [];
const staffPermissions = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_permission) t") || [];
const accounts = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.account) t") || [];
const staffAccess = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_access) t") || [];
const departments = queryJson("SELECT json_agg(t) FROM (SELECT * FROM hr.department) t") || [];
const employees = queryJson("SELECT json_agg(t) FROM (SELECT * FROM hr.employee) t") || [];
const contacts = queryJson("SELECT json_agg(t) FROM (SELECT * FROM sales.contact) t") || [];
const deals = queryJson("SELECT json_agg(t) FROM (SELECT * FROM sales.deal) t") || [];
const quotations = queryJson("SELECT json_agg(t) FROM (SELECT * FROM sales.quotation) t") || [];
const quotationItems = queryJson("SELECT json_agg(t) FROM (SELECT * FROM sales.quotation_item) t") || [];
const inquiries = queryJson("SELECT json_agg(t) FROM (SELECT * FROM sales.inquiry) t") || [];
const expenseCategories = queryJson("SELECT json_agg(t) FROM (SELECT * FROM finance.expense_category) t") || [];
const categories = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.product_category) t") || [];
const warehouses = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.warehouse) t") || [];
const locations = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.stock_location) t") || [];
const products = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.product) t") || [];
const customers = queryJson("SELECT json_agg(t) FROM (SELECT * FROM commerce.customer) t") || [];
const vehicles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM delivery.vehicle) t") || [];
const tasks = queryJson("SELECT json_agg(t) FROM (SELECT * FROM workflow.task) t") || [];
const calendarEvents = queryJson("SELECT json_agg(t) FROM (SELECT * FROM workflow.calendar_event) t") || [];
const pages = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.page) t") || [];
const articles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.article) t") || [];
const faqs = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.faq) t") || [];
const stats = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.statistic) t") || [];
const reviews = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.review) t") || [];
const contentSnapshot = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.content_snapshot WHERE id = 'main') t")[0];

const northwindCompanyJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/demo/company.json"), "utf8"));
const northwindThemeJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/demo/theme.json"), "utf8"));

console.log("Core database snapshots loaded.");

// Helper to build full SQL file for a company profile
function generateCompanySeedSql(profileName, companyData, themeData, assetOverrides = {}) {
  const isIshoot = profileName === "ishoot";
  const lines = [];

  lines.push(`-- ============================================================================`);
  lines.push(`-- PURE SQL SEED: ${isIshoot ? "iShoot Cinema Production S.P.C." : "Northwind Studio W.L.L."}`);
  lines.push(`-- Complete multi-microservice fixtures across all 15 schemas`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ============================================================================`);
  lines.push(`BEGIN;`);
  lines.push(``);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 1. CLEANUP PREVIOUS BUSINESS FIXTURES (Idempotent)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`TRUNCATE TABLE`);
  lines.push(`    workflow.calendar_event,`);
  lines.push(`    workflow.task,`);
  lines.push(`    workflow.approval_decision,`);
  lines.push(`    workflow.approval_request,`);
  lines.push(`    workflow.official_letter,`);
  lines.push(`    workflow.letter_template,`);
  lines.push(`    delivery.shipment_event,`);
  lines.push(`    delivery.shipment,`);
  lines.push(`    delivery.route_sheet,`);
  lines.push(`    delivery.vehicle,`);
  lines.push(`    delivery.delivery_slot,`);
  lines.push(`    delivery.delivery_zone,`);
  lines.push(`    commerce.sales_order_event,`);
  lines.push(`    commerce.sales_order_line,`);
  lines.push(`    commerce.sales_order,`);
  lines.push(`    commerce.coupon,`);
  lines.push(`    commerce.customer_address,`);
  lines.push(`    commerce.customer,`);
  lines.push(`    inventory.stock_movement,`);
  lines.push(`    inventory.stock_level,`);
  lines.push(`    inventory.product,`);
  lines.push(`    inventory.stock_location,`);
  lines.push(`    inventory.warehouse,`);
  lines.push(`    inventory.product_category,`);
  lines.push(`    finance.payment,`);
  lines.push(`    finance.invoice_item,`);
  lines.push(`    finance.invoice,`);
  lines.push(`    finance.expense,`);
  lines.push(`    finance.expense_category,`);
  lines.push(`    sales.inquiry,`);
  lines.push(`    sales.quotation_item,`);
  lines.push(`    sales.quotation,`);
  lines.push(`    sales.deal,`);
  lines.push(`    sales.contact,`);
  lines.push(`    hr.payroll_item,`);
  lines.push(`    hr.payroll_run,`);
  lines.push(`    hr.attendance_entry,`);
  lines.push(`    hr.leave_request,`);
  lines.push(`    hr.employee,`);
  lines.push(`    hr.department,`);
  lines.push(`    cms.content_snapshot,`);
  lines.push(`    cms.statistic,`);
  lines.push(`    cms.review,`);
  lines.push(`    cms.faq,`);
  lines.push(`    cms.article,`);
  lines.push(`    cms.page,`);
  lines.push(`    itsm.ticket_comment,`);
  lines.push(`    itsm.ticket_event,`);
  lines.push(`    itsm.ticket,`);
  lines.push(`    itsm.sla_policy,`);
  lines.push(`    notify.notification,`);
  lines.push(`    system.company_asset,`);
  lines.push(`    system.company`);
  lines.push(`CASCADE;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 2. SYSTEM SERVICE (Company Profile, Assets, Modules, Sequences)`);
  lines.push(`-- ----------------------------------------------------------------------------`);

  const companyMergedData = {
    ...companyData,
    theme: themeData,
    ...assetOverrides,
    websitePublished: true,
  };

  lines.push(`INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)`);
  lines.push(`VALUES ('c0000000-0000-0000-0000-000000000001', true, ${sqlQuote(companyMergedData)}, false, 1, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`);
  lines.push(``);

  // System company assets
  for (const asset of companyAssets) {
    let url = asset.file_url;
    if (!isIshoot) {
      if (asset.asset_key === "logo_light") url = "/api/files/brand/logo-light_dbf1f2e280f5.png";
      if (asset.asset_key === "logo_dark") url = "/api/files/brand/logo-dark_50ae2cfc6efa.png";
      if (asset.asset_key === "icon_light" || asset.asset_key === "favicon") url = "/api/files/brand/icon-light_68b1a95d35cf.png";
      if (asset.asset_key === "icon_dark") url = "/api/files/brand/icon-dark_f661f555ebbe.png";
      if (asset.asset_key === "stamp") url = "/api/files/brand/stamp_8df038fc524f.png";
      if (asset.asset_key === "signature") url = "/api/files/brand/signature_28e82e5cdb91.png";
    }
    lines.push(`INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(asset.id)}, ${sqlQuote(asset.asset_key)}, ${sqlQuote(asset.title)}, ${sqlQuote(url)}, ${sqlQuote(asset.mime_type)}, ${asset.file_size || 50000}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();`);
  }
  lines.push(``);

  // System module settings (all 14 modules)
  for (const mod of moduleSettings) {
    lines.push(`INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)`);
    lines.push(`VALUES (${sqlQuote(mod.module_key)}, true, 'seed:sql', now())`);
    lines.push(`ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();`);
  }
  lines.push(``);

  // System document sequences
  lines.push(`INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', '${isIshoot ? "ISH" : "INV"}', 105), ('receipt', 'RCT', 107) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 3. FILES SERVICE (Upload Objects for Brand Artwork & Fonts)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const obj of uploadObjects) {
    lines.push(`INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)`);
    lines.push(`VALUES (${sqlQuote(obj.id)}, ${sqlQuote(obj.file_url)}, 'system', ${sqlQuote(obj.file_name)}, ${obj.file_size}, ${sqlQuote(obj.mime_type)}, ${obj.is_public ? "true" : "false"}, now(), now() + interval '100 years', now())`);
    lines.push(`ON CONFLICT (file_url) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 4. IDENTITY SERVICE (Accounts, Staff Roles, Scopes, Permissions)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const role of staffRoles) {
    lines.push(`INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, created_at, revision) VALUES (${sqlQuote(role.id)}, ${sqlQuote(role.name_en)}, ${sqlQuote(role.name_ar)}, true, now(), 1) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const scope of staffScopes) {
    lines.push(`INSERT INTO identity.staff_role_scope (role_id, area, scope) VALUES (${sqlQuote(scope.role_id)}, ${sqlQuote(scope.area)}, ${sqlQuote(scope.scope)}) ON CONFLICT (role_id, area) DO NOTHING;`);
  }
  for (const perm of staffPermissions) {
    lines.push(`INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES (${sqlQuote(perm.id)}, ${sqlQuote(perm.role_id)}, ${sqlQuote(perm.resource)}, ${sqlQuote(perm.action)}, ${perm.allowed ? "true" : "false"}, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;`);
  }
  lines.push(``);

  // Accounts
  for (const acc of accounts) {
    lines.push(`INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(acc.realm)}, ${sqlQuote(acc.subject_id)}, ${sqlQuote(acc.email)}, ${sqlQuote(acc.username)}, ${sqlQuote(acc.password_hash)}, ${sqlQuote(acc.roles)}, true, false, now(), now())`);
    lines.push(`ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();`);
  }
  for (const acc of staffAccess) {
    lines.push(`INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', ${sqlQuote(acc.subject_id)}, '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 5. HR SERVICE (Departments, Employees, Leaves, Attendance, Payroll)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const dept of departments) {
    lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES (${sqlQuote(dept.id)}, ${sqlQuote(dept.code)}, ${sqlQuote(dept.name_en)}, ${sqlQuote(dept.name_ar)}) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;`);

  for (const emp of employees) {
    lines.push(`INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(emp.id)}, ${sqlQuote(emp.employee_number)}, ${sqlQuote(emp.first_name_en)}, ${sqlQuote(emp.last_name_en)}, ${sqlQuote(emp.first_name_ar)}, ${sqlQuote(emp.last_name_ar)}, ${sqlQuote(emp.email)}, ${sqlQuote(emp.phone)}, ${sqlQuote(emp.job_title_en)}, ${sqlQuote(emp.job_title_ar)}, ${sqlQuote(emp.department_id)}, (CURRENT_DATE - INTERVAL '365 days')::date, 'active', ${emp.basic_salary}, ${emp.housing_allowance}, ${emp.transport_allowance}, 0.000, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  // Leave requests & attendance
  lines.push(`-- Leave requests`);
  lines.push(`INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at) VALUES`);
  lines.push(`  ('lr-001', ${sqlQuote(employees[0]?.id)}, 'annual', (CURRENT_DATE - INTERVAL '40 days')::date, (CURRENT_DATE - INTERVAL '35 days')::date, 5.0, 'approved', 'Annual family vacation', now(), now()),`);
  lines.push(`  ('lr-002', ${sqlQuote(employees[1]?.id)}, 'sick', (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE - INTERVAL '14 days')::date, 2.0, 'approved', 'Medical recovery with doctor note', now(), now()),`);
  lines.push(`  ('lr-003', ${sqlQuote(employees[2]?.id)}, 'annual', (CURRENT_DATE + INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '15 days')::date, 5.0, 'pending', 'Planned personal travel', now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Attendance
  lines.push(`-- Attendance entries`);
  lines.push(`INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at) VALUES`);
  lines.push(`  ('att-001', ${sqlQuote(employees[0]?.id)}, CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'On-site studio setup', now()),`);
  lines.push(`  ('att-002', ${sqlQuote(employees[1]?.id)}, CURRENT_DATE, (CURRENT_DATE + TIME '09:00:00')::timestamptz, NULL, 'present', 'Editing suite A', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Payroll run & items
  lines.push(`-- Historical Payroll Runs`);
  lines.push(`INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at) VALUES`);
  lines.push(`  ('pr-2026-09', 9, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '40 days')::timestamptz, 'super-admin', now()),`);
  lines.push(`  ('pr-2026-10', 10, 2026, 'completed', 14500.000, 750.000, 13750.000, 'BHD', (CURRENT_DATE - INTERVAL '10 days')::timestamptz, 'super-admin', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);
  lines.push(`INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status) VALUES`);
  lines.push(`  ('pi-09-01', 'pr-2026-09', ${sqlQuote(employees[0]?.id)}, 1800.000, 400.000, 150.000, 2050.000, 'paid'),`);
  lines.push(`  ('pi-09-02', 'pr-2026-09', ${sqlQuote(employees[1]?.id)}, 1500.000, 325.000, 120.000, 1705.000, 'paid'),`);
  lines.push(`  ('pi-10-01', 'pr-2026-10', ${sqlQuote(employees[0]?.id)}, 1800.000, 400.000, 150.000, 2050.000, 'paid'),`);
  lines.push(`  ('pi-10-02', 'pr-2026-10', ${sqlQuote(employees[1]?.id)}, 1500.000, 325.000, 120.000, 1705.000, 'paid')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 6. SALES SERVICE (Contacts, Deals across all stages, Quotations, Inquiries)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const c of contacts) {
    lines.push(`INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(c.id)}, ${sqlQuote(c.first_name)}, ${sqlQuote(c.last_name)}, ${sqlQuote(c.email)}, ${sqlQuote(c.phone)}, ${sqlQuote(c.company)}, ${sqlQuote(c.contact_type)}, ${sqlQuote(c.status)}, ${sqlQuote(c.notes)}, ${sqlQuote(c.tags)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  // Deals
  for (const d of deals) {
    lines.push(`INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(d.id)}, ${sqlQuote(d.title)}, ${sqlQuote(d.contact_id)}, ${sqlQuote(d.stage)}, ${d.value}, ${sqlQuote(d.currency)}, ${d.probability}, (CURRENT_DATE + INTERVAL '15 days')::date, ${sqlQuote(d.status)}, ${sqlQuote(d.assigned_to)}, ${sqlQuote(d.notes)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  // Add additional deal scenarios (closed_lost, negotiation)
  lines.push(`INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at) VALUES`);
  lines.push(`  ('deal-extra-001', 'Bayview Grand Hotel 360 Virtual Tour', ${sqlQuote(contacts[0]?.id)}, 'closed_lost', 3500.000, 'BHD', 0, (CURRENT_DATE - INTERVAL '20 days')::date, 'lost', ${sqlQuote(employees[0]?.id)}, 'Client postponed marketing spend until next quarter', now(), now()),`);
  lines.push(`  ('deal-extra-002', 'NovaPay Corporate Fintech Explainers', ${sqlQuote(contacts[1]?.id)}, 'negotiation', 7200.000, 'BHD', 75, (CURRENT_DATE + INTERVAL '30 days')::date, 'open', ${sqlQuote(employees[1]?.id)}, 'Contract terms under review by legal counsel', now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Quotations
  for (const q of quotations) {
    lines.push(`INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(q.id)}, ${sqlQuote(q.quotation_number)}, ${sqlQuote(q.contact_id)}, ${sqlQuote(q.deal_id)}, ${sqlQuote(q.status)}, ${q.subtotal}, ${q.discount}, ${q.vat_rate}, ${q.vat_amount}, ${q.total}, ${sqlQuote(q.currency)}, (CURRENT_DATE + INTERVAL '30 days')::date, ${sqlQuote(q.terms)}, ${sqlQuote(q.notes)}, now(), now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const item of quotationItems) {
    lines.push(`INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)`);
    lines.push(`VALUES (${sqlQuote(item.id)}, ${sqlQuote(item.quotation_id)}, ${sqlQuote(item.description)}, ${item.quantity}, ${item.unit_price}, ${item.amount}, ${item.sort_order})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  // Inquiries
  for (const inq of inquiries) {
    lines.push(`INSERT INTO sales.inquiry (id, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(inq.id)}, ${sqlQuote(inq.subject)}, ${sqlQuote(inq.message)}, ${sqlQuote(inq.requester_name)}, ${sqlQuote(inq.requester_email)}, ${sqlQuote(inq.requester_phone)}, 'new', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 7. FINANCE SERVICE (Expense Categories, Expenses, Invoices across aging buckets, Payments)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const cat of expenseCategories) {
    lines.push(`INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES (${sqlQuote(cat.id)}, ${sqlQuote(cat.code)}, ${sqlQuote(cat.name_en)}, ${sqlQuote(cat.name_ar)}, ${cat.sort_order}) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES`);
  lines.push(`  ('expcat-11', 'maintenance_repairs', 'Gear Calibration & Repairs', 'صيانة ومعايرة المعدات', 11),`);
  lines.push(`  ('expcat-12', 'legal_accounting', 'Legal & Professional Audit', 'استشارات قانونية ومحاسبية', 12)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Expenses with dynamic dates
  lines.push(`-- Historical & Current Expenses`);
  lines.push(`INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at) VALUES`);
  lines.push(`  ('exp-01', 'Location scouting, generator fuel & transport', 320.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '145 days')::date, 'Manama Transport Co.', 'approved', 'Southern Governorate scouting', now(), now()),`);
  lines.push(`  ('exp-02', 'High-Output HMI & Astera Lighting Package Sub-Lease', 650.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '115 days')::date, 'Gulf Optics & Grip', 'approved', 'Astera Titan tubes for night shoot', now(), now()),`);
  lines.push(`  ('exp-03', 'Sound design & 7.1 surround mixing engineer wage', 480.000, 'BHD', 'expcat-02', (CURRENT_DATE - INTERVAL '85 days')::date, 'Bahrain Sound Labs', 'approved', 'Cinema audio mastering', now(), now()),`);
  lines.push(`  ('exp-04', 'Aerial drone airspace clearance fee', 550.000, 'BHD', 'expcat-01', (CURRENT_DATE - INTERVAL '55 days')::date, 'Civil Aviation Affairs (CAA)', 'approved', 'Restricted zone permit', now(), now()),`);
  lines.push(`  ('exp-05', 'Production crew catering & craft services', 450.000, 'BHD', 'expcat-03', (CURRENT_DATE - INTERVAL '32 days')::date, 'Gourmet Catering Co.', 'approved', 'Full day catering 35 crew', now(), now()),`);
  lines.push(`  ('exp-06', 'DaVinci Resolve cloud collaboration server', 120.000, 'BHD', 'expcat-05', (CURRENT_DATE - INTERVAL '25 days')::date, 'Blackmagic Cloud Services', 'approved', 'Remote color grading server', now(), now()),`);
  lines.push(`  ('exp-07', 'Filming permit — Bahrain Bay Coastal Sequence', 180.000, 'BHD', 'expcat-06', (CURRENT_DATE - INTERVAL '5 days')::date, 'Information Affairs Authority', 'approved', 'Official coastal filming permit', now(), now()),`);
  lines.push(`  ('exp-08', 'Studio Soundstage High-Capacity AC & Power Load', 420.000, 'BHD', 'expcat-04', CURRENT_DATE, 'Electricity & Water Authority', 'approved', '18KW light power supply', now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Invoices across aging buckets with dynamic dates (satisfies verify-seed-dates.js: >= NOW - 6mo, <= NOW + 1mo)
  lines.push(`-- Invoices across aging buckets with dynamic date arithmetic`);
  lines.push(`INSERT INTO finance.invoice (id, invoice_number, contact_id, deal_id, quotation_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at) VALUES`);
  lines.push(`  -- Historical Paid Invoices`);
  lines.push(`  ('inv-hist-01', 'INV-HIST-0001', ${sqlQuote(contacts[4]?.id)}, ${sqlQuote(deals[4]?.id)}, NULL, 'paid', (CURRENT_DATE - INTERVAL '150 days')::date, (CURRENT_DATE - INTERVAL '120 days')::date, 4000.000, 0.000, 10.00, 400.000, 4400.000, 4400.000, 0.000, 'BHD', 'Bahrain Circuit F1 Pre-Season Cinematography', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-hist-02', 'INV-HIST-0002', ${sqlQuote(contacts[1]?.id)}, ${sqlQuote(deals[1]?.id)}, NULL, 'paid', (CURRENT_DATE - INTERVAL '120 days')::date, (CURRENT_DATE - INTERVAL '90 days')::date, 9000.000, 0.000, 10.00, 900.000, 9900.000, 9900.000, 0.000, 'BHD', 'Falcon Airways Fleet Brand Story 4K Master', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-hist-03', 'INV-HIST-0003', ${sqlQuote(contacts[2]?.id)}, ${sqlQuote(deals[2]?.id)}, NULL, 'paid', (CURRENT_DATE - INTERVAL '90 days')::date, (CURRENT_DATE - INTERVAL '60 days')::date, 6000.000, 0.000, 10.00, 600.000, 6600.000, 6600.000, 0.000, 'BHD', 'Bahrain Bay Sunset Hyperlapse & Drone Photography', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-hist-04', 'INV-HIST-0004', ${sqlQuote(contacts[3]?.id)}, ${sqlQuote(deals[3]?.id)}, NULL, 'paid', (CURRENT_DATE - INTERVAL '60 days')::date, (CURRENT_DATE - INTERVAL '30 days')::date, 7000.000, 0.000, 10.00, 700.000, 7700.000, 7700.000, 0.000, 'BHD', 'Digital Banking TVC Teasers & Cutdowns', 'Net 30 days', now(), now()),`);
  lines.push(`  -- Overdue Invoices for Aging Buckets`);
  lines.push(`  ('inv-aging-01', 'INV-AGING-0001', ${sqlQuote(contacts[0]?.id)}, ${sqlQuote(deals[0]?.id)}, NULL, 'partially_paid', (CURRENT_DATE - INTERVAL '38 days')::date, (CURRENT_DATE - INTERVAL '8 days')::date, 5000.000, 0.000, 10.00, 500.000, 5500.000, 2750.000, 2750.000, 'BHD', 'Corporate Identity Docu-Series Phase 1 (Overdue 8d)', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-aging-02', 'INV-AGING-0002', ${sqlQuote(contacts[4]?.id)}, ${sqlQuote(deals[4]?.id)}, NULL, 'overdue', (CURRENT_DATE - INTERVAL '75 days')::date, (CURRENT_DATE - INTERVAL '45 days')::date, 2000.000, 0.000, 10.00, 200.000, 2200.000, 0.000, 2200.000, 'BHD', 'Speedway Rigging & Wireless Video Feed (Overdue 45d)', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-aging-03', 'INV-AGING-0003', ${sqlQuote(contacts[1]?.id)}, ${sqlQuote(deals[1]?.id)}, NULL, 'overdue', (CURRENT_DATE - INTERVAL '105 days')::date, (CURRENT_DATE - INTERVAL '75 days')::date, 1500.000, 0.000, 10.00, 150.000, 1650.000, 0.000, 1650.000, 'BHD', 'Aviation Safety Briefing Animation (Overdue 75d)', 'Net 30 days', now(), now()),`);
  lines.push(`  ('inv-aging-04', 'INV-AGING-0004', ${sqlQuote(contacts[3]?.id)}, ${sqlQuote(deals[3]?.id)}, NULL, 'overdue', (CURRENT_DATE - INTERVAL '140 days')::date, (CURRENT_DATE - INTERVAL '110 days')::date, 1200.000, 0.000, 10.00, 120.000, 1320.000, 0.000, 1320.000, 'BHD', 'Archival Footage 4K Restoration (Overdue 110d)', 'Net 30 days', now(), now()),`);
  lines.push(`  -- Current Invoices`);
  lines.push(`  ('inv-curr-01', 'DEMO-INV-0001', ${sqlQuote(contacts[0]?.id)}, ${sqlQuote(deals[0]?.id)}, ${sqlQuote(quotations[0]?.id)}, 'partially_paid', CURRENT_DATE, (CURRENT_DATE + INTERVAL '25 days')::date, 3500.000, 0.000, 10.00, 350.000, 3850.000, 1925.000, 1925.000, 'BHD', 'Gulfwave 5G Commercial (50% Deposit Paid)', '50% deposit, balance on delivery', now(), now()),`);
  lines.push(`  ('inv-curr-02', 'INV-2026-0001', ${sqlQuote(contacts[2]?.id)}, ${sqlQuote(deals[2]?.id)}, ${sqlQuote(quotations[2]?.id)}, 'paid', (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '20 days')::date, 10800.000, 0.000, 10.00, 1080.000, 11880.000, 11880.000, 0.000, 'BHD', 'Exhibition World Bahrain Showcase (100% Paid)', 'Milestone settlement', now(), now()),`);
  lines.push(`  ('inv-curr-03', 'INV-2026-0002', ${sqlQuote(contacts[3]?.id)}, ${sqlQuote(deals[3]?.id)}, ${sqlQuote(quotations[3]?.id)}, 'sent', (CURRENT_DATE - INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '28 days')::date, 8000.000, 0.000, 10.00, 800.000, 8800.000, 0.000, 8800.000, 'BHD', 'Digital Banking TVC Principal Photography & Post', '50% advance, balance on master export', now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Invoice items
  lines.push(`INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order) VALUES`);
  lines.push(`  ('ii-01', 'inv-hist-01', 'Bahrain Circuit F1 Pre-Season Cinematography & FPV Drone', 1, 4000.000, 4000.000, 0),`);
  lines.push(`  ('ii-02', 'inv-hist-02', 'Falcon Airways In-Flight Brand Story 4K Master Export', 1, 9000.000, 9000.000, 0),`);
  lines.push(`  ('ii-03', 'inv-hist-03', 'Bahrain Bay Sunset Hyperlapse & Drone Photography Package', 1, 6000.000, 6000.000, 0),`);
  lines.push(`  ('ii-04', 'inv-hist-04', 'Digital Banking Mobile Experience Campaign (Teasers & Cutdowns)', 1, 7000.000, 7000.000, 0),`);
  lines.push(`  ('ii-05', 'inv-aging-01', 'Corporate Identity Documentary Series Phase 1', 1, 5000.000, 5000.000, 0),`);
  lines.push(`  ('ii-06', 'inv-aging-02', 'Speedway Track-Day Cinema Rigging & Wireless Video Feed', 1, 2000.000, 2000.000, 0),`);
  lines.push(`  ('ii-07', 'inv-aging-03', 'Aviation Safety Briefing Animated Graphics & Sound Design', 1, 1500.000, 1500.000, 0),`);
  lines.push(`  ('ii-08', 'inv-aging-04', 'Archival Footage Licensing & 4K Digital Restoration', 1, 1200.000, 1200.000, 0),`);
  lines.push(`  ('ii-09', 'inv-curr-01', 'Gulfwave 5G Commercial Production (50% Deposit)', 1, 3500.000, 3500.000, 0),`);
  lines.push(`  ('ii-10', 'inv-curr-02', 'Exhibition World Inauguration Film (100% Paid)', 1, 10800.000, 10800.000, 0),`);
  lines.push(`  ('ii-11', 'inv-curr-03', 'Digital Banking TVC Principal Photography & Post', 1, 8000.000, 8000.000, 0)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Payments (no updated_at)
  lines.push(`INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at) VALUES`);
  lines.push(`  ('pay-01', 'RCT-HIST-0001', 'inv-hist-01', ${sqlQuote(contacts[4]?.id)}, 4400.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '135 days')::date, 'PAY-F1-0001', 'completed', 'Settled via wire', now()),`);
  lines.push(`  ('pay-02', 'RCT-HIST-0002', 'inv-hist-02', ${sqlQuote(contacts[1]?.id)}, 9900.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '105 days')::date, 'PAY-FLC-0002', 'completed', 'Settled via wire', now()),`);
  lines.push(`  ('pay-03', 'RCT-HIST-0003', 'inv-hist-03', ${sqlQuote(contacts[2]?.id)}, 6600.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '75 days')::date, 'PAY-BHT-0003', 'completed', 'Settled via wire', now()),`);
  lines.push(`  ('pay-04', 'RCT-HIST-0004', 'inv-hist-04', ${sqlQuote(contacts[3]?.id)}, 7700.000, 'BHD', 'bank_transfer', (CURRENT_DATE - INTERVAL '45 days')::date, 'PAY-HNB-0004', 'completed', 'Settled via wire', now()),`);
  lines.push(`  ('pay-05', 'RCT-AGING-0001', 'inv-aging-01', ${sqlQuote(contacts[0]?.id)}, 2750.000, 'BHD', 'benefit_pay', (CURRENT_DATE - INTERVAL '35 days')::date, 'BENEFIT-331201', 'completed', 'Settled via BenefitPay', now()),`);
  lines.push(`  ('pay-06', 'DEMO-RCT-0001', 'inv-curr-01', ${sqlQuote(contacts[0]?.id)}, 1925.000, 'BHD', 'benefit_pay', CURRENT_DATE, 'DEMO-PAY-0001', 'completed', '50% advance', now()),`);
  lines.push(`  ('pay-07', 'RCT-2026-0001', 'inv-curr-02', ${sqlQuote(contacts[2]?.id)}, 11880.000, 'BHD', 'bank_transfer', CURRENT_DATE, 'PAY-BAT-2026-9921', 'completed', 'Full settlement', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 8. INVENTORY SERVICE (Categories, Warehouses, Locations, Products, Stock)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const cat of categories) {
    lines.push(`INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active) VALUES (${sqlQuote(cat.id)}, ${sqlQuote(cat.slug)}, ${sqlQuote(cat.name_en)}, ${sqlQuote(cat.name_ar)}, ${sqlQuote(cat.description_en)}, ${sqlQuote(cat.description_ar)}, ${cat.sort_order}, true) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const w of warehouses) {
    lines.push(`INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at) VALUES (${sqlQuote(w.id)}, ${sqlQuote(w.code)}, ${sqlQuote(w.name_en)}, ${sqlQuote(w.name_ar)}, ${sqlQuote(w.address)}, true, ${w.is_default ? "true" : "false"}, ${w.sort_order}, now(), now()) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const loc of locations) {
    lines.push(`INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at) VALUES (${sqlQuote(loc.id)}, ${sqlQuote(loc.warehouse_id)}, ${sqlQuote(loc.code)}, ${sqlQuote(loc.name)}, true, now()) ON CONFLICT (id) DO NOTHING;`);
  }
  for (const p of products) {
    lines.push(`INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(p.id)}, ${sqlQuote(p.sku)}, ${sqlQuote(p.name_en)}, ${sqlQuote(p.name_ar)}, ${sqlQuote(p.description_en)}, ${sqlQuote(p.description_ar)}, ${sqlQuote(p.category_id)}, ${p.cost_price}, ${p.selling_price}, ${sqlQuote(p.currency)}, ${p.tax_rate}, true, true, ${p.reorder_point}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    // Stock level (no created_at)
    lines.push(`INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)`);
    lines.push(`VALUES ('sl-' || ${sqlQuote(p.id)}, ${sqlQuote(p.id)}, ${sqlQuote(locations[0]?.id)}, 4, 0, 4, 1, now()) ON CONFLICT (id) DO NOTHING;`);

    // Stock movement
    lines.push(`INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)`);
    lines.push(`VALUES ('sm-' || ${sqlQuote(p.id)}, ${sqlQuote(p.id)}, ${sqlQuote(locations[0]?.id)}, 'initial', 4, ${p.cost_price}, 'inventory', 'Initial seed gear intake', now()) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 9. COMMERCE & DELIVERY (Customers, Addresses, Coupons, Vehicles, Delivery Zones)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const cust of customers) {
    lines.push(`INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at) VALUES (${sqlQuote(cust.id)}, ${sqlQuote(cust.first_name)}, ${sqlQuote(cust.last_name)}, ${sqlQuote(cust.email)}, ${sqlQuote(cust.phone)}, 'active', now(), now()) ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default) VALUES ('addr-' || ${sqlQuote(cust.id)}, ${sqlQuote(cust.id)}, 'shipping', 'Primary Studio', 'Building 140, Road 2819', 'Floor 4, Suite 402', 'Seef District', 'Capital', '1012', 'BH', true) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO commerce.coupon (id, code, discount_type, discount_value, min_order_amount, is_active, starts_at, expires_at, created_at) VALUES`);
  lines.push(`  ('cpn-001', 'RAMADAN2026', 'percentage', 15.00, 1000.000, true, now() - interval '10 days', now() + interval '60 days', now()),`);
  lines.push(`  ('cpn-002', 'NEWGEAR100', 'fixed', 100.000, 1500.000, true, now() - interval '5 days', now() + interval '90 days', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  for (const v of vehicles) {
    lines.push(`INSERT INTO delivery.vehicle (id, plate, name, kind, notes, is_active, created_at, updated_at) VALUES (${sqlQuote(v.id)}, ${sqlQuote(v.plate)}, ${sqlQuote(v.name)}, ${sqlQuote(v.kind)}, 'Production fleet unit', true, now(), now()) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO delivery.delivery_zone (id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES`);
  lines.push(`  ('dz-01', 'Capital Governorate (Manama & Seef)', 'محافظة العاصمة (المنامة والسيف)', '{"Manama", "Seef", "Juffair"}', 5.000, 20.000, 100.000, true, 1, now(), now()),`);
  lines.push(`  ('dz-02', 'Northern Governorate (Saar & Budaiya)', 'المحافظة الشمالية (سار والبديع)', '{"Saar", "Budaiya", "Janabiya"}', 7.000, 20.000, 150.000, true, 2, now(), now()),`);
  lines.push(`  ('dz-03', 'Southern Governorate (Zallaq & Sakhir)', 'المحافظة الجنوبية (الزلاق والصخير)', '{"Zallaq", "Sakhir", "Riffa"}', 10.000, 30.000, 200.000, true, 3, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`INSERT INTO delivery.delivery_slot (id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at) VALUES`);
  lines.push(`  ('ds-01', 'dz-01', 1, '09:00', '13:00', 8, true, now()),`);
  lines.push(`  ('ds-02', 'dz-01', 1, '14:00', '18:00', 8, true, now()),`);
  lines.push(`  ('ds-03', 'dz-02', 2, '10:00', '15:00', 6, true, now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 10. WORKFLOW SERVICE (Tasks, Calendar Events, Letter Templates)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const t of tasks) {
    lines.push(`INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(t.id)}, ${sqlQuote(t.title)}, ${sqlQuote(t.description)}, ${sqlQuote(t.assigned_to)}, (CURRENT_DATE + INTERVAL '5 days')::date, ${sqlQuote(t.priority)}, ${sqlQuote(t.status)}, ${sqlQuote(t.related_entity_type)}, ${sqlQuote(t.related_entity_id)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const ev of calendarEvents) {
    lines.push(`INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)`);
    lines.push(`VALUES (${sqlQuote(ev.id)}, ${sqlQuote(ev.title)}, ${sqlQuote(ev.description)}, now() + interval '2 days', now() + interval '2 days 4 hours', ${sqlQuote(ev.organizer_id)}, ${sqlQuote(ev.event_type)}, ${sqlQuote(ev.location)}, false, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO workflow.letter_template (id, name_en, name_ar, template_body, sort_order) VALUES`);
  lines.push(`  ('lt-01', 'Employment & Salary Certificate', 'شهادة راتب وعمل', 'This is to certify that {{employee_name}} is employed at {{company_name}} with monthly salary {{salary}}.', 1),`);
  lines.push(`  ('lt-02', 'Quotation Official Cover Letter', 'خطاب تقديم عرض أسعار', 'We are pleased to submit our commercial quotation {{quotation_number}} for your review.', 2)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 11. CMS SERVICE (Pages, Articles, FAQs, Statistics, Reviews, Content Snapshot)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const page of pages) {
    lines.push(`INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(page.id)}, ${sqlQuote(page.slug)}, ${sqlQuote(page.page_type)}, ${sqlQuote(page.title_en)}, ${sqlQuote(page.title_ar)}, ${sqlJson(page.blocks)}, ${page.is_visible ? "true" : "false"}, ${page.in_header ? "true" : "false"}, false, ${page.sort_order}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const art of articles) {
    lines.push(`INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(art.id)}, ${sqlQuote(art.slug)}, ${sqlQuote(art.title_en)}, ${sqlQuote(art.title_ar)}, ${sqlQuote(art.excerpt_en)}, ${sqlQuote(art.excerpt_ar)}, ${sqlQuote(art.category)}, ${sqlQuote(art.tags)}, 'Editorial Team', 'published', ${art.featured ? "true" : "false"}, now(), now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const faq of faqs) {
    lines.push(`INSERT INTO cms.faq (id, question_en, question_ar, answer_en, answer_ar, category, is_published, sort_order, created_at)`);
    lines.push(`VALUES (${sqlQuote(faq.id)}, ${sqlQuote(faq.question_en)}, ${sqlQuote(faq.question_ar)}, ${sqlQuote(faq.answer_en)}, ${sqlQuote(faq.answer_ar)}, 'general', true, ${faq.sort_order}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const st of stats) {
    lines.push(`INSERT INTO cms.statistic (id, metric_value, label_en, label_ar, sort_order)`);
    lines.push(`VALUES (${sqlQuote(st.id)}, ${sqlQuote(st.metric_value)}, ${sqlQuote(st.label_en)}, ${sqlQuote(st.label_ar)}, ${st.sort_order})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const rev of reviews) {
    lines.push(`INSERT INTO cms.review (id, author_en, author_ar, company_en, company_ar, quote_en, quote_ar, rating, is_approved, year, sort_order, created_at)`);
    lines.push(`VALUES (${sqlQuote(rev.id)}, ${sqlQuote(rev.author_en)}, ${sqlQuote(rev.author_ar)}, ${sqlQuote(rev.company_en)}, ${sqlQuote(rev.company_ar)}, ${sqlQuote(rev.quote_en)}, ${sqlQuote(rev.quote_ar)}, ${rev.rating}, true, '2026', ${rev.sort_order}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Pre-compiled full content snapshot
  lines.push(`INSERT INTO cms.content_snapshot (id, draft, published, revision, published_at, updated_at)`);
  lines.push(`VALUES ('main', ${sqlQuote(contentSnapshot.draft)}, ${sqlQuote(contentSnapshot.published)}, ${contentSnapshot.revision || 1}, now(), now())`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, updated_at = now();`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 12. ITSM SERVICE (SLA Policies, Tickets, Timeline Events)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_by, updated_at) VALUES`);
  lines.push(`  ('critical', 30, 240, 'seed:sql', now()),`);
  lines.push(`  ('high', 120, 1440, 'seed:sql', now()),`);
  lines.push(`  ('normal', 480, 4320, 'seed:sql', now()),`);
  lines.push(`  ('low', 1440, 10080, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (priority) DO UPDATE SET response_minutes = EXCLUDED.response_minutes, resolve_minutes = EXCLUDED.resolve_minutes, updated_at = now();`);
  lines.push(``);

  lines.push(`INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at) VALUES`);
  lines.push(`  ('70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'infrastructure', 'storage', 'high', 'in_progress', 'High-Speed NAS Storage Volume Expansion', 'Post-production NAS storage at 92% capacity for 8K RAW footage intake.', 'NAS-VOL-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', now() + interval '2 hours', now() + interval '24 hours', now() - interval '1 hour', NULL, now() - interval '2 days', now()),`);
  lines.push(`  ('70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'super-admin', 'Super Admin', 'admin@ishoot.bh', 'hardware', 'calibration', 'medium', 'resolved', 'DaVinci Resolve HDR Reference Monitor Calibration', 'Quarterly calibration completed for Sony BVM-HX310 reference monitor.', 'MON-HDR-01', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', now() - interval '9 days', now() - interval '7 days', now() - interval '9 days', now() - interval '8 days', now() - interval '10 days', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at) VALUES`);
  lines.push(`  ('80da75a0-0445-4b10-ad20-a6366b6a0ad1', '70da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'created', NULL, 'in_progress', '{"message": "Ticket created via system"}'::jsonb, now() - interval '2 days'),`);
  lines.push(`  ('80da75a0-0445-4b10-ad20-a6366b6a0ad2', '70da75a0-0445-4b10-ad20-a6366b6a0ad2', 'it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'status_change', 'in_progress', 'resolved', '{"message": "Colorimeter calibration certified"}'::jsonb, now() - interval '8 days')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 13. NOTIFY SERVICE (Preferences & Notification Feed)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, caller, silent, deliver_at, created_at) VALUES`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'finance', 'high', 'Invoice Payment Received', 'Payment of 11,880 BHD received for Exhibition World Inauguration Film.', 'finance-svc', false, now() - interval '1 hour', now() - interval '1 hour'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'super-admin', 'inventory', 'normal', 'Equipment Check-in Complete', 'ARRI Alexa 35 package safely checked back into Main Equipment Vault.', 'inventory-svc', false, now() - interval '4 hours', now() - interval '4 hours')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`COMMIT;`);
  lines.push(`-- End of SQL Seed`);

  return lines.join("\n");
}

console.log("Writing seeds/sql/seed_ishoot.sql...");
const ishootTheme = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/ishoot/theme.json"), "utf8"));
const ishootCompanyJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/ishoot/company.json"), "utf8"));
const ishootSql = generateCompanySeedSql("ishoot", ishootCompanyJson.company, ishootTheme, ishootCompany.data);
fs.writeFileSync(path.join(root, "seeds/sql/seed_ishoot.sql"), ishootSql);
console.log("✓ seeds/sql/seed_ishoot.sql written.");

console.log("Writing seeds/sql/seed_northwind.sql...");
const northwindSql = generateCompanySeedSql("northwind", northwindCompanyJson.company, northwindThemeJson, {
  logoUrl: "/api/files/brand/logo-light_dbf1f2e280f5.png",
  darkLogoUrl: "/api/files/brand/logo-dark_50ae2cfc6efa.png",
  iconUrl: "/api/files/brand/icon-light_68b1a95d35cf.png",
  darkIconUrl: "/api/files/brand/icon-dark_f661f555ebbe.png",
  stampUrl: "/api/files/brand/stamp_8df038fc524f.png",
  signatureUrl: "/api/files/brand/signature_28e82e5cdb91.png",
});
fs.writeFileSync(path.join(root, "seeds/sql/seed_northwind.sql"), northwindSql);
console.log("✓ seeds/sql/seed_northwind.sql written.");

// Default seed file
fs.writeFileSync(path.join(root, "seeds/seed.sql"), ishootSql);
console.log("✓ seeds/seed.sql written.");

// Minimal bootstrap SQL
const bootstrapSql = `-- ============================================================================
-- PURE SQL BOOTSTRAP: Minimal Clean Installation
-- Super Admin, IT Admin, System Roles & Core Module Settings
-- ============================================================================
BEGIN;

TRUNCATE TABLE
    system.company_asset,
    system.company
CASCADE;

-- Base company row for setup wizard
INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)
VALUES ('c0000000-0000-0000-0000-000000000001', true, '{"websitePublished": false}'::jsonb, false, 1, 'bootstrap:sql', now())
ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();

-- Default sequences
INSERT INTO system.document_sequence (kind, prefix, next_number)
VALUES ('invoice', 'INV', 101), ('receipt', 'RCT', 101)
ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;

-- Staff roles
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, created_at, revision) VALUES
  ('super_admin', 'Super Administrator', 'المسؤول العام', true, now(), 1),
  ('admin', 'Administrator', 'مدير النظام', true, now(), 1),
  ('finance_manager', 'Finance Manager', 'المدير المالي', true, now(), 1),
  ('operations_manager', 'Operations Manager', 'مدير العمليات', true, now(), 1),
  ('project_lead', 'Project Lead', 'مدير المشروع', true, now(), 1),
  ('editor', 'Editor', 'محرر محتوى', true, now(), 1),
  ('accountant', 'Accountant', 'محاسب', true, now(), 1),
  ('sales', 'Sales Specialist', 'أخصائي مبيعات', true, now(), 1),
  ('marketing', 'Marketing Specialist', 'أخصائي تسويق', true, now(), 1),
  ('viewer', 'Viewer', 'مراقب عام', true, now(), 1)
ON CONFLICT (id) DO NOTHING;

-- First Accounts (Email: admin@example.com, Password: Admin12345678!)
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, created_at, updated_at)
VALUES
  ('it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', 'IT0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_admin"}', true, false, now(), now()),
  ('staff', 'super-admin', 'admin@example.com', 'BA0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"super_admin"}', true, false, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, active = true, updated_at = now();

INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', 'super-admin', '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;

-- Default modules (14 feature modules)
INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at) VALUES
  ('crm_deals', true, 'bootstrap', now()),
  ('invoicing', true, 'bootstrap', now()),
  ('calendar', true, 'bootstrap', now()),
  ('equipment', true, 'bootstrap', now()),
  ('cms', true, 'bootstrap', now()),
  ('reviews', true, 'bootstrap', now()),
  ('products', true, 'bootstrap', now()),
  ('procurement', true, 'bootstrap', now()),
  ('store', true, 'bootstrap', now()),
  ('delivery', true, 'bootstrap', now()),
  ('hr_payroll', true, 'bootstrap', now()),
  ('itsm', true, 'bootstrap', now()),
  ('audit_trail', true, 'bootstrap', now()),
  ('notifications', true, 'bootstrap', now())
ON CONFLICT (module_key) DO NOTHING;

-- Default SLA Policies
INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_by, updated_at) VALUES
  ('critical', 30, 240, 'bootstrap', now()),
  ('high', 120, 1440, 'bootstrap', now()),
  ('normal', 480, 4320, 'bootstrap', now()),
  ('low', 1440, 10080, 'bootstrap', now())
ON CONFLICT (priority) DO UPDATE SET response_minutes = EXCLUDED.response_minutes, resolve_minutes = EXCLUDED.resolve_minutes, updated_at = now();

COMMIT;
`;
fs.writeFileSync(path.join(root, "seeds/sql/seed_bootstrap.sql"), bootstrapSql);
console.log("✓ seeds/sql/seed_bootstrap.sql written.");

// Generate Activity Presets SQL files
const presetActivities = ["all", "products", "services", "commerce", "food", "agency"];
for (const act of presetActivities) {
  const presetSql = `-- Preset SQL Override: ${act}
BEGIN;
UPDATE system.company SET data = jsonb_set(data, '{businessActivity}', '"${act === "all" ? "media" : act}"') WHERE singleton = true;
UPDATE system.module_setting SET enabled = true WHERE module_key IN ('crm_deals', 'invoicing', 'calendar', 'equipment', 'cms', 'reviews', 'products', 'procurement', 'store', 'delivery', 'hr_payroll', 'itsm', 'audit_trail', 'notifications');
COMMIT;
`;
  fs.writeFileSync(path.join(root, `seeds/sql/presets/preset_${act}.sql`), presetSql);
}
console.log(`✓ ${presetActivities.length} preset SQL files written to seeds/sql/presets/`);
console.log("\nAll SQL seeds generated successfully!");
