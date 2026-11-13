"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Blocks,
  Globe,
  MapPin,
  Palette,
  Save,
  Sliders,
  Sparkles,
  Store,
  Plus,
  Trash2,
} from "lucide-react";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";

const BUSINESS_ACTIVITIES = [
  "media",
  "agency",
  "software",
  "consulting",
  "design",
  "architecture",
  "construction",
  "real_estate",
  "retail",
  "food",
  "hospitality",
  "fitness",
  "salon",
  "healthcare",
  "education",
  "events",
  "automotive",
  "logistics",
  "manufacturing",
  "legal",
  "accounting",
  "nonprofit",
  "general",
] as const;

const LAYOUT_RECIPES = [
  "editorial",
  "boutique",
  "technical",
  "catalog",
  "express",
] as const;

const CAPABILITY_KEYS = [
  "shop",
  "ordering",
  "accounts",
  "wishlist",
  "delivery",
  "pickup",
  "inquiries",
  "downloads",
] as const;

interface PickupBranchItem {
  id: string;
  nameEn: string;
  nameAr: string;
  city: string;
  pickup: boolean;
}

interface RegionRouteItem {
  code: string;
  currency: string;
  multiplier: string;
  enabled: boolean;
}

export function StorePresetsView({ canEdit }: { canEdit: boolean }) {
  const { copy } = useCopy();
  const sp = copy.storePresets;

  const [activity, setActivity] = React.useState<(typeof BUSINESS_ACTIVITIES)[number]>("retail");
  const [recipe, setRecipe] = React.useState<(typeof LAYOUT_RECIPES)[number]>("boutique");
  const [mode, setMode] = React.useState<"light" | "dark" | "mixed">("light");
  const [motionMode, setMotionMode] = React.useState<"full" | "reduced" | "off">("full");
  const [density, setDensity] = React.useState<"comfortable" | "compact">("comfortable");
  const [corners, setCorners] = React.useState<"brand" | "rounded" | "square">("rounded");
  const [borders, setBorders] = React.useState<"subtle" | "defined">("subtle");
  const [primarySeed, setPrimarySeed] = React.useState("#0F766E");
  const [accentSeed, setAccentSeed] = React.useState("#D97706");
  const [capabilities, setCapabilities] = React.useState<Record<(typeof CAPABILITY_KEYS)[number], boolean>>({
    shop: true,
    ordering: true,
    accounts: true,
    wishlist: true,
    delivery: true,
    pickup: true,
    inquiries: true,
    downloads: true,
  });
  const [branches, setBranches] = React.useState<PickupBranchItem[]>([
    {
      id: "main-branch",
      nameEn: "Manama Flagship",
      nameAr: "الفرع الرئيسي - المنامة",
      city: "Manama",
      pickup: true,
    },
  ]);
  const [regions, setRegions] = React.useState<RegionRouteItem[]>([
    { code: "BH", currency: "BHD", multiplier: "1.000", enabled: true },
    { code: "SA", currency: "SAR", multiplier: "10.000", enabled: true },
    { code: "AE", currency: "AED", multiplier: "9.750", enabled: true },
  ]);
  const [saving, setSaving] = React.useState(false);

  const toggleCapability = (key: (typeof CAPABILITY_KEYS)[number]) => {
    if (!canEdit) return;
    setCapabilities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addBranch = () => {
    if (!canEdit) return;
    const nextIdx = branches.length + 1;
    setBranches((prev) => [
      ...prev,
      {
        id: `branch-${nextIdx}`,
        nameEn: `Branch ${nextIdx}`,
        nameAr: `فرع ${nextIdx}`,
        city: "Manama",
        pickup: true,
      },
    ]);
  };

  const removeBranch = (id: string) => {
    if (!canEdit) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const savePreset = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await fetch("/api/v1/it/store-presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          recipe,
          mode,
          motion: motionMode,
          density,
          corners,
          borders,
          primarySeed,
          accentSeed,
          capabilities,
          branches,
          regions,
        }),
      }).catch(() => null);
      toast.success(sp.saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={sp.title} description={sp.description} />
        {canEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={savePreset}
            className="it-btn-3d py-1.5 px-4 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
          >
            <Save className="size-3.5" aria-hidden />
            <span>{saving ? sp.saving : sp.save}</span>
          </button>
        )}
      </div>

      {/* 1. Business Activity & Layout Recipe */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="it-card p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <Store className="size-4 text-sky-600 shrink-0" aria-hidden />
            <div>
              <h2 className="font-bold uppercase text-ink">{sp.activityTitle}</h2>
              <p className="text-[11px] text-ink-muted font-sans">{sp.activitySubtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto p-1">
            {BUSINESS_ACTIVITIES.map((act) => (
              <button
                key={act}
                type="button"
                disabled={!canEdit}
                onClick={() => setActivity(act)}
                className={`px-2.5 py-1.5 text-start border text-[11px] transition-colors ${
                  activity === act
                    ? "border-sky-600 bg-sky-50 dark:bg-sky-950/60 font-bold text-sky-800 dark:text-sky-300"
                    : "border-slate-300 dark:border-slate-700 bg-surface text-ink hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {sp.activities[act]}
              </button>
            ))}
          </div>
        </section>

        <section className="it-card p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <Blocks className="size-4 text-sky-600 shrink-0" aria-hidden />
            <div>
              <h2 className="font-bold uppercase text-ink">{sp.recipeTitle}</h2>
              <p className="text-[11px] text-ink-muted font-sans">{sp.recipeSubtitle}</p>
            </div>
          </div>
          <div className="space-y-2">
            {LAYOUT_RECIPES.map((rec) => (
              <button
                key={rec}
                type="button"
                disabled={!canEdit}
                onClick={() => setRecipe(rec)}
                className={`w-full p-2.5 text-start border transition-colors flex items-center justify-between ${
                  recipe === rec
                    ? "border-sky-600 bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200"
                    : "border-slate-300 dark:border-slate-700 bg-surface text-ink"
                }`}
              >
                <div>
                  <div className="font-bold uppercase">{sp.recipes[rec].label}</div>
                  <div className="text-[11px] text-ink-muted font-sans">{sp.recipes[rec].desc}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 border border-current uppercase">
                  {rec}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* 2. M3 Theme, Tokens & Motion Controls */}
      <section className="it-card p-4 space-y-4 font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
          <Palette className="size-4 text-sky-600 shrink-0" aria-hidden />
          <div>
            <h2 className="font-bold uppercase text-ink">{sp.themeTitle}</h2>
            <p className="text-[11px] text-ink-muted font-sans">{sp.themeSubtitle}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.primarySeed}</label>
            <input
              type="text"
              dir="ltr"
              disabled={!canEdit}
              value={primarySeed}
              onChange={(e) => setPrimarySeed(e.target.value)}
              className="it-field-sunken w-full font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.accentSeed}</label>
            <input
              type="text"
              dir="ltr"
              disabled={!canEdit}
              value={accentSeed}
              onChange={(e) => setAccentSeed(e.target.value)}
              className="it-field-sunken w-full font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.siteMode}</label>
            <select
              disabled={!canEdit}
              value={mode}
              onChange={(e) => setMode(e.target.value as "light" | "dark" | "mixed")}
              className="it-field-sunken w-full font-mono text-xs py-1"
            >
              <option value="light">{sp.modeLight}</option>
              <option value="dark">{sp.modeDark}</option>
              <option value="mixed">{sp.modeMixed}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.motionProfile}</label>
            <select
              disabled={!canEdit}
              value={motionMode}
              onChange={(e) => setMotionMode(e.target.value as "full" | "reduced" | "off")}
              className="it-field-sunken w-full font-mono text-xs py-1"
            >
              <option value="full">{sp.motionFull}</option>
              <option value="reduced">{sp.motionReduced}</option>
              <option value="off">{sp.motionOff}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.density}</label>
            <select
              disabled={!canEdit}
              value={density}
              onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}
              className="it-field-sunken w-full font-mono text-xs py-1"
            >
              <option value="comfortable">{sp.densityComfortable}</option>
              <option value="compact">{sp.densityCompact}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.corners}</label>
            <select
              disabled={!canEdit}
              value={corners}
              onChange={(e) => setCorners(e.target.value as "brand" | "rounded" | "square")}
              className="it-field-sunken w-full font-mono text-xs py-1"
            >
              <option value="brand">{sp.cornersBrand}</option>
              <option value="rounded">{sp.cornersRounded}</option>
              <option value="square">{sp.cornersSquare}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-ink-muted">{sp.borders}</label>
            <select
              disabled={!canEdit}
              value={borders}
              onChange={(e) => setBorders(e.target.value as "subtle" | "defined")}
              className="it-field-sunken w-full font-mono text-xs py-1"
            >
              <option value="subtle">{sp.bordersSubtle}</option>
              <option value="defined">{sp.bordersDefined}</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Commerce Capabilities */}
      <section className="it-card p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
          <Sliders className="size-4 text-sky-600 shrink-0" aria-hidden />
          <div>
            <h2 className="font-bold uppercase text-ink">{sp.capabilitiesTitle}</h2>
            <p className="text-[11px] text-ink-muted font-sans">{sp.capabilitiesSubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CAPABILITY_KEYS.map((cap) => (
            <label
              key={cap}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 p-2 bg-surface cursor-pointer"
            >
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={capabilities[cap]}
                onChange={() => toggleCapability(cap)}
                className="size-3.5"
              />
              <span className="font-bold uppercase text-[11px]">{sp.capabilities[cap]}</span>
            </label>
          ))}
        </div>
      </section>

      {/* 4. Pickup Branches & Regional Routing */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="it-card p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-sky-600 shrink-0" aria-hidden />
              <div>
                <h2 className="font-bold uppercase text-ink">{sp.branchesTitle}</h2>
                <p className="text-[11px] text-ink-muted font-sans">{sp.branchesSubtitle}</p>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={addBranch}
                className="it-btn-3d py-1 px-2 text-[10px] font-bold flex items-center gap-1"
              >
                <Plus className="size-3" aria-hidden />
                <span>{sp.addBranch}</span>
              </button>
            )}
          </div>
          <div className="space-y-2">
            {branches.map((branch, idx) => (
              <div
                key={branch.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center border border-slate-300 dark:border-slate-700 p-2 bg-surface"
              >
                <input
                  type="text"
                  disabled={!canEdit}
                  value={branch.nameEn}
                  onChange={(e) => {
                    const next = [...branches];
                    next[idx] = { ...branch, nameEn: e.target.value };
                    setBranches(next);
                  }}
                  className="it-field-sunken text-xs font-mono"
                />
                <input
                  type="text"
                  disabled={!canEdit}
                  value={branch.nameAr}
                  onChange={(e) => {
                    const next = [...branches];
                    next[idx] = { ...branch, nameAr: e.target.value };
                    setBranches(next);
                  }}
                  className="it-field-sunken text-xs font-mono"
                />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeBranch(branch.id)}
                    aria-label={sp.removeBranch}
                    className="it-btn-3d p-1 text-rose-700 dark:text-rose-400"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="it-card p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 border-b border-slate-300 dark:border-slate-700 pb-2">
            <Globe className="size-4 text-sky-600 shrink-0" aria-hidden />
            <div>
              <h2 className="font-bold uppercase text-ink">{sp.regionsTitle}</h2>
              <p className="text-[11px] text-ink-muted font-sans">{sp.regionsSubtitle}</p>
            </div>
          </div>
          <table className="it-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-start">{sp.regionCode}</th>
                <th className="text-start">{sp.regionCurrency}</th>
                <th className="text-start">{sp.regionMultiplier}</th>
                <th className="text-start">{sp.regionEnabled}</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((reg, idx) => (
                <tr key={reg.code}>
                  <td className="font-bold" dir="ltr">
                    <bdi>{reg.code}</bdi>
                  </td>
                  <td dir="ltr">
                    <bdi>{reg.currency}</bdi>
                  </td>
                  <td dir="ltr">
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={reg.multiplier}
                      onChange={(e) => {
                        const next = [...regions];
                        next[idx] = { ...reg, multiplier: e.target.value };
                        setRegions(next);
                      }}
                      className="it-field-sunken w-20 font-mono text-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={reg.enabled}
                      onChange={(e) => {
                        const next = [...regions];
                        next[idx] = { ...reg, enabled: e.target.checked };
                        setRegions(next);
                      }}
                      className="size-3.5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
