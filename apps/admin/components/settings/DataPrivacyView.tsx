"use client";

import * as React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button, Card, ConfirmDialog, Input } from "@platform/ui";
import { toast } from "sonner";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import {
  eraseCustomerDataAction,
  type CustomerErasureInput,
} from "../../app/actions/data-privacy";
import { PageHeader } from "../layout/PageHeader";

export function DataPrivacyView() {
  const { t } = useAdminLocale();
  const copy = t.dataPrivacyView;
  const [customerId, setCustomerId] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState<CustomerErasureInput | null>(
    null,
  );

  const submitErasure = async () => {
    if (!pending) return;
    await eraseCustomerDataAction(pending);
    setCustomerId("");
    setEmail("");
    toast.success(copy.success);
  };

  const warning = (
    <div className="space-y-3">
      <p>{copy.warning}</p>
      <p className="font-semibold text-ink">{copy.accountingRetention}</p>
      {pending?.kind === "email" && <p>{copy.emailScopeWarning}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-ink">{copy.byIdTitle}</h2>
            <p className="text-sm text-ink-muted">{copy.byIdDescription}</p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (customerId.trim()) setPending({ kind: "customerId", value: customerId });
            }}
          >
            <label htmlFor="privacy-customer-id" className="block text-sm font-medium">
              {copy.customerIdLabel}
            </label>
            <Input
              id="privacy-customer-id"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              autoComplete="off"
              maxLength={128}
              required
            />
            <Button type="submit" variant="danger">
              <ShieldAlert className="me-2 h-4 w-4" aria-hidden="true" />
              {copy.eraseById}
            </Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-semibold text-ink">{copy.byEmailTitle}</h2>
            <p className="text-sm text-ink-muted">{copy.byEmailDescription}</p>
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (email.trim()) setPending({ kind: "email", value: email });
            }}
          >
            <label htmlFor="privacy-customer-email" className="block text-sm font-medium">
              {copy.emailLabel}
            </label>
            <Input
              id="privacy-customer-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
            <Button type="submit" variant="danger">
              <ShieldAlert className="me-2 h-4 w-4" aria-hidden="true" />
              {copy.eraseByEmail}
            </Button>
          </form>
        </Card>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span>{copy.warning}</span>
      </p>

      <ConfirmDialog
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={submitErasure}
        title={pending?.kind === "email" ? copy.confirmEmailTitle : copy.confirmIdTitle}
        description={warning}
        confirmMatchText={copy.confirmWord}
        typePromptLabel={copy.typePrompt}
        confirmLabel={copy.confirmButton}
        errorLabel={copy.failure}
      />
    </div>
  );
}
