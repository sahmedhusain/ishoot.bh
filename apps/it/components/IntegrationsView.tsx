"use client";

import * as React from "react";
import { Card } from "@platform/ui";
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

  if (!integrations) {
    return (
      <>
        <PageTitle title={c.title} description={c.description} />
        <Card
          role="alert"
          className="p-12 text-center text-sm text-ink-muted rounded-3xl bg-surface border border-outline-variant"
        >
          {c.unavailable}
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle title={c.title} description={c.description} />
      {!canEdit && <p className="mb-4 text-xs text-ink-muted">{c.readOnly}</p>}

      <div className="space-y-8 pb-12">
        {KINDS.map((kind) => {
          const providers = INTEGRATION_PROVIDERS.filter(
            (provider) => provider.kind === kind,
          );
          if (providers.length === 0) return null;

          return (
            <section key={kind} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {c.kinds[kind as keyof typeof c.kinds] ?? kind}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </>
  );
}
