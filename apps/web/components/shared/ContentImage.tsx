"use client";
import Image from "next/image";
import type { ImgHTMLAttributes } from "react";
export function ContentImage({ src, alt = "", width = 800, height = 600, fallbackText, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallbackText?: string }) {
  if (typeof src !== "string" || !src) return fallbackText ? <span className={props.className}>{fallbackText}</span> : null;
  const external = !src.startsWith("/") || src.startsWith("//");
  return <Image priority={props.fetchPriority === "high"} {...props} src={src} alt={alt} width={Number(width) || 800} height={Number(height) || 600} unoptimized={external || src.startsWith("/api/samples/") || (src.startsWith("/api/files/") && !src.startsWith("/api/files/brand/"))} />;
}
