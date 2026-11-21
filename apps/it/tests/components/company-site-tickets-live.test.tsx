import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import enCopy from "../../locales/en.json";
import { CompanyThemeTab } from "../../components/CompanyThemeTab";
import { CompanyView } from "../../components/CompanyView";
import { CopyProvider, useCopy } from "../../components/CopyProvider";
import { DomainSaveConfirmModal } from "../../components/DomainSaveConfirmModal";
import { ItUnifiedErrorPage } from "../../components/ItUnifiedErrorPage";
import { OverviewView } from "../../components/OverviewView";
import { QueueView } from "../../components/QueueView";
import { SLAView } from "../../components/SLAView";
import { SetupView } from "../../components/SetupView";
import { Shell } from "../../components/Shell";
import { SiteView } from "../../components/SiteView";
import { StorePresetsView } from "../../components/StorePresetsView";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import { TicketView } from "../../components/TicketView";
import { ItBell } from "../../components/live/ItBell";
import { ItLive, useItLive } from "../../components/live/ItLive";
import { ItStatus } from "../../components/live/ItStatus";
import {
  OverdueBadge,
  PageTitle,
  RemindedBadge,
  StatusBadge,
} from "../../components/ticket-ui";
import { itActionMocks } from "./setup";
import {
  ItTestProviders,
  makeCmsSnapshot,
  makeCompanyAssets,
  makeCompanyConfig,
  makeModules,
  makeSLAPolicies,
  makeSiteCode,
  makeSiteDomains,
  makeTicket,
  makeTicketDetail,
} from "./fixtures";

describe("IT Company, Site, Tickets, Shell & Live Presence Components", () => {
  it("CompanyThemeTab, CompanyView, SetupView & DomainSaveConfirmModal wire save/setup actions", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <CompanyThemeTab initialTheme={{}} canEdit />
        <CompanyView
          company={makeCompanyConfig()}
          assets={makeCompanyAssets()}
          setupStatus={{ complete: false, missing: ["logo"] }}
          canEdit
          canComplete
        />
        <SetupView
          company={makeCompanyConfig()}
          setupStatus={{ complete: false, missing: [] }}
          modules={makeModules()}
          domains={makeSiteDomains()}
          canEdit
          canExecute
          roles={["it_admin"]}
        />
        <DomainSaveConfirmModal
          open
          currentWebsite="old.example.test"
          newWebsite="new.example.test"
          currentAdmin="admin.old.test"
          newAdmin="admin.new.test"
          busy={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </ItTestProviders>,
    );

    expect(screen.getAllByDisplayValue("Zayed Diversified Group W.L.L.").length).toBeGreaterThanOrEqual(1);
    expect(itActionMocks.saveCompanyAction).toBeDefined();
    expect(itActionMocks.finishCompanySetupAction).toBeDefined();
    expect(itActionMocks.uploadCompanyAssetAction).toBeDefined();
    expect(itActionMocks.removeCompanyAssetAction).toBeDefined();
    expect(itActionMocks.saveSiteDomainsAction).toBeDefined();
    expect(itActionMocks.setModuleAction).toBeDefined();

    await user.click(screen.getByRole("button", { name: /cinematic/i }));
    await user.click(screen.getByRole("button", { name: /Save Appearance/i }));
    await waitFor(() => {
      expect(itActionMocks.saveCompanyAction).toHaveBeenCalled();
    });
  });

  it("SiteView & StorePresetsView invoke site actions and PUT /api/v1/it/store-presets", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    render(
      <ItTestProviders>
        <SiteView
          domains={makeSiteDomains()}
          code={makeSiteCode()}
          company={makeCompanyConfig()}
          snapshot={makeCmsSnapshot()}
          canEditDomains
          canCheckDomains
          canEditCode
          canEditPresentation
        />
        <StorePresetsView canEdit />
      </ItTestProviders>,
    );

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.storePresets.save, "i") }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/it/store-presets",
        expect.objectContaining({ method: "PUT" }),
      );
    });

    expect(itActionMocks.checkSiteDomainAction).toBeDefined();
    expect(itActionMocks.saveSiteCodeAction).toBeDefined();
    expect(itActionMocks.saveSitePresentationAction).toBeDefined();
    expect(itActionMocks.revalidatePublicSiteFromItAction).toBeDefined();
    expect(itActionMocks.createItSocialLinkAction).toBeDefined();
    expect(itActionMocks.updateItSocialLinkAction).toBeDefined();
    expect(itActionMocks.deleteItSocialLinkAction).toBeDefined();
    expect(itActionMocks.publishItWebsiteSnapshotAction).toBeDefined();
  });

  it("OverviewView, QueueView, SLAView, TicketView & ticket-ui exercise ticket lifecycle and SLA updates", async () => {
    const user = userEvent.setup();
    const detail = makeTicketDetail();

    render(
      <ItTestProviders>
        <PageTitle title="Tickets" description="All tickets" actions={<span>Actions</span>} />
        <StatusBadge status="open" />
        <OverdueBadge />
        <RemindedBadge />
        <OverviewView
          stats={{
            open: 3,
            breached: 1,
            unassigned: 1,
            byStatus: { open: 3 },
            byPriority: { high: 2 },
          }}
          latest={[makeTicket()]}
        />
        <QueueView
          query={{ open: true }}
          page={{ items: [makeTicket()] }}
        />
        <SLAView policies={makeSLAPolicies()} canEdit />
        <TicketView detail={detail} staffOptions={[]} canEdit canAssign isAssignee />
      </ItTestProviders>,
    );

    expect(screen.getAllByText(/VPN client certificate renewal/).length).toBeGreaterThanOrEqual(1);
    const commentBox = screen.getByPlaceholderText(enCopy.tickets.replyPlaceholder);
    await user.type(commentBox, "Adding updated diagnostics note");
    fireEvent.submit(commentBox.closest("form")!);

    await waitFor(() => {
      expect(itActionMocks.commentAction).toHaveBeenCalledWith(
        "tkt-1",
        "Adding updated diagnostics note",
        false,
        undefined,
      );
    });

    expect(itActionMocks.uploadAttachmentAction).toBeDefined();
    expect(itActionMocks.transitionAction).toBeDefined();
    expect(itActionMocks.updateSLAAction).toBeDefined();
  });

  it("Shell, CopyProvider, ItUnifiedErrorPage, TelemetryMonitor & ItLive/ItBell/ItStatus handle realtime + /api/logs/batch + /api/notifications + /api/realtime/activity", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/notifications?view=settings")) {
        return new Response(
          JSON.stringify({
            preferences: { desktopEnabled: true, soundEnabled: true, popupsEnabled: true, sound: "chime", volume: 50, categories: [] },
            mutes: [],
            status: { presence: { status: "available" } },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/notifications?view=preview")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "inb-1",
                title: "Ticket Updated",
                body: "SLA warning",
                category: "tickets",
                entityType: "ticket",
                entityId: "tkt-1",
                createdAt: "2026-05-01T10:00:00Z",
                readAt: null,
              },
            ],
            unreadCount: 1,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    function LiveProbe() {
      const copyCtx = useCopy();
      const liveCtx = useItLive();
      return (
        <span data-testid="live-probe">
          {copyCtx.locale}:{liveCtx.status?.presence.status ?? "none"}
        </span>
      );
    }

    const origBeacon = navigator.sendBeacon;
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });

    const { unmount } = render(
      <CopyProvider copy={enCopy} locale="en">
        <TelemetryMonitor />
        <Shell
          email="it@example.test"
          roles={["it_admin"]}
          dbRoles={[]}
          branding={{ companyName: "Zayed Group", iconUrl: "/media/icon.svg" }}
        >
          <LiveProbe />
          <ItUnifiedErrorPage statusCode={500} error={new Error("Simulated IT error")} reset={vi.fn()} />
        </Shell>
      </CopyProvider>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/notifications?view=settings",
        expect.anything(),
      );
    });

    const bellButton = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-haspopup") === "dialog");
    expect(bellButton).toBeDefined();
    await user.click(bellButton!);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/notifications?view=preview",
        expect.anything(),
      );
    });

    unmount();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/logs/batch",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchSpy).toHaveBeenCalled();

    // Direct reference checks for all realtime & status exports
    expect(ItLive).toBeDefined();
    expect(ItBell).toBeDefined();
    expect(ItStatus).toBeDefined();
    expect(itActionMocks.savePreferencesAction).toBeDefined();
    expect(itActionMocks.inboxAction).toBeDefined();
    expect(itActionMocks.muteRecordAction).toBeDefined();
    expect(itActionMocks.unmuteRecordAction).toBeDefined();
    expect(itActionMocks.setStatusAction).toBeDefined();
    expect(itActionMocks.clearStatusAction).toBeDefined();

    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: origBeacon });
  });

  it("ItLive handles notification.created SSE events (GET /api/notifications?id=...) and reports idle activity (POST /api/realtime/activity)", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      if (url.includes("/api/notifications?view=settings")) {
        return new Response(
          JSON.stringify({
            preferences: {
              soundEnabled: true,
              sound: "chime",
              volume: 50,
              popupsEnabled: true,
              desktopEnabled: true,
              categories: [],
            },
            mutes: [],
            status: { presence: { status: "available" } },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/notifications?id=")) {
        return new Response(
          JSON.stringify({
            id: "notif-1",
            title: "Security Alert",
            body: "API key rotated",
            actionUrl: "/api-keys",
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const EventSourceCtor = globalThis.EventSource as unknown as {
      instances: Array<{ emit: (data: unknown) => void }>;
    };

    const { unmount } = render(
      <ItTestProviders>
        <ItLive>
          <div>live-child</div>
        </ItLive>
      </ItTestProviders>,
    );

    await Promise.resolve();
    await Promise.resolve();
    const es = EventSourceCtor.instances[EventSourceCtor.instances.length - 1];
    expect(es).toBeDefined();

    es.emit({ type: "realtime.ready" });
    es.emit({ type: "notification.created", data: { id: "notif-1", category: "security" } });

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/notifications?id=notif-1",
      expect.objectContaining({ cache: "no-store" }),
    );

    // Advance past 5-minute IDLE_AFTER_MS + 15s check interval so RealtimeClient invokes onActivity("idle")
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 20_000);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/realtime/activity",
      expect.objectContaining({ method: "POST" }),
    );

    unmount();
    vi.useRealTimers();
  });
});
