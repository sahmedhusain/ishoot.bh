import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { safeWebsiteUrl } from "@platform/database/website-config";
import { embedSource, videoSource, type BlockData, type LocalText } from "@platform/database/cms/blocks";
import { Reveal } from "../shared/Reveal";
import { ContentImage } from "../shared/ContentImage";
import { SectionBadge } from "../shared/SectionBadge";

// Blocks whose content is written in the page editor. Server components; the website's dark palette and shell.

export const pick = (text: LocalText | undefined, locale: string) => (locale === "ar" ? text?.ar || text?.en : text?.en || text?.ar) ?? "";

function Heading({ title, locale }: { title?: LocalText; locale: string }) {
  const text = pick(title, locale);
  return text ? <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white leading-tight mb-8">{text}</h2> : null;
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative py-16 sm:py-20 border-t border-white/10 ${className}`}>
      <div className="shell">{children}</div>
    </section>
  );
}

/** Sanitized HTML from the article and rich-text editor (rendered and cleaned when it was saved). */
export function RichTextBlock({ data, locale }: { data: BlockData["rich_text"]; locale: string }) {
  const html = pick(data.html, locale);
  if (!html) return null;
  return (
    <Section>
      <Reveal>
        <div className="rich-text max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
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
            <ContentImage src={data.imageUrl} alt={pick(data.title, locale)} className="w-full rounded-3xl object-cover aspect-[4/3]" width={960} height={720} />
          </Reveal>
        ) : (
          <div />
        )}
        <Reveal delay={0.06} className="space-y-5">
          {pick(data.title, locale) && <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">{pick(data.title, locale)}</h2>}
          <p className="text-base sm:text-lg text-ink-muted leading-relaxed whitespace-pre-line">{pick(data.text, locale)}</p>
          {href && pick(data.buttonLabel, locale) && (
            <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white border border-accent/40 hover:bg-primary/85 transition-colors">
              {pick(data.buttonLabel, locale)}
              <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
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
              <ContentImage src={image.url} alt={pick(image.caption, locale)} className="w-full aspect-[4/3] object-cover rounded-2xl" width={800} height={600} />
              {pick(image.caption, locale) && <figcaption className="text-xs text-ink-muted">{pick(image.caption, locale)}</figcaption>}
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
        <div className="aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black">
          {source.kind === "iframe" ? (
            <iframe src={source.src} title={pick(data.title, locale) || "video"} className="h-full w-full" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
          ) : (
            <video src={source.src} poster={safeWebsiteUrl(data.posterUrl) || undefined} controls preload="metadata" className="h-full w-full object-cover" />
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
      <Reveal className="rounded-3xl border border-accent/30 bg-gradient-to-br from-primary/40 to-brand-surface p-8 sm:p-12 text-center space-y-5">
        <h2 className="text-3xl sm:text-5xl font-display font-bold text-white">{pick(data.title, locale)}</h2>
        {pick(data.text, locale) && <p className="text-ink-muted max-w-2xl mx-auto leading-relaxed">{pick(data.text, locale)}</p>}
        {pick(data.buttonLabel, locale) && (
          <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity">
            {pick(data.buttonLabel, locale)}
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
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
        <iframe src={src} title={pick(data.title, locale) || "map"} className="w-full h-[420px] rounded-3xl border border-white/10" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
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
            {member.photoUrl ? <ContentImage src={member.photoUrl} alt={pick(member.name, locale)} className="w-full aspect-square object-cover rounded-3xl" width={480} height={480} /> : <div className="w-full aspect-square rounded-3xl bg-white/5" />}
            <div>
              <p className="font-display font-bold text-white">{pick(member.name, locale)}</p>
              <p className="text-sm text-ink-muted">{pick(member.role, locale)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export function ColumnsBlock({ data, locale }: { data: BlockData["columns"]; locale: string }) {
  if (!data.columns.length) return null;
  const columns = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[Math.min(4, data.columns.length) as 1 | 2 | 3 | 4];
  return (
    <Section>
      <Heading title={data.title} locale={locale} />
      <div className={`grid gap-6 ${columns}`}>
        {data.columns.map((column, index) => (
          <Reveal key={index} delay={index * 0.05} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
            <h3 className="font-display text-xl font-bold text-white">{pick(column.title, locale)}</h3>
            <p className="text-sm text-ink-muted leading-relaxed whitespace-pre-line">{pick(column.text, locale)}</p>
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
      <hr className="border-white/10" />
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
          className={`w-full rounded-3xl border border-white/10 bg-white ${tall ? "h-[720px]" : "aspect-video"}`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        />
      </Reveal>
    </Section>
  );
}

/** A small heading over a data block (catalogue, services…) when the editor gave it one. */
export function BlockTitle({ title, locale }: { title?: LocalText; locale: string }) {
  const text = pick(title, locale);
  return text ? (
    <div className="shell pt-12">
      <SectionBadge>{text}</SectionBadge>
    </div>
  ) : null;
}
