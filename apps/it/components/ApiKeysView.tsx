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
} from "lucide-react";
import { Button, Card, Input } from "@platform/ui";
import type { ApiKeyRecord, ApiKeyCreated } from "@platform/api-client";
import {
  createAPIKeyAction,
  revokeAPIKeyAction,
} from "../app/(desk)/api-keys/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function ApiKeysView({
  keys,
  canCreate,
  canDelete,
}: {
  keys: ApiKeyRecord[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const { copy, date } = useCopy();
  const k = copy.apiKeys;
  const router = useRouter();

  const [busy, setBusy] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createdKey, setCreatedKey] = React.useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Form states
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={k.title} description={k.description} />
        {canCreate && !showCreate && !createdKey && (
          <Button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>{k.newKey}</span>
          </Button>
        )}
      </div>

      {/* Secret Token Banner */}
      {createdKey && (
        <Card className="rounded-3xl border border-emerald-300 bg-emerald-50/60 p-6 space-y-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <Check className="h-5 w-5" />
            <h3 className="font-semibold">{k.tokenCreatedTitle}</h3>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            {k.tokenWarning}
          </p>

          <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-surface p-3 dark:border-emerald-800">
            <code className="flex-1 font-mono text-sm break-all">
              {createdKey.token}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => copyToClipboard(createdKey.token)}
              className="flex items-center gap-1 text-xs"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? k.copied : k.copy}</span>
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreatedKey(null)}
              className="text-xs"
            >
              {k.dismiss}
            </Button>
          </div>
        </Card>
      )}

      {/* Create Key Form */}
      {showCreate && (
        <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
          <h2 className="text-base font-semibold">{k.newKeyTitle}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>{k.name}</span>
                <Input
                  required
                  placeholder={k.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span>{k.rateLimit}</span>
                <Input
                  type="number"
                  min="1"
                  max="10000"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value, 10) || 60)}
                />
              </label>

              <label className="block space-y-1 text-sm sm:col-span-2">
                <span>{k.scopes}</span>
                <Input
                  value={scopesStr}
                  onChange={(e) => setScopesStr(e.target.value)}
                />
                <span className="block text-xs text-ink-muted">{k.scopesHint}</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setShowCreate(false)}
              >
                {k.cancel}
              </Button>
              <Button type="submit" disabled={busy} className="flex items-center gap-1.5">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{k.createKey}</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Keys Table */}
      <Card className="rounded-3xl border border-outline-variant p-6 space-y-4">
        <h2 className="text-base font-semibold">{k.existingKeys}</h2>

        {!keys.length ? (
          <p className="text-xs text-ink-muted py-6 text-center">{k.noKeys}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm rtl:text-right">
              <thead>
                <tr className="border-b border-outline-variant text-xs text-ink-muted">
                  <th className="pb-2 font-medium">{k.name}</th>
                  <th className="pb-2 font-medium">{k.prefix}</th>
                  <th className="pb-2 font-medium">{k.scopes}</th>
                  <th className="pb-2 font-medium">{k.rateLimit}</th>
                  <th className="pb-2 font-medium">{k.lastUsed}</th>
                  <th className="pb-2 font-medium">{k.status}</th>
                  {canDelete && <th className="pb-2 font-medium">{k.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {keys.map((item) => {
                  const isRevoked = Boolean(item.revokedAt);
                  return (
                    <tr key={item.id}>
                      <td className="py-3 font-medium">{item.name}</td>
                      <td className="py-3 font-mono text-xs">{item.keyPrefix}...</td>
                      <td className="py-3 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {item.scopes.map((s) => (
                            <span
                              key={s}
                              className="rounded bg-surface-variant px-1.5 py-0.5 text-[11px] font-mono"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-xs font-mono">{item.rateLimit}/m</td>
                      <td className="py-3 text-xs text-ink-muted">
                        {item.lastUsedAt ? date(item.lastUsedAt) : "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isRevoked
                              ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {isRevoked ? k.revokedStatus : k.activeStatus}
                        </span>
                      </td>
                      {canDelete && (
                        <td className="py-3">
                          {!isRevoked && (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy}
                              onClick={() => handleRevoke(item.id)}
                              className="text-xs text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{k.revoke}</span>
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
