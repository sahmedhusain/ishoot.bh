"use client";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import { ContentImage } from "../shared/ContentImage";

import * as React from "react";
import type { Profile, UserRole } from "@platform/database/types";
import { createUserAction, deleteUserAction } from "../../app/actions/users";
import { RolePermissionMatrix } from "./RolePermissionMatrix";
import { UserPermissionOverrides } from "./UserPermissionOverrides";
import { AccountSettingsDialog, type AccountSettingsValue } from "../shared/AccountSettingsDialog";
import { toast } from "sonner";
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDestructiveModal,
} from "@platform/ui";
import {
  UserPlus,
  Shield,
  Trash2,
  Search,
  Building,
  CheckCircle2,
  Lock,
  Pencil, KeyRound } from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";

interface UsersManagementViewProps {
  canWrite: boolean;
  canDelete: boolean;
  /** May create employee records (HR), used for the "create employee profile" shortcut. */
  canCreateEmployees?: boolean;
  employees: Array<{
    id: string;
    employeeNumber: string;
    firstNameEn: string;
    lastNameEn: string;
    email: string | null;
  }>;
  initialUsers: Profile[];
  roles: Array<{ id: string; nameEn: string; nameAr: string }>;
  resources: string[];
  rolePermissions: Record<string, Record<string, boolean>>;
}

export function UsersManagementView({
  initialUsers,
  canWrite,
  canDelete,
  canCreateEmployees = false,
  employees,
  roles,
  resources,
  rolePermissions,
}: UsersManagementViewProps) {
  const { t, isRTL } = useAdminLocale();
  const { role: actorRole } = usePermissions();

  const [users, setUsers] = React.useState<Profile[]>(initialUsers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"users" | "matrix">("users");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
    null,
  );

  const [employeeId, setEmployeeId] = React.useState("");
  const [editing, setEditing] = React.useState<AccountSettingsValue | null>(null);
  const [overridesFor, setOverridesFor] = React.useState<Profile | null>(null);
  const [confirmCreate, setConfirmCreate] = React.useState(false);
  const [error, setError] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("producer");
  const [phone, setPhone] = React.useState("");
  const [department, setDepartment] = React.useState("production");
  const [managerId, setManagerId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  const allRoles = roles.map((r) => ({
    key: r.id as UserRole,
    name: isRTL ? r.nameAr : r.nameEn,
    color: "rgb(var(--brand-accent))",
  }));

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department &&
        u.department.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const statusOf = (u: Profile): AccountSettingsValue["status"] =>
    u.archived_at ? "archived" : u.suspended_at ? "suspended" : u.is_active ? "active" : "inactive";
  const accountValue = (u: Profile): AccountSettingsValue => ({
    userId: u.id,
    fullName: u.full_name,
    role: u.role,
    managerId: u.manager_id ?? null,
    status: statusOf(u),
    discountLimitPercent: u.discount_limit_percent ?? null,
    commissionRatePercent: u.commission_rate_percent ?? null,
  });

  const handleCreateUser = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !fullName || !password) return;
    setConfirmCreate(false);
    setSaving(true);

    try {
      const res = await createUserAction({
        employeeId,
        full_name: fullName,
        email,
        password,
        role,
        phone,
        department,
        manager_id: managerId || undefined,
      });

      if (res.user) {
        setUsers([res.user as Profile, ...users]);
        setSuccessMsg(`${fullName}: ${t.usersView.userCreatedSuccess}`);
        toast.success(`${fullName}: ${t.usersView.userCreatedSuccess}`);
        setFullName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setManagerId("");
        setShowCreateModal(false);
      }
    } catch (err) {
      setError(errorMessage(err, t, t.hrExtensions.failed));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserAction(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success(t.actions.delete);
    } catch (err) {
      setError(errorMessage(err, t, t.hrExtensions.failed));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {error && (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-display flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            <span>{t.roles.privilegesMatrix}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-1">{t.usersView.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface p-1 rounded-xl border border-ink/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "users"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.nav.users} ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "matrix"
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.usersView.permissionsMatrix}
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            disabled={!canWrite}
            onClick={() => setShowCreateModal(true)}
            className="gap-2 shadow-lg shadow-accent/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.actions.addUser}</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-accent/15 border border-accent/40 text-accent flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === "users" && (
        <Card className="p-0 bg-surface border border-ink/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-ink/10 flex items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-ink-muted absolute start-3 top-2.5" />
              <input
                type="text"
                placeholder={t.actions.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-surface-sunken border border-ink/10 text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-accent"
              />
            </div>
            <div className="text-xs  text-ink-muted">
              {filteredUsers.length} {t.roles.userCount}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface-sunken text-ink-muted uppercase text-[11px] border-b border-ink/10">
                <tr>
                  <th className="p-4 text-start">{t.usersView.userHeader}</th>
                  <th className="p-4 text-start">{t.roles.department}</th>
                  <th className="p-4 text-start">{t.usersManagement.reportsTo}</th>
                  <th className="p-4 text-start">{t.usersView.roleHeader}</th>
                  <th className="p-4 text-start">{t.usersManagement.discountLimit}</th>
                  <th className="p-4 text-start">{t.usersManagement.signature}</th>
                  <th className="p-4 text-start">{t.usersView.statusHeader}</th>
                  <th className="p-4 text-end">{t.usersView.actionsHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5 text-ink">
                {filteredUsers.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-ink/[0.02] transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary border border-accent/40 flex items-center justify-center font-bold text-white text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-ink text-sm">
                              {u.full_name}
                            </div>
                            <div className="text-ink-muted text-[11px]">
                              {u.email}
                            </div>
                            {!u.employee_id && (
                              <div className="mt-1 flex items-center gap-2 text-[11px]">
                                <span className="text-amber-400">{t.hrSelfService.employeeNotLinked}</span>
                                {canCreateEmployees && (
                                  <Link href={ROUTES.hr.newEmployee({ userId: u.id })} className="text-primary dark:text-mint underline">
                                    {t.hrSelfService.createEmployeeProfile}
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-ink-muted">
                          <Building className="w-3.5 h-3.5 text-accent" />
                          <span className="capitalize">
                            {(u.department &&
                              (t.usersView.departments as any)[u.department]) ||
                              u.department ||
                              t.usersView.departments.operations}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-ink-muted">
                        {users.find((x) => x.id === u.manager_id)?.full_name ?? t.usersManagement.noneIndependent}
                      </td>

                      <td className="p-4 text-ink">
                        {allRoles.find((r) => r.key === u.role)?.name ?? u.role}
                      </td>

                      <td className="p-4 text-ink-muted">
                        {u.role === "super_admin"
                          ? t.usersManagement.unlimited
                          : u.discount_limit_percent == null
                            ? t.usersManagement.companyDefault
                            : <bdi dir="ltr">{u.discount_limit_percent}%</bdi>}
                      </td>

                      {/* Digital Signature Preview */}
                      <td className="p-4">
                        {u.signature_url ? (
                          <div
                            className="flex h-9 w-24 items-center justify-center overflow-hidden rounded-lg border border-ink/10 bg-white px-2 py-0.5 shadow-sm"
                            title={u.full_name}
                          >
                            <ContentImage
                              src={u.signature_url}
                              alt={`${t.usersManagement.signature} — ${u.full_name}`}
                              className="h-full w-auto object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-ink-muted/60">—</span>
                        )}
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          {u.archived_at
                            ? t.hrExtensions.archived
                            : u.suspended_at
                              ? t.hrExtensions.suspended
                              : u.employee_status === "on_leave"
                                ? t.hrExtensions.on_leave
                                : u.is_active
                                  ? t.hrExtensions.active
                                  : t.hrExtensions.inactive}
                        </span>
                      </td>

                      <td className="p-4 text-end whitespace-nowrap">
                        {u.role === "super_admin" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-medium text-ink-muted" title={t.accountSettings.protectedHint}>
                            <Lock className="w-3 h-3" />
                            {t.accountSettings.lockedRow}
                          </span>
                        ) : canWrite ? (
                          <span className="inline-flex gap-1.5">
                            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(accountValue(u))}>
                              <Pencil className="w-3.5 h-3.5" />
                              {t.accountSettings.editShort}
                            </Button>
                            {actorRole === "super_admin" && (
                              <Button type="button" size="sm" variant="ghost" onClick={() => setOverridesFor(u)} title={t.permissionOverrides.open}>
                                <KeyRound className="w-3.5 h-3.5" />
                                {Object.keys(u.permissions ?? {}).filter((k) => !k.endsWith(":write")).length ? t.permissionOverrides.customized : t.permissionOverrides.open}
                              </Button>
                            )}
                          </span>
                        ) : null}
                        {canDelete && u.role !== "super_admin" && (
                          <button
                            onClick={() => setDeleteTargetId(u.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                            title={t.actions.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "matrix" && <RolePermissionMatrix roles={allRoles} rolePermissions={rolePermissions} />}

      {overridesFor && (
        <UserPermissionOverrides
          user={{ id: overridesFor.id, name: overridesFor.full_name, role: overridesFor.role, permissions: overridesFor.permissions as Record<string, boolean> | null }}
          roleGrants={rolePermissions[overridesFor.role] ?? {}}
          onClose={() => setOverridesFor(null)}
        />
      )}

      <Modal closeLabel={t.actions.close}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.actions.addUser}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email && fullName && password) setConfirmCreate(true);
          }}
          className="space-y-4 text-xs"
        >
          <label>
            {t.hrExtensions.employeeFirst}
            <Select
              required
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                const employee = employees.find(
                  (item) => item.id === e.target.value,
                );
                if (employee) {
                  setFullName(`${employee.firstNameEn} ${employee.lastNameEn}`);
                  setEmail(employee.email || "");
                }
              }}
            >
              <option value="">{t.hrExtensions.selectEmployee}</option>
              {employees
                .filter(
                  (item) => !users.some((user) => user.employee_id === item.id),
                )
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeNumber} — {employee.firstNameEn}{" "}
                    {employee.lastNameEn}
                  </option>
                ))}
            </Select>
          </label>
          <Link href={ROUTES.hr.newEmployee()}>
            {t.hrExtensions.createEmployee}
          </Link>
          {error && <p role="alert">{error}</p>}
          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">
              {t.usersView.fullName}
            </label>
            <Input
              required
              placeholder={t.usersView.fullNamePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">
              {t.usersView.email}
            </label>
            <Input
              type="email"
              required
              placeholder={t.usersView.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">
              {t.usersView.initialPassword}
            </label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-ink-muted font-medium">
                {t.usersView.userRole}
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                {allRoles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-muted font-medium">
                {t.usersView.department}
              </label>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="production">
                  {t.usersView.departments.production}
                </option>
                <option value="finance">
                  {t.usersView.departments.finance}
                </option>
                <option value="post_production">
                  {t.usersView.departments.post_production}
                </option>
                <option value="executive">
                  {t.usersView.departments.executive}
                </option>
                <option value="operations">
                  {t.usersView.departments.operations}
                </option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">
              {t.usersView.phone}
            </label>
            <Input
              placeholder={t.usersView.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="text-start"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-ink-muted font-medium">
              {t.usersManagement.reportsToManager}
            </label>
            <Select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">{t.usersManagement.noneExecutiveLevel}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </Select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-ink/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? t.usersView.creating : t.actions.save}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal closeLabel={t.actions.close} isOpen={confirmCreate} onClose={() => setConfirmCreate(false)} title={t.accountSettings.confirmCreateTitle}>
        <p className="text-sm text-ink">
          {formatMessage(t.accountSettings.confirmCreateBody, { name: fullName, email: email, role: allRoles.find((r) => r.key === role)?.name ?? role })}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCreate(false)}>{t.actions.cancel}</Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleCreateUser()}>{t.accountSettings.create}</Button>
        </div>
      </Modal>

      {editing && (
        <AccountSettingsDialog
          value={editing}
          fields={["role", "managerId", "status", "discountLimitPercent"]}
          roles={allRoles.filter((r) => r.key !== "super_admin" || actorRole === "super_admin").map((r) => ({ id: r.key, name: r.name }))}
          managers={users.filter((x) => x.is_active).map((x) => ({ id: x.id, name: x.full_name }))}
          requiresApproval={false}
          onClose={() => setEditing(null)}
          onSaved={() => window.location.reload()}
        />
      )}

      <ConfirmDestructiveModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            await handleDeleteUser(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        title={t.actions.delete}
        description={t.usersView.confirmDelete}
        confirmLabel={t.actions.delete}
        cancelLabel={t.actions.cancel}
      />
    </div>
  );
}
