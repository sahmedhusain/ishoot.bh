"use client";

import * as React from "react";
import { Eraser } from "lucide-react";

export function SignatureCanvas({ onChange, clearLabel, hint }: { onChange: (dataUrl: string | null) => void; clearLabel: string; hint: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = React.useState(true);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = point(event);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const next = point(event);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    if (empty) setEmpty(false);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onChange(canvasRef.current?.toDataURL("image/png") ?? null);
  };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative rounded-2xl border-2 border-dashed border-ink/20 bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="block h-40 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
        {empty ? <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">{hint}</span> : null}
      </div>
      <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-ink">
        <Eraser className="h-3 w-3" />
        {clearLabel}
      </button>
    </div>
  );
}
