"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { Button, Card, Input, Textarea } from "@platform/ui";
import type { WebsiteCode } from "@platform/database/website-config";
import { saveWebsiteCodeAction } from "../../app/actions/website";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { errorMessage } from "../../lib/error-text";
import { Field } from "../setup/LanguageFields";

/** Website → Tracking and code: analytics ids (run on the page) and the company's own code (sealed frame). */
export function SiteCodeView({ initialCode, canEdit }: { initialCode: WebsiteCode; canEdit: boolean }) {
  const { t } = useAdminLocale();
  const copy = t.siteCode;
  const router = useRouter();
  const [code, setCode] = React.useState(initialCode);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await saveWebsiteCodeAction(code);
      setMessage({ tone: "ok", text: copy.saved });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: errorMessage(error, t) });
    } finally {
      setBusy(false);
    }
  };
  const input = (key: "googleAnalyticsId" | "metaPixelId" | "tiktokPixelId") => (
    <Field label={copy[key]} hint={copy.hints[key]}>
      {(id) => <Input id={id} dir="ltr" disabled={!canEdit} value={code[key]} onChange={(e) => setCode({ ...code, [key]: e.target.value.trim() })} className="rounded-lg font-mono" />}
    </Field>
  );
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{copy.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">{copy.subtitle}</p>
        </div>
        {canEdit && (
          <Button type="button" variant="primary" size="sm" className="rounded-full gap-1.5" disabled={busy} onClick={save}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {copy.save}
          </Button>
        )}
      </div>
      {message && <p role="status" className={`text-sm rounded-xl px-4 py-3 ${message.tone === "ok" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{message.text}</p>}
      <Card className="p-5 grid sm:grid-cols-3 gap-4">
        <h2 className="sm:col-span-3 font-bold text-ink">{copy.analytics}</h2>
        {input("googleAnalyticsId")}
        {input("metaPixelId")}
        {input("tiktokPixelId")}
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-bold text-ink">{copy.custom}</h2>
        <p className="flex items-start gap-2 text-xs rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {copy.sandboxed}
        </p>
        {(["headHtml", "bodyHtml"] as const).map((key) => (
          <Field key={key} label={copy[key]} wide>
            {(id) => <Textarea id={id} dir="ltr" rows={6} disabled={!canEdit} value={code[key]} onChange={(e) => setCode({ ...code, [key]: e.target.value })} className="font-mono text-xs rounded-lg" />}
          </Field>
        ))}
      </Card>
    </div>
  );
}
