"use client";

import { formatMessage } from "@platform/locales";
import {
  ArrowRightLeft,
  Bookmark,
  Briefcase,
  Calculator,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudSun,
  Compass,
  Droplets,
  ExternalLink,
  FileText,
  FolderArchive,
  Globe,
  Hourglass,
  Moon,
  Pause,
  Play,
  Plus,
  Quote,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  StickyNote,
  Sun,
  Timer,
  Trash2,
  UserCheck,
  Wind,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { ROUTES } from "../../constants/routes";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import type { DashboardData } from "../../lib/dashboard-widgets";

export type WidgetSettingValue = string | number | boolean;
export type WidgetSettingsMap = Record<string, unknown>;

export interface LifestyleWidgetProps {
  data: DashboardData;
  settings?: WidgetSettingsMap;
  onUpdateSettings?: (patch: Record<string, WidgetSettingValue>) => void;
}

export interface WorldClockCityDef {
  key: string;
  cityKey: string;
  countryCode: string;
  tz: string;
  utcOffsetLabel: string;
  utcOffsetHours: number;
  flag: string;
}

export const WORLD_CLOCK_CITIES: readonly WorldClockCityDef[] = [
  {
    key: "manama",
    cityKey: "manama",
    countryCode: "bh",
    tz: "Asia/Bahrain",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇧🇭",
  },
  {
    key: "riyadh",
    cityKey: "riyadh",
    countryCode: "sa",
    tz: "Asia/Riyadh",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇸🇦",
  },
  {
    key: "dubai",
    cityKey: "dubai",
    countryCode: "ae",
    tz: "Asia/Dubai",
    utcOffsetLabel: "+4",
    utcOffsetHours: 4,
    flag: "🇦🇪",
  },
  {
    key: "doha",
    cityKey: "doha",
    countryCode: "qa",
    tz: "Asia/Qatar",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇶🇦",
  },
  {
    key: "kuwait",
    cityKey: "kuwait",
    countryCode: "kw",
    tz: "Asia/Kuwait",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇰🇼",
  },
  {
    key: "muscat",
    cityKey: "muscat",
    countryCode: "om",
    tz: "Asia/Muscat",
    utcOffsetLabel: "+4",
    utcOffsetHours: 4,
    flag: "🇴🇲",
  },
  {
    key: "cairo",
    cityKey: "cairo",
    countryCode: "eg",
    tz: "Africa/Cairo",
    utcOffsetLabel: "+2",
    utcOffsetHours: 2,
    flag: "🇪🇬",
  },
  {
    key: "amman",
    cityKey: "amman",
    countryCode: "jo",
    tz: "Asia/Amman",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇯🇴",
  },
  {
    key: "istanbul",
    cityKey: "istanbul",
    countryCode: "tr",
    tz: "Europe/Istanbul",
    utcOffsetLabel: "+3",
    utcOffsetHours: 3,
    flag: "🇹🇷",
  },
  {
    key: "london",
    cityKey: "london",
    countryCode: "gb",
    tz: "Europe/London",
    utcOffsetLabel: "+0",
    utcOffsetHours: 0,
    flag: "🇬🇧",
  },
  {
    key: "paris",
    cityKey: "paris",
    countryCode: "fr",
    tz: "Europe/Paris",
    utcOffsetLabel: "+1",
    utcOffsetHours: 1,
    flag: "🇫🇷",
  },
  {
    key: "frankfurt",
    cityKey: "frankfurt",
    countryCode: "de",
    tz: "Europe/Berlin",
    utcOffsetLabel: "+1",
    utcOffsetHours: 1,
    flag: "🇩🇪",
  },
  {
    key: "mumbai",
    cityKey: "mumbai",
    countryCode: "in",
    tz: "Asia/Kolkata",
    utcOffsetLabel: "+5:30",
    utcOffsetHours: 5.5,
    flag: "🇮🇳",
  },
  {
    key: "singapore",
    cityKey: "singapore",
    countryCode: "sg",
    tz: "Asia/Singapore",
    utcOffsetLabel: "+8",
    utcOffsetHours: 8,
    flag: "🇸🇬",
  },
  {
    key: "tokyo",
    cityKey: "tokyo",
    countryCode: "jp",
    tz: "Asia/Tokyo",
    utcOffsetLabel: "+9",
    utcOffsetHours: 9,
    flag: "🇯🇵",
  },
  {
    key: "sydney",
    cityKey: "sydney",
    countryCode: "au",
    tz: "Australia/Sydney",
    utcOffsetLabel: "+10",
    utcOffsetHours: 10,
    flag: "🇦🇺",
  },
  {
    key: "newyork",
    cityKey: "newyork",
    countryCode: "us",
    tz: "America/New_York",
    utcOffsetLabel: "-5",
    utcOffsetHours: -5,
    flag: "🇺🇸",
  },
  {
    key: "losangeles",
    cityKey: "losangeles",
    countryCode: "us",
    tz: "America/Los_Angeles",
    utcOffsetLabel: "-8",
    utcOffsetHours: -8,
    flag: "🇺🇸",
  },
];

export interface WeatherCityPreset {
  key: string;
  countryCode: string;
  temp: number;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  condition: "clear" | "partly_cloudy" | "humid" | "breezy";
  forecast: readonly {
    dayOffset: number;
    high: number;
    low: number;
    condition: "clear" | "partly_cloudy" | "breezy";
  }[];
}

export const WEATHER_CITY_PRESETS: Record<string, WeatherCityPreset> = {
  manama: {
    key: "manama",
    countryCode: "bh",
    temp: 29,
    high: 32,
    low: 24,
    humidity: 54,
    wind: 16,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 33, low: 25, condition: "clear" },
      { dayOffset: 2, high: 31, low: 24, condition: "breezy" },
      { dayOffset: 3, high: 30, low: 23, condition: "partly_cloudy" },
    ],
  },
  muharraq: {
    key: "muharraq",
    countryCode: "bh",
    temp: 28,
    high: 31,
    low: 24,
    humidity: 58,
    wind: 18,
    condition: "breezy",
    forecast: [
      { dayOffset: 1, high: 32, low: 24, condition: "breezy" },
      { dayOffset: 2, high: 30, low: 23, condition: "clear" },
      { dayOffset: 3, high: 29, low: 23, condition: "partly_cloudy" },
    ],
  },
  riffa: {
    key: "riffa",
    countryCode: "bh",
    temp: 30,
    high: 33,
    low: 24,
    humidity: 48,
    wind: 14,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 34, low: 25, condition: "clear" },
      { dayOffset: 2, high: 32, low: 24, condition: "clear" },
      { dayOffset: 3, high: 31, low: 23, condition: "breezy" },
    ],
  },
  riyadh: {
    key: "riyadh",
    countryCode: "sa",
    temp: 31,
    high: 35,
    low: 21,
    humidity: 22,
    wind: 14,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 36, low: 22, condition: "clear" },
      { dayOffset: 2, high: 34, low: 20, condition: "clear" },
      { dayOffset: 3, high: 33, low: 19, condition: "partly_cloudy" },
    ],
  },
  jeddah: {
    key: "jeddah",
    countryCode: "sa",
    temp: 32,
    high: 35,
    low: 26,
    humidity: 64,
    wind: 15,
    condition: "humid",
    forecast: [
      { dayOffset: 1, high: 35, low: 26, condition: "clear" },
      { dayOffset: 2, high: 34, low: 25, condition: "partly_cloudy" },
      { dayOffset: 3, high: 33, low: 25, condition: "breezy" },
    ],
  },
  khobar: {
    key: "khobar",
    countryCode: "sa",
    temp: 29,
    high: 33,
    low: 23,
    humidity: 52,
    wind: 17,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 33, low: 24, condition: "clear" },
      { dayOffset: 2, high: 31, low: 23, condition: "breezy" },
      { dayOffset: 3, high: 30, low: 22, condition: "partly_cloudy" },
    ],
  },
  dubai: {
    key: "dubai",
    countryCode: "ae",
    temp: 30,
    high: 34,
    low: 25,
    humidity: 58,
    wind: 18,
    condition: "partly_cloudy",
    forecast: [
      { dayOffset: 1, high: 34, low: 26, condition: "clear" },
      { dayOffset: 2, high: 33, low: 25, condition: "partly_cloudy" },
      { dayOffset: 3, high: 32, low: 24, condition: "breezy" },
    ],
  },
  abudhabi: {
    key: "abudhabi",
    countryCode: "ae",
    temp: 31,
    high: 35,
    low: 25,
    humidity: 55,
    wind: 16,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 35, low: 26, condition: "clear" },
      { dayOffset: 2, high: 34, low: 25, condition: "breezy" },
      { dayOffset: 3, high: 32, low: 24, condition: "partly_cloudy" },
    ],
  },
  doha: {
    key: "doha",
    countryCode: "qa",
    temp: 30,
    high: 34,
    low: 25,
    humidity: 56,
    wind: 15,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 34, low: 25, condition: "clear" },
      { dayOffset: 2, high: 33, low: 24, condition: "breezy" },
      { dayOffset: 3, high: 31, low: 24, condition: "partly_cloudy" },
    ],
  },
  kuwait: {
    key: "kuwait",
    countryCode: "kw",
    temp: 28,
    high: 32,
    low: 22,
    humidity: 35,
    wind: 20,
    condition: "breezy",
    forecast: [
      { dayOffset: 1, high: 31, low: 21, condition: "breezy" },
      { dayOffset: 2, high: 30, low: 20, condition: "clear" },
      { dayOffset: 3, high: 29, low: 19, condition: "clear" },
    ],
  },
  muscat: {
    key: "muscat",
    countryCode: "om",
    temp: 29,
    high: 33,
    low: 24,
    humidity: 60,
    wind: 12,
    condition: "humid",
    forecast: [
      { dayOffset: 1, high: 33, low: 25, condition: "partly_cloudy" },
      { dayOffset: 2, high: 32, low: 24, condition: "clear" },
      { dayOffset: 3, high: 31, low: 24, condition: "breezy" },
    ],
  },
  cairo: {
    key: "cairo",
    countryCode: "eg",
    temp: 26,
    high: 29,
    low: 19,
    humidity: 46,
    wind: 15,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 30, low: 20, condition: "clear" },
      { dayOffset: 2, high: 28, low: 19, condition: "partly_cloudy" },
      { dayOffset: 3, high: 27, low: 18, condition: "breezy" },
    ],
  },
  amman: {
    key: "amman",
    countryCode: "jo",
    temp: 22,
    high: 25,
    low: 14,
    humidity: 42,
    wind: 14,
    condition: "breezy",
    forecast: [
      { dayOffset: 1, high: 26, low: 15, condition: "clear" },
      { dayOffset: 2, high: 24, low: 13, condition: "partly_cloudy" },
      { dayOffset: 3, high: 23, low: 13, condition: "breezy" },
    ],
  },
  london: {
    key: "london",
    countryCode: "gb",
    temp: 16,
    high: 19,
    low: 11,
    humidity: 72,
    wind: 19,
    condition: "partly_cloudy",
    forecast: [
      { dayOffset: 1, high: 18, low: 10, condition: "partly_cloudy" },
      { dayOffset: 2, high: 17, low: 9, condition: "breezy" },
      { dayOffset: 3, high: 20, low: 11, condition: "clear" },
    ],
  },
  newyork: {
    key: "newyork",
    countryCode: "us",
    temp: 19,
    high: 22,
    low: 13,
    humidity: 58,
    wind: 16,
    condition: "clear",
    forecast: [
      { dayOffset: 1, high: 23, low: 14, condition: "clear" },
      { dayOffset: 2, high: 21, low: 12, condition: "partly_cloudy" },
      { dayOffset: 3, high: 20, low: 11, condition: "breezy" },
    ],
  },
  tokyo: {
    key: "tokyo",
    countryCode: "jp",
    temp: 21,
    high: 24,
    low: 16,
    humidity: 62,
    wind: 13,
    condition: "partly_cloudy",
    forecast: [
      { dayOffset: 1, high: 25, low: 16, condition: "clear" },
      { dayOffset: 2, high: 23, low: 15, condition: "partly_cloudy" },
      { dayOffset: 3, high: 22, low: 14, condition: "breezy" },
    ],
  },
};

export const WEATHER_CITIES_BY_COUNTRY: Record<string, string[]> = {
  bh: ["manama", "muharraq", "riffa"],
  sa: ["riyadh", "jeddah", "khobar"],
  ae: ["dubai", "abudhabi"],
  qa: ["doha"],
  kw: ["kuwait"],
  om: ["muscat"],
  eg: ["cairo"],
  jo: ["amman"],
  gb: ["london"],
  us: ["newyork"],
  jp: ["tokyo"],
};

function formatHijriDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const tag =
      locale === "ar"
        ? "ar-SA-u-ca-islamic-umalqura-nu-latn"
        : "en-US-u-ca-islamic-umalqura-nu-latn";
    return new Intl.DateTimeFormat(
      tag,
      options ?? {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(date);
  } catch {
    return "";
  }
}

function formatGregorianDate(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const tag = locale === "ar" ? "ar-BH-u-nu-latn" : "en-US";
  return new Intl.DateTimeFormat(
    tag,
    options ?? {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

/**
 * Generates an SVG path for a Google Pixel / Material 3 Expressive scalloped "cookie" shape.
 */
function scallopedCookiePath(
  cx: number,
  cy: number,
  baseRadius: number,
  waveAmp: number,
  lobes = 12,
  steps = 144,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = baseRadius + waveAmp * Math.cos(lobes * theta);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${pts.join(" ")} Z`;
}

const PIXEL_CLOCK_SCALLOP_PATH = scallopedCookiePath(100, 100, 86, 6.5, 12, 160);
const PIXEL_BADGE_SCALLOP_PATH = scallopedCookiePath(24, 24, 20, 2.2, 10, 100);

function widgetContainerProps(settings?: WidgetSettingsMap) {
  const theme =
    typeof settings?.theme === "string" ? settings.theme : "default";
  const surface =
    typeof settings?.surface === "string" ? settings.surface : "tonal";
  return {
    "data-widget-theme": theme,
    "data-widget-surface": surface,
  };
}

/**
 * 1. Welcome & Identity Profile Card (`welcome_profile`)
 */
export function WelcomeProfileWidget({
  data,
  settings,
  onUpdateSettings,
}: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;
  const profile = data.userProfile;

  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12
      ? b.greetingMorning
      : hour < 18
        ? b.greetingAfternoon
        : b.greetingEvening;

  const displayName = profile?.fullName || "";

  const departmentLabel =
    locale === "ar"
      ? profile?.departmentNameAr || profile?.departmentNameEn || ""
      : profile?.departmentNameEn || profile?.departmentNameAr || "";

  const designationLabel =
    locale === "ar"
      ? profile?.jobTitleAr || profile?.jobTitleEn || ""
      : profile?.jobTitleEn || profile?.jobTitleAr || "";

  const roleLabel = profile?.role
    ? ((t.roles as Record<string, string>)[profile.role] ?? profile.role)
    : "";

  const showHijri = settings?.showHijri !== false;
  const showFocus = settings?.showFocus !== false;

  const statusNote =
    typeof settings?.statusNote === "string" ? settings.statusNote : "";
  const [draftNote, setDraftNote] = React.useState(statusNote);
  React.useEffect(() => {
    setDraftNote(statusNote);
  }, [statusNote]);

  const gregorian = formatGregorianDate(now, locale);
  const hijri = formatHijriDate(now, locale);

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-4 relative overflow-hidden bg-gradient-to-br from-primary/12 via-surface-container to-accent/10"
    >
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="min-w-0 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/80 text-on-secondary-container px-3 py-1 text-[11px] font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>{greeting}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
            <bdi dir="auto">{displayName || t.roles.admin}</bdi>
          </h2>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {designationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary dark:text-mint px-2.5 py-0.5 text-[11px] font-semibold">
                <UserCheck className="w-3 h-3" aria-hidden="true" />
                <bdi dir="auto">{designationLabel}</bdi>
              </span>
            ) : null}
            {departmentLabel ? (
              <span className="inline-flex items-center rounded-full bg-surface-container-highest/90 border border-outline-variant/60 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                <bdi dir="auto">{departmentLabel}</bdi>
              </span>
            ) : null}
            {roleLabel && !designationLabel ? (
              <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-2.5 py-0.5 text-[11px] font-semibold">
                <bdi dir="auto">{roleLabel}</bdi>
              </span>
            ) : null}
          </div>
        </div>

        <Link
          href={ROUTES.profile()}
          data-keep-round="true"
          className="relative w-12 h-12 shrink-0 flex items-center justify-center text-primary font-extrabold text-base hover:scale-105 transition-transform"
          title={b.widgets.welcome_profile}
        >
          <svg
            viewBox="0 0 48 48"
            className="absolute inset-0 w-full h-full fill-primary/15 stroke-primary/35"
            aria-hidden="true"
          >
            <path d={PIXEL_BADGE_SCALLOP_PATH} strokeWidth="1.5" />
          </svg>
          <span className="relative z-10">
            {(displayName || "U").slice(0, 1).toUpperCase()}
          </span>
        </Link>
      </div>

      <div className="space-y-2.5 pt-2 border-t border-outline-variant/50 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink bg-surface-container-highest/70 rounded-full px-3 py-1">
            <CalendarIcon
              className="w-3.5 h-3.5 text-primary"
              aria-hidden="true"
            />
            <bdi dir="auto">{gregorian}</bdi>
          </span>
          {showHijri && hijri ? (
            <span className="text-[11px] font-medium text-ink-muted bg-surface-container-low/80 rounded-full px-2.5 py-1 border border-outline-variant/40">
              <bdi dir="auto">{hijri}</bdi>
            </span>
          ) : null}
        </div>

        {showFocus ? (
          <div className="relative">
            <input
              type="text"
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              onBlur={() => {
                if (draftNote !== statusNote) {
                  onUpdateSettings?.({ statusNote: draftNote });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              placeholder={b.statusNotePlaceholder}
              aria-label={b.statusNoteLabel}
              className="w-full h-9 rounded-full bg-surface-container-lowest/90 border border-outline-variant/70 px-3.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * 2. Dedicated Local Clock Widget (`clock_local`)
 * Pure Google Pixel Clock widget. All controls (Analog Scalloped / Analog Circle / Digital Stacked / Digital Pill,
 * 12h/24h, Show Seconds, Show Date, Show Dial Numbers, Timezone Override) live exclusively in Widget Settings.
 */
export function LocalClockWidget({ settings }: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;

  const clockStyle =
    typeof settings?.clockStyle === "string"
      ? settings.clockStyle
      : "scalloped";
  const use24h = settings?.format24h === true;
  const showSeconds = settings?.showSeconds !== false;
  const showDate = settings?.showDate !== false;
  const showNumbers = settings?.showNumbers !== false;
  const timezoneCityKey =
    typeof settings?.timezoneCity === "string" ? settings.timezoneCity : "manama";

  const cityDef =
    WORLD_CLOCK_CITIES.find((c) => c.key === timezoneCityKey) ??
    WORLD_CLOCK_CITIES[0];

  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute hours/minutes/seconds in the selected timezone
  const parts = React.useMemo(() => {
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: cityDef.tz,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      });
      const p = dtf.formatToParts(now);
      const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24;
      const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
      const s = Number(p.find((x) => x.type === "second")?.value ?? 0);
      return { h, m, s };
    } catch {
      return {
        h: now.getHours(),
        m: now.getMinutes(),
        s: now.getSeconds(),
      };
    }
  }, [now, cityDef.tz]);

  const seconds = parts.s;
  const minutes = parts.m + seconds / 60;
  const hours = (parts.h % 12) + minutes / 60;

  const secDeg = seconds * 6;
  const minDeg = minutes * 6;
  const hourDeg = hours * 30;

  const rawH = parts.h;
  const displayH = use24h ? rawH : rawH % 12 || 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  const period = rawH >= 12 ? b.periodPm : b.periodAm;

  const isAnalog = clockStyle === "scalloped" || clockStyle === "analog";
  const cityLabel =
    (b.cities as Record<string, string>)[cityDef.cityKey] ?? cityDef.cityKey;

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
    >
      {isAnalog ? (
        <div
          data-keep-round="true"
          className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center select-none"
        >
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-xs"
            aria-hidden="true"
          >
            {clockStyle === "scalloped" ? (
              <path
                d={PIXEL_CLOCK_SCALLOP_PATH}
                className="fill-secondary-container/85 dark:fill-surface-container-highest stroke-primary/25"
                strokeWidth="2"
              />
            ) : (
              <circle
                cx="100"
                cy="100"
                r="88"
                className="fill-secondary-container/85 dark:fill-surface-container-highest stroke-primary/25"
                strokeWidth="2.5"
              />
            )}

            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const isQuarter = i % 3 === 0;
              const r1 = isQuarter ? 66 : 70;
              const r2 = 75;
              const x1 = 100 + r1 * Math.sin(angle);
              const y1 = 100 - r1 * Math.cos(angle);
              const x2 = 100 + r2 * Math.sin(angle);
              const y2 = 100 - r2 * Math.cos(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth={isQuarter ? "3" : "1.75"}
                  strokeLinecap="round"
                  className={isQuarter ? "text-primary" : "text-ink-muted/45"}
                />
              );
            })}

            {showNumbers ? (
              <>
                <text
                  x="100"
                  y="44"
                  textAnchor="middle"
                  className="fill-ink font-extrabold text-[11px]"
                >
                  12
                </text>
                <text
                  x="158"
                  y="104"
                  textAnchor="middle"
                  className="fill-ink font-extrabold text-[11px]"
                >
                  3
                </text>
                <text
                  x="100"
                  y="162"
                  textAnchor="middle"
                  className="fill-ink font-extrabold text-[11px]"
                >
                  6
                </text>
                <text
                  x="42"
                  y="104"
                  textAnchor="middle"
                  className="fill-ink font-extrabold text-[11px]"
                >
                  9
                </text>
              </>
            ) : null}

            {/* Hour hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 42 * Math.sin((hourDeg * Math.PI) / 180)}
              y2={100 - 42 * Math.cos((hourDeg * Math.PI) / 180)}
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              className="text-ink"
            />
            {/* Minute hand */}
            <line
              x1="100"
              y1="100"
              x2={100 + 60 * Math.sin((minDeg * Math.PI) / 180)}
              y2={100 - 60 * Math.cos((minDeg * Math.PI) / 180)}
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-primary"
            />
            {/* Sweeping Second hand */}
            {showSeconds ? (
              <>
                <line
                  x1={100 - 12 * Math.sin((secDeg * Math.PI) / 180)}
                  y1={100 + 12 * Math.cos((secDeg * Math.PI) / 180)}
                  x2={100 + 66 * Math.sin((secDeg * Math.PI) / 180)}
                  y2={100 - 66 * Math.cos((secDeg * Math.PI) / 180)}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="text-accent"
                />
                <circle
                  cx={100 + 54 * Math.sin((secDeg * Math.PI) / 180)}
                  cy={100 - 54 * Math.cos((secDeg * Math.PI) / 180)}
                  r="4"
                  className="fill-accent"
                />
              </>
            ) : null}
            <circle cx="100" cy="100" r="5.5" className="fill-primary" />
            <circle
              cx="100"
              cy="100"
              r="2.2"
              className="fill-surface-container-lowest"
            />
          </svg>
        </div>
      ) : clockStyle === "digital_stacked" ? (
        <div className="flex items-center justify-center gap-4 py-1">
          <div
            dir="ltr"
            className="flex flex-col items-center justify-center rounded-[24px] bg-secondary-container/75 px-6 py-3 border border-primary/20 shadow-xs"
          >
            <span className="text-4xl sm:text-5xl font-black tracking-tighter text-primary tabular-nums leading-[0.9]">
              {pad(displayH)}
            </span>
            <span className="text-4xl sm:text-5xl font-black tracking-tighter text-ink tabular-nums leading-[0.9] mt-1">
              {pad(parts.m)}
            </span>
          </div>
          <div className="space-y-1.5 text-start">
            {!use24h ? (
              <span className="inline-flex rounded-full bg-primary text-on-primary px-2.5 py-0.5 text-[11px] font-bold">
                {period}
              </span>
            ) : null}
            {showSeconds ? (
              <div
                dir="ltr"
                className="text-sm font-bold text-ink-muted tabular-nums"
              >
                :{pad(seconds)}
              </div>
            ) : null}
            {showDate ? (
              <div className="text-xs font-semibold text-ink">
                {formatGregorianDate(now, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-2 py-2 w-full">
          <div
            dir="ltr"
            className="inline-flex items-baseline justify-center gap-1.5 rounded-full bg-secondary-container/70 px-6 py-3 font-extrabold tracking-tight text-ink tabular-nums border border-primary/15"
          >
            <span className="text-3xl sm:text-4xl">
              {pad(displayH)}:{pad(parts.m)}
            </span>
            {showSeconds ? (
              <span className="text-base text-primary font-bold">
                :{pad(seconds)}
              </span>
            ) : null}
            {!use24h ? (
              <span className="text-xs font-bold text-primary uppercase ms-1">
                {period}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {showDate && clockStyle !== "digital_stacked" ? (
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-ink-muted">
          <span>{cityLabel}</span>
          <span>·</span>
          <span>
            {formatGregorianDate(now, locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      ) : null}
    </section>
  );
}

/**
 * 3. Dedicated World Clocks Widget (`clock_world`)
 * Displays multiple global countries/cities with Country Flag, City & Country Name, UTC offset (e.g. UTC+3),
 * relative hour difference, and Day/Night icon. All city/country selection & options are in Widget Settings.
 */
export function ClockWorldWidget({ settings }: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;

  const use24h = settings?.format24h === true;
  const showSeconds = settings?.showSeconds === true;
  const showUtc = settings?.showUtc !== false;
  const showRelative = settings?.showRelative !== false;
  const showFlags = settings?.showFlags !== false;
  const layoutMode =
    typeof settings?.worldLayout === "string" ? settings.worldLayout : "grid";

  const selectedZoneKeys = React.useMemo(() => {
    const raw =
      typeof settings?.zones === "string"
        ? settings.zones
        : "manama,riyadh,dubai,london";
    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return keys.length > 0 ? keys : ["manama", "riyadh", "dubai", "london"];
  }, [settings?.zones]);

  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      showSeconds ? 1000 : 15000,
    );
    return () => clearInterval(timer);
  }, [showSeconds]);

  const localOffsetHours = React.useMemo(
    () => -now.getTimezoneOffset() / 60,
    [now],
  );

  const citiesToDisplay = React.useMemo(
    () =>
      selectedZoneKeys
        .map((k) => WORLD_CLOCK_CITIES.find((c) => c.key === k))
        .filter((c): c is WorldClockCityDef => Boolean(c)),
    [selectedZoneKeys],
  );

  const formatZoneTime = (tz: string) => {
    try {
      const tag = locale === "ar" ? "ar-BH-u-nu-latn" : "en-US";
      return new Intl.DateTimeFormat(tag, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        ...(showSeconds ? { second: "2-digit" } : {}),
        hour12: !use24h,
      }).format(now);
    } catch {
      return "--:--";
    }
  };

  const isDaytimeInZone = (tz: string): boolean => {
    try {
      const hourStr = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).format(now);
      const h = Number(hourStr) % 24;
      return h >= 6 && h < 19;
    } catch {
      return true;
    }
  };

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3 relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-extrabold tracking-tight text-ink truncate">
            {b.widgets.clock_world}
          </h3>
        </div>
        <span
          dir="ltr"
          className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full"
        >
          {use24h ? b.clock24h : b.clock12h}
        </span>
      </div>

      <div
        className={
          layoutMode === "list"
            ? "flex flex-col gap-2 my-auto"
            : "grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-auto"
        }
      >
        {citiesToDisplay.map((z) => {
          const cityLabel =
            (b.cities as Record<string, string>)[z.cityKey] ?? z.cityKey;
          const countryLabel =
            (b.countries as Record<string, string>)[z.countryCode] ??
            z.countryCode;
          const diffHours = z.utcOffsetHours - localOffsetHours;
          const relativeLabel =
            diffHours === 0
              ? b.relativeHoursSame
              : diffHours > 0
                ? formatMessage(b.relativeHoursAhead, { h: diffHours })
                : formatMessage(b.relativeHoursBehind, { h: diffHours });
          const isDay = isDaytimeInZone(z.tz);

          return (
            <div
              key={z.key}
              className="rounded-2xl bg-surface-container-highest/75 border border-outline-variant/45 px-3.5 py-2.5 flex items-center justify-between gap-2.5"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {showFlags ? (
                    <span className="text-sm shrink-0" aria-hidden="true">
                      {z.flag}
                    </span>
                  ) : null}
                  <span className="text-xs font-extrabold text-ink truncate">
                    {cityLabel}
                  </span>
                  {isDay ? (
                    <Sun
                      className="w-3 h-3 text-amber-500 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Moon
                      className="w-3 h-3 text-sky-400 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-ink-muted">
                  <span className="truncate">{countryLabel}</span>
                  {showUtc ? (
                    <span
                      dir="ltr"
                      className="inline-flex items-center rounded-md bg-primary/12 text-primary px-1.5 py-0.2 font-bold tabular-nums"
                    >
                      {formatMessage(b.utcOffsetBadge, {
                        offset: z.utcOffsetLabel,
                      })}
                    </span>
                  ) : null}
                  {showRelative ? (
                    <span className="text-[10px] text-ink-muted/80 font-medium">
                      <bdi dir="auto">{relativeLabel}</bdi>
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                dir="ltr"
                className="text-sm sm:text-base font-black text-ink tabular-nums shrink-0"
              >
                {formatZoneTime(z.tz)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 4. Google Pixel M3 Weather & Forecast Widget (`weather_local`)
 * Country & City selection live exclusively in Widget Settings (no dropdown on the widget face).
 */
export function WeatherLocalWidget({ settings }: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;

  const cityKey =
    typeof settings?.city === "string" && settings.city in WEATHER_CITY_PRESETS
      ? settings.city
      : "manama";
  const city = WEATHER_CITY_PRESETS[cityKey] ?? WEATHER_CITY_PRESETS.manama;
  const useFahrenheit = settings?.unit === "F";
  const showForecast = settings?.showForecast !== false;
  const showMetrics = settings?.showMetrics !== false;

  const toUnit = (c: number) => (useFahrenheit ? Math.round((c * 9) / 5 + 32) : c);

  const cityLabel =
    (b.cities as Record<string, string>)[city.key] ?? city.key;
  const countryLabel =
    (b.countries as Record<string, string>)[city.countryCode] ??
    city.countryCode;

  const conditionLabel =
    city.condition === "clear"
      ? b.weatherClear
      : city.condition === "partly_cloudy"
        ? b.weatherPartlyCloudy
        : city.condition === "humid"
          ? b.weatherHumid
          : b.weatherBreezy;

  const ConditionIcon =
    city.condition === "clear"
      ? Sun
      : city.condition === "partly_cloudy"
        ? CloudSun
        : city.condition === "humid"
          ? Cloud
          : Wind;

  const now = React.useMemo(() => new Date(), []);

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3 relative overflow-hidden bg-gradient-to-br from-sky-500/12 via-surface-container to-amber-500/10"
    >
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest/80 border border-outline-variant/50 px-3 py-1 text-xs font-bold text-ink truncate">
          <Compass className="w-3.5 h-3.5 text-sky-500 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {cityLabel} · {countryLabel}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-ink-muted truncate">
          {conditionLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 my-auto py-1 relative z-10">
        <div>
          <div
            dir="ltr"
            className="text-4xl sm:text-5xl font-black tracking-tighter text-ink tabular-nums leading-none"
          >
            {formatMessage(useFahrenheit ? b.weatherTempF : b.weatherTempC, {
              temp: toUnit(city.temp),
            })}
          </div>
          <div className="text-[11px] font-semibold text-ink-muted mt-1.5">
            <bdi dir="ltr">
              {formatMessage(b.weatherHighLow, {
                high: toUnit(city.high),
                low: toUnit(city.low),
              })}
            </bdi>
          </div>
        </div>

        <div
          data-keep-round="true"
          className="relative w-16 h-16 flex items-center justify-center shrink-0"
        >
          <svg
            viewBox="0 0 48 48"
            className="absolute inset-0 w-full h-full fill-amber-500/18 stroke-amber-500/35"
            aria-hidden="true"
          >
            <path d={PIXEL_BADGE_SCALLOP_PATH} strokeWidth="1.5" />
          </svg>
          <ConditionIcon
            className="w-8 h-8 text-amber-500 relative z-10"
            aria-hidden="true"
          />
        </div>
      </div>

      {showMetrics ? (
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <div className="rounded-full bg-surface-container-highest/75 px-3 py-1.5 flex items-center gap-2 border border-outline-variant/40">
            <Droplets
              className="w-3.5 h-3.5 text-sky-500 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-[10px] text-ink-muted truncate">
                {b.weatherHumidity}
              </div>
              <div dir="ltr" className="text-xs font-bold text-ink tabular-nums">
                {city.humidity}%
              </div>
            </div>
          </div>
          <div className="rounded-full bg-surface-container-highest/75 px-3 py-1.5 flex items-center gap-2 border border-outline-variant/40">
            <Wind
              className="w-3.5 h-3.5 text-teal-500 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="text-[10px] text-ink-muted truncate">
                {b.weatherWind}
              </div>
              <div dir="ltr" className="text-xs font-bold text-ink tabular-nums">
                {formatMessage(b.weatherWindSpeed, { wind: city.wind })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showForecast ? (
        <div className="grid grid-cols-3 gap-2 pt-1 relative z-10">
          {city.forecast.map((f) => {
            const d = new Date(now);
            d.setDate(now.getDate() + f.dayOffset);
            const dayName = formatGregorianDate(d, locale, {
              weekday: "short",
            });
            const FIcon =
              f.condition === "clear"
                ? Sun
                : f.condition === "partly_cloudy"
                  ? CloudSun
                  : Wind;
            return (
              <div
                key={f.dayOffset}
                className="rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/50 py-2 px-2 flex flex-col items-center gap-1 text-center"
              >
                <span className="text-[10px] font-bold text-ink-muted">
                  {dayName}
                </span>
                <FIcon
                  className="w-4 h-4 text-amber-500"
                  aria-hidden="true"
                />
                <span
                  dir="ltr"
                  className="text-[11px] font-extrabold text-ink tabular-nums"
                >
                  {toUnit(f.high)}° / {toUnit(f.low)}°
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/**
 * 5. Google Calendar M3 Monthly Mini Calendar (`calendar_mini`)
 */
export function CalendarMiniWidget({ data, settings }: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;

  const showHijri = settings?.showHijri !== false;
  const showEvents = settings?.showEvents !== false;

  const today = React.useMemo(() => new Date(), []);
  const [cursor, setCursor] = React.useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventDays = React.useMemo(() => {
    const set = new Set<string>();
    for (const ev of data.events ?? []) {
      const d = new Date(ev.start_date);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return set;
  }, [data.events]);

  const monthLabel = formatGregorianDate(cursor, locale, {
    month: "long",
    year: "numeric",
  });
  const hijriMonthLabel = formatHijriDate(cursor, locale, {
    month: "long",
    year: "numeric",
  });

  const weekdays = React.useMemo(() => {
    const base = new Date(2026, 0, 4);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return formatGregorianDate(d, locale, { weekday: "narrow" });
    });
  }, [locale]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={ROUTES.calendar}
            className="text-sm font-extrabold text-ink hover:text-primary flex items-center gap-1.5 truncate"
          >
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
              <CalendarIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <bdi dir="auto">{monthLabel}</bdi>
          </Link>
          {showHijri && hijriMonthLabel ? (
            <div className="text-[10px] text-ink-muted truncate mt-0.5 ps-7">
              <bdi dir="auto">{hijriMonthLabel}</bdi>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-ink-muted hover:text-ink"
            aria-label={b.calendarPrevMonth}
          >
            <ChevronLeft
              className="w-3.5 h-3.5 rtl:-scale-x-100"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() =>
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            }
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container text-on-secondary-container hover:opacity-90"
          >
            {b.calendarToday}
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container-highest text-ink-muted hover:text-ink"
            aria-label={b.calendarNextMonth}
          >
            <ChevronRight
              className="w-3.5 h-3.5 rtl:-scale-x-100"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-ink-muted pb-1">
          {weekdays.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-7" />;
            }
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const hasEvent = eventDays.has(`${year}-${month}-${day}`);

            return (
              <Link
                key={day}
                href={ROUTES.calendar}
                className={`h-7 rounded-full flex flex-col items-center justify-center text-xs tabular-nums relative transition-all ${
                  isToday
                    ? "bg-primary text-on-primary font-extrabold shadow-xs scale-105"
                    : "text-ink hover:bg-surface-container-highest font-medium"
                }`}
              >
                <span>{day}</span>
                {hasEvent ? (
                  <span
                    className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                      isToday ? "bg-on-primary" : "bg-primary"
                    }`}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {showEvents && data.events && data.events.length > 0 ? (
        <div className="pt-2 border-t border-outline-variant/50 space-y-1">
          {data.events.slice(0, 2).map((ev) => (
            <Link
              key={ev.id}
              href={ROUTES.calendar}
              className="flex items-center justify-between gap-2 rounded-full bg-surface-container-highest/70 px-3 py-1 text-[11px] hover:bg-secondary-container/60 transition-colors"
            >
              <span className="font-semibold text-ink truncate">
                <bdi dir="auto">{ev.title}</bdi>
              </span>
              <span className="text-[10px] text-ink-muted shrink-0">
                {formatGregorianDate(new Date(ev.start_date), locale, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * 6. Google Keep M3 Scratchpad & Checklist Widget (`scratchpad_notes`)
 */
const SCRATCHPAD_STORAGE_KEY = "platform_admin_scratchpad_v1";

interface ScratchpadTodo {
  id: string;
  text: string;
  done: boolean;
}

export function ScratchpadNotesWidget({
  settings,
  onUpdateSettings,
}: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const mode = settings?.tab === "todo" ? "todo" : "notes";
  const noteTint =
    typeof settings?.noteTint === "string" ? settings.noteTint : "warm";
  const serverNote = typeof settings?.note === "string" ? settings.note : "";

  const [note, setNote] = React.useState(serverNote);
  const [todos, setTodos] = React.useState<ScratchpadTodo[]>([]);
  const [newTodo, setNewTodo] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          note?: string;
          todos?: ScratchpadTodo[];
        };
        if (!serverNote && typeof parsed.note === "string") {
          setNote(parsed.note);
        }
        if (Array.isArray(parsed.todos)) {
          setTodos(parsed.todos);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [serverNote]);

  const persistLocal = (nextNote: string, nextTodos: ScratchpadTodo[]) => {
    try {
      localStorage.setItem(
        SCRATCHPAD_STORAGE_KEY,
        JSON.stringify({ note: nextNote, todos: nextTodos }),
      );
    } catch {
      // ignore storage errors
    }
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTodo.trim();
    if (!trimmed) return;
    const next = [
      ...todos,
      { id: `${Date.now()}`, text: trimmed, done: false },
    ];
    setTodos(next);
    setNewTodo("");
    persistLocal(note, next);
  };

  const toggleTodo = (id: string) => {
    const next = todos.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item,
    );
    setTodos(next);
    persistLocal(note, next);
  };

  const deleteTodo = (id: string) => {
    const next = todos.filter((item) => item.id !== id);
    setTodos(next);
    persistLocal(note, next);
  };

  const tintClass =
    noteTint === "mint"
      ? "bg-gradient-to-br from-emerald-500/12 via-surface-container to-teal-500/8"
      : noteTint === "sky"
        ? "bg-gradient-to-br from-sky-500/12 via-surface-container to-indigo-500/8"
        : noteTint === "violet"
          ? "bg-gradient-to-br from-violet-500/12 via-surface-container to-fuchsia-500/8"
          : noteTint === "neutral"
            ? ""
            : "bg-gradient-to-br from-amber-500/12 via-surface-container to-orange-500/6";

  return (
    <section
      {...widgetContainerProps(settings)}
      className={`admin-widget h-full p-5 flex flex-col justify-between gap-3 ${tintClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 inline-flex items-center justify-center shrink-0">
            <StickyNote className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-extrabold tracking-tight text-ink truncate">
            {b.widgets.scratchpad_notes}
          </h3>
        </div>
        <div className="inline-flex rounded-full bg-surface-container-highest/90 p-0.5 border border-outline-variant/60">
          <button
            type="button"
            onClick={() => onUpdateSettings?.({ tab: "notes" })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              mode === "notes"
                ? "bg-primary text-on-primary shadow-2xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {b.scratchpadNotesTab}
          </button>
          <button
            type="button"
            onClick={() => onUpdateSettings?.({ tab: "todo" })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
              mode === "todo"
                ? "bg-primary text-on-primary shadow-2xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {b.scratchpadTodoTab}
          </button>
        </div>
      </div>

      {mode === "notes" ? (
        <div className="flex-1 flex flex-col gap-1.5">
          <textarea
            value={note}
            onChange={(e) => {
              const val = e.target.value.slice(0, 600);
              setNote(val);
              persistLocal(val, todos);
            }}
            onBlur={() => {
              if (note !== serverNote) {
                onUpdateSettings?.({ note: note.slice(0, 240) });
              }
            }}
            placeholder={b.scratchpadPlaceholder}
            aria-label={b.scratchpadNotesTab}
            className="w-full flex-1 min-h-[110px] rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/60 p-3 text-xs text-ink placeholder:text-ink-muted resize-none focus:outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between text-[10px] text-ink-muted">
            <span>{formatMessage(b.scratchpadChars, { n: note.length })}</span>
            {note.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  persistLocal("", todos);
                  onUpdateSettings?.({ note: "" });
                }}
                className="text-rose-500 hover:underline font-semibold"
              >
                {b.scratchpadClear}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between gap-2">
          <form onSubmit={handleAddTodo} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder={b.scratchpadTodoPlaceholder}
              aria-label={b.scratchpadTodoPlaceholder}
              className="flex-1 h-8 rounded-full bg-surface-container-lowest/90 border border-outline-variant/60 px-3 text-xs text-ink focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="h-8 w-8 rounded-full bg-primary text-on-primary inline-flex items-center justify-center hover:opacity-90 shrink-0"
              aria-label={b.scratchpadTodoPlaceholder}
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </form>

          <div className="space-y-1 max-h-36 overflow-y-auto pe-1">
            {todos.length === 0 ? (
              <p className="text-xs text-ink-muted py-4 text-center">
                {b.scratchpadTodoEmpty}
              </p>
            ) : (
              todos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-full bg-surface-container-lowest/75 border border-outline-variant/40 px-3 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(item.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-start"
                  >
                    <CheckSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        item.done ? "text-emerald-500" : "text-ink-muted"
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`truncate ${
                        item.done ? "line-through text-ink-muted" : "text-ink"
                      }`}
                    >
                      <bdi dir="auto">{item.text}</bdi>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTodo(item.id)}
                    className="text-ink-muted hover:text-rose-500 shrink-0"
                    aria-label={b.scratchpadDeleteItem}
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * 7. Digital Wellbeing M3 Focus Timer / Pomodoro (`focus_pomodoro`)
 */
export function FocusPomodoroWidget({ settings }: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const focusMins =
    typeof settings?.focusMinutes === "number" && settings.focusMinutes >= 5
      ? settings.focusMinutes
      : 25;
  const breakMins =
    typeof settings?.breakMinutes === "number" && settings.breakMinutes >= 1
      ? settings.breakMinutes
      : 5;

  const [mode, setMode] = React.useState<"focus" | "break">("focus");
  const totalSeconds = (mode === "focus" ? focusMins : breakMins) * 60;
  const [secondsLeft, setSecondsLeft] = React.useState(totalSeconds);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    setSecondsLeft((mode === "focus" ? focusMins : breakMins) * 60);
    setRunning(false);
  }, [focusMins, breakMins, mode]);

  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progress =
    totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const switchMode = (nextMode: "focus" | "break") => {
    setRunning(false);
    setMode(nextMode);
    setSecondsLeft((nextMode === "focus" ? focusMins : breakMins) * 60);
  };

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <span className="w-6 h-6 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
            <Timer className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span>{b.widgets.focus_pomodoro}</span>
        </div>
        <div className="inline-flex rounded-full bg-surface-container-highest p-0.5 border border-outline-variant/60">
          <button
            type="button"
            onClick={() => switchMode("focus")}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              mode === "focus"
                ? "bg-primary text-on-primary shadow-2xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {b.pomodoroFocus}
          </button>
          <button
            type="button"
            onClick={() => switchMode("break")}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              mode === "break"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {b.pomodoroBreak}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center my-auto py-1">
        <div
          data-keep-round="true"
          className="relative w-28 h-28 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 104 104"
            className="w-full h-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-surface-container-highest"
            />
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={
                mode === "focus"
                  ? "text-primary transition-all duration-500"
                  : "text-emerald-500 transition-all duration-500"
              }
            />
          </svg>
          <div
            dir="ltr"
            className="absolute inset-0 flex flex-col items-center justify-center text-xl font-black text-ink tabular-nums"
          >
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-on-primary px-5 py-2 text-xs font-extrabold hover:opacity-90 active:scale-95 transition-all shadow-xs"
        >
          {running ? (
            <>
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              {b.pomodoroPause}
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              {b.pomodoroStart}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setSecondsLeft(totalSeconds);
          }}
          className="w-8 h-8 rounded-full bg-surface-container-highest text-ink-muted hover:text-ink inline-flex items-center justify-center"
          aria-label={b.pomodoroReset}
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

/**
 * 8. Google Pixel M3 Expressive Calculator & VAT Tool (`quick_calculator`)
 */
export function QuickCalculatorWidget({ settings }: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const vatRate =
    typeof settings?.vatRate === "number" && settings.vatRate > 0
      ? settings.vatRate
      : 10;

  const [display, setDisplay] = React.useState("0");
  const [prevValue, setPrevValue] = React.useState<number | null>(null);
  const [op, setOp] = React.useState<string | null>(null);
  const [resetNext, setResetNext] = React.useState(false);

  const inputDigit = (digit: string) => {
    if (resetNext) {
      setDisplay(digit === "." ? "0." : digit);
      setResetNext(false);
      return;
    }
    if (digit === "." && display.includes(".")) return;
    setDisplay(display === "0" && digit !== "." ? digit : `${display}${digit}`);
  };

  const evaluate = (a: number, bVal: number, operator: string): number => {
    switch (operator) {
      case "+":
        return a + bVal;
      case "-":
        return a - bVal;
      case "×":
        return a * bVal;
      case "÷":
        return bVal === 0 ? 0 : a / bVal;
      default:
        return bVal;
    }
  };

  const handleOperator = (nextOp: string) => {
    const current = Number.parseFloat(display) || 0;
    if (prevValue === null) {
      setPrevValue(current);
    } else if (op && !resetNext) {
      const result = evaluate(prevValue, current, op);
      setPrevValue(result);
      setDisplay(String(Number(result.toFixed(3))));
    }
    setResetNext(true);
    setOp(nextOp);
  };

  const handleEquals = () => {
    if (op === null || prevValue === null) return;
    const current = Number.parseFloat(display) || 0;
    const result = evaluate(prevValue, current, op);
    setDisplay(String(Number(result.toFixed(3))));
    setPrevValue(null);
    setOp(null);
    setResetNext(true);
  };

  const applyVat = (add: boolean) => {
    const current = Number.parseFloat(display) || 0;
    const factor = 1 + vatRate / 100;
    const next = add ? current * factor : current / factor;
    setDisplay(String(Number(next.toFixed(3))));
    setResetNext(true);
  };

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-4 flex flex-col justify-between gap-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
          <span className="w-6 h-6 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="truncate">{b.widgets.quick_calculator}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyVat(true)}
            className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:opacity-90"
          >
            {formatMessage(b.calcVatAdd, { rate: vatRate })}
          </button>
          <button
            type="button"
            onClick={() => applyVat(false)}
            className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:opacity-90"
          >
            {formatMessage(b.calcVatRemove, { rate: vatRate })}
          </button>
        </div>
      </div>

      <div
        dir="ltr"
        className="rounded-2xl bg-surface-container-highest/85 border border-outline-variant/50 px-3.5 py-2 text-end"
      >
        <div className="text-[10px] text-ink-muted h-3.5 tabular-nums">
          {prevValue !== null && op ? `${prevValue} ${op}` : ""}
        </div>
        <div className="text-xl sm:text-2xl font-black text-ink tabular-nums truncate">
          {display}
        </div>
      </div>

      <div dir="ltr" className="grid grid-cols-4 gap-1.5">
        {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "=", "+"].map(
          (key) => {
            const isOp = ["÷", "×", "-", "+"].includes(key);
            const isEq = key === "=";
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (isEq) handleEquals();
                  else if (isOp) handleOperator(key);
                  else inputDigit(key);
                }}
                className={`h-8 rounded-xl text-xs font-extrabold tabular-nums transition-all active:scale-95 ${
                  isEq
                    ? "bg-primary text-on-primary"
                    : isOp
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-highest/80 text-ink hover:bg-surface-container-highest"
                }`}
              >
                {key}
              </button>
            );
          },
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setDisplay("0");
          setPrevValue(null);
          setOp(null);
          setResetNext(false);
        }}
        className="w-full h-7 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-500/20"
      >
        {b.calcClear}
      </button>
    </section>
  );
}

/**
 * 9. GCC & Global Currency Converter Widget (`currency_rates`)
 */
const CURRENCY_RATES_TO_BHD: Record<string, number> = {
  BHD: 1,
  SAR: 9.95,
  AED: 9.73,
  KWD: 0.815,
  QAR: 9.66,
  OMR: 1.02,
  USD: 2.65,
  EUR: 2.44,
  GBP: 2.09,
};

export const SUPPORTED_CURRENCIES = [
  "BHD",
  "SAR",
  "AED",
  "KWD",
  "QAR",
  "OMR",
  "USD",
  "EUR",
  "GBP",
] as const;

export function CurrencyRatesWidget({ settings }: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const baseCurrency =
    typeof settings?.baseCurrency === "string" &&
    settings.baseCurrency in CURRENCY_RATES_TO_BHD
      ? settings.baseCurrency
      : "BHD";
  const defaultAmount =
    typeof settings?.defaultAmount === "number" && settings.defaultAmount > 0
      ? settings.defaultAmount
      : 100;

  const targetCurrencies = React.useMemo(() => {
    const raw =
      typeof settings?.targets === "string"
        ? settings.targets
        : "SAR,AED,USD,EUR";
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter((c) => c in CURRENCY_RATES_TO_BHD && c !== baseCurrency);
    return list.length > 0 ? list : ["SAR", "AED", "USD", "EUR"];
  }, [settings?.targets, baseCurrency]);

  const [amountStr, setAmountStr] = React.useState(String(defaultAmount));
  React.useEffect(() => {
    setAmountStr(String(defaultAmount));
  }, [defaultAmount]);

  const numericAmount = Number.parseFloat(amountStr) || 0;
  const baseRate = CURRENCY_RATES_TO_BHD[baseCurrency] ?? 1;

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-extrabold tracking-tight text-ink truncate">
            {b.widgets.currency_rates}
          </h3>
        </div>
        <span
          dir="ltr"
          className="text-[11px] font-extrabold text-primary bg-primary/12 px-2.5 py-0.5 rounded-full"
        >
          {baseCurrency}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          dir="ltr"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          aria-label={b.currencyAmountLabel}
          className="w-full h-9 rounded-xl bg-surface-container-lowest/90 border border-outline-variant/60 px-3 text-sm font-extrabold text-ink tabular-nums focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 my-auto">
        {targetCurrencies.slice(0, 4).map((code) => {
          const targetRate = CURRENCY_RATES_TO_BHD[code] ?? 1;
          const converted = (numericAmount / baseRate) * targetRate;
          return (
            <div
              key={code}
              dir="ltr"
              className="rounded-xl bg-surface-container-highest/75 border border-outline-variant/45 px-3 py-2 flex items-center justify-between gap-2"
            >
              <span className="text-xs font-extrabold text-ink-muted">
                {code}
              </span>
              <span className="text-xs sm:text-sm font-black text-ink tabular-nums truncate">
                {converted.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 10. Milestone & Deadline Countdown Widget (`countdown_milestone`)
 */
export function CountdownMilestoneWidget({ settings }: LifestyleWidgetProps) {
  const { t, locale } = useAdminLocale();
  const b = t.dashboardBoard;

  const title =
    typeof settings?.milestoneTitle === "string" &&
    settings.milestoneTitle.trim()
      ? settings.milestoneTitle
      : b.countdownDefaultTitle;

  const defaultTarget = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  const targetDateStr =
    typeof settings?.targetDate === "string" && settings.targetDate
      ? settings.targetDate
      : defaultTarget;

  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const targetDate = new Date(`${targetDateStr}T23:59:59`);
  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
            <Hourglass className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-extrabold tracking-tight text-ink truncate">
            <bdi dir="auto">{title}</bdi>
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-ink-muted shrink-0">
          {formatGregorianDate(targetDate, locale, {
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {diffMs === 0 ? (
        <div className="my-auto text-center py-3 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
          {b.countdownCompleted}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 my-auto">
          <div className="rounded-2xl bg-surface-container-highest/80 border border-outline-variant/45 py-2.5 px-2 text-center">
            <div
              dir="ltr"
              className="text-2xl font-black text-primary tabular-nums leading-none"
            >
              {days}
            </div>
            <div className="text-[10px] font-bold text-ink-muted mt-1">
              {b.countdownDays}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-highest/80 border border-outline-variant/45 py-2.5 px-2 text-center">
            <div
              dir="ltr"
              className="text-2xl font-black text-ink tabular-nums leading-none"
            >
              {hours}
            </div>
            <div className="text-[10px] font-bold text-ink-muted mt-1">
              {b.countdownHours}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-highest/80 border border-outline-variant/45 py-2.5 px-2 text-center">
            <div
              dir="ltr"
              className="text-2xl font-black text-ink tabular-nums leading-none"
            >
              {mins}
            </div>
            <div className="text-[10px] font-bold text-ink-muted mt-1">
              {b.countdownMins}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * 11. Daily Executive Quote & Motto Widget (`sticky_quote`)
 */
export function StickyQuoteWidget({ settings }: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const customQuote =
    typeof settings?.customQuote === "string" ? settings.customQuote.trim() : "";
  const customAuthor =
    typeof settings?.customAuthor === "string"
      ? settings.customAuthor.trim()
      : "";

  const quotes = [
    { text: b.quotes.q1Text, author: b.quotes.q1Author },
    { text: b.quotes.q2Text, author: b.quotes.q2Author },
    { text: b.quotes.q3Text, author: b.quotes.q3Author },
    { text: b.quotes.q4Text, author: b.quotes.q4Author },
  ];

  const [index, setIndex] = React.useState(0);
  const active = customQuote
    ? { text: customQuote, author: customAuthor || b.widgets.sticky_quote }
    : quotes[index % quotes.length];

  return (
    <section
      {...widgetContainerProps(settings)}
      onClick={() => {
        if (!customQuote) setIndex((i) => (i + 1) % quotes.length);
      }}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3 cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="w-7 h-7 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
          <Quote className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
        <span className="text-[10px] font-bold text-ink-muted">
          {b.widgets.sticky_quote}
        </span>
      </div>

      <blockquote className="text-sm sm:text-base font-bold text-ink leading-relaxed my-auto">
        <bdi dir="auto">&ldquo;{active.text}&rdquo;</bdi>
      </blockquote>

      <div className="text-[11px] font-semibold text-primary">
        <bdi dir="auto">— {active.author}</bdi>
      </div>
    </section>
  );
}

/**
 * 12. Quick Bookmarks & Launchpad Widget (`bookmarks_launchpad`)
 */
export function BookmarksLaunchpadWidget({ settings }: LifestyleWidgetProps) {
  const { t } = useAdminLocale();
  const b = t.dashboardBoard;

  const items = React.useMemo(
    () => [
      {
        id: "orders",
        label: t.quickJump.categories.orders,
        href: ROUTES.orders.list,
        icon: ShoppingBag,
        tone: "text-violet-500 bg-violet-500/12",
      },
      {
        id: "invoices",
        label: t.nav.invoices,
        href: ROUTES.invoices.list,
        icon: FileText,
        tone: "text-amber-500 bg-amber-500/12",
      },
      {
        id: "deals",
        label: t.nav.deals,
        href: ROUTES.crm.deals,
        icon: Briefcase,
        tone: "text-emerald-500 bg-emerald-500/12",
      },
      {
        id: "archive",
        label: b.widgets.archive_folders,
        href: ROUTES.archive,
        icon: FolderArchive,
        tone: "text-teal-500 bg-teal-500/12",
      },
      {
        id: "calendar",
        label: t.nav.calendar,
        href: ROUTES.calendar,
        icon: CalendarIcon,
        tone: "text-sky-500 bg-sky-500/12",
      },
      {
        id: "appearance",
        label: t.appearance.title,
        href: ROUTES.settings.preferences,
        icon: Settings,
        tone: "text-rose-500 bg-rose-500/12",
      },
    ],
    [t, b],
  );

  return (
    <section
      {...widgetContainerProps(settings)}
      className="admin-widget h-full p-5 flex flex-col justify-between gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
            <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h3 className="text-xs font-extrabold tracking-tight text-ink truncate">
            {b.widgets.bookmarks_launchpad}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-auto">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-2xl bg-surface-container-highest/75 hover:bg-secondary-container/70 border border-outline-variant/45 p-3 flex flex-col justify-between gap-2 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-7 h-7 rounded-xl inline-flex items-center justify-center ${item.tone}`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <ExternalLink
                  className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-bold text-ink truncate">
                <bdi dir="auto">{item.label}</bdi>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
