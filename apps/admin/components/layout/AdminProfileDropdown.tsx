"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Building2,
  Sliders,
  History,
  LogOut,
  ChevronDown,
  Database,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useAdminTheme } from "../../hooks/useAdminTheme";
import { ConfirmDestructiveModal } from "@ishoot/ui";

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  avatarUrl?: string;
}

export function AdminProfileDropdown() {
  const router = useRouter();
  const { t, locale, isRTL } = useAdminLocale();
  const { theme, resolvedTheme } = useAdminTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(
    null,
  );
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let mounted = true;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.error("Failed to load active user profile:", err);
      }
    }
    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
  const displayEmail = currentUser?.email || "admin@ishoot.bh";
  const displayRole = currentUser?.role
    ? currentUser.role.replace("_", " ").toUpperCase()
    : t.profileDropdown.superAdmin;
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "IS";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 ps-2 border-s border-slate-200 dark:border-white/10 hover:opacity-90 transition-opacity focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-xs font-bold text-white font-mono shadow-sm">
          {initials}
        </div>
        <div className="hidden xl:block text-start leading-tight">
          <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
            <span>{displayName}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 dark:text-[#9EADA9] transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
          <div className="text-[10px] text-[#09937F] font-semibold font-mono">
            {displayRole}
          </div>
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-2 w-72 rounded-2xl bg-white dark:bg-[#0B1210] border border-slate-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col ${
            isRTL
              ? "left-0 sm:left-auto sm:right-0"
              : "right-0 sm:right-auto sm:left-0"
          }`}
        >
          <div className="p-4 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#014842] border border-[#09937F]/50 flex items-center justify-center text-sm font-bold text-white font-mono shrink-0 shadow-md">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#9EADA9] font-mono truncate">
                  {displayEmail}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#09937F]/15 text-[#09937F] border border-[#09937F]/30">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{displayRole}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-0.5 text-xs">
            <Link
              href="/dashboard/users"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-[#9EADA9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <User className="w-4 h-4 text-[#09937F]" />
              <span>{t.profileDropdown.userProfile}</span>
            </Link>

            <Link
              href="/dashboard/settings/company"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-[#9EADA9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Building2 className="w-4 h-4 text-[#09937F]" />
              <span>{t.profileDropdown.companySettings}</span>
            </Link>

            <Link
              href="/dashboard/settings/preferences"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-[#9EADA9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Sliders className="w-4 h-4 text-[#09937F]" />
              <div className="flex-1 flex items-center justify-between">
                <span>{t.profileDropdown.appearance}</span>
                <span className="text-[10px] font-mono text-[#09937F] bg-[#09937F]/10 px-1.5 py-0.5 rounded">
                  {resolvedTheme === "dark"
                    ? t.profileDropdown.dark
                    : t.profileDropdown.light}
                </span>
              </div>
            </Link>

            <Link
              href="/dashboard/settings/audit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-[#9EADA9] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4 text-[#09937F]" />
              <span>{t.profileDropdown.auditTrail}</span>
            </Link>
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-[10px] font-mono text-slate-500 dark:text-[#9EADA9] space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#09937F]" />
                <span>PostgreSQL 15</span>
              </span>
              <span className="text-emerald-500 dark:text-emerald-400 font-bold">
                {t.profileDropdown.connected}
              </span>
            </div>
            <div className="text-[9px] text-slate-400 dark:text-[#9EADA9]/60">
              {t.profileDropdown.serverless}
            </div>
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
