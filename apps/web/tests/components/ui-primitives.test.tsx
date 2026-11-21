import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as UiBarrel from "../../components/ui";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useUiCopy } from "../../components/ui/copy/use-ui-copy";
import { CountUp, prefersReducedMotion } from "../../components/ui/count-up";
import {
  CURRENCY_SYMBOLS,
  CompanyCurrencyProvider,
  CurrencyDisplay,
  CurrencyLocaleProvider,
  formatCurrencyValue,
  useCompanyCurrency,
  useCurrencyLocale,
} from "../../components/ui/currency-display";
import { FloatingSurface } from "../../components/ui/floating-surface";
import { Input } from "../../components/ui/input";
import {
  COUNTRY_DIAL_CODES,
  PhoneCountryProvider,
  PhoneInput,
  countryFlag,
  useCompanyCountry,
} from "../../components/ui/phone-input";
import { Ripple } from "../../components/ui/ripple";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../components/ui/utils";

describe("Web UI Primitives & Helpers", () => {
  it("exports barrel and utility helpers (cn, formatCurrencyValue, countryFlag, prefersReducedMotion)", () => {
    expect(UiBarrel.Button).toBe(Button);
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
    expect(CURRENCY_SYMBOLS.BHD).toBeDefined();
    expect(formatCurrencyValue(125.5, "BHD", false)).toContain("125.5");
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(10);
    expect(countryFlag("BH").length).toBeGreaterThan(0);
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });

  it("renders Badge, Button, Card, Input (email validation), Textarea, Select, Ripple, CountUp & hooks", async () => {
    const user = userEvent.setup();
    function HooksProbe() {
      const copy = useUiCopy();
      const curr = useCompanyCurrency();
      const loc = useCurrencyLocale();
      const ctry = useCompanyCountry();
      return (
        <div data-testid="ui-hooks">
          {curr}:{loc}:{ctry}:{Boolean(copy.invalidEmail) ? "ok" : "no"}
        </div>
      );
    }

    render(
      <CurrencyLocaleProvider value="en">
        <CompanyCurrencyProvider currency="BHD">
          <PhoneCountryProvider country="BH">
            <Card variant="elevated">
              <Badge variant="default">New</Badge>
              <Button type="button">
                Save
                <Ripple />
              </Button>
              <Input type="email" aria-label="Email Field" defaultValue="bad-email" />
              <Textarea aria-label="Notes Field" defaultValue="Initial" />
              <PhoneInput aria-label="Phone Field" />
              <Select aria-label="Option Field" defaultValue="a">
                <option value="a">Alpha</option>
                <option value="b">Beta</option>
              </Select>
              <CountUp value={42} />
              <CurrencyDisplay amount={99.25} />
              <HooksProbe />
            </Card>
          </PhoneCountryProvider>
        </CompanyCurrencyProvider>
      </CurrencyLocaleProvider>,
    );

    expect(screen.getByTestId("ui-hooks")).toHaveTextContent("BHD:en:BH:ok");
    const emailInput = screen.getByLabelText("Email Field") as HTMLInputElement;
    expect(emailInput.validity.customError).toBe(true);
    await user.clear(emailInput);
    await user.type(emailInput, "valid@example.test");
    expect(emailInput.validity.valid).toBe(true);

    expect(screen.getByLabelText("Notes Field")).toHaveValue("Initial");
    expect(screen.getByLabelText("Phone Field")).toBeInTheDocument();
  });

  it("FloatingSurface renders content anchored to an element", () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    const closeSpy = vi.fn();

    render(
      <FloatingSurface anchor={anchor} onClose={closeSpy}>
        <span>Floating Content</span>
      </FloatingSurface>,
    );

    expect(screen.getByText("Floating Content")).toBeInTheDocument();
    anchor.remove();
  });
});
