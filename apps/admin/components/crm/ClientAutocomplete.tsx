"use client";

import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { CRMContact } from "@ishoot/database/types";
import { Input, Button } from "@ishoot/ui";
import {
  Search,
  Mail,
  Phone,
  ExternalLink,
  Check,
  Loader2,
  X,
  UserPlus,
  Users,
  Building,
  AlertCircle,
} from "lucide-react";
import { searchContactsAction, createContactAction } from "../../app/actions/crm";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { toast } from "sonner";

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
  allowCreate?: boolean;
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
  allowCreate = true,
}: ClientAutocompleteProps) {
  const { t } = useAdminLocale();
  const effectivePlaceholder = placeholder || t.crm.clientSearchPlaceholder;
  const effectiveLabel = label || t.crm.selectClientLabel;
  const effectiveInitial = contactsProp || initialContacts;

  const [mode, setMode] = React.useState<"search" | "create">("search");
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [contacts, setContacts] = React.useState<CRMContact[]>(effectiveInitial);
  const [selectedContact, setSelectedContact] = React.useState<CRMContact | null>(
    effectiveInitial.find((c) => c.id === selectedContactId) || null,
  );

  // New Client Form State
  const [newFullName, setNewFullName] = React.useState("");
  const [newCompany, setNewCompany] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newJobTitle, setNewJobTitle] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [creatingClient, setCreatingClient] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync external changes
  React.useEffect(() => {
    if (selectedContactId) {
      const found = contacts.find((c) => c.id === selectedContactId);
      if (found) setSelectedContact(found);
    } else {
      setSelectedContact(null);
    }
  }, [selectedContactId, contacts]);

  // Click outside or Escape closes the dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (!isOpen || mode !== "search") return;
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
  }, [query, isOpen, mode]);

  const handleSelect = (contact: CRMContact) => {
    setSelectedContact(contact);
    if (onSelect) onSelect(contact);
    if (onSelectClient) onSelectClient(contact);
    setIsOpen(false);
    setQuery("");
    setMode("search");
  };

  const handleClear = () => {
    setSelectedContact(null);
    if (onSelect) onSelect(null);
    setQuery("");
  };

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      setCreateError(t.clientAutocomplete.customerNameIsRequired);
      return;
    }

    setCreatingClient(true);
    setCreateError(null);
    try {
      const res = await createContactAction({
        full_name: newFullName.trim(),
        company: newCompany.trim() || undefined,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        job_title: newJobTitle.trim() || undefined,
        notes: newNotes.trim() || undefined,
        contact_type: "client",
      });

      if (res.success && res.contact) {
        const created = res.contact;
        setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        handleSelect(created);
        toast.success(
          t.clientAutocomplete.addedAndSelected.replace("{name}", created.company || created.full_name),
        );
        // Reset form
        setNewFullName("");
        setNewCompany("");
        setNewEmail("");
        setNewPhone("");
        setNewJobTitle("");
        setNewNotes("");
        setMode("search");
      } else {
        setCreateError(t.clientAutocomplete.failedToCreateClient);
      }
    } catch (err: unknown) {
      console.error("Error creating customer:", err);
      setCreateError(errorMessage(err, t, t.clientAutocomplete.errorCreatingCustomer));
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className={`space-y-2 ${className || ""}`} ref={containerRef}>
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-1.5">
          <span>{effectiveLabel}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {!selectedContact && allowCreate && (
          <div className="flex items-center bg-slate-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMode("search");
                setCreateError(null);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium active:scale-[0.98] ${
                mode === "search"
                  ? "bg-white dark:bg-surface-raised text-primary dark:text-mint shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{t.clientAutocomplete.existingClient}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setIsOpen(false);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium active:scale-[0.98] ${
                mode === "create"
                  ? "bg-white dark:bg-surface-raised text-primary dark:text-mint shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <UserPlus className="w-3 h-3" />
              <span>{t.clientAutocomplete.newClient}</span>
            </button>
          </div>
        )}

        {selectedContact && (
          <Link
            href={ROUTES.crm.customer(selectedContact.id)}
            target="_blank"
            className="text-accent hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
          >
            <span>{t.crm.viewDossier}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* State 1: Selected Customer Card */}
      {selectedContact ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 dark:bg-[#152320]/60 dark:border-white/10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#E6F5F2] dark:bg-[#1D3531] text-primary dark:text-mint flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {selectedContact.company
                ? selectedContact.company.charAt(0).toUpperCase()
                : selectedContact.full_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                <span>{selectedContact.company || selectedContact.full_name}</span>
                {selectedContact.company && selectedContact.full_name && (
                  <span className="text-xs font-normal text-slate-500 dark:text-neutral-400">
                    ({selectedContact.full_name})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-3">
                {selectedContact.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{selectedContact.email}</span>
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span dir="ltr">{selectedContact.phone}</span>
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
      ) : mode === "create" ? (
        /* State 2: Inline "Create New Customer" Flow */
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-primary dark:text-mint">
              <UserPlus className="w-4 h-4" />
              <span>{t.clientAutocomplete.createNewCustomerAndAdd}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode("search");
                setCreateError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white"
            >
              {t.clientAutocomplete.cancelAndSearch}
            </button>
          </div>

          {createError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t.clientAutocomplete.fullNameContactPerson}
              </label>
              <Input
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder={t.clientAutocomplete.eGAhmedAbdulla}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t.clientAutocomplete.companyOrganization}
              </label>
              <div className="relative">
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder={t.clientAutocomplete.eGGulfMediaCo}
                  className="pl-8 rtl:pl-3 rtl:pr-8"
                />
                <Building className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t.clientAutocomplete.emailAddress}
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="pl-8 rtl:pl-3 rtl:pr-8"
                />
                <Mail className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t.clientAutocomplete.phoneWhatsapp}
              </label>
              <div className="relative">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+973 3900 0000"
                  dir="ltr"
                  className="pl-8 rtl:pl-3 rtl:pr-8 text-start"
                />
                <Phone className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                {t.clientAutocomplete.jobTitleNotes}
              </label>
              <Input
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder={t.clientAutocomplete.eGMarketingDirector}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setMode("search");
                setCreateError(null);
              }}
              className="text-xs"
            >
              {t.clientAutocomplete.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={creatingClient || !newFullName.trim()}
              onClick={handleCreateNewClient}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold gap-1.5 shadow-xs active:scale-[0.98] transition-all"
            >
              {creatingClient ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.clientAutocomplete.saving}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.clientAutocomplete.saveAndSelectClient}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* State 3: Search Existing Customers */
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
              className="ps-9 pe-9"
            />
            <Search className="w-4 h-4 absolute start-3 top-3.5 text-slate-400 pointer-events-none" />
            {loading && (
              <Loader2 className="w-4 h-4 absolute end-3 top-3.5 text-accent animate-spin" />
            )}
          </div>

          {isOpen && (
            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-surface-raised border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 animate-fade-in">
              {contacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>{loading ? t.crm.searchingClients : t.crm.noMatchingClients}</p>
                  {allowCreate && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("create");
                        setIsOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-primary dark:text-mint font-semibold hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.clientAutocomplete.createAsNewClientNow}</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {allowCreate && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("create");
                        setIsOpen(false);
                      }}
                      className="w-full text-start p-3 bg-slate-50/70 dark:bg-white/[0.02] hover:bg-[#E6F5F2] dark:hover:bg-[#1D3531]/40 text-primary dark:text-mint font-semibold text-xs flex items-center gap-2 border-b border-slate-100 dark:border-white/5 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.clientAutocomplete.createNewClientNotIn}</span>
                    </button>
                  )}
                  {contacts.map((contact) => (
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
                          {contact.phone && <span dir="ltr">{contact.phone}</span>}
                        </div>
                      </div>
                      {selectedContactId === contact.id && (
                        <Check className="w-4 h-4 text-accent shrink-0" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
