import { randomUUID } from "node:crypto";
import { Database } from "@platform/database/decimal";
import { db, runAtomicMutation } from "../atomic";
import { requireBranchAccess } from "./branches";

export interface RegisterInput {
  id?: string;
  branchId: string;
  code: string;
  name: string;
  isActive?: boolean;
}

export async function saveRegister(input: RegisterInput, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, input.branchId, true);
    if (!input.code.trim() || !input.name.trim())
      throw new Error("Invalid register configuration");

    if (input.id) {
      const existing = await db.retailRegister.findUnique({ where: { id: input.id } });
      if (!existing || existing.branchId !== input.branchId)
        throw new Error("Register not found");
      return db.retailRegister.update({
        where: { id: input.id },
        data: {
          code: input.code.trim(),
          name: input.name.trim(),
          isActive: input.isActive ?? true,
          revision: { increment: 1 },
        },
      });
    }

    return db.retailRegister.create({
      data: {
        branchId: input.branchId,
        code: input.code.trim(),
        name: input.name.trim(),
        isActive: input.isActive ?? true,
      },
    });
  });
}

export async function listRegisters(branchId: string, actorId: string) {
  await requireBranchAccess(actorId, branchId);
  return db.retailRegister.findMany({
    where: { branchId },
    orderBy: { code: "asc" },
    include: { drawers: true },
  });
}

export interface DrawerInput {
  id?: string;
  registerId: string;
  code: string;
  name: string;
  currency?: string;
  openingFloat?: number | string;
  isActive?: boolean;
}

export async function saveDrawer(input: DrawerInput, actorId: string) {
  return runAtomicMutation(async () => {
    const register = await db.retailRegister.findUnique({ where: { id: input.registerId } });
    if (!register) throw new Error("Register not found");
    await requireBranchAccess(actorId, register.branchId, true);

    if (!input.code.trim() || !input.name.trim())
      throw new Error("Invalid drawer configuration");

    if (input.id) {
      const existing = await db.cashDrawer.findUnique({ where: { id: input.id } });
      if (!existing || existing.registerId !== input.registerId)
        throw new Error("Cash drawer not found");
      return db.cashDrawer.update({
        where: { id: input.id },
        data: {
          code: input.code.trim(),
          name: input.name.trim(),
          currency: input.currency ?? "USD",
          openingFloat: input.openingFloat != null ? new Database.Decimal(input.openingFloat.toString()) : existing.openingFloat,
          isActive: input.isActive ?? true,
          revision: { increment: 1 },
        },
      });
    }

    return db.cashDrawer.create({
      data: {
        registerId: input.registerId,
        code: input.code.trim(),
        name: input.name.trim(),
        currency: input.currency ?? "USD",
        openingFloat: input.openingFloat != null ? new Database.Decimal(input.openingFloat.toString()) : new Database.Decimal(0),
        isActive: input.isActive ?? true,
      },
    });
  });
}

export async function listDrawers(registerId: string, actorId: string) {
  const register = await db.retailRegister.findUnique({ where: { id: registerId } });
  if (!register) throw new Error("Register not found");
  await requireBranchAccess(actorId, register.branchId);
  return db.cashDrawer.findMany({
    where: { registerId },
    orderBy: { code: "asc" },
  });
}

export async function openRetailShift(branchId: string, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, branchId);
    const existing = await db.retailShift.findFirst({
      where: { branchId, status: "open" },
    });
    if (existing) return existing;

    const shiftNumber = `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return db.retailShift.create({
      data: {
        branchId,
        shiftNumber,
        openedById: actorId,
        status: "open",
      },
    });
  });
}

export async function closeRetailShift(shiftId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const shift = await db.retailShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new Error("Retail shift not found");
    if (shift.status === "closed") throw new Error("Retail shift is already closed");
    await requireBranchAccess(actorId, shift.branchId, true);

    const openSessions = await db.cashierSession.count({
      where: { shiftId, status: "open" },
    });
    if (openSessions > 0)
      throw new Error("Cannot close shift with open cashier sessions");

    return db.retailShift.update({
      where: { id: shiftId },
      data: {
        status: "closed",
        closedById: actorId,
        closedAt: new Date(),
        revision: { increment: 1 },
      },
    });
  });
}

export interface OpenSessionInput {
  registerId: string;
  drawerId: string;
  openingFloat: number | string;
  shiftId?: string;
}

export async function openCashierSession(input: OpenSessionInput, actorId: string) {
  return runAtomicMutation(async () => {
    const register = await db.retailRegister.findUnique({ where: { id: input.registerId } });
    if (!register || !register.isActive) throw new Error("Register not found");
    await requireBranchAccess(actorId, register.branchId);

    const drawer = await db.cashDrawer.findUnique({ where: { id: input.drawerId } });
    if (!drawer || !drawer.isActive || drawer.registerId !== input.registerId)
      throw new Error("Cash drawer not found");

    const existing = await db.cashierSession.findFirst({
      where: { drawerId: input.drawerId, status: "open" },
    });
    if (existing) throw new Error("Cashier session already open for this drawer");

    let shiftId = input.shiftId;
    if (!shiftId) {
      const activeShift = await db.retailShift.findFirst({
        where: { branchId: register.branchId, status: "open" },
      });
      if (activeShift) shiftId = activeShift.id;
    }

    const floatVal = new Database.Decimal(input.openingFloat.toString());

    return db.cashierSession.create({
      data: {
        registerId: input.registerId,
        drawerId: input.drawerId,
        cashierId: actorId,
        shiftId: shiftId || null,
        openingFloat: floatVal,
        status: "open",
      },
    });
  });
}

export interface CloseSessionInput {
  sessionId: string;
  closingFloat: number | string;
  actualCash: number | string;
  note?: string;
}

export async function closeCashierSession(input: CloseSessionInput, actorId: string) {
  return runAtomicMutation(async () => {
    const session = await db.cashierSession.findUnique({
      where: { id: input.sessionId },
      include: { register: true },
    });
    if (!session) throw new Error("Cashier session not found");
    if (session.status === "closed") throw new Error("Cashier session is already closed");
    await requireBranchAccess(actorId, session.register.branchId);

    const collections = await db.paymentCollection.findMany({
      where: { sessionId: input.sessionId, status: "collected" },
    });

    const cashCollections = collections
      .filter((c) => c.methodCode === "cash")
      .reduce((sum, c) => sum.add(c.amount), new Database.Decimal(0));

    const totalSales = collections
      .reduce((sum, c) => sum.add(c.amount), new Database.Decimal(0));

    const closingFloatVal = new Database.Decimal(input.closingFloat.toString());
    const actualCashVal = new Database.Decimal(input.actualCash.toString());
    const expectedCashVal = session.openingFloat.add(cashCollections);
    const cashDifferenceVal = actualCashVal.sub(expectedCashVal);

    return db.cashierSession.update({
      where: { id: input.sessionId },
      data: {
        closedAt: new Date(),
        closingFloat: closingFloatVal,
        actualCash: actualCashVal,
        expectedCash: expectedCashVal,
        cashDifference: cashDifferenceVal,
        totalSales,
        status: "closed",
        note: input.note?.trim() || null,
        revision: { increment: 1 },
      },
    });
  });
}

export interface PaymentCollectionInput {
  branchId: string;
  sessionId?: string;
  orderId?: string;
  invoiceId?: string;
  amount: number | string;
  currency: string;
  methodCode: string;
  referenceNumber?: string;
  evidence?: Record<string, unknown>;
}

export async function recordPaymentCollection(input: PaymentCollectionInput, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, input.branchId);

    if (input.sessionId) {
      const session = await db.cashierSession.findUnique({ where: { id: input.sessionId } });
      if (!session || session.status !== "open")
        throw new Error("Cashier session is already closed");
    }

    const number = `COL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const collection = await db.paymentCollection.create({
      data: {
        number,
        branchId: input.branchId,
        sessionId: input.sessionId || null,
        orderId: input.orderId || null,
        invoiceId: input.invoiceId || null,
        amount: new Database.Decimal(input.amount.toString()),
        currency: input.currency,
        methodCode: input.methodCode,
        referenceNumber: input.referenceNumber?.trim() || null,
        evidence: input.evidence ? JSON.parse(JSON.stringify(input.evidence)) : undefined,
        status: "collected",
        collectedById: actorId,
      },
    });

    return collection;
  });
}

export async function reversePaymentCollection(collectionId: string, reason: string, actorId: string) {
  return runAtomicMutation(async () => {
    const collection = await db.paymentCollection.findUnique({ where: { id: collectionId } });
    if (!collection) throw new Error("Payment collection not found");
    if (collection.status === "reversed") throw new Error("Payment collection already reversed");
    await requireBranchAccess(actorId, collection.branchId, true);

    const reversed = await db.paymentCollection.update({
      where: { id: collectionId },
      data: {
        status: "reversed",
      },
    });

    await db.stockTraceEvent.create({
      data: {
        entityType: "payment_collection",
        entityId: collectionId,
        revision: 1,
        action: "reversed",
        actorId,
        details: { reason, amount: collection.amount.toString() },
      },
    });

    return reversed;
  });
}

export interface RetailClosingInput {
  branchId: string;
  level: "drawer" | "session" | "shift" | "day" | "period";
  targetId: string;
  businessDate: string;
  signature?: string;
}

export async function performRetailClosing(input: RetailClosingInput, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, input.branchId, true);

    const levels = ["drawer", "session", "shift", "day", "period"];
    if (!levels.includes(input.level)) throw new Error("Retail closing level invalid");

    let totalSales = new Database.Decimal(0);
    let totalReturns = new Database.Decimal(0);
    let totalCash = new Database.Decimal(0);
    let totalCard = new Database.Decimal(0);
    let totalOther = new Database.Decimal(0);
    let cashVariance = new Database.Decimal(0);
    let snapshotData: Record<string, unknown> = {};

    if (input.level === "drawer") {
      const drawer = await db.cashDrawer.findUnique({ where: { id: input.targetId } });
      if (!drawer) throw new Error("Cash drawer not found");
      const sessions = await db.cashierSession.findMany({
        where: { drawerId: input.targetId, status: "closed" },
        take: 10,
        orderBy: { closedAt: "desc" },
      });
      totalSales = sessions.reduce((s, x) => s.add(x.totalSales), new Database.Decimal(0));
      totalReturns = sessions.reduce((s, x) => s.add(x.totalReturns), new Database.Decimal(0));
      totalCash = sessions.reduce((s, x) => s.add(x.actualCash), new Database.Decimal(0));
      cashVariance = sessions.reduce((s, x) => s.add(x.cashDifference), new Database.Decimal(0));
      snapshotData = { drawerCode: drawer.code, sessionCount: sessions.length };
    } else if (input.level === "session") {
      const session = await db.cashierSession.findUnique({ where: { id: input.targetId } });
      if (!session) throw new Error("Cashier session not found");
      if (session.status !== "closed") throw new Error("Cashier session must be closed before closing");
      totalSales = session.totalSales;
      totalReturns = session.totalReturns;
      totalCash = session.actualCash;
      cashVariance = session.cashDifference;
      snapshotData = {
        sessionId: session.id,
        cashierId: session.cashierId,
        openedAt: session.openedAt.toISOString(),
        closedAt: session.closedAt?.toISOString(),
      };
    } else if (input.level === "shift") {
      const shift = await db.retailShift.findUnique({ where: { id: input.targetId } });
      if (!shift) throw new Error("Retail shift not found");
      const openSessions = await db.cashierSession.count({ where: { shiftId: shift.id, status: "open" } });
      if (openSessions > 0) throw new Error("Cannot close shift with open cashier sessions");

      const sessions = await db.cashierSession.findMany({ where: { shiftId: shift.id } });
      totalSales = sessions.reduce((s, x) => s.add(x.totalSales), new Database.Decimal(0));
      totalReturns = sessions.reduce((s, x) => s.add(x.totalReturns), new Database.Decimal(0));
      totalCash = sessions.reduce((s, x) => s.add(x.actualCash), new Database.Decimal(0));
      cashVariance = sessions.reduce((s, x) => s.add(x.cashDifference), new Database.Decimal(0));
      snapshotData = { shiftNumber: shift.shiftNumber, sessionCount: sessions.length };
    } else if (input.level === "day") {
      const openShifts = await db.retailShift.count({ where: { branchId: input.branchId, status: "open" } });
      if (openShifts > 0) throw new Error("Cannot close business day with open shifts");

      const collections = await db.paymentCollection.findMany({
        where: {
          branchId: input.branchId,
          status: "collected",
          collectedAt: {
            gte: new Date(`${input.businessDate}T00:00:00.000Z`),
            lte: new Date(`${input.businessDate}T23:59:59.999Z`),
          },
        },
      });
      totalSales = collections.reduce((s, x) => s.add(x.amount), new Database.Decimal(0));
      totalCash = collections.filter((c) => c.methodCode === "cash").reduce((s, x) => s.add(x.amount), new Database.Decimal(0));
      totalCard = collections.filter((c) => c.methodCode === "card").reduce((s, x) => s.add(x.amount), new Database.Decimal(0));
      totalOther = collections.filter((c) => !["cash", "card"].includes(c.methodCode)).reduce((s, x) => s.add(x.amount), new Database.Decimal(0));
      snapshotData = { date: input.businessDate, collectionsCount: collections.length };
    } else if (input.level === "period") {
      snapshotData = { periodId: input.targetId };
    }

    const closing = await db.retailClosing.create({
      data: {
        branchId: input.branchId,
        level: input.level,
        targetId: input.targetId,
        businessDate: new Date(`${input.businessDate}T00:00:00.000Z`),
        closedById: actorId,
        totalSales,
        totalReturns,
        totalCash,
        totalCard,
        totalOther,
        cashVariance,
        snapshot: snapshotData as unknown as Database.InputJsonValue,
        signature: input.signature || null,
        status: "closed",
      },
    });

    return closing;
  });
}
