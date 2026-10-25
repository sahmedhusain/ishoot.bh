import crypto from "node:crypto";
import { getTranslations, serverMessages } from "@platform/locales";
import { db } from "../db";
import { courierAdapter, countryCode, isApiCourier, type CourierParty } from "../couriers/adapters";
import { getActiveIntegrationCredentials } from "./integrations";
import { COURIER_KINDS } from "../constants/delivery";
import { moveShipment } from "./shipments";
import type { OrderAddress } from "./store";
import { storeFileBytes } from "../services/uploads";

const num = (value: { toString(): string } | null | undefined) => (value == null ? 0 : Number(value.toString()));
const numOrNull = (value: { toString(): string } | null | undefined) => (value == null ? null : Number(value.toString()));
const round3 = (value: number) => Math.round(value * 1000) / 1000;

// ─── Agencies ────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listCourierAgencies() {
  const rows = await db.courierAgency.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { shipments: true } } } });
  return rows.map((a) => ({ id: a.id, name: a.name, kind: a.kind, tracking_url: a.trackingUrl ?? "", phone: a.phone ?? "", email: a.email ?? "", fee: numOrNull(a.feePerShipment), is_active: a.isActive, shipments: a._count.shipments }));
}
export type CourierAgencyRecord = Awaited<ReturnType<typeof listCourierAgencies>>[number];

export interface CourierAgencyInput {
  id?: string;
  name: string;
  kind: string;
  trackingUrl: string;
  phone: string;
  email: string;
  fee: string;
  isActive: boolean;
}

export async function saveCourierAgency(input: CourierAgencyInput) {
  const name = input.name.trim().slice(0, 120);
  if (!name || !(COURIER_KINDS as readonly string[]).includes(input.kind)) throw new Error(serverMessages.courierAgencyInvalid);
  const trackingUrl = input.trackingUrl.trim();
  if (trackingUrl && (!/^https:\/\/[^\s]+$/.test(trackingUrl) || !trackingUrl.includes("{tracking}"))) throw new Error(serverMessages.courierTrackingUrlInvalid);
  const email = input.email.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(serverMessages.customerEmailInvalid);
  const fee = input.fee.trim() ? Number(input.fee) : null;
  if (fee !== null && (!Number.isFinite(fee) || fee < 0 || fee > 99_999)) throw new Error(serverMessages.productAmountInvalid);
  const data = { name, kind: input.kind, trackingUrl: trackingUrl || null, phone: input.phone.trim().slice(0, 40) || null, email: email || null, feePerShipment: fee === null ? null : round3(fee), isActive: input.isActive };
  return input.id ? db.courierAgency.update({ where: { id: input.id }, data }) : db.courierAgency.create({ data });
}

// ─── Handing a shipment to an agency ─────────────────────────────────────────────────────────────────────────────

/** Our side of the parcel: the company as shipper, from its settings. */
async function shipperParty(): Promise<CourierParty> {
  const company = await db.companySetting.findFirst({ select: { companyNameEn: true, phone: true, email: true, addressEn: true, city: true, country: true } });
  return { name: company?.companyNameEn ?? "", phone: company?.phone ?? "", email: company?.email ?? undefined, line1: company?.addressEn ?? "", city: company?.city ?? "", countryCode: countryCode(company?.country) };
}

/** Saves an agency's PDF label as a private file on the shipment. */
async function storeLabel(shipmentId: string, pdfBase64: string, ownerId: string) {
  const bytes = Buffer.from(pdfBase64, "base64");
  if (bytes.length < 100 || bytes.subarray(0, 4).toString() !== "%PDF" || bytes.length > 5 * 1024 * 1024) return null;
  const fileUrl = `/api/files/general/${crypto.randomUUID()}_label.pdf`;
  await storeFileBytes(fileUrl, bytes, "application/pdf");
  const now = new Date();
  await db.$transaction([
    db.uploadObject.create({ data: { fileUrl, ownerId, fileName: "shipping-label.pdf", fileSize: bytes.length, mimeType: "application/pdf", claimedAt: now, expiresAt: now } }),
    db.attachment.create({ data: { fileName: "shipping-label.pdf", fileUrl, fileSize: bytes.length, mimeType: "application/pdf", entityType: "shipment", entityId: shipmentId, uploadedById: ownerId } }),
  ]);
  return fileUrl;
}

export interface HandToAgencyInput {
  agencyId: string;
  /** For agencies without an API (or to record a booking made elsewhere). */
  trackingNumber?: string;
  fee?: string;
}

/**
 * Gives a shipment to a courier agency. Agencies with an API (switched on in Integrations) are booked through it,
 * returning the tracking number and label; otherwise the tracking number is entered by hand.
 */
export async function handToAgency(shipmentId: string, input: HandToAgencyInput, byId: string) {
  const [shipment, agency] = await Promise.all([
    db.shipment.findUnique({ where: { id: shipmentId }, include: { order: { select: { currency: true, total: true, lines: { select: { description: true, quantity: true } } } } } }),
    db.courierAgency.findUnique({ where: { id: input.agencyId } }),
  ]);
  if (!shipment || !["pending", "assigned", "failed"].includes(shipment.status)) throw new Error(serverMessages.shipmentStatusInvalid);
  if (!agency?.isActive) throw new Error(serverMessages.courierAgencyInvalid);
  let trackingNumber = input.trackingNumber?.trim().slice(0, 60) ?? "";
  let labelUrl: string | null = null;
  const credentials = !trackingNumber && isApiCourier(agency.kind) ? await getActiveIntegrationCredentials(agency.kind) : null;
  if (credentials && isApiCourier(agency.kind)) {
    const address = shipment.address as Partial<OrderAddress>;
    const shipper = await shipperParty();
    try {
      const booked = await courierAdapter(agency.kind).book(credentials, {
        reference: shipment.number,
        shipper,
        recipient: { name: shipment.recipientName, phone: shipment.recipientPhone, line1: address.line1 ?? "", line2: [address.line2, address.area].filter(Boolean).join(", "), city: address.city ?? "", countryCode: countryCode(address.country, shipper.countryCode), postalCode: address.postalCode },
        description: shipment.order.lines.map((l) => l.description).join(", ").slice(0, 100),
        pieces: 1,
        weightKg: 1,
        codAmount: num(shipment.codAmount),
        declaredValue: num(shipment.order.total),
        currency: shipment.order.currency,
      });
      trackingNumber = booked.trackingNumber;
      if (booked.label && "url" in booked.label && /^https:\/\//.test(booked.label.url)) labelUrl = booked.label.url;
      else if (booked.label && "pdfBase64" in booked.label) labelUrl = await storeLabel(shipmentId, booked.label.pdfBase64, byId);
    } catch (error) {
      console.error(`Courier ${agency.kind} refused a booking: ${error instanceof Error ? error.message : "error"}`);
      throw new Error(serverMessages.courierBookingFailed);
    }
  }
  if (!trackingNumber) throw new Error(serverMessages.courierTrackingRequired);
  const fee = input.fee?.trim() ? round3(Number(input.fee)) : numOrNull(agency.feePerShipment);
  if (fee !== null && (!Number.isFinite(fee) || fee < 0)) throw new Error(serverMessages.productAmountInvalid);
  const status = shipment.status === "pending" ? "assigned" : shipment.status;
  await db.$transaction([
    db.shipment.update({ where: { id: shipmentId }, data: { method: "agency", agencyId: agency.id, trackingNumber, labelUrl, agencyFee: fee, driverId: null, vehicleId: null, routeSheetId: null, routeStop: null, status } }),
    db.shipmentEvent.create({ data: { shipmentId, status, note: `${agency.name} · ${trackingNumber}`, byId } }),
  ]);
  return { trackingNumber, labelUrl };
}

/**
 * Reads the tracking of every open shipment with an API agency and moves it on: picked up or on its way → out for
 * delivery (the order ships), delivered, failed, returned. Run by the scheduled job.
 */
export async function syncAgencyTracking(limit = 100) {
  const open = await db.shipment.findMany({ where: { method: "agency", trackingNumber: { not: null }, status: { in: ["assigned", "out_for_delivery", "failed"] }, agency: { kind: { in: ["aramex", "dhl_express", "smsa"] } } }, orderBy: { trackedAt: { sort: "asc", nulls: "first" } }, take: limit, include: { agency: true } });
  let moved = 0;
  const credentialsByKind = new Map<string, Awaited<ReturnType<typeof getActiveIntegrationCredentials>>>();
  for (const s of open) {
    const kind = s.agency!.kind;
    if (!isApiCourier(kind)) continue;
    if (!credentialsByKind.has(kind)) credentialsByKind.set(kind, await getActiveIntegrationCredentials(kind));
    const credentials = credentialsByKind.get(kind);
    if (!credentials) continue;
    try {
      const tracking = await courierAdapter(kind).track(credentials, s.trackingNumber!);
      const note = tracking.events[0]?.description.slice(0, 200);
      const steps: string[] = [];
      if (["in_transit", "out_for_delivery", "delivered", "failed", "returned"].includes(tracking.state) && s.status !== "out_for_delivery") steps.push("out_for_delivery");
      if (tracking.state === "delivered") steps.push("delivered");
      if (tracking.state === "failed" && s.status !== "failed") steps.push("failed");
      if (tracking.state === "returned") steps.push(...(s.status === "failed" ? [] : ["failed"]), "returned");
      for (const to of steps) {
        await moveShipment(s.id, { to, note, ...(to === "failed" ? { reason: "other" } : {}) }, null);
        moved++;
      }
    } catch (error) {
      console.error(`Courier tracking for ${s.number} failed: ${error instanceof Error ? error.message : "error"}`);
    }
    await db.shipment.update({ where: { id: s.id }, data: { trackedAt: new Date() } });
  }
  return { checked: open.length, moved };
}

// ─── Agency invoices ─────────────────────────────────────────────────────────────────────────────────────────────

/** Shipments an agency carried that no invoice has covered yet. */
export async function unbilledAgencyShipments(agencyId: string) {
  const rows = await db.shipment.findMany({ where: { agencyId, agencyInvoiceId: null, status: { in: ["out_for_delivery", "delivered", "failed", "returned"] } }, orderBy: { createdAt: "asc" }, take: 500 });
  return rows.map((s) => ({ id: s.id, number: s.number, tracking_number: s.trackingNumber ?? "", status: s.status, fee: numOrNull(s.agencyFee) }));
}

/** The expense category agency invoices go under, created the first time. */
async function deliveryCategory() {
  const en = getTranslations("en").admin.delivery.agencies;
  const ar = getTranslations("ar").admin.delivery.agencies;
  return db.expenseCategory.upsert({ where: { slug: "delivery" }, update: {}, create: { slug: "delivery", nameEn: en.expenseCategory, nameAr: ar.expenseCategory, kind: "operating", isSystem: true, color: "#2563EB", displayOrder: 55 } });
}

export interface AgencyInvoiceInput {
  agencyId: string;
  reference: string;
  invoiceDate: string;
  amount: string;
  shipmentIds: string[];
}

/** Records an agency's invoice for the shipments it covers, as an approved delivery expense. */
export async function recordAgencyInvoice(input: AgencyInvoiceInput, userId: string) {
  const reference = input.reference.trim().slice(0, 60);
  const amount = round3(Number(input.amount));
  if (!reference || !/^\d{4}-\d{2}-\d{2}$/.test(input.invoiceDate) || !Number.isFinite(amount) || amount < 0 || !input.shipmentIds.length) throw new Error(serverMessages.agencyInvoiceInvalid);
  const agency = await db.courierAgency.findUnique({ where: { id: input.agencyId } });
  if (!agency) throw new Error(serverMessages.courierAgencyInvalid);
  if (await db.agencyInvoice.findUnique({ where: { agencyId_reference: { agencyId: agency.id, reference } } })) throw new Error(serverMessages.agencyInvoiceDuplicate);
  const [category, company] = await Promise.all([deliveryCategory(), db.companySetting.findFirst({ select: { defaultCurrency: true } })]);
  const en = getTranslations("en").admin.delivery.agencies;
  const ar = getTranslations("ar").admin.delivery.agencies;
  const ids = Array.from(new Set(input.shipmentIds));
  return db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        categoryId: category.id,
        descriptionEn: `${en.expenseDescription} ${agency.name} ${reference}`,
        descriptionAr: `${ar.expenseDescription} ${agency.name} ${reference}`,
        amount,
        netAmount: amount,
        taxInvoiceNumber: reference,
        currency: company?.defaultCurrency ?? "BHD",
        expenseDate: new Date(`${input.invoiceDate}T00:00:00.000Z`),
        vendorName: agency.name,
        status: "approved",
        createdById: userId,
      },
    });
    const invoice = await tx.agencyInvoice.create({ data: { agencyId: agency.id, reference, invoiceDate: new Date(`${input.invoiceDate}T00:00:00Z`), amount, expenseId: expense.id, createdById: userId } });
    const covered = await tx.shipment.updateMany({ where: { id: { in: ids }, agencyId: agency.id, agencyInvoiceId: null }, data: { agencyInvoiceId: invoice.id } });
    if (covered.count !== ids.length) throw new Error(serverMessages.agencyInvoiceInvalid);
    return invoice;
  });
}

export async function listAgencyInvoices() {
  const rows = await db.agencyInvoice.findMany({ orderBy: { invoiceDate: "desc" }, take: 50, include: { agency: { select: { name: true } }, shipments: { select: { agencyFee: true } } } });
  return rows.map((r) => {
    const expected = round3(r.shipments.reduce((sum, s) => sum + num(s.agencyFee), 0));
    return { id: r.id, agency: r.agency.name, reference: r.reference, invoice_date: r.invoiceDate.toISOString().slice(0, 10), amount: num(r.amount), shipments: r.shipments.length, expected, difference: round3(num(r.amount) - expected), expense_id: r.expenseId };
  });
}
