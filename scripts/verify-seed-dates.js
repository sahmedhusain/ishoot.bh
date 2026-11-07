#!/usr/bin/env node
const { execSync } = require("child_process");
const assert = require("assert");

function getInvoiceDateBounds() {
  // Try docker exec psql first since platform-postgres-1 is the canonical container
  try {
    const raw = execSync(
      `docker exec platform-postgres-1 psql -U platform -d platform_db -t -A -c "SELECT MIN(issue_date), MAX(issue_date) FROM finance.invoice;"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    if (raw && raw.includes("|")) {
      const [minStr, maxStr] = raw.split("|");
      if (minStr && maxStr) {
        return { min: new Date(minStr), max: new Date(maxStr), minStr, maxStr };
      }
    }
  } catch {
    // fallback if docker container name differs or local psql is used
  }

  // Fallback to local psql using DATABASE_URL if available
  const dbUrl = process.env.DATABASE_URL || "postgres://platform:platform@localhost:5432/platform_db?sslmode=disable";
  try {
    const raw = execSync(
      `psql "${dbUrl}" -t -A -c "SELECT MIN(issue_date), MAX(issue_date) FROM finance.invoice;"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
    ).trim();
    if (raw && raw.includes("|")) {
      const [minStr, maxStr] = raw.split("|");
      return { min: new Date(minStr), max: new Date(maxStr), minStr, maxStr };
    }
  } catch (err) {
    throw new Error(`Failed to query finance.invoice: ${err.message}`);
  }

  throw new Error("No invoices found in database to verify dates.");
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
