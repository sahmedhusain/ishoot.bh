"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@platform/ui";
import { ShieldAlert } from "lucide-react";
import { formatMessage } from "@platform/locales";
import type { ModuleState } from "@platform/api-client";
import { setModuleAction } from "../app/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

export function ModulesView({
  modules,
  canEdit,
}: {
  modules: ModuleState[] | null;
  canEdit: boolean;
}) {
  const { copy, name, date } = useCopy();
  const m = copy.modules;
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const toggle = async (key: string, enabled: boolean) => {
    setBusy(key);
    try {
      const { ok } = await setModuleAction(key, enabled);
      if (ok) toast.success(m.saved);
      else toast.error(m.failed);
      router.refresh();
    } catch {
      toast.error(m.failed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageTitle title={m.title} description={m.description} />
      <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
        <ShieldAlert className="size-5 shrink-0" aria-hidden />
        <p>{m.warning}</p>
      </div>
      {!canEdit && <p className="mb-4 text-xs text-ink-muted">{m.readOnly}</p>}
      {!modules ? (
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {m.unavailable}
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((module) => {
            const label = name(module);
            return (
              <li key={module.key}>
                <Card
                  className={`p-5 rounded-3xl border border-outline-variant bg-surface ${module.enabled ? "" : "opacity-70"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-bold text-ink">{label}</h2>
                      <p
                        className="mt-1 font-mono text-xs text-ink-muted"
                        dir="ltr"
                      >
                        {module.key}
                      </p>
                      <p className="mt-2 text-[11px] text-ink-muted">
                        {formatMessage(m.byDefault, {
                          state: module.enabledByDefault ? m.on : m.off,
                        })}
                        {module.updatedAt
                          ? ` · ${formatMessage(m.changed, { when: date(module.updatedAt) })}`
                          : ""}
                      </p>
                    </div>
                    {/* The shared stylesheet draws button[role=switch] as a Material switch: a track and its thumb. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={module.enabled}
                      aria-label={label}
                      aria-busy={busy === module.key}
                      disabled={!canEdit || busy === module.key}
                      onClick={() => toggle(module.key, !module.enabled)}
                      className="relative shrink-0 rounded-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="rounded-full" />
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
