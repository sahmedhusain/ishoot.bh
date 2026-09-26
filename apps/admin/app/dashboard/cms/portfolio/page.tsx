'use client';

import * as React from 'react';
import { getPortfolioItems, PortfolioItem } from '@ishoot/database';
import { Button, Card, Badge } from '@ishoot/ui';
import { Plus, Eye, Trash2, Video } from 'lucide-react';

export default function PortfolioManagerPage() {
  const [items, setItems] = React.useState<PortfolioItem[]>([]);

  React.useEffect(() => {
    getPortfolioItems().then((data) => setItems(data));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Portfolio Project Archive
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Manage commercial campaigns, credits dossiers, video preview loops, and 4K masters.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </Button>
      </div>

      <div className="bg-[#0B1210] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-start text-xs">
          <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider">
            <tr>
              <th className="p-4 text-start">Project / Client</th>
              <th className="p-4 text-start">Aspect Ratio</th>
              <th className="p-4 text-start">Year</th>
              <th className="p-4 text-start">Featured</th>
              <th className="p-4 text-end">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.thumbnail_url}
                      alt={item.title_en}
                      className="w-14 h-9 rounded-lg object-cover bg-black shrink-0 border border-white/10"
                    />
                    <div>
                      <div className="font-bold text-white text-sm">{item.title_en}</div>
                      <div className="text-[#09937F] font-mono">{item.client_name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-[#9EADA9]">
                  <Badge variant="outline">{item.aspect_ratio}</Badge>
                </td>
                <td className="p-4 font-mono text-white">{item.year}</td>
                <td className="p-4">
                  {item.is_featured ? (
                    <Badge variant="emerald">Featured</Badge>
                  ) : (
                    <span className="text-[#9EADA9]/50">—</span>
                  )}
                </td>
                <td className="p-4 text-end space-x-2">
                  <a
                    href={`http://localhost:3000/en/works/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-[#9EADA9] hover:text-white transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
