#!/usr/bin/env node
const assert = require("node:assert");
const { query: querySql } = require("./lib/db-query.cjs");

const query = "SELECT MIN(issue_date), MAX(issue_date) FROM finance.invoice;";

function getInvoiceDateBounds() {
  const [minStr, maxStr] = querySql(query).split("|");
  if (!minStr || !maxStr) throw new Error("No invoices found in database to verify dates.");
  return { min: new Date(minStr), max: new Date(maxStr), minStr, maxStr };
}

try {
  const { min, max, minStr, maxStr } = getInvoiceDateBounds();
  console.log(`Checking seed invoice dates: MIN = ${minStr}, MAX = ${maxStr}`);

  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 7); // Allow 6-7 months leeway

  const twoMonthsFuture = new Date(now);
  twoMonthsFuture.setMonth(now.getMonth() + 2);

  assert(min >= sixMonthsAgo, `MIN date (${minStr}) should be within the last 6 months (>= ${sixMonthsAgo.toISOString().slice(0, 10)})`);
  assert(max <= twoMonthsFuture, `MAX date (${maxStr}) should not exceed realistic near-future expectations`);

  console.log("✅ Seed dates are realistic and span the expected historical window.");
  process.exit(0);
} catch (err) {
  console.error("❌ Seed date verification failed:", err.message);
  process.exit(1);
}
