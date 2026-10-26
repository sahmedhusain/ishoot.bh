// Isolated local fixtures only: concurrency checks need committed rows on independent connections.
require("dotenv").config({ quiet: true });
require("ts-node").register({ transpileOnly: true, skipProject: true, compilerOptions: { module: "CommonJS", target: "ES2022", moduleResolution: "Node", esModuleInterop: true, resolveJsonModule: true } });
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const url = new URL(process.env.DATABASE_URL);
assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.endsWith("_test"), "Use a disposable local *_test database");
const { db } = require("../packages/database/src/db.ts");
const { transactionContext } = require("../packages/database/src/transaction-context.ts");
const { recordCountedQuantities, addCountLine, setStockCountStatus, approveStockCount } = require("../packages/database/src/queries/inventory.ts");
const { serverMessages } = require("../packages/locales/src");
const marker = `count-qa-${randomUUID()}`;
const productIds = [], countIds = [];
let warehouseId, locationId, lineId;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const rejectsClosed = result => { assert.equal(result.status, "rejected"); assert.equal(result.reason.message, serverMessages.stockCountClosed); };
async function racing(transition, otherOperations) {
  const ready = deferred(), release = deferred();
  const first = db.$transaction(tx => transactionContext.run(tx, async () => {
    const value = await transition(); ready.resolve(); await release.promise; return value;
  }), { timeout: 15000 });
  first.catch(() => ready.resolve());
  await ready.promise;
  const others = Promise.allSettled(otherOperations.map(operation => operation()));
  // Wait for contenders to reach PostgreSQL locks, or expose an incorrectly completed stale write.
  try {
    const waitForLocks = async () => {
      const deadline = Date.now() + 4000;
      while (Date.now() < deadline) {
        const [row] = await db.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND wait_event_type = 'Lock' AND (query LIKE '%StockCount%' OR query LIKE '%StockItem%' OR query LIKE '%StockLevel%')`;
        if (row.n >= otherOperations.length) return;
        await new Promise(done => setTimeout(done, 20));
      }
      throw new Error("Concurrent count operations did not reach their database locks");
    };
    await Promise.race([waitForLocks(), others]);
  } finally { release.resolve(); await Promise.allSettled([first, others]); }
  const value = await first;
  return { value, others: await others };
}
(async () => {
  try {
    warehouseId = (await db.warehouse.create({ data: { code: marker, nameEn: marker, nameAr: "اختبار الجرد" } })).id;
    locationId = (await db.stockLocation.create({ data: { warehouseId, code: "MAIN" } })).id;
    for (let i = 0; i < 2; i++) productIds.push((await db.product.create({ data: { sku: `${marker}-${i}`, nameEn: marker, nameAr: "اختبار الجرد" } })).id);
    await db.stockItem.create({ data: { productId: productIds[0], averageCost: 4 } });
    await db.stockLevel.create({ data: { productId: productIds[0], locationId, onHand: 5 } });
    const makeCount = async status => {
      const count = await db.stockCount.create({ data: { number: `${marker}-${countIds.length}`, warehouseId, status, lines: { create: { productId: productIds[0], locationId, expected: 5, counted: 8, note: "Keep this note" } } }, include: { lines: true } });
      countIds.push(count.id); return count;
    };
    const review = await makeCount("review");
    const approval = await racing(() => approveStockCount(review.id, null), [() => approveStockCount(review.id, null), () => setStockCountStatus(review.id, "cancelled")]);
    assert.equal(approval.value.adjusted, 1);
    approval.others.forEach(rejectsClosed);
    assert.equal((await db.stockCount.findUniqueOrThrow({ where: { id: review.id } })).status, "approved");
    assert.equal(await db.stockMovement.count({ where: { sourceType: "stock_count", sourceId: review.id } }), 1);
    assert.equal(Number((await db.stockLevel.findFirstOrThrow({ where: { productId: productIds[0] } })).onHand), 8);

    const counting = await makeCount("counting"); lineId = counting.lines[0].id;
    const submitted = await racing(() => setStockCountStatus(counting.id, "review"), [() => recordCountedQuantities(counting.id, [{ lineId, counted: "9" }]), () => addCountLine(counting.id, { productId: productIds[1], locationId })]);
    submitted.others.forEach(rejectsClosed);
    assert.equal(Number((await db.stockCountLine.findUniqueOrThrow({ where: { id: lineId } })).counted), 8);
    assert.equal(await db.stockCountLine.count({ where: { countId: counting.id } }), 1);
    await setStockCountStatus(counting.id, "counting");
    await recordCountedQuantities(counting.id, [{ lineId, counted: "0" }]);
    let line = await db.stockCountLine.findUniqueOrThrow({ where: { id: lineId } });
    assert.equal(Number(line.counted), 0); assert.equal(line.note, "Keep this note");
    await recordCountedQuantities(counting.id, [{ lineId, counted: "", note: "" }]);
    line = await db.stockCountLine.findUniqueOrThrow({ where: { id: lineId } });
    assert.equal(line.counted, null); assert.equal(line.note, null);
    const invalid = [
      [{ lineId, counted: "2" }, { lineId: review.lines[0].id, counted: "3" }],
      [{ lineId, counted: "2" }, { lineId: randomUUID(), counted: "3" }],
      [{ lineId, counted: "2" }, { lineId, counted: "3" }],
      Array.from({ length: 201 }, () => ({ lineId: randomUUID(), counted: "1" })),
    ];
    for (const entries of invalid) {
      await assert.rejects(recordCountedQuantities(counting.id, entries), { message: serverMessages.stockCountLinesInvalid });
      assert.equal((await db.stockCountLine.findUniqueOrThrow({ where: { id: lineId } })).counted, null);
    }
    for (const counted of ["NaN", "-1", "10000001"]) await assert.rejects(recordCountedQuantities(counting.id, [{ lineId, counted }]), { message: serverMessages.stockQuantityInvalid });
    const scanned = await addCountLine(counting.id, { productId: productIds[1], locationId });
    assert.equal(scanned.counted, null);
    await setStockCountStatus(counting.id, "cancelled");
    await assert.rejects(recordCountedQuantities(counting.id, [{ lineId, counted: "1" }]), { message: serverMessages.stockCountClosed });
    await assert.rejects(approveStockCount(randomUUID(), null), { message: serverMessages.stockCountMissing });
    console.log("Stock-count database checks passed: serialized approval/status/quantity/scan writes, one ledger posting, batch rollback, zero/blank and note preservation.");
  } finally {
    await db.stockCount.deleteMany({ where: { id: { in: countIds } } });
    await db.stockMovement.deleteMany({ where: { productId: { in: productIds } } });
    await db.stockLevel.deleteMany({ where: { productId: { in: productIds } } });
    await db.stockItem.deleteMany({ where: { productId: { in: productIds } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    if (warehouseId) { await db.stockLocation.deleteMany({ where: { warehouseId } }); await db.warehouse.delete({ where: { id: warehouseId } }); }
    await db.$disconnect();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
