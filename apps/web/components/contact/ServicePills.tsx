'use client';

import * as React from 'react';

interface ServicePillsProps {
  selected: string[];
  onChange: (services: string[]) => void;
  isRTL?: boolean;
}

export function ServicePills({ selected, onChange, isRTL }: ServicePillsProps) {
  const services = isRTL
    ? [
        'تصوير سينمائي إعلاني',
        'تصوير جوي و FPV',
        'تصوير فوتوغرافي تجاري',
        'تصحيح ألوان دافينشي',
        'استئجار استوديو ومعدات',
        'إنتاج وثائقي',
      ]
    : [
        'Commercial Cinematography',
        'Aerial & FPV Cinematography',
        'Commercial Photography',
        'DaVinci Resolve Color Grading',
        'Studio & Gear Rental',
        'Documentary Production',
      ];

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
                ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/25 border border-[#09937F]'
                : 'bg-[#111C19] text-[#9EADA9] hover:text-white border border-white/10 hover:border-white/20'
            }`}
          >
            {service}
          </button>
        );
      })}
    </div>
  );
}
