'use client';

import * as React from 'react';
import { getActiveClientLogos, ClientLogo } from '@ishoot/database';
import { Button, Card, Badge } from '@ishoot/ui';
import { Plus, Trash2 } from 'lucide-react';

export default function ClientLogosManagerPage() {
  const [logos, setLogos] = React.useState<ClientLogo[]>([]);

  React.useEffect(() => {
    getActiveClientLogos().then((data) => setLogos(data));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Client Logo Cloud
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Enterprise brands rendered across the public home page marquee ticker.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Client</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {logos.map((logo) => (
          <Card key={logo.id} className="p-6 text-center space-y-3 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/40 transition-all">
            <div className="w-12 h-12 rounded-xl mx-auto bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-[#09937F]" />
            </div>
            <div className="font-bold text-white text-sm">{logo.client_name}</div>
            <Badge variant="emerald">Live Marquee</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
