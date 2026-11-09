"use client";

import * as React from "react";
import { Play, Copy, Check, Terminal, Clock, ShieldCheck, Code, FileText, ArrowRight, Layers } from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

interface PresetEndpoint {
  name: string;
  service: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: string;
  description: string;
}

const PRESET_ENDPOINTS: PresetEndpoint[] = [
  {
    name: "System Operations Health",
    service: "system",
    method: "GET",
    path: "/v1/system/desk/health",
    description: "Inspect overall platform subsystem health, outbox lag, and database status.",
  },
  {
    name: "Active Modules Status",
    service: "system",
    method: "GET",
    path: "/v1/system/desk/modules",
    description: "List all 14 feature module toggle states and activation timestamps.",
  },
  {
    name: "Current Operator Session",
    service: "identity",
    method: "GET",
    path: "/v1/identity/desk/me",
    description: "Verify currently signed-in IT principal, roles, and session expiry.",
  },
  {
    name: "Active IT Accounts",
    service: "identity",
    method: "GET",
    path: "/v1/identity/desk/it-accounts",
    description: "Query list of IT team accounts and MFA enrollment statuses.",
  },
  {
    name: "Ticket Queue Summary",
    service: "itsm",
    method: "GET",
    path: "/v1/itsm/desk/tickets?limit=10",
    description: "Retrieve latest tickets, assigned agents, and SLA breach timers.",
  },
  {
    name: "Notification Messages",
    service: "notify",
    method: "GET",
    path: "/v1/notify/desk/messages?limit=10",
    description: "Check email, SMS, and WhatsApp delivery queues.",
  },
  {
    name: "Audit Trail Stream",
    service: "audit",
    method: "GET",
    path: "/v1/audit/desk/events?limit=10",
    description: "Read security and entity mutation events logged by backend services.",
  },
  {
    name: "Send Notification Test",
    service: "notify",
    method: "POST",
    path: "/v1/notify/desk/test",
    body: JSON.stringify({ to: "test@example.com", channel: "email", subject: "Diagnostic Ping" }, null, 2),
    description: "Enqueue a diagnostic message through notify dispatch.",
  },
];

export function ApiTesterView({ token }: { token: string }) {
  const { copy } = useCopy();
  const at = copy.apiTester;
  const [method, setMethod] = React.useState<"GET" | "POST" | "PUT" | "DELETE">("GET");
  const [path, setPath] = React.useState("/v1/system/desk/health");
  const [selectedPresetIndex, setSelectedPresetIndex] = React.useState<number>(0);
  const [requestHeaders, setRequestHeaders] = React.useState<string>(
    JSON.stringify({ "Content-Type": "application/json", Accept: "application/json" }, null, 2)
  );
  const [requestBody, setRequestBody] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const [responseStatus, setResponseStatus] = React.useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = React.useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = React.useState<string | null>(null);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);

  const handleApplyPreset = () => {
    const preset = PRESET_ENDPOINTS[selectedPresetIndex];
    if (!preset) return;
    setMethod(preset.method);
    setPath(preset.path);
    if (preset.body) {
      setRequestBody(preset.body);
    } else {
      setRequestBody("");
    }
  };

  const executeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setResponseStatus(null);
    setResponseBody(null);
    setLatencyMs(null);

    const startTime = performance.now();

    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = requestHeaders.trim() ? JSON.parse(requestHeaders) : {};
      } catch {
        toast.error("Invalid Request Headers: Must be valid JSON");
        setRunning(false);
        return;
      }

      // Automatically append Authorization bearer
      if (!parsedHeaders["Authorization"]) {
        parsedHeaders["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(path, {
        method,
        headers: parsedHeaders,
        body: method !== "GET" && requestBody.trim() ? requestBody : undefined,
      });

      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setLatencyMs(elapsed);
      setResponseStatus(res.status);

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });
      setResponseHeaders(resHeaders);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        setResponseBody(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseBody(text);
      }

      if (res.ok) {
        toast.success(
          formatMessage(at.requestSucceeded, {
            status: String(res.status),
            latency: String(elapsed),
          })
        );
      } else {
        toast.error(
          formatMessage(at.requestFailed, {
            status: String(res.status),
          })
        );
      }
    } catch (err) {
      const endTime = performance.now();
      setLatencyMs(Math.round(endTime - startTime));
      setResponseStatus(0);
      setResponseBody(err instanceof Error ? err.message : "Network error / Service unreachable");
      toast.error(at.networkError);
    } finally {
      setRunning(false);
    }
  };

  const copyResponse = () => {
    if (!responseBody) return;
    navigator.clipboard.writeText(responseBody);
    setCopied(true);
    toast.success(at.responseCopied);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
        <PageTitle
          title={at.title}
          description={at.description}
        />
        <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
          T-CODE: SE38 [API RUNNER]
        </span>
      </div>

      {/* Preset Endpoints Dropdown Selector */}
      <Card className="it-card p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider font-mono text-ink-muted">
          {at.presetEndpoints}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPresetIndex}
            onChange={(e) => setSelectedPresetIndex(Number(e.target.value))}
            className="it-field-sunken flex-1 min-w-[280px] font-mono text-xs py-1.5"
          >
            {PRESET_ENDPOINTS.map((preset, idx) => (
              <option key={preset.name} value={idx}>
                [{preset.method}] {preset.name} ({preset.path})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApplyPreset}
            className="it-btn-3d py-1.5 px-3 text-xs font-mono font-bold text-sky-800 dark:text-sky-300"
          >
            {at.applyPreset}
          </button>
        </div>
        <div className="text-[11px] text-ink-muted font-mono">
          {PRESET_ENDPOINTS[selectedPresetIndex]?.description}
        </div>
      </Card>

      {/* Request Composer */}
      <Card className="it-card p-5 space-y-4">
        <form onSubmit={executeRequest} className="space-y-4 font-mono text-xs">
          {/* Method and Path Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as "GET" | "POST" | "PUT" | "DELETE")}
              className="it-field-sunken bg-slate-900 text-white font-bold px-3 py-2 text-xs font-mono outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="flex-1 min-w-[280px]">
              <input
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/v1/service/endpoint"
                required
                className="it-field-sunken w-full px-3 py-2 text-xs font-mono font-bold text-ink"
              />
            </div>

            <button
              type="submit"
              disabled={running}
              className="it-btn-3d py-2 px-4 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{running ? "..." : at.send}</span>
            </button>
          </div>

          {/* Headers & Body Tabs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-ink-muted mb-1">
                {at.headers}
              </label>
              <textarea
                value={requestHeaders}
                onChange={(e) => setRequestHeaders(e.target.value)}
                rows={5}
                className="it-field-sunken w-full bg-slate-950 text-slate-200 p-2.5 font-mono text-xs outline-none"
              />
              <span className="text-[10px] text-ink-muted">
                Authorization token is automatically supplied from active session if omitted.
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-ink-muted mb-1">
                {at.payload}
              </label>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={5}
                disabled={method === "GET"}
                placeholder={method === "GET" ? "GET requests do not accept body" : '{\n  "key": "value"\n}'}
                className="it-field-sunken w-full bg-slate-950 text-emerald-400 p-2.5 font-mono text-xs outline-none disabled:opacity-50"
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Response Panel */}
      {responseStatus !== null && (
        <Card className="it-card p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-xs uppercase text-ink-muted">{at.status}:</span>
              <span
                className={`it-badge ${
                  responseStatus >= 200 && responseStatus < 300
                    ? "it-badge-active"
                    : responseStatus >= 400
                      ? "it-badge-error"
                      : "it-badge-warn"
                }`}
              >
                {responseStatus === 0 ? "NETWORK ERROR" : `HTTP ${responseStatus}`}
              </span>

              {latencyMs !== null && (
                <span className="flex items-center gap-1 text-ink-muted text-[11px]">
                  <Clock className="h-3 w-3" />
                  <span>{latencyMs}ms ({at.latency})</span>
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyResponse}
              disabled={!responseBody}
              className="flex items-center gap-1 font-mono text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>COPY BODY</span>
            </Button>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">{at.responseBody}</div>
            <pre className="p-3 border border-outline-variant bg-slate-950 text-emerald-300 max-h-96 overflow-x-auto text-[11px] select-all">
              {responseBody || "(empty response)"}
            </pre>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-ink-muted mb-1">{at.headers}</div>
            <pre className="p-2 border border-outline-variant bg-slate-100 dark:bg-slate-900/60 text-ink text-[10px] overflow-x-auto">
              {JSON.stringify(responseHeaders, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}
