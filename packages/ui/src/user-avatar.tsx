"use client";
// A person's picture, or the first letters of their name when they have none (docs/adr/0012), with an optional dot
// for their status. Colours come from the name, so the same person always looks the same.
import * as React from "react";
import { cn } from "./utils";

export type PresenceTone = "available" | "busy" | "away" | "leave" | "offline";

/** Two letters: the first of the first and last words ("Sara Al Khalifa" → "SK"), or the first two of one word. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "")
    .replace(/[.,;:!?()[\]{}"«»<>@#&*/\\|_+=~`^$%0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "?";
  const first = Array.from(words[0]);
  if (words.length === 1) return first.slice(0, 2).join("").toLocaleUpperCase();
  return (first[0] + Array.from(words[words.length - 1])[0]).toLocaleUpperCase();
}

function hueOf(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 360;
}

const TONE_COLOURS: Record<PresenceTone, string> = {
  available: "#16a34a",
  busy: "#dc2626",
  away: "#d97706",
  leave: "#8b5cf6",
  offline: "#9ca3af",
};

/** A small status dot; do not disturb shows a bar, offline a hollow ring. */
export function PresenceDot({
  tone,
  doNotDisturb,
  size = 10,
  label,
  className,
}: {
  tone: PresenceTone;
  doNotDisturb?: boolean;
  size?: number;
  label?: string;
  className?: string;
}) {
  const colour = TONE_COLOURS[tone];
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: tone === "offline" ? "transparent" : colour,
        boxShadow: tone === "offline" ? `inset 0 0 0 ${Math.max(1.5, size / 5)}px ${colour}` : undefined,
      }}
    >
      {doNotDisturb && (
        <span style={{ width: size * 0.55, height: Math.max(1.5, size / 5), background: "#fff", borderRadius: 2 }} />
      )}
    </span>
  );
}

export interface UserAvatarProps {
  name: string;
  /** The picture's address; the initials show without one, or when it cannot be loaded. */
  src?: string | null;
  size?: number;
  tone?: PresenceTone | null;
  doNotDisturb?: boolean;
  /** Accessible status text for the dot. */
  statusLabel?: string;
  className?: string;
  /** Square with rounded corners instead of a circle. */
  rounded?: "full" | "xl";
}

export function UserAvatar({
  name,
  src,
  size = 40,
  tone,
  doNotDisturb,
  statusLabel,
  className,
  rounded = "full",
}: UserAvatarProps) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const showImage = !!src && !failed;
  const hue = hueOf(name || "?");
  const dot = Math.max(8, Math.round(size * 0.28));
  return (
    <span
      className={cn("relative inline-flex shrink-0 select-none", className)}
      style={{ width: size, height: size }}
      data-avatar
    >
      <span
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden font-semibold text-white",
          rounded === "full" ? "rounded-full" : "rounded-xl",
        )}
        style={showImage ? undefined : { background: `hsl(${hue} 52% 42%)`, fontSize: Math.max(10, size * 0.38) }}
        aria-hidden
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars come from same-origin file routes
          <img
            src={src!}
            alt=""
            width={size}
            height={size}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span dir="auto">{initialsOf(name)}</span>
        )}
      </span>
      <span className="sr-only">{name}</span>
      {tone && (
        <PresenceDot
          tone={tone}
          doNotDisturb={doNotDisturb}
          size={dot}
          label={statusLabel}
          className="absolute -bottom-0.5 -end-0.5 ring-2 ring-[var(--avatar-ring,white)] dark:ring-[var(--avatar-ring-dark,#1f2937)]"
        />
      )}
    </span>
  );
}
