"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, ShoppingBag } from "lucide-react";
import { Button, Card, Select, Textarea, formatDate } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import type { CannedReplyRecord } from "@platform/database";
import { ROUTES } from "../../constants/routes";
import { replyToRequestAction } from "../../app/actions/service-desk";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";

interface Reply {
  id: string;
  body: string;
  channel: string;
  author: string;
  at: string;
}

/** Replying to the customer from a request: saved replies in the customer's language, e-mail or WhatsApp. */
export function ServiceReplyPanel({ requestId, customerLocale, hasEmail, hasPhone, order, replies, cannedReplies, canReply }: { requestId: string; customerLocale: string; hasEmail: boolean; hasPhone: boolean; order: { id: string; number: string } | null; replies: Reply[]; cannedReplies: CannedReplyRecord[]; canReply: boolean }) {
  const { t, locale } = useAdminLocale();
  const copy = t.serviceDesk.reply;
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const send = async (channel: "email" | "whatsapp") => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await replyToRequestAction(requestId, { channel, body });
      if (result.whatsappLink) window.open(result.whatsappLink, "_blank", "noopener");
      setMessage({ tone: "ok", text: result.whatsappLink ? copy.openWhatsapp : copy.sent });
      setBody("");
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, t) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-5 space-y-4 max-w-5xl mx-auto" data-testid="service-reply">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-ink">{copy.title}</h2>
        {order && (
          <Link href={ROUTES.orders.detail(order.id)} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1 text-xs font-semibold hover:border-accent" data-testid="request-order">
            <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
            {formatMessage(copy.order, { number: order.number })}
          </Link>
        )}
      </div>
      {replies.length > 0 ? (
        <ol className="space-y-2" data-testid="service-replies">
          {replies.map((r) => (
            <li key={r.id} className="rounded-xl bg-accent/5 p-3 text-sm">
              <p className="text-xs text-ink-muted mb-1">{[r.author, (copy.via as Record<string, string>)[r.channel] ?? "", formatDate(r.at, locale, "time")].filter(Boolean).join(" · ")}</p>
              <p className="whitespace-pre-line">{r.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">{copy.noHistory}</p>
      )}
      {canReply && (
        <div className="space-y-3">
          {cannedReplies.length > 0 && (
            <Select aria-label={copy.pick} value="" onChange={(e) => { const reply = cannedReplies.find((r) => r.id === e.target.value); if (reply) setBody((current) => [current.trim(), customerLocale === "en" ? reply.body_en : reply.body_ar].filter(Boolean).join("\n\n")); }} className="rounded-lg sm:w-80" data-testid="canned-pick">
              <option value="">{copy.pick}</option>
              {cannedReplies.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </Select>
          )}
          <Textarea aria-label={copy.placeholder} placeholder={copy.placeholder} name="serviceReply" rows={5} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-lg" dir="auto" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="primary" className="rounded-full gap-1.5" disabled={busy || !body.trim() || !hasEmail} onClick={() => void send("email")} data-testid="reply-email"><Mail className="w-3.5 h-3.5" />{copy.email}</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-full gap-1.5" disabled={busy || !body.trim() || !hasPhone} onClick={() => void send("whatsapp")} data-testid="reply-whatsapp"><MessageCircle className="w-3.5 h-3.5" />{copy.whatsapp}</Button>
          </div>
          {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600"}`}>{message.text}</p>}
        </div>
      )}
    </Card>
  );
}
