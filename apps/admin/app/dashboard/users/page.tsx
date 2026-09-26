'use client';

import * as React from 'react';
import { UserPlus, Shield, Key, Mail, CheckCircle2, UserCheck, Search } from 'lucide-react';
import { Button } from '@ishoot/ui';

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'producer' | 'editor';
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = React.useState<UserItem[]>([
    {
      id: '1',
      email: 'admin@ishoot.bh',
      fullName: 'Super Admin',
      role: 'super_admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      email: 'producer@ishoot.bh',
      fullName: 'Lead Producer',
      role: 'producer',
      createdAt: new Date().toISOString(),
    },
  ]);

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'super_admin' | 'producer' | 'editor'>('editor');
  const [initialPassword, setInitialPassword] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState('');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !initialPassword) return;

    const newUser: UserItem = {
      id: String(Date.now()),
      email,
      fullName,
      role,
      createdAt: new Date().toISOString(),
    };

    setUsers([newUser, ...users]);
    setSuccessMsg(`تم إنشاء المستخدم بنجاح! كلمة المرور الأولية: ${initialPassword}`);
    setFullName('');
    setEmail('');
    setInitialPassword('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
            إدارة المستخدمين والصلاحيات / User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            إضافة مستخدمين جدد، تعيين كلمة المرور الأولية وإدارة صلاحيات النظام
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="bg-[#014842] hover:bg-[#02665D] text-white flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد / Add User</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="البحث عن مستخدم..."
              className="w-full pr-9 pl-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#014842]"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            إجمالي المستخدمين: {users.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
              <tr>
                <th className="p-4">الاسم الكامل / Name</th>
                <th className="p-4">البريد الإلكتروني / Email</th>
                <th className="p-4">الدور والصلاحية / Role</th>
                <th className="p-4">تاريخ الإنشاء / Date</th>
                <th className="p-4 text-center">الإجراءات / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#014842]/10 text-[#014842] flex items-center justify-center font-bold">
                      {u.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900">{u.fullName}</span>
                  </td>
                  <td className="p-4 text-slate-600">{u.email}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        u.role === 'super_admin'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : u.role === 'producer'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {u.role === 'super_admin' ? 'مدير عام (Super Admin)' : u.role === 'producer' ? 'منتج (Producer)' : 'محرر (Editor)'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString('ar-BH')}</td>
                  <td className="p-4 text-center space-x-2 space-x-reverse">
                    <button className="px-2.5 py-1 text-[11px] font-semibold text-[#014842] hover:bg-[#014842]/10 rounded-lg transition-colors">
                      إعادة تعيين كلمة المرور
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#014842]" />
                <span>إضافة مستخدم جديد</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الاسم الكامل / Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#014842]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">البريد الإلكتروني / Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@ishoot.bh"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#014842]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">الصلاحية / Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#014842]"
                >
                  <option value="editor">محرر محتوى (Editor)</option>
                  <option value="producer">منتج تنفيذي (Producer)</option>
                  <option value="super_admin">مدير نظام عام (Super Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">كلمة المرور الأولية / Initial Password</label>
                <input
                  type="password"
                  required
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#014842]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  سيتم تزويد المستخدم بهذه كلمة المرور، وسيطلب منه تغييرها عند أول تسجيل دخول.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" className="bg-[#014842] hover:bg-[#02665D] text-white text-xs">
                  إنشاء المستخدم
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
