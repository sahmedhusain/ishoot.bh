"use client";

import * as React from "react";
import {
  BriefcaseBusiness,
  Building2,
  Clapperboard,
  GraduationCap,
  HardHat,
  Megaphone,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Store,
  Sparkle,
  Dumbbell,
  Car,
  Truck,
  Plane,
  BedDouble,
  Scale,
  HeartHandshake,
  Pill,
  Factory,
  Code2,
  type LucideIcon,
} from "lucide-react";
import { Input, Textarea } from "@platform/ui";
import type { ContentLanguage } from "@platform/database/constants/languages";
import { ACTIVITY_PRESETS, type BusinessActivity } from "@platform/database/website-presets";
import { useAdminLocale } from "../../hooks/useAdminLocale";

const ICONS: Record<string, LucideIcon> = {
  BriefcaseBusiness,
  Building2,
  Clapperboard,
  GraduationCap,
  HardHat,
  Megaphone,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Store,
  Sparkle,
  Dumbbell,
  Car,
  Truck,
  Plane,
  BedDouble,
  Scale,
  HeartHandshake,
  Pill,
  Factory,
  Code2,
};

export function activityIcon(activity: BusinessActivity): LucideIcon {
  return ICONS[ACTIVITY_PRESETS[activity].icon] ?? Sparkles;
}

export function Field({ label, hint, children, wide }: { label: string; hint?: string; children: (id: string) => React.ReactNode; wide?: boolean }) {
  const id = React.useId();
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children(id)}
      {hint ? <p className="text-[11px] text-slate-500 dark:text-ink-muted">{hint}</p> : null}
    </div>
  );
}

/**
 * One input per content language for an English/Arabic pair. With a single language there is one unlabelled
 * input, and it writes both sides so every reader of either column sees the text.
 */
export function LanguageFields({
  label,
  hint,
  en,
  ar,
  onChange,
  languages,
  multiline,
  required,
  wide,
  placeholder,
  maxLength = 1500,
  name,
}: {
  /** Inputs are named `${name}En` / `${name}Ar`. */
  name?: string;
  label: string;
  hint?: string;
  en: string;
  ar: string;
  onChange: (value: { en: string; ar: string }) => void;
  languages: readonly ContentLanguage[];
  multiline?: boolean;
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const { t } = useAdminLocale();
  const suffix = { en: t.websiteEditor.inEnglish, ar: t.websiteEditor.inArabic };
  const single = languages.length === 1;
  return (
    <>
      {languages.map((language) => (
        <Field key={language} label={single ? label : `${label} (${suffix[language]})`} hint={hint} wide={wide || multiline}>
          {(id) => {
            const value = language === "en" ? en : ar;
            const set = (next: string) => onChange(single ? { en: next, ar: next } : language === "en" ? { en: next, ar } : { en, ar: next });
            const common = { id, name: name ? `${name}${language === "en" ? "En" : "Ar"}` : undefined, dir: language === "ar" ? "rtl" : "ltr", value, required, maxLength, placeholder, className: "rounded-lg" } as const;
            return multiline ? <Textarea {...common} rows={3} onChange={(e) => set(e.target.value)} /> : <Input {...common} onChange={(e) => set(e.target.value)} />;
          }}
        </Field>
      ))}
    </>
  );
}
