import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";
import { normalizeApiRecord } from "./normalize";

export type DeliverySettings = {
  id: string;
  mode: string;
  slaHours: number;
  timeZone?: string | null;
  slotDays: number;
  leadMinutes: number;
  requireSlot: boolean;
};

export type DeliveryZone = {
  id: string;
  nameEn: string;
  nameAr: string;
  areas: string[];
  fee: string;
  minOrder?: string | null;
  freeOver?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type DeliverySlot = {
  id: string;
  zoneId?: string | null;
  weekday: number;
  slotStart: string;
  slotEnd: string;
  capacity?: number | null;
  isActive: boolean;
};

export type Vehicle = {
  id: string;
  plate: string;
  name: string;
  kind: string;
  notes?: string | null;
  isActive: boolean;
};

export type RouteSheet = {
  id: string;
  number: string;
  driverId?: string | null;
  vehicleId?: string | null;
  status: string;
  runDate: string;
};

export type Shipment = {
  id: string;
  number: string;
  orderId: string;
  status: string;
  method: string;
  zoneId?: string | null;
  slotId?: string | null;
  slotDate?: string | null;
  slotStart?: string | null;
  slotEnd?: string | null;
  promisedBy: string;
  recipientName: string;
  recipientPhone: string;
  address: Record<string, unknown>;
  codAmount: string;
  codCollected: string;
  trackingToken: string;
  attempts: number;
  failureReason?: string | null;
  outAt?: string | null;
  deliveredAt?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  routeSheetId?: string | null;
  routeStop?: number | null;
  proofPhotoUrl?: string | null;
  proofSignature?: string | null;
  agencyId?: string | null;
  trackingNumber?: string | null;
};

export type ShipmentEvent = {
  id: string;
  shipmentId: string;
  status: string;
  reason?: string | null;
  note?: string | null;
  byId?: string | null;
  at: string;
};

async function headers(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const auth = token ?? (await serviceToken());
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

async function delivFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const h = await headers(token);
  const res = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: { ...h, ...(options.headers as any) },
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json();
  return normalizeApiRecord(data) as T;
}

export async function getDeliverySettings(token?: string): Promise<DeliverySettings> {
  return delivFetch<DeliverySettings>("/v1/delivery/settings", {}, token);
}

export async function upsertDeliverySettings(input: Partial<DeliverySettings>, token?: string): Promise<DeliverySettings> {
  return delivFetch<DeliverySettings>("/v1/delivery/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  }, token);
}

export async function listDeliveryZones(token?: string): Promise<DeliveryZone[]> {
  return delivFetch<DeliveryZone[]>("/v1/delivery/zones", {}, token);
}

export async function createDeliveryZone(input: Partial<DeliveryZone>, token?: string): Promise<DeliveryZone> {
  return delivFetch<DeliveryZone>("/v1/delivery/zones", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listDeliverySlots(zoneId: string, token?: string): Promise<DeliverySlot[]> {
  return delivFetch<DeliverySlot[]>(`/v1/delivery/zones/${encodeURIComponent(zoneId)}/slots`, {}, token);
}

export async function listVehicles(token?: string): Promise<Vehicle[]> {
  return delivFetch<Vehicle[]>("/v1/delivery/vehicles", {}, token);
}

export async function createVehicle(input: Partial<Vehicle>, token?: string): Promise<Vehicle> {
  return delivFetch<Vehicle>("/v1/delivery/vehicles", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listRouteSheets(token?: string): Promise<RouteSheet[]> {
  return delivFetch<RouteSheet[]>("/v1/delivery/routes", {}, token);
}

export async function createRouteSheet(input: Partial<RouteSheet>, token?: string): Promise<RouteSheet> {
  return delivFetch<RouteSheet>("/v1/delivery/routes", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function listShipments(token?: string): Promise<Shipment[]> {
  return delivFetch<Shipment[]>("/v1/delivery/shipments", {}, token);
}

export async function getShipment(id: string, token?: string): Promise<Shipment> {
  return delivFetch<Shipment>(`/v1/delivery/shipments/${encodeURIComponent(id)}`, {}, token);
}

export async function createShipment(input: Partial<Shipment>, token?: string): Promise<Shipment> {
  return delivFetch<Shipment>("/v1/delivery/shipments", {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function assignShipmentDriver(
  id: string,
  input: { driverId: string; vehicleId?: string; routeSheetId?: string; routeStop?: number },
  token?: string,
): Promise<Shipment> {
  return delivFetch<Shipment>(`/v1/delivery/shipments/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function recordProofOfDelivery(
  id: string,
  input: { proofPhotoUrl?: string; proofSignature?: string; codCollected?: string },
  token?: string,
): Promise<Shipment> {
  return delivFetch<Shipment>(`/v1/delivery/shipments/${encodeURIComponent(id)}/proof`, {
    method: "POST",
    body: JSON.stringify(input),
  }, token);
}

export async function trackShipment(token: string): Promise<Shipment> {
  return delivFetch<Shipment>(`/v1/delivery/track/${encodeURIComponent(token)}`);
}
