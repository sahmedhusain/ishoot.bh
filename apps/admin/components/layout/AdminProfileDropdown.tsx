"use client";

import { ROUTES } from "../../constants/routes";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
User,
Building2,
Sliders,
History,
LogOut,
ChevronDown,Globe,
ExternalLink
} from "lucide-react";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { ConfirmDestructiveModal } from "@ishoot/ui";



export function AdminProfileDropdown() {
  const router = useRouter();
  const {t} = useAdminLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = React.useState(false);
  const { user: currentUser } = usePermissions();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const displayName = currentUser?.fullName || t.profileDropdown.adminUser;
  const displayEmail = currentUser?.email || "";
  const displayRole = currentUser?.role
    ? currentUser.role.replace("_", " ").toUpperCase()
    : "";


  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none"
        aria-expanded={isOpen}
        aria-label={displayName}
      >
        <div className="w-8 h-8 rounded-xl bg-primary border border-accent/40 flex items-center justify-center text-xs font-bold text-white  shadow-sm">
          <User className="w-4 h-4" />
        </div>
        <div className="hidden xl:block text-start leading-tight">
          <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
            <span>{displayName}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 dark:text-ink-muted transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
          <div className="text-[10px] text-accent font-semibold ">
            {displayRole}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full end-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-surface border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary border border-accent/50 flex items-center justify-center text-sm font-bold text-white  shrink-0 shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-ink-muted  truncate">
                  {displayEmail}
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-0.5 text-xs">
            <Link
              href={ROUTES.users.list}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <User className="w-4 h-4 text-accent" />
              <span>{t.profileDropdown.userProfile}</span>
            </Link>

            <Link href={ROUTES.settings.security} onClick={() => setIsOpen(false)} className="block px-4 py-2 text-xs">{t.adminProfileDropdown.accountSecurity}</Link>
            <Link
              href={ROUTES.settings.company}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Building2 className="w-4 h-4 text-accent" />
              <span>{t.profileDropdown.companySettings}</span>
            </Link>

            <Link
              href={ROUTES.settings.web}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Globe className="w-4 h-4 text-accent" />
              <span>{t.profileDropdown.websiteSettings}</span>
            </Link>

            <Link
              href={ROUTES.settings.preferences}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Sliders className="w-4 h-4 text-accent" />
              <span className="flex-1">{t.profileDropdown.appearance}</span>
            </Link>

            <Link
              href={ROUTES.settings.audit}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-accent" />
              <span>{t.profileDropdown.auditTrail}</span>
            </Link>

            {process.env.NEXT_PUBLIC_WEB_URL ? (
              <a
                href={process.env.NEXT_PUBLIC_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-ink-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <Globe className="w-4 h-4 text-accent" />
                <div className="flex-1 flex items-center justify-between">
                  <span>{t.profileDropdown.liveSite}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 dark:text-ink-muted/70" />
                </div>
              </a>
            ) : null}
          </div>

          <div className="p-2 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmSignOutOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.profileDropdown.signOutSession}</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDestructiveModal
        isOpen={confirmSignOutOpen}
        onClose={() => setConfirmSignOutOpen(false)}
        onConfirm={handleSignOut}
        title={t.profileDropdown.signOutSession}
        description={t.profileDropdown.confirmSignOut}
        confirmLabel={t.profileDropdown.signOutSession}
        cancelLabel={t.actions.cancel}
        variant="warning"
      />
    </div>
  );
}
