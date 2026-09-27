'use client';

import * as React from 'react';
import type { Profile, UserRole } from '@ishoot/database/types';
import { createUserAction, updateUserRoleAction, deleteUserAction } from '../../app/actions/users';
import { Card, Button, Modal, Input, Select, Badge, ConfirmDestructiveModal } from '@ishoot/ui';
import {
  UserPlus,
  Shield,
  Trash2,
  Search,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';

interface UsersManagementViewProps {
  initialUsers: Profile[];
}

export function UsersManagementView({ initialUsers }: UsersManagementViewProps) {
  const { t, locale, isRTL } = useAdminLocale();

  const [users, setUsers] = React.useState<Profile[]>(initialUsers);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'users' | 'matrix'>('users');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<UserRole>('producer');
  const [phone, setPhone] = React.useState('');
  const [department, setDepartment] = React.useState('production');
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');

  const allRoles: Array<{ key: UserRole; name: string; color: string }> = [
    { key: 'super_admin', name: t.roles.super_admin, color: '#E11D48' },
    { key: 'admin', name: t.roles.admin, color: '#F43F5E' },
    { key: 'finance_manager', name: t.roles.finance_manager, color: '#10B981' },
    { key: 'production_manager', name: t.roles.production_manager, color: '#09937F' },
    { key: 'producer', name: t.roles.producer, color: '#3B82F6' },
    { key: 'editor', name: t.roles.editor, color: '#8B5CF6' },
    { key: 'accountant', name: t.roles.accountant, color: '#F59E0B' },
    { key: 'viewer', name: t.roles.viewer, color: '#9EADA9' },
  ];

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !password) return;
    setSaving(true);

    try {
      const res = await createUserAction({
        full_name: fullName,
        email,
        password,
        role,
        phone,
        department,
      });

      if (res.user) {
        setUsers([res.user as Profile, ...users]);
        setSuccessMsg(`${fullName}: ${t.usersView.userCreatedSuccess}`);
        setFullName('');
        setEmail('');
        setPassword('');
        setPhone('');
        setShowCreateModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await updateUserRoleAction(userId, newRole);
    if (res.success) {
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId));
    try {
      await deleteUserAction(userId);
    } catch (err) {
      console.error(err);
    }
  };

  // 12-Module RBAC Permissions Matrix
  const modulesList = [
    { name: t.usersView.modules.dashboard, super: 'RW', admin: 'RW', fin: 'R', prod: 'R', producer: 'R', editor: 'R', acc: 'R', viewer: 'R' },
    { name: t.usersView.modules.calendar, super: 'RW', admin: 'RW', fin: '-', prod: 'RW', producer: 'RW', editor: 'R', acc: '-', viewer: 'R' },
    { name: t.usersView.modules.deals, super: 'RW', admin: 'RW', fin: 'R', prod: 'RW', producer: 'RW', editor: '-', acc: 'R', viewer: 'R' },
    { name: t.usersView.modules.contacts, super: 'RW', admin: 'RW', fin: 'R', prod: 'RW', producer: 'RW', editor: '-', acc: 'R', viewer: 'R' },
    { name: t.usersView.modules.inquiries, super: 'RW', admin: 'RW', fin: 'R', prod: 'RW', producer: 'RW', editor: '-', acc: '-', viewer: 'R' },
    { name: t.usersView.modules.invoices, super: 'RW', admin: 'RW', fin: 'RW', prod: '-', producer: 'R', editor: '-', acc: 'RW', viewer: 'R' },
    { name: t.usersView.modules.payments, super: 'RW', admin: 'RW', fin: 'RW', prod: '-', producer: '-', editor: '-', acc: 'RW', viewer: 'R' },
    { name: t.usersView.modules.expenses, super: 'RW', admin: 'RW', fin: 'RW', prod: 'RW', producer: 'RW', editor: 'R', acc: 'RW', viewer: 'R' },
    { name: t.usersView.modules.finance, super: 'RW', admin: 'RW', fin: 'RW', prod: '-', producer: '-', editor: '-', acc: 'R', viewer: '-' },
    { name: t.usersView.modules.cms, super: 'RW', admin: 'RW', fin: '-', prod: 'R', producer: 'R', editor: 'RW', acc: '-', viewer: 'R' },
    { name: t.usersView.modules.companySettings, super: 'RW', admin: 'RW', fin: 'R', prod: '-', producer: '-', editor: '-', acc: '-', viewer: '-' },
    { name: t.usersView.modules.users, super: 'RW', admin: 'R', fin: '-', prod: '-', producer: '-', editor: '-', acc: '-', viewer: '-' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-display flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#09937F]" />
            <span>{t.roles.privilegesMatrix}</span>
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {t.usersView.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center bg-[#0B1210] p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'users'
                  ? 'bg-[#09937F] text-white shadow-sm'
                  : 'text-[#9EADA9] hover:text-white'
              }`}
            >
              {t.nav.users} ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'matrix'
                  ? 'bg-[#09937F] text-white shadow-sm'
                  : 'text-[#9EADA9] hover:text-white'
              }`}
            >
              {t.usersView.permissionsMatrix}
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2 shadow-lg shadow-[#09937F]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.actions.addUser}</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-[#09937F]/15 border border-[#09937F]/40 text-[#09937F] flex items-center gap-3 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card className="p-0 bg-[#0B1210] border border-white/10 rounded-3xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-[#9EADA9] absolute start-3 top-2.5" />
              <input
                type="text"
                placeholder={t.actions.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl bg-[#050807] border border-white/10 text-white placeholder:text-[#9EADA9]/60 focus:outline-none focus:border-[#09937F]"
              />
            </div>
            <div className="text-xs font-mono text-[#9EADA9]">
              {filteredUsers.length} {t.roles.userCount}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#070C0A] text-[#9EADA9] font-mono uppercase text-[11px] border-b border-white/10">
                <tr>
                  <th className="p-4 text-start">{t.usersView.userHeader}</th>
                  <th className="p-4 text-start">{t.roles.department}</th>
                  <th className="p-4 text-start">{t.usersView.roleHeader}</th>
                  <th className="p-4 text-start">{t.usersView.statusHeader}</th>
                  <th className="p-4 text-end">{t.usersView.actionsHeader}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white">
                {filteredUsers.map((u) => {
                  const roleConfig = allRoles.find((r) => r.key === u.role) || allRoles[7];
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#014842] border border-[#09937F]/40 flex items-center justify-center font-mono font-bold text-white text-xs">
                            {u.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{u.full_name}</div>
                            <div className="text-[#9EADA9] text-[11px] font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[#9EADA9] font-mono">
                          <Building className="w-3.5 h-3.5 text-[#09937F]" />
                          <span className="capitalize">
                            {(u.department && (t.usersView.departments as any)[u.department]) || u.department || t.usersView.departments.operations}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="bg-[#050807] border border-white/10 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-[#09937F] cursor-pointer"
                        >
                          {allRoles.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          {t.roles.statusActive}
                        </span>
                      </td>

                      <td className="p-4 text-end">
                        {u.role !== 'super_admin' && (
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

      {/* Permissions Matrix Tab (Odoo-grade RBAC matrix) */}
      {activeTab === 'matrix' && (
        <Card className="p-6 bg-[#0B1210] border border-white/10 rounded-3xl shadow-xl overflow-x-auto space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {t.usersView.matrixTitle}
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-400">
                {t.usersView.rwLegend}
              </span>
              <span className="text-blue-400">
                {t.usersView.rLegend}
              </span>
              <span className="text-[#9EADA9]/40">
                {t.usersView.naLegend}
              </span>
            </div>
          </div>

          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-[#9EADA9] text-start">
                <th className="py-2.5 text-start font-sans font-bold">
                  {t.usersView.moduleHeader}
                </th>
                <th className="py-2.5 text-center">{t.roles.super_admin}</th>
                <th className="py-2.5 text-center">{t.roles.admin}</th>
                <th className="py-2.5 text-center">{t.roles.finance_manager}</th>
                <th className="py-2.5 text-center">{t.roles.production_manager}</th>
                <th className="py-2.5 text-center">{t.roles.producer}</th>
                <th className="py-2.5 text-center">{t.roles.editor}</th>
                <th className="py-2.5 text-center">{t.roles.accountant}</th>
                <th className="py-2.5 text-center">{t.roles.viewer}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {modulesList.map((m, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-3 text-white font-sans font-semibold">{m.name}</td>
                  <td className="py-3 text-center text-emerald-400 font-bold">{m.super}</td>
                  <td className="py-3 text-center text-emerald-400 font-bold">{m.admin}</td>
                  <td className="py-3 text-center text-emerald-400">{m.fin}</td>
                  <td className="py-3 text-center text-emerald-400">{m.prod}</td>
                  <td className="py-3 text-center text-blue-400">{m.producer}</td>
                  <td className="py-3 text-center text-purple-400">{m.editor}</td>
                  <td className="py-3 text-center text-amber-400">{m.acc}</td>
                  <td className="py-3 text-center text-[#9EADA9]/60">{m.viewer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t.actions.addUser}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
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
            <label className="text-[#9EADA9] font-medium">
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
            <label className="text-[#9EADA9] font-medium">
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
              <label className="text-[#9EADA9] font-medium">
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
              <label className="text-[#9EADA9] font-medium">
                {t.usersView.department}
              </label>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="production">{t.usersView.departments.production}</option>
                <option value="finance">{t.usersView.departments.finance}</option>
                <option value="post_production">{t.usersView.departments.post_production}</option>
                <option value="executive">{t.usersView.departments.executive}</option>
                <option value="operations">{t.usersView.departments.operations}</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#9EADA9] font-medium">
              {t.usersView.phone}
            </label>
            <Input
              placeholder={t.usersView.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(false)}
            >
              {t.actions.cancel}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving
                ? t.usersView.creating
                : t.actions.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Safeguard Modal */}
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
