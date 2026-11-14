"use client";

import * as React from "react";
import {
  DEFAULT_ADMIN_ALLOWED_SETTINGS,
  type AdminAllowedSettings,
  type AdminSettingKey,
} from "../lib/types";

interface AdminGovernanceContextValue {
  allowed: AdminAllowedSettings;
  isAllowed: (key: AdminSettingKey) => boolean;
}

const AdminGovernanceContext =
  React.createContext<AdminGovernanceContextValue>({
    allowed: DEFAULT_ADMIN_ALLOWED_SETTINGS,
    isAllowed: (key) => DEFAULT_ADMIN_ALLOWED_SETTINGS[key],
  });

export function AdminGovernanceProvider({
  value,
  children,
}: {
  value?: Partial<AdminAllowedSettings> | null;
  children: React.ReactNode;
}) {
  const merged = React.useMemo<AdminAllowedSettings>(
    () => ({ ...DEFAULT_ADMIN_ALLOWED_SETTINGS, ...(value ?? {}) }),
    [value],
  );
  const ctx = React.useMemo<AdminGovernanceContextValue>(
    () => ({
      allowed: merged,
      isAllowed: (key) => Boolean(merged[key]),
    }),
    [merged],
  );
  return (
    <AdminGovernanceContext.Provider value={ctx}>
      {children}
    </AdminGovernanceContext.Provider>
  );
}

export function useAdminGovernance() {
  return React.useContext(AdminGovernanceContext);
}
