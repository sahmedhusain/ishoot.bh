'use client';

import * as React from 'react';
import { StudioEquipment } from '@ishoot/database';
import { useTranslation } from '../../hooks/useTranslation';
import { SectionBadge } from '../shared/SectionBadge';
import { Camera, Aperture, Sun, Sliders, Warehouse } from 'lucide-react';

interface EquipmentGridProps {
  equipment: StudioEquipment[];
}

export function EquipmentGrid({ equipment }: EquipmentGridProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Gear' },
    { id: 'cameras', label: 'Cinema Cameras', icon: <Camera className="w-4 h-4" /> },
    { id: 'lenses', label: 'Cinema Glass', icon: <Aperture className="w-4 h-4" /> },
    { id: 'lighting', label: 'Lighting Rigs', icon: <Sun className="w-4 h-4" /> },
    { id: 'audio_grading', label: 'Mastering Suite', icon: <Sliders className="w-4 h-4" /> },
    { id: 'stages', label: 'Soundstage', icon: <Warehouse className="w-4 h-4" /> },
  ];

  const filteredEquipment = selectedCategory === 'all'
    ? equipment
    : equipment.filter((eq) => eq.category === selectedCategory);

  return (
    <div className="space-y-8 pt-12">
      <div className="space-y-3">
        <SectionBadge>{t('about.gearTitle')}</SectionBadge>
        <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-display">
          {t('about.gearSubtitle')}
        </h3>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#09937F] text-white shadow-lg shadow-[#09937F]/25'
                : 'bg-white/5 hover:bg-white/10 text-[#9EADA9] border border-white/10'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Equipment Table */}
      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-white/5">
          {filteredEquipment.map((gear) => (
            <div
              key={gear.id}
              className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#09937F]">
                  {gear.category.replace('_', ' ')}
                </span>
                <div className="text-base sm:text-lg font-bold text-white">
                  {gear.model_name}
                </div>
                <div className="text-xs sm:text-sm text-[#9EADA9]">
                  {gear.specification}
                </div>
              </div>
              {gear.daily_rate_bhd && (
                <div className="text-end">
                  <div className="text-xs text-[#9EADA9]">Daily Rental</div>
                  <div className="text-sm font-mono font-bold text-[#09937F]">
                    {gear.daily_rate_bhd.toFixed(3)} BHD
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
