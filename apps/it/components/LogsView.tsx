"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  Terminal,
  Trash2,
  Plus,
  Loader2,
  Clock,
} from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import type { RuntimeConfig } from "@platform/api-client";
import {
  setDebugToggleAction,
  removeDebugToggleAction,
} from "../app/(desk)/logs/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function LogsView({
  config,
  canEdit,
}: {
  config: RuntimeConfig | null;
  canEdit: boolean;
}) {
  const { copy, date } = useCopy();
  const l = copy.logs;
  const router = useRouter();

  const [traceId, setTraceId] = React.useState("");
  const [logQuery, setLogQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // New toggle state
  const [toggleService, setToggleService] = React.useState("identity");
  const [toggleLevel, setToggleLevel] = React.useState("debug");
  const [toggleTTL, setToggleTTL] = React.useState(15);

  const handleAddToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      await setDebugToggleAction(toggleService, toggleLevel, toggleTTL);
      toast.success(l.toggleAdded);
      router.refresh();
    } catch {
      toast.error(l.toggleFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveToggle = async (service: string) => {
    setBusy(true);
    try {
      await removeDebugToggleAction(service);
      toast.success(l.toggleRemoved);
      router.refresh();
    } catch {
      toast.error(l.toggleFailed);
    } finally {
      setBusy(false);
    }
  };

  const openLoki = (e: React.FormEvent) => {
    e.preventDefault();
    const query = logQuery.trim() ? `{service=~".+"} |= "${logQuery.trim()}"` : `{service=~".+"}`;
    window.open(`/explore?left=${encodeURIComponent(JSON.stringify({ datasource: "loki", queries: [{ expr: query }] }))}`, "_blank");
  };

  const openTempo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceId.trim()) return;
    window.open(`/explore?left=${encodeURIComponent(JSON.stringify({ datasource: "tempo", queries: [{ query: traceId.trim() }] }))}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <PageTitle title={l.title} description={l.description} />

      {/* Observability Links */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{l.lokiTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{l.lokiSubtitle}</p>
          <form onSubmit={openLoki} className="flex gap-2">
            <Input
              placeholder={l.lokiPlaceholder}
              value={logQuery}
              onChange={(e) => setLogQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="flex items-center gap-1">
              <span>{l.explore}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{l.tempoTitle}</h2>
          </div>
          <p className="text-xs text-ink-muted">{l.tempoSubtitle}</p>
          <form onSubmit={openTempo} className="flex gap-2">
            <Input
              placeholder={l.tempoPlaceholder}
              value={traceId}
              onChange={(e) => setTraceId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="flex items-center gap-1">
              <span>{l.trace}</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>

      {/* Debug Toggles */}
      <Card className="rounded-3xl border border-outline-variant p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{l.togglesTitle}</h2>
            <p className="text-xs text-ink-muted">{l.togglesSubtitle}</p>
          </div>
        </div>

        {canEdit && (
          <form
            onSubmit={handleAddToggle}
            className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface-variant p-4 text-sm"
          >
            <label className="space-y-1">
              <span className="text-xs font-medium">{l.service}</span>
              <select
                value={toggleService}
                onChange={(e) => setToggleService(e.target.value)}
                className="block w-40 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
              >
                {["identity", "system", "itsm", "files", "notify", "realtime", "audit"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium">{l.logLevel}</span>
              <select
                value={toggleLevel}
                onChange={(e) => setToggleLevel(e.target.value)}
                className="block w-32 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
              >
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium">{l.duration}</span>
              <select
                value={toggleTTL}
                onChange={(e) => setToggleTTL(parseInt(e.target.value, 10))}
                className="block w-36 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
              >
                <option value={15}>{l.ttl15m}</option>
                <option value={30}>{l.ttl30m}</option>
                <option value={60}>{l.ttl1h}</option>
                <option value={1440}>{l.ttl24h}</option>
              </select>
            </label>

            <Button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{l.addToggle}</span>
            </Button>
          </form>
        )}

        <div className="space-y-2">
          {!config?.debugToggles?.length ? (
            <p className="text-xs text-ink-muted py-4 text-center">
              {l.noActiveToggles}
            </p>
          ) : (
            config.debugToggles.map((toggle) => (
              <div
                key={toggle.id}
                className="flex items-center justify-between rounded-2xl border border-outline-variant p-4 text-sm"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">
                      {toggle.service}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      {toggle.logLevel}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {l.expiresAt}: {date(toggle.expiresAt)} • {l.enabledBy}:{" "}
                    {toggle.enabledBy}
                  </p>
                </div>

                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveToggle(toggle.service)}
                    disabled={busy}
                    className="text-xs text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{l.remove}</span>
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
