'use client';

import * as React from 'react';
import { getCRMContacts, CRMContact } from '@ishoot/database';
import { Card, Input, Button } from '@ishoot/ui';
import { Search, Mail, Phone, Building, Plus, User } from 'lucide-react';

export default function ContactsDirectoryPage() {
  const [contacts, setContacts] = React.useState<CRMContact[]>([]);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    getCRMContacts().then((data) => setContacts(data));
  }, []);

  const filtered = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(query.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(query.toLowerCase())) ||
    c.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            Client Directory
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            Twenty-inspired client dossiers, agency contacts, and enterprise partners.
          </p>
        </div>

        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>New Contact</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9EADA9]" />
        <Input
          placeholder="Filter by name, company, or email..."
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <Card key={c.id} className="p-6 bg-[#0B1210] border border-white/10 hover:border-[#09937F]/40 transition-all rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#014842] border border-[#09937F]/40 flex items-center justify-center font-bold text-white text-sm">
                {c.full_name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{c.full_name}</div>
                <div className="text-xs text-[#09937F]">{c.job_title || 'Client Partner'}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#9EADA9] pt-2 border-t border-white/5">
              {c.company && (
                <div className="flex items-center gap-2 text-white">
                  <Building className="w-3.5 h-3.5 text-[#09937F]" />
                  <span>{c.company}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#09937F]" />
                <a href={`mailto:${c.email}`} className="hover:text-white transition-colors">{c.email}</a>
              </div>
              {c.phone && (
                <div className="flex items-center gap-2 font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#09937F]" />
                  <a href={`tel:${c.phone}`} className="hover:text-white transition-colors">{c.phone}</a>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
