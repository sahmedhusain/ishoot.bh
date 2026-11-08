import { phoneSearchVariants } from "../constants/phone";
import { serverMessages } from "@platform/locales";
import { db } from "../atomic";
import {
  UNRESOLVED_COURIER_BOOKINGS,
  FAILURE_REASONS,
  OPEN_SHIPMENT_STATUSES,
  SHIPMENT_STATUSES,
  canMoveShipment,
  type ShipmentStatus,
} from "../constants/delivery";
import { moveOrderIn, type OrderAddress } from "./store";

/** The agency's public tracking page for a number, when the agency has one. */
const agencyTrackingLink = (
  template: string | null | undefined,
  trackingNumber: string | null | undefined,
) =>
  template && trackingNumber
    ? template.replace("{tracking}", encodeURIComponent(trackingNumber))
    : "";

type Tx = any;
const num = (value: { toString(): string } | null | undefined) =>
  value == null ? 0 : Number(value.toString());
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export interface ShipmentFilters {
  q?: string;
  status?: string;
  /** "YYYY-MM-DD": shipments promised or booked for that day. */
  date?: string;
  zoneId?: string;
  late?: boolean;
  /** Only this driver's shipments (drivers see their own). */
  driverId?: string;
  page?: number;
}

const PAGE = 50;

export async function listShipments(
  filters: ShipmentFilters = {},
  now = new Date(),
) {
  const where: any = {};
  if (
    filters.status &&
    (SHIPMENT_STATUSES as readonly string[]).includes(filters.status)
  )
    where.status = filters.status;
  if (filters.zoneId) where.zoneId = filters.zoneId;
  if (filters.driverId) where.driverId = filters.driverId;
  if (filters.late)
    Object.assign(where, {
      status: { in: OPEN_SHIPMENT_STATUSES },
      promisedBy: { lt: now },
    });
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    const day = new Date(`${filters.date}T00:00:00Z`);
    const next = new Date(day.getTime() + 86_400_000);
    where.OR = [
      { slotDate: day },
      { slotDate: null, promisedBy: { gte: day, lt: next } },
    ];
  }
  const q = filters.q?.trim();
  if (q)
    where.AND = [
      {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { recipientName: { contains: q, mode: "insensitive" } },
          ...phoneSearchVariants(q).map((value) => ({ recipientPhone: { contains: value } })),
          { order: { number: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  const page = Math.max(1, filters.page ?? 1);
  const [rows, total] = await Promise.all([
    db.shipment.findMany({
      where,
      orderBy: [{ promisedBy: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        order: { select: { number: true } },
        zone: { select: { nameEn: true, nameAr: true } },
        driver: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
            firstNameAr: true,
            lastNameAr: true,
          },
        },
      },
    }),
    db.shipment.count({ where }),
  ]);
  return {
    total,
    page,
    pageSize: PAGE,
    rows: rows.map((s) => ({
      id: s.id,
      number: s.number,
      order_number: s.order.number,
      status: s.status,
      method: s.method,

      recipient: s.recipientName,
      phone: s.recipientPhone,
      area: [
        (s.address as Partial<OrderAddress>)?.area,
        (s.address as Partial<OrderAddress>)?.city,
      ]
        .filter(Boolean)
        .join(", "),
      zone_en: s.zone?.nameEn ?? "",
      zone_ar: s.zone?.nameAr ?? "",
      slot: s.slotDate
        ? {
            date: s.slotDate.toISOString().slice(0, 10),
            start: s.slotStart ?? "",
            end: s.slotEnd ?? "",
          }
        : null,
      promised_by: s.promisedBy.toISOString(),
      late:
        (OPEN_SHIPMENT_STATUSES as string[]).includes(s.status) &&
        s.promisedBy < now,
      cod_amount: num(s.codAmount),
      driver_en: s.driver
        ? `${s.driver.firstNameEn} ${s.driver.lastNameEn}`.trim()
        : "",
      driver_ar: s.driver
        ? `${s.driver.firstNameAr} ${s.driver.lastNameAr}`.trim()
        : "",
    })),
  };
}

/** Today's picture for the delivery board: shipments by status and how many are late. */
export async function shipmentCounts(
  now = new Date(),
  /** Only this driver's shipments. */ driverId?: string | null,
) {
  const mine = driverId ? { driverId } : {};
  const [byStatus, late] = await Promise.all([
    db.shipment.groupBy({
      by: ["status"],
      where: { status: { in: OPEN_SHIPMENT_STATUSES }, ...mine },
      _count: { _all: true },
    }),
    db.shipment.count({
      where: {
        status: { in: OPEN_SHIPMENT_STATUSES },
        promisedBy: { lt: now },
        ...mine,
      },
    }),
  ]);
  return {
    ...Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    late,
  } as Partial<Record<ShipmentStatus, number>> & { late: number };
}

export async function getShipment(id: string, now = new Date()) {
  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          currency: true,
          locale: true,
          paymentMethod: true,
          paymentStatus: true,
          lines: {
            orderBy: { sortOrder: "asc" },
            select: { description: true, sku: true, quantity: true },
          },
        },
      },
      zone: { select: { nameEn: true, nameAr: true } },
      events: { orderBy: { at: "asc" } },
      routeSheet: { select: { id: true, number: true } },
      codSettlement: { select: { number: true } },
      agency: { select: { id: true, name: true, trackingUrl: true } },
      agencyInvoice: { select: { reference: true } },
    },
  });
  if (!s) return null;
  const bookingAgency = s.courierBookingAgencyId
    ? await db.courierAgency.findUnique({
        where: { id: s.courierBookingAgencyId },
        select: { id: true, name: true },
      })
    : null;
  const people = await db.user.findMany({
    where: {
      id: { in: s.events.map((e) => e.byId).filter((v): v is string => !!v) },
    },
    select: { id: true, fullName: true },
  });
  return {
    id: s.id,
    number: s.number,
    status: s.status,
    method: s.method,
    courier_booking_agency: bookingAgency,
    courier_booking_started_at:
      s.courierBookingStartedAt?.toISOString() ?? null,
    courier_booking_retry_allowed:
      !!s.courierBookingStartedAt &&
      s.courierBookingStartedAt.getTime() <= now.getTime() - 120_000 &&
      !s.trackingNumber,
    courier_booking:
      s.courierBookingStatus === "pending" &&
      s.courierBookingStartedAt &&
      s.courierBookingStartedAt.getTime() <= now.getTime() - 120_000
        ? "unknown"
        : s.courierBookingStatus,
    order: {
      id: s.order.id,
      number: s.order.number,
      status: s.order.status,
      locale: s.order.locale === "en" ? "en" : "ar",
      total: num(s.order.total),
      currency: s.order.currency,
      payment_method: s.order.paymentMethod,
      payment_status: s.order.paymentStatus,
      lines: s.order.lines.map((l) => ({
        description: l.description,
        sku: l.sku,
        quantity: num(l.quantity),
      })),
    },
    recipient: s.recipientName,
    phone: s.recipientPhone,
    address: s.address as Partial<OrderAddress>,
    zone_en: s.zone?.nameEn ?? "",
    zone_ar: s.zone?.nameAr ?? "",
    slot: s.slotDate
      ? {
          date: s.slotDate.toISOString().slice(0, 10),
          start: s.slotStart ?? "",
          end: s.slotEnd ?? "",
        }
      : null,
    promised_by: s.promisedBy.toISOString(),
    late:
      (OPEN_SHIPMENT_STATUSES as string[]).includes(s.status) &&
      s.promisedBy < now,
    cod_amount: num(s.codAmount),
    cod_collected: num(s.codCollected),
    attempts: s.attempts,
    failure_reason: s.failureReason ?? "",
    tracking_token: s.trackingToken,
    delivered_at: s.deliveredAt?.toISOString() ?? null,
    driver_id: s.driverId ?? "",
    vehicle_id: s.vehicleId ?? "",
    route_sheet: s.routeSheet
      ? { id: s.routeSheet.id, number: s.routeSheet.number, stop: s.routeStop }
      : null,
    proof_photo_url: s.proofPhotoUrl ?? "",
    proof_signature: s.proofSignature ?? "",
    cod_settlement: s.codSettlement?.number ?? "",
    agency: s.agency
      ? {
          id: s.agency.id,
          name: s.agency.name,
          tracking_number: s.trackingNumber ?? "",
          tracking_link: agencyTrackingLink(
            s.agency.trackingUrl,
            s.trackingNumber,
          ),
          label_url: s.labelUrl ?? "",
          fee: s.agencyFee == null ? null : num(s.agencyFee),
          invoice: s.agencyInvoice?.reference ?? "",
        }
      : null,
    events: s.events.map((e) => ({
      id: e.id,
      status: e.status,
      reason: e.reason ?? "",
      note: e.note ?? "",
      at: e.at.toISOString(),
      by: people.find((p) => p.id === e.byId)?.fullName ?? "",
    })),
  };
}
export type ShipmentRecord = NonNullable<
  Awaited<ReturnType<typeof getShipment>>
>;

export interface MoveShipmentInput {
  to: string;
  /** Required when a delivery fails. */
  reason?: string;
  note?: string;
  /** Cash taken from the customer on delivery. */
  codCollected?: number;
}

/** Walks the order forward to `target` through the statuses it skipped (placed → packing → shipped → delivered). */
async function bringOrderTo(
  tx: Tx,
  orderId: string,
  target: "shipped" | "delivered" | "returned",
  byId: string | null,
) {
  const order = await tx.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true },
  });
  const path: Record<string, string[]> = {
    placed: ["packing", "shipped", "delivered"],
    paid: ["packing", "shipped", "delivered"],
    packing: ["shipped", "delivered"],
    shipped: ["delivered"],
  };
  let low: Awaited<ReturnType<typeof moveOrderIn>> = [];
  if (target === "returned") {
    if (order.status === "shipped" || order.status === "delivered")
      low = await moveOrderIn(tx, orderId, "returned", byId, undefined, false);
    return low;
  }
  for (const step of path[order.status] ?? []) {
    low = low.concat(
      await moveOrderIn(
        tx,
        orderId,
        step as "packing" | "shipped" | "delivered",
        byId,
        undefined,
        false,
      ),
    );
    if (step === target) break;
  }
  return low;
}

/**
 * Moves a shipment on, and the order with it: going out ships the order (its stock leaves the warehouse), delivery
 * delivers it, a return brings the stock back. Returns products that fell to their reorder point.
 */
export async function moveShipment(
  id: string,
  input: MoveShipmentInput,
  byId: string | null,
) {
  const to = input.to as ShipmentStatus;
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Shipment" WHERE id = ${id} FOR UPDATE`;
    const shipment = await tx.shipment.findUnique({ where: { id } });
    if (!shipment) throw new Error(serverMessages.procurementDocumentMissing);
    if (
      UNRESOLVED_COURIER_BOOKINGS.some(
        (status) => status === shipment.courierBookingStatus,
      )
    )
      throw new Error(serverMessages.courierBookingUncertain);
    if (!canMoveShipment(shipment.status, to))
      throw new Error(serverMessages.shipmentStatusInvalid);
    const reason = to === "failed" ? (input.reason ?? "") : "";
    if (
      to === "failed" &&
      !(FAILURE_REASONS as readonly string[]).includes(reason)
    )
      throw new Error(serverMessages.shipmentReasonRequired);
    const collected =
      to === "delivered"
        ? round3(input.codCollected ?? num(shipment.codAmount))
        : 0;
    if (
      !Number.isFinite(collected) ||
      collected < 0 ||
      collected > num(shipment.codAmount) + 0.0005
    )
      throw new Error(serverMessages.shipmentCodInvalid);
    const now = new Date();
    await tx.shipment.update({
      where: { id },
      data: {
        status: to,
        ...(to === "out_for_delivery"
          ? { outAt: now, attempts: { increment: 1 }, failureReason: null }
          : {}),
        ...(to === "failed" ? { failureReason: reason } : {}),
        ...(to === "delivered"
          ? { deliveredAt: now, codCollected: collected }
          : {}),
      },
    });
    await tx.shipmentEvent.create({
      data: {
        shipmentId: id,
        status: to,
        reason: reason || null,
        note: input.note?.trim().slice(0, 500) || null,
        byId,
      },
    });
    if (to === "out_for_delivery")
      return bringOrderTo(tx, shipment.orderId, "shipped", byId);
    if (to === "delivered")
      return bringOrderTo(tx, shipment.orderId, "delivered", byId);
    if (to === "returned")
      return bringOrderTo(tx, shipment.orderId, "returned", byId);
    return [];
  });
}

/** What the customer's tracking page shows: no staff names, no internal notes. */
export async function shipmentForTracking(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const s = await db.shipment.findUnique({
    where: { trackingToken: token },
    include: {
      agency: { select: { name: true, trackingUrl: true } },
      order: {
        select: {
          number: true,
          status: true,
          placedAt: true,
          locale: true,
          lines: {
            orderBy: { sortOrder: "asc" },
            select: { description: true, quantity: true },
          },
        },
      },
      events: {
        orderBy: { at: "asc" },
        select: { status: true, reason: true, at: true },
      },
    },
  });
  if (!s) return null;
  const address = s.address as Partial<OrderAddress>;
  return {
    number: s.number,
    order_number: s.order.number,
    order_status: s.order.status,
    placed_at: s.order.placedAt.toISOString(),
    status: s.status,
    slot: s.slotDate
      ? {
          date: s.slotDate.toISOString().slice(0, 10),
          start: s.slotStart ?? "",
          end: s.slotEnd ?? "",
        }
      : null,
    promised_by: s.promisedBy.toISOString(),
    delivered_at: s.deliveredAt?.toISOString() ?? null,
    failure_reason: s.failureReason ?? "",
    area: [address.area, address.city].filter(Boolean).join(", "),
    agency: s.agency
      ? {
          name: s.agency.name,
          tracking_number: s.trackingNumber ?? "",
          tracking_link: agencyTrackingLink(
            s.agency.trackingUrl,
            s.trackingNumber,
          ),
        }
      : null,
    lines: s.order.lines.map((l) => ({
      description: l.description,
      quantity: num(l.quantity),
    })),
    events: s.events.map((e) => ({
      status: e.status,
      reason: e.reason ?? "",
      at: e.at.toISOString(),
    })),
  };
}

/** Tracking links for an order's shipments (the confirmation e-mail and the customer's account). */
export async function orderTrackingTokens(orderIds: string[]) {
  const rows = await db.shipment.findMany({
    where: { orderId: { in: orderIds }, status: { not: "cancelled" } },
    select: { orderId: true, trackingToken: true },
    orderBy: { createdAt: "desc" },
  });
  return new Map(rows.map((r) => [r.orderId, r.trackingToken]));
}
