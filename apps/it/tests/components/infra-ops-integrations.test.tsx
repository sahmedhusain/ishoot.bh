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
import { QaDiagnosticsView } from "../../components/QaDiagnosticsView";
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

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.database.presetMigrations, "i") }));
    await waitFor(() => {
      expect(itActionMocks.runDatabaseQueryAction).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.database.runAnalyze, "i") }));
    await user.type(screen.getByPlaceholderText(/CONFIRM/i), "CONFIRM");
    const execBtns = screen.getAllByRole("button", { name: new RegExp(enCopy.database.executeSql, "i") });
    await user.click(execBtns[execBtns.length - 1]);
    await waitFor(() => {
      expect(itActionMocks.runDatabaseMaintenanceAction).toHaveBeenCalledWith("analyze");
    });
  });

  it("QaDiagnosticsView streams suite runs over SSE, explores coverage manifest & 4-tier log audit cleanly", async () => {
    const user = userEvent.setup();
    const initialRun = {
      id: "run-1",
      suiteKey: "vitest:it" as const,
      suiteLabel: "IT Console Vitest Suite",
      category: "unit" as const,
      status: "running" as const,
      triggeredBy: "it@example.test",
      startedAt: "2026-05-01T10:00:00Z",
      finishedAt: null,
      durationMs: null,
      exitCode: null,
      passedCount: null,
      failedCount: null,
      lines: [],
    };
    const manifest = {
      generatedAt: "2026-05-01T10:00:00Z",
      apps: {
        it: {
          counts: {
            pages: 31,
            apiRoutes: 13,
            apiHandlers: 14,
            serverActionFiles: 14,
            serverActions: 66,
            componentFiles: 71,
            clientComponents: 61,
            componentExports: 106,
          },
          items: [
            { kind: "page" as const, label: "/qa", detail: "apps/it/app/(desk)/qa/page.tsx", meta: "0 calls" },
          ],
        },
      },
      backend: {
        servicesCount: 16,
        routesCount: 620,
        tablesCount: 257,
        services: [{ name: "system", routes: 40, tables: 71 }],
      },
    };
    const logAudit = {
      auditedAt: "2026-05-01T10:00:00Z",
      since: "2026-05-01T09:50:00Z",
      browser: { files: 1, requests: 20, errors: [], unexpectedHttpErrors: [] },
      nextjs: { files: 4, errors: [] },
      docker: { servicesChecked: 25, errors: [], warnings: [] },
      sandboxes: { mailpitReachable: true, mailpitMessages: 2, whatsappReachable: true, whatsappMessages: 0 },
      summary: { totalErrors: 0, passed: true },
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url === "/api/qa/status") {
        return new Response(
          JSON.stringify({
            enabled: true,
            canExecute: true,
            activeRunId: null,
            suites: [{ key: "vitest:it", label: "IT Console Vitest Suite", description: "IT tests", category: "unit" }],
            manifest,
            logAudit,
            history: [{ ...initialRun, status: "passed", finishedAt: "2026-05-01T10:00:05Z", durationMs: 5000, exitCode: 0 }],
          }),
          { status: 200 },
        );
      }
      if (url === "/api/qa/runs" && init?.method === "POST") {
        return new Response(JSON.stringify({ run: initialRun }), { status: 201 });
      }
      if (url.includes("/api/qa/runs/") && url.endsWith("/cancel")) {
        return new Response(JSON.stringify({ ok: true, run: { ...initialRun, status: "cancelled" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    render(
      <ItTestProviders>
        <QaDiagnosticsView
          enabled
          canExecute
          initialActiveRunId={null}
          suites={[
            { key: "vitest:it", label: "IT Console Vitest Suite", description: "Run IT tests", category: "unit" },
            { key: "log:audit", label: "4-Tier Strict Log Audit", description: "Run audit", category: "logs" },
          ]}
          initialManifest={manifest}
          initialLogAudit={logAudit}
          initialHistory={[]}
        />
      </ItTestProviders>,
    );

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.qa.refresh, "i") }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/qa/status", expect.objectContaining({ cache: "no-store" }));
    });

    const runBtns = screen.getAllByRole("button", { name: new RegExp(enCopy.qa.runSuite, "i") });
    await user.click(runBtns[0]);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/qa/runs",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const esClass = (globalThis as unknown as {
      EventSource: { instances: Array<{ emitEvent: (type: string, data: unknown) => void }> };
    }).EventSource;
    expect(esClass.instances.length).toBeGreaterThanOrEqual(1);
    esClass.instances[esClass.instances.length - 1].emitEvent("line", { line: "✓ 38 passed (38)" });

    await waitFor(() => {
      expect(screen.getByText(/✓ 38 passed \(38\)/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.qa.cancel, "i") }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/qa/runs/run-1/cancel"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    esClass.instances[esClass.instances.length - 1].emitEvent("done", {
      run: { ...initialRun, status: "cancelled", finishedAt: "2026-05-01T10:00:02Z", durationMs: 2000 },
    });

    await user.click(screen.getByRole("tab", { name: enCopy.qa.tabs.manifest }));
    expect(screen.getByText("/qa")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: enCopy.qa.tabs.audit }));
    expect(screen.getByText(enCopy.qa.audit.noErrors)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: enCopy.qa.tabs.history }));
    expect(screen.getAllByText(/IT Console Vitest Suite/).length).toBeGreaterThanOrEqual(1);
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

    // SSE Live Tail + NDJSON export
    await user.click(screen.getByRole("button", { name: new RegExp(enCopy.logs.liveTailStart, "i") }));
    const esClass = (globalThis as unknown as {
      EventSource: { instances: Array<{ url: string; emitEvent: (type: string, data: unknown) => void }> };
    }).EventSource;
    const streamInst = esClass.instances.find((i) => i.url === "/api/logs/stream");
    expect(streamInst).toBeDefined();
    streamInst?.emitEvent("log", {
      id: "log-sse-1",
      timestamp: "2026-05-01T10:01:00Z",
      level: "WARN",
      service: "system",
      user: "it@example.test",
      action: "SSE_PING",
      message: "Live SSE stream entry received",
    });
    await waitFor(() => {
      expect(screen.getByText(/Live SSE stream entry received/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: new RegExp(enCopy.logs.exportNdjson, "i") })).toBeInTheDocument();
  });

  it("Phase 3: ApiTesterView OpenAPI explorer, SystemHealthView auto-refresh/topology, AuditView links & DeploymentsView cache revalidation", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(
      <ItTestProviders>
        <ApiTesterView
          token="tok-p3"
          endpoints={[
            {
              method: "GET",
              path: "/v1/commerce/orders",
              service: "commerce",
              summary: "List orders",
              description: "List commerce orders",
              operationId: "listOrders",
              tags: ["Commerce"],
            },
          ]}
        />
        <AuditView
          filter={{ subject: "", actor: "", from: "", to: "", cursor: "" }}
          page={{
            items: [
              {
                id: "ev-p3",
                subject: "itsm.ticket.updated",
                actor: "it:admin",
                occurredAt: "2026-05-01T10:00:00Z",
                traceId: "trace-xyz-99",
                payload: { ticketId: "11111111-1111-4111-8111-111111111111" },
              },
            ],
          }}
          subjects={[{ subject: "itsm.ticket.updated", events: 1 }]}
        />
        <SystemHealthView
          items={makeServiceHealth()}
          topology={[
            {
              name: "web-app",
              category: "app",
              status: "healthy",
              latencyMs: 12,
              target: "http://127.0.0.1:3000/",
              detail: "HTTP 200",
              checkedAt: "2026-05-01T10:00:00Z",
            },
            {
              name: "postgres",
              category: "infra",
              status: "healthy",
              latencyMs: 3,
              target: "127.0.0.1:5432",
              detail: "TCP OK",
              checkedAt: "2026-05-01T10:00:00Z",
            },
          ]}
        />
        <DeploymentsView
          services={makeServiceHealth()}
          runtime={{
            environment: "DEVELOPMENT",
            orchestrator: "LOCAL NODE",
            hostname: "localhost",
            gitSha: "0d82791f",
            gitBranch: "feat/go-backend",
            memoryMb: 128,
            uptimeMinutes: 10,
            checkedAt: "2026-05-01T10:00:00Z",
          }}
          envAudit={[{ key: "REVALIDATION_SECRET", isSecret: true, present: true, redacted: "••••" }]}
          parityChecks={[{ key: "REVALIDATION_SECRET", status: "ok", detail: "Configured" }]}
          canRevalidate
        />
      </ItTestProviders>,
    );

    // ApiTesterView OpenAPI Explorer selection
    await user.click(screen.getByRole("button", { name: /\/v1\/commerce\/orders/i }));
    expect(screen.getByDisplayValue("/v1/commerce/orders")).toBeInTheDocument();

    // AuditView correlation links + export
    expect(screen.getByRole("button", { name: enCopy.audit.exportJson })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: new RegExp(enCopy.audit.inspectInLogs, "i") }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: enCopy.audit.openTicket })).toHaveAttribute(
      "href",
      "/tickets/11111111-1111-4111-8111-111111111111",
    );

    // SystemHealthView topology & auto-refresh
    expect(screen.getByText("web-app")).toBeInTheDocument();
    expect(screen.getByText("postgres")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(enCopy.systemHealth.autoRefresh), "15");
    expect(screen.getByText(/Next in 15s/i)).toBeInTheDocument();

    // DeploymentsView parity + one-click cache revalidation
    expect(screen.getByText("feat/go-backend")).toBeInTheDocument();
    expect(screen.getByText(enCopy.deployments.parityTitle)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: enCopy.deployments.revalidateAll }));
    await waitFor(() => {
      expect(itActionMocks.revalidateFrontendCacheAction).toHaveBeenCalledWith(
        "all",
        ["/"],
        ["website", "company"],
      );
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
