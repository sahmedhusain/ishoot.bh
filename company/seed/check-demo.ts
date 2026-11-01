import assert from "node:assert/strict";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { demoPreset } from "./demo-presets";
import { loadCompanyProfile } from "../tools/company-profile";
import { listModules } from "../../packages/api-client/src/system";
import { ACTIVITY_PRESETS } from "../../packages/database/src/website-presets";

dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://localhost/missing");
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/[a-z0-9_]+_test$/.test(url.pathname)) throw new Error("Demo checks require a disposable local *_test database");
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });

async function main() {
  const preset = demoPreset(process.env.SEED_PRESET || "all", process.env.SEED_STYLE);
  const company = await db.companySetting.findFirstOrThrow();
  const profile = loadCompanyProfile(process.env.COMPANY_PROFILE || "demo");
  assert.equal(company.companyNameEn, profile.company.companyNameEn);
  assert.equal(company.businessActivity, preset.activity);
  const content = await db.websiteContent.findUniqueOrThrow({ where: { id: "main" } });
  assert.deepEqual(content.draft, JSON.parse(JSON.stringify(preset.website)));
  assert.ok(content.published && content.publishedAt, "Local demo must have a published website");
  const modules = new Map((await listModules()).map((m) => [m.key, m.enabled]));
  for (const module of preset.modules) assert.equal(modules.get(module.moduleKey), module.isEnabled, module.moduleKey);
  for (const activity of preset.activities) {
    assert.equal(await db.portfolioItem.count({ where: { slug: { startsWith: `demo-${activity}-` } } }), 12, activity);
    assert.equal(await db.cmsArticle.count({ where: { slug: { startsWith: `demo-${activity}-article-` } } }), 4, activity);
  }
  const enabled = (key: string) => preset.modules.some((module) => module.moduleKey === key && module.isEnabled);
  const minimums = [
    ["products", await db.product.count(), preset.activities.filter((activity) => ACTIVITY_PRESETS[activity].modules.products).length * 12],
    ["purchase orders", await db.purchaseOrder.count(), enabled("procurement") ? 16 : 0],
    ["orders", await db.salesOrder.count(), enabled("store") ? 72 : 0],
    ["customers", await db.customer.count(), enabled("store") ? 24 : 0],
    ["tasks", await db.task.count(), enabled("tasks") ? 96 : 0],
    ["campaigns", await db.campaign.count(), enabled("marketing") ? 12 : 0],
    ["coverage", await db.mediaCoverage.count(), enabled("pr") ? 18 : 0],
    ["legal matters", await db.legalMatter.count(), enabled("legal") ? 16 : 0],
  ] as const;
  if (process.env.SEED_VOLUME !== "off") for (const [area, count, minimum] of minimums) assert.ok(count >= minimum, `${area}: ${count} < ${minimum}`);
  const violations = await db.$queryRaw<Array<{ area: string; id: string }>>`
    WITH ledger AS (
      SELECT "productId", "variantKey", "locationId", "batchKey", SUM(quantity) qty
      FROM "StockMovement" GROUP BY 1,2,3,4
    ), reservations AS (
      SELECT l."productId", l."variantKey", l."locationId", SUM(l.quantity) qty
      FROM "SalesOrderLine" l JOIN "SalesOrder" o ON o.id=l."orderId"
      WHERE o.status IN ('placed','paid','packing') AND l."locationId" IS NOT NULL GROUP BY 1,2,3
    ), order_lines AS (SELECT "orderId", SUM("lineTotal") subtotal FROM "SalesOrderLine" GROUP BY 1),
    bill_payments AS (SELECT "billId", SUM(amount) paid FROM "SupplierPayment" GROUP BY 1)
    SELECT 'stock ledger' area, l.id FROM "StockLevel" l LEFT JOIN ledger m
      ON m."productId"=l."productId" AND m."variantKey"=l."variantKey" AND m."locationId"=l."locationId" AND m."batchKey"=l."batchKey"
      WHERE l."onHand" <> COALESCE(m.qty,0) OR l.reserved < 0 OR l.reserved > l."onHand"
    UNION ALL SELECT 'stock reservations', l.id FROM "StockLevel" l LEFT JOIN reservations r
      ON r."productId"=l."productId" AND r."variantKey"=l."variantKey" AND r."locationId"=l."locationId" AND l."batchKey"=''
      WHERE l.reserved <> COALESCE(r.qty,0)
    UNION ALL SELECT 'order totals', o.id FROM "SalesOrder" o LEFT JOIN order_lines l ON l."orderId"=o.id
      WHERE o.subtotal <> l.subtotal OR o.total <> o.subtotal - o."discountAmount" + o."vatAmount" + o."deliveryFee"
        OR o."amountPaid" > o.total OR o."amountRefunded" > o."amountPaid"
    UNION ALL SELECT 'order line totals', id FROM "SalesOrderLine" WHERE "lineTotal" <> ROUND(quantity * "unitPrice",3)
    UNION ALL SELECT 'supplier payments', b.id FROM "SupplierBill" b LEFT JOIN bill_payments p ON p."billId"=b.id
      WHERE b."amountPaid" <> COALESCE(p.paid,0) OR b."amountPaid" > b.total
    UNION ALL SELECT 'live email queue', id FROM "EmailJob" WHERE status = 'pending'
    UNION ALL SELECT 'provider analytics', id FROM "SocialMetric"
  `;
  assert.deepEqual(violations, [], "Seed invariants failed");
  if (enabled("procurement") && process.env.SEED_VOLUME !== "off") {
    const states = (await db.purchaseOrder.groupBy({ by: ["status"] })).map((row) => row.status);
    for (const status of ["draft", "pending_approval", "approved", "sent", "partially_received", "received", "cancelled"]) assert.ok(states.includes(status), status);
  }
  if (enabled("store") && process.env.SEED_VOLUME !== "off") {
    const orderStates = (await db.salesOrder.groupBy({ by: ["status"] })).map((row) => row.status);
    for (const status of ["placed", "paid", "packing", "shipped", "delivered", "cancelled", "returned"]) assert.ok(orderStates.includes(status), status);
    const payments = (await db.salesOrder.groupBy({ by: ["paymentStatus"] })).map((row) => row.paymentStatus);
    for (const status of ["unpaid", "paid", "partially_refunded", "refunded"]) assert.ok(payments.includes(status), status);
    assert.ok(await db.shipment.count({ where: { status: "failed", failureReason: "customer_absent" } }));
  }
  console.table(minimums.map(([area, count]) => ({ area, count })));
  console.log(`✅ ${preset.id}: preset content, modules, stock ledger, order totals, supplier payments and scenarios verified`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
