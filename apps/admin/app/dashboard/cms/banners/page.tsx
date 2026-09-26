'use client';

import * as React from 'react';
import { getAllBanners, HeroBanner } from '@ishoot/database';
import { Button, Card, Badge } from '@ishoot/ui';
import { Plus, Eye, EyeOff, Film, Image as ImageIcon, Trash2 } from 'lucide-react';

export default function BannersManagerPage() {
  const [banners, setBanners] = React.useState<HeroBanner[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getAllBanners().then((data) => {
      setBanners(data);
      setLoading(false);
    });
  }, []);

  const toggleStatus = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b))
    );
  };

  const removeBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Hero Banner Manager
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Configure homepage video slides, typography overlays, and primary call-to-actions.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Upload New Slide</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {banners.map((banner) => (
          <Card
            key={banner.id}
            className="p-5 bg-[#0B1210] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/20 transition-all"
          >
            {/* Left: Thumbnail & Details */}
            <div className="flex items-center gap-4">
              <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shrink-0">
                <img
                  src={banner.poster_url || banner.media_url}
                  alt={banner.title_en}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white flex items-center gap-1">
                  {banner.media_type === 'video' ? <Film className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                  <span>{banner.media_type.toUpperCase()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {banner.title_en}
                  </h3>
                  <Badge variant={banner.is_active ? 'emerald' : 'outline'}>
                    {banner.is_active ? 'Live' : 'Hidden'}
                  </Badge>
                </div>
                <div className="text-xs text-[#09937F] font-arabic">
                  {banner.title_ar}
                </div>
                <div className="text-xs text-[#9EADA9] max-w-lg line-clamp-1">
                  {banner.subtitle_en}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleStatus(banner.id)}
                className="gap-1.5"
              >
                {banner.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{banner.is_active ? 'Unpublish' : 'Publish'}</span>
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => removeBanner(banner.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
