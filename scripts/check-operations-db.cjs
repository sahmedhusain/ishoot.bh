// Real transaction/concurrency checks. Only an explicitly selected disposable database is accepted.
require("ts-node").register({
  transpileOnly: true,
  skipProject: true,
  moduleTypes: { "packages/config/src/**/*.ts": "cjs" },
  compilerOptions: {
    module: "CommonJS",
    target: "ES2022",
    moduleResolution: "Node",
    esModuleInterop: true,
    resolveJsonModule: true,
  },
});
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const url = new URL(process.env.DATABASE_URL || "http://invalid");
if (!url.pathname.endsWith("_test"))
  throw Error(
    "Operations checks require an explicit disposable _test database",
  );
const { db } = require("../packages/database/src/db.ts");
const {
  generateSerialLabels,
  getSerialLabelJob,
  reprintSerialLabels,
  confirmSerialLabelPrinting,
} = require("../packages/database/src/queries/stock-labels.ts");
const {
  requireBranchAccess,
} = require("../packages/database/src/queries/branches.ts");
const {
  postJournal,
  createAccountingPeriod,
  closeAccountingPeriod,
  reverseJournal,
} = require("../packages/database/src/queries/accounting-ledger.ts");
const {
  verifyGeneratedSerials,
  moveSerialsBetweenBins,
} = require("../packages/database/src/queries/serialized-stock.ts");
const {
  postMovements,
} = require("../packages/database/src/queries/inventory.ts");
const { runAtomicMutation } = require("../packages/database/src/db.ts");
const {
  reportMissingTransferUnits,
  closeSerialTransfer,
  requestSerialTransfer,
  approveSerialTransfer,
  dispatchSerialTransfer,
  receiveSerialTransfer,
} = require("../packages/database/src/queries/stock-transfers.ts");
const {
  previewStockHandover,
  acknowledgeStockHandover,
} = require("../packages/database/src/queries/stock-handover.ts");
const testSignature =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAAAAABWESUoAAAEE0lEQVR4nHXHf0xSeQAA8G+hIiEgoj4V6UkMidBxxJCMBRE4zl9Dh0Zk+SpyuL0cV6bkjDEjYcYmzWKmrr2INrStmJHjLB1nztF0haw2XLThcubcYszcYs7K+/+2++uzDwD79uPS0jPwmYQDxCwSmZJNzaHl5uVDBYVF9GLGQRjsw6XjCUQShUrLgwrpDJjJYnO4vHK+QCgSV0pOyMD+9EwimZoLFTFKWKXcMv5R0TGJVK5U1dQ3aE7rziEAhydSaBAdZnF4fKFYIlOoatUabQuiN6DGTlOvBaQRyLQCxiFOmaBCcrKqRt2ka9W3d1wz3eyzOe66RjGQTqRCDBaXL5LIVfUaHdKGXjWZrQNO15jb+8w/HQQZpFz6Ie4fYmlVnebsxXZjt/m2Y2jkkff51Mz8YmQlDvAUCObwxTKVWosYjCaL3TmMeX2BYCgcjW8kU3sgk1rEKhNJVQ26S+h1s835wP3UP7PwPrq6+X03jZQPAwKNwRFIqtQ6fYepz+HCJvyzoUhsPbmDI0FMnkgGDuSV8CrkddpLHTesgyNPfK8WlmNft37icxiHhdLqJgQQIRZfotIgqMnqHPP6g0vRteQungbzxAp1i6HTArIKS4Un688arvcNjo1PvQl/3vyBy2YcESsbW9Eb/UMYING54irNRaPZMeKdmo/EE7sEiC2Uq8+jPXaXZzIIyIwySY2u3WRzPfG/iawmf5OKecerzxi6++97XswtxwEF5svUiNHixHzBcDy599+DbOZRRVNbt/3BxKulz4nflBLBKc3lLtvw+PRi7NsvMgyoLJFKh5qdbv9CdHOXBAsUzYYex0Pf3If1FIFeLgM57GO1rVdvDz+dXV77QSjmn2pu7x10vwx9SgBaaWUdAmgciVpvcmD+UCyJg3gyjaHX6QksxbfxdL5Ci1pALleqaTcPeWciX3ez2cfVl3sGPX+/+5LKYlbUXui6g4E8nlzbYR3xLcS28AxhNdLlcAfere1Q2JJGg/neRBDklytbrg08Crxf/0k7Ij9jtD18ufRlJ5sjbb5iHZ18GwcQX4WYnN5gNImHxWqDZdgXiqcoHJnWaMcC4Y09UCCo0d90PQ+t7uTwlOe7neNzn7az2FLtXwOPX39MZMCgUFhv6BubCm/iGOJGtB+b/pDAMyXNxgHPbHSLyJaBIlEDanPPRL+TDitae+77FtcBvaLxiv3x7Mo2matEAF2sMTq88/FdSKhG7Z5gLEXj1xqs2OvoNoWn0ltAceXpzrvPFjfSmNKWG64X4W+EUsUF82jg4xaZ92fbLQwwJDqTyx9JknjVhn7PXPwXvVLbdW8ynCByVW1WdxAcPHGud3R6JZUvauocmlxOksvr0DsTbzcy2Er9Lfc/cQDLEAsWjO/9n/8CpOK0EIKVRrUAAAAASUVORK5CYII=";
async function main() {
  const tag = randomUUID();
  for (const role of ["super_admin", "viewer"])
    await db.role.upsert({
      where: { id: role },
      update: {},
      create: { id: role, nameEn: role, nameAr: role },
    });
  await db.companySetting.upsert({
    where: { singleton: 1 },
    update: {},
    create: {
      companyNameEn: "Operations test",
      companyNameAr: "اختبار",
      defaultCurrency: "BHD",
    },
  });
  const actor = await db.user.create({
    data: {
      email: `${tag}@example.test`,
      fullName: "Warehouse test",
      passwordHash: "not-a-login-hash",
      role: "super_admin",
    },
  });
  const outsider = await db.user.create({
    data: {
      email: `outside-${tag}@example.test`,
      fullName: "Outside",
      passwordHash: "not-a-login-hash",
      role: "viewer",
    },
  });
  await assert.rejects(
    requireBranchAccess(outsider.id, "legacy-main"),
    /denied/,
  );
  const warehouse = await db.warehouse.create({
    data: {
      code: tag,
      nameEn: "Warehouse",
      nameAr: "مستودع",
      branchId: "legacy-main",
    },
  });
  const location = await db.stockLocation.create({
    data: { warehouseId: warehouse.id, code: "MAIN" },
  });
  const product = await db.product.create({
    data: { sku: tag, nameEn: "Test unit", nameAr: "وحدة" },
  });
  const level = await db.stockLevel.create({
    data: { productId: product.id, locationId: location.id, onHand: 5 },
  });
  const input = {
    productId: product.id,
    variantKey: "",
    batchKey: "",
    locationId: location.id,
    quantity: 3,
    idempotencyKey: randomUUID(),
    template: { widthMm: 75, heightMm: 35, gapMm: 2, copies: 1 },
  };
  const [first, retry] = await Promise.all([
    generateSerialLabels(input, actor.id),
    generateSerialLabels(input, actor.id),
  ]);
  assert.equal(first.id, retry.id);
  assert.equal(
    await db.stockSerial.count({ where: { productId: product.id } }),
    3,
  );
  assert.equal(
    String(
      (await db.stockLevel.findUniqueOrThrow({ where: { id: level.id } }))
        .onHand,
    ),
    "5",
    "labels must never mint stock",
  );
  await assert.rejects(
    generateSerialLabels({ ...input, quantity: 4 }, actor.id),
    /different request/,
  );
  await assert.rejects(getSerialLabelJob(first.id, outsider.id), /denied/);
  const race = await Promise.allSettled([
    generateSerialLabels(
      { ...input, quantity: 2, idempotencyKey: randomUUID() },
      actor.id,
    ),
    generateSerialLabels(
      { ...input, quantity: 2, idempotencyKey: randomUUID() },
      actor.id,
    ),
  ]);
  assert.equal(
    race.filter((x) => x.status === "fulfilled").length,
    1,
    "concurrent generation cannot exceed physical stock",
  );
  assert.equal(
    await db.stockSerial.count({ where: { productId: product.id } }),
    5,
  );
  const reprintInput = { jobId: first.id, idempotencyKey: randomUUID() };
  const [printAgain, printRetry] = await Promise.all([
    reprintSerialLabels(reprintInput, actor.id),
    reprintSerialLabels(reprintInput, actor.id),
  ]);
  assert.equal(printAgain.id, printRetry.id);
  const printJob = await getSerialLabelJob(printAgain.id, actor.id);
  assert.deepEqual(
    printJob.labels,
    (await getSerialLabelJob(first.id, actor.id)).labels,
  );
  assert.equal(
    await db.stockSerial.count({ where: { productId: product.id } }),
    5,
  );
  assert.equal(
    await db.serialGeneration.count({ where: { productId: product.id } }),
    2,
  );
  await assert.rejects(getSerialLabelJob(printAgain.id, outsider.id), /denied/);
  await Promise.all([
    confirmSerialLabelPrinting(printAgain.id, actor.id),
    confirmSerialLabelPrinting(printAgain.id, actor.id),
  ]);
  assert.equal(
    (await getSerialLabelJob(printAgain.id, actor.id)).status,
    "operator_confirmed",
  );
  assert.equal(
    await db.stockTraceEvent.count({
      where: { entityId: printAgain.id, action: "operator_confirmed" },
    }),
    1,
  );
  // Every old stock writer is protected at commit, including direct balance updates.
  await assert.rejects(
    db.stockLevel.update({ where: { id: level.id }, data: { onHand: 4 } }),
    /assigned serial/,
  );
  const generation = await db.serialGeneration.findUniqueOrThrow({
    where: { idempotencyKey: input.idempotencyKey },
    include: { serials: true },
  });
  const codes = generation.serials.map((serial) => serial.code);
  await assert.rejects(
    verifyGeneratedSerials(generation.id, codes.slice(1), actor.id),
    /every generated/,
  );
  await assert.rejects(
    verifyGeneratedSerials(generation.id, codes, outsider.id),
    /denied/,
  );
  await Promise.all([
    verifyGeneratedSerials(generation.id, codes, actor.id),
    verifyGeneratedSerials(generation.id, codes, actor.id),
  ]);
  const bin = await db.stockLocation.create({
    data: { warehouseId: warehouse.id, code: "BIN-2" },
  });
  const thirdBin = await db.stockLocation.create({
    data: { warehouseId: warehouse.id, code: "BIN-3" },
  });
  const move = {
    sourceLocationId: location.id,
    destinationLocationId: bin.id,
    idempotencyKey: randomUUID(),
    serials: [{ code: codes[0], revision: 2 }],
  };
  const [moved, movedRetry] = await Promise.all([
    moveSerialsBetweenBins(move, actor.id),
    moveSerialsBetweenBins(move, actor.id),
  ]);
  assert.equal(moved.id, movedRetry.id);
  assert.equal(
    await db.stockMovement.count({ where: { sourceId: moved.id } }),
    2,
  );
  assert.equal(
    (await db.stockSerial.findUniqueOrThrow({ where: { code: codes[0] } }))
      .locationId,
    bin.id,
  );
  const total = await db.stockLevel.aggregate({
    where: { productId: product.id },
    _sum: { onHand: true },
  });
  assert.equal(total._sum.onHand.toString(), "5");
  await assert.rejects(
    moveSerialsBetweenBins(
      { ...move, destinationLocationId: thirdBin.id },
      actor.id,
    ),
    /different request/,
  );
  await assert.rejects(
    runAtomicMutation(() =>
      postMovements(
        db,
        [
          {
            type: "adjustment",
            productId: product.id,
            locationId: location.id,
            quantity: -1,
          },
        ],
        actor.id,
      ),
    ),
    /assigned serial/,
  );
  const raceMove = await Promise.allSettled(
    [bin.id, thirdBin.id].map((destinationLocationId) =>
      moveSerialsBetweenBins(
        {
          ...move,
          destinationLocationId,
          idempotencyKey: randomUUID(),
          serials: [{ code: codes[1], revision: 2 }],
        },
        actor.id,
      ),
    ),
  );
  assert.equal(
    raceMove.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    await db.stockMovement.count({ where: { productId: product.id } }),
    4,
    "failed stock writes roll back their ledger rows",
  );
  const transferProduct = await db.product.create({
    data: {
      sku: `transfer-${tag}`,
      nameEn: "Transfer unit",
      nameAr: "وحدة نقل",
    },
  });
  await db.stockLevel.create({
    data: { productId: transferProduct.id, locationId: location.id, onHand: 3 },
  });
  const transferLabels = {
    ...input,
    productId: transferProduct.id,
    quantity: 3,
    idempotencyKey: randomUUID(),
  };
  await generateSerialLabels(transferLabels, actor.id);
  const transferGeneration = await db.serialGeneration.findUniqueOrThrow({
    where: { idempotencyKey: transferLabels.idempotencyKey },
    include: { serials: true },
  });
  const transferCodes = transferGeneration.serials.map((s) => s.code);
  await verifyGeneratedSerials(transferGeneration.id, transferCodes, actor.id);
  const destinationBranch = await db.branch.create({
    data: {
      code: `D-${tag.slice(0, 12)}`,
      name: "Destination branch",
      timeZone: "UTC",
    },
  });
  // Modules live in the system service (backend/services/system); this check needs the backend stack.
  await require("../packages/database/src/queries/features.ts").updateFeatureToggle("products", true, "check-operations");
  const receiver = await db.user.create({
    data: {
      email: `receiver-${tag}@example.test`,
      fullName: "Receiver",
      passwordHash: "not-a-login-hash",
      role: "viewer",
      permissions: { "inventory:read": true, "inventory:edit": true },
    },
  });
  await db.branchGrant.create({
    data: { branchId: destinationBranch.id, userId: receiver.id },
  });
  await assert.rejects(
    requireBranchAccess(receiver.id, "legacy-main"),
    /denied/,
  );
  const destinationWarehouse = await db.warehouse.create({
    data: {
      code: `dest-${tag}`,
      nameEn: "Destination",
      nameAr: "وجهة",
      branchId: destinationBranch.id,
    },
  });
  const receiving = await db.stockLocation.create({
    data: { warehouseId: destinationWarehouse.id, code: "RECEIVING" },
  });
  const transit = await db.stockLocation.create({
    data: { warehouseId: warehouse.id, code: "TRANSIT" },
  });
  const request = {
    sourceLocationId: location.id,
    transitLocationId: transit.id,
    destinationLocationId: receiving.id,
    codes: transferCodes,
    idempotencyKey: randomUUID(),
  };
  const transfer = await requestSerialTransfer(request, actor.id);
  assert.deepEqual(await requestSerialTransfer(request, actor.id), transfer);
  await assert.rejects(
    dispatchSerialTransfer(
      { allocationId: transfer.id, revision: 1, idempotencyKey: randomUUID() },
      actor.id,
    ),
    /changed/,
  );
  await assert.rejects(
    approveSerialTransfer(
      { allocationId: transfer.id, revision: 1, idempotencyKey: randomUUID() },
      outsider.id,
    ),
    /denied/,
  );
  const approved = await approveSerialTransfer(
    { allocationId: transfer.id, revision: 1, idempotencyKey: randomUUID() },
    actor.id,
  );
  const dispatch = {
    allocationId: transfer.id,
    revision: approved.revision,
    idempotencyKey: randomUUID(),
  };
  const [dispatched, dispatchRetry] = await Promise.all([
    dispatchSerialTransfer(dispatch, actor.id),
    dispatchSerialTransfer(dispatch, actor.id),
  ]);
  assert.deepEqual(dispatched, dispatchRetry);
  const handoverInput = {
    allocationId: transfer.id,
    revision: dispatched.revision,
    stage: "collection",
  };
  const preview = await previewStockHandover(handoverInput, actor.id);
  const sign = {
    ...handoverInput,
    manifestHash: preview.hash,
    signature: testSignature,
  };
  await assert.rejects(
    acknowledgeStockHandover({ ...sign, manifestHash: "tampered" }, actor.id),
    /manifest changed/,
  );
  await assert.rejects(acknowledgeStockHandover(sign, outsider.id), /denied/);
  const [signed, signedRetry] = await Promise.all([
    acknowledgeStockHandover(sign, actor.id),
    acknowledgeStockHandover(sign, actor.id),
  ]);
  assert.equal(signed.id, signedRetry.id);
  assert.equal(
    (await db.stockAllocation.findUniqueOrThrow({ where: { id: transfer.id } }))
      .status,
    "in_transit",
    "collection is not destination receipt",
  );
  await assert.rejects(
    db.stockAcknowledgment.update({
      where: { id: signed.id },
      data: { statement: "changed" },
    }),
    /immutable/,
  );
  await assert.rejects(
    db.stockAcknowledgment.delete({ where: { id: signed.id } }),
    /immutable/,
  );

  const transitLevel = await db.stockLevel.findFirstOrThrow({
    where: { productId: transferProduct.id, locationId: transit.id },
  });
  assert.equal(transitLevel.onHand.toString(), "3");
  assert.equal(transitLevel.reserved.toString(), "3");
  assert.equal(
    await db.stockLevel.count({
      where: { productId: transferProduct.id, locationId: receiving.id },
    }),
    0,
  );
  await assert.rejects(
    runAtomicMutation(() =>
      postMovements(
        db,
        [
          {
            type: "sale",
            productId: transferProduct.id,
            locationId: transit.id,
            quantity: -1,
          },
        ],
        actor.id,
      ),
    ),
    /stock|Stock/,
  );
  const missing={allocationId:transfer.id,revision:dispatched.revision,codes:[transferCodes[2]],reason:"Not found during unloading",idempotencyKey:randomUUID()};
  const reported=await reportMissingTransferUnits(missing,receiver.id);
  assert.deepEqual(await reportMissingTransferUnits(missing,receiver.id),reported);
  assert.equal((await db.stockLevel.findUniqueOrThrow({where:{id:transitLevel.id}})).onHand.toString(),"3");
  dispatched.revision=reported.revision;
  const receipt = {
    allocationId: transfer.id,
    revision: dispatched.revision,
    codes: [transferCodes[0]],
    idempotencyKey: randomUUID(),
  };
  const partial = await receiveSerialTransfer(receipt, receiver.id);
  await assert.rejects(
    previewStockHandover(handoverInput, actor.id),
    /changed/,
  );
  const partialManifest = await previewStockHandover(
    { allocationId: transfer.id, revision: partial.revision, stage: "receipt" },
    receiver.id,
  );
  assert.equal(partialManifest.manifest.lines[0].received, "1");
  assert.equal(partialManifest.manifest.lines[0].outstanding, "2");
  await acknowledgeStockHandover(
    {
      allocationId: transfer.id,
      revision: partial.revision,
      stage: "receipt",
      manifestHash: partialManifest.hash,
      signature: testSignature,
    },
    receiver.id,
  );
  assert.equal(
    (
      await db.stockAcknowledgment.findUniqueOrThrow({
        where: { id: signed.id },
      })
    ).manifestHash,
    preview.hash,
  );

  assert.deepEqual(await receiveSerialTransfer(receipt, receiver.id), partial);
  assert.equal(
    (await db.stockAllocation.findUniqueOrThrow({ where: { id: transfer.id } }))
      .status,
    "partially_received",
  );
  assert.equal(
    (
      await db.stockLevel.findUniqueOrThrow({ where: { id: transitLevel.id } })
    ).reserved.toString(),
    "2",
  );
  await assert.rejects(
    receiveSerialTransfer(
      { ...receipt, revision: partial.revision, idempotencyKey: randomUUID() },
      receiver.id,
    ),
    /outstanding/,
  );
  await assert.rejects(
    receiveSerialTransfer(
      {
        ...receipt,
        revision: partial.revision,
        codes: [codes[0]],
        idempotencyKey: randomUUID(),
      },
      receiver.id,
    ),
    /outstanding/,
  );
  const receiptRace = await Promise.allSettled(
    [transferCodes[1], transferCodes[2]].map((code) =>
      receiveSerialTransfer(
        {
          ...receipt,
          revision: partial.revision,
          codes: [code],
          idempotencyKey: randomUUID(),
        },
        receiver.id,
      ),
    ),
  );
  assert.equal(
    receiptRace.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const remaining = await db.stockSerial.findMany({
    where: { productId: transferProduct.id, status: "in_transit" },
  });
  const currentTransfer = await db.stockAllocation.findUniqueOrThrow({
    where: { id: transfer.id },
  });
  await receiveSerialTransfer(
    {
      ...receipt,
      revision: currentTransfer.revision,
      codes: remaining.map((s) => s.code),
      idempotencyKey: randomUUID(),
    },
    receiver.id,
  );
  assert.equal(
    (await db.stockAllocation.findUniqueOrThrow({ where: { id: transfer.id } }))
      .status,
    "received",
  );
  assert.equal(
    (
      await db.stockLevel.findFirstOrThrow({
        where: { productId: transferProduct.id, locationId: receiving.id },
      })
    ).onHand.toString(),
    "3",
  );
  assert.equal(
    (
      await db.stockLevel.aggregate({
        where: { productId: transferProduct.id },
        _sum: { onHand: true },
      })
    )._sum.onHand.toString(),
    "3",
  );
  const latest=await db.stockAllocation.findUniqueOrThrow({where:{id:transfer.id}});
  const closingTransfer={allocationId:transfer.id,revision:latest.revision,idempotencyKey:randomUUID()};
  await assert.rejects(closeSerialTransfer(closingTransfer,actor.id),/acknowledgment/);
  const fullManifest=await previewStockHandover({allocationId:transfer.id,revision:latest.revision,stage:"receipt"},receiver.id);
  await acknowledgeStockHandover({allocationId:transfer.id,revision:latest.revision,stage:"receipt",manifestHash:fullManifest.hash,signature:testSignature},receiver.id);
  const [closedTransfer,closedTransferRetry]=await Promise.all([closeSerialTransfer(closingTransfer,actor.id),closeSerialTransfer(closingTransfer,actor.id)]);
  assert.deepEqual(closedTransfer,closedTransferRetry);
  assert.equal((await db.stockAllocation.findUniqueOrThrow({where:{id:transfer.id}})).status,"closed");
  const { getTransferWorkspace }=require("../packages/database/src/queries/transfer-workspace.ts");
  const scopedWorkspace=await getTransferWorkspace(receiver.id);
  assert.ok(scopedWorkspace.transfers.some(t=>t.id===transfer.id));
  assert.ok(!scopedWorkspace.locations.some(l=>l.id===location.id));
  await assert.rejects(db.stockTraceEvent.delete({where:{id:`stock-transfer:${missing.idempotencyKey}`}}),/immutable/);
  const bulk=await db.product.create({data:{sku:`bulk-${tag}`,nameEn:"Bulk test",nameAr:"اختبار الكمية"}});
  await runAtomicMutation(()=>postMovements(db,[{type:"receipt",productId:bulk.id,locationId:location.id,quantity:0.123456,unitCost:2}],actor.id));
  assert.equal((await db.stockLevel.findFirstOrThrow({where:{productId:bulk.id}})).onHand.toString(),"0.123456");
  await runAtomicMutation(()=>postMovements(db,[{type:"adjustment",productId:bulk.id,locationId:location.id,quantity:-0.000001}],actor.id));
  assert.equal((await db.stockLevel.findFirstOrThrow({where:{productId:bulk.id}})).onHand.toString(),"0.123455");
  const {listWarehouses,listMovements,getStockOverview,expiringBatches,getStockCount,getProductStock}=require("../packages/database/src/queries/inventory.ts");
  const {requireWarehouseAccess,requireStockCountAccess,requireStockLocationAccess}=require("../packages/database/src/queries/branches.ts");
  assert.ok(!(await listWarehouses(receiver.id)).some(w=>w.id===warehouse.id));
  await assert.rejects(listMovements({warehouseId:warehouse.id},receiver.id),/denied/);
  await assert.rejects(getStockOverview({warehouseId:warehouse.id},receiver.id),/denied/);
  await assert.rejects(requireWarehouseAccess(receiver.id,warehouse.id,"edit"),/denied/);

  // Verify forged warehouse, location and count IDs are denied
  const forgedWarehouseId = "00000000-0000-0000-0000-000000000000";
  const forgedLocationId = "00000000-0000-0000-0000-000000000001";
  const forgedCountId = "00000000-0000-0000-0000-000000000002";
  await assert.rejects(requireWarehouseAccess(receiver.id, forgedWarehouseId, "read"), /unavailable|denied/);
  await assert.rejects(requireStockLocationAccess(receiver.id, forgedLocationId, false), /unavailable|denied/);
  await assert.rejects(requireStockLocationAccess(receiver.id, location.id, false), /denied/);
  await assert.rejects(requireStockCountAccess(receiver.id, forgedCountId, "read"), /unavailable|denied/);
  await assert.rejects(getStockCount(forgedCountId, receiver.id), /unavailable|denied/);
  await assert.rejects(listMovements({ warehouseId: forgedWarehouseId }, receiver.id), /denied/);
  await assert.rejects(getStockOverview({ warehouseId: forgedWarehouseId }, receiver.id), /denied/);

  // Cross-branch count access denial
  const otherCount = await db.stockCount.create({
    data: {
      number: `SC-${tag.slice(0, 10)}`,
      warehouseId: warehouse.id,
      scope: "full",
      status: "draft",
      createdById: actor.id,
    },
  });
  await assert.rejects(requireStockCountAccess(receiver.id, otherCount.id, "read"), /denied/);
  await assert.rejects(getStockCount(otherCount.id, receiver.id), /denied/);

  const scopedLedger=await listMovements({productId:transferProduct.id},receiver.id);
  assert.ok(scopedLedger.rows.length > 0, "scoped ledger must have receiver movements");
  assert.ok(scopedLedger.rows.every(row=>row.location_id===receiving.id));
  const destinationMovementIds = (await db.stockMovement.findMany({
    where: { locationId: receiving.id, productId: transferProduct.id },
    select: { id: true },
  })).map(m => m.id);
  assert.ok(destinationMovementIds.length > 0);
  assert.deepEqual(
    scopedLedger.rows.map(r => r.id).sort(),
    destinationMovementIds.sort(),
  );

  const productStockForReceiver = await getProductStock(transferProduct.id, receiver.id);
  assert.ok(productStockForReceiver.levels.length > 0);
  assert.ok(productStockForReceiver.levels.every(l => l.location_id === receiving.id));
  assert.ok(productStockForReceiver.movements.length > 0);
  assert.ok(productStockForReceiver.movements.every(m => m.location_id === receiving.id));

  // Cross-branch location access in receiving goods denied
  await assert.rejects(requireStockLocationAccess(receiver.id, location.id, true), /denied/);
  const periodName = "Operations test 2099";
  let period = await db.accountingPeriod.findUnique({
    where: { name: periodName },
  });
  if (!period)
    period = await createAccountingPeriod(
      { name: periodName, startsOn: "2099-01-01", endsOn: "2099-12-31" },
      actor.id,
    );
  await assert.rejects(
    createAccountingPeriod(
      { name: tag, startsOn: "2099-01-15", endsOn: "2099-02-15" },
      actor.id,
    ),
    /overlap/,
  );
  const cash = await db.accountingAccount.create({
    data: { code: `cash-${tag}`, name: "Cash", kind: "asset" },
  });
  const sales = await db.accountingAccount.create({
    data: { code: `sales-${tag}`, name: "Sales", kind: "income" },
  });
  const posting = {
    sourceKey: tag,
    postingDate: "2099-06-01",
    currency: "BHD",
    memo: "Test posting",
    branchId: "legacy-main",
    lines: [
      { accountId: cash.id, debit: "1.234", credit: "0" },
      { accountId: sales.id, debit: "0", credit: "1.234" },
    ],
  };
  const [journal, duplicate] = await Promise.all([
    postJournal(posting, actor.id),
    postJournal(posting, actor.id),
  ]);
  assert.equal(journal.id, duplicate.id);
  await assert.rejects(
    postJournal({ ...posting, memo: "changed" }, actor.id),
    /different values/,
  );
  await assert.rejects(
    db.journalEntry.update({
      where: { id: journal.id },
      data: { memo: "tampered" },
    }),
    /immutable/,
  );
  await assert.rejects(
    db.journalEntry.delete({ where: { id: journal.id } }),
    /immutable/,
  );
  await assert.rejects(
    db.journalLine.create({
      data: { entryId: journal.id, accountId: cash.id, debit: 1, credit: 0 },
    }),
    /append lines/,
  );
  await assert.rejects(
    db.journalEntry.create({
      data: {
        sourceKey: `empty-${tag}`,
        requestHash: tag,
        periodId: period.id,
        postingDate: new Date("2099-06-01"),
        currency: "BHD",
        memo: "Empty",
        createdById: actor.id,
      },
    }),
    /balanced/,
  );
  await assert.rejects(
    postJournal(
      {
        ...posting,
        sourceKey: randomUUID(),
        lines: [posting.lines[0], { ...posting.lines[1], credit: "1.233" }],
      },
      actor.id,
    ),
    /balance/,
  );
  await assert.rejects(
    postJournal({ ...posting, sourceKey: randomUUID() }, outsider.id),
    /super administrator/,
  );
  const reversalInput = {
    entryId: journal.id,
    sourceKey: `reverse-${tag}`,
    postingDate: "2099-06-02",
    reason: "Duplicate sale",
  };
  const [reversal, reversalRetry] = await Promise.all([
    reverseJournal(reversalInput, actor.id),
    reverseJournal(reversalInput, actor.id),
  ]);
  assert.equal(reversal.id, reversalRetry.id);
  const reversed = await db.journalEntry.findUniqueOrThrow({
    where: { id: reversal.id },
    include: { lines: true },
  });
  assert.equal(reversed.reversalOfId, journal.id);
  assert.equal(
    reversed.lines.find((line) => line.accountId === cash.id).credit.toString(),
    "1.234",
  );
  await assert.rejects(
    reverseJournal({ ...reversalInput, sourceKey: `other-${tag}` }, actor.id),
    /already been reversed/,
  );
  await assert.rejects(
    reverseJournal({ ...reversalInput, reason: "Changed reason" }, actor.id),
    /different values/,
  );
  await assert.rejects(
    reverseJournal({ ...reversalInput, entryId: reversal.id }, actor.id),
    /cannot itself/,
  );
  // Each run gets a distinct non-overlapping date so closed-period tests can be repeated.
  const last = await db.accountingPeriod.findFirst({
    where: { startsOn: { gte: new Date("2100-01-01") } },
    orderBy: { endsOn: "desc" },
  });
  const closeDate = new Date(
    last ? last.endsOn.getTime() + 86400000 : Date.UTC(2100, 0, 1),
  )
    .toISOString()
    .slice(0, 10);
  const closing = await createAccountingPeriod(
    { name: `Close ${tag}`, startsOn: closeDate, endsOn: closeDate },
    actor.id,
  );
  await assert.rejects(
    closeAccountingPeriod(closing.id, outsider.id),
    /super administrator/,
  );
  const closeRace = await Promise.allSettled([
    postJournal(
      { ...posting, sourceKey: `close-race-${tag}`, postingDate: closeDate },
      actor.id,
    ),
    closeAccountingPeriod(closing.id, actor.id),
  ]);
  assert.equal(closeRace[1].status, "fulfilled");
  if (closeRace[0].status === "rejected")
    assert.match(closeRace[0].reason.message, /open accounting period/);
  const closed = await closeAccountingPeriod(closing.id, actor.id);
  assert.equal(closed.status, "closed");
  assert.equal(
    closed.closedAt.toISOString(),
    closeRace[1].value.closedAt.toISOString(),
  );
  await assert.rejects(
    postJournal(
      { ...posting, sourceKey: `late-${tag}`, postingDate: closeDate },
      actor.id,
    ),
    /open accounting period/,
  );
  await assert.rejects(
    db.accountingPeriod.update({
      where: { id: closing.id },
      data: { status: "open", closedAt: null, closedById: null },
    }),
    /immutable/,
  );
  await assert.rejects(
    db.accountingPeriod.delete({ where: { id: closing.id } }),
    /immutable/,
  );
  await assert.rejects(
    db.accountingPeriod.update({
      where: { id: period.id },
      data: { endsOn: new Date("2099-12-30") },
    }),
    /immutable/,
  );
  await assert.rejects(
    db.accountingPeriod.create({
      data: {
        name: `raw-overlap-${tag}`,
        startsOn: new Date("2099-06-01"),
        endsOn: new Date("2099-06-15"),
      },
    }),
    /exclusion|overlap/i,
  );

  // ─── Retail, Shifts, Sessions & Five-level Closing ────────────────────────
  const {
    saveRegister, listRegisters, saveDrawer, listDrawers,
    openRetailShift, closeRetailShift,
    openCashierSession, closeCashierSession,
    recordPaymentCollection, reversePaymentCollection,
    performRetailClosing,
  } = require("../packages/database/src/queries/retail.ts");

  const reg = await saveRegister({ branchId: destinationBranch.id, code: `R-${tag.slice(0, 10)}`, name: "Checkout 1" }, actor.id);
  const drw = await saveDrawer({ registerId: reg.id, code: `D-${tag.slice(0, 10)}`, name: "Drawer 1", openingFloat: 50 }, actor.id);
  assert.equal(drw.registerId, reg.id);
  assert.ok((await listRegisters(destinationBranch.id, actor.id)).some(r => r.id === reg.id));

  const shift = await openRetailShift(destinationBranch.id, actor.id);
  assert.equal(shift.status, "open");

  const session = await openCashierSession({ registerId: reg.id, drawerId: drw.id, openingFloat: 50, shiftId: shift.id }, actor.id);
  assert.equal(session.status, "open");

  const collection = await recordPaymentCollection({
    branchId: destinationBranch.id,
    sessionId: session.id,
    amount: "15.000",
    currency: "BHD",
    methodCode: "cash",
  }, actor.id);
  assert.equal(collection.amount.toFixed(6), "15.000000");

  const closedSession = await closeCashierSession({
    sessionId: session.id,
    closingFloat: "50.000",
    actualCash: "65.000",
  }, actor.id);
  assert.equal(closedSession.status, "closed");
  assert.equal(closedSession.cashDifference.toFixed(6), "0.000000");

  const closedShift = await closeRetailShift(shift.id, actor.id);
  assert.equal(closedShift.status, "closed");

  // 5-level closings
  const drawerClose = await performRetailClosing({
    branchId: destinationBranch.id,
    level: "drawer",
    targetId: drw.id,
    businessDate: "2099-06-01",
  }, actor.id);
  assert.equal(drawerClose.level, "drawer");

  const sessionClose = await performRetailClosing({
    branchId: destinationBranch.id,
    level: "session",
    targetId: session.id,
    businessDate: "2099-06-01",
  }, actor.id);
  assert.equal(sessionClose.level, "session");

  const shiftClose = await performRetailClosing({
    branchId: destinationBranch.id,
    level: "shift",
    targetId: shift.id,
    businessDate: "2099-06-01",
  }, actor.id);
  assert.equal(shiftClose.level, "shift");

  const dayClose = await performRetailClosing({
    branchId: destinationBranch.id,
    level: "day",
    targetId: destinationBranch.id,
    businessDate: "2099-06-01",
  }, actor.id);
  assert.equal(dayClose.level, "day");

  await assert.rejects(
    db.retailClosing.delete({ where: { id: dayClose.id } }),
    /immutable/,
  );

  // ─── Operational Posting Adapters ─────────────────────────────────────────
  const {
    postSaleJournal, postPaymentCollectionJournal, postInventoryAdjustmentJournal,
  } = require("../packages/database/src/finance/operational-posting.ts");

  const saleJournal = await postSaleJournal({
    orderId: `order-${tag}`,
    orderNumber: `SO-${tag.slice(0, 8)}`,
    total: "11.000",
    subtotal: "10.000",
    vatAmount: "1.000",
    currency: "BHD",
    postingDate: "2099-06-01",
    branchId: "legacy-main",
    isPaid: true,
  }, actor.id);
  assert.ok(saleJournal.id);

  const paymentJournal = await postPaymentCollectionJournal({
    collectionId: collection.id,
    collectionNumber: collection.number,
    amount: "15.000",
    currency: "BHD",
    postingDate: "2099-06-01",
    branchId: "legacy-main",
    method: "cash",
  }, actor.id);
  assert.ok(paymentJournal.id);

  const adjJournal = await postInventoryAdjustmentJournal({
    adjustmentId: `adj-${tag}`,
    reference: `REF-${tag.slice(0, 8)}`,
    amount: "5.000",
    currency: "BHD",
    postingDate: "2099-06-01",
    branchId: "legacy-main",
    isPositive: false,
  }, actor.id);
  assert.ok(adjJournal.id);

  // ─── Historical Commissions ───────────────────────────────────────────────
  const {
    createCommissionRule, recordCommissionSnapshot, reverseCommissionSnapshot, listCommissionSnapshots,
  } = require("../packages/database/src/queries/commissions.ts");

  const commRule = await createCommissionRule({
    code: `COMM-${tag.slice(0, 8)}`,
    name: "Standard Sales 5%",
    rate: "0.05",
    effectiveFrom: "2099-01-01",
  }, actor.id);
  assert.equal(commRule.rate.toFixed(4), "0.0500");

  const commSnapshot = await recordCommissionSnapshot({
    orderId: `order-${tag}`,
    attributedUserId: actor.id,
    basisAmount: "100.000",
    currency: "BHD",
    ruleCode: commRule.code,
  }, actor.id);
  assert.equal(commSnapshot.commissionAmount.toFixed(6), "5.000000");

  const commReversal = await reverseCommissionSnapshot(commSnapshot.id, "Order cancelled", actor.id);
  assert.equal(commReversal.status, "reversed");
  assert.equal(commReversal.commissionAmount.toFixed(6), "-5.000000");

  await assert.rejects(
    db.commissionSnapshot.delete({ where: { id: commSnapshot.id } }),
    /immutable/,
  );

  // ─── Regional Store & Carts ───────────────────────────────────────────────
  const {
    saveStoreRegion, getStoreRegion, resolveRegionalPrice,
  } = require("../packages/database/src/queries/regional-store.ts");

  const region = await saveStoreRegion({
    code: `R-${tag.slice(0, 6)}`,
    nameEn: "Saudi Arabia",
    nameAr: "المملكة العربية السعودية",
    currency: "SAR",
    branchId: destinationBranch.id,
    priceMultiplier: "10.0000",
  }, actor.id);
  assert.equal(region.currency, "SAR");

  const regionalPrice = await resolveRegionalPrice("5.000", region.code);
  assert.equal(regionalPrice.toFixed(4), "50.0000");

  // ─── Packaging & Physical Manifests ───────────────────────────────────────
  const {
    createStockPackage, packSerialsIntoPackage, sealStockPackage, moveStockPackage, unpackStockPackage,
  } = require("../packages/database/src/queries/packages.ts");

  const pkg = await createStockPackage({
    code: `PKG-${tag.slice(0, 8)}`,
    kind: "carton",
    locationId: receiving.id,
  }, actor.id);
  assert.equal(pkg.status, "open");

  const destSerials = (await db.stockSerial.findMany({
    where: { locationId: receiving.id },
    take: 2,
  })).map(s => s.code);
  if (destSerials.length > 0) {
    const packed = await packSerialsIntoPackage(pkg.id, destSerials, actor.id);
    assert.equal(packed.count, destSerials.length);

    const sealed = await sealStockPackage(pkg.id, `SEAL-${tag.slice(0, 6)}`, actor.id);
    assert.equal(sealed.status, "sealed");

    const shelf = await db.stockLocation.create({
      data: { warehouseId: destinationWarehouse.id, code: `SHELF-${tag.slice(0, 4)}` },
    });
    const movedPkg = await moveStockPackage(pkg.id, shelf.id, actor.id);
    assert.equal(movedPkg.locationId, shelf.id);

    const relocatedSerials = await db.stockSerial.findMany({
      where: { code: { in: destSerials } },
    });
    assert.ok(relocatedSerials.every(s => s.locationId === shelf.id));

    const unpacked = await unpackStockPackage(pkg.id, actor.id);
    assert.equal(unpacked.status, "unpacked");
    const unpackedSerials = await db.stockSerial.findMany({
      where: { code: { in: destSerials } },
    });
    assert.ok(unpackedSerials.every(s => s.packageId === null));

    // Serialized Sales and Returns tests
    const { fulfillSerializedOrder, returnSerializedOrder, getAvailableSerials } = require("../packages/database/src/queries/serialized-sales.ts");
    const testSalesOrder = await db.salesOrder.create({
      data: {
        number: `SO-${tag.slice(0, 10)}`,
        name: "Test Customer",
        currency: "BHD",
        paymentMethod: "cash",
        subtotal: 10,
        total: 10,
        warehouseId: destinationWarehouse.id,
        lines: {
          create: [
            {
              productId: transferProduct.id,
              sku: transferProduct.sku,
              description: "Serialized test line",
              quantity: 1,
              unitPrice: 10,
              lineTotal: 10,
              locationId: shelf.id,
            },
          ],
        },
      },
      include: { lines: true },
    });

    const testLine = testSalesOrder.lines[0];
    const targetSerial = destSerials[0];

    // Mismatched serial count rejected
    await assert.rejects(
      fulfillSerializedOrder(testSalesOrder.id, [{ lineId: testLine.id, serialCodes: [] }], actor.id),
      /Serial count does not match line quantity/,
    );

    // Fulfill serialized sales order
    const fulfilled = await fulfillSerializedOrder(
      testSalesOrder.id,
      [{ lineId: testLine.id, serialCodes: [targetSerial] }],
      actor.id,
    );
    assert.ok(fulfilled.fulfilled);

    const soldSerial = await db.stockSerial.findUniqueOrThrow({ where: { code: targetSerial } });
    assert.equal(soldSerial.status, "sold");
    assert.equal(soldSerial.locationId, null);

    // Return serialized item
    const returned = await returnSerializedOrder(
      testSalesOrder.id,
      [{ lineId: testLine.id, serialCodes: [targetSerial], locationId: shelf.id, reason: "correction" }],
      actor.id,
    );
    assert.ok(returned.returned);

    const returnedSerial = await db.stockSerial.findUniqueOrThrow({ where: { code: targetSerial } });
    assert.equal(returnedSerial.status, "available");
    assert.equal(returnedSerial.locationId, shelf.id);
  }

  const protectedTables =
    await db.$queryRaw`SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relrowsecurity AND relname IN ('StockSerial','LabelPrintJob','JournalEntry','JournalLine','BranchGrant','RetailRegister','CashDrawer','CashierSession','RetailShift','RetailClosing','PaymentMethodConfig','PaymentCollection','CommissionRule','CommissionSnapshot','StoreRegion')`;
  assert.equal(protectedTables.length, 15);
  console.log(
    "Operations DB checks passed: branch isolation, serial generation/retry/race/stock conservation, journal balance/idempotency/immutability period overlap/close races, reversal retries and API row-security coverage.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
