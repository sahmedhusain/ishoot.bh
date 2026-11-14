#!/usr/bin/env node
/**
 * Introspects live PostgreSQL 17 microservice schemas via scripts/lib/db-query.cjs
 * and regenerates:
 *   1. scripts/schema-meta.json  (column, PK, and intra-schema FK metadata for seed generation)
 *   2. docs/ERD.md               (Mermaid ERDs + cross-service mesh map + column/FK reference)
 */
const fs = require("node:fs");
const path = require("node:path");
const { query } = require("./lib/db-query.cjs");

const root = path.resolve(__dirname, "..");
const SCHEMAS = [
  "audit",
  "cms",
  "commerce",
  "delivery",
  "files",
  "finance",
  "hr",
  "identity",
  "inventory",
  "itsm",
  "notify",
  "realtime",
  "sales",
  "system",
  "workflow",
];

const SCHEMA_LIST_SQL = SCHEMAS.map((s) => `'${s}'`).join(", ");

const INTROSPECT_SQL = `
WITH tbls AS (
  SELECT n.nspname AS schema_name, c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN (${SCHEMA_LIST_SQL})
    AND c.relkind IN ('r', 'p')
    AND c.relname NOT LIKE 'goose\\_%' ESCAPE '\\'
    AND c.relname NOT LIKE 'river\\_%' ESCAPE '\\'
),
cols AS (
  SELECT
    c.table_schema,
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    (c.is_nullable = 'NO' AND c.column_default IS NULL AND c.is_identity = 'NO') AS req,
    c.ordinal_position
  FROM information_schema.columns c
  JOIN tbls t ON t.schema_name = c.table_schema AND t.table_name = c.table_name
),
pks AS (
  SELECT
    n.nspname AS table_schema,
    c.relname AS table_name,
    a.attname AS column_name
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
  WHERE con.contype = 'p'
    AND n.nspname IN (${SCHEMA_LIST_SQL})
),
fks AS (
  SELECT
    n.nspname AS table_schema,
    c.relname AS table_name,
    con.conname AS constraint_name,
    a.attname AS column_name,
    rn.nspname AS ref_schema,
    rc.relname AS ref_table,
    ra.attname AS ref_column
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_class rc ON rc.oid = con.confrelid
  JOIN pg_namespace rn ON rn.oid = rc.relnamespace
  JOIN unnest(con.conkey, con.confkey) WITH ORDINALITY AS k(attnum, ref_attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
  JOIN pg_attribute ra ON ra.attrelid = rc.oid AND ra.attnum = k.ref_attnum
  WHERE con.contype = 'f'
    AND n.nspname IN (${SCHEMA_LIST_SQL})
)
SELECT json_build_object(
  'tables', (SELECT COALESCE(json_agg(t ORDER BY t.schema_name, t.table_name), '[]'::json) FROM tbls t),
  'columns', (SELECT COALESCE(json_agg(c ORDER BY c.table_schema, c.table_name, c.ordinal_position), '[]'::json) FROM cols c),
  'pks', (SELECT COALESCE(json_agg(p), '[]'::json) FROM pks p),
  'fks', (SELECT COALESCE(json_agg(f ORDER BY f.table_schema, f.table_name, f.constraint_name), '[]'::json) FROM fks f)
)::text;
`;

function mermaidType(udt, dataType) {
  if (udt.startsWith("_")) return "array";
  if (udt === "bool") return "boolean";
  if (udt === "int4") return "integer";
  if (udt === "int8") return "bigint";
  if (udt === "float8" || udt === "float4") return "float";
  if (udt === "timestamptz") return "timestamptz";
  if (dataType === "USER-DEFINED") return "text";
  return udt;
}

const CROSS_SERVICE_PROJECTIONS = [
  { source: "identity (identity.account)", target: "sales.directory_ref / workflow.directory_ref / hr.identity_user_ref / itsm.staff_ref / commerce.identity_user_ref", event: "identity.user.*", purpose: "Staff & directory lookups, MoM attendees, approvers, ticket assignees, employee user binding" },
  { source: "system (system.company / system.service)", target: "sales.service_catalog_ref", event: "system.service.*", purpose: "Live service catalog pricing & SKUs for quotations and proposals" },
  { source: "sales (sales.deal / sales.quotation / sales.contact)", target: "finance.sales_deal_ref / finance.sales_quotation_ref / workflow.directory_ref", event: "sales.deal.* / sales.quotation.* / sales.contact.*", purpose: "Quotation-to-invoice prefill, deal-linked billing, client pickers in MoMs & letters" },
  { source: "finance (finance.invoice / finance.payment)", target: "sales.finance_invoice_ref", event: "finance.invoice.* / finance.payment.*", purpose: "Quotation & deal conversion status, balance tracking, payment linkage" },
  { source: "hr (hr.department / hr.employee)", target: "workflow.directory_ref / itsm.staff_ref", event: "hr.employee.* / hr.department.*", purpose: "Reporting trees, asset/leave/task assignees, MoM participant rosters" },
  { source: "inventory (inventory.warehouse / inventory.product)", target: "commerce.warehouse_ref / sales.service_catalog_ref", event: "inventory.warehouse.* / inventory.product.*", purpose: "Storefront stock allocation, multi-warehouse fulfillment, quotation line items" },
  { source: "commerce (commerce.sales_order / commerce.customer)", target: "delivery.order_ref / delivery.driver_ref", event: "commerce.order.*", purpose: "Shipment fulfillment dispatch, COD settlement tracking, customer order tracking" },
  { source: "files (files.upload_object / files.entity_attachment)", target: "Polymorphic (entity_type, entity_id) + document_id", event: "files.object.*", purpose: "Receipts, invoices, MoMs, contracts, tickets, inquiries, and store order attachments" },
];

function main() {
  const raw = query(INTROSPECT_SQL);
  const data = JSON.parse(raw);

  const pkSet = new Set(data.pks.map((p) => `${p.table_schema}.${p.table_name}.${p.column_name}`));
  const fkMap = new Map();
  for (const fk of data.fks) {
    const key = `${fk.table_schema}.${fk.table_name}.${fk.column_name}`;
    if (!fkMap.has(key)) fkMap.set(key, `${fk.ref_schema}.${fk.ref_table}.${fk.ref_column}`);
  }

  // 1. Regenerate scripts/schema-meta.json (excludes inbox/outbox operational queues)
  const schemaMeta = {};
  for (const col of data.columns) {
    if (col.table_name === "outbox" || col.table_name === "inbox") continue;
    const tblKey = `${col.table_schema}.${col.table_name}`;
    if (!schemaMeta[tblKey]) schemaMeta[tblKey] = {};
    const colKey = `${tblKey}.${col.column_name}`;
    schemaMeta[tblKey][col.column_name] = {
      udt: col.udt_name,
      req: Boolean(col.req),
      pk: pkSet.has(colKey),
      fk: fkMap.get(colKey) || null,
    };
  }
  const metaPath = path.join(root, "scripts/schema-meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(schemaMeta, null, 2) + "\n");

  // 2. Regenerate docs/ERD.md
  const colsByTable = new Map();
  for (const col of data.columns) {
    const tblKey = `${col.table_schema}.${col.table_name}`;
    if (!colsByTable.has(tblKey)) colsByTable.set(tblKey, []);
    colsByTable.get(tblKey).push(col);
  }

  const tablesBySchema = new Map(SCHEMAS.map((s) => [s, []]));
  for (const t of data.tables) {
    if (tablesBySchema.has(t.schema_name)) tablesBySchema.get(t.schema_name).push(t.table_name);
  }

  const fksBySchema = new Map(SCHEMAS.map((s) => [s, []]));
  for (const fk of data.fks) {
    if (fksBySchema.has(fk.table_schema)) fksBySchema.get(fk.table_schema).push(fk);
  }

  const out = [];
  out.push("# Database Entity-Relationship Diagram (ERD)");
  out.push("");
  out.push("Complete schema reference for PostgreSQL 17 (`platform_db`) generated directly from the live migrated database schemas via `scripts/generate-erd-and-meta.cjs`. Each Go microservice owns an isolated schema (`svc_<service>`) with strict intra-schema foreign keys and cross-service Event Mesh projections synchronized via NATS JetStream.");
  out.push("");
  out.push("## Schema Overview");
  out.push("");
  out.push("| Schema | Owning Service | Tables | Columns | Foreign Keys |");
  out.push("|---|---|---:|---:|---:|");
  let totalTables = 0;
  let totalCols = 0;
  let totalFks = 0;
  for (const schema of SCHEMAS) {
    const tbls = tablesBySchema.get(schema) || [];
    const colCount = tbls.reduce((acc, tbl) => acc + (colsByTable.get(`${schema}.${tbl}`)?.length || 0), 0);
    const fkCount = (fksBySchema.get(schema) || []).length;
    totalTables += tbls.length;
    totalCols += colCount;
    totalFks += fkCount;
    out.push(`| [\`${schema}\`](#schema-${schema}) | \`${schema}\` | ${tbls.length} | ${colCount} | ${fkCount} |`);
  }
  out.push(`| **Total** | **15 stateful services** | **${totalTables}** | **${totalCols}** | **${totalFks}** |`);
  out.push("");
  out.push("## Cross-Service Relational Event Mesh");
  out.push("");
  out.push("Because services enforce schema isolation (no cross-schema PostgreSQL JOINs or FKs), cross-domain integrity relies on NATS JetStream outbox projections (`*_ref` tables) plus polymorphic `files.entity_attachment` document links:");
  out.push("");
  out.push("| Source Service & Entity | Target Projection Table(s) | NATS Subject(s) | Purpose |");
  out.push("|---|---|---|---|");
  for (const p of CROSS_SERVICE_PROJECTIONS) {
    out.push(`| ${p.source} | \`${p.target}\` | \`${p.event}\` | ${p.purpose} |`);
  }
  out.push("");
  out.push("---");

  for (const schema of SCHEMAS) {
    const tbls = tablesBySchema.get(schema) || [];
    const schemaFks = fksBySchema.get(schema) || [];
    out.push("");
    out.push(`## Schema: \`${schema}\` {#schema-${schema}}`);
    out.push("");
    out.push("### Entity-Relationship Diagram");
    out.push("");
    out.push("```mermaid");
    out.push("erDiagram");
    for (const tbl of tbls) {
      out.push(`    ${schema}__${tbl} {`);
      for (const col of colsByTable.get(`${schema}.${tbl}`) || []) {
        const colKey = `${schema}.${tbl}.${col.column_name}`;
        const badges = [];
        if (pkSet.has(colKey)) badges.push("PK");
        if (fkMap.has(colKey)) badges.push("FK");
        const suffix = badges.length ? ` ${badges.join(",")}` : "";
        out.push(`        ${mermaidType(col.udt_name, col.data_type)} ${col.column_name}${suffix}`);
      }
      out.push("    }");
    }
    const seenEdges = new Set();
    for (const fk of schemaFks) {
      const edgeKey = `${fk.ref_schema}__${fk.ref_table}->${fk.table_schema}__${fk.table_name}:${fk.column_name}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      out.push(`    ${fk.ref_schema}__${fk.ref_table} ||--o{ ${fk.table_schema}__${fk.table_name} : "${fk.column_name}"`);
    }
    out.push("```");
    out.push("");
    out.push("### Tables & Columns");
    for (const tbl of tbls) {
      out.push("");
      out.push(`#### \`${schema}.${tbl}\``);
      out.push("");
      out.push("| Column | Type | Nullable | Key | References |");
      out.push("|---|---|---|---|---|");
      for (const col of colsByTable.get(`${schema}.${tbl}`) || []) {
        const colKey = `${schema}.${tbl}.${col.column_name}`;
        const keyLabel = pkSet.has(colKey) ? (fkMap.has(colKey) ? "PK, FK" : "PK") : fkMap.has(colKey) ? "FK" : "";
        const refLabel = fkMap.has(colKey) ? `\`${fkMap.get(colKey)}\`` : "";
        const nullable = col.is_nullable === "YES" ? "YES" : "NO";
        out.push(`| \`${col.column_name}\` | \`${col.data_type}\` | ${nullable} | ${keyLabel} | ${refLabel} |`);
      }
    }
    out.push("");
    out.push("---");
  }

  const erdPath = path.join(root, "docs/ERD.md");
  fs.writeFileSync(erdPath, out.join("\n") + "\n");
  console.log(`✓ Updated scripts/schema-meta.json (${Object.keys(schemaMeta).length} tables)`);
  console.log(`✓ Updated docs/ERD.md (${totalTables} tables, ${totalCols} columns, ${totalFks} FKs across ${SCHEMAS.length} schemas)`);
}

main();
