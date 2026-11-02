"use client";

import * as React from "react";
import type {
  UserRole,
  PermissionResource,
  PermissionAction,
} from "@platform/database";

export type { PermissionResource, PermissionAction };

interface UserState {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  /** The profile photo's address; the initials show without one. */
  avatarUrl?: string | null;
  permissions?: Record<string, boolean>;
  /** Has direct reports or heads a department (or is an admin), so sees the team page. */
  managesTeam?: boolean;
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
  return {
    user,
    role: user?.role,
    can,
    loading,
    managesTeam: user?.managesTeam === true,
  };
}
