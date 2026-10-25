import { ACTIVITY_PRESETS, type BusinessActivity } from "@platform/database/website-presets";
import { STYLE_PRESETS } from "@platform/database/constants/theme";
import { ACTIVITY_SAMPLES } from "@platform/database/samples/activity-samples";

/** A small drawing of the activity's sample homepage in its suggested style (header, banner, catalogue). */
export function ActivityThumb({ activity, locale }: { activity: BusinessActivity; locale: string }) {
  const style = STYLE_PRESETS.find((s) => s.id === ACTIVITY_PRESETS[activity].stylePreset)?.theme;
  const primary = style?.primary ?? "#0F172A";
  const accent = style?.accent ?? "#0D9488";
  const light = style?.websiteMode === "light";
  const sample = ACTIVITY_SAMPLES[activity];
  const title = sample.banner.title[locale === "ar" ? 1 : 0];
  return (
    <span aria-hidden="true" className="block overflow-hidden rounded-lg border border-ink/10" style={{ background: light ? "#F8FAFC" : `color-mix(in srgb, ${primary} 35%, #05070B)` }}>
      <span className="flex items-center gap-1 px-2 py-1">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <span className="ms-auto flex gap-1">
          {[0, 1, 2].map((i) => <span key={i} className="h-0.5 w-3 rounded-full" style={{ background: light ? "#94A3B8" : "#FFFFFF66" }} />)}
        </span>
      </span>
      <span className="mx-1.5 flex h-9 items-end rounded-md px-1.5 pb-1" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
        <span className="truncate text-[8px] font-bold leading-none text-white">{title}</span>
      </span>
      <span className="grid grid-cols-4 gap-1 p-1.5">
        {sample.items.map((item, i) => <span key={i} className="h-3 rounded-sm" style={{ background: i % 2 ? accent : primary, opacity: light ? 0.35 : 0.6 }} />)}
      </span>
    </span>
  );
}
