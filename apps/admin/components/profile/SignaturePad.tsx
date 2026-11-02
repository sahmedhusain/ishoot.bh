"use client";

import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eraser, PenLine, Send, Undo2, History, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirmation } from "@platform/ui";
import type { SignatureChangeRow } from "@platform/database/queries/signature-changes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { uploadFileDirectly } from "../../lib/upload-client";
import { ContentImage } from "../shared/ContentImage";
import { requestSignatureChangeAction, cancelSignatureChangeAction } from "../../app/actions/profile";

type Point = { x: number; y: number; p: number };

const WIDTH = 600;
const HEIGHT = 200;

/**
 * Draw a signature on the page (mouse, pen or finger). It is saved as a transparent PNG and
 * replaces the current signature only after approval; every change stays in the log below.
 */
export function SignaturePad({ currentUrl, changes }: { currentUrl?: string | null; changes: SignatureChangeRow[] }) {
  const { t, locale } = useAdminLocale();
  const s = t.signaturePad;
  const router = useRouter();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const strokes = React.useRef<Point[][]>([]);
  const drawing = React.useRef(false);
  const [hasInk, setHasInk] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // The pad shows only after "Change signature", so the current one is never replaced by accident.
  const [editing, setEditing] = React.useState(false);
  const confirmAction = useConfirmation();
  const pending = changes.find((c) => c.status === "pending");

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1F3A";
    for (const stroke of strokes.current) {
      for (let i = 1; i < stroke.length; i++) {
        const a = stroke[i - 1];
        const b = stroke[i];
        ctx.lineWidth = 1.6 + 2.4 * ((a.p + b.p) / 2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * HEIGHT,
      p: e.pressure && e.pressure !== 0.5 ? e.pressure : 0.5,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    strokes.current.push([point(e)]);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    strokes.current[strokes.current.length - 1].push(point(e));
    redraw();
    if (!hasInk) setHasInk(true);
  };
  const end = () => {
    drawing.current = false;
  };
  const clear = () => {
    strokes.current = [];
    redraw();
    setHasInk(false);
  };
  const undo = () => {
    strokes.current.pop();
    redraw();
    setHasInk(strokes.current.some((st) => st.length > 1));
  };

  const review = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    const preview = canvas.toDataURL("image/png");
    confirmAction({
      title: s.confirmTitle,
      variant: "warning",
      description: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs text-ink-muted">
            <figure className="space-y-1">
              <figcaption>{s.current}</figcaption>
              <div className="flex h-16 items-center justify-center overflow-hidden rounded-xl border border-outline-variant bg-white">
                {currentUrl ? <ContentImage src={currentUrl} alt={s.current} className="max-h-full max-w-full object-contain" /> : <span>{s.none}</span>}
              </div>
            </figure>
            <figure className="space-y-1">
              <figcaption>{s.newSignature}</figcaption>
              <div className="flex h-16 items-center justify-center overflow-hidden rounded-xl border border-accent/40 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element -- a data URL of the drawing */}
                <img src={preview} alt={s.newSignature} className="max-h-full max-w-full object-contain" />
              </div>
            </figure>
          </div>
          <p className="text-xs text-ink-muted">{s.confirmHint}</p>
        </div>
      ),
      onConfirm: submit,
    });
  };

  const submit = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error(s.failed);
      const file = new File([blob], "signature.png", { type: "image/png" });
      const uploaded = await uploadFileDirectly(file, { entityType: "user_signature", entityId: "pending" });
      const res = await requestSignatureChangeAction(uploaded.fileUrl);
      toast.success(res.approvalStatus === "approved" ? s.applied : s.submitted);
      clear();
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, s.failed));
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (id: string) => {
    try {
      await cancelSignatureChangeAction(id);
      toast.success(s.withdrawn);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, t, s.failed));
    }
  };

  const statusStyle: Record<SignatureChangeRow["status"], string> = {
    pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    cancelled: "bg-ink/5 text-ink-muted",
  };

  return (
    <section className="rounded-3xl border border-outline-variant bg-surface p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <PenLine className="w-5 h-5 text-accent" />
            {s.title}
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">{s.subtitle}</p>
        </div>
        <div className="text-xs text-ink-muted">
          <div className="mb-1">{s.current}</div>
          <div className="h-14 w-40 rounded-xl border border-outline-variant bg-surface-raised flex items-center justify-center overflow-hidden">
            {currentUrl ? <ContentImage src={currentUrl} alt={s.current} className="max-h-full max-w-full object-contain" /> : <span className="text-[11px] text-ink-muted">{s.none}</span>}
          </div>
        </div>
      </div>

      {pending ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-wrap items-center gap-4">
          <div className="h-14 w-40 rounded-xl border border-outline-variant bg-surface-raised flex items-center justify-center overflow-hidden">
            <ContentImage src={pending.signatureUrl} alt={s.pending} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex-1 text-xs text-ink">
            <div className="font-semibold">{s.pending}</div>
            <div className="text-ink-muted">{s.pendingHint}</div>
          </div>
          <button
            type="button"
            onClick={() => confirmAction({ description: s.withdrawConfirm, variant: "warning", onConfirm: () => withdraw(pending.id) })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink"
          >
            <X className="w-3.5 h-3.5" />
            {s.withdraw}
          </button>
        </div>
      ) : !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-raised p-4">
          <p className="text-xs text-ink-muted max-w-md">{s.changeHint}</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-accent-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <PenLine className="w-3.5 h-3.5" />
            {currentUrl ? s.change : s.add}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-raised overflow-hidden">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label={s.padLabel}
              className="w-full h-auto block touch-none cursor-crosshair"
              style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              onPointerCancel={end}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-ink-muted">{s.hint}</span>
            <div className="flex gap-2">
              <button type="button" onClick={undo} disabled={!hasInk} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink disabled:opacity-40">
                <Undo2 className="w-3.5 h-3.5" />
                {s.undo}
              </button>
              <button type="button" onClick={clear} disabled={!hasInk} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink disabled:opacity-40">
                <Eraser className="w-3.5 h-3.5" />
                {s.clear}
              </button>
              <button
                type="button"
                onClick={() => {
                  clear();
                  setEditing(false);
                }}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-xs text-ink disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
                {s.cancelChange}
              </button>
              <button type="button" onClick={review} disabled={!hasInk || saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold disabled:opacity-50">
                <Send className="w-3.5 h-3.5" />
                {saving ? s.submitting : s.submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {changes.length > 0 && (
        <div className="pt-4 border-t border-outline-variant">
          <div className="text-xs font-semibold text-ink-muted flex items-center gap-1.5 mb-3">
            <History className="w-3.5 h-3.5" />
            {s.log}
          </div>
          <ul className="space-y-2">
            {changes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 text-xs">
                <div className="h-9 w-24 rounded-lg border border-outline-variant bg-surface-raised flex items-center justify-center overflow-hidden">
                  <ContentImage src={c.signatureUrl} alt="" className="max-h-full max-w-full object-contain" />
                </div>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${statusStyle[c.status]}`}>{s.status[c.status]}</span>
                <span className="text-ink-muted">{new Date(c.createdAt).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : "en-GB")}</span>
                {c.reviewedBy && <span className="text-ink-muted">· {formatMessage(s.by, { name: c.reviewedBy })}</span>}
                {c.reviewNotes && <span className="text-ink-muted italic">“{c.reviewNotes}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
