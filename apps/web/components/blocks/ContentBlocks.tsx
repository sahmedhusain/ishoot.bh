import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { embedSource, videoSource, type BlockData, type LocalText } from "@platform/database/cms/blocks";
import { Reveal } from "../shared/Reveal";
import { ContentImage } from "../shared/ContentImage";
import { SectionBadge } from "../shared/SectionBadge";
import { sanitizeRichHtml } from "../../lib/rich-text/sanitize";

export const pick = (text: LocalText | undefined, locale: string) =>
  (locale === "ar" ? text?.ar || text?.en : text?.en || text?.ar) ?? "";

function Heading({ title, locale }: { title?: LocalText; locale: string }) {
  const text = pick(title, locale);
  return text ? (
    <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-m3-on-surface leading-tight mb-8">
      {text}
    </h2>
  ) : null;
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative py-16 sm:py-20 border-t border-m3-outline-variant text-m3-on-surface ${className}`}>
      <div className="shell">{children}</div>
    </section>
  );
}

export function RichTextBlock({ data, locale }: { data: BlockData["rich_text"]; locale: string }) {
  const html = pick(data.html, locale);
  if (!html) return null;
  return (
    <Section>
      <Reveal>
        <div className="rich-text max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }} />
      </Reveal>
    </Section>
  );
}

export function ImageTextBlock({ data, locale }: { data: BlockData["image_text"]; locale: string }) {
  const href = safeWebsiteUrl(data.buttonUrl);
  return (
    <Section>
      <div className={`grid gap-10 lg:grid-cols-2 items-center ${data.imageSide === "start" ? "" : "lg:[&>*:first-child]:order-2"}`}>
        {data.imageUrl ? (
          <Reveal>
            <ContentImage
              src={data.imageUrl}
              alt={pick(data.title, locale)}
              className="w-full rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant object-cover aspect-[4/3]"
              width={960}
              height={720}
            />
          </Reveal>
        ) : (
          <div />
        )}
        <Reveal delay={0.06} className="space-y-5">
          {pick(data.title, locale) && (
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-m3-on-surface leading-tight">
              {pick(data.title, locale)}
            </h2>
          )}
          <p className="text-base sm:text-lg text-m3-on-surface-variant leading-relaxed whitespace-pre-line">
            {pick(data.text, locale)}
          </p>
          {href && pick(data.buttonLabel, locale) && (
            <Link href={href} className="web-button">
              <span>{pick(data.buttonLabel, locale)}</span>
              <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          )}
        </Reveal>
      </div>
    </Section>
  );
}

export function GalleryBlock({ data, locale }: { data: BlockData["gallery"]; locale: string }) {
  if (!data.images.length) return null;
  const columns = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[data.columns];
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <div className={`grid gap-4 ${columns}`}>
        {data.images.map((image, index) => (
          <Reveal key={index} delay={Math.min(index, 6) * 0.04}>
            <figure className="space-y-2">
              <ContentImage
                src={image.url}
                alt={pick(image.caption, locale)}
                className="w-full aspect-[4/3] object-cover rounded-[var(--md-sys-shape-corner-large,16px)] border border-m3-outline-variant"
                width={800}
                height={600}
              />
              {pick(image.caption, locale) && (
                <figcaption className="text-xs text-m3-on-surface-variant">{pick(image.caption, locale)}</figcaption>
              )}
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function VideoBlock({ data, locale }: { data: BlockData["video"]; locale: string }) {
  const source = videoSource(data.url);
  if (!source) return null;
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <Reveal>
        <div className="aspect-video w-full overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-black">
          {source.kind === "iframe" ? (
            <iframe
              src={source.src}
              title={pick(data.title, locale) || "video"}
              className="h-full w-full"
              loading="lazy"
              allow="encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            />
          ) : (
            <video
              src={source.src}
              poster={safeWebsiteUrl(data.posterUrl) || undefined}
              controls
              preload="metadata"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </Reveal>
    </Section>
  );
}

export function CtaBlock({ data, locale }: { data: BlockData["cta"]; locale: string }) {
  const href = safeWebsiteUrl(data.buttonUrl) || `/${locale}/contact`;
  return (
    <Section>
      <Reveal className="rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-secondary-container text-m3-on-secondary-container p-8 sm:p-12 text-center space-y-5">
        <h2 className="text-3xl sm:text-5xl font-display font-bold text-m3-on-secondary-container">
          {pick(data.title, locale)}
        </h2>
        {pick(data.text, locale) && (
          <p className="text-m3-on-secondary-container/85 max-w-2xl mx-auto leading-relaxed">
            {pick(data.text, locale)}
          </p>
        )}
        {pick(data.buttonLabel, locale) && (
          <Link href={href} className="web-button">
            <span>{pick(data.buttonLabel, locale)}</span>
            <ArrowUpRight aria-hidden="true" className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        )}
      </Reveal>
    </Section>
  );
}

export function MapBlock({ data, locale, fallbackUrl }: { data: BlockData["map"]; locale: string; fallbackUrl?: string }) {
  const src = embedSource("google_maps", data.embedUrl || fallbackUrl || "");
  if (!src) return null;
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <Reveal>
        <iframe
          src={src}
          title={pick(data.title, locale) || "map"}
          className="w-full h-[420px] rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Reveal>
    </Section>
  );
}

export function TeamBlock({ data, locale }: { data: BlockData["team"]; locale: string }) {
  if (!data.members.length) return null;
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.members.map((member, index) => (
          <Reveal key={index} delay={Math.min(index, 6) * 0.05} className="space-y-3">
            {member.photoUrl ? (
              <ContentImage
                src={member.photoUrl}
                alt={pick(member.name, locale)}
                className="w-full aspect-square object-cover rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant"
                width={480}
                height={480}
              />
            ) : (
              <div className="w-full aspect-square rounded-[var(--md-sys-shape-corner-extra-large,28px)] bg-m3-surface-container border border-m3-outline-variant" />
            )}
            <div>
              <p className="font-display font-bold text-m3-on-surface">{pick(member.name, locale)}</p>
              <p className="text-sm text-m3-on-surface-variant">{pick(member.role, locale)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function ColumnsBlock({ data, locale }: { data: BlockData["columns"]; locale: string }) {
  if (!data.columns.length) return null;
  const columns = {
    1: "",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[Math.min(4, data.columns.length) as 1 | 2 | 3 | 4];
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <div className={`grid gap-6 ${columns}`}>
        {data.columns.map((column, index) => (
          <Reveal
            key={index}
            delay={index * 0.05}
            className="rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low p-6 space-y-3"
          >
            <h3 className="font-display text-xl font-bold text-m3-on-surface">{pick(column.title, locale)}</h3>
            <p className="text-sm text-m3-on-surface-variant leading-relaxed whitespace-pre-line">
              {pick(column.text, locale)}
            </p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function SpacerBlock({ data }: { data: BlockData["spacer"] }) {
  return <div aria-hidden className={{ sm: "h-8", md: "h-16", lg: "h-28" }[data.size]} />;
}

export function DividerBlock() {
  return (
    <div className="shell" aria-hidden>
      <hr className="border-m3-outline-variant" />
    </div>
  );
}

export function EmbedBlock({ data, locale }: { data: BlockData["embed"]; locale: string }) {
  const src = embedSource(data.preset, data.url);
  if (!src) return null;
  const tall = data.preset === "calendly" || data.preset === "typeform" || data.preset === "instagram";
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <Reveal>
        <iframe
          src={src}
          title={pick(data.title, locale) || data.preset}
          loading="lazy"
          className={`w-full rounded-[var(--md-sys-shape-corner-extra-large,28px)] border border-m3-outline-variant bg-m3-surface-container-low ${tall ? "h-[720px]" : "aspect-video"}`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        />
      </Reveal>
    </Section>
  );
}

export function BlockTitle({ title, locale }: { title?: LocalText; locale: string }) {
  const text = pick(title, locale);
  return text ? (
    <div className="shell pt-12">
      <SectionBadge>{text}</SectionBadge>
    </div>
  ) : null;
}
