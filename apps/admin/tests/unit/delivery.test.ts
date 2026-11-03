import { describe, expect, test } from "vitest";
import { getTranslations } from "../../locales";
import {
  FAILURE_REASONS,
  SHIPMENT_STATUSES,
  SHIPMENT_TRANSITIONS,
  canMoveShipment,
  defaultTimeZone,
  normalizeArea,
  promisedBy,
  upcomingSlots,
  zoneForAddress,
  zonedDate,
  zonedMoment,
} from "../../lib/database/constants/delivery";
import {
  ALL_RESOURCES,
  RESOURCE_FEATURES,
} from "../../lib/database/constants/permissions";

const zones = [
  {
    id: "north",
    areas: ["Muharraq", "Busaiteen"],
    fee: 1,
    minOrder: 5,
    freeOver: 20,
  },
  {
    id: "capital",
    areas: ["المنامة", "Juffair"],
    fee: 0.5,
    minOrder: null,
    freeOver: null,
  },
  { id: "rest", areas: [], fee: 2, minOrder: null, freeOver: null },
];

describe("delivery", () => {
  test("an address finds its zone by area or city, ignoring case, spacing and Arabic letter forms", () => {
    expect(zoneForAddress(zones, { area: "  muharraq ", city: "" })?.id).toBe(
      "north",
    );
    expect(zoneForAddress(zones, { area: "", city: "juffair" })?.id).toBe(
      "capital",
    );
    expect(zoneForAddress(zones, { area: "المنامه" })?.id).toBe("capital");
    expect(zoneForAddress(zones, { area: "Riffa" })?.id).toBe("rest");
    expect(zoneForAddress(zones.slice(0, 2), { area: "Riffa" })).toBeNull();
    expect(normalizeArea("إسا  تاون")).toBe("اسا تاون");
  });

  test("slot times are local to the store's time zone", () => {
    expect(defaultTimeZone("bh")).toBe("Asia/Bahrain");
    expect(defaultTimeZone(null)).toBe("UTC");
    // 09:00 in Bahrain (UTC+3) is 06:00 UTC.
    expect(
      zonedMoment("2026-06-01", "09:00", "Asia/Bahrain").toISOString(),
    ).toBe("2026-06-01T06:00:00.000Z");
    // 22:30 UTC on the 1st is already the 2nd in Bahrain.
    expect(zonedDate(new Date("2026-06-01T22:30:00Z"), "Asia/Bahrain")).toBe(
      "2026-06-02",
    );
  });

  test("customers see the coming slots, not ones about to start or already full", () => {
    // Monday 2026-06-01, 08:30 in Bahrain.
    const now = new Date("2026-06-01T05:30:00Z");
    const slots = [
      {
        id: "am",
        zoneId: null,
        weekday: 1,
        start: "09:00",
        end: "12:00",
        capacity: 2,
      },
      {
        id: "pm",
        zoneId: "north",
        weekday: 1,
        start: "16:00",
        end: "19:00",
        capacity: null,
      },
      {
        id: "other",
        zoneId: "capital",
        weekday: 1,
        start: "16:00",
        end: "19:00",
        capacity: null,
      },
      {
        id: "tue",
        zoneId: null,
        weekday: 2,
        start: "09:00",
        end: "12:00",
        capacity: 1,
      },
    ];
    const taken = new Map([["2026-06-02|tue", 1]]);
    const open = upcomingSlots(
      slots,
      "north",
      now,
      8,
      taken,
      "Asia/Bahrain",
      60,
    );
    // The 09:00 slot starts in 30 minutes (lead time 60), Tuesday's is full, the capital's slot is not this zone's.
    expect(open.slice(0, 2).map((s) => `${s.date} ${s.slotId}`)).toEqual([
      "2026-06-01 pm",
      "2026-06-08 am",
    ]);
    expect(open.find((s) => s.slotId === "am")?.left).toBe(2);
    expect(open.some((s) => s.slotId === "other" || s.slotId === "tue")).toBe(
      false,
    );
  });

  test("the promise is the slot's end, else the order time plus the promised hours", () => {
    const placed = new Date("2026-06-01T05:30:00Z");
    expect(
      promisedBy(
        placed,
        48,
        { date: "2026-06-01", end: "19:00" },
        "Asia/Bahrain",
      ).toISOString(),
    ).toBe("2026-06-01T16:00:00.000Z");
    expect(promisedBy(placed, 48, null, "Asia/Bahrain").toISOString()).toBe(
      "2026-06-03T05:30:00.000Z",
    );
  });

  test("shipments move forward; a failed attempt can go out again or come back", () => {
    expect(canMoveShipment("pending", "out_for_delivery")).toBe(true);
    expect(canMoveShipment("failed", "out_for_delivery")).toBe(true);
    expect(canMoveShipment("delivered", "returned")).toBe(false);
    expect(canMoveShipment("out_for_delivery", "cancelled")).toBe(false);
    for (const targets of Object.values(SHIPMENT_TRANSITIONS))
      for (const to of targets) expect(SHIPMENT_STATUSES).toContain(to);
  });

  test("deliveries are a delivery-module resource and every status and reason is named in both languages", () => {
    expect(ALL_RESOURCES).toContain("deliveries");
    expect(RESOURCE_FEATURES.deliveries).toBe("delivery");
    for (const locale of ["en", "ar"] as const) {
      const all = getTranslations(locale) as unknown as {
        admin: {
          delivery: {
            statuses: Record<string, string>;
            reasons: Record<string, string>;
          };
        };
      };
      for (const s of SHIPMENT_STATUSES)
        expect(all.admin.delivery.statuses[s]).toBeTruthy();
      for (const r of FAILURE_REASONS)
        expect(all.admin.delivery.reasons[r]).toBeTruthy();
    }
  });
});
