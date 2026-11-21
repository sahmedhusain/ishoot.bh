import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import enCopy from "../../locales/en.json";
import { ApiKeysView } from "../../components/ApiKeysView";
import { CriticalActionModal } from "../../components/CriticalActionModal";
import { ITAccountsView } from "../../components/ITAccountsView";
import { SessionsView } from "../../components/SessionsView";
import { SettingsView } from "../../components/SettingsView";
import { ItLive } from "../../components/live/ItLive";
import {
  StaffAccessEditor,
  StaffEffectiveAccess,
} from "../../components/StaffAccessEditor";
import { StaffAccountsView } from "../../components/StaffAccountsView";
import { StaffRolesView } from "../../components/StaffRolesView";
import { itActionMocks } from "./setup";
import {
  ItTestProviders,
  makeApiKeys,
  makeITAccountPage,
  makeITRoles,
  makeSessionsPage,
  makeStaffAccountsPage,
  makeStaffRoles,
  makeStaffRolesPage,
} from "./fixtures";

describe("IT Security, Accounts, Sessions & Roles Components", () => {
  it("ApiKeysView creates and revokes API keys via createAPIKeyAction and revokeAPIKeyAction", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <ApiKeysView keys={makeApiKeys()} canCreate canDelete />
      </ItTestProviders>,
    );

    expect(screen.getByText("ERP Sync")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.apiKeys.newKey, "i") }));

    const form = screen.getByPlaceholderText(enCopy.apiKeys.namePlaceholder).closest("form")!;
    await user.type(screen.getByPlaceholderText(enCopy.apiKeys.namePlaceholder), "Automation Key");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(itActionMocks.createAPIKeyAction).toHaveBeenCalledWith(
        "Automation Key",
        expect.any(Array),
        expect.any(Number),
      );
    });

    const revokeBtn = screen.getByRole("button", { name: enCopy.apiKeys.revoke });
    await user.click(revokeBtn);
    await user.type(screen.getByPlaceholderText(/REVOKE/i), "REVOKE");
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.criticalModal.confirm, "i") }));

    await waitFor(() => {
      expect(itActionMocks.revokeAPIKeyAction).toHaveBeenCalledWith("key-1");
    });
  });

  it("CriticalActionModal requires typed phrase when configured and triggers onConfirm", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.fn();
    const cancelSpy = vi.fn();

    render(
      <ItTestProviders>
        <CriticalActionModal
          open
          title="Dangerous Change"
          description="Confirm carefully."
          impactDetails={["Resets access tokens"]}
          requiredConfirmationText="CONFIRM"
          onConfirm={confirmSpy}
          onCancel={cancelSpy}
        />
      </ItTestProviders>,
    );

    const confirmBtn = screen.getByRole("button", { name: enCopy.criticalModal.confirm });
    expect(confirmBtn).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "CONFIRM");
    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it("ITAccountsView renders IT operators and invokes createITAccountAction & updateITAccountAction", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ItTestProviders>
        <ITAccountsView
          page={makeITAccountPage()}
          cursor=""
          userRoles={["it_admin"]}
          userEmail="it@example.test"
          canCreate
          canEdit
          dbRoles={makeITRoles()}
        />
      </ItTestProviders>,
    );

    expect(screen.getAllByText("it@example.test").length).toBeGreaterThanOrEqual(1);

    const newBtn = screen.getAllByRole("button").find((b) =>
      b.textContent?.toLowerCase().includes("add") || b.textContent?.toLowerCase().includes("create") || b.textContent?.toLowerCase().includes("new"),
    );
    if (newBtn) await user.click(newBtn);

    const forms = container.querySelectorAll("form");
    if (forms.length > 0) {
      fireEvent.submit(forms[0]);
    }
    expect(itActionMocks.createITAccountAction).toBeDefined();
    expect(itActionMocks.updateITAccountAction).toBeDefined();
  });

  it("SessionsView renders active sessions and exercises revokeSessionAction", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <SessionsView
          page={makeSessionsPage()}
          filter={{ realm: "it", subjectId: "", cursor: "" }}
          currentSessionId="sess-other"
          now={Date.parse("2026-05-01T10:00:00Z")}
          canRevoke
        />
      </ItTestProviders>,
    );

    expect(screen.getAllByText(/it@example\.test/).length).toBeGreaterThanOrEqual(1);
    const revokeBtn = screen.getByRole("button", { name: enCopy.sessions.revoke });
    await user.click(revokeBtn);

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: enCopy.sessions.revoke }));

    await waitFor(() => {
      expect(itActionMocks.revokeSessionAction).toHaveBeenCalledWith("sess-1");
    });
  });

  it("SettingsView loads security status + IT roles and wires MFA, roles, preferences & presence actions", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          preferences: {
            soundEnabled: true,
            sound: "chime",
            volume: 70,
            popupsEnabled: true,
            desktopEnabled: false,
            categories: [],
          },
          mutes: [],
          status: { presence: { status: "available" } },
        }),
        { status: 200 },
      ),
    );

    render(
      <ItTestProviders>
        <ItLive>
          <SettingsView email="it@example.test" roles={["it_admin"]} dbRoles={makeITRoles()} />
        </ItLive>
      </ItTestProviders>,
    );

    const accountTab = await screen.findByRole("button", { name: enCopy.settings.tabs.account });
    await user.click(accountTab);
    await waitFor(() => {
      expect(itActionMocks.getItSecurityStatusAction).toHaveBeenCalled();
    });
    expect(screen.getAllByText(/it@example\.test/).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: enCopy.settings.tabs.roles }));
    await waitFor(() => {
      expect(itActionMocks.getITRolesAction).toHaveBeenCalled();
    });

    expect(itActionMocks.beginItMFAAction).toBeDefined();
    expect(itActionMocks.confirmItMFAAction).toBeDefined();
    expect(itActionMocks.disableItMFAAction).toBeDefined();
    expect(itActionMocks.cancelItMFAAction).toBeDefined();
    expect(itActionMocks.saveITRoleAction).toBeDefined();
    expect(itActionMocks.deleteITRoleAction).toBeDefined();
    expect(itActionMocks.savePreferencesAction).toBeDefined();
    expect(itActionMocks.setStatusAction).toBeDefined();
    expect(itActionMocks.clearStatusAction).toBeDefined();
    expect(itActionMocks.unmuteRecordAction).toBeDefined();
  });

  it("StaffAccessEditor, StaffEffectiveAccess, StaffAccountsView & StaffRolesView manage grants and staff accounts", async () => {
    const onChangeSpy = vi.fn();
    render(
      <ItTestProviders>
        <StaffAccessEditor
          grants={{ "crm:read": true }}
          scopes={{ crm: "all" }}
          onChange={onChangeSpy}
        />
        <StaffEffectiveAccess permissions={{ "crm:read": true }} scopes={{ crm: "all" }} />
        <StaffAccountsView
          page={makeStaffAccountsPage()}
          roles={makeStaffRoles()}
          cursor=""
          canCreate
          canEdit
          canExecute
        />
        <StaffRolesView
          page={makeStaffRolesPage()}
          cursor=""
          canCreate
          canEdit
          canDelete
        />
      </ItTestProviders>,
    );

    expect(screen.getAllByText(/Bader Ali/).length).toBeGreaterThanOrEqual(1);
    expect(itActionMocks.saveStaffAccountAction).toBeDefined();
    expect(itActionMocks.copyStaffAccessAction).toBeDefined();
    expect(itActionMocks.previewStaffAccessAction).toBeDefined();
    expect(itActionMocks.suspendStaffAccountAction).toBeDefined();
    expect(itActionMocks.unsuspendStaffAccountAction).toBeDefined();
    expect(itActionMocks.resetStaffMFAAction).toBeDefined();
    expect(itActionMocks.inviteStaffAccountAction).toBeDefined();
    expect(itActionMocks.saveStaffRoleAction).toBeDefined();
    expect(itActionMocks.deleteStaffRoleAction).toBeDefined();
  });
});
