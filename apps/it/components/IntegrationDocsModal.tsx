"use client";

import * as React from "react";
import { FileCode, Copy, Check, ExternalLink, X, Shield, ArrowRight } from "lucide-react";
import { Button } from "@platform/ui";
import { toast } from "sonner";
import { useCopy } from "./CopyProvider";
import type { IntegrationProvider } from "@platform/config/constants/integrations";

export function IntegrationDocsModal({
  provider,
  open,
  onClose,
}: {
  provider: IntegrationProvider | null;
  open: boolean;
  onClose: () => void;
}) {
  const { copy } = useCopy();
  const idoc = copy.integrationDocs;
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!open || !provider) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Snippet copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate hard technical specs per provider
  const specs = getProviderTechnicalSpecs(provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="it-card w-full max-w-2xl max-h-[90vh] flex flex-col bg-surface overflow-hidden border-2 border-slate-700 shadow-2xl font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-amber-400" />
            <h2 className="font-bold uppercase tracking-wider text-sm">
              {idoc.modalTitle}: {provider.id.toUpperCase()}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label={idoc.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between p-3 border border-outline-variant bg-slate-100 dark:bg-slate-900/60">
            <div>
              <span className="text-[10px] text-ink-muted uppercase">PROVIDER KIND:</span>
              <div className="font-bold uppercase text-ink">{provider.kind}</div>
            </div>
            <div>
              <span className="text-[10px] text-ink-muted uppercase">PROTOCOL / TRANSPORT:</span>
              <div className="font-bold text-sky-600 dark:text-sky-400">HTTPS / REST JSON + WEBHOOK</div>
            </div>
            <div>
              <span className="text-[10px] text-ink-muted uppercase">OFFICIAL DOCS:</span>
              <div>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>PORTAL</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Ingress Webhook Endpoint */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-ink-muted">INGRESS WEBHOOK CALLBACK URL</span>
              <button
                type="button"
                onClick={() => copyToClipboard(specs.webhookUrl, "webhook")}
                className="text-[10px] text-sky-600 hover:underline flex items-center gap-1"
              >
                {copied === "webhook" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>COPY URL</span>
              </button>
            </div>
            <div className="p-2 border border-outline-variant bg-slate-950 text-sky-300 select-all font-mono">
              {specs.webhookUrl}
            </div>
          </div>

          {/* Signature & Security */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase text-ink-muted">SECURITY & SIGNATURE VERIFICATION</span>
            <div className="p-3 border border-outline-variant bg-surface space-y-1 text-[11px] font-sans">
              <div className="font-bold text-ink font-mono">{specs.authType}</div>
              <p className="text-ink-muted leading-relaxed">{specs.securityDetails}</p>
            </div>
          </div>

          {/* Sample JSON Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-ink-muted">SAMPLE EVENT PAYLOAD SCHEMA (JSON)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(specs.samplePayload, "payload")}
                className="text-[10px] text-sky-600 hover:underline flex items-center gap-1"
              >
                {copied === "payload" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>COPY SCHEMA</span>
              </button>
            </div>
            <pre className="p-3 border border-outline-variant bg-slate-950 text-emerald-400 overflow-x-auto text-[11px] select-all">
              {specs.samplePayload}
            </pre>
          </div>

          {/* cURL Test Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-ink-muted">MOCK PING / DIAGNOSTIC CURL COMMAND</span>
              <button
                type="button"
                onClick={() => copyToClipboard(specs.curlCommand, "curl")}
                className="text-[10px] text-sky-600 hover:underline flex items-center gap-1"
              >
                {copied === "curl" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>COPY CURL</span>
              </button>
            </div>
            <pre className="p-3 border border-outline-variant bg-slate-950 text-amber-300 overflow-x-auto text-[11px] select-all">
              {specs.curlCommand}
            </pre>
          </div>

          {/* Retry & DLQ Behavior */}
          <div className="p-3 border border-outline-variant bg-slate-50 dark:bg-slate-900/40 text-[11px] font-sans space-y-1">
            <div className="font-bold text-ink font-mono uppercase text-[10px]">RETRY & DEAD LETTER QUEUE (DLQ) POLICY</div>
            <p className="text-ink-muted">
              Failed delivery attempts trigger exponential backoff: retry after 1 min, 5 min, 30 min, and 2 hours (up to 5 attempts). Unacknowledged payloads are persisted to <code className="text-ink">notify.dead_letter</code> for inspection.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-outline-variant bg-surface p-3 flex justify-end">
          <Button type="button" size="sm" onClick={onClose} className="font-mono text-xs">
            {idoc.close}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getProviderTechnicalSpecs(provider: IntegrationProvider) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ishoot.bh";

  switch (provider.id) {
    case "resend":
      return {
        webhookUrl: `${origin}/api/notify/webhooks/resend`,
        authType: "Svix Asymmetric Signature (svix-signature, svix-timestamp)",
        securityDetails:
          "Incoming webhook requests must include headers svix-id, svix-timestamp, and svix-signature. The system verifies using your webhook secret to prevent replay attacks.",
        samplePayload: JSON.stringify(
          {
            type: "email.delivered",
            created_at: new Date().toISOString(),
            data: {
              email_id: "em_1042abc",
              to: ["client@example.com"],
              from: "notifications@ishoot.bh",
              subject: "Booking Quotation Confirmed",
            },
          },
          null,
          2
        ),
        curlCommand: `curl -X POST "${origin}/api/notify/webhooks/resend" \\\n  -H "Content-Type: application/json" \\\n  -H "svix-id: msg_test123" \\\n  -H "svix-timestamp: 1731094000" \\\n  -H "svix-signature: v1,dGVzdF9zaWduYXR1cmU=" \\\n  -d '{"type":"email.delivered","data":{"email_id":"em_test"}}'`,
      };

    case "paytabs":
    case "tap":
    case "stripe":
    case "checkout_com":
      return {
        webhookUrl: `${origin}/v1/system/payments/callback`,
        authType: "HMAC-SHA256 Signature Verification",
        securityDetails:
          "Payment gateway pushes settlement events via server-to-server IPN. Signatures are calculated using the configured secret key over the raw payload body.",
        samplePayload: JSON.stringify(
          {
            event: "payment.succeeded",
            tran_ref: "TST2411080001",
            cart_id: "INV-2026-104",
            cart_amount: "150.000",
            cart_currency: "BHD",
            payment_result: {
              response_status: "A",
              response_code: "100",
              response_message: "Authorised",
            },
          },
          null,
          2
        ),
        curlCommand: `curl -X POST "${origin}/v1/system/payments/callback" \\\n  -H "Content-Type: application/json" \\\n  -H "Signature: hmac_sha256_hash" \\\n  -d '{"event":"payment.succeeded","tran_ref":"TST01","cart_id":"INV-101"}'`,
      };

    case "whatsapp":
    case "meta":
      return {
        webhookUrl: `${origin}/api/notify/webhooks/whatsapp`,
        authType: "Meta Cloud API X-Hub-Signature-256",
        securityDetails:
          "Webhook handshake verified via hub.mode and hub.verify_token. Event payloads are validated using SHA256 HMAC against the Meta App Secret.",
        samplePayload: JSON.stringify(
          {
            object: "whatsapp_business_account",
            entry: [
              {
                id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
                changes: [
                  {
                    value: {
                      messaging_product: "whatsapp",
                      statuses: [
                        {
                          id: "wamid.HBgL...",
                          status: "delivered",
                          timestamp: "1731094000",
                          recipient_id: "+97336000000",
                        },
                      ],
                    },
                    field: "messages",
                  },
                ],
              },
            ],
          },
          null,
          2
        ),
        curlCommand: `curl -X POST "${origin}/api/notify/webhooks/whatsapp" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Hub-Signature-256: sha256=test_hash" \\\n  -d '{"object":"whatsapp_business_account"}'`,
      };

    default:
      return {
        webhookUrl: `${origin}/api/integrations/${provider.id}/webhook`,
        authType: "Bearer API Key / Webhook Secret",
        securityDetails:
          "Inbound callbacks require mutual TLS or an Authorization Bearer header matching the integration credentials stored in system.integration.",
        samplePayload: JSON.stringify(
          {
            provider: provider.id,
            timestamp: new Date().toISOString(),
            status: "active",
            data: { event_id: "evt_1001", state: "synced" },
          },
          null,
          2
        ),
        curlCommand: `curl -X POST "${origin}/api/integrations/${provider.id}/webhook" \\\n  -H "Content-Type: application/json" \\\n  -d '{"provider":"${provider.id}","status":"test"}'`,
      };
  }
}
