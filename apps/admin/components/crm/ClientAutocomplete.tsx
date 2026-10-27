"use client";

import { FloatingSurface } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import type { CRMContact } from "@platform/database/types";
import { Input, Button } from "@platform/ui";
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
import {
  searchContactsAction,
  createContactAction,
} from "../../app/actions/crm";
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
  const [contacts, setContacts] =
    React.useState<CRMContact[]>(effectiveInitial);
  const [selectedContact, setSelectedContact] =
    React.useState<CRMContact | null>(
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
  const searchRef = React.useRef<HTMLInputElement>(null);
  const popupId = React.useId();

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
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
        setContacts((prev) => [
          created,
          ...prev.filter((c) => c.id !== created.id),
        ]);
        handleSelect(created);
        toast.success(
          formatMessage(t.clientAutocomplete.addedAndSelected, {
            name: created.company || created.full_name,
          }),
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
      setCreateError(
        errorMessage(err, t, t.clientAutocomplete.errorCreatingCustomer),
      );
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <div className={`space-y-2 ${className || ""}`} ref={containerRef}>
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between text-xs font-semibold text-ink dark:text-ink">
        <label className="flex items-center gap-1.5">
          <span>{effectiveLabel}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {!selectedContact && allowCreate && (
          <div className="flex items-center bg-surface-sunken dark:bg-surface-raised/80 p-0.5 rounded-lg border border-outline-variant/60 dark:border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMode("search");
                setCreateError(null);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium active:scale-[0.98] ${
                mode === "search"
                  ? "bg-surface-raised dark:bg-surface-raised text-primary dark:text-mint shadow-xs"
                  : "text-ink-muted hover:text-ink dark:text-ink-muted dark:hover:text-white"
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
                  ? "bg-surface-raised dark:bg-surface-raised text-primary dark:text-mint shadow-xs"
                  : "text-ink-muted hover:text-ink dark:text-ink-muted dark:hover:text-white"
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
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
          >
            <span>{t.crm.viewDossier}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* State 1: Selected Customer Card */}
      {selectedContact ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-raised border border-outline-variant dark:bg-tone-10/60 dark:border-white/10 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-tone-95 dark:bg-tone-15 text-primary dark:text-mint flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {selectedContact.company
                ? selectedContact.company.charAt(0).toUpperCase()
                : selectedContact.full_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-sm font-bold text-ink dark:text-ink truncate flex items-center gap-2">
                <span>
                  {selectedContact.company || selectedContact.full_name}
                </span>
                {selectedContact.company && selectedContact.full_name && (
                  <span className="text-xs font-normal text-ink-muted dark:text-ink-muted">
                    (<bdi dir="auto">{selectedContact.full_name}</bdi>)
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-muted dark:text-ink-muted truncate flex items-center gap-3">
                {selectedContact.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-ink-muted" />
                    <span>
                      <bdi dir="ltr">{selectedContact.email}</bdi>
                    </span>
                  </span>
                )}
                {selectedContact.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-ink-muted" />
                    <span dir="ltr">
                      <bdi dir="ltr">{selectedContact.phone}</bdi>
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-muted hover:bg-surface-sunken/50 dark:hover:text-white dark:hover:bg-white/10 transition-colors shrink-0"
            title={t.crm.clearSelection}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : mode === "create" ? (
        /* State 2: Inline "Create New Customer" Flow */
        <div className="p-4 rounded-xl bg-surface-raised dark:bg-white/[0.03] border border-outline-variant dark:border-white/10 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60 dark:border-white/10">
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
              className="text-xs text-ink-muted hover:text-ink dark:text-ink-muted dark:hover:text-white"
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
            <label>
              <span className="block text-[11px] font-semibold text-ink dark:text-ink mb-1">
                {t.clientAutocomplete.fullNameContactPerson}
              </span>
              <Input
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder={t.clientAutocomplete.eGAhmedAbdulla}
                required
              />
            </label>

            <div>
              <label className="block text-[11px] font-semibold text-ink dark:text-ink mb-1">
                {t.clientAutocomplete.companyOrganization}
              </label>
              <div className="relative">
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder={t.clientAutocomplete.eGGulfMediaCo}
                  className="ps-8 rtl:ps-3 rtl:pe-8"
                />
                <Building className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-ink-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink dark:text-ink mb-1">
                {t.clientAutocomplete.emailAddress}
              </label>
              <div className="relative" dir="ltr">
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t.copy.clientEmailExample}
                  className="ps-8 rtl:ps-3 rtl:pe-8"
                />
                <Mail className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-ink-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink dark:text-ink mb-1">
                {t.clientAutocomplete.phoneWhatsapp}
              </label>
              <div className="relative">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+973 3900 0000"
                  dir="ltr"
                  className="ps-8 rtl:ps-3 rtl:pe-8 text-start"
                />
                <Phone className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-3 text-ink-muted pointer-events-none" />
              </div>
            </div>

            <label className="sm:col-span-2">
              <span className="block text-[11px] font-semibold text-ink dark:text-ink mb-1">
                {t.clientAutocomplete.jobTitleNotes}
              </span>
              <Input
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder={t.clientAutocomplete.eGMarketingDirector}
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60 dark:border-white/10">
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
              className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold gap-1.5 shadow-xs active:scale-[0.98] transition-all"
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
              ref={searchRef}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={isOpen ? popupId : undefined}
              aria-haspopup="dialog"
              aria-label={effectivePlaceholder}
              onClick={() => setIsOpen(true)}
              onBlur={(event) => {
                if (
                  !document
                    .getElementById(popupId)
                    ?.contains(event.relatedTarget as Node)
                )
                  setIsOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && isOpen) {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                }
                if (event.key === "ArrowDown" && isOpen) {
                  event.preventDefault();
                  document
                    .getElementById(popupId)
                    ?.querySelector<HTMLButtonElement>(
                      "[data-popup-body] button",
                    )
                    ?.focus();
                }
              }}
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
            <Search className="w-4 h-4 absolute start-3 top-3.5 text-ink-muted pointer-events-none" />
            {loading && (
              <Loader2 className="w-4 h-4 absolute end-3 top-3.5 text-accent animate-spin" />
            )}
          </div>

          {isOpen && (
            <FloatingSurface
              id={popupId}
              role="dialog"
              aria-label={effectivePlaceholder}
              anchor={searchRef.current}
              onClose={() => setIsOpen(false)}
              className="m3-region-surface"
            >
              <header className="m3-surface-header" data-popup-header>
                <strong>{effectivePlaceholder}</strong>
                <button
                  type="button"
                  aria-label={t.actions.close}
                  onClick={() => setIsOpen(false)}
                >
                  ×
                </button>
              </header>
              <div
                className="m3-surface-body divide-y divide-outline-variant"
                data-popup-body
                data-overlay-scroll
              >
                {contacts.length === 0 ? (
                  <p className="p-5 text-center text-sm text-ink-muted">
                    {loading ? t.crm.searchingClients : t.crm.noMatchingClients}
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelect(contact)}
                      className="w-full text-start p-3 hover:bg-surface-raised dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-ink dark:text-ink truncate">
                          {contact.company ? `${contact.company} - ` : ""}
                          <bdi dir="auto">{contact.full_name}</bdi>
                        </div>
                        <div className="text-[11px] text-ink-muted dark:text-ink-muted truncate mt-0.5 flex items-center gap-2">
                          {contact.email && (
                            <span>
                              <bdi dir="ltr">{contact.email}</bdi>
                            </span>
                          )}
                          {contact.email && contact.phone && <span>•</span>}
                          {contact.phone && (
                            <span dir="ltr">
                              <bdi dir="ltr">{contact.phone}</bdi>
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedContactId === contact.id && (
                        <Check className="w-4 h-4 text-accent shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
              <footer className="m3-surface-footer" data-popup-footer>
                {allowCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("create");
                      setIsOpen(false);
                    }}
                    className="flex min-h-10 items-center gap-2 text-sm text-primary"
                  >
                    <UserPlus aria-hidden className="h-4 w-4" />
                    {t.clientAutocomplete.createAsNewClientNow}
                  </button>
                )}
                <button type="button" onClick={() => setIsOpen(false)}>
                  {t.actions.close}
                </button>
              </footer>
            </FloatingSurface>
          )}
        </div>
      )}
    </div>
  );
}
