"use client";

import * as React from "react";
import type { UserRole } from "@ishoot/database/types";

export type PermissionResource =
  | "invoices"
  | "payments"
  | "expenses"
  | "finance_analytics"
  | "deals"
  | "contacts"
  | "leads"
  | "contracts"
  | "banners"
  | "portfolio"
  | "clients"
  | "equipment"
  | "calendar"
  | "users"
  | "settings"
  | "audit_logs" | "reviews" | "faqs" | "stats";

export type PermissionAction =
  "read" | "write" | "delete" | "export" | "approve";

export const CLIENT_ROLE_RULES: Record<
  string,
  Partial<Record<PermissionResource, PermissionAction[]>>
> = {
  super_admin: {},
  admin: {
    invoices: ["read", "write", "export", "approve"],
    payments: ["read", "write", "export"],
    expenses: ["read", "write", "export"],
    finance_analytics: ["read", "export"],
    deals: ["read", "write", "delete", "export"],
    contacts: ["read", "write", "delete", "export"],
    leads: ["read", "write", "delete", "export"],
    contracts: ["read", "write", "export"],
    banners: ["read", "write", "delete"],
    portfolio: ["read", "write", "delete"],
    clients: ["read", "write", "delete"],
    equipment: ["read", "write", "delete"],
    calendar: ["read", "write", "delete"],
    users: ["read", "write"],
    settings: ["read", "write"],
    audit_logs: ["read"],
  },
  finance_manager: {
    invoices: ["read", "write", "export", "approve"],
    payments: ["read", "write", "export", "approve"],
    expenses: ["read", "write", "export", "approve"],
    finance_analytics: ["read", "export"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
    calendar: ["read"],
  },
  accountant: {
    invoices: ["read", "write", "export"],
    payments: ["read", "write", "export"],
    expenses: ["read", "write", "export"],
    finance_analytics: ["read"],
    deals: ["read"],
    contacts: ["read"],
    contracts: ["read"],
  },
  production_manager: {
    deals: ["read", "write", "export"],
    contacts: ["read", "write"],
    leads: ["read", "write"],
    contracts: ["read", "write"],
    equipment: ["read", "write"],
    calendar: ["read", "write", "delete"],
    portfolio: ["read"],
    invoices: ["read"],
  },
  producer: {
    deals: ["read", "write"],
    contacts: ["read", "write"],
    leads: ["read", "write"],
    contracts: ["read"],
    equipment: ["read", "write"],
    calendar: ["read", "write"],
    portfolio: ["read"],
  },
  sales: {
    deals: ["read", "write", "delete", "export"],
    contacts: ["read", "write", "delete", "export"],
    leads: ["read", "write", "delete", "export"],
    contracts: ["read", "write"],
    calendar: ["read", "write"],
    invoices: ["read"],
  },
  marketing: {
    banners: ["read", "write", "delete"],
    portfolio: ["read", "write", "delete"],
    clients: ["read", "write", "delete"],
    leads: ["read", "write"],
    calendar: ["read", "write"],
    equipment: ["read"],
  },
  editor: {
    portfolio: ["read", "write"],
    banners: ["read"],
    equipment: ["read"],
    calendar: ["read"],
  },
  viewer: {
    deals: ["read"],
    contacts: ["read"],
    leads: ["read"],
    portfolio: ["read"],
    clients: ["read"],
    equipment: ["read"],
    calendar: ["read"],
  },
};

interface UserState {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions?: Record<string, boolean>;
}

export function usePermissions() {
  const [user, setUser] = React.useState<UserState | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.user) {
            setUser(data.user);
          }
        }
      } catch (err) {
        console.error("Failed to load user permissions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMe();
    return () => {
      mounted = false;
    };
  }, []);

  const can = React.useCallback(
    (resource: PermissionResource, action: PermissionAction): boolean => {
      if (!user) return false;
      if (user.role === "super_admin") return true;

      if (user.permissions) {
        const key = `${resource}:${action}`;
        if (typeof user.permissions[key] === "boolean") {
          return user.permissions[key];
        }
      }

      const rules = CLIENT_ROLE_RULES[user.role];
      if (!rules) return false;
      const allowedActions = rules[resource];
      return allowedActions ? allowedActions.includes(action) : false;
    },
    [user],
  );

  return {
    user,
    role: user?.role,
    can,
    loading,
  };
}
