"use client";

import * as React from "react";
import {
  Play,
  Copy,
  Check,
  Clock,
  Search,
  History,
  Terminal,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Card } from "@platform/ui";
import { toast } from "sonner";
import { formatMessage } from "@platform/locales";
import type { OpenApiEndpoint, OpenApiMethod } from "../lib/openapi-catalog";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

interface PresetEndpoint {
  name: string;
  service: string;
  method: OpenApiMethod;
  path: string;
  body?: string;
  description: string;
}

interface RequestHistoryItem {
  id: string;
  method: OpenApiMethod;
  target: string;
  path: string;
  status: number;
  latencyMs: number;
  executedAt: string;
  body?: string;
}

const HISTORY_STORAGE_KEY = "it_api_tester_history_v1";

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

const TARGET_ORIGINS: Array<{ value: string; label: string }> = [
  { value: "", label: "IT / Gateway Proxy (Relative)" },
  { value: "http://localhost:8080", label: "API Gateway (:8080)" },
  { value: "http://localhost:3000", label: "Web App (:3000)" },
  { value: "http://localhost:3001", label: "Admin App (:3001)" },
  { value: "http://localhost:3002", label: "IT Console (:3002)" },
  { value: "http://localhost:3003", label: "Storefront (:3003)" },
];

function parseCurlCommand(raw: string): {
  method?: OpenApiMethod;
  path?: string;
  headers?: Record<string, string>;
  body?: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const methodMatch = trimmed.match(/(?:-X|--request)\s+['"]?(GET|POST|PUT|PATCH|DELETE)['"]?/i);
  const urlMatch = trimmed.match(/(?:https?:\/\/[^\s'"]+|\/v1\/[^\s'"]+|\/api\/[^\s'"]+)/i);
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/g;
  const headers: Record<string, string> = {};
  let hm: RegExpExecArray | null;
  while ((hm = headerRegex.exec(trimmed)) !== null) {
    const idx = hm[1].indexOf(":");
    if (idx > 0) {
      headers[hm[1].slice(0, idx).trim()] = hm[1].slice(idx + 1).trim();
    }
  }
  const dataMatch = trimmed.match(/(?:-d|--data|--data-raw)\s+['"]([\s\S]*?)['"]/);
  if (!urlMatch && !methodMatch && !dataMatch) return null;

  let extractedPath = urlMatch?.[0] || "";
  if (extractedPath.startsWith("http")) {
    try {
      const parsed = new URL(extractedPath);
      extractedPath = `${parsed.pathname}${parsed.search}`;
    } catch {
      // keep raw
    }
  }

  return {
    method: (methodMatch?.[1]?.toUpperCase() as OpenApiMethod) || (dataMatch ? "POST" : "GET"),
    path: extractedPath || undefined,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: dataMatch?.[1] || undefined,
  };
}

export function ApiTesterView({
  token,
  endpoints = [],
}: {
  token: string;
  endpoints?: OpenApiEndpoint[];
}) {
  const { copy } = useCopy();
  const at = copy.apiTester;
  const [method, setMethod] = React.useState<OpenApiMethod>("GET");
  const [targetOrigin, setTargetOrigin] = React.useState("");
  const [path, setPath] = React.useState("/v1/system/desk/health");
  const [selectedPresetIndex, setSelectedPresetIndex] = React.useState<number>(0);
  const [requestHeaders, setRequestHeaders] = React.useState<string>(
    JSON.stringify({ "Content-Type": "application/json", Accept: "application/json" }, null, 2),
  );
  const [requestBody, setRequestBody] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [catalogService, setCatalogService] = React.useState("all");
  const [catalogMethod, setCatalogMethod] = React.useState("all");

  const [showCurlImport, setShowCurlImport] = React.useState(false);
  const [curlInput, setCurlInput] = React.useState("");

  const [history, setHistory] = React.useState<RequestHistoryItem[]>([]);

  const [responseStatus, setResponseStatus] = React.useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = React.useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = React.useState<string | null>(null);
  const [latencyMs, setLatencyMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed.slice(0, 20));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistHistory = React.useCallback((next: RequestHistoryItem[]) => {
    setHistory(next);
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const catalogServices = React.useMemo(() => {
    const set = new Set<string>();
    for (const ep of endpoints) set.add(ep.service);
    return Array.from(set).sort();
  }, [endpoints]);

  const filteredEndpoints = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return endpoints.filter((ep) => {
      if (catalogService !== "all" && ep.service !== catalogService) return false;
      if (catalogMethod !== "all" && ep.method !== catalogMethod) return false;
      if (q) {
        return (
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.operationId.toLowerCase().includes(q) ||
          ep.service.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [endpoints, catalogSearch, catalogService, catalogMethod]);

  const handleApplyPreset = () => {
    const preset = PRESET_ENDPOINTS[selectedPresetIndex];
    if (!preset) return;
    setMethod(preset.method);
    setPath(preset.path);
    setRequestBody(preset.body || "");
  };

  const handleSelectCatalogEndpoint = (ep: OpenApiEndpoint) => {
    setMethod(ep.method);
    setPath(ep.path);
    if (ep.method === "GET" || ep.method === "DELETE") {
      setRequestBody("");
    }
  };

  const handleCopyCurl = () => {
    const fullUrl = targetOrigin ? `${targetOrigin}${path}` : path;
    const parts = [`curl -X ${method} "${fullUrl}"`, `-H "Authorization: Bearer $IT_TOKEN"`];
    try {
      const parsed = requestHeaders.trim() ? JSON.parse(requestHeaders) : {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k.toLowerCase() === "authorization") continue;
        parts.push(`-H "${k}: ${String(v)}"`);
      }
    } catch {
      // ignore invalid JSON headers when building cURL
    }
    if (method !== "GET" && requestBody.trim()) {
      parts.push(`-d '${requestBody.trim().replace(/'/g, "'\\''")}'`);
    }
    navigator.clipboard?.writeText(parts.join(" \\\n  "));
    toast.success(at.curlCopied);
  };

  const handleImportCurl = () => {
    const parsed = parseCurlCommand(curlInput);
    if (!parsed) {
      toast.error("Could not parse cURL command");
      return;
    }
    if (parsed.method) setMethod(parsed.method);
    if (parsed.path) setPath(parsed.path);
    if (parsed.headers) setRequestHeaders(JSON.stringify(parsed.headers, null, 2));
    if (parsed.body !== undefined) setRequestBody(parsed.body);
    setShowCurlImport(false);
    setCurlInput("");
    toast.success(at.curlImported);
  };

  const executeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setResponseStatus(null);
    setResponseBody(null);
    setLatencyMs(null);

    const startTime = performance.now();
    const requestUrl = targetOrigin ? `${targetOrigin}${path}` : path;

    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = requestHeaders.trim() ? JSON.parse(requestHeaders) : {};
      } catch {
        toast.error("Invalid Request Headers: Must be valid JSON");
        setRunning(false);
        return;
      }

      if (!parsedHeaders["Authorization"]) {
        parsedHeaders["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(requestUrl, {
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

      persistHistory(
        [
          {
            id: `req_${Date.now()}`,
            method,
            target: targetOrigin,
            path,
            status: res.status,
            latencyMs: elapsed,
            executedAt: new Date().toISOString(),
            body: method !== "GET" ? requestBody : undefined,
          },
          ...history,
        ].slice(0, 20),
      );

      if (res.ok) {
        toast.success(
          formatMessage(at.requestSucceeded, {
            status: String(res.status),
            latency: String(elapsed),
          }),
        );
      } else {
        toast.error(
          formatMessage(at.requestFailed, {
            status: String(res.status),
          }),
        );
      }
    } catch (err) {
      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setLatencyMs(elapsed);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={at.title} description={at.description} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCurl}
            className="it-btn-3d py-1.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>{at.copyCurl}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCurlImport((prev) => !prev)}
            className="it-btn-3d py-1.5 px-3 text-xs font-mono font-bold flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{at.importCurl}</span>
          </button>
        </div>
      </div>

      {showCurlImport && (
        <Card className="it-card p-4 space-y-2 font-mono text-xs">
          <textarea
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            rows={3}
            placeholder={at.importCurlPlaceholder}
            className="it-field-sunken w-full bg-slate-950 text-emerald-300 p-2.5 text-xs outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleImportCurl}
              className="it-btn-3d py-1 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300"
            >
              {at.importCurlApply}
            </button>
          </div>
        </Card>
      )}

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

      {endpoints.length > 0 && (
        <Card className="it-card p-4 space-y-3 font-mono text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-2">
            <div className="font-bold uppercase tracking-wider text-ink">
              {at.openApiExplorer} ({filteredEndpoints.length}/{endpoints.length})
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={at.allServices}
                value={catalogService}
                onChange={(e) => setCatalogService(e.target.value)}
                className="it-field-sunken text-xs py-1"
              >
                <option value="all">{at.allServices}</option>
                {catalogServices.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
              <select
                aria-label={at.allMethods}
                value={catalogMethod}
                onChange={(e) => setCatalogMethod(e.target.value)}
                className="it-field-sunken text-xs py-1"
              >
                <option value="all">{at.allMethods}</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-ink-muted absolute start-2.5 top-2.5" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder={formatMessage(at.openApiSearchPlaceholder, { count: endpoints.length })}
              className="it-field-sunken w-full ps-8 pe-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-outline-variant border border-outline-variant">
            {filteredEndpoints.slice(0, 80).map((ep) => (
              <button
                key={`${ep.method}:${ep.path}`}
                type="button"
                onClick={() => handleSelectCatalogEndpoint(ep)}
                className="w-full text-start px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/70 flex flex-wrap items-center gap-2 transition-colors"
              >
                <span
                  className={`it-badge text-[10px] ${
                    ep.method === "GET"
                      ? "it-badge-active"
                      : ep.method === "DELETE"
                        ? "it-badge-error"
                        : "it-badge-warn"
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-bold text-ink" dir="ltr">
                  {ep.path}
                </span>
                <span className="text-[10px] text-sky-700 dark:text-sky-400">[{ep.service}]</span>
                {ep.summary && (
                  <span className="text-[11px] text-ink-muted truncate ms-auto max-w-[320px]">
                    {ep.summary}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="it-card p-5 space-y-4">
        <form onSubmit={executeRequest} className="space-y-4 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={at.targetLabel}
              value={targetOrigin}
              onChange={(e) => setTargetOrigin(e.target.value)}
              className="it-field-sunken px-2 py-2 text-xs font-mono"
            >
              {TARGET_ORIGINS.map((origin) => (
                <option key={origin.value || "relative"} value={origin.value}>
                  {origin.label}
                </option>
              ))}
            </select>

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as OpenApiMethod)}
              className="it-field-sunken bg-slate-900 text-white font-bold px-3 py-2 text-xs font-mono outline-none"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <div className="flex-1 min-w-[240px]">
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

      {history.length > 0 && (
        <Card className="it-card p-3 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-ink-muted">
              <History className="h-3.5 w-3.5" />
              <span>{at.historyTitle}</span>
            </div>
            <button
              type="button"
              onClick={() => persistHistory([])}
              className="text-[10px] text-rose-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>{at.clearHistory}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 8).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMethod(item.method);
                  setTargetOrigin(item.target);
                  setPath(item.path);
                  setRequestBody(item.body || "");
                }}
                className="it-btn-3d px-2 py-1 text-[11px] flex items-center gap-1.5"
              >
                <span className="font-bold">{item.method}</span>
                <span className="truncate max-w-[180px]" dir="ltr">{item.path}</span>
                <span className={item.status >= 200 && item.status < 300 ? "text-emerald-600" : "text-rose-600"}>
                  {item.status}
                </span>
                <span className="text-ink-muted">{item.latencyMs}ms</span>
              </button>
            ))}
          </div>
        </Card>
      )}

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
