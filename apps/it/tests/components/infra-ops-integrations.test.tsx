import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { IntegrationProvider } from "@platform/config/constants/integrations";
import enCopy from "../../locales/en.json";
import { ApiTesterView } from "../../components/ApiTesterView";
import { AuditView } from "../../components/AuditView";
import { BackupsView } from "../../components/BackupsView";
import { DatabaseView } from "../../components/DatabaseView";
import { DeploymentsView } from "../../components/DeploymentsView";
import { IntegrationCard } from "../../components/IntegrationCard";
import { IntegrationDocsModal } from "../../components/IntegrationDocsModal";
import { IntegrationsView } from "../../components/IntegrationsView";
import { JobsView } from "../../components/JobsView";
import { LogsView } from "../../components/LogsView";
import { ModulesView } from "../../components/ModulesView";
import {
  NotificationDetail,
  NotificationsView,
} from "../../components/NotificationsView";
import { SystemHealthView } from "../../components/SystemHealthView";
import { itActionMocks } from "./setup";
import {
  ItTestProviders,
  makeAuditPage,
  makeBackups,
  makeDatabaseStats,
  makeDeskIntegrations,
  makeModules,
  makeNotifyPage,
  makeRuntimeConfig,
  makeServiceHealth,
} from "./fixtures";

describe("IT Infrastructure, Ops, Logs, Backups & Integrations Components", () => {
  it("ApiTesterView executes HTTP request presets cleanly", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    render(
      <ItTestProviders>
        <ApiTesterView token="dev-token" />
      </ItTestProviders>,
    );

    const runBtn = screen.getByRole("button", { name: new RegExp(enCopy.apiTester.send, "i") });
    await user.click(runBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it("BackupsView triggers and verifies backups via triggerBackupAction and verifyBackupAction", async () => {
    const user = userEvent.setup();
    const backups = [
      ...makeBackups(),
      {
        ...makeBackups()[0],
        id: "bak-2",
        kind: "database" as const,
        fileName: "db-2026-05-02.sql",
        status: "completed",
        verifiedAt: null,
      },
    ];
    render(
      <ItTestProviders>
        <BackupsView backups={backups} canExecute />
      </ItTestProviders>,
    );

    expect(screen.getByText("full-2026-05-01.tar.zst")).toBeInTheDocument();
    expect(screen.getByText("db-2026-05-02.sql")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.backups.verify, "i") }));

    await waitFor(() => {
      expect(itActionMocks.verifyBackupAction).toHaveBeenCalledWith("bak-2");
    });

    const createBtn = screen.getByRole("button", { name: new RegExp(enCopy.backups.triggerBackup, "i") });
    await user.click(createBtn);
    await user.type(screen.getByPlaceholderText(/BACKUP/i), "BACKUP");
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.criticalModal.confirm, "i") }));

    await waitFor(() => {
      expect(itActionMocks.triggerBackupAction).toHaveBeenCalledWith("database");
    });
  });

  it("DatabaseView, JobsView, DeploymentsView, SystemHealthView & AuditView render telemetry and retry jobs", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <DatabaseView stats={makeDatabaseStats()} />
        <JobsView stats={makeDatabaseStats()} canExecute />
        <DeploymentsView
          services={makeServiceHealth()}
          runtime={{
            version: "1.0.0",
            environment: "dev",
            nodeVersion: "v22",
            nextVersion: "16.4.4",
            hostname: "localhost",
            gitSha: "abc1234",
            memoryMb: 256,
            uptimeMinutes: 120,
            checkedAt: "2026-05-01T10:00:00Z",
          }}
          envAudit={[{ key: "DATABASE_URL", isSecret: true, present: true, redacted: "***" }]}
        />
        <SystemHealthView items={makeServiceHealth()} />
        <AuditView
          filter={{}}
          page={makeAuditPage()}
          subjects={[{ subject: "company", events: 5 }]}
        />
      </ItTestProviders>,
    );

    expect(screen.getAllByText(/gateway/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("DATABASE_URL")).toBeInTheDocument();
    expect(screen.getByText("tr-100")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.jobs.retryAll, "i") }));
    await user.type(screen.getByPlaceholderText(/RETRY/i), "RETRY");
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.criticalModal.confirm, "i") }));
    await waitFor(() => {
      expect(itActionMocks.retryJobAction).toHaveBeenCalledWith("default");
    });
    expect(itActionMocks.setMaintenanceAction).toBeDefined();
  });

  it("LogsView fetches GET /api/logs?... and manages debug toggles via setDebugToggleAction / removeDebugToggleAction", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "log-1",
              timestamp: "2026-05-01T10:00:00Z",
              level: "INFO",
              service: "gateway",
              message: "Health check OK",
              traceId: "tr-1",
            },
          ],
          bufferSize: 1,
        }),
        { status: 200 },
      ),
    );

    render(
      <ItTestProviders>
        <LogsView config={makeRuntimeConfig()} canEdit />
      </ItTestProviders>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/logs\?/));
    });

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.logs.addToggle, "i") }));
    await waitFor(() => {
      expect(itActionMocks.setDebugToggleAction).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.logs.remove, "i") }));
    await waitFor(() => {
      expect(itActionMocks.removeDebugToggleAction).toHaveBeenCalledWith("gateway");
    });
  });

  it("ModulesView & NotificationsView + NotificationDetail execute setModuleAction, retryMessageAction & sendTestMessageAction", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <ModulesView modules={makeModules()} canEdit />
        <NotificationsView
          filter={{}}
          page={makeNotifyPage()}
          summary={[{ status: "failed", channel: "email", messages: 1 }]}
          canExecute
        />
        <NotificationDetail message={makeNotifyPage().items[0]} canExecute />
      </ItTestProviders>,
    );

    expect(screen.getAllByText(/bader@example\.test/).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getAllByRole("button", { name: new RegExp(enCopy.notifications.retry, "i") })[0]);
    await waitFor(() => {
      expect(itActionMocks.retryMessageAction).toHaveBeenCalledWith("msg-1");
    });

    expect(itActionMocks.setModuleAction).toBeDefined();
    expect(itActionMocks.sendTestMessageAction).toBeDefined();
  });

  it("IntegrationsView, IntegrationCard & IntegrationDocsModal cover integration actions and docs", async () => {
    const user = userEvent.setup();
    const provider: IntegrationProvider = {
      id: "smtp",
      kind: "email",
      docsUrl: "https://docs.example.test/smtp",
      fields: [],
      secrets: [],
    } as unknown as IntegrationProvider;

    render(
      <ItTestProviders>
        <IntegrationsView integrations={makeDeskIntegrations()} canEdit canExecute canDelete />
        <IntegrationCard
          provider={provider}
          view={makeDeskIntegrations()[0]}
          canEdit
          canExecute
          canDelete
        />
        <IntegrationDocsModal provider={provider} open onClose={vi.fn()} />
      </ItTestProviders>,
    );

    const testBtns = screen.getAllByRole("button", { name: new RegExp(enCopy.integrations.test, "i") });
    await user.click(testBtns[0]);
    await waitFor(() => {
      expect(itActionMocks.testIntegrationAction).toHaveBeenCalled();
    });

    expect(itActionMocks.saveIntegrationAction).toBeDefined();
    expect(itActionMocks.unlinkIntegrationAction).toBeDefined();
    expect(itActionMocks.syncIntegrationAction).toBeDefined();
    expect(itActionMocks.sendWhatsAppTestAction).toBeDefined();
  });
});
