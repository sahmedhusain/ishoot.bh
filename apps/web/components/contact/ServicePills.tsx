"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";

interface ServicePillsProps {
  selected: string[];
  onChange: (services: string[]) => void;
  isRTL?: boolean;
}

export function ServicePills({ selected, onChange }: ServicePillsProps) {
  const { translations } = useTranslation();
  const services = Array.isArray(translations?.contact?.servicesList)
    ? translations.contact.servicesList
    : [];

  const toggle = (service: string) => {
    if (selected.includes(service)) {
      onChange(selected.filter((s) => s !== service));
    } else {
      onChange([...selected, service]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      {services.map((service) => {
        const isSelected = selected.includes(service);
        return (
          <button
            key={service}
            type="button"
            onClick={() => toggle(service)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
              isSelected
                ? "bg-[#09937F] text-white shadow-lg shadow-[#09937F]/25 border border-[#09937F]"
                : "bg-[#111C19] text-[#9EADA9] hover:text-white border border-white/10 hover:border-white/20"
            }`}
          >
            {service}
          </button>
        );
      })}
    </div>
  );
}
