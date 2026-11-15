const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const schemaMeta = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../schema-meta.json"), "utf8"),
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
    const items = arr.map(
      (x) => `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`,
    );
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
    if (!colsMeta[k]) {
      throw new Error(
        `Unknown column "${k}" on table "${table}". Available columns: ${Object.keys(colsMeta).join(", ")}`,
      );
    }
    cols.push(k === "order" ? `"order"` : k);
    vals.push(sqlLit(v, colsMeta[k].udt));
  }
  for (const [colName, meta] of Object.entries(colsMeta)) {
    if (meta.req && !(colName in row)) {
      throw new Error(
        `Missing required column ${table}.${colName} (udt=${meta.udt})`,
      );
    }
  }
  return `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ${conflictClause};`;
}

const DIAL_PREFIXES = [
  ["+973", "BH"],
  ["+966", "SA"],
  ["+971", "AE"],
  ["+974", "QA"],
  ["+965", "KW"],
  ["+968", "OM"],
  ["+962", "JO"],
  ["+20", "EG"],
  ["+44", "GB"],
  ["+1", "US"],
];

function splitPhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return { country_code: null, mobile_number: null };
  for (const [prefix, cc] of DIAL_PREFIXES) {
    if (raw.startsWith(prefix)) {
      const rest = raw.slice(prefix.length).replace(/\D/g, "");
      return { country_code: cc, mobile_number: rest || null };
    }
  }
  const digits = raw.replace(/\D/g, "");
  return { country_code: "BH", mobile_number: digits || null };
}

function staffEmail(staffMember, domainHost) {
  return staffMember.email || `${staffMember.id}@${domainHost}`;
}

function loadDotEnv(envFilePath) {
  const envMap = {};
  if (!fs.existsSync(envFilePath)) return envMap;
  const content = fs.readFileSync(envFilePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    const quoted = val.match(/^(["'])([\s\S]*?)\1(?:\s+#.*)?$/);
    if (quoted) {
      val = quoted[2];
    } else {
      val = val.split(/\s+#/)[0].trim();
    }
    envMap[key] = val;
  }
  return envMap;
}

module.exports = {
  schemaMeta,
  uuidOf,
  sha256,
  sqlRaw,
  sqlLit,
  ins,
  splitPhone,
  staffEmail,
  loadDotEnv,
};
