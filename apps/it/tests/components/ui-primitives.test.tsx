import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as UiBarrel from "../../components/ui";
import { AvatarEditor } from "../../components/ui/avatar-editor";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  ConfirmDialog,
  ConfirmationProvider,
  useConfirmation,
} from "../../components/ui/confirm-destructive";
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
import { DataTable } from "../../components/ui/data-table";
import { DateDisplay, formatDate } from "../../components/ui/date-display";
import {
  desktopPermission,
  requestDesktopPermission,
  showDesktopNotification,
} from "../../components/ui/desktop-notification";
import { FloatingSurface } from "../../components/ui/floating-surface";
import { Input } from "../../components/ui/input";
import { Modal, ModalFooter, useDialog } from "../../components/ui/modal";
import {
  NOTIFICATION_SOUND_NAMES,
  installSoundUnlock,
  playNotificationSound,
  unlockNotificationSound,
} from "../../components/ui/notification-sound";
import { OverlayScrollbarsProvider } from "../../components/ui/overlay-scrollbars";
import {
  COUNTRY_DIAL_CODES,
  PhoneCountryProvider,
  PhoneInput,
  countryFlag,
  useCompanyCountry,
} from "../../components/ui/phone-input";
import { ProofUploader } from "../../components/ui/proof-uploader";
import {
  RESYNC,
  RealtimeClient,
  RealtimeProvider,
  useRealtime,
  useRealtimeClient,
  useRealtimeStatus,
} from "../../components/ui/realtime";
import { Ripple } from "../../components/ui/ripple";
import { SegmentedButton } from "../../components/ui/segmented-button";
import { Select } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge, StatusLabelsProvider } from "../../components/ui/status-badge";
import { Textarea } from "../../components/ui/textarea";
import { PresenceDot, UserAvatar, initialsOf } from "../../components/ui/user-avatar";
import { cn } from "../../components/ui/utils";
import { CashFlowChart } from "../../components/ui/visual-analytics/cash-flow-chart";
import { LeadFunnelChart } from "../../components/ui/visual-analytics/lead-funnel-chart";

describe("IT UI Primitives, Realtime, Notifications & Charts", () => {
  it("tests all IT utility helpers, audio, desktop notification, avatar & analytics charts", async () => {
    expect(UiBarrel.Button).toBe(Button);
    expect(cn("p-1", false && "p-2", "p-3")).toBe("p-3");
    expect(initialsOf("Bader Ali")).toBe("BA");
    expect(CURRENCY_SYMBOLS.BHD).toBeDefined();
    expect(formatCurrencyValue(200, "BHD", false)).toContain("200");
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(10);
    expect(countryFlag("BH").length).toBeGreaterThan(0);
    expect(typeof prefersReducedMotion()).toBe("boolean");
    expect(formatDate("2026-05-01T00:00:00Z", "en")).toContain("2026");

    expect(desktopPermission()).toBe("granted");
    expect(await requestDesktopPermission()).toBe("granted");
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    expect(showDesktopNotification("Alert", { body: "New ticket" })).toBe(true);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

    expect(NOTIFICATION_SOUND_NAMES).toContain("chime");
    unlockNotificationSound();
    const stopUnlock = installSoundUnlock();
    expect(typeof stopUnlock).toBe("function");
    await expect(playNotificationSound("chime", 40)).resolves.toEqual(expect.any(Boolean));
    stopUnlock();

    const client = new RealtimeClient({ url: "/api/realtime/stream" });
    expect(RESYNC).toBe("realtime.resync");
    client.start();
    client.stop();
  });

  it("renders all IT UI primitives, ProofUploader, AvatarEditor, RealtimeProvider & Charts", async () => {
    const user = userEvent.setup();
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    const onProofChange = vi.fn();

    function HooksProbe() {
      const ui = useUiCopy();
      const curr = useCompanyCurrency();
      const loc = useCurrencyLocale();
      const ctry = useCompanyCountry();
      const rtStatus = useRealtimeStatus();
      const rtClient = useRealtimeClient();
      const confirm = useConfirmation();
      const dlg = useDialog(false, vi.fn());
      useRealtime(vi.fn());
      return (
        <div>
          <span data-testid="it-ui-probe">
            {curr}:{loc}:{ctry}:{rtStatus}:{Boolean(rtClient)}:{Boolean(ui.confirm)}:{typeof dlg}
          </span>
          <button type="button" onClick={() => confirm({ title: "IT Confirm", description: "Proceed?", onConfirm: vi.fn() })}>
            Confirm Btn
          </button>
        </div>
      );
    }

    render(
      <CurrencyLocaleProvider value="en">
        <CompanyCurrencyProvider currency="BHD">
          <PhoneCountryProvider country="BH">
            <StatusLabelsProvider value={{ open: "Open" }}>
              <RealtimeProvider url="/api/realtime/stream">
                <ConfirmationProvider>
                  <OverlayScrollbarsProvider />
                  <Card variant="outlined">
                    <Badge variant="default">IT</Badge>
                    <Button type="button">
                      Run
                      <Ripple />
                    </Button>
                    <Input aria-label="IT Input" defaultValue="x" />
                    <Textarea aria-label="IT Textarea" defaultValue="y" />
                    <PhoneInput aria-label="IT Phone" />
                    <Select aria-label="IT Select" defaultValue="1">
                      <option value="1">One</option>
                    </Select>
                    <SegmentedButton
                      label="Env"
                      value="prod"
                      onChange={vi.fn()}
                      options={[{ value: "prod", label: "Prod" }, { value: "dev", label: "Dev" }]}
                    />
                    <Separator />
                    <Skeleton className="h-4 w-8" />
                    <StatusBadge status="open" />
                    <DateDisplay date="2026-05-01T00:00:00Z" />
                    <CurrencyDisplay amount={50} />
                    <CountUp value={5} />
                    <PresenceDot tone="available" label="Online" />
                    <UserAvatar name="Bader Ali" tone="available" />
                    <DataTable>
                      <thead><tr><th>Service</th></tr></thead>
                      <tbody><tr><td>gateway</td></tr></tbody>
                    </DataTable>
                    <ProofUploader value={[]} onChange={onProofChange} maxFiles={3} />
                    <AvatarEditor isOpen onClose={vi.fn()} name="IT User" onSave={vi.fn(async () => {})} />
                    <Modal isOpen onClose={vi.fn()} title="IT Modal">
                      <span>Modal Content</span>
                      <ModalFooter><span>Footer</span></ModalFooter>
                    </Modal>
                    <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Confirm" description="Desc" />
                    <FloatingSurface anchor={anchor} onClose={vi.fn()}><span>Pop</span></FloatingSurface>
                    <CashFlowChart data={[{ month: "Jan", inflow: 100, outflow: 40 }]} />
                    <LeadFunnelChart stages={[{ label: "Open", count: 10 }]} />
                    <HooksProbe />
                  </Card>
                </ConfirmationProvider>
              </RealtimeProvider>
            </StatusLabelsProvider>
          </PhoneCountryProvider>
        </CompanyCurrencyProvider>
      </CurrencyLocaleProvider>,
    );

    expect(screen.getByTestId("it-ui-probe")).toHaveTextContent("BHD:en:BH:");
    await user.click(screen.getByRole("button", { name: "Confirm Btn" }));
    expect(screen.getByText("IT Confirm")).toBeInTheDocument();
    anchor.remove();
  });
});
