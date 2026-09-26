'use client';

import * as React from 'react';
import { getStudioEquipment, StudioEquipment } from '@ishoot/database';
import { Button, Card, Badge } from '@ishoot/ui';
import { Plus } from 'lucide-react';

export default function EquipmentManagerPage() {
  const [equipment, setEquipment] = React.useState<StudioEquipment[]>([]);

  React.useEffect(() => {
    getStudioEquipment().then((data) => setEquipment(data));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Gear Locker Inventory
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Studio-owned cinema cameras, optical lenses, lighting packages, and soundstage specifications.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Equipment</span>
        </Button>
      </div>

      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">Category</th>
              <th className="p-4 text-start">Model Name</th>
              <th className="p-4 text-start">Technical Specification</th>
              <th className="p-4 text-end">Daily Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {equipment.map((eq) => (
              <tr key={eq.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <Badge variant="emerald">{eq.category.replace('_', ' ')}</Badge>
                </td>
                <td className="p-4 font-bold text-white text-sm">{eq.model_name}</td>
                <td className="p-4 text-[#9EADA9] max-w-md">{eq.specification}</td>
                <td className="p-4 text-end font-mono font-bold text-[#09937F]">
                  {eq.daily_rate_bhd ? `${eq.daily_rate_bhd.toFixed(3)} BHD` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
