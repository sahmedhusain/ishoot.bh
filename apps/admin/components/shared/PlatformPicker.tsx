"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@ishoot/ui";

interface PlatformOption {
  id: string;
  name: string;
  defaultIcon: string;
}

const PLATFORM_PRESETS: PlatformOption[] = [
  { id: "instagram", name: "Instagram", defaultIcon: "Instagram" },
  { id: "linkedin", name: "LinkedIn", defaultIcon: "Linkedin" },
  { id: "youtube", name: "YouTube", defaultIcon: "Youtube" },
  { id: "facebook", name: "Facebook", defaultIcon: "Facebook" },
  { id: "twitter", name: "Twitter / X", defaultIcon: "Twitter" },
  { id: "tiktok", name: "TikTok", defaultIcon: "Music" },
  { id: "whatsapp", name: "WhatsApp", defaultIcon: "MessageCircle" },
  { id: "vimeo", name: "Vimeo", defaultIcon: "Video" },
  { id: "behance", name: "Behance", defaultIcon: "Palette" },
  { id: "dribbble", name: "Dribbble", defaultIcon: "Dribbble" },
  { id: "snapchat", name: "Snapchat", defaultIcon: "Camera" },
  { id: "website", name: "Website / Blog", defaultIcon: "Globe" },
  { id: "custom", name: "+ Custom Platform...", defaultIcon: "Share2" },
];

interface PlatformPickerProps {
  platform: string;
  onPlatformChange: (platform: string, defaultIcon?: string) => void;
}

export function PlatformPicker({ platform, onPlatformChange }: PlatformPickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>(() => {
    const found = PLATFORM_PRESETS.find(
      (p) => p.name.toLowerCase() === platform.toLowerCase() || p.id === platform.toLowerCase()
    );
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
      onPlatformChange(customName || "Custom");
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
        <select
          value={selectedPreset}
          onChange={handleSelectChange}
          className="w-full appearance-none px-3.5 py-2.5 bg-white dark:bg-[#0B1210] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-neutral-200 hover:border-[#09937F] focus:outline-none focus:ring-2 focus:ring-[#09937F]/30 transition-all cursor-pointer shadow-2xs pr-8"
        >
          {PLATFORM_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id} className="bg-white dark:bg-[#111C19] text-slate-800 dark:text-white">
              {preset.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {selectedPreset === "custom" && (
        <Input
          placeholder="Type custom platform name..."
          value={customName}
          onChange={handleCustomTextChange}
          className="text-xs"
        />
      )}
    </div>
  );
}
