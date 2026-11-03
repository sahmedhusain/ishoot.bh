import assert from "node:assert/strict";
type PrismaClient = any;
type Product = any;
import { ACTIVITY_SAMPLES } from "../../apps/admin/lib/database/samples/activity-samples";
import { ACTIVITY_PRESETS } from "../../apps/admin/lib/database/website-presets";
import {
  saveProduct,
  saveProductCategory,
} from "../../apps/admin/lib/database/queries/products";
import {
  ensureDefaultWarehouse,
  saveWarehouse,
  saveLocation,
  changeStock,
  transferStock,
  setReorderPoint,
  createStockCount,
  recordCountedQuantities,
  setStockCountStatus,
  approveStockCount,
} from "../../apps/admin/lib/database/queries/inventory";
import {
  saveSupplier,
  savePurchaseOrder,
  submitPurchaseOrder,
  markPurchaseOrderSent,
  cancelPurchaseOrder,
  saveRequisition,
  createRfq,
  saveRfqQuotes,
} from "../../apps/admin/lib/database/queries/procurement";
import {
  receiveGoods,
  saveSupplierBill,
  approveSupplierBill,
  recordSupplierPayment,
} from "../../apps/admin/lib/database/queries/procurement-billing";
import {
  saveStoreSettings,
  saveCoupon,
  placeOrder,
  moveOrder,
  recordOrderPayment,
  recordOrderRefund,
} from "../../apps/admin/lib/database/queries/store";
import { moveShipment } from "../../apps/admin/lib/database/queries/shipments";
import {
  assignShipment,
  createRouteSheet,
  startRouteSheet,
  closeRouteSheet,
  settleCash,
} from "../../apps/admin/lib/database/queries/fleet";
import {
  saveCourierAgency,
  handToAgency,
} from "../../apps/admin/lib/database/queries/couriers";
import { createEmployee } from "../../apps/admin/lib/database/queries/hrms";
import {
  saveProject,
  saveTask,
  addTaskComment,
} from "../../apps/admin/lib/database/queries/tasks";
import {
  saveCampaign,
  saveSegment,
  saveBroadcast,
} from "../../apps/admin/lib/database/queries/marketing";
import {
  saveLegalMatter,
  addLegalNote,
} from "../../apps/admin/lib/database/queries/legal";
import {
  saveRegister,
  saveDrawer,
  openRetailShift,
  closeRetailShift,
  openCashierSession,
  closeCashierSession,
  recordPaymentCollection,
  performRetailClosing,
} from "../../apps/admin/lib/database/queries/retail";
import {
  createStockPackage,
  packSerialsIntoPackage,
  sealStockPackage,
  moveStockPackage,
} from "../../apps/admin/lib/database/queries/packages";
import { saveStoreRegion } from "../../apps/admin/lib/database/queries/regional-store";
import {
  createCommissionRule,
  recordCommissionSnapshot,
} from "../../apps/admin/lib/database/queries/commissions";
import { decideApprovalRequest } from "../../apps/admin/lib/database/services/approval-engine";
import type { DemoPreset } from "./demo-presets";

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** Fixtures use real mutations for money, stock and workflow transitions; no integrations are contacted. */
export async function seedOperations(
  db: PrismaClient,
  preset: DemoPreset,
  users: {
    ownerId: string;
    financeId: string;
    staffId: string;
    passwordHash: string;
  },
) {
  const { ownerId, financeId, staffId } = users;
  const enabled = (key: string) =>
    preset.modules.some(
      (module) => module.moduleKey === key && module.isEnabled,
    );
  const images = (
    await db.heroBanner.findMany({ orderBy: { displayOrder: "asc" } })
  ).map((banner) => banner.mediaUrl);
  const products: Product[] = [];
  const warehouse = enabled("products") ? await ensureDefaultWarehouse() : null;
  const locationId = warehouse?.locations[0].id;
  await db.serviceSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      slaUrgentHours: 4,
      slaHighHours: 24,
      slaNormalHours: 72,
    },
  });
  for (const [sortOrder, title] of [
    "Request received",
    "More details needed",
    "Appointment confirmed",
    "Order update",
    "Refund update",
    "Issue resolved",
  ].entries()) {
    await db.cannedReply.create({
      data: {
        title,
        bodyEn:
          "Thank you for contacting us. Our team is reviewing your request and will share an update shortly.",
        bodyAr: "شكرًا لتواصلكم. يراجع فريقنا طلبكم وسنوافيكم بالتحديث قريبًا.",
        sortOrder,
      },
    });
  }

  if (warehouse && locationId) {
    const overflow = await saveWarehouse({
      code: "DEMO-OUTLET",
      nameEn: "Retail outlet",
      nameAr: "فرع البيع",
      address: "Riffa, Bahrain",
      isActive: true,
      isDefault: false,
    });
    const shelf = await saveLocation({
      warehouseId: overflow.id,
      code: "DISPLAY",
      name: "Display shelf",
      isActive: true,
    });
    const activities = preset.activities.filter(
      (activity) => ACTIVITY_PRESETS[activity].modules.products,
    );
    for (const activity of activities) {
      const sample = ACTIVITY_SAMPLES[activity];
      const category = await saveProductCategory({
        nameEn: sample.banner.title[0],
        nameAr: sample.banner.title[1],
        parentId: "",
        isActive: true,
      });
      for (let i = 0; i < 12; i++) {
        const item =
          activity === "beauty" && i >= 4
            ? {
                title: ["Aftercare kit", "مجموعة العناية"],
                subtitle: ["Home care essentials", "أساسيات العناية المنزلية"],
                price: 12 + i,
              }
            : sample.items[i % sample.items.length];
        const sku = `DEMO-${activity.toUpperCase()}-${i + 1}`;
        const price = item.price ?? 25 + i * 5;
        const variant = i === 8;
        const trackStock = !(
          (activity === "beauty" && i < 4) ||
          (activity === "automotive" && i % 4 === 3) ||
          (activity === "online_store" && i % 4 === 3)
        );
        const trackBatches =
          trackStock && ["food", "pharmacy"].includes(activity) && i >= 9;
        const product = await saveProduct(
          {
            sku,
            barcode: "",
            nameEn: `${item.title[0]}${i >= 4 ? ` ${i + 1}` : ""}`,
            nameAr: `${item.title[1]}${i >= 4 ? ` ${i + 1}` : ""}`,
            descriptionEn: item.subtitle[0],
            descriptionAr: item.subtitle[1],
            categoryId: category.id,
            brand: "",
            unit: trackStock ? "piece" : "service",
            cost: (price * 0.6).toFixed(3),
            price: price.toFixed(3),
            vatExempt: activity === "pharmacy" && i % 2 === 0,
            imageUrls: [images[i % images.length]],
            options: variant
              ? [
                  {
                    nameEn: "Size",
                    nameAr: "الحجم",
                    values: [
                      { en: "Small", ar: "صغير" },
                      { en: "Large", ar: "كبير" },
                    ],
                  },
                ]
              : [],
            variants: variant
              ? ["Small", "Large"].map((size) => ({
                  sku: `${sku}-${size.toUpperCase()}`,
                  barcode: "",
                  optionValues: [size],
                  price: "",
                  cost: "",
                  isActive: true,
                }))
              : [],
            trackStock,
            trackBatches,
            isActive: i !== 11,
          },
          ownerId,
        );
        products.push(product);
        // Link the matching website item; avoid duplicating it through setProductOnWebsite.
        const catalogue = await db.portfolioItem.findUnique({
          where: { slug: `demo-${activity}-${i + 1}` },
        });
        if (catalogue && product.isActive) {
          await db.product.update({
            where: { id: product.id },
            data: { catalogueItemId: catalogue.id },
          });
          await db.portfolioItem.update({
            where: { id: catalogue.id },
            data: { price: (product as any).price },
          });
        }
        if (!trackStock) continue;
        const variants = await db.productVariant.findMany({
          where: { productId: product.id },
        });
        for (const variantId of variants.length
          ? variants.map((v) => v.id)
          : [undefined]) {
          await setReorderPoint(product.id, variantId ?? "", 10, 40);
          if (i === 6 || i === 11) continue; // explicit out-of-stock and inactive cases
          const quantity = i === 5 ? 4 : 300;
          await changeStock(
            {
              type: "receipt",
              productId: product.id,
              variantId,
              locationId,
              quantity,
              unitCost: Number((product as any).cost),
              ...(trackBatches
                ? {
                    batchNumber: `LOT-${i}`,
                    expiryDate: day(i === 9 ? -5 : 12),
                  }
                : {}),
              note: "Demo opening stock",
            },
            ownerId,
          );
          if (i === 0) {
            await transferStock(
              {
                productId: product.id,
                fromLocationId: locationId,
                toLocationId: shelf.id,
                quantity: 15,
                note: "Replenish the outlet",
              },
              ownerId,
            );
            await changeStock(
              {
                type: "write_off",
                productId: product.id,
                locationId: shelf.id,
                quantity: 1,
                reason: "damaged",
                note: "Packaging damaged during transfer",
              },
              ownerId,
            );
          }
        }
      }
    }
    for (const status of [
      "counting",
      "review",
      "approved",
      "cancelled",
    ] as const) {
      const count = await createStockCount(
        {
          warehouseId: warehouse.id,
          scope: "full",
          note: `Demo ${status} count`,
        },
        ownerId,
      );
      if (status === "counting") continue;
      if (status === "cancelled") {
        await setStockCountStatus(count.id, "cancelled");
        continue;
      }
      const lines = await db.stockCountLine.findMany({
        where: { countId: count.id },
      });
      await recordCountedQuantities(
        count.id,
        lines.map((line, i) => ({
          lineId: line.id,
          counted: String(
            Math.max(0, Number(line.expected) - (i === 0 ? 1 : 0)),
          ),
          note: i === 0 ? "One damaged unit found" : "Count agrees",
        })),
      );
      await setStockCountStatus(count.id, "review");
      if (status === "approved") await approveStockCount(count.id, ownerId);
    }

    const mainBranch = await db.branch.upsert({
      where: { id: "legacy-main" },
      update: {
        code: "MAIN",
        name: "Headquarters & Showroom",
        timeZone: "Asia/Bahrain",
      },
      create: {
        id: "legacy-main",
        code: "MAIN",
        name: "Headquarters & Showroom",
        timeZone: "Asia/Bahrain",
        businessDayStart: 0,
        isActive: true,
      },
    });

    const mallBranch = await db.branch.upsert({
      where: { code: "MALL" },
      update: {
        name: "City Mall Retail Branch",
        timeZone: "Asia/Bahrain",
      },
      create: {
        code: "MALL",
        name: "City Mall Retail Branch",
        timeZone: "Asia/Bahrain",
        businessDayStart: 0,
        isActive: true,
      },
    });

    await db.branchGrant.upsert({
      where: { branchId_userId: { branchId: mallBranch.id, userId: ownerId } },
      update: { canManage: true },
      create: { branchId: mallBranch.id, userId: ownerId, canManage: true },
    });
    await db.branchGrant.upsert({
      where: { branchId_userId: { branchId: mallBranch.id, userId: staffId } },
      update: { canManage: true },
      create: { branchId: mallBranch.id, userId: staffId, canManage: true },
    });
    await db.branchGrant.upsert({
      where: { branchId_userId: { branchId: mainBranch.id, userId: staffId } },
      update: { canManage: true },
      create: { branchId: mainBranch.id, userId: staffId, canManage: true },
    });

    const mallWarehouse = await saveWarehouse({
      code: "DEMO-MALL",
      nameEn: "City Mall Branch",
      nameAr: "فرع مجمع المدينة",
      address: "Seef District, Manama",
      isActive: true,
      isDefault: false,
    });
    await db.warehouse.update({
      where: { id: mallWarehouse.id },
      data: { branchId: mallBranch.id },
    });
    const mallFloor = await saveLocation({
      warehouseId: mallWarehouse.id,
      code: "SALES-FLOOR",
      name: "Mall Sales Floor",
      isActive: true,
    });
    await saveLocation({
      warehouseId: mallWarehouse.id,
      code: "STOREROOM",
      name: "Mall Storeroom",
      isActive: true,
    });

    await saveStoreRegion(
      {
        code: "BH",
        nameEn: "Bahrain (Local)",
        nameAr: "مملكة البحرين (محلي)",
        currency: "BHD",
        branchId: mainBranch.id,
        priceMultiplier: "1.0000",
        isEnabled: true,
      },
      ownerId,
    );
    await saveStoreRegion(
      {
        code: "SA",
        nameEn: "Saudi Arabia",
        nameAr: "المملكة العربية السعودية",
        currency: "SAR",
        branchId: mainBranch.id,
        priceMultiplier: "10.0000",
        isEnabled: true,
      },
      ownerId,
    );
    await saveStoreRegion(
      {
        code: "AE",
        nameEn: "United Arab Emirates",
        nameAr: "الإمارات العربية المتحدة",
        currency: "AED",
        branchId: mainBranch.id,
        priceMultiplier: "9.8000",
        isEnabled: true,
      },
      ownerId,
    );
    await saveStoreRegion(
      {
        code: "GLOBAL",
        nameEn: "International Export",
        nameAr: "التصدير الدولي",
        currency: "USD",
        branchId: mainBranch.id,
        priceMultiplier: "2.6500",
        isEnabled: true,
      },
      ownerId,
    );

    const regOutlet1 = await saveRegister(
      {
        branchId: mainBranch.id,
        code: "POS-01",
        name: "Showroom Main POS",
        isActive: true,
      },
      ownerId,
    );
    const drwOutlet1 = await saveDrawer(
      {
        registerId: regOutlet1.id,
        code: "DRAWER-01",
        name: "Main Cash Drawer",
        openingFloat: 50,
        currency: "BHD",
      },
      ownerId,
    );
    const regOutlet2 = await saveRegister(
      {
        branchId: mainBranch.id,
        code: "POS-02",
        name: "Showroom Express POS",
        isActive: true,
      },
      ownerId,
    );
    await saveDrawer(
      {
        registerId: regOutlet2.id,
        code: "DRAWER-02",
        name: "Express Cash Drawer",
        openingFloat: 50,
        currency: "BHD",
      },
      ownerId,
    );

    const regMall = await saveRegister(
      {
        branchId: mallBranch.id,
        code: "POS-M1",
        name: "Mall Branch POS",
        isActive: true,
      },
      ownerId,
    );
    await saveDrawer(
      {
        registerId: regMall.id,
        code: "DRAWER-M1",
        name: "Mall Cash Drawer",
        openingFloat: 50,
        currency: "BHD",
      },
      ownerId,
    );

    const shift1 = await openRetailShift(mainBranch.id, ownerId);
    const session1 = await openCashierSession(
      {
        registerId: regOutlet1.id,
        drawerId: drwOutlet1.id,
        openingFloat: 50,
        shiftId: shift1.id,
      },
      staffId,
    );
    await recordPaymentCollection(
      {
        sessionId: session1.id,
        branchId: mainBranch.id,
        currency: "BHD",
        amount: 45.0,
        methodCode: "cash",
        referenceNumber: "DEMO-RECEIPT-101",
      },
      staffId,
    );
    await recordPaymentCollection(
      {
        sessionId: session1.id,
        branchId: mainBranch.id,
        currency: "BHD",
        amount: 120.0,
        methodCode: "card",
        referenceNumber: "DEMO-RECEIPT-102",
      },
      staffId,
    );
    await recordPaymentCollection(
      {
        sessionId: session1.id,
        branchId: mainBranch.id,
        currency: "BHD",
        amount: 75.5,
        methodCode: "benefit_pay",
        referenceNumber: "DEMO-RECEIPT-103",
      },
      staffId,
    );
    await closeCashierSession(
      {
        sessionId: session1.id,
        closingFloat: 50,
        actualCash: 95.0,
        note: "End of morning cashier session",
      },
      staffId,
    );
    await performRetailClosing(
      {
        branchId: mainBranch.id,
        level: "session",
        targetId: session1.id,
        businessDate: day(0),
        signature: "sig_verified",
      },
      staffId,
    );
    await closeRetailShift(shift1.id, staffId);
    await performRetailClosing(
      {
        branchId: mainBranch.id,
        level: "shift",
        targetId: shift1.id,
        businessDate: day(0),
        signature: "sig_verified",
      },
      staffId,
    );

    const liveShift = await openRetailShift(mainBranch.id, ownerId);
    await openCashierSession(
      {
        registerId: regOutlet1.id,
        drawerId: drwOutlet1.id,
        openingFloat: 50,
        shiftId: liveShift.id,
      },
      staffId,
    );

    if (products.length > 0) {
      const serializedProduct = products[0];
      const genId = "demo-serial-gen-001";
      await db.serialGeneration.upsert({
        where: { id: genId },
        update: {},
        create: {
          id: genId,
          idempotencyKey: `gen-key-${serializedProduct.id}`,
          requestHash: `req-hash-${serializedProduct.id}`,
          productId: serializedProduct.id,
          locationId: shelf.id,
          quantity: 4,
          createdById: ownerId,
        },
      });
      for (let s = 1; s <= 4; s++) {
        const sCode = `SN-DEMO-${serializedProduct.sku}-${s}`;
        await db.stockSerial.upsert({
          where: { code: sCode },
          update: {},
          create: {
            code: sCode,
            productId: serializedProduct.id,
            locationId: shelf.id,
            status: "available",
            generationId: genId,
            manufacturerSerial: `MFG-SN-${s * 1001}`,
            manufacturerScope: "demo-mfg",
          },
        });
      }
      const pkg = await createStockPackage(
        {
          code: "PKG-DEMO-001",
          kind: "pallet",
          locationId: shelf.id,
        },
        ownerId,
      );
      await packSerialsIntoPackage(
        pkg.id,
        [`SN-DEMO-${serializedProduct.sku}-1`, `SN-DEMO-${serializedProduct.sku}-2`],
        ownerId,
      );
      await sealStockPackage(pkg.id, "SEAL-998811", ownerId);
      await moveStockPackage(pkg.id, mallFloor.id, ownerId);
    }

    const rule = await createCommissionRule(
      {
        code: "COMM-STD-05",
        name: "Standard Sales 5%",
        rate: 0.05,
        effectiveFrom: day(-30),
      },
      ownerId,
    );
    const sampleOrder = await db.salesOrder.findFirst();
    if (sampleOrder) {
      await recordCommissionSnapshot(
        {
          orderId: sampleOrder.id,
          attributedUserId: staffId,
          basisAmount: 2400.0,
          currency: "BHD",
          ruleCode: rule.code,
        },
        financeId,
      );
    }
  }

  const saleable = products.filter(
    (p) =>
      p.isActive &&
      p.trackStock &&
      !p.trackBatches &&
      !p.sku.endsWith("-9") &&
      !p.sku.endsWith("-6") &&
      !p.sku.endsWith("-7"),
  );
  if (enabled("procurement") && warehouse && locationId) {
    for (let i = 0; i < 16; i++) {
      const supplier = await saveSupplier({
        companyName: `Demo Supply Partner ${i + 1}`,
        contactName: `Supply Coordinator ${i + 1}`,
        email: `supplier${i + 1}@example.invalid`,
        phone: `+973 1700 ${String(i + 1).padStart(4, "0")}`,
        vatNumber: "",
        leadTimeDays: String(2 + (i % 8)),
        paymentTermsDays: "30",
      });
      await db.crmContact.update({
        where: { id: supplier.id },
        data: {
          companyOrigin: "local",
          registrationCountry: "BH",
          crNumber: `${900000 + i}-1`,
          contactPersons: {
            create: {
              fullName: `Supply Coordinator ${i + 1}`,
              email: `supplier${i + 1}@example.invalid`,
              isPrimary: true,
            },
          },
        },
      });
      const product = saleable[i % saleable.length];
      const lines = [
        {
          productId: product.id,
          description: product.nameEn,
          quantity: "20",
          unitPrice: String(product.cost),
        },
      ];
      const requisition = await saveRequisition(
        {
          neededBy: day(10),
          note: "Replenish stock before the next campaign",
          lines,
        },
        staffId,
      );
      if (i < 4) {
        const rfq = await createRfq(
          {
            title: `Demo replenishment comparison ${i + 1}`,
            dueDate: day(7),
            note: "Compare price and lead time",
            lines,
          },
          financeId,
        );
        const rfqLines = await db.rfqLine.findMany({
          where: { rfqId: (rfq as any)?.id },
        });
        await saveRfqQuotes(
          (rfq as any)?.id,
          supplier.id,
          rfqLines.map((line: any) => ({
            lineId: line.id,
            unitPrice: String(product.cost),
            leadTimeDays: String(3 + i),
          })),
        );
      }
      const order: any = await savePurchaseOrder(
        {
          supplierId: supplier.id,
          orderDate: day(-10),
          expectedDate: day(i % 2 ? -2 : 7),
          warehouseId: warehouse.id,
          vatEnabled: false,
          note: `Demo purchasing scenario ${(i % 8) + 1}; request ${(requisition as any)?.number}`,
          terms: "Net 30 days",
          lines,
        },
        financeId,
      );
      const state = i % 8;
      if (state === 0) continue;
      if (state === 7) {
        if (order?.id) await cancelPurchaseOrder(order.id);
        continue;
      }
      let outcome: any = order?.id ? await submitPurchaseOrder(order.id) : {};
      if (state === 1) continue;
      for (let step = 0; outcome.status === "pending" && step < 5; step++)
        outcome = await decideApprovalRequest(
          outcome.approvalRequestId,
          outcome.approverIds[0] ?? ownerId,
          "approved",
          "Demo replenishment approved",
        );
      assert.notEqual(
        outcome.status,
        "pending",
        "Demo purchase approval did not finish",
      );
      if (state === 2) continue;
      if (order?.id) await markPurchaseOrderSent(order.id);
      if (state === 3) continue;
      const orderLine = await db.purchaseOrderLine.findFirstOrThrow({
        where: { purchaseOrderId: order?.id },
      });
      const quantity = state === 4 ? "8" : "20";
      if (order?.id) {
        await receiveGoods(
          order.id,
          {
            locationId,
            note:
              state === 4
                ? "Partial delivery; balance due next week"
                : "Checked and received",
            lines: [
              {
                orderLineId: orderLine.id,
                quantity,
                rejectedQuantity: "0",
                rejectReason: "",
                batchNumber: "",
                expiryDate: "",
              },
            ],
          },
          ownerId,
        );
      }
      const bill = await saveSupplierBill(
        {
          supplierId: supplier.id,
          purchaseOrderId: order?.id,
          supplierRef: `DEMO-BILL-${i + 1}`,
          billDate: day(-3),
          dueDate: day(i % 2 ? -1 : 27),
          vatAmount: "0",
          note: "Matched to accepted goods",
          attachmentUrl: "",
          lines: [
            {
              orderLineId: orderLine.id,
              description: product.nameEn,
              quantity,
              unitPrice: String(product.cost),
            },
          ],
        },
        financeId,
      );
      if (state === 4) continue;
      await approveSupplierBill(bill.id, financeId);
      await recordSupplierPayment(
        bill.id,
        {
          amount: String(Number(bill.total) / (state === 5 ? 2 : 1)),
          paidOn: day(0),
          method: "bank_transfer",
          reference: `DEMO-SUP-${i + 1}`,
        },
        financeId,
      );
    }
  }

  if (enabled("store") && saleable.length) {
    await saveStoreSettings({
      guestCheckout: true,
      deliveryEnabled: true,
      deliveryFee: "1.5",
      freeDeliveryOver: "50",
      pickupEnabled: true,
      codEnabled: true,
      bankTransferEnabled: true,
      bankInstructionsEn: "Demo only: do not transfer real money.",
      bankInstructionsAr: "للتجربة فقط: لا تحوّل أموالًا حقيقية.",
      orderNotifyEmail: "",
      paymentGateway: "",
    });
    await db.deliverySettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", timeZone: "Asia/Bahrain", mode: "own" },
    });
    for (const [i, city] of ["Manama", "Riffa", "Muharraq"].entries()) {
      await db.deliveryZone.create({
        data: {
          nameEn: city,
          nameAr: ["المنامة", "الرفاع", "المحرق"][i],
          areas: [city],
          fee: 1 + i * 0.5,
          freeOver: 50,
          sortOrder: i,
          slots: {
            create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
              weekday,
              start: "10:00",
              end: "18:00",
              capacity: 12,
            })),
          },
        },
      });
    }
    for (const [code, kind, value, endsAt, isActive] of [
      ["WELCOME10", "percent", "10", day(30), true],
      ["SAVE5", "fixed", "5", day(30), true],
      ["EXPIRED", "percent", "15", day(-1), true],
      ["PAUSED", "fixed", "2", day(30), false],
    ] as const) {
      await saveCoupon({
        code,
        kind,
        value,
        minOrder: "0",
        startsAt: day(-30),
        endsAt,
        maxUses: "100",
        isActive,
      });
    }
    const customers = [];
    for (let i = 0; i < 24; i++) {
      const city = ["Manama", "Riffa", "Muharraq"][i % 3];
      const customer = await db.customer.create({
        data: {
          email: `shopper${i + 1}@example.invalid`,
          name: `Demo Customer ${i + 1}`,
          phone: `+973 3900 ${String(i + 1).padStart(4, "0")}`,
          locale: i % 2 ? "ar" : "en",
          emailVerifiedAt: new Date(),
          marketingOptIn: i % 3 !== 0,
          addresses: {
            create: {
              name: `Demo Customer ${i + 1}`,
              phone: `+973 3900 ${String(i + 1).padStart(4, "0")}`,
              line1: `Building ${100 + i}, Road 1001`,
              city,
              area: city,
              country: "BH",
              isDefault: true,
            },
          },
        },
      });
      customers.push(customer);
      const catalogue = await db.product.findUniqueOrThrow({
        where: { id: saleable[i % saleable.length].id },
      });
      if (catalogue.catalogueItemId)
        await db.wishlistItem.create({
          data: {
            customerId: customer.id,
            catalogueItemId: catalogue.catalogueItemId,
          },
        });
    }
    const vehicles = await db.vehicle.createMany({
      data: [
        { plate: "DEMO-1001", name: "City delivery van", kind: "van" },
        { plate: "DEMO-1002", name: "Outlet shuttle", kind: "van" },
        {
          plate: "DEMO-1003",
          name: "Retired delivery van",
          kind: "van",
          isActive: false,
        },
      ],
    });
    assert.equal(vehicles.count, 3);
    const vehicle = await db.vehicle.findUniqueOrThrow({
      where: { plate: "DEMO-1001" },
    });
    const driverUser = await db.user.create({
      data: {
        email: "demo.driver@example.invalid",
        fullName: "Demo Delivery Driver",
        role: "driver",
        passwordHash: users.passwordHash,
        managerId: staffId,
      },
    });
    const driver = await createEmployee(
      {
        userId: driverUser.id,
        email: driverUser.email,
        firstNameEn: "Demo",
        lastNameEn: "Driver",
        firstNameAr: "سائق",
        lastNameAr: "تجريبي",
        jobTitleEn: "Delivery driver",
        jobTitleAr: "سائق توصيل",
        basicSalary: 450,
        hireDate: new Date(`${day(0)}T00:00:00Z`),
      },
      ownerId,
    );
    const agency = await saveCourierAgency({
      name: "Demo local courier",
      kind: "manual",
      trackingUrl: "",
      phone: "+973 1700 0099",
      email: "courier@example.invalid",
      fee: "1.5",
      isActive: true,
    });
    for (let i = 0; i < 72; i++) {
      const customer = customers[i % customers.length];
      const state = i % 9;
      const delivery = Math.floor(i / 4) % 2 === 0;
      const city = ["Manama", "Riffa", "Muharraq"][i % 3];
      const order = await placeOrder({
        lines: [
          {
            productId: saleable[i % saleable.length].id,
            quantity: 1 + (i % 3),
          },
        ],
        couponCode: i % 5 === 0 ? "WELCOME10" : undefined,
        fulfilment: delivery ? "delivery" : "pickup",
        address: delivery
          ? {
              name: customer.name,
              phone: customer.phone!,
              line1: `Building ${100 + i}, Road 1001`,
              city,
              area: city,
              country: "BH",
            }
          : null,
        name: customer.name,
        email: customer.email,
        phone: customer.phone!,
        paymentMethod: delivery
          ? "cod"
          : i % 4 === 0
            ? "bank_transfer"
            : "cash",
        locale: customer.locale,
        channel: ["website", "phone", "whatsapp", "pos"][i % 4] as
          "website" | "phone" | "whatsapp" | "pos",
        customerId: customer.id,
        createdById: ownerId,
        utm: enabled("marketing")
          ? { campaign: "demo-seasonal", source: "demo", medium: "social" }
          : null,
      });
      if (state === 0) continue;
      if (state === 7) {
        await moveOrder(
          order.id,
          "cancelled",
          ownerId,
          "Customer changed their plans",
        );
        continue;
      }
      if (state === 1 || (state >= 4 && state <= 6))
        await recordOrderPayment(
          order.id,
          {
            amount: Number(order.total),
            method: delivery ? "bank_transfer" : "cash",
            reference: `DEMO-PAY-${i + 1}`,
          },
          financeId,
        );
      if (state === 1) continue;
      await moveOrder(order.id, "packing", ownerId);
      const shipment = delivery
        ? await db.shipment.findFirstOrThrow({ where: { orderId: order.id } })
        : null;
      if (shipment) {
        if (i % 5 === 0)
          await handToAgency(
            shipment.id,
            (agency as any)?.id ?? "agency-id",
            ownerId,
          );
        else
          await assignShipment(
            shipment.id,
            { driverId: driver.id, vehicleId: vehicle.id },
            ownerId,
          );
      }
      if (state === 2) continue;
      if (shipment)
        await moveShipment(shipment.id, { to: "out_for_delivery" }, ownerId);
      else await moveOrder(order.id, "shipped", ownerId);
      if (state === 3) continue;
      if (state === 8 && shipment) {
        await moveShipment(
          shipment.id,
          {
            to: "failed",
            reason: "customer_absent",
            note: "Call before attempting again",
          },
          ownerId,
        );
        if (i % 2) await moveShipment(shipment.id, { to: "returned" }, ownerId);
        continue;
      }
      if (shipment)
        await moveShipment(
          shipment.id,
          {
            to: "delivered",
            note: state >= 4 && state <= 6 ? "No COD" : `COD: ${order.total}`,
          } as any,
          ownerId,
        );
      else await moveOrder(order.id, "delivered", ownerId);
      if (state === 5) {
        await moveOrder(
          order.id,
          "returned",
          ownerId,
          "Customer returned the unopened item",
        );
        await recordOrderRefund(
          order.id,
          Number(order.total),
          "Full refund after return",
          financeId,
        );
      }
      if (state === 6)
        await recordOrderRefund(
          order.id,
          Number((Number(order.total) / 2).toFixed(3)),
          "Goodwill refund",
          financeId,
        );
    }
    const routable = await db.shipment.findMany({
      where: { status: "assigned", method: "own" },
      take: 6,
    });
    for (const [i, shipment] of routable.entries()) {
      const route: any = await createRouteSheet(
        {
          date: day(0),
          driverId: driver.id,
          vehicleId: vehicle.id,
          shipmentIds: [shipment.id],
          note: "Demo daily delivery route",
        },
        ownerId,
      );
      if (i % 3 === 0) continue;
      if (route?.id) await startRouteSheet(route.id, ownerId);
      if (i % 3 === 1) continue;
      await moveShipment(
        shipment.id,
        { to: "delivered", note: `COD: ${shipment.codAmount}` } as any,
        ownerId,
      );
      if (route?.id) await closeRouteSheet(route.id);
      await settleCash(
        {
          source: `driver:${driver.id}`,
          shipmentIds: [shipment.id],
          received: Number(shipment.codAmount),
          note: "Driver cash reconciled with order",
        },
        financeId,
      );
    }
  }

  if (enabled("tasks")) {
    const scope = { userId: ownerId, departmentId: null, all: true };
    for (let i = 0; i < 12; i++) {
      const sample =
        ACTIVITY_SAMPLES[preset.activities[i % preset.activities.length]];
      const project = await saveProject(
        {
          name: `${sample.items[i % 4].title[0]} — ${i + 1}`,
          description: sample.banner.subtitle[0],
          status: ["active", "on_hold", "done", "archived"][i % 4],
          ownerId: staffId,
          color: ["#2563EB", "#059669", "#D97706"][i % 3],
          startDate: day(-30),
          dueDate: day(i % 2 ? 14 : -3),
        },
        ownerId,
      );
      for (let j = 0; j < 8; j++) {
        const task = await saveTask(
          {
            title: [
              "Confirm requirements",
              "Prepare proposal",
              "Client review",
              "Resolve feedback",
              "Quality check",
              "Delivery handover",
              "Archive records",
              "Follow up",
            ][j],
            description: `Scenario ${i + 1}: coordinate with the client and record the outcome.`,
            projectId: project.id,
            status: ["todo", "in_progress", "review", "done", "cancelled"][
              j % 5
            ],
            priority: ["low", "normal", "high", "urgent"][j % 4],
            assigneeId: j === 0 ? undefined : j % 2 ? staffId : financeId,
            startDate: day(-14),
            dueDate: day(j - 4),
          },
          scope,
        );
        await addTaskComment(
          task.id,
          j % 2
            ? "Waiting for the client's confirmation."
            : "Checklist updated; supporting documents are ready.",
          scope,
        );
      }
    }
  }
  if (enabled("marketing")) {
    const segment = await saveSegment({
      name: "Repeat customers",
      minOrders: "2",
      minSpent: "",
      orderedWithinDays: "",
      notOrderedForDays: "",
      city: "",
    });
    await saveSegment({
      name: "Manama customers",
      minOrders: "",
      minSpent: "",
      orderedWithinDays: "",
      notOrderedForDays: "",
      city: "Manama",
    });
    await saveSegment({
      name: "Customers to win back",
      minOrders: "1",
      minSpent: "",
      orderedWithinDays: "",
      notOrderedForDays: "60",
      city: "",
    });
    for (let i = 0; i < 12; i++) {
      const campaign = await saveCampaign(
        {
          name: `Demo campaign ${i + 1}`,
          channel: ["email", "social", "ads", "whatsapp", "event", "print"][
            i % 6
          ],
          status: ["planned", "running", "done", "cancelled"][i % 4],
          startDate: day(-30),
          endDate: day(14),
          budget: String(500 + i * 100),
          spend: i % 4 === 0 ? "0" : String(100 + i * 20),
          utmCampaign: i === 1 ? "demo-seasonal" : `demo-campaign-${i + 1}`,
          couponCode: "WELCOME10",
          notes: "Fictional results for exploring campaign reporting.",
          ownerId: staffId,
        },
        ownerId,
      );
      await saveBroadcast(
        {
          name: `Demo newsletter ${i + 1}`,
          segmentId: segment.id,
          campaignId: campaign.id,
          subjectEn: "Explore our latest offers",
          subjectAr: "اكتشف أحدث عروضنا",
          bodyEn: "A preview of this month's products and services.",
          bodyAr: "نظرة على منتجات وخدمات هذا الشهر.",
        },
        ownerId,
      );
    }
  }
  if (enabled("pr")) {
    const article = await db.cmsArticle.findFirst({
      where: { category: "press_release", status: "published" },
    });
    for (let i = 0; i < 18; i++) {
      await db.mediaContact.create({
        data: {
          name: `Demo Editor ${i + 1}`,
          outlet: `Example Business Journal ${(i % 6) + 1}`,
          role: "Editor",
          beat: ["Business", "Technology", "Community"][i % 3],
          email: `editor${i + 1}@example.invalid`,
          isActive: i !== 17,
        },
      });
      await db.mediaCoverage.create({
        data: {
          title: `Demo company feature ${i + 1}`,
          outlet: `Example Business Journal ${(i % 6) + 1}`,
          publishedOn: new Date(`${day(-i * 7)}T00:00:00Z`),
          reach: 1000 + i * 750,
          sentiment: ["positive", "neutral", "negative"][i % 3],
          articleId: article?.id,
          createdById: ownerId,
          notes: "Fictional press coverage for demonstration.",
        },
      });
    }
  }
  if (enabled("legal")) {
    for (let i = 0; i < 16; i++) {
      const closed = i % 4 === 3;
      const matter = await saveLegalMatter(
        {
          title:
            [
              "Supplier contract dispute",
              "Client payment claim",
              "Licence renewal",
              "Employment agreement review",
              "Trademark registration",
              "Lease review",
            ][i % 6] + ` ${i + 1}`,
          kind: [
            "dispute",
            "claim",
            "regulatory",
            "employment",
            "intellectual_property",
            "other",
          ][i % 6],
          status: ["open", "in_progress", "on_hold", "closed"][i % 4],
          counterparty: `Example Counterparty ${i + 1}`,
          reference: `DEMO-CASE-${i + 1}`,
          nextDate: closed ? "" : day(i % 2 ? 7 : -2),
          assigneeId: ownerId,
          amountAtStake: String(250 + i * 150),
          description:
            "Fictional matter to explore deadlines, ownership and case history.",
          outcome: closed
            ? "Resolved by agreement; no further action required."
            : "",
        },
        ownerId,
      );
      await addLegalNote(
        matter.id,
        closed
          ? "Signed agreement filed and matter closed."
          : "Supporting records collected; waiting for the next review.",
        ownerId,
      );
    }
  }
  console.log(
    "✅ Added stock, procurement, orders, delivery, projects, marketing, PR and legal scenarios for enabled modules",
  );
}
