import { randomUUID } from "node:crypto";
import { phoneSearchVariants } from "../constants/phone";
import {
  SHIPMENT_STATUSES,
  canMoveShipment,
  type ShipmentStatus,
} from "../constants/delivery";
import { listShipments as listShipmentsApi, getShipment as getShipmentApi } from "@platform/api-client";
import { listTableRows, upsertTableRow } from "../api/tables";

export async function getShipment(id: string) {
  return getShipmentApi(id);
}

export interface ShipmentFilters {
  q?: string;
  status?: string;
  date?: string;
  zoneId?: string;
  late?: boolean;
  driverId?: string;
  page?: number;
}

const PAGE = 50;

export async function listShipments(
  filters: ShipmentFilters = {},
  now = new Date(),
) {
  const rows = await listShipmentsApi();
  const filtered = (rows || []).filter(s => {
    if (filters.status && s.status !== filters.status) return false;
    if (filters.zoneId && s.zoneId !== filters.zoneId) return false;
    if (filters.driverId && s.driverId !== filters.driverId) return false;
    if (filters.late && (s.status !== "pending" && s.status !== "assigned" && s.status !== "failed" || new Date(s.promisedBy) >= now)) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const match = s.number.toLowerCase().includes(q) || s.recipientName.toLowerCase().includes(q) || s.recipientPhone.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
  const page = Math.max(1, filters.page ?? 1);
  const items = filtered.slice((page - 1) * PAGE, page * PAGE);
  return {
    total: filtered.length,
    page,
    pageSize: PAGE,
    rows: items.map((s) => ({
      id: s.id,
      number: s.number,
      order_number: s.orderId,
      status: s.status,
      method: s.method,
      recipient: s.recipientName,
      phone: s.recipientPhone,
      area: "Unknown",
      zone_en: "",
      zone_ar: "",
      slot: s.slotDate ? {
        date: s.slotDate.slice(0, 10),
        start: s.slotStart ?? "",
        end: s.slotEnd ?? "",
      } : null,
      promised_by: s.promisedBy,
      late: (s.status === "pending" || s.status === "assigned" || s.status === "failed") && new Date(s.promisedBy) < now,
      cod_amount: Number(s.codAmount),
      driver_en: "",
      driver_ar: "",
    })),
  };
}

export async function shipmentCounts(
  now = new Date(),
  driverId?: string | null,
) {
  const shipments = await listShipments();
  const stats: Record<string, number> = {};
  let late = 0;
  for (const s of shipments.rows || []) {
    if (driverId && (s as any).driver_id !== driverId) continue;
    stats[s.status] = (stats[s.status] || 0) + 1;
    if (s.status === "pending" || s.status === "assigned" || s.status === "failed") {
      if (new Date((s as any).promised_by) < now) late++;
    }
  }
  return { ...stats, late };
}

export async function moveShipment(
  id: string,
  input: { to: string; note?: string; reason?: string; codCollected?: number; [key: string]: any },
  byId: string | null,
): Promise<any> {
  const { moveShipmentStatusApi } = await import("../api/delivery");
  return moveShipmentStatusApi(id, {
    to: input.to,
    note: input.note,
    reason: input.reason,
    codCollected: input.codCollected,
    actorId: byId ?? undefined,
  });
}

export async function handToAgency(
  shipmentId: string,
  input: any,
  byId: string,
): Promise<{ trackingNumber: string; [key: string]: any }> {
  const { handToAgencyApi } = await import("../api/delivery");
  return handToAgencyApi(shipmentId, {
    agencyName: input?.agencyName ?? input?.agency_name,
    trackingNumber: input?.trackingNumber ?? input?.tracking_number,
    note: input?.note,
    actorId: byId,
  });
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;

export async function syncAgencyTracking(limit = 100) {
  const shipments = await listShipmentsApi().catch(() => []);
  const active = (shipments || [])
    .filter(
      (s) =>
        (s.method === "agency" || Boolean(s.agencyId)) &&
        !["delivered", "cancelled", "returned"].includes(s.status),
    )
    .slice(0, Math.max(0, limit));
  return { checked: active.length, updated: 0 };
}

export async function unbilledAgencyShipments(agencyId: string): Promise<any[]> {
  const [shipments, agencies] = await Promise.all([
    listTableRows<any>("delivery", "shipment", "created_at DESC").catch(() => []),
    listTableRows<any>("delivery", "courier_agency").catch(() => []),
  ]);
  const agency = agencies.find((a) => a.id === agencyId);
  const fee = Number(agency?.fee ?? 0);
  return shipments
    .filter((s) => s.agencyId === agencyId && s.status !== "cancelled")
    .map((s) => ({
      id: s.id,
      number: s.number,
      tracking_number: s.trackingNumber ?? "",
      status: s.status,
      fee,
    }));
}

export async function recordAgencyInvoice(
  input: any,
  userId: string,
): Promise<{ id: string; reference: string; [key: string]: any }> {
  if (!input?.agencyId) {
    throw new Error("Courier agency is required");
  }
  const reference =
    String(input.reference ?? input.invoiceNumber ?? "").trim() ||
    `AGY-${Date.now()}`;
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid invoice amount");
  }
  const invoiceDate = input.invoiceDate
    ? new Date(`${String(input.invoiceDate).slice(0, 10)}T00:00:00.000Z`).toISOString()
    : new Date().toISOString();
  const created = await upsertTableRow<any>("finance", "agency_invoice", {
    id: randomUUID(),
    agencyId: input.agencyId,
    reference,
    invoiceDate,
    amount,
    createdById: userId,
  });
  return { ...created, id: created.id, reference: created.reference ?? reference };
}

export async function listAgencyInvoices(): Promise<any[]> {
  const [invoices, agencies, shipments] = await Promise.all([
    listTableRows<any>("finance", "agency_invoice", "created_at DESC").catch(() => []),
    listTableRows<any>("delivery", "courier_agency").catch(() => []),
    listTableRows<any>("delivery", "shipment").catch(() => []),
  ]);
  const agencyById = new Map<string, any>(agencies.map((a): [string, any] => [String(a.id), a]));
  const shipmentsByAgency = new Map<string, number>();
  for (const s of shipments) {
    if (s.agencyId && s.status !== "cancelled") {
      shipmentsByAgency.set(
        String(s.agencyId),
        (shipmentsByAgency.get(String(s.agencyId)) ?? 0) + 1,
      );
    }
  }
  return invoices.map((row) => {
    const agency = agencyById.get(String(row.agencyId));
    const count = shipmentsByAgency.get(String(row.agencyId)) ?? 0;
    const fee = Number(agency?.fee ?? 0);
    const amount = Number(row.amount ?? 0);
    const expected = round3(count * fee);
    return {
      id: row.id,
      agency_id: row.agencyId,
      agency: agency?.name ?? "",
      reference: row.reference ?? "",
      invoice_date: row.invoiceDate ? String(row.invoiceDate).slice(0, 10) : "",
      amount,
      shipments: count,
      expected,
      difference: round3(amount - expected),
    };
  });
}