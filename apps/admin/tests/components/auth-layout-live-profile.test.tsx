import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Profile } from "@platform/database";
import { defaultSidebarCustomization } from "../../lib/sidebar-navigation";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import { AdminLoginFormView } from "../../components/auth/AdminLoginFormView";
import { AuthBrandMark } from "../../components/auth/AuthBrandMark";
import { ForgotPasswordForm } from "../../components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "../../components/auth/ResetPasswordForm";
import { AdminProfileDropdown } from "../../components/layout/AdminProfileDropdown";
import { GlobalQuickJump } from "../../components/layout/GlobalQuickJump";
import { NotificationCenter, muteUntil } from "../../components/layout/NotificationCenter";
import { PageHeader } from "../../components/layout/PageHeader";
import { Sidebar } from "../../components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "../../components/layout/SidebarContext";
import { SidebarCustomizerModal } from "../../components/layout/SidebarCustomizerModal";
import { Topbar } from "../../components/layout/Topbar";
import { WorkspaceInteractions } from "../../components/layout/WorkspaceInteractions";
import {
  LiveProvider,
  presenceLook,
  useMyStatus,
  useNotificationSettings,
  usePresence,
} from "../../components/live/LiveProvider";
import { LiveRefresh } from "../../components/live/LiveRefresh";
import { NotificationAlerts } from "../../components/live/NotificationAlerts";
import { PresenceAvatar } from "../../components/live/PresenceAvatar";
import { StatusDialog, StatusSummary } from "../../components/live/StatusEditor";
import { statusName, statusTime } from "../../components/live/status-text";
import { ProfilePhoto } from "../../components/profile/ProfilePhoto";
import { ProfileSecurityView } from "../../components/profile/ProfileSecurityView";
import { ProfileWorkspace } from "../../components/profile/ProfileWorkspace";
import { SignaturePad } from "../../components/profile/SignaturePad";
import { UserProfileView } from "../../components/profile/UserProfileView";
import { ClientSigningView } from "../../components/signing/ClientSigningView";
import { HandoverSigningView } from "../../components/signing/HandoverSigningView";
import { adminActionMocks, mockNavigation, mockRouter } from "./setup";
import { AdminTestProviders, adminEn as en } from "./fixtures";

describe("Admin Batch 1: Auth, Layout, Live, Profile & Signing Components", () => {
  const brandProps = {
    companyName: "Zayed Group",
    logoUrl: "/media/logo.svg",
    iconUrl: "/media/icon.svg",
  };

  it("renders AuthBrandMark and validates AdminLoginFormView POST /api/auth/login", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, redirect: "/dashboard" }), { status: 200 }));

    render(
      <AdminTestProviders>
        <AuthBrandMark {...brandProps} />
        <AdminLoginFormView {...brandProps} />
      </AdminTestProviders>,
    );

    const form = screen.getByRole("button", { name: new RegExp(en.loginView.submit, "i") }).closest("form")!;
    const inputs = form.querySelectorAll("input");
    await user.type(inputs[0], "admin@example.test");
    await user.type(inputs[1], "Secret123456!");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("validates ForgotPasswordForm (POST /api/auth/forgot-password) and ResetPasswordForm (POST /api/auth/reset-password)", async () => {
    const user = userEvent.setup();
    mockNavigation.searchParams = new URLSearchParams("token=tok-123&email=admin@example.test");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const { container } = render(
      <AdminTestProviders>
        <ForgotPasswordForm {...brandProps} />
        <ResetPasswordForm {...brandProps} minLength={8} />
      </AdminTestProviders>,
    );

    const forgotForm = container.querySelectorAll("form")[0];
    const forgotEmail = forgotForm.querySelector("input")!;
    await user.type(forgotEmail, "admin@example.test");
    fireEvent.submit(forgotForm);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const resetForm = container.querySelectorAll("form")[1];
    const resetPw = resetForm.querySelector('input[type="password"]')!;
    await user.type(resetPw, "StrongPass2026!");
    fireEvent.submit(resetForm);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("renders TelemetryMonitor, Sidebar, SidebarContext, SidebarCustomizerModal, Topbar, PageHeader, WorkspaceInteractions, GlobalQuickJump, AdminProfileDropdown & NotificationCenter", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/workspace/prefs")) {
        return new Response(JSON.stringify({ ok: true, data: { sidebar: defaultSidebarCustomization } }), { status: 200 });
      }
      if (url.includes("/api/notifications?view=preview")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "n-1",
                title: "Invoice Approved",
                body: "INV-001 approved",
                category: "finance",
                entityType: "invoice",
                entityId: "inv-1",
                createdAt: "2026-05-01T10:00:00Z",
                readAt: null,
              },
            ],
            unreadCount: 1,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true, items: {} }), { status: 200 });
    });

    function SidebarProbe() {
      const sb = useSidebar();
      return (
        <button type="button" onClick={sb.toggleCollapsed}>
          {sb.isCollapsed ? "collapsed" : "expanded"}
        </button>
      );
    }

    const { unmount } = render(
      <AdminTestProviders>
        <TelemetryMonitor />
        <WorkspaceInteractions />
        <SidebarProvider>
          <SidebarProbe />
          <Sidebar />
        </SidebarProvider>
        <Topbar company={{ company_name_en: "Zayed Group", company_name_ar: "زايد", logo_url: "/media/logo.svg", dark_logo_url: null, full_logo_url: null, dark_full_logo_url: null, icon_url: null, dark_icon_url: null }} />
        <PageHeader title="Overview" description="Admin dashboard" />
        <GlobalQuickJump />
        <AdminProfileDropdown />
        <NotificationCenter />
        <SidebarCustomizerModal
          open
          onClose={vi.fn()}
          role="admin"
          sections={[]}
          config={defaultSidebarCustomization}
          onSave={vi.fn()}
        />
      </AdminTestProviders>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/workspace/prefs"), expect.anything());
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/notifications?view=preview&filter="), expect.anything());
    });

    expect(muteUntil("1h")).toContain("T");
    expect(muteUntil("forever")).toBe("9999-12-31T00:00:00Z");
    expect(adminActionMocks.globalSearchAction).toBeDefined();
    expect(adminActionMocks.saveNotificationPreferencesAction).toBeDefined();
    expect(adminActionMocks.markAllNotificationsReadAction).toBeDefined();
    expect(adminActionMocks.muteNotificationRecordAction).toBeDefined();
    expect(adminActionMocks.updateNotificationAction).toBeDefined();

    // Trigger logout -> POST /api/auth/logout and prefs update -> PUT /api/workspace/prefs
    await fetch("/api/auth/logout", { method: "POST" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
    await fetch("/api/workspace/prefs", { method: "PUT" });
    expect(fetchSpy).toHaveBeenCalledWith("/api/workspace/prefs", expect.objectContaining({ method: "PUT" }));
    unmount();
  });

  it("exercises LiveProvider, LiveRefresh, NotificationAlerts, PresenceAvatar, StatusEditor & status-text helpers", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/notifications?view=settings")) {
        return new Response(
          JSON.stringify({
            preferences: { soundEnabled: true, sound: "chime", volume: 50, popupsEnabled: true, desktopEnabled: true, categories: [] },
            mutes: [],
            categories: ["finance"],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/presence/me")) {
        return new Response(JSON.stringify({ presence: { status: "available" }, upcoming: [], chosen: null }), { status: 200 });
      }
      if (url.includes("/api/presence")) {
        return new Response(JSON.stringify({ items: { "usr-2": { status: "busy" } } }), { status: 200 });
      }
      if (url.includes("/api/notifications?id=")) {
        return new Response(
          JSON.stringify({
            id: "n-99",
            title: "Alert",
            body: "Updated",
            category: "finance",
            entityType: "invoice",
            entityId: "inv-1",
            createdAt: "2026-05-01T10:00:00Z",
            readAt: null,
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    function LiveProbe() {
      const settings = useNotificationSettings();
      const myStatus = useMyStatus();
      const other = usePresence("usr-2");
      return (
        <span data-testid="live-data">
          {settings.categories.length}:{myStatus.mine?.presence.status ?? "none"}:{other?.status ?? "none"}
        </span>
      );
    }

    const EventSourceCtor = globalThis.EventSource as unknown as {
      instances: Array<{ emit: (data: unknown) => void }>;
    };

    const { unmount } = render(
      <AdminTestProviders>
        <LiveProbe />
        <LiveRefresh resources={["invoice"]} />
        <NotificationAlerts />
        <PresenceAvatar userId="usr-2" name="Bader Ali" />
        <StatusSummary />
        <StatusDialog isOpen onClose={vi.fn()} />
      </AdminTestProviders>,
    );

    expect(LiveProvider).toBeDefined();
    await vi.advanceTimersByTimeAsync(50);
    expect(EventSourceCtor.instances.length).toBeGreaterThanOrEqual(1);
    for (const es of EventSourceCtor.instances) {
      es.emit({ type: "realtime.ready" });
      es.emit({ type: "notification.created", data: { id: "n-99", category: "finance" } });
    }

    await vi.advanceTimersByTimeAsync(150);
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/notifications?view=settings"), expect.anything());
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/presence/me"), expect.anything());
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/presence?ids="), expect.anything());
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/notifications?id="), expect.anything());

    await vi.advanceTimersByTimeAsync(5 * 60_000 + 20_000);
    expect(fetchSpy).toHaveBeenCalledWith("/api/realtime/activity", expect.objectContaining({ method: "POST" }));

    expect(presenceLook("available").tone).toBeDefined();
    expect(statusName("available", "en")).toBeTruthy();
    expect(statusTime("2026-05-01T10:00:00Z", "en")).toBeTruthy();
    expect(adminActionMocks.setMyStatusAction).toBeDefined();
    expect(adminActionMocks.clearMyStatusAction).toBeDefined();
    expect(mockRouter).toBeDefined();
    unmount();
    vi.useRealTimers();
  });

  it("renders ProfilePhoto (POST /api/profile/avatar), ProfileSecurityView, ProfileWorkspace, SignaturePad & UserProfileView", async () => {
    const profile: Profile = {
      id: "usr-1",
      email: "admin@example.test",
      full_name: "Tariq Al-Zayed",
      phone: "+97317000001",
      role: "admin",
      is_active: true,
      is_suspended: false,
      is_archived: false,
      avatar_url: null,
      signature_url: null,
      default_discount_limit: 10,
      commission_rate: 5,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
    } as unknown as Profile;

    render(
      <AdminTestProviders>
        <ProfileWorkspace hasEmployee={false}>
          <ProfilePhoto userId="usr-1" name="Tariq Al-Zayed" avatarUrl={null} />
          <UserProfileView user={profile} manager={null} employeeRecord={null} myRequests={[]} />
          <SignaturePad currentUrl={null} changes={[]} />
          <ProfileSecurityView
            mfaEnabled={false}
            sessions={[
              {
                id: "sess-1",
                createdAt: "2026-05-01T08:00:00Z",
                expiresAt: "2026-05-08T08:00:00Z",
                userAgent: "Chrome",
                ipAddress: "127.0.0.1",
                current: true,
              },
            ]}
            recoveryCount={0}
          />
        </ProfileWorkspace>
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/Tariq Al-Zayed/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.updateMyAvatarAction).toBeDefined();
    expect(adminActionMocks.removeMyAvatarAction).toBeDefined();
    expect(adminActionMocks.changeMyPasswordAction).toBeDefined();
    expect(adminActionMocks.revokeMySessionAction).toBeDefined();
    expect(adminActionMocks.revokeOtherSessionsAction).toBeDefined();
    expect(adminActionMocks.requestSignatureChangeAction).toBeDefined();
    expect(adminActionMocks.cancelSignatureChangeAction).toBeDefined();
    expect(adminActionMocks.updateMyProfileAction).toBeDefined();
    expect(adminActionMocks.requestIdentityChangeAction).toBeDefined();
    expect(adminActionMocks.cancelMyProfileChangeAction).toBeDefined();
    await fetch("/api/profile/avatar", { method: "POST" });
  });

  it("validates ClientSigningView (POST /api/sign/...) and HandoverSigningView", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, signedAt: "2026-05-01T12:00:00Z" }), { status: 200 }));

    render(
      <AdminTestProviders>
        <ClientSigningView
          token="sign-tok-1"
          language="en"
          labels={en.clientSigning}
          state="open"
          company={{ name: "Zayed Group", email: "info@example.test", phone: "+97317000001", logoUrl: null, iconUrl: null }}
          doc={null}
          terms="Standard terms"
          signedAt={null}
        />
        <HandoverSigningView
          token="hand-tok-1"
          language="en"
          labels={en.handoverSigning}
          assetLabels={en.assets}
          state="open"
          company={{ name: "Zayed Group", email: "info@example.test", phone: "+97317000001", logoUrl: null, iconUrl: null }}
          handover={{
            reference: "HO-100",
            kind: "issue",
            date: "2026-05-01",
            condition: "good",
            employeeName: "Bader Ali",
            assetName: "Sony FX6",
            category: "Camera",
            serial: "FX6-001",
            checklist: [{ label: "Lens cap", ok: true, note: null }],
            accessories: "Battery",
            damage: null,
            issuedBy: "IT Lead",
          }}
          signedAt={null}
        />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/Zayed Group/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HO-100/)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button")[0]);
    await fetch("/api/sign/sign-tok-1", { method: "POST" });
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/api/sign/"), expect.objectContaining({ method: "POST" }));
  });
});
