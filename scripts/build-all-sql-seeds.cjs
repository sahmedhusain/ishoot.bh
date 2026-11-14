const fs = require("fs");
const path = require("path");
const { query: querySql } = require("./lib/db-query.cjs");

const root = path.resolve(__dirname, "..");

function queryJson(sql) {
  const raw = querySql(sql);
  return raw ? JSON.parse(raw) : null;
}

function orderByReference(rows, key, parentKey, realmKey) {
  const keyOf = (row) => `${realmKey ? `${row[realmKey]}\u0000` : ""}${row[key]}`;
  const byKey = new Map(rows.map((row) => [keyOf(row), row]));
  const ordered = [];
  const state = new Map();

  function visit(row) {
    const id = keyOf(row);
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") throw new Error(`Cyclic ${parentKey} reference at ${id.replace("\u0000", ":")}`);
    state.set(id, "visiting");
    const parent = row[parentKey];
    if (parent) {
      const parentRow = byKey.get(`${realmKey ? `${row[realmKey]}\u0000` : ""}${parent}`);
      if (!parentRow) throw new Error(`Missing ${parentKey} ${parent} for ${id.replace("\u0000", ":")}`);
      visit(parentRow);
    }
    state.set(id, "done");
    ordered.push(row);
  }

  for (const row of rows) visit(row);
  return ordered;
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

console.log("Loading base database snapshots from platform_db...");

const ishootCompanyResult = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company) t");
if (!Array.isArray(ishootCompanyResult) || !ishootCompanyResult[0]) throw new Error("Could not load the base company snapshot.");
const ishootCompany = ishootCompanyResult[0];
const companyAssets = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company_asset) t") || [];
const moduleSettings = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.module_setting) t") || [];
const uploadObjects = queryJson("SELECT json_agg(t) FROM (SELECT * FROM files.upload_object) t") || [];
const staffRoles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role) t") || [];
const itRoles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.it_role) t") || [];
const staffScopes = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role_scope) t") || [];
const staffPermissions = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_permission) t") || [];
const itPermissions = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.it_permission) t") || [];
const DEFAULT_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU";
const EXCLUDED_BOOTSTRAP_IDS = new Set(["super-admin", "430c4105-6360-4415-bf1b-087d582c7fc6"]);
const isBootstrapAccount = (acc) =>
  EXCLUDED_BOOTSTRAP_IDS.has(acc.subject_id) ||
  (acc.realm === "staff" && String(acc.username || "").toUpperCase() === "BA0001") ||
  (acc.realm === "it" && String(acc.username || "").toUpperCase() === "IT0001");
const rawAccounts = (queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.account) t") || [])
  .filter((acc) => acc.email && acc.email !== "dgdfg@mail.com" && acc.username && !acc.email.endsWith("@example.test") && !isBootstrapAccount(acc));
const validAccountKeys = new Set(rawAccounts.map((acc) => `${acc.realm}\u0000${acc.subject_id}`));
const accounts = rawAccounts.map((acc) => ({
  ...acc,
  password_hash: DEFAULT_PASSWORD_HASH,
  reporting_to:
    acc.reporting_to && !EXCLUDED_BOOTSTRAP_IDS.has(acc.reporting_to) && validAccountKeys.has(`${acc.realm}\u0000${acc.reporting_to}`)
      ? acc.reporting_to
      : null,
}));
const staffAccess = (queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_access) t") || [])
  .filter((acc) => acc.subject_id !== "c91cb10d-a43c-4983-baed-b95ad8de76b2" && !EXCLUDED_BOOTSTRAP_IDS.has(acc.subject_id) && validAccountKeys.has(`staff\u0000${acc.subject_id}`));
const departments = queryJson("SELECT json_agg(t) FROM (SELECT * FROM hr.department) t") || [];
const baseEmployees = queryJson("SELECT json_agg(t) FROM (SELECT * FROM hr.employee) t") || [];
const expenseCategories = queryJson("SELECT json_agg(t) FROM (SELECT * FROM finance.expense_category) t") || [];
const baseCategories = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.product_category) t") || [];
const baseWarehouses = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.warehouse) t") || [];
const baseLocations = queryJson("SELECT json_agg(t) FROM (SELECT * FROM inventory.stock_location) t") || [];
const pages = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.page) t") || [];
const articles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.article) t") || [];
const faqs = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.faq) t") || [];
const stats = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.statistic) t") || [];
const reviews = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.review) t") || [];
const contentSnapshot = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.content_snapshot WHERE id = 'main') t")?.[0];

const northwindCompanyJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/demo/company.json"), "utf8"));
const northwindThemeJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/demo/theme.json"), "utf8"));

console.log("Core snapshots loaded successfully.");

// ============================================================================
// DATA GENERATION HELPERS
// ============================================================================

// 1. 50 Customers & Addresses across Bahrain
function generateCustomersData() {
  const cities = [
    { city: "Manama", state: "Capital", road: "Road 3812", bldg: "Building 204", pc: "318" },
    { city: "Seef District", state: "Capital", road: "Road 2819", bldg: "Tower B, Suite 501", pc: "428" },
    { city: "Juffair", state: "Capital", road: "Road 2408", bldg: "Al Raya Tower, Flat 12", pc: "324" },
    { city: "Saar", state: "Northern", road: "Avenue 15", bldg: "Villa 42", pc: "525" },
    { city: "Amwaj Islands", state: "Muharraq", road: "Floating City Walk", bldg: "Lagoon Villa 18", pc: "257" },
    { city: "Riffa", state: "Southern", road: "Bukuwara Road 12", bldg: "Building 88", pc: "911" },
    { city: "Sanabis", state: "Capital", road: "DCC Complex 4", bldg: "Office 203", pc: "410" },
    { city: "Budaiya", state: "Northern", road: "Budaiya Main Highway", bldg: "Villa 310", pc: "550" },
    { city: "Muharraq", state: "Muharraq", road: "Airport Road 22", bldg: "Hangar Office 4", pc: "202" },
    { city: "Zallaq", state: "Southern", road: "Zallaq Coastal Way", bldg: "Resort Annex 3", pc: "1052" },
  ];

  const firstNames = [
    "Abdullah", "Mohammed", "Fatima", "Ali", "Zainab", "Hassan", "Maryam", "Khalid", "Noor", "Hussain",
    "Ahmed", "Sara", "Yusuf", "Reem", "Hamad", "Amina", "Salman", "Layla", "Omar", "Huda",
    "Jasim", "Eman", "Tariq", "Mona", "Faisal", "Dina", "Nasser", "Lulwa", "Bader", "Salma",
    "Adel", "Haya", "Mustafa", "Rania", "Waleed", "Shaikha", "Mahmood", "Rawan", "Saud", "Dana",
    "Ziyad", "Asma", "Ibrahim", "Noura", "Talal", "Ghada", "Rashid", "Deena", "Kareem", "Yasmin"
  ];

  const lastNames = [
    "Al-Khalifa", "Al-Mahmood", "Al-Sayed", "Al-Doseri", "Al-Amer", "Al-Ghatam", "Al-Abbasi", "Al-Ansari", "Al-Jalahma", "Al-Buainain",
    "Al-Rowaiei", "Al-Hammadi", "Al-Bahrani", "Al-Kooheji", "Al-Mutawa", "Al-Zayani", "Al-Gosaibi", "Al-Shirawi", "Al-Moayyed", "Al-Tamimi",
    "Fakhro", "Kanoo", "Yateem", "Balooch", "Al-Marzooq", "Al-Hassan", "Al-Maskati", "Al-Arrayed", "Al-Sabah", "Al-Thani",
    "Al-Nuaimi", "Al-Kaabi", "Al-Shurooqi", "Al-Hamar", "Al-Sharif", "Al-Najjar", "Al-Madani", "Al-Banna", "Al-Tajer", "Al-Khatib",
    "Sultan", "Merchant", "Darwish", "Qamber", "Ghuloom", "Behzad", "Rahimi", "Al-Zaki", "Al-Saffar", "Kameshki"
  ];

  const customers = [];
  const addresses = [];

  for (let i = 0; i < 200; i++) {
    const id = `cust-${String(i + 1).padStart(3, "0")}`;
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/[^a-z]/g, "")}${i + 1}@example.com`;
    const phone = `+9733${String(6000000 + i * 1111).slice(0, 7)}`;
    const loc = cities[i % cities.length];

    customers.push({ id, first_name: fn, last_name: ln, email, phone });
    addresses.push({
      id: `addr-${id}`,
      customer_id: id,
      address_type: "shipping",
      label: i % 2 === 0 ? "Corporate Office" : "Production Studio",
      line1: `${loc.bldg}, ${loc.road}`,
      line2: i % 3 === 0 ? "Floor 3, Creative Wing" : "",
      city: loc.city,
      state: loc.state,
      postal_code: loc.pc,
      country: "BH",
      is_default: true,
    });
  }

  return { customers, addresses };
}

// 2. 35 Contacts representing Key Bahrain/GCC Corporate Clients & Agencies
function generateContactsData() {
  const companies = [
    { name: "Bahrain International Circuit (BIC)", type: "client", tags: ["f1", "motorsport", "sports"] },
    { name: "Falcon Airways", type: "client", tags: ["aviation", "commercial", "enterprise"] },
    { name: "Exhibition World Bahrain (EWB)", type: "client", tags: ["events", "macc", "government"] },
    { name: "Harbor National Bank (HNB)", type: "client", tags: ["banking", "fintech", "corporate"] },
    { name: "Gulfwave Telecommunications", type: "client", tags: ["5g", "tvc", "telecom"] },
    { name: "Bapco Energies", type: "client", tags: ["energy", "oil_gas", "sustainability"] },
    { name: "Aluminium Bahrain (Alba)", type: "client", tags: ["industrial", "metals", "export"] },
    { name: "Batelco / Beyon Group", type: "client", tags: ["telecom", "digital", "lifestyle"] },
    { name: "STC Bahrain", type: "client", tags: ["telecom", "fintech", "events"] },
    { name: "National Bank of Bahrain (NBB)", type: "client", tags: ["finance", "heritage", "banking"] },
    { name: "Bank of Bahrain and Kuwait (BBK)", type: "client", tags: ["banking", "retail", "corporate"] },
    { name: "Ahli United Bank (AUB)", type: "client", tags: ["private_banking", "regional"] },
    { name: "Bahrain FinTech Bay", type: "partner", tags: ["innovation", "accelerator", "tech"] },
    { name: "Marassi Al Bahrain (Eagle Hills)", type: "client", tags: ["real_estate", "luxury", "development"] },
    { name: "Dilmunia Health Island", type: "client", tags: ["healthcare", "wellness", "lifestyle"] },
    { name: "Four Seasons Hotel Bahrain Bay", type: "client", tags: ["hospitality", "luxury", "dining"] },
    { name: "The Ritz-Carlton Bahrain", type: "client", tags: ["resort", "events", "hospitality"] },
    { name: "Dana Mall & LuLu Group", type: "client", tags: ["retail", "fmcg", "shopping"] },
    { name: "City Centre Bahrain (Majid Al Futtaim)", type: "client", tags: ["retail", "entertainment", "campaign"] },
    { name: "Seef Properties", type: "client", tags: ["real_estate", "malls", "hospitality"] },
    { name: "Economic Development Board (EDB)", type: "partner", tags: ["inward_investment", "government"] },
    { name: "Information Affairs Authority (IAA)", type: "partner", tags: ["broadcast", "licensing", "media"] },
    { name: "Bahrain Tourism & Exhibitions Authority (BTEA)", type: "client", tags: ["tourism", "festivals", "culture"] },
    { name: "Bahrain Mumtalakat Holding", type: "client", tags: ["sovereign", "investment", "portfolio"] },
    { name: "Al Baraka Banking Group", type: "client", tags: ["islamic_banking", "global", "csr"] },
    { name: "Gulf Air Falcon Corporate", type: "client", tags: ["national_carrier", "in_flight"] },
    { name: "Bahrain Duty Free", type: "client", tags: ["retail", "travel", "luxury"] },
    { name: "Jumeirah Gulf of Bahrain Resort", type: "client", tags: ["resort", "spa", "tourism"] },
    { name: "Memac Ogilvy Bahrain", type: "agency", tags: ["creative_agency", "tvc", "advertising"] },
    { name: "FP7 McCann Bahrain", type: "agency", tags: ["advertising", "campaigns", "media"] },
    { name: "Leo Burnett Middle East", type: "agency", tags: ["creative", "film", "production"] },
    { name: "TBWA Raad Bahrain", type: "agency", tags: ["disruption", "branding", "pr"] },
    { name: "Al Hawaj Group", type: "client", tags: ["perfumes", "luxury_retail", "fashion"] },
    { name: "Y.K. Almoayyed & Sons", type: "client", tags: ["automotive", "electronics", "conglomerate"] },
    { name: "Ebrahim K. Kanoo (Toyota/Lexus)", type: "client", tags: ["automotive", "tvc", "commercials"] },
  ];

  const contactPeople = [
    { fn: "Jasim", ln: "Al-Shirawi", email: "j.shirawi@bic.com.bh", phone: "+97339001101" },
    { fn: "Tariq", ln: "Al-Moayyed", email: "t.moayyed@falconair.com", phone: "+97339001102" },
    { fn: "Sara", ln: "Kanoo", email: "s.kanoo@ewbahrain.com", phone: "+97339001103" },
    { fn: "Faisal", ln: "Fakhro", email: "f.fakhro@hnb.com.bh", phone: "+97339001104" },
    { fn: "Noura", ln: "Al-Zayani", email: "n.zayani@gulfwave.bh", phone: "+97339001105" },
    { fn: "Salman", ln: "Al-Khalifa", email: "s.khalifa@bapco.bh", phone: "+97339001106" },
    { fn: "Ebrahim", ln: "Al-Amer", email: "e.amer@alba.com.bh", phone: "+97339001107" },
    { fn: "Haya", ln: "Al-Ghatam", email: "h.ghatam@beyon.com", phone: "+97339001108" },
    { fn: "Bader", ln: "Al-Jalahma", email: "b.jalahma@stc.com.bh", phone: "+97339001109" },
    { fn: "Lulwa", ln: "Al-Ansari", email: "l.ansari@nbbonline.com", phone: "+97339001110" },
    { fn: "Adel", ln: "Al-Buainain", email: "a.buainain@bbkonline.com", phone: "+97339001111" },
    { fn: "Reem", ln: "Al-Rowaiei", email: "r.rowaiei@ahliunited.com", phone: "+97339001112" },
    { fn: "Mustafa", ln: "Darwish", email: "m.darwish@fintechbay.bh", phone: "+97339001113" },
    { fn: "Shaikha", ln: "Al-Hammadi", email: "s.hammadi@marassi.bh", phone: "+97339001114" },
    { fn: "Hamad", ln: "Al-Doseri", email: "h.doseri@dilmunia.bh", phone: "+97339001115" },
    { fn: "Dina", ln: "Balooch", email: "d.balooch@fourseasons.com", phone: "+97339001116" },
    { fn: "Mahmood", ln: "Al-Maskati", email: "m.maskati@ritzcarlton.com", phone: "+97339001117" },
    { fn: "Zainab", ln: "Al-Banna", email: "z.banna@danamall.bh", phone: "+97339001118" },
    { fn: "Rawan", ln: "Al-Arrayed", email: "r.arrayed@citycentrebahrain.com", phone: "+97339001119" },
    { fn: "Omar", ln: "Al-Tajer", email: "o.tajer@seef.com.bh", phone: "+97339001120" },
    { fn: "Khalid", ln: "Al-Nuaimi", email: "k.nuaimi@bahrainedb.com", phone: "+97339001121" },
    { fn: "Amina", ln: "Al-Hamar", email: "a.hamar@iaa.gov.bh", phone: "+97339001122" },
    { fn: "Hussain", ln: "Al-Sharif", email: "h.sharif@btea.bh", phone: "+97339001123" },
    { fn: "Ziyad", ln: "Al-Kaabi", email: "z.kaabi@mumtalakat.bh", phone: "+97339001124" },
    { fn: "Mona", ln: "Al-Shurooqi", email: "m.shurooqi@albaraka.com", phone: "+97339001125" },
    { fn: "Kareem", ln: "Merchant", email: "k.merchant@gulfair.com", phone: "+97339001126" },
    { fn: "Fatima", ln: "Sultan", email: "f.sultan@bdutyfree.com", phone: "+97339001127" },
    { fn: "Waleed", ln: "Qamber", email: "w.qamber@jumeirah.com", phone: "+97339001128" },
    { fn: "Deena", ln: "Ghuloom", email: "d.ghuloom@ogilvy.com", phone: "+97339001129" },
    { fn: "Ali", ln: "Behzad", email: "a.behzad@fpmccann.com", phone: "+97339001130" },
    { fn: "Layla", ln: "Rahimi", email: "l.rahimi@leoburnett.com", phone: "+97339001131" },
    { fn: "Ahmed", ln: "Al-Saffar", email: "a.saffar@tbwaraad.com", phone: "+97339001132" },
    { fn: "Maryam", ln: "Kameshki", email: "m.kameshki@alhawaj.com", phone: "+97339001133" },
    { fn: "Talal", ln: "Almoayyed", email: "t.almoayyed@almoayyed.com.bh", phone: "+97339001134" },
    { fn: "Nasser", ln: "Kanoo", email: "n.kanoo@ekkanoo.com.bh", phone: "+97339001135" },
  ];

  const contacts = [];
  for (let i = 0; i < 140; i++) {
    const c = companies[i % companies.length];
    const p = contactPeople[i % contactPeople.length];
    contacts.push({
      id: `cont-${String(i + 1).padStart(3, "0")}`,
      first_name: p.fn,
      last_name: p.ln,
      email: i >= companies.length ? `alt${i}.${p.email}` : p.email,
      phone: `+9733900${String(1101 + i).slice(-4)}`,
      company: i >= companies.length ? `${c.name} - Branch ${i}` : c.name,
      contact_type: c.type,
      status: "active",
      notes: `Primary media production & creative liaison for ${c.name}.`,
      tags: c.tags,
    });
  }
  return contacts;
}

// 3. 55 Invoices across all scenarios with matching items and payments
function generateInvoicesAndScenarios(contacts, baseEmployees) {
  const invoices = [];
  const items = [];
  const payments = [];

  // Define 55 unique scenarios
  const scenarios = [
    // 1-22: Historical Paid Invoices (Days ago: 155 to 25)
    { id: "inv-01", num: "INV-2026-001", contactIdx: 0, daysAgo: 155, status: "paid", paidRatio: 1.0, payDaysAfter: 15, method: "bank_transfer", desc: "F1 Season Opener Trackside Cinematography & FPV Rigging", sub: 5400 },
    { id: "inv-02", num: "INV-2026-002", contactIdx: 1, daysAgo: 150, status: "paid", paidRatio: 1.0, payDaysAfter: 20, method: "bank_transfer", desc: "Falcon Airways Fleet Refresh In-Flight Safety Master 4K", sub: 8800 },
    { id: "inv-03", num: "INV-2026-003", contactIdx: 2, daysAgo: 145, status: "paid", paidRatio: 1.0, payDaysAfter: 14, method: "bank_transfer", desc: "Exhibition World Inaugural Summit Multi-Camera Livestream", sub: 12000 },
    { id: "inv-04", num: "INV-2026-004", contactIdx: 3, daysAgo: 140, status: "paid", paidRatio: 1.0, payDaysAfter: 25, method: "bank_transfer", desc: "Digital Banking Mobile App Launch Teasers & Cinema Cutdowns", sub: 7200 },
    { id: "inv-05", num: "INV-2026-005", contactIdx: 4, daysAgo: 135, status: "paid", paidRatio: 1.0, payDaysAfter: 18, method: "benefit_pay", desc: "Gulfwave 5G Network Ultra-HD Commercial TVC Production", sub: 9500 },
    { id: "inv-06", num: "INV-2026-006", contactIdx: 5, daysAgo: 130, status: "paid", paidRatio: 1.0, payDaysAfter: 12, method: "bank_transfer", desc: "Bapco Energies Sustainability Docu-Feature (Phase 1)", sub: 6400 },
    { id: "inv-07", num: "INV-2026-007", contactIdx: 6, daysAgo: 125, status: "paid", paidRatio: 1.0, payDaysAfter: 22, method: "bank_transfer", desc: "Alba Line 6 Smelter Industrial Hyperlapse & Drone Photography", sub: 4800 },
    { id: "inv-08", num: "INV-2026-008", contactIdx: 7, daysAgo: 120, status: "paid", paidRatio: 1.0, payDaysAfter: 15, method: "bank_transfer", desc: "Beyon Digital Campus Architectural Tour & 360 Experience", sub: 4200 },
    { id: "inv-09", num: "INV-2026-009", contactIdx: 8, daysAgo: 115, status: "paid", paidRatio: 1.0, payDaysAfter: 16, method: "credit_card", desc: "STC Winter Festival Drone Light Show Video Production", sub: 3900 },
    { id: "inv-10", num: "INV-2026-010", contactIdx: 9, daysAgo: 110, status: "paid", paidRatio: 1.0, payDaysAfter: 20, method: "bank_transfer", desc: "National Bank of Bahrain 65th Anniversary Film Mastering", sub: 14500 },
    { id: "inv-11", num: "INV-2026-011", contactIdx: 10, daysAgo: 105, status: "paid", paidRatio: 1.0, payDaysAfter: 14, method: "bank_transfer", desc: "BBK Super Saver Campaign Social Cutdowns & Audio Mastering", sub: 3200 },
    { id: "inv-12", num: "INV-2026-012", contactIdx: 11, daysAgo: 100, status: "paid", paidRatio: 1.0, payDaysAfter: 19, method: "bank_transfer", desc: "Ahli United Bank Private Wealth Summit Documentaries", sub: 5600 },
    { id: "inv-13", num: "INV-2026-013", contactIdx: 12, daysAgo: 95, status: "paid", paidRatio: 1.0, payDaysAfter: 10, method: "benefit_pay", desc: "FinTech Acceleration Demo Day Highlights & Founder Spotlights", sub: 2800 },
    { id: "inv-14", num: "INV-2026-014", contactIdx: 13, daysAgo: 90, status: "paid", paidRatio: 1.0, payDaysAfter: 21, method: "bank_transfer", desc: "Marassi Beachfront Lifestyle Cinematography Package", sub: 8200 },
    { id: "inv-15", num: "INV-2026-015", contactIdx: 14, daysAgo: 85, status: "paid", paidRatio: 1.0, payDaysAfter: 15, method: "bank_transfer", desc: "Dilmunia Canal Promenade Sunset Time-Lapse & Drone Survey", sub: 3600 },
    { id: "inv-16", num: "INV-2026-016", contactIdx: 15, daysAgo: 80, status: "paid", paidRatio: 1.0, payDaysAfter: 14, method: "credit_card", desc: "Four Seasons Bahrain Bay Gourmet Culinary Masterclass Series", sub: 4500 },
    { id: "inv-17", num: "INV-2026-017", contactIdx: 16, daysAgo: 75, status: "paid", paidRatio: 1.0, payDaysAfter: 18, method: "bank_transfer", desc: "Ritz-Carlton Beach Resort Summer Campaign Commercials", sub: 6800 },
    { id: "inv-18", num: "INV-2026-018", contactIdx: 17, daysAgo: 70, status: "paid", paidRatio: 1.0, payDaysAfter: 12, method: "benefit_pay", desc: "Dana Mall Family Shopping Festival Promo Spots", sub: 2200 },
    { id: "inv-19", num: "INV-2026-019", contactIdx: 18, daysAgo: 60, status: "paid", paidRatio: 1.0, payDaysAfter: 20, method: "bank_transfer", desc: "City Centre Bahrain Fashion Weekend 4K Highlights & TVC", sub: 5100 },
    { id: "inv-20", num: "INV-2026-020", contactIdx: 19, daysAgo: 50, status: "paid", paidRatio: 1.0, payDaysAfter: 16, method: "bank_transfer", desc: "Seef Mall National Day Golden Jubilee Heritage Film", sub: 7800 },
    { id: "inv-21", num: "INV-2026-021", contactIdx: 20, daysAgo: 40, status: "paid", paidRatio: 1.0, payDaysAfter: 15, method: "bank_transfer", desc: "Invest in Bahrain International Roadshow Media Package", sub: 9200 },
    { id: "inv-22", num: "INV-2026-022", contactIdx: 21, daysAgo: 30, status: "paid", paidRatio: 1.0, payDaysAfter: 10, method: "bank_transfer", desc: "Official IAA Media Archive 4K Remastering & Restorations", sub: 3500 },

    // 23-27: Overdue Aging Bucket 1-30 Days (Issued 45-55d ago, Due 15-25d ago)
    { id: "inv-23", num: "INV-AGING-01", contactIdx: 22, daysAgo: 52, status: "overdue", paidRatio: 0.0, dueDaysAgo: 22, desc: "BTEA Heritage Tourism Short Films (Overdue 22d)", sub: 6200 },
    { id: "inv-24", num: "INV-AGING-02", contactIdx: 23, daysAgo: 48, status: "overdue", paidRatio: 0.0, dueDaysAgo: 18, desc: "Mumtalakat Annual Investor Presentation Video (Overdue 18d)", sub: 8400 },
    { id: "inv-25", num: "INV-AGING-03", contactIdx: 24, daysAgo: 45, status: "overdue", paidRatio: 0.0, dueDaysAgo: 15, desc: "Al Baraka Global Islamic Banking Documentary (Overdue 15d)", sub: 5100 },
    { id: "inv-26", num: "INV-AGING-04", contactIdx: 25, daysAgo: 42, status: "overdue", paidRatio: 0.0, dueDaysAgo: 12, desc: "Gulf Air Falcon Miles Rewards Program Promo (Overdue 12d)", sub: 4300 },
    { id: "inv-27", num: "INV-AGING-05", contactIdx: 26, daysAgo: 40, status: "overdue", paidRatio: 0.0, dueDaysAgo: 10, desc: "Bahrain Duty Free Summer Golden Ticket Campaign (Overdue 10d)", sub: 3700 },

    // 28-32: Overdue Aging Bucket 31-60 Days (Issued 75-85d ago, Due 45-55d ago)
    { id: "inv-28", num: "INV-AGING-06", contactIdx: 27, daysAgo: 82, status: "overdue", paidRatio: 0.0, dueDaysAgo: 52, desc: "Jumeirah Gulf of Bahrain Private Villa Aerial Rigging (Overdue 52d)", sub: 3900 },
    { id: "inv-29", num: "INV-AGING-07", contactIdx: 28, daysAgo: 80, status: "overdue", paidRatio: 0.0, dueDaysAgo: 50, desc: "Ogilvy Luxury Automotive Commercial Soundstage Rental (Overdue 50d)", sub: 6500 },
    { id: "inv-30", num: "INV-AGING-08", contactIdx: 29, daysAgo: 77, status: "overdue", paidRatio: 0.0, dueDaysAgo: 47, desc: "FP7 McCann Telecommunications TVC Post Production (Overdue 47d)", sub: 5800 },
    { id: "inv-31", num: "INV-AGING-09", contactIdx: 30, daysAgo: 75, status: "overdue", paidRatio: 0.0, dueDaysAgo: 45, desc: "Leo Burnett Regional Bank Social Media Animation Package (Overdue 45d)", sub: 4200 },
    { id: "inv-32", num: "INV-AGING-10", contactIdx: 31, daysAgo: 72, status: "overdue", paidRatio: 0.0, dueDaysAgo: 42, desc: "TBWA Raad FinTech Explainer Series Sound Mix (Overdue 42d)", sub: 3100 },

    // 33-37: Overdue Aging Bucket 61-90 Days (Issued 105-115d ago, Due 75-85d ago)
    { id: "inv-33", num: "INV-AGING-11", contactIdx: 32, daysAgo: 112, status: "overdue", paidRatio: 0.0, dueDaysAgo: 82, desc: "Al Hawaj Perfume Luxury Brand Story 8K Video (Overdue 82d)", sub: 4700 },
    { id: "inv-34", num: "INV-AGING-12", contactIdx: 33, daysAgo: 110, status: "overdue", paidRatio: 0.0, dueDaysAgo: 80, desc: "Almoayyed Electronics Showroom Grand Opening Coverage (Overdue 80d)", sub: 2900 },
    { id: "inv-35", num: "INV-AGING-13", contactIdx: 34, daysAgo: 107, status: "overdue", paidRatio: 0.0, dueDaysAgo: 77, desc: "E.K. Kanoo Lexus Hybrid Experience Film Production (Overdue 77d)", sub: 9800 },
    { id: "inv-36", num: "INV-AGING-14", contactIdx: 0, daysAgo: 105, status: "overdue", paidRatio: 0.0, dueDaysAgo: 75, desc: "BIC Drag Racing Night Event Wireless Video System (Overdue 75d)", sub: 3400 },
    { id: "inv-37", num: "INV-AGING-15", contactIdx: 1, daysAgo: 102, status: "overdue", paidRatio: 0.0, dueDaysAgo: 72, desc: "Falcon Airways Pilot Training VR Simulation Backgrounds (Overdue 72d)", sub: 6100 },

    // 38-41: Overdue Aging Bucket 90+ Days (Issued 140-155d ago, Due 110-125d ago)
    { id: "inv-38", num: "INV-AGING-16", contactIdx: 2, daysAgo: 152, status: "overdue", paidRatio: 0.0, dueDaysAgo: 122, desc: "EWB Global Logistics Expo Pre-Roll Cinematography (Overdue 122d)", sub: 7300 },
    { id: "inv-39", num: "INV-AGING-17", contactIdx: 3, daysAgo: 148, status: "overdue", paidRatio: 0.0, dueDaysAgo: 118, desc: "HNB Corporate Governance Boardroom Recording (Overdue 118d)", sub: 2400 },
    { id: "inv-40", num: "INV-AGING-18", contactIdx: 4, daysAgo: 144, status: "overdue", paidRatio: 0.0, dueDaysAgo: 114, desc: "Gulfwave Fiber Rollout Documentary Series Part 1 (Overdue 114d)", sub: 4600 },
    { id: "inv-41", num: "INV-AGING-19", contactIdx: 5, daysAgo: 140, status: "overdue", paidRatio: 0.0, dueDaysAgo: 110, desc: "Bapco Historical Refinery Heritage Archive Ingest (Overdue 110d)", sub: 3800 },

    // 42-45: Partially Paid Invoices with Overdue Balances (50% paid, rest overdue)
    { id: "inv-42", num: "INV-PART-01", contactIdx: 6, daysAgo: 65, status: "partially_paid", paidRatio: 0.5, dueDaysAgo: 35, method: "bank_transfer", desc: "Alba Safety First Induction Cinema Video (Phase 1 50% Paid)", sub: 8000 },
    { id: "inv-43", num: "INV-PART-02", contactIdx: 7, daysAgo: 58, status: "partially_paid", paidRatio: 0.5, dueDaysAgo: 28, method: "bank_transfer", desc: "Beyon Telecom Retail Experience Animation Package (50% Paid)", sub: 6000 },
    { id: "inv-44", num: "INV-PART-03", contactIdx: 8, daysAgo: 50, status: "partially_paid", paidRatio: 0.5, dueDaysAgo: 20, method: "benefit_pay", desc: "STC Cyber Defense Lab Corporate Explainers (50% Paid)", sub: 5400 },
    { id: "inv-45", num: "INV-PART-04", contactIdx: 9, daysAgo: 45, status: "partially_paid", paidRatio: 0.5, dueDaysAgo: 15, method: "bank_transfer", desc: "NBB Ramadan Charitable Foundation Short Films (50% Paid)", sub: 9000 },

    // 46-48: Partially Paid Invoices in Good Standing (Advance paid, balance due in future)
    { id: "inv-46", num: "INV-PART-05", contactIdx: 10, daysAgo: 14, status: "partially_paid", paidRatio: 0.5, futureDueDays: 16, method: "benefit_pay", desc: "BBK Youth Savings Account TVC Commercial (50% Advance Paid)", sub: 7000 },
    { id: "inv-47", num: "INV-PART-06", contactIdx: 13, daysAgo: 10, status: "partially_paid", paidRatio: 0.3, futureDueDays: 20, method: "bank_transfer", desc: "Marassi Galleria Luxury Fashion Shoot (30% Deposit Paid)", sub: 11000 },
    { id: "inv-48", num: "INV-PART-07", contactIdx: 15, daysAgo: 6, status: "partially_paid", paidRatio: 0.5, futureDueDays: 24, method: "credit_card", desc: "Four Seasons Wedding Showcase 8K Production (50% Booking Advance)", sub: 6500 },

    // 49-53: Current Open Invoices (Sent, Due in 15-30 days)
    { id: "inv-49", num: "INV-CURR-01", contactIdx: 16, daysAgo: 8, status: "sent", paidRatio: 0.0, futureDueDays: 22, desc: "Ritz-Carlton Seafood Festival Promos & Social Cutdowns", sub: 4800 },
    { id: "inv-50", num: "INV-CURR-02", contactIdx: 20, daysAgo: 6, status: "sent", paidRatio: 0.0, futureDueDays: 24, desc: "Bahrain EDB International Tech Summit Recap Video", sub: 8600 },
    { id: "inv-51", num: "INV-CURR-03", contactIdx: 28, daysAgo: 4, status: "sent", paidRatio: 0.0, futureDueDays: 26, desc: "Ogilvy FMCG National Brand Commercial 4K Master", sub: 12500 },
    { id: "inv-52", num: "INV-CURR-04", contactIdx: 33, daysAgo: 3, status: "sent", paidRatio: 0.0, futureDueDays: 27, desc: "Almoayyed Motors Commercial Fleet Photography", sub: 3800 },
    { id: "inv-53", num: "INV-CURR-05", contactIdx: 34, daysAgo: 1, status: "sent", paidRatio: 0.0, futureDueDays: 29, desc: "Toyota Land Cruiser Desert Adventure TVC Principal Photography", sub: 15000 },

    // 54-55: Draft Invoices (Under preparation)
    { id: "inv-54", num: "INV-DRAFT-01", contactIdx: 1, daysAgo: 2, status: "draft", paidRatio: 0.0, futureDueDays: 30, desc: "Falcon Airways Boeing 787 Interior Virtual Reality Tour", sub: 18000 },
    { id: "inv-55", num: "INV-DRAFT-02", contactIdx: 4, daysAgo: 1, status: "draft", paidRatio: 0.0, futureDueDays: 30, desc: "Gulfwave Smart Cities IoT Showcase Film Series", sub: 9500 },
  ];

  let payIndex = 1;
  let itemIndex = 1;

  for (let dup = 0; dup < 6; dup++) {
    for (const sc of scenarios) {
      const contact = contacts[(sc.contactIdx + dup * 11) % contacts.length];
      const subtotal = sc.sub + (dup * 1500);
      const vatRate = 10.0;
      const vatAmount = Math.round(subtotal * 0.1 * 1000) / 1000;
      const total = subtotal + vatAmount;
      const amountPaid = Math.round(total * sc.paidRatio * 1000) / 1000;
      const balanceDue = Math.round((total - amountPaid) * 1000) / 1000;

      let issueDateSql = `(CURRENT_DATE - INTERVAL '${sc.daysAgo + dup * 5} days')::date`;
      let dueDateSql;

      if (sc.dueDaysAgo !== undefined) {
        dueDateSql = `(CURRENT_DATE - INTERVAL '${sc.dueDaysAgo + dup * 5} days')::date`;
      } else if (sc.futureDueDays !== undefined) {
        dueDateSql = `(CURRENT_DATE + INTERVAL '${sc.futureDueDays - dup * 5} days')::date`;
      } else {
        dueDateSql = `(CURRENT_DATE - INTERVAL '${Math.max(0, sc.daysAgo + dup * 5 - 30)} days')::date`;
      }

      const invId = `inv-${String(invoices.length + 1).padStart(3, "0")}`;
      const invNum = `${sc.num}${dup > 0 ? `-B${dup}` : ''}`;

      invoices.push({
        id: invId,
        invoice_number: invNum,
        contact_id: contact.id,
        status: sc.status,
        issue_date_sql: issueDateSql,
        due_date_sql: dueDateSql,
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        currency: "BHD",
        notes: `${sc.desc}${dup > 0 ? ` (Phase ${dup + 1})` : ''}`,
        terms: "Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.",
      });

      // Invoice items (2 lines per invoice for realism)
      const line1Sub = Math.round(subtotal * 0.65 * 1000) / 1000;
      const line2Sub = Math.round((subtotal - line1Sub) * 1000) / 1000;

      items.push({
        id: `ii-${String(itemIndex++).padStart(3, "0")}`,
        invoice_id: invId,
        description: `${sc.desc} — Principal Filming & Crew`,
        quantity: 1,
        unit_price: line1Sub,
        amount: line1Sub,
        sort_order: 1,
      });

      items.push({
        id: `ii-${String(itemIndex++).padStart(3, "0")}`,
        invoice_id: invId,
        description: `${sc.desc} — 8K RAW Editing, Color Grading & Sound Master`,
        quantity: 1,
        unit_price: line2Sub,
        amount: line2Sub,
        sort_order: 2,
      });

      // Payment if paid or partially paid
      if (amountPaid > 0) {
        const payDays = sc.daysAgo + dup * 5 - (sc.payDaysAfter || 10);
        const payDateSql = `(CURRENT_DATE - INTERVAL '${Math.max(0, payDays)} days')::date`;
        payments.push({
          id: `pay-${String(payIndex++).padStart(3, "0")}`,
          payment_number: `RCT-${invNum.replace("INV-", "")}`,
          invoice_id: invId,
          contact_id: contact.id,
          amount: amountPaid,
          currency: "BHD",
          payment_method: sc.method || "bank_transfer",
          payment_date_sql: payDateSql,
          reference: `REF-${invNum}-TXN${payIndex}`,
          status: "completed",
          notes: `Settlement for ${sc.desc}`,
        });
      }
    }
  }

  return { invoices, items, payments };
}

// 4. 40 Deals across all pipeline stages
function generateDealsData(contacts, employees) {
  const stages = [
    { stage: "lead", prob: 20, count: 30, status: "open" },
    { stage: "qualified", prob: 40, count: 25, status: "open" },
    { stage: "proposal", prob: 60, count: 30, status: "open" },
    { stage: "negotiation", prob: 80, count: 30, status: "open" },
    { stage: "closed_won", prob: 100, count: 50, status: "won" },
    { stage: "closed_lost", prob: 0, count: 15, status: "lost" },
  ];

  const dealTitles = [
    "F1 Gulf Air Bahrain Grand Prix 2027 Broadcast Promos",
    "Falcon Airways Global Brand Film & In-Flight VR",
    "Exhibition World 2027 Mega-Events Documentary",
    "Harbor National Bank Flagship Digital Branch Launch",
    "Gulfwave National 5G Commercial Campaign",
    "Bapco Solar Energy Park Feature Showcase",
    "Alba Net-Zero Carbon Milestone Docuseries",
    "Beyon Cyber Security Operations Centre Virtual Tour",
    "STC 5G Standalone Network Commercial Teasers",
    "NBB National Day 2026 Historical Docu-Drama",
    "BBK Digital Onboarding Social Media Mini-Series",
    "Ahli United Regional Wealth Management Film",
    "Bahrain FinTech Bay Ecosystem Impact Video",
    "Marassi Living Waterfront Residential TVC",
    "Dilmunia Well-being Island Virtual Reality 360",
    "Four Seasons Luxury Pearl Suite Commercial",
    "Ritz-Carlton Royal Beachfront Dining Showcase",
    "Dana Mall Hypermarket Modernization Promos",
    "City Centre Bahrain Winter Carnival Film",
    "Seef Mall Iconic Pearl Heritage Video Campaign",
    "Bahrain EDB Global Tech Founders Recruitment Videos",
    "IAA Golden Screen Television Restorations",
    "BTEA Bahrain Food Festival 2027 Campaign",
    "Mumtalakat Sustainable Assets Portfolio Film",
    "Al Baraka Ethical Banking Worldwide Campaign",
    "Gulf Air Heritage Flight 75th Anniversary Film",
    "Bahrain Duty Free Luxury Concourse Walkthrough",
    "Jumeirah Resort Coastal Sunsets Cinema Package",
    "Ogilvy Luxury Perfume TVC Studio Production",
    "FP7 McCann Telecom Ramadan TVC Principal Shoot",
    "Leo Burnett Regional Bank Summer Campaign",
    "TBWA Raad FinTech AI Assistant Explainer",
    "Al Hawaj Signature Oudh Fragrance Launch Film",
    "Almoayyed Motors Commercial Vehicles Fleet Shoot",
    "Toyota Land Cruiser Extreme Offroad Desert TVC",
    "Lexus Electrified Luxury SUV Launch Master",
    "Bahrain Bay Sunset Hyperlapse Drone 8K Reel",
    "South Governorate Coastal Preservation Short",
    "Manama Souq Artisans Heritage Digital Archive",
    "Pearling Path UNESCO World Heritage Showcase"
  ];

  const deals = [];
  let dIdx = 0;

  for (const st of stages) {
    for (let i = 0; i < st.count; i++) {
      const title = dealTitles[dIdx % dealTitles.length] + (dIdx >= dealTitles.length ? ` (Phase ${Math.floor(dIdx/dealTitles.length)+1})` : '');
      const contact = contacts[dIdx % contacts.length];
      const emp = employees[dIdx % employees.length];
      const value = 2500 + (dIdx * 950) % 35000;
      const expectedCloseDays = st.stage === "closed_won" ? -20 : st.stage === "closed_lost" ? -10 : 15 + (i * 7);

      deals.push({
        id: `deal-${String(dIdx + 1).padStart(3, "0")}`,
        title,
        contact_id: contact.id,
        stage: st.stage,
        value,
        currency: "BHD",
        probability: st.prob,
        expected_close_date_sql: `(CURRENT_DATE + INTERVAL '${expectedCloseDays} days')::date`,
        status: st.status,
        assigned_to: emp.id,
        notes: `Strategic production deal for ${title}. Assigned to production lead.`,
      });
      dIdx++;
    }
  }

  return deals;
}

// 5. 30 Quotations & Items
function generateQuotationsData(contacts, deals) {
  const quotations = [];
  const items = [];
  let qItemIdx = 1;

  for (let i = 0; i < 150; i++) {
    const qId = `qte-${String(i + 1).padStart(3, "0")}`;
    const qNum = `QTE-2026-${String(i + 1).padStart(3, "0")}`;
    const contact = contacts[i % contacts.length];
    const deal = deals[i % deals.length];
    const subtotal = 3000 + (i * 1200) % 25000;
    const vatRate = 10.0;
    const vatAmount = Math.round(subtotal * 0.1 * 1000) / 1000;
    const total = subtotal + vatAmount;
    const status = i < 15 ? "accepted" : i < 22 ? "sent" : i < 26 ? "draft" : "rejected";

    quotations.push({
      id: qId,
      quotation_number: qNum,
      contact_id: contact.id,
      deal_id: deal.id,
      status,
      subtotal,
      discount: 0.0,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      currency: "BHD",
      terms: "Quotation valid for 30 calendar days. 50% mobilization deposit upon commissioning.",
      notes: `Production proposal for ${deal.title}`,
    });

    // 2 quotation items
    const line1 = Math.round(subtotal * 0.7 * 1000) / 1000;
    const line2 = Math.round((subtotal - line1) * 1000) / 1000;

    items.push({
      id: `qi-${String(qItemIdx++).padStart(3, "0")}`,
      quotation_id: qId,
      description: "Principal Photography & Cinema Gear Crew Package",
      quantity: 1,
      unit_price: line1,
      amount: line1,
      sort_order: 1,
    });

    items.push({
      id: `qi-${String(qItemIdx++).padStart(3, "0")}`,
      quotation_id: qId,
      description: "Post-Production, Color Grading & Cinema Surround Master",
      quantity: 1,
      unit_price: line2,
      amount: line2,
      sort_order: 2,
    });
  }

  return { quotations, items };
}

// 6. 35 Expenses across all 12 categories
function generateExpensesData() {
  const expenseTemplates = [
    { title: "Specialized Anamorphic Prime Lenses Sub-Lease", cat: "expcat-01", vendor: "Gulf Optics & Grip", amount: 850, daysAgo: 154 },
    { title: "7.1 Cinema Soundstage Surround Mix Engineer Sessions", cat: "expcat-02", vendor: "Bahrain Sound Labs", amount: 620, daysAgo: 150 },
    { title: "Location Scouting 4x4 Fleet & Fuel — Southern Desert", cat: "expcat-03", vendor: "Manama Transport Co.", amount: 380, daysAgo: 145 },
    { title: "Soundstage 180kVA Mobile Power Generator Sub-Rental", cat: "expcat-04", vendor: "Electricity & Water Authority Hookups", amount: 550, daysAgo: 140 },
    { title: "Frame.io & DaVinci Resolve Cloud Enterprise 1yr Renewal", cat: "expcat-05", vendor: "Blackmagic Design & Adobe Cloud", amount: 480, daysAgo: 135 },
    { title: "Civil Aviation Affairs Drone Airspace Flight Permits (Zone A)", cat: "expcat-06", vendor: "Ministry of Transportation & Telecom", amount: 550, daysAgo: 130 },
    { title: "Voiceover Recording Artist Sessions & Arabic Narration", cat: "expcat-07", vendor: "Gulf Media Talent Agency", amount: 420, daysAgo: 125 },
    { title: "Studio Soundstage Green Cyclorama Wall Repaint & Prep", cat: "expcat-08", vendor: "Seef Paint & Studio Maintenance", amount: 280, daysAgo: 120 },
    { title: "DCI 4K Barco Cinema Projection Calibration & Licensing", cat: "expcat-09", vendor: "Cinema Engineering Middle East", amount: 650, daysAgo: 115 },
    { title: "Middle East Film Festival Showcase Submission Fees", cat: "expcat-10", vendor: "Red Sea & Dubai Film Mart", amount: 340, daysAgo: 110 },
    { title: "Cooke Lens Ultrasonic Cleaning & Optical Collimation", cat: "expcat-11", vendor: "Optics Tech Service Germany", amount: 720, daysAgo: 105 },
    { title: "Annual External Financial Audit & Tax Filing Service", cat: "expcat-12", vendor: "KPMG Fakhro Bahrain", amount: 1500, daysAgo: 100 },

    { title: "High-Speed Phantom Flex4K Camera Rental for Fluid TVC", cat: "expcat-01", vendor: "Arabia Camera Rentals Dubai", amount: 1250, daysAgo: 95 },
    { title: "Foley Artistry & Custom Acoustic Sound Design Library", cat: "expcat-02", vendor: "Soundscape Audio Bahrain", amount: 450, daysAgo: 90 },
    { title: "Production Crew Craft Services & Gourmet Hot Catering (40 crew)", cat: "expcat-03", vendor: "Gourmet Catering Co. W.L.L.", amount: 580, daysAgo: 85 },
    { title: "Studio Soundstage High-Capacity Air Conditioning Heavy Power", cat: "expcat-04", vendor: "Bahrain Cooling Systems", amount: 420, daysAgo: 80 },
    { title: "Boris FX Sapphire & Mocha Pro Post-Production Licenses", cat: "expcat-05", vendor: "Boris FX Software", amount: 390, daysAgo: 75 },
    { title: "Bahrain Bay Coastal Filming Permit & Water Security Boat", cat: "expcat-06", vendor: "Information Affairs Authority", amount: 350, daysAgo: 70 },
    { title: "Principal Actors Day Rates — Telecom Ramadan Commercial", cat: "expcat-07", vendor: "Bahrain Actor Guild & Casting", amount: 1100, daysAgo: 65 },
    { title: "Custom Futuristic Bank Branch Set Construction & Props", cat: "expcat-08", vendor: "Artistry Woodcraft & Sets", amount: 890, daysAgo: 60 },
    { title: "Dolby Vision HDR Master Deliverable License & Quality Check", cat: "expcat-09", vendor: "Dolby Laboratories ME", amount: 750, daysAgo: 55 },
    { title: "Social Media Campaign Paid Boost & Reel Distribution", cat: "expcat-10", vendor: "Meta Platforms Ireland", amount: 450, daysAgo: 50 },
    { title: "DJI Ronin 4D Gimbal Motor Recalibration & Cable Loom Replacement", cat: "expcat-11", vendor: "DJI Authorized Service GCC", amount: 310, daysAgo: 45 },
    { title: "Intellectual Property & Trademark Legal Consultation", cat: "expcat-12", vendor: "Hassan Radhi & Associates", amount: 650, daysAgo: 40 },

    { title: "Astera Titan Tubes 8-Light Kit Sub-Rental for Night Shoot", cat: "expcat-01", vendor: "Gulf Optics & Grip", amount: 620, daysAgo: 35 },
    { title: "Sennheiser Wireless Frequency Coordination Clearance", cat: "expcat-02", vendor: "Telecommunications Regulatory Authority (TRA)", amount: 250, daysAgo: 30 },
    { title: "Production Logistics Van Fuel, Tolls & Airport Transfers", cat: "expcat-03", vendor: "Bahrain Airport Services Logistics", amount: 280, daysAgo: 25 },
    { title: "Soundstage Soundproofing & Heavy Acoustic Baffles Addition", cat: "expcat-04", vendor: "Acoustic Solutions W.L.L.", amount: 480, daysAgo: 20 },
    { title: "Cinema 4D & Redshift Render Engine Annual Licenses", cat: "expcat-05", vendor: "Maxon Computer GmbH", amount: 560, daysAgo: 15 },
    { title: "Heritage Village Filming Clearance & Police Escort Fee", cat: "expcat-06", vendor: "Ministry of Interior Traffic Directorate", amount: 220, daysAgo: 12 },
    { title: "Voice Talent & English Broadcast Narrator Licensing", cat: "expcat-07", vendor: "Voiceovers UK Ltd", amount: 380, daysAgo: 9 },
    { title: "Soundstage Chromakey Floor Epoxy Resurfacing", cat: "expcat-08", vendor: "Modern Paints Bahrain", amount: 320, daysAgo: 7 },
    { title: "Color Grading Suite Sony BVM Monitor Annual Calibration", cat: "expcat-09", vendor: "Sony Professional Middle East", amount: 490, daysAgo: 5 },
    { title: "Production Portfolio Brand Book Printing & Premium Binding", cat: "expcat-10", vendor: "Al Ayam Publishing Press", amount: 340, daysAgo: 3 },
    { title: "Studio Soundstage High-Capacity Power Load Hookup", cat: "expcat-04", vendor: "Electricity & Water Authority Hookups", amount: 420, daysAgo: 1 },
  ];

  const expenses = [];
  for (let dup = 0; dup < 5; dup++) {
    for (let i = 0; i < expenseTemplates.length; i++) {
      const t = expenseTemplates[i];
      expenses.push({
        id: `exp-${String(expenses.length + 1).padStart(3, "0")}`,
        title: `${t.title}${dup > 0 ? ` (Q${5 - dup})` : ''}`,
        amount: t.amount + (dup * 50),
        currency: "BHD",
        category_id: t.cat,
        expense_date_sql: `(CURRENT_DATE - INTERVAL '${t.daysAgo + dup * 20} days')::date`,
        vendor: t.vendor,
        status: "approved",
        notes: `Verified receipt and logged into ledger under ${t.cat}.`,
      });
    }
  }
  return expenses;
}

// 7. 30 Products & Stock Levels across Cinema Equipment Categories
function generateProductsData(baseLocations) {
  const productList = [
    { sku: "CAM-ALX-35", en: "ARRI Alexa 35 Camera Package", ar: "كاميرا آري أليكسا 35 سينمائية", cat: "cameras", cost: 18000, price: 350, reorder: 1 },
    { sku: "CAM-ALX-LF", en: "ARRI Alexa Mini LF Production Kit", ar: "كاميرا آري أليكسا ميني إل إف", cat: "cameras", cost: 14000, price: 280, reorder: 1 },
    { sku: "CAM-RED-RAP", en: "RED V-Raptor 8K VV Cinema Package", ar: "كاميرا ريد في-رابتور 8K سينمائية", cat: "cameras", cost: 9500, price: 220, reorder: 1 },
    { sku: "CAM-SNY-FX9", en: "Sony FX9 Full-Frame Cinema Kit", ar: "كاميرا سوني FX9 سينمائية متكاملة", cat: "cameras", cost: 4200, price: 120, reorder: 2 },
    { sku: "CAM-SNY-FX3", en: "Sony FX3 B-Camera Production Rig", ar: "كاميرا سوني FX3 المحمولة", cat: "cameras", cost: 1600, price: 65, reorder: 2 },

    { sku: "LNS-COK-SET", en: "Cooke Anamorphic/i Full Frame Plus Set (5 Lenses)", ar: "طقم عدسات كوك أنامورفيك فل فريم (5 عدسات)", cat: "lenses", cost: 24000, price: 450, reorder: 1 },
    { sku: "LNS-ARI-35T", en: "ARRI Signature Prime 35mm T1.8 Lens", ar: "عدسة آري سيغنتشر برايم 35 ملم", cat: "lenses", cost: 7200, price: 110, reorder: 1 },
    { sku: "LNS-ZES-50T", en: "Zeiss Supreme Prime 50mm T1.5 Lens", ar: "عدسة زايس سوبريم برايم 50 ملم", cat: "lenses", cost: 5800, price: 95, reorder: 1 },
    { sku: "LNS-ANG-OPT", en: "Angenieux Optimo Ultra 12x Cinema Zoom Lens", ar: "عدسة تقريب سينمائية آنجينو أوبتيمو 12x", cat: "lenses", cost: 16500, price: 320, reorder: 1 },
    { sku: "LNS-CN-2470", en: "Canon CN-E Cinema Prime Lens Kit", ar: "طقم عدسات كانون سينمائية برايم", cat: "lenses", cost: 4500, price: 85, reorder: 1 },

    { sku: "LGT-APT-2600", en: "Aputure Electro Storm XT26 2600W Point-Source LED", ar: "إضاءة أبوتر إلكترو ستورم 2600 واط", cat: "lighting", cost: 2800, price: 75, reorder: 2 },
    { sku: "LGT-ARI-SKYX", en: "ARRI SkyPanel X21 High-Output LED Softlight", ar: "إضاءة آري سكاي بانل إكس21 سوفت لايت", cat: "lighting", cost: 3400, price: 90, reorder: 2 },
    { sku: "LGT-AST-TIT8", en: "Astera Titan Tube 8-Light Wireless LED Kit", ar: "طقم أنابيب أستيرا تيتان 8 وحدات لاسلكية", cat: "lighting", cost: 2100, price: 60, reorder: 2 },
    { sku: "LGT-NAN-720B", en: "Nanlite Forza 720B Bi-Color Spot Light", ar: "إضاءة نانلايت فورزا 720B ثنائية اللون", cat: "lighting", cost: 1200, price: 45, reorder: 3 },
    { sku: "LGT-KOF-L100", en: "Kino Flo FreeStyle 31 LED DMX Production Light", ar: "إضاءة كينو فلو فري ستايل ستوديو", cat: "lighting", cost: 1800, price: 55, reorder: 2 },

    { sku: "AUD-SND-888", en: "Sound Devices 888 16-Channel 20-Track Field Recorder", ar: "جهاز تسجيل صوتي ميداني ساوند ديفايسز 888", cat: "audio", cost: 3200, price: 80, reorder: 1 },
    { sku: "AUD-SNH-416", en: "Sennheiser MKH 416 Moisture-Resistant Shotgun Mic", ar: "ميكروفون شوتجن سيمهايزر MKH 416", cat: "audio", cost: 450, price: 25, reorder: 4 },
    { sku: "AUD-WSY-DUAL", en: "Wisycom Wireless Dual Receiver & Bodypack Mic Kit", ar: "طقم ميكروفونات لاسلكية ويزيكوم احترافية", cat: "audio", cost: 2600, price: 70, reorder: 2 },
    { sku: "AUD-LEC-SMWB", en: "Lectrosonics Wideband Wireless Transmitter System", ar: "جهاز إرسال لاسلكي لكتروسونيكس", cat: "audio", cost: 1800, price: 50, reorder: 2 },

    { sku: "DRN-DJI-INS3", en: "DJI Inspire 3 Cinema Drone with Zenmuse X9-8K Air", ar: "طائرة درون سينمائية دي جيه آي إنسباير 3 بدقة 8K", cat: "drones", cost: 4800, price: 160, reorder: 1 },
    { sku: "GMB-DJI-4D8K", en: "DJI Ronin 4D 8K 4-Axis Cinema Gimbal Camera", ar: "مانع اهتزاز سينمائي دي جيه آي رونين 4D رباعي المحاور", cat: "drones", cost: 3600, price: 120, reorder: 1 },
    { sku: "GMB-FRF-MOVI", en: "Freefly MōVI Pro Motorized Cinema Gimbal Stabilizer", ar: "مانع اهتزاز سينمائي فريفلاي موفي برو", cat: "drones", cost: 2400, price: 85, reorder: 1 },

    { sku: "MON-TRD-4KMX", en: "Teradek Bolt 4K MAX 12G-SDI Wireless Video System", ar: "نظام نقل فيديو لاسلكي تيراديك بولت 4K ماكس", cat: "monitors", cost: 4500, price: 95, reorder: 1 },
    { sku: "MON-SMH-18IN", en: "SmallHD Cine 18 4K High-Bright Production Monitor", ar: "شاشة مراقبة إنتاجية سمول إتش دي 18 بوصة 4K", cat: "monitors", cost: 2100, price: 60, reorder: 2 },
    { sku: "MON-SNY-HX31", en: "Sony BVM-HX310 31-inch 4K HDR Reference Master Monitor", ar: "شاشة مرجعية سوني 31 بوصة لتصحيح الألوان 4K HDR", cat: "monitors", cost: 12500, price: 250, reorder: 1 },

    { sku: "GRP-EZR-VAR5", en: "EasyRig Vario 5 with Cinema Gimbal Vest and Flowline", ar: "حزام وحامل إيزي ريج فاريو 5 سينمائي", cat: "grip", cost: 1500, price: 40, reorder: 2 },
    { sku: "GRP-SCH-V20S", en: "Sachtler Video 20 S1 Carbon Fiber Fluid Head Tripod", ar: "ترايبود ساخلر فيديو 20 احترافي كربون فايبر", cat: "grip", cost: 2900, price: 65, reorder: 2 },
    { sku: "GRP-MAT-CST4", en: "Matthews 40-inch C-Stand Grip Kit with Grip Head & Arm", ar: "طقم سي-ستاند ماثيوز 40 بوصة مع ذراع قبضة", cat: "grip", cost: 180, price: 15, reorder: 8 },
    { sku: "GRP-PRM-JIB9", en: "Proaim Studio Heavy-Duty 9ft Soundstage Jib Crane", ar: "رافعة كاميرا استوديو بروايم 9 أقدام", cat: "grip", cost: 1200, price: 50, reorder: 1 },

    { sku: "PST-MAC-STUM", en: "Apple Mac Studio M2 Ultra (128GB Unified RAM) Workstation", ar: "محطة مونتاج وتلوين ماك ستوديو إم2 ألترا", cat: "post", cost: 3200, price: 90, reorder: 2 },

    { sku: "CAM-CAN-C500", en: "Canon EOS C500 Mark II 5.9K Full Frame Camera Package", ar: "كاميرا كانون EOS C500 مارك 2 سينمائية", cat: "cameras", cost: 7800, price: 190, reorder: 1 },
    { sku: "CAM-BLK-12K", en: "Blackmagic URSA Mini Pro 12K OLPF Cinema Kit", ar: "كاميرا بلاك ماجيك أورسا ميني برو 12K", cat: "cameras", cost: 3800, price: 110, reorder: 1 },

    { sku: "LNS-SIG-FF50", en: "Sigma Cine FF 50mm T1.5 High-Speed Prime Lens", ar: "عدسة سيجما سينمائية فل فريم 50 ملم T1.5", cat: "lenses", cost: 3200, price: 65, reorder: 1 },
    { sku: "LNS-LEI-H50", en: "Leitz Hugo 50mm T1.5 Cinema Prime Lens", ar: "عدسة لايتز هيوجو 50 ملم T1.5 سينمائية", cat: "lenses", cost: 8900, price: 140, reorder: 1 },

    { sku: "LGT-APT-600C", en: "Aputure LS 600c Pro RGBWW Point-Source LED Light", ar: "إضاءة أبوتر LS 600c برو ملونة", cat: "lighting", cost: 1950, price: 50, reorder: 2 },
    { sku: "LGT-AST-HYD8", en: "Astera Helios Tube 8-Light Wireless LED Kit", ar: "طقم أنابيب أستيرا هيليوس 8 وحدات لاسلكية", cat: "lighting", cost: 1450, price: 40, reorder: 2 },

    { sku: "AUD-SND-833", en: "Sound Devices 833 8-Channel Field Recorder", ar: "جهاز تسجيل صوتي ميداني ساوند ديفايسز 833", cat: "audio", cost: 2400, price: 65, reorder: 1 },
    { sku: "AUD-SCH-50", en: "Sennheiser MKH 50 Supercardioid Studio Mic", ar: "ميكروفون استوديو سينهايزر MKH 50", cat: "audio", cost: 680, price: 30, reorder: 3 },

    { sku: "DRN-DJI-MAV3", en: "DJI Mavic 3 Enterprise Thermal Inspection Drone", ar: "طائرة درون حرارية دي جيه آي مافيك 3", cat: "drones", cost: 2600, price: 95, reorder: 1 },
    { sku: "GMB-DJI-RS4P", en: "DJI RS 4 Pro Motorized 3-Axis Gimbal Stabilizer", ar: "مانع اهتزاز دي جيه آي RS 4 برو ثلاثي المحاور", cat: "drones", cost: 650, price: 35, reorder: 2 },

    { sku: "MON-TRD-750", en: "Teradek Bolt 4K LT 750 Wireless Video Receiver", ar: "مستقبل فيديو لاسلكي تيراديك بولت 4K 750", cat: "monitors", cost: 1800, price: 50, reorder: 2 },
    { sku: "MON-ATM-SUM1", en: "Atomos Sumo 19-inch 4K HDR Monitor & Live Switcher", ar: "شاشة أتموس سومو 19 بوصة سينمائية", cat: "monitors", cost: 1650, price: 45, reorder: 1 },

    { sku: "GRP-DOLLY-PRM", en: "Proaim Portable Track Camera Dolly & 20ft Rails", ar: "دوللي ومسار كاميرا بروايم 20 قدم", cat: "grip", cost: 1100, price: 45, reorder: 1 },
    { sku: "GRP-STEADI-PRO", en: "Tiffen Steadicam M-2 Production Stabilizer Rig", ar: "جهاز ستيديكام تيفن M-2 احترافي", cat: "grip", cost: 5800, price: 130, reorder: 1 },

    { sku: "PST-RAID-64T", en: "Promise Pegasus32 R8 64TB Hardware RAID Array", ar: "نظام تخزين هاردوير بروميس بيجاسوس 64 تيرابايت", cat: "post", cost: 2400, price: 70, reorder: 1 },
    { sku: "PST-LTO-TAP9", en: "mLogic LTO-9 Thunderbolt 3 Tape Archival Drive", ar: "جهاز أرشفة وشريط لتو-9 ثاندربرولت", cat: "post", cost: 3400, price: 85, reorder: 1 },

    { sku: "ACC-BTR-VMT4", en: "Anton Bauer Titon 150 V-Mount Battery 4-Pack & Charger", ar: "طقم بطاريات أنتوت باور 150 فولت ماونت (4 بطاريات)", cat: "post", cost: 1200, price: 35, reorder: 3 },
    { sku: "ACC-CBL-12GSDI", en: "Canare 12G-SDI Heavy-Duty Coaxial Cable Reel 100m", ar: "بكرة كابلات سينمائية 12G-SDI طوال 100 متر", cat: "post", cost: 350, price: 15, reorder: 5 },
    { sku: "ACC-PEL-1650", en: "Pelican 1650 Protector Hard Case with TrekPak Dividers", ar: "حقيبة بليكان 1650 حماية للمعدات السينمائية", cat: "post", cost: 280, price: 12, reorder: 6 },
    { sku: "ACC-FLT-MAT1", en: "Matthews Road Rags Portable Lighting Modifier Kit", ar: "طقم تعديل وتوجيه إضاءة ماثيوز المحمول", cat: "post", cost: 420, price: 20, reorder: 4 },
  ];

  const categories = [
    { id: "cameras", slug: "cameras", en: "Cinema Cameras & Packages", ar: "كاميرات السينما الاحترافية", desc: "Top-tier 8K & 4K full frame cinema cameras", sort: 1 },
    { id: "lenses", slug: "lenses", en: "Anamorphic & Prime Lenses", ar: "عدسات أنامورفيك وبرايم", desc: "Cinema primes, zooms and anamorphic glass", sort: 2 },
    { id: "lighting", slug: "lighting", en: "Production Lighting & Grips", ar: "إضاءة الإنتاج ومعدات التوزيع", desc: "High-output LED fixtures and tubes", sort: 3 },
    { id: "audio", slug: "audio", en: "Location Sound & Recorders", ar: "هندسة الصوت الميداني", desc: "Multi-track recorders and shotgun mics", sort: 4 },
    { id: "drones", slug: "drones-gimbals", en: "Cinema Drones & Gimbals", ar: "الدرونز وموانع الاهتزاز", desc: "Heavy-lift cinema aerials and handheld 4-axis gimbals", sort: 5 },
    { id: "monitors", slug: "monitors-wireless", en: "Wireless Video & HDR Monitors", ar: "شاشات العرض والنقل اللاسلكي", desc: "4K zero-latency video links and mastering monitors", sort: 6 },
    { id: "grip", slug: "heavy-grip", en: "Studio Jibs, Tripods & Grips", ar: "حوامل ورافعات الاستوديو", desc: "Fluid heads, C-stands, dollies and jibs", sort: 7 },
    { id: "post", slug: "post-storage", en: "Post-Production Workstations", ar: "محطات المونتاج والتلوين", desc: "High-speed NVMe storage and DCI grading suites", sort: 8 },
  ];

  return { productList, categories };
}

// 8. HR Historical Payroll, Leaves and Attendance
function generateHrHistory(employees) {
  const payrollRuns = [
    { id: "pr-2026-07", month: 7, year: 2026, daysAgo: 105, gross: 14500, ded: 750, net: 13750 },
    { id: "pr-2026-08", month: 8, year: 2026, daysAgo: 75, gross: 14500, ded: 750, net: 13750 },
    { id: "pr-2026-09", month: 9, year: 2026, daysAgo: 45, gross: 14500, ded: 750, net: 13750 },
    { id: "pr-2026-10", month: 10, year: 2026, daysAgo: 15, gross: 14500, ded: 750, net: 13750 },
  ];

  const payrollItems = [];
  let piIdx = 1;

  for (const pr of payrollRuns) {
    for (let e = 0; e < employees.length; e++) {
      const emp = employees[e];
      const basic = emp.basic_salary || 1200;
      const allow = (emp.housing_allowance || 200) + (emp.transport_allowance || 80);
      const ded = Math.round(basic * 0.07 * 1000) / 1000;
      const net = basic + allow - ded;

      payrollItems.push({
        id: `pi-${String(piIdx++).padStart(3, "0")}`,
        payroll_run_id: pr.id,
        employee_id: emp.id,
        basic_salary: basic,
        allowances: allow,
        deductions: ded,
        net_salary: net,
        status: "paid",
      });
    }
  }

  const leaveRequests = [
    { id: "lr-001", empIdx: 0, type: "annual", days: 5.0, startAgo: 140, endAgo: 135, status: "approved", reason: "Annual leave family vacation" },
    { id: "lr-002", empIdx: 1, type: "sick", days: 2.0, startAgo: 115, endAgo: 114, status: "approved", reason: "Medical recovery with hospital certificate" },
    { id: "lr-003", empIdx: 2, type: "annual", days: 4.0, startAgo: 95, endAgo: 92, status: "approved", reason: "Travel for documentary film screening" },
    { id: "lr-004", empIdx: 3, type: "emergency", days: 1.0, startAgo: 80, endAgo: 80, status: "approved", reason: "Family urgent matter" },
    { id: "lr-005", empIdx: 4, type: "annual", days: 6.0, startAgo: 65, endAgo: 60, status: "approved", reason: "Post-production wrap vacation" },
    { id: "lr-006", empIdx: 5, type: "sick", days: 3.0, startAgo: 45, endAgo: 43, status: "approved", reason: "Flu recovery" },
    { id: "lr-007", empIdx: 6, type: "annual", days: 5.0, startAgo: 30, endAgo: 26, status: "approved", reason: "Personal travel" },
    { id: "lr-008", empIdx: 7, type: "annual", days: 4.0, startAgo: 15, endAgo: 12, status: "approved", reason: "Annual holiday" },
    { id: "lr-009", empIdx: 8, type: "annual", days: 5.0, startAgo: -10, endAgo: -15, status: "pending", reason: "Planned upcoming winter vacation" },
    { id: "lr-010", empIdx: 1, type: "annual", days: 3.0, startAgo: -5, endAgo: -7, status: "pending", reason: "Personal leaves" },
  ];

  return { payrollRuns, payrollItems, leaveRequests };
}

// 9. Workflow Tasks & Calendar Events
function generateWorkflowData(employees) {
  const tasks = [
    { id: "tsk-01", title: "Complete Soundstage Light Grid Rigging for STC 5G TVC", empIdx: 1, priority: "urgent", status: "done", dueAgo: 25 },
    { id: "tsk-02", title: "Finalize DCI 4K Color Grading Pass for Falcon Airways Master", empIdx: 2, priority: "high", status: "done", dueAgo: 18 },
    { id: "tsk-03", title: "Apply for Coastal Airspace Drone Permits with Civil Aviation", empIdx: 3, priority: "high", status: "done", dueAgo: 12 },
    { id: "tsk-04", title: "Clean, Collimator-Test & Pack Cooke Anamorphic Prime Set", empIdx: 4, priority: "normal", status: "done", dueAgo: 8 },
    { id: "tsk-05", title: "Audit External Drive Archives and Run Checksums for EWB Footage", empIdx: 5, priority: "normal", status: "done", dueAgo: 4 },
    { id: "tsk-06", title: "Deliver Final 8K Master ProRes 4444 XQ to Batelco Brand Team", empIdx: 2, priority: "urgent", status: "in_progress", dueAgo: -2 },
    { id: "tsk-07", title: "Prepare Location Scouting Repertoire for Gulf Coast Luxury Resort", empIdx: 1, priority: "high", status: "in_progress", dueAgo: -4 },
    { id: "tsk-08", title: "Calibrate Sony BVM-HX310 Reference Monitors with SpectraCal Colorimeter", empIdx: 3, priority: "high", status: "in_progress", dueAgo: -5 },
    { id: "tsk-09", title: "Review Q4 Equipment Insurance & Fleet Registration Renewals", empIdx: 0, priority: "normal", status: "todo", dueAgo: -7 },
    { id: "tsk-10", title: "Draft Commercial Production Scope for Bapco Energy Park Project", empIdx: 1, priority: "high", status: "todo", dueAgo: -9 },
    { id: "tsk-11", title: "Coordinate Extras Casting & Call Sheets for Toyota Offroad Shoot", empIdx: 4, priority: "normal", status: "todo", dueAgo: -11 },
    { id: "tsk-12", title: "Schedule Soundstage Cyclorama Fresh White Paint Job", empIdx: 5, priority: "low", status: "todo", dueAgo: -14 },
    { id: "tsk-13", title: "Ingest and Create DaVinci Proxies for F1 Circuit Shoot", empIdx: 2, priority: "normal", status: "todo", dueAgo: -15 },
    { id: "tsk-14", title: "Update Web Portfolio Showcase with Recent Bahrain Bay Drone Shots", empIdx: 3, priority: "low", status: "todo", dueAgo: -18 },
    { id: "tsk-15", title: "Organize Monthly Grip Department Inventory and Rigging Inspection", empIdx: 4, priority: "normal", status: "todo", dueAgo: -20 },
  ];

  const calendarEvents = [
    { id: "evt-01", title: "STC 5G TVC Principal Photography (Day 1)", desc: "Soundstage A filming with ARRI Alexa 35 & Cooke lenses", startAgo: 10, durationHours: 10, empIdx: 1, loc: "iShoot Soundstage A, Manama" },
    { id: "evt-02", title: "STC 5G TVC Principal Photography (Day 2)", desc: "Exterior location filming at Bahrain Bay Promenade", startAgo: 9, durationHours: 8, empIdx: 1, loc: "Bahrain Bay Coastal Walk" },
    { id: "evt-03", title: "Falcon Airways Executive Screenings & Approval", desc: "Screening of final 4K in-flight master in screening suite", startAgo: 5, durationHours: 3, empIdx: 0, loc: "Cinema Grading Theater, Seef" },
    { id: "evt-04", title: "Bapco Sustainability Film Pre-Production Meeting", desc: "Director, DP and creative producer alignment session", startAgo: 2, durationHours: 2, empIdx: 1, loc: "Conference Suite 1" },
    { id: "evt-05", title: "Toyota Land Cruiser Desert Location Scouting", desc: "Scouting Sakhir and Zallaq dunes with client agency reps", startAgo: -1, durationHours: 5, empIdx: 1, loc: "Sakhir Desert Area" },
    { id: "evt-06", title: "Quarterly Board Operations & Financial Review", desc: "Q3 financial performance and 2027 gear cap-ex planning", startAgo: -3, durationHours: 3, empIdx: 0, loc: "Executive Boardroom" },
    { id: "evt-07", title: "Exhibition World Bahrain Tech Summit Filming", desc: "Live event coverage with 4-camera wireless optical fiber rig", startAgo: -6, durationHours: 8, empIdx: 1, loc: "EWB Main Hall 1" },
    { id: "evt-08", title: "Color Grading Masterclass & Staff Training", desc: "HDR workflow and ACES 1.3 color transform training", startAgo: -10, durationHours: 4, empIdx: 2, loc: "Grading Suite B" },
  ];

  return { tasks, calendarEvents };
}

// 10. 15 ITSM Helpdesk Tickets & Timeline Events
function generateItsmData(employees) {
  const tickets = [
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad1", cat: "infrastructure", sub: "storage", prio: "high", status: "in_progress", title: "Post-Production 200TB NAS Storage Capacity Expansion", desc: "NAS volume at 92% capacity following 8K RAW footage intake from BIC track-day.", ref: "NAS-VOL-01", respAgo: 4, resolAgo: null, createdAgo: 2 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad2", cat: "hardware", sub: "calibration", prio: "medium", status: "resolved", title: "DaVinci Resolve HDR Reference Monitor Quarterly Calibration", desc: "Quarterly calibration completed for Sony BVM-HX310 reference monitor with Klein colorimeter.", ref: "MON-HDR-01", respAgo: 9, resolAgo: 8, createdAgo: 10 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad3", cat: "software", sub: "licensing", prio: "urgent", status: "resolved", title: "Frame.io Enterprise Seat Licensing Expiry", desc: "Cloud collaboration seats failed auto-renewal; critical for client reviews today.", ref: "SW-FRAME-01", respAgo: 15, resolAgo: 14, createdAgo: 16 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad4", cat: "network", sub: "wireless", prio: "high", status: "resolved", title: "Soundstage High-Throughput Wireless Access Point Intermittent", desc: "Wireless dropouts affecting Teradek Bolt live iPad monitoring feeds on Stage A.", ref: "NET-WIFI-02", respAgo: 22, resolAgo: 21, createdAgo: 23 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad5", cat: "hardware", sub: "firmware", prio: "normal", status: "resolved", title: "ARRI Alexa 35 SUP 2.1 Firmware Update & Lens Table Sync", desc: "Install latest ARRI SUP 2.1 firmware across both Alexa 35 camera bodies.", ref: "CAM-ALX-01", respAgo: 35, resolAgo: 34, createdAgo: 36 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad6", cat: "access", sub: "vpn", prio: "medium", status: "resolved", title: "Remote Colorist VPN Access Credentials Setup", desc: "Configure secure WireGuard tunnel for freelance colorist working from Dubai.", ref: "VPN-REMOTE-04", respAgo: 48, resolAgo: 47, createdAgo: 49 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad7", cat: "infrastructure", sub: "backup", prio: "high", status: "resolved", title: "LTO-8 Tape Archival Ingest Station Read Error", desc: "Clean tape head and verify parity on Cold Archive Volume 14.", ref: "LTO-TAPE-01", respAgo: 60, resolAgo: 59, createdAgo: 61 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad8", cat: "hardware", sub: "audio", prio: "normal", status: "resolved", title: "Sound Devices 888 Dante Network Clock Desync", desc: "Resolve PTP clock master conflict between field recorder and studio interface.", ref: "AUD-DANTE-01", respAgo: 75, resolAgo: 74, createdAgo: 76 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ad9", cat: "software", sub: "os", prio: "low", status: "resolved", title: "Mac Studio Workstations macOS Sonoma Security Patches", desc: "Perform scheduled maintenance update across 4 edit suites.", ref: "MAC-STU-ALL", respAgo: 90, resolAgo: 89, createdAgo: 91 },
    { id: "70da75a0-0445-4b10-ad20-a6366b6a0ada", cat: "hardware", sub: "power", prio: "high", status: "resolved", title: "Studio Soundstage UPS Battery Pack Health Warning", desc: "Replace aging lead-acid battery cells on 15kVA central UPS system.", ref: "PWR-UPS-01", respAgo: 110, resolAgo: 109, createdAgo: 112 },
  ];

  return tickets;
}

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

function generateCompanySeedSql(profileName, companyData, themeData, assetOverrides = {}) {
  const isIshoot = profileName === "ishoot";
  const lines = [];

  const { customers, addresses } = generateCustomersData();
  const contacts = generateContactsData();
  const { productList, categories: productCats } = generateProductsData(baseLocations);
  const deals = generateDealsData(contacts, baseEmployees);
  const { quotations, items: quotationItems } = generateQuotationsData(contacts, deals);
  const { invoices, items: invoiceItems, payments } = generateInvoicesAndScenarios(contacts, baseEmployees);
  const expenses = generateExpensesData();
  const { payrollRuns, payrollItems, leaveRequests } = generateHrHistory(baseEmployees);
  const { tasks, calendarEvents } = generateWorkflowData(baseEmployees);
  const itsmTickets = generateItsmData(baseEmployees);

  const orderedStaffRoles = orderByReference(staffRoles, "id", "reporting_to_role");
  const orderedItRoles = orderByReference(itRoles, "id", "reporting_to_role");
  const orderedAccounts = orderByReference(accounts, "subject_id", "reporting_to", "realm");
  const orderedEmployees = orderByReference(baseEmployees, "id", "reporting_to");

  lines.push(`-- ============================================================================`);
  lines.push(`-- PURE SQL SEED: ${isIshoot ? "iShoot Cinema Production S.P.C." : "Northwind Studio W.L.L."}`);
  lines.push(`-- Comprehensive production fixtures: 55+ Invoices, 50 Customers, 35 Contacts,`);
  lines.push(`-- 40 Deals, 30 Products, 35 Expenses, 4 Payroll Runs, 25 Tasks, 15 ITSM Tickets`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- ============================================================================`);
  lines.push(`BEGIN;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 1. CLEANUP PREVIOUS BUSINESS FIXTURES (Idempotent)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`TRUNCATE TABLE`);
  lines.push(`    realtime.status_window,`);
  lines.push(`    realtime.status,`);
  lines.push(`    workflow.signature_request,`);
  lines.push(`    workflow.calendar_event,`);
  lines.push(`    workflow.task,`);
  lines.push(`    workflow.approval_decision,`);
  lines.push(`    workflow.approval_request,`);
  lines.push(`    workflow.minute_of_meeting,`);
  lines.push(`    workflow.official_letter,`);
  lines.push(`    workflow.letter_template,`);
  lines.push(`    delivery.cod_settlement,`);
  lines.push(`    delivery.shipment_event,`);
  lines.push(`    delivery.shipment,`);
  lines.push(`    delivery.route_sheet,`);
  lines.push(`    delivery.courier_agency,`);
  lines.push(`    delivery.vehicle,`);
  lines.push(`    delivery.delivery_slot,`);
  lines.push(`    delivery.delivery_zone,`);
  lines.push(`    delivery.delivery_settings,`);
  lines.push(`    commerce.retail_closing,`);
  lines.push(`    commerce.retail_shift,`);
  lines.push(`    commerce.retail_register,`);
  lines.push(`    commerce.sales_order_event,`);
  lines.push(`    commerce.sales_order_line,`);
  lines.push(`    commerce.sales_order,`);
  lines.push(`    commerce.delivery_slot,`);
  lines.push(`    commerce.delivery_zone,`);
  lines.push(`    commerce.delivery_settings,`);
  lines.push(`    commerce.store_region,`);
  lines.push(`    commerce.customer_segment,`);
  lines.push(`    commerce.store_settings,`);
  lines.push(`    commerce.coupon,`);
  lines.push(`    commerce.customer_address,`);
  lines.push(`    commerce.customer,`);
  lines.push(`    inventory.stock_count_line,`);
  lines.push(`    inventory.stock_count,`);
  lines.push(`    inventory.stock_serial,`);
  lines.push(`    inventory.stock_batch,`);
  lines.push(`    inventory.goods_receipt_line,`);
  lines.push(`    inventory.goods_receipt,`);
  lines.push(`    inventory.purchase_order_line,`);
  lines.push(`    inventory.purchase_order,`);
  lines.push(`    inventory.product_packaging_unit,`);
  lines.push(`    inventory.product_variant,`);
  lines.push(`    inventory.stock_movement,`);
  lines.push(`    inventory.stock_level,`);
  lines.push(`    inventory.product,`);
  lines.push(`    inventory.stock_location,`);
  lines.push(`    inventory.warehouse,`);
  lines.push(`    inventory.product_category,`);
  lines.push(`    finance.supplier_payment,`);
  lines.push(`    finance.supplier_bill_line,`);
  lines.push(`    finance.supplier_bill,`);
  lines.push(`    finance.journal_line,`);
  lines.push(`    finance.journal_entry,`);
  lines.push(`    finance.recurring_expense,`);
  lines.push(`    finance.bank_settlement,`);
  lines.push(`    finance.payment_method_config,`);
  lines.push(`    finance.tax_rate,`);
  lines.push(`    finance.payment,`);
  lines.push(`    finance.invoice_item,`);
  lines.push(`    finance.invoice,`);
  lines.push(`    finance.expense,`);
  lines.push(`    finance.expense_category,`);
  lines.push(`    sales.campaign,`);
  lines.push(`    sales.deal_pipeline_stage,`);
  lines.push(`    sales.inquiry,`);
  lines.push(`    sales.quotation_item,`);
  lines.push(`    sales.quotation,`);
  lines.push(`    sales.deal,`);
  lines.push(`    sales.contact,`);
  lines.push(`    hr.employee_credential,`);
  lines.push(`    hr.salary_document,`);
  lines.push(`    hr.shift_type,`);
  lines.push(`    hr.benefit_plan,`);
  lines.push(`    hr.leave_type,`);
  lines.push(`    hr.payroll_item,`);
  lines.push(`    hr.payroll_run,`);
  lines.push(`    hr.attendance_entry,`);
  lines.push(`    hr.leave_request,`);
  lines.push(`    hr.employee,`);
  lines.push(`    hr.department,`);
  lines.push(`    cms.social_content_plan,`);
  lines.push(`    cms.social_metric,`);
  lines.push(`    cms.social_post,`);
  lines.push(`    cms.social_link,`);
  lines.push(`    cms.portfolio_item,`);
  lines.push(`    cms.portfolio_category,`);
  lines.push(`    cms.content_snapshot,`);
  lines.push(`    cms.statistic,`);
  lines.push(`    cms.review,`);
  lines.push(`    cms.faq,`);
  lines.push(`    cms.article,`);
  lines.push(`    cms.page,`);
  lines.push(`    itsm.support_program_rule,`);
  lines.push(`    itsm.support_program,`);
  lines.push(`    itsm.asset_handover,`);
  lines.push(`    itsm.asset,`);
  lines.push(`    itsm.asset_category,`);
  lines.push(`    itsm.ticket_comment,`);
  lines.push(`    itsm.ticket_event,`);
  lines.push(`    itsm.ticket,`);
  lines.push(`    itsm.sla_policy,`);
  lines.push(`    notify.message,`);
  lines.push(`    notify.category_setting,`);
  lines.push(`    notify.preference,`);
  lines.push(`    notify.notification,`);
  lines.push(`    identity.branch,`);
  lines.push(`    system.service,`);
  lines.push(`    system.public_holiday,`);
  lines.push(`    system.backup_record,`);
  lines.push(`    system.site_setting,`);
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
    setupCompletedAt: "2026-01-01T00:00:00Z",
  };

  lines.push(`INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)`);
  lines.push(`VALUES ('c0000000-0000-0000-0000-000000000001', true, ${sqlQuote(companyMergedData)}, false, 1, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`);
  lines.push(``);

  const brandAssetsConfig = [
    { key: "logo_light", title: "Light Logo", url: "/api/files/brand/logo-light_dbf1f2e280f5.png" },
    { key: "logo_dark", title: "Dark Logo", url: "/api/files/brand/logo-dark_50ae2cfc6efa.png" },
    { key: "icon_light", title: "Light Icon", url: "/api/files/brand/icon-light_68b1a95d35cf.png" },
    { key: "icon_dark", title: "Dark Icon", url: "/api/files/brand/icon-dark_f661f555ebbe.png" },
    { key: "full_logo_light", title: "Full Logo Light", url: "/api/files/brand/full-logo-light_112233445566.png" },
    { key: "full_logo_dark", title: "Full Logo Dark", url: "/api/files/brand/full-logo-dark_112233445577.png" },
    { key: "letterhead_header", title: "Letterhead Header", url: "/api/files/brand/letterhead-header_112233445588.png" },
    { key: "letterhead_footer", title: "Letterhead Footer", url: "/api/files/brand/letterhead-footer_112233445599.png" },
    { key: "stamp", title: "Official Stamp", url: "/api/files/brand/stamp_8df038fc524f.png" },
    { key: "signature", title: "Authorized Signature", url: "/api/files/brand/signature_28e82e5cdb91.png" },
  ];

  for (const asset of brandAssetsConfig) {
    lines.push(`INSERT INTO system.company_asset (id, asset_key, title, file_url, mime_type, file_size, created_at, updated_at)`);
    lines.push(`VALUES ('asset-${asset.key}', ${sqlQuote(asset.key)}, ${sqlQuote(asset.title)}, ${sqlQuote(asset.url)}, 'image/png', 50000, now(), now())`);
    lines.push(`ON CONFLICT (asset_key) DO UPDATE SET file_url = EXCLUDED.file_url, updated_at = now();`);
  }
  lines.push(``);

  const allModuleKeys = Array.from(new Set([
    ...moduleSettings.map((m) => m.module_key),
    "crm_deals", "invoicing", "calendar", "equipment", "cms", "reviews",
    "products", "procurement", "store", "delivery", "hr_payroll", "itsm",
    "audit_trail", "notifications", "legal", "marketing", "pr", "tasks",
  ]));
  for (const modKey of allModuleKeys) {
    lines.push(`INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)`);
    lines.push(`VALUES (${sqlQuote(modKey)}, true, 'seed:sql', now())`);
    lines.push(`ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();`);
  }
  lines.push(``);

  lines.push(`INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', '${isIshoot ? "ISH" : "INV"}', 201), ('receipt', 'RCT', 201) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;`);
  lines.push(`INSERT INTO system.site_setting (id, website_domain, admin_domain, code, updated_at, updated_by) VALUES (true, ${sqlQuote(isIshoot ? "ishoot.bh" : "northwind.studio")}, ${sqlQuote(isIshoot ? "admin.ishoot.bh" : "admin.northwind.studio")}, '{"headHtml":"","bodyHtml":"","customCss":""}'::jsonb, now(), 'seed:sql') ON CONFLICT (id) DO UPDATE SET website_domain = EXCLUDED.website_domain, admin_domain = EXCLUDED.admin_domain, updated_at = now();`);
  lines.push(`INSERT INTO system.backup_record (id, kind, file_name, file_size, checksum, status, error_message, created_by, created_at, verified_at, details) VALUES`);
  lines.push(`  ('bkp-001', 'database', 'platform_db-2026-10-01.dump', 4829104, 'sha256:9f84b1c209e31a7f', 'verified', NULL, 'it-lead-001', now() - interval '30 days', now() - interval '30 days' + interval '5 minutes', '{"schemaCount":15,"tables":281}'::jsonb),`);
  lines.push(`  ('bkp-002', 'bucket', 'seaweed-assets-2026-10-15.tar.gz', 19482010, 'sha256:7d12c4e5f8901234', 'verified', NULL, 'it-lead-001', now() - interval '15 days', now() - interval '15 days' + interval '3 minutes', '{"objects":58}'::jsonb),`);
  lines.push(`  ('bkp-003', 'full', 'full-snapshot-2026-11-01.tar.zst', 24102912, 'sha256:3c90a1b2c3d4e5f6', 'completed', NULL, 'it-eng-001', now() - interval '7 days', now() - interval '7 days' + interval '6 minutes', '{"retentionDays":90}'::jsonb),`);
  lines.push(`  ('bkp-004', 'database', 'platform_db-daily-latest.dump', 4915200, 'sha256:5e81f2a3b4c5d6e7', 'verified', NULL, 'it-eng-001', now() - interval '1 day', now() - interval '1 day' + interval '2 minutes', '{"automated":true}'::jsonb)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO system.public_holiday (id, date, name_en, name_ar) VALUES`);
  lines.push(`  ('hol-2026-01', '2026-01-01 00:00:00+00', 'New Year''s Day', 'رأس السنة الميلادية'),`);
  lines.push(`  ('hol-2026-02', '2026-03-20 00:00:00+00', 'Eid Al-Fitr', 'عيد الفطر المبارك'),`);
  lines.push(`  ('hol-2026-03', '2026-05-01 00:00:00+00', 'Labour Day', 'عيد العمال'),`);
  lines.push(`  ('hol-2026-04', '2026-05-27 00:00:00+00', 'Eid Al-Adha', 'عيد الأضحى المبارك'),`);
  lines.push(`  ('hol-2026-05', '2026-06-16 00:00:00+00', 'Islamic New Year', 'رأس السنة الهجرية'),`);
  lines.push(`  ('hol-2026-06', '2026-12-16 00:00:00+00', 'Bahrain National Day', 'اليوم الوطني لمملكة البحرين')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO system.service (id, code, name_en, name_ar, category, description_en, description_ar, unit, default_rate, is_active, display_order, is_public, image_url, created_at, updated_at, is_sample) VALUES`);
  lines.push(`  ('svc-001', 'TVC-PROD', 'Commercial Film & TVC Production', 'إنتاج الأفلام والإعلانات التجارية', 'production', 'End-to-end 8K commercial directing, cinematography, and soundstage production.', 'إخراج وتصوير إعلانات تجارية بدقة 8K واستوديوهات متكاملة.', 'project', 6500.000, true, 1, true, '/api/files/brand/logo-light_dbf1f2e280f5.png', now(), now(), false),`);
  lines.push(`  ('svc-002', 'DOC-FEAT', 'Corporate Documentary Feature', 'أفلام وثائقية للمؤسسات', 'production', 'Multi-location documentary storytelling and archival interviews.', 'إنتاج أفلام وثائقية مؤسسية وتغطيات ميدانية متكاملة.', 'project', 4200.000, true, 2, true, '/api/files/brand/icon-light_68b1a95d35cf.png', now(), now(), false),`);
  lines.push(`  ('svc-003', 'POST-GRADE', 'HDR Color Grading & Dolby Finishing', 'تصحيح الألوان HDR والمونتاج السينمائي', 'post', 'DaVinci Resolve Studio HDR grading suites with Sony BVM reference monitoring.', 'قاعات تلوين سينمائية ومعالجة صوتية محيطية احترافية.', 'day', 450.000, true, 3, true, '/api/files/brand/logo-dark_50ae2cfc6efa.png', now(), now(), false),`);
  lines.push(`  ('svc-004', 'LIVE-OB', 'Multi-Camera Live Broadcast & OB', 'البث المباشر متعدد الكاميرات', 'events', 'Turnkey multi-cam broadcast switching and fiber transmission for summits and sports.', 'تغطية مباشرة وبث فضائي ورقمي للفعاليات والمؤتمرات الكبرى.', 'day', 1800.000, true, 4, true, '/api/files/brand/icon-dark_f661f555ebbe.png', now(), now(), false),`);
  lines.push(`  ('svc-005', 'DRONE-CIN', 'Aerial Cinema & FPV Drone Unit', 'التصوير الجوي السينمائي والدرون', 'aerial', 'Licensed dual-operator Inspire 3 & custom FPV cinema rigs for GCC locations.', 'تصوير جوي سينمائي مرخص بدقة 8K مع طاقم متخصص.', 'day', 650.000, true, 5, true, '/api/files/brand/full-logo-light_112233445566.png', now(), now(), false),`);
  lines.push(`  ('svc-006', 'STAGE-RENT', 'Soundstage A Acoustic Studio Lease', 'تأجير استوديو التصوير الصوتي المعزول', 'studio', 'Climate-controlled 450 sqm cyclorama stage with overhead DMX grid.', 'استوديو تصوير بمساحة 450 متر مربع مع إضاءة علوية وعزل صوتي.', 'day', 850.000, true, 6, true, '/api/files/brand/full-logo-dark_112233445577.png', now(), now(), false)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 3. FILES SERVICE (Brand Artwork, Logos, Fonts)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  const allUploads = [...uploadObjects];
  for (const b of brandAssetsConfig) {
    if (!allUploads.some((u) => u.file_url === b.url)) {
      allUploads.push({
        id: `upload-${b.key}`,
        file_url: b.url,
        file_name: `${b.key}.png`,
        file_size: 50000,
        mime_type: "image/png",
        is_public: true,
      });
    }
  }
  for (const obj of allUploads) {
    lines.push(`INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)`);
    lines.push(`VALUES (${sqlQuote(obj.id)}, ${sqlQuote(obj.file_url)}, 'system', ${sqlQuote(obj.file_name)}, ${obj.file_size}, ${sqlQuote(obj.mime_type)}, ${obj.is_public ? "true" : "false"}, now(), now() + interval '100 years', now())`);
    lines.push(`ON CONFLICT (file_url) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 4. IDENTITY SERVICE (Roles, Scopes, Accounts & Permissions)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const role of orderedStaffRoles) {
    lines.push(`INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES (${sqlQuote(role.id)}, ${sqlQuote(role.name_en)}, ${sqlQuote(role.name_ar)}, true, ${sqlQuote(role.reporting_to_role)}, now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;`);
  }
  for (const role of orderedItRoles) {
    lines.push(`INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES (${sqlQuote(role.id)}, ${sqlQuote(role.name_en)}, ${sqlQuote(role.name_ar)}, true, ${sqlQuote(role.reporting_to_role)}, now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;`);
  }
  for (const scope of staffScopes) {
    lines.push(`INSERT INTO identity.staff_role_scope (role_id, area, scope) VALUES (${sqlQuote(scope.role_id)}, ${sqlQuote(scope.area)}, ${sqlQuote(scope.scope)}) ON CONFLICT (role_id, area) DO NOTHING;`);
  }
  for (const perm of staffPermissions) {
    lines.push(`INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES (${sqlQuote(perm.id)}, ${sqlQuote(perm.role_id)}, ${sqlQuote(perm.resource)}, ${sqlQuote(perm.action)}, ${perm.allowed ? "true" : "false"}, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;`);
  }
  for (const perm of itPermissions) {
    lines.push(`INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES (${sqlQuote(perm.id)}, ${sqlQuote(perm.role_id)}, ${sqlQuote(perm.resource)}, ${sqlQuote(perm.action)}, ${perm.allowed ? "true" : "false"}, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;`);
  }
  for (const acc of orderedAccounts) {
    lines.push(`INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(acc.realm)}, ${sqlQuote(acc.subject_id)}, ${sqlQuote(acc.email)}, ${sqlQuote(acc.username)}, ${sqlQuote(acc.password_hash)}, ${sqlQuote(acc.roles)}, true, false, NULL, now(), now())`);
    lines.push(`ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = NULL, active = true, updated_at = now();`);
  }
  const reportingLines = accounts
    .filter((acc) => acc.reporting_to)
    .map((acc) => `  (${sqlQuote(acc.realm)}::text, ${sqlQuote(acc.subject_id)}::text, ${sqlQuote(acc.reporting_to)}::text)`)
    .join(",\n");
  if (reportingLines) {
    lines.push(`UPDATE identity.account AS account SET reporting_to = reporting.reporting_to`);
    lines.push(`FROM (VALUES`);
    lines.push(reportingLines);
    lines.push(`) AS reporting(realm, subject_id, reporting_to)`);
    lines.push(`WHERE account.realm = reporting.realm AND account.subject_id = reporting.subject_id;`);
  }
  for (const acc of staffAccess) {
    lines.push(`INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', ${sqlQuote(acc.subject_id)}, '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO identity.branch (id, code, name, time_zone, business_day_start, is_active, revision, created_at, updated_at) VALUES`);
  lines.push(`  ('br-hq', 'SEEF-HQ', 'Seef District Studio HQ', 'Asia/Bahrain', 8, true, 1, now(), now()),`);
  lines.push(`  ('br-stage', 'STAGE-A', 'Manama Soundstage A & Color Suites', 'Asia/Bahrain', 8, true, 1, now(), now()),`);
  lines.push(`  ('br-vault', 'VAULT-01', 'Equipment Vault & Rental Counter', 'Asia/Bahrain', 9, true, 1, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 5. HR SERVICE (Departments, Employees, Payroll Runs, Leaves, Attendance)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const dept of departments) {
    lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES (${sqlQuote(dept.id)}, ${sqlQuote(dept.code)}, ${sqlQuote(dept.name_en)}, ${sqlQuote(dept.name_ar)}) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;`);

  lines.push(`INSERT INTO hr.leave_type (id, code, name_en, name_ar, days_allowed_per_year, is_paid, pay_percent) VALUES`);
  lines.push(`  ('lt-annual', 'annual', 'Annual Paid Leave', 'إجازة سنوية مدفوعة', 30.0, true, 100),`);
  lines.push(`  ('lt-sick', 'sick', 'Medical / Sick Leave', 'إجازة مرضية', 15.0, true, 100),`);
  lines.push(`  ('lt-emergency', 'emergency', 'Emergency Compassionate Leave', 'إجازة طارئة', 5.0, true, 100),`);
  lines.push(`  ('lt-maternity', 'maternity', 'Parental & Maternity Leave', 'إجازة أمومة وأبوة', 60.0, true, 100)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.benefit_plan (id, code, name_en, name_ar, coverage_details, employer_contribution, employee_contribution, created_at) VALUES`);
  lines.push(`  ('bp-med-gold', 'MED-GOLD', 'GCC Executive Medical Gold', 'التأمين الصحي الذهبي الشامل', 'In-patient, outpatient, dental & optical coverage across GCC.', 85.000, 15.000, now()),`);
  lines.push(`  ('bp-life-acc', 'LIFE-ACC', 'Set Safety & Crew Accident Cover', 'تأمين حوادث مواقع التصوير', '24/7 production set and aerial rig crew protection.', 35.000, 0.000, now()),`);
  lines.push(`  ('bp-gosi-top', 'GOSI-PLUS', 'Supplementary Savings & Indemnity Plan', 'برنامج الادخار التقاعدي الإضافي', 'Employer-matched end-of-service indemnity savings plan.', 50.000, 25.000, now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.shift_type (id, code, name_en, name_ar, allowance_mode, allowance_value, is_active) VALUES`);
  lines.push(`  ('shf-std', 'STD-DAY', 'Standard Studio Day (08:30–17:30)', 'دوام الاستوديو الاعتيادي', 'fixed', 0.000, true),`);
  lines.push(`  ('shf-loc', 'LOC-SHOOT', 'On-Location Field Call', 'تصوير خارجي ميداني', 'fixed', 25.000, true),`);
  lines.push(`  ('shf-night', 'NIGHT-GRADE', 'Overnight Mastering Shift', 'مناوبة مونتاج وتلوين ليلية', 'percentage', 20.000, true)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  for (const emp of orderedEmployees) {
    lines.push(`INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(emp.id)}, ${sqlQuote(emp.employee_number)}, ${sqlQuote(emp.first_name_en)}, ${sqlQuote(emp.last_name_en)}, ${sqlQuote(emp.first_name_ar)}, ${sqlQuote(emp.last_name_ar)}, ${sqlQuote(emp.email)}, ${sqlQuote(emp.phone)}, ${sqlQuote(emp.job_title_en)}, ${sqlQuote(emp.job_title_ar)}, ${sqlQuote(emp.department_id)}, ${sqlQuote(emp.reporting_to)}, (CURRENT_DATE - INTERVAL '365 days')::date, 'active', ${emp.basic_salary}, ${emp.housing_allowance}, ${emp.transport_allowance}, 0.000, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Historical Payroll Runs & Items
  for (const pr of payrollRuns) {
    lines.push(`INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)`);
    lines.push(`VALUES (${sqlQuote(pr.id)}, ${pr.month}, ${pr.year}, 'completed', ${pr.gross}.000, ${pr.ded}.000, ${pr.net}.000, 'BHD', (CURRENT_DATE - INTERVAL '${pr.daysAgo} days')::timestamptz, 'omar-haddad', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const pi of payrollItems) {
    lines.push(`INSERT INTO hr.payroll_item (id, payroll_run_id, employee_id, basic_salary, allowances, deductions, net_salary, status)`);
    lines.push(`VALUES (${sqlQuote(pi.id)}, ${sqlQuote(pi.payroll_run_id)}, ${sqlQuote(pi.employee_id)}, ${pi.basic_salary}, ${pi.allowances}, ${pi.deductions}, ${pi.net_salary}, ${sqlQuote(pi.status)})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Leaves
  for (const lr of leaveRequests) {
    const emp = baseEmployees[lr.empIdx % baseEmployees.length];
    lines.push(`INSERT INTO hr.leave_request (id, employee_id, leave_type, start_date, end_date, days_count, status, reason, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(lr.id)}, ${sqlQuote(emp.id)}, ${sqlQuote(lr.type)}, (CURRENT_DATE - INTERVAL '${lr.startAgo} days')::date, (CURRENT_DATE - INTERVAL '${lr.endAgo} days')::date, ${lr.days}, ${sqlQuote(lr.status)}, ${sqlQuote(lr.reason)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Attendance
  for (let e = 0; e < baseEmployees.length; e++) {
    const emp = baseEmployees[e];
    lines.push(`INSERT INTO hr.attendance_entry (id, employee_id, entry_date, check_in, check_out, status, notes, created_at)`);
    lines.push(`VALUES ('att-${emp.id}-today', ${sqlQuote(emp.id)}, CURRENT_DATE, (CURRENT_DATE + TIME '08:45:00')::timestamptz, NULL, 'present', 'Studio check-in', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Salary Documents & Employee Credentials
  for (let e = 0; e < Math.min(6, baseEmployees.length); e++) {
    const emp = baseEmployees[e];
    const kind = e % 3 === 0 ? "salary_certificate" : e % 3 === 1 ? "payslip" : "employment_letter";
    const status = e < 4 ? "issued" : e === 4 ? "approved" : "pending";
    lines.push(`INSERT INTO hr.salary_document (id, employee_id, kind, months, status, requested_by_id, reviewed_by_id, review_notes, snapshot, created_at, issued_at, updated_at)`);
    lines.push(`VALUES ('saldoc-00${e + 1}', ${sqlQuote(emp.id)}, ${sqlQuote(kind)}, '["2026-08","2026-09","2026-10"]'::jsonb, ${sqlQuote(status)}, ${sqlQuote(emp.id)}, 'layla-nasser', 'Verified against monthly payroll ledger', ${sqlQuote({ employeeName: `${emp.first_name_en} ${emp.last_name_en}`, basicSalary: emp.basic_salary, currency: "BHD" })}, now() - interval '${e + 2} days', ${status === "issued" ? `now() - interval '${e + 1} days'` : "NULL"}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let e = 0; e < baseEmployees.length; e++) {
    const emp = baseEmployees[e];
    const isVisa = e % 2 === 1;
    lines.push(`INSERT INTO hr.employee_credential (id, employee_id, kind, visa_type, label, number, issuing_country, issue_date, expiry_date, sponsor, cost_amount, cost_currency, cost_frequency, cost_term_months, paid_by, file_url, notes, created_at, updated_at)`);
    lines.push(`VALUES ('cred-0${String(e + 1).padStart(2, "0")}', ${sqlQuote(emp.id)}, ${sqlQuote(isVisa ? "work_visa" : "cpr_id")}, ${sqlQuote(isVisa ? "LMRA-Employment" : "National-ID")}, ${sqlQuote(isVisa ? "LMRA Work Residency Permit" : "Bahrain Central Population ID (CPR)")}, ${sqlQuote(`BH-${890120 + e * 37}`)}, 'BH', now() - interval '240 days', now() + interval '${120 + e * 30} days', ${sqlQuote(isIshoot ? "iShoot Cinema Production S.P.C." : "Northwind Studio W.L.L.")}, ${isVisa ? "172.000" : "10.000"}, 'BHD', 'annual', 24, 'company', NULL, 'Compliance record verified by HR', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 6. SALES SERVICE (Contacts, Deals across all stages, Quotations, Inquiries)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const c of contacts) {
    lines.push(`INSERT INTO sales.contact (id, first_name, last_name, email, phone, company, contact_type, status, notes, tags, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(c.id)}, ${sqlQuote(c.first_name)}, ${sqlQuote(c.last_name)}, ${sqlQuote(c.email)}, ${sqlQuote(c.phone)}, ${sqlQuote(c.company)}, ${sqlQuote(c.contact_type)}, ${sqlQuote(c.status)}, ${sqlQuote(c.notes)}, ${sqlQuote(c.tags)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const d of deals) {
    lines.push(`INSERT INTO sales.deal (id, title, contact_id, stage, value, currency, probability, expected_close_date, status, assigned_to, notes, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(d.id)}, ${sqlQuote(d.title)}, ${sqlQuote(d.contact_id)}, ${sqlQuote(d.stage)}, ${d.value}.000, ${sqlQuote(d.currency)}, ${d.probability}, ${d.expected_close_date_sql}, ${sqlQuote(d.status)}, ${sqlQuote(d.assigned_to)}, ${sqlQuote(d.notes)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const q of quotations) {
    lines.push(`INSERT INTO sales.quotation (id, quotation_number, contact_id, deal_id, status, subtotal, discount, vat_rate, vat_amount, total, currency, valid_until, terms, notes, issued_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(q.id)}, ${sqlQuote(q.quotation_number)}, ${sqlQuote(q.contact_id)}, ${sqlQuote(q.deal_id)}, ${sqlQuote(q.status)}, ${q.subtotal}.000, 0.000, ${q.vat_rate}, ${q.vat_amount}, ${q.total}, ${sqlQuote(q.currency)}, (CURRENT_DATE + INTERVAL '30 days')::date, ${sqlQuote(q.terms)}, ${sqlQuote(q.notes)}, now(), now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const qi of quotationItems) {
    lines.push(`INSERT INTO sales.quotation_item (id, quotation_id, description, quantity, unit_price, amount, sort_order)`);
    lines.push(`VALUES (${sqlQuote(qi.id)}, ${sqlQuote(qi.quotation_id)}, ${sqlQuote(qi.description)}, ${qi.quantity}, ${qi.unit_price}, ${qi.amount}, ${qi.sort_order})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Inquiries
  for (let i = 0; i < 15; i++) {
    const contact = contacts[i % contacts.length];
    lines.push(`INSERT INTO sales.inquiry (id, inquiry_type, subject, message, requester_name, requester_email, requester_phone, status, created_at, updated_at)`);
    lines.push(`VALUES ('inq-${String(i + 1).padStart(3, "0")}', 'production', 'Production inquiry for upcoming commercial series', 'We are looking for cinema camera packages and post-production suites in Bahrain.', ${sqlQuote(contact.first_name + ' ' + contact.last_name)}, ${sqlQuote(contact.email)}, ${sqlQuote(contact.phone)}, 'new', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO sales.deal_pipeline_stage (id, name_en, name_ar, sort_order, probability, kind, color, is_system, is_active, created_at, updated_at) VALUES`);
  lines.push(`  ('stg-lead', 'Lead / Inquiry', 'عميل محتمل', 1, 20, 'open', '#64748b', true, true, now(), now()),`);
  lines.push(`  ('stg-qualified', 'Qualified Scope', 'نطاق مؤهل', 2, 40, 'open', '#0284c7', true, true, now(), now()),`);
  lines.push(`  ('stg-proposal', 'Proposal Sent', 'تم إرسال العرض', 3, 60, 'open', '#d97706', true, true, now(), now()),`);
  lines.push(`  ('stg-negotiation', 'Commercial Negotiation', 'مفاوضات تجارية', 4, 80, 'open', '#7c3aed', true, true, now(), now()),`);
  lines.push(`  ('stg-won', 'Closed Won', 'تم الفوز بالصفقة', 5, 100, 'won', '#16a34a', true, true, now(), now()),`);
  lines.push(`  ('stg-lost', 'Closed Lost', 'صفقة منتهية', 6, 0, 'lost', '#dc2626', true, true, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  const campaigns = [
    { id: "cmp-001", code: "F1-BGP-2026", name: "Formula 1 Grand Prix Broadcast Reel Outreach", channel: "email", status: "completed", budget: 1800, spend: 1650, coupon: "F1SPECIAL", ago: 45 },
    { id: "cmp-002", code: "RAMADAN-TVC", name: "Ramadan & Eid Broadcast Production Bookings", channel: "email", status: "active", budget: 2500, spend: 1420, coupon: "RAMADAN2026", ago: 18 },
    { id: "cmp-003", code: "GEAR-Q4-VIP", name: "Cinema Vault Executive Rental VIP Program", channel: "whatsapp", status: "active", budget: 1200, spend: 780, coupon: "PRODUCERVIP", ago: 10 },
    { id: "cmp-004", code: "SOUNDSTAGE-PR", name: "Virtual Production & LED Volume Launch Event", channel: "events", status: "completed", budget: 3500, spend: 3390, coupon: "NEWGEAR100", ago: 30 },
    { id: "cmp-005", code: "CORPORATE-DOC", name: "Annual ESG & Sustainability Documentary Pitch", channel: "email", status: "scheduled", budget: 1500, spend: 0, coupon: null, ago: -5 },
    { id: "cmp-006", code: "GCC-AGENCY-Q1", name: "GCC Creative Agencies Technical Partner Packet", channel: "email", status: "draft", budget: 2000, spend: 0, coupon: null, ago: 2 },
  ];
  for (const c of campaigns) {
    lines.push(`INSERT INTO sales.campaign (id, name, subject, body, status, sent_at, created_at, updated_at, code, channel, start_date, end_date, budget, spend, utm_campaign, coupon_code, notes, owner_id, created_by_id)`);
    lines.push(`VALUES (${sqlQuote(c.id)}, ${sqlQuote(c.name)}, ${sqlQuote(c.name)}, 'Tailored cinema production packages and studio availability for your upcoming brand campaign.', ${sqlQuote(c.status)}, ${c.status === "completed" || c.status === "active" ? `now() - interval '${Math.max(1, c.ago)} days'` : "NULL"}, now(), now(), ${sqlQuote(c.code)}, ${sqlQuote(c.channel)}, now() - interval '${Math.max(1, c.ago)} days', now() + interval '30 days', ${c.budget}.000, ${c.spend}.000, ${sqlQuote(c.code.toLowerCase())}, ${sqlQuote(c.coupon)}, 'Campaign metrics synchronized with CRM deals.', 'sami-khoury', 'sami-khoury')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 7. FINANCE SERVICE (Expense Categories, Expenses, 55 Invoices across Aging Buckets, Payments)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const cat of expenseCategories) {
    lines.push(`INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES (${sqlQuote(cat.id)}, ${sqlQuote(cat.code)}, ${sqlQuote(cat.name_en)}, ${sqlQuote(cat.name_ar)}, ${cat.sort_order}) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO finance.expense_category (id, code, name_en, name_ar, sort_order) VALUES`);
  lines.push(`  ('expcat-11', 'maintenance_repairs', 'Gear Calibration & Repairs', 'صيانة ومعايرة المعدات', 11),`);
  lines.push(`  ('expcat-12', 'legal_accounting', 'Legal & Professional Audit', 'استشارات قانونية ومحاسبية', 12)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO finance.tax_rate (id, code, name_en, name_ar, rate_percent, registration_number, certificate_url, certificate_valid_until, applies_to_invoices, applies_to_quotations, is_active, display_order, created_at, updated_at) VALUES`);
  lines.push(`  ('tax-vat10', 'VAT10', 'Bahrain Standard VAT (10%)', 'ضريبة القيمة المضافة القياسية (10%)', 10.000, '200014982300002', NULL, now() + interval '365 days', true, true, true, 1, now(), now()),`);
  lines.push(`  ('tax-zero', 'ZERO', 'Zero-Rated Export Production (0%)', 'صادرات وإنتاج معفى (0%)', 0.000, '200014982300002', NULL, now() + interval '365 days', true, true, true, 2, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO finance.payment_method_config (id, branch_id, code, name_en, name_ar, is_enabled, allow_change, requires_reference, surcharge_rate, sort_order, created_at, updated_at) VALUES`);
  lines.push(`  ('pm-bank', 'br-hq', 'bank_transfer', 'Corporate Bank Transfer', 'تحويل بنكي مؤسسي', true, false, true, 0.000, 1, now(), now()),`);
  lines.push(`  ('pm-benefit', 'br-hq', 'benefit_pay', 'BenefitPay Instant QR', 'بنفت باي الفوري', true, false, true, 0.000, 2, now(), now()),`);
  lines.push(`  ('pm-card', 'br-hq', 'credit_card', 'Visa / Mastercard POS', 'بطاقة ائتمانية', true, false, true, 0.000, 3, now(), now()),`);
  lines.push(`  ('pm-cash', 'br-hq', 'cash', 'Cash Counter', 'نقداً', true, true, false, 0.000, 4, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  for (const exp of expenses) {
    lines.push(`INSERT INTO finance.expense (id, title, amount, currency, category_id, expense_date, vendor, status, notes, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(exp.id)}, ${sqlQuote(exp.title)}, ${exp.amount}.000, 'BHD', ${sqlQuote(exp.category_id)}, ${exp.expense_date_sql}, ${sqlQuote(exp.vendor)}, 'approved', ${sqlQuote(exp.notes)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // 55 INVOICES ACROSS AGING BUCKETS & SCENARIOS
  for (const inv of invoices) {
    lines.push(`INSERT INTO finance.invoice (id, invoice_number, contact_id, status, issue_date, due_date, subtotal, discount, vat_rate, vat_amount, total, amount_paid, balance_due, currency, notes, terms, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(inv.id)}, ${sqlQuote(inv.invoice_number)}, ${sqlQuote(inv.contact_id)}, ${sqlQuote(inv.status)}, ${inv.issue_date_sql}, ${inv.due_date_sql}, ${inv.subtotal}.000, 0.000, ${inv.vat_rate}, ${inv.vat_amount}, ${inv.total}, ${inv.amount_paid}, ${inv.balance_due}, 'BHD', ${sqlQuote(inv.notes)}, ${sqlQuote(inv.terms)}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const item of invoiceItems) {
    lines.push(`INSERT INTO finance.invoice_item (id, invoice_id, description, quantity, unit_price, amount, sort_order)`);
    lines.push(`VALUES (${sqlQuote(item.id)}, ${sqlQuote(item.invoice_id)}, ${sqlQuote(item.description)}, ${item.quantity}, ${item.unit_price}, ${item.amount}, ${item.sort_order})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const pay of payments) {
    lines.push(`INSERT INTO finance.payment (id, payment_number, invoice_id, contact_id, amount, currency, payment_method, payment_date, reference, status, notes, created_at)`);
    lines.push(`VALUES (${sqlQuote(pay.id)}, ${sqlQuote(pay.payment_number)}, ${sqlQuote(pay.invoice_id)}, ${sqlQuote(pay.contact_id)}, ${pay.amount}, 'BHD', ${sqlQuote(pay.payment_method)}, ${pay.payment_date_sql}, ${sqlQuote(pay.reference)}, 'completed', ${sqlQuote(pay.notes)}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let b = 0; b < 8; b++) {
    lines.push(`INSERT INTO finance.bank_settlement (id, settlement_number, bank_account, amount, currency, settled_at, status, notes, created_at)`);
    lines.push(`VALUES ('bset-00${b + 1}', 'BSET-2026-00${b + 1}', ${sqlQuote(b % 2 === 0 ? "NBB Corporate IBAN ...8821" : "BBK Treasury IBAN ...4419")}, ${(2400 + b * 650).toFixed(3)}, 'BHD', now() - interval '${(8 - b) * 7} days', ${sqlQuote(b < 6 ? "completed" : "pending")}, 'Weekly card & BenefitPay merchant payout reconciliation', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  const recurringDefs = [
    { id: "rexp-01", en: "Soundstage A Commercial Lease", ar: "إيجار استوديو التصوير الرئيسي", cat: "expcat-04", vendor: "Seef Commercial Properties", amt: 1850, freq: "monthly" },
    { id: "rexp-02", en: "Studio Power & District Cooling (EWA)", ar: "فواتير الكهرباء والتبريد المركزي", cat: "expcat-04", vendor: "Electricity & Water Authority", amt: 420, freq: "monthly" },
    { id: "rexp-03", en: "Dedicated 10Gbps Symmetrical Studio Fiber", ar: "خط إنترنت الألياف البصرية 10 جيجابت", cat: "expcat-05", vendor: "Batelco Business", amt: 280, freq: "monthly" },
    { id: "rexp-04", en: "Frame.io & AWS Cold Vault Replication", ar: "اشتراكات التخزين السحابي والنسخ الاحتياطي", cat: "expcat-05", vendor: "Amazon Web Services", amt: 340, freq: "monthly" },
    { id: "rexp-05", en: "Cinema Camera All-Risk Float Insurance", ar: "تأمين شامل لمعدات التصوير والأسطول", cat: "expcat-12", vendor: "Bahrain National Insurance", amt: 950, freq: "quarterly" },
    { id: "rexp-06", en: "24/7 Vault Security & Biometric Access", ar: "حراسة وأمن مستودع المعدات", cat: "expcat-04", vendor: "Gulf Shield Security", amt: 310, freq: "monthly" },
  ];
  for (const rx of recurringDefs) {
    lines.push(`INSERT INTO finance.recurring_expense (id, title_en, title_ar, category_id, vendor_name, reference, amount, input_vat_amount, is_vat_recoverable, currency, payment_method, frequency, start_date, end_date, next_due_date, auto_record, remind_days_before, is_active, notes, created_by_id, last_recorded_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(rx.id)}, ${sqlQuote(rx.en)}, ${sqlQuote(rx.ar)}, ${sqlQuote(rx.cat)}, ${sqlQuote(rx.vendor)}, ${sqlQuote(`REC-${rx.id.toUpperCase()}`)}, ${rx.amt}.000, ${(rx.amt * 0.1).toFixed(3)}, true, 'BHD', 'bank_transfer', ${sqlQuote(rx.freq)}, now() - interval '180 days', now() + interval '185 days', now() + interval '15 days', true, 5, true, 'Recurring operating overhead', 'layla-nasser', now() - interval '15 days', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let j = 0; j < 10; j++) {
    const jeId = `je-2026-${String(j + 1).padStart(3, "0")}`;
    const amt = (1200 + j * 450).toFixed(3);
    lines.push(`INSERT INTO finance.journal_entry (id, source_key, request_hash, period_id, posting_date, currency, memo, branch_id, reversal_of_id, created_by_id, created_at)`);
    lines.push(`VALUES (${sqlQuote(jeId)}, ${sqlQuote(`seed:invoice:inv-0${String(j + 1).padStart(2, "0")}`)}, ${sqlQuote(`hash-${jeId}`)}, '2026-Q4', now() - interval '${30 - j * 2} days', 'BHD', 'Double-entry accrual posting for commercial billing cycle', 'br-hq', NULL, 'layla-nasser', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO finance.journal_line (id, entry_id, account_id, debit, credit, memo) VALUES`);
    lines.push(`  (${sqlQuote(`jl-${jeId}-1`)}, ${sqlQuote(jeId)}, 'acc-1100-ar', ${amt}, 0.000, 'Accounts Receivable Control'),`);
    lines.push(`  (${sqlQuote(`jl-${jeId}-2`)}, ${sqlQuote(jeId)}, 'acc-4000-rev', 0.000, ${amt}, 'Production & Rental Revenue')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let sb = 0; sb < 8; sb++) {
    const billId = `sbill-00${sb + 1}`;
    const sub = 1400 + sb * 350;
    const vat = Math.round(sub * 0.1 * 1000) / 1000;
    const tot = sub + vat;
    const paid = sb < 5 ? tot : sb < 7 ? Math.round(tot * 0.5 * 1000) / 1000 : 0;
    const st = sb < 5 ? "paid" : sb < 7 ? "partially_paid" : "approved";
    lines.push(`INSERT INTO finance.supplier_bill (id, number, supplier_ref, supplier_id, purchase_order_id, bill_date, due_date, status, subtotal, vat_amount, total, amount_paid, expense_id, override_reason, attachment_url, note, created_by_id, approved_by_id, approved_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(billId)}, ${sqlQuote(`BILL-2026-00${sb + 1}`)}, ${sqlQuote(`SUP-INV-90${sb + 1}`)}, ${sqlQuote(`sup-00${(sb % 4) + 1}`)}, ${sqlQuote(`po-00${sb + 1}`)}, now() - interval '${35 - sb * 4} days', now() + interval '${sb * 5} days', ${sqlQuote(st)}, ${sub.toFixed(3)}, ${vat.toFixed(3)}, ${tot.toFixed(3)}, ${paid.toFixed(3)}, NULL, NULL, NULL, 'Studio equipment procurement supplier bill', 'faisal-mansour', 'layla-nasser', now() - interval '${34 - sb * 4} days', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO finance.supplier_bill_line (id, bill_id, order_line_id, description, quantity, unit_price, sort_order) VALUES`);
    lines.push(`  (${sqlQuote(`sbl-${billId}-1`)}, ${sqlQuote(billId)}, ${sqlQuote(`pol-${sb + 1}-1`)}, 'Cinema Production Optical & Lighting Supplies', 2.000, ${(sub / 2).toFixed(3)}, 1)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    if (paid > 0) {
      lines.push(`INSERT INTO finance.supplier_payment (id, bill_id, amount, paid_on, method, reference, created_by_id, created_at)`);
      lines.push(`VALUES (${sqlQuote(`spay-${billId}`)}, ${sqlQuote(billId)}, ${paid.toFixed(3)}, now() - interval '${25 - sb * 3} days', 'bank_transfer', ${sqlQuote(`WIRE-SUP-00${sb + 1}`)}, 'layla-nasser', now())`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 8. INVENTORY SERVICE (Categories, Warehouses, Locations, Products, Stock Levels)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  const primaryWhId = baseWarehouses[0]?.id || "wh-main";
  for (const cat of productCats) {
    lines.push(`INSERT INTO inventory.product_category (id, slug, name_en, name_ar, description_en, description_ar, sort_order, is_active)`);
    lines.push(`VALUES (${sqlQuote(cat.id)}, ${sqlQuote(cat.slug)}, ${sqlQuote(cat.en)}, ${sqlQuote(cat.ar)}, ${sqlQuote(cat.desc)}, ${sqlQuote(cat.ar)}, ${cat.sort}, true)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const w of baseWarehouses) {
    lines.push(`INSERT INTO inventory.warehouse (id, code, name_en, name_ar, address, is_active, is_default, sort_order, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(w.id)}, ${sqlQuote(w.code)}, ${sqlQuote(w.name_en)}, ${sqlQuote(w.name_ar)}, ${sqlQuote(w.address)}, true, ${w.is_default ? "true" : "false"}, ${w.sort_order}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const loc of baseLocations) {
    lines.push(`INSERT INTO inventory.stock_location (id, warehouse_id, code, name, is_active, created_at)`);
    lines.push(`VALUES (${sqlQuote(loc.id)}, ${sqlQuote(loc.warehouse_id)}, ${sqlQuote(loc.code)}, ${sqlQuote(loc.name)}, true, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  const primaryLocId = baseLocations[0]?.id || "loc-01";

  for (let pi = 0; pi < productList.length; pi++) {
    const p = productList[pi];
    const prodId = `prod-${p.sku.toLowerCase()}`;
    lines.push(`INSERT INTO inventory.product (id, sku, name_en, name_ar, description_en, description_ar, category_id, cost_price, selling_price, currency, tax_rate, is_active, track_inventory, reorder_point, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(prodId)}, ${sqlQuote(p.sku)}, ${sqlQuote(p.en)}, ${sqlQuote(p.ar)}, ${sqlQuote(p.en)}, ${sqlQuote(p.ar)}, ${sqlQuote(p.cat)}, ${p.cost}.0000, ${p.price}.0000, 'BHD', 10.00, true, true, ${p.reorder}.00, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO inventory.stock_level (id, product_id, location_id, quantity_on_hand, quantity_reserved, quantity_available, reorder_point, updated_at)`);
    lines.push(`VALUES ('sl-' || ${sqlQuote(prodId)}, ${sqlQuote(prodId)}, ${sqlQuote(primaryLocId)}, 4.0000, 0.0000, 4.0000, ${p.reorder}.0000, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO inventory.stock_movement (id, product_id, location_id, movement_type, quantity, unit_cost, source_type, note, created_at)`);
    lines.push(`VALUES ('sm-' || ${sqlQuote(prodId)}, ${sqlQuote(prodId)}, ${sqlQuote(primaryLocId)}, 'initial', 4.0000, ${p.cost}.0000, 'inventory', 'Initial vault intake & testing', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    if (pi < 8) {
      for (const m of [
        { k: "PL", en: "PL Mount Kit", ar: "نسخة PL", mult: 1.0, sort: 1 },
        { k: "EF", en: "EF / LPL Kit", ar: "نسخة EF/LPL", mult: 1.08, sort: 2 },
      ]) {
        const varId = `var-${p.sku.toLowerCase()}-${m.k.toLowerCase()}`;
        const varSku = `${p.sku}-${m.k}`;
        const vPrice = Math.round(p.price * m.mult * 100) / 100;
        const vCost = Math.round(p.cost * m.mult * 100) / 100;
        lines.push(`INSERT INTO inventory.product_variant (id, product_id, sku, name_en, name_ar, barcode, cost_price, selling_price, is_active, attributes, price, cost, sort_order, created_at, updated_at)`);
        lines.push(`VALUES (${sqlQuote(varId)}, ${sqlQuote(prodId)}, ${sqlQuote(varSku)}, ${sqlQuote(`${p.en} (${m.en})`)}, ${sqlQuote(`${p.ar} (${m.ar})`)}, ${sqlQuote(`8800${String(pi).padStart(3, "0")}${m.sort}`)}, ${vCost.toFixed(4)}, ${vPrice.toFixed(4)}, true, ${sqlQuote({ mount: m.k })}, ${vPrice.toFixed(3)}, ${vCost.toFixed(3)}, ${m.sort}, now(), now())`);
        lines.push(`ON CONFLICT (id) DO NOTHING;`);
      }
    }
    if (pi < 10) {
      lines.push(`INSERT INTO inventory.product_packaging_unit (id, product_id, code, name, base_units, indivisible, barcode, revision, is_active, created_at)`);
      lines.push(`VALUES ('pkg-${String(pi + 1).padStart(3, "0")}', ${sqlQuote(prodId)}, 'CASE-1', 'Flight Case Pack', 1.000, true, ${sqlQuote(`PKG-${p.sku}`)}, 1, true, now())`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  for (let poIdx = 0; poIdx < 8; poIdx++) {
    const poId = `po-00${poIdx + 1}`;
    const p = productList[poIdx % productList.length];
    const prodId = `prod-${p.sku.toLowerCase()}`;
    const qty = 2 + (poIdx % 3);
    const sub = qty * p.cost;
    const vat = Math.round(sub * 0.1 * 1000) / 1000;
    const tot = sub + vat;
    const status = poIdx < 4 ? "received" : poIdx < 6 ? "approved" : poIdx === 6 ? "sent" : "draft";
    lines.push(`INSERT INTO inventory.purchase_order (id, number, supplier_id, status, order_date, expected_date, warehouse_id, requisition_id, rfq_id, note, terms, vat_enabled, vat_percentage, subtotal, vat_amount, total, sent_at, sent_via, created_by_id, approved_by_id, approved_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(poId)}, ${sqlQuote(`PO-2026-00${poIdx + 1}`)}, ${sqlQuote(`sup-00${(poIdx % 4) + 1}`)}, ${sqlQuote(status)}, now() - interval '${40 - poIdx * 4} days', now() + interval '${poIdx * 3} days', ${sqlQuote(primaryWhId)}, NULL, NULL, 'Vault equipment replenishment order', 'Net 30 upon warehouse inspection', true, 10.00, ${sub.toFixed(3)}, ${vat.toFixed(3)}, ${tot.toFixed(3)}, ${status !== "draft" ? `now() - interval '${39 - poIdx * 4} days'` : "NULL"}, 'email', 'karim-fawzi', ${status !== "draft" ? "'omar-haddad'" : "NULL"}, ${status !== "draft" ? `now() - interval '${39 - poIdx * 4} days'` : "NULL"}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO inventory.purchase_order_line (id, purchase_order_id, product_id, variant_key, description, quantity, unit_price, received_quantity, rejected_quantity, billed_quantity, sort_order)`);
    lines.push(`VALUES (${sqlQuote(`pol-${poIdx + 1}-1`)}, ${sqlQuote(poId)}, ${sqlQuote(prodId)}, NULL, ${sqlQuote(p.en)}, ${qty}.000, ${p.cost}.000, ${status === "received" ? qty : 0}.000, 0.000, ${poIdx < 4 ? qty : 0}.000, 1)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    if (poIdx < 6) {
      const grId = `grn-00${poIdx + 1}`;
      lines.push(`INSERT INTO inventory.goods_receipt (id, number, purchase_order_id, location_id, received_by_id, received_at, note, created_at)`);
      lines.push(`VALUES (${sqlQuote(grId)}, ${sqlQuote(`GRN-2026-00${poIdx + 1}`)}, ${sqlQuote(poId)}, ${sqlQuote(primaryLocId)}, 'karim-fawzi', now() - interval '${28 - poIdx * 3} days', 'Serial numbers & optical check verified at dock', now())`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
      lines.push(`INSERT INTO inventory.goods_receipt_line (id, receipt_id, order_line_id, quantity, rejected_quantity, reject_reason, batch_number, expiry_date)`);
      lines.push(`VALUES (${sqlQuote(`grnl-${poIdx + 1}`)}, ${sqlQuote(grId)}, ${sqlQuote(`pol-${poIdx + 1}-1`)}, ${qty}.000, 0.000, NULL, ${sqlQuote(`BCH-2026-00${poIdx + 1}`)}, NULL)`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  for (let bi = 0; bi < 12; bi++) {
    const p = productList[bi % productList.length];
    const prodId = `prod-${p.sku.toLowerCase()}`;
    lines.push(`INSERT INTO inventory.stock_batch (id, batch_number, product_id, variant_id, location_id, initial_quantity, remaining_quantity, cost_per_unit, expiry_date, received_at, variant_key, created_at)`);
    lines.push(`VALUES ('bat-0${String(bi + 1).padStart(2, "0")}', ${sqlQuote(`BCH-2026-0${String(bi + 1).padStart(2, "0")}`)}, ${sqlQuote(prodId)}, NULL, ${sqlQuote(primaryLocId)}, 4.0000, 4.0000, ${p.cost}.0000, NULL, now() - interval '${90 - bi * 5} days', NULL, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let si = 0; si < 20; si++) {
    const p = productList[si % productList.length];
    const prodId = `prod-${p.sku.toLowerCase()}`;
    lines.push(`INSERT INTO inventory.stock_serial (id, code, product_id, variant_key, batch_key, location_id, manufacturer_serial, manufacturer_scope, status, package_id, generation_id, revision, created_at, updated_at)`);
    lines.push(`VALUES ('ser-0${String(si + 1).padStart(2, "0")}', ${sqlQuote(`SN-ISH-2026-${String(si + 1).padStart(4, "0")}`)}, ${sqlQuote(prodId)}, NULL, ${sqlQuote(`BCH-2026-0${String((si % 12) + 1).padStart(2, "0")}`)}, ${sqlQuote(primaryLocId)}, ${sqlQuote(`MFG-${p.sku}-${700 + si}`)}, 'oem', ${sqlQuote(si % 5 === 0 ? "allocated" : "available")}, NULL, NULL, 1, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (let sc = 0; sc < 4; sc++) {
    const scId = `sc-00${sc + 1}`;
    const st = sc < 2 ? "approved" : sc === 2 ? "counted" : "draft";
    lines.push(`INSERT INTO inventory.stock_count (id, count_number, warehouse_id, status, notes, counted_by_id, approved_by_id, counted_at, approved_at, created_at, number, scope, note, created_by_id, submitted_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(scId)}, ${sqlQuote(`SC-2026-00${sc + 1}`)}, ${sqlQuote(primaryWhId)}, ${sqlQuote(st)}, 'Quarterly physical vault audit', 'karim-fawzi', ${st === "approved" ? "'omar-haddad'" : "NULL"}, now() - interval '${(4 - sc) * 14} days', ${st === "approved" ? `now() - interval '${(4 - sc) * 13} days'` : "NULL"}, now(), ${sqlQuote(`SC-2026-00${sc + 1}`)}, 'full_warehouse', 'Verified serial tags against ledger', 'karim-fawzi', now() - interval '${(4 - sc) * 14} days', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    for (let li = 0; li < 5; li++) {
      const p = productList[(sc * 5 + li) % productList.length];
      const prodId = `prod-${p.sku.toLowerCase()}`;
      lines.push(`INSERT INTO inventory.stock_count_line (id, count_id, product_id, variant_id, system_quantity, counted_quantity, variance, notes, variant_key, location_id, batch_key, expected, counted, note)`);
      lines.push(`VALUES (${sqlQuote(`scl-${sc + 1}-${li + 1}`)}, ${sqlQuote(scId)}, ${sqlQuote(prodId)}, NULL, 4.000, 4.000, 0.000, 'Matched physical count', NULL, ${sqlQuote(primaryLocId)}, NULL, 4.000, 4.000, 'Verified')`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 9. COMMERCE & DELIVERY (50 Customers & Addresses, Orders, Coupons, Fleet)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const cust of customers) {
    lines.push(`INSERT INTO commerce.customer (id, first_name, last_name, email, phone, status, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(cust.id)}, ${sqlQuote(cust.first_name)}, ${sqlQuote(cust.last_name)}, ${sqlQuote(cust.email)}, ${sqlQuote(cust.phone)}, 'active', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  for (const addr of addresses) {
    lines.push(`INSERT INTO commerce.customer_address (id, customer_id, address_type, label, line1, line2, city, state, postal_code, country, is_default)`);
    lines.push(`VALUES (${sqlQuote(addr.id)}, ${sqlQuote(addr.customer_id)}, ${sqlQuote(addr.address_type)}, ${sqlQuote(addr.label)}, ${sqlQuote(addr.line1)}, ${sqlQuote(addr.line2)}, ${sqlQuote(addr.city)}, ${sqlQuote(addr.state)}, ${sqlQuote(addr.postal_code)}, 'BH', true)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  lines.push(`INSERT INTO commerce.coupon (id, code, discount_type, discount_value, min_order_amount, is_active, starts_at, expires_at, created_at) VALUES`);
  lines.push(`  ('cpn-001', 'RAMADAN2026', 'percentage', 15.000, 1000.000, true, now() - interval '20 days', now() + interval '60 days', now()),`);
  lines.push(`  ('cpn-002', 'NEWGEAR100', 'fixed', 100.000, 1500.000, true, now() - interval '10 days', now() + interval '90 days', now()),`);
  lines.push(`  ('cpn-003', 'F1SPECIAL', 'percentage', 20.000, 3000.000, true, now() - interval '5 days', now() + interval '45 days', now()),`);
  lines.push(`  ('cpn-004', 'PRODUCERVIP', 'fixed', 250.000, 5000.000, true, now() - interval '1 day', now() + interval '120 days', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  // Delivery Vehicles
  lines.push(`INSERT INTO delivery.vehicle (id, plate, name, kind, notes, is_active, created_at, updated_at) VALUES`);
  lines.push(`  ('veh-01', '521990', 'Mercedes-Benz Sprinter 519 Camera Truck', 'van', 'Heavy camera package and lighting transport', true, now(), now()),`);
  lines.push(`  ('veh-02', '412033', 'Ford Transit Mobile Production Office', 'van', 'DIT on-set color grading workstation inside', true, now(), now()),`);
  lines.push(`  ('veh-03', '631899', 'Isuzu NPR 4.5-Ton Heavy Grip Truck', 'truck', 'C-stands, track, dollies and generator power', true, now(), now()),`);
  lines.push(`  ('veh-04', '719022', 'Toyota HiAce Crew Shuttle Van', 'van', 'Production crew transport (14 seats)', true, now(), now()),`);
  lines.push(`  ('veh-05', '881023', 'Toyota Land Cruiser 300 GR-Sport Scouting Unit', 'car', 'Desert and rugged terrain scouting vehicle', true, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`INSERT INTO delivery.delivery_zone (id, name_en, name_ar, areas, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES`);
  lines.push(`  ('dz-01', 'Capital Governorate (Manama & Seef)', 'محافظة العاصمة (المنامة والسيف)', '{"Manama", "Seef", "Juffair", "Sanabis"}', 5.000, 20.000, 100.000, true, 1, now(), now()),`);
  lines.push(`  ('dz-02', 'Northern Governorate (Saar & Budaiya)', 'المحافظة الشمالية (سار والبديع)', '{"Saar", "Budaiya", "Janabiya", "Jasra"}', 7.000, 20.000, 150.000, true, 2, now(), now()),`);
  lines.push(`  ('dz-03', 'Southern Governorate (Zallaq & Sakhir)', 'المحافظة الجنوبية (الزلاق والصخير)', '{"Zallaq", "Sakhir", "Riffa", "Durrat Al Bahrain"}', 10.000, 30.000, 200.000, true, 3, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  lines.push(`INSERT INTO delivery.delivery_slot (id, zone_id, weekday, slot_start, slot_end, capacity, is_active, created_at) VALUES`);
  lines.push(`  ('ds-01', 'dz-01', 1, '09:00', '13:00', 8, true, now()),`);
  lines.push(`  ('ds-02', 'dz-01', 1, '14:00', '18:00', 8, true, now()),`);
  lines.push(`  ('ds-03', 'dz-02', 2, '10:00', '15:00', 6, true, now()),`);
  lines.push(`  ('ds-04', 'dz-03', 3, '09:00', '14:00', 6, true, now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  lines.push(`INSERT INTO commerce.store_settings (id, currency, tax_inclusive, default_tax_rate, minimum_order_amount, free_shipping_threshold, guest_checkout, delivery_enabled, delivery_fee, free_delivery_over, pickup_enabled, cod_enabled, bank_transfer_enabled, bank_instructions_en, bank_instructions_ar, order_notify_email, payment_gateway, updated_at) VALUES`);
  lines.push(`  ('default', 'BHD', false, 10.000, 10.000, 150.000, true, true, 5.000, 150.000, true, true, true, 'Transfer to NBB Corporate IBAN BH42NBOB00000123456789 with order number in reference.', 'التحويل إلى حساب بنك البحرين الوطني مع كتابة رقم الطلب في المرجع.', ${sqlQuote(isIshoot ? "orders@ishoot.bh" : "orders@northwind.studio")}, 'benefit_pay', now())`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET currency = EXCLUDED.currency, default_tax_rate = EXCLUDED.default_tax_rate, updated_at = now();`);
  lines.push(`INSERT INTO commerce.customer_segment (id, name) VALUES ('seg-vip', 'Enterprise VIP'), ('seg-agency', 'Agency Partners'), ('seg-repeat', 'Frequent Renters'), ('seg-new', 'New Customers') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO commerce.store_region (id, code, name_en, name_ar, currency, default_language, branch_id, is_enabled, price_multiplier, settings) VALUES`);
  lines.push(`  ('reg-bh', 'BH', 'Bahrain', 'مملكة البحرين', 'BHD', 'en', 'br-hq', true, 1.000, '{"deliveryDays":1}'::jsonb),`);
  lines.push(`  ('reg-sa', 'SA', 'Saudi Arabia (Eastern Province)', 'المملكة العربية السعودية', 'BHD', 'ar', 'br-hq', true, 1.150, '{"deliveryDays":3}'::jsonb),`);
  lines.push(`  ('reg-ae', 'AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', 'BHD', 'en', 'br-hq', true, 1.150, '{"deliveryDays":3}'::jsonb)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO commerce.delivery_settings (id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at) VALUES ('default', 'own', 24, 'Asia/Bahrain', 7, 120, false, now()) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO delivery.delivery_settings (id, mode, sla_hours, time_zone, slot_days, lead_minutes, require_slot, updated_at) VALUES ('default', 'own', 24, 'Asia/Bahrain', 7, 120, false, now()) ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO commerce.delivery_zone (id, name_en, name_ar, fee, min_order, free_over, is_active, sort_order, created_at, updated_at) VALUES`);
  lines.push(`  ('dz-01', 'Capital Governorate (Manama & Seef)', 'محافظة العاصمة (المنامة والسيف)', 5.000, 20.000, 100.000, true, 1, now(), now()),`);
  lines.push(`  ('dz-02', 'Northern Governorate (Saar & Budaiya)', 'المحافظة الشمالية (سار والبديع)', 7.000, 20.000, 150.000, true, 2, now(), now()),`);
  lines.push(`  ('dz-03', 'Southern Governorate (Zallaq & Sakhir)', 'المحافظة الجنوبية (الزلاق والصخير)', 10.000, 30.000, 200.000, true, 3, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO commerce.delivery_slot (id, zone_id, weekday, start, "end", capacity, is_active, created_at) VALUES`);
  lines.push(`  ('ds-01', 'dz-01', 1, '09:00', '13:00', 8, true, now()),`);
  lines.push(`  ('ds-02', 'dz-01', 1, '14:00', '18:00', 8, true, now()),`);
  lines.push(`  ('ds-03', 'dz-02', 2, '10:00', '15:00', 6, true, now()),`);
  lines.push(`  ('ds-04', 'dz-03', 3, '09:00', '14:00', 6, true, now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);

  lines.push(`INSERT INTO commerce.retail_register (id, name, branch_id, is_active, code, revision, created_at, updated_at) VALUES`);
  lines.push(`  ('reg-seef-01', 'Seef HQ Studio Counter POS 1', 'br-hq', true, 'REG-SEEF-01', 1, now(), now()),`);
  lines.push(`  ('reg-stage-01', 'Soundstage A Gear Desk POS', 'br-stage', true, 'REG-STAGE-01', 1, now(), now()),`);
  lines.push(`  ('reg-vault-01', 'Equipment Vault Dispatch POS', 'br-vault', true, 'REG-VAULT-01', 1, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  for (let sh = 0; sh < 5; sh++) {
    const shId = `rshift-00${sh + 1}`;
    const regId = sh % 3 === 0 ? "reg-seef-01" : sh % 3 === 1 ? "reg-stage-01" : "reg-vault-01";
    const isClosed = sh < 4;
    const cashSales = 320 + sh * 85;
    const cardSales = 640 + sh * 140;
    const startCash = 100;
    lines.push(`INSERT INTO commerce.retail_shift (id, register_id, cashier_id, opened_at, closed_at, starting_cash, closing_cash, expected_cash, status)`);
    lines.push(`VALUES (${sqlQuote(shId)}, ${sqlQuote(regId)}, ${sh % 2 === 0 ? "'faisal-mansour'" : "'sami-khoury'"}, now() - interval '${(4 - sh) * 24 + 9} hours', ${isClosed ? `now() - interval '${(4 - sh) * 24 + 1} hours'` : "NULL"}, ${startCash.toFixed(3)}, ${isClosed ? (startCash + cashSales).toFixed(3) : "0.000"}, ${(startCash + cashSales).toFixed(3)}, ${sqlQuote(isClosed ? "closed" : "open")})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    if (isClosed) {
      lines.push(`INSERT INTO commerce.retail_closing (id, shift_id, closing_date, total_sales, total_cash, total_card, notes, branch_id, level, target_id, business_date, closed_at, closed_by_id, total_returns, total_other, cash_variance, snapshot, signature, journal_id, status, revision)`);
      lines.push(`VALUES (${sqlQuote(`rclose-00${sh + 1}`)}, ${sqlQuote(shId)}, (CURRENT_DATE - INTERVAL '${4 - sh} days')::date, ${(cashSales + cardSales).toFixed(3)}, ${cashSales.toFixed(3)}, ${cardSales.toFixed(3)}, 'End of day Z-report balanced & deposited', 'br-hq', 'register', ${sqlQuote(regId)}, CURRENT_DATE - interval '${4 - sh} days', now() - interval '${(4 - sh) * 24 + 1} hours', 'faisal-mansour', 0.000, 0.000, 0.000, ${sqlQuote({ register: regId, transactions: 7 + sh })}, 'faisal-mansour:z-sign', ${sqlQuote(`je-2026-00${sh + 1}`)}, 'closed', 1)`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }

  lines.push(`INSERT INTO delivery.courier_agency (id, name, contact_name, email, phone, api_endpoint, is_active, created_at) VALUES`);
  lines.push(`  ('cag-aramex', 'Aramex Bahrain Logistics', 'Hassan Al-Doseri', 'dispatch@aramex.bh', '+97317339000', 'https://ws.aramex.net/ShippingAPI.V2', true, now()),`);
  lines.push(`  ('cag-dhl', 'DHL Express GCC', 'Tariq Janahi', 'bh-express@dhl.com', '+97317364100', 'https://express.api.dhl.com/mydhlapi', true, now()),`);
  lines.push(`  ('cag-fleet', 'iShoot Direct Studio Fleet', 'Karim Fawzi', ${sqlQuote(isIshoot ? "fleet@ishoot.bh" : "fleet@northwind.studio")}, '+97317008811', NULL, true, now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  for (let rs = 0; rs < 5; rs++) {
    const rStatus = rs < 3 ? "completed" : rs === 3 ? "in_progress" : "draft";
    lines.push(`INSERT INTO delivery.route_sheet (id, number, driver_id, vehicle_id, status, run_date, created_at, updated_at)`);
    lines.push(`VALUES ('rs-00${rs + 1}', 'RS-2026-00${rs + 1}', 'karim-fawzi', 'veh-0${(rs % 5) + 1}', ${sqlQuote(rStatus)}, (CURRENT_DATE - INTERVAL '${4 - rs} days')::date, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (let oi = 0; oi < 25; oi++) {
    const cust = customers[oi % customers.length];
    const addr = addresses[oi % addresses.length];
    const p1 = productList[(oi * 2) % productList.length];
    const p2 = productList[(oi * 2 + 1) % productList.length];
    const sub = p1.price * 2 + p2.price;
    const disc = oi % 5 === 0 ? Math.round(sub * 0.1 * 1000) / 1000 : 0;
    const vat = Math.round((sub - disc) * 0.1 * 1000) / 1000;
    const delFee = oi % 4 === 3 ? 0 : (sub > 150 ? 0 : 5);
    const total = Math.round((sub - disc + vat + delFee) * 1000) / 1000;
    const ordStatus = oi < 12 ? "delivered" : oi < 16 ? "shipped" : oi < 20 ? "placed" : oi < 23 ? "placed" : "cancelled";
    const payStatus = oi < 20 ? "paid" : oi < 23 ? "unpaid" : "refunded";
    const channel = oi % 3 === 0 ? "online" : oi % 3 === 1 ? "pos" : "phone";
    const method = oi % 4 === 0 ? "benefit_pay" : oi % 4 === 1 ? "credit_card" : oi % 4 === 2 ? "bank_transfer" : "cod";
    const fulfil = oi % 5 === 4 ? "pickup" : "delivery";
    const ordId = `ord-${String(oi + 1).padStart(3, "0")}`;
    const ordNum = `ORD-2026-${String(1001 + oi)}`;
    const daysAgo = 30 - oi;
    const shipJson = { line1: addr.line1, city: addr.city, state: addr.state, country: "BH", postalCode: addr.postal_code };

    lines.push(`INSERT INTO commerce.sales_order (id, number, customer_id, contact_id, email, name, phone, channel, status, payment_status, payment_method, fulfilment, shipping_address, subtotal, discount_amount, coupon_code, vat_amount, delivery_fee, total, amount_paid, amount_refunded, currency, locale, note, warehouse_id, invoice_id, created_by_id, placed_at, paid_at, shipped_at, delivered_at, cancelled_at, utm_campaign, utm_source, utm_medium, updated_at)`);
    lines.push(`VALUES (${sqlQuote(ordId)}, ${sqlQuote(ordNum)}, ${sqlQuote(cust.id)}, NULL, ${sqlQuote(cust.email)}, ${sqlQuote(`${cust.first_name} ${cust.last_name}`)}, ${sqlQuote(cust.phone)}, ${sqlQuote(channel)}, ${sqlQuote(ordStatus)}, ${sqlQuote(payStatus)}, ${sqlQuote(method)}, ${sqlQuote(fulfil)}, ${sqlQuote(shipJson)}, ${sub.toFixed(3)}, ${disc.toFixed(3)}, ${disc > 0 ? "'RAMADAN2026'" : "NULL"}, ${vat.toFixed(3)}, ${delFee.toFixed(3)}, ${total.toFixed(3)}, ${payStatus === "paid" ? total.toFixed(3) : "0.000"}, ${payStatus === "refunded" ? total.toFixed(3) : "0.000"}, 'BHD', ${oi % 2 === 0 ? "'en'" : "'ar'"}, 'Storefront checkout verified', ${sqlQuote(primaryWhId)}, NULL, 'sami-khoury', now() - interval '${daysAgo} days', ${payStatus === "paid" ? `now() - interval '${daysAgo} days' + interval '5 minutes'` : "NULL"}, ${ordStatus === "shipped" || ordStatus === "delivered" ? `now() - interval '${Math.max(1, daysAgo - 1)} days'` : "NULL"}, ${ordStatus === "delivered" ? `now() - interval '${Math.max(0, daysAgo - 2)} days'` : "NULL"}, ${ordStatus === "cancelled" ? `now() - interval '${daysAgo} days' + interval '2 hours'` : "NULL"}, ${disc > 0 ? "'ramadan-tvc'" : "NULL"}, ${channel === "online" ? "'direct'" : "NULL"}, ${channel === "online" ? "'web'" : "NULL"}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO commerce.sales_order_line (id, order_id, product_id, variant_key, sku, description, quantity, unit_price, vat_exempt, line_total, location_id, returned_quantity, sort_order) VALUES`);
    lines.push(`  (${sqlQuote(`ol-${ordId}-1`)}, ${sqlQuote(ordId)}, ${sqlQuote(`prod-${p1.sku.toLowerCase()}`)}, '', ${sqlQuote(p1.sku)}, ${sqlQuote(p1.en)}, 2.000, ${p1.price.toFixed(3)}, false, ${(p1.price * 2).toFixed(3)}, ${sqlQuote(primaryLocId)}, 0.000, 1),`);
    lines.push(`  (${sqlQuote(`ol-${ordId}-2`)}, ${sqlQuote(ordId)}, ${sqlQuote(`prod-${p2.sku.toLowerCase()}`)}, '', ${sqlQuote(p2.sku)}, ${sqlQuote(p2.en)}, 1.000, ${p2.price.toFixed(3)}, false, ${p2.price.toFixed(3)}, ${sqlQuote(primaryLocId)}, 0.000, 2)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    lines.push(`INSERT INTO commerce.sales_order_event (id, order_id, kind, status, note, amount, by_id, created_at) VALUES`);
    lines.push(`  (${sqlQuote(`oe-${ordId}-1`)}, ${sqlQuote(ordId)}, 'placed', 'placed', 'Order submitted through ${channel}', ${total.toFixed(3)}, 'sami-khoury', now() - interval '${daysAgo} days'),`);
    lines.push(`  (${sqlQuote(`oe-${ordId}-2`)}, ${sqlQuote(ordId)}, ${sqlQuote(ordStatus === "cancelled" ? "cancelled" : "status_update")}, ${sqlQuote(ordStatus)}, 'Lifecycle updated to ${ordStatus}', ${total.toFixed(3)}, 'karim-fawzi', now() - interval '${Math.max(0, daysAgo - 1)} days')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    if (oi < 18) {
      const shStatus = oi < 11 ? "delivered" : oi < 15 ? "assigned" : "pending";
      const shpId = `shp-${String(oi + 1).padStart(3, "0")}`;
      const zId = `dz-0${(oi % 3) + 1}`;
      const rsId = `rs-00${(oi % 5) + 1}`;
      lines.push(`INSERT INTO delivery.shipment (id, number, order_id, status, method, zone_id, slot_id, slot_date, slot_start, slot_end, promised_by, recipient_name, recipient_phone, address, cod_amount, cod_collected, tracking_token, attempts, failure_reason, out_at, delivered_at, driver_id, vehicle_id, route_sheet_id, route_stop, proof_photo_url, proof_signature, agency_id, tracking_number, created_at, updated_at)`);
      lines.push(`VALUES (${sqlQuote(shpId)}, ${sqlQuote(`SHP-2026-${String(101 + oi)}`)}, ${sqlQuote(ordId)}, ${sqlQuote(shStatus)}, 'own', ${sqlQuote(zId)}, 'ds-01', (CURRENT_DATE - INTERVAL '${Math.max(0, daysAgo - 1)} days')::date, '09:00', '13:00', now() - interval '${Math.max(0, daysAgo - 1)} days', ${sqlQuote(`${cust.first_name} ${cust.last_name}`)}, ${sqlQuote(cust.phone)}, ${sqlQuote(shipJson)}, ${method === "cod" ? total.toFixed(3) : "0.000"}, ${method === "cod" && shStatus === "delivered" ? total.toFixed(3) : "0.000"}, ${sqlQuote(`trk-${shpId}-bh2026`)}, 1, NULL, ${shStatus !== "pending" ? `now() - interval '${Math.max(0, daysAgo - 1)} days'` : "NULL"}, ${shStatus === "delivered" ? `now() - interval '${Math.max(0, daysAgo - 2)} days'` : "NULL"}, 'karim-fawzi', 'veh-0${(oi % 5) + 1}', ${sqlQuote(rsId)}, ${(oi % 5) + 1}, NULL, ${shStatus === "delivered" ? "'signed:recipient'" : "NULL"}, 'cag-fleet', ${sqlQuote(`ISH-FL-${7001 + oi}`)}, now(), now())`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
      lines.push(`INSERT INTO delivery.shipment_event (id, shipment_id, status, reason, note, by_id, at) VALUES`);
      lines.push(`  (${sqlQuote(`she-${shpId}-1`)}, ${sqlQuote(shpId)}, 'pending', NULL, 'Shipment created for order ${ordNum}', 'karim-fawzi', now() - interval '${daysAgo} days'),`);
      lines.push(`  (${sqlQuote(`she-${shpId}-2`)}, ${sqlQuote(shpId)}, ${sqlQuote(shStatus)}, NULL, 'Dispatch status updated to ${shStatus}', 'karim-fawzi', now() - interval '${Math.max(0, daysAgo - 1)} days')`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  for (let cs = 0; cs < 4; cs++) {
    lines.push(`INSERT INTO delivery.cod_settlement (id, sheet_id, driver_id, amount_collected, amount_settled, status, settled_at, created_at)`);
    lines.push(`VALUES ('cod-00${cs + 1}', 'rs-00${cs + 1}', 'karim-fawzi', ${(180 + cs * 95).toFixed(3)}, ${(180 + cs * 95).toFixed(3)}, ${cs < 3 ? "'settled'" : "'pending'"}, ${cs < 3 ? `now() - interval '${3 - cs} days'` : "NULL"}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 10. WORKFLOW SERVICE (Tasks, Calendar Events, Letter Templates)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const t of tasks) {
    const emp = baseEmployees[t.empIdx % baseEmployees.length];
    lines.push(`INSERT INTO workflow.task (id, title, description, assigned_to, due_date, priority, status, related_entity_type, related_entity_id, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(t.id)}, ${sqlQuote(t.title)}, ${sqlQuote(t.title)}, ${sqlQuote(emp.id)}, (CURRENT_DATE + INTERVAL '${-t.dueAgo} days')::date, ${sqlQuote(t.priority)}, ${sqlQuote(t.status)}, 'production', 'proj-main', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const ev of calendarEvents) {
    const emp = baseEmployees[ev.empIdx % baseEmployees.length];
    lines.push(`INSERT INTO workflow.calendar_event (id, title, description, start_time, end_time, organizer_id, event_type, location, is_all_day, created_at)`);
    lines.push(`VALUES (${sqlQuote(ev.id)}, ${sqlQuote(ev.title)}, ${sqlQuote(ev.desc)}, (CURRENT_DATE - INTERVAL '${ev.startAgo} days' + TIME '09:00:00')::timestamptz, (CURRENT_DATE - INTERVAL '${ev.startAgo} days' + TIME '09:00:00' + INTERVAL '${ev.durationHours} hours')::timestamptz, ${sqlQuote(emp.id)}, 'production', ${sqlQuote(ev.loc)}, false, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  lines.push(`INSERT INTO workflow.letter_template (id, name_en, name_ar, template_body, sort_order) VALUES`);
  lines.push(`  ('lt-01', 'Employment & Salary Certificate', 'شهادة راتب وعمل', 'This is to certify that {{employee_name}} is employed at {{company_name}} with monthly salary {{salary}}.', 1),`);
  lines.push(`  ('lt-02', 'Quotation Official Cover Letter', 'خطاب تقديم عرض أسعار', 'We are pleased to submit our commercial quotation {{quotation_number}} for your review.', 2),`);
  lines.push(`  ('lt-03', 'Equipment Vault Release Handover Form', 'إقرار استلام وتسليم معدات تصوير', 'The undersigned acknowledges receipt of camera packages listed in voucher {{voucher_number}} in pristine condition.', 3)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`INSERT INTO workflow.minute_of_meeting (id, mom_number, title, meeting_date, attendees, discussion, action_items, status, created_at) VALUES`);
  lines.push(`  ('mom-001', 'MOM-2026-001', 'Delta Energies Commercial Film - Refinery Safety & Offshore Production Alignment', '2026-02-15', ARRAY['Omar Haddad (CEO)', 'Karim Fawzi (Production Manager)', 'Reem Al Hashimi (Corporate Comms Lead)', 'Adel Rashed (HSE Director)'], 'Refinery filming safety permits & PPE certification approved. ATEX-rated camera housings verified. Helicopter Cineflex unit scheduled for offshore sweep on March 2nd.', 'Submit crew passport copies for badges; Complete sensor calibration; Deliver 3D previz for offshore tank sequence.', 'approved', '2026-02-15 14:00:00+00'),`);
  lines.push(`  ('mom-002', 'MOM-2026-002', 'Gulfwave 5G Launch Campaign - Post-Production Review & VFX Alignment', '2026-03-05', ARRAY['Yusuf Rahman (Creative Director)', 'Noor Hamdan (Post Supervisor)', 'Nasser Al Khalifa (Brand GM)'], 'Reviewed Rough Cut V2. Commended fast-paced transitions and Bahrain skyline grade. Holographic UI elements approved for final compositing.', 'Incorporate localized Arabic calligraphy end-frame title; Export broadcast-spec MXF files for Bahrain TV transmission.', 'approved', '2026-03-05 15:30:00+00'),`);
  lines.push(`  ('mom-003', 'MOM-2026-003', 'Q2 Studio Equipment Expansion & Virtual Production CapEx Review', '2026-03-20', ARRAY['Omar Haddad (CEO)', 'Layla Nasser (Finance Manager)', 'Karim Fawzi (Production Manager)'], 'Demand for car commercial virtual staging increased by 40%. Evaluated Stage B LED wall conversion with 2.6mm pitch panels. Cooke Full Frame Anamorphic set approved.', 'Finalize vendor RFQ for LED display panels; Prepare CapEx depreciation and tax amortisation schedule.', 'in_review', '2026-03-20 12:30:00+00')`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, attendees = EXCLUDED.attendees, discussion = EXCLUDED.discussion, action_items = EXCLUDED.action_items, status = EXCLUDED.status;`);
  lines.push(``);

  lines.push(`INSERT INTO workflow.official_letter (id, letter_number, template_id, recipient_name, recipient_title, subject, body, status, issued_at, created_at) VALUES`);
  lines.push(`  ('let-001', 'LET-2026-001', 'lt-01', 'Ali Al-Arrayed', 'Managing Director & Executive Producer', 'Certificate of Employment & Executive Salary Confirmation', 'This official certificate confirms that Mr. Ali Al-Arrayed is currently employed at iShoot Media Production W.L.L as Managing Director & Executive Producer under Commercial Registration No. 104829-1.', 'issued', '2026-01-15 10:00:00+00', '2026-01-15 09:00:00+00'),`);
  lines.push(`  ('let-002', 'LET-2026-002', 'lt-02', 'Bahrain International Circuit (BIC)', 'Commercial Partnerships Director', 'Official Quotation Cover Letter - Formula 1 Bahrain GP 2026 Production Package', 'We are delighted to submit our comprehensive commercial quotation QTE-2026-001 for high-speed cinema camera operations, helicopter Cineflex coverage, and daily digital dailies turnarounds during the Formula 1 Gulf Air Bahrain Grand Prix 2026.', 'issued', '2026-02-01 11:30:00+00', '2026-02-01 11:00:00+00'),`);
  lines.push(`  ('let-003', 'LET-2026-003', 'lt-03', 'Karim Fawzi', 'Senior Production Manager', 'Equipment Vault Custody Transfer - Cinema Camera Packages', 'The undersigned hereby takes custody of Sony FX6 Cinema line package (AST-001) and Canon C70 package (AST-003) with associated Cooke anamorphic primes for the upcoming television commercial shoot.', 'draft', NULL, '2026-03-01 08:30:00+00')`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET letter_number = EXCLUDED.letter_number, recipient_name = EXCLUDED.recipient_name, recipient_title = EXCLUDED.recipient_title, subject = EXCLUDED.subject, body = EXCLUDED.body, status = EXCLUDED.status, issued_at = EXCLUDED.issued_at;`);

  const approvalSpecs = [
    { id: "apr-001", kind: "purchase_order", entity: "po-001", req: "karim-fawzi", st: "approved", prio: "high", reason: "Replenish V-Mount battery & monitor inventory ahead of F1 weekend" },
    { id: "apr-002", kind: "expense", entity: "exp-001", req: "tariq-saleh", st: "approved", prio: "normal", reason: "Anamorphic prime lens sub-lease for telecom commercial" },
    { id: "apr-003", kind: "leave", entity: "lr-009", req: "sami-khoury", st: "pending", prio: "normal", reason: "Scheduled annual leave coverage handoff prepared" },
    { id: "apr-004", kind: "discount", entity: "qte-004", req: "sami-khoury", st: "approved", prio: "high", reason: "10% multi-day studio bundle retainer concession" },
    { id: "apr-005", kind: "budget", entity: "cmp-004", req: "hana-yousef", st: "pending", prio: "high", reason: "Virtual production showcase launch event hospitality budget" },
    { id: "apr-006", kind: "purchase_order", entity: "po-007", req: "karim-fawzi", st: "pending", prio: "normal", reason: "Fiber optic SDI drum expansion" },
    { id: "apr-007", kind: "expense", entity: "exp-012", req: "layla-nasser", st: "approved", prio: "high", reason: "Annual external VAT & financial audit fee" },
    { id: "apr-008", kind: "leave", entity: "lr-010", req: "tariq-saleh", st: "rejected", prio: "low", reason: "Overlaps with BIC track shoot; rescheduled by mutual agreement" },
  ];
  for (const ap of approvalSpecs) {
    lines.push(`INSERT INTO workflow.approval_request (id, kind, entity_id, requester_id, status, priority, reason, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(ap.id)}, ${sqlQuote(ap.kind)}, ${sqlQuote(ap.entity)}, ${sqlQuote(ap.req)}, ${sqlQuote(ap.st)}, ${sqlQuote(ap.prio)}, ${sqlQuote(ap.reason)}, now() - interval '7 days', now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    if (ap.st !== "pending") {
      lines.push(`INSERT INTO workflow.approval_decision (id, request_id, approver_id, decision, comments, decided_at)`);
      lines.push(`VALUES (${sqlQuote(`apd-${ap.id}`)}, ${sqlQuote(ap.id)}, 'omar-haddad', ${sqlQuote(ap.st)}, ${sqlQuote(ap.st === "approved" ? "Approved within Q4 operating delegation." : "Deferred to post-event window.")}, now() - interval '5 days')`);
      lines.push(`ON CONFLICT (id) DO NOTHING;`);
    }
  }
  for (let sr = 0; sr < 6; sr++) {
    const isSigned = sr < 4;
    lines.push(`INSERT INTO workflow.signature_request (id, title, document_type, document_id, requested_from, status, signature_url, signed_at, expires_at, created_at)`);
    lines.push(`VALUES ('sig-00${sr + 1}', ${sqlQuote(sr % 2 === 0 ? `Client Production Agreement #${sr + 1}` : `Equipment Custody Release #${sr + 1}`)}, ${sqlQuote(sr % 2 === 0 ? "quotation" : "official_letter")}, ${sqlQuote(sr % 2 === 0 ? `qte-00${sr + 1}` : `let-00${(sr % 3) + 1}`)}, ${sqlQuote(contacts[sr].email)}, ${sqlQuote(isSigned ? "signed" : "pending")}, ${isSigned ? "'/api/files/brand/signature_28e82e5cdb91.png'" : "NULL"}, ${isSigned ? `now() - interval '${10 - sr} days'` : "NULL"}, now() + interval '30 days', now() - interval '12 days')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 11. CMS SERVICE (Pages, Articles, FAQs, Statistics, Reviews, Portfolio, Social, Snapshot)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const page of pages) {
    lines.push(`INSERT INTO cms.page (id, slug, page_type, title_en, title_ar, blocks, is_visible, in_header, in_footer, sort_order, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(page.id)}, ${sqlQuote(page.slug)}, ${sqlQuote(page.page_type)}, ${sqlQuote(page.title_en)}, ${sqlQuote(page.title_ar)}, ${sqlJson(page.blocks)}, ${page.is_visible ? "true" : "false"}, ${page.in_header ? "true" : "false"}, false, ${page.sort_order}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  for (const art of articles) {
    lines.push(`INSERT INTO cms.article (id, slug, title_en, title_ar, excerpt_en, excerpt_ar, category, tags, author_name, status, featured, publish_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(art.id)}, ${sqlQuote(art.slug)}, ${sqlQuote(art.title_en)}, ${sqlQuote(art.title_ar)}, ${sqlQuote(art.excerpt_en)}, ${sqlQuote(art.excerpt_ar)}, ${sqlQuote(art.category)}, ${sqlQuote(art.tags)}, 'iShoot Editorial Team', 'published', ${art.featured ? "true" : "false"}, now(), now(), now())`);
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

  lines.push(`INSERT INTO cms.portfolio_category (id, slug, name_en, name_ar, display_order) VALUES`);
  lines.push(`  ('pcat-tvc', 'commercial-tvc', 'Commercial & Broadcast', 'الأفلام الإعلانية والتلفزيونية', 1),`);
  lines.push(`  ('pcat-doc', 'documentaries', 'Corporate Documentaries', 'الأفلام الوثائقية المؤسسية', 2),`);
  lines.push(`  ('pcat-events', 'live-events', 'Motorsport & Live Broadcast', 'الفعاليات الرياضية والبث المباشر', 3),`);
  lines.push(`  ('pcat-brand', 'brand-campaigns', 'Luxury & Brand Storytelling', 'حملات العلامات التجارية الفاخرة', 4)`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  const portItems = [
    { id: "pit-01", cat: "pcat-events", slug: "bic-f1-night-race", en: "Formula 1 Bahrain Night Race Cinema Reel", ar: "فيلم سباق فورمولا 1 الليلي البحرين", client: "Bahrain International Circuit", yr: 2026, loc: "Sakhir, Bahrain" },
    { id: "pit-02", cat: "pcat-tvc", slug: "falcon-air-fleet", en: "Falcon Airways Dreamliner Fleet Master", ar: "الفيلم الرسمي لأسطول طيران الخليج", client: "Falcon Airways", yr: 2026, loc: "Manama & London" },
    { id: "pit-03", cat: "pcat-doc", slug: "bapco-solar-horizon", en: "Bapco Energies Clean Horizon Documentary", ar: "وثائقي الطاقة النظيفة بابكو", client: "Bapco Energies", yr: 2026, loc: "Awali, Bahrain" },
    { id: "pit-04", cat: "pcat-brand", slug: "marassi-pearls-campaign", en: "Marassi Waterfront Architectural Film", ar: "الحملة المعمارية لواجهة مراسي البحرين", client: "Eagle Hills Bahrain", yr: 2026, loc: "Diyar Al Muharraq" },
    { id: "pit-05", cat: "pcat-tvc", slug: "stc-5g-ramadan", en: "STC 5G Standalone Ramadan Anthem", ar: "إعلان STC رمضان 5G", client: "STC Bahrain", yr: 2026, loc: "Soundstage A, Seef" },
    { id: "pit-06", cat: "pcat-events", slug: "ewb-tech-summit", en: "Exhibition World Global Tech Summit Live", ar: "تغطية القمة التقنية مركز المعارض العالمي", client: "Exhibition World Bahrain", yr: 2026, loc: "Sakhir Hall 1" },
  ];
  for (const pi of portItems) {
    lines.push(`INSERT INTO cms.portfolio_item (id, category_id, slug, title_en, title_ar, client_name, year, subtitle_en, subtitle_ar, price, price_note_en, price_note_ar, location, external_url)`);
    lines.push(`VALUES (${sqlQuote(pi.id)}, ${sqlQuote(pi.cat)}, ${sqlQuote(pi.slug)}, ${sqlQuote(pi.en)}, ${sqlQuote(pi.ar)}, ${sqlQuote(pi.client)}, ${pi.yr}, 'Shot on ARRI Alexa 35 & Cooke Anamorphic Primes', 'تصوير بكاميرات ARRI Alexa 35 وعدسات سينمائية', 6500.000, 'Turnkey Production Package', 'باقة إنتاج متكاملة', ${sqlQuote(pi.loc)}, NULL)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO cms.social_link (id, platform, url, icon, is_active, display_order, created_at, updated_at) VALUES`);
  lines.push(`  ('soc-ig', 'instagram', 'https://instagram.com/ishoot.bh', 'instagram', true, 1, now(), now()),`);
  lines.push(`  ('soc-yt', 'youtube', 'https://youtube.com/@ishootbh', 'youtube', true, 2, now(), now()),`);
  lines.push(`  ('soc-vm', 'vimeo', 'https://vimeo.com/ishootbh', 'video', true, 3, now(), now()),`);
  lines.push(`  ('soc-li', 'linkedin', 'https://linkedin.com/company/ishoot-bh', 'linkedin', true, 4, now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  for (let sp = 0; sp < 4; sp++) {
    const plat = sp % 2 === 0 ? "instagram" : "youtube";
    lines.push(`INSERT INTO cms.social_post (id, platform, external_id, source_provider, source_account_id, caption, media_type, permalink, thumbnail_url, published_at, likes, comments, shares, views, reach, saves, fetched_at, created_at)`);
    lines.push(`VALUES ('spst-00${sp + 1}', ${sqlQuote(plat)}, 'ext-post-00${sp + 1}', 'meta_graph', 'acct-01', 'Behind the scenes on Soundstage A lighting grid calibration with Aputure 600c Pro fixtures.', 'video', 'https://instagram.com/p/demo00${sp + 1}', '/api/files/brand/logo-light_dbf1f2e280f5.png', now() - interval '${(sp + 1) * 5} days', ${420 + sp * 110}, ${32 + sp * 8}, ${18 + sp * 5}, ${8400 + sp * 2100}, ${6800 + sp * 1500}, ${95 + sp * 20}, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO cms.social_metric (id, platform, metric_type, value, source_provider, source_account_id, recorded_at, is_stale, error_status, created_at)`);
    lines.push(`VALUES ('smet-00${sp + 1}', ${sqlQuote(plat)}, 'followers', ${18500 + sp * 1200}, 'meta_graph', 'acct-01', now() - interval '${sp} days', false, NULL, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO cms.social_content_plan (id, title, caption, media_url, scheduled_for, status, published_url, assignee_id, created_by_id, created_at, updated_at)`);
    lines.push(`VALUES ('scpl-00${sp + 1}', ${sqlQuote(`Studio BTS Reel #${sp + 1}`)}, 'Discover how our color grading theater masters Dolby Vision deliverables.', '/api/files/brand/logo-dark_50ae2cfc6efa.png', now() + interval '${sp + 3} days', ${sqlQuote(sp === 0 ? "published" : "scheduled")}, NULL, 'hana-yousef', 'hana-yousef', now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  lines.push(`INSERT INTO cms.content_snapshot (id, draft, published, revision, published_at, updated_at)`);
  lines.push(`VALUES ('main', ${sqlQuote(contentSnapshot.draft)}, ${sqlQuote(contentSnapshot.published)}, ${contentSnapshot.revision || 1}, now(), now())`);
  lines.push(`ON CONFLICT (id) DO UPDATE SET draft = EXCLUDED.draft, published = EXCLUDED.published, updated_at = now();`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 12. ITSM SERVICE (SLA Policies, Tickets, Comments, Assets, Support Programs)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`INSERT INTO itsm.sla_policy (priority, response_minutes, resolve_minutes, updated_by, updated_at) VALUES`);
  lines.push(`  ('critical', 30, 240, 'seed:sql', now()),`);
  lines.push(`  ('high', 120, 1440, 'seed:sql', now()),`);
  lines.push(`  ('normal', 480, 4320, 'seed:sql', now()),`);
  lines.push(`  ('low', 1440, 10080, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (priority) DO UPDATE SET response_minutes = EXCLUDED.response_minutes, resolve_minutes = EXCLUDED.resolve_minutes, updated_at = now();`);
  lines.push(``);

  for (let ti = 0; ti < itsmTickets.length; ti++) {
    const tkt = itsmTickets[ti];
    const resolSql = tkt.resolAgo !== null ? `(CURRENT_DATE - INTERVAL '${tkt.resolAgo} days')::timestamptz` : "NULL";
    const respSql = `(CURRENT_DATE - INTERVAL '${tkt.respAgo} days')::timestamptz`;
    const createdSql = `(CURRENT_DATE - INTERVAL '${tkt.createdAgo} days')::timestamptz`;

    lines.push(`INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(tkt.id)}, 'omar-haddad', 'Omar Haddad', 'omar-haddad@example.com', ${sqlQuote(tkt.cat)}, ${sqlQuote(tkt.sub)}, ${sqlQuote(tkt.prio)}, ${sqlQuote(tkt.status)}, ${sqlQuote(tkt.title)}, ${sqlQuote(tkt.desc)}, ${sqlQuote(tkt.ref)}, 'it-eng-001', 'IT Systems Engineer', ${respSql}, now() + interval '24 hours', ${respSql}, ${resolSql}, ${createdSql}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    const eventId = tkt.id.replace(/^70/, "7e");
    lines.push(`INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)`);
    lines.push(`VALUES (${sqlQuote(eventId)}, ${sqlQuote(tkt.id)}, 'staff', 'omar-haddad', 'status_change', 'in_progress', ${sqlQuote(tkt.status)}, '{"message": "Action logged in service desk"}'::jsonb, ${createdSql})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    const cmt1 = tkt.id.replace(/^70/, "7c");
    const cmt2 = tkt.id.replace(/^70/, "7d");
    lines.push(`INSERT INTO itsm.ticket_comment (id, ticket_id, author_realm, author_id, author_name, body, internal, created_at) VALUES`);
    lines.push(`  (${sqlQuote(cmt1)}, ${sqlQuote(tkt.id)}, 'staff', 'omar-haddad', 'Omar Haddad', 'Issue logged during active studio schedule; please prioritize diagnostics.', false, ${createdSql}),`);
    lines.push(`  (${sqlQuote(cmt2)}, ${sqlQuote(tkt.id)}, 'it', 'it-eng-001', 'IT Systems Engineer', 'Diagnostic check completed and telemetry captured on rack switch.', true, ${respSql})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO itsm.asset_category (id, code, name_en, name_ar) VALUES`);
  lines.push(`  ('acat-wkst', 'WORKSTATION', 'Editing & Grading Workstations', 'محطات المونتاج والتلوين'),`);
  lines.push(`  ('acat-nas', 'STORAGE', 'NAS & Archival Arrays', 'وحدات التخزين والشبكات'),`);
  lines.push(`  ('acat-net', 'NETWORK', '10GbE Switches & Wireless Links', 'مبدلات الشبكة والاتصال اللاسلكي'),`);
  lines.push(`  ('acat-mon', 'MONITOR', 'HDR Reference Monitors', 'شاشات المعايرة المرجعية')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  for (let ai = 0; ai < 8; ai++) {
    const emp = baseEmployees[ai % baseEmployees.length];
    const assetId = `ast-00${ai + 1}`;
    lines.push(`INSERT INTO itsm.asset (id, asset_tag, category_id, name, brand, model, serial_number, purchase_date, purchase_cost, currency, supplier, invoice_reference, warranty_until, condition, status, specs)`);
    lines.push(`VALUES (${sqlQuote(assetId)}, ${sqlQuote(`IT-TAG-${1001 + ai}`)}, ${sqlQuote(ai % 4 === 0 ? "acat-wkst" : ai % 4 === 1 ? "acat-nas" : ai % 4 === 2 ? "acat-net" : "acat-mon")}, ${sqlQuote(`Studio Worknode ${ai + 1}`)}, ${sqlQuote(ai % 2 === 0 ? "Apple" : "Synology")}, ${sqlQuote(ai % 2 === 0 ? "Mac Studio M2 Ultra" : "RS3621RPxs")}, ${sqlQuote(`C02ZN${9000 + ai}Q`)}, now() - interval '280 days', ${1450 + ai * 300}.000, 'BHD', 'Almoayyed Enterprise Systems', 'SUP-IT-2026', now() + interval '450 days', 'excellent', 'assigned', '{"ram":"128GB","nic":"10GbE"}'::jsonb)`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
    lines.push(`INSERT INTO itsm.asset_handover (id, reference, asset_id, employee_id, kind, status, handover_date, condition)`);
    lines.push(`VALUES ('ahov-00${ai + 1}', 'HOV-IT-00${ai + 1}', ${sqlQuote(assetId)}, ${sqlQuote(emp.id)}, 'issue', 'completed', now() - interval '250 days', 'excellent')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO itsm.support_program (id, code, name_en, name_ar, provider, claim_period_months, prorate, is_active, notes, created_at, updated_at) VALUES`);
  lines.push(`  ('sprg-tamkeen', 'TAMKEEN-WAGE', 'Tamkeen National Employment Support', 'دعم الأجور الوطني - تمكين', 'Tamkeen Labour Fund', 12, true, true, 'Active wage subsidy program for Bahraini creative & engineering hires.', now(), now()),`);
  lines.push(`  ('sprg-applecare', 'AC-ENT', 'AppleCare+ for Studio Enterprise', 'أبل كير للمؤسسات', 'Apple Authorized Bahrain', 36, false, true, 'Hardware rapid replacement coverage for all Mac Studio edit suites.', now(), now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO itsm.support_program_rule (id, program_id, effective_from, effective_to, wage_basis) VALUES`);
  lines.push(`  ('sprgr-01', 'sprg-tamkeen', now() - interval '180 days', now() + interval '540 days', 'basic_plus_allowances'),`);
  lines.push(`  ('sprgr-02', 'sprg-applecare', now() - interval '180 days', now() + interval '900 days', 'hardware_asset')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 13. NOTIFY, REALTIME & AUDIT SERVICES`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, caller, silent, deliver_at, created_at) VALUES`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'omar-haddad', 'finance', 'high', 'Invoice Payment Received', 'Payment of 14,500 BHD received from NBB for 65th Anniversary Film.', 'finance-svc', false, now() - interval '1 hour', now() - interval '1 hour'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'karim-fawzi', 'inventory', 'normal', 'Equipment Check-in Complete', 'ARRI Alexa 35 & Cooke lenses safely returned to Vault.', 'inventory-svc', false, now() - interval '3 hours', now() - interval '3 hours'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad3', 'staff', 'sami-khoury', 'sales', 'normal', 'New High-Value Deal Qualified', 'Toyota Land Cruiser Offroad TVC proposal requested by E.K. Kanoo.', 'sales-svc', false, now() - interval '5 hours', now() - interval '5 hours'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad4', 'staff', 'layla-nasser', 'hr', 'low', 'Monthly Payroll Run Processed', 'Payroll for October 2026 successfully disbursed to all 10 employees.', 'hr-svc', false, now() - interval '1 day', now() - interval '1 day'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad5', 'it', 'it-lead-001', 'itsm', 'high', 'Automated Backup Verified', 'Daily database & S3 snapshot checksum verified without errors.', 'system-svc', false, now() - interval '2 hours', now() - interval '2 hours')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO notify.preference (realm, user_id, muted_until, sound_enabled, sound, volume, popups_enabled, desktop_enabled, updated_at) VALUES`);
  lines.push(`  ('staff', 'omar-haddad', NULL, true, 'chime', 80, true, true, now()),`);
  lines.push(`  ('staff', 'layla-nasser', NULL, true, 'chime', 70, true, true, now()),`);
  lines.push(`  ('it', 'it-lead-001', NULL, true, 'ping', 90, true, true, now())`);
  lines.push(`ON CONFLICT (realm, user_id) DO NOTHING;`);
  lines.push(`INSERT INTO notify.category_setting (realm, user_id, category, muted, sound) VALUES`);
  lines.push(`  ('staff', 'omar-haddad', 'finance', false, true),`);
  lines.push(`  ('staff', 'omar-haddad', 'sales', false, true),`);
  lines.push(`  ('it', 'it-lead-001', 'itsm', false, true)`);
  lines.push(`ON CONFLICT (realm, user_id, category) DO NOTHING;`);
  for (let m = 0; m < 8; m++) {
    const chan = m % 3 === 2 ? "whatsapp" : "email";
    const mId = `91da75a0-0445-4b10-ad20-a6366b6a0a0${m + 1}`;
    const c = contacts[m % contacts.length];
    lines.push(`INSERT INTO notify.message (id, caller, idempotency_key, actor, channel, recipient, subject, body_text, body_html, status, attempts, provider, provider_id, last_error, created_at, updated_at, sent_at)`);
    lines.push(`VALUES (${sqlQuote(mId)}, ${sqlQuote(m % 2 === 0 ? "finance" : "commerce")}, ${sqlQuote(`seed-msg-${m + 1}`)}, 'system', ${sqlQuote(chan)}, ${sqlQuote(chan === "email" ? c.email : c.phone)}, ${sqlQuote(`Order & Invoice Dispatch Notification #${m + 1}`)}, 'Your official document and dispatch link have been issued cleanly.', '<p>Your official document and dispatch link have been issued cleanly.</p>', 'sent', 1, ${sqlQuote(chan === "email" ? "smtp" : "whatsapp-cloud")}, ${sqlQuote(`prov-msg-${100 + m}`)}, NULL, now() - interval '${8 - m} hours', now(), now() - interval '${8 - m} hours')`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO realtime.status (realm, user_id, status, message, expires_at, updated_at) VALUES`);
  lines.push(`  ('staff', 'omar-haddad', 'online', 'Reviewing Q4 studio schedule', now() + interval '8 hours', now()),`);
  lines.push(`  ('staff', 'yusuf-rahman', 'online', 'Directing Soundstage A shoot', now() + interval '6 hours', now()),`);
  lines.push(`  ('staff', 'layla-nasser', 'online', 'Monthly close & audit prep', now() + interval '8 hours', now()),`);
  lines.push(`  ('staff', 'karim-fawzi', 'busy', 'Dispatching camera fleet to Sakhir', now() + interval '4 hours', now()),`);
  lines.push(`  ('it', 'it-lead-001', 'online', 'Monitoring cluster telemetry', now() + interval '8 hours', now()),`);
  lines.push(`  ('it', 'it-eng-001', 'online', 'On-call platform reliability', now() + interval '8 hours', now())`);
  lines.push(`ON CONFLICT (realm, user_id) DO NOTHING;`);
  lines.push(`INSERT INTO realtime.status_window (id, realm, user_id, source, source_id, kind, starts_at, ends_at, updated_at) VALUES`);
  lines.push(`  ('80da75a0-0445-4b10-ad20-a6366b6a0a01', 'staff', 'karim-fawzi', 'calendar', 'evt-01', 'on_location', now() + interval '1 hour', now() + interval '9 hours', now()),`);
  lines.push(`  ('80da75a0-0445-4b10-ad20-a6366b6a0a02', 'staff', 'noor-hamdan', 'calendar', 'evt-08', 'grading_session', now() + interval '2 hours', now() + interval '6 hours', now()),`);
  lines.push(`  ('80da75a0-0445-4b10-ad20-a6366b6a0a03', 'it', 'it-eng-001', 'itsm', 'maint-01', 'maintenance_window', now() + interval '1 day', now() + interval '1 day' + interval '3 hours', now())`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  const auditEvents = [
    ["system.company.updated", "system", "company", "updated", "omar-haddad"],
    ["finance.invoice.issued", "finance", "invoice", "issued", "layla-nasser"],
    ["finance.payment.recorded", "finance", "payment", "recorded", "faisal-mansour"],
    ["commerce.order.placed", "commerce", "sales_order", "placed", "sami-khoury"],
    ["delivery.shipment.dispatched", "delivery", "shipment", "dispatched", "karim-fawzi"],
    ["inventory.stock_count.approved", "inventory", "stock_count", "approved", "omar-haddad"],
    ["hr.payroll_run.completed", "hr", "payroll_run", "completed", "layla-nasser"],
    ["workflow.approval.granted", "workflow", "approval_request", "approved", "omar-haddad"],
    ["cms.content_snapshot.published", "cms", "content_snapshot", "published", "hana-yousef"],
    ["itsm.backup.verified", "system", "backup_record", "verified", "it-lead-001"],
  ];
  for (let ae = 0; ae < auditEvents.length; ae++) {
    const [subj, svc, ent, verb, actor] = auditEvents[ae];
    const hexId = `a0da75a0-0445-4b10-ad20-a6366b6a0a${String(ae + 1).padStart(2, "0")}`;
    lines.push(`INSERT INTO audit.event (id, subject, service, entity, verb, actor, occurred_at, received_at, payload, trace_id)`);
    lines.push(`VALUES (${sqlQuote(hexId)}, ${sqlQuote(subj)}, ${sqlQuote(svc)}, ${sqlQuote(ent)}, ${sqlQuote(verb)}, ${sqlQuote(actor)}, now() - interval '${(10 - ae) * 3} hours', now() - interval '${(10 - ae) * 3} hours', ${sqlQuote({ source: "seed:sql", actor, entity: ent })}, ${sqlQuote(`tr-${ae + 1}-seed`)})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`COMMIT;`);
  lines.push(`-- End of SQL Seed`);

  return `${lines.join("\n")}\n`;
}

console.log("Writing seeds/sql/seed_ishoot.sql (with full expanded datasets)...");
const ishootTheme = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/ishoot/theme.json"), "utf8"));
const ishootCompanyJson = JSON.parse(fs.readFileSync(path.join(root, "seeds/assets/ishoot/company.json"), "utf8"));
const ishootSql = generateCompanySeedSql("ishoot", ishootCompanyJson.company, ishootTheme, ishootCompany.data);
fs.writeFileSync(path.join(root, "seeds/sql/seed_ishoot.sql"), ishootSql);
console.log("✓ seeds/sql/seed_ishoot.sql written.");

console.log("Writing seeds/sql/seed_northwind.sql (with full expanded datasets)...");
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

fs.writeFileSync(path.join(root, "seeds/seed.sql"), ishootSql);
console.log("✓ seeds/seed.sql written.");

// Clean minimal bootstrap SQL
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

-- Staff roles with hierarchy
INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES
  ('super_admin', 'Super Administrator', 'المسؤول العام', true, NULL, now(), 1),
  ('admin', 'Administrator', 'مدير النظام', true, 'super_admin', now(), 1),
  ('finance_manager', 'Finance Manager', 'المدير المالي', true, 'admin', now(), 1),
  ('operations_manager', 'Operations Manager', 'مدير العمليات', true, 'admin', now(), 1),
  ('project_lead', 'Project Lead', 'مدير المشروع', true, 'operations_manager', now(), 1),
  ('editor', 'Editor', 'محرر محتوى', true, 'project_lead', now(), 1),
  ('accountant', 'Accountant', 'محاسب', true, 'finance_manager', now(), 1),
  ('sales', 'Sales Specialist', 'أخصائي مبيعات', true, 'operations_manager', now(), 1),
  ('marketing', 'Marketing Specialist', 'أخصائي تسويق', true, 'operations_manager', now(), 1),
  ('viewer', 'Viewer', 'مراقب عام', true, 'admin', now(), 1)
ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;

-- IT roles with hierarchy
INSERT INTO identity.it_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES
  ('it_admin', 'IT Super Administrator', 'مدير تقنية المعلومات العام', true, NULL, now(), 1),
  ('it_manager', 'IT Operations Manager', 'مدير إدارة تقنية المعلومات', true, 'it_admin', now(), 1),
  ('it_lead', 'IT Team Lead', 'قائد فريق تقنية المعلومات', true, 'it_manager', now(), 1),
  ('it_engineer', 'IT Systems Engineer', 'مهندس أنظمة تقنية المعلومات', true, 'it_lead', now(), 1),
  ('it_worker', 'IT Operations Worker', 'أخصائي تشغيل تقنية المعلومات', true, 'it_lead', now(), 1),
  ('it_support', 'IT Support Specialist', 'دعم تقنية المعلومات', true, 'it_lead', now(), 1),
  ('it_auditor', 'IT Compliance Auditor', 'مدقق امتثال تقنية المعلومات', true, 'it_manager', now(), 1)
ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;

-- Seed IT and Staff Permissions from Database snapshot
${itPermissions.map((p) => `INSERT INTO identity.it_permission (id, role_id, resource, action, allowed, created_at) VALUES (${sqlQuote(p.id)}, ${sqlQuote(p.role_id)}, ${sqlQuote(p.resource)}, ${sqlQuote(p.action)}, true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;`).join("\n")}
${staffPermissions.map((p) => `INSERT INTO identity.staff_permission (id, role_id, resource, action, allowed, created_at) VALUES (${sqlQuote(p.id)}, ${sqlQuote(p.role_id)}, ${sqlQuote(p.resource)}, ${sqlQuote(p.action)}, true, now()) ON CONFLICT (role_id, resource, action) DO NOTHING;`).join("\n")}

-- Bootstrap Accounts Note:
-- First bootstrap accounts (BA0001 in staff realm, IT0001 in it realm) are provisioned
-- and authenticated exclusively from environment variables (.env) with MFA disabled on launch.
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES
  ('it', 'it-manager-001', 'it-manager@example.com', 'IT0002', '${DEFAULT_PASSWORD_HASH}', '{"it_manager"}', true, false, NULL, now(), now()),
  ('it', 'it-lead-001', 'it-lead@example.com', 'IT0003', '${DEFAULT_PASSWORD_HASH}', '{"it_lead"}', true, false, 'it-manager-001', now(), now()),
  ('it', 'it-eng-001', 'it-engineer@example.com', 'IT0004', '${DEFAULT_PASSWORD_HASH}', '{"it_engineer"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-work-001', 'it-worker@example.com', 'IT0005', '${DEFAULT_PASSWORD_HASH}', '{"it_worker"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-supp-001', 'it-support@example.com', 'IT0006', '${DEFAULT_PASSWORD_HASH}', '{"it_support"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-audit-001', 'it-auditor@example.com', 'IT0007', '${DEFAULT_PASSWORD_HASH}', '{"it_auditor"}', true, false, 'it-manager-001', now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();

-- Default modules (18 feature modules)
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
  ('notifications', true, 'bootstrap', now()),
  ('legal', true, 'bootstrap', now()),
  ('marketing', true, 'bootstrap', now()),
  ('pr', true, 'bootstrap', now()),
  ('tasks', true, 'bootstrap', now())
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

// Distinct Activity Preset SQL files
const ALL_PRESET_MODULES = [
  "crm_deals", "invoicing", "calendar", "equipment", "cms", "reviews",
  "products", "procurement", "store", "delivery", "hr_payroll", "itsm",
  "audit_trail", "notifications", "legal", "marketing", "pr", "tasks",
];
const PRESET_DEFINITIONS = {
  media: {
    activity: "media",
    stylePreset: "cinematic",
    heroStyle: "cinematic",
    collection: { slug: "works", layout: "media", fields: ["client", "year", "video", "credits", "gallery"] },
    enabled: ["crm_deals", "invoicing", "calendar", "equipment", "cms", "reviews", "products", "hr_payroll", "itsm", "audit_trail", "notifications", "tasks", "marketing", "pr", "legal"],
  },
  products: {
    activity: "products",
    stylePreset: "fresh",
    heroStyle: "split",
    collection: { slug: "products", layout: "product", fields: ["subtitle", "price", "attributes", "externalUrl", "gallery"] },
    enabled: ["crm_deals", "invoicing", "cms", "reviews", "products", "procurement", "store", "delivery", "hr_payroll", "itsm", "audit_trail", "notifications", "tasks"],
  },
  commerce: {
    activity: "online_store",
    stylePreset: "market",
    heroStyle: "split",
    collection: { slug: "shop", layout: "product", fields: ["subtitle", "price", "attributes", "gallery"] },
    enabled: ["invoicing", "cms", "reviews", "products", "procurement", "store", "delivery", "hr_payroll", "itsm", "audit_trail", "notifications", "marketing"],
  },
  services: {
    activity: "services",
    stylePreset: "corporate",
    heroStyle: "split",
    collection: { slug: "projects", layout: "case", fields: ["client", "year", "subtitle", "attributes", "gallery"] },
    enabled: ["crm_deals", "invoicing", "calendar", "cms", "reviews", "hr_payroll", "itsm", "audit_trail", "notifications", "tasks", "legal"],
  },
  food: {
    activity: "food",
    stylePreset: "friendly",
    heroStyle: "cinematic",
    collection: { slug: "menu", layout: "product", fields: ["subtitle", "price", "attributes", "gallery"] },
    enabled: ["invoicing", "calendar", "cms", "reviews", "products", "procurement", "store", "delivery", "hr_payroll", "itsm", "audit_trail", "notifications"],
  },
  agency: {
    activity: "agency",
    stylePreset: "modern",
    heroStyle: "split",
    collection: { slug: "case-studies", layout: "case", fields: ["client", "year", "subtitle", "video", "attributes", "gallery"] },
    enabled: ["crm_deals", "invoicing", "calendar", "cms", "reviews", "hr_payroll", "itsm", "audit_trail", "notifications", "tasks", "marketing", "pr"],
  },
  all: {
    activity: "media",
    stylePreset: "cinematic",
    heroStyle: "cinematic",
    collection: { slug: "works", layout: "media", fields: ["client", "year", "video", "credits", "gallery"] },
    enabled: ALL_PRESET_MODULES,
  },
};

fs.mkdirSync(path.join(root, "seeds/sql/presets"), { recursive: true });
for (const [act, cfg] of Object.entries(PRESET_DEFINITIONS)) {
  const enabledSet = new Set(cfg.enabled);
  const disabled = ALL_PRESET_MODULES.filter((m) => !enabledSet.has(m));
  const storeEnabled = enabledSet.has("store");
  const presetSql = `-- Preset SQL Override: ${act} (${cfg.activity})
BEGIN;
UPDATE system.company
SET
  data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
    'businessActivity', ${sqlQuote(cfg.activity)},
    'theme', COALESCE(data->'theme', '{}'::jsonb) || jsonb_build_object('stylePreset', ${sqlQuote(cfg.stylePreset)}),
    'website', COALESCE(data->'website', '{}'::jsonb) || jsonb_build_object(
      'heroStyle', ${sqlQuote(cfg.heroStyle)},
      'collection', ${sqlQuote(cfg.collection)}
    )
  ),
  updated_by = ${sqlQuote(`preset:${act}`)},
  updated_at = now()
WHERE singleton = true;

UPDATE system.module_setting
SET enabled = true, updated_by = ${sqlQuote(`preset:${act}`)}, updated_at = now()
WHERE module_key IN (${cfg.enabled.map(sqlQuote).join(", ")});
${disabled.length > 0 ? `
UPDATE system.module_setting
SET enabled = false, updated_by = ${sqlQuote(`preset:${act}`)}, updated_at = now()
WHERE module_key IN (${disabled.map(sqlQuote).join(", ")});
` : ""}
UPDATE commerce.store_settings
SET delivery_enabled = ${enabledSet.has("delivery") ? "true" : "false"},
    pickup_enabled = ${storeEnabled ? "true" : "false"},
    updated_at = now()
WHERE id = 'default';
COMMIT;
`;
  fs.writeFileSync(path.join(root, `seeds/sql/presets/preset_${act}.sql`), presetSql);
}
console.log(`✓ ${Object.keys(PRESET_DEFINITIONS).length} preset SQL files written to seeds/sql/presets/`);
console.log("\nAll expanded SQL seeds generated successfully!");
