import { describe, expect, it } from "vitest";
import { isApiCourier } from "../../lib/integrations/courier-adapters";

describe("IT Courier Adapters Suite", () => {
  it("identifies supported API courier integrations", () => {
    expect(isApiCourier("aramex")).toBe(true);
    expect(isApiCourier("dhl_express")).toBe(true);
    expect(isApiCourier("smsa")).toBe(true);

    expect(isApiCourier("manual")).toBe(false);
    expect(isApiCourier("unknown_courier")).toBe(false);
  });
});
