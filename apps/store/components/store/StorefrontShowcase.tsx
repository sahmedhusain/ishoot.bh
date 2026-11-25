"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import type { PortfolioCategory, PortfolioItem } from "@platform/database/types";
import { pickText } from "@platform/database/constants/languages";
import { ProductCard } from "../catalog/ProductCard";
import { ContentImage } from "../shared/ContentImage";
import { useStorePreferences } from "../layout/StorePreferencesBar";
import { formatPrice } from "../../lib/site-copy";

export function ProductGallery({
  images,
  title,
  videoUrl,
  discountPct = 0,
  isOutOfStock = false,
  lowStockCount,
  locale,
}: {
  images: string[];
  title: string;
  videoUrl?: string | null;
  discountPct?: number;
  isOutOfStock?: boolean;
  lowStockCount?: number | null;
  locale: string;
}) {
  const ar = locale === "ar";
  const gallery = React.useMemo(
    () => Array.from(new Set(images.filter((src) => Boolean(src && src.trim())))),
    [images],
  );
  const [selected, setSelected] = React.useState(0);
  const activeUrl = gallery[selected] ?? gallery[0] ?? "";

  return (
    <div className="space-y-4" data-testid="pdp-gallery">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-m3-outline-variant bg-m3-surface-container-low">
        {videoUrl && selected === 0 ? (
          <video
            src={videoUrl}
            poster={activeUrl}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : activeUrl ? (
          <ContentImage
            src={activeUrl}
            alt={title}
            width={800}
            height={800}
            className="h-full w-full object-contain p-5"
          />
        ) : null}

        <div className="absolute top-4 start-4 flex flex-col items-start gap-1.5">
          {discountPct > 0 && (
            <span className="rounded-full bg-m3-error px-3 py-1 text-xs font-bold text-white shadow-sm">
              -{discountPct}%
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-full bg-m3-inverse-surface px-3 py-1 text-xs font-semibold text-m3-inverse-on-surface">
              {ar ? "غير متوفر" : "Out of stock"}
            </span>
          )}
          {!isOutOfStock && lowStockCount != null && lowStockCount > 0 && lowStockCount <= 5 && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-black">
              {ar ? `متبقي ${lowStockCount} فقط` : `Only ${lowStockCount} left`}
            </span>
          )}
        </div>

        {gallery.length > 1 && (
          <>
            <button
              type="button"
              aria-label={ar ? "الصورة السابقة" : "Previous image"}
              onClick={() => setSelected((prev) => (prev - 1 + gallery.length) % gallery.length)}
              className="absolute start-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-m3-surface/90 border border-m3-outline-variant grid place-items-center text-m3-on-surface hover:border-m3-primary shadow-sm"
            >
              {ar ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <button
              type="button"
              aria-label={ar ? "الصورة التالية" : "Next image"}
              onClick={() => setSelected((prev) => (prev + 1) % gallery.length)}
              className="absolute end-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-m3-surface/90 border border-m3-outline-variant grid place-items-center text-m3-on-surface hover:border-m3-primary shadow-sm"
            >
              {ar ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex flex-wrap gap-3" role="list">
          {gallery.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              aria-label={`${title} ${idx + 1}`}
              onClick={() => setSelected(idx)}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-m3-surface-container-low transition-all ${
                idx === selected
                  ? "border-m3-primary ring-2 ring-m3-primary/25"
                  : "border-m3-outline-variant hover:border-m3-primary/50"
              }`}
            >
              <ContentImage
                src={url}
                alt={`${title} ${idx + 1}`}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PcMatchmakerBanner({
  locale,
  baseCurrency = "BHD",
  categories = [],
}: {
  locale: string;
  baseCurrency?: string;
  categories?: PortfolioCategory[];
}) {
  const ar = locale === "ar";
  const ArrowIcon = ar ? ArrowLeft : ArrowRight;
  const { region, convertFromBase } = useStorePreferences();
  const displayCurrency = region?.currency || baseCurrency;
  const [goal, setGoal] = React.useState<"essential" | "professional" | "enterprise">("professional");
  const [budget, setBudget] = React.useState(500);

  const goals = [
    {
      id: "essential" as const,
      label: ar ? "الباقة الأساسية" : "Essential",
      sub: ar ? "اختيارات عملية للاستخدام اليومي" : "Core selections tuned for value",
      icon: Package,
    },
    {
      id: "professional" as const,
      label: ar ? "الباقة الاحترافية" : "Professional",
      sub: ar ? "توازن مثالي للأداء والجودة" : "Balanced performance & reliability",
      icon: Layers,
    },
    {
      id: "enterprise" as const,
      label: ar ? "الباقة المتكاملة" : "Complete",
      sub: ar ? "أعلى المواصفات والملحقات الشاملة" : "Full-scale suite & priority support",
      icon: Briefcase,
    },
  ];

  const budgetDisplay = formatPrice(
    displayCurrency !== baseCurrency ? convertFromBase(budget) : budget,
    displayCurrency,
    locale,
  );
  const highlightedCategory = categories[0];

  return (
    <section
      data-testid="home-pc-builder-banner"
      className="rounded-3xl bg-m3-inverse-surface text-m3-inverse-on-surface border border-m3-outline-variant/40 p-6 sm:p-10 overflow-hidden"
    >
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              {ar ? "مُصمم الباقات والاختيارات" : "CUSTOM BUNDLE & PACKAGE FINDER"}
            </span>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              {ar ? "باقة متكاملة مصممة حسب ميزانيتك" : "A complete order package matched to your budget."}
            </h2>
            <p className="text-sm opacity-80 max-w-xl leading-relaxed">
              {ar
                ? "اختر الفئة المناسبة والميزانية المستهدفة لعرض أفضل المنتجات والباقات المتوفرة في المتجر."
                : "Select your tier and target budget to surface curated products and bundles tailored to your requirements."}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {goals.map((g) => {
              const Icon = g.icon;
              const selected = goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGoal(g.id)}
                  className={`rounded-2xl border p-4 text-start transition-all min-h-[88px] ${
                    selected
                      ? "border-m3-primary bg-m3-primary/15 ring-1 ring-m3-primary"
                      : "border-white/15 bg-white/5 hover:border-white/35"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-m3-primary" aria-hidden="true" />
                    {selected && <CheckCircle2 className="w-4 h-4 text-m3-primary" aria-hidden="true" />}
                  </div>
                  <p className="text-sm font-bold">{g.label}</p>
                  <p className="text-[11px] opacity-75">{g.sub}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider opacity-80">
                {ar ? "الميزانية المستهدفة" : "Target Budget"}
              </span>
              <span className="font-display text-base font-bold text-m3-primary" dir="ltr">
                {budgetDisplay}
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={2500}
              step={50}
              aria-label={ar ? "الميزانية" : "Budget"}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[var(--m3-color-primary)] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] opacity-65 font-mono" dir="ltr">
              <span>50 {baseCurrency}</span>
              <span>500 {baseCurrency}</span>
              <span>1500 {baseCurrency}</span>
              <span>2500+ {baseCurrency}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/build-pc?goal=${goal}&budget=${budget}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-m3-primary px-6 py-3 text-sm font-bold text-m3-on-primary hover:brightness-95 transition-all"
            >
              <span>{ar ? "استعراض الباقات المقترحة" : "Explore Matched Packages"}</span>
              <ArrowIcon className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/ready-made-pcs`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              <span>{ar ? "باقات جاهزة للطلب" : "Featured Collections"}</span>
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-m3-secondary-container text-m3-on-secondary-container px-3 py-0.5 text-[11px] font-bold">
                {ar ? "متوافق مع اختيارك" : "CURATED MATCH"}
              </span>
              {highlightedCategory && (
                <span className="text-xs font-mono opacity-80">
                  {pickText(highlightedCategory.name_en, highlightedCategory.name_ar, locale)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-m3-primary/20 grid place-items-center text-m3-primary shrink-0">
                <Package className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  {goal === "essential"
                    ? ar ? "مجموعة القيمة الأساسية" : "Essential Store Package"
                    : goal === "professional"
                      ? ar ? "مجموعة الأعمال والاحتراف" : "Professional Suite Bundle"
                      : ar ? "المجموعة الشاملة المتكاملة" : "Complete Turnkey Package"}
                </p>
                <p className="text-xs opacity-75">
                  {ar
                    ? "تجهيز متكامل ومراجعة كاملة للمخزون والضمان قبل الإرسال."
                    : "Verified availability, regional pricing, and warranty protection included."}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-m3-primary shrink-0" aria-hidden="true" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-sm">
                {ar ? "ضمان الجودة والتوافق" : "Quality & Fulfillment Verified"}
              </p>
              <p className="opacity-75">
                {ar
                  ? "تتم مراجعة كل باقة لضمان الجاهزية والتوصيل السريع."
                  : "Every selection is checked against live warehouse stock and delivery coverage."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductCarouselSection({
  id,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  items,
  locale,
  accentTone = "primary",
}: {
  id: string;
  title: string;
  subtitle?: string;
  viewAllHref: string;
  viewAllLabel: string;
  items: PortfolioItem[];
  locale: string;
  accentTone?: "primary" | "error" | "secondary";
}) {
  const ar = locale === "ar";
  const [offset, setOffset] = React.useState(0);
  const pageSize = 5;
  if (items.length === 0) return null;

  const visible = items.slice(offset, offset + pageSize);
  const canPrev = offset > 0;
  const canNext = offset + pageSize < items.length;
  const barColor =
    accentTone === "error"
      ? "bg-m3-error"
      : accentTone === "secondary"
        ? "bg-m3-secondary"
        : "bg-m3-primary";

  return (
    <section className="space-y-5" data-testid={`carousel-section-${id}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-7 w-1.5 rounded-full ${barColor}`} aria-hidden="true" />
          <div>
            <h2 className="font-display text-2xl font-bold text-m3-on-surface">{title}</h2>
            {subtitle && <p className="text-xs text-m3-on-surface-variant">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > pageSize && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setOffset((o) => Math.max(0, o - pageSize))}
                aria-label={ar ? "السابق" : "Previous products"}
                className="h-11 w-11 rounded-full border border-m3-outline-variant bg-m3-surface-container-low grid place-items-center text-m3-on-surface hover:border-m3-primary disabled:opacity-40"
              >
                {ar ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setOffset((o) => (o + pageSize < items.length ? o + pageSize : o))}
                aria-label={ar ? "التالي" : "Next products"}
                data-testid={`carousel-next-${id}`}
                className="h-11 w-11 rounded-full border border-m3-outline-variant bg-m3-surface-container-low grid place-items-center text-m3-on-surface hover:border-m3-primary disabled:opacity-40"
              >
                {ar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
          <Link
            href={viewAllHref}
            className="inline-flex min-h-11 items-center gap-1 text-xs font-bold uppercase tracking-wider text-m3-primary hover:underline px-2"
          >
            <span>{viewAllLabel}</span>
            {ar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {visible.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function CountdownCampaignBanner({
  locale,
  badge,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  daysRemaining = 9,
}: {
  locale: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  daysRemaining?: number;
}) {
  const ar = locale === "ar";
  const [secondsLeft, setSecondsLeft] = React.useState(daysRemaining * 86400 + 14725);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const mins = Math.floor((secondsLeft % 3600) / 60);
  const secs = secondsLeft % 60;

  const tiles = [
    { label: ar ? "يوم" : "DAYS", value: String(days).padStart(2, "0") },
    { label: ar ? "ساعة" : "HRS", value: String(hours).padStart(2, "0") },
    { label: ar ? "دقيقة" : "MIN", value: String(mins).padStart(2, "0") },
    { label: ar ? "ثانية" : "SEC", value: String(secs).padStart(2, "0") },
  ];

  return (
    <section
      data-testid="countdown-campaign-banner"
      className="rounded-3xl bg-m3-inverse-surface text-m3-inverse-on-surface border border-m3-outline-variant/40 p-6 sm:p-10"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary px-3.5 py-1 text-xs font-bold text-m3-on-primary">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {badge}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            {title}
          </h2>
          <p className="text-sm opacity-80 leading-relaxed">{subtitle}</p>
          <div className="pt-1">
            <Link
              href={ctaHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-m3-primary px-6 py-2.5 text-sm font-bold text-m3-on-primary hover:brightness-95"
            >
              <span>{ctaLabel}</span>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-widest opacity-70">
            {ar ? "ينتهي العرض خلال" : "ENDS IN"}
          </p>
          <div className="flex items-center gap-2.5" dir="ltr">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="min-w-[64px] rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-center"
              >
                <div className="font-mono text-2xl font-bold leading-none">{tile.value}</div>
                <div className="text-[10px] tracking-wider opacity-70 mt-1">{tile.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
