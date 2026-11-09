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

console.log("Loading base database snapshots from platform_db...");

const ishootCompany = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company) t")[0];
const companyAssets = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.company_asset) t") || [];
const moduleSettings = queryJson("SELECT json_agg(t) FROM (SELECT * FROM system.module_setting) t") || [];
const uploadObjects = queryJson("SELECT json_agg(t) FROM (SELECT * FROM files.upload_object) t") || [];
const staffRoles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role) t") || [];
const itRoles = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.it_role) t") || [];
const staffScopes = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_role_scope) t") || [];
const staffPermissions = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_permission) t") || [];
const itPermissions = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.it_permission) t") || [];
const accounts = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.account) t") || [];
const staffAccess = queryJson("SELECT json_agg(t) FROM (SELECT * FROM identity.staff_access) t") || [];
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
const contentSnapshot = queryJson("SELECT json_agg(t) FROM (SELECT * FROM cms.content_snapshot WHERE id = 'main') t")[0];

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

  for (let i = 0; i < 50; i++) {
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
  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const p = contactPeople[i];
    contacts.push({
      id: `cont-${String(i + 1).padStart(3, "0")}`,
      first_name: p.fn,
      last_name: p.ln,
      email: p.email,
      phone: p.phone,
      company: c.name,
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

  for (const sc of scenarios) {
    const contact = contacts[sc.contactIdx % contacts.length];
    const subtotal = sc.sub;
    const vatRate = 10.0;
    const vatAmount = Math.round(subtotal * 0.1 * 1000) / 1000;
    const total = subtotal + vatAmount;
    const amountPaid = Math.round(total * sc.paidRatio * 1000) / 1000;
    const balanceDue = Math.round((total - amountPaid) * 1000) / 1000;

    let issueDateSql = `(CURRENT_DATE - INTERVAL '${sc.daysAgo} days')::date`;
    let dueDateSql;

    if (sc.dueDaysAgo !== undefined) {
      dueDateSql = `(CURRENT_DATE - INTERVAL '${sc.dueDaysAgo} days')::date`;
    } else if (sc.futureDueDays !== undefined) {
      dueDateSql = `(CURRENT_DATE + INTERVAL '${sc.futureDueDays} days')::date`;
    } else {
      dueDateSql = `(CURRENT_DATE - INTERVAL '${Math.max(0, sc.daysAgo - 30)} days')::date`;
    }

    invoices.push({
      id: sc.id,
      invoice_number: sc.num,
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
      notes: sc.desc,
      terms: "Payment terms: 30 days net from invoice issue date. Bank transfer or BenefitPay accepted.",
    });

    // Invoice items (2 lines per invoice for realism)
    const line1Sub = Math.round(subtotal * 0.65 * 1000) / 1000;
    const line2Sub = Math.round((subtotal - line1Sub) * 1000) / 1000;

    items.push({
      id: `ii-${String(itemIndex++).padStart(3, "0")}`,
      invoice_id: sc.id,
      description: `${sc.desc} — Principal Filming & Crew`,
      quantity: 1,
      unit_price: line1Sub,
      amount: line1Sub,
      sort_order: 1,
    });

    items.push({
      id: `ii-${String(itemIndex++).padStart(3, "0")}`,
      invoice_id: sc.id,
      description: `${sc.desc} — 8K RAW Editing, Color Grading & Sound Master`,
      quantity: 1,
      unit_price: line2Sub,
      amount: line2Sub,
      sort_order: 2,
    });

    // Payment if paid or partially paid
    if (amountPaid > 0) {
      const payDays = sc.daysAgo - (sc.payDaysAfter || 10);
      const payDateSql = `(CURRENT_DATE - INTERVAL '${Math.max(0, payDays)} days')::date`;
      payments.push({
        id: `pay-${String(payIndex++).padStart(3, "0")}`,
        payment_number: `RCT-${sc.num.replace("INV-", "")}`,
        invoice_id: sc.id,
        contact_id: contact.id,
        amount: amountPaid,
        currency: "BHD",
        payment_method: sc.method || "bank_transfer",
        payment_date_sql: payDateSql,
        reference: `REF-${sc.num}-TXN${payIndex}`,
        status: "completed",
        notes: `Settlement for ${sc.desc}`,
      });
    }
  }

  return { invoices, items, payments };
}

// 4. 40 Deals across all pipeline stages
function generateDealsData(contacts, employees) {
  const stages = [
    { stage: "lead", prob: 20, count: 7, status: "open" },
    { stage: "qualified", prob: 40, count: 6, status: "open" },
    { stage: "proposal", prob: 60, count: 7, status: "open" },
    { stage: "negotiation", prob: 80, count: 7, status: "open" },
    { stage: "closed_won", prob: 100, count: 10, status: "won" },
    { stage: "closed_lost", prob: 0, count: 3, status: "lost" },
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
    for (let i = 0; i < st.count && dIdx < dealTitles.length; i++) {
      const title = dealTitles[dIdx];
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

  for (let i = 0; i < 30; i++) {
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
  for (let i = 0; i < expenseTemplates.length; i++) {
    const t = expenseTemplates[i];
    expenses.push({
      id: `exp-${String(i + 1).padStart(3, "0")}`,
      title: t.title,
      amount: t.amount,
      currency: "BHD",
      category_id: t.cat,
      expense_date_sql: `(CURRENT_DATE - INTERVAL '${t.daysAgo} days')::date`,
      vendor: t.vendor,
      status: "approved",
      notes: `Verified receipt and logged into ledger under ${t.cat}.`,
    });
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
    setupCompletedAt: "2026-01-01T00:00:00Z",
  };

  lines.push(`INSERT INTO system.company (id, singleton, data, currency_locked, revision, updated_by, updated_at)`);
  lines.push(`VALUES ('c0000000-0000-0000-0000-000000000001', true, ${sqlQuote(companyMergedData)}, false, 1, 'seed:sql', now())`);
  lines.push(`ON CONFLICT (singleton) DO UPDATE SET data = EXCLUDED.data, updated_at = now();`);
  lines.push(``);

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

  for (const mod of moduleSettings) {
    lines.push(`INSERT INTO system.module_setting (module_key, enabled, updated_by, updated_at)`);
    lines.push(`VALUES (${sqlQuote(mod.module_key)}, true, 'seed:sql', now())`);
    lines.push(`ON CONFLICT (module_key) DO UPDATE SET enabled = true, updated_at = now();`);
  }
  lines.push(``);

  lines.push(`INSERT INTO system.document_sequence (kind, prefix, next_number) VALUES ('invoice', '${isIshoot ? "ISH" : "INV"}', 201), ('receipt', 'RCT', 201) ON CONFLICT (kind) DO UPDATE SET prefix = EXCLUDED.prefix, next_number = EXCLUDED.next_number;`);
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 3. FILES SERVICE (Brand Artwork, Logos, Fonts)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const obj of uploadObjects) {
    lines.push(`INSERT INTO files.upload_object (id, file_url, owner_id, file_name, file_size, mime_type, is_public, claimed_at, expires_at, created_at)`);
    lines.push(`VALUES (${sqlQuote(obj.id)}, ${sqlQuote(obj.file_url)}, 'system', ${sqlQuote(obj.file_name)}, ${obj.file_size}, ${sqlQuote(obj.mime_type)}, ${obj.is_public ? "true" : "false"}, now(), now() + interval '100 years', now())`);
    lines.push(`ON CONFLICT (file_url) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 4. IDENTITY SERVICE (Roles, Scopes, Accounts & Permissions)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const role of staffRoles) {
    lines.push(`INSERT INTO identity.staff_role (id, name_en, name_ar, is_system, reporting_to_role, created_at, revision) VALUES (${sqlQuote(role.id)}, ${sqlQuote(role.name_en)}, ${sqlQuote(role.name_ar)}, true, ${sqlQuote(role.reporting_to_role)}, now(), 1) ON CONFLICT (id) DO UPDATE SET name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar, reporting_to_role = EXCLUDED.reporting_to_role;`);
  }
  for (const role of itRoles) {
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
  for (const acc of accounts) {
    lines.push(`INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(acc.realm)}, ${sqlQuote(acc.subject_id)}, ${sqlQuote(acc.email)}, ${sqlQuote(acc.username)}, ${sqlQuote(acc.password_hash)}, ${sqlQuote(acc.roles)}, true, false, ${sqlQuote(acc.reporting_to)}, now(), now())`);
    lines.push(`ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();`);
  }
  for (const acc of staffAccess) {
    lines.push(`INSERT INTO identity.staff_access (realm, subject_id, permission_overrides, updated_at) VALUES ('staff', ${sqlQuote(acc.subject_id)}, '{}'::jsonb, now()) ON CONFLICT (realm, subject_id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 5. HR SERVICE (Departments, Employees, Payroll Runs, Leaves, Attendance)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  for (const dept of departments) {
    lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES (${sqlQuote(dept.id)}, ${sqlQuote(dept.code)}, ${sqlQuote(dept.name_en)}, ${sqlQuote(dept.name_ar)}) ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000005', 'LOG', 'Logistics & Fleet', 'الخدمات اللوجستية والأسطول') ON CONFLICT (id) DO NOTHING;`);
  lines.push(`INSERT INTO hr.department (id, code, name_en, name_ar) VALUES ('d0000000-0000-0000-0000-000000000006', 'POST', 'Post-Production & Grading', 'ما بعد الإنتاج والمونتاج') ON CONFLICT (id) DO NOTHING;`);

  for (const emp of baseEmployees) {
    lines.push(`INSERT INTO hr.employee (id, employee_number, first_name_en, last_name_en, first_name_ar, last_name_ar, email, phone, job_title_en, job_title_ar, department_id, reporting_to, hire_date, status, basic_salary, housing_allowance, transport_allowance, other_allowances, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(emp.id)}, ${sqlQuote(emp.employee_number)}, ${sqlQuote(emp.first_name_en)}, ${sqlQuote(emp.last_name_en)}, ${sqlQuote(emp.first_name_ar)}, ${sqlQuote(emp.last_name_ar)}, ${sqlQuote(emp.email)}, ${sqlQuote(emp.phone)}, ${sqlQuote(emp.job_title_en)}, ${sqlQuote(emp.job_title_ar)}, ${sqlQuote(emp.department_id)}, ${sqlQuote(emp.reporting_to)}, (CURRENT_DATE - INTERVAL '365 days')::date, 'active', ${emp.basic_salary}, ${emp.housing_allowance}, ${emp.transport_allowance}, 0.000, now(), now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }

  // Historical Payroll Runs & Items
  for (const pr of payrollRuns) {
    lines.push(`INSERT INTO hr.payroll_run (id, period_month, period_year, status, total_gross, total_deductions, total_net, currency, processed_at, approved_by, created_at)`);
    lines.push(`VALUES (${sqlQuote(pr.id)}, ${pr.month}, ${pr.year}, 'completed', ${pr.gross}.000, ${pr.ded}.000, ${pr.net}.000, 'BHD', (CURRENT_DATE - INTERVAL '${pr.daysAgo} days')::timestamptz, 'super-admin', now())`);
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
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 8. INVENTORY SERVICE (Categories, Warehouses, Locations, Products, Stock Levels)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
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

  for (const p of productList) {
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

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 11. CMS SERVICE (Pages, Articles, FAQs, Statistics, Reviews, Snapshot)`);
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

  for (const tkt of itsmTickets) {
    const resolSql = tkt.resolAgo !== null ? `(CURRENT_DATE - INTERVAL '${tkt.resolAgo} days')::timestamptz` : "NULL";
    const respSql = `(CURRENT_DATE - INTERVAL '${tkt.respAgo} days')::timestamptz`;
    const createdSql = `(CURRENT_DATE - INTERVAL '${tkt.createdAgo} days')::timestamptz`;

    lines.push(`INSERT INTO itsm.ticket (id, requester_id, requester_name, requester_email, category, subcategory, priority, status, title, description, asset_ref, assignee_id, assignee_name, respond_by, resolve_by, first_response_at, resolved_at, created_at, updated_at)`);
    lines.push(`VALUES (${sqlQuote(tkt.id)}, 'super-admin', 'Super Admin', 'admin@ishoot.bh', ${sqlQuote(tkt.cat)}, ${sqlQuote(tkt.sub)}, ${sqlQuote(tkt.prio)}, ${sqlQuote(tkt.status)}, ${sqlQuote(tkt.title)}, ${sqlQuote(tkt.desc)}, ${sqlQuote(tkt.ref)}, '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', ${respSql}, now() + interval '24 hours', ${respSql}, ${resolSql}, ${createdSql}, now())`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);

    const eventId = tkt.id.replace(/^70/, "7e");
    lines.push(`INSERT INTO itsm.ticket_event (id, ticket_id, actor_realm, actor_id, kind, from_status, to_status, detail, created_at)`);
    lines.push(`VALUES (${sqlQuote(eventId)}, ${sqlQuote(tkt.id)}, 'staff', 'super-admin', 'status_change', 'in_progress', ${sqlQuote(tkt.status)}, '{"message": "Action logged in service desk"}'::jsonb, ${createdSql})`);
    lines.push(`ON CONFLICT (id) DO NOTHING;`);
  }
  lines.push(``);

  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`-- 13. NOTIFY SERVICE (In-App Notification Feed)`);
  lines.push(`-- ----------------------------------------------------------------------------`);
  lines.push(`INSERT INTO notify.notification (id, realm, recipient, category, priority, title, body, caller, silent, deliver_at, created_at) VALUES`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad1', 'staff', 'super-admin', 'finance', 'high', 'Invoice Payment Received', 'Payment of 14,500 BHD received from NBB for 65th Anniversary Film.', 'finance-svc', false, now() - interval '1 hour', now() - interval '1 hour'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad2', 'staff', 'super-admin', 'inventory', 'normal', 'Equipment Check-in Complete', 'ARRI Alexa 35 & Cooke lenses safely returned to Vault.', 'inventory-svc', false, now() - interval '3 hours', now() - interval '3 hours'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad3', 'staff', 'super-admin', 'sales', 'normal', 'New High-Value Deal Qualified', 'Toyota Land Cruiser Offroad TVC proposal requested by E.K. Kanoo.', 'sales-svc', false, now() - interval '5 hours', now() - interval '5 hours'),`);
  lines.push(`  ('90da75a0-0445-4b10-ad20-a6366b6a0ad4', 'staff', 'super-admin', 'hr', 'low', 'Monthly Payroll Run Processed', 'Payroll for October 2026 successfully disbursed to all 12 employees.', 'hr-svc', false, now() - interval '1 day', now() - interval '1 day')`);
  lines.push(`ON CONFLICT (id) DO NOTHING;`);
  lines.push(``);

  lines.push(`COMMIT;`);
  lines.push(`-- End of SQL Seed`);

  return lines.join("\n");
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

-- First Accounts (Email: admin@example.com, Password: Admin12345678!)
INSERT INTO identity.account (realm, subject_id, email, username, password_hash, roles, active, mfa_enabled, reporting_to, created_at, updated_at)
VALUES
  ('it', '430c4105-6360-4415-bf1b-087d582c7fc6', 'admin@example.com', 'IT0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_admin"}', true, false, NULL, now(), now()),
  ('it', 'it-manager-001', 'it-manager@example.com', 'IT0002', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_manager"}', true, false, '430c4105-6360-4415-bf1b-087d582c7fc6', now(), now()),
  ('it', 'it-lead-001', 'it-lead@example.com', 'IT0003', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_lead"}', true, false, 'it-manager-001', now(), now()),
  ('it', 'it-eng-001', 'it-engineer@example.com', 'IT0004', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_engineer"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-work-001', 'it-worker@example.com', 'IT0005', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_worker"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-supp-001', 'it-support@example.com', 'IT0006', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_support"}', true, false, 'it-lead-001', now(), now()),
  ('it', 'it-audit-001', 'it-auditor@example.com', 'IT0007', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"it_auditor"}', true, false, 'it-manager-001', now(), now()),
  ('staff', 'super-admin', 'admin@example.com', 'BA0001', '$argon2id$v=19$m=19456,t=2,p=1$TAbJr6lgxdcxC+ljsAmHwA$rUz/JqqAj5GjSgxeRLIbcPcm4jy9Gg29sgKoUxhKjqU', '{"super_admin"}', true, false, NULL, now(), now())
ON CONFLICT (realm, subject_id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, roles = EXCLUDED.roles, reporting_to = EXCLUDED.reporting_to, active = true, updated_at = now();

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

// Preset SQL files
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
console.log("\nAll expanded SQL seeds generated successfully!");
