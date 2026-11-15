import { randomUUID } from "node:crypto";
import { Database } from "@platform/database/decimal";
import { runAtomicMutation } from "../api/atomic";
import { listTableRows, upsertTableRow } from "../api/tables";
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
      const registers = await listTableRows<Record<string, any>>("commerce", "retail_register");
      const existing = registers.find((r) => r.id === input.id);
      if (!existing || existing.branchId !== input.branchId)
        throw new Error("Register not found");
      return upsertTableRow("commerce", "retail_register", {
        id: input.id,
        code: input.code.trim(),
        name: input.name.trim(),
        isActive: input.isActive ?? true,
        revision: Number(existing.revision ?? 0) + 1,
      });
    }

    return upsertTableRow("commerce", "retail_register", {
      id: randomUUID(),
      branchId: input.branchId,
      code: input.code.trim(),
      name: input.name.trim(),
      isActive: input.isActive ?? true,
      revision: 1,
    });
  });
}

export async function listRegisters(branchId: string, actorId: string) {
  await requireBranchAccess(actorId, branchId);
  const [registers, drawers] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "retail_register", "code ASC"),
    listTableRows<Record<string, any>>("commerce", "cash_drawer", "code ASC"),
  ]);
  const drawersByReg = new Map<string, Record<string, any>[]>();
  for (const d of drawers) {
    const rid = String(d.registerId ?? "");
    const list = drawersByReg.get(rid) ?? [];
    list.push(d);
    drawersByReg.set(rid, list);
  }
  return registers
    .filter((r) => r.branchId === branchId)
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")))
    .map((r) => ({
      ...r,
      drawers: (drawersByReg.get(String(r.id)) ?? []).sort((a, b) =>
        String(a.code ?? "").localeCompare(String(b.code ?? "")),
      ),
    }));
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
    const registers = await listTableRows<Record<string, any>>("commerce", "retail_register");
    const register = registers.find((r) => r.id === input.registerId);
    if (!register) throw new Error("Register not found");
    await requireBranchAccess(actorId, String(register.branchId), true);

    if (!input.code.trim() || !input.name.trim())
      throw new Error("Invalid drawer configuration");

    if (input.id) {
      const drawers = await listTableRows<Record<string, any>>("commerce", "cash_drawer");
      const existing = drawers.find((d) => d.id === input.id);
      if (!existing || existing.registerId !== input.registerId)
        throw new Error("Cash drawer not found");
      return upsertTableRow("commerce", "cash_drawer", {
        id: input.id,
        code: input.code.trim(),
        name: input.name.trim(),
        currency: input.currency ?? "USD",
        openingFloat:
          input.openingFloat != null
            ? Number(input.openingFloat.toString())
            : Number(existing.openingFloat ?? 0),
        isActive: input.isActive ?? true,
        revision: Number(existing.revision ?? 0) + 1,
      });
    }

    return upsertTableRow("commerce", "cash_drawer", {
      id: randomUUID(),
      registerId: input.registerId,
      code: input.code.trim(),
      name: input.name.trim(),
      currency: input.currency ?? "USD",
      openingFloat: input.openingFloat != null ? Number(input.openingFloat.toString()) : 0,
      isActive: input.isActive ?? true,
      revision: 1,
    });
  });
}

export async function listDrawers(registerId: string, actorId: string) {
  const [registers, drawers] = await Promise.all([
    listTableRows<Record<string, any>>("commerce", "retail_register"),
    listTableRows<Record<string, any>>("commerce", "cash_drawer", "code ASC"),
  ]);
  const register = registers.find((r) => r.id === registerId);
  if (!register) throw new Error("Register not found");
  await requireBranchAccess(actorId, String(register.branchId));
  return drawers
    .filter((d) => d.registerId === registerId)
    .sort((a, b) => String(a.code ?? "").localeCompare(String(b.code ?? "")));
}

export async function openRetailShift(branchId: string, actorId: string) {
  return runAtomicMutation(async () => {
    await requireBranchAccess(actorId, branchId);
    const shifts = await listTableRows<Record<string, any>>("commerce", "retail_shift");
    const existing = shifts.find((s) => s.branchId === branchId && s.status === "open");
    if (existing) return existing;

    const shiftNumber = `SHIFT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return upsertTableRow("commerce", "retail_shift", {
      id: randomUUID(),
      branchId,
      shiftNumber,
      openedById: actorId,
      status: "open",
      revision: 1,
    });
  });
}

export async function closeRetailShift(shiftId: string, actorId: string) {
  return runAtomicMutation(async () => {
    const [shifts, sessions] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "retail_shift"),
      listTableRows<Record<string, any>>("commerce", "cashier_session"),
    ]);
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) throw new Error("Retail shift not found");
    if (shift.status === "closed") throw new Error("Retail shift is already closed");
    await requireBranchAccess(actorId, String(shift.branchId), true);

    const openSessions = sessions.filter(
      (cs) => cs.shiftId === shiftId && cs.status === "open",
    ).length;
    if (openSessions > 0)
      throw new Error("Cannot close shift with open cashier sessions");

    return upsertTableRow("commerce", "retail_shift", {
      id: shiftId,
      status: "closed",
      closedById: actorId,
      closedAt: new Date().toISOString(),
      revision: Number(shift.revision ?? 0) + 1,
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
    const [registers, drawers, sessions, shifts] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "retail_register"),
      listTableRows<Record<string, any>>("commerce", "cash_drawer"),
      listTableRows<Record<string, any>>("commerce", "cashier_session"),
      listTableRows<Record<string, any>>("commerce", "retail_shift"),
    ]);
    const register = registers.find((r) => r.id === input.registerId);
    if (!register || !register.isActive) throw new Error("Register not found");
    await requireBranchAccess(actorId, String(register.branchId));

    const drawer = drawers.find((d) => d.id === input.drawerId);
    if (!drawer || !drawer.isActive || drawer.registerId !== input.registerId)
      throw new Error("Cash drawer not found");

    const existing = sessions.find(
      (s) => s.drawerId === input.drawerId && s.status === "open",
    );
    if (existing) throw new Error("Cashier session already open for this drawer");

    let shiftId = input.shiftId;
    if (!shiftId) {
      const activeShift = shifts.find(
        (s) => s.branchId === register.branchId && s.status === "open",
      );
      if (activeShift) shiftId = String(activeShift.id);
    }

    const floatVal = Number(new Database.Decimal(input.openingFloat.toString()).toString());

    return upsertTableRow("commerce", "cashier_session", {
      id: randomUUID(),
      registerId: input.registerId,
      drawerId: input.drawerId,
      cashierId: actorId,
      shiftId: shiftId || null,
      openingFloat: floatVal,
      status: "open",
      revision: 1,
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
    const [sessions, registers, allCollections] = await Promise.all([
      listTableRows<Record<string, any>>("commerce", "cashier_session"),
      listTableRows<Record<string, any>>("commerce", "retail_register"),
      listTableRows<Record<string, any>>("finance", "payment_collection"),
    ]);
    const session = sessions.find((s) => s.id === input.sessionId);
    if (!session) throw new Error("Cashier session not found");
    if (session.status === "closed") throw new Error("Cashier session is already closed");
    const register = registers.find((r) => r.id === session.registerId);
    if (register) await requireBranchAccess(actorId, String(register.branchId));

    const collections = allCollections.filter(
      (c) => c.sessionId === input.sessionId && c.status === "collected",
    );

    const cashCollections = collections
      .filter((c) => c.methodCode === "cash")
      .reduce((sum, c) => sum.add(String(c.amount ?? 0)), new Database.Decimal(0));

    const totalSales = collections.reduce(
      (sum, c) => sum.add(String(c.amount ?? 0)),
      new Database.Decimal(0),
    );

    const closingFloatVal = new Database.Decimal(input.closingFloat.toString());
    const actualCashVal = new Database.Decimal(input.actualCash.toString());
    const expectedCashVal = new Database.Decimal(String(session.openingFloat ?? 0)).add(cashCollections);
    const cashDifferenceVal = actualCashVal.sub(expectedCashVal);

    return upsertTableRow("commerce", "cashier_session", {
      id: input.sessionId,
      closedAt: new Date().toISOString(),
      closingFloat: Number(closingFloatVal.toString()),
      actualCash: Number(actualCashVal.toString()),
      expectedCash: Number(expectedCashVal.toString()),
      cashDifference: Number(cashDifferenceVal.toString()),
      totalSales: Number(totalSales.toString()),
      status: "closed",
      note: input.note?.trim() || null,
      revision: Number(session.revision ?? 0) + 1,
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
      const sessions = await listTableRows<Record<string, any>>("commerce", "cashier_session");
      const session = sessions.find((s) => s.id === input.sessionId);
      if (!session || session.status !== "open")
        throw new Error("Cashier session is already closed");
    }

    const number = `COL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return upsertTableRow("finance", "payment_collection", {
      id: randomUUID(),
      number,
      branchId: input.branchId,
      sessionId: input.sessionId || null,
      orderId: input.orderId || null,
      invoiceId: input.invoiceId || null,
      amount: Number(new Database.Decimal(input.amount.toString()).toString()),
      currency: input.currency,
      methodCode: input.methodCode,
      referenceNumber: input.referenceNumber?.trim() || null,
      evidence: input.evidence ? JSON.parse(JSON.stringify(input.evidence)) : undefined,
      status: "collected",
      collectedById: actorId,
    });
  });
}

export async function reversePaymentCollection(collectionId: string, reason: string, actorId: string) {
  return runAtomicMutation(async () => {
    const collections = await listTableRows<Record<string, any>>("finance", "payment_collection");
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) throw new Error("Payment collection not found");
    if (collection.status === "reversed") throw new Error("Payment collection already reversed");
    await requireBranchAccess(actorId, String(collection.branchId), true);

    const reversed = await upsertTableRow("finance", "payment_collection", {
      id: collectionId,
      status: "reversed",
    });

    await upsertTableRow("inventory", "stock_trace_event", {
      id: randomUUID(),
      entityType: "payment_collection",
      entityId: collectionId,
      revision: 1,
      action: "reversed",
      actorId,
      details: { reason, amount: String(collection.amount ?? 0) },
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
      const [drawers, allSessions] = await Promise.all([
        listTableRows<Record<string, any>>("commerce", "cash_drawer"),
        listTableRows<Record<string, any>>("commerce", "cashier_session"),
      ]);
      const drawer = drawers.find((d) => d.id === input.targetId);
      if (!drawer) throw new Error("Cash drawer not found");
      const sessions = allSessions
        .filter((s) => s.drawerId === input.targetId && s.status === "closed")
        .sort((a, b) => new Date(b.closedAt ?? 0).getTime() - new Date(a.closedAt ?? 0).getTime())
        .slice(0, 10);
      totalSales = sessions.reduce((s, x) => s.add(String(x.totalSales ?? 0)), new Database.Decimal(0));
      totalReturns = sessions.reduce((s, x) => s.add(String(x.totalReturns ?? 0)), new Database.Decimal(0));
      totalCash = sessions.reduce((s, x) => s.add(String(x.actualCash ?? 0)), new Database.Decimal(0));
      cashVariance = sessions.reduce((s, x) => s.add(String(x.cashDifference ?? 0)), new Database.Decimal(0));
      snapshotData = { drawerCode: drawer.code, sessionCount: sessions.length };
    } else if (input.level === "session") {
      const allSessions = await listTableRows<Record<string, any>>("commerce", "cashier_session");
      const session = allSessions.find((s) => s.id === input.targetId);
      if (!session) throw new Error("Cashier session not found");
      if (session.status !== "closed") throw new Error("Cashier session must be closed before closing");
      totalSales = new Database.Decimal(String(session.totalSales ?? 0));
      totalReturns = new Database.Decimal(String(session.totalReturns ?? 0));
      totalCash = new Database.Decimal(String(session.actualCash ?? 0));
      cashVariance = new Database.Decimal(String(session.cashDifference ?? 0));
      snapshotData = {
        sessionId: session.id,
        cashierId: session.cashierId,
        openedAt: session.openedAt ? new Date(session.openedAt).toISOString() : undefined,
        closedAt: session.closedAt ? new Date(session.closedAt).toISOString() : undefined,
      };
    } else if (input.level === "shift") {
      const [shifts, allSessions] = await Promise.all([
        listTableRows<Record<string, any>>("commerce", "retail_shift"),
        listTableRows<Record<string, any>>("commerce", "cashier_session"),
      ]);
      const shift = shifts.find((s) => s.id === input.targetId);
      if (!shift) throw new Error("Retail shift not found");
      const openSessions = allSessions.filter((s) => s.shiftId === shift.id && s.status === "open").length;
      if (openSessions > 0) throw new Error("Cannot close shift with open cashier sessions");

      const sessions = allSessions.filter((s) => s.shiftId === shift.id);
      totalSales = sessions.reduce((s, x) => s.add(String(x.totalSales ?? 0)), new Database.Decimal(0));
      totalReturns = sessions.reduce((s, x) => s.add(String(x.totalReturns ?? 0)), new Database.Decimal(0));
      totalCash = sessions.reduce((s, x) => s.add(String(x.actualCash ?? 0)), new Database.Decimal(0));
      cashVariance = sessions.reduce((s, x) => s.add(String(x.cashDifference ?? 0)), new Database.Decimal(0));
      snapshotData = { shiftNumber: shift.shiftNumber, sessionCount: sessions.length };
    } else if (input.level === "day") {
      const [shifts, allCollections] = await Promise.all([
        listTableRows<Record<string, any>>("commerce", "retail_shift"),
        listTableRows<Record<string, any>>("finance", "payment_collection"),
      ]);
      const openShifts = shifts.filter((s) => s.branchId === input.branchId && s.status === "open").length;
      if (openShifts > 0) throw new Error("Cannot close business day with open shifts");

      const gteMs = new Date(`${input.businessDate}T00:00:00.000Z`).getTime();
      const lteMs = new Date(`${input.businessDate}T23:59:59.999Z`).getTime();
      const collections = allCollections.filter((c) => {
        if (c.branchId !== input.branchId || c.status !== "collected") return false;
        const ms = c.collectedAt ? new Date(c.collectedAt).getTime() : 0;
        return ms >= gteMs && ms <= lteMs;
      });
      totalSales = collections.reduce((s, x) => s.add(String(x.amount ?? 0)), new Database.Decimal(0));
      totalCash = collections
        .filter((c) => c.methodCode === "cash")
        .reduce((s, x) => s.add(String(x.amount ?? 0)), new Database.Decimal(0));
      totalCard = collections
        .filter((c) => c.methodCode === "card")
        .reduce((s, x) => s.add(String(x.amount ?? 0)), new Database.Decimal(0));
      totalOther = collections
        .filter((c) => !["cash", "card"].includes(String(c.methodCode ?? "")))
        .reduce((s, x) => s.add(String(x.amount ?? 0)), new Database.Decimal(0));
      snapshotData = { date: input.businessDate, collectionsCount: collections.length };
    } else if (input.level === "period") {
      snapshotData = { periodId: input.targetId };
    }

    return upsertTableRow("commerce", "retail_closing", {
      id: randomUUID(),
      branchId: input.branchId,
      level: input.level,
      targetId: input.targetId,
      businessDate: `${input.businessDate}T00:00:00.000Z`,
      closedById: actorId,
      totalSales: Number(totalSales.toString()),
      totalReturns: Number(totalReturns.toString()),
      totalCash: Number(totalCash.toString()),
      totalCard: Number(totalCard.toString()),
      totalOther: Number(totalOther.toString()),
      cashVariance: Number(cashVariance.toString()),
      snapshot: snapshotData,
      signature: input.signature || null,
      status: "closed",
    });
  });
}
