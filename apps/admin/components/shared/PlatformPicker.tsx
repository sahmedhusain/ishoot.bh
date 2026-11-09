"use client";
import { useAdminLocale } from "../../hooks/useAdminLocale";

import * as React from "react";
import { Link2 } from "lucide-react";
import {
  SOCIAL_PLATFORMS,
  findSocialPlatform,
} from "@platform/database/constants/social";
import { Select, Input } from "@platform/ui";

interface PlatformOption {
  id: string;
  name: string;
  defaultIcon: string;
}

const PLATFORM_PRESETS: PlatformOption[] = [
  ...SOCIAL_PLATFORMS.map((p) => ({
    id: p.id,
    name: p.name,
    defaultIcon: p.id,
  })),
  { id: "website", name: "website", defaultIcon: "website" },
  { id: "custom", name: "custom", defaultIcon: "link" },
];

export function SocialBrandIcon({
  name,
  hint,
  className = "w-4 h-4",
}: {
  name?: string;
  hint?: string;
  className?: string;
}) {
  const platform = findSocialPlatform(name) ?? findSocialPlatform(hint);
  if (!platform) return <Link2 className={className} aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={platform.path} />
    </svg>
  );
}

interface PlatformPickerProps {
  platform: string;
  onPlatformChange: (platform: string, defaultIcon?: string) => void;
}

export function PlatformPicker({
  platform,
  onPlatformChange,
}: PlatformPickerProps) {
  const { t } = useAdminLocale();
  const [selectedPreset, setSelectedPreset] = React.useState<string>(() => {
    if (/^website(?:\s*\/\s*blog)?$/i.test(platform)) return "website";
    const found =
      PLATFORM_PRESETS.find(
        (p) =>
          p.name.toLowerCase() === platform.toLowerCase() ||
          p.id === platform.toLowerCase(),
      ) ?? findSocialPlatform(platform);
    return found ? found.id : "custom";
  });

  const [customName, setCustomName] = React.useState<string>(platform);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPreset(value);

    if (value !== "custom") {
      const preset = PLATFORM_PRESETS.find((p) => p.id === value);
      if (preset) {
        onPlatformChange(preset.name, preset.defaultIcon);
      }
    } else {
      onPlatformChange(customName);
    }
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomName(text);
    onPlatformChange(text);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute z-10 start-3 top-1/2 -translate-y-1/2 text-accent pointer-events-none">
          <SocialBrandIcon name={platform} className="w-4 h-4" />
        </span>
        <Select
          aria-label={t.webSettings.platform}
          value={selectedPreset}
          onChange={handleSelectChange}
          style={{ "--select-ps": "2.5rem" } as React.CSSProperties}
          className="w-full appearance-none bg-surface-raised dark:bg-surface border border-outline-variant dark:border-white/10 rounded-xl text-xs font-semibold text-ink hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all cursor-pointer shadow-2xs ps-10 pe-8"
        >
          {PLATFORM_PRESETS.map((preset) => (
            <option
              key={preset.id}
              value={preset.id}
              className="bg-surface-raised text-ink"
            >
              {preset.id === "website"
                ? t.platformPicker.website
                : preset.id === "custom"
                  ? t.platformPicker.custom
                  : preset.name}
            </option>
          ))}
        </Select>
      </div>

      {selectedPreset === "custom" && (
        <Input
          placeholder={t.platformPicker.typeCustomPlatformName}
          value={customName}
          onChange={handleCustomTextChange}
          className="text-xs"
        />
      )}
    </div>
  );
}
