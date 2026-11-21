import * as React from "react";
import {
  CompanyCurrencyProvider,
  ConfirmationProvider,
  PhoneCountryProvider,
  StatusLabelsProvider,
} from "@platform/ui";
import { PERMISSION_GROUPS } from "../../lib/constants/permissions";
import { SidebarProvider } from "../../components/layout/SidebarContext";
import { LiveProvider } from "../../components/live/LiveProvider";
import { AdminGovernanceProvider } from "../../hooks/useAdminGovernance";
import { AdminLocaleProvider } from "../../hooks/useAdminLocale";
import { AdminThemeProvider } from "../../hooks/useAdminTheme";
import { CompanyVatProvider } from "../../hooks/useCompanyVat";
import { FeatureTogglesProvider } from "../../hooks/useFeatureToggles";
import { PermissionsProvider } from "../../hooks/usePermissions";
import { UnsavedChangesProvider } from "../../hooks/useUnsavedChanges";
import enLocale from "../../locales/en.json";
import type { AdminTranslations } from "../../lib/translations";

export const adminEn = enLocale.admin as unknown as AdminTranslations;

const ALL_ACTIONS = ["read", "write", "create", "edit", "delete", "approve", "export", "manage"];
export const FULL_ADMIN_PERMS: Record<string, boolean> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.resources).flatMap((r) => ALL_ACTIONS.map((a) => [`${r}:${a}`, true])),
);

export const DEFAULT_USER = {
  id: "usr-1",
  fullName: "Tariq Al-Zayed",
  email: "admin@example.test",
  role: "admin" as const,
  avatarUrl: null,
  permissions: FULL_ADMIN_PERMS,
  managesTeam: true,
};

export function AdminTestProviders({
  children,
  allowed = {},
  features = [],
}: {
  children: React.ReactNode;
  allowed?: Record<string, boolean>;
  features?: { moduleKey: string; isEnabled: boolean }[];
}) {
  return React.createElement(
    AdminLocaleProvider,
    { initialLocale: "en", initialTranslations: adminEn },
    React.createElement(
      AdminThemeProvider,
      { defaultTheme: "light" },
      React.createElement(
        AdminGovernanceProvider,
        {
          value: {
            company: true,
            web: true,
            tax: true,
            appearance: true,
            domains: true,
            deployments: true,
            roles: true,
            audit: true,
            privacy: true,
            approvals: true,
            departments: true,
            storeSettings: true,
            deliverySettings: true,
            requestsSettings: true,
            hrSettings: true,
            ...allowed,
          },
        },
        React.createElement(
          CompanyVatProvider,
          {
            value: {
              enabled: true,
              rate: 10,
              taxes: [
                {
                  code: "VAT10",
                  name_en: "VAT 10%",
                  name_ar: "ضريبة 10%",
                  rate: 10,
                  invoices: true,
                  quotations: true,
                },
              ],
            },
          },
          React.createElement(
            FeatureTogglesProvider,
            { initialFeatures: features },
            React.createElement(
              PermissionsProvider,
              { user: DEFAULT_USER },
              React.createElement(
                CompanyCurrencyProvider,
                { currency: "BHD" },
                React.createElement(
                  PhoneCountryProvider,
                  { country: "BH" },
                  React.createElement(
                    StatusLabelsProvider,
                    { value: adminEn.statusLabels ?? {} },
                    React.createElement(
                      ConfirmationProvider,
                      null,
                      React.createElement(
                        UnsavedChangesProvider,
                        null,
                        React.createElement(
                          SidebarProvider,
                          null,
                          React.createElement(LiveProvider, { userId: "usr-1" }, children),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

/**
 * Resolves async React Server Components recursively into plain React elements
 * for faithful jsdom rendering without mocking child server components.
 */
export async function resolveServerJsx(node: unknown): Promise<React.ReactNode> {
  if (node == null || typeof node !== "object") return node as React.ReactNode;
  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => resolveServerJsx(item)));
  }
  const el = node as React.ReactElement<Record<string, unknown>>;
  if (!el.type) return el;
  if (typeof el.type === "function") {
    const fn = el.type as (props: Record<string, unknown>) => unknown;
    const isAsync = fn.constructor?.name === "AsyncFunction";
    if (isAsync) {
      const rendered = fn(el.props ?? {});
      if (rendered && typeof (rendered as Promise<unknown>).then === "function") {
        const awaited = await (rendered as Promise<unknown>);
        return resolveServerJsx(awaited);
      }
      return rendered as React.ReactNode;
    }
  }
  if (el.props && "children" in el.props) {
    const children = await resolveServerJsx(el.props.children);
    return React.cloneElement(el, undefined, children);
  }
  return el;
}
