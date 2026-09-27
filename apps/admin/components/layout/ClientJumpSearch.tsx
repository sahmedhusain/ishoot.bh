"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import type { CRMContact } from "@ishoot/database/types";
import { useAdminLocale } from "../../hooks/useAdminLocale";

interface ClientJumpSearchProps {
  contacts: CRMContact[];
}

export function ClientJumpSearch({ contacts }: ClientJumpSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filteredContacts = React.useMemo(() => {
    if (!query) return [];
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(query.toLowerCase()) ||
        c.company?.toLowerCase().includes(query.toLowerCase()) ||
        c.email?.toLowerCase().includes(query.toLowerCase()),
    );
  }, [contacts, query]);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/dashboard/crm/customers/${id}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#9EADA9] transition-all"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Jump to Client...</span>
        <span className="text-[10px] bg-white/10 px-1 rounded">⌘K</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#0B1210] border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
          <Input
            placeholder="Search clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="mb-2"
          />
          <div className="max-h-60 overflow-y-auto">
            {filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left text-sm text-white"
              >
                <Users className="w-4 h-4 text-[#09937F]" />
                <div>
                  <div className="font-semibold">{c.full_name}</div>
                  <div className="text-[10px] text-[#9EADA9]">{c.company}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-[#070C0A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#09937F]"
    />
  );
}
