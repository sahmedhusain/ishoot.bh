"use client";

import * as React from "react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { Button, Card, Badge, Modal, Input, ConfirmDestructiveModal } from "@ishoot/ui";
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react";
import { upsertRoleAction, deleteRoleAction } from "../../app/actions/roles";

const MODULES = [
  "invoices",
  "payments",
  "expenses",
  "finance_analytics",
  "deals",
  "contacts",
  "leads",
  "support",
  "contracts",
  "banners",
  "portfolio",
  "clients",
  "equipment",
  "calendar",
  "users",
  "settings",
  "audit_logs",
  "reviews",
  "faqs",
  "stats",
];

export function RolesManagementView({ initialRoles }: { initialRoles: any[] }) {
  const { t, isRTL } = useAdminLocale();
  const [roles, setRoles] = React.useState(initialRoles);

  React.useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<any | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Form State
  const [nameEn, setNameEn] = React.useState("");
  const [nameAr, setNameAr] = React.useState("");
  const [permissions, setPermissions] = React.useState<Record<string, any>>({});

  const handleOpenNew = () => {
    setEditingRole(null);
    setNameEn("");
    setNameAr("");
    setPermissions({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditingRole(role);
    setNameEn(role.nameEn);
    setNameAr(role.nameAr);
    const perms: Record<string, any> = {};
    (role.permissions || []).forEach((p: any) => {
      perms[p.module] = p;
    });
    setPermissions(perms);
    setIsModalOpen(true);
  };

  const togglePermission = (module: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[module] || {
        module,
        canRead: false,
        canWrite: false,
        canDelete: false,
        canApprove: false,
      };
      return {
        ...prev,
        [module]: { ...current, [action]: !current[action] },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsertRoleAction({
        id: editingRole?.id,
        nameEn,
        nameAr,
        permissions: Object.values(permissions),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRoleAction(deleteId);
      setRoles(roles.filter((r) => r.id !== deleteId));
    } catch (error) {
      console.error(error);
      alert(t.rolesView.deleteError);
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
          <p className="text-xs text-slate-500 mt-1">
            {t.rolesView.subtitle}
          </p>
        </div>
        <Button onClick={handleOpenNew} className="bg-[#09937F] text-white">
          <Plus className="w-4 h-4 mr-2" />
          {t.rolesView.newRole}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-5 flex flex-col justify-between dark:bg-[#111C19]">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">
                    {isRTL ? role.nameAr : role.nameEn}
                  </h3>
                  <Badge variant={role.isSystem ? "emerald" : "default"} className="mt-1">
                    {role.isSystem ? t.rolesView.systemRole : t.rolesView.customRole}
                  </Badge>
                </div>
                <Shield className={`w-5 h-5 ${role.isSystem ? "text-emerald-500" : "text-slate-400"}`} />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <Users className="w-4 h-4" />
                {t.rolesView.usersAssigned.replace("{count}", String(role._count?.users ?? 0))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-white/10">
              <Button variant="outline" size="sm" onClick={() => handleOpenEdit(role)} className="flex-1">
                <Edit className="w-3.5 h-3.5 mr-1" /> {t.rolesView.editPermissions}
              </Button>
              {!role.isSystem && (role._count?.users ?? 0) === 0 && (
                <Button variant="danger" size="sm" onClick={() => setDeleteId(role.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRole ? t.rolesView.editRole : t.rolesView.newRole}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-1 block">{t.rolesView.roleNameEn}</label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block">{t.rolesView.roleNameAr}</label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden dark:border-white/10">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-[#050807] text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t.rolesView.thModule}</th>
                  <th className="px-4 py-3 text-center">{t.rolesView.thRead}</th>
                  <th className="px-4 py-3 text-center">{t.rolesView.thWrite}</th>
                  <th className="px-4 py-3 text-center">{t.rolesView.thDelete}</th>
                  <th className="px-4 py-3 text-center">{t.rolesView.thApprove}</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-white/10">
                {MODULES.map((mod) => (
                  <tr key={mod} className="dark:bg-[#111C19]">
                    <td className="px-4 py-3  text-xs">{mod}</td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod]?.canRead || false} onChange={() => togglePermission(mod, "canRead")} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod]?.canWrite || false} onChange={() => togglePermission(mod, "canWrite")} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod]?.canDelete || false} onChange={() => togglePermission(mod, "canDelete")} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={permissions[mod]?.canApprove || false} onChange={() => togglePermission(mod, "canApprove")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>{t.rolesView.cancel}</Button>
            <Button type="submit" className="bg-[#09937F] text-white">{t.rolesView.saveRole}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDestructiveModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.rolesView.deleteConfirmTitle}
        description={t.rolesView.deleteConfirmDesc}
      />
    </div>
  );
}
