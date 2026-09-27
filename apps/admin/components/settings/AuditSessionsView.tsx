"use client";

import * as React from "react";
import type { ActivityLog } from "@ishoot/database/types";
import { Card, Input, Badge } from "@ishoot/ui";
import {
  History,
  Shield,
  Search,
  CheckCircle2,
  FileText,
  CreditCard,
  Kanban,
  Building2,
  Laptop,
} from "lucide-react";
import { useAdminLocale } from "../../hooks/useAdminLocale";
import { SettingsNavTabs } from "./SettingsNavTabs";
import { formatDate } from "@ishoot/ui";

interface AuditSessionsViewProps {
  initialLogs: ActivityLog[];
}

export function AuditSessionsView({ initialLogs }: AuditSessionsViewProps) {
  const { t, locale } = useAdminLocale();
  const [logs] = React.useState<ActivityLog[]>(initialLogs);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedAction, setSelectedAction] = React.useState<string>("all");
  const [selectedEntity, setSelectedEntity] = React.useState<string>("all");

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (selectedAction !== "all" && log.action !== selectedAction)
        return false;
      if (selectedEntity !== "all" && log.entity_type !== selectedEntity)
        return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const userName = log.user?.full_name?.toLowerCase() || "";
        const userEmail = log.user?.email?.toLowerCase() || "";
        const action = log.action.toLowerCase();
        const entity = log.entity_type.toLowerCase();
        const ip = log.ip_address?.toLowerCase() || "";
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
      case "login":
        return (
          <Badge
            variant="outline"
            className="border-blue-500/40 text-blue-400 bg-blue-500/10"
          >
            {t.audit.loginAction}
          </Badge>
        );
      case "create":
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
          >
            {t.audit.createAction}
          </Badge>
        );
      case "update":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 text-amber-400 bg-amber-500/10"
          >
            {t.audit.updateAction}
          </Badge>
        );
      case "delete":
        return (
          <Badge
            variant="outline"
            className="border-rose-500/40 text-rose-400 bg-rose-500/10"
          >
            {t.audit.deleteAction}
          </Badge>
        );
      case "stage_change":
        return (
          <Badge
            variant="outline"
            className="border-[#09937F]/40 text-[#09937F] bg-[#09937F]/10"
          >
            {t.audit.stageChangeAction}
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "invoice":
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
      case "payment":
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400" />;
      case "deal":
        return <Kanban className="w-3.5 h-3.5 text-purple-400" />;
      case "company_settings":
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case "auth":
        return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <History className="w-3.5 h-3.5 text-[#09937F]" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <SettingsNavTabs />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
            {t.audit.title}
          </h1>
          <p className="text-xs text-[#9EADA9] mt-1">{t.audit.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-xs px-3 py-1 bg-white/5 border-white/10"
          >
            {filteredLogs.length} {t.audit.eventsLogged}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">8</div>
            <div className="text-xs text-[#9EADA9]">
              {t.audit.authorizedUsers}
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
              {t.audit.activeSession}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-[#0B1210] border border-white/10 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-mono font-bold text-white">100%</div>
            <div className="text-xs text-[#9EADA9]">{t.audit.enforcement}</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-[#0B1210] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[#9EADA9]" />
            <Input
              type="text"
              placeholder={t.audit.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 bg-[#050807] border-white/10 text-xs w-full"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#050807] border border-white/10 text-xs text-white focus:outline-none focus:border-[#09937F]"
          >
            <option value="all">{t.audit.allActions}</option>
            <option value="login">{t.audit.loginAction}</option>
            <option value="create">{t.audit.createAction}</option>
            <option value="update">{t.audit.updateAction}</option>
            <option value="delete">{t.audit.deleteAction}</option>
            <option value="stage_change">{t.audit.stageChangeAction}</option>
          </select>

          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#050807] border border-white/10 text-xs text-white focus:outline-none focus:border-[#09937F]"
          >
            <option value="all">{t.audit.allEntities}</option>
            <option value="invoice">{t.audit.invoicesEntity}</option>
            <option value="payment">{t.audit.paymentsEntity}</option>
            <option value="deal">{t.audit.dealsEntity}</option>
            <option value="company_settings">{t.audit.settingsEntity}</option>
            <option value="auth">{t.audit.authEntity}</option>
          </select>
        </div>
      </Card>

      <Card className="bg-[#0B1210] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#050807] border-b border-white/10 text-[#9EADA9] uppercase font-mono tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">{t.audit.userCol}</th>
                <th className="p-4 text-start">{t.audit.actionCol}</th>
                <th className="p-4 text-start">{t.audit.entityCol}</th>
                <th className="p-4 text-start">{t.audit.detailsCol}</th>
                <th className="p-4 text-start">{t.audit.ipCol}</th>
                <th className="p-4 text-end">{t.audit.timestampCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#9EADA9]">
                    {t.audit.noLogs}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#014842] border border-[#09937F]/40 flex items-center justify-center text-[10px] font-bold text-white font-mono shrink-0">
                          {log.user?.full_name?.slice(0, 2).toUpperCase() ||
                            "SA"}
                        </div>
                        <div>
                          <div className="font-bold text-white">
                            {log.user?.full_name || "System / Admin"}
                          </div>
                          <div className="text-[10px] text-[#9EADA9] font-mono">
                            {log.user?.email || "system@ishoot.bh"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">{getActionBadge(log.action)}</td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-white capitalize">
                        {getEntityIcon(log.entity_type)}
                        <span>{log.entity_type.replace("_", " ")}</span>
                      </div>
                      {log.entity_id && (
                        <div className="text-[10px] text-[#9EADA9] font-mono mt-0.5">
                          #{log.entity_id}
                        </div>
                      )}
                    </td>

                    <td className="p-4 max-w-xs">
                      {log.details ? (
                        <div
                          className="font-mono text-[11px] text-[#9EADA9] truncate"
                          title={JSON.stringify(log.details)}
                        >
                          {Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" | ")}
                        </div>
                      ) : (
                        <span className="text-[#9EADA9]/50">—</span>
                      )}
                    </td>

                    <td className="p-4 font-mono text-[#9EADA9]">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px]">
                        {log.ip_address || "127.0.0.1"}
                      </span>
                    </td>

                    <td className="p-4 text-end font-mono text-[#9EADA9]">
                      {formatDate(log.created_at, locale, "time")}
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
