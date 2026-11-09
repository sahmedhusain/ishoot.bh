import { serverMessages } from "@platform/locales";
import type { ConnectionCheck, Credentials } from "./providers";
import type { CourierKind } from "../config/constants/delivery";

export type ApiCourier = Exclude<CourierKind, "manual">;
export const isApiCourier = (kind: string): kind is ApiCourier =>
  kind === "aramex" || kind === "dhl_express" || kind === "smsa";

export interface CourierParty {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;

  countryCode: string;
  postalCode?: string;
}

interface BookCourierInput {

  reference: string;
  shipper: CourierParty;
  recipient: CourierParty;
  description: string;
  pieces: number;
  weightKg: number;
  dimensions?: { length: number; width: number; height: number };

  codAmount: number;
  declaredValue: number;
  currency: string;
}

export interface BookedCourier {
  trackingNumber: string;

  label?: { pdfBase64: string } | { url: string };
}

type CourierState =
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned"
  | "unknown";

interface CourierTracking {
  state: CourierState;
  events: { at: string; description: string }[];
}

export interface CourierAdapter {
  kind: ApiCourier;
  book(c: Credentials, input: BookCourierInput): Promise<BookedCourier>;
  track(c: Credentials, trackingNumber: string): Promise<CourierTracking>;
  check(c: Credentials): Promise<ConnectionCheck>;
}

export class CourierError extends Error {}

const TIMEOUT_MS = 20_000;
const base = (kind: ApiCourier, fallback: string) =>
  (process.env[`COURIER_BASE_URL_${kind.toUpperCase()}`] || fallback).replace(
    /\/$/,
    "",
  );
const live = (c: Credentials) =>
  (c.environment ?? "").trim().toLowerCase() === "live";
function need(c: Credentials, ...keys: string[]) {
  for (const key of keys)
    if (!c[key]?.trim()) throw new CourierError(`Missing ${key}`);
}
const obj = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const str = (value: unknown) =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";

async function call<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new CourierError(
      error instanceof Error && error.name === "TimeoutError"
        ? "The courier did not respond in time"
        : "Could not reach the courier",
    );
  }
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {}
  if (!response.ok) {
    const b = obj(body);
    throw new CourierError(
      str(b.detail) ||
        str(b.title) ||
        str(b.message) ||
        str(obj(b.error).message) ||
        `The courier returned HTTP ${response.status}`,
    );
  }
  return body as T;
}
const json = (headers: Record<string, string>, body: unknown): RequestInit => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
  },
  body: JSON.stringify(body),
});

function stateFrom(text: string): CourierState {
  const t = text.toLowerCase();
  if (
    /(delivered|تم التسليم)/.test(t) &&
    !/not delivered|undelivered|attempt/.test(t)
  )
    return "delivered";
  if (/return(ed)? to (shipper|origin)|rts\b/.test(t)) return "returned";
  if (
    /(attempt|undeliver|not delivered|refused|exception|failed|unable)/.test(t)
  )
    return "failed";
  if (/out for delivery|with delivery courier|on vehicle/.test(t))
    return "out_for_delivery";
  if (t) return "in_transit";
  return "unknown";
}

const aramexBase = (c: Credentials) =>
  base(
    "aramex",
    live(c) ? "https://ws.aramex.net" : "https://ws.dev.aramex.net",
  );
const aramexClient = (c: Credentials) => ({
  UserName: c.username,
  Password: c.password,
  Version: "v1.0",
  AccountNumber: c.accountNumber,
  AccountPin: c.accountPin,
  AccountEntity: c.accountEntity,
  AccountCountryCode: c.accountCountryCode,
  Source: 24,
});
const aramexParty = (p: CourierParty, account?: string) => ({
  Reference1: "",
  AccountNumber: account ?? "",
  PartyAddress: {
    Line1: p.line1,
    Line2: p.line2 ?? "",
    Line3: "",
    City: p.city,
    StateOrProvinceCode: "",
    PostCode: p.postalCode ?? "",
    CountryCode: p.countryCode,
  },
  Contact: {
    PersonName: p.name,
    CompanyName: p.name,
    PhoneNumber1: p.phone,
    CellPhone: p.phone,
    EmailAddress: p.email ?? "",
    Type: "",
  },
});
const aramexErrors = (body: Record<string, unknown>) =>
  Array.isArray(body.Notifications)
    ? body.Notifications.map((n) => str(obj(n).Message))
        .filter(Boolean)
        .join("; ")
    : "";

export const aramex: CourierAdapter = {
  kind: "aramex",
  async book(c, input) {
    need(
      c,
      "username",
      "password",
      "accountNumber",
      "accountPin",
      "accountEntity",
      "accountCountryCode",
    );
    const domestic = input.shipper.countryCode === input.recipient.countryCode;
    const body = await call<Record<string, unknown>>(
      `${aramexBase(c)}/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments`,
      json(
        {},
        {
          ClientInfo: aramexClient(c),
          LabelInfo: { ReportID: 9201, ReportType: "URL" },
          Shipments: [
            {
              Reference1: input.reference,
              Shipper: aramexParty(input.shipper, c.accountNumber),
              Consignee: aramexParty(input.recipient),
              ShippingDateTime: `/Date(${Date.now()})/`,
              Details: {
                ActualWeight: { Unit: "KG", Value: input.weightKg },
                NumberOfPieces: input.pieces,
                ProductGroup: domestic ? "DOM" : "EXP",
                ProductType: domestic ? "ONP" : "PPX",
                PaymentType: "P",
                DescriptionOfGoods: input.description.slice(0, 100),
                GoodsOriginCountry: input.shipper.countryCode,
                Services: input.codAmount > 0 ? "CODS" : "",
                CashOnDeliveryAmount:
                  input.codAmount > 0
                    ? { CurrencyCode: input.currency, Value: input.codAmount }
                    : null,
                CustomsValueAmount: domestic
                  ? null
                  : {
                      CurrencyCode: input.currency,
                      Value: input.declaredValue,
                    },
              },
            },
          ],
          Transaction: { Reference1: input.reference },
        },
      ),
    );
    const processed = obj((body.Shipments as unknown[] | undefined)?.[0]);
    if (body.HasErrors || processed.HasErrors || !processed.ID)
      throw new CourierError(
        aramexErrors(processed) ||
          aramexErrors(body) ||
          "Aramex did not book the shipment",
      );
    const url = str(obj(processed.ShipmentLabel).LabelURL);
    return {
      trackingNumber: str(processed.ID),
      ...(url ? { label: { url } } : {}),
    };
  },
  async track(c, trackingNumber) {
    const body = await call<Record<string, unknown>>(
      `${aramexBase(c)}/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments`,
      json(
        {},
        {
          ClientInfo: aramexClient(c),
          Shipments: [trackingNumber],
          GetLastTrackingUpdateOnly: false,
        },
      ),
    );
    const result = (
      Array.isArray(body.TrackingResults) ? body.TrackingResults : []
    )
      .map(obj)
      .find((r) => str(r.Key) === trackingNumber);
    const updates = (Array.isArray(result?.Value) ? result.Value : []).map(obj);
    const events = updates.map((u) => ({
      at: str(u.UpdateDateTime),
      description: str(u.UpdateDescription),
    }));
    return { state: stateFrom(events[0]?.description ?? ""), events };
  },
  async check(c) {
    need(
      c,
      "environment",
      "username",
      "password",
      "accountNumber",
      "accountPin",
      "accountEntity",
      "accountCountryCode",
    );

    const body = await call<Record<string, unknown>>(
      `${aramexBase(c)}/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments`,
      json(
        {},
        {
          ClientInfo: aramexClient(c),
          Shipments: ["0"],
          GetLastTrackingUpdateOnly: true,
        },
      ),
    );
    const problem = aramexErrors(body);
    if (problem) return { ok: false, error: problem };
    if (!Array.isArray(body.TrackingResults))
      return { ok: false, error: serverMessages.providerInvalidResponse };
    return {
      ok: true,
      accountName: `${c.accountNumber} · ${live(c) ? "Live" : "Test"}`,
    };
  },
};

const dhlBase = (c: Credentials) =>
  base(
    "dhl_express",
    live(c)
      ? "https://express.api.dhl.com/mydhlapi"
      : "https://express.api.dhl.com/mydhlapi/test",
  );
const dhlAuth = (c: Credentials) => ({
  Authorization: `Basic ${Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString("base64")}`,
});
const dhlParty = (p: CourierParty) => ({
  postalAddress: {
    addressLine1: p.line1.slice(0, 45),
    ...(p.line2 ? { addressLine2: p.line2.slice(0, 45) } : {}),
    cityName: p.city,
    countryCode: p.countryCode,
    postalCode: p.postalCode || "",
  },
  contactInformation: {
    fullName: p.name,
    companyName: p.name,
    phone: p.phone,
    ...(p.email ? { email: p.email } : {}),
  },
});

export const dhlExpress: CourierAdapter = {
  kind: "dhl_express",
  async book(c, input) {
    need(c, "apiKey", "apiSecret", "accountNumber");
    if (
      input.pieces !== 1 ||
      !input.dimensions ||
      Object.values(input.dimensions).some(
        (value) => !Number.isFinite(value) || value <= 0,
      )
    )
      throw new CourierError(serverMessages.courierParcelRequired);
    const domestic = input.shipper.countryCode === input.recipient.countryCode;
    const body = await call<Record<string, unknown>>(
      `${dhlBase(c)}/shipments`,
      json(
        {
          ...dhlAuth(c),
          "Message-Reference": input.reference.padEnd(28, "0").slice(0, 36),
        },
        {
          plannedShippingDateAndTime: new Date(Date.now() + 3_600_000)
            .toISOString()
            .replace(/\.\d{3}Z$/, " GMT+00:00"),
          pickup: { isRequested: false },
          productCode: domestic ? "N" : "P",
          accounts: [{ typeCode: "shipper", number: c.accountNumber }],
          outputImageProperties: {
            encodingFormat: "pdf",
            imageOptions: [
              { typeCode: "label", templateName: "ECOM26_84_001" },
            ],
          },
          customerDetails: {
            shipperDetails: dhlParty(input.shipper),
            receiverDetails: dhlParty(input.recipient),
          },
          content: {
            packages: [
              { weight: input.weightKg, dimensions: input.dimensions },
            ],
            isCustomsDeclarable: !domestic,
            declaredValue: input.declaredValue,
            declaredValueCurrency: input.currency,
            description: input.description.slice(0, 70),
            incoterm: "DAP",
            unitOfMeasurement: "metric",
          },
          shipmentNotification: [],
          customerReferences: [{ value: input.reference, typeCode: "CU" }],
        },
      ),
    );
    const number = str(body.shipmentTrackingNumber);
    if (!number) throw new CourierError("DHL did not book the shipment");
    const label = (Array.isArray(body.documents) ? body.documents : [])
      .map(obj)
      .find(
        (d) =>
          str(d.typeCode) === "label" ||
          str(d.imageFormat).toUpperCase() === "PDF",
      );
    return {
      trackingNumber: number,
      ...(label && str(label.content)
        ? { label: { pdfBase64: str(label.content) } }
        : {}),
    };
  },
  async track(c, trackingNumber) {
    const body = await call<Record<string, unknown>>(
      `${dhlBase(c)}/shipments/${encodeURIComponent(trackingNumber)}/tracking?trackingView=all-checkpoints`,
      { headers: { ...dhlAuth(c), Accept: "application/json" } },
    );
    const shipment = obj((body.shipments as unknown[] | undefined)?.[0]);
    const events = (Array.isArray(shipment.events) ? shipment.events : [])
      .map(obj)
      .map((e) => ({
        at: `${str(e.date)} ${str(e.time)}`.trim(),
        description: str(e.description),
      }))
      .reverse();
    const status = str(shipment.status);
    return {
      state: status
        ? stateFrom(status)
        : stateFrom(events[0]?.description ?? ""),
      events,
    };
  },
  async check(c) {
    need(c, "environment", "apiKey", "apiSecret", "accountNumber");
    await call(
      `${dhlBase(c)}/address-validate?type=delivery&countryCode=BH&cityName=Manama`,
      { headers: { ...dhlAuth(c), Accept: "application/json" } },
    );
    return {
      ok: true,
      accountName: `${c.accountNumber} · ${live(c) ? "Live" : "Test"}`,
    };
  },
};

const smsaBase = (c: Credentials) =>
  base(
    "smsa",
    live(c)
      ? "https://ecomapis.smsaexpress.com"
      : "https://ecomapis-sandbox.azurewebsites.net",
  );
const smsaParty = (p: CourierParty) => ({
  ContactName: p.name,
  ContactPhoneNumber: p.phone,
  Coordinates: "",
  Country: p.countryCode,
  District: "",
  PostalCode: p.postalCode ?? "",
  City: p.city,
  AddressLine1: p.line1,
  AddressLine2: p.line2 ?? "",
});

export const smsa: CourierAdapter = {
  kind: "smsa",
  async book(c, input) {
    need(c, "apiKey");
    const body = await call<Record<string, unknown>>(
      `${smsaBase(c)}/api/shipment/b2c/new`,
      json(
        { apikey: c.apiKey },
        {
          ConsigneeAddress: smsaParty(input.recipient),
          ShipperAddress: smsaParty(input.shipper),
          OrderNumber: input.reference,
          DeclaredValue: input.declaredValue,
          CODAmount: input.codAmount,
          Parcels: input.pieces,
          ShipDate: new Date().toISOString(),
          ShipmentCurrency: input.currency,
          SMSARetailID: "0",
          WaybillType: "PDF",
          Weight: input.weightKg,
          WeightUnit: "KG",
          ContentDescription: input.description.slice(0, 100),
        },
      ),
    );
    const waybill = obj((body.waybills as unknown[] | undefined)?.[0]);
    const number = str(body.sawb) || str(waybill.awb);
    if (!number) throw new CourierError("SMSA did not book the shipment");
    return {
      trackingNumber: number,
      ...(str(waybill.awbFile)
        ? { label: { pdfBase64: str(waybill.awbFile) } }
        : {}),
    };
  },
  async track(c, trackingNumber) {
    const body = await call<Record<string, unknown>>(
      `${smsaBase(c)}/api/track/single/${encodeURIComponent(trackingNumber)}`,
      { headers: { apikey: c.apiKey, Accept: "application/json" } },
    );
    const scans = (
      Array.isArray(body.Scans)
        ? body.Scans
        : Array.isArray(body.scans)
          ? body.scans
          : []
    ).map(obj);
    const events = scans.map((s) => ({
      at: str(s.ScanDateTime ?? s.scanDateTime),
      description: str(s.ScanDescription ?? s.scanDescription),
    }));
    return { state: stateFrom(events[0]?.description ?? ""), events };
  },
  async check(c) {
    need(c, "environment", "apiKey");
    const result = await call<Record<string, unknown>>(
      `${smsaBase(c)}/api/track/single/0`,
      { headers: { apikey: c.apiKey, Accept: "application/json" } },
    );
    if (
      result.success === false ||
      result.error ||
      !Array.isArray(result.Scans ?? result.scans)
    )
      return {
        ok: false,
        error:
          str(result.message) ||
          str(obj(result.error).message) ||
          serverMessages.providerInvalidResponse,
      };
    return { ok: true, accountName: live(c) ? "Live" : "Sandbox" };
  },
};

const ADAPTERS: Record<ApiCourier, CourierAdapter> = {
  aramex,
  dhl_express: dhlExpress,
  smsa,
};
export const courierAdapter = (kind: ApiCourier) => ADAPTERS[kind];
export { stateFrom as courierStateFrom };

const COUNTRIES: Record<string, string> = {
  bahrain: "BH",
  البحرين: "BH",
  "saudi arabia": "SA",
  ksa: "SA",
  السعودية: "SA",
  "المملكة العربية السعودية": "SA",
  "united arab emirates": "AE",
  uae: "AE",
  الإمارات: "AE",
  kuwait: "KW",
  الكويت: "KW",
  qatar: "QA",
  قطر: "QA",
  oman: "OM",
  عمان: "OM",
  عُمان: "OM",
  jordan: "JO",
  الأردن: "JO",
  egypt: "EG",
  مصر: "EG",
  iraq: "IQ",
  العراق: "IQ",
  lebanon: "LB",
  لبنان: "LB",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
};
export function countryCode(value: string | null | undefined, fallback = "") {
  const text = (value ?? "").trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  return COUNTRIES[text.toLowerCase()] ?? fallback;
}
