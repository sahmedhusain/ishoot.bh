"use client";

import * as React from "react";
import Link from "next/link";
import type { CRMContact } from "@ishoot/database/types";
import { Input, Button } from "@ishoot/ui";
import { Search, User, Building, Mail, Phone, ExternalLink, Check, Loader2, X } from "lucide-react";
import { searchContactsAction, lookupClientAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";

export interface ClientAutocompleteProps {
  initialContacts?: CRMContact[];
  contacts?: CRMContact[];
  selectedContactId?: string;
  onSelect?: (contact: CRMContact | null) => void;
  onSelectClient?: (contact: CRMContact) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export function ClientAutocomplete({
  initialContacts = [],
  contacts: contactsProp,
  selectedContactId,
  onSelect,
  onSelectClient,
  disabled = false,
  placeholder,
  label,
  required = false,
  className,
}: ClientAutocompleteProps) {
  const { t } = useAdminLocale();
  const effectivePlaceholder = placeholder || t.crm.clientSearchPlaceholder;
  const effectiveLabel = label || t.crm.selectClientLabel;
  const effectiveInitial = contactsProp || initialContacts;
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState<CRMContact[]>(effectiveInitial);
  const [selectedContact, setSelectedContact] = React.useState<CRMContact | null>(
    effectiveInitial.find((c) => c.id === selectedContactId) || null,
  );

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync when selectedContactId changes externally
  React.useEffect(() => {
    if (selectedContactId) {
      const found = contacts.find((c) => c.id === selectedContactId);
      if (found) setSelectedContact(found);
    } else {
      setSelectedContact(null);
    }
  }, [selectedContactId, contacts]);

  // Click outside listener to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchContactsAction(query);
        if (res.success && res.contacts) {
          setContacts(res.contacts);
        }
      } catch (e) {
        console.error("Error searching contacts:", e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (contact: CRMContact) => {
    setSelectedContact(contact);
    if (onSelect) onSelect(contact);
    if (onSelectClient) onSelectClient(contact);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    setSelectedContact(null);
    if (onSelect) onSelect(null);
    setQuery("");
  };

  return (
    <div className={`space-y-1.5 ${className || ""}`} ref={containerRef}>
      {effectiveLabel && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <label>
            {effectiveLabel} {required && <span className="text-rose-500">*</span>}
          </label>
          {selectedContact && (
            <Link
              href={`/dashboard/crm/customers/${selectedContact.id}`}
              target="_blank"
              className="text-[#09937F] hover:underline inline-flex items-center gap-1  text-[11px]"
            >
              <span>{t.crm.viewDossier}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {selectedContact ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#152320] dark:border-white/10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#E6F5F2] dark:bg-[#1D3531] text-[#014842] dark:text-[#7DE0D1] flex items-center justify-center font-bold text-sm shrink-0">
              {selectedContact.company
                ? selectedContact.company.charAt(0).toUpperCase()
                : selectedContact.full_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {selectedContact.company
                  ? `${selectedContact.company} (${selectedContact.full_name})`
                  : selectedContact.full_name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-3 mt-0.5">
                {selectedContact.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedContact.email}
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="inline-flex items-center gap-1 ">
                    <Phone className="w-3 h-3" />
                    {selectedContact.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-white dark:hover:bg-white/10 transition-colors shrink-0"
            title={t.crm.clearSelection}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={effectivePlaceholder}
              className="pl-9 pr-9"
            />
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
            {loading && (
              <Loader2 className="w-4 h-4 absolute right-3 top-3.5 text-[#09937F] animate-spin" />
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-[#121B19] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 animate-fade-in">
              {contacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  {loading ? t.crm.searchingClients : t.crm.noMatchingClients}
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(contact)}
                    className="w-full text-start p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {contact.company ? `${contact.company} - ` : ""}
                        {contact.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-2">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.email && contact.phone && <span>•</span>}
                        {contact.phone && <span className="">{contact.phone}</span>}
                      </div>
                    </div>
                    {selectedContactId === contact.id && (
                      <Check className="w-4 h-4 text-[#09937F] shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
