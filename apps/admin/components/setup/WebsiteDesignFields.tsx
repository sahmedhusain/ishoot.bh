"use client";

import { Input, Select } from "@platform/ui";
import {
  SITE_MODES,
  SITE_REGIONS,
  SITE_TONES,
  type WebsiteDesign,
} from "@platform/database/constants/website-design";
import { useAdminLocale } from "../../hooks/useAdminLocale";

/** Edits the snapshot's design, using the existing website draft/preview/publication controls. */
export function WebsiteDesignFields({
  design,
  onChange,
}: {
  design: WebsiteDesign;
  onChange: (design: WebsiteDesign) => void;
}) {
  const { t } = useAdminLocale();
  const copy = t.setupWizard.website.design;
  const set = (patch: Partial<WebsiteDesign>) =>
    onChange({ ...design, ...patch });
  const modes = copy.modes;
  const regions = copy.regions;
  return (
    <section
      className="space-y-5 rounded-xl border border-outline-variant p-4 sm:p-5"
      data-testid="website-design-fields"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>{t.websiteMotion.scheme}</span><Select value={design.motionScheme ?? "standard"} onChange={(event) => set({ motionScheme: event.target.value as WebsiteDesign["motionScheme"] })}><option value="standard">{t.websiteMotion.standard}</option><option value="expressive">{t.websiteMotion.expressive}</option></Select></label>
        <label className="space-y-1 text-sm"><span>{t.websiteMotion.height}</span><Select value={design.heroHeight ?? "comfortable"} onChange={(event) => set({ heroHeight: event.target.value as WebsiteDesign["heroHeight"] })}><option value="compact">{t.websiteMotion.compact}</option><option value="comfortable">{t.websiteMotion.comfortable}</option><option value="screen">{t.websiteMotion.screen}</option></Select></label>
        <label className="space-y-1 text-sm"><span>{t.websiteMotion.overlay}</span><Input type="number" min={0} max={90} value={design.heroOverlayOpacity ?? 45} onChange={(event) => set({ heroOverlayOpacity: Number(event.target.value) })} /></label>
        <label className="space-y-1 text-sm"><span>{t.websiteMotion.interval}</span><Input type="number" min={5} max={60} step={1} value={design.bannerIntervalSeconds ?? 8} onChange={(event) => set({ bannerIntervalSeconds: Number(event.target.value) })} /></label>
      </div>
      <div>
        <h3 className="font-bold">
          {copy.title}
        </h3>
        <p className="text-sm text-ink-muted mt-1">
          {copy.hint}
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-2">
          {copy.allowedAppearances}
        </legend>
        <div className="flex flex-wrap gap-4">
          {SITE_MODES.map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={design.allowedModes.includes(mode)}
                disabled={
                  design.allowedModes.length === 1 &&
                  design.allowedModes.includes(mode)
                }
                onChange={(e) => {
                  const allowedModes = e.target.checked
                    ? SITE_MODES.filter(
                        (m) => m === mode || design.allowedModes.includes(m),
                      )
                    : design.allowedModes.filter((m) => m !== mode);
                  set({
                    allowedModes,
                    defaultMode: allowedModes.includes(design.defaultMode)
                      ? design.defaultMode
                      : allowedModes[0],
                  });
                }}
              />
              {modes[mode]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{copy.defaultAppearance}</span>
          <Select
            value={design.defaultMode}
            onChange={(e) =>
              set({
                defaultMode: e.target.value as WebsiteDesign["defaultMode"],
              })
            }
          >
            {design.allowedModes.map((mode) => (
              <option key={mode} value={mode}>
                {modes[mode]}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.mixedBase}</span>
          <Select
            value={design.mixedBase}
            onChange={(e) =>
              set({ mixedBase: e.target.value as WebsiteDesign["mixedBase"] })
            }
          >
            {["light", "dark"].map((mode) => (
              <option key={mode} value={mode}>
                {modes[mode as "light" | "dark"]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.followSystem}
            onChange={(e) => set({ followSystem: e.target.checked })}
          />
          {copy.followSystem}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={design.visitorSwitching}
            onChange={(e) => set({ visitorSwitching: e.target.checked })}
          />
          {copy.visitorSwitching}
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.motion}</span>
          <Select
            value={design.motion}
            onChange={(e) =>
              set({ motion: e.target.value as WebsiteDesign["motion"] })
            }
          >
            <option value="full">
              {copy.motionFull}
            </option>
            <option value="reduced">{copy.motionReduced}</option>
            <option value="off">{copy.motionOff}</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.contentWidth}</span>
          <Select
            value={design.contentWidth}
            onChange={(e) =>
              set({
                contentWidth: e.target.value as WebsiteDesign["contentWidth"],
              })
            }
          >
            <option value="standard">{copy.standard}</option>
            <option value="wide">{copy.wide}</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.headerLayout}</span>
          <Select
            value={design.headerLayout ?? "standard"}
            onChange={(e) =>
              set({
                headerLayout: e.target.value as WebsiteDesign["headerLayout"],
              })
            }
          >
            <option value="standard">{copy.standard}</option>
            <option value="centered">
              {copy.centeredBrand}
            </option>
            <option value="compact">{copy.compact}</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.footerLayout}</span>
          <Select
            value={design.footerLayout ?? "standard"}
            onChange={(e) =>
              set({
                footerLayout: e.target.value as WebsiteDesign["footerLayout"],
              })
            }
          >
            <option value="standard">{copy.standard}</option>
            <option value="compact">{copy.compact}</option>
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span>{copy.spacing}</span>
          <Select
            value={design.density}
            onChange={(e) =>
              set({ density: e.target.value as WebsiteDesign["density"] })
            }
          >
            <option value="comfortable">{copy.comfortable}</option>
            <option value="compact">{copy.compact}</option>
          </Select>
        </label>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium py-2">
          {copy.mixedRegions}
        </summary>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          {SITE_REGIONS.map((region) => (
            <label key={region} className="space-y-1 text-sm">
              <span>{regions[region]}</span>
              <Select
                value={design.tones[region]}
                onChange={(e) =>
                  set({ tones: { ...design.tones, [region]: e.target.value } })
                }
              >
                {SITE_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone === "inherit"
                      ? copy.inherit
                      : modes[tone]}
                  </option>
                ))}
              </Select>
            </label>
          ))}
        </div>
      </details>
    </section>
  );
}
