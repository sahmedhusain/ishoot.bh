"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Search,
  Filter,
  X,
} from "lucide-react";
import type { ApiKeyRecord, ApiKeyCreated } from "@platform/api-client";
import {
  createAPIKeyAction,
  revokeAPIKeyAction,
} from "../app/(desk)/api-keys/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

export function ApiKeysView({
  keys = [],
  canCreate,
  canDelete,
}: {
  keys?: ApiKeyRecord[] | null;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const list = Array.isArray(keys) ? keys : [];
  const { copy, date } = useCopy();
  const k = copy.apiKeys;
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createdKey, setCreatedKey] = React.useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("");

  const [revokeTarget, setRevokeTarget] = React.useState<ApiKeyRecord | null>(null);

  const [name, setName] = React.useState("");
  const [scopesStr, setScopesStr] = React.useState(k.defaultScopes);
  const [rateLimit, setRateLimit] = React.useState(60);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || !name.trim()) return;
    setBusy(true);
    try {
      const scopes = scopesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await createAPIKeyAction(name.trim(), scopes, rateLimit);
      setCreatedKey(res.value);
      setName("");
      setShowCreate(false);
      toast.success(k.created);
      router.refresh();
    } catch {
      toast.error(k.failed);
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!canDelete) return;
    setBusy(true);
    try {
      await revokeAPIKeyAction(id);
      toast.success(k.revoked);
      router.refresh();
    } catch {
      toast.error(k.failed);
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(k.tokenCopied);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredKeys = React.useMemo(() => {
    return list.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !item.name.toLowerCase().includes(q) &&
          !item.keyPrefix.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      const isRevoked = Boolean(item.revokedAt);
      if (selectedStatusFilter === "active" && isRevoked) return false;
      if (selectedStatusFilter === "revoked" && !isRevoked) return false;
      return true;
    });
  }, [list, searchQuery, selectedStatusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={k.title} description={k.description} />
        <div className="flex items-center gap-2">
          {canCreate && !showCreate && !createdKey && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0070d2] hover:bg-[#005fb2] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{k.newKey}</span>
            </button>
          )}
        </div>
      </div>

      {createdKey && (
        <div className="it-card p-4 space-y-3 border-l-4 border-l-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <Check className="h-4 w-4" />
            <h3>{k.tokenCreatedTitle}</h3>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans">
            {k.tokenWarning}
          </p>

          <div className="flex items-center gap-2 border border-emerald-400 bg-surface p-2">
            <code className="flex-1 font-mono text-xs break-all select-all">
              {createdKey.token}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(createdKey.token)}
              className="it-btn-3d py-1 px-2 text-xs flex items-center gap-1"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? k.copied : k.copy}</span>
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCreatedKey(null)}
              className="it-btn-3d py-1 px-3 text-xs"
            >
              {k.dismiss}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="it-card p-4 space-y-4 font-mono text-xs">
          <div className="border-b border-slate-300 dark:border-slate-700 pb-2">
            <h2 className="text-xs font-bold uppercase text-ink">{k.newKeyTitle}</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-4 font-sans text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="font-bold text-ink-muted">{k.name}</span>
                <input
                  required
                  placeholder={k.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="it-field-sunken w-full"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-bold text-ink-muted">{k.rateLimit}</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value, 10) || 60)}
                  className="it-field-sunken w-full font-mono"
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className="font-bold text-ink-muted">{k.scopes}</span>
                <input
                  value={scopesStr}
                  onChange={(e) => setScopesStr(e.target.value)}
                  className="it-field-sunken w-full font-mono"
                />
                <span className="block text-[11px] text-ink-muted font-mono">{k.scopesHint}</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300 dark:border-slate-700">
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowCreate(false)}
                className="it-btn-3d py-1 px-3"
              >
                {k.cancel}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="it-btn-3d py-1 px-4 font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{k.createKey}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="it-card p-0 overflow-x-auto">
        <div className="p-2 border-b border-slate-300 dark:border-slate-700 bg-surface flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase font-mono text-ink">{k.existingKeys}</h2>
          <span className="text-[10px] font-mono text-ink-muted">
            TOTAL RECORDS: {filteredKeys.length} / {list.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-300 dark:border-slate-700 text-xs font-mono">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2 top-2 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={k.searchPlaceholder}
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
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="it-field-sunken text-xs font-mono py-1"
            >
              <option value="">{k.filterStatus}: {k.filterAll}</option>
              <option value="active">{k.filterActive}</option>
              <option value="revoked">{k.filterRevoked}</option>
            </select>
          </div>
          {(searchQuery || selectedStatusFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatusFilter("");
              }}
              className="it-btn-3d py-1 px-2 text-[10px] text-rose-700 dark:text-rose-400"
            >
              Clear
            </button>
          )}
        </div>

        {!filteredKeys.length ? (
          <p className="p-6 text-xs font-mono text-ink-muted text-center">{k.noKeys}</p>
        ) : (
          <table className="it-table w-full font-mono text-xs">
            <thead>
              <tr>
                <th className="text-start">{k.name}</th>
                <th className="text-start">{k.prefix}</th>
                <th className="text-start">{k.scopes}</th>
                <th className="text-start">{k.rateLimit}</th>
                <th className="text-start">{k.lastUsed}</th>
                <th className="text-start">{k.status}</th>
                {canDelete && <th className="text-start">{k.actions}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((item) => {
                const isRevoked = Boolean(item.revokedAt);
                return (
                  <tr key={item.id}>
                    <td className="font-bold">{item.name}</td>
                    <td className="font-mono text-xs">{item.keyPrefix}...</td>
                    <td className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {item.scopes.map((s) => (
                          <span
                            key={s}
                            className="border border-slate-300 dark:border-slate-700 bg-surface px-1 py-0.5 text-[10px] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-xs font-mono">{item.rateLimit}/min</td>
                    <td className="text-xs text-ink-muted">
                      {item.lastUsedAt ? date(item.lastUsedAt) : "—"}
                    </td>
                    <td>
                      <span
                        className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          isRevoked
                            ? "border-rose-400 bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            : "border-emerald-400 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        {isRevoked ? k.revokedStatus : k.activeStatus}
                      </span>
                    </td>
                    {canDelete && (
                      <td>
                        {!isRevoked && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setRevokeTarget(item)}
                            className="it-btn-3d py-0.5 px-2 text-[10px] text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{k.revoke}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {revokeTarget && (
        <CriticalActionModal
          open={true}
          title={k.revokeModalTitle}
          description={k.revokeModalDesc}
          impactDetails={[
            `Target Key: ${revokeTarget.name} (${revokeTarget.keyPrefix}...)`,
            k.revokeModalImpact,
          ]}
          requiredConfirmationText="REVOKE"
          dangerLevel="critical"
          busy={busy}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={async () => {
            const targetId = revokeTarget.id;
            setRevokeTarget(null);
            await handleRevoke(targetId);
          }}
        />
      )}
    </div>
  );
}
