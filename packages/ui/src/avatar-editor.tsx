"use client";
// The profile photo editor (docs/adr/0012): choose a photo (file, drop or link), crop it in a circle with drag, zoom
// and rotation, review it, then save. Nothing is saved before the review step; removing asks first. The output is a
// square WebP (JPEG where WebP cannot be encoded), so every browser shows it.
import * as React from "react";
import { ImagePlus, Link2, Loader2, RotateCcw, RotateCw, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { formatMessage } from "@platform/locales";
import { useUiCopy } from "./copy/use-ui-copy";
import { Modal } from "./modal";
import { Button } from "./button";
import { UserAvatar } from "./user-avatar";
import { cn } from "./utils";

const VIEW = 288; // crop area, CSS pixels
const OUTPUT = 512; // saved photo, pixels
const MAX_ZOOM = 4;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  currentUrl?: string | null;
  /** Largest file accepted, in megabytes. */
  maxSizeMb?: number;
  /** Fetches a link through the server and resolves to a same-origin address of the image. */
  onImportLink?: (url: string) => Promise<string>;
  /** Saves the cropped photo. */
  onSave: (photo: Blob) => Promise<void>;
  /** Removes the current photo. */
  onRemove?: () => Promise<void>;
}

type Step = "choose" | "crop" | "review" | "remove";
type View = { zoom: number; x: number; y: number; turns: number };
const START: View = { zoom: 1, x: 0, y: 0, turns: 0 };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

/** Size of the image once rotated by quarter turns. */
const turned = (img: HTMLImageElement, turns: number) =>
  turns % 2 ? { w: img.naturalHeight, h: img.naturalWidth } : { w: img.naturalWidth, h: img.naturalHeight };

/** Keeps the image covering the whole crop circle. */
function clamp(img: HTMLImageElement, v: View): View {
  const { w, h } = turned(img, v.turns);
  const scale = (VIEW / Math.min(w, h)) * v.zoom;
  const maxX = Math.max(0, (w * scale - VIEW) / 2);
  const maxY = Math.max(0, (h * scale - VIEW) / 2);
  return { ...v, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) };
}

function draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, v: View, size: number) {
  const factor = size / VIEW;
  const { w, h } = turned(img, v.turns);
  const scale = (VIEW / Math.min(w, h)) * v.zoom * factor;
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingQuality = "high";
  ctx.translate(size / 2 + v.x * factor, size / 2 + v.y * factor);
  ctx.rotate((v.turns * Math.PI) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function AvatarEditor({
  isOpen,
  onClose,
  name,
  currentUrl,
  maxSizeMb = 5,
  onImportLink,
  onSave,
  onRemove,
}: AvatarEditorProps) {
  const copy = useUiCopy();
  const [step, setStep] = React.useState<Step>("choose");
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [view, setView] = React.useState<View>(START);
  const [link, setLink] = React.useState("");
  const [showLink, setShowLink] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [result, setResult] = React.useState<{ blob: Blob; url: string } | null>(null);
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const objectUrl = React.useRef<string | null>(null);
  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const pinch = React.useRef<{ distance: number; zoom: number } | null>(null);

  const reset = React.useCallback(() => {
    setStep("choose");
    setImage(null);
    setView(START);
    setLink("");
    setShowLink(false);
    setError(null);
    setBusy(false);
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return null;
    });
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);
  React.useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);
  React.useEffect(() => reset, [reset]);

  React.useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (step === "crop" && image && ctx) draw(ctx, image, view, canvas.current!.width);
  }, [step, image, view]);

  const open = async (src: string) => {
    try {
      const img = await loadImage(src);
      setImage(img);
      setView(START);
      setStep("crop");
      setError(null);
    } catch {
      setError(copy.avatarUnreadable);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError(copy.avatarUnsupported);
    if (file.size > maxSizeMb * 1024 * 1024) return setError(formatMessage(copy.avatarTooLarge, { size: maxSizeMb }));
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    await open(objectUrl.current);
  };

  const importLink = async () => {
    if (!onImportLink || !link.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await open(await onImportLink(link.trim()));
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : copy.avatarUnreadable);
    } finally {
      setBusy(false);
    }
  };

  const update = (change: (v: View) => View) => setView((v) => (image ? clamp(image, change(v)) : v));
  const zoomTo = (zoom: number) => update((v) => ({ ...v, zoom: Math.max(1, Math.min(MAX_ZOOM, zoom)) }));

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance));
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = VIEW / rect.width;
    update((v) => ({ ...v, x: v.x + (e.clientX - last.x) * ratio, y: v.y + (e.clientY - last.y) * ratio }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.key in moves) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      update((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (e.key === "+" || e.key === "=") zoomTo(view.zoom + 0.1);
    else if (e.key === "-") zoomTo(view.zoom - 0.1);
  };
  React.useEffect(() => {
    const el = canvas.current;
    if (!el || step !== "crop") return;
    // Not a React handler: wheel must be non-passive to stop the page from scrolling.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => (image ? clamp(image, { ...v, zoom: Math.max(1, Math.min(MAX_ZOOM, v.zoom * Math.exp(-e.deltaY / 500))) }) : v));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [step, image]);

  const review = async () => {
    if (!image) return;
    const out = document.createElement("canvas");
    out.width = out.height = OUTPUT;
    const ctx = out.getContext("2d");
    if (!ctx) return setError(copy.avatarFailed);
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, OUTPUT, OUTPUT);
    draw(ctx, image, view, OUTPUT);
    let blob = await toBlob(out, "image/webp", 0.9);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(out, "image/jpeg", 0.92);
    if (!blob) return setError(copy.avatarFailed);
    setResult((r) => {
      if (r) URL.revokeObjectURL(r.url);
      return { blob: blob!, url: URL.createObjectURL(blob!) };
    });
    setStep("review");
  };

  const save = async () => {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(result.blob);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : copy.avatarFailed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    setBusy(true);
    setError(null);
    try {
      await onRemove();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : copy.avatarFailed);
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "crop" ? copy.avatarCropTitle : step === "review" ? copy.avatarReviewTitle : step === "remove" ? copy.avatarRemoveTitle : copy.avatarTitle;
  const footer =
    step === "crop" ? (
      <>
        <Button type="button" variant="ghost" onClick={() => setStep("choose")}>
          {copy.avatarBack}
        </Button>
        <Button type="button" onClick={review}>
          {copy.avatarNext}
        </Button>
      </>
    ) : step === "review" ? (
      <>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep("crop")}>
          {copy.avatarBack}
        </Button>
        <Button type="button" disabled={busy} onClick={save}>
          {busy ? copy.avatarSaving : copy.avatarSave}
        </Button>
      </>
    ) : step === "remove" ? (
      <>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => setStep("choose")}>
          {copy.avatarCancel}
        </Button>
        <Button type="button" variant="danger" disabled={busy} onClick={remove}>
          {busy ? copy.avatarSaving : copy.avatarRemove}
        </Button>
      </>
    ) : (
      <Button type="button" variant="ghost" onClick={onClose}>
        {copy.avatarCancel}
      </Button>
    );

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} title={title} footer={footer} busy={busy} kind="form">
      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {step === "choose" && (
          <>
            <p className="text-sm text-ink-muted">{copy.avatarDescription}</p>
            <div className="flex items-center gap-4">
              <UserAvatar name={name} src={currentUrl} size={72} />
              <div className="min-w-0 text-sm">
                <div className="font-semibold text-ink">{copy.avatarCurrent}</div>
                {!currentUrl && <div className="text-ink-muted">{copy.avatarNone}</div>}
                {currentUrl && onRemove && (
                  <button
                    type="button"
                    onClick={() => setStep("remove")}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    {copy.avatarRemove}
                  </button>
                )}
              </div>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void pick(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                dragging ? "border-accent bg-accent/5" : "border-outline-variant",
              )}
            >
              <ImagePlus aria-hidden className="h-7 w-7 text-ink-muted" />
              <Button type="button" onClick={() => fileInput.current?.click()} className="gap-2">
                <Upload aria-hidden className="h-4 w-4" />
                {currentUrl ? copy.avatarChange : copy.avatarUpload}
              </Button>
              <span className="text-xs text-ink-muted">{dragging ? copy.avatarDrop : formatMessage(copy.avatarUploadHint, { size: maxSizeMb })}</span>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED.join(",")}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  void pick(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            {onImportLink && (
              <div>
                {!showLink ? (
                  <button
                    type="button"
                    onClick={() => setShowLink(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    <Link2 aria-hidden className="h-4 w-4" />
                    {copy.avatarFromLink}
                  </button>
                ) : (
                  <form
                    className="flex flex-col gap-2 sm:flex-row sm:items-end"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void importLink();
                    }}
                  >
                    <label className="min-w-0 flex-1 text-xs font-semibold text-ink">
                      {copy.avatarLinkLabel}
                      <input
                        type="url"
                        inputMode="url"
                        dir="ltr"
                        required
                        maxLength={2048}
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder={copy.avatarLinkPlaceholder}
                        className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </label>
                    <Button type="submit" variant="secondary" disabled={busy || !link.trim()} className="gap-2">
                      {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Link2 aria-hidden className="h-4 w-4" />}
                      {busy ? copy.avatarLoading : copy.avatarLoadLink}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        {step === "crop" && image && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">{copy.avatarCropHint}</p>
            <div className="relative mx-auto touch-none" style={{ width: "min(100%, 288px)", aspectRatio: "1 / 1" }}>
              <canvas
                ref={canvas}
                width={VIEW * 2}
                height={VIEW * 2}
                tabIndex={0}
                role="img"
                aria-label={copy.avatarCropArea}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
                className="h-full w-full cursor-grab rounded-2xl bg-ink/5 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              {/* The circle the photo is cropped to; the corners outside it are dimmed. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ background: "radial-gradient(circle at center, transparent 70.5%, rgba(0,0,0,0.45) 71%)" }}
              />
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
            </div>
            <div className="flex items-center gap-3">
              <button type="button" aria-label={copy.avatarZoomOut} onClick={() => zoomTo(view.zoom - 0.2)} className="rounded-full p-2 text-ink-muted hover:bg-ink/5">
                <ZoomOut aria-hidden className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={view.zoom}
                onChange={(e) => zoomTo(Number(e.target.value))}
                aria-label={copy.avatarZoom}
                className="min-w-0 flex-1 accent-[var(--accent,#2563eb)]"
              />
              <button type="button" aria-label={copy.avatarZoomIn} onClick={() => zoomTo(view.zoom + 0.2)} className="rounded-full p-2 text-ink-muted hover:bg-ink/5">
                <ZoomIn aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => update((v) => ({ ...v, turns: (v.turns + 3) % 4, x: 0, y: 0 }))}>
                <RotateCcw aria-hidden className="h-4 w-4" />
                {copy.avatarRotateLeft}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => update((v) => ({ ...v, turns: (v.turns + 1) % 4, x: 0, y: 0 }))}>
                <RotateCw aria-hidden className="h-4 w-4" />
                {copy.avatarRotateRight}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setView(START)}>
                {copy.avatarReset}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && result && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">{copy.avatarReviewHint}</p>
            <div className="flex items-end justify-center gap-6">
              <figure className="flex flex-col items-center gap-2">
                <UserAvatar name={name} src={result.url} size={128} />
                <figcaption className="text-xs text-ink-muted">{copy.avatarPreviewLarge}</figcaption>
              </figure>
              <figure className="flex flex-col items-center gap-2">
                <UserAvatar name={name} src={result.url} size={40} tone="available" />
                <figcaption className="text-xs text-ink-muted">{copy.avatarPreviewSmall}</figcaption>
              </figure>
            </div>
          </div>
        )}

        {step === "remove" && (
          <div className="flex items-center gap-4">
            <UserAvatar name={name} src={currentUrl} size={64} />
            <span aria-hidden className="text-ink-muted">→</span>
            <UserAvatar name={name} size={64} />
            <p className="flex-1 text-sm text-ink-muted">{copy.avatarRemoveDescription}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
