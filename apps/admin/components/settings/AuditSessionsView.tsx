"use client";
import { DataTable } from "@platform/ui";
import { formatMessage } from "@platform/locales";

import * as React from "react";
import type { ActivityLog } from "@platform/database/types";
import { Card, Input, Badge } from "@platform/ui";
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
import { Select, formatDate } from "@platform/ui";
import { PageHeader } from "../layout/PageHeader";

interface AuditSessionsViewProps {
  initialLogs: ActivityLog[];
}

export function AuditSessionsView({ initialLogs }: AuditSessionsViewProps) {
  const { t, locale } = useAdminLocale();
  const actionLabel = (value: string) =>
    (t.auditDetails.actions as Record<string, string>)[value] ||
    value.replaceAll("_", " ");
  const entityLabel = (value: string) =>
    (t.auditDetails.entities as Record<string, string>)[value] ||
    value.replaceAll("_", " ");
  const fieldLabel = (value: string) =>
    (t.auditDetails.fields as Record<string, string>)[value] ||
    value.replaceAll("_", " ");
  const showValue = (value: unknown) =>
    value == null
      ? "—"
      : typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : typeof value === "boolean"
          ? value
            ? t.hrExtensions.active
            : t.hrExtensions.inactive
          : String(value);
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
            className="border-accent/40 text-accent bg-accent/10"
          >
            {t.audit.stageChangeAction}
          </Badge>
        );
      default:
        return <Badge variant="outline">{actionLabel(action)}</Badge>;
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
        return <History className="w-3.5 h-3.5 text-accent" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <SettingsNavTabs />

      <PageHeader
        actions={<div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className=" text-xs px-3 py-1 bg-ink/5 border-outline-variant"
          >
            {filteredLogs.length} {t.audit.eventsLogged}
          </Badge>
        </div>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-surface border border-outline-variant rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg  font-bold text-ink">
              {new Set(logs.map((log) => log.user_id).filter(Boolean)).size}
            </div>
            <div className="text-xs text-ink-muted">
              {t.hrExtensions.actors}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-surface border border-outline-variant rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg  font-bold text-ink">{logs.length}</div>
            <div className="text-xs text-ink-muted">
              {t.hrExtensions.events}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-surface border border-outline-variant rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg  font-bold text-ink">
              {formatMessage(t.hrExtensions.scope, { count: 100 })}
            </div>
            <div className="text-xs text-ink-muted">{t.audit.eventsLogged}</div>
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-surface border border-outline-variant rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-ink-muted" />
            <Input
              type="text"
              placeholder={t.audit.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9 bg-surface-sunken border-outline-variant text-xs w-full"
            />
          </div>

          <Select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-sunken border border-outline-variant text-xs text-ink focus:outline-none focus:border-accent"
          >
            <option value="all">{t.audit.allActions}</option>
            {Array.from(new Set(logs.map((log) => log.action)))
              .sort()
              .map((action) => (
                <option key={action} value={action}>
                  {actionLabel(action)}
                </option>
              ))}
          </Select>

          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-sunken border border-outline-variant text-xs text-ink focus:outline-none focus:border-accent"
          >
            <option value="all">{t.audit.allEntities}</option>
            {Array.from(new Set(logs.map((log) => log.entity_type)))
              .sort()
              .map((entity) => (
                <option key={entity} value={entity}>
                  {entityLabel(entity)}
                </option>
              ))}
          </Select>
        </div>
      </Card>

      <Card className="bg-surface border border-outline-variant rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <DataTable className="w-full text-xs text-start">
            <thead className="bg-surface-sunken border-b border-outline-variant text-ink-muted uppercase  tracking-wider text-[11px]">
              <tr>
                <th className="p-4 text-start">{t.audit.userCol}</th>
                <th className="p-4 text-start">{t.audit.actionCol}</th>
                <th className="p-4 text-start">{t.audit.entityCol}</th>
                <th className="p-4 text-start">{t.audit.detailsCol}</th>
                <th className="p-4 text-start">{t.audit.ipCol}</th>
                <th className="p-4 text-end">{t.audit.timestampCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-muted">
                    {t.audit.noLogs}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-ink/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary border border-accent/40 flex items-center justify-center text-[10px] font-bold text-primary-foreground  shrink-0">
                          {log.user?.full_name?.slice(0, 2).toUpperCase() ||
                            "SA"}
                        </div>
                        <div>
                          <div className="font-bold text-ink">
                            {log.user?.full_name || t.hrExtensions.unknown}
                          </div>
                          <div className="text-[10px] text-ink-muted ">
                            <bdi dir="ltr">{log.user?.email || "—"}</bdi>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">{getActionBadge(log.action)}</td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5  text-ink capitalize">
                        {getEntityIcon(log.entity_type)}
                        <span>{entityLabel(log.entity_type)}</span>
                      </div>
                      {log.entity_id && (
                        <div className="text-[10px] text-ink-muted  mt-0.5">
                          #{log.entity_id}
                        </div>
                      )}
                    </td>

                    <td className="p-4 max-w-xs">
                      {log.details ? (
                        <details>
                          <summary className="cursor-pointer text-emerald-500">
                            {t.hrExtensions.details}
                          </summary>
                          {log.details.before &&
                            log.details.after &&
                            typeof log.details.before === "object" &&
                            typeof log.details.after === "object" ? (
                            <DataTable className="mt-3 text-xs w-full table-fixed">
                              <thead>
                                <tr>
                                  <th className="text-start">
                                    {t.auditDetails.field}
                                  </th>
                                  <th className="text-start">
                                    {t.auditDetails.before}
                                  </th>
                                  <th className="text-start">
                                    {t.auditDetails.after}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from(
                                  new Set([
                                    ...Object.keys(log.details.before),
                                    ...Object.keys(log.details.after),
                                  ]),
                                )
                                  .filter(
                                    (key) =>
                                      !["updatedAt", "updated_at"].includes(
                                        key,
                                      ) &&
                                      JSON.stringify(
                                        (
                                          log.details!.before as Record<
                                            string,
                                            unknown
                                          >
                                        )[key],
                                      ) !==
                                      JSON.stringify(
                                        (
                                          log.details!.after as Record<
                                            string,
                                            unknown
                                          >
                                        )[key],
                                      ),
                                  )
                                  .map((key) => (
                                    <tr
                                      key={key}
                                      className="align-top border-t border-outline-variant"
                                    >
                                      <td className="py-2">
                                        {fieldLabel(key)}
                                      </td>
                                      <td className="p-2 text-rose-400 whitespace-pre-wrap break-words">
                                        {showValue(
                                          (
                                            log.details!.before as Record<
                                              string,
                                              unknown
                                            >
                                          )[key],
                                        )}
                                      </td>
                                      <td className="p-2 text-emerald-400 whitespace-pre-wrap break-words">
                                        {showValue(
                                          (
                                            log.details!.after as Record<
                                              string,
                                              unknown
                                            >
                                          )[key],
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </DataTable>
                          ) : (
                            <dl className="space-y-2 mt-2">
                              {Object.entries(log.details).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <dt className="font-semibold">
                                      {fieldLabel(key)}
                                    </dt>
                                    <dd className="break-words whitespace-pre-wrap">
                                      {showValue(value)}
                                    </dd>
                                  </div>
                                ),
                              )}
                            </dl>
                          )}
                        </details>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>

                    <td className="p-4  text-ink-muted">
                      <span className="px-2 py-0.5 rounded bg-ink/5 border border-outline-variant text-[11px]">
                        {log.ip_address || "—"}
                      </span>
                    </td>

                    <td className="p-4 text-end  text-ink-muted">
                      {formatDate(log.created_at, locale, "time")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </div>
      </Card>
    </div>
  );
}
