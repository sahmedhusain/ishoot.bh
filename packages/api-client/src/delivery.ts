import { apiUrl, apiTimeoutMs } from "./config";
import { apiError } from "./errors";
import { serviceToken } from "./service-token";

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
  const auth = token ?? (await serviceToken("delivery"));
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

export async function getDeliverySettings(token?: string): Promise<DeliverySettings> {
  const res = await fetch(`${apiUrl()}/v1/delivery/settings`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function upsertDeliverySettings(input: Partial<DeliverySettings>, token?: string): Promise<DeliverySettings> {
  const res = await fetch(`${apiUrl()}/v1/delivery/settings`, {
    method: "PUT",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listDeliveryZones(token?: string): Promise<DeliveryZone[]> {
  const res = await fetch(`${apiUrl()}/v1/delivery/zones`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createDeliveryZone(input: Partial<DeliveryZone>, token?: string): Promise<DeliveryZone> {
  const res = await fetch(`${apiUrl()}/v1/delivery/zones`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listDeliverySlots(zoneId: string, token?: string): Promise<DeliverySlot[]> {
  const res = await fetch(`${apiUrl()}/v1/delivery/zones/${zoneId}/slots`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listVehicles(token?: string): Promise<Vehicle[]> {
  const res = await fetch(`${apiUrl()}/v1/delivery/vehicles`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createVehicle(input: Partial<Vehicle>, token?: string): Promise<Vehicle> {
  const res = await fetch(`${apiUrl()}/v1/delivery/vehicles`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listRouteSheets(token?: string): Promise<RouteSheet[]> {
  const res = await fetch(`${apiUrl()}/v1/delivery/routes`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createRouteSheet(input: Partial<RouteSheet>, token?: string): Promise<RouteSheet> {
  const res = await fetch(`${apiUrl()}/v1/delivery/routes`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function listShipments(token?: string): Promise<Shipment[]> {
  const res = await fetch(`${apiUrl()}/v1/delivery/shipments`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function getShipment(id: string, token?: string): Promise<Shipment> {
  const res = await fetch(`${apiUrl()}/v1/delivery/shipments/${id}`, {
    headers: await headers(token),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function createShipment(input: Partial<Shipment>, token?: string): Promise<Shipment> {
  const res = await fetch(`${apiUrl()}/v1/delivery/shipments`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function assignShipmentDriver(
  id: string,
  input: { driverId: string; vehicleId?: string; routeSheetId?: string; routeStop?: number },
  token?: string,
): Promise<Shipment> {
  const res = await fetch(`${apiUrl()}/v1/delivery/shipments/${id}/assign`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function recordProofOfDelivery(
  id: string,
  input: { proofPhotoUrl?: string; proofSignature?: string; codCollected?: string },
  token?: string,
): Promise<Shipment> {
  const res = await fetch(`${apiUrl()}/v1/delivery/shipments/${id}/proof`, {
    method: "POST",
    headers: await headers(token),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export async function trackShipment(token: string): Promise<Shipment> {
  const res = await fetch(`${apiUrl()}/v1/delivery/track/${token}`, {
    signal: AbortSignal.timeout(apiTimeoutMs()),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}
