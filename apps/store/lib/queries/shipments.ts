import { phoneSearchVariants } from "../constants/phone";
import {
  SHIPMENT_STATUSES,
  canMoveShipment,
  type ShipmentStatus,
} from "../constants/delivery";
import {
  listShipments as listShipmentsApi,
  getShipment as getShipmentApi,
  trackShipment as trackApiShipment,
  listShipmentEvents as listApiShipmentEvents,
  getStoreApiOrder,
  listOrderLines,
} from "@platform/api-client";
import type { OrderAddress } from "./store";

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
  throw new Error("moveShipment is not implemented in API");
}

export async function handToAgency(
  shipmentId: string,
  input: any,
  byId: string,
): Promise<{ trackingNumber: string; [key: string]: any }> {
  throw new Error("handToAgency must be implemented as a single API call in Go backend");
}

export async function syncAgencyTracking(limit = 100) {
  throw new Error("syncAgencyTracking is handled by the Go backend");
}

export async function unbilledAgencyShipments(agencyId: string): Promise<any[]> {
  return [];
}

export async function recordAgencyInvoice(
  input: any,
  userId: string,
): Promise<{ id: string; reference: string; [key: string]: any }> {
  throw new Error("recordAgencyInvoice must be implemented as a single API call in Go backend");
}

export async function listAgencyInvoices(): Promise<any[]> {
  return [];
}

export async function shipmentForTracking(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  try {
    const apiSh = await trackApiShipment(token);
    if (!apiSh || !apiSh.id) return null;
    const [apiEvents, apiOrder, apiLines] = await Promise.all([
      listApiShipmentEvents(apiSh.id).catch(() => []),
      getStoreApiOrder(apiSh.orderId).catch(() => null),
      listOrderLines(apiSh.orderId).catch(() => []),
    ]);
    const addr = (apiSh.address ?? {}) as Partial<OrderAddress>;
    return {
      number: apiSh.number,
      order_number: apiOrder?.number ?? apiSh.orderId,
      order_status: apiOrder?.status ?? "shipped",
      placed_at: apiOrder?.placedAt ?? apiSh.promisedBy,
      status: apiSh.status,
      slot: apiSh.slotDate
        ? {
            date: String(apiSh.slotDate).slice(0, 10),
            start: apiSh.slotStart ?? "",
            end: apiSh.slotEnd ?? "",
          }
        : null,
      promised_by: apiSh.promisedBy,
      delivered_at: apiSh.deliveredAt ?? null,
      failure_reason: apiSh.failureReason ?? "",
      area: [addr.area, addr.city].filter(Boolean).join(", "),
      agency: null as {
        name: string;
        tracking_number: string;
        tracking_link: string;
      } | null,
      lines: (apiLines ?? []).map((l) => ({
        description: l.description,
        quantity: Number(l.quantity ?? 0),
      })),
      events: (apiEvents ?? []).map((e) => ({
        status: e.status,
        reason: e.reason ?? "",
        at: e.at,
      })),
    };
  } catch {
    return null;
  }
}

export async function orderTrackingTokens(orderIds: string[]) {
  const map = new Map<string, string>();
  if (!orderIds.length) return map;
  try {
    const apiShipments = await listShipmentsApi();
    if (Array.isArray(apiShipments)) {
      const idSet = new Set(orderIds);
      for (const sh of apiShipments) {
        if (idSet.has(sh.orderId) && sh.status !== "cancelled" && sh.trackingToken) {
          map.set(sh.orderId, sh.trackingToken);
        }
      }
    }
  } catch {}
  return map;
}