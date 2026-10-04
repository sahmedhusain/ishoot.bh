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
  | "support"
  | "contracts"
  | "banners"
  | "portfolio"
  | "clients"
  | "equipment"
  | "calendar"
  | "users"
  | "settings"
  | "audit_logs"
  | "reviews"
  | "faqs"
  | "stats"
  | "moms"
  | "requests";

export type PermissionAction =
  "read" | "write" | "delete" | "export" | "approve";

interface UserState {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions?: Record<string, boolean>;
}

interface PermissionsState {
  user: UserState | null;
  loading: boolean;
}
const PermissionsContext = React.createContext<PermissionsState>({
  user: null,
  loading: true,
});

export function PermissionsProvider({
  user,
  children,
}: {
  user: UserState;
  children: React.ReactNode;
}) {
  return React.createElement(
    PermissionsContext.Provider,
    { value: { user, loading: false } },
    children,
  );
}

export function usePermissions() {
  const { user, loading } = React.useContext(PermissionsContext);
  const can = React.useCallback(
    (resource: PermissionResource, action: PermissionAction): boolean =>
      user?.permissions?.[`${resource}:${action}`] === true,
    [user],
  );
  return { user, role: user?.role, can, loading };
}
