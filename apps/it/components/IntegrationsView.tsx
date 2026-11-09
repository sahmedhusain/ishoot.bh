"use client";

import * as React from "react";
import { Search, Filter, X } from "lucide-react";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationKind,
} from "@platform/config/constants/integrations";
import type { DeskIntegration } from "@platform/api-client";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { IntegrationCard } from "./IntegrationCard";

const KINDS: IntegrationKind[] = [
  "social",
  "messaging",
  "email",
  "sign_in",
  "payments",
  "couriers",
];

export function IntegrationsView({
  integrations,
  canEdit,
  canExecute,
  canDelete,
}: {
  integrations: DeskIntegration[] | null;
  canEdit: boolean;
  canExecute: boolean;
  canDelete: boolean;
}) {
  const { copy } = useCopy();
  const c = copy.integrations;

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedGroup, setSelectedGroup] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");

  if (!integrations) {
    return (
      <div className="space-y-4">
        <PageTitle title={c.title} description={c.description} />
        <div
          role="alert"
          className="it-card p-8 text-center text-xs font-mono text-ink-muted"
        >
          {c.unavailable}
        </div>
      </div>
    );
  }

  const filteredKinds = selectedGroup
    ? KINDS.filter((k) => k === selectedGroup)
    : KINDS;

  let totalVisibleProviders = 0;

  return (
    <div className="space-y-4">
      <PageTitle title={c.title} description={c.description} />

      {!canEdit && <p className="text-xs font-mono text-ink-muted">{c.readOnly}</p>}

      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-mono">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={c.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="it-field-sunken w-full pl-7 pr-7 py-1 text-xs font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="size-3.5 text-slate-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{c.allGroups}</option>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {c.kinds[kind as keyof typeof c.kinds] ?? kind}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="it-field-sunken text-xs font-mono py-1"
          >
            <option value="">{c.allStatuses}</option>
            <option value="active">{c.statusActive}</option>
            <option value="inactive">{c.statusInactive}</option>
            <option value="error">{c.statusError}</option>
          </select>
        </div>
        {(searchQuery || selectedGroup || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedGroup("");
              setSelectedStatus("");
            }}
            className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-6 pb-8">
        {filteredKinds.map((kind) => {
          const providers = INTEGRATION_PROVIDERS.filter((provider) => {
            if (provider.kind !== kind) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const provCopy = c.providers[provider.id as keyof typeof c.providers];
              const provName = provCopy?.name ?? provider.id;
              const nameMatch =
                provName.toLowerCase().includes(q) ||
                provider.id.toLowerCase().includes(q);
              if (!nameMatch) return false;
            }
            const view = integrations.find(
              (item) => item.provider === provider.id,
            );
            const isActive = Boolean(view?.isActive);
            const hasError =
              view?.healthStatus === "error" || Boolean(view?.lastError);
            if (selectedStatus === "active" && !isActive) return false;
            if (selectedStatus === "inactive" && isActive) return false;
            if (selectedStatus === "error" && !hasError) return false;
            return true;
          });

          if (providers.length === 0) return null;
          totalVisibleProviders += providers.length;

          return (
            <section key={kind} className="space-y-2">
              <div className="border-b border-slate-300 dark:border-slate-700 pb-1 flex items-center justify-between font-mono">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  RFC GROUP: {c.kinds[kind as keyof typeof c.kinds] ?? kind}
                </h2>
                <span className="text-[10px] text-ink-muted">TOTAL: {providers.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {providers.map((provider) => {
                  const view = integrations.find(
                    (item) => item.provider === provider.id,
                  ) ?? {
                    provider: provider.id,
                    isActive: false,
                    healthStatus: "unknown",
                    accountName: null,
                    lastError: null,
                    lastCheckedAt: null,
                    lastSyncedAt: null,
                    values: {},
                    secrets: {},
                    config: {},
                  };

                  return (
                    <IntegrationCard
                      key={provider.id}
                      provider={provider}
                      view={view}
                      canEdit={canEdit}
                      canExecute={canExecute}
                      canDelete={canDelete}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        {totalVisibleProviders === 0 && (
          <p className="text-xs font-mono text-ink-muted py-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
            No RFC destinations match the selected criteria.
          </p>
        )}
      </div>
    </div>
  );
}
