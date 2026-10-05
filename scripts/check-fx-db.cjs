// Run: node scripts/check-fx-db.cjs  (local database only; everything is rolled back)
// Live FX refresh, sanity limits, inverse pairs and fallbacks for the nine supported currencies.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const fx = require("../packages/database/src/queries/fx-settlement.ts");

const rollback = new Error("rollback");
async function main() {
  const realFetch = global.fetch;
  try {
    await db.$transaction((tx) => transactionContext.run(tx, async () => {
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      await tx.exchangeRateSnapshot.deleteMany({ where: { effectiveDate: today } });

      // A feed that is down falls back to stored or pegged rates, never 1:1.
      global.fetch = async () => ({ ok: false, json: async () => ({}) });
      const offline = await fx.getLatestExchangeRate("BHD", "USD");
      assert.equal(offline.isFallback, true);
      assert.ok(offline.rate > 2.5 && offline.rate < 2.8);

      // A live feed is stored for every supported currency with inverses; absurd values are rejected.
      global.fetch = async () => ({ ok: true, json: async () => ({ result: "success", rates: { USD: 2.6596, SAR: 9.9735, AED: 9.7685, KWD: 0.8170, OMR: 1.0234, QAR: 9.6810, EUR: 2.3, GBP: 99, JPY: 400 } }) });
      assert.equal(await fx.refreshExchangeRates({ force: true }), true);
      const usd = await fx.getLatestExchangeRate("BHD", "USD");
      assert.deepEqual([usd.rate, usd.provider, usd.isFallback], [2.6596, "open.er-api", false]);
      const back = await fx.getLatestExchangeRate("SAR", "BHD");
      assert.ok(Math.abs(back.rate - 1 / 9.9735) < 1e-6, "inverse pair stored");
      assert.equal(await tx.exchangeRateSnapshot.count({ where: { effectiveDate: today, quoteCurrency: "GBP", provider: "open.er-api" } }), 0, "out-of-range GBP is rejected");
      assert.equal(await tx.exchangeRateSnapshot.count({ where: { quoteCurrency: "JPY" } }), 0, "unsupported currencies are ignored");

      // Only the nine supported currencies, and only BHD pairs, can be priced.
      await assert.rejects(fx.getLatestExchangeRate("BHD", "JPY"), /No exchange rate/);
      await assert.rejects(fx.getLatestExchangeRate("USD", "EUR"), /No exchange rate/);
      const board = await fx.getFxBoard();
      assert.deepEqual(board.map((r) => r.currency), ["SAR", "AED", "KWD", "OMR", "QAR", "USD", "EUR", "GBP"]);
      throw rollback;
    }), { timeout: 30000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    global.fetch = realFetch;
  }
  console.log("FX database checks passed and rolled back: live refresh with inverses, sanity limits, offline fallback, supported currencies only.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
