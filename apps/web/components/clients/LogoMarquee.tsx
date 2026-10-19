"use client";
import {ContentImage} from "../shared/ContentImage";

import * as React from "react";
import type { ClientLogo } from "@platform/database/types";
import { useTranslation } from "../../hooks/useTranslation";
import { Pause, Play } from "lucide-react";

export function LogoMarquee({ logos }: { logos: ClientLogo[] }) {
  const { t } = useTranslation();
  const contrastId = React.useId().replace(/:/g, "");
  const [paused, setPaused] = React.useState(false);
  if (!logos?.length) return null;

  return (
    <section
      id="clients"
      className="relative z-10 bg-brand-base py-16 border-y border-white/10"
      aria-label={t("clients.label")}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute w-0 h-0 overflow-hidden"
      >
        <defs>
          <filter
            id={contrastId}
            colorInterpolationFilters="sRGB"
            x="-5%"
            y="-5%"
            width="110%"
            height="110%"
          >
            <feComponentTransfer in="SourceGraphic" result="artwork">
              <feFuncA type="gamma" amplitude="1" exponent=".5" offset="0" />
            </feComponentTransfer>
            {/* Lift only dark neutral ink; saturated brand colors pass through. */}
            <feColorMatrix
              in="artwork"
              type="saturate"
              values="0"
              result="gray"
            />
            <feBlend
              in="artwork"
              in2="gray"
              mode="difference"
              result="chroma"
            />
            <feColorMatrix
              in="chroma"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0"
              result="neutral"
            />
            <feComponentTransfer in="neutral" result="neutralMask">
              <feFuncA type="table" tableValues={"1 " + "0 ".repeat(40)} />
            </feComponentTransfer>
            <feColorMatrix
              in="artwork"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .2126 .7152 .0722 0 0"
              result="ink"
            />
            <feComponentTransfer in="ink" result="darkMask">
              <feFuncA type="table" tableValues="1 1 0 0 0" />
            </feComponentTransfer>
            <feComposite
              in="darkMask"
              in2="neutralMask"
              operator="in"
              result="darkNeutral"
            />
            <feFlood floodColor="white" result="whiteInk" />
            <feComposite
              in="whiteInk"
              in2="darkNeutral"
              operator="in"
              result="contrastInk"
            />
            <feComposite
              in="contrastInk"
              in2="artwork"
              operator="in"
              result="lightInk"
            />
            {/* Deep colored shadows get a small luminance lift without hue inversion. */}
            <feComponentTransfer in="ink" result="deepMask">
              <feFuncA type="table" tableValues=".5 0 0 0 0 0 0 0 0" />
            </feComponentTransfer>
            <feComposite
              in="whiteInk"
              in2="deepMask"
              operator="in"
              result="deepInk"
            />
            <feComposite
              in="deepInk"
              in2="artwork"
              operator="in"
              result="deepLift"
            />
            <feMerge>
              <feMergeNode in="artwork" />
              <feMergeNode in="deepLift" />
              <feMergeNode in="lightInk" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="shell mb-8">
        <div className="flex items-center justify-between gap-6 text-xs text-ink-muted border-b border-white/5 pb-5">
          <span className="font-semibold text-mint uppercase tracking-wider">
            {t("clients.marqueeBadge")}
          </span>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? t("clients.resume") : t("clients.pause")}
            aria-pressed={paused}
            className="client-marquee-control min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors duration-150"
          >
            {paused ? (
              <Play aria-hidden="true" className="w-4 h-4" />
            ) : (
              <Pause aria-hidden="true" className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      <div
        className="client-marquee-viewport"
        tabIndex={0}
        role="region"
        aria-label={t("clients.region")}
      >
        <div className={`client-marquee-track${paused ? " is-paused" : ""}`}>
          {[false, true].map((duplicate) => (
            <ul
              key={String(duplicate)}
              className={`client-marquee-group${duplicate ? " is-duplicate" : ""}`}
              aria-hidden={duplicate || undefined}
            >
              {logos.map((client) => (
                <li key={client.id} className="client-logo-slot">
                  {client.logo_svg_url ? (
                    <ContentImage
                      src={client.logo_svg_url}
                      alt={duplicate ? "" : client.client_name}
                      width={160}
                      height={72}
                      decoding="async"
                      className="client-logo-image"
                      style={{
                        filter: `url(#${contrastId}) drop-shadow(0 0 1px rgba(255,255,255,.4))`,
                      }}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-white text-center">
                      {client.client_name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
