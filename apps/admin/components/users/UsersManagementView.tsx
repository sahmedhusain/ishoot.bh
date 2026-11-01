"use client";
import { PhoneInput } from "@platform/ui";
import { ModalFooter, useConfirmation } from "@platform/ui";
import { formatMessage } from "@platform/locales";
import { errorMessage } from "../../lib/error-text";
import { ROUTES } from "../../constants/routes";
import Link from "next/link";
import { ContentImage } from "../shared/ContentImage";

import * as React from "react";
import type { Profile, UserRole } from "@platform/database/types";
import { useRouter } from "next/navigation";
import { bulkUpdateUsersAction, createUserAction, deleteUserAction } from "../../app/actions/users";
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
  ConfirmDialog,
} from "@platform/ui";
import {
  UserPlus,
  Trash2,
  Search,
  Building,
  CheckCircle2,
  Lock,
  Pencil, KeyRound
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { usePermissions } from "../../hooks/usePermissions";
import { PageHeader } from "../layout/PageHeader";

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
  /** The company's departments, for the department picker. */
  departments: Array<{ id: string; name_en: string; name_ar: string }>;
  /** Server-side paging: matching accounts, this page and the filters in use. */
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; role: string; departmentId: string; status: string };
  /** Every active account (id and name), for manager names and pickers on any page. */
  people: Array<{ id: string; fullName: string }>;
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
  departments,
  total,
  page,
  pageSize,
  filters,
  people,
}: UsersManagementViewProps) {
  const modalFormId = React.useId();

  const confirmAction = useConfirmation();
  const { isArabic, t } = useAdminLocale();
  const { role: actorRole } = usePermissions();

  const router = useRouter();
  const [users, setUsers] = React.useState<Profile[]>(initialUsers);
  React.useEffect(() => setUsers(initialUsers), [initialUsers]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bulkRole, setBulkRole] = React.useState("");
  const [bulkDepartment, setBulkDepartment] = React.useState("");
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const selectable = users.filter((u) => u.role !== "super_admin").map((u) => u.id);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (next: number) => `${ROUTES.users.list}?${new URLSearchParams({ ...filters, page: String(next) })}`;
  const applyBulk = (change: { role?: string; departmentId?: string }) => confirmAction({
    description: formatMessage(t.usersBulk.confirmChange, { count: selected.length }), confirmMatchText: String(selected.length), onConfirm: async () => {
      setBulkBusy(true);
      try {
        const result = await bulkUpdateUsersAction({ userIds: selected, ...change });
        toast.success(formatMessage(t.usersBulk.updated, { count: result.updated }));
        setSelected([]);
        router.refresh();
      } catch (err) {
        setError(errorMessage(err, t, t.hrExtensions.failed));
      } finally {
        setBulkBusy(false);
      }
    }
  });
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
  const [role, setRole] = React.useState<UserRole>("employee");
  const [phone, setPhone] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const departmentName = (u: Profile) => (isArabic ? u.department_name_ar || u.department_name_en : u.department_name_en || u.department_name_ar);
  const [managerId, setManagerId] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");

  const allRoles = roles.map((r) => ({
    key: r.id as UserRole,
    name: isArabic ? r.nameAr : r.nameEn,
    color: "rgb(var(--brand-accent))",
  }));

  const filteredUsers = users;

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
        department_id: departmentId || undefined,
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
      <PageHeader
        actions={<div className="flex items-center gap-3">
          <div className="flex items-center bg-surface p-1 rounded-xl border border-outline-variant text-xs font-semibold" role="tablist">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "users"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-ink-muted hover:text-ink"
                }`}
             tabIndex={activeTab === "users" ? 0 : -1} role="tab" aria-selected={activeTab === "users"} type="button">
              {t.nav.users} ({total})
            </button>
            <button
              onClick={() => setActiveTab("matrix")}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === "matrix"
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-ink-muted hover:text-ink"
                }`}
             tabIndex={activeTab === "matrix" ? 0 : -1} role="tab" aria-selected={activeTab === "matrix"} type="button">
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
        </div>}
      />

      {successMsg && (
        <div className="p-4 rounded-2xl bg-accent/15 border border-accent/40 text-accent flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === "users" && (
        <Card className="p-0 bg-surface border border-outline-variant rounded-3xl shadow-xl overflow-hidden" data-tab-panel>
          <form method="get" action={ROUTES.users.list} role="search" className="p-4 border-b border-outline-variant flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-ink-muted absolute start-3 top-2.5" />
              <input
                type="search"
                name="q"
                aria-label={t.actions.search}
                placeholder={t.usersBulk.searchPlaceholder}
                defaultValue={filters.q}
                className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-surface-sunken border border-outline-variant text-ink placeholder:text-ink-muted focus:outline-none focus:border-accent"
              />
            </div>
            <Select name="role" defaultValue={filters.role} aria-label={t.usersView.roleHeader} className="py-1.5 px-2 text-xs rounded-xl bg-surface-sunken border border-outline-variant">
              <option value="all">{t.usersBulk.allRoles}</option>
              {allRoles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </Select>
            <Select name="departmentId" defaultValue={filters.departmentId} aria-label={t.roles.department} className="py-1.5 px-2 text-xs rounded-xl bg-surface-sunken border border-outline-variant">
              <option value="all">{t.usersBulk.allDepartments}</option>
              <option value="none">{t.usersBulk.noDepartment}</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{isArabic ? d.name_ar : d.name_en}</option>)}
            </Select>
            <Select name="status" defaultValue={filters.status} aria-label={t.usersView.statusHeader} className="py-1.5 px-2 text-xs rounded-xl bg-surface-sunken border border-outline-variant">
              {(["all", "active", "suspended", "archived", "inactive"] as const).map((status) => <option key={status} value={status}>{t.usersBulk.statuses[status]}</option>)}
            </Select>
            <Button type="submit" size="sm" variant="outline" className="rounded-xl">{t.actions.search}</Button>
            <span className="ms-auto text-xs text-ink-muted">{formatMessage(t.usersBulk.showing, { from: total ? (page - 1) * pageSize + 1 : 0, to: Math.min(total, page * pageSize), total })}</span>
          </form>

          {canWrite && selected.length > 0 && (
            <div role="region" aria-label={t.usersBulk.title} className="px-4 py-3 border-b border-outline-variant bg-accent/[0.06] flex flex-wrap items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200" data-page-toolbar>
              <span className="font-semibold">{formatMessage(t.usersBulk.selected, { count: selected.length })}</span>
              <Select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} aria-label={t.usersBulk.changeRole} className="py-1.5 px-2 rounded-xl bg-surface border border-outline-variant">
                <option value="">{t.usersBulk.changeRole}</option>
                {allRoles.filter((r) => r.key !== "super_admin").map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </Select>
              <Button type="button" size="sm" variant="outline" disabled={!bulkRole || bulkBusy} onClick={() => applyBulk({ role: bulkRole })}>{t.usersBulk.apply}</Button>
              <Select value={bulkDepartment} onChange={(e) => setBulkDepartment(e.target.value)} aria-label={t.usersBulk.changeDepartment} className="py-1.5 px-2 rounded-xl bg-surface border border-outline-variant">
                <option value="">{t.usersBulk.changeDepartment}</option>
                <option value="__none">{t.usersBulk.noDepartment}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{isArabic ? d.name_ar : d.name_en}</option>)}
              </Select>
              <Button type="button" size="sm" variant="outline" disabled={!bulkDepartment || bulkBusy} onClick={() => applyBulk({ departmentId: bulkDepartment === "__none" ? "" : bulkDepartment })}>{t.usersBulk.apply}</Button>
              <button type="button" className="ms-auto text-ink-muted hover:text-ink" onClick={() => setSelected([])}>{t.usersBulk.clear}</button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface-sunken text-ink-muted uppercase text-[11px] border-b border-outline-variant">
                <tr>
                  {canWrite && (
                    <th className="p-4 w-8">
                      <input
                        type="checkbox"
                        aria-label={t.usersBulk.selectAll}
                        checked={selectable.length > 0 && selectable.every((id) => selected.includes(id))}
                        onChange={(e) => setSelected(e.target.checked ? selectable : [])}
                      />
                    </th>
                  )}
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
              <tbody className="divide-y divide-outline-variant text-ink">
                {filteredUsers.map((u) => {
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-ink/[0.02] transition-colors"
                    >
                      {canWrite && (
                        <td className="p-4">
                          {u.role !== "super_admin" && (
                            <input
                              type="checkbox"
                              aria-label={formatMessage(t.usersBulk.selectOne, { name: u.full_name })}
                              checked={selected.includes(u.id)}
                              onChange={(e) => setSelected((prev) => (e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)))}
                            />
                          )}
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary border border-accent/40 flex items-center justify-center font-bold text-primary-foreground text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-ink text-sm">
                              <bdi dir="auto">{u.full_name}</bdi>
                            </div>
                            <div className="text-ink-muted text-[11px]">
                              <bdi dir="ltr">{u.email}</bdi>
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
                            {departmentName(u) || u.department || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-ink-muted">
                        {u.manager_name ?? t.usersManagement.noneIndependent}
                      </td>

                      <td className="p-4 text-ink">
                        <bdi dir="auto">{allRoles.find((r) => r.key === u.role)?.name ?? u.role}</bdi>
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
                            className="flex h-9 w-24 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-raised px-2 py-0.5 shadow-sm"
                            title={u.full_name}
                          >
                            <ContentImage
                              src={u.signature_url}
                              alt={`${t.usersManagement.signature} — ${u.full_name}`}
                              className="h-full w-auto object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-ink-muted">—</span>
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
          {pages > 1 && (
            <nav aria-label={t.usersBulk.pages} className="p-4 border-t border-outline-variant flex items-center justify-between text-xs">
              {page > 1 ? <Link href={pageHref(page - 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.previous}</Link> : <span />}
              <span className="text-ink-muted">{formatMessage(t.usersBulk.pageOf, { page, pages })}</span>
              {page < pages ? <Link href={pageHref(page + 1)} className="text-primary dark:text-mint font-semibold">{t.usersBulk.next}</Link> : <span />}
            </nav>
          )}
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
       footer={<div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving} form={modalFormId}>
              {saving ? t.usersView.creating : t.actions.save}
            </Button>
          </div>}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email && fullName && password) setConfirmCreate(true);
          }}
          className="space-y-4 text-xs"
         id={modalFormId}>
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
          <label className="block space-y-1.5">
            <span className="text-ink-muted font-medium">
              <bdi dir="auto">{t.usersView.fullName}</bdi>
            </span>
            <Input
              required
              placeholder={t.usersView.fullNamePlaceholder}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-ink-muted font-medium">
              <bdi dir="ltr">{t.usersView.email}</bdi>
            </span>
            <Input
              type="email"
              required
              placeholder={t.usersView.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-ink-muted font-medium">
              {t.usersView.initialPassword}
            </span>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-ink-muted font-medium">
                {t.usersView.userRole}
              </span>
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
            </label>

            <label className="block space-y-1.5">
              <span className="text-ink-muted font-medium">
                {t.usersView.department}
              </span>
              <Select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">{t.departmentsSettings.nobody}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isArabic ? d.name_ar : d.name_en}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-ink-muted font-medium">
              <bdi dir="ltr">{t.usersView.phone}</bdi>
            </span>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              dir="ltr"
              className="text-start"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-ink-muted font-medium">
              {t.usersManagement.reportsToManager}
            </span>
            <Select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            >
              <option value="">{t.usersManagement.noneExecutiveLevel}</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
          </label>


        </form>
      </Modal>

      <Modal closeLabel={t.actions.close} isOpen={confirmCreate} onClose={() => setConfirmCreate(false)} title={t.accountSettings.confirmCreateTitle} footer={null}>
        <p className="text-sm text-ink">
          {formatMessage(t.accountSettings.confirmCreateBody, { name: fullName, email: email, role: allRoles.find((r) => r.key === role)?.name ?? role })}
        </p>
        <ModalFooter><div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmCreate(false)}>{t.actions.cancel}</Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleCreateUser()}>{t.accountSettings.create}</Button>
        </div></ModalFooter>
      </Modal>

      {editing && (
        <AccountSettingsDialog
          value={editing}
          fields={["role", "managerId", "status", "discountLimitPercent"]}
          roles={allRoles.filter((r) => r.key !== "super_admin" || actorRole === "super_admin").map((r) => ({ id: r.key, name: r.name }))}
          managers={people.map((x) => ({ id: x.id, name: x.fullName }))}
          requiresApproval={false}
          onClose={() => setEditing(null)}
          onSaved={() => window.location.reload()}
        />
      )}

      <ConfirmDialog
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
