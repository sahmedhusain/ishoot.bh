"use client";
import { useNavigationGuard } from "../../hooks/useUnsavedChanges";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  ShieldCheck,
  SlidersHorizontal,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "../../constants/routes";
import { usePermissions } from "../../hooks/usePermissions";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { useHeaderPopover } from "../../hooks/useHeaderPopover";
import { PresenceAvatar } from "../live/PresenceAvatar";
import { StatusDialog, StatusSummary } from "../live/StatusEditor";
export function AdminProfileDropdown() {
  const { t } = useAdminLocale();
  const { user } = usePermissions();
  const router = useRouter();
  const { requestNavigation, navigateConfirmed } = useNavigationGuard();
  const [busy, setBusy] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const menu = useHeaderPopover("account");
  const p = t.accountMenu;
  const role = user?.role
    ? user.role
        .replace(/^staff_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const signOut = async () => {
    menu.setOpen(false);
    if (!(await requestNavigation())) return;
    setBusy(true);
    try {
      const result = await fetch("/api/auth/logout", { method: "POST" });
      if (!result.ok) throw Error();
      menu.setOpen(false);
      navigateConfirmed(ROUTES.login, true);
      router.refresh();
    } catch {
      toast.error(p.signOutFailed);
      setBusy(false);
    }
  };
  const links = [
    { href: ROUTES.profile(), label: p.profile, icon: UserRound },
    {
      href: ROUTES.profile() + "#security",
      label: p.security,
      icon: ShieldCheck,
    },
    {
      href: ROUTES.settings.preferences,
      label: t.profileDropdown.appearance,
      icon: SlidersHorizontal,
    },
  ];
  return (
    <div ref={menu.containerRef} className="relative">
      <button
        ref={menu.triggerRef}
        type="button"
        onClick={() => menu.setOpen(!menu.open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            menu.setOpen(true);
          }
        }}
        aria-label={p.title}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls="account-menu"
        className="flex h-10 items-center gap-2 rounded-full px-1.5 text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {user ? (
          <PresenceAvatar userId={user.id} name={user.fullName} src={user.avatarUrl} size={32} />
        ) : (
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <UserRound className="h-4 w-4" />
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={`hidden h-3 w-3 sm:block transition-transform ${menu.open ? "rotate-180" : ""}`}
        />
      </button>
      {menu.open && (
        <div
          id="account-menu"
          role="menu"
          aria-label={p.title}
          ref={menu.panelRef}
          onKeyDown={menu.onKeyDown}
          className="admin-popover absolute end-0 top-full z-50 mt-3 w-80 max-sm:fixed max-sm:inset-x-3 max-sm:mt-0 max-sm:w-auto"
        >
          <div data-popup-header className="admin-popover-header flex items-start gap-3">
            {user && <PresenceAvatar userId={user.id} name={user.fullName} src={user.avatarUrl} size={44} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink text-start">
                <bdi dir="auto">{user?.fullName ?? t.profileDropdown.adminUser}</bdi>
              </p>
              <p className="mt-1 truncate text-xs text-ink-muted text-start">
                <bdi dir="ltr">{user?.email}</bdi>
              </p>
              <p className="mt-2 text-xs text-primary dark:text-mint text-start">{role}</p>
            </div>
          </div>
          <div className="admin-popover-body">
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                menu.setOpen(false);
                setStatusOpen(true);
              }}
              className="flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-start text-sm text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:bg-accent/10"
            >
              <span className="font-medium">{t.presence.setStatus}</span>
              <StatusSummary className="max-w-full" />
            </button>
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                role="menuitem"
                href={href}
                onClick={() => menu.setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-ink/5 focus-visible:outline-none focus-visible:bg-accent/10"
              >
                <Icon aria-hidden className="h-4 w-4 text-ink-muted" />
                {label}
              </Link>
            ))}
          </div>
          <div data-popup-footer className="admin-popover-footer">
            <button
              role="menuitem"
              type="button"
              disabled={busy}
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut aria-hidden className="h-4 w-4" />
              )}
              {t.profileDropdown.signOutSession}
            </button>
          </div>
        </div>
      )}
      <StatusDialog isOpen={statusOpen} onClose={() => setStatusOpen(false)} />
    </div>
  );
}
