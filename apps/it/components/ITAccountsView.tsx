"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Key,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
} from "lucide-react";
import { Button, Card, Input, Select } from "@platform/ui";
import { itAllowed } from "@platform/contracts";
import { formatMessage } from "@platform/locales";
import type { ITAccountPage, ITProvisioning, ITRoleDraft } from "@platform/api-client";
import {
  createITAccountAction,
  updateITAccountAction,
} from "../app/(desk)/it-accounts/actions";
import { useCopy } from "./CopyProvider";
import { PageTitle } from "./ticket-ui";
import { CriticalActionModal } from "./CriticalActionModal";

const TAB_RESOURCES = [
  { key: "tickets", label: "Ticket Queue", group: "Workspace" },
  { key: "ticket_settings", label: "SLA Targets", group: "Workspace" },
  { key: "modules", label: "Feature Modules", group: "Platform" },
  { key: "integrations", label: "Integrations & RFC", group: "Platform" },
  { key: "domains", label: "Site & DNS", group: "Platform" },
  { key: "setup", label: "Company Setup", group: "Platform" },
  { key: "staff_accounts", label: "Staff Accounts", group: "Access" },
  { key: "staff_roles", label: "Staff Roles (RBAC)", group: "Access" },
  { key: "it_accounts", label: "IT Team Accounts", group: "Access" },
  { key: "sessions", label: "Active Sessions", group: "Access" },
  { key: "audit", label: "Audit Trail", group: "Access" },
  { key: "system_health", label: "System Health", group: "Operations" },
  { key: "logs", label: "System Logs & Traces", group: "Operations" },
  { key: "database", label: "Database Operations", group: "Operations" },
  { key: "jobs", label: "Background Jobs", group: "Operations" },
  { key: "backups", label: "Database Backups", group: "Operations" },
  { key: "api_keys", label: "API Keys", group: "Operations" },
  { key: "notifications", label: "Notifications Log", group: "Operations" },
] as const;

export function ITAccountsView({
  page,
  cursor,
  userRoles = [],
  userEmail = "",
  canCreate,
  canEdit,
  dbRoles = [],
}: {
  page: ITAccountPage;
  cursor: string;
  userRoles?: string[];
  userEmail?: string;
  canCreate: boolean;
  canEdit: boolean;
  dbRoles?: ITRoleDraft[];
}) {
  const { copy, role, date } = useCopy();
  const n = copy.itAccounts;
  const router = useRouter();
  const passwordId = React.useId();
  const [busy, setBusy] = React.useState(false);

  // Tab Access Matrix View State
  const [showMatrix, setShowMatrix] = React.useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = React.useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState("");

  // Confirmation modal state for modifying access
  const [pendingUpdate, setPendingUpdate] = React.useState<{
    id: string;
    email: string;
    role: string;
    active: boolean;
    formData: FormData;
  } | null>(null);

  const [provisioning, setProvisioning] = React.useState<
    (ITProvisioning & { email: string }) | null
  >(null);

  // Dynamic role hierarchy delegation from database
  const effectiveRoleList = dbRoles;
  const userRoleObjects = dbRoles.filter((r) => userRoles.includes(r.id));
  const isTopLevelRole = userRoleObjects.some((r) => !r.reportingToRole);
  const isTeamLead = !isTopLevelRole;

  const isRoleSubordinate = (roleId: string): boolean => {
    if (isTopLevelRole) return true;
    let current = dbRoles.find((r) => r.id === roleId);
    while (current && current.reportingToRole) {
      if (userRoles.includes(current.reportingToRole)) return true;
      current = dbRoles.find((r) => r.id === current?.reportingToRole);
    }
    return false;
  };

  const availableRoles = isTopLevelRole
    ? dbRoles
    : dbRoles.filter((r) => isRoleSubordinate(r.id));

  const roleOptions = availableRoles.map((r) => (
    <option key={r.id} value={r.id}>
      {copy.app.languageCode === "ar" ? r.nameAr : r.nameEn} ({r.id})
    </option>
  ));

  const handleFormSubmit = (
    event: React.FormEvent<HTMLFormElement>,
    account?: { id: string; email: string; currentRole: string; currentActive: boolean }
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    if (account) {
      const nextRole = String(data.get("role"));
      const nextActive = data.get("active") === "on";
      setPendingUpdate({
        id: account.id,
        email: account.email,
        role: nextRole,
        active: nextActive,
        formData: data,
      });
    } else {
      void executeSubmit(data);
    }
  };

  const executeSubmit = async (data: FormData, id?: string) => {
    setBusy(true);
    try {
      const outcome = id
        ? await updateITAccountAction(id, data)
        : await createITAccountAction(data);
      if (!outcome.ok) {
        toast.error(n.errors[outcome.reason] || n.errors.invalid);
        return;
      }
      if (outcome.provisioning)
        setProvisioning({
          ...outcome.provisioning,
          email: String(data.get("email")),
        });
      toast.success(id ? n.saved : n.created);
      setPendingUpdate(null);
      router.refresh();
    } catch {
      toast.error(n.errors.unavailable);
    } finally {
      setBusy(false);
    }
  };

  // Filtered account items based on user criteria
  const filteredItems = React.useMemo(() => {
    return page.items.filter((item) => {
      if (
        searchQuery.trim() &&
        !item.email.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      if (selectedRoleFilter && !item.roles.includes(selectedRoleFilter)) {
        return false;
      }
      if (selectedStatusFilter === "active" && !item.active) {
        return false;
      }
      if (selectedStatusFilter === "suspended" && item.active) {
        return false;
      }
      return true;
    });
  }, [page.items, searchQuery, selectedRoleFilter, selectedStatusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle
          title={n.matrixModalTitle || n.title}
          description={n.matrixModalDesc || n.description}
        />

        <div className="flex items-center gap-2">
          <span className="it-status-pane font-bold text-amber-700 dark:text-amber-400">
            T-CODE: SU10 [USER AUTHORIZATION]
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMatrix((prev) => !prev)}
            className="flex items-center gap-1.5 font-mono text-xs"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{showMatrix ? n.hideMatrix : n.viewMatrix}</span>
            {showMatrix ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Team Lead Delegation Banner */}
      {isTeamLead && (
        <div className="p-3 border-2 border-amber-500/40 bg-amber-500/10 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="it-badge it-badge-warn">{n.teamLeadMode}</span>
            <span className="text-ink">{n.teamLeadBanner}</span>
          </div>
          <span className="text-ink-muted text-[11px]">{n.delegationActive}</span>
        </div>
      )}

      {/* Tab Access Privilege Matrix Inspector */}
      {showMatrix && (
        <Card className="it-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-ink">
                {n.matrixTitle}
              </h2>
              <p className="text-xs text-ink-muted font-sans">
                {n.matrixSubtitle}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="it-table w-full font-mono text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-56">{copy.app.menuSystem || "RESOURCE"}</th>
                  <th className="w-32">{n.role || "GROUP"}</th>
                  {effectiveRoleList.map((r) => (
                    <th key={r.id} className="text-center">
                      {copy.app.languageCode === "ar" ? r.nameAr : r.nameEn}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TAB_RESOURCES.map((tab) => (
                  <tr key={tab.key}>
                    <td className="font-semibold text-ink">
                      {tab.label} <span className="text-ink-muted font-normal text-[10px]">[{tab.key}]</span>
                    </td>
                    <td className="text-ink-muted">{tab.group}</td>
                    {effectiveRoleList.map((r) => {
                      const canRead = itAllowed([r.id], tab.key, "read");
                      const canEditTab =
                        itAllowed([r.id], tab.key, "edit") ||
                        itAllowed([r.id], tab.key, "execute");
                      return (
                        <td key={`${tab.key}-${r.id}`} className="text-center">
                          {canEditTab ? (
                            <span className="it-badge it-badge-active" title="Full Read & Execute / Edit">
                              {n.fullAccess}
                            </span>
                          ) : canRead ? (
                            <span className="it-badge it-badge-neutral" title="Read Only">
                              {n.viewOnly}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Provisioning Credential Card */}
      {provisioning && (
        <Card role="status" className="it-card p-5 border-2 border-emerald-500/60 bg-emerald-500/5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="uppercase tracking-wider">{n.provisioning}</h2>
          </div>
          <p dir="ltr" className="font-bold text-ink">{provisioning.email}</p>
          <p className="text-xs text-ink-muted font-sans">{n.provisioningHint}</p>
          <div className="p-2 border border-outline-variant bg-surface select-all">
            <span className="text-ink-muted">{n.secret}: </span>
            <code dir="ltr" className="font-bold text-ink">{provisioning.secret}</code>
          </div>
          <p>
            <a href={provisioning.otpAuthUrl} className="underline text-sky-600 font-semibold" target="_blank" rel="noreferrer">
              {n.setupLink}
            </a>
          </p>
          <div>
            <span className="font-bold text-ink">{n.recoveryCodes}:</span>
            <pre dir="ltr" className="mt-1 p-2 border border-outline-variant bg-surface select-all text-[11px]">
              {provisioning.recoveryCodes.join("\n")}
            </pre>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setProvisioning(null)}
            className="font-mono text-xs"
          >
            {n.dismiss}
          </Button>
        </Card>
      )}

      {/* Account Creation Form */}
      {canCreate && (
        <Card className="it-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2 font-mono text-xs font-bold uppercase text-ink">
            <Users className="h-4 w-4 text-sky-600" />
            <span>{n.create}</span>
          </div>

          <form
            aria-label={n.create}
            onSubmit={(event) => void handleFormSubmit(event)}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono"
            aria-busy={busy}
          >
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase text-ink-muted">{n.email}</span>
              <Input
                name="email"
                type="email"
                dir="ltr"
                autoComplete="off"
                required
                maxLength={254}
                disabled={busy}
                className="text-xs font-mono"
              />
            </label>

            <div className="space-y-1">
              <label htmlFor={passwordId} className="block text-[10px] font-bold uppercase text-ink-muted">
                {n.password}
              </label>
              <Input
                id={passwordId}
                name="password"
                type="password"
                aria-describedby={`${passwordId}-hint`}
                autoComplete="new-password"
                required
                minLength={page.passwordMinLength}
                maxLength={1024}
                disabled={busy}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-ink-muted">{n.role}</label>
              <Select
                name="role"
                aria-label={n.role}
                defaultValue={availableRoles[0]?.id ?? ""}
                disabled={busy}
                className="text-xs font-mono"
              >
                {roleOptions}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase text-ink-muted">{n.reportingTo}</label>
              <Select
                name="reportingTo"
                aria-label={n.reportingTo}
                defaultValue=""
                disabled={busy}
                className="text-xs font-mono"
              >
                <option value="">{n.noReportsTo}</option>
                {page.items
                  .filter((acc) => acc.active)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.email}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={busy} size="sm" className="w-full font-mono text-xs">
                {n.create}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Enterprise Filter and Search Toolbar */}
      <div className="it-card p-3 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold uppercase text-ink">
            <Filter className="size-3.5 text-amber-600" />
            <span>{n.rolesAndSessions}</span>
          </div>
          <span className="text-[10px] text-ink-muted">
            {n.teamMembers}: {filteredItems.length} / {page.items.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Search by Email */}
          <div className="relative">
            <input
              type="text"
              placeholder={n.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="it-field-sunken w-full ps-6"
            />
            <Search className="absolute start-1.5 top-2 size-3 text-slate-400" />
          </div>

          {/* Role Filter Dropdown */}
          <div>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{n.filterRole}: {n.filterAll}</option>
              {effectiveRoleList.map((r) => (
                <option key={r.id} value={r.id}>
                  {copy.app.languageCode === "ar" ? r.nameAr : r.nameEn} ({r.id})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="it-field-sunken w-full"
            >
              <option value="">{n.filterStatus}: {n.filterAll}</option>
              <option value="active">{n.filterActive}</option>
              <option value="suspended">{n.filterSuspended}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Existing IT Accounts List */}
      <div className="space-y-3 font-mono text-xs">
        <ul className="space-y-2.5" aria-label={n.title}>
          {filteredItems.map((account) => {
            const isSelf = account.email === userEmail;
            const targetRole = account.roles[0];
            const targetRoleObj = dbRoles.find((r) => r.id === targetRole);
            const canManageTargetRole = isTopLevelRole || (targetRoleObj ? isRoleSubordinate(targetRoleObj.id) : false);
            const canModifyThisAccount = canEdit && canManageTargetRole;

            return (
              <li key={`${account.id}:${account.roles.join(",")}:${account.active}`}>
                <Card className="it-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-ink font-mono">
                        <bdi dir="ltr">{account.email}</bdi>
                      </h3>
                      {isSelf && (
                        <span className="it-badge it-badge-active">{n.currentSession}</span>
                      )}
                      <span className={`it-badge ${account.active ? "it-badge-active" : "it-badge-error"}`}>
                        {account.active ? n.filterActive : n.filterSuspended}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-muted font-sans">
                      {n.lastLogin}: {account.lastLoginAt ? date(account.lastLoginAt) : n.never} •{" "}
                      {account.mfaEnabled ? (
                        <span className="text-emerald-600 font-semibold">{n.twoFaEnrolled}</span>
                      ) : (
                        <span className="text-amber-600">{n.twoFaMissing}</span>
                      )}
                      {" • "}
                      <span className="font-semibold text-ink">
                        {n.reportingTo}: {account.reportingToEmail || account.reportingTo || n.noReportsTo}
                      </span>
                    </div>
                  </div>

                  <form
                    aria-label={account.email}
                    onSubmit={(event) =>
                      handleFormSubmit(event, {
                        id: account.id,
                        email: account.email,
                        currentRole: account.roles[0],
                        currentActive: account.active,
                      })
                    }
                    className="flex flex-wrap items-center gap-3"
                    aria-busy={busy}
                  >
                    <div className="w-56">
                      <Select
                        name="role"
                        aria-label={n.role}
                        defaultValue={account.roles[0]}
                        disabled={!canModifyThisAccount || busy}
                        className="text-xs font-mono"
                      >
                        {availableRoles.map((r) => (
                          <option
                            key={r.id}
                            value={r.id}
                            disabled={!isTopLevelRole && !isRoleSubordinate(r.id)}
                          >
                            {copy.app.languageCode === "ar" ? r.nameAr : r.nameEn} ({r.id})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-56">
                      <Select
                        name="reportingTo"
                        aria-label={n.reportingTo}
                        defaultValue={account.reportingTo || ""}
                        disabled={!canModifyThisAccount || busy}
                        className="text-xs font-mono"
                      >
                        <option value="">{n.noReportsTo}</option>
                        {page.items
                          .filter((acc) => acc.id !== account.id && acc.active)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.email}
                            </option>
                          ))}
                      </Select>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-sans">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={account.active}
                        disabled={!canModifyThisAccount || busy || isSelf}
                        className="size-3.5"
                      />
                      <span>{n.active}</span>
                    </label>

                    {canModifyThisAccount && (
                      <Button type="submit" size="sm" variant="outline" disabled={busy} className="font-mono text-xs ms-auto">
                        {n.save}
                      </Button>
                    )}
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pagination */}
      <div className="flex gap-4 mt-6 text-xs font-mono underline">
        {cursor && <Link href="/it-accounts">{n.first}</Link>}
        {page.nextCursor && (
          <Link href={`/it-accounts?cursor=${encodeURIComponent(page.nextCursor)}`}>
            {n.next}
          </Link>
        )}
      </div>

      {/* Critical Action Modal for Access Modifications */}
      {pendingUpdate && (
        <CriticalActionModal
          open={Boolean(pendingUpdate)}
          title={`Modify Access for ${pendingUpdate.email}`}
          description={`You are about to change the role of ${pendingUpdate.email} to "${role(pendingUpdate.role, dbRoles)}" (Status: ${pendingUpdate.active ? n.filterActive : n.filterSuspended}).`}
          impactDetails={[
            "Existing active login sessions for this account will be revoked immediately.",
            pendingUpdate.active === false
              ? "Account will be locked out and unable to access the IT portal."
              : "Account will gain permissions defined for this role in the authorization matrix.",
            "Changes will be recorded in the security audit trail.",
          ]}
          requiredConfirmationText={pendingUpdate.active === false ? "LOCK" : undefined}
          confirmLabel={n.save}
          dangerLevel={pendingUpdate.active === false ? "critical" : "warning"}
          busy={busy}
          onConfirm={() => executeSubmit(pendingUpdate.formData, pendingUpdate.id)}
          onCancel={() => setPendingUpdate(null)}
        />
      )}
    </div>
  );
}
