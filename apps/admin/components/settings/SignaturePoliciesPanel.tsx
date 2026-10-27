"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { Card } from "@platform/ui";
import { setSignaturePolicyAction } from "../../app/actions/signatures";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

/**
 * Per document, whether the signer's approved saved signature is applied, or the signer must draw it at the
 * moment of signing or approving (documents signed in front of someone, such as asset handovers).
 */
export function SignaturePoliciesPanel({
  policies,
}: {
  policies: Array<{ documentType: string; mode: "stored" | "live" }>;
}) {
  const { t } = useAdminLocale();
  const s = t.signaturePolicies;
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const change = async (documentType: string, mode: "stored" | "live") => {
    setBusy(documentType);
    try {
      await setSignaturePolicyAction(documentType, mode);
      toast.success(s.saved);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error, t, s.failed));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 space-y-4 dark:bg-surface-raised">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <PenLine className="h-4 w-4 text-accent" aria-hidden />
          {s.title}
        </h2>
        <p className="mt-1 text-xs text-ink-muted">{s.subtitle}</p>
      </div>
      <ul className="divide-y divide-outline-variant rounded-2xl border border-outline-variant">
        {policies.map((policy) => (
          <li
            key={policy.documentType}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-ink">
              {s.documents[policy.documentType as keyof typeof s.documents] ??
                policy.documentType}
            </span>
            <div
              role="radiogroup"
              aria-label={
                s.documents[policy.documentType as keyof typeof s.documents]
              }
              className="inline-flex rounded-xl bg-ink/5 p-1"
            >
              {(["stored", "live"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={policy.mode === mode}
                  disabled={busy === policy.documentType}
                  onClick={() =>
                    policy.mode !== mode && change(policy.documentType, mode)
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${policy.mode === mode ? "bg-surface-raised text-ink shadow-sm dark:bg-white/10" : "text-ink-muted hover:text-ink"}`}
                >
                  {s.modes[mode]}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-ink-muted">{s.note}</p>
    </Card>
  );
}
