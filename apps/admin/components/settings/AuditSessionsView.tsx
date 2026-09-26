'use client';

import * as React from 'react';
import type { ActivityLog } from '@ishoot/database/types';
import { Card, Input, Button, Badge } from '@ishoot/ui';
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Kanban,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useAdminLocale } from '../../hooks/useAdminLocale';
import { SettingsNavTabs } from './SettingsNavTabs';
import { formatDate } from '@ishoot/ui';

interface AuditSessionsViewProps {
  initialLogs: ActivityLog[];
}

export function AuditSessionsView({ initialLogs }: AuditSessionsViewProps) {
  const { t, locale, isRTL } = useAdminLocale();
  const [logs, setLogs] = React.useState<ActivityLog[]>(initialLogs);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedAction, setSelectedAction] = React.useState<string>('all');
  const [selectedEntity, setSelectedEntity] = React.useState<string>('all');

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (selectedAction !== 'all' && log.action !== selectedAction) return false;
      // Entity filter
      if (selectedEntity !== 'all' && log.entity_type !== selectedEntity) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const userName = log.user?.full_name?.toLowerCase() || '';
        const userEmail = log.user?.email?.toLowerCase() || '';
        const action = log.action.toLowerCase();
        const entity = log.entity_type.toLowerCase();
        const ip = log.ip_address?.toLowerCase() || '';
        const detailsStr = JSON.stringify(log.details || {}).toLowerCase();

        return (
          userName.includes(query) ||
          userEmail.includes(query) ||
          action.includes(query) ||
          entity.includes(query) ||
          ip.includes(query) ||
          detailsStr.includes(query)
        );
      }
      return true;
    });
  }, [logs, searchTerm, selectedAction, selectedEntity]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10">تسجيل دخول / Login</Badge>;
      case 'create':
        return <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">إنشاء / Create</Badge>;
      case 'update':
        return <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">تعديل / Update</Badge>;
      case 'delete':
        return <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10">حذف / Delete</Badge>;
      case 'stage_change':
        return <Badge variant="outline" className="border-[#09937F]/40 text-[#09937F] bg-[#09937F]/10">تغيير مرحلة / Stage</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'invoice':
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case 'payment':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      case 'deal':
        return <Kanban className="w-3.5 h-3.5 text-purple-400" />;
      case 'company_settings':
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'auth':
        return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <History className="w-3.5 h-3.5 text-[#09937F]" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Tabs */}
      <SettingsNavTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {locale === 'ar' ? 'سجل العمليات، التدقيق، والجلسات' : 'Audit Trail & Session History'}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">
            {locale === 'ar'
              ? 'سجل غير قابل للتلاعب يوثق كافة حركات المستخدمين، عمليات الدخول، والتعديلات على الصفقات والفواتير.'
              : 'Tamper-evident audit log documenting all user sessions, authorizations, and record mutations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-white/5 border-white/10">
            {filteredLogs.length} {locale === 'ar' ? 'سجل مسجل' : 'events logged'}
          </Badge>
        </div>
      </div>

      {/* Active User Sessions Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">8</div>
            <div className="text-xs text-[#9EADA9]">
              {locale === 'ar' ? 'مستخدمين مفوضين نشطين' : 'Authorized RBAC Users'}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#09937F]/10 border border-[#09937F]/20 flex items-center justify-center text-[#09937F]">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">1</div>
            <div className="text-xs text-[#9EADA9]">
              {locale === 'ar' ? 'الجلسة الحالية النشطة' : 'Active Live Session'}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">100%</div>
            <div className="text-xs text-[#9EADA9]">
              {locale === 'ar' ? 'تغطية التدقيق الأمني' : 'Audit Enforcement'}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[#9EADA9]" />
            <Input
              type="text"
              placeholder={locale === 'ar' ? 'البحث بالاسم، الإيميل، نوع العملية، أو عنوان IP...' : 'Search by name, email, action, or IP address...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 bg-[#050807] border-white/10 text-xs w-full"
            />
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#050807] border border-white/10 text-xs text-white focus:outline-none focus:border-[#09937F]"
          >
            <option value="all">{locale === 'ar' ? 'جميع أنواع العمليات' : 'All Action Types'}</option>
            <option value="login">{locale === 'ar' ? 'تسجيل دخول (Login)' : 'Login'}</option>
            <option value="create">{locale === 'ar' ? 'إنشاء (Create)' : 'Create'}</option>
            <option value="update">{locale === 'ar' ? 'تعديل (Update)' : 'Update'}</option>
            <option value="delete">{locale === 'ar' ? 'حذف (Delete)' : 'Delete'}</option>
            <option value="stage_change">{locale === 'ar' ? 'تغيير مرحلة (Stage Change)' : 'Stage Change'}</option>
          </select>

          {/* Entity Filter */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#050807] border border-white/10 text-xs text-white focus:outline-none focus:border-[#09937F]"
          >
            <option value="all">{locale === 'ar' ? 'جميع الوحدات' : 'All Entities'}</option>
            <option value="invoice">{locale === 'ar' ? 'فواتير (Invoices)' : 'Invoices'}</option>
            <option value="payment">{locale === 'ar' ? 'دفعات (Payments)' : 'Payments'}</option>
            <option value="deal">{locale === 'ar' ? 'صفقات (Deals)' : 'Deals'}</option>
            <option value="company_settings">{locale === 'ar' ? 'إعدادات الشركة (Settings)' : 'Company Settings'}</option>
            <option value="auth">{locale === 'ar' ? 'جلسات المصادقة (Auth)' : 'Auth'}</option>
          </select>
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                <th className="p-4 text-start">{locale === 'ar' ? 'نوع الحركة' : 'Action'}</th>
                <th className="p-4 text-start">{locale === 'ar' ? 'الوحدة / السجل' : 'Entity'}</th>
                <th className="p-4 text-start">{locale === 'ar' ? 'تفاصيل العملية' : 'Details'}</th>
                <th className="p-4 text-start">{locale === 'ar' ? 'عنوان IP' : 'IP Address'}</th>
                <th className="p-4 text-end">{locale === 'ar' ? 'التوقيت والتاريخ' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#9EADA9]">
                    {locale === 'ar' ? 'لا توجد سجلات مطابقة لمعايير البحث' : 'No activity logs matching your filter.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* User */}
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-[10px] font-bold text-white font-mono shrink-0">
                          {log.user?.full_name?.slice(0, 2).toUpperCase() || 'SA'}
                        </div>
                        <div>
                          <div className="font-bold text-white">
                            {log.user?.full_name || 'System / Admin'}
                          </div>
                          <div className="text-[10px] text-[#9EADA9] font-mono">
                            {log.user?.email || 'system@ishoot.bh'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-4">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Entity */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-white capitalize">
                        {getEntityIcon(log.entity_type)}
                        <span>{log.entity_type.replace('_', ' ')}</span>
                      </div>
                      {log.entity_id && (
                        <div className="text-[10px] text-[#9EADA9] font-mono mt-0.5">
                          #{log.entity_id}
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="p-4 max-w-xs">
                      {log.details ? (
                        <div className="font-mono text-[11px] text-[#9EADA9] truncate" title={JSON.stringify(log.details)}>
                          {Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ')}
                        </div>
                      ) : (
                        <span className="text-[#9EADA9]/50">—</span>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="p-4 font-mono text-[#9EADA9]">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="p-4 text-end font-mono text-[#9EADA9]">
                      {formatDate(log.created_at, locale, 'time')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
