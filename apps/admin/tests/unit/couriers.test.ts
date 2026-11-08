import { afterEach, describe, expect, test, vi } from "vitest";
import { getTranslations } from "../../locales";
import {
  COURIER_KINDS,
  measuredCourierParcel,
} from "../../lib/constants/delivery";
import { INTEGRATION_PROVIDERS } from "../../lib/constants/integrations";
import {
  aramex,
  countryCode,
  courierStateFrom,
  dhlExpress,
  smsa,
} from "../../lib/couriers/adapters";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(answer: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(answer), { status });
  });
  return calls;
}

const party = {
  name: "Shop",
  phone: "+97317000000",
  line1: "Road 1",
  city: "Manama",
  countryCode: "BH",
};
const input = {
  reference: "DL-2026-000001",
  shipper: party,
  recipient: { ...party, name: "Amal", city: "Muharraq" },
  description: "Shoes",
  pieces: 1,
  weightKg: 1.75,
  dimensions: { length: 31, width: 22, height: 14 },
  codAmount: 12.5,
  declaredValue: 12.5,
  currency: "BHD",
};

describe("couriers", () => {
  test("addresses' countries become the two-letter codes couriers want", () => {
    expect(countryCode("Bahrain")).toBe("BH");
    expect(countryCode("السعودية")).toBe("SA");
    expect(countryCode("ae")).toBe("AE");
    expect(countryCode("Atlantis", "BH")).toBe("BH");
  });

  test("courier event words map to shipment states", () => {
    expect(courierStateFrom("Delivered to consignee")).toBe("delivered");
    expect(
      courierStateFrom("Delivery attempted - consignee not available"),
    ).toBe("failed");
    expect(courierStateFrom("Out for Delivery")).toBe("out_for_delivery");
    expect(courierStateFrom("Returned to shipper")).toBe("returned");
    expect(courierStateFrom("Shipment picked up")).toBe("in_transit");
  });

  test("Aramex books with the account and cash on delivery, and returns the label link", async () => {
    const calls = stubFetch({
      HasErrors: false,
      Shipments: [
        {
          ID: "44001122",
          HasErrors: false,
          ShipmentLabel: {
            LabelURL: "https://ws.aramex.net/label/44001122.pdf",
          },
        },
      ],
    });
    const c = {
      environment: "test",
      username: "u",
      password: "p",
      accountNumber: "123",
      accountPin: "321",
      accountEntity: "BAH",
      accountCountryCode: "BH",
    };
    expect(await aramex.book(c, input)).toEqual({
      trackingNumber: "44001122",
      label: { url: "https://ws.aramex.net/label/44001122.pdf" },
    });
    expect(calls[0].url).toBe(
      "https://ws.dev.aramex.net/ShippingAPI.V2/Shipping/Service_1_0.svc/json/CreateShipments",
    );
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.Shipments[0].Details).toMatchObject({
      ProductGroup: "DOM",
      Services: "CODS",
      CashOnDeliveryAmount: { CurrencyCode: "BHD", Value: 12.5 },
    });
    stubFetch({
      HasErrors: true,
      Shipments: [
        { HasErrors: true, Notifications: [{ Message: "Invalid city" }] },
      ],
    });
    await expect(aramex.book(c, input)).rejects.toThrow("Invalid city");
  });

  test("DHL Express returns the PDF label; SMSA its waybill", async () => {
    const calls = stubFetch({
      shipmentTrackingNumber: "1234567890",
      documents: [
        { typeCode: "label", imageFormat: "PDF", content: "JVBERi0xLjQ=" },
      ],
    });
    expect(
      await dhlExpress.book(
        {
          environment: "test",
          apiKey: "k",
          apiSecret: "s",
          accountNumber: "9",
        },
        input,
      ),
    ).toEqual({
      trackingNumber: "1234567890",
      label: { pdfBase64: "JVBERi0xLjQ=" },
    });
    expect(calls[0].url).toBe(
      "https://express.api.dhl.com/mydhlapi/test/shipments",
    );
    expect(JSON.parse(String(calls[0].init.body)).content.packages).toEqual([
      { weight: 1.75, dimensions: { length: 31, width: 22, height: 14 } },
    ]);
    expect(new Headers(calls[0].init.headers).get("Authorization")).toBe(
      `Basic ${Buffer.from("k:s").toString("base64")}`,
    );
    stubFetch({
      sawb: "290077665544",
      waybills: [{ awb: "290077665544", awbFile: "JVBERi0=" }],
    });
    expect(
      await smsa.book({ environment: "test", apiKey: "k" }, input),
    ).toEqual({
      trackingNumber: "290077665544",
      label: { pdfBase64: "JVBERi0=" },
    });
  });

  test("tracking reads the latest event", async () => {
    stubFetch({
      TrackingResults: [
        {
          Key: "44001122",
          Value: [
            { UpdateDescription: "Delivered", UpdateDateTime: "2026-06-01" },
            { UpdateDescription: "Out for delivery" },
          ],
        },
      ],
    });
    expect(
      (await aramex.track({ environment: "test" }, "44001122")).state,
    ).toBe("delivered");
  });

  test("every API courier is a couriers integration, and each connection is named in both languages", () => {
    for (const kind of COURIER_KINDS.filter((k) => k !== "manual"))
      expect(INTEGRATION_PROVIDERS.find((p) => p.id === kind)?.kind).toBe(
        "couriers",
      );
    for (const locale of ["en", "ar"] as const) {
      const admin = getTranslations(locale).admin as unknown as {
        delivery: { agencies: { kinds: Record<string, string> } };
      };
      for (const kind of COURIER_KINDS)
        expect(admin.delivery.agencies.kinds[kind]).toBeTruthy();
    }
  });
});

test("automatic parcel measurements never substitute defaults for missing or invalid values", () => {
  expect(measuredCourierParcel({}, false)).toBeNull();
  expect(measuredCourierParcel({ weightKg: "-1" }, false)).toBeNull();
  expect(measuredCourierParcel({ weightKg: "Infinity" }, false)).toBeNull();
  expect(
    measuredCourierParcel(
      { weightKg: "1.75", lengthCm: "31", widthCm: "22" },
      true,
    ),
  ).toBeNull();
  expect(
    measuredCourierParcel(
      { weightKg: "1.75", lengthCm: "31", widthCm: "22", heightCm: "14" },
      true,
    ),
  ).toEqual({
    weightKg: 1.75,
    dimensions: { length: 31, width: 22, height: 14 },
  });
});
