"use client";
import Image from "next/image";
import type { ImgHTMLAttributes } from "react";
import { websiteMedia } from "../../lib/website-media";
export function ContentImage({ src, alt = "", width = 800, height = 600, fallbackText, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fallbackText?: string }) {
  if (typeof src !== "string" || !src) return fallbackText ? <span>{fallbackText}</span> : null;

  return <Image priority={props.fetchPriority === "high"} {...props} src={src.startsWith("/api/samples/") ? websiteMedia(src) : src} alt={alt} width={Number(width) || 800} height={Number(height) || 600} unoptimized={true} />;
}
