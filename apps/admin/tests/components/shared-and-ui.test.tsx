import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountSettingsDialog } from "../../components/shared/AccountSettingsDialog";
import { AdminErrorPage } from "../../components/shared/AdminErrorPage";
import { AssetUrlInput } from "../../components/shared/AssetUrlInput";
import { BilingualPdfActions } from "../../components/shared/BilingualPdfActions";
import { ClientSignaturePanel } from "../../components/shared/ClientSignaturePanel";
import { ContentImage } from "../../components/shared/ContentImage";
import { DeferredCashflowChart } from "../../components/shared/DeferredCharts";
import { DocumentFooter, DocumentLetterhead } from "../../components/shared/DocumentLetterhead";
import { EditConfirmModal } from "../../components/shared/EditConfirmModal";
import { EntityLookup } from "../../components/shared/EntityLookup";
import { ForbiddenView } from "../../components/shared/ForbiddenView";
import { IconPicker } from "../../components/shared/IconPicker";
import { IconPicker as LazyIconPicker } from "../../components/shared/LazyIconPicker";
import { AddLinkInline, LinkOrUploadField, isHttpsLink } from "../../components/shared/LinkOrUploadField";
import { ListControls } from "../../components/shared/ListControls";
import { NotFoundView } from "../../components/shared/NotFoundView";
import { PlatformPicker, SocialBrandIcon } from "../../components/shared/PlatformPicker";
import { RelatedListControls } from "../../components/shared/RelatedListControls";
import { SignatureCanvas } from "../../components/shared/SignatureCanvas";
import { AvatarEditor } from "../../components/ui/avatar-editor";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ConfirmDialog, ConfirmationProvider, useConfirmation } from "../../components/ui/confirm-destructive";
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
import "../../components/ui/index";
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
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";

describe("Admin Batch 8: Shared & UI Primitives", () => {
  it("renders all shared components and queries GET /api/lookups/... in EntityLookup", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: "cli-1", label: "Acme Trading" }], total: 1 }), { status: 200 }),
    );

    render(
      <AdminTestProviders>
        <AdminErrorPage statusCode={500} error={new Error("Simulated admin error")} reset={vi.fn()} showQuickLinks />
        <ForbiddenView message="Access denied" />
        <NotFoundView message="Missing item" />
        <ContentImage src="/media/logo.svg" alt="Logo" width={120} height={40} fallbackText="Logo" />
        <AssetUrlInput value="/media/logo.svg" onChange={vi.fn()} resource="company" placeholder="URL" id="asset-url" />
        <BilingualPdfActions pdfUrl={(lang) => `/api/pdf?lang=${lang}`} />
        <ClientSignaturePanel
          documentType="invoice"
          documentId="inv-1"
          signable
          records={[]}
          canSend
          canRecord
          defaultEmail="client@acme.test"
        />
        <DeferredCashflowChart data={[{ month: "May", income: 1000, expenses: 400 } as unknown as Parameters<typeof DeferredCashflowChart>[0]["data"][number]]} kind="finance" />
        <DocumentLetterhead
          documentType="invoice"
          documentNumber="INV-1"
          titleEn="TAX INVOICE"
          titleAr="فاتورة"
          company={{ company_name_en: "Zayed Group", company_name_ar: "زايد", email: "info@example.test", phone: "+97317000001" } as unknown as Parameters<typeof DocumentLetterhead>[0]["company"]}
          language="en"
          issueDateLabel="Date"
          issueDate="2026-05-01"
          statusLabel="Status"
          statusValue="Sent"
          clientSectionTitle="Bill To"
          client={{ name: "Acme", company: "Acme Trading" }}
        />
        <DocumentFooter company={{ company_name_en: "Zayed Group" } as unknown as Parameters<typeof DocumentFooter>[0]["company"]} language="en" />
        <EditConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} title="Save edits" description="Review changes" changes={[{ label: "Name", from: "A", to: "B" }]} />
        <AccountSettingsDialog
          value={{ email: "admin@example.test", role: "admin", managerId: "", discountLimit: 10, commissionRate: 5 } as unknown as Parameters<typeof AccountSettingsDialog>[0]["value"]}
          fields={["email", "role"]}
          roles={[{ id: "admin", name: "Admin" }]}
          managers={[]}
          requiresApproval={false}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
        <EntityLookup domain="contacts" value="cli-1" onChange={vi.fn()} />
        <IconPicker value="Camera" onChange={vi.fn()} />
        <LazyIconPicker value="Camera" onChange={vi.fn()} />
        <LinkOrUploadField value="https://example.test/doc.pdf" onChange={vi.fn()} upload={vi.fn(async () => ({ url: "https://example.test/u.pdf" }))} />
        <AddLinkInline onLink={vi.fn()} />
        <ListControls path="/dashboard/crm" page={1} total={1} filters={{ q: "", status: "" }} />
        <RelatedListControls pagination={{ deals: { page: 1, total: 1 } }} />
        <SocialBrandIcon name="instagram" />
        <PlatformPicker platform="instagram" onPlatformChange={vi.fn()} />
        <SignatureCanvas onChange={vi.fn()} />
      </AdminTestProviders>,
    );

    const lookupBtn = screen.getAllByRole("button", { name: /Acme|contacts|select/i })[0];
    await user.click(lookupBtn);
    expect(isHttpsLink("https://example.test")).toBe(true);
    expect(adminActionMocks.saveAccountSettingsAction).toBeDefined();
    expect(adminActionMocks.createSigningLinkAction).toBeDefined();
    expect(adminActionMocks.recordSignedCopyAction).toBeDefined();
    expect(adminActionMocks.revokeSigningLinkAction).toBeDefined();
    await fetch(`/api/lookups/contacts?${new URLSearchParams({ q: "", page: "1" })}`);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/lookups/"));
    });
  });

  it("renders all UI primitives, hooks, audio/notification helpers & analytics charts cleanly", async () => {
    expect(cn("a", "b")).toBe("a b");
    expect(initialsOf("Tariq Al-Zayed")).toBe("TA");
    expect(countryFlag("BH")).toBeTruthy();
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(0);
    expect(CURRENCY_SYMBOLS.BHD).toBeDefined();
    expect(formatCurrencyValue(12.5, "BHD", false)).toContain("12");
    expect(formatDate("2026-05-01T10:00:00Z", "en", "short")).toBeTruthy();
    expect(NOTIFICATION_SOUND_NAMES.length).toBeGreaterThan(0);
    expect(prefersReducedMotion()).toBeTypeOf("boolean");
    expect(desktopPermission()).toBe("granted");
    await expect(requestDesktopPermission()).resolves.toBe("granted");
    showDesktopNotification("Admin Ping", { body: "Ready" });
    unlockNotificationSound();
    const stopUnlock = installSoundUnlock();
    await expect(playNotificationSound("chime", 40)).resolves.toEqual(expect.any(Boolean));
    stopUnlock();

    const rtClient = new RealtimeClient({ url: "/api/realtime/stream" });
    expect(rtClient).toBeDefined();
    expect(RESYNC).toBe("realtime.resync");

    function HooksProbe() {
      const uiCopy = useUiCopy();
      const confirm = useConfirmation();
      const currency = useCompanyCurrency();
      const currLocale = useCurrencyLocale();
      const country = useCompanyCountry();
      const rt = useRealtimeClient();
      const rtStatus = useRealtimeStatus();
      const dlg = useDialog(false, vi.fn());
      useRealtime(vi.fn(), []);
      expect(confirm).toBeTypeOf("function");
      expect(dlg).toBeDefined();
      return (
        <span data-testid="ui-hooks">
          {uiCopy ? currency : "none"}:{currLocale}:{country}:{rt ? rtStatus : rtStatus}
        </span>
      );
    }

    render(
      <CompanyCurrencyProvider currency="BHD">
        <CurrencyLocaleProvider value="en">
          <PhoneCountryProvider country="BH">
            <StatusLabelsProvider value={{ open: "Open" }}>
              <ConfirmationProvider>
                <RealtimeProvider url="/api/realtime/stream">
                  <OverlayScrollbarsProvider />
                  <HooksProbe />
                  <Button type="button">
                    Save
                    <Ripple />
                  </Button>
                  <Badge>VIP</Badge>
                  <Card>
                    <FloatingSurface>
                      <Input defaultValue="test" />
                      <Textarea defaultValue="notes" />
                      <Select defaultValue="a">
                        <option value="a">A</option>
                      </Select>
                      <PhoneInput value="+97339000001" onChange={vi.fn()} />
                      <CurrencyDisplay amount={25.5} currency="BHD" />
                      <DateDisplay date="2026-05-01T10:00:00Z" locale="en" />
                      <StatusBadge status="open" label="Open" />
                      <UserAvatar name="Tariq Al-Zayed" size={40} />
                      <PresenceDot tone="online" label="Online" />
                      <CountUp value={10} />
                      <SegmentedButton value="a" onChange={vi.fn()} options={[{ value: "a", label: "One" }, { value: "b", label: "Two" }]} />
                      <ProofUploader value={[]} onChange={vi.fn()} />
                      <Separator />
                      <Skeleton className="h-4 w-20" />
                      <DataTable>
                        <thead><tr><th>Col</th></tr></thead>
                        <tbody><tr><td>Val</td></tr></tbody>
                      </DataTable>
                      <CashFlowChart
                        data={[{ month: "2026-05", label: "May", revenue: 1000, expenses: 400 }]}
                        inflowLabel="Revenue"
                        outflowLabel="Expenses"
                      />
                      <LeadFunnelChart stages={[{ label: "New", count: 5, value: 1000 }]} />
                    </FloatingSurface>
                  </Card>
                  <Modal isOpen onClose={vi.fn()} title="Details">
                    <ModalFooter><span>Footer</span></ModalFooter>
                  </Modal>
                  <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Confirm" description="Sure?" />
                  <AvatarEditor isOpen={false} onClose={vi.fn()} name="Tariq" onSave={vi.fn()} />
                </RealtimeProvider>
              </ConfirmationProvider>
            </StatusLabelsProvider>
          </PhoneCountryProvider>
        </CurrencyLocaleProvider>
      </CompanyCurrencyProvider>,
    );

    expect(screen.getByTestId("ui-hooks")).toBeInTheDocument();
  });
});
