"use client";

import { formatMessage } from "@platform/locales";
import * as React from "react";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react";
import { Button, Card, Badge, Modal, Input, ConfirmDialog } from "@platform/ui";
import {
  ALL_ACTIONS,
  PERMISSION_GROUPS,
  isDefaultAllowed,
  type PermissionAction,
} from "@platform/database/constants/permissions";
import { DATA_SCOPES, DATA_SCOPE_AREAS, defaultDataScope } from "@platform/database/constants/data-scope";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { upsertRoleAction, deleteRoleAction } from "../../app/actions/roles";
import type { RoleWithGrants } from "../../types/roles";

/** "write" is a legacy aggregate of create/edit and is derived on save. */
const MATRIX_ACTIONS = ALL_ACTIONS.filter((action): action is Exclude<PermissionAction, "write"> => action !== "write");

export function RolesManagementView({ initialRoles }: { initialRoles: RoleWithGrants[] }) {
  const { t, isRTL } = useAdminLocale();
  const labels = t.permissionLabels;
  const [roles, setRoles] = React.useState(initialRoles);
  React.useEffect(() => setRoles(initialRoles), [initialRoles]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<RoleWithGrants | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [nameEn, setNameEn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [grants, setGrants] = React.useState<Record<string, boolean>>({});
  const [scopes, setScopes] = React.useState<Record<string, string>>({});
  const isSuperAdmin = editingRole?.id === "super_admin";

  const baseline = React.useMemo(() => editingRole?.grants ?? {}, [editingRole]);
  const changedKeys = React.useMemo(
    () => Object.keys(grants).filter((key) => grants[key] !== (baseline[key] ?? false)),
    [grants, baseline],
  );

  const openEditor = (role: RoleWithGrants | null) => {
    setEditingRole(role);
    setNameEn(role?.nameEn ?? "");
    setNameAr(role?.nameAr ?? "");
    setGrants({ ...(role?.grants ?? {}) });
    setScopes({ ...(role?.scopes ?? Object.fromEntries(DATA_SCOPE_AREAS.map((area) => [area, "all"]))) });
    setIsModalOpen(true);
  };

  const toggle = (key: string) => {
    if (isSuperAdmin) return;
    setGrants((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetToDefaults = () => {
    if (!editingRole || isSuperAdmin) return;
    const next: Record<string, boolean> = {};
    for (const group of PERMISSION_GROUPS)
      for (const resource of group.resources)
        for (const action of MATRIX_ACTIONS)
          next[`${resource}:${action}`] = isDefaultAllowed(editingRole.id, resource, action);
    setGrants(next);
    setScopes(Object.fromEntries(DATA_SCOPE_AREAS.map((area) => [area, defaultDataScope(editingRole.id, area)])));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      // New roles submit their full matrix; existing roles submit only the cells that changed.
      const submitted = editingRole
        ? Object.fromEntries(changedKeys.map((key) => [key, grants[key] === true]))
        : Object.fromEntries(Object.entries(grants).filter(([key]) => !key.endsWith(":write")));
      await upsertRoleAction({ id: editingRole?.id, nameEn, nameAr, grants: submitted, scopes: isSuperAdmin ? undefined : scopes });
      toast.success(t.rolesView.saveSuccess);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error(t.rolesView.saveError);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRoleAction(deleteId);
      setRoles(roles.filter((r) => r.id !== deleteId));
    } catch (error) {
      console.error(error);
      toast.error(t.rolesView.deleteError);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.rolesView.title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.rolesView.subtitle}</p>
        </div>
        <Button onClick={() => openEditor(null)} className="bg-accent text-white">
          <Plus className="w-4 h-4 me-2" />
          {t.rolesView.newRole}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-5 flex flex-col justify-between dark:bg-surface-raised">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">{isRTL ? role.nameAr : role.nameEn}</h3>
                  <Badge variant={role.isSystem ? "emerald" : "default"} className="mt-1">
                    {role.isSystem ? t.rolesView.systemRole : t.rolesView.customRole}
                  </Badge>
                </div>
                <Shield className={`w-5 h-5 ${role.isSystem ? "text-emerald-500" : "text-slate-400"}`} />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-4 h-4" />
                {formatMessage(t.rolesView.usersAssigned, { count: String(role.userCount) })}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => openEditor(role)} className="flex-1">
                <Edit className="w-3.5 h-3.5 me-1" /> {t.rolesView.editPermissions}
              </Button>
              {!role.isSystem && role.userCount === 0 && (
                <Button variant="danger" size="sm" onClick={() => setDeleteId(role.id)} aria-label={t.rolesView.deleteConfirmTitle}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal closeLabel={t.actions.close}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRole ? t.rolesView.editRole : t.rolesView.newRole}
        className="max-w-5xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs font-bold block">
              <span className="mb-1 block">{t.rolesView.roleNameEn}</span>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
            </label>
            <label className="text-xs font-bold block">
              <span className="mb-1 block">{t.rolesView.roleNameAr}</span>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
            </label>
          </div>

          {isSuperAdmin && (
            <p className="text-sm text-slate-500" role="note">{t.rolesView.superAdminPermissionsNotice}</p>
          )}

          {!isSuperAdmin && (
            <fieldset className="rounded-xl border border-ink/10 p-4 space-y-3">
              <legend className="px-1 text-xs font-bold">{t.dataScope.title}</legend>
              <p className="text-xs text-slate-500">{t.dataScope.hint}</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {DATA_SCOPE_AREAS.map((area) => (
                  <label key={area} className="text-xs font-medium space-y-1">
                    <span className="block">{t.dataScope.areas[area]}</span>
                    <select value={scopes[area] ?? "all"} onChange={(e) => setScopes((prev) => ({ ...prev, [area]: e.target.value }))} className="w-full h-9 rounded-lg border border-ink/15 bg-surface px-2 text-xs">
                      {DATA_SCOPES.map((scope) => (
                        <option key={scope} value={scope}>{t.dataScope.scopes[scope]}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="border rounded-xl overflow-auto max-h-[55vh] dark:border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-surface-sunken text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-bold">{t.rolesView.thModule}</th>
                  {MATRIX_ACTIONS.map((action) => (
                    <th key={action} scope="col" className="px-2 py-2 text-center font-semibold whitespace-nowrap">
                      {labels.actions[action]}
                    </th>
                  ))}
                </tr>
              </thead>
              {PERMISSION_GROUPS.map((group) => (
                <tbody key={group.key} className="divide-y dark:divide-white/5">
                  <tr className="bg-slate-100/70 dark:bg-white/5">
                    <th scope="colgroup" colSpan={MATRIX_ACTIONS.length + 1} className="px-3 py-1.5 text-start font-bold text-slate-600 dark:text-slate-300">
                      {labels.groups[group.key as keyof typeof labels.groups]}
                    </th>
                  </tr>
                  {group.resources.map((resource) => (
                    <tr key={resource} className="dark:bg-surface-raised">
                      <th scope="row" className="px-3 py-2 text-start font-medium whitespace-nowrap">
                        {labels.resources[resource]}
                      </th>
                      {MATRIX_ACTIONS.map((action) => {
                        const key = `${resource}:${action}`;
                        return (
                          <td key={action} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              aria-label={`${labels.resources[resource]} — ${labels.actions[action]}`}
                              checked={isSuperAdmin || grants[key] === true}
                              disabled={isSuperAdmin}
                              onChange={() => toggle(key)}
                              className="accent-accent"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {editingRole && !isSuperAdmin && (
                <Button type="button" variant="ghost" size="sm" onClick={resetToDefaults}>
                  {t.rolesView.resetDefaults}
                </Button>
              )}
              {editingRole && changedKeys.length > 0 && (
                <span role="status">{formatMessage(t.rolesView.unsavedChanges, { count: String(changedKeys.length) })}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t.rolesView.cancel}</Button>
              <Button type="submit" disabled={saving} className="bg-accent text-white">{t.rolesView.saveRole}</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.rolesView.deleteConfirmTitle}
        description={t.rolesView.deleteConfirmDesc}
      />
    </div>
  );
}
