'use client';

import * as React from 'react';
import { getAllInquiries, Inquiry } from '@ishoot/database';
import { Card, Button, Badge, StatusBadge } from '@ishoot/ui';
import { Mail, Phone, Building, Calendar, CheckCircle } from 'lucide-react';

export default function LeadsInboxPage() {
  const [inquiries, setInquiries] = React.useState<Inquiry[]>([]);

  React.useEffect(() => {
    getAllInquiries().then((data) => setInquiries(data));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
          Inquiries & Production Leads
        </h1>
        <p className="text-xs text-[#9EADA9] mt-1">
          Submissions transmitted via public contact onboarding. Dual-email dispatch status tracked per lead.
        </p>
      </div>

      <div className="space-y-4">
        {inquiries.map((inq) => (
          <Card key={inq.id} className="p-6 bg-[#0B1210] border border-white/10 hover:border-white/20 transition-all space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">{inq.full_name}</h3>
                  <StatusBadge status={inq.status} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#9EADA9] mt-1.5">
                  {inq.company && (
                    <span className="flex items-center gap-1 text-white">
                      <Building className="w-3.5 h-3.5 text-[#09937F]" />
                      <span>{inq.company}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#09937F]" />
                    <a href={`mailto:${inq.email}`} className="hover:text-white transition-colors">{inq.email}</a>
                  </span>
                  {inq.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-[#09937F]" />
                      <a href={`tel:${inq.phone}`} className="hover:text-white transition-colors">{inq.phone}</a>
                    </span>
                  )}
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                  <CheckCircle className="w-3 h-3" />
                  <span>Dual Email Sent</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/5 text-[#9EADA9] text-[11px] font-mono">
                  {inq.budget_range || 'Flexible'}
                </span>
              </div>
            </div>

            {/* Services Requested */}
            <div className="flex flex-wrap gap-2">
              {inq.services_requested.map((srv, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white/5 text-xs text-[#09937F] border border-white/10">
                  {srv}
                </span>
              ))}
            </div>

            {/* Message Body */}
            {inq.message && (
              <p className="text-sm text-[#9EADA9] bg-[#050807] p-4 rounded-xl border border-white/5 leading-relaxed">
                {inq.message}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
